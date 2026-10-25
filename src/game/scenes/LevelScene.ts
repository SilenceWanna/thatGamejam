import Phaser from "phaser";
import type { LevelContent } from "../../content/types";
import { loadLevelContent } from "../../content/loadLevelContent";
import { LevelProgress } from "../../core/LevelProgress";
import { KeyboardInput } from "../../input/KeyboardInput";
import type { InputSource } from "../../input/InputSource";
import { AudioService } from "../../audio/AudioService";
import { createForestBackdrop } from "../art/ForestBackdrop";
import { createTerrain } from "../world/createTerrain";
import { PhraseCollectible } from "../world/PhraseCollectible";
import { SpawnPointView } from "../world/SpawnPointView";
import { PlayerActor } from "../player/PlayerActor";
import { GameHud } from "../../ui/GameHud";
import { ScreenOverlays } from "../../ui/ScreenOverlays";
import { PhrasePuzzlePanel } from "../../ui/PhrasePuzzlePanel";

type PresentationMode = "intro" | "playing" | "puzzle" | "paused" | "completed";

/** 场景只装配系统和转发事件；玩法状态、排列判定、声音和具体对象各自封装。 */
export class LevelScene extends Phaser.Scene {
  private content!: LevelContent;
  private progress!: LevelProgress;
  private inputSource!: InputSource;
  private audio!: AudioService;
  private player!: PlayerActor;
  private hud!: GameHud;
  private spawnView!: SpawnPointView;
  private overlays!: ScreenOverlays;
  private puzzle?: PhrasePuzzlePanel;
  private mode: PresentationMode = "intro";
  private resumeMode: "playing" | "puzzle" = "playing";
  private spawnArmed = true;
  private assetWarnings: string[] = [];
  private readonly onBlur = (): void => { this.pauseGame(); };
  private readonly onVisibility = (): void => { if (document.hidden) this.pauseGame(); };

  constructor() { super("Level"); }

  init(data: { content: LevelContent; assetWarnings?: string[] }): void {
    this.content = data.content;
    this.assetWarnings = data.assetWarnings ?? [];
    this.mode = "intro";
    this.resumeMode = "playing";
    this.spawnArmed = true;
    this.puzzle = undefined;
  }

  create(): void {
    const level = this.content.level;
    this.physics.world.setBounds(0, 0, level.world.width, level.world.height);
    this.progress = new LevelProgress(level.fragments.map(fragment => fragment.id));
    this.inputSource = new KeyboardInput();
    this.audio = new AudioService(this, this.content);
    createForestBackdrop(this, this.content);
    const terrain = createTerrain(this, this.content);
    this.spawnView = new SpawnPointView(this, this.content);
    this.player = new PlayerActor(this, this.content, () => this.audio.playEffect("jump"));
    this.physics.add.collider(this.player.collision, terrain.ground);
    this.physics.add.collider(this.player.collision, terrain.platforms, undefined, (_actor, surface) => {
      const platform = (surface as Phaser.GameObjects.Rectangle).body as Phaser.Physics.Arcade.StaticBody;
      return this.player.body.velocity.y >= 0 && this.player.body.prev.y + this.player.body.height <= platform.top + 4;
    });
    for (const definition of level.fragments) {
      const collectible = new PhraseCollectible(this, this.content, definition);
      this.physics.add.overlap(this.player.collision, collectible.trigger, () => {
        if (this.mode !== "playing" || !this.progress.collect(definition.id)) return;
        collectible.collect();
        this.audio.playEffect("collect");
        this.hud.refresh(this.progress);
        if (this.progress.allCollected) {
          this.spawnView.setReady(true);
          this.hud.notify("四段声音都找到了！回到左侧的旋律起点。", 5000);
        } else this.hud.notify(`找到了「${definition.label}」  ·  ${this.progress.count} / ${this.progress.total}`);
      });
    }
    this.hud = new GameHud(this, level, () => this.pauseGame(), () => this.audio.toggleMute(), level.puzzle.allowReferencePlayback ? () => {
      this.audio.start();
      this.audio.playSequence([level.puzzle.fullPhraseAudioKey]);
      this.hud.notify("正在聆听完整乐句…");
    } : undefined);
    this.hud.refresh(this.progress);
    this.hud.setMuted(this.audio.isMuted);
    this.hud.setVisible(false);
    this.overlays = new ScreenOverlays(this);
    this.physics.pause();
    this.overlays.showIntro(() => this.startGame());
    this.input.keyboard?.on("keydown-ESC", this.onEscape, this);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  update(_time: number, delta: number): void {
    this.audio?.update();
    this.hud?.update();
    if (this.mode !== "playing") { this.inputSource?.reset(); return; }
    this.player.update(this.inputSource.sample(), delta);
    // 地面封闭，仍保留越界恢复，方便之后增加深坑或调整关卡。
    if (this.player.feetY > this.content.level.world.height + 100) this.player.resetToSpawn();
    const spawn = this.content.level.spawn;
    const inside = Math.abs(this.player.x - spawn.x) < spawn.activationRadius && Math.abs(this.player.feetY - spawn.feetY) < 10;
    if (!inside) this.spawnArmed = true;
    if (inside && this.spawnArmed && this.player.grounded && this.progress.enterSpawnPoint()) {
      this.spawnArmed = false;
      this.openPuzzle();
    }
  }

  private startGame(): void {
    this.overlays.close();
    this.mode = "playing";
    this.inputSource.reset();
    this.audio.start();
    this.physics.resume();
    this.hud.setVisible(true);
    if (this.assetWarnings.length) this.hud.notify(`部分素材加载失败，已使用占位表现：${this.assetWarnings.join("、")}`, 10000);
    else this.hud.notify("先从两侧的平台出发，寻找最高处的声音。", 4500);
  }

  private openPuzzle(): void {
    this.mode = "puzzle";
    this.player.stop();
    this.inputSource.reset();
    this.physics.pause();
    this.audio.stopPhrase();
    this.hud.setVisible(false);
    if (this.puzzle) this.puzzle.setVisible(true);
    else this.puzzle = new PhrasePuzzlePanel(this, this.content.level, this.audio, () => this.closePuzzle(), () => this.completeLevel());
  }

  private closePuzzle(): void {
    this.audio.stopPhrase();
    this.puzzle?.setVisible(false);
    this.progress.leaveArrangement();
    this.mode = "playing";
    this.inputSource.reset();
    this.physics.resume();
    this.hud.setVisible(true);
    this.hud.notify("离开起点后再走回来，即可继续排列。", 4000);
  }

  private pauseGame(): void {
    if (this.mode !== "playing" && this.mode !== "puzzle") return;
    this.resumeMode = this.mode;
    this.mode = "paused";
    this.inputSource.reset();
    this.physics.pause();
    this.audio.pause();
    this.puzzle?.setVisible(false);
    this.hud.setVisible(false);
    this.overlays.showPause(() => this.resumeGame(), () => this.restartLevel(), () => this.audio.toggleMute(), this.audio.isMuted);
  }

  private resumeGame(): void {
    this.overlays.close();
    this.mode = this.resumeMode;
    this.inputSource.reset();
    this.audio.resume();
    this.hud.setMuted(this.audio.isMuted);
    if (this.mode === "playing") { this.physics.resume(); this.hud.setVisible(true); }
    else this.puzzle?.setVisible(true);
  }

  private onEscape(event: KeyboardEvent): void {
    if (event.repeat) return;
    if (this.mode === "paused") this.resumeGame();
    else if (this.mode === "puzzle") this.closePuzzle();
    else this.pauseGame();
  }

  private completeLevel(): void {
    if (!this.progress.complete(true)) return;
    this.mode = "completed";
    this.puzzle?.destroy();
    this.puzzle = undefined;
    this.audio.playEffect("success");
    this.time.delayedCall(700, () => this.audio.playSequence([this.content.level.puzzle.fullPhraseAudioKey]));
    const level = this.content.level;
    this.overlays.showComplete(level.title, () => this.restartLevel(), level.nextLevelId, () => { void this.goToNextLevel(); });
  }

  private async goToNextLevel(): Promise<void> {
    const id = this.content.level.nextLevelId;
    if (!id) return;
    try { const content = await loadLevelContent(id); this.scene.start("Boot", { content }); }
    catch (error) { window.alert(`下一关暂时无法读取：${error instanceof Error ? error.message : String(error)}`); }
  }

  private restartLevel(): void { this.scene.restart({ content: this.content, assetWarnings: this.assetWarnings }); }

  private shutdown(): void {
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.input.keyboard?.off("keydown-ESC", this.onEscape, this);
    this.inputSource.destroy();
    this.puzzle?.destroy();
    this.puzzle = undefined;
    this.audio.destroy();
    this.sound.stopAll();
    this.overlays.close();
  }
}
