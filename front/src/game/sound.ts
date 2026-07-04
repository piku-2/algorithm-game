/**
 * 効果音・BGM(WebAudio で合成、音声ファイル不使用)。
 * ブラウザの自動再生制限のため、AudioContext は最初のユーザー操作時に生成する。
 */

const SFX_KEY = 'algorithm-game-sfx';
const BGM_KEY = 'algorithm-game-bgm';

class SoundManager {
  private ctx: AudioContext | null = null;
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  sfxEnabled = localStorage.getItem(SFX_KEY) !== 'off';
  bgmEnabled = localStorage.getItem(BGM_KEY) === 'on';

  private context(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private tone(freq: number, duration: number, type: OscillatorType, volume: number, when = 0) {
    const ctx = this.context();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t = ctx.currentTime + when;
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  }

  private sfx(fn: () => void) {
    if (!this.sfxEnabled) return;
    try {
      fn();
    } catch {
      // AudioContext が使えない環境では黙って無効化
      this.sfxEnabled = false;
    }
  }

  move() {
    this.sfx(() => this.tone(440, 0.08, 'square', 0.05));
  }

  turn() {
    this.sfx(() => this.tone(330, 0.08, 'triangle', 0.05));
  }

  crash() {
    this.sfx(() => {
      this.tone(110, 0.3, 'sawtooth', 0.12);
      this.tone(92, 0.3, 'sawtooth', 0.12, 0.05);
    });
  }

  goal() {
    this.sfx(() => {
      // ファンファーレ: ドミソド
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) => this.tone(f, 0.18, 'square', 0.08, i * 0.12));
    });
  }

  toggleSfx(): boolean {
    this.sfxEnabled = !this.sfxEnabled;
    localStorage.setItem(SFX_KEY, this.sfxEnabled ? 'on' : 'off');
    return this.sfxEnabled;
  }

  toggleBgm(): boolean {
    this.bgmEnabled = !this.bgmEnabled;
    localStorage.setItem(BGM_KEY, this.bgmEnabled ? 'on' : 'off');
    if (this.bgmEnabled) this.startBgm();
    else this.stopBgm();
    return this.bgmEnabled;
  }

  startBgm() {
    if (!this.bgmEnabled || this.bgmTimer !== null) return;
    try {
      this.context();
    } catch {
      this.bgmEnabled = false;
      return;
    }
    // のんびりした8音ループ
    const melody = [392, 440, 523, 440, 392, 330, 349, 330];
    this.bgmTimer = window.setInterval(() => {
      const f = melody[this.bgmStep % melody.length];
      this.tone(f, 0.35, 'sine', 0.03);
      this.bgmStep++;
    }, 400);
  }

  stopBgm() {
    if (this.bgmTimer !== null) {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
}

export const sound = new SoundManager();
