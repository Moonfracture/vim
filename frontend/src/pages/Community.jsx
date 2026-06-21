import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '../lib/icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { callApi } from '../lib/api.js';

const CHANNELS = [
  { id: 'general', name: 'Общи въпроси', desc: 'Кандидатстване, изпити, мотивация' },
  { id: 'cs', name: 'Компютърни науки', desc: 'IT, AI, софтуерно инженерство' },
  { id: 'abroad', name: 'Учене в чужбина', desc: 'Стипендии, визи, живот навън' },
  { id: 'medicine', name: 'Медицина', desc: 'Приемни изпити и стаж' },
];

// Seeded example conversations shown above the live, shared thread.
const SEED = {
  general: [
    { from: 'Мартин (студент, СУ)', role: 'student', text: 'Здравейте! Аз съм втори курс, питайте каквото ви интересува за кандидатстването. 🙂', t: '09:12' },
    { from: 'Виктория, 12 клас', role: 'applicant', text: 'Колко тежи матурата спрямо приемния изпит?', t: '09:20' },
    { from: 'Мартин (студент, СУ)', role: 'student', text: 'Зависи от специалността — при нас приемният е водещ, матурата е условие за допускане.', t: '09:23' },
  ],
  cs: [
    { from: 'Алекс (студент, ТУ)', role: 'student', text: 'За CS най-важна е математиката. Не учете наизуст, решавайте задачи.', t: 'вчера' },
    { from: 'Никола, 11 клас', role: 'applicant', text: 'Има ли смисъл да уча AI в чужбина или у нас е достатъчно?', t: 'вчера' },
    { from: 'Алекс (студент, ТУ)', role: 'student', text: 'Базата тук е силна. За магистратура чужбина дава повече, особено за research.', t: 'вчера' },
  ],
  abroad: [
    { from: 'Елена (студент, TU Munich)', role: 'student', text: 'Еразъм е най-лесният начин да пробвате чужбина без целия риск.', t: '08:40' },
    { from: 'Деян, 12 клас', role: 'applicant', text: 'Как се справяте с разходите за наем?', t: '08:55' },
  ],
  medicine: [
    { from: 'Ива (студент, МУ Варна)', role: 'student', text: 'Биология и химия — започнете подготовка поне година по-рано.', t: 'пон' },
  ],
};

const fmtTime = (iso) => {
  try { return new Date(iso).toLocaleTimeString('bg-BG', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};

export default function Community() {
  const { user } = useAuth();
  const [active, setActive] = useState('general');
  const [live, setLive] = useState([]);      // messages from the DB for the active channel
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const canPost = user?.role === 'student' || user?.role === 'university_student';
  const isUni = user?.role === 'university';

  const load = async (channel) => {
    try {
      const { messages } = await callApi('community.list', { channel });
      setLive(messages || []);
    } catch { setLive([]); }
  };

  useEffect(() => { load(active); }, [active]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [live.length, active]);

  const send = async () => {
    const text = input.trim();
    if (!text || !canPost || sending) return;
    setSending(true);
    try {
      const { message } = await callApi('community.post', { channel: active, text });
      setLive((prev) => [...prev, message]);
      setInput('');
    } catch { /* keep input on failure */ } finally { setSending(false); }
  };

  const channel = CHANNELS.find((c) => c.id === active);
  const seeded = SEED[active] || [];

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8 max-w-2xl"
      >
        <span className="chip mb-4 w-fit border-accent/30 bg-accent/10 text-accent-soft">
          <Icon.users size={14} /> Общност
        </span>
        <h1 className="font-display text-3xl font-bold text-forest-ink sm:text-4xl">Питай тези, които вече са там</h1>
        <p className="mt-3 text-forest/70">
          Свържи се със студенти от университети у нас и в чужбина. Задай въпрос — реален човек ще ти отговори.
        </p>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        {/* Channels */}
        <div className="glass h-fit p-3">
          <p className="px-2 pb-2 pt-1 text-[11px] uppercase tracking-wider text-forest/50">Канали</p>
          <div className="space-y-1">
            {CHANNELS.map((c) => (
              <button
                key={c.id}
                onClick={() => setActive(c.id)}
                className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
                  active === c.id ? 'bg-accent/15 ring-1 ring-accent/30' : 'hover:bg-forest/[0.06]'
                }`}
              >
                <span className={`flex items-center gap-2 text-sm font-medium ${active === c.id ? 'text-forest-ink' : 'text-forest/70'}`}>
                  <Icon.chat size={14} /> {c.name}
                </span>
                <span className="mt-0.5 block truncate text-xs text-forest/50">{c.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="glass flex min-h-[520px] flex-col overflow-hidden">
          <div className="border-b border-forest/10 px-5 py-3.5">
            <p className="text-sm font-semibold text-forest-ink">{channel?.name}</p>
            <p className="text-[11px] text-forest/50">{channel?.desc}</p>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {seeded.map((m, i) => (
              <Bubble key={`seed-${i}`} from={m.from} role={m.role} text={m.text} t={m.t} mine={false} />
            ))}
            {seeded.length > 0 && live.length > 0 && (
              <div className="flex items-center gap-3 py-1 text-[10px] uppercase tracking-wider text-forest/40">
                <span className="h-px flex-1 bg-forest/10" /> На живо <span className="h-px flex-1 bg-forest/10" />
              </div>
            )}
            {live.map((m) => (
              <Bubble
                key={m.id}
                from={m.authorName}
                role={m.authorRole}
                detail={m.authorDetail}
                text={m.text}
                t={fmtTime(m.createdAt)}
                mine={user && m.authorName === user.name}
              />
            ))}
          </div>

          {!user && (
            <div className="flex flex-col items-center gap-2 border-t border-forest/10 p-4 text-center">
              <p className="text-sm text-forest/70">Влез в профила си, за да пишеш в общността.</p>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('unikompas:open-auth'))}
                className="btn-primary px-5 py-2.5 text-sm"
              >
                <Icon.users size={16} /> Вход / Регистрация
              </button>
            </div>
          )}

          {isUni && (
            <div className="border-t border-forest/10 p-4 text-center text-sm text-forest/70">
              Университетските профили не могат да пишат тук. Споделяй новини в{' '}
              <span className="font-semibold text-accent-soft">Университети</span>.
            </div>
          )}

          {canPost && (
            <div className="flex items-center gap-2 border-t border-forest/10 p-3">
              <input
                className="input"
                placeholder="Напиши съобщение…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
              />
              <button onClick={send} disabled={!input.trim() || sending} className="btn-primary shrink-0 px-3 py-3 disabled:opacity-40">
                <Icon.send size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Bubble({ from, role, detail, text, t, mine }) {
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${mine ? 'items-end text-right' : ''}`}>
        <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] text-forest/50">
          {!mine && <RoleDot role={role} />}
          <span>{from}</span>
          {detail && <span className="text-forest/40">· {detail}</span>}
          {t && <span className="text-forest/40">· {t}</span>}
        </div>
        <div
          className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            mine
              ? 'bg-accent text-white'
              : (role === 'student' || role === 'university_student')
                ? 'border border-accent/20 bg-accent/[0.06] text-forest-ink'
                : 'border border-forest/10 bg-ink-850 text-forest-ink'
          }`}
        >
          {text}
        </div>
      </div>
    </div>
  );
}

function RoleDot({ role }) {
  const label = role === 'student' ? 'ученик' : role === 'university_student' ? 'студент' : 'кандидат';
  const highlight = role === 'student' || role === 'university_student';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
      highlight ? 'bg-accent/15 text-accent-soft' : 'bg-forest/10 text-forest/60'
    }`}>
      {label}
    </span>
  );
}
