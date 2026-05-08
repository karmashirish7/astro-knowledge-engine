import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM = `You are an expert Vedic astrology knowledge extractor.

Given a block of astrology text, extract every distinct predictive rule (dictum) embedded in it.

A dictum is a rule of the form: [planetary configuration or condition] → [prediction or result].

Rules:
- Extract EACH distinct rule as its own separate item, even if compressed into one sentence
- A single sentence may contain multiple distinct rules — split them
- Do not merge unrelated rules together
- Keep each dictum self-contained: it must make sense on its own
- Preserve the original phrasing as closely as possible
- Ignore meta-commentary, filler text, or non-predictive statements
- Return ONLY a valid JSON array of strings, nothing else

Example input:
"Saturn in 7th delays marriage but gives stable partnership later. Jupiter in 5th gives children and creativity, while Moon in Rohini grants beauty and wealth. Rahu in lagna causes unusual personality and foreign connections."

Example output:
["Saturn in 7th house delays marriage", "Saturn in 7th house gives stable partnership later", "Jupiter in 5th house gives good children", "Jupiter in 5th house enhances creativity", "Moon in Rohini nakshatra grants beauty", "Moon in Rohini nakshatra brings wealth", "Rahu in lagna causes unusual personality", "Rahu in lagna gives foreign connections"]`

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 503 })
  }
  try {
    const { text } = await req.json()
    if (!text?.trim()) return NextResponse.json({ error: 'text required' }, { status: 400 })

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: 'user', content: `Text:\n"${text}"` }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '[]'

    let dictums: string[] = []
    try {
      dictums = JSON.parse(raw)
    } catch {
      const match = raw.match(/\[[\s\S]*\]/)
      if (match) dictums = JSON.parse(match[0])
    }

    if (!Array.isArray(dictums)) dictums = []

    return NextResponse.json({ dictums })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to parse' }, { status: 500 })
  }
}
