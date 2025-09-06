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
    const store = getStore('feishu-configs');
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
      bitableAppToken: cfg.bitableAppToken ? mask(cfg.bitableAppToken) : undefined,
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

    // 查询表格字段，做动态字段映射，避免因列名不一致写入失败
    let fieldNames = [];
    try {
      const appTokenPreview = cfg.bitableAppToken || cfg.appId;
      const fieldsResp = await axios.get(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${appTokenPreview}/tables/${tableId}/fields`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      if (fieldsResp.data?.code === 0) {
        fieldNames = (fieldsResp.data.data?.items || []).map(it => it.field_name);
      }
    } catch (e) {
      console.warn('获取表格字段失败（不影响写入，将尝试通用列名）:', e.response?.data || e.message);
    }

    const have = new Set(fieldNames);
    const pickName = (...cands) => cands.find(n => have.has(n));

    const mapUrl        = pickName('网站URL','官网地址','网站地址','链接','URL');
    const mapName       = pickName('公司名称','公司名','品牌','名称','店铺名称');
    const mapDesc       = pickName('描述','简介','公司简介');
    const mapAddr       = pickName('地址','公司地址','联系地址','所在地');
    const mapEmail      = pickName('邮箱','Email','电子邮箱');
    const mapPhone      = pickName('电话','Phone','联系电话');
    const mapInstagram  = pickName('Instagram','ins');
    const mapFacebook   = pickName('Facebook','facebook');
    const mapTime       = pickName('提取时间','时间','created_at');
    const mapRaw        = pickName('来自 gpt 的输出','原始数据','raw');

    const fieldsToWrite = {};
    if (mapUrl)       fieldsToWrite[mapUrl] = data.url || '';
    if (mapName)      fieldsToWrite[mapName] = data.companyName || '';
    if (mapDesc)      fieldsToWrite[mapDesc] = data.description || '';
    if (mapAddr)      fieldsToWrite[mapAddr] = data.address || '';
    if (mapEmail)     fieldsToWrite[mapEmail] = data.email || '';
    if (mapPhone)     fieldsToWrite[mapPhone] = data.phone || '';
    if (mapInstagram) fieldsToWrite[mapInstagram] = data.instagram?.join(', ') || '';
    if (mapFacebook)  fieldsToWrite[mapFacebook] = data.facebook?.join(', ') || '';
    if (mapTime)      fieldsToWrite[mapTime] = new Date().toISOString();
    if (mapRaw)       fieldsToWrite[mapRaw] = JSON.stringify({
      url: data.url,
      companyName: data.companyName,
      description: data.description,
      address: data.address,
      email: data.email,
      phone: data.phone,
      instagram: data.instagram,
      facebook: data.facebook,
      extractedAt: new Date().toISOString()
    });

    // 如果没有获取到字段列表或完全匹配不到，则回退到默认字段集（可能失败，但至少尝试）
    if (Object.keys(fieldsToWrite).length === 0) {
      fieldsToWrite['网站URL']   = data.url || '';
      fieldsToWrite['公司名称']   = data.companyName || '';
      fieldsToWrite['描述']     = data.description || '';
      fieldsToWrite['地址']     = data.address || '';
      fieldsToWrite['邮箱']     = data.email || '';
      fieldsToWrite['电话']     = data.phone || '';
      fieldsToWrite['Instagram'] = data.instagram?.join(', ') || '';
      fieldsToWrite['Facebook']  = data.facebook?.join(', ') || '';
      fieldsToWrite['提取时间']   = new Date().toISOString();
    }

    const recordData = { fields: fieldsToWrite };

    console.log('目标表格字段:', fieldNames);
    console.log('实际写入字段映射:', Object.keys(fieldsToWrite));

    // 解析 appToken：如果传入的是 Wiki 节点 token，则解析为真实的多维表格 App Token
    async function resolveAppToken(maybeToken) {
      if (!maybeToken) return undefined;
      try {
        const nodeResp = await axios.get('https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node', {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          params: { token: maybeToken, obj_type: 'wiki' }
        });
        if (nodeResp.data?.code === 0 && nodeResp.data?.data?.node?.obj_type === 'bitable') {
          const realToken = nodeResp.data.data.node.obj_token;
          console.log('解析到真实Bitable App Token:', realToken);
          return realToken;
        }
      } catch (_) {}
      return maybeToken;
    }

    // 尝试写入记录
    let writeResponse;
    try {
      const appTokenRaw = cfg.bitableAppToken || cfg.appId; // 兼容旧配置
      const appToken = await resolveAppToken(appTokenRaw);
      writeResponse = await axios.post(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
        recordData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const result = writeResponse?.data || {};
      // Feishu API 返回 200 即可能失败，需检查 result.code === 0
      if (result.code !== 0) {
        const msg = result.msg || 'unknown_error';
        console.error('飞书写入返回失败:', msg, result);
        throw new Error(`feishu_write_failed: ${msg}`);
      }
      console.log('写入成功，record_id:', result.data?.record?.record_id || result.data?.record_id);
    } catch (writeError) {
      console.error('写入失败:', writeError.response?.data || writeError.message);
      console.error('错误状态码:', writeError.response?.status);
      console.error('错误详情:', writeError.response?.data);
      throw writeError;
    }

    // 仅在 result.code === 0 时视为成功
    return true;
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
    // 安全解析 body，且允许 GET 通过 query 传参
    let body = {};
    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT' || event.httpMethod === 'PATCH') {
      try {
        body = event.body ? JSON.parse(event.body) : {};
      } catch (parseErr) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ ok: false, error: 'invalid_body', message: 'Request body must be valid JSON' })
        };
      }
    }
    const qsUrl = event.queryStringParameters && (event.queryStringParameters.url || event.queryStringParameters.u);
    const { url } = body.url ? body : { url: qsUrl };

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

    // 校验 URL 格式，尽早返回明确错误而不是 500
    try {
      // 仅用于校验格式，不覆盖原始字符串
      // eslint-disable-next-line no-new
      new URL(url);
    } catch (_) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'invalid_url',
          message: 'Invalid URL format'
        })
      };
    }

    // 配置优先级：请求体(feishuConfig) > 用户私有配置 > 环境变量
    const userCfg = await readUserConfig(context);
    const bodyCfg = body?.feishuConfig || {};
    const appId            = bodyCfg.appId            || body.appId            || (userCfg && userCfg.appId)            || process.env.FEISHU_APP_ID;
    const appSecret        = bodyCfg.appSecret        || body.appSecret        || (userCfg && userCfg.appSecret)        || process.env.FEISHU_APP_SECRET;
    const tableId          = bodyCfg.tableId          || body.tableId          || (userCfg && userCfg.tableId)          || process.env.FEISHU_TABLE_ID;
    const bitableAppToken  = bodyCfg.bitableAppToken  || body.bitableAppToken  || (userCfg && userCfg.bitableAppToken)  || process.env.FEISHU_BITABLE_APP_TOKEN;

    console.log('配置状态:', {
      hasBodyCfg: !!bodyCfg && (!!bodyCfg.appId || !!bodyCfg.tableId || !!bodyCfg.bitableAppToken),
      hasUserCfg: !!userCfg,
      hasAppId: !!appId,
      hasAppSecret: !!appSecret,
      hasTableId: !!tableId,
      hasBitableAppToken: !!bitableAppToken,
      tableId: tableId
    });

    const canWriteFeishu = !!(appId && appSecret && tableId);
    if (!canWriteFeishu) {
      console.warn('缺少飞书配置，跳过写入，仅返回提取结果');
    }

    console.log("extract start", { requestId, hasUserCfg: !!userCfg, tableId });

    // 提取网站信息（单独捕获以避免返回泛化的 500）
    let websiteInfo;
    try {
      websiteInfo = await extractWebsiteInfo(url);
    } catch (extractErr) {
      console.error('信息提取错误:', extractErr);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'fetch_failed',
          message: extractErr?.message || 'Failed to fetch target URL'
        })
      };
    }

    // 尝试写入飞书多维表格
    let feishuSuccess = false;
    let feishuStatus = 'skipped';
    let feishuMessage = '未配置飞书，已跳过写入';
    if (canWriteFeishu) {
      try {
        feishuSuccess = await writeToFeishu(websiteInfo, { appId, appSecret, tableId, bitableAppToken });
        feishuStatus = feishuSuccess ? 'success' : 'failed';
        feishuMessage = feishuSuccess ? '写入成功' : '写入失败';
        console.log('飞书写入结果:', feishuSuccess);
      } catch (feishuError) {
        feishuStatus = 'failed';
        feishuMessage = feishuError?.message || '写入失败';
        console.error('飞书写入失败:', feishuError.message);
      }
    }

    const configStatus = {
      hasAppId: !!appId,
      hasAppSecret: !!appSecret,
      hasTableId: !!tableId,
      hasBitableAppToken: !!bitableAppToken
    };

    console.log("extract end", { requestId, written: feishuSuccess ? 1 : 0, configStatus });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        requestId,
        url: url,
        results: websiteInfo,
        feishuSuccess: feishuSuccess,
        feishuStatus,
        feishuMessage,
        configStatus
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
