const canvas = document.getElementById('snake-game');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const finalScoreElement = document.getElementById('finalScore');
const gameOverModal = document.getElementById('gameOverModal');

// Game settings
const GRID_SIZE = 20;
const TILE_COUNT = 20; // 400px / 20px
const GAME_SPEED = 100; // ms per frame

// Game state
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let snake = [];
let food = { x: 0, y: 0 };
let dx = 0;
let dy = 0;
let gameLoop = null;
let isPaused = false;
let isGameOver = false;

// Initialize
highScoreElement.textContent = highScore;
resetGame();

// Controls
document.addEventListener('keydown', handleInput);

function handleInput(e) {
    // Prevent default scrolling for arrow keys and space
    if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }

    if (isGameOver && e.key === 'Enter') {
        resetGame();
        return;
    }

    if (e.key === ' ') {
        togglePause();
        return;
    }

    if (isPaused) return;

    const goingUp = dy === -1;
    const goingDown = dy === 1;
    const goingRight = dx === 1;
    const goingLeft = dx === -1;

    switch(e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (!goingRight) { dx = -1; dy = 0; }
            break;
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (!goingDown) { dx = 0; dy = -1; }
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (!goingLeft) { dx = 1; dy = 0; }
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (!goingUp) { dx = 0; dy = 1; }
            break;
    }
}

function resetGame() {
    // Stop existing loop
    if (gameLoop) clearInterval(gameLoop);
    
    // Reset state
    snake = [
        { x: 10, y: 10 },
        { x: 10, y: 11 },
        { x: 10, y: 12 }
    ];
    score = 0;
    dx = 0;
    dy = -1; // Start moving up
    isGameOver = false;
    isPaused = false;
    
    // Update UI
    scoreElement.textContent = score;
    gameOverModal.style.display = 'none';
    
    // Spawn first food
    spawnFood();
    
    // Start loop
    gameLoop = setInterval(update, GAME_SPEED);
}

function togglePause() {
    if (isGameOver) return;
    isPaused = !isPaused;
}

function spawnFood() {
    // Random position avoiding snake body
    while (true) {
        food.x = Math.floor(Math.random() * TILE_COUNT);
        food.y = Math.floor(Math.random() * TILE_COUNT);
        
        let onSnake = false;
        for (let segment of snake) {
            if (segment.x === food.x && segment.y === food.y) {
                onSnake = true;
                break;
            }
        }
        if (!onSnake) break;
    }
}

function update() {
    if (isPaused) return;

    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // Wall collision
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        gameOver();
        return;
    }

    // Self collision
    for (let segment of snake) {
        if (head.x === segment.x && head.y === segment.y) {
            gameOver();
            return;
        }
    }

    snake.unshift(head);

    // Check food
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        if (score > highScore) {
            highScore = score;
            highScoreElement.textContent = highScore;
            localStorage.setItem('snakeHighScore', highScore);
        }
        spawnFood();
    } else {
        snake.pop();
    }

    draw();
}

function draw() {
    // Clear background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid (optional, subtle)
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
    for(let i = 0; i < TILE_COUNT; i++) {
        ctx.beginPath();
        ctx.moveTo(i * GRID_SIZE, 0);
        ctx.lineTo(i * GRID_SIZE, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * GRID_SIZE);
        ctx.lineTo(canvas.width, i * GRID_SIZE);
        ctx.stroke();
    }

    // Draw Snake
    snake.forEach((segment, index) => {
        // Head is different color
        if (index === 0) {
            ctx.fillStyle = '#00ffff';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00ffff';
        } else {
            ctx.fillStyle = 'rgba(0, 255, 255, 0.6)';
            ctx.shadowBlur = 0;
        }
        
        ctx.fillRect(
            segment.x * GRID_SIZE + 1, 
            segment.y * GRID_SIZE + 1, 
            GRID_SIZE - 2, 
            GRID_SIZE - 2
        );
    });
    ctx.shadowBlur = 0; // Reset shadow

    // Draw Food
    ctx.fillStyle = '#ff00ff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff00ff';
    ctx.beginPath();
    ctx.arc(
        food.x * GRID_SIZE + GRID_SIZE/2,
        food.y * GRID_SIZE + GRID_SIZE/2,
        GRID_SIZE/2 - 2,
        0,
        Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;
}

function gameOver() {
    isGameOver = true;
    clearInterval(gameLoop);
    finalScoreElement.textContent = score;
    gameOverModal.style.display = 'flex';
}

