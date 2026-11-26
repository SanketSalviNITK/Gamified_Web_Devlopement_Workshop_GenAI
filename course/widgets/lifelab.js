// Lesson 4.5 "Life lab": bring the robot to life. Spin it (the Quest 4 check), make it float with
// Math.sin, turn its head toward the pointer, and play the animation clips stored in the .glb.
import { el } from './util.js';
import { createStage } from './stage3d.js';
import { loadAvatar, studio } from './avatar.js';

export function mount(root) {
    const v = { spin: false, speed: 0.6, float: false, look: false, clip: 'none' };
    const used = new Set();
    let disposed = false;
    const view = el('div.s3-view');
    const code = el('pre.pl-prompt');
    const note = el('div.s3-msg', { 'aria-live': 'polite' });
    const toggles = el('div.sb-buttons');
    const clips = el('div.sb-buttons');
    const speedOut = el('output', {}, v.speed.toFixed(1));

    const stage = createStage(view, { height: 300, cameraZ: 3.4 });
    const { THREE, scene, camera, holder } = stage;
    studio(THREE, scene);
    camera.position.set(0, 1.2, 3.4);
    camera.lookAt(0, 0.9, 0);
    let model = null, head = null, mixer = null, actions = {};
    let current = null;
    const pointer = new THREE.Vector2();
    const look = { x: 0, y: 0 };
    holder.addEventListener('pointermove', (e) => {
        const r = holder.getBoundingClientRect();
        pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    });

    stage.onFrame((dt, t) => {
        if (!model) return;
        if (v.spin) model.rotation.y += v.speed * dt;
        model.position.y = v.float ? Math.sin(t * 2) * 0.08 : 0;
        mixer?.update(dt);
        // After the mixer, so looking wins over the clips' head movement.
        if (head) {
            const k = Math.min(1, dt * 8);
            look.y += ((v.look ? pointer.x * 0.7 : 0) - look.y) * k;
            look.x += ((v.look ? -pointer.y * 0.35 : 0) - look.x) * k;
            if (v.look || Math.abs(look.y) + Math.abs(look.x) > 0.001) head.rotation.set(look.x, look.y, 0);
        }
    });

    const FEATURES = [
        { k: 'spin', label: '↻ spin' },
        { k: 'float', label: '〰 float' },
        { k: 'look', label: '👀 look at pointer' },
    ];

    function render() {
        toggles.replaceChildren(...FEATURES.map((f) => el('button.pl-part' + (v[f.k] ? '.on' : ''), {
            type: 'button', 'aria-pressed': String(v[f.k]), onclick: () => { v[f.k] = !v[f.k]; if (v[f.k]) used.add(f.k); render(); },
        }, f.label)));
        clips.replaceChildren(el('span.w-label', {}, 'gltf.animations:'), ...['none', ...Object.keys(actions)].map((c) => el('button.pl-part' + (v.clip === c ? '.on' : ''), {
            type: 'button', onclick: () => { v.clip = c; if (c !== 'none') used.add('clip'); play(); render(); },
        }, c === 'none' ? 'no clip' : `▶ ${c}`)));
        const lines = [];
        if (v.clip !== 'none') lines.push('const mixer = new THREE.AnimationMixer(model);', `mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, '${v.clip}')).play();`, '');
        if (v.look) lines.push("const head = model.getObjectByName('Head');", "addEventListener('pointermove', (e) => { pointerX = e.clientX / innerWidth * 2 - 1; });", '');
        lines.push('const clock = new THREE.Clock();', 'function animate() {', '  requestAnimationFrame(animate);', '  const delta = clock.getDelta();');
        if (v.spin) lines.push(`  model.rotation.y += ${v.speed.toFixed(1)} * delta;  // spin`);
        if (v.float) lines.push('  model.position.y = Math.sin(clock.elapsedTime * 2) * 0.08;  // float');
        if (v.look) lines.push('  head.rotation.y = pointerX * 0.7;  // look');
        if (v.clip !== 'none') lines.push('  mixer.update(delta);  // play the clip');
        if (!v.spin && !v.float && !v.look && v.clip === 'none') lines.push('  // nothing moves yet');
        lines.push('  renderer.render(scene, camera);', '}', 'animate();');
        code.textContent = lines.join('\n');
        note.textContent = !v.spin ? 'Turn on spin: the Quest 4 verifier looks for a rotation.y that changes every frame.'
            : used.size < 2 ? 'Spinning! Now add some personality: float, look at the pointer, or play a clip.'
            : 'Your robot is alive. Combine spin with a clip, then try moving your mouse over it.';
        if (v.spin && used.size >= 2) root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'life' }));
    }

    function play() {
        if (!mixer) return;
        const next = v.clip === 'none' ? null : actions[v.clip];
        if (current && current !== next) current.fadeOut(0.3);
        if (next) next.reset().fadeIn(0.3).play();
        current = next;
    }

    const speed = el('input', { type: 'range', min: 0.1, max: 3, step: 0.1, value: v.speed, 'aria-label': 'Spin speed (radians per second)',
        oninput: (e) => { v.speed = Number(e.target.value); speedOut.textContent = v.speed.toFixed(1); render(); } });

    root.append(
        el('div.w-head', {}, el('span.w-tag', {}, 'Life lab'), el('span', {}, 'Make the robot feel alive.')),
        toggles, clips,
        el('label.bm-slider', {}, el('span', {}, 'spin speed (radians per second)'), speedOut, speed),
        el('div.sb-split', {}, view, el('div', {}, el('div.w-label', {}, 'JavaScript'), code)),
        note,
    );
    render();

    loadAvatar().then((gltf) => {
        if (disposed) return;
        model = gltf.scene;
        head = model.getObjectByName('Head');
        scene.add(model);
        mixer = new THREE.AnimationMixer(model);
        for (const clip of gltf.animations) actions[clip.name] = mixer.clipAction(clip);
        render();
    }).catch((err) => { note.textContent = `Couldn't load the robot (${err.message}).`; });

    return () => { disposed = true; mixer?.stopAllAction(); stage.dispose(); };
}
