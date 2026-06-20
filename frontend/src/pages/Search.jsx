import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '../lib/icons.jsx';
import { CRITERIA, rankUniversities } from '../lib/scoring.js';
import FieldAutocomplete from '../components/FieldAutocomplete.jsx';
import SpecialtyAutocomplete from '../components/SpecialtyAutocomplete.jsx';
import CriteriaRanker from '../components/CriteriaRanker.jsx';
import PentominoResults from '../components/PentominoResults.jsx';
import Chatbot from '../components/Chatbot.jsx';
import universities from '../data/universities.json';
import bulgaria from '../data/bulgaria.json';

const REGIONS = [
  { value: 'all', label: 'Всички региони' },
  { value: 'Europe', label: 'Европа' },
  { value: 'USA', label: 'САЩ' },
  { value: 'Canada', label: 'Канада' },
  { value: 'Australia', label: 'Австралия' },
];

// Compact view of a ranked card for the AI assistant context.
function buildContext(results, { field, region, order }) {
  const top3 = order.slice(0, 3).map((id) => CRITERIA.find((c) => c.id === id)?.label).filter(Boolean);
  return {
    field: field || 'без сфера',
    region: REGIONS.find((r) => r.value === region)?.label,
    priorities: top3,
    home: {
      name: bulgaria.name,
      avgTuition: bulgaria.avgTuition,
      erasmus: bulgaria.erasmus,
      scholarshipAvailability: bulgaria.scholarshipAvailability,
      costOfLiving: bulgaria.costOfLiving,
      monthlyCost: bulgaria.monthlyCost,
    },
    universities: results.map((u) => ({
      name: u.name,
      country: u.country,
      city: u.city,
      score: u.score,
      bestRank: u.bestRank,
      avgTuition: u.avgTuition,
      monthlyCost: u.monthlyCost,
      erasmus: u.erasmus,
      employerRep: u.employerRep,
      breakdown: u.breakdown?.map((b) => ({ label: b.label, value: b.value })),
    })),
  };
}

export default function Search() {
  const [field, setField] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [region, setRegion] = useState('all');
  const [order, setOrder] = useState(CRITERIA.map((c) => c.id));
  const [results, setResults] = useState(null);

  const canCompare = !!field && order.length > 0;

  const compare = () => {
    if (!canCompare) return;
    const ranked = rankUniversities(universities, { field, region, orderedIds: order, top: 4 });
    setResults(ranked);
    // scroll to results after they mount
    setTimeout(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const context = useMemo(
    () => (results ? buildContext(results, { field, region, order }) : null),
    [results, field, region, order]
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto max-w-2xl text-center"
      >
        <span className="chip mx-auto mb-4 w-fit border-accent/30 bg-accent/10 text-accent-soft">
          <Icon.search size={14} /> Търсачка
        </span>
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">Намери своя университет</h1>
        <p className="mt-3 text-slate-400">
          Избери сфера, подреди критериите по важност и виж как се сравняват топ университетите с България.
        </p>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        className="glass mx-auto mt-10 max-w-3xl p-6 sm:p-8"
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">
              Сфера <span className="text-accent-soft">*</span>
            </label>
            <FieldAutocomplete value={field} onChange={setField} />
          </div>

          <div>
            <label className="label">Специалност (по желание)</label>
            <SpecialtyAutocomplete field={field} value={specialty} onChange={setSpecialty} />
          </div>

          <div>
            <label className="label">Регион (по желание)</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                <Icon.globe size={16} />
              </span>
              <select
                className="input cursor-pointer pl-10 pr-9 appearance-none"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                {REGIONS.map((r) => (
                  <option key={r.value} value={r.value} className="bg-ink-900 text-slate-200">
                    {r.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-500">
                <Icon.arrow size={15} />
              </span>
            </div>
          </div>
        </div>

        <div className="mt-7">
          <label className="label">
            Подреди критериите <span className="text-accent-soft">*</span>
          </label>
          <CriteriaRanker order={order} setOrder={setOrder} />
        </div>

        <button
          onClick={compare}
          disabled={!canCompare}
          className="btn-primary mt-7 w-full justify-center py-3.5 text-base disabled:opacity-40"
        >
          <Icon.spark size={18} /> Сравни университетите
        </button>
        {!field && (
          <p className="mt-3 text-center text-xs text-slate-500">Първо избери сфера, за да продължиш.</p>
        )}
      </motion.div>

      {/* Results */}
      <AnimatePresence>
        {results && (
          <motion.div
            id="results"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-16 scroll-mt-24"
          >
            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-accent-soft ring-1 ring-accent/30">
                <Icon.cap size={18} />
              </span>
              <div>
                <h2 className="font-display text-xl font-bold text-white">Твоето X-сравнение</h2>
                <p className="text-sm text-slate-400">
                  България в центъра · топ {results.length} според приоритетите ти
                  {field ? ` за „${field}“` : ''}.
                </p>
              </div>
            </div>

            <PentominoResults results={results} order={order} field={field} />

            <div className="mt-10">
              <Chatbot context={context} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
