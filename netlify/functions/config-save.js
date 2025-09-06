// netlify/functions/config-save.js
const crypto = require('crypto');

// Optional dependency: @netlify/blobs. If unavailable, storing configuration is
// disabled and the function will return an error.
let getStore;
const isBlobsEnvMissing = (e) => e && e.name === 'MissingBlobsEnvironmentError';
try {
  ({ getStore } = require('@netlify/blobs'));
} catch (_) {
  console.warn('@netlify/blobs not found; configuration storage disabled');
}

const ENC_KEY = crypto.createHash('sha256')
  .update(process.env.CONFIG_ENC_KEY || 'dev-insecure-key-change-me')
  .digest();

function encrypt(obj) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const data = Buffer.from(JSON.stringify(obj));
  const enc = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,content-type' } };
  }

  const user = context.clientContext?.user;
    if (!user) return { statusCode: 401, body: JSON.stringify({ ok:false, error:'auth_required' }) };
    if (!getStore) return { statusCode: 501, body: JSON.stringify({ ok:false, error:'blobs_unavailable' }) };

    let store;
    try {
      store = getStore({ name: 'feishu-configs' });
    } catch (e) {
      if (isBlobsEnvMissing(e)) {
        return { statusCode: 501, body: JSON.stringify({ ok:false, error:'blobs_unavailable' }) };
      }
      console.error('config-save store init error:', String(e));
      return { statusCode: 500, body: JSON.stringify({ ok:false, error:'internal_error' }) };
    }

    try {
      const body = JSON.parse(event.body || '{}');
      const appId     = body.appId     || body.feishuAppId;
      const appSecret = body.appSecret || body.feishuAppSecret;
      const tableId   = body.tableId   || body.feishuTableId;
      if (!appId || !appSecret || !tableId) {
        return { statusCode: 400, body: JSON.stringify({ ok:false, error:'missing_fields' }) };
      }

      await store.set(user.sub, encrypt({ appId, appSecret, tableId }));

      return { statusCode: 200, body: JSON.stringify({ ok:true }) };
    } catch (e) {
      if (isBlobsEnvMissing(e)) {
        return { statusCode: 501, body: JSON.stringify({ ok:false, error:'blobs_unavailable' }) };
      }
      console.error('config-save error:', String(e));
      return { statusCode: 500, body: JSON.stringify({ ok:false, error:'internal_error' }) };
    }
};
