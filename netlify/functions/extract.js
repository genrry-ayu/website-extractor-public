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

// 电话号码格式化函数
function formatPhoneNumber(phone, url) {
  if (!phone) return '';
  
  // 清理电话号码
  let cleanPhone = phone.replace(/[^\d+]/g, '');
  
  // 根据URL域名判断国家
  let country = '';
  if (url.includes('.ie')) country = 'IE';
  else if (url.includes('.us') || url.includes('.com')) country = 'US';
  else if (url.includes('.uk') || url.includes('.co.uk')) country = 'UK';
  else if (url.includes('.au') || url.includes('.com.au')) country = 'AU';
  else if (url.includes('.ca')) country = 'CA';
  
  // 根据国家格式化
  switch (country) {
    case 'IE': // 爱尔兰
      if (cleanPhone.startsWith('353')) {
        return '+353 ' + cleanPhone.substring(3).replace(/(\d{2,3})(\d{3,4})(\d{3,4})/, '$1 $2 $3');
      } else if (cleanPhone.startsWith('0')) {
        return '+353 ' + cleanPhone.substring(1).replace(/(\d{2,3})(\d{3,4})(\d{3,4})/, '$1 $2 $3');
      } else if (cleanPhone.length >= 9) {
        return '+353 ' + cleanPhone.replace(/(\d{2,3})(\d{3,4})(\d{3,4})/, '$1 $2 $3');
      }
      break;
      
    case 'US':
    case 'CA': // 美国/加拿大
      if (cleanPhone.startsWith('1') && cleanPhone.length === 11) {
        return '+1 ' + cleanPhone.substring(1).replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
      } else if (cleanPhone.length === 10) {
        return '+1 ' + cleanPhone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
      }
      break;
      
    case 'UK': // 英国
      if (cleanPhone.startsWith('44')) {
        return '+44 ' + cleanPhone.substring(2).replace(/(\d{2,4})(\d{3,4})(\d{3,4})/, '$1 $2 $3');
      } else if (cleanPhone.startsWith('0')) {
        return '+44 ' + cleanPhone.substring(1).replace(/(\d{2,4})(\d{3,4})(\d{3,4})/, '$1 $2 $3');
      }
      break;
      
    case 'AU': // 澳大利亚
      if (cleanPhone.startsWith('61')) {
        return '+61 ' + cleanPhone.substring(2).replace(/(\d{1})(\d{4})(\d{4})/, '$1 $2 $3');
      } else if (cleanPhone.startsWith('0')) {
        return '+61 ' + cleanPhone.substring(1).replace(/(\d{1})(\d{4})(\d{4})/, '$1 $2 $3');
      }
      break;
  }
  
  // 通用格式化
  if (cleanPhone.startsWith('+')) {
    return cleanPhone.replace(/(\+\d{1,3})(\d{2,4})(\d{2,4})(\d{2,4})/, '$1 $2 $3 $4');
  } else if (cleanPhone.length >= 7) {
    return '+' + cleanPhone.replace(/(\d{1,3})(\d{2,4})(\d{2,4})(\d{2,4})/, '$1 $2 $3 $4');
  }
  
  return phone; // 返回原始格式
}

// 地址格式化函数
function formatAddress(address, url) {
  if (!address) return '';
  
  let country = '';
  if (url.includes('.ie')) country = 'Ireland';
  else if (url.includes('.us') || url.includes('.com')) country = 'United States';
  else if (url.includes('.uk') || url.includes('.co.uk')) country = 'United Kingdom';
  else if (url.includes('.au') || url.includes('.com.au')) country = 'Australia';
  else if (url.includes('.ca')) country = 'Canada';
  
  // 清理地址
  let cleanAddress = address
    .replace(/\s+/g, ' ')
    .replace(/[,\s]+$/, '') // 移除末尾的逗号和空格
    .trim();
  
  // 如果地址中没有国家信息，且通过域名确定了国家，则添加
  if (country && !cleanAddress.toLowerCase().includes(country.toLowerCase())) {
    cleanAddress += ', ' + country;
  }
  
  return cleanAddress;
}

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

// 提取网站信息 - 优化版本
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
    
    // 提取公司名称 - 优化选择器和清理逻辑
    let companyName = '';
    const titleSelectors = [
      'meta[property="og:title"]',
      'meta[name="twitter:title"]', 
      'title',
      'h1',
      '.company-name',
      '.brand',
      '.logo-text',
      '.site-title',
      '.business-name',
      '[class*="brand"]',
      '[class*="company"]'
    ];
    
    for (const selector of titleSelectors) {
      const element = $(selector).first();
      if (element.length) {
        let text = element.attr('content') || element.text().trim();
        // 清理标题中的常见后缀
        text = text.replace(/\s*[-|]\s*(Home|Official|Website|Store|Shop|Jewellery|Jewelry).*$/i, '');
        text = text.replace(/\s*[-|]\s*.*$/i, ''); // 移除破折号后的所有内容
        if (text && text.length > 2 && text.length < 100) {
          companyName = text;
          break;
        }
      }
    }

    // 提取描述 - 优化选择器和内容清理
    let description = '';
    const descSelectors = [
      'meta[name="description"]',
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
      '.description',
      '.about-text',
      '.intro',
      '.summary',
      '[class*="about"]',
      '[class*="intro"]'
    ];
    
    for (const selector of descSelectors) {
      const element = $(selector).first();
      if (element.length) {
        let text = element.attr('content') || element.text().trim();
        // 清理描述内容
        text = text.replace(/\s+/g, ' ').trim();
        if (text && text.length > 10 && text.length < 500) {
          description = text;
          break;
        }
      }
    }

    // 提取地址 - 多国格式支持
    let address = '';
    const addressSelectors = [
      '.address',
      '.location',
      '.contact-address',
      '.business-address',
      '.store-address',
      '.office-address',
      '[class*="address"]',
      '[class*="location"]',
      '[class*="contact"]',
      '[class*="store"]',
      '[class*="office"]'
    ];
    
    for (const selector of addressSelectors) {
      const element = $(selector).first();
      if (element.length) {
        let text = element.text().trim();
        // 验证是否为有效地址（包含数字、街道关键词等）
        if (text && (/\d/.test(text) || /street|road|avenue|lane|drive|way|centre|center|boulevard|place|square|terrace|close|court|gardens|park|view|heights|manor|house|building|unit|suite|floor|level/i.test(text))) {
          address = text.replace(/\s+/g, ' ').trim();
          break;
        }
      }
    }

    // 如果没有找到结构化地址，尝试从页面文本中提取
    if (!address) {
      // 多国地址模式
      const addressPatterns = [
        // 爱尔兰地址模式
        /(?:Address|Location|Contact|Find us)[:\s]*([^.\n]{20,200}(?:Ireland|Dublin|Cork|Limerick|Galway|Waterford)[^.\n]{0,50})/gi,
        // 美国地址模式
        /(?:Address|Location|Contact|Find us)[:\s]*([^.\n]{20,200}(?:USA|United States|CA|NY|TX|FL|IL|PA|OH|GA|NC|MI|NJ|VA|WA|AZ|MA|TN|IN|MO|MD|WI|CO|MN|SC|AL|LA|KY|OR|OK|CT|UT|IA|NV|AR|MS|KS|NM|NE|WV|ID|HI|NH|ME|RI|MT|DE|SD|ND|AK|VT|WY)[^.\n]{0,50})/gi,
        // 英国地址模式
        /(?:Address|Location|Contact|Find us)[:\s]*([^.\n]{20,200}(?:UK|United Kingdom|England|Scotland|Wales|Northern Ireland|London|Manchester|Birmingham|Liverpool|Leeds|Sheffield|Bristol|Nottingham|Leicester|Coventry|Bradford|Cardiff|Belfast|Newcastle|Stoke|Southampton|Derby|Portsmouth|Brighton|Plymouth|Northampton|Reading|Luton|Wolverhampton)[^.\n]{0,50})/gi,
        // 通用地址模式
        /(?:Address|Location|Contact|Find us)[:\s]*([^.\n]{20,200})/gi
      ];
      
      for (const pattern of addressPatterns) {
        const addressMatch = response.data.match(pattern);
        if (addressMatch) {
          address = addressMatch[0].replace(/^(?:Address|Location|Contact|Find us)[:\s]*/i, '').trim();
          break;
        }
      }
    }
    
    // 格式化地址
    address = formatAddress(address, url);

    // 提取邮箱 - 优化正则表达式和优先级
    let email = '';
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatches = response.data.match(emailRegex);
    if (emailMatches && emailMatches.length > 0) {
      // 优先选择非通用邮箱（排除noreply、admin等）
      const preferredEmails = emailMatches.filter(email => 
        !/noreply|no-reply|admin|info@|contact@|support@/i.test(email)
      );
      email = preferredEmails.length > 0 ? preferredEmails[0] : emailMatches[0];
    }

    // 提取电话 - 多国格式支持
    let phone = '';
    
    // 多国电话号码正则表达式
    const phonePatterns = [
      // 爱尔兰格式: +353 XX XXX XXXX 或 +353 X XXX XXXX
      /(?:\+353\s*)?(?:\(0\)\s*)?(?:0\s*)?[1-9]\d{1,3}\s*\d{3,4}\s*\d{3,4}/g,
      // 美国/加拿大格式: +1 NXX-NXX-XXXX
      /(?:\+1\s*)?(?:\(?([2-9]\d{2})\)?[-.\s]?)?([2-9]\d{2})[-.\s]?(\d{4})/g,
      // 英国格式: +44 XXXX XXX XXX
      /(?:\+44\s*)?(?:\(0\)\s*)?(?:0\s*)?[1-9]\d{2,3}\s*\d{3,4}\s*\d{3,4}/g,
      // 澳大利亚格式: +61 X XXXX XXXX
      /(?:\+61\s*)?(?:\(0\)\s*)?(?:0\s*)?[2-9]\d{1}\s*\d{4}\s*\d{4}/g,
      // 通用国际格式: +XX XXXX XXXX
      /\+?[1-9]\d{1,3}\s*\d{2,4}\s*\d{2,4}\s*\d{2,4}/g,
      // 本地格式（7-15位数字）
      /(?:\(?\+?[1-9]\d{0,3}\)?[-.\s]?)?(?:\(?\d{1,4}\)?[-.\s]?)?\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{2,4}/g
    ];
    
    let phoneMatches = [];
    for (const pattern of phonePatterns) {
      const matches = response.data.match(pattern);
      if (matches && matches.length > 0) {
        phoneMatches = matches;
        break;
      }
    }
    
    if (phoneMatches && phoneMatches.length > 0) {
      phone = phoneMatches[0]
        .replace(/\s+/g, ' ')
        .replace(/\(0\)/g, '')
        .replace(/[^\d+\s\-\(\)]/g, '') // 只保留数字、+、空格、-、()
        .trim();
      
      // 根据国家格式化电话号码
      phone = formatPhoneNumber(phone, url);
    }

    // 提取社交媒体链接 - 优化选择器和URL处理
    const socialLinks = {
            instagram: [],
            facebook: []
        };

    // 优先从header、footer、导航等区域查找
    const prioritySelectors = [
      'header', 'footer', 'nav', 
      '.social', '.social-links', '.social-media',
      '.floating', '.fixed', '.contact',
      '[class*="social"]', '[class*="contact"]'
    ];
    
    for (const selector of prioritySelectors) {
      const container = $(selector);
      if (container.length) {
        const links = container.find('a[href*="instagram.com"], a[href*="facebook.com"]');
        links.each((i, el) => {
            const href = $(el).attr('href');
            if (href) {
            let cleanUrl = href;
            // 清理URL
            if (href.includes('instagram.com')) {
              cleanUrl = href.replace(/\/$/, ''); // 移除末尾斜杠
              if (!cleanUrl.startsWith('http')) {
                cleanUrl = 'https://' + cleanUrl.replace(/^\/+/, '');
              }
              socialLinks.instagram.push(cleanUrl);
            } else if (href.includes('facebook.com')) {
              cleanUrl = href.replace(/\/$/, ''); // 移除末尾斜杠
              if (!cleanUrl.startsWith('http')) {
                cleanUrl = 'https://' + cleanUrl.replace(/^\/+/, '');
              }
              socialLinks.facebook.push(cleanUrl);
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
          let cleanUrl = href;
          if (href.includes('instagram.com')) {
            cleanUrl = href.replace(/\/$/, '');
            if (!cleanUrl.startsWith('http')) {
              cleanUrl = 'https://' + cleanUrl.replace(/^\/+/, '');
            }
            socialLinks.instagram.push(cleanUrl);
          } else if (href.includes('facebook.com')) {
            cleanUrl = href.replace(/\/$/, '');
            if (!cleanUrl.startsWith('http')) {
              cleanUrl = 'https://' + cleanUrl.replace(/^\/+/, '');
            }
            socialLinks.facebook.push(cleanUrl);
          }
        }
      });
    }

    // 去重和清理
    socialLinks.instagram = [...new Set(socialLinks.instagram)];
    socialLinks.facebook = [...new Set(socialLinks.facebook)];

    // 提取国家信息（基于地址或域名）
    let country = '';
    if (address) {
      if (/ireland|dublin|cork|limerick|galway|waterford/i.test(address)) {
        country = 'Ireland';
      }
    } else if (url.includes('.ie')) {
      country = 'Ireland';
    }

    console.log('提取结果:', {
      companyName: companyName ? companyName.substring(0, 50) + '...' : '未找到',
      description: description ? description.substring(0, 100) + '...' : '未找到',
      address: address ? address.substring(0, 100) + '...' : '未找到',
      email: email || '未找到',
      phone: phone || '未找到',
      instagram: socialLinks.instagram.length,
      facebook: socialLinks.facebook.length,
      country: country || '未确定'
    });

    return {
      url: url,
      companyName: companyName,
      description: description,
      address: address,
      email: email,
      phone: phone,
      instagram: socialLinks.instagram,
      facebook: socialLinks.facebook,
      country: country
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
      // 先解析可能的 wiki 节点 token 为真实 Bitable App Token
      let appTokenForQuery = cfg.bitableAppToken || cfg.appId;
      try {
        const nodeResp = await axios.get('https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node', {
          headers: { 'Authorization': `Bearer ${accessToken}` },
          params: { token: appTokenForQuery, obj_type: 'wiki' }
        });
        if (nodeResp.data?.code === 0 && nodeResp.data?.data?.node?.obj_type === 'bitable') {
          appTokenForQuery = nodeResp.data.data.node.obj_token;
          console.log('解析到真实Bitable App Token(字段查询阶段):', appTokenForQuery);
        }
      } catch (_) {}

      const fieldsResp = await axios.get(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${appTokenForQuery}/tables/${tableId}/fields`,
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
    const mapCountry    = pickName('Country','国家','地区','国家地区');
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
    if (mapCountry)   fieldsToWrite[mapCountry] = data.country || '';
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

    // 如果没有获取到字段列表或完全匹配不到，则回退到默认字段集（包含 
    // "来自 gpt 的输出" 兜底，保证至少能写到该列）
    if (Object.keys(fieldsToWrite).length === 0) {
      fieldsToWrite['网站URL']   = data.url || '';
      fieldsToWrite['公司名称']   = data.companyName || '';
      fieldsToWrite['描述']     = data.description || '';
      fieldsToWrite['Country']  = data.country || '';
      fieldsToWrite['地址']     = data.address || '';
      fieldsToWrite['邮箱']     = data.email || '';
      fieldsToWrite['电话']     = data.phone || '';
      fieldsToWrite['Instagram'] = data.instagram?.join(', ') || '';
      fieldsToWrite['Facebook']  = data.facebook?.join(', ') || '';
      fieldsToWrite['提取时间']   = new Date().toISOString();
      fieldsToWrite['来自 gpt 的输出'] = JSON.stringify({
        url: data.url,
        companyName: data.companyName,
        description: data.description,
        country: data.country,
        address: data.address,
        email: data.email,
        phone: data.phone,
        instagram: data.instagram,
        facebook: data.facebook,
        extractedAt: new Date().toISOString()
      });
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
