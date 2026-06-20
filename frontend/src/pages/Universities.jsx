import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '../lib/icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// Mock university profiles. Universities can add photos (local preview) and achievements.
// Specs (founded / fields / balo) mirror the curated BG_META set in scripts/build-data.mjs.
const SEED = [
  {
    id: 'su',
    name: 'Софийски университет „Св. Климент Охридски“',
    city: 'София',
    founded: 1888,
    fields: ['Компютърни науки', 'Право', 'Природни науки', 'Хуманитарни науки', 'Социални науки'],
    balo: 'Признават се матури; за Информатика (ФМИ) математика с коеф. 2.5 + оценки от диплома',
    tuition: '~700–4500 лв./год.',
    hue: 'from-indigo-500/30 to-violet-600/20',
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
    hue: 'from-sky-500/30 to-indigo-600/20',
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
    hue: 'from-fuchsia-500/30 to-purple-600/20',
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
    hue: 'from-slate-400/30 to-indigo-600/20',
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

export default function Universities() {
  const { user } = useAuth();
  const isUni = user?.role === 'university';
  const [unis, setUnis] = useState(SEED);

  const addAchievement = (id, text) =>
    setUnis((prev) => prev.map((u) => (u.id === id ? { ...u, achievements: [...u.achievements, text] } : u)));
  const addPhoto = (id, photo) =>
    setUnis((prev) => prev.map((u) => (u.id === id ? { ...u, photos: [...u.photos, photo] } : u)));

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
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">Витрина на университетите</h1>
          <p className="mt-3 text-slate-400">
            Университетите представят кампуси, постижения и програми. Влез с роля „Университет“, за да редактираш.
          </p>
        </div>
        <span
          className={`chip ${isUni ? 'border-accent/30 bg-accent/10 text-accent-soft' : 'text-slate-400'}`}
        >
          {isUni ? <><Icon.check size={14} /> Режим на редакция</> : <><Icon.users size={14} /> Режим на преглед</>}
        </span>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {unis.map((u, i) => (
          <UniCard
            key={u.id}
            uni={u}
            delay={0.05 * i}
            editable={isUni}
            onAddAchievement={(t) => addAchievement(u.id, t)}
            onAddPhoto={(p) => addPhoto(u.id, p)}
          />
        ))}
      </div>
    </div>
  );
}

function UniCard({ uni, delay, editable, onAddAchievement, onAddPhoto }) {
  const [ach, setAch] = useState('');
  const fileRef = useRef(null);

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onAddPhoto({ label: file.name.replace(/\.[^.]+$/, ''), url: URL.createObjectURL(file) });
      e.target.value = '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="glass glass-hover flex flex-col overflow-hidden"
    >
      <div className={`relative h-28 bg-gradient-to-br ${uni.hue}`}>
        <div className="absolute inset-0 grid place-items-center text-white/30">
          <Icon.cap size={40} />
        </div>
        <span className="absolute left-4 top-4 chip bg-black/30 backdrop-blur">
          <Icon.pin size={12} /> {uni.city}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-base font-bold leading-tight text-white">{uni.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{uni.blurb}</p>

        {/* Specifications */}
        {(uni.founded || uni.fields?.length || uni.tuition || uni.balo) && (
          <div className="mt-4 space-y-2.5">
            {uni.founded && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Icon.cap size={13} className="shrink-0 text-accent-soft" /> осн. {uni.founded}
              </div>
            )}
            {uni.fields?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {uni.fields.map((f) => (
                  <span key={f} className="chip py-0.5 text-[11px]">{f}</span>
                ))}
              </div>
            )}
            {uni.tuition && (
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Icon.coin size={13} className="shrink-0 text-accent-soft" /> Такса: {uni.tuition}
              </div>
            )}
            {uni.balo && (
              <div className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
                <Icon.calc size={13} className="mt-0.5 shrink-0 text-accent-soft" />
                <span><span className="font-semibold text-slate-400">Балообразуване: </span>{uni.balo}</span>
              </div>
            )}
          </div>
        )}

        {/* Photos */}
        <p className="mt-4 text-[11px] uppercase tracking-wider text-slate-500">Галерия</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {uni.photos.map((p, i) => {
            const obj = typeof p === 'object';
            return obj ? (
              <img
                key={i}
                src={p.url}
                alt={p.label}
                className="h-12 w-16 rounded-lg object-cover ring-1 ring-white/10"
              />
            ) : (
              <span key={i} className="flex h-12 w-16 items-center justify-center rounded-lg bg-white/[0.05] text-center text-[10px] text-slate-400 ring-1 ring-white/10">
                {p}
              </span>
            );
          })}
          {editable && (
            <>
              <button
                onClick={() => fileRef.current?.click()}
                className="grid h-12 w-16 place-items-center rounded-lg border border-dashed border-white/20 text-slate-400 transition-colors hover:border-accent/50 hover:text-accent-soft"
                aria-label="Качи снимка"
              >
                <Icon.upload size={16} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            </>
          )}
        </div>

        {/* Achievements */}
        <p className="mt-4 text-[11px] uppercase tracking-wider text-slate-500">Постижения</p>
        <ul className="mt-2 space-y-1.5">
          {uni.achievements.map((a, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
              <span className="mt-0.5 text-accent-soft"><Icon.trophy size={13} /></span>
              <span>{a}</span>
            </li>
          ))}
        </ul>

        {editable && (
          <div className="mt-4 flex items-center gap-2">
            <input
              className="input py-2 text-sm"
              placeholder="Добави постижение…"
              value={ach}
              onChange={(e) => setAch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && ach.trim()) { onAddAchievement(ach.trim()); setAch(''); }
              }}
            />
            <button
              onClick={() => { if (ach.trim()) { onAddAchievement(ach.trim()); setAch(''); } }}
              disabled={!ach.trim()}
              className="btn-primary shrink-0 px-3 py-2.5 disabled:opacity-40"
            >
              <Icon.check size={16} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
