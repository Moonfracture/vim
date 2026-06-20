// Display-only currency conversion. Scoring stays in USD (see scoring.js); only
// what the user reads is localized, keyed on each card's `iso2`.
import currencies from '../data/currencies.json';

const USD = { code: 'USD', symbol: '$', suffix: null, rate: 1, step: 50 };

const entryFor = (iso2) => (iso2 && currencies[iso2]) || USD;
const group = (n) => Math.round(n).toLocaleString('en-US');
const roundTo = (v, step) => Math.round(v / step) * step;

function one(amount, e) {
  const s = group(amount);
  if (e.symbol) return `${e.symbol}${s}`;
  if (e.suffix) return `${s} ${e.suffix}`;
  return `${e.code} ${s}`;
}

function range(lo, hi, e) {
  const a = group(lo), b = group(hi);
  if (e.symbol) return `${e.symbol}${a}–${b}`;
  if (e.suffix) return `${a}–${b} ${e.suffix}`;
  return `${e.code} ${a}–${b}`;
}

// single amount in the country's currency; monthly => '~' prefix + finer rounding
export function fmtMoney(usd, iso2, { monthly = false } = {}) {
  if (usd == null) return '—';
  const e = entryFor(iso2);
  const step = monthly ? (e.step >= 1000 ? 100 : 10) : e.step;
  let out = one(roundTo(usd * e.rate, step), e);
  if (e.secondary) out += ` (${one(roundTo(usd * e.secondary.rate, 10), e.secondary)})`;
  return monthly ? `~${out}` : out;
}

// "min–max <currency>" (+ secondary in parens for Bulgaria)
export function fmtRange(usdMin, usdMax, iso2) {
  if (usdMin == null && usdMax == null) return '—';
  if (usdMin == null || usdMax == null) return fmtMoney(usdMin ?? usdMax, iso2);
  const e = entryFor(iso2);
  let out = range(roundTo(usdMin * e.rate, e.step), roundTo(usdMax * e.rate, e.step), e);
  if (e.secondary) {
    out += ` (${range(roundTo(usdMin * e.secondary.rate, 10), roundTo(usdMax * e.secondary.rate, 10), e.secondary)})`;
  }
  return out;
}

export const currencyCode = (iso2) => entryFor(iso2).code;
