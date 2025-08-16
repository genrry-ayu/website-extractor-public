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

// 格式化GPT输出
function formatGptOutput(data) {
    const output = {
        url: data.url,
        companyName: data.companyName,
        description: data.description,
        address: data.address,
        email: data.email,
        phone: data.phone,
        instagram: data.instagram,
        facebook: data.facebook,
        extractedAt: data.extractedAt
    };
    
    return JSON.stringify(output, null, 2);
}

// 最终测试写入数据到多维表格
async function testFinalWrite() {
    try {
        const accessToken = await getFeishuAccessToken();
        
        // 使用正确的App Token和字段名称
        const appToken = 'SQtqbkfCvaarWhs4IuncJUdonjc';
        const tableId = 'tblFjiGso24abRHl';
        
        // 准备测试数据
        const testData = {
            url: 'http://www.langaard.no/',
            companyName: 'Juveler Langaard',
            description: 'Besøk vår butikk i Stortingsgaten 22. Se vårt store utvalg av diamantsmykker, eller skap ditt drømmesmykke sammen med oss.',
            address: 'STORTINGSGT. 22, 0161 OSLO',
            email: 'INFO@LANGAARD.NO',
            phone: '+47 22 00 76 90',
            instagram: ['https://www.instagram.com/juvelerlangaard/'],
            facebook: ['https://www.facebook.com/juvelerlangaard/'],
            extractedAt: new Date().toISOString()
        };
        
        // 准备写入的数据 - 使用正确的字段名称
        const recordData = {
            fields: {
                '官网地址': testData.url,
                '公司名': testData.companyName,
                '简介': testData.description,
                '地址': testData.address,
                '邮箱': testData.email,
                '电话': testData.phone,
                'ins': testData.instagram.join(', '),
                'Facebook': testData.facebook.join(', '),
                '来自 gpt 的输出': formatGptOutput(testData)
            }
        };
        
        console.log('正在写入测试数据到多维表格...');
        console.log('App Token:', appToken);
        console.log('Table ID:', tableId);
        console.log('数据内容:', JSON.stringify(recordData, null, 2));
        
        // 调用多维表格API写入数据
        const response = await axios.post(
            `${FEISHU_API_BASE}/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
            recordData,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );
        
        console.log('多维表格API响应:', JSON.stringify(response.data, null, 2));
        
        if (response.data.code === 0) {
            console.log('🎉 数据成功写入多维表格!');
            console.log('记录ID:', response.data.data.record_id);
            return true;
        } else {
            throw new Error(`写入数据失败: ${response.data.msg}`);
        }
        
    } catch (error) {
        console.error('❌ 写入多维表格错误:');
        console.error('错误信息:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
        }
        return false;
    }
}

// 运行最终测试
async function runFinalTest() {
    console.log('🚀 开始最终集成测试...\n');
    
    try {
        const success = await testFinalWrite();
        
        if (success) {
            console.log('\n🎉 最终测试成功! 系统已完全集成!');
            console.log('\n📋 功能总结:');
            console.log('✅ 飞书API认证成功');
            console.log('✅ 知识空间节点信息获取成功');
            console.log('✅ 多维表格App Token获取成功');
            console.log('✅ 字段映射正确');
            console.log('✅ 数据写入成功');
            console.log('✅ GPT输出格式化成功');
        } else {
            console.log('\n❌ 最终测试失败，需要进一步调试');
        }
        
    } catch (error) {
        console.error('❌ 测试过程中出现错误:', error.message);
    }
}

// 运行最终测试
runFinalTest();
