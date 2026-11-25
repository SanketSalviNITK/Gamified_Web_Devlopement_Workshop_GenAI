// A small Three.js stage for lesson widgets: scene, camera, renderer sized to its box, a render
// loop that pauses when the widget is off screen, and a dispose() that frees the WebGL context
// (browsers only allow a handful at once, so lessons clean up when you leave them).
import * as THREE from 'three';
import { el, reducedMotion } from './util.js';

export { THREE };

export function createStage(container, { height = 280, background = 0x070914, fov = 55, cameraZ = 4 } = {}) {
    const holder = el('div.st-holder', { style: { height: `${height}px` } });
    container.append(holder);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    holder.append(renderer.domElement);
    const scene = new THREE.Scene();
    if (background !== null) scene.background = new THREE.Color(background);
    const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
    camera.position.set(0, 0, cameraZ);

    const frames = [];
    let visible = true;
    let running = true;
    let last = performance.now();
    let raf = 0;
    const slow = reducedMotion();

    const resize = () => {
        const w = holder.clientWidth || 300, h = holder.clientHeight || height;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(holder);
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    io.observe(holder);

    const loop = (now) => {
        raf = requestAnimationFrame(loop);
        const dt = Math.min(0.05, (now - last) / 1000) * (slow ? 0.25 : 1);
        last = now;
        if (!visible || !running) return;
        for (const f of frames) f(dt, now / 1000);
        renderer.render(scene, camera);
    };
    resize();
    raf = requestAnimationFrame(loop);

    return {
        THREE, scene, camera, renderer, holder,
        onFrame: (fn) => frames.push(fn),
        setRunning: (on) => { running = on; },
        renderOnce: () => renderer.render(scene, camera),
        dispose() {
            cancelAnimationFrame(raf);
            ro.disconnect();
            io.disconnect();
            scene.traverse((o) => {
                o.geometry?.dispose?.();
                const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
                mats.forEach((m) => m.dispose());
            });
            renderer.dispose();
            renderer.forceContextLoss?.();
            holder.remove();
        },
    };
}
