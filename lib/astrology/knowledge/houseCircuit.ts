// House-circuit analysis for dasha-driven events, following the research SOP:
//
//   1. For each dasha-level planet (MD/AD/PD), find which houses it ACTIVATES
//      via posited house, aspect (drishti), or lordship.
//   2. A house's "circuit" is COMPLETE when the house itself is activated by
//      a dasha-level planet AND that house's own lord is also tied into the
//      dasha network (the lord IS a dasha planet, sits with one, aspects one,
//      or is aspected by one).
//   3. Run this for the houses that matter for foreign movement (3rd, 7th,
//      9th, 12th) and for purpose-of-visit houses (5th study, 6th/10th work,
//      7th travel), at both the D1 layer and the D9-superimposed-onto-D1 layer.
import { housesAspectedBy } from '@/lib/astrology/aspects'
import { SIGN_RULER, ruledHouses, type ActiveDashaPlanets } from './foreignDasha'

export type DashaLevel = 'MD' | 'AD' | 'PD'
export interface DashaLevelPlanet { level: DashaLevel; planet: string }

export function dashaLevels(active: ActiveDashaPlanets): DashaLevelPlanet[] {
  return [
    { level: 'MD', planet: active.mahadasha },
    { level: 'AD', planet: active.antardasha },
    { level: 'PD', planet: active.pratyantardasha },
  ]
}

export interface PlanetActivation {
  planet: string
  occupiedHouse?: number
  aspectedHouses: number[]
  ruledHouses: number[]
}

/** Houses a single planet activates: where it sits, what it aspects, what it rules. */
export function planetActivation(planet: string, houses: Record<string, number>, lagnaSign: number): PlanetActivation {
  const occupiedHouse = houses[planet]
  const aspectedHouses = occupiedHouse !== undefined ? housesAspectedBy(planet, occupiedHouse) : []
  return { planet, occupiedHouse, aspectedHouses, ruledHouses: ruledHouses(planet, lagnaSign) }
}

export function lordOfHouse(house: number, lagnaSign: number): string {
  const signNum = ((lagnaSign - 1 + house - 1) % 12) + 1
  return SIGN_RULER[signNum]
}

export interface HouseCircuit {
  house: number
  lord: string
  houseActivated: boolean
  houseActivatedBy: { level: DashaLevel; planet: string; via: 'occupied' | 'aspect' | 'lordship' }[]
  lordConnected: boolean
  lordConnectedBy: { level: DashaLevel; planet: string; via: 'is-lord' | 'conjunct' | 'aspects-lord' | 'lord-aspects-back' }[]
  complete: boolean
}

/** Evaluates whether `house`'s circuit is completed by the active MD/AD/PD planets (in one chart layer). */
export function houseCircuit(
  house: number,
  levels: DashaLevelPlanet[],
  houses: Record<string, number>,
  lagnaSign: number,
): HouseCircuit {
  const lord = lordOfHouse(house, lagnaSign)
  const houseActivatedBy: HouseCircuit['houseActivatedBy'] = []
  const lordConnectedBy: HouseCircuit['lordConnectedBy'] = []

  for (const { level, planet } of levels) {
    const act = planetActivation(planet, houses, lagnaSign)

    if (act.occupiedHouse === house) houseActivatedBy.push({ level, planet, via: 'occupied' })
    if (act.aspectedHouses.includes(house)) houseActivatedBy.push({ level, planet, via: 'aspect' })
    if (act.ruledHouses.includes(house)) houseActivatedBy.push({ level, planet, via: 'lordship' })

    if (planet.toLowerCase() === lord.toLowerCase()) {
      lordConnectedBy.push({ level, planet, via: 'is-lord' })
      continue
    }
    const lordHouse = houses[lord]
    if (lordHouse === undefined) continue
    if (lordHouse === act.occupiedHouse) lordConnectedBy.push({ level, planet, via: 'conjunct' })
    if (act.aspectedHouses.includes(lordHouse)) lordConnectedBy.push({ level, planet, via: 'aspects-lord' })
    if (act.occupiedHouse !== undefined && housesAspectedBy(lord, lordHouse).includes(act.occupiedHouse)) {
      lordConnectedBy.push({ level, planet, via: 'lord-aspects-back' })
    }
  }

  return {
    house, lord,
    houseActivated: houseActivatedBy.length > 0,
    houseActivatedBy,
    lordConnected: lordConnectedBy.length > 0,
    lordConnectedBy,
    complete: houseActivatedBy.length > 0 && lordConnectedBy.length > 0,
  }
}

// Houses relevant to foreign-movement detection (3rd short journeys, 7th
// travel/partnership abroad, 9th long journeys/foreign land, 12th foreign
// residence/loss of native land) plus purpose-of-visit houses (5th study,
// 6th/10th work). 7th and 10th serve double duty.
export const MOVEMENT_HOUSES = [3, 7, 9, 12] as const
export const PURPOSE_HOUSES = [5, 6, 7, 10] as const
export const CIRCUIT_HOUSES = [3, 5, 6, 7, 9, 10, 12] as const

export function buildCircuits(
  active: ActiveDashaPlanets,
  houses: Record<string, number>,
  lagnaSign: number,
): Record<number, HouseCircuit> {
  const levels = dashaLevels(active)
  const out: Record<number, HouseCircuit> = {}
  for (const h of CIRCUIT_HOUSES) out[h] = houseCircuit(h, levels, houses, lagnaSign)
  return out
}

export type PurposeCategory = 'travel' | 'study' | 'work' | 'mixed' | 'unclear'
export interface PurposeClassification { category: PurposeCategory; houses: number[] }

/** 7th → travel/vacation, 5th → study, 6th/10th → work. Based on which circuits are COMPLETE. */
export function classifyPurpose(circuits: Record<number, HouseCircuit>): PurposeClassification {
  const study = circuits[5]?.complete
  const work = circuits[6]?.complete || circuits[10]?.complete
  const travel = circuits[7]?.complete

  const flags = [study, work, travel].filter(Boolean).length
  if (flags === 0) return { category: 'unclear', houses: [] }
  if (flags > 1) {
    const houses = [study && 5, (circuits[6]?.complete && 6), (circuits[10]?.complete && 10), travel && 7].filter((h): h is number => !!h)
    return { category: 'mixed', houses }
  }
  if (study) return { category: 'study', houses: [5] }
  if (travel) return { category: 'travel', houses: [7] }
  return { category: 'work', houses: [circuits[6]?.complete ? 6 : 10] }
}
