const puppeteer = require('puppeteer');

async function testBjorklund() {
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
        
        console.log('获取页面标题...');
        const title = await page.title();
        console.log('页面标题:', title);
        
        console.log('提取页面信息...');
        const pageInfo = await page.evaluate(() => {
            const result = {
                title: document.title,
                email: '',
                phone: '',
                address: '',
                instagram: [],
                facebook: []
            };
            
            // 提取邮箱
            const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
            const emailMatches = document.body.innerText.match(emailRegex);
            if (emailMatches) {
                result.email = emailMatches[0];
            }
            
            // 提取电话号码
            const phoneRegex = /(\+?[\d\s\-\(\)]{7,})/g;
            const phoneMatches = document.body.innerText.match(phoneRegex);
            if (phoneMatches) {
                result.phone = phoneMatches[0].replace(/\s+/g, '');
            }
            
            // 提取社交媒体链接
            const links = document.querySelectorAll('a[href]');
            links.forEach(link => {
                const href = link.href;
                if (href.includes('instagram.com')) {
                    result.instagram.push(href);
                } else if (href.includes('facebook.com')) {
                    result.facebook.push(href);
                }
            });
            
            return result;
        });
        
        console.log('提取结果:', JSON.stringify(pageInfo, null, 2));
        
    } catch (error) {
        console.error('测试失败:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

testBjorklund();
