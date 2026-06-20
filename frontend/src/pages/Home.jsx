import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon, Flag } from '../lib/icons.jsx';
import universities from '../data/universities.json';
import countries from '../data/countries.json';
import bulgaria from '../data/bulgaria.json';

const stagger = { animate: { transition: { staggerChildren: 0.08 } } };
const item = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const features = [
  { icon: Icon.search, title: 'Умно търсене', text: 'Избери сфера и подреди критериите си — таксата, Еразъм, нощния живот — по важност.' },
  { icon: Icon.cap, title: 'X-сравнение', text: 'България в центъра, а в четирите ъгъла — топ университетите според твоите приоритети.' },
  { icon: Icon.spark, title: 'AI асистент', text: 'Чатбот анализира резултатите и ти казва има ли смисъл да заминеш в чужбина.' },
];

export default function Home() {
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-6 pb-16 pt-20 sm:pt-28">
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/30 blur-[120px]" />
        <motion.div variants={stagger} initial="initial" animate="animate" className="relative text-center">
          <motion.span variants={item} className="chip mx-auto mb-6 w-fit border-accent/30 bg-accent/10 text-accent-soft">
            <Icon.spark size={14} /> Хакатон · Избор на университет
          </motion.span>
          <motion.h1 variants={item} className="mx-auto max-w-4xl font-display text-4xl font-bold leading-[1.05] text-white sm:text-6xl">
            Намери най-добрия<br /><span className="grad-text">университет за теб</span>
          </motion.h1>
          <motion.p variants={item} className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
            Сравни такси, стойност на дипломата, Еразъм възможности и качество на живот —
            на едно място. Реши има ли смисъл да учиш в чужбина, или у дома.
          </motion.p>
          <motion.div variants={item} className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link to="/search" className="btn-primary px-7 py-3 text-base">
              <Icon.search size={18} /> Започни сравнението
            </Link>
            <Link to="/community" className="btn-ghost px-7 py-3 text-base">
              <Icon.users size={18} /> Виж общността
            </Link>
          </motion.div>

          <motion.div variants={item} className="mx-auto mt-10 flex max-w-lg flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-400">
            <Stat value={universities.length} label="световни университета" />
            <Stat value={countries.length} label="държави" />
            <Stat value={bulgaria.universityCount} label="български университета" />
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 pb-8">
        <motion.div
          variants={stagger} initial="initial" whileInView="animate" viewport={{ once: true, margin: '-80px' }}
          className="grid gap-5 md:grid-cols-3"
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={item} className="glass glass-hover p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent/15 text-accent-soft ring-1 ring-accent/30">
                <f.icon size={22} />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Audience strip */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="glass flex flex-col items-center gap-6 p-8 sm:flex-row sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">За кого е УниКомпас?</h2>
            <p className="mt-1 text-sm text-slate-400">Един инструмент, три гледни точки.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {['Ученици 8–12 клас', 'Родители', 'Университети'].map((a) => (
              <span key={a} className="chip border-accent/25 bg-accent/10 px-4 py-2 text-accent-soft">
                <Icon.check size={14} /> {a}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Flag marquee-ish preview */}
      <section className="mx-auto max-w-7xl px-6 pb-6">
        <p className="mb-4 text-center text-xs uppercase tracking-widest text-slate-500">Държави в сравнението</p>
        <div className="flex flex-wrap justify-center gap-2.5">
          {countries.slice(0, 22).map((c) => (
            <span key={c.name} className="chip gap-2 py-1.5">
              <Flag iso2={c.iso2} className="h-3.5 w-5" /> {c.name}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="font-display text-2xl font-bold text-white">{value}</span>
      <span>{label}</span>
    </span>
  );
}
