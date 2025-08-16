const axios = require('axios');

async function testWebhook() {
    try {
        console.log('测试webhook功能...');
        
        // 测试数据
        const testData = {
            input: {
                url: "http://www.langaard.no/",
                companyName: "Juveler Langaard",
                description: "Besøk vår butikk i Stortingsgaten 22. Se vårt store utvalg av diamantsmykker, eller skap ditt drømmesmykke sammen med oss.",
                address: "STORTINGSGT. 22, 0161 OSLO",
                email: "INFO@LANGAARD.NO",
                phone: "+47 22 00 76 90",
                instagram: ["https://www.instagram.com/juvelerlangaard/"],
                facebook: ["https://www.facebook.com/juvelerlangaard/"],
                extractedAt: new Date().toISOString()
            }
        };
        
        console.log('发送测试数据到webhook...');
        console.log('数据内容:', JSON.stringify(testData, null, 2));
        
        const response = await axios.post('https://n8n-ljmjugin.us-east-1.clawcloudrun.com/webhook/to_base', testData, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ Webhook测试成功!');
        console.log('状态码:', response.status);
        console.log('响应数据:', response.data);
        
    } catch (error) {
        console.error('❌ Webhook测试失败:');
        console.error('错误信息:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', error.response.data);
        }
    }
}

// 运行测试
testWebhook();
