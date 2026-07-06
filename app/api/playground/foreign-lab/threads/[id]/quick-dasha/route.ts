// Clicking a chart in the Charts list should show its dasha instantly, no
// chat turn and no LLM call needed — this just adds a "today" fact sheet
// entry to the workspace using the same deterministic calculator as
// everything else in Dasha Lab, and returns the recomputed fact sheets.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { buildFactSheetFromData, type ChartFactSheet, type DictumRow } from '@/lib/astrology/knowledge/factSheet'
import { detectPatterns } from '@/lib/astrology/knowledge/patternDetect'
import { FOREIGN_CATEGORIES, type ForeignCategory } from '@/lib/astrology/knowledge/foreignDasha'

interface WorkspaceItem { chartId: string; chartName: string; date: string; eventType: ForeignCategory }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const chartId: string | undefined = body.chartId
  if (!chartId) return NextResponse.json({ error: 'chartId required' }, { status: 400 })

  let thread = await prisma.dashaLabThread.findUnique({ where: { id }, include: { messages: true } })
  if (thread && thread.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!thread) thread = await prisma.dashaLabThread.create({ data: { userId: session.user.id }, include: { messages: true } })

  const chart = await prisma.chart.findUnique({ where: { id: chartId }, select: { id: true, name: true, userId: true } })
  if (!chart || (chart.userId && chart.userId !== session.user.id)) return NextResponse.json({ error: 'Chart not found' }, { status: 404 })
  const chartPd = await prisma.planetaryData.findUnique({ where: { chartId }, select: { dashaJson: true } })
  if (!chartPd?.dashaJson || chartPd.dashaJson === '{}' || chartPd.dashaJson === '[]') {
    return NextResponse.json({ error: `${chart.name} has no computed dasha yet — open it in Chart Analysis first.` }, { status: 400 })
  }

  let workspace: WorkspaceItem[] = []
  try { workspace = JSON.parse(thread.workspace || '[]') } catch { /* ignore */ }
  const todayISO = new Date().toISOString().slice(0, 10)
  if (!workspace.some(w => w.chartId === chartId && w.date === todayISO)) {
    workspace = [...workspace, { chartId: chart.id, chartName: chart.name, date: todayISO, eventType: 'foreign-travel' }]
  }
  await prisma.dashaLabThread.update({ where: { id: thread.id }, data: { workspace: JSON.stringify(workspace) } })

  const uniqueChartIds = [...new Set(workspace.map(w => w.chartId))]
  const [dictums, charts, planetaryDataRows] = await Promise.all([
    prisma.dictum.findMany({
      where: { category: { in: [...FOREIGN_CATEGORIES] } },
      select: { id: true, rule: true, strength: true, category: true, conditionsJson: true },
    }) as Promise<DictumRow[]>,
    prisma.chart.findMany({ where: { id: { in: uniqueChartIds } }, select: { id: true, calculatedPositions: true, userId: true } }),
    prisma.planetaryData.findMany({ where: { chartId: { in: uniqueChartIds } }, select: { chartId: true, dashaJson: true } }),
  ])
  const chartById = new Map(charts.map(c => [c.id, c]))
  const planetaryByChartId = new Map(planetaryDataRows.map(pd => [pd.chartId, pd]))

  const sheets: ChartFactSheet[] = []
  for (const item of workspace) {
    const c = chartById.get(item.chartId)
    if (!c || (c.userId && c.userId !== session.user.id)) continue
    const pd = planetaryByChartId.get(item.chartId)
    if (!pd?.dashaJson || pd.dashaJson === '{}' || pd.dashaJson === '[]') continue
    let calc: { lagnaSign?: number; houseNumbers?: Record<string, number> } = {}
    try { calc = JSON.parse(c.calculatedPositions || '{}') } catch { /* ignore */ }
    const fs = buildFactSheetFromData(item.chartId, item.chartName, calc, pd.dashaJson, new Date(item.date), item.eventType, dictums)
    if (fs) sheets.push(fs)
  }
  // Surface the just-clicked chart first.
  sheets.sort((a, b) => Number(b.chartId === chartId) - Number(a.chartId === chartId))

  return NextResponse.json({ threadId: thread.id, workspace, factSheets: sheets, patterns: detectPatterns(sheets) })
}
