import { Icon, Flag } from '../lib/icons.jsx';

// Generic tickbox panel for narrowing a region: countries (with flags) or US states.
// `items` is [{ key, label, iso2? }] (pre-sorted); `selected` is an array of keys.
// Empty selection = whole region. `label` is the section heading ("Държави"/"Щати").
export default function RegionSubFilter({ label, items, selected, onChange }) {
  if (!items || items.length <= 1) return null;

  const sel = new Set(selected);
  const toggle = (key) => {
    const next = new Set(sel);
    next.has(key) ? next.delete(key) : next.add(key);
    onChange([...next]);
  };

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="label mb-0">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500">{sel.size} от {items.length} избрани</span>
          <button
            type="button"
            onClick={() => onChange(items.map((it) => it.key))}
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
        {items.map((it) => {
          const on = sel.has(it.key);
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => toggle(it.key)}
              aria-pressed={on}
              className={`chip py-1 transition-colors ${
                on
                  ? 'border-accent/50 bg-accent/15 text-white'
                  : 'text-slate-300 hover:border-accent/40 hover:text-white'
              }`}
            >
              {it.iso2 && <Flag iso2={it.iso2} className="h-3 w-[18px]" />}
              {it.label}
              {on && <Icon.check size={12} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
