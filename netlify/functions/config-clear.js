// netlify/functions/config-clear.js
const { getStore } = require('@netlify/blobs');

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
      body: JSON.stringify({ ok: false, error: 'auth_required' }) 
    };
  }

  try {
    const store = getStore({ name: 'feishu-configs' });
    await store.delete(user.sub);
    console.log(`用户 ${user.sub} 配置已清除`);
    
    return { 
      statusCode: 200, 
      headers,
      body: JSON.stringify({ ok: true, message: '配置已清除' }) 
    };
  } catch (e) {
    console.error('config-clear error', String(e));
    return { 
      statusCode: 500, 
      headers,
      body: JSON.stringify({ ok: false, error: 'internal_error' }) 
    };
  }
};
