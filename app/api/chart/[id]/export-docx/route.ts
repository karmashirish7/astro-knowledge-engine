import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  PageBreak, Header, Footer,
} from 'docx'

const HOUSE_SANSKRIT = [
  'Lagna','Dhana','Sahaja','Sukha','Putra','Ripu',
  'Yuvati','Randhra','Dharma','Karma','Labha','Vyaya',
]

const STANDARD_SECTIONS = [
  { id: 'panchang',    label: 'Panchang' },
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `house${i + 1}`,
    label: `H${i + 1} · ${HOUSE_SANSKRIT[i]}`,
  })),
  { id: 'vargas',      label: 'Divisional Charts' },
  { id: 'dasha-viz',   label: 'Dasha Timeline' },
  { id: 'events',      label: 'Life Events' },
  { id: 'activations', label: 'Activations' },
]

// Purple brand colour
const PURPLE = '7C3AED'
const LIGHT_PURPLE = 'EDE9FE'
const DARK = '1A1A2E'

function heading2(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'C4B5FD', space: 4 } },
    run: { color: PURPLE, bold: true, size: 22 },
  })
}

function bodyText(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, color: DARK })],
    spacing: { after: 80 },
  })
}

function planetTable(calc: any): Table | null {
  if (!calc?.planets) return null

  const headerRow = new TableRow({
    tableHeader: true,
    children: ['Graha', 'Position', 'House'].map(h =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: PURPLE, size: 20 })] })],
        shading: { type: ShadingType.SOLID, color: LIGHT_PURPLE },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
      })
    ),
  })

  const dataRows: TableRow[] = []

  // Lagna row
  dataRows.push(new TableRow({
    children: [
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Lagna', bold: true, color: PURPLE, size: 20 })] })], margins: { top: 60, bottom: 60, left: 120, right: 120 } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: calc.lagna?.formatted ?? '', size: 20 })] })], margins: { top: 60, bottom: 60, left: 120, right: 120 } }),
      new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '—', size: 20 })] })], margins: { top: 60, bottom: 60, left: 120, right: 120 } }),
    ],
  }))

  for (const [graha, pos] of Object.entries(calc.planets as Record<string, any>)) {
    const h = calc.houseNumbers?.[graha] ?? '?'
    dataRows.push(new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: graha, size: 20 })] })], margins: { top: 60, bottom: 60, left: 120, right: 120 } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: pos.formatted ?? '', size: 20 })] })], margins: { top: 60, bottom: 60, left: 120, right: 120 } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `H${h} · ${HOUSE_SANSKRIT[(Number(h) - 1) % 12] ?? ''}`, size: 20 })] })], margins: { top: 60, bottom: 60, left: 120, right: 120 } }),
      ],
    }))
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  })
}

async function _GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const chart = await prisma.chart.findUnique({
    where: { id },
    include: {
      chartNotes:   { orderBy: { order: 'asc' } },
      observations: { orderBy: { createdAt: 'asc' } },
      predictions:  { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!chart) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const calc       = (() => { try { return JSON.parse(chart.calculatedPositions || '{}') } catch { return null } })()
  const hasPrecise = !!(calc?.lagna?.longitude && calc?.planets)
  const tags:     string[] = (() => { try { return JSON.parse(chart.tagsList  || '[]') } catch { return [] } })()
  const keywords: string[] = (() => { try { return JSON.parse(chart.keywords  || '[]') } catch { return [] } })()
  const noteMap: Record<string, string> = {}
  for (const n of chart.chartNotes) noteMap[n.section] = n.content

  const children: (Paragraph | Table)[] = []

  // ── Title block ──
  children.push(new Paragraph({
    children: [new TextRun({ text: chart.name, bold: true, size: 56, color: DARK })],
    heading: HeadingLevel.TITLE,
    spacing: { after: 120 },
  }))

  const metaParts = [chart.birthDate, chart.birthTime, chart.timezone, chart.birthPlace].filter(Boolean)
  if (metaParts.length) {
    children.push(new Paragraph({
      children: [new TextRun({ text: metaParts.join(' · '), size: 22, color: '555555' })],
      spacing: { after: 80 },
    }))
  }
  if (chart.birthLat) {
    children.push(new Paragraph({
      children: [new TextRun({ text: `Lat ${chart.birthLat} · Lon ${chart.birthLon}`, size: 20, color: '888888' })],
      spacing: { after: 80 },
    }))
  }
  if (tags.length || keywords.length) {
    const tagStr = [...tags.map(t => `[${t}]`), ...keywords.map(k => `{${k}}`)].join('  ')
    children.push(new Paragraph({
      children: [new TextRun({ text: tagStr, size: 20, color: PURPLE })],
      spacing: { after: 200 },
    }))
  }

  // ── Planetary positions ──
  if (hasPrecise) {
    children.push(heading2('Planetary Positions · Lahiri Sidereal'))
    const tbl = planetTable(calc)
    if (tbl) children.push(tbl)
    children.push(new Paragraph({
      children: [new TextRun({ text: `Ayanamsa ${parseFloat(calc.ayanamsa ?? 0).toFixed(4)}° · Mean nodes · Geocentric`, size: 18, color: '888888', italics: true })],
      spacing: { before: 80, after: 200 },
    }))
  }

  // ── Notes sections ──
  const standardIds = new Set(STANDARD_SECTIONS.map(s => s.id))
  const customNotes = chart.chartNotes.filter(n => !standardIds.has(n.section))
  const allSections = [...STANDARD_SECTIONS, ...customNotes.map(n => ({ id: n.section, label: n.section }))]

  for (const sec of allSections) {
    const content = noteMap[sec.id]?.trim()
    if (!content) continue
    children.push(heading2(sec.label))
    for (const line of content.split('\n')) {
      children.push(bodyText(line))
    }
  }

  // ── Observations ──
  const obs = chart.observations ?? []
  if (obs.length > 0) {
    children.push(heading2('Observations'))
    const headerRow = new TableRow({
      tableHeader: true,
      children: ['Status', 'Observation', 'Date'].map(h =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: PURPLE, size: 20 })] })],
          shading: { type: ShadingType.SOLID, color: LIGHT_PURPLE },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
        })
      ),
    })
    const dataRows = obs.map((o: any) => new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: o.status ?? '', size: 20, bold: true })] })], margins: { top: 60, bottom: 60, left: 120, right: 120 } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: o.statement ?? '', size: 20 })] })], margins: { top: 60, bottom: 60, left: 120, right: 120 } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '', size: 20, color: '888888' })] })], margins: { top: 60, bottom: 60, left: 120, right: 120 } }),
      ],
    }))
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] }))
    children.push(new Paragraph({ spacing: { after: 160 } }))
  }

  // ── Predictions ──
  const preds = chart.predictions ?? []
  if (preds.length > 0) {
    children.push(heading2('Predictions'))
    const headerRow = new TableRow({
      tableHeader: true,
      children: ['Prediction', 'Target Date', 'Outcome', 'Dasha Context'].map(h =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: PURPLE, size: 20 })] })],
          shading: { type: ShadingType.SOLID, color: LIGHT_PURPLE },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
        })
      ),
    })
    const dataRows = preds.map((p: any) => new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: p.prediction ?? '', size: 20 })] })], margins: { top: 60, bottom: 60, left: 120, right: 120 } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: p.targetDate ? new Date(p.targetDate).toLocaleDateString() : '', size: 20 })] })], margins: { top: 60, bottom: 60, left: 120, right: 120 } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: p.outcome ?? 'pending', size: 20, bold: true })] })], margins: { top: 60, bottom: 60, left: 120, right: 120 } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: p.dashaContext ?? '', size: 20, color: '6D28D9' })] })], margins: { top: 60, bottom: 60, left: 120, right: 120 } }),
      ],
    }))
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] }))
  }

  const doc = new Document({
    creator: 'Akashvani Engine',
    title: `${chart.name} — Chart Analysis`,
    description: `Chart export for ${chart.name}`,
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22, color: DARK } },
        heading2: { run: { color: PURPLE, bold: true, size: 24 }, paragraph: { spacing: { before: 300, after: 120 } } },
      },
    },
    sections: [{
      properties: { page: { margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } },
      headers: {
        default: new Header({
          children: [new Paragraph({
            children: [new TextRun({ text: `${chart.name} · Akashvani Engine`, size: 18, color: '888888' })],
            alignment: AlignmentType.RIGHT,
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            children: [new TextRun({ text: `Exported ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, size: 18, color: '888888' })],
            alignment: AlignmentType.CENTER,
          })],
        }),
      },
      children,
    }],
  })

  const buffer = await Packer.toBuffer(doc)
  const filename = `${chart.name.replace(/[^a-z0-9]/gi, '_')}_chart.docx`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    return await _GET(req, ctx)
  } catch (err) {
    console.error('[export-docx] failed:', err)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
