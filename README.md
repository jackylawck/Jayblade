# 🌀 爆上陀螺 Jayblade

**3D 剛體力學戰鬥陀螺模擬器**  
**HD 3D Rigid-Body Beyblade Physics Simulator (WebGL / WebRTC)**

[繁體中文](#-繁體中文說明) | [English](#-english-description)

---

### 📖 About This Project / 關於本專案

This repository is a non-commercial project created for my son. All friends are welcome to play and enjoy the physics battles together!

本專案是為我的兒子而開發的非商業個人專案。誠摯邀請所有朋友一起來玩，共同體驗剛體力學與陀螺對戰的樂趣！

---

## 繁體中文說明

《爆上陀螺 Jayblade 3D》是一款純本地運行的 WebGL 高清 3D 剛體力學戰鬥陀螺模擬器。以 `index.html` 作為 3D 主戰場，專為追求真實物理力學、16款 Combo 戰術組合與競技深度的玩家設計。

### ✨ 核心特色
- 🔬 **第一性原理 3D 剛體物理引擎**：採用 Three.js 與 Cannon.js，整合 240Hz 高頻子步（Sub-stepping）防穿透演算、動態流體空氣阻力（$F_{\text{drag}}$）、真實動態陰影與倒地磨地快速煞停機制。
- ⚔️ **16 款戰術 Combo 組合**：收錄 **8 款撞擊環（Blade）**（羽翼飛刃、朱雀翼刃、死神鐮刀、犀牛角盾等）與 **8 款動力底軸（Bit）**（極速平頭、持久球軸、防禦針軸、橡膠平軸等），完美呈現質量、轉動慣量與摩擦係數差異。
- 🎮 **多元對戰模式**：支援單人對戰 (VS AI)、1P vs 2P 同機對戰、**WebRTC P2P 遠端連線對決**，以及 4 人障礙大亂鬥。
- 🔬 **4 大維度物理張量面板 (Telemetry)**：
  - **剛體角動量與轉矩**：角速度 $\omega$ (RPM)、角動量向量 $\mathbf{L}$、衝量 $J$ ($N\cdot s$)。
  - **能量解析系統**：系統總動能 $E_k$ ($J$)、轉動動能 $E_{\text{rot}}$、平動動能 $E_{\text{trans}}$。
  - **陀螺儀姿態與進動**：3D 姿態傾斜角 $\theta$、進動頻率 $f_{\text{precession}}$ ($Hz$)。
  - **接觸面與外力場**：法向支持力 $N$、切向滑動摩擦力 $F_f$、盤面向心拉力 $F_c$。
- 🌀 **雙旋與對撞機制**：
  - **同旋爆撞 (Same Spin)**：高相對速度與反衝衝量 (Recoil Impulse)，實時扣減爆裂血量（HP）至 0 觸發 **💥 Burst Finish**。
  - **異旋吸轉 (Spin Steal)**：接觸點動態摩擦力轉移轉速。
- 📦 **UGC 3D 模型慣量測試**：支援拖拽上傳 3D 打印檔 (.stl)，自動進行檔案頭簽名檢查並演算轉動慣量張量（Inertia Tensor）。
- 🌐 **WebRTC P2P 遠端連線對戰**：採用 **7 位數純數字房間 ID**，主機端廣播剛體姿態，客戶端實作姿態平滑插值 (Lerp/Slerp)，實現跨裝置遠端連線。
- 🌐 **100% 全介面雙語動態切換**：支援 **繁體中文** 與 **English** 一鍵切換，包含所有 UI 標籤、對戰 Banner、下拉選項與科研物理面板。
- 📱 **手機端極致體驗 (Mobile UX & PWA)**：預設 3, 2, 1, GO! 發射動畫、發射後自動隱藏 UI，支援 PWA 安裝至 iOS / Android 主畫面離線暢玩。

---

## English Description

*Jayblade 3D* is a local WebGL HD 3D rigid-body physics simulator for Beyblade battles. Featuring `index.html` as the main 3D arena, it is built for physics enthusiasts and players seeking strategic Combo customization and competitive depth.

### ✨ Key Features
- 🔬 **First-Principles 3D Physics Engine**: Powered by Three.js & Cannon.js, 240Hz sub-stepping collision detection, fluid aerodynamic drag ($F_{\text{drag}}$), dynamic soft shadows, and tilt-friction stopping dynamics.
- ⚔️ **16 Tactical Combo Parts**: Includes **8 Blades** (Feather Blade, Phoenix Wing, Scythe Incendio, Rhino Horn, etc.) and **8 Bit Tips** (Flat Speed, Ball Bearing, Rubber Recoil, Hexa Shield, etc.) with realistic mass, inertia, and friction coefficients.
- 🎮 **Multiple Battle Modes**: Single-Player VS AI, 1P vs 2P Local Battle, **WebRTC P2P Remote Online Battle**, and 4-Player Battle Royale.
- 🔬 **4-Dimension Telemetry Panel**:
  - **Angular Dynamics**: Angular velocity $\omega$ (RPM), angular momentum vector $\mathbf{L}$, impact impulse $J$ ($N\cdot s$).
  - **Energy System**: Total kinetic energy $E_k$ ($J$), rotational energy $E_{\text{rot}}$, translational energy $E_{\text{trans}}$.
  - **Gyroscopic Kinematics**: 3D tilt angle $\theta$, precession frequency $f_{\text{precession}}$ ($Hz$).
  - **Surface Dynamics**: Normal force $N$, friction force $F_f$, centripetal pull $F_c$.
- 🌀 **Dual-Spin & Clash Mechanics**:
  - **Same-Spin Recoil**: High relative impulse reducing Burst Health (HP) down to 0 for **💥 Burst Finishes**.
  - **Spin Steal**: Angular velocity transfer via metallic contact friction.
- 📦 **UGC 3D STL Model Inertia Testing**: Drag & drop custom 3D printing files (.stl) with header validation and automated Inertia Tensor calculation.
- 🌐 **WebRTC P2P Remote Match**: Simplified **7-digit numeric Room ID**, host-authoritative physics broadcasting with client-side linear interpolation (Lerp/Slerp).
- 🌐 **100% Bilingual Interface**: One-click toggle between **Traditional Chinese** and **English** for all labels, drop-downs, banners, and telemetry Data.
- 📱 **Mobile UX & PWA**: Features "3, 2, 1, GO!" countdown, mobile auto-hiding UI overlay, and PWA installation for offline play on iOS and Android.

---

## 🛠️ 專案結構 / Project Structure

```text
Jayblade/
├── index.html          # 3D 高清主模擬器頁面 (VS AI / 1P vs 2P / WebRTC / 4人亂鬥)
├── 2d.html             # 2D 經典省電版頁面
├── manifest.json       # PWA 設定檔與圖示聲明
├── sw.js               # Service Worker 離線快取與離線支援
├── JaybladeICON-192.png # 192x192 PWA 圖示
├── JaybladeICON-512.png # 512x512 PWA 主圖示
└── js/
    ├── engine3d.js     # 3D Cannon.js / Three.js 剛體力學引擎、16款 Combo 屬性與碰撞
    └── game3d.js       # 3D 遊戲主循環、WebRTC P2P (7位數房號)、雙語字典與 Telemetry 渲染

```

---

## 🚀 本地執行與部署 / Deployment

本專案為無後端（Zero-Backend）純前端應用，可直接部署至 GitHub Pages：

1. 推送更新至 GitHub Repository：

```bash
git add .
git commit -m "Docs: Update README to focus on 3D simulator, 16 Combo parts, WebRTC 7-digit ID, and physics tensors"
git push origin main

```

2. 開啟 GitHub Repository **Settings -> Pages**，選擇 `main` 分支並儲存。
3. 部署完成後，即可經由 `https://<your-username>.github.io/<repository-name>/` 體驗全新的 **Jayblade 3D 主戰場**（或存取 `2d.html` 進入 2D 經典版）。

---

## 📄 授權條款 / License

MIT License © 2026 Jacky Law (羅子淇)
