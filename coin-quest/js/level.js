/**
 * ============================================================================
 * LEVEL BUILDER & ENVIRONMENT SYSTEM
 * ============================================================================
 * Defines the platformer level geometry, backgrounds, coins, enemies,
 * hazards, and renders lush parallax environment graphics.
 */

class Level {
  constructor() {
    this.width = 3400; // Level width in pixels
    this.height = 650; // Level height in pixels
    this.spawnPoint = { x: 80, y: 360 };

    // Decorative clouds with parallax speeds
    this.clouds = [
      { x: 100, y: 60, scale: 1.2, speed: 12 },
      { x: 450, y: 90, scale: 0.9, speed: 8 },
      { x: 850, y: 50, scale: 1.4, speed: 15 },
      { x: 1300, y: 80, scale: 1.1, speed: 10 },
      { x: 1800, y: 65, scale: 1.3, speed: 14 },
      { x: 2300, y: 100, scale: 0.8, speed: 9 },
      { x: 2800, y: 70, scale: 1.2, speed: 11 }
    ];

    this.platforms = [];
    this.coins = [];
    this.enemies = [];
    this.hazards = [];
    this.springs = [];
    this.trophy = null;

    this.buildLevel();
  }

  buildLevel() {
    // ------------------------------------------------------------------------
    // PLATFORMS
    // style: 'grass' (solid ground), 'wood' (one-way platform), 'stone'
    // ------------------------------------------------------------------------
    this.platforms = [
      // Starting Ground
      { x: 0, y: 450, width: 600, height: 200, style: 'grass', oneWay: false },

      // Step up platforms
      { x: 680, y: 400, width: 140, height: 30, style: 'wood', oneWay: true },
      { x: 880, y: 340, width: 160, height: 30, style: 'wood', oneWay: true },

      // Island 2
      { x: 1100, y: 420, width: 450, height: 230, style: 'grass', oneWay: false },

      // Elevated high bridge
      { x: 1220, y: 260, width: 220, height: 24, style: 'wood', oneWay: true },

      // Springboard Ledge
      { x: 1600, y: 450, width: 180, height: 200, style: 'grass', oneWay: false },

      // Sky Islands reached by Springboard
      { x: 1720, y: 180, width: 180, height: 24, style: 'wood', oneWay: true },
      { x: 1980, y: 220, width: 200, height: 24, style: 'wood', oneWay: true },

      // Island 3 (over spike pit)
      { x: 2050, y: 440, width: 420, height: 210, style: 'grass', oneWay: false },

      // Tower Steps to the Goal
      { x: 2750, y: 400, width: 140, height: 30, style: 'stone', oneWay: false },
      { x: 2950, y: 320, width: 140, height: 30, style: 'stone', oneWay: false },

      // Final Victory Island
      { x: 3140, y: 380, width: 260, height: 270, style: 'grass', oneWay: false }
    ];

    // ------------------------------------------------------------------------
    // MOVING PLATFORMS (patrol gaps)
    // ------------------------------------------------------------------------
    // Platform moving horizontally between Island 2 and Island 3
    const movePlat1 = new MovingPlatform(1820, 380, 130, 24, 180, 0, 75);
    this.platforms.push(movePlat1);

    // Platform moving vertically to help cross to Tower
    const movePlat2 = new MovingPlatform(2520, 420, 140, 24, 0, -140, 70);
    this.platforms.push(movePlat2);

    // ------------------------------------------------------------------------
    // SPRINGBOARD JUMP PADS
    // ------------------------------------------------------------------------
    this.springs = [
      new SpringPad(1670, 436), // launches player to sky island
      new SpringPad(2400, 426)  // launches player across the big gap
    ];

    // ------------------------------------------------------------------------
    // HAZARDS (Spikes on ground / pits)
    // ------------------------------------------------------------------------
    this.hazards = [
      new HazardSpikes(360, 432, 3),   // small spike trap on ground 1
      new HazardSpikes(1350, 402, 4),  // spikes on Island 2
      new HazardSpikes(2180, 422, 5)   // spike row on Island 3
    ];

    // ------------------------------------------------------------------------
    // ENEMIES (Slimes on ground, Bats in sky)
    // ------------------------------------------------------------------------
    this.enemies = [
      // Slime on starting ground
      new SlimeEnemy(220, 420, 160, 350, 70),

      // Slime on Island 2
      new SlimeEnemy(1150, 390, 1110, 1330, 80),

      // Flying Bat guarding the high bridge
      new BatEnemy(1240, 160, 1180, 1480, 90),

      // Flying Bat near Sky Island
      new BatEnemy(1760, 120, 1700, 2150, 100),

      // Slime patrolling Island 3
      new SlimeEnemy(2280, 410, 2260, 2440, 95),

      // Flying Bat near tower
      new BatEnemy(2780, 240, 2720, 3050, 85)
    ];

    // ------------------------------------------------------------------------
    // COINS (25 Collectible Gold Coins placed cleverly!)
    // ------------------------------------------------------------------------
    this.coins = [
      // Starting tutorial coins (jump over first slime to collect)
      new Coin(180, 320),
      new Coin(240, 300),
      new Coin(300, 320),

      // Over first jump
      new Coin(610, 380),
      new Coin(720, 350),
      new Coin(780, 350),

      // On second wood platform
      new Coin(920, 290),
      new Coin(980, 290),

      // High bridge treasure
      new Coin(1260, 210),
      new Coin(1320, 190),
      new Coin(1380, 210),

      // Island 2 ground coins
      new Coin(1460, 370),
      new Coin(1510, 370),

      // Springboard launch reward (Sky Island arc)
      new Coin(1690, 300),
      new Coin(1700, 190),
      new Coin(1760, 130),
      new Coin(1840, 130),
      new Coin(2020, 170),
      new Coin(2080, 170),

      // Island 3 coins
      new Coin(2140, 390),
      new Coin(2320, 390),

      // Tower Steps coins
      new Coin(2810, 340),
      new Coin(3010, 260),

      // Final island treasure
      new Coin(3200, 330),
      new Coin(3260, 330)
    ];

    // ------------------------------------------------------------------------
    // GOAL TROPHY
    // ------------------------------------------------------------------------
    this.trophy = new GoalTrophy(3280, 326);
  }

  update(dt, player, particleSystem, game) {
    // 1. Update background clouds
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed * dt;
      if (cloud.x > this.width + 200) {
        cloud.x = -200;
      }
    }

    // 2. Update moving platforms
    for (const plat of this.platforms) {
      if (plat.isMoving && plat.update) {
        plat.update(dt);
      }
    }

    // 3. Update Springboard pads
    for (const spring of this.springs) {
      spring.update(dt, player, particleSystem);
    }

    // 4. Update Hazards (spikes)
    for (const hazard of this.hazards) {
      hazard.update(dt, player, game);
    }

    // 5. Update Coins
    for (const coin of this.coins) {
      coin.update(dt, particleSystem);
      coin.checkCollision(player, particleSystem, game);
    }

    // 6. Update Enemies
    for (const enemy of this.enemies) {
      enemy.update(dt, player, particleSystem, game);
    }

    // 7. Update Goal Trophy
    if (this.trophy) {
      this.trophy.update(dt, player, game);
    }
  }

  // Draw scenic parallax background
  drawBackground(ctx, camera, viewWidth, viewHeight) {
    // 1. Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, viewHeight);
    skyGrad.addColorStop(0, '#56cfe1');
    skyGrad.addColorStop(0.55, '#80ffdb');
    skyGrad.addColorStop(1, '#e2f9b8');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    // 2. Sun with radiant glow
    const sunX = 720 - camera.x * 0.04;
    const sunY = 90;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 60);
    sunGlow.addColorStop(0, 'rgba(255, 239, 150, 0.9)');
    sunGlow.addColorStop(0.5, 'rgba(255, 209, 102, 0.3)');
    sunGlow.addColorStop(1, 'rgba(255, 209, 102, 0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 60, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fffae0';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 24, 0, Math.PI * 2);
    ctx.fill();

    // 3. Distant Mountains (Parallax 0.15)
    ctx.save();
    ctx.fillStyle = 'rgba(78, 168, 222, 0.45)';
    ctx.beginPath();
    const mountainBaseY = viewHeight - 40;
    ctx.moveTo(0, viewHeight);

    const mOffset = (camera.x * 0.15) % 400;
    for (let x = -200 - mOffset; x < viewWidth + 400; x += 320) {
      ctx.lineTo(x, mountainBaseY);
      ctx.lineTo(x + 160, mountainBaseY - 140);
      ctx.lineTo(x + 320, mountainBaseY);
    }
    ctx.lineTo(viewWidth, viewHeight);
    ctx.closePath();
    ctx.fill();

    // 4. Closer Hills & Pine silhouettes (Parallax 0.3)
    ctx.fillStyle = 'rgba(94, 204, 150, 0.5)';
    ctx.beginPath();
    const hillBaseY = viewHeight - 20;
    ctx.moveTo(0, viewHeight);
    const hOffset = (camera.x * 0.3) % 300;
    for (let x = -200 - hOffset; x < viewWidth + 300; x += 240) {
      ctx.quadraticCurveTo(x + 120, hillBaseY - 90, x + 240, hillBaseY);
    }
    ctx.lineTo(viewWidth, viewHeight);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 5. Parallax Fluffy Clouds
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (const cloud of this.clouds) {
      const renderX = cloud.x - camera.x * 0.4;
      if (renderX < -150 || renderX > viewWidth + 150) continue;

      const r = 22 * cloud.scale;
      ctx.beginPath();
      ctx.arc(renderX, cloud.y, r, 0, Math.PI * 2);
      ctx.arc(renderX + r * 1.1, cloud.y - r * 0.35, r * 1.25, 0, Math.PI * 2);
      ctx.arc(renderX + r * 2.2, cloud.y, r * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Draw all platforms, foliage, hazards, coins, and enemies
  draw(ctx, camera) {
    // 1. Draw Platforms
    for (const plat of this.platforms) {
      if (plat.isMoving && plat.draw) {
        plat.draw(ctx, camera);
        continue;
      }

      const rx = plat.x - camera.x;
      const ry = plat.y - camera.y;

      ctx.save();
      if (plat.style === 'grass') {
        // Lush green grassy ground with rich earthy dirt
        // Dirt base
        ctx.fillStyle = '#6f4e37';
        ctx.beginPath();
        ctx.roundRect(rx, ry, plat.width, plat.height, 4);
        ctx.fill();

        // Dirt texture flecks
        ctx.fillStyle = '#5c3d28';
        for (let i = 20; i < plat.width - 20; i += 38) {
          ctx.fillRect(rx + i, ry + 26, 12, 6);
          ctx.fillRect(rx + i + 14, ry + 48, 8, 5);
        }

        // Vibrant Green Grass Top Layer
        ctx.fillStyle = '#52b788';
        ctx.beginPath();
        ctx.roundRect(rx, ry, plat.width, 16, [4, 4, 0, 0]);
        ctx.fill();

        // Grass blades detail
        ctx.fillStyle = '#74c69d';
        for (let gx = 6; gx < plat.width - 8; gx += 10) {
          ctx.beginPath();
          ctx.moveTo(rx + gx, ry);
          ctx.lineTo(rx + gx + 3, ry - 5);
          ctx.lineTo(rx + gx + 6, ry);
          ctx.fill();
        }

      } else if (plat.style === 'wood') {
        // Wooden bridge platform
        ctx.fillStyle = '#b07d62';
        ctx.beginPath();
        ctx.roundRect(rx, ry, plat.width, plat.height, 5);
        ctx.fill();

        // Wood grain planks
        ctx.strokeStyle = '#8d5b4c';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#6b4435';
        for (let px = 18; px < plat.width - 10; px += 24) {
          ctx.fillRect(rx + px, ry + 2, 2, plat.height - 4);
        }

      } else if (plat.style === 'stone') {
        // Stone castle blocks
        ctx.fillStyle = '#495057';
        ctx.beginPath();
        ctx.roundRect(rx, ry, plat.width, plat.height, 4);
        ctx.fill();

        ctx.strokeStyle = '#6c757d';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Brick seams
        ctx.fillStyle = '#343a40';
        ctx.fillRect(rx + plat.width / 2, ry + 2, 2, plat.height - 4);
      }
      ctx.restore();
    }

    // 2. Draw Springboards
    for (const spring of this.springs) {
      spring.draw(ctx, camera);
    }

    // 3. Draw Hazards (Spikes)
    for (const hazard of this.hazards) {
      hazard.draw(ctx, camera);
    }

    // 4. Draw Coins
    for (const coin of this.coins) {
      coin.draw(ctx, camera);
    }

    // 5. Draw Enemies
    for (const enemy of this.enemies) {
      enemy.draw(ctx, camera);
    }

    // 6. Draw Goal Trophy
    if (this.trophy) {
      this.trophy.draw(ctx, camera);
    }
  }
}
