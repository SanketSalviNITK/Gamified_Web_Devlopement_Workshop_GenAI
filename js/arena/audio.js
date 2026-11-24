// Tiny synthesised sound kit (Web Audio only, no audio files).
// Browsers block audio until a click, so it starts muted and the HUD offers a toggle.

export class Sfx {
    constructor() {
        this.ctx = null;
        this.enabled = false;
    }

    enable() {
        if (!this.ctx) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return false;
            this.ctx = new Ctx();
            this.master = this.ctx.createGain();
            this.master.gain.value = 0.32;
            const comp = this.ctx.createDynamicsCompressor();
            this.master.connect(comp).connect(this.ctx.destination);
            const len = this.ctx.sampleRate;
            this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
            const d = this.noiseBuf.getChannelData(0);
            for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        }
        this.ctx.resume();
        this.enabled = true;
        return true;
    }

    disable() { this.enabled = false; }

    tone({ type = 'sine', f = 440, f2 = null, dur = 0.2, vol = 0.2, delay = 0 }) {
        if (!this.enabled) return;
        const t = this.ctx.currentTime + delay;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f, t);
        if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(this.master);
        o.start(t);
        o.stop(t + dur + 0.05);
    }

    noise({ dur = 0.3, vol = 0.25, freq = 1200, delay = 0 }) {
        if (!this.enabled) return;
        const t = this.ctx.currentTime + delay;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuf;
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.setValueAtTime(freq, t);
        filt.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 0.15), t + dur);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(filt).connect(g).connect(this.master);
        src.start(t);
        src.stop(t + dur + 0.05);
    }

    shot(power = 1) { this.tone({ type: 'square', f: 700 + power * 300, f2: 180, dur: 0.12, vol: 0.05 }); }
    hit(crit) {
        this.noise({ dur: crit ? 0.6 : 0.18, vol: crit ? 0.5 : 0.16, freq: crit ? 1400 : 2400 });
        this.tone({ type: 'sawtooth', f: crit ? 180 : 260, f2: 40, dur: crit ? 0.5 : 0.18, vol: crit ? 0.22 : 0.07 });
    }
    levelUp() { [523, 659, 784, 1047].forEach((f, i) => this.tone({ type: 'triangle', f, dur: 0.28, vol: 0.13, delay: i * 0.07 })); }
    combo(n) { this.tone({ type: 'triangle', f: 440 * Math.pow(2, Math.min(n, 18) / 12), dur: 0.14, vol: 0.09 }); }
    phase() { this.tone({ type: 'sawtooth', f: 120, f2: 45, dur: 1.4, vol: 0.26 }); this.noise({ dur: 1.4, vol: 0.32, freq: 700 }); }
    taunt() { this.tone({ type: 'sawtooth', f: 95, f2: 70, dur: 0.5, vol: 0.1 }); this.tone({ type: 'square', f: 140, f2: 90, dur: 0.35, vol: 0.05, delay: 0.25 }); }
    shock() { this.noise({ dur: 1.0, vol: 0.32, freq: 420 }); this.tone({ type: 'sine', f: 70, f2: 35, dur: 1.0, vol: 0.3 }); }
    blocked() { this.tone({ type: 'square', f: 220, f2: 160, dur: 0.16, vol: 0.07 }); }
    alarm() { [0, 0.22, 0.44].forEach((d) => this.tone({ type: 'square', f: 660, f2: 520, dur: 0.16, vol: 0.06, delay: d })); }
    victory() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone({ type: 'triangle', f, dur: 0.7, vol: 0.13, delay: i * 0.11 })); }
}
