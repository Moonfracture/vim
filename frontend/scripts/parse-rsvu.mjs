// Run-once extractor for the РСВУ 2025 source PDFs (scripts/rsvu/*.pdf).
// Heavy (pdfjs-dist) — NOT part of `npm run build`. Run manually: `npm run rsvu`.
// Writes committed JSON into scripts/data/, which build-data.mjs then consumes.
//
// The РСВУ tables have no text-flow structure; we reconstruct rows/columns from
// the page's vector grid: each table cell is a filled rectangle emitted as a
// `constructPath` op whose bbox gives exact cell bounds. Row bands come from the
// distinct horizontal grid lines; columns from fixed x-bands.

import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RSVU = path.join(__dirname, 'rsvu');
const OUT = path.join(__dirname, 'data');

// Join text items on one visual line into a string, inserting a space only when
// there is a real horizontal gap (pdfjs sometimes splits words mid-token).
function joinLine(items) {
  items.sort((a, b) => a.x - b.x);
  let out = '', prevEnd = null;
  for (const it of items) {
    if (prevEnd === null) out = it.s;
    else out += ((it.x - prevEnd) > 1.2 ? ' ' : '') + it.s;
    prevEnd = it.x + it.w;
  }
  return out;
}

// Collect text items in a y-band, group into sublines, join top→bottom.
function cellText(items) {
  if (!items.length) return '';
  items.sort((a, b) => b.y - a.y || a.x - b.x);
  let subs = [], cur = null;
  for (const it of items) {
    if (!cur || Math.abs(cur.y - it.y) > 3) { cur = { y: it.y, its: [it] }; subs.push(cur); }
    else cur.its.push(it);
  }
  return subs.map(s => joinLine(s.its)).join(' ').replace(/\s+/g, ' ').trim();
}

async function loadPage(doc, p) {
  const page = await doc.getPage(p);
  const ol = await page.getOperatorList();
  const names = {}; for (const k in OPS) names[OPS[k]] = k;
  const rects = [];
  for (let i = 0; i < ol.fnArray.length; i++) {
    if (names[ol.fnArray[i]] === 'constructPath') {
      const bb = ol.argsArray[i][2];
      if (bb && typeof bb[0] === 'number' && (bb[2] - bb[0]) > 50) rects.push(bb);
    }
  }
  const tc = await page.getTextContent();
  const items = tc.items.filter(i => i.str.trim())
    .map(i => ({ s: i.str, x: +i.transform[4], y: +i.transform[5], w: i.width }));
  return { rects, items };
}

// Derive ordered row bands [topY, botY] from cell-rect horizontal grid lines.
function rowBands(rects) {
  const ys = new Set();
  for (const bb of rects) { ys.add(+bb[1].toFixed(0)); ys.add(+bb[3].toFixed(0)); }
  const gl = [...ys].sort((a, b) => b - a);
  const lines = [];
  for (const y of gl) if (!lines.length || Math.abs(lines[lines.length - 1] - y) > 2) lines.push(y);
  const bands = [];
  for (let i = 0; i < lines.length - 1; i++) {
    const top = lines[i], bot = lines[i + 1];
    if (top - bot > 20) bands.push([top, bot]);
  }
  return bands;
}

function itemsInBand(items, top, bot) {
  return items.filter(it => it.y < top - 1 && it.y > bot - 3);
}

// ---------------- specialties (4 cols: field | uni | specialty | degree) -----
async function parseSpecialties() {
  const data = new Uint8Array(readFileSync(path.join(RSVU, 'specialties-2025.pdf')));
  const doc = await getDocument({ data }).promise;
  const colOf = (x) => x < 189 ? 0 : x < 398 ? 1 : x < 628 ? 2 : 3;
  const skipRe = /^Рейтингова система|^Професионално|^направление$|^Висше училище$|^Специалност$|^ОКС$/;
  const records = [];
  for (let p = 2; p <= doc.numPages; p++) {
    const { rects, items } = await loadPage(doc, p);
    for (const [top, bot] of rowBands(rects)) {
      const band = itemsInBand(items, top, bot);
      if (!band.length) continue;
      const cols = [[], [], [], []];
      for (const it of band) cols[colOf(it.x)].push(it);
      const field = cellText(cols[0]), uni = cellText(cols[1]), spec = cellText(cols[2]), oks = cellText(cols[3]);
      if (!uni || !spec || skipRe.test(uni)) continue;
      records.push({ field, uni, spec, oks });
    }
  }
  return records;
}

// ---------------- joint programs (best-effort, 9-col table) -------------------
// Columns (from layout inspection): uni | field | foreign partner | program type
//   | country | specialties | language | year | degree(s).
async function parseJoint() {
  const file = path.join(RSVU, 'joint-programs-2025.pdf');
  const data = new Uint8Array(readFileSync(file));
  const doc = await getDocument({ data }).promise;
  const records = [];
  // Derive column x-edges per page from the cell rects (layout varies slightly).
  for (let p = 2; p <= doc.numPages; p++) {
    const { rects, items } = await loadPage(doc, p);
    if (!rects.length) continue;
    const edges = [...new Set(rects.map(bb => +bb[0].toFixed(0)))].sort((a, b) => a - b);
    // cluster edges within 20px (drops spurious thin near-left rects that else split col 0)
    const cols = [];
    for (const e of edges) if (!cols.length || e - cols[cols.length - 1] > 20) cols.push(e);
    const colOf = (x) => { let i = 0; while (i < cols.length - 1 && x >= cols[i + 1]) i++; return i; };
    for (const [top, bot] of rowBands(rects)) {
      const band = itemsInBand(items, top, bot);
      if (!band.length) continue;
      const buckets = cols.map(() => []);
      for (const it of band) buckets[colOf(it.x)].push(it);
      const c = buckets.map(cellText);
      const uni = c[0] || '';
      if (!uni || /^Висше училище|^Активни съвместни|^РСВУ/.test(uni)) continue;
      records.push({
        uni,
        field: c[1] || '', partner: c[2] || '', programType: c[3] || '',
        country: c[4] || '', specialties: c[5] || '', language: c[6] || '',
        year: c[7] || '', degree: c[8] || '',
      });
    }
  }
  return records;
}

const specialties = await parseSpecialties();
writeFileSync(path.join(OUT, 'rsvu-specialties.json'), JSON.stringify(specialties));
const unis = [...new Set(specialties.map(r => r.uni))];
console.log(`specialties: ${specialties.length} records, ${unis.length} universities`);

const joint = await parseJoint();
writeFileSync(path.join(OUT, 'rsvu-joint.json'), JSON.stringify(joint));
console.log(`joint programs: ${joint.length} records`);
