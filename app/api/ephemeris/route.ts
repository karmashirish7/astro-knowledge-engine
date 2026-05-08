import { NextRequest, NextResponse } from 'next/server'
import { calculateChart, parseTimezone, localToUTC } from '@/lib/astrology'

/**
 * POST /api/ephemeris
 * Body: { date, time, timezone, lat, lon }
 * date: "YYYY-MM-DD"
 * time: "HH:MM:SS" (local time)
 * timezone: "+05:45" or "-05:30" etc.
 * lat: number (N positive)
 * lon: number (E positive)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { date, time, timezone, lat, lon } = body

    if (!date || !time || !lat || !lon) {
      return NextResponse.json({ error: 'date, time, lat, lon are required' }, { status: 400 })
    }

    const [year, month, day] = date.split('-').map(Number)
    const tzOffset = parseTimezone(timezone || '+00:00')
    const { utcHour, dayOffset } = localToUTC(time, tzOffset)

    const adjDay = day + dayOffset

    const result = calculateChart({ year, month, day: adjDay, utcHour, lat: Number(lat), lon: Number(lon) })

    return NextResponse.json({
      input: { date, time, timezone, lat, lon, utcHour: utcHour.toFixed(6) },
      jd: result.jd,
      ayanamsa: result.ayanamsa.toFixed(6),
      lagnaSign: result.lagnaSign,
      lagna: result.lagna,
      planets: result.planets,
      houseNumbers: result.houseNumbers,
    })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message || 'Calculation failed' }, { status: 500 })
  }
}
