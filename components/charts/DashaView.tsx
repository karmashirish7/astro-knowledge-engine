'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { DashaTree, Antardasha, DashaPeriod } from '@/lib/astrology/dasha/types'
import { yoginiForPlanet, YOGINI_SEQUENCE } from '@/lib/astrology/dasha/yogini'
import { computeSubPeriods } from '@/lib/astrology/dasha/vimshottari'

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

      {/* Progress bar with today pointer */}
      <div className="h-2 rounded-full overflow-hidden mb-1.5 relative" style={{ background: 'var(--bg-primary)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
        {/* Today marker — glowing pin at current position */}
        <div className="absolute top-0 bottom-0 w-0.5 z-10"
          style={{ left: `${pct}%`, background: '#EC4899', boxShadow: '0 0 6px #EC4899', transform: 'translateX(-50%)' }} />
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

type ZoomLevel = 'full' | '20y' | '10y' | '5y' | '1y'

function TimelineStrip({
  tree, birthDate, totalYears, label, getLabel,
}: {
  tree:       DashaTree
  birthDate:  string
  totalYears: number
  label:      string
  getLabel:   (planet: string) => string
}) {
  const [zoom, setZoom]         = useState<ZoomLevel>('full')
  const [hoveredMD, setHovered] = useState<DashaTree[0] | null>(null)

  const birth = useMemo(() => new Date(birthDate), [birthDate])
  const viewYears = zoom === 'full' ? totalYears : zoom === '20y' ? 20 : zoom === '10y' ? 10 : zoom === '5y' ? 5 : 1

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
          {(['full', '20y', '10y', '5y', '1y'] as ZoomLevel[]).map(z => (
            <button key={z} onClick={() => setZoom(z)}
              className="px-2 py-0.5 rounded text-[10px] font-semibold transition-colors"
              style={{ background: zoom === z ? '#7C3AED33' : 'var(--bg-hover)', color: zoom === z ? '#A78BFA' : 'var(--text-muted)' }}>
              {z === 'full' ? 'All' : z}
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
      <div className="relative h-6 rounded-lg overflow-hidden mb-0.5" style={{ background: 'var(--bg-primary)' }}>
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
          const isActiveAD = todayYear >= dateToYear(ad.startDate) && todayYear < dateToYear(ad.endDate)
          return (
            <div key={ad.planet + String(ad.startDate)}
              className="absolute h-full flex items-center justify-center overflow-hidden"
              style={{
                left: `${s}%`, width: `${w}%`,
                background: color + (isActiveAD ? '44' : '22'),
                borderRight: '1px solid var(--bg-hover)',
                borderTop: isActiveAD ? `2px solid ${color}` : '2px solid transparent',
              }}>
              {w > 5 && <span className="text-[8px] px-0.5 truncate" style={{ color }}>{getLabel(ad.planet)}</span>}
            </div>
          )
        })}
        {/* AD change tick marks */}
        {activeMD?.antardashas.map((ad: Antardasha) => {
          const s = pct(dateToYear(ad.startDate))
          if (s <= 0 || s >= 100) return null
          return <div key={'tick-ad-' + String(ad.startDate)} className="absolute top-0 bottom-0 w-px opacity-40" style={{ left: `${s}%`, background: '#fff' }} />
        })}
        <div className="absolute top-0 bottom-0 w-0.5 z-10" style={{ left: `${todayPct}%`, background: '#EC489988' }} />
      </div>

      {/* PD band — shown for 5y and 1y zoom */}
      {(zoom === '5y' || zoom === '1y') && (() => {
        const activeAD = activeMD?.antardashas.find((ad: Antardasha) =>
          todayYear >= dateToYear(ad.startDate) && todayYear < dateToYear(ad.endDate)
        ) ?? activeMD?.antardashas[0]
        const pds = activeAD ? computeSubPeriods(activeAD) : []
        const visiblePDs = pds.filter(pd => {
          const s = dateToYear(pd.startDate)
          const e = dateToYear(pd.endDate)
          return e > timeRange.start && s < timeRange.end
        })
        return (
          <div className="relative h-4 rounded-lg overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
            {visiblePDs.map(pd => {
              const s = Math.max(0, pct(dateToYear(pd.startDate)))
              const e = Math.min(100, pct(dateToYear(pd.endDate)))
              const w = e - s
              if (w <= 0) return null
              const color = PLANET_COLORS[pd.planet] ?? '#94a3b8'
              const isActivePD = todayYear >= dateToYear(pd.startDate) && todayYear < dateToYear(pd.endDate)
              return (
                <div key={pd.planet + String(pd.startDate)}
                  className="absolute h-full flex items-center justify-center overflow-hidden"
                  style={{
                    left: `${s}%`, width: `${w}%`,
                    background: color + (isActivePD ? '55' : '22'),
                    borderRight: '1px solid var(--bg-hover)',
                  }}>
                  {w > 8 && <span className="text-[7px] px-0.5 truncate" style={{ color }}>{getLabel(pd.planet)}</span>}
                </div>
              )
            })}
            {/* PD change tick marks */}
            {visiblePDs.map(pd => {
              const s = pct(dateToYear(pd.startDate))
              if (s <= 0 || s >= 100) return null
              return <div key={'tick-pd-' + String(pd.startDate)} className="absolute top-0 bottom-0 w-px opacity-30" style={{ left: `${s}%`, background: '#fff' }} />
            })}
            <div className="absolute top-0 bottom-0 w-0.5 z-10" style={{ left: `${todayPct}%`, background: '#EC489988' }} />
          </div>
        )
      })()}
    </div>
  )
}

// ── Nested Dasha Tree ──────────────────────────────────────────────────────

type DashaLevel = 'MD' | 'AD' | 'PD' | 'SD' | 'Prana'

const LEVEL_LABELS: Record<DashaLevel, string> = {
  MD: 'Mahadasha', AD: 'Antardasha', PD: 'Pratyantar', SD: 'Sookshma', Prana: 'Prana',
}
const INDENT: Record<DashaLevel, number> = {
  MD: 0, AD: 16, PD: 32, SD: 48, Prana: 64,
}

function isActive(p: DashaPeriod, now: Date) {
  return now >= p.startDate && now < p.endDate
}

function fmtShort(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// A single expandable row in the tree
function DashaRow({
  level, period, getLabel, now, depth, hasChildren,
  expanded, onToggle,
}: {
  level:       DashaLevel
  period:      DashaPeriod
  getLabel:    (p: string) => string
  now:         Date
  depth:       number
  hasChildren: boolean
  expanded:    boolean
  onToggle:    () => void
}) {
  const active = isActive(period, now)
  const color  = PLANET_COLORS[period.planet] ?? '#94a3b8'
  const past   = period.endDate <= now

  return (
    <div
      className="flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer select-none transition-colors"
      style={{
        marginLeft: INDENT[level],
        background: active ? `${color}18` : 'transparent',
        opacity: past ? 0.45 : 1,
      }}
      onClick={hasChildren ? onToggle : undefined}
    >
      {/* Expand toggle */}
      <span className="w-3 flex-shrink-0 text-[10px]" style={{ color: 'var(--text-muted)' }}>
        {hasChildren ? (expanded ? '▼' : '▶') : '·'}
      </span>

      {/* Color dot */}
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />

      {/* Planet / label */}
      <span className="text-xs font-semibold flex-shrink-0" style={{ color: active ? color : 'var(--text-secondary)' }}>
        {getLabel(period.planet)}
      </span>
      {getLabel(period.planet) !== period.planet && (
        <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
          {period.planet}
        </span>
      )}

      {/* Level badge */}
      <span className="text-[9px] px-1 rounded flex-shrink-0 ml-0.5"
        style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
        {LEVEL_LABELS[level]}
      </span>

      {/* Active badge */}
      {active && (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
          style={{ background: `${color}33`, color }}>
          ▶ now
        </span>
      )}

      {/* Dates + duration */}
      <span className="ml-auto text-[10px] flex-shrink-0 text-right space-x-2" style={{ color: 'var(--text-muted)' }}>
        <span>{fmtShort(period.startDate)}</span>
        <span>→</span>
        <span>{fmtShort(period.endDate)}</span>
        <span style={{ color: active ? color : 'var(--text-muted)' }}>
          ({fmtDuration(period.durationYears)})
        </span>
      </span>
    </div>
  )
}

// Recursive SD + Prana rows
function SookshmaRows({
  pd, getLabel, now, openSD, setOpenSD,
}: {
  pd:       DashaPeriod
  getLabel: (p: string) => string
  now:      Date
  openSD:   Set<string>
  setOpenSD: (fn: (prev: Set<string>) => Set<string>) => void
}) {
  const sds = useMemo(() => computeSubPeriods(pd), [pd])
  return (
    <>
      {sds.map(sd => {
        const sdKey  = `${sd.planet}|${sd.startDate.getTime()}`
        const sdOpen = openSD.has(sdKey)
        const pranas = sdOpen ? computeSubPeriods(sd) : null
        return (
          <div key={sdKey}>
            <DashaRow
              level="SD" period={sd} getLabel={getLabel} now={now}
              depth={4} hasChildren expanded={sdOpen}
              onToggle={() => setOpenSD(prev => {
                const next = new Set(prev)
                next.has(sdKey) ? next.delete(sdKey) : next.add(sdKey)
                return next
              })}
            />
            {sdOpen && pranas && pranas.map(pr => (
              <DashaRow
                key={`${pr.planet}|${pr.startDate.getTime()}`}
                level="Prana" period={pr} getLabel={getLabel} now={now}
                depth={5} hasChildren={false} expanded={false}
                onToggle={() => {}}
              />
            ))}
          </div>
        )
      })}
    </>
  )
}

function VimshottariTreeView({ tree, getLabel }: { tree: DashaTree; getLabel: (p: string) => string }) {
  const now = useMemo(() => new Date(), [])

  // Default open: currently running MD and AD
  const activeMdIdx = tree.findIndex(m => isActive(m, now))
  const activeMd    = activeMdIdx >= 0 ? tree[activeMdIdx] : null
  const activeAd    = activeMd?.antardashas.find(a => isActive(a, now)) ?? null

  const defaultMdKey = activeMd ? `${activeMd.planet}|${activeMd.startDate.getTime()}` : ''
  const defaultAdKey = activeAd ? `${activeAd.planet}|${activeAd.startDate.getTime()}` : ''

  const [openMDs, setOpenMDs] = useState<Set<string>>(() => new Set(defaultMdKey ? [defaultMdKey] : []))
  const [openADs, setOpenADs] = useState<Set<string>>(() => new Set(defaultAdKey ? [defaultAdKey] : []))
  const [openPDs, setOpenPDs] = useState<Set<string>>(() => new Set<string>())
  const [openSD,  setOpenSD]  = useState<Set<string>>(() => new Set<string>())

  const toggle = (set: Set<string>, key: string, setter: (fn: (p: Set<string>) => Set<string>) => void) => {
    setter(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-hover)' }}>
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Full Dasha Tree · MD → AD → PD → SD → Prana
        </span>
        <div className="flex gap-1">
          <button onClick={() => { setOpenMDs(new Set(tree.map(m => `${m.planet}|${m.startDate.getTime()}`))); }}
            className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
            Expand All MD
          </button>
          <button onClick={() => { setOpenMDs(new Set()); setOpenADs(new Set()); setOpenPDs(new Set()); setOpenSD(new Set()) }}
            className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
            Collapse All
          </button>
        </div>
      </div>

      {/* Rows */}
      <div className="p-2 space-y-0.5 max-h-[600px] overflow-y-auto">
        {tree.map(md => {
          const mdKey  = `${md.planet}|${md.startDate.getTime()}`
          const mdOpen = openMDs.has(mdKey)
          return (
            <div key={mdKey}>
              <DashaRow
                level="MD" period={md} getLabel={getLabel} now={now}
                depth={1} hasChildren expanded={mdOpen}
                onToggle={() => toggle(openMDs, mdKey, setOpenMDs)}
              />
              {mdOpen && md.antardashas.map(ad => {
                const adKey  = `${ad.planet}|${ad.startDate.getTime()}`
                const adOpen = openADs.has(adKey)
                return (
                  <div key={adKey}>
                    <DashaRow
                      level="AD" period={ad} getLabel={getLabel} now={now}
                      depth={2} hasChildren expanded={adOpen}
                      onToggle={() => toggle(openADs, adKey, setOpenADs)}
                    />
                    {adOpen && ad.pratyantardashas.map(pd => {
                      const pdKey  = `${pd.planet}|${pd.startDate.getTime()}`
                      const pdOpen = openPDs.has(pdKey)
                      return (
                        <div key={pdKey}>
                          <DashaRow
                            level="PD" period={pd} getLabel={getLabel} now={now}
                            depth={3} hasChildren expanded={pdOpen}
                            onToggle={() => toggle(openPDs, pdKey, setOpenPDs)}
                          />
                          {pdOpen && (
                            <SookshmaRows
                              pd={pd} getLabel={getLabel} now={now}
                              openSD={openSD} setOpenSD={setOpenSD}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function YoginiTreeView({ tree }: { tree: DashaTree }) {
  const now    = useMemo(() => new Date(), [])
  const activeMd = tree.find(m => isActive(m, now)) ?? null
  const defaultMdKey = activeMd ? `${activeMd.planet}|${activeMd.startDate.getTime()}` : ''
  const [openMDs, setOpenMDs] = useState<Set<string>>(() => new Set(defaultMdKey ? [defaultMdKey] : []))

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-hover)' }}>
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Full Yogini Tree · MD → AD
        </span>
        <div className="flex gap-1">
          <button onClick={() => setOpenMDs(new Set(tree.map(m => `${m.planet}|${m.startDate.getTime()}`)))}
            className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
            Expand All
          </button>
          <button onClick={() => setOpenMDs(new Set())}
            className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
            Collapse All
          </button>
        </div>
      </div>
      <div className="p-2 space-y-0.5 max-h-[600px] overflow-y-auto">
        {tree.map(md => {
          const mdKey  = `${md.planet}|${md.startDate.getTime()}`
          const mdOpen = openMDs.has(mdKey)
          return (
            <div key={mdKey}>
              <DashaRow
                level="MD" period={md} getLabel={yoginiForPlanet} now={now}
                depth={1} hasChildren expanded={mdOpen}
                onToggle={() => setOpenMDs(prev => { const n = new Set(prev); n.has(mdKey) ? n.delete(mdKey) : n.add(mdKey); return n })}
              />
              {mdOpen && md.antardashas.map(ad => (
                <DashaRow
                  key={`${ad.planet}|${ad.startDate.getTime()}`}
                  level="AD" period={ad} getLabel={yoginiForPlanet} now={now}
                  depth={2} hasChildren={false} expanded={false}
                  onToggle={() => {}}
                />
              ))}
            </div>
          )
        })}
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

            {/* Full nested tree */}
            <VimshottariTreeView tree={vimshottariTree!} getLabel={p => p} />
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

            {/* Full nested tree */}
            <YoginiTreeView tree={yoginiTree!} />
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
