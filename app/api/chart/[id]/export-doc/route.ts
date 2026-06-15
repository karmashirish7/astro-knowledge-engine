import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { computeDivisional, VARGAS } from '@/lib/astrology/divisional'

// ── Shared geometry (mirrors NorthIndianKundali.tsx) ──────────────────────

const PLANET_ABBR: Record<string, string> = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me',
  Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke',
}
const PLANET_COLORS: Record<string, string> = {
  Sun: '#F59E0B', Moon: '#CBD5E1', Mars: '#EF4444',
  Mercury: '#10B981', Jupiter: '#F97316', Venus: '#EC4899',
  Saturn: '#6366F1', Rahu: '#8B5CF6', Ketu: '#78716C',
}

const POLYGONS: Record<number, string> = {
  1:  '200,0   300,100  200,200  100,100',
  2:  '0,0     200,0    100,100',
  3:  '0,0     100,100  0,200',
  4:  '100,100 0,200    100,300  200,200',
  5:  '0,400   0,200    100,300',
  6:  '0,400   100,300  200,400',
  7:  '200,200 100,300  200,400  300,300',
  8:  '400,400 200,400  300,300',
  9:  '400,400 300,300  400,200',
  10: '300,100 400,200  300,300  200,200',
  11: '400,0   400,200  300,100',
  12: '400,0   300,100  200,0',
}
const LABEL: Record<number, [number, number]> = {
  1:  [200, 100], 2:  [100,  33], 3:  [ 33, 100],
  4:  [100, 200], 5:  [ 33, 300], 6:  [100, 367],
  7:  [200, 300], 8:  [300, 367], 9:  [367, 300],
  10: [300, 200], 11: [367, 100], 12: [300,  33],
}

const HOUSE_SANSKRIT = [
  'Lagna','Dhana','Sahaja','Sukha','Putra','Ripu',
  'Yuvati','Randhra','Dharma','Karma','Labha','Vyaya',
]

// ── SVG renderer ─────────────────────────────────────────────────────────

function renderKundaliSVG(
  lagna: number,
  planets: Record<string, number>,
  planetDegrees: Record<string, number> = {},
  size = 320,
): string {
  const signInHouse = (h: number) => ((lagna - 1 + h - 1) % 12) + 1
  const planetsInHouse = (h: number) =>
    Object.entries(planets).filter(([, hh]) => hh === h).map(([p]) => p)

  let s = `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" style="display:block;border-radius:8px">`
  s += `<rect width="400" height="400" fill="#F1F5F9" rx="6"/>`

  for (const [h, pts] of Object.entries(POLYGONS)) {
    const house = parseInt(h)
    const fill  = house === 1 ? 'rgba(124,58,237,0.12)' : 'transparent'
    s += `<polygon points="${pts}" fill="${fill}" stroke="#CBD5E1" stroke-width="1"/>`
  }

  s += `<rect width="400" height="400" fill="none" stroke="#CBD5E1" stroke-width="1.5" rx="6"/>`

  for (let house = 1; house <= 12; house++) {
    const [lx, ly] = LABEL[house]
    const sign     = signInHouse(house)
    const ps       = planetsInHouse(house)
    const isLagna  = house === 1
    const lineH    = 12
    const startY   = ly - ((1 + ps.length) * lineH) / 2

    s += `<text x="${lx}" y="${startY + lineH * 0.5}" text-anchor="middle" dominant-baseline="middle" fill="${isLagna ? '#7C3AED' : '#94A3B8'}" font-size="${isLagna ? 12 : 11}" font-weight="${isLagna ? 700 : 600}" font-family="monospace">${sign}</text>`

    ps.forEach((planet, pi) => {
      const deg   = planetDegrees[planet]
      const label = deg !== undefined
        ? `${PLANET_ABBR[planet] ?? planet.slice(0, 2)} ${Math.floor(deg)}°`
        : PLANET_ABBR[planet] ?? planet.slice(0, 2)
      const color = PLANET_COLORS[planet] ?? '#94A3B8'
      s += `<text x="${lx}" y="${startY + lineH * (1.5 + pi)}" text-anchor="middle" dominant-baseline="middle" fill="${color}" font-size="10" font-weight="700" font-family="monospace">${label}</text>`
    })
  }

  s += `</svg>`
  return s
}

// ── HTML helpers ──────────────────────────────────────────────────────────

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function planetsTableHtml(calc: any): string {
  if (!calc?.planets) return ''
  let rows = `<tr class="lagna-row"><td><strong>Lagna</strong></td><td>${esc(calc.lagna?.formatted ?? '')}</td><td>—</td></tr>`
  for (const [graha, pos] of Object.entries(calc.planets as Record<string, any>)) {
    const h = calc.houseNumbers?.[graha] ?? '?'
    rows += `<tr><td>${esc(graha)}</td><td>${esc(pos.formatted)}</td><td>H${h} · ${HOUSE_SANSKRIT[(Number(h) - 1) % 12] ?? ''}</td></tr>`
  }
  return `
  <section>
    <h2>Planetary Positions · Lahiri Sidereal</h2>
    <table>
      <thead><tr><th>Graha</th><th>Position</th><th>House</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="footnote">Ayanamsa ${parseFloat(calc.ayanamsa ?? 0).toFixed(4)}° · Mean nodes · Geocentric</p>
  </section>`
}

// ── Route handler ─────────────────────────────────────────────────────────

async function _GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const chart = await prisma.chart.findUnique({
    where: { id },
    include: {
      chartNotes:    { orderBy: { order: 'asc' } },
      observations:  { orderBy: { createdAt: 'asc' } },
      predictions:   { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!chart) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const calc      = (() => { try { return JSON.parse(chart.calculatedPositions || '{}') } catch { return null } })()
  const hasPrecise = !!(calc?.lagna?.longitude && calc?.planets)
  const tags:     string[] = (() => { try { return JSON.parse(chart.tagsList  || '[]') } catch { return [] } })()
  const keywords: string[] = (() => { try { return JSON.parse(chart.keywords  || '[]') } catch { return [] } })()

  // D1 chart data
  const d1Lagna   = parseInt(chart.lagna) || 1
  const d1Planets: Record<string, number> = hasPrecise
    ? Object.fromEntries(Object.entries(calc.houseNumbers ?? {}).map(([k, v]) => [k, v as number]))
    : (calc?.houseNumbers ?? {})
  const d1Degrees: Record<string, number> = hasPrecise
    ? Object.fromEntries(Object.entries(calc.planets ?? {}).map(([k, v]: [string, any]) => [k, v.degrees as number]))
    : {}

  const d1Svg = renderKundaliSVG(d1Lagna, d1Planets, d1Degrees)

  // D9 chart data
  let d9Svg = ''
  if (hasPrecise) {
    const d9 = computeDivisional(calc, 9)
    if (d9) d9Svg = renderKundaliSVG(d9.lagna, d9.planets, d9.planetDegrees)
  }

  // Notes sections (only those with content)
  const STANDARD_SECTIONS = [
    { id: 'panchang',    label: 'Panchang'          },
    ...Array.from({ length: 12 }, (_, i) => ({
      id: `house${i + 1}`,
      label: `H${i + 1} · ${HOUSE_SANSKRIT[i]}`,
    })),
    { id: 'vargas',      label: 'Divisional Charts' },
    { id: 'dasha-viz',   label: 'Dasha Timeline'    },
    { id: 'events',      label: 'Life Events'       },
    { id: 'activations', label: 'Activations'       },
  ]
  const standardIds = new Set(STANDARD_SECTIONS.map(s => s.id))
  const customNotes = chart.chartNotes.filter(n => !standardIds.has(n.section))
  const noteMap: Record<string, string> = {}
  for (const n of chart.chartNotes) noteMap[n.section] = n.content

  let notesSectionsHtml = ''
  for (const sec of [...STANDARD_SECTIONS, ...customNotes.map(n => ({ id: n.section, label: n.section }))]) {
    const content = noteMap[sec.id]?.trim()
    if (!content) continue
    notesSectionsHtml += `
    <section>
      <h2>${esc(sec.label)}</h2>
      <div class="note-content">${esc(content)}</div>
    </section>`
  }

  // Observations (structured)
  let observationsHtml = ''
  const obs = (chart as any).observations ?? []
  if (obs.length > 0) {
    const statusColor: Record<string, string> = {
      TRUE: '#059669', FALSE: '#DC2626', UNCLEAR: '#D97706', PENDING: '#6366F1',
    }
    const rows = obs.map((o: any) =>
      `<tr>
        <td><span class="badge" style="background:${statusColor[o.status] ?? '#6B7280'}20;color:${statusColor[o.status] ?? '#6B7280'};border:1px solid ${statusColor[o.status] ?? '#6B7280'}40">${esc(o.status)}</span></td>
        <td>${esc(o.statement ?? '')}</td>
        <td class="date-cell">${o.createdAt ? new Date(o.createdAt).toLocaleDateString() : ''}</td>
      </tr>`
    ).join('')
    observationsHtml = `
    <section>
      <h2>Observations</h2>
      <table>
        <thead><tr><th style="width:90px">Status</th><th>Observation</th><th style="width:100px">Date</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`
  }

  // Predictions (structured)
  let predictionsHtml = ''
  const preds = (chart as any).predictions ?? []
  if (preds.length > 0) {
    const rows = preds.map((p: any) =>
      `<tr>
        <td>${esc(p.prediction ?? '')}</td>
        <td>${esc(p.targetDate ? new Date(p.targetDate).toLocaleDateString() : '')}</td>
        <td>${esc(p.outcome ?? 'pending')}</td>
      </tr>`
    ).join('')
    predictionsHtml = `
    <section>
      <h2>Predictions</h2>
      <table>
        <thead><tr><th>Prediction</th><th>Target Date</th><th>Outcome</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`
  }

  const exportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(chart.name)} — Chart Analysis</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Georgia, 'Times New Roman', serif;
      max-width: 900px;
      margin: 48px auto;
      padding: 0 32px;
      color: #1a1a2e;
      background: #ffffff;
      line-height: 1.7;
      font-size: 15px;
    }
    /* Header */
    .doc-header { margin-bottom: 32px; }
    .doc-header h1 { font-size: 2em; color: #1a1a2e; margin: 0 0 6px; font-weight: 800; letter-spacing: -0.02em; }
    .doc-header .meta { color: #555; font-size: 0.9em; margin: 2px 0; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
    .chip { padding: 3px 11px; border-radius: 99px; font-size: 0.76em; font-weight: 700; letter-spacing: 0.02em; }
    .chip-tag { background: #10b98115; color: #047857; border: 1px solid #10b98130; }
    .chip-kw  { background: #7c3aed15; color: #6d28d9; border: 1px solid #7c3aed30; }
    hr.rule { border: none; border-top: 2px solid #7c3aed; margin: 28px 0; }

    /* Charts row */
    .charts-row { display: flex; gap: 40px; margin: 28px 0; align-items: flex-start; flex-wrap: wrap; }
    .chart-box { flex: 1; min-width: 260px; text-align: center; }
    .chart-title { font-size: 0.75em; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 10px; }
    .d1-title { color: #7c3aed; }
    .d9-title { color: #059669; }

    /* Sections */
    section { margin: 32px 0; page-break-inside: avoid; }
    section h2 {
      font-size: 1em;
      font-weight: 700;
      color: #7c3aed;
      border-bottom: 1px solid #e8e0ff;
      padding-bottom: 7px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    /* Positions table */
    table { width: 100%; border-collapse: collapse; font-size: 0.88em; }
    th { background: #f4f0ff; color: #5b21b6; padding: 8px 14px; text-align: left; font-weight: 700; font-size: 0.82em; text-transform: uppercase; letter-spacing: 0.05em; }
    td { padding: 7px 14px; border-top: 1px solid #ede9fe; vertical-align: top; }
    tr.lagna-row td { color: #5b21b6; font-weight: 600; background: #f4f0ff; }
    tr:nth-child(even) td { background: #faf9ff; }
    .footnote { font-size: 0.78em; color: #888; margin-top: 8px; font-style: italic; }

    /* Note content */
    .note-content {
      white-space: pre-wrap;
      font-family: 'Courier New', 'Lucida Console', monospace;
      font-size: 0.86em;
      background: #faf9ff;
      padding: 14px 18px;
      border-radius: 6px;
      border-left: 3px solid #c4b5fd;
      color: #1a1a2e;
      line-height: 1.6;
    }

    /* Observations / predictions badge */
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 99px;
      font-size: 0.75em;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .date-cell { color: #888; font-size: 0.85em; white-space: nowrap; }

    /* Footer */
    .doc-footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e0e0e0; font-size: 0.75em; color: #999; }

    @media print {
      body { margin: 24px; padding: 0; font-size: 13px; }
      section { page-break-inside: avoid; }
      .charts-row { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

  <div class="doc-header">
    <h1>${esc(chart.name)}</h1>
    <p class="meta">${esc(chart.birthDate ?? '')} · ${esc(chart.birthTime ?? '')} ${esc(chart.timezone ?? '')} · ${esc(chart.birthPlace ?? '')}</p>
    ${chart.birthLat ? `<p class="meta">Lat ${esc(String(chart.birthLat))} · Lon ${esc(String(chart.birthLon))}</p>` : ''}
    ${tags.length || keywords.length ? `
    <div class="chips">
      ${tags.map(t => `<span class="chip chip-tag">${esc(t)}</span>`).join('')}
      ${keywords.map(k => `<span class="chip chip-kw">${esc(k)}</span>`).join('')}
    </div>` : ''}
  </div>

  <hr class="rule">

  <div class="charts-row">
    <div class="chart-box">
      <div class="chart-title d1-title">D1 · Rasi</div>
      ${d1Svg}
    </div>
    ${d9Svg ? `
    <div class="chart-box">
      <div class="chart-title d9-title">D9 · Navamsa</div>
      ${d9Svg}
    </div>` : ''}
  </div>

  ${hasPrecise ? planetsTableHtml(calc) : ''}

  ${notesSectionsHtml || ''}
  ${observationsHtml}
  ${predictionsHtml}

  ${!notesSectionsHtml && !observationsHtml && !predictionsHtml
    ? '<p style="color:#888;font-style:italic;margin-top:32px">No notes recorded yet.</p>'
    : ''}

  <div class="doc-footer">
    Astro Knowledge Engine · Exported ${exportDate}
    ${hasPrecise ? ` · Ayanamsa ${parseFloat(calc.ayanamsa ?? 0).toFixed(4)}° Lahiri · Mean nodes · Geocentric` : ''}
  </div>

</body>
</html>`

  const filename = `${chart.name.replace(/[^a-z0-9]/gi, '_')}_chart.html`
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

// Wrap the real handler so errors surface in server logs
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    return await _GET(req, ctx)
  } catch (err) {
    console.error('[export-doc] failed:', err)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
