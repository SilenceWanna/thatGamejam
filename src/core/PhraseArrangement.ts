/** 槽位与答案独立保存；移动已有片段会交换位置，不会生成重复片段。 */
export class PhraseArrangement {
  private readonly fragmentIds: Set<string>;
  private readonly answer: readonly string[];
  private readonly slots: (string | null)[];

  constructor(correctOrder: readonly string[]) {
    if (correctOrder.length === 0 || new Set(correctOrder).size !== correctOrder.length) {
      throw new Error("答案必须包含互不重复的片段 ID。");
    }
    this.answer = [...correctOrder];
    this.fragmentIds = new Set(correctOrder);
    this.slots = correctOrder.map(() => null);
  }

  get values(): readonly (string | null)[] { return [...this.slots]; }
  get isFilled(): boolean { return this.slots.every(id => id !== null); }
  get isCorrect(): boolean { return this.slots.every((id, index) => id === this.answer[index]); }
  get correctPositions(): readonly boolean[] { return this.slots.map((id, index) => id === this.answer[index]); }

  place(fragmentId: string, targetIndex: number): void {
    if (!this.fragmentIds.has(fragmentId)) throw new Error(`未知片段：${fragmentId}`);
    this.checkIndex(targetIndex);
    const previousIndex = this.slots.indexOf(fragmentId);
    if (previousIndex === targetIndex) return;
    if (previousIndex >= 0) this.slots[previousIndex] = this.slots[targetIndex];
    this.slots[targetIndex] = fragmentId;
  }

  remove(index: number): void { this.checkIndex(index); this.slots[index] = null; }
  clear(): void { this.slots.fill(null); }

  private checkIndex(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.slots.length) throw new Error("槽位超出范围。");
  }
}
