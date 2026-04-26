// Web Audio synth: chiptune-style "Korobeiniki" loop + SFX.
// Programmatically generated — no external audio files.

const KOROBEINIKI = [
  // [midi, beats] — beats are sixteenths
  // Phrase A
  ['E5', 4], ['B4', 2], ['C5', 2], ['D5', 4], ['C5', 2], ['B4', 2],
  ['A4', 4], ['A4', 2], ['C5', 2], ['E5', 4], ['D5', 2], ['C5', 2],
  ['B4', 6], ['C5', 2], ['D5', 4], ['E5', 4],
  ['C5', 4], ['A4', 4], ['A4', 4], [null, 4],
  // Phrase B
  [null, 2], ['D5', 4], ['F5', 2], ['A5', 4], ['G5', 2], ['F5', 2],
  ['E5', 6], ['C5', 2], ['E5', 4], ['D5', 2], ['C5', 2],
  ['B4', 4], ['B4', 2], ['C5', 2], ['D5', 4], ['E5', 4],
  ['C5', 4], ['A4', 4], ['A4', 4], [null, 4],
];

const NOTE_FREQ = {
  'A4': 440.0, 'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25,
  'E5': 659.26, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99,
  'G#5': 830.61, 'A5': 880.0,
};

const BPM = 144;
const BEAT_MS = (60 / BPM / 4) * 1000; // sixteenth note in ms

export class TetrisAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = false;
    this.musicPlaying = false;
    this.musicTimer = null;
    this.melodyIndex = 0;
  }

  init() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.20;
    this.musicGain.connect(this.master);

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

  // play a single beep
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

  // play a chord-style noise burst for line clears
  burst({ freqs = [440, 550], duration = 0.15, type = 'square', gain = 0.25 } = {}) {
    for (const f of freqs) this.beep({ freq: f, duration, type, gain });
  }

  sfxLock() { this.beep({ freq: 180, duration: 0.05, type: 'square', gain: 0.18 }); }
  sfxMove() { this.beep({ freq: 330, duration: 0.025, type: 'square', gain: 0.10 }); }
  sfxRotate() { this.beep({ freq: 440, duration: 0.04, type: 'triangle', gain: 0.15 }); }
  sfxClear(n) {
    if (n === 4) {
      // Tetris — bigger fanfare
      const seq = [523, 659, 784, 1047];
      seq.forEach((f, i) => setTimeout(() => this.beep({ freq: f, duration: 0.12, gain: 0.3 }), i * 60));
    } else {
      this.burst({ freqs: [440 + n * 80, 660 + n * 80], duration: 0.12, gain: 0.22 });
    }
  }
  sfxLevelUp() {
    [523, 659, 784].forEach((f, i) =>
      setTimeout(() => this.beep({ freq: f, duration: 0.1, gain: 0.3 }), i * 80)
    );
  }
  sfxGameOver() {
    [659, 523, 440, 330, 220].forEach((f, i) =>
      setTimeout(() => this.beep({ freq: f, duration: 0.18, type: 'sawtooth', gain: 0.25 }), i * 100)
    );
  }
  sfxHold() { this.beep({ freq: 660, duration: 0.06, type: 'triangle', gain: 0.18 }); }

  startMusic() {
    if (!this.ctx || this.musicPlaying) return;
    this.musicPlaying = true;
    this.melodyIndex = 0;
    this._scheduleNextNote();
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  _scheduleNextNote() {
    if (!this.musicPlaying) return;
    const [note, beats] = KOROBEINIKI[this.melodyIndex];
    const dur = beats * BEAT_MS;
    if (note && NOTE_FREQ[note]) {
      const freq = NOTE_FREQ[note];
      this._playMelodyNote(freq, dur / 1000);
    }
    this.melodyIndex = (this.melodyIndex + 1) % KOROBEINIKI.length;
    this.musicTimer = setTimeout(() => this._scheduleNextNote(), dur);
  }

  _playMelodyNote(freq, durationSec) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // Melody voice
    const osc1 = this.ctx.createOscillator();
    const env1 = this.ctx.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(freq, t);
    env1.gain.setValueAtTime(0, t);
    env1.gain.linearRampToValueAtTime(0.18, t + 0.01);
    env1.gain.linearRampToValueAtTime(0.10, t + Math.min(0.05, durationSec * 0.5));
    env1.gain.linearRampToValueAtTime(0, t + durationSec * 0.95);
    osc1.connect(env1);
    env1.connect(this.musicGain);
    osc1.start(t);
    osc1.stop(t + durationSec);

    // Bass / sub voice (one octave down, triangle, softer)
    const osc2 = this.ctx.createOscillator();
    const env2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq / 2, t);
    env2.gain.setValueAtTime(0, t);
    env2.gain.linearRampToValueAtTime(0.10, t + 0.01);
    env2.gain.linearRampToValueAtTime(0, t + durationSec * 0.95);
    osc2.connect(env2);
    env2.connect(this.musicGain);
    osc2.start(t);
    osc2.stop(t + durationSec);
  }
}

export const tetrisAudio = new TetrisAudio();
