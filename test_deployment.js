const fs = require('fs');
const path = require('path');

console.log('🔍 检查部署文件...');

// 检查必要的文件是否存在
const requiredFiles = [
    'index.html',
    'config.html',
    'styles.css',
    'script.js',
    'config.js',
    'server.js',
    'package.json',
    'vercel.json'
];

console.log('\n📁 检查必要文件:');
requiredFiles.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`${exists ? '✅' : '❌'} ${file}`);
});

// 检查文件内容
console.log('\n📄 检查文件内容:');

// 检查index.html中的路径引用
const indexContent = fs.readFileSync('index.html', 'utf8');
const hasStylesLink = indexContent.includes('href="styles.css"');
const hasConfigLink = indexContent.includes('href="config.html"');
console.log(`${hasStylesLink ? '✅' : '❌'} index.html 包含 styles.css 引用`);
console.log(`${hasConfigLink ? '✅' : '❌'} index.html 包含 config.html 引用`);

// 检查config.html中的路径引用
const configContent = fs.readFileSync('config.html', 'utf8');
const configHasStylesLink = configContent.includes('href="styles.css"');
const configHasConfigJs = configContent.includes('src="config.js"');
console.log(`${configHasStylesLink ? '✅' : '❌'} config.html 包含 styles.css 引用`);
console.log(`${configHasConfigJs ? '✅' : '❌'} config.html 包含 config.js 引用`);

// 检查server.js中的路由配置
const serverContent = fs.readFileSync('server.js', 'utf8');
const hasStaticMiddleware = serverContent.includes('express.static');
const hasRootRoute = serverContent.includes("app.get('/',");
const hasConfigRoute = serverContent.includes("app.get('/config',");
console.log(`${hasStaticMiddleware ? '✅' : '❌'} server.js 包含静态文件中间件`);
console.log(`${hasRootRoute ? '✅' : '❌'} server.js 包含根路由`);
console.log(`${hasConfigRoute ? '✅' : '❌'} server.js 包含配置页面路由`);

console.log('\n🎯 部署检查完成！');
console.log('\n如果所有检查都通过，请重新部署到Vercel。');
console.log('如果发现问题，请修复后重新部署。');
