// js/game3d.js - 爆上陀螺 3D UI 互動、3D 剛體爆發性彈开與勝負主控

import { 
    init3DEngine, 
    Beyblade3DPhysics, 
    activeTops, 
    world, 
    scene, 
    spawn3DSparks, 
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
    const p1Spin = document.getElementById('p1-spin')?.value === 'RIGHT';
    const p1Power = document.getElementById('p1-power')?.value;
    const p1Rpm = p1Power === 'HEAVY' ? 12000 : (p1Power === 'MEDIUM' ? 9500 : 7000);

    const p1 = new Beyblade3DPhysics({
        name: '🔵 ' + p1Name, x: -2.5, y: 1.2, z: 0, rpm: p1Rpm, isRightSpin: p1Spin, color: p1Color
    });
    p1.body.velocity.set(3.2, -1.5, 1.2);
    activeTops.push(p1);

    if (mode === 'VS_AI') {
        const aiNames = ['🤖 暗黑狂狼', '🤖 幻影巨龍', '🤖 聖光神盾', '🤖 暴風阿修羅'];
        const randomName = aiNames[Math.floor(Math.random() * aiNames.length)];
        const randomSpin = Math.random() > 0.5;
        const randomRpm = 8500 + Math.floor(Math.random() * 3500);

        const ai = new Beyblade3DPhysics({
            name: randomName, x: 2.5, y: 1.2, z: 0, rpm: randomRpm, isRightSpin: randomSpin, color: 0xe11d48
        });
        ai.body.velocity.set(-3.2, -1.5, -1.2);
        activeTops.push(ai);

        update3DStatus('⚔️ 對戰進行中... 兩車對撞！', '#00d2d3');

    } else if (mode === 2) {
        const p2Name = document.getElementById('p2-name')?.value || '影武赤狼';
        const p2Color = hexToNum(document.getElementById('p2-color')?.value);
        const p2Spin = document.getElementById('p2-spin')?.value === 'RIGHT';
        const p2Power = document.getElementById('p2-power')?.value;
        const p2Rpm = p2Power === 'HEAVY' ? 12000 : (p2Power === 'MEDIUM' ? 9500 : 7000);

        const p2 = new Beyblade3DPhysics({
            name: '🔴 ' + p2Name, x: 2.5, y: 1.2, z: 0, rpm: p2Rpm, isRightSpin: p2Spin, color: p2Color
        });
        p2.body.velocity.set(-3.2, -1.5, -1.2);
        activeTops.push(p2);

        update3DStatus('⚔️ 雙人對戰進行中...', '#00d2d3');

    } else if (mode === 4) {
        const p2Name4 = document.getElementById('p2-name')?.value || '影武赤狼';
        const p2_4 = new Beyblade3DPhysics({
            name: '🔴 ' + p2Name4, x: 2.5, y: 1.2, z: 0, rpm: 11000, isRightSpin: false, color: 0xe11d48
        });
        p2_4.body.velocity.set(-2.8, -1.5, -1.2);
        activeTops.push(p2_4);

        const p3 = new Beyblade3DPhysics({
            name: '🟢 翡翠巨錘', x: 0, y: 1.2, z: -2.5, rpm: 9500, isRightSpin: true, color: 0x10b981
        });
        p3.body.velocity.set(1.5, -1.5, 2.8);
        activeTops.push(p3);

        const p4 = new Beyblade3DPhysics({
            name: '🟣 帝王紫刃', x: 0, y: 1.2, z: 2.5, rpm: 11500, isRightSpin: false, color: 0x8b5cf6
        });
        p4.body.velocity.set(-1.5, -1.5, -2.8);
        activeTops.push(p4);

        update3DStatus('⚔️ 4 人大亂鬥進行中...', '#00d2d3');
    }

    isSimulating = true;
}

// 💥 3D 剛體碰撞與齒輪咬合彈開物理
function handle3DTopCollisions() {
    for (let i = 0; i < activeTops.length; i++) {
        for (let j = i + 1; j < activeTops.length; j++) {
            const topA = activeTops[i];
            const topB = activeTops[j];
            if (topA.isKnockedOut || topB.isKnockedOut || topA.isBurst || topB.isBurst) continue;

            const posA = topA.body.position;
            const posB = topB.body.position;
            
            const dx = posB.x - posA.x;
            const dz = posB.z - posA.z;
            const dist = Math.hypot(dx, dz);
            const minDist = topA.radius + topB.radius;

            // 只要接觸，100% 強制施加爆發性 3D 反衝力！
            if (dist < minDist && dist > 0) {
                const nx = dx / dist;
                const nz = dz / dist;

                // 1. 位置強制硬性推開 (避免重疊)
                const overlap = (minDist - dist) / 2 + 0.15;
                posA.x -= nx * overlap;
                posA.z -= nz * overlap;
                posB.x += nx * overlap;
                posB.z += nz * overlap;

                // 2. 根據轉速計算反衝推力 (Recoil Impulse)
                const rpmA = topA.getRPM();
                const rpmB = topB.getRPM();
                const avgRpm = (rpmA + rpmB) / 2;

                const recoilImpulse = avgRpm > 100 ? (0.15 + (avgRpm / 12000) * 0.25) : 0.08;

                // 3. 直接施加 3D 剛體衝力 (Impulse)，將雙方猛烈撞開！
                topA.body.applyImpulse(new CANNON.Vec3(-nx * recoilImpulse, 0.05, -nz * recoilImpulse), posA);
                topB.body.applyImpulse(new CANNON.Vec3(nx * recoilImpulse, 0.05, nz * recoilImpulse), posB);

                // 4. 對撞角動量與血量扣減
                topA.body.angularVelocity.y *= 0.94;
                topB.body.angularVelocity.y *= 0.94;

                topA.hp -= recoilImpulse * 35;
                topB.hp -= recoilImpulse * 35;

                if (topA.hp <= 0) topA.isBurst = true;
                if (topB.hp <= 0) topB.isBurst = true;

                // 噴發火花
                spawn3DSparks((posA.x + posB.x) / 2, 0.4, (posA.z + posB.z) / 2, 12);
            }
        }
    }
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

function gameLoop(now) {
    requestAnimationFrame(gameLoop);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (isSimulating) {
        world.step(1 / 240, dt, 10);

        // 觸發 3D 剛體碰撞與彈動
        handle3DTopCollisions();

        update3DSparks(dt);
        check3DMatchResult();

        let debugHTML = '';
        activeTops.forEach(t => {
            t.stepPhysics(dt);
            const angVelOmega = (Math.abs(t.body.angularVelocity.y)).toFixed(1);
            const linSpeed = t.body.velocity.norm().toFixed(2);
            const rpm = t.getRPM();
            
            debugHTML += `<b>${t.name}</b><br>` +
                `• 角速度 ω: ${angVelOmega} rad/s (${rpm} RPM)<br>` +
                `• 線速度 v: ${linSpeed} m/s<br>` +
                `• 爆裂血量: ${Math.max(0, Math.round(t.hp))}%<br><br>`;
        });

        const telemetry = document.getElementById('physics-telemetry-content');
        if (telemetry) telemetry.innerHTML = debugHTML;
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
