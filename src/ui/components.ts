import Phaser from "phaser";
import type { LevelContent } from "../content/types";
import { assetKey } from "../content/loadLevelContent";
import { createAssetImage } from "../game/art/assetImages";

export interface ButtonSkin { content: LevelContent; image: string; hideLabel?: boolean; icon?: string }

export const UI_FONT = '"PingFang SC", "Microsoft YaHei", sans-serif';
export const SERIF_FONT = '"Songti SC", "SimSun", serif';

export function uiText(scene: Phaser.Scene, x: number, y: number, value: string, size = 16, color = "#354c3f"): Phaser.GameObjects.Text {
  return scene.add.text(x, y, value, { fontFamily: UI_FONT, fontSize: `${size}px`, color, lineSpacing: 8, resolution: 2 });
}

export class UiButton {
  readonly root: Phaser.GameObjects.Container;
  private readonly background: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly hitArea: Phaser.GameObjects.Rectangle;
  private enabled = true;
  private hovered = false;
  private readonly image?: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, private readonly width: number, private readonly height: number, text: string, onClick: () => void, private readonly primary = false, private readonly skin?: ButtonSkin) {
    this.background = scene.add.graphics();
    this.label = uiText(scene, 0, 0, text, 15, primary ? "#fff9e9" : "#4f6654").setOrigin(0.5);
    this.hitArea = scene.add.rectangle(0, 0, width, height, 0, 0).setInteractive({ useHandCursor: true });
    this.root = scene.add.container(x, y, [this.background, this.label, this.hitArea]);
    if (skin) {
      this.image = createAssetImage(scene, skin.content, skin.image, 0, 0, width, height) ?? undefined;
      if (this.image) {
        this.root.addAt(this.image, 1);
        this.label.setColor("#fff1cf").setVisible(!skin.hideLabel);
        if (skin.icon) {
          const icon = createAssetImage(scene, skin.content, skin.icon, width * 0.045, -height * 0.104, width * 0.27, height * 0.3);
          if (icon) this.root.addAt(icon, 2);
        }
      }
    }
    this.hitArea.on("pointerover", () => { this.hovered = true; this.draw(); });
    this.hitArea.on("pointerout", () => { this.hovered = false; this.draw(); });
    this.hitArea.on("pointerdown", () => { if (this.enabled) onClick(); });
    this.draw();
  }

  setLabel(text: string): this { this.label.setText(text); return this; }
  setImage(name: string): this {
    if (this.image && this.skin) this.image.setTexture(assetKey(this.skin.content.level.id, name));
    return this;
  }
  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.root.setAlpha(enabled ? 1 : 0.4);
    if (enabled) this.hitArea.setInteractive({ useHandCursor: true });
    else this.hitArea.disableInteractive();
    return this;
  }

  private draw(): void {
    this.background.clear();
    if (this.image) { this.image.setTint(this.hovered ? 0xffedcb : 0xffffff); return; }
    const color = this.primary ? (this.hovered ? 0x48674f : 0x345340) : (this.hovered ? 0xe4e9d9 : 0xf7f5eb);
    this.background.fillStyle(color).fillRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, 8);
    this.background.lineStyle(1, this.primary ? 0x345340 : 0xcbd2bd).strokeRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, 8);
  }
}
