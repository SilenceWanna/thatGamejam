export type LevelPhase = "exploring" | "returning" | "arranging" | "completed" | "failed";

/** 收集与通关规则只维护 ID 和状态，不持有精灵、音频或浏览器对象。 */
export class LevelProgress {
  private readonly requiredIds: Set<string>;
  private readonly collectedIds = new Set<string>();
  private currentPhase: LevelPhase = "exploring";
  private failedAttempts = 0;
  private heardThisAttempt = false;
  private revealed = false;

  /** 创建一局独立进度：登记必收片段与最大尝试数；重开时创建新实例，恢复初始机会。 */
  constructor(fragmentIds: readonly string[], readonly maxAttempts = 3, private readonly unlimitedAfterExhaustion = false) {
    if (fragmentIds.length === 0 || new Set(fragmentIds).size !== fragmentIds.length) {
      throw new Error("关卡片段 ID 必须非空且唯一。");
    }
    this.requiredIds = new Set(fragmentIds);
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1) throw new Error("尝试次数必须为正整数。");
  }

  /** 当前玩法阶段：探索、集齐返回、排序、已还原或失败；与场景演出状态分开。 */
  get phase(): LevelPhase { return this.currentPhase; }
  /** 本轮已经收集的不同片段数量，重复拾取不会累计。 */
  get count(): number { return this.collectedIds.size; }
  /** 本关要求收集的片段总数，由关卡的片段 ID 列表决定。 */
  get total(): number { return this.requiredIds.size; }
  /** 是否已集齐本关所有片段；这是返回出生点进入排序的前提。 */
  get allCollected(): boolean { return this.count === this.total; }
  /** 本轮是否已按 F 显现；答错后重新变为 false。 */
  get fragmentsRevealed(): boolean { return this.revealed; }
  /** 剩余答题次数：只有错误提交扣除，听提示本身不会减少答题次数。 */
  get attemptsRemaining(): number { return Math.max(0, this.maxAttempts - this.failedAttempts); }
  /** 当前是第几轮还原，用于音序器标题；错误提交后递增。 */
  get attemptNumber(): number { return this.failedAttempts + 1; }
  /** 本轮是否已听模糊回忆；关闭排序再进入不会重置。 */
  get referenceUsedThisAttempt(): boolean { return this.heardThisAttempt; }
  /** 点表示本轮及未来轮次还可使用的回忆：听过本轮后立刻空一颗，答错不会重复扣。 */
  get referencesRemaining(): number { return Math.max(0, this.attemptsRemaining - Number(this.heardThisAttempt)); }
  /** 仅在排序阶段且本轮尚未听过、仍有尝试时，允许播放模糊原乐句。 */
  get canHearReference(): boolean { return this.currentPhase === "arranging" && !this.heardThisAttempt && this.attemptsRemaining > 0; }
  /** 查询某个片段本轮是否已收集，供 HUD 绘制对应的空罐/满罐。 */
  hasCollected(id: string): boolean { return this.collectedIds.has(id); }

  /** 只在已显现的探索阶段接收合法且未收集的 ID；集齐后切换到等待返回起点。 */
  collect(id: string): boolean {
    if (this.currentPhase !== "exploring" || !this.revealed || !this.requiredIds.has(id) || this.collectedIds.has(id)) return false;
    this.collectedIds.add(id);
    if (this.allCollected) this.currentPhase = "returning";
    return true;
  }

  /** 本轮首次显现开关；返回 false 表示当前不能显现或已经显现过。 */
  revealFragments(): boolean {
    if (this.currentPhase !== "exploring" || this.revealed) return false;
    this.revealed = true;
    return true;
  }

  /** 确认模糊回忆成功开始播放后消耗本轮额度；实心圆点随即减少一颗。 */
  useReference(): boolean {
    if (!this.canHearReference) return false;
    this.heardThisAttempt = true;
    return true;
  }

  /** 新要求覆盖原策划的无限重试：失败后所有声音复位，必须重新施放显现并收集。 */
  failArrangement(): boolean {
    if (this.currentPhase !== "arranging") return false;
    this.failedAttempts++;
    this.heardThisAttempt = false;
    this.collectedIds.clear();
    this.revealed = false;
    this.currentPhase = this.attemptsRemaining > 0 || this.unlimitedAfterExhaustion ? "exploring" : "failed";
    return true;
  }

  /** 已集齐并返回起点时进入排序；没集齐或重复进入均返回 false。 */
  enterSpawnPoint(): boolean {
    if (this.currentPhase !== "returning") return false;
    this.currentPhase = "arranging";
    return true;
  }

  /** 离开音序器回到等待返回状态，保留收集、尝试数和本轮回忆额度。 */
  leaveArrangement(): void {
    if (this.currentPhase === "arranging") this.currentPhase = "returning";
  }

  /** 仅接受排序阶段的正确答案，将规则标记为已还原；天气演出和走出关卡由场景继续完成。 */
  complete(isCorrect: boolean): boolean {
    if (this.currentPhase !== "arranging" || !isCorrect) return false;
    this.currentPhase = "completed";
    return true;
  }
}
