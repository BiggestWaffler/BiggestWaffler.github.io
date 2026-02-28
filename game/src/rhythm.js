(function () {
    'use strict';

    const PLAYFIELD_HEIGHT = 420;
    const NOTE_SIZE = 48;
    const RECEPTOR_SIZE = 52;
    const PERFECT_MS = 50;
    const GREAT_MS = 100;
    const GOOD_MS = 150;
    const STORAGE_KEY = 'rhythm4k_settings';

    const defaultKeybinds = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'];

    function keyToDisplay(code) {
        if (code.startsWith('Key')) return code.slice(3);
        if (code.startsWith('Digit')) return code.slice(5);
        if (code.startsWith('Numpad')) return 'Num' + code.slice(6);
        return code.length === 1 ? code : code;
    }

    let state = {
        keybinds: [...defaultKeybinds],
        scrollSpeed: 40,
        skin: 'circle',
        judgeVisible: true,
        judgeX: 50,
        judgeY: 50,
        judgeSize: 22,
        notesPerSecond: 8,
        gameStyle: 'stream',
        gameDurationSec: 60,
        listeningLane: null
    };

    let gameState = null;
    let keyToLane = {};
    let rafId = null;

    const menu = document.getElementById('menu');
    const gameContainer = document.getElementById('gameContainer');
    const topbarEl = document.querySelector('.topbar');
    const lanesEl = document.getElementById('lanes');
    const scoreEl = document.getElementById('score');
    const comboEl = document.getElementById('combo');
    const judgeEl = document.getElementById('judge');
    const judgeWrapEl = document.querySelector('.judge-wrap');
    const judgeCustomizeOverlay = document.getElementById('judgeCustomizeOverlay');
    const judgePreviewBoard = document.getElementById('judgePreviewBoard');
    const judgePreviewDraggable = document.getElementById('judgePreviewDraggable');
    const judgeVisibleCheck = document.getElementById('judgeVisibleCheck');
    const judgeSizeSlider = document.getElementById('judgeSizeSlider');
    const judgeSizeValue = document.getElementById('judgeSizeValue');
    const customizeJudgeBtn = document.getElementById('customizeJudgeBtn');
    const judgeCustomizeDone = document.getElementById('judgeCustomizeDone');
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
                judgeSize: state.judgeSize
            }));
        } catch (_) {}
    }

    function buildKeyToLane() {
        keyToLane = {};
        state.keybinds.forEach((code, i) => { keyToLane[code] = i; });
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

        if (customizeJudgeBtn) customizeJudgeBtn.addEventListener('click', openJudgeCustomize);
        if (judgeCustomizeDone) judgeCustomizeDone.addEventListener('click', closeJudgeCustomize);
        if (judgeCustomizeOverlay) {
            judgeCustomizeOverlay.addEventListener('click', function (e) {
                if (e.target === judgeCustomizeOverlay) closeJudgeCustomize();
            });
        }
        applyJudgeStyle();

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

    let judgeDragStart = null;

    function openJudgeCustomize() {
        if (!judgeCustomizeOverlay || !judgePreviewDraggable || !judgePreviewBoard) return;
        if (judgeCustomizeOverlay._cleanup) judgeCustomizeOverlay._cleanup();
        judgeVisibleCheck.checked = state.judgeVisible;
        judgeSizeSlider.value = state.judgeSize;
        judgeSizeValue.textContent = state.judgeSize;
        judgePreviewDraggable.style.left = state.judgeX + '%';
        judgePreviewDraggable.style.top = state.judgeY + '%';
        judgePreviewDraggable.style.fontSize = state.judgeSize + 'px';
        judgeCustomizeOverlay.style.display = 'flex';

        judgeSizeSlider.oninput = function () {
            const size = parseInt(judgeSizeSlider.value, 10);
            state.judgeSize = size;
            judgeSizeValue.textContent = size;
            judgePreviewDraggable.style.fontSize = size + 'px';
        };

        function onPointerDown(e) {
            e.preventDefault();
            judgeDragStart = { x: e.clientX, y: e.clientY, startX: state.judgeX, startY: state.judgeY };
        }
        function onPointerMove(e) {
            if (!judgeDragStart) return;
            const rect = judgePreviewBoard.getBoundingClientRect();
            const dx = (e.clientX - judgeDragStart.x) / rect.width * 100;
            const dy = (e.clientY - judgeDragStart.y) / rect.height * 100;
            state.judgeX = Math.max(0, Math.min(100, judgeDragStart.startX + dx));
            state.judgeY = Math.max(0, Math.min(100, judgeDragStart.startY + dy));
            judgePreviewDraggable.style.left = state.judgeX + '%';
            judgePreviewDraggable.style.top = state.judgeY + '%';
        }
        function onPointerUp() {
            judgeDragStart = null;
        }
        judgePreviewDraggable.onpointerdown = onPointerDown;
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
        document.addEventListener('pointercancel', onPointerUp);
        judgeCustomizeOverlay._cleanup = function () {
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('pointercancel', onPointerUp);
            judgePreviewDraggable.onpointerdown = null;
            judgeCustomizeOverlay._cleanup = null;
        };
    }

    function closeJudgeCustomize() {
        if (!judgeCustomizeOverlay) return;
        state.judgeVisible = judgeVisibleCheck.checked;
        if (judgeCustomizeOverlay._cleanup) judgeCustomizeOverlay._cleanup();
        judgeCustomizeOverlay.style.display = 'none';
        saveSettings();
        applyJudgeStyle();
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
            if (judgeCustomizeOverlay && judgeCustomizeOverlay.style.display === 'flex') {
                e.preventDefault();
                closeJudgeCustomize();
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
        handleHit(lane);
    }

    function onKeyUp(e) {
        if (state.listeningLane !== null) return;
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
        const scale = Math.min(w / 248, h / 420, 10) || 1;
        playfield.style.transform = 'scale(' + scale + ')';
    }

    function setPaused(paused) {
        if (!gameState) return;
        if (paused) {
            gameState.paused = true;
            gameState.pauseStartTime = performance.now();
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
            }
            showJudge(judgement);
            removeNoteElement(bestIdx);
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
