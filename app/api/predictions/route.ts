import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const chartId = searchParams.get('chartId')
    const outcome = searchParams.get('outcome')

    const where: Record<string, unknown> = {}
    if (chartId) where.chartId = chartId
    if (outcome) where.outcome = outcome

    const predictions = await prisma.prediction.findMany({
      where,
      orderBy: { predictedAt: 'desc' },
    })
    return NextResponse.json(predictions)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch predictions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { chartId, prediction, targetDate, dashaContext, notes } = await req.json()
    if (!chartId || !prediction) {
      return NextResponse.json({ error: 'chartId and prediction required' }, { status: 400 })
    }
    const pred = await prisma.prediction.create({
      data: {
        chartId,
        prediction,
        targetDate:   targetDate   ? new Date(targetDate) : null,
        dashaContext: dashaContext || '',
        notes:        notes        || '',
        outcome:      'pending',
      },
    })
    return NextResponse.json(pred, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create prediction' }, { status: 500 })
  }
}
