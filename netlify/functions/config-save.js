const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');

const ENC_KEY = crypto.createHash('sha256')
  .update(process.env.CONFIG_ENC_KEY || 'dev-insecure-key-change-me')
  .digest(); // 32 bytes

function encrypt(obj) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const data = Buffer.from(JSON.stringify(obj));
  const enc = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();
  // 格式: iv(12) + tag(16) + enc
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

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
    const body = JSON.parse(event.body || '{}');
    const { appId, appSecret, tableId } = body || {};
    
    if (!appId || !appSecret || !tableId) {
      return { 
        statusCode: 400, 
        headers,
        body: JSON.stringify({ ok: false, error: 'missing_fields' }) 
      };
    }

    const store = getStore({ name: 'feishu-configs' }); // site 级命名空间
    const cipherText = encrypt({ appId, appSecret, tableId });
    await store.set(user.sub, cipherText); // 以用户唯一ID为 key

    console.log(`用户 ${user.sub} 配置已保存`);

    return { 
      statusCode: 200, 
      headers,
      body: JSON.stringify({ ok: true, message: '配置保存成功' }) 
    };
  } catch (error) {
    console.error('保存配置失败:', error);
    return { 
      statusCode: 500, 
      headers,
      body: JSON.stringify({ ok: false, error: 'server_error' }) 
    };
  }
};
