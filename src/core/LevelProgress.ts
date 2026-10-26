export type LevelPhase = "exploring" | "returning" | "arranging" | "completed" | "failed";

/** 收集与通关规则只维护 ID 和状态，不持有精灵、音频或浏览器对象。 */
export class LevelProgress {
  private readonly requiredIds: Set<string>;
  private readonly collectedIds = new Set<string>();
  private currentPhase: LevelPhase = "exploring";
  private failedAttempts = 0;
  private heardThisAttempt = false;
  private revealed = false;

  constructor(fragmentIds: readonly string[], readonly maxAttempts = 3, private readonly unlimitedAfterExhaustion = false) {
    if (fragmentIds.length === 0 || new Set(fragmentIds).size !== fragmentIds.length) {
      throw new Error("关卡片段 ID 必须非空且唯一。");
    }
    this.requiredIds = new Set(fragmentIds);
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1) throw new Error("尝试次数必须为正整数。");
  }

  get phase(): LevelPhase { return this.currentPhase; }
  get count(): number { return this.collectedIds.size; }
  get total(): number { return this.requiredIds.size; }
  get allCollected(): boolean { return this.count === this.total; }
  get fragmentsRevealed(): boolean { return this.revealed; }
  get attemptsRemaining(): number { return Math.max(0, this.maxAttempts - this.failedAttempts); }
  get attemptNumber(): number { return this.failedAttempts + 1; }
  get referenceUsedThisAttempt(): boolean { return this.heardThisAttempt; }
  /** 点表示本轮及未来轮次还可使用的回忆：听过本轮后立刻空一颗，答错不会重复扣。 */
  get referencesRemaining(): number { return Math.max(0, this.attemptsRemaining - Number(this.heardThisAttempt)); }
  get canHearReference(): boolean { return this.currentPhase === "arranging" && !this.heardThisAttempt && this.attemptsRemaining > 0; }
  hasCollected(id: string): boolean { return this.collectedIds.has(id); }

  collect(id: string): boolean {
    if (this.currentPhase !== "exploring" || !this.revealed || !this.requiredIds.has(id) || this.collectedIds.has(id)) return false;
    this.collectedIds.add(id);
    if (this.allCollected) this.currentPhase = "returning";
    return true;
  }

  revealFragments(): boolean {
    if (this.currentPhase !== "exploring" || this.revealed) return false;
    this.revealed = true;
    return true;
  }

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

  enterSpawnPoint(): boolean {
    if (this.currentPhase !== "returning") return false;
    this.currentPhase = "arranging";
    return true;
  }

  leaveArrangement(): void {
    if (this.currentPhase === "arranging") this.currentPhase = "returning";
  }

  complete(isCorrect: boolean): boolean {
    if (this.currentPhase !== "arranging" || !isCorrect) return false;
    this.currentPhase = "completed";
    return true;
  }
}
