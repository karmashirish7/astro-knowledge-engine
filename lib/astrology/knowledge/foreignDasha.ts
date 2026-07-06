// ── Foreign Travel / Study / Employment dasha-rule matching ────────────────
// Knowledge base is stored as Dictum rows (category = one of FOREIGN_CATEGORIES)
// with a structured conditionsJson so a dasha-at-date lookup can be matched
// deterministically against classical rules — no LLM guessing involved.

export const FOREIGN_CATEGORIES = ['foreign-travel', 'foreign-study', 'foreign-employment'] as const
export type ForeignCategory = typeof FOREIGN_CATEGORIES[number]

export const FOREIGN_CATEGORY_LABELS: Record<ForeignCategory, string> = {
  'foreign-travel':     'Foreign Travel',
  'foreign-study':      'Foreign Study',
  'foreign-employment': 'Foreign Employment',
}

export const SIGN_RULER: Record<number, string> = {
  1: 'Mars', 2: 'Venus', 3: 'Mercury', 4: 'Moon', 5: 'Sun', 6: 'Mercury',
  7: 'Venus', 8: 'Mars', 9: 'Jupiter', 10: 'Saturn', 11: 'Saturn', 12: 'Jupiter',
}

export type ChartLayer = 'd1' | 'd9' | 'd10'

/** Structured, machine-checkable shape of a foreign-event dictum's conditionsJson. */
export interface ForeignRuleConditions {
  layer?: ChartLayer                // which house-map dashaPlanetHouse/conjunctWith checks — D1 natal, or D9/D10 superimposed onto D1. Defaults to 'd1'.
  dashaPlanetIn?: string[]          // matches if the active MD/AD/PD planet is one of these
  dashaPlanetHouse?: number[]       // matches if that SAME planet is placed (in `layer`) in one of these houses
  dashaPlanetRulesHouse?: number[]  // matches if that SAME planet natally (D1) rules (is lord of) one of these houses
  conjunctWith?: string[]           // that SAME planet must be conjunct (same house, in `layer`) with one of these planets
  dashaCombo?: string[]             // matches if ALL these planets appear among {md, ad, pd} (any levels/order)
}

export interface ActiveDashaPlanets {
  mahadasha: string
  antardasha: string
  pratyantardasha: string
}

/** Planet → house number, one map per chart layer (D1 natal, D9/D10 superimposed onto D1). */
export interface HouseLayers {
  d1: Record<string, number>
  d9: Record<string, number>
  d10: Record<string, number>
}

export interface RuleMatchResult {
  matched: boolean
  triggeredBy: { level: 'MD' | 'AD' | 'PD'; planet: string; layer: ChartLayer }[]
}

export function ruledHouses(planet: string, lagnaSign: number): number[] {
  const houses: number[] = []
  for (const [signStr, ruler] of Object.entries(SIGN_RULER)) {
    if (ruler !== planet) continue
    const sign = Number(signStr)
    houses.push(((sign - lagnaSign + 12) % 12) + 1)
  }
  return houses.sort((a, b) => a - b)
}

/**
 * Checks whether a single planet satisfies all single-planet condition keys
 * in the rule (dashaPlanetIn / dashaPlanetHouse / dashaPlanetRulesHouse / conjunctWith).
 * Keys that are absent from the rule are treated as "no constraint".
 */
function planetSatisfiesRule(
  planet: string,
  cond: ForeignRuleConditions,
  lagnaSign: number,
  houses: Record<string, number>,
): boolean {
  if (cond.dashaPlanetIn && cond.dashaPlanetIn.length > 0) {
    if (!cond.dashaPlanetIn.some(p => p.toLowerCase() === planet.toLowerCase())) return false
  }
  if (cond.dashaPlanetHouse && cond.dashaPlanetHouse.length > 0) {
    const house = houses[planet]
    if (house === undefined || !cond.dashaPlanetHouse.includes(house)) return false
  }
  if (cond.dashaPlanetRulesHouse && cond.dashaPlanetRulesHouse.length > 0) {
    const rules = ruledHouses(planet, lagnaSign)
    if (!cond.dashaPlanetRulesHouse.some(h => rules.includes(h))) return false
  }
  if (cond.conjunctWith && cond.conjunctWith.length > 0) {
    const house = houses[planet]
    if (house === undefined) return false
    const conjunct = cond.conjunctWith.some(other =>
      other.toLowerCase() !== planet.toLowerCase() && houses[other] === house,
    )
    if (!conjunct) return false
  }
  // A rule with zero keys set is too vague to ever match — require at least one.
  const hasAnyKey = !!(cond.dashaPlanetIn?.length || cond.dashaPlanetHouse?.length || cond.dashaPlanetRulesHouse?.length || cond.conjunctWith?.length)
  return hasAnyKey
}

/**
 * Evaluates one dictum's conditionsJson against the active MD/AD/PD for a chart.
 * `houses.d1/d9/d10` are house-maps in the SAME D1-house numbering — D9/D10 are
 * superimposed onto D1 (see superimposeOntoD1Houses) so rules can reference any
 * of the three layers via `cond.layer`.
 */
export function matchForeignRule(
  cond: ForeignRuleConditions,
  active: ActiveDashaPlanets,
  lagnaSign: number,
  houses: HouseLayers,
): RuleMatchResult {
  const triggeredBy: RuleMatchResult['triggeredBy'] = []
  const layer = cond.layer ?? 'd1'
  const houseMap = houses[layer]

  const levels: { level: 'MD' | 'AD' | 'PD'; planet: string }[] = [
    { level: 'MD', planet: active.mahadasha },
    { level: 'AD', planet: active.antardasha },
    { level: 'PD', planet: active.pratyantardasha },
  ]

  const hasSinglePlanetKeys = !!(cond.dashaPlanetIn?.length || cond.dashaPlanetHouse?.length || cond.dashaPlanetRulesHouse?.length || cond.conjunctWith?.length)
  if (hasSinglePlanetKeys) {
    for (const { level, planet } of levels) {
      if (planetSatisfiesRule(planet, cond, lagnaSign, houseMap)) {
        triggeredBy.push({ level, planet, layer })
      }
    }
  }

  if (cond.dashaCombo && cond.dashaCombo.length > 0) {
    const activeSet = levels.map(l => l.planet.toLowerCase())
    const comboHit = cond.dashaCombo.every(p => activeSet.includes(p.toLowerCase()))
    if (comboHit) {
      for (const { level, planet } of levels) {
        if (cond.dashaCombo.some(p => p.toLowerCase() === planet.toLowerCase())) {
          triggeredBy.push({ level, planet, layer })
        }
      }
    }
  }

  return { matched: triggeredBy.length > 0, triggeredBy }
}

export function parseForeignConditions(json: string | null | undefined): ForeignRuleConditions {
  if (!json) return {}
  try {
    const parsed = JSON.parse(json)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

/** Best-effort default conditionsJson for a brand-new rule the user is teaching the system. */
export function defaultConditionsFromActive(active: ActiveDashaPlanets): ForeignRuleConditions {
  const planets = [active.mahadasha, active.antardasha, active.pratyantardasha]
  const unique = [...new Set(planets)]
  return unique.length > 1 ? { dashaCombo: unique } : { dashaPlanetIn: unique }
}
