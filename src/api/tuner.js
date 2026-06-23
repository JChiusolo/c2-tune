// In dev, Vite proxies /api → localhost:3001 (see vite.config.js).
// In production (Netlify), /.netlify/functions/tune handles the request directly.
const API_URL = import.meta.env.DEV
  ? '/api/tune'
  : '/.netlify/functions/tune';

/**
 * @param {{ year, make, model, miles, mods, goal }} formData
 * @returns {Promise<{ result: string, usage: { inputTokens: number, outputTokens: number } }>}
 */
export async function generateTuningPlan(formData) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Server error: ${res.status}`);
  }

  return data;
}
