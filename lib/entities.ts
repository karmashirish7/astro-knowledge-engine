export const PLANETS = [
  { id: 'sun', name: 'Sun', sanskrit: 'Surya', symbol: '☉', color: '#F59E0B' },
  { id: 'moon', name: 'Moon', sanskrit: 'Chandra', symbol: '☽', color: '#E2E8F0' },
  { id: 'mars', name: 'Mars', sanskrit: 'Mangal', symbol: '♂', color: '#EF4444' },
  { id: 'mercury', name: 'Mercury', sanskrit: 'Budha', symbol: '☿', color: '#10B981' },
  { id: 'jupiter', name: 'Jupiter', sanskrit: 'Guru', symbol: '♃', color: '#F97316' },
  { id: 'venus', name: 'Venus', sanskrit: 'Shukra', symbol: '♀', color: '#EC4899' },
  { id: 'saturn', name: 'Saturn', sanskrit: 'Shani', symbol: '♄', color: '#6366F1' },
  { id: 'rahu', name: 'Rahu', sanskrit: 'Rahu', symbol: '☊', color: '#8B5CF6' },
  { id: 'ketu', name: 'Ketu', sanskrit: 'Ketu', symbol: '☋', color: '#78716C' },
]

export const RASHIS = [
  { id: 'aries', name: 'Aries', sanskrit: 'Mesha', number: 1, symbol: '♈', element: 'Fire', lord: 'Mars' },
  { id: 'taurus', name: 'Taurus', sanskrit: 'Vrishabha', number: 2, symbol: '♉', element: 'Earth', lord: 'Venus' },
  { id: 'gemini', name: 'Gemini', sanskrit: 'Mithuna', number: 3, symbol: '♊', element: 'Air', lord: 'Mercury' },
  { id: 'cancer', name: 'Cancer', sanskrit: 'Karka', number: 4, symbol: '♋', element: 'Water', lord: 'Moon' },
  { id: 'leo', name: 'Leo', sanskrit: 'Simha', number: 5, symbol: '♌', element: 'Fire', lord: 'Sun' },
  { id: 'virgo', name: 'Virgo', sanskrit: 'Kanya', number: 6, symbol: '♍', element: 'Earth', lord: 'Mercury' },
  { id: 'libra', name: 'Libra', sanskrit: 'Tula', number: 7, symbol: '♎', element: 'Air', lord: 'Venus' },
  { id: 'scorpio', name: 'Scorpio', sanskrit: 'Vrishchika', number: 8, symbol: '♏', element: 'Water', lord: 'Mars' },
  { id: 'sagittarius', name: 'Sagittarius', sanskrit: 'Dhanus', number: 9, symbol: '♐', element: 'Fire', lord: 'Jupiter' },
  { id: 'capricorn', name: 'Capricorn', sanskrit: 'Makara', number: 10, symbol: '♑', element: 'Earth', lord: 'Saturn' },
  { id: 'aquarius', name: 'Aquarius', sanskrit: 'Kumbha', number: 11, symbol: '♒', element: 'Air', lord: 'Saturn' },
  { id: 'pisces', name: 'Pisces', sanskrit: 'Meena', number: 12, symbol: '♓', element: 'Water', lord: 'Jupiter' },
]

export const HOUSES = Array.from({ length: 12 }, (_, i) => ({
  id: `house${i + 1}`,
  number: i + 1,
  name: `${i + 1}${['st','nd','rd','th','th','th','th','th','th','th','th','th'][i]} House`,
  sanskrit: ['Lagna','Dhana','Sahaja','Sukha','Putra','Ripu','Yuvati','Randhra','Dharma','Karma','Labha','Vyaya'][i],
  significations: [
    'Self, Body, Personality',
    'Wealth, Family, Speech',
    'Siblings, Courage, Communication',
    'Home, Mother, Happiness',
    'Children, Intelligence, Creativity',
    'Enemies, Health, Service',
    'Marriage, Partnerships, Business',
    'Longevity, Occult, Transformation',
    'Religion, Philosophy, Higher Learning',
    'Career, Fame, Father',
    'Gains, Income, Network',
    'Loss, Liberation, Foreign',
  ][i],
}))

export const NAKSHATRAS = [
  { id: 'ashwini', name: 'Ashwini', number: 1, lord: 'Ketu', rashi: 'Aries' },
  { id: 'bharani', name: 'Bharani', number: 2, lord: 'Venus', rashi: 'Aries' },
  { id: 'krittika', name: 'Krittika', number: 3, lord: 'Sun', rashi: 'Aries/Taurus' },
  { id: 'rohini', name: 'Rohini', number: 4, lord: 'Moon', rashi: 'Taurus' },
  { id: 'mrigashira', name: 'Mrigashira', number: 5, lord: 'Mars', rashi: 'Taurus/Gemini' },
  { id: 'ardra', name: 'Ardra', number: 6, lord: 'Rahu', rashi: 'Gemini' },
  { id: 'punarvasu', name: 'Punarvasu', number: 7, lord: 'Jupiter', rashi: 'Gemini/Cancer' },
  { id: 'pushya', name: 'Pushya', number: 8, lord: 'Saturn', rashi: 'Cancer' },
  { id: 'ashlesha', name: 'Ashlesha', number: 9, lord: 'Mercury', rashi: 'Cancer' },
  { id: 'magha', name: 'Magha', number: 10, lord: 'Ketu', rashi: 'Leo' },
  { id: 'purva_phalguni', name: 'Purva Phalguni', number: 11, lord: 'Venus', rashi: 'Leo' },
  { id: 'uttara_phalguni', name: 'Uttara Phalguni', number: 12, lord: 'Sun', rashi: 'Leo/Virgo' },
  { id: 'hasta', name: 'Hasta', number: 13, lord: 'Moon', rashi: 'Virgo' },
  { id: 'chitra', name: 'Chitra', number: 14, lord: 'Mars', rashi: 'Virgo/Libra' },
  { id: 'swati', name: 'Swati', number: 15, lord: 'Rahu', rashi: 'Libra' },
  { id: 'vishakha', name: 'Vishakha', number: 16, lord: 'Jupiter', rashi: 'Libra/Scorpio' },
  { id: 'anuradha', name: 'Anuradha', number: 17, lord: 'Saturn', rashi: 'Scorpio' },
  { id: 'jyeshtha', name: 'Jyeshtha', number: 18, lord: 'Mercury', rashi: 'Scorpio' },
  { id: 'mula', name: 'Mula', number: 19, lord: 'Ketu', rashi: 'Sagittarius' },
  { id: 'purva_ashadha', name: 'Purva Ashadha', number: 20, lord: 'Venus', rashi: 'Sagittarius' },
  { id: 'uttara_ashadha', name: 'Uttara Ashadha', number: 21, lord: 'Sun', rashi: 'Sagittarius/Capricorn' },
  { id: 'shravana', name: 'Shravana', number: 22, lord: 'Moon', rashi: 'Capricorn' },
  { id: 'dhanistha', name: 'Dhanistha', number: 23, lord: 'Mars', rashi: 'Capricorn/Aquarius' },
  { id: 'shatabhisha', name: 'Shatabhisha', number: 24, lord: 'Rahu', rashi: 'Aquarius' },
  { id: 'purva_bhadrapada', name: 'Purva Bhadrapada', number: 25, lord: 'Jupiter', rashi: 'Aquarius/Pisces' },
  { id: 'uttara_bhadrapada', name: 'Uttara Bhadrapada', number: 26, lord: 'Saturn', rashi: 'Pisces' },
  { id: 'revati', name: 'Revati', number: 27, lord: 'Mercury', rashi: 'Pisces' },
]

export const CATEGORIES = [
  'Planets',
  'Houses',
  'Rashis',
  'Nakshatras',
  'Yogas',
  'Dashas',
  'Transits',
  'Panchang',
  'Remedies',
  'Concepts',
]

export const ENTITY_PATTERNS = {
  planets: {
    pattern: /\b(sun|surya|moon|chandra|mars|mangal|mercury|budha|jupiter|guru|brihaspati|venus|shukra|saturn|shani|rahu|ketu)\b/gi,
    type: 'planet',
  },
  houses: {
    pattern: /\b(1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|11th|12th)\s*(house|bhava|bhav)\b|\b(lagna|dhana|sahaja|sukha|putra|ripu|yuvati|randhra|dharma|karma|labha|vyaya)\b/gi,
    type: 'house',
  },
  rashis: {
    pattern: /\b(aries|mesha|taurus|vrishabha|gemini|mithuna|cancer|karka|leo|simha|virgo|kanya|libra|tula|scorpio|vrishchika|sagittarius|dhanus|capricorn|makara|aquarius|kumbha|pisces|meena)\b/gi,
    type: 'rashi',
  },
  nakshatras: {
    pattern: /\b(ashwini|bharani|krittika|rohini|mrigashira|ardra|punarvasu|pushya|ashlesha|magha|purva phalguni|uttara phalguni|hasta|chitra|swati|vishakha|anuradha|jyeshtha|mula|purva ashadha|uttara ashadha|shravana|dhanistha|shatabhisha|purva bhadrapada|uttara bhadrapada|revati)\b/gi,
    type: 'nakshatra',
  },
}

export function extractEntities(text: string) {
  const found: { type: string; name: string; normalized: string }[] = []

  for (const [key, { pattern, type }] of Object.entries(ENTITY_PATTERNS)) {
    const matches = text.matchAll(new RegExp(pattern.source, 'gi'))
    for (const match of matches) {
      const name = match[0]
      found.push({ type, name, normalized: name.toLowerCase() })
    }
  }

  return [...new Map(found.map(e => [e.normalized, e])).values()]
}

export function classifyText(text: string): string {
  const lower = text.toLowerCase()
  const planetMatches = (lower.match(ENTITY_PATTERNS.planets.pattern) || []).length
  const houseMatches = (lower.match(ENTITY_PATTERNS.houses.pattern) || []).length
  const rashiMatches = (lower.match(ENTITY_PATTERNS.rashis.pattern) || []).length
  const nakshatraMatches = (lower.match(ENTITY_PATTERNS.nakshatras.pattern) || []).length

  const scores: Record<string, number> = {
    Planets: planetMatches * 3,
    Houses: houseMatches * 2,
    Rashis: rashiMatches * 2,
    Nakshatras: nakshatraMatches * 3,
  }

  if (/yoga|combination|conjunction/i.test(text)) scores['Yogas'] = (scores['Yogas'] || 0) + 5
  if (/dasha|mahadasha|antardasha|period/i.test(text)) scores['Dashas'] = (scores['Dashas'] || 0) + 5
  if (/transit|gochar|movement/i.test(text)) scores['Transits'] = (scores['Transits'] || 0) + 5
  if (/tithi|vara|karana|panchang/i.test(text)) scores['Panchang'] = (scores['Panchang'] || 0) + 5

  const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
  return top && top[1] > 0 ? top[0] : 'Concepts'
}

export function extractDictums(text: string): string[] {
  const sentences = text.split(/[.!?।]+/).map(s => s.trim()).filter(Boolean)
  return sentences.filter(s => {
    const hasEntity = Object.values(ENTITY_PATTERNS).some(p =>
      new RegExp(p.pattern.source, 'gi').test(s)
    )
    const isPredictive = /delay|gives|causes|result|indicates|signifies|brings|destroys|enhances|promotes|hinders|blesses|afflicts/i.test(s)
    return hasEntity && isPredictive && s.length > 20 && s.length < 300
  })
}
