// js/engine.js - 《爆上陀螺 Jayblade》賽場爽快版物理引擎 (含 X-Dash 軌道衝刺與金屬重擊彈開)

export let STADIUM_CX = 400;
export let STADIUM_CY = 300;
export let STADIUM_R = 220;

// Beyblade X 三大擊飛口袋
export const STADIUM_POCKETS = [
    {
        id: "EXTREME",
        name: "💥 EXTREME FINISH (3分)",
        minAngle: -Math.PI * 0.65,
        maxAngle: -Math.PI * 0.35,
        color: "#00ff66",
        score: 3
    },
    {
        id: "OVER_RIGHT",
        name: "⚠️ OVER FINISH (2分)",
        minAngle: Math.PI * 0.15,
        maxAngle: Math.PI * 0.35,
        color: "#ff9f43",
        score: 2
    },
    {
        id: "OVER_LEFT",
        name: "⚠️ OVER FINISH (2分)",
        minAngle: Math.PI * 0.65,
        maxAngle: Math.PI * 0.85,
        color: "#ff9f43",
        score: 2
    }
];

export const sparks = [];

export class Top2D {
    constructor(config) {
        this.id = config.id || Math.random().toString(36).substring(2, 9);
        this.name = config.name || "自訂陀螺";
        this.color = config.color || "#0284c7";
        
        this.x = config.x || STADIUM_CX;
        this.y = config.y || STADIUM_CY;
        this.vx = config.vx || 0;
        this.vy = config.vy || 0;
        this.rotation = Math.random() * Math.PI * 2;
        
        this.isRightSpin = config.isRightSpin ?? true;
        const initialRpm = config.rpm || 12000;
        this.angularVelocity = (initialRpm * 2 * Math.PI) / 60 * (this.isRightSpin ? 1 : -1);

        this.radius = config.radius || 24;
        this.mass = config.mass || 0.048;
        this.burstResist = config.burstResist || 0.85;

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
        return 0.5 * this.mass * Math.pow(v, 2) + 0.00005 * Math.pow(w, 2);
    }
}

export function updateStadiumCenter(width, height) {
    STADIUM_CX = width / 2;
    STADIUM_CY = height / 2;
    STADIUM_R = Math.min(width, height) * 0.38;
}

export function createSparks(x, y, count = 16) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 8;
        sparks.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            decay: 0.04 + Math.random() * 0.03,
            size: 2.5 + Math.random() * 3.5,
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

// ---------------------------------------------------------------------------
// 護牆碰撞與口袋擊飛 (Wall Bounce & Pocket Knockout)
// ---------------------------------------------------------------------------
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

        // 強力牆面法向向內彈回
        const nx = dx / dist;
        const ny = dy / dist;

        top.x = STADIUM_CX + nx * (STADIUM_R - top.radius - 1);
        top.y = STADIUM_CY + ny * (STADIUM_R - top.radius - 1);

        const dot = top.vx * nx + top.vy * ny;
        if (dot > 0) {
            const restitution = 0.85; // 高彈性牆面
            top.vx -= (1 + restitution) * dot * nx;
            top.vy -= (1 + restitution) * dot * ny;

            top.angularVelocity *= 0.985;
            createSparks(top.x, top.y, 8);

            if (onEventCallback) onEventCallback("WALL_HIT", { top, x: top.x, y: top.y });
        }
    }
}

// ---------------------------------------------------------------------------
// ⚡ 核心修復：清脆重擊彈開與衝量計算 (爽快打擊感)
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

        // 1. 硬性物理隔離 (強制分離 2.5px，徹底消除黏連)
        const overlap = (minDist - dist) / 2 + 2.5;
        topA.x -= nx * overlap;
        topA.y -= ny * overlap;
        topB.x += nx * overlap;
        topB.y += ny * overlap;

        // 2. 轉速轉化為暴發性彈開衝力
        const rpmA = Math.abs(topA.getRPM());
        const rpmB = Math.abs(topB.getRPM());
        const avgRpm = (rpmA + rpmB) / 2;

        // 基礎重擊彈開速度 (強勁的 3.8 ~ 7.5 衝刺彈飛)
        const recoilPower = 3.8 + (avgRpm / 12000) * 3.7;

        // 3. 直接給予向外強烈反彈速度向量
        topA.vx = -nx * recoilPower + (Math.random() - 0.5) * 1.5;
        topA.vy = -ny * recoilPower + (Math.random() - 0.5) * 1.5;
        topB.vx = nx * recoilPower + (Math.random() - 0.5) * 1.5;
        topB.vy = ny * recoilPower + (Math.random() - 0.5) * 1.5;

        // 4. 同旋 vs 異旋戰術計算
        const isSameSpin = topA.isRightSpin === topB.isRightSpin;

        if (isSameSpin) {
            // 同旋硬碰撞：大量消耗轉速與扣血
            topA.angularVelocity *= (1 - 0.06 / topA.burstResist);
            topB.angularVelocity *= (1 - 0.06 / topB.burstResist);

            const damage = recoilPower * 4.2;
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
            // 異旋吸轉 (Spin Steal)
            const avgSpin = (Math.abs(topA.angularVelocity) + Math.abs(topB.angularVelocity)) / 2;
            const transferRate = 0.14;

            if (Math.abs(topA.angularVelocity) > Math.abs(topB.angularVelocity)) {
                topA.angularVelocity *= (1 - transferRate);
                topB.angularVelocity += (topB.isRightSpin ? 1 : -1) * (avgSpin * transferRate);
            } else {
                topB.angularVelocity *= (1 - transferRate);
                topA.angularVelocity += (topA.isRightSpin ? 1 : -1) * (avgSpin * transferRate);
            }
        }

        // 撞擊火花
        const midX = (topA.x + topB.x) / 2;
        const midY = (topA.y + topB.y) / 2;
        createSparks(midX, midY, 20);

        if (onEventCallback) {
            onEventCallback("CLASH", { topA, topB, impulse: recoilPower, x: midX, y: midY });
        }
    }
}

// ---------------------------------------------------------------------------
// 物理主循環 (含 X-Dash 軌道加速與全時動能連動)
// ---------------------------------------------------------------------------
export function updatePhysics2D(tops, dt, onEventCallback) {
    const subSteps = 4;
    const subDt = dt / subSteps;

    for (let step = 0; step < subSteps; step++) {
        for (let i = 0; i < tops.length; i++) {
            const top = tops[i];
            if (top.isKnockedOut || top.isBurst) continue;

            // 1. 位置與自轉更新
            top.x += top.vx * subDt * 60;
            top.y += top.vy * subDt * 60;
            top.rotation += (top.angularVelocity * subDt);

            const dx = top.x - STADIUM_CX;
            const dy = top.y - STADIUM_CY;
            const dist = Math.hypot(dx, dy);

            // 2. ⚡【Beyblade X 核心特徵】X-Dash 綠色軌道極速衝刺！
            const railDistMin = STADIUM_R - 22;
            const railDistMax = STADIUM_R - 6;

            if (dist >= railDistMin && dist <= railDistMax && Math.abs(top.angularVelocity) > 500) {
                // 沿切線方向給予暴發性 X-Dash 加速
                const tangentX = -dy / dist;
                const tangentY = dx / dist;
                const dashDirection = top.isRightSpin ? 1 : -1;

                const dashAccel = 0.45; // X-Dash 衝刺加速度
                top.vx += tangentX * dashAccel * dashDirection;
                top.vy += tangentY * dashAccel * dashDirection;

                if (Math.random() > 0.6) {
                    createSparks(top.x, top.y, 2); // 軌道火花
                }
            } else if (dist > 5 && dist < railDistMin) {
                // 盤心深碗向心引力 (拉回中央進行對撞)
                const bowlPull = 0.25 * (dist / STADIUM_R);
                top.vx -= (dx / dist) * bowlPull;
                top.vy -= (dy / dist) * bowlPull;
            }

            // 3. 平滑動能衰減 (維持約 18-25 秒熱血對戰)
            top.vx *= 0.993;
            top.vy *= 0.993;
            top.angularVelocity *= 0.9995;

            if (Math.abs(top.angularVelocity) < 2) {
                top.angularVelocity = 0;
            }

            check2DStadiumBoundary(top, onEventCallback);
        }

        // 4. 雙陀螺對撞檢測
        for (let i = 0; i < tops.length; i++) {
            for (let j = i + 1; j < tops.length; j++) {
                handleTopCollision(tops[i], tops[j], onEventCallback);
            }
        }
    }

    updateSparks();
}

// ---------------------------------------------------------------------------
// 繪製賽場級瓷白美化盤面
// ---------------------------------------------------------------------------
export function draw2DStadiumLayout(ctx, width, height) {
    updateStadiumCenter(width, height);

    ctx.save();

    // 1. 瓷白光澤底盤
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

    // 2. 盤心藍色幾何環
    ctx.beginPath();
    ctx.arc(STADIUM_CX, STADIUM_CY, STADIUM_R * 0.25, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(2, 132, 199, 0.45)";
    ctx.lineWidth = 4;
    ctx.stroke();

    // 3. 螢光綠 X-Dash 衝刺軌道齒輪環
    ctx.beginPath();
    ctx.arc(STADIUM_CX, STADIUM_CY, STADIUM_R - 12, 0, Math.PI * 2);
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

    // 5. 外圍霓虹護牆
    ctx.beginPath();
    ctx.arc(STADIUM_CX, STADIUM_CY, STADIUM_R + 6, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
    ctx.lineWidth = 4;
    ctx.stroke();

    // 6. 繪製火花
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
// 繪製金屬質感 2D 陀螺
// ---------------------------------------------------------------------------
export function draw2DTop(ctx, top) {
    if (top.isKnockedOut || top.isBurst) return;

    ctx.save();
    ctx.translate(top.x, top.y);
    ctx.rotate(top.rotation);

    // 1. 金屬外環 Crown (玩家自訂顏色)
    ctx.beginPath();
    ctx.arc(0, 0, top.radius, 0, Math.PI * 2);
    ctx.fillStyle = top.color;
    ctx.shadowColor = top.color;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // 2. 鋸齒金屬細節 (6 刃)
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * (top.radius * 0.4), Math.sin(ang) * (top.radius * 0.4));
        ctx.lineTo(Math.cos(ang) * top.radius, Math.sin(ang) * top.radius);
        ctx.stroke();
    }

    // 3. 發光核心
    ctx.beginPath();
    ctx.arc(0, 0, top.radius * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = "#00f2fe";
    ctx.fill();

    ctx.restore();
}
