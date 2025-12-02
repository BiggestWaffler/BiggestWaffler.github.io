// Wave Mode Game - Geometry Dash inspired
// Wave moves diagonally, hold to ascend, release to descend

(function() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const menuEl = document.getElementById('menu');
  const gameContainerEl = document.querySelector('.game-container');
  const overlayEl = document.getElementById('overlay');
  const distanceEl = document.getElementById('distance');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');

  // Game state
  let gameState = 'menu'; // 'menu', 'playing', 'paused', 'gameover'
  let difficulty = 'medium';
  let speed = 'normal';
  let isHolding = false;
  let distance = 0;
  let score = 0;
  let bestScore = 0;

  // Wave properties
  const WAVE_SIZE = 20;
  const WAVE_SPEED = 5; // Base speed (pixels per frame)
  const WAVE_ANGLE = Math.PI / 4; // 45 degrees
  let waveX = 100;
  let waveY = 300;
  let waveVelocityX = 0;
  let waveVelocityY = 0;

  // Camera and world
  let cameraX = 0;
  let worldWidth = 0;
  let worldHeight = canvas.height;

  // Obstacles (slopes)
  let obstacles = [];
  const OBSTACLE_COLOR = '#ff00ff';
  const WAVE_COLOR = '#00ffff';

  // Difficulty settings
  const DIFFICULTY_SETTINGS = {
    easy: {
      gap: 220,           // Wide tunnel
      minLen: 100,        // Long, slow slopes
      maxLen: 200,
    },
    medium: {
      gap: 170,           // Tighter tunnel
      minLen: 80,         // Faster switching
      maxLen: 160,
    },
    hard: {
      gap: 130,           // Hard tunnel
      minLen: 50,         // Rapid switching
      maxLen: 120,
    },
    extreme: {
      gap: 100,           // Very tight
      minLen: 40,
      maxLen: 90,
    }
  };

  // Speed multipliers
  const SPEED_MULTIPLIERS = {
    slow: 0.7,
    normal: 1.0,
    fast: 1.5,
    ultra: 2.0
  };

  // Load best score
  try {
    const saved = localStorage.getItem('wave.best');
    if (saved) bestScore = parseInt(saved, 10) || 0;
    bestEl.textContent = bestScore;
  } catch {}

  // Menu setup
  const difficultyBtns = document.querySelectorAll('.difficulty-btn');
  const speedBtns = document.querySelectorAll('.speed-btn');

  difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      difficultyBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      difficulty = btn.getAttribute('data-difficulty');
    });
  });

  speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      speedBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      speed = btn.getAttribute('data-speed');
    });
  });

  // Set default selections
  document.querySelector('[data-difficulty="medium"]').classList.add('active');
  document.querySelector('[data-speed="normal"]').classList.add('active');

  // Start button
  const startBtn = document.querySelector('.start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', startGame);
  }

  // Update the startGame function
  function startGame() {
    gameState = 'playing';
    menuEl.style.display = 'none';
    gameContainerEl.style.display = 'block';
    
    // Reset game state
    distance = 0;
    score = 0;
    cameraX = 0;
    waveX = 200; // Start slightly further in
    waveY = canvas.height / 2;
    obstacles = [];
    isHolding = false;
    
    // 1. GENERATE THE STARTING WALLS (The Funnel)
    createStartingBorder();
    
    // 2. Continue with random generation
    generateObstacles();
    
    updateUI();
  }

  // NEW FUNCTION: Creates a safe funnel at the start
  function createStartingBorder() {
    const startLength = 600; // How long the starting straight path is
    const tunnelHeight = 200; // Height of the safe zone
    const centerY = canvas.height / 2;
    
    // Ceiling Block (A flat slope)
    obstacles.push({
      x: -100, // Start slightly off-screen left
      y: centerY - tunnelHeight,
      length: startLength,
      angle: 0, // Flat
      type: 'slope'
    });
    
    // Floor Block (A flat slope)
    obstacles.push({
      x: -100, 
      y: centerY + tunnelHeight,
      length: startLength,
      angle: 0, // Flat
      type: 'slope'
    });
  }

  // Global variable to track where the tunnel wants to go
  let currentTargetY = null;

  function generateObstacles() {
    const settings = DIFFICULTY_SETTINGS[difficulty];
    const slopeAngle = Math.PI / 4; // 45 degrees
    
    // 1. Find start point (connect to last obstacle)
    let lastPathX = cameraX + canvas.width;
    let lastPathY = canvas.height / 2;
    
    // Use the end of the last obstacle to determine start position
    if (obstacles.length > 0) {
      // Find the furthest obstacle to connect to
      let maxEnd = 0;
      let connector = null;
      
      // We look at the last few obstacles to find the connection point
      // We specifically want the "Center line"
      // Simplification: Grab the last 'floor' obstacle and subtract half the gap
      const lastObs = obstacles[obstacles.length - 1];
      
      const endX = lastObs.x + lastObs.length * Math.cos(lastObs.angle);
      const endY = lastObs.y + lastObs.length * Math.sin(lastObs.angle);
      
      lastPathX = endX;
      
      // Re-calculate center based on whether last obs was Top or Bottom
      // Heuristic: If Y is large, it's floor. If Y is small, it's ceiling.
      if (lastObs.y > canvas.height / 2) {
         lastPathY = endY - (settings.gap / 2); // It was floor, go up
      } else {
         lastPathY = endY + (settings.gap / 2); // It was ceiling, go down
      }
    }

    // Initialize Target if null
    if (currentTargetY === null) currentTargetY = canvas.height / 2;

    // Generate loop
    while (lastPathX < cameraX + canvas.width * 3) {
      
      // 2. DECIDE TARGET HEIGHT
      // If we are close to the target, pick a new random one
      if (Math.abs(lastPathY - currentTargetY) < 100) {
        // Pick a random spot between 15% and 85% of screen height
        const margin = 150;
        currentTargetY = margin + Math.random() * (canvas.height - margin * 2);
      }
      
      // 3. DETERMINE BIAS (How to get to target)
      // If we need to go DOWN (Target > Current), Down slopes should be longer
      // If we need to go UP (Target < Current), Up slopes should be longer
      const goingDown = currentTargetY > lastPathY;
      
      // Base lengths from difficulty settings
      const minL = settings.minLen;
      const maxL = settings.maxLen;
      
      let upLen, downLen;

      if (goingDown) {
        // Bias: Long Down, Short Up
        downLen = (maxL * 0.8) + Math.random() * (maxL * 0.4); 
        upLen = minL + Math.random() * (minL * 0.5); // Keep up short
      } else {
        // Bias: Long Up, Short Down
        upLen = (maxL * 0.8) + Math.random() * (maxL * 0.4);
        downLen = minL + Math.random() * (minL * 0.5); // Keep down short
      }

      // 4. GENERATE SEGMENTS (A pair: One UP, One DOWN)
      // We always generate a V shape or Inverted V. 
      // To ensure flow, let's just do UP-slope then DOWN-slope sequence 
      // relative to the center path.

      // --- STAGE 1: GOING UP (/) ---
      // Ceiling
      obstacles.push({
        x: lastPathX,
        y: lastPathY - settings.gap/2,
        length: upLen,
        angle: -slopeAngle, // Up
        type: 'slope'
      });
      // Floor
      obstacles.push({
        x: lastPathX,
        y: lastPathY + settings.gap/2,
        length: upLen,
        angle: -slopeAngle, // Up
        type: 'slope'
      });
      
      // Update Center Position
      lastPathX += upLen * Math.cos(-slopeAngle);
      lastPathY += upLen * Math.sin(-slopeAngle);

      // --- STAGE 2: GOING DOWN (\) ---
      // Ceiling
      obstacles.push({
        x: lastPathX,
        y: lastPathY - settings.gap/2,
        length: downLen,
        angle: slopeAngle, // Down
        type: 'slope'
      });
      // Floor
      obstacles.push({
        x: lastPathX,
        y: lastPathY + settings.gap/2,
        length: downLen,
        angle: slopeAngle, // Down
        type: 'slope'
      });

      // Update Center Position
      lastPathX += downLen * Math.cos(slopeAngle);
      lastPathY += downLen * Math.sin(slopeAngle);
      
      // Safety Clamp: If random gen pushes us off screen, reset to center
      if (lastPathY < 50 || lastPathY > canvas.height - 50) {
        lastPathY = canvas.height / 2;
        currentTargetY = canvas.height / 2;
      }
    }
    
    worldWidth = lastPathX;
  }

  // Input handling
  window.addEventListener('keydown', (e) => {
    if (gameState === 'menu') {
      if (e.key === 'Enter' || e.key === ' ') {
        startGame();
      }
      return;
    }
    
    if (gameState === 'gameover') {
      if (e.key === 'Enter' || e.key === ' ') {
        resetGame();
      } else if (e.key === 'm' || e.key === 'M') {
        returnToMenu();
      }
      return;
    }
    
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      togglePause();
      return;
    }
    
    if (gameState === 'playing') {
      isHolding = true;
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (gameState === 'playing') {
      isHolding = false;
      e.preventDefault();
    }
  });

  // Mouse/touch support
  canvas.addEventListener('mousedown', () => {
    if (gameState === 'playing') {
      isHolding = true;
    }
  });

  canvas.addEventListener('mouseup', () => {
    if (gameState === 'playing') {
      isHolding = false;
    }
  });

  canvas.addEventListener('mouseleave', () => {
    if (gameState === 'playing') {
      isHolding = false;
    }
  });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState === 'playing') {
      isHolding = true;
    }
  });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (gameState === 'playing') {
      isHolding = false;
    }
  });

  // Game loop
  function gameLoop() {
    if (gameState === 'playing') {
      update();
    }
    draw();
    requestAnimationFrame(gameLoop);
  }

  function update() {
    const speedMult = SPEED_MULTIPLIERS[speed];
    const baseSpeed = WAVE_SPEED * speedMult;
    
    // Update wave movement
    if (isHolding) {
      // Ascend at 45° angle
      waveVelocityX = baseSpeed * Math.cos(WAVE_ANGLE);
      waveVelocityY = -baseSpeed * Math.sin(WAVE_ANGLE);
    } else {
      // Descend at 45° angle
      waveVelocityX = baseSpeed * Math.cos(WAVE_ANGLE);
      waveVelocityY = baseSpeed * Math.sin(WAVE_ANGLE);
    }
    
    waveX += waveVelocityX;
    waveY += waveVelocityY;
    
    // Boundary check - both ceiling and floor are safe
    if (waveY < 0) {
      waveY = 0; // Clamp to ceiling
    }
    
    // Floor is safe - clamp to floor but allow horizontal movement
    if (waveY > canvas.height) {
      waveY = canvas.height;
    }
    
    // Update camera to follow wave
    cameraX = waveX - 200;
    
    // Update distance and score
    distance = Math.floor(waveX / 10);
    score = distance;
    
    // Generate more obstacles if needed
    if (cameraX + canvas.width > worldWidth - canvas.width) {
      generateObstacles();
    }
    
    // Remove obstacles behind camera
    obstacles = obstacles.filter(obs => obs.x + obs.length > cameraX - 100);
    
    // Check collisions
    if (checkCollision()) {
      gameOver();
    }
    
    updateUI();
  }

  function checkCollision() {
    const waveRadius = WAVE_SIZE / 2;
    
    for (const obs of obstacles) {
      if (obs.type === 'slope') {
        // Check collision with slope using line-circle intersection
        const slopeEndX = obs.x + obs.length * Math.cos(obs.angle);
        const slopeEndY = obs.y + obs.length * Math.sin(obs.angle);
        
        // Check if wave is near the slope's X range
        const minX = Math.min(obs.x, slopeEndX);
        const maxX = Math.max(obs.x, slopeEndX);
        const minY = Math.min(obs.y, slopeEndY);
        const maxY = Math.max(obs.y, slopeEndY);
        
        // Quick bounding box check
        if (waveX + waveRadius < minX || waveX - waveRadius > maxX ||
            waveY + waveRadius < minY || waveY - waveRadius > maxY) {
          continue;
        }
        
        // Line-circle intersection test
        const dx = slopeEndX - obs.x;
        const dy = slopeEndY - obs.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) continue;
        
        // Vector from slope start to wave center
        const toWaveX = waveX - obs.x;
        const toWaveY = waveY - obs.y;
        
        // Project wave center onto slope line
        const t = Math.max(0, Math.min(1, (toWaveX * dx + toWaveY * dy) / (length * length)));
        
        // Closest point on line to wave center
        const closestX = obs.x + t * dx;
        const closestY = obs.y + t * dy;
        
        // Distance from wave center to closest point on line
        const distX = waveX - closestX;
        const distY = waveY - closestY;
        const distance = Math.sqrt(distX * distX + distY * distY);
        
        // Check collision (slope thickness + wave radius)
        const slopeThickness = 10;
        if (distance < waveRadius + slopeThickness) {
          return true;
        }
      }
      // No spikes - only slopes
    }
    
    return false;
  }

  function draw() {
    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid background
    drawGrid();
    
    if (gameState === 'playing' || gameState === 'paused' || gameState === 'gameover') {
      // Draw obstacles
      drawObstacles();
      
      // Draw wave
      drawWave();
    }
    
    // Draw overlay
    drawOverlay();
  }

  function drawGrid() {
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    const gridSize = 50;
    const startX = Math.floor(cameraX / gridSize) * gridSize - cameraX;
    
    // Vertical lines
    for (let x = startX; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }

  function drawObstacles() {
    ctx.strokeStyle = OBSTACLE_COLOR;
    ctx.fillStyle = OBSTACLE_COLOR;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    for (const obs of obstacles) {
      const obsScreenX = obs.x - cameraX;
      
      if (obsScreenX + obs.length < 0 || obsScreenX > canvas.width) {
        continue; // Skip if off screen
      }
      
      if (obs.type === 'slope') {
        const slopeEndX = obs.x + obs.length * Math.cos(obs.angle);
        const slopeEndY = obs.y + obs.length * Math.sin(obs.angle);
        const obsScreenEndX = slopeEndX - cameraX;
        const obsScreenEndY = slopeEndY;
        
        ctx.beginPath();
        ctx.moveTo(obsScreenX, obs.y);
        ctx.lineTo(obsScreenEndX, obsScreenEndY);
        ctx.stroke();
      }
      // No spikes - only slopes
    }
  }

  function drawWave() {
    const screenX = waveX - cameraX;
    
    // Draw wave as a diamond/rhombus shape
    ctx.fillStyle = WAVE_COLOR;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(screenX, waveY - WAVE_SIZE / 2); // Top
    ctx.lineTo(screenX + WAVE_SIZE / 2, waveY); // Right
    ctx.lineTo(screenX, waveY + WAVE_SIZE / 2); // Bottom
    ctx.lineTo(screenX - WAVE_SIZE / 2, waveY); // Left
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Add glow effect
    ctx.shadowBlur = 20;
    ctx.shadowColor = WAVE_COLOR;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawOverlay() {
    if (gameState === 'paused') {
      overlayEl.innerHTML = `
        <div class="overlay-backdrop"></div>
        <div class="overlay-content">
          <h2>Paused</h2>
          <p>Press ESC or P to resume</p>
        </div>
      `;
      overlayEl.classList.add('visible', 'paused');
    } else if (gameState === 'gameover') {
      overlayEl.innerHTML = `
        <div class="overlay-backdrop"></div>
        <div class="overlay-content">
          <h2>Game Over</h2>
          <p>Distance: ${distance}</p>
          <p>Score: ${score}</p>
          <p>Press ENTER or SPACE to restart</p>
          <p>Press M to return to menu</p>
        </div>
      `;
      overlayEl.classList.add('visible', 'gameover');
    } else {
      overlayEl.classList.remove('visible');
      overlayEl.innerHTML = '';
    }
  }

  function togglePause() {
    if (gameState === 'playing') {
      gameState = 'paused';
    } else if (gameState === 'paused') {
      gameState = 'playing';
    }
  }

  function gameOver() {
    gameState = 'gameover';
    isHolding = false;
    
    // Update best score
    if (score > bestScore) {
      bestScore = score;
      try {
        localStorage.setItem('wave.best', String(bestScore));
      } catch {}
      bestEl.textContent = bestScore;
    }
  }

  function resetGame() {
    gameState = 'playing';
    distance = 0;
    score = 0;
    cameraX = 0;
    waveX = 100;
    waveY = canvas.height / 2;
    obstacles = [];
    isHolding = false;
    generateObstacles();
    updateUI();
  }

  function returnToMenu() {
    gameState = 'menu';
    menuEl.style.display = 'block';
    gameContainerEl.style.display = 'none';
    distance = 0;
    score = 0;
    cameraX = 0;
    waveX = 100;
    waveY = canvas.height / 2;
    obstacles = [];
    isHolding = false;
    updateUI();
  }

  function updateUI() {
    distanceEl.textContent = distance;
    scoreEl.textContent = score;
  }

  // Start menu loop
  gameLoop();
})();

