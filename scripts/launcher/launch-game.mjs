import { fileURLToPath } from "node:url";
import { prepareDependencies } from "./prepare-dependencies.mjs";

// 两个平台共用启动流程。运行时准备由各平台脚本完成，游戏仍是可迁移的 Web 项目。
const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
process.chdir(projectRoot);

try {
  await prepareDependencies(projectRoot);
  const { build, preview } = await import("vite");
  console.log("正在构建游戏……");
  const config = { root: projectRoot, base: "/", build: { outDir: ".launcher/build" } };
  await build(config);
  // 先绑定成功再打开浏览器；端口占用时由 Vite 自动选择下一个可用端口。
  const server = await preview({
    ...config,
    preview: { host: "127.0.0.1", port: 4173, strictPort: false, open: !process.argv.includes("--no-open") }
  });
  console.log("\n游戏已启动：");
  server.printUrls();
  console.log("游戏运行时请保留此窗口。结束游戏后按 Ctrl+C，或关闭此窗口停止服务。\n");
  // Finder 关闭终端窗口会发出 SIGHUP；只关闭本次启动的服务。
  const stop = async () => { await server.close(); process.exit(0); };
  process.once("SIGINT", stop);
  process.once("SIGHUP", stop);
} catch (error) {
  console.error(`\n游戏启动失败：${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
