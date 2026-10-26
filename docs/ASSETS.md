# 素材替换与关卡配置

资源入口集中在 `public/content/level-01/level.json` 和 `assets.json`。所有相对路径以该关目录为起点，推荐图片放入 `images/`，音频放入 `audio/`。支持站点绝对路径和具备 CORS 许可的 HTTP 地址。修改 JSON 或替换同名素材后刷新页面重新加载。

## 图片清单

`file: null` 使用基本图形。正式图片接入不改变地形碰撞体或角色控制参数。

| images 键 | 用途与默认显示约定 |
| --- | --- |
| `background` | 混乱状态基础背景，1280×720 |
| `backgroundRestored` | 恢复后的基础背景，1280×720；位于平台与角色后方 |
| `springDisorder` | 混乱天气叠加层，1280×720，透明背景 |
| `springRestored` | 恢复后花草等叠加层，1280×720，透明背景 |
| `ground` | 地面，当前 1280×92 |
| `platform` | 三个平台共用，按各平台宽高拉伸，当前 184×26 |
| `player` | 游戏中的角色图片或序列帧，默认 48×64，底部中央锚点 |
| `fragment` | 显现后的世界收集物，默认 32×38；未填写时绘制装着音符的玻璃罐 |
| `jar` | 音序器上方罐子卡片和角色举罐表现，共用图片；其他空罐和槽位仍保留图形反馈 |
| `sourceWind` / `sourceRain` / `sourceSprout` / `sourceBird` | 旧来源图片键预留；当前不绘制来源图形或场景标签，只显示显现后的声音罐 |
| `spawnPoint` | 左侧回忆点/出生点，默认 76×92 |
| `exitClosed` / `exitOpen` | 季节出口冰层与藤蔓，默认 64×92 |

例如单张角色图片：

```json
"player": { "file": "images/player.png", "displayWidth": 48, "displayHeight": 64 }
```

角色碰撞矩形仍由 `level.json` 的 `player.bodyWidth` 和 `player.bodyHeight` 决定。图片建议裁去多余透明边，脚底对齐图片底部，默认朝右。独立对话立绘可另加图片键，在对应叙事 UI 中接入。

等尺寸网格序列帧示例（序号从 0 开始，逐行排列）：

```json
"player": {
  "file": "images/player-sheet.png",
  "displayWidth": 48,
  "displayHeight": 64,
  "frameWidth": 96,
  "frameHeight": 128,
  "frameRate": 10,
  "animations": {
    "idle": [0, 1],
    "run": [2, 3, 4, 5],
    "jump": [6],
    "interact": [7, 8]
  }
}
```

idle/run 循环，jump/interact 播放一次。按 F 显现和拾取声音时触发举罐/互动表现。图片未提供时仍有基本图形角色和短暂举罐效果。

## 乐句接口

三个阶段明确分离，正式音乐分别替换对应音频文件即可，不需要修改程序：

| level.json 的 puzzle 字段 | assets.json 音频键 | 当前临时文件 | 使用时机 |
| --- | --- | --- | --- |
| `openingPhraseAudioKey` | `openingPhrase` | `audio/opening-phrase.wav` | 点击开场后自动播放一次清晰主题，不扣答题提示 |
| `memoryPhraseAudioKey` | `memoryPhrase` | `audio/memory-phrase.wav` | 答题窗口本轮仅一次的模糊回忆 |
| `restoredPhraseAudioKey` | `restoredPhrase` | `audio/restored-phrase.wav` | 答案正确后的完整恢复主题 |

模糊版目前由低通与短回声生成，与开场文件的 PCM 数据不同，保留相同拍点与时长。正式模糊版本可以带滤波、混响或缺失音色，仍应保留可辨认节奏。开场和恢复目前共享旋律内容，但引用独立文件，便于后续替换不同编曲。

`fullPhraseAudioKey` 作为旧配置兼容字段保留，当前指向 `openingPhrase`，不提供不受限制的清晰版重听按钮。旧的 fullPhrase、fragmentMist 等资源清单项仍保留，当前春季流程使用新的三版乐句和自然声音罐键。

## 声音罐、节拍与音效

| audio 键 | 用途 |
| --- | --- |
| `jarWind` / `jarRain` / `jarSprout` / `jarBird` | 四种最终声音罐，依次对应春风、雨滴、嫩芽、鸟鸣 |
| `bgm` | 春季环境循环；试听乐句时音量降低至原来的 16% |
| `jarPlace` / `jarRemove` / `jarReset` | 放入/交换、移除、清空三个独立交互音效接口，临时共用 click.wav |
| `reveal` | 按 F 显现声音 |
| `collect` / `jump` | 收集、跳跃反馈 |
| `weatherRestore` | 天气恢复魔法 |
| `incorrect` / `success` / `click` | 错误、通用成功、通用 UI；旧接口保留 |

音频条目使用下面的格式，`files` 是同一个声音的格式备选，浏览器选一种兼容格式，不是多段连播：

```json
"jarWind": { "files": ["audio/wind.wav", "audio/wind.mp3"], "volume": 0.7 }
```

volume 范围为 0～1。空数组可以停用可选音效；三版乐句与四个罐子应保留可播放文件。

音序器以 `bpm` 和 `beatsPerFragment` 安排起音时刻：间隔秒数 = 60 / BPM × 每罐拍数。当前为 90 BPM、一罐一拍，四罐约 2.667 秒。它使用 Web Audio 的时钟，**不会因为某只罐子的采样较短或较长而推迟下一个拍点**；尾音允许重叠，播放状态等待全部尾音结束。音频素材应按这一节拍制作，避免附加静音。仅不支持 Web Audio 的浏览器才使用兼容回退，精度取决于浏览器。

临时音频为 22050 Hz、16 bit PCM、单声道，已提交项目；可运行 `python3 scripts/generate_placeholder_audio.py` 重新生成。正式母带可按策划提供 48 kHz / 24 bit WAV，再导出 Web 版。保留统一采样率、响度、起音与尾音，四罐按正确顺序应能复原主题。

## 关卡数据

- 坐标左上为原点、Y 向下，单位为逻辑像素；出生点使用脚底坐标。
- 逻辑画面 1280×720；窗口缩放无需改配置。修改逻辑分辨率还需同步 UI 布局。
- `platforms` 的 x 为中心，topY 为承接顶面，碰撞尺寸独立于图片。
- `fragments` 包含 id、label、color、坐标、audioKey、sourceType 与 interactionRadius。sourceType 保留 wind/rain/sprout/bird 声音分类，不再绘制对应来源图形。
- `interactionRadius` 控制瓶旁提示和 E 键收集的范围，以角色碰撞体中心到瓶子配置坐标的距离计算，当前为 72。只有已显现且未收集的瓶子会出现提示；靠近本身不会收集。
- 片段列表的顺序是罐子栏顺序；正确顺序由 `puzzle.correctOrder` 单独决定。当前答案为春风→雨滴→嫩芽→鸟鸣。
- `puzzle.maxAttempts: 3`；每轮只听一次模糊回忆。`allowUnlimitedAttemptsAfterExhaustion: false` 是本次确认的规则，不要为了沿用策划旧规则擅自开启。
- `puzzle.allowReferencePlayback` 允许或禁用答题模糊提示，不影响开场主题。
- `story` 保存苏醒、目标、恢复叙事，`season` 保存季节、出口 X、下一季标签和两种环境色调。
- `nextLevelId: null` 显示春季 Demo 结束；正式接入夏季时创建该关目录的两个 JSON，再填写对应目录名。
- 三个平台距地面 140/280/120，跳跃最大高度约 201。修改物理或布局后需重新试玩，并运行可达性测试。
- 当前 UI 针对四只罐子设计。增加数量或改画布尺寸需调整界面布局。

配置校验会提前检查重复 ID、缺失音频键、无效答案、BPM、尝试次数、季节字段及动画帧等。文件加载失败会有 HUD 提示；没有正式图片时继续使用基本图形。
