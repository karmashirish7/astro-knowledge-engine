import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/dictums/verify?dictumId=&chartId=
// Returns all verifications for a dictum, or the single one for a dictum+chart pair.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const dictumId = searchParams.get('dictumId')
    const chartId  = searchParams.get('chartId')

    if (dictumId && chartId) {
      const v = await prisma.dictumVerification.findUnique({
        where: { dictumId_chartId: { dictumId, chartId } },
      })
      return NextResponse.json(v ?? null)
    }

    if (dictumId) {
      const vs = await prisma.dictumVerification.findMany({
        where: { dictumId },
        include: { chart: { select: { id: true, name: true } } },
        orderBy: { updatedAt: 'desc' },
      })
      return NextResponse.json(vs)
    }

    return NextResponse.json({ error: 'dictumId required' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch verifications' }, { status: 500 })
  }
}

// POST /api/dictums/verify
// Body: { dictumId, chartId, verdict, note }
// verdict: "confirmed" | "refuted" | "partial" | "unclear"
export async function POST(req: NextRequest) {
  try {
    const { dictumId, chartId, verdict, note } = await req.json()
    if (!dictumId || !chartId || !verdict) {
      return NextResponse.json({ error: 'dictumId, chartId, verdict required' }, { status: 400 })
    }

    const v = await prisma.dictumVerification.upsert({
      where: { dictumId_chartId: { dictumId, chartId } },
      create: { dictumId, chartId, verdict, note: note ?? '' },
      update: { verdict, note: note ?? '' },
    })
    return NextResponse.json(v, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to save verification' }, { status: 500 })
  }
}

// DELETE /api/dictums/verify
// Body: { dictumId, chartId }
export async function DELETE(req: NextRequest) {
  try {
    const { dictumId, chartId } = await req.json()
    await prisma.dictumVerification.delete({
      where: { dictumId_chartId: { dictumId, chartId } },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete verification' }, { status: 500 })
  }
}
