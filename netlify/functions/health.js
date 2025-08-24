exports.handler = async () => {
  console.log("health invoked at", new Date().toISOString());
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ok: true,
      node: process.version,
      envHasFeishuId: Boolean(process.env.FEISHU_APP_ID),
      timestamp: new Date().toISOString()
    }),
  };
};
