// 🛡️ 資安防護: DOM-based XSS 消毒工具
export function escapeHtml(unsafeStr) {
    if (typeof unsafeStr !== 'string') return '';
    return unsafeStr
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 🌐 中英文雙語字典
export const i18nDict = {
    zh: {
        title: "🌀 爆上陀螺 Jayblade",
        subtitle: "剛體力學與家庭對戰模擬器",
        ready: "準備發射...",
        btn2p: "🎮 2人正規賽",
        btn4p: "🔥 4人障礙大亂鬥",
        btnHelper: "🎯 切換進動向量輔助線",
        chartTitle: "⚡ 系統動能留存率曲線:",
        placeholderRoom: "6 位房號",
        btnConnect: "連線房號",
        telemetryDefault: "⚙️ 請選擇對戰模式",
        touchLaunch: "👆 滑動發射",
        langBtn: "English",
        webrtcConnected: "🌐 WebRTC 已連線！",
        helperOn: "🎯 已開啟進動輔助線",
        helperOff: "🎯 已關閉進動輔助線",
        battleInProg: "人對戰中...",
        outOfBounds: "❌ 離場",
        winSuffix: " 勝出！"
    },
    en: {
        title: "🌀 Jayblade",
        subtitle: "Rigid-body Physics & Battle Simulator",
        ready: "Ready to launch...",
        btn2p: "🎮 2-Player Match",
        btn4p: "🔥 4-Player Battle Royal",
        btnHelper: "🎯 Toggle Precession Vectors",
        chartTitle: "⚡ Kinetic Energy Retention:",
        placeholderRoom: "6-digit Room ID",
        btnConnect: "Connect Room",
        telemetryDefault: "⚙️ Select a battle mode",
        touchLaunch: "👆 Swipe to Launch",
        langBtn: "繁體中文",
        webrtcConnected: "🌐 WebRTC Connected!",
        helperOn: "🎯 Precession vectors enabled",
        helperOff: "🎯 Precession vectors disabled",
        battleInProg: " Players Battle...",
        outOfBounds: "❌ Out",
        winSuffix: " Wins!"
    }
};

export class UIManager {
    constructor() {
        this.currentLang = 'zh'; // 預設為繁體中文
    }

    toggleLanguage() {
        this.currentLang = this.currentLang === 'zh' ? 'en' : 'zh';
        this.updateDOMTexts();
        return this.currentLang;
    }

    getText(key) {
        return i18nDict[this.currentLang][key] || key;
    }

    updateDOMTexts() {
        const t = i18nDict[this.currentLang];
        document.getElementById('ui-title').innerText = t.title;
        document.getElementById('ui-subtitle').innerText = t.subtitle;
        document.getElementById('btn-2p').innerText = t.btn2p;
        document.getElementById('btn-4p').innerText = t.btn4p;
        document.getElementById('btn-helper').innerText = t.btnHelper;
        document.getElementById('ui-chart-title').innerText = t.chartTitle;
        document.getElementById('room-id-input').placeholder = t.placeholderRoom;
        document.getElementById('btn-connect').innerText = t.btnConnect;
        document.getElementById('touch-launch-zone').innerText = t.touchLaunch;
        document.getElementById('btn-lang').innerText = t.langBtn;
        
        const status = document.getElementById('match-status');
        if (status.innerText === '準備發射...' || status.innerText === 'Ready to launch...') {
            status.innerText = t.ready;
        }
    }
}

export class EnergyTrackerUI {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.history = [];
        this.maxPoints = 60;
    }

    recordAndDraw(currentKE, initialKE) {
        if (initialKE <= 0) return;
        const retention = Math.max(0, (currentKE / initialKE) * 100);
        this.history.push(retention);
        if (this.history.length > this.maxPoints) this.history.shift();

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        this.history.forEach((val, i) => {
            const x = (i / (this.maxPoints - 1)) * w;
            const y = h - (val / 100) * (h - 6) - 3;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
    }
}
