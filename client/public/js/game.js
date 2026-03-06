// Main Game Controller

class Game {
    constructor() {
        // Three.js setup
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        // Game objects
        this.track = null;
        this.karts = [];
        this.playerKart = null;
        this.aiControllers = [];
        
        // Managers
        this.itemManager = null;
        this.particleSystem = null;
        this.uiManager = null;
        
        // Game state
        this.gameState = 'loading'; // loading, menu, countdown, racing, paused, finished
        this.difficulty = 'normal';
        this.totalLaps = 3;
        this.numRacers = 8;
        
        // Race state
        this.raceTime = 0;
        this.raceStartTime = 0;
        this.countdownStartTime = 0;
        this.countdownForwardPressedAt = null;
        this.countdownForwardHeld = false;
        
        // Input state
        this.keys = {};
        
        // Camera settings
        this.cameraDistance = 15;
        this.cameraHeight = 6;
        this.cameraLookAhead = 8;
        
        // Performance
        this.lastTime = 0;
        this.deltaTime = 0;
        this.fps = 60;
        this.fpsUpdateTimer = 0;
        
        // メモリ管理
        this.memoryCleanupTimer = 0;
        this.memoryCleanupInterval = 30;  // 30秒ごとにクリーンアップ
        this.baseMemoryCleanupInterval = 30;
        this.performanceMode = false;
        this.performanceProfileTimer = 0;
        this.effectDensity = 1;
        this.currentPerformanceProfile = null;
        this.effectSpawnTimers = {
            playerDrift: 0,
            playerBoost: 0,
            playerDust: 0,
            playerSpeedLines: 0,
            aiDrift: 0
        };
        this.cameraOffset = new THREE.Vector3();
        this.cameraTargetPos = new THREE.Vector3();
        this.cameraLookTargetBuffer = new THREE.Vector3();
        this.cameraMotionVector = new THREE.Vector3();
        this.cameraBankAngle = 0;
        
        // Initialize
        this.init();
    }
    
    async init() {
        // Create UI manager
        this.uiManager = new UIManager();
        this.uiManager.updateLoading(10, 'Initializing...');
        
        // Setup Three.js
        this.setupRenderer();
        this.uiManager.updateLoading(20, 'Setting up renderer...');
        
        this.setupScene();
        this.uiManager.updateLoading(30, 'Creating scene...');
        
        this.setupCamera();
        this.uiManager.updateLoading(40, 'Setting up camera...');
        
        this.setupLights();
        this.uiManager.updateLoading(50, 'Adding lights...');
        
        // Track will be created when race starts (based on course selection)
        this.track = null;
        this.uiManager.updateLoading(70, 'Preparing track system...');
        
        // Create particle system
        this.particleSystem = new ParticleSystem(this.scene);
        this.applyPerformanceProfile(true);
        this.uiManager.updateLoading(80, 'Setting up effects...');
        
        // Create item manager (track will be set when race starts)
        this.itemManager = new ItemManager(this.scene, null);
        this.uiManager.updateLoading(85, 'Loading items...');
        
        // Setup input
        this.setupInput();
        this.uiManager.updateLoading(90, 'Configuring controls...');
        
        // Initialize audio
        await window.audioManager.init();
        this.uiManager.updateLoading(95, 'Loading audio...');
        
        // Setup resize handler
        window.addEventListener('resize', () => this.onResize());
        
        // Done loading
        this.uiManager.updateLoading(100, 'Ready!');
        
        setTimeout(() => {
            this.uiManager.hideLoading();
            this.uiManager.showMainMenu();
            this.gameState = 'menu';
            
            // Start background music
            window.audioManager.playLocalMusic('audio/01_Opening_Theme.mp3');
        }, 500);
        
        // Start game loop
        this.lastTime = performance.now();
        this.gameLoop();
    }
    
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: false,  // アンチエイリアスを完全に無効化（パフォーマンス向上）
            powerPreference: 'high-performance',
            stencil: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(1);  // 常に1（パフォーマンス最優先）
        this.renderer.shadowMap.enabled = false;  // シャドウを無効化（大幅なパフォーマンス向上）
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        
        // Optimization: frustum culling is on by default
        this.renderer.sortObjects = true;
        
        document.getElementById('game-container').appendChild(this.renderer.domElement);
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        
        // デフォルトの背景色（後でコース選択時に変更）
        this.scene.background = new THREE.Color(0x5BC0F8);
        this.scene.fog = new THREE.Fog(0x5BC0F8, 400, 900);
    }
    
    // コースタイプに応じたシーン設定を更新
    updateSceneForCourse() {
        const courseType = window.gameSettings?.courseType || 'grassland';
        
        let bgColor, fogColor;
        switch(courseType) {
            case 'snow':
                bgColor = 0xE0FFFF;  // 明るい水色（雪空）
                fogColor = 0xCCE0FF;
                break;
            case 'castle':
                bgColor = 0x2F2F4F;  // 暗い紫がかったグレー
                fogColor = 0x1F1F3F;
                break;
            case 'grassland':
            default:
                bgColor = 0x5BC0F8;  // マリオカート風の明るい青空
                fogColor = 0x5BC0F8;
                break;
        }
        
        this.scene.background = new THREE.Color(bgColor);
        this.scene.fog = new THREE.Fog(fogColor, 400, 900);

        // コースごとのパフォーマンス設定
        // すべてのコースで負荷軽減を有効化
        this.performanceMode = true;
        this.baseMemoryCleanupInterval = courseType === 'castle' ? 6 : courseType === 'snow' ? 8 : 10;
        this.memoryCleanupInterval = this.baseMemoryCleanupInterval;
        this.memoryCleanupTimer = 0;
        this.performanceProfileTimer = 0;
        this.currentPerformanceProfile = null;
        this.applyPerformanceProfile(true);
    }

    getPerformanceProfile() {
        const courseType = window.gameSettings?.courseType || 'grassland';
        const baseProfiles = {
            grassland: { particleBudget: 160, effectDensity: 0.92, dynamicEffects: 44, envInterval: 1 / 30 },
            snow: { particleBudget: 140, effectDensity: 0.84, dynamicEffects: 40, envInterval: 1 / 24 },
            castle: { particleBudget: 125, effectDensity: 0.76, dynamicEffects: 34, envInterval: 1 / 20 }
        };
        const profile = baseProfiles[courseType] || baseProfiles.grassland;

        let stressLevel = 0;
        if (this.performanceMode) stressLevel += 1;
        if (this.fps < 52) stressLevel += 1;
        if (this.fps < 44) stressLevel += 1;
        if (this.fps < 36) stressLevel += 1;
        if (this.particleSystem && this.particleSystem.getActiveCount() > this.particleSystem.maxParticles * 0.82) {
            stressLevel += 1;
        }

        const environmentScale = 1 + stressLevel * 0.55;

        return {
            particleBudget: Math.max(70, profile.particleBudget - stressLevel * 18),
            effectDensity: Math.max(0.45, profile.effectDensity - stressLevel * 0.1),
            dynamicEffects: Math.max(16, profile.dynamicEffects - stressLevel * 5),
            envInterval: Math.min(0.18, profile.envInterval * environmentScale),
            cleanupInterval: Math.max(4, this.baseMemoryCleanupInterval - stressLevel * 1.2)
        };
    }

    applyPerformanceProfile(force = false) {
        const profile = this.getPerformanceProfile();
        const profileKey = JSON.stringify(profile);

        if (!force && this.currentPerformanceProfile === profileKey) {
            return;
        }

        this.currentPerformanceProfile = profileKey;
        this.effectDensity = profile.effectDensity;
        this.memoryCleanupInterval = profile.cleanupInterval;

        if (this.particleSystem) {
            if (typeof this.particleSystem.setBudget === 'function') {
                this.particleSystem.setBudget(profile.particleBudget);
            } else {
                this.particleSystem.maxParticles = profile.particleBudget;
            }
        }

        if (this.track && typeof this.track.setPerformanceProfile === 'function') {
            this.track.setPerformanceProfile({
                effectQuality: profile.effectDensity,
                maxDynamicEffects: profile.dynamicEffects,
                environmentAnimationInterval: profile.envInterval
            });
        }
    }

    updatePerformanceProfile(deltaTime) {
        this.performanceProfileTimer += deltaTime;
        if (this.performanceProfileTimer < 1) {
            return;
        }

        this.performanceProfileTimer = 0;
        this.applyPerformanceProfile();
    }

    resetRuntimeTuningState() {
        this.memoryCleanupTimer = 0;
        this.performanceProfileTimer = 0;
        this.currentPerformanceProfile = null;
        Object.keys(this.effectSpawnTimers).forEach(key => {
            this.effectSpawnTimers[key] = 0;
        });

        this.lastCameraTarget = null;
        this.lastCameraRotation = 0;
        this.smoothCameraPos = null;
        this.smoothLookTarget = null;
        this.cameraBankAngle = 0;
    }
    
    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            70,
            window.innerWidth / window.innerHeight,
            0.1,
            1500  // 遠くまで見えるように
        );
        this.camera.position.set(0, 10, -20);
    }
    
    setupLights() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);
        
        // Directional light (sun)
        const sun = new THREE.DirectionalLight(0xffffff, 0.8);
        sun.position.set(100, 100, 50);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 10;
        sun.shadow.camera.far = 400;
        sun.shadow.camera.left = -150;
        sun.shadow.camera.right = 150;
        sun.shadow.camera.top = 150;
        sun.shadow.camera.bottom = -150;
        this.scene.add(sun);
        
        // Hemisphere light for sky color
        const hemi = new THREE.HemisphereLight(0x87CEEB, 0x228B22, 0.3);
        this.scene.add(hemi);
    }
    
    setupInput() {
        // Keyboard input
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            // Pause toggle
            if (e.code === 'KeyP' || e.code === 'Escape') {
                if (this.gameState === 'racing') {
                    this.pauseRace();
                } else if (this.gameState === 'paused') {
                    this.resumeRace();
                }
            }
            
            // Resume audio context on first input
            window.audioManager.resume();
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }
    
    updatePlayerInput() {
        if (!this.playerKart) return;
        
        const input = this.playerKart.input;
        
        input.forward = this.keys['ArrowUp'] || this.keys['KeyW'];
        input.backward = this.keys['ArrowDown'] || this.keys['KeyS'];
        input.left = this.keys['ArrowLeft'] || this.keys['KeyA'];
        input.right = this.keys['ArrowRight'] || this.keys['KeyD'];
        input.drift = this.keys['Space'];
        
        // Item use (Shift or Z/X key)
        // ルーレット回転中はアイテム使用を禁止
        const isRouletteSpinning = this.uiManager && this.uiManager.isRouletteRunning;
        if (this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.keys['KeyZ'] || this.keys['KeyX']) {
            if (this.playerKart.currentItem && !isRouletteSpinning) {
                this.playerKart.useItem(this);
            }
        }
    }
    
    async startRace(difficulty = 'normal') {
        this.difficulty = difficulty;
        this.gameState = 'countdown';
        
        // CC別速度倍率を設定（50cc=1.0, 100cc=1.3, 150cc=1.6）
        this.ccSpeedMultiplier = difficulty === 'easy' ? 1.0 : difficulty === 'normal' ? 1.3 : 1.6;
        
        // Clear any existing karts and track
        this.clearRace();
        
        // Create new track based on selected course type
        this.track = new Track(this.scene);
        
        // Update item manager with new track
        if (this.itemManager) {
            this.itemManager.track = this.track;
        }
        
        // Update scene background based on course type
        this.updateSceneForCourse();
        
        // Create karts
        this.createKarts();
        
        // Position karts at start
        this.positionKartsAtStart();
        
        // Show HUD
        this.uiManager.showHUD();
        
        // Start race music
        window.audioManager.stopMusic();
        // コースごとにBGM切り替え
        let bgm = 'audio/02_Moo_Moo_Farm.mp3';
        if (window.gameSettings?.courseType === 'snow') bgm = 'audio/03_Frappe_Snowland.mp3';
        else if (window.gameSettings?.courseType === 'castle') bgm = 'audio/04_Bowser_Castle.mp3';
        window.audioManager.playLocalMusic(bgm);
        
        // Start engine sounds
        window.audioManager.startEngine();
        
        // Show countdown
        this.countdownStartTime = performance.now();
        this.countdownForwardPressedAt = null;
        this.countdownForwardHeld = false;
        await this.uiManager.showCountdown();
        
        // Start race
        this.applyGridLaunches();
        this.gameState = 'racing';
        this.raceStartTime = performance.now();
        this.raceTime = 0;
        
        // Set race start time for each kart (to prevent false lap count at start)
        this.karts.forEach(kart => {
            kart.raceStartTime = this.raceStartTime;
        });
    }
    
    createKarts() {
        // Create player kart
        this.playerKart = new Kart(this.scene, 0, true, 'Player');
        // CC別速度倍率を適用
        if (this.ccSpeedMultiplier) {
            this.playerKart.maxSpeed *= this.ccSpeedMultiplier;
            this.playerKart.acceleration *= this.ccSpeedMultiplier;
        }
        this.karts.push(this.playerKart);
        
        // Create AI karts
        for (let i = 1; i < this.numRacers; i++) {
            const aiKart = new Kart(this.scene, i, false, RacerNames[i]);
            // CC別速度倍率をAIにも適用
            if (this.ccSpeedMultiplier) {
                aiKart.maxSpeed *= this.ccSpeedMultiplier;
                aiKart.acceleration *= this.ccSpeedMultiplier;
            }
            this.karts.push(aiKart);
            
            const aiController = new AIController(aiKart, this.track, this.difficulty);
            this.aiControllers.push(aiController);
        }
    }
    
    positionKartsAtStart() {
        const startPositions = this.track.getStartPositions(this.numRacers);
        
        // Shuffle positions for AI variety (player always in back)
        this.karts.forEach((kart, index) => {
            const pos = startPositions[index];
            kart.setPosition(pos.x, pos.y, pos.z, pos.rotation);
            kart.lap = 0;
            kart.checkpoint = 0;
            kart.lastCheckpoint = -1;
            kart.finished = false;
            kart.finishTime = 0;
            kart.totalProgress = 0;
            kart.speed = 0;
            kart.currentItem = null;
            kart.hasShield = false;
            kart.isShrunken = false;
            kart.isFrozen = false;
            kart.isSpunOut = false;
            kart.isDrifting = false;
            kart.driftLevel = 0;
            kart.driftTime = 0;
            kart.driftCharge = 0;
            kart.boostTime = 0;
            kart.burnoutTimer = 0;
            kart.finalLapShown = false;
        });
    }
    
    clearRace() {
        // Remove all karts with geometry/material disposal
        this.karts.forEach(kart => {
            this.disposeObject(kart.mesh);
            this.scene.remove(kart.mesh);
        });
        this.karts = [];
        this.aiControllers = [];
        this.playerKart = null;
        
        // Clear items
        if (this.itemManager) {
            this.itemManager.clear();
        }
        
        // Clear particles
        if (this.particleSystem) {
            this.particleSystem.clear();
        }
        
        // Remove old track with full disposal
        if (this.track) {
            // Remove all enemies
            if (this.track.enemies) {
                this.track.enemies.forEach(enemy => {
                    this.disposeObject(enemy.mesh);
                    this.scene.remove(enemy.mesh);
                });
            }
            this.disposeObject(this.track.trackGroup);
            this.scene.remove(this.track.trackGroup);
            this.track = null;
        }

        this.resetRuntimeTuningState();
    }
    
    // メモリ解放用ヘルパー
    disposeObject(obj) {
        if (!obj) return;
        obj.traverse(child => {
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        if (mat.map) mat.map.dispose();
                        mat.dispose();
                    });
                } else {
                    if (child.material.map) child.material.map.dispose();
                    child.material.dispose();
                }
            }
        });
    }
    
    pauseRace() {
        if (this.gameState !== 'racing' && this.gameState !== 'countdown') return;
        
        this.gameState = 'paused';
        this.uiManager.showPauseMenu();
        window.audioManager.stopEngine();
    }
    
    resumeRace() {
        if (this.gameState !== 'paused') return;
        
        this.gameState = 'racing';
        this.uiManager.hidePauseMenu();
        window.audioManager.startEngine();
    }
    
    restartRace() {
        this.gameState = 'menu';
        this.uiManager.hideAllScreens();
        this.clearRace();
        
        // Start new race
        this.startRace(this.difficulty);
    }
    
    returnToMenu() {
        this.gameState = 'menu';
        this.clearRace();
        this.uiManager.showMainMenu();
        
        window.audioManager.stopEngine();
        window.audioManager.stopMusic();
        window.audioManager.playMusic('menu');
    }
    
    // 定期的なメモリクリーンアップ
    performMemoryCleanup(aggressive = false) {
        // 非アクティブなアイテムのメッシュを解放
        if (this.itemManager) {
            this.itemManager.cleanupInactiveItems();
        }
        
        // パーティクルシステムのクリーンアップ
        if (this.particleSystem) {
            this.particleSystem.cleanup(aggressive);
        }

        // トラック上の一時オブジェクトも定期的に回収
        if (this.track && typeof this.track.cleanupTransientObjects === 'function') {
            this.track.cleanupTransientObjects();
        }

        // レンダーリストの解放は不要（フレームドロップの原因になる）
        // renderer.info.resetもカウンターリセットのみなので不要
    }
    
    finishRace() {
        this.gameState = 'finished';
        
        window.audioManager.stopEngine();
        window.audioManager.stopMusic();
        window.audioManager.playVictoryFanfare();
        
        // Build results
        const results = this.karts
            .sort((a, b) => {
                if (a.finished && b.finished) {
                    return a.finishTime - b.finishTime;
                }
                if (a.finished) return -1;
                if (b.finished) return 1;
                return b.totalProgress - a.totalProgress;
            })
            .map((kart, index) => ({
                name: kart.name,
                time: kart.finishTime || this.raceTime,
                isPlayer: kart.isPlayer,
                position: index + 1
            }));
        
        const playerResult = results.find(r => r.isPlayer);
        const course = window.gameSettings?.courseType || 'grassland';
        const difficulty = this.difficulty || 'normal';
        const playerTimeMs = playerResult ? Math.round(playerResult.time) : 0;
        
        // Fetch leaderboard and check if player qualifies for top 10
        this.fetchLeaderboardAndShow(results, playerResult, course, difficulty, playerTimeMs);
    }
    
    async fetchLeaderboardAndShow(results, playerResult, course, difficulty, playerTimeMs) {
        let leaderboard = [];
        let qualifies = false;
        let rank = 0;
        
        try {
            // Fetch current leaderboard
            const lbRes = await fetch(`/api/leaderboard?course=${encodeURIComponent(course)}&difficulty=${encodeURIComponent(difficulty)}`);
            if (lbRes.ok) {
                leaderboard = await lbRes.json();
            }
            
            // Check if player qualifies
            if (playerResult && playerTimeMs > 0) {
                const checkRes = await fetch('/api/leaderboard/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ course, difficulty, raceTimeMs: playerTimeMs })
                });
                if (checkRes.ok) {
                    const checkData = await checkRes.json();
                    qualifies = checkData.qualifies;
                    rank = checkData.rank;
                }
            }
        } catch (err) {
            console.warn('Failed to fetch leaderboard:', err);
        }
        
        // Show the leaderboard screen
        this.uiManager.showLeaderboard({
            raceResults: results,
            leaderboard: leaderboard,
            playerResult: playerResult,
            qualifies: qualifies,
            rank: rank,
            course: course,
            difficulty: difficulty,
            playerTimeMs: playerTimeMs,
            totalLaps: this.totalLaps,
            game: this
        });
    }
    
    gameLoop() {
        requestAnimationFrame(() => this.gameLoop());
        
        const currentTime = performance.now();
        this.deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;
        
        // Update FPS counter
        this.fpsUpdateTimer += this.deltaTime;
        if (this.fpsUpdateTimer >= 0.5) {
            this.fps = Math.round(1 / this.deltaTime);
            this.fpsUpdateTimer = 0;
        }
        
        // Update based on game state
        if (this.gameState === 'racing') {
            this.updateRace();
        } else if (this.gameState === 'countdown') {
            this.updateCountdown();
        }
        
        // Always render
        this.render();
    }
    
    updateRace() {
        try {
            // Update race time
            this.raceTime = performance.now() - this.raceStartTime;
            this.updatePerformanceProfile(this.deltaTime);
            
            // Update player input FIRST
            this.updatePlayerInput();
            
            // Update AI inputs BEFORE updating karts (critical fix!)
            this.aiControllers.forEach(ai => {
                ai.update(this.deltaTime, this.karts);
            });
            
            // Now update all karts with their inputs set
            this.karts.forEach(kart => {
                kart.update(this.deltaTime, this.track);
            });
            
            // Handle kart collisions
            this.handleKartCollisions();
            
            // 敵キャラクター（ドッスン、ノコノコ）の更新と衝突判定
            this.track.updateEnemies(this.deltaTime);
            this.checkEnemyCollisions();
            
            // Update items
            this.itemManager.update(this.deltaTime, this.karts);
            
            // Update track (item box respawns, etc.)
            this.track.update(this.deltaTime);
            
            // Update particles
            this.updateParticles();
            this.particleSystem.update(this.deltaTime);
            
            // Update positions
            this.updateRacePositions();
            
            // Check for lap completion and race finish
            this.checkLapCompletion();
            
            // Update camera
            this.updateCamera();
            
            // Update audio
            this.updateAudio();
            
            // Update UI
            this.updateUI();
            
            // 定期的なメモリクリーンアップ
            this.memoryCleanupTimer += this.deltaTime;
            const aggressiveCleanup = this.fps < 40 || (
                this.particleSystem &&
                this.particleSystem.getActiveCount() > this.particleSystem.maxParticles * 0.88
            );

            if (this.memoryCleanupTimer >= this.memoryCleanupInterval) {
                this.memoryCleanupTimer = 0;
                this.performMemoryCleanup(aggressiveCleanup);
            } else if (aggressiveCleanup && this.memoryCleanupTimer >= Math.min(3, this.memoryCleanupInterval * 0.5)) {
                this.memoryCleanupTimer = 0;
                this.performMemoryCleanup(true);
            }
        } catch (e) {
            console.error('Error in updateRace:', e);
        }
    }
    
    updateCountdown() {
        // カウントダウン中はプレイヤーの背後に即座に移動
        if (!this.playerKart) return;
        this.updatePlayerInput();
        
        const kart = this.playerKart;
        if (kart.input.forward) {
            if (!this.countdownForwardHeld) {
                this.countdownForwardHeld = true;
                this.countdownForwardPressedAt = performance.now();
            }
        } else {
            this.countdownForwardHeld = false;
            this.countdownForwardPressedAt = null;
        }
        const baseCameraDistance = 10;
        const baseCameraHeight = 6;
        
        this.cameraOffset.set(
            -Math.sin(kart.rotation) * baseCameraDistance,
            baseCameraHeight,
            -Math.cos(kart.rotation) * baseCameraDistance
        );
        
        this.cameraTargetPos.copy(kart.position).add(this.cameraOffset);
        this.camera.position.lerp(this.cameraTargetPos, 0.6);
        
        const lookAhead = 6;
        this.cameraLookTargetBuffer.copy(kart.position);
        this.cameraLookTargetBuffer.x += Math.sin(kart.rotation) * lookAhead;
        this.cameraLookTargetBuffer.z += Math.cos(kart.rotation) * lookAhead;
        this.cameraLookTargetBuffer.y += 2;
        
        this.camera.lookAt(this.cameraLookTargetBuffer);
        
        // カメラスムージング状態を初期化（レース開始時にジャンプしないように）
        this.lastCameraTarget = this.camera.position.clone();
        this.lastCameraRotation = this.getStableCameraHeading(kart);
        this.smoothCameraPos = this.camera.position.clone();
        this.smoothLookTarget = this.cameraLookTargetBuffer.clone();
    }

    applyGridLaunches() {
        const now = performance.now();
        if (this.playerKart && this.countdownForwardHeld && this.countdownForwardPressedAt) {
            const heldMs = now - this.countdownForwardPressedAt;
            const adjustedHeldMs = heldMs / (this.playerKart.startBoostSkill || 1);
            if (adjustedHeldMs > 1500) {
                this.playerKart.triggerBurnout(0.85);
            } else if (adjustedHeldMs >= 180 && adjustedHeldMs <= 700) {
                const ideal = 360;
                const quality = Math.max(0, 1 - Math.abs(adjustedHeldMs - ideal) / 340);
                this.playerKart.applyStartBoost(
                    0.45 + quality * 0.45,
                    1.14 + quality * 0.14,
                    12 + quality * 16
                );
                if (window.audioManager) {
                    window.audioManager.playSound(quality > 0.7 ? 'boost_big' : 'boost');
                }
            }
        }

        this.aiControllers.forEach((ai, index) => {
            const kart = ai.kart;
            const luck = Math.random();
            const skillBias = ai.settings.maxSpeedMultiplier + (kart.startBoostSkill || 1) * 0.08;
            if (luck < 0.25 + skillBias * 0.08) {
                const quality = Math.min(1, 0.35 + skillBias * 0.35 + Math.random() * 0.2);
                kart.applyStartBoost(
                    0.25 + quality * 0.28,
                    1.06 + quality * 0.1,
                    8 + quality * 10 + index * 0.2
                );
            }
        });
    }
    
    handleKartCollisions() {
        for (let i = 0; i < this.karts.length; i++) {
            for (let j = i + 1; j < this.karts.length; j++) {
                if (this.karts[i].checkCollision(this.karts[j])) {
                    const kartA = this.karts[i];
                    const kartB = this.karts[j];
                    
                    // スター状態のカートが体当たりした場合、相手をクラッシュさせる
                    if (kartA.starActive && !kartB.starActive) {
                        if (!kartB.isSpunOut && kartB.invincibilityTimer <= 0) {
                            kartB.spinOut();
                            if (window.audioManager) {
                                window.audioManager.playSound('crash');
                            }
                        }
                    } else if (kartB.starActive && !kartA.starActive) {
                        if (!kartA.isSpunOut && kartA.invincibilityTimer <= 0) {
                            kartA.spinOut();
                            if (window.audioManager) {
                                window.audioManager.playSound('crash');
                            }
                        }
                    } else {
                        // 通常の衝突処理
                        kartA.handleCollision(kartB);
                    }
                }
            }
        }
    }
    
    // 敵キャラクター（ドッスン、ノコノコ）との衝突判定
    checkEnemyCollisions() {
        this.karts.forEach(kart => {
            // 無敵状態やスピンアウト中はスキップ
            if (kart.invincibilityTimer > 0 || kart.isSpunOut || kart.starActive) return;
            
            const enemy = this.track.checkEnemyCollision(kart.position);
            if (enemy) {
                // AIカートはワンワン・炎バー・ペンギン・テレサ（ゴースト）ではクラッシュしない
                if (!kart.isPlayer && (enemy.type === 'chainChomp' || enemy.type === 'fire_bar' || enemy.type === 'penguin' || enemy.type === 'boo')) {
                    return;
                }
                // シールドがあれば防ぐ
                if (kart.hasShield) {
                    kart.hasShield = false;
                    if (window.audioManager) {
                        window.audioManager.playSound('shield_break');
                    }
                } else {
                    // クラッシュ
                    kart.spinOut();
                    if (window.audioManager) {
                        window.audioManager.playSound('crash');
                    }
                    // カロンはクラッシュさせた後、一定時間追跡モード解除
                    if (enemy.type === 'dry_bones' && this.track.startDryBonesCooldown) {
                        this.track.startDryBonesCooldown(enemy);
                    }
                }
            }
        });
    }
    
    updateRacePositions() {
        // ゴール済みAIはfixedPositionを使い、未ゴールは進行度で順位を決定
        // まず未ゴールカートのみ進行度でソート
        const unfinished = this.karts.filter(k => !k.finished);
        unfinished.forEach(kart => {
            kart._sortProgress = kart.totalProgress;
        });
        const sortedUnfinished = [...unfinished].sort((a, b) => b._sortProgress - a._sortProgress);

        // ゴール済みAIカートの順位はfixedPositionを使う
        this.karts.forEach(kart => {
            if (kart.finished && !kart.isPlayer && typeof kart.fixedPosition === 'number') {
                kart.racePosition = kart.fixedPosition;
            }
        });

        // プレイヤーと未ゴールAIの順位を再計算
        // 1. ゴール済みAIの数をカウント
        const finishedAICount = this.karts.filter(k => k.finished && !k.isPlayer).length;
        // 2. 未ゴールカートを進行度順に順位付け（ゴール済みAIの数を加算）
        sortedUnfinished.forEach((kart, idx) => {
            kart.racePosition = finishedAICount + idx + 1;
        });
    }
    
    checkLapCompletion() {
        this.karts.forEach(kart => {
            if (kart.finished) return;
            // Check if crossed finish line (lap 3 completed)
            if (kart.lap >= this.totalLaps) {
                kart.finished = true;
                kart.finishTime = this.raceTime;
                // ゴール時点で順位を確定（AIのみ）
                if (!kart.isPlayer) {
                    // ゴール済みカート数+1が順位
                    const finishedCount = this.karts.filter(k => k.finished && typeof k.fixedPosition === 'number').length;
                    kart.fixedPosition = finishedCount + 1;
                }
                if (kart.isPlayer) {
                    // Player finished!
                    window.audioManager.playSound('race_finish');
                    setTimeout(() => this.finishRace(), 2000);
                }
            }
            
            // Final lap notification
            if (kart.isPlayer && kart.lap === this.totalLaps - 1 && !kart.finalLapShown) {
                kart.finalLapShown = true;
                this.uiManager.showFinalLap();
            }
        });
        
        // Check if all karts finished
        const allFinished = this.karts.every(k => k.finished);
        if (allFinished && this.gameState === 'racing') {
            this.finishRace();
        }
    }
    
    updateParticles() {
        if (!this.playerKart) return;

        const density = Utils.clamp(this.effectDensity || 1, 0.35, 1);
        const perf = this.performanceMode;
        const activeParticles = this.particleSystem ? this.particleSystem.getActiveCount() : 0;
        const particlePressure = this.particleSystem
            ? activeParticles / Math.max(1, this.particleSystem.maxParticles)
            : 0;
        const pressureScale = particlePressure > 0.85 ? 1.4 : particlePressure > 0.65 ? 1.15 : 1;
        
        // Drift sparks
        if (this.playerKart.isDrifting && this.playerKart.driftLevel >= 1) {
            const driftInterval = this.getEffectInterval(0.05, perf ? 0.14 : 0.1) * pressureScale;
            if (this.shouldEmitEffect('playerDrift', driftInterval)) {
                this.particleSystem.createDriftSparks(this.playerKart);
            }
        }
        
        // Boost flames（パーティクル生成を大幅に制限）
        if (this.playerKart.boostTime > 0) {
            const boostInterval = this.getEffectInterval(0.06, perf ? 0.18 : 0.14) * pressureScale;
            if (this.shouldEmitEffect('playerBoost', boostInterval)) {
                this.particleSystem.createBoostFlame(this.playerKart);
            }
        }
        
        // Grass dust
        if (this.playerKart.onGrass && this.playerKart.speed > 20) {
            const dustInterval = this.getEffectInterval(0.08, perf ? 0.24 : 0.16) * pressureScale;
            if (this.shouldEmitEffect('playerDust', dustInterval)) {
                this.particleSystem.createDust(this.playerKart.position, (this.playerKart.speed / 50) * density);
            }
        }
        
        // Speed lines at high speed（頻度を制限）
        const speedRatio = this.playerKart.speed / this.playerKart.maxSpeed;
        if (speedRatio > 0.82 && density > 0.6) {
            const speedLineInterval = this.getEffectInterval(0.08, perf ? 0.24 : 0.16) * pressureScale;
            if (this.shouldEmitEffect('playerSpeedLines', speedLineInterval)) {
                this.particleSystem.createSpeedLines(this.playerKart, speedRatio);
            }
        }
        
        // AI particles (less frequent for performance)
        const aiInterval = this.getEffectInterval(0.12, perf ? 0.34 : 0.24) * pressureScale;
        if (this.shouldEmitEffect('aiDrift', aiInterval)) {
            let emitted = 0;
            const aiBudget = Math.max(1, Math.round((perf ? 1 : 2) * density * 1.6));
            this.karts.forEach(kart => {
                if (emitted >= aiBudget || kart.isPlayer) return;
                if (kart.isDrifting && kart.driftLevel >= 2) {
                    this.particleSystem.createDriftSparks(kart);
                    emitted += 1;
                }
            });
        }
    }

    getEffectInterval(minInterval, maxInterval) {
        return Utils.lerp(maxInterval, minInterval, Utils.clamp(this.effectDensity || 1, 0.35, 1));
    }

    shouldEmitEffect(timerKey, interval) {
        if (!this.effectSpawnTimers[timerKey]) {
            this.effectSpawnTimers[timerKey] = 0;
        }

        this.effectSpawnTimers[timerKey] += this.deltaTime;
        if (this.effectSpawnTimers[timerKey] < interval) {
            return false;
        }

        this.effectSpawnTimers[timerKey] = 0;
        return true;
    }

    getDampingFactor(response, deltaTime = this.deltaTime) {
        return 1 - Math.exp(-response * Math.max(0, deltaTime));
    }

    getAngleDelta(fromAngle, toAngle) {
        let diff = toAngle - fromAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return diff;
    }

    getStableCameraHeading(kart) {
        let targetRotation = kart.rotation;
        const speedRatio = Utils.clamp(
            Math.abs(kart.speed) / Math.max(1, kart.maxSpeed || 1),
            0,
            1
        );

        this.cameraMotionVector.set(kart.velocity.x, 0, kart.velocity.z);
        if (this.cameraMotionVector.lengthSq() > 0.0004 && speedRatio > 0.08) {
            const movementHeading = Math.atan2(this.cameraMotionVector.x, this.cameraMotionVector.z);
            const movementOffset = Utils.clamp(
                this.getAngleDelta(kart.rotation, movementHeading),
                -0.42,
                0.42
            );
            const movementWeight = Utils.clamp(0.22 + speedRatio * 0.3, 0.22, 0.52);
            targetRotation += movementOffset * movementWeight;
        }

        return targetRotation;
    }
    
    updateCamera() {
        if (!this.playerKart) return;
        
        const kart = this.playerKart;
        
        // NaN チェック
        if (isNaN(kart.position.x) || isNaN(kart.position.y) || isNaN(kart.position.z)) {
            console.error('Kart position is NaN, skipping camera update');
            return;
        }
        
        // === 安定カメラ追従 ===
        if (!this.lastCameraTarget) {
            this.lastCameraTarget = kart.position.clone();
            this.lastCameraRotation = this.getStableCameraHeading(kart);
            this.smoothCameraPos = this.camera.position.clone();
            this.smoothLookTarget = kart.position.clone();
        }
        
        // ジュゲム救出時はカメラを即座に追従させる
        const isRescue = kart.isBeingRescued;
        const isStartPhase = this.raceTime < 1.5;
        const forceFastFollow = isStartPhase || isRescue;
        
        // カメラ距離と高さ（より近く背後に密着）
        const baseCameraDistance = 10;
        const baseCameraHeight = 6;
        
        // ===== 回転のスムージング（FPS非依存）=====
        const targetRotation = this.getStableCameraHeading(kart);
        let smoothRotation = this.lastCameraRotation;
        
        const rotDiff = this.getAngleDelta(smoothRotation, targetRotation);
        const turnSeverity = Utils.clamp(Math.abs(rotDiff) / 0.6, 0, 1);
        
        const rotationResponse = forceFastFollow ? 10 : Utils.lerp(4.8, 7.2, turnSeverity);
        const rotationAlpha = this.getDampingFactor(rotationResponse);
        const maxRotationStep = (forceFastFollow ? 8 : Utils.lerp(3.4, 6, turnSeverity)) * this.deltaTime;
        smoothRotation += Utils.clamp(rotDiff * rotationAlpha, -maxRotationStep, maxRotationStep);
        this.lastCameraRotation = smoothRotation;
        
        // ===== カメラ位置 =====
        this.cameraOffset.set(
            -Math.sin(smoothRotation) * baseCameraDistance,
            baseCameraHeight,
            -Math.cos(smoothRotation) * baseCameraDistance
        );
        this.cameraTargetPos.copy(kart.position).add(this.cameraOffset);

        if (!this.smoothCameraPos) {
            this.smoothCameraPos = this.cameraTargetPos.clone();
        }

        const targetDrift = this.smoothCameraPos.distanceTo(this.cameraTargetPos);
        const catchupStrength = forceFastFollow
            ? 1
            : Utils.clamp((targetDrift - 3.5) / 10, 0, 1);

        const snapDistance = isRescue ? 28 : baseCameraDistance * 2.35;
        if (targetDrift > snapDistance) {
            this.smoothCameraPos.copy(this.cameraTargetPos);
            this.camera.position.copy(this.cameraTargetPos);
            this.lastCameraTarget.copy(this.camera.position);
        }
        
        // FOV
        const speedFactor = Math.abs(kart.speed) / kart.maxSpeed;
        const targetFov = 68 + speedFactor * 4;
        this.camera.fov = Utils.lerp(this.camera.fov, targetFov, this.getDampingFactor(4));
        this.camera.updateProjectionMatrix();
        
        // ===== カメラ位置を時間ベースで追従 =====
        if (targetDrift <= snapDistance) {
            const followResponse = forceFastFollow
                ? 12
                : Utils.lerp(6.4, 11.2, catchupStrength);
            const verticalResponse = forceFastFollow
                ? 11
                : Utils.lerp(5.5, 8.6, catchupStrength);
            const posAlphaXZ = this.getDampingFactor(followResponse);
            const posAlphaY = this.getDampingFactor(verticalResponse);

            this.smoothCameraPos.x = Utils.lerp(this.smoothCameraPos.x, this.cameraTargetPos.x, posAlphaXZ);
            this.smoothCameraPos.z = Utils.lerp(this.smoothCameraPos.z, this.cameraTargetPos.z, posAlphaXZ);
            this.smoothCameraPos.y = Utils.lerp(this.smoothCameraPos.y, this.cameraTargetPos.y, posAlphaY);

            this.camera.position.copy(this.smoothCameraPos);
        }

        this.lastCameraTarget.copy(this.camera.position);
        
        // ===== 視点ターゲット =====
        const lookAhead = 6;
        this.cameraLookTargetBuffer.copy(kart.position);
        this.cameraLookTargetBuffer.x += Math.sin(smoothRotation) * lookAhead;
        this.cameraLookTargetBuffer.z += Math.cos(smoothRotation) * lookAhead;
        this.cameraLookTargetBuffer.y += 1.5;
        
        if (!this.smoothLookTarget) {
            this.smoothLookTarget = this.cameraLookTargetBuffer.clone();
        }
        const lookResponse = forceFastFollow
            ? 9
            : Utils.lerp(5.4, 8.4, Math.max(turnSeverity, catchupStrength));
        const lookResponseY = forceFastFollow
            ? 8
            : Utils.lerp(4.8, 6.8, catchupStrength);
        const lookAlpha = this.getDampingFactor(lookResponse);
        const lookAlphaY = this.getDampingFactor(lookResponseY);
        this.smoothLookTarget.x = Utils.lerp(this.smoothLookTarget.x, this.cameraLookTargetBuffer.x, lookAlpha);
        this.smoothLookTarget.z = Utils.lerp(this.smoothLookTarget.z, this.cameraLookTargetBuffer.z, lookAlpha);
        this.smoothLookTarget.y = Utils.lerp(this.smoothLookTarget.y, this.cameraLookTargetBuffer.y, lookAlphaY);
        
        this.camera.lookAt(this.smoothLookTarget);
        
        // カメラの左右バンクは極小に抑え、通常旋回では揺れを出さない
        const canBank = (
            !isRescue &&
            this.track?.courseType !== 'castle' &&
            kart.isDrifting &&
            Math.abs(kart.speed) > kart.maxSpeed * 0.3
        );
        if (canBank) {
            const turnMagnitude = Math.abs(kart.currentTurnAmount);
            const bankWeight = turnMagnitude > 0.55
                ? (turnMagnitude - 0.55) / 0.45
                : 0;
            const targetBankAngle = -Math.sign(kart.currentTurnAmount) * bankWeight * 0.0016;
            this.cameraBankAngle = Utils.lerp(
                this.cameraBankAngle,
                targetBankAngle,
                this.getDampingFactor(1.8)
            );
        } else {
            this.cameraBankAngle = Utils.lerp(this.cameraBankAngle, 0, this.getDampingFactor(4.5));
        }

        if (Math.abs(this.cameraBankAngle) < 0.00005) {
            this.cameraBankAngle = 0;
        }

        if (this.cameraBankAngle !== 0) {
            this.camera.rotateZ(this.cameraBankAngle);
        }
    }
    
    updateAudio() {
        if (!this.playerKart) return;
        
        window.audioManager.updateEngine(
            Math.abs(this.playerKart.speed),
            this.playerKart.maxSpeed,
            this.playerKart.isDrifting
        );
    }
    
    updateUI() {
        if (!this.playerKart) return;
        
        try {
            const kart = this.playerKart;
            
            this.uiManager.updatePosition(kart.racePosition);
            this.uiManager.updateLap(Math.min(kart.lap + 1, this.totalLaps), this.totalLaps);
            this.uiManager.updateTimer(this.raceTime);
            this.uiManager.updateItem(kart.currentItem);
            this.uiManager.updateSpeed(kart.speed, kart.maxSpeed);
            this.uiManager.updateBoostMeter(kart.driftLevel, kart.driftCharge || 0, kart.boostTime);
            this.uiManager.showWrongWay(kart.wrongWay);
            this.uiManager.updateMinimap(this.karts, this.track);
        } catch (e) {
            console.error('Error in updateUI:', e);
        }
    }
    
    render() {
        try {
            // カメラ位置がNaNの場合はリセット
            if (isNaN(this.camera.position.x) || isNaN(this.camera.position.y) || isNaN(this.camera.position.z)) {
                console.error('Camera position is NaN, resetting');
                this.camera.position.set(0, 10, -20);
                if (this.playerKart) {
                    this.camera.lookAt(this.playerKart.position);
                }
            }
            this.renderer.render(this.scene, this.camera);
        } catch (e) {
            console.error('Error in render:', e);
        }
    }
    
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// Start the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
