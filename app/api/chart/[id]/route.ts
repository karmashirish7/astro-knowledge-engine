import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateChart, parseTimezone, localToUTC } from '@/lib/astrology'
import { flattenToPlanetaryData } from '@/lib/planetary-data'
import { withPlanets } from '@/lib/chart-response'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const chart = await prisma.chart.findUnique({
      where: { id },
      include: {
        planetaryData: true,
        chartNotes: { orderBy: { order: 'asc' } },
      },
    })
    if (!chart) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(withPlanets(chart))
  } catch {
    return NextResponse.json({ error: 'Failed to fetch chart' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    // Recalculate if birth coordinates change
    let calcUpdate: { lagna?: string; calculatedPositions?: string } = {}
    let newCalc = null
    const current = await prisma.chart.findUnique({ where: { id } })
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const lat  = body.birthLat  ?? current.birthLat
    const lon  = body.birthLon  ?? current.birthLon
    const date = body.birthDate ?? current.birthDate
    const time = body.birthTime ?? current.birthTime
    const tz   = body.timezone  ?? current.timezone

    if (lat && lon && date && time) {
      try {
        const [year, month, day] = date.split('-').map(Number)
        const tzOffset = parseTimezone(tz || '+00:00')
        const { utcHour, dayOffset } = localToUTC(time, tzOffset)
        newCalc = calculateChart({
          year, month, day: day + dayOffset, utcHour,
          lat: Number(lat), lon: Number(lon),
        })
        calcUpdate.lagna = String(newCalc.lagnaSign)
        calcUpdate.calculatedPositions = JSON.stringify(newCalc)
      } catch (err) {
        console.error('Ephemeris recalculation failed (non-fatal):', err)
      }
    }

    const chart = await prisma.chart.update({
      where: { id },
      data: {
        name:        body.name        ?? undefined,
        gender:      body.gender      ?? undefined,
        birthDate:   body.birthDate   ?? undefined,
        birthTime:   body.birthTime   ?? undefined,
        birthPlace:  body.birthPlace  ?? undefined,
        birthLat:    body.birthLat    ?? undefined,
        birthLon:    body.birthLon    ?? undefined,
        timezone:    body.timezone    ?? undefined,
        source:      body.source      ?? undefined,
        reliability: body.reliability ?? undefined,
        notes:       body.notes       ?? undefined,
        keywords: body.keywords !== undefined ? JSON.stringify(body.keywords) : undefined,
        tagsList:  body.tagsList  !== undefined ? JSON.stringify(body.tagsList)  : undefined,
        ...calcUpdate,
      },
      include: { planetaryData: true, chartNotes: { orderBy: { order: 'asc' } } },
    })

    if (newCalc) {
      let birthDateObj: Date | undefined
      if (date && time) {
        const tzOffset = parseTimezone(tz || '+00:00')
        const timeStr  = time.length === 5 ? time + ':00' : time
        const local    = new Date(`${date}T${timeStr}`)
        birthDateObj   = new Date(local.getTime() - tzOffset * 3600000)
      }
      await prisma.planetaryData.upsert({
        where:  { chartId: id },
        create: flattenToPlanetaryData(id, newCalc, birthDateObj) as any,
        update: flattenToPlanetaryData(id, newCalc, birthDateObj) as any,
      })
    }

    return NextResponse.json(withPlanets(chart))
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to update chart' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.chart.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete chart' }, { status: 500 })
  }
}
