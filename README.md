# 瓶中小调 Melody in a Jar

TypeScript + Phaser 4.2.1 + Arcade Physics + Vite 实现的 PC 横屏音乐解谜原型。春季第一关使用常驻声音库和四拍音序器：显现并收集四种自然声音，排列后演奏，正确还原让春天恢复。
查找功能实现请先看 [游戏功能与代码索引](docs/GAMEPLAY_CODE_MAP.md)：按玩法列出文件、函数和配置入口。玩法函数上方有中文注释，配置类型中的关键参数也有说明。

已接入美术 v1.0 的多层森林、角色行走/跳跃/拿瓶动画、四色声音瓶和木质 UI。原图保留在 `art/`，Web 导出与后续替换方式见 [美术接入说明](docs/ART_INTEGRATION.md)。

## Windows 单文件版本

已经打包的便携版位于 `release/Melody-in-a-Jar-Demo-Windows-x64.exe`。在 Windows 10/11 x64 上双击即可打开独立游戏窗口，运行不依赖浏览器或联网。重新打包和分发注意事项见 [Windows EXE 说明](docs/WINDOWS_EXE.md)。

## 本地运行

项目实际目录为 `/Users/wanna/game/gamejam261024`，包括 Git 历史、代码、依赖、临时素材和设计文档。旧目录 `/Users/wanna/Documents/ChatGPT/gamejam261024` 是指向新目录的兼容符号链接，没有保留第二份代码。原始 Word 策划案保留在新目录根部，未做修改。

推荐在文件管理器里双击项目根目录的启动文件：

| 系统 | 双击文件 |
| --- | --- |
| macOS（Apple Silicon / Intel） | [Start-Game-macOS.command](Start-Game-macOS.command) |
| Windows 10/11（64 位 x64 / ARM64） | [Start-Game-Windows.bat](Start-Game-Windows.bat) |

启动器会自动准备 Node.js 和项目依赖、构建最新代码、启动本地服务，并在默认浏览器中打开游戏。**首次在新电脑运行需要联网**，准备完成后再次启动可离线使用。运行游戏时保留启动窗口；结束后按 Ctrl+C 或关闭窗口。请保留完整项目目录，启动文件需要同目录下的代码和素材。完整说明见 [双击启动说明](docs/LAUNCHER.md)。

开发时仍可直接运行：

```bash
bash /Users/wanna/game/gamejam261024/scripts/dev.sh
```

脚本优先使用系统 Node/pnpm，系统没有时使用 Codex 附带运行时。在其他机器上需要 Node.js 22.12 或更新版本、pnpm 11.25.0：

```bash
npm install --global pnpm@11.25.0
pnpm install
pnpm dev
```

开发服务器通常为 <http://127.0.0.1:5173/>；双击启动器通常为 <http://127.0.0.1:4173/>，端口占用时自动顺延。启动器会自动打开正确地址，不要直接双击 HTML。临时音频已经随项目保存；运行游戏不需要 Python。

## 当前玩法与操作

| 操作 | 输入 |
| --- | --- |
| 移动、跳跃 | A/D 或方向键；空格跳跃 |
| 显现与收集 | F 显现四处声音；靠近出现“按 E 收集”后按 E，收集时播放该乐段 |
| 试听与排列 | 点击已收集瓶子或槽位中的瓶子试听其乐段；拖动瓶子到槽位，或先点击瓶子、再点击槽位 |
| 旋律提示 | 点击右上方提示播放模糊版原乐句，最多三次；播放结束后可再次点击 |
| 演奏 | 集齐并填满四个槽位后点击播放，演奏结束自动判定 |
| 重置 | 右下角重置只清空排列，将瓶子放回声音库，保留收集、机会与关卡状态 |
| 调试复位 | 左上角“复位”完整重开第一关；正式版可关闭 |

云朵随时间水平移动，声音瓶和 E 互动范围随云朵移动。鸟巢位于拱门上方，花与积雪位于地面。拱门可从下方跳上，不再需要返回出生点。

旋律提示和演奏各有独立的三次机会。每次完整演奏后，已收集瓶子的液面从满依次变为半满、一点点、空。错误时保留收集和排列；第三次错误后失败，第三次正确仍算成功。答案正确后，背景和花丛渐变为恢复的春天。清晰开场、模糊提示和恢复乐句各使用独立音频接口。第一次键盘或鼠标操作会请求启用浏览器声音并播放清晰开场；若第一次操作就是提示或演奏，则以该操作为准。

左上角调试按钮独立在 `src/debug/DebugControls.ts`；正式版将 `DEBUG_CONTROLS_ENABLED` 设为 `false` 即可隐藏，或移除关卡场景中的安装调用。

## 检查和构建

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm preview
```

构建输出位于 `dist/`，可静态托管；本地构建预览通常在 <http://127.0.0.1:4173/>。部署子路径时使用：

```bash
pnpm typecheck
pnpm exec vite build --base=/music-demo/
```

测试覆盖显现与收集、独立提示及演奏次数、三次失败和第三次成功、所有 24 种排列、跳跃阶段和预测落点、关卡可达性及音频一致性。浏览器实测记录见 [验收记录](docs/VERIFICATION.md)。

## 正式素材与扩展

每关集中修改：

- `public/content/level-01/level.json`：布局、四个互动点、答案、独立次数、BPM、不同乐句接口和常驻界面位置。
- `public/content/level-01/assets.json`：图片与音频路径；图片为 `null` 时继续使用基本图形。

请阅读 [素材接入说明](docs/ASSETS.md)。开场、答题模糊回忆、恢复演出的音频分别引用 `openingPhraseAudioKey`、`memoryPhraseAudioKey`、`restoredPhraseAudioKey`。四拍演奏使用 Web Audio 时钟，按 BPM 安排起音，避免素材长短改变拍点。

音频重新生成工具为 `python3 scripts/generate_placeholder_audio.py`。春季之外的季节方向保留在 `public/content/seasons.json`；这是生产规划，当前仅春季可玩。`nextLevelId` 保留真实下一关的接入接口。

规则在 `src/core/`，资源在 `src/content/`，输入在 `src/input/`，音频在 `src/audio/`，世界对象在 `src/game/world/`，UI 在 `src/ui/`。迁移 Unity 的边界见 [架构说明](docs/ARCHITECTURE.md)。
