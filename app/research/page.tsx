'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Zap, BookOpen, Filter } from 'lucide-react'
import ChartPreviewCard from '@/components/research/ChartPreviewCard'

const PLANETS   = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu']
const VIMSH_LORDS = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu']
const SIGNS     = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']
const NAKS      = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati']
const DIVISIONS = ['D1','D2','D3','D4','D7','D9','D10','D12','D16','D20','D24','D27','D60']

type CondRow = {
  id:         string
  division:   string  // 'D1' | 'D9' | ...
  planet:     string  // '' = lagna | 'Sun' | 'Moon' | ...
  qualifier:  string  // see getQualifiers()
  value:      string  // sign / nak / house-num / etc.
  houseValue: string  // only for 'signInHouse' — which house
}

function newRow(): CondRow {
  return { id: Math.random().toString(36).slice(2), division: 'D1', planet: 'Saturn', qualifier: 'house', value: '7', houseValue: '1' }
}

function getQualifiers(division: string, planet: string) {
  const isD1     = division === 'D1'
  const hasPlanet = !!planet
  const isNode   = planet === 'Rahu' || planet === 'Ketu'

  if (!hasPlanet) {
    return [
      { value: 'sign',        label: 'Lagna Sign'      },
      { value: 'signInHouse', label: 'Sign in House'   },
      ...(isD1 ? [{ value: 'nakshatra', label: 'Lagna Nakshatra' }] : []),
    ]
  }

  const opts = [
    { value: 'house', label: 'in House' },
    { value: 'sign',  label: 'in Sign'  },
  ]
  if (isD1) {
    opts.push({ value: 'nakshatra', label: 'Nakshatra' })
    opts.push({ value: 'kendra',    label: 'In Kendra'   })
    opts.push({ value: 'trikona',   label: 'In Trikona'  })
    opts.push({ value: 'dusthana',  label: 'In Dusthana' })
    if (!isNode) {
      opts.push({ value: 'exalted',     label: 'Exalted'     })
      opts.push({ value: 'debilitated', label: 'Debilitated' })
    }
    if (planet === 'Mars' || planet === 'Jupiter' || planet === 'Saturn') {
      opts.push({ value: 'aspectsLagna', label: 'Aspects Lagna' })
    }
  }
  return opts
}

function rowToConditions(row: CondRow): Array<{ field: string; operator: string; value: unknown }> {
  const isD1      = row.division === 'D1'
  const divN      = isD1 ? 1 : parseInt(row.division.slice(1))
  const prefix    = isD1 ? '' : `d${divN}_`
  const hasPlanet = !!row.planet
  const p         = hasPlanet ? row.planet.toLowerCase() : ''

  switch (row.qualifier) {
    case 'house':
      if (!hasPlanet) return []
      return [{ field: `${prefix}${p}House`, operator: 'eq', value: parseInt(row.value) }]

    case 'sign':
      if (hasPlanet) return [{ field: `${prefix}${p}Sign`, operator: 'eq', value: row.value }]
      return [{ field: isD1 ? 'ascSign' : `d${divN}_lagna`, operator: 'eq', value: row.value }]

    case 'nakshatra':
      if (hasPlanet) return [{ field: `${p}Nakshatra`, operator: 'eq', value: row.value }]
      return [{ field: 'ascNakshatra', operator: 'eq', value: row.value }]

    case 'exalted':
      if (!hasPlanet || !isD1) return []
      return [{ field: `${p}Exalted`, operator: 'eq', value: true }]

    case 'debilitated':
      if (!hasPlanet || !isD1) return []
      return [{ field: `${p}Debilitated`, operator: 'eq', value: true }]

    case 'kendra':
      if (!hasPlanet || !isD1) return []
      return [{ field: `${p}InKendra`, operator: 'eq', value: true }]

    case 'trikona':
      if (!hasPlanet || !isD1) return []
      return [{ field: `${p}InTrikona`, operator: 'eq', value: true }]

    case 'dusthana':
      if (!hasPlanet || !isD1) return []
      return [{ field: `${p}InDusthana`, operator: 'eq', value: true }]

    case 'aspectsLagna':
      if (!hasPlanet || !isD1) return []
      return [{ field: `${p}AspectsLagna`, operator: 'eq', value: true }]

    case 'signInHouse': {
      const signIdx = SIGNS.indexOf(row.value)
      const houseN  = parseInt(row.houseValue || '1')
      if (signIdx < 0 || isNaN(houseN)) return []
      // Whole-sign: house 1 = lagna, so lagna idx = signIdx - (houseN-1)
      const lagnaIdx   = ((signIdx - houseN + 1) % 12 + 12) % 12
      const lagnaField = isD1 ? 'ascSign' : `d${divN}_lagna`
      return [{ field: lagnaField, operator: 'eq', value: SIGNS[lagnaIdx] }]
    }

    default:
      return []
  }
}

// Human-readable label for the active row (shown as a hint below)
function rowLabel(row: CondRow): string {
  const isD1      = row.division === 'D1'
  const hasPlanet = !!row.planet
  const divTag    = row.division === 'D1' ? '' : ` (${row.division})`

  switch (row.qualifier) {
    case 'house':      return hasPlanet ? `${row.planet} in house ${row.value}${divTag}` : ''
    case 'sign':       return hasPlanet ? `${row.planet} in ${row.value}${divTag}` : `Lagna = ${row.value}${divTag}`
    case 'nakshatra':  return hasPlanet ? `${row.planet} nakshatra: ${row.value}` : `Lagna nak: ${row.value}`
    case 'exalted':    return `${row.planet} exalted`
    case 'debilitated':return `${row.planet} debilitated`
    case 'kendra':     return `${row.planet} in kendra`
    case 'trikona':    return `${row.planet} in trikona`
    case 'dusthana':   return `${row.planet} in dusthana`
    case 'aspectsLagna': return `${row.planet} aspects lagna`
    case 'signInHouse': {
      if (!row.value || !row.houseValue) return ''
      const signIdx  = SIGNS.indexOf(row.value)
      const houseN   = parseInt(row.houseValue || '1')
      const lagnaIdx = ((signIdx - houseN + 1) % 12 + 12) % 12
      return `${row.value} in house ${row.houseValue} → lagna = ${SIGNS[lagnaIdx]}${divTag}`
    }
    default: return ''
  }
}

const SS: React.CSSProperties = {
  background: 'var(--bg-primary)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  borderRadius: 6,
  padding: '4px 6px',
  fontSize: 12,
  outline: 'none',
  minWidth: 0,
}

function CondRowUI({ row, onChange, onRemove }: {
  row: CondRow
  onChange: (r: CondRow) => void
  onRemove: () => void
}) {
  const qualifiers = getQualifiers(row.division, row.planet)
  const validQ     = qualifiers.some(q => q.value === row.qualifier)
  const activeQ    = validQ ? row.qualifier : qualifiers[0].value
  const hint       = rowLabel({ ...row, qualifier: activeQ })

  const upd = (p: Partial<CondRow>) => onChange({ ...row, ...p })

  // If qualifier became invalid, fix it silently
  if (!validQ) upd({ qualifier: qualifiers[0].value })

  return (
    <div className="rounded-lg p-2 space-y-1.5"
         style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Division */}
        <select value={row.division} style={SS}
          onChange={e => {
            const d  = e.target.value
            const qs = getQualifiers(d, row.planet)
            const q  = qs.some(q => q.value === row.qualifier) ? row.qualifier : qs[0].value
            upd({ division: d, qualifier: q })
          }}>
          {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        {/* Planet (optional) */}
        <select value={row.planet} style={SS}
          onChange={e => {
            const pl = e.target.value
            const qs = getQualifiers(row.division, pl)
            const q  = qs.some(q => q.value === row.qualifier) ? row.qualifier : qs[0].value
            upd({ planet: pl, qualifier: q })
          }}>
          <option value="">— Any / Lagna</option>
          {PLANETS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {/* Qualifier */}
        <select value={activeQ} style={SS}
          onChange={e => {
            const q = e.target.value
            const defaultVal =
              q === 'house'       ? '1'      :
              q === 'sign'        ? SIGNS[0] :
              q === 'nakshatra'   ? NAKS[0]  :
              q === 'signInHouse' ? SIGNS[0] : ''
            upd({ qualifier: q, value: defaultVal })
          }}>
          {qualifiers.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
        </select>

        {/* Value pickers */}
        {activeQ === 'house' && (
          <select value={row.value} style={SS} onChange={e => upd({ value: e.target.value })}>
            {Array.from({length:12},(_,i)=>String(i+1)).map(h =>
              <option key={h} value={h}>{h}</option>
            )}
          </select>
        )}

        {(activeQ === 'sign' || activeQ === 'signInHouse') && (
          <select value={row.value} style={SS} onChange={e => upd({ value: e.target.value })}>
            {SIGNS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        {activeQ === 'signInHouse' && (
          <>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>in H</span>
            <select value={row.houseValue || '1'} style={SS} onChange={e => upd({ houseValue: e.target.value })}>
              {Array.from({length:12},(_,i)=>String(i+1)).map(h =>
                <option key={h} value={h}>{h}</option>
              )}
            </select>
          </>
        )}

        {activeQ === 'nakshatra' && (
          <select value={row.value} style={SS} onChange={e => upd({ value: e.target.value })}>
            {NAKS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        )}

        {/* Remove */}
        <button onClick={onRemove}
          className="ml-auto w-6 h-6 flex items-center justify-center rounded transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
          ×
        </button>
      </div>

      {hint && (
        <p style={{ fontSize: 10, color: 'var(--text-muted)', paddingLeft: 2 }}>{hint}</p>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ResearchPage() {
  const [rows,       setRows]    = useState<CondRow[]>([newRow()])
  const [logic,      setLogic]   = useState<'AND' | 'OR'>('AND')
  const [results,    setResults] = useState<any[]>([])
  const [total,      setTotal]   = useState<number | null>(null)
  const [loading,    setLoading] = useState(false)
  const [dictums,    setDictums] = useState<any[]>([])
  const [dictumSearch, setDS]    = useState('')
  const [tab,        setTab]     = useState<'builder' | 'dictum' | 'keyword' | 'dasha'>('builder')
  // keyword search
  const [kwQuery,    setKwQuery] = useState('')
  // dasha search
  const [dashaLD,    setDashaLD] = useState('') // mahadasha planet
  const [dashaAD,    setDashaAD] = useState('') // antardasha planet (optional)
  const [dashaDate,  setDashaDate] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => {
    fetch('/api/dictums').then(r => r.json()).then(d => setDictums(Array.isArray(d) ? d : []))
  }, [])

  const runQuery = useCallback(async (dictumId?: string) => {
    setLoading(true)
    try {
      const aqlConditions = rows
        .flatMap(rowToConditions)
        .filter(c => c.value !== undefined && c.value !== '')

      const res = await fetch('/api/research/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conditions: aqlConditions, logic, dictumId }),
      })
      const data = await res.json()
      setResults(data.charts ?? [])
      setTotal(data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [rows, logic])

  const runKeyword = useCallback(async () => {
    if (!kwQuery.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/research/keywords', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: kwQuery.trim() }),
      })
      const data = await res.json()
      setResults(data.charts ?? []); setTotal(data.total ?? 0)
    } finally { setLoading(false) }
  }, [kwQuery])

  const runDasha = useCallback(async () => {
    if (!dashaLD) return
    setLoading(true)
    try {
      const res = await fetch('/api/research/dasha', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mahadasha: dashaLD, antardasha: dashaAD || undefined, date: dashaDate }),
      })
      const data = await res.json()
      setResults(data.charts ?? []); setTotal(data.total ?? 0)
    } finally { setLoading(false) }
  }, [dashaLD, dashaAD, dashaDate])

  const filteredDictums = dictums.filter(d =>
    !dictumSearch || d.rule.toLowerCase().includes(dictumSearch.toLowerCase())
  )

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#7C3AED22' }}>
            <Filter className="w-5 h-5" style={{ color: '#7C3AED' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Research</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Query charts by planetary conditions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: query panel */}
          <div className="lg:col-span-1">
            <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              {/* Tab toggle */}
              <div className="flex gap-1 mb-4 rounded-lg p-1 flex-wrap" style={{ background: 'var(--bg-hover)' }}>
                {([
                  ['builder', 'Query Builder'],
                  ['dictum',  'Dictum'],
                  ['keyword', 'Keywords'],
                  ['dasha',   'Dasha'],
                ] as const).map(([t, label]) => (
                  <button key={t} onClick={() => setTab(t)}
                    className="flex-1 py-1.5 rounded-md text-xs font-medium transition-colors"
                    style={{
                      background: tab === t ? 'var(--bg-card)' : 'transparent',
                      color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
                      minWidth: 60,
                    }}>
                    {label}
                  </button>
                ))}
              </div>

              {tab === 'keyword' ? (
                <>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                    Search chart names, birth places, tags and keywords.
                  </p>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                    <input
                      value={kwQuery} onChange={e => setKwQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && runKeyword()}
                      placeholder="e.g. career, Kathmandu, yoga…"
                      className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm outline-none"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <button onClick={runKeyword} disabled={loading || !kwQuery.trim()}
                    className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                    style={{ background: '#7C3AED', color: '#fff', opacity: loading || !kwQuery.trim() ? 0.5 : 1 }}>
                    <Search className="w-4 h-4" />
                    {loading ? 'Searching…' : 'Search'}
                  </button>
                </>
              ) : tab === 'dasha' ? (
                <>
                  <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                    Find charts running a specific Vimshottari dasha on a given date.
                  </p>

                  <div className="space-y-3 mb-4">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Mahadasha Lord *</label>
                      <select value={dashaLD} onChange={e => setDashaLD(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                        <option value="">— Select planet —</option>
                        {VIMSH_LORDS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Antardasha Lord <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                      <select value={dashaAD} onChange={e => setDashaAD(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                        <option value="">— Any —</option>
                        {VIMSH_LORDS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Reference Date</label>
                      <input type="date" value={dashaDate} onChange={e => setDashaDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                    </div>
                  </div>

                  <button onClick={runDasha} disabled={loading || !dashaLD}
                    className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                    style={{ background: '#7C3AED', color: '#fff', opacity: loading || !dashaLD ? 0.5 : 1 }}>
                    <Zap className="w-4 h-4" />
                    {loading ? 'Searching…' : `Find ${dashaLD || '?'} MD charts`}
                  </button>
                </>
              ) : tab === 'builder' ? (
                <>
                  {/* Logic toggle */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Match</span>
                    {(['AND','OR'] as const).map(l => (
                      <button key={l} onClick={() => setLogic(l)}
                        className="px-2.5 py-1 rounded text-xs font-semibold transition-colors"
                        style={{
                          background: logic === l ? '#7C3AED33' : 'var(--bg-hover)',
                          color:      logic === l ? '#7C3AED'   : 'var(--text-muted)',
                        }}>{l}</button>
                    ))}
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>conditions</span>
                  </div>

                  {/* Condition rows */}
                  <div className="space-y-2 mb-3">
                    <AnimatePresence>
                      {rows.map(r => (
                        <motion.div key={r.id}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}>
                          <CondRowUI
                            row={r}
                            onChange={updated => setRows(prev => prev.map(p => p.id === r.id ? updated : p))}
                            onRemove={() => setRows(prev => prev.filter(p => p.id !== r.id))}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  <button onClick={() => setRows(prev => [...prev, newRow()])}
                    className="flex items-center gap-1.5 text-xs mb-4 w-full justify-center py-2 rounded-lg transition-colors"
                    style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px dashed var(--border)' }}>
                    <Plus className="w-3.5 h-3.5" /> Add condition
                  </button>

                  <button onClick={() => runQuery()} disabled={loading}
                    className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                    style={{ background: '#7C3AED', color: '#fff', opacity: loading ? 0.6 : 1 }}>
                    <Zap className="w-4 h-4" />
                    {loading ? 'Searching…' : 'Run Query'}
                  </button>
                </>
              ) : (
                <>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                    <input value={dictumSearch} onChange={e => setDS(e.target.value)}
                      placeholder="Search dictums…"
                      className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
                      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                  </div>
                  <div className="space-y-1.5 max-h-96 overflow-y-auto">
                    {filteredDictums.map(d => {
                      const hasConditions = d.conditionsJson && d.conditionsJson !== '{}'
                      return (
                        <button key={d.id} onClick={() => runQuery(d.id)}
                          className="w-full text-left p-2.5 rounded-lg text-xs transition-colors"
                          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
                          <p className="mb-1" style={{ color: 'var(--text-primary)' }}>{d.rule}</p>
                          <div className="flex items-center gap-2">
                            <span style={{ color: d.strength === 'Strong' ? '#10B981' : d.strength === 'Conditional' ? '#F59E0B' : '#EF4444' }}>
                              {d.strength}
                            </span>
                            {hasConditions
                              ? <span style={{ color: '#10B981' }}>● conditions set</span>
                              : <span style={{ color: 'var(--text-muted)' }}>○ no conditions yet</span>}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: results */}
          <div className="lg:col-span-2">
            {total === null ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <BookOpen className="w-12 h-12" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Build a query or select a dictum to search charts</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {loading ? 'Searching…' : `${total} chart${total !== 1 ? 's' : ''} match`}
                  </p>
                  {tab === 'dasha' && dashaLD && !loading && (
                    <span className="text-xs px-2 py-1 rounded-full font-semibold"
                      style={{ background: '#7C3AED22', color: '#A78BFA', border: '1px solid #7C3AED33' }}>
                      {dashaLD} MD{dashaAD ? ` / ${dashaAD} AD` : ''} · {dashaDate}
                    </span>
                  )}
                </div>
                {results.length === 0 && !loading ? (
                  <div className="text-center py-16">
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No charts match these conditions.</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Add more charts in Chart Analysis, or relax the conditions.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {results.map(chart => (
                      <ChartPreviewCard key={chart.id} chart={chart} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
