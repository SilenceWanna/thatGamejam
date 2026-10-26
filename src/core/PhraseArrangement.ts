/** 槽位与答案独立保存；移动已有片段会交换位置，不会生成重复片段。 */
export class PhraseArrangement {
  private readonly fragmentIds: Set<string>;
  private readonly answer: readonly string[];
  private readonly slots: (string | null)[];

  /** 读取 correctOrder 作为唯一答案，并创建同数量的空槽位。 */
  constructor(correctOrder: readonly string[]) {
    if (correctOrder.length === 0 || new Set(correctOrder).size !== correctOrder.length) {
      throw new Error("答案必须包含互不重复的片段 ID。");
    }
    this.answer = [...correctOrder];
    this.fragmentIds = new Set(correctOrder);
    this.slots = correctOrder.map(() => null);
  }

  /** 返回玩家当前排列的副本，避免界面直接修改槽位绕过放入/交换规则。 */
  get values(): readonly (string | null)[] { return [...this.slots]; }
  /** 所有槽位有片段时才允许演奏完整排列或提交答案。 */
  get isFilled(): boolean { return this.slots.every(id => id !== null); }
  /** 逐槽比对正确顺序；任意空槽或位置错误都不能通关。 */
  get isCorrect(): boolean { return this.slots.every((id, index) => id === this.answer[index]); }
  /** 生成本次答题的逐槽正误标记，供下一轮显示微弱的位置提示。 */
  get correctPositions(): readonly boolean[] { return this.slots.map((id, index) => id === this.answer[index]); }

  /** 放入片段；若片段已在其他槽位则交换，避免同一片段出现两次。 */
  place(fragmentId: string, targetIndex: number): void {
    if (!this.fragmentIds.has(fragmentId)) throw new Error(`未知片段：${fragmentId}`);
    this.checkIndex(targetIndex);
    const previousIndex = this.slots.indexOf(fragmentId);
    if (previousIndex === targetIndex) return;
    if (previousIndex >= 0) this.slots[previousIndex] = this.slots[targetIndex];
    this.slots[targetIndex] = fragmentId;
  }

  /** 清空指定槽位，把该片段从当前排列中移除；不影响已收集状态。 */
  remove(index: number): void { this.checkIndex(index); this.slots[index] = null; }
  /** 清空整条排列，不返还已使用的模糊回忆机会。 */
  clear(): void { this.slots.fill(null); }

  private checkIndex(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.slots.length) throw new Error("槽位超出范围。");
  }
}
