import Phaser from "phaser";
import type { LevelContent } from "../../content/types";
import { createAssetImage } from "../art/assetImages";

export class SpawnPointView {
  private readonly ring: Phaser.GameObjects.Ellipse;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, content: LevelContent) {
    const { x, feetY } = content.level.spawn;
    const visual = scene.add.container(x, feetY).setDepth(2);
    this.ring = scene.add.ellipse(0, -43, 68, 86, 0xe1cd87, 0.13).setStrokeStyle(2, 0xa59c64, 0.75);
    const asset = content.assets.images.spawnPoint;
    const image = createAssetImage(scene, content, "spawnPoint", 0, -46, asset?.displayWidth ?? 76, asset?.displayHeight ?? 92);
    visual.add(this.ring);
    if (image) visual.add(image);
    else {
      const art = scene.add.graphics();
      art.lineStyle(1, 0xa59c64, 0.5).strokeEllipse(0, -43, 54, 72);
      art.fillStyle(0xb5ab7a).fillRoundedRect(-43, -4, 86, 9, 4);
      art.fillStyle(0x75866b).fillRoundedRect(-21, -4, 42, 5, 2);
      visual.add(art);
    }
    this.label = scene.add.text(0, 24, "回忆点 · 苏醒之地", { fontSize: "12px", color: "#5e715b", fontFamily: '"PingFang SC", sans-serif' }).setOrigin(0.5);
    visual.add(this.label);
    scene.tweens.add({ targets: this.ring, alpha: 0.5, duration: 1800, yoyo: true, repeat: -1, ease: "Sine.InOut" });
  }

  setReady(ready: boolean): void {
    this.ring.setStrokeStyle(3, ready ? 0xb08b3b : 0xa59c64, 0.9).setFillStyle(0xe1cd87, ready ? 0.4 : 0.13);
    this.label.setText(ready ? "← 回到这里，还原春天" : "回忆点 · 苏醒之地");
  }
}
