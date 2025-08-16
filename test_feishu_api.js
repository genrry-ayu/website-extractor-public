const axios = require('axios');

// 飞书API配置（需要替换为实际的App ID和App Secret）
const FEISHU_CONFIG = {
    APP_ID: process.env.FEISHU_APP_ID || 'your_app_id',
    APP_SECRET: process.env.FEISHU_APP_SECRET || 'your_app_secret',
    BITABLE_APP_TOKEN: 'F1lbw4vsWie5BHktQVVcj89fn11',
    TABLE_ID: 'tblFjiGso24abRHl'
};

const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';

// 获取飞书访问令牌
async function getFeishuAccessToken() {
    try {
        console.log('正在获取飞书访问令牌...');
        const response = await axios.post(`${FEISHU_API_BASE}/auth/v3/tenant_access_token/internal`, {
            app_id: FEISHU_CONFIG.APP_ID,
            app_secret: FEISHU_CONFIG.APP_SECRET
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
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

// 测试写入数据到飞书多维表格
async function testWriteToFeishuBitable() {
    try {
        // 获取访问令牌
        const accessToken = await getFeishuAccessToken();
        
        // 准备测试数据
        const testData = {
            fields: {
                '官网': 'http://www.langaard.no/',
                '公司名称': 'Juveler Langaard',
                '公司简介': 'Besøk vår butikk i Stortingsgaten 22. Se vårt store utvalg av diamantsmykker, eller skap ditt drømmesmykke sammen med oss.',
                '地址': 'STORTINGSGT. 22, 0161 OSLO',
                '邮箱': 'INFO@LANGAARD.NO',
                '电话': '+47 22 00 76 90',
                'Instagram': 'https://www.instagram.com/juvelerlangaard/',
                'Facebook': 'https://www.facebook.com/juvelerlangaard/',
                '提取时间': new Date().toISOString()
            }
        };
        
        console.log('正在写入测试数据到飞书多维表格...');
        console.log('数据内容:', JSON.stringify(testData, null, 2));
        
        // 调用飞书多维表格API写入数据
        const response = await axios.post(
            `${FEISHU_API_BASE}/bitable/v1/apps/${FEISHU_CONFIG.BITABLE_APP_TOKEN}/tables/${FEISHU_CONFIG.TABLE_ID}/records`,
            testData,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (response.data.code === 0) {
            console.log('✅ 数据成功写入飞书多维表格!');
            console.log('记录ID:', response.data.data.record_id);
            console.log('响应数据:', JSON.stringify(response.data, null, 2));
        } else {
            throw new Error(`写入数据失败: ${response.data.msg}`);
        }
        
    } catch (error) {
        console.error('❌ 写入飞书多维表格错误:');
        console.error('错误信息:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// 测试获取表格信息
async function testGetTableInfo() {
    try {
        const accessToken = await getFeishuAccessToken();
        
        console.log('正在获取表格信息...');
        const response = await axios.get(
            `${FEISHU_API_BASE}/bitable/v1/apps/${FEISHU_CONFIG.BITABLE_APP_TOKEN}/tables/${FEISHU_CONFIG.TABLE_ID}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (response.data.code === 0) {
            console.log('✅ 获取表格信息成功!');
            console.log('表格名称:', response.data.data.table.name);
            console.log('字段信息:', JSON.stringify(response.data.data.table.fields, null, 2));
        } else {
            throw new Error(`获取表格信息失败: ${response.data.msg}`);
        }
        
    } catch (error) {
        console.error('❌ 获取表格信息错误:', error.message);
        if (error.response) {
            console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// 运行测试
async function runTests() {
    console.log('🚀 开始飞书API测试...\n');
    
    // 检查配置
    if (FEISHU_CONFIG.APP_ID === 'your_app_id' || FEISHU_CONFIG.APP_SECRET === 'your_app_secret') {
        console.log('⚠️  请先设置正确的App ID和App Secret');
        console.log('可以通过环境变量设置:');
        console.log('export FEISHU_APP_ID="your_app_id"');
        console.log('export FEISHU_APP_SECRET="your_app_secret"');
        return;
    }
    
    try {
        // 测试1: 获取表格信息
        console.log('📋 测试1: 获取表格信息');
        await testGetTableInfo();
        console.log('');
        
        // 测试2: 写入数据
        console.log('📝 测试2: 写入数据到表格');
        await testWriteToFeishuBitable();
        console.log('');
        
        console.log('🎉 所有测试完成!');
        
    } catch (error) {
        console.error('❌ 测试过程中出现错误:', error.message);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    runTests();
}

module.exports = {
    getFeishuAccessToken,
    testWriteToFeishuBitable,
    testGetTableInfo
};
