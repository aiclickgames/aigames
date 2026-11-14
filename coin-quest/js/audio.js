/**
 * ============================================================================
 * AUDIO SYSTEM (Web Audio API)
 * ============================================================================
 * Why Web Audio API?
 * - No external audio files to download (instant loading, zero CORS/404 errors!)
 * - Generates classic 8-bit retro sounds directly in code using oscillators.
 * - Works natively in all modern desktop and mobile browsers.
 */

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
  }

  // Initialize AudioContext on first user interaction (browser requirement)
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopBGM();
    } else {
      this.startBGM();
    }
    return this.muted;
  }

  // Helper: Play a tone with frequency slide and envelope
  playTone(freqStart, freqEnd, type, duration, volume = 0.15) {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, now);
      if (freqEnd && freqEnd !== freqStart) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(10, freqEnd), now + duration);
      }

      // Envelope: quick attack, smooth decay to zero
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      // Audio error safety
    }
  }

  // Sound: Collect Coin (crisp double chime)
  playCoin() {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Tone 1: 987Hz (B5)
      this.playTone(987, 987, 'sine', 0.08, 0.2);
      // Tone 2: 1318Hz (E6) slightly delayed
      setTimeout(() => {
        this.playTone(1318, 1318, 'sine', 0.22, 0.2);
      }, 70);
    } catch (e) {}
  }

  // Sound: Player Jump (rising pitch)
  playJump() {
    this.playTone(180, 520, 'square', 0.16, 0.09);
  }

  // Sound: Stomp Enemy (crunchy bounce)
  playStomp() {
    this.playTone(320, 90, 'triangle', 0.18, 0.25);
  }

  // Sound: Spring Pad Bounce (springy boing)
  playSpring() {
    this.playTone(220, 880, 'sine', 0.28, 0.2);
  }

  // Sound: Player Hurt (crunchy low buzz)
  playHurt() {
    this.playTone(180, 60, 'sawtooth', 0.25, 0.2);
  }

  // Sound: Game Over (descending sad melody)
  playGameOver() {
    if (this.muted || !this.ctx) return;
    const notes = [392, 349, 329, 261]; // G4, F4, E4, C4
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, freq * 0.95, 'triangle', 0.28, 0.2);
      }, i * 180);
    });
  }

  // Sound: Victory Fanfare (cheerful ascending sequence)
  playVictory() {
    if (this.muted || !this.ctx) return;
    const notes = [261.6, 329.6, 392.0, 523.25, 659.25, 783.99]; // C, E, G, C, E, G
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, freq, 'square', 0.18, 0.15);
      }, i * 120);
    });
  }

  // Gentle Retro Chiptune Background Music (BGM)
  startBGM() {
    if (this.muted || this.bgmPlaying || !this.ctx) return;
    this.bgmPlaying = true;
    this.bgmStep = 0;

    // A cheerful pentatonic melody loop:
    const melody = [
      261.6, 0, 329.6, 392.0, 0, 523.2, 392.0, 329.6,
      293.7, 0, 349.2, 440.0, 0, 523.2, 440.0, 349.2,
      261.6, 0, 329.6, 392.0, 0, 523.2, 659.2, 523.2,
      392.0, 0, 349.2, 329.6, 293.7, 0, 261.6, 0
    ];

    const bass = [
      130.8, 130.8, 130.8, 130.8,
      146.8, 146.8, 146.8, 146.8,
      130.8, 130.8, 130.8, 130.8,
      98.0,  98.0,  130.8, 130.8
    ];

    const tick = () => {
      if (!this.bgmPlaying || this.muted) return;

      const note = melody[this.bgmStep % melody.length];
      if (note > 0) {
        this.playTone(note, note, 'triangle', 0.12, 0.05);
      }

      // Bass note every 2 steps
      if (this.bgmStep % 2 === 0) {
        const bassIndex = Math.floor((this.bgmStep / 2) % bass.length);
        const bNote = bass[bassIndex];
        this.playTone(bNote, bNote, 'sine', 0.18, 0.06);
      }

      this.bgmStep++;
      this.bgmTimer = setTimeout(tick, 180); // ~166 BPM 8th notes
    };

    tick();
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

// Global sound system instance
const sounds = new SoundSystem();
