'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Network, BookOpen, Tag, X } from 'lucide-react'
import dynamic from 'next/dynamic'

const KnowledgeGraph = dynamic(() => import('@/components/graph/KnowledgeGraph'), { ssr: false })

const CATEGORY_COLORS: Record<string, string> = {
  Planets: '#F59E0B', Houses: '#3B82F6', Rashis: '#10B981',
  Nakshatras: '#EC4899', Yogas: '#8B5CF6', Dashas: '#F97316',
  Transits: '#06B6D4', Panchang: '#84CC16', Concepts: '#94A3B8',
}

export default function GraphPage() {
  const [selectedNode, setSelectedNode] = useState<any>(null)

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <div className="flex items-center gap-3">
          <Network className="w-5 h-5" style={{ color: '#3B82F6' }} />
          <div>
            <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Knowledge Graph</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Visual connections between all entities</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {Object.entries(CATEGORY_COLORS).slice(0, 5).map(([cat, color]) => (
            <div key={cat} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{cat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Graph area */}
      <div className="flex-1 relative">
        <KnowledgeGraph onNodeClick={node => setSelectedNode(node)} />

        {/* Node detail panel */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              className="absolute top-4 right-4 w-72 rounded-xl overflow-hidden z-10"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[selectedNode.data?.category] || '#94A3B8' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{selectedNode.data?.category}</span>
                </div>
                <button onClick={() => setSelectedNode(null)} className="p-1 rounded hover:bg-[var(--bg-hover)] transition-colors">
                  <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                  {selectedNode.data?.label}
                </h3>
                {selectedNode.data?.tags?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Tag className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Tags</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedNode.data.tags.map((t: string) => (
                        <span key={t} className="text-xs px-2 py-0.5 rounded-md"
                          style={{ background: '#7C3AED22', color: '#A78BFA', border: '1px solid #7C3AED33' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
