import Phaser from "phaser";
import type { LevelContent } from "../content/types";
import type { LevelProgress } from "../core/LevelProgress";
import { PhraseArrangement } from "../core/PhraseArrangement";
import type { AudioService } from "../audio/AudioService";
import { colorNumber, createAssetImage, drawJar } from "../game/art/assetImages";
import { modalRoot, UiButton, uiText, SERIF_FONT } from "./components";
import { AttemptIndicator } from "./AttemptIndicator";
import { PhraseDragController } from "./PhraseDragController";

interface SlotView {
  root: Phaser.GameObjects.Container;
  art: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  hit: Phaser.GameObjects.Rectangle;
}

/** 点击和拖拽只改变纯排列数据；回忆额度保存在关卡状态，关闭面板无法刷新额度。 */
export class PhrasePuzzlePanel {
  private readonly root: Phaser.GameObjects.Container;
  private readonly cards: Phaser.GameObjects.Graphics[] = [];
  private readonly slots: SlotView[] = [];
  private readonly arrangement: PhraseArrangement;
  private readonly message: Phaser.GameObjects.Text;
  private readonly playButton: UiButton;
  private readonly submitButton: UiButton;
  private readonly referenceButton?: UiButton;
  private readonly indicator: AttemptIndicator;
  private readonly dragging: PhraseDragController;
  private selectedId: string | null = null;
  private playingIndex: number | null = null;
  private locked = false;

  constructor(private readonly scene: Phaser.Scene, private readonly content: LevelContent, private readonly progress: LevelProgress,
    private readonly audio: AudioService, private readonly knownCorrectSlots: readonly boolean[], onClose: () => void,
    private readonly onCorrect: () => void, private readonly onIncorrect: (correctPositions: readonly boolean[]) => void) {
    const level = content.level;
    this.arrangement = new PhraseArrangement(level.puzzle.correctOrder);
    this.root = modalRoot(scene, 1040, 620).setDepth(90);
    this.dragging = new PhraseDragController(scene, level.fragments, () => !this.locked && this.root.visible, (id, index) => this.place(id, index));
    scene.input.dragDistanceThreshold = 8;
    this.indicator = new AttemptIndicator(scene, 181, 108);
    const eyebrow = uiText(scene, 176, 73, "瓶中小调   /   MELODY IN A JAR", 11, "#8b987f");
    const title = uiText(scene, 176, 138, "把春天装回它的节拍", 28).setFontFamily(SERIF_FONT);
    const hint = uiText(scene, 176, 184, "拖动声音罐，或点击选择再放入。每轮可听一次模糊回忆；答错后需重新显现并收集。", 13, "#7b8873");
    const close = new UiButton(scene, 1100, 89, 40, 30, "×", onClose);
    this.root.add([eyebrow, this.indicator.root, title, hint, close.root]);
    if (level.puzzle.allowReferencePlayback) {
      this.referenceButton = new UiButton(scene, 990, 141, 210, 38, "♪  听原乐句（模糊）", () => this.hearReference());
      this.root.add(this.referenceButton.root);
    }
    this.createLibrary();
    const heading = uiText(scene, 184, 365, `四拍音序器   ·   ${level.puzzle.bpm} BPM   ·   第 ${progress.attemptNumber} 次还原`, 13, "#6d7e65");
    const hintText = uiText(scene, 1090, 367, "可交换 · 再次点击已选槽位可移除", 11, "#9aa28e").setOrigin(1, 0);
    this.root.add([heading, hintText]);
    this.createSlots();
    this.message = uiText(scene, 640, 537, "回忆机会无法留到下一轮。先想一想，再让声音相遇。", 14, "#8a947d").setOrigin(0.5);
    const clear = new UiButton(scene, 263, 603, 146, 44, "清空排列", () => {
      if (this.locked) return;
      audio.stopPhrase(); audio.playEffect("jarReset"); this.arrangement.clear(); this.selectedId = null; this.refresh();
      this.setMessage("已经清空；本轮已消耗的回忆不会恢复。", false);
    });
    this.playButton = new UiButton(scene, 451, 603, 188, 44, "♪  按节拍演奏", () => {
      const keys = this.arrangement.values.map(id => this.fragment(id!).audioKey);
      this.listen(keys, true);
    });
    const stop = new UiButton(scene, 642, 603, 150, 44, "停止试听", () => audio.stopPhrase());
    this.submitButton = new UiButton(scene, 934, 603, 286, 48, "还原春季乐句  →", () => this.submit(), true);
    this.root.add([this.message, clear.root, this.playButton.root, stop.root, this.submitButton.root]);
    this.refresh();
  }

  setVisible(visible: boolean): void { this.root.setVisible(visible); if (visible) this.refresh(); }
  destroy(): void { this.audio.stopPhrase(); this.dragging.destroy(); this.root.destroy(); }

  private createLibrary(): void {
    this.content.level.fragments.forEach((fragment, index) => {
      const x = this.rowX(index);
      const card = this.scene.add.graphics().setPosition(x, 274);
      const icon = this.scene.add.graphics();
      const image = createAssetImage(this.scene, this.content, "jar", x - 47, 255, 30, 39);
      if (!image) drawJar(icon, colorNumber(fragment.color), x - 47, 255, 0.85);
      const label = uiText(this.scene, x + 14, 253, fragment.label, 20).setOrigin(0.5);
      const hit = this.scene.add.rectangle(x, 258, 194, 76, 0, 0).setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => {
        if (this.locked) return;
        this.selectedId = this.selectedId === fragment.id ? null : fragment.id;
        this.audio.playEffect("click"); this.refresh();
      });
      this.dragging.registerToken(hit, fragment.id);
      const listen = new UiButton(this.scene, x, 310, 150, 30, "♪  试听声音罐", () => this.listen([fragment.audioKey]));
      this.cards.push(card);
      this.root.add([card, icon, label, hit, listen.root]);
      if (image) this.root.add(image);
    });
  }

  private createSlots(): void {
    this.content.level.fragments.forEach((_, index) => {
      const art = this.scene.add.graphics();
      const label = uiText(this.scene, 0, 14, "", 18).setOrigin(0.5);
      const number = uiText(this.scene, -83, -35, String(index + 1).padStart(2, "0"), 10, "#a0aa93");
      const hit = this.scene.add.rectangle(0, 0, 198, 96, 0, 0).setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => this.clickSlot(index));
      this.dragging.registerSlot(hit, index);
      const root = this.scene.add.container(this.rowX(index), 453, [art, number, label, hit]);
      this.slots.push({ root, art, label, hit });
      this.root.add(root);
    });
  }

  private refresh(): void {
    this.indicator.refresh(this.progress);
    this.referenceButton?.setEnabled(this.progress.canHearReference && !this.locked)
      .setLabel(this.progress.referenceUsedThisAttempt ? "本轮回忆已使用" : this.progress.attemptsRemaining === 0 ? "回忆机会已用完" : "♪  听原乐句（模糊）");
    this.cards.forEach((card, index) => {
      const selected = this.content.level.fragments[index].id === this.selectedId;
      card.clear().fillStyle(selected ? 0xe8ecda : 0xf0f1e6).fillRoundedRect(-99, -59, 198, 120, 10);
      card.lineStyle(selected ? 2 : 1, selected ? 0x718a64 : 0xd4dac7).strokeRoundedRect(-99, -59, 198, 120, 10);
    });
    this.slots.forEach((slot, index) => {
      const id = this.arrangement.values[index];
      const active = this.playingIndex === index;
      slot.art.clear().fillStyle(active ? 0xe5ebd4 : 0xfaf8ee).fillRoundedRect(-99, -48, 198, 96, 9);
      slot.art.lineStyle(active ? 2 : 1, active ? 0x8b9e6c : 0xc7d0b9).strokeRoundedRect(-99, -48, 198, 96, 9);
      if (this.knownCorrectSlots[index]) slot.art.fillStyle(0xadc58b, 0.48).fillCircle(81, -32, 4);
      if (id) drawJar(slot.art, colorNumber(this.fragment(id).color), 0, -20, 0.55);
      slot.label.setText(id ? this.fragment(id).label : "＋ 放入声音罐").setColor(id ? "#4f6654" : "#a0aa93").setFontSize(id ? 18 : 13);
      this.dragging.updateToken(slot.hit, id);
    });
    this.playButton?.setEnabled(this.arrangement.isFilled && !this.locked);
    this.submitButton?.setEnabled(this.arrangement.isFilled && !this.locked);
  }

  private clickSlot(index: number): void {
    if (this.locked) return;
    const existing = this.arrangement.values[index];
    if (this.selectedId) {
      if (existing === this.selectedId) { this.audio.stopPhrase(); this.audio.playEffect("jarRemove"); this.arrangement.remove(index); this.selectedId = null; this.refresh(); }
      else this.place(this.selectedId, index);
    } else if (existing) { this.selectedId = existing; this.refresh(); }
    else this.setMessage("先选择或拖动上方的一只声音罐。", false);
  }

  private place(id: string, index: number): void {
    this.audio.stopPhrase();
    this.arrangement.place(id, index);
    this.selectedId = null;
    this.audio.playEffect("jarPlace");
    this.setMessage(this.arrangement.isFilled ? "四拍已就绪，可以演奏或提交。" : "风、雨、萌芽、归鸟，都在等待自己的节拍。", false);
    this.refresh();
  }

  private hearReference(): void {
    if (!this.progress.canHearReference || this.locked) return;
    if (!this.audio.playSequence([this.content.level.puzzle.memoryPhraseAudioKey])) {
      this.setMessage("模糊回忆素材未加载，本次机会没有消耗。", true); return;
    }
    this.progress.useReference();
    this.setMessage("这是模糊的记忆。本轮不能再次播放原乐句。", false);
    this.refresh();
  }

  private listen(keys: readonly string[], highlight = false): void {
    if (this.locked) return;
    this.audio.playSequence(keys, index => { this.playingIndex = highlight ? index : null; this.refresh(); }, highlight ? this.content.level.puzzle : undefined);
  }

  private submit(): void {
    if (!this.arrangement.isFilled || this.locked) return;
    this.audio.stopPhrase(); this.locked = true; this.refresh();
    if (this.arrangement.isCorrect) this.onCorrect();
    else this.onIncorrect(this.arrangement.correctPositions);
  }

  private setMessage(text: string, error: boolean): void { this.message.setText(text).setColor(error ? "#ad7471" : "#8a947d"); }
  private fragment(id: string) { return this.content.level.fragments.find(fragment => fragment.id === id)!; }
  private rowX(index: number): number { return 640 + (index - (this.content.level.fragments.length - 1) / 2) * 224; }
}
