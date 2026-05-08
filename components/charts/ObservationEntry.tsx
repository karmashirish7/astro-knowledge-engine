'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, CheckCircle, XCircle, HelpCircle, Trash2 } from 'lucide-react'

const CATEGORIES = ['personality','health','career','relationships','timing','spiritual','other']
const STATUS_CFG = {
  true:    { label: 'True',    color: '#10B981', Icon: CheckCircle },
  false:   { label: 'False',   color: '#EF4444', Icon: XCircle },
  unclear: { label: 'Unclear', color: '#6366F1', Icon: HelpCircle },
}

interface Observation {
  id: string; statement: string; status: string; confidence: number | null
  category: string; notes: string; dictum?: { rule: string } | null
  createdAt: string
}

export default function ObservationEntry({ chartId }: { chartId: string }) {
  const [observations, setObservations] = useState<Observation[]>([])
  const [adding, setAdding]             = useState(false)
  const [form, setForm]                 = useState({ statement: '', status: 'unclear', confidence: '', category: '', notes: '' })
  const [saving, setSaving]             = useState(false)
  const [filterCat, setFilterCat]       = useState('all')

  const load = () => {
    fetch(`/api/observations?chartId=${chartId}`)
      .then(r => r.json())
      .then(d => setObservations(Array.isArray(d) ? d : []))
  }
  useEffect(() => { load() }, [chartId])

  const save = async () => {
    if (!form.statement.trim()) return
    setSaving(true)
    try {
      await fetch('/api/observations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chartId,
          statement:  form.statement,
          status:     form.status,
          confidence: form.confidence ? parseInt(form.confidence) : null,
          category:   form.category,
          notes:      form.notes,
        }),
      })
      setForm({ statement: '', status: 'unclear', confidence: '', category: '', notes: '' })
      setAdding(false)
      load()
    } finally { setSaving(false) }
  }

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/observations/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    load()
  }

  const del = async (id: string) => {
    await fetch(`/api/observations/${id}`, { method: 'DELETE' })
    setObservations(prev => prev.filter(o => o.id !== id))
  }

  const filtered = filterCat === 'all' ? observations
    : observations.filter(o => o.category === filterCat)

  const counts = { true: 0, false: 0, unclear: 0 }
  observations.forEach(o => { if (o.status in counts) counts[o.status as keyof typeof counts]++ })

  return (
    <div>
      {/* Summary bar */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-3">
          {Object.entries(STATUS_CFG).map(([s, cfg]) => (
            <span key={s} className="flex items-center gap-1 text-xs font-medium" style={{ color: cfg.color }}>
              <cfg.Icon className="w-3.5 h-3.5" /> {counts[s as keyof typeof counts]} {cfg.label}
            </span>
          ))}
        </div>
        <button onClick={() => setAdding(true)} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: '#7C3AED22', color: '#7C3AED', border: '1px solid #7C3AED33' }}>
          <Plus className="w-3.5 h-3.5" /> Add Observation
        </button>
      </div>

      {/* Category filter */}
      {observations.length > 3 && (
        <div className="flex gap-1.5 flex-wrap mb-3">
          {['all', ...CATEGORIES].map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              className="px-2 py-0.5 rounded text-[10px] font-medium capitalize transition-colors"
              style={{ background: filterCat === c ? '#7C3AED33' : 'var(--bg-hover)', color: filterCat === c ? '#7C3AED' : 'var(--text-muted)' }}>
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Add form */}
      <AnimatePresence>
        {adding && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="mb-4 rounded-xl p-4"
            style={{ background: 'var(--bg-card)', border: '1px solid #7C3AED33', overflow: 'hidden' }}>
            <textarea value={form.statement} onChange={e => setForm(f => ({ ...f, statement: e.target.value }))}
              placeholder="State your observation precisely: 'Native is highly restless and impulsive in all relationships'"
              rows={2} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none mb-3"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  <option value="true">True</option>
                  <option value="false">False</option>
                  <option value="unclear">Unclear</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Confidence (1–10)</label>
                <input type="number" min={1} max={10} value={form.confidence}
                  onChange={e => setForm(f => ({ ...f, confidence: e.target.value }))}
                  className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-2 py-1.5 rounded-lg text-xs outline-none capitalize"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  <option value="">— select —</option>
                  {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                </select>
              </div>
            </div>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Additional notes…"
              className="w-full px-3 py-1.5 rounded-lg text-xs outline-none mb-3"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            <div className="flex gap-2">
              <button onClick={save} disabled={saving || !form.statement.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: '#7C3AED', color: '#fff', opacity: saving || !form.statement.trim() ? 0.5 : 1 }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setAdding(false)} className="px-4 py-1.5 rounded-lg text-xs"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
          No observations yet. Add one to start building research data.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map(obs => {
            const cfg = STATUS_CFG[obs.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.unclear
            return (
              <div key={obs.id} className="rounded-lg p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-start gap-2">
                  <div className="flex gap-1 flex-shrink-0 mt-0.5">
                    {Object.entries(STATUS_CFG).map(([s, c]) => (
                      <button key={s} onClick={() => updateStatus(obs.id, s)}
                        className="rounded p-0.5 transition-colors"
                        style={{ background: obs.status === s ? c.color + '22' : 'transparent', color: obs.status === s ? c.color : 'var(--text-muted)', opacity: obs.status === s ? 1 : 0.4 }}>
                        <c.Icon className="w-3.5 h-3.5" />
                      </button>
                    ))}
                  </div>
                  <p className="flex-1 text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>{obs.statement}</p>
                  <button onClick={() => del(obs.id)} className="p-1 rounded flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex gap-3 mt-1.5 ml-8">
                  {obs.confidence && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Confidence: {obs.confidence}/10</span>}
                  {obs.category   && <span className="text-[10px] capitalize" style={{ color: 'var(--text-muted)' }}>{obs.category}</span>}
                  {obs.dictum     && <span className="text-[10px]" style={{ color: '#F59E0B' }}>↳ {obs.dictum.rule?.slice(0, 40)}…</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
