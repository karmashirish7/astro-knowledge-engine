import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { deserializeYoginiTree, getCurrentYogini, yoginiForPlanet } from '@/lib/astrology/dasha/yogini'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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
