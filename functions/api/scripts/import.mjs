/**
 * CSV importer for the University Comparison Assistant.
 *
 * Run from the agent container against the live DB:
 *   DATABASE_URL="$(openkbs postgres connection)" node functions/api/scripts/import.mjs
 *
 * Place the downloaded datasets in functions/api/scripts/data/ and map each file
 * in DATASETS below. Header names differ per source, so each loader lists candidate
 * column names and pickCol() fuzzy-matches the first that exists.
 *
 * Datasets (from the project brief):
 *   - tuition.csv        Global Tuition Fees & Education Trends 2024
 *   - scholarships.csv   Universities + Scholarships all around the world
 *   - reviews.csv        RateMyProfessor
 *   - universities.csv   All universities in the world (degree types, country, fields)
 *   - rankings.csv       World University Rankings (employer reputation + teaching score)
 *   - employment.csv     International graduates employment dataset
 *   - cost_of_living.csv Numbeo cost of living / rent
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required. Run: DATABASE_URL="$(openkbs postgres connection)" node import.mjs');
  process.exit(1);
}

// ---------- tiny CSV parser (handles quotes, escaped quotes, newlines in quotes) ----------
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length && r.some(v => v !== ''));
}

function readCSV(file) {
  const full = path.join(DATA_DIR, file);
  if (!fs.existsSync(full)) return null;
  const rows = parseCSV(fs.readFileSync(full, 'utf8'));
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(r => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? '').trim()])));
}

// fuzzy column pick: returns value from the first candidate header present (case/space-insensitive)
function pickCol(obj, candidates) {
  const keys = Object.keys(obj);
  const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const cand of candidates) {
    const target = norm(cand);
    const k = keys.find(key => norm(key) === target) || keys.find(key => norm(key).includes(target));
    if (k && obj[k] !== '') return obj[k];
  }
  return null;
}

const num = v => {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

function normLevel(v) {
  if (!v) return null;
  const s = String(v).toLowerCase();
  if (s.includes('bach') || s.includes('undergrad') || s.startsWith('bsc') || s.startsWith('ba')) return 'Bachelor';
  if (s.includes('master') || s.includes('msc') || s.includes('postgrad') || s.startsWith('ma')) return 'Master';
  if (s.includes('phd') || s.includes('doctor')) return 'PhD';
  return v;
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 4 });

async function ensureUniversity(client, name, country, region) {
  if (!name) return null;
  const r = await client.query(
    `INSERT INTO universities (name, country, region) VALUES ($1,$2,$3)
     ON CONFLICT (name, country) DO UPDATE SET region = COALESCE(EXCLUDED.region, universities.region)
     RETURNING id`,
    [name, country || 'Unknown', region]
  );
  return r.rows[0].id;
}

// ---------- per-dataset loaders ----------
async function loadRankings(client) {
  const rows = readCSV('rankings.csv');
  if (!rows) return 0;
  let n = 0;
  for (const row of rows) {
    const name = pickCol(row, ['institution', 'university', 'name', 'school']);
    const country = pickCol(row, ['country', 'location', 'region']);
    if (!name) continue;
    const id = await ensureUniversity(client, name, country);
    await client.query(
      `UPDATE universities SET
         world_rank = COALESCE($2, world_rank),
         overall_score = COALESCE($3, overall_score),
         teaching_score = COALESCE($4, teaching_score),
         employer_reputation_score = COALESCE($5, employer_reputation_score)
       WHERE id = $1`,
      [id,
        num(pickCol(row, ['world_rank', 'rank', 'ranking', '2024 rank'])),
        num(pickCol(row, ['overall score', 'score', 'total score'])),
        num(pickCol(row, ['teaching', 'teaching score', 'quality of education'])),
        num(pickCol(row, ['employer reputation', 'employer', 'graduate employment rate']))]
    );
    n++;
  }
  return n;
}

async function loadUniversities(client) {
  const rows = readCSV('universities.csv');
  if (!rows) return 0;
  let n = 0;
  for (const row of rows) {
    const name = pickCol(row, ['name', 'university', 'institution']);
    const country = pickCol(row, ['country', 'alpha_two_code', 'location']);
    if (!name) continue;
    const id = await ensureUniversity(client, name, country);
    const field = pickCol(row, ['field', 'discipline', 'subject', 'department', 'fields']);
    const level = normLevel(pickCol(row, ['degree', 'study level', 'level', 'qualification']));
    if (field) {
      await client.query(
        `INSERT INTO programs (university_id, country, field, study_level, degree_type, duration_years)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, country || 'Unknown', field, level || 'Bachelor',
          pickCol(row, ['degree_type', 'degree', 'diploma']),
          num(pickCol(row, ['duration', 'years', 'duration_years']))]
      );
    }
    n++;
  }
  return n;
}

async function loadTuition(client) {
  const rows = readCSV('tuition.csv');
  if (!rows) return 0;
  let n = 0;
  for (const row of rows) {
    const country = pickCol(row, ['country', 'location']);
    const name = pickCol(row, ['university', 'institution', 'name']);
    const field = pickCol(row, ['field', 'program', 'course', 'subject']) || 'General';
    const level = normLevel(pickCol(row, ['level', 'study level', 'degree'])) || 'Bachelor';
    const tuition = num(pickCol(row, ['tuition_usd', 'tuition', 'tuition fee', 'fee', 'annual tuition', 'tuition fees (usd)']));
    if (!country && !name) continue;
    const id = name ? await ensureUniversity(client, name, country) : null;
    await client.query(
      `INSERT INTO programs (university_id, country, field, study_level, duration_years, tuition_year, currency)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, country || 'Unknown', field, level,
        num(pickCol(row, ['duration', 'years', 'program duration'])),
        tuition,
        pickCol(row, ['currency']) || 'USD']
    );
    n++;
  }
  return n;
}

async function loadScholarships(client) {
  const rows = readCSV('scholarships.csv');
  if (!rows) return 0;
  let n = 0;
  for (const row of rows) {
    const name = pickCol(row, ['scholarship', 'name', 'title']);
    if (!name) continue;
    const country = pickCol(row, ['country', 'location', 'host country']);
    await client.query(
      `INSERT INTO scholarships (country, field, name, amount, level, url)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [country, pickCol(row, ['field', 'subject', 'discipline']),
        name, num(pickCol(row, ['amount', 'funding', 'value', 'award'])),
        normLevel(pickCol(row, ['level', 'degree', 'study level'])),
        pickCol(row, ['url', 'link', 'website'])]
    );
    n++;
  }
  return n;
}

async function loadReviews(client) {
  const rows = readCSV('reviews.csv');
  if (!rows) return 0;
  // RateMyProfessor rows are per-professor; aggregate to university + department.
  const agg = new Map();
  for (const row of rows) {
    const uni = pickCol(row, ['university', 'school', 'school_name', 'institution']);
    if (!uni) continue;
    const dept = pickCol(row, ['department', 'field', 'subject']) || '';
    const rating = num(pickCol(row, ['rating', 'avg_rating', 'star_rating', 'overall']));
    if (rating == null) continue;
    const key = uni + '||' + dept;
    const a = agg.get(key) || { uni, dept, sum: 0, count: 0 };
    a.sum += rating; a.count++;
    agg.set(key, a);
  }
  let n = 0;
  for (const a of agg.values()) {
    await client.query(
      `INSERT INTO professor_reviews (university, department, avg_rating, num_reviews) VALUES ($1,$2,$3,$4)`,
      [a.uni, a.dept || null, a.sum / a.count, a.count]
    );
    n++;
  }
  return n;
}

async function loadEmployment(client) {
  const rows = readCSV('employment.csv');
  if (!rows) return 0;
  let n = 0;
  for (const row of rows) {
    const country = pickCol(row, ['country', 'location', 'host country']);
    if (!country) continue;
    await client.query(
      `INSERT INTO employment_outcomes (country, field, study_level, employment_rate, avg_salary)
       VALUES ($1,$2,$3,$4,$5)`,
      [country, pickCol(row, ['field', 'subject', 'discipline', 'major']),
        normLevel(pickCol(row, ['level', 'study level', 'degree'])),
        num(pickCol(row, ['employment_rate', 'employment rate', 'employed', 'employment'])),
        num(pickCol(row, ['salary', 'avg_salary', 'average salary', 'income']))]
    );
    n++;
  }
  return n;
}

async function loadCostOfLiving(client) {
  const rows = readCSV('cost_of_living.csv');
  if (!rows) return 0;
  let n = 0;
  for (const row of rows) {
    const country = pickCol(row, ['country', 'location']);
    if (!country) continue;
    await client.query(
      `INSERT INTO cost_of_living (country, city, monthly_rent, cost_index) VALUES ($1,$2,$3,$4)`,
      [country, pickCol(row, ['city']),
        num(pickCol(row, ['rent', 'monthly_rent', 'rent index', 'average rent', 'apartment'])),
        num(pickCol(row, ['cost_index', 'cost of living index', 'index']))]
    );
    n++;
  }
  return n;
}

async function main() {
  const client = await pool.connect();
  try {
    console.log('Applying schema...');
    await client.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

    if (!fs.existsSync(DATA_DIR)) {
      console.log(`No data dir at ${DATA_DIR}. Create it and drop the CSVs in, then re-run.`);
      return;
    }

    const steps = [
      ['rankings', loadRankings],
      ['universities', loadUniversities],
      ['tuition', loadTuition],
      ['scholarships', loadScholarships],
      ['reviews', loadReviews],
      ['employment', loadEmployment],
      ['cost_of_living', loadCostOfLiving],
    ];
    for (const [name, fn] of steps) {
      try {
        const count = await fn(client);
        console.log(count ? `  ${name}: ${count} rows` : `  ${name}: (no file, skipped)`);
      } catch (e) {
        console.error(`  ${name}: FAILED — ${e.message}`);
      }
    }
    console.log('Done.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
