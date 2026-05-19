import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { deserializeDashaTree, getCurrentDasha } from '@/lib/astrology/dasha'
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
