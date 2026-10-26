import Phaser from "phaser";
import type { LevelContent } from "../../content/types";
import { loadLevelContent } from "../../content/loadLevelContent";
import { LevelProgress } from "../../core/LevelProgress";
import { KeyboardInput } from "../../input/KeyboardInput";
import type { InputSource } from "../../input/InputSource";
import { AudioService } from "../../audio/AudioService";
import { SpringWorld } from "../world/SpringWorld";
import { GameHud } from "../../ui/GameHud";
import { ScreenOverlays } from "../../ui/ScreenOverlays";
import { PhrasePuzzlePanel } from "../../ui/PhrasePuzzlePanel";

type PresentationMode = "intro" | "playing" | "puzzle" | "paused" | "restoring" | "restored" | "completed" | "failed";
type ResumableMode = "playing" | "puzzle" | "restored";

/** 场景装配与流程转场。重试/回忆额度在纯规则层，世界对象和天气在 SpringWorld。 */
export class LevelScene extends Phaser.Scene {
  private content!: LevelContent;
  private progress!: LevelProgress;
  private inputSource!: InputSource;
  private audio!: AudioService;
  private world!: SpringWorld;
  private hud!: GameHud;
  private overlays!: ScreenOverlays;
  private puzzle?: PhrasePuzzlePanel;
  private mode: PresentationMode = "intro";
  private resumeMode: ResumableMode = "playing";
  private spawnArmed = true;
  private knownCorrectSlots: readonly boolean[] = [];
  private assetWarnings: string[] = [];
  private starting = false;
  /** 游戏窗口失去焦点时暂停，避免角色继续移动或声音继续播放。 */
  private readonly onBlur = (): void => this.pauseGame();
  /** 浏览器切换标签页或隐藏窗口时执行同样的暂停规则。 */
  private readonly onVisibility = (): void => { if (document.hidden) this.pauseGame(); };

  /** 注册玩法主场景；具体世界和本轮状态在 init / create 中初始化。 */
  constructor() { super("Level"); }
  /** 每次进入或重开关卡时清空流程状态、正确位置提示和音序器引用。 */
  init(data: { content: LevelContent; assetWarnings?: string[] }): void {
    this.content = data.content;
    this.assetWarnings = data.assetWarnings ?? [];
    this.mode = "intro"; this.resumeMode = "playing";
    this.starting = false;
    this.spawnArmed = true; this.knownCorrectSlots = []; this.puzzle = undefined;
  }

  /** 装配进度、输入、音频、春季世界与界面，并停在等待玩家点击的开场。 */
  create(): void {
    const level = this.content.level;
    this.physics.world.setBounds(0, 0, level.world.width, level.world.height);
    this.progress = new LevelProgress(level.fragments.map(fragment => fragment.id), level.puzzle.maxAttempts, level.puzzle.allowUnlimitedAttemptsAfterExhaustion);
    this.inputSource = new KeyboardInput();
    this.audio = new AudioService(this, this.content);
    this.world = new SpringWorld(this, this.content, id => this.collect(id), message => {
      if (this.mode === "playing") this.hud.notify(message);
    }, () => this.audio.playEffect("jump"));
    this.hud = new GameHud(this, level, () => this.pauseGame(), () => this.audio.toggleMute(), () => this.revealNotes(), () => this.openMemoryPoint());
    this.hud.refresh(this.progress); this.hud.setMuted(this.audio.isMuted); this.hud.setVisible(false);
    this.overlays = new ScreenOverlays(this);
    this.physics.pause();
    this.overlays.showIntro(level, () => this.startGame());
    this.input.keyboard?.on("keydown-ESC", this.onEscape, this);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  /** 探索时处理移动、F 显现、E 收集与返回起点；恢复春天后改为检查右侧出口。 */
  update(_time: number, delta: number): void {
    this.audio?.update(); this.hud?.update();
    if (this.audio && this.hud) this.hud.setAudioState(this.audio.isMuted, this.audio.isReady);
    if (this.mode !== "playing" && this.mode !== "restored") {
      this.inputSource?.reset(); this.world?.hideCollectionPrompt(); return;
    }
    const input = this.inputSource.sample();
    this.world.update(input, delta);
    if (this.mode === "restored") { if (this.world.atExit) this.finishExit(); return; }
    if (input.revealPressed) this.revealNotes();
    if (input.interactPressed) this.world.interactNearby();
    if (!this.world.inSpawn) this.spawnArmed = true;
    if (this.world.inSpawn && this.spawnArmed && this.progress.enterSpawnPoint()) {
      this.spawnArmed = false; this.openPuzzle();
    }
  }

  /** 开场按钮触发：确认浏览器已启用声音后开始探索，播放一次不扣回忆机会的清晰主题。 */
  private async startGame(): Promise<void> {
    if (this.starting) return;
    this.starting = true;
    const ready = await this.audio.start();
    this.starting = false;
    if (!this.sys.isActive()) return;
    if (!ready) {
      this.overlays.showIntro(this.content.level, () => { void this.startGame(); }, "声音尚未启用，请再次点击下方按钮开启声音并开始。");
      return;
    }
    this.overlays.close(); this.mode = "playing";
    this.inputSource.reset(); this.physics.resume(); this.hud.setVisible(true);
    // 开场清晰主题独立于答题用模糊记忆，不消耗三次答题提示。
    void this.audio.playSequence([this.content.level.puzzle.openingPhraseAudioKey]);
    if (this.assetWarnings.length) this.hud.notify(`部分素材加载失败：${this.assetWarnings.join("、")}`, 10000);
    else this.hud.notify(this.content.level.story.objective, 6500);
  }

  /** F 或 HUD 显现按钮触发：一次显现本轮所有声音罐，重复触发不重置收集。 */
  private revealNotes(): void {
    if (this.mode !== "playing" || !this.progress.revealFragments()) return;
    this.world.revealAll(); this.world.player.playInteraction(); this.audio.playEffect("reveal"); this.hud.refresh(this.progress);
    this.hud.notify("本轮四个声音罐已显现。靠近玻璃瓶，看到“按 E 收集”后按 E。", 5000);
  }

  /** E 交互选中附近瓶子后登记收集，播放动作与音效；集齐四个后点亮左侧回忆点。 */
  private collect(id: string): void {
    if (this.mode !== "playing") return;
    if (!this.progress.fragmentsRevealed) { this.hud.notify("自然的声音还隐藏着，先按 F 显现音符。"); return; }
    if (!this.progress.collect(id)) return;
    this.world.collect(id); this.world.player.playInteraction(); this.audio.playEffect("collect"); this.hud.refresh(this.progress);
    const label = this.content.level.fragments.find(fragment => fragment.id === id)!.label;
    if (this.progress.allCollected) {
      this.world.spawn.setReady(true);
      this.hud.notify("四只声音罐已装满。回到左侧回忆点，在四拍音序器里还原春天。", 6000);
    } else this.hud.notify(`已将「${label}」装入罐中  ·  ${this.progress.count} / ${this.progress.total}`);
  }

  /** HUD 回忆点按钮入口：必须集齐声音且站在出生点范围内，才允许打开音序器。 */
  private openMemoryPoint(): void {
    if (this.mode !== "playing") return;
    if (!this.progress.allCollected) { this.hud.notify("先按 F 显现并收集四个音符，再回到回忆点。"); return; }
    if (!this.world.inSpawn) { this.hud.notify("回忆点在地面左侧，回到魔法师苏醒的位置。"); return; }
    if (this.progress.enterSpawnPoint()) { this.spawnArmed = false; this.openPuzzle(); }
  }

  /** 进入排序：停止角色和物理，隐藏 HUD；本轮再次打开时沿用原排列与回忆额度。 */
  private openPuzzle(): void {
    this.mode = "puzzle"; this.world.player.stop(); this.inputSource.reset();
    this.physics.pause(); this.audio.stopPhrase(); this.hud.setVisible(false);
    if (this.puzzle) this.puzzle.setVisible(true);
    else this.puzzle = new PhrasePuzzlePanel(this, this.content, this.progress, this.audio, this.knownCorrectSlots,
      () => this.closePuzzle(), () => this.restoreSeason(), positions => this.failAttempt(positions));
  }

  /** 关闭排序回到探索；保留本轮排列和已用提示，须先离开起点再返回才自动重开。 */
  private closePuzzle(): void {
    this.audio.stopPhrase(); this.puzzle?.setVisible(false); this.progress.leaveArrangement();
    this.mode = "playing"; this.inputSource.reset(); this.physics.resume();
    this.hud.refresh(this.progress); this.hud.setVisible(true);
    this.hud.notify("本轮排列和已用回忆均已保留，离开起点再回来可继续还原。", 4500);
  }

  /** 错误提交入口：扣一次尝试、记录正确槽位并隐藏复位所有瓶子；耗尽三次则显示失败界面。 */
  private failAttempt(correctPositions: readonly boolean[]): void {
    if (!this.progress.failArrangement()) return;
    this.knownCorrectSlots = correctPositions;
    this.puzzle?.destroy(); this.puzzle = undefined;
    this.world.resetAll(); this.world.environment.showMistake(); this.audio.playEffect("incorrect");
    this.inputSource.reset(); this.hud.refresh(this.progress); this.spawnArmed = false;
    if (this.progress.phase === "failed") {
      this.mode = "failed"; this.physics.pause(); this.hud.setVisible(false);
      this.overlays.showFailure(() => this.restartLevel());
    } else {
      this.mode = "playing"; this.physics.resume(); this.hud.setVisible(true);
      this.hud.notify(`还原失败，剩余 ${this.progress.attemptsRemaining} 次尝试。音符已复位隐藏，请重新按 F 并收集。`, 7000);
    }
  }

  /** 正确提交入口：播放独立的恢复乐句和春季解冻演出，演出结束后开放出口并恢复行走。 */
  private restoreSeason(): void {
    if (!this.progress.complete(true)) return;
    this.mode = "restoring"; this.puzzle?.destroy(); this.puzzle = undefined;
    this.audio.playEffect("weatherRestore");
    void this.audio.playSequence([this.content.level.puzzle.restoredPhraseAudioKey]);
    this.world.spawn.setReady(false); this.hud.refresh(this.progress); this.hud.setVisible(true);
    this.hud.notify(this.content.level.story.restored, 9000);
    this.world.environment.restore(() => {
      this.mode = "restored"; this.physics.resume(); this.inputSource.reset();
    });
  }

  /** 恢复春天后走过右侧出口才显示本关完成；不是在答案正确的一刻立即切关。 */
  private finishExit(): void {
    this.mode = "completed"; this.world.player.stop(); this.physics.pause(); this.hud.setVisible(false);
    this.overlays.showComplete(this.content.level.title, () => this.restartLevel(), this.content.level.nextLevelId, () => { void this.goToNextLevel(); });
  }

  /** Esc、暂停按钮或窗口失焦时暂停；记住之前在探索、排序还是恢复后的行走状态。 */
  private pauseGame(): void {
    if (this.mode !== "playing" && this.mode !== "puzzle" && this.mode !== "restored") return;
    this.resumeMode = this.mode; this.mode = "paused"; this.inputSource.reset();
    this.physics.pause(); this.audio.pause(); this.puzzle?.setVisible(false); this.hud.setVisible(false);
    this.overlays.showPause(() => this.resumeGame(), () => this.restartLevel(), () => this.audio.toggleMute(), this.audio.isMuted);
  }

  /** 继续游戏：恢复之前的界面、输入和音频；排序界面仍保持物理暂停。 */
  private resumeGame(): void {
    this.overlays.close(); this.mode = this.resumeMode; this.inputSource.reset(); this.audio.resume();
    this.hud.setMuted(this.audio.isMuted); this.hud.refresh(this.progress);
    if (this.mode === "puzzle") this.puzzle?.setVisible(true);
    else { this.physics.resume(); this.hud.setVisible(true); }
  }

  /** Esc 的统一分发：暂停中继续、排序中关闭音序器，其他可操作阶段打开暂停界面。 */
  private onEscape(event: KeyboardEvent): void {
    if (event.repeat) return;
    if (this.mode === "paused") this.resumeGame();
    else if (this.mode === "puzzle") this.closePuzzle();
    else this.pauseGame();
  }

  /** 完成界面的下一关入口：按 nextLevelId 读取新关卡；读取失败时显示明确错误。 */
  private async goToNextLevel(): Promise<void> {
    const id = this.content.level.nextLevelId;
    if (!id) return;
    try { const content = await loadLevelContent(id); this.scene.start("Boot", { content }); }
    catch (error) { window.alert(`下一关暂时无法读取：${error instanceof Error ? error.message : String(error)}`); }
  }

  /** 从暂停、失败或完成界面重开本关，重建进度以恢复三次尝试与开场主题。 */
  private restartLevel(): void { this.scene.restart({ content: this.content, assetWarnings: this.assetWarnings }); }
  /** 离开或重开关卡时解绑输入/失焦事件，并清理旧面板和音频，防止跨关重复触发。 */
  private shutdown(): void {
    window.removeEventListener("blur", this.onBlur); document.removeEventListener("visibilitychange", this.onVisibility);
    this.input.keyboard?.off("keydown-ESC", this.onEscape, this); this.inputSource.destroy();
    this.puzzle?.destroy(); this.puzzle = undefined;
    this.audio.destroy(); this.sound.stopAll(); this.overlays.close();
  }
}
