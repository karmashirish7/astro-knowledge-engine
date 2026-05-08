import { nakshatraLordFromLon, nakshatraElapsedFraction } from '../nakshatra'
import type { DashaTree, Mahadasha, Antardasha, CurrentDasha, DashaPeriod } from './types'

// Sequence and durations (years) — total 120
export const DASHA_SEQUENCE: { planet: string; years: number }[] = [
  { planet: 'Ketu',    years: 7  },
  { planet: 'Venus',   years: 20 },
  { planet: 'Sun',     years: 6  },
  { planet: 'Moon',    years: 10 },
  { planet: 'Mars',    years: 7  },
  { planet: 'Rahu',    years: 18 },
  { planet: 'Jupiter', years: 16 },
  { planet: 'Saturn',  years: 19 },
  { planet: 'Mercury', years: 17 },
]

const TOTAL_YEARS = 120
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000

function addYears(date: Date, years: number): Date {
  return new Date(date.getTime() + years * MS_PER_YEAR)
}

function seqFrom(startPlanet: string): typeof DASHA_SEQUENCE {
  const idx = DASHA_SEQUENCE.findIndex(d => d.planet === startPlanet)
  if (idx === -1) return DASHA_SEQUENCE
  return [...DASHA_SEQUENCE.slice(idx), ...DASHA_SEQUENCE.slice(0, idx)]
}

/**
 * Build the full 120-year Vimshottari Dasha tree.
 * @param birthDate   Gregorian birth date/time
 * @param moonLon     Sidereal lunar longitude (0–360, Lahiri)
 */
export function buildDashaTree(birthDate: Date, moonLon: number): DashaTree {
  const firstLord    = nakshatraLordFromLon(moonLon)
  const elapsed      = nakshatraElapsedFraction(moonLon)
  const firstYears   = DASHA_SEQUENCE.find(d => d.planet === firstLord)!.years
  const balanceYears = (1 - elapsed) * firstYears

  const sequence = seqFrom(firstLord)
  const tree: DashaTree = []
  let cursor = birthDate

  for (let i = 0; i < sequence.length; i++) {
    const { planet, years } = sequence[i]
    const mdYears   = i === 0 ? balanceYears : years
    const mdStart   = cursor
    const mdEnd     = addYears(mdStart, mdYears)

    const adSeq     = seqFrom(planet)
    const antardashas: Antardasha[] = []
    let adCursor = mdStart

    for (const adEntry of adSeq) {
      const adYears  = (mdYears * adEntry.years) / TOTAL_YEARS
      const adStart  = adCursor
      const adEnd    = addYears(adStart, adYears)

      const pdSeq    = seqFrom(adEntry.planet)
      const pratyantardashas = []
      let pdCursor = adStart

      for (const pdEntry of pdSeq) {
        const pdYears = (adYears * pdEntry.years) / TOTAL_YEARS
        const pdStart = pdCursor
        const pdEnd   = addYears(pdStart, pdYears)
        pratyantardashas.push({
          planet:        pdEntry.planet,
          startDate:     pdStart,
          endDate:       pdEnd,
          durationYears: pdYears,
        })
        pdCursor = pdEnd
      }

      antardashas.push({
        planet:           adEntry.planet,
        startDate:        adStart,
        endDate:          adEnd,
        durationYears:    adYears,
        pratyantardashas,
      })
      adCursor = adEnd
    }

    tree.push({
      planet:        planet,
      startDate:     mdStart,
      endDate:       mdEnd,
      durationYears: mdYears,
      antardashas,
    })
    cursor = mdEnd
  }

  // Append subsequent full cycles until 120 years covered
  let totalYears = tree.reduce((s, md) => s + md.durationYears, 0)
  let cycleIdx   = 0
  while (totalYears < 120) {
    const { planet, years } = DASHA_SEQUENCE[cycleIdx % DASHA_SEQUENCE.length]
    cycleIdx++
    const mdStart = cursor
    const mdEnd   = addYears(mdStart, years)
    const adSeq   = seqFrom(planet)
    const antardashas: Antardasha[] = []
    let adCursor = mdStart

    for (const adEntry of adSeq) {
      const adYears = (years * adEntry.years) / TOTAL_YEARS
      const adEnd   = addYears(adCursor, adYears)
      const pdSeq   = seqFrom(adEntry.planet)
      const pratyantardashas = []
      let pdCursor = adCursor
      for (const pdEntry of pdSeq) {
        const pdYears = (adYears * pdEntry.years) / TOTAL_YEARS
        const pdEnd   = addYears(pdCursor, pdYears)
        pratyantardashas.push({ planet: pdEntry.planet, startDate: pdCursor, endDate: pdEnd, durationYears: pdYears })
        pdCursor = pdEnd
      }
      antardashas.push({ planet: adEntry.planet, startDate: adCursor, endDate: adEnd, durationYears: adYears, pratyantardashas })
      adCursor = adEnd
    }

    tree.push({ planet, startDate: mdStart, endDate: mdEnd, durationYears: years, antardashas })
    totalYears += years
    cursor = mdEnd
  }

  return tree
}

/**
 * Computes the 9 sub-periods of any Vimshottari period on the fly.
 * Used for Sookshma (under PD) and Prana (under SD).
 */
export function computeSubPeriods(period: DashaPeriod): DashaPeriod[] {
  const idx = DASHA_SEQUENCE.findIndex(d => d.planet === period.planet)
  const start = idx === -1 ? 0 : idx
  const seq = [...DASHA_SEQUENCE.slice(start), ...DASHA_SEQUENCE.slice(0, start)]
  let cursor = period.startDate.getTime()
  return seq.map(entry => {
    const subYears = (period.durationYears * entry.years) / TOTAL_YEARS
    const s = new Date(cursor)
    const e = new Date(cursor + subYears * MS_PER_YEAR)
    cursor = e.getTime()
    return { planet: entry.planet, startDate: s, endDate: e, durationYears: subYears }
  })
}

/** Returns the current MD / AD / PD for a given date */
export function getCurrentDasha(tree: DashaTree, date: Date = new Date()): CurrentDasha | null {
  const md = tree.find(m => date >= m.startDate && date < m.endDate)
  if (!md) return null
  const ad = md.antardashas.find(a => date >= a.startDate && date < a.endDate)
  if (!ad) return null
  const pd = ad.pratyantardashas.find(p => date >= p.startDate && date < p.endDate)
  if (!pd) return null
  return {
    mahadasha:       { planet: md.planet, startDate: md.startDate, endDate: md.endDate, durationYears: md.durationYears },
    antardasha:      { planet: ad.planet, startDate: ad.startDate, endDate: ad.endDate, durationYears: ad.durationYears },
    pratyantardasha: { planet: pd.planet, startDate: pd.startDate, endDate: pd.endDate, durationYears: pd.durationYears },
  }
}

/** Compact representation suitable for storing in dashaJson */
export function serializeDashaTree(tree: DashaTree): string {
  return JSON.stringify(tree.map(md => ({
    p: md.planet,
    s: md.startDate.toISOString(),
    e: md.endDate.toISOString(),
    y: +md.durationYears.toFixed(4),
    ads: md.antardashas.map(ad => ({
      p: ad.planet,
      s: ad.startDate.toISOString(),
      e: ad.endDate.toISOString(),
      y: +ad.durationYears.toFixed(4),
      pds: ad.pratyantardashas.map(pd => ({
        p: pd.planet,
        s: pd.startDate.toISOString(),
        e: pd.endDate.toISOString(),
        y: +pd.durationYears.toFixed(4),
      })),
    })),
  })))
}

export function deserializeDashaTree(json: string): DashaTree {
  const raw = JSON.parse(json)
  return raw.map((md: any) => ({
    planet:        md.p,
    startDate:     new Date(md.s),
    endDate:       new Date(md.e),
    durationYears: md.y,
    antardashas:   (md.ads ?? []).map((ad: any) => ({
      planet:           ad.p,
      startDate:        new Date(ad.s),
      endDate:          new Date(ad.e),
      durationYears:    ad.y,
      pratyantardashas: (ad.pds ?? []).map((pd: any) => ({
        planet:        pd.p,
        startDate:     new Date(pd.s),
        endDate:       new Date(pd.e),
        durationYears: pd.y,
      })),
    })),
  }))
}
