import Phaser from "phaser";
import { UiButton, modalRoot, SERIF_FONT, uiText } from "./components";
import { drawNote } from "../game/art/assetImages";

export class ScreenOverlays {
  private current?: Phaser.GameObjects.Container;
  constructor(private readonly scene: Phaser.Scene) {}

  showIntro(onStart: () => void): void {
    this.close();
    const root = modalRoot(this.scene, 652, 420);
    const ornament = this.scene.add.graphics();
    ornament.lineStyle(1, 0xbdc8ad).lineBetween(535, 210, 745, 210);
    ornament.fillStyle(0xf8f6eb).fillCircle(640, 210, 23);
    drawNote(ornament, 0x8c9b75, 640, 210, 1);
    const eyebrow = uiText(this.scene, 640, 248, "CHAPTER 01   /   初醒之森", 12, "#8b987f").setOrigin(0.5);
    const title = uiText(this.scene, 640, 296, "听见，森林的碎片", 37).setOrigin(0.5).setFontFamily(SERIF_FONT);
    const copy = uiText(this.scene, 640, 355, "四段旋律散落在林间。\n找到它们，回到左侧起点，让声音重新连成一首歌。", 16, "#7b8873").setAlign("center").setOrigin(0.5);
    const controls = uiText(this.scene, 640, 424, "A / D  移动     ·     空格  跳跃     ·     鼠标  排序与试听", 13, "#89967f").setOrigin(0.5);
    const start = new UiButton(this.scene, 640, 491, 234, 50, "进入森林  →", onStart, true);
    root.add([ornament, eyebrow, title, copy, controls, start.root]);
    this.current = root;
  }

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

  showComplete(title: string, onReplay: () => void, nextLevelId: string | null, onNext?: () => void): void {
    this.close();
    const root = modalRoot(this.scene, 650, 410);
    const ornament = this.scene.add.graphics();
    for (let index = 0; index < 4; index++) drawNote(ornament, [0x7895ab, 0xb77e85, 0xbd8e48, 0x639080][index], 568 + index * 48, 230, 0.85);
    const eyebrow = uiText(this.scene, 640, 276, `第一章 · ${title}   /   已完成`, 12, "#8b987f").setOrigin(0.5);
    const heading = uiText(this.scene, 640, 323, "旋律，终于完整了", 36).setFontFamily(SERIF_FONT).setOrigin(0.5);
    const copy = uiText(this.scene, 640, 384, "你找回了所有声音，也找到了它们相遇的顺序。\n第一关 Demo 到这里结束，谢谢你的聆听。", 16, "#7b8873").setAlign("center").setOrigin(0.5);
    const replay = new UiButton(this.scene, 640, 475, 240, 50, nextLevelId && onNext ? "前往下一关  →" : "再听一次，重新出发  →", nextLevelId && onNext ? onNext : onReplay, true);
    root.add([ornament, eyebrow, heading, copy, replay.root]);
    this.current = root;
  }

  close(): void { this.current?.destroy(); this.current = undefined; }
}
