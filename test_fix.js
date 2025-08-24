// 测试字段名修复的脚本
async function testConfigSave() {
    console.log('🧪 测试配置保存功能...');
    
    // 测试数据
    const testData = {
        appId: 'test_app_id',
        appSecret: 'test_app_secret', 
        tableId: 'tbltest123'
    };
    
    // 测试新字段名
    console.log('📝 测试新字段名格式...');
    const newFormatResponse = await fetch('/.netlify/functions/config-save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token'
        },
        body: JSON.stringify(testData)
    });
    
    console.log('新格式响应状态:', newFormatResponse.status);
    
    // 测试旧字段名（兼容性）
    console.log('📝 测试旧字段名格式（兼容性）...');
    const oldFormatData = {
        feishuAppId: 'test_app_id_old',
        feishuAppSecret: 'test_app_secret_old',
        feishuTableId: 'tbltest456'
    };
    
    const oldFormatResponse = await fetch('/.netlify/functions/config-save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test_token'
        },
        body: JSON.stringify(oldFormatData)
    });
    
    console.log('旧格式响应状态:', oldFormatResponse.status);
    
    console.log('✅ 测试完成！');
}

// 在浏览器控制台中运行
if (typeof window !== 'undefined') {
    window.testConfigSave = testConfigSave;
    console.log('测试函数已加载，运行 testConfigSave() 开始测试');
}
