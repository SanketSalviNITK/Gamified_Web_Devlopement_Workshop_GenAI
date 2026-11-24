// Glitch Arena: projector view for the cohort raid (vertical-slice prototype).
//
// URL options
//   ?view=lineup     design review: one bot at every stage, side by side
//   ?demo=0          no simulated cohort activity (drive it from arena-control.html)
//   ?n=24            simulated cohort size (1-60)
//   ?speed=1.5       simulation speed
//   ?motion=reduced  no camera swoops, shake or heavy glitching
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { Bot, sharedTime } from './bot.js';
import { Boss } from './boss.js';
import { createEnvironment } from './environment.js';
import { Particles, Projectiles, Shockwaves } from './fx.js';
import { Director } from './director.js';
import { Hud } from './hud.js';
import { Sfx } from './audio.js';
import { CLASSES, CLASS_KEYS, THEME_COLORS, STAGES, clamp, damp, pick, randomCommit, escapeHtml, hex } from './util.js';

// ---------------------------------------------------------------------------
// Config
const params = new URLSearchParams(location.search);
const VIEW = params.get('view') === 'lineup' ? 'lineup' : 'arena';
const REDUCED = params.get('motion') === 'reduced' || matchMedia('(prefers-reduced-motion: reduce)').matches;
let demo = params.get('demo') !== '0';
let speed = clamp(parseFloat(params.get('speed') || '1') || 1, 0.25, 4);
const N = clamp(parseInt(params.get('n') || '24', 10) || 24, 1, 60);

const BOT_SCALE = 1.6;
const BOSS_HP = 10000;          // displayed HP; damage units below are % of this
const HP_UNIT = BOSS_HP / 100;
const DMG = { lesson: 0.35, quiz: 0.9, lab: 2.6, help: 0.5 };
const XP = { lesson: 10, quiz: 30, lab: 150, help: 40 };
const PHASES = ['', 'PHASE I · FIREWALL SHELL', 'PHASE II · SHELL BREACHED', 'PHASE III · CORE EXPOSED', 'DEFEATED'];

const TAUNTS = [
    'Forgot to git add again?',
    'Your <div> is not closed. I can feel it.',
    'undefined is not a function. Heh.',
    'Did you even read what the AI wrote?',
    'Merge conflict incoming…',
    'Cannot read properties of null 😈',
    'Your CSS is !important-ing itself to death.',
    'I live in the code you copy-paste.',
];
const PHASE_TAUNTS = ['', '', 'You cracked my firewall? Lucky commit.', 'NO! My core is exposed!'];
const BOT_LINES = [
    (n) => `Hi! I'm ${n}'s bot 👋`,
    () => 'Ask me about my projects!',
    () => 'Lighthouse score: 96 😎',
    () => 'Regex-powered and proud.',
    () => 'Glitch detected. Engaging!',
    () => 'Built with prompts and persistence.',
    () => 'I read the code before I shipped it.',
];
const AMBUSH_QUESTIONS = [
    { q: 'Which command stages every changed file for the next commit?', options: ['git push', 'git add .', 'git commit -a -m', 'git init'], answer: 1 },
    { q: 'In Three.js, what draws the scene to the canvas each frame?', options: ['scene.draw()', 'camera.render()', 'renderer.render(scene, camera)', 'THREE.paint()'], answer: 2 },
    { q: 'Which CSS property creates the frosted-glass effect?', options: ['filter: glass', 'opacity: 0.5', 'backdrop-filter: blur()', 'background: frost'], answer: 2 },
    { q: 'The AI gave you code that works but you do not understand it. Best move?', options: ['Ship it', 'Ask it to explain line by line', 'Delete it', 'Add more prompts'], answer: 1 },
];
const NAMES = ['Aarav', 'Meera', 'Sneha', 'Rohan', 'Kriti', 'Aditya', 'Ishaan', 'Diya', 'Kabir', 'Ananya', 'Vihaan', 'Saanvi', 'Arjun', 'Tara', 'Neel', 'Zara', 'Dev', 'Riya', 'Kian', 'Myra', 'Om', 'Pari', 'Yash', 'Ira', 'Reyansh', 'Navya', 'Aryan', 'Kavya', 'Veer', 'Anika', 'Rehan', 'Sia', 'Advait', 'Mira', 'Shaan', 'Aisha', 'Krish', 'Nila', 'Arnav', 'Tanvi', 'Rudra', 'Eva', 'Atharv', 'Ahana', 'Vivaan', 'Jiya', 'Ved', 'Aadya', 'Laksh', 'Prisha', 'Ayaan', 'Kiara', 'Rian', 'Siya', 'Hrithik', 'Avni', 'Parth', 'Ishita', 'Dhruv', 'Amaira'];

// ---------------------------------------------------------------------------
// Renderer, scene, post-processing
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x07050f, 0.0095);
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 800);

scene.add(new THREE.HemisphereLight(0x8fb8ff, 0x1a0b1f, 0.9));
const key = new THREE.DirectionalLight(0xcfe8ff, 2.2);
key.position.set(-20, 30, 35);
scene.add(key);
const rim = new THREE.DirectionalLight(0xff5fa8, 1.6);
rim.position.set(10, 12, -30);
scene.add(rim);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.75, 0.5, 0.8);
composer.addPass(bloom);
const finalPass = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGlitch: { value: 0 }, uAberr: { value: 0.0016 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse; uniform float uTime, uGlitch, uAberr; varying vec2 vUv;
        float h(float n) { return fract(sin(n) * 43758.5453); }
        void main() {
            vec2 uv = vUv;
            float band = floor(uv.y * 28.0) + floor(uTime * 14.0) * 7.0;
            uv.x += step(1.0 - 0.10 * uGlitch, h(band)) * (h(band * 1.7) - 0.5) * 0.05 * uGlitch;
            vec2 dir = uv - 0.5;
            float ab = uAberr + uGlitch * 0.005;
            vec3 c = vec3(texture2D(tDiffuse, uv + dir * ab).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - dir * ab).b);
            c *= 0.975 + 0.025 * sin(uv.y * 1100.0);
            c *= mix(0.5, 1.0, smoothstep(0.95, 0.32, length(dir)));
            gl_FragColor = vec4(c, 1.0);
        }`,
});
composer.addPass(finalPass);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------------------
// World
const env = createEnvironment(scene);
const boss = new Boss(scene);
const particles = new Particles(scene);
const projectiles = new Projectiles(scene, particles);
const waves = new Shockwaves(scene);
const director = new Director(camera, { reduced: REDUCED });
const hud = new Hud(camera);
const sfx = new Sfx();

const S = {
    hp: 100, phase: 1, defeated: false,
    combo: 0, comboT: 0, rage: 0, shield: null, shieldUsed: false,
    heal: 0, gold: 0, glitch: 0, hitStop: 0,
    raiders: [], ambush: null,
};
const bossPos = boss.root.position.clone();
const C = (h, m = 2.2) => new THREE.Color(h).multiplyScalar(m);

// ---------------------------------------------------------------------------
// Raiders
function layout(n) {
    const out = [];
    let row = 0, placed = 0;
    while (placed < n) {
        const r = 17 + row * 5.4;
        const gap = 4.6;
        const cap = Math.max(1, Math.floor((THREE.MathUtils.degToRad(124) * r) / gap) + 1);
        const count = Math.min(cap, n - placed);
        for (let i = 0; i < count; i++) {
            const th = (i - (count - 1) / 2) * (gap / r);
            out.push(new THREE.Vector3(Math.sin(th) * r, 0, Math.cos(th) * r));
        }
        placed += count;
        row++;
    }
    return out;
}

function makeRaider({ id, name, cls, stage, color }) {
    const bot = new Bot({ id, name, cls, stage, color });
    bot.root.scale.setScalar(VIEW === 'lineup' ? 1 : BOT_SCALE);
    scene.add(bot.root);
    return { id, name, cls, color, stage, bot, xp: 0, dmg: 0, crits: 0, helps: 0, target: new THREE.Vector3() };
}

function relayout(snap = false) {
    const slots = layout(S.raiders.length);
    S.raiders.forEach((r, i) => {
        r.target.copy(slots[i]);
        if (snap) r.bot.root.position.copy(slots[i]);
        r.bot.root.rotation.y = Math.atan2(-r.target.x, -r.target.z);
    });
    hud.count(S.raiders.length);
}

function addRaider(data, announce = true) {
    const r = makeRaider(data);
    S.raiders.push(r);
    hud.addPlate(r.id, r.name, r.color);
    relayout();
    if (!r.bot.root.position.lengthSq()) r.bot.root.position.copy(r.target);
    r.bot.setStage(r.stage, false);
    // materialise: scale up from nothing
    r.bot.root.scale.setScalar(0.0001);
    r.spawnT = 0;
    if (announce) {
        hud.feed(`<b>${escapeHtml(r.name)}</b> joined the raid as ${CLASSES[r.cls].label}`, 'join');
        particles.burst(r.target.clone().setY(1.5), { count: 40, speed: 4, color: C(CLASSES[r.cls].color), size: 0.4, life: 0.8, up: 2 });
    }
    return r;
}

function seedCohort() {
    const weights = [3, 5, 6, 5, 3, 2];
    const pickStage = () => {
        let x = Math.random() * weights.reduce((a, b) => a + b, 0);
        for (let i = 0; i < weights.length; i++) { x -= weights[i]; if (x <= 0) return i; }
        return 0;
    };
    const names = [...NAMES].sort(() => Math.random() - 0.5);
    for (let i = 0; i < N; i++) {
        const name = names[i % names.length] + (10 + Math.floor(Math.random() * 89));
        const r = addRaider({ id: name.toLowerCase(), name, cls: pick(CLASS_KEYS), stage: pickStage(), color: pick(THEME_COLORS) }, false);
        r.spawnDelay = 0.6 + i * 0.06;
        r.xp = r.stage * 180 + Math.floor(Math.random() * 120);
    }
    relayout(true);
}

// Game-time timers: they pause with hit-stop and follow the simulation clock.
const timers = [];
function later(sec, fn) { timers.push({ t: sec, fn }); }

const findRaider = (id) => S.raiders.find((r) => r.id === id || r.name === id);

// ---------------------------------------------------------------------------
// Combat
function bossTarget() {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(2.6);
    v.z = Math.abs(v.z) + 1.5;
    return v.add(bossPos);
}

function raiderEvent(type, raider, opts = {}) {
    if (!raider || S.defeated) return;
    const bot = raider.bot;
    let dmg = DMG[type];
    let mult = 1;
    let tag = '';
    let crit = false;

    if (type === 'quiz') {
        const score = opts.score ?? 0.7 + Math.random() * 0.3;
        dmg = 0.45 + score * 0.75;
        if (opts.firstTry ?? Math.random() < 0.4) { dmg *= 1.25; tag = 'FIRST TRY'; }
    }
    if (type === 'lab') {
        crit = true;
        mult = opts.mult ?? pick([1.5, 2, 2, 2.5]);
        dmg *= mult;
    }
    if (S.rage > 0) dmg *= 2;

    let blocked = false;
    if (S.shield) {
        if (type === 'quiz') {
            S.shield.have++;
            hud.setShield(S.shield);
            if (S.shield.have >= S.shield.need) breakShield(raider);
        } else if (type === 'lab' || type === 'lesson') blocked = true;
    }

    raider.xp += XP[type] + (crit ? Math.round(mult * 20) : 0);
    if (type === 'help') raider.helps++;

    bot.attack();
    const from = bot.muzzleWorld(new THREE.Vector3());
    const power = crit ? 1.8 : type === 'quiz' ? 1 : type === 'help' ? 0.8 : 0.55;
    const color = type === 'help' ? 0x34d399 : CLASSES[raider.cls].color;
    sfx.shot(power);
    if (crit) {
        director.focusBot(bot, bossPos);
        hud.hot(raider.id, 3);
    } else hud.hot(raider.id, 1.2);

    projectiles.spawn(from, bossTarget(), crit ? 0xfbbf24 : color, power, (at) => {
        if (blocked) {
            hud.damage(at, 'BLOCKED', 'blocked');
            particles.burst(at, { count: 25, speed: 7, color: C(0x93c5fd, 2.5), size: 0.35, life: 0.5 });
            sfx.blocked();
        } else {
            applyDamage(dmg, raider, { crit, at, type, mult, tag });
        }
        if (type === 'lab') stageUp(raider, opts);
    });
}

function applyDamage(dmg, raider, { crit = false, at = bossPos, type = 'quiz', mult = 1, tag = '' } = {}) {
    if (S.defeated) return;
    S.hp = Math.max(0, S.hp - dmg);
    if (raider) {
        raider.dmg += dmg;
        if (crit) raider.crits++;
    }
    const shown = Math.round(dmg * HP_UNIT);
    hud.damage(at, crit ? `CRIT ${shown.toLocaleString()}` : tag ? `${tag} ${shown}` : `${shown}`, crit ? 'crit' : type === 'help' ? 'help' : 'normal');
    particles.burst(at, { count: crit ? 120 : 30, speed: crit ? 14 : 7, color: C(crit ? 0xfbbf24 : 0xff2e88, 2.4), size: crit ? 0.6 : 0.4, life: crit ? 1.1 : 0.6, grav: 6 });
    boss.hit(crit ? 1 : 0.35, raider ? raider.bot.root.position : null);
    director.shake(crit ? 0.55 : 0.1);
    sfx.hit(crit);
    if (crit) {
        S.hitStop = 0.09;
        S.glitch = Math.min(1, S.glitch + 0.6);
        if (raider) {
            const sideNote = mult >= 2.5 ? ' · Lighthouse 96' : '';
            hud.banner(`CRITICAL ×${mult}`, `<b>${escapeHtml(raider.name)}</b> verified a lab · commit <code>${randomCommit()}</code>${sideNote}`, 'crit', 2.4);
            cheerAround(raider, 3);
        }
    }

    // combo
    S.combo = S.comboT > 0 ? S.combo + 1 : 1;
    S.comboT = 4.5;
    if (S.combo >= 3) {
        hud.combo(S.combo);
        sfx.combo(S.combo);
        if (S.combo % 10 === 0) hud.banner(`COHORT COMBO ×${S.combo}`, 'Keep the hits coming!', 'combo', 1.8);
    }

    // phase / victory
    const phase = S.hp > 66 ? 1 : S.hp > 33 ? 2 : S.hp > 0 ? 3 : 4;
    if (phase === 4) victory();
    else if (phase !== S.phase) phaseBreak(phase);
    updateBossHud();
}

function updateBossHud() {
    hud.setBoss(S.hp / 100, PHASES[S.phase], S.hp * HP_UNIT);
}

function stageUp(raider, opts) {
    const bot = raider.bot;
    if (raider.stage >= 5) return;
    const prev = raider.stage;
    raider.stage++;
    bot.setStage(raider.stage, true);
    const at = raider.bot.root.position.clone().setY(1.6);
    particles.burst(at, { count: 70, speed: 6, color: C(raider.color, 2.6), size: 0.45, life: 1, up: 3, grav: 4 });
    waves.spawn(raider.bot.root.position, { color: raider.color, radius: 3.2, dur: 0.7, intensity: 3 });
    if (prev === 0) {
        // break out of the stasis pod: glass shards
        particles.burst(raider.bot.root.position.clone().setY(1.8), { count: 90, speed: 9, color: C(0x9be7ff, 2), size: 0.3, life: 1.3, grav: 14, spread: 1.2 });
    }
    sfx.levelUp();
    const st = STAGES[raider.stage];
    hud.feed(`<b>${escapeHtml(raider.name)}</b> verified <i>${st.module}</i> and assembled <b>${st.part}</b> · <code>${opts.commit || randomCommit()}</code>`, 'lab');
}

function cheerAround(raider, n) {
    const others = S.raiders.filter((r) => r !== raider && r.stage > 0).sort(() => Math.random() - 0.5).slice(0, n);
    others.forEach((r, i) => r.bot.cheer(i * 0.12));
    raider.bot.cheer(0.4);
}

function phaseBreak(phase) {
    S.phase = phase;
    hud.banner('PHASE BREAK', PHASES[phase], 'phase', 3);
    director.bossShot();
    director.shake(0.7);
    sfx.phase();
    S.glitch = 1;
    particles.burst(bossPos, { count: 220, speed: 18, color: C(0xff2e88, 2.6), size: 0.6, life: 1.4, grav: 8 });
    S.raiders.forEach((r, i) => r.bot.cheer(0.3 + (i % 6) * 0.08));
    later(0.9, () => taunt(PHASE_TAUNTS[phase]));
    hud.feed(`<b>Glitch Overlord</b> entered ${PHASES[phase]}`, 'phase');
    if (demo && phase === 2 && !S.shieldUsed) later(3.5, () => raiseShield(6));
}

function raiseShield(need = 6) {
    if (S.defeated || S.shield) return;
    S.shield = { need, have: 0 };
    S.shieldUsed = true;
    hud.setShield(S.shield);
    hud.banner('SHIELD UP', `Labs are blocked until the cohort passes <b>${need}</b> quizzes`, 'phase', 3);
    hud.feed('<b>Glitch Overlord</b> raised a firewall shield. Pass quizzes to break it!', 'phase');
    sfx.alarm();
    boss.taunt();
}

function breakShield(raider) {
    S.shield = null;
    hud.setShield(null);
    hud.banner('SHIELD SHATTERED', `${raider ? `<b>${escapeHtml(raider.name)}</b> landed the final quiz.` : ''} Labs deal damage again!`, 'crit', 2.6);
    particles.burst(bossPos, { count: 200, speed: 16, color: C(0x93c5fd, 2.5), size: 0.5, life: 1.2 });
    director.shake(0.5);
    sfx.levelUp();
}

function startRage(secs = 45) {
    if (S.defeated) return;
    S.rage = secs;
    hud.banner('RAGE MODE', `All damage ×2 for ${secs} seconds`, 'rage', 2.6);
    hud.feed(`<b>Instructor</b> triggered Rage Mode · ×2 damage for ${secs}s`, 'rage');
    sfx.alarm();
}

function taunt(line) {
    if (S.defeated) return;
    const text = line || pick(TAUNTS);
    boss.taunt(2.6);
    hud.bubble('boss', () => boss.mouthWorld(new THREE.Vector3()), text, 'boss', 3.4);
    sfx.taunt();
}

function shockwave() {
    if (S.defeated) return;
    taunt('GLITCH PULSE!');
    boss.hit(0.5);
    sfx.shock();
    director.shake(0.35);
    const hitSet = new Set();
    waves.spawn(bossPos, {
        color: 0xff2e88, radius: 46, dur: 1.8, intensity: 3,
        onTick: (radius) => {
            for (const r of S.raiders) {
                if (hitSet.has(r)) continue;
                if (r.bot.root.position.length() < radius) { hitSet.add(r); r.bot.hurt(); }
            }
        },
    });
    particles.burst(bossPos.clone().setY(1), { count: 160, speed: 20, color: C(0xff2e88, 2.4), size: 0.5, life: 1, spread: 1.4 });
}

function botChat() {
    const talkers = S.raiders.filter((r) => r.stage >= 5);
    if (!talkers.length) return;
    const r = pick(talkers);
    const line = pick(BOT_LINES)(r.name);
    r.bot.speak(2.8);
    hud.bubble('bot-' + r.id, () => r.bot.anchor.getWorldPosition(new THREE.Vector3()), line, 'bot', 3);
}

function startAmbush(q = pick(AMBUSH_QUESTIONS), secs = 12) {
    if (S.defeated || S.ambush) return;
    S.ambush = { q, t: secs };
    hud.ambush(q, secs);
    hud.banner('AMBUSH!', 'Answer on your device before the timer runs out', 'phase', 2);
    sfx.alarm();
}

function resolveAmbush() {
    const { q } = S.ambush;
    S.ambush = null;
    const correct = S.raiders.filter(() => Math.random() < 0.72);
    hud.ambushResolve(q, correct.length, S.raiders.length);
    correct.forEach((r, i) => later(0.6 + i * 0.09, () => raiderEvent('quiz', r, { score: 1, firstTry: true })));
}

function victory() {
    if (S.defeated) return;
    S.defeated = true;
    S.phase = 4;
    S.shield = null;
    S.rage = 0;
    hud.setShield(null);
    hud.setRage(0);
    hud.setDefeated(true);
    boss.defeat();
    director.victory();
    director.shake(1);
    sfx.victory();
    S.glitch = 1;
    particles.burst(bossPos, { count: 600, speed: 26, color: C(0xfbbf24, 2.6), size: 0.7, life: 2.2, grav: 9 });
    hud.banner('GLITCH OVERLORD DEFEATED', 'Sector restored · ARIA is free', 'victory', 5);
    hud.feed('<b>Victory!</b> The cohort defeated the Glitch Overlord', 'victory');
    S.raiders.forEach((r, i) => r.bot.cheer(0.2 + (i % 8) * 0.1));
    const by = (k) => [...S.raiders].sort((a, b) => b[k] - a[k])[0];
    const mvp = by('dmg'), crit = by('crits'), helper = by('helps');
    later(3.2, () => {
        hud.victory([
            { award: 'MVP · Most damage', name: mvp.name, color: mvp.color, stat: `${Math.round(mvp.dmg * HP_UNIT).toLocaleString()} dmg` },
            { award: 'Critical striker', name: crit.name, color: crit.color, stat: `${crit.crits} verified lab${crit.crits === 1 ? '' : 's'}` },
            { award: 'Top helper', name: helper.name, color: helper.color, stat: `${helper.helps} peer${helper.helps === 1 ? '' : 's'} helped` },
        ]);
        hud.bubble('aria', () => bossPos.clone().add(new THREE.Vector3(0, 5.5, 2)), 'Thank you, raiders. Let\'s build something good. ✨', 'aria', 6);
    });
    updateBossHud();
    if (demo) later(24, () => resetRaid(true));
}

function resetRaid(reroll = false) {
    S.hp = 100; S.phase = 1; S.defeated = false; S.combo = 0; S.comboT = 0; S.rage = 0; S.shield = null; S.shieldUsed = false;
    boss.reset();
    boss.light.color.setHex(0xff2e88);
    director.reset();
    hud.hideVictory();
    hud.setDefeated(false);
    hud.setShield(null);
    hud.setRage(0);
    if (reroll) {
        for (const r of S.raiders) {
            r.stage = Math.min(r.stage, Math.floor(Math.random() * 3));
            r.bot.setStage(r.stage, true);
            r.dmg = 0; r.crits = 0; r.helps = 0;
        }
    }
    hud.banner('NEW RAID', 'The Glitch Overlord has rebooted', 'phase', 2.4);
    hud.feed('<b>Raid reset.</b> The Glitch Overlord rebooted its core', 'phase');
    updateBossHud();
}

// ---------------------------------------------------------------------------
// Demo simulation
const sched = { event: 2.5, taunt: 7, shock: 26, chat: 5, ambush: 55, join: 40 };
function demoTick(dt) {
    if (!demo || S.defeated || !S.raiders.length) return;
    for (const k in sched) sched[k] -= dt * speed;
    if (sched.event <= 0) {
        sched.event = 0.7 + Math.random() * 1.5;
        const x = Math.random();
        const r = pick(S.raiders);
        if (x < 0.15) {
            const climbers = S.raiders.filter((q) => q.stage < 5);
            raiderEvent('lab', climbers.length ? pick(climbers) : r, climbers.length ? {} : { mult: 2.5 });
        } else if (x < 0.22) raiderEvent('help', r);
        else if (x < 0.6) raiderEvent('quiz', r);
        else raiderEvent('lesson', r);
    }
    if (sched.taunt <= 0) { sched.taunt = 12 + Math.random() * 6; taunt(); }
    if (sched.shock <= 0) { sched.shock = 28 + Math.random() * 10; shockwave(); }
    if (sched.chat <= 0) { sched.chat = 6 + Math.random() * 5; botChat(); }
    if (sched.ambush <= 0) { sched.ambush = 70 + Math.random() * 20; startAmbush(); }
    if (sched.join <= 0 && S.raiders.length < 60) {
        sched.join = 45 + Math.random() * 30;
        const name = pick(NAMES) + (10 + Math.floor(Math.random() * 89));
        if (!findRaider(name.toLowerCase())) addRaider({ id: name.toLowerCase(), name, cls: pick(CLASS_KEYS), stage: 0, color: pick(THEME_COLORS) });
    }
}

// ---------------------------------------------------------------------------
// Remote control (arena-control.html) over BroadcastChannel
const bus = 'BroadcastChannel' in window ? new BroadcastChannel('glitch-arena') : null;
function command(m) {
    const target = () => {
        const named = m.raider && findRaider(m.raider);
        if (named) return named;
        const climbers = S.raiders.filter((r) => r.stage < 5);
        return m.type === 'lab' && climbers.length ? pick(climbers) : pick(S.raiders);
    };
    switch (m.type) {
        case 'lesson': case 'quiz': case 'lab': case 'help': raiderEvent(m.type, target(), m); break;
        case 'taunt': taunt(m.text); break;
        case 'shockwave': shockwave(); break;
        case 'rage': startRage(m.secs || 45); break;
        case 'shield': raiseShield(m.need || 6); break;
        case 'ambush': startAmbush(); break;
        case 'defeat': applyDamage(S.hp + 1, null, { crit: true }); break;
        case 'reset': resetRaid(!!m.reroll); break;
        case 'demo': demo = !!m.on; break;
        case 'speed': speed = clamp(m.value, 0.25, 4); break;
        case 'join': {
            const name = m.name || pick(NAMES) + (10 + Math.floor(Math.random() * 89));
            if (!findRaider(name.toLowerCase())) addRaider({ id: name.toLowerCase(), name, cls: m.cls || pick(CLASS_KEYS), stage: 0, color: m.color ?? pick(THEME_COLORS) });
            break;
        }
    }
}
if (bus) bus.onmessage = (e) => command(e.data || {});
function postStatus() {
    bus?.postMessage({
        type: 'status', hp: S.hp, phase: PHASES[S.phase], combo: S.combo, demo, speed,
        shield: S.shield, rage: Math.ceil(S.rage),
        raiders: S.raiders.map((r) => ({ id: r.id, name: r.name, stage: r.stage, cls: r.cls })),
    });
}

// ---------------------------------------------------------------------------
// Keyboard (projector laptop)
window.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea')) return;
    const k = e.key.toLowerCase();
    if (VIEW === 'lineup') return lineupKey(k);
    const map = {
        ' ': () => command({ type: 'lab' }), q: () => command({ type: 'quiz' }), l: () => command({ type: 'lesson' }),
        j: () => command({ type: 'help' }), b: shockwave, t: () => taunt(), g: () => startRage(30), s: () => raiseShield(6),
        a: () => startAmbush(), d: () => command({ type: 'defeat' }), r: () => resetRaid(false), n: () => command({ type: 'join' }),
        p: () => { demo = !demo; hud.banner(demo ? 'DEMO ON' : 'DEMO PAUSED', '', 'info', 1.2); },
        m: toggleSound, h: () => document.getElementById('help').classList.toggle('show'),
    };
    if (map[k]) { e.preventDefault(); map[k](); }
});

const soundBtn = document.getElementById('sound');
function toggleSound() {
    if (sfx.enabled) sfx.disable(); else sfx.enable();
    soundBtn.classList.toggle('on', sfx.enabled);
    soundBtn.setAttribute('aria-pressed', String(sfx.enabled));
}
soundBtn.addEventListener('click', toggleSound);
document.getElementById('help-close').addEventListener('click', () => document.getElementById('help').classList.remove('show'));

// ---------------------------------------------------------------------------
// Lineup (design review) view
let lineupCls = 0, lineupColor = 0;
function lineupBuild() {
    for (const r of S.raiders) { scene.remove(r.bot.root); hud.removePlate(r.id); }
    S.raiders = [];
    const cls = CLASS_KEYS[lineupCls];
    const color = THEME_COLORS[lineupColor];
    const labels = document.getElementById('lineup-labels');
    labels.innerHTML = '';
    for (let s = 0; s <= 5; s++) {
        const r = makeRaider({ id: `lineup-${cls}-${color}`, name: 'lineup', cls, stage: s, color });
        r.bot.root.position.set((s - 2.5) * 2.7, 0, 0);
        S.raiders.push(r);
        const el = document.createElement('div');
        el.className = 'lineup-label';
        el.innerHTML = `<b>${STAGES[s].part}</b><span>${STAGES[s].module}</span>`;
        labels.appendChild(el);
        r.label = el;
    }
    document.getElementById('lineup-class').textContent = `${CLASSES[cls].icon} ${CLASSES[cls].label}`;
    document.getElementById('lineup-class').style.color = hex(CLASSES[cls].color);
    document.getElementById('lineup-swatch').style.background = hex(color);
}
function lineupKey(k) {
    if (k === 'c') { lineupCls = (lineupCls + 1) % CLASS_KEYS.length; lineupBuild(); }
    if (k === 'k') { lineupColor = (lineupColor + 1) % THEME_COLORS.length; lineupBuild(); }
    if (k === ' ') S.raiders.forEach((r, i) => r.bot.cheer(i * 0.1));
    if (k === 'm') toggleSound();
}

// ---------------------------------------------------------------------------
// Boot
if (VIEW === 'lineup') {
    document.body.classList.add('lineup');
    director.lineup();
    S.heal = 1;
    boss.root.visible = false;
    boss.debris.visible = false;
    env.dais.visible = false;
    lineupBuild();
} else {
    seedCohort();
    updateBossHud();
    hud.board([]);
    hud.feed('<b>Raid initialised.</b> Verified work damages the Glitch Overlord', 'info');
    const join = `${location.origin}${location.pathname.replace(/arena(\.html)?$/, '')}participant.html`;
    document.getElementById('join-url').textContent = join.replace(/^https?:\/\//, '');
    later(0.6, () => hud.banner('RAID INITIALISED', `<b>${S.raiders.length}</b> raiders connected · defeat the Glitch Overlord together`, 'phase', 3));
    later(1.6, () => taunt('Another cohort? Your code will crumble.'));
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Loop
let last = performance.now();
let simT = 0;
let boardT = 0, statusT = 0;
function frame(now) {
    requestAnimationFrame(frame);
    const raw = Math.min(0.05, (now - last) / 1000);
    last = now;
    tick(raw);
    composer.render();
}

function tick(raw) {
    let dt = raw;
    if (S.hitStop > 0) { S.hitStop -= raw; dt = raw * 0.08; }
    simT += dt;
    sharedTime.value = simT;
    for (let i = timers.length - 1; i >= 0; i--) {
        timers[i].t -= dt;
        if (timers[i].t <= 0) { const { fn } = timers[i]; timers.splice(i, 1); fn(); }
    }

    if (VIEW === 'arena') {
        demoTick(dt);
        if (S.comboT > 0) S.comboT -= dt;
        if (S.rage > 0) { S.rage = Math.max(0, S.rage - dt); hud.setRage(S.rage); }
        if (S.ambush) { S.ambush.t -= dt; if (S.ambush.t <= 0) resolveAmbush(); }
        S.heal = damp(S.heal, S.defeated ? 1 : 1 - S.hp / 100, 2, dt);
        S.gold = damp(S.gold, S.defeated ? 1 : 0, 0.8, dt);
        if (S.defeated && Math.random() < 0.9) {
            const p = new THREE.Vector3((Math.random() - 0.5) * 70, 30, (Math.random() - 0.5) * 70);
            particles.emit(p.x, p.y, p.z, 0, -6 - Math.random() * 4, 0, C(0xfbbf24, 2.2), 0.45, 4, 0, 0);
        }
        boss.update(dt, simT, S.hp / 100);
        boardT -= raw;
        if (boardT <= 0) {
            boardT = 1;
            hud.board([...S.raiders].sort((a, b) => b.xp - a.xp).slice(0, 5));
        }
    }

    for (const r of S.raiders) {
        const root = r.bot.root;
        if (VIEW === 'arena') {
            root.position.x = damp(root.position.x, r.target.x, 3, dt);
            root.position.z = damp(root.position.z, r.target.z, 3, dt);
            root.rotation.y = Math.atan2(-root.position.x, -root.position.z);
            if (r.spawnT !== undefined) {
                if (r.spawnDelay > 0) r.spawnDelay -= dt;
                else {
                    r.spawnT += dt / 0.6;
                    const k = Math.min(1, r.spawnT);
                    root.scale.setScalar(Math.max(0.0001, BOT_SCALE * (1 - Math.pow(1 - k, 3))));
                    if (k >= 1) r.spawnT = undefined;
                }
            }
        } else {
            root.rotation.y = Math.sin(simT * 0.5) * 0.6;
        }
        r.bot.update(dt, simT);
    }

    env.update(dt, simT, S.heal, S.gold, S.rage > 0 ? 1 : 0);
    projectiles.update(dt);
    waves.update(dt);
    particles.update(dt);
    director.update(dt, simT);

    S.glitch = Math.max(0, S.glitch - raw * 1.6);
    const lowHp = VIEW === 'arena' && !S.defeated ? (1 - S.hp / 100) * 0.12 : 0;
    finalPass.uniforms.uTime.value = simT;
    finalPass.uniforms.uGlitch.value = REDUCED ? 0 : Math.min(1, S.glitch + lowHp);
    bloom.strength = 0.75 + (S.defeated ? 0.25 : 0);

    hud.update(S.raiders, VIEW === 'arena');
    if (VIEW === 'lineup') {
        S.raiders.forEach((r) => {
            const p = hud.project(r.bot.root.position.clone().setY(-0.25));
            r.label.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, 0)`;
        });
    }

    statusT -= raw;
    if (statusT <= 0) { statusT = 0.5; postStatus(); }
}
requestAnimationFrame(frame);

// Test hook: advance the simulation without waiting for real frames (used for screenshots).
window.__arena = { step(seconds, dt = 1 / 30) { for (let t = 0; t < seconds; t += dt) tick(dt); }, command, state: S };
