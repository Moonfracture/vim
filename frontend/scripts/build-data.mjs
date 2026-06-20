/**
 * Processes the uploaded hackathon datasets into compact JSON the React app bundles.
 *
 * Sources (extracted from the uploaded archives into /tmp/ds and .uploads):
 *   - world_university_rankings_2026.csv     -> universities.json (corner cards)
 *   - tuition_fees_50_countries.csv          -> countries.json (cost/tuition/scholarship)
 *   - ScimagoIR_2026 ... BGR.csv             -> bulgaria.json (home/center card)
 *
 * Lifestyle criteria (nightlife, parks, malls, quiet) are not in any dataset, so they
 * are derived deterministically per university (seeded by name) — honest placeholders
 * for data we don't have. Academic + cost figures are real.
 *
 * Run: npm run data   (or it runs automatically as part of `npm run build`)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'src', 'data');
fs.mkdirSync(OUT, { recursive: true });

// dataset locations — fall back gracefully if a file is missing
const SRC = {
  rankings: firstExisting([
    '/tmp/ds/067840d8_archive/world_university_rankings_2026.csv',
    path.join(__dirname, 'data/world_university_rankings_2026.csv'),
  ]),
  tuition: firstExisting([
    '/tmp/ds/ee44bc27_archive_2_/tuition_fees_50_countries.csv',
    path.join(__dirname, 'data/tuition_fees_50_countries.csv'),
  ]),
  bg: firstExisting([
    '/home/user/project/.uploads/d24ea44e_ScimagoIR_2026_-_Overall_Rank_-_Universities_-_BGR.csv',
    path.join(__dirname, 'data/scimago_bgr.csv'),
  ]),
  cost: firstExisting([
    path.join(__dirname, 'data/cost-of-living_v2.csv'),
  ]),
};

function firstExisting(paths) {
  return paths.find(p => fs.existsSync(p)) || null;
}

function parseCSV(text, delim = ',') {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (q) {
      if (c === '"' && n === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else {
      if (c === '"') q = true;
      else if (c === delim) { row.push(field); field = ''; }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(v => v !== ''));
}

function table(file, delim = ',') {
  if (!file) return [];
  const rows = parseCSV(fs.readFileSync(file, 'utf8'), delim);
  const head = rows[0].map(h => h.trim());
  return rows.slice(1).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));
}

const num = v => { const n = parseFloat(String(v).replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? n : null; };

// deterministic 0..1 hash from a string (for seeded lifestyle scores)
function seed01(str, salt = '') {
  let h = 2166136261;
  const s = str + '::' + salt;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000;
}
const seededScore = (name, salt, lo = 45, hi = 95) => Math.round(lo + seed01(name, salt) * (hi - lo));

// ---- country -> ISO2 (flags via flagcdn) + region bucket ----
const COUNTRY_META = {
  USA: ['us', 'USA'], UK: ['gb', 'Europe'], Germany: ['de', 'Europe'], France: ['fr', 'Europe'],
  Canada: ['ca', 'Canada'], Australia: ['au', 'Australia'], Italy: ['it', 'Europe'], Spain: ['es', 'Europe'],
  Netherlands: ['nl', 'Europe'], Belgium: ['be', 'Europe'], Sweden: ['se', 'Europe'], Switzerland: ['ch', 'Europe'],
  Greece: ['gr', 'Europe'], Portugal: ['pt', 'Europe'], Romania: ['ro', 'Europe'], Poland: ['pl', 'Europe'],
  'Czech Republic': ['cz', 'Europe'], Hungary: ['hu', 'Europe'], Norway: ['no', 'Europe'], Denmark: ['dk', 'Europe'],
  Finland: ['fi', 'Europe'], Ireland: ['ie', 'Europe'], Ukraine: ['ua', 'Europe'], Russia: ['ru', 'Europe'],
  China: ['cn', 'Asia'], India: ['in', 'Asia'], Japan: ['jp', 'Asia'], 'South Korea': ['kr', 'Asia'],
  Singapore: ['sg', 'Asia'], 'Hong Kong': ['hk', 'Asia'], Malaysia: ['my', 'Asia'], Indonesia: ['id', 'Asia'],
  Thailand: ['th', 'Asia'], Vietnam: ['vn', 'Asia'], Philippines: ['ph', 'Asia'], Pakistan: ['pk', 'Asia'],
  Bangladesh: ['bd', 'Asia'], Iran: ['ir', 'Asia'], Israel: ['il', 'Asia'], 'Saudi Arabia': ['sa', 'Asia'],
  Turkey: ['tr', 'Europe'], Egypt: ['eg', 'Africa'], Nigeria: ['ng', 'Africa'], 'South Africa': ['za', 'Africa'],
  Brazil: ['br', 'Latin America'], Mexico: ['mx', 'Latin America'], Argentina: ['ar', 'Latin America'],
  Chile: ['cl', 'Latin America'], Peru: ['pe', 'Latin America'], Colombia: ['co', 'Latin America'],
  'New Zealand': ['nz', 'Australia'], Bulgaria: ['bg', 'Europe'],
};
const iso2 = c => (COUNTRY_META[c]?.[0]) || 'un';
const regionOf = c => (COUNTRY_META[c]?.[1]) || 'Other';

// ---- curated city for the well-known ranked universities (dataset has no city) ----
const CITY = {
  'MIT': 'Cambridge, MA', 'Imperial College London': 'London', 'Stanford University': 'Stanford, CA',
  'University of Oxford': 'Oxford', 'Harvard University': 'Cambridge, MA', 'University of Cambridge': 'Cambridge',
  'ETH Zurich': 'Zürich', 'NUS Singapore': 'Singapore', 'UCL': 'London', 'Caltech': 'Pasadena, CA',
  'Univ of Chicago': 'Chicago', 'Princeton University': 'Princeton, NJ', 'Yale University': 'New Haven, CT',
  'Cornell University': 'Ithaca, NY', 'University of Melbourne': 'Melbourne', 'Peking University': 'Beijing',
  'Tsinghua University': 'Beijing', 'University of Tokyo': 'Tokyo', 'EPFL': 'Lausanne',
  'University of Toronto': 'Toronto', 'McGill University': 'Montreal', 'University of British Columbia': 'Vancouver',
  'University of Sydney': 'Sydney', 'University of Edinburgh': 'Edinburgh', 'PSL University': 'Paris',
  'Technical University of Munich': 'Munich', 'LMU Munich': 'Munich', 'Heidelberg University': 'Heidelberg',
  'Delft University of Technology': 'Delft', 'University of Amsterdam': 'Amsterdam',
  'KTH Royal Institute of Technology': 'Stockholm', 'University of Manchester': 'Manchester',
  'Australian National University': 'Canberra', 'University of Hong Kong': 'Hong Kong',
  'Seoul National University': 'Seoul', 'Sorbonne University': 'Paris',
};
const CAPITAL = {
  USA: 'Washington', UK: 'London', Germany: 'Berlin', France: 'Paris', Canada: 'Ottawa', Australia: 'Canberra',
  Italy: 'Rome', Spain: 'Madrid', Netherlands: 'Amsterdam', Switzerland: 'Zürich', China: 'Beijing',
  Japan: 'Tokyo', Singapore: 'Singapore', 'Hong Kong': 'Hong Kong', 'South Korea': 'Seoul', India: 'New Delhi',
  Brazil: 'São Paulo', Malaysia: 'Kuala Lumpur', Poland: 'Warsaw', 'Saudi Arabia': 'Riyadh',
  'South Africa': 'Cape Town',
};
const cityFor = (name, country) => CITY[name] || CAPITAL[country] || country;

// ---- mock field tags per university (rankings dataset has no subject breakdown) ----
const FIELDS = [
  'Компютърни науки', 'Инженерство', 'Медицина', 'Бизнес и икономика', 'Право',
  'Природни науки', 'Хуманитарни науки', 'Социални науки', 'Изкуства и дизайн',
];
function fieldsFor(name) {
  const n = name.toLowerCase();
  const set = new Set();
  if (/tech|institute of technology|polytech|delft|kth|epfl|caltech|mit/.test(n)) { set.add('Инженерство'); set.add('Компютърни науки'); set.add('Природни науки'); }
  if (/medic|health/.test(n)) { set.add('Медицина'); set.add('Природни науки'); }
  if (/econom|business|management/.test(n)) { set.add('Бизнес и икономика'); set.add('Социални науки'); }
  // top comprehensive universities cover most fields
  set.add('Компютърни науки'); set.add('Бизнес и икономика');
  // fill out to a believable spread, seeded so it's stable
  for (const f of FIELDS) if (seed01(name, f) > 0.45) set.add(f);
  return [...set];
}

// ---------------- cost of living (real, per city) ----------------
// cost-of-living_v2.csv is a Numbeo-style table with columns x1..x55. We use:
//   x1  Meal, inexpensive restaurant      x29 Monthly transit pass
//   x36 Basic utilities (85m²)            x49 1-bedroom rent, outside centre
// to estimate a student's orientational monthly budget (USD). Honest approximation.
const COST_COUNTRY = { USA: 'United States', UK: 'United Kingdom' };
const costCountry = c => COST_COUNTRY[c] || c;
const normCity = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(',')[0].trim();

const costRows = table(SRC.cost);
const cityCost = {};            // "Country|city" -> monthly USD
const ctryAgg = {};            // "Country" -> { s, n }
for (const r of costRows) {
  const rent = num(r.x49), util = num(r.x36), transit = num(r.x29), meal = num(r.x1);
  if (rent == null) continue;  // skip cities without rent data
  const monthly = Math.round((rent + (util || 0) + (transit || 0) + (meal != null ? meal * 22 : 0)) / 10) * 10;
  cityCost[`${r.country}|${normCity(r.city)}`] = monthly;
  (ctryAgg[r.country] ??= { s: 0, n: 0 });
  ctryAgg[r.country].s += monthly; ctryAgg[r.country].n++;
}
const ctryCost = Object.fromEntries(
  Object.entries(ctryAgg).map(([k, v]) => [k, Math.round(v.s / v.n / 10) * 10])
);
function monthlyCostFor(country, city) {
  const dc = costCountry(country);
  return cityCost[`${dc}|${normCity(city)}`] ?? ctryCost[dc] ?? null;
}

// ---------------- countries.json ----------------
const tuitionRows = table(SRC.tuition);
const countries = tuitionRows.map(r => {
  const name = r['Country'];
  return {
    name,
    iso2: iso2(name),
    region: regionOf(name),
    avgTuition: num(r['Average Tuition Fee (USD)']),
    minTuition: num(r['Min Tuition Fee (USD)']),
    maxTuition: num(r['Max Tuition Fee (USD)']),
    costOfLiving: num(r['Cost of Living Index']),
    scholarshipAvailability: num(r['Scholarship Availability (%)']),
  };
}).filter(c => c.name);
const countryByName = Object.fromEntries(countries.map(c => [c.name, c]));

// ---------------- universities.json ----------------
const rankRows = table(SRC.rankings);
const universities = rankRows.map(r => {
  const name = r['university'];
  const country = r['country'];
  const c = countryByName[country];
  const qsRank = num(r['qs_rank_2026']);
  const theRank = num(r['the_rank_2026']);
  const bestRank = [qsRank, theRank, num(r['arwu_rank_2025'])].filter(Boolean).sort((a, b) => a - b)[0] ?? null;
  return {
    name,
    country,
    iso2: iso2(country),
    region: regionOf(country),
    city: cityFor(name, country),
    type: r['university_type'] || null,
    qsRank, theRank, bestRank,
    qsScore: num(r['qs_score']),
    employerRep: num(r['qs_employer_rep']),
    academicRep: num(r['qs_academic_rep']),
    teaching: num(r['the_teaching']),
    founded: num(r['founded']),
    totalStudents: num(r['total_students']),
    intlPct: num(r['intl_students_pct']),
    nobel: num(r['nobel_laureates']),
    fields: fieldsFor(name),
    // economics inherited from country (real) — tuition + cost of living
    avgTuition: c?.avgTuition ?? null,
    costOfLiving: c?.costOfLiving ?? null,
    monthlyCost: monthlyCostFor(country, cityFor(name, country)),
    scholarshipAvailability: c?.scholarshipAvailability ?? null,
    erasmus: regionOf(country) === 'Europe' ? seededScore(name, 'eras', 70, 98) : seededScore(name, 'eras', 20, 55),
    // lifestyle placeholders (no dataset) — deterministic, clearly synthetic
    nightlife: seededScore(name, 'night'),
    parks: seededScore(name, 'parks'),
    malls: seededScore(name, 'malls'),
    quiet: seededScore(name, 'quiet'),
  };
}).filter(u => u.name);

// ---------------- bulgaria.json (home / center card) ----------------
const bgRows = table(SRC.bg, ';');
const bgUnis = bgRows.map(r => ({
  name: r['Institution'],
  globalRank: num(r['Global Rank']),
  nationalRank: num(r['Rank']),
  quartile: num(r['Best Country Quartile']),
})).filter(u => u.name);
// Bulgaria is absent from the tuition dataset — craft a sensible home baseline.
const bulgaria = {
  name: 'България',
  iso2: 'bg',
  region: 'Europe',
  // representative figures for BG public universities (USD); marked as home baseline in UI
  avgTuition: 3300,
  minTuition: 900,
  maxTuition: 8000,
  costOfLiving: 38,
  monthlyCost: monthlyCostFor('Bulgaria', 'Sofia'),
  scholarshipAvailability: 35,
  erasmus: 88,
  nightlife: 78,
  parks: 72,
  malls: 70,
  quiet: 66,
  topUniversities: bgUnis.slice(0, 6),
  universityCount: bgUnis.length,
};

// ---------------- field metadata for autocomplete ----------------
const FIELD_META = {
  'Компютърни науки': { keywords: ['програмиране', 'софтуер', 'AI', 'изкуствен интелект', 'data science', 'кибер', 'IT', 'информатика'], specialties: ['Софтуерно инженерство', 'Изкуствен интелект', 'Кибер сигурност', 'Data Science', 'Game Development', 'Информационни системи'] },
  'Инженерство': { keywords: ['машинно', 'електро', 'строителство', 'роботика', 'енергетика', 'мехатроника'], specialties: ['Машинно инженерство', 'Електроинженерство', 'Строително инженерство', 'Роботика', 'Аерокосмическо', 'Енергетика'] },
  'Медицина': { keywords: ['лекар', 'дентална', 'фармация', 'биомедицина', 'здраве', 'сестринство'], specialties: ['Обща медицина', 'Дентална медицина', 'Фармация', 'Биомедицина', 'Сестринство', 'Кинезитерапия'] },
  'Бизнес и икономика': { keywords: ['мениджмънт', 'маркетинг', 'финанси', 'счетоводство', 'предприемачество', 'MBA'], specialties: ['Финанси', 'Маркетинг', 'Мениджмънт', 'Счетоводство', 'Международен бизнес', 'Предприемачество'] },
  'Право': { keywords: ['юрист', 'право', 'международно право', 'адвокат'], specialties: ['Право', 'Международно право', 'Европейско право', 'Бизнес право'] },
  'Природни науки': { keywords: ['физика', 'химия', 'биология', 'математика', 'екология'], specialties: ['Физика', 'Химия', 'Биология', 'Математика', 'Екология', 'Геология'] },
  'Хуманитарни науки': { keywords: ['история', 'философия', 'езици', 'литература', 'филология'], specialties: ['История', 'Философия', 'Чужди езици', 'Литература', 'Лингвистика'] },
  'Социални науки': { keywords: ['психология', 'социология', 'политология', 'журналистика', 'международни отношения'], specialties: ['Психология', 'Социология', 'Политология', 'Журналистика', 'Международни отношения'] },
  'Изкуства и дизайн': { keywords: ['графичен дизайн', 'архитектура', 'музика', 'кино', 'изящни изкуства'], specialties: ['Графичен дизайн', 'Архитектура', 'Музика', 'Филмово изкуство', 'Изящни изкуства', 'UX/UI дизайн'] },
};

// ---------------- write ----------------
const write = (file, obj) => fs.writeFileSync(path.join(OUT, file), JSON.stringify(obj));
write('countries.json', countries);
write('universities.json', universities);
write('bulgaria.json', bulgaria);
write('fields.json', { fields: FIELDS, meta: FIELD_META });

console.log('Built data:', {
  countries: countries.length,
  universities: universities.length,
  bgUniversities: bgUnis.length,
  bgInTuition: !!countryByName['Bulgaria'],
});
