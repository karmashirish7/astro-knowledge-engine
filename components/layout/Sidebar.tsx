'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Network, CircleDot, Zap, FileText, Star, BookOpen, FlaskConical, Search,
} from 'lucide-react'

const TOP_NAV = [
  { href: '/',           label: 'Dashboard',     icon: LayoutDashboard, color: '#7C3AED' },
  { href: '/research',   label: 'Research',      icon: Search,          color: '#8B5CF6' },
  { href: '/chart',      label: 'Chart Analysis',icon: CircleDot,       color: '#10B981' },
  { href: '/dictums',    label: 'Dictum Engine', icon: FileText,        color: '#EC4899' },
  { href: '/playground', label: 'Playground',    icon: FlaskConical,    color: '#06B6D4' },
  { href: '/graph',      label: 'Graph View',    icon: Network,         color: '#3B82F6' },
  { href: '/dump',       label: 'Dump Mode',     icon: Zap,             color: '#F59E0B' },
]

const KNOWLEDGE_SECTIONS = [
  { href: '/knowledge',            label: 'All Entries',  symbol: '◈', color: '#7C3AED' },
  { href: '/knowledge/planets',    label: 'Planets',      symbol: '☉', color: '#F59E0B' },
  { href: '/knowledge/houses',     label: 'Houses',       symbol: '⌂', color: '#3B82F6' },
  { href: '/knowledge/rashis',     label: 'Rashis',       symbol: '♈', color: '#10B981' },
  { href: '/knowledge/nakshatras', label: 'Nakshatras',   symbol: '✦', color: '#EC4899' },
  { href: '/knowledge/yogas',      label: 'Yogas',        symbol: '⊕', color: '#8B5CF6' },
  { href: '/knowledge/dashas',     label: 'Dashas',       symbol: '◎', color: '#F97316' },
  { href: '/knowledge/panchang',   label: 'Panchang',     symbol: '◷', color: '#84CC16' },
  { href: '/knowledge/transits',   label: 'Transits',     symbol: '→', color: '#06B6D4' },
  { href: '/knowledge/remedies',   label: 'Remedies',     symbol: '♦', color: '#F43F5E' },
  { href: '/knowledge/concepts',   label: 'Concepts',     symbol: '□', color: '#94A3B8' },
]

export default function Sidebar() {
  const path = usePathname()
  const inKnowledge = path.startsWith('/knowledge')

  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col h-screen sticky top-0 overflow-y-auto"
      style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}
    >
      {/* Logo */}
      <div className="p-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center glow-purple flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)' }}
          >
            <Star className="w-4 h-4 text-white" fill="white" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>Astro Engine</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Knowledge System</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
        {/* Main navigation */}
        {TOP_NAV.map(({ href, label, icon: Icon, color }) => {
          const active = href === '/' ? path === '/' : path === href || (href !== '/' && path.startsWith(href) && href !== '/knowledge')
          return (
            <Link key={href} href={href}>
              <motion.div
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                style={{
                  background: active ? `${color}18` : 'transparent',
                  color: active ? color : 'var(--text-secondary)',
                  borderLeft: active ? `2px solid ${color}` : '2px solid transparent',
                }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </motion.div>
            </Link>
          )
        })}

        {/* Knowledge base section */}
        <div className="pt-3 pb-1">
          <div className="flex items-center gap-1.5 px-3 mb-1">
            <BookOpen className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Knowledge Base
            </span>
          </div>

          {KNOWLEDGE_SECTIONS.map(({ href, label, symbol, color }) => {
            const active = path === href
            return (
              <Link key={href} href={href}>
                <motion.div
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                  style={{
                    background: active ? `${color}18` : 'transparent',
                    color: active ? color : 'var(--text-secondary)',
                    borderLeft: active ? `2px solid ${color}` : '2px solid transparent',
                  }}
                >
                  <span className="text-base w-4 text-center flex-shrink-0 leading-none" style={{ color: active ? color : 'var(--text-muted)' }}>
                    {symbol}
                  </span>
                  <span className="text-xs">{label}</span>
                </motion.div>
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="p-3 border-t flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
          ॐ तत् सत्
        </p>
      </div>
    </aside>
  )
}
