// js/game3d.js - 精簡主控：整合 i18n, replay 與 240Hz 遊戲主循環

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

import { I18N } from './i18n.js';
import { 
    isReplaying, 
    recordKeyframe, 
    resetReplayBuffer, 
    showReplayControlHUD 
} from './replay.js';

let isSimulating = false;
let isMatchEnded = false;
let isCountdownRunning = false;
let currentLang = 'zh';
let lastTime = performance.now();

let peer = null;
let conn = null;
let isHost = true;

let matchStats = {
    p1MaxImpulse: 0, p2MaxImpulse: 0,
    p1MaxSpeed: 0, p2MaxSpeed: 0,
    maxDmgTime: 0, maxDmgVal: 0,
    startTime: 0
};

function hexToNum(hexStr) { return hexStr ? parseInt(hexStr.replace('#', ''), 16) : 0x0284c7; }

function update3DStatus(text, color = "#38bdf8") {
    const banner = document.getElementById('match-status');
    if (banner) { banner.innerText = text; banner.style.color = color; }
}

function triggerHaptic(type = "light") {
    if (!navigator.vibrate) return;
    try {
        if (type === "light") navigator.vibrate(15);
        else if (type === "medium") navigator.vibrate([25, 10, 25]);
        else if (type === "heavy") navigator.vibrate([45, 15, 45]);
        else if (type === "burst") navigator.vibrate([120, 30, 80]);
    } catch (_) {}
}

function applyLanguageUI() {
    const t = I18N[currentLang];
    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };

    setTxt('ui-title', t.title); setTxt('ui-subtitle', t.subtitle);
    setTxt('btn-lang', t.langBtn); setTxt('btn-back-2d', t.back2d);
    setTxt('ui-p1-panel-title', t.p1Title); setTxt('ui-p2-panel-title', t.p2Title);
    setTxt('ugc-drop-text', t.ugcDrop); setTxt('btn-vs-ai', t.vsAi);
    setTxt('btn-2p', t.vs2p); setTxt('btn-p2p-launch', t.p2pLaunch); setTxt('btn-4p', t.vs4p);
    setTxt('ui-debug-title', t.debugTitle); setTxt('btn-toggle-ui', t.toggleUi);
    setTxt('ui-online-title', t.onlineTitle); setTxt('ui-lbl-myid', t.myId); setTxt('btn-join-room', t.joinBtn);

    const updateClassTxt = (cls, txt) => { document.querySelectorAll('.' + cls).forEach(el => el.innerText = txt); };
    updateClassTxt('lbl-name', t.lblNames); updateClassTxt('lbl-color', t.lblColors);
    updateClassTxt('lbl-crown', t.lblCrowns); updateClassTxt('lbl-tip', t.lblTips);
    updateClassTxt('lbl-spin', t.lblSpins); updateClassTxt('lbl-power', t.lblPowers);

    const updateSelect = (selectId, dict) => {
        const sel = document.getElementById(selectId);
        if (!sel) return;
        Array.from(sel.options).forEach(opt => { if (dict[opt.value]) opt.text = dict[opt.value]; });
    };

    updateSelect('p1-crown', t.crowns); updateSelect('p2-crown', t.crowns);
    updateSelect('p1-tip', t.tips); updateSelect('p2-tip', t.tips);
    updateSelect('p1-spin', t.spins); updateSelect('p2-spin', t.spins);
    updateSelect('p1-power', t.powers); updateSelect('p2-power', t.powers);

    const joinInput = document.getElementById('join-peer-id');
    if (joinInput) joinInput.placeholder = t.placeholderRoom;

    if (!isSimulating && !isCountdownRunning) update3DStatus(t.readyStatus);
}

function initPeerJS() {
    try {
        const random7Digits = Math.floor(1000000 + Math.random() * 9000000).toString();
        peer = new Peer(random7Digits);

        peer.on('open', (id) => {
            const myIdEl = document.getElementById('my-peer-id');
            if (myIdEl) myIdEl.innerText = id;
        });

        peer.on('connection', (c) => {
            conn = c;
            isHost = true;
            setupNetworkHandlers();
            document.getElementById('net-status').innerText = I18N[currentLang].netStatusConnected;
        });
    } catch (err) {
        console.error("🚨 PeerJS Init Error:", err);
    }
}

function setupNetworkHandlers() {
    conn.on('open', () => { document.getElementById('net-status').innerText = I18N[currentLang].netStatusConnected; });
    conn.on('close', () => { document.getElementById('net-status').innerText = I18N[currentLang].netStatusOffline; });
    conn.on('data', (data) => {
        if (data.type === 'LAUNCH') {
            run3ACountdownLaunch(data.mode, false, data.rpm);
        } else if (data.type === 'POSE_SYNC' && !isHost) {
            data.poses.forEach((p, idx) => {
                if (activeTops[idx]) {
                    const body = activeTops[idx].body;
                    if (Math.hypot(p.x - body.position.x, p.z - body.position.z) > 0.15) {
                        body.position.x += (p.x - body.position.x) * 0.35;
                        body.position.z += (p.z - body.position.z) * 0.35;
                        body.position.y += (p.y - body.position.y) * 0.35;
                    }
                    body.quaternion.slerp(new CANNON.Quaternion(p.qx, p.qy, p.qz, p.qw), 0.35, body.quaternion);
                    activeTops[idx].hp = p.hp;
                }
            });
        }
    });
}

function broadcast3DPoses() {
    if (conn && conn.open && isHost) {
        const poses = activeTops.map(t => ({
            x: t.body.position.x, y: t.body.position.y, z: t.body.position.z,
            qx: t.body.quaternion.x, qy: t.body.quaternion.y, qz: t.body.quaternion.z, qw: t.body.quaternion.w,
            hp: t.hp
        }));
        conn.send({ type: 'POSE_SYNC', poses });
    }
}

function run3ACountdownLaunch(mode, broadcast = true, customRpm = 12000) {
    if (isCountdownRunning) return;
    isCountdownRunning = true;
    isMatchEnded = false;
    resetReplayBuffer();

    matchStats = {
        p1MaxImpulse: 0, p2MaxImpulse: 0,
        p1MaxSpeed: 0, p2MaxSpeed: 0,
        maxDmgTime: 0, maxDmgVal: 0,
        startTime: performance.now()
    };

    if (broadcast && conn && conn.open) {
        conn.send({ type: 'LAUNCH', mode, rpm: customRpm });
    }

    activeTops.forEach(t => { world.remove(t.body); scene.remove(t.group); });
    activeTops.length = 0;

    const countdownEl = document.createElement('div');
    countdownEl.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.5);
        font-size: 7rem; font-weight: 900; color: #fff;
        text-shadow: 0 0 50px rgba(0, 242, 254, 0.9); z-index: 1000; pointer-events: none;
        font-family: 'Orbitron', sans-serif; opacity: 0; transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;
    document.body.appendChild(countdownEl);

    const sequence = ["3", "2", "1", "🔥 GO!"];
    let step = 0;

    const showStep = () => {
        countdownEl.innerText = sequence[step];
        countdownEl.style.opacity = '1';
        countdownEl.style.transform = 'translate(-50%, -50%) scale(1.3)';
        countdownEl.style.color = (step === 3) ? '#ff3838' : '#00f2fe';
        triggerHaptic(step === 3 ? "burst" : "light");

        setTimeout(() => {
            countdownEl.style.transform = 'translate(-50%, -50%) scale(0.8)';
            countdownEl.style.opacity = '0';
        }, 320);

        step++;
        if (step < sequence.length) {
            setTimeout(showStep, 600);
        } else {
            setTimeout(() => {
                if (document.body.contains(countdownEl)) document.body.removeChild(countdownEl);
                isCountdownRunning = false;
                if (window.innerWidth <= 768) {
                    const box = document.getElementById('ui-overlay-box');
                    if (box) box.style.display = 'none';
                }
                spawnTopsAndStart(mode, customRpm);
            }, 500);
        }
    };

    showStep();
}

function handleMatchEnd(resultText, color, winnerTop) {
    if (isMatchEnded) return;
    isMatchEnded = true;
    update3DStatus(resultText.replace('\n', ' '), color);
    triggerHaptic("burst");

    const matchDurationSec = ((performance.now() - matchStats.startTime) / 1000).toFixed(1);

    activeTops.forEach(t => {
        t.body.velocity.set(0, 0, 0);
        t.body.angularVelocity.set(0, 0, 0);
        t.isWinner = (t === winnerTop);
    });

    const banner = document.createElement('div');
    banner.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        display: flex; justify-content: center; align-items: center; flex-direction: column;
        background: radial-gradient(circle, rgba(6, 9, 19, 0.82) 0%, rgba(3, 7, 18, 0.95) 100%);
        backdrop-filter: blur(12px); z-index: 2000; cursor: pointer; opacity: 0; transition: opacity 0.4s ease;
    `;

    const textEl = document.createElement('div');
    textEl.style.cssText = `
        font-family: 'Orbitron', sans-serif; font-size: 2.2rem; font-weight: 900; color: ${color};
        text-shadow: 0 0 40px ${color}; text-align: center; line-height: 1.3; transform: scale(0.6);
        transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;
    textEl.innerText = resultText;

    const statsCard = document.createElement('div');
    statsCard.style.cssText = `
        background: rgba(15, 23, 42, 0.88); border: 1px solid rgba(56, 189, 248, 0.4);
        border-radius: 12px; padding: 14px 18px; margin-top: 14px; width: 350px;
        font-family: 'Rajdhani', sans-serif; font-size: 0.88rem; color: #cbd5e1; line-height: 1.55;
    `;
    statsCard.innerHTML = `
        <div style="font-family:'Orbitron', sans-serif; font-weight:bold; color:#fbbf24; margin-bottom:4px; font-size:0.9rem;">
            📊 選手賽後遙測戰報 (Match Telemetry)
        </div>
        • 對決歷時: <b style="color:#38bdf8;">${matchDurationSec}s</b><br>
        • 🔵 P1 極速: <b>${matchStats.p1MaxSpeed.toFixed(2)} m/s</b> | 最大衝量: <b>${matchStats.p1MaxImpulse} N·s</b><br>
        • 🔴 P2 極速: <b>${matchStats.p2MaxSpeed.toFixed(2)} m/s</b> | 最大衝量: <b>${matchStats.p2MaxImpulse} N·s</b><br>
        • ⚡ 致命一擊時間點: <b style="color:#ef4444;">T+${matchStats.maxDmgTime}s</b> (扣減 ${(matchStats.maxDmgVal).toFixed(1)} HP)
    `;

    const replayBtn = document.createElement('button');
    replayBtn.style.cssText = `
        margin-top: 14px; font-family: 'Orbitron', sans-serif; font-size: 0.88rem;
        background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; border: none;
        padding: 10px 24px; border-radius: 20px; font-weight: bold; cursor: pointer;
    `;
    replayBtn.innerText = currentLang === 'zh' ? '🎞️ 進入 KO 戰術重播 (含時間軸標記)' : '🎞️ Enter Tactical Replay';
    replayBtn.onclick = (e) => {
        e.stopPropagation();
        banner.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(banner)) document.body.removeChild(banner);
            showReplayControlHUD(activeTops, controls, triggerHaptic);
        }, 300);
    };

    banner.appendChild(textEl);
    banner.appendChild(statsCard);
    banner.appendChild(replayBtn);
    document.body.appendChild(banner);

    requestAnimationFrame(() => {
        banner.style.opacity = '1';
        textEl.style.transform = 'scale(1.0)';
    });

    banner.onclick = () => {
        banner.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(banner)) document.body.removeChild(banner);
            const box = document.getElementById('ui-overlay-box');
            if (box) box.style.display = 'block';
        }, 300);
    };
}

function check3DMatchResult() {
    const elapsedSinceStart = (performance.now() - matchStats.startTime) / 1000;
    if (elapsedSinceStart < 1.5) return;

    if (isMatchEnded || !isSimulating || isCountdownRunning || isReplaying || activeTops.length < 2) return;

    const dict = I18N[currentLang];
    const aliveTops = activeTops.filter(t => !t.isKnockedOut && !t.isBurst && t.getRPM() > 15);
    const newBurstTop = activeTops.find(t => t.isBurst);
    const newKoTop = activeTops.find(t => t.isKnockedOut);

    if (aliveTops.length <= 1) {
        if (aliveTops.length === 1) {
            const winner = aliveTops[0];
            handleMatchEnd(dict.spinFinish(winner.name), "#00ff66", winner);
        } else if (newBurstTop) {
            const winner = activeTops.find(t => t !== newBurstTop) || activeTops[0];
            handleMatchEnd(dict.burstFinish(winner.name, newBurstTop.name), "#ff3838", winner);
        } else if (newKoTop) {
            const winner = activeTops.find(t => t !== newKoTop) || activeTops[0];
            handleMatchEnd(dict.koFinish(newKoTop.name), "#ff9f43", winner);
        } else {
            handleMatchEnd(dict.drawFinish, "#94a3b8", null);
        }
    }
}

function spawnTopsAndStart(mode, p1Rpm = 12000) {
    const dict = I18N[currentLang];
    const p1Name = document.getElementById('p1-name')?.value || dict.p1NameDefault;
    const p1Color = hexToNum(document.getElementById('p1-color')?.value);
    const p1Crown = document.getElementById('p1-crown')?.value || 'FEATHER';
    const p1Tip = document.getElementById('p1-tip')?.value || 'FLAT';
    const p1Spin = document.getElementById('p1-spin')?.value === 'RIGHT';

    const p1 = new Beyblade3DPhysics({
        name: '🔵 ' + p1Name, x: -3.2, y: 1.8, z: 0, rpm: p1Rpm, isRightSpin: p1Spin, color: p1Color,
        crownKey: p1Crown, tipKey: p1Tip
    });
    p1.body.velocity.set(2.8, -3.5, 1.2);
    activeTops.push(p1);

    if (mode === 'VS_AI') {
        const ai = new Beyblade3DPhysics({
            name: currentLang === 'zh' ? '🤖 影武赤狼' : '🤖 Shadow Wolf',
            x: 3.2, y: 1.8, z: 0, rpm: 10800, isRightSpin: false, color: 0xe11d48,
            crownKey: 'PHOENIX', tipKey: 'BALL'
        });
        ai.body.velocity.set(-2.8, -3.5, -1.2);
        activeTops.push(ai);
    } else if (mode === 2 || mode === 'P2P') {
        const p2Name = document.getElementById('p2-name')?.value || dict.p2NameDefault;
        const p2Color = hexToNum(document.getElementById('p2-color')?.value);
        const p2Crown = document.getElementById('p2-crown')?.value || 'DRAKE';
        const p2Tip = document.getElementById('p2-tip')?.value || 'BALL';
        const p2Spin = document.getElementById('p2-spin')?.value === 'RIGHT';

        const p2 = new Beyblade3DPhysics({
            name: '🔴 ' + p2Name, x: 3.2, y: 1.8, z: 0, rpm: 11200, isRightSpin: p2Spin, color: p2Color,
            crownKey: p2Crown, tipKey: p2Tip
        });
        p2.body.velocity.set(-2.8, -3.5, -1.2);
        activeTops.push(p2);
    } else if (mode === 4) {
        const p2 = new Beyblade3DPhysics({ name: '🔴 赤紅鳳凰', x: 3.2, y: 1.8, z: 0, rpm: 11000, isRightSpin: false, color: 0xe11d48, crownKey: 'PHOENIX', tipKey: 'RUBBER' });
        p2.body.velocity.set(-2.5, -3.5, -1.0); activeTops.push(p2);

        const p3 = new Beyblade3DPhysics({ name: '🟢 翡翠巨錘', x: 0, y: 1.8, z: -3.2, rpm: 9800, isRightSpin: true, color: 0x10b981, crownKey: 'HEAVY', tipKey: 'HEXA' });
        p3.body.velocity.set(1.0, -3.5, 2.5); activeTops.push(p3);

        const p4 = new Beyblade3DPhysics({ name: '🟣 帝王紫刃', x: 0, y: 1.8, z: 3.2, rpm: 11500, isRightSpin: false, color: 0x8b5cf6, crownKey: 'VIPER', tipKey: 'ACCEL' });
        p4.body.velocity.set(-1.0, -3.5, -2.5); activeTops.push(p4);
    }

    isSimulating = true;
    buildTelemetryDOM();
}

function buildTelemetryDOM() {
    const telemetry = document.getElementById('physics-telemetry-content');
    if (!telemetry) return;
    const t = I18N[currentLang];
    telemetry.innerHTML = '';

    activeTops.forEach((top, idx) => {
        const card = document.createElement('div');
        card.style.cssText = "background: rgba(255,255,255,0.03); border: 1px solid rgba(0, 242, 254, 0.25); border-radius: 8px; padding: 8px; margin-bottom: 8px;";
        card.innerHTML = `
            <div style="font-family:'Orbitron', sans-serif; font-weight: bold; font-size: 0.82rem; color: #38bdf8; margin-bottom: 4px;">${top.name}</div>
            <div style="display:flex; justify-content:space-between; font-size: 0.72rem; color: #cbd5e1; margin-bottom: 2px;">
                <span>${t.rpm}: <b id="rpm-val-${idx}">0 RPM</b></span>
                <span id="rpm-pct-${idx}">0%</span>
            </div>
            <div style="width: 100%; background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px; overflow: hidden; margin-bottom: 6px;">
                <div id="rpm-bar-${idx}" style="width: 0%; background: linear-gradient(90deg, #00f2fe, #4facfe); height: 100%;"></div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size: 0.72rem; color: #cbd5e1; margin-bottom: 2px;">
                <span>${t.hp}: <b id="hp-val-${idx}">160 HP</b></span>
                <span id="hp-pct-${idx}">100%</span>
            </div>
            <div style="width: 100%; background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px; overflow: hidden;">
                <div id="hp-bar-${idx}" style="width: 100%; background: linear-gradient(90deg, #10b981, #34d399); height: 100%;"></div>
            </div>
        `;
        telemetry.appendChild(card);
    });
}

function updateTelemetryValues() {
    activeTops.forEach((t, idx) => {
        if (!isMatchEnded && !isReplaying) {
            t.stepPhysics(0.016);
        }

        const rpm = isMatchEnded ? 0 : t.getRPM();
        const rpmPct = isMatchEnded ? 0 : Math.min(100, Math.round((rpm / 14000) * 100));
        const hpPct = Math.max(0, Math.round((t.hp / t.maxHp) * 100));
        const speed = t.getLinearSpeed();

        const imp = parseFloat(t.lastImpulseMag || 0);
        if (imp > 0.035) {
            const dmg = imp * 300;
            if (dmg > matchStats.maxDmgVal) {
                matchStats.maxDmgVal = dmg;
                matchStats.maxDmgTime = ((performance.now() - matchStats.startTime) / 1000).toFixed(1);
            }
        }

        if (idx === 0) {
            matchStats.p1MaxSpeed = Math.max(matchStats.p1MaxSpeed, speed);
            if (t.lastImpulseMag) matchStats.p1MaxImpulse = Math.max(matchStats.p1MaxImpulse, imp);
        } else if (idx === 1) {
            matchStats.p2MaxSpeed = Math.max(matchStats.p2MaxSpeed, speed);
            if (t.lastImpulseMag) matchStats.p2MaxImpulse = Math.max(matchStats.p2MaxImpulse, imp);
        }

        const rpmValEl = document.getElementById(`rpm-val-${idx}`);
        if (rpmValEl) rpmValEl.innerText = `${rpm} RPM`;
        const rpmPctEl = document.getElementById(`rpm-pct-${idx}`);
        if (rpmPctEl) rpmPctEl.innerText = `${rpmPct}%`;
        const rpmBar = document.getElementById(`rpm-bar-${idx}`);
        if (rpmBar) rpmBar.style.width = `${rpmPct}%`;

        const hpValEl = document.getElementById(`hp-val-${idx}`);
        if (hpValEl) hpValEl.innerText = `${Math.max(0, Math.round(t.hp))} HP`;
        const hpPctEl = document.getElementById(`hp-pct-${idx}`);
        if (hpPctEl) hpPctEl.innerText = `${hpPct}%`;
        const hpBar = document.getElementById(`hp-bar-${idx}`);
        if (hpBar) hpBar.style.width = `${hpPct}%`;
    });
}

function bindUI() {
    let chargeTimer = null;
    let chargeStart = 0;

    const bindChargeButton = (btnId, mode) => {
        const btn = document.getElementById(btnId);
        if (!btn) return;

        const startCharge = () => {
            chargeStart = performance.now();
            update3DStatus("⚡ CHARGING RPM: 7,000...", "#fbbf24");
            triggerHaptic("light");

            chargeTimer = setInterval(() => {
                const elapsed = (performance.now() - chargeStart) / 1000;
                const chargeRpm = Math.min(14000, Math.round(7000 + elapsed * 4500));
                update3DStatus(chargeRpm < 13000 ? `⚡ HIGH POWER: ${chargeRpm.toLocaleString()} RPM` : `🔥 MAXIMUM LIMIT: ${chargeRpm.toLocaleString()} RPM`, "#f59e0b");
                triggerHaptic(chargeRpm < 13000 ? "medium" : "heavy");
            }, 90);
        };

        const releaseCharge = () => {
            if (chargeTimer) {
                clearInterval(chargeTimer);
                chargeTimer = null;
                triggerHaptic("burst");
                const elapsed = (performance.now() - chargeStart) / 1000;
                const finalRpm = Math.min(14000, Math.round(7000 + elapsed * 4500));
                run3ACountdownLaunch(mode, true, finalRpm);
            }
        };

        btn.onmousedown = startCharge;
        btn.onmouseup = releaseCharge;
        btn.ontouchstart = startCharge;
        btn.ontouchend = releaseCharge;
    };

    bindChargeButton('btn-vs-ai', 'VS_AI');
    bindChargeButton('btn-2p', 2);
    bindChargeButton('btn-p2p-launch', 'P2P');
    bindChargeButton('btn-4p', 4);

    document.getElementById('btn-join-room').onclick = () => {
        const joinId = document.getElementById('join-peer-id')?.value?.trim();
        if (joinId) {
            document.getElementById('net-status').innerText = I18N[currentLang].netStatusConnecting;
            conn = peer.connect(joinId);
            isHost = false;
            setupNetworkHandlers();
        }
    };

    document.getElementById('btn-lang').onclick = () => {
        currentLang = currentLang === 'zh' ? 'en' : 'zh';
        applyLanguageUI();
    };

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
                    if (!header.startsWith('solid') && arrayBuffer.byteLength <= 84) throw new Error('無效的 STL 檔案格式');
                    document.getElementById('ugc-drop-text').innerText = '✅ ' + (currentLang === 'zh' ? '已載入: ' : 'Loaded: ') + file.name;
                    alert(currentLang === 'zh' ? '成功載入並校驗 3D 陀螺設計檔 (.stl)！' : 'Successfully loaded 3D design (.stl)!');
                } catch (err) {
                    alert('🚨 ' + err.message);
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
        if (!isMatchEnded && !isReplaying) {
            world.step(1 / 240, dt, 10);
            handle3DTopCollisions();
            update3DSparks(dt);
            check3DMatchResult();
            recordKeyframe(activeTops, matchStats.startTime);

            if (isHost) broadcast3DPoses();
        }
        updateTelemetryValues();

        // 確保 3D 模型實時同步剛體位置
        activeTops.forEach(t => {
            t.group.position.copy(t.body.position);
            t.group.quaternion.copy(t.body.quaternion);
        });
    }

    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('canvas-container');
    init3DEngine(container);
    bindUI();
    initPeerJS();
    applyLanguageUI();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    gameLoop(performance.now());
});
