import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

// Validate job ID to prevent injection / path traversal
function isValidJobId(id) {
  return typeof id === 'string' && /^[0-9]{13}-[a-f0-9]{8}$/.test(id);
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const { AWS_DYNAMODB_TABLE, AWS_REGION } = process.env;

  if (!AWS_DYNAMODB_TABLE || !AWS_REGION) {
    return {
      statusCode: 503,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'AWS pipeline is not configured on this deployment.' }),
    };
  }

  // Extract jobId from path: /api/csv-status/:jobId → redirected to function with path info
  // Netlify passes path segments via event.path: "/.netlify/functions/csv-status/1234-abcd1234"
  const pathParts = (event.path || '').split('/').filter(Boolean);
  const jobId = pathParts[pathParts.length - 1];

  if (!isValidJobId(jobId)) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid or missing job ID.' }),
    };
  }

  const ddbClient = new DynamoDBClient({ region: AWS_REGION });
  const ddb = DynamoDBDocumentClient.from(ddbClient, {
    marshallOptions: { removeUndefinedValues: true },
  });

  try {
    const result = await ddb.send(
      new GetCommand({
        TableName: AWS_DYNAMODB_TABLE,
        Key: { job_id: jobId },
      })
    );

    if (!result.Item) {
      // Job not yet written — pipeline is still initialising
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ jobId, status: 'processing' }),
      };
    }

    const { status, download_urls, error_message, created_at, completed_at } = result.Item;

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        jobId,
        status: status?.toLowerCase() || 'processing',
        downloadUrls:  download_urls  || null,
        errorMessage:  error_message  || null,
        createdAt:     created_at     || null,
        completedAt:   completed_at   || null,
      }),
    };
  } catch (err) {
    console.error('[csv-status error]', err.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to retrieve job status.' }),
    };
  }
};
