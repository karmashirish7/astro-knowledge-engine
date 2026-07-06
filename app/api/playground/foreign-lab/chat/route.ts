import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { buildFactSheetFromData, buildHouseLayers, factSheetToText, chartProfileToText, type ChartFactSheet, type DictumRow } from '@/lib/astrology/knowledge/factSheet'
import { detectPatterns, patternsToText, matchedRuleFrequency } from '@/lib/astrology/knowledge/patternDetect'
import { FOREIGN_CATEGORIES, type ForeignCategory } from '@/lib/astrology/knowledge/foreignDasha'
import { findKnownChartInText, parseDateLoose, parseYearLoose, detectEventTypeLoose } from '@/lib/astrology/knowledge/textExtractFallback'
import { deserializeDashaTree } from '@/lib/astrology/dasha'
import {
  predictWindows, predictedWindowToText, resolvePredictionRange, DEFAULT_PREDICT_HORIZON_YEARS as PREDICT_HORIZON_YEARS,
  type PredictedWindow, type PersistedPrediction, type DateBound,
} from '@/lib/astrology/knowledge/predictWindows'
import { rawDashaPeriods, dashaLookupToText, type DashaLookupRequest } from '@/lib/astrology/knowledge/dashaLookup'

const PREDICTIVE_QUESTION = /\bwhen\s+(will|does|can|might|would)\b|\bgoing to\b|\bpredict\b|\bnext\s+(foreign|abroad)\b|\bwhole\s+life\b|\bfrom\s+age\b|\bsince\s+(birth|childhood)\b|\bblind\s+test\b/i

const DEEPSEEK_BASE = 'https://api.deepseek.com'
const EXTRACT_MODEL = 'deepseek-chat'
const DISCUSS_MODEL  = 'deepseek-chat'

interface WorkspaceItem { chartId: string; chartName: string; date: string; eventType: ForeignCategory }

async function callDeepSeek(
  model: string,
  system: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens = 700,
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY is not set')
  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`DeepSeek ${res.status}: ${err}`)
  }
  const data = await res.json() as { choices?: { message?: { content?: string } }[] }
  return data.choices?.[0]?.message?.content ?? ''
}

const EXTRACT_SYSTEM = `You extract structured mentions of birth charts, dates, and foreign-travel/study/employment events from a user's message, for a Vedic astrology research tool.
Given the user's message and a list of known chart names, output ONLY a JSON object of this exact shape:
{"mentions": [{"chartNameGuess": string, "dateISO": string|null, "eventType": "foreign-travel"|"foreign-study"|"foreign-employment"|null}], "predictions": [{"chartNameGuess": string, "fromDateISO": string|null, "toDateISO": string|null, "fromAge": number|null, "eventType": "foreign-travel"|"foreign-study"|"foreign-employment"|null}], "dashaLookups": [{"chartNameGuess": string, "year": number}]}

There are three kinds of requests — keep them in separate arrays:
- "mentions" = RETROSPECTIVE: the researcher describes something that ALREADY happened to someone, with (or needing) a specific date, e.g. "X went abroad on...", "why did X move to..." dateISO must be normalized to YYYY-MM-DD if determinable from any phrasing; if a retrospective mention genuinely has no date anywhere, use null.
- "predictions" = FORWARD-LOOKING: the researcher asks WHEN something WILL, MIGHT, or DID (at any unspecified point across their life) happen, e.g. "when will X go abroad", "predict when X will study overseas", "scan her whole life for foreign travel windows", "from age 16 onward, when did/will X go abroad". These NEVER need an exact date from the researcher:
  - fromDateISO/toDateISO: leave null unless the researcher gave an explicit calendar range (e.g. "between 2026 and 2030", "in the next 5 years" → compute the actual years).
  - fromAge: set this when the researcher frames the start of the scan relative to the person's age or life, e.g. "from age 16" → 16, "since birth"/"her whole life"/"from childhood" → 0. Leave null if they didn't reference age/birth/whole-life at all (the scan then starts from today, forward-only).
- "dashaLookups" = a PLAIN question about which Mahadasha/Antardasha/Pratyantardasha was, is, or will be running for someone in a given YEAR, with NO foreign-travel/study/employment event being described and NO exact day/month given — e.g. "what mahadasha and antardasha was Aradhana Pathak running in 2017", "what dasha is active for her right now in 2026", "what will her dasha be in 2030". Only extract here when the question is about the dasha itself, not an event; year must be a 4-digit calendar year.

Other rules:
- chartNameGuess must be copied verbatim from the provided "Known charts" list — pick the closest match even if the user used a nickname, partial name, or typo. If you truly cannot match it to any known chart, still return your best-guess text.
- If the message mentions multiple people/charts, return one entry per mention/prediction/lookup.
- If the message is a follow-up with no new chart/date/event mention (e.g. "why", "what about D9", "tell me more", "yes"), return {"mentions": [], "predictions": [], "dashaLookups": []} — do NOT re-emit a prediction already covered earlier in the conversation just because the researcher says "yes" or "calculate"; that one is already being tracked.
Output ONLY the JSON object — no prose, no markdown fences.`

const DISCUSS_SYSTEM = `You are a Vedic astrology research assistant inside "Dasha Lab." You answer ANY question about saved charts — current dasha (MD/AD/PD), dasha at a specific date, planetary placements in D1/D9/D10, house rulerships, aspects, nakshatra lords, patterns across charts, and specialized foreign-travel/study/employment research. All data below was computed deterministically by Swiss Ephemeris — you interpret it, never calculate it yourself.

── ANSWERING GENERAL CHART QUESTIONS ──
The CHART PROFILES section below contains every chart the researcher named this turn, showing: full D1/D9/D10 planetary placements, current dasha (MD/AD/PD), all house circuits, and matched knowledge-base rules. Use this for ANY chart question — "what dasha is she running now", "where is Jupiter in her D9", "which house does Mars rule", "explain her antardasha lord" — answer directly from the profile data, no event framing needed.

── ANALYZING A SPECIFIC FOREIGN EVENT ──
When the researcher asks why someone went abroad on a specific date, use the FACT SHEETS (one per chart/event date), following this chain:
1. Dasha running at the event date: MD → AD → PD.
2. For each of MD/AD/PD: house it occupies, houses it aspects (drishti), houses it rules (lordship) — shown as "Dasha-lord activation."
3. Union of those = houses the dasha activates at all three levels.
4. A house CIRCUIT is complete only when the house is activated AND its own lord is also tied into the dasha network. Incomplete = weaker evidence, say so.
5. Check circuit completion for movement houses: 3rd (short journeys), 7th (travel/partnership), 9th (long journeys/foreign land), 12th (foreign residence).
6. Cross-verify via D9 superimposed on D1 — D1 and D9 agreeing = stronger; disagreement = say so.
7. Purpose: 5th (study), 6th/10th (work), 7th (travel/vacation).
8. Cite matched knowledge-base rules verbatim.
9. Correlation matrix: fraction of charts sharing a pattern — preliminary until 10+ charts.

── FORWARD-LOOKING SCANS ──
For "when will X go abroad / study / work overseas", use PREDICTED WINDOWS (one per chart) — the full dasha timeline scanned for circuit-completion periods, cross-checked via D9. Lead with nearest/strongest window(s) and total count.

── YEAR-BASED DASHA LOOKUP ──
For "what dasha was X running in [year]" with no specific day, use DASHA TIMELINE LOOKUP — lists exact MD/AD/PD periods overlapping that calendar year from the real calculator. Name dates and planets exactly; if dasha changed mid-year, report both transitions.

── CRITICAL — NO SELF-CALCULATION ──
You have NO retrieval, search, or calculation ability mid-conversation. Every chart profile, fact sheet, window, and lookup is pre-computed and handed to you in THIS message only.
- Never say "retrieving", "searching", "let me calculate", or "may I proceed" — the data is either below right now or it isn't.
- Never estimate a dasha from birth details typed in chat or from average MD lengths — that is a guess, not a calculation. If the researcher types raw birth details, tell them to reference the chart by its saved name instead; the exact dasha is already pre-computed for every saved chart.
- Before claiming a chart/date/year is missing, re-scan ALL sections below for that name fresh — the data is rebuilt every turn and sections for relevant charts are placed first. Do not carry forward a "I don't have it" from a prior turn without checking.
- If data for a named chart genuinely isn't in any section below: say exactly what's missing in one sentence and what to ask for.

── RULES OF ENGAGEMENT ──
- For "why did X go abroad": name the dasha lord, what it activates, whether circuits are complete, what D9 says, and what purpose that implies — don't skip to conclusion.
- For general chart questions: answer directly from CHART PROFILES, no event needed.
- You MAY compare charts, cite patterns, and reference the correlation matrix.
- Label OBSERVED PATTERNS as "not yet in the knowledge base" — never as established rules.
- Do NOT invent astrological claims beyond what's in the profiles, fact sheets, windows, or matched rules.
- Only ask for birth details when a chart name couldn't be matched to any saved chart at all (see NOTES for unresolved names).
- Be conversational and concise (under 250 words) unless depth is asked for. Plain prose — no markdown headers, no bold, no bullet lists. Mention specific houses/planets inline.

After your reply, on its own line, always output:
\`\`\`json
{"knowledgeGap": boolean, "category": "foreign-travel"|"foreign-study"|"foreign-employment"|null, "suggestedRule": string|null}
\`\`\`
knowledgeGap=true only when you tell the researcher something isn't in the knowledge base yet. suggestedRule = a short reusable rule statement, or null.`

function parseMetadata(text: string): { reply: string; knowledgeGap: boolean; category: ForeignCategory | null; suggestedRule: string | null } {
  const m = text.match(/```json\s*([\s\S]*?)```/)
  let meta = { knowledgeGap: false, category: null as ForeignCategory | null, suggestedRule: null as string | null }
  if (m) {
    try {
      const parsed = JSON.parse(m[1])
      meta = {
        knowledgeGap: !!parsed.knowledgeGap,
        category: FOREIGN_CATEGORIES.includes(parsed.category) ? parsed.category : null,
        suggestedRule: typeof parsed.suggestedRule === 'string' ? parsed.suggestedRule : null,
      }
    } catch { /* ignore malformed metadata */ }
  }
  const reply = m ? text.slice(0, m.index).trim() : text.trim()
  return { reply, ...meta }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!process.env.DEEPSEEK_API_KEY) return NextResponse.json({ error: "DEEPSEEK_API_KEY is not set" }, { status: 500 })

  try {
    const body = await req.json()
    const message: string = body.message ?? ''
    const threadId: string | undefined = body.threadId
    if (!message.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 })

    // ── load (or create) the thread — this is now the source of truth for
    //    conversation history and the workspace, not client-sent state ──
    let thread = threadId
      ? await prisma.dashaLabThread.findUnique({ where: { id: threadId }, include: { messages: { orderBy: { createdAt: 'asc' } } } })
      : null
    if (thread && thread.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    if (!thread) {
      thread = await prisma.dashaLabThread.create({
        data: { userId: session.user.id },
        include: { messages: true },
      })
    }

    let workspace: WorkspaceItem[] = []
    try { workspace = JSON.parse(thread.workspace || '[]') } catch { /* ignore */ }
    let persistedPredictions: PersistedPrediction[] = []
    try { persistedPredictions = JSON.parse(thread.predictions || '[]') } catch { /* ignore */ }
    let persistedDashaLookups: DashaLookupRequest[] = []
    try { persistedDashaLookups = JSON.parse(thread.dashaLookups || '[]') } catch { /* ignore */ }
    const history = thread.messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }))

    await prisma.dashaLabMessage.create({ data: { threadId: thread.id, role: 'user', content: message } })

    const allCharts = await prisma.chart.findMany({
      where: { userId: session.user.id },
      select: { id: true, name: true },
      orderBy: { updatedAt: 'desc' },
    })

    // ── Step 1: extract chart/date/event mentions from this message ──
    let mentions: { chartNameGuess: string; dateISO: string | null; eventType: ForeignCategory | null }[] = []
    let predictions: { chartNameGuess: string; fromDateISO: string | null; toDateISO: string | null; fromAge: number | null; eventType: ForeignCategory | null }[] = []
    let dashaLookups: { chartNameGuess: string; year: number }[] = []
    try {
      const chartList = allCharts.map(c => c.name).join(', ')
      const extractRaw = await callDeepSeek(EXTRACT_MODEL, EXTRACT_SYSTEM, [
        { role: 'user', content: `Known charts: ${chartList || '(none saved yet)'}\n\nMessage: "${message}"` },
      ], 500)
      const jsonMatch = extractRaw.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (Array.isArray(parsed.mentions)) mentions = parsed.mentions
        if (Array.isArray(parsed.predictions)) predictions = parsed.predictions
        if (Array.isArray(parsed.dashaLookups)) dashaLookups = parsed.dashaLookups
      }
    } catch (e) {
      console.error('[foreign-lab/chat extract]', e)
    }

    // ── deterministic safety net: catch a known chart name the LLM extraction
    //    missed entirely (model flakiness, a bare name, "use her saved chart
    //    X", odd phrasing, a dropped call). If a real saved chart is named and
    //    nothing else resolved it, ALWAYS ground the reply in its real data —
    //    default to a forward-looking scan rather than risk an empty turn,
    //    which is what previously let the model start guessing dasha periods
    //    from scratch instead of using the real calculator. A bare calendar
    //    year with no day/month ("running in 2017") is its own case — that's
    //    not a date precise enough for a fact sheet and not a forward scan
    //    either, it's a plain dasha-timeline question, so it gets its own
    //    lookup instead of silently falling through to a 15-year scan. ──
    const fallbackChart = findKnownChartInText(message, allCharts)
    const fallbackDate = parseDateLoose(message)
    const fallbackYear = !fallbackDate ? parseYearLoose(message) : null
    const isPredictiveMessage = PREDICTIVE_QUESTION.test(message)
    if (fallbackChart) {
      const nameMatch = (g: string | undefined | null) => {
        const gg = g?.toLowerCase().trim() ?? ''
        return !!gg && (fallbackChart.name.toLowerCase().includes(gg) || gg.includes(fallbackChart.name.toLowerCase()))
      }
      // A mention without a dateISO is NOT "covered" — it's an extraction that
      // found the chart name but dropped the date, so the fallback must still
      // supply the dated/year/prediction entry. Only skip if we already have a
      // mention WITH a real date, or a prediction/dashaLookup (inherently useful).
      const alreadyCovered =
        mentions.some(m => nameMatch(m.chartNameGuess) && !!m.dateISO) ||
        predictions.some(m => nameMatch(m.chartNameGuess)) ||
        dashaLookups.some(m => nameMatch(m.chartNameGuess))
      // Also drop any dateless extraction for this chart so it doesn't appear
      // as "missing date" in NOTES alongside the one we're about to add.
      if (!alreadyCovered) {
        mentions = mentions.filter(m => !(nameMatch(m.chartNameGuess) && !m.dateISO))
        if (fallbackDate) mentions.push({ chartNameGuess: fallbackChart.name, dateISO: fallbackDate, eventType: detectEventTypeLoose(message) })
        else if (fallbackYear) dashaLookups.push({ chartNameGuess: fallbackChart.name, year: fallbackYear })
        else predictions.push({ chartNameGuess: fallbackChart.name, fromDateISO: null, toDateISO: null, fromAge: null, eventType: detectEventTypeLoose(message) })
      }
    }

    function resolveChart(guess: string | undefined | null) {
      const g = guess?.toLowerCase().trim()
      if (!g) return null
      const exact = allCharts.find(c => c.name.toLowerCase() === g)
      return exact ?? allCharts.find(c => c.name.toLowerCase().includes(g) || g.includes(c.name.toLowerCase())) ?? null
    }

    // ── resolve chart name guesses, fold new mentions into the workspace ──
    const newWorkspace: WorkspaceItem[] = [...workspace]
    const unresolvedName: string[] = []
    const missingDate: string[] = []
    // Charts this specific message actually asked about — used to surface
    // the relevant entry FIRST in each section below, so it isn't buried in
    // a large workspace and easy for the discuss model to miss or skip past.
    const thisTurnChartIds = new Set<string>()

    // ── second-tier safety net: a message that gives a date/year but no name
    //    of its own ("2017 oct 29?", "now try", "check now?") finds nothing
    //    above. If a chart was named earlier in THIS thread but never made it
    //    into the workspace/predictions (the exact loop the researcher hit
    //    with "Aradhana Pathak" — kept retrying without repeating her name),
    //    look back through recent history for the most recently named chart
    //    that still has zero coverage and retry it now — using THIS message's
    //    date/year if it has one, instead of always defaulting to a blind
    //    forward scan that ignores what was actually just asked. ──
    if (mentions.length === 0 && predictions.length === 0 && dashaLookups.length === 0 && !fallbackChart) {
      for (let i = history.length - 1; i >= 0 && i >= history.length - 10; i--) {
        const recent = findKnownChartInText(history[i].content, allCharts)
        if (!recent) continue
        if (fallbackDate) {
          const already = newWorkspace.some(w => w.chartId === recent.id && w.date === fallbackDate)
          if (!already) mentions.push({ chartNameGuess: recent.name, dateISO: fallbackDate, eventType: detectEventTypeLoose(message) })
        } else if (fallbackYear) {
          const already = persistedDashaLookups.some(d => d.chartId === recent.id && d.year === fallbackYear)
          if (!already) dashaLookups.push({ chartNameGuess: recent.name, year: fallbackYear })
        } else {
          const covered = newWorkspace.some(w => w.chartId === recent.id) || persistedPredictions.some(p => p.chartId === recent.id)
          if (!covered) predictions.push({ chartNameGuess: recent.name, fromDateISO: null, toDateISO: null, fromAge: null, eventType: detectEventTypeLoose(history[i].content) })
        }
        break
      }
    }

    for (const mention of mentions) {
      const partial = resolveChart(mention.chartNameGuess)
      if (!partial) { unresolvedName.push(mention.chartNameGuess); continue }
      if (!mention.dateISO || isNaN(new Date(mention.dateISO).getTime())) {
        if (isPredictiveMessage) predictions.push({ chartNameGuess: partial.name, fromDateISO: null, toDateISO: null, fromAge: null, eventType: mention.eventType })
        else missingDate.push(partial.name)
        thisTurnChartIds.add(partial.id) // still named this turn — build a chart profile
        continue
      }

      const eventType = mention.eventType ?? 'foreign-travel'
      const already = newWorkspace.find(w => w.chartId === partial.id && w.date === mention.dateISO)
      if (!already) newWorkspace.push({ chartId: partial.id, chartName: partial.name, date: mention.dateISO, eventType })
      thisTurnChartIds.add(partial.id)
    }

    // ── resolve predictive requests (forward-looking — never need a date) and
    //    merge into the persisted list so they survive a reload ──
    const newPersistedPredictions: PersistedPrediction[] = [...persistedPredictions]
    for (const prediction of predictions) {
      const partial = resolveChart(prediction.chartNameGuess)
      if (!partial) { unresolvedName.push(prediction.chartNameGuess); continue }
      const from: DateBound = prediction.fromAge != null
        ? { mode: 'birthAge', age: prediction.fromAge }
        : prediction.fromDateISO ? { mode: 'fixed', iso: prediction.fromDateISO } : { mode: 'today' }
      const to: DateBound = prediction.toDateISO ? { mode: 'fixed', iso: prediction.toDateISO } : { mode: 'horizon', years: PREDICT_HORIZON_YEARS }
      const entry: PersistedPrediction = { chartId: partial.id, chartName: partial.name, eventType: prediction.eventType ?? 'foreign-travel', from, to }
      const existingIdx = newPersistedPredictions.findIndex(p => p.chartId === entry.chartId && p.eventType === entry.eventType)
      if (existingIdx >= 0) newPersistedPredictions[existingIdx] = entry
      else newPersistedPredictions.push(entry)
      thisTurnChartIds.add(partial.id)
    }

    // ── resolve plain dasha-timeline lookups (year-only, no event) and merge
    //    into the persisted list so they survive a reload ──
    const newDashaLookups: DashaLookupRequest[] = [...persistedDashaLookups]
    for (const lookup of dashaLookups) {
      const partial = resolveChart(lookup.chartNameGuess)
      if (!partial) { unresolvedName.push(lookup.chartNameGuess); continue }
      if (!lookup.year || isNaN(lookup.year)) continue
      const existingIdx = newDashaLookups.findIndex(d => d.chartId === partial.id && d.year === lookup.year)
      if (existingIdx < 0) newDashaLookups.push({ chartId: partial.id, chartName: partial.name, year: lookup.year })
      thisTurnChartIds.add(partial.id)
    }

    // ── Step 2: build fact sheets (retrospective) + predicted windows (forward-looking) ──
    // Batched (not per-item) lookups — large workspaces reuse the same chart
    // at multiple dates, and per-item findUnique calls were slow enough to
    // risk the response being cut short.
    const uniqueChartIds = [...new Set([...newWorkspace.map(w => w.chartId), ...newPersistedPredictions.map(p => p.chartId), ...newDashaLookups.map(d => d.chartId)])]
    const [dictums, charts, planetaryDataRows] = await Promise.all([
      prisma.dictum.findMany({
        where: { category: { in: [...FOREIGN_CATEGORIES] } },
        select: { id: true, rule: true, strength: true, category: true, conditionsJson: true },
      }) as Promise<DictumRow[]>,
      prisma.chart.findMany({ where: { id: { in: uniqueChartIds } }, select: { id: true, name: true, calculatedPositions: true, userId: true, birthDate: true } }),
      prisma.planetaryData.findMany({ where: { chartId: { in: uniqueChartIds } }, select: { chartId: true, dashaJson: true } }),
    ])
    const chartById = new Map(charts.map(c => [c.id, c]))
    const planetaryByChartId = new Map(planetaryDataRows.map(pd => [pd.chartId, pd]))

    const sheets: ChartFactSheet[] = []
    for (const item of newWorkspace) {
      const chart = chartById.get(item.chartId)
      if (!chart || (chart.userId && chart.userId !== session.user.id)) continue
      const pd = planetaryByChartId.get(item.chartId)
      if (!pd?.dashaJson || pd.dashaJson === '{}' || pd.dashaJson === '[]') continue

      let calc: { lagnaSign?: number; houseNumbers?: Record<string, number> } = {}
      try { calc = JSON.parse(chart.calculatedPositions || '{}') } catch { /* ignore */ }

      const fs = buildFactSheetFromData(item.chartId, item.chartName, calc, pd.dashaJson, new Date(item.date), item.eventType, dictums)
      if (fs) sheets.push(fs)
    }

    // Recompute from the FULL persisted list (not just this turn's mentions) so
    // every prediction asked earlier in the thread keeps showing up, and
    // default-range ones re-anchor to "now" rather than going stale.
    const predictionResults: { chartId: string; chartName: string; eventType: ForeignCategory; from: string; to: string; windows: PredictedWindow[] }[] = []
    for (const req of newPersistedPredictions) {
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
      predictionResults.push({ chartId: req.chartId, chartName: req.chartName, eventType: req.eventType, from: from.toISOString(), to: to.toISOString(), windows })
    }

    // Recompute from the full persisted list, same reasoning as predictions above.
    const dashaLookupResults: { chartId: string; chartName: string; year: number; periods: ReturnType<typeof rawDashaPeriods> }[] = []
    for (const lookup of newDashaLookups) {
      const chart = chartById.get(lookup.chartId)
      if (!chart || (chart.userId && chart.userId !== session.user.id)) continue
      const pd = planetaryByChartId.get(lookup.chartId)
      if (!pd?.dashaJson || pd.dashaJson === '{}' || pd.dashaJson === '[]') continue

      const tree = deserializeDashaTree(pd.dashaJson)
      const periods = rawDashaPeriods(tree, new Date(lookup.year, 0, 1), new Date(lookup.year + 1, 0, 1))
      dashaLookupResults.push({ chartId: lookup.chartId, chartName: lookup.chartName, year: lookup.year, periods })
    }

    // Surface this turn's chart(s) first in each section — with a large
    // workspace, the relevant entry can otherwise be buried among many
    // others and easy for the discuss model to skim past.
    const bySheetRelevance = (a: ChartFactSheet, b: ChartFactSheet) => Number(thisTurnChartIds.has(b.chartId)) - Number(thisTurnChartIds.has(a.chartId))
    sheets.sort(bySheetRelevance)
    predictionResults.sort((a, b) => Number(thisTurnChartIds.has(b.chartId)) - Number(thisTurnChartIds.has(a.chartId)))
    dashaLookupResults.sort((a, b) => Number(thisTurnChartIds.has(b.chartId)) - Number(thisTurnChartIds.has(a.chartId)))

    // ── Chart profiles: full planetary data + current dasha for every chart
    //    named THIS turn that isn't already in sheets (no event-specific fact
    //    sheet). This is the key fix: any chart question — "what dasha is she
    //    running", "where is Jupiter in her D9", "explain her antardasha lord"
    //    — now always has real data in front of the LLM, even with no date. ──
    const chartProfiles: ChartFactSheet[] = []
    for (const chartId of thisTurnChartIds) {
      if (sheets.some(s => s.chartId === chartId)) continue
      const c = chartById.get(chartId)
      if (!c || (c.userId && c.userId !== session.user.id)) continue
      const pd = planetaryByChartId.get(chartId)
      if (!pd?.dashaJson || pd.dashaJson === '{}' || pd.dashaJson === '[]') continue
      let calc: { lagnaSign?: number; houseNumbers?: Record<string, number> } = {}
      try { calc = JSON.parse(c.calculatedPositions || '{}') } catch { /* ignore */ }
      const profile = buildFactSheetFromData(chartId, c.name, calc, pd.dashaJson, new Date(), 'foreign-travel', dictums)
      if (profile) chartProfiles.push(profile)
    }

    // ── Step 3: pattern detection across the workspace ──
    const patterns = detectPatterns(sheets)
    const ruleFreq = matchedRuleFrequency(sheets)

    // ── Step 4: discuss, grounded in the above ──
    const chartProfileText = chartProfiles.length ? chartProfiles.map(chartProfileToText).join('\n\n') : ''
    const factText = sheets.length ? sheets.map(factSheetToText).join('\n\n') : ''
    const predictionText = predictionResults.length
      ? predictionResults.map(pr => {
          const shown = pr.windows.slice(0, 8)
          const header = `${pr.chartName} — scanned ${new Date(pr.from).toDateString()} to ${new Date(pr.to).toDateString()} for ${pr.eventType}: ${pr.windows.length} window(s) found${pr.windows.length > shown.length ? `, showing nearest ${shown.length}` : ''}.`
          return [header, ...shown.map(w => predictedWindowToText(pr.chartName, pr.eventType, w))].join('\n')
        }).join('\n\n')
      : ''
    const dashaLookupText = dashaLookupResults.length
      ? dashaLookupResults.map(r => dashaLookupToText(r.chartName, r.year, r.periods)).join('\n\n')
      : ''
    const patternText = patternsToText(patterns)
    const ruleFreqText = ruleFreq.length
      ? ruleFreq.map(r => `- "${r.rule}" matched ${r.charts.length}/${sheets.length} charts (${r.charts.join(', ')})`).join('\n')
      : 'No knowledge-base rule matched more than one chart in the current workspace.'
    // Charts in missingDate that now have a profile don't need a "ask for date"
    // note — the LLM has their full data and can answer general questions.
    const profiledChartIds = new Set(chartProfiles.map(p => p.chartId))
    const missingDateWithoutProfile = missingDate.filter(name => {
      const resolved = allCharts.find(c => c.name === name)
      return !resolved || !profiledChartIds.has(resolved.id)
    })
    const noteLines = [
      missingDateWithoutProfile.length ? `Mentioned without a usable event date (ask for a specific date to analyze that foreign event): ${missingDateWithoutProfile.join(', ')}.` : '',
      unresolvedName.length ? `Could not match these names to a saved chart: ${unresolvedName.join(', ')}.` : '',
      sheets.length > 0 && sheets.length < 10 ? `Workspace currently has ${sheets.length} chart(s) — treat any correlation as preliminary until 10+ charts are in the workspace.` : '',
    ].filter(Boolean).join('\n')

    const systemContext = [
      DISCUSS_SYSTEM,
      chartProfileText ? '\n── CHART PROFILES (full data for charts named this turn — use for any general question) ──' : '', chartProfileText,
      factText ? '\n── FACT SHEETS (specific foreign-event analysis) ──' : '', factText,
      predictionText ? '\n── PREDICTED WINDOWS (forward-looking) ──' : '', predictionText,
      dashaLookupText ? '\n── DASHA TIMELINE LOOKUP (exact, not estimated) ──' : '', dashaLookupText,
      '\n── CORRELATION MATRIX / OBSERVED PATTERNS ACROSS WORKSPACE ──', patternText,
      '\n── KNOWLEDGE-BASE RULES MATCHED ACROSS WORKSPACE ──', ruleFreqText,
      noteLines ? `\n── NOTES ──\n${noteLines}` : '',
    ].filter(Boolean).join('\n')

    const discussMessages: { role: 'user' | 'assistant'; content: string }[] = [
      ...history.slice(-12).map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user', content: message },
    ]
    const raw = await callDeepSeek(DISCUSS_MODEL, systemContext, discussMessages, 900)
    const { reply, knowledgeGap, category, suggestedRule } = parseMetadata(raw)

    const assistantMessage = await prisma.dashaLabMessage.create({
      data: { threadId: thread.id, role: 'assistant', content: reply, knowledgeGap, category: category ?? '', suggestedRule: suggestedRule ?? '' },
    })

    const isFirstUserMessage = thread.messages.filter(m => m.role === 'user').length === 0
    await prisma.dashaLabThread.update({
      where: { id: thread.id },
      data: {
        workspace: JSON.stringify(newWorkspace),
        predictions: JSON.stringify(newPersistedPredictions),
        dashaLookups: JSON.stringify(newDashaLookups),
        title: thread.title === 'New research' && isFirstUserMessage ? message.slice(0, 60) : undefined,
      },
    })

    return NextResponse.json({
      threadId: thread.id,
      messageId: assistantMessage.id,
      reply, knowledgeGap, category, suggestedRule,
      workspace: newWorkspace,
      factSheets: sheets,
      patterns,
      predictions: predictionResults,
      dashaLookups: dashaLookupResults,
    })
  } catch (err) {
    console.error('[foreign-lab/chat]', err)
    return NextResponse.json({ error: describeDeepSeekError(err) }, { status: 500 })
  }
}

function describeDeepSeekError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/402|insufficient.*balance|balance.*insufficient/i.test(msg)) {
    return 'DeepSeek account has insufficient balance — top up at platform.deepseek.com to resume chat.'
  }
  if (/429|rate.?limit/i.test(msg)) {
    return 'DeepSeek rate-limited this request — wait a moment and try again.'
  }
  if (/401|invalid.*key|unauthorized|authentication/i.test(msg)) {
    return 'DeepSeek rejected the API key — check DEEPSEEK_API_KEY in your .env file.'
  }
  return 'Chat failed — something went wrong reaching DeepSeek. Check the server logs for details.'
}
