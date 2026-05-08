import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const chartId  = searchParams.get('chartId')
    const dictumId = searchParams.get('dictumId')
    const category = searchParams.get('category')

    const where: Record<string, unknown> = {}
    if (chartId)  where.chartId  = chartId
    if (dictumId) where.dictumId = dictumId
    if (category) where.category = category

    const observations = await prisma.observation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { dictum: { select: { id: true, rule: true } } },
    })
    return NextResponse.json(observations)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch observations' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { chartId, dictumId, statement, status, confidence, category, notes } = await req.json()
    if (!chartId || !statement) {
      return NextResponse.json({ error: 'chartId and statement required' }, { status: 400 })
    }
    const obs = await prisma.observation.create({
      data: {
        chartId,
        dictumId:   dictumId   || null,
        statement,
        status:     status     || 'unclear',
        confidence: confidence ?? null,
        category:   category   || '',
        notes:      notes      || '',
      },
    })
    return NextResponse.json(obs, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create observation' }, { status: 500 })
  }
}
