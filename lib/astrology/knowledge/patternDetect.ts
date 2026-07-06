// Cross-chart pattern detection for the Dasha Lab workspace: given fact sheets
// for several charts/events, surfaces recurring factors (dasha lord, D1/D9/D10
// house placements) so the chat assistant can discuss candidate correlations —
// clearly separated from confirmed knowledge-base rule matches.
import type { ChartFactSheet } from './factSheet'
import { ruledHouses } from './foreignDasha'

type Layer = 'd1' | 'd9' | 'd10'
const LAYER_LABELS: Record<Layer, string> = { d1: 'D1', d9: 'D9 (superimposed)', d10: 'D10 (superimposed)' }

function dashaHas(fs: ChartFactSheet, planet: string): boolean {
  return [fs.active.mahadasha, fs.active.antardasha, fs.active.pratyantardasha]
    .some(p => p.toLowerCase() === planet.toLowerCase())
}
function houseOccupant(fs: ChartFactSheet, layer: Layer, house: number, planet: string): boolean {
  return fs.houses[layer][planet] === house
}
function lordOfHouseInDasha(fs: ChartFactSheet, house: number): boolean {
  const planets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']
  return planets.some(p => ruledHouses(p, fs.lagnaSign).includes(house) && dashaHas(fs, p))
}

interface FeatureCheck { key: string; label: string; test: (fs: ChartFactSheet) => boolean }

const KEY_PLANETS = ['Rahu', 'Ketu', 'Saturn', 'Jupiter', 'Mercury', 'Venus']
const KEY_HOUSES: Layer[] = ['d1', 'd9', 'd10']

const FEATURES: FeatureCheck[] = [
  // ── 11. "In which dasha does a person typically go abroad" ──
  ...KEY_PLANETS.map(p => ({ key: `dasha-${p}`, label: `${p} active in dasha (MD/AD/PD)`, test: (fs: ChartFactSheet) => dashaHas(fs, p) })),
  { key: 'dasha-saturn-rahu', label: 'Saturn & Rahu both active in dasha', test: fs => dashaHas(fs, 'Saturn') && dashaHas(fs, 'Rahu') },
  { key: 'dasha-rahu-jupiter', label: 'Rahu & Jupiter both active in dasha', test: fs => dashaHas(fs, 'Rahu') && dashaHas(fs, 'Jupiter') },
  { key: 'lord9-dasha', label: '9th lord active in dasha', test: fs => lordOfHouseInDasha(fs, 9) },
  { key: 'lord12-dasha', label: '12th lord active in dasha', test: fs => lordOfHouseInDasha(fs, 12) },
  { key: 'lord10-dasha', label: '10th lord active in dasha', test: fs => lordOfHouseInDasha(fs, 10) },
  { key: 'moon-rahu-conj-d1', label: 'Moon conjunct Rahu (D1)', test: fs => fs.houses.d1.Moon !== undefined && fs.houses.d1.Moon === fs.houses.d1.Rahu },
  ...KEY_HOUSES.flatMap(layer => [9, 12].flatMap(house =>
    ['Rahu', 'Ketu'].map(planet => ({
      key: `${planet.toLowerCase()}-${house}-${layer}`,
      label: `${planet} in house ${house} (${LAYER_LABELS[layer]})`,
      test: (fs: ChartFactSheet) => houseOccupant(fs, layer, house, planet),
    })),
  )),

  // ── House-circuit completion (house + its own lord both tied to the dasha network) ──
  { key: 'circuit-3-d1', label: '3rd house circuit complete (D1)', test: fs => fs.circuits.d1[3]?.complete },
  { key: 'circuit-7-d1', label: '7th house circuit complete (D1) — travel/vacation', test: fs => fs.circuits.d1[7]?.complete },
  { key: 'circuit-9-d1', label: '9th house circuit complete (D1) — long journeys', test: fs => fs.circuits.d1[9]?.complete },
  { key: 'circuit-12-d1', label: '12th house circuit complete (D1) — foreign residence', test: fs => fs.circuits.d1[12]?.complete },
  { key: 'circuit-5-d1', label: '5th house circuit complete (D1) — study', test: fs => fs.circuits.d1[5]?.complete },
  { key: 'circuit-6-d1', label: '6th house circuit complete (D1) — work/service', test: fs => fs.circuits.d1[6]?.complete },
  { key: 'circuit-10-d1', label: '10th house circuit complete (D1) — work/career', test: fs => fs.circuits.d1[10]?.complete },
  // ── Same, cross-verified via D9 (Navamsha) superimposed onto D1 ──
  { key: 'circuit-3-d9', label: '3rd house circuit complete via D9 superimposition', test: fs => fs.circuits.d9[3]?.complete },
  { key: 'circuit-7-d9', label: '7th house circuit complete via D9 superimposition', test: fs => fs.circuits.d9[7]?.complete },
  { key: 'circuit-9-d9', label: '9th house circuit complete via D9 superimposition', test: fs => fs.circuits.d9[9]?.complete },
  { key: 'circuit-12-d9', label: '12th house circuit complete via D9 superimposition', test: fs => fs.circuits.d9[12]?.complete },

  // ── Purpose of visit classification ──
  { key: 'purpose-travel', label: 'Purpose classified as Travel/Vacation (7th house)', test: fs => fs.purpose.d1.category === 'travel' },
  { key: 'purpose-study', label: 'Purpose classified as Study (5th house)', test: fs => fs.purpose.d1.category === 'study' },
  { key: 'purpose-work', label: 'Purpose classified as Work (6th/10th house)', test: fs => fs.purpose.d1.category === 'work' },
  { key: 'purpose-agrees-d9', label: 'D1 and D9 purpose classification agree', test: fs => fs.purpose.d1.category === fs.purpose.d9.category && fs.purpose.d1.category !== 'unclear' },
]

export interface PatternHit { key: string; label: string; count: number; total: number; charts: string[] }

export function detectPatterns(sheets: ChartFactSheet[]): PatternHit[] {
  if (sheets.length < 2) return [] // a "pattern" needs at least 2 charts to compare
  return FEATURES
    .map(f => {
      const charts = sheets.filter(f.test).map(fs => fs.chartName)
      return { key: f.key, label: f.label, count: charts.length, total: sheets.length, charts }
    })
    .filter(h => h.count >= 2)
    .sort((a, b) => b.count / b.total - a.count / a.total || b.count - a.count)
}

export function patternsToText(hits: PatternHit[]): string {
  if (hits.length === 0) return 'No recurring factor observed yet across the charts currently in the workspace (need 2+ charts sharing a factor).'
  return hits.map(h => `- ${h.label}: ${h.count}/${h.total} charts (${h.charts.join(', ')})`).join('\n')
}

export interface RuleFrequency { dictumId: string; rule: string; category: string; charts: string[] }

export function matchedRuleFrequency(sheets: ChartFactSheet[]): RuleFrequency[] {
  const map = new Map<string, RuleFrequency>()
  for (const fs of sheets) {
    for (const m of fs.matchedRules) {
      const entry = map.get(m.dictumId) ?? { dictumId: m.dictumId, rule: m.rule, category: m.category, charts: [] }
      entry.charts.push(fs.chartName)
      map.set(m.dictumId, entry)
    }
  }
  return [...map.values()].sort((a, b) => b.charts.length - a.charts.length)
}
