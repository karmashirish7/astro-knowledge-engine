'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ReactFlow, {
  Node, Edge, Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge,
  BackgroundVariant, NodeProps, Handle, Position,
  MarkerType, Panel,
} from 'reactflow'
import 'reactflow/dist/style.css'

type NodeShape   = 'rect' | 'pill' | 'circle'
type EdgeLineType = 'smoothstep' | 'straight' | 'step' | 'bezier'

const CATEGORY_COLORS: Record<string, string> = {
  Planets: '#F59E0B', Houses: '#3B82F6', Rashis: '#10B981',
  Nakshatras: '#EC4899', Yogas: '#8B5CF6', Dashas: '#F97316',
  Transits: '#06B6D4', Panchang: '#84CC16', Concepts: '#94A3B8',
}
const CATEGORIES = Object.keys(CATEGORY_COLORS)

// ── Node renderer ────────────────────────────────────────────────────────

function AstroNode({ data, selected }: NodeProps) {
  const color  = CATEGORY_COLORS[data.category as string] || '#94A3B8'
  const shape  = (data.shape as NodeShape) || 'rect'
  const isCircle = shape === 'circle'

  const containerStyle: React.CSSProperties = {
    background: '#FFFFFF',
    border: `2px solid ${selected ? color : color + '88'}`,
    borderRadius: isCircle || shape === 'pill' ? 999 : 10,
    padding: isCircle ? '6px' : '9px 15px',
    minWidth:  isCircle ? 84 : 140,
    maxWidth:  isCircle ? 84 : 220,
    width:     isCircle ? 84 : undefined,
    height:    isCircle ? 84 : undefined,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: selected
      ? `0 0 22px ${color}55, 0 4px 20px rgba(0,0,0,0.12)`
      : '0 2px 8px rgba(0,0,0,0.08)',
    cursor: 'pointer',
  }

  return (
    <div style={{ position: 'relative' }}>
      <Handle type="target" position={Position.Top}
        style={{ background: color, border: 'none', width: 8, height: 8 }} />
      <div style={containerStyle}>
        {!isCircle && (
          <p style={{ fontSize: 9, fontWeight: 800, color, marginBottom: 3,
            textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {data.category as string}
          </p>
        )}
        <p style={{ fontSize: isCircle ? 10 : 13, fontWeight: 700, color: '#0F172A',
          textAlign: 'center', lineHeight: 1.3, wordBreak: 'break-word' }}>
          {data.label as string}
        </p>
        {(data.tags as string[])?.length > 0 && !isCircle && (
          <p style={{ fontSize: 10, color: '#64748B', marginTop: 3, textAlign: 'center' }}>
            {(data.tags as string[]).slice(0, 2).join(' · ')}
          </p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom}
        style={{ background: color, border: 'none', width: 8, height: 8 }} />
    </div>
  )
}

const nodeTypes = { astro: AstroNode }

// ── Layout ────────────────────────────────────────────────────────────────

function layoutNodes(rawNodes: any[], rawEdges: any[]) {
  const COLS = 5, H_GAP = 270, V_GAP = 185
  const grouped: Record<string, any[]> = {}
  rawNodes.forEach(n => {
    const cat = n.category || 'Concepts'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(n)
  })

  const nodes: Node[] = []
  let row = 0
  for (const [, items] of Object.entries(grouped)) {
    items.forEach((item, col) => {
      nodes.push({
        id: item.id, type: 'astro',
        position: { x: (col % COLS) * H_GAP, y: row * V_GAP + Math.floor(col / COLS) * V_GAP },
        data: { label: item.title, category: item.category, tags: item.tags || [], shape: 'rect' },
      })
    })
    row += Math.ceil(items.length / COLS) + 0.5
  }

  const edges: Edge[] = rawEdges.map(e => ({
    id: e.id, source: e.source, target: e.target, label: e.label,
    type: 'smoothstep', animated: true,
    style: { stroke: '#7C3AED88', strokeWidth: 1.5 },
    labelStyle: { fill: '#94A3B8', fontSize: 10, fontFamily: 'monospace' },
    labelBgStyle: { fill: '#F1F5F9', fillOpacity: 0.9 },
    labelBgPadding: [4, 3] as [number, number],
    markerEnd: { type: MarkerType.ArrowClosed, color: '#7C3AED88' },
  }))

  return { nodes, edges }
}

// ── Main component ────────────────────────────────────────────────────────

interface Props { onNodeClick?: (node: any) => void }

export default function KnowledgeGraph({ onNodeClick }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<Node | null>(null)
  const [edgeType, setEdgeType] = useState<EdgeLineType>('smoothstep')
  const [showAdd, setShowAdd]   = useState(false)
  const [addLabel, setAddLabel]   = useState('')
  const [addCat, setAddCat]       = useState('Concepts')
  const [addShape, setAddShape]   = useState<NodeShape>('rect')
  const nextId = useRef(9000)

  useEffect(() => {
    fetch('/api/graph')
      .then(r => r.json())
      .then(({ nodes: n = [], edges: e = [] }) => {
        const { nodes: laid, edges: ledges } = layoutNodes(n, e)
        setNodes(laid)
        setEdges(ledges)
        nextId.current = Math.max(9000, laid.length + 1000)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const onConnect = useCallback((params: any) => {
    setEdges(eds => addEdge({
      ...params, type: edgeType, animated: true,
      style: { stroke: '#7C3AED88', strokeWidth: 1.5 },
      labelStyle: { fill: '#94A3B8', fontSize: 10 },
      labelBgStyle: { fill: '#F1F5F9', fillOpacity: 0.9 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#7C3AED88' },
    }, eds))
  }, [edgeType])

  const handleNodeClick = useCallback((_: any, node: Node) => {
    setSelected(node)
    onNodeClick?.(node)
  }, [onNodeClick])

  const clearSelection = useCallback(() => setSelected(null), [])

  const changeShape = (shape: NodeShape) => {
    if (!selected) return
    setNodes(ns => ns.map(n =>
      n.id === selected.id ? { ...n, data: { ...n.data, shape } } : n
    ))
    setSelected(s => s ? { ...s, data: { ...s.data, shape } } : null)
  }

  const deleteSelected = () => {
    if (!selected) return
    setNodes(ns => ns.filter(n => n.id !== selected.id))
    setEdges(es => es.filter(e => e.source !== selected.id && e.target !== selected.id))
    setSelected(null)
  }

  const handleAddNode = () => {
    if (!addLabel.trim()) return
    const id = String(++nextId.current)
    setNodes(ns => [...ns, {
      id, type: 'astro',
      position: { x: 200 + Math.random() * 300, y: 200 + Math.random() * 200 },
      data: { label: addLabel.trim(), category: addCat, tags: [], shape: addShape },
    }])
    setAddLabel('')
    setShowAdd(false)
  }

  // ── Toolbar styles ──────────────────────────────────────────────────────
  const toolBtn = (active: boolean): React.CSSProperties => ({
    padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11,
    fontWeight: 600, border: `1px solid ${active ? '#7C3AED' : '#CBD5E1'}`,
    background: active ? '#7C3AED' : '#F1F5F9',
    color: active ? 'white' : '#475569',
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Building knowledge graph…</p>
        </div>
      </div>
    )
  }

  if (nodes.length === 0 && !loading) {
    return (
      <div className="flex items-center justify-center h-full flex-col gap-3">
        <p className="text-base font-medium" style={{ color: 'var(--text-secondary)' }}>No nodes yet</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Add knowledge entries to see the graph</p>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={clearSelection}
        nodeTypes={nodeTypes}
        fitView fitViewOptions={{ padding: 0.18 }}
        minZoom={0.05} maxZoom={3}
        style={{ background: '#F8FAFC' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#CBD5E1" />
        <Controls style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 8 }} />
        <MiniMap
          nodeColor={n => CATEGORY_COLORS[(n.data as any)?.category] || '#94A3B8'}
          maskColor="rgba(248,250,252,0.85)"
          style={{ background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 8 }}
        />

        {/* ── Toolbar ─────────────────────────────────────────────── */}
        <Panel position="top-left">
          <div style={{
            background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 10,
            padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 14,
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}>

            {/* Shape picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 9, color: '#4B5563', fontWeight: 800, letterSpacing: '0.08em', marginRight: 2 }}>SHAPE</span>
              {(['rect', 'pill', 'circle'] as NodeShape[]).map(s => {
                const active = selected ? (selected.data?.shape === s || (!selected.data?.shape && s === 'rect')) : addShape === s
                return (
                  <button key={s} title={s}
                    onClick={() => selected ? changeShape(s) : setAddShape(s)}
                    style={{ ...toolBtn(active), padding: '5px 8px', fontSize: 14 }}>
                    {s === 'rect' ? '▭' : s === 'pill' ? '⬭' : '●'}
                  </button>
                )
              })}
            </div>

            <div style={{ width: 1, height: 22, background: '#CBD5E1' }} />

            {/* Edge type picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 9, color: '#4B5563', fontWeight: 800, letterSpacing: '0.08em', marginRight: 2 }}>LINE</span>
              {([
                ['smoothstep', '⌒', 'Curved'],
                ['straight',   '—', 'Straight'],
                ['step',       '⌐', 'Step'],
                ['bezier',     '∫', 'Bezier'],
              ] as [EdgeLineType, string, string][]).map(([t, icon, tip]) => (
                <button key={t} title={tip} onClick={() => setEdgeType(t)} style={{ ...toolBtn(edgeType === t), padding: '5px 8px', fontSize: 14 }}>
                  {icon}
                </button>
              ))}
            </div>

            <div style={{ width: 1, height: 22, background: '#CBD5E1' }} />

            {/* Add node */}
            <button onClick={() => setShowAdd(true)} style={{
              padding: '5px 13px', borderRadius: 7, background: '#10B981', color: 'white',
              border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>
              + Add Node
            </button>

            {/* Delete selected node */}
            {selected && (
              <button onClick={deleteSelected} style={{
                padding: '5px 12px', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                background: 'rgba(239,68,68,0.12)', color: '#F87171',
                border: '1px solid rgba(239,68,68,0.25)',
              }}>
                Delete
              </button>
            )}
          </div>
        </Panel>
      </ReactFlow>

      {/* ── Add Node modal ──────────────────────────────────────────── */}
      {showAdd && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30,
        }} onClick={e => { if (e.target === e.currentTarget) setShowAdd(false) }}>
          <div style={{
            background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 14,
            padding: 28, width: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }}>
            <h3 style={{ color: '#0F172A', fontSize: 15, fontWeight: 700, marginBottom: 18 }}>
              Add Node
            </h3>

            <input
              autoFocus
              value={addLabel}
              onChange={e => setAddLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddNode(); if (e.key === 'Escape') setShowAdd(false) }}
              placeholder="Label…"
              style={{
                width: '100%', padding: '9px 13px', borderRadius: 8, marginBottom: 10,
                background: '#F1F5F9', border: '1px solid #CBD5E1',
                color: '#0F172A', fontSize: 13, outline: 'none',
              }}
            />

            <select value={addCat} onChange={e => setAddCat(e.target.value)} style={{
              width: '100%', padding: '9px 13px', borderRadius: 8, marginBottom: 12,
              background: '#F1F5F9', border: '1px solid #CBD5E1',
              color: '#0F172A', fontSize: 13, outline: 'none', cursor: 'pointer',
            }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
              {(['rect', 'pill', 'circle'] as NodeShape[]).map(s => (
                <button key={s} onClick={() => setAddShape(s)} style={{
                  flex: 1, padding: '7px 0', borderRadius: 7, cursor: 'pointer',
                  background: addShape === s ? '#7C3AED' : '#F1F5F9',
                  color: addShape === s ? 'white' : '#475569',
                  border: `1px solid ${addShape === s ? '#7C3AED' : '#CBD5E1'}`,
                  fontSize: 11, fontWeight: 600,
                }}>
                  {s}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowAdd(false)} style={{
                flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer',
                background: '#F1F5F9', border: '1px solid #CBD5E1',
                color: '#475569', fontSize: 13,
              }}>
                Cancel
              </button>
              <button onClick={handleAddNode} disabled={!addLabel.trim()} style={{
                flex: 1, padding: '9px', borderRadius: 8, cursor: addLabel.trim() ? 'pointer' : 'not-allowed',
                background: addLabel.trim() ? '#7C3AED' : '#E2E8F0', border: 'none',
                color: addLabel.trim() ? 'white' : '#94A3B8', fontSize: 13, fontWeight: 700,
              }}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
