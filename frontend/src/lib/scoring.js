// Criteria ranking -> weighted university scoring.
// The user drag-orders criteria; rank 1 gets the highest weight.

import { Icon } from './icons.jsx';

// id -> { label, icon, how to read a 0..100 score off a university }
export const CRITERIA = [
  { id: 'tuition', label: 'Такса', icon: Icon.coin, get: u => tuitionScore(u.avgTuition) },
  { id: 'degree', label: 'Стойност на диплома', icon: Icon.trophy, get: u => degreeScore(u) },
  { id: 'living', label: 'Разходи за живот', icon: Icon.calc, get: u => livingScore(u.monthlyCost) },
  { id: 'scholarship', label: 'Стипендии', icon: Icon.heart, get: u => u.scholarshipAvailability ?? 50 },
  { id: 'teaching', label: 'Качество на преподаване', icon: Icon.cap, get: u => u.teaching ?? 50 },
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

// lower monthly living cost -> higher score (0 USD = 100, ~2.5k USD ~ 0)
function livingScore(c) {
  if (c == null) return 55;
  return Math.max(0, Math.min(100, Math.round(100 - (c / 2500) * 100)));
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
export function rankUniversities(universities, { field, region, countries, orderedIds, top = 4 }) {
  // region + country narrowing (empty countries = whole region); field applied on top
  const geo = (u) =>
    (!region || region === 'all' || u.region === region) &&
    (!countries?.length || countries.includes(u.iso2));
  let pool = universities.filter(geo);
  if (field) pool = pool.filter(u => u.fields?.includes(field));
  // if a field filter wipes everything (sparse data), fall back to the geo pool
  if (!pool.length) pool = universities.filter(geo);
  return pool
    .map(u => ({ ...u, ...scoreUniversity(u, orderedIds) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, top);
}

// rank Bulgarian universities by their in-Bulgaria standing.
// each topUniversities entry inherits country-level economics/lifestyle; prestige
// comes from national rank (not world rank, which is uniformly weak for BG unis).
export function rankBulgarian(bulgaria, { field, orderedIds, top = 1 }) {
  const base = {
    iso2: 'bg', country: 'България', region: 'Europe',
    avgTuition: bulgaria.avgTuition, costOfLiving: bulgaria.costOfLiving,
    monthlyCost: bulgaria.monthlyCost, scholarshipAvailability: bulgaria.scholarshipAvailability,
    erasmus: bulgaria.erasmus, nightlife: bulgaria.nightlife, parks: bulgaria.parks,
    malls: bulgaria.malls, quiet: bulgaria.quiet, teaching: null, employerRep: null, bestRank: null,
  };
  let pool = (bulgaria.topUniversities || []).map(u => ({
    ...base,
    name: u.nameBg || u.name, city: u.city, founded: u.founded, website: u.website,
    fields: u.fields, nationalRank: u.nationalRank, balo: u.balo,
    qsScore: Math.max(40, 92 - (u.nationalRank - 1) * 3), // national-standing prestige proxy
    // real per-uni tuition (USD canonical; display localizes to лв). overrides the baseline.
    avgTuition: u.avgTuition ?? base.avgTuition,
    tuitionMin: u.tuitionMin ?? null,
    tuitionMax: u.tuitionMax ?? null,
  }));
  if (field) {
    const f = pool.filter(u => u.fields?.includes(field));
    if (f.length) pool = f;
  }
  return pool
    .map(u => ({ ...u, ...scoreUniversity(u, orderedIds) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, top);
}
