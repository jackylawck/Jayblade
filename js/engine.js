// js/engine.js - 《爆上陀螺 Jayblade》2D 剛體力學物理演算與刀刃反衝碰撞引擎

export let STADIUM_CX = 400; // 盤心 X 座標
export let STADIUM_CY = 300; // 盤心 Y 座標
export let STADIUM_R = 220;  // 戰鬥盤內壁半徑

// Beyblade X 三大擊飛口袋角度範圍 (極座標弧度)
export const STADIUM_POCKETS = [
    {
        id: "EXTREME",
        name: "💥 EXTREME FINISH (3分)",
        minAngle: -Math.PI * 0.65, // 頂部中央 Extreme 缺口
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
// 1. 2D 陀螺剛體類別 (Top2D)
// ---------------------------------------------------------------------------
export class Top2D {
    constructor(config) {
        this.id = config.id || Math.random().toString(36).substring(2, 9);
        this.name = config.name || "自訂陀螺";
        this.color = config.color || "#0284c7"; // 自訂視覺顏色
        
        // 位置與運動學狀態
        this.x = config.x || STADIUM_CX;
        this.y = config.y || STADIUM_CY;
        this.vx = config.vx || 0;
        this.vy = config.vy || 0;
        this.rotation = Math.random() * Math.PI * 2;
        
        // 旋轉角速度 (rad/s) 與旋轉方向
        this.isRightSpin = config.isRightSpin ?? true;
        const initialRpm = config.rpm || 12000;
        this.angularVelocity = (initialRpm * 2 * Math.PI) / 60 * (this.isRightSpin ? 1 : -1);

        // 物理力學屬性
        this.radius = config.radius || 24;           // 撞擊半徑
        this.mass = config.mass || 0.045;             // 質量
        this.burstResist = config.burstResist || 0.85; // 爆裂抗性
        this.friction = config.friction || 0.35;

        const rMeters = this.radius * 0.005;
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

    getKineticEnergy() {
        const v = this.getLinearSpeed();
        const w = Math.abs(this.angularVelocity);
        return 0.5 * this.mass * Math.pow(v, 2) + 0.5 * this.inertia * Math.pow(w, 2);
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
            decay: 0.03 + Math.random() * 0.03,
            size: 2 + Math.random() * 4,
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
        if (p.life <= 0) {
            sparks.splice(i, 1);
        }
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

        const nx = dx / dist;
        const ny = dy / dist;

        top.x = STADIUM_CX + nx * (STADIUM_R - top.radius);
        top.y = STADIUM_CY + ny * (STADIUM_R - top.radius);

        const dot = top.vx * nx + top.vy * ny;
        if (dot > 0) {
            const restitution = 0.75;
            top.vx -= (1 + restitution) * dot * nx;
            top.vy -= (1 + restitution) * dot * ny;

            top.angularVelocity *= 0.988;
            createSparks(top.x, top.y, 8);

            if (onEventCallback) onEventCallback("WALL_HIT", { top, x: top.x, y: top.y });
        }
    }
}

// ---------------------------------------------------------------------------
// 💥 雙陀螺對撞力學（含刀刃咬合強烈反衝彈開）
// ---------------------------------------------------------------------------
export function handleTopCollision(topA, topB, onEventCallback) {
    if (topA.isKnockedOut || topB.isKnockedOut || topA.isBurst || topB.isBurst) return;

    const dx = topB.x - topA.x;
    const dy = topB.y - topA.y;
    const dist = Math.hypot(dx, dy);
    const minDist = topA.radius + topB.radius;

    // 觸發碰撞條件：距離小於半徑之和
    if (dist < minDist && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;

        // 1. 強制推開重疊，加上 0.5px 硬隔離，防止黏連
        const overlap = (minDist - dist) / 2 + 0.5;
        topA.x -= nx * overlap;
        topA.y -= ny * overlap;
        topB.x += nx * overlap;
        topB.y += ny * overlap;

        // 2. 法向相對平移速度
        const rvx = topB.vx - topA.vx;
        const rvy = topB.vy - topA.vy;
        const velAlongNormal = rvx * nx + rvy * ny;

        // 3. 💥 齒輪刀刃轉速反衝力 (Rotational Engagement Knockback)
        // 即使平移速度極小，只要陀螺在自轉，金屬鋸齒咬合就會爆發強大反衝力將雙方彈開！
        const rpmA = topA.getRPM();
        const rpmB = topB.getRPM();
        const avgRpm = (rpmA + rpmB) / 2;

        // 轉速高於 500 RPM 時，每次咬合獲得基礎彈開向量 (速度 2.0 ~ 5.5 m/s 級別)
        const baseRecoilVelocity = Math.min(5.5, 2.0 + (avgRpm / 12000) * 3.5);

        // 如果接近中，或者即便停止接近但仍在強烈重疊咬合中
        if (velAlongNormal < 0 || dist < minDist) {
            const restitution = 1.25; // 高彈開係數，模擬金屬齒輪爆發性彈開

            // 計算組合了平移速度與轉速反衝的衝量
            const effectiveVel = Math.min(velAlongNormal, -baseRecoilVelocity);
            let impulseMag = -(1 + restitution) * effectiveVel / (1 / topA.mass + 1 / topB.mass);

            // 施加強烈反衝撞開速度
            topA.vx -= (impulseMag / topA.mass) * nx;
            topA.vy -= (impulseMag / topA.mass) * ny;
            topB.vx += (impulseMag / topB.mass) * nx;
            topB.vy += (impulseMag / topB.mass) * ny;

            // 雙旋力學 (同旋 vs 異旋吸轉)
            const isSameSpin = topA.isRightSpin === topB.isRightSpin;

            if (isSameSpin) {
                // 【同旋對撞】強烈對彈，扣減轉速與血量
                const damage = impulseMag * 0.15;
                topA.angularVelocity *= (1 - 0.08 / topA.burstResist);
                topB.angularVelocity *= (1 - 0.08 / topB.burstResist);

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
                // 【異旋吸轉 Spin Steal】咬合彈開的同時轉移轉速
                const avgSpin = (Math.abs(topA.angularVelocity) + Math.abs(topB.angularVelocity)) / 2;
                const transferRate = 0.15;

                if (Math.abs(topA.angularVelocity) > Math.abs(topB.angularVelocity)) {
                    topA.angularVelocity *= (1 - transferRate);
                    topB.angularVelocity += (topB.isRightSpin ? 1 : -1) * (avgSpin * transferRate);
                } else {
                    topB.angularVelocity *= (1 - transferRate);
                    topA.angularVelocity += (topA.isRightSpin ? 1 : -1) * (avgSpin * transferRate);
                }
            }

            // 觸發多粒子撞擊火花
            const midX = (topA.x + topB.x) / 2;
            const midY = (topA.y + topB.y) / 2;
            createSparks(midX, midY, 18);

            if (onEventCallback) {
                onEventCallback("CLASH", { topA, topB, impulse: impulseMag, x: midX, y: midY });
            }
        }
    }
}

// ---------------------------------------------------------------------------
// 6. 物理主循環
// ---------------------------------------------------------------------------
export function updatePhysics2D(tops, dt, onEventCallback) {
    const subSteps = 4;
    const subDt = dt / subSteps;

    for (let step = 0; step < subSteps; step++) {
        for (let i = 0; i < tops.length; i++) {
            const top = tops[i];
            if (top.isKnockedOut || top.isBurst) continue;

            top.x += top.vx * subDt * 60;
            top.y += top.vy * subDt * 60;
            top.rotation += (top.angularVelocity * subDt);

            // 向心坡度引力 (Bowl Gravity)
            const dx = top.x - STADIUM_CX;
            const dy = top.y - STADIUM_CY;
            const dist = Math.hypot(dx, dy);

            if (dist > 5 && dist < STADIUM_R) {
                const bowlPull = 0.22 * (dist / STADIUM_R);
                top.vx -= (dx / dist) * bowlPull;
                top.vy -= (dy / dist) * bowlPull;
            }

            // 20-30 秒持久對戰衰減率
            top.vx *= 0.994;
            top.vy *= 0.994;
            top.angularVelocity *= 0.9996;

            if (Math.abs(top.angularVelocity) < 2) {
                top.angularVelocity = 0;
            }

            check2DStadiumBoundary(top, onEventCallback);
        }

        // 陀螺碰撞檢測與反衝彈開
        for (let i = 0; i < tops.length; i++) {
            for (let j = i + 1; j < tops.length; j++) {
                handleTopCollision(tops[i], tops[j], onEventCallback);
            }
        }
    }

    updateSparks();
}

// ---------------------------------------------------------------------------
// 7. 賽場級美化版 2D 戰鬥盤 Canvas 繪製
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

    // 4. 三大擊飛口袋 (Pocket Gaps)
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

    // 6. 2D 碰撞火花粒子
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
// 8. 繪製金屬質感 2D 陀螺
// ---------------------------------------------------------------------------
export function draw2DTop(ctx, top) {
    if (top.isKnockedOut || top.isBurst) return;

    ctx.save();
    ctx.translate(top.x, top.y);
    ctx.rotate(top.rotation);

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
