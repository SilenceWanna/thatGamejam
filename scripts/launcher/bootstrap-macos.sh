#!/usr/bin/env bash
# 只在缺少合适运行时时下载官方便携版；不安装系统软件，不需要管理员权限。
set -eu
cd "$(dirname "$0")/../.."

runtime_config="scripts/launcher/runtime.json"
runtime_version=$(/usr/bin/plutil -extract version raw -o - "$runtime_config")
case "$(uname -m)" in
  arm64) runtime_arch=arm64 ;;
  x86_64) runtime_arch=x64 ;;
  *) echo "暂不支持此 Mac 架构。" >&2; exit 1 ;;
esac
runtime_name="node-v${runtime_version}-darwin-${runtime_arch}"
runtime_dir="$PWD/.launcher/runtime/$runtime_name"
runtime_node=""

try_node() {
  if [ -n "$1" ] && [ -x "$1" ] && "$1" scripts/launcher/runtime-tools.cjs; then
    runtime_node="$1"
  fi
}
if [ "${GAMEJAM_FORCE_BUNDLED_NODE:-0}" != 1 ]; then
  try_node "$(command -v node || true)"
  if [ -z "$runtime_node" ]; then
    try_node "$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
  fi
fi
if [ -z "$runtime_node" ]; then try_node "$runtime_dir/bin/node"; fi

if [ -z "$runtime_node" ]; then
  echo "首次启动：正在下载 Node.js ${runtime_version}，请保持联网……"
  mkdir -p .launcher/runtime
  runtime_download=$(mktemp -d "$PWD/.launcher/runtime/download.XXXXXX")
  trap 'rm -rf "$runtime_download"' EXIT
  runtime_archive="$runtime_name.tar.gz"
  curl --fail --location --retry 2 --connect-timeout 20 \
    "https://nodejs.org/dist/v${runtime_version}/${runtime_archive}" -o "$runtime_download/$runtime_archive"
  runtime_sha=$(/usr/bin/plutil -extract "darwin-$runtime_arch" raw -o - "$runtime_config")
  (cd "$runtime_download" && printf '%s  %s\n' "$runtime_sha" "$runtime_archive" | shasum -a 256 -c -)
  tar -xzf "$runtime_download/$runtime_archive" -C "$runtime_download"
  # 校验成功后才替换此前可能中断的安装。
  rm -rf "$runtime_dir"
  mv "$runtime_download/$runtime_name" "$runtime_dir"
  runtime_node="$runtime_dir/bin/node"
fi

export PATH="$(dirname "$runtime_node"):$PATH"
"$runtime_node" scripts/launcher/launch-game.mjs "$@"
