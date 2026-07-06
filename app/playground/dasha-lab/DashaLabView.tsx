'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Send, Plane, X, ChevronDown, ChevronUp, CheckCircle2, Loader2,
  AlertTriangle, BookOpen, Plus, Trash2, MessageSquare, Layers, Search,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

interface ChartSummary { id: string; name: string; birthDate: string; birthTime: string }
type ForeignCategory = 'foreign-travel' | 'foreign-study' | 'foreign-employment'

const CATEGORY_LABELS: Record<ForeignCategory, string> = {
  'foreign-travel': 'Foreign Travel',
  'foreign-study': 'Foreign Study',
  'foreign-employment': 'Foreign Employment',
}

interface WorkspaceItem { chartId: string; chartName: string; date: string; eventType: ForeignCategory }
interface ThreadSummary { id: string; title: string; updatedAt: string }

interface ActiveDashaPlanets { mahadasha: string; antardasha: string; pratyantardasha: string }
interface HouseLayers { d1: Record<string, number>; d9: Record<string, number>; d10: Record<string, number> }
interface MatchedRuleRef {
  dictumId: string; category: ForeignCategory; rule: string; strength: string
  triggeredBy: { level: 'MD' | 'AD' | 'PD'; planet: string; layer: 'd1' | 'd9' | 'd10' }[]
}
interface HouseCircuit { house: number; lord: string; houseActivated: boolean; lordConnected: boolean; complete: boolean }
type PurposeCategory = 'travel' | 'study' | 'work' | 'mixed' | 'unclear'
interface ChartFactSheet {
  chartId: string; chartName: string; eventDate: string; eventType: ForeignCategory
  lagnaSign: number; active: ActiveDashaPlanets; houses: HouseLayers
  circuits: { d1: Record<number, HouseCircuit>; d9: Record<number, HouseCircuit> }
  purpose: { d1: { category: PurposeCategory; houses: number[] }; d9: { category: PurposeCategory; houses: number[] } }
  matchedRules: MatchedRuleRef[]
}
interface PatternHit { key: string; label: string; count: number; total: number; charts: string[] }

interface PredictedWindow {
  start: string; end: string; active: ActiveDashaPlanets
  completeHouses: number[]; d9CompleteHouses: number[]
  purpose: { category: PurposeCategory; houses: number[] }
  matchedRules: MatchedRuleRef[]
}
interface PredictionResult { chartName: string; eventType: ForeignCategory; from: string; to: string; windows: PredictedWindow[] }

interface DashaLookupPeriod { start: string; end: string; active: ActiveDashaPlanets }
interface DashaLookupResult { chartName: string; year: number; periods: DashaLookupPeriod[] }

const PURPOSE_COLORS: Record<PurposeCategory, string> = {
  travel: '#06B6D4', study: '#8B5CF6', work: '#F59E0B', mixed: '#EC4899', unclear: 'var(--text-muted)',
}
const MOVEMENT_HOUSES = [3, 7, 9, 12] as const

interface ChatTurn {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  knowledgeGap?: boolean
  category?: ForeignCategory | null
  suggestedRule?: string | null
  ruleSaved?: boolean
}

const PLANET_COLORS: Record<string, string> = {
  Ketu: '#78716C', Venus: '#EC4899', Sun: '#F59E0B', Moon: '#94A3B8',
  Mars: '#EF4444', Rahu: '#8B5CF6', Jupiter: '#F97316', Saturn: '#6366F1', Mercury: '#10B981',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtRelative(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}
function newId() { return Math.random().toString(36).slice(2) }

// ── Small UI pieces ──────────────────────────────────────────────────────────

function PlanetChip({ planet }: { planet: string }) {
  const color = PLANET_COLORS[planet] ?? '#94a3b8'
  return <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${color}22`, color }}>{planet}</span>
}

function houseOf(houses: Record<string, number>, house: number): string[] {
  return Object.entries(houses).filter(([, h]) => h === house).map(([p]) => p)
}

function CircuitBadge({ c }: { c: HouseCircuit }) {
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
      style={{ background: c.complete ? '#10B98122' : 'var(--bg-card)', color: c.complete ? '#10B981' : 'var(--text-muted)' }}
      title={`Lord: ${c.lord} · house activated: ${c.houseActivated} · lord connected: ${c.lordConnected}`}>
      H{c.house} {c.complete ? '✓' : '·'}
    </span>
  )
}

function FactSheetCard({ fs }: { fs: ChartFactSheet }) {
  const rows: { label: string; layer: keyof HouseLayers }[] = [
    { label: 'D1', layer: 'd1' }, { label: 'D9 → D1', layer: 'd9' }, { label: 'D10 → D1', layer: 'd10' },
  ]
  return (
    <div className="rounded-lg p-3 space-y-2" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
          {fs.chartName} <span className="font-normal" style={{ color: 'var(--text-muted)' }}>· {fmtDate(fs.eventDate)} · {CATEGORY_LABELS[fs.eventType]}</span>
        </p>
        <Link href={`/chart/${fs.chartId}`} className="text-[10px]" style={{ color: '#06B6D4' }}>open →</Link>
      </div>
      <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
        MD <PlanetChip planet={fs.active.mahadasha} /> → AD <PlanetChip planet={fs.active.antardasha} /> → PD <PlanetChip planet={fs.active.pratyantardasha} />
      </div>
      <div className="space-y-1">
        {rows.map(r => (
          <div key={r.layer} className="flex gap-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <span className="w-14 flex-shrink-0 font-semibold">{r.label}</span>
            <span>H9: {houseOf(fs.houses[r.layer], 9).join(', ') || '—'} · H12: {houseOf(fs.houses[r.layer], 12).join(', ') || '—'}</span>
          </div>
        ))}
      </div>
      <div className="space-y-1 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold w-14 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>Circuits</span>
          {MOVEMENT_HOUSES.map(h => <CircuitBadge key={h} c={fs.circuits.d1[h]} />)}
          <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>(D1)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold w-14 flex-shrink-0 opacity-0">Circuits</span>
          {MOVEMENT_HOUSES.map(h => <CircuitBadge key={h} c={fs.circuits.d9[h]} />)}
          <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>(D9)</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>Purpose</span>
          <span className="px-1.5 py-0.5 rounded font-semibold" style={{ background: `${PURPOSE_COLORS[fs.purpose.d1.category]}22`, color: PURPOSE_COLORS[fs.purpose.d1.category] }}>
            {fs.purpose.d1.category}
          </span>
          {fs.purpose.d1.category !== fs.purpose.d9.category && (
            <span style={{ color: 'var(--text-muted)' }}>(D9 says {fs.purpose.d9.category})</span>
          )}
        </div>
      </div>
      {fs.matchedRules.length > 0 && (
        <p className="text-[10px]" style={{ color: '#10B981' }}>{fs.matchedRules.length} knowledge-base rule(s) matched</p>
      )}
    </div>
  )
}

function PredictionCard({ pr }: { pr: PredictionResult }) {
  return (
    <div className="rounded-lg p-3 space-y-2" style={{ background: 'var(--bg-hover)', border: '1px solid #06B6D444' }}>
      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
        {pr.chartName} <span className="font-normal" style={{ color: 'var(--text-muted)' }}>· predicting {CATEGORY_LABELS[pr.eventType]} · {fmtDate(pr.from)} → {fmtDate(pr.to)}</span>
      </p>
      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{pr.windows.length} window{pr.windows.length === 1 ? '' : 's'} found{pr.windows.length > 0 ? ` — nearest below` : ''}</p>
      <div className="space-y-1.5">
        {pr.windows.slice(0, 5).map(w => (
          <div key={`${w.start}-${w.end}`} className="rounded-md p-2" style={{ background: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between text-[10px]">
              <span style={{ color: 'var(--text-primary)' }}>{fmtDate(w.start)} → {fmtDate(w.end)}</span>
              <span className="px-1.5 py-0.5 rounded font-semibold" style={{ background: `${PURPOSE_COLORS[w.purpose.category]}22`, color: PURPOSE_COLORS[w.purpose.category] }}>
                {w.purpose.category}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              <PlanetChip planet={w.active.mahadasha} /> → <PlanetChip planet={w.active.antardasha} /> → <PlanetChip planet={w.active.pratyantardasha} />
            </div>
            <p className="text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>
              D1: H{w.completeHouses.join(', H') || '—'} · D9: H{w.d9CompleteHouses.join(', H') || '—'}
              {w.matchedRules.length > 0 && <span style={{ color: '#10B981' }}> · {w.matchedRules.length} rule(s) matched</span>}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function DashaLookupCard({ r }: { r: DashaLookupResult }) {
  return (
    <div className="rounded-lg p-3 space-y-2" style={{ background: 'var(--bg-hover)', border: '1px solid #8B5CF644' }}>
      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
        {r.chartName} <span className="font-normal" style={{ color: 'var(--text-muted)' }}>· dasha running in {r.year}</span>
      </p>
      <div className="space-y-1.5">
        {r.periods.length === 0 && (
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>No computed dasha data overlaps {r.year}.</p>
        )}
        {r.periods.map(p => (
          <div key={`${p.start}-${p.end}`} className="rounded-md p-2 flex items-center justify-between" style={{ background: 'var(--bg-card)' }}>
            <span className="text-[10px]" style={{ color: 'var(--text-primary)' }}>{fmtDate(p.start)} → {fmtDate(p.end)}</span>
            <div className="flex items-center gap-1.5">
              <PlanetChip planet={p.active.mahadasha} /> → <PlanetChip planet={p.active.antardasha} /> → <PlanetChip planet={p.active.pratyantardasha} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────

export default function DashaLabView({ threadId }: { threadId: string | null }) {
  const router = useRouter()
  const [threads, setThreads] = useState<ThreadSummary[]>([])
  const [charts, setCharts] = useState<ChartSummary[]>([])
  const [workspace, setWorkspace] = useState<WorkspaceItem[]>([])
  const [factSheets, setFactSheets] = useState<ChartFactSheet[]>([])
  const [patterns, setPatterns] = useState<PatternHit[]>([])
  const [predictions, setPredictions] = useState<PredictionResult[]>([])
  const [dashaLookups, setDashaLookups] = useState<DashaLookupResult[]>([])
  const [showFacts, setShowFacts] = useState(true)
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadingAll, setLoadingAll] = useState(false)
  const [loadingThread, setLoadingThread] = useState(false)
  const [ruleDraft, setRuleDraft] = useState<Record<string, string>>({})
  const [ruleCategory, setRuleCategory] = useState<Record<string, ForeignCategory>>({})
  const [sidebarTab, setSidebarTab] = useState<'chats' | 'charts'>('chats')
  const [chartSearch, setChartSearch] = useState('')
  const [quickDashaLoadingId, setQuickDashaLoadingId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  function refreshThreads() {
    fetch('/api/playground/foreign-lab/threads').then(r => r.json()).then(d => setThreads(Array.isArray(d) ? d : []))
  }

  useEffect(() => {
    refreshThreads()
    fetch('/api/chart?limit=50').then(r => r.json()).then(d => setCharts(Array.isArray(d) ? d : []))
  }, [])

  useEffect(() => {
    if (!threadId) return
    let active = true
    void (async () => {
      setLoadingThread(true)
      try {
        const res = await fetch(`/api/playground/foreign-lab/threads/${threadId}`)
        const data = await res.json()
        if (!active || data.error) return
        setTurns(data.messages.map((m: { id: string; role: 'user' | 'assistant' | 'system'; content: string; knowledgeGap: boolean; category: string; suggestedRule: string; ruleSaved: boolean }) => ({
          id: m.id, role: m.role, content: m.content,
          knowledgeGap: m.knowledgeGap, category: (m.category || null) as ForeignCategory | null,
          suggestedRule: m.suggestedRule || null, ruleSaved: m.ruleSaved,
        })))
        setWorkspace(data.workspace ?? [])
        setFactSheets(data.factSheets ?? [])
        setPatterns(data.patterns ?? [])
        setPredictions(data.predictions ?? [])
        setDashaLookups(data.dashaLookups ?? [])
      } finally {
        if (active) setLoadingThread(false)
      }
    })()
    return () => { active = false }
  }, [threadId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns, busy])

  // ── Slash-command chart picker ──
  const slashMatch = input.match(/\/([^/\n]*)$/)
  const slashQuery = slashMatch ? slashMatch[1] : null
  const slashResults = slashQuery !== null
    ? charts.filter(c => c.name.toLowerCase().includes(slashQuery.toLowerCase())).slice(0, 8)
    : []

  function pickSlashChart(name: string) {
    if (!slashMatch) return
    const start = input.length - slashMatch[0].length
    setInput(input.slice(0, start) + name + ' ')
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    setTurns(prev => [...prev, { id: newId(), role: 'user', content: text }])
    setBusy(true)

    try {
      const res = await fetch('/api/playground/foreign-lab/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, threadId }),
      })
      const data = await res.json()
      if (data.error) {
        setTurns(prev => [...prev, { id: newId(), role: 'system', content: data.error }])
      } else {
        setWorkspace(data.workspace ?? [])
        setFactSheets(data.factSheets ?? [])
        setPatterns(data.patterns ?? [])
        setPredictions(data.predictions ?? [])
        setDashaLookups(data.dashaLookups ?? [])
        setTurns(prev => [...prev, {
          id: data.messageId ?? newId(), role: 'assistant', content: data.reply,
          knowledgeGap: data.knowledgeGap, category: data.category, suggestedRule: data.suggestedRule,
        }])
        refreshThreads()
        if (!threadId && data.threadId) router.replace(`/playground/dasha-lab/${data.threadId}`, { scroll: false })
      }
    } catch {
      setTurns(prev => [...prev, { id: newId(), role: 'system', content: 'Something went wrong reaching Dasha Lab.' }])
    } finally {
      setBusy(false)
    }
  }

  async function handleLoadAllCharts() {
    if (busy || loadingAll) return
    setLoadingAll(true)
    try {
      let tid = threadId
      if (!tid) {
        const created = await fetch('/api/playground/foreign-lab/threads', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
        }).then(r => r.json())
        tid = created.id
        router.replace(`/playground/dasha-lab/${tid}`, { scroll: false })
      }
      const res = await fetch(`/api/playground/foreign-lab/threads/${tid}/load-all`, { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        setTurns(prev => [...prev, { id: newId(), role: 'system', content: data.error }])
        return
      }
      setWorkspace(data.workspace ?? [])
      setFactSheets(data.factSheets ?? [])
      setPatterns(data.patterns ?? [])
      setPredictions(data.predictions ?? [])
      if (data.note) setTurns(prev => [...prev, { id: data.note.id, role: 'system', content: data.note.content }])
      refreshThreads()
    } catch {
      setTurns(prev => [...prev, { id: newId(), role: 'system', content: 'Something went wrong loading all charts.' }])
    } finally {
      setLoadingAll(false)
    }
  }

  async function handleQuickDasha(chart: ChartSummary) {
    if (quickDashaLoadingId) return
    setQuickDashaLoadingId(chart.id)
    try {
      let tid = threadId
      if (!tid) {
        const created = await fetch('/api/playground/foreign-lab/threads', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
        }).then(r => r.json())
        tid = created.id
        router.replace(`/playground/dasha-lab/${tid}`, { scroll: false })
      }
      const res = await fetch(`/api/playground/foreign-lab/threads/${tid}/quick-dasha`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chartId: chart.id }),
      })
      const data = await res.json()
      if (data.error) {
        setTurns(prev => [...prev, { id: newId(), role: 'system', content: data.error }])
        return
      }
      setWorkspace(data.workspace ?? [])
      setFactSheets(data.factSheets ?? [])
      setPatterns(data.patterns ?? [])
      setShowFacts(true)
      refreshThreads()
    } catch {
      setTurns(prev => [...prev, { id: newId(), role: 'system', content: `Something went wrong loading ${chart.name}'s dasha.` }])
    } finally {
      setQuickDashaLoadingId(null)
    }
  }

  async function handleSaveRule(turn: ChatTurn) {
    const ruleText = (ruleDraft[turn.id] ?? turn.suggestedRule ?? '').trim()
    const category = ruleCategory[turn.id] ?? turn.category ?? 'foreign-travel'
    if (!ruleText) return
    setBusy(true)
    try {
      await fetch('/api/dictums', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rule: ruleText, interpretation: ruleText, category, strength: 'Conditional', source: 'User taught (Dasha Lab)' }),
      })
      await fetch(`/api/playground/foreign-lab/messages/${turn.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ruleSaved: true }),
      }).catch(() => {})
      setTurns(prev => prev.map(t => (t.id === turn.id ? { ...t, ruleSaved: true } : t)))
    } finally {
      setBusy(false)
    }
  }

  function removeFromWorkspace(chartId: string, date: string) {
    setWorkspace(prev => prev.filter(w => !(w.chartId === chartId && w.date === date)))
    setFactSheets(prev => prev.filter(fs => !(fs.chartId === chartId && fs.eventDate.slice(0, 10) === date)))
  }

  async function handleDeleteThread(id: string) {
    setThreads(prev => prev.filter(t => t.id !== id))
    await fetch(`/api/playground/foreign-lab/threads/${id}`, { method: 'DELETE' }).catch(() => {})
    if (id === threadId) router.push('/playground/dasha-lab')
  }

  function handleNewChat() {
    // Reset immediately — navigating to the same URL you're already on is a
    // no-op for the router (no remount), so without this the click would
    // otherwise appear to do nothing when you're already on a blank chat.
    setTurns([]); setWorkspace([]); setFactSheets([]); setPatterns([]); setPredictions([]); setDashaLookups([]); setInput('')
    if (threadId) router.push('/playground/dasha-lab')
  }

  return (
    <div className="h-screen flex" style={{ background: 'var(--bg-primary)' }}>
      {/* ── Left: research thread history + chart list ─────────────── */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Plane className="w-4 h-4" style={{ color: '#06B6D4' }} />
            <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Dasha Lab</h1>
          </div>
          <button onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer mb-3"
            style={{ background: '#06B6D420', color: '#06B6D4', border: '1px solid #06B6D433' }}>
            <Plus className="w-3.5 h-3.5" /> New chat
          </button>
          <div className="flex rounded-lg p-0.5" style={{ background: 'var(--bg-card)' }}>
            {(['chats', 'charts'] as const).map(tab => (
              <button key={tab} onClick={() => setSidebarTab(tab)}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                style={{
                  background: sidebarTab === tab ? 'var(--bg-hover)' : 'transparent',
                  color: sidebarTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                }}>
                {tab === 'chats' ? <MessageSquare className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
                {tab === 'chats' ? 'Chats' : 'Charts'}
              </button>
            ))}
          </div>
        </div>

        {sidebarTab === 'chats' ? (
          <div className="flex-1 overflow-y-auto p-2">
            {threads.map(t => (
              <div key={t.id} className="group relative mb-1">
                <button onClick={() => router.push(`/playground/dasha-lab/${t.id}`)}
                  className="w-full text-left p-2.5 pr-8 rounded-lg transition-colors"
                  style={{
                    background: t.id === threadId ? 'rgba(6,182,212,0.12)' : 'var(--bg-card)',
                    border: `1px solid ${t.id === threadId ? '#06B6D466' : 'var(--border)'}`,
                  }}>
                  <p className="text-sm truncate flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                    <MessageSquare className="w-3 h-3 flex-shrink-0 opacity-50" /> {t.title}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{fmtRelative(t.updatedAt)}</p>
                </button>
                <button onClick={() => handleDeleteThread(t.id)}
                  className="absolute right-2 top-2.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[var(--bg-hover)]">
                  <Trash2 className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
            ))}
            {threads.length === 0 && (
              <p className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>No research yet — start a new chat</p>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input value={chartSearch} onChange={e => setChartSearch(e.target.value)} placeholder="Search charts…"
                  className="w-full pl-8 pr-2 py-1.5 rounded-lg text-xs outline-none"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {charts.filter(c => c.name.toLowerCase().includes(chartSearch.toLowerCase())).map(c => (
                <button key={c.id} onClick={() => handleQuickDasha(c)} disabled={!!quickDashaLoadingId}
                  className="w-full text-left p-2.5 rounded-lg mb-1 flex items-center justify-between gap-2 transition-colors cursor-pointer disabled:opacity-60"
                  style={{
                    background: workspace.some(w => w.chartId === c.id) ? 'rgba(6,182,212,0.12)' : 'var(--bg-card)',
                    border: `1px solid ${workspace.some(w => w.chartId === c.id) ? '#06B6D466' : 'var(--border)'}`,
                  }}>
                  <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
                  {quickDashaLoadingId === c.id
                    ? <Loader2 className="w-3 h-3 flex-shrink-0 animate-spin" style={{ color: 'var(--text-muted)' }} />
                    : <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{c.birthDate}</span>}
                </button>
              ))}
              {charts.length === 0 && (
                <p className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>No saved charts yet</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Right: conversation ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Foreign Travel / Study / Employment — multi-chart research</p>
          <div className="ml-auto flex items-center gap-3">
            <button onClick={handleLoadAllCharts} disabled={busy || loadingAll}
              className="text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
              style={{ color: 'var(--text-muted)' }}
              title="Add every saved chart as a whole-life predicted-window scan">
              {loadingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Layers className="w-3 h-3" />} Load all charts
            </button>
            <Link href="/dictums" className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <BookOpen className="w-3 h-3" /> Knowledge base
            </Link>
          </div>
        </div>

        {workspace.length > 0 && (
          <div className="px-6 py-2 border-b flex items-center gap-1.5 flex-wrap" style={{ borderColor: 'var(--border)' }}>
            <span className="text-[10px] font-semibold uppercase tracking-wider mr-1" style={{ color: 'var(--text-muted)' }}>Workspace</span>
            {workspace.map(w => (
              <span key={`${w.chartId}-${w.date}`} className="flex items-center gap-1 text-xs pl-2.5 pr-1.5 py-1 rounded-full" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                {w.chartName} <span style={{ color: 'var(--text-muted)' }}>· {fmtDate(w.date)}</span>
                <button onClick={() => removeFromWorkspace(w.chartId, w.date)} className="p-0.5 rounded hover:bg-[var(--bg-card)]">
                  <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Workspace facts + patterns — collapsible */}
        {(factSheets.length > 0 || patterns.length > 0 || predictions.length > 0 || dashaLookups.length > 0) && (
          <div className="border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
            <button onClick={() => setShowFacts(s => !s)}
              className="w-full flex items-center justify-between px-6 py-2 text-xs font-semibold"
              style={{ color: 'var(--text-secondary)' }}>
              <span>Workspace facts &amp; observed patterns</span>
              {showFacts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <AnimatePresence>
              {showFacts && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} style={{ overflow: 'hidden' }}>
                  <div className="px-6 pb-4 space-y-3 max-h-72 overflow-y-auto">
                    {predictions.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {predictions.map((pr, i) => <PredictionCard key={`${pr.chartName}-${pr.from}-${i}`} pr={pr} />)}
                      </div>
                    )}
                    {dashaLookups.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {dashaLookups.map((r, i) => <DashaLookupCard key={`${r.chartName}-${r.year}-${i}`} r={r} />)}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {factSheets.map(fs => <FactSheetCard key={`${fs.chartId}-${fs.eventDate}`} fs={fs} />)}
                    </div>
                    {patterns.length > 0 && (
                      <div className="rounded-lg p-3" style={{ background: 'var(--bg-hover)' }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                          Correlation matrix across workspace ({factSheets.length} chart{factSheets.length === 1 ? '' : 's'}{factSheets.length < 10 ? ' — preliminary, add more for a reliable read' : ''})
                        </p>
                        <ul className="space-y-1">
                          {patterns.map(p => (
                            <li key={p.key} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {p.label} — <span style={{ color: '#06B6D4' }}>{p.count}/{p.total}</span> ({p.charts.join(', ')})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {loadingThread ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
            </div>
          ) : turns.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 text-center py-16">
              <p className="text-sm max-w-lg" style={{ color: 'var(--text-muted)' }}>
                Tell me about one or more charts — any date format works. Type &ldquo;/&rdquo; to pick a saved chart, or just
                write naturally: &ldquo;Parwata Kadariya went abroad on 2022/10/24, and Bhawana Kadariya moved abroad in
                March 2021 — what do their charts have in common?&rdquo; I&apos;ll pull D1, D9 and D10 (superimposed),
                look for a shared pattern, and cite the knowledge base.
              </p>
            </div>
          ) : (
            turns.map(turn => (
              <TurnBubble
                key={turn.id} turn={turn}
                ruleDraft={ruleDraft} setRuleDraft={setRuleDraft}
                ruleCategory={ruleCategory} setRuleCategory={setRuleCategory}
                onSaveRule={handleSaveRule}
              />
            ))
          )}

          {busy && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> thinking…
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex-shrink-0 relative" style={{ borderColor: 'var(--border)' }}>
          {slashQuery !== null && slashResults.length > 0 && (
            <div className="absolute bottom-full left-4 right-4 mb-2 rounded-lg overflow-hidden max-h-56 overflow-y-auto z-10"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 -4px 16px rgba(0,0,0,0.2)' }}>
              {slashResults.map(c => (
                <button key={c.id} onClick={() => pickSlashChart(c.name)}
                  className="w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ color: 'var(--text-primary)' }}>
                  {c.name} <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{c.birthDate}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
              placeholder='Discuss any chart, any date format, any number of people… (type "/" to pick a chart)'
              disabled={busy}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            <button onClick={handleSend} disabled={busy}
              className="px-4 py-2.5 rounded-lg flex items-center gap-1.5 text-sm font-semibold"
              style={{ background: '#06B6D420', color: '#06B6D4', border: '1px solid #06B6D433', opacity: busy ? 0.5 : 1 }}>
              <Send className="w-3.5 h-3.5" /> Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Turn rendering ───────────────────────────────────────────────────────────

function TurnBubble({
  turn, ruleDraft, setRuleDraft, ruleCategory, setRuleCategory, onSaveRule,
}: {
  turn: ChatTurn
  ruleDraft: Record<string, string>
  setRuleDraft: (fn: (prev: Record<string, string>) => Record<string, string>) => void
  ruleCategory: Record<string, ForeignCategory>
  setRuleCategory: (fn: (prev: Record<string, ForeignCategory>) => Record<string, ForeignCategory>) => void
  onSaveRule: (turn: ChatTurn) => void
}) {
  if (turn.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-lg px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap" style={{ background: '#06B6D4', color: '#fff' }}>
          {turn.content}
        </div>
      </div>
    )
  }

  if (turn.role === 'system') {
    return (
      <div className="flex justify-start">
        <div className="max-w-lg px-4 py-2.5 rounded-2xl text-sm flex items-start gap-2" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: '#F59E0B' }} />
          {turn.content}
        </div>
      </div>
    )
  }

  // assistant
  return (
    <div className="flex justify-start">
      <div className="max-w-xl w-full px-4 py-3 rounded-2xl text-sm space-y-3"
        style={{ background: 'var(--bg-card)', border: `1px solid ${turn.knowledgeGap ? '#F59E0B44' : 'var(--border)'}` }}>
        <p className="whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{turn.content}</p>

        {turn.knowledgeGap && !turn.ruleSaved && (
          <div className="space-y-2 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#F59E0B' }} />
              <p className="text-xs font-semibold" style={{ color: '#F59E0B' }}>Not in the knowledge base — teach it?</p>
            </div>
            <div className="flex gap-1.5">
              {(Object.keys(CATEGORY_LABELS) as ForeignCategory[]).map(c => (
                <button key={c} onClick={() => setRuleCategory(prev => ({ ...prev, [turn.id]: c }))}
                  className="px-2 py-1 rounded-md text-[10px] font-semibold"
                  style={{
                    background: (ruleCategory[turn.id] ?? turn.category ?? 'foreign-travel') === c ? '#06B6D433' : 'var(--bg-hover)',
                    color: (ruleCategory[turn.id] ?? turn.category ?? 'foreign-travel') === c ? '#06B6D4' : 'var(--text-muted)',
                  }}>
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
            <textarea
              value={ruleDraft[turn.id] ?? turn.suggestedRule ?? ''}
              onChange={e => setRuleDraft(prev => ({ ...prev, [turn.id]: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            <button onClick={() => onSaveRule(turn)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: '#10B98120', color: '#10B981', border: '1px solid #10B98133' }}>
              Save rule to knowledge base
            </button>
          </div>
        )}
        {turn.ruleSaved && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: '#10B981' }}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Saved.
          </p>
        )}
      </div>
    </div>
  )
}
