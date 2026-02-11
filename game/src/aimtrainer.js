(function () {
    'use strict';

    const SIZES = { small: 32, medium: 48, large: 64 };

    const arena = document.getElementById('arena');
    const targetEl = document.getElementById('target');
    const startOverlay = document.getElementById('startOverlay');
    const roundOverlay = document.getElementById('roundOverlay');
    const roundStatsEl = document.getElementById('roundStats');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const startBtn = document.getElementById('startBtn');
    const targetSizeDropdown = document.getElementById('targetSizeDropdown');
    const roundLengthDropdown = document.getElementById('roundLengthDropdown');
    const hitsCountEl = document.getElementById('hitsCount');
    const missesCountEl = document.getElementById('missesCount');
    const accuracyDisplay = document.getElementById('accuracyDisplay');
    const reactionDisplay = document.getElementById('reactionDisplay');
    const timerDisplay = document.getElementById('timerDisplay');

    let state = {
        active: false,
        hits: 0,
        misses: 0,
        reactionTimes: [],
        roundLength: 25,
        targetSize: 'medium',
        spawnTime: 0,
        roundStartTime: 0,
        timerId: null
    };

    function spawnTarget() {
        const size = SIZES[state.targetSize] || SIZES.medium;
        const margin = size / 2 + 8;
        const r = arena.getBoundingClientRect();
        const maxX = r.width - margin * 2;
        const maxY = r.height - margin * 2;
        const left = margin + Math.random() * Math.max(0, maxX);
        const top = margin + Math.random() * Math.max(0, maxY);

        targetEl.style.width = size + 'px';
        targetEl.style.height = size + 'px';
        targetEl.style.left = left + 'px';
        targetEl.style.top = top + 'px';
        targetEl.className = 'aimtrainer-target size-' + state.targetSize;
        targetEl.removeAttribute('aria-hidden');
        targetEl.style.display = '';
        state.spawnTime = performance.now();
    }

    function hideTarget() {
        targetEl.style.display = 'none';
        targetEl.setAttribute('aria-hidden', 'true');
    }

    function isClickOnTarget(clientX, clientY) {
        const r = targetEl.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const radius = r.width / 2;
        const dx = clientX - cx;
        const dy = clientY - cy;
        return dx * dx + dy * dy <= radius * radius;
    }

    function updateHUD() {
        hitsCountEl.textContent = state.hits;
        missesCountEl.textContent = state.misses;
        const total = state.hits + state.misses;
        if (total > 0) {
            accuracyDisplay.textContent = Math.round((state.hits / total) * 100) + '%';
        } else {
            accuracyDisplay.textContent = '—%';
        }
        if (state.reactionTimes.length > 0) {
            const avg = state.reactionTimes.reduce((a, b) => a + b, 0) / state.reactionTimes.length;
            reactionDisplay.textContent = Math.round(avg) + ' ms';
        } else {
            reactionDisplay.textContent = '— ms';
        }
    }

    function updateTimer() {
        if (!state.active || !state.roundStartTime) return;
        const elapsed = (performance.now() - state.roundStartTime) / 1000;
        timerDisplay.textContent = elapsed.toFixed(1) + 's';
    }

    function endRound() {
        state.active = false;
        if (state.timerId) {
            clearInterval(state.timerId);
            state.timerId = null;
        }
        hideTarget();
        const total = state.hits + state.misses;
        const accuracy = total > 0 ? Math.round((state.hits / total) * 100) : 0;
        const avgReaction = state.reactionTimes.length > 0
            ? Math.round(state.reactionTimes.reduce((a, b) => a + b, 0) / state.reactionTimes.length)
            : 0;
        const time = state.roundStartTime ? ((performance.now() - state.roundStartTime) / 1000).toFixed(1) : '0';

        roundStatsEl.innerHTML =
            'Hits: <strong>' + state.hits + '</strong> &nbsp;|&nbsp; ' +
            'Misses: <strong>' + state.misses + '</strong><br>' +
            'Accuracy: <strong>' + accuracy + '%</strong><br>' +
            'Avg reaction: <strong>' + avgReaction + ' ms</strong><br>' +
            'Time: <strong>' + time + 's</strong>';
        roundOverlay.classList.remove('aimtrainer-overlay--hidden');
        startBtn.textContent = 'Start';
    }

    function onArenaClick(e) {
        if (!state.active) return;
        if (targetEl.style.display === 'none') return;

        if (isClickOnTarget(e.clientX, e.clientY)) {
            state.hits++;
            state.reactionTimes.push(performance.now() - state.spawnTime);
            targetEl.classList.add('hit');
            setTimeout(function () {
                targetEl.classList.remove('hit');
                updateHUD();
                if (state.roundLength > 0 && state.hits >= state.roundLength) {
                    endRound();
                    return;
                }
                spawnTarget();
            }, 120);
        } else {
            state.misses++;
            updateHUD();
        }
    }

    function getCustomSelectValue(dropdownEl) {
        return dropdownEl ? dropdownEl.getAttribute('data-value') : null;
    }

    function startGame() {
        state.hits = 0;
        state.misses = 0;
        state.reactionTimes = [];
        state.roundLength = parseInt(getCustomSelectValue(roundLengthDropdown), 10) || 0;
        state.targetSize = getCustomSelectValue(targetSizeDropdown) || 'medium';
        state.active = true;
        state.roundStartTime = performance.now();
        state.timerId = setInterval(updateTimer, 100);

        startOverlay.classList.add('aimtrainer-overlay--hidden');
        roundOverlay.classList.add('aimtrainer-overlay--hidden');
        startBtn.textContent = 'Restart';
        updateHUD();
        timerDisplay.textContent = '0.0s';
        spawnTarget();
        arena.focus();
    }

    function stopGame() {
        state.active = false;
        if (state.timerId) {
            clearInterval(state.timerId);
            state.timerId = null;
        }
        hideTarget();
        startOverlay.classList.remove('aimtrainer-overlay--hidden');
        startBtn.textContent = 'Start';
    }

    startBtn.addEventListener('click', function () {
        if (state.active) {
            stopGame();
            return;
        }
        startGame();
    });

    playAgainBtn.addEventListener('click', function () {
        roundOverlay.classList.add('aimtrainer-overlay--hidden');
        startGame();
    });

    arena.addEventListener('click', onArenaClick);

    arena.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && state.active) {
            stopGame();
        }
    });

    /* Custom dropdown behavior */
    function initCustomSelect(wrapper) {
        const trigger = wrapper.querySelector('.custom-select-trigger');
        const valueEl = wrapper.querySelector('.custom-select-value');
        const panel = wrapper.querySelector('.custom-select-panel');
        const options = wrapper.querySelectorAll('.custom-select-option');

        function close() {
            wrapper.classList.remove('open');
            wrapper.setAttribute('aria-expanded', 'false');
        }

        function open() {
            document.querySelectorAll('.custom-select.open').forEach(function (other) {
                if (other !== wrapper) other.classList.remove('open');
            });
            wrapper.classList.add('open');
            wrapper.setAttribute('aria-expanded', 'true');
        }

        function select(optionEl) {
            const value = optionEl.getAttribute('data-value');
            const label = optionEl.textContent.trim();
            wrapper.setAttribute('data-value', value);
            valueEl.textContent = label;
            options.forEach(function (opt) { opt.classList.remove('custom-select-option--selected'); });
            optionEl.classList.add('custom-select-option--selected');
            close();
        }

        trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            if (wrapper.classList.contains('open')) close();
            else open();
        });

        options.forEach(function (opt) {
            opt.addEventListener('click', function (e) {
                e.stopPropagation();
                select(opt);
            });
        });

        document.addEventListener('click', function () {
            if (wrapper.classList.contains('open')) close();
        });
    }

    if (targetSizeDropdown) initCustomSelect(targetSizeDropdown);
    if (roundLengthDropdown) initCustomSelect(roundLengthDropdown);

    updateHUD();
})();
