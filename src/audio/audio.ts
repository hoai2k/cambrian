/** Fully synthesized audio: no sample files needed. */
export class GameAudio {
  private ctx?: AudioContext;
  private master?: GainNode;
  private ambGain?: GainNode;
  private tensionGain?: GainNode;
  private heartT = 0;
  private tension = 0;
  private started = false;
  volume = 0.8;
  muted = false;

  init() {
    if (this.started) return;
    this.started = true;
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    this.master = ctx.createGain(); this.master.gain.value = this.volume; this.master.connect(ctx.destination);
    // Ambience: two slow detuned drones through a low-pass, plus a filtered noise wash.
    this.ambGain = ctx.createGain(); this.ambGain.gain.value = 0.0; this.ambGain.connect(this.master);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.connect(this.ambGain);
    for (const [f, type] of [[55, 'sine'], [82.5, 'triangle'], [110.2, 'sine']] as const) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = f < 60 ? 0.35 : 0.14; o.connect(g); g.connect(lp); o.start();
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05 + Math.random() * 0.05; const lg = ctx.createGain(); lg.gain.value = 1.5; lfo.connect(lg); lg.connect(o.detune); lfo.start();
    }
    const noise = this.noiseSource(); const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 600; nf.Q.value = 0.5;
    const ng = ctx.createGain(); ng.gain.value = 0.05; noise.connect(nf); nf.connect(ng); ng.connect(this.ambGain);
    this.ambGain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 3);
    // Tension layer: low pulsing drone
    this.tensionGain = ctx.createGain(); this.tensionGain.gain.value = 0; this.tensionGain.connect(this.master);
    const td = ctx.createOscillator(); td.type = 'sawtooth'; td.frequency.value = 41; const tf = ctx.createBiquadFilter(); tf.type = 'lowpass'; tf.frequency.value = 160;
    td.connect(tf); tf.connect(this.tensionGain); td.start();
  }
  resume() { this.ctx?.resume(); }
  private noiseSource() {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.start(); return src;
  }
  setVolume(v: number) { this.volume = v; if (this.master) this.master.gain.value = this.muted ? 0 : v; }
  setMuted(m: boolean) { this.muted = m; this.setVolume(this.volume); }
  setTension(t: number) { this.tension = t; if (this.tensionGain && this.ctx) this.tensionGain.gain.setTargetAtTime(t * 0.35, this.ctx.currentTime, 0.4); }
  update(dt: number) {
    if (!this.ctx || this.tension < 0.2) { this.heartT = 0; return; }
    this.heartT -= dt;
    if (this.heartT <= 0) { this.heartT = 1.1 - this.tension * 0.55; this.thump(0.5 + this.tension * 0.5); setTimeout(() => this.thump(0.3 + this.tension * 0.3), 140); }
  }
  private thump(vol: number) {
    const ctx = this.ctx; if (!ctx || !this.master) return;
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(70, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 0.18);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol * 0.5, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    o.connect(g); g.connect(this.master); o.start(); o.stop(ctx.currentTime + 0.25);
  }
  private tone(freq: number, dur: number, vol: number, type: OscillatorType = 'sine', slide?: number, pan = 0) {
    const ctx = this.ctx; if (!ctx || !this.master) return;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), ctx.currentTime + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    const p = ctx.createStereoPanner(); p.pan.value = pan;
    o.connect(g); g.connect(p); p.connect(this.master); o.start(); o.stop(ctx.currentTime + dur + 0.05);
  }
  private burstNoise(dur: number, vol: number, freq: number, q = 1, pan = 0, sweep?: number) {
    const ctx = this.ctx; if (!ctx || !this.master) return;
    const src = this.noiseSource();
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(freq, ctx.currentTime); if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, ctx.currentTime + dur); f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    const p = ctx.createStereoPanner(); p.pan.value = pan;
    src.connect(f); f.connect(g); g.connect(p); p.connect(this.master); src.stop(ctx.currentTime + dur + 0.05);
  }

  play(kind: string, strength = 1, pan = 0) {
    if (!this.ctx) return;
    const s = Math.min(2, Math.max(0.2, strength));
    switch (kind) {
      case 'hit': this.burstNoise(0.12, 0.35 * s, 700, 0.8, pan); this.tone(120, 0.16, 0.35 * s, 'sine', 55, pan); break;
      case 'eat': this.tone(520 + Math.random() * 200, 0.08, 0.12, 'triangle', 300, pan); this.burstNoise(0.05, 0.08, 2400, 2, pan); break;
      case 'kill': this.tone(160, 0.5, 0.35, 'sawtooth', 50, pan); this.burstNoise(0.3, 0.3, 500, 0.6, pan, 120); break;
      case 'death': this.tone(220, 0.9, 0.3, 'sine', 40, pan); break;
      case 'parry': this.tone(1800, 0.25, 0.3, 'square', 2400, pan); this.burstNoise(0.08, 0.2, 3000, 4, pan); break;
      case 'guardBreak': this.tone(300, 0.35, 0.35, 'square', 90, pan); this.burstNoise(0.2, 0.25, 900, 1, pan); break;
      case 'stagger': this.tone(200, 0.2, 0.2, 'triangle', 120, pan); break;
      case 'dodge': this.burstNoise(0.25, 0.14, 900, 0.7, pan, 300); break;
      case 'silt': this.burstNoise(0.6, 0.18, 400, 0.5, pan, 150); break;
      case 'burst': this.burstNoise(0.35, 0.1, 600, 0.6, pan, 1200); break;
      case 'ability': this.burstNoise(0.4, 0.2, 1200, 1, pan, 300); this.tone(440, 0.4, 0.15, 'triangle', 660, pan); break;
      case 'grab': this.tone(90, 0.3, 0.3, 'sawtooth', 60, pan); this.burstNoise(0.15, 0.2, 400, 1, pan); break;
      case 'tierUp': [0, 0.12, 0.24, 0.4].forEach((d, i) => setTimeout(() => { this.tone([261, 329, 392, 523][i], 0.8, 0.25, 'triangle'); }, d * 1000)); this.thump(1); break;
      case 'hunted': this.tone(55, 1.2, 0.35, 'sawtooth', 45); this.thump(1); break;
      case 'escape': [0, 0.18].forEach((d, i) => setTimeout(() => this.tone([880, 1320][i], 0.9, 0.18, 'sine'), d * 1000)); break;
      case 'noticed': this.tone(330, 0.3, 0.12, 'sine', 220); break;
      case 'respawn': this.tone(392, 0.5, 0.15, 'triangle', 523); break;
      // UI
      case 'ui-move': this.tone(700, 0.06, 0.08, 'square'); break;
      case 'ui-confirm': this.tone(520, 0.12, 0.15, 'triangle', 780); break;
      case 'ui-back': this.tone(400, 0.12, 0.12, 'triangle', 260); break;
      case 'ui-start': [0, 0.1, 0.2].forEach((d, i) => setTimeout(() => this.tone([392, 523, 784][i], 0.5, 0.2, 'triangle'), d * 1000)); this.thump(1); break;
      case 'ui-join': this.tone(660, 0.2, 0.15, 'triangle', 990); break;
      case 'won': [0, 0.15, 0.3, 0.45, 0.7].forEach((d, i) => setTimeout(() => this.tone([392, 494, 587, 784, 988][i], 1.2, 0.22, 'triangle'), d * 1000)); break;
    }
  }
  dispose() { this.ctx?.close(); this.ctx = undefined; this.started = false; }
}
export const audio = new GameAudio();
