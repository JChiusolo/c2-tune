const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

export const handler = async () => {
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      status: 'ok',
      version: '2.0.0',
      awsPipeline: process.env.AWS_STATE_MACHINE_ARN ? 'configured' : 'not configured',
      timestamp: new Date().toISOString(),
    }),
  };
};
