// js/engine.js - 《爆上陀螺 Jayblade》2D 剛體力學物理演算引擎 (含 Beyblade X 圍欄與口袋系統)

// ---------------------------------------------------------------------------
// 1. 全域賽場與口袋參數定義
// ---------------------------------------------------------------------------
export let STADIUM_CX = 400; // 盤心 X 座標 (視 Canvas 寬度動態更新)
export let STADIUM_CY = 300; // 盤心 Y 座標 (視 Canvas 高度動態更新)
export let STADIUM_R = 220;  // 戰鬥盤內壁半徑

// Beyblade X 三大擊飛口袋角度範圍 (極座標弧度)
export const STADIUM_POCKETS = [
    {
        id: "EXTREME",
        name: "💥 EXTREME FINISH (3分)",
        minAngle: -Math.PI * 0.65, // 頂部中央缺口 (約 -117° ~ -63°)
        maxAngle: -Math.PI * 0.35,
        color: "#00ff66",
        score: 3
    },
    {
        id: "OVER_RIGHT",
        name: "⚠️ OVER FINISH (2分)",
        minAngle: Math.PI * 0.15,   // 右下角 Over 口袋 (約 27° ~ 63°)
        maxAngle: Math.PI * 0.35,
        color: "#ff9f43",
        score: 2
    },
    {
        id: "OVER_LEFT",
        name: "⚠️ OVER FINISH (2分)",
        minAngle: Math.PI * 0.65,   // 左下角 Over 口袋 (約 117° ~ 153°)
        maxAngle: Math.PI * 0.85,
        color: "#ff9f43",
        score: 2
    }
];

// 火花粒子陣列
export const sparks = [];

// ---------------------------------------------------------------------------
// 2. 2D 陀螺剛體類別 (Top2D)
// ---------------------------------------------------------------------------
export class Top2D {
    constructor(config) {
        this.id = config.id || Math.random().toString(36).substring(2, 9);
        this.name = config.name || "自訂陀螺";
        this.color = config.color || "#00d2d3";
        
        // 位置與運動學狀態
        this.x = config.x || STADIUM_CX;
        this.y = config.y || STADIUM_CY;
        this.vx = config.vx || 0;
        this.vy = config.vy || 0;
        
        // 旋轉角速度 (rad/s) 與旋轉方向
        this.isRightSpin = config.isRightSpin ?? true;
        const initialRpm = config.rpm || 12000;
        this.angularVelocity = (initialRpm * 2 * Math.PI) / 60 * (this.isRightSpin ? 1 : -1);

        // 物理力學屬性
        this.radius = config.radius || 22;           // 撞擊半徑 (px)
        this.mass = config.mass || 0.045;             // 質量 (kg)
        this.burstResist = config.burstResist || 0.85; // 爆裂抗性 (0.6 ~ 0.98)
        this.friction = config.friction || 0.35;      // 底軸 Stribeck 摩擦力

        // 計算轉動慣量 I = 1/2 * m * r^2
        const rMeters = this.radius * 0.005;
        this.inertia = 0.5 * this.mass * Math.pow(rMeters, 2);

        // 遊戲判定狀態
        this.hp = 100;
        this.isKnockedOut = false;
        this.isBurst = false;
        this.knockoutReason = "";
    }

    // 取得當前 RPM (轉速)
    getRPM() {
        return Math.round((Math.abs(this.angularVelocity) * 60) / (2 * Math.PI));
    }

    // 取得當前線速度 (m/s)
    getLinearSpeed() {
        return Math.hypot(this.vx, this.vy) * 0.05; // 標度轉換
    }

    // 取得總動能 KE = 1/2 * m * v^2 + 1/2 * I * ω^2
    getKineticEnergy() {
        const v = this.getLinearSpeed();
        const w = Math.abs(this.angularVelocity);
        const transKE = 0.5 * this.mass * Math.pow(v, 2);
        const rotKE = 0.5 * this.inertia * Math.pow(w, 2);
        return transKE + rotKE;
    }
}

// ---------------------------------------------------------------------------
// 3. 賽場尺寸動態更新
// ---------------------------------------------------------------------------
export function updateStadiumCenter(width, height) {
    STADIUM_CX = width / 2;
    STADIUM_CY = height / 2;
    STADIUM_R = Math.min(width, height) * 0.38;
}

// ---------------------------------------------------------------------------
// 4. 火花粒子系統
// ---------------------------------------------------------------------------
export function createSparks(x, y, count = 12) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        sparks.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            decay: 0.04 + Math.random() * 0.03,
            size: 2 + Math.random() * 3,
            color: Math.random() > 0.3 ? "#ffcc00" : "#ff3838"
        });
    }
}

export function updateSparks() {
    for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0) {
            sparks.splice(i, 1);
        }
    }
}

// ---------------------------------------------------------------------------
// 5. 邊界與口袋碰撞檢測 (Wall Bounce & Pocket Knockout)
// ---------------------------------------------------------------------------
export function check2DStadiumBoundary(top, onEventCallback) {
    if (top.isKnockedOut || top.isBurst) return;

    const dx = top.x - STADIUM_CX;
    const dy = top.y - STADIUM_CY;
    const dist = Math.hypot(dx, dy);

    // 當陀螺接觸戰鬥盤外壁
    if (dist + top.radius >= STADIUM_R) {
        // 計算撞擊點相對圓心的極座標角度 (-π 到 +π)
        const hitAngle = Math.atan2(dy, dx);

        // 1. 檢查是否進入 3 大擊飛口袋 (Pocket Knockout)
        const pocket = STADIUM_POCKETS.find(p => hitAngle >= p.minAngle && hitAngle <= p.maxAngle);

        if (pocket) {
            top.isKnockedOut = true;
            top.vx = 0;
            top.vy = 0;
            top.angularVelocity = 0;
            top.knockoutReason = pocket.name;

            if (onEventCallback) {
                onEventCallback("KNOCKOUT", { top, pocket });
            }
            return;
        }

        // 2. 若為實體牆面，執行法向反射 (Wall Bounce)
        const nx = dx / dist; // 單位外法向量
        const ny = dy / dist;

        // 修正位置防止嵌入牆壁
        top.x = STADIUM_CX + nx * (STADIUM_R - top.radius);
        top.y = STADIUM_CY + ny * (STADIUM_R - top.radius);

        const dot = top.vx * nx + top.vy * ny;
        if (dot > 0) {
            const restitution = 0.72; // 牆面彈性恢復係數
            top.vx -= (1 + restitution) * dot * nx;
            top.vy -= (1 + restitution) * dot * ny;

            // 撞牆能量損失與火花
            top.angularVelocity *= 0.985;
            createSparks(top.x, top.y, 8);

            if (onEventCallback) {
                onEventCallback("WALL_HIT", { top, x: top.x, y: top.y });
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 6. 雙陀螺對撞力學 (同旋衝量 / 異旋吸轉 Spin Steal / 爆裂判定)
// ---------------------------------------------------------------------------
export function handleTopCollision(topA, topB, onEventCallback) {
    if (topA.isKnockedOut || topB.isKnockedOut || topA.isBurst || topB.isBurst) return;

    const dx = topB.x - topA.x;
    const dy = topB.y - topA.y;
    const dist = Math.hypot(dx, dy);
    const minDist = topA.radius + topB.radius;

    if (dist < minDist && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;

        // 重疊修正 (防止黏在一起)
        const overlap = (minDist - dist) / 2;
        topA.x -= nx * overlap;
        topA.y -= ny * overlap;
        topB.x += nx * overlap;
        topB.y += ny * overlap;

        // 相對速度
        const rvx = topB.vx - topA.vx;
        const rvy = topB.vy - topA.vy;
        const velAlongNormal = rvx * nx + rvy * ny;

        if (velAlongNormal < 0) {
            const restitution = 0.85; // 陀螺金屬對撞動能係數
            let impulseMag = -(1 + restitution) * velAlongNormal / (1 / topA.mass + 1 / topB.mass);

            // 施加線性衝量
            topA.vx -= (impulseMag / topA.mass) * nx;
            topA.vy -= (impulseMag / topA.mass) * ny;
            topB.vx += (impulseMag / topB.mass) * nx;
            topB.vy += (impulseMag / topB.mass) * ny;

            // 雙旋力學 (同旋 vs 異旋 Spin Steal)
            const isSameSpin = topA.isRightSpin === topB.isRightSpin;

            if (isSameSpin) {
                // 【同旋對撞】衝力強烈，互相扣減轉速與引發爆裂風險
                const damage = impulseMag * 0.12;
                topA.angularVelocity *= (1 - 0.08 / topA.burstResist);
                topB.angularVelocity *= (1 - 0.08 / topB.burstResist);

                topA.hp -= damage / topA.burstResist;
                topB.hp -= damage / topB.burstResist;

                // 爆裂 (Burst) 臨檢
                if (topA.hp <= 0) {
                    topA.isBurst = true;
                    topA.angularVelocity = 0;
                    if (onEventCallback) onEventCallback("BURST", { winner: topB, loser: topA });
                }
                if (topB.hp <= 0) {
                    topB.isBurst = true;
                    topB.angularVelocity = 0;
                    if (onEventCallback) onEventCallback("BURST", { winner: topA, loser: topB });
                }
            } else {
                // 【異旋吸轉 Spin Steal】金屬環切向摩擦力導致角速度對齊
                const avgSpin = (Math.abs(topA.angularVelocity) + Math.abs(topB.angularVelocity)) / 2;
                const transferRate = 0.15; // 轉速吸收轉移率

                if (Math.abs(topA.angularVelocity) > Math.abs(topB.angularVelocity)) {
                    topA.angularVelocity *= (1 - transferRate);
                    topB.angularVelocity += (topB.isRightSpin ? 1 : -1) * (avgSpin * transferRate);
                } else {
                    topB.angularVelocity *= (1 - transferRate);
                    topA.angularVelocity += (topA.isRightSpin ? 1 : -1) * (avgSpin * transferRate);
                }
            }

            // 觸發撞擊火花與音效
            const midX = (topA.x + topB.x) / 2;
            const midY = (topA.y + topB.y) / 2;
            createSparks(midX, midY, 16);

            if (onEventCallback) {
                onEventCallback("CLASH", { topA, topB, impulse: impulseMag, x: midX, y: midY });
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 7. 物理主循環更新 (Sub-stepping 240Hz 算力)
// ---------------------------------------------------------------------------
export function updatePhysics2D(tops, dt, onEventCallback) {
    const subSteps = 4; // 240Hz (60fps * 4)
    const subDt = dt / subSteps;

    for (let step = 0; step < subSteps; step++) {
        for (let i = 0; i < tops.length; i++) {
            const top = tops[i];
            if (top.isKnockedOut || top.isBurst) continue;

            // 1. 位置更新
            top.x += top.vx * subDt * 60;
            top.y += top.vy * subDt * 60;

            // 2. 碗狀盤面坡度引力 (Bowl Gravity) - 拉回中心
            const dx = top.x - STADIUM_CX;
            const dy = top.y - STADIUM_CY;
            const dist = Math.hypot(dx, dy);

            if (dist > 5 && dist < STADIUM_R) {
                const bowlPull = 0.18 * (dist / STADIUM_R);
                top.vx -= (dx / dist) * bowlPull;
                top.vy -= (dy / dist) * bowlPull;
            }

            // 3. Stribeck 底軸摩擦力與轉速衰減
            top.vx *= 0.988;
            top.vy *= 0.988;
            top.angularVelocity *= 0.9985;

            // 轉速停止判定
            if (Math.abs(top.angularVelocity) < 2) {
                top.angularVelocity = 0;
            }

            // 4. 邊界與口袋檢查
            check2DStadiumBoundary(top, onEventCallback);
        }

        // 5. 陀螺間對撞檢測
        for (let i = 0; i < tops.length; i++) {
            for (let j = i + 1; j < tops.length; j++) {
                handleTopCollision(tops[i], tops[j], onEventCallback);
            }
        }
    }

    // 6. 更新火花粒子
    updateSparks();
}

// ---------------------------------------------------------------------------
// 8. 2D 戰鬥盤 Canvas 繪製 (含護牆與三大口袋)
// ---------------------------------------------------------------------------
export function draw2DStadiumLayout(ctx, width, height) {
    updateStadiumCenter(width, height);

    ctx.save();

    // 1. 暗色主盤面
    ctx.beginPath();
    ctx.arc(STADIUM_CX, STADIUM_CY, STADIUM_R, 0, Math.PI * 2);
    ctx.fillStyle = "#12121e";
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 210, 211, 0.4)";
    ctx.lineWidth = 3;
    ctx.stroke();

    // 2. 綠色 X-Dash 軌道環
    ctx.beginPath();
    ctx.arc(STADIUM_CX, STADIUM_CY, STADIUM_R - 12, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 255, 102, 0.6)";
    ctx.lineWidth = 6;
    ctx.stroke();

    // 3. 繪製三處擊飛口袋 (Pocket Gaps)
    STADIUM_POCKETS.forEach(p => {
        ctx.beginPath();
        ctx.arc(STADIUM_CX, STADIUM_CY, STADIUM_R + 3, p.minAngle, p.maxAngle);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 10;
        ctx.stroke();
    });

    // 4. 繪製火花粒子
    sparks.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
    });

    ctx.restore();
}
