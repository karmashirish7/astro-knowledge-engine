'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { DashaTree, Antardasha } from '@/lib/astrology/dasha/types'
import { yoginiForPlanet, YOGINI_SEQUENCE } from '@/lib/astrology/dasha/yogini'

// ── Constants ──────────────────────────────────────────────────────────────

const PLANET_COLORS: Record<string, string> = {
  Ketu:    '#78716C', Venus:   '#EC4899', Sun:     '#F59E0B',
  Moon:    '#E2E8F0', Mars:    '#EF4444', Rahu:    '#8B5CF6',
  Jupiter: '#F97316', Saturn:  '#6366F1', Mercury: '#10B981',
}

// ── Helpers ────────────────────────────────────────────────────────────────

function elapsedPct(start: Date, end: Date, now = new Date()): number {
  const total   = end.getTime() - start.getTime()
  const elapsed = now.getTime() - start.getTime()
  return Math.min(100, Math.max(0, (elapsed / total) * 100))
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function fmtRemaining(end: Date, now = new Date()): string {
  const ms = end.getTime() - now.getTime()
  if (ms <= 0) return 'ended'
  const days   = ms / (24 * 60 * 60 * 1000)
  if (days < 14)  return `${Math.round(days)}d`
  if (days < 60)  return `${Math.round(days / 7)}w`
  const months = days / 30.44
  if (months < 12) return `${Math.round(months)}m`
  const years  = days / 365.25
  const yPart  = Math.floor(years)
  const mPart  = Math.round((years - yPart) * 12)
  return mPart === 0 ? `${yPart}y` : `${yPart}y ${mPart}m`
}

function fmtDuration(years: number): string {
  const y = Math.floor(years)
  const m = Math.round((years - y) * 12)
  if (y === 0) return `${m}m`
  return m === 0 ? `${y}y` : `${y}y ${m}m`
}

// ── DashaBar ───────────────────────────────────────────────────────────────

interface DashaBarProps {
  level:    string
  planet:   string
  label?:   string       // e.g. yogini name
  start:    Date
  end:      Date
  pct:      number
  color:    string
  sublevel?: string      // e.g. "Antardasha" hint text
}

function DashaBar({ level, planet, label, start, end, pct, color, sublevel }: DashaBarProps) {
  return (
    <div className="rounded-lg px-4 py-3" style={{ background: 'var(--bg-hover)', border: `1px solid ${color}22` }}>
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-muted)' }}>
            {level}
          </span>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
          <span className="text-sm font-bold" style={{ color }}>
            {label ? `${label}` : planet}
          </span>
          {label && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{planet}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>{fmtRemaining(end)} left</span>
          <span>{Math.round(pct)}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full overflow-hidden mb-1.5" style={{ background: 'var(--bg-primary)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      <div className="flex justify-between text-[10px]" style={{ color: 'var(--text-muted)' }}>
        <span>{fmtDate(start)}</span>
        <span className="opacity-60">{fmtDuration(end.getTime() - start.getTime() > 0 ? (end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000) : 0)} total</span>
        <span>{fmtDate(end)}</span>
      </div>
      {sublevel && (
        <p className="text-[10px] mt-1 opacity-50" style={{ color: 'var(--text-muted)' }}>{sublevel}</p>
      )}
    </div>
  )
}

// ── Timeline strip ─────────────────────────────────────────────────────────

type ZoomLevel = 'full' | '20y' | '5y'

function TimelineStrip({
  tree, birthDate, totalYears, label, getLabel,
}: {
  tree:       DashaTree
  birthDate:  string
  totalYears: number
  label:      string
  getLabel:   (planet: string) => string
}) {
  const [zoom, setZoom]       = useState<ZoomLevel>('full')
  const [hoveredMD, setHovered] = useState<DashaTree[0] | null>(null)

  const birth    = useMemo(() => new Date(birthDate), [birthDate])
  const viewYears = zoom === 'full' ? totalYears : zoom === '20y' ? 20 : 5

  const dateToYear = (d: Date | string) =>
    (new Date(d).getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)

  const timeRange = useMemo(() => {
    const todayY = dateToYear(new Date())
    if (zoom === 'full') return { start: 0, end: totalYears }
    const half  = viewYears / 2
    const start = Math.max(0, Math.min(totalYears - viewYears, todayY - half))
    return { start, end: start + viewYears }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, birthDate, totalYears])

  const pct = (yr: number) =>
    ((yr - timeRange.start) / (timeRange.end - timeRange.start)) * 100

  const todayPct  = Math.max(0, Math.min(100, pct(dateToYear(new Date()))))
  const todayYear = dateToYear(new Date())

  const visibleMDs = tree.filter(md => {
    const s = dateToYear(md.startDate)
    const e = dateToYear(md.endDate)
    return e > timeRange.start && s < timeRange.end
  })

  const activeMD = hoveredMD ?? visibleMDs.find(md => {
    const s = dateToYear(md.startDate)
    const e = dateToYear(md.endDate)
    return todayYear >= s && todayYear < e
  }) ?? visibleMDs[0]

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <div className="flex gap-1">
          {(['full', '20y', '5y'] as ZoomLevel[]).map(z => (
            <button key={z} onClick={() => setZoom(z)}
              className="px-2 py-0.5 rounded text-[10px] font-semibold transition-colors"
              style={{ background: zoom === z ? '#7C3AED33' : 'var(--bg-hover)', color: zoom === z ? '#A78BFA' : 'var(--text-muted)' }}>
              {z === 'full' ? 'Full' : z}
            </button>
          ))}
        </div>
      </div>

      {/* Axis */}
      <div className="relative h-4 mb-0.5">
        {[0, 25, 50, 75, 100].map(p => {
          const yr = Math.round(timeRange.start + (p / 100) * (timeRange.end - timeRange.start))
          const date = new Date(birth.getTime() + yr * 365.25 * 24 * 60 * 60 * 1000)
          return (
            <span key={p} className="absolute text-[9px] -translate-x-1/2" style={{ left: `${p}%`, color: 'var(--text-muted)' }}>
              {date.getFullYear()}
            </span>
          )
        })}
      </div>

      {/* MD band */}
      <div className="relative h-10 rounded-lg overflow-hidden mb-0.5" style={{ background: 'var(--bg-primary)' }}>
        {visibleMDs.map(md => {
          const s = Math.max(0, pct(dateToYear(md.startDate)))
          const e = Math.min(100, pct(dateToYear(md.endDate)))
          const w = e - s
          if (w <= 0) return null
          const color = PLANET_COLORS[md.planet] ?? '#94a3b8'
          const isActive = activeMD?.planet === md.planet && String(activeMD?.startDate) === String(md.startDate)
          return (
            <div key={md.planet + String(md.startDate)}
              onMouseEnter={() => setHovered(md)} onMouseLeave={() => setHovered(null)}
              className="absolute h-full flex flex-col items-center justify-center overflow-hidden cursor-pointer"
              style={{
                left: `${s}%`, width: `${w}%`,
                background: color + (isActive ? '55' : '33'),
                borderRight: '1px solid var(--bg-hover)',
                borderTop: isActive ? `2px solid ${color}` : '2px solid transparent',
              }}>
              {w > 3 && (
                <span className="text-[9px] font-bold px-0.5 truncate leading-tight" style={{ color }}>
                  {getLabel(md.planet)}
                </span>
              )}
              {w > 5 && getLabel(md.planet) !== md.planet && (
                <span className="text-[8px] px-0.5 truncate opacity-60 leading-tight" style={{ color }}>
                  {md.planet}
                </span>
              )}
            </div>
          )
        })}
        <div className="absolute top-0 bottom-0 w-0.5 z-10" style={{ left: `${todayPct}%`, background: '#EC4899' }}>
          <div className="absolute top-0 -translate-x-1/2 text-[8px] font-bold px-1 rounded" style={{ background: '#EC4899', color: '#fff', whiteSpace: 'nowrap' }}>
            now
          </div>
        </div>
      </div>

      {/* AD band */}
      <div className="relative h-6 rounded-lg overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
        {activeMD?.antardashas.filter((ad: Antardasha) => {
          const s = dateToYear(ad.startDate)
          const e = dateToYear(ad.endDate)
          return e > timeRange.start && s < timeRange.end
        }).map((ad: Antardasha) => {
          const s = Math.max(0, pct(dateToYear(ad.startDate)))
          const e = Math.min(100, pct(dateToYear(ad.endDate)))
          const w = e - s
          if (w <= 0) return null
          const color = PLANET_COLORS[ad.planet] ?? '#94a3b8'
          return (
            <div key={ad.planet + String(ad.startDate)}
              className="absolute h-full flex items-center justify-center overflow-hidden"
              style={{ left: `${s}%`, width: `${w}%`, background: color + '33', borderRight: '1px solid var(--bg-hover)' }}>
              {w > 5 && <span className="text-[8px] px-0.5 truncate" style={{ color }}>{getLabel(ad.planet)}</span>}
            </div>
          )
        })}
        <div className="absolute top-0 bottom-0 w-0.5" style={{ left: `${todayPct}%`, background: '#EC489966' }} />
      </div>
    </div>
  )
}

// ── Main DashaView ─────────────────────────────────────────────────────────

interface Props {
  vimshottariTree?: DashaTree | null
  yoginiTree?:      DashaTree | null
  birthDate:        string
}

export default function DashaView({ vimshottariTree, yoginiTree, birthDate }: Props) {
  const [tab, setTab] = useState<'vimsho' | 'yogini'>('vimsho')
  const now = new Date()

  // ── Vimshottari current periods
  const vMd = vimshottariTree?.find(m => now >= m.startDate && now < m.endDate) ?? null
  const vAd = vMd?.antardashas.find(a => now >= a.startDate && now < a.endDate) ?? null
  const vPd = vAd?.pratyantardashas.find(p => now >= p.startDate && now < p.endDate) ?? null

  // ── Yogini current periods
  const yMd = yoginiTree?.find(m => now >= m.startDate && now < m.endDate) ?? null
  const yAd = yMd?.antardashas.find(a => now >= a.startDate && now < a.endDate) ?? null

  const hasVimsho = !!(vimshottariTree && vimshottariTree.length > 0)
  const hasYogini = !!(yoginiTree && yoginiTree.length > 0)

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--bg-hover)' }}>
        <button onClick={() => setTab('vimsho')}
          className="px-4 py-1.5 rounded-md text-xs font-semibold transition-colors"
          style={{ background: tab === 'vimsho' ? '#7C3AED' : 'transparent', color: tab === 'vimsho' ? '#fff' : 'var(--text-muted)' }}>
          Vimshottari · 120y
        </button>
        <button onClick={() => setTab('yogini')}
          className="px-4 py-1.5 rounded-md text-xs font-semibold transition-colors"
          style={{ background: tab === 'yogini' ? '#7C3AED' : 'transparent', color: tab === 'yogini' ? '#fff' : 'var(--text-muted)' }}>
          Yogini · 36y
        </button>
      </div>

      {/* ── Vimshottari ── */}
      {tab === 'vimsho' && (
        hasVimsho ? (
          <div className="space-y-2">
            {/* Completion bars */}
            {vMd && (
              <DashaBar
                level="Mahadasha"
                planet={vMd.planet}
                start={vMd.startDate}
                end={vMd.endDate}
                pct={elapsedPct(vMd.startDate, vMd.endDate)}
                color={PLANET_COLORS[vMd.planet] ?? '#94a3b8'}
              />
            )}
            {vAd && (
              <DashaBar
                level="Antardasha"
                planet={vAd.planet}
                start={vAd.startDate}
                end={vAd.endDate}
                pct={elapsedPct(vAd.startDate, vAd.endDate)}
                color={PLANET_COLORS[vAd.planet] ?? '#94a3b8'}
              />
            )}
            {vPd && (
              <DashaBar
                level="Pratyantar (PD)"
                planet={vPd.planet}
                start={vPd.startDate}
                end={vPd.endDate}
                pct={elapsedPct(vPd.startDate, vPd.endDate)}
                color={PLANET_COLORS[vPd.planet] ?? '#94a3b8'}
              />
            )}

            {/* Timeline strips */}
            <div className="rounded-xl p-4 mt-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <TimelineStrip
                tree={vimshottariTree!}
                birthDate={birthDate}
                totalYears={120}
                label="Vimshottari timeline"
                getLabel={p => p}
              />
            </div>
          </div>
        ) : (
          <Empty />
        )
      )}

      {/* ── Yogini ── */}
      {tab === 'yogini' && (
        hasYogini ? (
          <div className="space-y-2">
            {yMd && (
              <DashaBar
                level="Mahadasha"
                planet={yMd.planet}
                label={yoginiForPlanet(yMd.planet)}
                start={yMd.startDate}
                end={yMd.endDate}
                pct={elapsedPct(yMd.startDate, yMd.endDate)}
                color={PLANET_COLORS[yMd.planet] ?? '#94a3b8'}
              />
            )}
            {yAd && (
              <DashaBar
                level="Antardasha"
                planet={yAd.planet}
                label={yoginiForPlanet(yAd.planet)}
                start={yAd.startDate}
                end={yAd.endDate}
                pct={elapsedPct(yAd.startDate, yAd.endDate)}
                color={PLANET_COLORS[yAd.planet] ?? '#94a3b8'}
              />
            )}

            {/* Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 px-1">
              {YOGINI_SEQUENCE.map(({ yogini, planet, years }) => (
                <span key={yogini} className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: PLANET_COLORS[planet] ?? '#94a3b8' }} />
                  {yogini} · {planet} · {years}y
                </span>
              ))}
            </div>

            {/* Timeline strips */}
            <div className="rounded-xl p-4 mt-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <TimelineStrip
                tree={yoginiTree!}
                birthDate={birthDate}
                totalYears={72}
                label="Yogini timeline · 2 cycles"
                getLabel={yoginiForPlanet}
              />
            </div>
          </div>
        ) : (
          <Empty />
        )
      )}
    </div>
  )
}

function Empty() {
  return (
    <div className="flex items-center justify-center h-40 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        No dasha data — enter birth date, time and coordinates to calculate.
      </p>
    </div>
  )
}
