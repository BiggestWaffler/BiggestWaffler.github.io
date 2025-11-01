// Simple Tetris implementation (no external libs)
// Grid: 10 x 20, canvas cell size inferred from canvas size

(function() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const nextCanvas = document.getElementById('next');
  const nctx = nextCanvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const linesEl = document.getElementById('lines');
  const levelEl = document.getElementById('level');

  const COLS = 10; const ROWS = 20;
  const cell = Math.floor(canvas.width / COLS);
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

  function randomType() { return TYPES[(Math.random() * TYPES.length) | 0]; }

  class Piece {
    constructor(type) {
      this.type = type; this.color = COLORS[type];
      this.shape = SHAPES[type].map(r => r.slice());
      this.x = ((COLS / 2) | 0) - ((this.shape[0].length / 2) | 0);
      this.y = -1; // spawn above visible area
    }
  }

  class Tetris {
    constructor() {
      this.grid = createMatrix(ROWS, COLS, 0);
      this.score = 0; this.lines = 0; this.level = 1;
      this.dropInterval = 1000; // ms
      this.acc = 0; this.last = 0; this.paused = false;
      this.current = new Piece(randomType());
      this.next = new Piece(randomType());
      this.bindKeys();
      requestAnimationFrame(t => this.loop(t));
      this.draw(); this.drawNext(); this.updateHUD();
    }

    bindKeys() {
      window.addEventListener('keydown', e => {
        if (this.paused && e.key.toLowerCase() !== 'p') return;
        switch (e.key) {
          case 'ArrowLeft': this.move(-1); break;
          case 'ArrowRight': this.move(1); break;
          case 'ArrowDown': this.drop(); break;
          case 'ArrowUp': this.rotate(); break;
          case ' ': e.preventDefault(); this.hardDrop(); break;
          case 'p': case 'P': this.togglePause(); break;
        }
      });
    }

    togglePause() { this.paused = !this.paused; }

    loop(t) {
      const dt = t - this.last; this.last = t;
      if (!this.paused) {
        this.acc += dt;
        if (this.acc > this.dropInterval) { this.drop(); this.acc = 0; }
      }
      this.draw();
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
      this.current = this.next; this.next = new Piece(randomType());
      this.drawNext();
      if (this.collide(this.current.shape, this.current.y, this.current.x)) this.reset();
    }

    reset() {
      this.grid = createMatrix(ROWS, COLS, 0);
      this.score = 0; this.lines = 0; this.level = 1; this.dropInterval = 1000; this.updateHUD();
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

    drawCell(gx, gy, type) {
      const x = gx * cell, y = gy * cell; const col = COLORS[type] || '#90a4ae';
      ctx.fillStyle = col; ctx.fillRect(x, y, cell, cell);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
    }

    draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // grid
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const v = this.grid[y][x]; if (v) this.drawCell(x, y, v);
      }
      // current
      const s = this.current.shape;
      for (let y = 0; y < s.length; y++) for (let x = 0; x < s[y].length; x++) {
        if (!s[y][x]) continue; const gy = this.current.y + y; const gx = this.current.x + x; if (gy < 0) continue;
        this.drawCell(gx, gy, this.current.type);
      }
    }

    drawNext() {
      nctx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
      const s = this.next.shape; const size = Math.max(s.length, s[0].length);
      const cellN = Math.floor(Math.min(nextCanvas.width, nextCanvas.height) / (size + 1));
      const offsetX = ((nextCanvas.width - cellN * s[0].length) / 2) | 0;
      const offsetY = ((nextCanvas.height - cellN * s.length) / 2) | 0;
      for (let y = 0; y < s.length; y++) for (let x = 0; x < s[y].length; x++) {
        if (!s[y][x]) continue; const col = COLORS[this.next.type];
        nctx.fillStyle = col; nctx.fillRect(offsetX + x * cellN, offsetY + y * cellN, cellN, cellN);
        nctx.strokeStyle = 'rgba(255,255,255,0.25)';
        nctx.strokeRect(offsetX + x * cellN + 0.5, offsetY + y * cellN + 0.5, cellN - 1, cellN - 1);
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


