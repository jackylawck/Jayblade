// js/engine3d.js - 爆上陀螺 3D 剛體力學物理引擎 (含動態陰影與 3D 空間碰撞)

export var STADIUM_RADIUS = 9.0;
export var WALL_HEIGHT = 2.0;

export var scene, camera, renderer, controls, world, defaultMaterial, stadiumMaterial;
export var activeTops = [];
export var sparkParticles = [];

export const PARTS_PHYSICS = {
    CROWN: {
        FEATHER: { mass: 0.042, radius: 1.05, drag: 0.003 },
        DRAKE:   { mass: 0.048, radius: 1.00, drag: 0.005 },
        HEAVY:   { mass: 0.056, radius: 0.98, drag: 0.007 },
        WIZARD:  { mass: 0.045, radius: 1.02, drag: 0.004 }
    },
    TIP: {
        FLAT:   { friction: 0.08, angularDamping: 0.006, grip: 1.8 },
        BALL:   { friction: 0.02, angularDamping: 0.002, grip: 0.5 },
        NEEDLE: { friction: 0.04, angularDamping: 0.004, grip: 1.2 },
        ACCEL:  { friction: 0.09, angularDamping: 0.007, grip: 2.2 }
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
    
    // 💡 1. 開啟 3D 動態陰影渲染
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerEl.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    // 💡 2. 設定投射陰影的主光源
    var mainSpot = new THREE.SpotLight(0xffffff, 2.0);
    mainSpot.position.set(0, 20, 5);
    mainSpot.angle = Math.PI / 3;
    mainSpot.penumbra = 0.4;
    mainSpot.castShadow = true;
    mainSpot.shadow.mapSize.width = 1024;
    mainSpot.shadow.mapSize.height = 1024;
    mainSpot.shadow.camera.near = 0.5;
    mainSpot.shadow.camera.far = 30;
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
    stadiumMesh.receiveShadow = true; // 💡 戰鬥盤接收影子
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

        this.hp = 120;
        this.isKnockedOut = false;
        this.isBurst = false;

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
        crownMesh.castShadow = true; // 💡 陀螺產生影子
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

        var up = new CANNON.Vec3(0, 1, 0);
        var topUp = this.body.quaternion.vmult(new CANNON.Vec3(0, 1, 0));
        var dotUp = topUp.dot(up);

        if (dotUp < 0.5) {
            this.body.angularVelocity.scale(0.92, this.body.angularVelocity);
            this.body.velocity.scale(0.90, this.body.velocity);
        }

        if (this.getRPM() < 30) {
            this.body.angularVelocity.set(0, 0, 0);
        }
    }
}

// 💥 修正：包含 3D Y 軸高度判定與停轉防刷火花
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

            // 💡 修正 1：如果雙方轉速低於 50 RPM，視為已停轉靜止，不產生火花與推力
            if (rpmA < 50 && rpmB < 50) continue;

            const dx = posB.x - posA.x;
            const dy = posB.y - posA.y;
            const dz = posB.z - posA.z;
            
            // 💡 修正 2：改用包含 Y 軸的 3D 空間距離
            const dist3D = Math.hypot(dx, dy, dz);
            const minDist = topA.radius + topB.radius;

            // 只有落到盤面附近 (Y < 0.8) 且真實 3D 距離接觸才觸發
            if (dist3D < minDist && dist3D > 0 && posA.y < 0.8 && posB.y < 0.8) {
                const nx = dx / dist3D;
                const nz = dz / dist3D;

                const overlap = (minDist - dist3D) / 2 + 0.15;
                posA.x -= nx * overlap;
                posA.z -= nz * overlap;
                posB.x += nx * overlap;
                posB.z += nz * overlap;

                const avgRpm = (rpmA + rpmB) / 2;
                const recoilImpulse = avgRpm > 100 ? (0.16 + (avgRpm / 12000) * 0.26) : 0.08;

                topA.body.applyImpulse(new CANNON.Vec3(-nx * recoilImpulse, 0.05, -nz * recoilImpulse), posA);
                topB.body.applyImpulse(new CANNON.Vec3(nx * recoilImpulse, 0.05, nz * recoilImpulse), posB);

                topA.body.angularVelocity.y *= 0.94;
                topB.body.angularVelocity.y *= 0.94;

                topA.hp -= recoilImpulse * 35;
                topB.hp -= recoilImpulse * 35;

                if (topA.hp <= 0) topA.isBurst = true;
                if (topB.hp <= 0) topB.isBurst = true;

                spawn3DSparks((posA.x + posB.x) / 2, 0.4, (posA.z + posB.z) / 2, 12);
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
