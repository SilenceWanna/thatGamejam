import Phaser from "phaser";
import type { LevelContent } from "../content/types";
import type { LevelProgress } from "../core/LevelProgress";
import { PhraseArrangement } from "../core/PhraseArrangement";
import type { AudioService } from "../audio/AudioService";
import { createAssetImage } from "../game/art/assetImages";
import { JarView, type JarVisualState } from "../game/art/JarView";
import { UiButton } from "./components";
import { PhraseDragController } from "./PhraseDragController";

/** 常驻声音库及四拍音序器；所有位置从关卡 JSON 读取。 */
export class LiveMusicPanel {
  private readonly root: Phaser.GameObjects.Container;
  private readonly arrangement: PhraseArrangement;
  private readonly dragging: PhraseDragController;
  private readonly library: { id: string; jar: JarView }[] = [];
  private readonly slots: { jar: JarView; hit: Phaser.GameObjects.Rectangle }[] = [];
  private readonly hint: UiButton;
  private readonly play: UiButton;
  private selected: string | null = null;
  private locked = false;
  private referencePlaying = false;
  private destroyed = false;
  constructor(scene: Phaser.Scene, private readonly content: LevelContent, private readonly progress: LevelProgress,
    private readonly audio: AudioService, private readonly onResult: (correct: boolean) => void,
    private readonly onAudioInteraction: () => void) {
    const layout = content.level.art!.ui;
    this.root = scene.add.container(0, 0).setDepth(20);
    this.arrangement = new PhraseArrangement(content.level.puzzle.correctOrder);
    this.dragging = new PhraseDragController(scene, content, () => !this.locked && this.progress.phase === "exploring", (id, i) => this.place(id, i), () => this.jarState(), id => this.progress.hasCollected(id));
    scene.input.dragDistanceThreshold = 8;
    for (const [name, box] of [["inventoryFrame", layout.inventory], ["sequenceBoard", layout.sequence]] as const) {
      const image = createAssetImage(scene, content, name, box.x, box.y, box.width, box.height);
      if (image) this.root.add(image);
    }
    content.level.fragments.forEach((fragment, index) => {
      const box = layout.inventory;
      const x = box.x + (index - 1.5) * box.width * 0.19;
      const jar = new JarView(scene, content, fragment, x, box.y + 3, 48, 64, "empty");
      const hit = scene.add.rectangle(x, box.y + 3, 58, 72, 0, 0).setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => { if (!this.locked && this.progress.hasCollected(fragment.id)) { this.selected = this.selected === fragment.id ? null : fragment.id; this.refresh(); } });
      hit.on("pointerup", (pointer: Phaser.Input.Pointer) => {
        if (pointer.getDistance() < scene.input.dragDistanceThreshold && !this.locked && this.progress.hasCollected(fragment.id)) this.listenToFragment(fragment.id);
      });
      this.dragging.registerToken(hit, fragment.id);
      this.library.push({ id: fragment.id, jar }); this.root.add([jar.root, hit]);
    });
    content.level.fragments.forEach((_, index) => {
      const box = layout.sequence;
      const x = box.x - box.width / 2 + [253, 490, 727, 965][index] / 1280 * box.width;
      const y = box.y - box.height / 2 + 310 / 553 * box.height;
      const jar = new JarView(scene, content, undefined, x, y, 48, 64);
      const hit = scene.add.rectangle(x, y, 57, 70, 0, 0).setInteractive({ useHandCursor: true });
      let pressedId: string | null = null;
      hit.on("pointerdown", () => { pressedId = this.arrangement.values[index]; this.clickSlot(index); });
      hit.on("pointerup", (pointer: Phaser.Input.Pointer) => {
        if (pointer.getDistance() < scene.input.dragDistanceThreshold && pressedId && !this.locked) this.listenToFragment(pressedId);
        pressedId = null;
      });
      this.dragging.registerSlot(hit, index); this.slots.push({ jar, hit }); this.root.add([jar.root, hit]);
    });
    const button = (box: typeof layout.play, image: string, fn: () => void, icon?: string) => new UiButton(scene, box.x, box.y, box.width, box.height, "", fn, false, { content, image, icon, hideLabel: true });
    this.hint = button(layout.reference, "hint3", () => { void this.hearReference(); });
    this.play = button(layout.play, "playButton", () => { void this.perform(); }, "playIcon");
    const reset = button(layout.reset, "resetButton", () => this.reset());
    this.root.add([this.hint.root, this.play.root, reset.root]);
    this.refresh();
  }
  /** 刷新瓶子的液面、已收集状态和剩余提示，不额外绘制文字面板。 */
  refresh(): void {
    const state = this.jarState();
    for (const entry of this.library) {
      entry.jar.setState(this.progress.hasCollected(entry.id) ? state : "empty");
      entry.jar.root.setAlpha(entry.id === this.selected ? 0.6 : 1);
    }
    this.slots.forEach((slot, index) => {
      const id = this.arrangement.values[index];
      slot.jar.setFragment(id ? this.fragment(id) : undefined); slot.jar.setState(state); slot.jar.root.setVisible(!!id);
      this.dragging.updateToken(slot.hit, id);
    });
    this.hint.setImage(`hint${Math.min(3, this.progress.referencesRemaining)}`).setEnabled(this.content.level.puzzle.allowReferencePlayback && this.progress.canHearReference && !this.locked && !this.referencePlaying);
    this.play.setEnabled(this.progress.canPerform && this.arrangement.isFilled && !this.locked && !this.referencePlaying);
  }
  /** 模糊提示播放期间禁用提示按钮，发声时扣一次，结束或中断后恢复。 */
  private async hearReference(): Promise<void> {
    if (!this.content.level.puzzle.allowReferencePlayback || !this.progress.canHearReference || this.locked || this.referencePlaying) return;
    this.onAudioInteraction(); this.referencePlaying = true; this.refresh();
    let charged = false;
    const charge = (): void => { if (!charged && this.progress.useReference()) charged = true; };
    const started = await this.audio.playSequence([this.content.level.puzzle.memoryPhraseAudioKey], index => {
      if (this.destroyed || index === null) return;
      charge(); this.refresh();
    }, undefined, completed => {
      if (this.destroyed) return;
      if (completed) charge();
      this.referencePlaying = false; this.refresh();
    });
    if (!started && !this.destroyed) { this.referencePlaying = false; this.refresh(); }
  }
  /** 播放完整排列，只有自然播放结束才消耗一次演奏并判定答案。 */
  private async perform(): Promise<void> {
    if (!this.progress.canPerform || !this.arrangement.isFilled || this.locked || this.referencePlaying) return;
    const correct = this.arrangement.isCorrect;
    const keys = this.arrangement.values.map(id => this.fragment(id!).audioKey);
    this.onAudioInteraction(); this.locked = true; this.refresh();
    const started = await this.audio.playSequence(keys, undefined, this.content.level.puzzle, completed => {
      if (this.destroyed) return;
      this.locked = false;
      if (completed && this.progress.perform(correct)) this.onResult(correct);
      this.refresh();
    });
    if (!started && !this.destroyed) { this.locked = false; this.refresh(); }
  }
  /** 不论关卡状态如何，重置只清空排列和选择，不改变收集、次数或季节。 */
  private reset(): void {
    if (this.locked) return;
    this.arrangement.clear(); this.selected = null; this.audio.playEffect("jarReset"); this.refresh();
  }
  /** 点击选瓶和拖放都走同一排序规则；未收集的瓶子不能放入。 */
  private place(id: string, index: number): void {
    if (this.locked || this.progress.phase !== "exploring" || !this.progress.hasCollected(id)) return;
    this.arrangement.place(id, index); this.selected = null; this.audio.playEffect("jarPlace"); this.refresh();
  }
  /** 已选瓶子放入槽位；再次点击相同槽位可移除，点击现有瓶子可选中交换。 */
  private clickSlot(index: number): void {
    if (this.locked || this.progress.phase !== "exploring") return;
    const id = this.arrangement.values[index];
    if (this.selected && this.selected === id) { this.arrangement.remove(index); this.selected = null; this.refresh(); }
    else if (this.selected) this.place(this.selected, index);
    else if (id) { this.selected = id; this.refresh(); }
  }
  /** 点击已收集瓶子时试听它的片段；拖拽、空槽和未收集瓶子不会触发。 */
  private listenToFragment(id: string): void {
    this.onAudioInteraction(); this.audio.playEffect(this.fragment(id).audioKey);
  }
  private fragment(id: string) { return this.content.level.fragments.find(fragment => fragment.id === id)!; }
  private jarState(): JarVisualState { return (["empty", "low", "half", "full"] as const)[Math.min(3, this.progress.attemptsRemaining)]; }
  /** 退出时解绑拖动监听并阻止异步音频回调操作旧界面。 */
  destroy(): void { this.destroyed = true; this.dragging.destroy(); this.root.destroy(); }
}
