(function () {
    'use strict';

    const SIZES = { small: 32, medium: 48, large: 64 };

    const mainMenu = document.getElementById('main-menu');
    const reactionScreen = document.getElementById('reaction-screen');
    const numberScreen = document.getElementById('number-screen');
    const aimScreen = document.getElementById('aim-screen');
    const reactionZone = document.getElementById('reaction-zone');
    const reactionMessage = document.getElementById('reaction-message');
    const reactionLastEl = document.getElementById('reaction-last');
    const reactionAvgEl = document.getElementById('reaction-avg');
    const reactionCountEl = document.getElementById('reaction-count');

    const numberLevelEl = document.getElementById('number-level');
    const numberContent = document.getElementById('number-content');
    const numberMessage = document.getElementById('number-message');
    const numberStartBtn = document.getElementById('number-start-btn');
    const numberInputWrap = document.getElementById('number-input-wrap');
    const numberInput = document.getElementById('number-input');
    const numberSubmitBtn = document.getElementById('number-submit-btn');
    const numberGameover = document.getElementById('number-gameover');
    const numberGameoverMessage = document.getElementById('number-gameover-message');
    const numberAgainBtn = document.getElementById('number-again-btn');
    const numberModeRandom = document.getElementById('number-mode-random');
    const numberModeSequence = document.getElementById('number-mode-sequence');
    const numberModeHintText = document.getElementById('number-mode-hint-text');

    const arena = document.getElementById('arena');
    const targetEl = document.getElementById('target');
    const startOverlay = document.getElementById('startOverlay');
    const roundOverlay = document.getElementById('roundOverlay');
    const roundStatsEl = document.getElementById('roundStats');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const startBtn = document.getElementById('startBtn');
    const targetSizeDropdown = document.getElementById('targetSizeDropdown');
    const roundLengthDropdown = document.getElementById('roundLengthDropdown');
    const aimModeDropdown = document.getElementById('aimModeDropdown');
    const hitsCountEl = document.getElementById('hitsCount');
    const missesCountEl = document.getElementById('missesCount');
    const accuracyDisplay = document.getElementById('accuracyDisplay');
    const reactionDisplay = document.getElementById('reactionDisplay');
    const timerDisplay = document.getElementById('timerDisplay');

    // --- Navigation (Human Benchmark hub) ---

    function hideAllScreens() {
        [mainMenu, reactionScreen, numberScreen, aimScreen].forEach(function (el) {
            if (el) el.classList.remove('active');
        });
    }

    window.benchmark = {
        showMainMenu: function () {
            stopReaction();
            stopNumberMemory();
            stopAimTrainer();
            hideAllScreens();
            if (mainMenu) mainMenu.classList.add('active');
        },

        showTest: function (id) {
            hideAllScreens();
            if (id === 'reaction') {
                if (reactionScreen) reactionScreen.classList.add('active');
                initReactionState();
                renderReactionUI();
            } else if (id === 'number') {
                if (numberScreen) numberScreen.classList.add('active');
                initNumberMemory();
                renderNumberMemoryUI();
            } else if (id === 'aim') {
                if (aimScreen) aimScreen.classList.add('active');
                updateAimHUD();
            }
        }
    };

    // --- Reaction Time Test ---

    let reactionState = {
        phase: 'idle',
        times: [],
        goTime: 0,
        timeoutId: null
    };

    function initReactionState() {
        reactionState.phase = 'idle';
        reactionState.times = [];
        reactionState.goTime = 0;
        if (reactionState.timeoutId) {
            clearTimeout(reactionState.timeoutId);
            reactionState.timeoutId = null;
        }
    }

    function stopReaction() {
        if (reactionState.timeoutId) {
            clearTimeout(reactionState.timeoutId);
            reactionState.timeoutId = null;
        }
        reactionState.phase = 'idle';
    }

    function renderReactionUI() {
        if (!reactionZone || !reactionMessage) return;
        reactionZone.className = 'reaction-zone';
        if (reactionState.phase === 'idle') {
            reactionZone.classList.add('reaction-wait');
            reactionMessage.textContent = 'Click anywhere to start';
            reactionMessage.innerHTML = 'Click anywhere to start';
        } else if (reactionState.phase === 'waiting') {
            reactionZone.classList.add('reaction-ready');
            reactionMessage.textContent = 'Wait for green...';
            reactionMessage.innerHTML = 'Wait for green...';
        } else if (reactionState.phase === 'go') {
            reactionZone.classList.add('reaction-go');
            reactionMessage.textContent = 'Click!';
            reactionMessage.innerHTML = 'Click!';
        } else if (reactionState.phase === 'too_early') {
            reactionZone.classList.add('reaction-too-early');
            reactionMessage.innerHTML = 'Too early!<br><span style="font-size:0.6em;">Click to try again</span>';
        } else if (reactionState.phase === 'result') {
            reactionZone.classList.add('reaction-go');
            const ms = reactionState.lastMs;
            reactionMessage.innerHTML = '<span class="reaction-result-ms">' + ms + ' <span>ms</span></span><br><span style="font-size:0.5em; margin-top:12px; display:block;">Click to try again</span>';
        }

        if (reactionLastEl) {
            if (reactionState.times.length > 0) {
                reactionLastEl.textContent = reactionState.times[reactionState.times.length - 1] + ' ms';
            } else {
                reactionLastEl.textContent = '— ms';
            }
        }
        if (reactionAvgEl) {
            if (reactionState.times.length > 0) {
                const avg = Math.round(reactionState.times.reduce(function (a, b) { return a + b; }, 0) / reactionState.times.length);
                reactionAvgEl.textContent = avg + ' ms';
            } else {
                reactionAvgEl.textContent = '— ms';
            }
        }
        if (reactionCountEl) {
            reactionCountEl.textContent = reactionState.times.length;
        }
    }

    function onReactionZoneClick() {
        if (reactionState.phase === 'idle') {
            reactionState.phase = 'waiting';
            renderReactionUI();
            const delay = 2000 + Math.random() * 3000;
            reactionState.timeoutId = setTimeout(function () {
                reactionState.timeoutId = null;
                reactionState.phase = 'go';
                reactionState.goTime = performance.now();
                renderReactionUI();
            }, delay);
        } else if (reactionState.phase === 'waiting') {
            reactionState.phase = 'too_early';
            if (reactionState.timeoutId) {
                clearTimeout(reactionState.timeoutId);
                reactionState.timeoutId = null;
            }
            renderReactionUI();
        } else if (reactionState.phase === 'go') {
            const ms = Math.round(performance.now() - reactionState.goTime);
            reactionState.times.push(ms);
            reactionState.lastMs = ms;
            reactionState.phase = 'result';
            renderReactionUI();
        } else if (reactionState.phase === 'too_early' || reactionState.phase === 'result') {
            reactionState.phase = 'waiting';
            renderReactionUI();
            const delay = 2000 + Math.random() * 3000;
            reactionState.timeoutId = setTimeout(function () {
                reactionState.timeoutId = null;
                reactionState.phase = 'go';
                reactionState.goTime = performance.now();
                renderReactionUI();
            }, delay);
        }
    }

    if (reactionZone) {
        reactionZone.addEventListener('click', onReactionZoneClick);
    }

    // --- Number Memory Test ---

    let numberState = {
        phase: 'idle',
        level: 1,
        number: '',
        mode: 'random',
        timeoutId: null
    };

    function initNumberMemory() {
        numberState.phase = 'idle';
        numberState.level = 1;
        numberState.number = '';
        if (numberState.timeoutId) {
            clearTimeout(numberState.timeoutId);
            numberState.timeoutId = null;
        }
    }

    function stopNumberMemory() {
        if (numberState.timeoutId) {
            clearTimeout(numberState.timeoutId);
            numberState.timeoutId = null;
        }
        numberState.phase = 'idle';
    }

    function generateNumber(digits) {
        let s = '';
        for (let i = 0; i < digits; i++) {
            s += Math.floor(Math.random() * 10);
        }
        return s;
    }

    function renderNumberMemoryUI() {
        if (!numberContent || !numberMessage) return;

        numberContent.classList.remove('number-content--hidden');
        if (numberInputWrap) numberInputWrap.classList.add('number-input-wrap--hidden');
        if (numberGameover) numberGameover.classList.add('number-gameover--hidden');

        if (numberState.phase === 'idle') {
            numberMessage.textContent = 'Click Start to begin';
            if (numberStartBtn) {
                numberStartBtn.style.display = '';
                numberStartBtn.textContent = 'Start';
            }
            updateNumberModeHint();
        } else if (numberState.phase === 'showing') {
            numberMessage.textContent = numberState.number;
            numberMessage.classList.add('number-display');
            if (numberStartBtn) numberStartBtn.style.display = 'none';
        } else if (numberState.phase === 'input') {
            numberContent.classList.add('number-content--hidden');
            if (numberInputWrap) numberInputWrap.classList.remove('number-input-wrap--hidden');
            if (numberInput) {
                numberInput.value = '';
                numberInput.focus();
            }
        } else if (numberState.phase === 'gameover') {
            numberContent.classList.add('number-content--hidden');
            if (numberInputWrap) numberInputWrap.classList.add('number-input-wrap--hidden');
            if (numberGameover) numberGameover.classList.remove('number-gameover--hidden');
            if (numberGameoverMessage) {
                numberGameoverMessage.innerHTML = 'Wrong. The number was <strong>' + numberState.number + '</strong>.<br>You reached level <strong>' + numberState.level + '</strong>.';
            }
        }

        if (numberLevelEl) {
            numberLevelEl.textContent = numberState.phase === 'idle' ? '—' : numberState.level;
        }
    }

    function startNumberRound() {
        if (numberState.mode === 'random') {
            numberState.number = generateNumber(numberState.level);
        } else {
            if (numberState.level === 1) {
                numberState.number = generateNumber(1);
            } else {
                numberState.number = numberState.number + generateNumber(1);
            }
        }
        numberState.phase = 'showing';
        numberMessage.classList.remove('number-display');
        renderNumberMemoryUI();

        const displayMs = Math.max(1500, 2000 + numberState.level * 400);
        numberState.timeoutId = setTimeout(function () {
            numberState.timeoutId = null;
            numberState.phase = 'input';
            numberMessage.classList.remove('number-display');
            renderNumberMemoryUI();
        }, displayMs);
    }

    function onNumberSubmit() {
        if (!numberInput) return;
        const answer = numberInput.value.trim();
        if (answer === '') return;

        if (answer === numberState.number) {
            numberState.level++;
            startNumberRound();
        } else {
            if (numberState.timeoutId) {
                clearTimeout(numberState.timeoutId);
                numberState.timeoutId = null;
            }
            numberState.phase = 'gameover';
            renderNumberMemoryUI();
        }
    }

    if (numberStartBtn) {
        numberStartBtn.addEventListener('click', function () {
            if (numberState.phase !== 'idle') return;
            startNumberRound();
        });
    }

    if (numberSubmitBtn) {
        numberSubmitBtn.addEventListener('click', onNumberSubmit);
    }

    if (numberInput) {
        numberInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') onNumberSubmit();
        });
        numberInput.addEventListener('input', function () {
            this.value = this.value.replace(/\D/g, '');
        });
    }

    if (numberAgainBtn) {
        numberAgainBtn.addEventListener('click', function () {
            initNumberMemory();
            renderNumberMemoryUI();
        });
    }

    function setNumberMode(mode) {
        numberState.mode = mode;
        if (numberModeRandom) numberModeRandom.classList.toggle('number-mode-btn--active', mode === 'random');
        if (numberModeSequence) numberModeSequence.classList.toggle('number-mode-btn--active', mode === 'sequence');
        updateNumberModeHint();
    }

    function updateNumberModeHint() {
        if (numberModeHintText) {
            numberModeHintText.textContent = numberState.mode === 'random'
                ? 'New number each level.'
                : 'Each level adds one digit to the previous number.';
        }
    }

    if (numberModeRandom) {
        numberModeRandom.addEventListener('click', function () { setNumberMode('random'); });
    }
    if (numberModeSequence) {
        numberModeSequence.addEventListener('click', function () { setNumberMode('sequence'); });
    }

    // --- Aim Trainer (embedded) ---

    let aimState = {
        active: false,
        hits: 0,
        misses: 0,
        reactionTimes: [],
        roundLength: 25,
        targetSize: 'medium',
        trackingMode: false,
        spawnTime: 0,
        roundStartTime: 0,
        timerId: null,
        trackX: 0,
        trackY: 0,
        trackVx: 0,
        trackVy: 0,
        trackChangeAt: 0,
        trackRAF: null,
        trackLastTime: 0
    };

    function getArenaBounds() {
        if (!arena) return null;
        const size = SIZES[aimState.targetSize] || SIZES.medium;
        const margin = size / 2 + 8;
        const r = arena.getBoundingClientRect();
        return {
            width: r.width,
            height: r.height,
            margin: margin,
            minX: margin,
            maxX: r.width - margin,
            minY: margin,
            maxY: r.height - margin,
            size: size
        };
    }

    function pickRandomVelocity() {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.08 + Math.random() * 0.12;
        return {
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed
        };
    }

    function tickTracking(timestamp) {
        if (!aimState.active || !aimState.trackingMode || !targetEl || targetEl.style.display === 'none') {
            aimState.trackRAF = null;
            return;
        }
        aimState.trackRAF = requestAnimationFrame(tickTracking);

        const bounds = getArenaBounds();
        if (!bounds) return;

        const dt = aimState.trackLastTime ? Math.min(timestamp - aimState.trackLastTime, 50) : 16;
        aimState.trackLastTime = timestamp;

        aimState.trackX += aimState.trackVx * dt;
        aimState.trackY += aimState.trackVy * dt;

        if (aimState.trackX <= bounds.minX) {
            aimState.trackX = bounds.minX;
            aimState.trackVx = Math.abs(aimState.trackVx);
        }
        if (aimState.trackX >= bounds.maxX) {
            aimState.trackX = bounds.maxX;
            aimState.trackVx = -Math.abs(aimState.trackVx);
        }
        if (aimState.trackY <= bounds.minY) {
            aimState.trackY = bounds.minY;
            aimState.trackVy = Math.abs(aimState.trackVy);
        }
        if (aimState.trackY >= bounds.maxY) {
            aimState.trackY = bounds.maxY;
            aimState.trackVy = -Math.abs(aimState.trackVy);
        }

        if (timestamp >= aimState.trackChangeAt) {
            const v = pickRandomVelocity();
            aimState.trackVx = v.vx;
            aimState.trackVy = v.vy;
            aimState.trackChangeAt = timestamp + 1500 + Math.random() * 2000;
        }

        targetEl.style.left = aimState.trackX + 'px';
        targetEl.style.top = aimState.trackY + 'px';
    }

    function spawnTarget() {
        if (!arena || !targetEl) return;
        const size = SIZES[aimState.targetSize] || SIZES.medium;
        const bounds = getArenaBounds();
        if (!bounds) return;

        const left = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
        const top = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);

        targetEl.style.width = size + 'px';
        targetEl.style.height = size + 'px';
        targetEl.style.left = left + 'px';
        targetEl.style.top = top + 'px';
        targetEl.className = 'aimtrainer-target size-' + aimState.targetSize;
        targetEl.removeAttribute('aria-hidden');
        targetEl.style.display = '';
        aimState.spawnTime = performance.now();

        if (aimState.trackingMode) {
            aimState.trackX = left;
            aimState.trackY = top;
            const v = pickRandomVelocity();
            aimState.trackVx = v.vx;
            aimState.trackVy = v.vy;
            aimState.trackChangeAt = performance.now() + 1500 + Math.random() * 2000;
            aimState.trackLastTime = 0;
            if (aimState.trackRAF) cancelAnimationFrame(aimState.trackRAF);
            aimState.trackRAF = requestAnimationFrame(tickTracking);
        }
    }

    function hideTarget() {
        if (aimState.trackRAF) {
            cancelAnimationFrame(aimState.trackRAF);
            aimState.trackRAF = null;
        }
        if (targetEl) {
            targetEl.style.display = 'none';
            targetEl.setAttribute('aria-hidden', 'true');
        }
    }

    function isClickOnTarget(clientX, clientY) {
        if (!targetEl) return false;
        const r = targetEl.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const radius = r.width / 2;
        const dx = clientX - cx;
        const dy = clientY - cy;
        return dx * dx + dy * dy <= radius * radius;
    }

    function updateAimHUD() {
        if (hitsCountEl) hitsCountEl.textContent = aimState.hits;
        if (missesCountEl) missesCountEl.textContent = aimState.misses;
        const total = aimState.hits + aimState.misses;
        if (accuracyDisplay) {
            accuracyDisplay.textContent = total > 0 ? Math.round((aimState.hits / total) * 100) + '%' : '—%';
        }
        if (reactionDisplay) {
            if (aimState.reactionTimes.length > 0) {
                const avg = aimState.reactionTimes.reduce(function (a, b) { return a + b; }, 0) / aimState.reactionTimes.length;
                reactionDisplay.textContent = Math.round(avg) + ' ms';
            } else {
                reactionDisplay.textContent = '— ms';
            }
        }
        if (timerDisplay && aimState.active && aimState.roundStartTime) {
            const elapsed = (performance.now() - aimState.roundStartTime) / 1000;
            timerDisplay.textContent = elapsed.toFixed(1) + 's';
        }
    }

    function updateAimTimer() {
        if (!aimState.active || !aimState.roundStartTime) return;
        if (timerDisplay) {
            const elapsed = (performance.now() - aimState.roundStartTime) / 1000;
            timerDisplay.textContent = elapsed.toFixed(1) + 's';
        }
    }

    function endAimRound() {
        aimState.active = false;
        if (aimState.timerId) {
            clearInterval(aimState.timerId);
            aimState.timerId = null;
        }
        hideTarget();
        const total = aimState.hits + aimState.misses;
        const accuracy = total > 0 ? Math.round((aimState.hits / total) * 100) : 0;
        const avgReaction = aimState.reactionTimes.length > 0
            ? Math.round(aimState.reactionTimes.reduce(function (a, b) { return a + b; }, 0) / aimState.reactionTimes.length)
            : 0;
        const time = aimState.roundStartTime ? ((performance.now() - aimState.roundStartTime) / 1000).toFixed(1) : '0';

        if (roundStatsEl) {
            roundStatsEl.innerHTML =
                'Hits: <strong>' + aimState.hits + '</strong> &nbsp;|&nbsp; ' +
                'Misses: <strong>' + aimState.misses + '</strong><br>' +
                'Accuracy: <strong>' + accuracy + '%</strong><br>' +
                'Avg reaction: <strong>' + avgReaction + ' ms</strong><br>' +
                'Time: <strong>' + time + 's</strong>';
        }
        if (roundOverlay) roundOverlay.classList.remove('aimtrainer-overlay--hidden');
        if (startBtn) startBtn.textContent = 'Start';
    }

    function onArenaClick(e) {
        if (!aimState.active || !targetEl || targetEl.style.display === 'none') return;

        if (isClickOnTarget(e.clientX, e.clientY)) {
            if (aimState.trackRAF) {
                cancelAnimationFrame(aimState.trackRAF);
                aimState.trackRAF = null;
            }
            aimState.hits++;
            aimState.reactionTimes.push(performance.now() - aimState.spawnTime);
            targetEl.classList.add('hit');
            setTimeout(function () {
                targetEl.classList.remove('hit');
                updateAimHUD();
                if (aimState.roundLength > 0 && aimState.hits >= aimState.roundLength) {
                    endAimRound();
                    return;
                }
                spawnTarget();
            }, 120);
        } else {
            aimState.misses++;
            updateAimHUD();
        }
    }

    function getCustomSelectValue(dropdownEl) {
        return dropdownEl ? dropdownEl.getAttribute('data-value') : null;
    }

    function startAimGame() {
        aimState.hits = 0;
        aimState.misses = 0;
        aimState.reactionTimes = [];
        aimState.roundLength = parseInt(getCustomSelectValue(roundLengthDropdown), 10) || 0;
        aimState.targetSize = getCustomSelectValue(targetSizeDropdown) || 'medium';
        aimState.trackingMode = getCustomSelectValue(aimModeDropdown) === 'tracking';
        aimState.active = true;
        aimState.roundStartTime = performance.now();
        aimState.timerId = setInterval(updateAimTimer, 100);

        if (startOverlay) startOverlay.classList.add('aimtrainer-overlay--hidden');
        if (roundOverlay) roundOverlay.classList.add('aimtrainer-overlay--hidden');
        if (startBtn) startBtn.textContent = 'Restart';
        updateAimHUD();
        if (timerDisplay) timerDisplay.textContent = '0.0s';
        spawnTarget();
        if (arena) arena.focus();
    }

    function stopAimTrainer() {
        aimState.active = false;
        if (aimState.timerId) {
            clearInterval(aimState.timerId);
            aimState.timerId = null;
        }
        hideTarget();
        if (startOverlay) startOverlay.classList.remove('aimtrainer-overlay--hidden');
        if (startBtn) startBtn.textContent = 'Start';
    }

    function initAimTrainerDropdowns() {
        function initCustomSelect(wrapper) {
            if (!wrapper) return;
            const trigger = wrapper.querySelector('.custom-select-trigger');
            const valueEl = wrapper.querySelector('.custom-select-value');
            const panel = wrapper.querySelector('.custom-select-panel');
            const options = wrapper.querySelectorAll('.custom-select-option');
            if (!trigger || !valueEl) return;

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
        if (aimModeDropdown) initCustomSelect(aimModeDropdown);
    }

    if (startBtn) {
        startBtn.addEventListener('click', function () {
            if (aimState.active) {
                stopAimTrainer();
                return;
            }
            startAimGame();
        });
    }

    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', function () {
            if (roundOverlay) roundOverlay.classList.add('aimtrainer-overlay--hidden');
            startAimGame();
        });
    }

    if (arena) {
        arena.addEventListener('click', onArenaClick);
        arena.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && aimState.active) {
                stopAimTrainer();
            }
        });
    }

    initAimTrainerDropdowns();
    updateAimHUD();
})();
