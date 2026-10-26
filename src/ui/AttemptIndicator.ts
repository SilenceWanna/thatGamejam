import Phaser from "phaser";
import type { LevelProgress } from "../core/LevelProgress";
import { uiText } from "./components";

/** 空心点表示已经用掉的本轮/往轮机会，实心点表示尚可使用的机会。 */
export class AttemptIndicator {
  readonly root: Phaser.GameObjects.Container;
  private readonly dots: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;

  /** 创建 HUD 和排序窗口共用的回忆圆点与剩余尝试文字。 */
  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.dots = scene.add.graphics();
    this.label = uiText(scene, 73, -7, "", 11, "#87927a");
    this.root = scene.add.container(x, y, [this.dots, this.label]);
  }

  /** 使用同一个 LevelProgress 绘制实心/空心圆点；听后答错不会重复扣，未听答错也作废本轮额度。 */
  refresh(progress: LevelProgress): void {
    this.dots.clear();
    const used = progress.maxAttempts - progress.referencesRemaining;
    for (let index = 0; index < progress.maxAttempts; index++) {
      this.dots.lineStyle(1.5, 0x8c9d73).strokeCircle(index * 21, 0, 5);
      if (index >= used) this.dots.fillStyle(0x8c9d73).fillCircle(index * 21, 0, 5);
    }
    this.label.setText(`回忆 ${progress.referencesRemaining}/${progress.maxAttempts}  ·  可尝试 ${progress.attemptsRemaining} 次`);
  }
}
