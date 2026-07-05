/**
 * Calls the /api/tune backend endpoint and returns the calibration plan.
 * The Anthropic API key lives only on the server — never in the browser bundle.
 *
 * @param {Object} vehicleData - { year, make, model, miles, mods, goal }
 * @returns {Promise<{ result: string, usage: { inputTokens, outputTokens } }>}
 */
export async function generateTuningPlan(vehicleData) {
  let response;

  try {
    response = await fetch('/api/tune', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vehicleData),
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

  // Validate that result is a non-empty string before returning
  if (!data?.result || typeof data.result !== 'string' || data.result.trim().length === 0) {
    throw new Error(
      'The server returned an empty or malformed response. ' +
      'Verify ANTHROPIC_API_KEY is set in Netlify → Site settings → Environment variables.'
    );
  }

  return {
    result: data.result,
    usage: data.usage || null,
  };
}
