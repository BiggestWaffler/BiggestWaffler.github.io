(function () {
    'use strict';

    const SIZES = { small: 32, medium: 48, large: 64 };

    const mainMenu = document.getElementById('main-menu');
    const reactionScreen = document.getElementById('reaction-screen');
    const aimScreen = document.getElementById('aim-screen');
    const reactionZone = document.getElementById('reaction-zone');
    const reactionMessage = document.getElementById('reaction-message');
    const reactionLastEl = document.getElementById('reaction-last');
    const reactionAvgEl = document.getElementById('reaction-avg');
    const reactionCountEl = document.getElementById('reaction-count');

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

    // --- Navigation (Human Benchmark hub) ---

    function hideAllScreens() {
        [mainMenu, reactionScreen, aimScreen].forEach(function (el) {
            if (el) el.classList.remove('active');
        });
    }

    window.benchmark = {
        showMainMenu: function () {
            stopReaction();
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

    // --- Aim Trainer (embedded) ---

    let aimState = {
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
        if (!arena || !targetEl) return;
        const size = SIZES[aimState.targetSize] || SIZES.medium;
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
        targetEl.className = 'aimtrainer-target size-' + aimState.targetSize;
        targetEl.removeAttribute('aria-hidden');
        targetEl.style.display = '';
        aimState.spawnTime = performance.now();
    }

    function hideTarget() {
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
