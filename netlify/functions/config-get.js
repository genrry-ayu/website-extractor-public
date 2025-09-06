// netlify/functions/config-get.js
const crypto = require('crypto');

// Optional dependency: @netlify/blobs. If unavailable, config storage is
// disabled and functions relying on it will return an error.
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

function decrypt(b64) {
  const raw = Buffer.from(b64, 'base64');
  const iv  = raw.subarray(0,12);
  const tag = raw.subarray(12,28);
  const enc = raw.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return JSON.parse(dec.toString());
}
const mask = s => (s ? s.slice(0,3)+'***'+s.slice(-2) : '');

exports.handler = async (event, context) => {
  // 预检（如跨源）
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,content-type' } };
  }

  const user = context.clientContext?.user;
  if (!user) {
    return { statusCode: 401, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ok:false, error:'auth_required' }) };
  }

  if (!getStore) {
    return { statusCode: 501, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ok:false, error:'blobs_unavailable' }) };
  }

  let store;
  try {
    store = getStore({ name: 'feishu-configs' });
  } catch (e) {
    if (isBlobsEnvMissing(e)) {
      return { statusCode: 501, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ok:false, error:'blobs_unavailable' }) };
    }
    console.error('config-get store init error:', String(e));
    return { statusCode: 500, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ok:false, error:'internal_error' }) };
  }

  try {
    const ctext = await store.get(user.sub);
    if (!ctext) {
      return { statusCode: 404, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ok:false, error:'not_found' }) };
    }

    let cfg;
    try {
      cfg = decrypt(ctext);
    } catch (e) {
      console.error('config-get decrypt failed:', String(e));
      // 密钥不匹配 / 数据损坏
      return { statusCode: 409, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ok:false, error:'enc_key_mismatch' }) };
    }

    return {
      statusCode: 200,
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ok:true, config: { appId: cfg.appId, appSecret: mask(cfg.appSecret), tableId: cfg.tableId } })
    };
  } catch (e) {
    if (isBlobsEnvMissing(e)) {
      return { statusCode: 501, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ok:false, error:'blobs_unavailable' }) };
    }
    console.error('config-get internal error:', String(e));
    return { statusCode: 500, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ok:false, error:'internal_error' }) };
  }
};
