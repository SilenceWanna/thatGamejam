import Phaser from "phaser";
import type { LevelContent } from "../../content/types";
import { assetKey } from "../../content/loadLevelContent";

/** 正式图片存在时返回图片，否则由各对象绘制基本图形。图片尺寸与碰撞尺寸完全独立。 */
export function createAssetImage(scene: Phaser.Scene, content: LevelContent, name: string, x: number, y: number, width: number, height: number): Phaser.GameObjects.Image | null {
  const key = assetKey(content.level.id, name);
  if (!content.assets.images[name]?.file || !scene.textures.exists(key)) return null;
  return scene.add.image(x, y, key).setDisplaySize(width, height);
}

export function colorNumber(hex: string): number { return Number.parseInt(hex.slice(1), 16); }

/** 收集物/UI 共用的音符，保证没有图片时仍保持一致的视觉识别。 */
export function drawNote(graphics: Phaser.GameObjects.Graphics, color: number, x = 0, y = 0, scale = 1): void {
  graphics.fillStyle(color, 1);
  graphics.fillEllipse(x - 4 * scale, y + 6 * scale, 12 * scale, 8 * scale);
  graphics.fillRect(x, y - 14 * scale, 3 * scale, 21 * scale);
  graphics.beginPath();
  graphics.moveTo(x + 2 * scale, y - 14 * scale);
  graphics.lineTo(x + 11 * scale, y - 9 * scale);
  graphics.lineTo(x + 10 * scale, y - 4 * scale);
  graphics.lineTo(x + 2 * scale, y - 8 * scale);
  graphics.closePath();
  graphics.fillPath();
}

/** 玻璃罐与声音分层绘制：未收集的罐子可以保持空白，不提前显示隐藏音符。 */
export function drawJar(graphics: Phaser.GameObjects.Graphics, color: number, x = 0, y = 0, scale = 1, filled = true): void {
  graphics.fillStyle(0xffffff, 0.32).fillRoundedRect(x - 16 * scale, y - 17 * scale, 32 * scale, 37 * scale, 7 * scale);
  graphics.lineStyle(1.4 * scale, color, filled ? 0.85 : 0.32).strokeRoundedRect(x - 16 * scale, y - 17 * scale, 32 * scale, 37 * scale, 7 * scale);
  graphics.fillStyle(color, filled ? 0.8 : 0.25).fillRoundedRect(x - 13 * scale, y - 22 * scale, 26 * scale, 7 * scale, 2 * scale);
  graphics.lineStyle(1, 0xffffff, 0.8).lineBetween(x - 10 * scale, y - 10 * scale, x - 10 * scale, y + 6 * scale);
  if (filled) drawNote(graphics, color, x + 1 * scale, y, 0.7 * scale);
}
