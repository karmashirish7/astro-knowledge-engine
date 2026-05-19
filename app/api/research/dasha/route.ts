import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withPlanets } from '@/lib/chart-response'
import { deserializeDashaTree, getCurrentDasha } from '@/lib/astrology/dasha'

export async function POST(req: NextRequest) {
  try {
    const { mahadasha, antardasha, date } = await req.json()
    if (!mahadasha) return NextResponse.json({ charts: [], total: 0 })

    const refDate = date ? new Date(date) : new Date()

    const all = await prisma.chart.findMany({
      include: { planetaryData: { select: { dashaJson: true } } },
      orderBy: { updatedAt: 'desc' },
    })

    const matched: any[] = []

    for (const chart of all) {
      const dashaJson = chart.planetaryData?.dashaJson
      if (!dashaJson || dashaJson === '{}') continue
      try {
        const tree = deserializeDashaTree(dashaJson)
        const cur  = getCurrentDasha(tree, refDate)
        if (!cur) continue

        if (cur.mahadasha.planet !== mahadasha) continue
        if (antardasha && cur.antardasha.planet !== antardasha) continue

        matched.push({
          ...chart,
          _currentDasha: { mahadasha: cur.mahadasha, antardasha: cur.antardasha },
        })
      } catch { /* skip charts with malformed dasha data */ }
    }

    return NextResponse.json({
      charts: matched.map(withPlanets),
      total:  matched.length,
    })
  } catch (err) {
    console.error('[research/dasha]', err)
    return NextResponse.json({ error: 'Dasha search failed' }, { status: 500 })
  }
}
