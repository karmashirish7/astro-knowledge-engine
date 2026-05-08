import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { deserializeDashaTree, getCurrentDasha } from '@/lib/astrology/dasha'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const pd = await prisma.planetaryData.findUnique({ where: { chartId: id } })
    if (!pd || !pd.dashaJson || pd.dashaJson === '{}' || pd.dashaJson === '[]') {
      return NextResponse.json({ error: 'No dasha data — recalculate the chart' }, { status: 404 })
    }
    const tree    = deserializeDashaTree(pd.dashaJson)
    const current = getCurrentDasha(tree)
    return NextResponse.json({ tree, current })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch dasha' }, { status: 500 })
  }
}
