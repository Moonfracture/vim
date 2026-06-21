# RSVU 2025 datasets + ученик/студент role split

## Context

The user uploaded three official **РСВУ 2025** (Rating System of Higher Schools in Bulgaria) PDFs and
asked for two things:

1. **Add the PDFs to the datasets ("Both").** Extract structured data into the app *and* cite all three
   as sources. Overarching goal, verbatim: *"i want in the end to have all bulgarian universities
   displayable with as much info as possible."* Today the app only knows ~19 BG universities (curated
   `BG_META` in `build-data.mjs`) and shows 8–12 of them.
2. **Split the single „ученик" account into two roles:**
   - **ученик** (pupil) — picks their **grade/клас (8–12)** at signup; grade shown next to their name in Общност.
   - **студент** (university student) — picks their **year/курс (1–6)** and **university**; university shown next to name in Общност.
   - Both have **identical permissions** to today's ученик (AI chat, post in Общност, like posts, favorite schools).
   - The existing **университет** (paid publisher) role is unchanged.

### What the PDFs contain (already analysed with a working positional parser)
- `660f7571_…2025.pdf` (323 pp) — **MAIN**: a 4-column table *направление | висше училище | специалност | ОКС*.
  Grid-based extraction (cell rectangles from `getOperatorList` → row/column bands) yields **3 854 records
  across 51 distinct universities** — essentially the full accredited list. Reliable for field+university+specialty.
  The ОКС (degree) column is partly unreliable in the source (bachelors sometimes mislabelled "Магистър след средно"),
  so degree is best-effort.
- `6fa89eaf_Suvm-programi2025.pdf` (14 pp) — joint programs with foreign universities (multi-column table). Secondary dataset.
- `957db0bc_…2025.pdf` (14 pp) — a **prose** employer-attitudes report. **Cite only**, not tabular.

## Approach

### Part A — Data pipeline (run-once parser + committed JSON, no heavy build dep)

`pdfjs-dist` is heavy and must NOT enter the site build. So: parse once, commit the JSON, build-data just reads it.

1. **Vendor the sources**: copy the 3 PDFs → `frontend/scripts/rsvu/`.
2. **New `frontend/scripts/parse-rsvu.mjs`** (the validated grid parser):
   - Uses `pdfjs-dist/legacy/build/pdf.mjs` (Node-safe) as a **devDependency**.
   - Column x-bands `<189 / <398 / <628 / else`; row bands from `constructPath` cell-rect y-lines (filter width>50, cluster within 2px, keep gaps>20).
   - Width-based token spacing; skip title/header rows.
   - Writes `frontend/scripts/data/rsvu-specialties.json` (records: `{field,uni,spec,oks}`) and `rsvu-joint.json`.
   - Add `"rsvu": "node scripts/parse-rsvu.mjs"` to `frontend/package.json` scripts (manual, not in `build`).
3. **Extend `frontend/scripts/build-data.mjs`**:
   - Read `rsvu-specialties.json`; group into **51 university objects**: `{ key, nameBg, fields:[…], specialties:[{field,name,degrees:[…]}] (deduped), specialtyCount }`.
   - **Crosswalk** the 51 Bulgarian names → the 19 `BG_META`/`BG_SITE` English keys (normalized-name dict). Matched unis also get `city, founded, website, balo, nationalRank, globalRank, quartile, tuitionMin/Max`. The other ~32 get specialties + fields only.
   - Attach joint programs from `rsvu-joint.json` to each uni (`jointPrograms:[…]`) where present.
   - Write new **`frontend/src/data/bg-universities.json`** (the full directory).
   - Bump `bulgaria.json` `universityCount` to the real count (51).

### Part B — UI surfacing ("as much info as possible")

Rework **`frontend/src/pages/Universities.jsx`**: replace the 12-item hardcoded `SEED` with a **data-driven
directory of all 51** from `bg-universities.json`. Keep the existing Публикации (posts) feed section on top.
- Add a **filter bar**: text search (name/city) + field dropdown.
- `UniCard` shows: name, city chip (if known), founded/website (if known), field chips, **specialty count + expandable specialty list grouped by field**, degree as a muted tag; for crosswalked unis also balo/tuition/rank; a „Съвместни програми" subsection when `jointPrograms` exist.

### Part C — Role split (backend `functions/api/index.mjs`)

No data migration of existing rows (current `student` rows really are pupils). Add the new role alongside.
- **Schema (`ensureSchema`)**: `ALTER TABLE app_users ADD COLUMN IF NOT EXISTS grade SMALLINT, study_year SMALLINT, university TEXT;`
  and replace the role CHECK idempotently: `DROP CONSTRAINT IF EXISTS app_users_role_check` → `ADD CONSTRAINT … CHECK (role IN ('student','university','university_student'))`.
  Add `author_detail TEXT` to `community_messages`. Seed a third demo (Демо Студент) + give Демо Ученик `grade=12`.
- **`register`**: accept `grade, studyYear, university`; validate (`student`→grade 8–12; `university_student`→year 1–6 + non-empty university; `university` unchanged). `plan='free'` for both new student kinds.
- **`publicUser`**: add `grade, studyYear, university`.
- **`me`**: SELECT the new columns.
- **Permission gates** `['student']` → `['student','university_student']` in: `favoriteToggle`, `postLikeToggle`, `communityPost`, `chat`.
- **`communityPost`**: SELECT the poster's grade/university, compute `author_detail` (`"${grade} клас"` for ученик, university for студент), store it. **`communityList`**: return `author_detail`.

### Part D — Frontend role plumbing

- **`AuthContext.jsx`**: `ROLES` → 3 entries (`student`=Ученик, `university_student`=Студент, `university`=Университет).
  `register` passes `grade/studyYear/university`. Favorites gating `role==='student'` → `role!=='university'` (both pupil+student).
- **`AuthModal.jsx`**: 3-role picker; conditional fields — ученик: grade `<select>` 8–12; студент: year `<select>` 1–6 + university `<select>` populated from `bg-universities.json`.
- **`Profile.jsx`**: show grade (ученик) or курс + university (студент); favorites block for both.
- **`Community.jsx`**: posting allowed for student+university_student; `Bubble` renders `author_detail` next to the name; `RoleDot` labels ученик/студент.

### Part E — Citations

**`frontend/src/components/Footer.jsx`**: add the three РСВУ 2025 sources (specialties list, joint-programs list,
employer-attitudes report) with a link to `https://rsvu.mon.bg`.

## Critical files
- `frontend/scripts/parse-rsvu.mjs` (new), `frontend/scripts/rsvu/*.pdf` (new), `frontend/scripts/data/rsvu-*.json` (new)
- `frontend/scripts/build-data.mjs`, `frontend/package.json`, `frontend/src/data/bg-universities.json` (new)
- `frontend/src/pages/Universities.jsx`, `frontend/src/components/Footer.jsx`
- `functions/api/index.mjs`
- `frontend/src/context/AuthContext.jsx`, `frontend/src/components/AuthModal.jsx`,
  `frontend/src/pages/Profile.jsx`, `frontend/src/pages/Community.jsx`

## Deploy
1. `cd frontend && npm i -D pdfjs-dist && npm run rsvu && npm run build`.
2. Commit (`feat: RSVU 2025 university dataset + ученик/студент role split`).
3. `openkbs fn deploy api` (schema/role changes) then `openkbs site deploy`.

## Verification
1. `npm run rsvu` prints ~3854 records / 51 unis; `npm run build` succeeds.
2. API: register a ученик (grade) and a студент (year+university); confirm both can favorite, post in Общност, use AI chat; confirm университет still cannot post in Общност.
3. agent-browser (desktop+mobile): Universities directory lists 51 with specialties/filters; signup modal shows conditional fields; Общност shows grade next to ученик and university next to студент; Profile shows the right detail; Footer cites the 3 РСВУ sources.

## Follow-up for the user (datasets still needed)
~32 of the 51 universities have **specialties only** — they lack city / founding year / website / tuition / балообразуване
(only the 19 in `BG_META` have these). I'll list those 32 after build so the user can supply the missing metadata.
