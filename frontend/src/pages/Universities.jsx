import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '../lib/icons.jsx';
import { canEngage, useAuth } from '../context/AuthContext.jsx';
import { callApi } from '../lib/api.js';
import bgUniversities from '../data/bg-universities.json';
import fieldsData from '../data/fields.json';

const FIELDS = fieldsData.fields;

const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' }); }
  catch { return ''; }
};

export default function Universities() {
  const { user } = useAuth();
  const isUni = user?.role === 'university';
  const isStudent = canEngage(user?.role);
  const [posts, setPosts] = useState([]);

  const load = async () => {
    try { const { posts: p } = await callApi('posts.list'); setPosts(p || []); }
    catch { setPosts([]); }
  };
  useEffect(() => { load(); }, [user?.id]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="max-w-2xl">
          <span className="chip mb-4 w-fit border-accent/30 bg-accent/10 text-accent-soft">
            <Icon.cap size={14} /> Университети
          </span>
          <h1 className="font-display text-3xl font-bold text-forest-ink sm:text-4xl">Витрина на университетите</h1>
          <p className="mt-3 text-forest/70">
            Университетите публикуват новини и събития. Учениците ги харесват. Влез с роля „Университет“, за да публикуваш.
          </p>
        </div>
        <span className={`chip ${isUni ? 'border-accent/30 bg-accent/10 text-accent-soft' : 'text-forest/60'}`}>
          {isUni ? <><Icon.check size={14} /> Можеш да публикуваш</> : <><Icon.users size={14} /> Режим на преглед</>}
        </span>
      </motion.div>

      {/* Публикации — persistent, shared feed */}
      <section className="mb-12">
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold text-forest-ink">
          <Icon.chat size={18} className="text-accent-soft" /> Публикации
        </h2>

        {isUni && <Composer onPosted={(post) => setPosts((prev) => [post, ...prev])} />}

        {!user && (
          <div className="glass mb-5 flex flex-col items-center gap-2 p-5 text-center">
            <p className="text-sm text-forest/70">Влез като ученик, за да харесваш публикации, или като университет, за да публикуваш.</p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('unikompas:open-auth'))}
              className="btn-primary px-5 py-2.5 text-sm"
            >
              <Icon.users size={16} /> Вход / Регистрация
            </button>
          </div>
        )}

        {posts.length === 0 ? (
          <div className="glass p-8 text-center text-sm text-forest/70">Все още няма публикации.</div>
        ) : (
          <div className="space-y-3">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} canLike={isStudent} onChange={(np) =>
                setPosts((prev) => prev.map((x) => (x.id === np.id ? np : x)))
              } />
            ))}
          </div>
        )}
      </section>

      <Directory />
    </div>
  );
}

function Directory() {
  const [q, setQ] = useState('');
  const [field, setField] = useState('');

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return bgUniversities.filter((u) => {
      if (field && !u.fields.includes(field)) return false;
      if (!needle) return true;
      return (
        u.nameBg.toLowerCase().includes(needle) ||
        (u.city && u.city.toLowerCase().includes(needle))
      );
    });
  }, [q, field]);

  return (
    <section>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest-ink">
          <Icon.cap size={18} className="text-accent-soft" /> Всички университети
          <span className="text-sm font-normal text-forest/50">({list.length})</span>
        </h2>
        <p className="text-xs text-forest/50">Източник: РСВУ 2025 (МОН)</p>
      </div>

      {/* filter bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Icon.search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-forest/40" />
          <input
            className="input pl-9"
            placeholder="Търси по име или град…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="input sm:w-64"
          value={field}
          onChange={(e) => setField(e.target.value)}
        >
          <option value="">Всички направления</option>
          {FIELDS.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      {list.length === 0 ? (
        <div className="glass p-8 text-center text-sm text-forest/70">Няма университети по този филтър.</div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {list.map((u, i) => (
            <UniCard key={u.key} uni={u} delay={Math.min(0.03 * i, 0.3)} />
          ))}
        </div>
      )}
    </section>
  );
}

function Composer({ onPosted }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!body.trim() || busy) return;
    setBusy(true); setError('');
    try {
      const { post } = await callApi('post.create', { title: title.trim(), body: body.trim() });
      onPosted(post);
      setTitle(''); setBody('');
    } catch (e) { setError(e.message || 'Публикуването се провали.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="glass mb-5 p-4">
      <input
        className="input mb-2"
        placeholder="Заглавие (по избор)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="input min-h-[90px] resize-y"
        placeholder="Сподели новина, събитие или ден на отворените врати…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {error && <p className="mt-2 text-sm text-coral">{error}</p>}
      <div className="mt-3 flex justify-end">
        <button onClick={submit} disabled={!body.trim() || busy} className="btn-primary px-4 py-2 text-sm disabled:opacity-40">
          <Icon.send size={15} /> {busy ? 'Публикуване…' : 'Публикувай'}
        </button>
      </div>
    </div>
  );
}

function PostCard({ post, canLike, onChange }) {
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (!canLike || busy) return;
    setBusy(true);
    // optimistic
    const optimistic = {
      ...post,
      likedByMe: !post.likedByMe,
      likeCount: post.likeCount + (post.likedByMe ? -1 : 1),
    };
    onChange(optimistic);
    try {
      const { liked } = await callApi('post.like.toggle', { postId: post.id });
      onChange({ ...post, likedByMe: liked, likeCount: post.likeCount + (liked ? 1 : 0) - (post.likedByMe ? 1 : 0) });
    } catch {
      onChange(post); // revert
    } finally { setBusy(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="glass p-5"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent-soft ring-1 ring-accent/30">
          <Icon.cap size={16} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-forest-ink">{post.authorName || 'Университет'}</p>
          <p className="text-[11px] text-forest/50">{fmtDate(post.createdAt)}</p>
        </div>
      </div>

      {post.title && <h3 className="mt-3 font-display text-base font-bold text-forest-ink">{post.title}</h3>}
      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-forest/70">{post.body}</p>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={toggle}
          disabled={!canLike || busy}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
            post.likedByMe
              ? 'bg-accent/15 text-accent-soft ring-1 ring-accent/30'
              : 'bg-forest/[0.06] text-forest/60 ring-1 ring-forest/10'
          } ${canLike ? 'hover:text-forest-ink' : 'cursor-default'}`}
          aria-pressed={post.likedByMe}
          title={canLike ? '' : 'Само ученици и студенти могат да харесват'}
        >
          <Icon.heart size={14} className={post.likedByMe ? 'fill-current' : ''} /> {post.likeCount}
        </button>
        {!canLike && <span className="text-[11px] text-forest/40">харесвания</span>}
      </div>
    </motion.div>
  );
}

function UniCard({ uni, delay }) {
  const [open, setOpen] = useState(false);

  // group specialties by their official РСВУ field for the expanded view
  const byField = useMemo(() => {
    const m = new Map();
    for (const s of uni.specialties) {
      if (!m.has(s.field)) m.set(s.field, []);
      m.get(s.field).push(s);
    }
    return [...m.entries()];
  }, [uni.specialties]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className="glass glass-hover flex flex-col p-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent-soft ring-1 ring-accent/30">
          <Icon.cap size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[15px] font-bold leading-tight text-forest-ink">{uni.nameBg}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-forest/60">
            {uni.city && <span className="flex items-center gap-1"><Icon.pin size={11} className="text-accent-soft" /> {uni.city}</span>}
            {uni.founded && <span className="flex items-center gap-1"><Icon.cap size={11} className="text-accent-soft" /> осн. {uni.founded}</span>}
            {uni.nationalRank && <span className="flex items-center gap-1"><Icon.trophy size={11} className="text-accent-soft" /> №{uni.nationalRank} в BG</span>}
          </div>
        </div>
      </div>

      {uni.fields.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {uni.fields.map((f) => (
            <span key={f} className="chip py-0.5 text-[11px]">{f}</span>
          ))}
        </div>
      )}

      {uni.crosswalked && (uni.balo || uni.tuitionMin != null) && (
        <div className="mt-4 space-y-2">
          {uni.tuitionMin != null && (
            <div className="flex items-center gap-2 text-xs text-forest/70">
              <Icon.coin size={13} className="shrink-0 text-accent-soft" />
              Такса: ~{uni.tuitionMin.toLocaleString('bg-BG')}–{uni.tuitionMax.toLocaleString('bg-BG')} USD/год.
            </div>
          )}
          {uni.balo && (
            <div className="flex items-start gap-2 text-[11px] leading-relaxed text-forest/50">
              <Icon.calc size={13} className="mt-0.5 shrink-0 text-accent-soft" />
              <span><span className="font-semibold text-forest/60">Балообразуване: </span>{uni.balo}</span>
            </div>
          )}
        </div>
      )}

      {/* specialties */}
      <div className="mt-4 flex-1">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-lg bg-forest/[0.05] px-3 py-2 text-left text-xs font-semibold text-forest/70 ring-1 ring-forest/10 transition-colors hover:text-forest-ink"
        >
          <span>{uni.specialtyCount} специалности</span>
          <Icon.arrow size={14} className={`transition-transform ${open ? '-rotate-90' : 'rotate-90'}`} />
        </button>
        {open && (
          <div className="mt-2 max-h-64 space-y-3 overflow-y-auto pr-1">
            {byField.map(([f, specs]) => (
              <div key={f}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-soft">{f}</p>
                <ul className="mt-1 space-y-1">
                  {specs.map((s, i) => (
                    <li key={i} className="flex items-start justify-between gap-2 text-xs text-forest/70">
                      <span>{s.name}</span>
                      {s.degrees.length > 0 && (
                        <span className="shrink-0 text-[10px] text-forest/40">{s.degrees.join(' · ')}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* joint programs */}
      {uni.jointPrograms.length > 0 && (
        <div className="mt-4 border-t border-forest/10 pt-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-forest/50">
            <Icon.globe size={12} className="text-accent-soft" /> Съвместни програми ({uni.jointPrograms.length})
          </p>
          <ul className="mt-1.5 space-y-1">
            {uni.jointPrograms.slice(0, 3).map((j, i) => (
              <li key={i} className="text-[11px] leading-relaxed text-forest/60">
                <span className="text-forest/70">{j.specialties || j.field}</span>
                {j.country && <span className="text-forest/40"> · {j.country}</span>}
              </li>
            ))}
            {uni.jointPrograms.length > 3 && (
              <li className="text-[11px] text-forest/40">+ още {uni.jointPrograms.length - 3}</li>
            )}
          </ul>
        </div>
      )}

      {uni.website && (
        <a
          href={uni.website}
          target="_blank"
          rel="noreferrer"
          className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-accent-soft hover:underline"
        >
          <Icon.globe size={13} /> Официален сайт
        </a>
      )}
    </motion.div>
  );
}
