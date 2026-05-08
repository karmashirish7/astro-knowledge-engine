/**
 * Maps conditionsJson keys → Prisma PlanetaryData where-clause fragments.
 * Handles both direct column names and semantic shorthands.
 */

const PLANETS = ['sun','moon','mars','mercury','jupiter','venus','saturn','rahu','ketu'] as const

// House groups
const KENDRA   = [1, 4, 7, 10]
const TRIKONA  = [1, 5, 9]
const DUSTHANA = [6, 8, 12]
const UPACHAYA = [3, 6, 10, 11]

// Dignity maps
const EXALTATION:   Record<string, string> = {
  Sun:'Aries', Moon:'Taurus', Mars:'Capricorn', Mercury:'Virgo',
  Jupiter:'Cancer', Venus:'Pisces', Saturn:'Libra',
}
const DEBILITATION: Record<string, string> = {
  Sun:'Libra', Moon:'Scorpio', Mars:'Cancer', Mercury:'Pisces',
  Jupiter:'Capricorn', Venus:'Virgo', Saturn:'Aries',
}

// Whole-sign houses Mars aspects from, to reach house 1 (lagna)
// "mars aspects lagna" means Mars is in H4, H7, H8, or H10
const ASPECT_TO_LAGNA: Record<string, number[]> = {
  Mars:    [4, 7, 8, 10],
  Jupiter: [5, 7, 9],
  Saturn:  [3, 7, 10],
  Sun:     [7], Moon: [7], Mercury: [7],
  Venus:   [7], Rahu: [7], Ketu:   [7],
}

/** Resolve a single conditionsJson key+value → Prisma fragment or null */
export function resolveField(key: string, value: unknown): Record<string, unknown> | null {
  // ── Direct planet columns ──────────────────────────────────────────────────
  // e.g. saturnHouse: 7 | sunSign: "Leo" | moonNakshatra: "Rohini"
  for (const p of PLANETS) {
    if (key === `${p}House`)      return { [`${p}House`]: value }
    if (key === `${p}Sign`)       return { [`${p}Sign`]: value }
    if (key === `${p}Nakshatra`)  return { [`${p}Nakshatra`]: value }
    if (key === `${p}Degree`)     return { [`${p}Degree`]: value }
    if (key === `${p}Dignity`)    return { [`${p}Dignity`]: value }
  }

  // ── Lagna / ascendant columns ─────────────────────────────────────────────
  if (key === 'ascSign')      return { ascSign: value }
  if (key === 'ascNakshatra') return { ascNakshatra: value }
  if (key === 'ascDegree')    return { ascDegree: value }
  if (key === 'atmakaraka')   return { atmakaraka: value }
  if (key === 'darakaraka')   return { darakaraka: value }

  // Aliases
  if (key === 'lagnaNakshatra') return { ascNakshatra: value }
  if (key === 'lagnaSign')      return { ascSign: value }
  if (key === 'lagnaDegree')    return { ascDegree: value }

  // ── House group shorthands ────────────────────────────────────────────────
  // e.g. marsInKendra: true | sunInDusthana: true
  for (const raw of PLANETS) {
    const p = raw.charAt(0).toUpperCase() + raw.slice(1)
    if (key === `${raw}InKendra`   && value === true) return { [`${raw}House`]: { in: KENDRA } }
    if (key === `${raw}InTrikona`  && value === true) return { [`${raw}House`]: { in: TRIKONA } }
    if (key === `${raw}InDusthana` && value === true) return { [`${raw}House`]: { in: DUSTHANA } }
    if (key === `${raw}InUpachaya` && value === true) return { [`${raw}House`]: { in: UPACHAYA } }

    // e.g. saturnExalted: true
    if (key === `${raw}Exalted`    && value === true && EXALTATION[p])   return { [`${raw}Sign`]: EXALTATION[p] }
    if (key === `${raw}Debilitated`&& value === true && DEBILITATION[p]) return { [`${raw}Sign`]: DEBILITATION[p] }

    // e.g. marsAspectLagna: true
    if (key === `${raw}AspectsLagna` && value === true && ASPECT_TO_LAGNA[p]) {
      return { [`${raw}House`]: { in: ASPECT_TO_LAGNA[p] } }
    }
  }

  // ── Degree range ──────────────────────────────────────────────────────────
  // e.g. lagnaDegreeMin: 0, lagnaDegreeMax: 13.33
  if (key === 'lagnaDegreeMin') return { ascDegree: { gte: value } }
  if (key === 'lagnaDegreeMax') return { ascDegree: { lte: value } }

  return null
}

/** Merge two Prisma where objects — combines numeric range fragments */
export function mergeFragments(
  acc: Record<string, unknown>,
  fragment: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...acc }
  for (const [k, v] of Object.entries(fragment)) {
    if (result[k] && typeof result[k] === 'object' && typeof v === 'object' && v !== null) {
      result[k] = { ...(result[k] as object), ...(v as object) }
    } else {
      result[k] = v
    }
  }
  return result
}
