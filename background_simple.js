// 简化版本的Background Script
// 处理基本的侧边栏控制和飞书API调用

class SimpleBackgroundManager {
    constructor() {
        this.setupMessageListener();
        this.setupActionListener();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'sendToFeishu') {
                this.sendToFeishu(request.data, request.config).then(sendResponse);
                return true; // 保持消息通道开放
            }
        });
    }

    setupActionListener() {
        // 点击扩展图标时打开侧边栏
        chrome.action.onClicked.addListener((tab) => {
            // 直接打开侧边栏
            chrome.sidePanel.open();
        });
    }

    async sendToFeishu(data, config) {
        try {
            // 获取访问令牌
            const accessToken = await this.getFeishuAccessToken(config);
            
            // 准备数据
            const recordData = {
                fields: {
                    '官网地址': data.url,
                    '公司名': data.companyName,
                    '简介': data.description,
                    '地址': data.address,
                    '邮箱': data.email,
                    '电话': data.phone,
                    'ins': data.instagram?.join(', ') || '',
                    'Facebook': data.facebook?.join(', ') || '',
                    '来自 gpt 的输出': this.formatGptOutput(data)
                }
            };

            // 发送到飞书多维表格
            const response = await fetch(
                `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.bitableAppToken}/tables/${config.tableId}/records`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(recordData)
                }
            );

            const result = await response.json();
            
            if (result.code === 0) {
                console.log('数据成功写入飞书多维表格:', result.data.record_id);
                return { success: true };
            } else {
                throw new Error(`写入数据失败: ${result.msg}`);
            }
        } catch (error) {
            console.error('发送到飞书失败:', error);
            return { success: false, error: error.message };
        }
    }

    async getFeishuAccessToken(config) {
        try {
            const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    app_id: config.appId,
                    app_secret: config.appSecret
                })
            });

            const result = await response.json();
            
            if (result.code === 0) {
                return result.tenant_access_token;
            } else {
                throw new Error(`获取访问令牌失败: ${result.msg}`);
            }
        } catch (error) {
            console.error('获取飞书访问令牌失败:', error);
            throw error;
        }
    }

    formatGptOutput(data) {
        const output = {
            url: data.url,
            companyName: data.companyName,
            description: data.description,
            address: data.address,
            email: data.email,
            phone: data.phone,
            instagram: data.instagram,
            facebook: data.facebook,
            extractedAt: new Date().toISOString()
        };
        
        return JSON.stringify(output, null, 2);
    }
}

// 初始化简化后台管理器
new SimpleBackgroundManager();
