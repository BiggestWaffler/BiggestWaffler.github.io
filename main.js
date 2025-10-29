class BubbleBackground {
    /**
     * @param {HTMLElement} container Element that holds bubbles
     * @param {{count?: number}} options Options: count of bubbles to maintain
     */
    constructor(container, options = {}) {
        this.container = container;
        this.count = options.count ?? 26;
        this.isDestroyed = false;
        this.init();
        window.addEventListener('focus', () => this.resume());
        window.addEventListener('blur', () => this.pause());
    }

    init() {
        for (let i = 0; i < this.count; i++) {
            this.container.appendChild(this.createBubble());
        }
    }

    random(min, max) {
        return Math.random() * (max - min) + min;
    }

    createBubble() {
        const el = document.createElement('div');
        el.className = 'floating-shape';

        const size = Math.round(this.random(18, 90));
        const x = Math.round(this.random(0, 100));
        const duration = this.random(12, 30);
        const delay = -this.random(0, duration); // start at random position in cycle
        const opacity = this.random(0.06, 0.16);

        el.style.setProperty('--size', size);
        el.style.setProperty('--x', x);
        el.style.setProperty('--duration', duration);
        el.style.setProperty('--delay', delay);
        el.style.setProperty('--opacity', opacity);

        el.addEventListener('click', () => this.pop(el));
        return el;
    }

    pop(el) {
        if (el.classList.contains('pop')) return;
        el.classList.add('pop');
        el.style.pointerEvents = 'none';
        // audio combo on click
        this.playCombo();
        setTimeout(() => el.remove(), 340);
        // regenerate after a delay
        setTimeout(() => {
            if (!this.isDestroyed) this.container.appendChild(this.createBubble());
        }, this.random(1800, 3500));
    }

    pause() {
        this.container.querySelectorAll('.floating-shape').forEach(el => {
            el.style.animationPlayState = 'paused';
        });
    }

    resume() {
        this.container.querySelectorAll('.floating-shape').forEach(el => {
            el.style.animationPlayState = 'running';
        });
    }

    // ===== Audio Combo System =====
    ensureAudio() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
            this.masterGain = this.audioCtx.createGain();
            this.masterGain.gain.value = 0.6; // global cap
            this.masterGain.connect(this.audioCtx.destination);
            this.scaleHz = [
                261.63, // C4
                293.66, // D4
                329.63, // E4
                349.23, // F4
                392.0,  // G4
                440.0,  // A4
                493.88, // B4
                523.25  // C5
            ];
            this.combo = 0;
            this.lastClickTime = 0;
            this.comboWindowMs = 1500;
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    playCombo() {
        this.ensureAudio();
        const now = performance.now();
        if (!this.lastClickTime || now - this.lastClickTime > this.comboWindowMs) {
            this.combo = 0;
        }
        this.lastClickTime = now;
        this.combo += 1;

        if (this.combo <= this.scaleHz.length) {
            const idx = this.combo - 1;
            this.playTone(this.scaleHz[idx], 0.22, 0.08);
        } else {
            // Beyond max combo: play C major chord (C-E-G)
            this.playChord([261.63, 329.63, 392.0], 0.35, 0.07);
        }

        clearTimeout(this.comboResetTimer);
        this.comboResetTimer = setTimeout(() => { this.combo = 0; }, this.comboWindowMs);
    }

    playTone(frequency, duration = 0.25, volume = 0.08) {
        const ctx = this.audioCtx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = frequency;
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(this.masterGain);
        const t = ctx.currentTime;
        // smooth attack/decay envelope
        gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(volume * 0.6, t + duration * 0.6);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
        osc.start(t);
        osc.stop(t + duration + 0.02);
    }

    playChord(frequencies, duration = 0.35, volume = 0.06) {
        frequencies.forEach((f, i) => {
            // slight spread for richness
            const detune = (i - 1) * 2; // -2, 0, +2 cents
            const ctx = this.audioCtx;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = f;
            osc.detune.value = detune;
            gain.gain.value = 0.0001;
            osc.connect(gain);
            gain.connect(this.masterGain);
            const t = ctx.currentTime;
            gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
            gain.gain.exponentialRampToValueAtTime(volume * 0.65, t + duration * 0.55);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
            osc.start(t);
            osc.stop(t + duration + 0.02);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('bg');
    if (container) {
        new BubbleBackground(container, { count: 26 });
    }
});


