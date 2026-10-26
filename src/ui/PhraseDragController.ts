import Phaser from "phaser";
import type { FragmentDefinition } from "../content/types";
import { drawJar, colorNumber } from "../game/art/assetImages";
import { uiText } from "./components";

/** 拖拽与点击共用同一个放入操作。只移动拖拽影像，原卡片和槽位位置不变。 */
export class PhraseDragController {
  private ghost?: Phaser.GameObjects.Container;
  private readonly start = (pointer: Phaser.Input.Pointer, object: Phaser.GameObjects.Rectangle): void => {
    const id = this.ownedId(object);
    if (!id || !this.enabled()) return;
    const fragment = this.fragments.find(item => item.id === id)!;
    const art = this.scene.add.graphics();
    art.fillStyle(0xf9f7e9, 0.96).fillRoundedRect(-70, -38, 140, 76, 10);
    drawJar(art, colorNumber(fragment.color), -35, 0, 0.75);
    const text = uiText(this.scene, 16, 0, fragment.label, 18).setOrigin(0.5);
    this.ghost = this.scene.add.container(pointer.worldX, pointer.worldY, [art, text]).setDepth(200);
  };
  private readonly drag = (pointer: Phaser.Input.Pointer, object: Phaser.GameObjects.Rectangle): void => {
    if (this.ownedId(object)) this.ghost?.setPosition(pointer.worldX, pointer.worldY);
  };
  private readonly drop = (_pointer: Phaser.Input.Pointer, object: Phaser.GameObjects.Rectangle, target: Phaser.GameObjects.Rectangle): void => {
    const id = this.ownedId(object);
    if (id && target.getData("slotOwner") === this && this.enabled()) this.place(id, target.getData("slotIndex") as number);
  };
  private readonly end = (_pointer: Phaser.Input.Pointer, object: Phaser.GameObjects.Rectangle): void => {
    if (object.getData("tokenOwner") === this) { this.ghost?.destroy(); this.ghost = undefined; }
  };

  constructor(private readonly scene: Phaser.Scene, private readonly fragments: readonly FragmentDefinition[], private readonly enabled: () => boolean, private readonly place: (id: string, index: number) => void) {
    scene.input.on("dragstart", this.start);
    scene.input.on("drag", this.drag);
    scene.input.on("drop", this.drop);
    scene.input.on("dragend", this.end);
  }

  registerToken(object: Phaser.GameObjects.Rectangle, id: string | null): void {
    object.setData("tokenOwner", this).setData("fragmentId", id);
    this.scene.input.setDraggable(object);
  }
  registerSlot(object: Phaser.GameObjects.Rectangle, index: number): void {
    // 已存在交互区时 Phaser 会保留原配置；第三个参数才能将其升级为放置区。
    object.setInteractive(undefined, undefined, true);
    object.setData("slotOwner", this).setData("slotIndex", index);
    this.registerToken(object, null);
  }
  updateToken(object: Phaser.GameObjects.Rectangle, id: string | null): void { object.setData("fragmentId", id); }
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
