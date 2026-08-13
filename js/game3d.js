// js/game3d.js - 爆上陀螺 3D UI 互動、WebRTC P2P 遠端連線與科研物理面板主控

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
let currentLang = 'zh'; // 'zh' | 'en'
let lastTime = performance.now();

// 🌐 網絡 PeerJS 狀態
let peer = null;
let conn = null;
let isHost = true;
let peerId = '';

// 🌐 100% 全中/全英無死角字典 (Full I18N Dictionary)
const I18N = {
    zh: {
        title: "🌀 爆上陀螺 Jayblade 3D",
        subtitle: "Beyblade X 高清 3D 剛體對戰模擬器",
        back2d: "⚡ 切換至 2D 經典/省電版 (2D Classic) →",
        langBtn: "English",
        p1Title: "🔵 P1 陀螺自訂",
        p2Title: "🔴 P2 陀螺自訂 (對戰用)",
        p1NameDefault: "火鷹飛龍",
        p2NameDefault: "影武赤狼",
        lblNames: "名稱:",
        lblColors: "顏色:",
        lblCrowns: "撞擊環:",
        lblTips: "動力底軸:",
        lblSpins: "旋轉方向:",
        lblPowers: "發射力度:",
        ugcDrop: "📁 點擊或拖拽自訂 3D 設計 (.stl) 檔測試實體慣量",
        vsAi: "🎮 單人對戰 (VS AI)",
        vs2p: "⚔️ 1P vs 2P 同機對戰",
        p2pLaunch: "🌐 3D 遠端對決 (WebRTC P2P)",
        vs4p: "🔥 4人障礙大亂鬥",
        debugTitle: "⚙️ 實時物理數據 (240Hz 算力)",
        readyStatus: "請選擇對戰模式發射...",
        toggleUi: "👁️ 隱藏/顯示選單",
        onlineTitle: "🌐 3D WebRTC 遠端連線大廳",
        myId: "我的房間 ID:",
        joinBtn: "加入房間",
        netStatusOffline: "狀態: 單機模式",
        netStatusConnected: "狀態: 🟢 已連線！",
        netStatusConnecting: "狀態: 🟡 連線中...",
        crowns: { FEATHER: "羽翼飛刃 (Feather Blade)", DRAKE: "龍紋重環 (Drake Crown)", HEAVY: "裝甲重錘 (Heavy Armor)", WIZARD: "魔導圓盾 (Wizard Ring)" },
        tips: { FLAT: "極速平頭 (Flat Speed)", BALL: "持久球軸 (Ball Bearing)", NEEDLE: "防禦針軸 (Needle Guard)", ACCEL: "軌道衝刺 (Accel Dash)" },
        spins: { RIGHT: "右迴旋 (順時針)", LEFT: "左迴旋 (逆時針)" },
        powers: { HEAVY: "重度 (高轉速)", MEDIUM: "中度 (穩定)", LIGHT: "輕度 (高精準)" },
        rpm: "🌀 轉速", hp: "❤️ 爆裂血量", speed: "⚡ 線速度 v",
        tensorTitle: "🔬 展開科研級 3D 物理張量 (Rigid-body Physics)",
        sec1: "1. 剛體角動量與轉矩", sec2: "2. 能量解析系統", sec3: "3. 陀螺儀姿態與進動", sec4: "4. 接觸面與外力場",
        omega: "角速度 ω", Lvec: "角動量向量 L", impulseJ: "上次對撞衝量 J",
        totalEk: "系統總動能 E_k", rotE: "轉動動能 E_rot", transE: "平動動能 E_trans",
        tilt: "3D 姿態傾斜角 θ", precFreq: "進動頻率 f_precession",
        Fn: "法向支持力 N", Ff: "切向滑動摩擦力 F_f", Fc: "盤面向心拉力 F_c",
        vsAiProgress: "⚔️ 對戰進行中... 兩車對撞！", vs2pProgress: "⚔️ 雙人對戰進行中...", vs4pProgress: "⚔️ 4 人大亂鬥進行中...",
        burstFinish: (winner, loser) => `💥【爆裂 Finish】${winner} 擊碎了 ${loser}！`,
        koFinish: (loser) => `⚠️【擊飛 Finish】${loser} 被鏟飛出場外！`,
        spinFinish: (winner) => `🏆【Spin Finish】${winner} 旋轉持久勝出！`,
        drawFinish: "⚖️【雙方停轉】本局平手 (Draw)！",
        tagWinner: "🏆 勝出 (Winner)", tagBurst: "💥 爆裂 (Burst)", tagSpinOut: "💤 停轉 (Stopped)"
    },
    en: {
        title: "🌀 Jayblade 3D Simulator",
        subtitle: "Beyblade X HD 3D Rigid-Body Physics Simulator",
        back2d: "⚡ Switch to 2D Classic Version →",
        langBtn: "中文 (繁體)",
        p1Title: "🔵 P1 Top Customization", p2Title: "🔴 P2 Top Customization",
        p1NameDefault: "Fire Bird Dragon", p2NameDefault: "Red Wolf",
        lblNames: "Name:", lblColors: "Color:", lblCrowns: "Blade Ring:", lblTips: "Bit Tip:", lblSpins: "Spin Direction:", lblPowers: "Launch Power:",
        ugcDrop: "📁 Click or drag custom 3D (.stl) design to test inertia",
        vsAi: "🎮 Single Player (VS AI)", vs2p: "⚔️ 1P vs 2P Local Battle", p2pLaunch: "🌐 3D Remote Match (WebRTC P2P)", vs4p: "🔥 4-Player Battle Royale",
        debugTitle: "⚙️ Real-time Telemetry (240Hz Physics)", readyStatus: "Select a battle mode to launch...", toggleUi: "👁️ Toggle UI Panel",
        onlineTitle: "🌐 3D WebRTC Remote Lobby", myId: "My Room ID:", joinBtn: "Join Room",
        netStatusOffline: "Status: Offline", netStatusConnected: "Status: 🟢 Connected!", netStatusConnecting: "Status: 🟡 Connecting...",
        crowns: { FEATHER: "Feather Blade", DRAKE: "Drake Crown", HEAVY: "Heavy Armor", WIZARD: "Wizard Ring" },
        tips: { FLAT: "Flat Speed", BALL: "Ball Bearing", NEEDLE: "Needle Guard", ACCEL: "Accel Dash" },
        spins: { RIGHT: "Right Spin (CW)", LEFT: "Left Spin (CCW)" },
        powers: { HEAVY: "Heavy (Max RPM)", MEDIUM: "Balanced", LIGHT: "Precision" },
        rpm: "🌀 Spin Rate", hp: "❤️ Burst Health", speed: "⚡ Linear Speed v",
        tensorTitle: "🔬 Expand 3D Rigid-Body Physics Tensors",
        sec1: "1. Angular Dynamics & Torque", sec2: "2. Energy Breakdown System", sec3: "3. Gyroscopic State & Precession", sec4: "4. Surface & Force Field",
        omega: "Angular Velocity ω", Lvec: "Angular Momentum L", impulseJ: "Impact Impulse J",
        totalEk: "Total Kinetic Energy E_k", rotE: "Rotational Energy E_rot", transE: "Translational Energy E_trans",
        tilt: "3D Tilt Angle θ", precFreq: "Precession Freq f",
        Fn: "Normal Force N", Ff: "Friction Force F_f", Fc: "Centripetal Pull F_c",
        vsAiProgress: "⚔️ Battle in progress... Clash!", vs2pProgress: "⚔️ 2P Battle in progress...", vs4pProgress: "⚔️ 4-Player Royal Rumble...",
        burstFinish: (winner, loser) => `💥【Burst Finish】${winner} burst ${loser}!`,
        koFinish: (loser) => `⚠️【Over Finish】${loser} was knocked out!`,
        spinFinish: (winner) => `🏆【Spin Finish】${winner} won by endurance!`,
        drawFinish: "⚖️【Draw】Both tops stopped spinning!",
        tagWinner: "🏆 Winner", tagBurst: "💥 Burst Out", tagSpinOut: "💤 Stopped"
    }
};

function hexToNum(hexStr) { return hexStr ? parseInt(hexStr.replace('#', ''), 16) : 0x0284c7; }

function update3DStatus(text, color = "#38bdf8") {
    const banner = document.getElementById('match-status');
    if (banner) { banner.innerText = text; banner.style.color = color; }
}

function applyLanguageUI() {
    const t = I18N[currentLang];
    const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };

    setTxt('ui-title', t.title); setTxt('ui-subtitle', t.subtitle);
    setTxt('btn-back-2d', t.back2d); setTxt('btn-lang', t.langBtn);
    setTxt('ui-p1-panel-title', t.p1Title); setTxt('ui-p2-panel-title', t.p2Title);
    setTxt('ugc-drop-text', t.ugcDrop); setTxt('btn-vs-ai', t.vsAi);
    setTxt('btn-2p', t.vs2p); setTxt('btn-p2p-launch', t.p2pLaunch); setTxt('btn-4p', t.vs4p);
    setTxt('ui-debug-title', t.debugTitle); setTxt('btn-toggle-ui', t.toggleUi);

    setTxt('ui-online-title', t.onlineTitle);
    setTxt('ui-lbl-myid', t.myId);
    setTxt('btn-join-room', t.joinBtn);

    const labels = document.querySelectorAll('.form-row label');
    labels.forEach(lbl => {
        const text = lbl.innerText.trim();
        if (text.includes('名稱') || text.includes('Name')) lbl.innerText = t.lblNames;
        else if (text.includes('顏色') || text.includes('Color')) lbl.innerText = t.lblColors;
        else if (text.includes('撞擊環') || text.includes('Blade Ring')) lbl.innerText = t.lblCrowns;
        else if (text.includes('動力底軸') || text.includes('Bit Tip')) lbl.innerText = t.lblTips;
        else if (text.includes('旋轉方向') || text.includes('Spin Direction')) lbl.innerText = t.lblSpins;
        else if (text.includes('發射力度') || text.includes('Launch Power')) lbl.innerText = t.lblPowers;
    });

    const p1Input = document.getElementById('p1-name');
    if (p1Input && (p1Input.value === '火鷹飛龍' || p1Input.value === 'Feather Dragon' || p1Input.value === 'Fire Bird Dragon')) {
        p1Input.value = t.p1NameDefault;
    }
    const p2Input = document.getElementById('p2-name');
    if (p2Input && (p2Input.value === '影武赤狼' || p2Input.value === 'Red Wolf')) {
        p2Input.value = t.p2NameDefault;
    }

    if (!isSimulating && !isCountdownRunning) update3DStatus(t.readyStatus);

    const updateSelect = (selectId, dict) => {
        const sel = document.getElementById(selectId);
        if (!sel) return;
        Array.from(sel.options).forEach(opt => { if (dict[opt.value]) opt.text = dict[opt.value]; });
    };

    updateSelect('p1-crown', t.crowns); updateSelect('p2-crown', t.crowns);
    updateSelect('p1-tip', t.tips); updateSelect('p2-tip', t.tips);
    updateSelect('p1-spin', t.spins); updateSelect('p2-spin', t.spins);
    updateSelect('p1-power', t.powers); updateSelect('p2-power', t.powers);

    if (activeTops.length > 0) { buildTelemetryDOM(); updateTelemetryValues(); }
}

// 🌐 建立 WebRTC 連線
function initPeerJS() {
    const randomId = 'jay3d-' + Math.random().toString(36).substring(2, 7);
    peer = new Peer(randomId);

    peer.on('open', (id) => {
        peerId = id;
        document.getElementById('my-peer-id').innerText = id;
    });

    peer.on('connection', (c) => {
        conn = c;
        isHost = true;
        setupNetworkHandlers();
        document.getElementById('net-status').innerText = I18N[currentLang].netStatusConnected;
    });
}

function joinPeerRoom(targetId) {
    if (!targetId) return;
    document.getElementById('net-status').innerText = I18N[currentLang].netStatusConnecting;
    conn = peer.connect(targetId);
    isHost = false;
    setupNetworkHandlers();
}

function setupNetworkHandlers() {
    conn.on('open', () => {
        document.getElementById('net-status').innerText = I18N[currentLang].netStatusConnected;
    });

    conn.on('data', (data) => {
        if (data.type === 'LAUNCH') {
            runCountdownLaunch(data.mode, false);
        } else if (data.type === 'POSE_SYNC' && !isHost) {
            // Client 接收 3D 姿態同步數據
            data.poses.forEach((p, idx) => {
                if (activeTops[idx]) {
                    activeTops[idx].body.position.set(p.x, p.y, p.z);
                    activeTops[idx].body.quaternion.set(p.qx, p.qy, p.qz, p.qw);
                    activeTops[idx].hp = p.hp;
                }
            });
        }
    });
}

// 廣播 3D 剛體數據給對手
function broadcast3DPoses() {
    if (conn && conn.open && isHost) {
        const poses = activeTops.map(t => ({
            x: t.body.position.x,
            y: t.body.position.y,
            z: t.body.position.z,
            qx: t.body.quaternion.x,
            qy: t.body.quaternion.y,
            qz: t.body.quaternion.z,
            qw: t.body.quaternion.w,
            hp: t.hp
        }));
        conn.send({ type: 'POSE_SYNC', poses });
    }
}

function handleMatchEnd(resultText, color, winnerTop) {
    if (isMatchEnded) return;
    isMatchEnded = true;
    update3DStatus(resultText, color);

    activeTops.forEach(t => {
        t.body.velocity.set(0, 0, 0);
        t.body.angularVelocity.set(0, 0, 0);
        t.isWinner = (t === winnerTop);
    });

    const box = document.getElementById('ui-overlay-box');
    if (box) box.style.display = 'block';
}

function check3DMatchResult() {
    if (isMatchEnded || !isSimulating || isCountdownRunning || activeTops.length < 2) return;

    const dict = I18N[currentLang];
    const aliveTops = activeTops.filter(t => !t.isKnockedOut && !t.isBurst && t.getRPM() > 30);
    const newBurstTop = activeTops.find(t => t.isBurst && !t.hasBeenProcessed);
    const newKoTop = activeTops.find(t => t.isKnockedOut && !t.hasBeenProcessed);

    if (aliveTops.length <= 1) {
        const allOthersStopped = activeTops.every(t => t === aliveTops[0] || t.isBurst || t.isKnockedOut || t.getRPM() <= 30);

        if (allOthersStopped) {
            if (aliveTops.length === 1) {
                const winner = aliveTops[0];
                handleMatchEnd(dict.spinFinish(winner.name), "#00ff66", winner);
            } else if (newBurstTop) {
                const winner = activeTops.find(t => t !== newBurstTop && !t.isBurst && !t.isKnockedOut);
                handleMatchEnd(dict.burstFinish(winner ? winner.name : 'Opponent', newBurstTop.name), "#ff3838", winner);
            } else if (newKoTop) {
                const winner = activeTops.find(t => t !== newKoTop && !t.isBurst && !t.isKnockedOut);
                handleMatchEnd(dict.koFinish(newKoTop.name), "#ff9f43", winner);
            } else {
                handleMatchEnd(dict.drawFinish, "#aaa", null);
            }
        }
    }
}

function runCountdownLaunch(mode, broadcast = true) {
    if (isCountdownRunning) return;
    isCountdownRunning = true;
    isMatchEnded = false;

    if (broadcast && conn && conn.open) {
        conn.send({ type: 'LAUNCH', mode });
    }

    activeTops.forEach(t => { world.remove(t.body); scene.remove(t.group); });
    activeTops.length = 0;

    const telemetry = document.getElementById('physics-telemetry-content');
    if (telemetry) telemetry.innerHTML = '';

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
    const dict = I18N[currentLang];
    const p1Name = document.getElementById('p1-name')?.value || dict.p1NameDefault;
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
        const aiNamesZh = ['🤖 暗黑狂狼', '🤖 幻影巨龍', '🤖 聖光神盾', '🤖 暴風阿修羅'];
        const aiNamesEn = ['🤖 Shadow Wolf', '🤖 Phantom Dragon', '🤖 Aegis Shield', '🤖 Storm Asura'];
        const aiList = currentLang === 'zh' ? aiNamesZh : aiNamesEn;
        const randomName = aiList[Math.floor(Math.random() * aiList.length)];
        const randomSpin = Math.random() > 0.5;
        const randomRpm = 8500 + Math.floor(Math.random() * 3500);

        const ai = new Beyblade3DPhysics({
            name: randomName, x: 2.5, y: 1.2, z: 0, rpm: randomRpm, isRightSpin: randomSpin, color: 0xe11d48,
            crownKey: 'DRAKE', tipKey: 'BALL'
        });
        ai.body.velocity.set(-3.2, -1.5, -1.2);
        activeTops.push(ai);

        update3DStatus(dict.vsAiProgress, '#00d2d3');

    } else if (mode === 2 || mode === 'P2P') {
        const p2Name = document.getElementById('p2-name')?.value || dict.p2NameDefault;
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

        update3DStatus(dict.vs2pProgress, '#00d2d3');

    } else if (mode === 4) {
        const p2Name4 = document.getElementById('p2-name')?.value || dict.p2NameDefault;
        const p2_4 = new Beyblade3DPhysics({
            name: '🔴 ' + p2Name4, x: 2.5, y: 1.2, z: 0, rpm: 11000, isRightSpin: false, color: 0xe11d48, crownKey: 'DRAKE', tipKey: 'BALL'
        });
        p2_4.body.velocity.set(-2.8, -1.5, -1.2);
        activeTops.push(p2_4);

        const p3 = new Beyblade3DPhysics({
            name: currentLang === 'zh' ? '🟢 翡翠巨錘' : '🟢 Emerald Hammer', x: 0, y: 1.2, z: -2.5, rpm: 9500, isRightSpin: true, color: 0x10b981, crownKey: 'HEAVY', tipKey: 'NEEDLE'
        });
        p3.body.velocity.set(1.5, -1.5, 2.8);
        activeTops.push(p3);

        const p4 = new Beyblade3DPhysics({
            name: currentLang === 'zh' ? '🟣 帝王紫刃' : '🟣 Imperial Edge', x: 0, y: 1.2, z: 2.5, rpm: 11500, isRightSpin: false, color: 0x8b5cf6, crownKey: 'WIZARD', tipKey: 'ACCEL'
        });
        p4.body.velocity.set(-1.5, -1.5, -2.8);
        activeTops.push(p4);

        update3DStatus(dict.vs4pProgress, '#00d2d3');
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
                <div style="font-weight: bold; font-size: 0.8rem; color: #38bdf8;">${top.name}</div>
                <div id="status-tag-${idx}" style="font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight:bold; display:none;"></div>
            </div>
            
            <div style="display:flex; justify-content:space-between; font-size: 0.7rem; color: #cbd5e1; margin-bottom: 2px;">
                <span>${t.rpm}: <b id="rpm-val-${idx}">0 RPM</b></span>
                <span id="rpm-pct-${idx}">0%</span>
            </div>
            <div style="width: 100%; background: rgba(255,255,255,0.1); height: 5px; border-radius: 3px; overflow: hidden; margin-bottom: 6px;">
                <div id="rpm-bar-${idx}" style="width: 0%; background: linear-gradient(90deg, #00f2fe, #4facfe); height: 100%; transition: width 0.1s;"></div>
            </div>

            <div style="display:flex; justify-content:space-between; font-size: 0.7rem; color: #cbd5e1; margin-bottom: 2px;">
                <span>${t.hp}: <b id="hp-val-${idx}">120 HP</b></span>
                <span id="hp-pct-${idx}">100%</span>
            </div>
            <div style="width: 100%; background: rgba(255,255,255,0.1); height: 5px; border-radius: 3px; overflow: hidden; margin-bottom: 6px;">
                <div id="hp-bar-${idx}" style="width: 100%; background: linear-gradient(90deg, #ff416c, #ff4b2b); height: 100%; transition: width 0.1s;"></div>
            </div>

            <div style="font-size: 0.7rem; color: #cbd5e1; margin-bottom: 6px;">
                ${t.speed}: <b id="speed-val-${idx}">0.00 m/s</b>
            </div>

            <details style="margin-top: 4px; font-size: 0.68rem; color: #94a3b8; cursor: pointer;">
                <summary style="color: #f59e0b; outline: none; padding: 2px 0; font-weight: bold; user-select:none;">${t.tensorTitle}</summary>
                
                <div style="background: rgba(0,0,0,0.4); padding: 6px; border-radius: 4px; margin-top: 4px; line-height: 1.45; border-left: 2px solid #f59e0b;">
                    <b style="color: #00f2fe;">${t.sec1}</b><br>
                    • ${t.omega}: <b id="omega-val-${idx}">0.0 rad/s</b><br>
                    • ${t.Lvec}: <b id="L-val-${idx}">(0, 0, 0) kg·m²/s</b><br>
                    • ${t.impulseJ}: <b id="J-val-${idx}">0.000 N·s</b><br><br>

                    <b style="color: #10b981;">${t.sec2}</b><br>
                    • ${t.totalEk}: <b id="E-val-${idx}">0.000 J</b><br>
                    • ${t.rotE}: <b id="Erot-val-${idx}">0.000 J</b><br>
                    • ${t.transE}: <b id="Etrans-val-${idx}">0.000 J</b><br><br>

                    <b style="color: #a855f7;">${t.sec3}</b><br>
                    • ${t.tilt}: <b id="tilt-val-${idx}">0.0°</b><br>
                    • ${t.precFreq}: <b id="prec-val-${idx}">0.00 Hz</b><br><br>

                    <b style="color: #ff7e5f;">${t.sec4}</b><br>
                    • ${t.Fn}: <b id="Fn-val-${idx}">0.000 N</b><br>
                    • ${t.Ff}: <b id="Ff-val-${idx}">0.000 N</b><br>
                    • ${t.Fc}: <b id="Fc-val-${idx}">0.000 N</b>
                </div>
            </details>
        `;
        telemetry.appendChild(card);
    });
}

function updateTelemetryValues() {
    const tDict = I18N[currentLang];

    activeTops.forEach((t, idx) => {
        if (!isMatchEnded) {
            t.stepPhysics(0.016);
        } else {
            t.body.velocity.set(0, 0, 0);
            t.body.angularVelocity.set(0, 0, 0);
        }

        const rpm = isMatchEnded ? 0 : t.getRPM();
        const rpmPct = isMatchEnded ? 0 : Math.min(100, Math.round((rpm / 12000) * 100));
        const hpPct = Math.max(0, Math.round((t.hp / t.maxHp) * 100));
        const speed = isMatchEnded ? "0.00" : t.getLinearSpeed().toFixed(2);
        const L = isMatchEnded ? { Lx: "0.00000", Ly: "0.00000", Lz: "0.00000" } : t.getAngularMomentumVector();

        const rpmValEl = document.getElementById(`rpm-val-${idx}`);
        if (!rpmValEl) return;

        const tagEl = document.getElementById(`status-tag-${idx}`);
        if (tagEl && isMatchEnded) {
            tagEl.style.display = 'inline-block';
            if (t.isWinner) {
                tagEl.innerText = tDict.tagWinner;
                tagEl.style.background = 'rgba(16, 185, 129, 0.2)';
                tagEl.style.color = '#10b981';
                tagEl.style.border = '1px solid #10b981';
            } else if (t.isBurst) {
                tagEl.innerText = tDict.tagBurst;
                tagEl.style.background = 'rgba(239, 68, 68, 0.2)';
                tagEl.style.color = '#ef4444';
                tagEl.style.border = '1px solid #ef4444';
            } else {
                tagEl.innerText = tDict.tagSpinOut;
                tagEl.style.background = 'rgba(148, 163, 184, 0.2)';
                tagEl.style.color = '#94a3b8';
                tagEl.style.border = '1px solid #94a3b8';
            }
        }

        rpmValEl.innerText = `${rpm} RPM`;
        document.getElementById(`rpm-pct-${idx}`).innerText = `${rpmPct}%`;
        document.getElementById(`rpm-bar-${idx}`).style.width = `${rpmPct}%`;

        document.getElementById(`hp-val-${idx}`).innerText = `${Math.max(0, Math.round(t.hp))} HP`;
        document.getElementById(`hp-pct-${idx}`).innerText = `${hpPct}%`;
        document.getElementById(`hp-bar-${idx}`).style.width = `${hpPct}%`;

        document.getElementById(`speed-val-${idx}`).innerText = `${speed} m/s`;

        document.getElementById(`omega-val-${idx}`).innerText = `${isMatchEnded ? "0.0" : Math.abs(t.body.angularVelocity.y).toFixed(1)} rad/s`;
        document.getElementById(`L-val-${idx}`).innerText = `(${L.Lx}, ${L.Ly}, ${L.Lz}) kg·m²/s`;
        document.getElementById(`J-val-${idx}`).innerText = `${t.lastImpulseMag || "0.000"} N·s`;

        document.getElementById(`E-val-${idx}`).innerText = `${isMatchEnded ? "0.0000" : t.getTotalKE()} J`;
        document.getElementById(`Erot-val-${idx}`).innerText = `${isMatchEnded ? "0.0000" : t.getRotationalKE().toFixed(4)} J`;
        document.getElementById(`Etrans-val-${idx}`).innerText = `${isMatchEnded ? "0.0000" : t.getTranslationalKE().toFixed(4)} J`;

        document.getElementById(`tilt-val-${idx}`).innerText = `${t.getTiltAngle()}°`;
        document.getElementById(`prec-val-${idx}`).innerText = `${isMatchEnded ? "0.00" : t.getPrecessionFrequency()} Hz`;

        document.getElementById(`Fn-val-${idx}`).innerText = `${isMatchEnded ? "0.000" : t.getNormalForce()} N`;
        document.getElementById(`Ff-val-${idx}`).innerText = `${isMatchEnded ? "0.000" : t.getFrictionForce()} N`;
        document.getElementById(`Fc-val-${idx}`).innerText = `${isMatchEnded ? "0.000" : t.getCentripetalForce()} N`;
    });
}

function bindUI() {
    document.getElementById('btn-vs-ai').onclick = () => runCountdownLaunch('VS_AI');
    document.getElementById('btn-2p').onclick = () => runCountdownLaunch(2);
    document.getElementById('btn-p2p-launch').onclick = () => runCountdownLaunch('P2P');
    document.getElementById('btn-4p').onclick = () => runCountdownLaunch(4);

    document.getElementById('btn-join-room').onclick = () => {
        const joinId = document.getElementById('join-peer-id')?.value?.trim();
        if (joinId) joinPeerRoom(joinId);
    };

    const langBtn = document.getElementById('btn-lang');
    if (langBtn) {
        langBtn.onclick = () => {
            currentLang = currentLang === 'zh' ? 'en' : 'zh';
            applyLanguageUI();
        };
    }

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
        if (!isMatchEnded) {
            world.step(1 / 240, dt, 10);
            handle3DTopCollisions();
            update3DSparks(dt);
            check3DMatchResult();

            // 主機廣播 3D 剛體姿態數據
            broadcast3DPoses();
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
