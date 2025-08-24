// netlify/functions/extract.js  (CommonJS)
const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');

const ENC_KEY = crypto.createHash('sha256')
  .update(process.env.CONFIG_ENC_KEY || 'dev-insecure-key-change-me')
  .digest();

// 工具函数
const pick = (v) => (typeof v === 'string' && v.trim()) ? v.trim() : undefined;
const mask = (s) => s ? s.slice(0,3) + '***' + s.slice(-2) : '';

// 解密函数
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

// 读取用户配置
async function readUserConfig(context) {
  try {
    const user = context.clientContext?.user;
    if (!user) return null; // 未登录
    const store = getStore({ name: 'feishu-configs' });
    const ctext = await store.get(user.sub);
    return ctext ? decrypt(ctext) : null;
  } catch (_) {
    // Blobs 不可用或未启用时，静默降级到 env
    return null;
  }
}

// 提取网站信息
async function extractWebsiteInfo(url) {
  try {
    console.log('开始提取网站信息:', url);
    
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    // 提取公司名称
    let companyName = '';
    const titleSelectors = ['title', 'h1', '.company-name', '.brand', '.logo-text'];
    for (const selector of titleSelectors) {
      const element = $(selector).first();
      if (element.length) {
        companyName = element.text().trim();
        if (companyName) break;
      }
    }

    // 提取描述
    let description = '';
    const descSelectors = ['meta[name="description"]', 'meta[property="og:description"]', '.description', '.about-text'];
    for (const selector of descSelectors) {
      const element = $(selector).first();
      if (element.length) {
        description = element.attr('content') || element.text().trim();
        if (description) break;
      }
    }

    // 提取地址
    let address = '';
    const addressSelectors = ['.address', '.location', '[class*="address"]', '[class*="location"]'];
    for (const selector of addressSelectors) {
      const element = $(selector).first();
      if (element.length) {
        address = element.text().trim();
        if (address) break;
      }
    }

    // 提取邮箱
    let email = '';
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatches = response.data.match(emailRegex);
    if (emailMatches && emailMatches.length > 0) {
      email = emailMatches[0];
    }

    // 提取电话
    let phone = '';
    const phoneRegex = /(\+?[\d\s\-\(\)]{7,})/g;
    const phoneMatches = response.data.match(phoneRegex);
    if (phoneMatches && phoneMatches.length > 0) {
      phone = phoneMatches[0].replace(/\s+/g, ' ').trim();
    }

    // 提取社交媒体链接
    const socialLinks = {
      instagram: [],
      facebook: []
    };

    // 优先从header、footer、浮动元素中查找
    const prioritySelectors = ['header', 'footer', '.social', '.social-links', '.floating', '.fixed'];
    for (const selector of prioritySelectors) {
      const container = $(selector);
      if (container.length) {
        const links = container.find('a[href*="instagram.com"], a[href*="facebook.com"]');
        links.each((i, el) => {
          const href = $(el).attr('href');
          if (href) {
            if (href.includes('instagram.com')) {
              socialLinks.instagram.push(href);
            } else if (href.includes('facebook.com')) {
              socialLinks.facebook.push(href);
            }
          }
        });
      }
    }

    // 如果优先区域没找到，搜索整个页面
    if (socialLinks.instagram.length === 0 && socialLinks.facebook.length === 0) {
      const allLinks = $('a[href*="instagram.com"], a[href*="facebook.com"]');
      allLinks.each((i, el) => {
        const href = $(el).attr('href');
        if (href) {
          if (href.includes('instagram.com')) {
            socialLinks.instagram.push(href);
          } else if (href.includes('facebook.com')) {
            socialLinks.facebook.push(href);
          }
        }
      });
    }

    // 去重
    socialLinks.instagram = [...new Set(socialLinks.instagram)];
    socialLinks.facebook = [...new Set(socialLinks.facebook)];

    return {
      url: url,
      companyName: companyName,
      description: description,
      address: address,
      email: email,
      phone: phone,
      instagram: socialLinks.instagram,
      facebook: socialLinks.facebook
    };
  } catch (error) {
    console.error('提取网站信息失败:', error.message);
    throw error;
  }
}

// 写入飞书多维表格
async function writeToFeishu(data, cfg) {
  try {
    console.log('开始写入飞书多维表格...');
    console.log('使用配置:', {
      appId: cfg.appId,
      tableId: cfg.tableId,
      appSecret: mask(cfg.appSecret)
    });

    // 获取飞书访问令牌
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: cfg.appId,
      app_secret: cfg.appSecret
    });

    if (!tokenResponse.data.tenant_access_token) {
      throw new Error('无法获取飞书访问令牌');
    }

    const accessToken = tokenResponse.data.tenant_access_token;
    console.log('成功获取飞书访问令牌');

    // 使用配置中的表格ID
    const tableId = cfg.tableId;
    console.log('使用表格ID:', tableId);

    // 验证表格ID格式
    if (!tableId || !tableId.startsWith('tbl') || tableId.length < 10) {
      console.error('表格ID格式不正确:', tableId);
      throw new Error('表格ID格式不正确，请检查多维表格链接。表格ID应该以tbl开头');
    }

    // 写入多维表格
    const recordData = {
      fields: {
        '网站URL': data.url || '',
        '公司名称': data.companyName || '',
        '描述': data.description || '',
        '地址': data.address || '',
        '邮箱': data.email || '',
        '电话': data.phone || '',
        'Instagram': data.instagram?.join(', ') || '',
        'Facebook': data.facebook?.join(', ') || '',
        '提取时间': new Date().toISOString()
      }
    };

    console.log('准备写入数据:', recordData);
    console.log('目标表格ID:', tableId);

    // 尝试写入记录
    let writeResponse;
    try {
      writeResponse = await axios.post(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${cfg.appId}/tables/${tableId}/records`,
        recordData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('写入成功:', writeResponse.status, writeResponse.data);
    } catch (writeError) {
      console.error('写入失败:', writeError.response?.data || writeError.message);
      console.error('错误状态码:', writeError.response?.status);
      console.error('错误详情:', writeError.response?.data);
      throw writeError;
    }

    return writeResponse.status === 200;
  } catch (error) {
    console.error('飞书API错误:', error.response?.data || error.message);
    throw error;
  }
}

exports.handler = async (event, context) => {
  const requestId = Date.now().toString(36);
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { url } = body;

    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          ok: false, 
          error: "missing_url",
          message: "URL is required" 
        })
      };
    }

    // 1) 登录用户 → 读私有配置；2) 未登录/无私有配置 → 用 ENV；允许仅 tableId 从 body 覆盖
    const userCfg = await readUserConfig(context);
    const appId     = (userCfg && userCfg.appId)     || process.env.FEISHU_APP_ID;
    const appSecret = (userCfg && userCfg.appSecret) || process.env.FEISHU_APP_SECRET;
    const tableId   = (userCfg && userCfg.tableId)   || body?.feishuConfig?.tableId || process.env.FEISHU_TABLE_ID;

    console.log('配置状态:', {
      hasUserCfg: !!userCfg,
      hasAppId: !!appId,
      hasAppSecret: !!appSecret,
      hasTableId: !!tableId,
      tableId: tableId
    });

    if (!appId || !appSecret || !tableId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: "missing_config",
          message: "缺少必要的飞书配置",
          fields: { appId: !!appId, appSecret: !!appSecret, tableId: !!tableId }
        })
      };
    }

    console.log("extract start", { requestId, hasUserCfg: !!userCfg, tableId });

    // 提取网站信息
    const websiteInfo = await extractWebsiteInfo(url);

    // 尝试写入飞书多维表格
    let feishuSuccess = false;
    try {
      feishuSuccess = await writeToFeishu(websiteInfo, { appId, appSecret, tableId });
      console.log('飞书写入结果:', feishuSuccess);
    } catch (feishuError) {
      console.error('飞书写入失败:', feishuError.message);
    }

    console.log("extract end", { requestId, written: feishuSuccess ? 1 : 0 });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        requestId,
        url: url,
        results: websiteInfo,
        feishuSuccess: feishuSuccess
      })
    };

  } catch (e) {
    console.error("extract error", { requestId, err: String(e) });
    // 显式返回 JSON，避免前端收到 HTML 误判为 JSON
    return { 
      statusCode: 500, 
      headers,
      body: JSON.stringify({ 
        ok: false, 
        error: "internal_error", 
        message: "服务器内部错误",
        requestId 
      }) 
    };
  }
};
