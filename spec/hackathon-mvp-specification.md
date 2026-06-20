# УниКомпас — Hackathon MVP Specification ("Избор на университет")

## Context

A hackathon MVP web app that helps Bulgarian students (grades 8–12), their
parents, and universities answer one question: **"Which university is the best
fit for me — and does it make sense to study abroad versus staying in Bulgaria?"**

The user (acting as senior fullstack dev) pivoted from an earlier data-import
tool to this student-facing product. Stack is fixed: **React + Tailwind + Node.js
(OpenKBS Lambda)**. Real datasets (world university rankings 2026, tuition for 50
countries, Scimago Bulgaria) are processed at build time into bundled JSON — no
runtime database. Lifestyle criteria with no dataset (nightlife, parks, malls,
quiet) use deterministic seeded placeholder scores, disclosed honestly in the UI.

Design direction is fixed: modern dark mode, indigo accent (#6366f1),
glassmorphism cards, smooth staggered animations, Linear.app-inspired. UI copy is
in Bulgarian.

**Current state (already built):** Vite/React/Tailwind scaffold; build-data
pipeline producing `countries/universities/bulgaria/fields.json`; theme (dark
indigo + glass); routing; `AuthContext` + `AuthModal` (roles Ученик/Родител/
Университет, localStorage); `Navbar`/`Footer`; **Home page**; and all Search
building-block components (`FieldAutocomplete`, `SpecialtyAutocomplete`,
`CriteriaRanker`, `UniversityCard`, `PentominoResults`, `Chatbot`) plus the
`scoring.js` ranking engine.

**Not yet built (this spec's scope):** the three pages that wire those pieces
together — `Search`, `Community`, `Universities` — and the backend `chat` action
for the AI assistant.

## Goals

- Let a student configure a search (field, ranked priorities, optional specialty
  & region) and get a ranked, visual comparison of universities against Bulgaria.
- Present results in the requested **X-pentomino layout** (Bulgaria center, top 4
  universities in the corners) so the "stay vs. go abroad" trade-off is legible.
- Provide an **AI assistant** that analyzes the on-screen result cards and answers
  free-form questions in Bulgarian (e.g. "Кой е най-евтиният вариант?").
- Offer lightweight **Community** and **Universities** pages so the three audience
  roles each have a place in the product (mock data for the MVP).
- Ship a deployed, demoable site within hackathon constraints.

## Functional Requirements

### FR1 — Search page (`/search`) [priority 1]
- Inputs:
  - **Field/sphere** (required) — `FieldAutocomplete`, keyword suggestions.
  - **Criteria ranking** (required) — `CriteriaRanker` drag-and-drop; default
    order = `CRITERIA` ids; top = most important. Drives weighted scoring.
  - **Specialty** (optional) — `SpecialtyAutocomplete`, filtered by chosen field,
    disabled until a field is picked.
  - **Region** (optional) — dropdown: Всички / Европа / САЩ / Канада / Австралия
    (values all / Europe / USA / Canada / Australia).
- A **Compare** button calls `rankUniversities(universities, { field, region,
  orderedIds: order, top: 4 })` (existing, `lib/scoring.js`).
- Renders `<PentominoResults results={results} order={order} />` then
  `<Chatbot context={...} />` below it. Chatbot `context` is built from the 4
  ranked results + `bulgaria.json` (names, cities, key metrics, scores).
- Empty/initial state before first compare: show the form with helper text; do
  not render an empty pentomino.

### FR2 — Results / X-pentomino [priority 1]
- Reuse existing `PentominoResults` + `UniversityCard`. Center card = Bulgaria
  ("Твоят дом"); four corners = ranked universities with score badge, flag, city,
  metrics, and top-3 criteria bars. Mobile falls back to stacked cards.

### FR3 — AI assistant / Chatbot [priority 1]
- Reuse existing `Chatbot` component (calls `callApi('chat', { question, context,
  history })`, expects `{ reply }`).
- Backend: add a **`chat` action** to `functions/api/index.mjs` that calls Gemini
  via the OpenKBS proxy (raw fetch, `gemini-3.1-flash-lite-preview:generateContent`,
  `Authorization: Bearer OPENKBS_API_KEY`, non-streaming). System framing:
  answer in Bulgarian, ground answers strictly in the provided result `context`,
  stay on the topic of university choice.
- Remove now-unused `pg`/Anthropic deps from `functions/api` if the function
  becomes chat-only.

### FR4 — Authentication [priority 2, already built — verify]
- Top-right Вход/Регистрация opens `AuthModal`; roles Ученик/Родител/Университет;
  session persisted to localStorage. No real backend auth for MVP.

### FR5 — Community page (`/community`) [priority 3]
- Mock chat/forum between students and current university students. Static seeded
  threads/messages; a composer that appends locally (no persistence required for
  MVP). Same dark/glass aesthetic.

### FR6 — Universities page (`/universities`) [priority 3]
- Mock university profiles where universities can "upload" photos and
  achievements. Seeded cards + a mock upload affordance (local preview only, no
  real storage required for MVP).

### FR7 — Home page [done — verify]
- Hero with value prop "Намери най-добрия университет за теб", CTAs to /search and
  /community, live stats, feature cards, audience strip.

## User Stories

- As a **student**, I pick my field, drag my priorities into order, optionally
  narrow by specialty/region, and see the top universities vs. Bulgaria so I can
  judge whether to study abroad.
- As a **student**, I ask the assistant "Има ли смисъл да уча в чужбина?" and get
  a grounded answer based on my current results.
- As a **parent**, I can browse the same comparison and read cost/scholarship
  metrics to weigh affordability.
- As a **university**, I can sign up with the Университет role and see a profile/
  uploads surface on the Universities page.

## Acceptance Criteria

- [ ] `/search` renders all four inputs; Compare is blocked until field + criteria
      order are set, then produces 4 ranked corner cards + Bulgaria center.
- [ ] Changing criteria order changes ranking/scores; region/specialty filter the
      pool; field with sparse data falls back gracefully (no empty results crash).
- [ ] Chatbot returns a Bulgarian reply that references the on-screen results; API
      errors surface as a friendly message, not a crash.
- [ ] `/community` and `/universities` render seeded mock content with working
      local interactions (post a message / preview an upload) and match the theme.
- [ ] App builds (`npm run build` → `../site`) and is deployed; `fn deploy api`
      and `site deploy` succeed; `API_BASE` points at the direct Lambda URL.
- [ ] End-to-end dogfood (e.g. Информатика, default criteria, Европа) renders
      results + a working assistant reply, verified in a browser.

## Constraints

- Stack locked: React + Vite + Tailwind 3 + framer-motion + react-router v6;
  Node.js Lambda backend. All UI copy in Bulgarian.
- No runtime DB: data is bundled JSON built from real CSVs at build time.
- AI only via OpenKBS proxy (no vendor keys); Lambda is non-streaming.
- Lifestyle criteria (nightlife/parks/malls/quiet) and Bulgaria's baseline are
  seeded/crafted placeholders and must be disclosed as примерни in the UI/Footer.
- Design must hold the dark-indigo glassmorphism direction across every page.

## Out of Scope (MVP)

- Real authentication / user accounts / password storage.
- Real-time messaging or persistence for Community (no MQTT) and real file storage
  for Universities uploads (local preview only).
- Live dataset ingestion / admin import tooling.
- Payments, notifications, multi-language (Bulgarian only).
