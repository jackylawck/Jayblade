const PARTS_DATABASE = {
  crowns: {
    'wizard_arc':   { name: 'UX-03 魔導神杖 (Wizard Arc - 外環慣量/持久天花板)', mass: 37, radius: 29.5, weightDist: 0.98, restitution: 0.45, liftAngle: 0.0, burstResist: 0.85, attackPower: 1.0, color: '#f1c40f' },
    'phoenix_wing': { name: 'BX-23 鳳凰飛翼 (Phoenix Wing - 重量壓制/強烈對撞)', mass: 48, radius: 28.0, weightDist: 0.65, restitution: 0.95, liftAngle: 0.1, burstResist: 0.90, attackPower: 1.8, color: '#e74c3c' },
    'shark_scale':  { name: 'UX-15 鮫鯊狂鱗 (Shark Scale - 低位剷飛/極限爆發)', mass: 39, radius: 27.5, weightDist: 0.55, restitution: 0.90, liftAngle: 0.45, burstResist: 0.70, attackPower: 2.2, color: '#3498db' },
    'dran_buster':  { name: 'UX-17 龍騎士/飛龍 (Dran Buster - 偏心重擊)', mass: 42, radius: 28.5, weightDist: 0.70, restitution: 0.85, liftAngle: 0.2, burstResist: 0.75, attackPower: 1.9, color: '#9b59b6' },
    'knight_shield':{ name: 'BX-04 騎士盾牌 (Knight Shield - 流線防禦)', mass: 41, radius: 29.0, weightDist: 0.85, restitution: 0.50, liftAngle: 0.0, burstResist: 0.95, attackPower: 0.8, color: '#a29bfe' }
  },
  tips: {
    'dash_flat':    { name: 'Flat-F (極速平頭 - 軌道衝撞)', shape: 'FLAT', friction: 0.08, moveForce: 280 },
    'needle_point': { name: 'Needle-N (極限針尖 - 定點守心)', shape: 'PINPOINT', friction: 0.01, moveForce: 30 },
    'ball_defense': { name: 'Ball-B (圓滑滾珠 - 吸震防禦)', shape: 'BALL', friction: 0.03, moveForce: 90 },
    'rush_taper':   { name: 'Taper-T (斜角軸尖 - 傾斜軌道)', shape: 'TAPER', friction: 0.06, moveForce: 220 },
    'orb_high':     { name: 'HighOrb-HO (高位圓軸 - 傾角穩定)', shape: 'ORB', friction: 0.02, moveForce: 60 }
  }
};

const CPU_DIFFICULTIES = {
  EASY: { name: '簡單', counterStrategy: false, launchPower: 'LIGHT', aiReactionRate: 0.1 },
  MEDIUM: { name: '普通', counterStrategy: true, launchPower: 'MEDIUM', aiReactionRate: 0.4 },
  HARD: { name: '困難 (行為樹 AI)', counterStrategy: true, launchPower: 'HEAVY', aiReactionRate: 0.85 }
};

const ACHIEVEMENTS_DB = {
  FIRST_WIN: { id: 'FIRST_WIN', name: '首勝達人 (First Win)', desc: '贏得 1 場對戰', unlocked: false },
  STREAK_3:  { id: 'STREAK_3',  name: '連勝霸主 (3-Win Streak)', desc: '達成 3 連勝', unlocked: false },
  XDASH_KO:  { id: 'XDASH_KO',  name: '極速衝撞 (X-Dash KO)', desc: '觸發 X-Dash 擊飛對手出界', unlocked: false }
};

function generateShareCode(config) {
  try { return btoa(JSON.stringify(config)); } catch (e) { return ''; }
}

function parseShareCode(code) {
  try { return JSON.parse(atob(code)); } catch (e) { return null; }
}

function saveUserPreferences(p1Data, p2Data, grid, diff, engineMode) {
  try { localStorage.setItem('jayblade_pref_pro', JSON.stringify({ p1Data, p2Data, grid, diff, engineMode })); } catch (e) {}
}

function loadUserPreferences() {
  try {
    const saved = localStorage.getItem('jayblade_pref_pro');
    return saved ? JSON.parse(saved) : null;
  } catch (e) { return null; }
}
