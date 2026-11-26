// Lesson 4.4 "Chassis sync": move, scale and turn the robot until it matches the glowing ghost.
// Position is in metres (scene units), scale multiplies the size, rotation is in radians.
import { el } from './util.js';
import { createStage } from './stage3d.js';
import { loadAvatar, studio } from './avatar.js';

const TARGETS = [
    { x: 1.5, y: 0, z: 0, s: 0.8, deg: 45 },
    { x: -1.2, y: 0.5, z: -1, s: 1.3, deg: -90 },
    { x: 0, y: 0, z: 1, s: 0.5, deg: 180 },
];
const SLIDERS = [
    { k: 'x', label: 'position.x', min: -3, max: 3, step: 0.1 },
    { k: 'y', label: 'position.y', min: -1, max: 2, step: 0.1 },
    { k: 'z', label: 'position.z', min: -3, max: 2, step: 0.1 },
    { k: 's', label: 'scale', min: 0.2, max: 2.5, step: 0.05 },
    { k: 'deg', label: 'rotation.y (degrees)', min: -180, max: 180, step: 5 },
];

export function mount(root) {
    const v = { x: 0, y: 0, z: 0, s: 1, deg: 0 };
    let t = 0;
    let synced = false;
    let disposed = false;
    const view = el('div.s3-view');
    const code = el('pre.pl-prompt');
    const note = el('div.s3-msg', { 'aria-live': 'polite' });
    const next = el('button.w-btn.ghost', { type: 'button', hidden: true, onclick: () => { t = (t + 1) % TARGETS.length; synced = false; place(); update(); } }, 'Next target →');
    const outputs = {};
    const inputs = {};

    const stage = createStage(view, { height: 300, cameraZ: 6 });
    const { THREE, scene, camera } = stage;
    studio(THREE, scene);
    camera.position.set(0, 2.2, 6);
    camera.lookAt(0, 0.8, 0);
    let model = null, ghost = null, height = 1.8;

    const controls = el('div.bm-controls', {}, ...SLIDERS.map((s) => {
        outputs[s.k] = el('output');
        inputs[s.k] = el('input', { type: 'range', min: s.min, max: s.max, step: s.step, value: v[s.k], 'aria-label': s.label,
            oninput: (e) => { v[s.k] = Number(e.target.value); update(); } });
        return el('label.bm-slider', {}, el('span', {}, s.label), outputs[s.k], inputs[s.k]);
    }));

    function place() {
        if (!ghost) return;
        const g = TARGETS[t];
        ghost.position.set(g.x, g.y, g.z);
        ghost.scale.setScalar(g.s);
        ghost.rotation.y = THREE.MathUtils.degToRad(g.deg);
    }

    function update() {
        for (const s of SLIDERS) outputs[s.k].textContent = s.k === 'deg' ? `${v.deg}°` : v[s.k].toFixed(s.step < 0.1 ? 2 : 1);
        const rad = THREE.MathUtils.degToRad(v.deg);
        if (model) {
            model.position.set(v.x, v.y, v.z);
            model.scale.setScalar(v.s);
            model.rotation.y = rad;
        }
        code.textContent = `model.position.set(${v.x.toFixed(1)}, ${v.y.toFixed(1)}, ${v.z.toFixed(1)});\nmodel.scale.setScalar(${v.s.toFixed(2)});   // same as scale.set(${v.s.toFixed(2)}, ${v.s.toFixed(2)}, ${v.s.toFixed(2)})\nmodel.rotation.y = THREE.MathUtils.degToRad(${v.deg});  // ${rad.toFixed(2)} radians`;
        const g = TARGETS[t];
        const off = [];
        if (Math.hypot(v.x - g.x, v.y - g.y, v.z - g.z) > 0.15) off.push('position');
        if (Math.abs(v.s - g.s) > 0.08) off.push('scale');
        const dDeg = Math.abs(((v.deg - g.deg + 540) % 360) - 180);
        if (dDeg > 8) off.push('rotation');
        const tall = (height * v.s).toFixed(2);
        if (!off.length) {
            note.textContent = `✓ Synced with the ghost! Your robot is ${tall} m tall here.`;
            next.hidden = false;
            if (!synced) { synced = true; root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'transform' })); }
        } else {
            next.hidden = true;
            note.textContent = `Match the ghost (target ${t + 1} of ${TARGETS.length}). Still off: ${off.join(', ')}. Robot height: ${tall} m.`;
        }
    }

    root.append(
        el('div.w-head', {}, el('span.w-tag', {}, 'Chassis sync'), el('span', {}, 'Move, scale and turn the robot into the ghost.')),
        el('div.bm-grid', {}, controls, view),
        note,
        el('div.pf-row', {}, next),
        el('div.w-label', {}, 'JavaScript'), code,
    );
    update();

    loadAvatar().then((gltf) => {
        if (disposed) return;
        model = gltf.scene;
        model.add(new THREE.AxesHelper(0.6));
        scene.add(model);
        const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
        height = size.y;
        ghost = model.clone();
        const ghostMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true, transparent: true, opacity: 0.4 });
        ghost.traverse((o) => { if (o.isMesh) o.material = ghostMat; if (o.isAxesHelper) o.visible = false; });
        scene.add(ghost);
        place();
        update();
    }).catch((err) => { note.textContent = `Couldn't load the robot (${err.message}).`; });

    return () => { disposed = true; stage.dispose(); };
}
