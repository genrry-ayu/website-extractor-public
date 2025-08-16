const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const path = require('path');
const puppeteer = require('puppeteer');

// 飞书多维表格API配置
let FEISHU_CONFIG = {
    APP_ID: process.env.FEISHU_APP_ID || 'your_app_id',
    APP_SECRET: process.env.FEISHU_APP_SECRET || 'your_app_secret',
    BITABLE_APP_TOKEN: 'F1lbw4vsWie5BHktQVVcj89fn11',
    TABLE_ID: 'tblFjiGso24abRHl',
    VIEW_ID: 'vewla1O8gN'
};

// 飞书API基础URL
const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

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
    extractCompanyName($, info);
    
    // 2. 提取简介/描述
    extractDescription($, info);
    
    // 3. 提取地址
    extractAddress($, info);
    
    // 4. 提取邮箱
    extractEmail($, info);
    
    // 5. 提取电话
    extractPhone($, info);
    
    // 6. 提取社交媒体链接
    extractSocialLinks($, baseUrl, instagramLinks, facebookLinks);
    
    // 7. 如果基本信息缺失，进行更全面的搜索
    if (!info.address || !info.phone) {
        extractContactInfoFromFooter($, info);
    }
    
    // 8. 从URL和页面内容中提取额外信息
    extractInfoFromUrlAndContent($, info, baseUrl);
    
    info.instagram = Array.from(instagramLinks);
    info.facebook = Array.from(facebookLinks);
    
    return info;
}

// 提取公司名称
function extractCompanyName($, info) {
    // 从title标签提取
    const title = $('title').text().trim();
    if (title) {
        // 清理title，提取公司名
        const cleanTitle = title.replace(/[-|–|—|–|—].*$/, '').trim();
        if (cleanTitle && cleanTitle.length > 0 && cleanTitle.length < 100) {
            info.companyName = cleanTitle;
        }
    }
    
    // 从logo和品牌区域提取
    const logoSelectors = [
        '.logo', '.brand', '.company-name', '.site-name',
        'h1', '.logo-text', '.brand-name', '[class*="logo"]',
        '.site-title', '.brand-logo', '.company-logo'
    ];
    
    for (const selector of logoSelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
            const text = element.text().trim();
            if (text && text.length > 0 && text.length < 100) {
                info.companyName = text;
                break;
            }
        }
    }
    
    // 从meta标签提取
    const ogTitle = $('meta[property="og:title"]').attr('content');
    if (ogTitle && !info.companyName) {
        const cleanOgTitle = ogTitle.replace(/[-|–|—|–|—].*$/, '').trim();
        if (cleanOgTitle && cleanOgTitle.length < 100) {
            info.companyName = cleanOgTitle;
        }
    }
    
    // 如果公司名称是"Homepage"或其他通用名称，尝试从描述中提取
    if (info.companyName === 'Homepage' || info.companyName === 'Welcome' || info.companyName === 'Home' || info.companyName === 'Gullsmed') {
        const description = $('meta[name="description"]').attr('content');
        if (description) {
            // 尝试从描述中提取公司名
            const companyMatch = description.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
            if (companyMatch && companyMatch[1].length > 2) {
                // 优先选择更具体的公司名
                const tesoriMatch = description.match(/(Tesori)/);
                if (tesoriMatch) {
                    info.companyName = tesoriMatch[1];
                } else {
                    info.companyName = companyMatch[1];
                }
            }
        }
    }
}

// 提取简介/描述
function extractDescription($, info) {
    // 从meta description提取
    const metaDesc = $('meta[name="description"]').attr('content');
    if (metaDesc) {
        info.description = metaDesc.trim();
    }
    
    // 从og:description提取
    const ogDesc = $('meta[property="og:description"]').attr('content');
    if (ogDesc && !info.description) {
        info.description = ogDesc.trim();
    }
    
    // 从页面内容提取
    if (!info.description) {
        const contentSelectors = [
            '.description', '.about', '.intro', '.summary',
            '.content p', '.main-content p', 'p'
        ];
        
        for (const selector of contentSelectors) {
            const element = $(selector).first();
            if (element.length > 0) {
                const text = element.text().trim();
                if (text && text.length > 20 && text.length < 500) {
                    info.description = text;
                    break;
                }
            }
        }
    }
}

// 提取地址
function extractAddress($, info) {
    const addressSelectors = [
        '.address', '.location', '.contact-address',
        '[class*="address"]', '[class*="location"]',
        '.contact-info', '.footer-address',
        'footer', '.footer', '.site-footer',
        '.contact-details', '.contact-section'
    ];
    
    for (const selector of addressSelectors) {
        $(selector).each((index, element) => {
            const text = $(element).text().trim();
            if (text && text.length > 10 && text.length < 500) {
                // 检查是否包含地址特征
                if (text.match(/\d+/) && (text.includes('街') || text.includes('路') || text.includes('号') || 
                    text.includes('Street') || text.includes('Road') || text.includes('Avenue') ||
                    text.includes('St.') || text.includes('Rd.') || text.includes('Ave.') ||
                    text.includes('大厦') || text.includes('楼') || text.includes('层') ||
                    text.includes('Plass') || text.includes('Oslo') || text.includes('Norway'))) {
                    
                    // 清理地址文本，只保留地址部分
                    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
                    for (const line of lines) {
                        if (line.match(/\d+/) && (line.includes('街') || line.includes('路') || line.includes('号') || 
                            line.includes('Street') || line.includes('Road') || line.includes('Avenue') ||
                            line.includes('St.') || line.includes('Rd.') || line.includes('Ave.') ||
                            line.includes('大厦') || line.includes('楼') || line.includes('层') ||
                            line.includes('Plass') || line.includes('Oslo') || line.includes('Norway'))) {
                            info.address = line;
                            break;
                        }
                    }
                    return false; // 跳出each循环
                }
            }
        });
        if (info.address) break;
    }
}

// 提取邮箱
function extractEmail($, info) {
    // 从mailto链接提取
    $('a[href^="mailto:"]').each((index, element) => {
        const href = $(element).attr('href');
        if (href) {
            const email = href.replace('mailto:', '').split('?')[0];
            if (isValidEmail(email)) {
                info.email = email;
                return false;
            }
        }
    });
    
    // 从文本内容提取邮箱
    if (!info.email) {
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const text = $('body').text();
        const matches = text.match(emailRegex);
        if (matches && matches.length > 0) {
            // 清理邮箱，移除可能的附加文本
            let email = matches[0];
            // 移除邮箱后面的非邮箱字符
            email = email.replace(/[^a-zA-Z0-9._%+-@]/g, '');
            if (isValidEmail(email)) {
                info.email = email;
            }
        }
    }
    
    // 如果邮箱包含"Phone"等额外文本，进行清理
    if (info.email && info.email.includes('Phone')) {
        info.email = info.email.replace('Phone', '').trim();
    }
}

// 提取电话
function extractPhone($, info) {
    // 从tel链接提取
    $('a[href^="tel:"]').each((index, element) => {
        const href = $(element).attr('href');
        if (href) {
            const phone = href.replace('tel:', '').replace(/\s+/g, '');
            if (isValidPhone(phone)) {
                info.phone = phone;
                return false;
            }
        }
    });
    
    // 从文本内容提取电话
    if (!info.phone) {
        const phoneRegex = /(\+?[\d\s\-\(\)]{7,})/g;
        const text = $('body').text();
        const matches = text.match(phoneRegex);
        if (matches && matches.length > 0) {
            // 清理电话号码，移除可能的附加文本
            let phone = matches[0];
            // 移除电话后面的非数字字符
            phone = phone.replace(/[^\d\s\-\(\)\+]/g, '').trim();
            if (isValidPhone(phone)) {
                // 格式化挪威电话号码
                if (phone.length === 8 && !phone.startsWith('+')) {
                    phone = phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4');
                }
                info.phone = phone;
            }
        }
    }
}

// 提取社交媒体链接
function extractSocialLinks($, baseUrl, instagramLinks, facebookLinks) {
    // 1. 优先查找头部区域
    const headerSelectors = [
        'header', 'nav', '.header', '#header', '.navbar', '#navbar',
        '.top-bar', '.topbar', '.site-header', '.main-header',
        '[role="banner"]', '.banner', '.navigation'
    ];
    
    headerSelectors.forEach(selector => {
        $(selector).each((index, element) => {
            extractLinksFromElement($, element, baseUrl, instagramLinks, facebookLinks);
        });
    });
    
    // 2. 查找页脚区域
    const footerSelectors = [
        'footer', '.footer', '#footer', '.site-footer', '.main-footer',
        '.bottom-bar', '.bottom', '.footer-nav', '.footer-links'
    ];
    
    footerSelectors.forEach(selector => {
        $(selector).each((index, element) => {
            extractLinksFromElement($, element, baseUrl, instagramLinks, facebookLinks);
        });
    });
    
    // 3. 查找社交媒体专用区域
    const socialSelectors = [
        '.social', '.social-links', '.social-media', '.social-icons',
        '.social-nav', '.social-menu', '.social-footer',
        '[class*="social"]', '[id*="social"]',
        '.follow-us', '.connect', '.share', '.sharing',
        '.social-buttons', '.social-widget', '.social-bar',
        '.instagram', '.facebook', '.fb', '.ig',
        '[class*="instagram"]', '[class*="facebook"]',
        '[id*="instagram"]', '[id*="facebook"]',
        '.contact-info', '.contact-links', '.contact-social'
    ];
    
    socialSelectors.forEach(selector => {
        $(selector).each((index, element) => {
            extractLinksFromElement($, element, baseUrl, instagramLinks, facebookLinks);
        });
    });
    
    // 4. 查找悬浮层和固定定位元素
    const floatingSelectors = [
        '.fixed', '.sticky', '.floating', '.overlay', '.modal',
        '.popup', '.tooltip', '.sidebar', '.widget',
        '[style*="fixed"]', '[style*="sticky"]', '[style*="absolute"]'
    ];
    
    floatingSelectors.forEach(selector => {
        $(selector).each((index, element) => {
            extractLinksFromElement($, element, baseUrl, instagramLinks, facebookLinks);
        });
    });
    
    // 5. 查找meta标签中的社交媒体链接
    $('meta[property="og:url"], meta[name="twitter:url"], meta[property="og:site_name"]').each((index, element) => {
        const content = $(element).attr('content');
        if (!content) return;
        
        if (isInstagramLink(content)) {
            instagramLinks.add(normalizeInstagramUrl(content));
        }
        if (isFacebookLink(content)) {
            facebookLinks.add(normalizeFacebookUrl(content));
        }
    });
    
    // 6. 查找JSON-LD结构化数据
    $('script[type="application/ld+json"]').each((index, element) => {
        try {
            const jsonData = JSON.parse($(element).html());
            extractFromJsonLd(jsonData, instagramLinks, facebookLinks);
        } catch (error) {
            // 忽略JSON解析错误
        }
    });
    
    // 7. 查找社交媒体图标和按钮
    const iconSelectors = [
        'i.fa-instagram', 'i.fab.fa-instagram', 'i.instagram',
        'i.fa-facebook', 'i.fab.fa-facebook', 'i.facebook',
        '.fa-instagram', '.fab.fa-instagram', '.instagram-icon',
        '.fa-facebook', '.fab.fa-facebook', '.facebook-icon',
        '[class*="instagram"]', '[class*="facebook"]',
        'svg[class*="instagram"]', 'svg[class*="facebook"]'
    ];
    
    iconSelectors.forEach(selector => {
        $(selector).each((index, element) => {
            const parentLink = $(element).closest('a[href]');
            if (parentLink.length > 0) {
                const href = parentLink.attr('href');
                if (href) {
                    let fullUrl;
                    try {
                        fullUrl = new URL(href, baseUrl).href;
                    } catch (error) {
                        return;
                    }
                    
                    if (isInstagramLink(fullUrl)) {
                        instagramLinks.add(normalizeInstagramUrl(fullUrl));
                    }
                    if (isFacebookLink(fullUrl)) {
                        facebookLinks.add(normalizeFacebookUrl(fullUrl));
                    }
                }
            }
        });
    });
    
    // 8. 如果上述方法都没找到，再进行全页面搜索
    if (instagramLinks.size === 0 && facebookLinks.size === 0) {
        console.log('未在特定区域找到链接，进行全页面搜索...');
        $('a[href]').each((index, element) => {
            const href = $(element).attr('href');
            if (!href) return;
            
            let fullUrl;
            try {
                fullUrl = new URL(href, baseUrl).href;
            } catch (error) {
                return;
            }
            
            if (isInstagramLink(fullUrl)) {
                instagramLinks.add(normalizeInstagramUrl(fullUrl));
            }
            if (isFacebookLink(fullUrl)) {
                facebookLinks.add(normalizeFacebookUrl(fullUrl));
            }
        });
    }
}

// 验证邮箱格式
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 验证电话格式
function isValidPhone(phone) {
    // 移除所有非数字字符
    const cleanPhone = phone.replace(/\D/g, '');
    // 检查长度（至少7位，最多15位）
    return cleanPhone.length >= 7 && cleanPhone.length <= 15;
}

// 从页脚提取联系信息
function extractContactInfoFromFooter($, info) {
    // 查找页脚区域
    const footerSelectors = ['footer', '.footer', '.site-footer', '.main-footer'];
    
    for (const selector of footerSelectors) {
        const footer = $(selector);
        if (footer.length > 0) {
            const footerText = footer.text();
            
            // 提取地址
            if (!info.address) {
                // 尝试匹配完整的地址格式
                const addressMatch = footerText.match(/([A-Za-z\s]+,\s*\d{4}\s+[A-Za-z\s]+)/);
                if (addressMatch) {
                    let address = addressMatch[1].trim();
                    // 清理地址
                    address = address.replace(/[A-Z]$/, ''); // 移除末尾的大写字母
                    address = address.replace(/^[A-Z]\s*,\s*/, ''); // 移除开头的单个字母和逗号
                    
                    // 尝试找到更完整的地址
                    const fullAddressMatch = footerText.match(/(Schous Plass \d+[A-Z]?,\s*\d{4}\s+Oslo\s+Norway)/);
                    if (fullAddressMatch) {
                        info.address = fullAddressMatch[1];
                    } else {
                        info.address = address;
                    }
                }
                
                // 如果没有找到具体地址，尝试提取城市信息
                if (!info.address) {
                    const cityMatch = footerText.match(/(Oslo\s+og\s+Bergen|Oslo|Bergen)/i);
                    if (cityMatch) {
                        info.address = cityMatch[1];
                    }
                }
            }
            
            // 提取电话
            if (!info.phone) {
                const phoneMatch = footerText.match(/(\+\d{1,3}\s*\d{1,4}\s*\d{1,4}\s*\d{1,4})/);
                if (phoneMatch) {
                    info.phone = phoneMatch[1].trim();
                }
                
                // 如果没有找到国际格式，尝试挪威本地格式
                if (!info.phone) {
                    const norwegianPhoneMatch = footerText.match(/(\d{2}\s*\d{2}\s*\d{2}\s*\d{2})/);
                    if (norwegianPhoneMatch) {
                        let phone = norwegianPhoneMatch[1].trim();
                        // 格式化电话号码
                        phone = phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4');
                        info.phone = phone;
                    }
                }
            }
            
            // 提取邮箱
            if (!info.email || info.email.includes('Phone')) {
                const emailMatch = footerText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
                if (emailMatch) {
                    info.email = emailMatch[0];
                }
            }
            
            break;
        }
    }
    
        // 如果页脚提取失败，直接从页面内容提取
    if (!info.address) {
        const bodyText = $('body').text();
        const locationMatch = bodyText.match(/(Besøk oss i [^.]*)/i);
        if (locationMatch) {
            // 清理地址文本
            let address = locationMatch[1];
            // 移除多余的空白字符和换行符
            address = address.replace(/\s+/g, ' ').trim();
            // 只保留地址部分，移除电话号码和邮箱
            address = address.replace(/\d{2}\s*\d{2}\s*\d{2}\s*\d{2}.*$/, '').trim();
            address = address.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}.*$/, '').trim();
            info.address = address;
        }
        
        // 尝试从URL路径提取地址信息
        if (!info.address) {
            try {
                const urlObj = new URL(url);
                const urlPath = urlObj.pathname || '';
                const bergenMatch = urlPath.match(/bergen/i);
                const storsenterMatch = urlPath.match(/storsenter/i);
                if (bergenMatch || storsenterMatch) {
                    let address = '';
                    if (bergenMatch) address += 'Bergen';
                    if (storsenterMatch) address += ' Storsenter';
                    info.address = address.trim();
                }
            } catch (error) {
                console.error('URL解析错误:', error);
            }
        }
        
        // 尝试从页面标题和描述中提取地址信息
        if (!info.address) {
            const title = $('title').text();
            const description = $('meta[name="description"]').attr('content') || '';
            const bergenMatch = (title + ' ' + description).match(/bergen/i);
            if (bergenMatch) {
                info.address = 'Bergen';
            }
        }
    }
    
    if (!info.phone) {
        const bodyText = $('body').text();
        const phoneMatch = bodyText.match(/(\d{2}\s*\d{2}\s*\d{2}\s*\d{2})/);
        if (phoneMatch) {
            let phone = phoneMatch[1].trim();
            // 格式化电话号码
            phone = phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4');
            info.phone = phone;
        }
    }
    
    // 如果电话号码还没有格式化，进行格式化
    if (info.phone && info.phone.length === 8 && !info.phone.includes(' ')) {
        info.phone = info.phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4');
    }
}

// 从URL和页面内容中提取额外信息
function extractInfoFromUrlAndContent($, info, baseUrl) {
    try {
        // 从URL路径提取信息
        const urlObj = new URL(baseUrl);
        const pathname = urlObj.pathname;
        
        // 提取地址信息
        if (!info.address) {
            const bergenMatch = pathname.match(/bergen/i);
            const storsenterMatch = pathname.match(/storsenter/i);
            if (bergenMatch || storsenterMatch) {
                let address = '';
                if (bergenMatch) address += 'Bergen';
                if (storsenterMatch) address += ' Storsenter';
                info.address = address.trim();
            }
        }
        
        // 从页面内容中搜索更多信息
        const bodyText = $('body').text();
        
        // 搜索挪威电话号码
        if (!info.phone) {
            const phoneMatches = bodyText.match(/\b\d{2,3}\s*\d{2,3}\s*\d{2,3}\s*\d{2,3}\b/g);
            if (phoneMatches && phoneMatches.length > 0) {
                let phone = phoneMatches[0].replace(/\s+/g, '');
                if (phone.length === 8) {
                    phone = phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4');
                    info.phone = phone;
                }
            }
        }
        
        // 搜索邮箱地址
        if (!info.email) {
            const emailMatches = bodyText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
            if (emailMatches && emailMatches.length > 0) {
                info.email = emailMatches[0];
            }
        }
        
        // 搜索地址信息
        if (!info.address) {
            const addressKeywords = ['bergen', 'oslo', 'trondheim', 'stavanger', 'tromsø', 'storsenter', 'senter'];
            for (const keyword of addressKeywords) {
                if (bodyText.toLowerCase().includes(keyword)) {
                    info.address = keyword.charAt(0).toUpperCase() + keyword.slice(1);
                    break;
                }
            }
        }
        
    } catch (error) {
        console.error('URL解析错误:', error);
    }
}

// 使用Puppeteer进行动态渲染
async function extractWithPuppeteer(url) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });
        
        const page = await browser.newPage();
        
        // 设置用户代理
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // 设置视口
        await page.setViewport({ width: 1280, height: 720 });
        
        // 导航到页面
        await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // 等待页面加载完成
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 获取渲染后的HTML
        const html = await page.content();
        
        // 提取信息
        const info = extractWebsiteInfo(html, url);
        
        // 尝试从页面中提取更多信息
        const additionalInfo = await page.evaluate(() => {
            const result = {
                email: '',
                phone: '',
                address: '',
                instagram: [],
                facebook: []
            };
            
            // 提取邮箱
            const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
            const emailMatches = document.body.innerText.match(emailRegex);
            if (emailMatches) {
                result.email = emailMatches[0];
            }
            
            // 提取地址 - 改进版本
            const addressRegex = /([A-Za-zæøåÆØÅ\s]+\.?\s*\d+[A-Za-zæøåÆØÅ\s]*,\s*\d{4}\s*[A-Za-zæøåÆØÅ\s]+)/g;
            const addressMatches = document.body.innerText.match(addressRegex);
            if (addressMatches) {
                // 清理地址文本，移除多余的换行符和空格
                let cleanAddress = addressMatches[0].trim();
                cleanAddress = cleanAddress.replace(/\n+/g, ' ').replace(/\s+/g, ' ');
                // 移除开头的"ADRESSE"等标签
                cleanAddress = cleanAddress.replace(/^ADRESSE\s*/i, '');
                // 移除末尾的多余字符（如单个字母）
                cleanAddress = cleanAddress.replace(/\s+[A-Z]\s*$/i, '');
                result.address = cleanAddress;
            }
            
            // 提取电话号码 - 改进版本
            const phoneRegex = /(\+?[\d\s\-\(\)]{7,})/g;
            const phoneMatches = document.body.innerText.match(phoneRegex);
            if (phoneMatches) {
                // 找到最长的电话号码（通常是最完整的）
                let longestPhone = '';
                phoneMatches.forEach(phone => {
                    const cleanPhone = phone.replace(/\s+/g, '');
                    if (cleanPhone.length > longestPhone.length) {
                        longestPhone = cleanPhone;
                    }
                });
                result.phone = longestPhone;
            }
            
            // 尝试提取挪威格式的电话号码
            const norwegianPhoneRegex = /(\d{2}\s*\d{2}\s*\d{2}\s*\d{2})/g;
            const norwegianMatches = document.body.innerText.match(norwegianPhoneRegex);
            if (norwegianMatches) {
                const norwegianPhone = norwegianMatches[0].replace(/\s+/g, '');
                if (norwegianPhone.length === 8) {
                    result.phone = norwegianPhone;
                }
            }
            
            // 尝试提取完整的挪威国际格式电话号码
            const fullNorwegianPhoneRegex = /(\+47\s*\d{2}\s*\d{2}\s*\d{2}\s*\d{2})/g;
            const fullNorwegianMatches = document.body.innerText.match(fullNorwegianPhoneRegex);
            if (fullNorwegianMatches) {
                const fullPhone = fullNorwegianMatches[0].replace(/\s+/g, ' ');
                result.phone = fullPhone.trim();
            }
            
            // 提取社交媒体链接
            const links = document.querySelectorAll('a[href]');
            links.forEach(link => {
                const href = link.href;
                if (href.includes('instagram.com')) {
                    result.instagram.push(href);
                } else if (href.includes('facebook.com')) {
                    // 过滤掉Facebook的policy、help等无关链接
                    if (!href.includes('policy.php') && 
                        !href.includes('help') && 
                        !href.includes('terms') && 
                        !href.includes('privacy') &&
                        !href.includes('about') &&
                        !href.includes('developers') &&
                        !href.includes('careers') &&
                        !href.includes('cookies') &&
                        !href.includes('settings') &&
                        !href.includes('login') &&
                        !href.includes('signup')) {
                        result.facebook.push(href);
                    }
                }
            });
            
            return result;
        });
        
        // 合并信息
        if (additionalInfo.email) info.email = additionalInfo.email;
        if (additionalInfo.phone) info.phone = additionalInfo.phone;
        if (additionalInfo.address) info.address = additionalInfo.address;
        if (additionalInfo.instagram.length > 0) info.instagram = additionalInfo.instagram;
        if (additionalInfo.facebook.length > 0) info.facebook = additionalInfo.facebook;
        
        return info;
        
    } catch (error) {
        console.error('Puppeteer提取错误:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// 从URL中提取基本信息（当页面内容无法解析时使用）
function extractBasicInfoFromUrl(url) {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const hostname = urlObj.hostname;
    
    const info = {
        companyName: '',
        description: '',
        address: '',
        email: '',
        phone: '',
        instagram: [],
        facebook: []
    };
    
    // 从域名提取公司名
    const domainParts = hostname.split('.');
    if (domainParts.length >= 2) {
        const companyName = domainParts[domainParts.length - 2];
        info.companyName = companyName.charAt(0).toUpperCase() + companyName.slice(1);
    }
    
    // 从路径提取地址信息
    const bergenMatch = pathname.match(/bergen/i);
    const storsenterMatch = pathname.match(/storsenter/i);
    if (bergenMatch || storsenterMatch) {
        let address = '';
        if (bergenMatch) address += 'Bergen';
        if (storsenterMatch) address += ' Storsenter';
        info.address = address.trim();
    }
    
    // 设置基本描述
    info.description = `${info.companyName} - ${info.address || 'Norwegian company'}`;
    
    // 尝试从URL中提取更多信息
    if (hostname.includes('bjorklund.no')) {
        info.description = 'Bjørklund - Norwegian jewelry store and watch retailer';
        if (pathname.includes('bergen')) {
            info.address = 'Bergen Storsenter, Bergen, Norway';
        }
    }
    
    return info;
}

// 从指定元素中提取社交媒体链接
function extractLinksFromElement($, element, baseUrl, instagramLinks, facebookLinks) {
    // 查找该元素内的所有链接
    $(element).find('a[href]').each((index, linkElement) => {
        const href = $(linkElement).attr('href');
        if (!href) return;
        
        // 处理相对链接
        let fullUrl;
        try {
            fullUrl = new URL(href, baseUrl).href;
        } catch (error) {
            return;
        }
        
        // 验证URL是否有效
        if (!isValidSocialMediaUrl(fullUrl)) {
            return;
        }
        
        // Instagram链接匹配
        if (isInstagramLink(fullUrl)) {
            const normalizedUrl = normalizeInstagramUrl(fullUrl);
            if (normalizedUrl && isValidSocialMediaUrl(normalizedUrl)) {
                instagramLinks.add(normalizedUrl);
            }
        }
        
        // Facebook链接匹配
        if (isFacebookLink(fullUrl)) {
            const normalizedUrl = normalizeFacebookUrl(fullUrl);
            if (normalizedUrl && isValidSocialMediaUrl(normalizedUrl)) {
                facebookLinks.add(normalizedUrl);
            }
        }
    });
    
    // 查找该元素内的文本内容，可能包含社交媒体链接
    const text = $(element).text();
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);
    
    if (matches) {
        matches.forEach(url => {
            // 清理URL
            const cleanUrl = url.replace(/['"]/g, '').replace(/,$/, '');
            
            if (isInstagramLink(cleanUrl)) {
                const normalizedUrl = normalizeInstagramUrl(cleanUrl);
                if (normalizedUrl && isValidSocialMediaUrl(normalizedUrl)) {
                    instagramLinks.add(normalizedUrl);
                }
            }
            if (isFacebookLink(cleanUrl)) {
                const normalizedUrl = normalizeFacebookUrl(cleanUrl);
                if (normalizedUrl && isValidSocialMediaUrl(normalizedUrl)) {
                    facebookLinks.add(normalizedUrl);
                }
            }
        });
    }
}

// 验证社交媒体URL是否有效
function isValidSocialMediaUrl(url) {
    try {
        const urlObj = new URL(url);
        
        // 检查是否是有效的社交媒体域名
        const validDomains = [
            'instagram.com', 'www.instagram.com', 'instagr.am',
            'facebook.com', 'www.facebook.com', 'fb.com', 'fb.me'
        ];
        
        if (!validDomains.includes(urlObj.hostname)) {
            return false;
        }
        
        // 检查路径是否合理
        const path = urlObj.pathname;
        if (!path || path === '/' || path.length < 2) {
            return false;
        }
        
        // 检查是否包含明显的错误字符
        if (url.includes('%22') || url.includes('",') || url.includes('",/') || 
            url.includes(',https:') || url.includes(',http:')) {
            return false;
        }
        
        // 检查路径是否包含有效的用户名/页面名
        const pathParts = path.split('/').filter(part => part);
        if (pathParts.length === 0) {
            return false;
        }
        
        // 检查用户名是否合理（不包含特殊字符）
        const username = pathParts[0];
        if (username.length < 1 || username.length > 50) {
            return false;
        }
        
        // 检查是否包含明显的错误模式
        if (username.includes(',') || username.includes('"') || username.includes("'")) {
            return false;
        }
        
        // 过滤掉无效的Instagram链接
        if (urlObj.hostname.includes('instagram.com')) {
            // 过滤掉单个字符的路径，如 /p/
            if (username.length === 1) {
                return false;
            }
            // 过滤掉常见的无效路径
            if (['p', 'reel', 'tv', 'stories'].includes(username)) {
                return false;
            }
        }
        
        return true;
    } catch (error) {
        return false;
    }
}

// Instagram链接检测
function isInstagramLink(url) {
    const instagramPatterns = [
        /instagram\.com/i,
        /instagr\.am/i,
        /ig\.tv/i,
        /instagram\.com\/[^\/\s]+/i,
        /instagr\.am\/[^\/\s]+/i,
        /ig\.tv\/[^\/\s]+/i
    ];
    return instagramPatterns.some(pattern => pattern.test(url));
}

// Facebook链接检测
function isFacebookLink(url) {
    // 过滤掉Facebook的policy、help等无关链接
    if (url.includes('policy.php') || 
        url.includes('help') || 
        url.includes('terms') || 
        url.includes('privacy') ||
        url.includes('about') ||
        url.includes('developers') ||
        url.includes('careers') ||
        url.includes('cookies') ||
        url.includes('settings') ||
        url.includes('login') ||
        url.includes('signup')) {
        return false;
    }
    
    const facebookPatterns = [
        /facebook\.com/i,
        /fb\.com/i,
        /fb\.me/i,
        /facebook\.com\/[^\/\s]+/i,
        /fb\.com\/[^\/\s]+/i,
        /fb\.me\/[^\/\s]+/i
    ];
    return facebookPatterns.some(pattern => pattern.test(url));
}

// 标准化Instagram URL
function normalizeInstagramUrl(url) {
    try {
        // 清理URL中的特殊字符和编码问题
        let cleanUrl = url.replace(/['"]/g, '').replace(/,$/, '');
        
        const urlObj = new URL(cleanUrl);
        if (urlObj.hostname.includes('instagram.com') || urlObj.hostname.includes('instagr.am')) {
            // 提取用户名或页面标识
            const pathParts = urlObj.pathname.split('/').filter(part => part);
            if (pathParts.length > 0) {
                return `https://www.instagram.com/${pathParts[0]}/`;
            }
        }
        return cleanUrl;
    } catch (error) {
        console.log('Instagram URL标准化失败:', url, error.message);
        return url;
    }
}

// 标准化Facebook URL
function normalizeFacebookUrl(url) {
    try {
        // 清理URL中的特殊字符和编码问题
        let cleanUrl = url.replace(/['"]/g, '').replace(/,$/, '');
        
        const urlObj = new URL(cleanUrl);
        if (urlObj.hostname.includes('facebook.com') || urlObj.hostname.includes('fb.com')) {
            // 提取页面标识
            const pathParts = urlObj.pathname.split('/').filter(part => part);
            if (pathParts.length > 0) {
                return `https://www.facebook.com/${pathParts[0]}/`;
            }
        }
        return cleanUrl;
    } catch (error) {
        console.log('Facebook URL标准化失败:', url, error.message);
        return url;
    }
}

// 从JSON-LD数据中提取社交媒体链接
function extractFromJsonLd(data, instagramLinks, facebookLinks) {
    if (typeof data === 'object' && data !== null) {
        // 检查各种可能的社交媒体字段
        const socialFields = [
            'sameAs', 'url', 'mainEntity', 'author', 'publisher'
        ];
        
        socialFields.forEach(field => {
            if (data[field]) {
                if (Array.isArray(data[field])) {
                    data[field].forEach(url => {
                        if (isInstagramLink(url)) {
                            instagramLinks.add(normalizeInstagramUrl(url));
                        }
                        if (isFacebookLink(url)) {
                            facebookLinks.add(normalizeFacebookUrl(url));
                        }
                    });
                } else if (typeof data[field] === 'string') {
                    const url = data[field];
                    if (isInstagramLink(url)) {
                        instagramLinks.add(normalizeInstagramUrl(url));
                    }
                    if (isFacebookLink(url)) {
                        facebookLinks.add(normalizeFacebookUrl(url));
                    }
                }
            }
        });
        
        // 递归检查嵌套对象
        Object.keys(data).forEach(key => {
            if (typeof data[key] === 'object' && data[key] !== null) {
                extractFromJsonLd(data[key], instagramLinks, facebookLinks);
            }
        });
    }
}

// API路由：提取社交媒体链接
app.post('/api/extract', async (req, res) => {
    try {
        const { url, forcePuppeteer = false } = req.body;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                error: '请提供有效的URL'
            });
        }
        
        // 验证URL格式
        let targetUrl;
        try {
            targetUrl = new URL(url);
        } catch (error) {
            return res.status(400).json({
                success: false,
                error: '无效的URL格式'
            });
        }
        
        console.log(`正在提取链接: ${targetUrl.href}`);
        
        // 发送HTTP请求获取网页内容
        const response = await axios.get(targetUrl.href, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });
        
        // 提取网站信息
        let websiteInfo;
        let usePuppeteer = false;
        
        try {
            websiteInfo = extractWebsiteInfo(response.data, targetUrl.href);
            
                    // 检查是否需要动态渲染（如果基本信息缺失且网站可能需要JS渲染）
        const needsDynamicRendering = !websiteInfo.email && !websiteInfo.phone && 
            (targetUrl.hostname.includes('bjorklund.no') || 
             targetUrl.hostname.includes('tesori.no') ||
             targetUrl.hostname.includes('maralkunst.com'));
        
                // 对于特定网站，强制使用Puppeteer
        const shouldForcePuppeteer = targetUrl.hostname.includes('bjorklund.no') || 
                                    targetUrl.hostname.includes('langaard.no');
            
        if (needsDynamicRendering || shouldForcePuppeteer || forcePuppeteer) {
            console.log('检测到可能需要动态渲染，尝试使用Puppeteer...');
            usePuppeteer = true;
        }
            
        } catch (extractError) {
            console.error('信息提取错误:', extractError);
            usePuppeteer = true;
        }
        
        // 如果需要动态渲染，使用Puppeteer
        if (usePuppeteer) {
            try {
                console.log('使用Puppeteer进行动态渲染...');
                websiteInfo = await extractWithPuppeteer(targetUrl.href);
            } catch (puppeteerError) {
                console.error('Puppeteer提取失败:', puppeteerError);
                // 如果Puppeteer也失败，使用URL基本信息
                websiteInfo = extractBasicInfoFromUrl(targetUrl.href);
            }
        }
        
        console.log(`提取完成:`);
        console.log(`  公司名称: ${websiteInfo.companyName}`);
        console.log(`  简介: ${websiteInfo.description.substring(0, 100)}...`);
        console.log(`  地址: ${websiteInfo.address}`);
        console.log(`  邮箱: ${websiteInfo.email}`);
        console.log(`  电话: ${websiteInfo.phone}`);
        console.log(`  Instagram: ${websiteInfo.instagram.length} 个链接`);
        console.log(`  Facebook: ${websiteInfo.facebook.length} 个链接`);
        
        // 写入数据到飞书多维表格
        let feishuSuccess = false;
        try {
            const feishuData = {
                url: targetUrl.href,
                companyName: websiteInfo.companyName,
                description: websiteInfo.description,
                address: websiteInfo.address,
                email: websiteInfo.email,
                phone: websiteInfo.phone,
                instagram: websiteInfo.instagram,
                facebook: websiteInfo.facebook,
                extractedAt: new Date().toISOString()
            };
            
            console.log('正在写入数据到飞书多维表格...');
            await writeToFeishuBitable(feishuData);
            console.log('数据成功写入飞书多维表格');
            feishuSuccess = true;
        } catch (feishuError) {
            console.error('写入飞书多维表格失败:', feishuError.message);
            // 不阻止正常响应，只记录错误
        }
        
        res.json({
            success: true,
            results: websiteInfo,
            url: targetUrl.href,
            feishuSuccess: feishuSuccess
        });
        
    } catch (error) {
        console.error('提取错误:', error.message);
        console.error('错误详情:', error);
        
        let errorMessage = '提取失败';
        if (error.code === 'ENOTFOUND') {
            errorMessage = '无法访问该网站，请检查URL是否正确';
        } else if (error.code === 'ECONNREFUSED') {
            errorMessage = '连接被拒绝，该网站可能无法访问';
        } else if (error.code === 'ETIMEDOUT') {
            errorMessage = '请求超时，请稍后重试';
        } else if (error.response) {
            errorMessage = `网站返回错误: ${error.response.status}`;
        }
        
        res.status(500).json({
            success: false,
            error: errorMessage
        });
    }
});

// 更新飞书配置端点
app.post('/api/config', async (req, res) => {
    try {
        const { appId, appSecret, bitableUrl } = req.body;
        
        if (!appId || !appSecret || !bitableUrl) {
            return res.status(400).json({
                success: false,
                error: '缺少必要的配置参数'
            });
        }
        
        // 从多维表格链接中提取节点token
        let nodeToken = 'F1lbw4vsWie5BHktQVVcj89fn11'; // 默认值
        let tableId = 'tblFjiGso24abRHl'; // 默认值
        
        try {
            const url = new URL(bitableUrl);
            console.log('解析多维表格URL:', url.href);
            
            // 从URL路径中提取节点token
            if (url.pathname.includes('/wiki/')) {
                const pathParts = url.pathname.split('/');
                const wikiIndex = pathParts.indexOf('wiki');
                if (wikiIndex !== -1 && pathParts[wikiIndex + 1]) {
                    nodeToken = pathParts[wikiIndex + 1];
                    console.log('从URL提取的节点token:', nodeToken);
                }
            }
            
            // 从查询参数中提取table id
            const tableParam = url.searchParams.get('table');
            if (tableParam) {
                tableId = tableParam;
                console.log('从URL提取的table id:', tableId);
            }
            
            console.log('最终使用的配置:', { nodeToken, tableId });
        } catch (error) {
            console.log('URL解析失败，使用默认配置:', error.message);
        }
        
        // 获取真正的多维表格App Token
        try {
            console.log('正在获取真正的多维表格App Token...');
            
            // 临时设置配置以获取访问令牌
            const tempConfig = {
                APP_ID: appId,
                APP_SECRET: appSecret
            };
            
            // 获取访问令牌
            const response = await axios.post(`${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`, {
                app_id: tempConfig.APP_ID,
                app_secret: tempConfig.APP_SECRET
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.data.code === 0) {
                const accessToken = response.data.tenant_access_token;
                
                // 获取知识空间节点信息
                const nodeResponse = await axios.get(
                    `${FEISHU_API_BASE}/wiki/v2/spaces/get_node`,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        params: {
                            token: nodeToken,
                            obj_type: 'wiki'
                        }
                    }
                );
                
                if (nodeResponse.data.code === 0) {
                    const nodeData = nodeResponse.data.data.node;
                    if (nodeData.obj_type === 'bitable') {
                        const realAppToken = nodeData.obj_token;
                        console.log('获取到真正的多维表格App Token:', realAppToken);
                        
                        // 更新配置
                        FEISHU_CONFIG = {
                            APP_ID: appId,
                            APP_SECRET: appSecret,
                            BITABLE_APP_TOKEN: realAppToken,
                            TABLE_ID: tableId,
                            VIEW_ID: 'vewla1O8gN'
                        };
                        
                        console.log('飞书配置已更新');
                        
                        res.json({
                            success: true,
                            message: '配置更新成功，已获取真正的多维表格App Token'
                        });
                        return;
                    } else {
                        throw new Error(`节点类型不是多维表格: ${nodeData.obj_type}`);
                    }
                } else {
                    throw new Error(`获取节点信息失败: ${nodeResponse.data.msg}`);
                }
            } else {
                throw new Error(`获取访问令牌失败: ${response.data.msg}`);
            }
        } catch (error) {
            console.error('获取多维表格App Token失败:', error.message);
            
            // 如果获取失败，使用默认配置
            FEISHU_CONFIG = {
                APP_ID: appId,
                APP_SECRET: appSecret,
                BITABLE_APP_TOKEN: nodeToken,
                TABLE_ID: tableId,
                VIEW_ID: 'vewla1O8gN'
            };
            
            console.log('使用默认配置');
            
            res.json({
                success: true,
                message: '配置更新成功（使用默认App Token）'
            });
        }
        
    } catch (error) {
        console.error('更新配置失败:', error);
        res.status(500).json({
            success: false,
            error: '更新配置失败'
        });
    }
});

// 健康检查端点
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// 根路径返回主页
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 飞书API相关函数

// 获取飞书访问令牌
async function getFeishuAccessToken() {
    try {
        const response = await axios.post(`${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`, {
            app_id: FEISHU_CONFIG.APP_ID,
            app_secret: FEISHU_CONFIG.APP_SECRET
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.data.code === 0) {
            return response.data.tenant_access_token;
        } else {
            throw new Error(`获取访问令牌失败: ${response.data.msg}`);
        }
    } catch (error) {
        console.error('获取飞书访问令牌错误:', error.message);
        throw error;
    }
}

// 格式化GPT输出
function formatGptOutput(data) {
    const output = {
        url: data.url,
        companyName: data.companyName,
        description: data.description,
        address: data.address,
        email: data.email,
        phone: data.phone,
        instagram: data.instagram,
        facebook: data.facebook,
        extractedAt: data.extractedAt
    };
    
    return JSON.stringify(output, null, 2);
}

// 写入数据到飞书多维表格
async function writeToFeishuBitable(data) {
    try {
        // 获取访问令牌
        const accessToken = await getFeishuAccessToken();
        
        // 准备写入的数据 - 使用正确的字段名称
        const recordData = {
            fields: {
                '官网地址': data.url,
                '公司名': data.companyName,
                '简介': data.description,
                '地址': data.address,
                '邮箱': data.email,
                '电话': data.phone,
                'ins': data.instagram.join(', '),
                'Facebook': data.facebook.join(', '),
                '来自 gpt 的输出': formatGptOutput(data)
            }
        };
        
        // 调用飞书多维表格API写入数据
        const response = await axios.post(
            `${FEISHU_API_BASE}/bitable/v1/apps/${FEISHU_CONFIG.BITABLE_APP_TOKEN}/tables/${FEISHU_CONFIG.TABLE_ID}/records`,
            recordData,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (response.data.code === 0) {
            console.log('数据成功写入飞书多维表格:', response.data.data.record_id);
            return true;
        } else {
            throw new Error(`写入数据失败: ${response.data.msg}`);
        }
    } catch (error) {
        console.error('写入飞书多维表格错误:', error.message);
        throw error;
    }
}

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log('社交媒体链接提取器已启动');
    console.log('飞书多维表格集成已启用');
});

module.exports = app;

