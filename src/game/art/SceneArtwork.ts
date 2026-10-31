import Phaser from "phaser";
import type { LevelContent, SceneArtLayer } from "../../content/types";
import { assetKey } from "../../content/loadLevelContent";
import { artLayerDepth } from "./renderLayers";

type ArtImage = Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite;

/** 只负责按美术图层和季节状态摆放贴图；碰撞与玩法仍由 SpringWorld 管理。 */
export class SceneArtwork {
  private readonly images = new Map<string, ArtImage>();
  private readonly phases: Record<string, ArtImage[]> = { frozen: [], transition: [], restored: [] };

  /** 读取本关 art.layers；数字小的在上层，透明地面/前景保留原画的遮挡关系。 */
  constructor(private readonly scene: Phaser.Scene, content: LevelContent) {
    for (const layer of content.level.art?.layers ?? []) {
      const key = assetKey(content.level.id, layer.image);
      if (!scene.textures.exists(key)) continue;
      const image = this.createLayer(layer, key).setDepth(artLayerDepth(layer.layer));
      this.images.set(layer.image, image);
      if (layer.motion) scene.tweens.add({ targets: image, x: layer.x + layer.motion.distance, duration: layer.motion.durationMs, yoyo: true, repeat: -1, ease: "Sine.InOut" });
      if (layer.phase) {
        this.phases[layer.phase].push(image);
        image.setAlpha(layer.phase === "frozen" ? 1 : 0);
      }
    }
  }

  /** 按等比覆盖/包含或横向平铺绘制，避免把树木、溪岸压扁成窄条。 */
  private createLayer(layer: SceneArtLayer, key: string): ArtImage {
    const source = this.scene.textures.get(key).getSourceImage() as HTMLImageElement;
    let image: ArtImage;
    if (layer.repeatX) {
      image = this.scene.add.tileSprite(layer.x, layer.y, layer.width, layer.height, key);
      image.setTileScale(layer.height / source.height);
    } else {
      image = this.scene.add.image(layer.x, layer.y, key);
      if (layer.fit === "cover" || layer.fit === "contain") {
        const ratio = (layer.fit === "cover" ? Math.max : Math.min)(layer.width / source.width, layer.height / source.height);
        image.setScale(ratio);
      } else image.setDisplaySize(layer.width, layer.height);
    }
    return image.setOrigin(layer.originX ?? 0.5, layer.originY ?? 0.5);
  }

  /** 移动图层的位置供声音交互点跟随；前景固定在画面边缘。 */
  getPosition(name: string): { x: number; y: number } | undefined { return this.images.get(name); }

  /** 正确还原时从冰冻经由过渡底图渐变到春天，同时交换冻结/未冻结花丛和积雪。 */
  restore(): void {
    if (this.phases.frozen.length) this.scene.tweens.add({ targets: this.phases.frozen, alpha: 0, duration: 1500 });
    if (this.phases.restored.length) this.scene.tweens.add({ targets: this.phases.restored, alpha: 1, duration: 1500 });
    if (this.phases.transition.length) this.scene.tweens.add({ targets: this.phases.transition, alpha: 0.85, duration: 650, yoyo: true });
  }
}
