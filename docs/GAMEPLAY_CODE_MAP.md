# 游戏功能与代码索引

玩法函数上方有中文注释；素材与坐标集中在本关两个 JSON。

| 功能 | 文件 / 入口 |
| --- | --- |
| 读取关卡与创建游戏 | `src/main.ts`、`src/content/loadLevelContent.ts`、`src/game/scenes/BootScene.ts` |
| 场景更新、显现、收集及演奏结果 | `src/game/scenes/LevelScene.ts`：`create`、`update`、`collect`、`result` |
| 键盘输入与未来设备接口 | `src/input/KeyboardInput.ts`、`InputSource.ts` |
| 移动、跳跃与物理碰撞 | `src/game/player/PlayerActor.ts`、`src/game/world/createTerrain.ts`、`SpringWorld.ts` |
| 按运动选择跳跃帧及预测落点 | `src/core/JumpState.ts`：`predictLanding`、`JumpState.update`；由 `PlayerActor.update` 调用 |
| F 光波、E 提示和移动云朵 | `src/game/world/SeasonEnvironment.ts`、`PhraseCollectible.ts`、`SpringWorld.ts` |
| 收集、提示、演奏和成功/失败规则 | `src/core/LevelProgress.ts`：`revealFragments`、`collect`、`useReference`、`perform` |
| 排列和答案判定 | `src/core/PhraseArrangement.ts`；答案在 `public/content/level-01/level.json` 的 `puzzle.correctOrder` |
| 收集时播放乐段 | `src/game/scenes/LevelScene.ts`：`collect` 根据片段的 `audioKey` 播放 |
| 点击瓶子试听 | `src/ui/LiveMusicPanel.ts`：瓶子的 `pointerup` 和 `listenToFragment`；拖动不试听 |
| 常驻界面、点击、演奏及重置 | `src/ui/LiveMusicPanel.ts`：`refresh`、`hearReference`、`perform`、`reset`、`place` |
| 调试复位（正式版可关闭） | `src/debug/DebugControls.ts`：`DEBUG_CONTROLS_ENABLED`、`installDebugControls` |
| 瓶子拖放及四种液面 | `src/ui/PhraseDragController.ts`、`src/game/art/JarView.ts` |
| 图层、移动图像及春季恢复 | `src/game/art/SceneArtwork.ts`、`renderLayers.ts`、`SeasonEnvironment.ts` |
| 开场、模糊、恢复音频及排程 | `src/audio/AudioService.ts`、`BrowserAudioGate.ts`、`src/core/melodyTiming.ts` |
| 关卡参数、位置和界面排布 | `public/content/level-01/level.json`：`player`、`platforms`、`fragments`、`art`、`puzzle` |
| 素材路径、动画帧和音量 | `public/content/level-01/assets.json`；美术转换脚本 `scripts/prepare_art_assets.py` |
