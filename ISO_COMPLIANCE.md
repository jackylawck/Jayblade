# ISO 國際標準治理合規聲明 / ISO Standards Compliance Statement

[繁體中文](https://www.google.com/search?q=%23-%E7%B9%81%E9%AB%94%E4%B8%AD%E6%96%87%E8%AA%AA%E6%98%8E) | [English](https://www.google.com/search?q=%23-english-statement)

**對標國際標準 / Target Standards:**

* **ISO/IEC 27001:2022** — 資訊安全管理系統 (Information Security Management Systems - ISMS)
* **ISO/IEC 27701:2019** — 私隱資訊管理系統 (Privacy Information Management Systems - PIMS)
* **ISO/IEC 42001:2023** — 人工智能管理系統 (Artificial Intelligence Management Systems - AIMS)

---

## 繁體中文說明

### 1. 執行摘要 (Executive Summary)

本專案為非商業、開源之 Web 物理模擬系統（基於 WebGL / Three.js / 剛體力學引擎）。為展現企業級與科研級之治理標準，本系統在系統架構、數據處理與演算法設計上，全面落實「設計兼預設之安全與私隱 (Security & Privacy by Design and Default)」以及「可解釋與負責任之演算法治理 (Responsible & Explainable Algorithmic Governance)」。

---

### 2. ISO/IEC 27001:2022 (ISMS) 資訊安全控制對照

| 控制領域 (Annex A) | 本專案實作與控制措施 | 治理效力 |
| --- | --- | --- |
| **A.5.8 專案管理中的安全** | 實施相依套件弱點掃描，採用鎖定版本之開源函式庫（Three.js, Cannon.js）。 | 防止供應鏈安全風險 |
| **A.8.9 內容安全策略 (CSP)** | 啟用嚴格之 HTTP/Meta Content Security Policy，阻擋未授權腳本注入與跨站腳本攻擊 (XSS)。 | 確保瀏覽器端執行環境純淨 |
| **A.8.28 安全程式編寫** | 所有外部 CDN 引入均配備子資源完整性 (Subresource Integrity, SRI) SHA-384 雜湊驗證。 | 防止 CDN 遭劫持或代碼竄改 |
| **A.8.30 安全測試與驗證** | 建立自動化單元測試集 (Automated Unit Tests)，持續校驗力學方程式與陣列邊界條件。 | 避免緩衝區溢位與算力崩潰 |

---

### 3. ISO/IEC 27701:2019 (PIMS) 私隱資訊管理與 GDPR 對照

| 私隱原則 / 條款 | 本專案架構實作 | 合規說明 |
| --- | --- | --- |
| **Clause 6.3 零個人資料蒐集** | 系統採用**無後端 (Zero-Backend)** 架構，不設數據庫，不蒐集任何個人可識別資訊 (PII)、Cookie 或遙測追蹤標識符。 | 符合數據最小化 (Data Minimization) |
| **Clause 6.5 本地端記憶體運算** | 使用者自訂設定與 3D STL 模型檔案完全在本地瀏覽器 RAM 內運算與銷毀，不向任何伺服器回傳。 | 落實 Privacy by Design 原則 |
| **Clause 6.10 點對點連線通訊** | 遠端連線採用 WebRTC P2P 傳輸，連線房號為隨機 7 位數暫態 ID，通訊數據全程經 DTLS/SRTP 加密。 | 無中間人存儲，通訊結束即銷毀 |

---

### 4. ISO/IEC 42001:2023 (AIMS) 人工智能與演算法治理對照

| AIMS 核心要求 | 本專案演算法治理機制 | 治理承諾 |
| --- | --- | --- |
| **Clause 5.1 AI 政策與範疇** | 本系統屬確定性數值物理引擎（Deterministic Physics Engine），明確排除具不可預測性之黑箱自主決策或生成式黑盒模型。 | 明確系統功能與法律邊界 |
| **Clause 6.1.2 演算法風險評估** | 針對 240Hz 高頻積分運算實施數值防穿透（Sub-stepping）與粒子系統效能上限防護（Throttling Cap）。 | 確保跨平台運行之安全性與穩定性 |
| **Clause 8.4 透明度與可解釋性** | 實時遙測面板 (Telemetry) 完整公開角動量向量 $\mathbf{L}$、動能拆解 $E_k$、質量流率 $\dot{m}$ 與推進張量等數學公式與輸出。 | 達到 100% 演算法透明與可驗證 |
| **Clause 8.5 人類自主控制** | 提供即時發射、分級、緊急終止與重設開關，使用者始終保有最高控制權 (Human-in-the-Loop)。 | 防止非預期失控行為 |

---

## 🌐 English Statement

### 1. Executive Summary

This open-source WebGL physics simulator is engineered strictly under the philosophy of **Security & Privacy by Design and Default** and **Responsible Algorithmic Governance**, aligning with international management benchmarks established by ISO/IEC 27001:2022, ISO/IEC 27701:2019, and ISO/IEC 42001:2023.

---

### 2. ISO/IEC 27001:2022 (ISMS) Information Security Alignment

* **A.5.8 Security in Project Management**: Strict dependency pinning and automated vulnerability monitoring for third-party libraries.
* **A.8.9 Content Security Policy**: Rigid CSP policies enforced to mitigate Cross-Site Scripting (XSS) and unauthorized DOM injections.
* **A.8.28 Secure Coding**: Subresource Integrity (SRI) SHA-384 cryptographic hashing applied across external CDN script tags.
* **A.8.30 Security Testing**: Automated unit testing suites implemented to safeguard rigid-body math, array indices, and browser runtime stability.

---

### 3. ISO/IEC 27701:2019 (PIMS) Privacy Information Alignment

* **Zero PII Collection**: Pure client-side, zero-backend architecture. No Personally Identifiable Information (PII), browser storage trackers, or behavioral profiling is gathered.
* **Local In-Memory Computation**: All custom physics configs and user-provided 3D STL geometries are parsed exclusively inside local device RAM.
* **Encrypted P2P Communications**: Ephemeral 7-digit numeric Room IDs utilize direct WebRTC Peer-to-Peer channels encrypted via industry-standard DTLS/SRTP protocols.

---

### 4. ISO/IEC 42001:2023 (AIMS) AI & Algorithmic Governance Alignment

* **Deterministic Boundary**: Explicitly classified as a deterministic Newtonian and aerospace mechanics engine; excludes unverified black-box decision models.
* **Algorithmic Risk Management**: Integrates 240Hz sub-stepping calculations to avert numerical tunneling and introduces hardware throttling caps for GPU stability.
* **Transparency & Explainability**: 100% auditable telemetry panel exposing real-time angular momentum tensors ($\mathbf{L}$), kinetic energy decompositions, and thrust metrics.
* **Human Agency (Human-in-the-Loop)**: Total user authority over engine throttles, manual stage separation, abort sequences, and runtime resets.

---

### 📬 治理與安全聯繫 / Governance & Vulnerability Contact

若對本專案之國際治理標準、合規聲明或技術安全有任何疑問，請透過 GitHub Security Advisories 提交反饋。

For compliance inquiries or security vulnerability reporting, please submit via GitHub Security Advisories.
