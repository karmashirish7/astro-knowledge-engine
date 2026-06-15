'use client'

import { useMemo, useState } from 'react'
import { computeDivisional } from '@/lib/astrology/divisional'

// ── Types ──────────────────────────────────────────────────────────────────

export type ShadbalaType =
  | 'sthana' | 'sthana_uchcha' | 'sthana_sapta' | 'sthana_oja' | 'sthana_kendra' | 'sthana_drek'
  | 'dig' | 'kala' | 'cheshta' | 'naisargika' | 'drig'
  | 'total' | 'rupas' | 'pct'

interface TypeDef { id: ShadbalaType; label: string; unit: string; group: string }

export const SHADBALA_TYPES: TypeDef[] = [
  { id:'sthana',        label:'Sthāna Bala (total)',   unit:'virupas', group:'Sthāna Bala' },
  { id:'sthana_uchcha', label:'· Uchcha Bala',          unit:'virupas', group:'Sthāna Bala' },
  { id:'sthana_sapta',  label:'· Sapta Vargaja',        unit:'virupas', group:'Sthāna Bala' },
  { id:'sthana_oja',    label:'· Ojayugma Rāsi',        unit:'virupas', group:'Sthāna Bala' },
  { id:'sthana_kendra', label:'· Kendradi Bala',         unit:'virupas', group:'Sthāna Bala' },
  { id:'sthana_drek',   label:'· Drekkana Bala',         unit:'virupas', group:'Sthāna Bala' },
  { id:'dig',           label:'Dig Bala',                unit:'virupas', group:'Other Balas' },
  { id:'kala',          label:'Kāla Bala',               unit:'virupas', group:'Other Balas' },
  { id:'cheshta',       label:'Cheshta Bala',            unit:'virupas', group:'Other Balas' },
  { id:'naisargika',    label:'Naisargika Bala',          unit:'virupas', group:'Other Balas' },
  { id:'drig',          label:'Drig Bala',               unit:'virupas', group:'Other Balas' },
  { id:'total',         label:'Shadbala (virupas)',       unit:'virupas', group:'Shadbala Total' },
  { id:'rupas',         label:'Shadbala (rupas)',         unit:'rupas',   group:'Shadbala Total' },
  { id:'pct',           label:'Shadbala (% min req)',     unit:'%',       group:'Shadbala Total' },
]

// ── Constants ──────────────────────────────────────────────────────────────

const PLANETS_7 = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn']

const ABBR: Record<string, string> = {
  Sun:'Su', Moon:'Mo', Mars:'Ma', Mercury:'Me', Jupiter:'Ju', Venus:'Ve', Saturn:'Sa',
}

const PLANET_COLORS: Record<string, string> = {
  Sun:'#F59E0B', Moon:'#C8D4E0', Mars:'#EF4444', Mercury:'#10B981',
  Jupiter:'#F97316', Venus:'#EC4899', Saturn:'#6366F1',
}

// BPHS debilitation longitudes (sidereal/Lahiri) — 0° = 0° Aries
const DEBIL_LON: Record<string, number> = {
  Sun:190, Moon:213, Mars:118, Mercury:345, Jupiter:275, Venus:177, Saturn:20,
}

// Mulatrikona sign (1-12)
const MULATRIKONA: Record<string, number> = {
  Sun:5, Moon:2, Mars:1, Mercury:6, Jupiter:9, Venus:7, Saturn:11,
}

// Own signs (all own + mulatrikona)
const OWN_SIGNS: Record<string, number[]> = {
  Sun:[5], Moon:[4], Mars:[1,8], Mercury:[3,6], Jupiter:[9,12], Venus:[2,7], Saturn:[10,11],
}

// Sign lord
const SIGN_LORD: Record<number, string> = {
  1:'Mars',2:'Venus',3:'Mercury',4:'Moon',5:'Sun',6:'Mercury',
  7:'Venus',8:'Mars',9:'Jupiter',10:'Saturn',11:'Saturn',12:'Jupiter',
}

// Natural friendship (BPHS standard)
type Rel = 'F'|'N'|'E'
const NAT_REL: Record<string, Record<string, Rel>> = {
  Sun:     { Moon:'F', Mars:'F', Jupiter:'F', Mercury:'N', Venus:'E', Saturn:'E' },
  Moon:    { Sun:'F',  Mercury:'F', Mars:'N', Jupiter:'N', Venus:'N', Saturn:'N' },
  Mars:    { Sun:'F',  Moon:'F', Jupiter:'F', Venus:'N', Saturn:'N', Mercury:'E' },
  Mercury: { Sun:'F',  Venus:'F', Mars:'N', Jupiter:'N', Saturn:'N', Moon:'E' },
  Jupiter: { Sun:'F',  Moon:'F', Mars:'F', Saturn:'N', Mercury:'E', Venus:'E' },
  Venus:   { Mercury:'F', Saturn:'F', Mars:'N', Jupiter:'N', Sun:'E', Moon:'E' },
  Saturn:  { Mercury:'F', Venus:'F', Jupiter:'N', Sun:'E', Moon:'E', Mars:'E' },
}

// Shortest angular distance 0–180
function angDist(a: number, b: number) {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

// Temporal friendship: positions 2,3,4,10,11,12 from self = friend; else enemy
function temporalRel(selfHouse: number, otherHouse: number): 'F'|'E' {
  const diff = ((otherHouse - selfHouse + 12) % 12) + 1
  return [2,3,4,10,11,12].includes(diff) ? 'F' : 'E'
}

// Panchadha score → state
function panchadha(nat: Rel, tmp: 'F'|'E'): number {
  const n = nat === 'F' ? 1 : nat === 'N' ? 0 : -1
  const t = tmp === 'F' ? 1 : -1
  return n + t
}

// Virupas from panchadha score (for D1)
function d1Virupas(planet: string, signNum: number, panScore: number): number {
  if (MULATRIKONA[planet] === signNum) return 45
  if (OWN_SIGNS[planet]?.includes(signNum))    return 30
  if (panScore >= 2)  return 22.5
  if (panScore === 1) return 15
  if (panScore === 0) return 7.5
  if (panScore === -1) return 3.75
  return 1.875
}

// Virupas from panchadha score (for other vargas)
function dvVirupas(planet: string, signNum: number, panScore: number): number {
  if (OWN_SIGNS[planet]?.includes(signNum)) return 30
  if (panScore >= 2)  return 22.5
  if (panScore === 1) return 15
  if (panScore === 0) return 7.5
  if (panScore === -1) return 3.75
  return 1.875
}

// ── Shadbala computation ───────────────────────────────────────────────────

export function computeShadbala(calc: any): Record<ShadbalaType, Record<string, number>> {
  const blank = () => Object.fromEntries(PLANETS_7.map(p => [p, 0])) as Record<string, number>
  const result: Record<ShadbalaType, Record<string, number>> = {
    sthana: blank(), sthana_uchcha: blank(), sthana_sapta: blank(),
    sthana_oja: blank(), sthana_kendra: blank(), sthana_drek: blank(),
    dig: blank(), kala: blank(), cheshta: blank(), naisargika: blank(),
    drig: blank(), total: blank(), rupas: blank(), pct: blank(),
  }

  if (!calc?.planets || !calc?.houseNumbers) return result

  // ── Pre-compute varga signs for each planet ──
  // Sapta Vargas: D1, D2, D3, D7, D9, D12, D30
  const SAPTA_NS = [2, 3, 7, 9, 12, 30]
  const vargaDivs = SAPTA_NS.map(n => computeDivisional(calc, n))

  // Sign of planet in varga n (1-12) from precomputed div
  function vargaSign(planet: string, divIdx: number): number {
    const div = vargaDivs[divIdx]
    if (!div) return calc.planets[planet]?.signNumber ?? 1
    const house = div.planets[planet] ?? 1
    return ((div.lagna - 1 + house - 1) % 12) + 1
  }

  // ── Date-based calculations ──
  const moonLon = calc.planets.Moon?.longitude ?? 0
  const sunLon  = calc.planets.Sun?.longitude  ?? 0
  const phase   = (moonLon - sunLon + 360) % 360  // 0=new,180=full
  const sunHouse = calc.houseNumbers.Sun ?? 1
  const isDay    = sunHouse >= 7

  // Day of week (0=Sun,1=Mon,...6=Sat) from Julian Day
  const dow = Math.floor((calc.jd ?? 0) + 1.5) % 7
  const VAR_LORDS = PLANETS_7  // Sun=0,Moon=1,...Saturn=6

  // Min rupas required
  const MIN_RUPAS: Record<string, number> = {
    Sun:5, Moon:6, Mars:5, Mercury:7, Jupiter:6.5, Venus:5.5, Saturn:5,
  }

  const NAISARGIKA: Record<string, number> = {
    Sun:60, Moon:51.43, Mars:17.14, Mercury:25.72, Jupiter:34.29, Venus:42.86, Saturn:8.57,
  }

  // Dig Bala peak (in house-space longitude: 0° = ascendant direction)
  const DIG_PEAK: Record<string, number> = {
    Sun:270, Mars:270, Moon:90, Venus:90, Mercury:0, Jupiter:0, Saturn:180,
  }

  // Aspect offsets and strengths for Drig Bala
  const ASPECT_STR: Record<string, Record<number, number>> = {
    Sun:[7], Moon:[7], Mars:[4,7,8], Mercury:[7],
    Jupiter:[5,7,9], Venus:[7], Saturn:[3,7,10],
  } as any

  const MEAN_SPEED: Record<string, number> = {
    Mars:0.524, Mercury:1.383, Jupiter:0.083, Venus:1.200, Saturn:0.033,
  }

  for (const planet of PLANETS_7) {
    const pos   = calc.planets[planet]
    const house = calc.houseNumbers[planet] ?? 1
    if (!pos) continue

    const lon  = pos.longitude as number
    const sign = pos.signNumber as number  // D1 sign 1-12
    const deg  = pos.degrees as number

    const isMale = ['Sun','Mars','Mercury','Jupiter','Saturn'].includes(planet)  // OjaYugma male
    const isFem  = ['Moon','Venus'].includes(planet)

    // ── 1a. Uchcha Bala ──
    // BPHS: "longitudinal difference from deepest debility / 3"
    // Max at exaltation (180° from debil) = 60; Min at debil = 0
    const debil  = DEBIL_LON[planet] ?? 0
    const uchcha = Math.round((angDist(lon, debil) / 3) * 10) / 10
    result.sthana_uchcha[planet] = uchcha

    // ── 1b. Sapta Vargaja Bala ──
    let sapta = 0

    // D1 (special: Mulatrikona gets 45)
    {
      const nat = NAT_REL[planet]?.[SIGN_LORD[sign] ?? ''] ?? 'N'
      const tmp = temporalRel(house, calc.houseNumbers[SIGN_LORD[sign] ?? ''] ?? 0)
      const ps  = panchadha(nat as Rel, tmp)
      sapta += d1Virupas(planet, sign, ps)
    }

    // D2, D3, D7, D9, D12, D30
    SAPTA_NS.forEach((_, di) => {
      const vs     = vargaSign(planet, di)
      const lord   = SIGN_LORD[vs] ?? ''
      const nat    = NAT_REL[planet]?.[lord] ?? 'N'
      const lordH  = calc.houseNumbers[lord] ?? 0
      const tmp    = temporalRel(house, lordH)
      const ps     = panchadha(nat as Rel, tmp)
      sapta += dvVirupas(planet, vs, ps)
    })

    result.sthana_sapta[planet] = Math.round(sapta * 100) / 100

    // ── 1c. Ojayugma Rāsi Bala ──
    // Checked in D1 and D9 (Navamsa = vargaDivs index 3)
    const d9sign = vargaSign(planet, 3)  // index 3 = D9

    let oja = 0
    const oddSign  = (s: number) => s % 2 === 1
    if (isMale && oddSign(sign))  oja += 15  // D1
    if (isFem  && !oddSign(sign)) oja += 15
    if (isMale && oddSign(d9sign)) oja += 15  // D9
    if (isFem  && !oddSign(d9sign)) oja += 15
    result.sthana_oja[planet] = oja

    // ── 1d. Kendradi Bala ──
    const kendra = [1,4,7,10].includes(house) ? 60 : [2,5,8,11].includes(house) ? 30 : 15
    result.sthana_kendra[planet] = kendra

    // ── 1e. Drekkana Bala ──
    const drk      = deg < 10 ? 1 : deg < 20 ? 2 : 3
    const isMaleD  = ['Sun','Mars','Jupiter'].includes(planet)
    const isFemD   = ['Moon','Venus'].includes(planet)
    const drekkana = (isMaleD && drk === 1) || (isFemD && drk === 3) ||
                     (!isMaleD && !isFemD && drk === 2) ? 15 : 0
    result.sthana_drek[planet] = drekkana

    // ── 1. Sthāna Bala total ──
    result.sthana[planet] = Math.round((uchcha + sapta + oja + kendra + drekkana) * 10) / 10

    // ── 2. Dig Bala ──
    const lagnaLon = calc.lagna?.longitude ?? 0
    const hsl      = (lon - lagnaLon + 360) % 360
    const dpeak    = DIG_PEAK[planet] ?? 0
    result.dig[planet] = Math.round(Math.max(0, (1 - angDist(hsl, dpeak) / 180) * 60) * 10) / 10

    // ── 3. Kāla Bala (Nathonnatha + Paksha + Vara) ──
    const dayPlanets   = ['Sun','Jupiter','Venus']
    const nightPlanets = ['Moon','Mars','Saturn']
    const natho = dayPlanets.includes(planet)
      ? (isDay ? 60 : 30)
      : nightPlanets.includes(planet)
        ? (isDay ? 30 : 60)
        : 45  // Mercury

    const benefics = ['Moon','Mercury','Jupiter','Venus']
    let paksha: number
    if (planet === 'Moon') {
      paksha = phase <= 180 ? (phase / 180) * 60 : ((360 - phase) / 180) * 60
    } else if (benefics.includes(planet)) {
      paksha = phase <= 180 ? (phase / 180) * 30 : ((360 - phase) / 180) * 30
    } else {
      paksha = phase <= 180 ? ((180 - phase) / 180) * 30 : ((phase - 180) / 180) * 30
    }

    const vara = VAR_LORDS[dow] === planet ? 45 : 0
    result.kala[planet] = Math.round(natho + paksha + vara)

    // ── 4. Cheshta Bala ──
    if (planet === 'Sun' || planet === 'Moon') {
      result.cheshta[planet] = 0
    } else {
      const speed = pos.speed ?? 0
      let cheshta: number
      if (speed < -0.001) {
        cheshta = 60  // Retrograde (Vakra) = max
      } else if (Math.abs(speed) < 0.001) {
        cheshta = 0   // Stationary (Vikala) = 0
      } else {
        const mean = MEAN_SPEED[planet] ?? 1
        cheshta = Math.min(45, Math.round((speed / mean) * 30))
      }
      result.cheshta[planet] = Math.max(0, cheshta)
    }

    // ── 5. Naisargika Bala (fixed) ──
    result.naisargika[planet] = NAISARGIKA[planet] ?? 30

    // ── 6. Drig Bala ──
    let drig = 0
    const aspectOffsets: Record<string, number[]> = {
      Sun:[7], Moon:[7], Mars:[4,7,8], Mercury:[7],
      Jupiter:[5,7,9], Venus:[7], Saturn:[3,7,10],
    }
    for (const other of PLANETS_7) {
      if (other === planet) continue
      const oh  = calc.houseNumbers[other] ?? 0
      const offs = aspectOffsets[other] ?? [7]
      for (const off of offs) {
        if (((oh - 1 + off - 1) % 12) + 1 !== house) continue
        const isBen = ['Moon','Mercury','Jupiter','Venus'].includes(other)
        const otherPos = calc.planets[other]
        // Full aspect = 60 virupas; partial = proportional
        const strength = off === 7 ? 60 : off === 4 || off === 8 ? 45 : 30
        drig += isBen ? strength / 4 : -strength / 4
      }
    }
    result.drig[planet] = Math.round(drig * 10) / 10

    // ── Totals ──
    const total =
      result.sthana[planet] + result.dig[planet] + result.kala[planet] +
      result.cheshta[planet] + result.naisargika[planet] + result.drig[planet]
    result.total[planet] = Math.round(total)
    result.rupas[planet] = Math.round((total / 60) * 10) / 10
    const minV = (MIN_RUPAS[planet] ?? 5) * 60
    result.pct[planet] = Math.round((total / minV) * 100)
  }

  return result
}

// ── Bar chart ──────────────────────────────────────────────────────────────

function BarChart({ data }: { data: Record<string, number> }) {
  const values = PLANETS_7.map(p => data[p] ?? 0)
  const hasNeg = values.some(v => v < 0)
  const maxAbs = Math.max(...values.map(Math.abs), 1)

  const W       = 240
  const H       = 110
  const LABEL_H = 15
  const VAL_H   = 11
  const totalH  = H + LABEL_H + VAL_H

  const barW    = 24
  const spacing = (W - PLANETS_7.length * barW) / (PLANETS_7.length + 1)
  const baselineY = hasNeg ? H * 0.55 : H * 0.9
  const maxBarH   = hasNeg ? H * 0.45 : H * 0.82

  return (
    <svg viewBox={`0 0 ${W} ${totalH}`} style={{ width:'100%', display:'block', overflow:'visible' }}>
      {/* Zero line */}
      <line x1={0} y1={baselineY} x2={W} y2={baselineY} stroke="#CBD5E1" strokeWidth={1} />

      {PLANETS_7.map((planet, i) => {
        const val = data[planet] ?? 0
        const x   = spacing + i * (barW + spacing)
        const bh  = Math.max(2, (Math.abs(val) / maxAbs) * maxBarH)
        const by  = val >= 0 ? baselineY - bh : baselineY
        const col = PLANET_COLORS[planet] ?? '#94A3B8'

        return (
          <g key={planet}>
            <rect x={x} y={by} width={barW} height={bh} fill={col} opacity={0.85} rx={2} />

            {/* Value label */}
            <text
              x={x + barW / 2}
              y={val >= 0 ? by - 2 : by + bh + VAL_H - 1}
              textAnchor="middle" fill="#1E293B" fontSize={7.5} fontWeight="700" fontFamily="monospace"
            >
              {Number.isInteger(val) ? val : val.toFixed(1)}
            </text>

            {val < 0 && (
              <text x={x + barW / 2} y={baselineY + 8} textAnchor="middle" fill="#EF4444" fontSize={6}>▼</text>
            )}

            {/* Planet abbreviation */}
            <text
              x={x + barW / 2} y={H + LABEL_H + 1}
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

export default function ShadbalaBars({ calc }: { calc: any }) {
  const [top,    setTop]    = useState<ShadbalaType>('sthana')
  const [bottom, setBottom] = useState<ShadbalaType>('dig')

  const data = useMemo(() => computeShadbala(calc), [calc])

  // Group the types for optgroup rendering
  const groups = Array.from(new Set(SHADBALA_TYPES.map(t => t.group)))

  const sel = (value: ShadbalaType, onChange: (v: ShadbalaType) => void) => (
    <select
      value={value}
      onChange={e => onChange(e.target.value as ShadbalaType)}
      className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold outline-none cursor-pointer mb-2"
      style={{ background:'var(--bg-hover)', color:'var(--text-primary)', border:'1px solid var(--border)' }}
    >
      {groups.map(g => (
        <optgroup key={g} label={g}>
          {SHADBALA_TYPES.filter(t => t.group === g).map(t => (
            <option key={t.id} value={t.id}>{t.label} ({t.unit})</option>
          ))}
        </optgroup>
      ))}
    </select>
  )

  const topDef    = SHADBALA_TYPES.find(t => t.id === top)
  const bottomDef = SHADBALA_TYPES.find(t => t.id === bottom)

  return (
    <div className="p-3 space-y-3">
      {/* Top chart */}
      <div className="rounded-xl p-2.5" style={{ background:'var(--bg-hover)', border:'1px solid var(--border)' }}>
        {sel(top, setTop)}
        <div className="flex justify-between text-[9px] mb-0.5 px-0.5" style={{ color:'var(--text-muted)' }}>
          <span>{topDef?.label}</span>
          <span>{topDef?.unit}</span>
        </div>
        <BarChart data={data[top]} />
      </div>

      {/* Bottom chart */}
      <div className="rounded-xl p-2.5" style={{ background:'var(--bg-hover)', border:'1px solid var(--border)' }}>
        {sel(bottom, setBottom)}
        <div className="flex justify-between text-[9px] mb-0.5 px-0.5" style={{ color:'var(--text-muted)' }}>
          <span>{bottomDef?.label}</span>
          <span>{bottomDef?.unit}</span>
        </div>
        <BarChart data={data[bottom]} />
      </div>

      {/* Planet legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 px-1">
        {PLANETS_7.map(p => (
          <span key={p} className="flex items-center gap-1 text-[10px]" style={{ color:'var(--text-muted)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: PLANET_COLORS[p] }} />
            {p}
          </span>
        ))}
      </div>

      <p className="text-[9px] leading-relaxed px-1" style={{ color:'var(--text-muted)' }}>
        Sthāna = Uchcha (debil-distance/3) + SaptaVargaja (D1·D2·D3·D7·D9·D12·D30, Panchadha Maitri) + Ojayugma (D1+D9) + Kendradi + Drekkana.
        Kāla = Nathonnatha + Paksha + Vara. Cheshta uses planetary speed (negative = retrograde).
      </p>
    </div>
  )
}
