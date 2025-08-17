// Sidebar JavaScript逻辑
class SidebarManager {
    constructor() {
        this.extractedData = null;
        this.history = [];
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.loadHistory();
    }

    setupEventListeners() {
        // 提取信息按钮
        document.getElementById('extractBtn').addEventListener('click', () => {
            this.extractInfo();
        });

        // 飞书配置按钮
        document.getElementById('configBtn').addEventListener('click', () => {
            this.openConfig();
        });

        // 复制结果按钮
        document.getElementById('copyBtn').addEventListener('click', () => {
            this.copyResults();
        });

        // 保存到飞书按钮
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveToFeishu();
        });

        // 历史记录按钮
        document.getElementById('historyBtn').addEventListener('click', () => {
            this.toggleHistory();
        });

        // 切换侧边栏按钮
        document.getElementById('toggleBtn').addEventListener('click', () => {
            this.toggleSidebar();
        });

        // URL输入框回车事件
        document.getElementById('urlInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.extractInfo();
            }
        });
    }

    async extractInfo() {
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
            // 获取当前活动标签页
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // 如果当前标签页不是目标URL，先导航到目标URL
            if (activeTab.url !== url) {
                await chrome.tabs.update(activeTab.id, { url: url });
                
                // 等待页面加载完成
                await new Promise((resolve) => {
                    const listener = (tabId, changeInfo) => {
                        if (tabId === activeTab.id && changeInfo.status === 'complete') {
                            chrome.tabs.onUpdated.removeListener(listener);
                            resolve();
                        }
                    };
                    chrome.tabs.onUpdated.addListener(listener);
                });
                
                // 额外等待一下确保页面完全渲染
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // 直接在当前页面执行提取脚本
            const results = await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: this.extractWebsiteData
            });

            if (results && results[0] && results[0].result) {
                const data = results[0].result;
                data.url = url; // 确保URL正确
                
                this.extractedData = data;
                this.displayResults(data);
                this.addToHistory(data);
                this.hideLoading();
            } else {
                throw new Error('提取失败：无法获取页面数据');
            }
        } catch (error) {
            console.error('提取信息失败:', error);
            this.hideLoading();
            this.showError('提取信息失败: ' + error.message);
        }
    }

    // 在页面中执行的提取函数
    extractWebsiteData() {
        function extractCompanyName() {
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

        function extractDescription() {
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

        function extractAddress() {
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
                    if (text && containsAddressKeywords(text)) {
                        return cleanAddress(text);
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

        function extractEmail() {
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

        function extractPhone() {
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

        function extractInstagramLinks() {
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
                    if (href && isValidInstagramUrl(href)) {
                        links.push(normalizeInstagramUrl(href));
                    }
                }
            }

            return [...new Set(links)]; // 去重
        }

        function extractFacebookLinks() {
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
                    if (href && isValidFacebookUrl(href)) {
                        links.push(normalizeFacebookUrl(href));
                    }
                }
            }

            return [...new Set(links)]; // 去重
        }

        function isValidInstagramUrl(url) {
            const cleanUrl = url.replace(/['"]/g, '').replace(/,$/, '');
            if (!cleanUrl.includes('instagram.com') && !cleanUrl.includes('instagr.am') && !cleanUrl.includes('ig.tv')) {
                return false;
            }
            
            // 过滤掉无效的URL
            const invalidPatterns = ['%22', '",', '",/', '/p/', '/reel/'];
            return !invalidPatterns.some(pattern => cleanUrl.includes(pattern));
        }

        function isValidFacebookUrl(url) {
            const cleanUrl = url.replace(/['"]/g, '').replace(/,$/, '');
            if (!cleanUrl.includes('facebook.com') && !cleanUrl.includes('fb.com') && !cleanUrl.includes('fb.me')) {
                return false;
            }
            
            // 过滤掉通用Facebook页面
            const genericPages = ['policy.php', 'help', 'terms', 'privacy', 'about', 'developers', 'careers', 'cookies', 'settings', 'login', 'signup'];
            return !genericPages.some(page => cleanUrl.includes(page));
        }

        function normalizeInstagramUrl(url) {
            let cleanUrl = url.replace(/['"]/g, '').replace(/,$/, '');
            if (!cleanUrl.startsWith('http')) {
                cleanUrl = 'https://' + cleanUrl;
            }
            return cleanUrl;
        }

        function normalizeFacebookUrl(url) {
            let cleanUrl = url.replace(/['"]/g, '').replace(/,$/, '');
            if (!cleanUrl.startsWith('http')) {
                cleanUrl = 'https://' + cleanUrl;
            }
            return cleanUrl;
        }

        function containsAddressKeywords(text) {
            const keywords = ['地址', 'address', 'location', '位置', 'contact', '联系', 'street', 'road', 'avenue'];
            return keywords.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()));
        }

        function cleanAddress(text) {
            // 清理地址文本，移除多余信息
            return text.replace(/\s+/g, ' ').trim().substring(0, 200);
        }

        // 执行提取
        try {
            return {
                companyName: extractCompanyName(),
                description: extractDescription(),
                address: extractAddress(),
                email: extractEmail(),
                phone: extractPhone(),
                instagram: extractInstagramLinks(),
                facebook: extractFacebookLinks()
            };
        } catch (error) {
            console.error('提取数据失败:', error);
            return {
                companyName: '',
                description: '',
                address: '',
                email: '',
                phone: '',
                instagram: [],
                facebook: []
            };
        }
    }

    displayResults(data) {
        const resultsDiv = document.getElementById('results');

        // 显示提取的信息
        document.getElementById('companyName').textContent = data.companyName || '未找到';
        document.getElementById('description').textContent = this.truncateText(data.description, 150) || '未找到';
        document.getElementById('address').textContent = data.address || '未找到';
        document.getElementById('email').textContent = data.email || '未找到';
        document.getElementById('phone').textContent = data.phone || '未找到';
        document.getElementById('instagram').textContent = data.instagram?.length > 0 ? `${data.instagram.length} 个链接` : '未找到';
        document.getElementById('facebook').textContent = data.facebook?.length > 0 ? `${data.facebook.length} 个链接` : '未找到';

        resultsDiv.style.display = 'block';
        resultsDiv.classList.add('fade-in');
        
        // 隐藏历史记录
        document.getElementById('historySection').style.display = 'none';
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    async openConfig() {
        // 打开配置页面
        chrome.tabs.create({
            url: chrome.runtime.getURL('config_sidebar.html')
        });
    }

    async copyResults() {
        if (!this.extractedData) {
            this.showError('没有可复制的数据');
            return;
        }

        try {
            const textToCopy = this.formatDataForCopy(this.extractedData);
            await navigator.clipboard.writeText(textToCopy);
            this.showSuccess('数据已复制到剪贴板');
        } catch (error) {
            console.error('复制失败:', error);
            this.showError('复制失败');
        }
    }

    formatDataForCopy(data) {
        return `网站信息提取结果：
        
网站地址: ${data.url}
公司名称: ${data.companyName || '未找到'}
简介: ${data.description || '未找到'}
地址: ${data.address || '未找到'}
邮箱: ${data.email || '未找到'}
电话: ${data.phone || '未找到'}
Instagram: ${data.instagram?.join(', ') || '未找到'}
Facebook: ${data.facebook?.join(', ') || '未找到'}

提取时间: ${new Date().toLocaleString()}`;
    }

    async saveToFeishu() {
        if (!this.extractedData) {
            this.showError('没有可保存的数据');
            return;
        }

        try {
            // 获取飞书配置
            const config = await this.getFeishuConfig();
            if (!config) {
                this.showError('请先配置飞书信息');
                return;
            }

            // 发送数据到飞书
            const success = await this.sendToFeishu(this.extractedData, config);
            
            if (success) {
                this.showFeishuSuccess();
            } else {
                this.showFeishuError();
            }
        } catch (error) {
            console.error('保存到飞书失败:', error);
            this.showFeishuError();
        }
    }

    async getFeishuConfig() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['feishuConfig'], (result) => {
                resolve(result.feishuConfig);
            });
        });
    }

    async sendToFeishu(data, config) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: 'sendToFeishu',
                data: data,
                config: config
            }, (response) => {
                resolve(response?.success || false);
            });
        });
    }

    addToHistory(data) {
        const historyItem = {
            id: Date.now(),
            url: data.url,
            companyName: data.companyName,
            description: this.truncateText(data.description, 100),
            timestamp: new Date().toISOString()
        };

        this.history.unshift(historyItem);
        
        // 限制历史记录数量
        if (this.history.length > 20) {
            this.history = this.history.slice(0, 20);
        }

        this.saveHistory();
        this.updateHistoryDisplay();
    }

    loadHistory() {
        chrome.storage.local.get(['extractionHistory'], (result) => {
            this.history = result.extractionHistory || [];
            this.updateHistoryDisplay();
        });
    }

    saveHistory() {
        chrome.storage.local.set({ extractionHistory: this.history });
    }

    updateHistoryDisplay() {
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = '';

        this.history.forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <h5>${item.companyName || '未知公司'}</h5>
                <p>${item.description || '无描述'}</p>
                <div class="time">${new Date(item.timestamp).toLocaleString()}</div>
            `;
            historyItem.addEventListener('click', () => {
                this.loadHistoryItem(item);
            });
            historyList.appendChild(historyItem);
        });
    }

    loadHistoryItem(item) {
        // 加载历史记录项到当前显示
        this.extractedData = {
            url: item.url,
            companyName: item.companyName,
            description: item.description,
            // 其他字段保持为空，因为历史记录只保存基本信息
            address: '',
            email: '',
            phone: '',
            instagram: [],
            facebook: []
        };
        
        this.displayResults(this.extractedData);
        
        // 将URL填入输入框
        document.getElementById('urlInput').value = item.url;
    }

    toggleHistory() {
        const historySection = document.getElementById('historySection');
        const resultsDiv = document.getElementById('results');
        
        if (historySection.style.display === 'none') {
            historySection.style.display = 'block';
            resultsDiv.style.display = 'none';
            historySection.classList.add('fade-in');
        } else {
            historySection.style.display = 'none';
            resultsDiv.style.display = 'block';
        }
    }

    toggleSidebar() {
        // 简化版本：直接关闭侧边栏
        // 由于Chrome API限制，我们简化这个功能
        console.log('侧边栏切换功能已简化');
    }

    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('results').style.display = 'none';
        document.getElementById('historySection').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    showError(message) {
        // 简单的错误提示
        alert(message);
    }

    showSuccess(message) {
        // 简单的成功提示
        alert(message);
    }

    showFeishuSuccess() {
        document.getElementById('feishuStatus').style.display = 'block';
        document.getElementById('feishuSuccess').style.display = 'block';
        document.getElementById('feishuError').style.display = 'none';
    }

    showFeishuError() {
        document.getElementById('feishuStatus').style.display = 'block';
        document.getElementById('feishuSuccess').style.display = 'none';
        document.getElementById('feishuError').style.display = 'block';
    }
}

// 初始化侧边栏管理器
document.addEventListener('DOMContentLoaded', () => {
    new SidebarManager();
});
