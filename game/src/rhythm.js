(function () {
    'use strict';

    const PLAYFIELD_HEIGHT = 420;
    const PLAYFIELD_WIDTH = 248;
    /* Preview board in customize UI is 400×677; scale font sizes so judge/combo match relative size in game */
    const PREVIEW_BOARD_SCALE = 400 / PLAYFIELD_WIDTH;
    const NOTE_SIZE = 48;
    const RECEPTOR_SIZE = 52;
    const PERFECT_MS = 50;
    const GREAT_MS = 100;
    const GOOD_MS = 150;
    const STORAGE_KEY = 'rhythm4k_settings';

    const defaultKeybinds = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'];

    function getDefaultState() {
        return {
            keybinds: [...defaultKeybinds],
            scrollSpeed: 20,
            skin: 'circle',
            judgeVisible: true,
            judgeX: 50,
            judgeY: 48,
            judgeSize: 22,
            comboVisible: true,
            comboX: 50,
            comboY: 56,
            comboSize: 20,
            unstableBarVisible: true,
            unstableBarX: 50,
            unstableBarY: 64,
            unstableBarWidth: 24,
            scoreVisible: true,
            scoreSize: 14,
            accuracyVisible: true,
            accuracySize: 16,
            timerVisible: true,
            timerSize: 16,
            receptorPulse: true,
            receptorLight: true,
            notesPerSecond: 8,
            gameStyle: 'stream',
            gameDurationSec: 60,
            snapToCenter: false,
            listeningLane: null
        };
    }

    function getDefaultLayout() {
        return {
            judgeVisible: true,
            judgeX: 50,
            judgeY: 48,
            judgeSize: 22,
            comboVisible: true,
            comboX: 50,
            comboY: 56,
            comboSize: 20,
            unstableBarVisible: true,
            unstableBarX: 50,
            unstableBarY: 64,
            unstableBarWidth: 24,
            scoreVisible: true,
            scoreSize: 14,
            accuracyVisible: true,
            accuracySize: 16,
            timerVisible: true,
            timerSize: 16
        };
    }

    function keyToDisplay(code) {
        if (code.startsWith('Key')) return code.slice(3);
        if (code.startsWith('Digit')) return code.slice(5);
        if (code.startsWith('Numpad')) return 'Num' + code.slice(6);
        return code.length === 1 ? code : code;
    }

    let state = getDefaultState();

    let gameState = null;
    let keyToLane = {};
    let rafId = null;
    const keysHeld = new Set();

    const menu = document.getElementById('menu');
    const gameContainer = document.getElementById('gameContainer');
    const topbarEl = document.querySelector('.topbar');
    const lanesEl = document.getElementById('lanes');
    const scoreEl = document.getElementById('score');
    const comboEl = document.getElementById('combo');
    const judgeEl = document.getElementById('judge');
    const judgeWrapEl = document.querySelector('.judge-wrap');
    const gameplayUICustomizeOverlay = document.getElementById('gameplayUICustomizeOverlay');
    const judgePreviewBoard = document.getElementById('judgePreviewBoard');
    const judgePreviewDraggable = document.getElementById('judgePreviewDraggable');
    const comboPreviewDraggable = document.getElementById('comboPreviewDraggable');
    const judgeVisibleCheck = document.getElementById('judgeVisibleCheck');
    const judgeSizeSlider = document.getElementById('judgeSizeSlider');
    const judgeSizeValue = document.getElementById('judgeSizeValue');
    const comboVisibleCheck = document.getElementById('comboVisibleCheck');
    const comboSizeSlider = document.getElementById('comboSizeSlider');
    const comboSizeValue = document.getElementById('comboSizeValue');
    const scoreVisibleCheck = document.getElementById('scoreVisibleCheck');
    const scoreSizeSlider = document.getElementById('scoreSizeSlider');
    const scoreSizeValue = document.getElementById('scoreSizeValue');
    const previewScoreEl = document.getElementById('previewScore');
    const accuracyVisibleCheck = document.getElementById('accuracyVisibleCheck');
    const accuracySizeSlider = document.getElementById('accuracySizeSlider');
    const accuracySizeValue = document.getElementById('accuracySizeValue');
    const timerVisibleCheck = document.getElementById('timerVisibleCheck');
    const timerSizeSlider = document.getElementById('timerSizeSlider');
    const timerSizeValue = document.getElementById('timerSizeValue');
    const previewAccuracyEl = document.getElementById('previewAccuracy');
    const previewTimerEl = document.getElementById('previewTimer');
    const customizeGameplayUIBtn = document.getElementById('customizeGameplayUIBtn');
    const gameplayUICustomizeDone = document.getElementById('gameplayUICustomizeDone');
    const resetLayoutBtn = document.getElementById('resetLayoutBtn');
    const snapToCenterCheck = document.getElementById('snapToCenterCheck');
    const comboWrapEl = document.getElementById('comboWrap');
    const unstableBarWrapEl = document.getElementById('unstableBarWrap');
    const unstableBarTicksEl = document.getElementById('unstableBarTicks');
    const unstableBarPreviewEl = document.getElementById('unstableBarPreview');
    const unstableBarVisibleCheck = document.getElementById('unstableBarVisibleCheck');
    const unstableBarWidthSlider = document.getElementById('unstableBarWidthSlider');
    const unstableBarWidthValue = document.getElementById('unstableBarWidthValue');
    const scoreWrapEl = document.getElementById('scoreWrap');
    const accuracyWrapEl = document.getElementById('accuracyWrap');
    const timerWrapEl = document.getElementById('timerWrap');
    const resultsEl = document.getElementById('results');
    const scrollSpeedInput = document.getElementById('scrollSpeed');
    const scrollSpeedValue = document.getElementById('scrollSpeedValue');
    const notesPerSecondInput = document.getElementById('notesPerSecond');
    const notesPerSecondValue = document.getElementById('notesPerSecondValue');
    const gameDurationInput = document.getElementById('gameDuration');
    const gameDurationValue = document.getElementById('gameDurationValue');
    const playfieldScalerEl = document.getElementById('playfieldScaler');
    const timerEl = document.getElementById('timer');
    const timerTotalEl = document.getElementById('timerTotal');
    const accuracyEl = document.getElementById('accuracy');
    const pauseOverlayEl = document.getElementById('pauseOverlay');
    const pauseContinueBtn = document.getElementById('pauseContinue');
    const pauseMenuBtn = document.getElementById('pauseMenu');

    function loadSettings() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const saved = JSON.parse(raw);
                if (saved.keybinds && saved.keybinds.length === 4) state.keybinds = saved.keybinds;
                if (typeof saved.scrollSpeed === 'number' && saved.scrollSpeed >= 5) state.scrollSpeed = saved.scrollSpeed;
                if (saved.skin === 'circle' || saved.skin === 'square') state.skin = saved.skin;
                if (typeof saved.judgeVisible === 'boolean') state.judgeVisible = saved.judgeVisible;
                if (typeof saved.judgeX === 'number' && saved.judgeX >= 0 && saved.judgeX <= 100) state.judgeX = saved.judgeX;
                if (typeof saved.judgeY === 'number' && saved.judgeY >= 0 && saved.judgeY <= 100) state.judgeY = saved.judgeY;
                if (typeof saved.judgeSize === 'number' && saved.judgeSize >= 12 && saved.judgeSize <= 36) state.judgeSize = saved.judgeSize;
                if (typeof saved.comboVisible === 'boolean') state.comboVisible = saved.comboVisible;
                if (typeof saved.comboX === 'number' && saved.comboX >= 0 && saved.comboX <= 100) state.comboX = saved.comboX;
                if (typeof saved.comboY === 'number' && saved.comboY >= 0 && saved.comboY <= 100) state.comboY = saved.comboY;
                if (typeof saved.comboSize === 'number' && saved.comboSize >= 14 && saved.comboSize <= 32) state.comboSize = saved.comboSize;
                if (typeof saved.unstableBarVisible === 'boolean') state.unstableBarVisible = saved.unstableBarVisible;
                if (typeof saved.unstableBarX === 'number' && saved.unstableBarX >= 0 && saved.unstableBarX <= 100) state.unstableBarX = saved.unstableBarX;
                if (typeof saved.unstableBarY === 'number' && saved.unstableBarY >= 0 && saved.unstableBarY <= 100) state.unstableBarY = saved.unstableBarY;
                if (typeof saved.unstableBarWidth === 'number' && saved.unstableBarWidth >= 15 && saved.unstableBarWidth <= 40) state.unstableBarWidth = saved.unstableBarWidth;
                if (typeof saved.scoreVisible === 'boolean') state.scoreVisible = saved.scoreVisible;
                if (typeof saved.scoreSize === 'number' && saved.scoreSize >= 12 && saved.scoreSize <= 24) state.scoreSize = saved.scoreSize;
                if (typeof saved.accuracyVisible === 'boolean') state.accuracyVisible = saved.accuracyVisible;
                if (typeof saved.accuracySize === 'number' && saved.accuracySize >= 12 && saved.accuracySize <= 24) state.accuracySize = saved.accuracySize;
                if (typeof saved.timerVisible === 'boolean') state.timerVisible = saved.timerVisible;
                if (typeof saved.timerSize === 'number' && saved.timerSize >= 12 && saved.timerSize <= 24) state.timerSize = saved.timerSize;
                if (typeof saved.receptorPulse === 'boolean') state.receptorPulse = saved.receptorPulse;
                if (typeof saved.receptorLight === 'boolean') state.receptorLight = saved.receptorLight;
                if (typeof saved.snapToCenter === 'boolean') state.snapToCenter = saved.snapToCenter;
            }
        } catch (_) {}
    }

    function saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                keybinds: state.keybinds,
                scrollSpeed: state.scrollSpeed,
                skin: state.skin,
                judgeVisible: state.judgeVisible,
                judgeX: state.judgeX,
                judgeY: state.judgeY,
                judgeSize: state.judgeSize,
                comboVisible: state.comboVisible,
                comboX: state.comboX,
                comboY: state.comboY,
                comboSize: state.comboSize,
                unstableBarVisible: state.unstableBarVisible,
                unstableBarX: state.unstableBarX,
                unstableBarY: state.unstableBarY,
                unstableBarWidth: state.unstableBarWidth,
                scoreVisible: state.scoreVisible,
                scoreSize: state.scoreSize,
                accuracyVisible: state.accuracyVisible,
                accuracySize: state.accuracySize,
                timerVisible: state.timerVisible,
                timerSize: state.timerSize,
                receptorPulse: state.receptorPulse,
                receptorLight: state.receptorLight,
                snapToCenter: state.snapToCenter
            }));
        } catch (_) {}
    }

    function buildKeyToLane() {
        keyToLane = {};
        state.keybinds.forEach((code, i) => { keyToLane[code] = i; });
    }

    function applyStateToMenuUI() {
        buildKeyToLane();
        document.querySelectorAll('.keybind-btn').forEach((btn, i) => {
            btn.textContent = keyToDisplay(state.keybinds[i]);
        });
        scrollSpeedInput.value = state.scrollSpeed;
        scrollSpeedValue.textContent = state.scrollSpeed;
        document.querySelectorAll('.skin-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.skin === state.skin);
        });
        const receptorLightCheck = document.getElementById('receptorLightCheck');
        const receptorPulseCheck = document.getElementById('receptorPulseCheck');
        if (receptorLightCheck) receptorLightCheck.checked = state.receptorLight;
        if (receptorPulseCheck) receptorPulseCheck.checked = state.receptorPulse;
        notesPerSecondInput.value = state.notesPerSecond;
        notesPerSecondValue.textContent = state.notesPerSecond;
        gameDurationInput.value = state.gameDurationSec;
        gameDurationValue.textContent = formatDuration(state.gameDurationSec);
        document.querySelectorAll('.style-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.style === state.gameStyle);
        });
        updateReceptorSkin();
    }

    function initUI() {
        loadSettings();
        buildKeyToLane();

        document.querySelectorAll('.keybind-btn').forEach(btn => {
            const lane = parseInt(btn.dataset.lane, 10);
            btn.textContent = keyToDisplay(state.keybinds[lane]);
            btn.addEventListener('click', () => startListening(lane));
        });

        scrollSpeedInput.value = state.scrollSpeed;
        scrollSpeedValue.textContent = state.scrollSpeed;
        scrollSpeedInput.addEventListener('input', () => {
            state.scrollSpeed = parseFloat(scrollSpeedInput.value);
            scrollSpeedValue.textContent = state.scrollSpeed;
            saveSettings();
        });

        document.querySelectorAll('.skin-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.skin === state.skin);
            btn.addEventListener('click', () => {
                state.skin = btn.dataset.skin;
                document.querySelectorAll('.skin-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                saveSettings();
                updateReceptorSkin();
            });
        });

        if (customizeGameplayUIBtn) customizeGameplayUIBtn.addEventListener('click', openGameplayUICustomize);
        if (gameplayUICustomizeDone) gameplayUICustomizeDone.addEventListener('click', closeGameplayUICustomize);
        if (gameplayUICustomizeOverlay) {
            gameplayUICustomizeOverlay.addEventListener('click', function (e) {
                if (e.target === gameplayUICustomizeOverlay) closeGameplayUICustomize();
            });
        }
        document.querySelectorAll('.gameplay-ui-tab').forEach(tab => {
            tab.addEventListener('click', function () {
                const panelId = this.dataset.panel;
                if (!panelId) return;
                document.querySelectorAll('.gameplay-ui-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.gameplay-ui-panel').forEach(p => p.classList.remove('active'));
                this.classList.add('active');
                const panel = document.getElementById('panel-' + panelId);
                if (panel) panel.classList.add('active');
            });
        });
        applyJudgeStyle();
        applyGameplayUIStyle();

        const receptorLightCheck = document.getElementById('receptorLightCheck');
        const receptorPulseCheck = document.getElementById('receptorPulseCheck');
        if (receptorLightCheck) {
            receptorLightCheck.checked = state.receptorLight;
            receptorLightCheck.addEventListener('change', () => {
                state.receptorLight = receptorLightCheck.checked;
                saveSettings();
            });
        }
        if (receptorPulseCheck) {
            receptorPulseCheck.checked = state.receptorPulse;
            receptorPulseCheck.addEventListener('change', () => {
                state.receptorPulse = receptorPulseCheck.checked;
                saveSettings();
            });
        }

        document.querySelectorAll('.style-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.style === state.gameStyle);
            btn.addEventListener('click', () => {
                state.gameStyle = btn.dataset.style;
                document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        notesPerSecondInput.value = state.notesPerSecond;
        notesPerSecondValue.textContent = state.notesPerSecond;
        notesPerSecondInput.addEventListener('input', () => {
            state.notesPerSecond = parseInt(notesPerSecondInput.value, 10);
            notesPerSecondValue.textContent = state.notesPerSecond;
        });

        gameDurationInput.value = state.gameDurationSec;
        gameDurationValue.textContent = formatDuration(state.gameDurationSec);
        gameDurationInput.addEventListener('input', () => {
            state.gameDurationSec = parseInt(gameDurationInput.value, 10);
            gameDurationValue.textContent = formatDuration(state.gameDurationSec);
        });

        document.querySelector('.start-btn').addEventListener('click', startGame);
        document.querySelector('.back-btn').addEventListener('click', backToMenu);

        const resetToDefaultBtn = document.getElementById('resetToDefaultBtn');
        if (resetToDefaultBtn) {
            resetToDefaultBtn.addEventListener('click', function () {
                Object.assign(state, getDefaultState());
                saveSettings();
                applyStateToMenuUI();
                applyJudgeStyle();
                applyGameplayUIStyle();
            });
        }
        if (pauseContinueBtn) pauseContinueBtn.addEventListener('click', () => setPaused(false));
        if (pauseMenuBtn) pauseMenuBtn.addEventListener('click', backToMenu);

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        updateReceptorSkin();
        updateKeyHints();
    }

    function updateReceptorSkin() {
        document.querySelectorAll('.receptor').forEach(el => {
            el.dataset.skin = state.skin;
        });
    }

    function applyJudgeStyle() {
        if (!judgeEl) return;
        judgeEl.style.left = state.judgeX + '%';
        judgeEl.style.top = state.judgeY + '%';
        judgeEl.style.fontSize = state.judgeSize + 'px';
        if (judgeWrapEl) {
            judgeWrapEl.classList.toggle('hidden', !state.judgeVisible);
        }
    }

    function applyGameplayUIStyle() {
        if (comboWrapEl) {
            comboWrapEl.classList.toggle('hidden', !state.comboVisible);
            const comboNum = comboWrapEl.querySelector('.combo-number');
            if (comboNum) {
                comboNum.style.left = state.comboX + '%';
                comboNum.style.top = state.comboY + '%';
                comboNum.style.fontSize = state.comboSize + 'px';
            }
        }
        if (unstableBarWrapEl) {
            unstableBarWrapEl.classList.toggle('hidden', !state.unstableBarVisible);
            unstableBarWrapEl.style.left = state.unstableBarX + '%';
            unstableBarWrapEl.style.top = state.unstableBarY + '%';
            unstableBarWrapEl.style.width = state.unstableBarWidth + '%';
            unstableBarWrapEl.style.height = '6px';
        }
        if (scoreWrapEl) {
            scoreWrapEl.classList.toggle('hidden', !state.scoreVisible);
            const hudScore = scoreWrapEl.querySelector('.hud-score');
            if (hudScore) hudScore.style.fontSize = state.scoreSize + 'px';
        }
        if (accuracyWrapEl) {
            accuracyWrapEl.classList.toggle('hidden', !state.accuracyVisible);
            accuracyWrapEl.style.fontSize = state.accuracySize + 'px';
        }
        if (timerWrapEl) {
            timerWrapEl.classList.toggle('hidden', !state.timerVisible);
            timerWrapEl.style.fontSize = state.timerSize + 'px';
        }
    }

    let judgeDragStart = null;
    let comboDragStart = null;
    let unstableBarDragStart = null;

    function openGameplayUICustomize() {
        if (!gameplayUICustomizeOverlay || !judgePreviewBoard) return;
        if (gameplayUICustomizeOverlay._cleanup) gameplayUICustomizeOverlay._cleanup();

        judgeVisibleCheck.checked = state.judgeVisible;
        judgeSizeSlider.value = state.judgeSize;
        judgeSizeValue.textContent = state.judgeSize;
        judgePreviewDraggable.style.left = state.judgeX + '%';
        judgePreviewDraggable.style.top = state.judgeY + '%';
        judgePreviewDraggable.style.fontSize = Math.round(state.judgeSize * PREVIEW_BOARD_SCALE) + 'px';

        comboVisibleCheck.checked = state.comboVisible;
        comboSizeSlider.value = state.comboSize;
        comboSizeValue.textContent = state.comboSize;
        if (comboPreviewDraggable) {
            comboPreviewDraggable.style.left = state.comboX + '%';
            comboPreviewDraggable.style.top = state.comboY + '%';
            comboPreviewDraggable.style.fontSize = Math.round(state.comboSize * PREVIEW_BOARD_SCALE) + 'px';
        }

        unstableBarVisibleCheck.checked = state.unstableBarVisible;
        unstableBarWidthSlider.value = state.unstableBarWidth;
        unstableBarWidthValue.textContent = state.unstableBarWidth;
        if (unstableBarPreviewEl) {
            unstableBarPreviewEl.style.left = state.unstableBarX + '%';
            unstableBarPreviewEl.style.top = state.unstableBarY + '%';
            unstableBarPreviewEl.style.width = state.unstableBarWidth + '%';
            unstableBarPreviewEl.style.height = '6px';
        }

        scoreVisibleCheck.checked = state.scoreVisible;
        scoreSizeSlider.value = state.scoreSize;
        scoreSizeValue.textContent = state.scoreSize;
        if (previewScoreEl) previewScoreEl.style.fontSize = state.scoreSize + 'px';

        accuracyVisibleCheck.checked = state.accuracyVisible;
        accuracySizeSlider.value = state.accuracySize;
        accuracySizeValue.textContent = state.accuracySize;
        if (previewAccuracyEl) previewAccuracyEl.style.fontSize = state.accuracySize + 'px';

        timerVisibleCheck.checked = state.timerVisible;
        timerSizeSlider.value = state.timerSize;
        timerSizeValue.textContent = state.timerSize;
        if (previewTimerEl) previewTimerEl.style.fontSize = state.timerSize + 'px';

        if (snapToCenterCheck) snapToCenterCheck.checked = state.snapToCenter;

        if (resetLayoutBtn) {
            resetLayoutBtn.onclick = function () {
                const layout = getDefaultLayout();
                Object.assign(state, layout);
                judgeVisibleCheck.checked = state.judgeVisible;
                judgeSizeSlider.value = state.judgeSize;
                judgeSizeValue.textContent = state.judgeSize;
                judgePreviewDraggable.style.left = state.judgeX + '%';
                judgePreviewDraggable.style.top = state.judgeY + '%';
                judgePreviewDraggable.style.fontSize = Math.round(state.judgeSize * PREVIEW_BOARD_SCALE) + 'px';
                comboVisibleCheck.checked = state.comboVisible;
                comboSizeSlider.value = state.comboSize;
                comboSizeValue.textContent = state.comboSize;
                if (comboPreviewDraggable) {
                    comboPreviewDraggable.style.left = state.comboX + '%';
                    comboPreviewDraggable.style.top = state.comboY + '%';
                    comboPreviewDraggable.style.fontSize = Math.round(state.comboSize * PREVIEW_BOARD_SCALE) + 'px';
                }
                unstableBarVisibleCheck.checked = state.unstableBarVisible;
                unstableBarWidthSlider.value = state.unstableBarWidth;
                unstableBarWidthValue.textContent = state.unstableBarWidth;
                if (unstableBarPreviewEl) {
                    unstableBarPreviewEl.style.left = state.unstableBarX + '%';
                    unstableBarPreviewEl.style.top = state.unstableBarY + '%';
                    unstableBarPreviewEl.style.width = state.unstableBarWidth + '%';
                }
                scoreVisibleCheck.checked = state.scoreVisible;
                scoreSizeSlider.value = state.scoreSize;
                scoreSizeValue.textContent = state.scoreSize;
                if (previewScoreEl) previewScoreEl.style.fontSize = state.scoreSize + 'px';
                accuracyVisibleCheck.checked = state.accuracyVisible;
                accuracySizeSlider.value = state.accuracySize;
                accuracySizeValue.textContent = state.accuracySize;
                if (previewAccuracyEl) previewAccuracyEl.style.fontSize = state.accuracySize + 'px';
                timerVisibleCheck.checked = state.timerVisible;
                timerSizeSlider.value = state.timerSize;
                timerSizeValue.textContent = state.timerSize;
                if (previewTimerEl) previewTimerEl.style.fontSize = state.timerSize + 'px';
                saveSettings();
            };
        }

        gameplayUICustomizeOverlay.style.display = 'flex';

        judgeSizeSlider.oninput = function () {
            const size = parseInt(judgeSizeSlider.value, 10);
            state.judgeSize = size;
            judgeSizeValue.textContent = size;
            judgePreviewDraggable.style.fontSize = Math.round(size * PREVIEW_BOARD_SCALE) + 'px';
        };
        comboSizeSlider.oninput = function () {
            const size = parseInt(comboSizeSlider.value, 10);
            state.comboSize = size;
            comboSizeValue.textContent = size;
            if (comboPreviewDraggable) comboPreviewDraggable.style.fontSize = Math.round(size * PREVIEW_BOARD_SCALE) + 'px';
        };
        unstableBarWidthSlider.oninput = function () {
            const w = parseInt(unstableBarWidthSlider.value, 10);
            state.unstableBarWidth = w;
            unstableBarWidthValue.textContent = w;
            if (unstableBarPreviewEl) unstableBarPreviewEl.style.width = w + '%';
        };
        scoreSizeSlider.oninput = function () {
            const size = parseInt(scoreSizeSlider.value, 10);
            state.scoreSize = size;
            scoreSizeValue.textContent = size;
            if (previewScoreEl) previewScoreEl.style.fontSize = size + 'px';
        };
        accuracySizeSlider.oninput = function () {
            const size = parseInt(accuracySizeSlider.value, 10);
            state.accuracySize = size;
            accuracySizeValue.textContent = size;
            if (previewAccuracyEl) previewAccuracyEl.style.fontSize = size + 'px';
        };
        timerSizeSlider.oninput = function () {
            const size = parseInt(timerSizeSlider.value, 10);
            state.timerSize = size;
            timerSizeValue.textContent = size;
            if (previewTimerEl) previewTimerEl.style.fontSize = size + 'px';
        };

        function onJudgePointerDown(e) {
            e.preventDefault();
            judgeDragStart = { x: e.clientX, y: e.clientY, startX: state.judgeX, startY: state.judgeY };
        }
        function onComboPointerDown(e) {
            e.preventDefault();
            comboDragStart = { x: e.clientX, y: e.clientY, startX: state.comboX, startY: state.comboY };
        }
        function onUnstableBarPointerDown(e) {
            e.preventDefault();
            unstableBarDragStart = { x: e.clientX, y: e.clientY, startX: state.unstableBarX, startY: state.unstableBarY };
        }
        function onPointerMove(e) {
            const rect = judgePreviewBoard.getBoundingClientRect();
            const snap = snapToCenterCheck ? snapToCenterCheck.checked : state.snapToCenter;
            if (judgeDragStart) {
                const dx = snap ? 0 : (e.clientX - judgeDragStart.x) / rect.width * 100;
                const dy = (e.clientY - judgeDragStart.y) / rect.height * 100;
                state.judgeX = snap ? 50 : Math.max(0, Math.min(100, judgeDragStart.startX + dx));
                state.judgeY = Math.max(0, Math.min(100, judgeDragStart.startY + dy));
                judgePreviewDraggable.style.left = state.judgeX + '%';
                judgePreviewDraggable.style.top = state.judgeY + '%';
            }
            if (comboDragStart && comboPreviewDraggable) {
                const dx = snap ? 0 : (e.clientX - comboDragStart.x) / rect.width * 100;
                const dy = (e.clientY - comboDragStart.y) / rect.height * 100;
                state.comboX = snap ? 50 : Math.max(0, Math.min(100, comboDragStart.startX + dx));
                state.comboY = Math.max(0, Math.min(100, comboDragStart.startY + dy));
                comboPreviewDraggable.style.left = state.comboX + '%';
                comboPreviewDraggable.style.top = state.comboY + '%';
            }
            if (unstableBarDragStart && unstableBarPreviewEl) {
                const dx = snap ? 0 : (e.clientX - unstableBarDragStart.x) / rect.width * 100;
                const dy = (e.clientY - unstableBarDragStart.y) / rect.height * 100;
                state.unstableBarX = snap ? 50 : Math.max(0, Math.min(100, unstableBarDragStart.startX + dx));
                state.unstableBarY = Math.max(0, Math.min(100, unstableBarDragStart.startY + dy));
                unstableBarPreviewEl.style.left = state.unstableBarX + '%';
                unstableBarPreviewEl.style.top = state.unstableBarY + '%';
            }
        }
        function onPointerUp() {
            judgeDragStart = null;
            comboDragStart = null;
            unstableBarDragStart = null;
        }
        judgePreviewDraggable.onpointerdown = onJudgePointerDown;
        if (comboPreviewDraggable) comboPreviewDraggable.onpointerdown = onComboPointerDown;
        if (unstableBarPreviewEl) unstableBarPreviewEl.onpointerdown = onUnstableBarPointerDown;
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
        document.addEventListener('pointercancel', onPointerUp);
        gameplayUICustomizeOverlay._cleanup = function () {
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('pointercancel', onPointerUp);
            judgePreviewDraggable.onpointerdown = null;
            if (comboPreviewDraggable) comboPreviewDraggable.onpointerdown = null;
            if (unstableBarPreviewEl) unstableBarPreviewEl.onpointerdown = null;
            gameplayUICustomizeOverlay._cleanup = null;
        };
    }

    function closeGameplayUICustomize() {
        if (!gameplayUICustomizeOverlay) return;
        state.judgeVisible = judgeVisibleCheck.checked;
        state.comboVisible = comboVisibleCheck.checked;
        state.unstableBarVisible = unstableBarVisibleCheck.checked;
        state.scoreVisible = scoreVisibleCheck.checked;
        state.accuracyVisible = accuracyVisibleCheck.checked;
        state.timerVisible = timerVisibleCheck.checked;
        if (snapToCenterCheck) state.snapToCenter = snapToCenterCheck.checked;
        if (resetLayoutBtn) resetLayoutBtn.onclick = null;
        if (gameplayUICustomizeOverlay._cleanup) gameplayUICustomizeOverlay._cleanup();
        gameplayUICustomizeOverlay.style.display = 'none';
        saveSettings();
        applyJudgeStyle();
        applyGameplayUIStyle();
    }

    function updateKeyHints() {
        const keys = ['key1', 'key2', 'key3', 'key4'];
        state.keybinds.forEach((code, i) => {
            const el = document.getElementById(keys[i]);
            if (el) el.textContent = keyToDisplay(code);
        });
    }

    function startListening(lane) {
        if (state.listeningLane !== null) return;
        state.listeningLane = lane;
        const btn = document.querySelector(`.keybind-btn[data-lane="${lane}"]`);
        if (btn) btn.classList.add('listening');
    }

    function onKeyDown(e) {
        if (state.listeningLane !== null) {
            e.preventDefault();
            const lane = state.listeningLane;
            state.keybinds[lane] = e.code;
            buildKeyToLane();
            const btn = document.querySelector(`.keybind-btn[data-lane="${lane}"]`);
            if (btn) {
                btn.classList.remove('listening');
                btn.textContent = keyToDisplay(e.code);
            }
            state.listeningLane = null;
            saveSettings();
            updateKeyHints();
            return;
        }
        if (e.code === 'Escape') {
            if (gameplayUICustomizeOverlay && gameplayUICustomizeOverlay.style.display === 'flex') {
                e.preventDefault();
                closeGameplayUICustomize();
                return;
            }
            if (gameState && gameState.running && !gameState.paused) {
                e.preventDefault();
                setPaused(true);
            } else if (gameState && gameState.paused) {
                e.preventDefault();
                setPaused(false);
            }
            return;
        }
        if (!gameState || !gameState.running || gameState.paused) return;
        const lane = keyToLane[e.code];
        if (lane === undefined) return;
        e.preventDefault();
        if (!keysHeld.has(e.code)) {
            keysHeld.add(e.code);
            const receptor = lanesEl.querySelector(`.lane[data-lane="${lane}"] .receptor`);
            if (receptor) {
                if (state.receptorLight) receptor.classList.add('receptor-hit-light');
                if (state.receptorPulse) receptor.classList.add('receptor-hit-pulse');
            }
        }
        handleHit(lane);
    }

    function onKeyUp(e) {
        if (state.listeningLane !== null) return;
        const lane = keyToLane[e.code];
        if (lane !== undefined) {
            keysHeld.delete(e.code);
            const receptor = lanesEl.querySelector(`.lane[data-lane="${lane}"] .receptor`);
            if (receptor) {
                receptor.classList.remove('receptor-hit-light', 'receptor-hit-pulse');
            }
        }
    }

    function clearReceptorHitState() {
        keysHeld.clear();
        lanesEl.querySelectorAll('.receptor').forEach(el => {
            el.classList.remove('receptor-hit-light', 'receptor-hit-pulse');
        });
    }

    function formatDuration(sec) {
        if (sec < 60) return sec + 's';
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return s > 0 ? m + ':' + (s < 10 ? '0' : '') + s : m + ':00';
    }

    function generateNotes(durationSec) {
        const notes = [];
        const style = state.gameStyle;
        const nps = Math.max(1, state.notesPerSecond);
        const intervalStream = 1 / nps;
        const intervalChords = 2.5 / nps;

        if (style === 'chords') {
            let t = 0.5;
            while (t < durationSec - 0.5) {
                const count = 2 + Math.floor(Math.random() * 3);
                const lanes = [0, 1, 2, 3].sort(() => Math.random() - 0.5).slice(0, count);
                lanes.forEach(lane => notes.push({ lane, hitTime: t }));
                t += intervalChords * (0.85 + Math.random() * 0.3);
            }
        } else if (style === 'stream') {
            let t = 0.5;
            let prevLane = -1;
            while (t < durationSec - 0.5) {
                const otherLanes = [0, 1, 2, 3].filter(l => l !== prevLane);
                const lane = otherLanes[Math.floor(Math.random() * otherLanes.length)];
                prevLane = lane;
                notes.push({ lane, hitTime: t });
                t += intervalStream * (0.85 + Math.random() * 0.3);
            }
        } else {
            let t = 0.5;
            while (t < durationSec - 0.5) {
                const useChord = Math.random() < 0.35;
                const interval = useChord ? intervalChords : intervalStream;
                if (useChord) {
                    const count = 1 + Math.floor(Math.random() * 3);
                    const lanes = [0, 1, 2, 3].sort(() => Math.random() - 0.5).slice(0, count);
                    lanes.forEach(lane => notes.push({ lane, hitTime: t }));
                } else {
                    notes.push({ lane: Math.floor(Math.random() * 4), hitTime: t });
                }
                t += interval * (0.8 + Math.random() * 0.4);
            }
        }

        notes.sort((a, b) => a.hitTime - b.hitTime);
        return notes;
    }

    function startGame() {
        state.notesPerSecond = parseInt(notesPerSecondInput.value, 10);
        state.gameDurationSec = parseInt(gameDurationInput.value, 10);
        const durationSec = state.gameDurationSec;
        const scrollSpeedPxPerSec = state.scrollSpeed * 40;
        const notes = generateNotes(durationSec);

        gameState = {
            running: true,
            paused: false,
            startTime: null,
            totalPausedMs: 0,
            pauseStartTime: null,
            durationSec,
            notes,
            hit: {},
            stats: { perfect: 0, great: 0, good: 0, miss: 0 },
            score: 0,
            combo: 0,
            recentHitOffsets: [],
            scrollSpeedPxPerSec,
            noteElements: new Map()
        };

        gameState.notes.forEach((n, i) => {
            gameState.hit[i] = false;
        });

        menu.style.display = 'none';
        if (topbarEl) topbarEl.style.display = 'none';
        gameContainer.style.display = 'flex';
        resultsEl.style.display = 'none';
        pauseOverlayEl.style.display = 'none';
        judgeEl.textContent = '';
        judgeEl.className = 'judge';
        applyJudgeStyle();
        applyGameplayUIStyle();
        updateUnstableBarTicks();
        if (timerTotalEl) timerTotalEl.textContent = formatDuration(durationSec);

        lanesEl.querySelectorAll('.notes-layer').forEach(layer => {
            layer.innerHTML = '';
        });

        gameState.startTime = performance.now();
        window.addEventListener('resize', scalePlayfield);
        requestAnimationFrame(() => { scalePlayfield(); gameLoop(); });
    }

    function formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function scalePlayfield() {
        if (!playfieldScalerEl) return;
        const playfield = playfieldScalerEl.querySelector('.playfield');
        if (!playfield) return;
        const w = playfieldScalerEl.clientWidth;
        const h = playfieldScalerEl.clientHeight;
        const scale = Math.min(w / PLAYFIELD_WIDTH, h / PLAYFIELD_HEIGHT, 10) || 1;
        playfield.style.transform = 'scale(' + scale + ')';
    }

    function setPaused(paused) {
        if (!gameState) return;
        if (paused) {
            gameState.paused = true;
            gameState.pauseStartTime = performance.now();
            clearReceptorHitState();
            pauseOverlayEl.style.display = 'flex';
        } else {
            gameState.paused = false;
            if (gameState.pauseStartTime != null) {
                gameState.totalPausedMs += performance.now() - gameState.pauseStartTime;
                gameState.pauseStartTime = null;
            }
            pauseOverlayEl.style.display = 'none';
            requestAnimationFrame(gameLoop);
        }
    }

    function backToMenu() {
        if (rafId != null) cancelAnimationFrame(rafId);
        rafId = null;
        gameState = null;
        clearReceptorHitState();
        resultsEl.style.display = 'none';
        pauseOverlayEl.style.display = 'none';
        gameContainer.style.display = 'none';
        menu.style.display = 'flex';
        if (topbarEl) topbarEl.style.display = 'flex';
        window.removeEventListener('resize', scalePlayfield);
    }

    function getCurrentTime() {
        let elapsed = performance.now() - gameState.startTime;
        if (gameState.pauseStartTime != null) {
            elapsed -= (performance.now() - gameState.pauseStartTime) + gameState.totalPausedMs;
        } else {
            elapsed -= gameState.totalPausedMs;
        }
        return elapsed / 1000;
    }

    function judgeDelta(dtMs) {
        const abs = Math.abs(dtMs);
        if (abs <= PERFECT_MS) return 'perfect';
        if (abs <= GREAT_MS) return 'great';
        if (abs <= GOOD_MS) return 'good';
        return 'miss';
    }

    function handleHit(lane) {
        const now = getCurrentTime();
        const nowMs = now * 1000;
        let bestIdx = null;
        let bestDt = Infinity;
        let missIdx = null;
        let missDt = -Infinity;

        for (let i = 0; i < gameState.notes.length; i++) {
            if (gameState.hit[i]) continue;
            const n = gameState.notes[i];
            if (n.lane !== lane) continue;
            const dtMs = n.hitTime * 1000 - nowMs;
            if (dtMs > GOOD_MS) continue;
            if (dtMs >= -GOOD_MS && dtMs <= GOOD_MS) {
                if (Math.abs(dtMs) < Math.abs(bestDt)) {
                    bestDt = dtMs;
                    bestIdx = i;
                }
            } else if (dtMs < -GOOD_MS && dtMs > missDt) {
                missDt = dtMs;
                missIdx = i;
            }
        }

        if (bestIdx !== null) {
            const judgement = judgeDelta(bestDt);
            gameState.hit[bestIdx] = true;
            gameState.stats[judgement]++;
            if (judgement === 'miss') {
                gameState.combo = 0;
            } else {
                gameState.combo++;
                const points = judgement === 'perfect' ? 100 : judgement === 'great' ? 50 : 20;
                gameState.score += points * (1 + Math.min(gameState.combo - 1, 10) * 0.1);
                gameState.recentHitOffsets.push({ offsetMs: bestDt, judgement });
                if (gameState.recentHitOffsets.length > 20) gameState.recentHitOffsets.shift();
            }
            showJudge(judgement);
            removeNoteElement(bestIdx);
            updateUnstableBarTicks();
            return;
        }

        if (missIdx !== null) {
            gameState.hit[missIdx] = true;
            gameState.stats.miss++;
            gameState.combo = 0;
            showJudge('miss');
            removeNoteElement(missIdx);
        }
    }

    function showJudge(judgement) {
        if (!state.judgeVisible) return;
        judgeEl.textContent = judgement.toUpperCase();
        judgeEl.className = 'judge ' + judgement;
        judgeEl.style.left = state.judgeX + '%';
        judgeEl.style.top = state.judgeY + '%';
        judgeEl.style.fontSize = state.judgeSize + 'px';
        judgeEl.style.opacity = '1';
        clearTimeout(judgeEl._hide);
        judgeEl._hide = setTimeout(() => {
            judgeEl.style.opacity = '0.3';
        }, 150);
    }

    function removeNoteElement(noteIdx) {
        const el = gameState.noteElements.get(noteIdx);
        if (el && el.parentNode) el.parentNode.removeChild(el);
        gameState.noteElements.delete(noteIdx);
    }

    function updateUnstableBarTicks() {
        if (!unstableBarTicksEl || !state.unstableBarVisible || !gameState) return;
        unstableBarTicksEl.innerHTML = '';
        const entries = gameState.recentHitOffsets;
        for (let i = 0; i < entries.length; i++) {
            const { offsetMs, judgement } = entries[i];
            const pct = 50 + (offsetMs / GOOD_MS) * 50;
            const left = Math.max(0, Math.min(100, pct));
            const tick = document.createElement('div');
            tick.className = 'unstable-bar-tick ' + judgement;
            tick.style.left = left + '%';
            unstableBarTicksEl.appendChild(tick);
        }
    }

    function getAccuracy() {
        const s = gameState.stats;
        const total = s.perfect + s.great + s.good + s.miss;
        if (total === 0) return 100;
        /* Perfect=100%, Great=50%, Good=20%, Miss=0% */
        const weighted = s.perfect * 100 + s.great * 50 + s.good * 20;
        return weighted / total;
    }

    function gameLoop() {
        if (!gameState || !gameState.running) return;
        if (gameState.paused) return;
        rafId = requestAnimationFrame(gameLoop);

        const now = getCurrentTime();
        const scrollSpeed = gameState.scrollSpeedPxPerSec;
        const receptorY = PLAYFIELD_HEIGHT;

        for (let i = 0; i < gameState.notes.length; i++) {
            if (gameState.hit[i]) continue;
            const n = gameState.notes[i];
            const dt = n.hitTime - now;
            const y = receptorY - dt * scrollSpeed;

            /* Note not on screen yet (above playfield) – skip, don’t remove */
            if (y < -NOTE_SIZE - 20) continue;

            /* Only count as miss after the late window: GOOD_MS past the hit time */
            const dtMs = dt * 1000;
            if (dtMs < -GOOD_MS) {
                gameState.hit[i] = true;
                gameState.stats.miss++;
                gameState.combo = 0;
                showJudge('miss');
                removeNoteElement(i);
                continue;
            }

            /* Note past receptor but still in late window – don't remove yet */
            if (y > PLAYFIELD_HEIGHT + 20) continue;

            let el = gameState.noteElements.get(i);
            if (!el) {
                const layer = lanesEl.querySelector(`.lane[data-lane="${n.lane}"] .notes-layer`);
                el = document.createElement('div');
                el.className = 'note';
                el.dataset.skin = state.skin;
                layer.appendChild(el);
                gameState.noteElements.set(i, el);
            }
            el.style.top = `${y - NOTE_SIZE / 2}px`;
        }

        scoreEl.textContent = Math.round(gameState.score);
        comboEl.textContent = gameState.combo;
        if (accuracyEl) accuracyEl.textContent = getAccuracy().toFixed(2);
        if (timerEl) timerEl.textContent = formatTime(Math.max(0, Math.floor(now)));

        if (now >= gameState.durationSec) {
            endGame();
        }
    }

    function endGame() {
        gameState.running = false;
        if (rafId != null) cancelAnimationFrame(rafId);
        rafId = null;
        clearReceptorHitState();
        window.removeEventListener('resize', scalePlayfield);

        document.getElementById('resPerfect').textContent = gameState.stats.perfect;
        document.getElementById('resGreat').textContent = gameState.stats.great;
        document.getElementById('resGood').textContent = gameState.stats.good;
        document.getElementById('resMiss').textContent = gameState.stats.miss;
        document.getElementById('resScore').textContent = Math.round(gameState.score);
        document.getElementById('resAccuracy').textContent = getAccuracy().toFixed(2);
        resultsEl.style.display = 'flex';
    }

    initUI();
})();
