# 游戏功能与代码索引

先在下表找到玩法，再打开文件搜索函数名。相关函数上方的中文 JSDoc 说明触发时机、功能及关键规则；通用绘图、文本、颜色与查询工具保留简短实现。

## 开场与主流程

| 功能 | 实现文件 | 函数 / 入口 |
| --- | --- | --- |
| 读取第一关并创建游戏 | [main.ts](../src/main.ts) | `start` |
| 加载本关配置与正式素材 | [loadLevelContent.ts](../src/content/loadLevelContent.ts)、[BootScene.ts](../src/game/scenes/BootScene.ts) | `loadLevelContent`、`preload`、`create` |
| 开场剧情与开始按钮 | [ScreenOverlays.ts](../src/ui/ScreenOverlays.ts)、[LevelScene.ts](../src/game/scenes/LevelScene.ts) | `showIntro`、`startGame` |
| 每帧玩法处理 | [LevelScene.ts](../src/game/scenes/LevelScene.ts) | `update`：依次处理移动、显现、收集、起点/出口 |
| 暂停、继续、Esc、失焦 | [LevelScene.ts](../src/game/scenes/LevelScene.ts) | `pauseGame`、`resumeGame`、`onEscape`、`onBlur`、`onVisibility` |
| 三次失败、重开和下一关 | [LevelScene.ts](../src/game/scenes/LevelScene.ts) | `failAttempt`、`restartLevel`、`goToNextLevel` |

## 移动、显现与收集

| 功能 | 实现文件 | 函数 / 入口 |
| --- | --- | --- |
| A/D、方向键、空格、F、E 映射 | [KeyboardInput.ts](../src/input/KeyboardInput.ts) | `onKeyDown`、`onKeyUp`、`sample`；一次性动作防长按重复 |
| 手柄/移动端扩展接口 | [InputSource.ts](../src/input/InputSource.ts) | `PlayerInput`、`InputSource` |
| 移动、跳跃、跳跃缓冲与离台宽限 | [PlayerActor.ts](../src/game/player/PlayerActor.ts) | `update`；参数来自 `level.player` |
| 角色动画、收集时举罐、掉落复位 | [PlayerActor.ts](../src/game/player/PlayerActor.ts) | 构造函数、`update`、`playInteraction`、`resetToSpawn` |
| 地面与三个单向平台 | [createTerrain.ts](../src/game/world/createTerrain.ts)、[SpringWorld.ts](../src/game/world/SpringWorld.ts) | `createTerrain` 创建碰撞体；世界构造函数限制仅从上方落地 |
| F 一次显现全图瓶子 | [LevelScene.ts](../src/game/scenes/LevelScene.ts) | `revealNotes` → `LevelProgress.revealFragments` → `SpringWorld.revealAll` |
| 靠近显示“按 E 收集” | [SpringWorld.ts](../src/game/world/SpringWorld.ts) | `update`、`findNearbyCollectible`；只选范围内最近的已显现瓶子 |
| 按 E 才收集 | [SpringWorld.ts](../src/game/world/SpringWorld.ts)、[LevelScene.ts](../src/game/scenes/LevelScene.ts) | `interactNearby` → 场景 `collect` → 规则 `collect` |
| 瓶子显现、悬浮、淡出、复位 | [PhraseCollectible.ts](../src/game/world/PhraseCollectible.ts) | `reveal`、`collect`、`reset`、`setPromptVisible` |
| 回到出生点开始排序 | [SpringWorld.ts](../src/game/world/SpringWorld.ts)、[LevelScene.ts](../src/game/scenes/LevelScene.ts) | `inSpawn`、`openMemoryPoint`、`openPuzzle` |

## 排列、回忆与尝试次数

| 功能 | 实现文件 | 函数 / 入口 |
| --- | --- | --- |
| 纯规则状态与本轮收集 | [LevelProgress.ts](../src/core/LevelProgress.ts) | `collect`、`revealFragments`、`enterSpawnPoint` |
| 三次尝试、一次回忆、圆点数量 | [LevelProgress.ts](../src/core/LevelProgress.ts) | `attemptsRemaining`、`canHearReference`、`referencesRemaining`、`useReference` |
| 错误后扣机会、清空并隐藏 | [LevelProgress.ts](../src/core/LevelProgress.ts)、[LevelScene.ts](../src/game/scenes/LevelScene.ts) | `failArrangement`、`failAttempt` → `SpringWorld.resetAll` |
| 显示声音库与四个槽位 | [PhrasePuzzlePanel.ts](../src/ui/PhrasePuzzlePanel.ts) | `createLibrary`、`createSlots`、`refresh` |
| 点击选择、放入、移除、清空 | [PhrasePuzzlePanel.ts](../src/ui/PhrasePuzzlePanel.ts) | `selectFragment`、`clickSlot`、`place`、`clearArrangement` |
| 拖动瓶子、交换槽位 | [PhraseDragController.ts](../src/ui/PhraseDragController.ts) | `start`、`drag`、`drop`、`end`；最终同样调用面板 `place` |
| 排列交换及正确答案判定 | [PhraseArrangement.ts](../src/core/PhraseArrangement.ts) | `place`、`remove`、`clear`、`isFilled`、`isCorrect`、`correctPositions` |
| 模糊原乐句：每轮仅一次 | [PhrasePuzzlePanel.ts](../src/ui/PhrasePuzzlePanel.ts) | `hearReference`：播放成功才 `useReference`，解锁失败不扣次数 |
| 单瓶试听、按拍演奏当前排列 | [PhrasePuzzlePanel.ts](../src/ui/PhrasePuzzlePanel.ts) | `listen`、`playArrangement`；不消耗回忆次数 |
| 提交与正误分流 | [PhrasePuzzlePanel.ts](../src/ui/PhrasePuzzlePanel.ts) | `submit` → 场景 `restoreSeason` 或 `failAttempt` |
| 关闭窗口保留当前排列 | [LevelScene.ts](../src/game/scenes/LevelScene.ts) | `closePuzzle`；面板隐藏，不销毁 |
| HUD / 排序窗口三颗圆点 | [AttemptIndicator.ts](../src/ui/AttemptIndicator.ts) | `refresh`；两个位置共用同一套计数 |

## 音频、天气与出口

| 功能 | 实现文件 | 函数 / 入口 |
| --- | --- | --- |
| 浏览器/Safari 音频解锁 | [BrowserAudioGate.ts](../src/audio/BrowserAudioGate.ts) | `onGesture`、`ensureReady`；在原生输入内立即 resume，确认运行后播放 |
| 循环背景与短音效 | [AudioService.ts](../src/audio/AudioService.ts) | `start`、`playEffect`、`toggleMute`、`pause`、`resume` |
| 开场 / 模糊回忆 / 恢复三个独立接口 | [AudioService.ts](../src/audio/AudioService.ts) | `playSequence`；调用方分别是场景开场、面板回忆、场景恢复 |
| 乐句排程、试听高亮、停止及背景压低 | [AudioService.ts](../src/audio/AudioService.ts) | `playSequence`、`update`、`stopPhrase`、`duckBackground` |
| BPM 与起音间隔 | [melodyTiming.ts](../src/core/melodyTiming.ts) | `fragmentInterval`、`sequenceOffsets` |
| 冰雪、雨滴、暖色、花草、藤蔓道路 | [SeasonEnvironment.ts](../src/game/world/SeasonEnvironment.ts) | 构造函数、`showMistake`、`restore`、`gate` |
| 正确后恢复春天、解除冰墙 | [LevelScene.ts](../src/game/scenes/LevelScene.ts)、[SeasonEnvironment.ts](../src/game/world/SeasonEnvironment.ts) | `restoreSeason` → `restore`；1.5 秒后恢复行走 |
| 走过出口显示完成 | [SpringWorld.ts](../src/game/world/SpringWorld.ts)、[LevelScene.ts](../src/game/scenes/LevelScene.ts) | `atExit` → `finishExit` |

## 改设定与素材

| 想修改的内容 | 修改位置 |
| --- | --- |
| 唯一正确顺序 | `public/content/level-01/level.json` → `puzzle.correctOrder`；同时同步乐句音频 |
| 角色移动、跳高、重力与缓冲时间 | 同文件 → `player` |
| 地面、平台高度和宽度 | 同文件 → `world`、`platforms` |
| 瓶子位置、名称、互动范围 | 同文件 → `fragments` 的 `x/y/label/interactionRadius` |
| 尝试次数与 BPM | 同文件 → `puzzle.maxAttempts/bpm/beatsPerFragment` |
| 清晰 / 模糊 / 恢复主题 | 同文件 → 三个 `*PhraseAudioKey`；文件路径位于 `assets.json` |
| 出生点、回忆范围和出口 | 同文件 → `spawn`、`season.exitX` |
| 开场、目标与恢复剧情 | 同文件 → `story` |
| 正式图片、音频路径与音量 | `public/content/level-01/assets.json`；详见 [素材接入说明](ASSETS.md) |
| 配置字段的中文解释 | [types.ts](../src/content/types.ts)；运行时校验在 `validateContent.ts` |
| 双击启动与本地运行环境 | [启动说明](LAUNCHER.md)、`scripts/launcher/`；与游戏规则独立 |
