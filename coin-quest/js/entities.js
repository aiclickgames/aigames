/**
 * ============================================================================
 * GAME ENTITIES
 * ============================================================================
 * Contains all interactable objects in the game world:
 * - Collectible Coins
 * - Patrolling Walking Slime Enemies
 * - Flying Bat Enemies
 * - Moving Platforms
 * - Spikes / Hazards
 * - Springboard Pads
 * - Goal Victory Trophy
 */

/* --------------------------------------------------------------------------
   1. COLLECTIBLE COIN
   -------------------------------------------------------------------------- */
class Coin {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.radius = 12;
    this.collected = false;
    this.spinTimer = Math.random() * Math.PI * 2;
    this.sparkleTimer = Math.random() * 2;
  }

  update(dt, particleSystem) {
    // 3D spinning rotation
    this.spinTimer += dt * 5;
    // Gentle floating bob
    this.y = this.baseY + Math.sin(this.spinTimer * 0.7) * 4;

    // Periodic sparkle
    this.sparkleTimer -= dt;
    if (this.sparkleTimer <= 0) {
      this.sparkleTimer = 1.2 + Math.random() * 1.5;
      particleSystem.particles.push(new Particle(
        this.x + (Math.random() - 0.5) * 16,
        this.y + (Math.random() - 0.5) * 16,
        {
          vx: (Math.random() - 0.5) * 20,
          vy: -20,
          size: 2.5,
          color: '#ffffff',
          shape: 'star',
          life: 0.4,
          gravity: 0
        }
      ));
    }
  }

  // Check collision with player
  checkCollision(player, particleSystem, game) {
    if (this.collected) return;

    // Circle to box distance
    const closestX = Math.max(player.x, Math.min(this.x, player.x + player.width));
    const closestY = Math.max(player.y, Math.min(this.y, player.y + player.height));
    const dx = this.x - closestX;
    const dy = this.y - closestY;

    if (dx * dx + dy * dy < this.radius * this.radius) {
      this.collected = true;
      sounds.playCoin();
      particleSystem.addCoinSparkles(this.x, this.y);
      particleSystem.addText(this.x, this.y - 10, '+100', '#ffe66d');
      game.addScore(100);
      game.addCoin();
    }
  }

  draw(ctx, camera) {
    if (this.collected) return;

    const renderX = this.x - camera.x;
    const renderY = this.y - camera.y;

    // Horizontal scale creates the 3D spinning coin illusion
    const spinScale = Math.cos(this.spinTimer);

    ctx.save();
    ctx.translate(renderX, renderY);

    // Golden ambient halo
    const halo = ctx.createRadialGradient(0, 0, 4, 0, 0, this.radius + 8);
    halo.addColorStop(0, 'rgba(255, 230, 109, 0.4)');
    halo.addColorStop(1, 'rgba(255, 230, 109, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
    ctx.fill();

    // Outer Coin Rim
    ctx.scale(spinScale, 1);
    ctx.fillStyle = '#f77f00';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Inner Shiny Gold Coin
    ctx.fillStyle = '#ffe66d';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius - 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Coin Star / Emblem in center
    ctx.fillStyle = '#d48b00';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', 0, 1);

    ctx.restore();
  }
}

/* --------------------------------------------------------------------------
   2. PATROLLING SLIME ENEMY
   -------------------------------------------------------------------------- */
class SlimeEnemy {
  constructor(x, y, leftLimit, rightLimit, speed = 80) {
    this.x = x;
    this.y = y;
    this.width = 38;
    this.height = 30;
    this.leftLimit = leftLimit;
    this.rightLimit = rightLimit;
    this.speed = speed;
    this.direction = 1; // 1 = right, -1 = left
    this.dead = false;
    this.deadTimer = 0;
    this.walkCycle = Math.random() * Math.PI * 2;
  }

  update(dt, player, particleSystem, game) {
    if (this.dead) {
      this.deadTimer += dt;
      return;
    }

    // Crawl back and forth
    this.walkCycle += dt * 6;
    this.x += this.direction * this.speed * dt;

    if (this.x <= this.leftLimit) {
      this.x = this.leftLimit;
      this.direction = 1;
    } else if (this.x + this.width >= this.rightLimit) {
      this.x = this.rightLimit - this.width;
      this.direction = -1;
    }

    // Check interaction with player
    this.checkPlayerCollision(player, particleSystem, game);
  }

  checkPlayerCollision(player, particleSystem, game) {
    if (this.dead || player.invincibleTimer > 0) return;

    // Check AABB overlap
    const overlap = (
      player.x < this.x + this.width &&
      player.x + player.width > this.x &&
      player.y < this.y + this.height &&
      player.y + player.height > this.y
    );

    if (overlap) {
      // Is player falling on top of the slime?
      const playerBottom = player.y + player.height;
      const stomped = player.vy > 0 && playerBottom <= this.y + 16;

      if (stomped) {
        // Player stomped enemy!
        this.dead = true;
        sounds.playStomp();
        player.vy = -440; // bounce player upward
        player.scaleX = 1.3;
        player.scaleY = 0.7;

        particleSystem.addEnemyDefeat(this.x + this.width / 2, this.y + this.height / 2);
        particleSystem.addText(this.x + this.width / 2, this.y - 12, '+200 STOMP!', '#ff5964');
        game.addScore(200);
      } else {
        // Player got hit from side/bottom!
        player.takeDamage(this.x + this.width / 2);
        game.loseLife();
      }
    }
  }

  draw(ctx, camera) {
    const renderX = this.x - camera.x;
    const renderY = this.y - camera.y;

    ctx.save();
    ctx.translate(renderX + this.width / 2, renderY + this.height);

    if (this.dead) {
      // Squashed flat animation when stomped
      ctx.scale(1.4, 0.25);
      ctx.fillStyle = '#9b5de5';
      ctx.beginPath();
      ctx.roundRect(-this.width / 2, -this.height, this.width, this.height, 10);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Waddling squish and stretch
    const wobbleY = Math.sin(this.walkCycle) * 3;
    const scaleY = 1 + wobbleY * 0.05;
    const scaleX = 1 - wobbleY * 0.05;
    ctx.scale(scaleX * this.direction, scaleY);

    const w = this.width;
    const h = this.height;

    // Purple / Pink Slime Body
    const grad = ctx.createLinearGradient(0, -h, 0, 0);
    grad.addColorStop(0, '#f15bb5');
    grad.addColorStop(1, '#9b5de5');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.roundRect(-w / 2, -h, w, h, [16, 16, 6, 6]);
    ctx.fill();

    // Spiky cute horns on head
    ctx.fillStyle = '#ff70a6';
    ctx.beginPath();
    ctx.moveTo(-w * 0.25, -h);
    ctx.lineTo(-w * 0.15, -h - 6);
    ctx.lineTo(-w * 0.05, -h);
    ctx.moveTo(w * 0.05, -h);
    ctx.lineTo(w * 0.15, -h - 6);
    ctx.lineTo(w * 0.25, -h);
    ctx.fill();

    // Big Googly Eyes
    const eyeX = 4;
    const eyeY = -h * 0.55;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(eyeX - 5, eyeY, 5.5, 0, Math.PI * 2);
    ctx.arc(eyeX + 6, eyeY, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // Pupils looking forward
    ctx.fillStyle = '#240046';
    ctx.beginPath();
    ctx.arc(eyeX - 4, eyeY, 3, 0, Math.PI * 2);
    ctx.arc(eyeX + 7, eyeY, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/* --------------------------------------------------------------------------
   3. FLYING BAT ENEMY
   -------------------------------------------------------------------------- */
class BatEnemy {
  constructor(x, y, leftLimit, rightLimit, speed = 100) {
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.width = 36;
    this.height = 28;
    this.leftLimit = leftLimit;
    this.rightLimit = rightLimit;
    this.speed = speed;
    this.direction = 1;
    this.dead = false;
    this.deadTimer = 0;
    this.flightTime = Math.random() * 10;
  }

  update(dt, player, particleSystem, game) {
    if (this.dead) {
      this.deadTimer += dt;
      return;
    }

    this.flightTime += dt * 6;
    // Sinusoidal wave flight
    this.y = this.baseY + Math.sin(this.flightTime) * 26;
    this.x += this.direction * this.speed * dt;

    if (this.x <= this.leftLimit) {
      this.x = this.leftLimit;
      this.direction = 1;
    } else if (this.x + this.width >= this.rightLimit) {
      this.x = this.rightLimit - this.width;
      this.direction = -1;
    }

    // Check collision
    if (player.invincibleTimer <= 0) {
      const overlap = (
        player.x < this.x + this.width &&
        player.x + player.width > this.x &&
        player.y < this.y + this.height &&
        player.y + player.height > this.y
      );

      if (overlap) {
        const playerBottom = player.y + player.height;
        if (player.vy > 0 && playerBottom <= this.y + 14) {
          this.dead = true;
          sounds.playStomp();
          player.vy = -440;
          particleSystem.addEnemyDefeat(this.x + this.width / 2, this.y + this.height / 2);
          particleSystem.addText(this.x + this.width / 2, this.y - 12, '+250 AERIAL!', '#ffe66d');
          game.addScore(250);
        } else {
          player.takeDamage(this.x + this.width / 2);
          game.loseLife();
        }
      }
    }
  }

  draw(ctx, camera) {
    if (this.dead) return;

    const renderX = this.x - camera.x;
    const renderY = this.y - camera.y;
    const wingFlap = Math.sin(this.flightTime * 2.5);

    ctx.save();
    ctx.translate(renderX + this.width / 2, renderY + this.height / 2);
    ctx.scale(this.direction, 1);

    // Bat Wings
    ctx.fillStyle = '#3a0ca3';
    ctx.beginPath();
    // Left Wing
    ctx.moveTo(-6, -2);
    ctx.quadraticCurveTo(-18, -16 * wingFlap, -22, 2 * wingFlap);
    ctx.lineTo(-6, 6);
    // Right Wing
    ctx.moveTo(6, -2);
    ctx.quadraticCurveTo(18, -16 * wingFlap, 22, 2 * wingFlap);
    ctx.lineTo(6, 6);
    ctx.fill();

    // Bat Body
    ctx.fillStyle = '#7209b7';
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = '#560bad';
    ctx.beginPath();
    ctx.moveTo(-6, -8);
    ctx.lineTo(-9, -15);
    ctx.lineTo(-2, -10);
    ctx.moveTo(2, -10);
    ctx.lineTo(9, -15);
    ctx.lineTo(6, -8);
    ctx.fill();

    // Glowing Red Eyes
    ctx.fillStyle = '#ff0054';
    ctx.beginPath();
    ctx.arc(-3, -2, 2.5, 0, Math.PI * 2);
    ctx.arc(3, -2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/* --------------------------------------------------------------------------
   4. MOVING PLATFORM
   -------------------------------------------------------------------------- */
class MovingPlatform {
  constructor(x, y, width, height, moveX = 0, moveY = 0, speed = 80) {
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.moveX = moveX;
    this.moveY = moveY;
    this.speed = speed;
    this.isMoving = true;
    this.oneWay = false;
    this.progress = 0; // 0 to 1
    this.direction = 1;
    this.vx = 0;
    this.vy = 0;
  }

  update(dt) {
    const travelDist = Math.hypot(this.moveX, this.moveY);
    if (travelDist > 0) {
      const step = (this.speed / travelDist) * dt;
      this.progress += step * this.direction;

      if (this.progress >= 1) {
        this.progress = 1;
        this.direction = -1;
      } else if (this.progress <= 0) {
        this.progress = 0;
        this.direction = 1;
      }

      // Smooth easing (cosine)
      const ease = 0.5 - 0.5 * Math.cos(this.progress * Math.PI);
      const nextX = this.startX + this.moveX * ease;
      const nextY = this.startY + this.moveY * ease;

      this.vx = (nextX - this.x) / dt;
      this.vy = (nextY - this.y) / dt;

      this.x = nextX;
      this.y = nextY;
    }
  }

  draw(ctx, camera) {
    const renderX = this.x - camera.x;
    const renderY = this.y - camera.y;

    ctx.save();
    // Modern cyber/wooden hovering platform
    ctx.fillStyle = '#2b2d42';
    ctx.beginPath();
    ctx.roundRect(renderX, renderY, this.width, this.height, 6);
    ctx.fill();

    // Top Glowing Stripe
    ctx.fillStyle = '#48cae4';
    ctx.fillRect(renderX + 4, renderY, this.width - 8, 4);

    // Directional chevron arrows
    ctx.fillStyle = 'rgba(72, 202, 228, 0.4)';
    const midX = renderX + this.width / 2;
    const midY = renderY + this.height / 2;
    ctx.beginPath();
    ctx.arc(midX - 12, midY, 3, 0, Math.PI * 2);
    ctx.arc(midX, midY, 3, 0, Math.PI * 2);
    ctx.arc(midX + 12, midY, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

/* --------------------------------------------------------------------------
   5. HAZARD / SPIKES
   -------------------------------------------------------------------------- */
class HazardSpikes {
  constructor(x, y, count = 2) {
    this.x = x;
    this.y = y;
    this.spikeWidth = 16;
    this.height = 18;
    this.count = count;
    this.width = count * this.spikeWidth;
  }

  update(dt, player, game) {
    if (player.invincibleTimer > 0) return;

    // Check collision with player
    const overlap = (
      player.x < this.x + this.width &&
      player.x + player.width > this.x &&
      player.y < this.y + this.height &&
      player.y + player.height > this.y + 4
    );

    if (overlap) {
      player.takeDamage(this.x + this.width / 2);
      game.loseLife();
    }
  }

  draw(ctx, camera) {
    const renderX = this.x - camera.x;
    const renderY = this.y - camera.y;

    ctx.save();
    for (let i = 0; i < this.count; i++) {
      const sx = renderX + i * this.spikeWidth;
      const sy = renderY + this.height;

      // Spike triangle
      const spikeGrad = ctx.createLinearGradient(0, renderY, 0, sy);
      spikeGrad.addColorStop(0, '#e63946');
      spikeGrad.addColorStop(1, '#6c757d');
      ctx.fillStyle = spikeGrad;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + this.spikeWidth / 2, renderY);
      ctx.lineTo(sx + this.spikeWidth, sy);
      ctx.closePath();
      ctx.fill();

      // Sharp gleam highlight
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx + this.spikeWidth / 2, renderY);
      ctx.lineTo(sx + 3, sy);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/* --------------------------------------------------------------------------
   6. SPRINGBOARD JUMP PAD
   -------------------------------------------------------------------------- */
class SpringPad {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 36;
    this.height = 14;
    this.compressTimer = 0;
  }

  update(dt, player, particleSystem) {
    if (this.compressTimer > 0) {
      this.compressTimer = Math.max(0, this.compressTimer - dt);
    }

    // Check if player lands on top of spring
    const overlap = (
      player.x < this.x + this.width &&
      player.x + player.width > this.x &&
      player.y + player.height >= this.y &&
      player.y + player.height <= this.y + 16 &&
      player.vy >= 0
    );

    if (overlap) {
      player.y = this.y - player.height;
      player.vy = -760; // Super launch jump!
      player.scaleX = 0.65;
      player.scaleY = 1.45;
      this.compressTimer = 0.25;

      sounds.playSpring();
      particleSystem.addDust(this.x + this.width / 2, this.y, 10);
      particleSystem.addText(this.x + this.width / 2, this.y - 15, 'BOING!!', '#2ec4b6');
    }
  }

  draw(ctx, camera) {
    const renderX = this.x - camera.x;
    const renderY = this.y - camera.y;
    const isCompressed = this.compressTimer > 0;
    const padHeight = isCompressed ? 6 : this.height;

    ctx.save();
    // Base plate
    ctx.fillStyle = '#495057';
    ctx.fillRect(renderX, renderY + this.height - 4, this.width, 4);

    // Spring coil
    ctx.strokeStyle = '#adb5bd';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(renderX + 8, renderY + this.height - 4);
    ctx.lineTo(renderX + this.width / 2, renderY + (isCompressed ? 4 : 8));
    ctx.lineTo(renderX + this.width - 8, renderY + this.height - 4);
    ctx.stroke();

    // Top bouncy mushroom cap
    ctx.fillStyle = '#2ec4b6';
    ctx.beginPath();
    ctx.roundRect(renderX + 2, renderY + this.height - padHeight, this.width - 4, padHeight, 4);
    ctx.fill();

    ctx.restore();
  }
}

/* --------------------------------------------------------------------------
   7. GOAL VICTORY TROPHY
   -------------------------------------------------------------------------- */
class GoalTrophy {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 44;
    this.height = 54;
    this.auraTimer = 0;
  }

  update(dt, player, game) {
    this.auraTimer += dt * 3;

    // Check if player reaches trophy
    const reached = (
      player.x < this.x + this.width &&
      player.x + player.width > this.x &&
      player.y < this.y + this.height &&
      player.y + player.height > this.y
    );

    if (reached) {
      game.triggerVictory();
    }
  }

  draw(ctx, camera) {
    const renderX = this.x - camera.x;
    const renderY = this.y - camera.y;

    ctx.save();
    ctx.translate(renderX + this.width / 2, renderY + this.height / 2);

    // Glowing halo pulse
    const pulse = Math.sin(this.auraTimer) * 4;
    const halo = ctx.createRadialGradient(0, 0, 10, 0, 0, 32 + pulse);
    halo.addColorStop(0, 'rgba(255, 215, 0, 0.55)');
    halo.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, 32 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Floating bob
    const bob = Math.sin(this.auraTimer * 0.8) * 5;
    ctx.translate(0, bob);

    // Trophy Base
    ctx.fillStyle = '#b7791f';
    ctx.fillRect(-14, 14, 28, 8);
    ctx.fillStyle = '#ecc94b';
    ctx.fillRect(-10, 8, 20, 6);

    // Stem
    ctx.fillStyle = '#d69e2e';
    ctx.fillRect(-4, 0, 8, 8);

    // Cup
    ctx.fillStyle = '#f6e05e';
    ctx.beginPath();
    ctx.arc(0, -6, 15, 0, Math.PI, false);
    ctx.closePath();
    ctx.fill();

    // Handles
    ctx.strokeStyle = '#d69e2e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-15, -6, 6, Math.PI * 0.5, Math.PI * 1.5, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(15, -6, 6, Math.PI * 1.5, Math.PI * 0.5, false);
    ctx.stroke();

    // Big Sparkling Star on Cup
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⭐', 0, -5);

    ctx.restore();
  }
}
