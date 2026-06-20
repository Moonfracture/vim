// API endpoint for the Node backend. All actions go through one POST endpoint.
// In production we call the same-origin CloudFront /api route — this avoids
// cross-origin requests, which some privacy/ad blockers reject (the direct
// *.on.aws Lambda URL is treated as a third-party domain → "NetworkError").
// Locally (vite dev) there is no /api proxy, so hit the Lambda URL directly.
const LAMBDA_URL = 'https://v5hzkazwukuwvwhpz6tzsqxe5u0qioxm.lambda-url.eu-central-1.on.aws/';
const isLocalHost =
  typeof window !== 'undefined' && /^(localhost|127\.|0\.0\.0\.0)/.test(window.location.hostname);
export const API_BASE = isLocalHost ? LAMBDA_URL : '/api';

const TOKEN_KEY = 'unikompas.token';
export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
};
export const setToken = (t) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
};

export async function callApi(action, payload = {}) {
  const token = getToken();
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Заявката се провали (${res.status})`);
  return data;
}
