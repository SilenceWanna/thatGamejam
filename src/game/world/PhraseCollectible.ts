import Phaser from "phaser";
import type { FragmentDefinition, LevelContent } from "../../content/types";
import { colorNumber, createAssetImage, drawJar } from "../art/assetImages";
import { uiText } from "../../ui/components";

/** 声音罐不注册点击或碰撞拾取；由世界选择附近目标，收到交互动作后才收集。 */
export class PhraseCollectible {
  private readonly visual: Phaser.GameObjects.Container;
  private readonly prompt: Phaser.GameObjects.Container;
  private collected = false;
  private revealed = false;

  /** 按片段位置与颜色创建瓶子和 E 提示；初始全部隐藏，不创建自动拾取碰撞区。 */
  constructor(private readonly scene: Phaser.Scene, content: LevelContent, readonly definition: FragmentDefinition) {
    const { x, y, color } = definition;
    this.visual = scene.add.container(x, y).setDepth(3);
    const art = scene.add.graphics();
    art.fillStyle(colorNumber(color), 0.12).fillCircle(0, 0, 28);
    const asset = content.assets.images.fragment;
    const image = createAssetImage(scene, content, "fragment", 0, 0, asset?.displayWidth ?? 32, asset?.displayHeight ?? 38);
    if (image) this.visual.add(image);
    else drawJar(art, colorNumber(color), 0, 0, 0.95);
    this.visual.addAt(art, 0);
    const badge = scene.add.graphics();
    badge.fillStyle(0xf8f6eb, 0.97).fillRoundedRect(-54, -16, 108, 32, 8);
    badge.lineStyle(1, 0x8b9f7c).strokeRoundedRect(-54, -16, 108, 32, 8);
    const label = uiText(scene, 0, 0, "按 E 收集", 15).setOrigin(0.5);
    this.prompt = scene.add.container(x, y - 54, [badge, label]).setDepth(10);
    this.reset();
  }

  /** 瓶子已显现且本轮未收集时，才可进入附近目标选择。 */
  get canCollect(): boolean { return this.revealed && !this.collected; }
  /** 以配置中的固定瓶子位置计算互动距离，悬浮动画不会改变可收集范围。 */
  distanceTo(x: number, y: number): number { return Math.hypot(x - this.definition.x, y - this.definition.y); }
  /** 显示或隐藏“按 E 收集”；未显现或已收集时强制隐藏。 */
  setPromptVisible(visible: boolean): void { this.prompt.setVisible(visible && this.canCollect); }

  /** 本轮按 F 后显示瓶子并启动悬浮动画；已收集瓶子不会重新出现。 */
  reveal(): void {
    if (this.collected) return;
    this.revealed = true;
    this.scene.tweens.killTweensOf(this.visual);
    this.visual.setVisible(true).setAlpha(1).setScale(1).setPosition(this.definition.x, this.definition.y);
    this.scene.tweens.add({ targets: this.visual, y: this.definition.y - 6, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.InOut" });
  }

  /** 收集成功后立即隐藏 E 提示，播放瓶子上浮淡出；保留对象供失败后复位。 */
  collect(): void {
    if (this.collected) return;
    this.collected = true;
    this.setPromptVisible(false);
    this.scene.tweens.killTweensOf(this.visual);
    this.scene.tweens.add({ targets: this.visual, y: this.visual.y - 34, alpha: 0, scale: 0.7, duration: 280,
      onComplete: () => { if (this.collected) this.visual.setVisible(false); } });
  }

  /** 清除收集/显现标记，停止旧动画并将瓶子归位隐藏，等待下一次 F。 */
  reset(): void {
    this.scene.tweens.killTweensOf(this.visual);
    this.collected = false;
    this.revealed = false;
    this.setPromptVisible(false);
    this.visual.setVisible(false).setAlpha(1).setScale(1).setPosition(this.definition.x, this.definition.y);
  }
}
