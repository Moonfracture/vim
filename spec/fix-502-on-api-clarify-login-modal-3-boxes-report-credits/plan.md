# Fix 502 on API + clarify login modal ("3 boxes") + report credits

## Context

Three issues from the user, all on the live УниКомпас app (findmyuni.io):

1. **"error 502"** — intermittent. Curl tests of `status`/`login` return 200, so it's
   not a constant outage. The CloudWatch logs for the `api` Lambda show the smoking
   gun: a request ends with `Status: error  Error Type: Runtime.ExitError` and a dump
   of a half-open `pg` socket to `ep-lucky-brook-...neon.tech` (`_ending:true`,
   `_connecting:true`). **Root cause:** `getPool()` in `functions/api/index.mjs`
   creates a `pg.Pool` with **no `pool.on('error', …)` listener**. Neon scales to zero
   and kills idle pooled connections; when that idle client emits an `'error'` event
   with no listener, Node treats it as an uncaught exception and **crashes the Lambda
   process**. A Function-URL Lambda that crashes returns **502** to the browser. This
   is intermittent because it only fires when an idle connection is reaped between
   invocations — exactly the spiky pattern the user hits.

2. **"3 boxes, where do I write which?"** — `AuthModal.jsx` defaults to
   `mode = 'signup'`, which renders three inputs (Име, Имейл, Парола). A returning user
   (the demo accounts already exist) expects a login with just Имейл + Парола and is
   confused. Fix: default the modal to **login** mode.

3. **"how many credits do I have"** — `GET https://user.openkbs.com/balance`
   returns `{"balance":"6293284","displayBalance":6293.284,"currency":"EUR"}`.
   **≈ 6,293,284 credits ≈ €6,293.28 remaining** (100,000 credits = €1). No code
   change — just report it.

## Approach

### 1. Fix the 502 (primary) — `functions/api/index.mjs`, `getPool()` (~line 32)

Attach an error handler so a dead idle connection can never crash the process, and
make the pool more resilient to Neon's scale-to-zero:

```js
function getPool() {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 30_000,
      keepAlive: true,
      connectionTimeoutMillis: 10_000,
    });
    // Neon scales to zero and reaps idle connections; without this listener the
    // resulting 'error' event is an uncaught exception → Lambda crash → 502.
    pool.on('error', (err) => { console.error('pg pool idle client error:', err.message); });
  }
  return pool;
}
```

As defense-in-depth, also add a top-level guard so a stray async rejection logs
instead of killing the runtime:

```js
process.on('unhandledRejection', (e) => console.error('unhandledRejection:', e));
```

(The per-request `try/catch` in `handler()` returning JSON 500 stays as-is; this
only closes the *process-level* crash path that produces the 502.)

### 2. Clarify the login modal — `frontend/src/components/AuthModal.jsx`

- Change the initial mode from `'signup'` to `'login'` (line 8:
  `const [mode, setMode] = useState('login');`). Returning users — including the demo
  accounts — now land on a 2-field login (Имейл, Парола).
- Keep the existing bottom toggle ("Нямаш профил? Създай" ⇄ "Вече имаш профил? Влез"),
  which already lets new users switch to the 3-field signup. The role selector + Име
  field already render only in signup mode, so no other markup change is needed.

## Critical files
- `functions/api/index.mjs` — add `pool.on('error')` + keepAlive/connTimeout (the 502 fix)
- `frontend/src/components/AuthModal.jsx` — default `mode` to `'login'`

## Deploy
1. Commit (`fix: prevent api 502 from reaped Neon connection + default auth modal to login`).
2. `openkbs fn deploy api` (no new deps — `pg` already vendored).
3. `cd frontend && npm run build && openkbs site deploy`.

## Verification
1. **502 fix:** after deploy, trigger a cold start, let it idle ~1 min, hit the API
   again; repeat a few times — should always return 200, never 502. Tail
   `openkbs fn logs api` and confirm no new `Runtime.ExitError` lines appear.
2. **Modal:** load findmyuni.io, open Вход/Регистрация — should now show **two**
   fields (Имейл, Парола) by default; clicking "Създай" reveals the role selector +
   Име (three fields). Log in with `student@unikompas.bg / Uchenik2026!` and confirm
   the navbar shows the logged-in name.
3. **Credits:** report to the user — ≈ €6,293 (6,293,284 credits) remaining.
