// netlify/functions/config-get.js
const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');

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

  try {
    const store = getStore({ name: 'feishu-configs' });
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
      body: JSON.stringify({ ok:true, config: { appId: cfg.appId, appSecret: mask(cfg.appSecret), tableId: cfg.tableId, bitableAppToken: cfg.bitableAppToken } })
    };
  } catch (e) {
    console.error('config-get internal error:', String(e));
    return { statusCode: 500, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ok:false, error:'internal_error' }) };
  }
};
