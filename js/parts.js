// 配件資料庫 (去型號與名稱化，僅保留物理特性與雙語對照)
const PARTS_DATABASE = {
  crowns: {
    'wizard_arc':   { name_zh: '外環慣量 / 持久天花板', name_en: 'Outer Inertia / Top Endurance', mass: 37, radius: 29.5, weightDist: 0.98, restitution: 0.45, liftAngle: 0.0, burstResist: 0.85, attackPower: 1.0, color: '#f1c40f' },
    'phoenix_wing': { name_zh: '重量壓制 / 強烈對撞', name_en: 'Heavy Mass / High Impact', mass: 48, radius: 28.0, weightDist: 0.65, restitution: 0.95, liftAngle: 0.1, burstResist: 0.90, attackPower: 1.8, color: '#e74c3c' },
    'shark_scale':  { name_zh: '低位剷飛 / 極限爆發', name_en: 'Low Upper-Lift / Burst Rush', mass: 39, radius: 27.5, weightDist: 0.55, restitution: 0.90, liftAngle: 0.45, burstResist: 0.70, attackPower: 2.2, color: '#3498db' },
    'dran_buster':  { name_zh: '偏心重擊 / 爆發衝撞', name_en: 'Off-Center Heavy / Sudden Dash', mass: 42, radius: 28.5, weightDist: 0.70, restitution: 0.85, liftAngle: 0.2, burstResist: 0.75, attackPower: 1.9, color: '#9b59b6' },
    'knight_shield':{ name_zh: '流線防禦 / 減震護盾', name_en: 'Aero Defense / Impact Shield', mass: 41, radius: 29.0, weightDist: 0.85, restitution: 0.50, liftAngle: 0.0, burstResist: 0.95, attackPower: 0.8, color: '#a29bfe' }
  },
  tips: {
    'dash_flat':    { name_zh: '極速平頭 - 軌道衝撞', name_en: 'Flat Drive - Extreme Rail Dash', shape: 'FLAT', friction: 0.08, moveForce: 280 },
    'needle_point': { name_zh: '極限針尖 - 定點守心', name_en: 'Needle Tip - Pinpoint Center Defense', shape: 'PINPOINT', friction: 0.01, moveForce: 30 },
    'ball_defense': { name_zh: '圓滑滾珠 - 吸震防禦', name_en: 'Ball Tip - Smooth Impact Defense', shape: 'BALL', friction: 0.03, moveForce: 90 },
    'rush_taper':   { name_zh: '斜角軸尖 - 傾斜軌道', name_en: 'Taper Drive - Angled Rail Attack', shape: 'TAPER', friction: 0.06, moveForce: 220 },
    'orb_high':     { name_zh: '高位圓軸 - 傾角穩定', name_en: 'High-Orb Tip - Angled Balance Guard', shape: 'ORB', friction: 0.02, moveForce: 60 }
  }
};

const CPU_DIFFICULTIES = {
  EASY: { name_zh: '簡單', name_en: 'Easy', counterStrategy: false, launchPower: 'LIGHT', aiReactionRate: 0.1 },
  MEDIUM: { name_zh: '普通', name_en: 'Medium', counterStrategy: true, launchPower: 'MEDIUM', aiReactionRate: 0.4 },
  HARD: { name_zh: '困難 (行為樹 AI)', name_en: 'Hard (Behavior Tree AI)', counterStrategy: true, launchPower: 'HEAVY', aiReactionRate: 0.85 }
};

const ACHIEVEMENTS_DB = {
  FIRST_WIN: { id: 'FIRST_WIN', name_zh: '首勝達人', name_en: 'First Win Master', desc_zh: '贏得 1 場對戰', desc_en: 'Win 1 match', unlocked: false },
  STREAK_3:  { id: 'STREAK_3',  name_zh: '連勝霸主', name_en: '3-Match Streak Champion', desc_zh: '達成 3 連勝', desc_en: 'Win 3 matches in a row', unlocked: false },
  XDASH_KO:  { id: 'XDASH_KO',  name_zh: '極速衝撞', name_en: 'Extreme Dash KO', desc_zh: '觸發 X-Dash 擊飛對手出界', desc_en: 'Trigger X-Dash to knock out opponent', unlocked: false }
};

// 取得單一語言的名稱工具函式
function getLocalizedPartName(category, key, lang = 'ZH') {
  const item = PARTS_DATABASE[category]?.[key];
  if (!item) return '';
  return lang === 'EN' ? item.name_en : item.name_zh;
}

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
