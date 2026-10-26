import type { InputSource, PlayerInput } from "./InputSource";

/** 用按下边沿触发跳跃，长按空格不会自动连续跳。失焦后主动清空按键。 */
export class KeyboardInput implements InputSource {
  private readonly held = new Set<string>();
  private jumpQueued = false;
  private revealQueued = false;
  private interactQueued = false;
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (["KeyA", "KeyD", "Space", "ArrowLeft", "ArrowRight", "KeyF", "KeyE"].includes(event.code)) event.preventDefault();
    if (event.code === "Space" && !event.repeat && !this.held.has("Space")) this.jumpQueued = true;
    if (event.code === "KeyF" && !event.repeat && !this.held.has("KeyF")) this.revealQueued = true;
    if (event.code === "KeyE" && !event.repeat && !this.held.has("KeyE")) this.interactQueued = true;
    this.held.add(event.code);
  };
  private readonly onKeyUp = (event: KeyboardEvent): void => { this.held.delete(event.code); };
  private readonly onBlur = (): void => { this.reset(); };

  constructor() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
  }

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

  reset(): void { this.held.clear(); this.jumpQueued = false; this.revealQueued = false; this.interactQueued = false; }
  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.reset();
  }
}
