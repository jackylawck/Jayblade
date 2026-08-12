// js/game.js - 《爆上陀螺 Jayblade》2D 遊戲主控與 UI 事件綁定

import { 
    Top2D, 
    updatePhysics2D, 
    draw2DStadiumLayout, 
    draw2DTop, 
    updateStadiumCenter,
    STADIUM_CX,
    STADIUM_CY,
    STADIUM_R
} from './engine.js';

let canvas, ctx;
let activeTops = [];
let animationFrameId = null;
let isGameRunning = false;
let lastTimestamp = performance.now();

// 初始化 2D Canvas 與事件
window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('battleCanvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d');
    resizeCanvas();

    window.addEventListener('resize', resizeCanvas);
    bindUIEvents();

    // 初始繪製戰鬥盤底圖
    draw2DStadiumLayout(ctx, canvas.width, canvas.height);
});

function resizeCanvas() {
    if (!canvas) return;
    const container = canvas.parentElement || document.body;
    canvas.width = container.clientWidth || window.innerWidth;
    canvas.height = Math.min(window.innerHeight * 0.65, 550);
    updateStadiumCenter(canvas.width, canvas.height);

    if (!isGameRunning) {
        draw2DStadiumLayout(ctx, canvas.width, canvas.height);
        activeTops.forEach(top => draw2DTop(ctx, top));
    }
}

// 綁定 UI 按鈕點擊事件
function bindUIEvents() {
    // 1. 發射按鈕綁定 (3, 2, 1... Go Shoot!)
    const launchBtn = document.getElementById('btn-launch') || document.querySelector('.btn-launch') || document.querySelector('button[id*="launch"]');
    
    // 全域尋找粉紅色發射按鈕
    const allButtons = Array.from(document.querySelectorAll('button'));
    const goShootBtn = allButtons.find(b => b.innerText.includes('Go Shoot') || b.innerText.includes('3, 2, 1'));

    const targetBtn = launchBtn || goShootBtn;

    if (targetBtn) {
        targetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            start2DBattle();
        });
    }

    // 2. 降落位置網格選擇 (1-18)
    const gridBtns = document.querySelectorAll('.grid-btn, [class*="grid"]');
    gridBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            gridBtns.forEach(b => b.classList.remove('active', 'selected', 'ring-2'));
            this.classList.add('selected');
        });
    });
}

// 開始 2D 戰鬥發射
export function start2DBattle() {
    if (!canvas || !ctx) {
        canvas = document.getElementById('battleCanvas');
        if (canvas) ctx = canvas.getContext('2d');
    }

    // 讀取 P1 自訂參數
    const p1Name = document.getElementById('p1-name')?.value || "火鷹飛龍";
    const p1Spin = (document.getElementById('p1-spin')?.value || "RIGHT") === "RIGHT";
    const p1Power = document.getElementById('p1-power')?.value || "HEAVY";
    const p1Rpm = p1Power === "HEAVY" ? 13000 : (p1Power === "MEDIUM" ? 10000 : 7500);

    // 計算 P1 初始落點 (盤面左側)
    const p1 = new Top2D({
        id: "p1",
        name: `🔵 ${p1Name}`,
        x: STADIUM_CX - 70,
        y: STADIUM_CY + (Math.random() * 40 - 20),
        vx: 3.5 + Math.random() * 1.5,
        vy: -2.0 + Math.random() * 2.0,
        rpm: p1Rpm,
        isRightSpin: p1Spin,
        color: "#0284c7",
        radius: 22,
        mass: 0.048
    });

    // 自動匹配 AI 對手 (盤面右側)
    const aiNames = ["🤖 暗黑狂狼", "🤖 幻影巨龍", "🤖 聖光神盾", "🤖 暴風阿修羅"];
    const randomAiName = aiNames[Math.floor(Math.random() * aiNames.length)];
    const randomAiSpin = Math.random() > 0.5;
    const randomAiRpm = 9500 + Math.floor(Math.random() * 3500);

    const p2 = new Top2D({
        id: "p2",
        name: randomAiName,
        x: STADIUM_CX + 70,
        y: STADIUM_CY + (Math.random() * 40 - 20),
        vx: -3.5 - Math.random() * 1.5,
        vy: 2.0 - Math.random() * 2.0,
        rpm: randomAiRpm,
        isRightSpin: randomAiSpin,
        color: "#e11d48",
        radius: 22,
        mass: 0.045
    });

    activeTops = [p1, p2];
    isGameRunning = true;
    lastTimestamp = performance.now();

    // 📱 手機端自動滾動畫面至 2D 戰鬥盤 Canvas 位置
    if (canvas) {
        canvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    gameLoop(performance.now());
}

// 2D 渲染主循環
function gameLoop(now) {
    const dt = Math.min((now - lastTimestamp) / 1000, 0.05);
    lastTimestamp = now;

    if (isGameRunning) {
        // 1. 物理演算更新
        updatePhysics2D(activeTops, dt, (eventType, data) => {
            if (eventType === "KNOCKOUT") {
                console.log(`💥 [擊飛] ${data.top.name} 落入 ${data.pocket.name}`);
            } else if (eventType === "BURST") {
                console.log(`🔥 [爆裂] ${data.winner.name} 擊碎了 ${data.loser.name}`);
            }
        });

        // 2. 清空畫面並繪製賽場級瓷白美化盤面
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        draw2DStadiumLayout(ctx, canvas.width, canvas.height);

        // 3. 繪製所有陀螺
        activeTops.forEach(top => {
            draw2DTop(ctx, top);
        });
    }

    animationFrameId = requestAnimationFrame(gameLoop);
}

// 全域導出供按鈕直接調用
window.start2DBattle = start2DBattle;
