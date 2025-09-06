// Sidebar版本的Content Script
// 在网页中运行，负责提取信息

class SidebarContentExtractor {
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

    // —— 国家检测 / JSON‑LD 解析 / 地址提取 ——
    detectCountryCode() {
        const host = location.hostname || '';
        const tld = host.split('.').pop();
        const map = { no:'NO', dk:'DK', se:'SE', fi:'FI', de:'DE', fr:'FR', nl:'NL', es:'ES', it:'IT', pt:'PT', pl:'PL', uk:'GB', gb:'GB', ie:'IE', ch:'CH', at:'AT', be:'BE', us:'US', ca:'CA', au:'AU', nz:'NZ' };
        const og = document.querySelector('meta[property="og:locale"]')?.content;
        if (og && og.includes('_')) return og.split('_')[1].toUpperCase();
        return map[tld] || 'US';
    }

    parseJsonLd() {
        let addr = null, phone = null, country = null;
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        const visit = (node) => {
            if (!node || typeof node !== 'object') return;
            const a = node.address;
            if (a) {
                const street = a.streetAddress || a.street || '';
                const city = a.addressLocality || a.city || '';
                const region = a.addressRegion || '';
                const postal = a.postalCode || '';
                const c = a.addressCountry || a.country || '';
                const parts = [street, postal, city, region, c].filter(Boolean).join(', ');
                if (parts && (!addr || parts.length > addr.length)) addr = parts;
                if (c) country = c;
            }
            if (!phone && node.telephone) phone = String(node.telephone);
            Object.values(node).forEach(visit);
        };
        scripts.forEach(s => { try { visit(JSON.parse(s.textContent || '{}')); } catch(_){} });
        return { addr, phone, country };
    }

    extractAddress() {
        const jsonld = this.parseJsonLd();
        if (jsonld.addr) return this.cleanAddress(jsonld.addr);

        const selectors = ['[itemprop="address"]','address','.address', '.location', '.contact-address','.business-address','.store-address','.office-address','[class*="address"]','[class*="location"]','[class*="contact"]'];
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) {
                const txt = (el.textContent || '').replace(/\s+/g,' ').trim();
                if (txt && this.containsAddressKeywords(txt)) return this.cleanAddress(txt);
            }
        }

        const cc = this.detectCountryCode();
        const body = (document.body.textContent || '').replace(/\s+/g,' ');
        const postal = {
            NO: /\b\d{4}\b/, DK:/\b\d{4}\b/, SE:/\b\d{3}\s?\d{2}\b/, FI:/\b\d{5}\b/, DE:/\b\d{5}\b/, FR:/\b\d{5}\b/, NL:/\b\d{4}\s?[A-Z]{2}\b/, ES:/\b\d{5}\b/, IT:/\b\d{5}\b/, PT:/\b\d{4}-\d{3}\b/, PL:/\b\d{2}-\d{3}\b/, GB:/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[ABD-HJLNP-UW-Z]{2})\b/i, US:/\b\d{5}(?:-\d{4})?\b/, CA:/\b[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\s?\d[ABCEGHJ-NPRSTV-Z]\d\b/i, AU:/\b\d{4}\b/, NZ:/\b\d{4}\b/ };
        const re = postal[cc];
        if (re) {
            const m = body.match(new RegExp(`([A-Za-zÀ-ÿ0-9,./\\-]{6,120}?\
${re.source}\s?[A-Za-zÀ-ÿ0-9,./\\-]{0,80})`,'i'));
            if (m) return this.cleanAddress(m[1]);
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
        const cc = this.detectCountryCode();
        // 1) tel: 链接
        const tel = document.querySelector('a[href^="tel:"]')?.getAttribute('href');
        if (tel) return this.formatPhone(tel.replace(/^tel:\s*/i,''), cc);

        const body = document.body.textContent || '';
        // 2) 多国常见格式
        const patterns = [
            /\+47\s*\d{2}\s*\d{2}\s*\d{2}\s*\d{2}/g,            // NO
            /\+44\s*\d{2,4}\s*\d{3,4}\s*\d{3,4}/g,                // UK
            /\+353\s*\d{1,3}\s*\d{3,4}\s*\d{3,4}/g,               // IE
            /\+1\s*\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g,               // US/CA
            /\+61\s*\d\s*\d{4}\s*\d{4}/g,                         // AU
            /\+\d{1,3}\s*\d{2,4}\s*\d{2,4}\s*\d{2,4}/g            // general
        ];
        for (const re of patterns) {
            const m = body.match(re);
            if (m && m[0]) return this.formatPhone(m[0], cc);
        }
        // 3) 简单数字兜底
        const m2 = body.match(/\+?\d[\d\s\-]{6,16}\d/);
        if (m2) return this.formatPhone(m2[0], cc);
        // 4) JSON-LD
        const j = this.parseJsonLd();
        if (j.phone) return this.formatPhone(j.phone, cc);
        return '';
    }

    formatPhone(input, cc) {
        let s = (input || '').replace(/[^\d+]/g,'');
        if (!s) return '';
        if (cc === 'NO') {
            if (s.startsWith('47') && s.length === 10) return '+47 ' + s.slice(2).replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4');
            if (s.length === 8) return '+47 ' + s.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4');
        }
        if (cc === 'IE') {
            if (s.startsWith('353')) return '+353 ' + s.slice(3).replace(/(\d{2,3})(\d{3,4})(\d{3,4})/, '$1 $2 $3');
            if (s.startsWith('0')) return '+353 ' + s.slice(1).replace(/(\d{2,3})(\d{3,4})(\d{3,4})/, '$1 $2 $3');
        }
        if (cc === 'UK' || cc === 'GB') {
            if (s.startsWith('44')) return '+44 ' + s.slice(2).replace(/(\d{2,4})(\d{3,4})(\d{3,4})/, '$1 $2 $3');
            if (s.startsWith('0')) return '+44 ' + s.slice(1).replace(/(\d{2,4})(\d{3,4})(\d{3,4})/, '$1 $2 $3');
        }
        if (cc === 'US' || cc === 'CA') {
            if (s.startsWith('1') && s.length === 11) return '+1 ' + s.slice(1).replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
            if (s.length === 10) return '+1 ' + s.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
        }
        if (cc === 'AU') {
            if (s.startsWith('61')) return '+61 ' + s.slice(2).replace(/(\d{1})(\d{4})(\d{4})/, '$1 $2 $3');
            if (s.startsWith('0')) return '+61 ' + s.slice(1).replace(/(\d{1})(\d{4})(\d{4})/, '$1 $2 $3');
        }
        // 通用
        if (s.startsWith('+')) return s.replace(/(\+\d{1,3})(\d{2,4})(\d{2,4})(\d{2,4})/, '$1 $2 $3 $4');
        return '+' + s;
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

// 初始化侧边栏内容提取器
new SidebarContentExtractor();
