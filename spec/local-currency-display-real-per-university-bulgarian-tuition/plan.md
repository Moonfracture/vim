# Local-currency display + real per-university Bulgarian tuition

## Context

Every monetary value in the app is currently shown in **USD** (`$`), and all
Bulgarian universities show the *same* такса/издръжка because they inherit a
single country-level baseline. The user wants:
1. Show each amount in **the country's own currency**, actually converted (not
   just relabeled) — e.g. UK in £, Germany in €, Japan in ¥.
2. **Bulgaria shown dual: „лв (€)"** — лева primary with euro in parentheses
   (Bulgaria joined the eurozone 2026-01-01; BGN is pegged at exactly
   **1.95583 BGN/€**, so the euro side is exact).
3. **Real per-university tuition for the Bulgarian universities**, shown as a
   **range (min–max)** of the state-subsidized (държавна поръчка) annual fee,
   since fees vary by specialty.
4. Foreign tuition stays country-average (no per-uni source exists) but is
   labeled honestly as an average.

Key facts from exploration:
- **All money rendering flows through 2 helpers** — `fmtUSD`/`fmtMonthly` in
  `frontend/src/components/UniversityCard.jsx` (4 call sites). Every card object
  carries `iso2`, so display can convert keyed on `iso2`.
- **Scoring stays in USD** (canonical) — `tuitionScore`/`livingScore` in
  `scoring.js` keep working unchanged so cross-country comparisons remain valid.
  Only the *display* converts.
- The tuition CSV (`tuition_fees_50_countries.csv`) has a **`Currency` column**
  giving each country's native currency code — reused to build the table.
- BG per-uni data lives in `BG_META` + `bgUnis` in `build-data.mjs`; there is
  currently **no tuition field** on BG unis (they use the hardcoded `bulgaria`
  baseline of $3300).

## Approach

### 1. Build a currency table at build time — `frontend/scripts/build-data.mjs`

- Read native currency **code** per country from the tuition CSV `Currency`
  column → `iso2 → code` (add `bg → BGN` manually; fill any gaps).
- Fetch **live USD-based rates** once at build (ESM top-level `await`):
  `fetch('https://open.er-api.com/v6/latest/USD')` → `{ rates }`. Wrap in
  try/catch with a committed `FALLBACK_RATES` constant (reasonable mid-2026
  values) so the build never breaks offline. Log which source was used + the date.
- Emit **`frontend/src/data/currencies.json`** keyed by `iso2`:
  `{ code, symbol, suffix, rate, step }` where `rate` = local units per USD,
  `symbol`/`suffix` from a `SYMBOLS` map (€,$,£,¥,лв,…; unknown → code prefix),
  `step` = display rounding (50 for normal, 1000 for high-denomination like
  IDR/VND/KRW/HUF). For `bg`, also include
  `secondary: { code:'EUR', symbol:'€', rate: bgnRate / 1.95583 }`.
- Also write `meta: { asOf, source }` so the UI can footnote "курсове към <date>".

### 2. Real Bulgarian per-uni tuition — `frontend/scripts/build-data.mjs`

- Add `tuitionMinBGN` / `tuitionMaxBGN` (annual държавна-поръчка range, лв) to the
  `BG_META` entries — at minimum the 8 in `topUniversities`, ideally all listed.
  **Source** real 2025/26 figures via web research of official fee schedules /
  ПМС tables (med universities run higher; humanities/eng lower). Values stored
  as clean лв; flagged approximate where exact data isn't public.
- In `bgUnis.map(...)`, attach canonical **USD** fields derived with the same
  build rate so scoring + the generic display pipeline work:
  `tuitionMin = round(minBGN / bgnRate)`, `tuitionMax = round(maxBGN / bgnRate)`,
  `avgTuition = midpoint USD`. (Round-trip USD→BGN at display reproduces the
  original лв since the same rate cancels; rounded to `step`.)
- `topUniversities` entries now carry `avgTuition`, `tuitionMin`, `tuitionMax`.

### 3. Currency helper — new `frontend/src/lib/currency.js`

- `import currencies from '../data/currencies.json'`.
- `fmtMoney(usd, iso2, { monthly } = {})` → localized string: `null → '—'`;
  `local = usd * rate` rounded to `step` (monthly → nearest 10); thousands
  separators; symbol prefix or `suffix`; monthly prefixed `~`. If the entry has
  `secondary` (Bulgaria) append ` (€N)`.
- `fmtRange(usdMin, usdMax, iso2)` → `"A–B <symbol>"` (+ ` (€..–..)` for bg).
- Fallback to USD when `iso2` is missing/unknown.

### 4. Render local currency — `frontend/src/components/UniversityCard.jsx`

- Replace `fmtUSD`/`fmtMonthly` with `fmtMoney` from `currency.js`.
- `UniBody` такса: if `data.tuitionMin != null` (BG) →
  `fmtRange(data.tuitionMin, data.tuitionMax, data.iso2)`; else
  `fmtMoney(data.avgTuition, data.iso2)` with `hint="средно"` (honest: it's a
  country average for foreign unis).
- издръжка: `fmtMoney(data.monthlyCost, data.iso2, { monthly: true })`.
- `CountryBody` (now largely unused since the center is a uni, but kept): update
  its two money `<Metric>`s the same way for consistency.

### 5. Keep the AI assistant consistent — `Search.jsx` + `Chatbot.jsx`

- In `buildContext` (`Search.jsx`), add a `currency` code to each university and
  to `home` (from `currencies[iso2].code`) so the model knows the unit.
- Add one line to the Chatbot system prompt: amounts are annual tuition / monthly
  living cost in each university's local currency (Bulgaria in лв, € in
  parentheses) — so it doesn't answer in „$".

### Out of scope
- `Universities.jsx` showcase already uses hardcoded „лв" strings — left as-is.
- No per-university tuition for foreign unis (no dataset); stays country-average.

## Critical files
- `frontend/scripts/build-data.mjs` — currency table + rate fetch + BG per-uni fees
- `frontend/src/data/currencies.json` — **new** generated output
- `frontend/src/lib/currency.js` — **new** display helper (`fmtMoney`, `fmtRange`)
- `frontend/src/components/UniversityCard.jsx` — use currency-aware formatting
- `frontend/src/lib/scoring.js` — `rankBulgarian` carries per-uni tuition fields
- `frontend/src/pages/Search.jsx`, `frontend/src/components/Chatbot.jsx` — AI context

## Verification
1. `cd frontend && npm run build` — expect a clean build; log shows rate source +
   `asOf` date and `currencies.json` written. Sanity-check:
   `node -e "c=require('./src/data/currencies.json');console.log(c.bg, c.gb, c.jp)"`
   → bg has `code:'BGN'`, `suffix:'лв'`, a `secondary` EUR entry; gb `£`; jp `¥`.
2. Browser dogfood on the deployed site:
   - Foreign cards show local currency: UK „£…", Germany/eurozone „€…", Japan
     „¥…", with „средно" hint on tuition.
   - Bulgarian home card shows tuition as a **range in лв with € in parens**
     (e.g. „~900–4 500 лв (€460–2 301)") and differs per BG uni; издръжка in
     „лв (€)".
   - Switch field Компютърни науки ↔ Медицина → the BG home card's fee range
     changes with the university.
   - Ask the chatbot about costs → it answers in лв/local currency, not „$".
3. Commit (`feat: local-currency display + real BG per-university tuition`) then
   `openkbs site deploy` (frontend-only; `api` unchanged).
