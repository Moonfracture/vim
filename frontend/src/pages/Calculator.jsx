import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '../lib/icons.jsx';

// Bulgarian admission-score ("балообразуване") calculator.
// Every university/specialty has its own formula, so this is an *orientational*
// tool: pick a scheme (or build your own), enter grades 2.00–6.00, edit the
// coefficients, and see the resulting бал and how close it is to the maximum.
const PRESETS = [
  {
    id: 'standard',
    label: 'Стандартна (2 матури + 2 оценки)',
    rows: [
      { label: 'ДЗИ Български език и литература', coef: 2 },
      { label: 'Втора матура (по профил)', coef: 2 },
      { label: 'Оценка от диплома', coef: 1 },
      { label: 'Оценка от диплома', coef: 1 },
    ],
  },
  {
    id: 'tech',
    label: 'Технически / Информатика',
    rows: [
      { label: 'Изпит/ДЗИ Математика', coef: 3 },
      { label: 'ДЗИ Български език и литература', coef: 1 },
      { label: 'Оценка от диплома — Математика', coef: 1 },
      { label: 'Оценка от диплома — Информатика/Физика', coef: 1 },
    ],
  },
  {
    id: 'med',
    label: 'Медицина',
    rows: [
      { label: 'Изпит Биология', coef: 3 },
      { label: 'Изпит Химия', coef: 3 },
      { label: 'Оценка от диплома — Биология', coef: 1 },
      { label: 'Оценка от диплома — Химия', coef: 1 },
    ],
  },
];

const clampGrade = (v) => {
  const n = parseFloat(String(v).replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  return Math.min(6, Math.max(2, n));
};

export default function Calculator() {
  const [presetId, setPresetId] = useState('standard');
  const [rows, setRows] = useState(() => PRESETS[0].rows.map((r) => ({ ...r, grade: '' })));

  const applyPreset = (p) => {
    setPresetId(p.id);
    setRows(p.rows.map((r) => ({ ...r, grade: '' })));
  };
  const setRow = (i, patch) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const removeRow = (i) => setRows((rs) => rs.filter((_, j) => j !== i));
  const addRow = () => setRows((rs) => [...rs, { label: 'Нов компонент', coef: 1, grade: '' }]);

  const { bal, max, filled, total } = useMemo(() => {
    let bal = 0, max = 0, filled = 0;
    for (const r of rows) {
      const coef = Number(r.coef) || 0;
      max += 6 * coef;
      const g = clampGrade(r.grade);
      if (g != null) { bal += g * coef; filled++; }
    }
    return { bal, max, filled, total: rows.length };
  }, [rows]);

  const pct = max > 0 ? Math.round((bal / max) * 100) : 0;
  const complete = filled === total && total > 0;

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-2xl text-center"
      >
        <span className="chip mx-auto mb-4 w-fit border-accent/30 bg-accent/10 text-accent-soft">
          <Icon.calc size={14} /> Балообразуване
        </span>
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">Изчисли своя бал</h1>
        <p className="mt-3 text-slate-400">
          Избери схема, въведи оценките си (по скала 2.00–6.00) и виж ориентировъчния си бал.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        className="mt-10 grid gap-6 lg:grid-cols-[1fr_300px]"
      >
        {/* form */}
        <div className="glass p-6 sm:p-7">
          <label className="label">Схема на балообразуване</label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => applyPreset(p)}
                className={`chip transition-colors ${
                  presetId === p.id
                    ? 'border-accent/50 bg-accent/15 text-white'
                    : 'hover:border-accent/40 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-2.5">
            <div className="flex items-center gap-2 px-1 text-[11px] uppercase tracking-wider text-slate-500">
              <span className="flex-1">Компонент</span>
              <span className="w-20 text-center">Оценка</span>
              <span className="w-16 text-center">Коеф.</span>
              <span className="w-6" />
            </div>
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                <input
                  className="min-w-0 flex-1 bg-transparent px-2 text-sm text-slate-200 outline-none placeholder:text-slate-600"
                  value={r.label}
                  onChange={(e) => setRow(i, { label: e.target.value })}
                  placeholder="Компонент"
                />
                <input
                  type="number" min="2" max="6" step="0.01" inputMode="decimal"
                  className="w-20 rounded-lg border border-white/10 bg-ink-850/80 px-2 py-2 text-center text-sm text-white outline-none focus:border-accent/60"
                  value={r.grade}
                  onChange={(e) => setRow(i, { grade: e.target.value })}
                  placeholder="—"
                />
                <input
                  type="number" min="0" max="10" step="1" inputMode="numeric"
                  className="w-16 rounded-lg border border-white/10 bg-ink-850/80 px-2 py-2 text-center text-sm text-accent-soft outline-none focus:border-accent/60"
                  value={r.coef}
                  onChange={(e) => setRow(i, { coef: e.target.value })}
                />
                <button
                  onClick={() => removeRow(i)}
                  className="grid h-6 w-6 shrink-0 place-items-center text-slate-500 transition-colors hover:text-red-400"
                  aria-label="Махни компонента"
                >
                  <Icon.close size={15} />
                </button>
              </div>
            ))}
          </div>

          <button onClick={addRow} className="btn-ghost mt-3 w-full justify-center py-2.5 text-sm">
            <Icon.plus size={16} /> Добави компонент
          </button>
        </div>

        {/* result */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="glass border-accent/40 bg-accent/[0.07] p-6 text-center ring-1 ring-accent/20">
            <p className="text-xs uppercase tracking-wider text-accent-soft">Твоят бал</p>
            <p className="mt-2 font-display text-5xl font-bold text-white">
              {bal.toFixed(2)}
              <span className="text-xl font-medium text-slate-400"> / {max.toFixed(0)}</span>
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <motion.span
                className="block h-full rounded-full bg-gradient-to-r from-accent-deep to-accent-soft"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-300">{pct}% от максимума</p>
            {!complete && (
              <p className="mt-3 text-xs text-amber-300/80">
                Попълни всички оценки за точен резултат ({filled}/{total}).
              </p>
            )}
          </div>

          <p className="mt-4 px-1 text-xs leading-relaxed text-slate-500">
            <Icon.spark size={13} className="mb-0.5 mr-1 inline" />
            Ориентировъчно. Всеки университет и специалност има своя формула — провери
            официалния правилник за прием. Можеш да редактираш компонентите и коефициентите.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
