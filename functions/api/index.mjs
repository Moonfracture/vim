/**
 * УниКомпас — API
 *
 * Accounts (two roles), favorites, university posts + likes, community messages,
 * and the AI assistant. Data lives in Postgres (DATABASE_URL); the AI proxy is
 * reached with OPENKBS_API_KEY. Auth is a node:crypto HMAC bearer token — no deps
 * beyond `pg`.
 *
 * Roles & permissions:
 *   student     — AI chat, write in Общност, like uni posts, favorite schools
 *   university  — post in Университети (cannot write in Общност / no AI / no faves)
 */
import crypto from 'node:crypto';
import pg from 'pg';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
const json = (data, statusCode = 200) => ({ statusCode, headers, body: JSON.stringify(data) });

const MODEL = 'gemini-3.1-flash-lite-preview';
const AUTH_SECRET = process.env.AUTH_SECRET || 'dev-insecure-secret-change-me';
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------
let pool;
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

process.on('unhandledRejection', (e) => console.error('unhandledRejection:', e?.message || e));
const q = (text, params) => getPool().query(text, params);

// Demo accounts that are seeded once and emailed to the user.
const DEMO = {
  student: { email: 'student@unikompas.bg', password: 'Uchenik2026!', name: 'Демо Ученик', role: 'student', plan: 'free' },
  university: { email: 'uni@unikompas.bg', password: 'Universitet2026!', name: 'Демо Университет', role: 'university', plan: 'paid' },
};

let schemaReady;
function ensureSchema() {
  if (!schemaReady) schemaReady = (async () => {
    await q(`
      CREATE TABLE IF NOT EXISTS app_users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        role TEXT NOT NULL CHECK (role IN ('student','university')),
        password_hash TEXT NOT NULL,
        plan TEXT NOT NULL DEFAULT 'free',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS favorites (
        user_id INT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
        uni_key TEXT NOT NULL,
        uni_name TEXT,
        uni_country TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, uni_key)
      );
      CREATE TABLE IF NOT EXISTS uni_posts (
        id SERIAL PRIMARY KEY,
        author_id INT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
        author_name TEXT,
        title TEXT,
        body TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS post_likes (
        post_id INT NOT NULL REFERENCES uni_posts(id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (post_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS community_messages (
        id SERIAL PRIMARY KEY,
        channel TEXT NOT NULL,
        user_id INT REFERENCES app_users(id) ON DELETE SET NULL,
        author_name TEXT,
        author_role TEXT,
        text TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    // Seed the two demo accounts (idempotent).
    for (const d of Object.values(DEMO)) {
      await q(
        `INSERT INTO app_users (email, name, role, password_hash, plan)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email) DO NOTHING`,
        [d.email, d.name, d.role, hashPassword(d.password), d.plan]
      );
    }
  })();
  return schemaReady;
}

// ---------------------------------------------------------------------------
// Auth helpers (node:crypto only)
// ---------------------------------------------------------------------------
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pw, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(pw, stored) {
  const [salt, hash] = (stored || '').split(':');
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(pw, salt, 64);
  const ref = Buffer.from(hash, 'hex');
  return test.length === ref.length && crypto.timingSafeEqual(test, ref);
}
const b64url = (buf) => Buffer.from(buf).toString('base64url');
function signToken(user) {
  const payload = b64url(JSON.stringify({ uid: user.id, role: user.role, name: user.name, email: user.email, iat: Date.now() }));
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}
function verifyToken(token) {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.iat || Date.now() - data.iat > TOKEN_TTL_MS) return null;
    return data; // { uid, role, name, email, iat }
  } catch { return null; }
}
function bearer(event) {
  const h = event.headers || {};
  const raw = h.authorization || h.Authorization || '';
  return raw.startsWith('Bearer ') ? raw.slice(7) : '';
}
class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
function requireAuth(event, roles) {
  const user = verifyToken(bearer(event));
  if (!user) throw new HttpError(401, 'Изисква се вход.');
  if (roles && !roles.includes(user.role)) throw new HttpError(403, 'Нямаш права за това действие.');
  return user;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const clip = (s, n) => String(s ?? '').trim().slice(0, n);
const publicUser = (r) => ({ id: r.id, email: r.email, name: r.name, role: r.role, plan: r.plan });

// ---------------------------------------------------------------------------
// Account actions
// ---------------------------------------------------------------------------
async function register({ email, password, name, role }) {
  email = clip(email, 200).toLowerCase();
  if (!isEmail(email)) throw new HttpError(400, 'Невалиден имейл.');
  if (typeof password !== 'string' || password.length < 6) throw new HttpError(400, 'Паролата трябва да е поне 6 знака.');
  if (role !== 'student' && role !== 'university') throw new HttpError(400, 'Невалидна роля.');
  const plan = role === 'university' ? 'paid' : 'free';
  const displayName = clip(name, 120) || email.split('@')[0];
  let row;
  try {
    ({ rows: [row] } = await q(
      `INSERT INTO app_users (email, name, role, password_hash, plan)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, email, name, role, plan`,
      [email, displayName, role, hashPassword(password), plan]
    ));
  } catch (e) {
    if (e.code === '23505') throw new HttpError(409, 'Профил с този имейл вече съществува.');
    throw e;
  }
  return { token: signToken(row), user: publicUser(row) };
}

async function login({ email, password }) {
  email = clip(email, 200).toLowerCase();
  const { rows: [row] } = await q(`SELECT * FROM app_users WHERE email = $1`, [email]);
  if (!row || !verifyPassword(password || '', row.password_hash)) {
    throw new HttpError(401, 'Грешен имейл или парола.');
  }
  return { token: signToken(row), user: publicUser(row) };
}

async function me(event) {
  const auth = requireAuth(event);
  const { rows: [row] } = await q(`SELECT id, email, name, role, plan FROM app_users WHERE id = $1`, [auth.uid]);
  if (!row) throw new HttpError(401, 'Профилът не е намерен.');
  return { user: publicUser(row) };
}

// ---------------------------------------------------------------------------
// Favorites (student only)
// ---------------------------------------------------------------------------
async function favoritesList(event) {
  const u = requireAuth(event);
  const { rows } = await q(
    `SELECT uni_key, uni_name, uni_country FROM favorites WHERE user_id = $1 ORDER BY created_at DESC`,
    [u.uid]
  );
  return { favorites: rows.map((r) => ({ key: r.uni_key, name: r.uni_name, country: r.uni_country })) };
}
async function favoriteToggle(event, { uniKey, uniName, uniCountry }) {
  const u = requireAuth(event, ['student']);
  const key = clip(uniKey, 200);
  if (!key) throw new HttpError(400, 'Липсва университет.');
  const { rowCount } = await q(`DELETE FROM favorites WHERE user_id = $1 AND uni_key = $2`, [u.uid, key]);
  if (rowCount) return { favorited: false };
  await q(
    `INSERT INTO favorites (user_id, uni_key, uni_name, uni_country) VALUES ($1,$2,$3,$4)
     ON CONFLICT (user_id, uni_key) DO NOTHING`,
    [u.uid, key, clip(uniName, 200) || key, clip(uniCountry, 120) || null]
  );
  return { favorited: true };
}

// ---------------------------------------------------------------------------
// University posts + likes
// ---------------------------------------------------------------------------
async function postsList(event) {
  const viewer = verifyToken(bearer(event)); // optional
  const { rows } = await q(
    `SELECT p.id, p.author_name, p.title, p.body, p.created_at,
            COUNT(l.user_id)::int AS like_count,
            BOOL_OR(l.user_id = $1) AS liked_by_me
       FROM uni_posts p
       LEFT JOIN post_likes l ON l.post_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT 100`,
    [viewer?.uid ?? -1]
  );
  return { posts: rows.map((r) => ({
    id: r.id, authorName: r.author_name, title: r.title, body: r.body,
    createdAt: r.created_at, likeCount: r.like_count, likedByMe: !!r.liked_by_me,
  })) };
}
async function postCreate(event, { title, body }) {
  const u = requireAuth(event, ['university']);
  const text = clip(body, 4000);
  if (!text) throw new HttpError(400, 'Публикацията не може да е празна.');
  const { rows: [row] } = await q(
    `INSERT INTO uni_posts (author_id, author_name, title, body) VALUES ($1,$2,$3,$4)
     RETURNING id, author_name, title, body, created_at`,
    [u.uid, clip(u.name, 200), clip(title, 200) || null, text]
  );
  return { post: { id: row.id, authorName: row.author_name, title: row.title, body: row.body, createdAt: row.created_at, likeCount: 0, likedByMe: false } };
}
async function postLikeToggle(event, { postId }) {
  const u = requireAuth(event, ['student']);
  const id = Number(postId);
  if (!Number.isInteger(id)) throw new HttpError(400, 'Невалидна публикация.');
  const { rowCount } = await q(`DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2`, [id, u.uid]);
  if (rowCount) return { liked: false };
  try {
    await q(`INSERT INTO post_likes (post_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [id, u.uid]);
  } catch (e) {
    if (e.code === '23503') throw new HttpError(404, 'Публикацията не съществува.');
    throw e;
  }
  return { liked: true };
}

// ---------------------------------------------------------------------------
// Community (read public; write = students only)
// ---------------------------------------------------------------------------
async function communityList(_event, { channel }) {
  const ch = clip(channel, 40);
  if (!ch) throw new HttpError(400, 'Липсва канал.');
  const { rows } = await q(
    `SELECT m.id, m.author_name, m.author_role, m.text, m.created_at
       FROM community_messages m WHERE m.channel = $1 ORDER BY m.created_at ASC LIMIT 200`,
    [ch]
  );
  return { messages: rows.map((r) => ({
    id: r.id, authorName: r.author_name, authorRole: r.author_role, text: r.text, createdAt: r.created_at,
  })) };
}
async function communityPost(event, { channel, text }) {
  const u = requireAuth(event, ['student']);
  const ch = clip(channel, 40);
  const body = clip(text, 1000);
  if (!ch) throw new HttpError(400, 'Липсва канал.');
  if (!body) throw new HttpError(400, 'Съобщението не може да е празно.');
  const { rows: [row] } = await q(
    `INSERT INTO community_messages (channel, user_id, author_name, author_role, text)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, author_name, author_role, text, created_at`,
    [ch, u.uid, clip(u.name, 120), u.role, body]
  );
  return { message: { id: row.id, authorName: row.author_name, authorRole: row.author_role, text: row.text, createdAt: row.created_at } };
}

// ---------------------------------------------------------------------------
// AI assistant (students only)
// ---------------------------------------------------------------------------
const money = (v, code) => (v == null ? '—' : `${Math.round(v)} ${code || 'USD'}`);

function buildPrompt(context) {
  if (!context) return 'Няма налични резултати.';
  const home = context.home || {};
  const lines = [];
  lines.push(`Сфера: ${context.field || '—'}${context.region ? `, регион: ${context.region}` : ''}.`);
  if (context.scope?.names?.length) lines.push(`Избрани ${context.scope.kind || 'локации'}: ${context.scope.names.join(', ')}.`);
  if (context.priorities?.length) lines.push(`Приоритети на ученика (по важност): ${context.priorities.join(', ')}.`);
  const homeTuition = (home.tuitionMin != null && home.tuitionMax != null)
    ? `${money(home.tuitionMin, home.currency)}–${money(home.tuitionMax, home.currency)}`
    : money(home.avgTuition, home.currency);
  lines.push(
    `ДОМ — ${home.name || 'България'}: такса ${homeTuition}/год., Еразъм ${home.erasmus ?? '—'}/100, ` +
    `стипендии ${home.scholarshipAvailability ?? '—'}%, ориентировъчна издръжка ~${money(home.monthlyCost, home.currency)}/мес.`
  );
  (context.universities || []).forEach((u, i) => {
    const b = (u.breakdown || []).map((x) => `${x.label} ${x.value}`).join(', ');
    lines.push(
      `${i + 1}. ${u.name} (${u.city || u.country}) — общ скор ${u.score}/100, ` +
      `световен ранг #${u.bestRank ?? '—'}, такса ${money(u.avgTuition, u.currency)}/год., издръжка ~${money(u.monthlyCost, u.currency)}/мес., Еразъм ${u.erasmus ?? '—'}/100, ` +
      `репутация работодатели ${u.employerRep ?? '—'}/100${b ? `; критерии: ${b}` : ''}.`
    );
  });
  return lines.join('\n');
}

async function chat(event, { question, context, history }) {
  requireAuth(event, ['student']);
  if (!process.env.OPENKBS_API_KEY) return { reply: 'AI асистентът не е конфигуриран (липсва ключ).' };

  const uniNames = (context?.universities || []).map((u) => u.name).join(', ') || 'няма';
  const system =
    'Ти си УниКомпас — приятелски AI асистент за избор на университет, който говори на български. ' +
    'Анализирай ЕДИНСТВЕНО конкретните университети и България от данните по-долу — те са картите, които ученикът вижда на екрана. ' +
    `Разглежданите университети са САМО: ${uniNames}. ` +
    'НЕ въвеждай други университети, държави или примери извън тези данни. ' +
    'Сравнявай ги помежду им и спрямо България, с конкретни числа от данните (такса, ранг, Еразъм, скор). ' +
    'Сумите са в местната валута на всеки университет (кодът ѝ е до числото, напр. BGN за България, EUR, GBP, JPY) — ' +
    'отговаряй в съответната валута, никога в щатски долари. ' +
    'Отговаряй кратко (до ~120 думи). Ако нещо липсва в данните, кажи го честно вместо да предполагаш.\n\n' +
    'ДАННИ ЗА ТЕКУЩОТО СРАВНЕНИЕ:\n' + buildPrompt(context);

  const contents = [];
  const turns = (history || []).filter((m) => m && m.text);
  turns.forEach((m, i) => {
    const role = m.role === 'assistant' ? 'model' : 'user';
    const text = i === 0 && role === 'user' ? `${system}\n\nВъпрос: ${m.text}` : m.text;
    contents.push({ role, parts: [{ text }] });
  });
  if (!turns.length) {
    contents.push({ role: 'user', parts: [{ text: `${system}\n\nВъпрос: ${question || ''}` }] });
  }

  const res = await fetch(
    `https://proxy.openkbs.com/v1/google/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENKBS_API_KEY}` },
      body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 700, temperature: 0.6 } }),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  const reply = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
  return { reply: reply || 'Нямам отговор за това.' };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export const handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  try {
    const body = JSON.parse(event.body || '{}');
    await ensureSchema();
    switch (body.action) {
      case 'status':            return json({ ok: true, ai: !!process.env.OPENKBS_API_KEY, db: !!process.env.DATABASE_URL, projectId: process.env.OPENKBS_PROJECT_ID });
      case 'register':          return json(await register(body));
      case 'login':             return json(await login(body));
      case 'me':                return json(await me(event));
      case 'favorites.list':    return json(await favoritesList(event));
      case 'favorite.toggle':   return json(await favoriteToggle(event, body));
      case 'posts.list':        return json(await postsList(event));
      case 'post.create':       return json(await postCreate(event, body));
      case 'post.like.toggle':  return json(await postLikeToggle(event, body));
      case 'community.list':    return json(await communityList(event, body));
      case 'community.post':    return json(await communityPost(event, body));
      case 'chat':              return json(await chat(event, body));
      default:
        return json({ error: 'Unknown action', available: [
          'status', 'register', 'login', 'me', 'favorites.list', 'favorite.toggle',
          'posts.list', 'post.create', 'post.like.toggle', 'community.list', 'community.post', 'chat',
        ] }, 400);
    }
  } catch (error) {
    return json({ error: error.message }, error.status || 500);
  }
};
