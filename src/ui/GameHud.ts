import Phaser from "phaser";
import type { LevelDefinition } from "../content/types";
import type { LevelProgress } from "../core/LevelProgress";
import { colorNumber, drawNote } from "../game/art/assetImages";
import { UiButton, uiText } from "./components";

export class GameHud {
  private readonly root: Phaser.GameObjects.Container;
  private readonly mission: Phaser.GameObjects.Text;
  private readonly progressLabel: Phaser.GameObjects.Text;
  private readonly fragmentMarks: Phaser.GameObjects.Graphics[] = [];
  private readonly message: Phaser.GameObjects.Text;
  private readonly mute: UiButton;
  private messageExpires = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly level: LevelDefinition, onPause: () => void, onMute: () => boolean, onReference?: () => void) {
    const panel = scene.add.graphics();
    panel.fillStyle(0xf8f7ec, 0.88).fillRoundedRect(26, 24, 386, 92, 12);
    panel.lineStyle(1, 0xd1d7c1).strokeRoundedRect(26, 24, 386, 92, 12);
    const chapter = uiText(scene, 48, 40, `01   /   ${level.title}`, 19);
    this.mission = uiText(scene, 48, 77, "找到散落在森林里的四段声音", 13, "#7c8974");
    const progressPanel = scene.add.graphics();
    progressPanel.fillStyle(0xf8f7ec, 0.88).fillRoundedRect(850, 24, 245, 92, 12);
    progressPanel.lineStyle(1, 0xd1d7c1).strokeRoundedRect(850, 24, 245, 92, 12);
    this.progressLabel = uiText(scene, 870, 39, "乐句碎片   0 / 4", 13, "#6a7d66");
    this.root = scene.add.container(0, 0, [panel, chapter, this.mission, progressPanel, this.progressLabel]).setDepth(20);
    level.fragments.forEach((_, index) => {
      const mark = scene.add.graphics().setPosition(893 + index * 52, 87);
      this.fragmentMarks.push(mark);
      this.root.add(mark);
    });
    const pause = new UiButton(scene, 1174, 47, 142, 40, "Ⅱ  暂停", onPause);
    this.mute = new UiButton(scene, 1174, 96, 142, 36, "声音：开", () => { this.setMuted(onMute()); });
    this.root.add([pause.root, this.mute.root]);
    const controls = uiText(scene, 35, 687, "A / D  左右移动     SPACE  跳跃     ESC  暂停", 12, "#f4f0da");
    this.message = uiText(scene, 640, 668, "", 17, "#fff9e6").setOrigin(0.5);
    this.root.add([controls, this.message]);
    if (onReference) {
      const reference = new UiButton(scene, 1132, 680, 200, 36, "♪  聆听完整乐句", onReference);
      this.root.add(reference.root);
    }
  }

  refresh(progress: LevelProgress): void {
    this.progressLabel.setText(`乐句碎片   ${progress.count} / ${progress.total}`);
    this.mission.setText(progress.allCollected ? "声音集齐了，回到左侧的旋律起点" : "找到散落在森林里的四段声音");
    this.fragmentMarks.forEach((mark, index) => {
      const fragment = this.level.fragments[index];
      const collected = progress.hasCollected(fragment.id);
      mark.clear().fillStyle(collected ? colorNumber(fragment.color) : 0xc1c9b4, collected ? 0.15 : 0.13).fillCircle(0, 0, 17);
      drawNote(mark, collected ? colorNumber(fragment.color) : 0xbdc7b2, 0, 0, 0.72);
    });
  }

  notify(text: string, durationMs = 2600): void { this.message.setText(text); this.messageExpires = this.scene.time.now + durationMs; }
  update(): void { if (this.message.text && this.scene.time.now > this.messageExpires) this.message.setText(""); }
  setMuted(muted: boolean): void { this.mute.setLabel(`声音：${muted ? "关" : "开"}`); }
  setVisible(visible: boolean): void { this.root.setVisible(visible); }
}
