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
            const response = await fetch('/api/extract', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: url })
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
        
        // 处理社交媒体链接
        const instagramLinks = data.instagram || [];
        const facebookLinks = data.facebook || [];
        
        document.getElementById('instagramLinks').textContent = 
            instagramLinks.length > 0 ? `${instagramLinks.length} 个链接` : '未找到';
        document.getElementById('facebookLinks').textContent = 
            facebookLinks.length > 0 ? `${facebookLinks.length} 个链接` : '未找到';

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
