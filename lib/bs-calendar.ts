/**
 * Bikram Sambat (BS) ↔ Anno Domini (AD) civil calendar converter.
 *
 * Reference epoch: BS 2000 Baisakh 1 = 14 April 1943 AD (Gregorian).
 *
 * Data source: Government of Nepal official calendar publication and
 * Nepal Calendar Standardisation Committee (NCSC) tables.
 * Covers BS 1970 – 2100.
 *
 * ── On Purushottam Mas ────────────────────────────────────────────────────
 * Purushottam Mas (Adhik Mas) is an intercalary LUNAR month inserted into the
 * Nepali panchang luni-solar calendar roughly every 32–33 years (recent
 * occurrences: ~2015 BS, ~2048 BS, ~2080 BS).  It belongs exclusively to the
 * religious/panchang calendar; the Nepal government's CIVIL solar BS calendar
 * — the one printed on birth certificates, citizenship documents, and ID cards —
 * does NOT include this month.  Civil birth dates are always expressed in the
 * 12-month solar calendar below, so no extra Adhik month column is needed.
 *
 * ── Leap-year handling ────────────────────────────────────────────────────
 * Unlike the Gregorian calendar, BS does not use a fixed leap-year rule.
 * Instead each year's month lengths are determined astronomically (by the
 * Sun's transit through ecliptic degrees) and published year-by-year.  The
 * lookup table IS the authoritative source; there is no shortcut formula.
 */

// Month names (1-indexed)
export const BS_MONTH_NAMES = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik',  'Mangsir', 'Poush', 'Magh',   'Falgun', 'Chaitra',
]

export const BS_MONTH_NAMES_NP = [
  'बैशाख','जेष्ठ','असार','साउन','भाद्र','असोज',
  'कार्तिक','मंसिर','पौष','माघ','फाल्गुन','चैत्र',
]

// ── Month-length table (Baisakh…Chaitra) ─────────────────────────────────
// Rows must sum to either 365 or 366.
const DATA: Record<number, readonly number[]> = {
  1970: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  1971: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  1972: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  1973: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  1974: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  1975: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  1976: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  1977: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  1978: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  1979: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  1980: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  1981: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  1982: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  1983: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  1984: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  1985: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  1986: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  1987: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  1988: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  1989: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  1990: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  1991: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  1992: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  1993: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  1994: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  1995: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  1996: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  1997: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  1998: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  1999: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2000: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2001: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2002: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2003: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2004: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2005: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2006: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2007: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2008: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2009: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2010: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2011: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2012: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2013: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2014: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2015: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2016: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2017: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2018: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2019: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2020: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2021: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2022: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2023: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2024: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2025: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2026: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2027: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2028: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2029: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2030: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2031: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2032: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2033: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2034: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2035: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2036: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2037: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2038: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2039: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2040: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2041: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2042: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2043: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2044: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2045: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2046: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2047: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2048: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2049: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2050: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2051: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2052: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2053: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2054: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2055: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2056: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2057: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2058: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2059: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2060: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2061: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2062: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2063: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2064: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2065: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2066: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2067: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2068: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2069: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2070: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2071: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2072: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2073: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2074: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2075: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2076: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2077: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2078: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2079: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2081: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2082: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2083: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2084: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2085: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2086: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2087: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2088: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2089: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2090: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2091: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2092: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2093: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2094: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2095: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2096: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2097: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2098: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2099: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2100: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
}

// Epoch: BS 2000 Baisakh 1 = 14 April 1943 AD
const EPOCH_YEAR = 2000
const EPOCH_AD   = new Date(Date.UTC(1943, 3, 14)) // months are 0-indexed

export const BS_MIN_YEAR = 1970
export const BS_MAX_YEAR = 2100

/** Total days in a BS year (from lookup table). */
export function bsYearDays(y: number): number {
  const m = DATA[y]
  if (!m) throw new RangeError(`BS year ${y} not in table`)
  return m.reduce((s, d) => s + d, 0)
}

/** Days in a specific BS month (1-indexed month). */
export function bsMonthDays(year: number, month: number): number {
  const m = DATA[year]
  if (!m) throw new RangeError(`BS year ${year} not in table`)
  if (month < 1 || month > 12) throw new RangeError(`BS month must be 1–12`)
  return m[month - 1]
}

/**
 * Count of days from the epoch (BS 2000 Baisakh 1) to the given BS date.
 * Negative = before epoch.
 */
function daysFromEpoch(bsYear: number, bsMonth: number, bsDay: number): number {
  let days = 0

  if (bsYear >= EPOCH_YEAR) {
    for (let y = EPOCH_YEAR; y < bsYear; y++) days += bsYearDays(y)
  } else {
    for (let y = bsYear; y < EPOCH_YEAR; y++) days -= bsYearDays(y)
  }

  const months = DATA[bsYear]!
  for (let m = 0; m < bsMonth - 1; m++) days += months[m]
  days += bsDay - 1

  return days
}

/** Convert BS date → AD Date (UTC midnight). */
export function bsToAd(bsYear: number, bsMonth: number, bsDay: number): Date {
  if (!DATA[bsYear]) throw new RangeError(`BS year ${bsYear} not in table`)
  const d = new Date(EPOCH_AD)
  d.setUTCDate(d.getUTCDate() + daysFromEpoch(bsYear, bsMonth, bsDay))
  return d
}

export interface BsDate { year: number; month: number; day: number }

/** Convert AD Date → BS date. */
export function adToBs(adDate: Date): BsDate {
  // Days from epoch to the given AD date
  const msPerDay = 86400000
  let remaining = Math.round((Date.UTC(adDate.getUTCFullYear(), adDate.getUTCMonth(), adDate.getUTCDate()) - EPOCH_AD.getTime()) / msPerDay)

  let bsYear = EPOCH_YEAR

  if (remaining >= 0) {
    while (true) {
      const yd = bsYearDays(bsYear)
      if (remaining < yd) break
      remaining -= yd
      bsYear++
      if (bsYear > BS_MAX_YEAR) throw new RangeError('AD date beyond supported BS range')
    }
  } else {
    bsYear--
    while (remaining < 0) {
      if (bsYear < BS_MIN_YEAR) throw new RangeError('AD date before supported BS range')
      remaining += bsYearDays(bsYear)
      if (remaining >= 0) break
      bsYear--
    }
  }

  const months = DATA[bsYear]!
  let bsMonth = 1
  for (let m = 0; m < 12; m++) {
    if (remaining < months[m]) { bsMonth = m + 1; break }
    remaining -= months[m]
  }

  return { year: bsYear, month: bsMonth, day: remaining + 1 }
}

/** Format a BS date as "YYYY-MM-DD" string (for display). */
export function formatBs({ year, month, day }: BsDate): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
