import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { deserializeYoginiTree, getCurrentYogini, yoginiForPlanet } from '@/lib/astrology/dasha/yogini'
import { auth } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const chart = await prisma.chart.findUnique({ where: { id }, select: { userId: true } })
    if (!chart) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (chart.userId && chart.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const pd = await prisma.planetaryData.findUnique({ where: { chartId: id } })

    if (!pd?.yoginiDashaJson || pd.yoginiDashaJson === '{}' || pd.yoginiDashaJson === '[]') {
      return NextResponse.json({ error: 'No yogini dasha data — recalculate the chart' }, { status: 404 })
    }

    const tree    = deserializeYoginiTree(pd.yoginiDashaJson)
    const current = getCurrentYogini(tree)

    const currentWithYogini = current ? {
      mahadasha:  { ...current.mahadasha,  yogini: yoginiForPlanet(current.mahadasha.planet)  },
      antardasha: { ...current.antardasha, yogini: yoginiForPlanet(current.antardasha.planet) },
    } : null

    const treeWithYogini = tree.map(md => ({
      ...md,
      yogini:      yoginiForPlanet(md.planet),
      antardashas: md.antardashas.map(ad => ({
        ...ad,
        yogini: yoginiForPlanet(ad.planet),
      })),
    }))

    return NextResponse.json({ tree: treeWithYogini, current: currentWithYogini })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch yogini dasha' }, { status: 500 })
  }
}
