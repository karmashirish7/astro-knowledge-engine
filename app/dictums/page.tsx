'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Plus, Search, Tag, Filter, Zap, ExternalLink, Trash2 } from 'lucide-react'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'

const STRENGTH_COLORS: Record<string, string> = {
  Strong: '#10B981', Conditional: '#F59E0B', Exception: '#EF4444',
}

const ENTITY_COLORS: Record<string, string> = {
  planet: '#F59E0B', house: '#3B82F6', rashi: '#10B981', nakshatra: '#EC4899',
}

const EMPTY_FORM = {
  rule: '', interpretation: '', tags: '', strength: 'Strong', source: '',
}

// ── Conditions panel ──────────────────────────────────────────────────────────

function ConditionsPanel({ dictum, onUpdate }: { dictum: any; onUpdate: () => void }) {
  const [generating, setGenerating] = useState(false)
  const [editing, setEditing]       = useState(false)
  const [draft, setDraft]           = useState('')

  const hasConditions = dictum.conditionsJson && dictum.conditionsJson !== '{}'
  const parsed = hasConditions ? (() => { try { return JSON.parse(dictum.conditionsJson) } catch { return {} } })() : {}

  const generate = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/dictums/generate-conditions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule: dictum.rule, dictumId: dictum.id }),
      })
      const { conditionsJson } = await res.json()
      setDraft(conditionsJson)
      setEditing(true)
      onUpdate()
    } catch {} finally { setGenerating(false) }
  }

  const save = async () => {
    try {
      JSON.parse(draft)
    } catch { return }
    await fetch('/api/dictums', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: dictum.id, conditionsJson: draft }),
    }).catch(() => {})
    setEditing(false)
    onUpdate()
  }

  return (
    <div className="mb-6 p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Query Conditions
        </h3>
        <div className="flex gap-2">
          {hasConditions && !editing && (
            <button onClick={() => { setDraft(dictum.conditionsJson); setEditing(true) }}
              className="text-[10px] px-2 py-1 rounded" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
              Edit
            </button>
          )}
          <button onClick={generate} disabled={generating}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded font-semibold"
            style={{ background: '#7C3AED22', color: '#7C3AED' }}>
            <Zap className="w-3 h-3" /> {generating ? 'Generating…' : 'AI Generate'}
          </button>
        </div>
      </div>

      {editing ? (
        <div>
          <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={4}
            className="w-full px-3 py-2 rounded-lg text-xs font-mono outline-none resize-none mb-2"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          <div className="flex gap-2">
            <button onClick={save} className="text-xs px-3 py-1.5 rounded font-semibold" style={{ background: '#10B981', color: '#fff' }}>Save</button>
            <button onClick={() => setEditing(false)} className="text-xs px-3 py-1.5 rounded" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>Cancel</button>
          </div>
        </div>
      ) : hasConditions ? (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(parsed).map(([k, v]) => (
            <span key={k} className="text-[10px] px-2 py-0.5 rounded font-mono"
              style={{ background: '#7C3AED22', color: '#7C3AED' }}>
              {k}: {String(v)}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          No conditions set. Click "AI Generate" to extract from the rule, or edit manually.
        </p>
      )}
    </div>
  )
}

export default function DictumsPage() {
  const [dictums, setDictums]   = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [addOpen, setAddOpen]   = useState(false)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [search, setSearch]     = useState('')
  const [strength, setStrength] = useState('All')
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (strength !== 'All') params.set('strength', strength)
      if (search) params.set('search', search)
      const data = await fetch(`/api/dictums?${params}`).then(r => r.json())
      setDictums(Array.isArray(data) ? data : [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [strength, search])

  const handleDelete = async (id: string, rule: string) => {
    if (!confirm(`Delete dictum?\n\n"${rule.slice(0, 80)}…"`)) return
    await fetch('/api/dictums', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (selected?.id === id) setSelected(null)
    load()
  }

  const handleSave = async () => {
    if (!form.rule.trim()) return
    setSaving(true)
    try {
      await fetch('/api/dictums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      })
      setAddOpen(false)
      setForm(EMPTY_FORM)
      load()
    } finally { setSaving(false) }
  }

  const parseJSON = (s: string) => { try { return JSON.parse(s) } catch { return [] } }

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Left – list */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" style={{ color: '#EC4899' }} />
              <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Dictum Engine</h1>
            </div>
            <button onClick={() => { setForm(EMPTY_FORM); setAddOpen(true) }}
              className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#EC4899' }}>
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search rules..." className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>
          <div className="flex gap-1.5">
            {['All', 'Strong', 'Conditional', 'Exception'].map(s => (
              <button key={s} onClick={() => setStrength(s)}
                className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                style={{
                  background: strength === s ? (STRENGTH_COLORS[s] || '#7C3AED') + '33' : 'var(--bg-hover)',
                  color: strength === s ? (STRENGTH_COLORS[s] || '#EC4899') : 'var(--text-muted)',
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : dictums.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No dictums yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Use Dump Mode to auto-extract rules</p>
            </div>
          ) : dictums.map(d => (
            <motion.div key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              onClick={() => setSelected(selected?.id === d.id ? null : d)}
              className="p-3 rounded-lg mb-1.5 cursor-pointer transition-colors"
              style={{
                background: selected?.id === d.id ? 'rgba(236,72,153,0.1)' : 'var(--bg-card)',
                border: `1px solid ${selected?.id === d.id ? '#EC489966' : 'var(--border)'}`,
              }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-medium leading-snug flex-1" style={{ color: 'var(--text-primary)' }}>
                  "{d.rule}"
                </p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: (STRENGTH_COLORS[d.strength] || '#94A3B8') + '22', color: STRENGTH_COLORS[d.strength] || '#94A3B8' }}>
                    {d.strength}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(d.id, d.rule) }}
                    className="p-1 rounded hover:bg-red-500/10 transition-colors"
                    title="Delete dictum">
                    <Trash2 className="w-3.5 h-3.5" style={{ color: '#EF4444' }} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {parseJSON(d.entities).slice(0, 4).map((e: any, i: number) => (
                  <span key={i} className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: (ENTITY_COLORS[e.type] || '#94A3B8') + '18', color: ENTITY_COLORS[e.type] || '#94A3B8' }}>
                    {e.name}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right – detail */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div key={selected.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="p-8">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="px-2.5 py-1 rounded-lg text-sm font-semibold"
                    style={{ background: (STRENGTH_COLORS[selected.strength] || '#94A3B8') + '22', color: STRENGTH_COLORS[selected.strength] }}>
                    {selected.strength}
                  </span>
                  {selected.source && (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Source: {selected.source}</span>
                  )}
                </div>
                <blockquote className="text-xl font-semibold leading-relaxed mb-4"
                  style={{ color: 'var(--text-primary)', borderLeft: '3px solid #EC4899', paddingLeft: 16 }}>
                  "{selected.rule}"
                </blockquote>
              </div>

              {/* Entities */}
              {parseJSON(selected.entities).length > 0 && (
                <div className="mb-6 p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Linked Entities
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {parseJSON(selected.entities).map((e: any, i: number) => (
                      <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                        style={{ background: (ENTITY_COLORS[e.type] || '#94A3B8') + '15', border: `1px solid ${(ENTITY_COLORS[e.type] || '#94A3B8')}30` }}>
                        <span className="text-xs font-semibold" style={{ color: ENTITY_COLORS[e.type] || '#94A3B8' }}>{e.name}</span>
                        <span className="text-xs opacity-60" style={{ color: ENTITY_COLORS[e.type] || '#94A3B8' }}>({e.type})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interpretation */}
              {selected.interpretation && (
                <div className="mb-6 p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                    Interpretation
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{selected.interpretation}</p>
                </div>
              )}

              {/* conditionsJson panel */}
              <ConditionsPanel dictum={selected} onUpdate={load} />

              {/* Research link */}
              <div className="mb-6 flex gap-2">
                <Link href={`/research?dictumId=${selected.id}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: '#7C3AED22', color: '#7C3AED', border: '1px solid #7C3AED33' }}>
                  <ExternalLink className="w-4 h-4" /> Research this dictum
                </Link>
              </div>

              {/* Strength guide */}
              <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                  Strength Legend
                </h3>
                {[
                  { s: 'Strong',      desc: 'Applies in most charts. High confidence.',   c: '#10B981' },
                  { s: 'Conditional', desc: 'Applies when specific conditions are met.',   c: '#F59E0B' },
                  { s: 'Exception',   desc: 'Counter-rule or exception to another dictum.', c: '#EF4444' },
                ].map(({ s, desc, c }) => (
                  <div key={s} className="flex items-start gap-3 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded font-medium flex-shrink-0"
                      style={{ background: c + '22', color: c }}>{s}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center p-8 text-center">
              <FileText className="w-16 h-16 mb-4" style={{ color: 'var(--text-muted)' }} />
              <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Dictum Engine</p>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                Short predictive rules auto-linked to entities.<br />
                Select a dictum or add a new one.
              </p>
              <div className="grid grid-cols-1 gap-3 max-w-sm">
                {['"Saturn in 7th delays marriage"', '"Jupiter in 5th gives intelligent children"', '"Rahu in Lagna creates foreign connections"'].map(ex => (
                  <div key={ex} className="p-3 rounded-lg text-left" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <p className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>{ex}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Dictum / Rule">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Rule / Sutra *</label>
            <textarea value={form.rule} onChange={e => setForm(f => ({ ...f, rule: e.target.value }))}
              rows={3} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="Saturn in 7th house delays marriage but gives stability" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Strength</label>
            <div className="flex gap-2">
              {['Strong', 'Conditional', 'Exception'].map(s => (
                <button key={s} onClick={() => setForm(f => ({ ...f, strength: s }))}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    background: form.strength === s ? (STRENGTH_COLORS[s] + '33') : 'var(--bg-hover)',
                    color: form.strength === s ? STRENGTH_COLORS[s] : 'var(--text-muted)',
                    border: `1px solid ${form.strength === s ? STRENGTH_COLORS[s] + '55' : 'var(--border)'}`,
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Interpretation / Explanation</label>
            <textarea value={form.interpretation} onChange={e => setForm(f => ({ ...f, interpretation: e.target.value }))}
              rows={3} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="Detailed explanation, context, and conditions..." />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Tags (comma-separated)</label>
            <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="Saturn, Marriage, 7th House" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Source</label>
            <input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="BPHS, Parashara, Manual entry..." />
          </div>
          <button onClick={handleSave} disabled={saving}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: '#EC4899' }}>
            {saving ? 'Saving...' : 'Add Dictum'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
