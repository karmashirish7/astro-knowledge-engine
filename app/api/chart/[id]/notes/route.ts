import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

async function assertOwner(chartId: string, userId: string): Promise<boolean> {
  const chart = await prisma.chart.findUnique({ where: { id: chartId }, select: { userId: true } })
  if (!chart) return false
  return !chart.userId || chart.userId === userId
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!(await assertOwner(id, session.user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const notes = await prisma.chartNote.findMany({
    where: { chartId: id },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(notes)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!(await assertOwner(id, session.user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { section, content, order } = await req.json()

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
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (!(await assertOwner(id, session.user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { section } = await req.json()
  await prisma.chartNote.deleteMany({ where: { chartId: id, section } })
  return NextResponse.json({ success: true })
}
