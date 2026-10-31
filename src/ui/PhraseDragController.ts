import Phaser from "phaser";
import type { LevelContent } from "../content/types";
import { JarView } from "../game/art/JarView";
import type { JarVisualState } from "../game/art/JarView";

/** 拖拽与点击共用同一个放入操作。只移动拖拽影像，原卡片和槽位位置不变。 */
export class PhraseDragController {
  private ghost?: Phaser.GameObjects.Container;
  /** 开始拖拽时创建带名称和颜色的瓶子影像，原声音库/槽位位置保持不动。 */
  private readonly start = (pointer: Phaser.Input.Pointer, object: Phaser.GameObjects.Rectangle): void => {
    const id = this.ownedId(object);
    if (!id || !this.enabled() || !this.canDrag(id)) return;
    const fragment = this.content.level.fragments.find(item => item.id === id)!;
    const jar = new JarView(this.scene, this.content, fragment, 0, 0, 48, 64, this.state());
    this.ghost = this.scene.add.container(pointer.worldX, pointer.worldY, [jar.root]).setDepth(200);
  };
  /** 拖拽过程中让临时影像跟随指针，不直接移动实际槽位对象。 */
  private readonly drag = (pointer: Phaser.Input.Pointer, object: Phaser.GameObjects.Rectangle): void => {
    if (this.ownedId(object)) this.ghost?.setPosition(pointer.worldX, pointer.worldY);
  };
  /** 松开到本面板槽位时调用统一放入规则；丢到界外不改变排列。 */
  private readonly drop = (_pointer: Phaser.Input.Pointer, object: Phaser.GameObjects.Rectangle, target: Phaser.GameObjects.Rectangle): void => {
    const id = this.ownedId(object);
    if (id && this.canDrag(id) && target.getData("slotOwner") === this && this.enabled()) this.place(id, target.getData("slotIndex") as number);
  };
  /** 结束拖拽时销毁临时瓶子影像，无论是否成功放入槽位。 */
  private readonly end = (_pointer: Phaser.Input.Pointer, object: Phaser.GameObjects.Rectangle): void => {
    if (object.getData("tokenOwner") === this) { this.ghost?.destroy(); this.ghost = undefined; }
  };

  /** 绑定音序器拖拽事件，面板关闭或已提交时由 enabled 阻止操作。 */
  constructor(private readonly scene: Phaser.Scene, private readonly content: LevelContent, private readonly enabled: () => boolean, private readonly place: (id: string, index: number) => void, private readonly state: () => JarVisualState = () => "full", private readonly canDrag: (id: string) => boolean = () => true) {
    scene.input.on("dragstart", this.start);
    scene.input.on("drag", this.drag);
    scene.input.on("drop", this.drop);
    scene.input.on("dragend", this.end);
  }

  /** 将声音库卡片或已填槽位登记为可拖动瓶子，空槽位不提供可移动片段。 */
  registerToken(object: Phaser.GameObjects.Rectangle, id: string | null): void {
    object.setData("tokenOwner", this).setData("fragmentId", id);
    this.scene.input.setDraggable(object);
  }
  /** 登记槽位索引和合法落点，使声音库拖入与槽位互换使用同一个 place 入口。 */
  registerSlot(object: Phaser.GameObjects.Rectangle, index: number): void {
    // 已存在交互区时 Phaser 会保留原配置；第三个参数才能将其升级为放置区。
    object.setInteractive(undefined, undefined, true);
    object.setData("slotOwner", this).setData("slotIndex", index);
    this.registerToken(object, null);
  }
  /** 排列刷新后同步槽位里的片段 ID，避免拖拽读取到旧瓶子。 */
  updateToken(object: Phaser.GameObjects.Rectangle, id: string | null): void { object.setData("fragmentId", id); }
  /** 退出音序器时移除临时影像与拖拽监听，防止下一轮重复处理落点。 */
  destroy(): void {
    this.ghost?.destroy();
    this.scene.input.off("dragstart", this.start);
    this.scene.input.off("drag", this.drag);
    this.scene.input.off("drop", this.drop);
    this.scene.input.off("dragend", this.end);
  }
  private ownedId(object: Phaser.GameObjects.Rectangle): string | null {
    return object.getData("tokenOwner") === this ? object.getData("fragmentId") as string | null : null;
  }
}
