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
    '0>1': [ [0,0], [-1,0], [-1,1], [0,-2], [-1,-2] ],
    '1>2': [ [0,0], [1,0], [1,-1], [0,2], [1,2] ],
    '2>3': [ [0,0], [1,0], [1,1], [0,-2], [1,-2] ],
    '3>0': [ [0,0], [-1,0], [-1,-1], [0,2], [-1,2] ],
    '1>0': [ [0,0], [1,0], [1,1], [0,-2], [1,-2] ],
    '2>1': [ [0,0], [-1,0], [-1,-1], [0,2], [-1,2] ],
    '3>2': [ [0,0], [-1,0], [-1,1], [0,-2], [-1,-2] ],
    '0>3': [ [0,0], [1,0], [1,-1], [0,2], [1,2] ],
  };

  // I piece kicks
  const KICKS_I = {
    '0>1': [ [0,0], [-2,0], [1,0], [-2,-1], [1,2] ],
    '1>2': [ [0,0], [-1,0], [2,0], [-1,2], [2,-1] ],
    '2>3': [ [0,0], [2,0], [-1,0], [2,1], [-1,-2] ],
    '3>0': [ [0,0], [1,0], [-2,0], [1,-2], [-2,1] ],
    '1>0': [ [0,0], [2,0], [-1,0], [2,1], [-1,-2] ],
    '2>1': [ [0,0], [1,0], [-2,0], [1,-2], [-2,1] ],
    '3>2': [ [0,0], [-2,0], [1,0], [-2,-1], [1,2] ],
    '0>3': [ [0,0], [-1,0], [2,0], [-1,2], [2,-1] ],
  };

  // O piece: no kicks (origin centered)
  const KICKS_O = {
    '0>1': [ [0,0] ], '1>2': [ [0,0] ], '2>3': [ [0,0] ], '3>0': [ [0,0] ],
    '1>0': [ [0,0] ], '2>1': [ [0,0] ], '3>2': [ [0,0] ], '0>3': [ [0,0] ],
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
      this.bindKeys();
      this.bindSettingsUI();
      requestAnimationFrame(t => this.loop(t));
      this.draw(); this.drawNext(); this.drawHold(); this.updateHUD();
    }

    bindKeys() {
      window.addEventListener('keydown', e => {
        // Handle R key for restart (even when paused)
        if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          if (this.restartHoldStart === null) {
            this.restartHoldStart = Date.now();
          }
          return;
        }
        
        // Don't process other keys when paused (except R which is handled above and P)
        if (this.paused && e.key.toLowerCase() !== 'p') return;
        
        // Handle Control key for counter-clockwise rotation (only when Control is pressed alone)
        if (e.key === 'Control' && !e.shiftKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          this.rotateCCW();
          return;
        }
        
        switch (e.key) {
          case 'ArrowLeft': this.startHorizontal(-1); break;
          case 'ArrowRight': this.startHorizontal(1); break;
          case 'ArrowDown': this.startSoftDrop(); break;
          case 'ArrowUp': this.rotate(); break;
          case ' ': e.preventDefault(); this.hardDrop(); break;
          case 'a': case 'A': if (!e.ctrlKey) { e.preventDefault(); this.rotate180(); } break;
          case 'c': case 'C': this.hold(); break;
          case 'p': case 'P': this.togglePause(); break;
        }
      });

      window.addEventListener('keyup', e => {
        if (e.key === 'r' || e.key === 'R') {
          this.restartHoldStart = null;
        }
        if (this.paused) return;
        switch (e.key) {
          case 'ArrowLeft': if (this.moveDir === -1) this.stopHorizontal(-1); break;
          case 'ArrowRight': if (this.moveDir === 1) this.stopHorizontal(1); break;
          case 'ArrowDown': this.stopSoftDrop(); break;
        }
      });
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

      // Modal open/close
      const openModal = () => {
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
      };
      const closeModal = () => {
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
      for (let y = 0; y < s.length; y++) for (let x = 0; x < s[y].length; x++) {
        if (s[y][x] && oy + y >= 0) this.grid[oy + y][ox + x] = this.current.type;
      }
      this.clearLines();
      // Take first piece from queue
      this.current = new Piece(this.nextQueue.shift());
      // Refill queue
      this.nextQueue.push(this.bag.draw());
      this.canHold = true; // Reset hold flag when piece is placed
      this.groundedSince = null; // reset lock timer for new piece
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
      this.drawHold();
      this.drawNext();
      this.updateHUD();
    }

    clearLines() {
      let cleared = 0;
      for (let y = ROWS - 1; y >= 0; y--) {
        if (this.grid[y].every(v => v)) {
          this.grid.splice(y, 1);
          this.grid.unshift(Array(COLS).fill(0));
          cleared++; y++;
        }
      }
      if (cleared) {
        const scores = [0, 100, 300, 500, 800];
        this.score += scores[cleared] * this.level;
        this.lines += cleared;
        if (this.lines >= this.level * 10) {
          this.level++;
          this.dropInterval = Math.max(120, 1000 - (this.level - 1) * 80);
        }
        this.updateHUD();
      }
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
      // Use two SRS rotations to emulate 180 with proper kicks
      if (!this.tryRotate(1)) return; // if first fails, abort
      this.tryRotate(1);
      // refresh grounded already handled in tryRotate
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
      while (!this.collide(this.current.shape, this.current.y + 1, this.current.x)) this.current.y++;
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
      
      if (this.paused) {
        text = 'Paused';
      } else if (this.restartHoldStart !== null) {
        const holdTime = Date.now() - this.restartHoldStart;
        opacity = Math.min(holdTime / this.restartHoldDuration, 1);
        text = 'Restarting...';
      }
      
      if (text) {
        overlayEl.innerHTML = `
          <div class="overlay-backdrop" style="opacity: ${opacity}"></div>
          <div class="overlay-content" style="opacity: ${opacity}">${text}</div>
        `;
        overlayEl.classList.add('visible');
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


