const axios = require('axios');

// 使用您提供的配置信息
const FEISHU_CONFIG = {
    APP_ID: 'cli_a8c959b681b9101c',
    APP_SECRET: 'SaDmzNEqc42ToSMOcJXzre8SOfM36vGf'
};

const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';

// 获取飞书访问令牌
async function getFeishuAccessToken() {
    try {
        const response = await axios.post(`${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`, {
            app_id: FEISHU_CONFIG.APP_ID,
            app_secret: FEISHU_CONFIG.APP_SECRET
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        if (response.data.code === 0) {
            console.log('✅ 获取访问令牌成功');
            return response.data.tenant_access_token;
        } else {
            throw new Error(`获取访问令牌失败: ${response.data.msg}`);
        }
    } catch (error) {
        console.error('❌ 获取飞书访问令牌错误:', error.message);
        throw error;
    }
}

// 测试不同的App Token格式
async function testDifferentAppTokens() {
    const accessToken = await getFeishuAccessToken();
    
    // 可能的App Token格式
    const possibleAppTokens = [
        'F1lbw4vsWie5BHktQVVcj89fn11', // 原始格式
        'lcndthcvl1e0', // 从域名提取
        'F1lbw4vsWie5BHktQVVcj89fn11?base_hp_from=larktab&table=tblFjiGso24abRHl&view=vewla1O8gN' // 完整URL参数
    ];
    
    for (const appToken of possibleAppTokens) {
        console.log(`\n🔍 测试App Token: ${appToken}`);
        
        try {
            const response = await axios.get(
                `${FEISHU_API_BASE}/bitable/v1/apps/${appToken}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );
            
            if (response.data.code === 0) {
                console.log(`✅ App Token ${appToken} 有效!`);
                console.log('多维表格名称:', response.data.data.app.name);
                return appToken;
            } else {
                console.log(`❌ App Token ${appToken} 无效: ${response.data.msg}`);
            }
        } catch (error) {
            console.log(`❌ App Token ${appToken} 测试失败: ${error.response?.data?.msg || error.message}`);
        }
    }
    
    return null;
}

// 测试获取应用下的所有多维表格
async function testGetAllBitables() {
    const accessToken = await getFeishuAccessToken();
    
    try {
        console.log('\n🔍 尝试获取应用下的所有多维表格...');
        
        const response = await axios.get(
            `${FEISHU_API_BASE}/bitable/v1/apps`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );
        
        console.log('获取多维表格列表响应:', JSON.stringify(response.data, null, 2));
        
        if (response.data.code === 0) {
            console.log('✅ 获取多维表格列表成功!');
            console.log('多维表格列表:');
            response.data.data.items.forEach((app, index) => {
                console.log(`${index + 1}. ${app.name} (${app.app_token})`);
            });
        } else {
            console.log(`❌ 获取多维表格列表失败: ${response.data.msg}`);
        }
        
    } catch (error) {
        console.error('❌ 获取多维表格列表错误:', error.message);
        if (error.response) {
            console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// 运行测试
async function runTests() {
    console.log('🚀 开始飞书API调试测试 v3...\n');
    
    try {
        // 测试1: 获取所有多维表格
        await testGetAllBitables();
        
        // 测试2: 测试不同的App Token格式
        const validAppToken = await testDifferentAppTokens();
        
        if (validAppToken) {
            console.log(`\n🎉 找到有效的App Token: ${validAppToken}`);
        } else {
            console.log('\n❌ 未找到有效的App Token');
        }
        
    } catch (error) {
        console.error('❌ 测试过程中出现错误:', error.message);
    }
}

// 运行测试
runTests();
