const puppeteer = require('puppeteer');

async function testPuppeteer() {
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
        
        console.log('导航到测试页面...');
        await page.goto('https://www.google.com', { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        console.log('获取页面标题...');
        const title = await page.title();
        console.log('页面标题:', title);
        
        console.log('Puppeteer测试成功！');
        
    } catch (error) {
        console.error('Puppeteer测试失败:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

testPuppeteer();
