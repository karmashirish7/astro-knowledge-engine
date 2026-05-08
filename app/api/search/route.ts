import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { extractEntities } from '@/lib/entities'

const ilike = (t: string) => ({ contains: t, mode: 'insensitive' as const })

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    if (!q.trim()) return NextResponse.json({ entries: [], dictums: [], entities: [] })

    const entities = extractEntities(q)
    const terms = q.split(/\s+/).filter(Boolean)

    const orConditions = terms.flatMap(t => [
      { title:       ilike(t) },
      { description: ilike(t) },
      { tags:        ilike(t) },
      { category:    ilike(t) },
    ])

    const [entries, dictums] = await Promise.all([
      prisma.knowledgeEntry.findMany({
        where: { OR: orConditions },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        include: { relationsFrom: true, relationsTo: true },
      }),
      prisma.dictum.findMany({
        where: {
          OR: [
            { rule:           ilike(q) },
            { entities:       ilike(q) },
            { interpretation: ilike(q) },
          ],
        },
        take: 10,
      }),
    ])

    return NextResponse.json({ entries, dictums, entities, query: q })
  } catch {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
