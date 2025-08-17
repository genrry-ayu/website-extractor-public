# 🚀 网站信息提取器

一个智能的网站信息提取工具，可以自动从任何网站中提取公司信息、联系方式、社交媒体链接等。

## ✨ 功能特点

- 🔍 **智能提取** - 自动识别和提取网站中的关键信息
- 🌐 **支持广泛** - 支持各种类型的网站
- 📊 **飞书集成** - 自动保存到飞书多维表格
- 🎯 **简洁界面** - 简单易用的操作界面
- ⚡ **快速处理** - 高效的提取算法

## 📦 快速开始

### 方法一：一键启动（推荐）

1. **下载项目文件**
2. **双击运行**：
   - Windows: `快速启动.bat`
   - Mac/Linux: `快速启动.sh`
3. **打开浏览器**访问 `http://localhost:3000`
4. **开始使用**输入网站地址提取信息

### 方法二：手动启动

1. **安装Node.js** (https://nodejs.org/)
2. **安装依赖**：
   ```bash
   npm install
   ```
3. **启动服务**：
   ```bash
   npm start
   ```
4. **访问网页**：`http://localhost:3000`

## 📖 使用方法

1. **输入网站地址** - 例如：`https://example.com`
2. **点击提取** - 等待几秒钟
3. **查看结果** - 所有信息都会显示在页面上

## 🔧 配置飞书（可选）

1. 访问 `http://localhost:3000`
2. 点击"飞书配置"
3. 填入飞书应用信息
4. 保存配置

## 📋 提取的信息

- 官网地址
- 公司名称
- 公司简介
- 地址信息
- 邮箱地址
- 电话号码
- Instagram链接
- Facebook链接

## 🛠️ 技术栈

- **前端**: HTML, CSS, JavaScript
- **后端**: Node.js, Express
- **爬虫**: Puppeteer, Cheerio
- **集成**: 飞书开放API

## 📁 项目结构

```
get_ins/
├── index.html          # 主页面
├── styles.css          # 样式文件
├── script.js           # 前端脚本
├── server.js           # 服务器代码
├── config.html         # 飞书配置页面
├── config.js           # 配置页面脚本
├── package.json        # 项目配置
└── README.md           # 项目说明
```

## 🔧 常见问题

### 端口被占用
```bash
# 查找占用端口的进程
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows
```

### Node.js未安装
1. 访问 https://nodejs.org/
2. 下载并安装LTS版本
3. 重启终端

### 依赖安装失败
```bash
npm cache clean --force
npm install
```

## 📞 技术支持

- 📖 详细使用指南：`小白使用指南.md`
- 🐛 问题反馈：GitHub Issues
- 📧 技术支持：联系开发者

## 📄 许可证

MIT License

## 🎉 开始使用

现在就开始使用网站信息提取器吧！

1. 启动项目
2. 输入网站地址
3. 获取提取结果

**祝您使用愉快！** 🚀
