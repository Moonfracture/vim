// Direct Lambda URL for the Node backend. All actions go through one POST endpoint.
export const API_BASE = 'https://v5hzkazwukuwvwhpz6tzsqxe5u0qioxm.lambda-url.eu-central-1.on.aws/';

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
