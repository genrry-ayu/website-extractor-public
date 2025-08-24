// 网站信息提取器 - 前端JavaScript
class WebsiteExtractor {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
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

    // 获取飞书配置
    getFeishuConfig() {
        try {
            // 从localStorage获取加密的配置
            const encryptedData = localStorage.getItem('feishu_config_encrypted');
            if (!encryptedData) {
                console.log('未找到飞书配置');
                return null;
            }

            // 解密配置
            const config = this.decryptConfig(encryptedData);
            console.log('获取到飞书配置:', { 
                feishuAppId: config.appId, 
                feishuAppSecret: config.appSecret ? (config.appSecret.substring(0, 10) + '...') : '未设置', 
                feishuTableId: config.bitableUrl 
            });
            
            // 检查App Secret长度
            if (config.appSecret && config.appSecret.length < 20) {
                console.warn('警告: App Secret长度异常，可能配置有误');
            }
            
            return {
                feishuAppId: config.appId,
                feishuAppSecret: config.appSecret,
                feishuTableId: this.extractTableIdFromUrl(config.bitableUrl)
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

    // 从多维表格URL中提取表格ID
    extractTableIdFromUrl(url) {
        try {
            const urlObj = new URL(url);
            
            // 首先尝试从URL参数中提取table ID
            const tableParam = urlObj.searchParams.get('table');
            if (tableParam) {
                console.log('从URL参数提取到表格ID:', tableParam);
                return tableParam;
            }
            
            // 从路径中提取
            const pathParts = urlObj.pathname.split('/');
            
            // 查找包含base或wiki的路径部分
            for (let i = 0; i < pathParts.length; i++) {
                if (pathParts[i] === 'base' || pathParts[i] === 'wiki') {
                    // 下一个部分通常是表格ID
                    if (pathParts[i + 1]) {
                        console.log('从路径提取到表格ID:', pathParts[i + 1]);
                        return pathParts[i + 1];
                    }
                }
            }
            
            // 如果都没找到，返回URL的最后一个部分
            const lastPart = pathParts[pathParts.length - 1];
            console.log('使用URL最后部分作为表格ID:', lastPart);
            return lastPart || url;
        } catch (error) {
            console.error('提取表格ID失败:', error);
            return url; // 如果提取失败，返回原始URL
        }
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
            const apiEndpoint = this.getApiEndpoint();
            console.log('使用API端点:', apiEndpoint);
            
            // 获取飞书配置
            const feishuConfig = this.getFeishuConfig();
            console.log('飞书配置状态:', feishuConfig ? '已配置' : '未配置');
            
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    url: url,
                    feishuConfig: feishuConfig
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                // 服务器返回的数据结构是 { success: true, results: websiteInfo, url: targetUrl.href, feishuSuccess: feishuSuccess }
                const websiteInfo = data.results;
                websiteInfo.url = data.url; // 添加URL到结果中
                
                this.displayResults(websiteInfo);
                this.hideLoading();
                
                // 显示飞书状态
                if (data.feishuSuccess) {
                    this.showFeishuSuccess();
                } else {
                    this.showFeishuError();
                }
            } else {
                throw new Error(data.error || '提取失败');
            }
        } catch (error) {
            console.error('提取失败:', error);
            this.hideLoading();
            this.showError('提取失败: ' + error.message);
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

        statusDiv.style.display = 'block';
        successDiv.style.display = 'block';
        errorDiv.style.display = 'none';
    }

    showFeishuError() {
        const statusDiv = document.getElementById('feishuStatus');
        const successDiv = document.getElementById('feishuSuccess');
        const errorDiv = document.getElementById('feishuError');

        statusDiv.style.display = 'block';
        successDiv.style.display = 'none';
        errorDiv.style.display = 'block';
    }

    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('results').style.display = 'none';
        document.getElementById('feishuStatus').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    showError(message) {
        alert(message);
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new WebsiteExtractor();
});
