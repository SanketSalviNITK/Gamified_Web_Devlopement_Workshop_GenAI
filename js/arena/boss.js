// The Glitch Overlord: a corrupted core wrapped in a shell of armour plates, with an angry
// mask, orbiting rings and floating error glyphs. Plates break away as its health drops,
// and on defeat it shatters to free ARIA, the friendly AI companion.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, clamp, damp, easeOutBack } from './util.js';

const GLYPHS = ['{ }', '</>', 'NaN', '404', 'null', 'undefined', '!==', ';;', '0xDEAD', 'ERR', '???', '<div', '});', '[object]'];

function textSprite(text, color, size = 1) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const g = c.getContext('2d');
    g.font = '700 54px "JetBrains Mono", monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#fff';
    g.shadowColor = '#fff';
    g.shadowBlur = 14;
    g.fillText(text, 128, 66);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(color).multiplyScalar(2.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const s = new THREE.Sprite(m);
    s.scale.set(2 * size, 1 * size, 1);
    return s;
}

function radialTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.45)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
}

// Thick triangular plate from one face of an icosphere.
function prism(a, b, c, thickness, shrink) {
    const cen = a.clone().add(b).add(c).divideScalar(3);
    const n = cen.clone().normalize();
    const pts = [a, b, c].map((v) => v.clone().sub(cen).multiplyScalar(shrink));
    const outer = pts.map((v) => v.clone().addScaledVector(n, thickness / 2));
    const inner = pts.map((v) => v.clone().addScaledVector(n, -thickness / 2));
    const tri = [];
    const push = (p, q, r) => tri.push(p.x, p.y, p.z, q.x, q.y, q.z, r.x, r.y, r.z);
    push(outer[0], outer[1], outer[2]);
    push(inner[0], inner[2], inner[1]);
    for (let i = 0; i < 3; i++) {
        const j = (i + 1) % 3;
        push(outer[i], inner[i], inner[j]);
        push(outer[i], inner[j], outer[j]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(tri, 3));
    g.computeVertexNormals();
    return { geo: g, center: cen, normal: n };
}

export class Boss {
    constructor(scene) {
        this.scene = scene;
        this.root = new THREE.Group();
        this.root.position.set(0, 9.5, 0);
        this.root.scale.setScalar(1.2);
        scene.add(this.root);
        this.body = new THREE.Group();
        this.root.add(this.body);
        this.debris = new THREE.Group();
        scene.add(this.debris);

        this.uTime = { value: 0 };
        this.uGlitch = { value: 0.3 };
        this.flash = 0;
        this.flinch = new THREE.Vector2();
        this.punch = 0;
        this.jaw = 0;
        this.defeated = false;
        this.defeatT = 0;
        this.hp = 1;

        this.buildCore();
        this.buildShell();
        this.buildMask();
        this.buildRings();
        this.buildGlyphs();
        this.buildAria();

        this.light = new THREE.PointLight(0xff2e88, 60, 60, 1.6);
        this.root.add(this.light);
    }

    buildCore() {
        this.coreMat = new THREE.MeshStandardMaterial({
            color: 0x14010a, emissive: 0xff2e88, emissiveIntensity: 2.2, roughness: 0.4, metalness: 0.2, flatShading: true,
        });
        this.coreMat.onBeforeCompile = (sh) => {
            sh.uniforms.uTime = this.uTime;
            sh.uniforms.uGlitch = this.uGlitch;
            sh.vertexShader = 'uniform float uTime;\nuniform float uGlitch;\n' + sh.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                float w = sin(position.x * 2.1 + uTime * 3.0) * sin(position.y * 2.7 + uTime * 2.3) * sin(position.z * 1.9 + uTime * 2.9);
                float band = step(0.94, fract(position.y * 1.3 + uTime * 1.7)) * uGlitch;
                transformed += normal * (w * 0.22 + band * 0.7);
                transformed.x += band * 0.6 * sin(uTime * 41.0);`
            );
        };
        this.core = new THREE.Mesh(new THREE.IcosahedronGeometry(2.7, 3), this.coreMat);
        this.body.add(this.core);

        this.glowTex = radialTexture();
        this.glow = new THREE.Sprite(new THREE.SpriteMaterial({
            map: this.glowTex, color: new THREE.Color(0xff2e88).multiplyScalar(1.4),
            transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
        }));
        this.glow.scale.setScalar(13);
        this.body.add(this.glow);
    }

    buildShell() {
        this.plateMat = new THREE.MeshStandardMaterial({
            color: 0x1d1024, metalness: 0.85, roughness: 0.28, emissive: 0x2a0016, emissiveIntensity: 1,
            flatShading: true, side: THREE.DoubleSide,
        });
        this.edgeMat = new THREE.LineBasicMaterial({ color: new THREE.Color(0xff2e88).multiplyScalar(2.6) });
        const ico = new THREE.IcosahedronGeometry(4.5, 1);
        const pos = ico.attributes.position;
        const r = rng(99);
        this.plates = [];
        const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
        for (let i = 0; i < pos.count; i += 3) {
            a.fromBufferAttribute(pos, i);
            b.fromBufferAttribute(pos, i + 1);
            c.fromBufferAttribute(pos, i + 2);
            const n = a.clone().add(b).add(c).normalize();
            if (n.z > 0.62 && Math.abs(n.y) < 0.5 && Math.abs(n.x) < 0.62) continue; // leave room for the mask
            const pr = prism(a, b, c, 0.42, 0.86);
            const m = new THREE.Mesh(pr.geo, this.plateMat);
            m.position.copy(pr.center);
            m.add(new THREE.LineSegments(new THREE.EdgesGeometry(pr.geo, 20), this.edgeMat));
            this.body.add(m);
            this.plates.push({
                mesh: m, home: pr.center.clone(), normal: pr.normal, attached: true,
                vel: new THREE.Vector3(), spin: new THREE.Vector3(), life: 0, order: r(),
            });
        }
        // Break-away order: random, but the top and sides go before the bottom.
        this.plates.sort((p, q) => (p.order - p.normal.y * 0.4) - (q.order - q.normal.y * 0.4));
    }

    buildMask() {
        const mask = new THREE.Group();
        mask.position.set(0, 0.1, 3.75);
        const shape = new THREE.Shape();
        const W = 2.5, H = 1.75;
        shape.moveTo(-W, 0.7);
        shape.lineTo(-W * 0.55, H);
        shape.lineTo(W * 0.55, H);
        shape.lineTo(W, 0.7);
        shape.lineTo(W * 0.62, -H * 0.9);
        shape.lineTo(0, -H * 1.25);
        shape.lineTo(-W * 0.62, -H * 0.9);
        shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 2 });
        g.translate(0, 0, -0.25);
        const faceMat = new THREE.MeshStandardMaterial({ color: 0x241229, metalness: 0.85, roughness: 0.25, flatShading: true });
        mask.add(new THREE.Mesh(g, faceMat));
        mask.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 25), this.edgeMat));

        this.eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff3b5c, emissiveIntensity: 6 });
        this.eyes = [];
        for (const s of [-1, 1]) {
            const eye = new THREE.Mesh(new RoundedBoxGeometry(1.05, 0.3, 0.2, 2, 0.08), this.eyeMat);
            eye.position.set(s * 0.9, 0.45, 0.42);
            eye.rotation.z = s * 0.32;
            this.eyes.push(eye);
            mask.add(eye);
            const brow = new THREE.Mesh(new RoundedBoxGeometry(1.25, 0.18, 0.3, 2, 0.06), faceMat);
            brow.position.set(s * 0.95, 0.86, 0.4);
            brow.rotation.z = s * 0.42;
            mask.add(brow);
        }
        this.jawBars = [];
        const barMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff2e88, emissiveIntensity: 3 });
        for (let i = 0; i < 5; i++) {
            const bar = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.6, 0.12, 2, 0.05), barMat);
            bar.position.set((i - 2) * 0.32, -0.75, 0.4);
            this.jawBars.push(bar);
            mask.add(bar);
        }
        this.mask = mask;
        this.maskHome = mask.position.clone();
        this.body.add(mask);
        this.mouth = new THREE.Object3D();
        this.mouth.position.set(0, -1.6, 4.2);
        this.body.add(this.mouth);
    }

    buildRings() {
        this.rings = [];
        const dark = new THREE.MeshStandardMaterial({ color: 0x1a1220, metalness: 0.85, roughness: 0.3 });
        this.ringGlowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff2e88).multiplyScalar(2.4) });
        const specs = [
            { r: 6.4, tilt: [1.25, 0, 0.2], arc: 1.65, speed: 0.35 },
            { r: 7.4, tilt: [0.5, 0.4, -0.5], arc: 1.3, speed: -0.25 },
            { r: 8.5, tilt: [1.7, -0.3, 0.9], arc: 0.9, speed: 0.18 },
        ];
        for (const s of specs) {
            const pivot = new THREE.Group();
            pivot.rotation.set(...s.tilt);
            const spin = new THREE.Group();
            spin.add(new THREE.Mesh(new THREE.TorusGeometry(s.r, 0.16, 8, 120, Math.PI * s.arc), dark));
            const glow = new THREE.Mesh(new THREE.TorusGeometry(s.r, 0.05, 6, 120, Math.PI * s.arc), this.ringGlowMat);
            glow.position.z = 0.12;
            spin.add(glow);
            // nodes on the ring
            for (let k = 0; k < 5; k++) {
                const a = (k / 4) * Math.PI * s.arc;
                const node = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), dark);
                node.position.set(Math.cos(a) * s.r, Math.sin(a) * s.r, 0);
                node.rotation.z = a;
                spin.add(node);
            }
            pivot.add(spin);
            this.root.add(pivot);
            this.rings.push({ spin, speed: s.speed });
        }
    }

    buildGlyphs() {
        this.glyphs = [];
        const r = rng(7);
        for (let i = 0; i < 16; i++) {
            const s = textSprite(GLYPHS[i % GLYPHS.length], 0xff2e88, 0.9 + r() * 0.6);
            s.userData = { a: r() * Math.PI * 2, rad: 8 + r() * 4, y: (r() - 0.5) * 8, speed: (0.12 + r() * 0.2) * (r() < 0.5 ? -1 : 1), flick: r() * 10 };
            this.root.add(s);
            this.glyphs.push(s);
        }
    }

    buildAria() {
        const aria = new THREE.Group();
        const shell = new THREE.MeshStandardMaterial({ color: 0xeaf7ff, metalness: 0.3, roughness: 0.25, emissive: 0x67e8f9, emissiveIntensity: 0.9 });
        aria.add(new THREE.Mesh(new THREE.SphereGeometry(2, 48, 32), shell));
        const visor = new THREE.Mesh(new RoundedBoxGeometry(2.6, 1.1, 0.6, 4, 0.3), new THREE.MeshStandardMaterial({ color: 0x050812, metalness: 0.9, roughness: 0.1 }));
        visor.position.set(0, 0.15, 1.65);
        aria.add(visor);
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x67e8f9, emissiveIntensity: 5 });
        for (const s of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.07, 8, 24, Math.PI), eyeMat);
            eye.position.set(s * 0.6, 0.05, 1.98);
            aria.add(eye);
        }
        const goldMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfbbf24).multiplyScalar(2.4) });
        this.ariaHalo = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.07, 8, 96), goldMat);
        this.ariaHalo.rotation.x = Math.PI / 2.4;
        aria.add(this.ariaHalo);
        this.ariaSats = [];
        for (let i = 0; i < 3; i++) {
            const sat = new THREE.Mesh(new THREE.OctahedronGeometry(0.25), goldMat);
            sat.userData.o = (i / 3) * Math.PI * 2;
            this.ariaSats.push(sat);
            aria.add(sat);
        }
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: new THREE.Color(0x67e8f9).multiplyScalar(1.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        glow.scale.setScalar(11);
        glow.material.opacity = 0.55;
        aria.add(glow);
        aria.visible = false;
        this.aria = aria;
        this.root.add(aria);
    }

    // ---------------- actions ----------------
    hit(power = 0.5, fromWorld = null) {
        this.flash = Math.min(1, this.flash + power);
        this.punch = Math.min(1, this.punch + power * 0.6);
        if (fromWorld) {
            const dir = fromWorld.clone().sub(this.root.position).normalize();
            this.flinch.x -= dir.z * power * 0.35;
            this.flinch.y += dir.x * power * 0.35;
        }
    }

    taunt(dur = 2.4) { this.jaw = dur; }

    mouthWorld(out) { this.root.updateMatrixWorld(true); return this.mouth.getWorldPosition(out); }

    detach(p, explosive = false) {
        if (!p.attached) return;
        p.attached = false;
        this.debris.attach(p.mesh);
        const out = p.mesh.position.clone().sub(this.root.position).normalize();
        p.vel.copy(out).multiplyScalar(explosive ? 14 + Math.random() * 10 : 3 + Math.random() * 3);
        if (!explosive) p.vel.z = Math.min(p.vel.z, 1.5); // fall around the boss, not into the camera
        p.vel.y += explosive ? 4 : 3;
        p.spin.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
        p.life = 0;
        p.grounded = false;
    }

    defeat() {
        if (this.defeated) return;
        this.defeated = true;
        this.defeatT = 0;
        for (const p of this.plates) this.detach(p, true);
        this.debris.attach(this.mask);
        this.maskVel = new THREE.Vector3(0, 9, 6);
        this.maskSpin = 2.5;
    }

    reset() {
        this.defeated = false;
        this.defeatT = 0;
        for (const p of this.plates) {
            p.attached = true;
            this.body.add(p.mesh);
            p.mesh.position.copy(p.home);
            p.mesh.rotation.set(0, 0, 0);
            p.mesh.scale.setScalar(1);
            p.mesh.visible = true;
        }
        this.body.add(this.mask);
        this.mask.position.copy(this.maskHome);
        this.mask.rotation.set(0, 0, 0);
        this.mask.visible = true;
        this.core.visible = true;
        this.core.scale.setScalar(1);
        this.glow.visible = true;
        this.aria.visible = false;
        for (const r of this.rings) r.spin.parent.visible = true;
        for (const g of this.glyphs) g.visible = true;
    }

    // ---------------- per frame ----------------
    update(dt, t, hpFrac) {
        this.hp = hpFrac;
        this.uTime.value = t;
        const lowHp = 1 - hpFrac;

        // shell plates break away as HP drops from 100% to 33%
        if (!this.defeated) {
            const keep = Math.round(this.plates.length * clamp((hpFrac - 0.33) / 0.67, 0, 1));
            this.plates.forEach((p, i) => { if (i >= keep && p.attached) this.detach(p); });
        }
        for (const p of this.plates) {
            if (p.attached) continue;
            p.life += dt;
            const m = p.mesh;
            if (!m.visible) continue;
            const grav = this.defeated && p.life < 0.5 ? 2 : 22;
            p.vel.y -= grav * dt;
            m.position.addScaledVector(p.vel, dt);
            m.rotation.x += p.spin.x * dt;
            m.rotation.y += p.spin.y * dt;
            m.rotation.z += p.spin.z * dt;
            if (m.position.y < 0.35) {
                m.position.y = 0.35;
                p.vel.y *= -0.28;
                p.vel.x *= 0.55; p.vel.z *= 0.55;
                p.spin.multiplyScalar(0.5);
                p.grounded = true;
            }
            if (p.grounded && p.life > 2.2) {
                const s = Math.max(0, 1 - (p.life - 2.2) / 0.8);
                m.scale.setScalar(s);
                if (s <= 0) m.visible = false;
            }
        }

        // flinch spring + gentle sway
        this.flinch.multiplyScalar(Math.exp(-6 * dt));
        this.flash = Math.max(0, this.flash - dt * 3.2);
        this.punch = Math.max(0, this.punch - dt * 4);
        this.body.rotation.x = this.flinch.x;
        this.body.rotation.z = this.flinch.y;
        this.body.rotation.y = Math.sin(t * 0.3) * 0.22;
        this.body.position.y = Math.sin(t * 0.8) * 0.35;
        this.body.scale.setScalar(1 + this.punch * 0.08 + Math.sin(t * 2.2) * 0.012);

        this.core.rotation.y += dt * (0.3 + lowHp * 0.9);
        this.core.rotation.x += dt * 0.17;
        this.coreMat.emissiveIntensity = 2.0 + Math.sin(t * 3) * 0.4 + lowHp * 1.4 + this.flash * 6;
        this.plateMat.emissive.setRGB(0.16 + this.flash * 1.6, 0.0 + this.flash * 1.2, 0.09 + this.flash * 1.4);
        this.glow.material.opacity = 0.3 + lowHp * 0.3 + this.flash * 0.4;
        this.light.intensity = 50 + lowHp * 60 + this.flash * 120;

        const spikes = Math.random() < 0.02 + lowHp * 0.05 ? 1 : 0;
        this.uGlitch.value = damp(this.uGlitch.value, 0.25 + lowHp * 0.7 + this.flash * 0.8 + spikes, 10, dt);

        // eyes flicker and glitch sideways now and then
        const flick = Math.random() < 0.03 + lowHp * 0.06;
        this.eyeMat.emissiveIntensity = flick ? 1.5 : 6 + Math.sin(t * 7) * 1.2 + this.flash * 4;
        this.mask.position.x = this.defeated ? this.mask.position.x : this.maskHome.x + (flick ? (Math.random() - 0.5) * 0.35 : 0);

        // jaw talks during taunts
        if (this.jaw > 0) this.jaw -= dt;
        this.jawBars.forEach((b, i) => {
            const target = this.jaw > 0 ? 0.6 + Math.abs(Math.sin(t * 18 + i * 1.3)) * 1.1 : 1;
            b.scale.y = damp(b.scale.y, target, 20, dt);
        });

        for (const r of this.rings) r.spin.rotation.z += dt * r.speed * (1 + lowHp * 2.5);
        for (const g of this.glyphs) {
            const u = g.userData;
            u.a += dt * u.speed * (1 + lowHp);
            g.position.set(Math.cos(u.a) * u.rad, u.y + Math.sin(t * 0.7 + u.flick) * 0.6, Math.sin(u.a) * u.rad);
            g.material.opacity = Math.sin(t * 3 + u.flick) > -0.6 ? 0.9 : 0.15;
        }

        if (this.defeated) this.updateDefeat(dt, t);
    }

    updateDefeat(dt, t) {
        this.defeatT += dt;
        const k = this.defeatT;
        // mask tumbles away
        if (this.mask.visible) {
            this.maskVel.y -= 20 * dt;
            this.mask.position.addScaledVector(this.maskVel, dt);
            this.mask.rotation.x += this.maskSpin * dt;
            if (this.mask.position.y < 0.6) { this.mask.position.y = 0.6; this.maskVel.set(0, 0, 0); this.maskSpin = 0; }
            if (k > 4) this.mask.scale.setScalar(Math.max(0.0001, 1 - (k - 4)));
            if (k > 5) this.mask.visible = false;
        }
        // core collapses, then ARIA rises
        if (k < 1.2) this.core.scale.setScalar(1 + Math.sin(k * 20) * 0.08 * (1 - k));
        else if (k < 1.6) this.core.scale.setScalar(Math.max(0.0001, 1 - (k - 1.2) / 0.4));
        else { this.core.visible = false; this.glow.visible = false; }
        if (k > 1.6) {
            for (const r of this.rings) r.spin.parent.visible = false;
            for (const g of this.glyphs) g.visible = false;
            this.aria.visible = true;
            const a = Math.min(1, (k - 1.6) / 1.2);
            this.aria.scale.setScalar(Math.max(0.0001, easeOutBack(a)));
            this.aria.position.y = 1.2 + Math.sin(t * 1.2) * 0.4;
            this.ariaHalo.rotation.z += dt * 0.6;
            this.ariaSats.forEach((s) => {
                const ang = t * 0.9 + s.userData.o;
                s.position.set(Math.cos(ang) * 3.6, Math.sin(ang * 2) * 0.6, Math.sin(ang) * 3.6);
                s.rotation.y += dt * 2;
            });
            this.light.color.setHex(0x67e8f9);
        }
    }
}
