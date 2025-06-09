// Game constants
const CELL_SIZE = 30;
const PLAYER_SIZE = 16;
const POWERUP_SIZE = 12;
const ENEMY_SIZE = 18;
const PLAYER_SPEED = 4;
const ENEMY_BASE_SPEED = 1.5;

// Game state
let canvas, ctx;
let player = { 
    x: 0, y: 0, 
    speed: PLAYER_SPEED, 
    currentPowerUp: null 
};
let mazeData = null;
let maze = [];
let exit = { x: 0, y: 0 };
let powerUps = [];
let enemies = [];
let currentLevel = 1;
let maxLevel = 8;
let keys = { w: false, a: false, s: false, d: false };
let gameRunning = false;
let mazeGenerator = null;

// Modal elements
const levelCompleteModal = document.getElementById('level-complete');
const gameOverModal = document.getElementById('game-over');
const startScreen = document.getElementById('start-screen');
const nextLevelBtn = document.getElementById('next-level-btn');
const restartBtn = document.getElementById('restart-btn');
const startGameBtn = document.getElementById('start-game-btn');
const levelDisplay = document.getElementById('level-display');
const powerupsDisplay = document.getElementById('powerups-display');

// Initialize the game
function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    mazeGenerator = new MazeGenerator();
    
    // Event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    nextLevelBtn.addEventListener('click', startNextLevel);
    restartBtn.addEventListener('click', restartGame);
    startGameBtn.addEventListener('click', startGame);
    
    // Show start screen
    startScreen.style.display = 'flex';
}

function startGame() {
    startScreen.style.display = 'none';
    currentLevel = 1;
    player.currentPowerUp = null;
    initLevel(currentLevel);
    gameRunning = true;
    gameLoop();
}

function initLevel(level) {
    // Generate new maze
    mazeData = mazeGenerator.generate(level);
    maze = mazeData.maze;
    
    // Reset player position
    player.x = mazeData.startX * CELL_SIZE + CELL_SIZE / 2;
    player.y = mazeData.startY * CELL_SIZE + CELL_SIZE / 2;
    
    // Clear power-up from previous level
    player.currentPowerUp = null;
    
    // Set exit position
    exit = {
        x: mazeData.endX * CELL_SIZE + CELL_SIZE / 2,
        y: mazeData.endY * CELL_SIZE + CELL_SIZE / 2
    };
    
    // Generate power-ups (only 1 per level)
    powerUps = [];
    const powerUpPositions = mazeGenerator.findPowerUpPositions(mazeData, 1);
    const powerUpTypes = ['speed', 'invincibility'];
    
    for (let i = 0; i < powerUpPositions.length; i++) {
        const pos = powerUpPositions[i];
        const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        powerUps.push({
            x: pos.x * CELL_SIZE + CELL_SIZE / 2,
            y: pos.y * CELL_SIZE + CELL_SIZE / 2,
            type: type,
            collected: false
        });
    }
    
    // Generate enemies
    enemies = [];
    const enemyCount = Math.min(level, 6);
    const enemyPositions = mazeGenerator.findEnemyPositions(mazeData, enemyCount);
    
    for (const pos of enemyPositions) {
        enemies.push({
            x: pos.x * CELL_SIZE + CELL_SIZE / 2,
            y: pos.y * CELL_SIZE + CELL_SIZE / 2,
            speed: ENEMY_BASE_SPEED * (1 + level * 0.15),
            direction: { 
                x: Math.random() < 0.5 ? -1 : 1, 
                y: Math.random() < 0.5 ? -1 : 1 
            },
            lastDirectionChange: 0
        });
    }
    
    // Update UI
    levelDisplay.textContent = level;
    updatePowerupsDisplay();
}

function gameLoop() {
    if (!gameRunning) return;
    
    update();
    render();
    requestAnimationFrame(gameLoop);
}

function update() {
    // Update player position based on keyboard input
    let speed = player.speed;
    if (player.currentPowerUp === 'speed') {
        speed *= 1.8;
    }
    
    let dx = 0, dy = 0;
    if (keys.w) dy -= speed;
    if (keys.a) dx -= speed;
    if (keys.s) dy += speed;
    if (keys.d) dx += speed;
    
    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
        const factor = 1 / Math.sqrt(2);
        dx *= factor;
        dy *= factor;
    }
    
    // Check collision with maze walls before moving
    const newX = player.x + dx;
    const newY = player.y + dy;
    
    if (!checkWallCollision(newX, player.y)) {
        player.x = newX;
    }
    
    if (!checkWallCollision(player.x, newY)) {
        player.y = newY;
    }
    
    // Check if player reached exit
    const distToExit = Math.hypot(player.x - exit.x, player.y - exit.y);
    if (distToExit < CELL_SIZE / 2) {
        levelComplete();
        return;
    }
    
    // Check for power-up collection (only if player doesn't have one)
    if (!player.currentPowerUp) {
        for (const powerUp of powerUps) {
            if (!powerUp.collected) {
                const dist = Math.hypot(player.x - powerUp.x, player.y - powerUp.y);
                if (dist < (PLAYER_SIZE + POWERUP_SIZE) / 2) {
                    collectPowerUp(powerUp);
                    break; // Only one power-up at a time
                }
            }
        }
    }
    
    // Update enemies
    for (const enemy of enemies) {
        updateEnemy(enemy);
        
        // Check for collision with player if not invincible
        if (player.currentPowerUp !== 'invincibility') {
            const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
            if (dist < (PLAYER_SIZE + ENEMY_SIZE) / 2) {
                gameOver();
                return;
            }
        }
    }
}

function updateEnemy(enemy) {
    enemy.lastDirectionChange++;
    
    // Move enemy
    const oldX = enemy.x;
    const oldY = enemy.y;
    enemy.x += enemy.direction.x * enemy.speed;
    enemy.y += enemy.direction.y * enemy.speed;
    
    // Check wall collision
    if (checkWallCollision(enemy.x, enemy.y)) {
        // Revert position
        enemy.x = oldX;
        enemy.y = oldY;
        
        // Change direction
        changeEnemyDirection(enemy);
    } else if (enemy.lastDirectionChange > 60 + Math.random() * 120) {
        // Randomly change direction occasionally
        if (Math.random() < 0.3) {
            changeEnemyDirection(enemy);
        }
    }
}

function changeEnemyDirection(enemy) {
    const directions = [
        { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }
    ];
    
    // Try different directions until we find a valid one
    const shuffled = directions.sort(() => Math.random() - 0.5);
    
    for (const dir of shuffled) {
        const testX = enemy.x + dir.x * enemy.speed * 3;
        const testY = enemy.y + dir.y * enemy.speed * 3;
        
        if (!checkWallCollision(testX, testY)) {
            enemy.direction = dir;
            enemy.lastDirectionChange = 0;
            break;
        }
    }
}

function checkWallCollision(x, y) {
    // Calculate maze offset for centering
    const offsetX = (canvas.width - mazeData.width * CELL_SIZE) / 2;
    const offsetY = (canvas.height - mazeData.height * CELL_SIZE) / 2;
    
    // Convert world coordinates to maze coordinates
    const adjustedX = x - offsetX;
    const adjustedY = y - offsetY;
    
    // Check each corner of the entity sprite
    const corners = [
        { x: adjustedX - PLAYER_SIZE / 2, y: adjustedY - PLAYER_SIZE / 2 },
        { x: adjustedX + PLAYER_SIZE / 2, y: adjustedY - PLAYER_SIZE / 2 },
        { x: adjustedX - PLAYER_SIZE / 2, y: adjustedY + PLAYER_SIZE / 2 },
        { x: adjustedX + PLAYER_SIZE / 2, y: adjustedY + PLAYER_SIZE / 2 }
    ];
    
    for (const corner of corners) {
        const mazeX = Math.floor(corner.x / CELL_SIZE);
        const mazeY = Math.floor(corner.y / CELL_SIZE);
        
        // Check if out of bounds or hitting a wall
        if (mazeX < 0 || mazeY < 0 || 
            mazeX >= mazeData.width || mazeY >= mazeData.height || 
            maze[mazeY][mazeX] === 1) {
            return true;
        }
    }
    
    return false;
}

function collectPowerUp(powerUp) {
    powerUp.collected = true;
    player.currentPowerUp = powerUp.type;
    updatePowerupsDisplay();
}

function updatePowerupsDisplay() {
    if (!player.currentPowerUp) {
        powerupsDisplay.textContent = 'None';
    } else {
        const displayName = player.currentPowerUp.charAt(0).toUpperCase() + player.currentPowerUp.slice(1);
        powerupsDisplay.textContent = displayName;
    }
}

function render() {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate offset to center the maze
    const offsetX = (canvas.width - mazeData.width * CELL_SIZE) / 2;
    const offsetY = (canvas.height - mazeData.height * CELL_SIZE) / 2;
    
    // Draw maze
    for (let y = 0; y < mazeData.height; y++) {
        for (let x = 0; x < mazeData.width; x++) {
            const cellX = x * CELL_SIZE + offsetX;
            const cellY = y * CELL_SIZE + offsetY;
            
            if (maze[y][x] === 1) {
                // Draw wall with gradient
                const gradient = ctx.createLinearGradient(cellX, cellY, cellX + CELL_SIZE, cellY + CELL_SIZE);
                gradient.addColorStop(0, '#2c3e50');
                gradient.addColorStop(1, '#1a252f');
                ctx.fillStyle = gradient;
                ctx.fillRect(cellX, cellY, CELL_SIZE, CELL_SIZE);
                
                // Add subtle border
                ctx.strokeStyle = '#34495e';
                ctx.lineWidth = 1;
                ctx.strokeRect(cellX, cellY, CELL_SIZE, CELL_SIZE);
            } else {
                // Draw path with subtle gradient
                const gradient = ctx.createLinearGradient(cellX, cellY, cellX + CELL_SIZE, cellY + CELL_SIZE);
                gradient.addColorStop(0, '#ecf0f1');
                gradient.addColorStop(1, '#bdc3c7');
                ctx.fillStyle = gradient;
                ctx.fillRect(cellX, cellY, CELL_SIZE, CELL_SIZE);
            }
        }
    }
    
    // Draw exit with animated glow
    const time = Date.now() * 0.005;
    const glowSize = 8 + Math.sin(time) * 3;
    
    ctx.save();
    ctx.shadowColor = '#2ecc71';
    ctx.shadowBlur = glowSize;
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.arc(exit.x + offsetX, exit.y + offsetY, CELL_SIZE / 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner bright core
    ctx.fillStyle = '#a9ffcd';
    ctx.beginPath();
    ctx.arc(exit.x + offsetX, exit.y + offsetY, CELL_SIZE / 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Draw power-ups
    for (const powerUp of powerUps) {
        if (!powerUp.collected) {
            const glowTime = Date.now() * 0.008;
            const powerUpGlow = 4 + Math.sin(glowTime) * 2;
            
            ctx.save();
            if (powerUp.type === 'speed') {
                ctx.shadowColor = '#f1c40f';
                ctx.fillStyle = '#f1c40f';
            } else {
                ctx.shadowColor = '#9b59b6';
                ctx.fillStyle = '#9b59b6';
            }
            ctx.shadowBlur = powerUpGlow;
            
            ctx.beginPath();
            ctx.arc(powerUp.x + offsetX, powerUp.y + offsetY, POWERUP_SIZE / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner core
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(powerUp.x + offsetX, powerUp.y + offsetY, POWERUP_SIZE / 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    
    // Draw enemies
    for (const enemy of enemies) {
        ctx.save();
        ctx.shadowColor = '#e74c3c';
        ctx.shadowBlur = 5;
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(enemy.x + offsetX, enemy.y + offsetY, ENEMY_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Enemy eyes
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(enemy.x + offsetX - 3, enemy.y + offsetY - 2, 2, 0, Math.PI * 2);
        ctx.arc(enemy.x + offsetX + 3, enemy.y + offsetY - 2, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(enemy.x + offsetX - 3, enemy.y + offsetY - 2, 1, 0, Math.PI * 2);
        ctx.arc(enemy.x + offsetX + 3, enemy.y + offsetY - 2, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    // Draw player
    ctx.save();
    let playerColor = '#3498db';
    let shadowColor = '#3498db';
    
    if (player.currentPowerUp === 'speed') {
        playerColor = '#f1c40f';
        shadowColor = '#f1c40f';
    } else if (player.currentPowerUp === 'invincibility') {
        playerColor = '#9b59b6';
        shadowColor = '#9b59b6';
        // Add pulsing effect for invincibility
        const pulseTime = Date.now() * 0.01;
        ctx.globalAlpha = 0.7 + Math.sin(pulseTime) * 0.3;
    }
    
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = 8;
    ctx.fillStyle = playerColor;
    ctx.beginPath();
    ctx.arc(player.x + offsetX, player.y + offsetY, PLAYER_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Player face
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(player.x + offsetX - 2, player.y + offsetY - 2, 1.5, 0, Math.PI * 2);
    ctx.arc(player.x + offsetX + 2, player.y + offsetY - 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Movement indicator
    if (keys.w || keys.a || keys.s || keys.d) {
        const indicatorX = player.x + offsetX + (keys.d ? 6 : (keys.a ? -6 : 0));
        const indicatorY = player.y + offsetY + (keys.s ? 6 : (keys.w ? -6 : 0));
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(indicatorX, indicatorY, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function handleKeyDown(e) {
    const key = e.key.toLowerCase();
    if (key === 'w') keys.w = true;
    if (key === 'a') keys.a = true;
    if (key === 's') keys.s = true;
    if (key === 'd') keys.d = true;
    e.preventDefault();
}

function handleKeyUp(e) {
    const key = e.key.toLowerCase();
    if (key === 'w') keys.w = false;
    if (key === 'a') keys.a = false;
    if (key === 's') keys.s = false;
    if (key === 'd') keys.d = false;
    e.preventDefault();
}

function levelComplete() {
    gameRunning = false;
    
    if (currentLevel < maxLevel) {
        levelCompleteModal.style.display = 'block';
    } else {
        // Game completed
        levelCompleteModal.querySelector('h2').textContent = 'Game Complete!';
        levelCompleteModal.querySelector('p').textContent = 'Congratulations! You\'ve mastered all the mazes!';
        levelCompleteModal.querySelector('button').textContent = 'Play Again';
        levelCompleteModal.style.display = 'block';
    }
}

function gameOver() {
    gameRunning = false;
    gameOverModal.style.display = 'block';
}

function startNextLevel() {
    levelCompleteModal.style.display = 'none';
    
    if (currentLevel < maxLevel) {
        currentLevel++;
        // Power-up expires when moving to next level
        player.currentPowerUp = null;
    } else {
        currentLevel = 1;
        player.currentPowerUp = null;
    }
    
    initLevel(currentLevel);
    gameRunning = true;
    gameLoop();
}

function restartGame() {
    gameOverModal.style.display = 'none';
    player.currentPowerUp = null;
    initLevel(currentLevel);
    gameRunning = true;
    gameLoop();
}

// Start the game
window.onload = init;
