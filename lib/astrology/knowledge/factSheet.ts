// Builds a deterministic "fact sheet" for one chart at one event date, following
// the research SOP: dasha lord → its influence (posited house / aspect /
// lordship) on the chart at all three levels (MD/AD/PD) → which houses get
// activated → whether the 3rd/7th/9th/12th house "circuits" (house + its own
// lord both tied into the dasha network) are completed → the same check
// cross-verified via D9 (Navamsha) superimposed onto D1 → purpose of visit
// (5th study / 6th & 10th work / 7th travel) → which knowledge-base rules matched.
// This is the grounding context fed to the Dasha Lab chat LLM — every
// astrological claim it makes should trace back to something computed here.
import { computeDivisional, superimposeOntoD1Houses } from '@/lib/astrology/divisional'
import { deserializeDashaTree, getCurrentDasha } from '@/lib/astrology/dasha'
import {
  FOREIGN_CATEGORIES, type ForeignCategory, parseForeignConditions, matchForeignRule,
  type ActiveDashaPlanets, type HouseLayers, type RuleMatchResult,
} from './foreignDasha'
import {
  dashaLevels, planetActivation, buildCircuits, classifyPurpose,
  CIRCUIT_HOUSES, MOVEMENT_HOUSES, type HouseCircuit, type PurposeClassification,
} from './houseCircuit'

export interface DictumRow {
  id: string
  rule: string
  strength: string
  category: string
  conditionsJson: string
}

export interface MatchedRuleRef {
  dictumId: string
  category: ForeignCategory
  rule: string
  strength: string
  triggeredBy: RuleMatchResult['triggeredBy']
}

export interface ChartFactSheet {
  chartId: string
  chartName: string
  eventDate: string // ISO
  eventType: ForeignCategory
  lagnaSign: number
  active: ActiveDashaPlanets
  houses: HouseLayers
  circuits: { d1: Record<number, HouseCircuit>; d9: Record<number, HouseCircuit> }
  purpose: { d1: PurposeClassification; d9: PurposeClassification }
  matchedRules: MatchedRuleRef[]
}

export function buildHouseLayers(calc: { lagnaSign?: number; houseNumbers?: Record<string, number> }): HouseLayers {
  const lagnaSign = calc?.lagnaSign ?? 1
  const d1 = calc?.houseNumbers ?? {}
  const d9Div = computeDivisional(calc, 9)
  const d10Div = computeDivisional(calc, 10)
  return {
    d1,
    d9: d9Div ? superimposeOntoD1Houses(d9Div, lagnaSign) : {},
    d10: d10Div ? superimposeOntoD1Houses(d10Div, lagnaSign) : {},
  }
}

export function buildFactSheetFromData(
  chartId: string,
  chartName: string,
  calc: { lagnaSign?: number; houseNumbers?: Record<string, number> },
  dashaJson: string,
  eventDate: Date,
  eventType: ForeignCategory,
  dictums: DictumRow[],
): ChartFactSheet | null {
  const tree = deserializeDashaTree(dashaJson)
  const current = getCurrentDasha(tree, eventDate)
  if (!current) return null

  const active: ActiveDashaPlanets = {
    mahadasha: current.mahadasha.planet,
    antardasha: current.antardasha.planet,
    pratyantardasha: current.pratyantardasha.planet,
  }
  const lagnaSign = calc?.lagnaSign ?? 1
  const houses = buildHouseLayers(calc)

  const circuitsD1 = buildCircuits(active, houses.d1, lagnaSign)
  const circuitsD9 = buildCircuits(active, houses.d9, lagnaSign)

  const matchedRules: MatchedRuleRef[] = dictums
    .filter(d => FOREIGN_CATEGORIES.includes(d.category as ForeignCategory))
    .map(d => {
      const cond = parseForeignConditions(d.conditionsJson)
      const result = matchForeignRule(cond, active, lagnaSign, houses)
      return result.matched
        ? { dictumId: d.id, category: d.category as ForeignCategory, rule: d.rule, strength: d.strength, triggeredBy: result.triggeredBy }
        : null
    })
    .filter((m): m is MatchedRuleRef => m !== null)

  return {
    chartId, chartName, eventDate: eventDate.toISOString(), eventType, lagnaSign, active, houses,
    circuits: { d1: circuitsD1, d9: circuitsD9 },
    purpose: { d1: classifyPurpose(circuitsD1), d9: classifyPurpose(circuitsD9) },
    matchedRules,
  }
}

function fmtHouses(map: Record<string, number>): string {
  const entries = Object.entries(map).sort((a, b) => a[1] - b[1])
  return entries.length ? entries.map(([p, h]) => `${p} H${h}`).join(', ') : '(no data)'
}

function circuitLine(c: HouseCircuit): string {
  if (!c.complete) {
    if (!c.houseActivated) return `H${c.house} (lord ${c.lord}): not activated by the dasha network — circuit incomplete.`
    return `H${c.house} (lord ${c.lord}): house activated (${c.houseActivatedBy.map(a => `${a.level} ${a.planet} ${a.via}`).join(', ')}) but lord ${c.lord} is NOT tied to the dasha network — circuit incomplete.`
  }
  return `H${c.house} (lord ${c.lord}): CIRCUIT COMPLETE — house activated (${c.houseActivatedBy.map(a => `${a.level} ${a.planet} ${a.via}`).join(', ')}); lord ${c.lord} connected (${c.lordConnectedBy.map(l => `${l.level} ${l.planet} ${l.via}`).join(', ')}).`
}

/** Formats a fact sheet as a CHART PROFILE (no specific event — use for general chart questions). */
export function chartProfileToText(fs: ChartFactSheet): string {
  const dateStr = new Date(fs.eventDate).toDateString()
  const levels = dashaLevels(fs.active)

  const lines = [
    `Chart: ${fs.chartName}`,
    `Profile as of: ${dateStr} (use for any question about this chart's current dasha, placements, D9, D10, house rulers, etc.)`,
    `Current dasha: ${fs.active.mahadasha} Mahadasha → ${fs.active.antardasha} Antardasha → ${fs.active.pratyantardasha} Pratyantardasha`,
    `D1 (natal) house placements: ${fmtHouses(fs.houses.d1)}`,
    `D9 (Navamsha), superimposed onto D1 houses: ${fmtHouses(fs.houses.d9)}`,
    `D10 (Dashamsha), superimposed onto D1 houses: ${fmtHouses(fs.houses.d10)}`,
    '',
    'Dasha-lord activation (posited house / aspect / lordship), D1:',
  ]
  for (const { level, planet } of levels) {
    const act = planetActivation(planet, fs.houses.d1, fs.lagnaSign)
    lines.push(`  - ${level} ${planet}: posited H${act.occupiedHouse ?? '?'}, aspects H${act.aspectedHouses.join(',') || '—'}, rules H${act.ruledHouses.join(',') || '—'}`)
  }
  lines.push('', `Movement-house circuit check (3, 7, 9, 12), D1:`)
  for (const h of MOVEMENT_HOUSES) lines.push('  - ' + circuitLine(fs.circuits.d1[h]))
  lines.push('', 'Same check, D9 superimposed on D1:')
  for (const h of MOVEMENT_HOUSES) lines.push('  - ' + circuitLine(fs.circuits.d9[h]))
  if (fs.matchedRules.length > 0) {
    lines.push('', 'Matched knowledge-base rules:')
    for (const m of fs.matchedRules) {
      lines.push(`  - [${m.category}] "${m.rule}"`)
    }
  }
  return lines.join('\n')
}

export function factSheetToText(fs: ChartFactSheet): string {
  const dateStr = new Date(fs.eventDate).toDateString()
  const levels = dashaLevels(fs.active)

  const lines = [
    `Chart: ${fs.chartName}`,
    `Event: ${fs.eventType} around ${dateStr}`,
    `Dasha running at that date: ${fs.active.mahadasha} Mahadasha → ${fs.active.antardasha} Antardasha → ${fs.active.pratyantardasha} Pratyantardasha`,
    `D1 (natal) house placements: ${fmtHouses(fs.houses.d1)}`,
    `D9 (Navamsha), superimposed onto D1 houses: ${fmtHouses(fs.houses.d9)}`,
    `D10 (Dashamsha), superimposed onto D1 houses: ${fmtHouses(fs.houses.d10)}`,
    '',
    'Dasha-lord activation (posited house / aspect / lordship), D1:',
  ]
  for (const { level, planet } of levels) {
    const act = planetActivation(planet, fs.houses.d1, fs.lagnaSign)
    lines.push(`  - ${level} ${planet}: posited H${act.occupiedHouse ?? '?'}, aspects H${act.aspectedHouses.join(',') || '—'}, rules H${act.ruledHouses.join(',') || '—'}`)
  }

  lines.push('', `House-circuit check for movement houses (${MOVEMENT_HOUSES.join(', ')}) and purpose houses (5, 6, 10), D1:`)
  for (const h of CIRCUIT_HOUSES) lines.push('  - ' + circuitLine(fs.circuits.d1[h]))

  lines.push('', 'Same house-circuit check, but using D9 (Navamsha) positions superimposed onto D1 — cross-verification:')
  for (const h of MOVEMENT_HOUSES) lines.push('  - ' + circuitLine(fs.circuits.d9[h]))

  lines.push(
    '',
    `Purpose of visit (D1): ${fs.purpose.d1.category}${fs.purpose.d1.houses.length ? ` (via H${fs.purpose.d1.houses.join(', H')})` : ''}`,
    `Purpose of visit (D9 cross-check): ${fs.purpose.d9.category}${fs.purpose.d9.houses.length ? ` (via H${fs.purpose.d9.houses.join(', H')})` : ''}`,
  )

  if (fs.matchedRules.length > 0) {
    lines.push('', 'Matched knowledge-base rules for this chart/date:')
    for (const m of fs.matchedRules) {
      const trig = m.triggeredBy.map(t => `${t.level} ${t.planet} via ${t.layer.toUpperCase()}`).join(', ')
      lines.push(`  - [${m.category}] "${m.rule}" (triggered by ${trig})`)
    }
  } else {
    lines.push('', 'No knowledge-base rule matched this chart/date.')
  }
  return lines.join('\n')
}
