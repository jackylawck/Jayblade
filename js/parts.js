// 配件資料庫 (物理參數與名稱)
const PARTS_DATABASE = {
  crowns: {
    'jarvis_dragon': { name: '上桓飛龍 (Jarvis Special)', mass: 36, radius: 28, weightDist: 0.8, restitution: 0.75, color: '#ff3838' },
    'iron_fang':     { name: '鐵牙衝鋒 (高攻擊重擊)', mass: 40, radius: 27, weightDist: 0.5, restitution: 0.90, color: '#eccc68' },
    'aero_shield':   { name: '風輪壁壘 (外重心持久)', mass: 34, radius: 30, weightDist: 0.95, restitution: 0.40, color: '#1e90ff' }
  },
  tips: {
    'dash_flat':    { name: 'Flat-X (極速平頭/衝撞)', shape: 'FLAT', friction: 0.08, moveForce: 260 },
    'needle_point': { name: 'Needle-S (極限針尖/守心)', shape: 'PINPOINT', friction: 0.01, moveForce: 30 }
  }
};

// LocalStorage 紀錄偏好設定
function saveUserPreferences(crown, tip, power, grid) {
  localStorage.setItem('beyblade_j_pref', JSON.stringify({ crown, tip, power, grid }));
}

function loadUserPreferences() {
  const saved = localStorage.getItem('beyblade_j_pref');
  return saved ? JSON.parse(saved) : null;
}
