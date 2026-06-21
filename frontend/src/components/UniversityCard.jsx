import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Icon, Flag } from '../lib/icons.jsx';
import { CRITERIA_BY_ID } from '../lib/scoring.js';
import { schemeForField } from '../lib/baloobrazuvane.js';
import { fmtMoney, fmtRange } from '../lib/currency.js';
import { canEngage, useAuth } from '../context/AuthContext.jsx';

// Official site if known, else a web search for it — every card stays clickable.
const websiteHref = (d) =>
  d.website ||
  `https://www.google.com/search?q=${encodeURIComponent(`${d.name} ${d.country || ''} official website`)}`;

// One result card. `center` styles the Bulgaria home card differently.
// `control` renders an optional pager/action node pinned to the card bottom.
export default function UniversityCard({ data, order, field, center = false, delay = 0, control = null }) {
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
          <h3 className="truncate font-display text-base font-bold leading-tight text-forest-ink">{data.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-forest/70">
            <Icon.pin size={12} /> {isCountry ? `${data.universityCount} университета` : (data.city || data.country)}
          </p>
        </div>
      </div>

      {isCountry ? (
        <CountryBody data={data} />
      ) : (
        <UniBody data={data} topCriteria={topCriteria} field={field} />
      )}
      {control && <div className="mt-3">{control}</div>}
    </motion.div>
  );
}

function Metric({ icon: I, label, value, hint }) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-forest/10 py-2 text-sm first:border-t-0">
      <span className="flex items-center gap-2 text-forest/70">{I && <I size={15} />}{label}</span>
      <span className="text-right font-semibold text-forest-ink">
        {value}{hint && <span className="ml-1 text-[11px] font-normal text-forest/50">{hint}</span>}
      </span>
    </div>
  );
}

function UniBody({ data, topCriteria, field }) {
  const scheme = schemeForField(field);
  const { user, isFavorite, toggleFavorite } = useAuth();
  const fav = isFavorite(data.name);
  return (
    <div className="mt-4 flex flex-1 flex-col">
      <div className="mb-3 flex flex-wrap gap-1.5">
        <a
          href={websiteHref(data)}
          target="_blank"
          rel="noopener noreferrer"
          className="chip py-0.5 text-[11px] hover:border-accent/40 hover:text-forest-ink"
        >
          <Icon.globe size={12} /> {data.website ? 'Сайт' : 'Търси сайт'}
        </a>
        {canEngage(user?.role) && (
          <button
            type="button"
            onClick={() => toggleFavorite({ key: data.name, name: data.name, country: data.country })}
            className={`chip py-0.5 text-[11px] transition-colors ${
              fav ? 'border-accent/50 bg-accent/15 text-accent-soft' : 'hover:border-accent/40 hover:text-forest-ink'
            }`}
            aria-pressed={fav}
          >
            <Icon.heart size={12} className={fav ? 'fill-current' : ''} /> {fav ? 'Запазен' : 'Запази'}
          </button>
        )}
        {data.bestRank && <span className="chip py-0.5 text-[11px]"><Icon.trophy size={12} /> #{data.bestRank} свят</span>}
        {data.nationalRank && <span className="chip py-0.5 text-[11px]"><Icon.trophy size={12} /> #{data.nationalRank} в България</span>}
        {data.type && <span className="chip py-0.5 text-[11px]">{data.type === 'Public' ? 'Държавен' : 'Частен'}</span>}
        {data.founded && <span className="chip py-0.5 text-[11px]">осн. {data.founded}</span>}
      </div>
      <div className="rounded-xl bg-ink-850 px-3">
        <Metric
          icon={Icon.coin}
          label="Такса/год."
          value={data.tuitionMin != null ? fmtRange(data.tuitionMin, data.tuitionMax, data.iso2) : fmtMoney(data.avgTuition, data.iso2)}
          hint={data.tuitionMin != null ? null : 'средно'}
        />
        <Metric icon={Icon.bag} label="Издръжка" value={fmtMoney(data.monthlyCost, data.iso2, { monthly: true })} hint="/мес" />
        <Metric icon={Icon.trophy} label="Стойност на диплома" value={`${data.breakdown ? data.breakdown.find(b=>b.id==='degree')?.value ?? '—' : '—'}/100`} />
        <Metric icon={Icon.globe} label="Еразъм" value={`${data.erasmus ?? '—'}/100`} />
        {data.employerRep != null && <Metric icon={Icon.spark} label="Репутация работодатели" value={`${Math.round(data.employerRep)}/100`} />}
      </div>

      {/* балообразуване by field — links to the calculator pre-set for this profile */}
      <Link
        to={`/calculator?scheme=${scheme.id}`}
        className="group mt-2.5 flex items-center gap-2.5 rounded-xl border border-forest/10 bg-ink-850 px-3 py-2.5 transition-colors hover:border-accent/40 hover:bg-accent/[0.06]"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent-soft ring-1 ring-accent/30">
          <Icon.calc size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] uppercase tracking-wider text-forest/50">Балообразуване</span>
          <span className="block truncate text-xs font-medium text-forest-ink">{scheme.formula}</span>
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
              <span className="flex w-36 shrink-0 items-center gap-1.5 text-xs text-forest/70">
                <c.icon size={13} /> {c.label}
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-forest/10">
                <span className="block h-full rounded-full bg-gradient-to-r from-accent-deep to-accent" style={{ width: `${b.value}%` }} />
              </span>
              <span className="w-7 text-right text-xs font-semibold text-forest/70">{b.value}</span>
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
      <div className="rounded-xl bg-ink-850 px-3">
        <Metric icon={Icon.coin} label="Ср. такса/год." value={fmtMoney(data.avgTuition, data.iso2)} hint="средно" />
        <Metric icon={Icon.bag} label="Издръжка" value={fmtMoney(data.monthlyCost, data.iso2, { monthly: true })} hint="/мес" />
        <Metric icon={Icon.spark} label="Стипендии" value={`${data.scholarshipAvailability}%`} />
        <Metric icon={Icon.globe} label="Еразъм" value={`${data.erasmus}/100`} />
      </div>
      <p className="mt-3 text-[11px] uppercase tracking-wider text-forest/50">Топ университети</p>
      <ul className="mt-1.5 space-y-1">
        {data.topUniversities.slice(0, 5).map((u, i) => (
          <li key={u.name} className="flex items-center gap-2 text-xs text-forest/70">
            <span className="grid h-4 w-4 shrink-0 place-items-center rounded bg-forest/10 text-[10px] font-bold text-forest/60">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate">{u.nameBg || u.name}</span>
            {u.city && <span className="shrink-0 text-[11px] text-forest/50">{u.city}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
