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

function buildPrompt(context) {
  if (!context) return 'Няма налични резултати.';
  const home = context.home || {};
  const lines = [];
  lines.push(`Сфера: ${context.field || '—'}${context.region ? `, регион: ${context.region}` : ''}.`);
  if (context.priorities?.length) lines.push(`Приоритети на ученика (по важност): ${context.priorities.join(', ')}.`);
  lines.push(
    `ДОМ — ${home.name || 'България'}: ср. такса $${home.avgTuition ?? '—'}/год., Еразъм ${home.erasmus ?? '—'}/100, ` +
    `стипендии ${home.scholarshipAvailability ?? '—'}%, издръжка (индекс) ${home.costOfLiving ?? '—'}/100.`
  );
  (context.universities || []).forEach((u, i) => {
    const b = (u.breakdown || []).map((x) => `${x.label} ${x.value}`).join(', ');
    lines.push(
      `${i + 1}. ${u.name} (${u.city || u.country}) — общ скор ${u.score}/100, ` +
      `световен ранг #${u.bestRank ?? '—'}, такса $${u.avgTuition ?? '—'}/год., Еразъм ${u.erasmus ?? '—'}/100, ` +
      `репутация работодатели ${u.employerRep ?? '—'}/100${b ? `; критерии: ${b}` : ''}.`
    );
  });
  return lines.join('\n');
}

async function chat({ question, context, history }) {
  if (!process.env.OPENKBS_API_KEY) return { reply: 'AI асистентът не е конфигуриран (липсва ключ).' };

  const system =
    'Ти си УниКомпас — приятелски AI асистент за избор на университет, който говори на български. ' +
    'Анализирай САМО предоставените данни за университетите и България по-долу. ' +
    'Отговаряй кратко и конкретно, с числа от данните. Ако нещо липсва в данните, кажи го честно. ' +
    'Помагаш на ученик да реши кой университет е най-подходящ и има ли смисъл да учи в чужбина.\n\n' +
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
