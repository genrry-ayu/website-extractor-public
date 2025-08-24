# Netlify Functions 部署完整模板

## 核心配置文件

### netlify.toml（关键配置）
```toml
[build]
  command   = "npm run build"
  publish   = "."                  # 有前端产物后改成 "dist"
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"         # 显式指定打包器

# 环境变量（可选）
[build.environment]
  NODE_VERSION = "22.18.0"

# 生产环境变量（可选）
[context.production.environment]
  FEISHU_APP_ID = "your_app_id"
  FEISHU_APP_SECRET = "your_app_secret"

# 路由配置（顺序很重要！）
[[redirects]]
  from = "/api/*"
  to   = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to   = "/index.html"
  status = 200
```

### package.json（根目录）
```json
{
  "name": "your-project",
  "version": "1.0.0",
  "scripts": {
    "build": "echo \"Build completed\"",  // 有前端时改为 "vite build" 等
    "dev": "netlify dev",                 // 本地开发
    "start": "node server.js"             // 本地服务器
  },
  "dependencies": {
    "axios": "^1.6.0",
    "cheerio": "^1.0.0-rc.12"
    // 运行时依赖放这里
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
    // 开发依赖放这里
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### netlify/functions/package.json
```json
{
  "name": "netlify-functions",
  "version": "1.0.0",
  "dependencies": {
    "axios": "^1.6.0",
    "cheerio": "^1.0.0-rc.12"
  }
}
```

## 函数模板

### 健康检查函数
```javascript
// netlify/functions/health.js
exports.handler = async () => {
  console.log("health invoked at", new Date().toISOString());
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ok: true,
      node: process.version,
      timestamp: new Date().toISOString()
    })
  };
};
```

### API函数模板
```javascript
// netlify/functions/api-example.js
const axios = require('axios');

exports.handler = async (event) => {
  // CORS处理
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // 解析请求体
    const data = JSON.parse(event.body || '{}');
    
    // 你的业务逻辑
    const result = await yourBusinessLogic(data);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: result
      })
    };
  } catch (error) {
    console.error('API错误:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
```

## 部署检查清单

### 1. Netlify控制台设置（会覆盖toml）
- [ ] Branch to deploy: `main`
- [ ] Build command: `npm run build`
- [ ] Publish directory: `.`（前端构建后改`dist`）
- [ ] Base directory: 正确设置（如项目在子目录）

### 2. 文件结构检查
```
your-project/
├── netlify.toml                    # 根目录
├── package.json                    # 根目录
├── netlify/
│   └── functions/
│       ├── package.json           # 函数依赖
│       ├── health.js              # 健康检查
│       └── your-api.js            # 你的API
└── .gitignore                     # 不要忽略netlify/functions/
```

### 3. 依赖管理
- [ ] 运行时依赖在`dependencies`
- [ ] 开发依赖在`devDependencies`
- [ ] 函数目录有独立的`package.json`

### 4. 环境变量
- [ ] 敏感信息在Netlify UI设置
- [ ] 不要提交到git
- [ ] 按环境分开配置

## 本地开发

### 安装Netlify CLI
```bash
npm install -g netlify-cli
```

### 本地开发
```bash
netlify dev
```

### 测试函数
```bash
# 直接测试函数
curl http://localhost:8888/.netlify/functions/health

# 测试重定向
curl http://localhost:8888/api/health
```

## 故障排查

### 1. 函数404
- 检查netlify.toml配置
- 检查UI设置是否覆盖
- 检查函数文件是否提交

### 2. 路由不工作
- 检查重定向规则顺序
- 确认SPA兜底在最后

### 3. 依赖错误
- 检查package.json依赖位置
- 确认函数目录有package.json

### 4. 环境变量
- 检查Netlify UI设置
- 确认变量名正确

## 最佳实践

1. **总是保留health函数**用于探活
2. **使用CJS语法**（最稳定）
3. **添加CORS头**（跨域开发时）
4. **错误处理**要完善
5. **日志记录**便于调试
6. **环境变量**不要硬编码
7. **本地测试**用netlify dev
8. **依赖管理**要清晰

## 性能优化

1. **长任务拆分**避免超时
2. **缓存策略**减少重复请求
3. **错误重试**机制
4. **监控告警**设置
