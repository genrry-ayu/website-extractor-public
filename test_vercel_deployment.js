const fs = require('fs');
const path = require('path');

console.log('🔍 检查Vercel部署配置...\n');

// 检查必需文件
const requiredFiles = [
    'index.html',
    'styles.css', 
    'script.js',
    'server.js',
    'package.json',
    'vercel.json',
    'config.html',
    'config.js'
];

console.log('📁 检查必需文件:');
let allFilesExist = true;
requiredFiles.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`  ${exists ? '✅' : '❌'} ${file}`);
    if (!exists) allFilesExist = false;
});

console.log('\n📋 检查vercel.json配置:');
try {
    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
    console.log('  ✅ vercel.json 格式正确');
    
    if (vercelConfig.routes) {
        console.log('  📍 路由配置:');
        vercelConfig.routes.forEach((route, index) => {
            console.log(`    ${index + 1}. ${route.src} -> ${route.dest}`);
        });
    }
} catch (error) {
    console.log('  ❌ vercel.json 格式错误:', error.message);
}

console.log('\n📦 检查package.json:');
try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log(`  ✅ 项目名称: ${packageJson.name}`);
    console.log(`  ✅ 主文件: ${packageJson.main}`);
    console.log(`  ✅ 启动脚本: ${packageJson.scripts.start}`);
    
    if (packageJson.dependencies) {
        console.log('  📦 依赖包:');
        Object.keys(packageJson.dependencies).forEach(dep => {
            console.log(`    - ${dep}: ${packageJson.dependencies[dep]}`);
        });
    }
} catch (error) {
    console.log('  ❌ package.json 格式错误:', error.message);
}

console.log('\n🔧 检查server.js配置:');
try {
    const serverContent = fs.readFileSync('server.js', 'utf8');
    
    // 检查静态文件服务
    const hasStaticMiddleware = serverContent.includes('express.static');
    console.log(`  ${hasStaticMiddleware ? '✅' : '❌'} 静态文件中间件`);
    
    // 检查路由配置
    const hasRootRoute = serverContent.includes("app.get('/',");
    console.log(`  ${hasRootRoute ? '✅' : '❌'} 根路径路由`);
    
    const hasConfigRoute = serverContent.includes("app.get('/config',");
    console.log(`  ${hasConfigRoute ? '✅' : '❌'} 配置页面路由`);
    
    const hasApiRoute = serverContent.includes("app.post('/api/extract'");
    console.log(`  ${hasApiRoute ? '✅' : '❌'} API提取路由`);
    
    // 检查CORS配置
    const hasCors = serverContent.includes('cors()');
    console.log(`  ${hasCors ? '✅' : '❌'} CORS中间件`);
    
} catch (error) {
    console.log('  ❌ 无法读取server.js:', error.message);
}

console.log('\n🎯 部署建议:');
if (allFilesExist) {
    console.log('  ✅ 所有必需文件都存在');
    console.log('  📤 可以部署到Vercel');
    console.log('  🌐 部署后访问: https://your-project.vercel.app');
} else {
    console.log('  ❌ 缺少必需文件，请检查项目结构');
}

console.log('\n📝 部署步骤:');
console.log('  1. 确保所有文件已提交到Git');
console.log('  2. 在Vercel中导入项目');
console.log('  3. 设置环境变量（如果需要）');
console.log('  4. 部署并测试功能');

console.log('\n✨ 检查完成！');
