import Phaser from "phaser";
import type { FragmentDefinition, LevelContent } from "../../content/types";
import { colorNumber, createAssetImage, drawJar } from "../art/assetImages";

/** 只显示声音罐；图形、点击区域和拾取碰撞区均在本轮按 F 后启用。 */
export class PhraseCollectible {
  readonly trigger: Phaser.GameObjects.Zone;
  private readonly visual: Phaser.GameObjects.Container;
  private readonly clickTarget: Phaser.GameObjects.Zone;
  private collected = false;

  constructor(private readonly scene: Phaser.Scene, content: LevelContent, readonly definition: FragmentDefinition, onClick: () => void) {
    const { x, y, color } = definition;
    this.trigger = scene.add.zone(x, y, 36, 44);
    scene.physics.add.existing(this.trigger, true);
    this.clickTarget = scene.add.zone(x, y, 60, 64).setDepth(3).setInteractive({ useHandCursor: true });
    this.clickTarget.on("pointerdown", onClick);
    this.visual = scene.add.container(x, y).setDepth(3);
    const art = scene.add.graphics();
    art.fillStyle(colorNumber(color), 0.12).fillCircle(0, 0, 28);
    const asset = content.assets.images.fragment;
    const image = createAssetImage(scene, content, "fragment", 0, 0, asset?.displayWidth ?? 32, asset?.displayHeight ?? 38);
    if (image) this.visual.add(image);
    else drawJar(art, colorNumber(color), 0, 0, 0.95);
    this.visual.addAt(art, 0);
    this.reset();
  }

  get isCollected(): boolean { return this.collected; }
  distanceTo(x: number, feetY: number): number { return Math.hypot(x - this.definition.x, feetY - 26 - this.definition.y); }

  reveal(): void {
    if (this.collected) return;
    this.scene.tweens.killTweensOf(this.visual);
    this.visual.setVisible(true).setAlpha(1).setScale(1).setPosition(this.definition.x, this.definition.y);
    this.clickTarget.setVisible(true);
    (this.trigger.body as Phaser.Physics.Arcade.StaticBody).enable = true;
    this.scene.tweens.add({ targets: this.visual, y: this.definition.y - 6, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.InOut" });
  }

  collect(): void {
    if (this.collected) return;
    this.collected = true;
    (this.trigger.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    this.clickTarget.setVisible(false);
    this.scene.tweens.killTweensOf(this.visual);
    this.scene.tweens.add({ targets: this.visual, y: this.visual.y - 34, alpha: 0, scale: 0.7, duration: 280,
      onComplete: () => { if (this.collected) this.visual.setVisible(false); } });
  }

  reset(): void {
    this.scene.tweens.killTweensOf(this.visual);
    this.collected = false;
    this.clickTarget.setVisible(false);
    this.visual.setVisible(false).setAlpha(1).setScale(1).setPosition(this.definition.x, this.definition.y);
    (this.trigger.body as Phaser.Physics.Arcade.StaticBody).enable = false;
  }
}
