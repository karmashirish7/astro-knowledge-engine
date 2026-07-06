import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const charts = await prisma.chart.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' },
      select: {
        name: true,
        birthDate: true,
        birthTime: true,
        birthPlace: true,
        birthLat: true,
        birthLon: true,
        timezone: true,
        tagsList: true,
        notes: true,
      },
    })
    return NextResponse.json(charts)
  } catch {
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
