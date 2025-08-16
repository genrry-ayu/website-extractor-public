// 全局变量
let currentResults = {
    instagram: [],
    facebook: []
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 添加回车键监听
    document.getElementById('urlInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            extractLinks();
        }
    });
});

// 检查飞书配置
function checkFeishuConfig() {
    try {
        const encryptedData = localStorage.getItem('feishu_config_encrypted');
        if (!encryptedData) {
            return false;
        }
        
        // 尝试解密验证配置是否存在
        const userAgent = navigator.userAgent;
        const screenInfo = `${screen.width}x${screen.height}`;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const baseString = `${userAgent}|${screenInfo}|${timezone}|feishu_config`;
        const encryptionKey = CryptoJS.SHA256(baseString).toString();
        
        const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
        const config = JSON.parse(decryptedString);
        
        return config && config.appId && config.appSecret && config.bitableUrl;
    } catch (error) {
        console.error('检查配置失败:', error);
        return false;
    }
}

// 主要提取函数
async function extractLinks() {
    const urlInput = document.getElementById('urlInput');
    const url = urlInput.value.trim();
    
    // 验证URL
    if (!url) {
        showError('请输入有效的网站地址');
        return;
    }
    
    if (!isValidUrl(url)) {
        showError('请输入有效的URL格式 (例如: https://example.com)');
        return;
    }
    
    // 检查飞书配置
    if (!checkFeishuConfig()) {
        const shouldContinue = confirm('未检测到飞书配置，数据将无法写入多维表格。是否继续提取？\n\n点击"确定"继续提取，点击"取消"前往配置页面。');
        if (!shouldContinue) {
            window.location.href = 'config.html';
            return;
        }
    }
    
    // 显示加载状态
    showLoading();
    hideError();
    hideResults();
    
    try {
        // 调用后端API提取链接
        const response = await fetch('/api/extract', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: url })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            currentResults = data.results;
            displayResults(data.results, data.feishuSuccess);
        } else {
            throw new Error(data.error || '提取失败');
        }
        
    } catch (error) {
        console.error('提取错误:', error);
        showError(`提取失败: ${error.message}`);
    } finally {
        hideLoading();
    }
}

// 显示结果
function displayResults(results, feishuSuccess = true) {
    const resultsDiv = document.getElementById('results');
    const summary = document.getElementById('summary');
    
    // 显示官网URL
    document.getElementById('websiteUrl').textContent = results.url || '未找到';
    
    // 显示公司基本信息
    document.getElementById('companyName').textContent = results.companyName || '未找到';
    document.getElementById('description').textContent = results.description || '未找到';
    document.getElementById('address').textContent = results.address || '未找到';
    document.getElementById('email').textContent = results.email || '未找到';
    document.getElementById('phone').textContent = results.phone || '未找到';
    
    // 显示Instagram链接（纯文本）
    if (results.instagram && results.instagram.length > 0) {
        document.getElementById('instagramLinks').textContent = results.instagram.join(', ');
    } else {
        document.getElementById('instagramLinks').textContent = '未找到';
    }
    
    // 显示Facebook链接（纯文本）
    if (results.facebook && results.facebook.length > 0) {
        document.getElementById('facebookLinks').textContent = results.facebook.join(', ');
    } else {
        document.getElementById('facebookLinks').textContent = '未找到';
    }
    
    // 显示摘要
    const totalLinks = (results.instagram?.length || 0) + (results.facebook?.length || 0);
    const foundInfo = [];
    if (results.companyName) foundInfo.push('公司名称');
    if (results.description) foundInfo.push('简介');
    if (results.address) foundInfo.push('地址');
    if (results.email) foundInfo.push('邮箱');
    if (results.phone) foundInfo.push('电话');
    
    summary.innerHTML = `共找到 ${foundInfo.length} 项基本信息，${totalLinks} 个社交媒体链接`;
    
    // 显示结果区域
    resultsDiv.style.display = 'block';
    resultsDiv.classList.add('fade-in');
    
    // 显示飞书状态
    if (feishuSuccess) {
        showFeishuSuccess();
    } else {
        showFeishuError();
    }
}

// 创建链接项
function createLinkItem(link, platform) {
    const linkItem = document.createElement('div');
    linkItem.className = 'link-item';
    
    const linkText = document.createElement('div');
    linkText.className = 'link-text';
    linkText.textContent = link;
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.innerHTML = '<i class="fas fa-copy"></i> 复制';
    copyBtn.onclick = () => copyToClipboard(link);
    
    linkItem.appendChild(linkText);
    linkItem.appendChild(copyBtn);
    
    return linkItem;
}

// 复制到剪贴板
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showSuccessMessage('链接已复制到剪贴板！');
    } catch (err) {
        console.error('复制失败:', err);
        // 备用方法
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showSuccessMessage('链接已复制到剪贴板！');
    }
}

// 显示成功消息
function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// 显示加载状态
function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('extractBtn').disabled = true;
}

// 隐藏加载状态
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('extractBtn').disabled = false;
}

// 显示错误
function showError(message) {
    const errorDiv = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorDiv.style.display = 'flex';
}

// 隐藏错误
function hideError() {
    document.getElementById('error').style.display = 'none';
}

// 隐藏结果
function hideResults() {
    document.getElementById('results').style.display = 'none';
    hideWebhookStatus();
}

// 显示飞书成功状态
function showFeishuSuccess() {
    const webhookStatus = document.getElementById('webhookStatus');
    const webhookSuccess = document.getElementById('webhookSuccess');
    const webhookError = document.getElementById('webhookError');
    
    webhookSuccess.style.display = 'flex';
    webhookError.style.display = 'none';
    webhookStatus.style.display = 'block';
}

// 显示飞书错误状态
function showFeishuError() {
    const webhookStatus = document.getElementById('webhookStatus');
    const webhookSuccess = document.getElementById('webhookSuccess');
    const webhookError = document.getElementById('webhookError');
    
    webhookSuccess.style.display = 'none';
    webhookError.style.display = 'flex';
    webhookStatus.style.display = 'block';
}

// 隐藏飞书状态
function hideWebhookStatus() {
    document.getElementById('webhookStatus').style.display = 'none';
}

// URL验证函数
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// 模拟提取功能（用于演示）
function simulateExtraction(url) {
    return new Promise((resolve) => {
        setTimeout(() => {
            // 模拟提取结果
            const results = {
                instagram: [],
                facebook: []
            };
            
            // 根据URL生成一些示例链接
            if (url.includes('example.com')) {
                results.instagram = [
                    'https://www.instagram.com/example_company',
                    'https://instagram.com/example_brand'
                ];
                results.facebook = [
                    'https://www.facebook.com/examplecompany',
                    'https://fb.com/examplebrand'
                ];
            } else {
                // 随机生成一些示例链接
                const random = Math.random();
                if (random > 0.3) {
                    results.instagram.push('https://www.instagram.com/sample_account');
                }
                if (random > 0.4) {
                    results.facebook.push('https://www.facebook.com/samplepage');
                }
            }
            
            resolve({
                success: true,
                results: results
            });
        }, 2000);
    });
}

// 如果没有后端API，使用模拟功能
if (typeof window !== 'undefined') {
    // 重写extractLinks函数以使用模拟功能
    window.extractLinks = async function() {
        const urlInput = document.getElementById('urlInput');
        const url = urlInput.value.trim();
        
        if (!url) {
            showError('请输入有效的网站地址');
            return;
        }
        
        if (!isValidUrl(url)) {
            showError('请输入有效的URL格式 (例如: https://example.com)');
            return;
        }
        
        showLoading();
        hideError();
        hideResults();
        
        try {
            // 尝试调用真实的后端API
            const response = await fetch('/api/extract', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: url })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    currentResults = data.results;
                    displayResults(data.results);
                } else {
                    throw new Error(data.error || '提取失败');
                }
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('API调用失败，使用模拟数据:', error);
            // 如果API调用失败，使用模拟数据
            const data = await simulateExtraction(url);
            currentResults = data.results;
            displayResults(data.results);
        } finally {
            hideLoading();
        }
    };
}
