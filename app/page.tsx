'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Search, BookOpen, Network, CircleDot, Zap, FileText,
  Star, Clock, ChevronRight
} from 'lucide-react'

const QUICK_LINKS = [
  { href: '/knowledge', label: 'Knowledge Base', icon: BookOpen,  color: '#7C3AED', desc: 'Browse all entries' },
  { href: '/graph',     label: 'Graph View',     icon: Network,   color: '#3B82F6', desc: 'Visual connections' },
  { href: '/chart',     label: 'Chart Analysis', icon: CircleDot, color: '#10B981', desc: 'Kundali & analysis' },
  { href: '/dump',      label: 'Dump Mode',      icon: Zap,       color: '#F59E0B', desc: 'Quick capture' },
  { href: '/dictums',   label: 'Dictum Engine',  icon: FileText,  color: '#EC4899', desc: 'Predictive rules' },
]

const PLANETS = [
  { sym: '☉', name: 'Sun',     color: '#F59E0B' },
  { sym: '☽', name: 'Moon',    color: '#E2E8F0' },
  { sym: '♂', name: 'Mars',    color: '#EF4444' },
  { sym: '☿', name: 'Mercury', color: '#10B981' },
  { sym: '♃', name: 'Jupiter', color: '#F97316' },
  { sym: '♀', name: 'Venus',   color: '#EC4899' },
  { sym: '♄', name: 'Saturn',  color: '#6366F1' },
  { sym: '☊', name: 'Rahu',    color: '#8B5CF6' },
  { sym: '☋', name: 'Ketu',    color: '#78716C' },
]

export default function Dashboard() {
  const [q, setQ]               = useState('')
  const [results, setResults]   = useState<{ entries: any[]; dictums: any[] } | null>(null)
  const [stats, setStats]       = useState({ entries: 0, dictums: 0, charts: 0 })
  const [recent, setRecent]     = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/knowledge?limit=5').then(r => r.json()),
      fetch('/api/dictums').then(r => r.json()),
      fetch('/api/chart').then(r => r.json()),
    ]).then(([entries, dictums, charts]) => {
      setStats({
        entries: Array.isArray(entries) ? entries.length : 0,
        dictums: Array.isArray(dictums) ? dictums.length : 0,
        charts:  Array.isArray(charts)  ? charts.length  : 0,
      })
      setRecent(Array.isArray(entries) ? entries.slice(0, 4) : [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!q.trim()) { setResults(null); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        setResults(await res.json())
      } finally { setSearching(false) }
    }, 400)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="min-h-screen p-8" style={{ background: 'var(--bg-primary)' }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Star className="w-6 h-6" style={{ color: '#F59E0B' }} fill="#F59E0B" />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Astro Knowledge Engine
          </h1>
        </div>
        <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
          Your visual second brain for Vedic astrology
        </p>
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder='Search: "Saturn 7th house", "Rohini", "Raja Yoga"...'
            className="w-full pl-12 pr-4 py-4 rounded-xl text-sm outline-none transition-all"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            onFocus={e => { e.currentTarget.style.borderColor = '#7C3AED'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)' }}
            onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
          />
          {searching && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />}
        </div>

        {results && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-3 max-w-2xl rounded-xl overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {results.entries?.length === 0 && results.dictums?.length === 0 ? (
              <p className="p-4 text-sm" style={{ color: 'var(--text-muted)' }}>No results for "{q}"</p>
            ) : (
              <>
                {results.entries?.slice(0, 5).map((e: any) => (
                  <Link key={e.id} href={`/knowledge?id=${e.id}`}>
                    <div className="flex items-center gap-3 px-4 py-3 border-b transition-colors hover:bg-[#1E1E2A]" style={{ borderColor: 'var(--border)' }}>
                      <BookOpen className="w-4 h-4 flex-shrink-0" style={{ color: '#7C3AED' }} />
                      <div><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{e.title}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{e.category}</p></div>
                    </div>
                  </Link>
                ))}
                {results.dictums?.slice(0, 3).map((d: any) => (
                  <Link key={d.id} href="/dictums">
                    <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#1E1E2A]">
                      <FileText className="w-4 h-4 flex-shrink-0" style={{ color: '#EC4899' }} />
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{d.rule}</p>
                    </div>
                  </Link>
                ))}
              </>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        className="grid grid-cols-3 gap-4 mb-8 max-w-lg">
        {[
          { label: 'Knowledge Entries', value: stats.entries, color: '#7C3AED', icon: BookOpen },
          { label: 'Dictums / Rules',   value: stats.dictums, color: '#EC4899', icon: FileText },
          { label: 'Chart Analyses',    value: stats.charts,  color: '#10B981', icon: CircleDot },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <s.icon className="w-4 h-4 mb-2" style={{ color: s.color }} />
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Quick links */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-8">
        <h2 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Explore</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {QUICK_LINKS.map(({ href, label, icon: Icon, color, desc }) => (
            <Link key={href} href={href}>
              <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}
                className="p-4 rounded-xl cursor-pointer transition-all"
                style={{ background: 'var(--bg-card)', border: `1px solid ${color}30` }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: `${color}20` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--text-primary)' }}>{label}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Recent Knowledge</h2>
            <Link href="/knowledge" className="flex items-center gap-1 text-xs" style={{ color: '#7C3AED' }}>
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {recent.length === 0 ? (
              <div className="rounded-xl p-8 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>No entries yet. Start capturing astrology knowledge!</p>
                <Link href="/dump">
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg text-sm font-medium text-white"
                    style={{ background: '#7C3AED' }}>
                    <Zap className="w-4 h-4" /> Try Dump Mode
                  </motion.button>
                </Link>
              </div>
            ) : recent.map((e, i) => (
              <motion.div key={e.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
                <Link href={`/knowledge?id=${e.id}`}>
                  <div className="flex items-center gap-3 p-4 rounded-xl transition-colors hover:bg-[#1E1E2A] cursor-pointer"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <Clock className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{e.title}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{e.category}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <h2 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Graha Reference</h2>
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {PLANETS.map(p => (
              <div key={p.name} className="flex items-center gap-3 px-4 py-2.5 border-b last:border-0 hover:bg-[#1E1E2A] transition-colors"
                style={{ borderColor: 'var(--border)' }}>
                <span className="text-xl w-7 text-center" style={{ color: p.color }}>{p.sym}</span>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
