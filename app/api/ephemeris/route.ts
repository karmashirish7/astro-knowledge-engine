import { NextRequest, NextResponse } from 'next/server'
import { calculateChart, parseTimezone, localToUTC } from '@/lib/astrology'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { date, time, timezone, lat, lon } = await req.json()

    if (!date || !time || lat == null || lon == null) {
      return NextResponse.json({ error: 'date, time, lat, lon are required' }, { status: 400 })
    }

    const [year, month, day] = date.split('-').map(Number)
    const tzOffset = parseTimezone(timezone || '+00:00')
    const { utcHour, dayOffset } = localToUTC(time, tzOffset)

    const result = calculateChart({ year, month, day: day + dayOffset, utcHour, lat: Number(lat), lon: Number(lon) })
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = (err as Error).message
    console.error('[ephemeris]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
