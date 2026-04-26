// Web Audio synth for pinball SFX. No music loop — silence between events
// keeps the table feeling tense. Programmatic only, no audio assets.

export class PinballAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  init() {
    if (this.ctx) return;
    const Ctx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!Ctx) return; // jsdom / unsupported browsers — silent no-op
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.45;
    this.master.connect(this.ctx.destination);
  }

  resume() { if (this.ctx?.state === 'suspended') this.ctx.resume(); }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.45;
  }

  _beep({ freq = 440, duration = 0.08, type = 'square', gain = 0.35, attack = 0.005, freqEnd } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd != null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t + duration);
    }
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain, t + attack);
    env.gain.linearRampToValueAtTime(0, t + duration);
    osc.connect(env);
    env.connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  _noiseBurst({ duration = 0.06, gain = 0.25, filterFreq = 2000 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const sampleRate = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = filterFreq;
    filt.Q.value = 1.5;
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain, t + 0.005);
    env.gain.linearRampToValueAtTime(0, t + duration);
    src.connect(filt);
    filt.connect(env);
    env.connect(this.master);
    src.start(t);
    src.stop(t + duration);
  }

  sfxFlipper() { this._beep({ freq: 220, duration: 0.04, type: 'square', gain: 0.18, freqEnd: 110 }); }
  sfxBumper() {
    this._beep({ freq: 880, duration: 0.06, type: 'square', gain: 0.32, freqEnd: 440 });
    this._noiseBurst({ duration: 0.04, gain: 0.10, filterFreq: 3000 });
  }
  sfxSling() { this._beep({ freq: 660, duration: 0.05, type: 'triangle', gain: 0.28, freqEnd: 330 }); }
  sfxDrop() { this._beep({ freq: 1320, duration: 0.05, type: 'square', gain: 0.30 }); }
  sfxBonus() {
    [523, 659, 784, 1047, 1318].forEach((f, i) =>
      setTimeout(() => this._beep({ freq: f, duration: 0.18, type: 'square', gain: 0.32 }), i * 70)
    );
  }
  sfxPlunger() { this._beep({ freq: 110, duration: 0.18, type: 'sawtooth', gain: 0.25, freqEnd: 240 }); }
  sfxDrain() {
    [400, 320, 250, 180].forEach((f, i) =>
      setTimeout(() => this._beep({ freq: f, duration: 0.18, type: 'sawtooth', gain: 0.22 }), i * 90)
    );
  }
  sfxGameOver() {
    [523, 392, 311, 196].forEach((f, i) =>
      setTimeout(() => this._beep({ freq: f, duration: 0.28, type: 'sawtooth', gain: 0.30 }), i * 130)
    );
  }
}

export const pinballAudio = new PinballAudio();
