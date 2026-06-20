# Country-level filter under the region selector

## Context

Today the Search page (`frontend/src/pages/Search.jsx`) narrows results with a
single **region** `<select>` (Европа, САЩ, Азия…). `rankUniversities`
(`scoring.js:65`) then keeps only `u.region === region`. The user wants finer
control: after picking a multi-country region, a panel of **country tickboxes**
appears, with the *top destination* countries pre-checked and the rest left for
opt-in, plus **„Избери всички"** / **„Изчисти"** controls. Selected countries
further narrow the ranked results (and the AI context).

Decisions locked with the user:
- **Auto-check rule = Top destinations**: pre-check countries in the region that
  have a university in roughly the global top 150 by `bestRank`; the long tail
  stays unchecked.
- **Empty selection = whole region** (safe fallback; never zero results). This
  mirrors the existing field-wipe fallback at `scoring.js:70`.

## Approach

### 1. Filter logic — `frontend/src/lib/scoring.js`
- Add a `countries` param (array of `iso2`) to `rankUniversities({ field, region, countries, orderedIds, top })`.
- After the region filter, add: `if (countries?.length) pool = pool.filter(u => countries.includes(u.iso2));`
- Empty/absent `countries` ⇒ no narrowing (whole region). Keep the existing
  field-wipe fallback as-is (it already falls back to region-only).
- `rankBulgarian` is unaffected (home card is always Bulgaria).

### 2. Bulgarian country names — new `frontend/src/lib/countryNames.js`
- Export `const COUNTRY_BG = { 'Germany': 'Германия', 'UK': 'Обединено кралство', … }`
  covering the ~50 countries in `COUNTRY_META` (build-data.mjs:90). The whole UI
  is in Bulgarian, so checkboxes should be too.
- Export `nameBg = (country) => COUNTRY_BG[country] || country` (falls back to the
  English name if one is missing — no crash on new data).

### 3. New component — `frontend/src/components/CountryFilter.jsx`
- Props: `available` (`[{ iso2, country, bestRank }]` for the region, pre-sorted),
  `selected` (array of `iso2`), `onChange(nextArray)`.
- Renders nothing when `available.length <= 1` (USA, Canada, „all" → no panel).
- Header row: `<span className="label">Държави</span>` + two small chip buttons
  „Избери всички" (→ all iso2) and „Изчисти" (→ []).
- Body: wrapped **toggle chips** (reuse the `.chip` class + `Flag` from
  `icons.jsx`), accent styling when selected (border-accent/bg-accent/15 + `Icon.check`),
  default chip otherwise. Click toggles that `iso2` in/out of `selected`.
- Counter hint: „N от M избрани" so the user sees the empty=whole-region meaning.

### 4. Wire into Search — `frontend/src/pages/Search.jsx`
- New state `const [countries, setCountries] = useState([]);`
- `countriesForRegion = useMemo(...)`: distinct `{ iso2, country, bestRank }` from
  `universities` where `u.region === region`, `bestRank` = min rank per country,
  sorted by `bestRank` asc. Empty for `region === 'all'`.
- `autoCountries(list)`: iso2s with `bestRank <= 150`; if fewer than 3 qualify,
  take the top 3 by rank instead (so weak regions still get a sensible default).
- `useEffect([region])`: reset `setCountries(autoCountries(countriesForRegion))`
  whenever the region changes.
- Render `<CountryFilter available={countriesForRegion} selected={countries} onChange={setCountries} />`
  directly under the region `<select>` block (Search.jsx ~line 145).
- Pass `countries` into the `rankUniversities(...)` call in `compare()` (line 73)
  and into `buildContext` (line 82).

### 5. Keep the AI context honest — `frontend/src/pages/Search.jsx` (`buildContext`)
- Add a `countries` line to the prompt context: the Bulgarian names of the
  selected countries (via `nameBg`), so the assistant knows the comparison is
  scoped to those countries, not the whole region. `api/index.mjs` needs no
  change — it already prints whatever context lines it receives.

### Out of scope
- No build-data.mjs / JSON regeneration (country list is derived at runtime from
  existing `region`/`iso2`/`bestRank` fields already in `universities.json`).
- Region `<select>` stays as the primary control; we only add the sub-panel.
- Single-country regions and „Всички региони" show no country panel.

## Critical files
- `frontend/src/lib/scoring.js` — add `countries` filter to `rankUniversities`
- `frontend/src/lib/countryNames.js` — **new**, Bulgarian country-name map
- `frontend/src/components/CountryFilter.jsx` — **new**, tickbox panel
- `frontend/src/pages/Search.jsx` — state, auto-select, render, wiring, AI context
- (reuse) `frontend/src/lib/icons.jsx` `Flag`/`Icon.check`; `.chip`/`.label` in `index.css`

## Verification
1. `cd frontend && npm run build` — expect a clean build.
2. Dogfood the deployed site with agent-browser:
   - Pick **Европа** → a country panel appears with UK/Germany/Netherlands/Switzerland
     etc. pre-checked and smaller countries unchecked; counter shows „N от M".
   - „Изчисти" clears all; „Избери всички" checks all.
   - Compare with only **Germany + Netherlands** checked → all 4 result cards are
     German/Dutch universities.
   - Clear all and compare → results span the whole region (empty = whole region).
   - Switch **Европа → Азия** → panel repopulates with Asian countries + fresh
     top-destination defaults.
   - Pick **САЩ** → no country panel (single country).
3. Commit (`feat: per-country filter within a selected region`) then
   `openkbs site deploy` (frontend-only; `api` unchanged).
