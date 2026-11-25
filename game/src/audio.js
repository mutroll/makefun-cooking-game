// audio.js — every sound in Sizzle Lane, synthesised live with WebAudio.
// One clear job: noise and bleeps. No audio files, no network, nothing to load.

export class SoundFX {
  constructor() {
    this.context = null;
    this.muted = false;
    this.noiseBuffer = null;
  }

  // Browsers only let audio start after a gesture; the first key or click wakes it.
  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      return;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext();
      const length = this.context.sampleRate;
      this.noiseBuffer = this.context.createBuffer(1, length, this.context.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    } catch {
      this.context = null;
    }
  }

  tone(freq, dur, type, vol, slideTo) {
    if (!this.context || this.muted) return;
    try {
      const now = this.context.currentTime;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
      gain.gain.setValueAtTime(vol || 0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(gain).connect(this.context.destination);
      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch {
      // Sound is garnish: a failed beep never breaks the game.
    }
  }

  noise(dur, vol, freq) {
    if (!this.context || this.muted || !this.noiseBuffer) return;
    try {
      const now = this.context.currentTime;
      const source = this.context.createBufferSource();
      source.buffer = this.noiseBuffer;
      const filter = this.context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq || 4000;
      filter.Q.value = 0.8;
      const gain = this.context.createGain();
      gain.gain.setValueAtTime(vol || 0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
      source.connect(filter).connect(gain).connect(this.context.destination);
      source.start(now);
      source.stop(now + dur + 0.02);
    } catch {
      // See tone(): garnish only.
    }
  }

  pop() { this.tone(520, 0.08, 'triangle', 0.14, 760); }
  chopStart() { this.noise(0.12, 0.16, 2600); this.tone(220, 0.06, 'square', 0.05); }
  chopDone() { this.noise(0.1, 0.14, 3000); this.tone(660, 0.09, 'triangle', 0.12, 880); }
  sizzle() { this.noise(0.5, 0.12, 5200); }
  ding() { this.tone(880, 0.22, 'sine', 0.14); this.tone(1320, 0.3, 'sine', 0.08); }
  plate() { this.tone(392, 0.1, 'triangle', 0.13); this.tone(523, 0.12, 'triangle', 0.13); this.tone(659, 0.18, 'triangle', 0.13); }
  serve() {
    this.tone(523, 0.1, 'triangle', 0.14);
    setTimeout(() => this.tone(659, 0.1, 'triangle', 0.14), 90);
    setTimeout(() => this.tone(784, 0.2, 'triangle', 0.15), 180);
  }
  error() { this.tone(160, 0.18, 'sawtooth', 0.08, 110); }
  trash() { this.noise(0.18, 0.1, 900); }
  click() { this.tone(700, 0.05, 'triangle', 0.1); }
  gameOver() {
    this.tone(392, 0.25, 'triangle', 0.13);
    setTimeout(() => this.tone(330, 0.25, 'triangle', 0.13), 220);
    setTimeout(() => this.tone(262, 0.4, 'triangle', 0.13), 440);
  }
}
