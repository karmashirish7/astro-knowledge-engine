import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { extractEntities, classifyText, extractDictums } from '@/lib/entities'

// Phase 2: Save confirmed dictums chosen by the user
export async function POST(req: NextRequest) {
  try {
    const { text, confirmedDictums } = await req.json()
    const dictums: string[] = Array.isArray(confirmedDictums) ? confirmedDictums : []

    const entities = extractEntities(text)
    const category = classifyText(text)

    const sentences = text.split(/[.!?।]+/).map((s: string) => s.trim()).filter(Boolean)
    const title = sentences[0]?.slice(0, 80) || 'Untitled Note'

    const extracted = { entities, category, dictums, title, sentences }

    const dump = await prisma.dumpNote.create({
      data: {
        rawText: text,
        processed: true,
        extracted: JSON.stringify(extracted),
      },
    })

    // Save only user-confirmed dictums
    for (const rule of dictums) {
      const ruleEntities = extractEntities(rule)
      await prisma.dictum.create({
        data: {
          rule,
          entities: JSON.stringify(ruleEntities),
          interpretation: '',
          tags: JSON.stringify(entities.map((e: { name: string }) => e.name)),
          strength: 'Conditional',
          source: 'Dump Mode',
        },
      }).catch(() => {})
    }

    const entry = await prisma.knowledgeEntry.create({
      data: {
        title,
        description: text,
        category,
        tags: JSON.stringify(entities.map((e: { name: string }) => e.name)),
        dictums: JSON.stringify(dictums),
        source: 'Dump Mode',
      },
    })

    return NextResponse.json({ dump, extracted, entry }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to process dump' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const dumps = await prisma.dumpNote.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return NextResponse.json(dumps)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch dumps' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    await prisma.dumpNote.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete dump' }, { status: 500 })
  }
}
