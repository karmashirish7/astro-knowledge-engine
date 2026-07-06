// Plain "what dasha was/is/will be running for X in [year]" questions are
// neither a foreign-event mention (no event is being described) nor a
// forward scan for movement-house circuits (predictWindows filters those
// out entirely) — so without this, a bare-year question had nothing to
// ground an answer in, and the LLM correctly refused to guess but had no
// real data to fall back on either. This walks the SAME pre-computed
// Vimshottari dasha tree used everywhere else and returns the exact PD-level
// periods overlapping a calendar year, no estimation involved.
import type { DashaTree } from '@/lib/astrology/dasha/types'
import type { ActiveDashaPlanets } from './foreignDasha'

export interface DashaLookupRequest {
  chartId: string
  chartName: string
  year: number
}

export interface DashaLookupPeriod {
  start: string // ISO
  end: string   // ISO
  active: ActiveDashaPlanets
}

/** Raw PD-level periods overlapping [from, to), clipped to that range — no circuit/house filtering. */
export function rawDashaPeriods(tree: DashaTree, from: Date, to: Date): DashaLookupPeriod[] {
  const periods: DashaLookupPeriod[] = []
  for (const md of tree) {
    if (md.endDate <= from || md.startDate >= to) continue
    for (const ad of md.antardashas) {
      if (ad.endDate <= from || ad.startDate >= to) continue
      for (const pd of ad.pratyantardashas) {
        if (pd.endDate <= from || pd.startDate >= to) continue
        periods.push({
          start: (pd.startDate < from ? from : pd.startDate).toISOString(),
          end: (pd.endDate > to ? to : pd.endDate).toISOString(),
          active: { mahadasha: md.planet, antardasha: ad.planet, pratyantardasha: pd.planet },
        })
      }
    }
  }
  return periods
}

export function dashaLookupToText(chartName: string, year: number, periods: DashaLookupPeriod[]): string {
  if (periods.length === 0) return `${chartName} — no computed dasha data overlaps ${year} (likely outside the 120-year Vimshottari cycle from her birth).`
  const fmt = (iso: string) => new Date(iso).toDateString()
  const lines = [`${chartName} — exact Vimshottari dasha running during ${year} (from the real calculator, not estimated):`]
  for (const p of periods) lines.push(`  ${fmt(p.start)} → ${fmt(p.end)}: ${p.active.mahadasha} MD → ${p.active.antardasha} AD → ${p.active.pratyantardasha} PD`)
  return lines.join('\n')
}
