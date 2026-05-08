'use client'

import { useState } from 'react'

const PLANET_COLORS: Record<string, string> = {
  Sun:     '#F59E0B', Moon:    '#E2E8F0', Mars:    '#EF4444',
  Mercury: '#10B981', Jupiter: '#F97316', Venus:   '#EC4899',
  Saturn:  '#6366F1', Rahu:    '#8B5CF6', Ketu:    '#78716C',
}

const PLANET_ABBR: Record<string, string> = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me',
  Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
}

interface Props {
  lagna:             number
  planets:           Record<string, number>       // planet → house number
  planetDegrees?:    Record<string, number>        // planet → degree within sign (0–29)
  onHouseClick?:     (house: number) => void
  highlightAspects?: boolean
}

export default function NorthIndianKundali({ lagna, planets, planetDegrees = {}, onHouseClick }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  // --- geometry (S=400) ---
  // Outer square:    TL(0,0)   TR(400,0)  BR(400,400) BL(0,400)
  // Side midpoints:  T(200,0)  R(400,200) B(200,400)  L(0,200)
  // Center:          C(200,200)
  // P1(100,100)  P2(300,100)  P3(300,300)  P4(100,300)
  //   = where full diagonals intersect the inner diamond edges

  const POLYGONS: Record<number, string> = {
    1:  '200,0   300,100  200,200  100,100',   // top inner
    2:  '0,0     200,0    100,100',             // top-left
    3:  '0,0     100,100  0,200',               // left-upper
    4:  '100,100 0,200    100,300  200,200',    // left inner
    5:  '0,400   0,200    100,300',             // left-lower
    6:  '0,400   100,300  200,400',             // bottom-left
    7:  '200,200 100,300  200,400  300,300',    // bottom inner
    8:  '400,400 200,400  300,300',             // bottom-right
    9:  '400,400 300,300  400,200',             // right-lower
    10: '300,100 400,200  300,300  200,200',    // right inner
    11: '400,0   400,200  300,100',             // right-upper
    12: '400,0   300,100  200,0',               // top-right
  }

  // Centroid of each house region
  const LABEL: Record<number, [number, number]> = {
    1:  [200, 100],  2:  [100,  33],  3:  [ 33, 100],
    4:  [100, 200],  5:  [ 33, 300],  6:  [100, 367],
    7:  [200, 300],  8:  [300, 367],  9:  [367, 300],
    10: [300, 200],  11: [367, 100],  12: [300,  33],
  }

  // Sign number (1–12) occupying a given house, rotating with lagna
  const signInHouse = (house: number) =>
    ((lagna - 1 + house - 1) % 12) + 1

  const planetsInHouse = (house: number) =>
    Object.entries(planets).filter(([, h]) => h === house).map(([p]) => p)

  return (
    <svg
      viewBox="0 0 400 400"
      style={{ display: 'block', width: '100%', borderRadius: 8 }}
    >
      <rect width={400} height={400} fill="#12121C" />

      {/* House fills + borders */}
      {Object.entries(POLYGONS).map(([h, p]) => {
        const house = parseInt(h)
        const fill  = house === 1 ? 'rgba(124,58,237,0.15)'
                    : hovered === house ? 'rgba(255,255,255,0.07)'
                    : 'transparent'
        return (
          <polygon
            key={house}
            points={p}
            fill={fill}
            stroke="#3A3A52"
            strokeWidth={1}
            style={{ cursor: onHouseClick ? 'pointer' : 'default' }}
            onMouseEnter={() => setHovered(house)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onHouseClick?.(house)}
          />
        )
      })}

      <rect width={400} height={400} fill="none" stroke="#3A3A52" strokeWidth={1.5} />

      {/* Labels: sign number + planets */}
      {Array.from({ length: 12 }, (_, i) => i + 1).map(house => {
        const [lx, ly] = LABEL[house]
        const sign     = signInHouse(house)
        const ps       = planetsInHouse(house)
        const isLagna  = house === 1

        // Stack: sign#, planet0, planet1, … — centered on ly
        const lineH      = 12
        const totalLines = 1 + ps.length
        const startY     = ly - (totalLines * lineH) / 2

        return (
          <g key={house}>
            {/* Sign number */}
            <text
              x={lx} y={startY + lineH * 0.5}
              textAnchor="middle" dominantBaseline="middle"
              fill={isLagna ? '#A78BFA' : '#4B5563'}
              fontSize={isLagna ? 12 : 11}
              fontWeight={isLagna ? '700' : '600'}
              fontFamily="monospace"
            >
              {sign}
            </text>

            {/* Planets with degree */}
            {ps.map((planet, pi) => {
              const deg   = planetDegrees[planet]
              const label = deg !== undefined
                ? `${PLANET_ABBR[planet] ?? planet.slice(0, 2)} ${deg}°`
                : PLANET_ABBR[planet] ?? planet.slice(0, 2)
              return (
                <text
                  key={planet}
                  x={lx}
                  y={startY + lineH * (1.5 + pi)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={PLANET_COLORS[planet] ?? '#94A3B8'}
                  fontSize={10}
                  fontWeight="700"
                  fontFamily="monospace"
                >
                  {label}
                </text>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}
