// Web Audio SFX for Snake. Same pattern as games/tetris/audio.js — a single
// shared instance that the App initializes on first pointer/key event.

export class SnakeAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.muted = false;
  }

  init() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.45;
    this.sfxGain.connect(this.master);
  }

  resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  beep({ freq = 440, duration = 0.1, type = 'square', gain = 0.4, attack = 0.005, release = 0.05 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain, t + attack);
    env.gain.setValueAtTime(gain, t + Math.max(attack, duration - release));
    env.gain.linearRampToValueAtTime(0, t + duration);
    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  sfxEat() {
    // Two-note ascending chime
    this.beep({ freq: 660, duration: 0.06, type: 'square', gain: 0.22 });
    setTimeout(() => this.beep({ freq: 990, duration: 0.08, type: 'square', gain: 0.22 }), 50);
  }

  sfxLevelUp() {
    [523, 784, 1047].forEach((f, i) =>
      setTimeout(() => this.beep({ freq: f, duration: 0.08, gain: 0.25 }), i * 60)
    );
  }

  sfxGameOver() {
    [440, 330, 220, 165].forEach((f, i) =>
      setTimeout(() => this.beep({ freq: f, duration: 0.18, type: 'sawtooth', gain: 0.25 }), i * 110)
    );
  }

  // Music intentionally omitted — keeping scope tight per the brief.
  startMusic() {}
  stopMusic() {}
}

export const snakeAudio = new SnakeAudio();
