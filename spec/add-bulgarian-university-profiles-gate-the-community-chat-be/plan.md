# Add Bulgarian university profiles + gate the Community chat behind login

## Context

Two user requests:

1. **"add more bulgarian universities and their specifications"** — The public
   showcase page **Витрина на университетите** (`Universities.jsx`) currently
   lists only **3** hardcoded BG universities (СУ, ТУ-София, МУ-Варна) with just a
   blurb + achievements + placeholder photos. It carries **no real
   specifications** (founded year, programs, admission formula, tuition). Meanwhile
   the build pipeline already curates **19** BG universities with accurate
   `founded / city / fields / балообразуване` in `BG_META`
   (`build-data.mjs:325`) — but that data only feeds the Home/Search "България"
   country card, never the showcase. The showcase is the sparsest, most visible
   surface, so we expand it to ~12 universities and give each card a real
   **specifications** block.

2. **"remove the ability to write in the person to person chat without login"** —
   The Community chat composer (`Community.jsx`) lets anyone send messages as
   "Ти (гост)"; `send()` (line 47) has no auth check. We mirror the existing
   login-gate pattern already used in `Chatbot.jsx` so only logged-in users can
   post.

Outcome: the showcase becomes an informative, spec-rich directory of Bulgarian
universities, and the community chat requires login to write (read stays open).

## Approach

Two self-contained frontend files. No build-pipeline or data-JSON changes — the
showcase is presentational mock data, consistent with how it works today.

### 1. Expand the showcase — `frontend/src/pages/Universities.jsx`

- **Grow the `SEED` array** (line 7) from 3 → **~12** well-known BG universities,
  drawing accurate specs from the existing `BG_META` curation in
  `build-data.mjs:325-344`. For each entry add structured spec fields alongside
  the existing `id / name / city / hue / blurb / achievements / photos`:
  - `founded` (number)
  - `fields` (string[] — the Bulgarian field names, rendered as chips)
  - `balo` (string — admission-score formula, from `BG_META`)
  - `tuition` (string — approximate annual tuition, e.g. `'~900–4000 лв./год.'`;
    BG public-uni range, curated per university)
  Suggested set: СУ, ТУ-София, УНСС, НБУ, ПУ „Паисий Хилендарски", МУ-София,
  МУ-Варна, МУ-Пловдив, УАСГ, ХТМУ, Русенски университет, Технически университет–Варна.
- **Render a specifications block in `UniCard`** (component at line 87): between
  the blurb (line 117) and the Галерия section (line 120), add a compact spec
  list reusing existing `Icon`s and Tailwind utility classes already in the file:
  - `Icon.cap` осн. `{founded}` (city already shown in the header chip)
  - **Специалности**: `fields.map` → `chip` pills (same `chip` class used elsewhere)
  - `Icon.coin` Такса: `{tuition}`
  - `Icon.calc` Балообразуване: `{balo}` (smaller muted text, may wrap)
  Guard every field with `&&` so the existing edit-mode add-achievement/photo flow
  and any entry lacking a spec still renders cleanly.
- Editable mode (`isUni`) and the in-memory add-achievement/add-photo handlers are
  untouched — new spec fields are display-only.

### 2. Gate the Community composer — `frontend/src/pages/Community.jsx`

Mirror `Chatbot.jsx` exactly (the established pattern in this codebase):

- **`send()` (line 47):** add `if (!user) return;` as the first line (defensive —
  same as `Chatbot.jsx:21`). Since only logged-in users can reach the input, the
  `user ? ... : 'Ти (гост)'` fallback on line 50 becomes simply `${user.name} (ти)`.
- **Composer (lines 132-143):** wrap in a `{user ? (...) : (...)}` conditional:
  - **Logged in:** the existing input + send button (unchanged), with the
    placeholder simplified to `'Напиши съобщение…'`.
  - **Logged out:** a centered prompt mirroring `Chatbot.jsx:103-111`:
    > „Влез в профила си, за да пишеш в общността." + a `btn-primary` button
    > `<Icon.users/> Вход / Регистрация` firing
    > `window.dispatchEvent(new CustomEvent('unikompas:open-auth'))`.
  The Navbar already listens for `'unikompas:open-auth'` and opens the AuthModal —
  no Navbar change needed. Reading messages stays open to everyone.

## Critical files
- `frontend/src/pages/Universities.jsx` — expand SEED + add spec block to UniCard
- `frontend/src/pages/Community.jsx` — login-gate `send()` + composer
- (reference, unchanged) `frontend/src/components/Chatbot.jsx` — gate pattern to mirror
- (reference, unchanged) `frontend/scripts/build-data.mjs:325-344` — `BG_META` source of accurate BG specs

## Verification
1. `cd frontend && npm run build` — expect a clean Vite build (data JSON unchanged).
2. Browser dogfood (after `openkbs site deploy`) via agent-browser:
   - **Витрина** (logged out): ~12 BG university cards, each showing founded,
     специалности chips, такса, and балообразуване. No layout breakage.
   - **Общност** (logged out): message history visible; composer replaced by the
     "Влез в профила си…" prompt; clicking **Вход / Регистрация** opens AuthModal.
   - Log in (any role) → Общност composer appears; sending posts as `{name} (ти)`.
   - Log in as **Университет** → Витрина still enters edit mode (add
     achievement/photo) with the new spec block intact.
3. Commit (`feat: BG university showcase specs + login-gated community chat`) then
   `openkbs site deploy` (frontend-only; `api` function unchanged).
