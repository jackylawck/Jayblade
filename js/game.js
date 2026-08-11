let gameMode = 'SINGLE';
let selectedGrid = 8;
let animationId = null;
let p1, p2;
let particles = [];
let matchEnded = false;

// 離屏 Canvas 設定
const canvas = document.getElementById('arena');
const ctx = canvas.getContext('2d');
const offscreenCanvas = document.createElement('canvas');
const offCtx = offscreenCanvas.getContext('2d');

const CANVAS_SIZE = 500;
const arenaCenter = { x: 250, y: 250, radius: 230 };

// 離屏靜態背景繪製
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

// 戰績相關 functions
function getStats() {
  const stats = localStorage.getItem('beyblade_j_stats');
  return stats ? JSON.parse(stats) : { matches: 0, wins: 0 };
}

function updateWinStats(isP1Win) {
  const stats = getStats();
  stats.matches += 1;
  if (isP1Win) stats.wins += 1;
  localStorage.setItem('beyblade_j_stats', JSON.stringify(stats));
  displayStatsUI();
}

function displayStatsUI() {
  const stats = getStats();
  const winRate = stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0;
  const statsEl = document.getElementById('stats-display');
  if (statsEl) {
    statsEl.innerText = `🏆 Jarvis 戰績：總對戰 ${stats.matches} 場 | 勝率 ${winRate}% (${stats.wins} 勝)`;
  }
}

// 頁面加載初始化
window.onload = () => {
  initOffscreenBackground();
  setupRetinaCanvas();

  const crownSelect = document.getElementById('p1-crown');
  const tipSelect = document.getElementById('p1-tip');

  Object.keys(PARTS_DATABASE.crowns).forEach(key => {
    crownSelect.innerHTML += `<option value="${key}">${PARTS_DATABASE.crowns[key].name}</option>`;
  });
  Object.keys(PARTS_DATABASE.tips).forEach(key => {
    tipSelect.innerHTML += `<option value="${key}">${PARTS_DATABASE.tips[key].name}</option>`;
  });

  const pref = loadUserPreferences();
  if (pref) {
    crownSelect.value = pref.crown;
    tipSelect.value = pref.tip;
    document.getElementById('p1-power').value = pref.power;
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
  alert(mode === 'SINGLE' ? '模式：單人對戰 (VS CPU)' : '模式：雙人對決 (1P VS 2P)');
}

function generateCpuTactics(p1Config, p1GridIndex) {
  let cpuCrown = 'iron_fang';
  let cpuTip = 'dash_flat';
  let cpuPower = 'HEAVY';
  let cpuGrid = 11;

  if (p1Config.tip === 'needle_point') {
    cpuCrown = 'iron_fang';
    cpuTip = 'dash_flat';
    cpuPower = 'HEAVY';
    cpuGrid = 18;
  } else {
    cpuCrown = 'aero_shield';
    cpuTip = 'needle_point';
    cpuPower = 'MEDIUM';
    cpuGrid = 10;
  }

  return { crown: cpuCrown, tip: cpuTip, power: cpuPower, grid: cpuGrid };
}

function startGame() {
  sfx.init();

  const crownKey = document.getElementById('p1-crown').value;
  const tipKey = document.getElementById('p1-tip').value;
  const power = document.getElementById('p1-power').value;

  saveUserPreferences(crownKey, tipKey, power, selectedGrid);

  document.getElementById('setup-panel').style.display = 'none';
  document.getElementById('game-panel').style.display = 'block';

  const col = (selectedGrid - 1) % 6;
  const row = Math.floor((selectedGrid - 1) / 6);
  const p1X = 100 + col * 60;
  const p1Y = 100 + row * 80;

  p1 = new PhysicalTop(p1X, p1Y, crownKey, tipKey, power, 'Jarvis (P1)', false);

  if (gameMode === 'SINGLE') {
    const cpuSetup = generateCpuTactics({ crown: crownKey, tip: tipKey }, selectedGrid);
    const cpuCol = (cpuSetup.grid - 1) % 6;
    const cpuRow = Math.floor((cpuSetup.grid - 1) / 6);
    const cpuX = 100 + cpuCol * 60;
    const cpuY = 100 + cpuRow * 80;

    p2 = new PhysicalTop(cpuX, cpuY, cpuSetup.crown, cpuSetup.tip, cpuSetup.power, 'CPU 敵方', true);
  } else {
    p2 = new PhysicalTop(350, 250, 'aero_shield', 'needle_point', 'MEDIUM', 'P2 挑戰者', false);
  }

  particles = [];
  matchEnded = false;
  displayStatsUI();

  lastTime = performance.now();
  animationId = requestAnimationFrame(mainGameLoop);
}

let lastTime = 0;
let frameCount = 0, lastFpsUpdate = 0;

function mainGameLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  frameCount++;
  if (now - lastFpsUpdate > 1000) {
    document.getElementById('fps-counter').innerText = `FPS: ${frameCount}`;
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

  const statusBar = document.getElementById('status-bar');
  const d1 = Math.hypot(p1.x - arenaCenter.x, p1.y - arenaCenter.y);
  const d2 = Math.hypot(p2.x - arenaCenter.x, p2.y - arenaCenter.y);

  if (!matchEnded) {
    if (p1.shatterHp <= 0) {
      p1.triggerShatterEffect(particles);
      statusBar.innerText = `💥 ${p1.name} 傾倒失衡！${p2.name} 勝出！`;
      updateWinStats(false);
      matchEnded = true;
    } else if (p2.shatterHp <= 0) {
      p2.triggerShatterEffect(particles);
      statusBar.innerText = `💥 ${p2.name} 傾倒失衡！${p1.name} 勝出！`;
      updateWinStats(true);
      matchEnded = true;
    } else if (d1 > arenaCenter.radius) {
      statusBar.innerText = `🚨 Over Finish! ${p2.name} 擊出場外勝出！`;
      updateWinStats(false);
      matchEnded = true;
    } else if (d2 > arenaCenter.radius) {
      statusBar.innerText = `🚨 Over Finish! ${p1.name} 擊出場外勝出！`;
      updateWinStats(true);
      matchEnded = true;
    } else if (p1.rpm <= 0 && p2.rpm <= 0) {
      const isP1Win = p1.rpm > p2.rpm;
      statusBar.innerText = isP1Win ? `🌀 Spin Finish! ${p1.name} 持久勝出！` : `🌀 Spin Finish! ${p2.name} 持久勝出！`;
      updateWinStats(isP1Win);
      matchEnded = true;
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
  document.getElementById('setup-panel').style.display = 'block';
  document.getElementById('game-panel').style.display = 'none';
}
