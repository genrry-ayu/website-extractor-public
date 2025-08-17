# 🔧 Sidebar扩展错误修复指南

## 🚨 常见错误及解决方案

### 错误1: Chrome Side Panel API 错误

**错误信息**: `chrome.sidePanel is not defined` 或类似API错误

**原因**: Chrome版本过低或API使用方式不正确

**解决方案**:

1. **检查Chrome版本**
   - 确保Chrome版本 >= 114
   - 在地址栏输入 `chrome://version/` 查看版本

2. **使用简化版本**
   - 将 `background_sidebar.js` 替换为 `background_simple.js`
   - 在 `manifest.json` 中更新引用

3. **修复manifest配置**
   ```json
   {
     "manifest_version": 3,
     "permissions": [
       "activeTab",
       "storage",
       "scripting",
       "sidePanel"
     ],
     "side_panel": {
       "default_path": "sidebar.html"
     },
     "background": {
       "service_worker": "background_simple.js"
     }
   }
   ```

### 错误2: 侧边栏无法打开

**错误信息**: 点击扩展图标后侧边栏不显示

**解决方案**:

1. **检查权限设置**
   - 确保扩展有 `sidePanel` 权限
   - 重新加载扩展

2. **手动打开侧边栏**
   - 右键扩展图标
   - 选择"打开侧边栏"

3. **使用简化代码**
   ```javascript
   // 在background script中
   chrome.action.onClicked.addListener((tab) => {
       chrome.sidePanel.open();
   });
   ```

### 错误3: 内容脚本通信失败

**错误信息**: `Cannot send message to content script`

**解决方案**:

1. **检查content script注入**
   - 确保 `content_sidebar.js` 正确注入
   - 检查manifest中的matches配置

2. **添加错误处理**
   ```javascript
   try {
       const response = await chrome.tabs.sendMessage(tabId, message);
   } catch (error) {
       console.error('Content script通信失败:', error);
   }
   ```

## 🛠️ 快速修复步骤

### 步骤1: 更新文件

1. **重命名文件**:
   ```
   background_simple.js → background.js
   content_sidebar.js → content.js
   ```

2. **更新manifest.json**:
   ```json
   {
     "background": {
       "service_worker": "background.js"
     },
     "content_scripts": [
       {
         "matches": ["<all_urls>"],
         "js": ["content.js"]
       }
     ]
   }
   ```

### 步骤2: 简化功能

1. **移除复杂的侧边栏控制**
   - 删除 `toggleSidebar()` 功能
   - 使用简单的 `chrome.sidePanel.open()`

2. **简化错误处理**
   - 添加try-catch块
   - 提供用户友好的错误信息

### 步骤3: 测试安装

1. **重新加载扩展**
   - 在 `chrome://extensions/` 中点击刷新按钮
   - 或删除后重新加载

2. **测试基本功能**
   - 点击扩展图标
   - 检查侧边栏是否打开
   - 测试信息提取功能

## 📋 完整的修复版本

### manifest.json (修复版)
```json
{
  "manifest_version": 3,
  "name": "网站信息提取器 - 侧边栏版",
  "version": "1.0.0",
  "description": "智能提取网站信息 - 侧边栏版本",
  "permissions": [
    "activeTab",
    "storage",
    "scripting",
    "sidePanel"
  ],
  "host_permissions": [
    "https://*/*",
    "http://*/*",
    "https://open.feishu.cn/*"
  ],
  "action": {
    "default_title": "网站信息提取器",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "side_panel": {
    "default_path": "sidebar.html"
  },
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_end"
    }
  ]
}
```

### background.js (简化版)
```javascript
// 简化版本的Background Script
class SimpleBackgroundManager {
    constructor() {
        this.setupMessageListener();
        this.setupActionListener();
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'sendToFeishu') {
                this.sendToFeishu(request.data, request.config).then(sendResponse);
                return true;
            }
        });
    }

    setupActionListener() {
        chrome.action.onClicked.addListener((tab) => {
            chrome.sidePanel.open();
        });
    }

    // ... 其他方法保持不变
}

new SimpleBackgroundManager();
```

## 🔍 调试方法

### 1. 查看控制台错误
- 右键扩展图标 → 检查弹出内容
- 查看Console标签页的错误信息

### 2. 检查扩展权限
- 在 `chrome://extensions/` 中查看扩展详情
- 确认所有权限都已授予

### 3. 测试API可用性
```javascript
// 在background script中测试
console.log('Chrome API:', {
    sidePanel: typeof chrome.sidePanel,
    action: typeof chrome.action,
    runtime: typeof chrome.runtime
});
```

## 📞 如果问题仍然存在

如果按照上述步骤修复后仍有问题，请：

1. **提供错误信息**
   - 完整的错误日志
   - Chrome版本信息
   - 操作系统信息

2. **尝试替代方案**
   - 使用弹出窗口版本
   - 或使用网络部署版本

3. **检查兼容性**
   - 确认Chrome版本支持Side Panel API
   - 检查是否有其他扩展冲突

---

**按照这个修复指南，您的侧边栏扩展应该能够正常工作！** 🎉
