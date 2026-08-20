// js/game3d.js - 職業巔峰版：RPM階梯觸覺、時間軸碰撞標記點、致命一擊時間戳與戰術複盤

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
let isReplaying = false;
let replayPaused = false;
let replayFrameIndex = 0;
let currentLang = 'zh';
let lastTime = performance.now();

let peer = null;
let conn = null;
let isHost = true;
let peerId = '';

// 🎞️ 關鍵幀環形緩衝區與碰撞事件清單
const replayBuffer = [];
const MAX_REPLAY_FRAMES = 300;
const collisionEvents = []; // 記錄所有碰撞發生的 frameIndex 與時間戳

// 📊 賽後戰報深度遙測數據
let matchStats = {
    p1MaxImpulse: 0, p2MaxImpulse: 0,
    p1MaxSpeed: 0, p2MaxSpeed: 0,
    p1InitialRpm: 12000, p2InitialRpm: 11000,
    maxDmgTime: 0, maxDmgVal: 0, maxDmgVictim: '',
    startTime: 0
};

const I18N = {
    zh: {
        title: "🌀 JAYBLADE 3D",
        subtitle: "Beyblade X 職業選手級戰術訓練模擬器",
        langBtn: "English",
        p1Title: "🔵 P1 陀螺自訂", p2Title: "🔴 P2 陀螺自訂",
        p1NameDefault: "火鷹飛龍", p2NameDefault: "影武赤狼",
        ugcDrop: "📁 點擊或拖拽 3D 設計 (.stl) 檔測試實體慣量",
        vsAi: "🎮 單人對戰 (VS AI)", vs2p: "⚔️ 1P vs 2P 同機對戰", p2pLaunch: "🌐 3D 遠端對決 (P2P)", vs4p: "🔥 4人障礙大亂鬥",
        debugTitle: "⚙️ 實時物理數據 (240Hz 算力)", readyStatus: "請按住發射按鈕蓄力發射...", toggleUi: "👁️ 隱藏/顯示控制台",
        onlineTitle: "🌐 3D WebRTC 遠端連線", myId: "房間 ID:", joinBtn: "加入",
        placeholderRoom: "貼上 7 位數 Room ID",
        netStatusOffline: "狀態: 單機模式", netStatusConnected: "狀態: 🟢 已連線！", netStatusConnecting: "狀態: 🟡 連線中...", netStatusError: "狀態: ⚠️ 連線失敗/房間無效",
        burstFinish: (winner, loser) => `💥【BURST FINISH】\n${winner} 擊碎了 ${loser}！`,
        koFinish: (loser) => `⚠️【OVER FINISH】\n${loser} 被擊飛出場外！`,
        spinFinish: (winner) => `🏆【SPIN FINISH】\n${winner} 旋轉持久勝出！`,
        drawFinish: "⚖️【DRAW】\n雙方同時停轉，本局平手！",
        tagWinner: "🏆 WINNER", tagBurst: "💥 BURST", tagSpinOut: "💤 STOPPED"
    },
    en: {
        title: "🌀 JAYBLADE 3D",
        subtitle: "Beyblade X Pro Tactical Training Simulator",
        langBtn: "中文 (繁體)",
        p1Title: "🔵 P1 Customization", p2Title: "🔴 P2 Customization",
        p1NameDefault: "Fire Bird Dragon", p2NameDefault: "Red Wolf",
        ugcDrop: "📁 Click or drag custom 3D (.stl) design to test inertia",
        vsAi: "🎮 Single Player (VS AI)", vs2p: "⚔️ 1P vs 2P Local Battle", p2pLaunch: "🌐 3D Remote Match (P2P)", vs4p: "🔥 4-Player Battle Royale",
        debugTitle: "⚙️ Real-time Telemetry (240Hz Physics)", readyStatus: "Hold launch button to charge RPM...", toggleUi: "👁️ Toggle Panel",
        onlineTitle: "🌐 3D WebRTC Remote Lobby", myId: "Room ID:", joinBtn: "Join",
        placeholderRoom: "Paste 7-Digit Room ID",
        netStatusOffline: "Status: Offline", netStatusConnected: "Status: 🟢 Connected!", netStatusConnecting: "Status: 🟡 Connecting...", netStatusError: "Status: ⚠️ Connection Failed",
        burstFinish: (winner, loser) => `💥【BURST FINISH】\n${winner} burst ${loser}!`,
        koFinish: (loser) => `⚠️【OVER FINISH】\n${loser} was knocked out!`,
        spinFinish: (winner) => `🏆【SPIN FINISH】\n${winner} won by endurance!`,
        drawFinish: "⚖️【DRAW】\nBoth tops stopped spinning!",
        tagWinner: "🏆 WINNER", tagBurst: "💥 BURST", tagSpinOut: "💤 STOPPED"
    }
};

function hexToNum(hexStr) { return hexStr ? parseInt(hexStr.replace('#', ''), 16) : 0x0284c7; }

function update3DStatus(text, color = "#38bdf8") {
    const banner = document.getElementById('match-status');
    if (banner) { banner.innerText = text; banner.style.color = color; }
}

/**
 * 📳 階梯式觸覺震動系統
 */
function triggerHaptic(type = "light") {
    if (!navigator.vibrate) return;
    try {
        if (type === "light") navigator.vibrate(15);
        else if (type === "medium") navigator.vibrate([25, 10, 25]);
        else if (type === "heavy") navigator.vibrate([45, 15, 45]);
        else if (type === "burst") navigator.vibrate([120, 30, 80]); // 鬆手發射爆裂震感
    } catch (_) {}
}

function applyLanguageUI() {
    const t = I18N[currentLang];
    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };

    setTxt('ui-title', t.title); setTxt('ui-subtitle', t.subtitle);
    setTxt('btn-lang', t.langBtn);
    setTxt('ui-p1-panel-title', t.p1Title); setTxt('ui-p2-panel-title', t.p2Title);
    setTxt('ugc-drop-text', t.ugcDrop); setTxt('btn-vs-ai', t.vsAi);
    setTxt('btn-2p', t.vs2p); setTxt('btn-p2p-launch', t.p2pLaunch); setTxt('btn-4p', t.vs4p);
    setTxt('ui-debug-title', t.debugTitle); setTxt('btn-toggle-ui', t.toggleUi);
    setTxt('ui-online-title', t.onlineTitle);
    setTxt('ui-lbl-myid', t.myId);
    setTxt('btn-join-room', t.joinBtn);

    const joinInput = document.getElementById('join-peer-id');
    if (joinInput) joinInput.placeholder = t.placeholderRoom;

    if (!isSimulating && !isCountdownRunning) update3DStatus(t.readyStatus);
}

function initPeerJS() {
    try {
        const random7Digits = Math.floor(1000000 + Math.random() * 9000000).toString();
        peer = new Peer(random7Digits);

        peer.on('open', (id) => {
            peerId = id;
            const myIdEl = document.getElementById('my-peer-id');
            if (myIdEl) myIdEl.innerText = id;
        });

        peer.on('connection', (c) => {
            conn = c;
            isHost = true;
            setupNetworkHandlers();
            document.getElementById('net-status').innerText = I18N[currentLang].netStatusConnected;
        });

        peer.on('error', (err) => {
            console.warn("⚠️ WebRTC Peer Error:", err);
            document.getElementById('net-status').innerText = I18N[currentLang].netStatusError;
        });
    } catch (err) {
        console.error("🚨 PeerJS Initialization Error:", err);
    }
}

function setupNetworkHandlers() {
    conn.on('open', () => {
        document.getElementById('net-status').innerText = I18N[currentLang].netStatusConnected;
    });
    conn.on('close', () => {
        document.getElementById('net-status').innerText = I18N[currentLang].netStatusOffline;
    });
    conn.on('data', (data) => {
        if (data.type === 'LAUNCH') {
            run3ACountdownLaunch(data.mode, false, data.rpm);
        } else if (data.type === 'POSE_SYNC' && !isHost) {
            data.poses.forEach((p, idx) => {
                if (activeTops[idx]) {
                    const body = activeTops[idx].body;
                    const dx = p.x - body.position.x;
                    const dz = p.z - body.position.z;
                    const driftDist = Math.hypot(dx, dz);

                    if (driftDist > 0.15) {
                        body.position.x += dx * 0.35;
                        body.position.z += dz * 0.35;
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

/**
 * 🎞️ 記錄關鍵幀與碰撞標記
 */
function recordReplayKeyframe() {
    if (!isSimulating || isMatchEnded || isReplaying || activeTops.length === 0) return;

    const currentFrameIdx = replayBuffer.length;
    const timeNow = performance.now();

    // 檢查本幀是否有碰撞衝量產生
    let hasCollisionThisFrame = false;
    let maxFrameImpulse = 0;

    activeTops.forEach(t => {
        const imp = parseFloat(t.lastImpulseMag || 0);
        if (imp > 0.12) {
            hasCollisionThisFrame = true;
            maxFrameImpulse = Math.max(maxFrameImpulse, imp);
        }
    });

    if (hasCollisionThisFrame) {
        collisionEvents.push({
            frameIndex: currentFrameIdx,
            timeSec: ((timeNow - matchStats.startTime) / 1000).toFixed(1),
            impulse: maxFrameImpulse
        });
    }

    replayBuffer.push({
        time: timeNow,
        hasCollision: hasCollisionThisFrame,
        tops: activeTops.map(t => ({
            x: t.body.position.x, y: t.body.position.y, z: t.body.position.z,
            qx: t.body.quaternion.x, qy: t.body.quaternion.y, qz: t.body.quaternion.z, qw: t.body.quaternion.w,
            hp: t.hp, rpm: t.getRPM(), speed: t.getLinearSpeed(), impulse: t.lastImpulseMag
        }))
    });

    if (replayBuffer.length > MAX_REPLAY_FRAMES) {
        replayBuffer.shift();
        // 修正碰撞事件索引偏移
        collisionEvents.forEach(e => e.frameIndex = Math.max(0, e.frameIndex - 1));
    }
}

function run3ACountdownLaunch(mode, broadcast = true, customRpm = 12000) {
    if (isCountdownRunning) return;
    isCountdownRunning = true;
    isMatchEnded = false;
    isReplaying = false;
    replayBuffer.length = 0;
    collisionEvents.length = 0;

    matchStats = {
        p1MaxImpulse: 0, p2MaxImpulse: 0,
        p1MaxSpeed: 0, p2MaxSpeed: 0,
        p1InitialRpm: customRpm, p2InitialRpm: 11000,
        maxDmgTime: 0, maxDmgVal: 0, maxDmgVictim: '',
        startTime: performance.now()
    };

    if (broadcast && conn && conn.open) {
        conn.send({ type: 'LAUNCH', mode, rpm: customRpm });
    }

    activeTops.forEach(t => { world.remove(t.body); scene.remove(t.group); });
    activeTops.length = 0;

    const telemetry = document.getElementById('physics-telemetry-content');
    if (telemetry) telemetry.innerHTML = '';

    const countdownEl = document.createElement('div');
    countdownEl.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.5);
        font-size: 7rem; font-weight: 900; color: #fff;
        text-shadow: 0 0 50px rgba(0, 242, 254, 0.9), 0 0 100px rgba(56, 189, 248, 0.6);
        z-index: 1000; pointer-events: none;
        font-family: 'Orbitron', sans-serif;
        opacity: 0; transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
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

/**
 * 📊 賽後戰報（含致命一擊時間戳與跳轉）
 */
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
    banner.id = 'match-end-banner';
    banner.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        display: flex; justify-content: center; align-items: center; flex-direction: column;
        background: radial-gradient(circle, rgba(6, 9, 19, 0.82) 0%, rgba(3, 7, 18, 0.95) 100%);
        backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
        z-index: 2000; cursor: pointer; opacity: 0; transition: opacity 0.4s ease;
    `;

    const textEl = document.createElement('div');
    textEl.style.cssText = `
        font-family: 'Orbitron', sans-serif; font-size: 2.2rem; font-weight: 900;
        color: ${color}; text-shadow: 0 0 40px ${color}, 0 0 80px ${color};
        text-align: center; line-height: 1.3; transform: scale(0.6);
        transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;
    textEl.innerText = resultText;

    const statsCard = document.createElement('div');
    statsCard.style.cssText = `
        background: rgba(15, 23, 42, 0.88); border: 1px solid rgba(56, 189, 248, 0.4);
        border-radius: 12px; padding: 14px 18px; margin-top: 14px; width: 350px;
        font-family: 'Rajdhani', sans-serif; font-size: 0.88rem; color: #cbd5e1; line-height: 1.55;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6);
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
        background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff;
        border: none; padding: 10px 24px; border-radius: 20px; font-weight: bold;
        box-shadow: 0 0 20px rgba(245, 158, 11, 0.6); cursor: pointer;
    `;
    replayBtn.innerText = currentLang === 'zh' ? '🎞️ 進入 KO 戰術重播 (含時間軸標記)' : '🎞️ Enter Tactical Replay';
    replayBtn.onclick = (e) => {
        e.stopPropagation();
        banner.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(banner)) document.body.removeChild(banner);
            showReplayControlHUD();
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

/**
 * 🎛️ 職業重播控制台 (含進度條碰撞紅點標記)
 */
function showReplayControlHUD() {
    if (replayBuffer.length === 0) return;
    isReplaying = true;
    replayPaused = false;
    replayFrameIndex = 0;
    controls.enabled = true;

    const hud = document.createElement('div');
    hud.id = 'replay-hud-bar';
    hud.style.cssText = `
        position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
        background: rgba(15, 23, 42, 0.92); border: 1px solid #f59e0b;
        backdrop-filter: blur(16px); border-radius: 30px; padding: 8px 20px;
        display: flex; align-items: center; gap: 12px; z-index: 3000;
        box-shadow: 0 0 30px rgba(245, 158, 11, 0.4);
    `;

    hud.innerHTML = `
        <button id="btn-replay-play" style="background:#f59e0b; border:none; color:#030712; font-family:'Orbitron', sans-serif; font-weight:bold; border-radius:50%; width:32px; height:32px; cursor:pointer;">⏸️</button>
        <div style="position:relative; width:190px; display:flex; align-items:center;">
            <input type="range" id="replay-timeline" min="0" max="${replayBuffer.length - 1}" value="0" style="width:100%; accent-color:#f59e0b; cursor:pointer; z-index:2; position:relative; background:transparent;">
            <div id="timeline-markers" style="position:absolute; top:50%; left:0; width:100%; height:4px; transform:translateY(-50%); pointer-events:none; z-index:1;"></div>
        </div>
        <span id="replay-time-txt" style="font-family:'Orbitron', monospace; font-size:0.75rem; color:#f59e0b; width:45px;">0.0s</span>
        <button id="btn-jump-critical" style="background:rgba(239,68,68,0.2); border:1px solid #ef4444; color:#ef4444; font-family:'Orbitron', sans-serif; padding:4px 8px; border-radius:12px; font-size:0.7rem; cursor:pointer;" title="跳轉至致命一擊">⚡ 致命擊</button>
        <button id="btn-replay-exit" style="background:transparent; border:1px solid #94a3b8; color:#94a3b8; font-family:'Orbitron', sans-serif; padding:4px 10px; border-radius:12px; font-size:0.75rem; cursor:pointer;">退出</button>
    `;
    document.body.appendChild(hud);

    // 🔴 在時間軸背景渲染碰撞紅色標記點
    const markersContainer = document.getElementById('timeline-markers');
    const totalFrames = replayBuffer.length - 1 || 1;
    collisionEvents.forEach(ev => {
        const dot = document.createElement('div');
        const pct = (ev.frameIndex / totalFrames) * 100;
        dot.style.cssText = `
            position: absolute; left: ${pct}%; top: -3px; width: 6px; height: 6px;
            background: #ef4444; border-radius: 50%; box-shadow: 0 0 6px #ef4444;
        `;
        markersContainer.appendChild(dot);
    });

    const playBtn = document.getElementById('btn-replay-play');
    const timeline = document.getElementById('replay-timeline');
    const timeTxt = document.getElementById('replay-time-txt');
    const jumpBtn = document.getElementById('btn-jump-critical');
    const exitBtn = document.getElementById('btn-replay-exit');

    playBtn.onclick = () => {
        replayPaused = !replayPaused;
        playBtn.innerText = replayPaused ? '▶️' : '⏸️';
    };

    timeline.oninput = (e) => {
        replayPaused = true;
        playBtn.innerText = '▶️';
        replayFrameIndex = parseInt(e.target.value);
        applyReplayFrame(replayFrameIndex);
    };

    // ⚡ 點擊一鍵跳轉至致命一擊瞬間
    jumpBtn.onclick = () => {
        const criticalEvent = collisionEvents.reduce((prev, curr) => (curr.impulse > prev.impulse) ? curr : prev, collisionEvents[0]);
        if (criticalEvent) {
            replayPaused = true;
            playBtn.innerText = '▶️';
            replayFrameIndex = criticalEvent.frameIndex;
            timeline.value = replayFrameIndex;
            timeTxt.innerText = `${criticalEvent.timeSec}s`;
            applyReplayFrame(replayFrameIndex);
            triggerHaptic("heavy");
        }
    };

    exitBtn.onclick = () => {
        isReplaying = false;
        if (document.body.contains(hud)) document.body.removeChild(hud);
        const box = document.getElementById('ui-overlay-box');
        if (box) box.style.display = 'block';
    };

    const replayLoop = setInterval(() => {
        if (!isReplaying) { clearInterval(replayLoop); return; }

        if (!replayPaused) {
            replayFrameIndex++;
            if (replayFrameIndex >= replayBuffer.length) replayFrameIndex = 0;
            timeline.value = replayFrameIndex;
            timeTxt.innerText = `${(replayFrameIndex / 60).toFixed(1)}s`;
            applyReplayFrame(replayFrameIndex);
        }
    }, 33);
}

function applyReplayFrame(index) {
    const frame = replayBuffer[index];
    if (!frame) return;

    frame.tops.forEach((topState, idx) => {
        if (activeTops[idx]) {
            activeTops[idx].body.position.set(topState.x, topState.y, topState.z);
            activeTops[idx].body.quaternion.set(topState.qx, topState.qy, topState.qz, topState.qw);
            activeTops[idx].hp = topState.hp;
        }
    });
}

function check3DMatchResult() {
    if (isMatchEnded || !isSimulating || isCountdownRunning || isReplaying || activeTops.length < 2) return;

    const dict = I18N[currentLang];
    const aliveTops = activeTops.filter(t => !t.isKnockedOut && !t.isBurst && t.getRPM() > 30);
    const newBurstTop = activeTops.find(t => t.isBurst);
    const newKoTop = activeTops.find(t => t.isKnockedOut);

    if (aliveTops.length <= 1) {
        if (aliveTops.length === 1) {
            const winner = aliveTops[0];
            handleMatchEnd(dict.spinFinish(winner.name), "#00ff66", winner);
        } else if (newBurstTop) {
            const winner = activeTops.find(t => t !== newBurstTop && !t.isBurst && !t.isKnockedOut);
            handleMatchEnd(dict.burstFinish(winner ? winner.name : 'P1', newBurstTop.name), "#ff3838", winner);
        } else if (newKoTop) {
            const winner = activeTops.find(t => t !== newKoTop && !t.isBurst && !t.isKnockedOut);
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
        name: '🔵 ' + p1Name, x: -2.5, y: 1.2, z: 0, rpm: p1Rpm, isRightSpin: p1Spin, color: p1Color,
        crownKey: p1Crown, tipKey: p1Tip
    });
    p1.body.velocity.set(3.2, -1.5, 1.2);
    activeTops.push(p1);

    if (mode === 'VS_AI') {
        const ai = new Beyblade3DPhysics({
            name: currentLang === 'zh' ? '🤖 影武赤狼' : '🤖 Shadow Wolf',
            x: 2.5, y: 1.2, z: 0, rpm: 10500, isRightSpin: false, color: 0xe11d48,
            crownKey: 'PHOENIX', tipKey: 'BALL'
        });
        ai.body.velocity.set(-3.2, -1.5, -1.2);
        activeTops.push(ai);
    } else if (mode === 2 || mode === 'P2P') {
        const p2Name = document.getElementById('p2-name')?.value || dict.p2NameDefault;
        const p2Color = hexToNum(document.getElementById('p2-color')?.value);
        const p2Crown = document.getElementById('p2-crown')?.value || 'DRAKE';
        const p2Tip = document.getElementById('p2-tip')?.value || 'BALL';
        const p2Spin = document.getElementById('p2-spin')?.value === 'RIGHT';

        const p2 = new Beyblade3DPhysics({
            name: '🔴 ' + p2Name, x: 2.5, y: 1.2, z: 0, rpm: 11000, isRightSpin: p2Spin, color: p2Color,
            crownKey: p2Crown, tipKey: p2Tip
        });
        p2.body.velocity.set(-3.2, -1.5, -1.2);
        activeTops.push(p2);
    } else if (mode === 4) {
        const p2 = new Beyblade3DPhysics({ name: '🔴 赤紅鳳凰', x: 2.5, y: 1.2, z: 0, rpm: 11000, isRightSpin: false, color: 0xe11d48, crownKey: 'PHOENIX', tipKey: 'RUBBER' });
        p2.body.velocity.set(-2.8, -1.5, -1.2); activeTops.push(p2);

        const p3 = new Beyblade3DPhysics({ name: '🟢 翡翠巨錘', x: 0, y: 1.2, z: -2.5, rpm: 9500, isRightSpin: true, color: 0x10b981, crownKey: 'HEAVY', tipKey: 'HEXA' });
        p3.body.velocity.set(1.5, -1.5, 2.8); activeTops.push(p3);

        const p4 = new Beyblade3DPhysics({ name: '🟣 帝王紫刃', x: 0, y: 1.2, z: 2.5, rpm: 11500, isRightSpin: false, color: 0x8b5cf6, crownKey: 'VIPER', tipKey: 'ACCEL' });
        p4.body.velocity.set(-1.5, -1.5, -2.8); activeTops.push(p4);
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
        card.id = `top-card-${idx}`;
        card.style.cssText = "background: rgba(255,255,255,0.03); border: 1px solid rgba(0, 242, 254, 0.25); border-radius: 8px; padding: 8px; margin-bottom: 8px;";
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
                <div style="font-family:'Orbitron', sans-serif; font-weight: bold; font-size: 0.82rem; color: #38bdf8;">${top.name}</div>
                <div id="status-tag-${idx}" style="font-family:'Orbitron', sans-serif; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight:bold; display:none;"></div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size: 0.72rem; color: #cbd5e1; margin-bottom: 2px;">
                <span>${t.rpm || "RPM"}: <b id="rpm-val-${idx}">0 RPM</b></span>
                <span id="rpm-pct-${idx}">0%</span>
            </div>
            <div style="width: 100%; background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px; overflow: hidden; margin-bottom: 6px;">
                <div id="rpm-bar-${idx}" style="width: 0%; background: linear-gradient(90deg, #00f2fe, #4facfe); height: 100%;"></div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size: 0.72rem; color: #cbd5e1; margin-bottom: 2px;">
                <span>${t.hp || "HP"}: <b id="hp-val-${idx}">120 HP</b></span>
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

        // 記錄致命一擊數據
        const imp = parseFloat(t.lastImpulseMag || 0);
        if (imp > 0.15) {
            const dmg = imp * 45;
            if (dmg > matchStats.maxDmgVal) {
                matchStats.maxDmgVal = dmg;
                matchStats.maxDmgTime = ((performance.now() - matchStats.startTime) / 1000).toFixed(1);
                matchStats.maxDmgVictim = t.name;
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

    // 🕹️ 蓄力發射：RPM 階梯震動阻尼與鬆手彈射爆震
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
                
                // 階梯式震動阻尼匹配
                if (chargeRpm < 10000) {
                    update3DStatus(`⚡ CHARGING: ${chargeRpm.toLocaleString()} RPM`, "#38bdf8");
                    triggerHaptic("light");
                } else if (chargeRpm < 13000) {
                    update3DStatus(`⚡ HIGH POWER: ${chargeRpm.toLocaleString()} RPM`, "#f59e0b");
                    triggerHaptic("medium");
                } else {
                    update3DStatus(`🔥 MAXIMUM LIMIT: ${chargeRpm.toLocaleString()} RPM`, "#ef4444");
                    triggerHaptic("heavy");
                }
            }, 90);
        };

        const releaseCharge = () => {
            if (chargeTimer) {
                clearInterval(chargeTimer);
                chargeTimer = null;
                triggerHaptic("burst"); // 鬆手彈射爆發震感
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
            recordReplayKeyframe();

            if (isHost) broadcast3DPoses();
        }
        updateTelemetryValues();
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
