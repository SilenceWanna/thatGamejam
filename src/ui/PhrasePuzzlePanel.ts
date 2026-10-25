import Phaser from "phaser";
import type { LevelDefinition } from "../content/types";
import { PhraseArrangement } from "../core/PhraseArrangement";
import type { AudioService } from "../audio/AudioService";
import { colorNumber, drawNote } from "../game/art/assetImages";
import { modalRoot, UiButton, uiText, SERIF_FONT } from "./components";

/** 这里只负责交互和表现；排列的合法性、交换和答案比较由纯逻辑对象处理。 */
export class PhrasePuzzlePanel {
  private readonly root: Phaser.GameObjects.Container;
  private readonly cards: Phaser.GameObjects.Graphics[] = [];
  private readonly slots: Phaser.GameObjects.Container[] = [];
  private readonly arrangement: PhraseArrangement;
  private readonly message: Phaser.GameObjects.Text;
  private readonly playButton: UiButton;
  private readonly submitButton: UiButton;
  private selectedId: string | null = null;
  private playingIndex: number | null = null;
  private locked = false;

  constructor(private readonly scene: Phaser.Scene, private readonly level: LevelDefinition, private readonly audio: AudioService, onClose: () => void, private readonly onCorrect: () => void) {
    this.arrangement = new PhraseArrangement(level.puzzle.correctOrder);
    this.root = modalRoot(scene, 1016, 600).setDepth(90);
    const eyebrow = uiText(scene, 184, 87, "旋律工坊   /   THE MELODY ROOM", 12, "#8b987f");
    const title = uiText(scene, 184, 120, "把声音放回它的位置", 30).setFontFamily(SERIF_FONT);
    const hint = uiText(scene, 184, 173, "试听片段 → 点击卡片选择 → 点击下方位置放入。已放入的片段可以交换。", 14, "#7b8873");
    const close = new UiButton(scene, 1090, 96, 42, 32, "×", onClose);
    this.root.add([eyebrow, title, hint, close.root]);
    if (level.puzzle.allowReferencePlayback) {
      const reference = new UiButton(scene, 991, 141, 196, 36, "♪  聆听完整乐句", () => this.listen([level.puzzle.fullPhraseAudioKey]));
      this.root.add(reference.root);
    }
    this.createLibrary();
    const slotHeading = uiText(scene, 184, 366, "你的旋律", 14, "#6d7e65");
    const slotHint = uiText(scene, 1090, 367, "点击选中 · 再次点击移除", 12, "#9aa28e").setOrigin(1, 0);
    this.root.add([slotHeading, slotHint]);
    for (let index = 0; index < level.fragments.length; index++) {
      const slot = scene.add.container(this.rowX(index), 453);
      this.slots.push(slot);
      this.root.add(slot);
    }
    this.message = uiText(scene, 640, 537, "每一段声音，都有属于它的位置。", 14, "#8a947d").setOrigin(0.5);
    const clear = new UiButton(scene, 263, 603, 146, 44, "清空排列", () => {
      if (this.locked) return;
      audio.stopPhrase(); this.arrangement.clear(); this.selectedId = null; this.refresh();
      this.setMessage("已经清空，重新听听看。", false);
    });
    this.playButton = new UiButton(scene, 451, 603, 188, 44, "♪  试听当前排列", () => {
      const keys = this.arrangement.values.filter((id): id is string => id !== null).map(id => this.fragment(id).audioKey);
      this.listen(keys, true);
    });
    const stop = new UiButton(scene, 642, 603, 150, 44, "停止试听", () => audio.stopPhrase());
    this.submitButton = new UiButton(scene, 934, 603, 286, 48, "提交这段旋律  →", () => this.submit(), true);
    this.root.add([this.message, clear.root, this.playButton.root, stop.root, this.submitButton.root]);
    this.refresh();
  }

  setVisible(visible: boolean): void { this.root.setVisible(visible); }
  destroy(): void { this.audio.stopPhrase(); this.root.destroy(); }

  private createLibrary(): void {
    this.level.fragments.forEach((fragment, index) => {
      const card = this.scene.add.graphics().setPosition(this.rowX(index), 274);
      const note = this.scene.add.graphics().setPosition(this.rowX(index) - 45, 253);
      drawNote(note, colorNumber(fragment.color), 0, 0, 1.1);
      const label = uiText(this.scene, this.rowX(index) + 11, 251, fragment.label, 20).setOrigin(0.5);
      const selectArea = this.scene.add.rectangle(this.rowX(index), 258, 194, 76, 0, 0).setInteractive({ useHandCursor: true });
      selectArea.on("pointerdown", () => {
        if (this.locked) return;
        this.selectedId = this.selectedId === fragment.id ? null : fragment.id;
        this.audio.playEffect("click");
        this.refresh();
      });
      const listen = new UiButton(this.scene, this.rowX(index), 310, 150, 30, "♪  试听片段", () => this.listen([fragment.audioKey]));
      this.cards.push(card);
      this.root.add([card, note, label, selectArea, listen.root]);
    });
  }

  private refresh(): void {
    this.cards.forEach((card, index) => {
      const selected = this.level.fragments[index].id === this.selectedId;
      card.clear().fillStyle(selected ? 0xe8ecda : 0xf0f1e6).fillRoundedRect(-99, -59, 198, 120, 10);
      card.lineStyle(selected ? 2 : 1, selected ? 0x718a64 : 0xd4dac7).strokeRoundedRect(-99, -59, 198, 120, 10);
    });
    this.slots.forEach((slot, index) => {
      slot.removeAll(true);
      const id = this.arrangement.values[index];
      const graphic = this.scene.add.graphics();
      graphic.fillStyle(this.playingIndex === index ? 0xe5ebd4 : 0xfaf8ee).fillRoundedRect(-99, -48, 198, 96, 9);
      graphic.lineStyle(this.playingIndex === index ? 2 : 1, this.playingIndex === index ? 0x8b9e6c : 0xc7d0b9).strokeRoundedRect(-99, -48, 198, 96, 9);
      const number = uiText(this.scene, -83, -35, String(index + 1).padStart(2, "0"), 10, "#a0aa93");
      const label = uiText(this.scene, 0, 8, id ? this.fragment(id).label : "＋ 放入片段", id ? 20 : 14, id ? "#4f6654" : "#a0aa93").setOrigin(0.5);
      if (id) drawNote(graphic, colorNumber(this.fragment(id).color), 0, -21, 0.6);
      const hit = this.scene.add.rectangle(0, 0, 198, 96, 0, 0).setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => this.clickSlot(index));
      slot.add([graphic, number, label, hit]);
    });
    this.playButton?.setEnabled(this.arrangement.isFilled && !this.locked);
    this.submitButton?.setEnabled(this.arrangement.isFilled && !this.locked);
  }

  private clickSlot(index: number): void {
    if (this.locked) return;
    this.audio.stopPhrase();
    const existing = this.arrangement.values[index];
    if (this.selectedId) {
      if (existing === this.selectedId) this.arrangement.remove(index);
      else this.arrangement.place(this.selectedId, index);
      this.selectedId = null;
    } else if (existing) this.selectedId = existing;
    else { this.setMessage("先选择上方的一张片段卡片。", false); return; }
    this.audio.playEffect("click");
    this.setMessage(this.arrangement.isFilled ? "旋律已经排好，可以试听或提交。" : "选好片段后，点击一个位置放入。", false);
    this.refresh();
  }

  private listen(keys: readonly string[], highlight = false): void {
    if (this.locked) return;
    this.audio.playSequence(keys, index => {
      this.playingIndex = highlight ? index : null;
      this.refresh();
    });
  }

  private submit(): void {
    if (!this.arrangement.isFilled || this.locked) return;
    this.audio.stopPhrase();
    if (!this.arrangement.isCorrect) {
      this.audio.playEffect("incorrect");
      this.setMessage("还差一点点。再听听片段之间的连接，换个顺序试试。", true);
      return;
    }
    this.locked = true;
    this.refresh();
    this.onCorrect();
  }

  private setMessage(text: string, error: boolean): void { this.message.setText(text).setColor(error ? "#ad7471" : "#8a947d"); }
  private fragment(id: string) { return this.level.fragments.find(fragment => fragment.id === id)!; }
  private rowX(index: number): number { return 640 + (index - (this.level.fragments.length - 1) / 2) * 224; }
}
