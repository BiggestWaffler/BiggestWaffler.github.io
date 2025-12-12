// Tetris Bot implementation
// Based on standard heuristics (Dellacherie's algorithm / ColdClear simplified)

(function() {
  const { ROWS, COLS, SHAPES, createMatrix, rotate } = window.TetrisConstants;

  class TetrisBot {
    constructor(game) {
      this.game = game;
    }

    // Main update loop called by game engine
    // Executed once per "Piece Interval" (determined by PPS)
    update() {
      if (!this.game.current) return;

      const bestMove = this.think();
      if (!bestMove) {
          // No good move? Just drop to die.
          this.game.hardDrop();
          return;
      }

      // Execute Move
      // 1. Rotation
      // We assume simple rotation reachability for this version
      const targetRot = bestMove.rotation;
      const currentRot = this.game.current.rot;
      const rotDiff = (targetRot - currentRot + 4) % 4;
      
      for(let i=0; i<rotDiff; i++) {
          this.game.rotate();
      }

      // 2. Horizontal Movement
      const targetX = bestMove.x;
      const currentX = this.game.current.x;
      const xDiff = targetX - currentX;
      
      if (xDiff !== 0) {
          const dir = xDiff > 0 ? 1 : -1;
          for(let i=0; i<Math.abs(xDiff); i++) {
              this.game.move(dir);
          }
      }

      // 3. Hard Drop
      this.game.hardDrop();
    }

    think() {
      const piece = this.game.current;
      const grid = this.game.grid;
      
      let bestScore = -Infinity;
      let bestMove = null;

      // Iterate all rotations
      for (let r = 0; r < 4; r++) {
        // Create shape for this rotation
        let shape = SHAPES[piece.type].map(r => r.slice());
        for (let i = 0; i < r; i++) shape = rotate(shape);
        
        // Width analysis
        let minCol = shape[0].length, maxCol = -1;
        for(let y=0; y<shape.length; y++) {
            for(let x=0; x<shape[0].length; x++) {
                if(shape[y][x]) {
                    if(x < minCol) minCol = x;
                    if(x > maxCol) maxCol = x;
                }
            }
        }
        
        // Iterate all valid X positions
        // We iterate wide enough to cover all possibilities including wall kicks conceptually
        for (let x = -2; x < COLS; x++) {
             // Calculate drop position
             let y = this.getDropY(grid, shape, x);
             if (y === null) continue; // Invalid placement

             // Evaluate
             const score = this.evaluate(grid, shape, x, y);
             
             if (score > bestScore) {
                 bestScore = score;
                 bestMove = { rotation: r, x: x };
             }
        }
      }
      return bestMove;
    }

    getDropY(grid, shape, x) {
        let cy = 0;
        // Check spawn collision (if board is full high up)
        if (this.collide(grid, shape, cy, x)) return null;

        while (!this.collide(grid, shape, cy + 1, x)) {
            cy++;
        }
        return cy;
    }

    collide(grid, shape, offY, offX) {
      for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
          if (!shape[y][x]) continue;
          const yy = y + offY, xx = x + offX;
          if (yy >= ROWS || xx < 0 || xx >= COLS || (yy >= 0 && grid[yy][xx])) return true;
        }
      }
      return false;
    }

    evaluate(grid, shape, x, y) {
      // Create a lightweight simulated grid
      // JS arrays are references, so we must clone for the heuristic check
      // To optimize, we could just pass the diffs, but cloning 200 integers is fast enough.
      const simGrid = grid.map(row => [...row]);
      
      // Place piece
      let linesCleared = 0;
      for (let py = 0; py < shape.length; py++) {
        for (let px = 0; px < shape[py].length; px++) {
          if (shape[py][px]) {
             const gy = y + py;
             const gx = x + px;
             if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
                 simGrid[gy][gx] = 1;
             }
          }
        }
      }

      // Check lines
      for (let r = 0; r < ROWS; r++) {
          if (simGrid[r].every(c => c !== 0)) {
              linesCleared++;
              simGrid.splice(r, 1);
              simGrid.unshift(Array(COLS).fill(0));
          }
      }

      const aggregateHeight = this.getAggregateHeight(simGrid);
      const holes = this.getHoles(simGrid);
      const bumpiness = this.getBumpiness(simGrid);
      
      // Standard Genetic Algorithm weights for Tetris
      const wHeight = -0.51;
      const wLines = 0.76;
      const wHoles = -0.36;
      const wBumpiness = -0.18;

      return (aggregateHeight * wHeight) + 
             (linesCleared * wLines) + 
             (holes * wHoles) + 
             (bumpiness * wBumpiness);
    }

    getAggregateHeight(grid) {
        let total = 0;
        for (let x = 0; x < COLS; x++) {
            for (let y = 0; y < ROWS; y++) {
                if (grid[y][x] !== 0) {
                    total += (ROWS - y);
                    break;
                }
            }
        }
        return total;
    }

    getHoles(grid) {
        let holes = 0;
        for (let x = 0; x < COLS; x++) {
            let blockFound = false;
            for (let y = 0; y < ROWS; y++) {
                if (grid[y][x] !== 0) {
                    blockFound = true;
                } else if (blockFound && grid[y][x] === 0) {
                    holes++;
                }
            }
        }
        return holes;
    }

    getBumpiness(grid) {
        let bumpiness = 0;
        let prevHeight = this.getColumnHeight(grid, 0);
        for (let x = 1; x < COLS; x++) {
            let h = this.getColumnHeight(grid, x);
            bumpiness += Math.abs(prevHeight - h);
            prevHeight = h;
        }
        return bumpiness;
    }

    getColumnHeight(grid, x) {
        for (let y = 0; y < ROWS; y++) {
            if (grid[y][x] !== 0) {
                return ROWS - y;
            }
        }
        return 0;
    }
  }

  window.TetrisBot = TetrisBot;
})();
