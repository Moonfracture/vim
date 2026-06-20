# University Comparison Assistant — Implementation Plan

## Context

The whiteboards describe a "Universität Information" tool whose goal (Цел) is to answer:
**"Does it make financial and academic sense to move to another country to study?"**
It compares prices, reviews and specialties across: tuition (такса), scholarships
(стипендия), teacher/school reviews (отзиви), degree type/duration (продължителност /
вид диплома — Бак./Маг.), career outcomes (опции за реализация), location (регион/
местоположение) and average rent (среден наем).

The prompt: given a student from a **home country** considering a **target country**
to study a **field**, compare **total cost (tuition + rent)**, **scholarship
availability**, **teaching quality**, **graduate employment rate**, and **ranking**,
then give a clear recommendation.

Data comes from the real datasets the user listed (tuition, scholarships,
RateMyProfessor reviews, all-universities, world rankings, graduate employment,
Numbeo cost of living, WHED). These are behind authenticated downloads, so **the user
will upload the CSVs**; this app ingests them into Postgres.

Current state: fresh OpenKBS scaffold — `functions/api/index.mjs` (hello/status stub),
`site/index.html` (placeholder), `postgres: false` in `openkbs.json`.

## Architecture

- **Postgres** (enable in `openkbs.json`) — normalized store for the seven data domains.
- **`functions/api`** — comparison API (`pg` pool + Anthropic via AI proxy for the
  recommendation narrative, grounded in queried numbers).
- **`functions/api/scripts/import.mjs`** — Node importer run from the agent container
  against `openkbs postgres connection`, with per-dataset column mappings + a fuzzy
  header matcher (finalized once real CSVs land).
- **`site/`** — polished vanilla SPA (academic/editorial design): home → target →
  field → level selectors, side-by-side comparison, ranked university list, AI verdict.

## Data model (Postgres)

```
universities(id, name, country, region, world_rank, overall_score,
             teaching_score, employer_reputation_score)
programs(id, university_id, field, study_level, degree_type,
         duration_years, tuition_year, currency)        -- tuition + all-universities
scholarships(id, country, university_id?, field?, name, amount, level, url)
cost_of_living(id, country, city, monthly_rent, cost_index)   -- Numbeo
professor_reviews(id, university, department, avg_rating, num_reviews) -- RateMyProfessor
employment_outcomes(id, country, field, study_level, employment_rate, avg_salary)
```
Schema lives in `functions/api/scripts/schema.sql`; importer runs it then loads CSVs.

## API (`functions/api/index.mjs`, action-based)

- `options` — distinct countries, fields, study levels for the dropdowns.
- `compare` — input `{ homeCountry, targetCountry, field, studyLevel }`. Aggregates per
  country+field+level:
  - **total cost** = avg tuition/yr × duration + avg monthly rent × 12 × duration
  - **scholarships** = count + sample for target country/field
  - **teaching quality** = avg teaching_score + RateMyProfessor rating
  - **employment** = graduate employment rate (+ avg salary)
  - **ranking** = best/median world rank of matching universities
  Returns home-vs-target metrics, top matching universities, and a **claude-sonnet-4-6**
  recommendation grounded strictly in those numbers (proxy at `proxy.openkbs.com`,
  `Authorization: Bearer OPENKBS_API_KEY`).

## Frontend (`site/`)

`index.html`, `styles.css`, `app.js`. Refined editorial/academic aesthetic — distinctive
display + body font pairing, a dominant color with sharp accent, generous whitespace,
staggered load animation, real inline SVG icons. Flow: pick home/target/field/level →
comparison view with metric cards (cost, scholarships, teaching, employment, ranking) for
both countries side-by-side, a verdict banner, and the ranked university list.
`API_BASE` starts as `/api`, switched to the direct Lambda URL after first deploy.

## Build order

1. Enable `postgres` in `openkbs.json`; add `pg` + `@anthropic-ai/sdk` to
   `functions/api/package.json`.
2. Write `schema.sql` + `import.mjs` (mappings stubbed for the known datasets).
3. Write the `compare`/`options` API.
4. Build the SPA.
5. `openkbs deploy` (provisions Postgres), `openkbs fn deploy api`, `openkbs site deploy`;
   set `API_BASE` to the Lambda URL and redeploy site.
6. **Seed sample data** (small, clearly-labeled) so the live app is demoable immediately.
7. **User uploads the real CSVs** → I finalize column mappings, run `import.mjs` against
   the live DB, replacing the sample rows.

## Verification

- `openkbs fn invoke api -d '{"action":"options"}'` returns populated dropdown lists.
- `compare` returns sane numbers + a recommendation referencing them.
- Load the deployed site, run e.g. Bulgaria → Germany, Computer Science, Master; verify
  side-by-side metrics, university list, and verdict render. Dogfood with `agent-browser`.
- After real-CSV import, spot-check row counts per table and re-run a compare.

## Open dependency

The seven CSVs are not yet uploaded. I'll build the full app + schema + importer +
sample seed now and deploy; exact importer column mappings get finalized when the files
arrive (their headers vary per source).
