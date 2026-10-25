import Phaser from "phaser";

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

  constructor(scene: Phaser.Scene, x: number, y: number, private readonly width: number, private readonly height: number, text: string, onClick: () => void, private readonly primary = false) {
    this.background = scene.add.graphics();
    this.label = uiText(scene, 0, 0, text, 15, primary ? "#fff9e9" : "#4f6654").setOrigin(0.5);
    this.hitArea = scene.add.rectangle(0, 0, width, height, 0, 0).setInteractive({ useHandCursor: true });
    this.root = scene.add.container(x, y, [this.background, this.label, this.hitArea]);
    this.hitArea.on("pointerover", () => { this.hovered = true; this.draw(); });
    this.hitArea.on("pointerout", () => { this.hovered = false; this.draw(); });
    this.hitArea.on("pointerdown", () => { if (this.enabled) onClick(); });
    this.draw();
  }

  setLabel(text: string): this { this.label.setText(text); return this; }
  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.root.setAlpha(enabled ? 1 : 0.4);
    if (enabled) this.hitArea.setInteractive({ useHandCursor: true });
    else this.hitArea.disableInteractive();
    return this;
  }

  private draw(): void {
    this.background.clear();
    const color = this.primary ? (this.hovered ? 0x48674f : 0x345340) : (this.hovered ? 0xe4e9d9 : 0xf7f5eb);
    this.background.fillStyle(color).fillRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, 8);
    this.background.lineStyle(1, this.primary ? 0x345340 : 0xcbd2bd).strokeRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, 8);
  }
}

export function modalRoot(scene: Phaser.Scene, width: number, height: number): Phaser.GameObjects.Container {
  const shade = scene.add.rectangle(640, 360, 1280, 720, 0x263d32, 0.31).setInteractive();
  const panel = scene.add.graphics();
  panel.fillStyle(0x233c32, 0.1).fillRoundedRect(640 - width / 2 + 5, 360 - height / 2 + 12, width, height, 18);
  panel.fillStyle(0xf8f6eb).fillRoundedRect(640 - width / 2, 360 - height / 2, width, height, 16);
  panel.lineStyle(1, 0xc4cdb5).strokeRoundedRect(640 - width / 2, 360 - height / 2, width, height, 16);
  return scene.add.container(0, 0, [shade, panel]).setDepth(100);
}
