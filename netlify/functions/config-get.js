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

const mask = (s) => s ? s.slice(0,3) + '***' + s.slice(-2) : '';

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const user = context.clientContext?.user;
  if (!user) {
    return { 
      statusCode: 401, 
      headers,
      body: JSON.stringify({ ok: false, error: 'unauthorized' }) 
    };
  }

  try {
    const store = getStore({ name: 'feishu-configs' });
    const cipherText = await store.get(user.sub);
    
    if (!cipherText) {
      return { 
        statusCode: 404, 
        headers,
        body: JSON.stringify({ ok: false, error: 'not_found' }) 
      };
    }
    
    const cfg = decrypt(cipherText);
    console.log(`用户 ${user.sub} 配置已获取`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        config: { 
          appId: cfg.appId, 
          appSecret: mask(cfg.appSecret), 
          tableId: cfg.tableId 
        }
      })
    };
  } catch (error) {
    console.error('获取配置失败:', error);
    return { 
      statusCode: 500, 
      headers,
      body: JSON.stringify({ ok: false, error: 'server_error' }) 
    };
  }
};
