// Local Vedic astrology prediction engine based on classical rules

export type PredictionResult = { points: string[]; summary: string }

const SIGN_NAMES = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
]

const SIGN_RULER: Record<number, string> = {
  1:'Mars',2:'Venus',3:'Mercury',4:'Moon',5:'Sun',6:'Mercury',
  7:'Venus',8:'Mars',9:'Jupiter',10:'Saturn',11:'Saturn',12:'Jupiter',
}

// Aspect offsets for each planet (how many houses ahead they aspect)
const PLANET_ASPECTS: Record<string, number[]> = {
  Sun:[7], Moon:[7], Mars:[4,7,8], Mercury:[7],
  Jupiter:[5,7,9], Venus:[7], Saturn:[3,7,10], Rahu:[5,7,9], Ketu:[5,7,9],
}

// ── Planet in House rules ──────────────────────────────────────────────────

const PLANET_IN_HOUSE: Record<string, Record<number, string>> = {
  Sun: {
    1:  'Strong, authoritative personality — natural leadership, but prone to ego and hair thinning early.',
    2:  'Proud speech, disciplined approach to food and family wealth; speaks with authority.',
    3:  'Routine-minded, politically interested, enjoys news and structured hobbies.',
    4:  'Brings bright moral energy to home, but emotionally dry; values authority over emotion.',
    5:  'Disciplined student, loyal and seeks a partner who respects authority.',
    6:  'Excellent manager and administrator; ego clashes at work, tendency toward heat-related or gastric issues.',
    7:  'Heavy ego clashes in marriage; partner may feel dominated; separate sleeping preferred.',
    8:  'Public insults or humiliation possible; weak constitution, calcium deficiency; spiritual transformation through crisis.',
    9:  'Grand goals, strong sense of dharma; responsible regarding temples and spiritual duties.',
    10: 'Digbala — maximum directional strength; glory, fame, and managerial authority; career peak.',
    11: 'Desires fame and recognition; strict about legal income; gains through authority figures.',
    12: 'Avoids wrong acts in isolation; prone to losing small items (watches, umbrellas); hidden creativity.',
  },
  Moon: {
    1:  'Deeply emotional, sensitive, intuitive; moody personality; prone to attracting evil eye.',
    2:  'Sweet, charming speech; family environment is emotionally cyclical; values nourishment.',
    3:  'Emotional and moody learner; drawn to arts, music, water-adjacent neighborhoods.',
    4:  'Ideal placement — strong mother bond, home is a true sanctuary; highly empathetic.',
    5:  'Deep emotional investment in romance and children; moody student, learns through feeling.',
    6:  'Risk of neurological or anxiety issues; prone to betrayal by colleagues or maternal figures.',
    7:  'Beautiful or caring partner; intense love but regular mood-driven conflicts.',
    8:  'Emotional trauma through in-laws or crisis; feelings of isolation; deep healing potential.',
    9:  'Drawn to meditation, devotional music; emotional father figure; intuitive about dharma.',
    10: 'Career fluctuates seasonally; public welfare roles; emotionally invested in reputation.',
    11: 'Desires peace, moonlit environments; income can be irregular or seasonal.',
    12: 'Deep loneliness and need for water-based solitude; highly spiritual; emotional support-seeker.',
  },
  Mars: {
    1:  'Commander personality — brave, direct, physically active; short-tempered; possible facial marks.',
    2:  'Logical, quick, aggressive speech; takes on heavy family financial responsibilities.',
    3:  'Fast-processing mind; loves sports and physical hobbies; aggressive in communication.',
    4:  'Emotionally volatile home; argues with mother; very active household.',
    5:  'Logical and technical learner; passionate, intense romantic relationships.',
    6:  'Natural fit for police, defense, or surgery; physical trauma possible; competitive workplace.',
    7:  'Severe conflicts with in-laws; blood-related health issues; stomach or surgery risk.',
    8:  'Risk of physical abuse or blood-related diseases; intense transformation through crisis.',
    9:  'Warrior approach to dharma; Kshatriya traits; practical and action-oriented religion.',
    10: 'Highly responsible, authoritative career; suited for military, police, or emergency services.',
    11: 'Desires brotherhood and group loyalty; earns through intense overtime or physical work.',
    12: 'Bedroom aggression or restlessness; blood pressure issues; fiercely protective of private space.',
  },
  Mercury: {
    1:  'Highly communicative, sharp intellect, youthful appearance maintained for long.',
    2:  'Earns through communication, counseling, or writing; excellent with numbers and deals.',
    3:  'Brilliant debater and writer; very active subconscious; multiple hobbies or side interests.',
    4:  'Home environment is playful and business-minded; loves counting, dealing, and logistics.',
    5:  'Highly competitive in education; attracted to intellectual or witty partners.',
    6:  'Thrives on structured routines — suited for CA, HR, finance, healthcare administration.',
    7:  'Playful, communicative marriages; spouse feels like a sibling; early or casual relationships.',
    8:  'Risk of fraud through paperwork; self-serving in-laws; health improves after financial gains.',
    9:  'Analytical and idea-seeking; loves frequent short travel; competitive in dharmic pursuits.',
    10: 'Ultimate consultant, math, coding, teaching, or finance professional.',
    11: 'Obsessed with finding income everywhere; multiple income streams; networking-driven gains.',
    12: 'Avoids communication in isolation; prone to nervous exhaustion; disorganized private life.',
  },
  Jupiter: {
    1:  'Naturally blessed, spiritually inclined, wise and generous; non-jealous; magnetically positive aura.',
    2:  'Wise and visionary speech; excellent at banking, gold, and long-term wealth building.',
    3:  'Slow processor but spiritually oriented; loves reading, teaching, and guiding others.',
    4:  'Pure, serene home close to nature; wise mother-teacher influence; emotionally stable.',
    5:  'Exceptionally strong for education, children, and intelligence; blessings in romance.',
    6:  'Stuck in jobs below true worth; liver or weight issues; service orientation.',
    7:  'Marriage left to divine grace; spouse acts as guru; stable, moral partnership.',
    8:  'Prominent, good in-laws; hidden spiritual visions; breathing or respiratory care needed.',
    9:  'Highly moral, deeply religious; noble father figure; strong connection to scripture.',
    10: 'Teacher, counselor, minister, or judiciary; strong company loyalty; respected authority.',
    11: 'Friend to all; successful and influential social circle; luck-based income.',
    12: 'Blessed placement — peaceful sleep, divine protection, natural spirituality.',
  },
  Venus: {
    1:  'Loves luxury and fashion; beautiful or attractive appearance; charming, refined speech.',
    2:  'Excellent wealth accumulation; beautiful appearance maintained; appreciation for fine dining.',
    3:  'Refined communication; thinks constantly about aesthetics and relationships.',
    4:  'Elegant, sweet-smelling home; finds peace through beauty, art, or deity service.',
    5:  'Strong indicator of love marriage; success in medicine, fashion, or occult arts.',
    6:  'Suited for medical, artistic, or interior design work; risk of kidney stones.',
    7:  'Marries based on physical attraction — "blind" placement; beautiful, sweet-natured partner; needs family guidance in choosing spouse.',
    8:  'Wealthy or resource-rich in-laws; risk of hidden affairs; urinary or STD concerns.',
    9:  'Devoted to aesthetic forms of religion; beautiful father figure; luxurious long journeys.',
    10: 'Refined work environment; suited for jewelry, cosmetics, fashion, or aviation careers.',
    11: 'Obsessed with luxury brands; master marketer; gains through aesthetics; some betrayal risk.',
    12: 'Excellent spiritual devotion; heavy luxury spending; kidney health needs monitoring.',
  },
  Saturn: {
    1:  'Hardworking and slow-moving; faces delays and requires sustained effort before results arrive.',
    2:  'Slow, careful speech; early life poverty; delays in wealth accumulation; frugal by nature.',
    3:  'Industrial or working-class neighborhood energy; workaholic; harsh or blunt communicator.',
    4:  'Prefers older homes; heavy emotional pressure; emotionally dry; triggered by idleness.',
    5:  'Learns under immense pressure; attracted to humble, hardworking partners; delayed children.',
    6:  'Brilliant government or public-sector employee; slow growth but very stable; Vata or bone issues.',
    7:  'Slow, dutiful partner; treats marriage like a job; performance anxiety; delayed marriage.',
    8:  'Secretive or lying in-laws; hidden profession; only partial credit given for achievements.',
    9:  'Extreme belief in hard work over luck; late fortune arrival; focused on upliftment of others.',
    10: 'Stable but demanding career; late success; dislikes sudden changes; extremely disciplined.',
    11: 'Very delayed desire fulfillment; associates with lazy or unmotivated people; eventual stability.',
    12: 'Severe sleep deprivation; restrictive bedroom environment; must serve the poor or spiritual guides.',
  },
  Rahu: {
    1:  'Massive worldly desires; outsider feeling despite success; excellent networking and social luck.',
    2:  'Speaks without limits or filters; desires massive wealth; drawn to Tamasic or rich foods.',
    3:  'Hustler mindset; wealthy or aspirational neighborhood; reckless risk-taking in communication.',
    4:  '"King-size" home desires; amplifies family arguments; restless domestic life.',
    5:  'Obsessed with top academic ranks; unconventional romantic choices; quick wealth through speculation.',
    6:  'Master of office politics; unusual or hard-to-diagnose diseases; destroys enemies obsessively.',
    7:  'Intense marriage obsession; drawn to toxic or unconventional partners; hyperfocused on physical intimacy.',
    8:  'Politically aggressive in-laws; extra-marital tendencies; addiction risks.',
    9:  'Rebellious toward religion and tradition; risk of fraud for personal goals; Deva Dosha possible.',
    10: 'Career hustler; frequent job changes chasing quick money; unconventional rise to fame.',
    11: 'Massive desires for fame and wealth; artificial luxury; mother relationship can be toxic.',
    12: 'Strong pull toward foreign lands; risk of internet scams or addictions; large, lavish bedroom.',
  },
  Ketu: {
    1:  'Introverted and spiritually oriented; speaks sparingly but words carry weight; prone to anxiety.',
    2:  'Few words; detached from family wealth accumulation; dental health needs attention.',
    3:  'Easily irritated; loves trekking, solitude, and occult study; minimal social hobbies.',
    4:  'Minimal material attachment to home; prefers quiet, simple spaces; detached from homeland.',
    5:  'Deep research orientation; searching for a soulmate across lifetimes; past-life monk energy.',
    6:  'Dislikes office politics intensely; natural healer; debt may force periods of detachment.',
    7:  'Deep confusion about marriage; gets bored quickly in relationships; needs a spiritual partner.',
    8:  'Complete detachment from in-laws; inexpressive or withdrawn partner; suspicious undercurrent.',
    9:  'Highly intuitive about dharma; loves high-altitude temples; prefers isolated spiritual practice.',
    10: 'Requires extreme career freedom; excels in detailed precision work (research, crafts); career breaks.',
    11: 'Only half of desires get fulfilled; spiritual travel instantly granted; powerful intuition.',
    12: 'Ultimate Moksha placement; small, simple feet; sleep struggles; naturally and completely detached.',
  },
}

// ── House-specific contextual meanings ────────────────────────────────────

const HOUSE_MEANINGS: Record<number, string> = {
  1:  'self, physical body, personality, and overall life direction',
  2:  'wealth, family speech, accumulated resources, and face/neck',
  3:  'courage, siblings, communication, hobbies, and short travel',
  4:  'home, mother, emotional core, and inner values',
  5:  'intelligence, children, romance, past-life karma, and creativity',
  6:  'debts, disease, enemies, workplace, and service',
  7:  'marriage, partnerships, spouse qualities, and public perception',
  8:  'transformation, in-laws, hidden wealth, occult, and longevity',
  9:  'fortune, father, dharma, higher education, and long journeys',
  10: "career, public fame, authority, and life's chief purpose",
  11: 'desires, gains, social networks, and elder siblings',
  12: 'losses, isolation, spirituality, foreign lands, and liberation',
}

// ── Sign in specific houses (where rules are defined) ─────────────────────

const SIGN_IN_HOUSE: Partial<Record<number, Record<number, string>>> = {
  2: {
    1:  'Fast, logical, and aggressive speech; struggles to save despite good earnings.',
    2:  'Excellent wealth accumulation; stubborn about money; strong physical constitution.',
    3:  'Brilliant communicators; collects items and information; family can be self-serving.',
    4:  'Emotionally cyclical family environment; sweet speech; wealth tied to moods.',
    5:  'Respected family lineage; authoritative speech; strong values around justice.',
    6:  'Point-to-point, strict speech; frequent disputes over shared family resources.',
    7:  'Balanced, diplomatic speech; excellent resource manager; wealth through partnerships.',
    8:  'Secretive about money; quiet problem-solver; deep family grudges.',
    9:  'Wise, minimal speech; knowledge stored as wealth; philosophical about money.',
    10: 'Powerful, practical speech; demanding family expectations around wealth.',
    11: 'Big promises; networking-based income; sudden wealth or sudden fraud risk.',
    12: 'Spiritual, abstract speech; tendency to give away personal resources freely.',
  },
  10: {
    1:  'New project initiator; heavy risk-taker; builds things from ground up.',
    2:  'Resource and budget management; treasurer or diplomat roles.',
    3:  'Communication, data, writing, or coordination careers.',
    4:  'Public welfare, emotional service (banking, Navy, social work).',
    5:  'Demands power and management; uncomfortable with ground-level work.',
    6:  'Service-oriented, analytical careers (healthcare, law, CA, audit).',
    7:  'Client management, partnerships, aesthetics (fashion, jewelry, art).',
    8:  'Research and transformation careers (astrology, surgery, data mining).',
    9:  'Strategy, advisory, or official roles; refuses morally compromised work.',
    10: 'Monopoly builder; sets demanding boundaries; extremely ambitious.',
    11: 'Large networks, mass media, artificial intelligence, or systems work.',
    12: 'Foreign-land career, isolation work, high creativity or spiritual practice.',
  },
  12: {
    1:  '"Never give up" in isolation; aggressive meditation style; high bedroom energy.',
    2:  'Fears financial losses deeply; hides money; property-related disputes.',
    3:  'Active subconscious; sleep struggles; frequently loses documents or items.',
    4:  'Seeks emotional comfort at night; late-night eating habits.',
    5:  'Bedroom ego clashes; prefers separate sleeping; hidden immoral acts possible.',
    6:  'Critical and calculating in private life; structured donations; analytical expenses.',
    7:  'Hidden relationships; luxurious bedroom; partnerships require compromise.',
    8:  'Occult-filled bedroom; nightmares or insomnia; deep subconscious processing.',
    9:  'Highly spiritual; heavy temple donations; back or liver care needed.',
    10: 'Traditional in private; hoards nostalgic items; may build or donate to ashrams.',
    11: 'Sleep disorders; electronics-filled bedroom; financial losses through scams.',
    12: 'Naturally giving; vivid, prophetic dreams; strong sixth sense; easy detachment.',
  },
}

// ── Special yogas and formulas ─────────────────────────────────────────────

function getSpecialNotes(houseNum: number, planets: Record<string, any>, houseNumbers: Record<string, number>, lagnaSign: number): string[] {
  const notes: string[] = []
  const inHouse = Object.entries(houseNumbers).filter(([, h]) => h === houseNum).map(([p]) => p)

  // Sun in 10th = Digbala
  if (houseNum === 10 && inHouse.includes('Sun')) {
    notes.push('Sun attains Digbala (maximum directional strength) in the 10th — exceptional capacity for fame, authority, and career glory.')
  }

  // Venus in 7th = blind marriage
  if (houseNum === 7 && inHouse.includes('Venus')) {
    notes.push('Venus is "blind" in the 7th — marriage may happen purely based on physical attraction; family guidance in choosing a spouse is strongly advised.')
  }

  // Jupiter in 7th = spouse as guru
  if (houseNum === 7 && inHouse.includes('Jupiter')) {
    notes.push('Jupiter in the 7th makes the spouse a teacher and guide — marriage is spiritually stabilising and morally grounding.')
  }

  // Lagna lord in 1st
  const lagnaLord = SIGN_RULER[lagnaSign]
  if (lagnaLord && houseNumbers[lagnaLord] === 1 && houseNum === 1) {
    notes.push(`Lagna lord ${lagnaLord} sits in the 1st house — strong self-reliance, independence, and focus on personal identity and health throughout life.`)
  }

  // 11th house paradox
  if (houseNum === 11) {
    notes.push('The 11th house is 8th from the 4th — intense pursuit of desires here can erode inner peace and domestic harmony. Balance ambition with contentment.')
  }

  // 8th house transformation
  if (houseNum === 8 && inHouse.length > 0) {
    notes.push(`Planets in the 8th house intensify transformation and sudden change — the 8th shows what forces this person to evolve when they hit rock bottom.`)
  }

  // Rahu 9th = Deva Dosha
  if (houseNum === 9 && inHouse.includes('Rahu')) {
    notes.push('Rahu in the 9th creates Deva Dosha — breaking ancestral or religious boundaries; remedial worship of Vishnu or ancestors recommended.')
  }

  // 4 pillars of marriage (7th house)
  if (houseNum === 7) {
    const venusHouse  = houseNumbers['Venus']
    const h7SignNum   = ((lagnaSign - 1 + 6) % 12) + 1
    const h7Lord      = SIGN_RULER[h7SignNum]
    const h7LordHouse = h7Lord ? houseNumbers[h7Lord] : null
    const parts: string[] = ['Marriage reading — four pillars:']
    parts.push(`  1. 7th house sign: ${SIGN_NAMES[h7SignNum - 1]}`)
    if (venusHouse)  parts.push(`  2. Venus (quality of marriage) in H${venusHouse}`)
    if (h7LordHouse) parts.push(`  3. 7th lord ${h7Lord} (life changes after marriage) in H${h7LordHouse}`)
    parts.push('  4. D9 (Navamsha) ascendant — overall fortune from marriage')
    notes.push(parts.join('\n'))
  }

  return notes
}

// ── House name helper ──────────────────────────────────────────────────────

function houseSign(houseNum: number, lagnaSign: number) {
  const signNum = ((lagnaSign - 1 + houseNum - 1) % 12) + 1
  return { sign: SIGN_NAMES[signNum - 1] ?? '', signNum }
}

function aspectingPlanets(target: number, houseNumbers: Record<string, number>): string[] {
  return Object.entries(houseNumbers).flatMap(([planet, from]) => {
    if (from === target) return []
    const hits = (PLANET_ASPECTS[planet] ?? [7]).some(
      off => ((from - 1 + off - 1) % 12) + 1 === target
    )
    return hits ? [planet] : []
  })
}

// ── Planet rulership houses ────────────────────────────────────────────────

const PLANET_RULED_SIGNS: Record<string, number[]> = {
  Sun:[5], Moon:[4], Mars:[1,8], Mercury:[3,6],
  Jupiter:[9,12], Venus:[2,7], Saturn:[10,11],
  Rahu:[11], Ketu:[8],
}

function planetRuledHouses(planet: string, lagnaSign: number): number[] {
  return (PLANET_RULED_SIGNS[planet] ?? [])
    .map(s => ((s - lagnaSign + 12) % 12) + 1)
    .sort((a, b) => a - b)
}

// ── Main prediction functions ──────────────────────────────────────────────

export function predictHouse(houseNum: number, calc: any): PredictionResult {
  const houseNumbers: Record<string, number> = calc?.houseNumbers ?? {}
  const planetsData:  Record<string, any>    = calc?.planets     ?? {}
  const lagnaSign: number = calc?.lagnaSign ?? 1

  const { sign, signNum } = houseSign(houseNum, lagnaSign)
  const lord      = SIGN_RULER[signNum] ?? ''
  const lordHouse = houseNumbers[lord]
  const inHouse   = Object.entries(houseNumbers).filter(([, h]) => h === houseNum).map(([p]) => p)
  const aspecting = aspectingPlanets(houseNum, houseNumbers)
  const meaning   = HOUSE_MEANINGS[houseNum] ?? ''

  const points: string[] = []

  // Sign in this house
  const signRule = SIGN_IN_HOUSE[houseNum]?.[signNum]
  if (signRule) {
    points.push(`${sign} sign here — ${signRule}`)
  } else {
    points.push(`${sign} sign occupies the ${houseNum}${ordinalSuffix(houseNum)} house (${meaning}), ruled by ${lord}.`)
  }

  // House lord placement
  if (lord && lordHouse) {
    const lordSignInfo = houseSign(lordHouse, lagnaSign)
    const lordCotenants = Object.entries(houseNumbers)
      .filter(([p, h]) => h === lordHouse && p !== lord).map(([p]) => p)
    const coStr = lordCotenants.length ? ` alongside ${lordCotenants.join(' & ')}` : ''
    points.push(`House lord ${lord} is placed in the ${lordHouse}${ordinalSuffix(lordHouse)} house (${lordSignInfo.sign})${coStr} — life circumstances around ${meaning} are shaped by the themes of the ${lordHouse}${ordinalSuffix(lordHouse)} house.`)
  }

  // Each planet in the house
  for (const planet of inHouse) {
    const rule = PLANET_IN_HOUSE[planet]?.[houseNum]
    const pos  = planetsData[planet]
    const nk   = pos?.nakshatra ? ` (${pos.nakshatra})` : ''
    if (rule) {
      points.push(`${planet}${nk} in H${houseNum} — ${rule}`)
    }
  }

  // Conjunctions note
  if (inHouse.length > 1) {
    points.push(`Conjunction of ${inHouse.join(' + ')} — these planetary energies merge and intensify each other's results in matters of ${meaning}.`)
  }

  // Aspects
  if (aspecting.length > 0) {
    const aspectDescs = aspecting.map(p => {
      const fromH = houseNumbers[p]
      const ruledH = planetRuledHouses(p, lagnaSign)
      const ruledStr = ruledH.length ? ` (lord of H${ruledH.join(', H')})` : ''
      return `${p} from H${fromH}${ruledStr}`
    })
    points.push(`Aspected by: ${aspectDescs.join('; ')} — these planets also influence ${meaning}.`)
  }

  // Special yogas / formulas
  const special = getSpecialNotes(houseNum, planetsData, houseNumbers, lagnaSign)
  points.push(...special)

  const summary = `House ${houseNum} (${sign} sign, lord ${lord} in H${lordHouse ?? '?'})${inHouse.length ? ` — ${inHouse.join(', ')} present` : ''}`

  return { points, summary }
}

export function predictPlanet(planetName: string, calc: any): PredictionResult {
  const houseNumbers: Record<string, number> = calc?.houseNumbers ?? {}
  const planetsData:  Record<string, any>    = calc?.planets     ?? {}
  const lagnaSign: number = calc?.lagnaSign ?? 1

  const house      = houseNumbers[planetName]
  const pos        = planetsData[planetName]
  const points: string[] = []

  if (!house) {
    return { points: [`No house position found for ${planetName}.`], summary: planetName }
  }

  const { sign } = houseSign(house, lagnaSign)
  const ruledHouses = planetRuledHouses(planetName, lagnaSign)
  const cotenants   = Object.entries(houseNumbers).filter(([p, h]) => h === house && p !== planetName).map(([p]) => p)
  const aspecting   = aspectingPlanets(house, houseNumbers)

  // Core placement
  const rule = PLANET_IN_HOUSE[planetName]?.[house]
  if (rule) {
    const nk = pos?.nakshatra ? ` in ${pos.nakshatra} nakshatra` : ''
    points.push(`${planetName} in H${house} (${sign})${nk} — ${rule}`)
  }

  // Rulership context
  if (ruledHouses.length > 0) {
    const houseMeanings = ruledHouses.map(h => `H${h} (${HOUSE_MEANINGS[h] ?? ''})`)
    points.push(`${planetName} rules ${houseMeanings.join(' and ')} — its results in the ${house}${ordinalSuffix(house)} house directly influence these life areas.`)
  }

  // Conjunctions
  if (cotenants.length > 0) {
    const conjDescriptions = cotenants.map(p => {
      const conjRule = PLANET_IN_HOUSE[p]?.[house]
      return conjRule ? `${p} (${conjRule.split(' — ')[0]?.slice(0, 60)}…)` : p
    })
    points.push(`Conjunct with ${conjDescriptions.join(', ')} in H${house} — their energies blend, modifying ${planetName}'s significations.`)
  }

  // Aspects onto this house
  if (aspecting.length > 0) {
    const aspectDescs = aspecting.map(p => {
      const fromH = houseNumbers[p]
      return `${p} (from H${fromH})`
    })
    points.push(`${sign} sign / H${house} receives aspect from: ${aspectDescs.join(', ')} — these planets colour the environment where ${planetName} operates.`)
  }

  // Nakshatra note
  if (pos?.nakshatra) {
    points.push(`Placed in ${pos.nakshatra} nakshatra — the nature of ${planetName}'s expression and timing of results are filtered through this nakshatra's qualities.`)
  }

  const summary = `${planetName} in H${house} (${sign})${ruledHouses.length ? `, rules H${ruledHouses.join(', H')}` : ''}`

  return { points, summary }
}

function ordinalSuffix(n: number): string {
  if (n === 1) return 'st'
  if (n === 2) return 'nd'
  if (n === 3) return 'rd'
  return 'th'
}

export function predict(section: string, calc: any): PredictionResult {
  if (section.startsWith('house')) {
    const num = parseInt(section.replace('house', ''), 10)
    if (num >= 1 && num <= 12) return predictHouse(num, calc)
  }
  if (section.startsWith('planet-')) {
    const name = section.replace('planet-', '')
    return predictPlanet(name, calc)
  }
  return { points: ['Select a house (H1–H12) or planet section to see predictions.'], summary: '' }
}
