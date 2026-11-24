// Arena surroundings: a circuit floor that heals as the boss weakens, a sky dome,
// distant data towers and drifting dust. Everything is procedural.
import * as THREE from 'three';
import { rng } from './util.js';

const FLOOR_VERT = /* glsl */`
varying vec3 vW;
void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FLOOR_FRAG = /* glsl */`
uniform float uTime;
uniform float uHeal;   // 0 = fully corrupted, 1 = fully cleansed
uniform float uGold;   // victory tint
uniform float uRage;
varying vec3 vW;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float grid(vec2 p, float s, float w) {
    vec2 g = abs(fract(p / s - 0.5) - 0.5) * s;
    return 1.0 - smoothstep(0.0, w, min(g.x, g.y));
}

void main() {
    vec2 p = vW.xz;
    float d = length(p);
    vec3 corrupt = vec3(1.0, 0.10, 0.40);
    vec3 clean = vec3(0.08, 0.78, 0.98);
    vec3 gold = vec3(1.0, 0.70, 0.16);

    // The cleanse front sweeps inward from the edge of the arena toward the boss.
    float front = mix(62.0, -3.0, uHeal);
    float cleanMask = smoothstep(front - 1.2, front + 1.2, d);
    vec3 tint = mix(corrupt, clean, cleanMask);
    tint = mix(tint, gold, uGold);

    float fine = grid(p, 2.0, 0.035) * 0.16;
    float major = grid(p, 8.0, 0.06) * 0.42;

    // Circuit traces with solder nodes, one per random cell.
    vec2 cell = floor(p / 4.0);
    float h = hash(cell);
    vec2 l = fract(p / 4.0) - 0.5;
    float trace = 0.0;
    if (h > 0.5) {
        bool vert = h > 0.75;
        float across = vert ? l.x : l.y;
        float along = vert ? l.y : l.x;
        trace = (1.0 - smoothstep(0.018, 0.045, abs(across))) * step(abs(along), 0.4);
        float node = 1.0 - smoothstep(0.05, 0.09, length(vec2(across, along - 0.4)));
        trace = max(trace, node);
    }

    // Energy pulses ripple outward; faster in rage mode.
    float speed = 0.22 + uRage * 0.5;
    float pulse = smoothstep(0.9, 1.0, fract(d * 0.055 - uTime * speed));

    float edge = 0.0;
    if (uHeal > 0.001 && uHeal < 0.999) edge = exp(-abs(d - front) * 0.7) * (1.0 - uGold);

    float intensity = fine + major * (1.0 + pulse * 2.5) + trace * (0.5 + pulse * 1.8);
    vec3 col = vec3(0.010, 0.009, 0.022) + tint * intensity;
    col += vec3(0.7, 1.0, 1.0) * edge * 1.4;

    // Soft glow pooled under the boss dais.
    col += tint * exp(-d * 0.22) * 0.35;

    col *= smoothstep(105.0, 28.0, d);
    gl_FragColor = vec4(col, 1.0);
}`;

const SKY_FRAG = /* glsl */`
uniform float uHeal;
uniform float uGold;
varying vec3 vW;
void main() {
    vec3 dir = normalize(vW);
    float h = dir.y;
    vec3 top = vec3(0.012, 0.008, 0.035);
    vec3 horizonCorrupt = vec3(0.085, 0.014, 0.055);
    vec3 horizonClean = vec3(0.02, 0.10, 0.16);
    vec3 horizonGold = vec3(0.20, 0.12, 0.03);
    vec3 horizon = mix(mix(horizonCorrupt, horizonClean, uHeal), horizonGold, uGold);
    float band = exp(-abs(h) * 7.0);
    vec3 col = mix(top, horizon, band);
    gl_FragColor = vec4(col, 1.0);
}`;

export function createEnvironment(scene) {
    const uniforms = {
        uTime: { value: 0 },
        uHeal: { value: 0 },
        uGold: { value: 0 },
        uRage: { value: 0 },
    };

    // Floor
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(260, 260),
        new THREE.ShaderMaterial({ uniforms, vertexShader: FLOOR_VERT, fragmentShader: FLOOR_FRAG })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Sky dome
    const sky = new THREE.Mesh(
        new THREE.SphereGeometry(320, 32, 16),
        new THREE.ShaderMaterial({
            uniforms,
            vertexShader: FLOOR_VERT,
            fragmentShader: SKY_FRAG,
            side: THREE.BackSide,
            depthWrite: false,
        })
    );
    scene.add(sky);

    // Boss dais: stacked rings under the boss.
    const dais = new THREE.Group();
    const stone = new THREE.MeshStandardMaterial({ color: 0x0d0b16, metalness: 0.7, roughness: 0.35 });
    const tier1 = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 8.2, 0.5, 48), stone);
    tier1.position.y = 0.25;
    const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 6.0, 0.5, 48), stone);
    tier2.position.y = 0.75;
    const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2e88).multiplyScalar(2.2) });
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(7.9, 0.06, 8, 96), ringMat);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = 0.52;
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(5.7, 0.06, 8, 96), ringMat);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = 1.02;
    dais.add(tier1, tier2, ring1, ring2);
    scene.add(dais);

    // Data towers on the horizon (instanced).
    const r = rng(1337);
    const COUNT = 90;
    const towerGeo = new THREE.BoxGeometry(1, 1, 1);
    towerGeo.translate(0, 0.5, 0);
    const towers = new THREE.InstancedMesh(towerGeo, new THREE.MeshStandardMaterial({ color: 0x0a0912, metalness: 0.5, roughness: 0.7 }), COUNT);
    const stripMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const strips = new THREE.InstancedMesh(towerGeo, stripMat, COUNT * 2);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    for (let i = 0; i < COUNT; i++) {
        const a = r() * Math.PI * 2;
        const rad = 85 + r() * 70;
        const w = 3 + r() * 6;
        const h = 8 + Math.pow(r(), 1.6) * 55;
        p.set(Math.sin(a) * rad, 0, Math.cos(a) * rad);
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI);
        s.set(w, h, w * (0.6 + r() * 0.8));
        m.compose(p, q, s);
        towers.setMatrixAt(i, m);
        for (let k = 0; k < 2; k++) {
            const sy = 0.25;
            const y = h * (0.35 + r() * 0.6);
            m.compose(new THREE.Vector3(p.x, y, p.z), q, new THREE.Vector3(w * 1.02, sy, s.z * 1.02));
            strips.setMatrixAt(i * 2 + k, m);
        }
    }
    scene.add(towers, strips);

    // Dust motes
    const DUST = 700;
    const dustPos = new Float32Array(DUST * 3);
    for (let i = 0; i < DUST; i++) {
        dustPos[i * 3] = (r() - 0.5) * 120;
        dustPos[i * 3 + 1] = r() * 30;
        dustPos[i * 3 + 2] = (r() - 0.5) * 120;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
        color: 0xff7ab8, size: 0.14, transparent: true, opacity: 0.7,
        blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    const cCorrupt = new THREE.Color(0xff2e88);
    const cClean = new THREE.Color(0x22d3ee);
    const cGold = new THREE.Color(0xfbbf24);
    const tmp = new THREE.Color();

    return {
        uniforms,
        dais,
        update(dt, t, heal, gold, rage) {
            uniforms.uTime.value = t;
            uniforms.uHeal.value = heal;
            uniforms.uGold.value = gold;
            uniforms.uRage.value = rage;
            tmp.copy(cCorrupt).lerp(cClean, heal).lerp(cGold, gold);
            stripMat.color.copy(tmp).multiplyScalar(1.6);
            ringMat.color.copy(tmp).multiplyScalar(2.2);
            dustMat.color.copy(tmp).lerp(new THREE.Color(1, 1, 1), 0.25);
            ring1.rotation.z += dt * 0.1;
            for (let i = 0; i < DUST; i++) {
                let y = dustPos[i * 3 + 1] + dt * (0.4 + (i % 7) * 0.08);
                if (y > 30) y = 0;
                dustPos[i * 3 + 1] = y;
            }
            dustGeo.attributes.position.needsUpdate = true;
        },
    };
}
