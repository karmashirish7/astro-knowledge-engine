'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Plus, ArrowLeft, Search, BookOpen, Link2, Edit3, Trash2, X,
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { PLANETS, HOUSES, RASHIS, NAKSHATRAS } from '@/lib/entities'

// ── category metadata ──────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { color: string; symbol: string; desc: string }> = {
  Planets:    { color: '#F59E0B', symbol: '☉', desc: 'Navagrahas — nine celestial bodies' },
  Houses:     { color: '#3B82F6', symbol: '⌂', desc: 'Bhavas — twelve divisions of life' },
  Rashis:     { color: '#10B981', symbol: '♈', desc: 'Zodiac signs — twelve rashis' },
  Nakshatras: { color: '#EC4899', symbol: '✦', desc: 'Lunar mansions — 27 nakshatras' },
  Yogas:      { color: '#8B5CF6', symbol: '⊕', desc: 'Planetary combinations & special results' },
  Dashas:     { color: '#F97316', symbol: '◎', desc: 'Planetary period systems (Vimshottari etc.)' },
  Transits:   { color: '#06B6D4', symbol: '→', desc: 'Gochar — current planetary movements' },
  Panchang:   { color: '#84CC16', symbol: '◷', desc: 'Hindu almanac: tithi, vara, nakshatra, yoga, karana' },
  Remedies:   { color: '#F43F5E', symbol: '♦', desc: 'Upayas — astrological remedies & solutions' },
  Concepts:   { color: '#94A3B8', symbol: '◈', desc: 'General concepts, principles, and theory' },
}

const SLUG_MAP: Record<string, string> = {
  planets: 'Planets', houses: 'Houses', rashis: 'Rashis', nakshatras: 'Nakshatras',
  yogas: 'Yogas', dashas: 'Dashas', transits: 'Transits', panchang: 'Panchang',
  remedies: 'Remedies', concepts: 'Concepts',
}

const EMPTY_FORM = { title: '', description: '', tags: '', dictums: '', examples: '', source: '' }

// ── Entity filter strips per category ─────────────────────────────────────

function EntityStrip({
  category, active, onSelect,
}: { category: string; active: string | null; onSelect: (v: string | null) => void }) {
  const meta = CATEGORY_META[category]
  const btn = (label: string, display: string, color?: string) => (
    <button
      key={label}
      onClick={() => onSelect(active === label ? null : label)}
      className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg flex-shrink-0 transition-all text-center"
      style={{
        background: active === label ? `${color || meta.color}30` : 'var(--bg-card)',
        border: `1px solid ${active === label ? `${color || meta.color}66` : 'var(--border)'}`,
        color: active === label ? (color || meta.color) : 'var(--text-muted)',
        minWidth: '3.5rem',
      }}
    >
      <span className="text-base leading-none">{display}</span>
      <span className="text-[9px] font-medium leading-tight">{label}</span>
    </button>
  )

  if (category === 'Planets') {
    return (
      <div className="flex items-center gap-1.5 px-5 py-2.5 border-b overflow-x-auto" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        {PLANETS.map(p => btn(p.name, p.symbol, p.color))}
      </div>
    )
  }
  if (category === 'Houses') {
    return (
      <div className="flex items-center gap-1.5 px-5 py-2.5 border-b overflow-x-auto" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        {HOUSES.map(h => btn(h.sanskrit, `H${h.number}`))}
      </div>
    )
  }
  if (category === 'Rashis') {
    return (
      <div className="flex items-center gap-1.5 px-5 py-2.5 border-b overflow-x-auto" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        {RASHIS.map(r => btn(r.name, r.symbol))}
      </div>
    )
  }
  if (category === 'Nakshatras') {
    return (
      <div className="flex flex-wrap gap-1.5 px-5 py-2.5 border-b overflow-x-auto max-h-24" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        {NAKSHATRAS.map(n => (
          <button
            key={n.name}
            onClick={() => onSelect(active === n.name ? null : n.name)}
            className="px-2 py-1 rounded-md text-xs font-medium flex-shrink-0 transition-all"
            style={{
              background: active === n.name ? `${meta.color}30` : 'var(--bg-card)',
              border: `1px solid ${active === n.name ? `${meta.color}66` : 'var(--border)'}`,
              color: active === n.name ? meta.color : 'var(--text-muted)',
            }}
          >
            {n.name}
          </button>
        ))}
      </div>
    )
  }
  return null
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function CategoryPage() {
  const params = useParams()
  const slug = (params.category as string) || ''
  const category = SLUG_MAP[slug] || slug
  const meta = CATEGORY_META[category] || { color: '#7C3AED', symbol: '◈', desc: '' }

  const [entries, setEntries]       = useState<any[]>([])
  const [selected, setSelected]     = useState<any | null>(null)
  const [entityFilter, setFilter]   = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const [loading, setLoading]       = useState(true)
  const [addOpen, setAddOpen]       = useState(false)
  const [editOpen, setEditOpen]     = useState(false)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [detailLoading, setDL]      = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ category })
      if (search) p.set('search', search)
      const data = await fetch(`/api/knowledge?${p}`).then(r => r.json())
      setEntries(Array.isArray(data) ? data : [])
    } finally { setLoading(false) }
  }, [category, search])

  useEffect(() => { load() }, [load])

  const fetchDetail = async (entry: any) => {
    setDL(true)
    try {
      const full = await fetch(`/api/knowledge/${entry.id}`).then(r => r.json())
      setSelected(full)
    } finally { setDL(false) }
  }

  const filteredEntries = entityFilter
    ? entries.filter(e => {
        const tags: string[] = (() => { try { return JSON.parse(e.tags) } catch { return [] } })()
        const text = `${e.title} ${e.description} ${tags.join(' ')}`.toLowerCase()
        return text.includes(entityFilter.toLowerCase())
      })
    : entries

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const body = {
        title: form.title,
        description: form.description,
        category,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        dictums: form.dictums.split('\n').map(d => d.trim()).filter(Boolean),
        examples: form.examples.split('\n').map(e => e.trim()).filter(Boolean),
        source: form.source,
      }
      if (editOpen && selected) {
        await fetch(`/api/knowledge/${selected.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        setEditOpen(false)
      } else {
        await fetch('/api/knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        setAddOpen(false)
      }
      setForm(EMPTY_FORM)
      setSelected(null)
      load()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return
    await fetch(`/api/knowledge/${id}`, { method: 'DELETE' })
    setSelected(null)
    load()
  }

  const openEdit = (e: any) => {
    const tags: string[] = (() => { try { return JSON.parse(e.tags) } catch { return [] } })()
    const dicts: string[] = (() => { try { return JSON.parse(e.dictums) } catch { return [] } })()
    const exs: string[]   = (() => { try { return JSON.parse(e.examples) } catch { return [] } })()
    setForm({
      title: e.title, description: e.description, tags: tags.join(', '),
      dictums: dicts.join('\n'), examples: exs.join('\n'), source: e.source || '',
    })
    setEditOpen(true)
  }

  const parse = (raw: string) => { try { return JSON.parse(raw) } catch { return [] } }

  // Connected entries from both directions
  const connections = selected ? [
    ...(selected.relationsFrom || []).map((r: any) => r.to),
    ...(selected.relationsTo   || []).map((r: any) => r.from),
  ].filter((e, i, arr) => e && arr.findIndex((x: any) => x.id === e.id) === i) : []

  const EntryForm = () => (
    <div className="space-y-3">
      {[
        { key: 'title',       label: 'Title *',              placeholder: `e.g. Saturn in ${category === 'Houses' ? '7th House' : category === 'Planets' ? 'Scorpio' : 'your topic'}`, multiline: false },
        { key: 'description', label: 'Description',          placeholder: 'Full notes, effects, interpretations...', multiline: true, rows: 5 },
        { key: 'tags',        label: 'Tags (comma-separated)',placeholder: 'Saturn, Marriage, Delay', multiline: false },
        { key: 'dictums',     label: 'Dictums (one per line)',placeholder: 'Saturn delays marriage but gives stability', multiline: true, rows: 3 },
        { key: 'examples',    label: 'Examples (one per line)',placeholder: 'Chart of X — Saturn in 7th...', multiline: true, rows: 2 },
        { key: 'source',      label: 'Source',               placeholder: 'BPHS Ch. 5, personal observation...', multiline: false },
      ].map(({ key, label, placeholder, multiline, rows }) => (
        <div key={key}>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
          {multiline ? (
            <textarea
              value={(form as any)[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              rows={rows}
              placeholder={placeholder}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          ) : (
            <input
              value={(form as any)[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              placeholder={placeholder}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          )}
        </div>
      ))}
      <button
        onClick={handleSave} disabled={saving}
        className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60 mt-2"
        style={{ background: meta.color }}
      >
        {saving ? 'Saving...' : editOpen ? 'Update Entry' : 'Add to Knowledge Base'}
      </button>
    </div>
  )

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-5 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
      >
        <Link href="/knowledge">
          <button className="p-1.5 rounded-lg transition-colors hover:bg-[#1E1E2A]">
            <ArrowLeft className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>
        </Link>
        <span className="text-xl" style={{ color: meta.color }}>{meta.symbol}</span>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{category}</h1>
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{meta.desc}</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-md" style={{ background: `${meta.color}20`, color: meta.color }}>
          {entries.length} entries
        </span>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none w-40"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => { setForm(EMPTY_FORM); setAddOpen(true) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
          style={{ background: meta.color }}
        >
          <Plus className="w-3.5 h-3.5" /> Add Entry
        </motion.button>
      </div>

      {/* Entity filter strip (Planets / Houses / Rashis / Nakshatras only) */}
      {entityFilter && (
        <div
          className="flex items-center gap-2 px-5 py-1.5 border-b text-xs"
          style={{ borderColor: 'var(--border)', background: `${meta.color}10` }}
        >
          <span style={{ color: meta.color }}>Filtering: <strong>{entityFilter}</strong></span>
          <button onClick={() => setFilter(null)} className="ml-1">
            <X className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
      )}
      <EntityStrip category={category} active={entityFilter} onSelect={setFilter} />

      {/* Two-column content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Entry list */}
        <div className="w-72 flex-shrink-0 border-r overflow-y-auto p-2" style={{ borderColor: 'var(--border)' }}>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${meta.color} transparent transparent transparent` }} />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12 px-4">
              <span className="text-4xl" style={{ color: meta.color }}>{meta.symbol}</span>
              <p className="text-sm mt-3 mb-2" style={{ color: 'var(--text-muted)' }}>No {category.toLowerCase()} entries yet.</p>
              <button onClick={() => { setForm(EMPTY_FORM); setAddOpen(true) }} className="text-xs underline" style={{ color: meta.color }}>
                Add the first one
              </button>
            </div>
          ) : filteredEntries.map(e => {
            const connCount = (e.relationsFrom?.length || 0) + (e.relationsTo?.length || 0)
            return (
              <motion.div
                key={e.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => fetchDetail(e)}
                className="p-3 rounded-lg mb-1.5 cursor-pointer transition-colors"
                style={{
                  background: selected?.id === e.id ? `${meta.color}14` : 'var(--bg-card)',
                  border: `1px solid ${selected?.id === e.id ? `${meta.color}55` : 'var(--border)'}`,
                }}
              >
                <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>{e.title}</p>
                {e.description && (
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{e.description}</p>
                )}
                {connCount > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <Link2 className="w-3 h-3" style={{ color: meta.color }} />
                    <span className="text-[10px]" style={{ color: meta.color }}>{connCount} connected</span>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Entry detail */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {detailLoading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="h-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${meta.color} transparent transparent transparent` }} />
              </motion.div>
            ) : selected ? (
              <motion.div key={selected.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="p-8 max-w-3xl">
                {/* Title & actions */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: `${meta.color}20`, color: meta.color }}>{category}</span>
                    <h2 className="text-2xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>{selected.title}</h2>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => openEdit(selected)} className="p-2 rounded-lg transition-colors hover:bg-[#1E1E2A]">
                      <Edit3 className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    </button>
                    <button onClick={() => handleDelete(selected.id)} className="p-2 rounded-lg transition-colors hover:bg-[#1E1E2A]">
                      <Trash2 className="w-4 h-4" style={{ color: '#EF4444' }} />
                    </button>
                  </div>
                </div>

                {/* Description */}
                {selected.description && (
                  <div className="mb-5 p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Notes</h3>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{selected.description}</p>
                  </div>
                )}

                {/* Dictums */}
                {parse(selected.dictums).length > 0 && (
                  <div className="mb-5 p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Dictums / Rules</h3>
                    <div className="space-y-2">
                      {(parse(selected.dictums) as string[]).map((d, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#F59E0B' }} />
                          <p className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>"{d}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Examples */}
                {parse(selected.examples).length > 0 && (
                  <div className="mb-5 p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Examples</h3>
                    {(parse(selected.examples) as string[]).map((ex, i) => (
                      <p key={i} className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>{i + 1}. {ex}</p>
                    ))}
                  </div>
                )}

                {/* Tags */}
                {parse(selected.tags).length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-5">
                    {(parse(selected.tags) as string[]).map(t => (
                      <Badge key={t} label={t} color={meta.color} />
                    ))}
                  </div>
                )}

                {selected.source && (
                  <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>Source: {selected.source}</p>
                )}

                {/* Connected Topics */}
                {connections.length > 0 && (
                  <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: `1px solid ${meta.color}33` }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Link2 className="w-4 h-4" style={{ color: meta.color }} />
                      <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        Connected Topics ({connections.length})
                      </h3>
                    </div>
                    <div className="space-y-1.5">
                      {connections.slice(0, 10).map((e: any) => (
                        <div
                          key={e.id}
                          onClick={() => fetchDetail(e)}
                          className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-[#1E1E2A]"
                        >
                          <BookOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: CATEGORY_META[e.category]?.color || '#94A3B8' }} />
                          <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{e.title}</span>
                          <span className="text-[10px] flex-shrink-0 px-1.5 py-0.5 rounded"
                            style={{ background: `${CATEGORY_META[e.category]?.color || '#94A3B8'}20`, color: CATEGORY_META[e.category]?.color || '#94A3B8' }}>
                            {e.category}
                          </span>
                        </div>
                      ))}
                    </div>
                    {connections.length > 10 && (
                      <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>+{connections.length - 10} more connections</p>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center p-8 text-center">
                <span className="text-6xl mb-4" style={{ color: meta.color, opacity: 0.3 }}>{meta.symbol}</span>
                <p className="text-base font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Select an entry</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Or add a new {category.toLowerCase()} note</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Modal
        open={addOpen || editOpen}
        onClose={() => { setAddOpen(false); setEditOpen(false); setForm(EMPTY_FORM) }}
        title={editOpen ? `Edit ${category} Entry` : `Add ${category} Entry`}
      >
        {EntryForm()}
      </Modal>
    </div>
  )
}
