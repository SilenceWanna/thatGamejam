import Phaser from "phaser";
import type { FragmentDefinition, LevelContent } from "../../content/types";
import { assetKey } from "../../content/loadLevelContent";
import { colorNumber, drawJar } from "./assetImages";

export type JarVisualState = "empty" | "low" | "half" | "full";

/** 场景、收集栏、槽位与拖拽共用瓶子贴图，避免每个界面各自写颜色/素材映射。 */
export class JarView {
  readonly root: Phaser.GameObjects.Container;
  private readonly image: Phaser.GameObjects.Image;
  private readonly placeholder: Phaser.GameObjects.Graphics;
  private state: JarVisualState = "full";

  /** 按指定显示尺寸创建瓶子；美术尺寸不参与互动距离或收集判定。 */
  constructor(private readonly scene: Phaser.Scene, private readonly content: LevelContent,
    private fragment: FragmentDefinition | undefined, x: number, y: number,
    private readonly width: number, private readonly height: number, state: JarVisualState = "full") {
    this.image = scene.add.image(0, 0, "__WHITE").setVisible(false);
    this.placeholder = scene.add.graphics();
    this.root = scene.add.container(x, y, [this.placeholder, this.image]);
    this.setState(state);
  }

  /** 未收集显示空瓶；不同液面用于场景、拖拽及已收集表现，不改变实际收集进度。 */
  setState(state: JarVisualState): void {
    this.state = state;
    const name = state === "empty" ? "jarEmpty" : this.fragment?.jarImages?.[state] ?? "jar";
    const key = assetKey(this.content.level.id, name);
    const available = !!this.content.assets.images[name]?.file && this.scene.textures.exists(key);
    this.image.setVisible(available);
    this.placeholder.clear().setVisible(!available);
    if (available) {
      this.image.setTexture(key);
      const source = this.image.texture.getSourceImage() as HTMLImageElement;
      this.image.setScale(Math.min(this.width / source.width, this.height / source.height));
    } else drawJar(this.placeholder, colorNumber(this.fragment?.color ?? "#bd8e48"), 0, 0, this.height / 44, state !== "empty");
  }

  /** 排序槽位交换瓶子后更新贴图来源，显示对象保持稳定以兼容拖拽。 */
  setFragment(fragment: FragmentDefinition | undefined): void { this.fragment = fragment; this.setState(this.state); }
}
