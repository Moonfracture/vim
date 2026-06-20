// University Comparison Assistant — frontend
// API_BASE starts as the CloudFront proxy path; swapped to the direct Lambda URL after first deploy.
const API_BASE = '/api';

const $ = sel => document.querySelector(sel);
const els = {
  home: $('#home'), target: $('#target'), field: $('#field-sel'), level: $('#level'),
  compare: $('#compare'), status: $('#status'), results: $('#results'),
};

const fmtUSD = n => n == null ? '—' : '$' + Math.round(n).toLocaleString('en-US');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ICONS = {
  cost: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  rent: '<path d="M3 11l9-7 9 7M5 10v10h14V10"/>',
  scholarship: '<path d="M22 10L12 5 2 10l10 5 10-5zM6 12v5c3 2 9 2 12 0v-5"/>',
  teaching: '<path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/>',
  employment: '<path d="M3 7h18v13H3zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  rank: '<path d="M8 21V9M16 21V5M12 21V13"/>',
};
const icon = k => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg>`;

async function api(action, payload = {}) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function fill(sel, items, preferred) {
  sel.innerHTML = items.map(i => `<option value="${esc(i)}">${esc(i)}</option>`).join('');
  if (preferred && items.includes(preferred)) sel.value = preferred;
}

function showStatus(msg, isError = false) {
  els.status.hidden = false;
  els.status.className = 'status' + (isError ? ' error' : '');
  els.status.innerHTML = msg;
}

async function init() {
  try {
    showStatus('<span class="spinner"></span>Loading available countries and fields…');
    const opts = await api('options');
    if (!opts.countries.length) {
      showStatus('No data loaded yet. Seed the database (or import the CSVs) and refresh.', true);
      return;
    }
    fill(els.home, opts.countries, 'Bulgaria');
    fill(els.target, opts.countries, 'Germany');
    fill(els.field, opts.fields, 'Computer Science');
    fill(els.level, opts.levels, 'Master');
    els.status.hidden = true;
  } catch (e) {
    showStatus('Could not reach the API: ' + esc(e.message) + '<br><small>Deploy the function with <code>openkbs fn deploy api</code>.</small>', true);
  }
}

// metric row with a home-vs-target delta where "better" depends on direction
function metricRow(iconKey, label, value, sub) {
  return `<div class="metric">
    <span class="label">${icon(iconKey)}${esc(label)}</span>
    <span class="val">${value}${sub ? `<small>${esc(sub)}</small>` : ''}</span>
  </div>`;
}

function column(m, role) {
  const unis = m.universities.length ? m.universities.map(u => `
    <div class="uni-row">
      <span>${esc(u.name)}</span>
      <span class="rank">${u.worldRank ? '#' + u.worldRank : '—'}</span>
      <span class="pill">${u.reviewRating ? u.reviewRating + '★' : (u.teachingScore ?? '—')}</span>
      <span class="pill">${fmtUSD(u.tuition)}/yr</span>
    </div>`).join('') : '<p class="pill">No matching programs in sample data.</p>';

  const schol = m.scholarships.length ? m.scholarships.slice(0, 6).map(s =>
    `<span class="chip">${esc(s.name)} ${s.amount ? `<b>${fmtUSD(s.amount)}</b>` : ''}</span>`).join('') :
    '<span class="chip">None found</span>';

  return `<div class="col">
    <div class="col-head">
      <h3>${esc(m.country)}</h3>
      <span class="badge">${role}</span>
    </div>
    <div class="metric-card">
      ${metricRow('cost', `Total cost · ${m.durationYears} yr`, `<strong>${fmtUSD(m.totalCost)}</strong>`)}
      ${metricRow('cost', 'Tuition / year', fmtUSD(m.avgTuitionYear))}
      ${metricRow('rent', 'Rent / month', fmtUSD(m.monthlyRent))}
      ${metricRow('scholarship', 'Scholarships', `${m.scholarshipCount}`, m.scholarshipTop ? `up to ${fmtUSD(m.scholarshipTop)}` : '')}
      ${metricRow('teaching', 'Teaching score', m.teachingScore != null ? `${m.teachingScore}/100` : '—', m.reviewRating != null ? `${m.reviewRating}/5 student rating` : '')}
      ${metricRow('employment', 'Employment rate', m.employmentRate ? `${m.employmentRate}%` : '—', m.avgSalary ? `${fmtUSD(m.avgSalary)} avg salary` : '')}
      ${metricRow('rank', 'Best world rank', m.bestRank ? '#' + m.bestRank : '—')}
      <div class="scholarships">${schol}</div>
    </div>
    <div class="unis metric-card" style="margin-top:1rem">
      <h4>Top universities · ${esc(m.country)}</h4>
      ${unis}
    </div>
  </div>`;
}

function verdictTag(rec) {
  const m = /verdict:\s*(recommended|worth considering|not worth it)/i.exec(rec || '');
  if (!m) return { html: esc(rec || 'No recommendation available.') };
  const verdict = m[1].toLowerCase();
  const cls = verdict === 'recommended' ? 'rec-yes' : verdict === 'not worth it' ? 'rec-no' : 'rec-maybe';
  const body = rec.slice(0, m.index).trim();
  return { html: `${esc(body)}<span class="tag ${cls}">Verdict: ${esc(m[1])}</span>` };
}

function render(data) {
  const { home, target, field, studyLevel, recommendation } = data;
  const v = verdictTag(recommendation);
  els.results.hidden = false;
  els.results.innerHTML = `
    <div class="verdict reveal">
      <div class="route">${esc(home.country)} → ${esc(target.country)} · ${esc(field)} · ${esc(studyLevel)}</div>
      <h2>The verdict</h2>
      <div class="rec">${v.html}</div>
    </div>
    <div class="compare-grid reveal">
      ${column(home, 'Home')}
      ${column(target, 'Target')}
    </div>`;
  els.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function runCompare() {
  const homeCountry = els.home.value, targetCountry = els.target.value;
  const field = els.field.value, studyLevel = els.level.value;
  if (homeCountry === targetCountry) {
    showStatus('Pick two different countries to compare.', true);
    return;
  }
  els.compare.disabled = true;
  showStatus('<span class="spinner"></span>Crunching tuition, rent, rankings and writing a recommendation…');
  els.results.hidden = true;
  try {
    const data = await api('compare', { homeCountry, targetCountry, field, studyLevel });
    els.status.hidden = true;
    render(data);
  } catch (e) {
    showStatus('Comparison failed: ' + esc(e.message), true);
  } finally {
    els.compare.disabled = false;
  }
}

els.compare.addEventListener('click', runCompare);
init();
