/**
 * University Comparison Assistant — API
 *
 * Actions:
 *   options  -> { countries, fields, levels } for the selectors
 *   compare  -> side-by-side metrics for home vs target + AI recommendation
 *
 * Env: DATABASE_URL (Postgres), OPENKBS_API_KEY (AI proxy)
 */
import pg from 'pg';
import Anthropic from '@anthropic-ai/sdk';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (data, statusCode = 200) => ({ statusCode, headers, body: JSON.stringify(data) });

let pool;
function getPool() {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 30_000,
    });
  }
  return pool;
}

async function getOptions(db) {
  const [countries, fields, levels] = await Promise.all([
    db.query(`SELECT DISTINCT country FROM programs WHERE country <> 'Unknown' ORDER BY country`),
    db.query(`SELECT DISTINCT field FROM programs WHERE field IS NOT NULL ORDER BY field`),
    db.query(`SELECT DISTINCT study_level FROM programs WHERE study_level IS NOT NULL ORDER BY study_level`),
  ]);
  return {
    countries: countries.rows.map(r => r.country),
    fields: fields.rows.map(r => r.field),
    levels: levels.rows.map(r => r.study_level),
  };
}

// Aggregate every metric for one country + field + level.
async function metricsFor(db, country, field, level) {
  const prog = await db.query(
    `SELECT AVG(tuition_year) avg_tuition, AVG(duration_years) avg_duration, COUNT(*) n
       FROM programs
      WHERE country = $1 AND field = $2 AND study_level = $3 AND tuition_year IS NOT NULL`,
    [country, field, level]
  );
  const rent = await db.query(
    `SELECT AVG(monthly_rent) rent, AVG(cost_index) cost_index FROM cost_of_living WHERE country = $1`,
    [country]
  );
  const emp = await db.query(
    `SELECT AVG(employment_rate) rate, AVG(avg_salary) salary
       FROM employment_outcomes
      WHERE country = $1 AND ($2 = '' OR field = $2) AND ($3 = '' OR study_level = $3)`,
    [country, field, level]
  );
  // top universities for this field/level in country, with review rating joined by name
  const unis = await db.query(
    `SELECT u.name, u.world_rank, u.overall_score, u.teaching_score, u.employer_reputation_score,
            AVG(p.tuition_year) tuition, MAX(r.avg_rating) review_rating
       FROM universities u
       JOIN programs p ON p.university_id = u.id AND p.field = $2 AND p.study_level = $3
       LEFT JOIN professor_reviews r ON r.university = u.name
      WHERE u.country = $1
      GROUP BY u.id
      ORDER BY u.world_rank NULLS LAST
      LIMIT 6`,
    [country, field, level]
  );
  const scholarships = await db.query(
    `SELECT name, amount, level FROM scholarships
      WHERE country = $1 AND ($2 = '' OR level = $2 OR level IS NULL)
      ORDER BY amount DESC NULLS LAST LIMIT 8`,
    [country, level]
  );

  const avgTuition = Number(prog.rows[0].avg_tuition) || 0;
  const duration = Number(prog.rows[0].avg_duration) || (level === 'Bachelor' ? 3 : 2);
  const monthlyRent = Number(rent.rows[0].rent) || 0;
  const totalRent = monthlyRent * 12 * duration;
  const totalTuition = avgTuition * duration;

  const reviewRatings = unis.rows.map(u => Number(u.review_rating)).filter(Boolean);
  const teachingScores = unis.rows.map(u => Number(u.teaching_score)).filter(Boolean);
  const ranks = unis.rows.map(u => Number(u.world_rank)).filter(Boolean);

  return {
    country,
    durationYears: Math.round(duration * 10) / 10,
    avgTuitionYear: Math.round(avgTuition),
    monthlyRent: Math.round(monthlyRent),
    costIndex: Math.round(Number(rent.rows[0].cost_index) || 0),
    totalTuition: Math.round(totalTuition),
    totalRent: Math.round(totalRent),
    totalCost: Math.round(totalTuition + totalRent),
    employmentRate: Math.round(Number(emp.rows[0].rate) || 0),
    avgSalary: Math.round(Number(emp.rows[0].salary) || 0),
    teachingScore: teachingScores.length ? Math.round(teachingScores.reduce((a, b) => a + b, 0) / teachingScores.length) : null,
    reviewRating: reviewRatings.length ? Math.round((reviewRatings.reduce((a, b) => a + b, 0) / reviewRatings.length) * 10) / 10 : null,
    bestRank: ranks.length ? Math.min(...ranks) : null,
    scholarshipCount: scholarships.rowCount,
    scholarshipTop: scholarships.rows[0] ? Number(scholarships.rows[0].amount) || 0 : 0,
    scholarships: scholarships.rows,
    universities: unis.rows.map(u => ({
      name: u.name,
      worldRank: u.world_rank,
      overallScore: u.overall_score ? Number(u.overall_score) : null,
      teachingScore: u.teaching_score ? Number(u.teaching_score) : null,
      employerScore: u.employer_reputation_score ? Number(u.employer_reputation_score) : null,
      tuition: u.tuition ? Math.round(Number(u.tuition)) : null,
      reviewRating: u.review_rating ? Number(u.review_rating) : null,
    })),
  };
}

async function recommend(home, target, field, level) {
  if (!process.env.OPENKBS_API_KEY) return null;
  const anthropic = new Anthropic({
    baseURL: 'https://proxy.openkbs.com/v1/anthropic',
    apiKey: process.env.OPENKBS_API_KEY,
    defaultHeaders: { Authorization: `Bearer ${process.env.OPENKBS_API_KEY}` },
  });
  const fmt = m => `country=${m.country}; total ${level} cost over ${m.durationYears}yr=$${m.totalCost} ` +
    `(tuition $${m.totalTuition} + rent $${m.totalRent}); avg tuition/yr=$${m.avgTuitionYear}; ` +
    `monthly rent=$${m.monthlyRent}; employment rate=${m.employmentRate}%; avg salary=$${m.avgSalary}; ` +
    `teaching score=${m.teachingScore ?? 'n/a'}; student review rating=${m.reviewRating ?? 'n/a'}/5; ` +
    `best world rank=${m.bestRank ?? 'n/a'}; scholarships available=${m.scholarshipCount} (top $${m.scholarshipTop}).`;

  const prompt = `You are a university comparison advisor. A student from ${home.country} is considering moving to ${target.country} to study ${field} at ${level} level.

HOME (${home.country}): ${fmt(home)}
TARGET (${target.country}): ${fmt(target)}

Using ONLY these numbers, write a concise recommendation (max 180 words). Cover: (1) total cost difference and whether scholarships offset it, (2) academic quality and ranking, (3) graduate employment and salary prospects, (4) a clear verdict — is moving worth it financially and academically? Be specific with the figures. End with one line: "Verdict: <Recommended / Worth considering / Not worth it>".`;

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });
  return msg.content.map(c => c.text || '').join('').trim();
}

export const handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  try {
    const db = getPool();
    const body = JSON.parse(event.body || '{}');
    const { action } = body;

    switch (action) {
      case 'options':
        return json(await getOptions(db));

      case 'compare': {
        const { homeCountry, targetCountry, field, studyLevel } = body;
        if (!homeCountry || !targetCountry || !field || !studyLevel) {
          return json({ error: 'homeCountry, targetCountry, field and studyLevel are required' }, 400);
        }
        const [home, target] = await Promise.all([
          metricsFor(db, homeCountry, field, studyLevel),
          metricsFor(db, targetCountry, field, studyLevel),
        ]);
        let recommendation = null;
        try {
          recommendation = await recommend(home, target, field, studyLevel);
        } catch (e) {
          recommendation = `AI recommendation unavailable: ${e.message}`;
        }
        return json({ home, target, field, studyLevel, recommendation });
      }

      case 'status':
        return json({ postgres: !!process.env.DATABASE_URL, projectId: process.env.OPENKBS_PROJECT_ID });

      default:
        return json({ error: 'Unknown action', available: ['options', 'compare', 'status'] }, 400);
    }
  } catch (error) {
    return json({ error: error.message }, 500);
  }
};
