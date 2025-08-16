# 网站信息提取工具

一个强大的网站信息提取工具，支持自动提取公司信息并直接写入飞书多维表格。

## ✨ 功能特点

- 🔍 **智能提取**: 自动提取公司名称、简介、地址、邮箱、电话
- 📱 **社交媒体**: 提取Instagram和Facebook链接
- 🌐 **动态渲染**: 支持JavaScript动态内容的网站
- 📊 **飞书集成**: 直接写入飞书多维表格
- 🔐 **配置管理**: 安全的飞书应用配置管理
- 📋 **GPT输出**: 结构化JSON格式数据输出

## 🚀 快速开始

### 本地运行

1. **克隆项目**
```bash
git clone <repository-url>
cd get_ins
```

2. **安装依赖**
```bash
npm install
```

3. **启动服务**
```bash
npm start
```

4. **访问应用**
打开浏览器访问 `http://localhost:3000`

### 在线使用

访问部署版本：[https://your-app.vercel.app](https://your-app.vercel.app)

## 📋 使用说明

### 1. 配置飞书应用

1. 点击页面右上角的"飞书配置"按钮
2. 输入您的飞书应用信息：
   - **App ID**: 您的飞书应用ID
   - **App Secret**: 您的飞书应用密钥
   - **多维表格链接**: 目标飞书多维表格的URL
3. 点击"保存配置"

### 2. 提取网站信息

1. 在主页输入要提取信息的网站URL
2. 点击"提取信息"按钮
3. 等待提取完成
4. 查看提取结果和飞书写入状态

### 3. 查看数据

- 在飞书多维表格中查看写入的数据
- "来自 gpt 的输出"字段包含完整的JSON格式数据

## 🔧 技术架构

- **前端**: HTML5 + CSS3 + JavaScript (ES6+)
- **后端**: Node.js + Express.js
- **爬虫**: Cheerio + Puppeteer
- **API**: 飞书开放平台API
- **部署**: Vercel

## 📊 支持的数据字段

| 字段 | 说明 |
|------|------|
| 官网地址 | 网站URL |
| 公司名 | 公司名称 |
| 简介 | 公司简介 |
| 地址 | 公司地址 |
| 邮箱 | 联系邮箱 |
| 电话 | 联系电话 |
| ins | Instagram链接 |
| Facebook | Facebook链接 |
| 来自 gpt 的输出 | 完整JSON数据 |

## 🌐 部署说明

### Vercel部署

1. **准备代码**
```bash
# 确保所有文件已提交到Git
git add .
git commit -m "Ready for deployment"
git push
```

2. **连接Vercel**
- 访问 [vercel.com](https://vercel.com)
- 使用GitHub账号登录
- 导入项目仓库
- 自动部署完成

3. **环境变量配置**
在Vercel项目设置中添加环境变量（可选）：
- `NODE_ENV=production`

### 其他部署平台

项目也支持部署到其他平台：
- Railway
- Heroku
- 阿里云
- 腾讯云

## 🔒 安全说明

- 飞书配置信息使用AES加密存储在本地浏览器
- 服务器不保存任何敏感配置信息
- 所有API调用都通过HTTPS进行

## 📝 更新日志

### v1.0.0
- ✅ 基础网站信息提取功能
- ✅ 飞书多维表格集成
- ✅ 动态渲染支持
- ✅ 配置管理功能
- ✅ 生产环境部署

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

---

**立即开始使用**: [https://your-app.vercel.app](https://your-app.vercel.app)
