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
    
    // UI Sections
    const botSettings = document.getElementById('botSettings');
    const multiplayerSettings = document.getElementById('multiplayerSettings');
    
    // Buttons
    const btnSingle = document.getElementById('btnSingle');
    const btnVersus = document.getElementById('btnVersus');
    const btnMultiplayer = document.getElementById('btnMultiplayer');
    const btnStartVersus = document.getElementById('btnStartVersus');
    
    // Multiplayer UI
    const btnCreateRoom = document.getElementById('btnCreateRoom');
    const roomCreateArea = document.getElementById('roomCreateArea');
    const myRoomId = document.getElementById('myRoomId');
    const btnCopyRoom = document.getElementById('btnCopyRoom');
    const waitingMsg = document.getElementById('waitingMsg');
    
    const btnJoinRoomMode = document.getElementById('btnJoinRoomMode');
    const roomJoinArea = document.getElementById('roomJoinArea');
    const destRoomId = document.getElementById('destRoomId');
    const btnConnect = document.getElementById('btnConnect');
    const connectMsg = document.getElementById('connectMsg');
    
    let p1Game = null;
    let p2Game = null;
    let currentGameMode = 'single';
    
    // PeerJS State
    let peer = null;
    let conn = null;
    
    // Rematch State
    let myRematchVote = false;
    let oppRematchVote = false;

    function resetModeModalUI() {
        if (botSettings) botSettings.style.display = 'none';
        if (multiplayerSettings) multiplayerSettings.style.display = 'none';
        
        if (btnSingle) btnSingle.style.display = 'block';
        if (btnVersus) btnVersus.style.display = 'block';
        if (btnMultiplayer) btnMultiplayer.style.display = 'block';
        
        // Reset multiplayer sub-UI
        if (roomCreateArea) roomCreateArea.style.display = 'none';
        if (roomJoinArea) roomJoinArea.style.display = 'none';
        if (waitingMsg) waitingMsg.style.display = 'block';
        if (connectMsg) connectMsg.textContent = '';
        if (myRoomId) myRoomId.value = '';
        if (destRoomId) destRoomId.value = '';
        
        resetRematchState();
    }
    
    function resetRematchState() {
        myRematchVote = false;
        oppRematchVote = false;
        const btnRestartMatch = document.getElementById('btnRestartMatch');
        if (btnRestartMatch) {
            btnRestartMatch.textContent = 'Restart Match';
            btnRestartMatch.disabled = false;
            btnRestartMatch.classList.remove('waiting');
        }
        const msg = document.getElementById('resultMessage');
        // Don't clear message if it shows winner, only if it shows rematch status
    }

    function goToMenu() {
        // Stop active games
        if (p1Game) { p1Game.stop(); p1Game = null; }
        if (p2Game) { p2Game.stop(); p2Game = null; }

        // Close peer connection if exists
        if (peer) {
            peer.destroy();
            peer = null;
            conn = null;
        }

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
    if (btnSingle) {
        btnSingle.addEventListener('click', () => {
            startSinglePlayer();
        });
    }

    if (btnVersus) {
        btnVersus.addEventListener('click', () => {
            if (botSettings) botSettings.style.display = 'block';
            btnSingle.style.display = 'none';
            btnVersus.style.display = 'none';
            if (btnMultiplayer) btnMultiplayer.style.display = 'none';
        });
    }

    if (btnMultiplayer) {
        btnMultiplayer.addEventListener('click', () => {
            if (multiplayerSettings) multiplayerSettings.style.display = 'block';
            btnSingle.style.display = 'none';
            btnVersus.style.display = 'none';
            btnMultiplayer.style.display = 'none';
        });
    }

    if (btnStartVersus) {
        btnStartVersus.addEventListener('click', () => {
            startVersus();
        });
    }

    // Multiplayer Handlers
    if (btnCreateRoom) {
        btnCreateRoom.addEventListener('click', () => {
            initPeer(true);
            roomCreateArea.style.display = 'flex';
            roomJoinArea.style.display = 'none';
        });
    }
    
    if (btnCopyRoom) {
        btnCopyRoom.addEventListener('click', () => {
            if (myRoomId) {
                myRoomId.select();
                document.execCommand('copy');
                // Could show toast
            }
        });
    }

    if (btnJoinRoomMode) {
        btnJoinRoomMode.addEventListener('click', () => {
            initPeer(false);
            roomCreateArea.style.display = 'none';
            roomJoinArea.style.display = 'flex';
        });
    }

    if (btnConnect) {
        btnConnect.addEventListener('click', () => {
            const id = destRoomId.value.trim();
            if (id && peer) {
                connectMsg.textContent = 'Connecting...';
                conn = peer.connect(id);
                setupConnection();
            }
        });
    }

    function initPeer(isHost) {
        if (peer) peer.destroy();
        peer = new Peer(); // Auto-generate ID
        
        peer.on('open', (id) => {
            if (isHost && myRoomId) {
                myRoomId.value = id;
            }
        });

        peer.on('connection', (c) => {
            // Incoming connection (Host receives this)
            conn = c;
            setupConnection();
        });

        peer.on('error', (err) => {
            console.error(err);
            if (connectMsg) connectMsg.textContent = 'Error: ' + err.type;
        });
    }

    function setupConnection() {
        if (!conn) return;

        conn.on('open', () => {
            if (connectMsg) connectMsg.textContent = 'Connected! Starting...';
            if (waitingMsg) waitingMsg.textContent = 'Opponent found! Starting...';
            
            // Brief delay to ensure UI updates
            setTimeout(() => {
                startMultiplayer();
            }, 1000);
        });

        conn.on('data', (data) => {
            handleData(data);
        });

        conn.on('close', () => {
            // Handle disconnect without popup
            if (currentGameMode === 'multiplayer') {
                if (resultModal.classList.contains('open')) {
                    const msg = document.getElementById('resultMessage');
                    if (msg) msg.textContent += ' (Opponent Disconnected)';
                } else {
                    // Show disconnect in overlay if game is running or just finished
                    if (p1Game) {
                        // Hacky: access overlay element via ID since we know it
                        const overlay = document.getElementById('overlay1');
                        if (overlay) {
                            overlay.innerHTML = `<div class="overlay-backdrop" style="opacity: 1"></div><div class="overlay-content" style="opacity: 1; font-size: 24px;">Opponent Disconnected</div>`;
                            overlay.classList.add('visible');
                        }
                    }
                }
                // Optional: after delay go to menu
                // setTimeout(goToMenu, 3000);
            }
        });
    }

    function handleData(data) {
        if (!data || !data.type) return;
        
        switch (data.type) {
            case 'garbage':
                if (p1Game && !p1Game.isGameOver) {
                    p1Game.receiveGarbage(data.amount);
                }
                break;
            case 'grid':
                if (p2Game) {
                    p2Game.setGrid(data.grid);
                }
                break;
            case 'piece':
                if (p2Game) {
                    p2Game.setCurrentPiece(data.data);
                }
                break;
            case 'hold':
                if (p2Game) {
                    p2Game.setHeldPiece(data.type);
                }
                break;
            case 'garbageQueue':
                 if (p2Game) {
                     p2Game.setGarbageQueue(data.queue);
                 }
                 break;
            case 'lose':
                handleGameOver(p2Game, 'Opponent');
                break;
            case 'rematch_request':
                oppRematchVote = true;
                updateRematchUI();
                checkStartRematch();
                break;
        }
    }
    
    function updateRematchUI() {
        const msg = document.getElementById('resultMessage');
        if (oppRematchVote && !myRematchVote) {
            // Append message if not already there
            if (msg && !msg.textContent.includes('wants a rematch')) {
                msg.innerHTML += '<br><span style="color: #4caf50; font-size: 0.8em;">Opponent wants a rematch!</span>';
            }
        }
    }
    
    function checkStartRematch() {
        if (myRematchVote && oppRematchVote) {
            // Start game
            startMultiplayer();
        }
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
            if (currentGameMode === 'multiplayer') {
                // Send rematch request
                myRematchVote = true;
                btnRestartMatch.textContent = 'Waiting...';
                btnRestartMatch.disabled = true;
                if (conn && conn.open) {
                    conn.send({ type: 'rematch_request' });
                }
                checkStartRematch();
            } else {
                // For single/versus, instant restart
                if (resultModal) {
                    resultModal.classList.remove('open');
                    resultModal.setAttribute('aria-hidden', 'true');
                }
                if (currentGameMode === 'versus') {
                    startVersus();
                } else {
                    startSinglePlayer();
                }
            }
        });
    }

    const btnMenu = document.getElementById('btnMenu');
    if (btnMenu) {
        btnMenu.addEventListener('click', () => {
            goToMenu();
        });
    }

    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            goToMenu();
        });
    }

    function toggleStats(mode) {
        const singles = document.querySelectorAll('.stats-single');
        const versus = document.querySelectorAll('.stats-versus');
        
        singles.forEach(el => el.style.display = mode === 'single' ? 'flex' : 'none');
        versus.forEach(el => el.style.display = (mode === 'versus' || mode === 'multiplayer') ? 'flex' : 'none');
    }

    function startSinglePlayer() {
        currentGameMode = 'single';
        if (modeModal) {
            modeModal.classList.remove('open');
            modeModal.setAttribute('aria-hidden', 'true');
        }
        
        if (p1Wrapper) p1Wrapper.classList.add('single-mode');
        if (p2Wrapper) p2Wrapper.classList.add('hidden');
        
        toggleStats('single');

        if (p1Game) p1Game.stop();
        if (p2Game) p2Game.stop();

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
        
        if (p1Wrapper) p1Wrapper.classList.remove('single-mode');
        if (p2Wrapper) p2Wrapper.classList.remove('hidden');
        
        toggleStats('versus');

        if (p1Game) p1Game.stop();
        if (p2Game) p2Game.stop();

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
            allowPause: false,
            onGameOver: (game) => handleGameOver(game, 'Player 1')
        };
        
        if (window.TetrisGame) {
            p1Game = new window.TetrisGame(p1Config);

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
            
            p1Game.setOpponent(p2Game);
            p2Game.setOpponent(p1Game);

            if (window.TetrisBot) {
                p2Game.bot = new window.TetrisBot(p2Game);
            }
        }
    }
    
    function startMultiplayer() {
        currentGameMode = 'multiplayer';
        resetRematchState();
        
        if (modeModal) {
            modeModal.classList.remove('open');
            modeModal.setAttribute('aria-hidden', 'true');
        }
        
        if (resultModal) {
            resultModal.classList.remove('open');
            resultModal.setAttribute('aria-hidden', 'true');
        }
        
        if (p1Wrapper) p1Wrapper.classList.remove('single-mode');
        if (p2Wrapper) p2Wrapper.classList.remove('hidden');
        
        toggleStats('multiplayer');
        
        if (p1Game) p1Game.stop();
        if (p2Game) p2Game.stop();
        
        // P1: Local Player
        const p1Config = {
            canvasId: 'game1',
            holdCanvasId: 'hold1',
            ppsId: 'pps1',
            apmId: 'apm1',
            garbageId: 'garbage1',
            overlayId: 'overlay1',
            nextElements: Array.from(document.querySelectorAll('.p1-next')),
            input: true,
            gameMode: 'versus', // Reuse versus stats/logic
            allowPause: false,
            onGameOver: (game) => {
                if (conn && conn.open) conn.send({ type: 'lose' });
                handleGameOver(game, 'You');
            },
            onAttack: (amount) => {
                if (conn && conn.open) conn.send({ type: 'garbage', amount: amount });
            },
            onGridChange: (grid) => {
                if (conn && conn.open) conn.send({ type: 'grid', grid: grid });
            },
            onMove: (data) => {
                if (conn && conn.open) conn.send({ type: 'piece', data: data });
            },
            onHold: (type) => {
                if (conn && conn.open) conn.send({ type: 'hold', type: type });
            },
            onGarbageChange: (queue) => {
                if (conn && conn.open) conn.send({ type: 'garbageQueue', queue: queue });
            }
        };
        
        // P2: Remote Player (Passive)
        const p2Config = {
            canvasId: 'game2',
            holdCanvasId: 'hold2',
            ppsId: 'pps2',
            apmId: 'apm2',
            garbageId: 'garbage2',
            overlayId: 'overlay2',
            nextElements: Array.from(document.querySelectorAll('.p2-next')),
            input: false,
            isBot: false,
            isRemote: true, // Key flag
            gameMode: 'versus',
            allowPause: false
        };
        
        if (window.TetrisGame) {
            p1Game = new window.TetrisGame(p1Config);
            p2Game = new window.TetrisGame(p2Config);
            
            // We don't link them directly via setOpponent because we use callbacks
        }
    }

    function handleGameOver(loser, name) {
        if (p1Game) p1Game.stop();
        if (p2Game) p2Game.stop();

        let winner = '';
        if (currentGameMode === 'versus') {
            winner = (loser === p1Game) ? 'Bot' : 'Player 1';
        } else if (currentGameMode === 'multiplayer') {
            winner = (loser === p1Game) ? 'Opponent' : 'You';
        } else {
            winner = 'Game Over';
        }

        const title = document.getElementById('resultTitle');
        const msg = document.getElementById('resultMessage');
        
        if (title) title.textContent = (winner === 'You' || winner === 'Player 1') ? 'You Win!' : 'You Lose!';
        if (msg) {
            msg.textContent = name + ' topped out.';
            // Reset msg color if it was changed
            msg.style.color = '';
        }

        if (resultModal) {
            resultModal.classList.add('open');
            resultModal.setAttribute('aria-hidden', 'false');
        }
    }
})();
