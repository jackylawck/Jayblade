import { PerformanceConfig } from './config.js';
import { WebAudioEngine } from './audio.js';
import { GPUSparkParticleSystem } from './particles.js';
import { BinaryNetworkManager } from './network.js';
import { EnergyTrackerUI, UIManager } from './ui.js';
import { STADIUM_RADIUS, GEAR_RAIL_RADIUS, Beyblade3D } from './physics.js';

let scene, camera, renderer, controls, gpuSparks, sfx3D, netManager, energyUI, uiManager;
let world, defaultMaterial, stadiumMaterial;
let activeTops = [];
let obstacleBodies = [], obstacleMeshes = [];
let isSimulating = false, matchEnded = false, showPrecessionVectors = false;
let initialEnergy = 0;
let matchStartTime = 0;
let lastTime = performance.now();

const config = PerformanceConfig.getSettings();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    scene.fog = new THREE.FogExp2(0x0a0a0f, 0.015);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 20, 24);

    renderer = new THREE.WebGLRenderer({ antialias: config.enableAntiAlias });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffddaa, 1.2);
    dirLight.position.set(15, 30, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = config.shadowMapSize;
    dirLight.shadow.mapSize.height = config.shadowMapSize;
    scene.add(dirLight);

    sfx3D = new WebAudioEngine();
    gpuSparks = new GPUSparkParticleSystem(scene, config.particleCount);
    energyUI = new EnergyTrackerUI('energy-canvas');
    uiManager = new UIManager();

    netManager = new BinaryNetworkManager();
    netManager.init(
        () => { document.getElementById('match-status').innerText = uiManager.getText('webrtcConnected'); },
        (errMsg) => { document.getElementById('match-status').innerText = '⚠️ ' + errMsg; }
    );

    window.onWebRTCDataReceived = (arrayBuffer) => {
        BinaryNetworkManager.unpackState(arrayBuffer, activeTops);
    };

    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.broadphase = new CANNON.NaiveBroadphase();

    defaultMaterial = new CANNON.Material('default');
    stadiumMaterial = new CANNON.Material('stadium');

    createStadium();
    bindUIEvents();
    setupTouchGestures();

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('click', () => sfx3D.init(), { once: true });
    animate(performance.now());
}

// 🛠️ 關鍵修復：Cannon.js Cylinder 剛體姿態旋轉 -90 度 (橫臥改為豎立平放)
function createStadium() {
    const geo = new THREE.CylinderGeometry(STADIUM_RADIUS, 2, 3, 48, 1, true);
    const mat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.2, metalness: 0.8, side: THREE.DoubleSide });
    const stadiumMesh = new THREE.Mesh(geo, mat);
    stadiumMesh.position.y = -1.5;
    scene.add(stadiumMesh);

    const groundBody = new CANNON.Body({ mass: 0, material: stadiumMaterial });
    const cylinderShape = new CANNON.Cylinder(STADIUM_RADIUS, 2, 3, 32);
    
    // 旋轉剛體形狀 90 度，使圓柱體沿 Y 軸放置
    const q = new CANNON.Quaternion();
    q.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    groundBody.addShape(cylinderShape, new CANNON.Vec3(0, -1.5, 0), q);
    
    world.addBody(groundBody);
}

function spawnArenaObstacles() {
    clearObstacles();
    const positions = [{ x: -3.5, z: -3.5 }, { x: 3.5, z: 3.5 }, { x: -3.5, z: 3.5 }, { x: 3.5, z: -3.5 }];
    positions.forEach(p => {
        const geo = new THREE.CylinderGeometry(0.8, 0.8, 0.6, 16);
        const mat = new THREE.MeshStandardMaterial({ color: 0x00d2d3, roughness: 0.1, metalness: 0.9 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(p.x, 0.1, p.z);
        scene.add(mesh);
        obstacleMeshes.push(mesh);

        const body = new CANNON.Body({ mass: 0, material: stadiumMaterial });
        const q = new CANNON.Quaternion();
        q.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        body.addShape(new CANNON.Cylinder(0.8, 0.8, 0.6, 16), new CANNON.Vec3(p.x, 0.1, p.z), q);
        world.addBody(body);
        obstacleBodies.push(body);
    });
}

function clearObstacles() {
    obstacleMeshes.forEach(m => scene.remove(m));
    obstacleBodies.forEach(b => world.remove(b));
    obstacleMeshes = []; obstacleBodies = [];
}

function handleMultiTopImpacts() {
    for (let i = 0; i < activeTops.length; i++) {
        for (let j = i + 1; j < activeTops.length; j++) {
            const p1 = activeTops[i], p2 = activeTops[j];
            if (p1.isShattered || p2.isShattered) continue;

            const dist = p1.body.position.distanceTo(p2.body.position);
            const contactRadius = (p1.radius + p2.radius) * 0.8;

            if (dist < contactRadius) {
                const penetrationDepth = contactRadius - dist;
                const normal = p1.body.position.vsub(p2.body.position).unit();
                const relVelVec = p1.body.velocity.vsub(p2.body.velocity);
                const normalVel = relVelVec.dot(normal);

                const k = 1200.0, b = 80.0;
                const FnMag = Math.max(0, k * Math.pow(penetrationDepth, 1.5) + b * Math.pow(penetrationDepth, 1.5) * normalVel);

                const impulse = normal.scale(FnMag * 0.016);
                p1.body.applyImpulse(impulse, p1.body.position);
                p2.body.applyImpulse(impulse.scale(-1), p2.body.position);

                if (FnMag > 5) {
                    const midX = (p1.group.position.x + p2.group.position.x) / 2;
                    const midY = (p1.group.position.y + p2.group.position.y) / 2;
                    const midZ = (p1.group.position.z + p2.group.position.z) / 2;
                    gpuSparks.emit(midX, midY, midZ, FnMag / 15);
                    sfx3D.playImpact(Math.min(1.0, FnMag / 30), 1.0);

                    p1.shatterHp -= (FnMag * 0.08) * (1.1 - p1.burstResist);
                    p2.shatterHp -= (FnMag * 0.08) * (1.1 - p2.burstResist);
                }
            }
        }
    }
}

// 🛡️ 離場判定保護期 (開局 2 秒不判 Over Finish)
function checkMatchRules() {
    if (!isSimulating || matchEnded) return;
    const statusEl = document.getElementById('match-status');
    const now = performance.now();
    const inGracePeriod = (now - matchStartTime) < 2000;

    activeTops.forEach(top => {
        if (top.isShattered) return;
        const dist = Math.hypot(top.body.position.x, top.body.position.z);

        if (!inGracePeriod && dist > STADIUM_RADIUS + 1.5) {
            top.triggerShatter(gpuSparks, sfx3D);
            statusEl.innerText = (now - top.lastXDashTime) < 1500 ? 
                `💥⚡ EXTREME FINISH! 【${top.name}】` : 
                `🚨 OVER FINISH! 【${top.name}】`;
        } else if (top.shatterHp <= 0) {
            top.triggerShatter(gpuSparks, sfx3D);
            statusEl.innerText = `💥 BURST FINISH! 【${top.name}】`;
        }
    });

    const survivors = activeTops.filter(t => !t.isShattered && t.rpm > 50);
    if (survivors.length === 1 && activeTops.length > 1) {
        statusEl.innerText = `🏆 WINNER! 【${survivors[0].name}】${uiManager.getText('winSuffix')}`;
        matchEnded = true;
    } else if (survivors.length === 0 && activeTops.length > 0) {
        statusEl.innerText = `🌀 SPIN FINISH! 平手！`;
        matchEnded = true;
    }
}

function calculateTotalKineticEnergy() {
    return activeTops.reduce((sum, t) => {
        if (t.isShattered) return sum;
        return sum + 0.5 * 0.045 * t.body.velocity.norm2() + 0.5 * t.Iz * t.body.angularVelocity.norm2();
    }, 0);
}

function launch3DBattle(playerCount = 2) {
    sfx3D.init();
    activeTops.forEach(top => { if (!top.isShattered) top.triggerShatter(gpuSparks, sfx3D); });
    activeTops = [];

    if (playerCount === 4) spawnArenaObstacles();
    else clearObstacles();

    const configs = [
        { x: -4, z: 0, color: 0x1e90ff, name: '🔵 火鷹飛龍', spin: true, res: 0.85, vx: 3.5, vz: 2 },
        { x: 4, z: 0, color: 0xff3838, name: '🔴 影武赤狼', spin: false, res: 0.70, vx: -3.5, vz: -2 },
        { x: 0, z: -4, color: 0x2ecc71, name: '🟢 翡翠巨錘', spin: true, res: 0.90, vx: 1.5, vz: 3.5 },
        { x: 0, z: 5, color: 0x9b59b6, name: '🟣 帝王紫刃', spin: false, res: 0.65, vx: -1.5, vz: -3.5 }
    ];

    for (let i = 0; i < playerCount; i++) {
        const c = configs[i];
        const top = new Beyblade3D(scene, world, defaultMaterial, c.x, 3, c.z, c.color, c.name, c.spin, c.res);
        top.body.velocity.set(c.vx, -2, c.vz);
        activeTops.push(top);
    }

    initialEnergy = calculateTotalKineticEnergy();
    matchStartTime = performance.now();
    matchEnded = false; 
    isSimulating = true;
    document.getElementById('match-status').innerText = `⚔️ ${playerCount} ${uiManager.getText('battleInProg')}`;
}

function setupTouchGestures() {
    const zone = document.getElementById('touch-launch-zone');
    let startY = 0;
    zone.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; zone.classList.add('active'); });
    zone.addEventListener('touchend', (e) => {
        zone.classList.remove('active');
        if (startY - e.changedTouches[0].clientY > 40) launch3DBattle(activeTops.length || 2);
    });
}

function bindUIEvents() {
    document.getElementById('btn-2p').addEventListener('click', () => launch3DBattle(2));
    document.getElementById('btn-4p').addEventListener('click', () => launch3DBattle(4));
    
    const langBtn = document.getElementById('btn-lang');
    if (langBtn) {
        langBtn.addEventListener('click', () => uiManager.toggleLanguage());
    }

    document.getElementById('btn-helper').addEventListener('click', () => {
        showPrecessionVectors = !showPrecessionVectors;
        alert(showPrecessionVectors ? uiManager.getText('helperOn') : uiManager.getText('helperOff'));
    });

    document.getElementById('btn-connect').addEventListener('click', () => {
        const code = document.getElementById('room-id-input').value;
        netManager.connect(
            code,
            () => { document.getElementById('match-status').innerText = uiManager.getText('webrtcConnected'); },
            (errMsg) => { document.getElementById('match-status').innerText = '⚠️ ' + errMsg; }
        );
    });
}

function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (isSimulating) {
        world.step(1 / 60, dt, config.subSteps);

        activeTops.forEach(top => top.update(dt, showPrecessionVectors, sfx3D, obstacleBodies));
        gpuSparks.update(dt);
        handleMultiTopImpacts();
        checkMatchRules();
        netManager.broadcastState(now, isSimulating, activeTops);

        const currentKE = calculateTotalKineticEnergy();
        energyUI.recordAndDraw(currentKE, initialEnergy);

        let telemetryHTML = '';
        activeTops.forEach(t => {
            telemetryHTML += `${t.name}: ${t.isShattered ? uiManager.getText('outOfBounds') : Math.round(t.rpm) + ' RPM | HP:' + Math.max(0, Math.round(t.shatterHp))}<br>`;
        });
        document.getElementById('telemetry-box').innerHTML = telemetryHTML;
    }

    controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.onload = init;
