import Phaser from "phaser";
import type { FragmentDefinition, LevelContent } from "../../content/types";
import { colorNumber, createAssetImage, drawNote } from "../art/assetImages";

export class PhraseCollectible {
  readonly trigger: Phaser.GameObjects.Zone;
  private readonly visual: Phaser.GameObjects.Container;
  private collected = false;

  constructor(private readonly scene: Phaser.Scene, content: LevelContent, readonly definition: FragmentDefinition) {
    const { x, y, color, label } = definition;
    this.trigger = scene.add.zone(x, y, 36, 44);
    scene.physics.add.existing(this.trigger, true);
    this.visual = scene.add.container(x, y).setDepth(3);
    const graphics = scene.add.graphics();
    graphics.fillStyle(colorNumber(color), 0.1).fillCircle(0, 0, 26);
    graphics.lineStyle(1, colorNumber(color), 0.4).strokeCircle(0, 0, 22);
    this.visual.add(graphics);
    const asset = content.assets.images.fragment;
    const image = createAssetImage(scene, content, "fragment", 0, 0, asset?.displayWidth ?? 32, asset?.displayHeight ?? 38);
    if (image) this.visual.add(image);
    else { const note = scene.add.graphics(); drawNote(note, colorNumber(color)); this.visual.add(note); }
    const text = scene.add.text(0, 35, label, { fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif', fontSize: "12px", color: "#71816c" }).setOrigin(0.5);
    this.visual.add(text);
    scene.tweens.add({ targets: this.visual, y: y - 6, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.InOut", delay: x % 500 });
  }

  collect(): void {
    if (this.collected) return;
    this.collected = true;
    (this.trigger.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    this.scene.tweens.killTweensOf(this.visual);
    this.scene.tweens.add({ targets: this.visual, y: this.visual.y - 34, alpha: 0, scale: 1.3, duration: 280, onComplete: () => this.visual.destroy() });
  }
}
