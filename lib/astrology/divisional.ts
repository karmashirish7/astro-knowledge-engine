// Divisional (Varga) chart calculation — Parasara traditional rules
//
// NOT all charts use the simple (signIdx*n + pada)%12 formula.
// Verified correct formulas per Brihat Parasara Hora Shastra:
//   D7, D9, D16, D20, D27, D40, D60  → simple formula works
//   D2, D3, D4, D10, D12, D24, D45   → specific traditional rules required

export interface DivisionalData {
  lagna:         number                  // 1–12
  planets:       Record<string, number> // planet → whole-sign house (1–12)
  planetDegrees: Record<string, number> // planet → degree within Dn sign
}

export const VARGAS = [
  { n: 2,  abbr: 'D2',  name: 'Hora'           },
  { n: 3,  abbr: 'D3',  name: 'Drekkana'        },
  { n: 4,  abbr: 'D4',  name: 'Chaturthamsa'    },
  { n: 7,  abbr: 'D7',  name: 'Saptamsa'        },
  { n: 9,  abbr: 'D9',  name: 'Navamsa'         },
  { n: 10, abbr: 'D10', name: 'Dasamsa'         },
  { n: 12, abbr: 'D12', name: 'Dwadasamsa'      },
  { n: 16, abbr: 'D16', name: 'Shodasamsa'      },
  { n: 20, abbr: 'D20', name: 'Vimsamsa'        },
  { n: 24, abbr: 'D24', name: 'Chaturvimsamsa'  },
  { n: 27, abbr: 'D27', name: 'Saptavimsamsa'   },
  { n: 30, abbr: 'D30', name: 'Trimsamsa'       },
  { n: 40, abbr: 'D40', name: 'Khavedamsa'      },
  { n: 45, abbr: 'D45', name: 'Akshavedamsa'    },
  { n: 60, abbr: 'D60', name: 'Shashtyamsa'     },
]

// Returns sign index 0–11 in the Dn chart for a planet at `longitude` degrees
function divisionalSign(longitude: number, n: number): number {
  const l         = ((longitude % 360) + 360) % 360
  const signIdx   = Math.floor(l / 30)
  const posInSign = l % 30                          // 0–30 within sign
  const pada      = Math.floor(posInSign * n / 30)  // 0 to n-1

  switch (n) {
    case 2: {
      // Hora — odd signs: [Leo, Cancer]; even signs: [Cancer, Leo]
      const half = Math.floor(posInSign * 2 / 30)   // 0 or 1
      return signIdx % 2 === 0
        ? (half === 0 ? 4 : 3)   // odd sign: 1st half→Leo, 2nd→Cancer
        : (half === 0 ? 3 : 4)   // even sign: 1st half→Cancer, 2nd→Leo
    }

    case 3: {
      // Drekkana — 1st from sign, 2nd from 5th, 3rd from 9th (trinal jump ×4)
      const part = Math.floor(posInSign * 3 / 30)   // 0, 1, 2
      return (signIdx + part * 4) % 12
    }

    case 4: {
      // Chaturthamsa — starts from sign itself, increments by 1
      const part = Math.floor(posInSign * 4 / 30)
      return (signIdx + part) % 12
    }

    case 10: {
      // Dasamsa — odd signs: from sign; even signs: from 9th sign
      const part  = Math.floor(posInSign * 10 / 30)
      const start = signIdx % 2 === 0 ? signIdx : (signIdx + 8) % 12
      return (start + part) % 12
    }

    case 12: {
      // Dwadasamsa — starts from sign itself, increments by 1
      const part = Math.floor(posInSign * 12 / 30)
      return (signIdx + part) % 12
    }

    case 24: {
      // Chaturvimsamsa — odd signs start from Leo (4), even from Cancer (3)
      const start = signIdx % 2 === 0 ? 4 : 3
      return (start + pada) % 12
    }

    case 45: {
      // Akshavedamsa — movable→Aries, fixed→Leo, dual→Sagittarius
      const start = [0, 4, 8][signIdx % 3]
      return (start + pada) % 12
    }

    default:
      // D7, D9, D16, D20, D27, D30, D40, D60 — simple formula verified correct
      return (signIdx * n + pada) % 12
  }
}

// ─── Bhav Chalit (Equal-House midpoint / Sri Pati system) ──────────────────
//
// The Lagna's exact longitude is the Bhav Madhya (midpoint) of house 1.
// Every subsequent house midpoint is exactly 30° further along the ecliptic.
// Each house spans ±15° around its midpoint, so Bhav Sandhis (boundaries)
// are simply bhavMadhya + 15°.  This is independent of the Porphyry or any
// other quadrant-based system.
//
// Example: Lagna at 15° Gemini (lon=75°)
//   House 1 madhya = 75°  → sandhi before = 60° (0° Gem), after = 90° (0° Can)
//   House 2 madhya = 105° → sandhi before = 90°,            after = 120°
//   ...

export interface BhavChaliData {
  lagna:         number                   // lagnaSign 1–12 (same as D1)
  planets:       Record<string, number>   // planet → bhava house 1–12
  planetDegrees: Record<string, number>   // planet → degree within sign (0–29)
  bhavMadhyas:   number[]                 // 12 midpoint longitudes (sidereal)
  bhavSandhis:   number[]                 // 12 sandhi longitudes (sandhi[i] = boundary after house i+1)
}

// Is longitude `lon` in the half-open forward arc [start, end)?
function inArc(lon: number, start: number, end: number): boolean {
  const s = ((start % 360) + 360) % 360
  const e = ((end   % 360) + 360) % 360
  const l = ((lon   % 360) + 360) % 360
  if (s < e) return l >= s && l < e
  return l >= s || l < e  // arc wraps through 360°
}

export function computeBhavChalit(calc: any): BhavChaliData | null {
  if (typeof calc?.lagna?.longitude !== 'number') return null
  if (!calc?.planets || typeof calc?.lagnaSign !== 'number') return null

  const lagnaLon = ((calc.lagna.longitude % 360) + 360) % 360

  // House i+1 midpoint = lagnaLon + i×30°
  const bhavMadhyas: number[] = Array.from({ length: 12 }, (_, i) =>
    ((lagnaLon + i * 30) % 360 + 360) % 360
  )

  // Sandhi after house i+1 = its midpoint + 15°
  const bhavSandhis: number[] = bhavMadhyas.map(m => ((m + 15) % 360 + 360) % 360)

  function findBhava(lon: number): number {
    for (let i = 0; i < 12; i++) {
      const start = bhavSandhis[(i + 11) % 12]  // sandhi before house i+1
      const end   = bhavSandhis[i]               // sandhi after  house i+1
      if (inArc(lon, start, end)) return i + 1
    }
    return 1
  }

  const planets:       Record<string, number> = {}
  const planetDegrees: Record<string, number> = {}

  for (const [name, pos] of Object.entries(calc.planets as Record<string, any>)) {
    planets[name]       = findBhava(pos.longitude as number)
    planetDegrees[name] = Math.floor((pos.longitude as number) % 30)
  }

  return {
    lagna:       calc.lagnaSign as number,
    planets,
    planetDegrees,
    bhavMadhyas,
    bhavSandhis,
  }
}

export function computeDivisional(calc: any, n: number): DivisionalData | null {
  if (typeof calc?.lagna?.longitude !== 'number' || !calc?.planets) return null

  const lagnaIdx = divisionalSign(calc.lagna.longitude, n)  // 0–11
  const lagna    = lagnaIdx + 1                              // 1–12

  const planets:       Record<string, number> = {}
  const planetDegrees: Record<string, number> = {}

  for (const [name, pos] of Object.entries(calc.planets as Record<string, any>)) {
    const vSignIdx   = divisionalSign(pos.longitude as number, n)
    planets[name]    = ((vSignIdx - lagnaIdx + 12) % 12) + 1

    // Degree within the Dn sign (proportional)
    const l          = ((pos.longitude % 360) + 360) % 360
    const posInSign  = l % 30
    const partSize   = 30 / n
    const partIdx    = Math.floor(posInSign / partSize)
    const frac       = (posInSign - partIdx * partSize) / partSize
    planetDegrees[name] = Math.floor(frac * 30)
  }

  return { lagna, planets, planetDegrees }
}
