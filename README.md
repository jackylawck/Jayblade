# 🌀 爆上陀螺 Jayblade

**左右雙旋物理模擬器**  
**Dual-Spin Beyblade Physics Simulator (2D / 3D WebGL)**

[繁體中文](#-繁體中文說明) | [English](#-english-description)

---

### 📖 About This Project / 關於本專案

This repository is a non-commercial project created for my son, Jarvis. All friends are welcome to play and enjoy the physics battles together!

本專案是為我的兒子上桓（Jarvis）而開發的非商業個人專案。誠摯邀請所有朋友一起來玩，共同體驗剛體力學與陀螺對戰的樂趣！

---

## 🇭🇰 繁體中文說明

《爆上陀螺 Jayblade》是一款純本地運行的 WebGL 2D/3D 剛體力學戰鬥陀螺對戰模擬器。專為追求真實物理力學與競技深度的玩家設計。

### ✨ 核心特色
- 🔬 **第一性原理 2D/3D 物理引擎**：採用 Three.js 與 Cannon.js 剛體動力學，整合半隱式歐拉積分、碰撞穿透位置修正、動態恢復係數與拉格朗日章動/進動方程。
- 📊 **實時物理數據監控 (Telemetry)**：實時計算並渲染角速度 $\omega$ (RPM)、線速度 $v$ (m/s)、系統總動能 $KE$ (J) 與動能留存率衰減曲線。
- 🌀 **左右雙旋對戰**：
  - **同旋對撞 (Same Spin)**：相對速度高、衝量強烈，極易觸發爆裂（Burst Finish）與擊飛（Over Finish）。
  - **異旋吸轉 (Spin Steal)**：接觸點切向速度同向，透過金屬環動態摩擦力轉移轉速。
- ⚙️ **Stribeck 動態摩擦力 & Hunt-Crossley 黏彈性接觸**：底軸在高速時產生不規則軌道衝刺（X-Dash），碰撞時具備漸進式非線性緩衝觸感。
- 💥 **配件自訂與爆裂系統**：自由組合撞擊環（Crown）與動力底軸（Tip），具備獨立爆裂抗性（`burstResist`）與質量參數。
- 📐 **中央碗狀盤面坡度 (Bowl Gravity)**：模擬真實戰鬥盤斜面拉回中心對撞，防止初速過快秒離場。
- 🌐 **WebRTC P2P 遠端連線**：20Hz 主從式狀態同步與客戶端插值渲染，支援 **6 位數簡短房號**，傳輸採用 `Float32Array` 二進制封包壓縮（體積削減 >80%）。
- 🔒 **高水平資安全面防護**：內建 CSP (Content Security Policy) 標頭、二進制 Buffer 強型別與邊界校驗、XSS 輸入淨化、塗裝碼 HMAC 防偽簽章與 LocalStorage 加密。
- 📱 **PWA 跨平台安裝**：支援安裝至 iOS / Android / Desktop 主畫面，離線暢玩。
- 🌐 **全介面雙語一鍵切換**：繁體中文與 English 全選單、按鈕與數據面板一鍵動態切換。

---

## 🇬🇧 English Description

*Jayblade* is a pure local WebGL 2D/3D rigid-body physics simulator for Beyblade battles. Designed for physics enthusiasts and players seeking high-level competitive depth.

### ✨ Key Features
- 🔬 **First-Principles 2D/3D Physics Engine**: Built with Three.js & Cannon.js, Symplectic Euler integration, position correction, dynamic restitution, and decoupled Lagrange nutation/precession kinematics.
- 📊 **Real-time Live Telemetry**: Live computation of angular velocity $\omega$ (RPM), linear speed $v$ (m/s), total kinetic energy $KE$ (J), and kinetic energy retention curves.
- 🌀 **Dual-Spin Mechanics**:
  - **Same-Spin Collision**: High relative impulse leading to heavy Burst and Over Finishes.
  - **Spin Steal (Opposite Spin)**: Equalizes angular velocity through dynamic metallic friction force during collisions.
- ⚙️ **Stribeck Dynamic Friction & Hunt-Crossley Contact**: Flat tips slide at high speed for rail dashes (X-Dash), featuring non-linear damping dissipation during impacts.
- 💥 **Custom Parts & Burst Resistance**: Custom Crowns & Tips with individual `burstResist` and mass metrics.
- 📐 **Center Bowl Slope Gravity**: Simulates authentic stadium sloped gravity pulling tops towards the center for extended battles.
- 🌐 **WebRTC P2P Multiplayer**: Server-authoritative 20Hz synchronization using compressed `Float32Array` binary payloads (>80% bandwidth reduction) with 6-digit room IDs.
- 🔒 **Comprehensive Security**: Built-in CSP headers, strict ArrayBuffer binary boundary validations, DOM XSS sanitization, HMAC share code signing, and local storage encryption.
- 📱 **PWA Support**: Fully installable on iOS, Android, and Desktop with offline capability.
- 🌐 **Bilingual Interface**: One-click dynamic toggle between Traditional Chinese and English.

---

## 🛠️ 專案結構 / Project Structure

```text
Jayblade/
├── index.html            # 2D 經典版主頁 & SEO / PWA Meta
├── 3d.html               # 3D 科研級對戰模擬器頁面
├── style.css             # 2D 頁面響應式 UI 與電競主題樣式
├── css/
│   └── 3d.css            # 3D 頁面 UI 樣式表
├── manifest.json         # PWA 設定檔與截圖聲明
├── sw.js                 # Service Worker 離線快取
├── JaybladeICON-192.png  # 192x192 PWA 圖示
├── JaybladeICON-512.png  # 512x512 PWA 主圖示
└── js/
    ├── security.js       # 2D 輕量級防篡改與資安模組
    ├── parts.js          # 配件資料庫與雙語對照
    ├── engine.js         # 2D 剛體力學物理演算與音效引擎
    ├── game.js           # 2D 遊戲主循環、WebRTC 與 UI 控制
    ├── config.js         # 3D 裝置效能動態分級
    ├── audio.js          # 3D Web Audio 音效引擎
    ├── particles.js      # 3D GPU Shader 加速火花系統
    ├── network.js        # 3D WebRTC 二進制數據傳輸 (ArrayBuffer)
    ├── ui.js             # 3D 雙語字典與實時能量曲線 Canvas
    ├── physics.js        # 3D Cannon.js 剛體與 A-F 物理理論
    └── app.js            # 3D 主程式渲染循環與業務整合

```

---

## 🚀 本地執行與部署 / Deployment

本專案為無後端（Zero-Backend）純前端應用，可以直接部署至 GitHub Pages：

1. 將檔案推送至你的 GitHub Repository：

```bash
git add .
git commit -m "Deploy Jayblade PWA & 2D/3D Physics Simulator"
git push origin main

```

2. 在 GitHub Repository 的 **Settings -> Pages** 中選擇 `main` 分支並儲存。
3. 數分鐘後即可經由 `https://<your-username>.github.io/<repository-name>/` 開啟 2D 版，或開啟 `https://<your-username>.github.io/<repository-name>/3d.html` 體驗 3D 版。

---

## 📄 授權條款 / License

MIT License © 2026 Jacky Law (羅子淇)
