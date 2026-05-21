// WebGL Three.js Cybernetic Assembly Grid Renderer (Boss Raid Edition - Continuous Fire & Unique Bots)
class Assembly3DRenderer {
    constructor(canvasContainerId) {
        this.container = document.getElementById(canvasContainerId);
        if (!this.container) return;

        this.pods = new Map(); // username -> Three.js Group object
        this.projectiles = []; // active flying laser balls
        this.impactParticles = []; // active hit explosion elements
        this.particles = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.gridHelper = null;
        
        // Central Boss elements
        this.boss = null;
        this.bossWire = null;
        this.bossShield1 = null;
        this.bossShield2 = null;
        this.bossShakeIntensity = 0;
        this.bossPulseTimer = 0;
        this.bossDefeated = false;

        this.orbitRadius = 55;
        this.orbitSpeed = 0.0012;
        this.cameraAngle = 0;

        // Raycaster for hover interactions
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2(-1, -1);
        this.hoveredPod = null;
        this.createTooltipElement();

        this.init();
    }

    init() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        // 1. Scene Setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x03040b, 0.012);

        // 2. Camera Setup
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        this.camera.position.set(0, 35, 75);
        this.camera.lookAt(0, 5, 0);

        // 3. Renderer Setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.setClearColor(0x03040b, 1);
        this.container.appendChild(this.renderer.domElement);

        // 4. Lights
        const ambientLight = new THREE.AmbientLight(0x0a0c1a, 1.2);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xff3b30, 2); // Dark Red Boss Light
        dirLight.position.set(0, 40, 0);
        this.scene.add(dirLight);

        const cyanLight = new THREE.PointLight(0x06b6d4, 3, 80);
        cyanLight.position.set(-25, 10, -25);
        this.scene.add(cyanLight);

        // 5. Tech Floor Grid Helper
        this.gridHelper = new THREE.GridHelper(130, 30, 0xef4444, 0x1e0b0b); // Red floor grid
        this.gridHelper.position.y = -5;
        this.scene.add(this.gridHelper);

        // 6. Spawn central Boss Core
        this.createBoss();

        // 7. Ambient particles
        this.createGlobalParticles();

        // 8. Event Listeners
        window.addEventListener('resize', () => this.onWindowResize());
        this.container.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.container.addEventListener('mouseleave', () => this.onMouseLeave());

        // 9. Start Animation Loop
        this.animate();
    }

    createBoss() {
        const bossGroup = new THREE.Group();
        bossGroup.position.set(0, 7, 0);
        bossGroup.name = 'boss_root';
        this.bossGroup = bossGroup;

        // A. Spiky core sphere
        const bossGeo = new THREE.IcosahedronGeometry(6, 1);
        const bossMat = new THREE.MeshStandardMaterial({
            color: 0xef4444,
            emissive: 0x991b1b,
            roughness: 0.1,
            metalness: 0.9,
            wireframe: false
        });
        this.boss = new THREE.Mesh(bossGeo, bossMat);
        bossGroup.add(this.boss);

        // B. Dark Red wireframe overlay
        const wireGeo = new THREE.IcosahedronGeometry(6.2, 1);
        const wireMat = new THREE.MeshBasicMaterial({
            color: 0xff3b30,
            wireframe: true,
            transparent: true,
            opacity: 0.45
        });
        const wire = new THREE.Mesh(wireGeo, wireMat);
        this.bossWire = wire;
        bossGroup.add(wire);

        // C. Heavy rotating outer shield rings
        const shieldGeo1 = new THREE.TorusGeometry(8.5, 0.25, 8, 32);
        const shieldMat1 = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9 });
        this.bossShield1 = new THREE.Mesh(shieldGeo1, shieldMat1);
        this.bossShield1.rotation.x = Math.PI / 4;
        bossGroup.add(this.bossShield1);

        const shieldGeo2 = new THREE.TorusGeometry(9.5, 0.25, 8, 32);
        const shieldMat2 = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.9 });
        this.bossShield2 = new THREE.Mesh(shieldGeo2, shieldMat2);
        this.bossShield2.rotation.y = Math.PI / 4;
        bossGroup.add(this.bossShield2);

        // D. Pointlight sources
        this.bossLight = new THREE.PointLight(0xff3b30, 8, 35);
        this.bossLight.position.set(0, 0, 0);
        bossGroup.add(this.bossLight);

        this.scene.add(bossGroup);
    }

    createGlobalParticles() {
        const count = 200;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const speeds = [];

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 120;
            positions[i * 3 + 1] = Math.random() * 45 - 5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 120;
            speeds.push(Math.random() * 0.04 + 0.015);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({
            color: 0xef4444,
            size: 0.5,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(geometry, material);
        this.particles.userData = { speeds };
        this.scene.add(this.particles);
    }

    animateParticles() {
        if (!this.particles) return;
        const positions = this.particles.geometry.attributes.position.array;
        const speeds = this.particles.userData.speeds;
        const count = positions.length / 3;

        for (let i = 0; i < count; i++) {
            positions[i * 3 + 1] += speeds[i];
            if (positions[i * 3 + 1] > 40) {
                positions[i * 3 + 1] = -5;
            }
        }
        this.particles.geometry.attributes.position.needsUpdate = true;
    }

    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    createTooltipElement() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'glass-panel';
        this.tooltip.style.position = 'absolute';
        this.tooltip.style.display = 'none';
        this.tooltip.style.pointerEvents = 'none';
        this.tooltip.style.zIndex = '1000';
        this.tooltip.style.padding = '10px 14px';
        this.tooltip.style.borderColor = 'var(--neon-cyan)';
        this.tooltip.style.background = 'rgba(13, 17, 39, 0.85)';
        this.tooltip.style.transform = 'translate(-50%, -100%)';
        this.tooltip.style.marginTop = '-20px';
        this.tooltip.style.whiteSpace = 'nowrap';
        this.tooltip.style.transition = 'opacity 0.2s ease-out';
        this.tooltip.style.opacity = '0';
        document.body.appendChild(this.tooltip);
    }

    onMouseMove(event) {
        const rect = this.container.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;
    }

    onMouseLeave() {
        this.mouse.x = -1;
        this.mouse.y = -1;
    }

    /**
     * Shoots a 3D Laser projectile from a participant's capsule directly to the Boss!
     * @param {string} username - Student key.
     * @param {number} level - The level they reached (influences laser size and speed).
     */
    shootLaser(username, level) {
        const pod = this.pods.get(username);
        if (!pod) return;

        // Start coordinate (from pod center)
        const startX = pod.position.x;
        const startY = pod.position.y + 2.5;
        const startZ = pod.position.z;

        // Target (Boss center: 0, 7, 0)
        const targetX = 0;
        const targetY = 7;
        const targetZ = 0;

        // Laser Power specs based on levels
        // Higher level = larger glowing orb, faster travel, higher emissive sparks
        const colors = [0xffffff, 0xec4899, 0x8b5cf6, 0x06b6d4, 0x3b82f6, 0x10b981];
        const laserColor = colors[level] || 0xffffff;

        const sizes = [0.2, 0.35, 0.5, 0.7, 0.9, 1.25];
        const rad = sizes[level] || 0.3;

        const speeds = [0.01, 0.02, 0.028, 0.038, 0.048, 0.06];
        const travelSpeed = speeds[level] || 0.025;

        // Create glowing laser ball mesh
        const laserGeo = new THREE.SphereGeometry(rad, 10, 10);
        const laserMat = new THREE.MeshBasicMaterial({
            color: laserColor,
            transparent: true,
            opacity: 0.9
        });
        const laserMesh = new THREE.Mesh(laserGeo, laserMat);
        laserMesh.position.set(startX, startY, startZ);
        
        const pointLight = new THREE.PointLight(laserColor, level >= 4 ? 4 : 2, level * 5 + 5);
        laserMesh.add(pointLight);

        this.scene.add(laserMesh);

        // Store active projectile references
        this.projectiles.push({
            mesh: laserMesh,
            progress: 0,
            speed: travelSpeed,
            startX, startY, startZ,
            targetX, targetY, targetZ,
            level
        });

        // Trigger flash inside capsule top base
        const capFlashMat = new THREE.MeshBasicMaterial({ color: laserColor });
        const flashGeo = new THREE.CylinderGeometry(3.3, 3.3, 0.2, 12);
        const flashMesh = new THREE.Mesh(flashGeo, capFlashMat);
        flashMesh.position.y = 1;
        pod.add(flashMesh);
        setTimeout(() => pod.remove(flashMesh), 150);
    }

    createImpactBurst(x, y, z, level) {
        const count = level * 6 + 10; // more sparks for higher levels
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = [];

        const colors = [0xffffff, 0xec4899, 0x8b5cf6, 0x06b6d4, 0x3b82f6, 0x10b981];
        const sparkColor = colors[level] || 0xff3b30;

        for (let i = 0; i < count; i++) {
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            velocities.push({
                x: (Math.random() - 0.5) * (0.4 + level * 0.1),
                y: (Math.random() - 0.5) * (0.4 + level * 0.1),
                z: (Math.random() - 0.5) * (0.4 + level * 0.1)
            });
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({
            color: sparkColor,
            size: 0.4,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });

        const burst = new THREE.Points(geometry, material);
        burst.userData = { velocities, age: 0 };
        this.scene.add(burst);
        this.impactParticles.push(burst);
    }

    animateProjectiles() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.progress += p.speed;

            if (p.progress >= 1.0) {
                // Impact hit!
                this.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.projectiles.splice(i, 1);

                // Target rumble shake based on projectile power level
                this.bossShakeIntensity = Math.max(this.bossShakeIntensity, p.level * 0.12 + 0.1);
                this.createImpactBurst(p.targetX, p.targetY, p.targetZ, p.level);
                
                if (this.boss) {
                    this.boss.material.emissive.setHex(0xffffff);
                    setTimeout(() => {
                        if (this.boss) this.boss.material.emissive.setHex(0x991b1b);
                    }, 80);
                }
            } else {
                p.mesh.position.x = THREE.MathUtils.lerp(p.startX, p.targetX, p.progress);
                p.mesh.position.y = THREE.MathUtils.lerp(p.startY, p.targetY, p.progress);
                p.mesh.position.z = THREE.MathUtils.lerp(p.startZ, p.targetZ, p.progress);
            }
        }

        // Hit explosion age decays
        for (let i = this.impactParticles.length - 1; i >= 0; i--) {
            const burst = this.impactParticles[i];
            const positions = burst.geometry.attributes.position.array;
            const vels = burst.userData.velocities;
            const count = positions.length / 3;

            burst.userData.age += 1;
            const maxAge = burst.userData.maxAge || 24;

            for (let k = 0; k < count; k++) {
                positions[k * 3] += vels[k].x;
                positions[k * 3 + 1] += vels[k].y;
                positions[k * 3 + 2] += vels[k].z;
                
                // Apply slight velocity drag over time
                vels[k].x *= 0.98;
                vels[k].y *= 0.98;
                vels[k].z *= 0.98;
            }
            burst.geometry.attributes.position.needsUpdate = true;
            burst.material.opacity = 0.95 - (burst.userData.age / maxAge);

            if (burst.userData.age > maxAge) {
                this.scene.remove(burst);
                burst.geometry.dispose();
                burst.material.dispose();
                this.impactParticles.splice(i, 1);
            }
        }
    }

    updateCohort(participants, bossHp = 100) {
        const currentKeys = new Set(participants.map(p => p.username));

        // Detect glitch overlord defeat and trigger stability transformation
        if (bossHp === 0 && !this.bossDefeated && participants.length > 0) {
            this.triggerBossStability();
        }

        // If boss health is restored (e.g. via reset button), restore red corruption state
        if (bossHp > 0 && this.bossDefeated) {
            this.restoreBossCorruption();
        }

        // 1. Delete removed participants
        for (let [username, podGroup] of this.pods.entries()) {
            if (!currentKeys.has(username)) {
                this.scene.remove(podGroup);
                this.pods.delete(username);
            }
        }

        // 2. Position math for grid circular layout
        const radius = 22;
        const count = participants.length;

        participants.forEach((p, idx) => {
            const angle = (idx / count) * Math.PI * 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;

            if (this.pods.has(p.username)) {
                const pod = this.pods.get(p.username);
                
                // If student level changed, log laser fire
                if (pod.userData.level !== -1 && pod.userData.level < p.currentQuest && !this.bossDefeated) {
                    this.shootLaser(p.username, p.currentQuest);
                }
                
                this.updatePodMesh(p.username, p.currentQuest, p.displayName);
                
                // Bind new variables to capsule userdata so continuous fire loops read them
                pod.userData.level = p.currentQuest;
                pod.userData.botName = p.botName || 'B-909';
                
                this.glideTo(pod.position, x, 0, z);
                pod.lookAt(0, 0, 0);
            } else {
                const newPod = this.createPodMesh(p.currentQuest, p.displayName);
                newPod.position.set(x, -15, z);
                
                // Bind variables
                newPod.userData.username = p.username;
                newPod.userData.level = p.currentQuest;
                newPod.userData.botName = p.botName || 'B-909';
                newPod.userData.ticks = Math.floor(Math.random() * 60); // stagger firing offset!
                
                this.scene.add(newPod);
                this.pods.set(p.username, newPod);
                this.glideTo(newPod.position, x, 0, z);
                newPod.lookAt(0, 0, 0);
            }
        });
    }

    triggerBossStability() {
        this.bossDefeated = true;

        // 1. Throw a massive bright white/golden light flash
        if (this.bossLight) {
            this.bossLight.color.setHex(0xffffff); // Bright white flare
            this.bossLight.intensity = 40; // Mega intense flash
            this.bossLight.distance = 70;
        }

        // 2. Heavy momentary camera shake representing the final purge
        this.bossShakeIntensity = 2.0;

        // 3. Smooth transition to golden colored stable core
        if (this.boss) {
            this.boss.material.color.setHex(0xf59e0b); // Rich gold
            this.boss.material.emissive.setHex(0xd97706); // Golden orange glow
            this.boss.material.emissiveIntensity = 0.8;
            this.boss.material.metalness = 0.95;
            this.boss.material.roughness = 0.05;
        }

        // 4. Stable golden wireframe
        if (this.bossWire) {
            this.bossWire.material.color.setHex(0xfbbf24); // Amber gold
            this.bossWire.material.opacity = 0.5;
        }

        // 5. Brighten shield rings into gold/emerald tech accents
        if (this.bossShield1) {
            this.bossShield1.material.color.setHex(0x10b981); // Emerald accents
            this.bossShield1.material.emissive = new THREE.Color(0x065f46);
            this.bossShield1.material.emissiveIntensity = 0.5;
        }
        if (this.bossShield2) {
            this.bossShield2.material.color.setHex(0xfbbf24); // Gold accents
            this.bossShield2.material.emissive = new THREE.Color(0x78350f);
            this.bossShield2.material.emissiveIntensity = 0.5;
        }
    }

    restoreBossCorruption() {
        this.bossDefeated = false;

        // 1. Restore light color back to corrupted red
        if (this.bossLight) {
            this.bossLight.color.setHex(0xff3b30);
            this.bossLight.intensity = 8;
            this.bossLight.distance = 35;
        }

        // 2. Reset mesh material back to corrupted spiky red
        if (this.boss) {
            this.boss.material.color.setHex(0xef4444);
            this.boss.material.emissive.setHex(0x991b1b);
            this.boss.material.emissiveIntensity = 1.0;
            this.boss.material.metalness = 0.9;
            this.boss.material.roughness = 0.1;
        }

        // 3. Reset wireframe color back to glowing neon red
        if (this.bossWire) {
            this.bossWire.material.color.setHex(0xff3b30);
            this.bossWire.material.opacity = 0.45;
        }

        // 4. Restore shield rings to dark mechanical style
        if (this.bossShield1) {
            this.bossShield1.material.color.setHex(0x111827);
            this.bossShield1.material.emissive = new THREE.Color(0x000000);
            this.bossShield1.material.emissiveIntensity = 0.0;
        }
        if (this.bossShield2) {
            this.bossShield2.material.color.setHex(0x1f2937);
            this.bossShield2.material.emissive = new THREE.Color(0x000000);
            this.bossShield2.material.emissiveIntensity = 0.0;
        }
    }

    glideTo(vector, tx, ty, tz) {
        vector.userData = { targetX: tx, targetY: ty, targetZ: tz };
    }

    updateInterpolations() {
        this.pods.forEach(pod => {
            if (pod.position.userData && pod.position.userData.targetX !== undefined) {
                const u = pod.position.userData;
                pod.position.x += (u.targetX - pod.position.x) * 0.1;
                pod.position.y += (u.targetY - pod.position.y) * 0.1;
                pod.position.z += (u.targetZ - pod.position.z) * 0.1;
            }
        });
    }

    createPodMesh(level, displayName) {
        const podGroup = new THREE.Group();

        // 1. Base platform
        const baseGeo = new THREE.CylinderGeometry(3.5, 4, 1.2, 16);
        const baseMat = new THREE.MeshStandardMaterial({ 
            color: 0x1f2937, 
            roughness: 0.2, 
            metalness: 0.8 
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = -4.25;
        podGroup.add(base);

        // 2. Base Glow Ring (Emissive torus)
        const ringGeo = new THREE.TorusGeometry(3.6, 0.15, 8, 16);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x6366f1 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -3.5;
        podGroup.add(ring);
        podGroup.userData = { ring, displayName, level: -1 };

        // 3. Cylinder Tube
        const tubeGeo = new THREE.CylinderGeometry(3.2, 3.2, 9, 16, 1, true);
        const tubeMat = new THREE.MeshPhysicalMaterial({
            color: 0x06b6d4,
            transparent: true,
            opacity: 0.2,
            roughness: 0.1,
            transmission: 0.6,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        tube.position.y = 1;
        podGroup.add(tube);

        // 4. Cap
        const capGeo = new THREE.CylinderGeometry(3.3, 3.3, 0.6, 16);
        const cap = new THREE.Mesh(capGeo, baseMat);
        cap.position.y = 5.8;
        podGroup.add(cap);

        this.rebuildInternalCore(podGroup, level);

        return podGroup;
    }

    updatePodMesh(username, level, displayName) {
        const pod = this.pods.get(username);
        if (!pod) return;

        if (pod.userData.level !== level) {
            this.rebuildInternalCore(pod, level);
        }
    }

    rebuildInternalCore(podGroup, level) {
        const oldCore = podGroup.getObjectByName('core_mesh');
        if (oldCore) podGroup.remove(oldCore);

        const coreGroup = new THREE.Group();
        coreGroup.name = 'core_mesh';
        coreGroup.position.y = 1;

        const colors = [
            0x4b5563, // Level 0: Offline (Gray)
            0xec4899, // Level 1: Pink (Git Core)
            0x8b5cf6, // Level 2: Violet (Chassis Body)
            0x06b6d4, // Level 3: Cyan (3D Holo wireframe)
            0x3b82f6, // Level 4: Blue (3D Avatar Mesh)
            0x10b981  // Level 5: Green (Mind chatbot active)
        ];
        const activeColor = colors[level] || colors[0];

        podGroup.userData.ring.material.color.setHex(activeColor);

        if (level === 0) {
            const boxGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
            const boxMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, wireframe: true });
            const box = new THREE.Mesh(boxGeo, boxMat);
            coreGroup.add(box);
        }
        else if (level === 1) {
            const cellGeo = new THREE.OctahedronGeometry(1.5, 0);
            const cellMat = new THREE.MeshStandardMaterial({ 
                color: activeColor, 
                emissive: activeColor, 
                emissiveIntensity: 0.5,
                roughness: 0.1 
            });
            const cell = new THREE.Mesh(cellGeo, cellMat);
            coreGroup.add(cell);
        } 
        else if (level === 2) {
            const bodyGeo = new THREE.CylinderGeometry(1, 1, 3, 12);
            const bodyMat = new THREE.MeshStandardMaterial({ 
                color: activeColor, 
                roughness: 0.3,
                metalness: 0.7 
            });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            coreGroup.add(body);
        }
        else if (level === 3) {
            const bodyGeo = new THREE.CylinderGeometry(1, 1, 3, 12);
            const bodyMat = new THREE.MeshStandardMaterial({ color: colors[2], roughness: 0.3, metalness: 0.7 });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            coreGroup.add(body);

            const gridGeo = new THREE.SphereGeometry(2.4, 8, 8);
            const gridMat = new THREE.MeshBasicMaterial({ 
                color: activeColor, 
                wireframe: true, 
                transparent: true, 
                opacity: 0.7 
            });
            const grid = new THREE.Mesh(gridGeo, gridMat);
            grid.name = 'spinning_wire';
            coreGroup.add(grid);
        }
        else if (level >= 4) {
            const avatarGroup = new THREE.Group();
            avatarGroup.name = 'avatar_group';

            const headGeo = new THREE.BoxGeometry(1.2, 1, 1);
            const avatarMat = new THREE.MeshStandardMaterial({ 
                color: activeColor, 
                roughness: 0.1, 
                metalness: 0.6,
                emissive: level === 5 ? 0x10b981 : 0x0,
                emissiveIntensity: 0.2
            });
            const head = new THREE.Mesh(headGeo, avatarMat);
            head.position.y = 1.6;
            avatarGroup.add(head);

            const visorGeo = new THREE.BoxGeometry(0.8, 0.3, 0.2);
            const visorMat = new THREE.MeshBasicMaterial({ color: level === 5 ? 0xa7f3d0 : 0x06b6d4 });
            const visor = new THREE.Mesh(visorGeo, visorMat);
            visor.position.set(0, 1.6, 0.5);
            avatarGroup.add(visor);

            const torsoGeo = new THREE.CylinderGeometry(1, 0.8, 2.2, 10);
            const torso = new THREE.Mesh(torsoGeo, avatarMat);
            torso.position.y = 0;
            avatarGroup.add(torso);

            const armGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.8, 8);
            const lArm = new THREE.Mesh(armGeo, avatarMat);
            lArm.position.set(-1.4, 0, 0);
            lArm.rotation.z = Math.PI / 8;
            lArm.name = 'left_arm';
            avatarGroup.add(lArm);

            const rArm = new THREE.Mesh(armGeo, avatarMat);
            rArm.position.set(1.4, 0, 0);
            rArm.rotation.z = -Math.PI / 8;
            rArm.name = 'right_arm';
            avatarGroup.add(rArm);

            coreGroup.add(avatarGroup);

            if (level === 5) {
                const ring1Geo = new THREE.TorusGeometry(2.6, 0.08, 4, 24);
                const ring1Mat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.8 });
                const orbitRing1 = new THREE.Mesh(ring1Geo, ring1Mat);
                orbitRing1.name = 'orbit_ring_1';
                orbitRing1.rotation.x = Math.PI / 3;
                coreGroup.add(orbitRing1);

                const ring2Geo = new THREE.TorusGeometry(2.6, 0.08, 4, 24);
                const orbitRing2 = new THREE.Mesh(ring2Geo, ring1Mat);
                orbitRing2.name = 'orbit_ring_2';
                orbitRing2.rotation.y = Math.PI / 3;
                coreGroup.add(orbitRing2);
            }
        }

        podGroup.userData.level = level;
        podGroup.add(coreGroup);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.updateInterpolations();

        // 1. Cosmic Camera slow orbital flow
        this.cameraAngle += this.orbitSpeed;
        
        let camX = Math.cos(this.cameraAngle) * this.orbitRadius;
        let camZ = Math.sin(this.cameraAngle) * this.orbitRadius;
        let camY = 28 + Math.sin(this.cameraAngle * 2) * 4;

        if (this.bossShakeIntensity > 0.01) {
            camX += (Math.random() - 0.5) * this.bossShakeIntensity * 3;
            camY += (Math.random() - 0.5) * this.bossShakeIntensity * 3;
            camZ += (Math.random() - 0.5) * this.bossShakeIntensity * 3;
            this.bossShakeIntensity *= 0.9; // decay shake
        }

        this.camera.position.set(camX, camY, camZ);
        this.camera.lookAt(0, 6, 0);

        // 2. Continuous Firing streams from active capsules!
        this.pods.forEach((pod, username) => {
            const level = pod.userData.level || 0;
            
            // Core hovering spin animations
            const core = pod.getObjectByName('core_mesh');
            if (core) {
                core.position.y = 1 + Math.sin(Date.now() * 0.002) * 0.2;
                core.rotation.y += 0.008;

                const spinningWire = core.getObjectByName('spinning_wire');
                if (spinningWire) {
                    spinningWire.rotation.x += 0.005;
                    spinningWire.rotation.z += 0.008;
                }

                const r1 = core.getObjectByName('orbit_ring_1');
                if (r1) r1.rotation.y += 0.015;
                
                const r2 = core.getObjectByName('orbit_ring_2');
                if (r2) r2.rotation.x += 0.015;

                const avatar = core.getObjectByName('avatar_group');
                if (avatar && level === 5) {
                    const lArm = avatar.getObjectByName('left_arm');
                    if (lArm) lArm.rotation.z = Math.PI / 8 + Math.sin(Date.now() * 0.005) * 0.15;
                    
                    const rArm = avatar.getObjectByName('right_arm');
                    if (rArm) rArm.rotation.z = -Math.PI / 8 - Math.sin(Date.now() * 0.005) * 0.15;
                }
            }

            // Continuous Fire Loop based on current level ticks
            if (level > 0 && !this.bossDefeated) {
                pod.userData.ticks = (pod.userData.ticks || 0) + 1;
                
                // Define fire interval delays (shorter = faster DPS firing)
                const fireIntervals = [0, 160, 100, 60, 36, 18];
                const activeInterval = fireIntervals[level] || 100;

                if (pod.userData.ticks % activeInterval === 0) {
                    this.shootLaser(username, level);
                }
            }
        });

        // Decay the white/golden flash intensity back to a warm stable golden glow
        if (this.bossDefeated && this.bossLight && this.bossLight.intensity > 8) {
            this.bossLight.intensity -= 0.5;
        }

        // 3. Boss animations (Pulsing core & rotation OR Stable Golden Core)
        if (this.boss) {
            if (this.bossDefeated) {
                // Stable Golden Core (Smooth slow majestic rotation, locked scale, no shaking)
                this.boss.rotation.y += 0.003;
                this.boss.rotation.x += 0.0015;
                this.boss.scale.set(1.0, 1.0, 1.0);
                this.boss.position.set(0, 0, 0);
            } else {
                // Bug Core (Glitchy vibration, pulsing scale, faster rotation)
                this.bossPulseTimer += 0.02;
                const pulseScale = 1.0 + Math.sin(this.bossPulseTimer) * 0.05;
                this.boss.scale.set(pulseScale, pulseScale, pulseScale);
                this.boss.rotation.y += 0.005;
                this.boss.rotation.x += 0.003;

                if (this.bossShakeIntensity > 0.01) {
                    this.boss.position.x = (Math.random() - 0.5) * this.bossShakeIntensity;
                    this.boss.position.z = (Math.random() - 0.5) * this.bossShakeIntensity;
                } else {
                    this.boss.position.set(0, 0, 0);
                }
            }
        }

        if (this.bossShield1) this.bossShield1.rotation.z += 0.01;
        if (this.bossShield2) this.bossShield2.rotation.z -= 0.007;

        // 4. Animate active projectiles (Laser particles)
        this.animateProjectiles();

        // 5. Move ambient bubbles
        this.animateParticles();

        // 6. Raycasting tooltips
        this.raycaster.setFromCamera(this.mouse, this.camera);
        if (this.mouse.x !== -1 || this.mouse.y !== -1) {
            const intersects = this.raycaster.intersectObjects(Array.from(this.pods.values()), true);
            if (intersects.length > 0) {
                let obj = intersects[0].object;
                while (obj && obj.parent && !obj.userData.username) {
                    obj = obj.parent;
                }
                
                if (obj && obj.userData.username) {
                    if (this.hoveredPod !== obj) {
                        this.hoveredPod = obj;
                        const pName = obj.userData.displayName || obj.userData.username;
                        const bName = obj.userData.botName || 'B-909';
                        this.tooltip.innerHTML = `<span style="font-weight:700; color:var(--text-primary); font-size: 1rem;">${pName}</span><br><span style="font-family:var(--font-code); font-size:0.75rem; color:var(--neon-cyan);">Bot: ${bName}</span>`;
                        this.tooltip.style.display = 'block';
                        setTimeout(() => this.tooltip.style.opacity = '1', 10);
                        
                        // Hover scale effect
                        if (obj.userData.ring) obj.userData.ring.scale.set(1.15, 1.15, 1.15);
                    }
                    this.tooltip.style.left = this.mouseX + 'px';
                    this.tooltip.style.top = this.mouseY + 'px';
                }
            } else {
                if (this.hoveredPod) {
                    if (this.hoveredPod.userData.ring) this.hoveredPod.userData.ring.scale.set(1.0, 1.0, 1.0);
                    this.tooltip.style.opacity = '0';
                    this.hoveredPod = null;
                    setTimeout(() => { if (!this.hoveredPod) this.tooltip.style.display = 'none'; }, 200);
                }
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
}
