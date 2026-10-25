# 林间回响 · 第一关 Demo

用 TypeScript、Phaser 4.2.1、Arcade Physics 与 Vite 实现的 PC 横屏平台解谜原型。美术全部为代码绘制的基本图形，临时音频为项目脚本生成的原创合成声音。

## 本地运行

本机可以在项目目录直接执行以下命令。脚本优先使用系统中的 Node/pnpm；系统尚未安装时会尝试使用 Codex 附带的运行时：

```bash
bash scripts/dev.sh
```

其他机器按下面的标准方式运行。需要 Node.js **22.12 或更新版本**（建议使用当前 LTS）与 pnpm **11.25.0**。工程通过 `packageManager` 字段声明包管理器版本，已提交依赖锁文件。

```bash
# 首次安装 pnpm；已有 pnpm 可跳过。
npm install --global pnpm@11.25.0

# 在项目根目录执行。
pnpm install
pnpm dev
```

打开终端输出的 Local 地址，通常是 <http://127.0.0.1:5173/>。端口占用时 Vite 会选择其他端口。请通过开发服务器访问，不能直接双击 `index.html`，因为关卡 JSON 和音频需要 HTTP 加载。

当前仓库已包含全部临时音频，运行 demo 不需要 Python。重新生成临时音频才需要：

```bash
python3 scripts/generate_placeholder_audio.py
```

## 操作与流程

| 操作 | 输入 |
| --- | --- |
| 左右移动 | A / D |
| 跳跃 | 空格；长按不会连续跳 |
| 暂停 / 继续 | Esc 或画面右上角按钮 |
| 试听完整乐句 | 游戏右下角、排序界面的试听按钮 |
| 静音 | 画面右上角或暂停界面的声音按钮 |
| 选择片段 | 点击排序界面上方卡片 |
| 放入片段 | 选中后点击下方槽位 |
| 交换位置 | 点击一个已有片段的槽位，再点击目标槽位 |
| 移除片段 | 选中已有槽位后，再次点击它 |
| 关闭排序 | Esc 或排序面板右上角 × |
| 重开 | 暂停界面或通关界面的按钮 |

点击“进入森林”后，收集三个平台和地面上的四段声音，再回到地面左侧的出生点。排序未完成时，试听排列和提交按钮不可用。答错保留当前排列，答对后播放完整乐句并显示通关画面。

关闭排序会保留收集和排列。离开出生点范围后再走回来，可继续排序。切到其他窗口或浏览器标签页会自动暂停，回来后点击继续。刷新页面会重置本次进度。

平台从左到右为中、高、低，都是**只在下落时承接角色的单向平台**。左右平台可以从地面跳上，最高的平台需借助左右任一平台。Demo 使用 1280×720 逻辑分辨率，随窗口等比例缩放；本阶段针对 PC 键鼠输入。

## 检查与构建

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

`pnpm build` 会先做严格类型检查，再生成 `dist/`。`pnpm preview` 用于本地检查构建结果，通常在 <http://127.0.0.1:4173/>。可将 `dist/` 作为静态文件托管，不需要后端。如果部署到子路径，例如 `/music-demo/`：

```bash
pnpm typecheck
pnpm exec vite build --base=/music-demo/
```

关卡入口会遵守 Vite 的 `BASE_URL`，关卡内的素材使用相对路径。

## 正式素材接入

每关的接入点集中在两个文件：

- [`public/content/level-01/level.json`](public/content/level-01/level.json)：布局、出生点、移动参数、片段信息、正确顺序和下一关。
- [`public/content/level-01/assets.json`](public/content/level-01/assets.json)：全部图片和音频路径。

先阅读 [素材接入说明](docs/ASSETS.md)。图片的 `file` 为 `null` 时使用基本图形；填入路径后会自动使用图片。临时音频可直接替换文件或修改清单引用。

## 代码结构

```text
src/
  core/                 纯玩法规则：收集阶段、片段排列、跳跃几何
  content/              关卡类型、JSON 读取、运行时配置校验
  input/                输入动作接口和键盘实现
  audio/                音效、背景音、精确排程的乐句播放
  game/
    scenes/             资源加载与游戏流程装配
    player/             角色控制与角色表现
    world/              平台、出生点、收集物
    art/                基本图形背景、共用音符与图片接入
  ui/                   HUD、按钮、开始/暂停/通关、排序界面
public/content/level-01/ 第一关数据和所有资源
scripts/                临时音频生成工具
tests/                  纯规则、内容引用、跳跃约束与音频一致性测试
docs/                   素材接入、架构与人工验收记录
```

扩展输入和迁移 Unity 的边界见 [架构说明](docs/ARCHITECTURE.md)。浏览器试玩记录见 [验收记录](docs/VERIFICATION.md)。
