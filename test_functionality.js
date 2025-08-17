const https = require('https');

console.log('🔍 网站功能测试');
console.log('================');
console.log();

const baseUrl = 'https://website-info-extractor-jzgq2wvdd-genrrys-projects.vercel.app';

// 测试函数
function testUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            console.log(`📡 ${url}`);
            console.log(`   状态码: ${res.statusCode}`);
            console.log(`   状态: ${res.statusCode === 200 ? '✅ 正常' : '❌ 异常'}`);
            
            if (res.statusCode === 200) {
                console.log(`   ✅ 可以访问`);
                resolve(true);
            } else if (res.statusCode === 401) {
                console.log(`   ❌ 需要身份验证 (401)`);
                resolve(false);
            } else {
                console.log(`   ❌ 其他错误`);
                resolve(false);
            }
            console.log();
        }).on('error', (err) => {
            console.log(`📡 ${url}`);
            console.log(`   ❌ 网络错误: ${err.message}`);
            console.log();
            resolve(false);
        });
    });
}

// 测试API函数
function testApi(url) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({ url: 'https://example.com' });
        
        const options = {
            hostname: 'website-info-extractor-jzgq2wvdd-genrrys-projects.vercel.app',
            port: 443,
            path: '/api/extract',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = https.request(options, (res) => {
            console.log(`🔧 API测试: ${url}`);
            console.log(`   状态码: ${res.statusCode}`);
            
            if (res.statusCode === 200) {
                console.log(`   ✅ API正常工作`);
                resolve(true);
            } else if (res.statusCode === 401) {
                console.log(`   ❌ API需要身份验证`);
                resolve(false);
            } else {
                console.log(`   ❌ API错误`);
                resolve(false);
            }
            console.log();
        });
        
        req.on('error', (err) => {
            console.log(`🔧 API测试: ${url}`);
            console.log(`   ❌ API网络错误: ${err.message}`);
            console.log();
            resolve(false);
        });
        
        req.write(postData);
        req.end();
    });
}

// 运行测试
async function runTests() {
    console.log('🚀 开始测试...\n');
    
    // 测试主页
    const homePageOk = await testUrl(`${baseUrl}/`);
    
    // 测试配置页
    const configPageOk = await testUrl(`${baseUrl}/config`);
    
    // 测试API健康检查
    const healthApiOk = await testUrl(`${baseUrl}/api/health`);
    
    // 测试API提取功能
    const extractApiOk = await testApi(`${baseUrl}/api/extract`);
    
    console.log('📊 测试结果总结:');
    console.log('================');
    console.log(`主页访问: ${homePageOk ? '✅ 正常' : '❌ 异常'}`);
    console.log(`配置页访问: ${configPageOk ? '✅ 正常' : '❌ 异常'}`);
    console.log(`API健康检查: ${healthApiOk ? '✅ 正常' : '❌ 异常'}`);
    console.log(`API提取功能: ${extractApiOk ? '✅ 正常' : '❌ 异常'}`);
    console.log();
    
    if (homePageOk && configPageOk && healthApiOk && extractApiOk) {
        console.log('🎉 所有功能正常！');
    } else {
        console.log('⚠️  发现问题：');
        if (!homePageOk) console.log('   - 主页无法访问');
        if (!configPageOk) console.log('   - 配置页无法访问');
        if (!healthApiOk) console.log('   - API健康检查失败');
        if (!extractApiOk) console.log('   - API提取功能失败');
        console.log();
        console.log('🔧 建议解决方案：');
        console.log('   1. 运行快速修复脚本: ./快速修复部署.sh');
        console.log('   2. 重新部署为公开项目');
        console.log('   3. 确保选择Public选项');
    }
    
    console.log();
    console.log('✨ 测试完成！');
}

// 运行测试
runTests().catch(console.error);
