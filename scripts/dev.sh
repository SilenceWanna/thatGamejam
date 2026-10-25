#!/usr/bin/env bash
# 本机便捷入口：优先使用用户已安装的运行时，也兼容 Codex 附带的 Node/pnpm。
set -eu
cd "$(dirname "$0")/.."

task_runtime_root="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies"
if ! command -v node >/dev/null 2>&1 && [ -x "$task_runtime_root/node/bin/node" ]; then
  export PATH="$task_runtime_root/node/bin:$PATH"
fi
if ! command -v pnpm >/dev/null 2>&1 && [ -x "$task_runtime_root/bin/fallback/pnpm" ]; then
  export PATH="$task_runtime_root/bin/fallback:$PATH"
fi
if ! command -v node >/dev/null 2>&1 || ! command -v pnpm >/dev/null 2>&1; then
  echo "请先安装 Node.js >=22.12 和 pnpm 11.25.0，详见 README.md。" >&2
  exit 1
fi
if [ ! -d node_modules ]; then
  pnpm install
fi
exec pnpm dev "$@"
