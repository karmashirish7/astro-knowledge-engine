'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { DashaTree, Antardasha } from '@/lib/astrology/dasha/types'
import { yoginiForPlanet, YOGINI_SEQUENCE } from '@/lib/astrology/dasha/yogini'

const PLANET_COLORS: Record<string, string> = {
  Moon:    '#E2E8F0',
  Sun:     '#F59E0B',
  Jupiter: '#F97316',
  Mars:    '#EF4444',
  Mercury: '#10B981',
  Saturn:  '#6366F1',
  Venus:   '#EC4899',
  Rahu:    '#8B5CF6',
}

type ZoomLevel = '72y' | '36y' | '10y'

interface Props {
  tree:      DashaTree
  birthDate: string
}

export default function YoginiTimeline({ tree, birthDate }: Props) {
  const [zoom, setZoom]     = useState<ZoomLevel>('72y')
  const [hoveredMD, setHovered] = useState<(typeof tree)[0] | null>(null)

  const birth = useMemo(() => new Date(birthDate), [birthDate])

  const viewYears = zoom === '72y' ? 72 : zoom === '36y' ? 36 : 10

  const dateToYear = (d: Date | string) =>
    (new Date(d).getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)

  const timeRange = useMemo(() => {
    const today     = new Date()
    const todayYear = dateToYear(today)

    if (zoom === '72y') return { start: 0, end: 72 }
    const half  = viewYears / 2
    const start = Math.max(0, Math.min(72 - viewYears, todayYear - half))
    return { start, end: start + viewYears }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, birthDate])

  const pct = (yearOffset: number) =>
    ((yearOffset - timeRange.start) / (timeRange.end - timeRange.start)) * 100

  const yearToDate = (yearOffset: number) =>
    new Date(birth.getTime() + yearOffset * 365.25 * 24 * 60 * 60 * 1000)

  const todayYear = dateToYear(new Date())
  const todayPct  = Math.max(0, Math.min(100, pct(todayYear)))

  const visibleMDs = tree.filter(md => {
    const s = dateToYear(md.startDate)
    const e = dateToYear(md.endDate)
    return e > timeRange.start && s < timeRange.end
  })

  // Active MD = the one containing today, or first visible
  const activeMD = hoveredMD ?? visibleMDs.find(md => {
    const s = dateToYear(md.startDate)
    const e = dateToYear(md.endDate)
    return todayYear >= s && todayYear < e
  }) ?? visibleMDs[0]

  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Yogini Dasha Timeline</h3>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>36-year cycle · Moon nakshatra based</p>
        </div>
        <div className="flex gap-1">
          {(['72y', '36y', '10y'] as ZoomLevel[]).map(z => (
            <button key={z} onClick={() => setZoom(z)}
              className="px-2.5 py-1 rounded text-xs font-semibold transition-colors"
              style={{ background: zoom === z ? '#7C3AED33' : 'var(--bg-hover)', color: zoom === z ? '#A78BFA' : 'var(--text-muted)' }}>
              {z === '72y' ? '2 Cycles' : z}
            </button>
          ))}
        </div>
      </div>

      {/* Year axis */}
      <div className="relative h-5 mb-1">
        {[0, 25, 50, 75, 100].map(p => {
          const yr = Math.round(timeRange.start + (p / 100) * (timeRange.end - timeRange.start))
          return (
            <span key={p} className="absolute text-[10px] -translate-x-1/2"
              style={{ left: `${p}%`, color: 'var(--text-muted)' }}>
              {yr}y / {yearToDate(yr).getFullYear()}
            </span>
          )
        })}
      </div>

      {/* MD band */}
      <div className="relative h-14 rounded-lg overflow-hidden mb-1" style={{ background: 'var(--bg-hover)' }}>
        {visibleMDs.map(md => {
          const s = Math.max(0, pct(dateToYear(md.startDate)))
          const e = Math.min(100, pct(dateToYear(md.endDate)))
          const w = e - s
          if (w <= 0) return null
          const color   = PLANET_COLORS[md.planet] ?? '#94a3b8'
          const yogini  = yoginiForPlanet(md.planet)
          const isActive = activeMD?.planet === md.planet && activeMD?.startDate === md.startDate
          return (
            <motion.div key={md.planet + String(md.startDate)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              onMouseEnter={() => setHovered(md)} onMouseLeave={() => setHovered(null)}
              className="absolute h-full flex flex-col items-center justify-center overflow-hidden cursor-pointer"
              style={{
                left:        `${s}%`,
                width:       `${w}%`,
                background:  color + (isActive ? '66' : '44'),
                borderRight: '1px solid var(--bg-primary)',
                borderTop:   isActive ? `2px solid ${color}` : '2px solid transparent',
              }}>
              {w > 3 && (
                <>
                  <span className="text-[10px] font-bold px-1 truncate leading-tight" style={{ color }}>
                    {yogini}
                  </span>
                  {w > 6 && (
                    <span className="text-[9px] px-1 truncate opacity-70 leading-tight" style={{ color }}>
                      {md.planet}
                    </span>
                  )}
                </>
              )}
            </motion.div>
          )
        })}

        {/* Today marker */}
        <div className="absolute top-0 bottom-0 w-0.5 z-10" style={{ left: `${todayPct}%`, background: '#EC4899' }}>
          <div className="absolute -top-0.5 -translate-x-1/2 text-[10px] font-bold px-1 rounded"
            style={{ background: '#EC4899', color: '#fff', whiteSpace: 'nowrap' }}>today</div>
        </div>
      </div>

      {/* AD band */}
      <div className="relative h-8 rounded-lg overflow-hidden mb-3" style={{ background: 'var(--bg-hover)' }}>
        {activeMD?.antardashas.filter((ad: Antardasha) => {
          const s = dateToYear(ad.startDate)
          const e = dateToYear(ad.endDate)
          return e > timeRange.start && s < timeRange.end
        }).map((ad: Antardasha) => {
          const s = Math.max(0, pct(dateToYear(ad.startDate)))
          const e = Math.min(100, pct(dateToYear(ad.endDate)))
          const w = e - s
          if (w <= 0) return null
          const color  = PLANET_COLORS[ad.planet] ?? '#94a3b8'
          const yogini = yoginiForPlanet(ad.planet)
          return (
            <div key={ad.planet + String(ad.startDate)}
              className="absolute h-full flex items-center justify-center overflow-hidden"
              style={{ left: `${s}%`, width: `${w}%`, background: color + '33', borderRight: '1px solid var(--bg-primary)' }}>
              {w > 5 && (
                <span className="text-[9px] px-0.5 truncate" style={{ color }}>
                  {yogini}
                </span>
              )}
            </div>
          )
        })}
        <div className="absolute top-0 bottom-0 w-0.5" style={{ left: `${todayPct}%`, background: '#EC489988' }} />
      </div>

      {/* Current dasha info */}
      {(() => {
        const now = new Date()
        const md  = tree.find(m => now >= m.startDate && now < m.endDate)
        const ad  = md?.antardashas.find(a => now >= a.startDate && now < a.endDate)
        if (!md || !ad) return null
        const mdEnd = new Date(md.endDate)
        const adEnd = new Date(ad.endDate)
        const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        return (
          <div className="flex gap-3 mb-3">
            <div className="flex-1 rounded-lg px-3 py-2" style={{ background: 'var(--bg-hover)', border: `1px solid ${PLANET_COLORS[md.planet]}44` }}>
              <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Mahadasha</p>
              <p className="text-sm font-bold" style={{ color: PLANET_COLORS[md.planet] }}>{yoginiForPlanet(md.planet)}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{md.planet} · until {fmtDate(mdEnd)}</p>
            </div>
            <div className="flex-1 rounded-lg px-3 py-2" style={{ background: 'var(--bg-hover)', border: `1px solid ${PLANET_COLORS[ad.planet]}44` }}>
              <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>Antardasha</p>
              <p className="text-sm font-bold" style={{ color: PLANET_COLORS[ad.planet] }}>{yoginiForPlanet(ad.planet)}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{ad.planet} · until {fmtDate(adEnd)}</p>
            </div>
          </div>
        )
      })()}

      {/* Legend — yogini name + planet */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {YOGINI_SEQUENCE.map(({ yogini, planet, years }) => (
          <span key={yogini} className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: PLANET_COLORS[planet] ?? '#94a3b8' }} />
            {yogini} · {planet} · {years}y
          </span>
        ))}
      </div>
    </div>
  )
}
