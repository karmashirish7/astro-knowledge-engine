'use client'

import { useState } from 'react'
import NorthIndianKundali from './NorthIndianKundali'
import { VARGAS, computeDivisional, computeBhavChalit, superimposeOntoD1Houses } from '@/lib/astrology/divisional'

interface Props {
  calc:                  any
  d1Lagna:               number   // 1–12 sign
  d1Planets:             Record<string, number>
  d1Degrees?:            Record<string, number>
  onHouseClick?:         (house: number) => void
}

// 'chalit' is the special selector value for Bhav Chalit; others are stringified n values
const SELECTOR_OPTIONS = [
  { value: 'chalit', abbr: 'BC', name: 'Bhav Chalit' },
  ...VARGAS.map(v => ({ value: String(v.n), abbr: v.abbr, name: v.name })),
]

export default function DivisionalView({ calc, d1Lagna, d1Planets, d1Degrees = {}, onHouseClick }: Props) {
  const [selVal, setSelVal]           = useState('9')
  const [visualLagnaHouse, setVLagna] = useState(1)
  const [superimpose, setSuperimpose] = useState(false)

  const hasPrecise  = !!(calc?.lagna?.longitude != null && calc?.planets)
  const isChalit    = selVal === 'chalit'
  const divN        = isChalit ? null : Number(selVal)

  const div        = hasPrecise && !isChalit && divN != null ? computeDivisional(calc, divN) : null
  const chalit     = hasPrecise && isChalit ? computeBhavChalit(calc) : null
  const selected   = SELECTOR_OPTIONS.find(o => o.value === selVal) ?? SELECTOR_OPTIONS[1]

  // Retrograde follows actual planetary motion — same across all charts
  const retrograde: Record<string, boolean> = hasPrecise
    ? Object.fromEntries(
        Object.entries(calc.planets as Record<string, any>)
          .map(([p, v]: [string, any]) => [p, (v.speed ?? 0) < 0])
      )
    : {}

  const rightChart = isChalit ? chalit : div

  // Superimpose: map each div planet's sign → D1 house number
  const overlayPlanets: Record<string, number> | undefined =
    superimpose && div && !isChalit ? superimposeOntoD1Houses(div, d1Lagna) : undefined

  return (
    <div className="w-full">
      {/* Single controls row */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold tracking-wider" style={{ color: '#A78BFA' }}>D1 · Rasi</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/</span>
          <span
            className="text-xs font-bold tracking-wider"
            style={{ color: isChalit ? '#F59E0B' : '#10B981' }}>
            {selected.abbr} · {selected.name}
          </span>
          {hasPrecise && !isChalit && (
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={superimpose}
                onChange={e => setSuperimpose(e.target.checked)}
                className="w-3 h-3 accent-violet-500 cursor-pointer"
              />
              <span className="text-[11px] font-semibold" style={{ color: superimpose ? '#A78BFA' : 'var(--text-muted)' }}>
                Superimpose
              </span>
            </label>
          )}
          {visualLagnaHouse !== 1 && (
            <button
              onClick={() => setVLagna(1)}
              className="text-[10px] px-2 py-0.5 rounded transition-colors hover:bg-[var(--bg-hover)]"
              style={{ color: '#EC4899', border: '1px solid #EC489933' }}>
              ↺ Reset lagna
            </button>
          )}
        </div>
        <select
          value={selVal}
          onChange={e => setSelVal(e.target.value)}
          className="text-sm font-semibold px-3 py-1.5 rounded-lg outline-none cursor-pointer"
          style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)', minWidth: 180 }}>
          {SELECTOR_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.abbr} · {o.name}</option>
          ))}
        </select>
      </div>

      {/* Both charts */}
      <div className="flex gap-4 w-full">
        <div className="flex-1 min-w-0">
          <NorthIndianKundali
            lagna={d1Lagna}
            planets={d1Planets}
            planetDegrees={d1Degrees}
            planetRetrograde={retrograde}
            overlayPlanets={overlayPlanets}
            onHouseClick={onHouseClick}
            visualLagnaHouse={visualLagnaHouse}
            onVisualLagnaChange={setVLagna}
          />
        </div>

        <div className="flex-1 min-w-0">
          {!hasPrecise ? (
            <div className="aspect-square rounded-lg flex items-center justify-center"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <p className="text-xs text-center px-4" style={{ color: 'var(--text-muted)' }}>
                Divisional charts require precise birth data (lat/lon)
              </p>
            </div>
          ) : isChalit && !chalit ? (
            <div className="aspect-square rounded-lg flex items-center justify-center"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <p className="text-xs text-center px-4" style={{ color: 'var(--text-muted)' }}>
                Bhav Chalit requires recalculated chart data
              </p>
            </div>
          ) : rightChart ? (
            <NorthIndianKundali
              lagna={rightChart.lagna}
              planets={rightChart.planets}
              planetDegrees={rightChart.planetDegrees}
              planetRetrograde={retrograde}
              visualLagnaHouse={visualLagnaHouse}
              onVisualLagnaChange={setVLagna}
            />
          ) : null}
        </div>
      </div>

      {visualLagnaHouse !== 1 && (
        <p className="text-[10px] mt-1 text-center" style={{ color: '#EC4899' }}>
          Rotated · As = actual ascendant
        </p>
      )}
    </div>
  )
}
