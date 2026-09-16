/**
 * Synthetic Procedural Audio Synthesizer for Fighter Aircraft Cockpit
 * Uses the Web Audio API with zero external audio dependencies.
 */

class CockpitAudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  // Engine sound nodes
  private turbineOsc: OscillatorNode | null = null;
  private turbineGain: GainNode | null = null;
  private jetRumbleNode: AudioNode | null = null;
  private jetRumbleGain: GainNode | null = null;
  private afterburnerGain: GainNode | null = null;

  // Airflow sound nodes
  private windNoiseGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;

  // Warning tone nodes
  private warningOsc: OscillatorNode | null = null;
  private warningGain: GainNode | null = null;
  private isWarningActive: boolean = false;

  private stallOsc: OscillatorNode | null = null;
  private stallGain: GainNode | null = null;
  private isStallActive: boolean = false;

  private initialized: boolean = false;

  public init(): void {
    if (this.initialized) return;

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;

      this.ctx = new AudioCtxClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.initEngineAudio();
      this.initAirflowAudio();
      this.initAlertAudio();

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported or blocked:', e);
    }
  }

  private ensureContext(): void {
    if (!this.initialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private createNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private initEngineAudio(): void {
    if (!this.ctx || !this.masterGain) return;

    // Turbine high-pitch whine
    this.turbineOsc = this.ctx.createOscillator();
    this.turbineOsc.type = 'sawtooth';
    this.turbineOsc.frequency.setValueAtTime(100, this.ctx.currentTime);

    const turbineFilter = this.ctx.createBiquadFilter();
    turbineFilter.type = 'bandpass';
    turbineFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    turbineFilter.Q.setValueAtTime(6.0, this.ctx.currentTime);

    this.turbineGain = this.ctx.createGain();
    this.turbineGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    this.turbineOsc.connect(turbineFilter);
    turbineFilter.connect(this.turbineGain);
    this.turbineGain.connect(this.masterGain);
    this.turbineOsc.start();

    // Jet low rumble / exhaust noise
    const noiseBuffer = this.createNoiseBuffer();
    if (noiseBuffer) {
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(180, this.ctx.currentTime);

      this.jetRumbleGain = this.ctx.createGain();
      this.jetRumbleGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

      noiseSource.connect(lowpass);
      lowpass.connect(this.jetRumbleGain);
      this.jetRumbleGain.connect(this.masterGain);
      noiseSource.start();
      this.jetRumbleNode = noiseSource;

      // Afterburner rumble layer
      const abSource = this.ctx.createBufferSource();
      abSource.buffer = noiseBuffer;
      abSource.loop = true;

      const abBandpass = this.ctx.createBiquadFilter();
      abBandpass.type = 'bandpass';
      abBandpass.frequency.setValueAtTime(280, this.ctx.currentTime);
      abBandpass.Q.setValueAtTime(2.0, this.ctx.currentTime);

      this.afterburnerGain = this.ctx.createGain();
      this.afterburnerGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

      abSource.connect(abBandpass);
      abBandpass.connect(this.afterburnerGain);
      this.afterburnerGain.connect(this.masterGain);
      abSource.start();
    }
  }

  private initAirflowAudio(): void {
    if (!this.ctx || !this.masterGain) return;

    const noiseBuffer = this.createNoiseBuffer();
    if (noiseBuffer) {
      const windSource = this.ctx.createBufferSource();
      windSource.buffer = noiseBuffer;
      windSource.loop = true;

      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.setValueAtTime(600, this.ctx.currentTime);
      this.windFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);

      this.windNoiseGain = this.ctx.createGain();
      this.windNoiseGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

      windSource.connect(this.windFilter);
      this.windFilter.connect(this.windNoiseGain);
      this.windNoiseGain.connect(this.masterGain);
      windSource.start();
    }
  }

  private initAlertAudio(): void {
    if (!this.ctx || !this.masterGain) return;

    // Master warning oscillator
    this.warningOsc = this.ctx.createOscillator();
    this.warningOsc.type = 'square';
    this.warningOsc.frequency.setValueAtTime(1050, this.ctx.currentTime);

    this.warningGain = this.ctx.createGain();
    this.warningGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    this.warningOsc.connect(this.warningGain);
    this.warningGain.connect(this.masterGain);
    this.warningOsc.start();

    // Stall warning horn
    this.stallOsc = this.ctx.createOscillator();
    this.stallOsc.type = 'sawtooth';
    this.stallOsc.frequency.setValueAtTime(450, this.ctx.currentTime);

    this.stallGain = this.ctx.createGain();
    this.stallGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

    this.stallOsc.connect(this.stallGain);
    this.stallGain.connect(this.masterGain);
    this.stallOsc.start();
  }

  public updateEngine(n2RpmPercent: number, thrustPercent: number, afterburner: boolean): void {
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    const rpmRatio = Math.max(0, Math.min(1.1, n2RpmPercent / 100));

    if (this.turbineGain && this.turbineOsc) {
      if (rpmRatio < 0.05) {
        this.turbineGain.gain.setTargetAtTime(0.0001, now, 0.2);
      } else {
        const freq = 300 + rpmRatio * 1800;
        this.turbineOsc.frequency.setTargetAtTime(freq, now, 0.1);
        const gain = 0.02 + rpmRatio * 0.12;
        this.turbineGain.gain.setTargetAtTime(gain, now, 0.1);
      }
    }

    if (this.jetRumbleGain) {
      if (rpmRatio < 0.15) {
        this.jetRumbleGain.gain.setTargetAtTime(0.0001, now, 0.2);
      } else {
        const gain = 0.01 + thrustPercent * 0.15;
        this.jetRumbleGain.gain.setTargetAtTime(gain, now, 0.1);
      }
    }

    if (this.afterburnerGain) {
      const abGain = afterburner ? 0.22 : 0.0001;
      this.afterburnerGain.gain.setTargetAtTime(abGain, now, 0.15);
    }
  }

  public updateAirflow(airspeedKnots: number, dynamicPressurePa: number): void {
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    if (this.windNoiseGain && this.windFilter) {
      const speedRatio = Math.min(1.5, airspeedKnots / 600);
      const windGain = Math.max(0.0001, speedRatio * speedRatio * 0.14);
      this.windNoiseGain.gain.setTargetAtTime(windGain, now, 0.2);

      const filterFreq = 300 + speedRatio * 1200;
      this.windFilter.frequency.setTargetAtTime(filterFreq, now, 0.2);
    }
  }

  public playSwitchClick(): void {
    this.ensureContext();
    if (!this.ctx || this.isMuted || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();

    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(1400, now);
    clickOsc.frequency.exponentialRampToValueAtTime(300, now + 0.035);

    clickGain.gain.setValueAtTime(0.18, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

    clickOsc.connect(clickGain);
    clickGain.connect(this.masterGain);

    clickOsc.start(now);
    clickOsc.stop(now + 0.04);
  }

  public playCautionChime(): void {
    this.ensureContext();
    if (!this.ctx || this.isMuted || !this.masterGain) return;

    const now = this.ctx.currentTime;
    // Two-tone chime: 880Hz then 660Hz
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(now);
    osc1.stop(now + 0.18);

    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(660, now + 0.2);
    gain2.gain.setValueAtTime(0.2, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(now + 0.2);
    osc2.stop(now + 0.45);
  }

  public setMasterWarning(active: boolean): void {
    if (!this.ctx || this.isMuted || !this.warningGain) return;
    this.ensureContext();

    if (active === this.isWarningActive) return;
    this.isWarningActive = active;

    const now = this.ctx.currentTime;
    if (active) {
      this.warningGain.gain.setValueAtTime(0.15, now);
    } else {
      this.warningGain.gain.setTargetAtTime(0.0001, now, 0.05);
    }
  }

  public setStallWarning(active: boolean): void {
    if (!this.ctx || this.isMuted || !this.stallGain) return;
    this.ensureContext();

    if (active === this.isStallActive) return;
    this.isStallActive = active;

    const now = this.ctx.currentTime;
    if (active) {
      this.stallGain.gain.setValueAtTime(0.18, now);
    } else {
      this.stallGain.gain.setTargetAtTime(0.0001, now, 0.05);
    }
  }

  public updateEngineSound(n2RpmPercent: number, afterburner: boolean): void {
    this.updateEngine(n2RpmPercent, n2RpmPercent / 100, afterburner);
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.7, this.ctx.currentTime);
    }
  }

  public isAudioMuted(): boolean {
    return this.isMuted;
  }
}

export const cockpitAudio = new CockpitAudioSynthesizer();
