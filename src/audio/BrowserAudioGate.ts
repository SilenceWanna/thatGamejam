/** 浏览器可能在用户点击前暂停声音；只在原生输入事件里请求解锁，播放前等待确认。 */
export class BrowserAudioGate {
  private destroyed = false;
  private readonly events = ["pointerdown", "pointerup", "keydown"];
  /** 原生事件立即调用 resume，保留 Safari 要求的用户手势上下文。 */
  private readonly onGesture = (): void => { void this.ensureReady(); };

  /** 注入最小接口，便于独立验证浏览器拒绝、延迟恢复和退出时的行为。 */
  constructor(private readonly context: Pick<AudioContext, "state" | "resume"> | null,
    private readonly target: EventTarget = document, private readonly timeoutMs = 1800) {
    for (const event of this.events) target.addEventListener(event, this.onGesture, true);
  }

  /** 等待声音真正运行；拒绝或超时返回 false，调用方不能把这次操作当成已经听过。 */
  async ensureReady(): Promise<boolean> {
    if (this.destroyed) return false;
    if (!this.context || this.context.state === "running") return true;
    if (this.context.state === "closed") return false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // 必须在第一次 await 之前调用，不能把解锁请求推迟到游戏帧或定时器。
      const resumed = this.context.resume().then(() => this.context?.state === "running");
      const timeout = new Promise<false>(resolve => { timer = setTimeout(() => resolve(false), this.timeoutMs); });
      return await Promise.race([resumed, timeout]) && !this.destroyed;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  /** 退出或重开关卡时移除原生监听，并阻止旧异步请求继续播放。 */
  destroy(): void {
    this.destroyed = true;
    for (const event of this.events) this.target.removeEventListener(event, this.onGesture, true);
  }
}
