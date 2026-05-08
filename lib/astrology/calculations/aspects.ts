/**
 * Whole-sign aspects (Parashari).
 * All planets aspect the 7th house from themselves.
 * Mars additionally aspects 4th and 8th.
 * Jupiter additionally aspects 5th and 9th.
 * Saturn additionally aspects 3rd and 10th.
 */

const BASE_ASPECT = 7 // all planets

const SPECIAL_ASPECTS: Record<string, number[]> = {
  Mars:    [4, 8],
  Jupiter: [5, 9],
  Saturn:  [3, 10],
}

/** Houses aspected by a planet at the given house number (1-based, whole-sign) */
export function getAspectedHouses(planet: string, fromHouse: number): number[] {
  const aspects = new Set<number>()

  // Universal 7th aspect
  aspects.add(((fromHouse - 1 + 6) % 12) + 1)

  // Special aspects
  for (const offset of SPECIAL_ASPECTS[planet] ?? []) {
    aspects.add(((fromHouse - 1 + offset - 1) % 12) + 1)
  }

  return [...aspects].sort((a, b) => a - b)
}

/** Whether `planet` at `planetHouse` aspects `targetHouse` */
export function doesAspect(planet: string, planetHouse: number, targetHouse: number): boolean {
  return getAspectedHouses(planet, planetHouse).includes(targetHouse)
}

/** All planets (from the map) that aspect `targetHouse` */
export function planetsAspecting(
  targetHouse: number,
  planetHouseMap: Record<string, number>
): string[] {
  return Object.entries(planetHouseMap)
    .filter(([planet, house]) => doesAspect(planet, house, targetHouse))
    .map(([planet]) => planet)
}

/** Houses aspected by a planet given whole-sign placement — for AQL shorthand resolution */
export const ASPECT_HOUSES: Record<string, number[]> = {
  // "marsAspectHouse1" means Mars must be in one of these houses
  Mars_1:    [4, 7, 8, 10],
  Jupiter_1: [5, 7, 9],
  Saturn_1:  [3, 7, 10],
  // Generic planet → house 1 (lagna) via 7th aspect
  Sun_1:     [7], Moon_1: [7], Mercury_1: [7],
  Venus_1:   [7], Rahu_1: [7], Ketu_1: [7],
}
