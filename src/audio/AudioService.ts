import Phaser from "phaser";
import type { LevelContent } from "../content/types";
import { assetKey } from "../content/loadLevelContent";
import { sequenceOffsets } from "../core/melodyTiming";
import type { MelodyTiming } from "../core/melodyTiming";
import { BrowserAudioGate } from "./BrowserAudioGate";

/** 所有声音通过这里播放。乐句使用 Web Audio 时钟排程，不依赖渲染帧率或 setTimeout。 */
export class AudioService {
  private background?: Phaser.Sound.BaseSound;
  private sources: AudioBufferSourceNode[] = [];
  private sequenceGain?: GainNode;
  private sequenceStarts: number[] = [];
  private sequenceCallback?: (index: number | null) => void;
  private lastAudioClock = 0;
  private lastAudioAdvance = 0;
  private sequenceComplete?: (completed: boolean) => void;
  private lastSegment = -1;
  private generation = 0;
  private muted = false;
  private fallbackSound?: Phaser.Sound.BaseSound;
  private readonly gate: BrowserAudioGate;
  private paused = false;
  private destroyed = false;

  /** 建立本关统一音频服务，沿用静音设置，并绑定浏览器原生输入解锁。 */
  constructor(private readonly scene: Phaser.Scene, private readonly content: LevelContent) {
    this.muted = scene.sound.mute;
    this.gate = new BrowserAudioGate(this.manager?.context ?? null);
  }

  /** 当前是否主动静音，供 HUD 和暂停界面的声音开关显示。 */
  get isMuted(): boolean { return this.muted; }
  /** 浏览器声音上下文是否真正运行；尚未启用时不应显示成已经正常出声。 */
  get isReady(): boolean { return !this.manager || this.manager.context.state === "running"; }
  /** 是否存在正在演奏的乐句声源，背景音与短音效不计入。 */
  get isPlayingPhrase(): boolean { return this.sources.length > 0 || !!this.fallbackSound; }
  private get manager(): Phaser.Sound.WebAudioSoundManager | null {
    return this.scene.sound instanceof Phaser.Sound.WebAudioSoundManager ? this.scene.sound : null;
  }

  /** 开场真实点击触发：等待浏览器允许播放后启动循环背景音；失败时返回 false 供开场重试。 */
  async start(): Promise<boolean> {
    if (!await this.gate.ensureReady() || this.destroyed || this.paused) return false;
    if (!this.background && this.exists("bgm")) {
      const background = this.scene.sound.add(this.key("bgm"), { loop: true, volume: this.volume("bgm") });
      if (!background.play()) { background.destroy(); return false; }
      this.background = background;
    }
    return true;
  }

  /** 播放跳跃、显现、收集、放罐等短音效；解锁失败或游戏已暂停/销毁时不补播。 */
  playEffect(name: string): void {
    if (!this.exists(name)) return;
    void this.gate.ensureReady().then(ready => {
      if (ready && !this.paused && !this.destroyed) this.scene.sound.play(this.key(name), { volume: this.volume(name) });
    });
  }

  /** 切换所有背景、音效和乐句的静音；未启用时第一次点击优先请求浏览器开启声音。 */
  toggleMute(): boolean {
    // 尚未启用时第一次点击只解锁，不把“声音：开”意外切成静音。
    if (!this.isReady && !this.muted) {
      if (this.paused) void this.gate.ensureReady();
      else this.resume();
      return this.muted;
    }
    this.muted = !this.muted;
    this.scene.sound.mute = this.muted;
    if (this.sequenceGain) this.sequenceGain.gain.value = this.muted ? 0 : 1;
    // 暂停菜单中取消静音不代表继续游戏，背景仍要等“继续”后再恢复。
    if (!this.muted && !this.paused) this.resume();
    return this.muted;
  }

  /** 互斥播放开场、模糊回忆、单罐或完整排列；成功解锁后才按 BPM/素材长度安排起音并返回 true。 */
  async playSequence(names: readonly string[], onSegment?: (index: number | null) => void, timing?: MelodyTiming, onComplete?: (completed: boolean) => void): Promise<boolean> {
    this.stopPhrase();
    if (!names.length || names.some(name => !this.exists(name))) return false;
    const generation = this.generation;
    if (!await this.gate.ensureReady() || generation !== this.generation || this.paused || this.destroyed) return false;
    this.sequenceCallback = onSegment;
    this.sequenceComplete = onComplete;
    this.duckBackground(true);
    const manager = this.manager;
    if (!manager) {
      this.playFallback(names, 0, generation);
      return true;
    }

    const context = manager.context;
    this.sequenceGain = context.createGain();
    this.sequenceGain.gain.value = this.muted ? 0 : 1;
    // 完整乐句和背景/音效走同一个主输出，统一接受 Phaser 的音量、静音控制。
    this.sequenceGain.connect(manager.destination);
    this.lastAudioClock = context.currentTime; this.lastAudioAdvance = performance.now();
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
      if (generation === this.generation) this.stopPhrase(true);
    };
    return true;
  }

  /** UI 高亮跟随音频时钟；画面暂停/掉帧不会影响音频片段衔接。 */
  update(): void {
    if (!this.sources.length || !this.manager) return;
    const now = this.manager.context.currentTime;
    // 某些内嵌浏览器虽然报告 running，实际音频时钟却可能停止；中止并解锁界面，不能算一次完整演奏。
    if (now > this.lastAudioClock) { this.lastAudioClock = now; this.lastAudioAdvance = performance.now(); }
    else if (performance.now() - this.lastAudioAdvance > 2000) { this.stopPhrase(); return; }
    let index = -1;
    this.sequenceStarts.forEach((start, candidate) => { if (now >= start) index = candidate; });
    if (index !== this.lastSegment) {
      this.lastSegment = index;
      this.sequenceCallback?.(index < 0 ? null : index);
    }
  }

  /** 停止旧乐句、回调和高亮，并让尚在等待解锁的旧请求失效；不返还回忆机会。 */
  stopPhrase(completed = false): void {
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
    const complete = this.sequenceComplete;
    this.sequenceComplete = undefined;
    complete?.(completed);
  }

  /** 暂停时立即停止乐句并暂停背景/音效，防止隐藏窗口继续播放。 */
  pause(): void { this.paused = true; this.stopPhrase(); this.scene.sound.pauseAll(); }
  /** 继续游戏或点击声音开关时重新启用浏览器音频，再恢复已暂停的背景/音效。 */
  resume(): void {
    this.paused = false;
    void this.gate.ensureReady().then(ready => {
      if (ready && !this.paused && !this.destroyed) this.scene.sound.resumeAll();
    });
  }
  /** 重开或离开关卡时清理音频解锁监听、旧乐句和背景，避免异步恢复后跨关发声。 */
  destroy(): void {
    this.destroyed = true; this.gate.destroy(); this.stopPhrase(); this.background?.destroy(); this.background = undefined;
  }

  /** 没有 Web Audio 时逐段使用 Phaser 声音播放；保留试听功能，但节拍精度取决于浏览器。 */
  private playFallback(names: readonly string[], index: number, generation: number): void {
    if (generation !== this.generation) return;
    if (index >= names.length) { this.stopPhrase(true); return; }
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

  /** 乐句试听时将背景压低到配置音量的 16%，结束后恢复，便于辨听旋律。 */
  private duckBackground(duck: boolean): void {
    if (this.background && "setVolume" in this.background) {
      (this.background as Phaser.Sound.WebAudioSound).setVolume(this.volume("bgm") * (duck ? 0.16 : 1));
    }
  }
  private key(name: string): string { return assetKey(this.content.level.id, name); }
  private volume(name: string): number { return this.content.assets.audio[name]?.volume ?? 0.5; }
  private exists(name: string): boolean { return this.scene.cache.audio.exists(this.key(name)); }
}
