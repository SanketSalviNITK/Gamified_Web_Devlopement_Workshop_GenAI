// Shared constants and small helpers for the Glitch Arena.

export const COLORS = {
    corrupt: 0xff2e88,
    corruptHot: 0xff3b5c,
    cyan: 0x22d3ee,
    gold: 0xfbbf24,
    bg: 0x05040c,
};

export const CLASSES = {
    architect:   { key: 'architect',   label: 'Architect',   color: 0x38bdf8, icon: '◆' },
    engineer:    { key: 'engineer',    label: 'Engineer',    color: 0xfb923c, icon: '▲' },
    promptsmith: { key: 'promptsmith', label: 'Promptsmith', color: 0xc084fc, icon: '✦' },
};
export const CLASS_KEYS = Object.keys(CLASSES);

// Portfolio theme colours a student can pick in Module 2. Their bot's chassis uses it.
export const THEME_COLORS = [0x22d3ee, 0x34d399, 0xf472b6, 0xfacc15, 0x818cf8, 0xfb923c, 0x2dd4bf, 0xe879f9];

// One visible part per module, so progress reads at a glance.
export const STAGES = [
    { part: 'Stasis Pod',  module: 'Registered' },
    { part: 'Power Core',  module: 'M1 · Git & GitHub' },
    { part: 'Chassis',     module: 'M2 · Portfolio' },
    { part: 'Holo Wings',  module: 'M3 · 3D Web' },
    { part: 'Avatar Head', module: 'M4 · 3D Avatar' },
    { part: 'Voice Core',  module: 'M5 · Chatbot' },
];

export function hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

// Small deterministic PRNG (mulberry32) so a username always produces the same bot.
export function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeOutBack = (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const pick = (arr, r = Math.random) => arr[Math.floor(r() * arr.length)];
export const hex = (n) => '#' + n.toString(16).padStart(6, '0');
export const randomCommit = () => Math.random().toString(16).slice(2, 9);

export function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
