// Lesson 3.2 "Mesh lab": a mesh is a geometry (shape) plus a material (surface). Pick both, change
// the colour and see the matching code.
import { el } from './util.js';
import { createStage } from './stage3d.js';

const GEOMETRIES = {
    BoxGeometry: { make: (T) => new T.BoxGeometry(1.4, 1.4, 1.4), args: '1.4, 1.4, 1.4' },
    SphereGeometry: { make: (T) => new T.SphereGeometry(1, 40, 24), args: '1, 40, 24' },
    TorusKnotGeometry: { make: (T) => new T.TorusKnotGeometry(0.75, 0.25, 160, 20), args: '0.75, 0.25, 160, 20' },
    IcosahedronGeometry: { make: (T) => new T.IcosahedronGeometry(1.1, 0), args: '1.1, 0' },
    ConeGeometry: { make: (T) => new T.ConeGeometry(0.9, 1.7, 32), args: '0.9, 1.7, 32' },
};
const MATERIALS = {
    MeshStandardMaterial: 'reacts to light: shiny or matte, realistic',
    MeshBasicMaterial: 'ignores light: one flat colour',
    MeshNormalMaterial: 'colours each face by its direction (handy for testing)',
};

export function mount(root) {
    const v = { geo: 'TorusKnotGeometry', mat: 'MeshStandardMaterial', color: '#8b5cf6', wire: false, rough: 0.35, metal: 0.2 };
    const view = el('div.s3-view');
    const code = el('pre.pl-prompt');
    const note = el('div.s3-msg', { 'aria-live': 'polite' });
    const tried = new Set();
    const stage = createStage(view, { height: 260, cameraZ: 4 });
    const { THREE, scene } = stage;
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(3, 4, 5);
    scene.add(sun);
    let mesh = null;

    const select = (label, options, key) => el('label.fg-ctl', {}, el('span', {}, label),
        el('select', { 'aria-label': label, onchange: (e) => { v[key] = e.target.value; tried.add(`${key}:${v[key]}`); build(); } },
            ...options.map((o) => el('option', { value: o, selected: o === v[key] }, o))));
    const colour = el('input', { type: 'color', value: v.color, 'aria-label': 'Colour', oninput: (e) => { v.color = e.target.value; build(); } });
    const wire = el('label.bm-toggle', {}, el('input', { type: 'checkbox', onchange: (e) => { v.wire = e.target.checked; tried.add('wire'); build(); } }), ' wireframe');

    function build() {
        if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); }
        const geometry = GEOMETRIES[v.geo].make(THREE);
        const params = { wireframe: v.wire };
        if (v.mat !== 'MeshNormalMaterial') params.color = new THREE.Color(v.color);
        if (v.mat === 'MeshStandardMaterial') Object.assign(params, { roughness: v.rough, metalness: v.metal });
        const material = new THREE[v.mat](params);
        mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.set(0.4, 0.5, 0);
        scene.add(mesh);
        const matArgs = v.mat === 'MeshNormalMaterial' ? (v.wire ? '{ wireframe: true }' : '') : `{ color: '${v.color}'${v.wire ? ', wireframe: true' : ''} }`;
        code.textContent = `const geometry = new THREE.${v.geo}(${GEOMETRIES[v.geo].args});\nconst material = new THREE.${v.mat}(${matArgs});\nconst mesh = new THREE.Mesh(geometry, material);\nscene.add(mesh);`;
        note.textContent = `${v.geo.replace('Geometry', '')} shape · ${v.mat}: ${MATERIALS[v.mat]}.`;
        if ([...tried].some((t) => t.startsWith('geo:')) && [...tried].some((t) => t.startsWith('mat:') || t === 'wire')) {
            root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'mesh' }));
        }
    }
    stage.onFrame((dt) => { if (mesh) { mesh.rotation.y += dt * 0.7; mesh.rotation.x += dt * 0.2; } });

    root.append(
        el('div.w-head', {}, el('span.w-tag', {}, 'Mesh lab'), el('span', {}, 'Mesh = geometry (shape) + material (surface).')),
        el('div.fg-controls', {}, select('geometry', Object.keys(GEOMETRIES), 'geo'), select('material', Object.keys(MATERIALS), 'mat'),
            el('label.fg-ctl', {}, el('span', {}, 'colour'), colour), wire),
        el('div.sb-split', {}, view, el('div', {}, el('div.w-label', {}, 'JavaScript'), code)),
        note,
    );
    build();
    return () => stage.dispose();
}
