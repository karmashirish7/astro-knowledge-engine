import type { PlanetPosition } from './positions'

const KARAKA_PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const

/**
 * Parashari Jaimini karakas based on degree within sign.
 * Atmakaraka = highest degree, Darakaraka = lowest degree (7 classical planets only).
 * Rahu/Ketu excluded.
 */
export function computeKarakas(planets: Record<string, PlanetPosition>): {
  atmakaraka: string
  darakaraka: string
} {
  const graded = KARAKA_PLANETS
    .filter(k => planets[k])
    .map(key => ({ key, deg: planets[key].degrees + planets[key].minutes / 60 }))
    .sort((a, b) => b.deg - a.deg)

  return {
    atmakaraka: graded[0]?.key ?? '',
    darakaraka:  graded[graded.length - 1]?.key ?? '',
  }
}
