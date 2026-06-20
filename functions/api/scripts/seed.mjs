/**
 * Seed sample data so the app is demoable before the real CSVs are imported.
 * Clearly representative-but-approximate figures for a handful of popular study
 * destinations. Replaced wholesale once import.mjs loads the real datasets.
 *
 *   DATABASE_URL="$(openkbs postgres connection)" node functions/api/scripts/seed.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (!process.env.DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 4 });

// country -> { region, rent (USD/mo), costIndex }
const COUNTRIES = {
  Bulgaria:        { region: 'Eastern Europe', rent: 350,  cost: 38 },
  Germany:         { region: 'Western Europe', rent: 950,  cost: 65 },
  Netherlands:     { region: 'Western Europe', rent: 1150, cost: 70 },
  'United Kingdom':{ region: 'Western Europe', rent: 1400, cost: 75 },
  'United States': { region: 'North America',  rent: 1500, cost: 78 },
  Canada:          { region: 'North America',  rent: 1100, cost: 68 },
  Poland:          { region: 'Eastern Europe', rent: 500,  cost: 42 },
  France:          { region: 'Western Europe', rent: 1000, cost: 67 },
  Spain:           { region: 'Southern Europe',rent: 800,  cost: 55 },
  Sweden:          { region: 'Northern Europe',rent: 1050, cost: 69 },
};

const FIELDS = ['Computer Science', 'Engineering', 'Business', 'Medicine', 'Law'];
const LEVELS = ['Bachelor', 'Master'];

// universities per country: [name, worldRank, overall, teaching, employer]
const UNIS = {
  Bulgaria: [['Sofia University', 590, 55, 60, 50], ['Technical University of Sofia', 720, 48, 52, 55]],
  Germany: [['Technical University of Munich', 37, 85, 82, 90], ['LMU Munich', 54, 82, 80, 78], ['Heidelberg University', 87, 78, 79, 72]],
  Netherlands: [['Delft University of Technology', 47, 84, 80, 88], ['University of Amsterdam', 53, 82, 81, 80]],
  'United Kingdom': [['University of Oxford', 3, 98, 97, 99], ['Imperial College London', 6, 95, 92, 96], ['University of Manchester', 32, 86, 84, 88]],
  'United States': [['MIT', 1, 100, 98, 100], ['Stanford University', 5, 97, 96, 99], ['University of Michigan', 25, 88, 87, 90]],
  Canada: [['University of Toronto', 21, 89, 88, 89], ['McGill University', 30, 87, 86, 85]],
  Poland: [['University of Warsaw', 262, 62, 64, 66], ['Jagiellonian University', 304, 60, 63, 62]],
  France: [['PSL University', 24, 88, 85, 84], ['Sorbonne University', 59, 80, 82, 76]],
  Spain: [['University of Barcelona', 165, 70, 72, 71], ['Complutense University of Madrid', 171, 68, 70, 67]],
  Sweden: [['KTH Royal Institute of Technology', 73, 79, 78, 83], ['Lund University', 75, 78, 80, 79]],
};

// tuition USD/yr by country+level (international student approximation)
const TUITION = {
  Bulgaria:        { Bachelor: 3500,  Master: 4000 },
  Germany:         { Bachelor: 500,   Master: 1000 },
  Netherlands:     { Bachelor: 11000, Master: 15000 },
  'United Kingdom':{ Bachelor: 22000, Master: 26000 },
  'United States': { Bachelor: 35000, Master: 40000 },
  Canada:          { Bachelor: 20000, Master: 22000 },
  Poland:          { Bachelor: 3000,  Master: 3500 },
  France:          { Bachelor: 3000,  Master: 4500 },
  Spain:           { Bachelor: 6000,  Master: 8000 },
  Sweden:          { Bachelor: 10000, Master: 14000 },
};

// employment rate (%) + avg salary (USD) by country (graduate outcomes approximation)
const EMPLOYMENT = {
  Bulgaria: [78, 18000], Germany: [92, 55000], Netherlands: [90, 52000],
  'United Kingdom': [89, 48000], 'United States': [88, 70000], Canada: [87, 56000],
  Poland: [83, 24000], France: [85, 45000], Spain: [80, 32000], Sweden: [88, 50000],
};

// scholarship catalog: [name, country, amount, level]
const SCHOLARSHIPS = [
  ['DAAD Scholarship', 'Germany', 12000, 'Master'],
  ['Deutschlandstipendium', 'Germany', 3600, 'Bachelor'],
  ['Holland Scholarship', 'Netherlands', 5500, 'Bachelor'],
  ['Orange Tulip Scholarship', 'Netherlands', 8000, 'Master'],
  ['Chevening Scholarship', 'United Kingdom', 20000, 'Master'],
  ['GREAT Scholarship', 'United Kingdom', 12000, 'Master'],
  ['Fulbright Program', 'United States', 25000, 'Master'],
  ['Vanier Canada Graduate Scholarship', 'Canada', 35000, 'PhD'],
  ['Lester B. Pearson Scholarship', 'Canada', 40000, 'Bachelor'],
  ['Eiffel Excellence Scholarship', 'France', 14000, 'Master'],
  ['MEXT-style Regional Grant', 'Poland', 4000, 'Bachelor'],
  ['Swedish Institute Scholarship', 'Sweden', 16000, 'Master'],
  ['La Caixa Fellowship', 'Spain', 12000, 'Master'],
  ['Sofia University Merit Grant', 'Bulgaria', 1500, 'Bachelor'],
];

const jitter = (base, pct = 0.12) => Math.round(base * (1 + (Math.random() * 2 - 1) * pct));

async function main() {
  const c = await pool.connect();
  try {
    console.log('Applying schema...');
    await c.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

    console.log('Clearing existing rows...');
    await c.query('TRUNCATE programs, scholarships, cost_of_living, professor_reviews, employment_outcomes, universities RESTART IDENTITY CASCADE');

    for (const [country, meta] of Object.entries(COUNTRIES)) {
      await c.query('INSERT INTO cost_of_living (country, city, monthly_rent, cost_index) VALUES ($1,$2,$3,$4)',
        [country, 'Capital', meta.rent, meta.cost]);

      const [empRate, salary] = EMPLOYMENT[country];
      for (const field of FIELDS) for (const level of LEVELS) {
        await c.query('INSERT INTO employment_outcomes (country, field, study_level, employment_rate, avg_salary) VALUES ($1,$2,$3,$4,$5)',
          [country, field, level, jitter(empRate, 0.05), jitter(salary)]);
      }

      for (const [name, rank, overall, teaching, employer] of UNIS[country]) {
        const r = await c.query(
          `INSERT INTO universities (name, country, region, world_rank, overall_score, teaching_score, employer_reputation_score)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [name, country, meta.region, rank, overall, teaching, employer]);
        const uid = r.rows[0].id;

        // RateMyProfessor-style aggregate rating, correlated with teaching score
        await c.query('INSERT INTO professor_reviews (university, department, avg_rating, num_reviews) VALUES ($1,$2,$3,$4)',
          [name, null, Math.min(5, Math.max(2.5, teaching / 20 + (Math.random() * 0.6 - 0.3))).toFixed(2), jitter(400)]);

        for (const field of FIELDS) for (const level of LEVELS) {
          await c.query(
            `INSERT INTO programs (university_id, country, field, study_level, degree_type, duration_years, tuition_year, currency)
             VALUES ($1,$2,$3,$4,$5,$6,$7,'USD')`,
            [uid, country, field, level, level === 'Bachelor' ? 'BSc' : 'MSc',
              level === 'Bachelor' ? 3 : 2, jitter(TUITION[country][level])]);
        }
      }
    }

    for (const [name, country, amount, level] of SCHOLARSHIPS) {
      await c.query('INSERT INTO scholarships (country, field, name, amount, level) VALUES ($1,$2,$3,$4,$5)',
        [country, null, name, amount, level]);
    }

    const counts = await c.query(`SELECT
      (SELECT count(*) FROM universities) u,
      (SELECT count(*) FROM programs) p,
      (SELECT count(*) FROM scholarships) s,
      (SELECT count(*) FROM employment_outcomes) e`);
    console.log('Seeded:', counts.rows[0]);
  } finally {
    c.release();
    await pool.end();
  }
}
main().catch(e => { console.error(e); process.exit(1); });
