import { Icon, Flag } from '../lib/icons.jsx';
import { nameBg } from '../lib/countryNames.js';

// Country tickboxes for the selected region. `available` is [{ iso2, country, bestRank }]
// (pre-sorted by rank); `selected` is an array of iso2. Empty selection = whole region.
export default function CountryFilter({ available, selected, onChange }) {
  if (!available || available.length <= 1) return null;

  const sel = new Set(selected);
  const toggle = (iso2) => {
    const next = new Set(sel);
    next.has(iso2) ? next.delete(iso2) : next.add(iso2);
    onChange([...next]);
  };

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="label mb-0">Държави</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500">{sel.size} от {available.length} избрани</span>
          <button
            type="button"
            onClick={() => onChange(available.map((c) => c.iso2))}
            className="chip py-0.5 text-[11px] hover:border-accent/40 hover:text-white"
          >
            Избери всички
          </button>
          <button
            type="button"
            onClick={() => onChange([])}
            className="chip py-0.5 text-[11px] hover:border-accent/40 hover:text-white"
          >
            Изчисти
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {available.map((c) => {
          const on = sel.has(c.iso2);
          return (
            <button
              key={c.iso2}
              type="button"
              onClick={() => toggle(c.iso2)}
              aria-pressed={on}
              className={`chip py-1 transition-colors ${
                on
                  ? 'border-accent/50 bg-accent/15 text-white'
                  : 'text-slate-300 hover:border-accent/40 hover:text-white'
              }`}
            >
              <Flag iso2={c.iso2} className="h-3 w-[18px]" />
              {nameBg(c.country)}
              {on && <Icon.check size={12} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
