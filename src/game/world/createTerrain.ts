import Phaser from "phaser";
import type { LevelContent } from "../../content/types";
import { createAssetImage } from "../art/assetImages";
import { WORLD_DEPTH } from "../art/renderLayers";

export interface Terrain { ground: Phaser.GameObjects.Rectangle; platforms: Phaser.Physics.Arcade.StaticGroup }

/** 按 world / platforms 配置建立地面和单向平台；图片独立于碰撞体，换素材不会改变跳跃判定。 */
export function createTerrain(scene: Phaser.Scene, content: LevelContent): Terrain {
  const { world, platforms } = content.level;
  const groundHeight = world.height - world.groundY;
  const ground = scene.add.rectangle(world.width / 2, world.groundY + groundHeight / 2, world.width, groundHeight, 0, 0);
  scene.physics.add.existing(ground, true);
  if (!content.level.art?.layers.length && !createAssetImage(scene, content, "ground", world.width / 2, world.groundY + groundHeight / 2, world.width, groundHeight)) {
    const art = scene.add.graphics();
    art.fillStyle(0x7b8261).fillRect(0, world.groundY, world.width, 9);
    art.fillStyle(0xb5a17d).fillRect(0, world.groundY + 9, world.width, groundHeight);
    art.fillStyle(0x9a896b, 0.4);
    for (let index = 0; index < 56; index++) art.fillRect(index * 29 % world.width, world.groundY + 19 + index * 17 % 61, 10, 2);
    art.lineStyle(1, 0xe5d9b2, 0.3).lineBetween(0, world.groundY + 13, world.width, world.groundY + 13);
  }
  const group = scene.physics.add.staticGroup();
  for (const platform of platforms) {
    const collision = scene.add.rectangle(platform.x, platform.topY + platform.height / 2, platform.width, platform.height, 0, 0);
    group.add(collision);
    const body = collision.body as Phaser.Physics.Arcade.StaticBody;
    // 单向平台：可以从下方穿过，只在下落时站到顶面，避免侧面卡住角色。
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;
    const artwork = content.level.art?.platforms[platform.id];
    if (artwork) {
      const image = createAssetImage(scene, content, artwork.image, platform.x, platform.topY + (artwork.offsetY ?? 0), artwork.width, artwork.height);
      if (image) { image.setOrigin(0.5, 0).setDepth(WORLD_DEPTH.interactive); continue; }
    }
    if (createAssetImage(scene, content, "platform", platform.x, platform.topY + platform.height / 2, platform.width, platform.height)) continue;
    const art = scene.add.graphics();
    const left = platform.x - platform.width / 2;
    art.fillStyle(0x5c6f52, 0.1).fillRoundedRect(left - 3, platform.topY + 9, platform.width + 6, platform.height + 8, 8);
    art.fillStyle(0xb29a77).fillRoundedRect(left, platform.topY, platform.width, platform.height, 7);
    art.fillStyle(0x7d9066).fillRoundedRect(left - 3, platform.topY - 2, platform.width + 6, 10, 5);
    art.lineStyle(1, 0x8a7459, 0.4);
    art.lineBetween(left + 16, platform.topY + 17, left + platform.width - 17, platform.topY + 17);
    for (let index = 0; index < 7; index++) {
      const x = left + 14 + index * 25;
      art.lineStyle(1, 0xa3b18a, 0.8).lineBetween(x, platform.topY + 1, x + 3, platform.topY - 5);
    }
  }
  return { ground, platforms: group };
}
