# 🌀 爆上陀螺 Jayblade 3D

**科研級 3D 剛體力學戰鬥陀螺模擬器 & 選手戰術訓練系統**  
**Research-Grade HD 3D Rigid-Body Beyblade Simulator & Esports Tactical Training System**

[繁體中文](#-繁體中文說明) | [English](#-english-description)

---

### 📖 About This Project / 關於本專案

This repository is an open-source, non-commercial STEM & physics visualization project built for my son. All physics enthusiasts, developers, and bladers are welcome to play, benchmark, and analyze rigid-body dynamics together!

本專案是為我的兒子而開發的開源非商業 STEM 與剛體力學教育專案。誠摯邀請所有物理愛好者、開發者與玩家共同體驗剛體動力學、張量演算與實戰對決的樂趣！

---

## 繁體中文說明

《爆上陀螺 Jayblade 3D》是一款純本地運行的 WebGL 高清 3D 剛體力學戰鬥陀螺模擬器與選手訓練系統。以 `index.html` 作為 3D 主戰場，專為追求第一性原理物理力學、16款 Combo 戰術組合與電競複盤深度的玩家設計。

### ✨ 核心物理與電競亮點
- 🔬 **第一性原理科研級剛體物理引擎**：
  - **Euler 陀螺力矩顯式求解**：即時演算 $\boldsymbol{\tau}_{\text{gyro}} = -(\boldsymbol{\omega} \times \mathbf{I}\boldsymbol{\omega})$，重現高速迴轉下的章動與進動耦合。
  - **無近似 Lagrange 進動二次求解器**：以精確二次多項式 $(I_{xx}-I_{yy})\cos\theta \Omega_p^2 + I_{yy}\omega_s \Omega_p - mgh = 0$ 求解慢進動根，打破小角度線性近似。
  - **動態張量相似變換**：每幀執行 $\mathbf{I}_{\text{world}} = \mathbf{R} \mathbf{I}_{\text{body}} \mathbf{R}^T$ 矩陣變換，精準適配大傾角姿態。
  - **連續碰撞偵測 (Swept-Sphere CCD)**：防止 240Hz 高頻子步下的高速穿透。
  - **真實抗秒殺傷害解算**：導入傷害冷卻保護機制，使單局對決維持在 **20～45 秒** 的真實持久拉扯。
- ⚔️ **16 款戰術 Combo 組合**：收錄 **8 款撞擊環（Blade）**（羽翼飛刃、朱雀翼刃、死神鐮刀、犀牛角盾等）與 **8 款動力底軸（Bit）**（極速平頭、持久球軸、防禦針軸、橡膠平軸等），完整模擬質量、6分量轉動慣量張量與材料摩擦係數差異。
- 🎮 **多元對戰模式**：支援單人對戰 (VS AI)、1P vs 2P 同機對戰、**WebRTC P2P 遠端連線對決**，以及 4 人障礙大亂鬥。
- 📳 **電競級操作手感與階梯觸覺回饋**：
  - **長按蓄力發射**：按住發射鍵蓄力（7,000～14,000 RPM），手指能感受三段式階梯震動阻尼，鬆手瞬間觸發 120ms 強烈「彈射爆發感」。
  - **Client 端本地物理預測 (Dead Reckoning)**：客戶端維持 240Hz 本地物理演算，僅在漂移 $>0.15\text{m}$ 時平滑校正，消除網絡延遲造成的幽靈瞬移。
- 🎞️ **賽後戰報與 KO 慢動作重播 (Tactical Replay HUD)**：
  - **賽後遙測戰報**：即時統整對決歷時、雙方極速、最大衝量與**致命一擊時間戳（Critical Hit Time）**。
  - **可操控時間軸**：重播進度條上自動標記所有**碰撞紅色節點**，支援暫停、滑動跳轉與 360° 自由旋轉視角複盤。
- 🔬 **4 大維度物理張量面板 (Telemetry)**：
  - **剛體角動量與轉矩**：角速度 $\omega$ (RPM)、角動量向量 $\mathbf{L}$、上次對撞衝量 $J$ ($N\cdot s$)。
  - **能量解析系統**：系統總動能 $E_k$ ($J$)、轉動動能 $E_{\text{rot}}$、平動動能 $E_{\text{trans}}$。
  - **陀螺儀姿態與進動**：3D 姿態傾斜角 $\theta$、無近似進動頻率 $f_{\text{precession}}$ ($Hz$)。
  - **接觸面與外力場**：法向支持力 $N$、切向滑動摩擦力 $F_f$、盤面向心拉力 $F_c$。
- 📦 **UGC 3D 模型慣量測試**：支援拖拽上傳 3D 打印檔 (.stl)，自動進行二進制頭簽名檢查並演算轉動慣量張量。
- 🌐 **WebRTC P2P 遠端連線**：採用 **7 位數純數字房間 ID**，主機端廣播剛體姿態，客戶端實作四元數 Slerp 插值。
- 🌐 **100% 全介面雙語切換**：支援 **繁體中文** 與 **English** 一鍵切換所有標籤、對戰 Banner、下拉選項與科研物理面板。

---

## English Description

*Jayblade 3D* is a local WebGL HD 3D rigid-body physics simulator and tactical training platform for Beyblade battles. Featuring `index.html` as the primary 3D arena, it is designed for researchers, developers, and competitive players seeking first-principles physics and professional tactical analysis.

### ✨ Key Features
- 🔬 **First-Principles Research-Grade Physics Engine**:
  - **Explicit Euler Gyroscopic Torque**: Real-time integration of $\boldsymbol{\tau}_{\text{gyro}} = -(\boldsymbol{\omega} \times \mathbf{I}\boldsymbol{\omega})$ to capture gyroscopic nutation and precession coupling.
  - **Exact Non-Approximated Lagrange Precession**: Solves the quadratic equation $(I_{xx}-I_{yy})\cos\theta \Omega_p^2 + I_{yy}\omega_s \Omega_p - mgh = 0$ for high-tilt fidelity.
  - **Tensor Similarity Transformation**: Per-frame $\mathbf{I}_{\text{world}} = \mathbf{R} \mathbf{I}_{\text{body}} \mathbf{R}^T$ matrix operations.
  - **Swept-Sphere CCD**: High-velocity anti-tunneling collision handling at 240Hz.
  - **Realistic Match Duration**: Cooldown-regulated impulse mechanics ensuring durable **20–45s** tactical battles.
- ⚔️ **16 Tactical Combo Parts**: Includes **8 Blades** and **8 Bit Tips** with complete 6-component inertia tensors and material friction properties.
- 🎮 **Diverse Match Modes**: VS AI, 1P vs 2P Local, **WebRTC P2P Online Battle**, and 4-Player Battle Royale.
- 📳 **Esports Controls & Stepped Haptics**:
  - **Charge Launch Mechanics**: Charge RPM (7,000 to 14,000 RPM) with 3-tier stepped vibration and a burst feedback upon release.
  - **Client-Side Physical Prediction**: Smooth dead reckoning with a 0.15m reconciliation threshold.
- 🎞️ **Post-Match Analytics & Tactical Replay HUD**:
  - **Match Telemetry Card**: Highlights match duration, top speeds, peak impulse, and critical hit timestamps.
  - **Scrubbable Timeline**: Visual collision event markers with 0.5x slow-mo playback and 360° free orbit camera inspection.
- 🔬 **4-Dimension Live Telemetry**: Live readout of angular momentum tensors ($\mathbf{L}$), kinetic energy breakdown ($E_k, E_{\text{rot}}, E_{\text{trans}}$), tilt angle $\theta$, and precession frequency.
- 📦 **UGC 3D STL Custom Models**: Drag & drop `.stl` files with binary validation and tensor estimation.
- 🌐 **WebRTC P2P Matchmaking**: Fast 7-digit numeric Room IDs with quaternion Slerp interpolation.
- 🌐 **100% Bilingual Interface**: Instant one-click toggle between Traditional Chinese and English.

---

## 🏛️ 國際標準合規與治理 / Standards & Governance

本專案遵循國際企業級安全、私隱與演算法治理標準，相關合規聲明請參閱專屬文件：
- **ISO/IEC 27001:2022** (ISMS 資訊安全) ➔ [`SECURITY.md`](./SECURITY.md)
- **ISO/IEC 27701:2019 & GDPR** (PIMS 零個資私隱保護) ➔ [`PRIVACY.md`](./PRIVACY.md)
- **ISO/IEC 42001:2023 & EU AI Act** (AIMS 可解釋演算法治理) ➔ [`AI_GOVERNANCE.md`](./AI_GOVERNANCE.md)
- **綜合 ISO 治理合規聲明** ➔ [`ISO_COMPLIANCE.md`](./ISO_COMPLIANCE.md)

---

## 🛠️ 專案結構 / Project Structure

```text
Jayblade/
├── index.html              # 3D 高清主模擬器頁面 (3A HUD / 蓄力發射 / 戰報 / 重播)
├── 2d.html                 # 2D 經典省電版頁面
├── manifest.json           # PWA 設定檔與離線圖示宣告
├── sw.js                   # Service Worker 離線快取支援
├── ISO_COMPLIANCE.md       # ISO 27001 / 27701 / 42001 綜合治理合規聲明
├── PRIVACY.md              # GDPR / PDPO 零數據收集私隱聲明
├── AI_GOVERNANCE.md        # ISO 42001 演算法可解釋性與治理聲明
├── SECURITY.md             # ISO 27001 資安防護與弱點通報政策
├── DISCLAIMER.md           # 法律與知識產權免責聲明
├── tests/
│   └── physics.test.js     # 剛體力學核心與 16 款 Combo 配件自動化單元測試
└── js/
    ├── engine3d.js         # 科研級 3D 物理引擎 (Euler 陀螺力矩 / Lagrange 進動 / CCD)
    └── game3d.js           # 3A 遊戲主控 (蓄力震動 / WebRTC / 關鍵幀重播 / 雙語切換)
