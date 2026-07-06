// Deterministic safety net for the Dasha Lab chat extraction step. The LLM
// extraction call is flexible but can occasionally miss a mention (model
// flakiness, an odd phrasing, a dropped API call) and fail silently — when
// that happens the chat would otherwise ask the researcher for raw birth
// data even though the chart is already saved. This module re-scans the raw
// message with plain string/regex matching so a known chart name + a
// recognizable date never gets lost just because the LLM had an off turn.
import type { ForeignCategory } from './foreignDasha'

export function findKnownChartInText(text: string, charts: { id: string; name: string }[]): { id: string; name: string } | null {
  const lower = text.toLowerCase()
  let best: { id: string; name: string } | null = null
  let bestScore = 0
  for (const c of charts) {
    const name = c.name.toLowerCase().trim()
    if (!name) continue
    if (lower.includes(name)) {
      if (name.length > bestScore) { bestScore = name.length; best = c }
      continue
    }
    const words = name.split(/\s+/).filter(Boolean)
    if (words.length > 1 && words.every(w => lower.includes(w))) {
      const score = words.join('').length
      if (score > bestScore) { bestScore = score; best = c }
    }
  }
  return best
}

// Month-name forms are built directly from the matched parts (not via `new
// Date(...).toISOString()`) — that round-trip shifts the date by a day
// whenever the server's local timezone is behind UTC.
const MONTH_NUM: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
}
const MONTHS = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec'

export function parseDateLoose(text: string): string | null {
  let m = text.match(/\b(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})\b/)
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`

  m = text.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\b/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`

  m = text.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTHS})[a-z]*\\.?,?\\s+(\\d{4})\\b`, 'i'))
  if (m) {
    const mon = MONTH_NUM[m[2].toLowerCase().slice(0, 3)]
    if (mon) return `${m[3]}-${mon}-${m[1].padStart(2, '0')}`
  }
  m = text.match(new RegExp(`\\b(${MONTHS})[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, 'i'))
  if (m) {
    const mon = MONTH_NUM[m[1].toLowerCase().slice(0, 3)]
    if (mon) return `${m[3]}-${mon}-${m[2].padStart(2, '0')}`
  }
  // "2017 oct 29" / "2017 october 29th" — year-first, used in quick follow-ups.
  m = text.match(new RegExp(`\\b(\\d{4})\\s+(${MONTHS})[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'i'))
  if (m) {
    const mon = MONTH_NUM[m[2].toLowerCase().slice(0, 3)]
    if (mon) return `${m[1]}-${mon}-${m[3].padStart(2, '0')}`
  }
  return null
}

/** A standalone 4-digit year ("...running in 2017") with no day/month attached — only used when parseDateLoose found nothing, so a full date is never misread as a bare year. */
export function parseYearLoose(text: string): number | null {
  const m = text.match(/\b(19[0-9]{2}|20[0-9]{2}|21[0-9]{2})\b/)
  if (!m) return null
  const year = parseInt(m[1], 10)
  const currentYear = new Date().getFullYear()
  if (year < 1900 || year > currentYear + 120) return null
  return year
}

export function detectEventTypeLoose(text: string): ForeignCategory {
  const t = text.toLowerCase()
  if (/\b(study|studies|college|university|scholarship|admission|masters|phd|degree)\b/.test(t)) return 'foreign-study'
  if (/\b(job|employment|work|hired|transferred|posting|career|office|salary)\b/.test(t)) return 'foreign-employment'
  return 'foreign-travel'
}
