import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '../lib/icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// Mock community: channels + seeded conversations between applicants and current students.
const CHANNELS = [
  { id: 'general', name: 'Общи въпроси', desc: 'Кандидатстване, изпити, мотивация' },
  { id: 'cs', name: 'Компютърни науки', desc: 'IT, AI, софтуерно инженерство' },
  { id: 'abroad', name: 'Учене в чужбина', desc: 'Стипендии, визи, живот навън' },
  { id: 'medicine', name: 'Медицина', desc: 'Приемни изпити и стаж' },
];

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

export default function Community() {
  const { user } = useAuth();
  const [active, setActive] = useState('general');
  const [threads, setThreads] = useState(SEED);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  const messages = threads[active] || [];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, active]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const name = user ? `${user.name} (ти)` : 'Ти (гост)';
    const msg = { from: name, role: 'me', text, t: 'сега' };
    setThreads((prev) => ({ ...prev, [active]: [...(prev[active] || []), msg] }));
    setInput('');
  };

  const channel = CHANNELS.find((c) => c.id === active);

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
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">Питай тези, които вече са там</h1>
        <p className="mt-3 text-slate-400">
          Свържи се със студенти от университети у нас и в чужбина. Задай въпрос — реален човек ще ти отговори.
        </p>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        {/* Channels */}
        <div className="glass h-fit p-3">
          <p className="px-2 pb-2 pt-1 text-[11px] uppercase tracking-wider text-slate-500">Канали</p>
          <div className="space-y-1">
            {CHANNELS.map((c) => (
              <button
                key={c.id}
                onClick={() => setActive(c.id)}
                className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
                  active === c.id ? 'bg-accent/15 ring-1 ring-accent/30' : 'hover:bg-white/[0.05]'
                }`}
              >
                <span className={`flex items-center gap-2 text-sm font-medium ${active === c.id ? 'text-white' : 'text-slate-300'}`}>
                  <Icon.chat size={14} /> {c.name}
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">{c.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="glass flex min-h-[520px] flex-col overflow-hidden">
          <div className="border-b border-white/5 px-5 py-3.5">
            <p className="text-sm font-semibold text-white">{channel?.name}</p>
            <p className="text-[11px] text-slate-500">{channel?.desc} · примерен разговор</p>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {messages.map((m, i) => {
              const mine = m.role === 'me';
              return (
                <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${mine ? 'items-end text-right' : ''}`}>
                    <div className="mb-1 flex items-center gap-2 text-[11px] text-slate-500">
                      {!mine && <RoleDot role={m.role} />}
                      <span>{m.from}</span>
                      <span className="text-slate-600">· {m.t}</span>
                    </div>
                    <div
                      className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        mine
                          ? 'bg-accent text-white'
                          : m.role === 'student'
                            ? 'border border-accent/20 bg-accent/[0.06] text-slate-200'
                            : 'border border-white/10 bg-white/[0.04] text-slate-200'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 border-t border-white/5 p-3">
            <input
              className="input"
              placeholder={user ? 'Напиши съобщение…' : 'Пишеш като гост — влез, за да те разпознаят…'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button onClick={send} disabled={!input.trim()} className="btn-primary shrink-0 px-3 py-3 disabled:opacity-40">
              <Icon.send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleDot({ role }) {
  const isStudent = role === 'student';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
      isStudent ? 'bg-accent/15 text-accent-soft' : 'bg-white/10 text-slate-400'
    }`}>
      {isStudent ? 'студент' : 'кандидат'}
    </span>
  );
}
