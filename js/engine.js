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
/**
 * @file engine3d.js
 * @description 真實物理級：由上而下空降著地、3D鏟起偏心衝量、碗狀坡面回流連續交鋒
 * @author Jacky Law
 * @license MIT
 */

export var STADIUM_RADIUS = 9.0;
export var WALL_HEIGHT = 2.2;

export var scene, camera, renderer, controls, world, defaultMaterial, stadiumMaterial;
export var activeTops = [];
export var sparkParticles = [];

export const PARTS_PHYSICS = {
    CROWN: {
        FEATHER: { mass: 0.040, radius: 1.05, drag: 0.0003, burstResist: 120, liftCoef: 1.2 },
        DRAKE:   { mass: 0.048, radius: 1.00, drag: 0.0004, burstResist: 140, liftCoef: 1.0 },
        HEAVY:   { mass: 0.058, radius: 0.98, drag: 0.0005, burstResist: 160, liftCoef: 0.8 },
        WIZARD:  { mass: 0.045, radius: 1.02, drag: 0.0003, burstResist: 130, liftCoef: 1.1 },
        PHOENIX: { mass: 0.052, radius: 1.08, drag: 0.0004, burstResist: 150, liftCoef: 1.3 },
        SCYTHE:  { mass: 0.046, radius: 1.01, drag: 0.0004, burstResist: 135, liftCoef: 1.1 },
        RHINO:   { mass: 0.050, radius: 0.92, drag: 0.0005, burstResist: 170, liftCoef: 0.9 },
        VIPER:   { mass: 0.044, radius: 1.03, drag: 0.0004, burstResist: 125, liftCoef: 1.2 }
    },
    TIP: {
        FLAT:   { friction: 0.06, angularDamping: 0.0003, grip: 2.2, contactRadius: 0.006, restitution: 0.45 },
        BALL:   { friction: 0.015, angularDamping: 0.0001, grip: 0.6, contactRadius: 0.002, restitution: 0.60 },
        NEEDLE: { friction: 0.02, angularDamping: 0.00015, grip: 1.0, contactRadius: 0.001, restitution: 0.50 },
        ACCEL:  { friction: 0.07, angularDamping: 0.0004, grip: 2.6, contactRadius: 0.005, restitution: 0.40 },
        HEXA:   { friction: 0.03, angularDamping: 0.0002, grip: 1.4, contactRadius: 0.003, restitution: 0.55 },
        POINT:  { friction: 0.025, angularDamping: 0.0002, grip: 1.1, contactRadius: 0.003, restitution: 0.55 },
        TAPER:  { friction: 0.04, angularDamping: 0.00025, grip: 1.8, contactRadius: 0.004, restitution: 0.48 },
        RUBBER: { friction: 0.09, angularDamping: 0.0006, grip: 3.2, contactRadius: 0.007, restitution: 0.25 }
    }
};

export function init3DEngine(containerEl) {
    try {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x060913);

        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 16, 18);

        renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        containerEl.appendChild(renderer.domElement);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        scene.add(new THREE.AmbientLight(0xffffff, 0.65));
        const mainSpot = new THREE.SpotLight(0xffffff, 2.2);
        mainSpot.position.set(0, 22, 6);
        mainSpot.castShadow = true;
        scene.add(mainSpot);

        world = new CANNON.World();
        world.gravity.set(0, -9.80665, 0);

        defaultMaterial = new CANNON.Material('default');
        stadiumMaterial = new CANNON.Material('stadium');
        world.addContactMaterial(new CANNON.ContactMaterial(defaultMaterial, stadiumMaterial, { friction: 0.12, restitution: 0.35 }));

        create3DStadiumLayout();
    } catch (err) {
        console.error("🚨 3D Engine Init Error:", err);
    }
}

export const sparks = [];
export const shockwaves = [];
function create3DStadiumLayout() {
    const geo = new THREE.CylinderGeometry(STADIUM_RADIUS, STADIUM_RADIUS - 2.2, 1.0, 64);
    const mat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.15, metalness: 0.1 });
    const stadiumMesh = new THREE.Mesh(geo, mat);
    stadiumMesh.position.y = -0.5;
    stadiumMesh.receiveShadow = true;
    scene.add(stadiumMesh);

    const centerRingGeo = new THREE.RingGeometry(1.2, 1.5, 32);
    const centerRingMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, side: THREE.DoubleSide });
    const centerRing = new THREE.Mesh(centerRingGeo, centerRingMat);
    centerRing.rotation.x = Math.PI / 2;
    centerRing.position.y = 0.01;
    scene.add(centerRing);

    const railGeo = new THREE.TorusGeometry(STADIUM_RADIUS - 0.3, 0.22, 16, 64);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.7 });
    const railMesh = new THREE.Mesh(railGeo, railMat);
    railMesh.rotation.x = Math.PI / 2;
    railMesh.position.y = 0.05;
    scene.add(railMesh);

    const wallGeo = new THREE.CylinderGeometry(STADIUM_RADIUS, STADIUM_RADIUS, WALL_HEIGHT, 64, 1, true);
    const wallMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35, roughness: 0.05 });
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.position.y = WALL_HEIGHT / 2;
    scene.add(wallMesh);

    const groundBody = new CANNON.Body({ mass: 0, material: stadiumMaterial });
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(groundBody);
}

export class Top2D {
export class Beyblade3DPhysics {
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
        this.burstResist = config.burstResist || 1.8; // 調高爆裂抗性

        this.hp = 150; // 調高基礎血量，防止太快爆裂
        this.name = config.name;
        this.isRightSpin = config.isRightSpin;

        const crownKey = config.crownKey || "DRAKE";
        const tipKey = config.tipKey || "FLAT";
        const crownData = PARTS_PHYSICS.CROWN[crownKey] || PARTS_PHYSICS.CROWN.DRAKE;
        const tipData = PARTS_PHYSICS.TIP[tipKey] || PARTS_PHYSICS.TIP.FLAT;

        this.radius = crownData.radius;
        this.mass = crownData.mass;
        this.dragCoef = crownData.drag;
        this.liftCoef = crownData.liftCoef || 1.0;
        this.tipFriction = tipData.friction;
        this.contactRadius = tipData.contactRadius;
        this.restitution = tipData.restitution;
        this.grip = tipData.grip || 1.0;

        this.hp = crownData.burstResist;
        this.maxHp = crownData.burstResist;
        this.isKnockedOut = false;
        this.isBurst = false;
        this.knockoutReason = "";
    }
        this.lastHitTime = 0;

    getRPM() { return Math.round((Math.abs(this.angularVelocity) * 60) / (2 * Math.PI)); }
    getLinearSpeed() { return Math.hypot(this.vx, this.vy) * 0.05; }
    getKineticEnergy() { return 0.5 * this.mass * Math.pow(this.getLinearSpeed(), 2); }
}
        const rMeters = this.radius * 0.03;
        this.Ixx_b = 0.25 * this.mass * Math.pow(rMeters, 2) + (1/12) * this.mass * Math.pow(0.015, 2);
        this.Iyy_b = 0.50 * this.mass * Math.pow(rMeters, 2);
        this.Izz_b = this.Ixx_b;

export function updateStadiumCenter(width, height) {
    STADIUM_CX = width / 2;
    STADIUM_CY = height / 2;
    STADIUM_R = Math.min(width, height) * 0.38;
}
        this.h_cm = 0.015;
        this.lastImpulseMag = 0;

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
        this.body = new CANNON.Body({
            mass: this.mass,
            material: defaultMaterial,
            linearDamping: this.tipFriction * 0.1,
            angularDamping: tipData.angularDamping
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
        this.body.addShape(new CANNON.Sphere(this.radius * 0.8));
        
        // 🚀 真實由上而下發射高度 (y = 1.6m ~ 2.0m)
        this.body.position.set(config.x, config.y || 1.8, config.z);

        const spinRad = (config.rpm * 2 * Math.PI) / 60 * (this.isRightSpin ? -1 : 1);
        this.body.angularVelocity.set(0, spinRad, 0);

        this.group = new THREE.Group();
        const crownGeo = new THREE.CylinderGeometry(this.radius, this.radius * 0.8, 0.35, 16);
        const crownMat = new THREE.MeshStandardMaterial({ color: config.color || 0x0284c7, metalness: 0.9, roughness: 0.15 });
        const crownMesh = new THREE.Mesh(crownGeo, crownMat);
        crownMesh.castShadow = true;
        this.group.add(crownMesh);

        for (let b = 0; b < 6; b++) {
            const toothGeo = new THREE.BoxGeometry(0.2, 0.3, 0.4);
            const toothMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });
            const tooth = new THREE.Mesh(toothGeo, toothMat);
            const ang = (b / 6) * Math.PI * 2;
            tooth.position.set(Math.cos(ang) * (this.radius * 0.88), 0, Math.sin(ang) * (this.radius * 0.88));
            tooth.rotation.y = -ang;
            tooth.castShadow = true;
            this.group.add(tooth);
        }

        const nx = dx / dist; const ny = dy / dist;
        top.x = STADIUM_CX + nx * (STADIUM_R - top.radius - 2);
        top.y = STADIUM_CY + ny * (STADIUM_R - top.radius - 2);
        const coreGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.15, 16);
        const coreMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.6 });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        coreMesh.position.y = 0.22;
        this.group.add(coreMesh);

        const dot = top.vx * nx + top.vy * ny;
        if (dot > 0) {
            top.vx -= 1.85 * dot * nx;
            top.vy -= 1.85 * dot * ny;
            createSparks(top.x, top.y, 8);
        }
        scene.add(this.group);
        world.addBody(this.body);
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
    getRPM() { return Math.round((Math.abs(this.body.angularVelocity.y) * 60) / (2 * Math.PI)); }
    getLinearSpeed() { return this.body.velocity.norm(); }
    getTranslationalKE() { return 0.5 * this.mass * Math.pow(this.getLinearSpeed(), 2); }
    getRotationalKE() {
        const w = this.body.angularVelocity;
        return Math.max(0, 0.5 * (this.Ixx_b * w.x * w.x + this.Iyy_b * w.y * w.y + this.Izz_b * w.z * w.z));
    }
    getTotalKE() { return (this.getTranslationalKE() + this.getRotationalKE()).toFixed(4); }
    getTiltAngle() {
        const up = new CANNON.Vec3(0, 1, 0);
        const topUp = this.body.quaternion.vmult(new CANNON.Vec3(0, 1, 0));
        return (Math.acos(Math.min(1.0, Math.max(-1.0, topUp.dot(up)))) * 180 / Math.PI).toFixed(1);
    }

        // 🛠️ 關鍵修正：將傷害大幅降至 0.8，防止過快爆裂，大幅延長對局
        const damage = recoilPower * 0.8;
        topA.hp -= damage / topA.burstResist;
        topB.hp -= damage / topB.burstResist;
    stepPhysics(dt) {
        if (this.isKnockedOut || this.isBurst) return;

        if (topA.hp <= 0) { topA.isBurst = true; topA.angularVelocity = 0; if (onEventCallback) onEventCallback("BURST", { winner: topB, loser: topA }); }
        if (topB.hp <= 0) { topB.isBurst = true; topB.angularVelocity = 0; if (onEventCallback) onEventCallback("BURST", { winner: topA, loser: topB }); }
        this.group.position.copy(this.body.position);
        this.group.quaternion.copy(this.body.quaternion);

        const midX = (topA.x + topB.x) / 2;
        const midY = (topA.y + topB.y) / 2;
        createSparks(midX, midY, 16);
        // 1. 進動與自轉陀螺力矩
        const topUp = this.body.quaternion.vmult(new CANNON.Vec3(0, 1, 0));
        const r_cm = new CANNON.Vec3(topUp.x * this.h_cm, topUp.y * this.h_cm, topUp.z * this.h_cm);
        const gravityTorque = new CANNON.Vec3();
        r_cm.cross(new CANNON.Vec3(0, -this.mass * 9.80665, 0), gravityTorque);
        this.body.torque.vadd(gravityTorque, this.body.torque);

        if (onEventCallback) onEventCallback("CLASH", { topA, topB, impulse: recoilPower, x: midX, y: midY });
    }
}
        // 2. 空氣阻力
        const speed = this.getLinearSpeed();
        if (speed > 0.05) {
            const dragMag = 0.5 * this.dragCoef * Math.pow(speed, 2);
            this.body.applyForce(new CANNON.Vec3(-(this.body.velocity.x/speed)*dragMag, 0, -(this.body.velocity.z/speed)*dragMag), this.body.position);
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
        // 3. 戰鬥盤坡度向心重力漏斗（Funneling Pull：彈開後自動滾回盤底交鋒）
        const dist = Math.hypot(this.body.position.x, this.body.position.z);
        if (dist > 0.1 && dist < STADIUM_RADIUS) {
            // 斜坡向心引力隨距離二次方增加，保證被撞開後迅速回彈至中心對決
            const pull = 0.65 * dist + 0.12 * Math.pow(dist, 1.5);
            this.body.applyForce(new CANNON.Vec3((-this.body.position.x/dist)*pull, 0, (-this.body.position.z/dist)*pull), this.body.position);

            // 陀螺高速自轉帶動的切向走位牽引力 (Grip Orbiting Force)
            if (this.body.position.y < 0.6) {
                const spinDir = Math.sign(this.body.angularVelocity.y);
                const tangentX = -this.body.position.z / dist;
                const tangentZ = this.body.position.x / dist;
                const orbitForce = this.grip * 0.04 * dist;
                this.body.applyForce(new CANNON.Vec3(tangentX * orbitForce * spinDir, 0, tangentZ * orbitForce * spinDir), this.body.position);
            }
        }

            top.vx *= 0.993;
            top.vy *= 0.993;
            top.angularVelocity *= 0.9996; // 持久旋轉阻尼
        // 4. 護欄撞擊與軌道加速 (Rail Acceleration)
        if (dist + this.radius >= STADIUM_RADIUS) {
            if (this.body.position.y > WALL_HEIGHT || dist > STADIUM_RADIUS + 1.2) {
                this.isKnockedOut = true;
                return;
            }
            const nx = this.body.position.x / dist;
            const nz = this.body.position.z / dist;
            this.body.position.x = nx * (STADIUM_RADIUS - this.radius);
            this.body.position.z = nz * (STADIUM_RADIUS - this.radius);

            const vNormal = this.body.velocity.x * nx + this.body.velocity.z * nz;
            if (vNormal > -0.2) {
                const rest = 0.65;
                this.body.velocity.x -= (1.0 + rest) * Math.max(0.4, vNormal) * nx;
                this.body.velocity.z -= (1.0 + rest) * Math.max(0.4, vNormal) * nz;
                this.body.velocity.x *= 0.95;
                this.body.velocity.z *= 0.95;

                if (this.getRPM() > 200) spawn3DSparks(this.body.position.x, 0.4, this.body.position.z, 8);
            }
        }

            if (Math.abs(top.angularVelocity) < 2) top.angularVelocity = 0;
        // 5. 持久轉速自然衰減（可持續對決 25~45 秒）
        this.body.angularVelocity.y *= 0.9998;

            check2DStadiumBoundary(top, onEventCallback);
        if (this.getRPM() < 15) {
            this.body.angularVelocity.set(0, 0, 0);
            this.body.velocity.set(0, 0, 0);
        }
    }
}

        for (let i = 0; i < tops.length; i++) {
            for (let j = i + 1; j < tops.length; j++) {
                handleTopCollision(tops[i], tops[j], onEventCallback);
/**
 * 🔬 3D 立體偏心對撞解算器（產生水平斥力 + 向上鏟起揚升衝量）
 */
export function handle3DTopCollisions() {
    const now = performance.now();

    for (let i = 0; i < activeTops.length; i++) {
        for (let j = i + 1; j < activeTops.length; j++) {
            const topA = activeTops[i];
            const topB = activeTops[j];
            if (topA.isKnockedOut || topB.isKnockedOut || topA.isBurst || topB.isBurst) continue;

            const posA = topA.body.position;
            const posB = topB.body.position;
            const velA = topA.body.velocity;
            const velB = topB.body.velocity;

            const dx = posB.x - posA.x;
            const dy = posB.y - posA.y;
            const dz = posB.z - posA.z;
            
            const distHorizontal = Math.hypot(dx, dz);
            const heightDiff = Math.abs(dy);
            const minDist = topA.radius + topB.radius + 0.15;

            if (distHorizontal < minDist && heightDiff < 1.0 && distHorizontal > 0) {
                const nx = dx / distHorizontal;
                const nz = dz / distHorizontal;
                const normal = new CANNON.Vec3(nx, 0, nz);

                // 位置分離防重疊
                const overlap = (minDist - distHorizontal) * 0.5 + 0.02;
                posA.x -= nx * overlap; posA.z -= nz * overlap;
                posB.x += nx * overlap; posB.z += nz * overlap;

                const relVel = velA.vsub(velB);
                const vRelNormal = relVel.dot(normal);

                const effectiveRestitution = (topA.restitution + topB.restitution) * 0.5;
                const reducedMass = (topA.mass * topB.mass) / (topA.mass + topB.mass);

                // 🔬 動量守恆衝量大小 J_n
                const impulseMag = Math.max(0.02, (1 + effectiveRestitution) * Math.abs(vRelNormal) * reducedMass);

                // 🚀 立體揚起衝量（將陀螺鏟起騰空）
                const liftMag = impulseMag * 0.35 * Math.max(topA.liftCoef, topB.liftCoef);

                const impulseVecA = new CANNON.Vec3(-nx * impulseMag, liftMag, -nz * impulseMag);
                const impulseVecB = new CANNON.Vec3(nx * impulseMag, liftMag, nz * impulseMag);

                topA.body.applyImpulse(impulseVecA, posA);
                topB.body.applyImpulse(impulseVecB, posB);

                topA.lastImpulseMag = impulseMag.toFixed(3);
                topB.lastImpulseMag = impulseMag.toFixed(3);

                // 🛡️ 卡榫扣減（Ratchet Click）：每 220ms 結算一次，需 4~6 次實體重擊才爆裂
                if (now - topA.lastHitTime > 220) {
                    topA.lastHitTime = now;
                    topB.lastHitTime = now;

                    if (impulseMag > 0.035) {
                        const dmg = Math.min(26, Math.max(12, impulseMag * 320));
                        topA.hp -= dmg;
                        topB.hp -= dmg;

                        if (topA.hp <= 0) { topA.hp = 0; topA.isBurst = true; }
                        if (topB.hp <= 0) { topB.hp = 0; topB.isBurst = true; }

                        spawn3DSparks((posA.x + posB.x) * 0.5, Math.max(0.4, (posA.y + posB.y) * 0.5), (posA.z + posB.z) * 0.5, 14);
                    }
                }
            }
        }
    }
    updateSparks();
}

export function draw2DStadiumLayout(ctx, width, height) {
    updateStadiumCenter(width, height);

    ctx.save();

    if (screenShake > 0.5) {
        const shakeX = (Math.random() - 0.5) * screenShake;
        const shakeY = (Math.random() - 0.5) * screenShake;
        ctx.translate(shakeX, shakeY);
export function spawn3DSparks(x, y, z, count) {
    if (sparkParticles.length > 60) return;
    for (let i = 0; i < count; i++) {
        const pGeo = new THREE.SphereGeometry(0.06, 4, 4);
        const pMat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.4 ? 0xffaa00 : 0xff3300 });
        const mesh = new THREE.Mesh(pGeo, pMat);
        mesh.position.set(x, y, z);
        scene.add(mesh);
        sparkParticles.push({ mesh, vx: (Math.random()-0.5)*5, vy: 1+Math.random()*3.5, vz: (Math.random()-0.5)*5, life: 0.7 });
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
export function update3DSparks(dt) {
    for (let i = sparkParticles.length - 1; i >= 0; i--) {
        const p = sparkParticles[i];
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.vy -= 9.8 * dt;
        p.life -= dt * 2.2;
        if (p.life <= 0) {
            scene.remove(p.mesh);
            sparkParticles.splice(i, 1);
        }
    }

    ctx.beginPath();
    ctx.arc(0, 0, top.radius * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = "#00f2fe";
    ctx.fill();

    ctx.restore();
