// netlify/functions/feishu-ping.js
// Write a small test record to Feishu Bitable after validating credentials.
const axios = require('axios');

async function getTenantToken(appId, appSecret) {
  const resp = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    app_id: appId,
    app_secret: appSecret
  });
  const token = resp.data?.tenant_access_token;
  if (!token) {
    throw new Error(resp.data?.msg || 'token_failed');
  }
  return token;
}

async function resolveAppToken(token, accessToken) {
  if (!token) return undefined;
  // If it's a wiki node token, resolve to bitable app token
  try {
    const nodeResp = await axios.get('https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      params: { token, obj_type: 'wiki' }
    });
    if (nodeResp.data?.code === 0 && nodeResp.data?.data?.node?.obj_type === 'bitable') {
      return nodeResp.data.data.node.obj_token;
    }
  } catch (_) {}
  return token; // assume already an app token
}

async function getFieldName(accessToken, appToken, tableId) {
  const candidates = ['来自 gpt 的输出', '原始数据', 'raw'];
  try {
    const resp = await axios.get(`https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (resp.data?.code === 0) {
      const names = (resp.data.data?.items || []).map(i => i.field_name);
      for (const c of candidates) {
        if (names.includes(c)) return c;
      }
    }
  } catch (_) {}
  return candidates[0];
}

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
    const { appId, appSecret, tableId, appToken, message = '成功' } = body;
    if (!appId || !appSecret || !tableId) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok:false, error:'missing_fields' }) };
    }

    const tenantToken = await getTenantToken(appId, appSecret);
    const finalAppToken = await resolveAppToken(appToken || appId, tenantToken);

    const fieldName = await getFieldName(tenantToken, finalAppToken, tableId);

    const recordData = { fields: { [fieldName]: String(message) } };
    const writeResp = await axios.post(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${finalAppToken}/tables/${tableId}/records`,
      recordData,
      { headers: { 'Authorization': `Bearer ${tenantToken}`, 'Content-Type': 'application/json' } }
    );
    const result = writeResp.data || {};
    if (result.code !== 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok:false, error:'write_failed', detail: result }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ ok:true, recordId: result.data?.record?.record_id || result.data?.record_id, fieldName }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok:false, error:'internal_error', message:String(e) }) };
  }
};

