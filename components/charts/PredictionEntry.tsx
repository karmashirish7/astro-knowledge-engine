'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, CheckCircle, XCircle, MinusCircle, Clock, Trash2 } from 'lucide-react'

const OUTCOME_CFG = {
  pending:   { label: 'Pending',   color: '#6366F1', Icon: Clock },
  correct:   { label: 'Correct',   color: '#10B981', Icon: CheckCircle },
  incorrect: { label: 'Incorrect', color: '#EF4444', Icon: XCircle },
  partial:   { label: 'Partial',   color: '#F59E0B', Icon: MinusCircle },
}

interface Prediction {
  id: string; prediction: string; predictedAt: string; targetDate?: string
  outcome: string; accuracy: number | null; dashaContext: string; notes: string
}

export default function PredictionEntry({ chartId, currentDasha }: {
  chartId: string
  currentDasha?: { mahadasha: string; antardasha: string } | null
}) {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [adding, setAdding]           = useState(false)
  const [resolving, setResolving]     = useState<string | null>(null)
  const [form, setForm]               = useState({
    prediction: '', targetDate: '', dashaContext: '', notes: '',
  })
  const [resolveForm, setResolveForm] = useState({ outcome: 'correct', accuracy: '7', notes: '' })
  const [saving, setSaving]           = useState(false)

  const defaultDashaCtx = currentDasha
    ? `${currentDasha.mahadasha} MD / ${currentDasha.antardasha} AD`
    : ''

  const load = () => {
    fetch(`/api/predictions?chartId=${chartId}`)
      .then(r => r.json())
      .then(d => setPredictions(Array.isArray(d) ? d : []))
  }
  useEffect(() => { load() }, [chartId])

  const save = async () => {
    if (!form.prediction.trim()) return
    setSaving(true)
    try {
      await fetch('/api/predictions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chartId,
          prediction:  form.prediction,
          targetDate:  form.targetDate || null,
          dashaContext: form.dashaContext || defaultDashaCtx,
          notes:       form.notes,
        }),
      })
      setForm({ prediction: '', targetDate: '', dashaContext: defaultDashaCtx, notes: '' })
      setAdding(false)
      load()
    } finally { setSaving(false) }
  }

  const resolve = async (id: string) => {
    await fetch(`/api/predictions/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outcome:  resolveForm.outcome,
        accuracy: parseInt(resolveForm.accuracy),
        notes:    resolveForm.notes,
      }),
    })
    setResolving(null)
    load()
  }

  const del = async (id: string) => {
    await fetch(`/api/predictions/${id}`, { method: 'DELETE' })
    setPredictions(prev => prev.filter(p => p.id !== id))
  }

  const pending   = predictions.filter(p => p.outcome === 'pending')
  const resolved  = predictions.filter(p => p.outcome !== 'pending')
  const correct   = resolved.filter(p => p.outcome === 'correct').length
  const accuracy  = resolved.length > 0 ? Math.round((correct / resolved.length) * 100) : null

  return (
    <div>
      {/* Stats + add */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-3 text-xs">
          <span style={{ color: '#6366F1' }}>{pending.length} pending</span>
          <span style={{ color: '#10B981' }}>{correct}/{resolved.length} correct</span>
          {accuracy !== null && <span style={{ color: 'var(--text-secondary)' }}>{accuracy}% accuracy</span>}
        </div>
        <button onClick={() => { setAdding(true); setForm(f => ({ ...f, dashaContext: f.dashaContext || defaultDashaCtx })) }}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: '#EC489920', color: '#EC4899', border: '1px solid #EC489933' }}>
          <Plus className="w-3.5 h-3.5" /> Add Prediction
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {adding && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="mb-4 rounded-xl p-4"
            style={{ background: 'var(--bg-card)', border: '1px solid #EC489933', overflow: 'hidden' }}>
            <textarea value={form.prediction} onChange={e => setForm(f => ({ ...f, prediction: e.target.value }))}
              placeholder="State your prediction clearly: 'Marriage will happen in 2026 during Venus AD'"
              rows={2} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none mb-3"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Target Date</label>
                <input type="date" value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))}
                  className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Dasha Context</label>
                <input value={form.dashaContext} onChange={e => setForm(f => ({ ...f, dashaContext: e.target.value }))}
                  placeholder={defaultDashaCtx || 'e.g. Saturn MD / Venus AD'}
                  className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={save} disabled={saving || !form.prediction.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: '#EC4899', color: '#fff', opacity: saving || !form.prediction.trim() ? 0.5 : 1 }}>
                {saving ? 'Saving…' : 'Record Prediction'}
              </button>
              <button onClick={() => setAdding(false)} className="px-4 py-1.5 rounded-lg text-xs"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {predictions.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
          No predictions yet. Record them now — verify them later.
        </p>
      ) : (
        <div className="space-y-2">
          {predictions.map(pred => {
            const cfg = OUTCOME_CFG[pred.outcome as keyof typeof OUTCOME_CFG] ?? OUTCOME_CFG.pending
            return (
              <div key={pred.id} className="rounded-lg p-3"
                style={{ background: 'var(--bg-card)', border: `1px solid ${cfg.color}22` }}>
                <div className="flex items-start gap-2">
                  <cfg.Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: cfg.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>{pred.prediction}</p>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {pred.dashaContext && <span className="text-[10px]" style={{ color: '#8B5CF6' }}>{pred.dashaContext}</span>}
                      {pred.targetDate   && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>→ {new Date(pred.targetDate).toLocaleDateString()}</span>}
                      {pred.accuracy     && <span className="text-[10px]" style={{ color: cfg.color }}>Accuracy: {pred.accuracy}/10</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {pred.outcome === 'pending' && (
                      <button onClick={() => setResolving(pred.id)}
                        className="text-[10px] px-2 py-1 rounded"
                        style={{ background: '#10B98120', color: '#10B981' }}>Resolve</button>
                    )}
                    <button onClick={() => del(pred.id)} className="p-1 rounded" style={{ color: 'var(--text-muted)' }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Resolve panel */}
                <AnimatePresence>
                  {resolving === pred.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }} className="mt-3 pt-3"
                      style={{ borderTop: '1px solid var(--border)', overflow: 'hidden' }}>
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Outcome</label>
                          <select value={resolveForm.outcome} onChange={e => setResolveForm(f => ({ ...f, outcome: e.target.value }))}
                            className="w-full px-2 py-1 rounded text-xs outline-none"
                            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                            {['correct','incorrect','partial'].map(o => <option key={o} value={o} className="capitalize">{o}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Accuracy (1–10)</label>
                          <input type="number" min={1} max={10} value={resolveForm.accuracy}
                            onChange={e => setResolveForm(f => ({ ...f, accuracy: e.target.value }))}
                            className="w-full px-2 py-1 rounded text-xs outline-none"
                            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                        </div>
                        <div className="flex items-end">
                          <button onClick={() => resolve(pred.id)}
                            className="w-full py-1 rounded text-xs font-bold"
                            style={{ background: '#10B981', color: '#fff' }}>Confirm</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
