/**
 * ============================================================================
 * INPUT SYSTEM
 * ============================================================================
 * Handles both Keyboard input (Desktop) and Touch/Pointer input (Mobile).
 * Keeps track of:
 * - Continuous states: left, right, jump, down
 * - Trigger states (single press): jumpPressed, pausePressed, restartPressed
 */

class InputHandler {
  constructor() {
    this.left = false;
    this.right = false;
    this.jump = false;
    this.jumpPressed = false; // True only on the frame the button was pressed
    this.pausePressed = false;
    this.restartPressed = false;

    // Keys currently held down
    this.keys = {};

    this.initKeyboard();
    this.initTouch();
  }

  // Keyboard Event Listeners
  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Prevent browser scrolling on Arrow keys and Space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      const code = e.code;
      if (!this.keys[code]) {
        // First press event
        if (code === 'KeyW' || code === 'ArrowUp' || code === 'Space') {
          this.jumpPressed = true;
        }
        if (code === 'KeyP' || code === 'Escape') {
          this.pausePressed = true;
        }
        if (code === 'KeyR') {
          this.restartPressed = true;
        }
        if (code === 'KeyM') {
          if (window.game) {
            window.game.toggleAudio();
          }
        }
      }

      this.keys[code] = true;
      this.updateMovement();
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      this.updateMovement();
    });

    // Reset keys if window loses focus
    window.addEventListener('blur', () => {
      this.keys = {};
      this.left = false;
      this.right = false;
      this.jump = false;
    });
  }

  updateMovement() {
    this.left = !!(this.keys['ArrowLeft'] || this.keys['KeyA']);
    this.right = !!(this.keys['ArrowRight'] || this.keys['KeyD']);
    this.jump = !!(this.keys['ArrowUp'] || this.keys['KeyW'] || this.keys['Space']);
  }

  // Mobile Touch & Pointer Controls
  initTouch() {
    const btnLeft = document.getElementById('touch-left');
    const btnRight = document.getElementById('touch-right');
    const btnJump = document.getElementById('touch-jump');

    if (!btnLeft || !btnRight || !btnJump) return;

    const bindButton = (elem, onDown, onUp) => {
      const handleDown = (e) => {
        e.preventDefault();
        elem.classList.add('pressed');
        onDown();
      };
      const handleUp = (e) => {
        e.preventDefault();
        elem.classList.remove('pressed');
        onUp();
      };

      elem.addEventListener('pointerdown', handleDown);
      elem.addEventListener('pointerup', handleUp);
      elem.addEventListener('pointercancel', handleUp);
      elem.addEventListener('pointerleave', handleUp);

      // Support classic touch events without ghost clicks
      elem.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    };

    // Left button
    bindButton(
      btnLeft,
      () => { this.left = true; },
      () => { if (!this.keys['ArrowLeft'] && !this.keys['KeyA']) this.left = false; }
    );

    // Right button
    bindButton(
      btnRight,
      () => { this.right = true; },
      () => { if (!this.keys['ArrowRight'] && !this.keys['KeyD']) this.right = false; }
    );

    // Jump button
    bindButton(
      btnJump,
      () => {
        this.jump = true;
        this.jumpPressed = true;
      },
      () => {
        if (!this.keys['ArrowUp'] && !this.keys['KeyW'] && !this.keys['Space']) {
          this.jump = false;
        }
      }
    );
  }

  // Called at the end of each game update tick to clear one-shot press flags
  endFrame() {
    this.jumpPressed = false;
    this.pausePressed = false;
    this.restartPressed = false;
  }
}
