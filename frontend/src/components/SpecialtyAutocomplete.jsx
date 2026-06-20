import { useMemo, useState, useEffect } from 'react';
import { Icon } from '../lib/icons.jsx';
import fieldsData from '../data/fields.json';

// Optional specialty input — its options are filtered by the chosen field.
export default function SpecialtyAutocomplete({ field, value, onChange }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);

  const all = useMemo(() => (field ? fieldsData.meta[field]?.specialties || [] : []), [field]);

  // reset specialty when field changes
  useEffect(() => { setQuery(''); onChange(''); }, [field]); // eslint-disable-line

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((s) => !q || s.toLowerCase().includes(q)).slice(0, 8);
  }, [query, all]);

  const disabled = !field;

  return (
    <div className="relative">
      <input
        className="input disabled:cursor-not-allowed disabled:opacity-50"
        placeholder={disabled ? 'Първо избери сфера' : 'напр. Изкуствен интелект (по желание)'}
        value={query}
        disabled={disabled}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); onChange(e.target.value); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
      />
      {open && !disabled && suggestions.length > 0 && (
        <ul className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-ink-900 p-1.5 shadow-2xl shadow-black/60">
          {suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setQuery(s); onChange(s); setOpen(false); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                <Icon.cap size={15} className="text-slate-500" /> {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
