/**
 * ============================================================================
 * MAIN GAME ENGINE (COIN QUEST 2D)
 * ============================================================================
 * Coordinates the game loop, states (Start, Playing, Paused, GameOver, Victory),
 * camera scrolling, HUD updates, and user interactions.
 */

// Game States enum
const GameState = {
  START: 'START',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAMEOVER: 'GAMEOVER',
  VICTORY: 'VICTORY'
};

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // Virtual Internal Resolution
    this.width = 960;
    this.height = 540;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Subsystems
    this.input = new InputHandler();
    this.particles = new ParticleSystem();
    this.level = new Level();
    this.player = new Player(this.level.spawnPoint.x, this.level.spawnPoint.y);

    // Camera viewport offset
    this.camera = { x: 0, y: 0 };
    this.screenShake = 0;

    // Game Progression & Stats
    this.state = GameState.START;
    this.score = 0;
    this.coins = 0;
    this.totalCoins = this.level.coins.length;
    this.lives = 3;
    this.maxLives = 3;

    // Timing
    this.lastTime = 0;

    // DOM UI Elements
    this.hud = document.getElementById('hud');
    this.heartsDisplay = document.getElementById('hearts-display');
    this.coinCount = document.getElementById('coin-count');
    this.coinTotal = document.getElementById('coin-total');
    this.scoreDisplay = document.getElementById('score-display');
    this.btnAudio = document.getElementById('btn-audio');

    // Screen Overlays
    this.screens = {
      start: document.getElementById('start-screen'),
      pause: document.getElementById('pause-screen'),
      gameOver: document.getElementById('game-over-screen'),
      victory: document.getElementById('victory-screen')
    };

    // Initialize UI and Event Listeners
    this.bindUI();
    this.updateHUD();

    // Start Animation Frame Loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  // --------------------------------------------------------------------------
  // USER INTERFACE & BUTTON BINDINGS
  // --------------------------------------------------------------------------
  bindUI() {
    // Start Game
    document.getElementById('btn-start').addEventListener('click', () => {
      sounds.init();
      sounds.startBGM();
      this.startGame();
    });

    // Pause & Resume
    document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());
    document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());

    // Restart Buttons
    document.getElementById('btn-quick-restart').addEventListener('click', () => this.restartGame());
    document.getElementById('btn-pause-restart').addEventListener('click', () => this.restartGame());
    document.getElementById('btn-game-over-restart').addEventListener('click', () => this.restartGame());
    document.getElementById('btn-victory-restart').addEventListener('click', () => this.restartGame());

    // Sound Mute Toggle Button
    this.btnAudio.addEventListener('click', () => this.toggleAudio());
  }

  toggleAudio() {
    sounds.init();
    const isMuted = sounds.toggleMute();
    this.btnAudio.textContent = isMuted ? '🔇' : '🔊';
  }

  startGame() {
    this.state = GameState.PLAYING;
    this.screens.start.classList.add('hidden');
    this.hud.classList.remove('hidden');
  }

  togglePause() {
    if (this.state === GameState.PLAYING) {
      this.state = GameState.PAUSED;
      this.screens.pause.classList.remove('hidden');
      sounds.stopBGM();
    } else if (this.state === GameState.PAUSED) {
      this.state = GameState.PLAYING;
      this.screens.pause.classList.add('hidden');
      sounds.startBGM();
    }
  }

  restartGame() {
    // Hide all overlay screens
    Object.values(this.screens).forEach(screen => screen.classList.add('hidden'));
    this.hud.classList.remove('hidden');

    // Reset stats
    this.lives = this.maxLives;
    this.score = 0;
    this.coins = 0;
    this.particles.clear();

    // Rebuild level and reset player
    this.level = new Level();
    this.totalCoins = this.level.coins.length;
    this.player = new Player(this.level.spawnPoint.x, this.level.spawnPoint.y);

    this.updateHUD();
    this.state = GameState.PLAYING;

    sounds.init();
    sounds.startBGM();
  }

  // --------------------------------------------------------------------------
  // GAME PROGRESSION & STATS
  // --------------------------------------------------------------------------
  addScore(points) {
    this.score += points;
    this.updateHUD();
  }

  addCoin() {
    this.coins += 1;
    this.updateHUD();
  }

  loseLife() {
    this.lives -= 1;
    this.screenShake = 0.35; // Screen shake on impact
    this.updateHUD();

    if (this.lives <= 0) {
      this.triggerGameOver();
    }
  }

  updateHUD() {
    // Hearts display (e.g. ❤️❤️❤️, ❤️❤️, ❤️, 💀)
    if (this.heartsDisplay) {
      this.heartsDisplay.textContent = '❤️'.repeat(Math.max(0, this.lives)) || '💀';
    }

    // Coins display
    if (this.coinCount) {
      this.coinCount.textContent = this.coins;
    }
    if (this.coinTotal) {
      this.coinTotal.textContent = `/ ${this.totalCoins}`;
    }

    // Score display with 5-digit padding
    if (this.scoreDisplay) {
      this.scoreDisplay.textContent = String(this.score).padStart(5, '0');
    }
  }

  triggerGameOver() {
    this.state = GameState.GAMEOVER;
    sounds.stopBGM();
    sounds.playGameOver();

    document.getElementById('final-score').textContent = this.score;
    document.getElementById('final-coins').textContent = `${this.coins} / ${this.totalCoins}`;
    this.screens.gameOver.classList.remove('hidden');
  }

  triggerVictory() {
    if (this.state === GameState.VICTORY) return;
    this.state = GameState.VICTORY;
    sounds.stopBGM();
    sounds.playVictory();

    // Calculate Star Rating based on coins collected
    const coinPercent = this.coins / this.totalCoins;
    let stars = '⭐';
    if (coinPercent >= 0.85) {
      stars = '⭐⭐⭐';
    } else if (coinPercent >= 0.5) {
      stars = '⭐⭐';
    }

    document.getElementById('stars-rating').textContent = stars;
    document.getElementById('victory-score').textContent = this.score;
    document.getElementById('victory-coins').textContent = `${this.coins} / ${this.totalCoins}`;
    this.screens.victory.classList.remove('hidden');
  }

  // --------------------------------------------------------------------------
  // MAIN GAME LOOP
  // --------------------------------------------------------------------------
  gameLoop(currentTime) {
    // Calculate delta time in seconds
    let dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Safety clamp dt to prevent physics glitches if tab is backgrounded
    if (dt > 0.1) dt = 0.1;

    // 1. Handle one-shot hotkeys
    if (this.input.pausePressed) {
      this.togglePause();
    }
    if (this.input.restartPressed) {
      this.restartGame();
    }

    // 2. State Updates
    if (this.state === GameState.PLAYING) {
      this.update(dt);
    } else if (this.state === GameState.START) {
      // Gentle background cloud movement even on start screen
      this.level.clouds.forEach(c => {
        c.x += c.speed * dt;
        if (c.x > this.level.width + 200) c.x = -200;
      });
    }

    // 3. Render Canvas
    this.render();

    // 4. Clear single-frame triggers
    this.input.endFrame();

    // Request next frame
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  update(dt) {
    // Update Player
    this.player.update(dt, this.input, this.level.platforms, this.particles);

    // Bottomless pit fall check
    if (this.player.y > this.level.height + 40) {
      sounds.playHurt();
      this.loseLife();
      if (this.lives > 0) {
        // Respawn at safe start position
        this.player.respawn(this.level.spawnPoint.x, this.level.spawnPoint.y);
      }
    }

    // Update Level Entities (Coins, Enemies, Moving Platforms, Hazards)
    this.level.update(dt, this.player, this.particles, this);

    // Update Particle System
    this.particles.update(dt);

    // Screen Shake decay
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt);
    }

    // Smooth Camera Following Player (with deadzone & clamping)
    const targetCamX = this.player.x + this.player.width / 2 - this.width / 2;
    const targetCamY = this.player.y + this.player.height / 2 - this.height / 2;

    // Lerp smoothly toward target
    this.camera.x += (targetCamX - this.camera.x) * 6 * dt;
    this.camera.y += (targetCamY - this.camera.y) * 4 * dt;

    // Clamp camera within world boundaries
    this.camera.x = Math.max(0, Math.min(this.camera.x, this.level.width - this.width));
    this.camera.y = Math.max(0, Math.min(this.camera.y, this.level.height - this.height));
  }

  render() {
    this.ctx.save();

    // Screen Shake effect
    if (this.screenShake > 0) {
      const shakeMag = this.screenShake * 14;
      const offsetX = (Math.random() - 0.5) * shakeMag;
      const offsetY = (Math.random() - 0.5) * shakeMag;
      this.ctx.translate(offsetX, offsetY);
    }

    // 1. Draw Parallax Background
    this.level.drawBackground(this.ctx, this.camera, this.width, this.height);

    // 2. Draw Level Platforms, Foliage, Hazards, Coins, Enemies
    this.level.draw(this.ctx, this.camera);

    // 3. Draw Player
    this.player.draw(this.ctx, this.camera);

    // 4. Draw Particles & Floating Text on top
    this.particles.draw(this.ctx, this.camera);

    this.ctx.restore();
  }
}

// Safe initialization whether scripts run before or after DOMContentLoaded
function initGame() {
  if (!window.game) {
    window.game = new Game();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}
