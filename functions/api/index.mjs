/**
 * УниКомпас — API
 *
 * Action:
 *   chat -> { reply }  AI assistant that analyzes the on-screen comparison cards.
 *
 * Env: OPENKBS_API_KEY (AI proxy). No database — all data is bundled in the frontend.
 */
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (data, statusCode = 200) => ({ statusCode, headers, body: JSON.stringify(data) });

const MODEL = 'gemini-3.1-flash-lite-preview';

// amounts arrive in USD; print them with the country's currency code so the model
// answers in the right unit (Bulgaria in лв). Conversion to the symbol happens in the UI.
const money = (v, code) => (v == null ? '—' : `${Math.round(v)} ${code || 'USD'}`);

function buildPrompt(context) {
  if (!context) return 'Няма налични резултати.';
  const home = context.home || {};
  const lines = [];
  lines.push(`Сфера: ${context.field || '—'}${context.region ? `, регион: ${context.region}` : ''}.`);
  if (context.countries?.length) lines.push(`Избрани държави: ${context.countries.join(', ')}.`);
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

async function chat({ question, context, history }) {
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

  // Map prior turns into Gemini contents; first user turn carries the system framing.
  const contents = [];
  const turns = (history || []).filter((m) => m && m.text);
  turns.forEach((m, i) => {
    const role = m.role === 'assistant' ? 'model' : 'user';
    const text = i === 0 && role === 'user' ? `${system}\n\nВъпрос: ${m.text}` : m.text;
    contents.push({ role, parts: [{ text }] });
  });
  // Ensure the latest question is present (Chatbot sends it inside history, but guard anyway).
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
  if (!res.ok) {
    const detail = data?.error?.message || `HTTP ${res.status}`;
    throw new Error(detail);
  }
  const reply = (data?.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || '')
    .join('')
    .trim();
  return { reply: reply || 'Нямам отговор за това.' };
}

export const handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  try {
    const body = JSON.parse(event.body || '{}');
    switch (body.action) {
      case 'chat':
        return json(await chat(body));
      case 'status':
        return json({ ok: true, ai: !!process.env.OPENKBS_API_KEY, projectId: process.env.OPENKBS_PROJECT_ID });
      default:
        return json({ error: 'Unknown action', available: ['chat', 'status'] }, 400);
    }
  } catch (error) {
    return json({ error: error.message }, 500);
  }
};
