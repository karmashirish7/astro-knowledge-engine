import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { autoLinkEntry } from '@/lib/auto-link'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const entry = await prisma.knowledgeEntry.findUnique({
      where: { id },
      include: {
        relationsFrom: { include: { to: true } },
        relationsTo: { include: { from: true } },
      },
    })
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(entry)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch entry' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const entry = await prisma.knowledgeEntry.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        category: body.category,
        tags: JSON.stringify(body.tags || []),
        dictums: JSON.stringify(body.dictums || []),
        examples: JSON.stringify(body.examples || []),
        source: body.source || '',
      },
    })
    autoLinkEntry(id, body.title, body.description || '', body.tags || []).catch(console.error)
    return NextResponse.json(entry)
  } catch {
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.knowledgeEntry.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
  }
}
