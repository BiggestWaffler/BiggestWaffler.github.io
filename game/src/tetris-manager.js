// Tetris Game Manager
// Handles Game Mode Selection and Initialization

(function() {
    const modeModal = document.getElementById('modeSelectModal');
    const p1Wrapper = document.getElementById('p1Wrapper');
    const p2Wrapper = document.getElementById('p2Wrapper');
    const botPPSInput = document.getElementById('botPPS');
    const botPPSValue = document.getElementById('botPPSValue');
    
    let p1Game = null;
    let p2Game = null;

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
            document.getElementById('botSettings').style.display = 'block';
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

    function startSinglePlayer() {
        if (modeModal) {
            modeModal.classList.remove('open');
            modeModal.setAttribute('aria-hidden', 'true');
        }
        
        // P1 Config
        const p1Config = {
            canvasId: 'game1',
            holdCanvasId: 'hold1',
            scoreId: 'score1',
            linesId: 'lines1',
            levelId: 'level1',
            overlayId: 'overlay1',
            nextElements: Array.from(document.querySelectorAll('.p1-next')),
            input: true
        };
        
        if (window.TetrisGame) {
            p1Game = new window.TetrisGame(p1Config);
        }
    }

    function startVersus() {
        if (modeModal) {
            modeModal.classList.remove('open');
            modeModal.setAttribute('aria-hidden', 'true');
        }
        
        // Update Layout
        if (p1Wrapper) p1Wrapper.classList.remove('single-mode');
        if (p2Wrapper) p2Wrapper.classList.remove('hidden');

        // P1 Config
        const p1Config = {
            canvasId: 'game1',
            holdCanvasId: 'hold1',
            scoreId: 'score1',
            linesId: 'lines1',
            levelId: 'level1',
            overlayId: 'overlay1',
            nextElements: Array.from(document.querySelectorAll('.p1-next')),
            input: true
        };
        
        if (window.TetrisGame) {
            p1Game = new window.TetrisGame(p1Config);

            // P2 (Bot) Config
            const pps = parseFloat(botPPSInput ? botPPSInput.value : 1.0);
            const p2Config = {
                canvasId: 'game2',
                holdCanvasId: 'hold2',
                scoreId: 'score2',
                linesId: 'lines2',
                levelId: 'level2',
                overlayId: 'overlay2',
                nextElements: Array.from(document.querySelectorAll('.p2-next')),
                input: false,
                isBot: true,
                botPPS: pps
            };
            p2Game = new window.TetrisGame(p2Config);
            
            // Attach Bot
            if (window.TetrisBot) {
                p2Game.bot = new window.TetrisBot(p2Game);
            }
        }
    }
})();
