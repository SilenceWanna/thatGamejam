import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";
import runtimeTools from "./runtime-tools.cjs";

/** 跨平台直接调用 Node + CLI 文件，避免 .cmd、空格路径和 shell 引号差异。 */
function runNodeCli(cli, args, projectRoot) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], {
      cwd: projectRoot,
      stdio: "inherit",
      env: { ...process.env, CI: "true", npm_config_update_notifier: "false" }
    });
    child.on("error", reject);
    child.on("exit", code => code === 0 ? resolve() : reject(new Error(`依赖准备失败，退出码 ${code}。请检查网络后重新双击启动。`)));
  });
}

export async function prepareDependencies(projectRoot) {
  const inputs = await Promise.all(["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"]
    .map(name => readFile(join(projectRoot, name))));
  const fingerprint = createHash("sha256")
    .update(`${process.platform}/${process.arch}/${process.versions.node.split(".")[0]}`);
  for (const input of inputs) fingerprint.update(input);
  const expected = fingerprint.digest("hex");
  const stamp = join(projectRoot, ".launcher/dependencies.sha256");
  const previous = await readFile(stamp, "utf8").catch(() => "");
  if (previous === expected && existsSync(join(projectRoot, "node_modules/vite/package.json"))) return;

  const packageManager = JSON.parse(inputs[0].toString()).packageManager;
  if (!/^pnpm@\d+\.\d+\.\d+$/.test(packageManager)) throw new Error("packageManager 需要固定的 pnpm 版本。");
  const manager = runtimeTools.findPackageManager();
  if (!manager) throw new Error("没有找到包管理器，请使用项目根目录的双击启动入口。");
  const installArgs = ["install", "--frozen-lockfile", "--reporter=append-only"];
  const args = manager.kind === "npm"
    ? ["exec", "--yes", `--package=${packageManager}`, "--", "pnpm", ...installArgs]
    : installArgs;
  console.log("正在准备游戏依赖（首次启动或依赖更新时需要联网）……");
  await runNodeCli(manager.cli, args, projectRoot);
  await mkdir(join(projectRoot, ".launcher"), { recursive: true });
  await writeFile(stamp, expected);
}
