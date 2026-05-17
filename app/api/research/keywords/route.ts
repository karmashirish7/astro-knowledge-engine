import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withPlanets } from '@/lib/chart-response'

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ charts: [], total: 0 })
    }

    const q = query.trim().toLowerCase()
    if (!q) return NextResponse.json({ charts: [], total: 0 })

    // Search name, birthPlace, tagsList (JSON array string), keywords (JSON array string)
    const charts = await prisma.chart.findMany({
      where: {
        OR: [
          { name:       { contains: q, mode: 'insensitive' } },
          { birthPlace: { contains: q, mode: 'insensitive' } },
          { tagsList:   { contains: q, mode: 'insensitive' } },
          { keywords:   { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    })

    return NextResponse.json({ charts: withPlanetsMany(charts), total: charts.length })
  } catch (err) {
    console.error('[research/keywords]', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}

function withPlanetsMany(charts: any[]) {
  return charts.map(withPlanets)
}
