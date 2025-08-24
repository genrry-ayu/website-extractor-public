// netlify/functions/health.js
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // 检查环境变量状态（仅返回布尔值，不泄露敏感信息）
    const hasAppId = !!process.env.FEISHU_APP_ID;
    const hasAppSecret = !!process.env.FEISHU_APP_SECRET;
    const hasTableId = !!process.env.FEISHU_TABLE_ID;
    const hasEncKey = !!process.env.CONFIG_ENC_KEY;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        timestamp: new Date().toISOString(),
        config: {
          hasAppId,
          hasAppSecret,
          hasTableId,
          hasEncKey
        },
        message: 'Health check passed'
      })
    };
  } catch (error) {
    console.error('Health check failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'health_check_failed',
        message: 'Health check failed'
      })
    };
  }
};
