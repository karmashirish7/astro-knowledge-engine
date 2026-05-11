'use client'

import { useState, useEffect } from 'react'

const PLANET_COLORS: Record<string, string> = {
  Sun: '#F59E0B', Moon: '#E2E8F0', Mars: '#EF4444',
  Mercury: '#10B981', Jupiter: '#F97316', Venus: '#EC4899',
  Saturn: '#6366F1', Rahu: '#8B5CF6', Ketu: '#78716C',
}
const PLANET_ABBR: Record<string, string> = {
  Sun:'Su', Moon:'Mo', Mars:'Ma', Mercury:'Me',
  Jupiter:'Ju', Venus:'Ve', Saturn:'Sa', Rahu:'Ra', Ketu:'Ke',
}
const RASI_SHORT = ['Ar','Ta','Ge','Ca','Le','Vi','Li','Sc','Sa','Cp','Aq','Pi']

interface Props {
  lagna:                number
  planets:              Record<string, number>   // planet → ORIGINAL house number
  planetDegrees?:       Record<string, number>
  planetRetrograde?:    Record<string, boolean>
  onHouseClick?:        (house: number) => void
  highlightAspects?:    boolean
  visualLagnaHouse?:    number                   // which original house is visual house 1 (default 1)
  onVisualLagnaChange?: (originalHouse: number) => void
}

export default function NorthIndianKundali({
  lagna, planets, planetDegrees = {}, planetRetrograde = {}, onHouseClick,
  visualLagnaHouse = 1, onVisualLagnaChange,
}: Props) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [ctxMenu, setCtxMenu] = useState<{ vPos: number; x: number; y: number } | null>(null)

  // Close menu on outside click
  useEffect(() => {
    if (!ctxMenu) return
    const close = () => setCtxMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [ctxMenu])

  const V = Math.max(1, Math.min(12, visualLagnaHouse))
  const isRotated = V !== 1

  // Effective lagna sign after rotation
  const effectiveLagnaSign = ((lagna - 1 + V - 1) % 12) + 1

  // Visual position of actual lagna (original house 1) in rotated view
  const actualLagnaVisualPos = ((1 - V + 12) % 12) + 1

  // Sign at visual position vPos
  const signAtVisualPos = (vPos: number) => ((effectiveLagnaSign - 1 + vPos - 1) % 12) + 1

  // Transform planet original houses → visual positions
  const visualPlanets = Object.fromEntries(
    Object.entries(planets).map(([p, h]) => [p, ((h - V + 12) % 12) + 1])
  )
  const planetsAtVisualPos = (vPos: number) =>
    Object.entries(visualPlanets).filter(([, h]) => h === vPos).map(([p]) => p)

  // Original house of what's shown at visual position vPos
  const originalHouseOf = (vPos: number) => ((vPos - 1 + V - 1) % 12) + 1

  const POLYGONS: Record<number, string> = {
    1:  '200,0   300,100  200,200  100,100',
    2:  '0,0     200,0    100,100',
    3:  '0,0     100,100  0,200',
    4:  '100,100 0,200    100,300  200,200',
    5:  '0,400   0,200    100,300',
    6:  '0,400   100,300  200,400',
    7:  '200,200 100,300  200,400  300,300',
    8:  '400,400 200,400  300,300',
    9:  '400,400 300,300  400,200',
    10: '300,100 400,200  300,300  200,200',
    11: '400,0   400,200  300,100',
    12: '400,0   300,100  200,0',
  }
  const LABEL: Record<number, [number, number]> = {
    1:[200,100], 2:[100,33], 3:[33,100], 4:[100,200],
    5:[33,300], 6:[100,367], 7:[200,300], 8:[300,367],
    9:[367,300], 10:[300,200], 11:[367,100], 12:[300,33],
  }

  const handleContextMenu = (e: React.MouseEvent, vPos: number) => {
    e.preventDefault()
    e.stopPropagation()
    setCtxMenu({ vPos, x: e.clientX, y: e.clientY })
  }

  return (
    <div className="relative">
      <svg
        viewBox="0 0 400 400"
        style={{ display: 'block', width: '100%', borderRadius: 8 }}
      >
        <rect width={400} height={400} fill="#12121C" />

        {/* House fills + borders */}
        {Object.entries(POLYGONS).map(([h, p]) => {
          const vPos = parseInt(h)
          const isVisualLagna   = vPos === 1
          const isActualLagna   = isRotated && vPos === actualLagnaVisualPos
          const fill = isVisualLagna ? 'rgba(124,58,237,0.15)'
                     : hovered === vPos ? 'rgba(255,255,255,0.07)'
                     : isActualLagna ? 'rgba(236,72,153,0.08)'
                     : 'transparent'
          return (
            <polygon
              key={vPos}
              points={p}
              fill={fill}
              stroke={isActualLagna ? '#EC4899' : '#3A3A52'}
              strokeWidth={isActualLagna ? 1.5 : 1}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHovered(vPos)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onHouseClick?.(originalHouseOf(vPos))}
              onContextMenu={e => handleContextMenu(e, vPos)}
            />
          )
        })}

        <rect width={400} height={400} fill="none" stroke="#3A3A52" strokeWidth={1.5} />

        {/* Labels */}
        {Array.from({ length: 12 }, (_, i) => i + 1).map(vPos => {
          const [lx, ly] = LABEL[vPos]
          const signNum  = signAtVisualPos(vPos)
          const ps       = planetsAtVisualPos(vPos)
          const isVLagna = vPos === 1
          const isALagna = isRotated && vPos === actualLagnaVisualPos

          const lineH      = 12
          const extraLines = isALagna ? 1 : 0
          const totalLines = 1 + ps.length + extraLines
          const startY     = ly - (totalLines * lineH) / 2

          return (
            <g key={vPos} style={{ pointerEvents: 'none' }}>
              {/* "As" label for actual ascendant when rotated */}
              {isALagna && (
                <text
                  x={lx} y={startY + lineH * 0.5}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="#EC4899" fontSize={9} fontWeight="700" fontFamily="monospace"
                >
                  As
                </text>
              )}

              {/* Sign number */}
              <text
                x={lx} y={startY + lineH * (isALagna ? 1.5 : 0.5)}
                textAnchor="middle" dominantBaseline="middle"
                fill={isVLagna ? '#A78BFA' : '#4B5563'}
                fontSize={isVLagna ? 12 : 11}
                fontWeight={isVLagna ? '700' : '600'}
                fontFamily="monospace"
              >
                {signNum}
              </text>

              {/* Planets */}
              {ps.map((planet, pi) => {
                const deg    = planetDegrees[planet]
                const abbr   = PLANET_ABBR[planet] ?? planet.slice(0, 2)
                const retro  = planetRetrograde[planet] ?? false
                const core   = deg !== undefined ? `${abbr} ${deg}°` : abbr
                const label  = retro ? `(${core})` : core
                const yOffset = isALagna ? 2.5 + pi : 1.5 + pi
                return (
                  <text
                    key={planet}
                    x={lx} y={startY + lineH * yOffset}
                    textAnchor="middle" dominantBaseline="middle"
                    fill={PLANET_COLORS[planet] ?? '#94A3B8'}
                    fontSize={10} fontWeight="700" fontFamily="monospace"
                  >
                    {label}
                  </text>
                )
              })}
            </g>
          )
        })}
      </svg>

      {/* Right-click context menu */}
      {ctxMenu && onVisualLagnaChange && (
        <div
          className="fixed z-[100] rounded-xl overflow-hidden shadow-2xl"
          style={{
            left: ctxMenu.x, top: ctxMenu.y,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            minWidth: 180,
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-hover)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {`H${originalHouseOf(ctxMenu.vPos)} · ${RASI_SHORT[(signAtVisualPos(ctxMenu.vPos) - 1) % 12]}`}
            </p>
          </div>

          {/* Rotate option */}
          <button
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-left transition-colors hover:bg-white/5"
            style={{ color: '#A78BFA' }}
            onClick={() => {
              const origHouse = originalHouseOf(ctxMenu.vPos)
              onVisualLagnaChange(origHouse)
              setCtxMenu(null)
            }}
          >
            ↑ Show from this house
          </button>

          {/* Reset */}
          {isRotated && (
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-left transition-colors hover:bg-white/5"
              style={{ color: 'var(--text-muted)' }}
              onClick={() => { onVisualLagnaChange(1); setCtxMenu(null) }}
            >
              ↺ Reset to actual lagna
            </button>
          )}
        </div>
      )}
    </div>
  )
}
