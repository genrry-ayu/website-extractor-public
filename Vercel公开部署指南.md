# 🔓 Vercel公开部署指南

## 🔍 问题诊断

### 当前问题
- 网站返回401错误（需要身份验证）
- 功能完全不可用
- 飞书配置信息无法保存

### 根本原因
**Vercel项目被设置为私有项目**，需要身份验证才能访问。

## ✅ 解决方案

### 方法一：在Vercel控制台中设置公开访问

#### 步骤1：登录Vercel控制台
- 访问 https://vercel.com/dashboard
- 找到您的项目 `website-info-extractor`

#### 步骤2：查找访问控制设置
由于Vercel界面经常更新，请尝试以下位置：

**选项A：项目设置**
1. 点击项目名称进入项目详情
2. 点击 "Settings" 标签
3. 查找以下选项：
   - "Access Control"（访问控制）
   - "Privacy"（隐私）
   - "Visibility"（可见性）
   - "Public Access"（公开访问）

**选项B：部署设置**
1. 点击项目名称
2. 点击 "Deployments" 标签
3. 找到最新的部署
4. 点击部署详情
5. 查找访问控制选项

**选项C：团队设置**
1. 如果项目在团队中，点击团队名称
2. 进入 "Settings" → "General"
3. 查找项目可见性设置

#### 步骤3：设置为公开
找到相关设置后：
- 将项目设置为 "Public"（公开）
- 或关闭 "Password Protection"（密码保护）
- 或禁用 "Access Control"（访问控制）

#### 步骤4：重新部署
- 触发重新部署
- 等待部署完成

### 方法二：创建新的公开项目（推荐）

#### 步骤1：创建新的GitHub仓库
```bash
# 在GitHub上创建新的公开仓库
# 例如：website-info-extractor-public
```

#### 步骤2：推送代码到新仓库
```bash
# 在本地执行
git remote remove origin
git remote add origin https://github.com/your-username/website-info-extractor-public.git
git push -u origin main
```

#### 步骤3：在Vercel中导入新项目
1. 访问 https://vercel.com/new
2. 选择 "Import Git Repository"
3. 选择您的新公开仓库
4. **重要**：确保在导入时选择 "Public" 选项

### 方法三：使用Vercel CLI重新部署

#### 步骤1：安装Vercel CLI
```bash
npm install -g vercel
```

#### 步骤2：登录并重新部署
```bash
# 登录Vercel
vercel login

# 重新部署（会提示设置选项）
vercel --prod

# 在部署过程中，确保选择：
# - Public（公开）
# - 不设置密码保护
```

### 方法四：检查项目类型

#### 检查是否为团队项目
1. 在Vercel控制台中查看项目
2. 如果显示团队名称，说明是团队项目
3. 团队项目可能有特殊的访问控制

#### 联系团队管理员
如果是团队项目：
1. 联系Vercel团队管理员
2. 请求将项目设置为公开
3. 或创建个人项目

## 🔧 验证修复

### 1. 检查公开访问
```bash
# 测试主页访问
curl -I "https://your-project.vercel.app/"

# 应该返回200状态码，而不是401
```

### 2. 测试API功能
```bash
# 测试健康检查API
curl "https://your-project.vercel.app/api/health"

# 应该返回JSON响应
```

### 3. 测试前端功能
- 访问网站主页
- 输入测试URL：`https://example.com`
- 点击"提取信息"按钮
- 检查是否能正常提取信息

## 📋 部署检查清单

### 部署前检查
- [ ] 项目设置为公开访问
- [ ] 所有必需文件已提交
- [ ] vercel.json配置正确
- [ ] package.json配置正确

### 部署后检查
- [ ] 网站可以正常访问（200状态码）
- [ ] 样式正确加载
- [ ] 功能正常工作
- [ ] 飞书配置可以保存
- [ ] API接口正常响应

## 🎯 预期结果

修复后应该看到：
- ✅ 网站可以公开访问
- ✅ 样式和功能正常
- ✅ 飞书配置可以保存
- ✅ 信息提取功能正常

## 📞 如果仍有问题

### 检查Vercel日志
1. 在Vercel控制台查看部署日志
2. 检查是否有构建错误
3. 查看运行时错误

### 常见问题解决
1. **401错误**: 确保项目设置为公开
2. **404错误**: 检查路由配置
3. **500错误**: 检查服务器代码
4. **样式问题**: 检查静态文件路径

### 联系支持
如果问题持续存在，请提供：
- Vercel项目URL
- 错误截图
- 控制台错误信息
- 项目设置截图

---

**设置为公开访问后，您的网站应该能正常工作！** 🎉
