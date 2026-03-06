// Kart class - handles player and AI karts

class Kart {
    constructor(scene, colorIndex, isPlayer = false, name = 'Racer') {
        this.scene = scene;
        this.isPlayer = isPlayer;
        this.name = name;
        this.colorData = KartColors[colorIndex % KartColors.length];
        this.characterId = this.colorData.characterId || 'mario'; // キャラクターID
        
        // Physics properties - アップグレード版
        this.position = new THREE.Vector3(0, 0.5, 0);
        this.lastValidPosition = null;  // 最後の有効な位置を保存（setPosition時に初期化）
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = 0; // Y-axis rotation (heading)
        this.angularVelocity = 0;
        
        // 改善された移動ステータス - アーケードスタイル
        this.maxSpeed = 100;          // 最高速度
        this.acceleration = 65;       // 加速力（大幅アップ）
        this.deceleration = 12;       // 自然減速（緩やか）
        this.brakeStrength = 80;      // ブレーキ強化
        this.turnSpeed = 2.5;         // 旋回速度（やや鋭く）
        this.friction = 0.988;        // 摩擦（滑りやすく）
        this.grassFriction = 0.96;    // 芝でのペナルティ（適度に緩和）
        
        // アーケード物理プロパティ
        this.grip = 1.0;              // タイヤグリップ
        this.steeringResponse = 0.13; // ステアリングのレスポンス（鋭く）
        this.targetRotation = 0;      // 目標方向（スムーズな旋回用）
        this.lateralVelocity = 0;     // 横方向の速度（ドリフト用）
        this.enginePower = 0;         // エンジン出力（スムーズな加速用）
        this.driftGrip = 0.7;         // ドリフト時のグリップ
        this.driftAngle = 0;          // ドリフト角度
        
        // Current state
        this.speed = 0;
        this.currentTurnAmount = 0;
        this.onGrass = false;
        this.isColliding = false;
        
        // Drift system
        this.isDrifting = false;
        this.driftDirection = 0; // -1 left, 1 right
        this.driftTime = 0;
        this.driftLevel = 0; // 0, 1, 2, 3 (blue, orange, purple)
        this.driftBoostReady = false;
        this.driftCharge = 0;
        this.driftChargePhase = 0;
        this.lastDriftSteerInput = 0;
        
        // Boost system
        this.boostTime = 0;
        this.boostMultiplier = 1;
        this.tripleBoostCharges = 0;
        this.burnoutTimer = 0;
        
        // Item system
        this.currentItem = null;
        this.hasShield = false;
        this.shieldTimer = 0;  // シールドの残り時間
        this.isShrunken = false;
        this.shrinkTimer = 0;
        this.isFrozen = false;
            // --- AIコース外タイマー ---
            this.offTrackTimer = 0;
        this.freezeTimer = 0;
        this.isSpunOut = false;
        this.spinOutTimer = 0;
        this.invincibilityTimer = 0;
        
        // Race state
        this.lap = 0;
        this.checkpoint = 0;
        this.lastCheckpoint = -1;
        this.racePosition = 1;
        this.finished = false;
        this.finishTime = 0;
        this.totalProgress = 0;
        this.wrongWay = false;
        this.raceStartTime = 0;  // レース開始時刻（スタート直後のラップ誤検出防止用）
        
        // Input state (for player)
        this.input = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            drift: false,
            item: false
        };

        this.weightClass = 'medium';
        this.collisionMass = 1;
        this.startBoostSkill = 1;
        this.applyCharacterPhysicsProfile();
        
        // Create 3D model
        this.mesh = this.createKartMesh();
        this.scene.add(this.mesh);
        
        // Collision box
        this.collisionRadius = 2;
        this.collisionBox = new THREE.Box3();
    }

    getCharacterPhysicsProfile() {
        const profileMap = {
            mario: {
                weightClass: 'medium',
                maxSpeedScale: 1.0,
                accelerationScale: 1.0,
                turnSpeedScale: 1.0,
                frictionScale: 1.0,
                grassFriction: 0.96,
                driftGrip: 0.7,
                steeringResponse: 0.13,
                collisionMass: 1.0,
                startBoostSkill: 1.0
            },
            luigi: {
                weightClass: 'medium',
                maxSpeedScale: 0.99,
                accelerationScale: 1.03,
                turnSpeedScale: 1.06,
                frictionScale: 1.002,
                grassFriction: 0.962,
                driftGrip: 0.73,
                steeringResponse: 0.14,
                collisionMass: 0.98,
                startBoostSkill: 1.04
            },
            peach: {
                weightClass: 'light',
                maxSpeedScale: 0.96,
                accelerationScale: 1.11,
                turnSpeedScale: 1.08,
                frictionScale: 0.998,
                grassFriction: 0.966,
                driftGrip: 0.75,
                steeringResponse: 0.145,
                collisionMass: 0.88,
                startBoostSkill: 1.06
            },
            toad: {
                weightClass: 'light',
                maxSpeedScale: 0.94,
                accelerationScale: 1.16,
                turnSpeedScale: 1.14,
                frictionScale: 0.996,
                grassFriction: 0.968,
                driftGrip: 0.8,
                steeringResponse: 0.15,
                collisionMass: 0.78,
                startBoostSkill: 1.08
            },
            yoshi: {
                weightClass: 'light',
                maxSpeedScale: 0.97,
                accelerationScale: 1.09,
                turnSpeedScale: 1.1,
                frictionScale: 1.0,
                grassFriction: 0.965,
                driftGrip: 0.78,
                steeringResponse: 0.145,
                collisionMass: 0.86,
                startBoostSkill: 1.05
            },
            wario: {
                weightClass: 'heavy',
                maxSpeedScale: 1.07,
                accelerationScale: 0.9,
                turnSpeedScale: 0.92,
                frictionScale: 1.006,
                grassFriction: 0.955,
                driftGrip: 0.66,
                steeringResponse: 0.12,
                collisionMass: 1.2,
                startBoostSkill: 0.94
            },
            dk: {
                weightClass: 'heavy',
                maxSpeedScale: 1.08,
                accelerationScale: 0.88,
                turnSpeedScale: 0.9,
                frictionScale: 1.008,
                grassFriction: 0.954,
                driftGrip: 0.65,
                steeringResponse: 0.118,
                collisionMass: 1.26,
                startBoostSkill: 0.92
            },
            bowser: {
                weightClass: 'heavy',
                maxSpeedScale: 1.12,
                accelerationScale: 0.82,
                turnSpeedScale: 0.86,
                frictionScale: 1.01,
                grassFriction: 0.952,
                driftGrip: 0.62,
                steeringResponse: 0.115,
                collisionMass: 1.34,
                startBoostSkill: 0.9
            }
        };

        return profileMap[this.characterId] || profileMap.mario;
    }

    applyCharacterPhysicsProfile() {
        const profile = this.getCharacterPhysicsProfile();
        this.weightClass = profile.weightClass;
        this.maxSpeed *= profile.maxSpeedScale;
        this.acceleration *= profile.accelerationScale;
        this.turnSpeed *= profile.turnSpeedScale;
        this.friction *= profile.frictionScale;
        this.grassFriction = profile.grassFriction;
        this.driftGrip = profile.driftGrip;
        this.steeringResponse = profile.steeringResponse;
        this.collisionMass = profile.collisionMass;
        this.startBoostSkill = profile.startBoostSkill;
    }
    
    createKartMesh() {
        const group = new THREE.Group();
        
        const styleProfile = this.getKartStyleProfile();
        const carbonTexture = window.textureManager ? window.textureManager.getTexture('carbon') : null;
        const metalTexture = window.textureManager ? window.textureManager.getTexture('metal') : null;
        const tireTexture = window.textureManager ? window.textureManager.getTexture('tire') : null;
        
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: this.colorData.primary,
            metalness: 0.12,
            roughness: 0.72
        });
        const seatMaterial = new THREE.MeshStandardMaterial({
            color: this.colorData.secondary,
            metalness: 0.08,
            roughness: 0.82
        });
        const accentMat = new THREE.MeshStandardMaterial({
            color: this.colorData.accent || 0xFFFFFF,
            metalness: 0.05,
            roughness: 0.58
        });
        const darkMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            map: carbonTexture,
            metalness: 0.04,
            roughness: 0.88
        });
        const bumperMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.18,
            roughness: 0.7
        });
        const metalMat = new THREE.MeshStandardMaterial({
            color: 0xD0D0D0,
            map: metalTexture,
            metalness: 0.75,
            roughness: 0.24
        });
        const numberMat = new THREE.MeshStandardMaterial({
            color: 0xF7F5EF,
            metalness: 0.02,
            roughness: 0.52
        });
        
        const width = styleProfile.width;
        const length = styleProfile.length;
        const rearScale = styleProfile.rearScale;
        const noseScale = styleProfile.noseScale;
        const tireScale = styleProfile.tireScale;
        
        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(3.15 * width, 0.24, 4.95 * length),
            darkMat
        );
        floor.position.set(0, 0.34, 0.05);
        floor.castShadow = true;
        floor.receiveShadow = true;
        group.add(floor);
        
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(2.5 * width, 0.2, 3.8 * length),
            bodyMaterial
        );
        body.position.set(0, 0.47, -0.08);
        body.castShadow = true;
        group.add(body);
        
        const noseBase = new THREE.Mesh(
            new THREE.BoxGeometry(1.72 * width, 0.26, 1.28 * noseScale),
            bodyMaterial
        );
        noseBase.position.set(0, 0.48, 2.0 * length);
        group.add(noseBase);
        
        const noseFairing = new THREE.Mesh(new THREE.SphereGeometry(0.72, 16, 14), bodyMaterial);
        noseFairing.position.set(0, 0.63, 2.28 * length);
        noseFairing.scale.set(1.16 * width, 0.42, 1.32 * noseScale);
        group.add(noseFairing);
        
        const hoodStripe = new THREE.Mesh(
            new THREE.BoxGeometry(0.48, 0.05, 1.85 * noseScale),
            accentMat
        );
        hoodStripe.position.set(0, 0.63, 1.72 * length);
        group.add(hoodStripe);
        
        const frontPlate = new THREE.Mesh(
            new THREE.BoxGeometry(1.2 * width, 0.08, 0.52),
            numberMat
        );
        frontPlate.position.set(0, 0.56, 2.52 * length);
        frontPlate.castShadow = true;
        group.add(frontPlate);
        
        [-1, 1].forEach(side => {
            const sidePod = new THREE.Mesh(
                new THREE.BoxGeometry(0.62, 0.38, 2.75 * length),
                bodyMaterial
            );
            sidePod.position.set(side * 1.18 * width, 0.54, -0.05);
            sidePod.castShadow = true;
            group.add(sidePod);
            
            const sideStripe = new THREE.Mesh(
                new THREE.BoxGeometry(0.42, 0.06, 2.15 * length),
                accentMat
            );
            sideStripe.position.set(side * 1.18 * width, 0.74, -0.08);
            group.add(sideStripe);
            
            const rail = new THREE.Mesh(
                new THREE.BoxGeometry(0.14, 0.26, 2.6 * length),
                bumperMat
            );
            rail.position.set(side * 1.52 * width, 0.55, 0.02);
            rail.castShadow = true;
            group.add(rail);
            
            const rearFender = new THREE.Mesh(new THREE.SphereGeometry(0.44, 14, 12), bodyMaterial);
            rearFender.position.set(side * 1.14 * width, 0.68, -1.45 * length);
            rearFender.scale.set(0.92, 0.36, 1.25 * rearScale);
            group.add(rearFender);
            
            const sidePlate = new THREE.Mesh(
                new THREE.BoxGeometry(0.55, 0.34, 0.04),
                numberMat
            );
            sidePlate.position.set(side * 1.54 * width, 0.8, -0.1);
            sidePlate.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
            group.add(sidePlate);
        });
        
        const seatBase = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.22, 1.15), seatMaterial);
        seatBase.position.set(0, 0.73, -0.04);
        seatBase.castShadow = true;
        group.add(seatBase);
        
        const seatBack = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.74, 0.18), seatMaterial);
        seatBack.position.set(0, 1.07, -0.62);
        seatBack.rotation.x = -0.12;
        seatBack.castShadow = true;
        group.add(seatBack);
        
        [-0.63, 0.63].forEach(x => {
            const bolster = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 0.76), seatMaterial);
            bolster.position.set(x, 0.92, -0.16);
            bolster.rotation.z = x > 0 ? -0.08 : 0.08;
            group.add(bolster);
        });
        
        const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.24, 0.14), seatMaterial);
        headrest.position.set(0, 1.43, -0.74);
        group.add(headrest);
        
        const rearDeck = new THREE.Mesh(
            new THREE.BoxGeometry(2.08 * width, 0.42, 1.45 * rearScale),
            bodyMaterial
        );
        rearDeck.position.set(0, 0.66, -1.76 * length);
        rearDeck.castShadow = true;
        group.add(rearDeck);
        
        const engineCover = new THREE.Mesh(
            new THREE.BoxGeometry(1.38 * width, 0.38, 0.98 * rearScale),
            bodyMaterial
        );
        engineCover.position.set(0, 0.92, -2.03 * length);
        engineCover.castShadow = true;
        group.add(engineCover);
        
        const rearBand = new THREE.Mesh(
            new THREE.BoxGeometry(1.6 * width, 0.12, 0.24),
            accentMat
        );
        rearBand.position.set(0, 0.84, -2.42 * length);
        group.add(rearBand);
        
        const intake = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.24, 0.3), darkMat);
        intake.position.set(0, 1.13, -1.88 * length);
        group.add(intake);
        
        [-0.28, 0, 0.28].forEach(x => {
            const coolingFin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.5), darkMat);
            coolingFin.position.set(x, 1.0, -2.04 * length);
            group.add(coolingFin);
        });
        
        const steeringWheel = new THREE.Mesh(
            new THREE.TorusGeometry(0.28, 0.045, 8, 18),
            bumperMat
        );
        steeringWheel.position.set(0, 1.02, 0.78);
        steeringWheel.rotation.x = 1.1;
        group.add(steeringWheel);
        
        const steeringColumn = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, 0.42, 8),
            bumperMat
        );
        steeringColumn.position.set(0, 0.83, 0.68);
        steeringColumn.rotation.x = Math.PI / 6;
        group.add(steeringColumn);
        
        const frontBumper = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.12, 2.66 * width, 12),
            bumperMat
        );
        frontBumper.rotation.z = Math.PI / 2;
        frontBumper.position.set(0, 0.44, 2.84 * length);
        frontBumper.castShadow = true;
        group.add(frontBumper);
        
        [-1, 1].forEach(side => {
            const frontPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), bumperMat);
            frontPost.position.set(side * 1.08 * width, 0.5, 2.62 * length);
            frontPost.rotation.x = 0.35;
            group.add(frontPost);
            
            const sideGuard = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.05, 8), bumperMat);
            sideGuard.position.set(side * 1.58 * width, 0.48, 0.4);
            sideGuard.rotation.x = Math.PI / 2;
            group.add(sideGuard);
        });
        
        const rearBumper = new THREE.Mesh(
            new THREE.CylinderGeometry(0.11, 0.11, 2.45 * width, 12),
            bumperMat
        );
        rearBumper.rotation.z = Math.PI / 2;
        rearBumper.position.set(0, 0.54, -2.8 * length);
        rearBumper.castShadow = true;
        group.add(rearBumper);
        
        this.exhaustFlames = [];
        [-0.42, 0.42].forEach(x => {
            const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.78, 10), metalMat);
            pipe.rotation.x = Math.PI / 2 + 0.08;
            pipe.position.set(x, 0.72, -2.66 * length);
            group.add(pipe);
            
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 8, 16), metalMat);
            ring.position.set(x, 0.69, -3.02 * length);
            ring.rotation.x = Math.PI / 2;
            group.add(ring);
            
            const flameGroup = new THREE.Group();
            const innerFlameMat = new THREE.MeshBasicMaterial({
                color: 0xFFEE88,
                transparent: true,
                opacity: 0.7
            });
            const innerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.38, 8), innerFlameMat);
            innerFlame.rotation.x = Math.PI;
            innerFlame.position.set(0, 0.07, 0);
            flameGroup.add(innerFlame);
            
            const outerFlameMat = new THREE.MeshBasicMaterial({
                color: 0xFF6622,
                transparent: true,
                opacity: 0.4
            });
            const outerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.58, 8), outerFlameMat);
            outerFlame.rotation.x = Math.PI;
            outerFlame.position.set(0, 0.1, 0);
            flameGroup.add(outerFlame);
            
            flameGroup.position.set(x, 0.68, -3.18 * length);
            flameGroup.visible = false;
            group.add(flameGroup);
            this.exhaustFlames.push({ group: flameGroup, innerMat: innerFlameMat, outerMat: outerFlameMat });
        });
        
        const characterGroup = this.createCharacterModel();
        group.add(characterGroup);
        
        this.wheels = [];
        const wheelPositions = [
            { x: -1.62 * width, y: 0.5, z: 1.74 * length, radius: 0.54 * tireScale, wheelWidth: 0.7 },
            { x: 1.62 * width, y: 0.5, z: 1.74 * length, radius: 0.54 * tireScale, wheelWidth: 0.7 },
            { x: -1.68 * width, y: 0.56, z: -1.56 * length, radius: 0.6 * tireScale * rearScale, wheelWidth: 0.8 },
            { x: 1.68 * width, y: 0.56, z: -1.56 * length, radius: 0.6 * tireScale * rearScale, wheelWidth: 0.8 }
        ];
        
        wheelPositions.forEach((pos) => {
            const wheelGroup = new THREE.Group();
            
            const tire = new THREE.Mesh(
                new THREE.CylinderGeometry(pos.radius, pos.radius, pos.wheelWidth, 18),
                new THREE.MeshStandardMaterial({
                    map: tireTexture,
                    color: 0x171717,
                    roughness: 0.96,
                    metalness: 0
                })
            );
            tire.rotation.z = Math.PI / 2;
            tire.castShadow = true;
            wheelGroup.add(tire);
            
            const rim = new THREE.Mesh(
                new THREE.CylinderGeometry(pos.radius * 0.58, pos.radius * 0.58, pos.wheelWidth + 0.04, 12),
                new THREE.MeshStandardMaterial({
                    map: metalTexture,
                    color: 0xD8D8D8,
                    metalness: 0.78,
                    roughness: 0.18
                })
            );
            rim.rotation.z = Math.PI / 2;
            wheelGroup.add(rim);
            
            const hub = new THREE.Mesh(
                new THREE.CylinderGeometry(pos.radius * 0.18, pos.radius * 0.18, pos.wheelWidth + 0.06, 8),
                new THREE.MeshStandardMaterial({
                    color: this.colorData.primary,
                    metalness: 0.12,
                    roughness: 0.55
                })
            );
            hub.rotation.z = Math.PI / 2;
            wheelGroup.add(hub);
            
            wheelGroup.position.set(pos.x, pos.y, pos.z);
            group.add(wheelGroup);
            this.wheels.push(wheelGroup);
        });
        
        this.bodyBounds = new THREE.Vector3(
            1.72 * width,
            1.15 * styleProfile.driverScale,
            2.72 * Math.max(length, rearScale)
        );
        
        const shieldGeometry = new THREE.SphereGeometry(2.9 * Math.max(width, rearScale), 24, 24);
        const shieldMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            wireframe: true
        });
        this.shieldMesh = new THREE.Mesh(shieldGeometry, shieldMaterial);
        this.shieldMesh.position.y = 1.22;
        group.add(this.shieldMesh);
        
        this.addOutline(group, 1.028);

        return group;
    }
    
    // キャラクター固有の3Dモデルを作成
    createCharacterModel() {
        const characterGroup = new THREE.Group();
        const styleProfile = this.getKartStyleProfile();
        const characterType = this.colorData.characterType || 'human';
        characterGroup.position.set(0, styleProfile.driverY, styleProfile.driverZ);
        characterGroup.scale.set(styleProfile.driverScale, styleProfile.driverScale, styleProfile.driverScale);
        characterGroup.rotation.x = styleProfile.driverTilt;
        
        const skinMaterial = new THREE.MeshStandardMaterial({ 
            color: this.colorData.skinTone || 0xFFCC99,
            roughness: 0.5
        });
        
        // キャラクターごとに異なるモデルを作成
        switch(characterType) {
            case 'human':
                this.createHumanCharacter(characterGroup, skinMaterial);
                break;
            case 'princess':
                this.createPrincessCharacter(characterGroup, skinMaterial);
                break;
            case 'toad':
                this.createToadCharacter(characterGroup, skinMaterial);
                break;
            case 'yoshi':
                this.createYoshiCharacter(characterGroup);
                break;
            case 'dk':
                this.createDKCharacter(characterGroup);
                break;
            case 'bowser':
                this.createBowserCharacter(characterGroup);
                break;
            default:
                this.createHumanCharacter(characterGroup, skinMaterial);
        }
        
        return characterGroup;
    }
    
    getKartStyleProfile() {
        const styleMap = {
            standard: {
                width: 1,
                length: 1,
                noseScale: 1,
                rearScale: 1,
                tireScale: 1,
                driverScale: 1.08,
                driverY: 0.02,
                driverZ: -0.42,
                driverTilt: 0.05
            },
            compact: {
                width: 0.93,
                length: 0.94,
                noseScale: 0.92,
                rearScale: 0.9,
                tireScale: 0.94,
                driverScale: 1.02,
                driverY: -0.02,
                driverZ: -0.34,
                driverTilt: 0.06
            },
            elegant: {
                width: 1.02,
                length: 1,
                noseScale: 1.03,
                rearScale: 0.96,
                tireScale: 0.98,
                driverScale: 1.05,
                driverY: 0.03,
                driverZ: -0.4,
                driverTilt: 0.05
            },
            sporty: {
                width: 0.96,
                length: 1,
                noseScale: 1.08,
                rearScale: 0.95,
                tireScale: 0.98,
                driverScale: 1.04,
                driverY: 0.01,
                driverZ: -0.38,
                driverTilt: 0.05
            },
            heavy: {
                width: 1.08,
                length: 1.02,
                noseScale: 0.98,
                rearScale: 1.14,
                tireScale: 1.08,
                driverScale: 1.12,
                driverY: 0.05,
                driverZ: -0.48,
                driverTilt: 0.07
            },
            monster: {
                width: 1.14,
                length: 1.04,
                noseScale: 0.94,
                rearScale: 1.2,
                tireScale: 1.14,
                driverScale: 1.17,
                driverY: 0.08,
                driverZ: -0.54,
                driverTilt: 0.08
            }
        };

        const characterOverrides = {
            mario: {
                width: 1.01,
                rearScale: 1.02,
                driverScale: 1.12,
                driverY: 0.04,
                driverZ: -0.44
            },
            luigi: {
                width: 0.98,
                length: 1.03,
                noseScale: 1.05,
                driverScale: 1.08,
                driverY: 0.05,
                driverZ: -0.43
            },
            peach: {
                width: 1.01,
                driverScale: 1.07,
                driverY: 0.05,
                driverZ: -0.41
            },
            toad: {
                width: 0.92,
                length: 0.93,
                tireScale: 0.92,
                driverScale: 1.0,
                driverY: -0.04,
                driverZ: -0.32
            },
            yoshi: {
                width: 0.97,
                noseScale: 1.1,
                driverScale: 1.08,
                driverY: 0.02,
                driverZ: -0.4
            },
            wario: {
                width: 1.13,
                length: 1.01,
                rearScale: 1.18,
                tireScale: 1.1,
                driverScale: 1.18,
                driverY: 0.08,
                driverZ: -0.52,
                driverTilt: 0.08
            },
            dk: {
                width: 1.14,
                length: 1.02,
                rearScale: 1.2,
                tireScale: 1.12,
                driverScale: 1.2,
                driverY: 0.08,
                driverZ: -0.54,
                driverTilt: 0.08
            },
            bowser: {
                width: 1.22,
                length: 1.06,
                rearScale: 1.32,
                tireScale: 1.2,
                driverScale: 1.26,
                driverY: 0.12,
                driverZ: -0.62,
                driverTilt: 0.09
            }
        };
        
        return {
            ...(styleMap[this.colorData.kartStyle] || styleMap.standard),
            ...(characterOverrides[this.characterId] || {})
        };
    }
    
    getHumanCharacterProfile() {
        const profiles = {
            mario: {
                shoeX: 0.22,
                shoeScale: [0.96, 0.62, 1.34],
                soleSize: [0.32, 0.06, 0.42],
                pantsTop: 0.5,
                pantsBottom: 0.44,
                pantsHeight: 0.46,
                torsoScale: [1.08, 0.82, 0.88],
                bibSize: [0.56, 0.44, 0.12],
                backPanelSize: [0.62, 0.52, 0.1],
                strapX: 0.19,
                strapSize: [0.13, 0.62, 0.06],
                bridgeSize: [0.16, 0.08, 0.62],
                collarRadius: 0.38,
                headScale: [1.04, 0.98, 0.98],
                earScale: [0.54, 1.12, 0.7],
                hairColor: 0x5B3A1A,
                hatY: 2.26,
                hatScale: [1.04, 1.0, 1.03],
                brimRadius: 0.75,
                brimScaleZ: 0.8,
                brimTilt: 0.18,
                noseRadius: 0.26,
                noseScale: [1.06, 1.0, 1],
                eyeSpacing: 0.2,
                eyeScale: [0.9, 1.24, 0.66],
                irisColor: 0x3366CC,
                eyebrowTilt: 0.24,
                eyebrowWidth: 0.28,
                sleeveX: 0.56,
                forearmScale: [1.0, 1.0, 1.0],
                handSize: 0.16
            },
            luigi: {
                shoeX: 0.2,
                shoeScale: [0.86, 0.52, 1.26],
                soleSize: [0.28, 0.05, 0.38],
                pantsTop: 0.44,
                pantsBottom: 0.38,
                pantsHeight: 0.5,
                torsoScale: [0.95, 0.88, 0.82],
                bibSize: [0.48, 0.42, 0.1],
                backPanelSize: [0.52, 0.5, 0.08],
                strapX: 0.17,
                strapSize: [0.1, 0.64, 0.05],
                bridgeSize: [0.12, 0.07, 0.58],
                collarRadius: 0.34,
                headScale: [0.94, 1.08, 0.93],
                earScale: [0.48, 1.12, 0.64],
                hairColor: 0x4D3118,
                hatY: 2.3,
                hatScale: [0.96, 1.08, 0.98],
                brimRadius: 0.7,
                brimScaleZ: 0.72,
                brimTilt: 0.16,
                noseRadius: 0.22,
                noseScale: [0.9, 1.08, 1],
                eyeSpacing: 0.19,
                eyeScale: [0.82, 1.36, 0.6],
                irisColor: 0x2F8E5A,
                eyebrowTilt: 0.14,
                eyebrowWidth: 0.26,
                sleeveX: 0.58,
                forearmScale: [0.92, 1.08, 0.96],
                handSize: 0.145
            },
            wario: {
                shoeX: 0.24,
                shoeScale: [1.08, 0.66, 1.42],
                soleSize: [0.34, 0.07, 0.45],
                pantsTop: 0.58,
                pantsBottom: 0.5,
                pantsHeight: 0.48,
                torsoScale: [1.18, 0.76, 0.96],
                bibSize: [0.62, 0.46, 0.14],
                backPanelSize: [0.66, 0.56, 0.12],
                strapX: 0.22,
                strapSize: [0.15, 0.58, 0.07],
                bridgeSize: [0.18, 0.09, 0.66],
                collarRadius: 0.4,
                headScale: [1.18, 0.92, 1.02],
                earScale: [0.6, 1.02, 0.72],
                hairColor: 0x4A3210,
                hatY: 2.22,
                hatScale: [1.12, 0.96, 1.06],
                brimRadius: 0.81,
                brimScaleZ: 0.8,
                brimTilt: 0.2,
                noseRadius: 0.29,
                noseScale: [1.38, 0.94, 1],
                eyeSpacing: 0.23,
                eyeScale: [0.84, 1.0, 0.58],
                irisColor: 0x5A63C7,
                eyebrowTilt: 0.34,
                eyebrowWidth: 0.3,
                sleeveX: 0.62,
                forearmScale: [1.12, 0.96, 1.04],
                handSize: 0.17
            }
        };
        
        return profiles[this.characterId] || profiles.mario;
    }
    
    // キャラクター別の帽子エンブレム文字を取得
    getCharacterLetter() {
        const letterMap = {
            'mario': 'M',
            'luigi': 'L',
            'wario': 'W',
            'waluigi': 'Γ', // Waluigiのシンボル
            'peach': '',
            'toad': '',
            'yoshi': '',
            'dk': '',
            'bowser': ''
        };
        return letterMap[this.characterId] || 'M';
    }

    // Mario 64スタイル精緻版 - 人間タイプ（マリオ、ルイージ、ワリオ、ワルイージ）
    createHumanCharacter(group, skinMaterial) {
        const humanProfile = this.getHumanCharacterProfile();
        const primaryColor = this.colorData.primary;
        const secondaryColor = this.colorData.secondary;
        const clothesMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.55 });
        const overallsMat = new THREE.MeshStandardMaterial({ color: secondaryColor, roughness: 0.65 });
        const hatMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.7 });
        const buttonMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.7, roughness: 0.25 });
        const gloveMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.45 });
        const shoeMat = new THREE.MeshStandardMaterial({ color: 0x5C3317, roughness: 0.75 });

        // === 靴 ===
        [-humanProfile.shoeX, humanProfile.shoeX].forEach(x => {
            const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), shoeMat);
            shoe.position.set(x, 0.55, 0.15);
            shoe.scale.set(
                humanProfile.shoeScale[0],
                humanProfile.shoeScale[1],
                humanProfile.shoeScale[2]
            );
            group.add(shoe);
            const sole = new THREE.Mesh(new THREE.BoxGeometry(
                humanProfile.soleSize[0],
                humanProfile.soleSize[1],
                humanProfile.soleSize[2]
            ),
                new THREE.MeshStandardMaterial({ color: 0x2B1810, roughness: 0.9 }));
            sole.position.set(x, 0.38, 0.15);
            group.add(sole);
        });

        // === オーバーオール下半身 ===
        const pants = new THREE.Mesh(new THREE.CylinderGeometry(
            humanProfile.pantsTop,
            humanProfile.pantsBottom,
            humanProfile.pantsHeight,
            16
        ), overallsMat);
        pants.position.y = 0.78;
        group.add(pants);

        // === シャツ上半身 ===
        const torso = new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 16), clothesMat);
        torso.position.y = 1.2;
        torso.scale.set(
            humanProfile.torsoScale[0],
            humanProfile.torsoScale[1],
            humanProfile.torsoScale[2]
        );
        torso.castShadow = true;
        group.add(torso);

        // === オーバーオール ビブ（前面） ===
        const bib = new THREE.Mesh(new THREE.BoxGeometry(
            humanProfile.bibSize[0],
            humanProfile.bibSize[1],
            humanProfile.bibSize[2]
        ), overallsMat);
        bib.position.set(0, 1.18, 0.38);
        group.add(bib);

        // === オーバーオール 背面パネル ===
        const backPanel = new THREE.Mesh(new THREE.BoxGeometry(
            humanProfile.backPanelSize[0],
            humanProfile.backPanelSize[1],
            humanProfile.backPanelSize[2]
        ), overallsMat);
        backPanel.position.set(0, 1.05, -0.38);
        group.add(backPanel);

        // === オーバーオール肩紐 ===
        const strapGeo = new THREE.BoxGeometry(
            humanProfile.strapSize[0],
            humanProfile.strapSize[1],
            humanProfile.strapSize[2]
        );
        [-humanProfile.strapX, humanProfile.strapX].forEach(x => {
            const sf = new THREE.Mesh(strapGeo, overallsMat);
            sf.position.set(x, 1.32, 0.4);
            sf.rotation.x = -0.12;
            group.add(sf);
            const sb = new THREE.Mesh(strapGeo, overallsMat);
            sb.position.set(x, 1.28, -0.35);
            sb.rotation.x = 0.12;
            group.add(sb);
            // 肩上の接続部
            const sc = new THREE.Mesh(new THREE.BoxGeometry(
                humanProfile.bridgeSize[0],
                humanProfile.bridgeSize[1],
                humanProfile.bridgeSize[2]
            ), overallsMat);
            sc.position.set(x, 1.52, 0);
            group.add(sc);
            // 金ボタン（前面）
            const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.05, 10), buttonMat);
            btn.position.set(x, 1.12, 0.48);
            btn.rotation.x = Math.PI / 2;
            group.add(btn);
        });

        // === 襟 ===
        const collar = new THREE.Mesh(new THREE.TorusGeometry(humanProfile.collarRadius, 0.055, 8, 16), clothesMat);
        collar.position.y = 1.52;
        collar.rotation.x = Math.PI / 2;
        group.add(collar);

        // === 頭（キャラ毎の形状差） ===
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.6, 22, 20), skinMaterial);
        head.position.y = 2.0;
        head.scale.set(
            humanProfile.headScale[0],
            humanProfile.headScale[1],
            humanProfile.headScale[2]
        );
        head.castShadow = true;
        group.add(head);

        // 耳
        [-0.55, 0.55].forEach(x => {
            const ear = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), skinMaterial);
            ear.position.set(x * humanProfile.headScale[0], 2.0, 0);
            ear.scale.set(
                humanProfile.earScale[0],
                humanProfile.earScale[1],
                humanProfile.earScale[2]
            );
            group.add(ear);
        });

        // === 後頭部の髪（帽子の後ろから出るカール）===
        const hairMat = new THREE.MeshStandardMaterial({ color: humanProfile.hairColor, roughness: 0.9 });
        for (let i = 0; i < 6; i++) {
            const curl = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), hairMat);
            const a = (i / 5) * Math.PI * 0.9 - Math.PI * 0.45;
            curl.position.set(Math.sin(a) * 0.48, 1.62, Math.cos(a) * -0.32 - 0.18);
            curl.scale.set(1.15, 0.75, 1);
            group.add(curl);
        }
        // もみあげ
        [-0.5, 0.5].forEach(x => {
            const sb = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.1), hairMat);
            sb.position.set(x, 1.82, 0.08);
            group.add(sb);
        });

        // === 帽子 ===
        const hatDome = new THREE.Mesh(
            new THREE.SphereGeometry(0.66, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hatMat);
        hatDome.position.y = humanProfile.hatY;
        hatDome.rotation.x = -0.08;
        hatDome.scale.set(
            humanProfile.hatScale[0],
            humanProfile.hatScale[1],
            humanProfile.hatScale[2]
        );
        group.add(hatDome);

        // つば
        const brim = new THREE.Mesh(
            new THREE.CylinderGeometry(
                humanProfile.brimRadius,
                humanProfile.brimRadius,
                0.1,
                20,
                1,
                false,
                0,
                Math.PI
            ), hatMat);
        brim.position.set(0, humanProfile.hatY - 0.18, 0.18);
        brim.rotation.x = humanProfile.brimTilt;
        brim.scale.set(1, 1, humanProfile.brimScaleZ);
        group.add(brim);
        // つばの裏面
        const brimUnder = new THREE.Mesh(
            new THREE.CylinderGeometry(
                humanProfile.brimRadius - 0.02,
                humanProfile.brimRadius - 0.02,
                0.04,
                20,
                1,
                false,
                0,
                Math.PI
            ),
            new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 }));
        brimUnder.position.set(0, humanProfile.hatY - 0.21, 0.18);
        brimUnder.rotation.x = humanProfile.brimTilt;
        brimUnder.scale.set(1, 1, humanProfile.brimScaleZ);
        group.add(brimUnder);

        // 帽子後部アジャスター風のディテール
        const adjuster = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.06), hatMat);
        adjuster.position.set(0, humanProfile.hatY - 0.21, -0.52);
        group.add(adjuster);

        // 帽子エンブレム
        group.userData.capEmblemY = humanProfile.hatY + 0.19;
        group.userData.capEmblemZ = 0.58;
        this.addCapEmblem(group, this.getCharacterLetter());

        // === 顔パーツ ===
        // 大きな鼻
        const nose = new THREE.Mesh(new THREE.SphereGeometry(humanProfile.noseRadius, 14, 12), skinMaterial);
        nose.position.set(0, 1.88, 0.6);
        nose.scale.set(
            humanProfile.noseScale[0],
            humanProfile.noseScale[1],
            humanProfile.noseScale[2]
        );
        group.add(nose);
        
        if (this.characterId === 'mario') {
            [-0.34, 0.34].forEach(x => {
                const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), skinMaterial);
                cheek.position.set(x, 1.86, 0.4);
                cheek.scale.set(0.95, 0.75, 0.55);
                group.add(cheek);
            });
        }
        
        if (this.characterId === 'wario') {
            const chin = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), skinMaterial);
            chin.position.set(0, 1.58, 0.36);
            chin.scale.set(1.25, 0.72, 0.85);
            group.add(chin);
        }

        // 髭
        const musColor = this.colorData.mustacheColor ||
            ((this.characterId === 'wario' || this.characterId === 'waluigi') ? 0x000000 : 0x331100);
        const musMat = new THREE.MeshStandardMaterial({ color: musColor, roughness: 0.9 });
        if (this.characterId === 'wario') {
            // ワリオ：ギザギザ尖り髭
            [-1, 1].forEach(d => {
                const s1 = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.03, 0.5, 8), musMat);
                s1.position.set(d * 0.12, 1.76, 0.6);
                s1.rotation.z = d * 1.2; s1.rotation.x = 0.4;
                group.add(s1);
                const s2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.022, 0.34, 8), musMat);
                s2.position.set(d * 0.4, 1.85, 0.54);
                s2.rotation.z = d * 0.5; s2.rotation.x = 0.5;
                group.add(s2);
                const tip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 6), musMat);
                tip.position.set(d * 0.58, 1.92, 0.46);
                tip.rotation.z = d * Math.PI / 2;
                group.add(tip);
            });
        } else if (this.characterId === 'luigi') {
            const center = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.44, 10), musMat);
            center.position.set(0, 1.75, 0.58);
            center.rotation.z = Math.PI / 2;
            center.scale.z = 0.42;
            group.add(center);
            [-1, 1].forEach(d => {
                const wing = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), musMat);
                wing.position.set(d * 0.31, 1.77, 0.55);
                wing.scale.set(1.05, 0.42, 0.6);
                group.add(wing);
                const curl = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.018, 0.15, 8), musMat);
                curl.position.set(d * 0.45, 1.79, 0.52);
                curl.rotation.z = d * 0.8;
                curl.rotation.x = 0.4;
                group.add(curl);
            });
        } else {
            const mb = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 10), musMat);
            mb.position.set(0, 1.74, 0.6);
            mb.rotation.z = Math.PI / 2;
            mb.scale.z = 0.5;
            group.add(mb);
            [-1, 1].forEach(d => {
                const w = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 10), musMat);
                w.position.set(d * 0.29, 1.76, 0.56);
                w.scale.set(1.18, 0.6, 0.76);
                group.add(w);
            });
        }

        // 目
        const ewm = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        [-humanProfile.eyeSpacing, humanProfile.eyeSpacing].forEach(x => {
            const ew = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), ewm);
            ew.position.set(x, 2.08, 0.48);
            ew.scale.set(
                humanProfile.eyeScale[0],
                humanProfile.eyeScale[1],
                humanProfile.eyeScale[2]
            );
            group.add(ew);
            const ir = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10),
                new THREE.MeshBasicMaterial({ color: humanProfile.irisColor }));
            ir.position.set(x, 2.1, 0.58);
            group.add(ir);
            const pu = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0x000000 }));
            pu.position.set(x, 2.1, 0.63);
            group.add(pu);
            const hl = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), ewm);
            hl.position.set(x + 0.025, 2.14, 0.63);
            group.add(hl);
        });

        // 眉毛
        const brMat = new THREE.MeshStandardMaterial({ color: musColor });
        [-humanProfile.eyeSpacing + 0.01, humanProfile.eyeSpacing - 0.01].forEach(x => {
            const br = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, humanProfile.eyebrowWidth, 8), brMat);
            br.position.set(x, 2.27, 0.5);
            br.rotation.z = Math.PI / 2 + (x > 0 ? -humanProfile.eyebrowTilt : humanProfile.eyebrowTilt);
            br.rotation.x = -0.3;
            group.add(br);
        });

        // === 腕（袖、前腕、手袋）===
        [-humanProfile.sleeveX, humanProfile.sleeveX].forEach(x => {
            // 袖（シャツカラー）
            const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.22, 10), clothesMat);
            sl.position.set(x, 1.38, 0.12);
            sl.rotation.z = x > 0 ? -0.45 : 0.45;
            group.add(sl);
            // 袖口フリル
            const slCuff = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 6, 10), clothesMat);
            slCuff.position.set(x * 0.98, 1.28, 0.18);
            slCuff.rotation.x = Math.PI / 2;
            slCuff.rotation.z = x > 0 ? -0.45 : 0.45;
            group.add(slCuff);
            // 前腕（肌色）
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.4, 8), skinMaterial);
            arm.position.set(x * 0.92, 1.12, 0.32);
            arm.rotation.x = -Math.PI / 4;
            arm.rotation.z = x > 0 ? -0.35 : 0.35;
            arm.scale.set(
                humanProfile.forearmScale[0],
                humanProfile.forearmScale[1],
                humanProfile.forearmScale[2]
            );
            group.add(arm);
            // 手袋
            const hand = new THREE.Mesh(new THREE.SphereGeometry(humanProfile.handSize, 10, 10), gloveMat);
            hand.position.set(x * 0.82, 0.92, 0.55);
            group.add(hand);
            // 手袋リスト
            const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 10), gloveMat);
            cuff.position.set(x * 0.88, 1.02, 0.45);
            cuff.rotation.x = -Math.PI / 4;
            cuff.rotation.z = x > 0 ? -0.35 : 0.35;
            group.add(cuff);
        });

        this.addHumanSilhouetteDetails(group, humanProfile, {
            skinMaterial,
            clothesMat,
            overallsMat,
            hatMat,
            hairMat
        });
    }

    // Mario 64スタイル精緻版 - ピーチ姫
    createPrincessCharacter(group, skinMaterial) {
        const dressColor = this.colorData.primary;
        const hairColor = this.colorData.hairColor || 0xFFDD44;
        const dressMat = new THREE.MeshStandardMaterial({ color: dressColor, roughness: 0.45 });
        const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.65 });
        const crownMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.7, roughness: 0.2 });
        const gloveMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.4 });
        const frillMat = new THREE.MeshStandardMaterial({ color: 0xFFB6C1, roughness: 0.5 });

        // === ドレス下部（スカート） ===
        const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.9, 0.82, 18), dressMat);
        skirt.position.y = 0.7;
        skirt.castShadow = true;
        group.add(skirt);
        // スカート裾フリル
        const frill = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.06, 8, 24), frillMat);
        frill.position.y = 0.35;
        frill.rotation.x = Math.PI / 2;
        group.add(frill);
        // スカートの縦しわライン（立体感）
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const pleat = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.7, 0.04), dressMat);
            pleat.position.set(Math.sin(angle) * 0.58, 0.7, Math.cos(angle) * 0.58);
            pleat.rotation.y = -angle;
            group.add(pleat);
        }

        // === ドレス上部（ボディス） ===
        const bodice = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.33, 0.58, 16), dressMat);
        bodice.position.y = 1.25;
        bodice.castShadow = true;
        group.add(bodice);

        // 胸元のブローチ
        const broochMat = new THREE.MeshStandardMaterial({ color: 0x4169E1, metalness: 0.5 });
        const brooch = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), broochMat);
        brooch.position.set(0, 1.38, 0.33);
        group.add(brooch);
        const broochRim = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 8, 12), crownMat);
        broochRim.position.set(0, 1.38, 0.34);
        broochRim.rotation.x = Math.PI / 2 - 0.1;
        group.add(broochRim);

        // === パフスリーブ ===
        [-0.42, 0.42].forEach(x => {
            const puff = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), dressMat);
            puff.position.set(x, 1.4, 0.05);
            puff.scale.set(1.2, 1, 1);
            group.add(puff);
            const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 10), frillMat);
            ribbon.position.set(x, 1.32, 0.05);
            ribbon.rotation.x = Math.PI / 2;
            group.add(ribbon);
        });

        // === ドレス背面のリボン ===
        const bowCenter = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), frillMat);
        bowCenter.position.set(0, 1.1, -0.4);
        group.add(bowCenter);
        [-0.18, 0.18].forEach(x => {
            const bowWing = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), frillMat);
            bowWing.position.set(x, 1.12, -0.42);
            bowWing.scale.set(1.3, 0.6, 0.5);
            group.add(bowWing);
        });
        // リボンの垂れ
        [-0.1, 0.1].forEach(x => {
            const trail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.04), frillMat);
            trail.position.set(x, 0.85, -0.42);
            trail.rotation.z = x > 0 ? 0.15 : -0.15;
            group.add(trail);
        });

        // === 頭 ===
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 22, 20), skinMaterial);
        head.position.y = 2.05;
        head.scale.set(1.02, 1.08, 0.9);
        head.castShadow = true;
        group.add(head);

        // === 髪 ===
        // 前髪
        const bangs = new THREE.Mesh(
            new THREE.SphereGeometry(0.62, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.35), hairMat);
        bangs.position.set(0, 2.22, 0.07);
        group.add(bangs);
        // サイドヘア（カール付き）
        [-0.42, 0.42].forEach(x => {
            const side = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.78, 10), hairMat);
            side.position.set(x, 1.65, -0.08);
            group.add(side);
            const curl = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), hairMat);
            curl.position.set(x, 1.28, -0.08);
            group.add(curl);
        });
        // 後ろ髪（ロングヘア、複数レイヤー）
        const backHair1 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.28, 1.0, 12), hairMat);
        backHair1.position.set(0, 1.55, -0.3);
        group.add(backHair1);
        const backHair2 = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), hairMat);
        backHair2.position.set(0, 1.05, -0.32);
        backHair2.scale.set(1, 0.8, 0.8);
        group.add(backHair2);
        // 毛先
        [-0.15, 0, 0.15].forEach(x => {
            const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.25, 8), hairMat);
            tip.position.set(x, 0.75, -0.3);
            tip.rotation.x = Math.PI;
            group.add(tip);
        });

        // === 王冠 ===
        const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.16, 8), crownMat);
        crownBase.position.y = 2.68;
        group.add(crownBase);
        // 王冠の突起（5つ）
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const prong = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.2, 6), crownMat);
            prong.position.set(Math.sin(angle) * 0.23, 2.84, Math.cos(angle) * 0.23);
            group.add(prong);
        }
        // 宝石
        const gemColors = [0xFF0066, 0x4169E1, 0x00AA44];
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const gem = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8),
                new THREE.MeshBasicMaterial({ color: gemColors[i] }));
            gem.position.set(Math.sin(angle) * 0.26, 2.72, Math.cos(angle) * 0.26);
            group.add(gem);
        }

        // === 顔パーツ ===
        // 目（まつ毛付き）
        const ewm = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        [-0.18, 0.18].forEach(x => {
            const ew = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), ewm);
            ew.position.set(x, 2.1, 0.44);
            ew.scale.set(0.85, 1.2, 0.55);
            group.add(ew);
            const ir = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10),
                new THREE.MeshBasicMaterial({ color: 0x4169E1 }));
            ir.position.set(x, 2.1, 0.54);
            group.add(ir);
            const pu = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0x000000 }));
            pu.position.set(x, 2.1, 0.58);
            group.add(pu);
            // まつ毛（3本）
            for (let i = 0; i < 3; i++) {
                const lash = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.06, 0.015),
                    new THREE.MeshBasicMaterial({ color: 0x000000 }));
                lash.position.set(x + (i - 1) * 0.06, 2.2, 0.48);
                lash.rotation.z = (i - 1) * 0.3 + (x > 0 ? -0.1 : 0.1);
                group.add(lash);
            }
        });

        // 唇
        const lip = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.025, 8, 10, Math.PI),
            new THREE.MeshBasicMaterial({ color: 0xFF6699 }));
        lip.position.set(0, 1.88, 0.48);
        lip.rotation.x = Math.PI / 2;
        lip.rotation.z = Math.PI;
        group.add(lip);

        // 小さな鼻
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), skinMaterial);
        nose.position.set(0, 1.98, 0.5);
        group.add(nose);

        // イヤリング（揺れ部分付き）
        [-0.5, 0.5].forEach(x => {
            const earring = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0x4169E1 }));
            earring.position.set(x, 1.9, 0.02);
            group.add(earring);
            const dangle = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), crownMat);
            dangle.position.set(x, 1.82, 0.02);
            group.add(dangle);
        });

        // === 腕（長手袋） ===
        [-0.5, 0.5].forEach(x => {
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.5, 8), gloveMat);
            arm.position.set(x, 1.2, 0.2);
            arm.rotation.x = -Math.PI / 4;
            arm.rotation.z = x > 0 ? -0.3 : 0.3;
            group.add(arm);
            const hand = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), gloveMat);
            hand.position.set(x * 0.85, 1.0, 0.5);
            group.add(hand);
        });

        this.addPrincessSignatureDetails(group, {
            skinMaterial,
            dressMat,
            hairMat,
            crownMat,
            frillMat
        });
    }

    // Mario 64スタイル精緻版 - キノピオ
    createToadCharacter(group, skinMaterial) {
        const vestColor = this.colorData.secondary;
        const capColor = this.colorData.primary;
        const vestMat = new THREE.MeshStandardMaterial({ color: vestColor, roughness: 0.6 });
        const capMat = new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.4 });
        const buttonMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.6, roughness: 0.3 });
        const pantsMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.6 });
        const shoeMat = new THREE.MeshStandardMaterial({ color: 0x5C3317, roughness: 0.7 });

        // === 靴 ===
        [-0.2, 0.2].forEach(x => {
            const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), shoeMat);
            shoe.position.set(x, 0.5, 0.12);
            shoe.scale.set(0.8, 0.5, 1.2);
            group.add(shoe);
        });

        // === おむつ風パンツ ===
        const diaper = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), pantsMat);
        diaper.position.y = 0.7;
        diaper.scale.set(1.15, 0.66, 1.08);
        group.add(diaper);

        // === ベスト上半身 ===
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.52, 16), vestMat);
        torso.position.y = 0.92;
        torso.castShadow = true;
        group.add(torso);

        // ベストの金色トリム
        const trimMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.5, roughness: 0.4 });
        const trimTop = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.03, 6, 16), trimMat);
        trimTop.position.y = 1.2;
        trimTop.rotation.x = Math.PI / 2;
        group.add(trimTop);
        const trimBottom = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.03, 6, 16), trimMat);
        trimBottom.position.y = 0.7;
        trimBottom.rotation.x = Math.PI / 2;
        group.add(trimBottom);

        // ボタン
        for (let i = 0; i < 2; i++) {
            const btn = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), buttonMat);
            btn.position.set(0, 1.0 - i * 0.18, 0.52);
            group.add(btn);
        }

        // ベスト背面の縫い目
        const seam = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, 0.03), vestMat);
        seam.position.set(0, 0.95, -0.48);
        group.add(seam);

        // === 顔 ===
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 18), skinMaterial);
        head.position.y = 1.56;
        head.scale.set(0.98, 1.0, 0.95);
        head.castShadow = true;
        group.add(head);

        // 頬の赤み
        [-0.35, 0.35].forEach(x => {
            const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0xFFBBCC, roughness: 0.5 }));
            cheek.position.set(x, 1.5, 0.38);
            cheek.scale.set(1, 0.7, 0.4);
            group.add(cheek);
        });

        // === キノコの傘 ===
        const mushCap = new THREE.Mesh(
            new THREE.SphereGeometry(0.98, 22, 18, 0, Math.PI * 2, 0, Math.PI * 0.58), capMat);
        mushCap.position.y = 1.98;
        mushCap.scale.set(1.02, 1.0, 1.04);
        mushCap.castShadow = true;
        group.add(mushCap);

        // 傘の裏面
        const underCap = new THREE.Mesh(new THREE.CircleGeometry(0.89, 20),
            new THREE.MeshStandardMaterial({ color: 0xFFF5E6, roughness: 0.5, side: THREE.DoubleSide }));
        underCap.position.y = 1.73;
        underCap.rotation.x = -Math.PI / 2;
        group.add(underCap);

        // 傘の縁リング
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.08, 10, 24),
            new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.45 }));
        rim.position.y = 1.76;
        rim.rotation.x = Math.PI / 2;
        group.add(rim);

        // 斑点（前面+側面+背面にバランスよく配置）
        const spotMat = new THREE.MeshStandardMaterial({
            color: this.colorData.mushroomSpots || 0xEE1C25, roughness: 0.45 });
        const spots = [
            { x: 0, y: 2.78, z: 0.3, s: 0.25 },
            { x: 0.58, y: 2.38, z: 0.3, s: 0.22 },
            { x: -0.58, y: 2.38, z: 0.3, s: 0.22 },
            { x: 0.4, y: 2.55, z: -0.3, s: 0.2 },
            { x: -0.4, y: 2.55, z: -0.3, s: 0.2 },
            { x: 0, y: 2.2, z: -0.7, s: 0.22 },
            { x: 0.65, y: 2.1, z: 0, s: 0.18 },
            { x: -0.65, y: 2.1, z: 0, s: 0.18 },
        ];
        spots.forEach(p => {
            const spot = new THREE.Mesh(new THREE.SphereGeometry(p.s, 14, 12), spotMat);
            spot.position.set(p.x, p.y, p.z);
            spot.scale.z = 0.35;
            group.add(spot);
        });

        // === 目（大きく縦長、黒目） ===
        const ewm = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        [-0.18, 0.18].forEach(x => {
            const ew = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 14), ewm);
            ew.position.set(x, 1.7, 0.42);
            ew.scale.set(0.75, 1.15, 0.55);
            group.add(ew);
            const pu = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12),
                new THREE.MeshBasicMaterial({ color: 0x111111 }));
            pu.position.set(x, 1.7, 0.55);
            pu.scale.y = 1.25;
            group.add(pu);
            const hl = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), ewm);
            hl.position.set(x + 0.03, 1.78, 0.62);
            group.add(hl);
        });

        // 口
        const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 10, 14, Math.PI),
            new THREE.MeshStandardMaterial({ color: 0x222222 }));
        mouth.position.set(0, 1.42, 0.45);
        mouth.rotation.x = Math.PI / 2 + 0.2;
        mouth.rotation.z = Math.PI;
        group.add(mouth);

        // === 腕 ===
        [-0.5, 0.5].forEach(x => {
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.32, 8), skinMaterial);
            arm.position.set(x, 1.05, 0.2);
            arm.rotation.x = -Math.PI / 4;
            arm.rotation.z = x > 0 ? -0.35 : 0.35;
            group.add(arm);
            const hand = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.5 }));
            hand.position.set(x * 0.82, 0.88, 0.45);
            group.add(hand);
        });

        this.addToadSignatureDetails(group, {
            skinMaterial,
            vestMat,
            capMat,
            trimMat,
            pantsMat
        });
    }

    // Mario 64スタイル精緻版 - ヨッシー
    createYoshiCharacter(group) {
        const yoshiColor = this.colorData.skinTone;
        const yoshiMat = new THREE.MeshStandardMaterial({ color: yoshiColor, roughness: 0.5 });
        const bellyMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.45 });
        const shellColor = this.colorData.shellColor || 0xEE1C25;
        const shellMat = new THREE.MeshStandardMaterial({ color: shellColor, roughness: 0.4 });
        const bootMat = new THREE.MeshStandardMaterial({ color: 0xCC5500, roughness: 0.7 });
        const crestColor = this.colorData.crestColor || 0xFF4500;
        const crestMat = new THREE.MeshStandardMaterial({ color: crestColor, roughness: 0.45 });
        const cheekMat = new THREE.MeshStandardMaterial({ color: 0xFF8844 });

        // === ブーツ ===
        [-0.22, 0.22].forEach(x => {
            const boot = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), bootMat);
            boot.position.set(x, 0.5, 0.15);
            boot.scale.set(0.85, 0.55, 1.3);
            group.add(boot);
            const sole = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.38),
                new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 }));
            sole.position.set(x, 0.35, 0.15);
            group.add(sole);
            const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.04, 6, 10), bootMat);
            cuff.position.set(x, 0.65, 0.15);
            cuff.rotation.x = Math.PI / 2;
            group.add(cuff);
        });

        // === 体 ===
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 16), yoshiMat);
        body.position.y = 1.0;
        body.scale.set(1.16, 0.92, 1.12);
        body.castShadow = true;
        group.add(body);

        // 白いお腹
        const belly = new THREE.Mesh(
            new THREE.SphereGeometry(0.46, 16, 14, 0, Math.PI, 0, Math.PI), bellyMat);
        belly.position.set(0, 1.0, 0.25);
        belly.rotation.x = -Math.PI / 2;
        group.add(belly);

        // === しっぽ ===
        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.55, 8), yoshiMat);
        tail.position.set(0, 0.75, -0.65);
        tail.rotation.x = -0.6;
        group.add(tail);
        const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), yoshiMat);
        tailTip.position.set(0, 0.55, -0.85);
        group.add(tailTip);

        // === 赤い鞍（サドル） ===
        const saddle = new THREE.Mesh(
            new THREE.SphereGeometry(0.45, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), shellMat);
        saddle.position.set(0, 1.32, -0.3);
        saddle.rotation.x = Math.PI * 0.7;
        group.add(saddle);
        // 鞍の白い縁
        const saddleRim = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 8, 16), bellyMat);
        saddleRim.position.set(0, 1.2, -0.28);
        saddleRim.rotation.x = Math.PI / 3.2;
        group.add(saddleRim);
        // 鞍の上部リッジ
        const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.35), shellMat);
        ridge.position.set(0, 1.48, -0.3);
        ridge.rotation.x = -0.4;
        group.add(ridge);

        // === 頭 ===
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 18), yoshiMat);
        head.position.y = 1.95;
        head.scale.set(1.02, 1.0, 1.06);
        head.castShadow = true;
        group.add(head);

        // 大きな鼻/口吻
        const snout = new THREE.Mesh(new THREE.SphereGeometry(0.46, 18, 16), yoshiMat);
        snout.position.set(0, 1.86, 0.63);
        snout.scale.set(1.08, 0.84, 1.38);
        group.add(snout);

        // 鼻の穴
        [-0.12, 0.12].forEach(x => {
            const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10),
                new THREE.MeshBasicMaterial({ color: 0x1A4D1A }));
            nostril.position.set(x, 2.0, 1.02);
            group.add(nostril);
        });

        // 頬パッド（オレンジ）
        [-0.32, 0.32].forEach(x => {
            const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), cheekMat);
            cheek.position.set(x, 2.0, 0.38);
            cheek.scale.set(1, 0.75, 0.45);
            group.add(cheek);
        });

        // === 目（飛び出し式）===
        const ewm = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        [-0.23, 0.23].forEach(x => {
            // 目の突出土台
            const eyeBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.14, 12), yoshiMat);
            eyeBase.position.set(x, 2.34, 0.3);
            eyeBase.rotation.x = -0.4;
            group.add(eyeBase);
            // 白目
            const ew = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 14), ewm);
            ew.position.set(x, 2.42, 0.33);
            ew.scale.set(0.76, 1.24, 0.76);
            ew.rotation.y = x > 0 ? -0.2 : 0.2;
            group.add(ew);
            // 瞳
            const pu = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10),
                new THREE.MeshBasicMaterial({ color: 0x111111 }));
            pu.position.set(x * 0.85, 2.46, 0.54);
            group.add(pu);
            // ハイライト
            const hl = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), ewm);
            hl.position.set(x * 0.85 + 0.025, 2.47, 0.58);
            group.add(hl);
        });

        // === 頭のトサカ（三角プレート）===
        for (let i = 0; i < 3; i++) {
            const crest = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 6), crestMat);
            const angle = 2.6 + i * 0.5;
            crest.position.set(0, 1.95 + Math.sin(angle) * 0.55, Math.cos(angle) * 0.55);
            crest.rotation.x = -angle + Math.PI / 2;
            group.add(crest);
        }

        // === 腕 ===
        [-0.52, 0.52].forEach(x => {
            const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.38, 8), yoshiMat);
            arm.position.set(x, 1.05, 0.25);
            arm.rotation.x = -Math.PI / 4;
            arm.rotation.z = x > 0 ? -0.35 : 0.35;
            group.add(arm);
            const hand = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), yoshiMat);
            hand.position.set(x * 0.85, 0.85, 0.52);
            group.add(hand);
        });

        this.addYoshiSignatureDetails(group, {
            yoshiMat,
            bellyMat,
            shellMat,
            crestMat
        });
    }

    // Mario 64スタイル精緻版 - ドンキーコング
    createDKCharacter(group) {
        const furColor = this.colorData.furColor || 0x6B3510;
        const furMat = new THREE.MeshStandardMaterial({ color: furColor, roughness: 0.85 });
        const lightFurMat = new THREE.MeshStandardMaterial({ color: 0xD2691E, roughness: 0.9 });
        const faceMat = new THREE.MeshStandardMaterial({ color: 0xDEB887, roughness: 0.65 });
        const tieColor = this.colorData.tieColor || 0xEE1C25;
        const tieMat = new THREE.MeshStandardMaterial({ color: tieColor, roughness: 0.5 });

        // === 大きな体（ゴリラ的、前傾姿勢）===
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.94, 1.18, 16), furMat);
        body.position.y = 1.22;
        body.rotation.x = 0.1;
        body.castShadow = true;
        group.add(body);

        // 胸元の明るい毛
        const chest = new THREE.Mesh(
            new THREE.SphereGeometry(0.6, 14, 12, 0, Math.PI, 0, Math.PI), lightFurMat);
        chest.position.set(0, 1.3, 0.35);
        chest.rotation.x = -Math.PI / 2;
        group.add(chest);

        // 背中の筋肉ライン
        [-0.25, 0.25].forEach(x => {
            const backMuscle = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10), furMat);
            backMuscle.position.set(x, 1.35, -0.45);
            backMuscle.scale.set(1, 1.4, 0.6);
            group.add(backMuscle);
        });
        // 背中の中央溝
        const spine = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.8, 0.06),
            new THREE.MeshStandardMaterial({ color: 0x5A2D0C, roughness: 0.9 }));
        spine.position.set(0, 1.35, -0.52);
        group.add(spine);

        // === 頭 ===
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.58, 18, 16), furMat);
        head.position.set(0, 2.2, 0.18);
        head.scale.set(1.18, 1.04, 1.14);
        head.castShadow = true;
        group.add(head);

        // 顔面
        const face = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 14), faceMat);
        face.position.set(0, 2.1, 0.52);
        face.scale.set(1.2, 0.92, 0.82);
        group.add(face);

        // 頭頂のリーゼント風の毛
        const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), furMat);
        hairTop.position.set(0, 2.7, 0.08);
        hairTop.scale.set(1, 1.1, 1.5);
        group.add(hairTop);
        for (let i = 0; i < 3; i++) {
            const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 6), furMat);
            tuft.position.set((i - 1) * 0.12, 2.82, 0.15);
            tuft.rotation.x = 0.3;
            group.add(tuft);
        }

        // 後頭部の毛
        const backHair = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), furMat);
        backHair.position.set(0, 2.25, -0.3);
        backHair.scale.set(1, 1, 0.7);
        group.add(backHair);

        // 眉毛（太く威圧的）
        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.15, 0.24), furMat);
        brow.position.set(0, 2.48, 0.54);
        brow.rotation.x = 0.15;
        group.add(brow);

        // 目
        const ewm = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        [-0.18, 0.18].forEach(x => {
            const ew = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 10), ewm);
            ew.position.set(x, 2.3, 0.62);
            group.add(ew);
            const pu = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0x222222 }));
            pu.position.set(x, 2.3, 0.69);
            group.add(pu);
        });

        // 口吻/大きな鼻
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10),
            new THREE.MeshStandardMaterial({ color: 0x3D2314 }));
        nose.position.set(0, 2.15, 0.72);
        nose.scale.set(1.62, 0.78, 0.95);
        group.add(nose);
        // 鼻の穴
        [-0.1, 0.1].forEach(x => {
            const nst = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6),
                new THREE.MeshBasicMaterial({ color: 0x1A0A00 }));
            nst.position.set(x, 2.12, 0.82);
            group.add(nst);
        });

        // 口
        const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 8, 12, Math.PI),
            new THREE.MeshStandardMaterial({ color: 0x222222 }));
        mouth.position.set(0, 2.0, 0.68);
        mouth.rotation.x = Math.PI / 2 + 0.1;
        mouth.rotation.z = Math.PI;
        group.add(mouth);

        // 耳（内側ピンク付き）
        [-0.58, 0.58].forEach(x => {
            const ear = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), furMat);
            ear.position.set(x, 2.25, 0.08);
            ear.scale.set(0.55, 1, 0.75);
            group.add(ear);
            const inner = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0xDEB887 }));
            inner.position.set(x * 1.02, 2.25, 0.1);
            inner.scale.set(0.5, 0.8, 0.6);
            group.add(inner);
        });

        // === ネクタイ ===
        const tie = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.8, 0.08), tieMat);
        tie.position.set(0, 1.42, 0.7);
        tie.rotation.x = 0.15;
        group.add(tie);
        const tieTip = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.24, 4), tieMat);
        tieTip.position.set(0, 0.98, 0.74);
        tieTip.rotation.x = Math.PI;
        tieTip.rotation.y = Math.PI / 4;
        group.add(tieTip);

        // DKロゴ
        const dkCanvas = document.createElement('canvas');
        dkCanvas.width = 64;
        dkCanvas.height = 64;
        const ctx = dkCanvas.getContext('2d');
        ctx.fillStyle = '#FFDD00';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('DK', 32, 32);
        const dkTexture = new THREE.CanvasTexture(dkCanvas);
        const dkLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28),
            new THREE.MeshBasicMaterial({ map: dkTexture, transparent: true }));
        dkLabel.position.set(0, 1.5, 0.73);
        dkLabel.rotation.x = 0.15;
        group.add(dkLabel);

        // === 腕（太く長く、ゴリラらしく）===
        [-0.88, 0.88].forEach(x => {
            // 上腕
            const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.27, 0.54, 10), furMat);
            upperArm.position.set(x, 1.45, 0.2);
            upperArm.rotation.z = x > 0 ? -0.4 : 0.4;
            group.add(upperArm);
            // 前腕
            const foreArm = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.6, 10), furMat);
            foreArm.position.set(x * 1.04, 1.02, 0.54);
            foreArm.rotation.x = -Math.PI / 3.5;
            foreArm.rotation.z = x > 0 ? -0.2 : 0.2;
            group.add(foreArm);
            // 巨大な手（指の示唆あり）
            const hand = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.46), furMat);
            hand.position.set(x * 1.1, 0.56, 0.84);
            group.add(hand);
            for (let f = 0; f < 4; f++) {
                const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.15, 6), furMat);
                finger.position.set(x * 1.1 + (f - 1.5) * 0.08, 0.45, 0.9);
                finger.rotation.x = 0.3;
                group.add(finger);
            }
        });

        this.addDKSignatureDetails(group, {
            furMat,
            faceMat,
            lightFurMat,
            tieMat
        });
    }

    // Mario 64スタイル精緻版 - クッパ
    createBowserCharacter(group) {
        const shellColor = this.colorData.shellColor || 0x4B7C0F;
        const skinColor = this.colorData.skinTone || 0x7FA84F;
        const shellMat = new THREE.MeshStandardMaterial({ color: shellColor, roughness: 0.45 });
        const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.55 });
        const bellyMat = new THREE.MeshStandardMaterial({ color: 0xFFE4B5, roughness: 0.5 });
        const spikeMat = new THREE.MeshStandardMaterial({ color: 0xFFFDD0, roughness: 0.35, metalness: 0.1 });
        const maneMat = new THREE.MeshStandardMaterial({ color: 0xFF4422, roughness: 0.7 });
        const hornMat = new THREE.MeshStandardMaterial({ color: 0xFFFDD0, roughness: 0.3, metalness: 0.15 });
        const bandMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });

        // === 甲羅 ===
        const shell = new THREE.Mesh(new THREE.SphereGeometry(0.95, 20, 18), shellMat);
        shell.position.y = 1.4;
        shell.scale.set(1.18, 0.94, 1.28);
        shell.castShadow = true;
        group.add(shell);

        // 甲羅のセグメント模様（六角形パターン）
        const segMat = new THREE.MeshStandardMaterial({ color: 0x3D6B0A, roughness: 0.5 });
        const segPositions = [
            [0, 1.65, -0.55], [-0.4, 1.5, -0.6], [0.4, 1.5, -0.6],
            [-0.2, 1.3, -0.7], [0.2, 1.3, -0.7], [0, 1.8, -0.35],
        ];
        segPositions.forEach(p => {
            const seg = new THREE.Mesh(new THREE.CircleGeometry(0.18, 6), segMat);
            seg.position.set(p[0], p[1], p[2]);
            seg.lookAt(new THREE.Vector3(p[0], p[1], p[2] - 1));
            seg.rotation.y = Math.PI;
            group.add(seg);
        });

        // 甲羅の縁
        const shellRim = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 8, 20),
            new THREE.MeshStandardMaterial({ color: 0xFFE4B5, roughness: 0.5 }));
        shellRim.position.y = 1.15;
        shellRim.rotation.x = Math.PI / 2;
        shellRim.scale.set(1.1, 1.2, 1);
        group.add(shellRim);

        // トゲ（甲羅に配置、根元リング付き）
        const spikeData = [
            [0, 2.05, -0.4, 0.15, 0.5],
            [-0.5, 1.7, -0.55, 0.13, 0.42],
            [0.5, 1.7, -0.55, 0.13, 0.42],
            [0, 1.8, -0.85, 0.12, 0.4],
            [-0.6, 1.4, -0.5, 0.12, 0.38],
            [0.6, 1.4, -0.5, 0.12, 0.38],
            [-0.3, 1.95, -0.55, 0.11, 0.35],
            [0.3, 1.95, -0.55, 0.11, 0.35],
        ];
        spikeData.forEach(sp => {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(sp[3], sp[4], 8), spikeMat);
            spike.position.set(sp[0], sp[1], sp[2]);
            spike.rotation.x = -0.45;
            spike.rotation.z = sp[0] * -0.4;
            group.add(spike);
            // 根元リング
            const ring = new THREE.Mesh(new THREE.TorusGeometry(sp[3] * 1.1, 0.025, 6, 10), bandMat);
            ring.position.set(sp[0], sp[1] - sp[4] * 0.35, sp[2]);
            ring.rotation.x = Math.PI / 2 - 0.45;
            group.add(ring);
        });

        // お腹（前面、クリーム色の腹板）
        const belly = new THREE.Mesh(
            new THREE.SphereGeometry(0.72, 14, 12, 0, Math.PI, 0, Math.PI * 0.8), bellyMat);
        belly.position.set(0, 1.22, 0.42);
        belly.rotation.x = -Math.PI / 2;
        group.add(belly);
        // 腹板セグメント線
        for (let i = 0; i < 3; i++) {
            const line = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.025, 0.03),
                new THREE.MeshStandardMaterial({ color: 0xDDC090 }));
            line.position.set(0, 1.0 + i * 0.2, 0.62);
            group.add(line);
        }

        // === 尻尾 ===
        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.76, 8), skinMat);
        tail.position.set(0, 0.8, -0.8);
        tail.rotation.x = -0.8;
        group.add(tail);
        const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), skinMat);
        tailTip.position.set(0, 0.5, -1.1);
        group.add(tailTip);
        // 尻尾のトゲ
        const tailSpike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 6), spikeMat);
        tailSpike.position.set(0, 0.65, -0.95);
        tailSpike.rotation.x = -1;
        group.add(tailSpike);

        // === 頭 ===
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.74, 20, 18), skinMat);
        head.position.set(0, 2.4, 0.18);
        head.scale.set(1.16, 1.04, 1.14);
        head.castShadow = true;
        group.add(head);

        // 口吻
        const snout = new THREE.Mesh(new THREE.SphereGeometry(0.46, 14, 12), skinMat);
        snout.position.set(0, 2.22, 0.66);
        snout.scale.set(1.26, 0.82, 1.2);
        group.add(snout);

        // 顎
        const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), skinMat);
        jaw.position.set(0, 2.02, 0.58);
        jaw.scale.set(1.4, 0.55, 1.08);
        group.add(jaw);
        // 牙
        [-0.15, 0.15].forEach(x => {
            const fang = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.17, 6),
                new THREE.MeshBasicMaterial({ color: 0xFFFFFF }));
            fang.position.set(x * 1.1, 2.0, 0.79);
            fang.rotation.x = Math.PI;
            group.add(fang);
        });

        // === ツノ ===
        [-0.35, 0.35].forEach(x => {
            const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.62, 8), hornMat);
            horn.position.set(x * 1.45, 2.98, 0);
            horn.rotation.z = x > 0 ? 0.35 : -0.35;
            horn.rotation.x = -0.15;
            group.add(horn);
            // ツノのリング
            for (let r = 0; r < 2; r++) {
                const hRing = new THREE.Mesh(new THREE.TorusGeometry(0.1 - r * 0.02, 0.02, 6, 8), bandMat);
                hRing.position.set(x * 1.35 + x * r * 0.08, 2.7 + r * 0.15, 0);
                hRing.rotation.x = Math.PI / 2;
                hRing.rotation.z = x > 0 ? 0.35 : -0.35;
                group.add(hRing);
            }
        });

        // === 眉毛（太く赤い）===
        const browMat = new THREE.MeshStandardMaterial({ color: 0xFF4400 });
        [-0.28, 0.28].forEach(x => {
            const brow = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.2), browMat);
            brow.position.set(x, 2.74, 0.5);
            brow.rotation.z = x > 0 ? 0.3 : -0.3;
            brow.rotation.x = -0.1;
            group.add(brow);
        });

        // たてがみ（赤い髪、頭〜首の後ろに流れ落ちる）
        for (let i = 0; i < 7; i++) {
            const hair = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.38, 8), maneMat);
            const angle = -0.5 + i * 0.2;
            hair.position.set(Math.sin(angle) * 0.1, 2.65 - i * 0.08, -0.25 - i * 0.05);
            hair.rotation.x = -0.6 + i * 0.05;
            hair.rotation.z = Math.sin(i) * 0.15;
            group.add(hair);
        }
        // 首の横の毛
        [-0.3, 0.3].forEach(x => {
            for (let i = 0; i < 2; i++) {
                const sideHair = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.25, 6), maneMat);
                sideHair.position.set(x, 2.5 - i * 0.15, -0.1 - i * 0.05);
                sideHair.rotation.z = x > 0 ? 0.5 : -0.5;
                group.add(sideHair);
            }
        });

        // 目（黄色+赤瞳の凶悪な目）
        [-0.23, 0.23].forEach(x => {
            const ew = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10),
                new THREE.MeshBasicMaterial({ color: 0xFFFF00 }));
            ew.position.set(x, 2.52, 0.58);
            group.add(ew);
            const pu = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0xCC0000 }));
            pu.position.set(x, 2.52, 0.66);
            group.add(pu);
        });

        // 鼻の穴
        [-0.1, 0.1].forEach(x => {
            const nst = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6),
                new THREE.MeshBasicMaterial({ color: 0x2A4A10 }));
            nst.position.set(x, 2.28, 0.82);
            group.add(nst);
        });

        // === 腕 + スパイクドカフス ===
        [-0.76, 0.76].forEach(x => {
            // 上腕
            const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.48, 10), skinMat);
            upperArm.position.set(x, 1.55, 0.3);
            upperArm.rotation.z = x > 0 ? -0.4 : 0.4;
            group.add(upperArm);
            // 前腕
            const foreArm = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.48, 10), skinMat);
            foreArm.position.set(x * 1.05, 1.14, 0.58);
            foreArm.rotation.x = -Math.PI / 3.5;
            foreArm.rotation.z = x > 0 ? -0.2 : 0.2;
            group.add(foreArm);
            // スパイクドカフス
            const cuffX = x * 1.02, cuffY = 1.35, cuffZ = 0.42;
            const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 10), bandMat);
            cuff.position.set(cuffX, cuffY, cuffZ);
            cuff.rotation.z = x > 0 ? -0.3 : 0.3;
            group.add(cuff);
            for (let s = 0; s < 3; s++) {
                const sa = (s / 3) * Math.PI * 2;
                const cuffSpike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 6), spikeMat);
                cuffSpike.position.set(
                    cuffX + Math.sin(sa) * 0.2 * (x > 0 ? 1 : -1),
                    cuffY + Math.cos(sa) * 0.2,
                    cuffZ
                );
                cuffSpike.rotation.z = Math.sin(sa) * (x > 0 ? 0.5 : -0.5);
                group.add(cuffSpike);
            }
            // 爪
            const hand = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), skinMat);
            hand.position.set(x * 1.1, 0.84, 0.88);
            group.add(hand);
            for (let c = 0; c < 3; c++) {
                const claw = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.2, 6), spikeMat);
                claw.position.set(x * 1.1 + (c - 1) * 0.09, 0.76, 1.02);
                claw.rotation.x = Math.PI / 2.5;
                group.add(claw);
            }
        });

        this.addBowserSignatureDetails(group, {
            shellMat,
            skinMat,
            bellyMat,
            spikeMat,
            maneMat,
            bandMat
        });
    }


    // === Helper functions for character features ===

    addHumanSilhouetteDetails(group, humanProfile, materials) {
        const { skinMaterial, clothesMat, overallsMat, hatMat, hairMat } = materials;
        const signatureMap = {
            mario: {
                shoulderX: 0.44,
                shoulderScale: [1.25, 0.9, 1.05],
                hipScale: [1.18, 0.66, 0.92],
                jawScale: [1.05, 0.6, 0.86],
                capBackScale: [1.02, 0.72, 0.86],
                rearBillScale: [0.24, 0.08, 0.2],
                mouthRadius: 0.105,
                mouthY: 1.63,
                mouthZ: 0.63,
                sideburnHeight: 0.28,
                sideburnX: 0.46,
                neckScale: [1.0, 1.0, 0.92]
            },
            luigi: {
                shoulderX: 0.42,
                shoulderScale: [1.08, 0.9, 0.98],
                hipScale: [1.04, 0.66, 0.88],
                jawScale: [0.94, 0.54, 0.82],
                capBackScale: [0.94, 0.78, 0.82],
                rearBillScale: [0.22, 0.08, 0.18],
                mouthRadius: 0.09,
                mouthY: 1.62,
                mouthZ: 0.62,
                sideburnHeight: 0.32,
                sideburnX: 0.45,
                neckScale: [0.92, 1.08, 0.88]
            },
            wario: {
                shoulderX: 0.5,
                shoulderScale: [1.36, 0.95, 1.14],
                hipScale: [1.26, 0.74, 0.98],
                jawScale: [1.26, 0.72, 0.98],
                capBackScale: [1.14, 0.68, 0.92],
                rearBillScale: [0.28, 0.1, 0.22],
                mouthRadius: 0.12,
                mouthY: 1.59,
                mouthZ: 0.66,
                sideburnHeight: 0.24,
                sideburnX: 0.49,
                neckScale: [1.08, 0.96, 0.95]
            }
        };
        const signature = signatureMap[this.characterId] || signatureMap.mario;
        const mouthMat = new THREE.MeshStandardMaterial({ color: 0x402020, roughness: 0.85 });

        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.22, 10), skinMaterial);
        neck.position.set(0, 1.6, 0.12);
        neck.scale.set(signature.neckScale[0], signature.neckScale[1], signature.neckScale[2]);
        group.add(neck);

        [-signature.shoulderX, signature.shoulderX].forEach(x => {
            const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), clothesMat);
            shoulder.position.set(x, 1.46, 0.02);
            shoulder.scale.set(signature.shoulderScale[0], signature.shoulderScale[1], signature.shoulderScale[2]);
            group.add(shoulder);
        });

        const hipSeat = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), overallsMat);
        hipSeat.position.set(0, 0.95, -0.18);
        hipSeat.scale.set(signature.hipScale[0], signature.hipScale[1], signature.hipScale[2]);
        group.add(hipSeat);

        const lowerBack = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.2, 0.24), overallsMat);
        lowerBack.position.set(0, 1.08, -0.44);
        group.add(lowerBack);

        const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), skinMaterial);
        jaw.position.set(0, this.characterId === 'wario' ? 1.69 : 1.74, this.characterId === 'wario' ? 0.29 : 0.24);
        jaw.scale.set(signature.jawScale[0], signature.jawScale[1], signature.jawScale[2]);
        group.add(jaw);

        const mouth = new THREE.Mesh(
            new THREE.TorusGeometry(signature.mouthRadius, 0.022, 8, 12, Math.PI),
            mouthMat
        );
        mouth.position.set(0, signature.mouthY, signature.mouthZ);
        mouth.rotation.x = Math.PI / 2 + 0.18;
        mouth.rotation.z = Math.PI;
        group.add(mouth);

        const capBack = new THREE.Mesh(
            new THREE.SphereGeometry(0.38, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.65),
            hatMat
        );
        capBack.position.set(0, humanProfile.hatY - 0.05, -0.34);
        capBack.rotation.x = 0.18;
        capBack.scale.set(signature.capBackScale[0], signature.capBackScale[1], signature.capBackScale[2]);
        group.add(capBack);

        const rearBill = new THREE.Mesh(
            new THREE.BoxGeometry(signature.rearBillScale[0], signature.rearBillScale[1], signature.rearBillScale[2]),
            hatMat
        );
        rearBill.position.set(0, humanProfile.hatY - 0.23, -0.58);
        rearBill.rotation.x = -0.12;
        group.add(rearBill);

        [-signature.sideburnX, signature.sideburnX].forEach(x => {
            const sideburn = new THREE.Mesh(new THREE.BoxGeometry(0.11, signature.sideburnHeight, 0.11), hairMat);
            sideburn.position.set(x, 1.84, -0.03);
            sideburn.rotation.z = x > 0 ? 0.08 : -0.08;
            group.add(sideburn);
        });

        if (this.characterId === 'wario') {
            const belly = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), clothesMat);
            belly.position.set(0, 1.12, 0.2);
            belly.scale.set(1.28, 0.84, 0.92);
            group.add(belly);
        } else {
            const backHair = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), hairMat);
            backHair.position.set(0, 1.78, -0.3);
            backHair.scale.set(1.15, 0.7, 0.68);
            group.add(backHair);
        }
    }

    addPrincessSignatureDetails(group, materials) {
        const { skinMaterial, dressMat, hairMat, crownMat, frillMat } = materials;
        const browMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.85 });
        const lipMat = new THREE.MeshBasicMaterial({ color: 0xFF6F9F });

        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.2, 10), skinMaterial);
        neck.position.set(0, 1.72, 0.12);
        group.add(neck);

        const backBodice = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.4, 0.12), dressMat);
        backBodice.position.set(0, 1.28, -0.28);
        group.add(backBodice);

        const bustle = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), frillMat);
        bustle.position.set(0, 1.02, -0.48);
        bustle.scale.set(1.5, 0.72, 0.75);
        group.add(bustle);

        const hairMantle = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 12), hairMat);
        hairMantle.position.set(0, 1.72, -0.42);
        hairMantle.scale.set(1.12, 1.45, 0.76);
        group.add(hairMantle);

        const lowerHair = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), hairMat);
        lowerHair.position.set(0, 1.02, -0.38);
        lowerHair.scale.set(1.0, 1.08, 0.74);
        group.add(lowerHair);

        [-0.18, 0.18].forEach(x => {
            const brow = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 8), browMat);
            brow.position.set(x, 2.24, 0.46);
            brow.rotation.z = Math.PI / 2 + (x > 0 ? -0.14 : 0.14);
            brow.rotation.x = -0.18;
            group.add(brow);
        });

        const upperLip = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 8, 10, Math.PI), lipMat);
        upperLip.position.set(0, 1.87, 0.5);
        upperLip.rotation.x = Math.PI / 2 + 0.18;
        upperLip.rotation.z = Math.PI;
        group.add(upperLip);

        const frontGem = new THREE.Mesh(
            new THREE.SphereGeometry(0.065, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xD91E5B })
        );
        frontGem.position.set(0, 2.73, 0.27);
        group.add(frontGem);

        [-0.52, 0.52].forEach(x => {
            const rearCurl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), hairMat);
            rearCurl.position.set(x * 0.82, 1.18, -0.18);
            rearCurl.scale.set(0.86, 1.1, 0.72);
            group.add(rearCurl);
        });
    }

    addToadSignatureDetails(group, materials) {
        const { skinMaterial, vestMat, capMat, trimMat, pantsMat } = materials;
        const mouthMat = new THREE.MeshStandardMaterial({ color: 0x3A2A22, roughness: 0.9 });

        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.14, 10), skinMaterial);
        neck.position.set(0, 1.34, 0.14);
        group.add(neck);

        const belly = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), pantsMat);
        belly.position.set(0, 0.9, 0.22);
        belly.scale.set(1.1, 0.7, 0.72);
        group.add(belly);

        const vestOpening = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.08), pantsMat);
        vestOpening.position.set(0, 0.95, 0.52);
        group.add(vestOpening);

        const backCap = new THREE.Mesh(
            new THREE.SphereGeometry(0.62, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.6),
            capMat
        );
        backCap.position.set(0, 2.06, -0.52);
        backCap.rotation.x = 0.16;
        backCap.scale.set(1.0, 0.68, 0.88);
        group.add(backCap);

        [-0.72, 0.72].forEach(x => {
            const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), capMat);
            lobe.position.set(x, 2.04, -0.08);
            lobe.scale.set(1.05, 0.82, 0.88);
            group.add(lobe);
        });

        const rearSpot = new THREE.Mesh(
            new THREE.SphereGeometry(0.28, 12, 10),
            new THREE.MeshStandardMaterial({ color: this.colorData.mushroomSpots || 0xEE1C25, roughness: 0.45 })
        );
        rearSpot.position.set(0, 2.18, -0.78);
        rearSpot.scale.set(1.18, 0.9, 0.34);
        group.add(rearSpot);

        const rearTrim = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.04, 6, 16), trimMat);
        rearTrim.position.set(0, 0.9, -0.46);
        rearTrim.rotation.x = Math.PI / 2;
        group.add(rearTrim);

        const smile = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 8, 10, Math.PI), mouthMat);
        smile.position.set(0, 1.42, 0.46);
        smile.rotation.x = Math.PI / 2 + 0.16;
        smile.rotation.z = Math.PI;
        group.add(smile);
    }

    addYoshiSignatureDetails(group, materials) {
        const { yoshiMat, bellyMat, shellMat, crestMat } = materials;
        const seamMat = new THREE.MeshStandardMaterial({ color: 0x2F4F1F, roughness: 0.9 });

        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.34, 10), yoshiMat);
        neck.position.set(0, 1.48, 0.18);
        neck.rotation.x = -0.28;
        group.add(neck);

        const chest = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), bellyMat);
        chest.position.set(0, 1.34, 0.42);
        chest.scale.set(1.08, 0.86, 0.68);
        group.add(chest);

        const mouthSeam = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.018, 8, 12, Math.PI), seamMat);
        mouthSeam.position.set(0, 1.78, 0.83);
        mouthSeam.rotation.x = Math.PI / 2 + 0.08;
        mouthSeam.rotation.z = Math.PI;
        group.add(mouthSeam);

        const shellBack = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), shellMat);
        shellBack.position.set(0, 1.24, -0.44);
        shellBack.scale.set(1.0, 0.68, 0.74);
        group.add(shellBack);

        [
            { y: 2.18, z: -0.04, scale: [0.9, 1.0, 1.0] },
            { y: 1.9, z: -0.22, scale: [1.02, 1.08, 1.0] },
            { y: 1.58, z: -0.44, scale: [1.06, 1.12, 1.0] }
        ].forEach(spine => {
            const plate = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), crestMat);
            plate.position.set(0, spine.y, spine.z);
            plate.scale.set(spine.scale[0], spine.scale[1], spine.scale[2]);
            group.add(plate);
        });
    }

    addDKSignatureDetails(group, materials) {
        const { furMat, faceMat, lightFurMat, tieMat } = materials;
        const lipMat = new THREE.MeshStandardMaterial({ color: 0x5A2E1A, roughness: 0.8 });

        const neckHump = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), furMat);
        neckHump.position.set(0, 1.88, -0.1);
        neckHump.scale.set(1.18, 0.9, 0.86);
        group.add(neckHump);

        const shoulderBar = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), furMat);
        shoulderBar.position.set(0, 1.48, -0.16);
        shoulderBar.scale.set(1.68, 0.78, 0.84);
        group.add(shoulderBar);

        const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), faceMat);
        jaw.position.set(0, 1.92, 0.38);
        jaw.scale.set(1.34, 0.58, 0.86);
        group.add(jaw);

        [-0.44, 0.44].forEach(x => {
            const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), furMat);
            cheek.position.set(x, 2.12, 0.26);
            cheek.scale.set(0.78, 1.18, 0.78);
            group.add(cheek);
        });

        const lowerLip = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 8, 10, Math.PI), lipMat);
        lowerLip.position.set(0, 1.98, 0.69);
        lowerLip.rotation.x = Math.PI / 2 + 0.12;
        lowerLip.rotation.z = Math.PI;
        group.add(lowerLip);

        const tieKnot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.1), tieMat);
        tieKnot.position.set(0, 1.78, 0.68);
        tieKnot.rotation.x = 0.18;
        group.add(tieKnot);

        const backFur = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), lightFurMat);
        backFur.position.set(0, 1.42, -0.5);
        backFur.scale.set(0.94, 1.2, 0.52);
        group.add(backFur);
    }

    addBowserSignatureDetails(group, materials) {
        const { shellMat, skinMat, bellyMat, spikeMat, maneMat, bandMat } = materials;
        const jawMat = new THREE.MeshStandardMaterial({ color: 0x5F8A2C, roughness: 0.62 });

        const shoulderShell = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), shellMat);
        shoulderShell.position.set(0, 1.82, -0.2);
        shoulderShell.scale.set(1.56, 0.84, 0.86);
        group.add(shoulderShell);

        [-0.92, 0.92].forEach(x => {
            const sideSpike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 8), spikeMat);
            sideSpike.position.set(x, 1.54, -0.26);
            sideSpike.rotation.z = x > 0 ? -1.15 : 1.15;
            sideSpike.rotation.x = 0.08;
            group.add(sideSpike);
        });

        const neckPlate = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), bellyMat);
        neckPlate.position.set(0, 1.88, 0.24);
        neckPlate.scale.set(1.22, 0.72, 0.64);
        group.add(neckPlate);

        const lowerJaw = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), jawMat);
        lowerJaw.position.set(0, 1.92, 0.54);
        lowerJaw.scale.set(1.34, 0.52, 0.9);
        group.add(lowerJaw);

        [-0.28, 0.28].forEach(x => {
            const fang = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 6),
                new THREE.MeshBasicMaterial({ color: 0xFFF7E8 }));
            fang.position.set(x, 1.92, 0.82);
            fang.rotation.x = Math.PI;
            group.add(fang);
        });

        for (let i = 0; i < 4; i++) {
            const mane = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.32, 7), maneMat);
            mane.position.set(0, 2.4 - i * 0.18, -0.06 - i * 0.12);
            mane.rotation.x = -0.72 + i * 0.08;
            group.add(mane);
        }

        [-0.82, 0.82].forEach(x => {
            const shoulderBand = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 10), bandMat);
            shoulderBand.position.set(x, 1.5, 0.28);
            shoulderBand.rotation.z = x > 0 ? -0.34 : 0.34;
            group.add(shoulderBand);
        });

        const shellTailBridge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.36), skinMat);
        shellTailBridge.position.set(0, 1.0, -0.7);
        group.add(shellTailBridge);
    }
    
    addCapEmblem(group, letter) {
        if (!letter) return;
        
        const emblemCanvas = document.createElement('canvas');
        emblemCanvas.width = 64;
        emblemCanvas.height = 64;
        const ctx = emblemCanvas.getContext('2d');
        ctx.fillStyle = 'white';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(letter, 32, 32);
        
        const emblemTexture = new THREE.CanvasTexture(emblemCanvas);
        const emblemGeo = new THREE.CircleGeometry(0.18, 12);
        const emblemMat = new THREE.MeshBasicMaterial({ 
            map: emblemTexture,
            transparent: true
        });
        const emblem = new THREE.Mesh(emblemGeo, emblemMat);
        emblem.position.set(
            0,
            group.userData.capEmblemY || 2.47,
            group.userData.capEmblemZ || 0.58
        );
        group.add(emblem);
    }
    
    setPosition(x, y, z, rotation = 0) {
        this.position.set(x, y, z);
        if (!this.lastValidPosition) {
            this.lastValidPosition = new THREE.Vector3();
        }
        this.lastValidPosition.copy(this.position);  // 有効な位置として保存
        this.rotation = rotation;
        this.updateMeshPosition();
    }
    
    updateMeshPosition() {
        this.mesh.position.copy(this.position);
        

        
        this.mesh.rotation.y = this.rotation;
        
        // Apply shrink effect
        const scale = this.isShrunken ? 0.5 : 1;
        this.mesh.scale.set(scale, scale, scale);
    }
    
    update(deltaTime, track) {
        if (this.finished) {
            // Slow to stop after finishing
            this.speed *= 0.95;
            this.updatePhysics(deltaTime, track);
            return;
        }
        
        // ジュゲム救出中の処理
        if (this.isBeingRescued) {
            this.rescueTimer -= deltaTime;
            if (this.rescueTimer <= 0) {
                // 救出完了、コースに復帰
                this.isBeingRescued = false;
                this.position.y = this.rescueTargetY;
                this.updateMeshPosition();
                this.lastValidPosition.copy(this.position);
            } else {
                // 上空からゆっくり降下
                const progress = 1.0 - (this.rescueTimer / 1.8);
                const easeOut = 1 - Math.pow(1 - progress, 3); // イーズアウト
                this.position.y = this.rescueStartY + (this.rescueTargetY - this.rescueStartY) * easeOut;
                this.speed = 0;
                this.velocity.set(0, 0, 0);
                this.updateMeshPosition();
            }
            return;
        }
        
        // Update timers
        this.updateTimers(deltaTime);
        
        if (this.isSpunOut) {
            this.handleSpinOut(deltaTime);
            this.updateMeshPosition();
            return;
        }
        
        if (this.isFrozen) {
            // Can't move while frozen
            this.speed *= 0.95;
            this.updateMeshPosition();
            return;
        }
        
        // Handle input for BOTH player and AI
        // (AI sets input via AIController before this is called)
        this.handleInput(deltaTime, track);
        
        // Update physics
        this.updatePhysics(deltaTime, track);
        
        // Update drift
        this.updateDrift(deltaTime);
        
        // Update boost
        this.updateBoost(deltaTime);
        
        // Rotate wheels
        this.updateWheels(deltaTime);
        
        // Update exhaust flames
        this.updateExhaustFlames(deltaTime);
        
        // Update collision box
        this.updateCollisionBox();
        
        // Check for track features
        this.checkTrackFeatures(track);
        
        // Update race progress
        this.updateRaceProgress(track);
        
        // Update shield visual
        if (this.hasShield) {
            this.shieldMesh.rotation.y += deltaTime * 2;
            this.shieldMesh.material.opacity = 0.3 + Math.sin(Date.now() * 0.005) * 0.1;
        }
    }
    
    updateTimers(deltaTime) {
        if (this.shrinkTimer > 0) {
            this.shrinkTimer -= deltaTime;
            if (this.shrinkTimer <= 0) {
                this.isShrunken = false;
            }
        }
        
        if (this.freezeTimer > 0) {
            this.freezeTimer -= deltaTime;
            if (this.freezeTimer <= 0) {
                this.isFrozen = false;
            }
        }
        
        if (this.spinOutTimer > 0) {
            this.spinOutTimer -= deltaTime;
            if (this.spinOutTimer <= 0) {
                this.isSpunOut = false;
            }
        }
        
        if (this.invincibilityTimer > 0) {
            this.invincibilityTimer -= deltaTime;
        }

        if (this.burnoutTimer > 0) {
            this.burnoutTimer -= deltaTime;
            if (this.burnoutTimer <= 0) {
                this.burnoutTimer = 0;
            }
        }
        
        // シールドのタイマー（スターと同じ8秒間）
        if (this.shieldTimer > 0) {
            this.shieldTimer -= deltaTime;
            if (this.shieldTimer <= 0) {
                this.hasShield = false;
                this.shieldMesh.material.opacity = 0;
            }
        }
    }
    
    handleInput(deltaTime, track) {
        const input = this.input;

        if (this.burnoutTimer > 0) {
            this.enginePower = Utils.lerp(this.enginePower, 0, 0.25);
            this.speed = Math.max(0, this.speed - this.brakeStrength * 0.4 * deltaTime);
            this.targetRotation = 0;
            this.currentTurnAmount = Utils.lerp(this.currentTurnAmount, 0, 0.2);
            this.lateralVelocity = Utils.lerp(this.lateralVelocity, 0, 0.2);
            this.driftAngle = Utils.lerp(this.driftAngle, 0, 0.15);
            return;
        }
        
        // === エンジンパワーシステム（アーケード風即応性） ===
        const maxSpd = this.getEffectiveMaxSpeed();
        
        if (input.forward) {
            // 素早いエンジンレスポンス
            this.enginePower = Utils.lerp(this.enginePower, 1.0, 0.15);
        } else if (input.backward) {
            if (this.speed > 5) {
                // 強力なブレーキ
                this.enginePower = Utils.lerp(this.enginePower, -1.0, 0.2);
            } else {
                // バック
                this.enginePower = Utils.lerp(this.enginePower, -0.5, 0.1);
            }
        } else {
            // 緩やかなエンジンブレーキ
            this.enginePower = Utils.lerp(this.enginePower, 0, 0.08);
        }
        
        // エンジンパワーを速度に変換
        if (this.enginePower > 0) {
            // 加速カーブ - 低速で強く、高速で緩やか
            const accelerationCurve = Math.pow(1 - (this.speed / maxSpd), 0.7);
            this.speed += this.acceleration * this.enginePower * accelerationCurve * deltaTime;
            this.speed = Math.min(this.speed, maxSpd);
        } else if (this.enginePower < 0) {
            if (this.speed > 0) {
                // ブレーキ
                this.speed += this.brakeStrength * this.enginePower * deltaTime;
                this.speed = Math.max(0, this.speed);
            } else {
                // バック
                this.speed += this.acceleration * 0.5 * this.enginePower * deltaTime;
                this.speed = Math.max(-maxSpd * 0.4, this.speed);
            }
        } else {
            // 自然減速
            if (this.speed > 0) {
                this.speed = Math.max(0, this.speed - this.deceleration * deltaTime);
            } else if (this.speed < 0) {
                this.speed = Math.min(0, this.speed + this.deceleration * deltaTime);
            }
        }
        
        // === ドリフトシステム（三段階ブースト） ===
        const speedRatio = Math.abs(this.speed) / maxSpd;
        const minDriftSpeed = 8;
        
        // ドリフト開始・終了判定（プレイヤーのみ）
        if (this.isPlayer) {
            if (input.drift && Math.abs(this.speed) > minDriftSpeed) {
                if (!this.isDrifting) {
                    // 左右入力方向でドリフト方向を決定
                    if (input.left) {
                        this.startDrift(-1);
                    } else if (input.right) {
                        this.startDrift(1);
                    } else if (this.currentTurnAmount < -0.1) {
                        this.startDrift(-1);
                    } else if (this.currentTurnAmount > 0.1) {
                        this.startDrift(1);
                    }
                    // 方向入力なしの場合はドリフト開始しない
                }
            } else if (this.isDrifting && !input.drift) {
                this.endDrift();
            }
        }
        
        // === 旋回処理 ===
        // 速度に応じた旋回能力
        const turnAbility = 0.4 + speedRatio * 0.6;  // 低速でも十分曲がれる
        const highSpeedPenalty = speedRatio > 0.8 ? (1 - (speedRatio - 0.8) * 0.3) : 1;
        
        if (this.isDrifting) {
            // === ドリフト中の操作（さらに緩やかなカーブ）===
            const driftIntensity = 1.0 + this.driftLevel * 0.1;
            // ベースのドリフト旋回（さらに緩やかに曲がる）
            const baseDriftTurn = this.driftDirection * this.turnSpeed * 0.3 * driftIntensity;
            // ステアリング入力で微調整
            let steerAdjust = 0;
            if (input.left) {
                steerAdjust = this.turnSpeed * 0.2;
            } else if (input.right) {
                steerAdjust = -this.turnSpeed * 0.2;
            }
            this.targetRotation = baseDriftTurn + steerAdjust;
            // ドリフト角度を更新（視覚用）
            this.driftAngle = Utils.lerp(this.driftAngle, this.driftDirection * 15, 0.05);
            // 横滑り（さらに控えめ）
            const driftSlide = this.driftDirection * this.speed * 0.08 * this.driftGrip;
            this.lateralVelocity = Utils.lerp(this.lateralVelocity, driftSlide, 0.06);
            // 旋回量を更新
            this.currentTurnAmount = Utils.lerp(this.currentTurnAmount, -this.driftDirection, 0.08);
            
        } else {
            // === 通常走行（復帰を遅く）===
            this.driftAngle = Utils.lerp(this.driftAngle, 0, 0.08);  // 0.15→0.08 より遅く
            this.lateralVelocity = Utils.lerp(this.lateralVelocity, 0, 0.1);  // 0.2→0.1 より遅く
            
            if (input.left) {
                this.targetRotation = this.turnSpeed * turnAbility * highSpeedPenalty;
                this.currentTurnAmount = Utils.lerp(this.currentTurnAmount, -1, this.steeringResponse);
            } else if (input.right) {
                this.targetRotation = -this.turnSpeed * turnAbility * highSpeedPenalty;
                this.currentTurnAmount = Utils.lerp(this.currentTurnAmount, 1, this.steeringResponse);
            } else {
                this.targetRotation = 0;
                this.currentTurnAmount = Utils.lerp(this.currentTurnAmount, 0, this.steeringResponse * 1.5);  // 2→1.5
            }
        }
        
        // 旋回を適用
        this.rotation += this.targetRotation * deltaTime;
    }
    
    updatePhysics(deltaTime, track) {
        // === 地形判定 ===
        this.onGrass = track.isOnGrass(this.position.x, this.position.z);
        
        // 芝でのペナルティ（プレイヤーのみ適用、AIは無視）
        let terrainGrip = 1.0;
        if (this.onGrass && this.isPlayer) {
            this.speed *= Math.pow(this.grassFriction, deltaTime * 20);  // ペナルティ緩和
            terrainGrip = 0.75;  // グリップやや低下
            // 最高速度制限を緩和
            if (!this.isDrifting) {
                this.speed = Math.min(this.speed, this.maxSpeed * 0.75);
            }
        }
        
        // === 速度ベクトル計算 ===
        const forwardDir = new THREE.Vector3(
            Math.sin(this.rotation),
            0,
            Math.cos(this.rotation)
        );
        
        // 横方向（ドリフト・横滑り用）
        const lateralDir = new THREE.Vector3(
            Math.cos(this.rotation),
            0,
            -Math.sin(this.rotation)
        );
        
        // 前方速度
        this.velocity.copy(forwardDir).multiplyScalar(this.speed * deltaTime);
        
        // 横滑りを追加
        if (Math.abs(this.lateralVelocity) > 0.5) {
            const lateralMove = lateralDir.clone().multiplyScalar(this.lateralVelocity * deltaTime * terrainGrip);
            this.velocity.add(lateralMove);
        }
        
        // === 速度の安全チェック（NaN/Infinity防止） ===
        if (isNaN(this.speed) || !isFinite(this.speed)) {
            this.speed = 0;
        }
        if (isNaN(this.velocity.x) || isNaN(this.velocity.z) || !isFinite(this.velocity.x) || !isFinite(this.velocity.z)) {
            this.velocity.set(0, 0, 0);
        }
        
        // === 1フレームの移動距離を制限（暴走防止） ===
        const maxMovePerFrame = 6;  // 1フレームで最大6単位まで
        const moveDistance = this.velocity.length();
        if (moveDistance > maxMovePerFrame) {
            this.velocity.normalize().multiplyScalar(maxMovePerFrame);
        }
        
        // 位置更新（ブースト中も移動距離制限は有効）
        const prevPosition = this.position.clone();
        this.position.add(this.velocity);
        
        // 移動後の位置ジャンプ検出（1フレームで大きく動いたら戻す）
        const jumpDist = prevPosition.distanceTo(this.position);
        if (jumpDist > 20) {
            this.position.copy(prevPosition);
            this.speed *= 0.5;
            this.velocity.set(0, 0, 0);
        }
        
        // NaNチェック - 位置が不正になったら最後の有効な位置に戻す
        if (isNaN(this.position.x) || isNaN(this.position.z) || isNaN(this.position.y) ||
            !isFinite(this.position.x) || !isFinite(this.position.z) || !isFinite(this.position.y)) {
            if (this.lastValidPosition && !isNaN(this.lastValidPosition.x)) {
                this.position.copy(this.lastValidPosition);
            }
            this.speed = 0;
            this.velocity.set(0, 0, 0);
            this.boostTime = 0;
            this.boostMultiplier = 1;
            return;
        }
        
        // === 極端なコース外チェック（暴走防止） ===
        const maxDistance = 500;  // コース中心からの最大許容距離
        const distFromCenter = Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z);
        if (distFromCenter > maxDistance) {
            if (this.lastValidPosition && !isNaN(this.lastValidPosition.x)) {
                this.position.copy(this.lastValidPosition);
            }
            this.speed *= 0.5;  // 速度を半減
            this.velocity.set(0, 0, 0);
            this.boostTime = 0;
            this.boostMultiplier = 1;
            // 方向をコース中心に向ける
            this.rotation = Math.atan2(-this.position.x, -this.position.z);
            return;
        }
        
        // === 溶岩落下チェック（城コース） ===
        if (track.hasLava) {
            // コース外（石畳の外）に出たかチェック
            const onTrack = track.isOnTrack(this.position.x, this.position.z);
            if (!onTrack) {
                // 溶岩に落ちた！ジュゲムに救出される
                this.lakituRescue(track);
                return;
            }
        }
        
        // === 雪原コースAI専用：コース外に出たら救出 ===
        if (track.courseType === 'snow' && !this.isPlayer) {
            const onTrack = track.isOnTrack(this.position.x, this.position.z);
            if (!onTrack) {
                // 雪壁の外に出た！ジュゲムに救出される
                this.lakituRescue(track);
                return;
            }
        }
        
        // === 地形高さ追従 ===
        const targetY = track.getHeightAt(this.position.x, this.position.z) + 1.0;
        if (!isNaN(targetY)) {
            this.position.y = Utils.lerp(this.position.y, targetY, 0.4);  // 素早く追従
        }

        // --- AIカートの草原コース外判定 ---
        if (track.courseType === 'grassland' && !this.isPlayer) {
            const onTrack = track.isOnTrack(this.position.x, this.position.z);
            if (!onTrack) {
                this.offTrackTimer = (this.offTrackTimer || 0) + deltaTime;
                if (this.offTrackTimer > 7) {
                    this.lakituRescue(track);
                    this.offTrackTimer = 0;
                }
            } else {
                this.offTrackTimer = 0;
            }
        }

        // 位置が有効なら保存
        this.lastValidPosition.copy(this.position);
        
        // === 摩擦適用 ===
        // AIカートはコース外でもコース内と同じ摩擦係数を使用
        const currentFriction = (this.onGrass && this.isPlayer) ? this.grassFriction : this.friction;
        this.speed *= currentFriction;
        
        // === メッシュ更新 ===
        this.updateMeshPosition();
        
        // カートの傾き
        if (!this.isSpunOut) {
            // ロール（左右の傾き）
            const tiltAmount = this.isDrifting ? 0.22 : 0.12;
            const targetTilt = this.currentTurnAmount * tiltAmount;
            this.mesh.rotation.z = Utils.lerp(this.mesh.rotation.z, targetTilt, 0.2);
            
            // ピッチ（前後の傾き）- 加速/ブレーキで傾く
            const pitchAmount = -this.enginePower * 0.04;
            this.mesh.rotation.x = Utils.lerp(this.mesh.rotation.x || 0, pitchAmount, 0.15);
        }
    }
    
    startDrift(direction) {
        if (this.isDrifting) return;
        
        this.isDrifting = true;
        this.driftDirection = direction;
        this.driftTime = 0;
        this.driftLevel = 0;
        this.driftCharge = 0;
        this.driftChargePhase = 0;
        this.lastDriftSteerInput = 0;
        
        if (window.audioManager) {
            window.audioManager.startDriftSound();
        }
    }
    
    updateDrift(deltaTime) {
        if (!this.isDrifting) return;
        
        this.driftTime += deltaTime;

        if (this.isPlayer) {
            const steerDir = this.input.left ? -1 : this.input.right ? 1 : 0;
            if (steerDir !== 0 && steerDir !== this.lastDriftSteerInput) {
                const expectedDir = this.driftChargePhase === 0 ? -this.driftDirection : this.driftDirection;
                if (steerDir === expectedDir) {
                    if (this.driftChargePhase === 1) {
                        this.driftCharge = Math.min(3, this.driftCharge + 1);
                    }
                    this.driftChargePhase = 1 - this.driftChargePhase;
                }
                this.lastDriftSteerInput = steerDir;
            } else if (steerDir === 0) {
                this.lastDriftSteerInput = 0;
            }
        } else {
            if (this.driftTime >= 1.1 && this.driftCharge < 3) {
                this.driftCharge = 3;
            } else if (this.driftTime >= 0.7 && this.driftCharge < 2) {
                this.driftCharge = 2;
            } else if (this.driftTime >= 0.35 && this.driftCharge < 1) {
                this.driftCharge = 1;
            }
        }

        if (this.driftCharge >= 3) {
            this.driftLevel = 3;
        } else if (this.driftCharge >= 2) {
            this.driftLevel = 2;
        } else if (this.driftCharge >= 1) {
            this.driftLevel = 1;
        }
    }
    
    endDrift() {
        if (!this.isDrifting) return;
        
        if (window.audioManager) {
            window.audioManager.stopDriftSound();
        }
        
        // Apply boost based on drift level
        if (this.driftLevel >= 1) {
            const boostDurations = [0, 0.45, 0.7, 0.95];
            const boostMultipliers = [1, 1.16, 1.24, 1.3];
            
            this.applyBoost(boostDurations[this.driftLevel], boostMultipliers[this.driftLevel]);
            
            if (window.audioManager) {
                window.audioManager.playSound(this.driftLevel >= 2 ? 'boost_big' : 'boost');
            }
        }
        
        this.isDrifting = false;
        this.driftDirection = 0;
        this.driftTime = 0;
        this.driftLevel = 0;
        this.driftCharge = 0;
        this.driftChargePhase = 0;
        this.lastDriftSteerInput = 0;
        
        // ドリフトグロー解除（元の色に戻す）
        if (this.mesh) {
            this.mesh.traverse(child => {
                if (child.isMesh && child.material && child.material._originalColor) {
                    child.material.color.copy(child.material._originalColor);
                }
            });
        }
    }
    
    applyBoost(duration, multiplier) {
        // ブースト倍率の上限を設定（制御不能防止）
        const cappedMultiplier = Math.min(multiplier, 1.35);
        // ブースト期間は重ならない（最大値を取る）
        this.boostTime = Math.max(this.boostTime, Math.min(duration, 3.0));
        this.boostMultiplier = Math.max(this.boostMultiplier, cappedMultiplier);
        // 速度が既にブースト上限に近い場合は追加加速を抑制
        const boostedMax = this.maxSpeed * cappedMultiplier;
        if (this.speed > boostedMax) {
            this.speed = boostedMax;
        }
    }

    applyStartBoost(duration, multiplier, launchSpeed = 18) {
        this.applyBoost(duration, multiplier);
        this.speed = Math.max(this.speed, launchSpeed);
    }

    triggerBurnout(duration = 0.8) {
        this.burnoutTimer = Math.max(this.burnoutTimer, duration);
        this.speed = 0;
        this.enginePower = 0;
        this.isDrifting = false;
        this.driftLevel = 0;
        this.driftCharge = 0;
        this.driftDirection = 0;
    }
    
    updateBoost(deltaTime) {
        if (this.boostTime > 0) {
            this.boostTime -= deltaTime;
            
            // Apply boost to speed - 制御可能な範囲に制限
            const maxBoostedSpeed = this.maxSpeed * this.boostMultiplier;
            const speedCap = this.maxSpeed * 1.3;  // 最大で1.3倍まで
            const effectiveMax = Math.min(maxBoostedSpeed, speedCap);
            
            if (this.speed < effectiveMax && this.input.forward) {
                // 緩やかな加速（急加速を完全防止）
                const accelRate = this.acceleration * 1.2 * deltaTime;
                this.speed = Math.min(this.speed + accelRate, effectiveMax);
            }
            
            // 速度のサニティチェック
            if (isNaN(this.speed) || !isFinite(this.speed) || this.speed > effectiveMax * 1.1) {
                this.speed = Math.min(this.speed || 0, effectiveMax);
            }
            
            if (this.boostTime <= 0) {
                this.boostMultiplier = 1;
                // ブースト終了時に速度を通常最大速度に緩やかに戻す
                if (this.speed > this.maxSpeed) {
                    this.speed = this.maxSpeed;
                }
            }
        }
    }
    
    getEffectiveMaxSpeed() {
        let max = this.maxSpeed;
        
        if (this.boostTime > 0) {
            max *= this.boostMultiplier;
        }
        
        if (this.isShrunken) {
            max *= 0.7;
        }
        
        // 絶対的な速度上限（制御不能防止）
        const absoluteMax = this.maxSpeed * 1.25;
        return Math.min(max, absoluteMax);
    }
    
    updateExhaustFlames(deltaTime) {
        if (!this.exhaustFlames || this.exhaustFlames.length === 0) return;
        
        const isAccelerating = this.input && this.input.forward && this.speed > 1;
        const isBoosting = this.boostTime > 0;
        const t = Date.now() * 0.01;
        
        this.exhaustFlames.forEach((ef, i) => {
            ef.group.visible = isAccelerating;
            if (!isAccelerating) return;
            
            // 揺らぎアニメーション
            const flicker = 0.7 + Math.sin(t * 3 + i * 5) * 0.15 + Math.random() * 0.15;
            const scaleY = 0.8 + (this.speed / this.maxSpeed) * 0.6 + Math.sin(t * 5 + i * 3) * 0.2;
            ef.group.scale.set(flicker, scaleY, flicker);
            
            // ブースト中は青白く
            if (isBoosting) {
                ef.innerMat.color.setHex(0xAADDFF);
                ef.outerMat.color.setHex(0x4488FF);
                ef.innerMat.opacity = 0.85;
                ef.outerMat.opacity = 0.6;
            } else {
                ef.innerMat.color.setHex(0xFFEE88);
                ef.outerMat.color.setHex(0xFF6622);
                ef.innerMat.opacity = 0.55 + Math.random() * 0.2;
                ef.outerMat.opacity = 0.3 + Math.random() * 0.15;
            }
        });
    }
    
    updateWheels(deltaTime) {
        // タイヤはrotation.z=PI/2で軸がX方向に向いている
        // 進行方向の回転はrotation.xで行う（XYZ順：Xが先に適用→Zで軸を倒す）
        const wheelRotation = this.speed * deltaTime * 0.3;
        
        this.wheels.forEach((wheelGroup, i) => {
            // タイヤ（children[0]）を進行方向に回転
            if (wheelGroup.children[0]) {
                wheelGroup.children[0].rotation.x += wheelRotation;
            }
            // リム（children[1]）も同期して回転
            if (wheelGroup.children[1]) {
                wheelGroup.children[1].rotation.x += wheelRotation;
            }
            
            // 前輪はステアリングに合わせて左右に曲がる
            if (i < 2) {
                wheelGroup.rotation.y = Utils.lerp(
                    wheelGroup.rotation.y,
                    this.currentTurnAmount * 0.4,
                    0.15
                );
            }
        });
    }
    
    updateCollisionBox() {
        const halfSize = this.bodyBounds ? this.bodyBounds.clone() : new THREE.Vector3(1.5, 1, 2.5);
        this.collisionBox.setFromCenterAndSize(this.position, halfSize.multiplyScalar(2));
    }

    addOutline(object, scale = 1.05, color = 0x000000) {
        // 先にすべてのメッシュを収集（traverse中に追加すると無限ループになるため）
        const meshes = [];
        object.traverse((child) => {
            if (child.isMesh && child.geometry && !child.userData.isOutline) {
                // 半透明オブジェクトやパーティクルには適用しない
                if (child.material && (child.material.transparent || child.material.opacity < 1)) return;
                meshes.push(child);
            }
        });
        
        // 収集したメッシュにアウトラインを追加
        meshes.forEach(child => {
            // アウトライン用マテリアル（裏面描画）
            const outlineMaterial = new THREE.MeshBasicMaterial({ 
                color: color, 
                side: THREE.BackSide 
            });
            
            // 元のジオメトリを複製して少し大きくする
            const outlineMesh = new THREE.Mesh(child.geometry.clone(), outlineMaterial);
            outlineMesh.scale.multiplyScalar(scale);
            outlineMesh.userData.isOutline = true; // マーカーを付ける
            
            child.add(outlineMesh);
        });
    }

    checkTrackFeatures(track) {
        // ブーストパッドは無効化済み
        
        // Check item boxes
        track.itemBoxes.forEach(itemBox => {
            if (!itemBox.active) return;
            
            const dist = Utils.distance2D(
                this.position.x, this.position.z,
                itemBox.position.x, itemBox.position.z
            );
            
            if (dist < itemBox.radius && !this.currentItem) {
                this.collectItem(itemBox);
            }
        });
        
        // Check barriers collision
        this.checkBarrierCollision(track);
        
        // Check collidable objects (walls, rocks, etc.)
        this.checkCollidableObjects(track);
    }
    
    // コース上の衝突オブジェクト（壁、岩など）との衝突判定
    checkCollidableObjects(track) {
        if (!track.collidableObjects || track.collidableObjects.length === 0) return;
        
        const kartBox = this.collisionBox;
        const kartRadius = 3;
        
        for (const obj of track.collidableObjects) {
            if (!obj.userData || !obj.userData.isCollidable) continue;

            // フェンス衝突ボックスはカートには影響しない（甲羅反射専用）
            if (obj.userData.isFence) continue;
            
            // プレイヤー専用の衝突オブジェクト（AIはすり抜ける）
            if (obj.userData.playerOnly && !this.isPlayer) continue;
            
            // AIカートは壁以外の障害物（岩、装飾物など）をすり抜ける
            // また城コースの壁もAIはすり抜ける（スタック防止）
            if (!this.isPlayer) {
                const wt = obj.userData.wallType;
                const isWall = wt === 'snow_inner' || wt === 'snow_outer';
                if (!isWall) continue;
            }

            // 完全に不可視な当たり判定は無視（必要な場合は forceCollide を付与）
            const material = obj.material;
            const isFullyTransparent = material
                ? (Array.isArray(material)
                    ? material.every(m => m && m.transparent && m.opacity === 0)
                    : material.transparent && material.opacity === 0)
                : false;
            if ((!obj.visible || isFullyTransparent) && !obj.userData.forceCollide) {
                continue;
            }
            
            // オブジェクトのバウンディングボックスを計算
            const objBox = new THREE.Box3().setFromObject(obj);
            
            // 衝突判定
            if (kartBox.intersectsBox(objBox)) {
                // 衝突した！
                const objCenter = new THREE.Vector3();
                objBox.getCenter(objCenter);
                
                // 押し戻し方向を計算
                const pushDirection = {
                    x: this.position.x - objCenter.x,
                    z: this.position.z - objCenter.z
                };
                
                const len = Math.sqrt(pushDirection.x * pushDirection.x + pushDirection.z * pushDirection.z);
                if (len > 0.01) {
                    pushDirection.x /= len;
                    pushDirection.z /= len;
                    
                    if (this.isPlayer) {
                        // プレイヤー: 壁衝突処理（軽い減速）
                        this.position.x += pushDirection.x * 2;
                        this.position.z += pushDirection.z * 2;
                        this.speed *= 0.75;
                        if (this.velocity) {
                            this.velocity.x = pushDirection.x * Math.abs(this.speed) * 0.2;
                            this.velocity.z = pushDirection.z * Math.abs(this.speed) * 0.2;
                        }
                    } else {
                        // AI: 壁からの押し戻しは弱くし、速度を減速（0.8倍、すり抜け可能）
                        this.position.x += pushDirection.x * 0.5;
                        this.position.z += pushDirection.z * 0.5;
                        this.speed *= 0.8;
                        if (this.velocity) {
                            this.velocity.x = pushDirection.x * Math.abs(this.speed) * 0.1;
                            this.velocity.z = pushDirection.z * Math.abs(this.speed) * 0.1;
                        }
                    }
                    
                    // 衝突音（あれば）
                    if (window.audioManager) {
                        window.audioManager.playSound('collision');
                    }
                }
            }
        }
    }
    
    checkBarrierCollision(track) {
        if (!track.barriers || track.barriers.length === 0) return;
        
        // AIカートはタイヤバリアをすり抜ける
        if (!this.isPlayer) return;
        
        const kartRadius = 3;
        
        for (const barrier of track.barriers) {
            const dist = Utils.distance2D(
                this.position.x, this.position.z,
                barrier.x, barrier.z
            );
            
            const collisionDist = kartRadius + barrier.radius;
            
            if (dist < collisionDist) {
                // 衝突！押し戻す
                const pushDirection = {
                    x: this.position.x - barrier.x,
                    z: this.position.z - barrier.z
                };
                
                const len = Math.sqrt(pushDirection.x * pushDirection.x + pushDirection.z * pushDirection.z);
                if (len > 0.01) {
                    pushDirection.x /= len;
                    pushDirection.z /= len;
                    
                    // カートを押し戻す
                    const pushDist = collisionDist - dist + 0.5;
                    this.position.x += pushDirection.x * pushDist;
                    this.position.z += pushDirection.z * pushDist;
                    
                    // 速度を減速（軽め）
                    this.speed *= 0.65;
                    
                    // バウンス効果
                    if (this.velocity) {
                        this.velocity.x = pushDirection.x * Math.abs(this.speed) * 0.3;
                        this.velocity.z = pushDirection.z * Math.abs(this.speed) * 0.3;
                    }
                }
            }
        }
        
        // === 草原コースのフェンス衝突判定 ===
        if (track.fenceSegments && track.fenceSegments.length > 0) {
            const fenceRadius = 3.5;
            const breakThroughSpeed = 70;
            
            for (const segment of track.fenceSegments) {
                const dist = this.pointToLineDistance(
                    this.position.x, this.position.z,
                    segment.x1, segment.z1, segment.x2, segment.z2
                );
                
                if (dist < fenceRadius) {
                    // 高速なら突破可能
                    if (Math.abs(this.speed) >= breakThroughSpeed) {
                        this.speed *= 0.7;
                        if (window.audioManager) {
                            window.audioManager.playSound('collision');
                        }
                    } else {
                        // フェンスに衝突 - 押し戻す
                        const midX = (segment.x1 + segment.x2) / 2;
                        const midZ = (segment.z1 + segment.z2) / 2;
                        
                        // 線分に垂直な方向を計算
                        const dx = segment.x2 - segment.x1;
                        const dz = segment.z2 - segment.z1;
                        const len = Math.sqrt(dx * dx + dz * dz);
                        
                        // 法線ベクトル（線分に垂直）
                        let normalX = -dz / len;
                        let normalZ = dx / len;
                        
                        // カートがどちら側にいるかで法線の向きを決定
                        const toKartX = this.position.x - midX;
                        const toKartZ = this.position.z - midZ;
                        const dot = toKartX * normalX + toKartZ * normalZ;
                        if (dot < 0) {
                            normalX = -normalX;
                            normalZ = -normalZ;
                        }
                        
                        // 押し戻し
                        const pushDist = fenceRadius - dist + 1;
                        this.position.x += normalX * pushDist;
                        this.position.z += normalZ * pushDist;
                        
                        this.speed *= 0.75;
                        
                        if (window.audioManager) {
                            window.audioManager.playSound('collision');
                        }
                    }
                }
            }
        }
        
        // 見えないバリア（ショートカット防止）は削除 - fenceSegmentsで代用
    }
    
    // 点と線分の距離を計算
    pointToLineDistance(px, pz, x1, z1, x2, z2) {
        const A = px - x1;
        const B = pz - z1;
        const C = x2 - x1;
        const D = z2 - z1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) param = dot / lenSq;
        
        let xx, zz;
        if (param < 0) {
            xx = x1;
            zz = z1;
        } else if (param > 1) {
            xx = x2;
            zz = z2;
        } else {
            xx = x1 + param * C;
            zz = z1 + param * D;
        }
        
        const dx = px - xx;
        const dz = pz - zz;
        return Math.sqrt(dx * dx + dz * dz);
    }
    
    collectItem(itemBox) {
        try {
            itemBox.active = false;
            itemBox.mesh.visible = false;
            itemBox.respawnTime = 5; // Respawn after 5 seconds
            
            // Get random item based on position
            if (typeof getRandomItem === 'function') {
                this.currentItem = getRandomItem(this.racePosition);
            } else if (typeof window.getRandomItem === 'function') {
                this.currentItem = window.getRandomItem(this.racePosition);
            } else {
                console.error('getRandomItem function not found');
                return;
            }
            
            if (window.audioManager) {
                window.audioManager.playSound('item_get');
            }
        } catch (e) {
            console.error('Error in collectItem:', e);
        }
    }
    
    useItem(game) {
        if (!this.currentItem) return;

        const item = this.currentItem;
        this.currentItem = null;
        if (window.audioManager) {
            window.audioManager.playSound('item_use');
        }
        // Item effects handled by game's item manager
        if (game && game.itemManager) {
            game.itemManager.useItem(this, item);
        }
    }
    
    updateRaceProgress(track) {
        // Calculate total progress (lap + checkpoint progress)
        const trackProgress = track.getTrackProgress(this.position.x, this.position.z);
        
        // Check for wrong way
        const trackDirection = track.getTrackDirection(this.position.x, this.position.z);
        const angleDiff = Utils.normalizeAngle(this.rotation - trackDirection);
        this.wrongWay = Math.abs(angleDiff) > Math.PI / 2 && this.speed > 10;
        
        // Update checkpoint
        const numCheckpoints = track.checkpoints.length;
        const newCheckpoint = Math.floor(trackProgress * numCheckpoints);
        
        // Lap detection - フィニッシュラインを東向きに通過
        const finishX = track.finishLine?.position?.x ?? 0;
        const finishZ = track.finishLine?.position?.z ?? -200;
        const nearFinishLine = Math.abs(this.position.z - finishZ) < 25;
        
        // Initialize lastX on first update to prevent false lap count at start
        if (this.lastX === undefined) {
            this.lastX = this.position.x;
        } else {
            // 前回位置と現在位置でフィニッシュラインを通過したか（X軸方向）
            // スタート直後の5秒間はラップを誤検出しない
            const timeSinceRaceStart = (performance.now() - this.raceStartTime) / 1000;
            const canCountLap = timeSinceRaceStart > 5;  // 5秒経過後からラップを計数
            
            if (nearFinishLine && !this.wrongWay && canCountLap) {
                // X座標が負から正に変わった = 東向きに通過
                if (this.lastX < finishX && this.position.x >= finishX) {
                    // チェックポイントを十分通過しているか確認（ショートカット防止）
                    if (this.lastCheckpoint >= numCheckpoints - 3 || this.lastCheckpoint <= 1) {
                        this.lap++;
                        this.lastCheckpoint = 0;
                        
                        if (window.audioManager) {
                            window.audioManager.playSound('lap_complete');
                        }
                    }
                }
            }
            
            this.lastX = this.position.x;
        }
        
        // Update last checkpoint (prevent going backwards)
        if (newCheckpoint > this.lastCheckpoint || 
            (this.lastCheckpoint > numCheckpoints - 2 && newCheckpoint <= 1)) {
            this.lastCheckpoint = newCheckpoint;
        }
        
        this.checkpoint = newCheckpoint;
        this.totalProgress = this.lap + trackProgress;
    }
    
    handleSpinOut(deltaTime) {
        // Spin the kart
        this.rotation += 15 * deltaTime;
        this.speed *= 0.95;
        
        this.updateMeshPosition();
        this.mesh.rotation.z = Math.sin(this.spinOutTimer * 10) * 0.3;
        
        // スピンアウト終了時に元の向きに戻す
        if (this.spinOutTimer <= 0.1) {
            this.rotation = this.preSpinRotation;
            this.mesh.rotation.z = 0;
            this.updateMeshPosition();
        }
    }
    
    spinOut() {
        // invincibilityTimerが負の値の場合は0にリセット
        if (this.invincibilityTimer < 0) {
            this.invincibilityTimer = 0;
        }
        
        if (this.invincibilityTimer > 0 || this.hasShield) {
            if (this.hasShield) {
                this.hasShield = false;
                this.shieldMesh.material.opacity = 0;
                if (window.audioManager) {
                    window.audioManager.playSound('shield_hit');
                }
            }
            return;
        }
        this.isSpunOut = true;
        this.spinOutTimer = 1.5;
        // スピンアウト開始時の向きを保存
        this.preSpinRotation = this.rotation;
        this.speed *= 0.3;
        this.invincibilityTimer = 2;
        
        if (window.audioManager) {
            window.audioManager.playSound('crash');
        }
    }
    
    activateShield() {
        this.hasShield = true;
        this.shieldTimer = 8;  // スターと同じ8秒間
        this.shieldMesh.material.opacity = 0.4;
        
        if (window.audioManager) {
            window.audioManager.playSound('shield_up');
        }
    }
    
    shrink(duration = 5) {
        if (this.invincibilityTimer > 0) return;
        
        this.isShrunken = true;
        this.shrinkTimer = duration;
        this.maxSpeed *= 0.7;
    }
    
    freeze(duration = 3) {
        if (this.invincibilityTimer > 0 || this.hasShield) return;
        
        this.isFrozen = true;
        this.freezeTimer = duration;
    }
    
    // Check collision with another kart
    checkCollision(otherKart) {
        const dist = this.position.distanceTo(otherKart.position);
        const minDist = this.collisionRadius + otherKart.collisionRadius;
        
        return dist < minDist;
    }
    
    // Handle collision response
    handleCollision(otherKart) {
        const pushDirection = new THREE.Vector3()
            .subVectors(this.position, otherKart.position)
            .normalize();

        const totalMass = (this.collisionMass || 1) + (otherKart.collisionMass || 1);
        const thisMassShare = (otherKart.collisionMass || 1) / totalMass;
        const otherMassShare = (this.collisionMass || 1) / totalMass;
        
        // Push both karts apart - heavier karts move less
        const pushStrength = 0.65;
        this.position.add(pushDirection.clone().multiplyScalar(pushStrength * thisMassShare));
        otherKart.position.add(pushDirection.clone().multiplyScalar(-pushStrength * otherMassShare));
        
        // Reduce speeds with weight bias
        this.speed *= 1 - 0.14 * thisMassShare;
        otherKart.speed *= 1 - 0.14 * otherMassShare;
        
        if (window.audioManager && Math.random() < 0.3) {
            window.audioManager.playSound('collision');
        }
    }
    
    // 溶岩落下時のスタート地点へのリスポーン（レガシー用）
    respawnToStart(track) {
        this.lakituRescue(track);
    }
    
    // ジュゲム救出（溶岩・崖落下時に最寄りのコース上に復帰）
    lakituRescue(track) {
        // 効果音
        if (window.audioManager) {
            window.audioManager.playSound('fall');
        }
        
        // 最も近いトラックポイントを見つける
        let nearestPoint = null;
        let nearestDist = Infinity;
        let nearestIndex = 0;
        
        for (let i = 0; i < track.trackPoints.length; i++) {
            const tp = track.trackPoints[i];
            const dx = this.position.x - tp.x;
            const dz = this.position.z - tp.z;
            const dist = dx * dx + dz * dz;
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestPoint = tp;
                nearestIndex = i;
            }
        }
        
        if (!nearestPoint) {
            // フォールバック: スタート地点
            const startPoint = track.waypoints[0];
            this.position.set(startPoint.x, 1, startPoint.z);
            this.rotation = Math.PI / 2;
        } else {
            // 最寄りのトラックポイントに配置
            this.position.set(nearestPoint.x, (nearestPoint.y || 0) + 1.0, nearestPoint.z);
            
            // 次のトラックポイントの方向を向く
            const nextIndex = (nearestIndex + 3) % track.trackPoints.length;
            const nextPoint = track.trackPoints[nextIndex];
            if (nextPoint) {
                this.rotation = Math.atan2(
                    nextPoint.x - nearestPoint.x,
                    nextPoint.z - nearestPoint.z
                );
            }
        }
        
        // 速度リセット
        this.speed = 0;
        this.velocity.set(0, 0, 0);
        this.boostTime = 0;
        this.boostMultiplier = 1;
        
        // ジュゲム救出アニメーション（一時的に上空から降下）
        this.isBeingRescued = true;
        this.rescueTimer = 1.8;  // 1.8秒間の救出演出
        this.rescueStartY = this.position.y + 25;  // 上空から
        this.rescueTargetY = this.position.y;
        this.position.y = this.rescueStartY;
        
        // 一時的に無敵状態
        this.invincibilityTimer = 2.5;
        
        // メッシュ位置を更新
        this.updateMeshPosition();
        this.lastValidPosition.copy(this.position);
        this.lastValidPosition.y = this.rescueTargetY;
    }
    
    // Get data for minimap
    getMinimapData() {
        return {
            x: this.position.x,
            z: this.position.z,
            rotation: this.rotation,
            color: this.colorData.primary,
            isPlayer: this.isPlayer
        };
    }
}

window.Kart = Kart;
