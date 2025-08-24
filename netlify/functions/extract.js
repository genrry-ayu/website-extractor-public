const axios = require('axios');
const cheerio = require('cheerio');

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
    const { url } = JSON.parse(event.body || '{}');
    
    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL is required' })
      };
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

    // 尝试写入飞书多维表格
    let feishuSuccess = false;
    if (FEISHU_APP_ID && FEISHU_APP_SECRET && FEISHU_TABLE_ID) {
      try {
        feishuSuccess = await writeToFeishu(websiteInfo);
        console.log('飞书写入结果:', feishuSuccess);
      } catch (feishuError) {
        console.error('飞书写入失败:', feishuError.message);
      }
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

  // 提取社交媒体链接
  const instagram = [];
  const facebook = [];

  $('a[href*="instagram.com"]').each((i, el) => {
    const href = $(el).attr('href');
    if (href && !instagram.includes(href)) {
      instagram.push(href);
    }
  });

  $('a[href*="facebook.com"]').each((i, el) => {
    const href = $(el).attr('href');
    if (href && !facebook.includes(href)) {
      facebook.push(href);
    }
  });

  // 如果没有找到社交媒体链接，尝试从文本中提取
  if (instagram.length === 0) {
    const instagramMatches = $('body').text().match(/instagram\.com\/[A-Za-z0-9._]+/g);
    if (instagramMatches) {
      instagram.push(...instagramMatches.map(match => 'https://' + match));
    }
  }

  if (facebook.length === 0) {
    const facebookMatches = $('body').text().match(/facebook\.com\/[A-Za-z0-9._]+/g);
    if (facebookMatches) {
      facebook.push(...facebookMatches.map(match => 'https://' + match));
    }
  }

  return {
    companyName: companyName || '未找到',
    description: description || '未找到',
    address: address || '未找到',
    email: email || '未找到',
    phone: phone || '未找到',
    instagram: instagram,
    facebook: facebook
  };
}

async function writeToFeishu(data) {
  try {
    // 获取飞书访问令牌
    const tokenResponse = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      app_id: FEISHU_APP_ID,
      app_secret: FEISHU_APP_SECRET
    });

    const accessToken = tokenResponse.data.tenant_access_token;

    // 写入多维表格
    const recordData = {
      fields: {
        '网站URL': data.url,
        '公司名称': data.companyName,
        '描述': data.description,
        '地址': data.address,
        '邮箱': data.email,
        '电话': data.phone,
        'Instagram': data.instagram.join(', '),
        'Facebook': data.facebook.join(', '),
        '提取时间': new Date().toISOString()
      }
    };

    const writeResponse = await axios.post(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_TABLE_ID}/tables/${FEISHU_TABLE_ID}/records`,
      recordData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return writeResponse.status === 200;
  } catch (error) {
    console.error('飞书API错误:', error.response?.data || error.message);
    throw error;
  }
}
