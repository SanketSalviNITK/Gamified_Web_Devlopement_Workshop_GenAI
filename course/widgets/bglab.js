// Lesson 3.5 "Background lab": a 3D canvas added to a page lands below the content, or on top of it.
// Fix it with position: fixed, z-index: -1 and pointer-events: none, then scroll to see it stay put.
import { el } from './util.js';
import { createStage } from './stage3d.js';

const FIXES = [
    { key: 'fixed', css: 'position: fixed;\ninset: 0;', label: 'position: fixed; inset: 0', why: 'Pins the canvas to the window so it fills the screen and stays put while you scroll.' },
    { key: 'z', css: 'z-index: -1;', label: 'z-index: -1', why: 'Puts the canvas behind everything else on the page.' },
    { key: 'pe', css: 'pointer-events: none;', label: 'pointer-events: none', why: 'Lets clicks pass through the canvas to your links and buttons.' },
];

export function mount(root) {
    const on = new Set();
    const page = el('div.bg-page');
    const canvasBox = el('div.bg-canvas');
    const content = el('div.bg-content', {},
        el('header.bg-h', {}, el('h4', {}, 'Ana Rao'), el('p', {}, 'Web developer in training')),
        el('section.bg-card', {}, el('b', {}, 'About'), el('p', {}, 'I build things for the web.')),
        el('section.bg-card', {}, el('b', {}, 'Projects'), el('p', {}, 'Weather app · 3D portfolio · Chatbot')),
        el('section.bg-card', {}, el('b', {}, 'Skills'), el('p', {}, 'HTML · CSS · JavaScript · Three.js')),
        el('button.w-btn.bg-click', { type: 'button' }, 'Contact me'),
    );
    page.append(canvasBox, content);
    const clicked = el('div.s3-msg', { 'aria-live': 'polite' });
    content.querySelector('.bg-click').addEventListener('click', () => { clicked.textContent = '✓ The button received the click.'; on.add('clicked'); render(); });
    const css = el('pre.pl-prompt');
    const note = el('div.s3-msg', { 'aria-live': 'polite' });
    const buttons = el('div.sb-buttons');

    const stage = createStage(canvasBox, { height: 300, background: null, cameraZ: 5 });
    const { THREE, scene } = stage;
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const sun = new THREE.DirectionalLight(0xffffff, 2.4);
    sun.position.set(3, 3, 5);
    scene.add(sun);
    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.1, 0.35, 180, 20), new THREE.MeshStandardMaterial({ color: 0x8b5cf6, emissive: 0x3b0764, roughness: 0.3, metalness: 0.4 }));
    scene.add(knot);
    stage.onFrame((dt) => { knot.rotation.x += dt * 0.3; knot.rotation.y += dt * 0.5; });

    function render() {
        buttons.replaceChildren(...FIXES.map((f) => el('button.pl-part' + (on.has(f.key) ? '.on' : ''), {
            type: 'button', 'aria-pressed': String(on.has(f.key)),
            onclick: () => { on.has(f.key) ? on.delete(f.key) : on.add(f.key); clicked.textContent = ''; render(); },
        }, (on.has(f.key) ? '✓ ' : '+ ') + f.label)));
        page.classList.toggle('fixed', on.has('fixed'));
        page.classList.toggle('behind', on.has('z'));
        page.classList.toggle('passthrough', on.has('pe'));
        css.textContent = `canvas {\n  ${FIXES.filter((f) => on.has(f.key)).map((f) => f.css.replace(/\n/g, '\n  ')).join('\n  ') || '/* nothing yet: the canvas is just another element */'}\n}`;
        const all = on.has('fixed') && on.has('z') && on.has('pe');
        note.textContent = !on.has('fixed') ? 'The canvas sits in the normal flow, pushing your content down the page. Pin it with position: fixed.'
            : !on.has('z') ? 'Now it covers your content! Send it behind with z-index: -1.'
            : !on.has('pe') ? 'Behind the content and pinned. Scroll the page: the 3D scene stays put. (pointer-events: none keeps clicks safe too.)'
            : 'A perfect 3D background: pinned, behind, and click-through. Scroll the page and click the button.';
        if (all && on.has('clicked')) root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'background' }));
    }

    root.append(
        el('div.w-head', {}, el('span.w-tag', {}, 'Background lab'), el('span', {}, 'Make the 3D scene a background for this page.')),
        buttons,
        el('div.bg-frame', {}, page),
        note, clicked,
        el('div.w-label', {}, 'CSS'), css,
    );
    render();
    return () => stage.dispose();
}
