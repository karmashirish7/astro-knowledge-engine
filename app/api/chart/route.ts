import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateChart, parseTimezone, localToUTC } from '@/lib/astrology'
import { flattenToPlanetaryData } from '@/lib/planetary-data'
import { withPlanets, withPlanetsMany } from '@/lib/chart-response'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const charts = await prisma.chart.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { planetaryData: true },
    })
    return NextResponse.json(withPlanetsMany(charts))
  } catch {
    return NextResponse.json({ error: 'Failed to fetch charts' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      name, gender, birthDate, birthTime, birthPlace,
      birthLat, birthLon, timezone,
      source, reliability, notes, keywords, tagsList,
    } = body

    let calc = null
    let calcError: string | null = null

    if (birthLat && birthLon && birthDate && birthTime) {
      try {
        const [year, month, day] = birthDate.split('-').map(Number)
        const tzOffset = parseTimezone(timezone || '+00:00')
        const { utcHour, dayOffset } = localToUTC(birthTime, tzOffset)
        calc = calculateChart({
          year, month, day: day + dayOffset, utcHour,
          lat: Number(birthLat), lon: Number(birthLon),
        })
      } catch (err: unknown) {
        calcError = (err as Error).message
        console.error('[chart POST] calculation failed:', calcError)
      }
    }

    const chart = await prisma.chart.create({
      data: {
        name,
        gender:              gender     || '',
        birthDate:           birthDate  || '',
        birthTime:           birthTime  || '',
        birthPlace:          birthPlace || '',
        birthLat:            birthLat   || '',
        birthLon:            birthLon   || '',
        timezone:            timezone   || '+05:30',
        lagna:               calc ? String(calc.lagnaSign) : '',
        calculatedPositions: calc ? JSON.stringify(calc) : '{}',
        source:              source     || '',
        reliability:         reliability ?? null,
        notes:               notes      || '',
        keywords:  JSON.stringify(keywords  || []),
        tagsList:  JSON.stringify(tagsList  || []),
      },
      include: { planetaryData: true },
    })

    if (calc) {
      const tzOffset = parseTimezone(timezone || '+00:00')
      const timeStr  = birthTime.length === 5 ? `${birthTime}:00` : birthTime
      const local    = new Date(`${birthDate}T${timeStr}`)
      const birthDateObj = new Date(local.getTime() - tzOffset * 3600000)
      await prisma.planetaryData.create({
        data: flattenToPlanetaryData(chart.id, calc, birthDateObj) as never,
      })
    }

    const response = withPlanets(chart) as Record<string, unknown>
    if (calcError) response._calcError = calcError
    return NextResponse.json(response, { status: 201 })
  } catch (err) {
    console.error('[chart POST] fatal:', err)
    return NextResponse.json({ error: 'Failed to create chart' }, { status: 500 })
  }
}
