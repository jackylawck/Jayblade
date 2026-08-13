// js/game3d.js - 爆上陀螺 3D UI 互動、質感物理數據與對戰邏輯主控

import { 
    init3DEngine, 
    Beyblade3DPhysics, 
    handle3DTopCollisions,
    activeTops, 
    world, 
    scene, 
    update3DSparks, 
    controls, 
    renderer, 
    camera 
} from './engine3d.js';

let isSimulating = false;
let isMatchEnded = false;
let isCountdownRunning = false;
let lastTime = performance.now();

function hexToNum(hexStr) {
    if (!hexStr) return 0x0284c7;
    return parseInt(hexStr.replace('#', ''), 16);
}

function update3DStatus(text, color = "#38bdf8") {
    const banner = document.getElementById('match-status');
    if (banner) {
        banner.innerText = text;
        banner.style.color = color;
    }
}

function handleMatchEnd(resultText, color) {
    if (isMatchEnded) return;
    isMatchEnded = true;
    update3DStatus(resultText, color);

    const box = document.getElementById('ui-overlay-box');
    if (box) box.style.display = 'block';
}

function check3DMatchResult() {
    if (isMatchEnded || !isSimulating || isCountdownRunning || activeTops.length < 2) return;

    const aliveTops = activeTops.filter(t => !t.isKnockedOut && !t.isBurst && t.getRPM() > 40);
    const burstTop = activeTops.find(t => t.isBurst);
    const koTop = activeTops.find(t => t.isKnockedOut);

    if (burstTop) {
        const winner = activeTops.find(t => t !== burstTop);
        handleMatchEnd(`💥【爆裂 Finish】${winner ? winner.name : '對手'} 擊碎了 ${burstTop.name}！`, "#ff3838");
        return;
    }

    if (koTop) {
        const winner = activeTops.find(t => t !== koTop);
        handleMatchEnd(`⚠️【擊飛 Finish】${koTop.name} 被鏟飛出場外！`, "#ff9f43");
        return;
    }

    if (aliveTops.length === 1 && activeTops.some(t => t.getRPM() <= 40)) {
        const winner = aliveTops[0];
        handleMatchEnd(`🏆【Spin Finish】${winner.name} 旋轉持久勝出！`, "#00ff66");
        return;
    }

    if (aliveTops.length === 0) {
        handleMatchEnd("⚖️【雙方停轉】本局平手 (Draw)！", "#aaa");
    }
}

function runCountdownLaunch(mode) {
    if (isCountdownRunning) return;
    isCountdownRunning = true;
    isMatchEnded = false;

    activeTops.forEach(t => { world.remove(t.body); scene.remove(t.group); });
    activeTops.length = 0;

    const sequence = ["3...", "2...", "1...", "🔥 GO!"];
    let step = 0;

    update3DStatus("3...", "#00f2fe");

    const timer = setInterval(() => {
        step++;
        if (step < sequence.length) {
            update3DStatus(sequence[step], step === 3 ? "#ff3838" : "#00f2fe");
        } else {
            clearInterval(timer);
            isCountdownRunning = false;
            
            if (window.innerWidth <= 768) {
                const box = document.getElementById('ui-overlay-box');
                if (box) box.style.display = 'none';
            }

            spawnTopsAndStart(mode);
        }
    }, 600);
}

function spawnTopsAndStart(mode) {
    const p1Name = document.getElementById('p1-name')?.value || '火鷹飛龍';
    const p1Color = hexToNum(document.getElementById('p1-color')?.value);
    const p1Crown = document.getElementById('p1-crown')?.value || 'FEATHER';
    const p1Tip = document.getElementById('p1-tip')?.value || 'FLAT';
    const p1Spin = document.getElementById('p1-spin')?.value === 'RIGHT';
    const p1Power = document.getElementById('p1-power')?.value;
    const p1Rpm = p1Power === 'HEAVY' ? 12000 : (p1Power === 'MEDIUM' ? 9500 : 7000);

    const p1 = new Beyblade3DPhysics({
        name: '🔵 ' + p1Name, x: -2.5, y: 1.2, z: 0, rpm: p1Rpm, isRightSpin: p1Spin, color: p1Color,
        crownKey: p1Crown, tipKey: p1Tip
    });
    p1.body.velocity.set(3.2, -1.5, 1.2);
    activeTops.push(p1);

    if (mode === 'VS_AI') {
        const aiNames = ['🤖 暗黑狂狼', '🤖 幻影巨龍', '🤖 聖光神盾', '🤖 暴風阿修羅'];
        const randomName = aiNames[Math.floor(Math.random() * aiNames.length)];
        const randomSpin = Math.random() > 0.5;
        const randomRpm = 8500 + Math.floor(Math.random() * 3500);

        const ai = new Beyblade3DPhysics({
            name: randomName, x: 2.5, y: 1.2, z: 0, rpm: randomRpm, isRightSpin: randomSpin, color: 0xe11d48,
            crownKey: 'DRAKE', tipKey: 'BALL'
        });
        ai.body.velocity.set(-3.2, -1.5, -1.2);
        activeTops.push(ai);

        update3DStatus('⚔️ 對戰進行中... 兩車對撞！', '#00d2d3');

    } else if (mode === 2) {
        const p2Name = document.getElementById('p2-name')?.value || '影武赤狼';
        const p2Color = hexToNum(document.getElementById('p2-color')?.value);
        const p2Crown = document.getElementById('p2-crown')?.value || 'DRAKE';
        const p2Tip = document.getElementById('p2-tip')?.value || 'BALL';
        const p2Spin = document.getElementById('p2-spin')?.value === 'RIGHT';
        const p2Power = document.getElementById('p2-power')?.value;
        const p2Rpm = p2Power === 'HEAVY' ? 12000 : (p2Power === 'MEDIUM' ? 9500 : 7000);

        const p2 = new Beyblade3DPhysics({
            name: '🔴 ' + p2Name, x: 2.5, y: 1.2, z: 0, rpm: p2Rpm, isRightSpin: p2Spin, color: p2Color,
            crownKey: p2Crown, tipKey: p2Tip
        });
        p2.body.velocity.set(-3.2, -1.5, -1.2);
        activeTops.push(p2);

        update3DStatus('⚔️ 雙人對戰進行中...', '#00d2d3');

    } else if (mode === 4) {
        const p2Name4 = document.getElementById('p2-name')?.value || '影武赤狼';
        const p2_4 = new Beyblade3DPhysics({
            name: '🔴 ' + p2Name4, x: 2.5, y: 1.2, z: 0, rpm: 11000, isRightSpin: false, color: 0xe11d48, crownKey: 'DRAKE', tipKey: 'BALL'
        });
        p2_4.body.velocity.set(-2.8, -1.5, -1.2);
        activeTops.push(p2_4);

        const p3 = new Beyblade3DPhysics({
            name: '🟢 翡翠巨錘', x: 0, y: 1.2, z: -2.5, rpm: 9500, isRightSpin: true, color: 0x10b981, crownKey: 'HEAVY', tipKey: 'NEEDLE'
        });
        p3.body.velocity.set(1.5, -1.5, 2.8);
        activeTops.push(p3);

        const p4 = new Beyblade3DPhysics({
            name: '🟣 帝王紫刃', x: 0, y: 1.2, z: 2.5, rpm: 11500, isRightSpin: false, color: 0x8b5cf6, crownKey: 'WIZARD', tipKey: 'ACCEL'
        });
        p4.body.velocity.set(-1.5, -1.5, -2.8);
        activeTops.push(p4);

        update3DStatus('⚔️ 4 人大亂鬥進行中...', '#00d2d3');
    }

    isSimulating = true;
}

function bindUI() {
    document.getElementById('btn-vs-ai').onclick = () => runCountdownLaunch('VS_AI');
    document.getElementById('btn-2p').onclick = () => runCountdownLaunch(2);
    document.getElementById('btn-4p').onclick = () => runCountdownLaunch(4);

    document.getElementById('btn-toggle-ui').onclick = () => {
        const box = document.getElementById('ui-overlay-box');
        box.style.display = box.style.display === 'none' ? 'block' : 'none';
    };

    const dropzone = document.getElementById('ugc-dropzone');
    const fileInput = document.getElementById('ugc-file-input');

    if (dropzone && fileInput) {
        dropzone.onclick = () => fileInput.click();
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const arrayBuffer = evt.target.result;
                    const header = new TextDecoder().decode(arrayBuffer.slice(0, 80));
                    const isAscii = header.startsWith('solid');
                    const isBinary = !header.trim() && arrayBuffer.byteLength > 84;

                    if (!isAscii && !isBinary) throw new Error('無效的 STL 檔案格式');

                    document.getElementById('ugc-drop-text').innerText = '✅ 已載入: ' + file.name;
                    alert('成功載入並校驗 3D 陀螺設計檔 (.stl)！');
                } catch (err) {
                    alert('🚨 檔案校驗失敗: ' + err.message);
                }
            };
            reader.readAsArrayBuffer(file);
        };
    }
}

// 💡 提升檔次的數據渲染：主指標 + 摺疊進階選單
function renderTelemetryHTML() {
    let debugHTML = '';

    activeTops.forEach(t => {
        t.stepPhysics(0.016);
        const rpm = t.getRPM();
        const rpmPct = Math.min(100, Math.round((rpm / 12000) * 100));
        const hpPct = Math.max(0, Math.round((t.hp / t.maxHp) * 100));
        const speed = t.getLinearSpeed().toFixed(2);
        const ke = t.getKineticEnergy();
        const tilt = t.getTiltAngle();
        const Fc = t.getCentripetalForce();
        const omega = Math.abs(t.body.angularVelocity.y).toFixed(1);

        debugHTML += `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(0, 242, 254, 0.2); border-radius: 8px; padding: 8px; margin-bottom: 8px;">
                <div style="font-weight: bold; font-size: 0.8rem; color: #38bdf8; margin-bottom: 4px;">${t.name}</div>
                
                <!-- 1. RPM 條 -->
                <div style="display:flex; justify-content:space-between; font-size: 0.7rem; color: #cbd5e1; margin-bottom: 2px;">
                    <span>🌀 轉速: <b>${rpm} RPM</b></span>
                    <span>${rpmPct}%</span>
                </div>
                <div style="width: 100%; background: rgba(255,255,255,0.1); height: 5px; border-radius: 3px; overflow: hidden; margin-bottom: 6px;">
                    <div style="width: ${rpmPct}%; background: linear-gradient(90deg, #00f2fe, #4facfe); height: 100%;"></div>
                </div>

                <!-- 2. HP 條 -->
                <div style="display:flex; justify-content:space-between; font-size: 0.7rem; color: #cbd5e1; margin-bottom: 2px;">
                    <span>❤️ 爆裂血量: <b>${Math.max(0, Math.round(t.hp))} HP</b></span>
                    <span>${hpPct}%</span>
                </div>
                <div style="width: 100%; background: rgba(255,255,255,0.1); height: 5px; border-radius: 3px; overflow: hidden; margin-bottom: 6px;">
                    <div style="width: ${hpPct}%; background: linear-gradient(90deg, #ff416c, #ff4b2b); height: 100%;"></div>
                </div>

                <!-- 3. 移動速度 -->
                <div style="font-size: 0.7rem; color: #cbd5e1; margin-bottom: 6px;">
                    ⚡ 移動速度 $v$: <b>${speed} m/s</b>
                </div>

                <!-- 4. 摺疊進階物理數據 (提升檔次) -->
                <details style="margin-top: 4px; font-size: 0.68rem; color: #94a3b8; cursor: pointer;">
                    <summary style="color: #f59e0b; outline: none; padding: 2px 0;">🔬 展開進階物理向量 (Tensor / Force)</summary>
                    <div style="background: rgba(0,0,0,0.3); padding: 6px; border-radius: 4px; margin-top: 4px; line-height: 1.4;">
                        • 角速度 $\omega$: <b>${omega} rad/s</b><br>
                        • 系統總動能 $E_k$: <b>${ke} J</b><br>
                        • 向心拉力 $F_c$: <b>${Fc} N</b><br>
                        • 3D 姿態傾斜角 $\theta$: <b>${tilt}°</b>
                    </div>
                </details>
            </div>
        `;
    });

    const telemetry = document.getElementById('physics-telemetry-content');
    if (telemetry) telemetry.innerHTML = debugHTML;
}

function gameLoop(now) {
    requestAnimationFrame(gameLoop);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (isSimulating) {
        world.step(1 / 240, dt, 10);

        handle3DTopCollisions();
        update3DSparks(dt);
        check3DMatchResult();
        renderTelemetryHTML();
    }

    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('canvas-container');
    init3DEngine(container);
    bindUI();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    gameLoop(performance.now());
});
