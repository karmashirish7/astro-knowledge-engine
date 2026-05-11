'use client'

import { useState } from 'react'
import NorthIndianKundali from './NorthIndianKundali'
import { VARGAS, computeDivisional } from '@/lib/astrology/divisional'

interface Props {
  calc:                  any
  d1Lagna:               number   // 1–12 sign
  d1Planets:             Record<string, number>
  d1Degrees?:            Record<string, number>
  onHouseClick?:         (house: number) => void
}

export default function DivisionalView({ calc, d1Lagna, d1Planets, d1Degrees = {}, onHouseClick }: Props) {
  const [divN, setDivN]               = useState(9)
  const [visualLagnaHouse, setVLagna] = useState(1)

  const hasPrecise = !!(calc?.lagna?.longitude && calc?.planets)
  const div        = hasPrecise ? computeDivisional(calc, divN) : null
  const selected   = VARGAS.find(v => v.n === divN) ?? VARGAS[4]

  // Retrograde is a property of the planet's actual motion — same across all vargas
  const retrograde: Record<string, boolean> = hasPrecise
    ? Object.fromEntries(
        Object.entries(calc.planets as Record<string, any>)
          .map(([p, v]: [string, any]) => [p, (v.speed ?? 0) < 0])
      )
    : {}

  return (
    <div className="w-full">
      {/* Single controls row — keeps both chart columns starting at the same Y */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold tracking-wider" style={{ color: '#A78BFA' }}>D1 · Rasi</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/</span>
          <span className="text-xs font-bold tracking-wider" style={{ color: '#10B981' }}>{selected.abbr} · {selected.name}</span>
          {visualLagnaHouse !== 1 && (
            <button
              onClick={() => setVLagna(1)}
              className="text-[10px] px-2 py-0.5 rounded transition-colors hover:bg-white/5"
              style={{ color: '#EC4899', border: '1px solid #EC489933' }}>
              ↺ Reset lagna
            </button>
          )}
        </div>
        <select
          value={divN}
          onChange={e => setDivN(Number(e.target.value))}
          className="text-sm font-semibold px-3 py-1.5 rounded-lg outline-none cursor-pointer"
          style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)', minWidth: 160 }}>
          {VARGAS.map(v => (
            <option key={v.n} value={v.n}>{v.abbr} · {v.name}</option>
          ))}
        </select>
      </div>

      {/* Both charts — headers gone, so they start at exactly the same Y */}
      <div className="flex gap-4 w-full">
        <div className="flex-1 min-w-0">
          <NorthIndianKundali
            lagna={d1Lagna}
            planets={d1Planets}
            planetDegrees={d1Degrees}
            planetRetrograde={retrograde}
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
          ) : div ? (
            <NorthIndianKundali
              lagna={div.lagna}
              planets={div.planets}
              planetDegrees={div.planetDegrees}
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
