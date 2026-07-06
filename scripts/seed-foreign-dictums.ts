// Seeds the starter "Foreign Travel / Study / Employment" predictive knowledge
// base used by the Dasha Lab playground (app/playground/dasha-lab).
// These are classical Vedic astrology dasha-timing rules — a starting point.
// Run with: npx tsx scripts/seed-foreign-dictums.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface SeedDictum {
  rule: string
  interpretation: string
  category: 'foreign-travel' | 'foreign-study' | 'foreign-employment'
  strength: 'Strong' | 'Conditional' | 'Exception'
  conditions: Record<string, unknown>
}

const SOURCE = 'Classical Vedic Astrology (seed)'

const DICTUMS: SeedDictum[] = [
  // ── Foreign Travel ──────────────────────────────────────────────────────
  {
    rule: 'Dasha of the 12th lord brings foreign travel or relocation abroad.',
    interpretation: 'The 12th house governs foreign lands and life beyond one\'s native place; its dasha lord activates departure and settlement abroad.',
    category: 'foreign-travel', strength: 'Strong',
    conditions: { dashaPlanetRulesHouse: [12] },
  },
  {
    rule: 'Dasha of the 9th lord brings long-distance journeys, often overseas.',
    interpretation: 'The 9th house rules long journeys and foreign connections (Bhagya); its dasha lord triggers travel across distant lands.',
    category: 'foreign-travel', strength: 'Conditional',
    conditions: { dashaPlanetRulesHouse: [9] },
  },
  {
    rule: 'Dasha of Rahu frequently triggers sudden, unplanned foreign travel or migration.',
    interpretation: 'Rahu signifies foreign lands, outsiders and sudden disruption; its periods often pull the native abroad with little warning.',
    category: 'foreign-travel', strength: 'Strong',
    conditions: { dashaPlanetIn: ['Rahu'] },
  },
  {
    rule: 'Dasha of a planet placed in the 12th house often coincides with travel or settlement abroad.',
    interpretation: 'A planet natally seated in the 12th house carries the "foreign land" signification into its own dasha period.',
    category: 'foreign-travel', strength: 'Strong',
    conditions: { dashaPlanetHouse: [12] },
  },
  {
    rule: 'Dasha of a planet placed in the 9th house often brings foreign connections and travel.',
    interpretation: 'A planet seated in the 9th house carries long-journey and foreign-fortune significations into its dasha.',
    category: 'foreign-travel', strength: 'Conditional',
    conditions: { dashaPlanetHouse: [9] },
  },
  {
    rule: 'Moon conjunct Rahu in the natal chart, activated by the dasha of either, frequently causes sudden travel abroad.',
    interpretation: 'Chandra-Rahu conjunction unsettles the mind and pulls it toward foreign/unfamiliar places; either planet\'s dasha can trigger the move.',
    category: 'foreign-travel', strength: 'Strong',
    conditions: { dashaPlanetIn: ['Moon', 'Rahu'], conjunctWith: ['Rahu', 'Moon'] },
  },
  {
    rule: 'Saturn and Rahu sharing dasha/antardasha (in either order) often forces relocation to a foreign land for an extended period.',
    interpretation: 'Saturn gives the long, demanding duration while Rahu supplies the foreign-land trigger — together they produce extended stays abroad.',
    category: 'foreign-travel', strength: 'Conditional',
    conditions: { dashaCombo: ['Saturn', 'Rahu'] },
  },
  {
    rule: 'Dasha of Ketu can bring sudden detachment from the homeland and travel to far-off or spiritually significant foreign lands.',
    interpretation: 'Ketu severs attachment to the familiar and is associated with foreign, isolated, or pilgrimage-like destinations.',
    category: 'foreign-travel', strength: 'Conditional',
    conditions: { dashaPlanetIn: ['Ketu'] },
  },

  // ── Foreign Study ───────────────────────────────────────────────────────
  {
    rule: 'Dasha of the 9th lord, especially Jupiter, supports higher education abroad.',
    interpretation: 'The 9th house rules higher learning and foreign connections; its lord\'s dasha opens doors to overseas study.',
    category: 'foreign-study', strength: 'Strong',
    conditions: { dashaPlanetRulesHouse: [9] },
  },
  {
    rule: 'Jupiter\'s dasha, when Jupiter is natally placed in the 9th or 12th house, grants opportunities to study overseas.',
    interpretation: 'Jupiter rules higher knowledge; placed in 9th (foreign learning) or 12th (foreign land), its dasha delivers overseas admission.',
    category: 'foreign-study', strength: 'Strong',
    conditions: { dashaPlanetIn: ['Jupiter'], dashaPlanetHouse: [9, 12] },
  },
  {
    rule: 'Mercury\'s dasha activates documentation, applications and visas needed for study abroad.',
    interpretation: 'Mercury governs paperwork, communication and exams — the practical machinery behind a foreign study admission.',
    category: 'foreign-study', strength: 'Conditional',
    conditions: { dashaPlanetIn: ['Mercury'] },
  },
  {
    rule: 'Rahu and Jupiter sharing dasha/antardasha indicates a foreign scholarship or admission to a prestigious overseas institution.',
    interpretation: 'Jupiter supplies the academic merit, Rahu supplies the foreign-land pull — together they produce a notable overseas opportunity.',
    category: 'foreign-study', strength: 'Conditional',
    conditions: { dashaCombo: ['Rahu', 'Jupiter'] },
  },
  {
    rule: 'Dasha of the 5th lord combined with a strong 9th/12th house influence often supports overseas higher studies.',
    interpretation: 'The 5th house governs intelligence and education; paired with the 9th/12th house\'s foreign signification, it sends the native abroad to study.',
    category: 'foreign-study', strength: 'Conditional',
    conditions: { dashaPlanetRulesHouse: [5], dashaPlanetHouse: [12] },
  },

  // ── Foreign Employment ──────────────────────────────────────────────────
  {
    rule: 'Dasha of the 10th lord, when natally placed in the 12th house, frequently brings employment opportunities abroad.',
    interpretation: 'The 10th house is career; seated in the 12th (foreign land), its dasha lord carries the native\'s career overseas.',
    category: 'foreign-employment', strength: 'Strong',
    conditions: { dashaPlanetRulesHouse: [10], dashaPlanetHouse: [12] },
  },
  {
    rule: 'Saturn\'s dasha, especially when Saturn is placed in the 12th house, supports steady employment in a foreign land.',
    interpretation: 'Saturn gives disciplined, long-term work; in the 12th house this manifests as stable employment abroad.',
    category: 'foreign-employment', strength: 'Strong',
    conditions: { dashaPlanetIn: ['Saturn'], dashaPlanetHouse: [12] },
  },
  {
    rule: 'Rahu and Saturn sharing dasha/antardasha often forces a person abroad for long-term employment, away from their comfort zone.',
    interpretation: 'Rahu pulls toward foreign lands, Saturn provides the sustained job/duty — together they produce extended foreign employment.',
    category: 'foreign-employment', strength: 'Conditional',
    conditions: { dashaCombo: ['Rahu', 'Saturn'] },
  },
  {
    rule: 'Venus dasha, when Venus is placed in the 7th or 12th house, can bring foreign employment tied to partnerships, aesthetics or service industries.',
    interpretation: 'Venus rules partnership and refinement; in 7th/12th house its dasha can place the native in foreign-facing service or creative work.',
    category: 'foreign-employment', strength: 'Conditional',
    conditions: { dashaPlanetIn: ['Venus'], dashaPlanetHouse: [7, 12] },
  },
  {
    rule: 'Mercury\'s dasha, when Mercury rules the 10th or 11th house, activates visa/work-permit processing for an overseas job.',
    interpretation: 'Mercury handles paperwork and negotiation; ruling career (10th) or gains (11th), its dasha pushes through the foreign job process.',
    category: 'foreign-employment', strength: 'Conditional',
    conditions: { dashaPlanetIn: ['Mercury'], dashaPlanetRulesHouse: [10, 11] },
  },
]

async function main() {
  console.log('Seeding foreign travel/study/employment knowledge base...')
  let created = 0
  for (const d of DICTUMS) {
    const exists = await prisma.dictum.findFirst({ where: { rule: d.rule } })
    if (exists) { console.log(`  skip (exists): ${d.rule.slice(0, 60)}...`); continue }
    await prisma.dictum.create({
      data: {
        rule: d.rule,
        entities: JSON.stringify([]),
        interpretation: d.interpretation,
        tags: JSON.stringify([]),
        strength: d.strength,
        source: SOURCE,
        category: d.category,
        conditionsJson: JSON.stringify(d.conditions),
      },
    })
    created++
    console.log(`  + [${d.category}] ${d.rule.slice(0, 60)}...`)
  }
  console.log(`\nDone — ${created} new dictums created (${DICTUMS.length} total in seed set).`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
