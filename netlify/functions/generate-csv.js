import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import crypto from 'crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const { AWS_STATE_MACHINE_ARN, AWS_REGION, NOTIFICATION_EMAIL } = process.env;

  if (!AWS_STATE_MACHINE_ARN || !AWS_REGION) {
    return {
      statusCode: 503,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'AWS pipeline is not configured on this deployment.' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { calibrationText, pcmFamily, vehicleInfo } = body;

  if (!calibrationText?.trim()) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'calibrationText is required.' }) };
  }

  if (calibrationText.length > 30000) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'calibrationText exceeds maximum length.' }) };
  }

  const timestamp = Date.now();
  const randomHex = crypto.randomBytes(4).toString('hex');
  const jobId = `${timestamp}-${randomHex}`;

  const executionInput = {
    job_id: jobId,
    table_type: 've_table',
    notification_email: NOTIFICATION_EMAIL,
    vehicle_info: vehicleInfo || {},
    extract_output: {
      pcm_family: pcmFamily || 'NGC4',
      calibration_text: calibrationText.trim(),
    },
  };

  const sfnClient = new SFNClient({ region: AWS_REGION });

  try {
    await sfnClient.send(
      new StartExecutionCommand({
        stateMachineArn: AWS_STATE_MACHINE_ARN,
        name: jobId,
        input: JSON.stringify(executionInput),
      })
    );

    console.log(`[generate-csv] Job submitted: ${jobId} | PCM: ${pcmFamily || 'NGC4'}`);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ jobId, status: 'submitted' }),
    };
  } catch (err) {
    console.error('[generate-csv error]', err.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to submit CSV generation job. Check AWS configuration.' }),
    };
  }
};
