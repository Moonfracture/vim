import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Icon, Flag } from '../lib/icons.jsx';
import { CRITERIA_BY_ID } from '../lib/scoring.js';
import { schemeForField } from '../lib/baloobrazuvane.js';

const fmtUSD = (n) => (n == null ? '—' : '$' + Math.round(n).toLocaleString('en-US'));
const fmtMonthly = (n) => (n == null ? '—' : '~$' + Math.round(n).toLocaleString('en-US'));

// One result card. `center` styles the Bulgaria home card differently.
export default function UniversityCard({ data, order, field, center = false, delay = 0 }) {
  const isCountry = !!data.topUniversities; // bulgaria card shape
  const topCriteria = (order || []).slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`glass relative flex h-full flex-col p-5 ${
        center ? 'border-accent/40 bg-accent/[0.07] ring-1 ring-accent/20' : 'glass-hover'
      }`}
    >
      {center && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-lg shadow-accent/30">
          Твоят дом
        </span>
      )}
      {!center && data.score != null && (
        <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-bold text-accent-soft ring-1 ring-accent/30">
          <Icon.star size={12} /> {data.score}
        </span>
      )}

      <div className="flex items-start gap-3">
        <Flag iso2={data.iso2} className="h-7 w-10 shrink-0" />
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-bold leading-tight text-white">{data.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
            <Icon.pin size={12} /> {isCountry ? `${data.universityCount} университета` : (data.city || data.country)}
          </p>
        </div>
      </div>

      {isCountry ? (
        <CountryBody data={data} />
      ) : (
        <UniBody data={data} topCriteria={topCriteria} field={field} />
      )}
    </motion.div>
  );
}

function Metric({ icon: I, label, value, hint }) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-white/5 py-2 text-sm first:border-t-0">
      <span className="flex items-center gap-2 text-slate-400">{I && <I size={15} />}{label}</span>
      <span className="text-right font-semibold text-slate-100">
        {value}{hint && <span className="ml-1 text-[11px] font-normal text-slate-500">{hint}</span>}
      </span>
    </div>
  );
}

function UniBody({ data, topCriteria, field }) {
  const scheme = schemeForField(field);
  return (
    <div className="mt-4 flex flex-1 flex-col">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {data.bestRank && <span className="chip py-0.5 text-[11px]"><Icon.trophy size={12} /> #{data.bestRank} свят</span>}
        {data.type && <span className="chip py-0.5 text-[11px]">{data.type === 'Public' ? 'Държавен' : 'Частен'}</span>}
        {data.founded && <span className="chip py-0.5 text-[11px]">осн. {data.founded}</span>}
      </div>
      <div className="rounded-xl bg-black/20 px-3">
        <Metric icon={Icon.coin} label="Такса/год." value={fmtUSD(data.avgTuition)} />
        <Metric icon={Icon.bag} label="Издръжка" value={fmtMonthly(data.monthlyCost)} hint="/мес" />
        <Metric icon={Icon.trophy} label="Стойност на диплома" value={`${data.breakdown ? data.breakdown.find(b=>b.id==='degree')?.value ?? '—' : '—'}/100`} />
        <Metric icon={Icon.globe} label="Еразъм" value={`${data.erasmus ?? '—'}/100`} />
        {data.employerRep != null && <Metric icon={Icon.spark} label="Репутация работодатели" value={`${Math.round(data.employerRep)}/100`} />}
      </div>

      {/* балообразуване by field — links to the calculator pre-set for this profile */}
      <Link
        to={`/calculator?scheme=${scheme.id}`}
        className="group mt-2.5 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition-colors hover:border-accent/40 hover:bg-accent/[0.06]"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent-soft ring-1 ring-accent/30">
          <Icon.calc size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] uppercase tracking-wider text-slate-500">Балообразуване</span>
          <span className="block truncate text-xs font-medium text-slate-200">{scheme.formula}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-accent-soft transition-transform group-hover:translate-x-0.5">
          Изчисли <Icon.arrow size={13} />
        </span>
      </Link>

      {/* how it scores on the user's top criteria */}
      <div className="mt-3 space-y-1.5">
        {topCriteria.map((id) => {
          const b = data.breakdown?.find((x) => x.id === id);
          const c = CRITERIA_BY_ID[id];
          if (!b) return null;
          return (
            <div key={id} className="flex items-center gap-2">
              <span className="flex w-36 shrink-0 items-center gap-1.5 text-xs text-slate-400">
                <c.icon size={13} /> {c.label}
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full bg-gradient-to-r from-accent-deep to-accent-soft" style={{ width: `${b.value}%` }} />
              </span>
              <span className="w-7 text-right text-xs font-semibold text-slate-300">{b.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CountryBody({ data }) {
  return (
    <div className="mt-4 flex flex-1 flex-col">
      <div className="rounded-xl bg-black/20 px-3">
        <Metric icon={Icon.coin} label="Ср. такса/год." value={fmtUSD(data.avgTuition)} />
        <Metric icon={Icon.bag} label="Издръжка" value={fmtMonthly(data.monthlyCost)} hint="/мес" />
        <Metric icon={Icon.spark} label="Стипендии" value={`${data.scholarshipAvailability}%`} />
        <Metric icon={Icon.globe} label="Еразъм" value={`${data.erasmus}/100`} />
      </div>
      <p className="mt-3 text-[11px] uppercase tracking-wider text-slate-500">Топ университети</p>
      <ul className="mt-1.5 space-y-1">
        {data.topUniversities.slice(0, 5).map((u, i) => (
          <li key={u.name} className="flex items-center gap-2 text-xs text-slate-300">
            <span className="grid h-4 w-4 shrink-0 place-items-center rounded bg-white/10 text-[10px] font-bold text-slate-400">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate">{u.nameBg || u.name}</span>
            {u.city && <span className="shrink-0 text-[11px] text-slate-500">{u.city}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
