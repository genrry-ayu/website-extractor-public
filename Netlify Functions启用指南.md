# 🔧 Netlify Functions 启用指南

## 📋 问题诊断

如果你遇到404错误，通常是因为Netlify Functions没有正确启用。请按照以下步骤检查和启用：

## 🚀 步骤1: 检查Netlify项目设置

### 1. 登录Netlify控制台
- 访问 [netlify.com](https://netlify.com)
- 使用GitHub账号登录
- 找到你的项目

### 2. 检查Functions设置
1. 在项目控制台中，点击 **"Functions"** 标签页
2. 确认是否显示你的函数列表
3. 如果没有显示，说明Functions未启用

## 🔧 步骤2: 启用Netlify Functions

### 方法1: 通过控制台启用
1. 在项目控制台中，点击 **"Site settings"**
2. 在左侧菜单中找到 **"Functions"**
3. 确保 **"Functions"** 功能已启用
4. 如果没有启用选项，说明你的计划不支持Functions

### 方法2: 检查Netlify计划
- **免费计划**: 支持Functions，但有使用限制
- **Pro计划**: 支持更多Functions功能
- **Business计划**: 完整Functions支持

## 📁 步骤3: 验证文件结构

确保你的项目文件结构正确：

```
your-project/
├── netlify/
│   └── functions/
│       ├── extract.js
│       └── package.json
├── netlify.toml
├── index.html
└── ...其他文件
```

## 🔄 步骤4: 重新部署

### 方法1: 触发重新部署
1. 在Netlify控制台中，点击 **"Deploys"** 标签页
2. 点击 **"Trigger deploy"** → **"Deploy site"**
3. 等待部署完成

### 方法2: 推送代码触发
```bash
git add .
git commit -m "重新配置Netlify Functions"
git push origin master
```

## 🧪 步骤5: 测试Functions

### 1. 检查Functions列表
在Netlify控制台的 **"Functions"** 标签页中，应该能看到：
- `extract` 函数

### 2. 测试函数端点
访问你的网站，然后测试：
```
https://your-site.netlify.app/.netlify/functions/extract
```

### 3. 使用测试页面
访问：
```
https://your-site.netlify.app/test_netlify_function.html
```

## 🔍 步骤6: 查看日志

### 1. 函数日志
1. 在 **"Functions"** 标签页中
2. 点击 `extract` 函数
3. 查看 **"Logs"** 标签页

### 2. 构建日志
1. 在 **"Deploys"** 标签页中
2. 点击最新的部署
3. 查看构建日志

## 🚨 常见问题解决

### 问题1: Functions标签页不显示
**解决方案**:
- 检查你的Netlify计划是否支持Functions
- 升级到支持Functions的计划

### 问题2: 函数显示但404错误
**解决方案**:
- 检查 `netlify.toml` 配置
- 确认函数文件路径正确
- 重新部署项目

### 问题3: 依赖安装失败
**解决方案**:
- 检查 `package.json` 中的依赖
- 确保Node.js版本兼容
- 查看构建日志中的错误信息

### 问题4: CORS错误
**解决方案**:
- 确认函数返回正确的CORS头部
- 检查前端请求的URL格式

## 📞 获取帮助

### 1. Netlify官方文档
- [Netlify Functions文档](https://docs.netlify.com/functions/overview/)
- [Functions配置指南](https://docs.netlify.com/functions/configure-and-deploy/)

### 2. 社区支持
- [Netlify社区论坛](https://community.netlify.com/)
- [GitHub Issues](https://github.com/netlify/netlify-functions/issues)

### 3. 联系支持
- 如果是付费用户，可以联系Netlify技术支持
- 提供详细的错误日志和配置信息

## ✅ 验证清单

完成以下检查项：

- [ ] Netlify Functions功能已启用
- [ ] 项目文件结构正确
- [ ] `netlify.toml` 配置正确
- [ ] 函数文件存在且语法正确
- [ ] 依赖已正确安装
- [ ] 项目已重新部署
- [ ] 函数在控制台中可见
- [ ] 测试页面可以正常访问
- [ ] 函数日志显示正常执行

## 🎉 成功标志

当一切配置正确时，你应该看到：

1. **Functions标签页** 显示你的函数列表
2. **测试页面** 显示所有测试通过
3. **主页面** 可以正常提取网站信息
4. **函数日志** 显示正常的执行记录

---

**如果按照以上步骤操作后仍有问题，请提供具体的错误信息和Netlify控制台截图，我会进一步协助解决！** 🚀
