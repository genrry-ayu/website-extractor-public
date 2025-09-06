// 配置管理脚本
class ConfigManager {
    constructor() {
        this.encryptionKey = this.generateEncryptionKey();
        this.storageKey = 'feishu_config_encrypted';
        this.init();
    }
    
    // 生成加密密钥（基于用户浏览器信息）
    generateEncryptionKey() {
        const userAgent = navigator.userAgent;
        const screenInfo = `${screen.width}x${screen.height}`;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const baseString = `${userAgent}|${screenInfo}|${timezone}|feishu_config`;
        return CryptoJS.SHA256(baseString).toString();
    }
    
    // 初始化
    init() {
        this.bindEvents();
        this.loadConfig(); // 页面加载时自动加载配置
        // 初始化预览
        setTimeout(() => this.updatePreview(), 0);
    }
    
    // 绑定事件
    bindEvents() {
        const form = document.getElementById('configForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveConfig();
            });
        }

        // 实时解析预览
        ['appId','appSecret','bitableUrl'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.updatePreview());
                el.addEventListener('blur', () => this.updatePreview());
            }
        });

        // 一键验证
        const pvBtn = document.getElementById('pvValidateBtn');
        if (pvBtn) {
            pvBtn.addEventListener('click', () => this.validatePreview());
        }
    }
    
    // 加密数据
    encrypt(data) {
        try {
            const jsonString = JSON.stringify(data);
            return CryptoJS.AES.encrypt(jsonString, this.encryptionKey).toString();
        } catch (error) {
            console.error('加密失败:', error);
            throw new Error('数据加密失败');
        }
    }
    
    // 解密数据
    decrypt(encryptedData) {
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
            const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
            return JSON.parse(decryptedString);
        } catch (error) {
            console.error('解密失败:', error);
            throw new Error('数据解密失败');
        }
    }
    
    // 保存配置
    async saveConfig() {
        try {
            const formData = {
                appId: document.getElementById('appId').value.trim(),
                appSecret: document.getElementById('appSecret').value.trim(),
                bitableUrl: document.getElementById('bitableUrl').value.trim()
            };
            
            // 验证数据
            if (!formData.appId || !formData.appSecret || !formData.bitableUrl) {
                this.showStatus('请填写所有必填字段', 'error');
                return;
            }
            
            // 验证多维表格链接格式
            if (!this.isValidBitableUrl(formData.bitableUrl)) {
                this.showStatus('请输入有效的飞书多维表格链接', 'error');
                return;
            }
            
            // 加密并保存到本地
            const encryptedData = this.encrypt(formData);
            localStorage.setItem(this.storageKey, encryptedData);
            
            console.log('配置保存成功:', {
                appId: formData.appId,
                appSecret: formData.appSecret.substring(0, 10) + '...',
                bitableUrl: formData.bitableUrl
            });
            
            // 本地优先：不再依赖服务器保存个人配置
            this.showStatus('配置已保存（本地）。提取时将直接使用本地配置写入飞书。', 'success');
            this.updatePreview();
            
            // 3秒后自动返回主页
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000);
            
        } catch (error) {
            console.error('保存配置失败:', error);
            this.showStatus('保存配置失败: ' + error.message, 'error');
        }
    }

    // 更新解析预览
    updatePreview() {
        const url = (document.getElementById('bitableUrl')?.value || '').trim();
        const appId = (document.getElementById('appId')?.value || '').trim();
        const appSecret = (document.getElementById('appSecret')?.value || '').trim();

        const tableId = url ? this.extractTableIdFromUrl(url) : '';
        const appToken = url ? this.extractAppTokenFromUrl(url) : '';

        const pvTable = document.getElementById('pvTableId');
        const pvToken = document.getElementById('pvAppToken');
        const pvStatus = document.getElementById('pvStatus');
        if (pvTable) pvTable.value = tableId || '-';
        if (pvToken) pvToken.value = appToken || '-';

        const okTable = !!(tableId && tableId.startsWith('tbl'));
        const okId = !!appId;
        const okSecret = !!appSecret;
        const basic = okTable && okId && okSecret;
        if (pvStatus) {
            pvStatus.style.display = 'flex';
            pvStatus.className = 'status-message ' + (basic ? 'status-success' : 'status-info');
            pvStatus.textContent = basic ? '解析正常：可点击“验证”进行线上校验' : '请填写 AppID/Secret，并确保链接里含有 table=tbl...';
        }
    }

    // 线上校验 AppID/Secret + App Token
    async validatePreview() {
        const appId = (document.getElementById('appId')?.value || '').trim();
        const appSecret = (document.getElementById('appSecret')?.value || '').trim();
        const appToken = (document.getElementById('pvAppToken')?.value || '').trim();
        const tableId = (document.getElementById('pvTableId')?.value || '').trim();
        const pvStatus = document.getElementById('pvStatus');
        if (!appId || !appSecret) {
            if (pvStatus) { pvStatus.className = 'status-message status-error'; pvStatus.textContent = '请先填写 App ID 与 App Secret'; }
            return;
        }
        if (!tableId || !tableId.startsWith('tbl')) {
            if (pvStatus) { pvStatus.className = 'status-message status-error'; pvStatus.textContent = '无法解析 Table ID，请检查链接'; }
            return;
        }
        try {
            if (pvStatus) { pvStatus.className = 'status-message status-info'; pvStatus.textContent = '正在获取访问令牌...'; }
            const tkResp = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ app_id: appId, app_secret: appSecret })
            });
            const tkData = await tkResp.json();
            if (tkData.code !== 0 || !tkData.tenant_access_token) {
                throw new Error('获取访问令牌失败: ' + (tkData.msg || 'unknown'));
            }
            if (pvStatus) { pvStatus.textContent = '访问令牌获取成功，校验 App Token...'; }
            // 校验 appToken（如果解析到了）
            let tokenToCheck = appToken;
            if (!tokenToCheck) {
                // 无 appToken 也允许，只做 tableId 结构校验
                if (pvStatus) { pvStatus.className = 'status-message status-success'; pvStatus.textContent = '已验证：AppID/Secret 有效，Table ID 格式正确'; }
                return;
            }
            const appResp = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${tokenToCheck}`, {
                headers: { 'Authorization': `Bearer ${tkData.tenant_access_token}` }
            });
            const appJson = await appResp.json();
            if (appJson.code === 0) {
                if (pvStatus) { pvStatus.className = 'status-message status-success'; pvStatus.textContent = '验证成功：App Token 有效，Table ID 格式正确'; }
            } else {
                if (pvStatus) { pvStatus.className = 'status-message status-error'; pvStatus.textContent = `验证失败：App Token 无效（${appJson.msg || appJson.code}）`; }
            }
        } catch (e) {
            console.error('预览验证失败:', e);
            if (pvStatus) { pvStatus.className = 'status-message status-error'; pvStatus.textContent = '验证失败：' + (e.message || '网络错误'); }
        }
    }

    // 从多维表格 URL 中解析 appToken（Wiki 节点 token 或 Base token），若无法解析返回 undefined
    extractAppTokenFromUrl(url) {
        try {
            // 常见格式：/wiki/<nodeToken>?table=tbl... 或 /base/<appToken>/.../tbl...
            const m1 = url.match(/\/wiki\/([A-Za-z0-9]+)/);
            if (m1 && m1[1]) return m1[1];
            const m2 = url.match(/\/base\/([A-Za-z0-9]+)/);
            if (m2 && m2[1]) return m2[1];
        } catch (_) {}
        return undefined;
    }
    
    // 加载配置
    loadConfig() {
        try {
            const encryptedData = localStorage.getItem(this.storageKey);
            if (!encryptedData) {
                this.showStatus('未找到已保存的配置', 'error');
                return;
            }
            
            const config = this.decrypt(encryptedData);
            
            // 填充表单
            document.getElementById('appId').value = config.appId || '';
            document.getElementById('appSecret').value = config.appSecret || '';
            document.getElementById('bitableUrl').value = config.bitableUrl || '';
            
            this.showStatus('配置加载成功！', 'success');
            
        } catch (error) {
            console.error('加载配置失败:', error);
            this.showStatus('加载配置失败: ' + error.message, 'error');
        }
    }
    
    // 验证多维表格链接格式
    isValidBitableUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.includes('feishu.cn') && 
                   (urlObj.pathname.includes('/wiki/') || urlObj.pathname.includes('/base/'));
        } catch (error) {
            return false;
        }
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
    
    // 显示状态消息
    showStatus(message, type = 'success') {
        const statusElement = document.getElementById('statusMessage');
        if (!statusElement) return;
        
        statusElement.textContent = message;
        statusElement.className = `status-message status-${type}`;
        statusElement.style.display = 'flex';
        
        // 5秒后自动隐藏
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 5000);
    }
    
    // 清除配置
    clearConfig() {
        try {
            localStorage.removeItem(this.storageKey);
            this.showStatus('配置已清除', 'success');
            
            // 清空表单
            document.getElementById('appId').value = '';
            document.getElementById('appSecret').value = '';
            document.getElementById('bitableUrl').value = '';
            
        } catch (error) {
            console.error('清除配置失败:', error);
            this.showStatus('清除配置失败: ' + error.message, 'error');
        }
    }
    
    // 获取配置（供其他页面使用）
    getConfig() {
        try {
            const encryptedData = localStorage.getItem(this.storageKey);
            if (!encryptedData) {
                return null;
            }
            return this.decrypt(encryptedData);
        } catch (error) {
            console.error('获取配置失败:', error);
            return null;
        }
    }
    
    // 检查是否有配置
    hasConfig() {
        return localStorage.getItem(this.storageKey) !== null;
    }
    
    // 测试飞书连接
    async testConnection() {
        try {
            const formData = {
                appId: document.getElementById('appId').value.trim(),
                appSecret: document.getElementById('appSecret').value.trim(),
                bitableUrl: document.getElementById('bitableUrl').value.trim()
            };
            
            // 验证数据
            if (!formData.appId || !formData.appSecret || !formData.bitableUrl) {
                this.showStatus('请先填写完整的配置信息', 'error');
                return;
            }
            
            // 验证多维表格链接格式
            if (!this.isValidBitableUrl(formData.bitableUrl)) {
                this.showStatus('请输入有效的飞书多维表格链接', 'error');
                return;
            }
            
            this.showStatus('正在测试飞书连接...', 'info');
            
            // 转换字段名称以匹配API期望的格式
            const extractedTableId = this.extractTableIdFromUrl(formData.bitableUrl);
            const apiData = {
                feishuAppId: formData.appId,
                feishuAppSecret: formData.appSecret,
                feishuTableId: extractedTableId
            };
            
            console.log('测试连接配置:', {
                appId: apiData.feishuAppId,
                appSecret: apiData.feishuAppSecret.substring(0, 10) + '...',
                tableId: apiData.feishuTableId,
                originalUrl: formData.bitableUrl
            });
            
            const response = await fetch('/api/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(apiData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showStatus('✅ 连接测试成功！飞书API配置正确', 'success');
                console.log('连接测试成功:', result.message);
            } else {
                this.showStatus('❌ 连接测试失败: ' + result.error, 'error');
                console.error('连接测试失败:', result.error);
            }
            
        } catch (error) {
            console.error('测试连接失败:', error);
            this.showStatus('❌ 连接测试失败: ' + error.message, 'error');
        }
    }
}

// 全局函数，供HTML调用
function loadConfig() {
    if (window.configManager) {
        window.configManager.loadConfig();
    }
}

function clearConfig() {
    if (window.configManager) {
        window.configManager.clearConfig();
    }
}

function testConnection() {
    if (window.configManager) {
        window.configManager.testConnection();
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.configManager = new ConfigManager();
});

// 导出供其他页面使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigManager;
}
