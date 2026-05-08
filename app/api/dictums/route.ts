import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { extractEntities } from '@/lib/entities'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const strength = searchParams.get('strength')
    const search   = searchParams.get('search')

    const where: Record<string, unknown> = {}
    if (strength) where.strength = strength
    if (search) {
      where.OR = [
        { rule:           { contains: search, mode: 'insensitive' } },
        { interpretation: { contains: search, mode: 'insensitive' } },
        { entities:       { contains: search, mode: 'insensitive' } },
      ]
    }

    const dictums = await prisma.dictum.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(dictums)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch dictums' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    await prisma.dictum.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete dictum' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, rule, interpretation, tags, strength, source, conditionsJson, category } = body

    // Update existing dictum (used for interpretation notes + conditionsJson saves)
    if (id && !rule) {
      const dictum = await prisma.dictum.update({
        where: { id },
        data: {
          interpretation: interpretation ?? undefined,
          conditionsJson: conditionsJson  ?? undefined,
          category:       category        ?? undefined,
        },
      })
      return NextResponse.json(dictum)
    }

    // Create new dictum
    const entities = extractEntities(rule)
    const dictum = await prisma.dictum.create({
      data: {
        rule,
        entities:       JSON.stringify(entities),
        interpretation: interpretation || '',
        tags:           JSON.stringify(tags || []),
        strength:       strength       || 'Strong',
        source:         source         || '',
        category:       category       || '',
        conditionsJson: conditionsJson  || '{}',
      },
    })
    return NextResponse.json(dictum, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to save dictum' }, { status: 500 })
  }
}
