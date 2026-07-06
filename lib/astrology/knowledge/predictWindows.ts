// Forward-looking prediction: "when will X go abroad" has no event date to
// analyze, so instead of asking the researcher for one, scan the chart's
// full Vimshottari dasha tree for windows where a foreign-movement house
// circuit (3rd/7th/9th/12th) completes — the same circuit-completion engine
// used for retrospective analysis, just run across many points in time
// instead of one.
import type { DashaTree } from '@/lib/astrology/dasha/types'
import { buildCircuits, classifyPurpose, MOVEMENT_HOUSES, type HouseCircuit, type PurposeClassification } from './houseCircuit'
import {
  type ActiveDashaPlanets, type HouseLayers, type ForeignCategory, parseForeignConditions, matchForeignRule, FOREIGN_CATEGORIES,
} from './foreignDasha'
import type { DictumRow, MatchedRuleRef } from './factSheet'

export const DEFAULT_PREDICT_HORIZON_YEARS = 15

/**
 * How a scan boundary resolves at compute time — not a fixed value, so a
 * persisted prediction can be re-evaluated correctly on every reload:
 *   - "today": always "now" (slides forward with time)
 *   - "horizon": "now" + N years (slides forward; used as the default `to`)
 *   - "fixed": a literal date the researcher gave explicitly
 *   - "birthAge": the chart's birth date + N years (covers "from age 16",
 *     "since birth" (age 0), "her whole life") — requires the chart's birthDate
 */
export type DateBound =
  | { mode: 'today' }
  | { mode: 'horizon'; years: number }
  | { mode: 'fixed'; iso: string }
  | { mode: 'birthAge'; age: number }

/** A forward- or backward-looking scan request persisted on a thread, so it survives reload. */
export interface PersistedPrediction {
  chartId: string
  chartName: string
  eventType: ForeignCategory
  from: DateBound
  to: DateBound
}

function resolveDateBound(bound: DateBound, birthDate: Date | null): Date {
  switch (bound.mode) {
    case 'today': return new Date()
    case 'horizon': return new Date(Date.now() + bound.years * 365.25 * 24 * 60 * 60 * 1000)
    case 'fixed': return new Date(bound.iso)
    case 'birthAge': {
      if (!birthDate || isNaN(birthDate.getTime())) return new Date()
      const d = new Date(birthDate.getTime())
      d.setFullYear(d.getFullYear() + bound.age)
      return d
    }
  }
}

/** Resolves both boundaries of a persisted prediction at compute time — sliding bounds re-anchor, fixed/birth-relative ones don't. */
export function resolvePredictionRange(p: PersistedPrediction, birthDate: Date | null): { from: Date; to: Date } {
  return { from: resolveDateBound(p.from, birthDate), to: resolveDateBound(p.to, birthDate) }
}

export interface PredictedWindow {
  start: string // ISO
  end: string   // ISO
  active: ActiveDashaPlanets
  completeHouses: number[]       // which of MOVEMENT_HOUSES completed (D1)
  d9CompleteHouses: number[]     // same, cross-checked via D9 superimposed
  purpose: PurposeClassification
  matchedRules: MatchedRuleRef[]
}

interface ScannedPeriod {
  start: Date
  end: Date
  active: ActiveDashaPlanets
  circuitsD1: Record<number, HouseCircuit>
}

/** Raw PD-level scan of the dasha tree within [from, to]; no filtering yet. */
function scanPdPeriods(tree: DashaTree, houses: Record<string, number>, lagnaSign: number, from: Date, to: Date): ScannedPeriod[] {
  const periods: ScannedPeriod[] = []
  for (const md of tree) {
    if (md.endDate <= from || md.startDate >= to) continue
    for (const ad of md.antardashas) {
      if (ad.endDate <= from || ad.startDate >= to) continue
      for (const pd of ad.pratyantardashas) {
        if (pd.endDate <= from || pd.startDate >= to) continue
        const active: ActiveDashaPlanets = { mahadasha: md.planet, antardasha: ad.planet, pratyantardasha: pd.planet }
        periods.push({ start: pd.startDate, end: pd.endDate, active, circuitsD1: buildCircuits(active, houses, lagnaSign) })
      }
    }
  }
  return periods
}

function completeMovementHouses(circuits: Record<number, HouseCircuit>): number[] {
  return MOVEMENT_HOUSES.filter(h => circuits[h]?.complete)
}

/**
 * Scans [from, to] for windows where at least one movement-house circuit
 * completes, merges chronologically adjacent periods with the same outcome
 * into single windows, cross-checks each via D9, and attaches matched
 * knowledge-base rules — mirroring the retrospective fact sheet's analysis.
 */
export function predictWindows(
  tree: DashaTree,
  houses: HouseLayers,
  lagnaSign: number,
  from: Date,
  to: Date,
  dictums: DictumRow[],
): PredictedWindow[] {
  const periods = scanPdPeriods(tree, houses.d1, lagnaSign, from, to)
  const withHits = periods.map(p => ({ ...p, completeHouses: completeMovementHouses(p.circuitsD1) })).filter(p => p.completeHouses.length > 0)

  // Merge chronologically adjacent periods that share the exact same completed-house signature.
  const merged: { start: Date; end: Date; active: ActiveDashaPlanets; completeHouses: number[] }[] = []
  for (const p of withHits) {
    const last = merged[merged.length - 1]
    const sameSignature = last && last.completeHouses.join(',') === p.completeHouses.join(',') && last.end.getTime() === p.start.getTime()
    if (sameSignature) {
      last.end = p.end
      last.active = p.active // keep the most specific (latest) PD lord for the merged window
    } else {
      merged.push({ start: p.start, end: p.end, active: p.active, completeHouses: p.completeHouses })
    }
  }

  return merged.map(w => {
    const circuitsD9 = buildCircuits(w.active, houses.d9, lagnaSign)
    const d9CompleteHouses = completeMovementHouses(circuitsD9)
    const circuitsD1ForPurpose = buildCircuits(w.active, houses.d1, lagnaSign)

    const matchedRules: MatchedRuleRef[] = dictums
      .filter(d => FOREIGN_CATEGORIES.includes(d.category as ForeignCategory))
      .map(d => {
        const cond = parseForeignConditions(d.conditionsJson)
        const result = matchForeignRule(cond, w.active, lagnaSign, houses)
        return result.matched
          ? { dictumId: d.id, category: d.category as ForeignCategory, rule: d.rule, strength: d.strength, triggeredBy: result.triggeredBy }
          : null
      })
      .filter((m): m is MatchedRuleRef => m !== null)

    return {
      start: w.start.toISOString(), end: w.end.toISOString(), active: w.active,
      completeHouses: w.completeHouses, d9CompleteHouses,
      purpose: classifyPurpose(circuitsD1ForPurpose),
      matchedRules,
    }
  })
}

export function predictedWindowToText(chartName: string, eventType: ForeignCategory, w: PredictedWindow): string {
  const fmt = (iso: string) => new Date(iso).toDateString()
  const lines = [
    `${chartName} — predicted window for ${eventType}: ${fmt(w.start)} → ${fmt(w.end)}`,
    `  Dasha: ${w.active.mahadasha} MD → ${w.active.antardasha} AD → ${w.active.pratyantardasha} PD`,
    `  D1 movement-house circuits complete: H${w.completeHouses.join(', H') || 'none'}`,
    `  D9 cross-check: H${w.d9CompleteHouses.join(', H') || 'none'}`,
    `  Purpose: ${w.purpose.category}${w.purpose.houses.length ? ` (via H${w.purpose.houses.join(', H')})` : ''}`,
  ]
  if (w.matchedRules.length > 0) {
    lines.push('  Matched knowledge-base rules:')
    for (const m of w.matchedRules) lines.push(`    - [${m.category}] "${m.rule}"`)
  }
  return lines.join('\n')
}
