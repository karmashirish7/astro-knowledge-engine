/** Parse timezone string like "+05:45" or "-05:30" into decimal hours */
export function parseTimezone(tz: string): number {
  const m = tz.match(/^([+-])(\d{1,2}):(\d{2})$/)
  if (!m) return 0
  const sign = m[1] === '+' ? 1 : -1
  return sign * (parseInt(m[2]) + parseInt(m[3]) / 60)
}

/** Convert local time string "HH:MM[:SS]" + timezone offset → UTC decimal hour.
 *  Returns { utcHour, dayOffset } where dayOffset is -1, 0, or +1 */
export function localToUTC(timeStr: string, tzOffset: number): { utcHour: number; dayOffset: number } {
  const parts = timeStr.split(':').map(Number)
  const localHour = parts[0] + (parts[1] || 0) / 60 + (parts[2] || 0) / 3600
  let utcHour = localHour - tzOffset
  let dayOffset = 0
  if (utcHour < 0)   { utcHour += 24; dayOffset = -1 }
  if (utcHour >= 24) { utcHour -= 24; dayOffset = 1 }
  return { utcHour, dayOffset }
}
