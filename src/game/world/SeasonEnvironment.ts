import Phaser from "phaser";
import type { LevelContent } from "../../content/types";
import { colorNumber, createAssetImage } from "../art/assetImages";
import { uiText } from "../../ui/components";

/** 春季混乱/恢复两套表现和实体道路开关。正式分层图片可覆盖每一套占位效果。 */
export class SeasonEnvironment {
  readonly barrier: Phaser.GameObjects.Rectangle;
  private readonly disorder: Phaser.GameObjects.Container;
  private readonly restored: Phaser.GameObjects.Container;
  private readonly closedGate: Phaser.GameObjects.Container;
  private readonly openGate: Phaser.GameObjects.Container;
  private readonly restoredBackground: Phaser.GameObjects.Image | null;

  constructor(private readonly scene: Phaser.Scene, private readonly content: LevelContent) {
    const { world, season } = content.level;
    this.disorder = scene.add.container(0, 0).setDepth(1);
    this.restored = scene.add.container(0, 0).setDepth(1).setVisible(false).setAlpha(0);
    const frozen = scene.add.graphics();
    frozen.fillStyle(colorNumber(season.disorderTint), 0.12).fillRect(0, 0, world.width, world.groundY);
    for (let index = 0; index < 22; index++) {
      const x = 38 + index * 57;
      frozen.fillStyle(0xc4dde8, 0.66).fillTriangle(x - 13, world.groundY, x + 13, world.groundY, x, world.groundY - 22 - index % 3 * 8);
    }
    for (let index = 0; index < 18; index++) {
      frozen.fillStyle(0x96b2c9, 0.6).fillEllipse((index * 137 + 47) % 1240, 190 + index * 71 % 350, 3, 9);
    }
    this.disorder.add(frozen);
    const disorderImage = createAssetImage(scene, content, "springDisorder", world.width / 2, world.height / 2, world.width, world.height);
    if (disorderImage) this.disorder.add(disorderImage);
    const flowers = scene.add.graphics();
    flowers.fillStyle(colorNumber(season.restoredTint), 0.1).fillRect(0, 0, world.width, world.groundY);
    for (let index = 0; index < 37; index++) {
      const x = 22 + index * 34;
      flowers.lineStyle(2, 0x7c9b6d).lineBetween(x, world.groundY, x + 3, world.groundY - 17);
      flowers.fillStyle([0xe2b2ad, 0xe5cc8f, 0xd0b5cb][index % 3]).fillCircle(x + 3, world.groundY - 19, 5);
      flowers.fillStyle(0xf4e5b0).fillCircle(x + 3, world.groundY - 19, 2);
    }
    this.restored.add(flowers);
    this.restoredBackground = createAssetImage(scene, content, "backgroundRestored", world.width / 2, world.height / 2, world.width, world.height);
    this.restoredBackground?.setAlpha(0);
    const restoredLayer = createAssetImage(scene, content, "springRestored", world.width / 2, world.height / 2, world.width, world.height);
    if (restoredLayer) this.restored.add(restoredLayer);
    this.barrier = scene.add.rectangle(season.exitX, world.groundY - 46, 26, 92, 0, 0);
    scene.physics.add.existing(this.barrier, true);
    this.closedGate = this.gate(false);
    this.openGate = this.gate(true).setVisible(false);
  }

  revealPulse(x: number, y: number): void {
    const pulse = this.scene.add.circle(x, y - 25, 30, 0xd9e6b6, 0.08).setStrokeStyle(2, 0xd2dfae, 0.65).setDepth(6);
    this.scene.tweens.add({ targets: pulse, scale: 26, alpha: 0, duration: 900, onComplete: () => pulse.destroy() });
  }

  showMistake(): void {
    const flash = this.scene.add.rectangle(640, 360, 1280, 720, 0xa6bdd3, 0.34).setDepth(8);
    this.scene.tweens.add({ targets: flash, alpha: 0, duration: 800, onComplete: () => flash.destroy() });
  }

  restore(onFinished: () => void): void {
    this.restored.setVisible(true);
    if (this.restoredBackground) this.scene.tweens.add({ targets: this.restoredBackground, alpha: 1, duration: 1500 });
    this.scene.tweens.add({ targets: this.disorder, alpha: 0, duration: 1500 });
    this.scene.tweens.add({ targets: this.restored, alpha: 1, duration: 1500, onComplete: () => {
      (this.barrier.body as Phaser.Physics.Arcade.StaticBody).enable = false;
      this.closedGate.setVisible(false); this.openGate.setVisible(true); onFinished();
    } });
  }

  private gate(open: boolean): Phaser.GameObjects.Container {
    const { season, world } = this.content.level;
    const root = this.scene.add.container(season.exitX, world.groundY).setDepth(3);
    const image = createAssetImage(this.scene, this.content, open ? "exitOpen" : "exitClosed", 0, -46, 64, 92);
    if (image) root.add(image);
    else {
      const art = this.scene.add.graphics();
      if (open) {
        art.lineStyle(5, 0x769966).lineBetween(-40, 0, -10, -9).lineBetween(-10, -9, 32, -5);
        art.fillStyle(0x93b07d).fillEllipse(-23, -6, 15, 7).fillEllipse(12, -8, 15, 7);
      } else {
        art.fillStyle(0xadc9dc, 0.65).fillTriangle(-28, 0, 26, 0, -4, -87);
        art.lineStyle(2, 0xd8e8ee, 0.85).lineBetween(-20, -8, -2, -70).lineBetween(-2, -70, 15, -15);
      }
      root.add(art);
    }
    root.add(uiText(this.scene, -8, -111, open ? `${season.nextSeasonLabel} →` : "冰封的道路", 11, "#718168").setOrigin(0.5));
    return root;
  }
}
