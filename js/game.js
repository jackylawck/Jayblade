let gameMode = 'SINGLE';
let selectedGrid = 8;
let animationId = null;
let p1, p2;
let matchEnded = false;
let isDebugVisible = false;

// 🌐 頂尖網路架構：Host-Client 20Hz 狀態同步
let peer = null;
let peerConn = null;
let isOnlineHost = false;
let ping = 0;
let lastSyncTime = 0;

const canvas = document.getElementById('arena');
const ctx = canvas.getContext('2d');
const offscreenCanvas = document.createElement('canvas');
const offCtx = offscreenCanvas.getContext('2d');
const CANVAS_SIZE = 500;
const arenaCenter = { x: 250, y: 250, radius: 230 };

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

// 戰績與成就
function getStats() { try { const s = localStorage.getItem('jayblade_stats'); return s ? JSON.parse(s) : { matches: 0, wins: 0, streak: 0 }; } catch (e) { return { matches: 0, wins: 0, streak: 0 }; } }
function getAchievements() { try { const ach = localStorage.getItem('jayblade_achievements'); return ach ? JSON.parse(ach) : ACHIEVEMENTS_DB; } catch (e) { return ACHIEVEMENTS_DB; } }
function unlockAchievement(achId) {
  const ach = getAchievements();
  if (ach[achId] && !ach[achId].unlocked) {
    ach[achId].unlocked = true;
    localStorage.setItem('jayblade_achievements', JSON.stringify(ach));
    alert(`🎉 解鎖成就：【${ach[achId].name}】`);
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
  if (document.getElementById('stats-display')) document.getElementById('stats-display').innerText = `🏆 戰績：總對戰 ${stats.matches} 場 | 勝率 ${winRate}% (${stats.wins} 勝) | 連勝: ${stats.streak}`;
  if (document.getElementById('achieve-display')) document.getElementById('achieve-display').innerText = `🎖️ 成就：解鎖 ${unl} / ${Object.keys(ach).length}`;
}

// 分享碼
function exportShareCode(prefix) {
  const code = generateShareCode({
    name: document.getElementById(`${prefix}-name`)?.value || '陀螺',
    color: document.getElementById(`${prefix}-color`)?.value || '#ff3838',
    crown: document.getElementById(`${prefix}-crown`)?.value || 'dragon_blade',
    tip: document.getElementById(`${prefix}-tip`)?.value || 'dash_flat',
    power: document.getElementById(`${prefix}-power`)?.value || 'MEDIUM'
  });
  navigator.clipboard.writeText(code).then(() => alert(`🎉 塗裝分享碼已複製！`));
}
function importShareCode(prefix) {
  const code = prompt('貼上塗裝分享碼:');
  if (!code) return;
  const cfg = parseShareCode(code);
  if (cfg) {
    if (document.getElementById(`${prefix}-name`)) document.getElementById(`${prefix}-name`).value = cfg.name;
    if (document.getElementById(`${prefix}-color`)) document.getElementById(`${prefix}-color`).value = cfg.color;
    if (document.getElementById(`${prefix}-crown`)) document.getElementById(`${prefix}-crown`).value = cfg.crown;
    if (document.getElementById(`${prefix}-tip`)) document.getElementById(`${prefix}-tip`).value = cfg.tip;
    if (document.getElementById(`${prefix}-power`)) document.getElementById(`${prefix}-power`).value = cfg.power;
    alert(`✅ 匯入：【${cfg.name}】！`);
  } else { alert('❌ 分享碼無效'); }
}

// 🌐 WebRTC PeerJS 初始化與對連
function initPeerJS() {
  if (peer || typeof Peer === 'undefined') return;
  peer = new Peer();
  peer.on('open', (id) => { if (document.getElementById('my-peer-id')) document.getElementById('my-peer-id').innerText = id; });
  peer.on('connection', (conn) => {
    peerConn = conn; isOnlineHost = true; setupPeerListeners();
    document.getElementById('network-status').innerText = '✅ 玩家已加入連線！';
  });
}
function connectToPeer() {
  const targetId = document.getElementById('join-peer-id')?.value;
  if (!targetId) return alert('請輸入對手的 Host ID');
  initPeerJS();
  peerConn = peer.connect(targetId);
  isOnlineHost = false; setupPeerListeners();
  document.getElementById('network-status').innerText = '連線中...';
}
function setupPeerListeners() {
  peerConn.on('open', () => {
    document.getElementById('network-status').innerText = '✅ 連線成功！ (Client 模式)';
    // 客戶端定時發送 Ping
    if (!isOnlineHost) setInterval(() => { if (peerConn.open) peerConn.send({ type: 'PING', time: Date.now() }); }, 1000);
  });
  peerConn.on('data', (data) => {
    if (data.type === 'PING') { peerConn.send({ type: 'PONG', time: data.time }); }
    else if (data.type === 'PONG') {
      ping = Date.now() - data.time;
      document.getElementById('ping-display').innerText = `Ping: ${ping} ms`;
    }
    else if (data.type === 'SYNC_STATE' && !isOnlineHost && p1 && p2) {
      // 接收伺服端最新狀態供 Lerp (線性插值)
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
function toggleBGM() { const active = sfx.toggleBGM(); alert(active ? '🎵 BGM 已開啟' : '🔇 BGM 已關閉'); }

document.addEventListener('DOMContentLoaded', () => {
  initOffscreenBackground(); setupRetinaCanvas();
  ['p1', 'p2'].forEach(prefix => {
    const crownSel = document.getElementById(`${prefix}-crown`);
    const tipSel = document.getElementById(`${prefix}-tip`);
    if (crownSel && typeof PARTS_DATABASE !== 'undefined') {
      crownSel.innerHTML = ''; Object.keys(PARTS_DATABASE.crowns).forEach(k => { crownSel.innerHTML += `<option value="${k}">${PARTS_DATABASE.crowns[k].name}</option>`; });
    }
    if (tipSel && typeof PARTS_DATABASE !== 'undefined') {
      tipSel.innerHTML = ''; Object.keys(PARTS_DATABASE.tips).forEach(k => { tipSel.innerHTML += `<option value="${k}">${PARTS_DATABASE.tips[k].name}</option>`; });
    }
  });
  try {
    const pref = loadUserPreferences();
    if (pref) {
      if (pref.p1Data) {
        if (document.getElementById('p1-name')) document.getElementById('p1-name').value = pref.p1Data.name;
        if (document.getElementById('p1-color')) document.getElementById('p1-color').value = pref.p1Data.color;
        if (document.getElementById('p1-crown')) document.getElementById('p1-crown').value = pref.p1Data.crown;
        if (document.getElementById('p1-tip')) document.getElementById('p1-tip').value = pref.p1Data.tip;
        if (document.getElementById('p1-power')) document.getElementById('p1-power').value = pref.p1Data.power;
      }
      if (pref.p2Data) {
        if (document.getElementById('p2-name')) document.getElementById('p2-name').value = pref.p2Data.name;
        if (document.getElementById('p2-color')) document.getElementById('p2-color').value = pref.p2Data.color;
        if (document.getElementById('p2-crown')) document.getElementById('p2-crown').value = pref.p2Data.crown;
        if (document.getElementById('p2-tip')) document.getElementById('p2-tip').value = pref.p2Data.tip;
        if (document.getElementById('p2-power')) document.getElementById('p2-power').value = pref.p2Data.power;
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
  alert(mode === 'SINGLE' ? '模式：單人對戰 (VS AI)' : (mode === 'VERSUS' ? '模式：雙人對決 (1P VS 2P)' : '模式：WebRTC 遠端連線對戰'));
}

function generateCpuTactics(p1Config, difficultyKey) {
  const diff = (typeof CPU_DIFFICULTIES !== 'undefined' && CPU_DIFFICULTIES[difficultyKey]) ? CPU_DIFFICULTIES[difficultyKey] : { launchPower: 'MEDIUM', counterStrategy: true, aiReactionRate: 0.4 };
  let cpuCrown = 'iron_fang', cpuTip = 'dash_flat', cpuPower = diff.launchPower, cpuGrid = 11;
  if (diff.counterStrategy && p1Config.tip === 'needle_point') { cpuCrown = 'iron_fang'; cpuTip = 'dash_flat'; cpuGrid = 18; } 
  else { cpuCrown = 'aero_shield'; cpuTip = 'needle_point'; cpuGrid = 10; }
  return { crown: cpuCrown, tip: cpuTip, power: cpuPower, grid: cpuGrid, aiRate: diff.aiReactionRate };
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
    name: document.getElementById('p1-name')?.value || '破空飛龍', color: document.getElementById('p1-color')?.value || '#ff3838',
    crown: document.getElementById('p1-crown')?.value || 'dragon_blade', tip: document.getElementById('p1-tip')?.value || 'dash_flat', power: document.getElementById('p1-power')?.value || 'MEDIUM'
  };
  const p2Data = {
    name: document.getElementById('p2-name')?.value || '影武赤狼', color: document.getElementById('p2-color')?.value || '#1e90ff',
    crown: document.getElementById('p2-crown')?.value || 'iron_fang', tip: document.getElementById('p2-tip')?.value || 'needle_point', power: document.getElementById('p2-power')?.value || 'MEDIUM'
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

    p1 = new PhysicalTop(p1X, p1Y, p1Data.crown, p1Data.tip, p1Data.power, p1Data.name, p1Data.color, false);

    if (gameMode === 'SINGLE') {
      const cpuSetup = generateCpuTactics(p1Data, diffKey);
      const cpuCol = (cpuSetup.grid - 1) % 6, cpuRow = Math.floor((cpuSetup.grid - 1) / 6);
      p2 = new PhysicalTop(100 + cpuCol * 60, 100 + cpuRow * 80, cpuSetup.crown, cpuSetup.tip, cpuSetup.power, `CPU (${CPU_DIFFICULTIES[diffKey]?.name || '普通'})`, null, true, cpuSetup.aiRate);
    } else {
      p2 = new PhysicalTop(350, 250, p2Data.crown, p2Data.tip, p2Data.power, p2Data.name, p2Data.color, false);
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

  // 💡 客戶端與 Host 的運算分離 (Authority Sync)
  if (gameMode === 'ONLINE' && !isOnlineHost) {
    // Client：僅作平滑插值 (Lerp) 繪圖，不進行本機物理引擎運算
    p1.x += (p1.targetX - p1.x) * 0.3; p1.y += (p1.targetY - p1.y) * 0.3;
    p2.x += (p2.targetX - p2.x) * 0.3; p2.y += (p2.targetY - p2.y) * 0.3;
    p1.angle += p1.angularVelocity * dt; p2.angle += p2.angularVelocity * dt;
  } else {
    // Local 或是 Host 進行高擬真運算
    p1.update(dt, arenaCenter, p2); p2.update(dt, arenaCenter, p1);
    resolveAdvancedCollision(p1, p2);

    // Host 20Hz 發送壓縮狀態
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

  // 對象池統一更新
  pPool.updateAndDraw(dt, ctx);

  // 畫面與特效繪製
  ctx.save();
  if (screenShakeTime > 0) {
    screenShakeTime -= dt;
    const offsetX = (Math.random() - 0.5) * screenShakeIntensity;
    const offsetY = (Math.random() - 0.5) * screenShakeIntensity;
    ctx.translate(offsetX, offsetY);
  }

  ctx.drawImage(offscreenCanvas, 0, 0);

  // 速度線 (Speed Lines)
  if (p1?.isXDashing || p2?.isXDashing) {
    ctx.save(); ctx.strokeStyle = 'rgba(0, 210, 211, 0.25)'; ctx.lineWidth = 2;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      ctx.beginPath(); ctx.moveTo(arenaCenter.x + Math.cos(a) * 120, arenaCenter.y + Math.sin(a) * 120); ctx.lineTo(arenaCenter.x + Math.cos(a) * 230, arenaCenter.y + Math.sin(a) * 230); ctx.stroke();
    }
    ctx.restore();
  }

  pPool.updateAndDraw(0, ctx); // 僅補繪製不重複 dt
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
      if (statusBar) statusBar.innerText = `💥⚡ EXTREME FINISH! (3分) ${p2.name} 以極限衝撞將對手淘汰！`;
      updateWinStats(false); matchEnded = true; sfx.stopBGM();
    } else if (d2 > arenaCenter.radius && p1.lastHitWasExtreme) {
      if (statusBar) statusBar.innerText = `💥⚡ EXTREME FINISH! (3分) ${p1.name} 發動極速 X-Dash 取得 3 分！`;
      updateWinStats(true, true); matchEnded = true; sfx.stopBGM();
    } else if (d1 > arenaCenter.radius) {
      if (statusBar) statusBar.innerText = `🚨 OVER FINISH! (2分) ${p2.name} 將對手擊出場外！`;
      updateWinStats(false); matchEnded = true; sfx.stopBGM();
    } else if (d2 > arenaCenter.radius) {
      if (statusBar) statusBar.innerText = `🚨 OVER FINISH! (2分) ${p1.name} 將對手擊出場外！`;
      updateWinStats(true, false); matchEnded = true; sfx.stopBGM();
    } else if (p1.shatterHp <= 0) {
      p1.triggerShatterEffect();
      if (statusBar) statusBar.innerText = `💥 BURST FINISH! (2分) ${p1.name} 承受強烈衝擊崩解！${p2.name} 勝出！`;
      updateWinStats(false); matchEnded = true; sfx.stopBGM();
    } else if (p2.shatterHp <= 0) {
      p2.triggerShatterEffect();
      if (statusBar) statusBar.innerText = `💥 BURST FINISH! (2分) ${p2.name} 承受強烈衝擊崩解！${p1.name} 勝出！`;
      updateWinStats(true, false); matchEnded = true; sfx.stopBGM();
    } else if (p1.rpm <= 0 && p2.rpm <= 0) {
      const isP1Win = p1.rpm > p2.rpm;
      if (statusBar) statusBar.innerText = isP1Win ? `🌀 SPIN FINISH! (1分) ${p1.name} 獲勝！` : `🌀 SPIN FINISH! (1分) ${p2.name} 獲勝！`;
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
