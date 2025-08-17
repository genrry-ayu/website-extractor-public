const axios = require('axios');
const cheerio = require('cheerio');

// 网站信息提取函数
function extractWebsiteInfo(html, baseUrl) {
    const $ = cheerio.load(html);
    const info = {
        companyName: '',
        description: '',
        address: '',
        email: '',
        phone: '',
        instagram: [],
        facebook: []
    };
    
    const instagramLinks = new Set();
    const facebookLinks = new Set();
    
    // 1. 提取公司名称
    const title = $('title').text().trim();
    if (title) {
        const cleanTitle = title.replace(/[-|–|—|–|—].*$/, '').trim();
        if (cleanTitle && cleanTitle.length > 0 && cleanTitle.length < 100) {
            info.companyName = cleanTitle;
        }
    }
    
    // 2. 提取简介/描述
    const metaDescription = $('meta[name="description"]').attr('content');
    if (metaDescription) {
        info.description = metaDescription.trim();
    }
    
    // 3. 提取地址
    const addressSelectors = [
        '[class*="address"]', '[class*="location"]', '[class*="contact"]',
        '.address', '.location', '.contact-info', '.footer'
    ];
    
    for (const selector of addressSelectors) {
        const element = $(selector);
        if (element.length > 0) {
            const text = element.text().trim();
            if (text && text.length > 10 && text.length < 200) {
                info.address = text;
                break;
            }
        }
    }
    
    // 4. 提取邮箱
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emails = html.match(emailRegex);
    if (emails && emails.length > 0) {
        info.email = emails[0];
    }
    
    // 5. 提取电话
    const phoneRegex = /(\+?[\d\s\-\(\)]{7,})/g;
    const phones = html.match(phoneRegex);
    if (phones && phones.length > 0) {
        info.phone = phones[0].replace(/\s+/g, '');
    }
    
    // 6. 提取社交媒体链接
    $('a[href*="instagram.com"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href) {
            instagramLinks.add(href);
        }
    });
    
    $('a[href*="facebook.com"]').each((i, el) => {
        const href = $(el).attr('href');
        if (href) {
            facebookLinks.add(href);
        }
    });
    
    info.instagram = Array.from(instagramLinks);
    info.facebook = Array.from(facebookLinks);
    
    return info;
}

exports.handler = async (event, context) => {
    // 启用 CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    // 处理 OPTIONS 请求
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

        // 获取网页内容
        const response = await axios.get(url, {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const html = response.data;
        const info = extractWebsiteInfo(html, url);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                url: url,
                results: info
            })
        };

    } catch (error) {
        console.error('Error:', error.message);
        
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
