import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { aqlToPrisma, conditionsJsonToPrisma } from '@/lib/astrology/query'
import { deserializeDashaTree, getCurrentDasha } from '@/lib/astrology/dasha'
import { withPlanetsMany } from '@/lib/chart-response'
import type { AQLQuery, AQLCondition } from '@/lib/astrology/query/types'
import { computeDivisional } from '@/lib/astrology/divisional'
import { SIGN_NAMES } from '@/lib/astrology/calculations/positions'

// Returns true if the chart satisfies all divisional conditions (AND logic within group)
function matchesDivisionalConditions(
  chart: { calculatedPositions?: string | null; planetaryData?: { rawJson?: string | null } | null },
  divisionalConds: AQLCondition[],
  logic: 'AND' | 'OR',
): boolean {
  if (divisionalConds.length === 0) return true

  // calculatedPositions lives on Chart; rawJson on PlanetaryData is a fallback
  const calcRaw = chart.calculatedPositions || chart.planetaryData?.rawJson
  if (!calcRaw || calcRaw === '{}') return false

  let calc: any
  try { calc = JSON.parse(calcRaw) } catch { return false }

  // Group conditions by divisional number
  const byN: Record<number, AQLCondition[]> = {}
  for (const cond of divisionalConds) {
    const m = cond.field.match(/^d(\d+)_/)
    if (!m) continue
    const n = parseInt(m[1])
    ;(byN[n] ??= []).push(cond)
  }

  const results: boolean[] = []

  for (const [nStr, conds] of Object.entries(byN)) {
    const n = parseInt(nStr)
    const div = computeDivisional(calc, n)
    if (!div) { results.push(false); continue }

    for (const cond of conds) {
      const fieldPart = cond.field.replace(/^d\d+_/, '') // e.g. "lagna", "saturnHouse"
      let match = false

      if (fieldPart === 'lagna') {
        const signName = SIGN_NAMES[div.lagna - 1]
        if (cond.operator === 'eq')  match = signName === cond.value
        if (cond.operator === 'neq') match = signName !== cond.value
      } else if (fieldPart.endsWith('Sign')) {
        // e.g. "saturnSign" → derive sign from D{n} lagna + house
        const planet = fieldPart.replace(/Sign$/, '')
        const cap    = planet.charAt(0).toUpperCase() + planet.slice(1)
        const house  = div.planets[cap]
        if (house == null) { results.push(false); continue }
        const signIdx  = (div.lagna + house - 2) % 12
        const signName = SIGN_NAMES[signIdx]
        if (cond.operator === 'eq')  match = signName === cond.value
        if (cond.operator === 'neq') match = signName !== cond.value
      } else {
        // e.g. "saturnHouse"
        const planet = fieldPart.replace(/House$/, '')
        const cap    = planet.charAt(0).toUpperCase() + planet.slice(1)
        const house  = div.planets[cap]
        if (house == null) { results.push(false); continue }
        const val = Number(cond.value)
        if (cond.operator === 'eq')  match = house === val
        if (cond.operator === 'neq') match = house !== val
        if (cond.operator === 'gt')  match = house >   val
        if (cond.operator === 'gte') match = house >=  val
        if (cond.operator === 'lt')  match = house <   val
        if (cond.operator === 'lte') match = house <=  val
        if (cond.operator === 'in')  match = Array.isArray(cond.value) && (cond.value as number[]).map(Number).includes(house)
        if (cond.operator === 'notIn') match = Array.isArray(cond.value) && !(cond.value as number[]).map(Number).includes(house)
      }

      results.push(match)
    }
  }

  if (results.length === 0) return true
  return logic === 'AND' ? results.every(Boolean) : results.some(Boolean)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { conditions, logic = 'AND', dictumId, limit = 50 } = body

    // Separate D1 conditions from divisional (d9_*, d10_*, etc.)
    const allConditions: AQLCondition[] = conditions && Array.isArray(conditions) ? conditions : []
    const d1Conditions        = allConditions.filter(c => !/^d\d+_/.test(c.field))
    const divisionalConditions = allConditions.filter(c => /^d\d+_/.test(c.field))
    const hasDivisional        = divisionalConditions.length > 0

    // Build where clause — from AQL conditions or a saved dictum's conditionsJson
    let chartWhere: Record<string, unknown> = {}

    if (dictumId) {
      const dictum = await prisma.dictum.findUnique({ where: { id: dictumId } })
      if (dictum?.conditionsJson && dictum.conditionsJson !== '{}') {
        chartWhere = conditionsJsonToPrisma(dictum.conditionsJson)
      }
    }

    if (d1Conditions.length > 0) {
      const aqlWhere = aqlToPrisma({ conditions: d1Conditions, logic } as AQLQuery)
      if (chartWhere.planetaryData && aqlWhere.planetaryData) {
        chartWhere = {
          planetaryData: {
            ...(chartWhere.planetaryData as object),
            ...(aqlWhere.planetaryData as object),
          },
        }
      } else if (aqlWhere.planetaryData) {
        chartWhere = aqlWhere
      }
    }

    // Guard: if no real filter was built, return empty rather than all charts
    const hasFilter = Object.keys(chartWhere).length > 0 || hasDivisional
    if (!hasFilter) {
      return NextResponse.json({ total: 0, charts: [], message: 'No conditions — add at least one filter' })
    }

    // For divisional-only queries we need to fetch all charts (up to a cap) then post-filter
    const fetchLimit = hasDivisional && Object.keys(chartWhere).length === 0 ? 500 : limit

    const charts = await prisma.chart.findMany({
      where:   Object.keys(chartWhere).length > 0 ? chartWhere as any : undefined,
      take:    fetchLimit,
      orderBy: { updatedAt: 'desc' },
      include: {
        planetaryData: true,
        observations:  { select: { id: true, status: true } },
        predictions:   { select: { id: true, outcome: true } },
        dictumVerifications: dictumId
          ? { where: { dictumId }, select: { verdict: true } }
          : false,
      },
    })

    // Post-filter by divisional conditions if any
    const filtered = hasDivisional
      ? charts.filter(c => matchesDivisionalConditions(c as any, divisionalConditions, logic)).slice(0, limit)
      : charts

    // Enrich with current dasha summary
    const enriched = withPlanetsMany(filtered).map(chart => {
      let currentDasha: { mahadasha: string; antardasha: string } | null = null
      const pd = chart.planetaryData
      if (pd?.dashaJson && pd.dashaJson !== '{}' && pd.dashaJson !== '[]') {
        try {
          const tree    = deserializeDashaTree(pd.dashaJson)
          const current = getCurrentDasha(tree)
          if (current) {
            currentDasha = {
              mahadasha:  current.mahadasha.planet,
              antardasha: current.antardasha.planet,
            }
          }
        } catch {}
      }
      return {
        ...chart,
        currentDasha,
        observationCount: chart.observations?.length ?? 0,
        predictionCount:  chart.predictions?.length ?? 0,
      }
    })

    return NextResponse.json({
      total:  enriched.length,
      charts: enriched,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }
}
