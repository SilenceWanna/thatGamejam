# Windows 单文件游戏

## 使用和分发

将 `release/Melody-in-a-Jar-Demo-Windows-x64.exe` 单独复制给玩家，在 Windows 10/11 x64 电脑双击即可打开游戏窗口。游戏画面、音效、临时音乐、关卡数据和运行时都在该文件内，运行不需要安装 Node、浏览器或联网；启动时会将运行所需文件解压到 Windows 临时目录，因此首次打开可能需要等待。该包为 x64 版本，未在 Windows ARM 或 32 位系统上验证。

本次构建没有代码签名证书，Windows 的 SmartScreen 可能提示发布者未知；正式对外分发前可配置有效的 Windows 代码签名。正常关闭窗口即可退出游戏。

操作与 Web 版本一致：A/D 移动，空格跳跃，F 显现，靠近后 E 收集，鼠标操作音序器。当前 Demo 的左上角调试复位按钮也保留。

## 重新打包

在装有 Node.js 22.12+ 和 pnpm 11.25.0 的开发环境里，项目根目录执行：

```bash
pnpm install --frozen-lockfile
pnpm package:windows
```

命令先构建最新 Web 资源，再由 electron-builder 生成便携版 EXE。首次打包需要联网下载 Electron 和打包工具；`release/` 为构建产物目录，不纳入 Git。生成的 `release/win-unpacked/` 是构建过程中产生的展开目录，分发时只需要 EXE。修改游戏代码或素材后需重新运行打包命令，已生成的 EXE 不会自动更新。

本机在 macOS 上交叉打包 Windows x64，因此必须在实际 Windows 电脑上进一步确认启动、声音和完整玩法。需要其他架构或正式代码签名时，调整 `package.json` 的 `build` 配置并重新打包。

## 实现边界

`desktop/main.cjs` 创建独立 Electron 窗口并注册 `melody://game/` 安全本地协议；`desktop/resource-path.cjs` 限制请求只能读取打包后的 `dist/`。游戏仍由现有 Web 代码实现，桌面封装不启动 HTTP 服务、不依赖外部浏览器。`pnpm desktop` 可在本机运行同一窗口代码进行开发检查。
