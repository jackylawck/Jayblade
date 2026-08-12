export class GPUSparkParticleSystem {
    constructor(scene, maxParticles = 600) {
        this.count = maxParticles;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(this.count * 3);
        const velocities = new Float32Array(this.count * 3);
        const lifetimes = new Float32Array(this.count);

        for (let i = 0; i < this.count; i++) {
            positions[i * 3] = 0; positions[i * 3 + 1] = -100; positions[i * 3 + 2] = 0;
            velocities[i * 3] = 0; velocities[i * 3 + 1] = 0; velocities[i * 3 + 2] = 0;
            lifetimes[i] = 0.0;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3));
        geo.setAttribute('aLifetime', new THREE.BufferAttribute(lifetimes, 1));

        this.material = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0xffcc00) } },
            vertexShader: `
                attribute vec3 aVelocity; attribute float aLifetime;
                uniform float uTime; varying float vLife;
                void main() {
                    vLife = aLifetime;
                    vec3 pos = position + aVelocity * uTime + vec3(0.0, -4.9 * uTime * uTime, 0.0);
                    if (pos.y < 0.0) pos.y = -100.0;
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    gl_PointSize = (1.0 - uTime) * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 uColor; varying float vLife;
                void main() {
                    float d = length(gl_PointCoord - vec2(0.5));
                    if (d > 0.5 || vLife <= 0.0) discard;
                    gl_FragColor = vec4(uColor, 1.0 - d * 2.0);
                }
            `,
            transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
        });

        this.mesh = new THREE.Points(geo, this.material);
        scene.add(this.mesh);
        this.time = 0;
    }

    emit(x, y, z, force = 1.0) {
        const positions = this.mesh.geometry.attributes.position.array;
        const velocities = this.mesh.geometry.attributes.aVelocity.array;
        const lifetimes = this.mesh.geometry.attributes.aLifetime.array;
        const countToEmit = Math.min(80, Math.floor(force * 40));

        let emitted = 0;
        for (let i = 0; i < this.count && emitted < countToEmit; i++) {
            if (positions[i * 3 + 1] < -10) {
                positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
                velocities[i * 3] = (Math.random() - 0.5) * force * 15;
                velocities[i * 3 + 1] = Math.random() * force * 12 + 3;
                velocities[i * 3 + 2] = (Math.random() - 0.5) * force * 15;
                lifetimes[i] = 1.0;
                emitted++;
            }
        }
        this.mesh.geometry.attributes.position.needsUpdate = true;
        this.mesh.geometry.attributes.aVelocity.needsUpdate = true;
        this.mesh.geometry.attributes.aLifetime.needsUpdate = true;
        this.time = 0;
    }

    update(dt) {
        this.time += dt;
        this.material.uniforms.uTime.value = this.time;
    }
}
