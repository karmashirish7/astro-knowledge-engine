import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ENTRIES = [
  {
    title: 'Saturn in 7th House',
    description: 'Saturn placed in the 7th house (Yuvati Bhava) significantly influences marriage and partnerships. This placement often delays marriage but when it does occur, it tends to be stable and long-lasting. The native may have a serious, older, or duty-conscious partner. Saturn here teaches lessons through relationships.',
    category: 'Planets',
    tags: ['Saturn', '7th House', 'Marriage', 'Delay', 'Karma'],
    dictums: [
      'Saturn in 7th delays marriage but gives stability once married',
      'Saturn in 7th indicates a partner who is older or more mature',
      'This placement gives longevity in marriage through discipline',
    ],
    examples: ['Native married at age 35, spouse was 8 years older, marriage lasted 40+ years'],
    source: 'BPHS Chapter 24',
  },
  {
    title: 'Jupiter in 5th House',
    description: 'Jupiter in the 5th house (Putra Bhava) is considered one of the most auspicious placements. It blesses the native with intelligence, good children, creative abilities, and spiritual inclinations. This placement enhances learning, devotion, and past-life merits (poorva punya). The native is often philosophical and fortunate.',
    category: 'Planets',
    tags: ['Jupiter', '5th House', 'Children', 'Intelligence', 'Fortune'],
    dictums: [
      'Jupiter in 5th house blesses with intelligent and pious children',
      'Guru in Putra Bhava enhances poorva punya (past life merits)',
      'This placement gives natural teaching and wisdom-sharing abilities',
    ],
    examples: ['Famous teachers and spiritual leaders often have Jupiter in 5th'],
    source: 'Parashara Hora Shastra',
  },
  {
    title: 'Rohini Nakshatra',
    description: 'Rohini is the 4th Nakshatra, ruled by the Moon and located in Taurus. It is considered one of the most beloved Nakshatras — even the Moon loves to be here (it is Moon\'s favorite). Rohini natives are attractive, artistic, materialistic, and have strong sensual pleasures. They love luxury, beauty, and comfort.',
    category: 'Nakshatras',
    tags: ['Rohini', 'Moon', 'Taurus', 'Nakshatra', 'Luxury'],
    dictums: [
      'Rohini Nakshatra natives are highly attractive and pleasure-loving',
      'Moon in Rohini gives exceptional aesthetic sense and material comforts',
    ],
    examples: [],
    source: 'Nakshatra wisdom from classical texts',
  },
  {
    title: 'Rahu in 1st House (Lagna)',
    description: 'Rahu in the Lagna creates an unusual, unconventional personality. The native often has foreign connections, unusual habits, or a personality that is hard to categorize. Rahu amplifies the qualities of the Lagna sign and can make the person restless, ambitious, and somewhat deceptive. There may be confusion about identity.',
    category: 'Planets',
    tags: ['Rahu', 'Lagna', '1st House', 'Foreign', 'Unconventional'],
    dictums: [
      'Rahu in Lagna gives foreign connections and unconventional personality',
      'Shadow planet in 1st house creates identity confusion and restlessness',
    ],
    examples: [],
    source: 'Modern Vedic Astrology',
  },
  {
    title: 'Raja Yoga',
    description: 'Raja Yoga is formed when the lords of Kendra houses (1, 4, 7, 10) and Trikona houses (1, 5, 9) are conjunct, exchange signs, or aspect each other. This combination elevates the native to positions of power, authority, and success. The strength of Raja Yoga depends on the planets involved and their dignity.',
    category: 'Yogas',
    tags: ['Raja Yoga', 'Kendra', 'Trikona', 'Power', 'Success', 'Authority'],
    dictums: [
      'Raja Yoga between Kendra and Trikona lords gives power and authority',
      'The native rises to high positions during the dasha of Raja Yoga planets',
    ],
    examples: ['Politicians and CEOs often have strong Raja Yogas'],
    source: 'BPHS Yoga Chapter',
  },
  {
    title: 'Moon in Cancer',
    description: 'Moon in its own sign Cancer (Karka) is exceptionally strong. This placement gives deep emotional intelligence, nurturing qualities, strong intuition, and attachment to home and mother. The native is empathetic, imaginative, and may be psychic. They feel deeply and their moods fluctuate with the lunar cycle.',
    category: 'Planets',
    tags: ['Moon', 'Cancer', 'Karka', 'Emotion', 'Intuition', 'Strong'],
    dictums: [
      'Moon in Cancer is in its own sign — gives strong emotional intelligence',
      'Chandra in Karka blesses with nurturing personality and good mother',
    ],
    examples: [],
    source: 'Classical Vedic texts',
  },
  {
    title: '10th House (Karma Bhava)',
    description: 'The 10th house represents career, profession, father, authority, fame, and social status. It is the most public house in the chart. Strong planets here or a strong 10th lord give career success and recognition. Malefics here can indicate struggles with authority or unconventional careers.',
    category: 'Houses',
    tags: ['10th House', 'Karma Bhava', 'Career', 'Father', 'Fame', 'Authority'],
    dictums: [
      '10th house represents karma and career — the most visible area of life',
      'Strong 10th lord in good houses gives career success and social recognition',
    ],
    examples: [],
    source: 'Classical House significations',
  },
  {
    title: 'Vimshottari Dasha',
    description: 'Vimshottari Dasha is the most commonly used dasha system in Vedic astrology. It is a 120-year cycle based on the Moon\'s Nakshatra at birth. The sequence is: Ketu (7), Venus (20), Sun (6), Moon (10), Mars (7), Rahu (18), Jupiter (16), Saturn (19), Mercury (17) years. Each planet\'s dasha activates its natal promise.',
    category: 'Dashas',
    tags: ['Vimshottari', 'Dasha', 'Mahadasha', 'Timing', 'Moon Nakshatra'],
    dictums: [
      'Vimshottari Dasha activates the natal promise of each planet during its period',
      'The natal Nakshatra of Moon determines the starting dasha at birth',
    ],
    examples: [],
    source: 'BPHS Dasha System',
  },
]

const DICTUMS = [
  { rule: 'Saturn in 7th delays marriage but gives stability', strength: 'Strong', interpretation: 'Saturn\'s slow nature delays commitment but ensures lasting bonds', source: 'Classical wisdom' },
  { rule: 'Jupiter in 5th blesses with intelligent children', strength: 'Strong', interpretation: 'Jupiter\'s expansive wisdom enhances 5th house matters', source: 'BPHS' },
  { rule: 'Rahu in Lagna gives foreign connections', strength: 'Conditional', interpretation: 'Depends on sign and aspects; stronger in Gemini or Virgo', source: 'Modern Vedic' },
  { rule: 'Moon in Cancer gives strong emotional intelligence', strength: 'Strong', interpretation: 'Own sign placement is most powerful for Moon', source: 'Classical' },
  { rule: 'Benefics in Kendra give wealth and happiness', strength: 'Strong', interpretation: 'Angular houses (1,4,7,10) are most powerful for planets', source: 'BPHS' },
  { rule: 'Exalted planets give exceptional results in their Dasha', strength: 'Conditional', interpretation: 'The dasha period activates the natal promise of the planet', source: 'Classical Vedic' },
  { rule: 'Ketu in 12th house gives spiritual liberation and moksha', strength: 'Conditional', interpretation: 'Depends on overall chart; spiritual inclinations are strong', source: 'Ancient texts' },
  { rule: '6th house malefics defeat enemies and give competitive success', strength: 'Strong', interpretation: 'Dusthana placement of natural malefics can be beneficial', source: 'BPHS' },
]

async function main() {
  console.log('🌟 Seeding Astro Knowledge Engine...')

  await prisma.knowledgeEntry.deleteMany()
  await prisma.dictum.deleteMany()
  await prisma.entryRelation.deleteMany()

  const created: string[] = []
  for (const e of ENTRIES) {
    const entry = await prisma.knowledgeEntry.create({
      data: {
        title: e.title,
        description: e.description,
        category: e.category,
        tags: JSON.stringify(e.tags),
        dictums: JSON.stringify(e.dictums),
        examples: JSON.stringify(e.examples),
        source: e.source,
      },
    })
    created.push(entry.id)
    console.log(`  ✓ ${e.title}`)
  }

  for (const d of DICTUMS) {
    await prisma.dictum.create({
      data: {
        rule: d.rule,
        entities: JSON.stringify([]),
        interpretation: d.interpretation,
        tags: JSON.stringify([]),
        strength: d.strength,
        source: d.source,
      },
    })
  }

  // Create some relations
  if (created.length >= 2) {
    await prisma.entryRelation.create({
      data: { fromId: created[0], toId: created[4], relationLabel: 'affects', weight: 0.8 },
    }).catch(() => {})
    await prisma.entryRelation.create({
      data: { fromId: created[1], toId: created[4], relationLabel: 'contributes to', weight: 0.9 },
    }).catch(() => {})
    await prisma.entryRelation.create({
      data: { fromId: created[2], toId: created[5], relationLabel: 'nakshatra of', weight: 1.0 },
    }).catch(() => {})
  }

  console.log(`\n✨ Seeded ${ENTRIES.length} knowledge entries, ${DICTUMS.length} dictums`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
