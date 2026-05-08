import { nakshatraIndexFromLon, nakshatraElapsedFraction } from '../nakshatra'
import type { DashaTree, Mahadasha, Antardasha, DashaPeriod, CurrentDasha } from './types'

// 8 Yoginis — name, ruling planet, duration in years. Total = 36 years.
export const YOGINI_SEQUENCE: { yogini: string; planet: string; years: number }[] = [
  { yogini: 'Mangala',  planet: 'Mars',    years: 1 },
  { yogini: 'Pingala',  planet: 'Venus',   years: 2 },
  { yogini: 'Dhanya',   planet: 'Mercury', years: 3 },
  { yogini: 'Bhramari', planet: 'Moon',    years: 4 },
  { yogini: 'Bhadrika', planet: 'Sun',     years: 5 },
  { yogini: 'Ulka',     planet: 'Saturn',  years: 6 },
  { yogini: 'Siddha',   planet: 'Jupiter', years: 7 },
  { yogini: 'Sankata',  planet: 'Rahu',    years: 8 },
]

const TOTAL_YEARS = 36
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000

function addYears(date: Date, years: number): Date {
  return new Date(date.getTime() + years * MS_PER_YEAR)
}

// Formula: (nakshatra_number + 3) % 8, where nakshatra_number is 1-based.
// nakshatraIndexFromLon returns 0-based, so add 4 (= +1 to make 1-based, +3 per spec).
// Remainder 0 maps to Sankata (index 7); remainder r maps to index r-1.
function startingYoginiIndex(moonLon: number): number {
  const remainder = (nakshatraIndexFromLon(moonLon) + 4) % 8
  return remainder === 0 ? 7 : remainder - 1
}

// Rotate sequence to start at a given yogini index
function seqFrom(startIdx: number): typeof YOGINI_SEQUENCE {
  return [...YOGINI_SEQUENCE.slice(startIdx), ...YOGINI_SEQUENCE.slice(0, startIdx)]
}

// Yogini index for a named yogini
function yoginiIndex(yogini: string): number {
  return YOGINI_SEQUENCE.findIndex(y => y.yogini === yogini)
}

/**
 * Build the full 36-year Yogini Dasha tree (two full cycles = 72 years stored).
 * Antardasha sequence within each MD starts from that MD's yogini.
 */
export function buildYoginiTree(birthDate: Date, moonLon: number): DashaTree {
  const startIdx     = startingYoginiIndex(moonLon)
  const elapsed      = nakshatraElapsedFraction(moonLon)
  const firstYogini  = YOGINI_SEQUENCE[startIdx]
  const balanceYears = (1 - elapsed) * firstYogini.years

  const mdSeq  = seqFrom(startIdx)
  const tree: DashaTree = []
  let cursor = birthDate

  // Build two full cycles (72 years) to cover a lifetime
  for (let cycle = 0; cycle < 2; cycle++) {
    for (let i = 0; i < mdSeq.length; i++) {
      const entry  = mdSeq[i]
      const mdYears = (cycle === 0 && i === 0) ? balanceYears : entry.years
      const mdStart = cursor
      const mdEnd   = addYears(mdStart, mdYears)

      // Antardashas: start from this yogini, full 8-yogini cycle
      const adStartIdx  = yoginiIndex(entry.yogini)
      const adSeq       = seqFrom(adStartIdx)
      const antardashas: Antardasha[] = []
      let adCursor = mdStart

      for (const adEntry of adSeq) {
        const adYears = (mdYears * adEntry.years) / TOTAL_YEARS
        const adStart = adCursor
        const adEnd   = addYears(adStart, adYears)
        antardashas.push({
          planet:           adEntry.planet,
          startDate:        adStart,
          endDate:          adEnd,
          durationYears:    adYears,
          pratyantardashas: [], // Yogini uses MD + AD; PD not traditionally defined
        })
        adCursor = adEnd
      }

      tree.push({
        planet:        entry.planet,
        startDate:     mdStart,
        endDate:       mdEnd,
        durationYears: mdYears,
        antardashas,
      })
      cursor = mdEnd
    }
  }

  return tree
}

/** Returns the current Yogini MD / AD for a given date */
export function getCurrentYogini(tree: DashaTree, date: Date = new Date()): CurrentDasha | null {
  const md = tree.find(m => date >= m.startDate && date < m.endDate)
  if (!md) return null
  const ad = md.antardashas.find(a => date >= a.startDate && date < a.endDate)
  if (!ad) return null
  // No pratyantardasha in Yogini — reuse same AD as placeholder
  return {
    mahadasha:       { planet: md.planet, startDate: md.startDate, endDate: md.endDate, durationYears: md.durationYears },
    antardasha:      { planet: ad.planet, startDate: ad.startDate, endDate: ad.endDate, durationYears: ad.durationYears },
    pratyantardasha: { planet: ad.planet, startDate: ad.startDate, endDate: ad.endDate, durationYears: ad.durationYears },
  }
}

/** Compact serialization for yoginiDashaJson column */
export function serializeYoginiTree(tree: DashaTree): string {
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
    })),
  })))
}

export function deserializeYoginiTree(json: string): DashaTree {
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
      pratyantardashas: [],
    })),
  }))
}

/** Returns the yogini name for a planet */
export function yoginiForPlanet(planet: string): string {
  return YOGINI_SEQUENCE.find(y => y.planet === planet)?.yogini ?? planet
}
