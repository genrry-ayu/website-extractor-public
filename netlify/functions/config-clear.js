// netlify/functions/config-clear.js
// Optional dependency: @netlify/blobs. If not available, the function will
// return an error indicating that per-user configuration storage is disabled.
let getStore;
const isBlobsEnvMissing = (e) => e && e.name === 'MissingBlobsEnvironmentError';
try {
  ({ getStore } = require('@netlify/blobs'));
} catch (_) {
  console.warn('@netlify/blobs not found; configuration storage disabled');
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
      body: JSON.stringify({ ok: false, error: 'auth_required' })
    };
  }
  if (!getStore) {
    return {
      statusCode: 501,
      headers,
      body: JSON.stringify({ ok: false, error: 'blobs_unavailable' })
    };
  }

  let store;
  try {
    store = getStore({ name: 'feishu-configs' });
  } catch (e) {
    if (isBlobsEnvMissing(e)) {
      return {
        statusCode: 501,
        headers,
        body: JSON.stringify({ ok: false, error: 'blobs_unavailable' })
      };
    }
    console.error('config-clear store init error', String(e));
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: 'internal_error' })
    };
  }

  try {
    await store.delete(user.sub);
    console.log(`用户 ${user.sub} 配置已清除`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, message: '配置已清除' })
    };
  } catch (e) {
    if (isBlobsEnvMissing(e)) {
      return {
        statusCode: 501,
        headers,
        body: JSON.stringify({ ok: false, error: 'blobs_unavailable' })
      };
    }
    console.error('config-clear error', String(e));
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: 'internal_error' })
    };
  }
};
