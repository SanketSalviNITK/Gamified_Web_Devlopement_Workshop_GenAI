// Lesson 4.1 "Inside a .glb": open the course's real robot file and look at its three parts:
// a 12-byte header, a JSON chunk that describes the scene, and a binary chunk with the raw numbers.
import { el } from './util.js';
import { createStage } from './stage3d.js';
import { avatarBytes, loadAvatar, studio, fmtBytes } from './avatar.js';

export function mount(root) {
    const bar = el('div.gi-bar', { role: 'group', 'aria-label': 'Parts of avatar.glb' });
    const detail = el('div.gi-detail', { 'aria-live': 'polite' }, 'Loading avatar.glb…');
    const view = el('div.s3-view');
    const seen = new Set();
    let disposed = false;

    const stage = createStage(view, { height: 260, cameraZ: 3.2 });
    const { THREE, scene, camera } = stage;
    studio(THREE, scene);
    camera.position.set(0, 1.1, 3.2);
    camera.lookAt(0, 0.85, 0);
    let robot = null;
    stage.onFrame((dt) => { if (robot) robot.rotation.y += dt * 0.6; });

    root.append(
        el('div.w-head', {}, el('span.w-tag', {}, 'GLB inspector'), el('span', {}, 'Open a real .glb file and see what is inside.')),
        el('div.sb-split', {}, view, el('div', {}, el('div.w-label', {}, 'avatar.glb, byte by byte'), bar, detail)),
    );

    (async () => {
        try {
            const buf = await avatarBytes();
            const gltf = await loadAvatar();
            if (disposed) return;
            robot = gltf.scene;
            scene.add(robot);
            render(buf, gltf);
        } catch (err) {
            detail.textContent = `Couldn't open avatar.glb (${err.message}).`;
        }
    })();

    function render(buf, gltf) {
        const dv = new DataView(buf);
        const magic = new TextDecoder().decode(new Uint8Array(buf, 0, 4));
        const version = dv.getUint32(4, true);
        const total = dv.getUint32(8, true);
        const jsonLen = dv.getUint32(12, true);
        const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLen)));
        const binLen = dv.getUint32(20 + jsonLen, true);
        const binStart = 28 + jsonLen;

        const parts = [
            {
                key: 'header', label: 'Header', size: 12,
                show: () => el('div', {},
                    el('p', {}, 'The first 12 bytes say what this file is.'),
                    el('pre.pl-prompt', {}, `magic   "${magic}"      ← every .glb starts with these 4 letters\nversion ${version}            ← glTF 2.0\nlength  ${total} bytes ← the whole file (${fmtBytes(total)})`)),
            },
            {
                key: 'json', label: 'JSON chunk', size: jsonLen + 8,
                show: () => {
                    const names = (arr) => (arr || []).map((x) => x.name).filter(Boolean);
                    return el('div', {},
                        el('p', {}, `${fmtBytes(jsonLen)} of plain JSON: the scene description. It's the same text a .gltf file holds.`),
                        el('pre.pl-prompt', {}, [
                            `nodes:      ${json.nodes.length}  (${names(json.nodes).slice(0, 6).join(', ')}, …)`,
                            `meshes:     ${json.meshes.length}`,
                            `materials:  ${names(json.materials).join(', ')}`,
                            `animations: ${names(json.animations).join(', ') || 'none'}`,
                            `textures:   ${(json.textures || []).length}`,
                        ].join('\n')),
                        el('p.gi-note', {}, 'GLTFLoader reads this and builds Three.js objects: gltf.scene for the model, gltf.animations for the clips.'));
                },
            },
            {
                key: 'bin', label: 'Binary chunk', size: binLen + 8,
                show: () => {
                    const floats = new Float32Array(buf.slice(binStart, binStart + 36));
                    const xyz = [0, 3, 6].map((i) => `(${[...floats.slice(i, i + 3)].map((n) => n.toFixed(3)).join(', ')})`);
                    const hex = [...new Uint8Array(buf, binStart, 24)].map((b) => b.toString(16).padStart(2, '0')).join(' ');
                    return el('div', {},
                        el('p', {}, `${fmtBytes(binLen)} of raw numbers: every corner (vertex) of every shape, plus the animation keyframes. This is why it's ${Math.round((binLen / total) * 100)}% of the file.`),
                        el('pre.pl-prompt', {}, `bytes:    ${hex} …\nas x,y,z: ${xyz.join(' ')} …`),
                        el('p.gi-note', {}, `In a .gltf this part is a separate .bin file. A .glb packs JSON + binary (+ textures) into one file: one path, one download.`));
                },
            },
        ];

        const pick = (p) => {
            seen.add(p.key);
            bar.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.k === p.key));
            detail.replaceChildren(el('div.w-label', {}, `${p.label} · ${fmtBytes(p.size)}`), p.show());
            if (seen.size === parts.length) root.dispatchEvent(new CustomEvent('widget-goal', { bubbles: true, detail: 'glb' }));
        };
        bar.replaceChildren(...parts.map((p) => el('button.gi-seg', {
            type: 'button', 'data-k': p.key, style: { flexGrow: String(Math.max(p.size / total, 0.12)) }, onclick: () => pick(p),
        }, el('b', {}, p.label), el('small', {}, fmtBytes(p.size)))));
        detail.replaceChildren(el('p', {}, `avatar.glb is ${fmtBytes(total)} with ${gltf.animations.length} animations. Click each part of the file above.`));
    }

    return () => { disposed = true; stage.dispose(); };
}
