import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { statement, status, confidence, category, notes, dictumId } = await req.json()
    const obs = await prisma.observation.update({
      where: { id },
      data: {
        statement:  statement  ?? undefined,
        status:     status     ?? undefined,
        confidence: confidence ?? undefined,
        category:   category   ?? undefined,
        notes:      notes      ?? undefined,
        dictumId:   dictumId   !== undefined ? (dictumId || null) : undefined,
      },
    })
    return NextResponse.json(obs)
  } catch {
    return NextResponse.json({ error: 'Failed to update observation' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.observation.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete observation' }, { status: 500 })
  }
}
