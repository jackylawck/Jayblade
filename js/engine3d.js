// js/engine3d.js - 爆上陀螺 3D 剛體力學物理引擎 (16種 Combo 戰術配件資料庫)

export var STADIUM_RADIUS = 9.0;
export var WALL_HEIGHT = 2.0;

export var scene, camera, renderer, controls, world, defaultMaterial, stadiumMaterial;
export var activeTops = [];
export var sparkParticles = [];

// 🔬 科研級 16 種戰術 Combo 物理屬性庫
export const PARTS_PHYSICS = {
    CROWN: {
        FEATHER: { mass: 0.040, radius: 1.05, drag: 0.002, burstResist: 110 },
        DRAKE:   { mass: 0.048, radius: 1.00, drag: 0.005, burstResist: 120 },
        HEAVY:   { mass: 0.058, radius: 0.98, drag: 0.008, burstResist: 130 },
        WIZARD:  { mass: 0.045, radius: 1.02, drag: 0.003, burstResist: 115 },
        PHOENIX: { mass: 0.052, radius: 1.08, drag: 0.004, burstResist: 125 }, // 朱雀翼刃 (大轉動慣量)
        SCYTHE:  { mass: 0.046, radius: 1.01, drag: 0.005, burstResist: 118 }, // 死神鐮刀 (上鏟力)
        RHINO:   { mass: 0.050, radius: 0.92, drag: 0.006, burstResist: 140 }, // 犀牛角盾 (高抗爆)
        VIPER:   { mass: 0.044, radius: 1.03, drag: 0.004, burstResist: 112 }  // 毒蛇交鋒 (多齒削速)
    },
    TIP: {
        FLAT:   { friction: 0.08, angularDamping: 0.006, grip: 1.8 },
        BALL:   { friction: 0.02, angularDamping: 0.002, grip: 0.5 },
        NEEDLE: { friction: 0.04, angularDamping: 0.004, grip: 1.2 },
        ACCEL:  { friction: 0.09, angularDamping: 0.007, grip: 2.2 },
        HEXA:   { friction: 0.03, angularDamping: 0.003, grip: 1.5 }, // 六角防禦 (姿態穩定)
        POINT:  { friction: 0.05, angularDamping: 0.0035, grip: 1.1 },// 半球尖軸 (雙重動態)
        TAPER:  { friction: 0.07, angularDamping: 0.005, grip: 1.6 }, // 漸銳平軸 (姿態反擊)
        RUBBER: { friction: 0.12, angularDamping: 0.009, grip: 2.8 }  // 橡膠平軸 (超高彈開力)
    }
};

export function init3DEngine(containerEl) {
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

    var mainSpot = new THREE.SpotLight(0xffffff, 2.0);
    mainSpot.position.set(0, 20, 5);
    mainSpot.angle = Math.PI / 3;
    mainSpot.penumbra = 0.4;
    mainSpot.castShadow = true;
    mainSpot.shadow.mapSize.width = 1024;
    mainSpot.shadow.mapSize.height = 1024;
    scene.add(mainSpot);

    var sideLight1 = new THREE.DirectionalLight(0xff7e5f, 0.8);
    sideLight1.position.set(15, 15, 10);
    scene.add(sideLight1);

    var sideLight2 = new THREE.DirectionalLight(0x00f2fe, 0.8);
    sideLight2.position.set(-15, 15, -10);
    scene.add(sideLight2);

    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);

    defaultMaterial = new CANNON.Material('default');
    stadiumMaterial = new CANNON.Material('stadium');

    var contactMat = new CANNON.ContactMaterial(defaultMaterial, stadiumMaterial, { friction: 0.2, restitution: 0.3 });
    world.addContactMaterial(contactMat);

    create3DStadiumLayout();
}

function create3DStadiumLayout() {
    var geo = new THREE.CylinderGeometry(STADIUM_RADIUS, STADIUM_RADIUS - 1.8, 0.8, 64);
    var mat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.15, metalness: 0.1 });
    var stadiumMesh = new THREE.Mesh(geo, mat);
    stadiumMesh.position.y = -0.4;
    stadiumMesh.receiveShadow = true;
    scene.add(stadiumMesh);

    var centerRingGeo = new THREE.RingGeometry(1.5, 1.8, 32);
    var centerRingMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, side: THREE.DoubleSide });
    var centerRing = new THREE.Mesh(centerRingGeo, centerRingMat);
    centerRing.rotation.x = Math.PI / 2;
    centerRing.position.y = 0.01;
    scene.add(centerRing);

    var railGeo = new THREE.TorusGeometry(STADIUM_RADIUS - 0.3, 0.22, 16, 64);
    var railMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 0.7, roughness: 0.2 });
    var railMesh = new THREE.Mesh(railGeo, railMat);
    railMesh.rotation.x = Math.PI / 2;
    railMesh.position.y = 0.05;
    scene.add(railMesh);

    var wallGeo = new THREE.CylinderGeometry(STADIUM_RADIUS, STADIUM_RADIUS, WALL_HEIGHT, 64, 1, true);
    var wallMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35, roughness: 0.05, transmission: 0.9, thickness: 0.8, side: THREE.DoubleSide });
    var wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.position.y = WALL_HEIGHT / 2;
    scene.add(wallMesh);

    var groundBody = new CANNON.Body({ mass: 0, material: stadiumMaterial });
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(groundBody);
}

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
        this.tipFriction = tipData.friction;

        this.hp = crownData.burstResist;
        this.maxHp = crownData.burstResist;
        this.isKnockedOut = false;
        this.isBurst = false;

        const rMeters = this.radius * 0.03;
        this.I_yy = 0.5 * this.mass * Math.pow(rMeters, 2);
        this.I_xx = 0.25 * this.mass * Math.pow(rMeters, 2) + (1/12) * this.mass * Math.pow(0.015, 2);
        this.I_zz = this.I_xx;

        this.lastImpulseMag = 0;

        this.body = new CANNON.Body({
            mass: this.mass,
            material: defaultMaterial,
            linearDamping: this.tipFriction,
            angularDamping: tipData.angularDamping
        });

        this.body.addShape(new CANNON.Sphere(this.radius * 0.8));
        this.body.position.set(config.x, config.y || 0.4, config.z);

        var spinRad = (config.rpm * 2 * Math.PI) / 60 * (this.isRightSpin ? -1 : 1);
        this.body.angularVelocity.set(0, spinRad, 0);

        this.group = new THREE.Group();

        var crownGeo = new THREE.CylinderGeometry(this.radius, this.radius * 0.8, 0.35, 16);
        var crownMat = new THREE.MeshStandardMaterial({
            color: config.color || 0x0284c7,
            metalness: 0.9,
            roughness: 0.15
        });
        var crownMesh = new THREE.Mesh(crownGeo, crownMat);
        crownMesh.castShadow = true;
        this.group.add(crownMesh);

        for (var b = 0; b < 6; b++) {
            var toothGeo = new THREE.BoxGeometry(0.2, 0.3, 0.4);
            var toothMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });
            var tooth = new THREE.Mesh(toothGeo, toothMat);
            var ang = (b / 6) * Math.PI * 2;
            tooth.position.set(Math.cos(ang) * (this.radius * 0.88), 0, Math.sin(ang) * (this.radius * 0.88));
            tooth.rotation.y = -ang;
            tooth.castShadow = true;
            this.group.add(tooth);
        }

        var coreGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.15, 16);
        var coreMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00f2fe, emissiveIntensity: 0.6 });
        var coreMesh = new THREE.Mesh(coreGeo, coreMat);
        coreMesh.position.y = 0.22;
        this.group.add(coreMesh);

        scene.add(this.group);
        world.addBody(this.body);
    }

    getRPM() {
        return Math.round((Math.abs(this.body.angularVelocity.y) * 60) / (2 * Math.PI));
    }

    getLinearSpeed() {
        return this.body.velocity.norm();
    }

    getTranslationalKE() {
        return 0.5 * this.mass * Math.pow(this.getLinearSpeed(), 2);
    }

    getRotationalKE() {
        const wy = this.body.angularVelocity.y;
        const wx = this.body.angularVelocity.x;
        const wz = this.body.angularVelocity.z;
        return 0.5 * (this.I_yy * Math.pow(wy, 2) + this.I_xx * Math.pow(wx, 2) + this.I_zz * Math.pow(wz, 2));
    }

    getTotalKE() {
        return (this.getTranslationalKE() + this.getRotationalKE()).toFixed(4);
    }

    getAngularMomentumVector() {
        const Lx = (this.I_xx * this.body.angularVelocity.x).toFixed(5);
        const Ly = (this.I_yy * this.body.angularVelocity.y).toFixed(5);
        const Lz = (this.I_zz * this.body.angularVelocity.z).toFixed(5);
        return { Lx, Ly, Lz };
    }

    getTiltAngle() {
        var up = new CANNON.Vec3(0, 1, 0);
        var topUp = this.body.quaternion.vmult(new CANNON.Vec3(0, 1, 0));
        return (Math.acos(Math.min(1.0, Math.max(-1.0, topUp.dot(up)))) * 180 / Math.PI).toFixed(1);
    }

    getPrecessionFrequency() {
        const tiltRad = parseFloat(this.getTiltAngle()) * (Math.PI / 180);
        const wy = Math.abs(this.body.angularVelocity.y);
        if (wy < 1 || tiltRad < 0.01) return "0.00";
        const Omega_p = (this.mass * 9.81 * 0.01) / (this.I_yy * wy);
        return (Omega_p / (2 * Math.PI)).toFixed(2);
    }

    getCentripetalForce() {
        var dist = Math.hypot(this.body.position.x, this.body.position.z);
        return (0.75 * dist * this.mass).toFixed(2);
    }

    getNormalForce() {
        const verticalAccel = Math.abs(this.body.velocity.y);
        return (this.mass * 9.81 + this.mass * verticalAccel).toFixed(3);
    }

    getFrictionForce() {
        return (parseFloat(this.getNormalForce()) * this.tipFriction).toFixed(3);
    }

    stepPhysics(dt) {
        if (this.isKnockedOut || this.isBurst) return;

        this.group.position.copy(this.body.position);
        this.group.quaternion.copy(this.body.quaternion);

        var distFromCenter = Math.hypot(this.body.position.x, this.body.position.z);

        if (distFromCenter > 0.1 && distFromCenter < STADIUM_RADIUS) {
            var nx = this.body.position.x / distFromCenter;
            var nz = this.body.position.z / distFromCenter;
            var bowlPull = 0.75 * distFromCenter;
            this.body.applyForce(new CANNON.Vec3(-nx * bowlPull, 0, -nz * bowlPull), this.body.position);
        }

        if (distFromCenter + this.radius >= STADIUM_RADIUS) {
            var nx = this.body.position.x / distFromCenter;
            var nz = this.body.position.z / distFromCenter;

            if (this.body.position.y > WALL_HEIGHT || distFromCenter > STADIUM_RADIUS + 1.5) {
                this.isKnockedOut = true;
                return;
            }

            this.body.position.x = nx * (STADIUM_RADIUS - this.radius);
            this.body.position.z = nz * (STADIUM_RADIUS - this.radius);

            var vNormal = this.body.velocity.x * nx + this.body.velocity.z * nz;

            if (vNormal > -0.5) {
                var restitution = 0.65;
                this.body.velocity.x -= (1.0 + restitution) * Math.max(0.6, vNormal) * nx;
                this.body.velocity.z -= (1.0 + restitution) * Math.max(0.6, vNormal) * nz;
                
                this.body.velocity.x *= 0.90;
                this.body.velocity.z *= 0.90;

                if (this.getRPM() > 200) {
                    spawn3DSparks(this.body.position.x, 0.4, this.body.position.z, 6);
                }
            }
        }

        var tilt = parseFloat(this.getTiltAngle());
        if (tilt > 45) {
            this.body.angularVelocity.scale(0.92, this.body.angularVelocity);
            this.body.velocity.scale(0.90, this.body.velocity);
        } else {
            this.body.angularVelocity.y *= 0.9965;
        }

        if (this.getRPM() < 30) {
            this.body.angularVelocity.set(0, 0, 0);
            this.body.velocity.set(0, 0, 0);
        }
    }
}

export function handle3DTopCollisions() {
    for (let i = 0; i < activeTops.length; i++) {
        for (let j = i + 1; j < activeTops.length; j++) {
            const topA = activeTops[i];
            const topB = activeTops[j];
            if (topA.isKnockedOut || topB.isKnockedOut || topA.isBurst || topB.isBurst) continue;

            const posA = topA.body.position;
            const posB = topB.body.position;

            const rpmA = topA.getRPM();
            const rpmB = topB.getRPM();

            if (rpmA < 50 && rpmB < 50) continue;

            const dx = posB.x - posA.x;
            const dy = posB.y - posA.y;
            const dz = posB.z - posA.z;
            
            const distHorizontal = Math.hypot(dx, dz);
            const heightDiff = Math.abs(dy);
            const minDist = topA.radius + topB.radius + 0.3;

            if (distHorizontal < minDist && distHorizontal > 0 && heightDiff < 1.2) {
                const nx = dx / (distHorizontal || 1);
                const nz = dz / (distHorizontal || 1);

                const overlap = (minDist - distHorizontal) / 2 + 0.1;
                posA.x -= nx * overlap;
                posA.z -= nz * overlap;
                posB.x += nx * overlap;
                posB.z += nz * overlap;

                const avgRpm = (rpmA + rpmB) / 2;
                const recoilImpulse = avgRpm > 100 ? (0.20 + (avgRpm / 12000) * 0.35) : 0.12;

                topA.body.applyImpulse(new CANNON.Vec3(-nx * recoilImpulse, 0.08, -nz * recoilImpulse), posA);
                topB.body.applyImpulse(new CANNON.Vec3(nx * recoilImpulse, 0.08, nz * recoilImpulse), posB);

                topA.lastImpulseMag = recoilImpulse.toFixed(3);
                topB.lastImpulseMag = recoilImpulse.toFixed(3);

                topA.body.angularVelocity.y *= 0.93;
                topB.body.angularVelocity.y *= 0.93;

                const dmg = recoilImpulse * 45;
                topA.hp -= dmg;
                topB.hp -= dmg;

                if (topA.hp <= 0) { topA.hp = 0; topA.isBurst = true; }
                if (topB.hp <= 0) { topB.hp = 0; topB.isBurst = true; }

                spawn3DSparks((posA.x + posB.x) / 2, 0.4, (posA.z + posB.z) / 2, 14);
            }
        }
    }
}

export function spawn3DSparks(x, y, z, count) {
    for (var i = 0; i < count; i++) {
        var pGeo = new THREE.SphereGeometry(0.08 + Math.random() * 0.05, 6, 6);
        var pMat = new THREE.MeshBasicMaterial({
            color: Math.random() > 0.3 ? 0xffea00 : 0xff3300,
            transparent: true,
            opacity: 1.0
        });
        var mesh = new THREE.Mesh(pGeo, pMat);
        mesh.position.set(x, y, z);

        var vx = (Math.random() - 0.5) * 6;
        var vy = 1 + Math.random() * 4;
        var vz = (Math.random() - 0.5) * 6;

        scene.add(mesh);
        sparkParticles.push({ mesh: mesh, vx: vx, vy: vy, vz: vz, life: 1.0 });
    }
}

export function update3DSparks(dt) {
    for (var i = sparkParticles.length - 1; i >= 0; i--) {
        var p = sparkParticles[i];
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
