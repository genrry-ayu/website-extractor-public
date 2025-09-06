// netlify/functions/validate-feishu.js
// Simple server-side validator to avoid CORS when checking Feishu credentials
const axios = require('axios');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { appId, appSecret, appToken } = body;
    if (!appId || !appSecret) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok:false, error:'missing_fields', message:'appId/appSecret required' }) };
    }

    // 1) get tenant_access_token
    const tkResp = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: appId,
      app_secret: appSecret
    });
    const token = tkResp.data?.tenant_access_token;
    if (!token) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok:false, step:'token', error: tkResp.data?.msg || 'token_failed' }) };
    }

    let appCheck = null;
    if (appToken) {
      try {
        const appResp = await axios.get(`https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        appCheck = appResp.data;
      } catch (e) {
        appCheck = { code: -1, error: e.response?.data || e.message };
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok:true, step:'done', tokenOk: true, appCheck }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok:false, error:'internal_error', message:String(e) }) };
  }
};

