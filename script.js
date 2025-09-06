// 网站信息提取器 - 前端JavaScript
class WebsiteExtractor {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupIdentity();
    }

    setupEventListeners() {
        // 提取按钮
        document.getElementById('extractBtn').addEventListener('click', () => {
            this.extractLinks();
        });

        // 回车键提取
        document.getElementById('urlInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.extractLinks();
            }
        });
    }

    // 检测当前环境并返回正确的API端点
    getApiEndpoint() {
        // 检查是否在 Netlify 环境
        if (window.location.hostname.includes('netlify.app') || window.location.hostname.includes('unrivaled-pavlova')) {
            console.log('检测到 Netlify 环境，使用 Netlify Functions');
            return '/.netlify/functions/extract';
        }
        // 本地环境
        console.log('检测到本地环境，使用本地 API');
        return '/api/extract';
    }

    // 获取飞书配置（本地加密存储）
    getFeishuConfig() {
        try {
            const encryptedData = localStorage.getItem('feishu_config_encrypted');
            if (!encryptedData) {
                console.log('未找到飞书配置');
                return null;
            }

            const cfg = this.decryptConfig(encryptedData);
            const tableId = this.extractTableIdFromUrl(cfg.bitableUrl);
            const appToken = this.extractAppTokenFromUrl(cfg.bitableUrl);

            console.log('获取到飞书配置(本地):', {
                appId: cfg.appId,
                appSecret: cfg.appSecret ? (cfg.appSecret.substring(0, 3) + '***' + cfg.appSecret.slice(-2)) : '未设置',
                tableId,
                appToken
            });

            return {
                appId: cfg.appId,
                appSecret: cfg.appSecret,
                tableId,
                bitableAppToken: appToken
            };
        } catch (error) {
            console.error('获取飞书配置失败:', error);
            return null;
        }
    }

    // 解密配置
    decryptConfig(encryptedData) {
        // 使用与config.js相同的加密密钥生成方式
        const userAgent = navigator.userAgent;
        const screenInfo = `${screen.width}x${screen.height}`;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const baseString = `${userAgent}|${screenInfo}|${timezone}|feishu_config`;
        const key = CryptoJS.SHA256(baseString).toString();
        
        const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
        return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
    }

    // 从多维表格URL中提取表格ID（根据飞书官方文档）
    extractTableIdFromUrl(url) {
        try {
            const urlObj = new URL(url);
            console.log('解析URL:', url);
            console.log('URL路径:', urlObj.pathname);
            
            // 方式一：从URL路径中直接提取table_id
            // 格式：https://example.feishu.cn/base/abc1234567890/tblsRc9GRRXKqhvW
            const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
            console.log('路径部分:', pathParts);
            
            // 查找以 'tbl' 开头的部分（表格ID）
            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                if (part.startsWith('tbl') && part.length > 10) {
                    console.log('从路径中找到表格ID:', part);
                    return part;
                }
            }
            
            // 方式二：从URL参数中提取table ID
            const tableParam = urlObj.searchParams.get('table');
            if (tableParam && tableParam.startsWith('tbl')) {
                console.log('从URL参数提取到表格ID:', tableParam);
                return tableParam;
            }
            
            // 方式三：从URL参数中提取view参数（可能包含表格信息）
            const viewParam = urlObj.searchParams.get('view');
            if (viewParam && viewParam.startsWith('tbl')) {
                console.log('从view参数提取到表格ID:', viewParam);
                return viewParam;
            }
            
            // 如果都没找到，尝试从路径的最后部分提取
            const lastPart = pathParts[pathParts.length - 1];
            if (lastPart && lastPart.length > 10) {
                console.log('使用URL最后部分作为表格ID:', lastPart);
                return lastPart;
            }
            
            console.warn('无法从URL中提取表格ID，返回原始URL');
            return url;
        } catch (error) {
            console.error('提取表格ID失败:', error);
            return url; // 如果提取失败，返回原始URL
        }
    }

    // 从URL中解析 appToken（wiki 节点 token 或 base app token）
    extractAppTokenFromUrl(url) {
        try {
            const m1 = url.match(/\/wiki\/([A-Za-z0-9]+)/);
            if (m1 && m1[1]) return m1[1];
            const m2 = url.match(/\/base\/([A-Za-z0-9]+)/);
            if (m2 && m2[1]) return m2[1];
        } catch (_) {}
        return undefined;
    }

    async extractLinks() {
        const urlInput = document.getElementById('urlInput');
        const url = urlInput.value.trim();

        if (!url) {
            this.showError('请输入网站地址');
            return;
        }

        // 验证URL格式
        try {
            new URL(url);
        } catch (error) {
            this.showError('请输入有效的网站地址');
            return;
        }

        this.showLoading();

        try {
            // 读取本地配置（如无则后端会仅返回提取结果并跳过写入）
            const feishuConfig = this.getFeishuConfig();
            console.log('本地飞书配置存在性:', {
                hasAppId: !!feishuConfig?.appId,
                hasAppSecret: !!feishuConfig?.appSecret,
                hasTableId: !!feishuConfig?.tableId,
                hasBitableAppToken: !!feishuConfig?.bitableAppToken
            });

            // 调用提取接口（统一普通 fetch，配置通过 body 传递）
            const apiEndpoint = this.getApiEndpoint();
            console.log('使用API端点:', apiEndpoint);

            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, feishuConfig })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.ok) {
                const websiteInfo = data.results;
                websiteInfo.url = data.url;
                
                this.displayResults(websiteInfo);
                this.hideLoading();
                
                console.log('服务端配置状态:', data.configStatus);
                if (data.feishuStatus === 'success' || data.feishuSuccess) {
                    this.showFeishuSuccess();
                } else if (data.feishuStatus === 'skipped') {
                    this.showFeishuInfo(data.feishuMessage || '未配置飞书，已跳过写入');
                } else {
                    this.showFeishuError();
                }
            } else {
                throw new Error(data.message || data.error || '提取失败');
            }
        } catch (e) {
            console.error('提取失败:', e);
            this.hideLoading();
            
            const msg = e.message === 'user_config_missing'
                ? '未找到你的个人配置，请先保存后重试。'
                : e.message === 'auth_required'
                ? '请先登录。'
                : e.message === 'enc_key_mismatch'
                ? '配置加密密钥已变更，请重新保存配置。'
                : e.message === 'missing_config'
                ? '需要配置飞书信息才能使用此功能。请先配置飞书应用信息。'
                : e.message === 'storage_unavailable'
                ? '后端存储未启用，无法保存用户配置。但已返回提取结果。'
                : e.message === 'missing_url'
                ? '请输入有效的网站URL。'
                : `提取失败（${e.message}）`;
            
            this.showError(msg);
        }
    }

    displayResults(data) {
        const resultsContainer = document.getElementById('results');
        
        // 显示提取的信息
        document.getElementById('websiteUrl').textContent = data.url || '未找到';
        document.getElementById('companyName').textContent = data.companyName || '未找到';
        document.getElementById('description').textContent = this.truncateText(data.description, 200) || '未找到';
        document.getElementById('address').textContent = data.address || '未找到';
        document.getElementById('email').textContent = data.email || '未找到';
        document.getElementById('phone').textContent = data.phone || '未找到';
        
        // 处理社交媒体链接 - 以纯文本形式显示
        const instagramLinks = data.instagram || [];
        const facebookLinks = data.facebook || [];
        
        document.getElementById('instagramLinks').textContent = 
            instagramLinks.length > 0 ? instagramLinks.join(', ') : '未找到';
        document.getElementById('facebookLinks').textContent = 
            facebookLinks.length > 0 ? facebookLinks.join(', ') : '未找到';

        // 显示结果区域
        resultsContainer.style.display = 'block';
        resultsContainer.classList.add('fade-in');

        // 滚动到结果区域
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    showFeishuSuccess() {
        const statusDiv = document.getElementById('feishuStatus');
        const successDiv = document.getElementById('feishuSuccess');
        const errorDiv = document.getElementById('feishuError');
        const infoDiv = document.getElementById('feishuInfo');

        statusDiv.style.display = 'block';
        successDiv.style.display = 'block';
        errorDiv.style.display = 'none';
        if (infoDiv) infoDiv.style.display = 'none';
    }

    showFeishuError() {
        const statusDiv = document.getElementById('feishuStatus');
        const successDiv = document.getElementById('feishuSuccess');
        const errorDiv = document.getElementById('feishuError');
        const infoDiv = document.getElementById('feishuInfo');

        statusDiv.style.display = 'block';
        successDiv.style.display = 'none';
        errorDiv.style.display = 'block';
        if (infoDiv) infoDiv.style.display = 'none';
    }

    showFeishuInfo(message) {
        const statusDiv = document.getElementById('feishuStatus');
        const successDiv = document.getElementById('feishuSuccess');
        const errorDiv = document.getElementById('feishuError');
        const infoDiv = document.getElementById('feishuInfo');

        statusDiv.style.display = 'block';
        if (successDiv) successDiv.style.display = 'none';
        if (errorDiv) errorDiv.style.display = 'none';
        if (infoDiv) {
            infoDiv.style.display = 'block';
            const span = infoDiv.querySelector('span');
            if (span) span.textContent = message;
        }
    }

    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('results').style.display = 'none';
        document.getElementById('feishuStatus').style.display = 'none';
        
        // 禁用提取按钮，防止重复点击
        const extractBtn = document.querySelector('button[onclick="extractor.extractLinks()"]');
        if (extractBtn) {
            extractBtn.disabled = true;
            extractBtn.textContent = '提取中...';
        }
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
        
        // 恢复提取按钮
        const extractBtn = document.querySelector('button[onclick="extractor.extractLinks()"]');
        if (extractBtn) {
            extractBtn.disabled = false;
            extractBtn.textContent = '开始提取';
        }
    }

    showError(message) {
        alert(message);
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    // 设置身份验证
    setupIdentity() {
        // 登录按钮
        document.getElementById('loginBtn').addEventListener('click', () => {
            netlifyIdentity.open('login');
        });

        // 退出按钮
        document.getElementById('logoutBtn').addEventListener('click', () => {
            netlifyIdentity.logout();
        });

        // 登录事件
        netlifyIdentity.on('login', (user) => {
            console.log('用户已登录:', user);
            netlifyIdentity.close();
            this.updateLoginStatus();
        });

        // 退出事件
        netlifyIdentity.on('logout', () => {
            console.log('用户已退出');
            this.updateLoginStatus();
        });

        // 初始化登录状态
        this.updateLoginStatus();
        
        // 本地优先模式：不再强制检查服务器侧的个人配置
    }

    // 更新登录状态显示
    updateLoginStatus() {
        const user = netlifyIdentity.currentUser();
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');

        if (user) {
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'inline-block';
            console.log('当前用户:', user.email);
        } else {
            loginBtn.style.display = 'inline-block';
            logoutBtn.style.display = 'none';
            console.log('用户未登录');
        }
    }

    // 带身份验证的fetch - 返回更清晰的错误
    async authedFetch(path, options = {}) {
        const u = netlifyIdentity.currentUser();
        if (!u) { 
            netlifyIdentity.open('login'); 
            throw new Error('auth_required'); 
        }
        const token = await u.jwt();
        const resp = await fetch(path, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...(options.headers || {})
            }
        });
        let data = null; 
        try { 
            data = await resp.json(); 
        } catch {} 
        if (!resp.ok) {
            const err = new Error(data?.error || `http_${resp.status}`);
            err.status = resp.status; 
            throw err;
        }
        return data;
    }

    // 检查配置状态 - 返回详细状态信息
    async checkConfigStatus() {
        try {
            const data = await this.authedFetch('/.netlify/functions/config-get'); // 需要登录
            return { ok: true, config: data.config }; // appSecret 是打码的
        } catch (e) {
            if (e.message === 'auth_required' || e.status === 401) {
                return { ok: false, reason: 'auth_required' };
            }
            if (e.status === 404 || e.message === 'not_found') {
                return { ok: false, reason: 'user_config_missing' };
            }
            if (e.status === 409 || e.message === 'enc_key_mismatch') {
                return { ok: false, reason: 'enc_key_mismatch' };
            }
            if (e.status === 503 || e.message === 'storage_unavailable') {
                return { ok: false, reason: 'storage_unavailable' };
            }
            return { ok: false, reason: e.message || 'unknown' };
        }
    }

    // 清除用户配置
    async clearUserConfig() {
        try {
            await this.authedFetch('/.netlify/functions/config-clear', {
                method: 'POST'
            });
            console.log('用户配置已清除');
            return { ok: true };
        } catch (e) {
            console.error('清除配置失败:', e);
            return { ok: false, error: e.message };
        }
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new WebsiteExtractor();
});
