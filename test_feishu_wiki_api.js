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

// 获取知识空间节点信息
async function getWikiNodeInfo() {
    try {
        const accessToken = await getFeishuAccessToken();
        
        // 从URL中提取的节点token
        const nodeToken = 'F1lbw4vsWie5BHktQVVcj89fn11';
        
        console.log('正在获取知识空间节点信息...');
        console.log('节点Token:', nodeToken);
        
        const response = await axios.get(
            `${FEISHU_API_BASE}/wiki/v2/spaces/get_node`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    token: nodeToken,
                    obj_type: 'wiki'
                },
                timeout: 10000
            }
        );
        
        console.log('知识空间节点信息响应:', JSON.stringify(response.data, null, 2));
        
        if (response.data.code === 0) {
            console.log('✅ 获取知识空间节点信息成功!');
            
            const nodeData = response.data.data.node;
            console.log('节点类型:', nodeData.obj_type);
            console.log('对象Token:', nodeData.obj_token);
            console.log('节点标题:', nodeData.title);
            
            // 检查是否为多维表格
            if (nodeData.obj_type === 'bitable') {
                console.log('🎉 这是一个多维表格!');
                console.log('多维表格App Token:', nodeData.obj_token);
                return nodeData.obj_token;
            } else {
                console.log('❌ 这不是一个多维表格，类型为:', nodeData.obj_type);
                return null;
            }
        } else {
            throw new Error(`获取知识空间节点信息失败: ${response.data.msg}`);
        }
        
    } catch (error) {
        console.error('❌ 获取知识空间节点信息错误:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
        }
        return null;
    }
}

// 测试写入数据到多维表格
async function testWriteToBitable(appToken) {
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
        
        console.log('正在写入测试数据到多维表格...');
        console.log('App Token:', appToken);
        console.log('数据内容:', JSON.stringify(recordData, null, 2));
        
        // 调用多维表格API写入数据
        const response = await axios.post(
            `${FEISHU_API_BASE}/bitable/v1/apps/${appToken}/tables/tblFjiGso24abRHl/records`,
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
            console.log('✅ 数据成功写入多维表格!');
            console.log('记录ID:', response.data.data.record_id);
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
    }
}

// 运行测试
async function runTests() {
    console.log('🚀 开始飞书知识空间API测试...\n');
    
    try {
        // 测试1: 获取知识空间节点信息
        console.log('📋 测试1: 获取知识空间节点信息');
        const appToken = await getWikiNodeInfo();
        
        if (appToken) {
            console.log('\n📝 测试2: 写入数据到多维表格');
            await testWriteToBitable(appToken);
        } else {
            console.log('\n❌ 未获取到有效的多维表格App Token，跳过写入测试');
        }
        
        console.log('\n🎉 所有测试完成!');
        
    } catch (error) {
        console.error('❌ 测试过程中出现错误:', error.message);
    }
}

// 运行测试
runTests();
