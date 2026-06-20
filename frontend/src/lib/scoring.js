// Criteria ranking -> weighted university scoring.
// The user drag-orders criteria; rank 1 gets the highest weight.

import { Icon } from './icons.jsx';

// id -> { label, icon, how to read a 0..100 score off a university }
export const CRITERIA = [
  { id: 'tuition', label: 'Такса', icon: Icon.coin, get: u => tuitionScore(u.avgTuition) },
  { id: 'degree', label: 'Стойност на диплома', icon: Icon.trophy, get: u => degreeScore(u) },
  { id: 'erasmus', label: 'Еразъм', icon: Icon.globe, get: u => u.erasmus ?? 50 },
  { id: 'nightlife', label: 'Нощен живот', icon: Icon.moon, get: u => u.nightlife ?? 50 },
  { id: 'parks', label: 'Паркове', icon: Icon.tree, get: u => u.parks ?? 50 },
  { id: 'malls', label: 'Молове', icon: Icon.bag, get: u => u.malls ?? 50 },
  { id: 'quiet', label: 'Тихо място', icon: Icon.leaf, get: u => u.quiet ?? 50 },
];
export const CRITERIA_BY_ID = Object.fromEntries(CRITERIA.map(c => [c.id, c]));

// lower tuition -> higher score (0 USD = 100, 50k USD ~ 0)
function tuitionScore(t) {
  if (t == null) return 55;
  return Math.max(0, Math.min(100, Math.round(100 - (t / 50000) * 100)));
}

// prestige / employability from QS score, employer rep and rank
function degreeScore(u) {
  const parts = [];
  if (u.qsScore != null) parts.push(u.qsScore);
  if (u.employerRep != null) parts.push(u.employerRep);
  if (u.bestRank != null) parts.push(Math.max(0, 100 - Math.log10(u.bestRank) * 33));
  if (!parts.length) return 60;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

// weights decay with rank position: 1st criterion weighs most
function weightsFor(orderedIds) {
  const n = orderedIds.length;
  const raw = orderedIds.map((_, i) => n - i); // n, n-1, ... 1
  const sum = raw.reduce((a, b) => a + b, 0);
  return Object.fromEntries(orderedIds.map((id, i) => [id, raw[i] / sum]));
}

// score one university against the ordered criteria; returns 0..100 + per-criterion breakdown
export function scoreUniversity(u, orderedIds) {
  const w = weightsFor(orderedIds);
  let total = 0;
  const breakdown = orderedIds.map(id => {
    const c = CRITERIA_BY_ID[id];
    const v = c.get(u);
    total += v * w[id];
    return { id, label: c.label, value: Math.round(v), weight: w[id] };
  });
  return { score: Math.round(total), breakdown };
}

// filter + rank universities; returns top N (default 4 for the pentomino corners)
export function rankUniversities(universities, { field, region, orderedIds, top = 4 }) {
  let pool = universities;
  if (region && region !== 'all') pool = pool.filter(u => u.region === region);
  if (field) pool = pool.filter(u => u.fields?.includes(field));
  // if a field filter wipes everything (sparse data), fall back to region-only
  if (!pool.length) {
    pool = region && region !== 'all' ? universities.filter(u => u.region === region) : universities;
  }
  return pool
    .map(u => ({ ...u, ...scoreUniversity(u, orderedIds) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, top);
}
