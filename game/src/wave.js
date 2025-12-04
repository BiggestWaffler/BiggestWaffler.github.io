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
  
  // Trail system
  const trail = [];
  const MAX_TRAIL_LENGTH = 30;
  const TRAIL_SPACING = 3; // Distance between trail points

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
    trail.length = 0; // Clear trail
    isHolding = false;
    
    // 1. GENERATE THE STARTING WALLS (The Funnel)
    createStartingBorder();
    
    // 2. Continue with random generation
    generateObstacles();
    
    updateUI();
  }

  // NEW FUNCTION: Creates a safe funnel at the start
  function createStartingBorder() {
    const settings = DIFFICULTY_SETTINGS[difficulty];
    const startLength = 1000; // Longer start
    const centerY = canvas.height / 2;
    const gap = settings.gap;
    
    // Ceiling Block (A flat slope)
    obstacles.push({
      x: -500, // Start further back
      y: centerY - gap / 2,
      length: startLength,
      angle: 0, // Flat
      type: 'slope',
      isFloor: false,
      isSafe: true
    });
    
    // Floor Block (A flat slope)
    obstacles.push({
      x: -500, 
      y: centerY + gap / 2,
      length: startLength,
      angle: 0, // Flat
      type: 'slope',
      isFloor: true,
      isSafe: true
    });
  }

  // Global variable to track where the tunnel wants to go
  let currentTargetY = null;

  function generateObstacles() {
    const settings = DIFFICULTY_SETTINGS[difficulty];
    
    // 1. Find start point (connect to last obstacle)
    let lastPathX = cameraX + canvas.width;
    let lastPathY = canvas.height / 2;
    
    // Use the end of the last obstacle to determine start position
    if (obstacles.length > 0) {
      // Find the furthest obstacle to connect to
      const lastObs = obstacles[obstacles.length - 1];
      
      const endX = lastObs.x + lastObs.length * Math.cos(lastObs.angle);
      const endY = lastObs.y + lastObs.length * Math.sin(lastObs.angle);
      
      lastPathX = endX;
      
      // Robust center finding using isFloor property
      if (lastObs.isFloor) {
         lastPathY = endY - (settings.gap / 2); // It was floor, go up to center
      } else {
         lastPathY = endY + (settings.gap / 2); // It was ceiling, go down to center
      }
    }

    // Initialize Target if null
    if (currentTargetY === null) currentTargetY = canvas.height / 2;

    // Generate loop
    while (lastPathX < cameraX + canvas.width * 3) {
      
      // RANDOMIZE SLOPE ANGLE for this segment
      const slopeAngle = Math.PI / 4; // Fixed 45 degrees
      
      // 2. DECIDE TARGET HEIGHT
      // If we are close to the target, pick a new random one
      if (Math.abs(lastPathY - currentTargetY) < 100) {
        // Pick a random spot between 15% and 85% of screen height
        const margin = 150;
        currentTargetY = margin + Math.random() * (canvas.height - margin * 2);
      }
      
      // 3. DETERMINE SLOPE SIZE
      // 5 different sizes from 1/2 screen size down to 1/7 screen size
      // Equal probabilities for each size
      const r = Math.random();
      const h = canvas.height;
      let baseHeight = 0;
      
      if (r < 0.2) {
         baseHeight = h / 2; // 1/2 screen
      } else if (r < 0.4) {
         baseHeight = h / 3; // 1/3 screen
      } else if (r < 0.6) {
         baseHeight = h / 4; // 1/4 screen
      } else if (r < 0.8) {
         baseHeight = h / 5; // 1/5 screen
      } else {
         baseHeight = h / 7; // 1/7 screen
      }

      // Convert vertical height to hypotenuse length for 45 degree slope
      let segmentLen = baseHeight * Math.SQRT2;
      
      // 4. CHECK FOR IMPOSSIBLE GAPS
      // Since slopes are 45 degrees, vertical change equals horizontal change
      // If we are near the bottom and force a downward slope, we might push floor off screen too much
      // or if we are near top and go up.
      
      // Calculate projected Y after first segment
      const goingDown = currentTargetY > lastPathY;
      let startUp = !goingDown; 
      
      // Calculate expected Y position after movement
      // For 45 deg slope: deltaY = segmentLen * sin(45) = segmentLen / sqrt(2) = baseHeight
      const deltaY = baseHeight;
      
      // Calculate the floor Y position (center + gap/2)
      const currentFloorY = lastPathY + settings.gap/2;
      const currentCeilingY = lastPathY - settings.gap/2;
      
      // If we are going down, check if floor will go too deep
      if (!startUp) { // Going Down
          const projectedFloorY = currentFloorY + deltaY;
          // If floor goes way below screen, force Up instead
          if (projectedFloorY > canvas.height + 100) {
              startUp = true;
          }
      } else { // Going Up
          const projectedCeilingY = currentCeilingY - deltaY;
          // If ceiling goes way above screen, force Down instead
          if (projectedCeilingY < -100) {
              startUp = false;
          }
      }

      // 5. SYMMETRY CHECK
      // 25% chance to NOT mirror (single slope)
      // 75% chance to mirror (Up+Down or Down+Up)
      const useMirror = Math.random() > 0.25;
      
      let firstAngle, secondAngle; 
      
      // Setup angles based on starting direction
      if (startUp) {
        firstAngle = -slopeAngle; // Up (/)
        secondAngle = slopeAngle; // Down (\)
      } else {
        firstAngle = slopeAngle;  // Down (\)
        secondAngle = -slopeAngle;// Up (/)
      }
      
      // --- SEGMENT 1 ---
      // Ceiling
      obstacles.push({
        x: lastPathX,
        y: lastPathY - settings.gap/2,
        length: segmentLen,
        angle: firstAngle,
        type: 'slope',
        isFloor: false
      });
      // Floor
      obstacles.push({
        x: lastPathX,
        y: lastPathY + settings.gap/2,
        length: segmentLen,
        angle: firstAngle,
        type: 'slope',
        isFloor: true
      });
      
      // Update Center Position
      lastPathX += segmentLen * Math.cos(firstAngle);
      lastPathY += segmentLen * Math.sin(firstAngle);

      // --- SEGMENT 2 (Conditional Mirror) ---
      if (useMirror) {
        // Ceiling
        obstacles.push({
          x: lastPathX,
          y: lastPathY - settings.gap/2,
          length: segmentLen,
          angle: secondAngle,
          type: 'slope',
          isFloor: false
        });
        // Floor
        obstacles.push({
          x: lastPathX,
          y: lastPathY + settings.gap/2,
          length: segmentLen,
          angle: secondAngle,
          type: 'slope',
          isFloor: true
        });
        
        // Update Center Position
        lastPathX += segmentLen * Math.cos(secondAngle);
        lastPathY += segmentLen * Math.sin(secondAngle);
      }
      
      // Safety Clamp: If random gen pushes us off screen, reset to center
      // But allow going off-screen slightly (no hard clamp within the loop)
      // Just guide it back if it drifts too far for too long
      if (lastPathY < -200 || lastPathY > canvas.height + 200) {
         // If way off screen, force reset for next segment
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
    
    // Update trail
    const lastTrailPoint = trail[trail.length - 1];
    if (!lastTrailPoint || 
        Math.sqrt((waveX - lastTrailPoint.x) ** 2 + (waveY - lastTrailPoint.y) ** 2) >= TRAIL_SPACING) {
      trail.push({ x: waveX, y: waveY });
      if (trail.length > MAX_TRAIL_LENGTH) {
        trail.shift();
      }
    }
    
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
    
    // Remove obstacles behind camera (performance optimization)
    obstacles = obstacles.filter(obs => obs.x + obs.length > cameraX - 200);
    
    // Check collisions (only check visible obstacles for performance)
    if (checkCollision()) {
      gameOver();
    }
    
    updateUI();
  }

  function checkCollision() {
    const waveRadius = WAVE_SIZE / 2;
    const slopeThickness = 8; // Reduced from 10 for more accurate collision
    const collisionRadius = waveRadius + slopeThickness;
    
    // Only check obstacles near the wave (performance optimization)
    const checkRange = collisionRadius + 50;
    
    for (const obs of obstacles) {
      if (obs.type === 'slope') {
        // Quick distance check first (performance optimization)
        const slopeEndX = obs.x + obs.length * Math.cos(obs.angle);
        const slopeEndY = obs.y + obs.length * Math.sin(obs.angle);
        
        // Check if wave is near the slope's X range (expanded for accuracy)
        const minX = Math.min(obs.x, slopeEndX) - checkRange;
        const maxX = Math.max(obs.x, slopeEndX) + checkRange;
        const minY = Math.min(obs.y, slopeEndY) - checkRange;
        const maxY = Math.max(obs.y, slopeEndY) + checkRange;
        
        // Quick bounding box check
        if (waveX < minX || waveX > maxX || waveY < minY || waveY > maxY) {
          continue;
        }
        
        // Line-circle intersection test
        const dx = slopeEndX - obs.x;
        const dy = slopeEndY - obs.y;
        const lengthSq = dx * dx + dy * dy;
        
        if (lengthSq === 0) continue;
        
        const length = Math.sqrt(lengthSq);
        
        // Vector from slope start to wave center
        const toWaveX = waveX - obs.x;
        const toWaveY = waveY - obs.y;
        
        // Project wave center onto slope line
        const t = Math.max(0, Math.min(1, (toWaveX * dx + toWaveY * dy) / lengthSq));
        
        // Closest point on line to wave center
        const closestX = obs.x + t * dx;
        const closestY = obs.y + t * dy;
        
        // Distance from wave center to closest point on line
        const distX = waveX - closestX;
        const distY = waveY - closestY;
        const distanceSq = distX * distX + distY * distY;
        const distance = Math.sqrt(distanceSq);
        
        // More accurate collision check - only collide if actually touching
        if (distance < collisionRadius) {
          if (obs.isSafe) {
             // Push player away from wall without killing
             if (obs.isFloor) {
                 // Hit floor (bottom wall) -> push up
                 waveY = Math.min(waveY, obs.y - collisionRadius - 1);
             } else {
                 // Hit ceiling (top wall) -> push down
                 waveY = Math.max(waveY, obs.y + collisionRadius + 1);
             }
          } else {
             return true;
          }
        }
      }
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
    
    // Optimization: Batch draw calls
    ctx.beginPath();
    
    for (const obs of obstacles) {
      const obsScreenX = obs.x - cameraX;
      
      // Skip if completely off screen (with margin for smooth scrolling)
      if (obsScreenX + obs.length < -50 || obsScreenX > canvas.width + 50) {
        continue;
      }
      
      if (obs.type === 'slope') {
        const slopeEndX = obs.x + obs.length * Math.cos(obs.angle);
        const slopeEndY = obs.y + obs.length * Math.sin(obs.angle);
        const obsScreenEndX = slopeEndX - cameraX;
        const obsScreenEndY = slopeEndY;
        
        ctx.moveTo(obsScreenX, obs.y);
        ctx.lineTo(obsScreenEndX, obsScreenEndY);
      }
    }
    
    ctx.stroke();
  }

  function drawWave() {
    const screenX = waveX - cameraX;
    
    // Draw trail
    if (trail.length > 1) {
      ctx.save();
      for (let i = 0; i < trail.length - 1; i++) {
        const point = trail[i];
        const nextPoint = trail[i + 1];
        const screenPointX = point.x - cameraX;
        const screenNextX = nextPoint.x - cameraX;
        
        // Only draw if on screen
        if (screenPointX > -50 && screenPointX < canvas.width + 50) {
          const alpha = (i / trail.length) * 0.6; // Fade from 0.6 to 0
          const width = (i / trail.length) * 3 + 1; // Thinner as it fades
          
          ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
          ctx.lineWidth = width;
          ctx.lineCap = 'round';
          
          ctx.beginPath();
          ctx.moveTo(screenPointX, point.y);
          ctx.lineTo(screenNextX, nextPoint.y);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    
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
    trail.length = 0; // Clear trail
    isHolding = false;
    createStartingBorder();
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
    trail.length = 0; // Clear trail
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

