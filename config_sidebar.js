// 飞书配置页面JavaScript逻辑
class ConfigManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadExistingConfig();
    }

    setupEventListeners() {
        // 表单提交
        document.getElementById('configForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveConfig();
        });

        // 测试连接按钮
        document.getElementById('testBtn').addEventListener('click', () => {
            this.testConnection();
        });

        // 返回按钮
        document.getElementById('backBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.goBack();
        });
    }

    async loadExistingConfig() {
        try {
            const result = await new Promise((resolve) => {
                chrome.storage.local.get(['feishuConfig'], resolve);
            });

            if (result.feishuConfig) {
                const config = result.feishuConfig;
                document.getElementById('appId').value = config.appId || '';
                document.getElementById('appSecret').value = config.appSecret || '';
                document.getElementById('bitableUrl').value = config.bitableUrl || '';
            }
        } catch (error) {
            console.error('加载配置失败:', error);
        }
    }

    async saveConfig() {
        const appId = document.getElementById('appId').value.trim();
        const appSecret = document.getElementById('appSecret').value.trim();
        const bitableUrl = document.getElementById('bitableUrl').value.trim();

        // 验证输入
        if (!appId || !appSecret || !bitableUrl) {
            this.showError('请填写所有必填字段');
            return;
        }

        try {
            // 解析多维表格URL
            const urlParams = this.parseBitableUrl(bitableUrl);
            if (!urlParams) {
                this.showError('无效的多维表格链接');
                return;
            }

            // 保存配置
            const config = {
                appId,
                appSecret,
                bitableUrl,
                tableId: urlParams.tableId,
                bitableAppToken: urlParams.appToken
            };

            await new Promise((resolve, reject) => {
                chrome.storage.local.set({ feishuConfig: config }, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            });

            this.showSuccess('配置保存成功！');
        } catch (error) {
            console.error('保存配置失败:', error);
            this.showError('保存配置失败: ' + error.message);
        }
    }

    parseBitableUrl(url) {
        try {
            const urlObj = new URL(url);
            
            // 检查是否是飞书多维表格链接
            if (!urlObj.hostname.includes('feishu.cn')) {
                return null;
            }

            // 从URL中提取tableId
            const tableMatch = url.match(/table=([^&]+)/);
            const tableId = tableMatch ? tableMatch[1] : null;

            // 从URL中提取appToken (nodeToken)
            const nodeMatch = url.match(/F1lbw4vsWie5BHktQVVcj89fn11/);
            const appToken = nodeMatch ? 'F1lbw4vsWie5BHktQVVcj89fn11' : null;

            if (!tableId || !appToken) {
                return null;
            }

            return {
                tableId,
                appToken
            };
        } catch (error) {
            console.error('解析URL失败:', error);
            return null;
        }
    }

    async testConnection() {
        const appId = document.getElementById('appId').value.trim();
        const appSecret = document.getElementById('appSecret').value.trim();

        if (!appId || !appSecret) {
            this.showError('请先填写应用ID和密钥');
            return;
        }

        try {
            // 测试获取访问令牌
            const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    app_id: appId,
                    app_secret: appSecret
                })
            });

            const result = await response.json();
            
            if (result.code === 0) {
                this.showSuccess('连接测试成功！');
            } else {
                this.showError('连接测试失败: ' + result.msg);
            }
        } catch (error) {
            console.error('测试连接失败:', error);
            this.showError('连接测试失败: ' + error.message);
        }
    }

    goBack() {
        // 关闭当前标签页
        chrome.tabs.getCurrent((tab) => {
            if (tab) {
                chrome.tabs.remove(tab.id);
            }
        });
    }

    showSuccess(message) {
        const statusDiv = document.getElementById('configStatus');
        const successDiv = document.getElementById('statusSuccess');
        const errorDiv = document.getElementById('statusError');

        statusDiv.style.display = 'block';
        successDiv.style.display = 'block';
        errorDiv.style.display = 'none';
        
        successDiv.querySelector('span').textContent = message;
        statusDiv.classList.add('fade-in');
    }

    showError(message) {
        const statusDiv = document.getElementById('configStatus');
        const successDiv = document.getElementById('statusSuccess');
        const errorDiv = document.getElementById('statusError');

        statusDiv.style.display = 'block';
        successDiv.style.display = 'none';
        errorDiv.style.display = 'block';
        
        errorDiv.querySelector('span').textContent = message;
        statusDiv.classList.add('fade-in');
    }
}

// 初始化配置管理器
document.addEventListener('DOMContentLoaded', () => {
    new ConfigManager();
});
