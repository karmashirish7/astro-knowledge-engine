'use client'

import { useState, useMemo, useEffect } from 'react'
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

function elapsedPct(start: Date, end: Date, now: Date): number {
  const total   = end.getTime() - start.getTime()
  const elapsed = now.getTime() - start.getTime()
  return Math.min(100, Math.max(0, (elapsed / total) * 100))
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function fmtRemaining(end: Date, now: Date): string {
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

function isActive(p: DashaPeriod, now: Date) {
  return now >= p.startDate && now < p.endDate
}

// ── DashaBar ───────────────────────────────────────────────────────────────

interface DashaBarProps {
  level:    string
  planet:   string
  label?:   string
  start:    Date
  end:      Date
  now:      Date
  color:    string
  sublevel?: string
}

function DashaBar({ level, planet, label, start, end, now, color, sublevel }: DashaBarProps) {
  const pct = elapsedPct(start, end, now)
  return (
    <div className="rounded-lg px-4 py-3" style={{ background: 'var(--bg-hover)', border: `1px solid ${color}22` }}>
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--text-muted)' }}>
            {level}
          </span>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
          <span className="text-sm font-bold" style={{ color }}>
            {label ?? planet}
          </span>
          {label && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{planet}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>{fmtRemaining(end, now)} left</span>
          <span>{Math.round(pct)}%</span>
        </div>
      </div>

      <div className="h-2 rounded-full overflow-hidden mb-1.5 relative" style={{ background: 'var(--bg-primary)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
        <div className="absolute top-0 bottom-0 w-0.5 z-10"
          style={{ left: `${pct}%`, background: '#EC4899', boxShadow: '0 0 6px #EC4899', transform: 'translateX(-50%)' }} />
      </div>

      <div className="flex justify-between text-[10px]" style={{ color: 'var(--text-muted)' }}>
        <span>{fmtDate(start)}</span>
        <span className="opacity-60">{fmtDuration((end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000))} total</span>
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
  tree, birthDate, totalYears, label, getLabel, now,
}: {
  tree:       DashaTree
  birthDate:  string
  totalYears: number
  label:      string
  getLabel:   (planet: string) => string
  now:        Date
}) {
  const [zoom, setZoom]         = useState<ZoomLevel>('full')
  const [hoveredMD, setHovered] = useState<DashaTree[0] | null>(null)

  const birth = useMemo(() => new Date(birthDate), [birthDate])
  const viewYears = zoom === 'full' ? totalYears : zoom === '20y' ? 20 : zoom === '10y' ? 10 : zoom === '5y' ? 5 : 1

  const dateToYear = (d: Date | string) =>
    (new Date(d).getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)

  const nowYear = dateToYear(now)

  const timeRange = useMemo(() => {
    if (zoom === 'full') return { start: 0, end: totalYears }
    const half  = viewYears / 2
    const start = Math.max(0, Math.min(totalYears - viewYears, nowYear - half))
    return { start, end: start + viewYears }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, birthDate, totalYears, nowYear])

  const pct = (yr: number) =>
    ((yr - timeRange.start) / (timeRange.end - timeRange.start)) * 100

  const nowPct    = Math.max(0, Math.min(100, pct(nowYear)))
  const nowLabel  = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const isToday   = Math.abs(now.getTime() - new Date().setHours(0,0,0,0)) < 86400000

  const visibleMDs = tree.filter(md => {
    const s = dateToYear(md.startDate)
    const e = dateToYear(md.endDate)
    return e > timeRange.start && s < timeRange.end
  })

  const activeMD = hoveredMD ?? visibleMDs.find(md =>
    nowYear >= dateToYear(md.startDate) && nowYear < dateToYear(md.endDate)
  ) ?? visibleMDs[0]

  const activeAD = activeMD?.antardashas.find((ad: Antardasha) =>
    nowYear >= dateToYear(ad.startDate) && nowYear < dateToYear(ad.endDate)
  )

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
          const yr   = Math.round(timeRange.start + (p / 100) * (timeRange.end - timeRange.start))
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
          const color    = PLANET_COLORS[md.planet] ?? '#94a3b8'
          const isActMD  = activeMD?.planet === md.planet && String(activeMD?.startDate) === String(md.startDate)
          return (
            <div key={md.planet + String(md.startDate)}
              onMouseEnter={() => setHovered(md)} onMouseLeave={() => setHovered(null)}
              className="absolute h-full flex flex-col items-center justify-center overflow-hidden cursor-pointer"
              style={{
                left: `${s}%`, width: `${w}%`,
                background: color + (isActMD ? '55' : '33'),
                borderRight: '1px solid var(--bg-hover)',
                borderTop: isActMD ? `2px solid ${color}` : '2px solid transparent',
              }}>
              {w > 3 && (
                <span className="text-[9px] font-bold px-0.5 truncate leading-tight" style={{ color }}>
                  {getLabel(md.planet)}
                </span>
              )}
            </div>
          )
        })}

        {/* Date marker */}
        <div className="absolute top-0 bottom-0 w-0.5 z-10" style={{ left: `${nowPct}%`, background: '#EC4899' }}>
          <div className="absolute top-0 -translate-x-1/2 flex flex-col items-center" style={{ whiteSpace: 'nowrap' }}>
            <div className="text-[8px] font-bold px-1.5 py-0.5 rounded-t"
              style={{ background: '#EC4899', color: '#fff' }}>
              {isToday ? 'Today' : nowLabel}
            </div>
            {!isToday && (
              <div className="text-[7px] font-semibold px-1 py-0.5 rounded-b"
                style={{ background: '#9D174D', color: '#fce7f3' }}>
                {nowLabel}
              </div>
            )}
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
          const color     = PLANET_COLORS[ad.planet] ?? '#94a3b8'
          const isActAD   = activeAD?.planet === ad.planet && String(activeAD?.startDate) === String(ad.startDate)
          return (
            <div key={ad.planet + String(ad.startDate)}
              className="absolute h-full flex items-center justify-center overflow-hidden"
              style={{
                left: `${s}%`, width: `${w}%`,
                background: color + (isActAD ? '44' : '22'),
                borderRight: '1px solid var(--bg-hover)',
                borderTop: isActAD ? `2px solid ${color}` : '2px solid transparent',
              }}>
              {w > 5 && <span className="text-[8px] px-0.5 truncate" style={{ color }}>{getLabel(ad.planet)}</span>}
            </div>
          )
        })}
        {activeMD?.antardashas.map((ad: Antardasha) => {
          const s = pct(dateToYear(ad.startDate))
          if (s <= 0 || s >= 100) return null
          return <div key={'tick-ad-' + String(ad.startDate)} className="absolute top-0 bottom-0 w-px opacity-40" style={{ left: `${s}%`, background: '#fff' }} />
        })}
        <div className="absolute top-0 bottom-0 w-0.5 z-10" style={{ left: `${nowPct}%`, background: '#EC489988' }} />
      </div>

      {/* PD band — 5y / 1y zoom */}
      {(zoom === '5y' || zoom === '1y') && (() => {
        const activePD_AD = activeMD?.antardashas.find((ad: Antardasha) =>
          nowYear >= dateToYear(ad.startDate) && nowYear < dateToYear(ad.endDate)
        ) ?? activeMD?.antardashas[0]
        const pds = activePD_AD ? computeSubPeriods(activePD_AD) : []
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
              const color    = PLANET_COLORS[pd.planet] ?? '#94a3b8'
              const isActPD  = nowYear >= dateToYear(pd.startDate) && nowYear < dateToYear(pd.endDate)
              return (
                <div key={pd.planet + String(pd.startDate)}
                  className="absolute h-full flex items-center justify-center overflow-hidden"
                  style={{
                    left: `${s}%`, width: `${w}%`,
                    background: color + (isActPD ? '55' : '22'),
                    borderRight: '1px solid var(--bg-hover)',
                    borderTop: isActPD ? `2px solid ${color}` : 'none',
                  }}>
                  {w > 8 && <span className="text-[7px] px-0.5 truncate" style={{ color }}>{getLabel(pd.planet)}</span>}
                </div>
              )
            })}
            {visiblePDs.map(pd => {
              const s = pct(dateToYear(pd.startDate))
              if (s <= 0 || s >= 100) return null
              return <div key={'tick-pd-' + String(pd.startDate)} className="absolute top-0 bottom-0 w-px opacity-30" style={{ left: `${s}%`, background: '#fff' }} />
            })}
            <div className="absolute top-0 bottom-0 w-0.5 z-10" style={{ left: `${nowPct}%`, background: '#EC489988' }} />
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

function fmtShort(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function DashaRow({
  level, period, getLabel, now, hasChildren, expanded, onToggle,
}: {
  level:       DashaLevel
  period:      DashaPeriod
  getLabel:    (p: string) => string
  now:         Date
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
        border: active ? `1px solid ${color}33` : '1px solid transparent',
      }}
      onClick={hasChildren ? onToggle : undefined}
    >
      <span className="w-3 flex-shrink-0 text-[10px]" style={{ color: 'var(--text-muted)' }}>
        {hasChildren ? (expanded ? '▼' : '▶') : '·'}
      </span>

      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />

      <span className="text-xs font-semibold flex-shrink-0" style={{ color: active ? color : 'var(--text-secondary)' }}>
        {getLabel(period.planet)}
      </span>
      {getLabel(period.planet) !== period.planet && (
        <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
          {period.planet}
        </span>
      )}

      <span className="text-[9px] px-1 rounded flex-shrink-0 ml-0.5"
        style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
        {LEVEL_LABELS[level]}
      </span>

      {active && (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
          style={{ background: `${color}33`, color }}>
          ▶ active
        </span>
      )}

      <span className="ml-auto text-[10px] flex-shrink-0 text-right space-x-2" style={{ color: 'var(--text-muted)' }}>
        <span>{fmtShort(period.startDate)}</span>
        <span>→</span>
        <span>{fmtShort(period.endDate)}</span>
        <span style={{ color: active ? color : 'var(--text-muted)' }}>({fmtDuration(period.durationYears)})</span>
      </span>
    </div>
  )
}

function SookshmaRows({
  pd, getLabel, now, openSD, setOpenSD,
}: {
  pd:        DashaPeriod
  getLabel:  (p: string) => string
  now:       Date
  openSD:    Set<string>
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
              hasChildren expanded={sdOpen}
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
                hasChildren={false} expanded={false} onToggle={() => {}}
              />
            ))}
          </div>
        )
      })}
    </>
  )
}

function VimshottariTreeView({ tree, getLabel, now }: { tree: DashaTree; getLabel: (p: string) => string; now: Date }) {
  const activeMd  = tree.find(m => isActive(m, now)) ?? null
  const activeAd  = activeMd?.antardashas.find(a => isActive(a, now)) ?? null
  const activePd  = activeAd?.pratyantardashas.find(p => isActive(p, now)) ?? null

  const mdKey = (m: DashaPeriod) => `${m.planet}|${m.startDate.getTime()}`

  const [openMDs, setOpenMDs] = useState<Set<string>>(() =>
    new Set(activeMd ? [mdKey(activeMd)] : [])
  )
  const [openADs, setOpenADs] = useState<Set<string>>(() =>
    new Set(activeAd ? [mdKey(activeAd)] : [])
  )
  const [openPDs, setOpenPDs] = useState<Set<string>>(() =>
    new Set(activePd ? [mdKey(activePd)] : [])
  )
  const [openSD, setOpenSD] = useState<Set<string>>(() => new Set<string>())

  // When the reference date changes, auto-expand the newly active dasha chain
  useEffect(() => {
    const newActiveMd = tree.find(m => isActive(m, now)) ?? null
    const newActiveAd = newActiveMd?.antardashas.find(a => isActive(a, now)) ?? null
    const newActivePd = newActiveAd?.pratyantardashas.find(p => isActive(p, now)) ?? null

    if (newActiveMd) setOpenMDs(prev => new Set([...prev, mdKey(newActiveMd)]))
    if (newActiveAd) setOpenADs(prev => new Set([...prev, mdKey(newActiveAd)]))
    if (newActivePd) setOpenPDs(prev => new Set([...prev, mdKey(newActivePd)]))
  }, [now, tree])

  const toggle = (set: Set<string>, key: string, setter: (fn: (p: Set<string>) => Set<string>) => void) => {
    setter(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-hover)' }}>
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Full Dasha Tree · MD → AD → PD → SD → Prana
        </span>
        <div className="flex gap-1">
          <button onClick={() => setOpenMDs(new Set(tree.map(m => mdKey(m))))}
            className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
            Expand All MD
          </button>
          <button onClick={() => { setOpenMDs(new Set()); setOpenADs(new Set()); setOpenPDs(new Set()); setOpenSD(new Set()) }}
            className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
            Collapse All
          </button>
        </div>
      </div>

      <div className="p-2 space-y-0.5 max-h-[600px] overflow-y-auto">
        {tree.map(md => {
          const mKey   = mdKey(md)
          const mdOpen = openMDs.has(mKey)
          return (
            <div key={mKey}>
              <DashaRow
                level="MD" period={md} getLabel={getLabel} now={now}
                hasChildren expanded={mdOpen}
                onToggle={() => toggle(openMDs, mKey, setOpenMDs)}
              />
              {mdOpen && md.antardashas.map(ad => {
                const aKey   = mdKey(ad)
                const adOpen = openADs.has(aKey)
                return (
                  <div key={aKey}>
                    <DashaRow
                      level="AD" period={ad} getLabel={getLabel} now={now}
                      hasChildren expanded={adOpen}
                      onToggle={() => toggle(openADs, aKey, setOpenADs)}
                    />
                    {adOpen && ad.pratyantardashas.map(pd => {
                      const pKey   = mdKey(pd)
                      const pdOpen = openPDs.has(pKey)
                      return (
                        <div key={pKey}>
                          <DashaRow
                            level="PD" period={pd} getLabel={getLabel} now={now}
                            hasChildren expanded={pdOpen}
                            onToggle={() => toggle(openPDs, pKey, setOpenPDs)}
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

function YoginiTreeView({ tree, now }: { tree: DashaTree; now: Date }) {
  const activeMd     = tree.find(m => isActive(m, now)) ?? null
  const defaultMdKey = activeMd ? `${activeMd.planet}|${activeMd.startDate.getTime()}` : ''
  const [openMDs, setOpenMDs] = useState<Set<string>>(() => new Set(defaultMdKey ? [defaultMdKey] : []))

  useEffect(() => {
    const newActiveMd = tree.find(m => isActive(m, now)) ?? null
    if (newActiveMd) {
      const k = `${newActiveMd.planet}|${newActiveMd.startDate.getTime()}`
      setOpenMDs(prev => new Set([...prev, k]))
    }
  }, [now, tree])

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
          const k      = `${md.planet}|${md.startDate.getTime()}`
          const mdOpen = openMDs.has(k)
          return (
            <div key={k}>
              <DashaRow
                level="MD" period={md} getLabel={yoginiForPlanet} now={now}
                hasChildren expanded={mdOpen}
                onToggle={() => setOpenMDs(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n })}
              />
              {mdOpen && md.antardashas.map(ad => (
                <DashaRow
                  key={`${ad.planet}|${ad.startDate.getTime()}`}
                  level="AD" period={ad} getLabel={yoginiForPlanet} now={now}
                  hasChildren={false} expanded={false} onToggle={() => {}}
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

function toIso(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default function DashaView({ vimshottariTree, yoginiTree, birthDate }: Props) {
  const [tab,        setTab]     = useState<'vimsho' | 'yogini'>('vimsho')
  const todayIso                 = toIso(new Date())
  const [dateInput,  setDateInput] = useState(todayIso)

  const refDate = useMemo(() => {
    const d = new Date(dateInput)
    return isNaN(d.getTime()) ? new Date() : d
  }, [dateInput])

  const isToday = dateInput === todayIso

  // Vimshottari periods at refDate
  const vMd = vimshottariTree?.find(m => refDate >= m.startDate && refDate < m.endDate) ?? null
  const vAd = vMd?.antardashas.find(a => refDate >= a.startDate && refDate < a.endDate) ?? null
  const vPd = vAd?.pratyantardashas.find(p => refDate >= p.startDate && refDate < p.endDate) ?? null

  // Yogini periods at refDate
  const yMd = yoginiTree?.find(m => refDate >= m.startDate && refDate < m.endDate) ?? null
  const yAd = yMd?.antardashas.find(a => refDate >= a.startDate && refDate < a.endDate) ?? null

  const hasVimsho = !!(vimshottariTree && vimshottariTree.length > 0)
  const hasYogini = !!(yoginiTree && yoginiTree.length > 0)

  return (
    <div className="space-y-4">
      {/* Tabs + date picker */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-hover)' }}>
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

        {/* Reference date picker */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Reference date
          </label>
          <input
            type="date"
            value={dateInput}
            onChange={e => setDateInput(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          {!isToday && (
            <button
              onClick={() => setDateInput(todayIso)}
              className="text-[10px] px-2 py-1.5 rounded-lg transition-colors"
              style={{ background: '#EC489920', color: '#EC4899', border: '1px solid #EC489933' }}>
              ↺ Today
            </button>
          )}
        </div>
      </div>

      {/* ── Vimshottari ── */}
      {tab === 'vimsho' && (
        hasVimsho ? (
          <div className="space-y-2">
            {vMd && (
              <DashaBar level="Mahadasha" planet={vMd.planet}
                start={vMd.startDate} end={vMd.endDate} now={refDate}
                color={PLANET_COLORS[vMd.planet] ?? '#94a3b8'} />
            )}
            {vAd && (
              <DashaBar level="Antardasha" planet={vAd.planet}
                start={vAd.startDate} end={vAd.endDate} now={refDate}
                color={PLANET_COLORS[vAd.planet] ?? '#94a3b8'} />
            )}
            {vPd && (
              <DashaBar level="Pratyantar (PD)" planet={vPd.planet}
                start={vPd.startDate} end={vPd.endDate} now={refDate}
                color={PLANET_COLORS[vPd.planet] ?? '#94a3b8'} />
            )}

            <div className="rounded-xl p-4 mt-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <TimelineStrip
                tree={vimshottariTree!}
                birthDate={birthDate}
                totalYears={120}
                label="Vimshottari timeline"
                getLabel={p => p}
                now={refDate}
              />
            </div>

            <VimshottariTreeView tree={vimshottariTree!} getLabel={p => p} now={refDate} />
          </div>
        ) : <Empty />
      )}

      {/* ── Yogini ── */}
      {tab === 'yogini' && (
        hasYogini ? (
          <div className="space-y-2">
            {yMd && (
              <DashaBar level="Mahadasha" planet={yMd.planet} label={yoginiForPlanet(yMd.planet)}
                start={yMd.startDate} end={yMd.endDate} now={refDate}
                color={PLANET_COLORS[yMd.planet] ?? '#94a3b8'} />
            )}
            {yAd && (
              <DashaBar level="Antardasha" planet={yAd.planet} label={yoginiForPlanet(yAd.planet)}
                start={yAd.startDate} end={yAd.endDate} now={refDate}
                color={PLANET_COLORS[yAd.planet] ?? '#94a3b8'} />
            )}

            <div className="flex flex-wrap gap-x-3 gap-y-1 px-1">
              {YOGINI_SEQUENCE.map(({ yogini, planet, years }) => (
                <span key={yogini} className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: PLANET_COLORS[planet] ?? '#94a3b8' }} />
                  {yogini} · {planet} · {years}y
                </span>
              ))}
            </div>

            <div className="rounded-xl p-4 mt-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <TimelineStrip
                tree={yoginiTree!}
                birthDate={birthDate}
                totalYears={72}
                label="Yogini timeline · 2 cycles"
                getLabel={yoginiForPlanet}
                now={refDate}
              />
            </div>

            <YoginiTreeView tree={yoginiTree!} now={refDate} />
          </div>
        ) : <Empty />
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
