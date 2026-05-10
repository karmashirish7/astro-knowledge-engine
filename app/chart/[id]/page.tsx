'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft, Download, Pencil, Check, Tag, X, Plus, Trash2, ChevronDown, MapPin,
} from 'lucide-react'
import DivisionalView from '@/components/chart/DivisionalView'
import ObservationEntry from '@/components/charts/ObservationEntry'
import PredictionEntry from '@/components/charts/PredictionEntry'
import DashaView from '@/components/charts/DashaView'
import { deserializeDashaTree, getCurrentDasha, deserializeYoginiTree } from '@/lib/astrology/dasha'
import { searchCities, type City } from '@/lib/cities'
import ShadbalaBars from '@/components/charts/ShadbalaBars'

// ── Astrology helpers ──────────────────────────────────────────────────────

const SIGN_NAMES_12 = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
]
const ORDINALS = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th']
const ordinal = (n: number) => ORDINALS[n - 1] ?? `${n}th`

// Primary lord of each sign
const SIGN_RULER: Record<number, string> = {
  1:'Mars',2:'Venus',3:'Mercury',4:'Moon',5:'Sun',6:'Mercury',
  7:'Venus',8:'Mars',9:'Jupiter',10:'Saturn',11:'Saturn',12:'Jupiter',
}
// Co-lord: Rahu co-rules Aquarius (11), Ketu co-rules Scorpio (8)
const SIGN_CO_RULER: Record<number, string> = { 8:'Ketu', 11:'Rahu' }

// Signs each planet rules (including Rahu/Ketu co-lordship)
const PLANET_RULED_SIGNS: Record<string, number[]> = {
  Sun:[5], Moon:[4], Mars:[1,8], Mercury:[3,6],
  Jupiter:[9,12], Venus:[2,7], Saturn:[10,11],
  Rahu:[11],  // Aquarius (co-lord with Saturn)
  Ketu:[8],   // Scorpio (co-lord with Mars)
}

const PLANET_ASPECTS: Record<string, number[]> = {
  Sun:[7], Moon:[7], Mars:[4,7,8], Mercury:[7],
  Jupiter:[5,7,9], Venus:[7], Saturn:[3,7,10], Rahu:[5,7,9], Ketu:[5,7,9],
}

function houseSign(houseNum: number, lagnaSign: number) {
  const signNum = ((lagnaSign - 1 + houseNum - 1) % 12) + 1
  return { sign: SIGN_NAMES_12[signNum - 1] ?? '', signNum }
}
function planetHouses(planet: string, lagnaSign: number): number[] {
  return (PLANET_RULED_SIGNS[planet] ?? [])
    .map(s => ((s - lagnaSign + 12) % 12) + 1)
    .sort((a, b) => a - b)
}
function aspectingPlanets(target: number, houseNumbers: Record<string, number>): string[] {
  return Object.entries(houseNumbers).flatMap(([planet, from]) => {
    if (from === target) return []
    const hits = (PLANET_ASPECTS[planet] ?? [7]).some(
      off => ((from - 1 + off - 1) % 12) + 1 === target
    )
    return hits ? [planet] : []
  })
}

function buildHouseSubtitle(houseNum: number, calc: any): string {
  if (!calc?.houseNumbers) return ''
  const lagna = calc.lagnaSign || 1
  const { sign, signNum } = houseSign(houseNum, lagna)
  const hn: Record<string, number> = calc.houseNumbers

  const inHouse  = Object.entries(hn).filter(([, h]) => h === houseNum).map(([p]) => p)
  const aspecting = aspectingPlanets(houseNum, hn)

  const primaryDisp = SIGN_RULER[signNum] ?? ''
  const coDisp      = SIGN_CO_RULER[signNum]
  const dispositors = coDisp ? [primaryDisp, coDisp] : [primaryDisp]

  const parts: string[] = [`${sign} sign`]

  if (inHouse.length > 0) {
    const descs = inHouse.map(p => {
      const lords = planetHouses(p, lagna)
      return lords.length ? `${p} (${lords.map(ordinal).join(' and ')} lord)` : p
    })
    parts.push(`with ${descs.join(' and ')}`)
  }
  if (aspecting.length > 0) parts.push(`aspected by ${aspecting.join(', ')}`)

  // Dispositor(s)
  const dispDescs = dispositors.map(d => {
    const dh = hn[d]
    if (!dh) return null
    const { sign: ds } = houseSign(dh, lagna)
    const co = Object.entries(hn)
      .filter(([p, h]) => h === dh && p !== d)
      .map(([p]) => p)
    const coStr = co.length ? ` with ${co.join(', ')}` : ' with no planets'
    return `${d} in ${ordinal(dh)} house (${ds})${coStr}`
  }).filter(Boolean)
  if (dispDescs.length) parts.push(`Dispositor: ${dispDescs.join(' · ')}`)

  return parts.join(' · ')
}

function buildPlanetSubtitle(planet: string, calc: any): string {
  if (!calc?.planets?.[planet]) return ''
  const pos   = calc.planets[planet]
  const house = calc.houseNumbers?.[planet]
  const lagna = calc.lagnaSign || 1
  const lords = planetHouses(planet, lagna)
  const parts = [pos.formatted]
  if (house) parts.push(`H${house}`)
  if (lords.length) parts.push(`Rules H${lords.join(', H')}`)
  if (pos.nakshatra) parts.push(pos.nakshatra)
  return parts.join(' · ')
}

// ── Section definitions ────────────────────────────────────────────────────

const HOUSE_LABELS = Array.from({ length: 12 }, (_, i) => ({
  id: `house${i + 1}`, label: `H${i + 1}`, type: 'house' as const, houseNum: i + 1,
}))
const PLANET_LIST = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu']
const PLANET_SECTIONS = PLANET_LIST.map(p => ({
  id: `planet-${p}`, label: p, type: 'planet' as const, planet: p,
}))
const ANALYSIS_SECTIONS = [
  { id: 'panchang',     label: 'Panchang',         hint: 'Tithi, Vara, Nakshatra, Yoga, Karana…' },
  { id: 'vargas',       label: 'Divisional Charts', hint: 'D9, D10, and other vargas' },
  { id: 'events',       label: 'Life Events',       hint: 'Key events with dates and correlations' },
  { id: 'activations',  label: 'Activations',       hint: 'Transit / dasha activations' },
  { id: 'observations', label: 'Observations',      hint: 'Track what is TRUE / FALSE / UNCLEAR' },
  { id: 'pred-journal', label: 'Predictions',       hint: 'Record and verify predictions' },
].map(s => ({ ...s, type: 'analysis' as const }))

const ALL_STANDARD_IDS = new Set([
  ...HOUSE_LABELS.map(h => h.id),
  ...PLANET_SECTIONS.map(p => p.id),
  ...ANALYSIS_SECTIONS.map(a => a.id),
])


// ── City Search ────────────────────────────────────────────────────────────

function CitySearch({ onSelect }: { onSelect: (city: City) => void }) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<City[]>([])
  const [open, setOpen]       = useState(false)
  const ref                   = useRef<HTMLDivElement>(null)
  useEffect(() => { setResults(searchCities(query)); setOpen(query.length > 0) }, [query])
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>City Search</label>
      <div className="relative">
        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
        <input value={query} onChange={e => setQuery(e.target.value)} onFocus={() => query && setOpen(true)} placeholder="Type city…"
          className="w-full pl-8 pr-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-xl max-h-48 overflow-y-auto"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {results.map((city, i) => (
            <button key={i} onClick={() => { onSelect(city); setQuery(city.name); setOpen(false) }}
              className="w-full text-left flex items-center justify-between px-3 py-2 border-b last:border-0 hover:bg-[#1E1E2A]"
              style={{ borderColor: 'var(--border)' }}>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{city.name}</span>
              <span className="text-[10px] font-mono" style={{ color: '#7C3AED' }}>{city.tz}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Edit Modal ─────────────────────────────────────────────────────────────

function EditChartModal({ chart, onClose, onSaved }: { chart: any; onClose: () => void; onSaved: (u: any) => void }) {
  const [form, setForm] = useState({
    name: chart.name ?? '', birthDate: chart.birthDate ?? '', birthTime: chart.birthTime ?? '',
    birthPlace: chart.birthPlace ?? '', birthLat: String(chart.birthLat ?? ''),
    birthLon: String(chart.birthLon ?? ''), timezone: chart.timezone ?? '+05:30', gender: chart.gender ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const save = async () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/chart/${chart.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(), birthDate: form.birthDate || undefined, birthTime: form.birthTime || undefined,
          birthPlace: form.birthPlace || undefined, birthLat: form.birthLat ? parseFloat(form.birthLat) : undefined,
          birthLon: form.birthLon ? parseFloat(form.birthLon) : undefined, timezone: form.timezone || undefined, gender: form.gender || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Save failed'); setSaving(false); return }
      onSaved(data)
    } catch { setError('Save failed'); setSaving(false) }
  }
  const inp = (label: string, key: string, type = 'text', ph = '') => (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <input type={type} value={(form as any)[key]} onChange={e => set(key, e.target.value)} placeholder={ph}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
        style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
    </div>
  )
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Edit Chart</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#1E1E2A]"><X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /></button>
        </div>
        <div className="overflow-y-auto p-5 space-y-4">
          {inp('Name', 'name', 'text', 'Full name')}
          <div className="grid grid-cols-2 gap-3">{inp('Birth Date', 'birthDate', 'date')}{inp('Birth Time', 'birthTime', 'time')}</div>
          <CitySearch onSelect={city => setForm(f => ({ ...f, birthPlace: `${city.name}, ${city.country}`, birthLat: String(city.lat), birthLon: String(city.lon), timezone: city.tz }))} />
          {inp('Birth Place', 'birthPlace', 'text', 'City, Country')}
          <div className="grid grid-cols-2 gap-3">{inp('Latitude', 'birthLat', 'text', '28.6139')}{inp('Longitude', 'birthLon', 'text', '77.2090')}</div>
          {inp('Timezone', 'timezone', 'text', '+05:30')}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Gender</label>
            <select value={form.gender} onChange={e => set('gender', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              <option value="">Not specified</option><option value="male">Male</option>
              <option value="female">Female</option><option value="other">Other</option>
            </select>
          </div>
          {error && <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-medium" style={{ color: 'var(--text-muted)', background: 'var(--bg-hover)' }}>Cancel</button>
          <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50" style={{ background: '#7C3AED', color: 'white' }}>
            {saving ? 'Saving…' : <><Check className="w-3.5 h-3.5" /> Save Changes</>}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Section Dropdown ───────────────────────────────────────────────────────

function SectionDropdown({ active, customSections, notes, onSelect, onDeleteCustom, onAddCustom }: {
  active: string; customSections: string[]; notes: Record<string, string>
  onSelect: (id: string) => void; onDeleteCustom: (s: string) => void; onAddCustom: (name: string) => void
}) {
  const [open, setOpen]     = useState(false)
  const [newName, setNew]   = useState('')
  const [adding, setAdding] = useState(false)
  const [rect, setRect]     = useState<DOMRect | null>(null)
  const btnRef  = useRef<HTMLButtonElement>(null)
  const ref     = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as Node
      if (
        ref.current     && !ref.current.contains(t) &&
        btnRef.current  && !btnRef.current.contains(t) &&
        menuRef.current && !menuRef.current.contains(t)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])

  const handleToggle = () => {
    if (!open && btnRef.current) setRect(btnRef.current.getBoundingClientRect())
    setOpen(o => !o)
  }

  const pick = (id: string) => { onSelect(id); setOpen(false) }
  const hasNote = (id: string) => !!(notes[id]?.trim())

  const currentLabel =
    HOUSE_LABELS.find(h => h.id === active)?.label ??
    PLANET_SECTIONS.find(p => p.id === active)?.label ??
    ANALYSIS_SECTIONS.find(a => a.id === active)?.label ??
    active

  const btn = (id: string) => ({
    background: active === id ? 'rgba(124,58,237,0.15)' : 'transparent',
    color: active === id ? '#A78BFA' : 'var(--text-secondary)',
    borderLeft: active === id ? '2px solid #7C3AED' : '2px solid transparent',
  })

  const dropdownContent = (
    <div className="px-3 pt-3 space-y-0">
      <div className="pb-1">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Houses</p>
        <div className="grid grid-cols-6 gap-1">
          {HOUSE_LABELS.map(h => (
            <button key={h.id} onClick={() => pick(h.id)}
              className="py-1.5 rounded-lg text-xs font-semibold transition-colors relative" style={btn(h.id)}>
              {h.label}
              {hasNote(h.id) && <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-purple-500" />}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t mx-0 my-2" style={{ borderColor: 'var(--border)' }} />

      <div className="pb-1">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Planets</p>
        <div className="grid grid-cols-3 gap-1">
          {PLANET_SECTIONS.map(p => (
            <button key={p.id} onClick={() => pick(p.id)}
              className="py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors text-left relative" style={btn(p.id)}>
              {p.label}
              {hasNote(p.id) && <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-purple-500" />}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t my-2" style={{ borderColor: 'var(--border)' }} />

      <div className="pb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Analysis</p>
        {ANALYSIS_SECTIONS.map(a => (
          <button key={a.id} onClick={() => pick(a.id)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium transition-colors text-left" style={btn(a.id)}>
            {a.label}
            {hasNote(a.id) && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#7C3AED' }} />}
          </button>
        ))}
      </div>

      {customSections.length > 0 && (
        <>
          <div className="border-t my-1" style={{ borderColor: 'var(--border)' }} />
          <div className="pb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Custom</p>
            {customSections.map(s => (
              <div key={s} className="flex items-center group">
                <button onClick={() => pick(s)} className="flex-1 flex items-center px-2 py-1.5 rounded-lg text-xs font-medium transition-colors text-left" style={btn(s)}>
                  {s}{hasNote(s) && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: '#7C3AED' }} />}
                </button>
                <button onClick={() => onDeleteCustom(s)} className="opacity-0 group-hover:opacity-100 p-1 rounded ml-1">
                  <Trash2 className="w-3 h-3" style={{ color: '#EF4444' }} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="pb-3 border-t pt-1" style={{ borderColor: 'var(--border)' }}>
        {adding ? (
          <div className="flex gap-1 mt-2">
            <input autoFocus value={newName} onChange={e => setNew(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newName.trim()) { onAddCustom(newName.trim()); setNew(''); setAdding(false); setOpen(false) }
                if (e.key === 'Escape') { setAdding(false); setNew('') }
              }}
              placeholder="Section name…"
              className="flex-1 px-2 py-1 rounded-md text-xs outline-none"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            <button onClick={() => { if (newName.trim()) { onAddCustom(newName.trim()); setNew(''); setAdding(false); setOpen(false) } }}
              className="px-2 py-1 rounded-md text-xs" style={{ background: '#7C3AED', color: 'white' }}>+</button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)}
            className="w-full flex items-center gap-1.5 px-2 py-1.5 mt-1 rounded-lg text-xs"
            style={{ color: 'var(--text-muted)' }}>
            <Plus className="w-3.5 h-3.5" /> Add section
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div ref={ref} className="relative">
      <button ref={btnRef} onClick={handleToggle}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold"
        style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)', minWidth: 120 }}>
        {currentLabel}
        <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && rect && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.12 }}
              className="rounded-xl shadow-2xl overflow-hidden"
              style={{ position: 'fixed', top: rect.bottom + 6, left: rect.left, width: 260, zIndex: 9999, background: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="overflow-y-auto" style={{ maxHeight: `calc(100vh - ${rect.bottom + 14}px)` }}>
                {dropdownContent}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}

// ── Debounce ───────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState(value)
  useEffect(() => { const t = setTimeout(() => setDv(value), delay); return () => clearTimeout(t) }, [value, delay])
  return dv
}

// ── Main page ──────────────────────────────────────────────────────────────

type RightTab = 'positions' | 'dashas' | 'shadbala'

export default function ChartDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()

  const [chart, setChart]           = useState<any>(null)
  const [notes, setNotes]           = useState<Record<string, string>>({})
  const [activeSection, setSection] = useState('house1')
  const [customSections, setCustom] = useState<string[]>([])
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [editOpen, setEditOpen]     = useState(false)
  const [rightTab, setRightTab]     = useState<RightTab>('positions')
  const [tagInput, setTagInput]     = useState('')
  const [kwInput, setKwInput]       = useState('')
  const [tags, setTags]             = useState<string[]>([])
  const [keywords, setKeywords]     = useState<string[]>([])

  const currentContent   = notes[activeSection] ?? ''
  const debouncedContent = useDebounce(currentContent, 1200)
  const lastSaved        = useRef<string | null>(null)

  const loadChart = useCallback(async () => {
    const data = await fetch(`/api/chart/${id}`).then(r => r.json())
    if (data.error) { router.push('/chart'); return }
    setChart(data)
    setTags((() => { try { return JSON.parse(data.tagsList || '[]') } catch { return [] } })())
    setKeywords((() => { try { return JSON.parse(data.keywords || '[]') } catch { return [] } })())
    const noteMap: Record<string, string> = {}
    const customs: string[] = []
    for (const n of (data.chartNotes || [])) {
      noteMap[n.section] = n.content
      if (!ALL_STANDARD_IDS.has(n.section)) customs.push(n.section)
    }
    setNotes(noteMap); setCustom(customs)
  }, [id, router])

  useEffect(() => { loadChart() }, [loadChart])

  useEffect(() => {
    if (!chart || debouncedContent === lastSaved.current) return
    lastSaved.current = debouncedContent
    setSaving(true)
    fetch(`/api/chart/${id}/notes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: activeSection, content: debouncedContent }),
    }).then(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 1500) })
      .catch(() => setSaving(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedContent])

  const addTag = async (tag: string, type: 'tag' | 'kw') => {
    if (!tag.trim()) return
    if (type === 'tag') {
      const next = [...tags, tag.trim()]; setTags(next); setTagInput('')
      await fetch(`/api/chart/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tagsList: next }) })
    } else {
      const next = [...keywords, tag.trim()]; setKeywords(next); setKwInput('')
      await fetch(`/api/chart/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keywords: next }) })
    }
  }
  const removeTag = async (tag: string, type: 'tag' | 'kw') => {
    if (type === 'tag') {
      const next = tags.filter(t => t !== tag); setTags(next)
      await fetch(`/api/chart/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tagsList: next }) })
    } else {
      const next = keywords.filter(k => k !== tag); setKeywords(next)
      await fetch(`/api/chart/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keywords: next }) })
    }
  }

  const addCustomSection = (name: string) => {
    if (!name || customSections.includes(name)) return
    setCustom(prev => [...prev, name]); setSection(name)
  }
  const deleteCustomSection = async (section: string) => {
    if (!confirm(`Delete section "${section}"?`)) return
    setCustom(prev => prev.filter(s => s !== section))
    setNotes(prev => { const n = { ...prev }; delete n[section]; return n })
    if (activeSection === section) setSection('house1')
    await fetch(`/api/chart/${id}/notes`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ section }) })
  }

  if (!chart) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const calc       = (() => { try { return JSON.parse(chart.calculatedPositions || '{}') } catch { return {} } })()
  const hasPrecise = !!(calc?.planets)
  const planets    = calc?.houseNumbers ?? {}
  const lagna      = parseInt(chart.lagna) || 1

  const dashaTree = (() => {
    try {
      const pd = chart.planetaryData
      if (!pd?.dashaJson || pd.dashaJson === '{}' || pd.dashaJson === '[]') return null
      return deserializeDashaTree(pd.dashaJson)
    } catch { return null }
  })()
  const currentDasha        = dashaTree ? getCurrentDasha(dashaTree) : null
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

  // Current section meta
  const houseEntry    = HOUSE_LABELS.find(h => h.id === activeSection)
  const planetEntry   = PLANET_SECTIONS.find(p => p.id === activeSection)
  const analysisEntry = ANALYSIS_SECTIONS.find(a => a.id === activeSection)
  const sectionLabel  = houseEntry?.label ?? planetEntry?.label ?? analysisEntry?.label ?? activeSection
  const subtitle = houseEntry && hasPrecise
    ? buildHouseSubtitle(houseEntry.houseNum, calc)
    : planetEntry && hasPrecise
    ? buildPlanetSubtitle(planetEntry.planet, calc)
    : analysisEntry?.hint ?? ''

  const renderContent = () => {
    if (activeSection === 'observations')  return <ObservationEntry chartId={id} />
    if (activeSection === 'pred-journal')  return <PredictionEntry chartId={id} currentDasha={currentDashaSummary} />
    return (
      <textarea
        value={notes[activeSection] ?? ''}
        onChange={e => setNotes(prev => ({ ...prev, [activeSection]: e.target.value }))}
        placeholder={`Notes for ${sectionLabel}…\n\nWrite anything — dictums, observations, predictions, event dates, correlations…`}
        className="w-full h-full resize-none outline-none text-sm leading-relaxed"
        style={{ background: 'transparent', color: 'var(--text-primary)', fontFamily: 'var(--font-geist-mono), monospace', minHeight: 200 }}
      />
    )
  }

  // ── Right panel tab content ────────────────────────────────────────────

  const renderPositions = () => (
    <div className="p-4 space-y-5">
      {hasPrecise ? (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
            Lahiri · Mean Nodes · Geocentric
          </p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs py-1">
              <span className="font-semibold" style={{ color: '#10B981' }}>Lagna</span>
              <span style={{ color: 'var(--text-secondary)' }}>{calc.lagna?.formatted}</span>
            </div>
            {Object.entries(calc.planets as Record<string, any>).map(([graha, pos]: [string, any]) => (
              <button key={graha} onClick={() => setSection(`planet-${graha}`)}
                className="w-full flex justify-between text-xs py-1 px-1.5 rounded-lg -mx-1.5 transition-colors hover:bg-white/5"
                style={{ color: activeSection === `planet-${graha}` ? '#A78BFA' : 'inherit' }}>
                <span className="font-medium" style={{ color: activeSection === `planet-${graha}` ? '#A78BFA' : 'var(--text-secondary)' }}>{graha}</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {pos.formatted}{' '}
                  <span style={{ color: '#7C3AED' }}>H{calc.houseNumbers?.[graha]}</span>
                </span>
              </button>
            ))}
            <p className="text-[10px] pt-2 border-t" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
              Ayanamsa {parseFloat(calc.ayanamsa || 0).toFixed(4)}°
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No calculated positions — add birth coordinates.</p>
      )}

      {/* Tags */}
      <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-1.5 mb-2">
          <Tag className="w-3.5 h-3.5" style={{ color: '#10B981' }} />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Tags</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map(t => (
            <span key={t} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{ background: '#10B98120', color: '#10B981', border: '1px solid #10B98133' }}>
              {t}<button onClick={() => removeTag(t, 'tag')}><X className="w-2.5 h-2.5" /></button>
            </span>
          ))}
        </div>
        <input value={tagInput} onChange={e => setTagInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addTag(tagInput, 'tag') }}
          placeholder="Add tag + Enter"
          className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none mb-4"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />

        <div className="flex items-center gap-1.5 mb-2">
          <Tag className="w-3.5 h-3.5" style={{ color: '#7C3AED' }} />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Keywords</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {keywords.map(k => (
            <span key={k} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
              style={{ background: '#7C3AED20', color: '#A78BFA', border: '1px solid #7C3AED33' }}>
              {k}<button onClick={() => removeTag(k, 'kw')}><X className="w-2.5 h-2.5" /></button>
            </span>
          ))}
        </div>
        <input value={kwInput} onChange={e => setKwInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addTag(kwInput, 'kw') }}
          placeholder="Add keyword + Enter"
          className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
      </div>
    </div>
  )

  const renderDashas = () => (
    <div className="p-3 h-full overflow-y-auto">
      <DashaView
        vimshottariTree={dashaTree}
        yoginiTree={yoginiTree}
        birthDate={chart.birthDate}
      />
    </div>
  )

  const renderShadbala = () => {
    if (!hasPrecise) return (
      <div className="p-4">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No calculated positions — add birth coordinates.</p>
      </div>
    )
    return <ShadbalaBars calc={calc} />
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>

      {/* Top bar */}
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
            <Download className="w-3.5 h-3.5" /> Export HTML
          </a>
          <a href={`/api/chart/${id}/export-docx`} download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: 'rgba(59,130,246,0.12)', color: '#60A5FA', border: '1px solid #3B82F633' }}>
            <Download className="w-3.5 h-3.5" /> Export DOCX
          </a>
          <a href={`/api/chart/${id}/export`} download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: 'rgba(124,58,237,0.12)', color: '#A78BFA', border: '1px solid #7C3AED33' }}>
            <Download className="w-3.5 h-3.5" /> Export MD
          </a>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Center 60% ───────────────────────────────────────────────── */}
        <div className="flex-[3] min-w-0 flex flex-col overflow-hidden">

          {/* Chart — scaled down to save vertical space */}
          <div className="flex-shrink-0 border-b" style={{ borderColor: 'var(--border)' }}>
            <div style={{ zoom: 0.72 } as React.CSSProperties}>
              <div className="px-4 py-3">
                <DivisionalView
                  calc={calc}
                  d1Lagna={lagna}
                  d1Planets={planets}
                  d1Degrees={hasPrecise ? Object.fromEntries(
                    Object.entries(calc.planets as Record<string, any>).map(([k, v]: [string, any]) => [k, v.degrees as number])
                  ) : {}}
                />
              </div>
            </div>
          </div>

          {/* Section selector */}
          <div className="flex items-start gap-3 px-4 py-2.5 border-b flex-shrink-0"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
            <SectionDropdown
              active={activeSection} customSections={customSections} notes={notes}
              onSelect={setSection} onDeleteCustom={deleteCustomSection} onAddCustom={addCustomSection}
            />
            {subtitle && (
              <p className="text-xs leading-relaxed flex-1 pt-2 font-semibold" style={{ color: '#fff' }}>
                {subtitle}
              </p>
            )}
          </div>

          {/* Notes / content — takes all remaining height */}
          <div className="flex-1 overflow-y-auto p-4">
            {renderContent()}
          </div>
        </div>

        {/* ── Right panel 40% ──────────────────────────────────────────── */}
        <div className="flex-[2] flex-shrink-0 border-l flex flex-col overflow-hidden"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>

          {/* Tab bar */}
          <div className="flex flex-shrink-0 border-b" style={{ borderColor: 'var(--border)' }}>
            {(['positions', 'dashas', 'shadbala'] as const).map(tab => (
              <button key={tab} onClick={() => setRightTab(tab)}
                className="flex-1 py-3 text-[11px] font-bold uppercase tracking-wider transition-colors"
                style={{
                  color: rightTab === tab ? '#A78BFA' : 'var(--text-muted)',
                  borderBottom: rightTab === tab ? '2px solid #7C3AED' : '2px solid transparent',
                  background: 'transparent',
                }}>
                {tab === 'positions' ? 'Positions' : tab === 'dashas' ? 'Dashas' : 'Shadbala'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {rightTab === 'positions' && renderPositions()}
            {rightTab === 'dashas'    && renderDashas()}
            {rightTab === 'shadbala' && renderShadbala()}
          </div>
        </div>
      </div>

      {editOpen && (
        <EditChartModal chart={{ ...chart, id }} onClose={() => setEditOpen(false)}
          onSaved={updated => { setChart(updated); setEditOpen(false) }} />
      )}
    </div>
  )
}
