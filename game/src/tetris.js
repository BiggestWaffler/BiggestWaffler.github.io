// Simple Modern Tetris implementation
// Grid: 10 x 20, canvas cell size inferred from canvas size

(function() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const holdCanvas = document.getElementById('hold');
  const hctx = holdCanvas.getContext('2d');
  
  // Setup next piece canvases
  const nextCanvases = [];
  const nextContexts = [];
  for (let i = 0; i < 5; i++) {
    const nextPieceEl = document.querySelectorAll('.next-piece')[i];
    nextCanvases.push(nextPieceEl);
    nextContexts.push(nextPieceEl.getContext('2d'));
  }

  // Store original canvas dimensions
  const originalCanvasWidth = canvas.width;

  const scoreEl = document.getElementById('score');
  const linesEl = document.getElementById('lines');
  const levelEl = document.getElementById('level');
  const overlayEl = document.getElementById('overlay');

  const COLS = 10; const ROWS = 20;
  
  // Calculate cell size based on original width
  const cell = Math.floor(originalCanvasWidth / COLS);
  // Set canvas display height
  canvas.height = ROWS * cell;

  // Colors per tetromino type
  const COLORS = {
    I: '#64b5f6', J: '#8e99f3', L: '#ffb74d', O: '#ffd54f',
    S: '#81c784', T: '#ce93d8', Z: '#e57373'
  };

  // Handling settings
  const SETTINGS = {
    // Delayed Auto Shift (ms before auto-repeat starts)
    das: 160,
    // Auto Repeat Rate (ms between repeats); 0 => Instant to wall
    arr: 30,
    // Soft drop speed (cells per second). Infinity => instant sonic drop
    softDropCps: 20,
    // Lock delay (ms)
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

  // Keybind configuration (loaded from localStorage or defaults)
  const KEYBINDS = { ...DEFAULT_KEYBINDS };

  // Load persisted values (excluding lockDelay which is dev-only)
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
      
      // Load keybinds
      const savedKeybinds = localStorage.getItem('tetris.keybinds');
      if (savedKeybinds) {
        try {
          const parsed = JSON.parse(savedKeybinds);
          Object.assign(KEYBINDS, parsed);
        } catch {}
      }
    } catch {}
  })();

  // Tetromino definitions (4x4 matrices)
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
    // Counter-clockwise rotation (rotate 3 times clockwise)
    return rotate(rotate(rotate(matrix)));
  }

  function rotate180(matrix) {
    // 180-degree rotation (rotate twice)
    return rotate(rotate(matrix));
  }

  // SRS kick tables (dx, dy)
  // JLSTZ
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

  // I piece kicks
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

  // O piece: no kicks (origin centered)
  const KICKS_O = {
    '0>1': [ [0,0] ], '1>2': [ [0,0] ], '2>3': [ [0,0] ], '3>0': [ [0,0] ],
    '1>0': [ [0,0] ], '2>1': [ [0,0] ], '3>2': [ [0,0] ], '0>3': [ [0,0] ],
  };

  // 180-degree kick tables (conservative, TETR.IO-style)
  // Keys correspond to orientation transitions: 0>2, 1>3, 2>0, 3>1
  // JLSTZ 180 kicks
  const KICKS_180_JLSTZ = {
    '0>2': [ [0,0], [0,1], [1,0], [-1,0], [0,-1], [1,1], [-1,1], [1,-1], [-1,-1], [0,2], [0,-2] ],
    '1>3': [ [0,0], [0,1], [1,0], [-1,0], [0,-1], [1,1], [-1,1], [1,-1], [-1,-1], [0,2], [0,-2] ],
    '2>0': [ [0,0], [0,1], [1,0], [-1,0], [0,-1], [1,1], [-1,1], [1,-1], [-1,-1], [0,2], [0,-2] ],
    '3>1': [ [0,0], [0,1], [1,0], [-1,0], [0,-1], [1,1], [-1,1], [1,-1], [-1,-1], [0,2], [0,-2] ],
  };

  // I piece 180 kicks (slightly broader horizontal tests)
  const KICKS_180_I = {
    '0>2': [ [0,0], [0,-1], [0,1], [1,0], [-1,0], [2,0], [-2,0], [1,-1], [-1,-1], [1,1], [-1,1], [0,-2], [0,2] ],
    '1>3': [ [0,0], [0,-1], [0,1], [1,0], [-1,0], [2,0], [-2,0], [1,-1], [-1,-1], [1,1], [-1,1], [0,-2], [0,2] ],
    '2>0': [ [0,0], [0,-1], [0,1], [1,0], [-1,0], [2,0], [-2,0], [1,-1], [-1,-1], [1,1], [-1,1], [0,-2], [0,2] ],
    '3>1': [ [0,0], [0,-1], [0,1], [1,0], [-1,0], [2,0], [-2,0], [1,-1], [-1,-1], [1,1], [-1,1], [0,-2], [0,2] ],
  };

  // O piece 180 kicks (no offset)
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
      if (this.bag.length === 0) {
        this.refill();
      }
      return this.bag.pop();
    }
  }

  class Piece {
    constructor(type) {
      this.type = type; this.color = COLORS[type];
      this.shape = SHAPES[type].map(r => r.slice());
      const baseX = ((COLS / 2) | 0) - ((this.shape[0].length / 2) | 0);
      // Move non-centered pieces (J, L, S, T, Z) one block to the left
      this.x = (type === 'O' || type === 'I') ? baseX : baseX - 1;
      this.y = -1; // spawn above visible area
      this.rot = 0; // 0,1,2,3 orientation for SRS
    }
  }

  class Tetris {
    constructor() {
      this.grid = createMatrix(ROWS, COLS, 0);
      this.score = 0; this.lines = 0; this.level = 1;
      this.dropInterval = 1000; // ms
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
      this.restartHoldDuration = 1000; // 1 second
      // Lock delay handling (applies when piece is touching ground)
      this.lockDelay = SETTINGS.lockDelay; // ms
      this.groundedSince = null; // timestamp when first touched ground
      // Input handling state
      this.moveDir = 0; // -1 left, +1 right, 0 none
      this.dasTimer = null;
      this.arrInterval = null;
      this.softDropping = false;
      this.softAcc = 0; // accumulator for soft drop speed
      // Input state
      this.keysDown = new Set();
      this.edgePressed = new Set(); // keys newly pressed since last frame
      this.lastHorizontalPressDir = 0; // -1 left, +1 right based on most recent press
      // Scoring system state
      this.backToBack = false; // Back-to-back chain active
      this.combo = 0; // Current combo count
      this.softDropDistance = 0; // Cells soft dropped this piece
      this.hardDropDistance = 0; // Cells hard dropped (tracked per drop)
      this.lastActionWasDifficult = false; // Last clear was difficult (T-Spin or Tetris)
      this.lastRotationWasTSpin = false; // Track if last rotation resulted in T-Spin position
      this.lastRotationAtMerge = 0; // Track rotation state at merge time for mini T-Spin detection
      this.currentPieceStartY = this.current.y; // Track where piece started for drop distance
      this.bindKeys();
      this.bindSettingsUI();
      requestAnimationFrame(t => this.loop(t));
      this.draw(); this.drawNext(); this.drawHold(); this.updateHUD();
    }

    bindKeys() {
      // Helper to normalize key for comparison (case-insensitive for letters)
      const normalizeKey = (key) => {
        if (key.length === 1 && key.match(/[a-z]/i)) {
          return key.toLowerCase();
        }
        return key;
      };

      window.addEventListener('keydown', e => {
        const key = e.key;
        const normalizedKey = normalizeKey(key);
        const restartKey = normalizeKey(KEYBINDS.restart);

        // Always track restart key for restart hold
        if (normalizedKey === restartKey && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          if (this.restartHoldStart === null) this.restartHoldStart = Date.now();
        }

        // Prevent scrolling and defaults for gameplay keys
        const gameKeys = [
          KEYBINDS.moveLeft,
          KEYBINDS.moveRight,
          KEYBINDS.softDrop,
          KEYBINDS.rotateCW,
          KEYBINDS.hardDrop,
          KEYBINDS.rotate180,
          KEYBINDS.hold,
          KEYBINDS.pause,
          KEYBINDS.restart,
          KEYBINDS.rotateCCW
        ].map(k => normalizeKey(k));

        if (gameKeys.includes(normalizedKey)) e.preventDefault();

        // Track key state
        const wasDown = this.keysDown.has(normalizedKey);
        this.keysDown.add(normalizedKey);
        if (!wasDown) this.edgePressed.add(normalizedKey);

        // Track most recent horizontal press for conflict resolution
        const leftKey = normalizeKey(KEYBINDS.moveLeft);
        const rightKey = normalizeKey(KEYBINDS.moveRight);
        if (normalizedKey === leftKey) this.lastHorizontalPressDir = -1;
        if (normalizedKey === rightKey) this.lastHorizontalPressDir = 1;
      });

      window.addEventListener('keyup', e => {
        const key = e.key;
        const normalizedKey = normalizeKey(key);
        const restartKey = normalizeKey(KEYBINDS.restart);
        
        // Release restart hold if any
        if (normalizedKey === restartKey) this.restartHoldStart = null;
        this.keysDown.delete(normalizedKey);
      });
    }

    processInputs() {
      // Helper to normalize key for comparison (case-insensitive for letters)
      const normalizeKey = (key) => {
        if (key.length === 1 && key.match(/[a-z]/i)) {
          return key.toLowerCase();
        }
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

      // Pause toggle (edge)
      if (this.edgePressed.has(pauseKey)) this.togglePause();

      // If paused, only allow restart hold handling (done elsewhere) and exit
      if (this.paused) { this.edgePressed.clear(); return; }

      // Rotations and discrete actions (edge)
      if (this.edgePressed.has(rotateCWKey)) this.rotate();
      if (this.edgePressed.has(rotateCCWKey)) this.rotateCCW();
      if (this.edgePressed.has(rotate180Key)) this.rotate180();
      if (this.edgePressed.has(holdKey)) this.hold();
      if (this.edgePressed.has(hardDropKey)) this.hardDrop();

      // Horizontal movement (held) with DAS/ARR; resolve conflicts by last press
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

      // Soft drop (held)
      const downHeld = this.keysDown.has(softDropKey);
      if (downHeld && !this.softDropping) this.startSoftDrop();
      if (!downHeld && this.softDropping) this.stopSoftDrop();

      // Clear edge buffer at end of processing
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

      // Keybind rebinding state (declared early so closeModal can use it)
      let rebindingAction = null;
      let rebindingBtn = null;

      // Modal open/close
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

      // Initialize UI from SETTINGS
      dasRange.value = String(SETTINGS.das);
      arrRange.value = String(SETTINGS.arr);
      // For Infinity, place knob at max
      if (isFinite(SETTINGS.softDropCps)) {
        sdcRange.value = String(SETTINGS.softDropCps);
      } else {
        sdcRange.value = String(sdcRange.max);
      }
      if (dasValue) dasValue.textContent = String(SETTINGS.das);
      if (arrValue) arrValue.textContent = String(SETTINGS.arr);
      if (sdcValue) sdcValue.textContent = isFinite(SETTINGS.softDropCps) ? String(SETTINGS.softDropCps) : '∞';

      // Listeners
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
        // If user changes ARR while key held, restart timers to reflect new rate
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

      // Keybind UI
      const formatKeyForDisplay = (key) => {
        if (key === ' ') return 'Space';
        if (key === 'ArrowLeft') return '←';
        if (key === 'ArrowRight') return '→';
        if (key === 'ArrowUp') return '↑';
        if (key === 'ArrowDown') return '↓';
        if (key === 'Control') return 'Ctrl';
        if (key.length === 1 && key.match(/[a-z]/i)) {
          return key.toUpperCase();
        }
        return key;
      };

      const updateKeybindDisplay = () => {
        const keybindBtns = document.querySelectorAll('.keybind-btn');
        keybindBtns.forEach(btn => {
          const action = btn.getAttribute('data-action');
          if (action && KEYBINDS[action]) {
            const keySpan = btn.querySelector('.keybind-key');
            if (keySpan) {
              keySpan.textContent = formatKeyForDisplay(KEYBINDS[action]);
            }
          }
        });
      };

      // Initialize keybind display
      updateKeybindDisplay();

      const startRebinding = (action, btn) => {
        stopRebinding();
        rebindingAction = action;
        rebindingBtn = btn;
        btn.classList.add('waiting');
        const keySpan = btn.querySelector('.keybind-key');
        if (keySpan) keySpan.textContent = 'Press key...';
      };

      // Handle key capture for rebinding
      const keybindCaptureHandler = (e) => {
        if (!rebindingAction) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const key = e.key;
        // Don't allow Escape to be bound (used for canceling)
        if (key === 'Escape') {
          stopRebinding();
          updateKeybindDisplay();
          return;
        }
        
        // Don't allow modifier keys alone (but don't consume the handler)
        if (key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta') {
          // Re-add the listener since we're not consuming this key
          window.addEventListener('keydown', keybindCaptureHandler, { once: true, capture: true });
          return;
        }

        // Check if key is already bound to another action
        let conflict = false;
        for (const [otherAction, otherKey] of Object.entries(KEYBINDS)) {
          if (otherAction !== rebindingAction && otherKey === key) {
            conflict = true;
            break;
          }
        }

        if (!conflict) {
          KEYBINDS[rebindingAction] = key;
          try {
            localStorage.setItem('tetris.keybinds', JSON.stringify(KEYBINDS));
          } catch {}
          
          stopRebinding();
          updateKeybindDisplay();
        } else {
          // Show error briefly, then re-enable rebinding
          const keySpan = rebindingBtn.querySelector('.keybind-key');
          if (keySpan) {
            const originalText = keySpan.textContent;
            keySpan.textContent = 'Already bound!';
            setTimeout(() => {
              keySpan.textContent = originalText;
              // Re-add the listener to continue rebinding
              window.addEventListener('keydown', keybindCaptureHandler, { once: true, capture: true });
            }, 1000);
          }
        }
      };

      // Add keybind button listeners
      const keybindBtns = document.querySelectorAll('.keybind-btn');
      keybindBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const action = btn.getAttribute('data-action');
          if (action) {
            startRebinding(action, btn);
            // Add one-time listener for key capture
            window.addEventListener('keydown', keybindCaptureHandler, { once: true, capture: true });
          }
        });
      });

      // Reset keybinds button
      const resetBtn = document.getElementById('resetKeybinds');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          Object.assign(KEYBINDS, DEFAULT_KEYBINDS);
          try {
            localStorage.setItem('tetris.keybinds', JSON.stringify(KEYBINDS));
          } catch {}
          updateKeybindDisplay();
          stopRebinding();
        });
      }
    }

    togglePause() { this.paused = !this.paused; }

    loop(t) {
      const dt = t - this.last; this.last = t;
      
      // Check if restart hold is complete
      if (this.restartHoldStart !== null) {
        const holdTime = Date.now() - this.restartHoldStart;
        if (holdTime >= this.restartHoldDuration) {
          this.reset();
          this.restartHoldStart = null;
        }
      }
      
      // Process current inputs once per frame (enables combos)
      this.processInputs();
      
      if (!this.paused) {
        this.acc += dt;
        if (this.acc > this.dropInterval) { this.drop(); this.acc = 0; }
        // Apply continuous soft drop when active and not instant
        if (this.softDropping && isFinite(SETTINGS.softDropCps)) {
          this.softAcc += dt;
          const msPerCell = 1000 / SETTINGS.softDropCps;
          while (this.softAcc >= msPerCell) {
            this.softAcc -= msPerCell;
            // attempt one cell soft drop
            const ny = this.current.y + 1;
            if (!this.collide(this.current.shape, ny, this.current.x)) {
              this.current.y = ny;
              this.softDropDistance++; // Track soft drop distance
              this.refreshGrounded();
            } else {
              this.refreshGrounded();
              this.tryLock();
              break;
            }
          }
        }
      }
      this.draw();
      this.updateOverlay();
      requestAnimationFrame(tt => this.loop(tt));
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

    // Horizontal input handling (DAS/ARR)
    startHorizontal(dir) {
      if (this.moveDir === dir) return;
      this.clearHorizontalTimers();
      this.moveDir = dir;
      // initial move
      this.move(dir);
      // if ARR is 0 and DAS > 0, we wait DAS then slam to wall
      if (SETTINGS.arr === 0) {
        this.dasTimer = setTimeout(() => {
          // instant auto shift to wall
          while (!this.collide(this.current.shape, this.current.y, this.current.x + dir)) {
            this.current.x += dir;
          }
          this.refreshGrounded();
        }, SETTINGS.das);
      } else {
        // standard auto-repeat after DAS
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

    // Soft drop handling
    startSoftDrop() {
      if (this.softDropping) return;
      if (!isFinite(SETTINGS.softDropCps)) {
        // Treat as sonic drop (instant to floor, but do NOT lock)
        while (!this.collide(this.current.shape, this.current.y + 1, this.current.x)) {
          this.current.y += 1;
        }
        this.refreshGrounded();
        // keep softDropping false; this is a one-shot
      } else {
        this.softDropping = true;
        this.softAcc = 0;
      }
    }

    stopSoftDrop() {
      this.softDropping = false;
      this.softAcc = 0;
    }

    // Returns true if the piece is currently resting on something or bottom
    isTouchingGround() {
      return this.collide(this.current.shape, this.current.y + 1, this.current.x);
    }

    // Refresh grounded timestamp based on current state
    refreshGrounded() {
      if (this.isTouchingGround()) {
        if (this.groundedSince === null) this.groundedSince = Date.now();
      } else {
        this.groundedSince = null;
      }
    }

    // Attempt to lock the piece if lock delay expired
    tryLock() {
      if (this.groundedSince !== null) {
        if (Date.now() - this.groundedSince >= this.lockDelay) {
          this.merge();
        }
      }
    }

    merge() {
      const s = this.current.shape; const oy = this.current.y; const ox = this.current.x;
      // Calculate hard drop distance if not already set
      if (this.currentPieceStartY !== null && this.hardDropDistance === 0) {
        this.hardDropDistance = Math.max(0, oy - this.currentPieceStartY);
      }
      // Check for T-Spin before merging (need to check with current position)
      const wasTSpin = this.current.type === 'T' && this.isTSpin();
      // Store rotation state for mini T-Spin detection
      this.lastRotationAtMerge = this.current.rot;
      for (let y = 0; y < s.length; y++) for (let x = 0; x < s[y].length; x++) {
        if (s[y][x] && oy + y >= 0) this.grid[oy + y][ox + x] = this.current.type;
      }
      // Set T-Spin flag for scoring
      this.lastRotationWasTSpin = wasTSpin;
      this.clearLines();
      // Take first piece from queue
      this.current = new Piece(this.nextQueue.shift());
      // Refill queue
      this.nextQueue.push(this.bag.draw());
      this.canHold = true; // Reset hold flag when piece is placed
      this.groundedSince = null; // reset lock timer for new piece
      // Reset scoring tracking for new piece
      this.softDropDistance = 0;
      this.hardDropDistance = 0;
      this.currentPieceStartY = this.current.y;
      this.lastRotationWasTSpin = false;
      this.lastRotationAtMerge = 0;
      this.drawNext();
      if (this.collide(this.current.shape, this.current.y, this.current.x)) this.reset();
    }

    reset() {
      this.grid = createMatrix(ROWS, COLS, 0);
      this.score = 0; this.lines = 0; this.level = 1; this.dropInterval = 1000;
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
      // Reset scoring system state
      this.backToBack = false;
      this.combo = 0;
      this.softDropDistance = 0;
      this.hardDropDistance = 0;
      this.lastActionWasDifficult = false;
      this.lastRotationWasTSpin = false;
      this.lastRotationAtMerge = 0;
      this.currentPieceStartY = this.current.y;
      this.drawHold();
      this.drawNext();
      this.updateHUD();
    }

    // T-Spin detection using 3-corner rule
    // Checks if the T-piece is in a T-Spin position (3 of 4 corners are filled)
    isTSpin() {
      if (this.current.type !== 'T') return false;
      
      const px = this.current.x;
      const py = this.current.y;
      const shape = this.current.shape;
      
      // Find the center of the T-piece (the T block)
      let centerX = -1, centerY = -1;
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            // Check if this is the center (has 3 neighbors in T shape)
            let neighbors = 0;
            if (y > 0 && shape[y-1][x]) neighbors++;
            if (y < shape.length - 1 && shape[y+1][x]) neighbors++;
            if (x > 0 && shape[y][x-1]) neighbors++;
            if (x < shape[y].length - 1 && shape[y][x+1]) neighbors++;
            if (neighbors === 3) {
              centerX = px + x;
              centerY = py + y;
              break;
            }
          }
        }
        if (centerX !== -1) break;
      }
      
      if (centerX === -1 || centerY === -1) return false;
      
      // Check the 4 corners around the center
      const corners = [
        [centerX - 1, centerY - 1], // top-left
        [centerX + 1, centerY - 1], // top-right
        [centerX - 1, centerY + 1], // bottom-left
        [centerX + 1, centerY + 1]  // bottom-right
      ];
      
      let filledCorners = 0;
      for (const [cx, cy] of corners) {
        // Check if corner is out of bounds or filled
        if (cy < 0 || cy >= ROWS || cx < 0 || cx >= COLS || this.grid[cy][cx]) {
          filledCorners++;
        }
      }
      
      // T-Spin requires at least 3 corners filled
      return filledCorners >= 3;
    }

    // Check if this is a mini T-Spin (pointing side T-Spin)
    isMiniTSpin() {
      if (this.current.type !== 'T') return false;
      if (!this.isTSpin()) return false;
      
      // Mini T-Spin: T-piece is pointing left or right (not up or down)
      // Check rotation state - rotations 1 and 3 are horizontal
      return this.current.rot === 1 || this.current.rot === 3;
    }

    // Check if grid is empty (perfect clear)
    isPerfectClear() {
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (this.grid[y][x]) return false;
        }
      }
      return true;
    }

    clearLines() {
      let cleared = 0;
      for (let y = ROWS - 1; y >= 0; y--) {
        if (this.grid[y].every(v => v)) {
          this.grid.splice(y, 1);
          this.grid.unshift(Array(COLS).fill(0));
          cleared++;
          y++; // Re-check same index after removal
        }
      }
      
      if (cleared > 0) {
        // Determine action type
        const isTSpinAction = this.lastRotationWasTSpin;
        // Check mini T-Spin: T-piece pointing left or right (rotations 1 and 3 are horizontal)
        const isMiniTSpin = isTSpinAction && (this.lastRotationAtMerge === 1 || this.lastRotationAtMerge === 3);
        const isTetris = cleared === 4;
        const isDifficult = isTSpinAction || isTetris;
        
        // Calculate base score
        let baseScore = 0;
        if (isTSpinAction) {
          if (cleared === 0) {
            baseScore = isMiniTSpin ? 100 : 400; // Mini T-Spin no lines or T-Spin no lines
          } else if (cleared === 1) {
            baseScore = isMiniTSpin ? 200 : 800; // Mini T-Spin Single or T-Spin Single
          } else if (cleared === 2) {
            baseScore = isMiniTSpin ? 400 : 1200; // Mini T-Spin Double or T-Spin Double
          } else if (cleared === 3) {
            baseScore = 1600; // T-Spin Triple
          }
        } else {
          // Regular line clears
          const scores = [0, 100, 300, 500, 800];
          baseScore = scores[cleared];
        }
        
        // Apply level multiplier
        baseScore *= this.level;
        
        // Apply Back-to-Back multiplier (1.5x for difficult clears)
        if (isDifficult && this.backToBack) {
          baseScore = Math.floor(baseScore * 1.5);
        }
        
        // Add combo points
        if (this.combo > 0) {
          baseScore += 50 * this.combo * this.level;
        }
        
        // Add soft drop points (1 per cell)
        baseScore += this.softDropDistance;
        
        // Add hard drop points (2 per cell)
        baseScore += this.hardDropDistance * 2;
        
        // Check for perfect clear
        const perfectClear = this.isPerfectClear();
        let perfectClearBonus = 0;
        if (perfectClear) {
          if (cleared === 1) perfectClearBonus = 800 * this.level;
          else if (cleared === 2) perfectClearBonus = 1200 * this.level;
          else if (cleared === 3) perfectClearBonus = 1800 * this.level;
          else if (cleared === 4) {
            if (this.backToBack && isTetris) {
              perfectClearBonus = 3200 * this.level;
            } else {
              perfectClearBonus = 2000 * this.level;
            }
          }
        }
        
        // Add perfect clear bonus to base score
        baseScore += perfectClearBonus;
        
        this.score += baseScore;
        this.lines += cleared;
        
        // Update Back-to-Back status
        // Only Single, Double, or Triple line clears break Back-to-Back chain
        // T-Spin with no lines does not break the chain
        if (isDifficult) {
          this.backToBack = true;
          this.lastActionWasDifficult = true;
        } else if (cleared > 0 && cleared < 4) {
          // Single, Double, or Triple breaks the chain
          this.backToBack = false;
          this.lastActionWasDifficult = false;
        } else {
          this.lastActionWasDifficult = false;
        }
        
        // Update combo
        this.combo++;
        
        // Level up calculation
        if (this.lines >= this.level * 10) {
          this.level++;
          this.dropInterval = Math.max(120, 1000 - (this.level - 1) * 80);
        }
        
        this.updateHUD();
      } else {
        // No lines cleared - reset combo
        this.combo = 0;
        // T-Spin with no lines doesn't break Back-to-Back
        if (this.lastRotationWasTSpin) {
          this.backToBack = true;
          this.lastActionWasDifficult = true;
        }
      }
      
      // Reset rotation T-Spin flag after processing
      this.lastRotationWasTSpin = false;
    }

    move(dir) {
      const nx = this.current.x + dir;
      if (!this.collide(this.current.shape, this.current.y, nx)) {
        this.current.x = nx;
        // Movement can refresh lock delay
        this.refreshGrounded();
      }
    }

    // SRS rotate attempt with kicks
    tryRotate(direction) { // +1: CW, -1: CCW
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
          // Rotation can refresh lock delay
          this.refreshGrounded();
          // Check for T-Spin after rotation
          if (this.current.type === 'T') {
            this.lastRotationWasTSpin = this.isTSpin();
          }
          return true;
        }
      }
      return false;
    }

    rotate() {
      this.tryRotate(1);
    }

    rotateCCW() {
      this.tryRotate(-1);
    }

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
          // Check for T-Spin after rotation
          if (this.current.type === 'T') {
            this.lastRotationWasTSpin = this.isTSpin();
          }
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
      } else {
        // Touching ground: start/continue lock delay instead of instant merge
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
      if (!this.canHold) return; // Can only hold once per piece
      
      if (this.held === null) {
        // First hold: store current piece and get next piece from queue
        this.held = this.current.type;
        this.current = new Piece(this.nextQueue.shift());
        this.nextQueue.push(this.bag.draw());
      } else {
        // Swap held piece with current piece
        const temp = this.current.type;
        this.current = new Piece(this.held);
        this.held = temp;
      }
      
      this.canHold = false; // Prevent holding again until piece is placed
      this.groundedSince = null; // reset lock timer after hold swap
      // Reset scoring tracking for new piece
      this.softDropDistance = 0;
      this.hardDropDistance = 0;
      this.currentPieceStartY = this.current.y;
      this.lastRotationWasTSpin = false;
      this.lastRotationAtMerge = 0;
      this.drawHold();
      this.drawNext();
    }

    drawCell(gx, gy, type) {
      const x = gx * cell, y = gy * cell; const col = COLORS[type] || '#90a4ae';
      ctx.fillStyle = col; ctx.fillRect(x, y, cell, cell);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
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
      if (ghostY === this.current.y) return; // Already at drop position
      
      const s = this.current.shape;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      
      for (let y = 0; y < s.length; y++) {
        for (let x = 0; x < s[y].length; x++) {
          if (!s[y][x]) continue;
          const gy = ghostY + y;
          const gx = this.current.x + x;
          if (gy < 0) continue;
          
          const px = gx * cell;
          const py = gy * cell;
          ctx.strokeRect(px + 1, py + 1, cell - 2, cell - 2);
        }
      }
      
      ctx.lineWidth = 1; // Reset line width
    }

    drawGrid() {
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      
      // Vertical lines
      for (let x = 0; x <= COLS; x++) {
        const px = x * cell;
        ctx.beginPath();
        ctx.moveTo(px + 0.5, 0);
        ctx.lineTo(px + 0.5, ROWS * cell);
        ctx.stroke();
      }
      
      // Horizontal lines
      for (let y = 0; y <= ROWS; y++) {
        const py = y * cell;
        ctx.beginPath();
        ctx.moveTo(0, py + 0.5);
        ctx.lineTo(COLS * cell, py + 0.5);
        ctx.stroke();
      }
    }

    draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw grid lines first
      this.drawGrid();
      // grid cells
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const v = this.grid[y][x]; if (v) this.drawCell(x, y, v);
      }
      // ghost (drop preview)
      this.drawGhost();
      // current
      const s = this.current.shape;
      for (let y = 0; y < s.length; y++) for (let x = 0; x < s[y].length; x++) {
        if (!s[y][x]) continue; const gy = this.current.y + y; const gx = this.current.x + x; if (gy < 0) continue;
        this.drawCell(gx, gy, this.current.type);
      }
    }

    drawCenteredPiece(ctx, canvasWidth, canvasHeight, shape, type) {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      // Calculate actual bounding box of the piece
      let minX = shape[0].length, maxX = -1, minY = shape.length, maxY = -1;
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (shape[y][x]) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      
      const width = maxX - minX + 1;
      const height = maxY - minY + 1;
      const size = Math.max(width, height);
      
      const cellN = Math.floor(Math.min(canvasWidth, canvasHeight) / (size + 2));
      const totalWidth = cellN * width;
      const totalHeight = cellN * height;
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
          this.drawCenteredPiece(nextContexts[i], nextCanvases[i].width, nextCanvases[i].height, shape, type);
        } else {
          nextContexts[i].clearRect(0, 0, nextCanvases[i].width, nextCanvases[i].height);
        }
      }
    }

    drawHold() {
      if (this.held === null) {
        hctx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
        return;
      }
      this.drawCenteredPiece(hctx, holdCanvas.width, holdCanvas.height, SHAPES[this.held], this.held);
    }

    updateOverlay() {
      let text = null;
      let opacity = 1;
      let state = null;
      
      if (this.paused) {
        text = 'Paused';
        state = 'paused';
      } else if (this.restartHoldStart !== null) {
        const holdTime = Date.now() - this.restartHoldStart;
        opacity = Math.min(holdTime / this.restartHoldDuration, 1);
        text = 'Restarting';
        state = 'restarting';
      }
      
      // Remove all state classes
      overlayEl.classList.remove('paused', 'restarting');
      
      if (text) {
        overlayEl.innerHTML = `
          <div class="overlay-backdrop" style="opacity: ${opacity}"></div>
          <div class="overlay-content" style="opacity: ${opacity}">${text}</div>
        `;
        overlayEl.classList.add('visible');
        if (state) {
          overlayEl.classList.add(state);
        }
      } else {
        overlayEl.classList.remove('visible');
        overlayEl.innerHTML = '';
      }
    }

    updateHUD() {
      scoreEl.textContent = this.score;
      linesEl.textContent = this.lines;
      levelEl.textContent = this.level;
    }
  }

  new Tetris();
})();


