// Camera director: slow idle orbit, swoops to the bot that lands a critical hit,
// pushes in on the boss for phase breaks, and orbits wide on victory.
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export class Director {
    constructor(camera, { reduced = false } = {}) {
        this.cam = camera;
        this.reduced = reduced;
        this.pos = V(0, 9, 22);
        this.look = V(0, 9, 0);
        this.mode = 'intro';
        this.modeT = 2.6;
        this.cool = 0;
        this.trauma = 0;
        this.fPos = V(0, 0, 0);
        this.fLook = V(0, 0, 0);
        this.tp = V(0, 0, 0);
        this.tl = V(0, 0, 0);
        this.view = 'arena';
        if (reduced) { this.mode = 'orbit'; this.pos.set(0, 19, 50); }
    }

    focusBot(bot, bossPos) {
        if (this.reduced || this.cool > 0 || this.mode !== 'orbit') return false;
        const bp = bot.root.getWorldPosition(V(0, 0, 0));
        const away = bp.clone().sub(bossPos).setY(0).normalize();
        const side = V(-away.z, 0, away.x);
        this.fPos.copy(bp).addScaledVector(away, 11).addScaledVector(side, 3.5).add(V(0, 5, 0));
        this.fLook.copy(bp).lerp(bossPos, 0.5).add(V(0, 1.2, 0));
        this.mode = 'focus';
        this.modeT = 2.1;
        this.cool = 7;
        return true;
    }

    bossShot(dur = 2.8) {
        if (this.reduced || this.mode === 'victory') return;
        this.mode = 'boss';
        this.modeT = dur;
    }

    victory() { this.mode = 'victory'; }
    reset() { this.mode = 'orbit'; this.cool = 0; }
    lineup() { this.view = 'lineup'; this.mode = 'lineup'; this.pos.set(0, 2.5, 11.5); }
    shake(amount) { if (!this.reduced) this.trauma = Math.min(1, this.trauma + amount); }

    update(dt, t) {
        this.cool -= dt;
        if (this.mode === 'focus' || this.mode === 'boss' || this.mode === 'intro') {
            this.modeT -= dt;
            if (this.modeT <= 0) this.mode = 'orbit';
        }
        let lam = 2.0;
        const tp = this.tp, tl = this.tl;
        switch (this.mode) {
            case 'intro':
                tp.set(Math.sin(t * 0.3) * 4, 10, 22); tl.set(0, 9.5, 0); lam = 3; break;
            case 'focus':
                tp.copy(this.fPos); tl.copy(this.fLook); lam = 3.6; break;
            case 'boss':
                tp.set(Math.sin(t * 0.25) * 5, 11, 26); tl.set(0, 9.5, 0); lam = 3; break;
            case 'victory': {
                const a = t * 0.1;
                tp.set(Math.sin(a) * 34, 15, 30 + Math.cos(a) * 8); tl.set(0, 7.5, 0); lam = 1.2; break;
            }
            case 'lineup':
                tp.set(Math.sin(t * 0.15) * 0.8, 2.5, 11.5); tl.set(0, 1.35, 0); lam = 2; break;
            default: {
                const a = this.reduced ? 0 : Math.sin(t * 0.05) * 0.24;
                tp.set(Math.sin(a) * 52, 25 + Math.sin(t * 0.17) * 0.7, Math.cos(a) * 52);
                tl.set(0, 3.6, 9);
            }
        }
        const k = 1 - Math.exp(-lam * dt);
        this.pos.lerp(tp, k);
        this.look.lerp(tl, k);

        this.trauma = Math.max(0, this.trauma - dt * 1.3);
        const s = this.trauma * this.trauma;
        this.cam.position.copy(this.pos);
        if (s > 0) {
            this.cam.position.x += (Math.sin(t * 47.3) + Math.sin(t * 23.1)) * s * 0.45;
            this.cam.position.y += (Math.sin(t * 39.7) + Math.sin(t * 17.9)) * s * 0.35;
        }
        this.cam.lookAt(this.look);
        if (s > 0) this.cam.rotation.z += Math.sin(t * 31.3) * s * 0.025;
    }
}
