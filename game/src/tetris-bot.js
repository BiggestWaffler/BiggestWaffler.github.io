// Advanced Tetris Bot
// Implements 2-step lookahead, BFS move generation (reachability), and modern heuristics (T-Spins, Downstacking)

(function() {
  const { 
      ROWS, COLS, SHAPES, KICKS_JLSTZ, KICKS_I, KICKS_O, 
      rotate, rotateCCW, createMatrix
  } = window.TetrisConstants;

  // Heuristic Weights
  const WEIGHTS = {
      height: -10,
      hole: -30,         
      blockade: -15,     
      bumpiness: -8,    
      lineClear: 20,     
      tSpin: 150,        
      tSpinMini: 80,
      perfectClear: 1000,
      combo: 20,         
      well: 8,           
      b2b: 25,
      garbageBlock: -5  // Penalty for having garbage blocks (encourage clearing them)
  };

  class TetrisBot {
    constructor(game) {
      this.game = game;
      // Precompute rotated shapes for each type to save perf in BFS
      this.rotatedShapes = {};
      for (const type of Object.keys(SHAPES)) {
          this.rotatedShapes[type] = [];
          let s = SHAPES[type].map(r => r.slice());
          for (let r = 0; r < 4; r++) {
              this.rotatedShapes[type].push(s);
              s = rotate(s);
          }
      }
    }

    update() {
      if (this.game.isGameOver || this.game.paused) return;
      
      const move = this.think();
      
      if (move) {
          this.executeMove(move);
      } else {
          this.game.hardDrop();
      }
    }

    executeMove(move) {
      if (move.hold) {
          this.game.hold();
      }
      
      // Execute the path
      if (move.path) {
          for (const cmd of move.path) {
              if (cmd === 'L') this.game.move(-1);
              else if (cmd === 'R') this.game.move(1);
              else if (cmd === 'D') this.game.drop();
              else if (cmd === 'A') this.game.rotate();
              else if (cmd === 'B') this.game.rotateCCW();
          }
      }
      
      this.game.hardDrop();
    }

    think() {
      // Lookahead: Current vs Hold -> Best Outcome
      const piece = this.game.current;
      const grid = this.game.grid; // Access directly, we clone in simulate
      const holdPieceType = this.game.held;
      const nextPieceType = this.game.nextQueue[0];
      
      let bestScore = -Infinity;
      let bestMove = null; 

      // 1. Evaluate Current Piece
      const movesCurrent = this.getMoves(grid, piece.type);
      for (const move of movesCurrent) {
          const score = this.evaluateMoveChain(grid, move, piece.type, nextPieceType);
          if (score > bestScore) {
              bestScore = score;
              bestMove = { ...move, hold: false };
          }
      }

      // 2. Evaluate Hold Piece
      if (this.game.canHold) {
          const typeToPlay = holdPieceType || nextPieceType; 
          // If hold is empty, we hold 'current', and 'next' becomes 'current' (so we play nextPieceType)
          // The 'next' for the SECOND step would be nextQueue[1], but for simplicity we can assume random or just ignore.
          // Let's assume we play 'typeToPlay' and then look at what comes after.
          // If hold was empty, nextQueue[0] is moved to current. So nextQueue[1] is the new next.
          // We can approximate by still using nextPieceType (or nextQueue[1] if we want to be precise).
          
          // Precise Next Piece logic:
          const actualNextType = (holdPieceType === null) ? this.game.nextQueue[1] : nextPieceType;
          
          const movesHold = this.getMoves(grid, typeToPlay);
          for (const move of movesHold) {
              const score = this.evaluateMoveChain(grid, move, typeToPlay, actualNextType);
              if (score > bestScore) {
                  bestScore = score;
                  bestMove = { ...move, hold: true };
              }
          }
      }

      return bestMove;
    }

    // Helper to evaluate a move + next piece
    evaluateMoveChain(grid, move, currentType, nextType) {
        // Step 1: Execute Move on simulated grid
        const { grid: nextGrid, score: score1 } = this.simulateAndScore(grid, move, currentType);
        
        // Step 2: Search Best Move for Next Piece (Greedy)
        // Optimization: We don't need full pathing for the heuristic check of the next piece,
        // just reachable positions. But getMoves is fast enough.
        
        // If nextType is undefined (end of bag?), skip
        if (!nextType) return score1;

        const movesNext = this.getMoves(nextGrid, nextType);
        let maxScore2 = -Infinity;
        
        // Limit number of next moves evaluated to save CPU
        // We can just check the top few or simplified evaluation
        // Let's check all reachable, but using a simpler heuristic if needed.
        // For now, full eval.
        
        for (const nextMove of movesNext) {
             const { score: score2 } = this.simulateAndScore(nextGrid, nextMove, nextType);
             if (score2 > maxScore2) maxScore2 = score2;
        }
        
        if (maxScore2 === -Infinity) maxScore2 = -1000; // Dead end

        return score1 + maxScore2;
    }

    getMoves(grid, type) {
        const moves = [];
        const seen = new Set();
        
        const shape = SHAPES[type];
        const baseX = ((COLS / 2) | 0) - ((shape[0].length / 2) | 0);
        const startX = (type === 'O' || type === 'I') ? baseX : baseX - 1;
        const startY = -1; // Spawn Y
        
        // Check spawn validity
        if (this.collide(grid, this.rotatedShapes[type][0], startY, startX)) return [];

        // State: x, y, rot
        // We track path to get there.
        const queue = [{ x: startX, y: startY, rot: 0, path: [] }];
        seen.add(`${startX},${startY},0`);

        let head = 0;
        while(head < queue.length) {
            const { x, y, rot, path } = queue[head++];
            const currentShape = this.rotatedShapes[type][rot];

            // 1. Check Lock (Ground)
            if (this.collide(grid, currentShape, y + 1, x)) {
                // Grounded.
                // Check if this specific state+action is T-Spin
                // The 'path' ending tells us if it was a spin.
                // But simplified: We just store the state.
                moves.push({ x, y, rot, path });
                
                // We do NOT continue BFS from a grounded state downwards (obviously), 
                // but we might be able to slide/rotate? 
                // Actually if we are grounded, we can still slide left/right (extended placement).
                // But the BFS handles that by exploring x-1/x+1 from this node BEFORE locking.
                // The node itself represents "being at x,y". 
                // Being grounded just means "valid end state".
                // We continue expanding to neighbors even if grounded (to slide).
            } 
            
            // 2. Expand Neighbors
            // Down
            if (!this.collide(grid, currentShape, y + 1, x)) {
                if (!seen.has(`${x},${y+1},${rot}`)) {
                    seen.add(`${x},${y+1},${rot}`);
                    queue.push({ x, y: y+1, rot, path: [...path, 'D'] });
                }
            }
            
            // Left
            if (!this.collide(grid, currentShape, y, x - 1)) {
                 if (!seen.has(`${x-1},${y},${rot}`)) {
                    seen.add(`${x-1},${y},${rot}`);
                    queue.push({ x: x - 1, y, rot, path: [...path, 'L'] });
                }
            }
            
            // Right
            if (!this.collide(grid, currentShape, y, x + 1)) {
                 if (!seen.has(`${x+1},${y},${rot}`)) {
                    seen.add(`${x+1},${y},${rot}`);
                    queue.push({ x: x + 1, y, rot, path: [...path, 'R'] });
                }
            }
            
            // Rotate CW
            const nextRot = (rot + 1) % 4;
            this.tryRotate(grid, x, y, rot, nextRot, type, path, queue, seen, 'A');

            // Rotate CCW
            const prevRot = (rot + 3) % 4;
            this.tryRotate(grid, x, y, rot, prevRot, type, path, queue, seen, 'B');
        }
        
        return moves;
    }

    tryRotate(grid, x, y, fromRot, toRot, type, path, queue, seen, cmd) {
        const key = `${fromRot}>${toRot}`;
        const kicks = type === 'I' ? (KICKS_I[key] || [[0,0]]) : type === 'O' ? (KICKS_O[key] || [[0,0]]) : (KICKS_JLSTZ[key] || [[0,0]]);
        const nextShape = this.rotatedShapes[type][toRot];

        for (const [dx, dy] of kicks) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (!this.collide(grid, nextShape, ny, nx)) {
                if (!seen.has(`${nx},${ny},${toRot}`)) {
                    seen.add(`${nx},${ny},${toRot}`);
                    queue.push({ x: nx, y: ny, rot: toRot, path: [...path, cmd] });
                }
                return; // Only first valid kick
            }
        }
    }

    simulateAndScore(grid, move, type) {
        // 1. Simulate Placement
        const newGrid = grid.map(r => [...r]);
        const shape = this.rotatedShapes[type][move.rot];
        
        for (let y = 0; y < shape.length; y++) {
            for (let x = 0; x < shape[y].length; x++) {
                if (shape[y][x]) {
                    const gy = move.y + y;
                    const gx = move.x + x;
                    if (gy >= 0 && gy < ROWS && gx >= 0 && gx < COLS) {
                        newGrid[gy][gx] = type;
                    }
                }
            }
        }

        // 2. Check Lines
        let lines = 0;
        for (let y = ROWS - 1; y >= 0; y--) {
            if (newGrid[y].every(c => c !== 0)) {
                newGrid.splice(y, 1);
                newGrid.unshift(Array(COLS).fill(0));
                lines++;
                y++;
            }
        }

        // 3. T-Spin Check
        let isTSpin = false;
        if (type === 'T') {
             const cx = move.x + 1; 
             const cy = move.y + 1;
             let corners = 0;
             const offsets = [[-1,-1], [1,-1], [-1,1], [1,1]];
             for (const [ox, oy] of offsets) {
                 const tx = cx + ox;
                 const ty = cy + oy;
                 if (tx < 0 || tx >= COLS || ty >= ROWS || (ty >= 0 && grid[ty][tx])) {
                     corners++;
                 }
             }
             if (corners >= 3) isTSpin = true;
        }

        // 4. Calculate Score
        let score = 0;
        score += lines * WEIGHTS.lineClear;
        if (lines === 4) score += 50; // Bonus for Tetris
        if (isTSpin) score += WEIGHTS.tSpin * (lines + 1);
        
        // Analyze Board
        let holes = 0;
        let blockades = 0;
        let heights = new Array(COLS).fill(0);
        let aggregateHeight = 0;
        
        for (let x = 0; x < COLS; x++) {
            let blockFound = false;
            for (let y = 0; y < ROWS; y++) {
                if (newGrid[y][x] !== 0) {
                    if (!blockFound) {
                        blockFound = true;
                        heights[x] = ROWS - y;
                    }
                } else if (blockFound) {
                    holes++;
                    blockades++;
                }
            }
            aggregateHeight += heights[x];
        }
        
        score += holes * WEIGHTS.hole;
        score += blockades * WEIGHTS.blockade;
        score += aggregateHeight * WEIGHTS.height;
        
        let bumpiness = 0;
        for(let x=0; x<COLS-1; x++) bumpiness += Math.abs(heights[x] - heights[x+1]);
        score += bumpiness * WEIGHTS.bumpiness;
        
        // Well preference (Right side)
        const maxH = Math.max(...heights);
        if (maxH > 0 && heights[9] < maxH - 2) score += WEIGHTS.well;

        // Danger
        if (maxH > 18) score -= 500;

        return { grid: newGrid, score };
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
  }

  window.TetrisBot = TetrisBot;
})();
