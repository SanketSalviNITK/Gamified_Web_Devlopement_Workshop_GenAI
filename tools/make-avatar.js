// Builds course/assets/avatar.glb, the sample robot used by the Module 4 lessons.
// It is generated (not downloaded) so the course owns every asset. Run tools/make-avatar.html in a
// browser (via a local server) and it downloads avatar.glb. Units are metres: the robot is about
// 1.8 m tall with its feet at y = 0, like most real-world models.
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

export function buildAvatar() {
    const mat = (name, color, extra = {}) => new THREE.MeshStandardMaterial({ name, color, roughness: 0.45, metalness: 0.3, ...extra });
    const shell = mat('Shell', 0xe9e6ff);
    const trim = mat('Trim', 0x8b5cf6, { metalness: 0.5 });
    const dark = mat('Visor', 0x0b1020, { roughness: 0.2 });
    const glow = mat('Glow', 0x22d3ee, { emissive: 0x22d3ee, emissiveIntensity: 1.6 });

    const root = new THREE.Group(); root.name = 'Robot';
    const body = new THREE.Group(); body.name = 'Body'; root.add(body);
    const add = (parent, name, geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.name = name; o.position.set(x, y, z); parent.add(o); return o; };

    // Hover base and legs
    add(root, 'Base', new THREE.CylinderGeometry(0.32, 0.38, 0.08, 24), trim, 0, 0.04, 0);
    add(root, 'BaseGlow', new THREE.TorusGeometry(0.34, 0.025, 8, 32), glow, 0, 0.09, 0).rotation.x = Math.PI / 2;
    add(body, 'LegL', new THREE.CapsuleGeometry(0.09, 0.32, 4, 10), shell, -0.14, 0.38, 0);
    add(body, 'LegR', new THREE.CapsuleGeometry(0.09, 0.32, 4, 10), shell, 0.14, 0.38, 0);
    // Torso
    add(body, 'Torso', new THREE.CapsuleGeometry(0.3, 0.38, 6, 16), shell, 0, 0.95, 0);
    add(body, 'Core', new THREE.SphereGeometry(0.09, 20, 12), glow, 0, 1.0, 0.28);
    add(body, 'Belt', new THREE.TorusGeometry(0.31, 0.035, 8, 32), trim, 0, 0.74, 0).rotation.x = Math.PI / 2;
    // Arms on shoulder pivots (so the Wave clip rotates around the shoulder)
    for (const [side, x] of [['L', -0.42], ['R', 0.42]]) {
        const shoulder = new THREE.Group(); shoulder.name = `Shoulder${side}`; shoulder.position.set(x, 1.18, 0); body.add(shoulder);
        add(shoulder, `Pad${side}`, new THREE.SphereGeometry(0.11, 16, 12), trim);
        add(shoulder, `Arm${side}`, new THREE.CapsuleGeometry(0.075, 0.36, 4, 10), shell, 0, -0.26, 0);
        add(shoulder, `Hand${side}`, new THREE.SphereGeometry(0.085, 14, 10), trim, 0, -0.5, 0);
    }
    // Head
    const head = new THREE.Group(); head.name = 'Head'; head.position.set(0, 1.52, 0); body.add(head);
    add(head, 'Skull', new THREE.BoxGeometry(0.5, 0.36, 0.42, 1, 1, 1), shell);
    add(head, 'Visor', new THREE.BoxGeometry(0.42, 0.16, 0.05), dark, 0, 0.01, 0.21);
    add(head, 'EyeL', new THREE.SphereGeometry(0.035, 12, 8), glow, -0.09, 0.01, 0.24);
    add(head, 'EyeR', new THREE.SphereGeometry(0.035, 12, 8), glow, 0.09, 0.01, 0.24);
    add(head, 'Antenna', new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8), trim, 0, 0.26, 0);
    add(head, 'AntennaTip', new THREE.SphereGeometry(0.04, 12, 8), glow, 0, 0.36, 0);

    // Animation clips
    const q = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)).toArray();
    const idle = new THREE.AnimationClip('Idle', 2, [
        new THREE.VectorKeyframeTrack('Body.position', [0, 1, 2], [0, 0, 0, 0, 0.04, 0, 0, 0, 0]),
        new THREE.QuaternionKeyframeTrack('Head.quaternion', [0, 1, 2], [...q(0, -0.12, 0), ...q(0, 0.12, 0), ...q(0, -0.12, 0)]),
    ]);
    const wave = new THREE.AnimationClip('Wave', 1.6, [
        new THREE.QuaternionKeyframeTrack('ShoulderR.quaternion', [0, 0.3, 0.6, 0.9, 1.2, 1.6],
            [...q(0, 0, 0), ...q(0, 0, 2.6), ...q(0, 0, 2.2), ...q(0, 0, 2.6), ...q(0, 0, 2.2), ...q(0, 0, 0)]),
        new THREE.QuaternionKeyframeTrack('Head.quaternion', [0, 0.8, 1.6], [...q(0, 0, 0), ...q(0, 0, -0.12), ...q(0, 0, 0)]),
    ]);
    return { root, clips: [idle, wave] };
}

export function exportGlb() {
    const { root, clips } = buildAvatar();
    // Export a named scene, so GLTFLoader's gltf.scene is called "Avatar" (not the exporter's "AuxScene").
    const scene = new THREE.Scene();
    scene.name = 'Avatar';
    scene.add(root);
    return new Promise((resolve, reject) => new GLTFExporter().parse(scene, resolve, reject, { binary: true, animations: clips }));
}
