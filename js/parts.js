const PARTS_DATABASE = {
  crowns: {
    'dragon_blade': { name: '龍刃衝鋒 (高攻擊重擊)', mass: 40, radius: 28, weightDist: 0.6, restitution: 0.88, color: '#ff3838' },
    'iron_fang':    { name: '鐵牙破壞 (重裝擊飛)', mass: 42, radius: 27, weightDist: 0.5, restitution: 0.92, color: '#eccc68' },
    'aero_shield':  { name: '風輪壁壘 (外重心持久)', mass: 35, radius: 30, weightDist: 0.95, restitution: 0.40, color: '#1e90ff' }
  },
  tips: {
    'dash_flat':    { name: 'Flat-X (極速平頭/衝撞)', shape: 'FLAT', friction: 0.08, moveForce: 270 },
    'needle_point': { name: 'Needle-S (極限針尖/守心)', shape: 'PINPOINT', friction: 0.01, moveForce: 30 }
  }
};

const CPU_DIFFICULTIES = {
  EASY: { name: '簡單', counterStrategy: false, launchPower: 'LIGHT', aiReactionRate: 0.1 },
  MEDIUM: { name: '普通', counterStrategy: true, launchPower: 'MEDIUM', aiReactionRate: 0.4 },
  HARD: { name: '困難 (行為樹 AI)', counterStrategy: true, launchPower: 'HEAVY', aiReactionRate: 0.85 }
};

const ACHIEVEMENTS_DB = {
  FIRST_WIN: { id: 'FIRST_WIN', name: '首勝達人', desc: '贏得 1 場對戰', unlocked: false },
  STREAK_3:  { id: 'STREAK_3',  name: '連勝霸主', desc: '達成 3 連勝', unlocked: false },
  XDASH_KO:  { id: 'XDASH_KO',  name: '極速衝撞', desc: '觸發 X-Dash 擊飛對手出界', unlocked: false }
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
