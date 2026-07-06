import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { deserializeDashaTree, getCurrentDasha } from '@/lib/astrology/dasha'

// Resolves a chart by id, or by fuzzy name match scoped to the signed-in user,
// then returns the Vimshottari MD/AD/PD running at the given date.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { chartId, name, date } = await req.json()
    if (!date) return NextResponse.json({ error: 'date is required' }, { status: 400 })

    const refDate = new Date(date)
    if (isNaN(refDate.getTime())) return NextResponse.json({ error: 'Could not parse that date' }, { status: 400 })

    let chart: { id: string; name: string; birthDate: string; birthTime: string; birthPlace: string } | null = null
    let candidates: { id: string; name: string; birthDate: string }[] = []

    if (chartId) {
      const found = await prisma.chart.findUnique({
        where: { id: chartId },
        select: { id: true, name: true, birthDate: true, birthTime: true, birthPlace: true, userId: true },
      })
      if (found && found.userId && found.userId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      chart = found
    } else if (name) {
      const matches = await prisma.chart.findMany({
        where: { userId: session.user.id, name: { contains: name.trim(), mode: 'insensitive' } },
        select: { id: true, name: true, birthDate: true, birthTime: true, birthPlace: true },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      })
      const exact = matches.find(m => m.name.toLowerCase() === name.trim().toLowerCase())
      if (exact) {
        chart = exact
      } else if (matches.length === 1) {
        chart = matches[0]
      } else if (matches.length > 1) {
        candidates = matches
      }
    } else {
      return NextResponse.json({ error: 'Provide chartId or name' }, { status: 400 })
    }

    if (!chart) {
      if (candidates.length > 0) {
        return NextResponse.json({ found: false, candidates, message: `Found ${candidates.length} charts matching "${name}" — which one?` })
      }
      return NextResponse.json({ found: false, message: `No saved chart found matching "${name}".` })
    }

    const pd = await prisma.planetaryData.findUnique({ where: { chartId: chart.id } })
    if (!pd || !pd.dashaJson || pd.dashaJson === '{}' || pd.dashaJson === '[]') {
      return NextResponse.json({ found: false, message: `"${chart.name}" has no calculated dasha data yet — recalculate the chart first.` })
    }

    const tree = deserializeDashaTree(pd.dashaJson)
    const current = getCurrentDasha(tree, refDate)
    if (!current) {
      return NextResponse.json({ found: false, message: `${refDate.toDateString()} falls outside the 120-year Vimshottari window for "${chart.name}".` })
    }

    return NextResponse.json({
      found: true,
      chart: { id: chart.id, name: chart.name, birthDate: chart.birthDate, birthTime: chart.birthTime, birthPlace: chart.birthPlace },
      date: refDate.toISOString(),
      dasha: current,
    })
  } catch (err) {
    console.error('[playground/dasha-event]', err)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
