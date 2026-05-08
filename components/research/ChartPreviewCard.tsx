'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ExternalLink, ChevronDown, CheckCircle, XCircle, MinusCircle, HelpCircle } from 'lucide-react'
import NorthIndianKundali from '@/components/chart/NorthIndianKundali'

const SIGN_LIST = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']

const VERDICT_STYLE: Record<string, { color: string; bg: string; Icon: any }> = {
  confirmed: { color: '#10B981', bg: '#10B98120', Icon: CheckCircle },
  refuted:   { color: '#EF4444', bg: '#EF444420', Icon: XCircle },
  partial:   { color: '#F59E0B', bg: '#F59E0B20', Icon: MinusCircle },
  unclear:   { color: '#6366F1', bg: '#6366F120', Icon: HelpCircle },
}

const DIGNITY_COLOR: Record<string, string> = {
  exalted:      '#10B981',
  debilitated:  '#EF4444',
  own:          '#3B82F6',
  moolatrikona: '#8B5CF6',
  neutral:      'var(--text-muted)',
}

interface Props {
  chart: any
  matchPct?:    number
  dictumId?:    string
  showExpand?:  boolean
}

export default function ChartPreviewCard({ chart, matchPct, dictumId, showExpand = true }: Props) {
  const [expanded, setExpanded] = useState(false)

  const pd   = chart.planetaryData
  const tags: string[] = (() => { try { return JSON.parse(chart.tagsList || '[]') } catch { return [] } })()
  const calc = (() => { try { return JSON.parse(chart.calculatedPositions || '{}') } catch { return {} } })()

  const lagnaSign    = pd ? (SIGN_LIST.indexOf(pd.ascSign) + 1) || 1 : parseInt(chart.lagna) || 1
  const planetHouses: Record<string, number> = pd
    ? { Sun: pd.sunHouse, Moon: pd.moonHouse, Mars: pd.marsHouse, Mercury: pd.mercuryHouse,
        Jupiter: pd.jupiterHouse, Venus: pd.venusHouse, Saturn: pd.saturnHouse, Rahu: pd.rahuHouse, Ketu: pd.ketuHouse }
    : (() => { try { return JSON.parse(chart.planets || '{}') } catch { return {} } })()

  const verdict = chart.dictumVerifications?.[0]?.verdict
  const vs = verdict ? VERDICT_STYLE[verdict] : null

  const borderColor = vs ? vs.color + '44'
    : matchPct !== undefined && matchPct >= 80 ? '#10B98133'
    : matchPct !== undefined && matchPct >= 40 ? '#F59E0B22'
    : 'var(--border)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: `1px solid ${borderColor}` }}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Mini kundali */}
          <div className="flex-shrink-0" style={{ width: 100, height: 100, transform: 'scale(0.5)', transformOrigin: 'top left', marginBottom: -50, marginRight: -50 }}>
            <NorthIndianKundali lagna={lagnaSign} planets={planetHouses} onHouseClick={() => {}} highlightAspects={false} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{chart.name}</p>
              {vs && (
                <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ background: vs.bg, color: vs.color }}>
                  <vs.Icon className="w-3 h-3" /> {verdict}
                </span>
              )}
              {matchPct !== undefined && !vs && (
                <span className="text-[10px] font-semibold" style={{
                  color: matchPct >= 80 ? '#10B981' : matchPct >= 40 ? '#F59E0B' : 'var(--text-muted)'
                }}>{matchPct}% match</span>
              )}
            </div>

            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
              {chart.birthDate}{chart.birthTime ? ` · ${chart.birthTime}` : ''}{chart.birthPlace ? ` · ${chart.birthPlace}` : ''}
            </p>

            {pd && (
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                <span style={{ color: '#F59E0B' }}>Asc:</span> {pd.ascSign} {pd.ascDegree?.toFixed(1)}° {pd.ascNakshatra && <span style={{ color: 'var(--text-muted)' }}>({pd.ascNakshatra})</span>}
                {' · '}
                <span style={{ color: '#E2E8F0' }}>Moon:</span> {pd.moonSign}
              </p>
            )}

            {chart.currentDasha && (
              <p className="text-xs font-medium" style={{ color: '#8B5CF6' }}>
                {chart.currentDasha.mahadasha} MD / {chart.currentDasha.antardasha} AD
              </p>
            )}

            {pd && (
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                AK: <span style={{ color: '#F59E0B' }}>{pd.atmakaraka}</span>
                {' · '}DK: <span style={{ color: '#3B82F6' }}>{pd.darakaraka}</span>
              </p>
            )}

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {tags.slice(0, 4).map(t => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: '#10B98115', color: '#10B981' }}>{t}</span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {chart.observationCount ?? 0} obs · {chart.predictionCount ?? 0} pred
              </span>
              <Link href={`/chart/${chart.id}`} onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                <ExternalLink className="w-3 h-3" /> Full chart
              </Link>
              {showExpand && (
                <button onClick={() => setExpanded(v => !v)}
                  className="flex items-center gap-0.5 text-[10px] ml-auto" style={{ color: 'var(--text-muted)' }}>
                  <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  {expanded ? 'Less' : 'More'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded: full planetary dignity table */}
      <AnimatePresence>
        {expanded && pd && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: 'var(--border)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Planetary Positions
              </p>
              <div className="grid grid-cols-3 gap-1">
                {(['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'] as const).map(p => {
                  const pk  = p.toLowerCase()
                  const sign = pd[`${pk}Sign`]
                  const house = pd[`${pk}House`]
                  const nak  = pd[`${pk}Nakshatra`]
                  const dig  = pd[`${pk}Dignity`]
                  if (!sign) return null
                  return (
                    <div key={p} className="text-[10px] rounded px-2 py-1"
                      style={{ background: 'var(--bg-hover)' }}>
                      <span className="font-semibold" style={{ color: dig ? DIGNITY_COLOR[dig] : 'var(--text-secondary)' }}>{p}</span>
                      <span style={{ color: 'var(--text-muted)' }}> H{house} {sign}</span>
                      {nak && <div style={{ color: 'var(--text-muted)', fontSize: '9px' }}>{nak}</div>}
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
