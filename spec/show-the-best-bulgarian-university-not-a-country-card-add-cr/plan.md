# Show the best Bulgarian university (not a country card) + add criteria

## Context

On the Search page the four corner cards each show one *individual* foreign
university scored against the user's ranked criteria, but the center "home" card
shows **България** as a *country* card: country-level averages plus a static list
of "Топ университети". This is inconsistent and doesn't answer the user's real
question — *which single Bulgarian university is the best match for me?*

Two changes:
1. Make the center card show the **single best Bulgarian university** for the
   user's chosen field + criteria, rendered just like the foreign cards (but
   keeping the "Твоят дом" home framing).
2. **Add three more criteria** to the ranker (living costs, scholarships,
   teaching quality) — all backed by data present on every record.

Decision (confirmed with user): Bulgarian universities are ranked by their
**in-Bulgaria standing** (national rank/quartile drives prestige), while foreign
universities keep the existing **world-ranking** based prestige. This avoids BG
unis scoring ~0/100 on degree value due to their high world ranks (~5800–8400).

The Bulgarian per-university data already exists in `bulgaria.json`
`topUniversities[]` (name, nameBg, city, founded, fields[], balo, globalRank,
nationalRank, quartile); country-level economics/lifestyle (avgTuition,
monthlyCost, scholarshipAvailability, erasmus, nightlife, parks, malls, quiet)
are inherited from the top level. **No build-data / CSV changes are needed** —
this is all runtime scoring + rendering.

## Approach

### 1. `frontend/src/lib/scoring.js` — new criteria + Bulgarian ranking

**Add 3 criteria** to the `CRITERIA` array (component `CriteriaRanker` is fully
dynamic; default `order` in Search.jsx is `CRITERIA.map(c => c.id)` so they show
automatically):
- `living` — "Разходи за живот", `Icon.calc`, `get: u => livingScore(u.monthlyCost)`
- `scholarship` — "Стипендии", `Icon.heart`, `get: u => u.scholarshipAvailability ?? 50`
- `teaching` — "Качество на преподаване", `Icon.cap`, `get: u => u.teaching ?? 50`

Add `livingScore(cost)`: inverse like `tuitionScore`, 0 USD → 100, ~2500 USD → 0
(`clamp(round(100 - (cost/2500)*100))`, return 55 when null). `monthlyCost`,
`scholarshipAvailability`, `teaching` are present on all 809 unis; `teaching`
isn't in `bulgaria.json` so BG unis fall back to the `?? 50` default (acceptable).

**Add `rankBulgarian(bulgaria, { field, orderedIds, top = 1 })`** that mirrors
`rankUniversities`:
- Build a scoreable object per `bulgaria.topUniversities[]` entry, inheriting the
  top-level country economics/lifestyle (avgTuition, costOfLiving, monthlyCost,
  scholarshipAvailability, erasmus, nightlife, parks, malls, quiet), plus per-uni
  `name: nameBg || name`, `city`, `founded`, `fields`, `nationalRank`, `balo`.
- Prestige proxy from national standing (NOT world rank): set
  `qsScore = Math.max(40, 92 - (nationalRank - 1) * 3)` and `bestRank: null`.
  Then the existing `degreeScore` (uses qsScore when bestRank is absent) yields a
  sensible, differentiated value (#1 ≈ 92 … lower national ranks lower).
- Field filter: keep only entries whose `fields` include `field`; if that empties
  the pool, fall back to all entries (same pattern as `rankUniversities` lines 60-63).
- Map through `scoreUniversity`, sort by score desc, slice `top`.

### 2. `frontend/src/pages/Search.jsx` — compute & pass the home uni

- Import `rankBulgarian`.
- In `compare()`: `const home = rankBulgarian(bulgaria, { field, order })[0];`
  store it (add `const [home, setHome] = useState(null)`; `setHome(home)` alongside
  `setResults(ranked)`).
- Pass `home={home}` to `<PentominoResults>`.
- In `buildContext`, set `home.name` to the picked uni's name (instead of just
  "България") so the AI assistant references the actual recommended BG university.

### 3. `frontend/src/components/PentominoResults.jsx` — render home as a card

- Add `home` to props: `function PentominoResults({ results, order, field, home })`.
- Replace both center slots (desktop line 20, mobile line 31) that currently use
  the imported `bulgaria` with `home` (`<Cell card={home} order={order} field={field} center .../>`
  and `<UniversityCard data={home} order={order} field={field} center />`).
- Drop the now-unused `import bulgaria` (the center is a real university object now,
  has no `topUniversities`, so `UniversityCard` renders `UniBody` — the same body as
  the corners — while `center` still drives the accent ring + "Твоят дом" badge).

### 4. `frontend/src/components/UniversityCard.jsx` — national-rank chip

In `UniBody`'s chips row (around line 70), add a conditional chip so the BG home
uni shows its national standing instead of a (missing) world rank:
```jsx
{data.nationalRank && <span className="chip py-0.5 text-[11px]"><Icon.trophy size={12} /> #{data.nationalRank} в България</span>}
```
Foreign unis have no `nationalRank` (chip hidden) and keep their `#N свят` chip;
BG home has no `bestRank` (no world chip) and shows `#1 в България`. Everything
else in `UniBody` already degrades gracefully: `type` chip hidden (null), `founded`
chip shows (BG entries have it), employer-rep metric hidden (null).

## Critical files
- `frontend/src/lib/scoring.js` — new criteria + `livingScore` + `rankBulgarian`
- `frontend/src/pages/Search.jsx` — compute `home`, pass it down, context name
- `frontend/src/components/PentominoResults.jsx` — render `home` as center card
- `frontend/src/components/UniversityCard.jsx` — national-rank chip (1 line)
- (reused, unchanged) `bulgaria.json`, `scoreUniversity`, `CriteriaRanker.jsx`,
  `icons.jsx` (`calc`, `heart`, `cap`, `trophy` all exist)

## Verification
1. `cd frontend && npm run build` — expect a clean Vite build (no data step needed).
2. Browser dogfood (after `openkbs site deploy`):
   - Field **Компютърни науки** + compare → center card is a single BG uni (e.g.
     „СУ Св. Климент Охридски") with a **„Твоят дом"** badge, **#1 в България**
     chip, „осн. 1888", real такса/издръжка, and a non-zero „Стойност на диплома".
   - Field **Медицина** → center switches to the best-matching medical BG uni
     (e.g. МУ–Варна), proving field filtering works on the home card.
   - The four corner cards still show individual foreign unis (unchanged).
   - Open „Добави критерий" — the three new chips (Разходи за живот, Стипендии,
     Качество на преподаване) appear and can be dragged/ranked; reordering them
     changes which BG uni and which foreign unis surface.
3. Commit (`feat: best-match BG university on home card + 3 new criteria`) then
   `openkbs site deploy` (frontend-only; `api` function unchanged).
