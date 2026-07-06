// "Load all charts" — bulk-adds every saved chart (that already has computed
// dasha data) into the thread's PREDICTED WINDOWS as a whole-life scan
// (birth → today+15yrs), bypassing chat/LLM extraction entirely since we
// already know exactly which charts exist. Skips a chart if it already has
// a foreign-travel prediction persisted, so re-clicking is idempotent and
// never clobbers a range the researcher set manually via chat.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { buildFactSheetFromData, buildHouseLayers, type ChartFactSheet, type DictumRow } from '@/lib/astrology/knowledge/factSheet'
import { detectPatterns } from '@/lib/astrology/knowledge/patternDetect'
import { FOREIGN_CATEGORIES, type ForeignCategory } from '@/lib/astrology/knowledge/foreignDasha'
import { deserializeDashaTree } from '@/lib/astrology/dasha'
import {
  predictWindows, resolvePredictionRange, DEFAULT_PREDICT_HORIZON_YEARS,
  type PredictedWindow, type PersistedPrediction,
} from '@/lib/astrology/knowledge/predictWindows'

interface WorkspaceItem { chartId: string; chartName: string; date: string; eventType: ForeignCategory }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  let thread = await prisma.dashaLabThread.findUnique({ where: { id }, include: { messages: true } })
  if (thread && thread.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!thread) {
    thread = await prisma.dashaLabThread.create({ data: { userId: session.user.id }, include: { messages: true } })
  }

  let workspace: WorkspaceItem[] = []
  try { workspace = JSON.parse(thread.workspace || '[]') } catch { /* ignore */ }
  let persistedPredictions: PersistedPrediction[] = []
  try { persistedPredictions = JSON.parse(thread.predictions || '[]') } catch { /* ignore */ }

  const [allCharts, planetaryDataRows] = await Promise.all([
    prisma.chart.findMany({ where: { userId: session.user.id }, select: { id: true, name: true } }),
    prisma.planetaryData.findMany({ where: { chart: { userId: session.user.id } }, select: { chartId: true, dashaJson: true } }),
  ])
  const computedChartIds = new Set(
    planetaryDataRows.filter(pd => pd.dashaJson && pd.dashaJson !== '{}' && pd.dashaJson !== '[]').map(pd => pd.chartId),
  )

  const newPersistedPredictions: PersistedPrediction[] = [...persistedPredictions]
  let added = 0
  let skippedNoData = 0
  for (const chart of allCharts) {
    if (!computedChartIds.has(chart.id)) { skippedNoData++; continue }
    const already = newPersistedPredictions.some(p => p.chartId === chart.id && p.eventType === 'foreign-travel')
    if (already) continue
    newPersistedPredictions.push({
      chartId: chart.id, chartName: chart.name, eventType: 'foreign-travel',
      from: { mode: 'birthAge', age: 0 }, to: { mode: 'horizon', years: DEFAULT_PREDICT_HORIZON_YEARS },
    })
    added++
  }

  const noteContent = `Loaded ${added} chart${added === 1 ? '' : 's'} into PREDICTED WINDOWS as whole-life scans (birth → today+${DEFAULT_PREDICT_HORIZON_YEARS}yrs)${skippedNoData ? `, skipped ${skippedNoData} with no computed dasha yet` : ''}.`
  const noteMessage = await prisma.dashaLabMessage.create({
    data: { threadId: thread.id, role: 'system', content: noteContent },
  })

  await prisma.dashaLabThread.update({
    where: { id: thread.id },
    data: { predictions: JSON.stringify(newPersistedPredictions) },
  })

  // ── recompute everything for the response, same shape as the chat route ──
  const uniqueChartIds = [...new Set([...workspace.map(w => w.chartId), ...newPersistedPredictions.map(p => p.chartId)])]
  const [dictums, charts, pdRows] = await Promise.all([
    prisma.dictum.findMany({
      where: { category: { in: [...FOREIGN_CATEGORIES] } },
      select: { id: true, rule: true, strength: true, category: true, conditionsJson: true },
    }) as Promise<DictumRow[]>,
    prisma.chart.findMany({ where: { id: { in: uniqueChartIds } }, select: { id: true, calculatedPositions: true, userId: true, birthDate: true } }),
    prisma.planetaryData.findMany({ where: { chartId: { in: uniqueChartIds } }, select: { chartId: true, dashaJson: true } }),
  ])
  const chartById = new Map(charts.map(c => [c.id, c]))
  const planetaryByChartId = new Map(pdRows.map(pd => [pd.chartId, pd]))

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
  for (const p of newPersistedPredictions) {
    const chart = chartById.get(p.chartId)
    if (!chart || (chart.userId && chart.userId !== session.user.id)) continue
    const pd = planetaryByChartId.get(p.chartId)
    if (!pd?.dashaJson || pd.dashaJson === '{}' || pd.dashaJson === '[]') continue
    let calc: { lagnaSign?: number; houseNumbers?: Record<string, number> } = {}
    try { calc = JSON.parse(chart.calculatedPositions || '{}') } catch { /* ignore */ }
    const birthDate = chart.birthDate ? new Date(chart.birthDate) : null
    const { from, to } = resolvePredictionRange(p, birthDate)
    const tree = deserializeDashaTree(pd.dashaJson)
    const houses = buildHouseLayers(calc)
    const windows = predictWindows(tree, houses, calc.lagnaSign ?? 1, from, to, dictums)
    predictionResults.push({ chartName: p.chartName, eventType: p.eventType, from: from.toISOString(), to: to.toISOString(), windows })
  }

  return NextResponse.json({
    threadId: thread.id,
    note: { id: noteMessage.id, role: 'system' as const, content: noteContent },
    workspace,
    factSheets: sheets,
    patterns: detectPatterns(sheets),
    predictions: predictionResults,
  })
}
