import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// ── Astro helpers ──────────────────────────────────────────────────────────

const SIGN_NAMES = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
]
const SIGN_RULER: Record<number,string> = {
  1:'Mars',2:'Venus',3:'Mercury',4:'Moon',5:'Sun',6:'Mercury',
  7:'Venus',8:'Mars',9:'Jupiter',10:'Saturn',11:'Saturn',12:'Jupiter',
}
const PLANET_ASPECTS: Record<string,number[]> = {
  Sun:[7],Moon:[7],Mars:[4,7,8],Mercury:[7],
  Jupiter:[5,7,9],Venus:[7],Saturn:[3,7,10],Rahu:[5,7,9],Ketu:[5,7,9],
}
const PLANET_RULED_SIGNS: Record<string,number[]> = {
  Sun:[5],Moon:[4],Mars:[1,8],Mercury:[3,6],
  Jupiter:[9,12],Venus:[2,7],Saturn:[10,11],Rahu:[11],Ketu:[8],
}

function houseSign(houseNum:number, lagnaSign:number) {
  const signNum = ((lagnaSign-1+houseNum-1)%12)+1
  return { sign: SIGN_NAMES[signNum-1]??'', signNum }
}
function aspectingPlanets(target:number, hn:Record<string,number>):string[] {
  return Object.entries(hn).flatMap(([planet,from]) => {
    if (from===target) return []
    const hits = (PLANET_ASPECTS[planet]??[7]).some(off => ((from-1+off-1)%12)+1===target)
    return hits ? [planet] : []
  })
}
function ruledHouses(planet:string, lagnaSign:number):number[] {
  return (PLANET_RULED_SIGNS[planet]??[]).map(s=>((s-lagnaSign+12)%12)+1).sort((a,b)=>a-b)
}
function ord(n:number):string {
  return ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th'][n-1]??`${n}th`
}

// ── Build detailed chart context for a section ─────────────────────────────

function buildContext(section:string, calc:any):string {
  const hn: Record<string,number> = calc?.houseNumbers??{}
  const pl: Record<string,any>   = calc?.planets??{}
  const ls: number = calc?.lagnaSign??1
  const lagnaStr = `${SIGN_NAMES[ls-1]??''} Lagna`

  // All planets summary
  const allPlanets = Object.entries(hn).map(([p,h])=>{
    const pos = pl[p]; const {sign} = houseSign(h,ls)
    const nk = pos?.nakshatra ? ` / ${pos.nakshatra}` : ''
    const deg = pos?.formatted ? ` at ${pos.formatted}` : ''
    const rh = ruledHouses(p,ls)
    const rulesStr = rh.length ? ` [rules H${rh.join(', H')}]` : ''
    return `${p}: H${h} (${sign}${nk})${deg}${rulesStr}`
  }).join('\n')

  if (section.startsWith('house')) {
    const houseNum = parseInt(section.replace('house',''),10)
    const {sign, signNum} = houseSign(houseNum, ls)
    const lord = SIGN_RULER[signNum]??''
    const lordHouse = hn[lord]
    const lordSign = lordHouse ? houseSign(lordHouse,ls).sign : ''
    const lordPos  = lordHouse ? pl[lord] : null
    const lordNk   = lordPos?.nakshatra ? ` / ${lordPos.nakshatra}` : ''
    const lordDeg  = lordPos?.formatted ? ` at ${lordPos.formatted}` : ''
    const lordCotenants = lordHouse ? Object.entries(hn).filter(([p,h])=>h===lordHouse&&p!==lord).map(([p])=>p) : []

    const inHouse = Object.entries(hn).filter(([,h])=>h===houseNum).map(([p])=>p)
    const aspecting = aspectingPlanets(houseNum, hn)

    const planetDetails = inHouse.map(p=>{
      const pos=pl[p]; const nk=pos?.nakshatra?` / ${pos.nakshatra}`:''
      const deg=pos?.formatted?` at ${pos.formatted}`:''
      const rh=ruledHouses(p,ls)
      return `  - ${p}${deg}${nk}${rh.length?` [rules H${rh.join(', H')}]`:''}`
    })
    const aspectDetails = aspecting.map(p=>{
      const fromH=hn[p]; const {sign:fs}=houseSign(fromH,ls)
      const rh=ruledHouses(p,ls)
      return `  - ${p} from H${fromH} (${fs})${rh.length?` [rules H${rh.join(', H')}]`:''}`
    })

    return [
      `CHART: ${lagnaStr}`,
      ``,
      `FULL PLANETARY POSITIONS:`,
      allPlanets,
      ``,
      `FOCUS: House ${houseNum} (${ord(houseNum)} house)`,
      `Sign in H${houseNum}: ${sign}`,
      `House lord: ${lord}${lordHouse?` placed in H${lordHouse} (${lordSign}${lordNk})${lordDeg}`:'(not found)'}`,
      lordCotenants.length ? `Lord's cotenants in H${lordHouse}: ${lordCotenants.join(', ')}` : '',
      inHouse.length ? `Planets IN H${houseNum}:\n${planetDetails.join('\n')}` : `No planets in H${houseNum} (empty house)`,
      aspecting.length ? `Planets ASPECTING H${houseNum}:\n${aspectDetails.join('\n')}` : 'No planets aspecting this house',
    ].filter(Boolean).join('\n')
  }

  if (section.startsWith('planet-')) {
    const pName = section.replace('planet-','')
    const house = hn[pName]
    const pos   = pl[pName]
    if (!house) return `CHART: ${lagnaStr}\n\n${pName} has no calculated house position.\n\nFULL POSITIONS:\n${allPlanets}`

    const {sign, signNum} = houseSign(house, ls)
    const dispositor = SIGN_RULER[signNum]??''
    const dispHouse  = hn[dispositor]
    const dispSign   = dispHouse ? houseSign(dispHouse,ls).sign : ''
    const cotenants  = Object.entries(hn).filter(([p,h])=>h===house&&p!==pName).map(([p])=>p)
    const aspecting  = aspectingPlanets(house, hn)
    const rh         = ruledHouses(pName, ls)

    const coDetails = cotenants.map(p=>{
      const cp=pl[p]; const nk=cp?.nakshatra?` / ${cp.nakshatra}`:''
      const rph=ruledHouses(p,ls)
      return `  - ${p}${nk}${rph.length?` [rules H${rph.join(', H')}]`:''}`
    })
    const aspDetails = aspecting.map(p=>{
      const fromH=hn[p]; const {sign:fs}=houseSign(fromH,ls)
      return `  - ${p} from H${fromH} (${fs})`
    })

    return [
      `CHART: ${lagnaStr}`,
      ``,
      `FULL PLANETARY POSITIONS:`,
      allPlanets,
      ``,
      `FOCUS: ${pName}`,
      `Position: ${pos?.formatted??'unknown'} in H${house} (${sign})`,
      pos?.nakshatra ? `Nakshatra: ${pos.nakshatra}` : '',
      `Dispositor: ${dispositor}${dispHouse?` in H${dispHouse} (${dispSign})`:'(not found)'}`,
      rh.length ? `${pName} rules: H${rh.join(', H')} in this chart` : '',
      cotenants.length ? `Conjunct with:\n${coDetails.join('\n')}` : 'No conjunctions',
      aspecting.length ? `Planets aspecting H${house}:\n${aspDetails.join('\n')}` : 'No aspects onto this house',
    ].filter(Boolean).join('\n')
  }

  return `CHART: ${lagnaStr}\n\nFULL POSITIONS:\n${allPlanets}`
}

// ── Complete rules from the doctrine ──────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior Vedic astrology teacher writing chart interpretations. Given planetary positions, write a single flowing paragraph (150–220 words) that creatively and insightfully describes what that house or planet means for this person's life. Blend all the active factors — sign, planets, aspects, house lord placement, conjunctions — into one cohesive reading. Do not list items. Do not use bullet points. Write in second person ("You…", "Your…"). Be specific, vivid, and grounded in the rules below. Avoid vague spiritual clichés.

═══════════════════════════════════════════
COMPLETE VEDIC ASTROLOGY RULES
═══════════════════════════════════════════

── HOUSE MEANINGS ──
H1: Self, personality, physical body, health, independence
H2: Wealth, family lineage, speech, food, face & neck
H3: Courage, siblings, communication, hobbies, subconscious mind, neighbours
H4: Home, mother, emotions, inner core values, childhood memories
H5: Intelligence, education, children, romance, past-life karma, authority
H6: Debt, disease, enemies, workplace, service, maternal uncle/aunt
H7: Marriage, partnerships, spouse traits, public perception
H8: Occult, in-laws, hidden secrets, sudden wealth, decay, transformation
H9: Fortune (Bhagya), father, gurus, religion, long journeys, higher education
H10: Career, karma, public fame, authority, Nishkam Karma
H11: Desires, gains, elder siblings, networks, obsessions
H12: Isolation, sleep, losses, spirituality, bedroom, liberation (Moksha)

── SUN IN EACH HOUSE ──
H1: Authoritative, leadership, ego-driven, hair thinning
H2: Disciplined eating, proud speech about family
H3: Routine-minded, enjoys politics/news
H4: Bright home, moral authority, emotionally dry
H5: Disciplined student, seeks loyal partner
H6: Excellent manager, ego clashes, heat/gastric issues
H7: Heavy ego clashes in marriage, separate bedrooms, "Henpecked" image
H8: Public insults, weak health, calcium deficiency, transformation through crisis
H9: Responsible regarding dharma, seeks grand goals, temple duties
H10: DIGBALA — maximum strength, glory, fame, managerial position
H11: Desires glory/fame, strict about legal income
H12: Avoids wrong acts in isolation, loses small items

── MOON IN EACH HOUSE ──
H1: Emotional, sensitive, moody, intuitive, prone to evil eye
H2: Sweet talker, family emotional cycles, loves nourishment
H3: Emotional/moody learner, enjoys arts, water-adjacent neighbourhood
H4: Ultimate sanctuary, strongest mother bond, highly empathetic
H5: Moody student, deep emotional romance and children
H6: Neurological issues, prone to betrayal by colleagues
H7: Beautiful caring partner, intense love but mood-driven conflicts
H8: Emotional trauma through in-laws, feelings of isolation, deep healing
H9: Drawn to meditation/devotional music, emotional father figure
H10: Seasonal career fluctuation, public welfare, emotionally invested in reputation
H11: Desires peace and moonlit environments, seasonal irregular income
H12: Deep loneliness, needs water-based solitude, highly spiritual

── MARS IN EACH HOUSE ──
H1: Commander personality, brave, short-tempered, facial scars or marks
H2: Logical/quick/aggressive speech, heavy family responsibility
H3: Fast-processing brain, enjoys sports, aggressive communicator
H4: Active home, emotional volatility, argues with mother
H5: Logical/technical/fast learner, passionate intense relationships
H6: Police/defense/surgery fit, physical trauma, competitive workplace
H7: Severe in-law conflicts, blood issues, stomach surgeries risk
H8: Physical abuse risk, blood-related diseases, crisis transformation
H9: Practical religion, warrior mindset, Kshatriya dharma
H10: Highly authoritative, military/police, takes on early jobs
H11: Desires brotherhood/gang loyalty, intense overtime income
H12: Bedroom aggression, blood pressure issues, fiercely protective in private

── MERCURY IN EACH HOUSE ──
H1: Highly communicative, sharp intellect, youthful appearance throughout life
H2: Earns through communication/counseling, excellent with numbers
H3: Brilliant debater, active subconscious, multiple hobbies
H4: Home like playground, loves dealing/counting, "Baniya" energy
H5: Highly competitive in education, attracted to intellectual partners
H6: Thrives on routines (CA/HR/Finance), neurological care needed
H7: Playful marriages, early relationships, sibling-like spouse
H8: Self-serving in-laws, fraud via paperwork risk, health tied to bonuses
H9: Searches new ideas, analytical, frequent short travel
H10: Ultimate consultant — math/finance/coding/teaching
H11: Obsessed with finding income everywhere, multiple revenue streams
H12: Avoids communication in isolation, nervous exhaustion, disorganised

── JUPITER IN EACH HOUSE ──
H1: Blessed individual, spiritual, wise, non-jealous, magnetically positive
H2: Speaks with wisdom/vision, excels at banking/gold investing
H3: Slow processor but spiritual/wise, enjoys reading and teaching
H4: Pure airy home near nature, wise mother-teacher figure
H5: Exceptionally strong for education, children, blessings in creativity
H6: Stuck in jobs below worth, liver/weight issues, service orientation
H7: Marriage left to divine grace, spouse acts as guru, stable moral partner
H8: Prominent good in-laws, hidden visions of God, breathing care needed
H9: Highly moral, deep scripture understanding, noble father
H10: Teacher/counselor/minister, banking/judiciary, long company loyalty
H11: Friend of all, successful influential friends, luck-based income
H12: Blessed placement — peaceful sleep, divine faith, protected by grace

── VENUS IN EACH HOUSE ──
H1: Loves luxury/fashion, beautiful eyes, charming speech, refined aesthetics
H2: Excellent wealth accumulation, beautiful appearance, fine dining
H3: Refined communication, mind constantly on aesthetics/relationships
H4: Elegant sweet-smelling home, peace through beauty and deity service
H5: Strong love marriage indicator, success in medicine/fashion/occult
H6: Good for medical/art/interior design, kidney stone risk
H7: BLIND in 7th — marries based purely on physical attraction; needs family guidance. Beautiful sweet-natured partner.
H8: Wealthy in-laws, hidden affairs, urinary/STD concerns
H9: Devoted to aesthetic religion, beautiful father figure, luxurious travel
H10: Refined work environment — jewelry/cosmetics/fashion/aviation
H11: Obsessed with luxury brands, master marketers, betrayal risk
H12: Excellent spiritual devotion, heavy luxury spending, kidney care needed

── SATURN IN EACH HOUSE ──
H1: Hardworking, faces delays, requires sustained effort, delayed results
H2: Speaks slowly, early poverty, delays in wealth, frugal nature
H3: Industrial neighbourhood, workaholic, harsh/blunt communicator
H4: Older homes, heavy emotional pressure, emotionally dry
H5: Learns under immense pressure, attracted to humble/hardworking partners
H6: Brilliant government employee, slow but stable growth, Vata/bone issues
H7: Partner is slow/dutiful, treats marriage like a job, performance anxiety
H8: Lying secretive in-laws, hidden demanding profession, partial credit only
H9: Extreme hard-work belief, focuses on upliftment of poor, very late fortune
H10: Stable but demanding job, late success, dislikes change, extremely disciplined
H11: Desires stability, associates with lazy/unmotivated people, very late fulfillment
H12: Severe sleep deprivation, restrictive bedroom, must serve poor/spiritual guides

── RAHU IN EACH HOUSE ──
H1: Massive worldly desires, outsider feeling despite success, excellent networking luck
H2: Speaks without limits, desires massive wealth, drawn to Tamasic food
H3: Hustler mindset, wealthy aspirational neighbourhood, reckless risk-taking
H4: "King-size" everything at home, amplifies family arguments
H5: Obsessed with top ranks, unconventional relationships, quick wealth speculation
H6: Master of office politics, unusual hard-to-diagnose diseases, destroys enemies obsessively
H7: Intense marriage obsession, drawn to toxic/unconventional partners, physical intimacy obsession
H8: Politically aggressive in-laws, extra-marital tendencies, addiction risks
H9: Rebellious toward religion, fraud-willing for goals, DEVA DOSHA
H10: Career hustler, frequent job changes chasing quick money, unconventional rise
H11: Massive fame/wealth desires, artificial luxury, mother relationship can be toxic
H12: Foreign land obsession, internet scams risk, addictions, lavish bedroom

── KETU IN EACH HOUSE ──
H1: Introverted, spiritual, sparse words but they carry weight, anxiety-prone
H2: Few words, detached from family wealth, dental issues
H3: Easily irritated, loves trekking/occult/solitude, minimal social hobbies
H4: Minimal material attachment to home, prefers quiet simple spaces
H5: Research-oriented, searching for soulmate across lifetimes, past-life monk energy
H6: Dislikes office politics, natural healer, debt forces detachment
H7: Deep confusion about marriage, gets bored quickly, needs a spiritual partner
H8: Complete detachment from in-laws, inexpressive partner, suspicious undercurrent
H9: Highly intuitive about dharma, loves high-altitude temples, isolated sadhana
H10: Requires extreme career freedom, precision/detail work, frequent career breaks
H11: Only 50% of desires fulfilled, spiritual travel instantly granted, powerful intuition
H12: ULTIMATE MOKSHA placement, small simple feet, sleep struggles, completely detached

── SIGN IN 2ND HOUSE ──
Aries: Fast/logical/aggressive speech, struggles to save despite income
Taurus: Excellent wealth accumulation, stubborn about money, strong physical constitution
Gemini: Brilliant communicators, collects items and information, family can be self-serving
Cancer: Emotional family cycles, sweet speech, wealth tied to moods
Leo: Respected lineage, authoritative speech, strong values around justice
Virgo: Strict point-to-point speech, disputes over shared family resources
Libra: Balanced diplomatic speech, excellent resource manager
Scorpio: Secretive about money, quiet problem-solver, deep family grudges
Sagittarius: Wise minimal speech, knowledge stored as wealth, philosophical about money
Capricorn: Powerful practical speech, demanding family expectations
Aquarius: Big promises, networking-based income, sudden wealth OR fraud risk
Pisces: Spiritual abstract speech, tendency to give away personal resources

── SIGN IN 10TH HOUSE ──
Aries: New project initiator, heavy risk-taker, builds from ground up
Taurus: Resource/budget management, treasurer or diplomat roles
Gemini: Communication/data/writing/coordination careers
Cancer: Public welfare roles — banking, Navy, social work, emotional service
Leo: Demands power and position, uncomfortable with ground-level work
Virgo: Service-oriented analytical careers — healthcare, law, CA, audit
Libra: Client management, partnerships, aesthetics — fashion/jewelry/art
Scorpio: Research and transformation — astrology, surgery, data mining
Sagittarius: Strategy/advisory/official roles, refuses morally compromised work
Capricorn: Monopoly-builder, demands and sets boundaries, extremely ambitious
Aquarius: Large networks, mass media, AI, or systems work
Pisces: Foreign-land career, isolation work, high creativity, spiritual vocation

── SIGN IN 12TH HOUSE ──
Aries: Never gives up in isolation, aggressive meditation, high bedroom energy
Taurus: Fears financial losses, hides money, property dispute risk
Gemini: Active subconscious, sleep struggles, frequently loses documents
Cancer: Seeks emotional bedroom comfort, late-night eating patterns
Leo: Bedroom ego clashes, prefers separate sleeping, hidden acts
Virgo: Critical in private life, calculative expenses, structured donations
Libra: Hidden relationships, luxurious bedroom, compromise-required partnerships
Scorpio: Occult-filled bedroom, nightmares/insomnia, deep subconscious processing
Sagittarius: Highly spiritual, heavy temple donations, back/liver care
Capricorn: Traditional in private, hoards items, may build or donate to ashrams
Aquarius: Sleep disorders, electronics-filled bedroom, financial fraud losses
Pisces: Naturally giving, vivid prophetic dreams, strong sixth sense, easy detachment

── HOUSE RELATIONSHIP RULES ──
• 7th house = 4th from 4th (mother's moral values / emotional happiness)
• 7th house = 11th from 9th (father's wealth and desires)
• 8th house = 6th from 4th (mother's debts/diseases)
• 5th house = 5th from 5th (child's educational path)
• 12th house = 4th from 9th (father's peace of mind)
• 12th house = 9th from 4th (mother's fortune)
• 11th house = 8th from 4th (destroys domestic peace when obsessively pursued)

── FAMILY SIGNIFICATIONS ──
Younger siblings: H3 | Maternal uncle/aunt: H6 | Paternal uncle: H11
Paternal aunt (Bua): H6 | Father: H9/H10 | Mother: H4
Mother-in-law: H10 | In-laws (Sasural): H8 | Grandfather (paternal): H5
Maternal grandfather (Nana): H12 | Older siblings: H11

── FOUR PILLARS OF MARRIAGE ──
1. 7th house — is marriage promised and what is its nature?
2. Venus — quality and flavour of the marriage
3. 7th house lord's placement — how life changes after marriage
4. D9 (Navamsha) ascendant — overall fortune and spiritual rise through marriage

── DIRECTIONAL STRENGTH (DIGBALA) ──
Sun in 10th: Maximum directional strength — grants unparalleled career glory and fame

── CRITICAL KARMIC RULES ──
• 8th house Mercury: NEVER wrongly consume life insurance money from deceased persons
• Rahu in 9th: Deva Dosha — breaks ancestral/religious boundaries; remedial worship needed
• Venus in 7th: "Blind" to partner's flaws due to physical attraction; family must guide marriage
• 11th house: Its intense pursuit destroys inner peace (it is 8th from 4th)
• 10th house: Nishkam Karma — perform duty without attachment to results
• 8th house: Shows how life forces transformation when hitting rock bottom

── REMEDIES MENTIONED ──
Jupiter (H4 placement): Keep photo of Guru at home; donate clothes to sadhus
Saturn remedies: Donate shoes; selflessly serve the poor
Rahu H9: Worship Vishnu or ancestors to address Deva Dosha
Moon H12: Donate food/water for mental stability
Ketu H11: Spiritual travel instantly fulfills desires

═══════════════════════════════════════════
WRITING INSTRUCTIONS:
- Write ONE flowing paragraph, 150–220 words
- Second person: "You…", "Your…"
- Blend sign + planets in house + house lord placement + aspects into one narrative
- Reference specific planets and signs by name
- Include both gifts AND challenges of the placement
- Mention relevant family/career/health implications from the rules
- Sound like an insightful teacher, not a textbook
- No bullet points, no numbered lists, no headers
- End with something actionable or grounding
═══════════════════════════════════════════`

// ── Route handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json({ error: 'DEEPSEEK_API_KEY is not set in environment variables.' }, { status: 500 })
  }

  const { id } = await params

  let section = 'house1'
  try {
    const body = await req.json()
    section = body.section ?? 'house1'
  } catch { /* ignore */ }

  const chart = await prisma.chart.findUnique({
    where: { id },
    select: { calculatedPositions: true },
  })

  if (!chart) return NextResponse.json({ error: 'Chart not found' }, { status: 404 })
  if (!chart.calculatedPositions) {
    return NextResponse.json({ error: 'This chart has no calculated positions. Add birth coordinates first.' }, { status: 400 })
  }

  let calc: any = {}
  try { calc = JSON.parse(chart.calculatedPositions) } catch { /* ignore */ }

  const context = buildContext(section, calc)

  const sectionLabel = section.startsWith('house')
    ? `House ${section.replace('house', '')} of this chart`
    : `${section.replace('planet-', '')} in this chart`

  const userMessage = `Using the chart data below, write a creative blended paragraph interpreting ${sectionLabel}. Weave all the active factors together — do not just list them.

${context}`

  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 600,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      return NextResponse.json({ error: `OpenRouter error: ${errBody}` }, { status: 500 })
    }

    const data = await res.json()
    const text: string = data.choices?.[0]?.message?.content ?? ''
    return NextResponse.json({ prediction: text })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'OpenRouter API error' }, { status: 500 })
  }
}
