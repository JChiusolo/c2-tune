const API_URL = '/api/tune';

// Section keys must match SECTIONS object in netlify/functions/tune.js
export const SECTION_KEYS = [
  'vehicle-assessment',
  'tuning-order',
  'fuel-system',
  've-table',
  'spark-timing',
  'afr-targets',
  'maf-sd',
  'boost-control',
  'rpm-cam-vvt',
  'transmission',
  'safety-knock',
  'data-logging',
];

export const SECTION_LABELS = {
  'vehicle-assessment': 'Vehicle Assessment',
  'tuning-order':       'Tuning Order of Operations',
  'fuel-system':        '1. Fuel System Calibration',
  've-table':           '2. Volumetric Efficiency (VE) Table',
  'spark-timing':       '3. Spark Timing',
  'afr-targets':        '4. Air/Fuel Ratio Targets',
  'maf-sd':             '5. MAF / Speed Density',
  'boost-control':      '6. Boost Control',
  'rpm-cam-vvt':        '7. RPM & Cam/VVT Parameters',
  'transmission':       '8. Transmission',
  'safety-knock':       '9. Safety & Knock Protection',
  'data-logging':       '10. Data Logging Checklist',
};

/**
 * Stream a single section from the server.
 *
 * @param {string} section  - one of SECTION_KEYS
 * @param {object} formData - { year, make, model, miles, mods, goal }
 * @param {(chunk: string) => void} onChunk
 * @returns {Promise<{ inputTokens: number, outputTokens: number }>}
 */
export async function streamSection(section, formData, onChunk) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...formData, section }),
  });

  if (!res.ok) {
    let msg = `Server error: ${res.status}`;
    try { const d = await res.json(); msg = d.error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let usage  = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const sentinelIdx = buffer.indexOf('\n\n__USAGE__');
    if (sentinelIdx !== -1) {
      const textPart = buffer.slice(0, sentinelIdx);
      if (textPart) onChunk(textPart);
      try {
        usage = JSON.parse(buffer.slice(sentinelIdx + '\n\n__USAGE__'.length));
      } catch { /* ignore */ }
      break;
    }

    onChunk(buffer);
    buffer = '';
  }

  return usage || { inputTokens: 0, outputTokens: 0 };
}
