const puppeteer = require('puppeteer');

async function testPhoneExtraction() {
    let browser;
    try {
        console.log('启动Puppeteer...');
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });
        
        console.log('创建新页面...');
        const page = await browser.newPage();
        
        console.log('设置用户代理...');
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log('导航到Bjørklund网站...');
        await page.goto('https://www.bjorklund.no/bjorklund-bergen-storsenter', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        console.log('等待页面加载...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('提取页面文本...');
        const pageText = await page.evaluate(() => {
            return document.body.innerText;
        });
        
        console.log('页面文本长度:', pageText.length);
        console.log('页面文本片段:', pageText.substring(0, 500));
        
        console.log('提取电话号码...');
        const phoneInfo = await page.evaluate(() => {
            const result = {
                phone: '',
                allMatches: []
            };
            
            // 提取所有可能的电话号码
            const phoneRegex = /(\+?[\d\s\-\(\)]{7,})/g;
            const phoneMatches = document.body.innerText.match(phoneRegex);
            if (phoneMatches) {
                result.allMatches = phoneMatches;
                
                // 找到最长的电话号码
                let longestPhone = '';
                phoneMatches.forEach(phone => {
                    const cleanPhone = phone.replace(/\s+/g, '');
                    if (cleanPhone.length > longestPhone.length) {
                        longestPhone = cleanPhone;
                    }
                });
                result.phone = longestPhone;
            }
            
            // 尝试提取挪威格式的电话号码
            const norwegianPhoneRegex = /(\d{2}\s*\d{2}\s*\d{2}\s*\d{2})/g;
            const norwegianMatches = document.body.innerText.match(norwegianPhoneRegex);
            if (norwegianMatches) {
                const norwegianPhone = norwegianMatches[0].replace(/\s+/g, '');
                if (norwegianPhone.length === 8) {
                    result.phone = norwegianPhone;
                }
            }
            
            return result;
        });
        
        console.log('电话号码提取结果:', JSON.stringify(phoneInfo, null, 2));
        
        // 手动搜索完整的电话号码
        console.log('手动搜索40432283...');
        if (pageText.includes('40432283')) {
            console.log('✅ 找到完整电话号码: 40432283');
        } else {
            console.log('❌ 未找到完整电话号码: 40432283');
        }
        
        // 搜索包含4043的部分
        const matches = pageText.match(/4043\d+/g);
        if (matches) {
            console.log('找到包含4043的数字:', matches);
        }
        
    } catch (error) {
        console.error('测试失败:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

testPhoneExtraction();
