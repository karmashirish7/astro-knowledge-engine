import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { buildFactSheetFromData, buildHouseLayers, type ChartFactSheet, type DictumRow } from '@/lib/astrology/knowledge/factSheet'
import { detectPatterns } from '@/lib/astrology/knowledge/patternDetect'
import { FOREIGN_CATEGORIES, type ForeignCategory } from '@/lib/astrology/knowledge/foreignDasha'
import { deserializeDashaTree } from '@/lib/astrology/dasha'
import { predictWindows, resolvePredictionRange, type PredictedWindow, type PersistedPrediction } from '@/lib/astrology/knowledge/predictWindows'
import { rawDashaPeriods, type DashaLookupRequest } from '@/lib/astrology/knowledge/dashaLookup'

interface WorkspaceItem { chartId: string; chartName: string; date: string; eventType: ForeignCategory }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const thread = await prisma.dashaLabThread.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
  if (!thread || thread.userId !== session.user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let workspace: WorkspaceItem[] = []
  try { workspace = JSON.parse(thread.workspace || '[]') } catch { /* ignore */ }
  let predictions: PersistedPrediction[] = []
  try { predictions = JSON.parse(thread.predictions || '[]') } catch { /* ignore */ }
  let dashaLookups: DashaLookupRequest[] = []
  try { dashaLookups = JSON.parse(thread.dashaLookups || '[]') } catch { /* ignore */ }

  // Re-derive fact sheets/patterns/predictions from what's persisted so
  // reopening a thread shows the same analysis without another chat turn.
  // Batched (not per-item) lookups — a workspace can hold many entries that
  // reuse the same chart at different dates, and per-item findUnique calls
  // were slow enough on a large workspace to cut the response short.
  const uniqueChartIds = [...new Set([...workspace.map(w => w.chartId), ...predictions.map(p => p.chartId), ...dashaLookups.map(d => d.chartId)])]
  const [dictums, charts, planetaryDataRows] = await Promise.all([
    prisma.dictum.findMany({
      where: { category: { in: [...FOREIGN_CATEGORIES] } },
      select: { id: true, rule: true, strength: true, category: true, conditionsJson: true },
    }) as Promise<DictumRow[]>,
    prisma.chart.findMany({ where: { id: { in: uniqueChartIds } }, select: { id: true, calculatedPositions: true, userId: true, birthDate: true } }),
    prisma.planetaryData.findMany({ where: { chartId: { in: uniqueChartIds } }, select: { chartId: true, dashaJson: true } }),
  ])
  const chartById = new Map(charts.map(c => [c.id, c]))
  const planetaryByChartId = new Map(planetaryDataRows.map(pd => [pd.chartId, pd]))

  const sheets: ChartFactSheet[] = []
  for (const item of workspace) {
    const chart = chartById.get(item.chartId)
    if (!chart || (chart.userId && chart.userId !== session.user.id)) continue
    const pd = planetaryByChartId.get(item.chartId)
    if (!pd?.dashaJson || pd.dashaJson === '{}' || pd.dashaJson === '[]') continue
    let calc: { lagnaSign?: number; houseNumbers?: Record<string, number> } = {}
    try { calc = JSON.parse(chart.calculatedPositions || '{}') } catch { /* ignore */ }
    const fs = buildFactSheetFromData(item.chartId, item.chartName, calc, pd.dashaJson, new Date(item.date), item.eventType, dictums)
    if (fs) sheets.push(fs)
  }

  const predictionResults: { chartName: string; eventType: ForeignCategory; from: string; to: string; windows: PredictedWindow[] }[] = []
  for (const req of predictions) {
    const chart = chartById.get(req.chartId)
    if (!chart || (chart.userId && chart.userId !== session.user.id)) continue
    const pd = planetaryByChartId.get(req.chartId)
    if (!pd?.dashaJson || pd.dashaJson === '{}' || pd.dashaJson === '[]') continue
    let calc: { lagnaSign?: number; houseNumbers?: Record<string, number> } = {}
    try { calc = JSON.parse(chart.calculatedPositions || '{}') } catch { /* ignore */ }
    const birthDate = chart.birthDate ? new Date(chart.birthDate) : null
    const { from, to } = resolvePredictionRange(req, birthDate)
    const tree = deserializeDashaTree(pd.dashaJson)
    const houses = buildHouseLayers(calc)
    const windows = predictWindows(tree, houses, calc.lagnaSign ?? 1, from, to, dictums)
    predictionResults.push({ chartName: req.chartName, eventType: req.eventType, from: from.toISOString(), to: to.toISOString(), windows })
  }

  const dashaLookupResults: { chartName: string; year: number; periods: ReturnType<typeof rawDashaPeriods> }[] = []
  for (const lookup of dashaLookups) {
    const chart = chartById.get(lookup.chartId)
    if (!chart || (chart.userId && chart.userId !== session.user.id)) continue
    const pd = planetaryByChartId.get(lookup.chartId)
    if (!pd?.dashaJson || pd.dashaJson === '{}' || pd.dashaJson === '[]') continue
    const tree = deserializeDashaTree(pd.dashaJson)
    const periods = rawDashaPeriods(tree, new Date(lookup.year, 0, 1), new Date(lookup.year + 1, 0, 1))
    dashaLookupResults.push({ chartName: lookup.chartName, year: lookup.year, periods })
  }

  return NextResponse.json({
    id: thread.id,
    title: thread.title,
    workspace,
    messages: thread.messages,
    factSheets: sheets,
    patterns: detectPatterns(sheets),
    predictions: predictionResults,
    dashaLookups: dashaLookupResults,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const thread = await prisma.dashaLabThread.findUnique({ where: { id }, select: { userId: true } })
  if (!thread || thread.userId !== session.user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const updated = await prisma.dashaLabThread.update({
    where: { id },
    data: { title: typeof body.title === 'string' ? body.title : undefined },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const thread = await prisma.dashaLabThread.findUnique({ where: { id }, select: { userId: true } })
  if (!thread || thread.userId !== session.user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.dashaLabThread.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
