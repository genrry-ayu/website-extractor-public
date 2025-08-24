const axios = require('axios');
const cheerio = require('cheerio');

// 飞书API配置 - 优先环境变量，允许前端覆盖非敏感项
const pick = (v) => (typeof v === 'string' && v.trim()) ? v.trim() : undefined;
const mask = (s) => s ? s.slice(0,3) + '***' + s.slice(-2) : '';

let FEISHU_APP_ID = null;
let FEISHU_APP_SECRET = null;
let FEISHU_TABLE_ID = null;

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
      const { url, feishuConfig } = JSON.parse(event.body || '{}');
      
      if (!url) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'URL is required' })
        };
      }

      // 配置优先级：环境变量 > 前端传递（仅允许非敏感项）
      const appId = process.env.FEISHU_APP_ID || pick(feishuConfig?.feishuAppId);
      const appSecret = process.env.FEISHU_APP_SECRET; // 不允许前端覆盖
      const tableId = pick(feishuConfig?.feishuTableId) || process.env.FEISHU_TABLE_ID;
      
      FEISHU_APP_ID = appId;
      FEISHU_APP_SECRET = appSecret;
      FEISHU_TABLE_ID = tableId;
      
      console.log('飞书配置状态:', {
        appId: appId ? '已设置' : '未设置',
        appSecret: appSecret ? '已设置' : '未设置',
        tableId: tableId ? '已设置' : '未设置',
        source: {
          appId: appId === process.env.FEISHU_APP_ID ? '环境变量' : '前端传递',
          appSecret: '环境变量',
          tableId: tableId === process.env.FEISHU_TABLE_ID ? '环境变量' : '前端传递'
        }
      });
      
      // 验证必要配置
      if (!appId || !appSecret || !tableId) {
        console.log('配置验证失败:', {
          appId: !!appId,
          appSecret: !!appSecret,
          tableId: !!tableId
        });
      }

    console.log('开始提取网站信息:', url);

    // 抓取网页内容
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // 提取网站信息
    const websiteInfo = await extractWebsiteInfo($, url);

    console.log('提取完成:', websiteInfo);
    console.log('社交媒体链接详情:');
    console.log('- Instagram:', websiteInfo.instagram);
    console.log('- Facebook:', websiteInfo.facebook);

    // 尝试写入飞书多维表格
    let feishuSuccess = false;
    if (FEISHU_APP_ID && FEISHU_APP_SECRET && FEISHU_TABLE_ID) {
      try {
        feishuSuccess = await writeToFeishu(websiteInfo);
        console.log('飞书写入结果:', feishuSuccess);
      } catch (feishuError) {
        console.error('飞书写入失败:', feishuError.message);
      }
    } else {
      console.log('未配置飞书信息，跳过飞书写入');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        url: url,
        results: websiteInfo,
        feishuSuccess: feishuSuccess
      })
    };

  } catch (error) {
    console.error('提取失败:', error.message);
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

async function extractWebsiteInfo($, url) {
  // 提取公司名称
  let companyName = '';
  companyName = $('title').text().trim() || 
                $('h1').first().text().trim() ||
                $('meta[property="og:site_name"]').attr('content') ||
                '';

  // 提取描述
  let description = '';
  description = $('meta[name="description"]').attr('content') ||
                $('meta[property="og:description"]').attr('content') ||
                $('p').first().text().trim() ||
                '';

  // 提取地址
  let address = '';
  $('*').each((i, el) => {
    const text = $(el).text();
    if (text.includes('Address:') || text.includes('地址:') || text.includes('@')) {
      const addressMatch = text.match(/(?:Address:|地址:)?\s*([^,\n]+(?:,\s*[^,\n]+)*)/i);
      if (addressMatch && addressMatch[1].length > 5) {
        address = addressMatch[1].trim();
        return false; // 跳出循环
      }
    }
  });

  // 如果没有找到地址，尝试从页面内容中查找
  if (!address) {
    const addressPatterns = [
      /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Place|Pl|Court|Ct|Way|Terrace|Ter)\b/gi,
      /\b[A-Za-z\s]+\s+\d{4}\s+[A-Za-z\s]+\b/gi, // 挪威地址格式
      /\b[A-Za-z\s]+,\s*\d{5}\s+[A-Za-z\s]+\b/gi
    ];
    
    for (const pattern of addressPatterns) {
      const matches = $('body').text().match(pattern);
      if (matches && matches.length > 0) {
        address = matches[0].trim();
        break;
      }
    }
  }

  // 提取邮箱
  let email = '';
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emailMatches = $('body').text().match(emailRegex);
  if (emailMatches && emailMatches.length > 0) {
    email = emailMatches[0];
  }

  // 提取电话号码
  let phone = '';
  const phonePatterns = [
    /\+?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,4}/g,
    /\+?\d{2,4}\s?\d{3}\s?\d{3}/g, // 挪威格式
    /\+?\d{1,3}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g
  ];
  
  for (const pattern of phonePatterns) {
    const matches = $('body').text().match(pattern);
    if (matches && matches.length > 0) {
      phone = matches[0].trim();
      break;
    }
  }

  // 提取社交媒体链接 - 重点关注页头、页脚和浮层
  const instagram = [];
  const facebook = [];

  console.log('开始提取社交媒体链接...');

  // 1. 优先从页头导航中提取
  $('header a[href*="instagram.com"], nav a[href*="instagram.com"], .header a[href*="instagram.com"], .nav a[href*="instagram.com"]').each((i, el) => {
    const href = $(el).attr('href');
    if (href && !instagram.includes(href)) {
      instagram.push(href);
      console.log('从页头导航找到Instagram:', href);
    }
  });

  $('header a[href*="facebook.com"], nav a[href*="facebook.com"], .header a[href*="facebook.com"], .nav a[href*="facebook.com"]').each((i, el) => {
    const href = $(el).attr('href');
    if (href && !facebook.includes(href)) {
      facebook.push(href);
      console.log('从页头导航找到Facebook:', href);
    }
  });

  // 2. 从页脚中提取
  $('footer a[href*="instagram.com"], .footer a[href*="instagram.com"]').each((i, el) => {
    const href = $(el).attr('href');
    if (href && !instagram.includes(href)) {
      instagram.push(href);
      console.log('从页脚找到Instagram:', href);
    }
  });

  $('footer a[href*="facebook.com"], .footer a[href*="facebook.com"]').each((i, el) => {
    const href = $(el).attr('href');
    if (href && !facebook.includes(href)) {
      facebook.push(href);
      console.log('从页脚找到Facebook:', href);
    }
  });

  // 3. 从所有包含社交媒体文本的链接中提取
  $('a').each((i, el) => {
    const $el = $(el);
    const href = $el.attr('href');
    const text = $el.text().toLowerCase();
    const ariaLabel = $el.attr('aria-label')?.toLowerCase() || '';
    
    if (href && (text.includes('instagram') || ariaLabel.includes('instagram'))) {
      if (!instagram.includes(href)) {
        instagram.push(href);
        console.log('从文本匹配找到Instagram:', href, '文本:', text);
      }
    }
    
    if (href && (text.includes('facebook') || ariaLabel.includes('facebook'))) {
      if (!facebook.includes(href)) {
        facebook.push(href);
        console.log('从文本匹配找到Facebook:', href, '文本:', text);
      }
    }
  });

  // 4. 从社交媒体图标和按钮中提取
  $('a[href*="instagram.com"]').each((i, el) => {
    const href = $(el).attr('href');
    const $el = $(el);
    // 检查是否是社交媒体图标或按钮
    if (href && !instagram.includes(href) && 
        ($el.find('svg').length > 0 || 
         $el.find('i').length > 0 || 
         $el.hasClass('social') || 
         $el.hasClass('instagram') ||
         $el.text().toLowerCase().includes('instagram') ||
         $el.attr('aria-label')?.toLowerCase().includes('instagram'))) {
      instagram.push(href);
      console.log('从图标按钮找到Instagram:', href);
    }
  });

  $('a[href*="facebook.com"]').each((i, el) => {
    const href = $(el).attr('href');
    const $el = $(el);
    // 检查是否是社交媒体图标或按钮
    if (href && !facebook.includes(href) && 
        ($el.find('svg').length > 0 || 
         $el.find('i').length > 0 || 
         $el.hasClass('social') || 
         $el.hasClass('facebook') ||
         $el.text().toLowerCase().includes('facebook') ||
         $el.attr('aria-label')?.toLowerCase().includes('facebook'))) {
      facebook.push(href);
      console.log('从图标按钮找到Facebook:', href);
    }
  });

  // 5. 从浮动元素和模态框中提取
  $('.modal a[href*="instagram.com"], .popup a[href*="instagram.com"], .floating a[href*="instagram.com"]').each((i, el) => {
    const href = $(el).attr('href');
    if (href && !instagram.includes(href)) {
      instagram.push(href);
      console.log('从浮动元素找到Instagram:', href);
    }
  });

  $('.modal a[href*="facebook.com"], .popup a[href*="facebook.com"], .floating a[href*="facebook.com"]').each((i, el) => {
    const href = $(el).attr('href');
    if (href && !facebook.includes(href)) {
      facebook.push(href);
      console.log('从浮动元素找到Facebook:', href);
    }
  });

  // 6. 从文本内容中提取（作为备用方案）
  if (instagram.length === 0) {
    const instagramMatches = $('body').text().match(/instagram\.com\/[A-Za-z0-9._]+/g);
    if (instagramMatches) {
      instagram.push(...instagramMatches.map(match => 'https://' + match));
      console.log('从文本内容找到Instagram:', instagramMatches);
    }
  }

  if (facebook.length === 0) {
    const facebookMatches = $('body').text().match(/facebook\.com\/[A-Za-z0-9._]+/g);
    if (facebookMatches) {
      facebook.push(...facebookMatches.map(match => 'https://' + match));
      console.log('从文本内容找到Facebook:', facebookMatches);
    }
  }

  // 7. 去重并清理链接
  const cleanInstagram = [...new Set(instagram)].filter(link => 
    link && link.includes('instagram.com') && !link.includes('javascript:')
  );
  const cleanFacebook = [...new Set(facebook)].filter(link => 
    link && link.includes('facebook.com') && !link.includes('javascript:')
  );

  console.log('社交媒体提取结果:');
  console.log('- Instagram原始:', instagram);
  console.log('- Facebook原始:', facebook);
  console.log('- Instagram清理后:', cleanInstagram);
  console.log('- Facebook清理后:', cleanFacebook);

  return {
    companyName: companyName || '未找到',
    description: description || '未找到',
    address: address || '未找到',
    email: email || '未找到',
    phone: phone || '未找到',
    instagram: cleanInstagram,
    facebook: cleanFacebook
  };
}

async function writeToFeishu(data) {
  try {
    console.log('开始写入飞书多维表格...');
    console.log('使用配置:', { 
      appId: FEISHU_APP_ID, 
      tableId: FEISHU_TABLE_ID 
    });

    // 获取飞书访问令牌
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: FEISHU_APP_ID,
      app_secret: FEISHU_APP_SECRET
    });

    if (!tokenResponse.data.tenant_access_token) {
      throw new Error('无法获取飞书访问令牌');
    }

    const accessToken = tokenResponse.data.tenant_access_token;
    console.log('成功获取飞书访问令牌');

    // 使用从URL中提取的表格ID
    const tableId = FEISHU_TABLE_ID;
    console.log('使用从URL提取的表格ID:', tableId);
    
    // 验证表格ID格式（飞书表格ID通常以tbl开头，长度约15-20字符）
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
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_TABLE_ID}/tables/${tableId}/records`,
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
