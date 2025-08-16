const axios = require('axios');

// 测试网站列表
const testUrls = [
    'https://www.apple.com',
    'https://github.com',
    'https://www.microsoft.com',
    'https://maralkunst.com',
    'http://localhost:3000/test.html'
];

async function testExtraction() {
    console.log('🧪 开始测试社交媒体链接提取功能...\n');
    
    for (const url of testUrls) {
        try {
            console.log(`📡 测试网站: ${url}`);
            
            const response = await axios.post('http://localhost:3000/api/extract', {
                url: url
            }, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });
            
            const data = response.data;
            
            if (data.success) {
                console.log(`✅ 提取成功!`);
                console.log(`   公司名称: ${data.results.companyName || '未找到'}`);
                console.log(`   简介: ${data.results.description ? data.results.description.substring(0, 80) + '...' : '未找到'}`);
                console.log(`   地址: ${data.results.address || '未找到'}`);
                console.log(`   邮箱: ${data.results.email || '未找到'}`);
                console.log(`   电话: ${data.results.phone || '未找到'}`);
                console.log(`   Instagram: ${data.results.instagram.length} 个链接`);
                if (data.results.instagram.length > 0) {
                    data.results.instagram.forEach((link, index) => {
                        console.log(`     ${index + 1}. ${link}`);
                    });
                }
                
                console.log(`   Facebook: ${data.results.facebook.length} 个链接`);
                if (data.results.facebook.length > 0) {
                    data.results.facebook.forEach((link, index) => {
                        console.log(`     ${index + 1}. ${link}`);
                    });
                }
            } else {
                console.log(`❌ 提取失败: ${data.error}`);
            }
            
        } catch (error) {
            console.log(`❌ 请求失败: ${error.message}`);
        }
        
        console.log(''); // 空行分隔
    }
    
    console.log('🎉 测试完成!');
}

// 运行测试
testExtraction().catch(console.error);
