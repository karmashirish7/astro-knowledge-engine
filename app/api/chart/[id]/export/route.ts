import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { SIGN_NAMES } from '@/lib/astrology'

const HOUSE_SANSKRIT = ['Lagna','Dhana','Sahaja','Sukha','Putra','Ripu','Yuvati','Randhra','Dharma','Karma','Labha','Vyaya']

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const chart = await prisma.chart.findUnique({
    where: { id },
    include: { chartNotes: { orderBy: { order: 'asc' } } },
  })
  if (!chart) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const calc = (() => { try { return JSON.parse(chart.calculatedPositions) } catch { return null } })()
  const tags: string[] = (() => { try { return JSON.parse(chart.tagsList) } catch { return [] } })()
  const keywords: string[] = (() => { try { return JSON.parse(chart.keywords) } catch { return [] } })()

  const lines: string[] = []

  lines.push(`# ${chart.name} — Chart Analysis`)
  lines.push('')
  lines.push(`**Date:** ${chart.birthDate}  **Time:** ${chart.birthTime}  **TZ:** ${chart.timezone}`)
  lines.push(`**Place:** ${chart.birthPlace}  **Lat:** ${chart.birthLat}  **Lon:** ${chart.birthLon}`)
  if (tags.length)     lines.push(`**Tags:** ${tags.join(', ')}`)
  if (keywords.length) lines.push(`**Keywords:** ${keywords.join(', ')}`)
  lines.push('')

  if (calc && calc.lagna) {
    lines.push('## Planetary Positions (Lahiri Sidereal)')
    lines.push('')
    lines.push('| Graha | Position | House |')
    lines.push('|-------|----------|-------|')
    const lagnaSign = calc.lagnaSign || 1
    lines.push(`| **Lagna** | ${calc.lagna?.formatted ?? ''} | — |`)
    for (const [graha, pos] of Object.entries(calc.planets ?? {})) {
      const p = pos as any
      const houseNum = calc.houseNumbers?.[graha] ?? '?'
      lines.push(`| ${graha} | ${p.formatted} | ${houseNum} (${HOUSE_SANSKRIT[(houseNum-1)%12]}) |`)
    }
    lines.push('')
    lines.push(`**Ayanamsa (Lahiri):** ${parseFloat(calc.ayanamsa ?? 0).toFixed(4)}°`)
    lines.push('')
  }

  // Group notes by section
  const noteMap: Record<string, string> = {}
  for (const n of chart.chartNotes) noteMap[n.section] = n.content

  const standardSections = [
    { id: 'panchang',    label: 'Panchang' },
    ...Array.from({ length: 12 }, (_, i) => ({
      id: `house${i + 1}`,
      label: `House ${i + 1} — ${HOUSE_SANSKRIT[i]}`,
    })),
    { id: 'dasha',       label: 'Dasha Timeline' },
    { id: 'events',      label: 'Life Events' },
    { id: 'activations', label: 'Activations' },
    { id: 'predictions', label: 'Predictions' },
  ]

  // Custom sections
  const standardIds = new Set(standardSections.map(s => s.id))
  const customNotes = chart.chartNotes.filter(n => !standardIds.has(n.section))

  for (const sec of standardSections) {
    const content = noteMap[sec.id]
    if (!content) continue
    lines.push(`## ${sec.label}`)
    lines.push('')
    lines.push(content)
    lines.push('')
  }

  for (const n of customNotes) {
    lines.push(`## ${n.section}`)
    lines.push('')
    lines.push(n.content)
    lines.push('')
  }

  const markdown = lines.join('\n')
  const filename = `${chart.name.replace(/[^a-z0-9]/gi, '_')}_chart.md`

  return new NextResponse(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
