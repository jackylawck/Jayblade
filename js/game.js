// js/game.js - 《爆上陀螺 Jayblade》2D 遊戲主控與勝負賽果判定引擎

import { 
    Top2D, 
    updatePhysics2D, 
    draw2DStadiumLayout, 
    draw2DTop, 
    updateStadiumCenter,
    STADIUM_CX,
    STADIUM_CY
} from './engine.js';

let canvas, ctx;
let activeTops = [];
let animationFrameId = null;
let isGameRunning = false;
let isMatchEnded = false;
let lastTimestamp = performance.now();

window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('battleCanvas') || document.getElementById('arena');
    if (!canvas) return;

    ctx = canvas.getContext('2d');
    resizeCanvas();

    window.addEventListener('resize', resizeCanvas);
    bindUIEvents();

    draw2DStadiumLayout(ctx, canvas.width, canvas.height);
});

function resizeCanvas() {
    if (!canvas) return;
    const container = canvas.parentElement || document.body;
    canvas.width = container.clientWidth || window.innerWidth;
    canvas.height = Math.min(window.innerHeight * 0.6, 500);
    updateStadiumCenter(canvas.width, canvas.height);

    if (!isGameRunning) {
        draw2DStadiumLayout(ctx, canvas.width, canvas.height);
        activeTops.forEach(top => draw2DTop(ctx, top));
    }
}

function updateStatusBar(text, color = "#ffcc00") {
    const statusBar = document.getElementById('status-bar');
    if (statusBar) {
        statusBar.innerText = text;
        statusBar.style.color = color;
    }
}

function bindUIEvents() {
    const launchBtn = document.getElementById('btn-launch') || document.querySelector('.btn-launch');
    if (launchBtn) {
        launchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            start2DBattle();
        });
    }

    const resetBtn = document.getElementById('btn-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            isGameRunning = false;
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            const setupPanel = document.getElementById('setup-panel');
            const gamePanel = document.getElementById('game-panel');
            if (setupPanel) setupPanel.style.display = 'block';
            if (gamePanel) gamePanel.style.display = 'none';
        });
    }
}

export function start2DBattle() {
    canvas = document.getElementById('battleCanvas') || document.getElementById('arena');
    if (canvas) ctx = canvas.getContext('2d');

    const p1Name = document.getElementById('p1-name')?.value || "火鷹飛龍";
    const p1Spin = (document.getElementById('p1-spin')?.value || "RIGHT") === "RIGHT";
    const p1Power = document.getElementById('p1-power')?.value || "HEAVY";
    const p1Rpm = p1Power === "HEAVY" ? 13000 : (p1Power === "MEDIUM" ? 10000 : 7500);

    const p1 = new Top2D({
        id: "p1",
        name: `🔵 ${p1Name}`,
        x: STADIUM_CX - 75,
        y: STADIUM_CY + (Math.random() * 30 - 15),
        vx: 3.2 + Math.random() * 1.2,
        vy: -1.8 + Math.random() * 1.8,
        rpm: p1Rpm,
        isRightSpin: p1Spin,
        color: "#0284c7",
        radius: 22,
        mass: 0.048
    });

    const aiNames = ["🤖 暗黑狂狼", "🤖 幻影巨龍", "🤖 聖光神盾", "🤖 暴風阿修羅"];
    const randomAiName = aiNames[Math.floor(Math.random() * aiNames.length)];
    const randomAiSpin = Math.random() > 0.5;
    const randomAiRpm = 9500 + Math.floor(Math.random() * 3500);

    const p2 = new Top2D({
        id: "p2",
        name: randomAiName,
        x: STADIUM_CX + 75,
        y: STADIUM_CY + (Math.random() * 30 - 15),
        vx: -3.2 - Math.random() * 1.2,
        vy: 1.8 - Math.random() * 1.8,
        rpm: randomAiRpm,
        isRightSpin: randomAiSpin,
        color: "#e11d48",
        radius: 22,
        mass: 0.045
    });

    activeTops = [p1, p2];
    isGameRunning = true;
    isMatchEnded = false;
    lastTimestamp = performance.now();

    updateStatusBar("⚔️ 對戰進行中... 兩車對撞！", "#00d2d3");

    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    gameLoop(performance.now());
}

// 🏆 勝負判斷邏輯 Engine
function checkMatchResult() {
    if (isMatchEnded || !isGameRunning) return;

    const aliveTops = activeTops.filter(t => !t.isKnockedOut && !t.isBurst && Math.abs(t.angularVelocity) > 2);

    // 1. 口袋擊飛 / 爆裂勝利
    const burstTop = activeTops.find(t => t.isBurst);
    const koTop = activeTops.find(t => t.isKnockedOut);

    if (burstTop) {
        const winner = activeTops.find(t => t !== burstTop);
        isMatchEnded = true;
        updateStatusBar(`💥【爆裂 Finish】${winner ? winner.name : '對手'} 擊碎了 ${burstTop.name}！`, "#ff3838");
        return;
    }

    if (koTop) {
        const winner = activeTops.find(t => t !== koTop);
        isMatchEnded = true;
        updateStatusBar(`⚠️【擊飛 Finish】${koTop.name} 被鏟出 ${koTop.knockoutReason}！`, "#ff9f43");
        return;
    }

    // 2. 持久勝 (Spin Finish)
    if (aliveTops.length === 1 && activeTops.some(t => Math.abs(t.angularVelocity) <= 2)) {
        const winner = aliveTops[0];
        isMatchEnded = true;
        updateStatusBar(`🏆【Spin Finish】${winner.name} 旋轉持久勝出！`, "#00ff66");
        return;
    }

    // 3. 雙方平手停轉
    if (aliveTops.length === 0) {
        isMatchEnded = true;
        updateStatusBar("⚖️【雙方停轉】本局平手 (Draw)！", "#aaa");
    }
}

function gameLoop(now) {
    const dt = Math.min((now - lastTimestamp) / 1000, 0.05);
    lastTimestamp = now;

    if (isGameRunning) {
        updatePhysics2D(activeTops, dt, (eventType, data) => {
            if (eventType === "KNOCKOUT") {
                updateStatusBar(`⚠️ ${data.top.name} 被擊飛至 ${data.pocket.name}！`, "#ff9f43");
            } else if (eventType === "BURST") {
                updateStatusBar(`💥 ${data.winner.name} 擊爆 ${data.loser.name}！`, "#ff3838");
            }
        });

        checkMatchResult();

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        draw2DStadiumLayout(ctx, canvas.width, canvas.height);

        activeTops.forEach(top => {
            draw2DTop(ctx, top);
        });
    }

    animationFrameId = requestAnimationFrame(gameLoop);
}

window.start2DBattle = start2DBattle;
