// Audio system for the racing game

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.music = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.masterGain = null;
        this.initialized = false;
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;
        this.pendingMusic = null; // Track music that couldn't play due to autoplay
        
        // Sound effect definitions
        this.soundDefs = {
            engine_idle: { frequency: 80, type: 'sawtooth', duration: 0.1, loop: true },
            engine_rev: { frequency: 120, type: 'sawtooth', duration: 0.1, loop: true },
            drift: { frequency: 200, type: 'noise', duration: 0.1, loop: true },
            boost: { frequency: 400, type: 'square', duration: 0.3, sweep: 800 },
            boost_big: { frequency: 300, type: 'square', duration: 0.5, sweep: 1000 },
            item_get: { frequency: 600, type: 'sine', duration: 0.2, sweep: 1200 },
            item_use: { frequency: 400, type: 'square', duration: 0.15 },
            item_roulette: { frequency: 500, type: 'sine', duration: 0.15, sweep: 700 },
            missile_fire: { frequency: 200, type: 'sawtooth', duration: 0.3, sweep: 50 },
            missile_hit: { frequency: 100, type: 'noise', duration: 0.4 },
            banana_drop: { frequency: 300, type: 'sine', duration: 0.1 },
            spin_out: { frequency: 150, type: 'noise', duration: 0.5 },
            shield_up: { frequency: 500, type: 'sine', duration: 0.3, sweep: 800 },
            shield_hit: { frequency: 600, type: 'noise', duration: 0.2 },
            lightning: { frequency: 100, type: 'noise', duration: 0.6 },
            teleport: { frequency: 800, type: 'sine', duration: 0.4, sweep: 200 },
            countdown: { frequency: 440, type: 'sine', duration: 0.3 },
            countdown_go: { frequency: 880, type: 'sine', duration: 0.5 },
            lap_complete: { frequency: 523, type: 'sine', duration: 0.2, arpeggio: [523, 659, 784] },
            race_finish: { frequency: 523, type: 'sine', duration: 0.15, arpeggio: [523, 659, 784, 1047] },
            collision: { frequency: 80, type: 'noise', duration: 0.2 },
            wrong_way: { frequency: 200, type: 'square', duration: 0.3 },
            explosion: { frequency: 80, type: 'noise', duration: 0.5 },
            shell_break: { frequency: 200, type: 'noise', duration: 0.3 },
            hop: { frequency: 350, type: 'sine', duration: 0.08, sweep: 500 },
            crash: { frequency: 150, type: 'noise', duration: 0.35 },
            shell_fire: { frequency: 250, type: 'square', duration: 0.15, sweep: 400 },
            shell_bounce: { frequency: 180, type: 'sine', duration: 0.1 },
            blooper: { frequency: 200, type: 'sine', duration: 0.4, sweep: 100 },
            throw: { frequency: 280, type: 'square', duration: 0.12 }
        };
        
        this.warnedSounds = new Set();
        
        // Engine oscillators
        this.engineOsc = null;
        this.engineGain = null;
        this.driftOsc = null;
        this.driftGain = null;
        
        // Setup user interaction listener to unlock audio
        this._userInteracted = false;
        this._setupInteractionListener();
    }
    
    _setupInteractionListener() {
        const unlock = () => {
            this._userInteracted = true;
            
            // Resume AudioContext if suspended
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            // Play pending music if any
            if (this.pendingMusic && this.music === this.pendingMusic) {
                this.pendingMusic.play().catch(() => {});
                this.pendingMusic = null;
            }
            
            document.removeEventListener('click', unlock);
            document.removeEventListener('keydown', unlock);
            document.removeEventListener('touchstart', unlock);
        };
        
        document.addEventListener('click', unlock);
        document.addEventListener('keydown', unlock);
        document.addEventListener('touchstart', unlock);
    }
    
    // Map local filenames to CDN URLs for deployed environment
    _getCdnUrl(filename) {
        const audioCdnMap = {
            'audio/01_Opening_Theme.mp3': 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663027084947/BJbwPlOkQVERDMvk.mp3',
            'audio/02_Moo_Moo_Farm.mp3': 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663027084947/MaVBLBTatgWeCsqY.mp3',
            'audio/03_Frappe_Snowland.mp3': 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663027084947/SKjUyMWvAqcROaTH.mp3',
            'audio/04_Bowser_Castle.mp3': 'https://files.manuscdn.com/user_upload_by_module/session_file/310419663027084947/KgaCUXnDQWMVcfGB.mp3'
        };
        return audioCdnMap[filename] || filename;
    }
    
    // Play local mp3 music by filename
    playLocalMusic(filename) {
        this.stopMusic();
        
        const audioSrc = this._getCdnUrl(filename);
        const audio = new Audio(audioSrc);
        audio.loop = true;
        audio.volume = this.musicVolume;
        this.music = audio;
        this.pendingMusic = null;
        
        // Try to play - if blocked, defer to user interaction
        const tryPlay = () => {
            audio.play().then(() => {
                this.pendingMusic = null;
            }).catch(e => {
                console.log('Music autoplay deferred - will play after user interaction');
                this.pendingMusic = audio;
            });
        };
        
        // If audio is ready, try immediately; otherwise wait for canplay
        if (audio.readyState >= 3) {
            tryPlay();
        } else {
            audio.addEventListener('canplay', tryPlay, { once: true });
        }
    }
    
    stopMusic() {
        this.pendingMusic = null;
        if (this.music) {
            this.music.pause();
            this.music.currentTime = 0;
            this.music = null;
        }
    }
    
    async init() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master gain
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.7;
            this.masterGain.connect(this.audioContext.destination);
            
            // Create music gain
            this.musicGain = this.audioContext.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.masterGain);
            
            // Create SFX gain
            this.sfxGain = this.audioContext.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.masterGain);
            
            this.initialized = true;
            console.log('Audio system initialized');
        } catch (e) {
            console.warn('Audio system failed to initialize:', e);
        }
    }
    
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        // Also try to play pending music
        if (this.pendingMusic && this.music === this.pendingMusic) {
            this.pendingMusic.play().catch(() => {});
            this.pendingMusic = null;
        }
    }
    
    // Create noise buffer for noise-based sounds
    createNoiseBuffer(duration = 1) {
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        return buffer;
    }
    
    // Play a synthesized sound effect
    playSound(soundName, options = {}) {
        if (!this.initialized || !this.audioContext) return null;
        
        const def = this.soundDefs[soundName];
        if (!def) {
            if (!this.warnedSounds.has(soundName)) {
                this.warnedSounds.add(soundName);
                console.warn(`Sound not found: ${soundName}`);
            }
            return null;
        }
        
        const now = this.audioContext.currentTime;
        let source;
        
        if (def.type === 'noise') {
            source = this.audioContext.createBufferSource();
            source.buffer = this.createNoiseBuffer(def.duration);
            
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = def.frequency * 4;
            
            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + def.duration);
            
            source.connect(filter);
            filter.connect(gain);
            gain.connect(this.sfxGain);
        } else {
            source = this.audioContext.createOscillator();
            source.type = def.type;
            source.frequency.setValueAtTime(def.frequency, now);
            
            if (def.sweep) {
                source.frequency.exponentialRampToValueAtTime(def.sweep, now + def.duration);
            }
            
            if (def.arpeggio) {
                const noteLength = def.duration / def.arpeggio.length;
                def.arpeggio.forEach((freq, i) => {
                    source.frequency.setValueAtTime(freq, now + i * noteLength);
                });
            }
            
            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + def.duration);
            
            source.connect(gain);
            gain.connect(this.sfxGain);
        }
        
        source.start(now);
        if (!def.loop) {
            source.stop(now + def.duration);
        }
        
        return source;
    }
    
    // Start engine sound
    startEngine() {
        if (!this.initialized) return;
        
        if (this.engineOsc) {
            this.stopEngine();
        }
        
        this.engineOsc = this.audioContext.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.value = 60;
        
        this.engineGain = this.audioContext.createGain();
        this.engineGain.gain.value = 0.08;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        
        this.engineOsc.connect(filter);
        filter.connect(this.engineGain);
        this.engineGain.connect(this.sfxGain);
        
        this.engineOsc.start();
    }
    
    // Update engine sound based on speed
    updateEngine(speed, maxSpeed, isDrifting) {
        if (!this.engineOsc) return;
        
        const speedRatio = speed / maxSpeed;
        const baseFreq = 60;
        const maxFreq = 180;
        
        this.engineOsc.frequency.value = baseFreq + (maxFreq - baseFreq) * speedRatio;
        this.engineGain.gain.value = 0.05 + speedRatio * 0.1;
        
        if (isDrifting && !this.driftOsc) {
            this.startDriftSound();
        } else if (!isDrifting && this.driftOsc) {
            this.stopDriftSound();
        }
    }
    
    startDriftSound() {
        if (!this.initialized || this.driftOsc) return;
        
        this.driftOsc = this.audioContext.createOscillator();
        this.driftOsc.type = 'sawtooth';
        this.driftOsc.frequency.value = 100;
        
        this.driftGain = this.audioContext.createGain();
        this.driftGain.gain.value = 0.05;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 500;
        
        this.driftOsc.connect(filter);
        filter.connect(this.driftGain);
        this.driftGain.connect(this.sfxGain);
        
        this.driftOsc.start();
    }
    
    stopDriftSound() {
        if (this.driftOsc) {
            this.driftOsc.stop();
            this.driftOsc = null;
            this.driftGain = null;
        }
    }
    
    stopEngine() {
        if (this.engineOsc) {
            this.engineOsc.stop();
            this.engineOsc = null;
            this.engineGain = null;
        }
        this.stopDriftSound();
    }
    
    // Play background music (procedurally generated) - legacy, use playLocalMusic instead
    playMusic(type = 'race') {
        // For menu, play the opening theme
        if (type === 'menu') {
            this.playLocalMusic('audio/01_Opening_Theme.mp3');
        }
    }
    
    // Play victory fanfare
    playVictoryFanfare() {
        if (!this.initialized) return;
        
        const now = this.audioContext.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50, 1318.51];
        const durations = [0.2, 0.2, 0.2, 0.4, 0.2, 0.2, 0.6];
        
        let time = 0;
        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            osc.type = 'square';
            osc.frequency.value = freq;
            
            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0.2, now + time);
            gain.gain.exponentialRampToValueAtTime(0.01, now + time + durations[i] * 0.9);
            
            osc.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start(now + time);
            osc.stop(now + time + durations[i]);
            
            time += durations[i];
        });
    }
    
    setMusicVolume(volume) {
        this.musicVolume = volume;
        if (this.musicGain) {
            this.musicGain.gain.value = volume;
        }
        if (this.music) {
            this.music.volume = volume;
        }
    }
    
    setSFXVolume(volume) {
        this.sfxVolume = volume;
        if (this.sfxGain) {
            this.sfxGain.gain.value = volume;
        }
    }
}

// Create global audio manager
window.audioManager = new AudioManager();
