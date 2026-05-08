// Swiss Ephemeris — geocentric, Lahiri sidereal, mean nodes
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sw = require('swisseph')

const FLAGS = sw.SEFLG_SWIEPH | sw.SEFLG_SIDEREAL

export const SIGN_NAMES = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

export interface PlanetPosition {
  longitude:  number
  sign:       string
  signNumber: number  // 1 = Aries … 12 = Pisces
  degrees:    number  // degree within sign (0–29)
  minutes:    number
  seconds:    number
  dms:        string  // "11°56'49\""
  formatted:  string  // "11 Capricorn 56'49\""
}

export interface ChartPositions {
  jd:          number
  ayanamsa:    number
  lagna:       PlanetPosition
  lagnaSign:   number                        // 1–12
  planets:     Record<string, PlanetPosition>
  houseNumbers: Record<string, number>       // planet → whole-sign house (1–12)
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
  }
}

const GRAHA_IDS = [
  { key: 'Sun',     id: sw.SE_SUN     },
  { key: 'Moon',    id: sw.SE_MOON    },
  { key: 'Mars',    id: sw.SE_MARS    },
  { key: 'Mercury', id: sw.SE_MERCURY },
  { key: 'Jupiter', id: sw.SE_JUPITER },
  { key: 'Venus',   id: sw.SE_VENUS   },
  { key: 'Saturn',  id: sw.SE_SATURN  },
]

export function calculateChart(params: {
  year: number; month: number; day: number
  utcHour: number; lat: number; lon: number
}): ChartPositions {
  const { year, month, day, utcHour, lat, lon } = params

  sw.swe_set_sid_mode(sw.SE_SIDM_LAHIRI, 0, 0)

  const jd       = sw.swe_julday(year, month, day, utcHour, sw.SE_GREG_CAL)
  const ayanamsa = sw.swe_get_ayanamsa_ut(jd)
  const planets: Record<string, PlanetPosition> = {}

  for (const { key, id } of GRAHA_IDS) {
    const r = sw.swe_calc_ut(jd, id, FLAGS)
    if (r.error) throw new Error(`Swiss Ephemeris error for ${key}: ${r.error}`)
    planets[key] = parseLon(r.longitude)
  }

  const rahuR = sw.swe_calc_ut(jd, sw.SE_MEAN_NODE, FLAGS)
  if (rahuR.error) throw new Error(`Swiss Ephemeris error for Rahu: ${rahuR.error}`)
  planets['Rahu'] = parseLon(rahuR.longitude)
  planets['Ketu'] = parseLon(rahuR.longitude + 180)

  const h        = sw.swe_houses_ex(jd, sw.SEFLG_SIDEREAL, lat, lon, 80)
  const lagna    = parseLon(h.ascendant)
  const lagnaSign = lagna.signNumber

  const allPlanets = [...GRAHA_IDS.map(p => p.key), 'Rahu', 'Ketu']
  const houseNumbers: Record<string, number> = {}
  for (const key of allPlanets) {
    houseNumbers[key] = ((planets[key].signNumber - lagnaSign + 12) % 12) + 1
  }

  return { jd, ayanamsa, lagna, lagnaSign, planets, houseNumbers }
}
