// js/i18n.js - 雙語字典與對照表
export const I18N = {
    zh: {
        title: "🌀 爆上陀螺 Jayblade 3D",
        subtitle: "Beyblade X 高清 3D 剛體對戰模擬器",
        back2d: "⚡ 切換至 2D 經典版 →",
        langBtn: "English",
        p1Title: "🔵 P1 陀螺自訂", p2Title: "🔴 P2 陀螺自訂",
        p1NameDefault: "火鷹飛龍", p2NameDefault: "影武赤狼",
        lblNames: "名稱:", lblColors: "顏色:", lblCrowns: "撞擊環:", lblTips: "動力底軸:", lblSpins: "旋轉方向:", lblPowers: "發射力度:",
        ugcDrop: "📁 點擊或拖拽自訂 3D 設計 (.stl) 檔測試實體慣量",
        vsAi: "🎮 單人對戰 (VS AI)", vs2p: "⚔️ 1P vs 2P 同機對戰", p2pLaunch: "🌐 3D 遠端對決 (P2P)", vs4p: "🔥 4人障礙大亂鬥",
        debugTitle: "⚙️ 實時物理數據 (240Hz 算力)", readyStatus: "請按住發射按鈕蓄力發射...", toggleUi: "👁️ 隱藏/顯示選單",
        onlineTitle: "🌐 3D WebRTC 遠端連線大廳", myId: "7位數字房間 ID:", joinBtn: "加入房間",
        placeholderRoom: "貼上 7 位數 Room ID",
        netStatusOffline: "狀態: 單機模式", netStatusConnected: "狀態: 🟢 已連線！", netStatusConnecting: "狀態: 🟡 連線中...", netStatusError: "狀態: ⚠️ 連線失敗/房間無效",
        crowns: { 
            FEATHER: "羽翼飛刃", DRAKE: "龍紋重環", HEAVY: "裝甲重錘", WIZARD: "魔導圓盾",
            PHOENIX: "朱雀翼刃", SCYTHE: "死神鐮刀", RHINO: "犀牛角盾", VIPER: "毒蛇交鋒"
        },
        tips: { 
            FLAT: "極速平頭", BALL: "持久球軸", NEEDLE: "防禦針軸", ACCEL: "軌道衝刺",
            HEXA: "六角防禦", POINT: "半球尖軸", TAPER: "漸銳平軸", RUBBER: "橡膠平軸"
        },
        spins: { RIGHT: "右迴旋", LEFT: "左迴旋" },
        powers: { HEAVY: "重度 (高轉速)", MEDIUM: "中度 (穩定)", LIGHT: "輕度 (高精準)" },
        rpm: "🌀 轉速", hp: "❤️ 爆裂血量", speed: "⚡ 線速度 v",
        tensorTitle: "🔬 展開科研級 3D 物理張量 (Rigid-body Physics)",
        sec1: "1. 剛體角動量與轉矩", sec2: "2. 能量解析系統", sec3: "3. 陀螺儀姿態與進動", sec4: "4. 接觸面與外力場",
        omega: "角速度 ω", Lvec: "角動量向量 L", impulseJ: "上次對撞衝量 J",
        totalEk: "系統總動能 E_k", rotE: "轉動動能 E_rot", transE: "平動動能 E_trans",
        tilt: "3D 姿態傾斜角 θ", precFreq: "進動頻率 f_precession",
        Fn: "法向支持力 N", Ff: "切向滑動摩擦力 F_f", Fc: "盤面向心拉力 F_c",
        vsAiProgress: "⚔️ 對戰進行中... 兩車對撞！", vs2pProgress: "⚔️ 雙人對戰進行中...", vs4pProgress: "⚔️ 4 人大亂鬥進行中...",
        burstFinish: (winner, loser) => `💥【BURST FINISH】\n${winner} 擊碎了 ${loser}！`,
        koFinish: (loser) => `⚠️【OVER FINISH】\n${loser} 被擊飛出場外！`,
        spinFinish: (winner) => `🏆【SPIN FINISH】\n${winner} 旋轉持久勝出！`,
        drawFinish: "⚖️【DRAW】\n雙方同時停轉，本局平手！",
        tagWinner: "🏆 WINNER", tagBurst: "💥 BURST", tagSpinOut: "💤 STOPPED"
    },
    en: {
        title: "🌀 Jayblade 3D",
        subtitle: "Beyblade X HD 3D Rigid-Body Simulator",
        back2d: "⚡ Switch to 2D Classic →",
        langBtn: "中文 (繁體)",
        p1Title: "🔵 P1 Customization", p2Title: "🔴 P2 Customization",
        p1NameDefault: "Fire Bird Dragon", p2NameDefault: "Red Wolf",
        lblNames: "Name:", lblColors: "Color:", lblCrowns: "Blade Ring:", lblTips: "Bit Tip:", lblSpins: "Spin Direction:", lblPowers: "Launch Power:",
        ugcDrop: "📁 Click or drag custom 3D design (.stl) to test inertia",
        vsAi: "🎮 Single Player (VS AI)", vs2p: "⚔️ 1P vs 2P Local Battle", p2pLaunch: "🌐 3D Remote Match (P2P)", vs4p: "🔥 4-Player Battle Royale",
        debugTitle: "⚙️ Real-time Telemetry (240Hz Physics)", readyStatus: "Hold launch button to charge RPM...", toggleUi: "👁️ Toggle Panel",
        onlineTitle: "🌐 3D WebRTC Remote Lobby", myId: "7-Digit Room ID:", joinBtn: "Join Room",
        placeholderRoom: "Paste 7-Digit Room ID",
        netStatusOffline: "Status: Offline", netStatusConnected: "Status: 🟢 Connected!", netStatusConnecting: "Status: 🟡 Connecting...", netStatusError: "Status: ⚠️ Connection Failed",
        crowns: { 
            FEATHER: "Feather Blade", DRAKE: "Drake Crown", HEAVY: "Heavy Armor", WIZARD: "Wizard Ring",
            PHOENIX: "Phoenix Wing", SCYTHE: "Scythe Incendio", RHINO: "Rhino Horn", VIPER: "Viper Tail"
        },
        tips: { 
            FLAT: "Flat Speed", BALL: "Ball Bearing", NEEDLE: "Needle Guard", ACCEL: "Accel Dash",
            HEXA: "Hexa Shield", POINT: "Point Dual", TAPER: "Taper Counter", RUBBER: "Rubber Recoil"
        },
        spins: { RIGHT: "Right Spin (CW)", LEFT: "Left Spin (CCW)" },
        powers: { HEAVY: "Heavy (Max RPM)", MEDIUM: "Balanced", LIGHT: "Precision" },
        rpm: "🌀 Spin Rate", hp: "❤️ Burst Health", speed: "⚡ Linear Speed v",
        tensorTitle: "🔬 Expand 3D Rigid-Body Physics Tensors",
        sec1: "1. Angular Dynamics & Torque", sec2: "2. Energy Breakdown System", sec3: "3. Gyroscopic State & Precession", sec4: "4. Surface & Force Field",
        omega: "Angular Velocity ω", Lvec: "Angular Momentum L", impulseJ: "Impact Impulse J",
        totalEk: "Total Kinetic Energy E_k", rotE: "Rotational Energy E_rot", transE: "Translational Energy E_trans",
        tilt: "3D Tilt Angle θ", precFreq: "Precession Freq f",
        Fn: "Normal Force N", Ff: "Friction Force F_f", Fc: "Centripetal Pull F_c",
        vsAiProgress: "⚔️ Battle in progress... Clash!", vs2pProgress: "⚔️ 2P Battle in progress...", vs4pProgress: "⚔️ 4-Player Royal Rumble...",
        burstFinish: (winner, loser) => `💥【BURST FINISH】\n${winner} burst ${loser}!`,
        koFinish: (loser) => `⚠️【OVER FINISH】\n${loser} was knocked out!`,
        spinFinish: (winner) => `🏆【SPIN FINISH】\n${winner} won by endurance!`,
        drawFinish: "⚖️【DRAW】\nBoth tops stopped spinning!",
        tagWinner: "🏆 WINNER", tagBurst: "💥 BURST", tagSpinOut: "💤 STOPPED"
    }
};
