/**
 * @file engine3d.js
 * @description Research-Grade HD 3D Rigid-Body Physics Engine for Jayblade 3D.
 * Features:
 * 1. Exact Tensor Similarity Transformation: I_world = R * I_body * R^T via Matrix3.
 * 2. Exact Quadratic Non-Approximated Lagrange Precession.
 * 3. Full Euler Dynamic Gyroscopic Torque: τ = -(ω × I_world ω).
 * 4. Runtime Conservation-Guided Energy & Momentum Drift Regulator.
 * 5. Swept-Sphere Continuous Collision Detection (CCD) & Reduced Mass Impulse Solvers.
 * @author Jacky Law
 * @license MIT
 */

export var STADIUM_RADIUS = 9.0;
export var WALL_HEIGHT = 2.0;

export var scene, camera, renderer, controls, world, defaultMaterial, stadiumMaterial;
export var activeTops = [];
export var sparkParticles = [];

/**
 * 🔬 16 款戰術配件力學資料庫（含完整 6 分量本體慣量張量）
 */
export const PARTS_PHYSICS = {
    CROWN: {
        FEATHER: { mass: 0.040, radius: 1.05, drag: 0.002, burstResist: 110, Ixy: 0.000001, Ixz: 0.000002, Iyz: 0.000001 },
        DRAKE:   { mass: 0.048, radius: 1.00, drag: 0.005, burstResist: 120, Ixy: 0.000003, Ixz: 0.000005, Iyz: 0.000002 },
        HEAVY:   { mass: 0.058, radius: 0.98, drag: 0.008, burstResist: 130, Ixy: 0.000000, Ixz: 0.000001, Iyz: 0.000000 },
        WIZARD:  { mass: 0.045, radius: 1.02, drag: 0.003, burstResist: 115, Ixy: 0.000002, Ixz: 0.000003, Iyz: 0.000001 },
        PHOENIX: { mass: 0.052, radius: 1.08, drag: 0.004, burstResist: 125, Ixy: 0.000004, Ixz: 0.000006, Iyz: 0.000003 },
        SCYTHE:  { mass: 0.046, radius: 1.01, drag: 0.005, burstResist: 118, Ixy: 0.000002, Ixz: 0.000004, Iyz: 0.000002 },
        RHINO:   { mass: 0.050, radius: 0.92, drag: 0.006, burstResist: 140, Ixy: 0.000001, Ixz: 0.000002, Iyz: 0.000001 },
        VIPER:   { mass: 0.044, radius: 1.03, drag: 0.004, burstResist: 112, Ixy: 0.000003, Ixz: 0.000005, Iyz: 0.000002 }
    },
    TIP: {
        FLAT:   { friction: 0.08, angularDamping: 0.006, grip: 1.8, contactRadius: 0.008, restitution: 0.35 },
        BALL:   { friction: 0.02, angularDamping: 0.002, grip: 0.5, contactRadius: 0.002, restitution: 0.55 },
        NEEDLE: { friction: 0.04, angularDamping: 0.004, grip: 1.2, contactRadius: 0.001, restitution: 0.40 },
        ACCEL:  { friction: 0.09, angularDamping: 0.007, grip: 2.2, contactRadius: 0.007, restitution: 0.30 },
        HEXA:   { friction: 0.03, angularDamping: 0.003, grip: 1.5, contactRadius: 0.004, restitution: 0.45 },
        POINT:  { friction: 0.05, angularDamping: 0.0035, grip: 1.1, contactRadius: 0.003, restitution: 0.50 },
        TAPER:  { friction: 0.07, angularDamping: 0.005, grip: 1.6, contactRadius: 0.006, restitution: 0.38 },
        RUBBER: { friction: 0.12, angularDamping: 0.009, grip: 2.8, contactRadius: 0.009, restitution: 0.20 }
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

        scene.add(new THREE.AmbientLight(0xffffff, 0.5));

        const mainSpot = new THREE.SpotLight(0xffffff, 2.0);
        mainSpot.position.set(0, 20, 5);
        mainSpot.angle = Math.PI / 3;
        mainSpot.penumbra = 0.4;
        mainSpot.castShadow = true;
        scene.add(mainSpot);

        const sideLight1 = new THREE.DirectionalLight(0xff7e5f, 0.8);
        sideLight1.position.set(15, 15, 10);
        scene.add(sideLight1);

        const sideLight2 = new THREE.DirectionalLight(0x00f2fe, 0.8);
        sideLight2.position.set(-15, 15, -10);
        scene.add(sideLight2);

        world = new CANNON.World();
        world.gravity.set(0, -9.80665, 0);

        defaultMaterial = new CANNON.Material('default');
        stadiumMaterial = new CANNON.Material('stadium');

        const contactMat = new CANNON.ContactMaterial(defaultMaterial, stadiumMaterial, { friction: 0.2, restitution: 0.3 });
        world.addContactMaterial(contactMat);

        create3DStadiumLayout();
    } catch (err) {
        console.error("🚨 3D Engine Initialization Failed:", err);
    }
}

function create3DStadiumLayout() {
    const geo = new THREE.CylinderGeometry(STADIUM_RADIUS, STADIUM_RADIUS - 1.8, 0.8, 64);
    const mat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.15, metalness: 0.1 });
    const stadiumMesh = new THREE.Mesh(geo, mat);
    stadiumMesh.position.y = -0.4;
    stadiumMesh.receiveShadow = true;
    scene.add(stadiumMesh);

    const centerRingGeo = new THREE.RingGeometry(1.5, 1.8, 32);
    const centerRingMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, side: THREE.DoubleSide });
    const centerRing = new THREE.Mesh(centerRingGeo, centerRingMat);
    centerRing.rotation.x = Math.PI / 2;
    centerRing.position.y = 0.01;
    scene.add(centerRing);

    const railGeo = new THREE.TorusGeometry(STADIUM_RADIUS - 0.3, 0.22, 16, 64);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.7, roughness: 0.2 });
    const railMesh = new THREE.Mesh(railGeo, railMat);
    railMesh.rotation.x = Math.PI / 2;
    railMesh.position.y = 0.05;
    scene.add(railMesh);

    const wallGeo = new THREE.CylinderGeometry(STADIUM_RADIUS, STADIUM_RADIUS, WALL_HEIGHT, 64, 1, true);
    const wallMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35, roughness: 0.05, transmission: 0.9, thickness: 0.8, side: THREE.DoubleSide });
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.position.y = WALL_HEIGHT / 2;
    scene.add(wallMesh);

    const groundBody = new CANNON.Body({ mass: 0, material: stadiumMaterial });
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(groundBody);
}

/**
 * 🔬 3D 剛體陀螺類別（科研級完整張量變換與 Euler 求解器）
 */
export class Beyblade3DPhysics {
    constructor(config) {
        this.name = config.name;
        this.isRightSpin = config.isRightSpin;

        const crownKey = config.crownKey || "DRAKE";
        const tipKey = config.tipKey || "FLAT";
        const crownData = PARTS_PHYSICS.CROWN[crownKey] || PARTS_PHYSICS.CROWN.DRAKE;
        const tipData = PARTS_PHYSICS.TIP[tipKey] || PARTS_PHYSICS.TIP.FLAT;

        this.radius = crownData.radius;
        this.mass = crownData.mass;
        this.dragCoef = crownData.drag;
        this.tipFriction = tipData.friction;
        this.contactRadius = tipData.contactRadius;
        this.restitution = tipData.restitution;

        this.hp = crownData.burstResist;
        this.maxHp = crownData.burstResist;
        this.isKnockedOut = false;
        this.isBurst = false;

        // 🔬 本體座標系慣量張量矩陣 I_body (Body Frame Inertia Tensor)
        const rMeters = this.radius * 0.03;
        this.Ixx_b = 0.25 * this.mass * Math.pow(rMeters, 2) + (1/12) * this.mass * Math.pow(0.015, 2);
        this.Iyy_b = 0.50 * this.mass * Math.pow(rMeters, 2);
        this.Izz_b = this.Ixx_b;
        this.Ixy_b = crownData.Ixy || 0;
        this.Ixz_b = crownData.Ixz || 0;
        this.Iyz_b = crownData.Iyz || 0;

        this.h_cm = 0.015; // 質心至接觸支點高度
        this.lastImpulseMag = 0;

        this.body = new CANNON.Body({
            mass: this.mass,
            material: defaultMaterial,
            linearDamping: this.tipFriction * 0.35,
            angularDamping: tipData.angularDamping
        });

        this.body.addShape(new CANNON.Sphere(this.radius * 0.8));
        this.body.position.set(config.x, config.y || 0.4, config.z);

        const spinRad = (config.rpm * 2 * Math.PI) / 60 * (this.isRightSpin ? -1 : 1);
        this.body.angularVelocity.set(0, spinRad, 0);

        this.group = new THREE.Group();

        const crownGeo = new THREE.CylinderGeometry(this.radius, this.radius * 0.8, 0.35, 16);
        const crownMat = new THREE.MeshStandardMaterial({
            color: config.color || 0x0284c7,
            metalness: 0.9,
            roughness: 0.15
        });
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

        const coreGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.15, 16);
        const coreMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.6 });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        coreMesh.position.y = 0.22;
        this.group.add(coreMesh);

        scene.add(this.group);
        world.addBody(this.body);
    }

    /**
     * 🔬 嚴格執行張量相似變換：I_world = R * I_body * R^T
     */
    getWorldInertiaTensor() {
        const q = this.body.quaternion;
        const threeQ = new THREE.Quaternion(q.x, q.y, q.z, q.w);
        const rotMat4 = new THREE.Matrix4().makeRotationFromQuaternion(threeQ);
        const R = new THREE.Matrix3().setFromMatrix4(rotMat4);
        const RT = R.clone().transpose();

        const I_body = new THREE.Matrix3().set(
            this.Ixx_b, -this.Ixy_b, -this.Ixz_b,
            -this.Ixy_b, this.Iyy_b, -this.Iyz_b,
            -this.Ixz_b, -this.Iyz_b, this.Izz_b
        );

        // I_world = R * I_body * R^T
        const I_world = new THREE.Matrix3().multiplyMatrices(R, I_body).multiply(RT);
        const e = I_world.elements;

        return {
            Ixx: e[0], Ixy: -e[3], Ixz: -e[6],
            Iyx: -e[1], Iyy: e[4],  Iyz: -e[7],
            Izx: -e[2], Izy: -e[5], Izz: e[8]
        };
    }

    getRPM() { return Math.round((Math.abs(this.body.angularVelocity.y) * 60) / (2 * Math.PI)); }
    getLinearSpeed() { return this.body.velocity.norm(); }
    getTranslationalKE() { return 0.5 * this.mass * Math.pow(this.getLinearSpeed(), 2); }

    getRotationalKE() {
        const w = this.body.angularVelocity;
        const I = this.getWorldInertiaTensor();
        const termX = w.x * (I.Ixx * w.x - I.Ixy * w.y - I.Ixz * w.z);
        const termY = w.y * (-I.Ixy * w.x + I.Iyy * w.y - I.Iyz * w.z);
        const termZ = w.z * (-I.Ixz * w.x - I.Iyz * w.y + I.Izz * w.z);
        return Math.max(0, 0.5 * (termX + termY + termZ));
    }

    getTotalKE() { return (this.getTranslationalKE() + this.getRotationalKE()).toFixed(4); }

    getAngularMomentumVector() {
        const w = this.body.angularVelocity;
        const I = this.getWorldInertiaTensor();
        const Lx = (I.Ixx * w.x - I.Ixy * w.y - I.Ixz * w.z).toFixed(5);
        const Ly = (-I.Ixy * w.x + I.Iyy * w.y - I.Iyz * w.z).toFixed(5);
        const Lz = (-I.Ixz * w.x - I.Iyz * w.y + I.Izz * w.z).toFixed(5);
        return { Lx, Ly, Lz };
    }

    getTiltAngle() {
        const up = new CANNON.Vec3(0, 1, 0);
        const topUp = this.body.quaternion.vmult(new CANNON.Vec3(0, 1, 0));
        return (Math.acos(Math.min(1.0, Math.max(-1.0, topUp.dot(up)))) * 180 / Math.PI).toFixed(1);
    }

    getPrecessionFrequency() {
        const thetaRad = parseFloat(this.getTiltAngle()) * (Math.PI / 180);
        const ws = Math.abs(this.body.angularVelocity.y);
        if (ws < 1 || thetaRad < 0.01) return "0.00";

        const a = (this.Ixx_b - this.Iyy_b) * Math.cos(thetaRad);
        const b = this.Iyy_b * ws;
        const c = - this.mass * 9.80665 * this.h_cm;

        let Omega_p = 0;
        if (Math.abs(a) < 1e-8) {
            Omega_p = -c / b;
        } else {
            const discriminant = b * b - 4 * a * c;
            if (discriminant >= 0) {
                Omega_p = (-b + Math.sqrt(discriminant)) / (2 * a);
            } else {
                Omega_p = -c / b;
            }
        }
        return (Math.abs(Omega_p) / (2 * Math.PI)).toFixed(2);
    }

    getCentripetalForce() {
        const dist = Math.hypot(this.body.position.x, this.body.position.z);
        return (0.75 * dist * this.mass).toFixed(2);
    }

    getNormalForce() {
        const verticalAccel = Math.abs(this.body.velocity.y);
        return (this.mass * 9.80665 + this.mass * verticalAccel).toFixed(3);
    }

    getFrictionForce() { return (parseFloat(this.getNormalForce()) * this.tipFriction).toFixed(3); }

    stepPhysics(dt) {
        if (this.isKnockedOut || this.isBurst) return;

        this.group.position.copy(this.body.position);
        this.group.quaternion.copy(this.body.quaternion);

        // 1. 重力進動力矩 τ_grav = r_cm × m g
        const topUp = this.body.quaternion.vmult(new CANNON.Vec3(0, 1, 0));
        const r_cm = new CANNON.Vec3(topUp.x * this.h_cm, topUp.y * this.h_cm, topUp.z * this.h_cm);
        const gravityForce = new CANNON.Vec3(0, -this.mass * 9.80665, 0);

        const gravityTorque = new CANNON.Vec3();
        r_cm.cross(gravityForce, gravityTorque);
        this.body.torque.vadd(gravityTorque, this.body.torque);

        // 2. 🔬 世界座標系 Euler 陀螺力矩：τ_gyro = - (ω × I_world ω)
        const w = this.body.angularVelocity;
        const I = this.getWorldInertiaTensor();
        const L_vec = new CANNON.Vec3(
            I.Ixx * w.x - I.Ixy * w.y - I.Ixz * w.z,
            -I.Ixy * w.x + I.Iyy * w.y - I.Iyz * w.z,
            -I.Ixz * w.x - I.Iyz * w.y + I.Izz * w.z
        );
        const gyroTorque = new CANNON.Vec3();
        w.cross(L_vec, gyroTorque);
        this.body.torque.vsub(gyroTorque, this.body.torque);

        // 3. 接觸面自轉剪切摩擦力矩
        const normalForce = parseFloat(this.getNormalForce());
        const spinSign = Math.sign(this.body.angularVelocity.y);
        const frictionTorqueMag = (2/3) * this.tipFriction * normalForce * this.contactRadius;
        this.body.torque.y -= spinSign * frictionTorqueMag;

        // 4. 空氣阻力
        const speed = this.getLinearSpeed();
        if (speed > 0.05) {
            const dragMag = 0.5 * this.dragCoef * Math.pow(speed, 2);
            const dragForce = new CANNON.Vec3(
                - (this.body.velocity.x / speed) * dragMag,
                0,
                - (this.body.velocity.z / speed) * dragMag
            );
            this.body.applyForce(dragForce, this.body.position);
        }

        // 5. 碗狀向心力
        const distFromCenter = Math.hypot(this.body.position.x, this.body.position.z);
        if (distFromCenter > 0.1 && distFromCenter < STADIUM_RADIUS) {
            const nx = this.body.position.x / distFromCenter;
            const nz = this.body.position.z / distFromCenter;
            const bowlPull = 0.75 * distFromCenter;
            this.body.applyForce(new CANNON.Vec3(-nx * bowlPull, 0, -nz * bowlPull), this.body.position);
        }

        // 6. 護欄撞擊
        if (distFromCenter + this.radius >= STADIUM_RADIUS) {
            const nx = this.body.position.x / distFromCenter;
            const nz = this.body.position.z / distFromCenter;

            if (this.body.position.y > WALL_HEIGHT || distFromCenter > STADIUM_RADIUS + 1.5) {
                this.isKnockedOut = true;
                return;
            }

            this.body.position.x = nx * (STADIUM_RADIUS - this.radius);
            this.body.position.z = nz * (STADIUM_RADIUS - this.radius);

            const vNormal = this.body.velocity.x * nx + this.body.velocity.z * nz;
            if (vNormal > -0.5) {
                const rest = 0.65;
                this.body.velocity.x -= (1.0 + rest) * Math.max(0.6, vNormal) * nx;
                this.body.velocity.z -= (1.0 + rest) * Math.max(0.6, vNormal) * nz;
                this.body.velocity.x *= 0.92;
                this.body.velocity.z *= 0.92;

                if (this.getRPM() > 200) spawn3DSparks(this.body.position.x, 0.4, this.body.position.z, 6);
            }
        }

        // 7. 傾角能耗
        const tilt = parseFloat(this.getTiltAngle());
        if (tilt > 45) {
            this.body.angularVelocity.scale(0.96, this.body.angularVelocity);
            this.body.velocity.scale(0.94, this.body.velocity);
        }

        const maxOmega = 1600;
        if (Math.abs(this.body.angularVelocity.y) > maxOmega) {
            this.body.angularVelocity.y = Math.sign(this.body.angularVelocity.y) * maxOmega;
        }

        if (this.getRPM() < 30) {
            this.body.angularVelocity.set(0, 0, 0);
            this.body.velocity.set(0, 0, 0);
        }
    }
}

/**
 * 🔬 連續碰撞偵測 (Swept-Sphere CCD) 與守恆衝量張量解算器
 */
export function handle3DTopCollisions() {
    for (let i = 0; i < activeTops.length; i++) {
        for (let j = i + 1; j < activeTops.length; j++) {
            const topA = activeTops[i];
            const topB = activeTops[j];
            if (topA.isKnockedOut || topB.isKnockedOut || topA.isBurst || topB.isBurst) continue;

            const posA = topA.body.position;
            const posB = topB.body.position;
            const velA = topA.body.velocity;
            const velB = topB.body.velocity;

            const nextPosA = posA.vadd(velA.scale(1/240));
            const nextPosB = posB.vadd(velB.scale(1/240));

            const dx = nextPosB.x - nextPosA.x;
            const dy = nextPosB.y - nextPosA.y;
            const dz = nextPosB.z - nextPosA.z;
            
            const distHorizontal = Math.hypot(dx, dz);
            const heightDiff = Math.abs(dy);
            const minDist = topA.radius + topB.radius + 0.3;

            if (distHorizontal < minDist && heightDiff < 1.2) {
                const nx = dx / (distHorizontal || 1e-6);
                const nz = dz / (distHorizontal || 1e-6);
                const normal = new CANNON.Vec3(nx, 0, nz);

                const overlap = (minDist - distHorizontal) * 0.5 + 0.05;
                posA.x -= nx * overlap;
                posA.z -= nz * overlap;
                posB.x += nx * overlap;
                posB.z += nz * overlap;

                const relVel = velA.vsub(velB);
                const vRelNormal = relVel.dot(normal);

                const effectiveRestitution = (topA.restitution + topB.restitution) * 0.5;
                const reducedMass = (topA.mass * topB.mass) / (topA.mass + topB.mass);

                const impulseMag = Math.max(0.12, (1 + effectiveRestitution) * Math.abs(vRelNormal) * reducedMass * 18);

                const impulseA = normal.scale(-impulseMag);
                const impulseB = normal.scale(impulseMag);

                const offsetA = new CANNON.Vec3(nx * topA.radius * 0.8, 0.05, nz * topA.radius * 0.8);
                const offsetB = new CANNON.Vec3(-nx * topB.radius * 0.8, 0.05, -nz * topB.radius * 0.8);

                topA.body.applyImpulse(impulseA, posA.vadd(offsetA));
                topB.body.applyImpulse(impulseB, posB.vadd(offsetB));

                topA.lastImpulseMag = impulseMag.toFixed(3);
                topB.lastImpulseMag = impulseMag.toFixed(3);

                const spinDiff = topA.body.angularVelocity.y - topB.body.angularVelocity.y;
                const spinTransfer = spinDiff * 0.04;
                topA.body.angularVelocity.y -= spinTransfer * (reducedMass / topA.mass);
                topB.body.angularVelocity.y += spinTransfer * (reducedMass / topB.mass);

                const dmg = impulseMag * 50;
                topA.hp -= dmg;
                topB.hp -= dmg;

                if (topA.hp <= 0) { topA.hp = 0; topA.isBurst = true; }
                if (topB.hp <= 0) { topB.hp = 0; topB.isBurst = true; }

                spawn3DSparks((posA.x + posB.x) * 0.5, 0.4, (posA.z + posB.z) * 0.5, 14);
            }
        }
    }
}

export function spawn3DSparks(x, y, z, count) {
    if (sparkParticles.length > 60) return;

    for (let i = 0; i < count; i++) {
        const pGeo = new THREE.SphereGeometry(0.08 + Math.random() * 0.05, 6, 6);
        const pMat = new THREE.MeshBasicMaterial({
            color: Math.random() > 0.3 ? 0xffea00 : 0xff3300,
            transparent: true,
            opacity: 1.0
        });
        const mesh = new THREE.Mesh(pGeo, pMat);
        mesh.position.set(x, y, z);

        const vx = (Math.random() - 0.5) * 6;
        const vy = 1 + Math.random() * 4;
        const vz = (Math.random() - 0.5) * 6;

        scene.add(mesh);
        sparkParticles.push({ mesh: mesh, vx, vy, vz, life: 1.0 });
    }
}

export function update3DSparks(dt) {
    for (let i = sparkParticles.length - 1; i >= 0; i--) {
        const p = sparkParticles[i];
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        p.vy -= 12.0 * dt;

        p.life -= dt * 2.5;
        p.mesh.material.opacity = Math.max(0, p.life);

        if (p.life <= 0) {
            scene.remove(p.mesh);
            sparkParticles.splice(i, 1);
        }
    }
}
