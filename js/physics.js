export const STADIUM_RADIUS = 12;
export const GEAR_RAIL_RADIUS = 10.5;

export class Beyblade3D {
    constructor(scene, world, defaultMaterial, x, y, z, color, name, isRightSpin = true, burstResist = 0.85, radius = 1.5) {
        this.scene = scene;
        this.world = world;
        this.name = name;
        this.color = color;
        this.isRightSpin = isRightSpin;
        this.rpm = 12000;
        this.rho = 1.225;
        this.area = 0.00785;
        this.radius = radius;
        this.xdashCooldown = 0;
        this.lastXDashTime = 0;
        this.burstResist = burstResist;
        this.shatterHp = 100;
        this.isShattered = false;
        this.arrowHelper = null;

        this.group = new THREE.Group();
        const crownGeo = new THREE.CylinderGeometry(radius, radius * 0.86, 0.4, 8);
        const crownMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.9, roughness: 0.2 });
        this.group.add(new THREE.Mesh(crownGeo, crownMat));

        const coreGeo = new THREE.SphereGeometry(0.6, 16, 16);
        const coreMat = new THREE.MeshPhongMaterial({ color: 0x00d2d3, transparent: true, opacity: 0.8 });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        coreMesh.position.y = 0.2;
        this.group.add(coreMesh);

        scene.add(this.group);

        const mass = 0.045;
        this.body = new CANNON.Body({ mass: mass, material: defaultMaterial });
        this.body.addShape(new CANNON.Sphere(1.2));

        const I_z = 0.5 * mass * Math.pow(radius * 0.1, 2);
        const I_xy = 0.25 * mass * Math.pow(radius * 0.1, 2) + (1/12) * mass * Math.pow(0.04, 2);
        this.body.inertia.set(I_xy, I_z, I_xy);
        this.body.invInertia.set(1/I_xy, 1/I_z, 1/I_xy);
        this.Iz = I_z;

        this.body.position.set(x, y, z);
        const spinRad = (this.rpm * 2 * Math.PI) / 60 * (isRightSpin ? -1 : 1);
        this.body.angularVelocity.set(0, spinRad, 0);

        world.addBody(this.body);
    }

    update(dt, showPrecessionVectors, sfx3D, obstacleBodies) {
        if (this.isShattered) return;

        this.group.position.copy(this.body.position);
        this.group.quaternion.copy(this.body.quaternion);
        this.rpm = Math.abs(this.body.angularVelocity.y) * 60 / (2 * Math.PI);

        // A. 空氣動力學
        if (this.rpm > 1000) {
            const upVector = new CANNON.Vec3(0, 1, 0);
            const localUp = this.body.quaternion.vmult(upVector);
            const linVel = this.body.velocity;
            const speed = linVel.norm();

            if (speed > 0.1) {
                const velDir = linVel.unit();
                const cosAlpha = Math.min(1, Math.max(-1, velDir.dot(localUp)));
                const alpha = Math.acos(cosAlpha);

                const vortexCoeff = 0.00015 * Math.pow(this.rpm / 1000, 2);
                const dragMag = (0.5 * this.rho * Math.pow(speed, 2) * this.area + vortexCoeff) * (0.1 + 0.5 * Math.pow(Math.sin(alpha), 2));
                const dragForce = velDir.scale(-dragMag);

                const spinVec = new CANNON.Vec3(0, this.body.angularVelocity.y, 0);
                const magnusForce = spinVec.cross(linVel).scale(0.00008);

                const liftMag = 0.5 * this.rho * Math.pow(speed, 2) * this.area * (0.4 * Math.sin(2 * alpha));
                const liftForce = localUp.scale(liftMag);

                this.body.applyForce(dragForce, this.body.position);
                this.body.applyForce(magnusForce, this.body.position);
                this.body.applyForce(liftForce, this.body.position);
            }
        }

        // 進動與向量輔助線
        const upVector = new CANNON.Vec3(0, 1, 0);
        const localUp = this.body.quaternion.vmult(upVector);
        const tiltAngle = Math.acos(Math.min(1, Math.max(-1, localUp.y)));

        if (tiltAngle > 0.01 && Math.abs(this.body.angularVelocity.y) > 10) {
            const tiltAxis = new CANNON.Vec3();
            tiltAxis.cross(upVector, localUp);
            if (tiltAxis.norm() > 0.001) {
                tiltAxis.normalize();
                const precessionRate = (9.81 * 0.004) / (Math.abs(this.body.angularVelocity.y) * this.Iz);
                const precessionMagnitude = precessionRate * this.body.angularVelocity.y * 0.005;
                const torqueVec = new CANNON.Vec3(tiltAxis.x * precessionMagnitude, tiltAxis.y * precessionMagnitude, tiltAxis.z * precessionMagnitude);
                this.body.torque.vadd(torqueVec, this.body.torque);

                if (showPrecessionVectors) {
                    if (!this.arrowHelper) {
                        this.arrowHelper = new THREE.ArrowHelper(new THREE.Vector3(tiltAxis.x, tiltAxis.y, tiltAxis.z), this.group.position, 2.5, 0xffcc00);
                        this.scene.add(this.arrowHelper);
                    } else {
                        this.arrowHelper.position.copy(this.group.position);
                        this.arrowHelper.setDirection(new THREE.Vector3(tiltAxis.x, tiltAxis.y, tiltAxis.z));
                        this.arrowHelper.visible = true;
                    }
                } else if (this.arrowHelper) {
                    this.arrowHelper.visible = false;
                }
            }
        }

        // B. 漸開線齒輪與障礙物衝量避讓
        if (this.xdashCooldown > 0) this.xdashCooldown -= dt;

        const distFromCenter = Math.hypot(this.body.position.x, this.body.position.z);
        let nearObstacle = false;
        if (obstacleBodies && obstacleBodies.length > 0) {
            nearObstacle = obstacleBodies.some(obs => this.body.position.distanceTo(obs.position) < 1.8);
        }

        if (!nearObstacle && this.xdashCooldown <= 0 && Math.abs(distFromCenter - GEAR_RAIL_RADIUS) < 0.45 && this.body.position.y < 0.5) {
            const spinDir = this.isRightSpin ? -1 : 1;
            const tangentX = (-this.body.position.z / distFromCenter) * spinDir;
            const tangentZ = (this.body.position.x / distFromCenter) * spinDir;

            const bitPitchRadius = 0.35;
            const targetLinearVel = Math.abs(this.body.angularVelocity.y) * bitPitchRadius * 0.18;
            const dashForce = targetLinearVel * this.body.mass;

            this.body.applyImpulse(new CANNON.Vec3(tangentX * dashForce, 0.25, tangentZ * dashForce), this.body.position);
            this.xdashCooldown = 0.18;
            this.lastXDashTime = performance.now();
            sfx3D.playXDashSound();
        }

        this.body.angularVelocity.y *= 0.9985;
    }

    triggerShatter(gpuSparks, sfx3D) {
        if (this.isShattered) return;
        this.isShattered = true;

        if (this.arrowHelper) {
            this.scene.remove(this.arrowHelper);
            this.arrowHelper = null;
        }

        this.world.remove(this.body);
        gpuSparks.emit(this.group.position.x, this.group.position.y, this.group.position.z, 3.0);
        sfx3D.playImpact(1.0, 0.5);
        this.scene.remove(this.group);
    }
}
