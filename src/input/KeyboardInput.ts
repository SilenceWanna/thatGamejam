import type { InputSource, PlayerInput } from "./InputSource";

/** 用按下边沿触发跳跃，长按空格不会自动连续跳。失焦后主动清空按键。 */
export class KeyboardInput implements InputSource {
  private readonly held = new Set<string>();
  private jumpQueued = false;
  private revealQueued = false;
  private interactQueued = false;
  /** A/D 或方向键持续移动；Space/F/E 只在首次按下排队一次，长按不重复跳跃、显现或收集。 */
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (["KeyA", "KeyD", "Space", "ArrowLeft", "ArrowRight", "KeyF", "KeyE"].includes(event.code)) event.preventDefault();
    if (event.code === "Space" && !event.repeat && !this.held.has("Space")) this.jumpQueued = true;
    if (event.code === "KeyF" && !event.repeat && !this.held.has("KeyF")) this.revealQueued = true;
    if (event.code === "KeyE" && !event.repeat && !this.held.has("KeyE")) this.interactQueued = true;
    this.held.add(event.code);
  };
  /** 释放按键后解除持续移动，并允许下一次 Space/F/E 再次触发。 */
  private readonly onKeyUp = (event: KeyboardEvent): void => { this.held.delete(event.code); };
  /** 失焦时清除所有按键，防止返回窗口后角色持续行走。 */
  private readonly onBlur = (): void => { this.reset(); };

  /** 进入关卡时绑定原生键盘和失焦事件，将设备输入转成统一游戏动作。 */
  constructor() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
  }

  /** 每个游戏帧读取移动方向与一次性动作，并消费跳跃/显现/交互队列。 */
  sample(): PlayerInput {
    const input = {
      moveAxis: Number(this.held.has("KeyD") || this.held.has("ArrowRight")) - Number(this.held.has("KeyA") || this.held.has("ArrowLeft")),
      jumpPressed: this.jumpQueued,
      revealPressed: this.revealQueued,
      interactPressed: this.interactQueued
    };
    this.jumpQueued = false;
    this.revealQueued = false;
    this.interactQueued = false;
    return input;
  }

  /** 暂停、转场或失焦时清空持续按键和所有未执行动作。 */
  reset(): void { this.held.clear(); this.jumpQueued = false; this.revealQueued = false; this.interactQueued = false; }
  /** 离开关卡时解绑键盘事件，避免重开后一次按键触发多次。 */
  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.reset();
  }
}
