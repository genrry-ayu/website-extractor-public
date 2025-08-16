const puppeteer = require('puppeteer');

async function testLangaard() {
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
        
        console.log('导航到Langaard网站...');
        await page.goto('http://www.langaard.no/', { 
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
        console.log('页面文本片段:', pageText.substring(0, 1000));
        
        console.log('提取联系信息...');
        const contactInfo = await page.evaluate(() => {
            const result = {
                phone: '',
                address: '',
                email: '',
                allPhones: [],
                allAddresses: []
            };
            
            // 提取所有可能的电话号码
            const phoneRegex = /(\+?[\d\s\-\(\)]{7,})/g;
            const phoneMatches = document.body.innerText.match(phoneRegex);
            if (phoneMatches) {
                result.allPhones = phoneMatches;
                
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
            
            // 尝试提取完整的挪威国际格式电话号码
            const fullNorwegianPhoneRegex = /(\+47\s*\d{2}\s*\d{2}\s*\d{2}\s*\d{2})/g;
            const fullNorwegianMatches = document.body.innerText.match(fullNorwegianPhoneRegex);
            if (fullNorwegianMatches) {
                const fullPhone = fullNorwegianMatches[0].replace(/\s+/g, ' ');
                result.phone = fullPhone.trim();
            }
            
            // 提取地址
            const addressRegex = /([A-Za-zæøåÆØÅ\s]+\.?\s*\d+[A-Za-zæøåÆØÅ\s]*,\s*\d{4}\s*[A-Za-zæøåÆØÅ\s]+)/g;
            const addressMatches = document.body.innerText.match(addressRegex);
            if (addressMatches) {
                result.allAddresses = addressMatches;
                result.address = addressMatches[0].trim();
            }
            
            // 提取邮箱
            const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
            const emailMatches = document.body.innerText.match(emailRegex);
            if (emailMatches) {
                result.email = emailMatches[0];
            }
            
            return result;
        });
        
        console.log('联系信息提取结果:', JSON.stringify(contactInfo, null, 2));
        
        // 手动搜索正确的信息
        console.log('手动搜索正确信息...');
        if (pageText.includes('+47 22 00 76 90')) {
            console.log('✅ 找到完整电话号码: +47 22 00 76 90');
        } else {
            console.log('❌ 未找到完整电话号码: +47 22 00 76 90');
        }
        
        if (pageText.includes('Stortingsgt. 22, 0161 Oslo')) {
            console.log('✅ 找到完整地址: Stortingsgt. 22, 0161 Oslo');
        } else {
            console.log('❌ 未找到完整地址: Stortingsgt. 22, 0161 Oslo');
        }
        
        // 搜索包含Stortingsgt的部分
        const addressMatches = pageText.match(/Stortingsgt[^,]*,\s*\d{4}\s*Oslo/g);
        if (addressMatches) {
            console.log('找到包含Stortingsgt的地址:', addressMatches);
        }
        
        // 搜索包含+47 22 00 76的部分
        const phoneMatches = pageText.match(/\+47\s*22\s*00\s*76\s*\d+/g);
        if (phoneMatches) {
            console.log('找到包含+47 22 00 76的电话:', phoneMatches);
        }
        
    } catch (error) {
        console.error('测试失败:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

testLangaard();
