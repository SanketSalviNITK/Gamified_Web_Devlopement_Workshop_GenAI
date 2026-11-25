// Lesson 3.3 "Light lab": a realistic material needs light. Switch lights on and off, move the
// sun, and compare with a material that ignores light.
import { el } from './util.js';
import { createStage } from './stage3d.js';

export function mount(root) {
    const v = { ambient: false, sun: false, point: false, angle: 45, basic: false, emissive: 0 };
    const seen = new Set();
    const view = el('div.s3-view');
    const note = el('div.s3-msg', { 'aria-live': 'polite' });
    const code = el('pre.pl-prompt');
    const stage = createStage(view, { height: 270, cameraZ: 4.4 });
    const { THREE, scene } = stage;

    const standard = new THREE.MeshStandardMaterial({ color: 0x22d3ee, roughness: 0.35, metalness: 0.1, emissive: 0xec4899, emissiveIntensity: 0 });
    const basic = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.8, 0.27, 160, 20), standard);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.4;
    scene.add(knot, floor);
    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    const sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
    const point = new THREE.PointLight(0xec4899, 18, 8);
    point.position.set(-1.6, 0.6, 1.6);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: 0xec4899 }));
    point.add(bulb);
    stage.onFrame((dt, t) => { knot.rotation.y += dt * 0.5; point.position.x = Math.sin(t * 0.9) * 1.8; });

    const toggle = (key, label) => el('button.pl-part', { type: 'button', 'data-k': key, onclick: () => { v[key] = !v[key]; if (v[key]) seen.add(key); update(); } }, label);
    const angle = el('input', { type: 'range', min: 0, max: 180, value: v.angle, 'aria-label': 'Sun angle', oninput: (e) => { v.angle = Number(e.target.value); update(); } });
    const glow = el('input', { type: 'range', min: 0, max: 1.5, step: 0.05, value: v.emissive, 'aria-label': 'Emissive glow', oninput: (e) => { v.emissive = Number(e.target.value); if (v.emissive > 0.3) seen.add('glow'); update(); } });

    function update() {
        root.querySelectorAll('[data-k]').forEach((b) => { const on = v[b.dataset.k]; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
        ambient.parent ? (!v.ambient && scene.remove(ambient)) : (v.ambient && scene.add(ambient));
        sun.parent ? (!v.sun && scene.remove(sun)) : (v.sun && scene.add(sun));
        point.parent ? (!v.point && scene.remove(point)) : (v.point && scene.add(point));
        const a = (v.angle * Math.PI) / 180;
        sun.position.set(Math.cos(a) * 5, Math.sin(a) * 5, 3);
        knot.material = v.basic ? basic : standard;
        standard.emissiveIntensity = v.emissive;
        const lights = [v.ambient && 'ambient', v.sun && 'directional', v.point && 'point'].filter(Boolean);
        note.textContent = v.basic ? 'MeshBasicMaterial ignores every light: same flat colour whatever you switch on.'
            : !lights.length ? (v.emissive > 0 ? 'No lights, but the emissive glow makes the object give off its own colour.' : 'No lights: a MeshStandardMaterial object is pitch black. This is the #1 beginner surprise.')
            : `Lit by ${lights.join(' + ')} light. ${v.sun ? 'Move the sun to see the shading change.' : 'Add a directional "sun" for shape and shadows.'}`;
        code.textContent = [
            v.ambient && 'scene.add(new THREE.AmbientLight(0xffffff, 0.45));',
            v.sun && `const sun = new THREE.DirectionalLight(0xfff1d6, 2.6);\nsun.position.set(${sun.position.x.toFixed(1)}, ${sun.position.y.toFixed(1)}, 3);\nscene.add(sun);`,
            v.point && 'scene.add(new THREE.PointLight(0xec4899, 18, 8));',
            v.basic ? 'mesh.material = new THREE.MeshBasicMaterial({ color: 0x22d3ee });' : `material.emissiveIntensity = ${v.emissive}; // glow`,
        ].filter(Boolean).join('\n') || '// no lights yet';
        if (seen.has('ambient') && seen.has('sun') && seen.has('basic')) root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'light' }));
    }

    root.append(
        el('div.w-head', {}, el('span.w-tag', {}, 'Light lab'), el('span', {}, 'Turn on the lights, then compare with a basic material.')),
        el('div.fg-modes', {}, toggle('ambient', '💡 Ambient light'), toggle('sun', '☀️ Directional (sun)'), toggle('point', '🔴 Point light'), toggle('basic', '🎨 MeshBasicMaterial')),
        el('div.fg-controls', {}, el('label.fg-ctl', {}, el('span', {}, 'sun angle'), angle), el('label.fg-ctl', {}, el('span', {}, 'emissive glow'), glow)),
        view, note,
        el('div.w-label', {}, 'JavaScript'), code,
    );
    update();
    return () => stage.dispose();
}
