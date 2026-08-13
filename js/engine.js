// js/engine.js - 《爆上陀螺 Jayblade》全狀態剛體碰撞力學引擎

export let STADIUM_CX = 400;
export let STADIUM_CY = 300;
export let STADIUM_R = 220;

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
        
        // 🌀 剛體進動與傾斜狀態
        this.wobbleAngle = 0;       // 傾斜角 (弧度)
        this.wobblePhase = Math.random() * Math.PI * 2; // 搖晃相位
        
        this.isRightSpin = config.isRightSpin ?? true;
        const initialRpm = config.rpm || 12000;
        this.angularVelocity = (initialRpm * 2 * Math.PI) / 60 * (this.isRightSpin ? 1 : -1);

        this.radius = config.radius || 24;
        this.mass = config.mass || 0.048;
        this.burstResist = config.burstResist || 0.85;
        this.friction = config.friction || 0.22;

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

        const nx = dx / dist;
        const ny = dy / dist;

        top.x = STADIUM_CX + nx * (STADIUM_R - top.radius);
        top.y = STADIUM_CY + ny * (STADIUM_R - top.radius);

        const dot = top.vx * nx + top.vy * ny;
        if (dot > 0) {
            const restitution = 0.75;
            top.vx -= (1 + restitution) * dot * nx;
            top.vy -= (1 + restitution) * dot * ny;

            // 撞牆同時消耗自轉轉速並引發微幅搖晃
            top.angularVelocity *= 0.985;
            top.wobbleAngle = Math.min(0.4, top.wobbleAngle + 0.05);

            createSparks(top.x, top.y, 8);

            if (onEventCallback) onEventCallback("WALL_HIT", { top, x: top.x, y: top.y });
        }
    }
}

// ---------------------------------------------------------------------------
// 💥 碰撞瞬間全狀態力學變換 (包含平彈、角動量損耗、傾斜力矩、血量扣減)
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

        // 1. 位置硬隔離
        const overlap = (minDist - dist) / 2 + 0.8;
        topA.x -= nx * overlap;
        topA.y -= ny * overlap;
        topB.x += nx * overlap;
        topB.y += ny * overlap;

        // 2. 計算轉速反衝速度 (Recoil Speed)
        const rpmA = Math.abs(topA.getRPM());
        const rpmB = Math.abs(topB.getRPM());
        const avgRpm = (rpmA + rpmB) / 2;

        const recoilSpeed = avgRpm > 100 ? (2.0 + (avgRpm / 12000) * 3.0) : 1.0;

        // 3. 平動速度彈開
        topA.vx = -nx * recoilSpeed - topA.vx * 0.2;
        topA.vy = -ny * recoilSpeed - topA.vy * 0.2;
        topB.vx = nx * recoilSpeed - topB.vx * 0.2;
        topB.vy = ny * recoilSpeed - topB.vy * 0.2;

        // 4. 🌀 碰撞引發陀螺傾斜力矩 (Tilt Torque)
        const tiltImpact = Math.min(0.25, recoilSpeed * 0.05);
        topA.wobbleAngle = Math.min(0.45, topA.wobbleAngle + tiltImpact);
        topB.wobbleAngle = Math.min(0.45, topB.wobbleAngle + tiltImpact);

        // 5. 旋轉力學 (同旋扣速與血量 vs 異旋吸轉)
        const isSameSpin = topA.isRightSpin === topB.isRightSpin;

        if (isSameSpin) {
            // 同旋對撞：急劇消耗角動量，扣減爆裂血量
            const rpmLossRate = 0.06 / Math.min(topA.burstResist, topB.burstResist);
            topA.angularVelocity *= (1 - rpmLossRate);
            topB.angularVelocity *= (1 - rpmLossRate);

            const damage = recoilSpeed * 4.0;
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
            // 異旋吸轉 (Spin Steal)：根據相對切向表面速度進行角動量轉移
            const transferRate = 0.14;
            const avgSpin = (Math.abs(topA.angularVelocity) + Math.abs(topB.angularVelocity)) / 2;

            if (Math.abs(topA.angularVelocity) > Math.abs(topB.angularVelocity)) {
                topA.angularVelocity *= (1 - transferRate);
                topB.angularVelocity += (topB.isRightSpin ? 1 : -1) * (avgSpin * transferRate);
            } else {
                topB.angularVelocity *= (1 - transferRate);
                topA.angularVelocity += (topA.isRightSpin ? 1 : -1) * (avgSpin * transferRate);
            }
        }

        const midX = (topA.x + topB.x) / 2;
        const midY = (topA.y + topB.y) / 2;
        createSparks(midX, midY, 18);

        if (onEventCallback) {
            onEventCallback("CLASH", { topA, topB, impulse: recoilSpeed, x: midX, y: midY });
        }
    }
}

// ---------------------------------------------------------------------------
// 物理主循環 (含傾斜、拖地摩擦與動能衰減)
// ---------------------------------------------------------------------------
export function updatePhysics2D(tops, dt, onEventCallback) {
    const subSteps = 4;
    const subDt = dt / subSteps;

    for (let step = 0; step < subSteps; step++) {
        for (let i = 0; i < tops.length; i++) {
            const top = tops[i];
            if (top.isKnockedOut || top.isBurst) continue;

            const currentRpm = Math.abs(top.getRPM());

            // 轉速降至 3800 RPM 以下開始自然進動搖晃
            if (currentRpm < 3800 && currentRpm > 0) {
                const ratio = (3800 - currentRpm) / 3800;
                top.wobbleAngle = Math.max(top.wobbleAngle, 0.38 * Math.pow(ratio, 1.8));
                top.wobblePhase += (16 + (3800 - currentRpm) * 0.01) * subDt;
            }

            top.x += top.vx * subDt * 60;
            top.y += top.vy * subDt * 60;
            top.rotation += (top.angularVelocity * subDt);

            // 深碗坡度向心力
            const dx = top.x - STADIUM_CX;
            const dy = top.y - STADIUM_CY;
            const dist = Math.hypot(dx, dy);

            if (dist > 5 && dist < STADIUM_R) {
                const bowlPull = 0.22 * (dist / STADIUM_R);
                top.vx -= (dx / dist) * bowlPull;
                top.vy -= (dy / dist) * bowlPull;
            }

            // 傾斜拖地時，平動與轉速衰減速度成倍增加
            const dragFactor = 1.0 + (top.wobbleAngle * 2.5);
            top.vx *= Math.max(0.92, 0.994 / dragFactor);
            top.vy *= Math.max(0.92, 0.994 / dragFactor);
            top.angularVelocity *= Math.max(0.90, 0.9996 / dragFactor);

            if (Math.abs(top.angularVelocity) < 2) {
                top.angularVelocity = 0;
            }

            check2DStadiumBoundary(top, onEventCallback);
        }

        for (let i = 0; i < tops.length; i++) {
            for (let j = i + 1; j < tops.length; j++) {
                handleTopCollision(tops[i], tops[j], onEventCallback);
            }
        }
    }

    updateSparks();
}

export function draw2DStadiumLayout(ctx, width, height) {
    updateStadiumCenter(width, height);

    ctx.save();

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

    ctx.beginPath();
    ctx.arc(STADIUM_CX, STADIUM_CY, STADIUM_R * 0.25, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(2, 132, 199, 0.45)";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(STADIUM_CX, STADIUM_CY, STADIUM_R - 10, 0, Math.PI * 2);
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 8;
    ctx.shadowColor = "#10b981";
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

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

    ctx.beginPath();
    ctx.arc(STADIUM_CX, STADIUM_CY, STADIUM_R + 6, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(56, 189, 248, 0.85)";
    ctx.lineWidth = 4;
    ctx.stroke();

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

export function draw2DTop(ctx, top) {
    if (top.isKnockedOut || top.isBurst) return;

    ctx.save();

    const wobbleOffsetX = Math.cos(top.wobblePhase) * (top.wobbleAngle * 22);
    const wobbleOffsetY = Math.sin(top.wobblePhase) * (top.wobbleAngle * 22);

    ctx.translate(top.x + wobbleOffsetX, top.y + wobbleOffsetY);
    ctx.rotate(top.rotation);

    const tiltScaleY = 1.0 - (top.wobbleAngle * 0.4);
    ctx.scale(1.0, Math.max(0.6, tiltScaleY));

    ctx.beginPath();
    ctx.arc(0, 0, top.radius, 0, Math.PI * 2);
    ctx.fillStyle = top.color;
    ctx.shadowColor = top.color;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * (top.radius * 0.4), Math.sin(ang) * (top.radius * 0.4));
        ctx.lineTo(Math.cos(ang) * top.radius, Math.sin(ang) * top.radius);
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(0, 0, top.radius * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = "#00f2fe";
    ctx.fill();

    ctx.restore();
}
