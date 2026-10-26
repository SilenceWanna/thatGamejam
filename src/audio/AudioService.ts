import Phaser from "phaser";
import type { LevelContent } from "../content/types";
import { assetKey } from "../content/loadLevelContent";
import { sequenceOffsets } from "../core/melodyTiming";
import type { MelodyTiming } from "../core/melodyTiming";

/** 所有声音通过这里播放。乐句使用 Web Audio 时钟排程，不依赖渲染帧率或 setTimeout。 */
export class AudioService {
  private background?: Phaser.Sound.BaseSound;
  private sources: AudioBufferSourceNode[] = [];
  private sequenceGain?: GainNode;
  private sequenceStarts: number[] = [];
  private sequenceCallback?: (index: number | null) => void;
  private lastSegment = -1;
  private generation = 0;
  private muted = false;
  private fallbackSound?: Phaser.Sound.BaseSound;

  constructor(private readonly scene: Phaser.Scene, private readonly content: LevelContent) {
    this.muted = scene.sound.mute;
  }

  get isMuted(): boolean { return this.muted; }
  get isPlayingPhrase(): boolean { return this.sources.length > 0 || !!this.fallbackSound; }
  private get manager(): Phaser.Sound.WebAudioSoundManager | null {
    return this.scene.sound instanceof Phaser.Sound.WebAudioSoundManager ? this.scene.sound : null;
  }

  start(): void {
    void this.manager?.context.resume();
    if (!this.background && this.exists("bgm")) {
      this.background = this.scene.sound.add(this.key("bgm"), { loop: true, volume: this.volume("bgm") });
      this.background.play();
    }
  }

  playEffect(name: string): void {
    if (this.exists(name)) this.scene.sound.play(this.key(name), { volume: this.volume(name) });
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    this.scene.sound.mute = this.muted;
    if (this.sequenceGain) this.sequenceGain.gain.value = this.muted ? 0 : 1;
    return this.muted;
  }

  playSequence(names: readonly string[], onSegment?: (index: number | null) => void, timing?: MelodyTiming): boolean {
    this.stopPhrase();
    if (!names.length || names.some(name => !this.exists(name))) return false;
    this.sequenceCallback = onSegment;
    this.duckBackground(true);
    const generation = this.generation;
    const manager = this.manager;
    if (!manager) {
      this.playFallback(names, 0, generation);
      return true;
    }

    const context = manager.context;
    void context.resume();
    this.sequenceGain = context.createGain();
    this.sequenceGain.gain.value = this.muted ? 0 : 1;
    this.sequenceGain.connect(context.destination);
    const baseTime = context.currentTime + 0.035;
    const offsets = timing ? sequenceOffsets(names.length, timing) : null;
    let nextStart = baseTime;
    let endTime = baseTime;
    for (const [index, name] of names.entries()) {
      const startTime = offsets ? baseTime + offsets[index] : nextStart;
      const source = context.createBufferSource();
      const volume = context.createGain();
      source.buffer = this.scene.cache.audio.get(this.key(name)) as AudioBuffer;
      volume.gain.value = this.volume(name);
      source.connect(volume);
      volume.connect(this.sequenceGain);
      this.sequenceStarts.push(startTime);
      source.start(startTime);
      this.sources.push(source);
      nextStart = startTime + source.buffer.duration;
      endTime = Math.max(endTime, nextStart);
    }
    // 静音时钟等待所有尾音结束，短采样或重叠尾音都不会改变固定拍点。
    const clock = context.createBufferSource();
    clock.buffer = context.createBuffer(1, Math.max(1, Math.ceil((endTime - baseTime) * context.sampleRate)), context.sampleRate);
    clock.connect(this.sequenceGain);
    clock.start(baseTime);
    this.sources.push(clock);
    clock.onended = () => {
      if (generation === this.generation) this.stopPhrase();
    };
    return true;
  }

  /** UI 高亮跟随音频时钟；画面暂停/掉帧不会影响音频片段衔接。 */
  update(): void {
    if (!this.sources.length || !this.manager) return;
    const now = this.manager.context.currentTime;
    let index = -1;
    this.sequenceStarts.forEach((start, candidate) => { if (now >= start) index = candidate; });
    if (index !== this.lastSegment) {
      this.lastSegment = index;
      this.sequenceCallback?.(index < 0 ? null : index);
    }
  }

  stopPhrase(): void {
    this.generation++;
    for (const source of this.sources) {
      source.onended = null;
      try { source.stop(); } catch { /* 已自然结束的声源无需再次停止。 */ }
      source.disconnect();
    }
    this.sources = [];
    this.sequenceStarts = [];
    this.sequenceGain?.disconnect();
    this.sequenceGain = undefined;
    this.fallbackSound?.destroy();
    this.fallbackSound = undefined;
    const callback = this.sequenceCallback;
    this.sequenceCallback = undefined;
    callback?.(null);
    this.lastSegment = -1;
    this.duckBackground(false);
  }

  pause(): void { this.stopPhrase(); this.scene.sound.pauseAll(); }
  resume(): void { this.scene.sound.resumeAll(); }
  destroy(): void { this.stopPhrase(); this.background?.destroy(); this.background = undefined; }

  private playFallback(names: readonly string[], index: number, generation: number): void {
    if (generation !== this.generation) return;
    if (index >= names.length) { this.stopPhrase(); return; }
    this.sequenceCallback?.(index);
    const sound = this.scene.sound.add(this.key(names[index]), { volume: this.volume(names[index]) });
    this.fallbackSound = sound;
    sound.once("complete", () => {
      sound.destroy();
      this.fallbackSound = undefined;
      this.playFallback(names, index + 1, generation);
    });
    sound.play();
  }

  private duckBackground(duck: boolean): void {
    if (this.background && "setVolume" in this.background) {
      (this.background as Phaser.Sound.WebAudioSound).setVolume(this.volume("bgm") * (duck ? 0.16 : 1));
    }
  }
  private key(name: string): string { return assetKey(this.content.level.id, name); }
  private volume(name: string): number { return this.content.assets.audio[name]?.volume ?? 0.5; }
  private exists(name: string): boolean { return this.scene.cache.audio.exists(this.key(name)); }
}
