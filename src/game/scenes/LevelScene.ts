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
  private readonly onBlur = (): void => this.pauseGame();
  private readonly onVisibility = (): void => { if (document.hidden) this.pauseGame(); };

  constructor() { super("Level"); }
  init(data: { content: LevelContent; assetWarnings?: string[] }): void {
    this.content = data.content;
    this.assetWarnings = data.assetWarnings ?? [];
    this.mode = "intro"; this.resumeMode = "playing";
    this.spawnArmed = true; this.knownCorrectSlots = []; this.puzzle = undefined;
  }

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

  update(_time: number, delta: number): void {
    this.audio?.update(); this.hud?.update();
    if (this.mode !== "playing" && this.mode !== "restored") { this.inputSource?.reset(); return; }
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

  private startGame(): void {
    this.overlays.close(); this.mode = "playing";
    this.inputSource.reset(); this.audio.start(); this.physics.resume(); this.hud.setVisible(true);
    // 开场清晰主题独立于答题用模糊记忆，不消耗三次答题提示。
    this.audio.playSequence([this.content.level.puzzle.openingPhraseAudioKey]);
    if (this.assetWarnings.length) this.hud.notify(`部分素材加载失败：${this.assetWarnings.join("、")}`, 10000);
    else this.hud.notify(this.content.level.story.objective, 6500);
  }

  private revealNotes(): void {
    if (this.mode !== "playing" || !this.progress.revealFragments()) return;
    this.world.revealAll(); this.world.player.playInteraction(); this.audio.playEffect("reveal"); this.hud.refresh(this.progress);
    this.hud.notify("本轮四个音符已显现，接触音符或靠近按 E / 点击，将声音装入罐中。", 5000);
  }

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

  private openMemoryPoint(): void {
    if (this.mode !== "playing") return;
    if (!this.progress.allCollected) { this.hud.notify("先按 F 显现并收集四个音符，再回到回忆点。"); return; }
    if (!this.world.inSpawn) { this.hud.notify("回忆点在地面左侧，回到魔法师苏醒的位置。"); return; }
    if (this.progress.enterSpawnPoint()) { this.spawnArmed = false; this.openPuzzle(); }
  }

  private openPuzzle(): void {
    this.mode = "puzzle"; this.world.player.stop(); this.inputSource.reset();
    this.physics.pause(); this.audio.stopPhrase(); this.hud.setVisible(false);
    if (this.puzzle) this.puzzle.setVisible(true);
    else this.puzzle = new PhrasePuzzlePanel(this, this.content, this.progress, this.audio, this.knownCorrectSlots,
      () => this.closePuzzle(), () => this.restoreSeason(), positions => this.failAttempt(positions));
  }

  private closePuzzle(): void {
    this.audio.stopPhrase(); this.puzzle?.setVisible(false); this.progress.leaveArrangement();
    this.mode = "playing"; this.inputSource.reset(); this.physics.resume();
    this.hud.refresh(this.progress); this.hud.setVisible(true);
    this.hud.notify("本轮排列和已用回忆均已保留，离开起点再回来可继续还原。", 4500);
  }

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

  private restoreSeason(): void {
    if (!this.progress.complete(true)) return;
    this.mode = "restoring"; this.puzzle?.destroy(); this.puzzle = undefined;
    this.audio.playEffect("weatherRestore");
    this.audio.playSequence([this.content.level.puzzle.restoredPhraseAudioKey]);
    this.world.spawn.setReady(false); this.hud.refresh(this.progress); this.hud.setVisible(true);
    this.hud.notify(this.content.level.story.restored, 9000);
    this.world.environment.restore(() => {
      this.mode = "restored"; this.physics.resume(); this.inputSource.reset();
    });
  }

  private finishExit(): void {
    this.mode = "completed"; this.world.player.stop(); this.physics.pause(); this.hud.setVisible(false);
    this.overlays.showComplete(this.content.level.title, () => this.restartLevel(), this.content.level.nextLevelId, () => { void this.goToNextLevel(); });
  }

  private pauseGame(): void {
    if (this.mode !== "playing" && this.mode !== "puzzle" && this.mode !== "restored") return;
    this.resumeMode = this.mode; this.mode = "paused"; this.inputSource.reset();
    this.physics.pause(); this.audio.pause(); this.puzzle?.setVisible(false); this.hud.setVisible(false);
    this.overlays.showPause(() => this.resumeGame(), () => this.restartLevel(), () => this.audio.toggleMute(), this.audio.isMuted);
  }

  private resumeGame(): void {
    this.overlays.close(); this.mode = this.resumeMode; this.inputSource.reset(); this.audio.resume();
    this.hud.setMuted(this.audio.isMuted); this.hud.refresh(this.progress);
    if (this.mode === "puzzle") this.puzzle?.setVisible(true);
    else { this.physics.resume(); this.hud.setVisible(true); }
  }

  private onEscape(event: KeyboardEvent): void {
    if (event.repeat) return;
    if (this.mode === "paused") this.resumeGame();
    else if (this.mode === "puzzle") this.closePuzzle();
    else this.pauseGame();
  }

  private async goToNextLevel(): Promise<void> {
    const id = this.content.level.nextLevelId;
    if (!id) return;
    try { const content = await loadLevelContent(id); this.scene.start("Boot", { content }); }
    catch (error) { window.alert(`下一关暂时无法读取：${error instanceof Error ? error.message : String(error)}`); }
  }

  private restartLevel(): void { this.scene.restart({ content: this.content, assetWarnings: this.assetWarnings }); }
  private shutdown(): void {
    window.removeEventListener("blur", this.onBlur); document.removeEventListener("visibilitychange", this.onVisibility);
    this.input.keyboard?.off("keydown-ESC", this.onEscape, this); this.inputSource.destroy();
    this.puzzle?.destroy(); this.puzzle = undefined;
    this.audio.destroy(); this.sound.stopAll(); this.overlays.close();
  }
}
