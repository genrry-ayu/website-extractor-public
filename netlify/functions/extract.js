const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
    console.log('Function triggered at:', new Date().toISOString());
    
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

        console.log('Extracting from URL:', url);

        // 获取网页内容
        const response = await axios.get(url, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const html = response.data;
        const $ = cheerio.load(html);
        
        // 提取基本信息
        const info = {
            companyName: $('title').text().trim() || '未找到',
            description: $('meta[name="description"]').attr('content') || '未找到',
            address: '未找到',
            email: '未找到',
            phone: '未找到',
            instagram: [],
            facebook: []
        };

        // 提取邮箱
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const emails = html.match(emailRegex);
        if (emails && emails.length > 0) {
            info.email = emails[0];
        }

        // 提取电话
        const phoneRegex = /(\+?[\d\s\-\(\)]{7,})/g;
        const phones = html.match(phoneRegex);
        if (phones && phones.length > 0) {
            info.phone = phones[0].replace(/\s+/g, '');
        }

        // 提取社交媒体链接
        $('a[href*="instagram.com"]').each((i, el) => {
            const href = $(el).attr('href');
            if (href) {
                info.instagram.push(href);
            }
        });
        
        $('a[href*="facebook.com"]').each((i, el) => {
            const href = $(el).attr('href');
            if (href) {
                info.facebook.push(href);
            }
        });

        console.log('Extraction completed successfully');

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                url: url,
                results: info,
                feishuSuccess: false
            })
        };

    } catch (error) {
        console.error('Error in function:', error.message);
        
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
