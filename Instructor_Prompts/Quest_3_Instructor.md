# Quest 3: Instructor Test Prompt

*This is a pre-generated, highly detailed prompt simulating what ChatGPT would produce.*

> Act as a WebGL expert. I need you to add a 3D background to my `index.html` using Three.js.
> 1. Add the Three.js CDN (`https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`) to `index.html`.
> 2. Add a `<canvas id="bg-canvas"></canvas>` to the HTML, styled with `position: fixed; top: 0; left: 0; z-index: -1; width: 100vw; height: 100vh;`.
> 3. Create a new file `bg.js` (and link it in `index.html`) that sets up the Three.js scene, perspective camera, and WebGL renderer.
> 4. In `bg.js`, add a wireframe icosahedron (`IcosahedronGeometry`) with a glowing neon blue `MeshBasicMaterial`.
> 5. Create an animation loop that slowly rotates the icosahedron on the X and Y axes.
