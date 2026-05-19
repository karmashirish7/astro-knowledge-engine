import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'
import { auth } from '@/lib/auth'

const HOUSE_NAMES = [
  'Lagna', 'Dhana', 'Sahaja', 'Sukha', 'Putra', 'Ripu',
  'Yuvati', 'Randhra', 'Dharma', 'Karma', 'Labha', 'Vyaya',
]
const RASHIS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
]

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set. Add it to your .env file to use AI readings.' },
      { status: 503 }
    )
  }

  try {
    const { chartId, planets, lagna } = await req.json()

    if (chartId) {
      const chart = await prisma.chart.findUnique({ where: { id: chartId }, select: { userId: true } })
      if (!chart) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      if (chart.userId && chart.userId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    const planetEntries = Object.entries(planets as Record<string, number>)

    if (planetEntries.length === 0) {
      return NextResponse.json({ error: 'No planets placed in the chart.' }, { status: 400 })
    }

    // Compute rashi for each house based on lagna
    const houseRashis = Array.from({ length: 12 }, (_, i) => RASHIS[(lagna - 1 + i) % 12])
    const lagnaRashi = houseRashis[0]

    // Fetch knowledge entries that mention any placed planet or its house
    const orConditions = planetEntries.flatMap(([planet, house]) => [
      { title: { contains: planet } },
      { description: { contains: planet } },
      { tags: { contains: planet } },
      { description: { contains: `${house}th house` } },
      { description: { contains: `house ${house}` } },
      { title: { contains: houseRashis[house - 1] } },
      { description: { contains: houseRashis[house - 1] } },
    ])

    const [entries, dictums] = await Promise.all([
      prisma.knowledgeEntry.findMany({ where: { OR: orConditions }, take: 30 }),
      prisma.dictum.findMany({
        where: {
          OR: planetEntries.flatMap(([planet]) => [
            { rule: { contains: planet } },
            { entities: { contains: planet } },
          ]),
        },
        take: 20,
      }),
    ])

    const chartDesc = [
      `Lagna (Ascendant): ${lagnaRashi}`,
      '',
      'House assignments:',
      ...houseRashis.map((r, i) => `  H${i + 1} (${HOUSE_NAMES[i]}): ${r}`),
      '',
      'Planet placements:',
      ...planetEntries.map(
        ([p, h]) => `  ${p} → House ${h} (${HOUSE_NAMES[h - 1]}, ${houseRashis[h - 1]})`
      ),
    ].join('\n')

    const knowledgeText = entries.length > 0
      ? entries.map(e => `[${e.category}] ${e.title}\n${e.description.slice(0, 400)}`).join('\n\n')
      : 'No matching entries found in your knowledge base for this chart.'

    const dictumsText = dictums.length > 0
      ? dictums.map(d => `(${d.strength}) "${d.rule}"${d.interpretation ? ` — ${d.interpretation.slice(0, 150)}` : ''}`).join('\n')
      : 'No matching dictums found.'

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      system: `You are a Vedic astrology study assistant helping a student practice chart readings.
Generate a chart reading using ONLY the student's own knowledge entries and dictums provided below.
Do NOT add information that isn't in their notes.
Structure your reading with clear sections (e.g., Lagna Analysis, Key Planets, Notable Combinations, Life Areas).
After each statement, briefly indicate which note it comes from in parentheses, e.g. (from: "Saturn in 7th House").
At the end, note which houses/planets have gaps — areas where the student needs more notes.`,
      messages: [{
        role: 'user',
        content: `Analyze this chart using my study notes:\n\n${chartDesc}\n\n---\nMY KNOWLEDGE ENTRIES (${entries.length}):\n${knowledgeText}\n\n---\nMY DICTUMS/RULES (${dictums.length}):\n${dictumsText}`,
      }],
    })

    const reading = response.content[0].type === 'text' ? response.content[0].text : ''

    if (chartId) {
      await prisma.prediction.create({
        data: {
          chartId,
          prediction: reading.slice(0, 500) + (reading.length > 500 ? '…' : ''),
          notes: reading,
          dashaContext: 'AI Reading',
          outcome: 'pending',
        },
      }).catch(() => {})
    }

    return NextResponse.json({ reading, entriesUsed: entries.length, dictumsUsed: dictums.length })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || 'Failed to generate reading' }, { status: 500 })
  }
}
