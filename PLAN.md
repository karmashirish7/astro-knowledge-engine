export# Astro Knowledge Engine — V1 Build Plan

> Philosophy: Data structure first. Research flow drives every feature.
> V1 is daily-usable when all 7 items are checked: chart saving, calculation, dictum creation, query filtering, research cards, observations, prediction journal.

---

## Current Status Snapshot

| Layer | Status |
|---|---|
| Chart model + PlanetaryData (flat columns) | ✅ Done |
| Swiss Ephemeris — Lahiri sidereal, 9 planets | ✅ Done |
| Nakshatra, Atmakaraka, Darakaraka | ✅ Done |
| DictumVerification (confirmed/refuted/partial/unclear) | ✅ Done |
| KnowledgeEntry + EntryRelation + Graph | ✅ Done |
| Dump Mode (rapid knowledge entry) | ✅ Done |
| Claude reading route (AI analysis) | ✅ Done |
| Vimshottari Dasha | ✅ Done |
| conditionsJson on Dictum | ✅ Done |
| Observation model | ✅ Done |
| Prediction model (formalized) | ✅ Done |
| AQL → Prisma query translator | ✅ Done |
| /research page | ✅ Done |
| /lib/astrology/ reorganization | ✅ Done |
| Dignity engine | ✅ Done |
| Aspect engine | ✅ Done |

---

## BLOCK 1 — Astrology Engine (`/lib/astrology/`)

> Prerequisite for everything. Must be done first.

### 1.1 Restructure lib

- [x] Create `/lib/astrology/` directory
- [x] Move `lib/ephemeris.ts` → `lib/astrology/calculations/positions.ts`
- [x] Move nakshatra logic → `lib/astrology/nakshatra/index.ts`
- [x] Move karaka logic → `lib/astrology/calculations/karakas.ts`
- [x] Create `lib/astrology/index.ts` (re-exports everything)
- [x] Update all imports across the codebase
- [x] Run `tsc --noEmit` — zero errors

### 1.2 Vimshottari Dasha Engine

- [x] Create `lib/astrology/dasha/types.ts`
  - `DashaPeriod { planet, level, startDate, endDate, durationYears }`
  - `DashaTree { mahadasha: DashaPeriod & { antardashas: (DashaPeriod & { pratyantardashas: DashaPeriod[] })[] } }[]`
- [x] Create `lib/astrology/dasha/vimshottari.ts`
  - [x] Define dasha sequence: Ketu(7) → Venus(20) → Sun(6) → Moon(10) → Mars(7) → Rahu(18) → Jupiter(16) → Saturn(19) → Mercury(17)
  - [x] `getMoonNakshatraBalance(moonLongitude)` → remaining years at birth
  - [x] `buildMahadashas(birthDate, moonLongitude)` → MD array with ISO start/end dates
  - [x] `buildAntardashas(md)` → nested AD within each MD
  - [x] `buildPratyantardashas(ad, mdDuration)` → PD within each AD
  - [x] `getCurrentDasha(dashaTree, date)` → `{ mahadasha, antardasha, pratyantardasha }`
  - [x] `getDashaAtDate(dashaTree, date)` → same as above for any target date
- [x] Create `lib/astrology/dasha/index.ts` (re-exports)
- [ ] Write unit test cases (manually verify: Moon in Ashwini → starts Ketu MD at birth)
- [x] Wire into chart creation: populate `planetaryData.dashaJson` on POST `/api/chart`
- [x] Wire into chart update: recalculate on PUT `/api/chart/[id]`
- [x] Expose via `GET /api/chart/[id]/dasha` route

### 1.3 Dignity Engine

- [x] Create `lib/astrology/calculations/dignity.ts`
  - [x] Define exaltation signs: Sun→Aries, Moon→Taurus, Mars→Capricorn, Mercury→Virgo, Jupiter→Cancer, Venus→Pisces, Saturn→Libra
  - [x] Define debilitation signs (opposites)
  - [x] Define own signs (moolatrikona + own)
  - [x] `getPlanetDignity(planet, sign)` → `'exalted' | 'debilitated' | 'own' | 'neutral'`
- [x] Store dignity per planet in `PlanetaryData` — add columns:
  - [x] Add `sunDignity`, `moonDignity`, `marsDignity`, `mercuryDignity`, `jupiterDignity`, `venusDignity`, `saturnDignity` to schema (String, default "")
  - [x] Run `prisma db push`
  - [x] Populate on chart create/update via `flattenToPlanetaryData`

### 1.4 Aspect Engine

- [x] Create `lib/astrology/calculations/aspects.ts`
  - [x] Whole-sign aspects: all planets aspect 7th from themselves (opposition)
  - [x] Mars special aspects: 4th and 8th
  - [x] Jupiter special aspects: 5th and 9th
  - [x] Saturn special aspects: 3rd and 10th
  - [x] `getPlanetAspects(planet, houseNumber)` → `number[]` (houses aspected)
  - [x] `doesPlanetAspectHouse(planet, planetHouse, targetHouse)` → `boolean`
  - [x] `getPlanetsAspectingHouse(houseNumber, planetHouseMap)` → `string[]`

---

## BLOCK 2 — Schema: Research & Intelligence Models

> One migration. All three models added together.

### 2.1 Update `Dictum` model

- [x] Add `conditionsJson String @default("{}")` to Dictum
  - Format: `{ "saturnHouse": 7, "marsInKendra": true, "ascNakshatra": "Ashwini" }`
- [x] Add `category String @default("")` to Dictum (planet / house / yoga / nakshatra / timing)
- [x] Add `verifiedCount Int @default(0)` (denormalized count — updated on verification saves)

### 2.2 Add `Observation` model

```prisma
model Observation {
  id         String   @id @default(cuid())
  chartId    String
  chart      Chart    @relation(fields: [chartId], references: [id], onDelete: Cascade)
  dictumId   String?
  dictum     Dictum?  @relation(fields: [dictumId], references: [id], onDelete: SetNull)
  statement  String
  status     String   // "true" | "false" | "unclear"
  confidence Int?     // 1–10
  category   String   @default("")  // personality | health | career | relationships | timing
  notes      String   @default("")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

- [x] Add model to `schema.prisma`
- [x] Add `observations Observation[]` relation to `Chart`
- [x] Add `observations Observation[]` relation to `Dictum`

### 2.3 Formalize `Prediction` model

- [x] Add model to `schema.prisma`:

```prisma
model Prediction {
  id             String    @id @default(cuid())
  chartId        String
  chart          Chart     @relation(fields: [chartId], references: [id], onDelete: Cascade)
  prediction     String
  predictedAt    DateTime  @default(now())
  targetDate     DateTime?
  resolvedAt     DateTime?
  outcome        String    @default("")  // "correct" | "incorrect" | "partial" | "pending"
  accuracy       Int?      // 1–10
  dashaContext   String    @default("")  // e.g. "Saturn MD / Venus AD"
  notes          String    @default("")
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}
```

- [x] Add `predictions Prediction[]` relation to `Chart`
- [x] Remove old `predictions String @default("[]")` JSON field from `Chart`
- [x] Run `prisma db push`
- [x] Regenerate Prisma client

### 2.4 API routes for new models

- [x] `GET/POST /api/observations` — list and create
- [x] `PUT/DELETE /api/observations/[id]` — update verdict/confidence, delete
- [x] `GET /api/observations?chartId=&dictumId=` — filter by chart or dictum
- [x] `GET/POST /api/predictions` — list and create
- [x] `PUT /api/predictions/[id]` — update outcome/accuracy (resolve a prediction)
- [x] `GET /api/predictions?chartId=&outcome=pending` — filter

---

## BLOCK 3 — Query Engine (`/lib/astrology/query/`)

> The core of Phase 2. Pure logic — no UI dependency.

### 3.1 AQL Type System

- [x] Create `lib/astrology/query/types.ts`
  - [x] `AQLOperator`: `eq | neq | in | notIn | gt | gte | lt | lte | between | contains`
  - [x] `AQLCondition { field, operator, value }`
  - [x] `AQLQuery { conditions: AQLCondition[], logic: 'AND' | 'OR' }`
  - [x] Semantic shorthand types: `PlanetInHouseCondition`, `PlanetInSignCondition`, `NakshatraCondition`, `DignityCondition`, `AspectCondition`, `KarakaCondition`

### 3.2 Field Mapping

- [x] Create `lib/astrology/query/fields.ts`
  - [x] Map all `PlanetaryData` column names
  - [x] Map semantic shorthands:
    - `marsInKendra` → `{ marsHouse: { in: [1,4,7,10] } }`
    - `marsInTrikona` → `{ marsHouse: { in: [1,5,9] } }`
    - `marsInDusthana` → `{ marsHouse: { in: [6,8,12] } }`
    - `sunExalted` → `{ sunSign: 'Aries' }`
    - `moonDebilitated` → `{ moonSign: 'Scorpio' }`
    - `marsAspectLagna` → `{ marsHouse: { in: [4,7,8,10] } }` (whole-sign)
    - `jupiterAspectLagna` → `{ jupiterHouse: { in: [5,7,9] } }`
    - `saturnAspectLagna` → `{ saturnHouse: { in: [3,7,10] } }`
    - `atmakaraka: 'Sun'` → `{ atmakaraka: 'Sun' }`

### 3.3 Translator

- [x] Create `lib/astrology/query/translator.ts`
  - [x] `aqlToPrisma(query: AQLQuery) → Prisma.ChartWhereInput`
  - [x] Handles AND/OR logic across conditions
  - [x] Resolves semantic shorthands via `fields.ts`
  - [x] Wraps result in `{ planetaryData: { ... } }`
  - [x] Test: `{ saturnHouse: 7 }` → `{ planetaryData: { saturnHouse: 7 } }`
  - [x] Test: `{ marsInKendra: true }` → `{ planetaryData: { marsHouse: { in: [1,4,7,10] } } }`
  - [x] Test: `{ ascNakshatra: 'Ashwini', sunExalted: true }` → combined AND

### 3.4 `conditionsJson` → AQL → Prisma pipeline

- [x] `conditionsJsonToPrisma(conditionsJson: string) → Prisma.ChartWhereInput` (in `translator.ts`)
  - [x] Used to find all charts matching a dictum's conditions

### 3.5 Query API route

- [x] Create `POST /api/research/query`
  - [x] Body: `{ conditions: AQLCondition[], logic: 'AND' | 'OR' }`
  - [x] Returns: charts with `planetaryData`, matched count, match percentage
  - [x] Include current dasha from `dashaJson` in each result

---

## BLOCK 4 — Research Page (`/app/research/`)

> The primary research interface. Replaces the limited Playground.

### 4.1 Query Builder UI

- [x] Create `/app/research/page.tsx` (`'use client'`)
- [x] Condition row component: `[Field dropdown] [Operator] [Value]`
  - [x] Field options grouped: Lagna / Sun / Moon / Mars / Mercury / Jupiter / Venus / Saturn / Rahu / Ketu / Karakas
  - [x] Shorthand options: "in Kendra", "in Trikona", "in Dusthana", "exalted", "debilitated", "aspects Lagna"
  - [x] AND/OR toggle between conditions
- [x] Add/remove condition rows
- [x] "Run Query" button → POST `/api/research/query`
- [ ] Save query as named filter (store in localStorage for now)

### 4.2 Fast Research Preview Cards

- [x] Create `components/research/ChartPreviewCard.tsx`
  - [x] Mini D1 kundali (`NorthIndianKundali` at scaled size)
  - [x] Asc sign + degree (from `planetaryData.ascSign`, `ascDegree`)
  - [x] Moon sign (from `planetaryData.moonSign`)
  - [x] Current Dasha: `{MD planet} / {AD planet}` (from `dashaJson`)
  - [x] Atmakaraka + Darakaraka
  - [x] Dictum match % (if queried from a dictum context)
  - [x] Tags (from `chart.tagsList`)
  - [x] Observation count + Prediction count
  - [x] One-click expand → full planetary dignity table
  - [x] Link to full chart → `/chart/[id]`
- [x] Results grid: responsive 1–2 columns
- [x] Results header: "X charts match"

### 4.3 Dictum-driven research

- [x] "Research this dictum" button on `/dictums` page → opens `/research` pre-loaded with dictum's `conditionsJson`
- [ ] Show verification stats on research results: confirmed N / refuted M / unverified K

---

## BLOCK 5 — Observation & Prediction UIs

> Lightweight additions to the chart page. Not separate pages.

### 5.1 Observation panel (in `/app/chart/[id]`)

- [x] Add "Observations" section to chart detail page
- [x] Create `components/charts/ObservationEntry.tsx`
  - [x] Statement input (free text)
  - [x] Status toggle: TRUE / FALSE / UNCLEAR
  - [x] Confidence input: 1–10
  - [x] Category select: personality / health / career / relationships / timing
  - [ ] Optional: link to dictum (searchable dropdown)
  - [x] Save → POST `/api/observations`
- [x] List existing observations for chart (filterable by category)
- [x] Edit status inline / delete observations
- [ ] Show observation count on chart cards everywhere

### 5.2 Prediction journal (in `/app/chart/[id]`)

- [x] Add "Predictions" section to chart detail page
- [x] Create `components/charts/PredictionEntry.tsx`
  - [x] Prediction text input
  - [x] Target date picker (optional)
  - [x] Dasha context (auto-populated from current dasha, editable)
  - [x] Save → POST `/api/predictions`
- [x] List predictions by status: Pending / Correct / Incorrect / Partial
- [x] "Resolve" action → set outcome + accuracy score
- [x] Show accuracy stats: "X/Y correct, Z% accuracy"

---

## BLOCK 6 — conditionsJson Tooling

> Makes dictums machine-queryable.

### 6.1 Dictum editor — add conditions builder

- [x] `ConditionsPanel` added to `/dictums` page (display + manual edit)
- [x] `POST /api/dictums/generate-conditions`
  - [x] Sends rule text to Claude Haiku
  - [x] Prompt: extract structured conditions as JSON from the rule
  - [x] Returns: `conditionsJson` draft for user to confirm/edit
- [x] Dictums API updated to handle `conditionsJson` + `category` updates

### 6.2 Backfill existing dictums

- [ ] Script: `scripts/backfill-conditions.ts`
  - [ ] Iterate all dictums with empty `conditionsJson`
  - [ ] For each: call Claude API with rule text
  - [ ] Write back generated `conditionsJson`
  - [ ] Dry-run mode + commit mode

---

## BLOCK 7 — Dasha Timeline Visualization (Phase 6, Step 13)

> Requires Block 1.2 (Vimshottari) to be complete first.

- [x] Create `components/charts/DashaTimeline.tsx` (wired as chart detail section)
  - [x] Horizontal timeline: birth → 120 years
  - [x] Color-coded Mahadasha bands (each planet gets a color)
  - [x] Antardasha subdivisions (shown for current/hovered MD)
  - [x] Overlay marker support (events / predictions / observations)
  - [x] "Today" marker
  - [ ] Click dasha period → shows which observations/predictions fall in it
- [x] Zoom: full life / 20 years / 5 years
- [ ] Dedicated `/app/chart/[id]/timeline` sub-route (currently a chart page section)

---

## BLOCK 8 — Statistical Research (Phase 6, Step 14)

> Requires Block 1–5 to be meaningfully useful.

- [ ] Create `/app/analytics/page.tsx`
- [ ] `POST /api/analytics/pattern`
  - [ ] Body: `{ conditions: AQLCondition[], observationPattern: string }`
  - [ ] Returns: `{ totalCharts, matchingCharts, observationMatches, percentage }`
  - [ ] Example: "How many charts with Moon+Ketu in 8th have anxiety observations?"
- [ ] Create `components/analytics/PatternCard.tsx`
  - [ ] Shows: condition set + observation pattern + match %
  - [ ] Save patterns for reuse
- [ ] Summary dashboard: top 10 most-confirmed dictums, top verified patterns

---

## BLOCK 9 — Database Migration to PostgreSQL

> Not urgent for V1. Do when deploying or when SQLite shows pain.

- [ ] Provision PostgreSQL (local: Docker, prod: Neon or Supabase)
- [ ] Update `schema.prisma`: `provider = "postgresql"`
- [ ] Update `DATABASE_URL` in `.env`
- [ ] Run `prisma migrate dev --name init` (creates migration from current schema)
- [ ] Add indexes for research queries:
  - [ ] `@@index([ascNakshatra])` on PlanetaryData
  - [ ] `@@index([marsHouse, saturnHouse])` composite
  - [ ] `@@index([atmakaraka])` on PlanetaryData
  - [ ] `@@index([chartId])` on Observation
  - [ ] `@@index([chartId, outcome])` on Prediction
- [ ] Test: run a 5-condition AQL query — should be fast with indexes

---

## Build Order (strict)

```
BLOCK 1 (1.1 → 1.2 → 1.3 → 1.4)   ✅ complete
    ↓
BLOCK 2 (2.1 → 2.2 → 2.3 → 2.4)   ✅ complete
    ↓
BLOCK 3 (3.1 → 3.2 → 3.3 → 3.4 → 3.5)  ✅ complete
    ↓
BLOCK 4 (4.1 → 4.2 → 4.3)          ✅ complete
    ↓
BLOCK 5 (5.1 → 5.2)                ✅ complete
    ↓
BLOCK 6 (6.1 → 6.2)                ✅ 6.1 done / 6.2 pending
    ↓
BLOCK 7                             ✅ core done / sub-route + click-through pending
    ↓
BLOCK 8                             ⬜ not started
    ↓
BLOCK 9                             ⬜ not started (production only)
```

---

## Definition of V1 Complete

- [x] Can save a chart with full birth data
- [x] Chart auto-calculates all 9 planets + lagna + nakshatras + dasha
- [x] Can create a dictum with `conditionsJson`
- [x] Can run a query: "find all charts where Saturn in 7th AND Moon in Water sign"
- [x] Results show mini kundali + current dasha + match % without opening full chart
- [x] Can add an observation to a chart (TRUE/FALSE + confidence)
- [x] Can add a prediction with target date and dasha context
- [x] Can resolve a prediction with outcome + accuracy score
