'use client'

import { useState, useEffect, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { Plus, Search, BookOpen, Tag, Link2, Trash2, Edit3, X, Check } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { CATEGORIES, PLANETS, RASHIS, HOUSES } from '@/lib/entities'

const CATEGORY_COLORS: Record<string, string> = {
  Planets: '#F59E0B', Houses: '#3B82F6', Rashis: '#10B981',
  Nakshatras: '#EC4899', Yogas: '#8B5CF6', Dashas: '#F97316',
  Transits: '#06B6D4', Panchang: '#84CC16', Remedies: '#F43F5E', Concepts: '#94A3B8',
}

const EMPTY_FORM = {
  title: '', description: '', category: 'Concepts',
  tags: '', dictums: '', examples: '', source: '',
}

function KnowledgeContent() {
  const searchParams = useSearchParams()
  const focusId = searchParams.get('id')

  const [entries, setEntries]     = useState<any[]>([])
  const [selected, setSelected]   = useState<any | null>(null)
  const [detailLoading, setDL]    = useState(false)
  const [addOpen, setAddOpen]     = useState(false)
  const [editOpen, setEditOpen]   = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [search, setSearch]       = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (catFilter !== 'All') params.set('category', catFilter)
      if (search) params.set('search', search)
      const data = await fetch(`/api/knowledge?${params}`).then(r => r.json())
      setEntries(Array.isArray(data) ? data : [])
      if (focusId) {
        const found = Array.isArray(data) ? data.find((e: any) => e.id === focusId) : null
        if (found) setSelected(found)
      }
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [catFilter, search])

  const fetchDetail = async (entry: any) => {
    setDL(true)
    try {
      const full = await fetch(`/api/knowledge/${entry.id}`).then(r => r.json())
      setSelected(full)
    } finally { setDL(false) }
  }

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const body = {
        ...form,
        tags:    form.tags.split(',').map(t => t.trim()).filter(Boolean),
        dictums: form.dictums.split('\n').map(d => d.trim()).filter(Boolean),
        examples:form.examples.split('\n').map(e => e.trim()).filter(Boolean),
      }
      if (editOpen && selected) {
        await fetch(`/api/knowledge/${selected.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        setEditOpen(false)
      } else {
        await fetch('/api/knowledge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
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
    if (selected?.id === id) setSelected(null)
    load()
  }

  const openEdit = (e: any) => {
    setSelected(e)
    setForm({
      title: e.title, description: e.description, category: e.category,
      tags: (JSON.parse(e.tags || '[]') as string[]).join(', '),
      dictums: (JSON.parse(e.dictums || '[]') as string[]).join('\n'),
      examples: (JSON.parse(e.examples || '[]') as string[]).join('\n'),
      source: e.source || '',
    })
    setEditOpen(true)
  }

  const tags = (raw: string) => { try { return JSON.parse(raw) } catch { return [] } }

  const EntryForm = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Title *</label>
        <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          placeholder="e.g. Saturn in 7th House" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Category</label>
        <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Description</label>
        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={4} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          placeholder="Detailed description, effects, interpretations..." />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Tags (comma-separated)</label>
        <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          placeholder="Saturn, 7th House, Marriage" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Dictums / Rules (one per line)</label>
        <textarea value={form.dictums} onChange={e => setForm(f => ({ ...f, dictums: e.target.value }))}
          rows={3} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          placeholder="Saturn delays marriage but gives stability" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Examples (one per line)</label>
        <textarea value={form.examples} onChange={e => setForm(f => ({ ...f, examples: e.target.value }))}
          rows={2} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          placeholder="Chart of person X, born 1990, Saturn in 7th..." />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Source / Notes</label>
        <input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          placeholder="BPHS Chapter 5, Parashara Hora Shastra..." />
      </div>
      <button onClick={handleSave} disabled={saving}
        className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60"
        style={{ background: '#7C3AED' }}>
        {saving ? 'Saving...' : editOpen ? 'Update Entry' : 'Add to Knowledge Base'}
      </button>
    </div>
  )

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Left panel – list */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r" style={{ borderColor: 'var(--border)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Knowledge Base</h1>
            <button onClick={() => { setForm(EMPTY_FORM); setAddOpen(true) }}
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: '#7C3AED' }}>
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search entries..." className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {['All', ...CATEGORIES].map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                style={{
                  background: catFilter === c ? (CATEGORY_COLORS[c] || '#7C3AED') + '33' : 'var(--bg-hover)',
                  color: catFilter === c ? (CATEGORY_COLORS[c] || '#7C3AED') : 'var(--text-muted)',
                  border: `1px solid ${catFilter === c ? (CATEGORY_COLORS[c] || '#7C3AED') + '55' : 'transparent'}`,
                }}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No entries found</p>
            </div>
          ) : entries.map(e => (
            <motion.div key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              onClick={() => selected?.id === e.id ? setSelected(null) : fetchDetail(e)}
              className="p-3 rounded-lg mb-1.5 cursor-pointer transition-colors"
              style={{
                background: selected?.id === e.id ? 'rgba(124,58,237,0.12)' : 'var(--bg-card)',
                border: `1px solid ${selected?.id === e.id ? '#7C3AED66' : 'var(--border)'}`,
              }}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-tight flex-1" style={{ color: 'var(--text-primary)' }}>{e.title}</p>
                <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{ background: (CATEGORY_COLORS[e.category] || '#94A3B8') + '22', color: CATEGORY_COLORS[e.category] || '#94A3B8' }}>
                  {e.category}
                </span>
              </div>
              {e.description && (
                <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{e.description}</p>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {tags(e.tags).slice(0, 3).map((t: string) => (
                  <span key={t} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>{t}</span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right panel – detail */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div key={selected.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <span className="text-xs px-2 py-1 rounded-md mb-2 inline-block"
                    style={{ background: (CATEGORY_COLORS[selected.category] || '#94A3B8') + '22', color: CATEGORY_COLORS[selected.category] || '#94A3B8' }}>
                    {selected.category}
                  </span>
                  <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{selected.title}</h2>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(selected)} className="p-2 rounded-lg transition-colors hover:bg-[#1E1E2A]">
                    <Edit3 className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                  </button>
                  <button onClick={() => handleDelete(selected.id)} className="p-2 rounded-lg transition-colors hover:bg-[#1E1E2A]">
                    <Trash2 className="w-4 h-4" style={{ color: '#EF4444' }} />
                  </button>
                </div>
              </div>

              {selected.description && (
                <div className="mb-6 p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Description</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{selected.description}</p>
                </div>
              )}

              {tags(selected.dictums).length > 0 && (
                <div className="mb-6 p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                    Dictums / Rules
                  </h3>
                  <div className="space-y-2">
                    {(tags(selected.dictums) as string[]).map((d, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: '#F59E0B' }} />
                        <p className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>"{d}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tags(selected.examples).length > 0 && (
                <div className="mb-6 p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Examples</h3>
                  <div className="space-y-2">
                    {(tags(selected.examples) as string[]).map((ex, i) => (
                      <p key={i} className="text-sm" style={{ color: 'var(--text-secondary)' }}>{i + 1}. {ex}</p>
                    ))}
                  </div>
                </div>
              )}

              {tags(selected.tags).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(tags(selected.tags) as string[]).map(t => (
                    <Badge key={t} label={t} color="#7C3AED" />
                  ))}
                </div>
              )}

              {selected.source && (
                <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>Source: {selected.source}</p>
              )}

              {/* Connected Topics */}
              {(() => {
                const conns = [
                  ...(selected.relationsFrom || []).map((r: any) => r.to),
                  ...(selected.relationsTo   || []).map((r: any) => r.from),
                ].filter((e, i, arr) => e && arr.findIndex((x: any) => x.id === e.id) === i)
                if (conns.length === 0) return null
                return (
                  <div className="mt-6 p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid #7C3AED33' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Link2 className="w-4 h-4" style={{ color: '#7C3AED' }} />
                      <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        Connected Topics ({conns.length})
                      </h3>
                    </div>
                    <div className="space-y-1.5">
                      {conns.slice(0, 8).map((e: any) => (
                        <div key={e.id} onClick={() => fetchDetail(e)}
                          className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-[#1E1E2A]">
                          <BookOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#7C3AED' }} />
                          <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{e.title}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                            style={{ background: '#7C3AED20', color: '#A78BFA' }}>{e.category}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center p-8 text-center">
              <BookOpen className="w-16 h-16 mb-4" style={{ color: 'var(--text-muted)' }} />
              <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Select an entry to view</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Or create a new one with the + button</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Modal open={addOpen || editOpen} onClose={() => { setAddOpen(false); setEditOpen(false); setForm(EMPTY_FORM) }}
        title={editOpen ? 'Edit Entry' : 'Add Knowledge Entry'}>
        <EntryForm />
      </Modal>
    </div>
  )
}

export default function KnowledgePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <KnowledgeContent />
    </Suspense>
  )
}
