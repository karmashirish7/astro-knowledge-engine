import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { prediction, targetDate, outcome, accuracy, dashaContext, notes } = await req.json()
    const pred = await prisma.prediction.update({
      where: { id },
      data: {
        prediction:   prediction   ?? undefined,
        targetDate:   targetDate   !== undefined ? (targetDate ? new Date(targetDate) : null) : undefined,
        outcome:      outcome      ?? undefined,
        accuracy:     accuracy     ?? undefined,
        dashaContext: dashaContext  ?? undefined,
        notes:        notes        ?? undefined,
        resolvedAt:   outcome && outcome !== 'pending' ? new Date() : undefined,
      },
    })
    return NextResponse.json(pred)
  } catch {
    return NextResponse.json({ error: 'Failed to update prediction' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.prediction.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete prediction' }, { status: 500 })
  }
}
