export const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
]

export const NAKSHATRA_LORDS = [
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
  'Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury',
]

const NAKSHATRA_SPAN = 360 / 27 // 13.3333...°

/** Returns nakshatra name for a sidereal longitude (0–360) */
export function nakshatraFromLon(lon: number): string {
  const l = ((lon % 360) + 360) % 360
  return NAKSHATRA_NAMES[Math.floor(l / NAKSHATRA_SPAN)]
}

/** Returns nakshatra index (0–26) for a sidereal longitude */
export function nakshatraIndexFromLon(lon: number): number {
  const l = ((lon % 360) + 360) % 360
  return Math.floor(l / NAKSHATRA_SPAN)
}

/** Returns nakshatra lord (dasha ruler) for a sidereal longitude */
export function nakshatraLordFromLon(lon: number): string {
  return NAKSHATRA_LORDS[nakshatraIndexFromLon(lon)]
}

/** Fraction traversed within the current nakshatra (0 = just entered, 1 = at boundary) */
export function nakshatraElapsedFraction(lon: number): number {
  const l = ((lon % 360) + 360) % 360
  return (l % NAKSHATRA_SPAN) / NAKSHATRA_SPAN
}
