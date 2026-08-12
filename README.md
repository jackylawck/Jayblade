# 🌀 爆上陀螺 Jayblade

**賽場神機 & 左右雙旋物理模擬器**  
**Meta & Dual-Spin Beyblade Physics Simulator**

[繁體中文](#-繁體中文說明) | [English](#-english-description)

---

### 📖 About This Project / 關於本專案

This repository is a non-commercial project created for my son. All friends are welcome to play and enjoy the physics battles together!

本專案是為我的兒子而開發的。這是一個非商業用途的個人專案。誠摯邀請所有朋友一起來玩，一起體驗陀螺的物理對戰樂趣！

---

## 🇭🇰 繁體中文說明

《爆上陀螺 Jayblade》是一款純本地運行的 WebGL/Canvas 2D 剛體力學戰鬥陀螺對戰模擬器。專為追求真實物理力學與競技深度的玩家設計。

### ✨ 核心特色
- 🔬 **第一性原理物理引擎**：採用半隱式歐拉積分（Symplectic Euler）、碰撞穿透位置修正、動態恢復係數與拉格朗日章動/進動方程。
- 🌀 **左右雙旋對戰**：
  - **同旋對撞 (Same Spin)**：相對速度高、衝量強烈，極易觸發爆裂（Burst Finish）與擊飛（Over Finish）。
  - **異旋吸轉 (Spin Steal)**：接觸點切向速度同向，透過金屬環動態摩擦力轉移轉速。
- ⚙️ **Stribeck 動態摩擦力模型**：底軸在高速時產生不規則軌道衝刺，低速時自然過渡至定點抓地與瀕死搖晃。
- 💥 **爆裂與攻擊力系統**：每款撞擊環（Crown）具備獨立爆裂抗性（`burstResist`）與攻擊力（`attackPower`）。
- 📐 **降落角度（Launch Angle）**：支援 0° 垂直直射、15° 斜角衝刺與 30° 極速側攻，直接影響初速度與軌道咬合率（X-Dash）。
- 🌐 **WebRTC P2P 遠端連線**：20Hz 主從式狀態同步與客戶端插值渲染，支援 **6 位數簡短房號** 與雙向 Ready 等候大廳。
- 🔒 **輕量資安防護**：內建 LocalStorage 輕量加解密、塗裝碼 HMAC 數位簽章防偽、XSS 輸入淨化、CSP 內容安全策略與 SRI 腳本校驗。
- 📱 **PWA 跨平台安裝**：支援安裝至 iOS / Android / Desktop 主畫面，離線暢玩。
- 🌐 **雙語一鍵切換**：繁體中文與 English 全介面動態無縫切換。

---

## 🇬🇧 English Description

*Jayblade* is a pure local WebGL/Canvas 2D rigid-body physics simulator for Beyblade battles. Designed for physics enthusiasts and players seeking high-level competitive depth.

### ✨ Key Features
- 🔬 **First-Principles Physics Engine**: Built with Symplectic Euler integration, position correction, dynamic restitution, and decoupled Lagrange nutation/precession kinematics.
- 🌀 **Dual-Spin Mechanics**:
  - **Same-Spin Collision**: High relative speed leading to heavy impulse, high Burst and Over Finish probability.
  - **Spin Steal (Opposite Spin)**：Equalizes angular velocity through dynamic metallic friction force during collisions.
- ⚙️ **Stribeck Dynamic Friction**: Flat tips slide at high speed for rail dashes and gain grip at lower RPM for center stability.
- 💥 **Burst Resistance & Attack Power**: Custom crowns feature individual `burstResist` and `attackPower` parameters.
- 📐 **Launch Angle Dynamics**: Supports 0° Normal, 15° Incline, and 30° Steep launches affecting initial linear velocity and X-Dash rail alignment.
- 🌐 **WebRTC P2P Multiplayer**: Server-authoritative 20Hz state synchronization with client-side interpolation, **6-digit short room IDs**, and double-ready lobby.
- 🔒 **Lightweight Security**: Integrated local storage encryption, HMAC signature verification for share codes, XSS sanitization, CSP headers, and CDN SRI integrity checks.
- 📱 **PWA Support**: Fully installable on iOS, Android, and Desktop with offline capability.
- 🌐 **Bilingual Interface**: One-click dynamic toggle between Traditional Chinese and English.

---

## 🛠️ 專案結構 / Project Structure

```text
Jayblade/
├── index.html              # 主介面與 SEO / PWA Meta
├── style.css               # 響應式 UI 與電競主題樣式
├── manifest.json           # PWA 設定檔與截圖聲明
├── sw.js                   # Service Worker 離線快取
├── JaybladeICON-192.png    # 192x192 PWA 圖示
├── JaybladeICON-512.png    # 512x512 PWA 主圖示
└── js/
    ├── security.js         # 輕量級防篡改與資安防護模組
    ├── parts.js            # 配件資料庫與雙語對照
    ├── engine.js           # 剛體力學物理演算與音效引擎
    └── game.js             # 遊戲主循環、WebRTC 連線與 UI 控制

```

---

## 🚀 本地執行與部署 / Deployment

本專案為無後端（Zero-Backend）純前端應用，可以直接部署至 GitHub Pages：

1. 將檔案推送至你的 GitHub Repository：
```bash
git add .
git commit -m "Deploy Jayblade PWA & Physics Simulator"
git push origin main

```


2. 在 GitHub Repository 的 **Settings -> Pages** 中選擇 `main` 分支並儲存。
3. 數分鐘後即可經由 `https://<your-username>.github.io/<repository-name>/` 開啟應用。

---

## 📄 授權條款 / License

MIT License © 2026

```

```
