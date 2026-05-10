'use client'

import { useState } from 'react'
import { getPlanetDignity } from '@/lib/astrology/calculations/dignity'

// ── Types ──────────────────────────────────────────────────────────────────

export type ShadbalaType =
  | 'sthana' | 'dig' | 'kala' | 'cheshta' | 'naisargika' | 'drig'
  | 'total' | 'rupas' | 'pct'

export const SHADBALA_TYPES: { id: ShadbalaType; label: string; unit: string }[] = [
  { id: 'sthana',     label: 'Sthāna Bala',        unit: 'virupas' },
  { id: 'dig',        label: 'Dig Bala',            unit: 'virupas' },
  { id: 'kala',       label: 'Kāla Bala',           unit: 'virupas' },
  { id: 'cheshta',    label: 'Cheshta Bala',        unit: 'virupas' },
  { id: 'naisargika', label: 'Naisargika Bala',     unit: 'virupas' },
  { id: 'drig',       label: 'Drig Bala',           unit: 'virupas' },
  { id: 'total',      label: 'Shadbala',            unit: 'virupas' },
  { id: 'rupas',      label: 'Shadbala (rupas)',    unit: 'rupas'   },
  { id: 'pct',        label: 'Shadbala (% min req)', unit: '%'      },
]

const PLANETS_7 = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn']

const ABBR: Record<string, string> = {
  Sun:'Su', Moon:'Mo', Mars:'Ma', Mercury:'Me',
  Jupiter:'Ju', Venus:'Ve', Saturn:'Sa',
}

const PLANET_COLORS: Record<string, string> = {
  Sun:'#F59E0B', Moon:'#C8D4E0', Mars:'#EF4444', Mercury:'#10B981',
  Jupiter:'#F97316', Venus:'#EC4899', Saturn:'#6366F1',
}

// ── Shadbala computation ───────────────────────────────────────────────────

/** Shortest angular distance between two longitudes (0–180) */
function angDist(a: number, b: number) {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

export function computeShadbala(calc: any): Record<ShadbalaType, Record<string, number>> {
  const blank = () => Object.fromEntries(PLANETS_7.map(p => [p, 0])) as Record<string, number>
  const result = {
    sthana: blank(), dig: blank(), kala: blank(),
    cheshta: blank(), naisargika: blank(), drig: blank(),
    total: blank(), rupas: blank(), pct: blank(),
  }

  if (!calc?.planets || !calc?.houseNumbers) return result

  const lagnaLon  = calc.lagna?.longitude ?? 0
  const moonLon   = calc.planets.Moon?.longitude ?? 0
  const sunLon    = calc.planets.Sun?.longitude ?? 0
  const phase     = (moonLon - sunLon + 360) % 360  // 0 = new moon, 180 = full

  // Day/night: if Sun is in houses 7-12, birth is during day
  const sunHouse  = calc.houseNumbers.Sun ?? 1
  const isDay     = sunHouse >= 7

  // Day of week from Julian Day
  const dow = Math.floor((calc.jd ?? 0) + 1.5) % 7  // 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
  const VAR_LORDS = PLANETS_7  // Sunday=Sun, Monday=Moon, etc.

  // Exaltation sidereal longitudes (Lahiri approximate)
  const EXALT_LON: Record<string, number> = {
    Sun:10, Moon:33, Mars:298, Mercury:165, Jupiter:95, Venus:357, Saturn:200,
  }

  const MIN_RUPAS: Record<string, number> = {
    Sun:5, Moon:6, Mars:5, Mercury:7, Jupiter:6.5, Venus:5.5, Saturn:5,
  }

  const NAISARGIKA: Record<string, number> = {
    Sun:60, Moon:51.43, Mars:17.14, Mercury:25.72, Jupiter:34.29, Venus:42.86, Saturn:8.57,
  }

  const DIG_PEAK: Record<string, number> = {
    Sun:270, Mars:270, Moon:90, Venus:90, Mercury:0, Jupiter:0, Saturn:180,
  }

  // Aspect strength (virupas) by house offset from the aspecting planet
  const ASPECT_STR: Record<string, Record<number, number>> = {
    Sun:     { 7: 60 },
    Moon:    { 7: 60 },
    Mars:    { 4: 45, 7: 60, 8: 45 },
    Mercury: { 7: 60 },
    Jupiter: { 5: 30, 7: 60, 9: 30 },
    Venus:   { 7: 60 },
    Saturn:  { 3: 15, 7: 60, 10: 15 },
  }

  // Mean daily motion (degrees/day) for Cheshta Bala scaling
  const MEAN_SPEED: Record<string, number> = {
    Mars: 0.524, Mercury: 1.383, Jupiter: 0.083, Venus: 1.200, Saturn: 0.033,
  }

  for (const planet of PLANETS_7) {
    const pos   = calc.planets[planet]
    const house = calc.houseNumbers[planet] ?? 1
    if (!pos) continue

    const lon    = pos.longitude as number
    const sign   = pos.signNumber as number  // 1-12
    const deg    = pos.degrees as number     // 0-29
    const isMale = ['Sun','Mars','Jupiter'].includes(planet)
    const isFem  = ['Moon','Venus'].includes(planet)

    // ── 1. Sthāna Bala ──
    // Uchcha Bala
    const eLon = EXALT_LON[planet] ?? 0
    const uchcha = Math.round(60 - (angDist(lon, eLon) / 180) * 60)

    // Kendradi Bala
    const kendra = [1,4,7,10].includes(house) ? 60 : [2,5,8,11].includes(house) ? 30 : 15

    // Ojayugma Rasi Bala (odd/even sign)
    const isOdd = sign % 2 === 1
    const ojayugma = (isMale && isOdd) || (isFem && !isOdd) || planet === 'Mercury' ? 15 : 0

    // Drekkana Bala
    const drk = deg < 10 ? 1 : deg < 20 ? 2 : 3
    const drekkana = (isMale && drk === 1) || (isFem && drk === 2) || (!isMale && !isFem && drk === 3) ? 15 : 0

    // Hora Bala — odd signs: 0-15° = Sun hora, 15-30° = Moon hora; even signs reversed
    const inSunHora = (sign % 2 === 1 && deg < 15) || (sign % 2 === 0 && deg >= 15)
    const hora = (isMale && inSunHora) || (isFem && !inSunHora) ? 15 : 0

    result.sthana[planet] = uchcha + kendra + ojayugma + drekkana + hora

    // ── 2. Dig Bala ──
    const hsl   = (lon - lagnaLon + 360) % 360
    const dpeak = DIG_PEAK[planet] ?? 0
    result.dig[planet] = Math.round(Math.max(0, (1 - angDist(hsl, dpeak) / 180) * 60) * 10) / 10

    // ── 3. Kāla Bala (simplified: Nathonnatha + Paksha + Vara) ──
    // Nathonnatha Bala
    const dayPlanets  = ['Sun','Jupiter','Venus']
    const nightPlanets = ['Moon','Mars','Saturn']
    const natho = dayPlanets.includes(planet)
      ? (isDay ? 60 : 30)
      : nightPlanets.includes(planet)
        ? (isDay ? 30 : 60)
        : 45  // Mercury

    // Paksha Bala
    const benefics = ['Moon','Mercury','Jupiter','Venus']
    let paksha: number
    if (planet === 'Moon') {
      paksha = phase <= 180 ? (phase / 180) * 60 : ((360 - phase) / 180) * 60
    } else if (benefics.includes(planet)) {
      paksha = phase <= 180 ? (phase / 180) * 30 : ((360 - phase) / 180) * 30
    } else {
      paksha = phase <= 180 ? ((180 - phase) / 180) * 30 : ((phase - 180) / 180) * 30
    }

    // Vara Bala
    const vara = VAR_LORDS[dow] === planet ? 45 : 0

    result.kala[planet] = Math.round(natho + paksha + vara)

    // ── 4. Cheshta Bala ──
    // Sun & Moon have no Cheshta Bala in classical texts
    if (planet === 'Sun' || planet === 'Moon') {
      result.cheshta[planet] = 0
    } else {
      const speed = pos.speed ?? 0
      let cheshta: number
      if (speed < -0.001) {
        cheshta = 60                                           // Vakra (retrograde)
      } else if (Math.abs(speed) < 0.001) {
        cheshta = 0                                            // Vikala (stationary)
      } else {
        const mean = MEAN_SPEED[planet] ?? 1
        cheshta = Math.min(45, Math.round((speed / mean) * 30)) // Direct: 0–45
      }
      result.cheshta[planet] = cheshta
    }

    // ── 5. Naisargika Bala (fixed) ──
    result.naisargika[planet] = NAISARGIKA[planet] ?? 30

    // ── 6. Drig Bala (aspectual) ──
    let drig = 0
    for (const other of PLANETS_7) {
      if (other === planet) continue
      const oh = calc.houseNumbers[other] ?? 0
      const aspectMap = ASPECT_STR[other] ?? { 7: 60 }
      for (const [offStr, strength] of Object.entries(aspectMap)) {
        const off = Number(offStr)
        if (((oh - 1 + off - 1) % 12) + 1 !== house) continue
        const isBeneficAspect = ['Moon','Mercury','Jupiter','Venus'].includes(other)
        const dignity = getPlanetDignity(other, calc.planets[other]?.sign ?? '')
        const dignityMul = dignity === 'exalted' || dignity === 'moolatrikona' ? 1.5
                          : dignity === 'debilitated' ? 0.5 : 1
        drig += isBeneficAspect ? strength * dignityMul : -strength * dignityMul
      }
    }
    result.drig[planet] = Math.round(drig * 10) / 10

    // ── Total ──
    const total = result.sthana[planet] + result.dig[planet] + result.kala[planet]
                + result.cheshta[planet] + result.naisargika[planet] + result.drig[planet]
    result.total[planet] = Math.round(total)
    result.rupas[planet] = Math.round((total / 60) * 10) / 10
    const minV = (MIN_RUPAS[planet] ?? 5) * 60
    result.pct[planet]  = Math.round((total / minV) * 100)
  }

  return result
}

// ── Bar chart ──────────────────────────────────────────────────────────────

function BarChart({ type, data }: { type: ShadbalaType; data: Record<string, number> }) {
  const values = PLANETS_7.map(p => data[p] ?? 0)
  const hasNeg = values.some(v => v < 0)
  const maxAbs = Math.max(...values.map(Math.abs), 1)

  const W       = 240
  const H       = 110
  const LABEL_H = 14
  const VAL_H   = 12
  const totalH  = H + LABEL_H + VAL_H + (hasNeg ? 10 : 0)

  const barW    = 24
  const spacing = (W - PLANETS_7.length * barW) / (PLANETS_7.length + 1)
  const baselineY = hasNeg ? H * 0.55 : H * 0.92
  const maxBarH   = hasNeg ? H * 0.45 : H * 0.82

  return (
    <svg
      viewBox={`0 0 ${W} ${totalH}`}
      style={{ width: '100%', display: 'block', overflow: 'visible' }}
    >
      {/* Zero line */}
      <line x1={0} y1={baselineY} x2={W} y2={baselineY} stroke="#3A3A52" strokeWidth={1} />

      {PLANETS_7.map((planet, i) => {
        const val = data[planet] ?? 0
        const x   = spacing + i * (barW + spacing)
        const pct = val / maxAbs
        const bh  = Math.max(2, Math.abs(pct) * maxBarH)
        const by  = val >= 0 ? baselineY - bh : baselineY
        const col = PLANET_COLORS[planet] ?? '#94A3B8'
        const isNeg = val < 0

        return (
          <g key={planet}>
            {/* Bar */}
            <rect
              x={x} y={by} width={barW} height={bh}
              fill={col} opacity={0.85} rx={2}
            />

            {/* Value label */}
            <text
              x={x + barW / 2}
              y={isNeg ? by + bh + VAL_H - 2 : by - 3}
              textAnchor="middle"
              fill="#E2E8F0"
              fontSize={8}
              fontWeight="700"
              fontFamily="monospace"
            >
              {Math.abs(val) >= 10 ? val.toFixed(1) : val.toFixed(1)}
            </text>

            {/* Negative indicator */}
            {isNeg && (
              <text
                x={x + barW / 2} y={baselineY + 8}
                textAnchor="middle" fill="#EF4444" fontSize={7}
              >▼</text>
            )}

            {/* Planet abbreviation */}
            <text
              x={x + barW / 2} y={H + LABEL_H + 2}
              textAnchor="middle" dominantBaseline="middle"
              fill={col} fontSize={9} fontWeight="700" fontFamily="monospace"
            >
              {ABBR[planet]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Main export ────────────────────────────────────────────────────────────

interface Props {
  calc: any
}

export default function ShadbalaBars({ calc }: Props) {
  const [left,  setLeft]  = useState<ShadbalaType>('sthana')
  const [right, setRight] = useState<ShadbalaType>('dig')

  const data = computeShadbala(calc)

  const sel = (value: ShadbalaType, onChange: (v: ShadbalaType) => void) => (
    <select
      value={value}
      onChange={e => onChange(e.target.value as ShadbalaType)}
      className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold outline-none cursor-pointer mb-2"
      style={{
        background: 'var(--bg-hover)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border)',
      }}
    >
      {SHADBALA_TYPES.map(t => (
        <option key={t.id} value={t.id}>{t.label} ({t.unit})</option>
      ))}
    </select>
  )

  return (
    <div className="p-3 space-y-3">
      <div className="flex flex-col gap-3">
        {/* Top chart */}
        <div className="rounded-xl p-2.5" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
          {sel(left, setLeft)}
          <BarChart type={left} data={data[left]} />
        </div>

        {/* Bottom chart */}
        <div className="rounded-xl p-2.5" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
          {sel(right, setRight)}
          <BarChart type={right} data={data[right]} />
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 px-1">
        {PLANETS_7.map(p => (
          <span key={p} className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: PLANET_COLORS[p] }} />
            {p}
          </span>
        ))}
      </div>

      <p className="text-[9px] leading-relaxed px-1" style={{ color: 'var(--text-muted)' }}>
        ∗ Sthāna = Uchcha + Kendradi + Ojayugma + Drekkana + Hora (Sapta Varga omitted).
        Kāla = Nathonnatha + Paksha + Vara. Drig uses classical partial aspect strengths (60/45/30/15).
      </p>
    </div>
  )
}
