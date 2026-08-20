// js/physics.js - 終極科研級 3D 剛體動力學引擎、切向摩擦力矩分解與能量漂移校準

export const STADIUM_RADIUS = 12.0;
export const GEAR_RAIL_RADIUS = 10.5;

// 固定物理步長設定：240Hz 航天/力學級算力（1/240 秒）
export const PHYSICS_FIXED_TIMESTEP = 1 / 240;
export const PHYSICS_MAX_SUBSTEPS = 10;

/**
 * 🔬 計算含偏心擾動之完整 6 分量本體慣量張量 (Body-frame Inertia Tensor)
 */
export function calculateRigidInertiaTensor(mass, radius, height, eccentricity = 0.03) {
    const Ixx_b = (1 / 12) * mass * (3 * Math.pow(radius, 2) + Math.pow(height, 2));
    const Iyy_b = 0.5 * mass * Math.pow(radius, 2);
    const Izz_b = Ixx_b;
    const Ixy_b = Ixx_b * (eccentricity * 0.5);
    const Ixz_b = Ixx_b * eccentricity;
    const Iyz_b = Ixx_b * (eccentricity * 0.4);

    return { Ixx_b, Iyy_b, Izz_b, Ixy_b, Ixz_b, Iyz_b };
}

export class Beyblade3DPhysics {
    constructor(scene, world, defaultMaterial, config) {
        this.scene = scene;
        this.world = world;
        this.id = config.id || Math.random().toString(36).substring(2, 9);
        this.name = config.name;
        this.color = config.color;
        this.isRightSpin = config.isRightSpin ?? true;
        this.shatterHp = config.burstResist || 120;
        this.maxHp = this.shatterHp;
        this.isShattered = false;
        this.isKnockedOut = false;

        this.radius = config.radius || 1.2;
        this.mass = config.mass || 0.048;
        this.tipFriction = config.tipFriction || 0.06;
        this.contactRadius = config.contactRadius || 0.005;
        this.restitution = config.restitution || 0.40;
        this.h_cm = 0.015; // 質心至底軸接觸點長度 (m)
        this.lastImpulseMag = 0;

        // 🔬 完整 6 分量本體慣量張量
        const tensor = calculateRigidInertiaTensor(this.mass, this.radius * 0.03, 0.015, config.eccentricity || 0.03);
        this.Ixx_b = tensor.Ixx_b;
        this.Iyy_b = tensor.Iyy_b;
        this.Izz_b = tensor.Izz_b;
        this.Ixy_b = tensor.Ixy_b;
        this.Ixz_b = tensor.Ixz_b;
        this.Iyz_b = tensor.Iyz_b;

        // 能量監控基準
        this.previousTotalKE = 0;

        // 建立 Cannon.js 剛體
        this.body = new CANNON.Body({
            mass: this.mass,
            material: defaultMaterial,
            linearDamping: this.tipFriction * 0.35,
            angularDamping: 0.0015,
            ccdSpeedThreshold: 5,
            ccdIterations: 5
        });

        this.body.addShape(new CANNON.Sphere(this.radius * 0.8));
        this.body.position.set(config.x, config.y || 0.4, config.z);

        const initialRpm = config.rpm || 12000;
        const spinRad = (initialRpm * 2 * Math.PI) / 60 * (this.isRightSpin ? -1 : 1);
        this.body.angularVelocity.set(0, spinRad, 0);

        world.addBody(this.body);
    }

    /**
     * 🔬 張量相似變換：I_world = R * I_body * R^T
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

    getTotalKE() { return this.getTranslationalKE() + this.getRotationalKE(); }

    getAngularMomentumVector() {
        const w = this.body.angularVelocity;
        const I = this.getWorldInertiaTensor();
        return {
            Lx: (I.Ixx * w.x - I.Ixy * w.y - I.Ixz * w.z).toFixed(5),
            Ly: (-I.Ixy * w.x + I.Iyy * w.y - I.Iyz * w.z).toFixed(5),
            Lz: (-I.Ixz * w.x - I.Iyz * w.y + I.Izz * w.z).toFixed(5)
        };
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
            Omega_p = discriminant >= 0 ? (-b + Math.sqrt(discriminant)) / (2 * a) : -c / b;
        }
        return (Math.abs(Omega_p) / (2 * Math.PI)).toFixed(2);
    }

    /**
     * 🔬 能量守恆監控與數值漂移校準器 (Drift Regulator)
     */
    regulateEnergyDrift(dt) {
        const currentKE = this.getTotalKE();
        if (this.previousTotalKE > 0) {
            // 在無碰撞期間，系統機械能理論上只能因摩擦與阻力單調遞減 (dE/dt <= 0)
            const expectedMaxEnergy = this.previousTotalKE;
            if (currentKE > expectedMaxEnergy * 1.001) {
                // 偵測到數值積分溢位 (>0.1% 漂移)，執行辛幾何收斂校準
                const correctionRatio = Math.sqrt(expectedMaxEnergy / currentKE);
                this.body.velocity.scale(correctionRatio, this.body.velocity);
                this.body.angularVelocity.scale(correctionRatio, this.body.angularVelocity);
            }
        }
        this.previousTotalKE = this.getTotalKE();
    }

    stepPhysics(dt) {
        if (this.isShattered || this.isKnockedOut) return;

        // 1. 重力進動力矩 τ_grav = r_cm × m g
        const topUp = this.body.quaternion.vmult(new CANNON.Vec3(0, 1, 0));
        const r_cm = new CANNON.Vec3(topUp.x * this.h_cm, topUp.y * this.h_cm, topUp.z * this.h_cm);
        const gravityForce = new CANNON.Vec3(0, -this.mass * 9.80665, 0);

        const gravityTorque = new CANNON.Vec3();
        r_cm.cross(gravityForce, gravityTorque);
        this.body.torque.vadd(gravityTorque, this.body.torque);

        // 2. 世界座標系 Euler 陀螺力矩：τ_gyro = - (ω × I_world ω)
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
        const normalForce = this.mass * 9.80665 + this.mass * Math.abs(this.body.velocity.y);
        const spinSign = Math.sign(this.body.angularVelocity.y);
        const frictionTorqueMag = (2/3) * this.tipFriction * normalForce * this.contactRadius;
        this.body.torque.y -= spinSign * frictionTorqueMag;

        // 4. 戰鬥盤坡度向心引力
        const distFromCenter = Math.hypot(this.body.position.x, this.body.position.z);
        if (distFromCenter > 0.1 && distFromCenter < STADIUM_RADIUS) {
            const pullMagnitude = 0.18 * distFromCenter;
            const fx = (-this.body.position.x / distFromCenter) * pullMagnitude;
            const fz = (-this.body.position.z / distFromCenter) * pullMagnitude;
            this.body.applyForce(new CANNON.Vec3(fx, 0, fz), this.body.position);
        }

        // 5. 邊界約束
        if (distFromCenter + this.radius >= STADIUM_RADIUS) {
            if (distFromCenter > STADIUM_RADIUS + 1.5) {
                this.isKnockedOut = true;
                return;
            }
            const nx = this.body.position.x / distFromCenter;
            const nz = this.body.position.z / distFromCenter;
            this.body.position.x = nx * (STADIUM_RADIUS - this.radius);
            this.body.position.z = nz * (STADIUM_RADIUS - this.radius);
            this.body.velocity.x *= -0.65;
            this.body.velocity.z *= -0.65;
        }

        // 6. 能量守恆調節
        this.regulateEnergyDrift(dt);

        // 7. 停轉保護
        if (this.getRPM() < 30) {
            this.body.angularVelocity.set(0, 0, 0);
            this.body.velocity.set(0, 0, 0);
        }
    }

    /**
     * 🔬 雙陀螺對撞：完整法向與切向摩擦衝量矩解算 (Full Normal & Tangential Impulse Coupling)
     */
    static resolveCollision(topA, topB) {
        if (topA.isKnockedOut || topB.isKnockedOut || topA.isShattered || topB.isShattered) return;

        const posA = topA.body.position;
        const posB = topB.body.position;
        const velA = topA.body.velocity;
        const velB = topB.body.velocity;

        const dx = posB.x - posA.x;
        const dz = posB.z - posA.z;
        const dist = Math.hypot(dx, dz);
        const minDist = topA.radius + topB.radius + 0.2;

        if (dist < minDist && dist > 0) {
            const nx = dx / dist;
            const nz = dz / dist;
            const normal = new CANNON.Vec3(nx, 0, nz);
            const tangent = new CANNON.Vec3(-nz, 0, nx); // 切線單位向量

            // 1. 位置穿透分離
            const overlap = (minDist - dist) * 0.5 + 0.05;
            posA.x -= nx * overlap; posA.z -= nz * overlap;
            posB.x += nx * overlap; posB.z += nz * overlap;

            // 2. 法向衝量 J_n
            const relVel = velA.vsub(velB);
            const vRelNormal = relVel.dot(normal);
            const vRelTangent = relVel.dot(tangent);

            const effectiveRestitution = (topA.restitution + topB.restitution) * 0.5;
            const reducedMass = (topA.mass * topB.mass) / (topA.mass + topB.mass);

            const Jn_mag = Math.max(0.12, (1 + effectiveRestitution) * Math.abs(vRelNormal) * reducedMass * 18);
            
            // 3. 切向庫倫摩擦衝量 J_t = min(mu * Jn, m_eff * v_rel_t)
            const mu = (topA.tipFriction + topB.tipFriction) * 0.5;
            const Jt_mag = Math.min(mu * Jn_mag, Math.abs(vRelTangent) * reducedMass);
            const tangentDir = vRelTangent > 0 ? -1 : 1;

            const impulseVecA = normal.scale(-Jn_mag).vadd(tangent.scale(Jt_mag * tangentDir));
            const impulseVecB = normal.scale(Jn_mag).vadd(tangent.scale(-Jt_mag * tangentDir));

            // 4. 偏心接觸點力矩耦合 Δω = I^-1 (r × J)
            const offsetA = new CANNON.Vec3(nx * topA.radius * 0.8, 0.05, nz * topA.radius * 0.8);
            const offsetB = new CANNON.Vec3(-nx * topB.radius * 0.8, 0.05, -nz * topB.radius * 0.8);

            topA.body.applyImpulse(impulseVecA, posA.vadd(offsetA));
            topB.body.applyImpulse(impulseVecB, posB.vadd(offsetB));

            topA.lastImpulseMag = Jn_mag.toFixed(3);
            topB.lastImpulseMag = Jn_mag.toFixed(3);

            // 5. 扣除血量
            topA.shatterHp -= Jn_mag * 45;
            topB.shatterHp -= Jn_mag * 45;
            if (topA.shatterHp <= 0) topA.isShattered = true;
            if (topB.shatterHp <= 0) topB.isShattered = true;
        }
    }

    getSnapshot(sequence) {
        return {
            id: this.id,
            seq: sequence,
            px: Number(this.body.position.x.toFixed(4)),
            py: Number(this.body.position.y.toFixed(4)),
            pz: Number(this.body.position.z.toFixed(4)),
            vx: Number(this.body.velocity.x.toFixed(4)),
            vy: Number(this.body.velocity.y.toFixed(4)),
            vz: Number(this.body.velocity.z.toFixed(4)),
            qx: Number(this.body.quaternion.x.toFixed(4)),
            qy: Number(this.body.quaternion.y.toFixed(4)),
            qz: Number(this.body.quaternion.z.toFixed(4)),
            qw: Number(this.body.quaternion.w.toFixed(4)),
            wx: Number(this.body.angularVelocity.x.toFixed(4)),
            wy: Number(this.body.angularVelocity.y.toFixed(4)),
            wz: Number(this.body.angularVelocity.z.toFixed(4)),
            hp: Number(this.shatterHp.toFixed(1))
        };
    }

    applySnapshot(snapshot, lerpFactor = 0.25) {
        const targetPos = new CANNON.Vec3(snapshot.px, snapshot.py, snapshot.pz);
        const targetVel = new CANNON.Vec3(snapshot.vx, snapshot.vy, snapshot.vz);
        const targetAngVel = new CANNON.Vec3(snapshot.wx, snapshot.wy, snapshot.wz);

        this.body.position.vadd(targetPos.vsub(this.body.position).scale(lerpFactor), this.body.position);
        this.body.velocity.vadd(targetVel.vsub(this.body.velocity).scale(lerpFactor), this.body.velocity);
        this.body.angularVelocity.vadd(targetAngVel.vsub(this.body.angularVelocity).scale(lerpFactor), this.body.angularVelocity);

        this.body.quaternion.slerp(new CANNON.Quaternion(snapshot.qx, snapshot.qy, snapshot.qz, snapshot.qw), lerpFactor, this.body.quaternion);

        this.shatterHp = snapshot.hp;
        if (this.shatterHp <= 0) this.isShattered = true;
    }
}
