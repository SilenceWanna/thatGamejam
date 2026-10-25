import Phaser from "phaser";
import type { LevelContent } from "../../content/types";
import { assetKey } from "../../content/loadLevelContent";

/** 唯一的引擎资源加载入口。缺图可退回基本图形，缺音频会给出明确提示。 */
export class BootScene extends Phaser.Scene {
  private failures: string[] = [];
  constructor(private content: LevelContent) { super("Boot"); }
  init(data: { content?: LevelContent }): void { if (data.content) this.content = data.content; this.failures = []; }

  preload(): void {
    const { level, assets, baseUrl } = this.content;
    const loading = document.getElementById("loading-message");
    if (loading) { loading.hidden = false; loading.style.display = "grid"; loading.textContent = "正在唤醒森林中的旋律…"; }
    this.load.on("loaderror", (file: Phaser.Loader.File) => { this.failures.push(file.key); });
    const fileUrl = (file: string): string => /^(https?:|data:|\/)/.test(file) ? file : baseUrl + file;
    for (const [name, definition] of Object.entries(assets.images)) {
      const key = assetKey(level.id, name);
      if (!definition.file || this.textures.exists(key)) continue;
      if (definition.frameWidth && definition.frameHeight) {
        this.load.spritesheet(key, fileUrl(definition.file), { frameWidth: definition.frameWidth, frameHeight: definition.frameHeight });
      } else this.load.image(key, fileUrl(definition.file));
    }
    for (const [name, definition] of Object.entries(assets.audio)) {
      const key = assetKey(level.id, name);
      if (definition.files.length && !this.cache.audio.exists(key)) this.load.audio(key, definition.files.map(fileUrl));
    }
  }

  create(): void {
    this.load.off("loaderror");
    const loading = document.getElementById("loading-message");
    if (loading) loading.style.display = "none";
    this.scene.start("Level", { content: this.content, assetWarnings: this.failures });
  }
}
