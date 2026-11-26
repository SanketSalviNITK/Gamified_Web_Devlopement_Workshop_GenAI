// Module 4: Your 3D avatar (loading a .glb model). Lesson content for learn.html.
// Blocks: text | widget | code | check (self-check, not scored) | tip | takeaways.

export default {
    m4_1: {
        id: 'm4.1',
        blocks: [
            { type: 'text', html: `
                <p>In Module 3 you built shapes from code. Characters, cars and furniture are made by artists in tools like <b>Blender</b> and saved as <b>3D model files</b>. There are many formats:</p>
                <ul>
                    <li><b>.obj</b>: old and simple. Shapes only: no animation, materials in a separate file.</li>
                    <li><b>.fbx</b>: common in games and animation software, but heavy and not built for the web.</li>
                    <li><b>.gltf</b>: "the JPEG of 3D", made for the web. A JSON file plus a separate <code>.bin</code> file and textures.</li>
                    <li><b>.glb</b>: the same glTF, packed into <b>one binary file</b>. One path, one download. This is what you'll use.</li>
                </ul>
                <p>Open a real .glb (the robot you'll use in this module) and see what's inside.</p>` },
            { type: 'widget', name: 'glbinspect', props: {} },
            { type: 'tip', html: `Where to get a model: make one in <b>Blender</b> (File → Export → glTF 2.0, format "glTF Binary (.glb)"), or download a free one from sites like <b>Sketchfab</b>, <b>Poly Pizza</b> or <b>Kenney</b>. Check the licence: many free models ask you to credit the artist (put it in your README). Keep it small: under about 5 MB loads quickly on a phone.` },
            { type: 'check', question: 'Why is .glb the best choice for your portfolio?', options: [
                { text: 'It packs the model, materials, textures and animations into one file made for the web', correct: true, why: 'One file means one path to get right and one download for the browser.' },
                { text: 'It is the only format Blender can export', why: 'Blender exports many formats (.obj, .fbx, .gltf…). .glb is simply the best one for the web.' },
                { text: 'It is a picture of the model, so it loads like an image', why: 'It is real 3D data: shapes, materials and animations, not a picture.' },
            ] },
            { type: 'takeaways', items: [
                'glTF is the web\'s 3D format; .glb is glTF in one binary file.',
                'Inside a .glb: a header, a JSON scene description and a binary chunk of numbers.',
                'Credit the artist if the licence asks, and keep the file small.',
            ] },
        ],
    },

    m4_2: {
        id: 'm4.2',
        blocks: [
            { type: 'text', html: `
                <p>Three.js reads glTF with <b>GLTFLoader</b>. It isn't part of the main <code>three</code> file: it's an <b>add-on</b>, so add a second line to your import map and import it from <code>three/addons/</code>.</p>
                <p><code>loader.load(path, onLoad, onProgress, onError)</code> downloads the file <b>in the background</b> and calls your functions when something happens. The model arrives in <code>onLoad</code> as <code>gltf.scene</code>.</p>` },
            { type: 'code', caption: 'index.html: the import map now has two entries', code: `<script type="importmap">
{ "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
} }
</script>` },
            { type: 'widget', name: 'loaderlab', props: {} },
            { type: 'tip', html: `Code after <code>loader.load()</code> runs <b>immediately</b>, before the model has arrived. So <code>model</code> is still <code>undefined</code> there. Either do your work inside <code>onLoad</code>, or check <code>if (model)</code> in your animation loop. Got an old tutorial with <code>new THREE.GLTFLoader()</code>? That's the pre-2023 style; use the import above instead.` },
            { type: 'check', question: 'Your model loads (no errors), but nothing appears. Which line is most likely wrong?', options: [
                { text: 'scene.add(gltf), which should be scene.add(gltf.scene)', correct: true, why: 'gltf is a plain object holding the results. The 3D model you add is gltf.scene.' },
                { text: 'import { GLTFLoader } from \'three/addons/loaders/GLTFLoader.js\'', why: 'If the import were wrong, you\'d get an error and nothing would load.' },
                { text: 'renderer.render(scene, camera)', why: 'Rendering is fine if the rest of your scene shows. The model never made it into the scene.' },
            ] },
            { type: 'takeaways', items: [
                'GLTFLoader is an add-on: import it from three/addons/loaders/GLTFLoader.js.',
                'The model is gltf.scene; clips are in gltf.animations.',
                'Loading is asynchronous: use the model inside onLoad (or after if (model)).',
            ] },
        ],
    },

    m4_3: {
        id: 'm4.3',
        blocks: [
            { type: 'text', html: `
                <p>"It works on my laptop but not online" is almost always a <b>path</b> problem. Three rules:</p>
                <ol>
                    <li>Paths in <code>loader.load()</code> are relative to the <b>page</b> (<code>index.html</code>), not to the .js file they're written in.</li>
                    <li><b>Capitals matter</b> on GitHub Pages. <code>Robot.glb</code> and <code>robot.glb</code> are different files online, even though Windows treats them as the same.</li>
                    <li><b>No leading slash.</b> Your GitHub Pages site lives in a folder (<code>/my-portfolio/</code>), so <code>/assets/…</code> points outside it.</li>
                </ol>` },
            { type: 'widget', name: 'pathlab', props: {} },
            { type: 'tip', html: `Your model won't load from a double-clicked <code>index.html</code> (a <code>file://</code> address): browsers block it for security. In VS Code, right-click <code>index.html</code> → <b>Open with Live Server</b>. Something still wrong? Open DevTools (F12) → <b>Network</b> tab, reload, and look for the red <b>404</b> line: it shows exactly which URL the browser tried.` },
            { type: 'check', question: 'Your code is in js/bg.js and the model is assets/robot.glb. Which path works?', options: [
                { text: "loader.load('assets/robot.glb', …)", correct: true, why: 'Paths are relative to index.html, which sits next to the assets folder.' },
                { text: "loader.load('../assets/robot.glb', …)", why: 'That would be right if paths were relative to bg.js, but they are relative to the page.' },
                { text: "loader.load('C:/Users/me/portfolio/assets/robot.glb', …)", why: 'That\'s a path on your computer. Visitors\' browsers can\'t reach your hard drive.' },
            ] },
            { type: 'takeaways', items: [
                'Paths are relative to index.html. No leading slash, no C:\\ paths.',
                'Match capitals exactly: GitHub Pages is case-sensitive.',
                'Test with Live Server, and check DevTools → Network for 404s.',
                'Commit the .glb file itself: the Quest 4 verifier checks it\'s in your repo at that path.',
            ] },
        ],
    },

    m4_4: {
        id: 'm4.4',
        blocks: [
            { type: 'text', html: `
                <p>Every object in Three.js, including <code>gltf.scene</code>, has three properties that place it in the world:</p>
                <ul>
                    <li><code>position</code>: where it is, in scene units (think metres). <b>x</b> is left/right, <b>y</b> is up/down, <b>z</b> is towards/away from you.</li>
                    <li><code>scale</code>: how big it is. <code>1</code> is the size the artist made it; <code>scale.setScalar(2)</code> doubles it in every direction.</li>
                    <li><code>rotation</code>: how it's turned, in <b>radians</b>. Spinning around <b>y</b> turns it like a person on a swivel chair.</li>
                </ul>
                <p>The arrows on the robot show its own axes: <span style="color:#f87171">red = x</span>, <span style="color:#4ade80">green = y</span>, <span style="color:#60a5fa">blue = z</span>. Match the glowing ghost.</p>` },
            { type: 'widget', name: 'transformlab', props: {} },
            { type: 'code', caption: 'A model that\'s far too big or too small? Measure it, then scale it to the height you want', code: `const box = new THREE.Box3().setFromObject(model);
const size = box.getSize(new THREE.Vector3());   // width, height, depth
model.scale.setScalar(2 / size.y);              // make it 2 units tall` },
            { type: 'check', question: 'You want your model twice as big and facing the other way. Which code does that?', options: [
                { text: 'model.scale.setScalar(2); model.rotation.y = Math.PI;', correct: true, why: 'Scale 2 doubles the size, and π radians (180°) turns it around.' },
                { text: 'model.scale.setScalar(2); model.rotation.y = 180;', why: 'Rotation is in radians: 180 radians is about 28 full turns. Use Math.PI (or degToRad(180)).' },
                { text: 'model.position.set(2, 2, 2); model.rotation.y = Math.PI;', why: 'Position moves the model; it doesn\'t change its size.' },
            ] },
            { type: 'takeaways', items: [
                'position moves, scale resizes, rotation turns (in radians).',
                'scale.setScalar(n) scales evenly; THREE.MathUtils.degToRad() converts degrees.',
                'Measure a model with Box3 to fix one that is huge or tiny.',
            ] },
        ],
    },

    m4_5: {
        id: 'm4.5',
        blocks: [
            { type: 'text', html: `
                <p>A static model looks like a statue. Bring it to life in your animation loop:</p>
                <ul>
                    <li><b>Spin</b>: add a little to <code>model.rotation.y</code> every frame (multiplied by delta time, from Module 3). This is what the Quest 4 verifier checks.</li>
                    <li><b>Float</b>: set <code>position.y</code> to <code>Math.sin(time)</code>, which smoothly goes up and down.</li>
                    <li><b>Animation clips</b>: many models come with animations made by the artist (walk, wave, idle). An <code>AnimationMixer</code> plays them; call <code>mixer.update(delta)</code> every frame.</li>
                </ul>` },
            { type: 'widget', name: 'lifelab', props: {} },
            { type: 'code', caption: 'bg.js for Quest 4: load the avatar and spin it', code: `import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ...scene, camera, renderer and lights from Module 3...

let model;
new GLTFLoader().load('assets/avatar.glb', (gltf) => {
  model = gltf.scene;
  model.scale.setScalar(1.5);
  scene.add(model);
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (model) model.rotation.y += 0.6 * delta;   // spin on the Y axis
  renderer.render(scene, camera);
}
animate();` },
            { type: 'text', html: `<p><b>Before you push:</b> paste your <code>index.html</code> and <code>bg.js</code>, and list your model file (for example <code>assets/avatar.glb</code>) to run the Quest 4 checks.</p>` },
            { type: 'widget', name: 'preflight', props: { quest: 4, js: 'bg.js', assets: true } },
            { type: 'check', question: 'You start an AnimationMixer and call play() on a clip, but the model stands still. What\'s missing?', options: [
                { text: 'mixer.update(delta) inside the animation loop', correct: true, why: 'The mixer only moves the clip forward when you update it, every frame.' },
                { text: 'A second GLTFLoader', why: 'One loader is enough; the clips are already in gltf.animations.' },
                { text: 'model.rotation.y += 0.01', why: 'That spins the whole model, but the clip still won\'t play without mixer.update().' },
            ] },
            { type: 'takeaways', items: [
                'Spin: rotation.y += speed * delta inside the loop (guarded by if (model)).',
                'Float with Math.sin(time); play the artist\'s clips with an AnimationMixer.',
                'Commit the .glb, push, then submit Quest 4.',
            ] },
        ],
    },
};
