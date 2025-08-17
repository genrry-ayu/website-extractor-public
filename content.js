// Chrome扩展 Content Script
// 在网页中运行，负责提取信息

class ContentExtractor {
    constructor() {
        this.setupMessageListener();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'extractInfo') {
                this.extractInfo().then(sendResponse);
                return true; // 保持消息通道开放
            }
        });
    }

    async extractInfo() {
        try {
            const data = {
                companyName: this.extractCompanyName(),
                description: this.extractDescription(),
                address: this.extractAddress(),
                email: this.extractEmail(),
                phone: this.extractPhone(),
                instagram: this.extractInstagramLinks(),
                facebook: this.extractFacebookLinks(),
                url: window.location.href
            };

            return {
                success: true,
                data: data
            };
        } catch (error) {
            console.error('提取信息失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    extractCompanyName() {
        // 从title标签提取
        const title = document.title?.trim();
        if (title) {
            const cleanTitle = title.replace(/[-|–|—|–|—].*$/, '').trim();
            if (cleanTitle && cleanTitle.length > 0 && cleanTitle.length < 100) {
                return cleanTitle;
            }
        }

        // 从logo和品牌区域提取
        const logoSelectors = [
            '.logo', '.brand', '.company-name', '.site-name',
            'h1', '.logo-text', '.brand-name', '[class*="logo"]',
            '.site-title', '.brand-logo', '.company-logo'
        ];

        for (const selector of logoSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                const text = element.textContent?.trim();
                if (text && text.length > 0 && text.length < 100) {
                    return text;
                }
            }
        }

        // 从域名提取
        const hostname = window.location.hostname;
        if (hostname && hostname !== 'localhost') {
            return hostname.replace(/^www\./, '').split('.')[0];
        }

        return '';
    }

    extractDescription() {
        // 从meta description提取
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && metaDesc.content) {
            return metaDesc.content.trim();
        }

        // 从Open Graph description提取
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc && ogDesc.content) {
            return ogDesc.content.trim();
        }

        // 从页面内容提取
        const paragraphs = document.querySelectorAll('p');
        for (const p of paragraphs) {
            const text = p.textContent?.trim();
            if (text && text.length > 50 && text.length < 300) {
                return text;
            }
        }

        return '';
    }

    extractAddress() {
        // 查找地址相关的文本
        const addressKeywords = ['地址', 'address', 'location', '位置', 'contact', '联系'];
        const addressSelectors = [
            '.address', '.location', '.contact-info', '.footer',
            '[class*="address"]', '[class*="location"]', '[class*="contact"]'
        ];

        // 从特定区域查找
        for (const selector of addressSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                const text = element.textContent?.trim();
                if (text && this.containsAddressKeywords(text)) {
                    return this.cleanAddress(text);
                }
            }
        }

        // 从页面文本中查找地址模式
        const addressPattern = /([A-Za-zæøåÆØÅ\s]+\.?\s*\d+[A-Za-zæøåÆØÅ\s]*,\s*\d{4}\s*[A-Za-zæøåÆØÅ\s]+)/;
        const bodyText = document.body.textContent;
        const match = bodyText.match(addressPattern);
        if (match) {
            return match[1].trim();
        }

        return '';
    }

    extractEmail() {
        // 查找邮箱地址
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const bodyText = document.body.textContent;
        const emails = bodyText.match(emailPattern);
        
        if (emails && emails.length > 0) {
            // 过滤掉明显的无效邮箱
            const validEmails = emails.filter(email => 
                !email.includes('example') && 
                !email.includes('test') && 
                email.length < 100
            );
            return validEmails[0] || '';
        }

        return '';
    }

    extractPhone() {
        // 查找电话号码
        const phonePatterns = [
            /(\+47\s*\d{2}\s*\d{2}\s*\d{2}\s*\d{2})/g, // 挪威国际格式
            /(\d{2}\s*\d{2}\s*\d{2}\s*\d{2})/g, // 挪威本地格式
            /(\+\d{1,3}\s*\d{1,4}\s*\d{1,4}\s*\d{1,4})/g, // 国际格式
            /(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/g // 美国格式
        ];

        const bodyText = document.body.textContent;
        
        for (const pattern of phonePatterns) {
            const matches = bodyText.match(pattern);
            if (matches && matches.length > 0) {
                // 过滤掉明显的无效号码
                const validPhones = matches.filter(phone => 
                    !phone.includes('000') && 
                    !phone.includes('999') &&
                    phone.length > 7
                );
                if (validPhones.length > 0) {
                    return validPhones[0].trim();
                }
            }
        }

        return '';
    }

    extractInstagramLinks() {
        const links = [];
        const instagramSelectors = [
            'a[href*="instagram.com"]',
            'a[href*="instagr.am"]',
            'a[href*="ig.tv"]'
        ];

        for (const selector of instagramSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
                const href = element.href;
                if (href && this.isValidInstagramUrl(href)) {
                    links.push(this.normalizeInstagramUrl(href));
                }
            }
        }

        return [...new Set(links)]; // 去重
    }

    extractFacebookLinks() {
        const links = [];
        const facebookSelectors = [
            'a[href*="facebook.com"]',
            'a[href*="fb.com"]',
            'a[href*="fb.me"]'
        ];

        for (const selector of facebookSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
                const href = element.href;
                if (href && this.isValidFacebookUrl(href)) {
                    links.push(this.normalizeFacebookUrl(href));
                }
            }
        }

        return [...new Set(links)]; // 去重
    }

    isValidInstagramUrl(url) {
        const cleanUrl = url.replace(/['"]/g, '').replace(/,$/, '');
        if (!cleanUrl.includes('instagram.com') && !cleanUrl.includes('instagr.am') && !cleanUrl.includes('ig.tv')) {
            return false;
        }
        
        // 过滤掉无效的URL
        const invalidPatterns = ['%22', '",', '",/', '/p/', '/reel/'];
        return !invalidPatterns.some(pattern => cleanUrl.includes(pattern));
    }

    isValidFacebookUrl(url) {
        const cleanUrl = url.replace(/['"]/g, '').replace(/,$/, '');
        if (!cleanUrl.includes('facebook.com') && !cleanUrl.includes('fb.com') && !cleanUrl.includes('fb.me')) {
            return false;
        }
        
        // 过滤掉通用Facebook页面
        const genericPages = ['policy.php', 'help', 'terms', 'privacy', 'about', 'developers', 'careers', 'cookies', 'settings', 'login', 'signup'];
        return !genericPages.some(page => cleanUrl.includes(page));
    }

    normalizeInstagramUrl(url) {
        let cleanUrl = url.replace(/['"]/g, '').replace(/,$/, '');
        if (!cleanUrl.startsWith('http')) {
            cleanUrl = 'https://' + cleanUrl;
        }
        return cleanUrl;
    }

    normalizeFacebookUrl(url) {
        let cleanUrl = url.replace(/['"]/g, '').replace(/,$/, '');
        if (!cleanUrl.startsWith('http')) {
            cleanUrl = 'https://' + cleanUrl;
        }
        return cleanUrl;
    }

    containsAddressKeywords(text) {
        const keywords = ['地址', 'address', 'location', '位置', 'contact', '联系', 'street', 'road', 'avenue'];
        return keywords.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()));
    }

    cleanAddress(text) {
        // 清理地址文本，移除多余信息
        return text.replace(/\s+/g, ' ').trim().substring(0, 200);
    }
}

// 初始化内容提取器
new ContentExtractor();
