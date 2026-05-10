import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export async function GET() {
  try {
    const sw = require('swisseph')
    sw.swe_set_sid_mode(sw.SE_SIDM_LAHIRI, 0, 0)
    const jd = sw.swe_julday(1990, 5, 15, 1.0, sw.SE_GREG_CAL)
    const r = sw.swe_calc_ut(jd, sw.SE_SUN, sw.SEFLG_SWIEPH | sw.SEFLG_SIDEREAL)
    return NextResponse.json({ ok: true, sunLon: r.longitude, error: r.error ?? null })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message })
  }
}
