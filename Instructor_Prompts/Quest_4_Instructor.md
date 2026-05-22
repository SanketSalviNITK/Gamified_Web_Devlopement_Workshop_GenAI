# Quest 4: Instructor Test Prompt

*This is a pre-generated, highly detailed prompt simulating what ChatGPT would produce.*

> Act as a WebGL expert. I need you to update my `bg.js` file to load an external `.glb` 3D model.
> 1. In `index.html`, ensure we are importing the `GLTFLoader`. Since we are using standard script tags, use the rawgit or unpkg CDN for `GLTFLoader.js` compatible with Three.js r128.
> 2. Inside `bg.js`, instantiate the `THREE.GLTFLoader()`.
> 3. Use the loader to load the file located at `./assets/avatar.glb`. 
> 4. Once loaded, scale the model by `2.5` uniformly (x, y, z) and add it to the `scene`.
> 5. Save a reference to the loaded model, and inside the existing `animate()` loop, rotate the model on its Y axis by `0.01` radians per frame.
