/**
 * generateSection — calls /api/tune-section for a single calibration section.
 * Each call is scoped to one section, keeping responses fast and well inside
 * Netlify's function timeout (each section: ~5–10 s, max_tokens: 1 200).
 *
 * @param {Object} vehicleData  - { year, make, model, miles, mods, goal }
 * @param {string} sectionKey  - one of SECTION_BUTTONS[].key  e.g. 'fuel-system'
 */
export async function generateSection(vehicleData, sectionKey) {
  let response;
  try {
    response = await fetch('/api/tune-section', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...vehicleData, section: sectionKey }),
    });
  } catch (networkErr) {
    throw new Error('Network error — could not reach the server. Check your connection or Netlify function logs.');
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Server returned a non-JSON response (status ${response.status}). Check Netlify function logs.`);
  }

  if (!response.ok) {
    throw new Error(data?.error || `Server returned ${response.status}`);
  }

  if (!data?.result || typeof data.result !== 'string' || !data.result.trim()) {
    throw new Error(
      'The server returned an empty response. ' +
      'Verify ANTHROPIC_API_KEY is set in Netlify → Site settings → Environment variables.'
    );
  }

  return { result: data.result, usage: data.usage || null };
}
