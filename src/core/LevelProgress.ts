export type LevelPhase = "exploring" | "returning" | "arranging" | "completed";

/** 收集与通关规则只维护 ID 和状态，不持有精灵、音频或浏览器对象。 */
export class LevelProgress {
  private readonly requiredIds: Set<string>;
  private readonly collectedIds = new Set<string>();
  private currentPhase: LevelPhase = "exploring";

  constructor(fragmentIds: readonly string[]) {
    if (fragmentIds.length === 0 || new Set(fragmentIds).size !== fragmentIds.length) {
      throw new Error("关卡片段 ID 必须非空且唯一。");
    }
    this.requiredIds = new Set(fragmentIds);
  }

  get phase(): LevelPhase { return this.currentPhase; }
  get count(): number { return this.collectedIds.size; }
  get total(): number { return this.requiredIds.size; }
  get allCollected(): boolean { return this.count === this.total; }
  hasCollected(id: string): boolean { return this.collectedIds.has(id); }

  collect(id: string): boolean {
    if (this.currentPhase !== "exploring" || !this.requiredIds.has(id) || this.collectedIds.has(id)) return false;
    this.collectedIds.add(id);
    if (this.allCollected) this.currentPhase = "returning";
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
