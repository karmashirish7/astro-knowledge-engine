'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'
import Image from 'next/image'
import {
  LayoutDashboard, Network, CircleDot, Zap, FileText, BookOpen,
  FlaskConical, Search, LogOut, User,
} from 'lucide-react'

const TOP_NAV = [
  { href: '/',           label: 'Dashboard',      icon: LayoutDashboard, color: '#7C3AED' },
  { href: '/research',   label: 'Research',       icon: Search,          color: '#8B5CF6' },
  { href: '/chart',      label: 'Chart Analysis', icon: CircleDot,       color: '#10B981' },
  { href: '/dictums',    label: 'Dictum Engine',  icon: FileText,        color: '#EC4899' },
  { href: '/playground', label: 'Playground',     icon: FlaskConical,    color: '#06B6D4' },
  { href: '/graph',      label: 'Graph View',     icon: Network,         color: '#3B82F6' },
  { href: '/dump',       label: 'Dump Mode',      icon: Zap,             color: '#F59E0B' },
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
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <motion.aside
      animate={{ width: collapsed ? 56 : 224 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="flex-shrink-0 flex flex-col h-screen sticky top-0 overflow-hidden"
      style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="p-3 border-b flex-shrink-0 flex items-center" style={{ borderColor: 'var(--border)', minHeight: 56 }}>
        {/* Logo — click to toggle collapse */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden transition-transform hover:scale-105 active:scale-95"
          style={{ background: '#fff', boxShadow: '0 0 0 1.5px rgba(255,255,255,0.2)' }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Image src="/logo.png" alt="Akashvani" width={32} height={32} className="object-contain" />
        </button>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="wordmark"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="ml-2.5 min-w-0 overflow-hidden"
            >
              <p className="text-sm font-bold leading-tight whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                Akashvani
              </p>
              <p className="text-[10px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                Engine
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {TOP_NAV.map(({ href, label, icon: Icon, color }) => {
          const active = href === '/' ? path === '/' : path === href || (href !== '/' && path.startsWith(href) && href !== '/knowledge')
          return (
            <Link key={href} href={href} title={collapsed ? label : undefined}>
              <motion.div
                whileHover={{ x: collapsed ? 0 : 2 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                style={{
                  background: active ? `${color}18` : 'transparent',
                  color: active ? color : 'var(--text-secondary)',
                  borderLeft: active ? `2px solid ${color}` : '2px solid transparent',
                  justifyContent: collapsed ? 'center' : undefined,
                  paddingLeft: collapsed ? undefined : undefined,
                }}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          )
        })}

        {/* Knowledge base section */}
        <div className="pt-3 pb-1">
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                key="kb-header"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5 px-3 mb-1"
              >
                <BookOpen className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  Knowledge Base
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {KNOWLEDGE_SECTIONS.map(({ href, label, symbol, color }) => {
            const active = path === href
            return (
              <Link key={href} href={href} title={collapsed ? label : undefined}>
                <motion.div
                  whileHover={{ x: collapsed ? 0 : 2 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                  style={{
                    background: active ? `${color}18` : 'transparent',
                    color: active ? color : 'var(--text-secondary)',
                    borderLeft: active ? `2px solid ${color}` : '2px solid transparent',
                    justifyContent: collapsed ? 'center' : undefined,
                  }}
                >
                  <span
                    className="text-base w-4 text-center flex-shrink-0 leading-none"
                    style={{ color: active ? color : 'var(--text-muted)' }}
                  >
                    {symbol}
                  </span>
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.span
                        key="label"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.15 }}
                        className="text-xs overflow-hidden whitespace-nowrap"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t flex-shrink-0 space-y-2" style={{ borderColor: 'var(--border)' }}>
        {session?.user && (
          <div
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
            style={{ background: 'var(--bg-hover)', justifyContent: collapsed ? 'center' : undefined }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: '#7C3AED33' }}
              title={collapsed ? (session.user.name ?? '') : undefined}
            >
              <User className="w-3.5 h-3.5" style={{ color: '#7C3AED' }} />
            </div>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  key="user-info"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 min-w-0 overflow-hidden"
                >
                  <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {session.user.name}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                    {session.user.email}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="p-1 rounded transition-colors hover:bg-red-500/20 flex-shrink-0"
              title="Sign out"
              style={{ color: 'var(--text-muted)' }}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.p
              key="mantra"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-[10px] text-center"
              style={{ color: 'var(--text-muted)' }}
            >
              ॐ तत् सत्
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  )
}
