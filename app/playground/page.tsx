'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Search, FileText, ExternalLink, CheckCircle, XCircle, MinusCircle, ChevronRight, HelpCircle } from 'lucide-react'
import NorthIndianKundali from '@/components/chart/NorthIndianKundali'

// ── Types ──────────────────────────────────────────────────────────────────

interface Entity { type: string; name: string }

interface PlanetaryData {
  ascSign: string; ascNakshatra: string; ascDegree: number
  sunSign: string; sunHouse: number; sunNakshatra: string
  moonSign: string; moonHouse: number; moonNakshatra: string
  marsSign: string; marsHouse: number; marsNakshatra: string
  mercurySign: string; mercuryHouse: number; mercuryNakshatra: string
  jupiterSign: string; jupiterHouse: number; jupiterNakshatra: string
  venusSign: string; venusHouse: number; venusNakshatra: string
  saturnSign: string; saturnHouse: number; saturnNakshatra: string
  rahuSign: string; rahuHouse: number; rahuNakshatra: string
  ketuSign: string; ketuHouse: number; ketuNakshatra: string
  atmakaraka: string; darakaraka: string
}

type Verdict = 'confirmed' | 'refuted' | 'partial' | 'unclear'

interface Verification {
  verdict: Verdict
  note: string
}

// ── Matching logic using structured PlanetaryData ──────────────────────────

function matchDictumToChart(
  dictum: any,
  pd: PlanetaryData | null
): { matched: Entity[]; missing: Entity[]; pct: number } {
  const entities: Entity[] = (() => { try { return JSON.parse(dictum.entities || '[]') } catch { return [] } })()
  if (entities.length === 0 || !pd) return { matched: [], missing: [], pct: 0 }

  const planetHouseMap: Record<string, number> = {
    sun: pd.sunHouse, moon: pd.moonHouse, mars: pd.marsHouse,
    mercury: pd.mercuryHouse, jupiter: pd.jupiterHouse, venus: pd.venusHouse,
    saturn: pd.saturnHouse, rahu: pd.rahuHouse, ketu: pd.ketuHouse,
  }
  const planetSignMap: Record<string, string> = {
    sun: pd.sunSign, moon: pd.moonSign, mars: pd.marsSign,
    mercury: pd.mercurySign, jupiter: pd.jupiterSign, venus: pd.venusSign,
    saturn: pd.saturnSign, rahu: pd.rahuSign, ketu: pd.ketuSign,
  }
  const planetNakshatraMap: Record<string, string> = {
    sun: pd.sunNakshatra, moon: pd.moonNakshatra, mars: pd.marsNakshatra,
    mercury: pd.mercuryNakshatra, jupiter: pd.jupiterNakshatra, venus: pd.venusNakshatra,
    saturn: pd.saturnNakshatra, rahu: pd.rahuNakshatra, ketu: pd.ketuNakshatra,
  }

  const HOUSE_WORDS: Record<string, number> = {
    '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5, '6th': 6,
    '7th': 7, '8th': 8, '9th': 9, '10th': 10, '11th': 11, '12th': 12,
    lagna: 1, dhana: 2, sahaja: 3, sukha: 4, putra: 5, ripu: 6,
    yuvati: 7, randhra: 8, dharma: 9, karma: 10, labha: 11, vyaya: 12,
  }

  const matched: Entity[] = []
  const missing: Entity[] = []

  // Build context: which planets are mentioned in the dictum entities
  const mentionedPlanets = entities
    .filter(e => e.type === 'planet')
    .map(e => e.name.toLowerCase())

  for (const entity of entities) {
    const name = entity.name.toLowerCase()

    if (entity.type === 'planet') {
      if (planetHouseMap[name] !== undefined) matched.push(entity)
      else missing.push(entity)

    } else if (entity.type === 'house') {
      const normalized = name.replace(/\s*(house|bhava|bhav)\s*/gi, '').trim()
      const houseNum = HOUSE_WORDS[normalized] ?? null
      if (houseNum === null) { missing.push(entity); continue }
      // Check if any planet mentioned in this dictum is in that house
      const hit = mentionedPlanets.some(p => planetHouseMap[p] === houseNum)
      hit ? matched.push(entity) : missing.push(entity)

    } else if (entity.type === 'rashi') {
      // Check lagna sign or any mentioned planet's sign
      const lagnaMatch = pd.ascSign.toLowerCase() === name
      const planetMatch = mentionedPlanets.some(p => planetSignMap[p]?.toLowerCase() === name)
      lagnaMatch || planetMatch ? matched.push(entity) : missing.push(entity)

    } else if (entity.type === 'nakshatra') {
      const hit = mentionedPlanets.some(p => planetNakshatraMap[p]?.toLowerCase().includes(name))
        || pd.ascNakshatra.toLowerCase().includes(name)
      hit ? matched.push(entity) : missing.push(entity)

    } else {
      missing.push(entity)
    }
  }

  const pct = entities.length > 0 ? Math.round((matched.length / entities.length) * 100) : 0
  return { matched, missing, pct }
}

// ── Verdict badge ─────────────────────────────────────────────────────────

const VERDICT_CONFIG: Record<Verdict, { color: string; bg: string; label: string; Icon: any }> = {
  confirmed: { color: '#10B981', bg: '#10B98120', label: 'Confirmed', Icon: CheckCircle },
  partial:   { color: '#F59E0B', bg: '#F59E0B20', label: 'Partial',   Icon: MinusCircle },
  unclear:   { color: '#6366F1', bg: '#6366F120', label: 'Unclear',   Icon: HelpCircle },
  refuted:   { color: '#EF4444', bg: '#EF444420', label: 'Refuted',   Icon: XCircle },
}

function VerdictButton({
  verdict, active, onClick,
}: { verdict: Verdict; active: boolean; onClick: () => void }) {
  const cfg = VERDICT_CONFIG[verdict]
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
      style={{
        background: active ? cfg.bg : 'var(--bg-hover)',
        color: active ? cfg.color : 'var(--text-muted)',
        border: `1px solid ${active ? cfg.color + '44' : 'transparent'}`,
      }}>
      <cfg.Icon className="w-3 h-3" />
      {cfg.label}
    </button>
  )
}

function MatchBadge({ pct }: { pct: number }) {
  if (pct >= 80) return (
    <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#10B981' }}>
      <CheckCircle className="w-3.5 h-3.5" /> {pct}%
    </span>
  )
  if (pct >= 40) return (
    <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#F59E0B' }}>
      <MinusCircle className="w-3.5 h-3.5" /> {pct}%
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
      <XCircle className="w-3.5 h-3.5" /> {pct}%
    </span>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function PlaygroundPage() {
  const [dictums, setDictums]           = useState<any[]>([])
  const [charts, setCharts]             = useState<any[]>([])
  const [selectedDictum, setDictum]     = useState<any | null>(null)
  const [openChartIds, setOpenChartIds] = useState<Set<string>>(new Set())
  const [search, setSearch]             = useState('')
  const [chartSearch, setChartSearch]   = useState('')
  const [researchNote, setNote]         = useState('')
  const [noteSaved, setNoteSaved]       = useState(false)
  const [strength, setStrength]         = useState('All')

  // dictumId → chartId → Verification
  const [verifications, setVerifications] = useState<Record<string, Record<string, Verification>>>({})
  const [verdictNotes, setVerdictNotes]   = useState<Record<string, string>>({})

  useEffect(() => {
    Promise.all([
      fetch('/api/dictums').then(r => r.json()),
      fetch('/api/chart').then(r => r.json()),
    ]).then(([d, c]) => {
      setDictums(Array.isArray(d) ? d : [])
      setCharts(Array.isArray(c) ? c : [])
    })
  }, [])

  // Load verifications when dictum changes
  useEffect(() => {
    if (!selectedDictum) return
    fetch(`/api/dictums/verify?dictumId=${selectedDictum.id}`)
      .then(r => r.json())
      .then((vs: any[]) => {
        if (!Array.isArray(vs)) return
        const map: Record<string, Verification> = {}
        for (const v of vs) map[v.chartId] = { verdict: v.verdict, note: v.note }
        setVerifications(prev => ({ ...prev, [selectedDictum.id]: map }))
      })
      .catch(() => {})
  }, [selectedDictum?.id])

  const saveVerification = async (chartId: string, verdict: Verdict, note: string) => {
    if (!selectedDictum) return
    await fetch('/api/dictums/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dictumId: selectedDictum.id, chartId, verdict, note }),
    })
    setVerifications(prev => ({
      ...prev,
      [selectedDictum.id]: { ...(prev[selectedDictum.id] ?? {}), [chartId]: { verdict, note } },
    }))
  }

  const saveNote = async () => {
    if (!selectedDictum) return
    await fetch(`/api/dictums`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedDictum.id, interpretation: researchNote }),
    }).catch(() => {})
    setNoteSaved(true)
    setTimeout(() => setNoteSaved(false), 1500)
  }

  const filteredDictums = dictums.filter(d => {
    const matchSearch = !search || d.rule.toLowerCase().includes(search.toLowerCase())
    const matchStrength = strength === 'All' || d.strength === strength
    return matchSearch && matchStrength
  })

  const filteredCharts = charts.filter(c => {
    if (!chartSearch) return true
    const tags: string[] = (() => { try { return JSON.parse(c.tagsList || '[]') } catch { return [] } })()
    const kws: string[]  = (() => { try { return JSON.parse(c.keywords  || '[]') } catch { return [] } })()
    const q = chartSearch.toLowerCase()
    return c.name.toLowerCase().includes(q) || (c.birthPlace || '').toLowerCase().includes(q)
      || tags.some(t => t.toLowerCase().includes(q)) || kws.some(k => k.toLowerCase().includes(q))
  })

  const toggleChart = (id: string) =>
    setOpenChartIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const entities: Entity[] = selectedDictum
    ? (() => { try { return JSON.parse(selectedDictum.entities || '[]') } catch { return [] } })()
    : []

  const STRENGTH_COLORS: Record<string, string> = {
    Strong: '#10B981', Conditional: '#F59E0B', Exception: '#EF4444',
  }

  return (
    <div className="h-screen flex" style={{ background: 'var(--bg-primary)' }}>
      {/* ── Left: dictum browser ─────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4" style={{ color: '#EC4899' }} />
            <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Dictum Playground</h1>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search dictums…"
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="flex gap-1.5">
            {['All','Strong','Conditional','Exception'].map(s => (
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
          {filteredDictums.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No dictums found</p>
              <Link href="/dictums" className="text-xs mt-2 block" style={{ color: '#EC4899' }}>Go add some →</Link>
            </div>
          ) : filteredDictums.map(d => {
            const dvs = verifications[d.id] ?? {}
            const confirmed = Object.values(dvs).filter(v => v.verdict === 'confirmed').length
            const refuted   = Object.values(dvs).filter(v => v.verdict === 'refuted').length
            const total     = Object.values(dvs).length
            return (
              <motion.div key={d.id}
                onClick={() => { setDictum(d); setNote(d.interpretation || '') }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-3 rounded-lg mb-1.5 cursor-pointer transition-colors"
                style={{
                  background: selectedDictum?.id === d.id ? 'rgba(236,72,153,0.1)' : 'var(--bg-card)',
                  border: `1px solid ${selectedDictum?.id === d.id ? '#EC489966' : 'var(--border)'}`,
                }}>
                <p className="text-sm leading-snug mb-1.5" style={{ color: 'var(--text-primary)' }}>"{d.rule}"</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: (STRENGTH_COLORS[d.strength] || '#94A3B8') + '22', color: STRENGTH_COLORS[d.strength] || '#94A3B8' }}>
                    {d.strength}
                  </span>
                  {total > 0 && (
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {confirmed}✓ {refuted > 0 ? `${refuted}✗ ` : ''}{total} verified
                    </span>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ── Right: research panel ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedDictum ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <FileText className="w-16 h-16" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
            <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>Select a dictum to research</p>
            <p className="text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>
              Pick a predictive rule from the left. Open charts to verify whether the dictum holds — your verdicts are saved.
            </p>
          </div>
        ) : (
          <>
            {/* Dictum header */}
            <div className="px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <blockquote className="text-lg font-semibold leading-relaxed flex-1"
                  style={{ color: 'var(--text-primary)', borderLeft: '3px solid #EC4899', paddingLeft: 12 }}>
                  "{selectedDictum.rule}"
                </blockquote>
                <span className="text-xs px-2 py-1 rounded flex-shrink-0"
                  style={{ background: (STRENGTH_COLORS[selectedDictum.strength] || '#94A3B8') + '22', color: STRENGTH_COLORS[selectedDictum.strength] || '#94A3B8' }}>
                  {selectedDictum.strength}
                </span>
              </div>

              {entities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {entities.map((e, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-lg font-medium"
                      style={{
                        background: e.type === 'planet' ? '#F59E0B22' : e.type === 'house' ? '#3B82F622' : e.type === 'rashi' ? '#10B98122' : '#EC489922',
                        color:      e.type === 'planet' ? '#F59E0B'   : e.type === 'house' ? '#3B82F6'   : e.type === 'rashi' ? '#10B981'   : '#EC4899',
                      }}>
                      {e.name} <span className="opacity-50">({e.type})</span>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  value={researchNote}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Research notes: conditions, exceptions, verification status…"
                  className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  onKeyDown={e => { if (e.key === 'Enter') saveNote() }}
                />
                <button onClick={saveNote}
                  className="px-3 py-2 rounded-lg text-sm font-semibold flex-shrink-0"
                  style={{ background: '#EC489920', color: '#EC4899', border: '1px solid #EC489933' }}>
                  {noteSaved ? '✓ Saved' : 'Save Note'}
                </button>
              </div>
            </div>

            {/* Chart search */}
            <div className="flex items-center gap-3 px-6 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                <input
                  value={chartSearch} onChange={e => setChartSearch(e.target.value)}
                  placeholder="Filter charts by name, place, tag…"
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
              <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                {filteredCharts.length} charts
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {filteredCharts.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No charts. Add charts in Chart Analysis first.</p>
                  <Link href="/chart" className="text-xs mt-2 block" style={{ color: '#10B981' }}>Open Chart Analysis →</Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {filteredCharts.map(chart => {
                    const pd: PlanetaryData | null = chart.planetaryData ?? null
                    const lagnaSign = pd ? (['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'].indexOf(pd.ascSign) + 1) || 1 : (parseInt(chart.lagna) || 1)
                    const planetHouses: Record<string, number> = pd
                      ? { Sun: pd.sunHouse, Moon: pd.moonHouse, Mars: pd.marsHouse, Mercury: pd.mercuryHouse, Jupiter: pd.jupiterHouse, Venus: pd.venusHouse, Saturn: pd.saturnHouse, Rahu: pd.rahuHouse, Ketu: pd.ketuHouse }
                      : (() => { try { return JSON.parse(chart.planets || '{}') } catch { return {} } })()

                    const calc = (() => { try { return JSON.parse(chart.calculatedPositions || '{}') } catch { return {} } })()
                    const hasPrecise = !!(calc?.planets)
                    const tags: string[] = (() => { try { return JSON.parse(chart.tagsList || '[]') } catch { return [] } })()

                    const { matched, missing, pct } = matchDictumToChart(selectedDictum, pd)
                    const isOpen = openChartIds.has(chart.id)
                    const currentVerification = verifications[selectedDictum.id]?.[chart.id] ?? null
                    const noteKey = `${selectedDictum.id}:${chart.id}`

                    return (
                      <motion.div key={chart.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl overflow-hidden"
                        style={{
                          background: 'var(--bg-card)',
                          border: `1px solid ${
                            currentVerification?.verdict === 'confirmed' ? '#10B98133' :
                            currentVerification?.verdict === 'refuted'   ? '#EF444433' :
                            currentVerification?.verdict === 'partial'   ? '#F59E0B33' :
                            pct >= 80 ? '#10B98122' : 'var(--border)'
                          }`,
                        }}>
                        {/* Card header */}
                        <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => toggleChart(chart.id)}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{chart.name}</p>
                              {currentVerification ? (
                                <span className="flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded"
                                  style={{ background: VERDICT_CONFIG[currentVerification.verdict].bg, color: VERDICT_CONFIG[currentVerification.verdict].color }}>
                                  {currentVerification.verdict}
                                </span>
                              ) : (
                                <MatchBadge pct={pct} />
                              )}
                            </div>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {chart.birthDate} {chart.birthTime}{chart.birthPlace ? ` · ${chart.birthPlace}` : ''}
                            </p>
                            {pd && (
                              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                AK: <span style={{ color: '#F59E0B' }}>{pd.atmakaraka}</span>
                                {' · '}DK: <span style={{ color: '#3B82F6' }}>{pd.darakaraka}</span>
                              </p>
                            )}
                            {tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {tags.slice(0, 4).map(t => (
                                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded"
                                    style={{ background: '#10B98115', color: '#10B981' }}>{t}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Link href={`/chart/${chart.id}`} onClick={e => e.stopPropagation()}
                              className="p-1.5 rounded-lg hover:bg-[#1E1E2A] transition-colors">
                              <ExternalLink className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                            </Link>
                            <ChevronRight
                              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                              style={{ color: 'var(--text-muted)' }} />
                          </div>
                        </div>

                        {/* Expanded: kundali + match + verdict */}
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                              <div className="border-t p-4" style={{ borderColor: 'var(--border)' }}>
                                <div className="flex gap-4 mb-4">
                                  {/* Mini kundali */}
                                  <div className="flex-shrink-0" style={{ transform: 'scale(0.7)', transformOrigin: 'top left', width: 140, height: 140 }}>
                                    <NorthIndianKundali lagna={lagnaSign} planets={planetHouses} onHouseClick={() => {}} highlightAspects={false} />
                                  </div>

                                  {/* Match analysis */}
                                  <div className="flex-1 min-w-0">
                                    {hasPrecise && entities.filter(e => e.type === 'planet').length > 0 && (
                                      <div className="mb-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Precise Positions</p>
                                        {entities.filter(e => e.type === 'planet').map((e, i) => {
                                          const pos  = calc.planets?.[e.name]
                                          const house = calc.houseNumbers?.[e.name]
                                          return pos ? (
                                            <p key={i} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                              <span className="font-medium">{e.name}</span> {pos.formatted} <span style={{ color: '#7C3AED' }}>H{house}</span>
                                            </p>
                                          ) : null
                                        })}
                                      </div>
                                    )}
                                    <div className="space-y-2">
                                      {matched.length > 0 && (
                                        <div>
                                          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#10B981' }}>Matched</p>
                                          <div className="flex flex-wrap gap-1">
                                            {matched.map((e, i) => (
                                              <span key={i} className="text-xs px-1.5 py-0.5 rounded"
                                                style={{ background: '#10B98120', color: '#10B981' }}>{e.name}</span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {missing.length > 0 && (
                                        <div>
                                          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Missing</p>
                                          <div className="flex flex-wrap gap-1">
                                            {missing.map((e, i) => (
                                              <span key={i} className="text-xs px-1.5 py-0.5 rounded"
                                                style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>{e.name}</span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Verdict section */}
                                <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                                    Verification
                                  </p>
                                  <div className="flex gap-1.5 flex-wrap mb-2">
                                    {(['confirmed','partial','unclear','refuted'] as Verdict[]).map(v => (
                                      <VerdictButton
                                        key={v} verdict={v}
                                        active={currentVerification?.verdict === v}
                                        onClick={() => {
                                          const note = verdictNotes[noteKey] ?? currentVerification?.note ?? ''
                                          saveVerification(chart.id, v, note)
                                        }}
                                      />
                                    ))}
                                  </div>
                                  <input
                                    value={verdictNotes[noteKey] ?? currentVerification?.note ?? ''}
                                    onChange={e => setVerdictNotes(prev => ({ ...prev, [noteKey]: e.target.value }))}
                                    onBlur={() => {
                                      if (currentVerification) {
                                        saveVerification(chart.id, currentVerification.verdict, verdictNotes[noteKey] ?? '')
                                      }
                                    }}
                                    placeholder="Add a note about this verification…"
                                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
