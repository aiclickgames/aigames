/**
 * ============================================================================
 * PLAYER CLASS
 * ============================================================================
 * Handles player physics, platform collisions, animations, squash/stretch,
 * and drawing the character ("Blip the Adventurer") using Canvas 2D.
 */

class Player {
  constructor(spawnX, spawnY) {
    this.spawnX = spawnX;
    this.spawnY = spawnY;

    // Dimensions
    this.width = 36;
    this.height = 42;

    // Position & Velocity
    this.x = spawnX;
    this.y = spawnY;
    this.vx = 0;
    this.vy = 0;

    // Physics constants (tuned for snappy, fun platforming)
    this.speed = 340;        // Max running speed (px/sec)
    this.acceleration = 1800; // Acceleration rate
    this.friction = 1400;     // Ground deceleration rate
    this.airFriction = 600;   // Air resistance
    this.gravity = 1400;      // Downward pull
    this.jumpForce = -540;    // Initial jump impulse
    this.maxFallSpeed = 750;

    // State flags
    this.grounded = false;
    this.wasGrounded = false;
    this.facing = 1;          // 1 = Right, -1 = Left
    this.isDead = false;
    this.invincibleTimer = 0; // i-frames after getting hurt
    this.knockbackTimer = 0;

    // Jump feel improvements (used by pro platformers)
    this.coyoteTimer = 0;     // Allows jumping briefly after walking off an edge
    this.jumpBufferTimer = 0; // Remembers jump press just before landing

    // Visual juice (Squash & Stretch)
    this.scaleX = 1;
    this.scaleY = 1;
    this.walkCycle = 0;       // For leg & scarf animation
    this.blinkTimer = 0;

    // Moving platform reference (to carry player)
    this.ridingPlatform = null;
  }

  // Reset player to a checkpoint or start position
  respawn(x = this.spawnX, y = this.spawnY) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.grounded = false;
    this.ridingPlatform = null;
    this.invincibleTimer = 1.0; // Brief immunity on respawn
  }

  // Take damage from hazard or enemy
  takeDamage(sourceX) {
    if (this.invincibleTimer > 0) return false;

    this.invincibleTimer = 1.4; // 1.4 seconds of invincibility
    this.knockbackTimer = 0.25;

    // Knock player up and away from source
    const knockDir = (this.x + this.width / 2 < sourceX) ? -1 : 1;
    this.vx = knockDir * 240;
    this.vy = -340;
    this.scaleX = 0.7;
    this.scaleY = 1.3;

    sounds.playHurt();
    return true;
  }

  update(dt, input, platforms, particleSystem) {
    // 1. Timers & Cooldowns
    if (this.invincibleTimer > 0) {
      this.invincibleTimer = Math.max(0, this.invincibleTimer - dt);
    }
    if (this.knockbackTimer > 0) {
      this.knockbackTimer = Math.max(0, this.knockbackTimer - dt);
    }

    // Coyote time & Jump buffer countdown
    if (this.grounded) {
      this.coyoteTimer = 0.12; // can still jump for 0.12s after leaving platform
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (input.jumpPressed) {
      this.jumpBufferTimer = 0.14; // remember jump intention
    } else {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    }

    // 2. Horizontal Movement (if not in hard knockback)
    if (this.knockbackTimer <= 0) {
      let moveDir = 0;
      if (input.left) moveDir -= 1;
      if (input.right) moveDir += 1;

      if (moveDir !== 0) {
        this.facing = moveDir;
        // Accelerate
        this.vx += moveDir * this.acceleration * dt;
        if (Math.abs(this.vx) > this.speed) {
          this.vx = moveDir * this.speed;
        }
        // Footstep dust if grounded
        if (this.grounded) {
          this.walkCycle += dt * 14;
          if (Math.random() < 0.2) {
            particleSystem.addDust(
              this.x + this.width / 2 + (Math.random() - 0.5) * 10,
              this.y + this.height,
              1
            );
          }
        }
      } else {
        // Apply friction to slow down smoothly
        const currentFriction = this.grounded ? this.friction : this.airFriction;
        if (this.vx > 0) {
          this.vx = Math.max(0, this.vx - currentFriction * dt);
        } else if (this.vx < 0) {
          this.vx = Math.min(0, this.vx + currentFriction * dt);
        }
      }
    }

    // 3. Jumping Logic
    if (this.jumpBufferTimer > 0 && (this.grounded || this.coyoteTimer > 0)) {
      this.vy = this.jumpForce;
      this.grounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.ridingPlatform = null;

      // Jump visual stretch & dust puff
      this.scaleX = 0.75;
      this.scaleY = 1.35;
      particleSystem.addDust(this.x + this.width / 2, this.y + this.height, 8);
      sounds.playJump();
    }

    // Variable jump height: release jump button early to do a smaller hop
    if (!input.jump && this.vy < -150) {
      this.vy += 1200 * dt; // cut jump short
    }

    // 4. Gravity
    this.vy += this.gravity * dt;
    if (this.vy > this.maxFallSpeed) {
      this.vy = this.maxFallSpeed;
    }

    // 5. Apply Horizontal Movement and Check Collisions
    this.x += this.vx * dt;
    this.checkHorizontalCollisions(platforms);

    // 6. Apply Vertical Movement and Check Collisions
    this.wasGrounded = this.grounded;
    this.grounded = false;
    this.y += this.vy * dt;
    this.checkVerticalCollisions(platforms, particleSystem);

    // 7. Riding moving platform
    if (this.ridingPlatform && this.grounded) {
      this.x += this.ridingPlatform.vx * dt;
      this.y += this.ridingPlatform.vy * dt;
    }

    // 8. Visual Squash & Stretch Recovery
    this.scaleX += (1 - this.scaleX) * 12 * dt;
    this.scaleY += (1 - this.scaleY) * 12 * dt;

    // Eye blink animation timer
    this.blinkTimer = (this.blinkTimer + dt) % 3.5;
  }

  // Horizontal Collision Resolution against solid platforms
  checkHorizontalCollisions(platforms) {
    for (const plat of platforms) {
      if (plat.oneWay) continue; // ignore one-way platforms from the sides
      if (this.intersects(plat)) {
        if (this.vx > 0) {
          // Moving right -> snap to left edge of platform
          this.x = plat.x - this.width;
          this.vx = 0;
        } else if (this.vx < 0) {
          // Moving left -> snap to right edge of platform
          this.x = plat.x + plat.width;
          this.vx = 0;
        }
      }
    }
  }

  // Vertical Collision Resolution against solid and one-way platforms
  checkVerticalCollisions(platforms, particleSystem) {
    this.ridingPlatform = null;

    for (const plat of platforms) {
      if (plat.oneWay) {
        // One-way platform: only land on it if falling down and player's feet were previously above it
        const prevBottom = this.y + this.height - this.vy * (1 / 60);
        if (
          this.vy >= 0 &&
          prevBottom <= plat.y + 10 &&
          this.intersects(plat)
        ) {
          this.landOn(plat, particleSystem);
        }
      } else {
        // Solid block platform
        if (this.intersects(plat)) {
          if (this.vy > 0) {
            // Falling down -> land on top
            this.landOn(plat, particleSystem);
          } else if (this.vy < 0) {
            // Jumping up -> bump head into bottom
            this.y = plat.y + plat.height;
            this.vy = 0;
          }
        }
      }
    }
  }

  landOn(plat, particleSystem) {
    this.y = plat.y - this.height;
    this.vy = 0;
    this.grounded = true;

    // If it's a moving platform, attach to it
    if (plat.isMoving) {
      this.ridingPlatform = plat;
    }

    // Just landed effect: squash horizontally & dust poof
    if (!this.wasGrounded) {
      this.scaleX = 1.35;
      this.scaleY = 0.75;
      particleSystem.addDust(this.x + this.width / 2, this.y + this.height, 6);
    }
  }

  // Simple bounding box intersection test
  intersects(rect) {
    return (
      this.x < rect.x + rect.width &&
      this.x + this.width > rect.x &&
      this.y < rect.y + rect.height &&
      this.y + this.height > rect.y
    );
  }

  // Draw the animated hero on canvas
  draw(ctx, camera) {
    // If invincible, flicker visibility
    if (this.invincibleTimer > 0 && Math.floor(Date.now() / 60) % 2 === 0) {
      return;
    }

    const renderX = this.x - camera.x;
    const renderY = this.y - camera.y;

    ctx.save();
    // Center origin at character bottom-center for squash/stretch
    ctx.translate(renderX + this.width / 2, renderY + this.height);
    ctx.scale(this.scaleX * this.facing, this.scaleY);

    const w = this.width;
    const h = this.height;

    // 1. Draw Feet / Shoes (bobbing when running)
    const legOffset = this.grounded && Math.abs(this.vx) > 20
      ? Math.sin(this.walkCycle) * 6
      : 0;

    ctx.fillStyle = '#0f4c81';
    // Left foot
    ctx.beginPath();
    ctx.roundRect(-w * 0.45, -8 + legOffset, 12, 8, 4);
    ctx.fill();
    // Right foot
    ctx.beginPath();
    ctx.roundRect(w * 0.15, -8 - legOffset, 12, 8, 4);
    ctx.fill();

    // 2. Main Body (Cute rounded slime/adventurer in vibrant blue)
    const bodyGradient = ctx.createLinearGradient(0, -h, 0, 0);
    bodyGradient.addColorStop(0, '#00b4d8');
    bodyGradient.addColorStop(1, '#0077b6');
    ctx.fillStyle = bodyGradient;

    ctx.beginPath();
    ctx.roundRect(-w / 2, -h, w, h - 4, [14, 14, 8, 8]);
    ctx.fill();

    // Body soft outline / highlight
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#90e0ef';
    ctx.stroke();

    // 3. Headband / Scarf (Vibrant red adventure scarf)
    ctx.fillStyle = '#e63946';
    ctx.fillRect(-w / 2, -h + 10, w, 6);

    // Fluttering scarf tail at the back
    const scarfWave = Math.sin(Date.now() / 150) * 4;
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h + 10);
    ctx.lineTo(-w / 2 - 12, -h + 8 + scarfWave);
    ctx.lineTo(-w / 2 - 10, -h + 16 + scarfWave);
    ctx.lineTo(-w / 2, -h + 14);
    ctx.closePath();
    ctx.fill();

    // 4. Eyes & Expression
    const isBlinking = this.blinkTimer > 3.3;
    const eyeX = 3;
    const eyeY = -h + 20;

    if (isBlinking) {
      // Closed happy eyes
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(eyeX - 8, eyeY);
      ctx.lineTo(eyeX - 2, eyeY);
      ctx.moveTo(eyeX + 4, eyeY);
      ctx.lineTo(eyeX + 10, eyeY);
      ctx.stroke();
    } else {
      // Big expressive eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(eyeX - 5, eyeY, 4.5, 6, 0, 0, Math.PI * 2);
      ctx.ellipse(eyeX + 7, eyeY, 4.5, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupils (looking forward)
      ctx.fillStyle = '#03045e';
      ctx.beginPath();
      ctx.arc(eyeX - 3.5, eyeY, 2.5, 0, Math.PI * 2);
      ctx.arc(eyeX + 8.5, eyeY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Eye glimmer (cute shine)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eyeX - 4.5, eyeY - 2, 1.2, 0, Math.PI * 2);
      ctx.arc(eyeX + 7.5, eyeY - 2, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Rosy Cheeks
    ctx.fillStyle = 'rgba(255, 154, 162, 0.6)';
    ctx.beginPath();
    ctx.arc(eyeX - 7, eyeY + 7, 3, 0, Math.PI * 2);
    ctx.arc(eyeX + 9, eyeY + 7, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
