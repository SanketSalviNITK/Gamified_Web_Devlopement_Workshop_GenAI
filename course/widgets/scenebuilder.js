// Lesson 3.1 "Scene builder": add the scene, camera and renderer one at a time and see why each
// is needed, then move the camera to understand what it sees.
import { el } from './util.js';
import { createStage } from './stage3d.js';

const PIECES = [
    { key: 'scene', label: 'Scene', code: 'const scene = new THREE.Scene();', why: 'The scene is the world that holds every object, light and camera.' },
    { key: 'camera', label: 'Camera', code: 'const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);\ncamera.position.z = 4;', why: 'The camera is your eye in that world: it decides what part of the scene you see.' },
    { key: 'renderer', label: 'Renderer', code: 'const renderer = new THREE.WebGLRenderer();\ndocument.body.appendChild(renderer.domElement);', why: 'The renderer draws what the camera sees onto a <canvas> on your page.' },
    { key: 'mesh', label: 'A cube', code: 'scene.add(new THREE.Mesh(\n  new THREE.BoxGeometry(),\n  new THREE.MeshNormalMaterial()));', why: 'Something to look at. You’ll build your own in the next lesson.' },
];

export function mount(root) {
    const on = new Set();
    const toggles = el('div.sb-buttons');
    const code = el('pre.sb-code');
    const view = el('div.s3-view');
    const msg = el('div.s3-msg', { 'aria-live': 'polite' });
    const camRow = el('div.s3-cam');
    const stage = createStage(view, { height: 260, cameraZ: 4 });
    const { THREE, scene, camera } = stage;
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshNormalMaterial());
    cube.rotation.set(0.5, 0.6, 0);
    stage.onFrame((dt) => { cube.rotation.y += dt * 0.6; });

    const slider = (label, min, max, step, get, set, fmt) => {
        const out = el('output', {}, fmt(get()));
        const input = el('input', { type: 'range', min, max, step, value: get(), 'aria-label': label });
        input.addEventListener('input', () => { set(Number(input.value)); out.textContent = fmt(get()); camera.updateProjectionMatrix(); render(); });
        return el('label.bm-slider', {}, el('span', {}, label), input, out);
    };
    camRow.append(
        slider('camera distance (position.z)', 1.5, 12, 0.1, () => camera.position.z, (v) => { camera.position.z = v; }, (v) => v.toFixed(1)),
        slider('field of view (fov)', 20, 110, 1, () => camera.fov, (v) => { camera.fov = v; }, (v) => `${v}°`),
    );

    function render() {
        toggles.replaceChildren(...PIECES.map((p) => el('button.pl-part' + (on.has(p.key) ? '.on' : ''), {
            type: 'button', 'aria-pressed': String(on.has(p.key)),
            onclick: () => { on.has(p.key) ? on.delete(p.key) : on.add(p.key); render(); },
        }, (on.has(p.key) ? '✓ ' : '+ ') + p.label)));
        code.textContent = PIECES.filter((p) => on.has(p.key)).map((p) => p.code).join('\n\n') || '// add the pieces of a Three.js scene';
        if (on.has('mesh') && on.has('scene')) scene.add(cube); else scene.remove(cube);
        const ready = on.has('scene') && on.has('camera') && on.has('renderer');
        stage.renderer.domElement.style.visibility = on.has('renderer') ? 'visible' : 'hidden';
        stage.setRunning(ready);
        view.dataset.state = !on.has('renderer') ? 'nocanvas' : !ready ? 'blank' : 'live';
        camRow.hidden = !(ready && on.has('mesh'));
        const missing = ['scene', 'camera', 'renderer'].filter((k) => !on.has(k));
        msg.textContent = !on.has('renderer') ? 'No renderer: nothing is drawn, there is no <canvas> on the page.'
            : missing.length ? `The canvas is there but stays empty: missing ${missing.join(' and ')}.`
            : !on.has('mesh') ? 'Scene, camera and renderer work, but the world is empty. Add a cube!'
            : 'Everything is in place. Move the camera with the sliders.';
        const last = [...on].pop();
        if (last) msg.textContent += ` ${PIECES.find((p) => p.key === last).why}`;
        if (ready && on.has('mesh')) root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'scene' }));
    }

    root.append(
        el('div.w-head', {}, el('span.w-tag', {}, 'Scene builder'), el('span', {}, 'Add the pieces of a 3D scene one at a time.')),
        toggles,
        el('div.sb-split', {}, el('div', {}, el('div.w-label', {}, 'JavaScript'), code), el('div', {}, el('div.w-label', {}, 'Canvas'), view)),
        msg, camRow,
    );
    render();
    return () => stage.dispose();
}
