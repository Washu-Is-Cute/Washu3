const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let spears = [];
let enemies = [];
let player = { x: canvas.width / 2, y: canvas.height - 50 };
let combo = 0;
let bossTimer = null;
let gameOver = false;
let spearDamage = 1;
let enemyHealth = 1;
let bossHealth = 100;
let bossActive = false;
let bossOpacity = 1;
let lastThrowTime = 0;
let throwCooldown = 100; // Default throw cooldown
let currentDifficulty = "easy"; // Default difficulty
let highScore = 0; // Track high score

// Difficulty settings
const difficultySettings = {
    easy: { enemyHealth: 1, spawnInterval: 1500, throwCooldown: 100 },
    hard: { enemyHealth: 3, spawnInterval: 1200, throwCooldown: 100 },
    insane: { enemyHealth: 5, spawnInterval: 800, throwCooldown: 0 }, // No cooldown in insane
};

// Start screen state
let onStartScreen = true;

// Start screen rendering
function drawStartScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "black";
    ctx.font = "40px Arial";
    ctx.fillText("Press Enter to Start", canvas.width / 2 - 120, canvas.height / 2 - 40);
    ctx.font = "30px Arial";
    ctx.fillText(`High Score: ${highScore}`, canvas.width / 2 - 90, canvas.height / 2);
    ctx.fillText("Select Difficulty", canvas.width / 2 - 110, canvas.height / 2 + 50);
    ctx.fillText("Easy (1)", canvas.width / 2 - 60, canvas.height / 2 + 100);
    ctx.fillText("Hard (2)", canvas.width / 2 - 60, canvas.height / 2 + 150);
    ctx.fillText("Insane (3)", canvas.width / 2 - 60, canvas.height / 2 + 200);
}

// Initialize the game based on difficulty
function startGame() {
    onStartScreen = false;
    enemies = [];
    spears = [];
    player = { x: canvas.width / 2, y: canvas.height - 50 };
    combo = 0;
    gameOver = false;
    spearDamage = 1;
    bossActive = false;
    bossOpacity = 1;
    lastThrowTime = 0;
    
    // Apply the selected difficulty settings
    enemyHealth = difficultySettings[currentDifficulty].enemyHealth;
    throwCooldown = difficultySettings[currentDifficulty].throwCooldown;  // Now works without error
    
    setInterval(spawnEnemy, difficultySettings[currentDifficulty].spawnInterval); // Adjust spawn interval based on difficulty
    gameLoop();
}

// Spawn enemies from the left or right
function spawnEnemy() {
    if (bossActive) return; // Stop normal enemies when the boss is active
    
    let fromLeft = Math.random() < 0.5;
    let x = fromLeft ? 0 : canvas.width;
    let speed = fromLeft ? 1.5 : -1.5;

    if (combo > 0 && combo % 50 === 0 && !bossActive) {
        let boss = { x: canvas.width / 2, y: 50, speed: 0, health: bossHealth, boss: true, size: 80 };
        enemies = [boss]; // Clear existing enemies
        bossActive = true;
        startBossTimer();
    } else {
        enemies.push({ x, y: Math.random() * canvas.height, speed, health: enemyHealth, boss: false, size: 30 });
    }
}

// Start boss timer
function startBossTimer() {
    if (bossTimer) clearTimeout(bossTimer);
    bossTimer = setTimeout(() => {
        if (enemies.some(enemy => enemy.boss)) {
            gameOver = true;
            fadeOutBoss();
        }
    }, 20000); // 20 seconds to defeat boss
}

// Fade out boss on failure
function fadeOutBoss() {
    let fadeInterval = setInterval(() => {
        bossOpacity -= 0.05;
        if (bossOpacity <= 0) {
            clearInterval(fadeInterval);
            enemies = [];
            bossActive = false; // After boss fades out, allow enemies to spawn again
        }
    }, 100);
}

// Throw spears with cooldown
canvas.addEventListener("click", (event) => {
    if (gameOver) return;
    let currentTime = Date.now();
    if (currentTime - lastThrowTime < throwCooldown && currentDifficulty !== "insane") return; // No cooldown in insane
    lastThrowTime = currentTime;
    
    let angle = Math.atan2(event.clientY - player.y, event.clientX - player.x);
    spears.push({
        x: player.x,
        y: player.y,
        speed: 8,
        angle,
        dx: Math.cos(angle) * 8,
        dy: Math.sin(angle) * 8
    });
});

// Listen for the `;` key press to spawn the boss immediately
document.addEventListener("keydown", (event) => {
    if (event.key === ";") {
        if (!bossActive) { // Spawn boss if it's not already active
            let boss = { x: canvas.width / 2, y: 50, speed: 0, health: bossHealth, boss: true, size: 80 };
            enemies = [boss]; // Clear existing enemies
            bossActive = true;
            startBossTimer();
        }
    }
});

// Handle difficulty selection via keyboard
document.addEventListener("keydown", (event) => {
    if (onStartScreen) {
        if (event.key === "1") {
            currentDifficulty = "easy";
            startGame();
        } else if (event.key === "2") {
            currentDifficulty = "hard";
            startGame();
        } else if (event.key === "3") {
            currentDifficulty = "insane";
            startGame();
        } else if (event.key === "Enter") {
            startGame();
        }
    }
});

// Update game objects
function update() {
    if (gameOver) {
        if (combo > highScore) {
            highScore = combo; // Update high score if needed
        }
        return;
    }

    // Update spear positions
    spears.forEach((spear, index) => {
        spear.x += spear.dx;
        spear.y += spear.dy;
        if (spear.y < 0 || spear.x < 0 || spear.x > canvas.width) spears.splice(index, 1);
    });

    // Update enemies
    enemies.forEach((enemy, eIndex) => {
        // Move enemies across the screen
        enemy.x += enemy.speed;

        spears.forEach((spear, sIndex) => {
            let dx = enemy.x - spear.x;
            let dy = enemy.y - spear.y;
            if (Math.sqrt(dx * dx + dy * dy) < enemy.size / 2) {
                enemy.health -= spearDamage;
                spears.splice(sIndex, 1);
                if (enemy.health <= 0) {
                    enemies.splice(eIndex, 1);
                    combo++;
                    if (enemy.boss) {
                        clearTimeout(bossTimer);
                        bossActive = false;
                        spearDamage++;
                        enemyHealth += 2;
                        bossHealth += 50;
                    }
                }
            }
        });

        // If the enemy moves off-screen and is not killed, reset combo and remove the enemy
        if (!enemy.boss && (enemy.x < 0 || enemy.x > canvas.width)) {
            enemies.splice(eIndex, 1);
            combo = 0; // Reset combo if an enemy escapes
        }
    });
}

// Draw everything
function draw() {
    if (onStartScreen) {
        drawStartScreen();
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameOver) {
        ctx.fillStyle = "red";
        ctx.font = "40px Arial";
        ctx.fillText("Game Over", canvas.width / 2 - 100, canvas.height / 2);
        ctx.fillText("Press Enter to Restart", canvas.width / 2 - 140, canvas.height / 2 + 40);
        return;
    }

    // Draw player
    ctx.fillStyle = "blue";
    ctx.fillRect(player.x - 15, player.y - 15, 30, 30);

    // Draw spears
    ctx.fillStyle = "yellow";
    spears.forEach(spear => {
        ctx.beginPath();
        ctx.moveTo(spear.x, spear.y);
        ctx.lineTo(spear.x - Math.cos(spear.angle) * 15, spear.y - Math.sin(spear.angle) * 15);
        ctx.stroke();
    });

    // Draw enemies
    enemies.forEach(enemy => {
        ctx.fillStyle = enemy.boss ? `rgba(128, 0, 128, ${bossOpacity})` : "red";
        ctx.fillRect(enemy.x - enemy.size / 2, enemy.y - enemy.size / 2, enemy.size, enemy.size);
        
        // Draw boss health bar
        if (enemy.boss) {
            ctx.fillStyle = "black";
            ctx.fillRect(enemy.x - enemy.size / 2, enemy.y - enemy.size / 2 - 10, enemy.size, 5);
            ctx.fillStyle = "green";
            ctx.fillRect(enemy.x - enemy.size / 2, enemy.y - enemy.size / 2 - 10, (enemy.health / bossHealth) * enemy.size, 5);
        }
    });

    // Draw combo counter
    ctx.fillStyle = "black";
    ctx.font = "30px Arial";
    ctx.fillText(`Combo: ${combo}`, 10, 40);
}

function gameLoop() {
    if (!gameOver) {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
}

gameLoop();
