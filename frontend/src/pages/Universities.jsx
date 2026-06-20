import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '../lib/icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';

// Mock university profiles. Universities can add photos (local preview) and achievements.
const SEED = [
  {
    id: 'su',
    name: 'Софийски университет „Св. Климент Охридски“',
    city: 'София',
    hue: 'from-indigo-500/30 to-violet-600/20',
    blurb: 'Най-старият български университет — 16 факултета, силни природни и хуманитарни науки.',
    achievements: ['№1 в България (Scimago)', 'Над 20 000 студенти', 'Партньор по 600+ Еразъм програми'],
    photos: ['Ректорат', 'Библиотека', 'Аула'],
  },
  {
    id: 'tu',
    name: 'Технически университет — София',
    city: 'София',
    hue: 'from-sky-500/30 to-indigo-600/20',
    blurb: 'Водещ инженерен университет с фокус върху IT, електроника и роботика.',
    achievements: ['Най-добра инженерна школа', 'Лаборатории с индустрията', 'Високи нива на реализация'],
    photos: ['Кампус', 'Лаборатория', 'Хакатон'],
  },
  {
    id: 'mu-varna',
    name: 'Медицински университет — Варна',
    city: 'Варна',
    hue: 'from-emerald-500/30 to-teal-600/20',
    blurb: 'Обучение по медицина, дентална медицина и фармация с международни студенти.',
    achievements: ['Програми на английски', 'Модерна симулационна болница', 'Топ 3 в страната'],
    photos: ['Клиника', 'Аудитория', 'Лаборатория'],
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
