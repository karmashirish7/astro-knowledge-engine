import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { extractEntities, classifyText } from '@/lib/entities'
import { autoLinkEntry } from '@/lib/auto-link'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (search) {
      where.OR = [
        { title:       { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags:        { contains: search, mode: 'insensitive' } },
      ]
    }

    const entries = await prisma.knowledgeEntry.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: { relationsFrom: true, relationsTo: true },
    })

    return NextResponse.json(entries)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch knowledge' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, description, category, tags, dictums, examples, source } = body

    const autoCategory = category || classifyText(description || '')
    const autoEntities = extractEntities(`${title} ${description}`)
    const autoTags = tags || autoEntities.map((e: { name: string }) => e.name)

    const entry = await prisma.knowledgeEntry.create({
      data: {
        title,
        description: description || '',
        category: autoCategory,
        tags: JSON.stringify(autoTags),
        dictums: JSON.stringify(dictums || []),
        examples: JSON.stringify(examples || []),
        source: source || '',
      },
    })

    // Fire-and-forget: don't block the response
    autoLinkEntry(entry.id, title, description || '', autoTags).catch(console.error)

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 })
  }
}
