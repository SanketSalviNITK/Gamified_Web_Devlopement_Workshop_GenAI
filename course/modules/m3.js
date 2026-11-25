// Module 3: 3D on the web (Three.js). Lesson content for learn.html.
// Blocks: text | widget | code | check (self-check, not scored) | tip | takeaways.

export default {
    m3_1: {
        id: 'm3.1',
        blocks: [
            { type: 'text', html: `
                <p><b>Three.js</b> is a JavaScript library that draws 3D graphics in the browser using WebGL, the graphics chip in every computer and phone. Every Three.js project starts with the same three pieces:</p>
                <ul>
                    <li>a <b>scene</b>: the 3D world that holds your objects and lights,</li>
                    <li>a <b>camera</b>: the eye that looks into that world,</li>
                    <li>a <b>renderer</b>: draws what the camera sees onto a <code>&lt;canvas&gt;</code> element on your page.</li>
                </ul>
                <p>Add them one at a time and watch what each one does.</p>` },
            { type: 'widget', name: 'scenebuilder', props: {} },
            { type: 'code', caption: 'Loading Three.js and setting up the three pieces', code: `<script type="importmap">
{ "imports": { "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js" } }
</script>
<script type="module" src="bg.js"></script>

// bg.js
import * as THREE from 'three';
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.z = 4;
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);` },
            { type: 'tip', html: `<code>PerspectiveCamera(fov, aspect, near, far)</code>: <b>fov</b> is how wide the camera sees in degrees, <b>aspect</b> is width ÷ height of the canvas, and objects closer than <b>near</b> or further than <b>far</b> aren't drawn. Objects start at the centre (0, 0, 0), so move the camera back along z to see them.` },
            { type: 'check', question: 'You created a scene and a camera and added a cube, but the page is empty. What’s most likely missing?', options: [
                { text: 'The renderer, and calling renderer.render(scene, camera)', correct: true, why: 'Without a renderer nothing is drawn onto the page. It needs a canvas and a render call.' },
                { text: 'A second camera', why: 'One camera is enough. Something has to draw what it sees.' },
                { text: 'A bigger cube', why: 'Size isn’t the issue when nothing at all is drawn.' },
            ] },
            { type: 'takeaways', items: [
                'Scene = the world, camera = the eye, renderer = draws onto a canvas.',
                'Objects start at (0, 0, 0); move the camera back on z to see them.',
                'The Quest 3 verifier looks for a Scene, a camera and a WebGLRenderer.',
            ] },
        ],
    },

    m3_2: {
        id: 'm3.2',
        blocks: [
            { type: 'text', html: `
                <p>A visible 3D object is a <b>mesh</b>, made from two things:</p>
                <ul>
                    <li>a <b>geometry</b>: the shape (box, sphere, torus knot…), described by points in 3D,</li>
                    <li>a <b>material</b>: the surface (colour, shininess, roughness).</li>
                </ul>
                <p>Create the mesh, then <code>scene.add(mesh)</code>: an object that isn't added to the scene is never drawn.</p>` },
            { type: 'widget', name: 'meshlab', props: {} },
            { type: 'tip', html: `Three.js has dozens of geometries. For a portfolio background, <code>TorusKnotGeometry</code> and <code>IcosahedronGeometry</code> look great; add <code>wireframe: true</code> to the material for a sci-fi feel.` },
            { type: 'check', question: 'Which two things does every mesh need?', options: [
                { text: 'A geometry (shape) and a material (surface)', correct: true, why: 'new THREE.Mesh(geometry, material): the shape plus how it looks.' },
                { text: 'A camera and a light', why: 'Those belong to the scene. The mesh itself is shape + surface.' },
                { text: 'A colour and a canvas', why: 'Colour is part of the material, and the canvas belongs to the renderer.' },
            ] },
            { type: 'takeaways', items: [
                'Mesh = geometry (shape) + material (surface).',
                'Remember scene.add(mesh), or it won’t appear.',
                'The Quest 3 verifier looks for a Mesh made from a Geometry.',
            ] },
        ],
    },

    m3_3: {
        id: 'm3.3',
        blocks: [
            { type: 'text', html: `
                <p>Realistic materials like <code>MeshStandardMaterial</code> show colour only where <b>light</b> hits them. With no lights, they are pitch black, which is the most common "my 3D scene is broken!" moment.</p>
                <ul>
                    <li><b>AmbientLight</b> lights everything evenly, from everywhere. No shading.</li>
                    <li><b>DirectionalLight</b> is like the sun: parallel rays from one direction, which give shape and shading.</li>
                    <li><b>PointLight</b> is like a bulb: shines in all directions from one point and fades with distance.</li>
                </ul>
                <p><code>MeshBasicMaterial</code> ignores light completely: one flat colour, always visible.</p>` },
            { type: 'widget', name: 'lightlab', props: {} },
            { type: 'tip', html: `A good default: a soft <code>AmbientLight</code> so nothing is fully black, plus one <code>DirectionalLight</code> for shape. Want a glowing object for a dark portfolio? Set the material's <code>emissive</code> colour.` },
            { type: 'check', question: 'Your MeshStandardMaterial torus knot is completely black. What’s the fix?', options: [
                { text: 'Add lights, e.g. an AmbientLight and a DirectionalLight', correct: true, why: 'Standard materials need light to show colour. No light, no colour.' },
                { text: 'Change the colour to white', why: 'Even a white surface is black when no light reaches it.' },
                { text: 'Move the camera further away', why: 'Distance doesn’t add light. The object needs to be lit.' },
            ] },
            { type: 'takeaways', items: [
                'Standard materials need light; Basic materials ignore it.',
                'Ambient = even fill, Directional = sun, Point = bulb.',
                'Ambient + one directional light is a solid default.',
            ] },
        ],
    },

    m3_4: {
        id: 'm3.4',
        blocks: [
            { type: 'text', html: `
                <p>Calling <code>renderer.render(scene, camera)</code> once draws a single still picture. To animate, you change something a little and render again, many times per second. <code>requestAnimationFrame(animate)</code> asks the browser to call your function again just before the next screen refresh: that's the <b>animation loop</b>.</p>
                <p>Rotation in Three.js is measured in <b>radians</b>: a full turn is <code>Math.PI * 2</code> (about 6.28).</p>` },
            { type: 'widget', name: 'looplab', props: {} },
            { type: 'tip', html: `<code>renderer.setAnimationLoop(animate)</code> does the same job as calling <code>requestAnimationFrame</code> yourself; either one passes the Quest 3 "animated" check, along with a rotation that changes.` },
            { type: 'check', question: 'Your cube spins twice as fast on a friend’s gaming laptop. Why?', options: [
                { text: 'Their screen refreshes more often, and you add a fixed amount every frame', correct: true, why: 'More frames per second means more additions per second. Multiply by delta time to fix it.' },
                { text: 'Their laptop has a faster internet connection', why: 'The animation runs locally; the network doesn’t affect its speed.' },
                { text: 'Three.js is a different version on their laptop', why: 'Everyone loads the same version from your page.' },
            ] },
            { type: 'takeaways', items: [
                'requestAnimationFrame runs your function once per screen refresh.',
                'Change something, then render, every frame.',
                'Multiply movement by delta time so speed is the same on every screen.',
            ] },
        ],
    },

    m3_5: {
        id: 'm3.5',
        blocks: [
            { type: 'text', html: `
                <p>For Quest 3, your 3D scene becomes the <b>background</b> of your portfolio. By default, the renderer's <code>&lt;canvas&gt;</code> is just another element: it sits in the page flow and pushes your content down. Three CSS rules turn it into a background:</p>
                <ol>
                    <li><code>position: fixed; inset: 0</code> pins it to the window, full screen, even while scrolling,</li>
                    <li><code>z-index: -1</code> sends it behind your content,</li>
                    <li><code>pointer-events: none</code> lets clicks pass through to your links and buttons.</li>
                </ol>
                <p>Your glassmorphism cards from Module 2 finally have something to blur.</p>` },
            { type: 'widget', name: 'bglab', props: {} },
            { type: 'code', caption: 'Keep the canvas full-screen when the window is resized', code: `canvas { position: fixed; inset: 0; z-index: -1; pointer-events: none; }

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});` },
            { type: 'text', html: `<p><b>Before you push:</b> paste your <code>index.html</code> and your script (for example <code>bg.js</code>) to run the Quest 3 checks.</p>` },
            { type: 'widget', name: 'preflight', props: { quest: 3, js: 'bg.js' } },
            { type: 'check', question: 'Your 3D background now covers your portfolio and your links don’t work. Which fix is missing?', options: [
                { text: 'z-index: -1 (and pointer-events: none) on the canvas', correct: true, why: 'z-index -1 puts it behind your content; pointer-events none lets clicks through.' },
                { text: 'A bigger font size', why: 'The canvas is on top of the text; bigger text is still underneath.' },
                { text: 'Removing position: fixed', why: 'Then it would push your content down instead. Keep it fixed and send it behind.' },
            ] },
            { type: 'takeaways', items: [
                'position: fixed + inset: 0 = full-screen and pinned.',
                'z-index: -1 = behind; pointer-events: none = click-through.',
                'Update the camera and renderer size on resize.',
            ] },
        ],
    },
};
