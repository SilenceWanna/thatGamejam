// 以 CommonJS 编写，让旧版 Node 也能执行版本检查并正常退回自动下载流程。
const fs = require("node:fs");
const path = require("node:path");

function findPackageManager() {
  const bin = path.dirname(fs.realpathSync(process.execPath));
  const candidates = [
    // Node 官方 macOS 压缩包 / Homebrew，以及 Windows 压缩包 / 安装版。
    { kind: "npm", cli: path.resolve(bin, "../lib/node_modules/npm/bin/npm-cli.js") },
    { kind: "npm", cli: path.resolve(bin, "node_modules/npm/bin/npm-cli.js") },
    // 兼容当前开发电脑的 Codex 运行时，不依赖它来分发游戏。
    { kind: "pnpm", cli: path.resolve(bin, "../node_modules/pnpm/bin/pnpm.mjs") }
  ];
  return candidates.find(candidate => fs.existsSync(candidate.cli));
}

function isSupportedRuntime() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  return (major > 22 || (major === 22 && minor >= 12)) && Boolean(findPackageManager());
}

module.exports = { findPackageManager, isSupportedRuntime };
if (require.main === module) process.exitCode = isSupportedRuntime() ? 0 : 1;
