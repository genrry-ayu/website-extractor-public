# Railway 部署指南

## 步骤 1: 注册 Railway 账号
1. 访问 https://railway.app/
2. 点击 "Start a New Project"
3. 使用 GitHub 账号登录

## 步骤 2: 导入项目
1. 在 Railway 控制台点击 "Deploy from GitHub repo"
2. 选择你的 GitHub 仓库：`genrryli/website-extractor-public`
3. 点击 "Deploy Now"

## 步骤 3: 配置环境变量（可选）
如果需要配置飞书API，可以在 Railway 控制台添加环境变量：
- `FEISHU_APP_ID`: 你的飞书 App ID
- `FEISHU_APP_SECRET`: 你的飞书 App Secret

## 步骤 4: 获取部署URL
部署完成后，Railway 会自动生成一个域名，类似：
`https://your-app-name.railway.app`

## 优势
- ✅ 自动处理静态文件
- ✅ 无需复杂配置
- ✅ 免费额度充足
- ✅ 部署速度快
- ✅ 支持自定义域名

## 测试
部署完成后，访问你的 Railway URL，应该能看到完整的网站，包括样式和功能。
