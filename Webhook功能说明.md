# Webhook功能说明

## 🎯 功能概述

在信息提取完成后，系统会自动向指定的webhook发送提取结果，实现数据自动同步和存储。

## 🔧 技术实现

### 1. Webhook配置
- **URL**: `https://n8n-ljmjugin.us-east-1.clawcloudrun.com/webhook/to_base`
- **方法**: POST
- **内容类型**: application/json
- **超时时间**: 10秒

### 2. 数据格式
```json
{
  "input": {
    "url": "提取的网站URL",
    "companyName": "公司名称",
    "description": "公司简介",
    "address": "公司地址",
    "email": "邮箱地址",
    "phone": "电话号码",
    "instagram": ["Instagram链接数组"],
    "facebook": ["Facebook链接数组"],
    "extractedAt": "提取时间戳"
  }
}
```

### 3. 代码实现
```javascript
// 发送提取结果到webhook
try {
    const webhookData = {
        input: {
            url: targetUrl.href,
            companyName: websiteInfo.companyName,
            description: websiteInfo.description,
            address: websiteInfo.address,
            email: websiteInfo.email,
            phone: websiteInfo.phone,
            instagram: websiteInfo.instagram,
            facebook: websiteInfo.facebook,
            extractedAt: new Date().toISOString()
        }
    };
    
    console.log('正在发送数据到webhook...');
    const webhookResponse = await axios.post('https://n8n-ljmjugin.us-east-1.clawcloudrun.com/webhook/to_base', webhookData, {
        timeout: 10000,
        headers: {
            'Content-Type': 'application/json'
        }
    });
    console.log('Webhook发送成功:', webhookResponse.status);
} catch (webhookError) {
    console.error('Webhook发送失败:', webhookError.message);
    // 不阻止正常响应，只记录错误
}
```

## 📊 功能特点

### ✅ 优势
- **自动同步**: 提取完成后立即发送数据
- **错误容错**: webhook失败不影响正常API响应
- **完整数据**: 包含所有提取的信息字段
- **时间戳**: 记录数据提取时间
- **异步处理**: 不阻塞用户请求

### 🔄 工作流程
1. 用户发起提取请求
2. 系统提取网站信息
3. 返回提取结果给用户
4. 后台自动发送数据到webhook
5. 记录发送状态

## 🧪 测试验证

### 测试脚本
```javascript
// test_webhook.js
const axios = require('axios');

async function testWebhook() {
    try {
        const testData = {
            input: {
                url: "http://www.langaard.no/",
                companyName: "Juveler Langaard",
                description: "Besøk vår butikk i Stortingsgaten 22...",
                address: "STORTINGSGT. 22, 0161 OSLO",
                email: "INFO@LANGAARD.NO",
                phone: "+47 22 00 76 90",
                instagram: ["https://www.instagram.com/juvelerlangaard/"],
                facebook: ["https://www.facebook.com/juvelerlangaard/"],
                extractedAt: new Date().toISOString()
            }
        };
        
        const response = await axios.post('https://n8n-ljmjugin.us-east-1.clawcloudrun.com/webhook/to_base', testData, {
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' }
        });
        
        console.log('✅ Webhook测试成功!');
        console.log('状态码:', response.status);
        console.log('响应数据:', response.data);
        
    } catch (error) {
        console.error('❌ Webhook测试失败:', error.message);
    }
}

testWebhook();
```

### 测试结果
```
✅ Webhook测试成功!
状态码: 200
响应数据: { message: 'Workflow was started' }
```

## 📋 数据字段说明

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| url | string | 提取的网站URL | "http://www.langaard.no/" |
| companyName | string | 公司名称 | "Juveler Langaard" |
| description | string | 公司简介 | "Besøk vår butikk..." |
| address | string | 公司地址 | "STORTINGSGT. 22, 0161 OSLO" |
| email | string | 邮箱地址 | "INFO@LANGAARD.NO" |
| phone | string | 电话号码 | "+47 22 00 76 90" |
| instagram | array | Instagram链接数组 | ["https://www.instagram.com/juvelerlangaard/"] |
| facebook | array | Facebook链接数组 | ["https://www.facebook.com/juvelerlangaard/"] |
| extractedAt | string | 提取时间戳 | "2025-08-16T09:23:18.238Z" |

## 🔍 错误处理

### 错误类型
- **网络错误**: 连接超时、DNS解析失败
- **服务器错误**: webhook服务器返回错误状态码
- **数据错误**: 数据格式问题

### 处理策略
- **非阻塞**: webhook失败不影响API正常响应
- **日志记录**: 详细记录错误信息
- **重试机制**: 可考虑添加重试逻辑

## 🚀 使用示例

### API调用
```bash
curl -X POST http://localhost:3000/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url":"http://www.langaard.no/"}'
```

### 响应结果
```json
{
  "success": true,
  "results": {
    "companyName": "Juveler Langaard",
    "description": "Besøk vår butikk i Stortingsgaten 22...",
    "address": "STORTINGSGT. 22, 0161 OSLO",
    "email": "INFO@LANGAARD.NO",
    "phone": "+47 22 00 76 90",
    "instagram": ["https://www.instagram.com/juvelerlangaard/"],
    "facebook": ["https://www.facebook.com/juvelerlangaard/"]
  },
  "url": "http://www.langaard.no/"
}
```

### 后台webhook发送
- ✅ 数据自动发送到 `https://n8n-ljmjugin.us-east-1.clawcloudrun.com/webhook/to_base`
- ✅ 包含完整的提取信息
- ✅ 添加时间戳记录

## 🔮 扩展功能

### 可扩展的webhook功能
- **多webhook支持**: 支持发送到多个不同的webhook
- **数据过滤**: 根据条件选择性发送数据
- **重试机制**: 失败时自动重试
- **数据压缩**: 大数据量时压缩传输
- **认证机制**: 添加API密钥等认证方式

---

**Webhook功能已成功集成，现在每次信息提取后都会自动发送数据到指定端点！** 🎉
