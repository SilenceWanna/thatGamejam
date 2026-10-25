import type { InputSource, PlayerInput } from "./InputSource";

/** 用按下边沿触发跳跃，长按空格不会自动连续跳。失焦后主动清空按键。 */
export class KeyboardInput implements InputSource {
  private readonly held = new Set<string>();
  private jumpQueued = false;
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (["KeyA", "KeyD", "Space"].includes(event.code)) event.preventDefault();
    if (event.code === "Space" && !event.repeat && !this.held.has("Space")) this.jumpQueued = true;
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
    const input = { moveAxis: Number(this.held.has("KeyD")) - Number(this.held.has("KeyA")), jumpPressed: this.jumpQueued };
    this.jumpQueued = false;
    return input;
  }

  reset(): void { this.held.clear(); this.jumpQueued = false; }
  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    this.reset();
  }
}
