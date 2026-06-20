# Expand the university pool (~57 → ~800) from THE 2026 rankings

## Context

The Search comparison pool currently has only **57 universities** across 20
countries — that's all the rows in the small `world_university_rankings_2026.csv`.
After exposing the Asia/LatAm/Africa region filters (v11), those regions feel
empty: Latin America and Africa have **1 university each**. The user wants "even
more".

A far larger source is already on disk: **`THE World University Rankings
2016-2026.csv`** (16,713 rows). Its 2026 slice has **2,191 universities across
174 countries**, of which **1,811 fall in the 50 countries the pipeline can fully
enrich** (every one of those 50 already has a region + flag in `COUNTRY_META` and
tuition in `tuition_fees_50_countries.csv` — no "Other" bucket, no missing flags).

Decision (confirmed with user): add a **balanced ~800** — top ~20 per country —
for the best global spread without the US/UK dominating, and handle THE's missing
fields **honestly** (THE has no per-university city, employer reputation, or
founding year).

Outcome: every region/field filter returns a rich, ranked set; LatAm/Africa/Asia
fill out; flagship universities keep their existing curated data.

## Approach

All data work happens in **`frontend/scripts/build-data.mjs`**; one tiny display
fix in `UniversityCard.jsx`. The existing 57 enriched records are preserved as an
overlay (real cities, employer rep, founded, qsScore); THE supplies breadth.

### 1. Add the THE source CSV (pre-filtered, committed for reproducible builds)
- `/tmp/ds/...` is not durable, so commit a trimmed source into the repo.
- Create **`frontend/scripts/data/the_rankings_2026.csv`** containing only the
  2026 rows (~2,191) — header + `Rank,Name,Country,...,Year`.
- Register it in `SRC`: `the: firstExisting([path.join(__dirname,'data/the_rankings_2026.csv')])`.

### 2. Normalize THE country names → pipeline canonical
- Add `const THE_COUNTRY = { 'United States':'USA', 'United Kingdom':'UK', 'Russian Federation':'Russia' };`
  then `theCountry = c => THE_COUNTRY[c] || c`.
- Reuse the existing 50-country tuition/`COUNTRY_META` set as the "enrichable"
  allow-list (countries already keyed in `countryByName`).

### 3. Build the capped THE pool (~800)
- Parse `SRC.the`; keep rows where `Year===2026`, `Overall Score` is numeric, and
  `theCountry(Country)` is in `countryByName`.
- Sort by `Rank` ascending; keep **top ~20 per country** (`CAP=20` → ~780; tune to
  land near 800). This guarantees famous schools first and an even global spread.
- Map each row to the existing university object shape:
  - `name`, `country=theCountry(...)`, `iso2`, `region`, `city: null`
  - `bestRank/theRank` = `num(Rank)`; `qsScore` = `num(Overall Score)` (0–100
    prestige proxy so `degreeScore` in `lib/scoring.js` works unchanged);
    `teaching` = `num(Teaching)`; `employerRep: null`, `founded: null`
  - economics from `countryByName[country]` (real tuition/cost/scholarship)
  - `monthlyCost: monthlyCostFor(country, null)` → country-average fallback
    (already implemented in `monthlyCostFor`)
  - `fields: fieldsFor(name)` (existing seeded heuristic), `erasmus` + lifestyle
    via existing `seededScore` (unchanged honest placeholders)

### 4. Dedup against the 57 enriched records (keep the rich version)
- Add `normName = s => s.toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]/g,'')`.
- Add a curated **`ALIAS`** map for the 31 abbreviated existing names that don't
  normalize-match THE (e.g. `MIT`→`Massachusetts Institute of Technology`,
  `NUS Singapore`→`National University of Singapore`, `Univ of Chicago`→
  `University of Chicago`, `UCLA`→`University of California, Los Angeles`, …).
  Full list of 31 is known from exploration.
- Build a `Set` of enriched normalized keys (each record's own `normName` plus its
  `ALIAS` target). Drop any THE-pool entry whose `normName` is in that set.
- Final pool = `[...enriched57, ...thePoolDeduped]` → write `universities.json`.
  (The 26 auto-matching + 31 aliased flagships collapse to one enriched record
  each; net total ≈ 800.)

### 5. Honest display for city-less records — `frontend/src/components/UniversityCard.jsx`
- Line ~40 location row currently renders `` `${data.city}` ``; change to
  `{data.city || data.country}` so THE records show their country instead of
  "null". Everything else already degrades gracefully:
  - employer-rep `<Metric>` is already conditional (`data.employerRep != null`)
  - `осн.` founded chip is already conditional (`data.founded`)
  - `#N свят` rank chip shows from `bestRank`

No changes needed to `scoring.js` (qsScore feeds `degreeScore`), `PentominoResults`,
`Search.jsx` region filter, or the field autocompletes.

## Critical files
- `frontend/scripts/build-data.mjs` — all ingestion/merge/dedup logic
- `frontend/scripts/data/the_rankings_2026.csv` — **new** committed source
- `frontend/src/components/UniversityCard.jsx` — city→country fallback (1 line)
- (reused, unchanged) `frontend/src/lib/scoring.js`, `tuition_fees_50_countries.csv`,
  `cost-of-living_v2.csv`, `COUNTRY_META`

## Verification
1. `npm run build` (in `frontend/`) — expect log `universities: ~800`, build clean.
2. Sanity-check the JSON:
   - `node -e "u=require('./src/data/universities.json');console.log(u.length); const r={};u.forEach(x=>r[x.region]=(r[x.region]||0)+1);console.log(r)"`
     → ~800 total; Latin America / Africa / Asia now in the dozens+.
   - Assert **no** record has `region:'Other'` or `iso2:'un'`; assert flagship
     names (MIT, Oxford) appear **once** and retain `city`/`employerRep`.
3. Browser dogfood on the deployed site (after `openkbs site deploy`):
   - Field "Компютърни науки" + region **Латинска Америка** → 4 populated corner
     cards (no more single result); cards show country (not a fake city), a world
     rank, and country-level издръжка.
   - Region **Азия** and **Африка** likewise return full pentominoes.
   - A flagship (e.g. MIT via region САЩ) still shows its real city + employer rep.
4. Commit (`feat: expand university pool to ~800 from THE 2026 rankings`) then
   `openkbs site deploy` (frontend-only; the `api` function is unchanged).
