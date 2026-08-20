// js/engine.js - 《爆上陀螺 Jayblade》2D 物理引擎 (修正爆裂傷害，拉長對戰時間)

export let STADIUM_CX = 400;
export let STADIUM_CY = 300;
export let STADIUM_R = 220;
export let screenShake = 0;

export const STADIUM_POCKETS = [
    { id: "EXTREME", name: "💥 EXTREME FINISH (3分)", minAngle: -Math.PI * 0.65, maxAngle: -Math.PI * 0.35, color: "#00ff66" },
    { id: "OVER_RIGHT", name: "⚠️ OVER FINISH (2分)", minAngle: Math.PI * 0.15, maxAngle: Math.PI * 0.35, color: "#ff9f43" },
    { id: "OVER_LEFT", name: "⚠️ OVER FINISH (2分)", minAngle: Math.PI * 0.65, maxAngle: Math.PI * 0.85, color: "#ff9f43" }
];

export const sparks = [];
export const shockwaves = [];

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
        this.burstResist = config.burstResist || 1.8;
        this.hp = 150;
        this.isKnockedOut = false;
        this.isBurst = false;
        this.knockoutReason = "";
    }

    getRPM() { return Math.round((Math.abs(this.angularVelocity) * 60) / (2 * Math.PI)); }
    getLinearSpeed() { return Math.hypot(this.vx, this.vy) * 0.05; }
    getKineticEnergy() { return 0.5 * this.mass * Math.pow(this.getLinearSpeed(), 2); }
}

export function updateStadiumCenter(width, height) {
    STADIUM_CX = width / 2;
    STADIUM_CY = height / 2;
    STADIUM_R = Math.min(width, height) * 0.38;
}

export function createSparks(x, y, count = 20) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 10;
        sparks.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            decay: 0.04 + Math.random() * 0.04,
            size: 3 + Math.random() * 4,
            color: Math.random() > 0.3 ? "#ffea00" : "#ff3300"
        });
    }
    shockwaves.push({ x, y, r: 10, maxR: 50, alpha: 1.0 });
}

export function updateSparks() {
    for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.x += p.vx; p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0) sparks.splice(i, 1);
    }
    for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.r += 3;
        sw.alpha -= 0.05;
        if (sw.alpha <= 0) shockwaves.splice(i, 1);
    }
    if (screenShake > 0) screenShake *= 0.85;
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
            top.vx = 0; top.vy = 0; top.angularVelocity = 0;
            top.knockoutReason = pocket.name;
            screenShake = 15;
            if (onEventCallback) onEventCallback("KNOCKOUT", { top, pocket });
            return;
        }

        const nx = dx / dist; const ny = dy / dist;
        top.x = STADIUM_CX + nx * (STADIUM_R - top.radius - 2);
        top.y = STADIUM_CY + ny * (STADIUM_R - top.radius - 2);

        const dot = top.vx * nx + top.vy * ny;
        if (dot > 0) {
            top.vx -= 1.85 * dot * nx;
            top.vy -= 1.85 * dot * ny;
            createSparks(top.x, top.y, 8);
        }
    }
}

export function handleTopCollision(topA, topB, onEventCallback) {
    if (topA.isKnockedOut || topB.isKnockedOut || topA.isBurst || topB.isBurst) return;

    const dx = topB.x - topA.x;
    const dy = topB.y - topA.y;
    const dist = Math.hypot(dx, dy);
    const minDist = topA.radius + topB.radius;

    if (dist < minDist && dist > 0) {
        const nx = dx / dist;
        const ny = dy / dist;

        const overlap = (minDist - dist) / 2 + 3.0;
        topA.x -= nx * overlap; topA.y -= ny * overlap;
        topB.x += nx * overlap; topB.y += ny * overlap;

        const rpmA = Math.abs(topA.getRPM());
        const rpmB = Math.abs(topB.getRPM());
        const avgRpm = (rpmA + rpmB) / 2;

        const recoilPower = 4.0 + (avgRpm / 12000) * 4.0;
        
        const randomAngle = (Math.random() - 0.5) * 0.5;
        const cosA = Math.cos(randomAngle);
        const sinA = Math.sin(randomAngle);
        const rx = nx * cosA - ny * sinA;
        const ry = nx * sinA + ny * cosA;

        topA.vx = -rx * recoilPower;
        topA.vy = -ry * recoilPower;
        topB.vx = rx * recoilPower;
        topB.vy = ry * recoilPower;

        screenShake = Math.min(20, recoilPower * 2.5);

        const damage = recoilPower * 0.8;
        topA.hp -= damage / topA.burstResist;
        topB.hp -= damage / topB.burstResist;

        if (topA.hp <= 0) { topA.isBurst = true; topA.angularVelocity = 0; if (onEventCallback) onEventCallback("BURST", { winner: topB, loser: topA }); }
        if (topB.hp <= 0) { topB.isBurst = true; topB.angularVelocity = 0; if (onEventCallback) onEventCallback("BURST", { winner: topA, loser: topB }); }

        const midX = (topA.x + topB.x) / 2;
        const midY = (topA.y + topB.y) / 2;
        createSparks(midX, midY, 16);

        if (onEventCallback) onEventCallback("CLASH", { topA, topB, impulse: recoilPower, x: midX, y: midY });
    }
}

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

            const dx = top.x - STADIUM_CX;
            const dy = top.y - STADIUM_CY;
            const dist = Math.hypot(dx, dy);

            const railMin = STADIUM_R - 22;
            const railMax = STADIUM_R - 6;

            if (dist >= railMin && dist <= railMax && Math.abs(top.angularVelocity) > 400) {
                const tangentX = -dy / dist;
                const tangentY = dx / dist;
                const dir = top.isRightSpin ? 1 : -1;
                
                top.vx += tangentX * 0.7 * dir - (dx / dist) * 0.25;
                top.vy += tangentY * 0.7 * dir - (dy / dist) * 0.25;
                createSparks(top.x, top.y, 2);
            } else if (dist > 5 && dist < railMin) {
                top.vx -= (dx / dist) * 0.25;
                top.vy -= (dy / dist) * 0.25;
            }

            top.vx *= 0.993;
            top.vy *= 0.993;
            top.angularVelocity *= 0.9996;

            if (Math.abs(top.angularVelocity) < 2) top.angularVelocity = 0;

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

    if (screenShake > 0.5) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
    }

    const stadiumGrad = ctx.createRadialGradient(STADIUM_CX, STADIUM_CY, 10, STADIUM_CX, STADIUM_CY, STADIUM_R);
    stadiumGrad.addColorStop(0, "#ffffff");
    stadiumGrad.addColorStop(0.75, "#e2e8f0");
    stadiumGrad.addColorStop(1, "#cbd5e1");

    ctx.beginPath();
    ctx.arc(STADIUM_CX, STADIUM_CY, STADIUM_R, 0, Math.PI * 2);
    ctx.fillStyle = stadiumGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(STADIUM_CX, STADIUM_CY, STADIUM_R - 12, 0, Math.PI * 2);
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 8;
    ctx.stroke();

    STADIUM_POCKETS.forEach(p => {
        ctx.beginPath();
        ctx.arc(STADIUM_CX, STADIUM_CY, STADIUM_R + 2, p.minAngle, p.maxAngle);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 14;
        ctx.stroke();
    });

    shockwaves.forEach(sw => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 242, 254, ${sw.alpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
    });

    sparks.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.restore();
    });

    ctx.restore();
}

export function draw2DTop(ctx, top) {
    if (top.isKnockedOut || top.isBurst) return;

    ctx.save();
    if (screenShake > 0.5) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
    }

    ctx.translate(top.x, top.y);
    ctx.rotate(top.rotation);

    ctx.beginPath();
    ctx.arc(0, 0, top.radius, 0, Math.PI * 2);
    ctx.fillStyle = top.color;
    ctx.shadowColor = top.color;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * (top.radius * 0.35), Math.sin(ang) * (top.radius * 0.35));
        ctx.lineTo(Math.cos(ang) * top.radius, Math.sin(ang) * top.radius);
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(0, 0, top.radius * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = "#00f2fe";
    ctx.fill();

    ctx.restore();
}
