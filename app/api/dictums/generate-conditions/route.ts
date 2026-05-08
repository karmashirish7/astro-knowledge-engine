import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM = `You are an expert Vedic astrology rule parser.
Given a dictum (predictive rule), extract its conditions as a flat JSON object.
Each key maps to a structured field for a birth chart database.

Available fields:
- Planet houses: sunHouse, moonHouse, marsHouse, mercuryHouse, jupiterHouse, venusHouse, saturnHouse, rahuHouse, ketuHouse (value: 1–12)
- Planet signs: sunSign, moonSign, marsSign, ... (value: sign name e.g. "Leo")
- Planet nakshatras: sunNakshatra, moonNakshatra, ... (value: nakshatra name e.g. "Rohini")
- Lagna: lagnaSign, lagnaNakshatra, lagnaDegreeMin, lagnaDegreeMax
- Karakas: atmakaraka, darakaraka (value: planet name)
- House groups (value: true): marsInKendra, jupiterInTrikona, saturnInDusthana, etc.
- Dignity (value: true): sunExalted, moonDebilitated, marsExalted, saturnDebilitated, etc.
- Aspects (value: true): marsAspectsLagna, jupiterAspectsLagna, saturnAspectsLagna

Output ONLY a valid JSON object, nothing else.
If a condition cannot be expressed, omit it.
If the rule is too abstract (e.g. "strong Jupiter"), return {}.

Examples:
Rule: "Saturn in 7th house delays marriage"
Output: {"saturnHouse": 7}

Rule: "Moon in Rohini nakshatra gives beauty and material comforts"
Output: {"moonNakshatra": "Rohini"}

Rule: "Jupiter in kendra from lagna gives Raja Yoga"
Output: {"jupiterInKendra": true}

Rule: "Mars in Cancer is debilitated and causes accidents"
Output: {"marsDebilitated": true, "marsSign": "Cancer"}

Rule: "Exalted Venus in Pisces in 7th house gives beautiful spouse"
Output: {"venusExalted": true, "venusSign": "Pisces", "venusHouse": 7}`

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 503 })
  }
  try {
    const { rule, dictumId } = await req.json()
    if (!rule) return NextResponse.json({ error: 'rule required' }, { status: 400 })

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system:     SYSTEM,
      messages:   [{ role: 'user', content: `Rule: "${rule}"` }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}'
    let conditionsJson = '{}'
    try {
      JSON.parse(text)  // validate
      conditionsJson = text
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) { JSON.parse(match[0]); conditionsJson = match[0] }
    }

    // Optionally save back to dictum
    if (dictumId && conditionsJson !== '{}') {
      await prisma.dictum.update({
        where: { id: dictumId },
        data:  { conditionsJson },
      }).catch(() => {})
    }

    return NextResponse.json({ conditionsJson })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 })
  }
}
