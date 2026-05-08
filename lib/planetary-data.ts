import type { ChartPositions } from './astrology/calculations/positions'
import { nakshatraFromLon } from './astrology/nakshatra'
import { computeKarakas } from './astrology/calculations/karakas'
import { getPlanetDignity } from './astrology/calculations/dignity'
import { buildDashaTree, serializeDashaTree } from './astrology/dasha/vimshottari'
import { buildYoginiTree, serializeYoginiTree } from './astrology/dasha/yogini'

const PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'] as const
const DIGNITY_PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const

/**
 * Converts a ChartPositions object (from ephemeris) into flat PlanetaryData
 * fields for Prisma. Now also includes dignity per planet and dashaJson.
 */
export function flattenToPlanetaryData(
  chartId: string,
  calc: ChartPositions,
  birthDate?: Date
): Record<string, unknown> {
  const { atmakaraka, darakaraka } = computeKarakas(calc.planets)

  const flat: Record<string, unknown> = {
    chartId,
    ascSign:      calc.lagna.sign,
    ascDegree:    calc.lagna.degrees + calc.lagna.minutes / 60,
    ascNakshatra: nakshatraFromLon(calc.lagna.longitude),
    atmakaraka,
    darakaraka,
    rawJson: JSON.stringify(calc),
  }

  for (const p of PLANETS) {
    const pos = calc.planets[p]
    if (!pos) continue
    const key = p.toLowerCase()
    flat[`${key}Sign`]      = pos.sign
    flat[`${key}House`]     = calc.houseNumbers[p] ?? 0
    flat[`${key}Degree`]    = pos.degrees + pos.minutes / 60
    flat[`${key}Nakshatra`] = nakshatraFromLon(pos.longitude)
  }

  for (const p of DIGNITY_PLANETS) {
    const pos = calc.planets[p]
    if (!pos) continue
    flat[`${p.toLowerCase()}Dignity`] = getPlanetDignity(p, pos.sign)
  }

  if (birthDate) {
    const moonLon = calc.planets['Moon']?.longitude ?? 0
    const tree    = buildDashaTree(birthDate, moonLon)
    flat['dashaJson'] = serializeDashaTree(tree)
    const yoginiTree = buildYoginiTree(birthDate, moonLon)
    flat['yoginiDashaJson'] = serializeYoginiTree(yoginiTree)
  }

  return flat
}
