import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const entries = await prisma.knowledgeEntry.findMany({
      include: { relationsFrom: true, relationsTo: true },
    })
    const relations = await prisma.entryRelation.findMany()

    const nodes = entries.map(e => ({
      id: e.id,
      title: e.title,
      category: e.category,
      tags: JSON.parse(e.tags as string),
    }))

    const edges = relations.map(r => ({
      id: r.id,
      source: r.fromId,
      target: r.toId,
      label: r.relationLabel,
      weight: r.weight,
    }))

    return NextResponse.json({ nodes, edges })
  } catch {
    return NextResponse.json({ error: 'Failed to build graph' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { fromId, toId, label, weight } = await req.json()
    const relation = await prisma.entryRelation.upsert({
      where: { fromId_toId: { fromId, toId } },
      update: { relationLabel: label || '', weight: weight || 1 },
      create: { fromId, toId, relationLabel: label || '', weight: weight || 1 },
    })
    return NextResponse.json(relation, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create relation' }, { status: 500 })
  }
}
