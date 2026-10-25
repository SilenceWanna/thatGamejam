import Phaser from "phaser";
import "./styles.css";
import { loadLevelContent } from "./content/loadLevelContent";
import { BootScene } from "./game/scenes/BootScene";
import { LevelScene } from "./game/scenes/LevelScene";

async function start(): Promise<void> {
  const content = await loadLevelContent("level-01");
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: content.level.world.width,
    height: content.level.world.height,
    backgroundColor: "#f0efdc",
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, roundPixels: false },
    physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 }, fps: 60, fixedStep: true, debug: false } },
    scene: [new BootScene(content), LevelScene]
  });
}

void start().catch(error => {
  const message = document.getElementById("loading-message");
  if (message) { message.textContent = `游戏启动失败：${error instanceof Error ? error.message : String(error)} 请检查配置并刷新页面。`; message.style.padding = "40px"; }
  console.error(error);
});
