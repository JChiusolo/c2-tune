/**
 * AWS CSV Pipeline API utilities.
 * All calls proxy through the Express/Netlify backend — AWS credentials
 * and the State Machine ARN never reach the browser.
 */

const POLL_INTERVAL_MS = 5000;   // 5 seconds between status checks
const POLL_TIMEOUT_MS  = 300000; // 5 minute hard timeout

/**
 * Submit a calibration plan to the AWS Step Functions CSV pipeline.
 *
 * @param {Object} params
 * @param {string} params.calibrationText  - Full calibration plan markdown
 * @param {string} params.pcmFamily        - PCM family identifier e.g. "NGC4"
 * @param {Object} params.vehicleInfo      - { year, make, model, miles }
 * @returns {Promise<{ jobId: string, status: string }>}
 */
export async function submitCsvJob({ calibrationText, pcmFamily, vehicleInfo }) {
  const response = await fetch('/api/generate-csv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ calibrationText, pcmFamily, vehicleInfo }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Server returned ${response.status}`);
  }

  return data; // { jobId, status: 'submitted' }
}

/**
 * Poll /api/csv-status/:jobId until the job completes, fails, or times out.
 *
 * @param {string}   jobId       - Job ID returned by submitCsvJob
 * @param {Function} onProgress  - Called with { status, elapsedMs } each poll tick
 * @returns {Promise<{
 *   status: string,
 *   downloadUrls: Record<string, string> | null,
 *   errorMessage: string | null,
 *   completedAt: string | null
 * }>}
 */
export function pollCsvStatus(jobId, onProgress) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const tick = async () => {
      const elapsedMs = Date.now() - startTime;

      if (elapsedMs >= POLL_TIMEOUT_MS) {
        return reject(new Error('CSV generation timed out after 5 minutes. Check your email — the job may still complete.'));
      }

      try {
        const response = await fetch(`/api/csv-status/${encodeURIComponent(jobId)}`);
        const data = await response.json();

        if (!response.ok) {
          return reject(new Error(data.error || `Status check failed (${response.status})`));
        }

        onProgress?.({ status: data.status, elapsedMs });

        if (data.status === 'completed') {
          return resolve(data);
        }

        if (data.status === 'failed') {
          return reject(new Error(data.errorMessage || 'CSV generation failed in the pipeline.'));
        }

        // Still processing — schedule next poll
        setTimeout(tick, POLL_INTERVAL_MS);
      } catch (err) {
        // Network error — retry once before rejecting
        if (elapsedMs < 15000) {
          setTimeout(tick, POLL_INTERVAL_MS);
        } else {
          reject(err);
        }
      }
    };

    // Start polling immediately
    tick();
  });
}
