'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft, Download, Plus, Save, Trash2, Tag, X, ChevronRight, ChevronDown,
  Pencil, MapPin, Check,
} from 'lucide-react'
import DivisionalView from '@/components/chart/DivisionalView'
import ObservationEntry from '@/components/charts/ObservationEntry'
import PredictionEntry from '@/components/charts/PredictionEntry'
import DashaView from '@/components/charts/DashaView'
import { deserializeDashaTree, getCurrentDasha, deserializeYoginiTree } from '@/lib/astrology/dasha'
import { searchCities, type City } from '@/lib/cities'

// ── City Search (for edit modal) ───────────────────────────────────────────

function CitySearch({ onSelect }: { onSelect: (city: City) => void }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<City[]>([])
  const [open, setOpen]       = useState(false)
  const ref                   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setResults(searchCities(query))
    setOpen(query.length > 0)
  }, [query])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const pick = (city: City) => {
    onSelect(city)
    setQuery(city.name)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
        City Search
      </label>
      <div className="relative">
        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => query && setOpen(true)}
          placeholder="Type city name…"
          className="w-full pl-8 pr-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-xl max-h-48 overflow-y-auto"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {results.map((city, i) => (
            <button key={i} onClick={() => pick(city)}
              className="w-full text-left flex items-center justify-between px-3 py-2 border-b last:border-0 hover:bg-[#1E1E2A] transition-colors"
              style={{ borderColor: 'var(--border)' }}>
              <div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{city.name}</span>
                {city.state && <span className="text-xs ml-1.5" style={{ color: 'var(--text-muted)' }}>{city.state},</span>}
                <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>{city.country}</span>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <span className="text-[10px] font-mono" style={{ color: '#7C3AED' }}>{city.tz}</span>
                <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{city.lat.toFixed(2)}°, {city.lon.toFixed(2)}°</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Edit Chart Modal ───────────────────────────────────────────────────────

function EditChartModal({ chart, onClose, onSaved }: { chart: any; onClose: () => void; onSaved: (updated: any) => void }) {
  const [form, setForm] = useState({
    name:       chart.name       ?? '',
    birthDate:  chart.birthDate  ?? '',
    birthTime:  chart.birthTime  ?? '',
    birthPlace: chart.birthPlace ?? '',
    birthLat:   String(chart.birthLat ?? ''),
    birthLon:   String(chart.birthLon ?? ''),
    timezone:   chart.timezone   ?? '+05:30',
    gender:     chart.gender     ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleCitySelect = (city: City) => {
    setForm(f => ({
      ...f,
      birthPlace: `${city.name}${city.state ? ', ' + city.state : ''}, ${city.country}`,
      birthLat:   String(city.lat),
      birthLon:   String(city.lon),
      timezone:   city.tz,
    }))
  }

  const save = async () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/chart/${chart.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:       form.name.trim(),
          birthDate:  form.birthDate  || undefined,
          birthTime:  form.birthTime  || undefined,
          birthPlace: form.birthPlace || undefined,
          birthLat:   form.birthLat   ? parseFloat(form.birthLat)  : undefined,
          birthLon:   form.birthLon   ? parseFloat(form.birthLon)  : undefined,
          timezone:   form.timezone   || undefined,
          gender:     form.gender     || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Save failed'); setSaving(false); return }
      onSaved(data)
    } catch {
      setError('Save failed')
      setSaving(false)
    }
  }

  const field = (label: string, key: string, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <input
        type={type}
        value={(form as any)[key]}
        onChange={e => set(key, e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
        style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Edit Chart</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#1E1E2A] transition-colors">
            <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto p-5 space-y-4">
          {field('Name', 'name', 'text', 'Full name')}

          <div className="grid grid-cols-2 gap-3">
            {field('Birth Date', 'birthDate', 'date')}
            {field('Birth Time', 'birthTime', 'time')}
          </div>

          <CitySearch onSelect={handleCitySelect} />

          {field('Birth Place', 'birthPlace', 'text', 'City, Country')}

          <div className="grid grid-cols-2 gap-3">
            {field('Latitude', 'birthLat', 'text', '28.6139')}
            {field('Longitude', 'birthLon', 'text', '77.2090')}
          </div>

          {field('Timezone', 'timezone', 'text', '+05:30')}

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Gender</label>
            <select
              value={form.gender}
              onChange={e => set('gender', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              <option value="">Not specified</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          {error && <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t flex-shrink-0"
          style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-hover)' }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            style={{ background: '#7C3AED', color: 'white' }}>
            {saving ? 'Saving…' : <><Check className="w-3.5 h-3.5" /> Save Changes</>}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Section definitions ────────────────────────────────────────────────────

const HOUSE_SANSKRIT = [
  'Lagna','Dhana','Sahaja','Sukha','Putra','Ripu',
  'Yuvati','Randhra','Dharma','Karma','Labha','Vyaya',
]
const HOUSE_SIGNIFICATIONS = [
  'Self, Body, Personality','Wealth, Family, Speech','Siblings, Courage, Communication',
  'Home, Mother, Happiness','Children, Intelligence, Creativity','Enemies, Health, Service',
  'Marriage, Partnerships','Longevity, Occult, Transformation','Religion, Philosophy, Higher Learning',
  'Career, Fame, Father','Gains, Income, Network','Loss, Liberation, Foreign',
]

const STANDARD_SECTIONS = [
  { id: 'panchang',    icon: '◷', label: 'Panchang',        hint: 'Tithi, Vara, Nakshatra, Yoga, Karana, Ayana…' },
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `house${i + 1}`,
    icon: String(i + 1),
    label: `H${i + 1} · ${HOUSE_SANSKRIT[i]}`,
    hint: HOUSE_SIGNIFICATIONS[i],
  })),
  { id: 'vargas',       icon: '◈', label: 'Divisional Charts', hint: 'D9 Navamsa, D10 Dasamsa, and 13 other vargas' },
  { id: 'dasha-viz',    icon: '◎', label: 'Dasha Analysis',   hint: 'Vimshottari & Yogini · completion bars + timeline' },
  { id: 'events',       icon: '◉', label: 'Life Events',      hint: 'Key events with dates and correlations…' },
  { id: 'activations',  icon: '⚡', label: 'Activations',     hint: 'Transit / dasha activations of chart factors…' },
  { id: 'observations', icon: '🔬', label: 'Observations',    hint: 'Track what is TRUE / FALSE / UNCLEAR about this chart' },
  { id: 'pred-journal', icon: '✦', label: 'Predictions',      hint: 'Record and verify predictions' },
]

// ── Debounced save hook ────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return dv
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function ChartDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()

  const [chart, setChart]           = useState<any | null>(null)
  const [notes, setNotes]           = useState<Record<string, string>>({})    // section → content
  const [activeSection, setSection] = useState('panchang')
  const [customSections, setCustom] = useState<string[]>([])
  const [newSectionName, setNewName]= useState('')
  const [addingSection, setAdding]  = useState(false)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [editOpen, setEditOpen]     = useState(false)
  const [tagInput, setTagInput]     = useState('')
  const [kwInput, setKwInput]       = useState('')
  const [tags, setTags]             = useState<string[]>([])
  const [keywords, setKeywords]     = useState<string[]>([])

  // Auto-save current section note
  const currentContent = notes[activeSection] ?? ''
  const debouncedContent = useDebounce(currentContent, 1200)
  const lastSaved = useRef<string | null>(null)

  // ── Load chart ────────────────────────────────────────────────────────

  const loadChart = useCallback(async () => {
    const data = await fetch(`/api/chart/${id}`).then(r => r.json())
    if (data.error) { router.push('/chart'); return }
    setChart(data)
    setTags((() => { try { return JSON.parse(data.tagsList || '[]') } catch { return [] } })())
    setKeywords((() => { try { return JSON.parse(data.keywords || '[]') } catch { return [] } })())

    // Build notes map from chartNotes
    const noteMap: Record<string, string> = {}
    const stdIds = new Set(STANDARD_SECTIONS.map(s => s.id))
    const customs: string[] = []
    for (const n of (data.chartNotes || [])) {
      noteMap[n.section] = n.content
      if (!stdIds.has(n.section)) customs.push(n.section)
    }
    setNotes(noteMap)
    setCustom(customs)
  }, [id, router])

  useEffect(() => { loadChart() }, [loadChart])

  // ── Auto-save note on debounce ─────────────────────────────────────────

  useEffect(() => {
    if (!chart) return
    if (debouncedContent === lastSaved.current) return
    lastSaved.current = debouncedContent
    setSaving(true)
    fetch(`/api/chart/${id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: activeSection, content: debouncedContent }),
    }).then(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 1500) })
      .catch(() => setSaving(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedContent])

  // ── Tag & keyword helpers ──────────────────────────────────────────────

  const addTag = async (tag: string, type: 'tag' | 'kw') => {
    if (!tag.trim()) return
    if (type === 'tag') {
      const next = [...tags, tag.trim()]
      setTags(next)
      setTagInput('')
      await fetch(`/api/chart/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tagsList: next }) })
    } else {
      const next = [...keywords, tag.trim()]
      setKeywords(next)
      setKwInput('')
      await fetch(`/api/chart/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keywords: next }) })
    }
  }

  const removeTag = async (tag: string, type: 'tag' | 'kw') => {
    if (type === 'tag') {
      const next = tags.filter(t => t !== tag)
      setTags(next)
      await fetch(`/api/chart/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tagsList: next }) })
    } else {
      const next = keywords.filter(k => k !== tag)
      setKeywords(next)
      await fetch(`/api/chart/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keywords: next }) })
    }
  }

  // ── Custom section ─────────────────────────────────────────────────────

  const addCustomSection = () => {
    const name = newSectionName.trim()
    if (!name || customSections.includes(name)) return
    setCustom(prev => [...prev, name])
    setNewName('')
    setAdding(false)
    setSection(name)
  }

  const deleteCustomSection = async (section: string) => {
    if (!confirm(`Delete section "${section}"?`)) return
    setCustom(prev => prev.filter(s => s !== section))
    setNotes(prev => { const n = { ...prev }; delete n[section]; return n })
    if (activeSection === section) setSection('panchang')
    await fetch(`/api/chart/${id}/notes`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section }),
    })
  }

  if (!chart) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const calc = (() => { try { return JSON.parse(chart.calculatedPositions || '{}') } catch { return {} } })()
  const hasPrecise = !!(calc && calc.planets)
  const planets = (() => { try { return JSON.parse(chart.planets || '{}') } catch { return {} } })()
  const lagna = parseInt(chart.lagna) || 1

  const dashaTree = (() => {
    try {
      const pd = chart.planetaryData
      if (!pd?.dashaJson || pd.dashaJson === '{}' || pd.dashaJson === '[]') return null
      return deserializeDashaTree(pd.dashaJson)
    } catch { return null }
  })()
  const currentDasha = dashaTree ? getCurrentDasha(dashaTree) : null
  const currentDashaSummary = currentDasha
    ? { mahadasha: currentDasha.mahadasha.planet, antardasha: currentDasha.antardasha.planet }
    : null

  const yoginiTree = (() => {
    try {
      const pd = chart.planetaryData
      if (!pd?.yoginiDashaJson || pd.yoginiDashaJson === '{}' || pd.yoginiDashaJson === '[]') return null
      return deserializeYoginiTree(pd.yoginiDashaJson)
    } catch { return null }
  })()

  const allSections = [...STANDARD_SECTIONS, ...customSections.map(s => ({ id: s, icon: '◈', label: s, hint: '' }))]
  const currentSection = allSections.find(s => s.id === activeSection) ?? allSections[0]

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <Link href="/chart">
          <button className="p-1.5 rounded-lg hover:bg-[#1E1E2A] transition-colors">
            <ArrowLeft className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold truncate" style={{ color: 'var(--text-primary)' }}>{chart.name}</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {chart.birthDate} {chart.birthTime} {chart.timezone} · {chart.birthPlace}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {saving && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>saving…</span>}
          {saved  && <span className="text-xs" style={{ color: '#10B981' }}>saved ✓</span>}
          <button onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: 'rgba(124,58,237,0.12)', color: '#A78BFA', border: '1px solid #7C3AED33' }}>
            <Pencil className="w-3.5 h-3.5" /> Edit Chart
          </button>
          <a href={`/api/chart/${id}/export-doc`} download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#34D399', border: '1px solid #10B98133' }}>
            <Download className="w-3.5 h-3.5" /> Export Doc
          </a>
          <a href={`/api/chart/${id}/export`} download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: 'rgba(124,58,237,0.12)', color: '#A78BFA', border: '1px solid #7C3AED33' }}>
            <Download className="w-3.5 h-3.5" /> Export MD
          </a>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: section nav ──────────────────────────────────────── */}
        <div className="w-52 flex-shrink-0 flex flex-col border-r overflow-y-auto"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>

          {/* Lagna / Moon summary strip */}
          {hasPrecise && (
            <div className="px-3 py-2 border-b flex-shrink-0 space-y-0.5" style={{ borderColor: 'var(--border)' }}>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Lagna: {calc.lagna?.formatted}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Moon: {calc.planets?.Moon?.formatted}</p>
            </div>
          )}

          {/* Section list */}
          <div className="flex-1 p-1.5 space-y-0.5">
            {STANDARD_SECTIONS.map(sec => (
              <button key={sec.id} onClick={() => setSection(sec.id)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left"
                style={{
                  background: activeSection === sec.id ? 'rgba(124,58,237,0.14)' : 'transparent',
                  color: activeSection === sec.id ? '#A78BFA' : 'var(--text-secondary)',
                  borderLeft: activeSection === sec.id ? '2px solid #7C3AED' : '2px solid transparent',
                }}>
                <span className="w-4 text-center flex-shrink-0 text-sm">{sec.icon}</span>
                <span className="truncate">{sec.label}</span>
                {notes[sec.id] && <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#7C3AED' }} />}
              </button>
            ))}

            {/* Custom sections */}
            {customSections.map(sec => (
              <div key={sec} className="flex items-center group">
                <button onClick={() => setSection(sec)}
                  className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left"
                  style={{
                    background: activeSection === sec ? 'rgba(124,58,237,0.14)' : 'transparent',
                    color: activeSection === sec ? '#A78BFA' : 'var(--text-secondary)',
                    borderLeft: activeSection === sec ? '2px solid #7C3AED' : '2px solid transparent',
                  }}>
                  <span className="w-4 text-center flex-shrink-0 text-sm">◈</span>
                  <span className="truncate">{sec}</span>
                  {notes[sec] && <span className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#7C3AED' }} />}
                </button>
                <button onClick={() => deleteCustomSection(sec)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity">
                  <Trash2 className="w-3 h-3" style={{ color: '#EF4444' }} />
                </button>
              </div>
            ))}

            {/* Add section */}
            {addingSection ? (
              <div className="flex gap-1 p-1">
                <input
                  autoFocus
                  value={newSectionName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addCustomSection(); if (e.key === 'Escape') { setAdding(false); setNewName('') } }}
                  placeholder="Section name…"
                  className="flex-1 px-2 py-1 rounded-md text-xs outline-none"
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                <button onClick={addCustomSection} className="px-2 py-1 rounded-md text-xs" style={{ background: '#7C3AED', color: 'white' }}>+</button>
              </div>
            ) : (
              <button onClick={() => setAdding(true)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                style={{ color: 'var(--text-muted)' }}>
                <Plus className="w-3.5 h-3.5" /> Add Section
              </button>
            )}
          </div>
        </div>

        {/* ── Center: charts + note editor ─────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Always-visible two-chart view */}
          <div className="flex-shrink-0 border-b p-4" style={{ borderColor: 'var(--border)' }}>
            <DivisionalView
              calc={calc}
              d1Lagna={lagna}
              d1Planets={planets}
              d1Degrees={hasPrecise ? Object.fromEntries(
                Object.entries(calc.planets as Record<string, any>)
                  .map(([k, v]: [string, any]) => [k, v.degrees as number])
              ) : {}}
            />
          </div>

          {/* Section header */}
          <div className="flex items-center gap-3 px-6 py-3 border-b flex-shrink-0"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
            <span className="text-xl">{currentSection.icon}</span>
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{currentSection.label}</h2>
              {currentSection.hint && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{currentSection.hint}</p>
              )}
            </div>
          </div>

          {/* Section content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeSection === 'observations' ? (
              <ObservationEntry chartId={id} />
            ) : activeSection === 'pred-journal' ? (
              <PredictionEntry chartId={id} currentDasha={currentDashaSummary} />
            ) : activeSection === 'dasha-viz' ? (
              <DashaView
                vimshottariTree={dashaTree}
                yoginiTree={yoginiTree}
                birthDate={chart.birthDate}
              />
            ) : (
              <textarea
                value={notes[activeSection] ?? ''}
                onChange={e => setNotes(prev => ({ ...prev, [activeSection]: e.target.value }))}
                placeholder={
                  activeSection === 'vargas'
                    ? 'Notes on divisional charts…\n\nRecord observations about navamsa, dasamsa, and other vargas…'
                    : `Notes for ${currentSection.label}…\n\nWrite anything — dictums, observations, predictions, event dates, correlations…`
                }
                className="w-full h-full resize-none outline-none text-sm leading-relaxed"
                style={{
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-geist-mono), monospace',
                  minHeight: '200px',
                }}
              />
            )}
          </div>
        </div>

        {/* ── Right: positions + tags ────────────────────────────────── */}
        <div className="w-64 flex-shrink-0 border-l flex flex-col overflow-y-auto"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>

          {/* Positions table */}
          {hasPrecise && (
            <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                Positions · Lahiri
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold" style={{ color: '#10B981' }}>Lagna</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{calc.lagna?.formatted}</span>
                </div>
                {Object.entries(calc.planets as Record<string, any>).map(([graha, pos]: [string, any]) => (
                  <div key={graha} className="flex justify-between text-xs">
                    <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{graha}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{pos.formatted} <span style={{ color: '#7C3AED' }}>H{calc.houseNumbers?.[graha]}</span></span>
                  </div>
                ))}
                <p className="text-[10px] mt-2 pt-2 border-t" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                  Ayanamsa: {parseFloat(calc.ayanamsa || 0).toFixed(4)}° · Mean nodes · Geocentric
                </p>
              </div>
            </div>
          )}

          {/* Tags */}
          <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-3.5 h-3.5" style={{ color: '#10B981' }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Tags</p>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map(t => (
                <span key={t} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                  style={{ background: '#10B98120', color: '#10B981', border: '1px solid #10B98133' }}>
                  {t}
                  <button onClick={() => removeTag(t, 'tag')}><X className="w-2.5 h-2.5" /></button>
                </span>
              ))}
            </div>
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addTag(tagInput, 'tag') }}
              placeholder="Add tag + Enter"
              className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Keywords */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-3.5 h-3.5" style={{ color: '#7C3AED' }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Keywords</p>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {keywords.map(k => (
                <span key={k} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                  style={{ background: '#7C3AED20', color: '#A78BFA', border: '1px solid #7C3AED33' }}>
                  {k}
                  <button onClick={() => removeTag(k, 'kw')}><X className="w-2.5 h-2.5" /></button>
                </span>
              ))}
            </div>
            <input
              value={kwInput}
              onChange={e => setKwInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addTag(kwInput, 'kw') }}
              placeholder="Add keyword + Enter"
              className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
      </div>

      {editOpen && (
        <EditChartModal
          chart={{ ...chart, id }}
          onClose={() => setEditOpen(false)}
          onSaved={updated => {
            setChart(updated)
            setEditOpen(false)
          }}
        />
      )}
    </div>
  )
}
