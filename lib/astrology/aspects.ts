// Whole-sign planetary aspects (drishti) — shared by chart reading, divisional
// analysis, and the Dasha Lab house-circuit engine.
export const PLANET_ASPECTS: Record<string, number[]> = {
  Sun: [7], Moon: [7], Mars: [4, 7, 8], Mercury: [7],
  Jupiter: [5, 7, 9], Venus: [7], Saturn: [3, 7, 10], Rahu: [5, 7, 9], Ketu: [5, 7, 9],
}

/** Houses that `planet`, sitting in `fromHouse`, casts an aspect onto. */
export function housesAspectedBy(planet: string, fromHouse: number): number[] {
  const offsets = PLANET_ASPECTS[planet] ?? [7]
  return offsets.map(off => ((fromHouse - 1 + off - 1) % 12) + 1)
}

/** Which planets (from a house-map) aspect `targetHouse`. */
export function planetsAspecting(targetHouse: number, houses: Record<string, number>): string[] {
  return Object.entries(houses)
    .filter(([planet, from]) => housesAspectedBy(planet, from).includes(targetHouse))
    .map(([planet]) => planet)
}
