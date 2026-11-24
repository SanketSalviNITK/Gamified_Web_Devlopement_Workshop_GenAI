// Effects: one shared GPU particle pool, arcing projectiles and floor shockwave rings.
import * as THREE from 'three';

const P_VERT = /* glsl */`
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
varying float vAlpha;
varying vec3 vColor;
void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (320.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
}`;
const P_FRAG = /* glsl */`
varying float vAlpha;
varying vec3 vColor;
void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vAlpha;
    if (a < 0.003) discard;
    gl_FragColor = vec4(vColor * a, a);
}`;

export class Particles {
    constructor(scene, max = 7000) {
        this.max = max;
        this.cursor = 0;
        this.pos = new Float32Array(max * 3);
        this.col = new Float32Array(max * 3);
        this.size = new Float32Array(max);
        this.alpha = new Float32Array(max);
        this.vel = new Float32Array(max * 3);
        this.life = new Float32Array(max);
        this.maxLife = new Float32Array(max);
        this.size0 = new Float32Array(max);
        this.drag = new Float32Array(max);
        this.grav = new Float32Array(max);
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
        g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
        g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
        g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
        this.geo = g;
        const pts = new THREE.Points(g, new THREE.ShaderMaterial({
            vertexShader: P_VERT, fragmentShader: P_FRAG,
            transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        }));
        pts.frustumCulled = false;
        scene.add(pts);
    }

    emit(x, y, z, vx, vy, vz, color, size, life, drag = 0, grav = 0) {
        const i = this.cursor;
        this.cursor = (i + 1) % this.max;
        this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
        this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
        this.col[i * 3] = color.r; this.col[i * 3 + 1] = color.g; this.col[i * 3 + 2] = color.b;
        this.size0[i] = size; this.size[i] = size;
        this.life[i] = life; this.maxLife[i] = life;
        this.drag[i] = drag; this.grav[i] = grav;
        this.alpha[i] = 1;
    }

    burst(p, { count = 40, speed = 8, color, size = 0.5, life = 0.9, drag = 2, grav = 0, up = 0, spread = 1 }) {
        for (let i = 0; i < count; i++) {
            const u = Math.random() * 2 - 1;
            const th = Math.random() * Math.PI * 2;
            const r = Math.sqrt(1 - u * u);
            const s = speed * (0.35 + Math.random() * 0.65);
            this.emit(p.x, p.y, p.z, r * Math.cos(th) * s * spread, u * s + up, r * Math.sin(th) * s * spread,
                color, size * (0.6 + Math.random() * 0.8), life * (0.6 + Math.random() * 0.6), drag, grav);
        }
    }

    update(dt) {
        const { pos, vel, life, maxLife, size, size0, alpha, drag, grav } = this;
        for (let i = 0; i < this.max; i++) {
            if (life[i] <= 0) { if (alpha[i] !== 0) { alpha[i] = 0; size[i] = 0; } continue; }
            life[i] -= dt;
            const k = Math.max(0, life[i] / maxLife[i]);
            const dd = Math.max(0, 1 - drag[i] * dt);
            const j = i * 3;
            vel[j] *= dd; vel[j + 1] = vel[j + 1] * dd - grav[i] * dt; vel[j + 2] *= dd;
            pos[j] += vel[j] * dt; pos[j + 1] += vel[j + 1] * dt; pos[j + 2] += vel[j + 2] * dt;
            if (pos[j + 1] < 0.05) { pos[j + 1] = 0.05; vel[j + 1] *= -0.3; }
            alpha[i] = k;
            size[i] = size0[i] * (0.35 + 0.65 * k);
        }
        this.geo.attributes.position.needsUpdate = true;
        this.geo.attributes.aColor.needsUpdate = true;
        this.geo.attributes.aSize.needsUpdate = true;
        this.geo.attributes.aAlpha.needsUpdate = true;
    }
}

const headGeo = new THREE.IcosahedronGeometry(0.22, 1);
const headMats = new Map();
const headMat = (hex) => {
    if (!headMats.has(hex)) headMats.set(hex, new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(4) }));
    return headMats.get(hex);
};

export class Projectiles {
    constructor(scene, particles) {
        this.scene = scene;
        this.particles = particles;
        this.list = [];
        this.tmp = new THREE.Vector3();
    }

    spawn(from, to, hex, power, onHit) {
        const mesh = new THREE.Mesh(headGeo, headMat(hex));
        mesh.scale.setScalar(0.7 + power * 0.7);
        mesh.position.copy(from);
        this.scene.add(mesh);
        const dist = from.distanceTo(to);
        const mid = from.clone().lerp(to, 0.5);
        mid.y += 3 + dist * 0.12;
        const color = new THREE.Color(hex).multiplyScalar(2.2);
        this.list.push({ mesh, from: from.clone(), mid, to: to.clone(), t: 0, dur: 0.5 + dist * 0.012, power, color, onHit });
        // muzzle flash
        this.particles.burst(from, { count: 10 + power * 8, speed: 3, color, size: 0.35, life: 0.3, drag: 6 });
    }

    update(dt) {
        const P = this.tmp;
        for (let i = this.list.length - 1; i >= 0; i--) {
            const pr = this.list[i];
            pr.t += dt / pr.dur;
            const t = Math.min(1, pr.t);
            const a = 1 - t;
            P.set(
                a * a * pr.from.x + 2 * a * t * pr.mid.x + t * t * pr.to.x,
                a * a * pr.from.y + 2 * a * t * pr.mid.y + t * t * pr.to.y,
                a * a * pr.from.z + 2 * a * t * pr.mid.z + t * t * pr.to.z
            );
            const prev = pr.mesh.position.clone();
            pr.mesh.position.copy(P);
            // trail: a few particles spread along the last segment
            const steps = 3 + Math.round(pr.power * 2);
            for (let s = 0; s < steps; s++) {
                const q = prev.clone().lerp(P, s / steps);
                this.particles.emit(q.x, q.y, q.z, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6,
                    pr.color, 0.45 + pr.power * 0.35, 0.35 + pr.power * 0.15, 3);
            }
            if (t >= 1) {
                this.scene.remove(pr.mesh);
                this.list.splice(i, 1);
                pr.onHit?.(P.clone(), pr);
            }
        }
    }
}

export class Shockwaves {
    constructor(scene) {
        this.scene = scene;
        this.list = [];
        this.geo = new THREE.RingGeometry(0.92, 1, 128);
    }

    spawn(center, { color = 0xff2e88, radius = 40, dur = 1.6, y = 0.08, intensity = 2.5, onTick = null } = {}) {
        const mat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(color).multiplyScalar(intensity), transparent: true, opacity: 1,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
        });
        const m = new THREE.Mesh(this.geo, mat);
        m.rotation.x = -Math.PI / 2;
        m.position.set(center.x, y, center.z);
        this.scene.add(m);
        this.list.push({ m, t: 0, dur, radius, onTick });
    }

    update(dt) {
        for (let i = this.list.length - 1; i >= 0; i--) {
            const w = this.list[i];
            w.t += dt;
            const k = Math.min(1, w.t / w.dur);
            const r = 0.5 + (1 - Math.pow(1 - k, 2)) * w.radius;
            w.m.scale.setScalar(r);
            w.m.material.opacity = 1 - k;
            w.onTick?.(r);
            if (k >= 1) { this.scene.remove(w.m); w.m.material.dispose(); this.list.splice(i, 1); }
        }
    }
}
