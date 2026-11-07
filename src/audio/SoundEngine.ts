/**
 * Web Audio synthesizer for KIAI 64.
 * Original SID-style chiptune theme + karate sound effects
 * (gong, whooshes, impacts, blocks, referee calls).
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.6;
  private isBgmPlaying: boolean = false;
  private bgmTimeoutId: number | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0.55, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  // ==========================================
  // SFX: Gong, Punches, Kicks, Hits, Referee
  // ==========================================

  public playGong() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;

      const now = this.ctx.currentTime;
      // Inharmonic frequencies to simulate a massive oriental bronze temple gong
      const freqs = [110, 164.8, 220, 293.6, 370, 440, 587, 880];
      const gongGain = this.ctx.createGain();
      gongGain.gain.setValueAtTime(0.9, now);
      gongGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);
      gongGain.connect(this.sfxGain);

      freqs.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();

        // Mix triangle and sawtooth for metallic bite
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        // Slight detune for gong shimmer
        osc.detune.setValueAtTime((Math.random() - 0.5) * 35, now);

        const amp = 0.25 / (idx + 1);
        oscGain.gain.setValueAtTime(amp, now);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);

        osc.connect(oscGain);
        oscGain.connect(gongGain);

        osc.start(now);
        osc.stop(now + 3.8);
      });

      // Low end punch thump
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(90, now);
      subOsc.frequency.exponentialRampToValueAtTime(35, now + 1.2);
      subGain.gain.setValueAtTime(0.6, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

      subOsc.connect(subGain);
      subGain.connect(gongGain);
      subOsc.start(now);
      subOsc.stop(now + 1.6);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public playWhoosh(type: 'punch' | 'kick' | 'jump' = 'punch') {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;

      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * (type === 'kick' ? 0.22 : 0.15);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      const startFreq = type === 'kick' ? 350 : 500;
      const peakFreq = type === 'kick' ? 1400 : 2200;
      filter.frequency.setValueAtTime(startFreq, now);
      filter.frequency.exponentialRampToValueAtTime(peakFreq, now + 0.08);
      filter.frequency.exponentialRampToValueAtTime(250, now + (type === 'kick' ? 0.22 : 0.15));
      filter.Q.setValueAtTime(3, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (type === 'kick' ? 0.22 : 0.15));

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start(now);
    } catch {}
  }

  public playHit(heavy: boolean = false) {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;

      const now = this.ctx.currentTime;

      // 1. Resonant low impact thump
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(heavy ? 180 : 260, now);
      osc.frequency.exponentialRampToValueAtTime(heavy ? 38 : 55, now + 0.18);

      oscGain.gain.setValueAtTime(0.8, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.22 : 0.15));

      osc.connect(oscGain);
      oscGain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.25);

      // 2. Crisp slap / crunch
      const bufferSize = this.ctx.sampleRate * 0.08;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.02));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(heavy ? 0.7 : 0.5, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      noise.connect(noiseGain);
      noiseGain.connect(this.sfxGain);
      noise.start(now);
    } catch {}
  }

  public playBlock() {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.09);

      oscGain.gain.setValueAtTime(0.4, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(oscGain);
      oscGain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {}
  }

  public playRefereeCall(type: 'hajime' | 'yame' | 'waza-ari' | 'ippon') {
    try {
      this.initContext();
      if (!this.ctx || !this.sfxGain) return;

      const now = this.ctx.currentTime;
      if (type === 'hajime') {
        // High dual whistle/chime for "Begin!"
        this.playWhistleTone(880, 0.12, 0);
        this.playWhistleTone(1174.66, 0.25, 0.1);
      } else if (type === 'yame') {
        // Sharp stop double-chirp for "Stop!"
        this.playWhistleTone(1046.5, 0.1, 0);
        this.playWhistleTone(784, 0.18, 0.09);
      } else if (type === 'waza-ari') {
        // Ascending half point chime
        this.playNote(587.33, 0.14, 0, 'triangle');
        this.playNote(880, 0.35, 0.12, 'triangle');
      } else if (type === 'ippon') {
        // Triumphant 3-note martial fanfare
        this.playNote(587.33, 0.12, 0, 'square');
        this.playNote(784, 0.12, 0.12, 'square');
        this.playNote(1174.66, 0.45, 0.24, 'square');
      }
    } catch {}
  }

  private playWhistleTone(freq: number, duration: number, delay: number) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.linearRampToValueAtTime(freq * 1.05, now + duration * 0.5);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private playNote(freq: number, duration: number, delay: number, type: OscillatorType = 'square') {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  // ==========================================
  // "Kiai 64" — original chiptune theme (A minor / Japanese in-scale feel)
  // 4 SID-style voices: pulse lead, arpeggio, triangle bass, noise drums.
  // Look-ahead scheduler (robust against tab throttling).
  // ==========================================

  private static readonly STEP = 0.125; // 16th note at 120 BPM

  // Note tokens: "E5" = note, "-" = hold, "." = rest. 16 steps per bar.
  private static readonly LEAD = [
    'E5 - - . B4 - A4 - B4 - - - . . . .',
    'C5 - B4 - A4 - F4 - E4 - - - - - . .',
    'E5 - - . F5 - E5 - C5 - B4 - A4 - B4 -',
    'C5 - - - B4 - - - E4 - - - - - - .',
    'A4 - . A4 C5 - E5 - F5 - - - E5 - - .',
    'C5 - B4 - C5 - B4 - A4 - - - . . . .',
    'F4 - A4 - B4 - C5 - E5 - F5 - E5 - C5 -',
    'B4 - - - - - - - E4 - B3 - E4 - - -'
  ];
  // One chord per bar: [bass root, arp notes]
  private static readonly CHORDS: [string, string[]][] = [
    ['A2', ['A4', 'C5', 'E5']],
    ['F2', ['F4', 'A4', 'C5']],
    ['A2', ['A4', 'C5', 'E5']],
    ['E2', ['E4', 'G#4', 'B4']],
    ['F2', ['F4', 'A4', 'C5']],
    ['A2', ['A4', 'C5', 'E5']],
    ['D2', ['D4', 'F4', 'A4']],
    ['E2', ['E4', 'G#4', 'B4']]
  ];

  private bgmStep = 0;
  private nextStepTime = 0;
  private leadSteps: (number | null | 'hold')[] = [];
  private pulseWave: PeriodicWave | null = null;

  private static noteFreq(name: string): number {
    const m = /^([A-G])(#?)(\d)$/.exec(name);
    if (!m) return 0;
    const semis: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
    const n = semis[m[1]] + (m[2] ? 1 : 0) + (parseInt(m[3], 10) - 4) * 12;
    return 440 * Math.pow(2, n / 12);
  }

  private buildScore() {
    if (this.leadSteps.length) return;
    for (const bar of SoundEngine.LEAD) {
      for (const tok of bar.split(' ')) {
        if (tok === '-') this.leadSteps.push('hold');
        else if (tok === '.') this.leadSteps.push(null);
        else this.leadSteps.push(SoundEngine.noteFreq(tok));
      }
    }
  }

  private getPulseWave(): PeriodicWave | null {
    if (!this.ctx) return null;
    if (!this.pulseWave) {
      // 25% duty pulse (classic SID lead timbre)
      const n = 32;
      const real = new Float32Array(n);
      const imag = new Float32Array(n);
      const duty = 0.25;
      for (let k = 1; k < n; k++) {
        real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty * 2) * 0.5;
        imag[k] = (2 / (k * Math.PI)) * (1 - Math.cos(k * Math.PI * duty * 2)) * 0.5;
      }
      this.pulseWave = this.ctx.createPeriodicWave(real, imag);
    }
    return this.pulseWave;
  }

  public startBgm() {
    this.initContext();
    if (this.isBgmPlaying || !this.ctx) return;
    this.buildScore();
    this.isBgmPlaying = true;
    this.bgmStep = 0;
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.scheduler();
    this.bgmTimeoutId = window.setInterval(() => this.scheduler(), 25);
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    if (this.bgmTimeoutId) {
      window.clearInterval(this.bgmTimeoutId);
      this.bgmTimeoutId = null;
    }
  }

  public toggleBgm(): boolean {
    if (this.isBgmPlaying) {
      this.stopBgm();
      return false;
    }
    this.startBgm();
    return true;
  }

  public isMusicPlaying(): boolean {
    return this.isBgmPlaying;
  }

  private scheduler() {
    if (!this.isBgmPlaying || !this.ctx) return;
    // If the tab was frozen, resync instead of firing a burst of notes
    if (this.nextStepTime < this.ctx.currentTime - 0.25) {
      this.nextStepTime = this.ctx.currentTime + 0.05;
    }
    while (this.nextStepTime < this.ctx.currentTime + 0.12) {
      this.scheduleStep(this.bgmStep, this.nextStepTime);
      this.bgmStep = (this.bgmStep + 1) % this.leadSteps.length;
      this.nextStepTime += SoundEngine.STEP;
    }
  }

  private scheduleStep(step: number, t: number) {
    const STEP = SoundEngine.STEP;
    const bar = Math.floor(step / 16) % SoundEngine.CHORDS.length;
    const inBar = step % 16;
    const [root, arp] = SoundEngine.CHORDS[bar];

    // Voice 1: lead (note length = following "hold" tokens)
    const tok = this.leadSteps[step];
    if (typeof tok === 'number') {
      let len = 1;
      while (this.leadSteps[(step + len) % this.leadSteps.length] === 'hold' && len < 16) len++;
      this.playSidLead(tok, t, len * STEP * 0.92);
    }

    // Voice 2: fast SID arpeggio, quiet, every step
    const arpFreq = SoundEngine.noteFreq(arp[inBar % arp.length]);
    this.playSidArp(arpFreq, t, STEP * 0.6);

    // Voice 3: bass — driving octave pattern
    const rootF = SoundEngine.noteFreq(root);
    const bassPattern = [1, 0, 2, 1, 0, 1, 2, 0, 1, 0, 2, 1, 0, 1, 2, 2];
    const b = bassPattern[inBar];
    if (b) this.playSidBass(b === 2 ? rootF * 2 : rootF, t, STEP * 0.85);

    // Voice 4: noise drums
    if (inBar === 0 || inBar === 6 || inBar === 8) this.playSidDrums(t, true);
    else if (inBar === 4 || inBar === 12) this.playSidDrums(t, false);
  }

  private playSidArp(freq: number, startTime: number, duration: number) {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.035, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private playSidLead(freq: number, startTime: number, duration: number) {
    if (!this.ctx || !this.bgmGain) return;

    // SID 6581 style pulse wave with envelope
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    const pulse = this.getPulseWave();
    if (pulse) osc.setPeriodicWave(pulse);
    else osc.type = 'square';
    osc.frequency.setValueAtTime(freq, startTime);

    // Subtle pitch vibrato after 100ms (classic C64 vibrato)
    if (duration > 0.25) {
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(6.5, startTime); // 6.5 Hz vibrato
      lfoGain.gain.setValueAtTime(freq * 0.015, startTime + 0.12);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(startTime + 0.1);
      lfo.stop(startTime + duration);
    }

    // Warm lowpass filter for retro SID timbre
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, startTime);
    filter.frequency.exponentialRampToValueAtTime(800, startTime + duration);

    // ADSR Envelope
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.22, startTime + 0.02); // quick attack
    gain.gain.exponentialRampToValueAtTime(0.14, startTime + 0.08); // decay
    gain.gain.setValueAtTime(0.14, startTime + duration * 0.75); // sustain
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration); // release

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  private playSidBass(freq: number, startTime: number, duration: number) {
    if (!this.ctx || !this.bgmGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.24, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private playSidDrums(startTime: number, isKick: boolean) {
    if (!this.ctx || !this.bgmGain) return;

    if (isKick) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, startTime);
      osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.08);

      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.09);

      osc.connect(gain);
      gain.connect(this.bgmGain);
      osc.start(startTime);
      osc.stop(startTime + 0.1);
    } else {
      // Noise snare tick
      const bufferSize = this.ctx.sampleRate * 0.05;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.015));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05);

      noise.connect(gain);
      gain.connect(this.bgmGain);
      noise.start(startTime);
    }
  }
}

export const soundEngine = new SoundEngine();
