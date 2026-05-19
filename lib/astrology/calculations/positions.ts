// Swiss Ephemeris — geocentric, Lahiri sidereal, true nodes
// require() is inside calculateChart (not module scope) so Next.js static
// analysis never freezes sw=null at import time.

export const SIGN_NAMES = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

export interface PlanetPosition {
  longitude:  number
  sign:       string
  signNumber: number
  degrees:    number
  minutes:    number
  seconds:    number
  dms:        string
  formatted:  string
  speed:      number   // degrees/day; negative = retrograde
}

export interface ChartPositions {
  jd:           number
  ayanamsa:     number
  lagna:        PlanetPosition
  lagnaSign:    number
  planets:      Record<string, PlanetPosition>
  houseNumbers: Record<string, number>
  porphyryCusps: number[]  // 12 sidereal cusp longitudes for Sripati Bhav Chalit (house 1–12)
}

function parseLon(lon: number): PlanetPosition {
  const l = ((lon % 360) + 360) % 360
  const signIdx = Math.floor(l / 30)
  const inSign  = l % 30
  const deg     = Math.floor(inSign)
  const minF    = (inSign - deg) * 60
  const min     = Math.floor(minF)
  let   sec     = Math.round((minF - min) * 60)
  if (sec === 60) sec = 59
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    longitude:  l,
    sign:       SIGN_NAMES[signIdx],
    signNumber: signIdx + 1,
    degrees:    deg,
    minutes:    min,
    seconds:    sec,
    dms:        `${deg}°${pad(min)}'${pad(sec)}"`,
    formatted:  `${deg} ${SIGN_NAMES[signIdx]} ${pad(min)}'${pad(sec)}"`,
    speed:      0,
  }
}

export function calculateChart(params: {
  year: number; month: number; day: number
  utcHour: number; lat: number; lon: number
}): ChartPositions {
  // Direct require at call time — same pattern as /api/debug route (which works).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sw = require('swisseph')

  const FLAGS = sw.SEFLG_SWIEPH | sw.SEFLG_SIDEREAL | sw.SEFLG_SPEED

  const { year, month, day, utcHour, lat, lon } = params

  sw.swe_set_sid_mode(sw.SE_SIDM_LAHIRI, 0, 0)

  const jd       = sw.swe_julday(year, month, day, utcHour, sw.SE_GREG_CAL)
  const ayanamsa = sw.swe_get_ayanamsa_ut(jd)
  const planets: Record<string, PlanetPosition> = {}

  const GRAHA_IDS = [
    { key: 'Sun',     id: sw.SE_SUN     },
    { key: 'Moon',    id: sw.SE_MOON    },
    { key: 'Mars',    id: sw.SE_MARS    },
    { key: 'Mercury', id: sw.SE_MERCURY },
    { key: 'Jupiter', id: sw.SE_JUPITER },
    { key: 'Venus',   id: sw.SE_VENUS   },
    { key: 'Saturn',  id: sw.SE_SATURN  },
  ]

  for (const { key, id } of GRAHA_IDS) {
    const r = sw.swe_calc_ut(jd, id, FLAGS)
    if (r.error) throw new Error(`Swiss Ephemeris error for ${key}: ${r.error}`)
    planets[key] = { ...parseLon(r.longitude), speed: r.longitudeSpeed ?? 0 }
  }

  // True node (oscillating node) — more astronomically precise than mean node
  const rahuR = sw.swe_calc_ut(jd, sw.SE_TRUE_NODE, FLAGS)
  if (rahuR.error) throw new Error(`Swiss Ephemeris error for Rahu: ${rahuR.error}`)
  planets['Rahu'] = { ...parseLon(rahuR.longitude),       speed: rahuR.longitudeSpeed ?? 0 }
  planets['Ketu'] = { ...parseLon(rahuR.longitude + 180), speed: -(rahuR.longitudeSpeed ?? 0) }

  // Sidereal ascendant via SE_SIDM_LAHIRI (SwissEph 2.09, IAU 2006 precession).
  // SE_SIDM_LAHIRI places Spica at 0° Libra using a mean (polynomial) formula.
  // Some traditional Indian/Nepali almanac software uses a slightly different
  // Lahiri definition (~20' lower ayanamsa) which will give a ~20' higher ascendant.
  const h     = sw.swe_houses_ex(jd, sw.SEFLG_SWIEPH | sw.SEFLG_SIDEREAL, lat, lon, 80)
  const lagna = parseLon(h.ascendant)
  const lagnaSign = lagna.signNumber

  const houseNumbers: Record<string, number> = {}
  for (const key of [...GRAHA_IDS.map(p => p.key), 'Rahu', 'Ketu']) {
    houseNumbers[key] = ((planets[key].signNumber - lagnaSign + 12) % 12) + 1
  }

  // Porphyry cusps (Sripati Paddhati) — each cusp is the Bhav Madhya (midpoint of house).
  // ASCII 79 = 'O' selects Porphyrius in Swiss Ephemeris.
  const hP          = sw.swe_houses_ex(jd, sw.SEFLG_SWIEPH | sw.SEFLG_SIDEREAL, lat, lon, 79)
  const porphyryCusps: number[] = Array.from({ length: 12 }, (_, i) => hP.house[i + 1] as number)

  return { jd, ayanamsa, lagna, lagnaSign, planets, houseNumbers, porphyryCusps }
}
