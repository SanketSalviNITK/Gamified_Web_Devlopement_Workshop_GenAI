// Procedural raider bot. Each module a student completes bolts on one visible part:
//   0 Stasis Pod  1 Power Core  2 Chassis  3 Holo Wings  4 Avatar Head  5 Voice Core
// Proportions, eye style and antenna come from a hash of the username, so no two bots match.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CLASSES, hashString, rng, easeOutBack, damp } from './util.js';

export const sharedTime = { value: 0 };

// ---------- shared geometry / material caches (keeps 60 bots cheap) ----------
const GEO = new Map();
const geo = (key, make) => (GEO.has(key) ? GEO.get(key) : (GEO.set(key, make()), GEO.get(key)));
const MAT = new Map();
const mat = (key, make) => (MAT.has(key) ? MAT.get(key) : (MAT.set(key, make()), MAT.get(key)));

const darkMat = () => mat('dark', () => new THREE.MeshStandardMaterial({ color: 0x161a26, metalness: 0.65, roughness: 0.38 }));
const trimMat = () => mat('trim', () => new THREE.MeshStandardMaterial({ color: 0x2b3145, metalness: 0.75, roughness: 0.28 }));
const shellMat = (c) => mat('shell' + c, () => {
    const col = new THREE.Color(c).lerp(new THREE.Color(0xffffff), 0.08);
    return new THREE.MeshStandardMaterial({ color: col, metalness: 0.3, roughness: 0.34 });
});
const glowMat = (c, i = 3) => mat(`glow${c}_${i}`, () => new THREE.MeshStandardMaterial({ color: 0x000000, emissive: c, emissiveIntensity: i }));
const visorMat = () => mat('visor', () => new THREE.MeshStandardMaterial({ color: 0x04050a, metalness: 0.9, roughness: 0.1 }));
const glassMat = () => mat('glass', () => new THREE.MeshStandardMaterial({
    color: 0x9be7ff, emissive: 0x0b3a4a, emissiveIntensity: 0.6, transparent: true, opacity: 0.16,
    metalness: 0.1, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false,
}));

const WING_VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const WING_FRAG = /* glsl */`
uniform vec3 uColor;
uniform float uTime;
varying vec2 vUv;
void main() {
    float x = vUv.x, y = vUv.y;
    float top = 1.0 - 0.38 * x;                    // leading edge sweeps down to the tip
    float bottom = 0.52 * x + 0.10 * fract(x * 5.0); // feathered trailing edge
    float mask = smoothstep(bottom, bottom + 0.03, y) * smoothstep(top, top - 0.03, y);
    mask *= smoothstep(1.0, 0.92, x);
    float rim = smoothstep(top - 0.09, top - 0.02, y) + smoothstep(bottom + 0.08, bottom + 0.01, y);
    float scan = 0.55 + 0.45 * smoothstep(0.35, 0.5, fract(x * 6.0 - uTime * 0.9));
    float a = mask * (mix(0.85, 0.35, x) * scan + rim * 0.9);
    gl_FragColor = vec4(uColor * a, a);
}`;
const wingMat = (c) => mat('wing' + c, () => new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(c).multiplyScalar(1.25) }, uTime: sharedTime },
    vertexShader: WING_VERT, fragmentShader: WING_FRAG,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
}));

function glyphTexture(text) {
    return mat('glyphTex' + text, () => {
        const c = document.createElement('canvas');
        c.width = c.height = 128;
        const g = c.getContext('2d');
        g.font = '700 64px "JetBrains Mono", monospace';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = '#fff';
        g.shadowColor = '#fff';
        g.shadowBlur = 12;
        g.fillText(text, 64, 68);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
    });
}
const glyphMat = (text, c) => mat(`glyph${text}${c}`, () => new THREE.SpriteMaterial({
    map: glyphTexture(text), color: new THREE.Color(c).multiplyScalar(2.2),
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
}));

const rbox = (w, h, d, r = 0.08, seg = 3) => geo(`rb${w.toFixed(3)}_${h.toFixed(3)}_${d.toFixed(3)}_${r}`, () => new RoundedBoxGeometry(w, h, d, seg, r));
const sphere = (r, ws = 20, hs = 14) => geo(`sp${r}_${ws}`, () => new THREE.SphereGeometry(r, ws, hs));
const capsule = (r, l) => geo(`cap${r}_${l.toFixed(3)}`, () => new THREE.CapsuleGeometry(r, l, 4, 10));
const cyl = (rt, rb, h, s = 16, open = false) => geo(`cy${rt}_${rb}_${h}_${s}_${open}`, () => new THREE.CylinderGeometry(rt, rb, h, s, 1, open));
const torus = (r, t, arc = Math.PI * 2, rs = 8, ts = 40) => geo(`to${r}_${t}_${arc.toFixed(2)}`, () => new THREE.TorusGeometry(r, t, rs, ts, arc));

function mesh(g, m, x = 0, y = 0, z = 0) {
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    return o;
}

// ---------------------------------------------------------------------------
export class Bot {
    /** @param {{id:string,name:string,cls:string,stage:number,color:number}} data */
    constructor(data) {
        this.data = data;
        const r = rng(hashString(data.id || data.name));
        this.p = {
            torsoW: 0.9 + r() * 0.24,
            torsoH: 0.88 + r() * 0.22,
            leg: 0.85 + r() * 0.3,
            headW: 0.9 + r() * 0.22,
            eye: Math.floor(r() * 3),
            antenna: Math.floor(r() * 3),
            phase: r() * Math.PI * 2,
            blinkEvery: 2.5 + r() * 3,
        };
        this.root = new THREE.Group();
        this.body = new THREE.Group();
        this.root.add(this.body);
        this.parts = [];        // {obj, min, max, scale}
        this.anims = [];        // pop-in animations
        this.stage = -1;
        this.t = { blink: this.p.blinkEvery, blinking: 0, cheer: 0, recoil: 0, aim: 0, speak: 0, hurt: 0, wake: 0 };
        this.build();
        this.setStage(data.stage ?? 0, false);
    }

    add(obj, parent, min, max = 99) {
        (parent || this.body).add(obj);
        this.parts.push({ obj, min, max, scale: obj.scale.clone() });
        return obj;
    }

    build() {
        const { color, cls } = this.data;
        const classColor = CLASSES[cls].color;
        const P = this.p;
        const L = 0.52 * P.leg;              // leg length
        const pelvisY = L + 0.1;
        const tw = 0.92 * P.torsoW, th = 0.8 * P.torsoH, td = 0.62;
        const torsoY = pelvisY + 0.12 + th / 2;
        const torsoTop = torsoY + th / 2;
        const coreZ = td / 2 + 0.03;
        const coreY = torsoY + 0.04;
        const headY = torsoTop + 0.12 + 0.25;
        this.dims = { L, pelvisY, tw, th, td, torsoY, torsoTop, coreY, coreZ, headY };

        // Pad (always): squad/class ring on the floor
        const pad = new THREE.Group();
        pad.add(mesh(cyl(0.78, 0.84, 0.08, 6), darkMat(), 0, 0.04, 0));
        const padRing = mesh(torus(0.8, 0.028, Math.PI * 2, 6, 6), glowMat(classColor, 2.5), 0, 0.085, 0);
        padRing.rotation.x = Math.PI / 2;
        padRing.rotation.z = Math.PI / 6;
        pad.add(padRing);
        this.add(pad, this.root, 0);

        // ---- Stage 0 only: stasis pod with a sleeping core ----
        const pod = new THREE.Group();
        pod.add(mesh(cyl(0.72, 0.72, 2.3, 20, true), glassMat(), 0, 1.25, 0));
        for (const y of [0.12, 2.38]) {
            const rim = mesh(torus(0.73, 0.06, Math.PI * 2, 8, 24), trimMat(), 0, y, 0);
            rim.rotation.x = Math.PI / 2;
            pod.add(rim);
        }
        pod.add(mesh(cyl(0.55, 0.74, 0.18, 20), trimMat(), 0, 2.48, 0));
        const podLight = mesh(cyl(0.2, 0.2, 0.05, 16), glowMat(classColor, 3), 0, 2.58, 0);
        pod.add(podLight);
        this.podCore = mesh(sphere(0.2), glowMat(color, 1.6), 0, 1.15, 0);
        pod.add(this.podCore);
        this.add(pod, this.root, 0, 0);
        this.podMuzzle = this.podCore;

        // ---- Stage 1: legs, pelvis, spine and the power core ----
        const hipX = 0.2 * P.torsoW;
        for (const s of [-1, 1]) {
            const leg = new THREE.Group();
            leg.add(mesh(capsule(0.1, Math.max(0.05, L - 0.22)), darkMat(), 0, L / 2 + 0.04, 0));
            leg.add(mesh(sphere(0.1, 14, 10), trimMat(), 0, L * 0.55, 0.02));
            leg.add(mesh(rbox(0.22, 0.1, 0.34, 0.04), trimMat(), 0, 0.05, 0.05));
            leg.position.x = s * hipX;
            this.add(leg, null, 1);
        }
        this.add(mesh(rbox(0.52, 0.18, 0.32, 0.06), trimMat(), 0, pelvisY, 0), null, 1);
        this.add(mesh(cyl(0.06, 0.06, th + 0.2, 10), trimMat(), 0, torsoY, -0.05), null, 1, 1);
        this.core = mesh(sphere(0.17), glowMat(color, 3.6), 0, coreY, coreZ);
        this.add(this.core, null, 1);
        this.coreRings = new THREE.Group();
        this.coreRings.position.set(0, coreY, coreZ);
        const cr1 = mesh(torus(0.28, 0.022, Math.PI * 2, 6, 32), glowMat(classColor, 2.2));
        const cr2 = mesh(torus(0.34, 0.016, Math.PI * 1.4, 6, 32), trimMat());
        cr2.rotation.y = Math.PI / 2;
        this.coreRings.add(cr1, cr2);
        this.add(this.coreRings, null, 1, 1);

        // ---- Stage 2: chassis, arms, class gear, sensor dome ----
        this.add(mesh(rbox(tw, th, td, 0.13, 4), shellMat(color), 0, torsoY, 0), null, 2);
        this.add(mesh(rbox(tw * 1.04, th * 0.2, td * 1.04, 0.05), darkMat(), 0, torsoY - th * 0.36, 0), null, 2);
        const bezel = mesh(torus(0.21, 0.04, Math.PI * 2, 8, 28), trimMat(), 0, coreY, coreZ - 0.01);
        this.add(bezel, null, 2);
        // back pack with vents
        const pack = new THREE.Group();
        pack.add(mesh(rbox(tw * 0.62, th * 0.66, 0.24, 0.06), darkMat()));
        for (const s of [-1, 1]) pack.add(mesh(rbox(0.06, th * 0.44, 0.04, 0.02), glowMat(classColor, 2.4), s * 0.12, 0, -0.13));
        pack.position.set(0, torsoY + 0.04, -td / 2 - 0.1);
        this.add(pack, null, 2);

        this.arms = [];
        for (const s of [-1, 1]) {
            const shoulder = new THREE.Group();
            shoulder.position.set(s * (tw / 2 + 0.1), torsoTop - 0.14, 0);
            shoulder.add(mesh(sphere(0.16, 16, 12), trimMat()));
            const pauldron = mesh(rbox(0.3, 0.12, 0.34, 0.05), shellMat(color), s * 0.02, 0.1, 0);
            pauldron.rotation.z = s * -0.25;
            shoulder.add(pauldron);
            shoulder.add(mesh(capsule(0.075, 0.36), darkMat(), 0, -0.3, 0));
            const engineerGun = cls === 'engineer' && s === 1;
            if (engineerGun) {
                const gun = new THREE.Group();
                gun.add(mesh(cyl(0.12, 0.12, 0.3, 12), trimMat(), 0, 0, 0));
                const barrel = mesh(cyl(0.07, 0.09, 0.42, 12), darkMat(), 0, -0.3, 0);
                gun.add(barrel);
                const muzzle = mesh(torus(0.075, 0.02, Math.PI * 2, 6, 16), glowMat(classColor, 3.5), 0, -0.52, 0);
                muzzle.rotation.x = Math.PI / 2;
                gun.add(muzzle);
                gun.position.y = -0.58;
                shoulder.add(gun);
                this.gunMuzzle = muzzle;
            } else {
                shoulder.add(mesh(sphere(0.1, 14, 10), shellMat(color), 0, -0.6, 0));
            }
            shoulder.userData.side = s;
            this.arms.push(shoulder);
            this.add(shoulder, null, 2);
        }

        // class gear
        this.gear = new THREE.Group();
        this.gear.position.y = torsoY;
        if (cls === 'architect') {
            for (let i = 0; i < 2; i++) {
                const drone = new THREE.Group();
                drone.add(mesh(cyl(0.2, 0.2, 0.05, 6), trimMat()));
                const edge = mesh(torus(0.2, 0.018, Math.PI * 2, 4, 6), glowMat(classColor, 3));
                edge.rotation.x = Math.PI / 2;
                edge.rotation.z = Math.PI / 6;
                drone.add(edge);
                drone.add(mesh(sphere(0.06, 10, 8), glowMat(classColor, 4), 0, 0.04, 0));
                drone.userData.offset = i * Math.PI;
                this.gear.add(drone);
            }
        } else if (cls === 'promptsmith') {
            ['{ }', '</>', '✦'].forEach((g, i) => {
                const s = new THREE.Sprite(glyphMat(g, classColor));
                s.scale.setScalar(0.32);
                s.userData.offset = (i / 3) * Math.PI * 2;
                this.gear.add(s);
            });
        }
        this.add(this.gear, null, 2);

        const dome = new THREE.Group();
        dome.add(mesh(geo('dome', () => new THREE.SphereGeometry(0.22, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2)), trimMat()));
        dome.add(mesh(sphere(0.075, 12, 10), glowMat(0xe0fbff, 4), 0, 0.1, 0.16));
        dome.position.y = torsoTop - 0.02;
        this.add(dome, null, 2, 3);
        this.domeLens = dome.children[1];

        // ---- Stage 3: holo halo and wings ----
        this.halo = mesh(torus(0.5, 0.026, Math.PI * 2, 6, 48), glowMat(classColor, 1.8), 0, headY + 0.12, -0.32);
        this.add(this.halo, null, 3);
        this.wings = [];
        const wingGeo = geo('wing', () => {
            const g = new THREE.PlaneGeometry(1.05, 0.72);
            g.translate(0.52, 0.1, 0);
            return g;
        });
        for (const s of [-1, 1]) {
            const pivot = new THREE.Group();
            pivot.position.set(s * 0.16, torsoTop - 0.12, -td / 2 - 0.16);
            const w = new THREE.Mesh(wingGeo, wingMat(classColor));
            w.scale.x = s;
            pivot.add(w);
            pivot.userData.side = s;
            pivot.rotation.set(0, s * 0.5, s * 0.32);
            this.wings.push(pivot);
            this.add(pivot, null, 3);
        }

        // ---- Stage 4: avatar head ----
        const head = new THREE.Group();
        head.position.y = headY;
        const hw = 0.64 * P.headW;
        head.add(mesh(rbox(hw, 0.5, 0.52, 0.14, 4), shellMat(color)));
        head.add(mesh(rbox(hw * 0.84, 0.26, 0.08, 0.05), visorMat(), 0, 0.02, 0.25));
        for (const s of [-1, 1]) {
            const ear = mesh(cyl(0.09, 0.09, 0.08, 14), trimMat(), s * (hw / 2 + 0.03), 0, 0);
            ear.rotation.z = Math.PI / 2;
            head.add(ear);
            const earGlow = mesh(cyl(0.05, 0.05, 0.02, 12), glowMat(classColor, 3), s * (hw / 2 + 0.08), 0, 0);
            earGlow.rotation.z = Math.PI / 2;
            head.add(earGlow);
        }
        this.eyes = [];
        const eyeMat = glowMat(0xd9fbff, 4.5);
        for (const s of [-1, 1]) {
            const eye = new THREE.Group();
            eye.position.set(s * hw * 0.2, 0.02, 0.3);
            if (P.eye === 0) eye.add(mesh(sphere(0.055, 12, 10), eyeMat));
            else if (P.eye === 1) eye.add(mesh(rbox(0.13, 0.045, 0.02, 0.015, 2), eyeMat));
            else {
                // happy "^" eyes
                const a = mesh(rbox(0.085, 0.03, 0.02, 0.01, 2), eyeMat, -0.03, 0, 0);
                a.rotation.z = 0.6;
                const b = mesh(rbox(0.085, 0.03, 0.02, 0.01, 2), eyeMat, 0.03, 0, 0);
                b.rotation.z = -0.6;
                eye.add(a, b);
            }
            this.eyes.push(eye);
            head.add(eye);
        }
        this.head = head;
        this.add(head, null, 4);
        this.add(mesh(cyl(0.1, 0.12, 0.14, 12), trimMat(), 0, torsoTop + 0.06, 0), null, 4);

        // ---- Stage 5: voice core (antenna + speaking ring) ----
        const ant = new THREE.Group();
        ant.position.y = 0.25;
        const tipMat = glowMat(classColor, 4);
        if (P.antenna === 0) {
            ant.add(mesh(cyl(0.018, 0.018, 0.32, 6), trimMat(), 0, 0.16, 0));
            this.antTip = mesh(sphere(0.06, 12, 10), tipMat, 0, 0.35, 0);
            ant.add(this.antTip);
        } else if (P.antenna === 1) {
            for (const s of [-1, 1]) {
                const stalk = new THREE.Group();
                stalk.add(mesh(cyl(0.016, 0.016, 0.28, 6), trimMat(), 0, 0.14, 0));
                const tip = mesh(sphere(0.05, 12, 10), tipMat, 0, 0.3, 0);
                stalk.add(tip);
                stalk.rotation.z = s * -0.35;
                stalk.position.x = s * 0.12;
                ant.add(stalk);
                if (s === 1) this.antTip = tip;
            }
        } else {
            ant.add(mesh(cyl(0.02, 0.02, 0.18, 6), trimMat(), 0, 0.09, 0));
            const dish = mesh(geo('dish', () => new THREE.SphereGeometry(0.16, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2.6)), trimMat(), 0, 0.2, 0);
            dish.rotation.x = Math.PI + 0.5;
            ant.add(dish);
            this.antTip = mesh(sphere(0.04, 10, 8), tipMat, 0, 0.24, 0.06);
            ant.add(this.antTip);
        }
        this.add(ant, head, 5);
        this.voiceRing = mesh(torus(0.2, 0.025, Math.PI * 2, 6, 32), glowMat(color, 3.2), 0, torsoTop + 0.06, 0);
        this.voiceRing.rotation.x = Math.PI / 2;
        this.add(this.voiceRing, null, 5);

        // anchors for labels / speech
        this.anchor = new THREE.Object3D();
        this.root.add(this.anchor);
    }

    setStage(n, animate = true) {
        const prev = this.stage;
        this.stage = n;
        let k = 0;
        for (const part of this.parts) {
            const vis = n >= part.min && n <= part.max;
            const wasVis = prev >= part.min && prev <= part.max;
            part.obj.visible = vis;
            if (vis && !wasVis && animate) {
                part.obj.scale.setScalar(0.0001);
                this.anims.push({ part, t: -k * 0.07, dur: 0.55 });
                k++;
            } else if (vis) {
                part.obj.scale.copy(part.scale);
            }
        }
        const d = this.dims;
        const heights = [2.75, d.torsoTop + 0.35, d.torsoTop + 0.55, d.headY + 0.75, d.headY + 0.6, d.headY + 0.95];
        this.anchor.position.y = heights[n];
        if (animate && n > prev) this.t.wake = 1;
    }

    /** World position projectiles launch from. */
    muzzleWorld(out) {
        this.root.updateMatrixWorld(true);
        let src = this.core;
        if (this.stage === 0) src = this.podMuzzle;
        else if (this.stage >= 2 && this.gunMuzzle) src = this.gunMuzzle;
        else if (this.stage >= 5 && this.antTip && Math.random() < 0.5) src = this.antTip;
        return src.getWorldPosition(out);
    }

    attack() { this.t.recoil = 0.3; this.t.aim = 0.7; }
    cheer(delay = 0) { this.t.cheer = 1.3 + delay; this.t.cheerDelay = delay; }
    speak(dur = 3) { this.t.speak = dur; }
    hurt() { this.t.hurt = 0.6; }

    update(dt, t) {
        const T = this.t;
        const ph = this.p.phase;

        // pop-in animations
        for (let i = this.anims.length - 1; i >= 0; i--) {
            const a = this.anims[i];
            a.t += dt;
            const k = Math.max(0, Math.min(1, a.t / a.dur));
            if (a.t >= 0) a.part.obj.scale.copy(a.part.scale).multiplyScalar(Math.max(0.0001, easeOutBack(k)));
            if (k >= 1) { a.part.obj.scale.copy(a.part.scale); this.anims.splice(i, 1); }
        }

        if (this.stage === 0) {
            this.podCore.position.y = 1.15 + Math.sin(t * 1.4 + ph) * 0.12;
            this.podCore.scale.setScalar(0.85 + Math.sin(t * 2.2 + ph) * 0.12);
            return;
        }

        // idle bob + reactions
        let y = Math.sin(t * 2 + ph) * 0.035;
        let lean = 0;
        if (T.cheer > 0) {
            T.cheer -= dt;
            if (T.cheer < 1.3) y += Math.abs(Math.sin(T.cheer * 9)) * 0.32;
        }
        if (T.recoil > 0) { T.recoil -= dt; lean -= T.recoil * 0.5; }
        if (T.hurt > 0) { T.hurt -= dt; lean -= Math.sin(T.hurt * 10) * T.hurt * 0.7; }
        if (T.wake > 0) { T.wake -= dt * 1.5; y += Math.sin((1 - T.wake) * Math.PI) * 0.25; }
        this.body.position.y = y;
        this.body.rotation.x = damp(this.body.rotation.x, lean, 14, dt);

        this.core.scale.setScalar(1 + Math.sin(t * 4 + ph) * 0.1);
        this.coreRings.rotation.z += dt * 1.6;
        this.coreRings.rotation.y += dt * 0.9;

        // arms
        const cheering = T.cheer > 0 && T.cheer < 1.3;
        if (T.aim > 0) T.aim -= dt;
        for (const arm of this.arms) {
            const s = arm.userData.side;
            let rx = Math.sin(t * 2 + ph + s) * 0.06, rz = s * 0.08;
            if (cheering) { rx = -2.7 + Math.sin(t * 14 + s) * 0.15; rz = s * 0.35; }
            else if (T.aim > 0 && (s === 1 || !this.gunMuzzle)) { rx = -1.45; rz = s * -0.05; }
            arm.rotation.x = damp(arm.rotation.x, rx, 12, dt);
            arm.rotation.z = damp(arm.rotation.z, rz, 12, dt);
        }

        // gear orbit
        for (const g of this.gear.children) {
            const a = t * 1.4 + g.userData.offset;
            const r = this.data.cls === 'architect' ? this.dims.tw * 0.95 : 0.55;
            g.position.set(Math.cos(a) * r, (this.data.cls === 'architect' ? 0.1 : this.dims.th * 0.9) + Math.sin(t * 2 + g.userData.offset) * 0.08, Math.sin(a) * r);
            if (this.data.cls === 'architect') g.rotation.y = -a;
        }

        if (this.domeLens) this.domeLens.position.x = Math.sin(t * 0.8 + ph) * 0.06;

        // halo + wings
        this.halo.rotation.z += dt * 0.8;
        this.halo.rotation.x = Math.sin(t * 0.7 + ph) * 0.15;
        for (const w of this.wings) {
            const s = w.userData.side;
            const flap = Math.sin(t * 2.6 + ph) * 0.08 + (cheering ? Math.sin(t * 18) * 0.25 : 0);
            w.rotation.z = s * (0.32 + flap);
        }

        // head: blink + glance
        T.blink -= dt;
        if (T.blink <= 0) { T.blinking = 0.13; T.blink = this.p.blinkEvery * (0.6 + Math.random() * 0.8); }
        if (T.blinking > 0) T.blinking -= dt;
        const eyeY = T.blinking > 0 ? 0.12 : 1;
        for (const e of this.eyes) e.scale.y = damp(e.scale.y, eyeY, 40, dt);
        this.head.rotation.y = Math.sin(t * 0.45 + ph) * 0.22;
        this.head.rotation.z = Math.sin(t * 0.33 + ph) * 0.05;

        // voice
        if (T.speak > 0) T.speak -= dt;
        const talk = T.speak > 0 ? 1 + Math.abs(Math.sin(t * 22)) * 0.5 : 1;
        this.voiceRing.scale.setScalar(talk);
        if (this.antTip) this.antTip.scale.setScalar(T.speak > 0 ? talk : 1 + Math.max(0, Math.sin(t * 3 + ph)) * 0.25);
    }
}
