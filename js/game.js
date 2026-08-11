let gameMode = 'SINGLE';
let selectedGrid = 8;
let animationId = null;
let p1, p2;
let particles = [];
let matchEnded = false;
let isDebugVisible = false;

const canvas = document.getElementById('arena');
const ctx = canvas.getContext('2d');
const offscreenCanvas = document.createElement('canvas');
const offCtx = offscreenCanvas.getContext('2d');

const CANVAS_SIZE = 500;
const arenaCenter = { x: 250, y: 250, radius: 230 };

function initOffscreenBackground() {
  offscreenCanvas.width = CANVAS_SIZE;
  offscreenCanvas.height = CANVAS_SIZE;

  offCtx.fillStyle = '#0a0a0f';
  offCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  offCtx.beginPath();
  offCtx.arc(arenaCenter.x, arenaCenter.y, arenaCenter.radius, 0, Math.PI * 2);
  offCtx.fillStyle = '#1e1e2f';
  offCtx.fill();
  offCtx.strokeStyle = '#ffcc00';
  offCtx.lineWidth = 6;
  offCtx.stroke();

  offCtx.beginPath();
  offCtx.arc(arenaCenter.x, arenaCenter.y, arenaCenter.radius - 15, 0, Math.PI * 2);
  offCtx.strokeStyle = '#ff3366';
  offCtx.lineWidth = 3;
  offCtx.stroke();
}

function setupRetinaCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = CANVAS_SIZE * dpr;
  canvas.height = CANVAS_SIZE * dpr;
  ctx.scale(dpr, dpr);
}

// 數據與成就管理
function getStats() {
  const stats = localStorage.getItem('jayblade_stats');
  return stats ? JSON.parse(stats) : { matches: 0, wins: 0, streak: 0 };
}

function getAchievements() {
  const ach = localStorage.getItem('jayblade_achievements');
  return ach ? JSON.parse(ach) : ACHIEVEMENTS_DB;
}

function unlockAchievement(achId) {
  const ach = getAchievements();
  if (ach[achId] && !ach[achId].unlocked) {
    ach[achId].unlocked = true;
    localStorage.setItem('jayblade_achievements', JSON.stringify(ach));
    alert(`🎉 解鎖成就：【${ach[achId].name}】 - ${ach[achId].desc}`);
  }
}

function updateWinStats(isP1Win, isXDashKO = false) {
  const stats = getStats();
  stats.matches += 1;
  if (isP1Win) {
    stats.wins += 1;
    stats.streak += 1;
    unlockAchievement('FIRST_WIN');
    if (stats.streak >= 3) unlockAchievement('STREAK_3');
    if (isXDashKO) unlockAchievement('XDASH_KO');
  } else {
    stats.streak = 0;
  }
  localStorage.setItem('jayblade_stats', JSON.stringify(stats));
  displayStatsUI();
}

function displayStatsUI() {
  const stats = getStats();
  const ach = getAchievements();
  const winRate = stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0;
  const unlockedCount = Object.keys(ach).filter(k => ach[k].unlocked).length;

  const statsEl = document.getElementById('stats-display');
  const achEl = document.getElementById('achieve-display');

  if (statsEl) {
    statsEl.innerText = `🏆 對戰戰績：總對戰 ${stats.matches} 場 | 勝率 ${winRate}% (${stats.wins} 勝) | 連勝: ${stats.streak}`;
  }
  if (achEl) {
    achEl.innerText = `🎖️ 榮譽成就：已解鎖 ${unlockedCount} / ${Object.keys(ach).length}`;
  }
}

function toggleDebugPanel() {
  isDebugVisible = !isDebugVisible;
  document.getElementById('debug-panel').style.display = isDebugVisible ? 'block' : 'none';
}

function toggleBGM() {
  const active = sfx.toggleBGM();
  alert(active ? '🎵 BGM 已開啟' : '🔇 BGM 已關閉');
}

window.onload = () => {
  initOffscreenBackground();
  setupRetinaCanvas();

  // 初始化 P1 & P2 下拉選單
  ['p1', 'p2'].forEach(prefix => {
    const crownSel = document.getElementById(`${prefix}-crown`);
    const tipSel = document.getElementById(`${prefix}-tip`);
    
    Object.keys(PARTS_DATABASE.crowns).forEach(key => {
      crownSel.innerHTML += `<option value="${key}">${PARTS_DATABASE.crowns[key].name}</option>`;
    });
    Object.keys(PARTS_DATABASE.tips).forEach(key => {
      tipSel.innerHTML += `<option value="${key}">${PARTS_DATABASE.tips[key].name}</option>`;
    });
  });

  const pref = loadUserPreferences();
  if (pref) {
    if (pref.p1Data) {
      document.getElementById('p1-name').value = pref.p1Data.name;
      document.getElementById('p1-color').value = pref.p1Data.color;
      document.getElementById('p1-crown').value = pref.p1Data.crown;
      document.getElementById('p1-tip').value = pref.p1Data.tip;
      document.getElementById('p1-power').value = pref.p1Data.power;
    }
    if (pref.p2Data) {
      document.getElementById('p2-name').value = pref.p2Data.name;
      document.getElementById('p2-color').value = pref.p2Data.color;
      document.getElementById('p2-crown').value = pref.p2Data.crown;
      document.getElementById('p2-tip').value = pref.p2Data.tip;
      document.getElementById('p2-power').value = pref.p2Data.power;
    }
    document.getElementById('cpu-difficulty').value = pref.diff || 'MEDIUM';
    selectedGrid = pref.grid;
  }

  const gridContainer = document.getElementById('grid-selector');
  for (let i = 1; i <= 18; i++) {
    const item = document.createElement('div');
    item.className = `grid-item ${i === selectedGrid ? 'selected' : ''}`;
    item.innerText = i;
    item.onclick = () => {
      document.querySelectorAll('.grid-item').forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
      selectedGrid = i;
    };
    gridContainer.appendChild(item);
  }
};

window.addEventListener('click', () => sfx.init(), { once: true });
window.addEventListener('touchstart', () => sfx.init(), { once: true });

function setGameMode(mode) {
  gameMode = mode;
  document.getElementById('cpu-difficulty-group').style.display = mode === 'SINGLE' ? 'block' : 'none';
  document.getElementById('p2-setup-group').style.display = mode === 'VERSUS' ? 'block' : 'none';
  alert(mode === 'SINGLE' ? '模式：單人對戰 (VS CPU)' : '模式：雙人對決 (1P VS 2P)');
}

function generateCpuTactics(p1Config, difficultyKey) {
  const diff = CPU_DIFFICULTIES[difficultyKey] || CPU_DIFFICULTIES.MEDIUM;
  
  let cpuCrown = 'iron_fang';
  let cpuTip = 'dash_flat';
  let cpuPower = diff.launchPower;
  let cpuGrid = 11;

  if (diff.counterStrategy && p1Config.tip === 'needle_point') {
    cpuCrown = 'iron_fang';
    cpuTip = 'dash_flat';
    cpuGrid = 18;
  } else {
    cpuCrown = 'aero_shield';
    cpuTip = 'needle_point';
    cpuGrid = 10;
  }

  return { crown: cpuCrown, tip: cpuTip, power: cpuPower, grid: cpuGrid, aiRate: diff.aiReactionRate };
}

function playLaunchSequence(onComplete) {
  let count = 3;
  const statusBar = document.getElementById('status-bar');
  
  const timer = setInterval(() => {
    if (count > 0) {
      statusBar.innerText = `READY... ${count}`;
      sfx.playCountBeep(false);
      count--;
    } else {
      statusBar.innerText = `3, 2, 1... Go Shoot!`;
      sfx.playCountBeep(true);
      clearInterval(timer);
      setTimeout(onComplete, 200);
    }
  }, 600);
}

function startGame() {
  sfx.init();

  const p1Data = {
    name: document.getElementById('p1-name').value,
    color: document.getElementById('p1-color').value,
    crown: document.getElementById('p1-crown').value,
    tip: document.getElementById('p1-tip').value,
    power: document.getElementById('p1-power').value
  };

  const p2Data = {
    name: document.getElementById('p2-name').value,
    color: document.getElementById('p2-color').value,
    crown: document.getElementById('p2-crown').value,
    tip: document.getElementById('p2-tip').value,
    power: document.getElementById('p2-power').value
  };

  const diffKey = document.getElementById('cpu-difficulty').value;

  saveUserPreferences(p1Data, p2Data, selectedGrid, diffKey);

  document.getElementById('setup-panel').style.display = 'none';
  document.getElementById('game-panel').style.display = 'block';

  playLaunchSequence(() => {
    const col = (selectedGrid - 1) % 6;
    const row = Math.floor((selectedGrid - 1) / 6);
    const p1X = 100 + col * 60;
    const p1Y = 100 + row * 80;

    p1 = new PhysicalTop(p1X, p1Y, p1Data.crown, p1Data.tip, p1Data.power, p1Data.name, p1Data.color, false);

    if (gameMode === 'SINGLE') {
      const cpuSetup = generateCpuTactics(p1Data, diffKey);
      const cpuCol = (cpuSetup.grid - 1) % 6;
      const cpuRow = Math.floor((cpuSetup.grid - 1) / 6);
      const cpuX = 100 + cpuCol * 60;
      const cpuY = 100 + cpuRow * 80;

      p2 = new PhysicalTop(cpuX, cpuY, cpuSetup.crown, cpuSetup.tip, cpuSetup.power, `CPU (${CPU_DIFFICULTIES[diffKey].name})`, null, true, cpuSetup.aiRate);
    } else {
      p2 = new PhysicalTop(350, 250, p2Data.crown, p2Data.tip, p2Data.power, p2Data.name, p2Data.color, false);
    }

    particles = [];
    matchEnded = false;
    displayStatsUI();

    lastTime = performance.now();
    animationId = requestAnimationFrame(mainGameLoop);
  });
}

let lastTime = 0;
let frameCount = 0, lastFpsUpdate = 0;

function mainGameLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  frameCount++;
  if (now - lastFpsUpdate > 1000) {
    document.getElementById('fps-counter').innerText = frameCount;
    frameCount = 0;
    lastFpsUpdate = now;
  }

  p1.update(dt, arenaCenter, particles, p2);
  p2.update(dt, arenaCenter, particles, p1);

  [p1, p2].forEach(top => {
    top.vx += (arenaCenter.x - top.x) * 0.25 * dt;
    top.vy += (arenaCenter.y - top.y) * 0.25 * dt;
  });

  resolveAdvancedCollision(p1, p2, particles);

  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update(dt);
    if (particles[i].life <= 0) particles.splice(i, 1);
  }

  ctx.drawImage(offscreenCanvas, 0, 0);
  particles.forEach(p => p.draw(ctx));
  p1.draw(ctx);
  p2.draw(ctx);

  // 更新 Debug 面板內容
  if (isDebugVisible) {
    document.getElementById('p1-debug').innerHTML = p1.getDebugData();
    document.getElementById('p2-debug').innerHTML = p2.getDebugData();
  }

  const statusBar = document.getElementById('status-bar');
  const d1 = Math.hypot(p1.x - arenaCenter.x, p1.y - arenaCenter.y);
  const d2 = Math.hypot(p2.x - arenaCenter.x, p2.y - arenaCenter.y);

  if (!matchEnded) {
    if (p1.shatterHp <= 0) {
      p1.triggerShatterEffect(particles);
      statusBar.innerText = `💥 ${p1.name} 傾倒失衡！${p2.name} 勝出！`;
      updateWinStats(false);
      matchEnded = true;
      sfx.stopBGM();
    } else if (p2.shatterHp <= 0) {
      p2.triggerShatterEffect(particles);
      statusBar.innerText = `💥 ${p2.name} 傾倒失衡！${p1.name} 勝出！`;
      updateWinStats(true, p1.hasTriggeredXDashKO);
      matchEnded = true;
      sfx.stopBGM();
    } else if (d1 > arenaCenter.radius) {
      statusBar.innerText = `🚨 Over Finish! ${p2.name} 擊出場外勝出！`;
      updateWinStats(false);
      matchEnded = true;
      sfx.stopBGM();
    } else if (d2 > arenaCenter.radius) {
      statusBar.innerText = `🚨 Over Finish! ${p1.name} 擊出場外勝出！`;
      updateWinStats(true, p1.hasTriggeredXDashKO);
      matchEnded = true;
      sfx.stopBGM();
    } else if (p1.rpm <= 0 && p2.rpm <= 0) {
      const isP1Win = p1.rpm > p2.rpm;
      statusBar.innerText = isP1Win ? `🌀 Spin Finish! ${p1.name} 持久勝出！` : `🌀 Spin Finish! ${p2.name} 持久勝出！`;
      updateWinStats(isP1Win, false);
      matchEnded = true;
      sfx.stopBGM();
    } else {
      statusBar.innerText = `${p1.name}: ${Math.round(p1.rpm)} RPM | ${p2.name}: ${Math.round(p2.rpm)} RPM`;
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
