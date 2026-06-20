# Real accounts: free student + paid university, with favorites, likes & role-gated posting

## Context

Today УниКомпас has only **mock auth** (`frontend/src/context/AuthContext.jsx` —
localStorage, no backend, roles student/parent/university). Community
(`Community.jsx`) and Universities (`Universities.jsx`) are local-state demos that
lose everything on refresh, and there are no favorites or likes anywhere.
Postgres is **enabled but unused**; email is **not enabled**; the `api` function
has zero deps and only `chat`/`status` actions.

The user wants **real accounts of two types** with distinct permissions:

| Ability                     | Ученик (free) | Университет (paid) |
|-----------------------------|:---:|:---:|
| Use AI assistant            | yes | no |
| Write in Общност            | yes | no |
| Post in Университети        | no  | yes |
| Like posts in Университети  | yes | no |
| Favorite suggested schools  | yes | no |

Plus: **email the demo login credentials for both account types** to
`miroslavslavov648@gmail.com`.

Decisions locked with the user:
- **Paid uni tier = simulated/pre-provisioned** — no Stripe; uni accounts carry
  `plan='paid'` and the signup shows a paid plan but charges nothing.
- **Drop the parent role** — exactly two roles: `student`, `university`.
- **Full Postgres persistence** — accounts, favorites, likes, uni posts AND
  community messages all live in the DB and are shared across users.
- AI is a **student-only** perk (per the table above; easy to flip later).

## Approach

### A. Backend — `functions/api/` (the bulk of the work)

**Deps & secrets**
- Add `"pg"` to `functions/api/package.json`; run `npm install` there before deploy
  (CLI zips `node_modules`). Use built-in `node:crypto` for hashing + tokens — **no
  bcrypt/jwt deps** (avoids Lambda native-binding pain).
- New env var `AUTH_SECRET` (HMAC signing key) written to `functions/api/.env`
  (gitignored). `DATABASE_URL`, `OPENKBS_API_KEY` are auto-injected.

**`functions/api/index.mjs` — rewrite into an action router with a pg pool**
(reuse the pooling pattern from the openkbs skill: `pg.Pool`, `max:3`,
`ssl:{rejectUnauthorized:true}`).

- `ensureSchema()` — idempotent `CREATE TABLE IF NOT EXISTS`, run once per cold
  start (guarded by a module-level promise), then seed the two demo accounts with
  `INSERT ... ON CONFLICT (email) DO NOTHING`. No manual migration step needed.
- Tables:
  - `app_users(id, email UNIQUE, name, role CHECK in('student','university'), password_hash, plan, created_at)`
  - `favorites(user_id, uni_key, uni_name, uni_country, created_at, PK(user_id,uni_key))`
  - `uni_posts(id, author_id, author_name, title, body, created_at)`
  - `post_likes(post_id, user_id, PK(post_id,user_id))`
  - `community_messages(id, channel, user_id, author_name, author_role, text, created_at)`
- Auth helpers (node:crypto):
  - `hashPassword(pw)` -> `scrypt` with random salt, store `salt:hashHex`;
    `verifyPassword` via `timingSafeEqual`.
  - `signToken(user)` / `verifyToken(tok)` -> HMAC-SHA256 over `header.payload`
    with `AUTH_SECRET`, 30-day expiry. Frontend sends `Authorization: Bearer <tok>`;
    handler reads `event.headers.authorization`.
  - `requireAuth(event, roles?)` -> returns the verified user or throws 401/403.
- Parameterized queries everywhere ($1,$2...). Validate at the boundary (email
  shape, password length >= 6, text length caps). Login returns a **generic**
  error (don't reveal whether the email exists).
- Actions (extend the existing `switch`):
  - Public: `status`, `register{email,password,name,role}`, `login{email,password}`,
    `me`, `community.list{channel}`, `posts.list`.
  - `chat` (existing) — now **requires a student token** (AI is a student perk).
  - Student-only: `favorites.list`, `favorite.toggle{uniKey,uniName,uniCountry}`,
    `community.post{channel,text}`, `post.like.toggle{postId}`.
  - University-only: `post.create{title,body}`.
  - `posts.list` returns each post with `likeCount` and `likedByMe` (using the
    caller's token if present).
- Update CORS `Access-Control-Allow-Headers` to include `Authorization`.

**Demo accounts seeded (and emailed):**
- Student — `student@unikompas.bg` / `Uchenik2026!` (name „Демо Ученик“, free)
- University — `uni@unikompas.bg` / `Universitet2026!` (name „Демо Университет“, paid)

### B. Frontend — `frontend/src/`

- **`lib/api.js`** — `callApi` attaches `Authorization: Bearer <token>` from
  localStorage; add `getToken/setToken`.
- **`context/AuthContext.jsx`** — replace mock with real `register`/`login`/`logout`
  hitting the API; persist `{token,user}`; `ROLES` reduced to `{student, university}`.
  Also hold **favorites** state (loaded on login for students): `favorites`,
  `toggleFavorite(uni)`, `isFavorite(key)` calling `favorite.toggle`/`favorites.list`.
- **`components/AuthModal.jsx`** — 2-role selector; university shows a „Платен план
  (демо)“ note; real submit with loading + error states; password required.
- **`components/Navbar.jsx`** — 2 roles; add a „Профил“ link when logged in.
- **Favorites on suggested cards** — add a heart toggle (student-only) to the
  result cards in `components/PentominoResults.jsx` / `components/UniversityCard.jsx`
  (read these during impl), keyed on university `name`; wired to `toggleFavorite`.
  (`Icon.heart` already exists.)
- **New page `pages/Profile.jsx`** + route `/profile` in `App.jsx` — shows
  name/email/role + plan badge; students see their favorited universities (remove
  buttons); universities get a shortcut to post in Университети.
- **`pages/Community.jsx`** — load `community.list` per channel; posting gated to
  **students** (universities see „Университетите не могат да пишат тук“; logged-out
  see the login prompt). `send()` -> `community.post`.
- **`pages/Universities.jsx`** — keep the 12 seed profile cards as a static
  showcase; **add a „Публикации“ feed** backed by `uni_posts`: university role gets
  a composer (`post.create`); every post shows a like count + heart that **students**
  can toggle (`post.like.toggle`). Remove the old local-only achievement/photo
  editor (it never persisted) to avoid confusion.

### C. Infra / deploy (implementation phase, after code)
1. `cd functions/api && npm install` (vendor `pg`).
2. Write `functions/api/.env` with a generated `AUTH_SECRET`.
3. `openkbs email enable`.
4. Commit, then `openkbs fn deploy api` (schema + demo seed run on first invoke;
   trigger with a `status` call).
5. `cd frontend && npm run build` -> `openkbs site deploy`.
6. Email the two credential sets to `miroslavslavo648@gmail.com` via
   `openkbs email send`.

## Out of scope
- Real payment/Stripe (uni tier is simulated).
- Email verification / password reset / OAuth.
- Migrating the unrelated unused `functions/api/scripts/schema.sql` tables.

## Critical files
- `functions/api/index.mjs` — auth + DB + all new actions (major rewrite)
- `functions/api/package.json` — add `pg`; `functions/api/.env` — `AUTH_SECRET`
- `frontend/src/context/AuthContext.jsx` — real auth + favorites state
- `frontend/src/components/AuthModal.jsx`, `Navbar.jsx`
- `frontend/src/components/PentominoResults.jsx` / `UniversityCard.jsx` — favorite heart
- `frontend/src/pages/Community.jsx`, `Universities.jsx`, new `Profile.jsx`
- `frontend/src/App.jsx` — `/profile` route; `frontend/src/lib/api.js` — auth header

## Verification
1. `cd functions/api && npm install` then `cd frontend && npm run build` — clean build.
2. After deploy, dogfood with agent-browser on the live site:
   - Register a **student** -> can favorite suggested unis on /search (heart fills),
     favorites show on /profile and survive refresh; can post in Общност; can like a
     post in Университети; AI assistant answers.
   - That student **cannot** post in Университети (no composer).
   - Register/login a **university** -> can create a post in Университети; **cannot**
     write in Общност (gated note) and has no favorite hearts / AI.
   - Log in with the two **demo accounts** from the email; verify both roles behave
     as above.
   - Confirm the email to `miroslavslavov648@gmail.com` contains both logins.
3. Commit (`feat: real student/university accounts with favorites, likes & role-gated posting`).
