# 双击启动游戏

## 使用

1. 将完整项目放在本机可写目录；如果拿到 ZIP，请先全部解压。
2. macOS 双击根目录的 `Start-Game-macOS.command`；Windows 双击 `Start-Game-Windows.bat`。
3. 首次运行保持联网，等待自动准备完成。默认浏览器会打开游戏，点击“苏醒，聆听春天”开始。
4. 游戏过程中保留启动窗口。结束后按 Ctrl+C 或关闭窗口，停止本次本地服务。

这是 Web 游戏的双击启动入口，需要和完整项目放在一起。无需手动安装 Node 或 pnpm，也不需要 Python。支持 Apple Silicon / Intel Mac 和 Windows 10/11 的 x64 / ARM64；Windows 使用系统自带的 Windows PowerShell 5.1。

仅关闭浏览器不会停止服务；关闭启动窗口后页面无法重新加载。再次双击即可重新打开。修改代码或素材后重新启动，启动器每次都会重新构建最新内容。

## 自动准备过程

- 优先复用满足版本要求的本地 Node 与包管理器。本开发电脑兼容 Codex 附带运行时。
- 如环境缺失，下载 [Node.js 官方发行包](https://nodejs.org/dist/v22.23.4/)，按 `scripts/launcher/runtime.json` 中固定的 SHA-256 校验后解压到 `.launcher/runtime/`。
- 使用 `package.json` 中固定的 pnpm 版本和 `pnpm-lock.yaml` 安装依赖；不全局安装软件。Node 官方运行时随附 npm，使用 npm exec 临时运行指定版本的 pnpm。
- 依赖准备成功后保存指纹。锁文件、包配置、操作系统、CPU 架构或 Node 主版本改变时重新准备，避免直接沿用其他平台的原生依赖。
- 构建到 `.launcher/build/`，通过 Vite 本地预览服务打开浏览器。只监听 `127.0.0.1`，默认端口 4173；端口忙时自动尝试下一端口。

`.launcher/` 和 `node_modules/` 都不提交到 Git。首次准备或依赖变更需要网络；已经准备完成且依赖未变时可以离线启动。分发项目给另一台电脑时不必带上这两个目录。

## 常见问题

- **首次启动下载失败**：查看启动窗口中的错误，恢复网络后重新双击。下载校验失败不会执行下载内容；未完成的安装会在下次重试。
- **macOS 提示没有执行权限**：在项目目录运行一次 `chmod +x Start-Game-macOS.command`。正常 Git 检出会保留可执行权限。
- **浏览器没有自动打开**：复制启动窗口打印的 Local 地址到浏览器。不要直接打开 `index.html`。
- **打开后没有声音**：先点击开场的“苏醒，聆听春天”。开场会在真实点击内启用浏览器声音，确认成功后才进入游戏；若启用失败，留在开场并显示可重试按钮。切回窗口后如显示“点击启用声音”，点击右上角该按钮恢复。游戏中的“声音：关”代表主动静音，可点击切回“开”；系统音量和浏览器标签页静音也需处于可听状态。
- **Windows 企业策略禁止脚本运行**：此入口需要能运行随项目附带的 PowerShell 脚本；请使用获准运行脚本的电脑或按 README 的开发命令启动。
- **项目位于只读目录或压缩包内**：先解压/移动到自己的可写目录；启动器需要保存运行时、依赖和构建输出。

## 开发与验证

```bash
# macOS 不自动打开浏览器，适合已有预览标签页的开发测试
./Start-Game-macOS.command --no-open

# macOS 强制使用项目内便携版 Node，验证首次准备流程
GAMEJAM_FORCE_BUNDLED_NODE=1 ./Start-Game-macOS.command --no-open
```

Windows 可从终端运行 `Start-Game-Windows.bat -NoOpen` 来跳过自动打开浏览器。

固定 Node 版本与各平台校验值集中在 `scripts/launcher/runtime.json`。更新时从同一版本的 [官方 SHASUMS256.txt](https://nodejs.org/dist/v22.23.4/SHASUMS256.txt) 同步四个校验值。启动流程使用 [Vite 的 build / preview API](https://vite.dev/guide/api-javascript.html)，不在游戏代码里嵌入平台判断。
