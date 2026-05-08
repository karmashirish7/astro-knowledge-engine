'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Send, BookOpen, FileText, Tag, Clock, ChevronRight, Check, X, Loader2, CheckCircle2, Trash2 } from 'lucide-react'

const ENTITY_COLORS: Record<string, string> = {
  planet: '#F59E0B', house: '#3B82F6', rashi: '#10B981', nakshatra: '#EC4899',
}

const PLACEHOLDERS = [
  'Saturn in 7th house in Libra delays marriage but gives stability later...',
  'Jupiter in the 5th house in Sagittarius is excellent for children and creativity...',
  'Rohini Nakshatra Moon gives strong attachment to mother and luxuries...',
  'When Rahu is in the 1st house, the person has unusual personality and foreign connections...',
]

type Phase = 'input' | 'review' | 'done'

export default function DumpPage() {
  const [text, setText]               = useState('')
  const [phase, setPhase]             = useState<Phase>('input')
  const [extracting, setExtracting]   = useState(false)
  const [saving, setSaving]           = useState(false)
  const [pendingDictums, setPendingDictums] = useState<string[]>([])
  const [accepted, setAccepted]       = useState<Set<number>>(new Set())
  const [result, setResult]           = useState<any>(null)
  const [history, setHistory]         = useState<any[]>([])
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0])
  const [error, setError]             = useState('')

  useEffect(() => {
    const i = setInterval(() => {
      setPlaceholder(PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)])
    }, 4000)
    return () => clearInterval(i)
  }, [])

  useEffect(() => {
    fetch('/api/dump').then(r => r.json()).then(data => {
      setHistory(Array.isArray(data) ? data : [])
    }).catch(() => {})
  }, [])

  const handleExtract = async () => {
    if (!text.trim() || extracting) return
    setExtracting(true)
    setError('')
    try {
      const res = await fetch('/api/dump/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Extraction failed'); return }
      const dictums: string[] = data.dictums || []
      setPendingDictums(dictums)
      // Default all accepted
      setAccepted(new Set(dictums.map((_, i) => i)))
      setPhase('review')
    } finally {
      setExtracting(false)
    }
  }

  const toggleDictum = (i: number) => {
    setAccepted(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const confirmedDictums = pendingDictums.filter((_, i) => accepted.has(i))
      const res = await fetch('/api/dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, confirmedDictums }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Save failed'); return }
      setResult({ ...data, confirmedDictums })
      setPhase('done')
      setText('')
      fetch('/api/dump').then(r => r.json()).then(d => setHistory(Array.isArray(d) ? d : []))
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setPhase('input')
    setPendingDictums([])
    setAccepted(new Set())
    setResult(null)
    setError('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleExtract()
  }

  return (
    <div className="min-h-screen p-8" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#F59E0B22' }}>
            <Zap className="w-5 h-5" style={{ color: '#F59E0B' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Dump Mode</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Write anything — AI extracts dictums, you confirm each one
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Input */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: '#F59E0B' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Free-write mode</span>
              <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>⌘+Enter to extract</span>
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={phase !== 'input'}
              rows={12}
              className="w-full px-5 py-4 text-sm outline-none resize-none leading-relaxed disabled:opacity-50"
              style={{ background: 'transparent', color: 'var(--text-primary)' }}
            />
            <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {text.length} chars
              </span>
              {phase === 'input' ? (
                <motion.button
                  onClick={handleExtract}
                  disabled={!text.trim() || extracting}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ background: '#F59E0B' }}
                >
                  {extracting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Extract Dictums
                    </>
                  )}
                </motion.button>
              ) : (
                <button
                  onClick={handleReset}
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                >
                  ← Edit text
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-3 p-3 rounded-lg text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                Past Dumps
              </h3>
              <div className="space-y-2">
                {history.slice(0, 20).map(h => {
                  const extracted = (() => { try { return JSON.parse(h.extracted || '{}') } catch { return {} } })()
                  return (
                    <div key={h.id} className="group p-3 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-xs font-medium line-clamp-2 flex-1" style={{ color: 'var(--text-primary)' }}>
                          {extracted.title || h.rawText.slice(0, 80)}
                        </p>
                        <button
                          onClick={async () => {
                            if (!confirm('Delete this dump?')) return
                            await fetch('/api/dump', {
                              method: 'DELETE',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id: h.id }),
                            })
                            setHistory(prev => prev.filter(d => d.id !== h.id))
                          }}
                          className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 rounded transition-opacity hover:bg-red-500/10"
                          title="Delete dump"
                        >
                          <Trash2 className="w-3.5 h-3.5" style={{ color: '#EF4444' }} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {new Date(h.createdAt).toLocaleDateString()}
                        </span>
                        {extracted.category && (
                          <span className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: '#7C3AED22', color: '#A78BFA' }}>
                            {extracted.category}
                          </span>
                        )}
                        {extracted.dictums?.length > 0 && (
                          <span className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(236,72,153,0.1)', color: '#EC4899' }}>
                            {extracted.dictums.length} dictums
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </motion.div>

        {/* Right: Review / Result / Empty */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
          <AnimatePresence mode="wait">

            {/* Review phase */}
            {phase === 'review' && (
              <motion.div key="review" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="mb-4 p-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4" style={{ color: '#F59E0B' }} />
                    <span className="text-sm font-semibold" style={{ color: '#F59E0B' }}>
                      {pendingDictums.length} dictum{pendingDictums.length !== 1 ? 's' : ''} extracted
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Accept or reject each one, then save to the Knowledge Base
                  </p>
                </div>

                {pendingDictums.length === 0 ? (
                  <div className="p-6 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      No predictive rules found in this text. Try adding more astrological context.
                    </p>
                    <button onClick={handleReset} className="mt-3 text-xs underline" style={{ color: 'var(--text-secondary)' }}>
                      Go back
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 mb-4" style={{ maxHeight: '360px', overflowY: 'auto' }}>
                      {pendingDictums.map((dictum, i) => {
                        const isAccepted = accepted.has(i)
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all"
                            onClick={() => toggleDictum(i)}
                            style={{
                              background: isAccepted ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.05)',
                              border: `1px solid ${isAccepted ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.15)'}`,
                            }}
                          >
                            <div
                              className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 transition-all"
                              style={{
                                background: isAccepted ? '#10B981' : 'rgba(239,68,68,0.15)',
                                border: `1px solid ${isAccepted ? '#10B981' : 'rgba(239,68,68,0.3)'}`,
                              }}
                            >
                              {isAccepted
                                ? <Check className="w-3.5 h-3.5 text-white" />
                                : <X className="w-3.5 h-3.5" style={{ color: '#F87171' }} />
                              }
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: isAccepted ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                              "{dictum}"
                            </p>
                          </motion.div>
                        )
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {accepted.size} of {pendingDictums.length} accepted
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setAccepted(new Set())}
                          className="text-xs px-3 py-1.5 rounded-lg"
                          style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                        >
                          Reject all
                        </button>
                        <button
                          onClick={() => setAccepted(new Set(pendingDictums.map((_, i) => i)))}
                          className="text-xs px-3 py-1.5 rounded-lg"
                          style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                        >
                          Accept all
                        </button>
                        <motion.button
                          onClick={handleSave}
                          disabled={saving}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                          style={{ background: '#10B981' }}
                        >
                          {saving ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                          ) : (
                            <><Send className="w-4 h-4" /> Save {accepted.size > 0 ? accepted.size : 'none'}</>
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* Done phase */}
            {phase === 'done' && result && (
              <motion.div key="done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="mb-4 p-4 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4" style={{ color: '#10B981' }} />
                    <span className="text-sm font-semibold" style={{ color: '#10B981' }}>Saved to Knowledge Base</span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {result.confirmedDictums?.length || 0} dictums integrated · knowledge entry created
                  </p>
                </div>

                {/* Entities */}
                {result.extracted?.entities?.length > 0 && (
                  <div className="mb-4 p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        Detected Entities
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {result.extracted.entities.map((e: any, i: number) => (
                        <span key={i}
                          className="px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background: (ENTITY_COLORS[e.type] || '#94A3B8') + '22',
                            color: ENTITY_COLORS[e.type] || '#94A3B8',
                            border: `1px solid ${(ENTITY_COLORS[e.type] || '#94A3B8')}44`,
                          }}>
                          {e.name} <span className="opacity-60 text-[10px]">({e.type})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Category */}
                <div className="mb-4 p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                    Auto-classified
                  </p>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" style={{ color: '#7C3AED' }} />
                    <span className="text-sm font-semibold" style={{ color: '#A78BFA' }}>
                      {result.extracted?.category || 'Concepts'}
                    </span>
                    <ChevronRight className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {result.entry?.title}
                    </span>
                  </div>
                </div>

                {/* Saved dictums */}
                {result.confirmedDictums?.length > 0 && (
                  <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4" style={{ color: '#EC4899' }} />
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        Saved Dictums ({result.confirmedDictums.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {result.confirmedDictums.map((d: string, i: number) => (
                        <div key={i}
                          className="flex items-start gap-2 p-2.5 rounded-lg"
                          style={{ background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.15)' }}>
                          <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#10B981' }} />
                          <p className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>"{d}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleReset}
                  className="mt-4 w-full py-2 rounded-lg text-sm font-medium"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                >
                  Dump more knowledge
                </button>
              </motion.div>
            )}

            {/* Empty state */}
            {phase === 'input' && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-center rounded-xl p-8"
                style={{ border: '2px dashed var(--border)', minHeight: 360 }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 float"
                  style={{ background: '#F59E0B11', border: '1px solid #F59E0B22' }}>
                  <Zap className="w-8 h-8" style={{ color: '#F59E0B' }} />
                </div>
                <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Awaiting your knowledge
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Write your astrology notes freely.<br />
                  AI extracts every distinct dictum,<br />
                  you confirm which ones to keep.
                </p>
                <div className="mt-6 space-y-1.5">
                  {[
                    'AI splits paragraphs into individual dictums',
                    'Review and accept/reject each one',
                    'Only confirmed dictums enter the system',
                    'Builds Knowledge Base entries automatically',
                  ].map(f => (
                    <div key={f} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span style={{ color: '#F59E0B' }}>✦</span> {f}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
