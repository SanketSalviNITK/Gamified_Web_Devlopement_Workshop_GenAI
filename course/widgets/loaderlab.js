// Lesson 4.2 "Loader lab": run a real GLTFLoader.load() on the course robot and watch the
// callbacks fire. Try the classic mistakes: adding gltf instead of gltf.scene, forgetting
// scene.add, no lights, and using the model before it has finished loading.
import { el } from './util.js';
import { createStage } from './stage3d.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AVATAR_URL, fmtBytes } from './avatar.js';

const ADD = {
    scene: { label: 'scene.add(gltf.scene)', code: 'scene.add(gltf.scene);' },
    gltf: { label: 'scene.add(gltf)', code: 'scene.add(gltf);          // ✗ gltf is not a 3D object' },
    none: { label: 'forget scene.add', code: '// (nothing added to the scene)' },
};

export function mount(root) {
    const v = { add: 'gltf', lights: true, early: false };
    const view = el('div.s3-view');
    const code = el('pre.pl-prompt');
    const log = el('ol.ll-log', { 'aria-live': 'polite' });
    const note = el('div.s3-msg', { 'aria-live': 'polite' });
    const run = el('button.w-btn', { type: 'button' }, '▶ Run loader.load()');
    const tried = new Set();

    const stage = createStage(view, { height: 260, cameraZ: 3.2 });
    const { THREE, scene, camera } = stage;
    camera.position.set(0, 1.1, 3.2);
    camera.lookAt(0, 0.85, 0);
    const lights = new THREE.Group();
    lights.add(new THREE.HemisphereLight(0xdbeafe, 0x1e1b4b, 1.2));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(2.5, 4, 3);
    lights.add(key);
    scene.add(lights);
    let model = null;
    stage.onFrame((dt) => { if (model) model.rotation.y += dt * 0.6; });

    const choice = (key, label) => el('div.sb-buttons', {}, el('span.w-label', {}, label),
        ...Object.entries(ADD).map(([k, a]) => el('button.pl-part' + (v[key] === k ? '.on' : ''), {
            type: 'button', 'data-k': k, onclick: () => { v[key] = k; refresh(); },
        }, a.label)));
    const addRow = el('div');
    const lightsBox = el('input', { type: 'checkbox', checked: true, onchange: (e) => { v.lights = e.target.checked; refresh(); } });
    const earlyBox = el('input', { type: 'checkbox', onchange: (e) => { v.early = e.target.checked; refresh(); } });

    function refresh() {
        addRow.replaceChildren(choice('add', 'In onLoad:'));
        lights.visible = v.lights;
        code.textContent = [
            "import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';",
            v.lights ? 'scene.add(new THREE.HemisphereLight(0xffffff, 0x222244, 1.2));' : '// no lights',
            'let model;',
            'const loader = new GLTFLoader();',
            "loader.load('assets/avatar.glb',",
            '  (gltf) => {                                 // onLoad',
            '    model = gltf.scene;',
            `    ${ADD[v.add].code}`,
            '  },',
            "  (xhr) => console.log(xhr.loaded, 'bytes'), // onProgress",
            '  (error) => console.error(error),            // onError',
            ');',
            v.early ? 'model.rotation.y = Math.PI;                   // ✗ runs before loading finishes' : '',
        ].filter(Boolean).join('\n');
    }

    const line = (text, kind = '') => { log.append(el('li' + (kind ? `.${kind}` : ''), {}, text)); log.scrollTop = log.scrollHeight; };

    run.addEventListener('click', () => {
        run.disabled = true;
        log.replaceChildren();
        if (model) { scene.remove(model); model = null; }
        note.textContent = '';
        const t0 = performance.now();
        const ms = () => `${Math.round(performance.now() - t0)} ms`;
        line("loader.load('assets/avatar.glb', …) called: the download starts in the background");
        if (v.early) line("TypeError: Cannot read properties of undefined (reading 'rotation')", 'bad');
        let lastPct = -1;
        new GLTFLoader().load(AVATAR_URL, (gltf) => {
            line(`${ms()} onLoad: gltf = { scene: Group "${gltf.scene.name}", animations: [${gltf.animations.map((a) => a.name).join(', ')}], … }`, 'good');
            let outcome;
            if (v.add === 'gltf') {
                line('THREE.Object3D.add: object not an instance of THREE.Object3D.', 'bad');
                outcome = 'Nothing appears: gltf is a plain object holding the results. The 3D model is gltf.scene.';
            } else if (v.add === 'none') {
                outcome = 'The model loaded fine, but it was never added to the scene, so nothing is drawn.';
            } else {
                model = gltf.scene;
                scene.add(model);
                outcome = v.lights
                    ? 'The robot is in the scene and lit.'
                    : 'There it is… as a black silhouette. Its materials are MeshStandardMaterial, so it needs lights.';
            }
            if (v.early) outcome += ' The error came first: code after loader.load() runs immediately, before onLoad. Use the model inside onLoad, or check if (model) in your animation loop.';
            note.textContent = outcome;
            tried.add(`${v.add}:${v.lights}:${v.early}`);
            const ok = v.add === 'scene' && v.lights && !v.early;
            if (ok && tried.size >= 2) root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'loader' }));
            else if (ok) note.textContent += ' Now try one of the mistakes to see what it looks like.';
            run.disabled = false;
        }, (xhr) => {
            const pct = xhr.total ? Math.round((xhr.loaded / xhr.total) * 100) : 100;
            if (pct !== lastPct) { lastPct = pct; line(`${ms()} onProgress: ${fmtBytes(xhr.loaded)}${xhr.total ? ` of ${fmtBytes(xhr.total)} (${pct}%)` : ''}`); }
        }, (err) => {
            line(`onError: ${err.message || err}`, 'bad');
            run.disabled = false;
        });
    });

    root.append(
        el('div.w-head', {}, el('span.w-tag', {}, 'Loader lab'), el('span', {}, 'Run a real GLTFLoader and watch the callbacks.')),
        addRow,
        el('div.fg-controls', {},
            el('label.bm-toggle', {}, lightsBox, ' lights in the scene'),
            el('label.bm-toggle', {}, earlyBox, ' use model right after load()'),
            run),
        el('div.sb-split', {}, view, el('div', {}, el('div.w-label', {}, 'JavaScript'), code)),
        el('div.w-label', {}, 'Console'), log,
        note,
    );
    refresh();
    return () => stage.dispose();
}
