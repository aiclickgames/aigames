/**
 * ============================================================================
 * PARTICLE & VISUAL JUICE SYSTEM
 * ============================================================================
 * Adds dynamic visual effects:
 * - Coin sparkles & golden glimmer
 * - Footstep & landing dust clouds
 * - Enemy defeat star explosions
 * - Floating score text ("+100", "+200", "STOMP!")
 */

class Particle {
  constructor(x, y, options = {}) {
    this.x = x;
    this.y = y;
    this.vx = options.vx || (Math.random() - 0.5) * 120;
    this.vy = options.vy || (Math.random() - 0.5) * 120;
    this.size = options.size || (Math.random() * 5 + 3);
    this.color = options.color || '#ffb703';
    this.shape = options.shape || 'circle'; // 'circle', 'star', 'square'
    this.life = options.life || 0.6; // duration in seconds
    this.maxLife = this.life;
    this.gravity = options.gravity !== undefined ? options.gravity : 150;
    this.rotation = Math.random() * Math.PI * 2;
    this.vRot = (Math.random() - 0.5) * 8;
  }

  update(dt) {
    this.life -= dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.rotation += this.vRot * dt;
  }

  draw(ctx, camera) {
    if (this.life <= 0) return;
    const alpha = Math.max(0, this.life / this.maxLife);
    const renderX = this.x - camera.x;
    const renderY = this.y - camera.y;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(renderX, renderY);
    ctx.rotate(this.rotation);

    if (this.shape === 'star') {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const outer = this.size;
        const inner = this.size * 0.45;
        const rot = (Math.PI / 5) * 2;
        const a1 = i * rot;
        const a2 = a1 + rot / 2;
        ctx.lineTo(Math.cos(a1) * outer, Math.sin(a1) * outer);
        ctx.lineTo(Math.cos(a2) * inner, Math.sin(a2) * inner);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      // Circle / soft dust
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

class FloatingText {
  constructor(x, y, text, color = '#ffe66d') {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.life = 0.8;
    this.maxLife = 0.8;
    this.vy = -60; // moves upward
  }

  update(dt) {
    this.life -= dt;
    this.y += this.vy * dt;
  }

  draw(ctx, camera) {
    if (this.life <= 0) return;
    const alpha = Math.max(0, this.life / this.maxLife);
    const renderX = this.x - camera.x;
    const renderY = this.y - camera.y;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 15px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000000';
    ctx.fillText(this.text, renderX + 1, renderY + 1); // drop shadow
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, renderX, renderY);
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.texts = [];
  }

  // Golden sparkles when a coin is collected
  addCoinSparkles(x, y) {
    const colors = ['#ffe66d', '#ffb703', '#ffffff', '#ffd166'];
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 160 + 40;
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: Math.random() > 0.4 ? 'star' : 'circle',
        size: Math.random() * 4 + 3,
        life: 0.5 + Math.random() * 0.3,
        gravity: 120
      }));
    }
  }

  // Soft dust puff when jumping or landing on ground
  addDust(x, y, count = 6) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, {
        vx: (Math.random() - 0.5) * 80,
        vy: -Math.random() * 30 - 10,
        color: 'rgba(230, 240, 250, 0.65)',
        shape: 'circle',
        size: Math.random() * 3.5 + 2,
        life: 0.35 + Math.random() * 0.2,
        gravity: 20
      }));
    }
  }

  // Explosion of stars and bursts when an enemy is defeated
  addEnemyDefeat(x, y) {
    const colors = ['#e63946', '#f77f00', '#fcbf49', '#ffffff', '#7209b7'];
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 200 + 60;
      this.particles.push(new Particle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: 'star',
        size: Math.random() * 5 + 3,
        life: 0.6 + Math.random() * 0.3,
        gravity: 220
      }));
    }
  }

  // Rising "+100" text
  addText(x, y, text, color = '#ffe66d') {
    this.texts.push(new FloatingText(x, y, text, color));
  }

  update(dt) {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = this.texts.length - 1; i >= 0; i--) {
      this.texts[i].update(dt);
      if (this.texts[i].life <= 0) {
        this.texts.splice(i, 1);
      }
    }
  }

  draw(ctx, camera) {
    // Draw all particles
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx, camera);
    }
    // Draw all texts
    for (let i = 0; i < this.texts.length; i++) {
      this.texts[i].draw(ctx, camera);
    }
  }

  clear() {
    this.particles = [];
    this.texts = [];
  }
}
