// js/game.js - 《爆上陀螺 Jayblade》2D 遊戲主控、自訂顏色與 30秒持久戰場引擎

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

function updateTelemetry(dt) {
    const debugPanel = document.getElementById('debug-panel');
    if (!debugPanel || debugPanel.style.display === 'none') return;

    const fpsCounter = document.getElementById('fps-counter');
    if (fpsCounter && dt > 0) {
        fpsCounter.innerText = Math.round(1 / dt);
    }

    activeTops.forEach((top, idx) => {
        const targetDiv = idx === 0 ? document.getElementById('p1-debug') : document.getElementById('p2-debug');
        if (targetDiv) {
            const rpm = top.getRPM();
            const speed = top.getLinearSpeed().toFixed(2);
            const ke = top.getKineticEnergy().toFixed(4);
            const hp = Math.max(0, Math.round(top.hp));

            targetDiv.innerHTML = `
                <b style="color:${top.color}">${top.name}</b><br>
                • 旋轉速度: ${rpm} RPM<br>
                • 線速度 v: ${speed} m/s<br>
                • 系統動能: ${ke} J<br>
                • 爆裂血量: ${hp}%
            `;
        }
    });
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

    const debugBtn = document.getElementById('btn-debug');
    if (debugBtn) {
        debugBtn.onclick = () => {
            const debugPanel = document.getElementById('debug-panel');
            if (debugPanel) {
                const isHidden = debugPanel.style.display === 'none' || !debugPanel.style.display;
                debugPanel.style.display = isHidden ? 'block' : 'none';
            }
        };
    }
}

export function start2DBattle() {
    canvas = document.getElementById('battleCanvas') || document.getElementById('arena');
    if (canvas) ctx = canvas.getContext('2d');

    // 🎨 正確讀取 UI 自訂名稱與顏色
    const p1Name = document.getElementById('p1-name')?.value || "火鷹";
    const p1Color = document.getElementById('p1-color')?.value || "#10b981"; // 讀取自訂顏色
    const p1Spin = (document.getElementById('p1-spin')?.value || "RIGHT") === "RIGHT";
    const p1Power = document.getElementById('p1-power')?.value || "HEAVY";
    const p1Rpm = p1Power === "HEAVY" ? 14000 : (p1Power === "MEDIUM" ? 11000 : 8500);

    const p1 = new Top2D({
        id: "p1",
        name: `${p1Name}`,
        x: STADIUM_CX - 75,
        y: STADIUM_CY + (Math.random() * 30 - 15),
        vx: 3.2 + Math.random() * 1.2,
        vy: -1.8 + Math.random() * 1.8,
        rpm: p1Rpm,
        isRightSpin: p1Spin,
        color: p1Color, // 賦予選取顏色
        radius: 22,
        mass: 0.048
    });

    const p2Name = document.getElementById('p2-name')?.value || "影武赤狼";
    const p2Color = document.getElementById('p2-color')?.value || "#ff3838";
    const p2Spin = (document.getElementById('p2-spin')?.value || "RIGHT") === "RIGHT";

    const p2 = new Top2D({
        id: "p2",
        name: `🤖 ${p2Name}`,
        x: STADIUM_CX + 75,
        y: STADIUM_CY + (Math.random() * 30 - 15),
        vx: -3.2 - Math.random() * 1.2,
        vy: 1.8 - Math.random() * 1.8,
        rpm: 12000 + Math.floor(Math.random() * 2000),
        isRightSpin: p2Spin,
        color: p2Color,
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

function checkMatchResult() {
    if (isMatchEnded || !isGameRunning) return;

    const aliveTops = activeTops.filter(t => !t.isKnockedOut && !t.isBurst && Math.abs(t.angularVelocity) > 2);

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

    if (aliveTops.length === 1 && activeTops.some(t => Math.abs(t.angularVelocity) <= 2)) {
        const winner = aliveTops[0];
        isMatchEnded = true;
        updateStatusBar(`🏆【Spin Finish】${winner.name} 旋轉持久勝出！`, "#00ff66");
        return;
    }

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
        updateTelemetry(dt);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        draw2DStadiumLayout(ctx, canvas.width, canvas.height);

        activeTops.forEach(top => {
            draw2DTop(ctx, top);
        });
    }

    animationFrameId = requestAnimationFrame(gameLoop);
}

window.start2DBattle = start2DBattle;
