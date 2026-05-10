// Swiss Ephemeris calculation — geocentric, Lahiri sidereal, mean nodes
// eslint-disable-next-line @typescript-eslint/no-require-imports
let sw: any = null
try { sw = require('swisseph') } catch { /* swisseph unavailable */ }

const FLAGS = sw ? (sw.SEFLG_SWIEPH | sw.SEFLG_SIDEREAL) : 0

export const SIGN_NAMES = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

export interface PlanetPosition {
  longitude: number
  sign: string
  signNumber: number  // 1 = Aries, 12 = Pisces
  degrees: number
  minutes: number
  seconds: number
  dms: string         // e.g. 11°56'49"
  formatted: string   // e.g. "11 Capricorn 56'49\""
}

export interface ChartPositions {
  jd: number
  ayanamsa: number
  lagna: PlanetPosition
  lagnaSign: number                       // 1-12
  planets: Record<string, PlanetPosition> // Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu
  houseNumbers: Record<string, number>    // planet → whole-sign house (1-12)
}

function parseLon(lon: number): PlanetPosition {
  // Normalize to [0, 360)
  const l = ((lon % 360) + 360) % 360
  const signIdx = Math.floor(l / 30)
  const inSign = l % 30
  const deg = Math.floor(inSign)
  const minF = (inSign - deg) * 60
  const min = Math.floor(minF)
  let sec = Math.round((minF - min) * 60)
  // Handle rounding overflow
  if (sec === 60) { sec = 59 }
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    longitude: l,
    sign: SIGN_NAMES[signIdx],
    signNumber: signIdx + 1,
    degrees: deg,
    minutes: min,
    seconds: sec,
    dms: `${deg}°${pad(min)}'${pad(sec)}"`,
    formatted: `${deg} ${SIGN_NAMES[signIdx]} ${pad(min)}'${pad(sec)}"`,
  }
}

const GRAHA_IDS: { key: string; id: number }[] = sw ? [
  { key: 'Sun',     id: sw.SE_SUN },
  { key: 'Moon',    id: sw.SE_MOON },
  { key: 'Mars',    id: sw.SE_MARS },
  { key: 'Mercury', id: sw.SE_MERCURY },
  { key: 'Jupiter', id: sw.SE_JUPITER },
  { key: 'Venus',   id: sw.SE_VENUS },
  { key: 'Saturn',  id: sw.SE_SATURN },
] : []

export function calculateChart(params: {
  year: number
  month: number
  day: number
  utcHour: number   // decimal hours in UTC (e.g. 11.97917 for 11:58:45)
  lat: number       // geographic latitude (N positive)
  lon: number       // geographic longitude (E positive)
}): ChartPositions {
  if (!sw) throw new Error('swisseph native addon is not available in this environment')

  const { year, month, day, utcHour, lat, lon } = params

  sw.swe_set_sid_mode(sw.SE_SIDM_LAHIRI, 0, 0)

  const jd = sw.swe_julday(year, month, day, utcHour, sw.SE_GREG_CAL)
  const ayanamsa = sw.swe_get_ayanamsa_ut(jd)

  const planets: Record<string, PlanetPosition> = {}

  for (const { key, id } of GRAHA_IDS) {
    const r = sw.swe_calc_ut(jd, id, FLAGS)
    if (r.error) throw new Error(`Swiss Ephemeris error for ${key}: ${r.error}`)
    planets[key] = parseLon(r.longitude)
  }

  // Rahu = mean node; Ketu = opposite
  const rahuR = sw.swe_calc_ut(jd, sw.SE_MEAN_NODE, FLAGS)
  if (rahuR.error) throw new Error(`Swiss Ephemeris error for Rahu: ${rahuR.error}`)
  planets['Rahu'] = parseLon(rahuR.longitude)
  planets['Ketu'] = parseLon(rahuR.longitude + 180)

  // Sidereal Lagna (Placidus gives same ascendant as any system)
  const h = sw.swe_houses_ex(jd, sw.SEFLG_SIDEREAL, lat, lon, 80) // 80 = ASCII 'P'
  const lagna = parseLon(h.ascendant)
  const lagnaSign = lagna.signNumber

  // Whole Sign house numbers
  const allPlanets = [...GRAHA_IDS.map(p => p.key), 'Rahu', 'Ketu']
  const houseNumbers: Record<string, number> = {}
  for (const key of allPlanets) {
    houseNumbers[key] = ((planets[key].signNumber - lagnaSign + 12) % 12) + 1
  }

  return { jd, ayanamsa, lagna, lagnaSign, planets, houseNumbers }
}

// ── Nakshatra ─────────────────────────────────────────────────────────────

export const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
]

/** Returns nakshatra name for a sidereal longitude (0–360) */
export function nakshatraFromLon(lon: number): string {
  const l = ((lon % 360) + 360) % 360
  return NAKSHATRA_NAMES[Math.floor(l / (360 / 27))]
}

// ── Karakas (Parashari) ───────────────────────────────────────────────────

const KARAKA_PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const

/**
 * Atmakaraka = planet with highest degree within its sign (7 classical grahas).
 * Darakaraka = planet with lowest degree within its sign.
 * Rahu is excluded from classical Parashari karakas.
 */
export function computeKarakas(planets: Record<string, PlanetPosition>): {
  atmakaraka: string
  darakaraka: string
} {
  const graded = KARAKA_PLANETS.map(key => ({
    key,
    deg: planets[key]?.degrees ?? 0,
  }))
  graded.sort((a, b) => b.deg - a.deg)
  return {
    atmakaraka: graded[0]?.key ?? '',
    darakaraka: graded[graded.length - 1]?.key ?? '',
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** Parse timezone string like "+05:45" or "-05:30" into decimal hours */
export function parseTimezone(tz: string): number {
  const m = tz.match(/^([+-])(\d{1,2}):(\d{2})$/)
  if (!m) return 0
  const sign = m[1] === '+' ? 1 : -1
  return sign * (parseInt(m[2]) + parseInt(m[3]) / 60)
}

/** Convert local time string "HH:MM:SS" + timezone offset → UTC decimal hour
 *  Returns { utcHour, dayOffset } where dayOffset is -1, 0, or +1 */
export function localToUTC(timeStr: string, tzOffset: number): { utcHour: number; dayOffset: number } {
  const parts = timeStr.split(':').map(Number)
  const localHour = parts[0] + (parts[1] || 0) / 60 + (parts[2] || 0) / 3600
  let utcHour = localHour - tzOffset
  let dayOffset = 0
  if (utcHour < 0)  { utcHour += 24; dayOffset = -1 }
  if (utcHour >= 24) { utcHour -= 24; dayOffset = 1 }
  return { utcHour, dayOffset }
}
