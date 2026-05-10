'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { DashaTree, Mahadasha, Antardasha } from '@/lib/astrology/dasha/types'

const PLANET_COLORS: Record<string, string> = {
  Ketu:    '#78716C', Venus:   '#EC4899', Sun:     '#F59E0B',
  Moon:    '#E2E8F0', Mars:    '#EF4444', Rahu:    '#8B5CF6',
  Jupiter: '#F97316', Saturn:  '#6366F1', Mercury: '#10B981',
}

type ZoomLevel = 'life' | '20y' | '5y'

interface OverlayEvent {
  date: string
  label: string
  type: 'event' | 'prediction' | 'observation'
}

interface Props {
  tree:      DashaTree
  birthDate: string
  events?:   OverlayEvent[]
}

export default function DashaTimeline({ tree, birthDate, events = [] }: Props) {
  const [zoom, setZoom]       = useState<ZoomLevel>('life')
  const [hoveredMD, setHovered] = useState<Mahadasha | null>(null)
  const [viewStart, setViewStart] = useState(0) // years from birth

  const birth = new Date(birthDate)

  const viewYears = zoom === 'life' ? 120 : zoom === '20y' ? 20 : 5

  const timeRange = useMemo(() => {
    const today     = new Date()
    const todayYear = (today.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)

    if (zoom === 'life') return { start: 0, end: 120 }
    // Center around today for zoomed views
    const half  = viewYears / 2
    const start = Math.max(0, Math.min(120 - viewYears, todayYear - half))
    return { start, end: start + viewYears }
  }, [zoom, birthDate])

  const pct = (yearOffset: number) =>
    ((yearOffset - timeRange.start) / (timeRange.end - timeRange.start)) * 100

  const yearToDate = (yearOffset: number) => new Date(birth.getTime() + yearOffset * 365.25 * 24 * 60 * 60 * 1000)
  const dateToYear = (d: Date | string) => (new Date(d).getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)

  const todayNow   = new Date()
  const todayPct   = Math.max(0, Math.min(100, pct(dateToYear(todayNow))))
  const todayLabel = todayNow.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  const visibleMDs = tree.filter(md => {
    const s = dateToYear(md.startDate)
    const e = dateToYear(md.endDate)
    return e > timeRange.start && s < timeRange.end
  })

  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Vimshottari Dasha Timeline</h3>
        <div className="flex gap-1">
          {(['life', '20y', '5y'] as ZoomLevel[]).map(z => (
            <button key={z} onClick={() => setZoom(z)}
              className="px-2.5 py-1 rounded text-xs font-semibold transition-colors"
              style={{ background: zoom === z ? '#7C3AED33' : 'var(--bg-hover)', color: zoom === z ? '#7C3AED' : 'var(--text-muted)' }}>
              {z === 'life' ? 'Full Life' : z}
            </button>
          ))}
        </div>
      </div>

      {/* Year axis labels */}
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
      <div className="relative h-12 rounded-lg overflow-hidden mb-1" style={{ background: 'var(--bg-hover)' }}>
        {visibleMDs.map(md => {
          const s = Math.max(0, pct(dateToYear(md.startDate)))
          const e = Math.min(100, pct(dateToYear(md.endDate)))
          const w = e - s
          if (w <= 0) return null
          return (
            <motion.div key={md.planet + md.startDate}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              onMouseEnter={() => setHovered(md)} onMouseLeave={() => setHovered(null)}
              className="absolute h-full flex items-center justify-center overflow-hidden cursor-pointer transition-all"
              style={{
                left:       `${s}%`,
                width:      `${w}%`,
                background: PLANET_COLORS[md.planet] + '55',
                borderRight:'1px solid var(--bg-primary)',
              }}>
              {w > 4 && (
                <span className="text-[10px] font-bold px-1 truncate" style={{ color: PLANET_COLORS[md.planet] }}>
                  {md.planet}
                </span>
              )}
            </motion.div>
          )
        })}

        {/* Today marker */}
        <div className="absolute top-0 bottom-0 w-0.5 z-10" style={{ left: `${todayPct}%`, background: '#EC4899' }} />
      </div>

      {/* AD band (shown when MD hovered) */}
      <div className="relative h-8 rounded-lg overflow-hidden mb-1" style={{ background: 'var(--bg-hover)' }}>
        {(hoveredMD ?? visibleMDs.find(md => {
          const s = dateToYear(md.startDate)
          const e = dateToYear(md.endDate)
          const now = dateToYear(new Date())
          return now >= s && now < e
        }) ?? visibleMDs[0])?.antardashas.filter((ad: Antardasha) => {
          const s = dateToYear(ad.startDate)
          const e = dateToYear(ad.endDate)
          return e > timeRange.start && s < timeRange.end
        }).map((ad: Antardasha) => {
          const s = Math.max(0, pct(dateToYear(ad.startDate)))
          const e = Math.min(100, pct(dateToYear(ad.endDate)))
          const w = e - s
          if (w <= 0) return null
          return (
            <div key={ad.planet + ad.startDate}
              className="absolute h-full flex items-center justify-center overflow-hidden"
              style={{ left: `${s}%`, width: `${w}%`, background: PLANET_COLORS[ad.planet] + '44', borderRight: '1px solid var(--bg-primary)' }}>
              {w > 5 && <span className="text-[9px] px-0.5 truncate" style={{ color: PLANET_COLORS[ad.planet] }}>{ad.planet}</span>}
            </div>
          )
        })}
        {/* Today marker */}
        <div className="absolute top-0 bottom-0 w-0.5" style={{ left: `${todayPct}%`, background: '#EC489988' }} />
      </div>

      {/* Event overlays */}
      {events.length > 0 && (
        <div className="relative h-4 mb-2">
          {events.map((ev, i) => {
            const yr  = dateToYear(ev.date)
            const p   = pct(yr)
            if (p < 0 || p > 100) return null
            const color = ev.type === 'prediction' ? '#EC4899' : ev.type === 'observation' ? '#F59E0B' : '#10B981'
            return (
              <div key={i} className="absolute -translate-x-1/2 group"
                style={{ left: `${p}%` }}>
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden group-hover:block z-20
                  text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap"
                  style={{ background: 'var(--bg-primary)', border: `1px solid ${color}`, color }}>
                  {ev.label}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-3">
        {Object.entries(PLANET_COLORS).map(([p, c]) => (
          <span key={p} className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: c }} />{p}
          </span>
        ))}
      </div>
    </div>
  )
}
