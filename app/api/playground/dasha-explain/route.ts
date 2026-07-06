import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { deserializeDashaTree, getCurrentDasha } from '@/lib/astrology/dasha'
import {
  FOREIGN_CATEGORIES, FOREIGN_CATEGORY_LABELS, parseForeignConditions, matchForeignRule,
  defaultConditionsFromActive, type ForeignCategory, type ActiveDashaPlanets,
} from '@/lib/astrology/knowledge/foreignDasha'
import { buildHouseLayers } from '@/lib/astrology/knowledge/factSheet'

const STRENGTH_RANK: Record<string, number> = { Strong: 3, Conditional: 2, Exception: 1 }

// Explains WHY a given dasha may have produced a foreign travel/study/employment
// event, strictly from the stored knowledge base (Dictums in the matching
// category). If nothing matches, it says so explicitly rather than guessing.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { chartId, date, category } = await req.json()
    if (!chartId || !date) return NextResponse.json({ error: 'chartId and date are required' }, { status: 400 })
    const cat: ForeignCategory = FOREIGN_CATEGORIES.includes(category) ? category : 'foreign-travel'

    const refDate = new Date(date)
    if (isNaN(refDate.getTime())) return NextResponse.json({ error: 'Could not parse that date' }, { status: 400 })

    const chart = await prisma.chart.findUnique({
      where: { id: chartId },
      select: { id: true, name: true, userId: true, calculatedPositions: true },
    })
    if (!chart) return NextResponse.json({ error: 'Chart not found' }, { status: 404 })
    if (chart.userId && chart.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const pd = await prisma.planetaryData.findUnique({ where: { chartId } })
    if (!pd?.dashaJson || pd.dashaJson === '{}' || pd.dashaJson === '[]') {
      return NextResponse.json({ error: 'No dasha data for this chart' }, { status: 400 })
    }
    const tree = deserializeDashaTree(pd.dashaJson)
    const current = getCurrentDasha(tree, refDate)
    if (!current) return NextResponse.json({ error: 'Date falls outside the dasha window' }, { status: 400 })

    const active: ActiveDashaPlanets = {
      mahadasha: current.mahadasha.planet,
      antardasha: current.antardasha.planet,
      pratyantardasha: current.pratyantardasha.planet,
    }

    let calc: { lagnaSign?: number; houseNumbers?: Record<string, number> } = {}
    try { calc = JSON.parse(chart.calculatedPositions || '{}') } catch { /* ignore */ }
    const lagnaSign = calc.lagnaSign ?? 1
    const houses = buildHouseLayers(calc)

    const dictums = await prisma.dictum.findMany({ where: { category: cat }, orderBy: { createdAt: 'asc' } })

    const matches = dictums
      .map(d => {
        const cond = parseForeignConditions(d.conditionsJson)
        const result = matchForeignRule(cond, active, lagnaSign, houses)
        return result.matched ? { dictum: d, triggeredBy: result.triggeredBy } : null
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => (STRENGTH_RANK[b.dictum.strength] ?? 0) - (STRENGTH_RANK[a.dictum.strength] ?? 0))

    if (matches.length === 0) {
      return NextResponse.json({
        found: false,
        category: cat,
        categoryLabel: FOREIGN_CATEGORY_LABELS[cat],
        active,
        message: `I don't have a rule in the ${FOREIGN_CATEGORY_LABELS[cat]} knowledge base that explains ${active.mahadasha} Mahadasha → ${active.antardasha} Antardasha → ${active.pratyantardasha} Pratyantardasha. What's the rule?`,
        suggestedConditions: defaultConditionsFromActive(active),
      })
    }

    return NextResponse.json({
      found: true,
      category: cat,
      categoryLabel: FOREIGN_CATEGORY_LABELS[cat],
      active,
      matches: matches.map(m => ({
        id: m.dictum.id,
        rule: m.dictum.rule,
        interpretation: m.dictum.interpretation,
        strength: m.dictum.strength,
        source: m.dictum.source,
        triggeredBy: m.triggeredBy,
      })),
    })
  } catch (err) {
    console.error('[playground/dasha-explain]', err)
    return NextResponse.json({ error: 'Explain failed' }, { status: 500 })
  }
}
