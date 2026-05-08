/** Adds a virtual `planets` field (house-number map) derived from calculatedPositions.
 *  Keeps pages that read chart.planets working without a redundant DB column. */
export function withPlanets<T extends { calculatedPositions?: string }>(chart: T): T & { planets: string } {
  let planets = '{}'
  try {
    const calc = JSON.parse(chart.calculatedPositions || '{}')
    if (calc.houseNumbers) planets = JSON.stringify(calc.houseNumbers)
  } catch {}
  return { ...chart, planets }
}

export function withPlanetsMany<T extends { calculatedPositions?: string }>(charts: T[]): (T & { planets: string })[] {
  return charts.map(withPlanets)
}
