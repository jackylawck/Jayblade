let CURRENT_LANG = 'ZH';
let gameMode = 'SINGLE';
let selectedGrid = 8;
let animationId = null;
let p1, p2;
let matchEnded = false;
let isDebugVisible = false;

let peer = null;
let peerConn = null;
let isOnlineHost = false;
let ping = 0;
let lastSyncTime = 0;

let touchStartY = 0;
let touchStartTime = 0;

const canvas = document.getElementById('arena');
const ctx = canvas.getContext('2d');
const offscreenCanvas = document.createElement('canvas');
const offCtx = offscreenCanvas.getContext('2d');
const CANVAS_SIZE = 500;
const arenaCenter = { x: 250, y: 250, radius: 230 };

const LANG_DICT = {
  ZH: {
    title: '🌀 爆上陀螺 Jayblade 🌀',
    subtitle: 'T0 賽場神機 & 左右雙旋物理模擬器',
    btnSingle: '🎮 單人對戰 (VS AI)',
    btnVersus: '⚔️ 雙人同機 (1P VS 2P)',
    btnOnline: '🌐 遠端連線 (WebRTC)',
    physLabel: '⚙️ 模擬器物理模式: ',
    arcade: '🔥 熱血動畫版 (強烈對撞/閃光爆發)',
    realistic: '🔬 真實擬真版 (能量守恆/異旋吸轉)',
    p1Title: '🔵 P1 陀螺自訂',
    p2Title: '🔴 P2 陀螺自訂',
    p1DefaultName: '火鷹飛龍',
    p2DefaultName: '影武赤狼',
    lblName: '名稱: ',
    lblColor: '顏色: ',
    lblCrown: '撞擊環 (Crown): ',
    lblTip: '動力底軸 (Tip): ',
    lblSpin: '🔄 旋轉方向: ',
    lblAngle: '📐 降落角度: ',
    lblPower: '發射力度: ',
    spinRight: '右迴旋 (順時針)',
    spinLeft: '左迴旋 (逆時針/異旋吸轉)',
    spinLeftP2: '左迴旋 (逆時針)',
    angle0: '垂直直射 (0° 平穩居中)',
    angle15: '斜角傾射 (15° 不規則衝刺)',
    angle30: '極限斜射 (30° 極速側攻)',
    angle0P2: '垂直直射 (0°)',
    angle15P2: '斜角傾射 (15°)',
    angle30P2: '極限斜射 (30°)',
    powerM: '中度 (穩定平衡)',
    powerH: '重度 (極速衝撞)',
    powerL: '輕度 (高精準)',
    btnExport: '📤 複製塗裝碼',
    btnImport: '📥 匯入塗裝碼',
    cpuDiff: 'CPU 對手難度: ',
    optEasy: '簡單 (輕鬆入門)',
    optMedium: '普通 (戰術相剋)',
    optHard: '困難 (行為樹 AI)',
    gridSelect: '選擇 P1 降落位置 (網格 1-18):',
    swipeLabel: '👆 手機手勢：在此區域向上快速滑動進行拉線發射！',
    launch: '3, 2, 1... Go Shoot!',
    debugBtn: '📊 物理數據面板',
    bgmBtn: '🎵 BGM 音效',
    resetBtn: '🔄 重新設定 / 再次對戰',
    onlineTitle: '🌐 WebRTC P2P 連線大廳',
    myIdLabel: '你的 ID',
    joinPlaceholder: '貼上對手的 Host ID',
    btnJoin: '加入房間'
  },
  EN: {
    title: '🌀 Beyblade Jayblade 🌀',
    subtitle: 'T0 Meta & Dual-Spin Physics Simulator',
    btnSingle: '🎮 Single Player (VS AI)',
    btnVersus: '⚔️ Local 2P (1P VS 2P)',
    btnOnline: '🌐 Online WebRTC',
    physLabel: '⚙️ Physics Engine Mode: ',
    arcade: '🔥 Arcade Mode (High Impact / Sparks)',
    realistic: '🔬 Realistic Mode (Spin-Steal / Energy Conserved)',
    p1Title: '🔵 P1 Custom Beyblade',
    p2Title: '🔴 P2 Custom Beyblade',
    p1DefaultName: 'Fire Bird Dragon',
    p2DefaultName: 'Shadow Red Wolf',
    lblName: 'Name: ',
    lblColor: 'Color: ',
    lblCrown: 'Blade/Crown: ',
    lblTip: 'Bit/Tip: ',
    lblSpin: '🔄 Spin Direction: ',
    lblAngle: '📐 Launch Angle: ',
    lblPower: 'Launch Power: ',
    spinRight: 'Right Spin (Clockwise)',
    spinLeft: 'Left Spin (Counter-Clockwise)',
    spinLeftP2: 'Left Spin (Counter-Clockwise)',
    angle0: 'Vertical Drop (0° Stable Center)',
    angle15: 'Angled Drop (15° Rail Rush)',
    angle30: 'Steep Angle (30° Flank Attack)',
    angle0P2: 'Vertical Drop (0°)',
    angle15P2: 'Angled Drop (15°)',
    angle30P2: 'Steep Angle (30°)',
    powerM: 'Medium (Balanced)',
    powerH: 'Heavy (High Speed)',
    powerL: 'Light (High Precision)',
    btnExport: '📤 Export Code',
    btnImport: '📥 Import Code',
    cpuDiff: 'CPU Difficulty: ',
    optEasy: 'Easy',
    optMedium: 'Medium',
    optHard: 'Hard (Behavior Tree AI)',
    gridSelect: 'Select P1 Drop Position (Grid 1-18):',
    swipeLabel: '👆 Swipe gesture: Swipe up quickly here to launch!',
    launch: '3, 2, 1... Go Shoot!',
    debugBtn: '📊 Debug Panel',
    bgmBtn: '🎵 Toggle BGM',
    resetBtn: '🔄 Reset / Play Again',
    onlineTitle: '🌐 WebRTC P2P Lobby',
    myIdLabel: 'Your ID',
    joinPlaceholder: 'Paste Host ID here',
    btnJoin: 'Join Room'
  }
};

function updatePartsDropdowns() {
  ['p1', 'p2'].forEach(prefix => {
    const crownSel = document.getElementById(`${prefix}-crown`);
    const tipSel = document.getElementById(`${prefix}-tip`);

    if (crownSel && typeof PARTS_DATABASE !== 'undefined') {
      const currentVal = crownSel.value;
      crownSel.innerHTML = '';
      Object.keys(PARTS_DATABASE.crowns).forEach(k => {
        const name = getLocalizedPartName('crowns', k, CURRENT_LANG);
        crownSel.innerHTML += `<option value="${k}">${name}</option>`;
      });
      if (currentVal) crownSel.value = currentVal;
    }

    if (tipSel && typeof PARTS_DATABASE !== 'undefined') {
      const currentVal = tipSel.value;
      tipSel.innerHTML = '';
      Object.keys(PARTS_DATABASE.tips).forEach(k => {
        const name = getLocalizedPartName('tips', k, CURRENT_LANG);
        tipSel.innerHTML += `<option value="${k}">${name}</option>`;
      });
      if (currentVal) tipSel.value = currentVal;
    }
  });
}

function toggleLanguage() {
  CURRENT_LANG = CURRENT_LANG === 'ZH' ? 'EN' : 'ZH';
  const dict = LANG_DICT[CURRENT_LANG];

  document.getElementById('ui-title').innerText = dict.title;
  document.getElementById('ui-subtitle').innerText = dict.subtitle;
  document.getElementById('btn-single').innerText = dict.btnSingle;
  document.getElementById('btn-versus').innerText = dict.btnVersus;
  document.getElementById('btn-online').innerText = dict.btnOnline;
  document.getElementById('ui-phys-mode-label').innerText = dict.physLabel;
  document.getElementById('opt-arcade').innerText = dict.arcade;
  document.getElementById('opt-realistic').innerText = dict.realistic;
  document.getElementById('ui-p1-title').innerText = dict.p1Title;
  document.getElementById('ui-p2-title').innerText = dict.p2Title;
  
  // 名稱欄預設值切換
  const p1NameEl = document.getElementById('p1-name');
  if (p1NameEl && (p1NameEl.value === '火鷹飛龍' || p1NameEl.value === 'Fire Bird Dragon')) {
    p1NameEl.value = dict.p1DefaultName;
  }
  const p2NameEl = document.getElementById('p2-name');
  if (p2NameEl && (p2NameEl.value === '影武赤狼' || p2NameEl.value === 'Shadow Red Wolf')) {
    p2NameEl.value = dict.p2DefaultName;
  }

  document.getElementById('lbl-p1-name').innerText = dict.lblName;
  document.getElementById('lbl-p1-color').innerText = dict.lblColor;
  document.getElementById('lbl-p1-crown').innerText = dict.lblCrown;
  document.getElementById('lbl-p1-tip').innerText = dict.lblTip;
  if (document.getElementById('lbl-p1-spin')) document.getElementById('lbl-p1-spin').innerText = dict.lblSpin;
  document.getElementById('lbl-p1-angle').innerText = dict.lblAngle;
  document.getElementById('lbl-p1-power').innerText = dict.lblPower;

  document.getElementById('lbl-p2-name').innerText = dict.lblName;
  document.getElementById('lbl-p2-color').innerText = dict.lblColor;
  document.getElementById('lbl-p2-crown').innerText = dict.lblCrown;
  document.getElementById('lbl-p2-tip').innerText = dict.lblTip;
  if (document.getElementById('lbl-p2-spin')) document.getElementById('lbl-p2-spin').innerText = dict.lblSpin;
  document.getElementById('lbl-p2-angle').innerText = dict.lblAngle;
  document.getElementById('lbl-p2-power').innerText = dict.lblPower;

  // 下拉選單 Option 文字切換
  document.getElementById('opt-p1-spin-r').innerText = dict.spinRight;
  document.getElementById('opt-p1-spin-l').innerText = dict.spinLeft;
  document.getElementById('opt-p2-spin-r').innerText = dict.spinRight;
  document.getElementById('opt-p2-spin-l').innerText = dict.spinLeftP2;

  document.getElementById('opt-p1-angle-0').innerText = dict.angle0;
  document.getElementById('opt-p1-angle-15').innerText = dict.angle15;
  document.getElementById('opt-p1-angle-30').innerText = dict.angle30;
  document.getElementById('opt-p2-angle-0').innerText = dict.angle0P2;
  document.getElementById('opt-p2-angle-15').innerText = dict.angle15P2;
  document.getElementById('opt-p2-angle-30').innerText = dict.angle30P2;

  document.getElementById('opt-p1-power-m').innerText = dict.powerM;
  document.getElementById('opt-p1-power-h').innerText = dict.powerH;
  document.getElementById('opt-p1-power-l').innerText = dict.powerL;
  document.getElementById('opt-p2-power-m').innerText = dict.powerM;
  document.getElementById('opt-p2-power-h').innerText = dict.powerH;
  document.getElementById('opt-p2-power-l').innerText = dict.powerL;

  document.getElementById('btn-export-p1').innerText = dict.btnExport;
  document.getElementById('btn-import-p1').innerText = dict.btnImport;

  document.getElementById('lbl-cpu-diff').innerText = dict.cpuDiff;
  document.getElementById('opt-easy').innerText = dict.optEasy;
  document.getElementById('opt-medium').innerText = dict.optMedium;
  document.getElementById('opt-hard').innerText = dict.optHard;

  document.getElementById('lbl-grid-select').innerText = dict.gridSelect;
  document.getElementById('swipe-label').innerText = dict.swipeLabel;
  document.getElementById('btn-launch').innerText = dict.launch;
  document.getElementById('btn-debug').innerText = dict.debugBtn;
  document.getElementById('btn-bgm').innerText = dict.bgmBtn;
  document.getElementById('btn-reset').innerText = dict.resetBtn;

  if (document.getElementById('ui-online-title')) document.getElementById('ui-online-title').innerText = dict.onlineTitle;
  if (document.getElementById('ui-my-id')) document.getElementById('ui-my-id').innerText = dict.myIdLabel;
  if (document.getElementById('join-peer-id')) document.getElementById('join-peer-id').placeholder = dict.joinPlaceholder;
  if (document.getElementById('btn-join')) document.getElementById('btn-join').innerText = dict.btnJoin;

  updatePartsDropdowns();
}

function initOffscreenBackground() {
  if (!offscreenCanvas) return;
  offscreenCanvas.width = CANVAS_SIZE; offscreenCanvas.height = CANVAS_SIZE;
  offCtx.fillStyle = '#0a0a0f'; offCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  offCtx.beginPath(); offCtx.arc(arenaCenter.x, arenaCenter.y, arenaCenter.radius, 0, Math.PI * 2);
  offCtx.fillStyle = '#1e1e2f'; offCtx.fill(); offCtx.strokeStyle = '#ffcc00'; offCtx.lineWidth = 6; offCtx.stroke();
  for (let r = arenaCenter.radius - 15; r > 30; r -= 35) {
    offCtx.beginPath(); offCtx.arc(arenaCenter.x, arenaCenter.y, r, 0, Math.PI * 2);
    offCtx.strokeStyle = 'rgba(255, 255, 255, 0.04)'; offCtx.lineWidth = 1.5; offCtx.stroke();
  }
  offCtx.beginPath(); offCtx.arc(arenaCenter.x, arenaCenter.y, arenaCenter.radius - 15, 0, Math.PI * 2);
  offCtx.strokeStyle = '#ff3366'; offCtx.lineWidth = 3; offCtx.stroke();
}

function setupRetinaCanvas() {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = CANVAS_SIZE * dpr; canvas.height = CANVAS_SIZE * dpr;
  ctx.scale(dpr, dpr);
}

function getStats() { try { const s = localStorage.getItem('jayblade_stats'); return s ? JSON.parse(s) : { matches: 0, wins: 0, streak: 0 }; } catch (e) { return { matches: 0, wins: 0, streak: 0 }; } }
function getAchievements() { try { const ach = localStorage.getItem('jayblade_achievements'); return ach ? JSON.parse(ach) : ACHIEVEMENTS_DB; } catch (e) { return ACHIEVEMENTS_DB; } }
function unlockAchievement(achId) {
  const ach = getAchievements();
  if (ach[achId] && !ach[achId].unlocked) {
    ach[achId].unlocked = true;
    localStorage.setItem('jayblade_achievements', JSON.stringify(ach));
    const name = CURRENT_LANG === 'EN' ? ach[achId].name_en : ach[achId].name_zh;
    alert(`🎉 ${CURRENT_LANG === 'EN' ? 'Achievement Unlocked' : '解鎖成就'}: 【${name}】`);
  }
}
function updateWinStats(isP1Win, isXDashKO = false) {
  const stats = getStats();
  stats.matches += 1;
  if (isP1Win) {
    stats.wins += 1; stats.streak += 1;
    unlockAchievement('FIRST_WIN');
    if (stats.streak >= 3) unlockAchievement('STREAK_3');
    if (isXDashKO) unlockAchievement('XDASH_KO');
  } else { stats.streak = 0; }
  localStorage.setItem('jayblade_stats', JSON.stringify(stats));
  displayStatsUI();
}
function displayStatsUI() {
  const stats = getStats(), ach = getAchievements();
  const winRate = stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0;
  const unl = Object.keys(ach).filter(k => ach[k].unlocked).length;
  if (document.getElementById('stats-display')) {
    document.getElementById('stats-display').innerText = CURRENT_LANG === 'EN' 
      ? `🏆 Stats: Matches ${stats.matches} | Win Rate ${winRate}% (${stats.wins} W) | Streak: ${stats.streak}`
      : `🏆 戰績：總對戰 ${stats.matches} 場 | 勝率 ${winRate}% (${stats.wins} 勝) | 連勝: ${stats.streak}`;
  }
  if (document.getElementById('achieve-display')) {
    document.getElementById('achieve-display').innerText = CURRENT_LANG === 'EN'
      ? `🎖️ Achievements: ${unl} / ${Object.keys(ach).length}`
      : `🎖️ 成就：解鎖 ${unl} / ${Object.keys(ach).length}`;
  }
}

function exportShareCode(prefix) {
  const code = generateShareCode({
    name: document.getElementById(`${prefix}-name`)?.value || '火鷹飛龍',
    color: document.getElementById(`${prefix}-color`)?.value || '#1e90ff',
    crown: document.getElementById(`${prefix}-crown`)?.value || 'wizard_arc',
    tip: document.getElementById(`${prefix}-tip`)?.value || 'dash_flat',
    spin: document.getElementById(`${prefix}-spin`)?.value || 'RIGHT',
    angle: document.getElementById(`${prefix}-angle`)?.value || '15',
    power: document.getElementById(`${prefix}-power`)?.value || 'MEDIUM'
  });
  navigator.clipboard.writeText(code).then(() => alert(CURRENT_LANG === 'EN' ? '🎉 Share code copied!' : '🎉 塗裝分享碼已複製！'));
}
function importShareCode(prefix) {
  const code = prompt(CURRENT_LANG === 'EN' ? 'Paste Share Code:' : '貼上塗裝分享碼:');
  if (!code) return;
  const cfg = parseShareCode(code);
  if (cfg) {
    if (document.getElementById(`${prefix}-name`)) document.getElementById(`${prefix}-name`).value = cfg.name;
    if (document.getElementById(`${prefix}-color`)) document.getElementById(`${prefix}-color`).value = cfg.color;
    if (document.getElementById(`${prefix}-crown`)) document.getElementById(`${prefix}-crown`).value = cfg.crown;
    if (document.getElementById(`${prefix}-tip`)) document.getElementById(`${prefix}-tip`).value = cfg.tip;
    if (document.getElementById(`${prefix}-spin`)) document.getElementById(`${prefix}-spin`).value = cfg.spin || 'RIGHT';
    if (document.getElementById(`${prefix}-angle`)) document.getElementById(`${prefix}-angle`).value = cfg.angle || '15';
    if (document.getElementById(`${prefix}-power`)) document.getElementById(`${prefix}-power`).value = cfg.power;
    alert(`${CURRENT_LANG === 'EN' ? '✅ Successfully Imported' : '✅ 匯入'}: 【${cfg.name}】！`);
  } else { alert(CURRENT_LANG === 'EN' ? '❌ Invalid Code' : '❌ 分享碼無效'); }
}

function initPeerJS() {
  if (peer || typeof Peer === 'undefined') return;

  const shortId = Math.floor(100000 + Math.random() * 900000).toString();
  peer = new Peer(shortId);

  peer.on('open', (id) => {
    if (document.getElementById('my-peer-id')) {
      document.getElementById('my-peer-id').innerText = id;
    }
  });

  peer.on('error', (err) => {
    if (err.type === 'unavailable-id') {
      peer.destroy();
      peer = null;
      initPeerJS();
    }
  });

  peer.on('connection', (conn) => {
    peerConn = conn;
    isOnlineHost = true;
    setupPeerListeners();
    document.getElementById('network-status').innerText = CURRENT_LANG === 'EN' ? '✅ Player Connected!' : '✅ 玩家已加入連線！';
  });
}

function connectToPeer() {
  const targetId = document.getElementById('join-peer-id')?.value;
  if (!targetId) return alert(CURRENT_LANG === 'EN' ? 'Enter Host ID' : '請輸入對手的 Host ID');
  initPeerJS();
  peerConn = peer.connect(targetId);
  isOnlineHost = false;
  setupPeerListeners();
  document.getElementById('network-status').innerText = CURRENT_LANG === 'EN' ? 'Connecting...' : '連線中...';
}

function setupPeerListeners() {
  peerConn.on('open', () => {
    document.getElementById('network-status').innerText = CURRENT_LANG === 'EN' ? '✅ Connected! (Client Mode)' : '✅ 連線成功！ (Client 模式)';
    if (!isOnlineHost) setInterval(() => { if (peerConn.open) peerConn.send({ type: 'PING', time: Date.now() }); }, 1000);
  });
  peerConn.on('data', (data) => {
    if (data.type === 'PING') { peerConn.send({ type: 'PONG', time: data.time }); }
    else if (data.type === 'PONG') {
      ping = Date.now() - data.time;
      document.getElementById('ping-display').innerText = `Ping: ${ping} ms`;
    }
    else if (data.type === 'SYNC_STATE' && !isOnlineHost && p1 && p2) {
      p1.targetX = data.p1.x; p1.targetY = data.p1.y; p1.rpm = data.p1.rpm; p1.shatterHp = data.p1.hp; p1.isXDashing = data.p1.xd;
      p2.targetX = data.p2.x; p2.targetY = data.p2.y; p2.rpm = data.p2.rpm; p2.shatterHp = data.p2.hp; p2.isXDashing = data.p2.xd;
    }
    else if (data.type === 'TRIGGER_FLASH' && !isOnlineHost) {
      triggerScreenFlash(); triggerScreenShake(data.shake, 0.22); sfx.playExtremeImpactSound(250);
    }
  });
}

function switchPhysicsEngineMode(mode) { CURRENT_PHYSICS_MODE = mode; }
function toggleDebugPanel() {
  isDebugVisible = !isDebugVisible;
  const panel = document.getElementById('debug-panel');
  if (panel) panel.style.display = isDebugVisible ? 'block' : 'none';
}
function toggleBGM() { const active = sfx.toggleBGM(); alert(active ? '🎵 BGM ON' : '🔇 BGM OFF'); }

document.addEventListener('DOMContentLoaded', () => {
  initOffscreenBackground(); setupRetinaCanvas();

  const swipeZone = document.getElementById('swipe-launch-zone');
  if (swipeZone) {
    swipeZone.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
      swipeZone.classList.add('active');
    });

    swipeZone.addEventListener('touchend', (e) => {
      swipeZone.classList.remove('active');
      const touchEndY = e.changedTouches[0].clientY;
      const distY = touchStartY - touchEndY;
      const duration = (Date.now() - touchStartTime) / 1000;
      
      if (distY > 50 && duration < 0.8) {
        const speed = distY / duration;
        let calculatedPower = 'MEDIUM';
        if (speed > 800) calculatedPower = 'HEAVY';
        else if (speed < 300) calculatedPower = 'LIGHT';

        if (document.getElementById('p1-power')) document.getElementById('p1-power').value = calculatedPower;
        startGame();
      }
    });
  }

  updatePartsDropdowns();

  try {
    const pref = loadUserPreferences();
    if (pref) {
      if (pref.p1Data) {
        if (document.getElementById('p1-name')) document.getElementById('p1-name').value = pref.p1Data.name || '火鷹飛龍';
        if (document.getElementById('p1-color')) document.getElementById('p1-color').value = pref.p1Data.color || '#1e90ff';
        if (document.getElementById('p1-crown')) document.getElementById('p1-crown').value = pref.p1Data.crown || 'wizard_arc';
        if (document.getElementById('p1-tip')) document.getElementById('p1-tip').value = pref.p1Data.tip || 'dash_flat';
        if (document.getElementById('p1-spin')) document.getElementById('p1-spin').value = pref.p1Data.spin || 'RIGHT';
        if (document.getElementById('p1-angle')) document.getElementById('p1-angle').value = pref.p1Data.angle || '15';
        if (document.getElementById('p1-power')) document.getElementById('p1-power').value = pref.p1Data.power || 'MEDIUM';
      }
      if (pref.p2Data) {
        if (document.getElementById('p2-name')) document.getElementById('p2-name').value = pref.p2Data.name || '影武赤狼';
        if (document.getElementById('p2-color')) document.getElementById('p2-color').value = pref.p2Data.color || '#ff3838';
        if (document.getElementById('p2-crown')) document.getElementById('p2-crown').value = pref.p2Data.crown || 'phoenix_wing';
        if (document.getElementById('p2-tip')) document.getElementById('p2-tip').value = pref.p2Data.tip || 'needle_point';
        if (document.getElementById('p2-spin')) document.getElementById('p2-spin').value = pref.p2Data.spin || 'RIGHT';
        if (document.getElementById('p2-angle')) document.getElementById('p2-angle').value = pref.p2Data.angle || '0';
        if (document.getElementById('p2-power')) document.getElementById('p2-power').value = pref.p2Data.power || 'MEDIUM';
      }
      if (document.getElementById('cpu-difficulty')) document.getElementById('cpu-difficulty').value = pref.diff || 'MEDIUM';
      if (document.getElementById('physics-engine-mode')) {
        document.getElementById('physics-engine-mode').value = pref.engineMode || 'ARCADE';
        CURRENT_PHYSICS_MODE = pref.engineMode || 'ARCADE';
      }
      if (pref.grid) selectedGrid = pref.grid;
    }
  } catch (err) { }
  const gridContainer = document.getElementById('grid-selector');
  if (gridContainer) {
    gridContainer.innerHTML = '';
    for (let i = 1; i <= 18; i++) {
      const item = document.createElement('div');
      item.className = `grid-item ${i === selectedGrid ? 'selected' : ''}`; item.innerText = i;
      item.onclick = () => { document.querySelectorAll('.grid-item').forEach(el => el.classList.remove('selected')); item.classList.add('selected'); selectedGrid = i; };
      gridContainer.appendChild(item);
    }
  }
});

window.addEventListener('click', () => sfx.init(), { once: true });
window.addEventListener('touchstart', () => sfx.init(), { once: true });

function setGameMode(mode) {
  gameMode = mode;
  const cpuGroup = document.getElementById('cpu-difficulty-group'), p2Group = document.getElementById('p2-setup-group'), onlineGroup = document.getElementById('online-panel');
  if (cpuGroup) cpuGroup.style.display = mode === 'SINGLE' ? 'block' : 'none';
  if (p2Group) p2Group.style.display = mode === 'VERSUS' ? 'block' : 'none';
  if (onlineGroup) onlineGroup.style.display = mode === 'ONLINE' ? 'block' : 'none';
  if (mode === 'ONLINE') initPeerJS();
  
  const msg = CURRENT_LANG === 'EN'
    ? (mode === 'SINGLE' ? 'Mode: Single Player (VS AI)' : (mode === 'VERSUS' ? 'Mode: Local 2P' : 'Mode: Online WebRTC'))
    : (mode === 'SINGLE' ? '模式：單人對戰 (VS AI)' : (mode === 'VERSUS' ? '模式：雙人對決 (1P VS 2P)' : '模式：WebRTC 遠端連線對戰'));
  alert(msg);
}

function generateCpuTactics(p1Config, difficultyKey) {
  const diff = (typeof CPU_DIFFICULTIES !== 'undefined' && CPU_DIFFICULTIES[difficultyKey]) ? CPU_DIFFICULTIES[difficultyKey] : { launchPower: 'MEDIUM', counterStrategy: true, aiReactionRate: 0.4 };
  let cpuCrown = 'phoenix_wing', cpuTip = 'dash_flat', cpuPower = diff.launchPower, cpuGrid = 11, cpuSpin = 'RIGHT';
  if (diff.counterStrategy && p1Config.tip === 'needle_point') { cpuCrown = 'phoenix_wing'; cpuTip = 'dash_flat'; cpuGrid = 18; cpuSpin = 'RIGHT'; } 
  else { cpuCrown = 'wizard_arc'; cpuTip = 'needle_point'; cpuGrid = 10; cpuSpin = 'LEFT'; }
  return { crown: cpuCrown, tip: cpuTip, power: cpuPower, grid: cpuGrid, spin: cpuSpin, aiRate: diff.aiReactionRate };
}

function playLaunchSequence(onComplete) {
  let count = 3;
  const statusBar = document.getElementById('status-bar');
  const timer = setInterval(() => {
    if (count > 0) {
      if (statusBar) statusBar.innerText = `READY... ${count}`; sfx.playCountBeep(false); count--;
    } else {
      if (statusBar) statusBar.innerText = `3, 2, 1... Go Shoot!`; sfx.playCountBeep(true); clearInterval(timer); setTimeout(onComplete, 200);
    }
  }, 600);
}

function startGame() {
  sfx.init();
  const p1Data = {
    name: document.getElementById('p1-name')?.value || (CURRENT_LANG === 'EN' ? 'Fire Bird Dragon' : '火鷹飛龍'), 
    color: document.getElementById('p1-color')?.value || '#1e90ff',
    crown: document.getElementById('p1-crown')?.value || 'wizard_arc', 
    tip: document.getElementById('p1-tip')?.value || 'dash_flat', 
    spin: document.getElementById('p1-spin')?.value || 'RIGHT',
    angle: document.getElementById('p1-angle')?.value || '15', 
    power: document.getElementById('p1-power')?.value || 'MEDIUM'
  };
  const p2Data = {
    name: document.getElementById('p2-name')?.value || (CURRENT_LANG === 'EN' ? 'Shadow Red Wolf' : '影武赤狼'), 
    color: document.getElementById('p2-color')?.value || '#ff3838',
    crown: document.getElementById('p2-crown')?.value || 'phoenix_wing', 
    tip: document.getElementById('p2-tip')?.value || 'needle_point', 
    spin: document.getElementById('p2-spin')?.value || 'RIGHT',
    angle: document.getElementById('p2-angle')?.value || '0', 
    power: document.getElementById('p2-power')?.value || 'MEDIUM'
  };

  const diffKey = document.getElementById('cpu-difficulty')?.value || 'MEDIUM';
  const engineMode = document.getElementById('physics-engine-mode')?.value || 'ARCADE';
  CURRENT_PHYSICS_MODE = engineMode;

  saveUserPreferences(p1Data, p2Data, selectedGrid, diffKey, engineMode);
  document.getElementById('setup-panel').style.display = 'none';
  document.getElementById('game-panel').style.display = 'block';

  playLaunchSequence(() => {
    const col = (selectedGrid - 1) % 6, row = Math.floor((selectedGrid - 1) / 6);
    const p1X = 100 + col * 60, p1Y = 100 + row * 80;

    p1 = new PhysicalTop(p1X, p1Y, p1Data.crown, p1Data.tip, p1Data.power, p1Data.angle, p1Data.spin, p1Data.name, p1Data.color, false);

    if (gameMode === 'SINGLE') {
      const cpuSetup = generateCpuTactics(p1Data, diffKey);
      const cpuCol = (cpuSetup.grid - 1) % 6, cpuRow = Math.floor((cpuSetup.grid - 1) / 6);
      const cpuDiffName = CPU_DIFFICULTIES[diffKey] ? (CURRENT_LANG === 'EN' ? CPU_DIFFICULTIES[diffKey].name_en : CPU_DIFFICULTIES[diffKey].name_zh) : '普通';
      p2 = new PhysicalTop(100 + cpuCol * 60, 100 + cpuRow * 80, cpuSetup.crown, cpuSetup.tip, cpuSetup.power, '0', cpuSetup.spin, `CPU (${cpuDiffName})`, '#ff3838', true, cpuSetup.aiRate);
    } else {
      p2 = new PhysicalTop(350, 250, p2Data.crown, p2Data.tip, p2Data.power, p2Data.angle, p2Data.spin, p2Data.name, p2Data.color, false);
    }

    matchEnded = false; displayStatsUI();
    lastTime = performance.now();
    animationId = requestAnimationFrame(mainGameLoop);
  });
}

let lastTime = 0; let frameCount = 0; let lastFpsUpdate = 0;

function mainGameLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  frameCount++;
  if (now - lastFpsUpdate > 1000) {
    if (document.getElementById('fps-counter')) document.getElementById('fps-counter').innerText = frameCount;
    frameCount = 0; lastFpsUpdate = now;
  }

  if (gameMode === 'ONLINE' && !isOnlineHost) {
    p1.x += (p1.targetX - p1.x) * 0.3; p1.y += (p1.targetY - p1.y) * 0.3;
    p2.x += (p2.targetX - p2.x) * 0.3; p2.y += (p2.targetY - p2.y) * 0.3;
    p1.angle += p1.angularVelocity * dt; p2.angle += p2.angularVelocity * dt;
  } else {
    p1.update(dt, arenaCenter, p2); p2.update(dt, arenaCenter, p1);
    resolveAdvancedCollision(p1, p2);

    if (gameMode === 'ONLINE' && isOnlineHost && peerConn && peerConn.open) {
      if (now - lastSyncTime > 50) {
        peerConn.send({
          type: 'SYNC_STATE',
          p1: { x: p1.x, y: p1.y, rpm: p1.rpm, hp: p1.shatterHp, xd: p1.isXDashing },
          p2: { x: p2.x, y: p2.y, rpm: p2.rpm, hp: p2.shatterHp, xd: p2.isXDashing }
        });
        lastSyncTime = now;
      }
    }
  }

  pPool.updateAndDraw(dt, ctx);

  ctx.save();
  if (screenShakeTime > 0) {
    screenShakeTime -= dt;
    const offsetX = (Math.random() - 0.5) * screenShakeIntensity;
    const offsetY = (Math.random() - 0.5) * screenShakeIntensity;
    ctx.translate(offsetX, offsetY);
  }

  ctx.drawImage(offscreenCanvas, 0, 0);

  if (p1?.isXDashing || p2?.isXDashing) {
    ctx.save(); ctx.strokeStyle = 'rgba(0, 210, 211, 0.25)'; ctx.lineWidth = 2;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      ctx.beginPath(); ctx.moveTo(arenaCenter.x + Math.cos(a) * 120, arenaCenter.y + Math.sin(a) * 120); ctx.lineTo(arenaCenter.x + Math.cos(a) * 230, arenaCenter.y + Math.sin(a) * 230); ctx.stroke();
    }
    ctx.restore();
  }

  pPool.updateAndDraw(0, ctx);
  p1.draw(ctx); p2.draw(ctx);

  if (screenFlashAlpha > 0) {
    screenFlashAlpha -= dt * 2.5;
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, screenFlashAlpha)})`;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  ctx.restore();

  if (isDebugVisible) {
    if (document.getElementById('p1-debug')) document.getElementById('p1-debug').innerHTML = p1.getDebugData();
    if (document.getElementById('p2-debug')) document.getElementById('p2-debug').innerHTML = p2.getDebugData();
  }

  const statusBar = document.getElementById('status-bar');
  const d1 = Math.hypot(p1.x - arenaCenter.x, p1.y - arenaCenter.y);
  const d2 = Math.hypot(p2.x - arenaCenter.x, p2.y - arenaCenter.y);

  if (!matchEnded) {
    if (d1 > arenaCenter.radius && p2.lastHitWasExtreme) {
      if (statusBar) statusBar.innerText = `💥⚡ EXTREME FINISH! (3pt) ${p2.name} Wins!`;
      updateWinStats(false); matchEnded = true; sfx.stopBGM();
    } else if (d2 > arenaCenter.radius && p1.lastHitWasExtreme) {
      if (statusBar) statusBar.innerText = `💥⚡ EXTREME FINISH! (3pt) ${p1.name} Wins!`;
      updateWinStats(true, true); matchEnded = true; sfx.stopBGM();
    } else if (d1 > arenaCenter.radius) {
      if (statusBar) statusBar.innerText = `🚨 OVER FINISH! (2pt) ${p2.name} Wins!`;
      updateWinStats(false); matchEnded = true; sfx.stopBGM();
    } else if (d2 > arenaCenter.radius) {
      if (statusBar) statusBar.innerText = `🚨 OVER FINISH! (2pt) ${p1.name} Wins!`;
      updateWinStats(true, false); matchEnded = true; sfx.stopBGM();
    } else if (p1.shatterHp <= 0) {
      p1.triggerShatterEffect();
      if (statusBar) statusBar.innerText = `💥 BURST FINISH! (2pt) ${p2.name} Wins!`;
      updateWinStats(false); matchEnded = true; sfx.stopBGM();
    } else if (p2.shatterHp <= 0) {
      p2.triggerShatterEffect();
      if (statusBar) statusBar.innerText = `💥 BURST FINISH! (2pt) ${p1.name} Wins!`;
      updateWinStats(true, false); matchEnded = true; sfx.stopBGM();
    } else if (p1.rpm <= 0 && p2.rpm <= 0) {
      const isP1Win = p1.rpm > p2.rpm;
      if (statusBar) statusBar.innerText = isP1Win ? `🌀 SPIN FINISH! (1pt) ${p1.name} Wins!` : `🌀 SPIN FINISH! (1pt) ${p2.name} Wins!`;
      updateWinStats(isP1Win, false); matchEnded = true; sfx.stopBGM();
    } else {
      if (statusBar) statusBar.innerText = `${p1.name}: ${Math.round(p1.rpm)} RPM | ${p2.name}: ${Math.round(p2.rpm)} RPM`;
    }
  }

  if (!matchEnded) {
    animationId = requestAnimationFrame(mainGameLoop);
  } else {
    animationId = null;
  }
}

function resetGame() {
  if (animationId) cancelAnimationFrame(animationId);
  sfx.stopBGM();
  document.getElementById('setup-panel').style.display = 'block';
  document.getElementById('game-panel').style.display = 'none';
}
