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
  the: firstExisting([
    path.join(__dirname, 'data/the_rankings_2026.csv'),
    '/tmp/ds/9f19c42b_archive_1_/THE World University Rankings 2016-2026.csv',
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

// ---- curated US state (2-letter) per university; dataset has no usable state ----
const US_STATE = {
  'MIT': 'MA', 'Stanford University': 'CA', 'Harvard University': 'MA', 'Caltech': 'CA',
  'Univ of Chicago': 'IL', 'The University of Chicago': 'IL', 'Princeton University': 'NJ',
  'Cornell University': 'NY', 'Yale University': 'CT', 'Columbia University': 'NY',
  'Univ of Pennsylvania': 'PA', 'UC Berkeley': 'CA', 'Johns Hopkins University': 'MD',
  'Duke University': 'NC', 'Univ of Michigan': 'MI', 'UCLA': 'CA', 'Carnegie Mellon University': 'PA',
  'NYU': 'NY', 'University of Washington': 'WA', 'Northwestern University': 'IL',
  'Georgia Institute of Technology': 'GA', 'University of Illinois at Urbana-Champaign': 'IL',
  'University of California, San Diego': 'CA', 'University of Texas at Austin': 'TX',
  'University of Wisconsin-Madison': 'WI', 'University of California, Davis': 'CA',
  'Brown University': 'RI', 'Washington University in St Louis': 'MO',
  'University of California, Santa Barbara': 'CA', 'University of Southern California': 'CA',
  'Boston University': 'MA', 'University of North Carolina at Chapel Hill': 'NC',
  'Purdue University West Lafayette': 'IN', 'University of Minnesota': 'MN',
  'Vanderbilt University': 'TN', 'University of California, Irvine': 'CA',
};
const stateOf = (name, country) => (country === 'USA' ? (US_STATE[name] || null) : null);

// ---- official websites for the well-known (enriched) universities ----
// Curated by hand; the ~750 THE-ranked schools have no reliable URL source, so the
// UI falls back to a web-search link for any university without an entry here.
const SITE = {
  'MIT': 'https://www.mit.edu', 'Imperial College London': 'https://www.imperial.ac.uk',
  'Stanford University': 'https://www.stanford.edu', 'University of Oxford': 'https://www.ox.ac.uk',
  'Harvard University': 'https://www.harvard.edu', 'University of Cambridge': 'https://www.cam.ac.uk',
  'ETH Zurich': 'https://ethz.ch', 'NUS Singapore': 'https://www.nus.edu.sg', 'UCL': 'https://www.ucl.ac.uk',
  'Caltech': 'https://www.caltech.edu', 'Univ of Chicago': 'https://www.uchicago.edu',
  'Princeton University': 'https://www.princeton.edu', 'Univ of Hong Kong': 'https://www.hku.hk',
  'NTU Singapore': 'https://www.ntu.edu.sg', 'Cornell University': 'https://www.cornell.edu',
  'Yale University': 'https://www.yale.edu', 'Columbia University': 'https://www.columbia.edu',
  'Univ of Pennsylvania': 'https://www.upenn.edu', 'Univ of Melbourne': 'https://www.unimelb.edu.au',
  'Peking University': 'https://english.pku.edu.cn', 'Tsinghua University': 'https://www.tsinghua.edu.cn/en/',
  'UC Berkeley': 'https://www.berkeley.edu', 'Johns Hopkins University': 'https://www.jhu.edu',
  'Univ of Sydney': 'https://www.sydney.edu.au', 'Duke University': 'https://www.duke.edu',
  'Univ of Toronto': 'https://www.utoronto.ca', 'Univ of Michigan': 'https://umich.edu',
  'Kings College London': 'https://www.kcl.ac.uk', 'Univ of Manchester': 'https://www.manchester.ac.uk',
  'McGill University': 'https://www.mcgill.ca', 'Seoul National University': 'https://en.snu.ac.kr',
  'Fudan University': 'https://www.fudan.edu.cn/en/', 'Univ of Tokyo': 'https://www.u-tokyo.ac.jp/en/',
  'Univ of Edinburgh': 'https://www.ed.ac.uk', 'CUHK Hong Kong': 'https://www.cuhk.edu.hk/english/',
  'UCLA': 'https://www.ucla.edu', 'UNSW Sydney': 'https://www.unsw.edu.au',
  'Paris-Saclay University': 'https://www.universite-paris-saclay.fr/en', 'LSE': 'https://www.lse.ac.uk',
  'Kyoto University': 'https://www.kyoto-u.ac.jp/en', 'Univ of Amsterdam': 'https://www.uva.nl/en',
  'KAIST': 'https://www.kaist.ac.kr/en/', 'Australian National Univ': 'https://www.anu.edu.au',
  'Carnegie Mellon University': 'https://www.cmu.edu', 'NYU': 'https://www.nyu.edu',
  'Monash University': 'https://www.monash.edu', 'Delft Univ of Technology': 'https://www.tudelft.nl/en/',
  'Univ of British Columbia': 'https://www.ubc.ca', 'Technical Univ of Munich': 'https://www.tum.de/en/',
  'LMU Munich': 'https://www.lmu.de/en/', 'Univ of Sao Paulo': 'https://www5.usp.br/english/',
  'Univ of Cape Town': 'https://www.uct.ac.za', 'IIT Bombay': 'https://www.iitb.ac.in',
  'KFUPM Saudi Arabia': 'https://www.kfupm.edu.sa', 'Politecnico di Milano': 'https://www.polimi.it/en/',
  'Univ of Warsaw': 'https://en.uw.edu.pl', 'Sunway University': 'https://university.sunway.edu.my',
};

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
const enriched = rankRows.map(r => {
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
    state: stateOf(name, country),
    type: r['university_type'] || null,
    website: SITE[name] || null,
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

// ---- breadth: Times Higher Education 2026 (~2200 rows) merged in ----
// THE has no per-university city, employer reputation or founding year, so those
// are left null and the UI shows the country + country-average cost honestly.
const THE_COUNTRY = { 'United States': 'USA', 'United Kingdom': 'UK', 'Russian Federation': 'Russia' };
const theCountry = c => THE_COUNTRY[c] || c;

// short/abbreviated names in the enriched set that don't normalize-match THE
const ALIAS = {
  'MIT': 'Massachusetts Institute of Technology',
  'NUS Singapore': 'National University of Singapore',
  'Caltech': 'California Institute of Technology',
  'Univ of Chicago': 'University of Chicago',
  'Univ of Hong Kong': 'The University of Hong Kong',
  'NTU Singapore': 'Nanyang Technological University, Singapore',
  'Univ of Pennsylvania': 'University of Pennsylvania',
  'Univ of Melbourne': 'The University of Melbourne',
  'UC Berkeley': 'University of California, Berkeley',
  'Univ of Sydney': 'The University of Sydney',
  'Univ of Toronto': 'University of Toronto',
  'Univ of Michigan': 'University of Michigan-Ann Arbor',
  'Univ of Manchester': 'The University of Manchester',
  'Univ of Tokyo': 'The University of Tokyo',
  'Univ of Edinburgh': 'The University of Edinburgh',
  'CUHK Hong Kong': 'The Chinese University of Hong Kong',
  'UCLA': 'University of California, Los Angeles',
  'Paris-Saclay University': 'Université Paris-Saclay',
  'LSE': 'London School of Economics and Political Science',
  'Univ of Amsterdam': 'University of Amsterdam',
  'KAIST': 'Korea Advanced Institute of Science and Technology (KAIST)',
  'Australian National Univ': 'The Australian National University',
  'NYU': 'New York University',
  'Delft Univ of Technology': 'Delft University of Technology',
  'Univ of British Columbia': 'University of British Columbia',
  'Technical Univ of Munich': 'Technical University of Munich',
  'Univ of Sao Paulo': 'University of São Paulo',
  'Univ of Cape Town': 'University of Cape Town',
  'IIT Bombay': 'Indian Institute of Technology Bombay',
  'KFUPM Saudi Arabia': 'King Fahd University of Petroleum and Minerals',
  'Univ of Warsaw': 'University of Warsaw',
};
const normName = s => (s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
const enrichedKeys = new Set(enriched.flatMap(u => [normName(u.name), normName(ALIAS[u.name] || '')].filter(Boolean)));

const CAP = 19; // top N per country -> ~800 total
const perCountry = {};
const theUnis = table(SRC.the)
  .map(r => ({ rank: num(r['Rank']), name: r['Name'], country: theCountry(r['Country']), score: num(r['Overall Score']), teaching: num(r['Teaching']) }))
  .filter(r => r.name && r.score != null && countryByName[r.country] && r.rank != null)
  .sort((a, b) => a.rank - b.rank)
  .filter(r => !enrichedKeys.has(normName(r.name)))
  .filter(r => { perCountry[r.country] = (perCountry[r.country] || 0) + 1; return perCountry[r.country] <= CAP; })
  .map(r => {
    const c = countryByName[r.country];
    return {
      name: r.name,
      country: r.country,
      iso2: iso2(r.country),
      region: regionOf(r.country),
      city: null,
      state: stateOf(r.name, r.country),
      type: null,
      qsRank: null, theRank: r.rank, bestRank: r.rank,
      qsScore: r.score, // THE overall score (0..100) — prestige proxy for scoring
      employerRep: null,
      academicRep: null,
      teaching: r.teaching,
      founded: null,
      totalStudents: null,
      intlPct: null,
      nobel: null,
      fields: fieldsFor(r.name),
      avgTuition: c?.avgTuition ?? null,
      costOfLiving: c?.costOfLiving ?? null,
      monthlyCost: monthlyCostFor(r.country, null),
      scholarshipAvailability: c?.scholarshipAvailability ?? null,
      erasmus: regionOf(r.country) === 'Europe' ? seededScore(r.name, 'eras', 70, 98) : seededScore(r.name, 'eras', 20, 55),
      nightlife: seededScore(r.name, 'night'),
      parks: seededScore(r.name, 'parks'),
      malls: seededScore(r.name, 'malls'),
      quiet: seededScore(r.name, 'quiet'),
    };
  });

const universities = [...enriched, ...theUnis];

// ---------------- currencies.json (local-currency display) ----------------
// Native currency code per country comes straight from the tuition CSV `Currency`
// column. Display converts USD -> local at build-time-fetched FX; *scoring stays
// in USD* so cross-country comparison is unaffected.
const CURRENCY_BY_ISO = { bg: 'BGN', hk: 'HKD' }; // not present in the tuition CSV
for (const r of tuitionRows) {
  const code = (r['Currency'] || '').trim();
  const id = iso2(r['Country']);
  if (code && id !== 'un') CURRENCY_BY_ISO[id] = code;
}

// symbol => printed before the amount; suffix => printed after; unknown code => code prefix
const SYMBOLS = {
  USD: { symbol: '$' }, EUR: { symbol: '€' }, GBP: { symbol: '£' }, JPY: { symbol: '¥' },
  CNY: { symbol: '¥' }, INR: { symbol: '₹' }, BRL: { symbol: 'R$' }, RUB: { symbol: '₽' },
  CAD: { symbol: 'CA$' }, AUD: { symbol: 'A$' }, MXN: { symbol: 'MX$' }, ZAR: { symbol: 'R' },
  KRW: { symbol: '₩' }, TRY: { symbol: '₺' }, THB: { symbol: '฿' }, IDR: { symbol: 'Rp' },
  PHP: { symbol: '₱' }, MYR: { symbol: 'RM' }, SGD: { symbol: 'S$' }, NZD: { symbol: 'NZ$' },
  ILS: { symbol: '₪' }, UAH: { symbol: '₴' }, NGN: { symbol: '₦' }, BDT: { symbol: '৳' },
  ARS: { symbol: 'AR$' }, CLP: { symbol: 'CLP$' }, COP: { symbol: 'COL$' }, HKD: { symbol: 'HK$' },
  CHF: { suffix: 'CHF' }, SEK: { suffix: 'kr' }, NOK: { suffix: 'kr' }, DKK: { suffix: 'kr' },
  PLN: { suffix: 'zł' }, CZK: { suffix: 'Kč' }, HUF: { suffix: 'Ft' }, RON: { suffix: 'lei' },
  VND: { suffix: '₫' }, PEN: { suffix: 'S/' }, PKR: { suffix: 'Rs' }, BGN: { suffix: 'лв' },
};

// committed mid-2026 FX (local units per USD) — keeps the build working offline
const FALLBACK_RATES = {
  USD: 1, EUR: 0.92, GBP: 0.79, JPY: 155, CNY: 7.2, INR: 84, BRL: 5.4, RUB: 90,
  CAD: 1.37, AUD: 1.52, MXN: 18, ZAR: 18.5, SAR: 3.75, IDR: 16000, ARS: 950, TRY: 33,
  KRW: 1350, PKR: 280, BDT: 118, EGP: 48, NGN: 1500, VND: 25000, PHP: 58, THB: 36,
  IRR: 42000, COP: 4000, MYR: 4.5, UAH: 41, PLN: 3.9, SEK: 10.5, CHF: 0.88, CLP: 950,
  PEN: 3.75, RON: 4.6, CZK: 23, HUF: 360, SGD: 1.34, NZD: 1.65, NOK: 10.8, DKK: 6.9,
  ILS: 3.7, BGN: 1.8, HKD: 7.8,
};

let rates = FALLBACK_RATES, fxSource = 'fallback';
let fxAsOf = '2026-06';
try {
  const res = await fetch('https://open.er-api.com/v6/latest/USD');
  if (res.ok) {
    const j = await res.json();
    if (j?.rates?.EUR) {
      rates = j.rates;
      fxSource = 'open.er-api.com';
      fxAsOf = j.time_last_update_utc
        ? new Date(j.time_last_update_utc).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);
    }
  }
} catch { /* offline — keep committed fallback */ }

const BGN_PER_EUR = 1.95583;       // fixed eurozone peg (exact)
const HIGH_DENOM_RATE = 50;        // >= 50 local units / USD -> round display to 1000
const currencies = {};
const allIsos = new Set([...countries.map(c => c.iso2), 'bg', 'hk', ...universities.map(u => u.iso2)]);
for (const id of allIsos) {
  const code = CURRENCY_BY_ISO[id] || 'USD';
  const rate = rates[code] ?? FALLBACK_RATES[code] ?? 1;
  const sym = SYMBOLS[code] || {};
  const entry = {
    code,
    symbol: sym.symbol || null,
    suffix: sym.suffix || null,
    rate,
    step: rate >= HIGH_DENOM_RATE ? 1000 : 50,
  };
  if (id === 'bg') {
    entry.secondary = { code: 'EUR', symbol: '€', suffix: null, rate: rate / BGN_PER_EUR };
  }
  currencies[id] = entry;
}
currencies.meta = { asOf: fxAsOf, source: fxSource };
const bgnRate = currencies.bg.rate; // BGN per USD, used to convert real BG fees -> canonical USD

// ---------------- bulgaria.json (home / center card) ----------------
// Curated, real metadata for Bulgarian universities (Scimago gives only rank).
// City + founding year are stable facts; балообразуване notes are orientational
// summaries of public admission rules (uni-sofia.bg, mu-sofia.bg, unwe.bg).
// tMinBGN / tMaxBGN = orientational annual държавна-поръчка (state-subsidized) fee
// range in лв for 2025/26. Fees vary by specialty within a university; values are
// approximate, sourced from public fee schedules (uni-sofia.bg, unwe.bg, mu-sofia.bg,
// tu-sofia.bg) and the regulated PMS caps. New Bulgarian University is private (paid only).
const BG_META = {
  'Sofia University': { nameBg: 'СУ „Св. Климент Охридски“', city: 'София', founded: 1888, fields: ['Компютърни науки', 'Право', 'Природни науки', 'Хуманитарни науки', 'Социални науки'], balo: 'Признават се матури; за Информатика (ФМИ) математика с коеф. 2.5 + оценки от диплома', tMinBGN: 530, tMaxBGN: 1200 },
  'Medical University of Varna Prof Dr Paraskev Stoyano': { nameBg: 'Медицински университет – Варна', city: 'Варна', founded: 1961, fields: ['Медицина'], balo: 'ДЗИ БЕЛ + 3×Биология + 3×Химия (изпити); макс. бал 42', tMinBGN: 900, tMaxBGN: 1500 },
  'Medical University of Sofia *': { nameBg: 'Медицински университет – София', city: 'София', founded: 1917, fields: ['Медицина'], balo: 'ДЗИ БЕЛ + 3×Биология + 3×Химия (изпити); макс. бал 42', tMinBGN: 900, tMaxBGN: 1500 },
  'Medical University - Plovdiv': { nameBg: 'Медицински университет – Пловдив', city: 'Пловдив', founded: 1945, fields: ['Медицина'], balo: 'ДЗИ БЕЛ + 3×Биология + 3×Химия (изпити); макс. бал 42', tMinBGN: 900, tMaxBGN: 1500 },
  'University of Plovdiv Paisii Hilendarski': { nameBg: 'ПУ „Паисий Хилендарски“', city: 'Пловдив', founded: 1961, fields: ['Компютърни науки', 'Природни науки', 'Хуманитарни науки', 'Социални науки'], balo: 'Матури и/или кандидатстудентски изпити според специалността', tMinBGN: 600, tMaxBGN: 1100 },
  'University of Food Technologies, Plovdiv': { nameBg: 'Университет по хранителни технологии', city: 'Пловдив', founded: 1953, fields: ['Инженерство', 'Природни науки'], balo: 'Изпит/матура по математика, химия или биология + оценки от диплома', tMinBGN: 700, tMaxBGN: 1100 },
  'University of Rousse': { nameBg: 'Русенски университет „Ангел Кънчев“', city: 'Русе', founded: 1945, fields: ['Инженерство', 'Компютърни науки', 'Бизнес и икономика'], balo: 'Матура/изпит по математика или БЕЛ + оценки от диплома', tMinBGN: 650, tMaxBGN: 1050 },
  'University of Chemical Technology and Metallurgy': { nameBg: 'Химикотехнологичен и металургичен университет', city: 'София', founded: 1953, fields: ['Инженерство', 'Природни науки'], balo: 'Изпит/матура по математика или химия + оценки от диплома', tMinBGN: 700, tMaxBGN: 1150 },
  'University of Forestry Sofia': { nameBg: 'Лесотехнически университет', city: 'София', founded: 1925, fields: ['Природни науки', 'Инженерство'], balo: 'Матура/изпит по биология или математика + оценки от диплома', tMinBGN: 700, tMaxBGN: 1100 },
  'University of National and World Economy': { nameBg: 'УНСС', city: 'София', founded: 1920, fields: ['Бизнес и икономика', 'Право', 'Социални науки'], balo: 'Единен приемен изпит или матура (математика/БЕЛ) + оценки от диплома', tMinBGN: 700, tMaxBGN: 800 },
  'New Bulgarian University': { nameBg: 'Нов български университет', city: 'София', founded: 1991, fields: ['Бизнес и икономика', 'Социални науки', 'Изкуства и дизайн', 'Хуманитарни науки'], balo: 'По документи и/или тест; матурите се признават', tMinBGN: 3000, tMaxBGN: 5200 },
  'Technical University of Sofia': { nameBg: 'Технически университет – София', city: 'София', founded: 1945, fields: ['Инженерство', 'Компютърни науки'], balo: 'Матура/изпит по математика (до 3×) + оценки от диплома', tMinBGN: 700, tMaxBGN: 1200 },
  'Trakia University': { nameBg: 'Тракийски университет', city: 'Стара Загора', founded: 1995, fields: ['Медицина', 'Природни науки', 'Инженерство'], balo: 'Матури/изпити според специалността + оценки от диплома', tMinBGN: 700, tMaxBGN: 1300 },
  'South West University Neofit Rilski': { nameBg: 'ЮЗУ „Неофит Рилски“', city: 'Благоевград', founded: 1976, fields: ['Хуманитарни науки', 'Социални науки', 'Изкуства и дизайн', 'Природни науки'], balo: 'Матури и/или кандидатстудентски изпити според специалността', tMinBGN: 600, tMaxBGN: 1100 },
  'University of Architecture, Civil Engineering and Geodesy': { nameBg: 'УАСГ', city: 'София', founded: 1942, fields: ['Инженерство', 'Изкуства и дизайн'], balo: 'Изпит по математика + изпит по рисуване (за архитектура) + диплома', tMinBGN: 700, tMaxBGN: 1200 },
  'Agricultural University of Plovdiv': { nameBg: 'Аграрен университет – Пловдив', city: 'Пловдив', founded: 1945, fields: ['Природни науки'], balo: 'Матура/изпит по биология или математика + оценки от диплома', tMinBGN: 650, tMaxBGN: 1050 },
  'Technical University of Varna': { nameBg: 'Технически университет – Варна', city: 'Варна', founded: 1962, fields: ['Инженерство', 'Компютърни науки'], balo: 'Матура/изпит по математика + оценки от диплома', tMinBGN: 700, tMaxBGN: 1150 },
  'Technical University of Gabrovo': { nameBg: 'Технически университет – Габрово', city: 'Габрово', founded: 1964, fields: ['Инженерство', 'Компютърни науки'], balo: 'Матура/изпит по математика + оценки от диплома', tMinBGN: 650, tMaxBGN: 1050 },
  'Prof Dr Assen Zlatarov University': { nameBg: 'Университет „Проф. д-р Асен Златаров“', city: 'Бургас', founded: 1963, fields: ['Инженерство', 'Природни науки', 'Медицина'], balo: 'Матура/изпит по математика, химия или биология + оценки от диплома', tMinBGN: 650, tMaxBGN: 1200 },
};

// official websites for the Bulgarian universities (curated, real domains)
const BG_SITE = {
  'Sofia University': 'https://www.uni-sofia.bg',
  'Medical University of Varna Prof Dr Paraskev Stoyano': 'https://mu-varna.bg',
  'Medical University of Sofia *': 'https://mu-sofia.bg',
  'Medical University - Plovdiv': 'https://mu-plovdiv.bg',
  'University of Plovdiv Paisii Hilendarski': 'https://uni-plovdiv.bg',
  'University of Food Technologies, Plovdiv': 'https://uft-plovdiv.bg',
  'University of Rousse': 'https://www.uni-ruse.bg',
  'University of Chemical Technology and Metallurgy': 'https://uctm.edu',
  'University of Forestry Sofia': 'https://ltu.bg',
  'University of National and World Economy': 'https://www.unwe.bg',
  'New Bulgarian University': 'https://www.nbu.bg',
  'Technical University of Sofia': 'https://www.tu-sofia.bg',
  'Trakia University': 'https://uni-sz.bg',
  'South West University Neofit Rilski': 'https://www.swu.bg',
  'University of Architecture, Civil Engineering and Geodesy': 'https://uacg.bg',
  'Agricultural University of Plovdiv': 'https://www.au-plovdiv.bg',
  'Technical University of Varna': 'https://www.tu-varna.bg',
  'Technical University of Gabrovo': 'https://www.tugab.bg',
  'Prof Dr Assen Zlatarov University': 'https://www.btu.bg',
};

const bgRows = table(SRC.bg, ';');
const bgUnis = bgRows.map(r => {
  const name = r['Institution'];
  const m = BG_META[name] || {};
  // canonical USD derived from the real лв fee via the same rate display reverses
  const tuitionMin = m.tMinBGN != null ? Math.round(m.tMinBGN / bgnRate) : null;
  const tuitionMax = m.tMaxBGN != null ? Math.round(m.tMaxBGN / bgnRate) : null;
  const avgTuition = (tuitionMin != null && tuitionMax != null)
    ? Math.round((tuitionMin + tuitionMax) / 2)
    : null;
  return {
    name,
    nameBg: m.nameBg || name,
    city: m.city || null,
    founded: m.founded || null,
    fields: m.fields || [],
    balo: m.balo || null,
    website: BG_SITE[name] || null,
    globalRank: num(r['Global Rank']),
    nationalRank: num(r['Rank']),
    quartile: num(r['Best Country Quartile']),
    tuitionMin, tuitionMax, avgTuition,
  };
}).filter(u => u.name);
// Bulgaria home baseline: tuition derived from the real per-uni лв ranges above.
const bgFees = bgUnis.filter(u => u.avgTuition != null);
const bgAvgTuition = bgFees.length ? Math.round(bgFees.reduce((s, u) => s + u.avgTuition, 0) / bgFees.length) : 1800;
const bgMinTuition = bgFees.length ? Math.min(...bgFees.map(u => u.tuitionMin)) : 500;
const bgMaxTuition = bgFees.length ? Math.max(...bgFees.map(u => u.tuitionMax)) : 3000;
const bulgaria = {
  name: 'България',
  iso2: 'bg',
  region: 'Europe',
  // representative figures for BG public universities (USD); marked as home baseline in UI
  avgTuition: bgAvgTuition,
  minTuition: bgMinTuition,
  maxTuition: bgMaxTuition,
  costOfLiving: 38,
  monthlyCost: monthlyCostFor('Bulgaria', 'Sofia'),
  scholarshipAvailability: 35,
  erasmus: 88,
  nightlife: 78,
  parks: 72,
  malls: 70,
  quiet: 66,
  topUniversities: bgUnis.slice(0, 8),
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
write('currencies.json', currencies);
write('fields.json', { fields: FIELDS, meta: FIELD_META });

console.log('Built data:', {
  countries: countries.length,
  universities: universities.length,
  enriched: enriched.length,
  fromTHE: theUnis.length,
  bgUniversities: bgUnis.length,
  bgTuitionBGN: `${bgMinTuition}-${bgMaxTuition} USD`,
  fx: `${fxSource} @ ${fxAsOf} (bgnRate ${bgnRate})`,
  currencies: Object.keys(currencies).length - 1,
});
