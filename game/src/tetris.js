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
      this.bindKeys();
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
          case 'ArrowLeft': this.move(-1); break;
          case 'ArrowRight': this.move(1); break;
          case 'ArrowDown': this.drop(); break;
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
      if (!this.collide(this.current.shape, this.current.y, nx)) this.current.x = nx;
    }

    rotate() {
      const r = rotate(this.current.shape);
      if (!this.collide(r, this.current.y, this.current.x)) this.current.shape = r;
    }

    rotateCCW() {
      const r = rotateCCW(this.current.shape);
      if (!this.collide(r, this.current.y, this.current.x)) this.current.shape = r;
    }

    rotate180() {
      const r = rotate180(this.current.shape);
      if (!this.collide(r, this.current.y, this.current.x)) this.current.shape = r;
    }

    drop() {
      const ny = this.current.y + 1;
      if (!this.collide(this.current.shape, ny, this.current.x)) {
        this.current.y = ny;
      } else {
        this.merge();
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


