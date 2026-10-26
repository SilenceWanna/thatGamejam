import Phaser from "phaser";
import type { LevelDefinition } from "../content/types";
import type { LevelProgress } from "../core/LevelProgress";
import { colorNumber, drawJar } from "../game/art/assetImages";
import { UiButton, uiText } from "./components";
import { AttemptIndicator } from "./AttemptIndicator";

export class GameHud {
  private readonly root: Phaser.GameObjects.Container;
  private readonly mission: Phaser.GameObjects.Text;
  private readonly progressLabel: Phaser.GameObjects.Text;
  private readonly fragmentMarks: Phaser.GameObjects.Graphics[] = [];
  private readonly message: Phaser.GameObjects.Text;
  private readonly mute: UiButton;
  private readonly reveal: UiButton;
  private readonly indicator: AttemptIndicator;
  private messageExpires = 0;

  /** 建立探索 HUD：任务、三颗回忆点、四只罐子、显现/回忆点按钮及暂停/声音开关。 */
  constructor(private readonly scene: Phaser.Scene, private readonly level: LevelDefinition, onPause: () => void,
    onMute: () => boolean, onReveal: () => void, onMemoryPoint: () => void) {
    const panel = scene.add.graphics();
    panel.fillStyle(0xf8f7ec, 0.9).fillRoundedRect(26, 24, 395, 130, 12);
    panel.lineStyle(1, 0xd1d7c1).strokeRoundedRect(26, 24, 395, 130, 12);
    const chapter = uiText(scene, 48, 40, `01   /   ${level.title}`, 19);
    this.mission = uiText(scene, 48, 78, "按 F，显现本轮隐藏的声音", 13, "#7c8974");
    this.indicator = new AttemptIndicator(scene, 55, 129);
    const progressPanel = scene.add.graphics();
    progressPanel.fillStyle(0xf8f7ec, 0.9).fillRoundedRect(850, 24, 245, 110, 12);
    progressPanel.lineStyle(1, 0xd1d7c1).strokeRoundedRect(850, 24, 245, 110, 12);
    this.progressLabel = uiText(scene, 870, 39, "声音罐   0 / 4", 13, "#6a7d66");
    this.root = scene.add.container(0, 0, [panel, chapter, this.mission, this.indicator.root, progressPanel, this.progressLabel]).setDepth(20);
    level.fragments.forEach((fragment, index) => {
      const x = 893 + index * 52;
      const mark = scene.add.graphics().setPosition(x, 86);
      this.fragmentMarks.push(mark);
      this.root.add([mark, uiText(scene, x, 119, fragment.label, 9, "#87927a").setOrigin(0.5)]);
    });
    const pause = new UiButton(scene, 1174, 47, 142, 40, "Ⅱ  暂停", onPause);
    this.mute = new UiButton(scene, 1174, 96, 142, 36, "声音：开", () => this.setMuted(onMute()));
    this.reveal = new UiButton(scene, 634, 47, 200, 40, "F  显现声音", onReveal);
    const memory = new UiButton(scene, 634, 96, 200, 36, "回忆点 · 排列声音", onMemoryPoint);
    this.root.add([pause.root, this.mute.root, this.reveal.root, memory.root]);
    this.root.add(uiText(scene, 35, 690, "A/D 或 ←/→ 移动    SPACE 跳跃    F 显现    E 收集    ESC 暂停", 11, "#f4f0da"));
    this.message = uiText(scene, 640, 661, "", 15, "#fff9e6").setOrigin(0.5);
    this.root.add(this.message);
  }

  /** 按玩法进度刷新收集栏、任务目标、回忆圆点和 F 按钮；隐藏声音不提前显示音符。 */
  refresh(progress: LevelProgress): void {
    this.indicator.refresh(progress);
    this.progressLabel.setText(`声音罐   ${progress.count} / ${progress.total}`);
    this.mission.setText(progress.phase === "completed" ? "春天已复原，向右走过新生的道路" : progress.allCollected ? "已集齐，回到左侧回忆点还原乐句" : progress.fragmentsRevealed ? "靠近玻璃瓶，看到提示后按 E 收集" : "按 F，显现本轮隐藏的声音");
    this.reveal.setEnabled(progress.phase === "exploring" && !progress.fragmentsRevealed)
      .setLabel(progress.fragmentsRevealed ? "本轮音符已显现" : "F  显现声音");
    this.fragmentMarks.forEach((mark, index) => {
      const fragment = this.level.fragments[index];
      mark.clear();
      drawJar(mark, colorNumber(fragment.color), 0, 0, 0.72, progress.hasCollected(fragment.id));
    });
  }

  /** 在探索画面底部显示临时玩法提示，持续时间由 durationMs 控制。 */
  notify(text: string, durationMs = 3000): void { this.message.setText(text); this.messageExpires = this.scene.time.now + durationMs; }
  /** 提示到期后移除底部文本，不影响任务目标和收集状态。 */
  update(): void { if (this.message.text && this.scene.time.now > this.messageExpires) this.message.setText(""); }
  /** 按音频服务的静音状态更新声音按钮文字。 */
  setMuted(muted: boolean): void { this.mute.setLabel(`声音：${muted ? "关" : "开"}`); }
  /** 区分已静音、可播放和浏览器尚未启用声音；未启用时显示可点击的重试提示。 */
  setAudioState(muted: boolean, ready: boolean): void { this.mute.setLabel(!ready && !muted ? "点击启用声音" : `声音：${muted ? "关" : "开"}`); }
  /** 排序、暂停和开场时隐藏探索 HUD，回到探索时恢复显示。 */
  setVisible(visible: boolean): void { this.root.setVisible(visible); }
}
