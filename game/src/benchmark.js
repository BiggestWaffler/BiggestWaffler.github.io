(function () {
    'use strict';

    const SIZES = { small: 32, medium: 48, large: 64 };

    const mainMenu = document.getElementById('main-menu');
    const reactionScreen = document.getElementById('reaction-screen');
    const numberScreen = document.getElementById('number-screen');
    const cpsScreen = document.getElementById('cps-screen');
    const consistencyScreen = document.getElementById('consistency-screen');
    const pitchScreen = document.getElementById('pitch-screen');
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
    const aimClickStats = document.getElementById('aimClickStats');
    const aimFollowStats = document.getElementById('aimFollowStats');
    const holdTimeDisplay = document.getElementById('holdTimeDisplay');
    const followTimeLeftDisplay = document.getElementById('followTimeLeftDisplay');
    const aimStartOverlayText = document.getElementById('aimStartOverlayText');

    const consistencyDurationDropdown = document.getElementById('consistencyDurationDropdown');
    const consistencyZone = document.getElementById('consistency-zone');
    const consistencyStartBtn = document.getElementById('consistency-start-btn');
    const consistencyRunning = document.getElementById('consistency-running');
    const consistencyTapsEl = document.getElementById('consistency-taps');
    const consistencyTimeEl = document.getElementById('consistency-time');
    const consistencyBpmLiveEl = document.getElementById('consistency-bpm-live');
    const consistencyUrLiveEl = document.getElementById('consistency-ur-live');
    const consistencyStopBtn = document.getElementById('consistency-stop-btn');
    const consistencyResults = document.getElementById('consistency-results');
    const consistencyTapsResult = document.getElementById('consistency-taps-result');
    const consistencyDurationResult = document.getElementById('consistency-duration-result');
    const consistencyBpmResult = document.getElementById('consistency-bpm-result');
    const consistencyUrResult = document.getElementById('consistency-ur-result');
    const consistencyAgainBtn = document.getElementById('consistency-again-btn');
    const consistencySetKey1Btn = document.getElementById('consistency-set-key1');
    const consistencySetKey2Btn = document.getElementById('consistency-set-key2');
    const consistencyKey1Label = document.getElementById('consistency-key1-label');
    const consistencyKey2Label = document.getElementById('consistency-key2-label');
    const consistencyKey1Instr = document.getElementById('consistency-key1-instr');
    const consistencyKey2Instr = document.getElementById('consistency-key2-instr');

    const cpsDurationDropdown = document.getElementById('cpsDurationDropdown');
    const cpsZone = document.getElementById('cps-zone');
    const cpsStartBtn = document.getElementById('cps-start-btn');
    const cpsRunning = document.getElementById('cps-running');
    const cpsCountEl = document.getElementById('cps-count');
    const cpsTimeLeftEl = document.getElementById('cps-time-left');
    const cpsClickArea = document.getElementById('cps-click-area');
    const cpsResults = document.getElementById('cps-results');
    const cpsClicksResult = document.getElementById('cps-clicks-result');
    const cpsDurationResult = document.getElementById('cps-duration-result');
    const cpsCpsResult = document.getElementById('cps-cps-result');
    const cpsAgainBtn = document.getElementById('cps-again-btn');

    const pitchZone = document.getElementById('pitch-zone');
    const pitchMessage = document.getElementById('pitch-message');
    const pitchStartBtn = document.getElementById('pitch-start-btn');
    const pitchPlaying = document.getElementById('pitch-playing');
    const pitchReplayBtn = document.getElementById('pitch-replay-btn');
    const pitchGuessWrap = document.getElementById('pitch-guess-wrap');
    const pitchNotesEl = document.getElementById('pitch-notes');
    const pitchFeedback = document.getElementById('pitch-feedback');
    const pitchFeedbackText = document.getElementById('pitch-feedback-text');
    const pitchNextBtn = document.getElementById('pitch-next-btn');
    const pitchScoreEl = document.getElementById('pitch-score');
    const pitchRoundEl = document.getElementById('pitch-round');

    // --- Navigation (Human Benchmark hub) ---

    function hideAllScreens() {
        [mainMenu, reactionScreen, numberScreen, cpsScreen, consistencyScreen, pitchScreen, aimScreen].forEach(function (el) {
            if (el) el.classList.remove('active');
        });
    }

    window.benchmark = {
        showMainMenu: function () {
            stopReaction();
            stopNumberMemory();
            stopCps();
            stopConsistency();
            stopPitchTest();
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
            } else if (id === 'cps') {
                if (cpsScreen) cpsScreen.classList.add('active');
                initCps();
                renderCpsUI();
            } else if (id === 'consistency') {
                if (consistencyScreen) consistencyScreen.classList.add('active');
                initConsistency();
                renderConsistencyUI();
            } else if (id === 'pitch') {
                if (pitchScreen) pitchScreen.classList.add('active');
                initPitchTest();
                renderPitchUI();
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

    // --- CPS Test ---

    let cpsState = {
        phase: 'idle',
        clicks: 0,
        startTime: null,
        durationSec: 5,
        timerId: null
    };

    function initCps() {
        cpsState.phase = 'idle';
        cpsState.clicks = 0;
        cpsState.startTime = null;
        if (cpsState.timerId) {
            clearInterval(cpsState.timerId);
            cpsState.timerId = null;
        }
    }

    function stopCps() {
        if (cpsState.timerId) {
            clearInterval(cpsState.timerId);
            cpsState.timerId = null;
        }
        cpsState.phase = 'idle';
    }

    function renderCpsUI() {
        if (cpsStartBtn) cpsStartBtn.style.display = '';
        if (cpsRunning) cpsRunning.classList.add('cps-running--hidden');
        if (cpsResults) cpsResults.classList.add('cps-results--hidden');
    }

    function updateCpsTimer() {
        if (!cpsState.startTime || cpsState.phase !== 'running') return;
        var elapsed = (performance.now() - cpsState.startTime) / 1000;
        var left = Math.max(0, cpsState.durationSec - elapsed);
        if (cpsCountEl) cpsCountEl.textContent = cpsState.clicks;
        if (cpsTimeLeftEl) cpsTimeLeftEl.textContent = left.toFixed(1) + 's';
        if (left <= 0) endCpsTest();
    }

    function endCpsTest() {
        cpsState.phase = 'idle';
        if (cpsState.timerId) {
            clearInterval(cpsState.timerId);
            cpsState.timerId = null;
        }
        if (cpsStartBtn) cpsStartBtn.style.display = '';
        if (cpsRunning) cpsRunning.classList.add('cps-running--hidden');
        if (cpsResults) cpsResults.classList.remove('cps-results--hidden');

        var duration = cpsState.durationSec;
        var cps = duration > 0 ? (cpsState.clicks / duration).toFixed(1) : '0';
        if (cpsClicksResult) cpsClicksResult.textContent = cpsState.clicks;
        if (cpsDurationResult) cpsDurationResult.textContent = duration;
        if (cpsCpsResult) cpsCpsResult.textContent = cps;
    }

    function onCpsClick() {
        if (cpsState.phase !== 'running') return;
        cpsState.clicks++;
        if (cpsCountEl) cpsCountEl.textContent = cpsState.clicks;
    }

    function startCpsTest() {
        cpsState.phase = 'running';
        cpsState.clicks = 0;
        cpsState.durationSec = parseInt(getCustomSelectValue(cpsDurationDropdown), 10) || 5;
        cpsState.startTime = performance.now();
        cpsState.timerId = setInterval(updateCpsTimer, 50);

        if (cpsStartBtn) cpsStartBtn.style.display = 'none';
        if (cpsRunning) cpsRunning.classList.remove('cps-running--hidden');
        if (cpsCountEl) cpsCountEl.textContent = '0';
        if (cpsTimeLeftEl) cpsTimeLeftEl.textContent = cpsState.durationSec.toFixed(1) + 's';
        if (cpsZone) cpsZone.focus();
    }

    if (cpsStartBtn) {
        cpsStartBtn.addEventListener('click', function () {
            if (cpsState.phase !== 'idle') return;
            startCpsTest();
        });
    }
    if (cpsAgainBtn) {
        cpsAgainBtn.addEventListener('click', function () {
            initCps();
            renderCpsUI();
        });
    }
    if (cpsClickArea) {
        cpsClickArea.addEventListener('click', function (e) {
            e.stopPropagation();
            onCpsClick();
        });
    }
    if (cpsDurationDropdown) {
        (function initCpsDropdown() {
            var wrapper = cpsDurationDropdown;
            var trigger = wrapper.querySelector('.custom-select-trigger');
            var valueEl = wrapper.querySelector('.custom-select-value');
            var panel = wrapper.querySelector('.custom-select-panel');
            var options = wrapper.querySelectorAll('.custom-select-option');
            if (!trigger || !valueEl) return;
            function close() { wrapper.classList.remove('open'); wrapper.setAttribute('aria-expanded', 'false'); }
            function open() {
                document.querySelectorAll('.custom-select.open').forEach(function (o) { if (o !== wrapper) o.classList.remove('open'); });
                wrapper.classList.add('open'); wrapper.setAttribute('aria-expanded', 'true');
            }
            function select(opt) {
                var val = opt.getAttribute('data-value');
                var label = val + ' sec';
                wrapper.setAttribute('data-value', val);
                valueEl.textContent = label;
                options.forEach(function (o) { o.classList.remove('custom-select-option--selected'); });
                opt.classList.add('custom-select-option--selected');
                close();
            }
            trigger.addEventListener('click', function (ev) { ev.stopPropagation(); wrapper.classList.contains('open') ? close() : open(); });
            options.forEach(function (opt) { opt.addEventListener('click', function (ev) { ev.stopPropagation(); select(opt); }); });
            document.addEventListener('click', function () { if (wrapper.classList.contains('open')) close(); });
        })();
    }

    // --- Pitch Test ---

    const PITCH_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const PITCH_DURATION_MS = 800;
    const C3_HZ = 130.81;
    const PITCH_SEMITONES = 48;

    function getNoteFrequency(semitoneIndex) {
        return C3_HZ * Math.pow(2, semitoneIndex / 12);
    }

    let pitchAudioContext = null;

    function getPitchAudioContext() {
        if (!pitchAudioContext) {
            pitchAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return pitchAudioContext;
    }

    function playPitchNote(semitoneIndex) {
        const ctx = getPitchAudioContext();
        if (ctx.state === 'suspended') ctx.resume();
        const freq = getNoteFrequency(semitoneIndex);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + PITCH_DURATION_MS / 1000);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + PITCH_DURATION_MS / 1000);
    }

    let pitchState = {
        phase: 'idle',
        score: 0,
        round: 0,
        currentSemitoneIndex: null
    };

    function initPitchTest() {
        pitchState.phase = 'idle';
        pitchState.score = 0;
        pitchState.round = 0;
        pitchState.currentSemitoneIndex = null;
    }

    function stopPitchTest() {
        pitchState.phase = 'idle';
    }

    function renderPitchUI() {
        if (pitchStartBtn) pitchStartBtn.style.display = '';
        if (pitchPlaying) pitchPlaying.classList.add('pitch-playing--hidden');
        if (pitchGuessWrap) pitchGuessWrap.classList.add('pitch-guess-wrap--hidden');
        if (pitchFeedback) pitchFeedback.classList.add('pitch-feedback--hidden');
        if (pitchMessage) {
            pitchMessage.style.display = '';
            pitchMessage.textContent = 'Click Start to hear a note, then guess which one it is.';
        }
        if (pitchScoreEl) pitchScoreEl.textContent = pitchState.score;
        if (pitchRoundEl) pitchRoundEl.textContent = pitchState.round;
    }

    function buildPitchNoteButtons() {
        if (!pitchNotesEl) return;
        pitchNotesEl.innerHTML = '';
        PITCH_NOTES.forEach(function (name, index) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'pitch-note-btn';
            btn.textContent = name;
            btn.setAttribute('data-index', String(index));
            pitchNotesEl.appendChild(btn);
        });
    }

    function startPitchRound() {
        pitchState.round++;
        pitchState.currentSemitoneIndex = Math.floor(Math.random() * PITCH_SEMITONES);
        if (pitchStartBtn) pitchStartBtn.style.display = 'none';
        if (pitchMessage) pitchMessage.style.display = 'none';
        if (pitchPlaying) pitchPlaying.classList.remove('pitch-playing--hidden');
        if (pitchGuessWrap) pitchGuessWrap.classList.add('pitch-guess-wrap--hidden');
        if (pitchFeedback) pitchFeedback.classList.add('pitch-feedback--hidden');
        if (pitchRoundEl) pitchRoundEl.textContent = pitchState.round;
        playPitchNote(pitchState.currentSemitoneIndex);
        setTimeout(function () {
            showPitchGuess();
        }, PITCH_DURATION_MS + 300);
    }

    function showPitchGuess() {
        if (pitchPlaying) pitchPlaying.classList.add('pitch-playing--hidden');
        if (pitchGuessWrap) pitchGuessWrap.classList.remove('pitch-guess-wrap--hidden');
        buildPitchNoteButtons();
        const buttons = pitchNotesEl ? pitchNotesEl.querySelectorAll('.pitch-note-btn') : [];
        buttons.forEach(function (btn) {
            btn.addEventListener('click', onPitchGuess);
        });
    }

    function onPitchGuess(e) {
        const btn = e.target;
        if (!btn.classList.contains('pitch-note-btn')) return;
        const guessedIndex = parseInt(btn.getAttribute('data-index'), 10);
        const noteIndex = pitchState.currentSemitoneIndex % 12;
        const octave = 3 + Math.floor(pitchState.currentSemitoneIndex / 12);
        const correct = guessedIndex === noteIndex;
        if (correct) pitchState.score++;
        if (pitchScoreEl) pitchScoreEl.textContent = pitchState.score;

        if (pitchGuessWrap) pitchGuessWrap.classList.add('pitch-guess-wrap--hidden');
        if (pitchFeedback) pitchFeedback.classList.remove('pitch-feedback--hidden');
        if (pitchFeedbackText) {
            const noteName = PITCH_NOTES[noteIndex];
            pitchFeedbackText.textContent = correct
                ? 'Correct! It was ' + noteName + ' (octave ' + octave + ').'
                : 'Wrong. The note was ' + noteName + ' (octave ' + octave + ').';
        }
    }

    if (pitchStartBtn) {
        pitchStartBtn.addEventListener('click', function () {
            if (pitchState.phase !== 'idle') return;
            pitchState.phase = 'playing';
            startPitchRound();
        });
    }
    if (pitchReplayBtn) {
        pitchReplayBtn.addEventListener('click', function () {
            if (pitchState.currentSemitoneIndex !== null) {
                playPitchNote(pitchState.currentSemitoneIndex);
            }
        });
    }
    if (pitchNextBtn) {
        pitchNextBtn.addEventListener('click', function () {
            pitchState.phase = 'playing';
            startPitchRound();
        });
    }

    // --- Consistency Test ---

    function formatKeyCode(code) {
        if (!code) return '?';
        if (code.startsWith('Key')) return code.slice(3);
        if (code === 'Space') return 'Space';
        if (code.startsWith('Digit')) return code.slice(5);
        if (code.startsWith('Numpad')) return 'Num' + code.slice(6);
        return code;
    }

    let consistencyState = {
        phase: 'idle',
        tapTimestamps: [],
        startTime: null,
        durationSec: 10,
        timerId: null,
        key1Code: 'KeyZ',
        key2Code: 'KeyX',
        lastKeyUsed: null,
        listeningForKey: null
    };

    function initConsistency() {
        consistencyState.phase = 'idle';
        consistencyState.tapTimestamps = [];
        consistencyState.startTime = null;
        consistencyState.listeningForKey = null;
        if (consistencyState.timerId) {
            clearInterval(consistencyState.timerId);
            consistencyState.timerId = null;
        }
        updateConsistencyKeyLabels();
    }

    function updateConsistencyKeyLabels() {
        var k1 = formatKeyCode(consistencyState.key1Code);
        var k2 = formatKeyCode(consistencyState.key2Code);
        if (consistencyKey1Label) consistencyKey1Label.textContent = k1;
        if (consistencyKey2Label) consistencyKey2Label.textContent = k2;
        if (consistencyKey1Instr) consistencyKey1Instr.textContent = k1;
        if (consistencyKey2Instr) consistencyKey2Instr.textContent = k2;
    }

    function stopConsistency() {
        if (consistencyState.timerId) {
            clearInterval(consistencyState.timerId);
            consistencyState.timerId = null;
        }
        consistencyState.phase = 'idle';
    }

    function computeConsistencyStats() {
        const ts = consistencyState.tapTimestamps;
        if (ts.length < 2) return { bpm: 0, ur: 0, taps: ts.length, duration: 0 };
        const intervals = [];
        for (let i = 1; i < ts.length; i++) {
            intervals.push(ts[i] - ts[i - 1]);
        }
        const mean = intervals.reduce(function (a, b) { return a + b; }, 0) / intervals.length;
        const variance = intervals.reduce(function (sum, x) { return sum + (x - mean) * (x - mean); }, 0) / intervals.length;
        const stdDev = Math.sqrt(variance);
        /* BPM from 16th notes: 4 sixteenths per beat, so beat = 4 * mean_interval_ms → BPM = 60000/(4*mean) */
        const bpm = 15000 / mean;
        return {
            bpm: Math.round(bpm),
            ur: Math.round(stdDev * 10) / 10,
            taps: ts.length,
            duration: consistencyState.startTime ? (ts[ts.length - 1] - consistencyState.startTime) / 1000 : 0
        };
    }

    function renderConsistencyUI() {
        if (consistencyStartBtn) consistencyStartBtn.style.display = '';
        if (consistencyRunning) consistencyRunning.classList.add('consistency-running--hidden');
        if (consistencyResults) consistencyResults.classList.add('consistency-results--hidden');
    }

    function updateConsistencyLive() {
        if (!consistencyState.startTime || consistencyState.tapTimestamps.length === 0) return;
        const elapsed = (performance.now() - consistencyState.startTime) / 1000;
        if (consistencyTapsEl) consistencyTapsEl.textContent = consistencyState.tapTimestamps.length;
        if (consistencyTimeEl) consistencyTimeEl.textContent = elapsed.toFixed(1) + 's';
        if (consistencyState.tapTimestamps.length >= 2) {
            const s = computeConsistencyStats();
            if (consistencyBpmLiveEl) consistencyBpmLiveEl.textContent = s.bpm;
            if (consistencyUrLiveEl) consistencyUrLiveEl.textContent = s.ur;
        } else {
            if (consistencyBpmLiveEl) consistencyBpmLiveEl.textContent = '—';
            if (consistencyUrLiveEl) consistencyUrLiveEl.textContent = '—';
        }
    }

    function endConsistencyTest() {
        consistencyState.phase = 'idle';
        if (consistencyState.timerId) {
            clearInterval(consistencyState.timerId);
            consistencyState.timerId = null;
        }
        if (consistencyStartBtn) consistencyStartBtn.style.display = '';
        if (consistencyRunning) consistencyRunning.classList.add('consistency-running--hidden');
        if (consistencyResults) consistencyResults.classList.remove('consistency-results--hidden');

        const s = computeConsistencyStats();
        const durationSec = consistencyState.startTime && consistencyState.tapTimestamps.length > 0
            ? (consistencyState.tapTimestamps[consistencyState.tapTimestamps.length - 1] - consistencyState.startTime) / 1000
            : 0;
        if (consistencyTapsResult) consistencyTapsResult.textContent = s.taps;
        if (consistencyDurationResult) consistencyDurationResult.textContent = durationSec.toFixed(1);
        if (consistencyBpmResult) consistencyBpmResult.textContent = s.bpm;
        if (consistencyUrResult) consistencyUrResult.textContent = s.ur;
    }

    function onConsistencyTap(keyNum) {
        if (consistencyState.phase !== 'running') return;
        if (consistencyState.lastKeyUsed === keyNum) return;
        consistencyState.lastKeyUsed = keyNum;
        const now = performance.now();
        if (consistencyState.tapTimestamps.length === 0) {
            consistencyState.startTime = now;
            if (consistencyStartBtn) consistencyStartBtn.style.display = 'none';
            if (consistencyRunning) consistencyRunning.classList.remove('consistency-running--hidden');
            if (consistencyState.durationSec > 0) {
                consistencyState.timerId = setInterval(function () {
                    if (performance.now() - consistencyState.startTime >= consistencyState.durationSec * 1000) {
                        endConsistencyTest();
                    } else {
                        updateConsistencyLive();
                    }
                }, 100);
            }
        }
        consistencyState.tapTimestamps.push(now);
        updateConsistencyLive();
    }

    function startConsistencyTest() {
        consistencyState.phase = 'running';
        consistencyState.tapTimestamps = [];
        consistencyState.startTime = null;
        consistencyState.lastKeyUsed = null;
        consistencyState.durationSec = parseInt(getCustomSelectValue(consistencyDurationDropdown), 10) || 0;
        renderConsistencyUI();
        if (consistencyStartBtn) consistencyStartBtn.style.display = 'none';
        if (consistencyRunning) consistencyRunning.classList.remove('consistency-running--hidden');
        if (consistencyTapsEl) consistencyTapsEl.textContent = '0';
        if (consistencyTimeEl) consistencyTimeEl.textContent = '0.0s';
        if (consistencyBpmLiveEl) consistencyBpmLiveEl.textContent = '—';
        if (consistencyUrLiveEl) consistencyUrLiveEl.textContent = '—';
        if (consistencyZone) consistencyZone.focus();
    }

    if (consistencyStartBtn) {
        consistencyStartBtn.addEventListener('click', function () {
            if (consistencyState.phase !== 'idle') return;
            startConsistencyTest();
        });
    }
    if (consistencyStopBtn) {
        consistencyStopBtn.addEventListener('click', endConsistencyTest);
    }
    if (consistencyAgainBtn) {
        consistencyAgainBtn.addEventListener('click', function () {
            initConsistency();
            renderConsistencyUI();
        });
    }
    if (consistencyZone) {
        consistencyZone.addEventListener('click', function (e) {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
        });
    }
    document.addEventListener('keydown', function (e) {
        if (consistencyState.listeningForKey) {
            e.preventDefault();
            var code = e.code;
            if (consistencyState.listeningForKey === 1) {
                if (code === consistencyState.key2Code) consistencyState.key2Code = 'KeyX';
                consistencyState.key1Code = code;
            } else {
                if (code === consistencyState.key1Code) consistencyState.key1Code = 'KeyZ';
                consistencyState.key2Code = code;
            }
            consistencyState.listeningForKey = null;
            updateConsistencyKeyLabels();
            if (consistencySetKey1Btn) consistencySetKey1Btn.classList.remove('consistency-key-btn--listening');
            if (consistencySetKey2Btn) consistencySetKey2Btn.classList.remove('consistency-key-btn--listening');
            return;
        }
        if (consistencyState.phase !== 'running') return;
        if (e.repeat) return;
        if (e.code === consistencyState.key1Code) {
            if (consistencyState.lastKeyUsed === 2 || consistencyState.lastKeyUsed === null) {
                e.preventDefault();
                onConsistencyTap(1);
            }
            return;
        }
        if (e.code === consistencyState.key2Code) {
            if (consistencyState.lastKeyUsed === 1 || consistencyState.lastKeyUsed === null) {
                e.preventDefault();
                onConsistencyTap(2);
            }
        }
    });
    if (consistencySetKey1Btn) {
        consistencySetKey1Btn.addEventListener('click', function () {
            if (consistencyState.phase !== 'idle') return;
            consistencyState.listeningForKey = 1;
            consistencySetKey1Btn.classList.add('consistency-key-btn--listening');
            consistencySetKey2Btn.classList.remove('consistency-key-btn--listening');
        });
    }
    if (consistencySetKey2Btn) {
        consistencySetKey2Btn.addEventListener('click', function () {
            if (consistencyState.phase !== 'idle') return;
            consistencyState.listeningForKey = 2;
            consistencySetKey2Btn.classList.add('consistency-key-btn--listening');
            consistencySetKey1Btn.classList.remove('consistency-key-btn--listening');
        });
    }
    if (consistencyDurationDropdown) {
        (function initConsistencyDropdown() {
            var wrapper = consistencyDurationDropdown;
            var trigger = wrapper.querySelector('.custom-select-trigger');
            var valueEl = wrapper.querySelector('.custom-select-value');
            var panel = wrapper.querySelector('.custom-select-panel');
            var options = wrapper.querySelectorAll('.custom-select-option');
            if (!trigger || !valueEl) return;
            function close() { wrapper.classList.remove('open'); wrapper.setAttribute('aria-expanded', 'false'); }
            function open() {
                document.querySelectorAll('.custom-select.open').forEach(function (o) { if (o !== wrapper) o.classList.remove('open'); });
                wrapper.classList.add('open'); wrapper.setAttribute('aria-expanded', 'true');
            }
            function select(opt) {
                var val = opt.getAttribute('data-value');
                var label = opt.textContent.trim();
                if (val === '0') label = 'Until stop';
                else label = val + ' sec';
                wrapper.setAttribute('data-value', val);
                valueEl.textContent = label;
                options.forEach(function (o) { o.classList.remove('custom-select-option--selected'); });
                opt.classList.add('custom-select-option--selected');
                close();
            }
            trigger.addEventListener('click', function (ev) { ev.stopPropagation(); wrapper.classList.contains('open') ? close() : open(); });
            options.forEach(function (opt) { opt.addEventListener('click', function (ev) { ev.stopPropagation(); select(opt); }); });
            document.addEventListener('click', function () { if (wrapper.classList.contains('open')) close(); });
        })();
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
        followMode: false,
        spawnTime: 0,
        roundStartTime: 0,
        timerId: null,
        trackX: 0,
        trackY: 0,
        trackVx: 0,
        trackVy: 0,
        trackChangeAt: 0,
        trackRAF: null,
        trackLastTime: 0,
        holdTime: 0,
        followRoundEndTime: null,
        cursorX: null,
        cursorY: null
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

        if (aimState.followMode) {
            if (aimState.cursorX !== null && aimState.cursorY !== null && isClickOnTarget(aimState.cursorX, aimState.cursorY)) {
                aimState.holdTime += dt / 1000;
            }
            if (aimState.followRoundEndTime !== null && timestamp >= aimState.followRoundEndTime) {
                endFollowRound();
            }
        }
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

        if (aimState.trackingMode || aimState.followMode) {
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
        if (aimState.followMode) {
            if (holdTimeDisplay) holdTimeDisplay.textContent = aimState.holdTime.toFixed(1) + 's';
            if (followTimeLeftDisplay) {
                if (aimState.followRoundEndTime !== null) {
                    const left = (aimState.followRoundEndTime - performance.now()) / 1000;
                    followTimeLeftDisplay.textContent = left > 0 ? left.toFixed(1) + 's' : '0s';
                } else {
                    followTimeLeftDisplay.textContent = '∞';
                }
            }
        } else {
            if (timerDisplay) {
                const elapsed = (performance.now() - aimState.roundStartTime) / 1000;
                timerDisplay.textContent = elapsed.toFixed(1) + 's';
            }
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

    function endFollowRound() {
        aimState.active = false;
        if (aimState.timerId) {
            clearInterval(aimState.timerId);
            aimState.timerId = null;
        }
        hideTarget();
        const hold = aimState.holdTime.toFixed(1);
        let msg;
        if (aimState.followRoundEndTime !== null && aimState.roundStartTime) {
            const totalSec = (aimState.followRoundEndTime - aimState.roundStartTime) / 1000;
            const pct = totalSec > 0 ? Math.round((aimState.holdTime / totalSec) * 100) : 0;
            msg = 'Time on target: <strong>' + hold + 's</strong> out of <strong>' + totalSec.toFixed(0) + 's</strong><br>Accuracy: <strong>' + pct + '%</strong>';
        } else {
            msg = 'Time on target: <strong>' + hold + 's</strong>';
        }
        if (roundStatsEl) roundStatsEl.innerHTML = msg;
        if (roundOverlay) roundOverlay.classList.remove('aimtrainer-overlay--hidden');
        if (startBtn) startBtn.textContent = 'Start';
    }

    function onArenaClick(e) {
        if (!aimState.active || !targetEl || targetEl.style.display === 'none') return;
        if (aimState.followMode) return;

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
        const mode = getCustomSelectValue(aimModeDropdown) || 'static';
        aimState.hits = 0;
        aimState.misses = 0;
        aimState.reactionTimes = [];
        aimState.roundLength = parseInt(getCustomSelectValue(roundLengthDropdown), 10) || 0;
        aimState.targetSize = getCustomSelectValue(targetSizeDropdown) || 'medium';
        aimState.trackingMode = (mode === 'tracking' || mode === 'follow');
        aimState.followMode = (mode === 'follow');
        aimState.holdTime = 0;
        aimState.cursorX = null;
        aimState.cursorY = null;
        aimState.active = true;
        aimState.roundStartTime = performance.now();
        aimState.followRoundEndTime = aimState.followMode && aimState.roundLength > 0
            ? aimState.roundStartTime + aimState.roundLength * 1000
            : null;
        aimState.timerId = setInterval(updateAimTimer, 100);

        if (aimClickStats) aimClickStats.style.display = aimState.followMode ? 'none' : '';
        if (aimFollowStats) aimFollowStats.classList.toggle('aim-follow-stats--hidden', !aimState.followMode);
        if (aimStartOverlayText) {
            aimStartOverlayText.innerHTML = aimState.followMode
                ? 'Keep your cursor on the target for as long as possible!<br>Round length = <strong>' + (aimState.roundLength > 0 ? aimState.roundLength + ' sec' : 'Endless') + '</strong>.'
                : 'Click <strong>Start</strong> to begin.<br>Click each target as fast as you can!';
        }
        if (startOverlay) startOverlay.classList.add('aimtrainer-overlay--hidden');
        if (roundOverlay) roundOverlay.classList.add('aimtrainer-overlay--hidden');
        if (startBtn) startBtn.textContent = 'Restart';
        updateAimHUD();
        if (timerDisplay) timerDisplay.textContent = '0.0s';
        if (holdTimeDisplay) holdTimeDisplay.textContent = '0.0s';
        if (followTimeLeftDisplay) followTimeLeftDisplay.textContent = aimState.roundLength > 0 ? aimState.roundLength + 's' : '∞';
        spawnTarget();
        if (arena) arena.focus();
    }

    function stopAimTrainer() {
        if (aimState.followMode && aimState.active) {
            endFollowRound();
            if (aimClickStats) aimClickStats.style.display = '';
            if (aimFollowStats) aimFollowStats.classList.add('aim-follow-stats--hidden');
            return;
        }
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
        arena.addEventListener('mousemove', function (e) {
            aimState.cursorX = e.clientX;
            aimState.cursorY = e.clientY;
        });
        arena.addEventListener('mouseleave', function () {
            aimState.cursorX = null;
            aimState.cursorY = null;
        });
        arena.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && aimState.active) {
                stopAimTrainer();
            }
        });
    }

    initAimTrainerDropdowns();
    updateAimHUD();
})();
