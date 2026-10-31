import Phaser from "phaser";
import type { LevelContent } from "../../content/types";
import { LevelProgress } from "../../core/LevelProgress";
import { KeyboardInput } from "../../input/KeyboardInput";
import type { InputSource } from "../../input/InputSource";
import { AudioService } from "../../audio/AudioService";
import { SpringWorld } from "../world/SpringWorld";
import { LiveMusicPanel } from "../../ui/LiveMusicPanel";
import { installDebugControls } from "../../debug/DebugControls";

/** 装配关卡，连接纯玩法状态、场景交互与常驻界面。 */
export class LevelScene extends Phaser.Scene {
  private content!: LevelContent;
  private progress!: LevelProgress;
  private inputSource!: InputSource;
  private audio!: AudioService;
  private world!: SpringWorld;
  private panel!: LiveMusicPanel;
  private audioStarted = false;
  private audioStarting = false;
  private audioUiUsed = false;
  /** 在真实输入事件中启用声音；若浏览器拒绝，下一次输入继续重试。 */
  private readonly onGesture = (): void => {
    if (this.audioStarted || this.audioStarting) return;
    this.audioStarting = true;
    void this.audio.start().then(ready => {
      this.audioStarting = false;
      if (!ready || !this.sys.isActive()) return;
      this.audioStarted = true;
      // 让同一次点击先交给按钮，避免开场乐句抢占用户点选的提示。
      this.time.delayedCall(100, () => {
        if (this.sys.isActive() && !this.audioUiUsed && !this.audio.isPlayingPhrase) {
          void this.audio.playSequence([this.content.level.puzzle.openingPhraseAudioKey]);
        }
      });
    });
  };
  /** 切换窗口时停止移动和声音；重新聚焦后允许继续。 */
  private readonly onBlur = (): void => { this.inputSource.reset(); this.world.player.stop(); this.audio.pause(); };
  private readonly onFocus = (): void => { this.audio.resume(); };
  constructor() { super("Level"); }
  init(data: { content: LevelContent }): void { this.content = data.content; this.audioStarted = false; this.audioStarting = false; this.audioUiUsed = false; }
  /** 进入关卡立即显示画面和界面；首次真实输入解锁浏览器音频并播放清晰开场。 */
  create(): void {
    const level = this.content.level;
    this.physics.world.setBounds(0, 0, level.world.width, level.world.height);
    this.progress = new LevelProgress(level.fragments.map(fragment => fragment.id), level.puzzle.maxAttempts, level.puzzle.maxReferences);
    this.inputSource = new KeyboardInput(); this.audio = new AudioService(this, this.content);
    this.world = new SpringWorld(this, this.content, id => this.collect(id), () => this.audio.playEffect("jump"));
    this.panel = new LiveMusicPanel(this, this.content, this.progress, this.audio, correct => this.result(correct),
      () => { this.audioUiUsed = true; });
    installDebugControls(this, () => this.scene.restart({ content: this.content }));
    document.addEventListener("pointerdown", this.onGesture, true); document.addEventListener("keydown", this.onGesture, true);
    window.addEventListener("blur", this.onBlur); window.addEventListener("focus", this.onFocus);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }
  /** A/D、空格持续控制角色；F 显现、E 收集与常驻 UI 可同时使用。 */
  update(_time: number, delta: number): void {
    this.audio?.update();
    const input = this.inputSource.sample(); this.world.update(input, delta);
    if (input.revealPressed && this.progress.revealFragments()) {
      this.world.revealAll(); this.world.player.playInteraction(); this.audio.playEffect("reveal");
    }
    if (input.interactPressed) this.world.interactNearby();
  }
  /** 只在规则允许时收集；播放对应乐段，并更新左下声音库。 */
  private collect(id: string): void {
    if (!this.progress.collect(id)) return;
    this.world.collect(id); this.world.player.playInteraction();
    const fragment = this.content.level.fragments.find(item => item.id === id);
    if (fragment) this.audio.playEffect(fragment.audioKey);
    this.panel.refresh();
  }
  /** 演奏完成后的自动判定：正确恢复春天，错误保留收集与当前排列。 */
  private result(correct: boolean): void {
    if (correct) {
      this.world.environment.restore(); this.audio.playEffect("weatherRestore");
      void this.audio.playSequence([this.content.level.puzzle.restoredPhraseAudioKey]);
    } else this.audio.playEffect("incorrect");
  }
  /** 重开时清理旧音频、交互事件和面板。 */
  private shutdown(): void {
    document.removeEventListener("pointerdown", this.onGesture, true); document.removeEventListener("keydown", this.onGesture, true);
    window.removeEventListener("blur", this.onBlur); window.removeEventListener("focus", this.onFocus);
    this.inputSource.destroy(); this.panel.destroy(); this.audio.destroy(); this.sound.stopAll();
  }
}
