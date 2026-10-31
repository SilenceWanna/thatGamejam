export type LevelPhase = "exploring" | "completed" | "failed";

/** 与引擎无关的关卡规则：收集、提示次数和演奏次数分别记录。 */
export class LevelProgress {
  private readonly requiredIds: Set<string>;
  private readonly collectedIds = new Set<string>();
  private currentPhase: LevelPhase = "exploring";
  private revealed = false;
  private referenceUses = 0;
  private performances = 0;

  /** 新开一局：四只瓶子均为满状态，提示与演奏各有独立的三次额度。 */
  constructor(fragmentIds: readonly string[], readonly maxAttempts = 3, readonly maxReferences = 3) {
    if (!fragmentIds.length || new Set(fragmentIds).size !== fragmentIds.length) throw new Error("片段 ID 必须非空且唯一。");
    if (![maxAttempts, maxReferences].every(n => Number.isInteger(n) && n > 0)) throw new Error("次数必须为正整数。");
    this.requiredIds = new Set(fragmentIds);
  }

  get phase(): LevelPhase { return this.currentPhase; }
  get count(): number { return this.collectedIds.size; }
  get total(): number { return this.requiredIds.size; }
  get allCollected(): boolean { return this.count === this.total; }
  get fragmentsRevealed(): boolean { return this.revealed; }
  get attemptsRemaining(): number { return Math.max(0, this.maxAttempts - this.performances); }
  get referencesRemaining(): number { return Math.max(0, this.maxReferences - this.referenceUses); }
  get canHearReference(): boolean { return this.currentPhase === "exploring" && this.referencesRemaining > 0; }
  get canPerform(): boolean { return this.currentPhase === "exploring" && this.allCollected && this.attemptsRemaining > 0; }
  hasCollected(id: string): boolean { return this.collectedIds.has(id); }

  /** F 一次显现全部互动点；演奏错误不重新隐藏或清除已收集的声音。 */
  revealFragments(): boolean {
    if (this.currentPhase !== "exploring" || this.revealed) return false;
    this.revealed = true;
    return true;
  }

  /** 只有显现后按 E 收集合法且未重复的声音；集齐无需返回出生点。 */
  collect(id: string): boolean {
    if (this.currentPhase !== "exploring" || !this.revealed || !this.requiredIds.has(id) || this.collectedIds.has(id)) return false;
    this.collectedIds.add(id);
    return true;
  }

  /** 成功开始播放一次模糊提示后扣次数，可在同一轮连续使用，与演奏次数独立。 */
  useReference(): boolean {
    if (!this.canHearReference) return false;
    this.referenceUses++;
    return true;
  }

  /** 完整演奏后消耗一次机会：最后一次正确优先成功；错误且瓶量耗空时失败。 */
  perform(isCorrect: boolean): boolean {
    if (!this.canPerform) return false;
    this.performances++;
    if (isCorrect) this.currentPhase = "completed";
    else if (this.attemptsRemaining === 0) this.currentPhase = "failed";
    return true;
  }
}
