import Phaser from "phaser";
import type { LevelContent } from "../../content/types";
import { SceneArtwork } from "../art/SceneArtwork";

/** 管理分层场景、显现光波及春天恢复效果。 */
export class SeasonEnvironment {
  readonly artwork?: SceneArtwork;
  constructor(private readonly scene: Phaser.Scene, content: LevelContent) {
    if (content.level.art?.layers.length) this.artwork = new SceneArtwork(scene, content);
  }
  /** F 显现时从角色位置扩散一圈光波。 */
  revealPulse(x: number, y: number): void {
    const pulse = this.scene.add.circle(x, y - 25, 30, 0xd9e6b6, 0.08).setStrokeStyle(2, 0xd2dfae, 0.65).setDepth(6);
    this.scene.tweens.add({ targets: pulse, scale: 26, alpha: 0, duration: 900, onComplete: () => pulse.destroy() });
  }
  /** 答对后渐变替换冻结背景及花丛。 */
  restore(): void { this.artwork?.restore(); }
}
