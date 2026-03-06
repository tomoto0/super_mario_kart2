// Particle system for visual effects

class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particleGroups = [];
        this.maxParticles = 200;  // 減らす
        this.activeParticles = 0;
    }

    setBudget(maxParticles) {
        this.maxParticles = Math.max(60, Math.round(maxParticles));
        this.trimToBudget();
    }

    getAvailableSlots() {
        return Math.max(0, this.maxParticles - this.getActiveCount());
    }

    disposeParticle(particle) {
        if (!particle || !particle.mesh) return;

        this.scene.remove(particle.mesh);
        if (particle.mesh.geometry) {
            particle.mesh.geometry.dispose();
        }
        if (particle.mesh.material) {
            if (Array.isArray(particle.mesh.material)) {
                particle.mesh.material.forEach(material => material.dispose());
            } else {
                particle.mesh.material.dispose();
            }
        }
    }

    disposeGroup(group) {
        if (!group || !group.particles) return;

        group.particles.forEach(particle => this.disposeParticle(particle));
        group.particles.length = 0;
        group.active = false;
    }

    trimToBudget(targetBudget = this.maxParticles) {
        let activeCount = this.getActiveCount();

        while (activeCount > targetBudget && this.particleGroups.length > 0) {
            const group = this.particleGroups.shift();
            activeCount -= group?.particles?.length || 0;
            this.disposeGroup(group);
        }
    }
    
    // Create drift spark particles - 三段階ブーストエフェクト
    createDriftSparks(kart) {
        if (!kart.isDrifting) return null;
        const availableSlots = this.getAvailableSlots();
        if (availableSlots <= 0) return null;
        
        // 三段階の色とサイズを明確に区別
        let color, glowColor, sparkSize, numParticles, sparkSpeed, sparkLife;
        switch (kart.driftLevel) {
            case 1: // 青 - 小さな火花
                color = 0x00d4ff;
                glowColor = 0x0088ff;
                sparkSize = 0.15;
                numParticles = 3;
                sparkSpeed = 4;
                sparkLife = 0.35;
                break;
            case 2: // オレンジ - 中くらいの火花
                color = 0xff8800;
                glowColor = 0xff4400;
                sparkSize = 0.22;
                numParticles = 5;
                sparkSpeed = 6;
                sparkLife = 0.45;
                break;
            case 3: // 紫 - 大きな火花群
                color = 0xbb44ff;
                glowColor = 0x8800ff;
                sparkSize = 0.3;
                numParticles = 7;
                sparkSpeed = 8;
                sparkLife = 0.55;
                break;
            default:
                color = 0xaaaaaa;
                glowColor = 0x888888;
                sparkSize = 0.1;
                numParticles = 2;
                sparkSpeed = 3;
                sparkLife = 0.25;
        }

        const desiredParticles = numParticles + (kart.driftLevel >= 2 ? 1 : 0) + (kart.driftLevel >= 3 ? 3 : 0);
        const spawnBudget = Math.min(desiredParticles, availableSlots);
        const mainParticleCount = Math.max(1, Math.min(numParticles, spawnBudget));
        const allowGlow = kart.driftLevel >= 2 && spawnBudget > mainParticleCount;
        const trailCount = kart.driftLevel >= 3
            ? Math.max(0, Math.min(3, spawnBudget - mainParticleCount - (allowGlow ? 1 : 0)))
            : 0;
        
        const particles = [];
        
        // メイン火花パーティクル
        for (let i = 0; i < mainParticleCount; i++) {
            const geometry = new THREE.SphereGeometry(sparkSize, 6, 6);
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 1
            });
            
            const particle = new THREE.Mesh(geometry, material);
            
            // 両輪から火花を出す
            const side = (i % 2 === 0) ? -1 : 1;
            const wheelOffset = side * 1.3;
            const backAngle = kart.rotation || 0;
            particle.position.set(
                kart.position.x + wheelOffset * Math.cos(backAngle) + (Math.random() - 0.5) * 0.8,
                kart.position.y + 0.2 + Math.random() * 0.4,
                kart.position.z - wheelOffset * Math.sin(backAngle) + (Math.random() - 0.5) * 0.8
            );
            
            this.scene.add(particle);
            
            particles.push({
                mesh: particle,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * sparkSpeed,
                    Math.random() * sparkSpeed * 0.8 + 2,
                    (Math.random() - 0.5) * sparkSpeed
                ),
                lifetime: sparkLife + Math.random() * 0.2,
                maxLifetime: sparkLife + 0.2,
                type: 'spark'
            });
        }
        
        // レベル2以上：グロー（光の玉）を追加
        if (allowGlow) {
            const glowSize = kart.driftLevel === 3 ? 0.8 : 0.5;
            const glowGeo = new THREE.SphereGeometry(glowSize, 8, 8);
            const glowMat = new THREE.MeshBasicMaterial({
                color: glowColor,
                transparent: true,
                opacity: 0.6
            });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            const wheelSide = kart.driftDirection < 0 ? -1.3 : 1.3;
            glow.position.set(
                kart.position.x + wheelSide,
                kart.position.y + 0.5,
                kart.position.z
            );
            this.scene.add(glow);
            particles.push({
                mesh: glow,
                velocity: new THREE.Vector3(0, 1, 0),
                lifetime: 0.2,
                maxLifetime: 0.25,
                type: 'spark'
            });
        }
        
        // レベル3：尾を引く残像エフェクト
        if (trailCount > 0) {
            for (let t = 0; t < trailCount; t++) {
                const trailGeo = new THREE.SphereGeometry(0.15, 4, 4);
                const trailMat = new THREE.MeshBasicMaterial({
                    color: 0xff66ff,
                    transparent: true,
                    opacity: 0.8
                });
                const trail = new THREE.Mesh(trailGeo, trailMat);
                trail.position.set(
                    kart.position.x + (Math.random() - 0.5) * 3,
                    kart.position.y + 0.3 + Math.random() * 0.5,
                    kart.position.z + (Math.random() - 0.5) * 3
                );
                this.scene.add(trail);
                particles.push({
                    mesh: trail,
                    velocity: new THREE.Vector3(
                        (Math.random() - 0.5) * 2,
                        Math.random() * 3 + 1,
                        (Math.random() - 0.5) * 2
                    ),
                    lifetime: 0.4 + Math.random() * 0.3,
                    maxLifetime: 0.7,
                    type: 'spark'
                });
            }
        }
        
        // カート自体にグロー色を適用（ドリフト中のカラーリング）
        if (kart.mesh && kart.driftLevel >= 1) {
            const glowIntensity = kart.driftLevel * 0.15;
            const c = new THREE.Color(color);
            kart.mesh.traverse(child => {
                if (child.isMesh && child.material && !child.material._originalColor) {
                    child.material._originalColor = child.material.color.clone();
                }
                if (child.isMesh && child.material && child.material._originalColor) {
                    child.material.color.copy(child.material._originalColor).lerp(c, glowIntensity);
                }
            });
        }
        
        const group = { particles, active: true };
        this.particleGroups.push(group);
        return group;
    }
    
    // Create boost flame effect
    createBoostFlame(kart) {
        const availableSlots = this.getAvailableSlots();
        if (availableSlots <= 0) return null;
        
        const particles = [];
        const numParticles = Math.min(2, availableSlots);  // 3 → 2 メモリ負荷軽減
        
        for (let i = 0; i < numParticles; i++) {
            const geometry = new THREE.ConeGeometry(0.2, 0.5, 4);
            const material = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? 0xff6600 : 0xffff00,
                transparent: true,
                opacity: 0.8
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.rotation.x = Math.PI;
            
            // Position behind kart
            const behind = new THREE.Vector3(
                -Math.sin(kart.rotation),
                0,
                -Math.cos(kart.rotation)
            );
            
            particle.position.copy(kart.position);
            particle.position.add(behind.multiplyScalar(2.5));
            particle.position.x += (i % 2 === 0 ? -0.6 : 0.6);
            particle.position.y += 0.5;
            
            this.scene.add(particle);
            
            particles.push({
                mesh: particle,
                velocity: behind.clone().multiplyScalar(-20),
                lifetime: 0.2,
                maxLifetime: 0.2,
                type: 'flame'
            });
        }
        
        const group = { particles, active: true };
        this.particleGroups.push(group);
        return group;
    }
    
    // Create dust/dirt particles
    createDust(position, intensity = 1) {
        const availableSlots = this.getAvailableSlots();
        if (availableSlots <= 0) return null;

        const particles = [];
        const numParticles = Math.min(Math.max(1, Math.floor(5 * intensity)), availableSlots);
        
        for (let i = 0; i < numParticles; i++) {
            const geometry = new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 4, 4);
            const material = new THREE.MeshBasicMaterial({
                color: 0x8b7355,
                transparent: true,
                opacity: 0.6
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            particle.position.x += (Math.random() - 0.5) * 2;
            particle.position.z += (Math.random() - 0.5) * 2;
            particle.position.y += 0.2;
            
            this.scene.add(particle);
            
            particles.push({
                mesh: particle,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 3,
                    Math.random() * 2 + 1,
                    (Math.random() - 0.5) * 3
                ),
                lifetime: 0.5 + Math.random() * 0.3,
                maxLifetime: 0.8,
                type: 'dust'
            });
        }
        
        const group = { particles, active: true };
        this.particleGroups.push(group);
        return group;
    }
    
    // Create explosion effect
    createExplosion(position) {
        const availableSlots = this.getAvailableSlots();
        if (availableSlots <= 0) return null;

        const particles = [];
        const totalParticles = Math.min(30, availableSlots);
        const numParticles = Math.max(1, Math.round(totalParticles * 0.67));
        const smokeParticles = Math.max(0, totalParticles - numParticles);
        
        // Core explosion particles
        for (let i = 0; i < numParticles; i++) {
            const geometry = new THREE.SphereGeometry(0.2 + Math.random() * 0.3, 6, 6);
            const colors = [0xff4400, 0xff6600, 0xffaa00, 0xffff00];
            const material = new THREE.MeshBasicMaterial({
                color: colors[Math.floor(Math.random() * colors.length)],
                transparent: true,
                opacity: 1
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            
            this.scene.add(particle);
            
            const angle = (i / numParticles) * Math.PI * 2;
            const speed = 5 + Math.random() * 10;
            
            particles.push({
                mesh: particle,
                velocity: new THREE.Vector3(
                    Math.cos(angle) * speed,
                    Math.random() * 8 + 2,
                    Math.sin(angle) * speed
                ),
                lifetime: 0.5 + Math.random() * 0.3,
                maxLifetime: 0.8,
                type: 'explosion'
            });
        }
        
        // Smoke particles
        for (let i = 0; i < smokeParticles; i++) {
            const geometry = new THREE.SphereGeometry(0.4 + Math.random() * 0.3, 6, 6);
            const material = new THREE.MeshBasicMaterial({
                color: 0x333333,
                transparent: true,
                opacity: 0.7
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            particle.position.y += 0.5;
            
            this.scene.add(particle);
            
            particles.push({
                mesh: particle,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 3,
                    Math.random() * 5 + 3,
                    (Math.random() - 0.5) * 3
                ),
                lifetime: 1 + Math.random() * 0.5,
                maxLifetime: 1.5,
                type: 'smoke',
                scale: 1
            });
        }
        
        const group = { particles, active: true };
        this.particleGroups.push(group);
        return group;
    }
    
    // Create item pickup sparkle
    createItemSparkle(position) {
        const availableSlots = this.getAvailableSlots();
        if (availableSlots <= 0) return null;

        const particles = [];
        const numParticles = Math.min(12, availableSlots);
        
        for (let i = 0; i < numParticles; i++) {
            const geometry = new THREE.OctahedronGeometry(0.15, 0);
            const material = new THREE.MeshBasicMaterial({
                color: 0xffff00,
                transparent: true,
                opacity: 1
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            
            this.scene.add(particle);
            
            const angle = (i / numParticles) * Math.PI * 2;
            const speed = 3 + Math.random() * 2;
            
            particles.push({
                mesh: particle,
                velocity: new THREE.Vector3(
                    Math.cos(angle) * speed,
                    Math.random() * 4 + 2,
                    Math.sin(angle) * speed
                ),
                lifetime: 0.4 + Math.random() * 0.2,
                maxLifetime: 0.6,
                type: 'sparkle',
                rotationSpeed: Math.random() * 10
            });
        }
        
        const group = { particles, active: true };
        this.particleGroups.push(group);
        return group;
    }
    
    // Create speed lines (motion blur effect)
    createSpeedLines(kart, intensity) {
        if (intensity < 0.7) return null;
        const availableSlots = this.getAvailableSlots();
        if (availableSlots <= 0) return null;
        
        const particles = [];
        const numLines = Math.min(Math.max(1, Math.floor((intensity - 0.7) * 10)), availableSlots);
        
        for (let i = 0; i < numLines; i++) {
            const geometry = new THREE.CylinderGeometry(0.02, 0.02, 3, 4);
            const material = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.3
            });
            
            const line = new THREE.Mesh(geometry, material);
            line.rotation.x = Math.PI / 2;
            line.rotation.z = kart.rotation;
            
            // Position around kart
            line.position.copy(kart.position);
            line.position.x += (Math.random() - 0.5) * 6;
            line.position.y += Math.random() * 3 + 1;
            line.position.z += (Math.random() - 0.5) * 6 - 3;
            
            this.scene.add(line);
            
            particles.push({
                mesh: line,
                velocity: new THREE.Vector3(0, 0, -30),
                lifetime: 0.15,
                maxLifetime: 0.15,
                type: 'speedline'
            });
        }
        
        const group = { particles, active: true };
        this.particleGroups.push(group);
        return group;
    }
    
    // Create shield break effect
    createShieldBreak(position) {
        const availableSlots = this.getAvailableSlots();
        if (availableSlots <= 0) return null;

        const particles = [];
        const numParticles = Math.min(15, availableSlots);
        
        for (let i = 0; i < numParticles; i++) {
            const geometry = new THREE.TetrahedronGeometry(0.3, 0);
            const material = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.8
            });
            
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            
            this.scene.add(particle);
            
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const speed = 5 + Math.random() * 5;
            
            particles.push({
                mesh: particle,
                velocity: new THREE.Vector3(
                    Math.sin(phi) * Math.cos(theta) * speed,
                    Math.cos(phi) * speed,
                    Math.sin(phi) * Math.sin(theta) * speed
                ),
                lifetime: 0.6 + Math.random() * 0.3,
                maxLifetime: 0.9,
                type: 'shard',
                rotationSpeed: new THREE.Vector3(
                    Math.random() * 10,
                    Math.random() * 10,
                    Math.random() * 10
                )
            });
        }
        
        const group = { particles, active: true };
        this.particleGroups.push(group);
        return group;
    }
    
    // Update all particles
    update(deltaTime) {
        for (let groupIndex = this.particleGroups.length - 1; groupIndex >= 0; groupIndex--) {
            const group = this.particleGroups[groupIndex];
            if (!group || !group.active || !group.particles || group.particles.length === 0) {
                this.disposeGroup(group);
                this.particleGroups.splice(groupIndex, 1);
                continue;
            }

            for (let particleIndex = group.particles.length - 1; particleIndex >= 0; particleIndex--) {
                const particle = group.particles[particleIndex];
                if (!particle || !particle.mesh) {
                    group.particles.splice(particleIndex, 1);
                    continue;
                }

                particle.lifetime -= deltaTime;

                if (particle.lifetime <= 0) {
                    this.disposeParticle(particle);
                    group.particles.splice(particleIndex, 1);
                    continue;
                }

                // Update position without per-frame clone allocations.
                particle.mesh.position.addScaledVector(particle.velocity, deltaTime);

                // Apply gravity to some particle types
                if (['spark', 'dust', 'explosion', 'sparkle', 'shard'].includes(particle.type)) {
                    particle.velocity.y -= 15 * deltaTime;
                }

                // Fade out
                const lifeRatio = particle.lifetime / particle.maxLifetime;
                particle.mesh.material.opacity = lifeRatio;

                // Type-specific updates
                if (particle.type === 'smoke') {
                    // Smoke expands
                    particle.scale = (particle.scale || 1) + deltaTime * 2;
                    particle.mesh.scale.setScalar(particle.scale);
                    particle.velocity.multiplyScalar(0.95);
                }

                if (particle.type === 'sparkle' || particle.type === 'shard') {
                    if (particle.rotationSpeed) {
                        if (typeof particle.rotationSpeed === 'number') {
                            particle.mesh.rotation.y += particle.rotationSpeed * deltaTime;
                        } else {
                            particle.mesh.rotation.x += particle.rotationSpeed.x * deltaTime;
                            particle.mesh.rotation.y += particle.rotationSpeed.y * deltaTime;
                            particle.mesh.rotation.z += particle.rotationSpeed.z * deltaTime;
                        }
                    }
                }
            }

            if (group.particles.length === 0) {
                group.active = false;
                this.particleGroups.splice(groupIndex, 1);
            }
        }

        this.trimToBudget();
    }
    
    // Clear all particles
    clear() {
        this.particleGroups.forEach(group => this.disposeGroup(group));
        this.particleGroups = [];
    }
    
    // メモリクリーンアップ - 非アクティブなパーティクルグループを解放
    cleanup(force = false) {
        for (let groupIndex = this.particleGroups.length - 1; groupIndex >= 0; groupIndex--) {
            const group = this.particleGroups[groupIndex];
            if (!group || !group.active || !group.particles || group.particles.length === 0) {
                this.disposeGroup(group);
                this.particleGroups.splice(groupIndex, 1);
                continue;
            }

            for (let particleIndex = group.particles.length - 1; particleIndex >= 0; particleIndex--) {
                const particle = group.particles[particleIndex];
                const shouldDrop = !particle || !particle.mesh || !particle.mesh.parent || particle.lifetime <= 0;
                if (shouldDrop) {
                    this.disposeParticle(particle);
                    group.particles.splice(particleIndex, 1);
                }
            }

            if (group.particles.length === 0) {
                this.disposeGroup(group);
                this.particleGroups.splice(groupIndex, 1);
            }
        }

        this.trimToBudget(force ? Math.floor(this.maxParticles * 0.75) : this.maxParticles);
    }
    
    // Get active particle count
    getActiveCount() {
        let count = 0;
        this.particleGroups.forEach(group => {
            count += group.particles.length;
        });
        return count;
    }
}

window.ParticleSystem = ParticleSystem;
