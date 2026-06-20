import { useRef, useState, useEffect } from 'react';
import { Icon } from '../lib/icons.jsx';
import { callApi } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

// Chatbot that analyzes the current result cards via Gemini (backend proxy).
export default function Chatbot({ context }) {
  const { user } = useAuth();
  const isStudent = user?.role === 'student';
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Здравей! Анализирах резултатите. Питай ме например: „Има ли смисъл да уча в чужбина?“ или „Кой е най-евтиният вариант?“' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text) => {
    if (!isStudent) return;
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput('');
    const next = [...messages, { role: 'user', text: q }];
    setMessages(next);
    setLoading(true);
    try {
      const { reply } = await callApi('chat', {
        question: q,
        context,
        history: next.slice(-6).map((m) => ({ role: m.role, text: m.text })),
      });
      setMessages((m) => [...m, { role: 'assistant', text: reply || 'Няма отговор.' }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', text: 'Грешка при връзката с асистента: ' + e.message }]);
    } finally {
      setLoading(false);
    }
  };

  const prompts = ['Има ли смисъл да уча в чужбина?', 'Кой е най-евтиният вариант?', 'Сравни ги за качество на дипломата'];

  return (
    <div className="glass flex flex-col overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-white/5 px-5 py-3.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accent-soft ring-1 ring-accent/30">
          <Icon.spark size={16} />
        </span>
        <div>
          <p className="text-sm font-semibold text-white">AI асистент</p>
          <p className="text-[11px] text-slate-500">Анализира картите · powered by Gemini</p>
        </div>
      </div>

      <div ref={scrollRef} className="max-h-[360px] min-h-[200px] space-y-3 overflow-y-auto px-5 py-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-accent text-white'
                : 'border border-white/10 bg-white/[0.04] text-slate-200'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent-soft" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            </div>
          </div>
        )}
      </div>

      {isStudent && messages.length <= 2 && (
        <div className="flex flex-wrap gap-2 px-5 pb-3">
          {prompts.map((p) => (
            <button key={p} onClick={() => send(p)} className="chip hover:border-accent/40 hover:text-white">{p}</button>
          ))}
        </div>
      )}

      {isStudent ? (
        <div className="flex items-center gap-2 border-t border-white/5 p-3">
          <input
            className="input"
            placeholder="Попитай за резултатите…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <button onClick={() => send()} disabled={loading || !input.trim()} className="btn-primary shrink-0 px-3 py-3 disabled:opacity-40">
            <Icon.send size={18} />
          </button>
        </div>
      ) : user ? (
        <div className="border-t border-white/5 p-4 text-center text-sm text-slate-400">
          AI асистентът е достъпен за ученически профили.
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 border-t border-white/5 p-4 text-center">
          <p className="text-sm text-slate-400">Влез в профила си, за да питаш AI асистента.</p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('unikompas:open-auth'))}
            className="btn-primary px-5 py-2.5 text-sm"
          >
            <Icon.users size={16} /> Вход / Регистрация
          </button>
        </div>
      )}
    </div>
  );
}
