// js/physics.js - 高頻物理模擬與剛體計算優化

export const STADIUM_RADIUS = 12;
export const GEAR_RAIL_RADIUS = 10.5;

// 固定物理步長設定：240Hz 算力（1/240 秒）
export const PHYSICS_FIXED_TIMESTEP = 1 / 240;
export const PHYSICS_MAX_SUBSTEPS = 10;

/**
 * 自動根據 3D 幾何邊界計算轉動慣量張量 (Inertia Tensor)
 */
export function calculateCylinderInertia(mass, radius, height) {
    const I_z = 0.5 * mass * Math.pow(radius, 2);
    const I_xy = (1 / 12) * mass * (3 * Math.pow(radius, 2) + Math.pow(height, 2));
    return { I_xy, I_z };
}

export class Beyblade3DPhysics {
    constructor(scene, world, defaultMaterial, config) {
        this.scene = scene;
        this.world = world;
        this.id = config.id || Math.random().toString(36).substring(2, 9);
        this.name = config.name;
        this.color = config.color;
        this.isRightSpin = config.isRightSpin ?? true;
        this.shatterHp = 100;
        this.isShattered = false;
        this.radius = config.radius || 1.2;
        this.mass = config.mass || 0.045;

        // 轉動慣量矩陣
        const { I_xy, I_z } = calculateCylinderInertia(this.mass, this.radius * 0.1, 0.04);
        this.Iz = I_z;

        // 建立 Cannon.js 剛體
        this.body = new CANNON.Body({
            mass: this.mass,
            material: defaultMaterial,
            linearDamping: 0.03,    // 平移線阻尼
            angularDamping: 0.0008, // 旋轉角阻尼
            ccdSpeedThreshold: 5,   // 觸發高速度防穿透臨限值
            ccdIterations: 5
        });

        // 採用球體微幾何碰撞形狀（防止幾何邊緣卡死）
        this.body.addShape(new CANNON.Sphere(this.radius * 0.8));
        this.body.position.set(config.x, config.y, config.z);

        // 設定初始轉速 (RPM 轉角速度 rad/s)
        const initialRpm = config.rpm || 12000;
        const spinRad = (initialRpm * 2 * Math.PI) / 60 * (this.isRightSpin ? -1 : 1);
        this.body.angularVelocity.set(0, spinRad, 0);

        // 手動覆寫轉动慣量
        this.body.inertia.set(I_xy, I_z, I_xy);
        this.body.invInertia.set(1 / I_xy, 1 / I_z, 1 / I_xy);

        world.addBody(this.body);
    }

    /**
     * 每一物理步長執行的力學演算
     */
    stepPhysics(dt) {
        if (this.isShattered) return;

        const distFromCenter = Math.hypot(this.body.position.x, this.body.position.z);

        // 1. 戰鬥盤坡度向心引力 (Bowl Gravity)
        if (distFromCenter > 0.1 && distFromCenter < STADIUM_RADIUS) {
            const pullMagnitude = 0.18 * distFromCenter;
            const fx = (-this.body.position.x / distFromCenter) * pullMagnitude;
            const fz = (-this.body.position.z / distFromCenter) * pullMagnitude;
            this.body.applyForce(new CANNON.Vec3(fx, 0, fz), this.body.position);
        }

        // 2. Stribeck 摩擦力與空氣衰減
        this.body.angularVelocity.y *= 0.9996;
    }

    /**
     * 讀取當前狀態快照 (用於 WebRTC 廣播)
     */
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

    /**
     * 根據快照強制進行狀態平滑校正 (Reconciliation)
     */
    applySnapshot(snapshot, lerpFactor = 0.25) {
        const targetPos = new CANNON.Vec3(snapshot.px, snapshot.py, snapshot.pz);
        const targetVel = new CANNON.Vec3(snapshot.vx, snapshot.vy, snapshot.vz);
        const targetAngVel = new CANNON.Vec3(snapshot.wx, snapshot.wy, snapshot.wz);

        // 位置與速度平滑插值 (防止網路微小震動導致畫面閃爍)
        this.body.position.vadd(targetPos.vsub(this.body.position).scale(lerpFactor), this.body.position);
        this.body.velocity.vadd(targetVel.vsub(this.body.velocity).scale(lerpFactor), this.body.velocity);
        this.body.angularVelocity.vadd(targetAngVel.vsub(this.body.angularVelocity).scale(lerpFactor), this.body.angularVelocity);
        
        this.shatterHp = snapshot.hp;
    }
}
