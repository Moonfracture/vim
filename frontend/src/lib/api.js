// Direct Lambda URL for the Node backend (Gemini chat). Falls back to /api proxy.
export const API_BASE = 'https://v5hzkazwukuwvwhpz6tzsqxe5u0qioxm.lambda-url.eu-central-1.on.aws/';

export async function callApi(action, payload = {}) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Заявката се провали (${res.status})`);
  return data;
}
