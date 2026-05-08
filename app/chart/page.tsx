'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Plus, Search, CircleDot, ExternalLink, Sparkles, X,
  AlertCircle, BookOpen, FileText, Trash2, MapPin,
} from 'lucide-react'
import DivisionalView from '@/components/chart/DivisionalView'
import Modal from '@/components/ui/Modal'
import { searchCities, type City } from '@/lib/cities'

// ── Constants ──────────────────────────────────────────────────────────────

const PLANET_COLORS: Record<string, string> = {
  Sun: '#F59E0B', Moon: '#C8D4E0', Mars: '#EF4444',
  Mercury: '#10B981', Jupiter: '#F97316', Venus: '#EC4899',
  Saturn: '#6366F1', Rahu: '#8B5CF6', Ketu: '#78716C',
}
const PLANET_LIST = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu']
const RASHIS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']
const HOUSE_NAMES = ['Lagna','Dhana','Sahaja','Sukha','Putra','Ripu','Yuvati','Randhra','Dharma','Karma','Labha','Vyaya']

const EMPTY_FORM = {
  name: '', birthDate: '', birthTime: '', birthPlace: '',
  birthLat: '', birthLon: '', timezone: '+05:30', tags: '', keywords: '',
}

// ── Helpers ────────────────────────────────────────────────────────────────

const parseJ = (s: string, fallback: any = {}) => { try { return JSON.parse(s || '{}') } catch { return fallback } }
const parseArr = (s: string): string[] => { try { return JSON.parse(s || '[]') } catch { return [] } }

// ── Chart List Card ────────────────────────────────────────────────────────

function ChartCard({ chart, active, onClick, onDelete }: { chart: any; active: boolean; onClick: () => void; onDelete: () => void }) {
  const tags = parseArr(chart.tagsList)
  const calc = parseJ(chart.calculatedPositions)
  const lagnaSign = calc?.lagnaSign ? RASHIS[calc.lagnaSign - 1] : null
  const moonSign  = calc?.planets?.Moon?.sign ?? null

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="p-3 rounded-xl cursor-pointer transition-all group"
      style={{
        background: active ? 'rgba(16,185,129,0.08)' : 'transparent',
        border: `1px solid ${active ? '#10B98155' : 'var(--border)'}`,
        marginBottom: 6,
      }}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{chart.name}</p>
          {(chart.birthDate || chart.birthPlace) && (
            <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
              {chart.birthDate}{chart.birthTime ? ` · ${chart.birthTime.slice(0, 5)}` : ''}
              {chart.birthPlace ? ` · ${chart.birthPlace}` : ''}
            </p>
          )}
          {(lagnaSign || moonSign) && (
            <div className="flex gap-2 mt-1.5">
              {lagnaSign && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: '#10B98118', color: '#10B981' }}>
                  {lagnaSign}
                </span>
              )}
              {moonSign && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: '#C8D4E018', color: '#C8D4E0' }}>
                  ☽ {moonSign}
                </span>
              )}
            </div>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {tags.slice(0, 3).map((t: string) => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>{t}</span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 transition-all flex-shrink-0 mt-0.5"
          title="Delete chart">
          <Trash2 className="w-3.5 h-3.5" style={{ color: '#EF4444' }} />
        </button>
      </div>
    </motion.div>
  )
}

// ── Positions Table ────────────────────────────────────────────────────────

function PositionsTable({ calc }: { calc: any }) {
  if (!calc?.planets) return null
  return (
    <div className="w-full max-w-lg mt-5 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
      <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Swiss Ephemeris · Lahiri · Geocentric · Mean Nodes
          </p>
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Ayanamsa {parseFloat(calc.ayanamsa ?? 0).toFixed(3)}°
          </p>
        </div>
      </div>

      {/* Lagna row */}
      <div className="flex items-center px-4 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="text-xs font-bold w-16" style={{ color: '#10B981' }}>Lagna</span>
        <span className="text-sm font-semibold flex-1" style={{ color: 'var(--text-primary)' }}>{calc.lagna?.formatted}</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{RASHIS[(calc.lagnaSign ?? 1) - 1]}</span>
      </div>

      {/* Planet rows — two-column grid */}
      <div className="grid grid-cols-2 divide-x" style={{ borderColor: 'var(--border)' }}>
        {PLANET_LIST.map((p, i) => {
          const pos = calc.planets?.[p]
          if (!pos) return null
          const h = calc.houseNumbers?.[p]
          const isRight = i % 2 === 1
          const isLast = i >= PLANET_LIST.length - 2
          return (
            <div key={p}
              className="flex items-center px-4 py-2"
              style={{
                borderColor: 'var(--border)',
                borderBottom: isLast ? 'none' : '1px solid var(--border)',
                borderRight: isRight ? 'none' : undefined,
              }}>
              <span className="text-xs font-bold w-5 flex-shrink-0" style={{ color: PLANET_COLORS[p] }}>
                {p.slice(0, 2)}
              </span>
              <span className="text-xs flex-1 ml-2" style={{ color: 'var(--text-secondary)' }}>{pos.formatted}</span>
              <span className="text-xs font-semibold flex-shrink-0 ml-2" style={{ color: '#7C3AED' }}>
                H{h}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── House Detail Panel ─────────────────────────────────────────────────────

function HousePanel({ house, planets, entries, dictums, onClose }: {
  house: number; planets: string[]; entries: any[]; dictums: any[]; onClose: () => void
}) {
  return (
    <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }}
      className="w-72 flex-shrink-0 flex flex-col border-l overflow-hidden"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div>
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            House {house} · {HOUSE_NAMES[house - 1]}
          </h3>
          <div className="flex flex-wrap gap-1 mt-1">
            {planets.length === 0
              ? <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Empty</span>
              : planets.map(p => (
                  <span key={p} className="text-xs px-2 py-0.5 rounded-md font-semibold"
                    style={{ background: `${PLANET_COLORS[p]}20`, color: PLANET_COLORS[p] }}>
                    {p}
                  </span>
                ))}
          </div>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#1E1E2A] transition-colors ml-2">
          <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {entries.length === 0 && dictums.length === 0 && (
          <p className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>
            No related knowledge found.<br />Add notes in the Knowledge Base.
          </p>
        )}

        {entries.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <BookOpen className="w-3 h-3" style={{ color: '#7C3AED' }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Knowledge</span>
            </div>
            {entries.slice(0, 5).map((e: any) => (
              <div key={e.id} className="p-2.5 rounded-lg mb-1.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{e.title}</p>
                {e.description && (
                  <p className="text-[10px] mt-0.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{e.description}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {dictums.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <FileText className="w-3 h-3" style={{ color: '#EC4899' }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Dictums</span>
            </div>
            {dictums.slice(0, 4).map((d: any) => (
              <div key={d.id} className="p-2.5 rounded-lg mb-1.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <p className="text-xs italic leading-relaxed" style={{ color: 'var(--text-secondary)' }}>"{d.rule}"</p>
                <span className="text-[10px] mt-1 inline-block font-medium" style={{ color: '#EC4899' }}>{d.strength}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── City Search ────────────────────────────────────────────────────────────

function CitySearch({ onSelect }: { onSelect: (city: City) => void }) {
  const [query, setQuery]   = useState('')
  const [results, setResults] = useState<City[]>([])
  const [open, setOpen]     = useState(false)
  const ref                 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setResults(searchCities(query))
    setOpen(query.length > 0)
  }, [query])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const pick = (city: City) => {
    onSelect(city)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
        City / Place Search
      </label>
      <div className="relative">
        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Type city name… e.g. Mumbai, London, Kathmandu"
          className="w-full pl-8 pr-3 py-2.5 rounded-lg text-sm outline-none"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          onFocus={() => query && setOpen(true)}
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {results.map((city, i) => (
            <button key={i} onClick={() => pick(city)}
              className="w-full text-left flex items-center justify-between px-3 py-2 border-b last:border-0 transition-colors hover:bg-[#1E1E2A]"
              style={{ borderColor: 'var(--border)' }}>
              <div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{city.name}</span>
                {city.state && <span className="text-xs ml-1.5" style={{ color: 'var(--text-muted)' }}>{city.state},</span>}
                <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>{city.country}</span>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <span className="text-[10px] font-mono" style={{ color: '#7C3AED' }}>{city.tz}</span>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {city.lat.toFixed(2)}°, {city.lon.toFixed(2)}°
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      {open && results.length === 0 && query.length > 1 && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl px-3 py-2.5 text-xs"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          No cities found — enter lat/lon manually below
        </div>
      )}
    </div>
  )
}

// ── New Chart Modal ────────────────────────────────────────────────────────

function NewChartModal({ open, onClose, onSaved }: {
  open: boolean; onClose: () => void; onSaved: (chart: any) => void
}) {
  const [form, setForm]       = useState(EMPTY_FORM)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [preview, setPreview] = useState<any | null>(null)
  const [previewing, setPV]   = useState(false)
  const f = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleCitySelect = (city: import('@/lib/cities').City) => {
    setForm(prev => ({
      ...prev,
      birthPlace: `${city.name}${city.state ? ', ' + city.state : ''}, ${city.country}`,
      birthLat:   String(city.lat),
      birthLon:   String(city.lon),
      timezone:   city.tz,
    }))
    setPreview(null)
  }

  const canCalculate = !!(form.birthDate && form.birthTime && form.birthLat && form.birthLon)

  const handlePreview = async () => {
    if (!canCalculate) return
    setPV(true); setPreview(null); setError(null)
    try {
      const res = await fetch('/api/ephemeris', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.birthDate, time: form.birthTime,
          timezone: form.timezone, lat: Number(form.birthLat), lon: Number(form.birthLon),
        }),
      })
      const d = await res.json()
      if (d.error) setError(d.error)
      else setPreview(d)
    } catch (e: any) { setError(e.message) }
    finally { setPV(false) }
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, birthDate: form.birthDate, birthTime: form.birthTime,
          birthPlace: form.birthPlace, birthLat: form.birthLat, birthLon: form.birthLon,
          timezone: form.timezone,
          keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean),
          tagsList:  form.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Save failed'); return }
      setForm(EMPTY_FORM); setPreview(null); setError(null)
      onSaved(data)
    } catch (e: any) { setError(e.message || 'Save failed') }
    finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Chart">
      <div className="space-y-3">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Name *</label>
          <input value={form.name} onChange={f('name')} placeholder="e.g. Ramesh Kumar"
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
        </div>

        {/* Date + Time */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Birth Date</label>
            <input type="date" value={form.birthDate} onChange={f('birthDate')}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Birth Time</label>
            <input type="time" step="1" value={form.birthTime} onChange={f('birthTime')}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>
        </div>

        {/* City search */}
        <CitySearch onSelect={handleCitySelect} />

        {/* Place display / manual override */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Birth Place <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(auto-filled or type manually)</span>
          </label>
          <input value={form.birthPlace} onChange={f('birthPlace')} placeholder="e.g. Mumbai, Maharashtra, India"
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
        </div>

        {/* Lat / Lon / TZ — auto-filled by city picker, manual override allowed */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Latitude</label>
            <input value={form.birthLat} onChange={f('birthLat')} placeholder="27.7172"
              className="w-full px-2.5 py-2.5 rounded-lg text-sm outline-none font-mono"
              style={{
                background: form.birthLat ? '#10B98110' : 'var(--bg-hover)',
                border: `1px solid ${form.birthLat ? '#10B98140' : 'var(--border)'}`,
                color: form.birthLat ? '#10B981' : 'var(--text-primary)',
              }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Longitude</label>
            <input value={form.birthLon} onChange={f('birthLon')} placeholder="85.3240"
              className="w-full px-2.5 py-2.5 rounded-lg text-sm outline-none font-mono"
              style={{
                background: form.birthLon ? '#10B98110' : 'var(--bg-hover)',
                border: `1px solid ${form.birthLon ? '#10B98140' : 'var(--border)'}`,
                color: form.birthLon ? '#10B981' : 'var(--text-primary)',
              }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Timezone</label>
            <input value={form.timezone} onChange={f('timezone')} placeholder="+05:45"
              className="w-full px-2.5 py-2.5 rounded-lg text-sm outline-none font-mono"
              style={{
                background: form.timezone ? '#7C3AED10' : 'var(--bg-hover)',
                border: `1px solid ${form.timezone ? '#7C3AED40' : 'var(--border)'}`,
                color: form.timezone ? '#A78BFA' : 'var(--text-primary)',
              }} />
          </div>
        </div>
        {!form.birthLat && (
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            ↑ Search a city above to auto-fill coordinates, or enter lat/lon manually.
            Exact coordinates are required for Swiss Ephemeris calculation.
          </p>
        )}

        {/* Tags */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Tags (comma-separated)</label>
          <input value={form.tags} onChange={f('tags')} placeholder="male, politician, late marriage"
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
        </div>

        {/* Divider */}
        <div className="border-t" style={{ borderColor: 'var(--border)' }} />

        {/* Preview button */}
        {canCalculate && !preview && (
          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            onClick={handlePreview} disabled={previewing}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'rgba(16,185,129,0.08)', color: '#10B981', border: '1px solid #10B98130' }}>
            {previewing
              ? <><div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />Calculating…</>
              : <>Preview positions via Swiss Ephemeris</>}
          </motion.button>
        )}

        {/* Preview result */}
        {preview && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-3 space-y-1.5" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid #10B98130' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold" style={{ color: '#10B981' }}>✓ Calculated — Lahiri Sidereal</p>
              <button onClick={() => setPreview(null)} className="text-xs" style={{ color: 'var(--text-muted)' }}>Reset</button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <div className="flex justify-between">
                <span className="text-xs font-semibold" style={{ color: '#10B981' }}>Lagna</span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{preview.lagna?.formatted}</span>
              </div>
              {PLANET_LIST.map(p => {
                const pos = preview.planets?.[p]
                if (!pos) return null
                return (
                  <div key={p} className="flex justify-between gap-2">
                    <span className="text-xs font-medium flex-shrink-0" style={{ color: PLANET_COLORS[p] }}>{p.slice(0,2)}</span>
                    <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{pos.formatted}</span>
                    <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: '#7C3AED' }}>H{preview.houseNumbers?.[p]}</span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#EF4444' }} />
            <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>
          </div>
        )}

        {/* Save button */}
        <motion.button
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          onClick={handleSave}
          disabled={saving || !form.name.trim()}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: '#10B981' }}>
          {saving
            ? <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving{canCalculate ? ' & Calculating' : ''}…
              </span>
            : canCalculate ? 'Calculate & Save Chart' : 'Save Chart'}
        </motion.button>
      </div>
    </Modal>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function ChartPage() {
  const [charts, setCharts]         = useState<any[]>([])
  const [selected, setSelected]     = useState<any | null>(null)
  const [housePanel, setHousePanel] = useState<{ house: number; planets: string[]; entries: any[]; dictums: any[] } | null>(null)
  const [addOpen, setAddOpen]       = useState(false)
  const [search, setSearch]         = useState('')
  const [reading, setReading]       = useState<string | null>(null)
  const [readingLoading, setRL]     = useState(false)
  const [readingError, setRE]       = useState<string | null>(null)
  const [manualPlanets, setMP]      = useState<Record<string, number>>({})
  const [manualLagna, setML]        = useState(1)

  const load = useCallback(async () => {
    const data = await fetch('/api/chart').then(r => r.json())
    setCharts(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => { load() }, [load])

  const selectChart = (c: any) => {
    setSelected(c); setHousePanel(null); setReading(null); setRE(null)
    setMP({}); setML(parseInt(c.lagna) || 1)
  }

  // Derived state
  const calc          = selected ? parseJ(selected.calculatedPositions) : {}
  const hasPrecise    = !!(calc?.planets)
  const storedPlanets = selected ? parseJ(selected.planets, {}) : {}
  const activePlanets = Object.keys(manualPlanets).length > 0 ? manualPlanets : storedPlanets
  const activeLagna   = Object.keys(manualPlanets).length > 0 ? manualLagna : (parseInt(selected?.lagna) || 1)

  const filtered = charts.filter(c => {
    if (!search) return true
    const tags = parseArr(c.tagsList)
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.birthPlace.toLowerCase().includes(q) ||
           tags.some((t: string) => t.toLowerCase().includes(q))
  })

  // ── House click
  const handleHouseClick = async (house: number) => {
    setReading(null); setRE(null)
    const planets = Object.entries(activePlanets).filter(([, h]) => h === house).map(([p]) => p)
    setHousePanel({ house, planets, entries: [], dictums: [] })
    if (planets.length === 0) return
    try {
      const { entries, dictums } = await fetch(`/api/search?q=${encodeURIComponent(planets.join(' '))}`).then(r => r.json())
      setHousePanel({ house, planets, entries: entries || [], dictums: dictums || [] })
    } catch {}
  }

  // ── AI reading
  const handleReading = async () => {
    if (Object.keys(activePlanets).length === 0) return
    setRL(true); setReading(null); setRE(null); setHousePanel(null)
    try {
      const res = await fetch('/api/chart/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chartId: selected?.id, planets: activePlanets, lagna: activeLagna }),
      })
      const data = await res.json()
      if (data.error) setRE(data.error)
      else setReading(data.reading)
    } catch (e: any) { setRE(e.message) }
    finally { setRL(false) }
  }

  // ── Delete
  const handleDelete = async () => {
    if (!selected || !confirm(`Delete "${selected.name}"?`)) return
    await fetch(`/api/chart/${selected.id}`, { method: 'DELETE' })
    setSelected(null); setHousePanel(null); setReading(null)
    load()
  }

  const handleDeleteChart = async (chart: any) => {
    if (!confirm(`Delete "${chart.name}"?`)) return
    await fetch(`/api/chart/${chart.id}`, { method: 'DELETE' })
    if (selected?.id === chart.id) { setSelected(null); setHousePanel(null); setReading(null) }
    load()
  }

  return (
    <div className="h-screen flex" style={{ background: 'var(--bg-primary)' }}>

      {/* ── LEFT: Chart List ─────────────────────────────────────────────── */}
      <div className="w-64 flex-shrink-0 flex flex-col border-r" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Charts</h1>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{ background: '#10B981' }}>
              <Plus className="w-3.5 h-3.5" /> New
            </motion.button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search charts…"
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <CircleDot className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {search ? 'No results' : 'No charts yet'}
              </p>
              {!search && (
                <button onClick={() => setAddOpen(true)} className="text-xs mt-2" style={{ color: '#10B981' }}>
                  Create first chart →
                </button>
              )}
            </div>
          ) : filtered.map(c => (
            <ChartCard key={c.id} chart={c} active={selected?.id === c.id} onClick={() => selectChart(c)} onDelete={() => handleDeleteChart(c)} />
          ))}
        </div>
      </div>

      {/* ── CENTER: Kundali ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {!selected ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <CircleDot className="w-12 h-12" style={{ color: '#10B981', opacity: 0.5 }} />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>No chart selected</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Select a chart from the list or create a new one
              </p>
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: '#10B981' }}>
              <Plus className="w-4 h-4" /> Create New Chart
            </motion.button>
          </div>
        ) : (
          <>
            {/* Top bar */}
            <div className="px-6 py-3 border-b flex-shrink-0 flex items-center gap-3"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                    {selected.name}
                  </h2>
                  {hasPrecise && (
                    <span className="text-xs px-2 py-0.5 rounded-md font-medium flex-shrink-0"
                      style={{ background: '#10B98118', color: '#10B981' }}>
                      {RASHIS[(calc.lagnaSign ?? 1) - 1]} Lagna
                    </span>
                  )}
                </div>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  {selected.birthDate}
                  {selected.birthTime ? ` · ${selected.birthTime}` : ''}
                  {selected.timezone ? ` ${selected.timezone}` : ''}
                  {selected.birthPlace ? ` · ${selected.birthPlace}` : ''}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link href={`/chart/${selected.id}`}>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: 'rgba(124,58,237,0.12)', color: '#A78BFA', border: '1px solid #7C3AED33' }}>
                    <ExternalLink className="w-3.5 h-3.5" /> Notes
                  </motion.button>
                </Link>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={handleReading}
                  disabled={readingLoading || Object.keys(activePlanets).length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40"
                  style={{ background: 'rgba(124,58,237,0.12)', color: '#A78BFA', border: '1px solid #7C3AED33' }}>
                  {readingLoading
                    ? <><div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" /> Reading…</>
                    : <><Sparkles className="w-3.5 h-3.5" /> AI Reading</>}
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={handleDelete}
                  className="p-1.5 rounded-lg hover:bg-[#1E1E2A] transition-colors">
                  <Trash2 className="w-3.5 h-3.5" style={{ color: '#EF4444' }} />
                </motion.button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col items-center py-8 px-6 gap-0">

                {/* Divisional chart view (D1 + selected Dn) */}
                <div className="w-full max-w-2xl">
                  <DivisionalView
                    calc={calc}
                    d1Lagna={activeLagna}
                    d1Planets={activePlanets}
                    d1Degrees={hasPrecise ? Object.fromEntries(
                      Object.entries(calc.planets as Record<string, any>)
                        .map(([k, v]: [string, any]) => [k, v.degrees as number])
                    ) : {}}
                    onHouseClick={handleHouseClick}
                  />
                </div>

                {/* Positions table */}
                {hasPrecise && <PositionsTable calc={calc} />}

                {/* Manual planet placer — shown when no precise positions */}
                {!hasPrecise && (
                  <div className="w-full max-w-lg mt-5 p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                      Place Planets Manually (House 1–12)
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold" style={{ color: '#7C3AED' }}>Lagna</span>
                        <select value={manualLagna} onChange={e => setML(parseInt(e.target.value))}
                          className="px-1.5 py-0.5 rounded text-xs outline-none"
                          style={{ background: '#7C3AED20', border: '1px solid #7C3AED44', color: '#A78BFA' }}>
                          {RASHIS.map((r, i) => <option key={r} value={i+1}>{r}</option>)}
                        </select>
                      </div>
                      {PLANET_LIST.map(p => (
                        <div key={p} className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold" style={{ color: PLANET_COLORS[p] }}>{p.slice(0,2)}</span>
                          <select value={manualPlanets[p] || ''}
                            onChange={e => e.target.value
                              ? setMP(prev => ({ ...prev, [p]: parseInt(e.target.value) }))
                              : setMP(prev => { const n = { ...prev }; delete n[p]; return n })}
                            className="px-1.5 py-0.5 rounded text-xs outline-none"
                            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                            <option value="">–</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(h =>
                              <option key={h} value={h}>H{h} · {HOUSE_NAMES[h - 1]}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      Tip: Add lat/lon when creating charts for automatic Swiss Ephemeris calculation.
                    </p>
                  </div>
                )}

                {/* AI Reading panel */}
                {(reading || readingLoading || readingError) && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-lg mt-5 rounded-xl overflow-hidden"
                    style={{ border: '1px solid #7C3AED33' }}>
                    <div className="flex items-center justify-between px-4 py-3 border-b"
                      style={{ borderColor: '#7C3AED22', background: 'rgba(124,58,237,0.05)' }}>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" style={{ color: '#A78BFA' }} />
                        <span className="text-sm font-semibold" style={{ color: '#A78BFA' }}>AI Chart Reading</span>
                      </div>
                      <button onClick={() => { setReading(null); setRE(null) }}>
                        <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      </button>
                    </div>
                    <div className="p-4">
                      {readingLoading && (
                        <div className="flex items-center gap-3 py-4">
                          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Consulting your knowledge base…</p>
                        </div>
                      )}
                      {readingError && (
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#EF4444' }} />
                          <div>
                            <p className="text-sm" style={{ color: '#EF4444' }}>{readingError}</p>
                            {readingError.includes('ANTHROPIC_API_KEY') && (
                              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                Add ANTHROPIC_API_KEY=sk-ant-... to your .env file and restart.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {reading && (
                        <div className="space-y-1">
                          {reading.split('\n').map((line, i) => {
                            if (line.startsWith('## ')) return <p key={i} className="text-sm font-bold mt-4 first:mt-0" style={{ color: 'var(--text-primary)' }}>{line.slice(3)}</p>
                            if (line.startsWith('# '))  return <p key={i} className="text-base font-bold mt-4 first:mt-0" style={{ color: 'var(--text-primary)' }}>{line.slice(2)}</p>
                            if (line.startsWith('- ') || line.startsWith('• '))
                              return <p key={i} className="text-xs flex gap-2" style={{ color: 'var(--text-secondary)' }}>
                                <span style={{ color: '#7C3AED' }}>•</span>{line.slice(2)}
                              </p>
                            if (!line.trim()) return <div key={i} className="h-1.5" />
                            return <p key={i} className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{line}</p>
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── RIGHT: House Detail ───────────────────────────────────────────── */}
      <AnimatePresence>
        {housePanel && (
          <HousePanel
            house={housePanel.house}
            planets={housePanel.planets}
            entries={housePanel.entries}
            dictums={housePanel.dictums}
            onClose={() => setHousePanel(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      <NewChartModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={chart => { setAddOpen(false); load().then(() => setSelected(chart)) }}
      />
    </div>
  )
}
