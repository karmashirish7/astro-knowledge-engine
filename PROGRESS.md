# Build Progress

## Block 1 — Astrology Engine ✅
- [x] 1.1 Lib restructure → `/lib/astrology/` (calculations, nakshatra, dasha, query, utils)
- [x] 1.2 Vimshottari Dasha engine (full MD/AD/PD tree, serialization, getCurrentDasha)
- [x] 1.3 Dignity engine (exalted/debilitated/own/moolatrikona per planet)
- [x] 1.4 Aspect engine (whole-sign + Mars/Jupiter/Saturn special aspects)

## Block 2 — Schema: Research & Intelligence Models ✅
- [x] 2.1 `conditionsJson` + `category` + `verifiedCount` on Dictum
- [x] 2.2 `Observation` model (statement + status + confidence + category)
- [x] 2.3 `Prediction` model (formalized with outcome + accuracy + dashaContext)
- [x] 2.4 Planet dignities added to PlanetaryData schema
- [x] 2.5 API routes: `/api/observations`, `/api/observations/[id]`
- [x] 2.6 API routes: `/api/predictions`, `/api/predictions/[id]`
- [x] 2.7 API route: `/api/chart/[id]/dasha`

## Block 3 — Query Engine ✅
- [x] 3.1 AQL type system (`lib/astrology/query/types.ts`)
- [x] 3.2 Field mapping with semantic shorthands (`lib/astrology/query/fields.ts`)
- [x] 3.3 AQL → Prisma translator (`lib/astrology/query/translator.ts`)
- [x] 3.4 `conditionsJson` → Prisma pipeline
- [x] 3.5 `POST /api/research/query` route (returns charts + current dasha)

## Block 4 — Research Page ✅
- [x] 4.1 `/app/research/page.tsx` — query builder + dictum-driven search
- [x] 4.2 `components/research/ChartPreviewCard.tsx` — mini kundali + dasha + dignity
- [x] 4.3 Research link on Dictums page ("Research this dictum")
- [x] Research added to sidebar navigation

## Block 5 — Observation & Prediction UIs ✅
- [x] 5.1 `components/charts/ObservationEntry.tsx` — TRUE/FALSE/UNCLEAR + confidence
- [x] 5.2 `components/charts/PredictionEntry.tsx` — record + resolve with accuracy
- [x] 5.3 Wired into chart detail page as dedicated sections

## Block 6 — conditionsJson Tooling ✅
- [x] 6.1 `ConditionsPanel` in dictums page (display + manual edit)
- [x] 6.2 `POST /api/dictums/generate-conditions` — Claude Haiku extracts conditions from rule text
- [x] 6.3 Dictums API updated to handle conditionsJson updates

## Block 7 — Dasha Timeline Visualization ✅
- [x] 7.1 `components/charts/DashaTimeline.tsx` — color-coded MD + AD bands
- [x] 7.2 Zoom controls (Full Life / 20y / 5y)
- [x] 7.3 Today marker, event overlay support, planet legend
- [x] 7.4 Wired into chart detail page as "Dasha Timeline" section

---

## V1 Checklist
- [x] Chart saving + calculation (Swiss Ephemeris, Lahiri sidereal)
- [x] Nakshatra, atmakaraka, darakaraka, dignity calculated and stored
- [x] Vimshottari Dasha (full tree, current MD/AD/PD)
- [x] Dictum creation with conditionsJson (manual + AI-generated)
- [x] Query filtering (AQL builder + dictum-driven research)
- [x] Research preview cards (mini kundali + dasha + match %)
- [x] Observations (TRUE/FALSE/UNCLEAR + confidence + category)
- [x] Prediction journal (record + resolve + accuracy tracking)
- [x] Dasha timeline visualization

## Restart dev server required
Run `npm run dev` — the Prisma client singleton needs a fresh process to pick up
the new schema (Chart, PlanetaryData, Observation, Prediction, DictumVerification).

---
_Completed: 2026-05-07_
