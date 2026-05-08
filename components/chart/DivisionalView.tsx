'use client'

import { useState } from 'react'
import NorthIndianKundali from './NorthIndianKundali'
import { VARGAS, computeDivisional } from '@/lib/astrology/divisional'

interface Props {
  calc:          any    // raw calculatedPositions object (parsed JSON)
  d1Lagna:       number // 1–12
  d1Planets:     Record<string, number>
  d1Degrees?:    Record<string, number>
  onHouseClick?: (house: number) => void
}

export default function DivisionalView({ calc, d1Lagna, d1Planets, d1Degrees = {}, onHouseClick }: Props) {
  const [divN, setDivN] = useState(9)

  const hasPrecise = !!(calc?.lagna?.longitude && calc?.planets)

  const div = hasPrecise ? computeDivisional(calc, divN) : null
  const selected = VARGAS.find(v => v.n === divN) ?? VARGAS[4]

  return (
    <div className="w-full">
      {/* Two-chart row */}
      <div className="flex gap-4 w-full">

        {/* D1 — always shown */}
        <div className="flex-1 min-w-0">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider"
              style={{ color: '#A78BFA' }}>
              D1 · Rasi
            </span>
          </div>
          <NorthIndianKundali
            lagna={d1Lagna}
            planets={d1Planets}
            planetDegrees={d1Degrees}
            onHouseClick={onHouseClick}
            highlightAspects={true}
          />
        </div>

        {/* Divisional chart — dropdown driven */}
        <div className="flex-1 min-w-0">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider"
              style={{ color: '#10B981' }}>
              {selected.abbr} · {selected.name}
            </span>
            <select
              value={divN}
              onChange={e => setDivN(Number(e.target.value))}
              className="text-xs px-2 py-0.5 rounded outline-none cursor-pointer"
              style={{
                background: 'var(--bg-hover)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
            >
              {VARGAS.map(v => (
                <option key={v.n} value={v.n}>
                  {v.abbr} · {v.name}
                </option>
              ))}
            </select>
          </div>

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
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
