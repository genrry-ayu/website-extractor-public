// Chrome扩展弹出窗口逻辑
class PopupManager {
    constructor() {
        this.currentTab = null;
        this.extractedData = null;
        this.init();
    }

    async init() {
        await this.getCurrentTab();
        this.setupEventListeners();
        this.displayCurrentUrl();
    }

    async getCurrentTab() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        this.currentTab = tab;
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
    }

    displayCurrentUrl() {
        const urlElement = document.getElementById('currentUrl');
        if (this.currentTab && this.currentTab.url) {
            const url = new URL(this.currentTab.url);
            urlElement.textContent = url.hostname;
        } else {
            urlElement.textContent = '无法获取当前网站';
        }
    }

    async extractInfo() {
        if (!this.currentTab) {
            this.showError('无法获取当前标签页信息');
            return;
        }

        this.showLoading();

        try {
            // 向content script发送消息，开始提取信息
            const response = await chrome.tabs.sendMessage(this.currentTab.id, {
                action: 'extractInfo'
            });

            if (response && response.success) {
                this.extractedData = response.data;
                this.displayResults(response.data);
                this.hideLoading();
            } else {
                throw new Error(response?.error || '提取失败');
            }
        } catch (error) {
            console.error('提取信息失败:', error);
            this.hideLoading();
            this.showError('提取信息失败: ' + error.message);
        }
    }

    displayResults(data) {
        const resultsDiv = document.getElementById('results');
        const infoGrid = document.querySelector('.info-grid');

        // 显示提取的信息
        document.getElementById('companyName').textContent = data.companyName || '未找到';
        document.getElementById('description').textContent = this.truncateText(data.description, 100) || '未找到';
        document.getElementById('address').textContent = data.address || '未找到';
        document.getElementById('email').textContent = data.email || '未找到';
        document.getElementById('phone').textContent = data.phone || '未找到';
        document.getElementById('instagram').textContent = data.instagram?.length > 0 ? `${data.instagram.length} 个链接` : '未找到';
        document.getElementById('facebook').textContent = data.facebook?.length > 0 ? `${data.facebook.length} 个链接` : '未找到';

        resultsDiv.style.display = 'block';
        resultsDiv.scrollIntoView({ behavior: 'smooth' });
    }

    truncateText(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    async openConfig() {
        // 打开配置页面
        chrome.tabs.create({
            url: chrome.runtime.getURL('config.html')
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
        // 这里实现飞书API调用
        // 由于Chrome扩展的限制，可能需要通过background script处理
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

    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('results').style.display = 'none';
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

// 初始化弹出窗口
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
});
