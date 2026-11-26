// Loads the course's sample robot (course/assets/avatar.glb) for the Module 4 widgets.
// The file is fetched once and parsed separately for each widget, so every lesson gets its own copy.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const AVATAR_URL = new URL('../assets/avatar.glb', import.meta.url).href;
let bytes = null;

export async function avatarBytes() {
    if (!bytes) {
        bytes = fetch(AVATAR_URL).then((r) => {
            if (!r.ok) throw new Error(`avatar.glb: HTTP ${r.status}`);
            return r.arrayBuffer();
        });
        bytes.catch(() => { bytes = null; });
    }
    return bytes;
}

/** Resolves to { scene, animations } exactly like GLTFLoader's onLoad. */
export async function loadAvatar() {
    const buf = await avatarBytes();
    return new Promise((resolve, reject) => new GLTFLoader().parse(buf.slice(0), '', resolve, reject));
}

/** Soft studio lighting plus a floor grid: the usual setup for showing a character. */
export function studio(THREE, scene, { grid = true } = {}) {
    scene.add(new THREE.HemisphereLight(0xdbeafe, 0x1e1b4b, 1.2));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(2.5, 4, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8b5cf6, 1.6);
    rim.position.set(-3, 2, -2);
    scene.add(rim);
    if (grid) {
        const g = new THREE.GridHelper(8, 16, 0x6d28d9, 0x1e293b);
        g.material.transparent = true;
        g.material.opacity = 0.6;
        scene.add(g);
    }
}

export const fmtBytes = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`);
