// Tiny synthesised sound kit (Web Audio only, no audio files).
// Browsers block audio until a click, so it starts muted and the HUD offers a toggle.

function distortionCurve(amount) {
    const n = 1024;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * 2 - 1;
        curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
    }
    return curve;
}

function noiseBuffer(ctx) {
    const len = ctx.sampleRate;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
}

/**
 * The Glitch Overlord's laugh, synthesised as a vowel-shaped robotic voice.
 * `health` (0..1) controls how menacing it is:
 *   full health  a long, deep, booming "MWAHAHAHAHA" with a big echo
 *   half health  shorter, quieter, starting to stutter
 *   near death   a weak, glitching "heh… heh?" that trails off nervously
 * `dying` plays the final broken laugh as the boss is defeated.
 * Works with any AudioContext (including OfflineAudioContext for export/tests).
 * Returns the laugh's length in seconds.
 */
export function laughInto(ctx, dest, t0, health = 1, { dying = false, noise = null, rand = Math.random } = {}) {
    const h = Math.max(0, Math.min(1, health));
    if (h <= 0 && !dying) return 0;
    const strength = dying ? 0.35 : h;               // how confident the voice is
    const vol = 0.55 * (dying ? 0.5 : 0.1 + 0.9 * Math.pow(h, 1.15));
    const count = dying ? 6 : Math.max(2, Math.round(2 + h * 6));
    const gap = 0.15 + (1 - strength) * 0.16;        // weaker laughs are slower
    const base = dying ? 95 : 72 + h * 40;           // deep when strong
    const nz = noise || noiseBuffer(ctx);

    // voice bus -> three vowel formants ("ah") -> grit -> output (+ echo)
    const voice = ctx.createGain();
    const mix = ctx.createGain();
    mix.gain.value = 1;
    for (const [f, q, g] of [[760, 6, 1], [1180, 8, 0.7], [2550, 10, 0.25]]) {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = f;
        bp.Q.value = q;
        const fg = ctx.createGain();
        fg.gain.value = g * 3.2;
        voice.connect(bp).connect(fg).connect(mix);
    }
    const body = ctx.createBiquadFilter();           // keeps some chest resonance
    body.type = 'lowpass';
    body.frequency.value = 420;
    const bodyGain = ctx.createGain();
    bodyGain.gain.value = 0.55 * (0.4 + strength * 0.6);
    voice.connect(body).connect(bodyGain).connect(mix);

    const grit = ctx.createWaveShaper();
    grit.curve = distortionCurve(dying ? 20 : 4 + (1 - h) * 14);
    const out = ctx.createGain();
    out.gain.value = vol;
    mix.connect(grit).connect(out).connect(dest);

    // Echo: a cavernous hall at full strength, almost dry when weak.
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.21;
    const fb = ctx.createGain();
    fb.gain.value = 0.15 + strength * 0.3;
    const wet = ctx.createGain();
    wet.gain.value = 0.15 + strength * 0.45;
    out.connect(delay).connect(fb).connect(delay);
    delay.connect(wet).connect(dest);

    let t = t0;
    let end = t0;
    for (let i = 0; i < count; i++) {
        const first = i === 0 && strength > 0.45;    // the long "MWA"
        const dur = first ? 0.42 : 0.12 + (1 - strength) * 0.05 + rand() * 0.02;
        // pitch: rises on the "MWA", then cackles downward
        const prog = i / Math.max(1, count - 1);
        let p = base * (first ? 0.92 : 1.32 - 0.42 * prog) * (1 + (rand() - 0.5) * 0.06);
        if (dying) p = base * (1.1 - prog * 0.75);   // collapses toward nothing
        const nervous = !dying && h < 0.3 && i === count - 1; // last "heh?" bends up

        // weak laughs stutter: some syllables glitch into short repeats
        const stutter = !first && rand() < (1 - strength) * 0.45 ? 2 + Math.floor(rand() * 2) : 1;
        for (let s = 0; s < stutter; s++) {
            const st = t + s * (dur / stutter);
            const sd = dur / stutter;
            for (const [type, mult, g] of [['sawtooth', 1, 1], ['square', 0.5, 0.35 * strength + 0.05]]) {
                const o = ctx.createOscillator();
                o.type = type;
                o.frequency.setValueAtTime(p * mult * (first ? 0.85 : 1.06), st);
                if (first) o.frequency.linearRampToValueAtTime(p * mult * 1.12, st + sd * 0.35);
                o.frequency.exponentialRampToValueAtTime(p * mult * (nervous ? 1.6 : 0.82), st + sd);
                const vib = ctx.createOscillator();      // shaky voice when weak
                vib.frequency.value = 6 + (1 - strength) * 9;
                const vibG = ctx.createGain();
                vibG.gain.value = p * mult * (0.01 + (1 - strength) * 0.05);
                vib.connect(vibG).connect(o.frequency);
                const g0 = ctx.createGain();
                g0.gain.setValueAtTime(0.0001, st);
                g0.gain.exponentialRampToValueAtTime(g, st + 0.018);
                g0.gain.setValueAtTime(g, st + sd * (first ? 0.7 : 0.35));
                g0.gain.exponentialRampToValueAtTime(0.0001, st + sd);
                o.connect(g0).connect(voice);
                o.start(st); vib.start(st);
                o.stop(st + sd + 0.02); vib.stop(st + sd + 0.02);
            }
            // breathy "h" at the start of each syllable
            const hn = ctx.createBufferSource();
            hn.buffer = nz;
            const hf = ctx.createBiquadFilter();
            hf.type = 'highpass';
            hf.frequency.value = 1400;
            const hg = ctx.createGain();
            hg.gain.setValueAtTime(first ? 0.0001 : 0.35, st);
            hg.gain.exponentialRampToValueAtTime(0.0001, st + 0.05);
            hn.connect(hf).connect(hg).connect(voice);
            hn.start(st, rand() * 0.5);
            hn.stop(st + 0.06);
        }
        // occasionally drop a syllable entirely when the boss is failing
        const skip = !dying && rand() < (1 - h) * 0.25 ? gap * 0.8 : 0;
        t += (first ? dur + 0.06 : gap) + skip;
        end = t + dur;
    }
    return end - t0 + 0.3 + strength * 0.5;
}

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
    /** Evil laugh scaled by boss health (0..1). Returns its length so the jaw can sync. */
    laugh(health, opts = {}) {
        if (!this.enabled || this.laughing > this.ctx.currentTime) return 0;
        const dur = laughInto(this.ctx, this.master, this.ctx.currentTime + 0.02, health, { ...opts, noise: this.noiseBuf });
        this.laughing = this.ctx.currentTime + dur * 0.8;
        return dur;
    }

    victory() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone({ type: 'triangle', f, dur: 0.7, vol: 0.13, delay: i * 0.11 })); }
}
