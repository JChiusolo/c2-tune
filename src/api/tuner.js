/**
 * Sends vehicle build data to the Express API, which calls Anthropic.
 * The API key lives only on the server — never in the browser bundle.
 *
 * @param {Object} vehicleData
 * @param {string} vehicleData.year
 * @param {string} vehicleData.make
 * @param {string} vehicleData.model
 * @param {string} vehicleData.miles
 * @param {string} vehicleData.mods
 * @param {string} vehicleData.goal
 * @returns {Promise<{ result: string, usage: { inputTokens: number, outputTokens: number } }>}
 */
export async function generateTuningPlan(vehicleData) {
  const response = await fetch('/api/tune', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vehicleData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Server returned ${response.status}`);
  }

  return data;
}
