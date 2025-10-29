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
}

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('bg');
    if (container) {
        new BubbleBackground(container, { count: 26 });
    }
});


