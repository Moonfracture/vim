import { useMemo, useRef, useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import fieldsData from '../data/fields.json';

// Autocomplete over fields (сфери) with keyword hints, e.g. "AI" -> Компютърни науки.
export default function FieldAutocomplete({ value, onChange }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const boxRef = useRef(null);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = fieldsData.fields.map((f) => {
      const kw = fieldsData.meta[f]?.keywords || [];
      const hitKw = kw.find((k) => k.toLowerCase().includes(q));
      const match = !q || f.toLowerCase().includes(q) || hitKw;
      return { field: f, hitKw: q && !f.toLowerCase().includes(q) ? hitKw : null, match };
    });
    return rows.filter((r) => r.match).slice(0, 8);
  }, [query]);

  const pick = (f) => { setQuery(f); onChange(f); setOpen(false); };

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"><Icon.search size={16} /></span>
        <input
          className="input pl-10"
          placeholder="напр. Компютърни науки, AI, медицина…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setHi(0); if (!e.target.value) onChange(''); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, suggestions.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
            else if (e.key === 'Enter' && suggestions[hi]) { e.preventDefault(); pick(suggestions[hi].field); }
            else if (e.key === 'Escape') setOpen(false);
          }}
        />
        {value && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-accent-soft"><Icon.check size={16} /></span>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-ink-900 p-1.5 shadow-2xl shadow-black/60">
          {suggestions.map((s, i) => (
            <li key={s.field}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s.field)}
                onMouseEnter={() => setHi(i)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  i === hi ? 'bg-accent/15 text-white' : 'text-slate-300 hover:bg-white/[0.05]'
                }`}
              >
                <span className="font-medium">{s.field}</span>
                {s.hitKw && <span className="chip py-0.5 text-[11px]">{s.hitKw}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
