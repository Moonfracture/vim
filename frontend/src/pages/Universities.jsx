import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '../lib/icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { callApi } from '../lib/api.js';

// Static showcase profiles (curated). Specs mirror the BG_META set in scripts/build-data.mjs.
const SEED = [
  {
    id: 'su',
    name: 'Софийски университет „Св. Климент Охридски“',
    city: 'София',
    founded: 1888,
    fields: ['Компютърни науки', 'Право', 'Природни науки', 'Хуманитарни науки', 'Социални науки'],
    balo: 'Признават се матури; за Информатика (ФМИ) математика с коеф. 2.5 + оценки от диплома',
    tuition: '~700–4500 лв./год.',
    hue: 'from-emerald-500/30 to-green-600/20',
    blurb: 'Най-старият български университет — 16 факултета, силни природни и хуманитарни науки.',
    achievements: ['№1 в България (Scimago)', 'Над 20 000 студенти', 'Партньор по 600+ Еразъм програми'],
    photos: ['Ректорат', 'Библиотека', 'Аула'],
  },
  {
    id: 'tu',
    name: 'Технически университет — София',
    city: 'София',
    founded: 1945,
    fields: ['Инженерство', 'Компютърни науки'],
    balo: 'Матура/изпит по математика (до 3×) + оценки от диплома',
    tuition: '~800–4000 лв./год.',
    hue: 'from-teal-500/30 to-emerald-600/20',
    blurb: 'Водещ инженерен университет с фокус върху IT, електроника и роботика.',
    achievements: ['Най-добра инженерна школа', 'Лаборатории с индустрията', 'Високи нива на реализация'],
    photos: ['Кампус', 'Лаборатория', 'Хакатон'],
  },
  {
    id: 'unwe',
    name: 'Университет за национално и световно стопанство',
    city: 'София',
    founded: 1920,
    fields: ['Бизнес и икономика', 'Право', 'Социални науки'],
    balo: 'Единен приемен изпит или матура (математика/БЕЛ) + оценки от диплома',
    tuition: '~700–3800 лв./год.',
    hue: 'from-amber-500/30 to-orange-600/20',
    blurb: 'Най-големият икономически университет в Югоизточна Европа — финанси, мениджмънт и право.',
    achievements: ['Над 18 000 студенти', 'Силна мрежа с бизнеса', 'Международни акредитации'],
    photos: ['Корпус', 'Аула Максима', 'Библиотека'],
  },
  {
    id: 'nbu',
    name: 'Нов български университет',
    city: 'София',
    founded: 1991,
    fields: ['Бизнес и икономика', 'Социални науки', 'Изкуства и дизайн', 'Хуманитарни науки'],
    balo: 'По документи и/или тест; матурите се признават',
    tuition: '~2900–5500 лв./год.',
    hue: 'from-rose-500/30 to-pink-600/20',
    blurb: 'Частен университет с либерално образование, изкуства, дизайн и социални науки.',
    achievements: ['Гъвкави програми', 'Силно портфолио в изкуствата', 'Международен обмен'],
    photos: ['Кампус', 'Галерия', 'Студио'],
  },
  {
    id: 'pu',
    name: 'Пловдивски университет „Паисий Хилендарски“',
    city: 'Пловдив',
    founded: 1961,
    fields: ['Компютърни науки', 'Природни науки', 'Хуманитарни науки', 'Социални науки'],
    balo: 'Матури и/или кандидатстудентски изпити според специалността',
    tuition: '~700–3500 лв./год.',
    hue: 'from-teal-500/30 to-cyan-600/20',
    blurb: 'Вторият по големина университет в страната — широк спектър от природни и хуманитарни науки.',
    achievements: ['Силен ФМИ', 'Регионален научен център', 'Активни Еразъм програми'],
    photos: ['Ректорат', 'Лаборатория', 'Кампус'],
  },
  {
    id: 'mu-sofia',
    name: 'Медицински университет — София',
    city: 'София',
    founded: 1917,
    fields: ['Медицина'],
    balo: 'ДЗИ БЕЛ + 3×Биология + 3×Химия (изпити); макс. бал 42',
    tuition: '~900–8000 лв./год.',
    hue: 'from-red-500/30 to-rose-600/20',
    blurb: 'Водещ медицински университет — медицина, дентална медицина и фармация.',
    achievements: ['Топ медицинска школа', 'Университетски болници', 'Програми на английски'],
    photos: ['Клиника', 'Аудитория', 'Лаборатория'],
  },
  {
    id: 'mu-varna',
    name: 'Медицински университет — Варна',
    city: 'Варна',
    founded: 1961,
    fields: ['Медицина'],
    balo: 'ДЗИ БЕЛ + 3×Биология + 3×Химия (изпити); макс. бал 42',
    tuition: '~900–8000 лв./год.',
    hue: 'from-emerald-500/30 to-teal-600/20',
    blurb: 'Обучение по медицина, дентална медицина и фармация с международни студенти.',
    achievements: ['Програми на английски', 'Модерна симулационна болница', 'Топ 3 в страната'],
    photos: ['Клиника', 'Аудитория', 'Лаборатория'],
  },
  {
    id: 'mu-plovdiv',
    name: 'Медицински университет — Пловдив',
    city: 'Пловдив',
    founded: 1945,
    fields: ['Медицина'],
    balo: 'ДЗИ БЕЛ + 3×Биология + 3×Химия (изпити); макс. бал 42',
    tuition: '~900–8000 лв./год.',
    hue: 'from-emerald-500/30 to-green-600/20',
    blurb: 'Медицина, дентална медицина и фармация с модерна симулационна база.',
    achievements: ['Симулационен тренировъчен център', 'Международни студенти', 'Силна клинична практика'],
    photos: ['Клиника', 'Симулации', 'Аудитория'],
  },
  {
    id: 'uacg',
    name: 'Университет по архитектура, строителство и геодезия',
    city: 'София',
    founded: 1942,
    fields: ['Инженерство', 'Изкуства и дизайн'],
    balo: 'Изпит по математика + изпит по рисуване (за архитектура) + диплома',
    tuition: '~800–4000 лв./год.',
    hue: 'from-green-500/30 to-teal-600/20',
    blurb: 'Специализиран в архитектура, строително инженерство и геодезия.',
    achievements: ['Единствен профилиран в страната', 'Силна проектантска база', 'Признати архитекти'],
    photos: ['Корпус', 'Ателие', 'Макетна зала'],
  },
  {
    id: 'uctm',
    name: 'Химикотехнологичен и металургичен университет',
    city: 'София',
    founded: 1953,
    fields: ['Инженерство', 'Природни науки'],
    balo: 'Изпит/матура по математика или химия + оценки от диплома',
    tuition: '~800–3800 лв./год.',
    hue: 'from-lime-500/30 to-emerald-600/20',
    blurb: 'Инженерна химия, материалознание, биотехнологии и металургия.',
    achievements: ['Индустриални партньорства', 'Изследователски лаборатории', 'Висока реализация'],
    photos: ['Лаборатория', 'Кампус', 'Реактор'],
  },
  {
    id: 'ru',
    name: 'Русенски университет „Ангел Кънчев“',
    city: 'Русе',
    founded: 1945,
    fields: ['Инженерство', 'Компютърни науки', 'Бизнес и икономика'],
    balo: 'Матура/изпит по математика или БЕЛ + оценки от диплома',
    tuition: '~700–3500 лв./год.',
    hue: 'from-cyan-500/30 to-blue-600/20',
    blurb: 'Дунавски университет с инженерство, IT и икономика и силен международен обмен.',
    achievements: ['Трансгранични програми', 'Модерни лаборатории', 'Активни Еразъм партньори'],
    photos: ['Кампус', 'Лаборатория', 'Библиотека'],
  },
  {
    id: 'tu-varna',
    name: 'Технически университет — Варна',
    city: 'Варна',
    founded: 1962,
    fields: ['Инженерство', 'Компютърни науки'],
    balo: 'Матура/изпит по математика + оценки от диплома',
    tuition: '~800–3800 лв./год.',
    hue: 'from-blue-500/30 to-sky-600/20',
    blurb: 'Морско, електро- и машинно инженерство и компютърни технологии край морето.',
    achievements: ['Силна морска подготовка', 'Индустриални стажове', 'Регионален IT център'],
    photos: ['Кампус', 'Лаборатория', 'Симулатор'],
  },
];

const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' }); }
  catch { return ''; }
};

export default function Universities() {
  const { user } = useAuth();
  const isUni = user?.role === 'university';
  const isStudent = user?.role === 'student';
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

      {/* Static showcase */}
      <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold text-forest-ink">
        <Icon.cap size={18} className="text-accent-soft" /> Профили
      </h2>
      <div className="grid gap-6 lg:grid-cols-3">
        {SEED.map((u, i) => (
          <UniCard key={u.id} uni={u} delay={0.04 * i} />
        ))}
      </div>
    </div>
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
          title={canLike ? '' : 'Само ученици могат да харесват'}
        >
          <Icon.heart size={14} className={post.likedByMe ? 'fill-current' : ''} /> {post.likeCount}
        </button>
        {!canLike && <span className="text-[11px] text-forest/40">харесвания</span>}
      </div>
    </motion.div>
  );
}

function UniCard({ uni, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="glass glass-hover flex flex-col overflow-hidden"
    >
      <div className={`relative h-28 bg-gradient-to-br ${uni.hue}`}>
        <div className="absolute inset-0 grid place-items-center text-forest/25">
          <Icon.cap size={40} />
        </div>
        <span className="absolute left-4 top-4 chip bg-forest/80 text-white backdrop-blur">
          <Icon.pin size={12} /> {uni.city}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-base font-bold leading-tight text-forest-ink">{uni.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-forest/70">{uni.blurb}</p>

        <div className="mt-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs text-forest/70">
            <Icon.cap size={13} className="shrink-0 text-accent-soft" /> осн. {uni.founded}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {uni.fields.map((f) => (
              <span key={f} className="chip py-0.5 text-[11px]">{f}</span>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-forest/70">
            <Icon.coin size={13} className="shrink-0 text-accent-soft" /> Такса: {uni.tuition}
          </div>
          <div className="flex items-start gap-2 text-[11px] leading-relaxed text-forest/50">
            <Icon.calc size={13} className="mt-0.5 shrink-0 text-accent-soft" />
            <span><span className="font-semibold text-forest/60">Балообразуване: </span>{uni.balo}</span>
          </div>
        </div>

        <p className="mt-4 text-[11px] uppercase tracking-wider text-forest/50">Галерия</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {uni.photos.map((p, i) => (
            <span key={i} className="flex h-12 w-16 items-center justify-center rounded-lg bg-forest/[0.06] text-center text-[10px] text-forest/60 ring-1 ring-forest/10">
              {p}
            </span>
          ))}
        </div>

        <p className="mt-4 text-[11px] uppercase tracking-wider text-forest/50">Постижения</p>
        <ul className="mt-2 space-y-1.5">
          {uni.achievements.map((a, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-forest/70">
              <span className="mt-0.5 text-accent-soft"><Icon.trophy size={13} /></span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
