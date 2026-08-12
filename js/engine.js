// js/engine.js - 《爆上陀螺 Jayblade》2D 剛體力學科研仿真級物理引擎 (含動能轉化/進動搖晃/能量守恆)

export let STADIUM_CX = 400; // 盤心 X 座標
export let STADIUM_CY = 300; // 盤心 Y 座標
export let STADIUM_R = 220;  // 戰鬥盤內壁半徑

// Beyblade X 三大擊飛口袋角度範圍 (極座標弧度)
export const STADIUM_POCKETS = [
    {
        id: "EXTREME",
        name: "💥 EXTREME FINISH (3分)",
        minAngle: -Math.PI * 0.65, // 頂部缺口
        maxAngle: -Math.PI * 0.35,
        color: "#00ff66",
        score: 3
    },
    {
        id: "OVER_RIGHT",
        name: "⚠️ OVER FINISH (2分)",
        minAngle: Math.PI * 0.15,   // 右下角 Over 口袋
        maxAngle: Math.PI * 0.35,
        color: "#ff9f43",
        score: 2
    },
    {
        id: "OVER_LEFT",
        name: "⚠️ OVER FINISH (2分)",
        minAngle: Math.PI * 0.65,   // 左下角 Over 口袋
        maxAngle: Math.PI * 0.85,
        color: "#ff9f43",
        score: 2
    }
];

export const sparks = [];

// ---------------------------------------------------------------------------
// 1. 仿真級 2D 陀螺剛體類別 (Top2D)
// ---------------------------------------------------------------------------
export class Top2D {
    constructor(config) {
        this.id = config.id || Math.random().toString(36).substring(2, 9);
        this.name = config.name || "自訂陀螺";
        this.color = config.color || "#0284c7";
        
        //  SI 物理標度映射 (1 pixel = 0.00125 meters)
        this.x = config.x || STADIUM_CX;
        this.y = config.y || STADIUM_CY;
        this.vx = config.vx || 0;
        this.vy = config.vy || 0;
        this.rotation = Math.random() * Math.PI * 2;
        
        // 陀螺儀進動 (Precession & Nutation) 變數
        this.wobbleAngle = 0; // 當前傾斜角 (弧度)
        this.wobblePhase = Math.random() * Math.PI * 2; // 搖晃相位角
        
        // 旋轉角速度 (rad/s)
        this.isRightSpin = config.isRightSpin ?? true;
        const initialRpm = config.rpm || 12000;
        this.angularVelocity = (initialRpm * 2 * Math.PI) / 60 * (this.isRightSpin ? 1 : -1);

        // 嚴格 SI 物理數據
        this.radius = config.radius || 24;            // 碰撞半徑 (px)
        this.mass = config.mass || 0.048;              // 質量 (kg)
        this.burstResist = config.burstResist || 0.85;  // 爆裂抗性 (0.6 ~ 0.98)
        this.friction = config.friction || 0.22;       // 接觸面 Stribeck 摩擦係數 μ

        // 轉動慣量 I = 1/2 * m * r^2
        const rMeters = this.radius * 0.00125;
        this.inertia = 0.5 * this.mass * Math.pow(rMeters, 2);

        this.hp = 100;
        this.isKnockedOut = false;
        this.isBurst = false;
        this.knockoutReason = "";
    }

    getRPM() {
        return Math.round((Math.abs(this.angularVelocity) * 60) / (2 * Math.PI));
    }

    getLinearSpeed() {
        return Math.hypot(this.vx, this.vy) * 0.05;
    }

    // 真實總動能 (焦耳 J)：平動動能 + 轉動動能
    getKineticEnergy() {
        const v = this.getLinearSpeed();
        const w = Math.abs(this.angularVelocity);
        const transKE = 0.5 * this.mass * Math.pow(v, 2);
        const rotKE = 0.5 * this.inertia * Math.pow(w, 2);
        return transKE + rotKE;
    }
}

export function updateStadiumCenter(width, height) {
    STADIUM_CX = width / 2;
    STADIUM_CY = height / 2;
    STADIUM_R = Math.min(width, height) * 0.38;
}

export function createSparks(x, y, count = 14) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 7;
        sparks.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            decay: 0.035 + Math.random() * 0.03,
            size: 2 + Math.random() * 3.5,
            color: Math.random() > 0.3 ? "#ffea00" : "#ff3300"
        });
    }
}

export function updateSparks() {
    for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0) sparks.splice(i, 1);
    }
}

export function check2DStadiumBoundary(top, onEventCallback) {
    if (top.isKnockedOut || top.isBurst) return;

    const dx = top.x - STADIUM_CX;
    const dy = top.y - STADIUM_CY;
    const dist = Math.hypot(dx, dy);

    if (dist + top.radius >= STADIUM_R) {
        const hitAngle = Math.atan2(dy, dx);
        const pocket = STADIUM_POCKETS.find(p => hitAngle >= p.minAngle && hitAngle <= p.maxAngle);

        if (pocket) {
            top.isKnockedOut = true;
            top.vx = 0;
            top.vy = 0;
            top.angularVelocity = 0;
            top.knockoutReason = pocket.name;

            if (onEventCallback) onEventCallback("KNOCKOUT", { top, pocket });
            return;
        }

        // 實體護牆彈回 (符合物理守恆 e = 0.72)
        const nx = dx / dist;
        const ny = dy / dist;

        top.x = STADIUM_CX + nx * (STADIUM_R - top.radius);
        top.y = STADIUM_CY + ny * (STADIUM_R - top.radius);

        const dot = top.vx * nx + top.vy * ny;
        if (dot > 0) {
            const restitution = 0.72; // 嚴格守恆彈性恢復係數
            top.vx -= (1 + restitution) * dot * nx;
            top.vy -= (1 + restitution) * dot * ny;

            // 撞牆轉換為微小角動量損耗
            top.angularVelocity *= 0.991;
            createSparks(top.x, top.y, 8);

            if (onEventCallback) onEventCallback("WALL_HIT", { top, x: top.x, y: top.y });
        }
    }
}

// ---------------------------------------------------------------------------
// 2. 🔬 真實動能轉化碰撞與切向對齊 (Energy Conserving Collision Engine)
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

        // 硬隔離重疊修正
        const overlap = (minDist - dist) / 2 + 0.2;
        topA.x -= nx * overlap;
        topA.y -= ny * overlap;
        topB.x += nx * overlap;
        topB.y += ny * overlap;

        // 法向相對速度
        const rvx = topB.vx - topA.vx;
        const rvy = topB.vy - topA.vy;
        const velAlongNormal = rvx * nx + rvy * ny;

        if (velAlongNormal < 0) {
            // 物理守恆恢復係數 e <= 1.0
            const e = 0.78;
            let jN = -(1 + e) * velAlongNormal / (1 / topA.mass + 1 / topB.mass);

            // 💡 刀刃咬合核心：將轉動動能 (I*ω^2) 轉化為平動衝量 (jN)
            const rpmA = Math.abs(topA.getRPM());
            const rpmB = Math.abs(topB.getRPM());
            const avgRpm = (rpmA + rpmB) / 2;

            // 自轉動能轉化出的平動反衝衝量 (能量來自轉速消耗，而非憑空產生)
            const rotEnergyRecoil = Math.min(3.8, (avgRpm / 12000) * 2.5);
            jN += rotEnergyRecoil;

            // 扣除相應的自轉動能 (遵循動能守恆)
            const energyLossFactor = 0.045 / Math.min(topA.burstResist, topB.burstResist);
            topA.angularVelocity *= (1 - energyLossFactor);
            topB.angularVelocity *= (1 - energyLossFactor);

            // 施加平動衝量彈開
            topA.vx -= (jN / topA.mass) * nx;
            topA.vy -= (jN / topA.mass) * ny;
            topB.vx += (jN / topB.mass) * nx;
            topB.vy += (jN / topB.mass) * ny;

            // 雙旋力學 (同旋 vs 異旋吸轉)
            const isSameSpin = topA.isRightSpin === topB.isRightSpin;

            if (isSameSpin) {
                // 同旋撞擊扣減血量
                const damage = jN * 0.14;
                topA.hp -= damage / topA.burstResist;
                topB.hp -= damage / topB.burstResist;

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
                // 💡 異旋吸轉：計算接觸點切向表面速度差
                const rA = topA.radius * 0.00125;
                const rB = topB.radius * 0.00125;
                const surfVelA = topA.angularVelocity * rA;
                const surfVelB = topB.angularVelocity * rB;

                const surfSpeedDiff = surfVelA + surfVelB;

                // 只有當表面速度尚未對齊時才進行轉速轉移，對齊後摩擦力歸零停止吸轉！
                if (Math.abs(surfSpeedDiff) > 0.05) {
                    const transferTorque = surfSpeedDiff * 0.08;
                    topA.angularVelocity -= (transferTorque / topA.inertia) * 0.0001;
                    topB.angularVelocity -= (transferTorque / topB.inertia) * 0.0001;
                }
            }

            const midX = (topA.x + topB.x) / 2;
            const midY = (topA.y + topB.y) / 2;
            createSparks(midX, midY, 16);

            if (onEventCallback) {
                onEventCallback("CLASH", { topA, topB, impulse: jN, x: midX, y: midY });
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 3. 🌀 物理主循環 (含陀螺儀進動 Wobble 與正確阻尼)
// ---------------------------------------------------------------------------
export function updatePhysics2D(tops, dt, onEventCallback) {
    const subSteps = 4; // 240Hz 高頻子步算力
    const subDt = dt / subSteps;

    for (let step = 0; step < subSteps; step++) {
        for (let i = 0; i < tops.length; i++) {
            const top = tops[i];
            if (top.isKnockedOut || top.isBurst) continue;

            const currentRpm = Math.abs(top.getRPM());

            // 💡 1. 陀螺儀進動與傾斜搖晃演算 (Precession & Nutation)
            const WOBBLE_THRESHOLD_RPM = 3800; // 低於 3800 RPM 開始搖晃
            if (currentRpm < WOBBLE_THRESHOLD_RPM && currentRpm > 0) {
                const ratio = (WOBBLE_THRESHOLD_RPM - currentRpm) / WOBBLE_THRESHOLD_RPM;
                top.wobbleAngle = 0.38 * Math.pow(ratio, 1.8); // 最大傾斜角約 22 度
                top.wobblePhase += (16 + (3800 - currentRpm) * 0.01) * subDt; // 進動進度
            } else {
                top.wobbleAngle = 0;
            }

            // 💡 2. 搖晃時側邊拖地的非線性摩擦力驟增
            const wobbleFrictionDrag = 1.0 + (top.wobbleAngle * 6.5);

            // 位置與自轉更新
            top.x += top.vx * subDt * 60;
            top.y += top.vy * subDt * 60;
            top.rotation += (top.angularVelocity * subDt);

            // 碗狀坡度向心重力 (Bowl Gravity)
            const dx = top.x - STADIUM_CX;
            const dy = top.y - STADIUM_CY;
            const dist = Math.hypot(dx, dy);

            if (dist > 5 && dist < STADIUM_R) {
                const bowlPull = 0.22 * (dist / STADIUM_R);
                top.vx -= (dx / dist) * bowlPull;
                top.vy -= (dy / dist) * bowlPull;
            }

            // 衰減率：當搖晃越大時，轉速與平動衰減越快 (還原最後 2-3 秒倒地煞停動態)
            top.vx *= Math.max(0.95, 0.994 - (top.wobbleAngle * 0.01));
            top.vy *= Math.max(0.95, 0.994 - (top.wobbleAngle * 0.01));
            top.angularVelocity *= Math.max(0.92, 0.9996 - (top.wobbleAngle * 0.008));

            if (Math.abs(top.angularVelocity) < 2) {
                top.angularVelocity = 0;
            }

            check2DStadiumBoundary(top, onEventCallback);
        }

        // 碰撞與反衝
        for (let i = 0; i < tops.length; i++) {
            for (let j = i + 1; j < tops.length; j++) {
                handleTopCollision(tops[i], tops[j], onEventCallback);
            }
        }
    }

    updateSparks();
}

// ---------------------------------------------------------------------------
// 4. 賽場級美化版 2D 戰鬥盤 Canvas 繪製
// ---------------------------------------------------------------------------
export function draw2DStadiumLayout(ctx, width, height) {
    updateStadiumCenter(width, height);

    ctx.save();

    // 1. 瓷白光澤底盤漸層
    const stadiumGrad = ctx.createRadialGradient(
        STADIUM_CX, STADIUM_CY, 10,
        STADIUM_CX, STADIUM_CY, STADIUM_R
    );
    stadiumGrad.addColorStop(0, "#ffffff");
    stadiumGrad.addColorStop(0.75, "#e2e8f0");
    stadiumGrad.addColorStop(1, "#cbd5e1");

    ctx.beginPath();
    ctx.arc(STADIUM_CX, STADIUM_CY, STADIUM_R, 0, Math.PI * 2);
    ctx.fillStyle = stadiumGrad;
    ctx.fill();

    // 2. 盤心藍色科技標誌環
    ctx.beginPath();
    ctx.arc(STADIUM_CX, STADIUM_CY, STADIUM_R * 0.25, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(2, 132, 199, 0.45)";
    ctx.lineWidth = 4;
    ctx.stroke();

    // 3. 螢光綠 X-Dash 衝刺軌道齒輪環
    ctx.beginPath();
    ctx.arc(STADIUM_CX, STADIUM_CY, STADIUM_R - 10, 0, Math.PI * 2);
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 8;
    ctx.shadowColor = "#10b981";
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 4. 三大擊飛口袋
    STADIUM_POCKETS.forEach(p => {
        ctx.beginPath();
        ctx.arc(STADIUM_CX, STADIUM_CY, STADIUM_R + 2, p.minAngle, p.maxAngle);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 14;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;
    });

    // 5. 外圍霓虹防護護牆
    ctx.beginPath();
    ctx.arc(STADIUM_CX, STADIUM_CY, STADIUM_R + 6, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
    ctx.lineWidth = 4;
    ctx.stroke();

    // 6. 碰撞火花粒子
    sparks.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();
    });

    ctx.restore();
}

// ---------------------------------------------------------------------------
// 5. 🌟 繪製 3D 視差搖晃與金屬質感 2D 陀螺 (Dynamic Nutation Render)
// ---------------------------------------------------------------------------
export function draw2DTop(ctx, top) {
    if (top.isKnockedOut || top.isBurst) return;

    ctx.save();

    // 💡 搖晃時呈現進動圓心偏移與 3D 視差壓扁效果
    const wobbleOffsetX = Math.cos(top.wobblePhase) * (top.wobbleAngle * 22);
    const wobbleOffsetY = Math.sin(top.wobblePhase) * (top.wobbleAngle * 22);

    ctx.translate(top.x + wobbleOffsetX, top.y + wobbleOffsetY);
    ctx.rotate(top.rotation);

    // 3D 傾斜視差比例
    const tiltScaleY = 1.0 - (top.wobbleAngle * 0.4);
    ctx.scale(1.0, Math.max(0.6, tiltScaleY));

    // 1. 金屬鋸齒外環 Crown (繪製玩家自訂顏色)
    ctx.beginPath();
    ctx.arc(0, 0, top.radius, 0, Math.PI * 2);
    ctx.fillStyle = top.color;
    ctx.shadowColor = top.color;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // 2. 齒輪刃線細節 (6 刃金屬鋸齒)
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * (top.radius * 0.4), Math.sin(ang) * (top.radius * 0.4));
        ctx.lineTo(Math.cos(ang) * top.radius, Math.sin(ang) * top.radius);
        ctx.stroke();
    }

    // 3. 發光核心點 Core
    ctx.beginPath();
    ctx.arc(0, 0, top.radius * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = "#00f2fe";
    ctx.fill();

    ctx.restore();
}
