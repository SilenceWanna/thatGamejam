#!/usr/bin/env bash
# Finder 双击入口；始终从本文件所在目录启动，支持中文和带空格的路径。
cd "$(dirname "$0")" || exit 1
bash scripts/launcher/bootstrap-macos.sh "$@"
game_exit_code=$?
if [ "$game_exit_code" -ne 0 ]; then
  printf '\n启动失败，请查看上方错误。按回车关闭窗口。\n'
  read -r _
fi
exit "$game_exit_code"
