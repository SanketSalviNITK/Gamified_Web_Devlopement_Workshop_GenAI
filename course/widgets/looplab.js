// Lesson 3.4 "Loop lab": the animation loop runs once per screen refresh. Pause it, step it frame
// by frame, and see why speed should use the time between frames (delta), not the frame count.
import { el } from './util.js';
import { createStage } from './stage3d.js';

const SCREENS = [30, 60, 120];

export function mount(root) {
    const v = { running: true, delta: false, hz: 60, speed: 1 };
    const view = el('div.s3-view');
    const ticker = el('div.lp-ticks', { 'aria-hidden': 'true' });
    const stats = el('div.s3-msg', { 'aria-live': 'polite' });
    const code = el('pre.pl-prompt');
    const seen = new Set();
    const stage = createStage(view, { height: 230, cameraZ: 5.4 });
    const { THREE, scene } = stage;
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(2, 3, 4);
    scene.add(sun);

    // Three cubes: what the same code does on a 30 Hz, 60 Hz and 120 Hz screen.
    const cubes = SCREENS.map((hz, i) => {
        const c = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshStandardMaterial({ color: [0xfacc15, 0x22d3ee, 0xec4899][i], roughness: 0.4 }));
        c.position.x = (i - 1) * 1.9;
        c.userData = { hz, acc: 0, frames: 0 };
        scene.add(c);
        return c;
    });
    const labels = el('div.lp-labels', {}, ...SCREENS.map((hz) => el('span', {}, `${hz} Hz screen`)));
    let frame = 0;
    let elapsed = 0;

    const step = (dt) => {
        elapsed += dt;
        for (const c of cubes) {
            c.userData.acc += dt;
            const every = 1 / c.userData.hz;
            while (c.userData.acc >= every) {          // one "frame" of that screen
                c.userData.acc -= every;
                c.userData.frames += 1;
                c.rotation.y += v.delta ? v.speed * every : v.speed * 0.02; // with delta: radians per second
            }
        }
        frame += 1;
        if (frame % 4 === 0) {
            ticker.append(el('i'));
            while (ticker.children.length > 60) ticker.firstChild.remove();
        }
    };
    stage.onFrame((dt) => { if (v.running) step(dt); });

    const btn = (label, fn) => el('button.w-btn.ghost', { type: 'button', onclick: fn }, label);
    const runBtn = btn('⏸ Pause loop', () => { v.running = !v.running; runBtn.textContent = v.running ? '⏸ Pause loop' : '▶ Resume loop'; seen.add('pause'); render(); });
    const stepBtn = btn('⏭ One frame', () => { v.running = false; runBtn.textContent = '▶ Resume loop'; step(1 / 60); stage.renderOnce(); seen.add('step'); render(); });
    const deltaBtn = el('button.pl-part', { type: 'button', onclick: () => { v.delta = !v.delta; cubes.forEach((c) => { c.rotation.y = 0; }); seen.add('delta'); render(); } }, 'use delta time');

    function render() {
        deltaBtn.classList.toggle('on', v.delta);
        deltaBtn.textContent = v.delta ? '✓ using delta time' : '+ use delta time';
        deltaBtn.setAttribute('aria-pressed', String(v.delta));
        const turns = cubes.map((c) => (c.rotation.y / (Math.PI * 2)).toFixed(1));
        stats.textContent = v.delta
            ? `With delta time all three cubes turn at the same speed (${v.speed.toFixed(1)} radians per second), whatever the screen.`
            : `Adding a fixed 0.02 every frame: the 120 Hz cube spins 4× faster than the 30 Hz one (turns so far: ${turns.join(' · ')}).`;
        code.textContent = v.delta
            ? `const clock = new THREE.Clock();\nfunction animate() {\n  requestAnimationFrame(animate);\n  const delta = clock.getDelta();      // seconds since last frame\n  cube.rotation.y += ${v.speed.toFixed(1)} * delta;   // radians per second\n  renderer.render(scene, camera);\n}\nanimate();`
            : `function animate() {\n  requestAnimationFrame(animate);   // run again next frame\n  cube.rotation.y += 0.02;          // per frame!\n  renderer.render(scene, camera);\n}\nanimate();`;
        if (seen.has('delta') && (seen.has('pause') || seen.has('step'))) root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'loop' }));
    }
    const timer = setInterval(render, 500);

    root.append(
        el('div.w-head', {}, el('span.w-tag', {}, 'Loop lab'), el('span', {}, 'The same code on three screens with different refresh rates.')),
        el('div.rm-actions', {}, runBtn, stepBtn, deltaBtn),
        view, labels,
        el('div.w-label', {}, 'Frames (each mark ≈ 4 frames)'), ticker,
        stats,
        el('div.w-label', {}, 'JavaScript'), code,
    );
    render();
    return () => { clearInterval(timer); stage.dispose(); };
}
