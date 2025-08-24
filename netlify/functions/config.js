const axios = require('axios');

// 飞书API配置
const FEISHU_APP_ID = process.env.FEISHU_APP_ID;
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET;
const FEISHU_TABLE_ID = process.env.FEISHU_TABLE_ID;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    if (event.httpMethod === 'GET') {
      // 获取配置
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          config: {
            feishuAppId: FEISHU_APP_ID || '',
            feishuAppSecret: FEISHU_APP_SECRET || '',
            feishuTableId: FEISHU_TABLE_ID || ''
          }
        })
      };
    } else if (event.httpMethod === 'POST') {
      // 保存配置到服务器
      const { feishuAppId, feishuAppSecret, feishuTableId } = JSON.parse(event.body || '{}');
      
      console.log('收到配置更新请求:', { feishuAppId, feishuAppSecret: '***', feishuTableId });

      // 验证配置是否有效
      if (!feishuAppId || !feishuAppSecret || !feishuTableId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: '请填写完整的飞书配置信息'
          })
        };
      }

      // 测试飞书API连接
      try {
        const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
          app_id: feishuAppId,
          app_secret: feishuAppSecret
        });

        if (tokenResponse.data.tenant_access_token) {
          console.log('飞书API连接测试成功');
          
          // 这里可以添加将配置保存到数据库或文件的逻辑
          // 目前我们先返回成功，实际配置会在提取时使用
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: '配置验证成功！飞书API连接正常。',
              config: {
                feishuAppId,
                feishuAppSecret: '***',
                feishuTableId
              }
            })
          };
        } else {
          throw new Error('无法获取访问令牌');
        }
      } catch (apiError) {
        console.error('飞书API测试失败:', apiError.message);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: `飞书API连接失败: ${apiError.message}`
          })
        };
      }
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        error: '不支持的HTTP方法'
      })
    };

  } catch (error) {
    console.error('配置处理错误:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
