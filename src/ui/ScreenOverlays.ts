import Phaser from "phaser";
import { UiButton, modalRoot, SERIF_FONT, uiText } from "./components";
import { drawJar, drawNote } from "../game/art/assetImages";
import type { LevelDefinition } from "../content/types";

export class ScreenOverlays {
  private current?: Phaser.GameObjects.Container;
  private startButton?: HTMLButtonElement;
  /** 保存场景引用，统一管理开场、暂停、失败和完成遮罩。 */
  constructor(private readonly scene: Phaser.Scene) {}

  /** 显示苏醒剧情和操作规则；原生开始按钮先启用声音，失败时保留开场并允许重试。 */
  showIntro(level: LevelDefinition, onStart: () => void, audioMessage?: string): void {
    this.close();
    const root = modalRoot(this.scene, 760, 480);
    const ornament = this.scene.add.graphics();
    ornament.lineStyle(1, 0xbdc8ad).lineBetween(535, 183, 745, 183);
    ornament.fillStyle(0xf8f6eb).fillCircle(640, 183, 27);
    drawJar(ornament, 0x8c9b75, 640, 183, 0.9, false);
    const eyebrow = uiText(this.scene, 640, 228, `CHAPTER 01   /   ${level.title}`, 12, "#8b987f").setOrigin(0.5);
    const title = uiText(this.scene, 640, 276, "瓶中小调", 41).setOrigin(0.5).setFontFamily(SERIF_FONT);
    const copy = uiText(this.scene, 640, 350, level.story.awakening, 16, "#7b8873").setWordWrapWidth(620).setAlign("center").setOrigin(0.5);
    const controls = uiText(this.scene, 640, 424, "A/D 或 ←/→ 移动  ·  空格 跳跃  ·  F 显现  ·  靠近按 E 收集", 13, "#89967f").setOrigin(0.5);
    const rule = uiText(this.scene, 640, 456, audioMessage ?? "三次还原机会，每轮可听一次模糊回忆；答错后重新显现并收集。", 13, audioMessage ? "#ad7471" : "#89967f").setOrigin(0.5);
    // 原生按钮的 click / Enter 处理直接启用音频，避免 Phaser 下一帧才回调而丢失 Safari 用户手势。
    this.startButton = document.createElement("button");
    this.startButton.className = "game-start-button";
    this.startButton.textContent = audioMessage ? "启用声音，开始游戏  →" : "苏醒，聆听春天  →";
    this.startButton.addEventListener("click", () => {
      if (this.startButton) this.startButton.disabled = true;
      onStart();
    });
    document.getElementById("game")!.append(this.startButton);
    root.add([ornament, eyebrow, title, copy, controls, rule]);
    this.current = root;
  }

  /** 三次还原均失败后显示结束界面，重开按钮交由场景重建整局进度。 */
  showFailure(onRestart: () => void): void {
    this.close();
    const root = modalRoot(this.scene, 660, 380);
    const eyebrow = uiText(this.scene, 640, 245, "回忆机会   ○  ○  ○", 14, "#98a18c").setOrigin(0.5);
    const title = uiText(this.scene, 640, 295, "记忆暂时沉入了瓶底", 32).setFontFamily(SERIF_FONT).setOrigin(0.5);
    const copy = uiText(this.scene, 640, 365, "三次还原机会已经用完。\n重新开始，让春风再一次唤醒这段旋律。", 16, "#7b8873").setAlign("center").setOrigin(0.5);
    const restart = new UiButton(this.scene, 640, 460, 270, 48, "重新开始春季关卡  →", onRestart, true);
    root.add([eyebrow, title, copy, restart.root]);
    this.current = root;
  }

  /** 显示继续、静音和重开入口；暂停前的探索/排序状态由 LevelScene 保留。 */
  showPause(onResume: () => void, onRestart: () => void, onMute: () => boolean, muted: boolean): void {
    this.close();
    const root = modalRoot(this.scene, 510, 350);
    const eyebrow = uiText(this.scene, 640, 235, "TAKE A BREATH", 12, "#8b987f").setOrigin(0.5);
    const title = uiText(this.scene, 640, 277, "让旋律歇一会儿", 30).setFontFamily(SERIF_FONT).setOrigin(0.5);
    const resume = new UiButton(this.scene, 640, 352, 270, 48, "继续游戏  →", onResume, true);
    const mute = new UiButton(this.scene, 640, 411, 270, 42, `声音：${muted ? "关" : "开"}`, () => { mute.setLabel(`声音：${onMute() ? "关" : "开"}`); });
    const restart = new UiButton(this.scene, 640, 464, 270, 42, "重新开始本关", onRestart);
    root.add([eyebrow, title, resume.root, mute.root, restart.root]);
    this.current = root;
  }

  /** 走过恢复后的出口时显示完成；有 nextLevelId 时提供下一关，否则提供重玩。 */
  showComplete(title: string, onReplay: () => void, nextLevelId: string | null, onNext?: () => void): void {
    this.close();
    const root = modalRoot(this.scene, 650, 410);
    const ornament = this.scene.add.graphics();
    for (let index = 0; index < 4; index++) drawNote(ornament, [0x7895ab, 0xb77e85, 0xbd8e48, 0x639080][index], 568 + index * 48, 230, 0.85);
    const eyebrow = uiText(this.scene, 640, 276, `第一章 · ${title}   /   已完成`, 12, "#8b987f").setOrigin(0.5);
    const heading = uiText(this.scene, 640, 323, "旋律，终于完整了", 36).setFontFamily(SERIF_FONT).setOrigin(0.5);
    const copy = uiText(this.scene, 640, 384, "春风、雨滴、嫩芽与鸟鸣回到了自己的节拍。\n道路已通往夏季入口；春季完整切片到这里结束。", 16, "#7b8873").setAlign("center").setOrigin(0.5);
    const replay = new UiButton(this.scene, 640, 475, 240, 50, nextLevelId && onNext ? "前往下一关  →" : "再听一次，重新出发  →", nextLevelId && onNext ? onNext : onReplay, true);
    root.add([ornament, eyebrow, heading, copy, replay.root]);
    this.current = root;
  }

  /** 关闭当前遮罩并移除原生开场按钮，避免旧按钮遮挡后续游戏。 */
  close(): void {
    this.startButton?.remove(); this.startButton = undefined;
    this.current?.destroy(); this.current = undefined;
  }
}
