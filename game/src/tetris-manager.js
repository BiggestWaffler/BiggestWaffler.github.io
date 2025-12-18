// Tetris Game Manager
// Handles Game Mode Selection and Initialization

(function() {
    const modeModal = document.getElementById('modeSelectModal');
    const resultModal = document.getElementById('resultModal');
    const p1Wrapper = document.getElementById('p1Wrapper');
    const p2Wrapper = document.getElementById('p2Wrapper');
    const botPPSInput = document.getElementById('botPPS');
    const botPPSValue = document.getElementById('botPPSValue');
    const menuBtn = document.getElementById('menuBtn');
    const botSettings = document.getElementById('botSettings');
    
    let p1Game = null;
    let p2Game = null;
    let currentGameMode = 'single';

    function resetModeModalUI() {
        const btnSingleEl = document.getElementById('btnSingle');
        const btnVersusEl = document.getElementById('btnVersus');
        if (botSettings) botSettings.style.display = 'none';
        if (btnSingleEl) btnSingleEl.style.display = 'block';
        if (btnVersusEl) btnVersusEl.style.display = 'block';
    }

    function goToMenu() {
        // Stop active games
        if (p1Game) { p1Game.stop(); p1Game = null; }
        if (p2Game) { p2Game.stop(); p2Game = null; }

        // Close result modal if open
        if (resultModal) {
            resultModal.classList.remove('open');
            resultModal.setAttribute('aria-hidden', 'true');
        }

        // Reset layout to single-player (default)
        if (p1Wrapper) p1Wrapper.classList.add('single-mode');
        if (p2Wrapper) p2Wrapper.classList.add('hidden');
        toggleStats('single');
        currentGameMode = 'single';

        // Reset modal UI + open mode selector
        resetModeModalUI();
        if (modeModal) {
            modeModal.classList.add('open');
            modeModal.setAttribute('aria-hidden', 'false');
        }
    }

    // UI Event Listeners
    const btnSingle = document.getElementById('btnSingle');
    if (btnSingle) {
        btnSingle.addEventListener('click', () => {
            startSinglePlayer();
        });
    }

    const btnVersus = document.getElementById('btnVersus');
    if (btnVersus) {
        btnVersus.addEventListener('click', () => {
            // Show bot settings
            if (botSettings) botSettings.style.display = 'block';
            btnSingle.style.display = 'none';
            btnVersus.style.display = 'none';
        });
    }

    const btnStartVersus = document.getElementById('btnStartVersus');
    if (btnStartVersus) {
        btnStartVersus.addEventListener('click', () => {
            startVersus();
        });
    }

    if (botPPSInput) {
        botPPSInput.addEventListener('input', (e) => {
            if (botPPSValue) botPPSValue.textContent = e.target.value;
        });
    }

    // Result Modal Listeners
    const btnRestartMatch = document.getElementById('btnRestartMatch');
    if (btnRestartMatch) {
        btnRestartMatch.addEventListener('click', () => {
            if (resultModal) {
                resultModal.classList.remove('open');
                resultModal.setAttribute('aria-hidden', 'true');
            }
            if (currentGameMode === 'versus') {
                startVersus();
            } else {
                startSinglePlayer();
            }
        });
    }

    const btnMenu = document.getElementById('btnMenu');
    if (btnMenu) {
        btnMenu.addEventListener('click', () => {
            goToMenu();
        });
    }

    // Topbar menu button (works mid-match too)
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            goToMenu();
        });
    }

    function toggleStats(mode) {
        const singles = document.querySelectorAll('.stats-single');
        const versus = document.querySelectorAll('.stats-versus');
        
        singles.forEach(el => el.style.display = mode === 'single' ? 'flex' : 'none');
        versus.forEach(el => el.style.display = mode === 'versus' ? 'flex' : 'none');
    }

    function startSinglePlayer() {
        currentGameMode = 'single';
        if (modeModal) {
            modeModal.classList.remove('open');
            modeModal.setAttribute('aria-hidden', 'true');
        }
        
        // Update Layout
        if (p1Wrapper) p1Wrapper.classList.add('single-mode');
        if (p2Wrapper) p2Wrapper.classList.add('hidden');
        
        toggleStats('single');

        // Cleanup
        if (p1Game) p1Game.stop();
        if (p2Game) p2Game.stop();

        // P1 Config
        const p1Config = {
            canvasId: 'game1',
            holdCanvasId: 'hold1',
            scoreId: 'score1',
            linesId: 'lines1',
            levelId: 'level1',
            garbageId: 'garbage1',
            overlayId: 'overlay1',
            nextElements: Array.from(document.querySelectorAll('.p1-next')),
            input: true,
            gameMode: 'single'
        };
        
        if (window.TetrisGame) {
            p1Game = new window.TetrisGame(p1Config);
        }
    }

    function startVersus() {
        currentGameMode = 'versus';
        if (modeModal) {
            modeModal.classList.remove('open');
            modeModal.setAttribute('aria-hidden', 'true');
        }
        
        // Update Layout
        if (p1Wrapper) p1Wrapper.classList.remove('single-mode');
        if (p2Wrapper) p2Wrapper.classList.remove('hidden');
        
        toggleStats('versus');

        // Cleanup
        if (p1Game) p1Game.stop();
        if (p2Game) p2Game.stop();

        // P1 Config
        const p1Config = {
            canvasId: 'game1',
            holdCanvasId: 'hold1',
            ppsId: 'pps1',
            apmId: 'apm1',
            garbageId: 'garbage1',
            overlayId: 'overlay1',
            nextElements: Array.from(document.querySelectorAll('.p1-next')),
            input: true,
            gameMode: 'versus',
            allowPause: false, // Disable pause in versus
            onGameOver: (game) => handleGameOver(game, 'Player 1')
        };
        
        if (window.TetrisGame) {
            p1Game = new window.TetrisGame(p1Config);

            // P2 (Bot) Config
            const pps = parseFloat(botPPSInput ? botPPSInput.value : 1.0);
            const p2Config = {
                canvasId: 'game2',
                holdCanvasId: 'hold2',
                ppsId: 'pps2',
                apmId: 'apm2',
                garbageId: 'garbage2',
                overlayId: 'overlay2',
                nextElements: Array.from(document.querySelectorAll('.p2-next')),
                input: false,
                isBot: true,
                botPPS: pps,
                gameMode: 'versus',
                allowPause: false,
                onGameOver: (game) => handleGameOver(game, 'Bot')
            };
            p2Game = new window.TetrisGame(p2Config);
            
            // Link Games
            p1Game.setOpponent(p2Game);
            p2Game.setOpponent(p1Game);

            // Attach Bot
            if (window.TetrisBot) {
                p2Game.bot = new window.TetrisBot(p2Game);
            }
        }
    }

    function handleGameOver(loser, name) {
        // Stop both games
        if (p1Game) p1Game.stop();
        if (p2Game) p2Game.stop();

        // Determine winner
        let winner = '';
        if (loser === p1Game) winner = 'Bot';
        else winner = 'Player 1';

        // Update UI
        const title = document.getElementById('resultTitle');
        const msg = document.getElementById('resultMessage');
        
        if (title) title.textContent = winner + ' Wins!';
        if (msg) msg.textContent = name + ' topped out.';

        if (resultModal) {
            resultModal.classList.add('open');
            resultModal.setAttribute('aria-hidden', 'false');
        }
    }
})();
