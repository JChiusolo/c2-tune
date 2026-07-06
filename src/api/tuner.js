/**
 * streamSection — calls the Edge Function at /api/tune-section and streams
 * the response token-by-token, calling onChunk for each text fragment.
 *
 * The Edge Function has no hard timeout and pipes Anthropic's SSE stream
 * directly to the browser, so text appears in real-time.
 *
 * @param {Object}   vehicleData  - { year, make, model, miles, mods, goal }
 * @param {string}   sectionKey   - one of SECTION_BUTTONS[].key e.g. 'fuel-system'
 * @param {Function} onChunk      - called with each text fragment as it arrives
 * @returns {Promise<{ inputTokens: number, outputTokens: number }>}
 */
export async function streamSection(vehicleData, sectionKey, onChunk) {
  let response;
  try {
    response = await fetch('/api/tune-section', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...vehicleData, section: sectionKey }),
    });
  } catch (networkErr) {
    throw new Error('Network error — could not reach the server. Check your connection.');
  }

  if (!response.ok) {
    let msg = `Server error: ${response.status}`;
    try { const d = await response.json(); msg = d.error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }

  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let   buffer  = '';
  let   usage   = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Check for error sentinel
    const errIdx = buffer.indexOf('\n\n__ERROR__');
    if (errIdx !== -1) {
      try {
        const parsed = JSON.parse(buffer.slice(errIdx + '\n\n__ERROR__'.length));
        throw new Error(parsed.error || 'Stream error from server');
      } catch (e) {
        throw new Error(e.message || 'Unknown stream error');
      }
    }

    // Check for usage sentinel — marks end of real text
    const usageIdx = buffer.indexOf('\n\n__USAGE__');
    if (usageIdx !== -1) {
      const textPart = buffer.slice(0, usageIdx);
      if (textPart) onChunk(textPart);
      try {
        usage = JSON.parse(buffer.slice(usageIdx + '\n\n__USAGE__'.length));
      } catch { /* ignore parse failure */ }
      break;
    }

    // No sentinel yet — flush buffer as live text
    if (buffer) {
      onChunk(buffer);
      buffer = '';
    }
  }

  return usage || { inputTokens: 0, outputTokens: 0 };
}
