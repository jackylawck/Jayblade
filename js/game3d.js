// js/game3d.js - 爆上陀螺 3D UI 互動與對戰邏輯主控

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
let lastTime = performance.now();

function hexToNum(hexStr) {
    if (!hexStr) return 0x0284c7;
    return parseInt(hexStr.replace('#', ''), 16);
}

function launch3DBattle(mode) {
    // 清理舊陀螺
    activeTops.forEach(t => { world.remove(t.body); scene.remove(t.group); });
    activeTops.length = 0;

    // P1 讀取
    const p1Name = document.getElementById('p1-name')?.value || '火鷹飛龍';
    const p1Color = hexToNum(document.getElementById('p1-color')?.value);
    const p1Spin = document.getElementById('p1-spin')?.value === 'RIGHT';
    const p1Power = document.getElementById('p1-power')?.value;
    const p1Rpm = p1Power === 'HEAVY' ? 12000 : (p1Power === 'MEDIUM' ? 9500 : 7000);

    const p1 = new Beyblade3DPhysics({
        name: '🔵 ' + p1Name, x: -2.5, y: 0.4, z: 0, rpm: p1Rpm, isRightSpin: p1Spin, color: p1Color
    });
    p1.body.velocity.set(2.2, 0, 1.2);
    activeTops.push(p1);

    if (mode === 'VS_AI') {
        const aiNames = ['🤖 暗黑狂狼', '🤖 幻影巨龍', '🤖 聖光神盾', '🤖 暴風阿修羅'];
        const randomName = aiNames[Math.floor(Math.random() * aiNames.length)];
        const randomSpin = Math.random() > 0.5;
        const randomRpm = 8500 + Math.floor(Math.random() * 3500);

        const ai = new Beyblade3DPhysics({
            name: randomName, x: 2.5, y: 0.4, z: 0, rpm: randomRpm, isRightSpin: randomSpin, color: 0xe11d48
        });
        ai.body.velocity.set(-2.2, 0, -1.2);
        activeTops.push(ai);

        document.getElementById('match-status').innerText = '⚔️ 單人對戰 (VS AI) 中...';

    } else if (mode === 2) {
        const p2Name = document.getElementById('p2-name')?.value || '影武赤狼';
        const p2Color = hexToNum(document.getElementById('p2-color')?.value);
        const p2Spin = document.getElementById('p2-spin')?.value === 'RIGHT';
        const p2Power = document.getElementById('p2-power')?.value;
        const p2Rpm = p2Power === 'HEAVY' ? 12000 : (p2Power === 'MEDIUM' ? 9500 : 7000);

        const p2 = new Beyblade3DPhysics({
            name: '🔴 ' + p2Name, x: 2.5, y: 0.4, z: 0, rpm: p2Rpm, isRightSpin: p2Spin, color: p2Color
        });
        p2.body.velocity.set(-2.2, 0, -1.2);
        activeTops.push(p2);

        document.getElementById('match-status').innerText = '⚔️ 雙人自訂對戰中...';

    } else if (mode === 4) {
        const p2Name4 = document.getElementById('p2-name')?.value || '影武赤狼';
        const p2_4 = new Beyblade3DPhysics({
            name: '🔴 ' + p2Name4, x: 2.5, y: 0.4, z: 0, rpm: 11000, isRightSpin: false, color: 0xe11d48
        });
        p2_4.body.velocity.set(-2.2, 0, -1.2);
        activeTops.push(p2_4);

        const p3 = new Beyblade3DPhysics({
            name: '🟢 翡翠巨錘', x: 0, y: 0.4, z: -2.5, rpm: 9500, isRightSpin: true, color: 0x10b981
        });
        p3.body.velocity.set(1.0, 0, 2.0);
        activeTops.push(p3);

        const p4 = new Beyblade3DPhysics({
            name: '🟣 帝王紫刃', x: 0, y: 0.4, z: 2.5, rpm: 11500, isRightSpin: false, color: 0x8b5cf6
        });
        p4.body.velocity.set(-1.0, 0, -2.0);
        activeTops.push(p4);

        document.getElementById('match-status').innerText = '⚔️ 4 人大亂鬥中...';
    }

    isSimulating = true;

    if (window.innerWidth <= 768) {
        document.getElementById('ui-overlay-box').style.display = 'none';
    }
}

function bindUI() {
    document.getElementById('btn-vs-ai').onclick = () => launch3DBattle('VS_AI');
    document.getElementById('btn-2p').onclick = () => launch3DBattle(2);
    document.getElementById('btn-4p').onclick = () => launch3DBattle(4);

    document.getElementById('btn-toggle-ui').onclick = () => {
        const box = document.getElementById('ui-overlay-box');
        box.style.display = box.style.display === 'none' ? 'block' : 'none';
    };

    // UGC STL 上傳
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

        for (let i = 0; i < activeTops.length; i++) {
            for (let j = i + 1; j < activeTops.length; j++) {
                const posA = activeTops[i].body.position;
                const posB = activeTops[j].body.position;
                if (posA.distanceTo(posB) < 1.8 && Math.random() > 0.3) {
                    spawn3DSparks((posA.x + posB.x) / 2, (posA.y + posB.y) / 2, (posA.z + posB.z) / 2, 5);
                }
            }
        }

        update3DSparks(dt);

        let debugHTML = '';
        activeTops.forEach(t => {
            t.stepPhysics(dt);
            const angVelOmega = (Math.abs(t.body.angularVelocity.y)).toFixed(1);
            const linSpeed = t.body.velocity.norm().toFixed(2);
            const rpm = Math.round((Math.abs(t.body.angularVelocity.y) * 60) / (2 * Math.PI));
            
            debugHTML += `<b>${t.name}</b><br>` +
                `• 角速度 ω: ${angVelOmega} rad/s (${rpm} RPM)<br>` +
                `• 線速度 v: ${linSpeed} m/s<br><br>`;
        });

        document.getElementById('physics-telemetry-content').innerHTML = debugHTML;
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
