// Modern Tetris implementation with Attack System (Versus)
// Grid: 10 x 20

(function() {
  // Shared Constants
  const COLS = 10; const ROWS = 20;
  
  // Colors per tetromino type
  const COLORS = {
    I: '#64b5f6', J: '#8e99f3', L: '#ffb74d', O: '#ffd54f',
    S: '#81c784', T: '#ce93d8', Z: '#e57373',
    G: '#9e9e9e' // Garbage
  };

  // Handling settings (Shared)
  const SETTINGS = {
    das: 160,
    arr: 30,
    softDropCps: 20,
    lockDelay: 1000,
  };

  // Default keybinds
  const DEFAULT_KEYBINDS = {
    moveLeft: 'ArrowLeft',
    moveRight: 'ArrowRight',
    rotateCW: 'ArrowUp',
    rotateCCW: 'Control',
    rotate180: 'a',
    softDrop: 'ArrowDown',
    hardDrop: ' ',
    hold: 'c',
    pause: 'p',
    restart: 'r'
  };

  const KEYBINDS = { ...DEFAULT_KEYBINDS };

  // Load persisted values
  (function loadSettings() {
    try {
      const das = localStorage.getItem('tetris.das');
      const arr = localStorage.getItem('tetris.arr');
      const sdc = localStorage.getItem('tetris.softDropCps');
      if (das !== null) SETTINGS.das = Math.max(0, parseInt(das, 10) || 0);
      if (arr !== null) SETTINGS.arr = Math.max(0, parseInt(arr, 10) || 0);
      if (sdc !== null) {
        if (sdc === 'inf') {
          SETTINGS.softDropCps = Infinity;
        } else {
          const v = Math.max(1, parseInt(sdc, 10) || 1);
          SETTINGS.softDropCps = v;
        }
      }
      
      const savedKeybinds = localStorage.getItem('tetris.keybinds');
      if (savedKeybinds) {
        try {
          const parsed = JSON.parse(savedKeybinds);
          Object.assign(KEYBINDS, parsed);
        } catch {}
      }
    } catch {}
  })();

  // Tetromino definitions
  const SHAPES = {
    I: [ [0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0] ],
    J: [ [1,0,0], [1,1,1], [0,0,0] ],
    L: [ [0,0,1], [1,1,1], [0,0,0] ],
    O: [ [1,1], [1,1] ],
    S: [ [0,1,1], [1,1,0], [0,0,0] ],
    T: [ [0,1,0], [1,1,1], [0,0,0] ],
    Z: [ [1,1,0], [0,1,1], [0,0,0] ],
  };

  const TYPES = Object.keys(SHAPES);

  function createMatrix(rows, cols, filler = 0) {
    return Array.from({length: rows}, () => Array(cols).fill(filler));
  }

  function rotate(matrix) {
    const n = matrix.length;
    const m = matrix[0].length;
    const res = createMatrix(m, n);
    for (let y = 0; y < n; y++) for (let x = 0; x < m; x++) {
      res[x][n - 1 - y] = matrix[y][x];
    }
    return res;
  }

  function rotateCCW(matrix) {
    return rotate(rotate(rotate(matrix)));
  }

  function rotate180(matrix) {
    return rotate(rotate(matrix));
  }

  // SRS Kick Tables
  const KICKS_JLSTZ = {
    '0>1': [ [0,0], [-1,0], [-1,-1], [0,2], [-1,2] ],
    '1>2': [ [0,0], [1,0], [1,1], [0,-2], [1,-2] ],
    '2>3': [ [0,0], [1,0], [1,-1], [0,2], [1,2] ],
    '3>0': [ [0,0], [-1,0], [-1,1], [0,-2], [-1,-2] ],
    '1>0': [ [0,0], [1,0], [1,1], [0,-2], [1,-2] ],
    '2>1': [ [0,0], [-1,0], [-1,-1], [0,2], [-1,2] ],
    '3>2': [ [0,0], [-1,0], [-1,1], [0,-2], [-1,-2] ],
    '0>3': [ [0,0], [1,0], [1,-1], [0,2], [1,2] ],
  };

  const KICKS_I = {
    '0>1': [ [0,0], [-2,0], [1,0], [-2,1], [1,-2] ],
    '1>2': [ [0,0], [-1,0], [2,0], [-1,-2], [2,1] ],
    '2>3': [ [0,0], [2,0], [-1,0], [2,-1], [-1,2] ],
    '3>0': [ [0,0], [1,0], [-2,0], [1,2], [-2,-1] ],
    '1>0': [ [0,0], [2,0], [-1,0], [2,-1], [-1,2] ],
    '2>1': [ [0,0], [1,0], [-2,0], [1,2], [-2,-1] ],
    '3>2': [ [0,0], [-2,0], [1,0], [-2,1], [1,-2] ],
    '0>3': [ [0,0], [-1,0], [2,0], [-1,-2], [2,1] ],
  };

  const KICKS_O = {
    '0>1': [ [0,0] ], '1>2': [ [0,0] ], '2>3': [ [0,0] ], '3>0': [ [0,0] ],
    '1>0': [ [0,0] ], '2>1': [ [0,0] ], '3>2': [ [0,0] ], '0>3': [ [0,0] ],
  };

  const KICKS_180_JLSTZ = {
    '0>2': [ [0,0], [1,0], [2,0], [1,1], [2,1], [-1,0], [-2,0], [-1,1], [-2,1], [0,-1], [3,0], [-3,0] ],
    '1>3': [ [0,0], [0,1], [0,2], [-1,1], [-1,2], [0,-1], [0,-2], [-1,-1], [-1,-2], [1,0], [0,3], [0,-3] ],
    '2>0': [ [0,0], [-1,0], [-2,0], [-1,-1], [-2,-1], [1,0], [2,0], [1,-1], [2,-1], [0,1], [-3,0], [3,0] ],
    '3>1': [ [0,0], [0,1], [0,2], [1,1], [1,2], [0,-1], [0,-2], [1,-1], [1,-2], [-1,0], [0,3], [0,-3] ],
  };

  const KICKS_180_I = {
    '0>2': [ [0,0], [1,0], [-1,0], [2,0], [-2,0], [0,-1], [0,1], [0,-2], [0,2], [1,-1], [-1,-1], [1,1], [-1,1] ],
    '1>3': [ [0,0], [0,1], [0,-1], [0,2], [0,-2], [1,0], [-1,0], [2,0], [-2,0], [1,-1], [-1,-1], [1,1], [-1,1] ],
    '2>0': [ [0,0], [1,0], [-1,0], [2,0], [-2,0], [0,-1], [0,1], [0,-2], [0,2], [1,-1], [-1,-1], [1,1], [-1,1] ],
    '3>1': [ [0,0], [0,1], [0,-1], [0,2], [0,-2], [1,0], [-1,0], [2,0], [-2,0], [1,-1], [-1,-1], [1,1], [-1,1] ],
  };

  const KICKS_180_O = {
    '0>2': [ [0,0] ], '1>3': [ [0,0] ], '2>0': [ [0,0] ], '3>1': [ [0,0] ],
  };

  function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  class Bag {
    constructor() {
      this.bag = [];
      this.refill();
    }
    refill() {
      this.bag = shuffleArray([...TYPES]);
    }
    draw() {
      if (this.bag.length === 0) this.refill();
      return this.bag.pop();
    }
  }

  class Piece {
    constructor(type) {
      this.type = type; this.color = COLORS[type];
      this.shape = SHAPES[type].map(r => r.slice());
      const baseX = ((COLS / 2) | 0) - ((this.shape[0].length / 2) | 0);
      this.x = (type === 'O' || type === 'I') ? baseX : baseX - 1;
      this.y = -1; 
      this.rot = 0;
    }
  }

  class Tetris {
    constructor(config = {}) {
      // Configuration
      this.config = Object.assign({
        canvasId: 'game',
        holdCanvasId: 'hold',
        nextCanvasClass: 'next-piece', // fallback
        ppsId: 'pps',
        apmId: 'apm',
        scoreId: 'score', // Added for single player stats
        linesId: 'lines',
        levelId: 'level',
        garbageId: 'garbage', // visual gauge
        overlayId: 'overlay',
        isBot: false,
        botPPS: 1,
        input: true,
        gameMode: 'single', // 'single' or 'versus'
        onGameOver: null, // Callback for game over
        onAttack: null, // Callback for sending garbage
        onGridChange: null, // Callback for grid updates
        onMove: null, // Callback for piece movement
        onHold: null, // Callback for hold
        onGarbageChange: null, // Callback for garbage queue change
        isRemote: false, // If true, this instance is a passive renderer
        timeLimit: 0, // Time limit in ms (0 = infinite)
        allowPause: true
      }, config);

      // DOM Elements
      this.canvas = document.getElementById(this.config.canvasId);
      if (!this.canvas) return; 
      this.ctx = this.canvas.getContext('2d');
      
      this.holdCanvas = document.getElementById(this.config.holdCanvasId);
      this.hctx = this.holdCanvas ? this.holdCanvas.getContext('2d') : null;
      
      // Timer Element
      this.timerEl = document.getElementById('timer1');
      if (this.timerEl) this.timerEl.textContent = '2:00'; // Reset timer display
      
      this.nextCanvases = [];
      this.nextContexts = [];
      
      if (this.config.nextElements) {
        this.nextCanvases = this.config.nextElements;
      } else if (this.config.nextCanvasClass) {
        this.nextCanvases = Array.from(document.querySelectorAll('.' + this.config.nextCanvasClass));
      }
      this.nextContexts = this.nextCanvases.map(c => c.getContext('2d'));

      // Calculate cell size
      const originalCanvasWidth = this.canvas.width;
      this.cell = Math.floor(originalCanvasWidth / COLS);
      this.canvas.height = ROWS * this.cell; 

      // UI Elements
      this.ppsEl = document.getElementById(this.config.ppsId);
      this.apmEl = document.getElementById(this.config.apmId);
      this.scoreEl = document.getElementById(this.config.scoreId);
      this.linesEl = document.getElementById(this.config.linesId);
      this.levelEl = document.getElementById(this.config.levelId);
      this.garbageEl = document.getElementById(this.config.garbageId);
      this.overlayEl = document.getElementById(this.config.overlayId);

      // Game State
      this.grid = createMatrix(ROWS, COLS, 0);
      this.level = 1; // Used for gravity speed
      this.score = 0;
      this.lines = 0;
      this.dropInterval = 1000;
      this.acc = 0; this.last = 0; this.paused = false;
      this.bag = new Bag();
      this.current = new Piece(this.bag.draw());
      this.nextQueue = [];
      for (let i = 0; i < 5; i++) {
        this.nextQueue.push(this.bag.draw());
      }
      this.held = null;
      this.canHold = true;
      this.restartHoldStart = null;
      this.restartHoldDuration = 1000;
      this.lockDelay = SETTINGS.lockDelay;
      this.groundedSince = null;
      this.isGameOver = false;
      
      // Stats
      this.startTime = null;
      this.piecesPlaced = 0;
      this.attacksSent = 0;
      this.timeLimit = this.config.timeLimit;
      
      // Force initial HUD update for timer
      this.updateHUD();
      
      // Attack / Garbage System
      this.opponent = null;
      this.garbageQueue = []; // Array of {lines: int, hole: int}
      
      // Input State
      this.moveDir = 0;
      this.dasTimer = null;
      this.arrInterval = null;
      this.softDropping = false;
      this.softAcc = 0;
      this.keysDown = new Set();
      this.edgePressed = new Set();
      this.lastHorizontalPressDir = 0;

      // Scoring State (Used for Attack Calc)
      this.backToBack = false;
      this.combo = 0;
      this.softDropDistance = 0;
      this.hardDropDistance = 0;
      this.lastActionWasDifficult = false;
      this.lastRotationWasTSpin = false;
      this.lastRotationAtMerge = 0;
      this.currentPieceStartY = this.current.y;

      // Bot State
      this.bot = null; 
      this.botTimer = 0;

      if (this.config.input) {
        this.bindKeys();
        this.bindSettingsUI();
      }

      this.startTime = Date.now();
      this.animationFrameId = requestAnimationFrame(t => this.loop(t));
      this.draw(); this.drawNext(); this.drawHold(); this.updateHUD();
    }

    setOpponent(opp) {
        this.opponent = opp;
    }

    setCurrentPiece(data) {
        if (!data) return;
        // Don't create new Piece instance every time to avoid GC churn if possible,
        // but for simplicity/correctness we can just update props or new instance.
        // Data should have { type, x, y, rot }
        if (this.current.type !== data.type) {
            this.current = new Piece(data.type);
        }
        this.current.x = data.x;
        this.current.y = data.y;
        this.current.rot = data.rot;
        // Update shape based on rotation
        this.current.shape = SHAPES[data.type].map(r => r.slice());
        for(let i=0; i<data.rot; i++) {
             this.current.shape = rotate(this.current.shape);
        }
    }
    
    setHeldPiece(type) {
        this.held = type;
        this.drawHold();
    }

    setGrid(newGrid) {
        this.grid = newGrid;
    }
    
    setGarbageQueue(queue) {
        this.garbageQueue = queue;
        this.updateGarbageGauge();
    }

    stop() {
        cancelAnimationFrame(this.animationFrameId);
        this.isGameOver = true;
    }

    sendGarbage(amount) {
        if (amount <= 0) return;
        
        // 1. Cancel own garbage first
        while (amount > 0 && this.garbageQueue.length > 0) {
            const batch = this.garbageQueue[0];
            if (batch.lines <= amount) {
                amount -= batch.lines;
                this.garbageQueue.shift();
            } else {
                batch.lines -= amount;
                amount = 0;
            }
        }
        this.updateGarbageGauge();

        // 2. Send remainder to opponent
        if (amount > 0) {
            this.attacksSent += amount;
            if (this.config.onAttack) {
                this.config.onAttack(amount);
            } else if (this.opponent && !this.opponent.isGameOver) {
                this.opponent.receiveGarbage(amount);
            }
        }
    }

    receiveGarbage(amount) {
        // Generate a random hole for this batch
        const hole = Math.floor(Math.random() * COLS);
        this.garbageQueue.push({ lines: amount, hole: hole });
        this.updateGarbageGauge();
        if (this.config.onGarbageChange) this.config.onGarbageChange(this.garbageQueue);
    }

    spawnGarbage() {
        if (this.garbageQueue.length === 0) return;
        
        let linesToSpawn = 0;
        // Cap total lines per turn at 8
        const CAP = 8;
        
        // Calculate total available garbage
        let totalGarbage = 0;
        for(const batch of this.garbageQueue) totalGarbage += batch.lines;
        
        const spawnAmount = Math.min(totalGarbage, CAP);
        if (spawnAmount === 0) return;

        // Check for instant top out BEFORE spawning
        if (this.grid[spawnAmount - 1].some(c => c !== 0)) {
             // If any block exists in the top 'spawnAmount' rows, pushing up will kill player
             this.gameOver();
             return;
        }

        let spawned = 0;
        while (spawned < spawnAmount && this.garbageQueue.length > 0) {
            const batch = this.garbageQueue[0];
            const linesFromBatch = Math.min(batch.lines, spawnAmount - spawned);
            
            for (let i = 0; i < linesFromBatch; i++) {
                this.grid.shift();
                const line = Array(COLS).fill('G');
                line[batch.hole] = 0;
                this.grid.push(line);
            }
            
            spawned += linesFromBatch;
            batch.lines -= linesFromBatch;
            if (batch.lines <= 0) this.garbageQueue.shift();
        }
        
        this.updateGarbageGauge();
        if (this.config.onGarbageChange) this.config.onGarbageChange(this.garbageQueue);
        
        if (this.config.onGridChange) this.config.onGridChange(this.grid);
        
        // Adjust current piece position to stay valid relative to screen
        // If piece collides after grid shift (because grid moved up into it), move piece up
        if (this.collide(this.current.shape, this.current.y, this.current.x)) {
            let moved = false;
            for (let dy = 1; dy <= ROWS; dy++) {
                if (!this.collide(this.current.shape, this.current.y - dy, this.current.x)) {
                    this.current.y -= dy;
                    moved = true;
                    break;
                }
            }
            if (!moved) {
                this.gameOver();
            }
        }
    }

    bindKeys() {
        const normalizeKey = (key) => {
          if (key.length === 1 && key.match(/[a-z]/i)) return key.toLowerCase();
          return key;
        };
  
        window.addEventListener('keydown', e => {
          if (this.isGameOver) return;
          const key = e.key;
          const normalizedKey = normalizeKey(key);
          
          if (!this.config.allowPause) {
              const pauseKey = normalizeKey(KEYBINDS.pause);
              const restartKey = normalizeKey(KEYBINDS.restart);
              if (normalizedKey === pauseKey || normalizedKey === restartKey) {
                  return; 
              }
          }

          const restartKey = normalizeKey(KEYBINDS.restart);
          if (normalizedKey === restartKey && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && this.config.allowPause) {
            e.preventDefault();
            if (this.restartHoldStart === null) this.restartHoldStart = Date.now();
          }
  
          const gameKeys = [
            KEYBINDS.moveLeft, KEYBINDS.moveRight, KEYBINDS.softDrop,
            KEYBINDS.rotateCW, KEYBINDS.hardDrop, KEYBINDS.rotate180,
            KEYBINDS.hold, KEYBINDS.pause, KEYBINDS.restart, KEYBINDS.rotateCCW
          ].map(k => normalizeKey(k));
  
          if (gameKeys.includes(normalizedKey)) e.preventDefault();
  
          const wasDown = this.keysDown.has(normalizedKey);
          this.keysDown.add(normalizedKey);
          if (!wasDown) this.edgePressed.add(normalizedKey);
  
          const leftKey = normalizeKey(KEYBINDS.moveLeft);
          const rightKey = normalizeKey(KEYBINDS.moveRight);
          if (normalizedKey === leftKey) this.lastHorizontalPressDir = -1;
          if (normalizedKey === rightKey) this.lastHorizontalPressDir = 1;
        });
  
        window.addEventListener('keyup', e => {
          const key = e.key;
          const normalizedKey = normalizeKey(key);
          const restartKey = normalizeKey(KEYBINDS.restart);
          
          if (normalizedKey === restartKey) this.restartHoldStart = null;
          this.keysDown.delete(normalizedKey);
        });
    }

    processInputs() {
        if (!this.config.input || this.isGameOver) return; 

        const normalizeKey = (key) => {
          if (key.length === 1 && key.match(/[a-z]/i)) return key.toLowerCase();
          return key;
        };
  
        const pauseKey = normalizeKey(KEYBINDS.pause);
        const rotateCWKey = normalizeKey(KEYBINDS.rotateCW);
        const rotateCCWKey = normalizeKey(KEYBINDS.rotateCCW);
        const rotate180Key = normalizeKey(KEYBINDS.rotate180);
        const holdKey = normalizeKey(KEYBINDS.hold);
        const hardDropKey = normalizeKey(KEYBINDS.hardDrop);
        const leftKey = normalizeKey(KEYBINDS.moveLeft);
        const rightKey = normalizeKey(KEYBINDS.moveRight);
        const softDropKey = normalizeKey(KEYBINDS.softDrop);
  
        if (this.config.allowPause && this.edgePressed.has(pauseKey)) this.togglePause();
        if (this.paused) { this.edgePressed.clear(); return; }
  
        if (this.edgePressed.has(rotateCWKey)) this.rotate();
        if (this.edgePressed.has(rotateCCWKey)) this.rotateCCW();
        if (this.edgePressed.has(rotate180Key)) this.rotate180();
        if (this.edgePressed.has(holdKey)) this.hold();
        if (this.edgePressed.has(hardDropKey)) this.hardDrop();
  
        const leftHeld = this.keysDown.has(leftKey);
        const rightHeld = this.keysDown.has(rightKey);
        let desiredDir = 0;
        if (leftHeld && !rightHeld) desiredDir = -1;
        else if (!leftHeld && rightHeld) desiredDir = 1;
        else if (leftHeld && rightHeld) desiredDir = this.lastHorizontalPressDir;
  
        if (desiredDir !== 0) {
          if (this.moveDir !== desiredDir) this.startHorizontal(desiredDir);
        } else {
          if (this.moveDir !== 0) this.stopHorizontal(this.moveDir);
        }
  
        const downHeld = this.keysDown.has(softDropKey);
        if (downHeld && !this.softDropping) this.startSoftDrop();
        if (!downHeld && this.softDropping) this.stopSoftDrop();
  
        this.edgePressed.clear();
    }
    
    bindSettingsUI() {
        const dasRange = document.getElementById('dasRange');
        const arrRange = document.getElementById('arrRange');
        const sdcRange = document.getElementById('sdcRange');
        const dasValue = document.getElementById('dasValue');
        const arrValue = document.getElementById('arrValue');
        const sdcValue = document.getElementById('sdcValue');
        const modal = document.getElementById('settingsModal');
        const openBtn = document.getElementById('settingsBtn');
        const closeBtn = document.getElementById('settingsClose');
  
        if (!dasRange || !arrRange || !sdcRange) return;
  
        let rebindingAction = null;
        let rebindingBtn = null;
  
        const openModal = () => {
          modal.classList.add('open');
          modal.setAttribute('aria-hidden', 'false');
        };
        const stopRebinding = () => {
          if (rebindingBtn) {
            rebindingBtn.classList.remove('waiting');
            rebindingBtn = null;
          }
          rebindingAction = null;
        };
        const closeModal = () => {
          stopRebinding();
          modal.classList.remove('open');
          modal.setAttribute('aria-hidden', 'true');
        };
        if (openBtn) openBtn.addEventListener('click', openModal);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (modal) modal.addEventListener('click', (e) => {
          const target = e.target;
          if (target && target.getAttribute && target.getAttribute('data-close') === 'modal') closeModal();
        });
  
        dasRange.value = String(SETTINGS.das);
        arrRange.value = String(SETTINGS.arr);
        if (isFinite(SETTINGS.softDropCps)) {
          sdcRange.value = String(SETTINGS.softDropCps);
        } else {
          sdcRange.value = String(sdcRange.max);
        }
        if (dasValue) dasValue.textContent = String(SETTINGS.das);
        if (arrValue) arrValue.textContent = String(SETTINGS.arr);
        if (sdcValue) sdcValue.textContent = isFinite(SETTINGS.softDropCps) ? String(SETTINGS.softDropCps) : '∞';
  
        dasRange.addEventListener('input', () => {
          const v = Math.max(0, parseInt(dasRange.value, 10) || 0);
          SETTINGS.das = v;
          if (dasValue) dasValue.textContent = String(v);
          try { localStorage.setItem('tetris.das', String(v)); } catch {}
        });
  
        arrRange.addEventListener('input', () => {
          const v = Math.max(0, parseInt(arrRange.value, 10) || 0);
          SETTINGS.arr = v;
          if (arrValue) arrValue.textContent = String(v);
          try { localStorage.setItem('tetris.arr', String(v)); } catch {}
          if (this.moveDir !== 0) {
            const dir = this.moveDir;
            this.stopHorizontal(dir);
            this.startHorizontal(dir);
          }
        });
  
        const updateSoftDropUI = () => {
          if (sdcValue) sdcValue.textContent = isFinite(SETTINGS.softDropCps) ? String(SETTINGS.softDropCps) : '∞';
        };
  
        sdcRange.addEventListener('input', () => {
          const valueNum = Math.max(1, parseInt(sdcRange.value, 10) || 1);
          const maxNum = Math.max(1, parseInt(sdcRange.max, 10) || 1);
          if (valueNum >= maxNum) {
            SETTINGS.softDropCps = Infinity;
            try { localStorage.setItem('tetris.softDropCps', 'inf'); } catch {}
          } else {
            SETTINGS.softDropCps = valueNum;
            try { localStorage.setItem('tetris.softDropCps', String(valueNum)); } catch {}
          }
          updateSoftDropUI();
        });
  
        const formatKeyForDisplay = (key) => {
          if (key === ' ') return 'Space';
          if (key === 'ArrowLeft') return '←';
          if (key === 'ArrowRight') return '→';
          if (key === 'ArrowUp') return '↑';
          if (key === 'ArrowDown') return '↓';
          if (key === 'Control') return 'Ctrl';
          if (key.length === 1 && key.match(/[a-z]/i)) return key.toUpperCase();
          return key;
        };
  
        const updateKeybindDisplay = () => {
          const keybindBtns = document.querySelectorAll('.keybind-btn');
          keybindBtns.forEach(btn => {
            const action = btn.getAttribute('data-action');
            if (action && KEYBINDS[action]) {
              const keySpan = btn.querySelector('.keybind-key');
              if (keySpan) keySpan.textContent = formatKeyForDisplay(KEYBINDS[action]);
            }
          });
        };
  
        updateKeybindDisplay();
  
        const startRebinding = (action, btn) => {
          stopRebinding();
          rebindingAction = action;
          rebindingBtn = btn;
          btn.classList.add('waiting');
          const keySpan = btn.querySelector('.keybind-key');
          if (keySpan) keySpan.textContent = 'Press key...';
        };
  
        const keybindCaptureHandler = (e) => {
          if (!rebindingAction) return;
          e.preventDefault(); e.stopPropagation();
          const key = e.key;
          if (key === 'Escape') {
            stopRebinding(); updateKeybindDisplay(); return;
          }
          if (key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta') {
            window.addEventListener('keydown', keybindCaptureHandler, { once: true, capture: true });
            return;
          }
          let conflict = false;
          for (const [otherAction, otherKey] of Object.entries(KEYBINDS)) {
            if (otherAction !== rebindingAction && otherKey === key) {
              conflict = true; break;
            }
          }
          if (!conflict) {
            KEYBINDS[rebindingAction] = key;
            try { localStorage.setItem('tetris.keybinds', JSON.stringify(KEYBINDS)); } catch {}
            stopRebinding(); updateKeybindDisplay();
          } else {
            const keySpan = rebindingBtn.querySelector('.keybind-key');
            if (keySpan) {
              const originalText = keySpan.textContent;
              keySpan.textContent = 'Already bound!';
              setTimeout(() => {
                keySpan.textContent = originalText;
                window.addEventListener('keydown', keybindCaptureHandler, { once: true, capture: true });
              }, 1000);
            }
          }
        };
  
        const keybindBtns = document.querySelectorAll('.keybind-btn');
        keybindBtns.forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            const action = btn.getAttribute('data-action');
            if (action) {
              startRebinding(action, btn);
              window.addEventListener('keydown', keybindCaptureHandler, { once: true, capture: true });
            }
          });
        });
  
        const resetBtn = document.getElementById('resetKeybinds');
        if (resetBtn) {
          resetBtn.addEventListener('click', () => {
            Object.assign(KEYBINDS, DEFAULT_KEYBINDS);
            try { localStorage.setItem('tetris.keybinds', JSON.stringify(KEYBINDS)); } catch {}
            updateKeybindDisplay(); stopRebinding();
          });
        }
    }

    togglePause() { this.paused = !this.paused; }

    loop(t) {
      if (this.isGameOver) return;
      const dt = t - this.last; this.last = t;

      if (this.config.isRemote) {
          this.draw();
          this.updateHUD(); // Update stats if we're syncing them
          this.animationFrameId = requestAnimationFrame(tt => this.loop(tt));
          return;
      }
      
      if (this.config.allowPause && this.restartHoldStart !== null) {
        const holdTime = Date.now() - this.restartHoldStart;
        if (holdTime >= this.restartHoldDuration) {
          this.reset();
          this.restartHoldStart = null;
        }
      }
      
      this.processInputs();
      
      if (this.config.isBot && !this.paused && this.bot && !this.isGameOver) {
         this.botTimer += dt;
         const moveInterval = 1000 / this.config.botPPS;
         if (this.botTimer > moveInterval) {
             this.bot.update(); 
             this.botTimer = 0;
         }
      }

      if (!this.paused && !this.isGameOver) {
        // Time Limit Check
        if (this.timeLimit > 0) {
            const elapsed = Date.now() - this.startTime;
            if (elapsed >= this.timeLimit) {
                this.isGameOver = true;
                this.updateHUD(); // Ensure final time is shown
                this.gameOver();
                return;
            }
        }

        this.acc += dt;
        if (this.acc > this.dropInterval) { this.drop(); this.acc = 0; }
        
        if (this.softDropping && isFinite(SETTINGS.softDropCps)) {
          this.softAcc += dt;
          const msPerCell = 1000 / SETTINGS.softDropCps;
          while (this.softAcc >= msPerCell) {
            this.softAcc -= msPerCell;
            const ny = this.current.y + 1;
            if (!this.collide(this.current.shape, ny, this.current.x)) {
              this.current.y = ny;
              this.softDropDistance++;
              this.refreshGrounded();
            } else {
              this.refreshGrounded();
              this.tryLock();
              break;
            }
          }
        }
      }
      
      this.updateHUD();
      this.draw();
      this.updateOverlay();
      this.animationFrameId = requestAnimationFrame(tt => this.loop(tt));
    }

    collide(shape, offY, offX) {
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (!shape[y][x]) continue;
          const yy = y + offY, xx = x + offX;
          if (yy >= ROWS || xx < 0 || xx >= COLS || (yy >= 0 && this.grid[yy][xx])) return true;
        }
      }
      return false;
    }

    // Input Handling
    startHorizontal(dir) {
      if (this.moveDir === dir) return;
      this.clearHorizontalTimers();
      this.moveDir = dir;
      this.move(dir);
      if (SETTINGS.arr === 0) {
        this.dasTimer = setTimeout(() => {
          while (!this.collide(this.current.shape, this.current.y, this.current.x + dir)) {
            this.current.x += dir;
          }
          this.refreshGrounded();
        }, SETTINGS.das);
      } else {
        this.dasTimer = setTimeout(() => {
          this.arrInterval = setInterval(() => {
            this.move(dir);
          }, SETTINGS.arr);
        }, SETTINGS.das);
      }
    }

    stopHorizontal(dir) {
      if (this.moveDir === dir) {
        this.moveDir = 0;
        this.clearHorizontalTimers();
      }
    }

    clearHorizontalTimers() {
      if (this.dasTimer) { clearTimeout(this.dasTimer); this.dasTimer = null; }
      if (this.arrInterval) { clearInterval(this.arrInterval); this.arrInterval = null; }
    }

    startSoftDrop() {
      if (this.softDropping) return;
      if (!isFinite(SETTINGS.softDropCps)) {
        while (!this.collide(this.current.shape, this.current.y + 1, this.current.x)) {
          this.current.y += 1;
        }
        this.refreshGrounded();
      } else {
        this.softDropping = true;
        this.softAcc = 0;
      }
    }

    stopSoftDrop() {
      this.softDropping = false;
      this.softAcc = 0;
    }

    isTouchingGround() {
      return this.collide(this.current.shape, this.current.y + 1, this.current.x);
    }

    refreshGrounded() {
      if (this.isTouchingGround()) {
        if (this.groundedSince === null) this.groundedSince = Date.now();
      } else {
        this.groundedSince = null;
      }
    }

    tryLock() {
      if (this.groundedSince !== null) {
        if (Date.now() - this.groundedSince >= this.lockDelay) {
          this.merge();
        }
      }
    }

    merge() {
      const s = this.current.shape; const oy = this.current.y; const ox = this.current.x;
      const wasTSpin = this.current.type === 'T' && this.isTSpin();
      this.lastRotationAtMerge = this.current.rot;
      
      // Check hard drop score
      if (this.currentPieceStartY !== null && this.hardDropDistance === 0) {
        this.hardDropDistance = Math.max(0, oy - this.currentPieceStartY);
      }

      for (let y = 0; y < s.length; y++) for (let x = 0; x < s[y].length; x++) {
        if (s[y][x] && oy + y >= 0) this.grid[oy + y][ox + x] = this.current.type;
      }
      
      this.lastRotationWasTSpin = wasTSpin;
      this.piecesPlaced++;
      this.clearLines(); 
      
      const linesCleared = this.lastLinesCleared || 0; 
      if (linesCleared === 0) {
          this.spawnGarbage();
      }

      // Check Game Over (spawn collision)
      this.current = new Piece(this.nextQueue.shift());
      this.nextQueue.push(this.bag.draw());
      this.canHold = true;
      this.groundedSince = null;
      this.softDropDistance = 0;
      this.hardDropDistance = 0;
      this.currentPieceStartY = this.current.y;
      this.lastRotationWasTSpin = false;
      this.lastRotationAtMerge = 0;
      this.drawNext();
      
      if (this.collide(this.current.shape, this.current.y, this.current.x)) {
          this.gameOver();
      } else {
          if (this.config.onGridChange) this.config.onGridChange(this.grid);
      }
    }

    gameOver() {
        this.isGameOver = true;
        this.updateOverlay();
        if (this.config.onGameOver) {
            this.config.onGameOver(this);
        } else if (this.config.gameMode === 'single') {
            // Check if time limit reached for Highscore mode
            if (this.timeLimit > 0 && Date.now() - this.startTime >= this.timeLimit) {
                // Time's up! Show result modal instead of instant restart
                
                // Save Highscore
                try {
                    const currentBest = parseInt(localStorage.getItem('tetris.ultraHighScore') || '0');
                    if (this.score > currentBest) {
                        localStorage.setItem('tetris.ultraHighScore', this.score.toString());
                    }
                } catch (e) {
                    console.error('Failed to save highscore', e);
                }

                const title = document.getElementById('resultTitle');
                const msg = document.getElementById('resultMessage');
                const modal = document.getElementById('resultModal');
                
                if (title) title.textContent = "Time's Up!";
                if (msg) msg.textContent = `Final Score: ${this.score}`;
                if (modal) {
                    modal.classList.add('open');
                    modal.setAttribute('aria-hidden', 'false');
                }
            } else {
                // Instant restart for single player normal death
                setTimeout(() => this.reset(), 1000); 
            }
        }
    }

    reset() {
      this.grid = createMatrix(ROWS, COLS, 0);
      this.level = 1; this.dropInterval = 1000;
      this.score = 0; this.lines = 0;
      this.bag = new Bag();
      this.current = new Piece(this.bag.draw());
      this.nextQueue = [];
      for (let i = 0; i < 5; i++) {
        this.nextQueue.push(this.bag.draw());
      }
      this.held = null; this.canHold = true;
      this.restartHoldStart = null;
      this.paused = false;
      this.groundedSince = null;
      this.backToBack = false;
      this.combo = 0;
      this.currentPieceStartY = this.current.y;
      this.piecesPlaced = 0;
      this.attacksSent = 0;
      this.startTime = Date.now();
      this.garbageQueue = []; // Reset queue
      this.isGameOver = false;
      this.updateGarbageGauge();
      this.drawHold();
      this.drawNext();
      this.updateHUD();
      this.draw();
      
      // If loop stopped, restart it
      cancelAnimationFrame(this.animationFrameId);
      this.last = performance.now();
      this.animationFrameId = requestAnimationFrame(t => this.loop(t));
    }

    // Scoring & Logic
    isTSpin() {
      if (this.current.type !== 'T') return false;
      const px = this.current.x; const py = this.current.y; const shape = this.current.shape;
      let centerX = -1, centerY = -1;
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            let neighbors = 0;
            if (y > 0 && shape[y-1][x]) neighbors++;
            if (y < shape.length - 1 && shape[y+1][x]) neighbors++;
            if (x > 0 && shape[y][x-1]) neighbors++;
            if (x < shape[y].length - 1 && shape[y][x+1]) neighbors++;
            if (neighbors === 3) { centerX = px + x; centerY = py + y; break; }
          }
        }
        if (centerX !== -1) break;
      }
      if (centerX === -1 || centerY === -1) return false;
      const corners = [[centerX - 1, centerY - 1], [centerX + 1, centerY - 1], [centerX - 1, centerY + 1], [centerX + 1, centerY + 1]];
      let filledCorners = 0;
      for (const [cx, cy] of corners) {
        if (cy < 0 || cy >= ROWS || cx < 0 || cx >= COLS || this.grid[cy][cx]) filledCorners++;
      }
      return filledCorners >= 3;
    }

    isMiniTSpin() {
      if (this.current.type !== 'T') return false;
      if (!this.isTSpin()) return false;
      return this.current.rot === 1 || this.current.rot === 3;
    }

    isPerfectClear() {
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (this.grid[y][x]) return false;
      return true;
    }

    clearLines() {
      let cleared = 0;
      for (let y = ROWS - 1; y >= 0; y--) {
        if (this.grid[y].every(v => v)) {
          this.grid.splice(y, 1);
          this.grid.unshift(Array(COLS).fill(0));
          cleared++;
          y++;
        }
      }
      this.lastLinesCleared = cleared;
      
      const isTSpinAction = this.lastRotationWasTSpin;
      const isMiniTSpin = isTSpinAction && (this.lastRotationAtMerge === 1 || this.lastRotationAtMerge === 3);
      const isTetris = cleared === 4;
      const isDifficult = isTSpinAction || isTetris;
      
      // Calculate Score (Single Player)
      if (cleared > 0) {
          let baseScore = 0;
          if (isTSpinAction) {
              if (cleared === 0) baseScore = isMiniTSpin ? 100 : 400;
              else if (cleared === 1) baseScore = isMiniTSpin ? 200 : 800;
              else if (cleared === 2) baseScore = isMiniTSpin ? 400 : 1200;
              else if (cleared === 3) baseScore = 1600;
          } else {
              const scores = [0, 100, 300, 500, 800];
              baseScore = scores[cleared];
          }
          baseScore *= this.level;
          if (isDifficult && this.backToBack) baseScore = Math.floor(baseScore * 1.5);
          if (this.combo > 0) baseScore += 50 * this.combo * this.level;
          baseScore += this.softDropDistance + (this.hardDropDistance * 2);
          if (this.isPerfectClear()) baseScore += 2000 * this.level;
          
          this.score += baseScore;
          this.lines += cleared;
          if (this.lines >= this.level * 10) {
              this.level++;
              this.dropInterval = Math.max(120, 1000 - (this.level - 1) * 80);
          }
      }

      // Calculate Attack (Versus)
      if (cleared > 0) {
        let attack = 0;
        if (isTSpinAction) {
            if (cleared === 1) attack = isMiniTSpin ? 0 : 2;
            else if (cleared === 2) attack = isMiniTSpin ? 1 : 4;
            else if (cleared === 3) attack = 6;
        } else {
            if (cleared === 2) attack = 1;
            else if (cleared === 3) attack = 2;
            else if (cleared === 4) attack = 4;
        }
        if (isDifficult) {
            if (this.backToBack) attack += 1;
            this.backToBack = true;
        } else {
            this.backToBack = false;
        }
        const comboAttack = Math.floor((this.combo - 1) / 2);
        if (this.combo >= 2) attack += Math.max(1, comboAttack);
        if (this.isPerfectClear()) attack += 10;
        
        this.combo++;
        this.sendGarbage(attack);
      } else {
        this.combo = 0;
      }
    }

    triggerMoveEvent() {
        if (this.config.onMove) {
            this.config.onMove({
                type: this.current.type,
                x: this.current.x,
                y: this.current.y,
                rot: this.current.rot
            });
      }
    }

    move(dir) {
      const nx = this.current.x + dir;
      if (!this.collide(this.current.shape, this.current.y, nx)) {
        this.current.x = nx;
        this.refreshGrounded();
        this.triggerMoveEvent();
      }
    }

    tryRotate(direction) {
      const from = this.current.rot;
      const to = (from + (direction === 1 ? 1 : 3)) % 4;
      const key = `${from}>${to}`;
      const rotatedShape = direction === 1 ? rotate(this.current.shape) : rotateCCW(this.current.shape);
      const type = this.current.type;
      const kicks = type === 'I' ? (KICKS_I[key] || [[0,0]]) : type === 'O' ? (KICKS_O[key] || [[0,0]]) : (KICKS_JLSTZ[key] || [[0,0]]);

      for (let i = 0; i < kicks.length; i++) {
        const [dx, dy] = kicks[i];
        const nx = this.current.x + dx;
        const ny = this.current.y + dy;
        if (!this.collide(rotatedShape, ny, nx)) {
          this.current.shape = rotatedShape;
          this.current.x = nx;
          this.current.y = ny;
          this.current.rot = to;
          this.refreshGrounded();
          if (this.current.type === 'T') {
            this.lastRotationWasTSpin = this.isTSpin();
          }
          this.triggerMoveEvent();
          return true;
        }
      }
      return false;
    }

    rotate() { this.tryRotate(1); }
    rotateCCW() { this.tryRotate(-1); }

    rotate180() {
      const from = this.current.rot;
      const to = (from + 2) % 4;
      const key = `${from}>${to}`;
      const rotatedShape = rotate180(this.current.shape);
      const type = this.current.type;
      const kicks = type === 'I' ? (KICKS_180_I[key] || [[0,0]]) : type === 'O' ? (KICKS_180_O[key] || [[0,0]]) : (KICKS_180_JLSTZ[key] || [[0,0]]);

      for (let i = 0; i < kicks.length; i++) {
        const [dx, dy] = kicks[i];
        const nx = this.current.x + dx;
        const ny = this.current.y + dy;
        if (!this.collide(rotatedShape, ny, nx)) {
          this.current.shape = rotatedShape;
          this.current.x = nx;
          this.current.y = ny;
          this.current.rot = to;
          this.refreshGrounded();
          if (this.current.type === 'T') {
            this.lastRotationWasTSpin = this.isTSpin();
          }
          this.triggerMoveEvent();
          return true;
        }
      }
      return false;
    }

    drop() {
      const ny = this.current.y + 1;
      if (!this.collide(this.current.shape, ny, this.current.x)) {
        this.current.y = ny;
        this.refreshGrounded();
        this.triggerMoveEvent();
      } else {
        this.refreshGrounded();
        this.tryLock();
      }
    }

    hardDrop() {
      const startY = this.current.y;
      while (!this.collide(this.current.shape, this.current.y + 1, this.current.x)) {
        this.current.y++;
      }
      this.hardDropDistance = Math.max(0, this.current.y - startY);
      this.merge();
    }

    hold() {
      if (!this.canHold) return;
      if (this.held === null) {
        this.held = this.current.type;
        this.current = new Piece(this.nextQueue.shift());
        this.nextQueue.push(this.bag.draw());
      } else {
        const temp = this.current.type;
        this.current = new Piece(this.held);
        this.held = temp;
      }
      this.canHold = false;
      this.groundedSince = null;
      this.currentPieceStartY = this.current.y;
      this.lastRotationWasTSpin = false;
      this.lastRotationAtMerge = 0;
      this.drawHold();
      this.drawNext();
      if (this.config.onHold) this.config.onHold(this.held);
    }
    
    drawCell(gx, gy, type) {
      const x = gx * this.cell, y = gy * this.cell; const col = COLORS[type] || '#90a4ae';
      this.ctx.fillStyle = col; this.ctx.fillRect(x, y, this.cell, this.cell);
      this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      this.ctx.strokeRect(x + 0.5, y + 0.5, this.cell - 1, this.cell - 1);
    }

    getGhostY() {
      let ghostY = this.current.y;
      while (!this.collide(this.current.shape, ghostY + 1, this.current.x)) {
        ghostY++;
      }
      return ghostY;
    }

    drawGhost() {
      const ghostY = this.getGhostY();
      if (ghostY === this.current.y) return;
      
      const s = this.current.shape;
      this.ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      this.ctx.lineWidth = 2;
      
      for (let y = 0; y < s.length; y++) {
        for (let x = 0; x < s[y].length; x++) {
          if (!s[y][x]) continue;
          const gy = ghostY + y;
          const gx = this.current.x + x;
          if (gy < 0) continue;
          
          const px = gx * this.cell;
          const py = gy * this.cell;
          this.ctx.strokeRect(px + 1, py + 1, this.cell - 2, this.cell - 2);
        }
      }
      this.ctx.lineWidth = 1;
    }

    drawGrid() {
      this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      this.ctx.lineWidth = 1;
      
      for (let x = 0; x <= COLS; x++) {
        const px = x * this.cell;
        this.ctx.beginPath();
        this.ctx.moveTo(px + 0.5, 0);
        this.ctx.lineTo(px + 0.5, ROWS * this.cell);
        this.ctx.stroke();
      }
      
      for (let y = 0; y <= ROWS; y++) {
        const py = y * this.cell;
        this.ctx.beginPath();
        this.ctx.moveTo(0, py + 0.5);
        this.ctx.lineTo(COLS * this.cell, py + 0.5);
        this.ctx.stroke();
      }
    }

    draw() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.drawGrid();
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const v = this.grid[y][x]; if (v) this.drawCell(x, y, v);
      }
      this.drawGhost();
      const s = this.current.shape;
      for (let y = 0; y < s.length; y++) for (let x = 0; x < s[y].length; x++) {
        if (!s[y][x]) continue; const gy = this.current.y + y; const gx = this.current.x + x; if (gy < 0) continue;
        this.drawCell(gx, gy, this.current.type);
      }
    }

    drawCenteredPiece(ctx, canvasWidth, canvasHeight, shape, type) {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      let minX = shape[0].length, maxX = -1, minY = shape.length, maxY = -1;
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
        }
      }
      const width = maxX - minX + 1; const height = maxY - minY + 1;
      const size = Math.max(width, height);
      const cellN = Math.floor(Math.min(canvasWidth, canvasHeight) / (size + 2));
      const totalWidth = cellN * width; const totalHeight = cellN * height;
      const offsetX = (canvasWidth - totalWidth) / 2 - minX * cellN;
      const offsetY = (canvasHeight - totalHeight) / 2 - minY * cellN;
      
      for (let y = 0; y < shape.length; y++) for (let x = 0; x < shape[y].length; x++) {
        if (!shape[y][x]) continue; const col = COLORS[type];
        ctx.fillStyle = col; ctx.fillRect(offsetX + x * cellN, offsetY + y * cellN, cellN, cellN);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.strokeRect(offsetX + x * cellN + 0.5, offsetY + y * cellN + 0.5, cellN - 1, cellN - 1);
      }
    }

    drawNext() {
      for (let i = 0; i < 5; i++) {
        if (i < this.nextQueue.length) {
          const type = this.nextQueue[i];
          const shape = SHAPES[type];
          if (this.nextContexts[i]) {
            this.drawCenteredPiece(this.nextContexts[i], this.nextCanvases[i].width, this.nextCanvases[i].height, shape, type);
          }
        } else if (this.nextContexts[i]) {
          this.nextContexts[i].clearRect(0, 0, this.nextCanvases[i].width, this.nextCanvases[i].height);
        }
      }
    }

    drawHold() {
      if (!this.holdCanvas || !this.hctx) return;
      if (this.held === null) {
        this.hctx.clearRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);
        return;
      }
      this.drawCenteredPiece(this.hctx, this.holdCanvas.width, this.holdCanvas.height, SHAPES[this.held], this.held);
    }

    updateOverlay() {
      if (!this.overlayEl) return;
      let text = null; let opacity = 1; let state = null;
      
      if (this.isGameOver) {
          text = 'Game Over';
          if (this.config.gameMode === 'versus') {
              // Note: Winner logic is handled in manager, but this is a fallback state
              text = 'Defeat'; 
              state = 'loser';
          }
      } else if (this.paused) { 
          text = 'Paused'; state = 'paused'; 
      } else if (this.restartHoldStart !== null) {
        const holdTime = Date.now() - this.restartHoldStart;
        opacity = Math.min(holdTime / this.restartHoldDuration, 1);
        text = 'Restarting'; state = 'restarting';
      }
      
      this.overlayEl.classList.remove('paused', 'restarting', 'winner', 'loser');
      
      if (text) {
        this.overlayEl.innerHTML = `<div class="overlay-backdrop" style="opacity: ${opacity}"></div><div class="overlay-content" style="opacity: ${opacity}">${text}</div>`;
        this.overlayEl.classList.add('visible');
        if (state) this.overlayEl.classList.add(state);
      } else {
        this.overlayEl.classList.remove('visible');
        this.overlayEl.innerHTML = '';
      }
    }

    updateHUD() {
      if (this.scoreEl) this.scoreEl.textContent = this.score;
      if (this.linesEl) this.linesEl.textContent = this.lines;
      if (this.levelEl) this.levelEl.textContent = this.level;
      
      if (this.ppsEl) {
          const duration = Math.max(0.1, (Date.now() - this.startTime) / 1000);
          const pps = this.piecesPlaced / duration;
          this.ppsEl.textContent = pps.toFixed(2);
      }
      if (this.apmEl) {
          const minutes = Math.max(0.001, (Date.now() - this.startTime) / 60000);
          const apm = this.attacksSent / minutes;
          this.apmEl.textContent = apm.toFixed(1);
      }
      
      // Update Timer
      if (this.timerEl && this.timeLimit > 0) {
          const elapsed = Date.now() - this.startTime;
          const remaining = Math.max(0, this.timeLimit - elapsed);
          const totalSeconds = Math.ceil(remaining / 1000);
          const mins = Math.floor(totalSeconds / 60);
          const secs = totalSeconds % 60;
          this.timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
      }
    }

    updateGarbageGauge() {
        if (!this.garbageEl) return;
        // Cap visual gauge at 20
        let totalGarbage = 0;
        for(const batch of this.garbageQueue) totalGarbage += batch.lines;
        const percentage = Math.min(100, (totalGarbage / 20) * 100);
        this.garbageEl.style.height = `${percentage}%`;
    }
  }
  
  // Expose Tetris class
  window.TetrisGame = Tetris;
  window.TetrisConstants = { ROWS, COLS, SHAPES, TYPES, KICKS_JLSTZ, KICKS_I, KICKS_O, KICKS_180_JLSTZ, KICKS_180_I, KICKS_180_O, createMatrix, rotate, rotateCCW, rotate180, COLORS };

})();
