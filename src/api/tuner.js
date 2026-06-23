// In dev, Vite proxies /api → localhost:3001 (see vite.config.js).
// In production (Netlify), the function is mounted at /api/tune via config.path.
const API_URL = '/api/tune';

/**
 * Stream a tuning plan from the server, calling onChunk with each text fragment.
 *
 * @param {{ year, make, model, miles, mods, goal }} formData
 * @param {(chunk: string) => void} onChunk   - called with each text fragment as it arrives
 * @returns {Promise<{ inputTokens: number, outputTokens: number }>}  usage stats
 */
export async function streamTuningPlan(formData, onChunk) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });

  if (!res.ok) {
    // Non-streaming error — parse and throw
    let msg = `Server error: ${res.status}`;
    try {
      const data = await res.json();
      msg = data.error || msg;
    } catch {
      /* ignore parse failure */
    }
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let usage = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Check if the usage sentinel arrived
    const usageIdx = buffer.indexOf('\n\n__USAGE__');
    if (usageIdx !== -1) {
      // Everything before the sentinel is real text
      const textPart = buffer.slice(0, usageIdx);
      if (textPart) onChunk(textPart);

      // Parse the usage JSON after the sentinel
      try {
        usage = JSON.parse(buffer.slice(usageIdx + '\n\n__USAGE__'.length));
      } catch {
        /* ignore */
      }
      break;
    }

    // No sentinel yet — flush the buffer as text
    onChunk(buffer);
    buffer = '';
  }

  return usage || { inputTokens: 0, outputTokens: 0 };
}
