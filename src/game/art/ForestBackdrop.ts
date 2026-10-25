import Phaser from "phaser";
import type { LevelContent } from "../../content/types";
import { createAssetImage } from "./assetImages";

/** 占位场景完全由图形组成；填入 background 图片后整体替换，不影响关卡几何。 */
export function createForestBackdrop(scene: Phaser.Scene, content: LevelContent): void {
  const { width, height, groundY } = content.level.world;
  if (createAssetImage(scene, content, "background", width / 2, height / 2, width, height)) return;
  const art = scene.add.graphics();
  art.fillStyle(0xf0efdc).fillRect(0, 0, width, height);
  art.fillStyle(0xe4dfb9, 0.55).fillCircle(1008, 206, 91);
  art.lineStyle(1, 0xa6ae8c, 0.13).strokeCircle(1008, 206, 108);
  // 远景山丘和树干，固定种子式布局避免每次重开改变画面。
  art.fillStyle(0xdbe2c8).fillEllipse(140, 520, 750, 460).fillEllipse(950, 566, 950, 540);
  art.fillStyle(0xc7d4ba).fillEllipse(1080, 660, 850, 485).fillEllipse(410, 662, 760, 300);
  for (const [x, top, trunkWidth] of [[48, 185, 20], [230, 270, 15], [1168, 154, 22], [1070, 310, 13]]) {
    art.fillStyle(0x93aa8b, 0.22).fillRoundedRect(x, top, trunkWidth, groundY - top, 7);
    art.fillStyle(0xa4ba95, 0.25).fillEllipse(x + trunkWidth / 2, top + 10, 180, 225);
  }
  art.lineStyle(1, 0x7a947a, 0.12);
  for (let line = 0; line < 5; line++) {
    art.beginPath().moveTo(180, 214 + line * 12).lineTo(825, 214 + line * 12).strokePath();
  }
  art.fillStyle(0x78977a, 0.23);
  for (let index = 0; index < 22; index++) {
    const x = (index * 137 + 59) % width;
    const y = 150 + (index * 79) % 410;
    art.fillEllipse(x, y, 3 + index % 3, 7);
  }
  const foreground = scene.add.graphics().setDepth(5);
  for (const [x, size] of [[27, 34], [70, 22], [1200, 28], [1244, 40]]) {
    foreground.lineStyle(3, 0x688168, 0.65).lineBetween(x, groundY, x + 6, groundY - size);
    foreground.fillStyle(0x7b9470, 0.75).fillEllipse(x - 4, groundY - size * 0.6, 18, 7).fillEllipse(x + 13, groundY - size * 0.8, 18, 7);
  }
}
