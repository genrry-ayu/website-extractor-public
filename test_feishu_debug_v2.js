const axios = require('axios');

// 使用您提供的配置信息
const FEISHU_CONFIG = {
    APP_ID: 'cli_a8c959b681b9101c',
    APP_SECRET: 'SaDmzNEqc42ToSMOcJXzre8SOfM36vGf',
    BITABLE_APP_TOKEN: 'F1lbw4vsWie5BHktQVVcj89fn11',
    TABLE_ID: 'tblFjiGso24abRHl'
};

const FEISHU_API_BASE = 'https://open.feishu.cn/open-apis';

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

// 测试获取多维表格信息
async function testGetBitableInfo() {
    try {
        const accessToken = await getFeishuAccessToken();
        
        console.log('正在获取多维表格信息...');
        console.log('App Token:', FEISHU_CONFIG.BITABLE_APP_TOKEN);
        console.log('Table ID:', FEISHU_CONFIG.TABLE_ID);
        
        // 尝试获取多维表格信息
        const response = await axios.get(
            `${FEISHU_API_BASE}/bitable/v1/apps/${FEISHU_CONFIG.BITABLE_APP_TOKEN}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );
        
        console.log('多维表格信息响应:', JSON.stringify(response.data, null, 2));
        
        if (response.data.code === 0) {
            console.log('✅ 获取多维表格信息成功!');
            console.log('多维表格名称:', response.data.data.app.name);
        } else {
            throw new Error(`获取多维表格信息失败: ${response.data.msg}`);
        }
        
    } catch (error) {
        console.error('❌ 获取多维表格信息错误:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// 测试获取表格字段信息
async function testGetTableFields() {
    try {
        const accessToken = await getFeishuAccessToken();
        
        console.log('正在获取表格字段信息...');
        
        const response = await axios.get(
            `${FEISHU_API_BASE}/bitable/v1/apps/${FEISHU_CONFIG.BITABLE_APP_TOKEN}/tables/${FEISHU_CONFIG.TABLE_ID}/fields`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );
        
        console.log('表格字段信息响应:', JSON.stringify(response.data, null, 2));
        
        if (response.data.code === 0) {
            console.log('✅ 获取表格字段信息成功!');
            console.log('字段列表:');
            response.data.data.items.forEach(field => {
                console.log(`- ${field.field_name} (${field.type})`);
            });
        } else {
            throw new Error(`获取表格字段信息失败: ${response.data.msg}`);
        }
        
    } catch (error) {
        console.error('❌ 获取表格字段信息错误:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

// 测试写入数据到飞书多维表格
async function testWriteToFeishuBitable() {
    try {
        const accessToken = await getFeishuAccessToken();
        
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
        
        // 准备写入的数据
        const recordData = {
            fields: {
                '官网': testData.url,
                '公司名称': testData.companyName,
                '公司简介': testData.description,
                '地址': testData.address,
                '邮箱': testData.email,
                '电话': testData.phone,
                'Instagram': testData.instagram.join(', '),
                'Facebook': testData.facebook.join(', '),
                '提取时间': testData.extractedAt,
                '来自 gpt 的输出': formatGptOutput(testData)
            }
        };
        
        console.log('正在写入测试数据到飞书多维表格...');
        console.log('数据内容:', JSON.stringify(recordData, null, 2));
        
        // 调用飞书多维表格API写入数据
        const response = await axios.post(
            `${FEISHU_API_BASE}/bitable/v1/apps/${FEISHU_CONFIG.BITABLE_APP_TOKEN}/tables/${FEISHU_CONFIG.TABLE_ID}/records`,
            recordData,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );
        
        console.log('飞书API响应:', JSON.stringify(response.data, null, 2));
        
        if (response.data.code === 0) {
            console.log('✅ 数据成功写入飞书多维表格!');
            console.log('记录ID:', response.data.data.record_id);
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

// 运行测试
async function runTests() {
    console.log('🚀 开始飞书API调试测试 v2...\n');
    
    try {
        // 测试1: 获取多维表格信息
        console.log('📋 测试1: 获取多维表格信息');
        await testGetBitableInfo();
        console.log('');
        
        // 测试2: 获取表格字段信息
        console.log('📋 测试2: 获取表格字段信息');
        await testGetTableFields();
        console.log('');
        
        // 测试3: 写入数据
        console.log('📝 测试3: 写入数据到表格');
        await testWriteToFeishuBitable();
        console.log('');
        
        console.log('🎉 所有测试完成!');
        
    } catch (error) {
        console.error('❌ 测试过程中出现错误:', error.message);
    }
}

// 运行测试
runTests();
