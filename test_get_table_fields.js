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

// 获取多维表格的字段信息
async function getBitableFields() {
    try {
        const accessToken = await getFeishuAccessToken();
        
        // 使用正确的App Token
        const appToken = 'SQtqbkfCvaarWhs4IuncJUdonjc';
        const tableId = 'tblFjiGso24abRHl';
        
        console.log('正在获取多维表格字段信息...');
        console.log('App Token:', appToken);
        console.log('Table ID:', tableId);
        
        const response = await axios.get(
            `${FEISHU_API_BASE}/bitable/v1/apps/${appToken}/tables/${tableId}/fields`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );
        
        console.log('字段信息响应:', JSON.stringify(response.data, null, 2));
        
        if (response.data.code === 0) {
            console.log('✅ 获取字段信息成功!');
            console.log('\n字段列表:');
            response.data.data.items.forEach((field, index) => {
                console.log(`${index + 1}. 字段名称: "${field.field_name}" (类型: ${field.type})`);
            });
            
            return response.data.data.items;
        } else {
            throw new Error(`获取字段信息失败: ${response.data.msg}`);
        }
        
    } catch (error) {
        console.error('❌ 获取字段信息错误:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
        }
        return null;
    }
}

// 获取多维表格信息
async function getBitableInfo() {
    try {
        const accessToken = await getFeishuAccessToken();
        
        const appToken = 'SQtqbkfCvaarWhs4IuncJUdonjc';
        
        console.log('正在获取多维表格信息...');
        
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
        
        console.log('多维表格信息响应:', JSON.stringify(response.data, null, 2));
        
        if (response.data.code === 0) {
            console.log('✅ 获取多维表格信息成功!');
            console.log('多维表格名称:', response.data.data.app.name);
            
            // 获取表格列表
            if (response.data.data.app.tables) {
                console.log('\n表格列表:');
                response.data.data.app.tables.forEach((table, index) => {
                    console.log(`${index + 1}. 表格名称: "${table.name}" (ID: ${table.table_id})`);
                });
            }
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

// 运行测试
async function runTests() {
    console.log('🚀 开始获取多维表格信息...\n');
    
    try {
        // 测试1: 获取多维表格信息
        console.log('📋 测试1: 获取多维表格信息');
        await getBitableInfo();
        console.log('');
        
        // 测试2: 获取字段信息
        console.log('📋 测试2: 获取字段信息');
        const fields = await getBitableFields();
        
        if (fields) {
            console.log('\n📝 字段映射建议:');
            console.log('根据实际字段名称，您需要调整以下映射:');
            console.log('- "官网" -> 对应字段名');
            console.log('- "公司名称" -> 对应字段名');
            console.log('- "公司简介" -> 对应字段名');
            console.log('- "地址" -> 对应字段名');
            console.log('- "邮箱" -> 对应字段名');
            console.log('- "电话" -> 对应字段名');
            console.log('- "Instagram" -> 对应字段名');
            console.log('- "Facebook" -> 对应字段名');
            console.log('- "提取时间" -> 对应字段名');
            console.log('- "来自 gpt 的输出" -> 对应字段名');
        }
        
        console.log('\n🎉 所有测试完成!');
        
    } catch (error) {
        console.error('❌ 测试过程中出现错误:', error.message);
    }
}

// 运行测试
runTests();
