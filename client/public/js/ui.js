// UI Manager - handles all HUD elements and screens

class UIManager {
    constructor() {
        // Get UI elements
        this.loadingScreen = document.getElementById('loading-screen');
        this.loadingBar = document.getElementById('loading-bar');
        this.loadingText = document.getElementById('loading-text');
        
        this.mainMenu = document.getElementById('main-menu');
        this.hud = document.getElementById('hud');
        this.countdown = document.getElementById('countdown');
        this.wrongWay = document.getElementById('wrong-way');
        this.resultsScreen = document.getElementById('results-screen');
        this.pauseMenu = document.getElementById('pause-menu');
        
        // HUD elements
        this.positionDisplay = document.getElementById('position-display');
        this.lapDisplay = document.getElementById('lap-display');
        this.timerDisplay = document.getElementById('timer-display');
        this.itemDisplay = document.getElementById('item-display');
        this.speedDisplay = document.getElementById('speed-display');
        this.boostFill = document.getElementById('boost-fill');
        
        // Minimap
        this.minimapCanvas = document.getElementById('minimap-canvas');
        this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;
        
        // Setup minimap canvas
        if (this.minimapCanvas) {
            this.minimapCanvas.width = 180;
            this.minimapCanvas.height = 180;
        }
        
        // Difficulty selection
        this.selectedDifficulty = 'normal';
        this.setupDifficultyButtons();
        
        // Course type selection
        this.selectedCourseType = 'grassland';
        this.setupCourseButtons();
        
        // Button handlers
        this.setupButtons();
    }
    
    setupDifficultyButtons() {
        const diffButtons = document.querySelectorAll('.diff-btn');
        diffButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                diffButtons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.selectedDifficulty = btn.dataset.difficulty;
            });
        });
    }
    
    setupCourseButtons() {
        const courseButtons = document.querySelectorAll('.course-btn');
        courseButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                courseButtons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.selectedCourseType = btn.dataset.course;
                // グローバル設定に保存
                window.gameSettings = window.gameSettings || {};
                window.gameSettings.courseType = this.selectedCourseType;
            });
        });
        
        // 初期値を設定
        window.gameSettings = window.gameSettings || {};
        window.gameSettings.courseType = this.selectedCourseType;
    }
    
    setupButtons() {
        // Start button
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                if (window.game) {
                    window.game.startRace(this.selectedDifficulty);
                }
            });
        }
        
        // Restart button
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                if (window.game) {
                    window.game.restartRace();
                }
            });
        }
        
        // Menu button
        const menuBtn = document.getElementById('menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                if (window.game) {
                    window.game.returnToMenu();
                }
            });
        }
        
        // Resume button
        const resumeBtn = document.getElementById('resume-btn');
        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => {
                if (window.game) {
                    window.game.resumeRace();
                }
            });
        }
        
        // Quit button
        const quitBtn = document.getElementById('quit-btn');
        if (quitBtn) {
            quitBtn.addEventListener('click', () => {
                if (window.game) {
                    window.game.returnToMenu();
                }
            });
        }
        
        // Pause button (in HUD)
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                if (window.game && window.game.gameState === 'racing') {
                    window.game.pauseRace();
                }
            });
        }
        
        // Keyboard shortcuts for pause
        document.addEventListener('keydown', (e) => {
            if ((e.key === 'p' || e.key === 'P' || e.key === 'Escape') && 
                window.game && 
                (window.game.gameState === 'racing' || window.game.gameState === 'paused')) {
                if (window.game.gameState === 'racing') {
                    window.game.pauseRace();
                } else if (window.game.gameState === 'paused') {
                    window.game.resumeRace();
                }
            }
        });
    }
    
    // Loading screen
    updateLoading(progress, text) {
        if (this.loadingBar) {
            this.loadingBar.style.width = `${progress}%`;
        }
        if (this.loadingText) {
            this.loadingText.textContent = text;
        }
    }
    
    hideLoading() {
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'none';
        }
    }
    
    // Screen transitions
    showMainMenu() {
        this.hideAllScreens();
        if (this.mainMenu) {
            this.mainMenu.style.display = 'flex';
        }
    }
    
    showHUD() {
        this.hideAllScreens();
        if (this.hud) {
            this.hud.style.display = 'block';
        }
        // ポーズボタンを表示
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.style.display = 'flex';
        }
    }
    
    showResults(results) {
        if (this.hud) {
            this.hud.style.display = 'none';
        }
        if (this.resultsScreen) {
            this.resultsScreen.style.display = 'flex';
            this.buildResultsTable(results);
        }
    }
    
    showPauseMenu() {
        if (this.pauseMenu) {
            this.pauseMenu.style.display = 'flex';
        }
    }
    
    hidePauseMenu() {
        if (this.pauseMenu) {
            this.pauseMenu.style.display = 'none';
        }
    }
    
    hideAllScreens() {
        if (this.mainMenu) this.mainMenu.style.display = 'none';
        if (this.hud) this.hud.style.display = 'none';
        if (this.resultsScreen) this.resultsScreen.style.display = 'none';
        if (this.pauseMenu) this.pauseMenu.style.display = 'none';
        if (this.countdown) this.countdown.style.display = 'none';
        if (this.wrongWay) this.wrongWay.style.display = 'none';
        // ポーズボタンも非表示
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) pauseBtn.style.display = 'none';
        // リーダーボードも非表示
        const lbScreen = document.getElementById('leaderboard-screen');
        if (lbScreen) lbScreen.style.display = 'none';
    }
    
    // Countdown
    async showCountdown() {
        return new Promise(resolve => {
            if (!this.countdown) {
                resolve();
                return;
            }
            
            const sequence = ['3', '2', '1', 'GO!'];
            let index = 0;
            
            const showNext = () => {
                if (index >= sequence.length) {
                    this.countdown.style.display = 'none';
                    resolve();
                    return;
                }
                
                this.countdown.textContent = sequence[index];
                this.countdown.style.display = 'block';
                this.countdown.style.animation = 'none';
                void this.countdown.offsetWidth; // Trigger reflow
                this.countdown.style.animation = 'countPulse 0.5s ease-out';
                
                // Play sound
                if (window.audioManager) {
                    window.audioManager.playSound(index < 3 ? 'countdown' : 'countdown_go');
                }
                
                index++;
                setTimeout(showNext, 1000);
            };
            
            showNext();
        });
    }
    
    // HUD updates
    updatePosition(position) {
        if (!this.positionDisplay) return;
        
        const suffix = Utils.getOrdinalSuffix(position);
        this.positionDisplay.innerHTML = `${position}<span>${suffix}</span>`;
        
        // Color based on position
        const colors = ['#ffd700', '#c0c0c0', '#cd7f32', '#ffffff'];
        this.positionDisplay.style.color = colors[Math.min(position - 1, 3)];
    }
    
    updateLap(current, total) {
        if (!this.lapDisplay) return;
        this.lapDisplay.textContent = `Lap ${current}/${total}`;
        
        // Flash on new lap
        if (current > 1) {
            this.lapDisplay.style.transform = 'scale(1.3)';
            this.lapDisplay.style.color = '#00ff00';
            setTimeout(() => {
                this.lapDisplay.style.transform = 'scale(1)';
                this.lapDisplay.style.color = '#ffd93d';
            }, 500);
        }
    }
    
    updateTimer(timeMs) {
        if (!this.timerDisplay) return;
        this.timerDisplay.textContent = Utils.formatTime(timeMs);
    }
    
    // マリオカート風SVGアイテムアイコン
    static ITEM_IDS = ['mushroom', 'banana', 'green_shell', 'red_shell', 'star', 'lightning', 'bob_omb', 'blooper', 'bullet_bill', 'spiny_shell'];
    
    static getItemIcon(itemId) {
        const s = 50; // SVG size
        const svgStart = `<svg viewBox="0 0 ${s} ${s}" width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(1px 2px 1px rgba(0,0,0,0.4))">`;
        const svgEnd = '</svg>';
        switch (itemId) {
            case 'mushroom':
                return svgStart +
                    '<ellipse cx="25" cy="38" rx="10" ry="12" fill="#F5E6CA" stroke="#222" stroke-width="1.5"/>' +
                    '<ellipse cx="25" cy="22" rx="18" ry="16" fill="#E82020" stroke="#222" stroke-width="1.5"/>' +
                    '<ellipse cx="17" cy="18" rx="5" ry="6" fill="#FFF" stroke="none"/>' +
                    '<ellipse cx="33" cy="20" rx="4" ry="5" fill="#FFF" stroke="none"/>' +
                    '<ellipse cx="25" cy="12" rx="3" ry="3.5" fill="#FFF" stroke="none"/>' +
                    '<ellipse cx="20" cy="34" rx="2.5" ry="2" fill="#333"/>' +
                    '<ellipse cx="30" cy="34" rx="2.5" ry="2" fill="#333"/>' +
                    svgEnd;
            case 'triple_mushroom':
                return svgStart +
                    '<g transform="translate(-8,8) scale(0.55)"><ellipse cx="25" cy="38" rx="10" ry="12" fill="#F5E6CA" stroke="#222" stroke-width="2"/><ellipse cx="25" cy="22" rx="18" ry="16" fill="#E82020" stroke="#222" stroke-width="2"/><ellipse cx="17" cy="18" rx="5" ry="6" fill="#FFF"/><ellipse cx="33" cy="20" rx="4" ry="5" fill="#FFF"/></g>' +
                    '<g transform="translate(18,8) scale(0.55)"><ellipse cx="25" cy="38" rx="10" ry="12" fill="#F5E6CA" stroke="#222" stroke-width="2"/><ellipse cx="25" cy="22" rx="18" ry="16" fill="#E82020" stroke="#222" stroke-width="2"/><ellipse cx="17" cy="18" rx="5" ry="6" fill="#FFF"/><ellipse cx="33" cy="20" rx="4" ry="5" fill="#FFF"/></g>' +
                    '<g transform="translate(5,-5) scale(0.55)"><ellipse cx="25" cy="38" rx="10" ry="12" fill="#F5E6CA" stroke="#222" stroke-width="2"/><ellipse cx="25" cy="22" rx="18" ry="16" fill="#E82020" stroke="#222" stroke-width="2"/><ellipse cx="17" cy="18" rx="5" ry="6" fill="#FFF"/><ellipse cx="33" cy="20" rx="4" ry="5" fill="#FFF"/></g>' +
                    svgEnd;
            case 'golden_mushroom':
                return svgStart +
                    '<defs><linearGradient id="gm" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FFE44D"/><stop offset="50%" stop-color="#FFD700"/><stop offset="100%" stop-color="#DAA520"/></linearGradient></defs>' +
                    '<ellipse cx="25" cy="38" rx="10" ry="12" fill="#F5E6CA" stroke="#222" stroke-width="1.5"/>' +
                    '<ellipse cx="25" cy="22" rx="18" ry="16" fill="url(#gm)" stroke="#B8860B" stroke-width="1.5"/>' +
                    '<ellipse cx="17" cy="18" rx="5" ry="6" fill="#FFFDE0" stroke="none"/>' +
                    '<ellipse cx="33" cy="20" rx="4" ry="5" fill="#FFFDE0" stroke="none"/>' +
                    '<ellipse cx="25" cy="12" rx="3" ry="3.5" fill="#FFFDE0" stroke="none"/>' +
                    '<polygon points="25,2 27,8 25,6 23,8" fill="#FFFDE0" opacity="0.7"/>' +
                    svgEnd;
            case 'banana':
                return svgStart +
                    '<path d="M15,38 Q10,20 20,10 Q25,6 28,10 Q22,22 22,38 Z" fill="#FFE135" stroke="#222" stroke-width="1.5"/>' +
                    '<path d="M22,38 Q22,22 28,10 Q32,6 35,10 Q30,20 28,38 Z" fill="#FFDA00" stroke="#222" stroke-width="1.5"/>' +
                    '<path d="M20,10 Q25,6 28,10" fill="none" stroke="#8B6914" stroke-width="2"/>' +
                    '<ellipse cx="24" cy="8" rx="2" ry="2" fill="#5a3e00"/>' +
                    svgEnd;
            case 'green_shell':
                return svgStart +
                    '<ellipse cx="25" cy="28" rx="18" ry="14" fill="#22AA22" stroke="#222" stroke-width="1.5"/>' +
                    '<ellipse cx="25" cy="32" rx="15" ry="8" fill="#F5E6CA" stroke="#222" stroke-width="1"/>' +
                    '<path d="M12,22 L25,16 L38,22" fill="none" stroke="#116611" stroke-width="2.5"/>' +
                    '<path d="M10,28 L25,20 L40,28" fill="none" stroke="#116611" stroke-width="2"/>' +
                    '<ellipse cx="25" cy="14" rx="3" ry="2" fill="#33CC33"/>' +
                    '<circle cx="18" cy="24" r="2" fill="#33CC33" opacity="0.6"/>' +
                    '<circle cx="32" cy="24" r="2" fill="#33CC33" opacity="0.6"/>' +
                    svgEnd;
            case 'red_shell':
                return svgStart +
                    '<ellipse cx="25" cy="28" rx="18" ry="14" fill="#DD2222" stroke="#222" stroke-width="1.5"/>' +
                    '<ellipse cx="25" cy="32" rx="15" ry="8" fill="#F5E6CA" stroke="#222" stroke-width="1"/>' +
                    '<path d="M12,22 L25,16 L38,22" fill="none" stroke="#991111" stroke-width="2.5"/>' +
                    '<path d="M10,28 L25,20 L40,28" fill="none" stroke="#991111" stroke-width="2"/>' +
                    '<ellipse cx="25" cy="14" rx="3" ry="2" fill="#FF4444"/>' +
                    '<circle cx="18" cy="24" r="2" fill="#FF4444" opacity="0.6"/>' +
                    '<circle cx="32" cy="24" r="2" fill="#FF4444" opacity="0.6"/>' +
                    svgEnd;
            case 'star':
                return svgStart +
                    '<defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FFF700"/><stop offset="100%" stop-color="#FFAA00"/></linearGradient></defs>' +
                    '<polygon points="25,3 30,18 46,18 33,28 38,43 25,34 12,43 17,28 4,18 20,18" fill="url(#sg)" stroke="#C88400" stroke-width="1.5"/>' +
                    '<polygon points="25,8 28,18 38,18 30,24 33,36 25,29 17,36 20,24 12,18 22,18" fill="#FFFDE0" opacity="0.5"/>' +
                    '<circle cx="21" cy="21" r="2" fill="#222"/>' +
                    '<circle cx="29" cy="21" r="2" fill="#222"/>' +
                    svgEnd;
            case 'lightning':
                return svgStart +
                    '<polygon points="28,2 18,22 25,22 15,48 38,20 29,20 36,2" fill="#FFD700" stroke="#B8860B" stroke-width="1.5" stroke-linejoin="round"/>' +
                    '<polygon points="28,6 21,20 26,20 19,42 34,22 28,22 33,6" fill="#FFF700" opacity="0.7"/>' +
                    svgEnd;
            case 'bob_omb':
                return svgStart +
                    '<circle cx="25" cy="30" r="14" fill="#222" stroke="#111" stroke-width="1.5"/>' +
                    '<circle cx="25" cy="30" r="12" fill="#333"/>' +
                    '<ellipse cx="20" cy="27" rx="4" ry="5" fill="#FFF" stroke="#222" stroke-width="1"/>' +
                    '<ellipse cx="30" cy="27" rx="4" ry="5" fill="#FFF" stroke="#222" stroke-width="1"/>' +
                    '<circle cx="20" cy="27" r="2.5" fill="#222"/>' +
                    '<circle cx="30" cy="27" r="2.5" fill="#222"/>' +
                    '<rect x="23" y="12" width="4" height="6" rx="1" fill="#888" stroke="#222" stroke-width="1"/>' +
                    '<line x1="25" y1="12" x2="28" y2="5" stroke="#C88400" stroke-width="2"/>' +
                    '<circle cx="29" cy="4" r="3" fill="#FF4500" opacity="0.9"/>' +
                    '<circle cx="29" cy="4" r="1.5" fill="#FFD700"/>' +
                    '<ellipse cx="25" cy="38" rx="8" ry="3" fill="#DAA520" stroke="#222" stroke-width="1"/>' +
                    svgEnd;
            case 'blooper':
                return svgStart +
                    '<path d="M15,40 Q10,42 12,35 L15,20 Q15,10 25,8 Q35,10 35,20 L38,35 Q40,42 35,40 Z" fill="#F8F8FF" stroke="#222" stroke-width="1.5"/>' +
                    '<path d="M15,40 Q17,45 20,40" fill="#F0F0FF" stroke="#222" stroke-width="1"/>' +
                    '<path d="M20,40 Q22,46 25,40" fill="#F0F0FF" stroke="#222" stroke-width="1"/>' +
                    '<path d="M25,40 Q27,46 30,40" fill="#F0F0FF" stroke="#222" stroke-width="1"/>' +
                    '<path d="M30,40 Q32,45 35,40" fill="#F0F0FF" stroke="#222" stroke-width="1"/>' +
                    '<circle cx="20" cy="20" r="4" fill="#222"/>' +
                    '<circle cx="30" cy="20" r="4" fill="#222"/>' +
                    '<circle cx="21" cy="19" r="1.5" fill="#FFF"/>' +
                    '<circle cx="31" cy="19" r="1.5" fill="#FFF"/>' +
                    svgEnd;
            case 'bullet_bill':
                return svgStart +
                    '<ellipse cx="25" cy="28" rx="18" ry="12" fill="#222" stroke="#111" stroke-width="1.5"/>' +
                    '<ellipse cx="10" cy="28" rx="6" ry="12" fill="#333" stroke="#111" stroke-width="1"/>' +
                    '<ellipse cx="38" cy="28" rx="8" ry="10" fill="#222"/>' +
                    '<circle cx="36" cy="25" r="4" fill="#FFF" stroke="#222" stroke-width="1"/>' +
                    '<circle cx="36" cy="25" r="2" fill="#222"/>' +
                    '<rect x="6" y="22" width="8" height="3" fill="#FFF" opacity="0.2" rx="1"/>' +
                    '<ellipse cx="12" cy="35" rx="5" ry="2" fill="#FF4500" opacity="0.5"/>' +
                    svgEnd;
            case 'spiny_shell':
                return svgStart +
                    '<defs><linearGradient id="ss" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4488FF"/><stop offset="100%" stop-color="#2255CC"/></linearGradient></defs>' +
                    '<ellipse cx="25" cy="28" rx="18" ry="14" fill="url(#ss)" stroke="#222" stroke-width="1.5"/>' +
                    '<ellipse cx="25" cy="32" rx="14" ry="7" fill="#F5E6CA" stroke="#222" stroke-width="1"/>' +
                    '<polygon points="14,18 17,12 20,18" fill="#FFF" stroke="#222" stroke-width="1"/>' +
                    '<polygon points="22,15 25,8 28,15" fill="#FFF" stroke="#222" stroke-width="1"/>' +
                    '<polygon points="30,18 33,12 36,18" fill="#FFF" stroke="#222" stroke-width="1"/>' +
                    '<polygon points="18,24 20,18 22,24" fill="#FFF" stroke="#222" stroke-width="1"/>' +
                    '<polygon points="28,24 30,18 32,24" fill="#FFF" stroke="#222" stroke-width="1"/>' +
                    svgEnd;
            default:
                return `<span style="font-size:40px">❓</span>`;
        }
    }

    updateItem(item) {
        if (!this.itemDisplay) return;
        
        if (item) {
            // アイテムを取得したら即座にルーレット演出開始
            // ルーレット実行中 or 既に完了済みなら再開始しない
            if (!this.isRouletteRunning && !this.rouletteCompleted) {
                this.startItemRoulette(item);
            }
        } else {
            // アイテムなし（使用済み）
            this.itemDisplay.innerHTML = UIManager.getItemIcon('none');
            this.itemDisplay.classList.remove('roulette');
            this.isRouletteRunning = false;
            this.rouletteCompleted = false;
        }
    }
    
    // アイテムルーレット演出（2秒で決定）
    startItemRoulette(finalItem) {
        this.isRouletteRunning = true;
        this.rouletteCompleted = false;
        this.itemDisplay.classList.add('roulette');
        
        // ルーレット設定
        const totalDuration = 2000; // 2秒
        const startTime = performance.now();
        let lastUpdateTime = 0;
        let spinCount = 0;
        
        // 効果音（開始）
        if (window.audioManager) {
            window.audioManager.playSound('item_roulette');
        }
        
        const runRoulette = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / totalDuration, 1);
            
            if (progress < 1) {
                // 徐々に遅くなる間隔
                const baseInterval = 40;
                const maxInterval = 350;
                const currentInterval = baseInterval + (maxInterval - baseInterval) * Math.pow(progress, 2.5);
                
                if (elapsed - lastUpdateTime > currentInterval) {
                    // ランダムなアイコンを表示
                    let randomId;
                    if (progress > 0.8 && Math.random() > 0.5) {
                        randomId = finalItem.id;
                    } else {
                        randomId = UIManager.ITEM_IDS[Math.floor(Math.random() * UIManager.ITEM_IDS.length)];
                    }
                    this.itemDisplay.innerHTML = UIManager.getItemIcon(randomId);
                    
                    // スケールと回転アニメーション
                    const rotateAmount = (1 - progress) * 8;
                    const scaleAmount = 1.15 + (1 - progress) * 0.15;
                    this.itemDisplay.style.transform = `translateX(-50%) scale(${scaleAmount}) rotate(${(spinCount % 2 === 0 ? rotateAmount : -rotateAmount)}deg)`;
                    
                    setTimeout(() => {
                        if (this.itemDisplay && this.isRouletteRunning) {
                            this.itemDisplay.style.transform = 'translateX(-50%) scale(1)';
                        }
                    }, currentInterval * 0.4);
                    
                    spinCount++;
                    lastUpdateTime = elapsed;
                }
                
                requestAnimationFrame(runRoulette);
            } else {
                // 最終アイテムを表示
                this.itemDisplay.innerHTML = UIManager.getItemIcon(finalItem.id);
                this.itemDisplay.classList.remove('roulette');
                this.itemDisplay.classList.add('item-ready');
                this.isRouletteRunning = false;
                this.rouletteCompleted = true;
                
                // 決定エフェクト
                this.itemDisplay.style.transform = 'translateX(-50%) scale(1.6)';
                this.itemDisplay.style.animation = 'itemReadyPulse 0.5s ease-out';
                this.itemDisplay.style.filter = 'brightness(1.5) drop-shadow(0 0 15px gold)';
                
                setTimeout(() => {
                    if (this.itemDisplay) {
                        this.itemDisplay.style.transform = 'translateX(-50%) scale(1)';
                        this.itemDisplay.style.animation = '';
                        this.itemDisplay.style.filter = '';
                        this.itemDisplay.classList.remove('item-ready');
                    }
                }, 500);
                
                if (window.audioManager) {
                    window.audioManager.playSound('item_get');
                }
            }
        };
        
        requestAnimationFrame(runRoulette);
    }
    
    updateSpeed(speed, maxSpeed) {
        if (!this.speedDisplay) return;
        const displaySpeed = Math.floor(speed * 2.5); // Convert to km/h-like display
        this.speedDisplay.textContent = `${displaySpeed} km/h`;
    }
    
    updateBoostMeter(driftLevel, driftCharge, boostTime) {
        if (!this.boostFill) return;
        
        let fillPercent = 0;
        let levelClass = '';
        
        if (boostTime > 0) {
            fillPercent = 100;
            levelClass = 'level3';
        } else if (driftCharge > 0) {
            fillPercent = Math.min(100, (driftCharge / 3) * 100);
            levelClass = driftLevel >= 3 ? 'level3' : driftLevel >= 2 ? 'level2' : driftLevel >= 1 ? 'level1' : '';
        }
        
        this.boostFill.style.width = `${fillPercent}%`;
        this.boostFill.className = levelClass;
    }
    
    showWrongWay(show) {
        if (!this.wrongWay) return;
        this.wrongWay.style.display = show ? 'block' : 'none';
    }
    
    // Minimap
    updateMinimap(karts, track) {
        if (!this.minimapCtx || !track) return;
        
        const ctx = this.minimapCtx;
        const width = this.minimapCanvas.width;
        const height = this.minimapCanvas.height;
        
        // Clear
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, width, height);
        
        // Calculate bounds
        const padding = 10;
        const scale = this.calculateMinimapScale(track, width - padding * 2, height - padding * 2);
        const offset = this.calculateMinimapOffset(track, width, height, scale);
        
        // Draw track
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        
        const points = track.trackPoints;
        for (let i = 0; i < points.length; i += 3) {
            const x = (points[i].x * scale) + offset.x;
            const y = (points[i].z * scale) + offset.y;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.stroke();
        
        // Draw finish line
        ctx.fillStyle = '#fff';
        const finishX = (0 * scale) + offset.x;
        const finishY = (0 * scale) + offset.y;
        ctx.fillRect(finishX - 2, finishY - 8, 4, 16);
        
        // Draw karts
        const now = Date.now();
        karts.forEach((kart, index) => {
            const x = (kart.position.x * scale) + offset.x;
            const y = (kart.position.z * scale) + offset.y;
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(-kart.rotation);
            
            // Kart marker
            if (kart.isPlayer) {
                // 七色に光るレインボーエフェクト
                const hue = (now * 0.2) % 360;
                const rainbowColor = `hsl(${hue}, 100%, 60%)`;
                const glowColor = `hsl(${hue}, 100%, 50%)`;
                
                // 外側のグロー（大きめ）
                ctx.shadowColor = glowColor;
                ctx.shadowBlur = 12;
                
                // 大きめの三角形マーカー
                ctx.fillStyle = rainbowColor;
                ctx.beginPath();
                ctx.moveTo(0, -10);
                ctx.lineTo(-7, 7);
                ctx.lineTo(7, 7);
                ctx.closePath();
                ctx.fill();
                
                // 白い縁取り
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // 内側のハイライト
                const innerHue = (hue + 60) % 360;
                ctx.fillStyle = `hsl(${innerHue}, 100%, 85%)`;
                ctx.beginPath();
                ctx.moveTo(0, -5);
                ctx.lineTo(-3, 3);
                ctx.lineTo(3, 3);
                ctx.closePath();
                ctx.fill();
                
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = `#${kart.colorData.primary.toString(16).padStart(6, '0')}`;
                ctx.beginPath();
                ctx.arc(0, 0, 4, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
        });
    }
    
    calculateMinimapScale(track, maxWidth, maxHeight) {
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        
        track.trackPoints.forEach(point => {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minZ = Math.min(minZ, point.z);
            maxZ = Math.max(maxZ, point.z);
        });
        
        const trackWidth = maxX - minX;
        const trackHeight = maxZ - minZ;
        
        return Math.min(maxWidth / trackWidth, maxHeight / trackHeight) * 0.85;
    }
    
    calculateMinimapOffset(track, canvasWidth, canvasHeight, scale) {
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        
        track.trackPoints.forEach(point => {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minZ = Math.min(minZ, point.z);
            maxZ = Math.max(maxZ, point.z);
        });
        
        const centerX = (minX + maxX) / 2;
        const centerZ = (minZ + maxZ) / 2;
        
        return {
            x: canvasWidth / 2 - centerX * scale,
            y: canvasHeight / 2 - centerZ * scale
        };
    }
    
    // Leaderboard screen
    showLeaderboard(data) {
        // Hide HUD and results
        if (this.hud) this.hud.style.display = 'none';
        if (this.resultsScreen) this.resultsScreen.style.display = 'none';
        
        const lbScreen = document.getElementById('leaderboard-screen');
        if (!lbScreen) return;
        
        lbScreen.style.display = 'flex';
        
        const courseNames = {
            'grassland': 'MARIO CIRCUIT',
            'snow': 'FRAPPE SNOWLAND',
            'castle': 'BOWSER CASTLE'
        };
        const diffNames = {
            'easy': '50cc',
            'normal': '100cc',
            'hard': '150cc'
        };
        
        const courseName = courseNames[data.course] || data.course;
        const diffName = diffNames[data.difficulty] || data.difficulty;
        
        // Build header
        const lbTitle = document.getElementById('lb-title');
        if (lbTitle) lbTitle.textContent = `🏆 ${courseName} - ${diffName} 🏆`;
        
        // Build player result summary
        const lbPlayerResult = document.getElementById('lb-player-result');
        if (lbPlayerResult && data.playerResult) {
            const posOrdinal = Utils.getOrdinal(data.playerResult.position);
            lbPlayerResult.innerHTML = `
                <span class="lb-your-pos">YOUR RESULT: ${data.playerResult.position}${posOrdinal} PLACE</span>
                <span class="lb-your-time">TIME: ${Utils.formatTime(data.playerTimeMs)}</span>
            `;
        }
        
        // Build leaderboard table
        const lbTable = document.getElementById('lb-table-body');
        if (lbTable) {
            lbTable.innerHTML = '';
            
            // Show top 10
            const maxEntries = 10;
            for (let i = 0; i < maxEntries; i++) {
                const row = document.createElement('div');
                row.className = 'lb-row';
                
                if (i < data.leaderboard.length) {
                    const entry = data.leaderboard[i];
                    const posIcons = ['🥇', '🥈', '🥉'];
                    const posDisplay = i < 3 ? posIcons[i] : `${i + 1}`;
                    
                    row.innerHTML = `
                        <span class="lb-rank">${posDisplay}</span>
                        <span class="lb-name">${this.escapeHtml(entry.playerName)}</span>
                        <span class="lb-time">${Utils.formatTime(entry.raceTimeMs)}</span>
                    `;
                } else {
                    row.innerHTML = `
                        <span class="lb-rank">${i + 1}</span>
                        <span class="lb-name lb-empty">---</span>
                        <span class="lb-time lb-empty">-:--:--</span>
                    `;
                    row.classList.add('lb-row-empty');
                }
                
                lbTable.appendChild(row);
            }
        }
        
        // Handle name input for qualifiers
        const lbNameSection = document.getElementById('lb-name-section');
        const lbCongratsMsg = document.getElementById('lb-congrats-msg');
        const lbSavedMsg = document.getElementById('lb-saved-msg');
        
        if (lbNameSection) {
            if (data.qualifies) {
                lbNameSection.style.display = 'block';
                if (lbCongratsMsg) lbCongratsMsg.textContent = `\u{1F389} NEW RECORD! You ranked #${data.rank}! Enter your name:`;
                
                // Reset input
                const nameInput = document.getElementById('lb-name-input');
                if (nameInput) {
                    nameInput.value = '';
                    nameInput.disabled = false;
                    nameInput.style.borderColor = '#FFD700';
                    nameInput.placeholder = 'ENTER YOUR NAME';
                    setTimeout(() => nameInput.focus(), 100);
                }
                
                // Reset save button
                const saveBtn = document.getElementById('lb-save-btn');
                if (saveBtn) {
                    saveBtn.style.display = 'inline-block';
                    saveBtn.disabled = false;
                    saveBtn.textContent = '\u{1F4BE} SAVE';
                }
                if (lbSavedMsg) lbSavedMsg.style.display = 'none';
                
                // Store save data on the leaderboard screen element for the handler
                lbScreen._saveData = {
                    course: data.course,
                    difficulty: data.difficulty,
                    position: data.playerResult ? data.playerResult.position : 1,
                    playerTimeMs: data.playerTimeMs,
                    totalLaps: data.totalLaps
                };
                lbScreen._uiManager = this;
                
                // Only attach handlers once using a flag
                if (!lbScreen._handlersAttached) {
                    lbScreen._handlersAttached = true;
                    
                    // Save button click handler
                    document.getElementById('lb-save-btn').addEventListener('click', async function() {
                        const input = document.getElementById('lb-name-input');
                        const btn = document.getElementById('lb-save-btn');
                        const savedMsg = document.getElementById('lb-saved-msg');
                        const sd = lbScreen._saveData;
                        const uiMgr = lbScreen._uiManager;
                        
                        const name = input ? input.value.trim() : '';
                        if (!name) {
                            if (input) {
                                input.style.borderColor = '#FF0000';
                                input.placeholder = 'Please enter a name!';
                            }
                            return;
                        }
                        
                        btn.disabled = true;
                        btn.textContent = 'SAVING...';
                        
                        try {
                            const res = await fetch('/api/leaderboard/save', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    playerName: name.substring(0, 20),
                                    course: sd.course,
                                    difficulty: sd.difficulty,
                                    position: sd.position,
                                    raceTimeMs: sd.playerTimeMs,
                                    totalLaps: sd.totalLaps
                                })
                            });
                            
                            if (res.ok) {
                                btn.style.display = 'none';
                                if (input) input.disabled = true;
                                if (savedMsg) {
                                    savedMsg.style.display = 'block';
                                    savedMsg.textContent = '\u2705 Score saved!';
                                }
                                
                                // Refresh leaderboard table only (without re-calling showLeaderboard)
                                try {
                                    const refreshRes = await fetch(`/api/leaderboard?course=${encodeURIComponent(sd.course)}&difficulty=${encodeURIComponent(sd.difficulty)}`);
                                    if (refreshRes.ok) {
                                        const newLeaderboard = await refreshRes.json();
                                        const lbTableBody = document.getElementById('lb-table-body');
                                        if (lbTableBody) {
                                            lbTableBody.innerHTML = '';
                                            const maxEntries = 10;
                                            for (let i = 0; i < maxEntries; i++) {
                                                const row = document.createElement('div');
                                                row.className = 'lb-row';
                                                if (i < newLeaderboard.length) {
                                                    const entry = newLeaderboard[i];
                                                    const posIcons = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];
                                                    const posDisplay = i < 3 ? posIcons[i] : `${i + 1}`;
                                                    const div = document.createElement('div');
                                                    div.textContent = entry.playerName;
                                                    row.innerHTML = `
                                                        <span class="lb-rank">${posDisplay}</span>
                                                        <span class="lb-name">${div.innerHTML}</span>
                                                        <span class="lb-time">${Utils.formatTime(entry.raceTimeMs)}</span>
                                                    `;
                                                } else {
                                                    row.innerHTML = `
                                                        <span class="lb-rank">${i + 1}</span>
                                                        <span class="lb-name lb-empty">---</span>
                                                        <span class="lb-time lb-empty">-:--:--</span>
                                                    `;
                                                    row.classList.add('lb-row-empty');
                                                }
                                                lbTableBody.appendChild(row);
                                            }
                                        }
                                    }
                                } catch (e) {
                                    console.warn('Failed to refresh leaderboard:', e);
                                }
                            } else {
                                btn.disabled = false;
                                btn.textContent = '\u274C RETRY';
                            }
                        } catch (err) {
                            console.warn('Failed to save score:', err);
                            btn.disabled = false;
                            btn.textContent = '\u274C RETRY';
                        }
                    });
                    
                    // Enter key handler on input
                    document.getElementById('lb-name-input').addEventListener('keydown', function(e) {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            document.getElementById('lb-save-btn').click();
                        }
                    });
                }
            } else {
                lbNameSection.style.display = 'none';
            }
        }
        
        // Setup retry/menu buttons (attach only once)
        if (!lbScreen._navHandlersAttached) {
            lbScreen._navHandlersAttached = true;
            
            document.getElementById('lb-retry-btn').addEventListener('click', () => {
                if (window.game) window.game.restartRace();
            });
            
            document.getElementById('lb-menu-btn').addEventListener('click', () => {
                if (window.game) window.game.returnToMenu();
            });
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Results screen (legacy, kept for compatibility)
    buildResultsTable(results) {
        const table = document.getElementById('results-table');
        if (!table) return;
        
        table.innerHTML = '';
        
        results.forEach((racer, index) => {
            const row = document.createElement('div');
            row.className = 'results-row' + (racer.isPlayer ? ' player' : '');
            
            const posColors = ['🥇', '🥈', '🥉', ''];
            const posIcon = posColors[Math.min(index, 3)];
            
            row.innerHTML = `
                <span class="results-position">${posIcon || (index + 1)}</span>
                <span class="results-name">${racer.name}</span>
                <span class="results-time">${Utils.formatTime(racer.time)}</span>
            `;
            
            table.appendChild(row);
        });
    }
    
    // Final lap notification
    showFinalLap() {
        // Create temporary overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 72px;
            font-weight: bold;
            color: #ff0000;
            text-shadow: 0 0 20px #ff0000, 4px 4px 0 #000;
            z-index: 200;
            animation: countPulse 0.5s ease-out;
            font-family: 'Press Start 2P', sans-serif;
        `;
        overlay.textContent = 'FINAL LAP!';
        document.body.appendChild(overlay);
        
        setTimeout(() => {
            overlay.remove();
        }, 2000);
    }
    
    // ゲッソー（イカ）のインク効果
    showInkEffect() {
        const inkOverlay = document.createElement('div');
        inkOverlay.id = 'ink-overlay';
        inkOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 150;
            background: transparent;
        `;
        
        // 複数のインクスプラッシュを追加
        for (let i = 0; i < 8; i++) {
            const inkSplash = document.createElement('div');
            const x = Math.random() * 80 + 10;
            const y = Math.random() * 80 + 10;
            const size = Math.random() * 200 + 100;
            
            inkSplash.style.cssText = `
                position: absolute;
                left: ${x}%;
                top: ${y}%;
                width: ${size}px;
                height: ${size}px;
                background: radial-gradient(ellipse at center, 
                    rgba(20, 20, 20, 0.9) 0%, 
                    rgba(40, 40, 40, 0.7) 40%, 
                    transparent 70%);
                border-radius: 50%;
                transform: translate(-50%, -50%) scale(0);
                animation: inkSplatter 0.3s ease-out forwards;
                animation-delay: ${i * 0.05}s;
            `;
            inkOverlay.appendChild(inkSplash);
        }
        
        document.body.appendChild(inkOverlay);
        
        // 6秒後にフェードアウト（持続時間2倍）
        setTimeout(() => {
            inkOverlay.style.transition = 'opacity 1.5s';
            inkOverlay.style.opacity = '0';
            setTimeout(() => inkOverlay.remove(), 1500);
        }, 6000);
    }
}

// インクスプラッターアニメーション用CSS（動的に追加）
const inkStyle = document.createElement('style');
inkStyle.textContent = `
    @keyframes inkSplatter {
        0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
        50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
`;
document.head.appendChild(inkStyle);

window.UIManager = UIManager;
