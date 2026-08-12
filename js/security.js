// js/security.js - 輕量級防篡改與資安防護模組

const SECRET_KEY = 'Jayblade_S3cur3_K3y_2024!';

// 1. 輕量混淆 (XOR + Base64)
function xorEncryptDecrypt(str) {
    let result = '';
    for (let i = 0; i < str.length; i++) {
        const charCode = str.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
        result += String.fromCharCode(charCode);
    }
    return btoa(result);
}

function xorDecrypt(encodedStr) {
    try {
        const decoded = atob(encodedStr);
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
            const charCode = decoded.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
            result += String.fromCharCode(charCode);
        }
        return result;
    } catch (e) {
        return null;
    }
}

// 2. 塗裝碼雜湊簽章 (防偽造數值)
function generateSignature(dataString) {
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
        const char = dataString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    const keyed = hash ^ SECRET_KEY.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return keyed.toString(16);
}

// 3. 安全的 LocalStorage 操作
function secureSetItem(key, value) {
    try {
        const jsonStr = JSON.stringify(value);
        const encrypted = xorEncryptDecrypt(jsonStr);
        localStorage.setItem(key, encrypted);
        return true;
    } catch (e) {
        return false;
    }
}

function secureGetItem(key) {
    try {
        const encrypted = localStorage.getItem(key);
        if (!encrypted) return null;
        const decrypted = xorDecrypt(encrypted);
        if (decrypted === null) return null;
        return JSON.parse(decrypted);
    } catch (e) {
        return null;
    }
}

// 4. XSS 輸入轉義
function sanitizeInput(input) {
    if (!input) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };
    return String(input).replace(/[&<>"'`=\/]/g, s => map[s]);
}

// 5. 安全塗裝碼生成與驗證
function generateSecureShareCode(config) {
    const cleanConfig = {
        name: sanitizeInput(config.name || '火鷹飛龍'),
        color: config.color || '#1e90ff',
        crown: config.crown || 'wizard_arc',
        tip: config.tip || 'dash_flat',
        spin: config.spin || 'RIGHT',
        angle: config.angle || '15',
        power: config.power || 'MEDIUM'
    };
    const dataStr = JSON.stringify(cleanConfig);
    const sig = generateSignature(dataStr);
    return btoa(dataStr + '|SIG|' + sig);
}

function verifySecureShareCode(code) {
    try {
        const decoded = atob(code);
        const parts = decoded.split('|SIG|');
        if (parts.length !== 2) return null;
        const dataStr = parts[0];
        const receivedSig = parts[1];
        if (receivedSig !== generateSignature(dataStr)) {
            console.warn('⚠️ 塗裝碼簽章無效！');
            return null;
        }
        const config = JSON.parse(dataStr);
        if (config.mass && config.mass > 60) return null;
        if (config.burstResist && config.burstResist > 1.0) return null;
        return config;
    } catch (e) {
        return null;
    }
}

window.Security = {
    secureSetItem,
    secureGetItem,
    sanitizeInput,
    generateSecureShareCode,
    verifySecureShareCode
};
