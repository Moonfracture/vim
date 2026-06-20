-- University Comparison Assistant — schema
-- Normalized around the whiteboard criteria: tuition, scholarships, reviews,
-- degree type/duration, employment outcomes, location/rent, rankings.

CREATE TABLE IF NOT EXISTS universities (
  id                       SERIAL PRIMARY KEY,
  name                     TEXT NOT NULL,
  country                  TEXT NOT NULL,
  region                   TEXT,
  world_rank               INTEGER,
  overall_score            NUMERIC,
  teaching_score           NUMERIC,
  employer_reputation_score NUMERIC,
  UNIQUE (name, country)
);

CREATE TABLE IF NOT EXISTS programs (
  id             SERIAL PRIMARY KEY,
  university_id  INTEGER REFERENCES universities(id) ON DELETE CASCADE,
  country        TEXT NOT NULL,
  field          TEXT NOT NULL,
  study_level    TEXT NOT NULL,            -- Bachelor | Master | PhD
  degree_type    TEXT,
  duration_years NUMERIC,
  tuition_year   NUMERIC,                  -- normalized to USD/year
  currency       TEXT DEFAULT 'USD'
);

CREATE TABLE IF NOT EXISTS scholarships (
  id            SERIAL PRIMARY KEY,
  country       TEXT,
  university_id INTEGER REFERENCES universities(id) ON DELETE SET NULL,
  field         TEXT,
  name          TEXT NOT NULL,
  amount        NUMERIC,
  level         TEXT,
  url           TEXT
);

CREATE TABLE IF NOT EXISTS cost_of_living (
  id           SERIAL PRIMARY KEY,
  country      TEXT NOT NULL,
  city         TEXT,
  monthly_rent NUMERIC,                    -- avg monthly rent, USD
  cost_index   NUMERIC                     -- Numbeo cost-of-living index
);

CREATE TABLE IF NOT EXISTS professor_reviews (
  id          SERIAL PRIMARY KEY,
  university  TEXT NOT NULL,
  department  TEXT,
  avg_rating  NUMERIC,                     -- 0..5 (RateMyProfessor)
  num_reviews INTEGER
);

CREATE TABLE IF NOT EXISTS employment_outcomes (
  id              SERIAL PRIMARY KEY,
  country         TEXT NOT NULL,
  field           TEXT,
  study_level     TEXT,
  employment_rate NUMERIC,                 -- 0..100 (%)
  avg_salary      NUMERIC                  -- USD/year
);

CREATE INDEX IF NOT EXISTS idx_programs_lookup ON programs (country, field, study_level);
CREATE INDEX IF NOT EXISTS idx_universities_country ON universities (country);
CREATE INDEX IF NOT EXISTS idx_scholarships_country ON scholarships (country);
CREATE INDEX IF NOT EXISTS idx_col_country ON cost_of_living (country);
CREATE INDEX IF NOT EXISTS idx_employment_lookup ON employment_outcomes (country, field, study_level);
CREATE INDEX IF NOT EXISTS idx_reviews_university ON professor_reviews (university);
