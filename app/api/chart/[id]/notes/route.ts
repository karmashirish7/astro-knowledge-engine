import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const notes = await prisma.chartNote.findMany({
    where: { chartId: id },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(notes)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { section, content, order } = await req.json()

  // Upsert by chartId + section so standard sections are idempotent
  const existing = await prisma.chartNote.findFirst({ where: { chartId: id, section } })
  if (existing) {
    const note = await prisma.chartNote.update({
      where: { id: existing.id },
      data: { content: content ?? '', order: order ?? existing.order },
    })
    return NextResponse.json(note)
  }

  const note = await prisma.chartNote.create({
    data: { chartId: id, section, content: content ?? '', order: order ?? 99 },
  })
  return NextResponse.json(note, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { section } = await req.json()
  await prisma.chartNote.deleteMany({ where: { chartId: id, section } })
  return NextResponse.json({ success: true })
}
