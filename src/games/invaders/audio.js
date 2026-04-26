// Web Audio synth for Space Invaders.
// The signature "music" is the iconic descending 4-tone alien step heartbeat
// that speeds up as fewer aliens remain — there is no melody loop.

const STEP_FREQS = [
  261.63, // C4
  246.94, // B3
  233.08, // A#3
  220.00, // A3
];

export class InvadersAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.muted = false;
  }

  init() {
    if (this.ctx) return;
    const Ctx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!Ctx) return; // jsdom / unsupported browsers — silent no-op
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.55;
    this.sfxGain.connect(this.master);
  }

  resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  // shared envelope-shaped tone
  beep({ freq = 440, duration = 0.1, type = 'square', gain = 0.4, attack = 0.005, release = 0.04, slideTo = null } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo != null) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain, t + attack);
    env.gain.setValueAtTime(gain, t + Math.max(attack, duration - release));
    env.gain.linearRampToValueAtTime(0, t + duration);
    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  // band-limited noise burst for explosions
  noiseBurst({ duration = 0.25, gain = 0.4 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const decay = 1 - i / len;
      data[i] = (Math.random() * 2 - 1) * decay;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, t);
    filter.frequency.exponentialRampToValueAtTime(160, t + duration);
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(gain, t);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filter);
    filter.connect(env);
    env.connect(this.sfxGain);
    src.start(t);
    src.stop(t + duration);
  }

  // ---- SFX ----
  sfxShoot() {
    this.beep({ freq: 880, slideTo: 220, duration: 0.12, type: 'square', gain: 0.22, attack: 0.002, release: 0.05 });
  }

  sfxAlienHit() {
    this.noiseBurst({ duration: 0.22, gain: 0.32 });
    this.beep({ freq: 180, slideTo: 60, duration: 0.18, type: 'sawtooth', gain: 0.18 });
  }

  sfxPlayerHit() {
    this.noiseBurst({ duration: 0.5, gain: 0.4 });
    this.beep({ freq: 90, slideTo: 40, duration: 0.45, type: 'sawtooth', gain: 0.25 });
  }

  sfxAlienStep(phase = 0) {
    const freq = STEP_FREQS[phase % STEP_FREQS.length];
    this.beep({ freq, duration: 0.09, type: 'square', gain: 0.16, attack: 0.001, release: 0.03 });
  }

  sfxSaucer() {
    // wavering high tone — alternates between two close pitches a few times
    const t0 = this.ctx?.currentTime ?? 0;
    if (!this.ctx) return;
    for (let i = 0; i < 6; i++) {
      const t = t0 + i * 0.12;
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(i % 2 === 0 ? 1320 : 1100, t);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.16, t + 0.005);
      env.gain.linearRampToValueAtTime(0, t + 0.11);
      osc.connect(env);
      env.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.12);
    }
  }

  sfxSaucerHit() {
    this.noiseBurst({ duration: 0.3, gain: 0.34 });
    for (const f of [880, 660, 440]) {
      this.beep({ freq: f, duration: 0.1, type: 'square', gain: 0.18, attack: 0.001, release: 0.04 });
    }
  }

  sfxWaveClear() {
    [392, 523, 659, 784].forEach((f, i) =>
      setTimeout(() => this.beep({ freq: f, duration: 0.12, type: 'square', gain: 0.22 }), i * 80)
    );
  }

  sfxGameOver() {
    [659, 523, 392, 261, 196].forEach((f, i) =>
      setTimeout(() => this.beep({ freq: f, duration: 0.2, type: 'sawtooth', gain: 0.24 }), i * 110)
    );
  }
}

export const invadersAudio = new InvadersAudio();
