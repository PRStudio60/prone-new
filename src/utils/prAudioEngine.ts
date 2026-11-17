import { VideoCategoryId } from '../types/video';

const CATEGORY_FREQUENCIES: Record<VideoCategoryId, number[]> = {
  politics: [220, 277.18, 329.63, 440], // A major warm civic chord
  local: [196, 246.94, 293.66, 392], // G major acoustic warmth
  school: [261.63, 329.63, 392, 523.25], // C major bright clarity
  personal: [246.94, 293.66, 369.99, 493.88], // Bm7 calm studio tone
  business: [233.08, 293.66, 349.23, 466.16], // Bb major crisp SaaS tone
};

class PRAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private pulseTimer: number | null = null;
  private stepIndex = 0;
  private activeCategory: VideoCategoryId | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.2;
      this.masterGain.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  /**
   * Must be called inside a direct user interaction (click/keydown)
   * so browsers unlock AudioContext cleanly.
   */
  public unlock(): void {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
  }

  public startAmbient(category: VideoCategoryId, volume: number, muted: boolean): void {
    this.stopAmbient();
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }

    this.activeCategory = category;
    this.stepIndex = 0;
    this.updateGain(volume, muted);

    const playNote = () => {
      if (!this.ctx || !this.masterGain || !this.activeCategory) return;
      const notes = CATEGORY_FREQUENCIES[this.activeCategory];
      const freq = notes[this.stepIndex % notes.length];
      this.stepIndex += 1;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      env.gain.setValueAtTime(0.0001, now);
      env.gain.exponentialRampToValueAtTime(0.28, now + 0.08);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);

      osc.connect(env);
      env.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 1.4);
    };

    playNote();
    this.pulseTimer = window.setInterval(playNote, 1500);
  }

  public playCueChime(volume: number, muted: boolean): void {
    if (muted || volume <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(0.18 * Math.min(1, Math.max(0, volume)), now + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    osc.connect(env);
    env.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  public updateGain(volume: number, muted: boolean): void {
    if (!this.ctx || !this.masterGain) return;
    const target = muted ? 0 : Math.min(1, Math.max(0, volume)) * 0.25;
    this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.04);
  }

  public stopAmbient(): void {
    if (this.pulseTimer !== null) {
      window.clearInterval(this.pulseTimer);
      this.pulseTimer = null;
    }
    this.activeCategory = null;
  }

  public speakCaption(
    text: string,
    rate: number,
    volume: number,
    muted: boolean,
    enabled: boolean
  ): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (!enabled || muted || volume <= 0 || !text.trim()) return;

    // Strip leading timestamp like "00:15 — " before speaking
    const cleanText = text.replace(/^\d{2}:\d{2}\s*[—-]\s*/, '').trim();
    if (!cleanText) return;

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'ja-JP';
      utterance.rate = Math.min(1.6, Math.max(0.8, rate));
      utterance.volume = Math.min(1, Math.max(0, volume));
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore speech synthesis errors in restricted environments
    }
  }

  public stopSpeech(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
  }

  public stopAll(): void {
    this.stopAmbient();
    this.stopSpeech();
  }
}

export const prAudioEngine = new PRAudioEngine();
