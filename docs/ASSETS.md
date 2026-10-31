# 素材替换与关卡配置

每关集中修改 `public/content/level-01/level.json`（玩法、坐标、图层及 UI 布局）和 `assets.json`（文件路径、音量、角色图集与帧号）。相对路径以关卡目录为起点；替换后刷新页面。具体图层、瓶子和导出流程见 [ART_INTEGRATION.md](ART_INTEGRATION.md)。

## 关键接口

| 配置 | 作用 |
| --- | --- |
| `puzzle.correctOrder` | 唯一正确的声音 ID 顺序，当前为 `wind, rain, sprout, bird` |
| `puzzle.maxAttempts` / `maxReferences` | 分别为完整演奏次数和模糊提示次数；当前美术固定支持各三次 |
| `player.jumpSpeed` / `player.elevatedJumpSpeed` | 地面与高台各自的起跳速度；高台使用较低高度避免超出画面 |
| `puzzle.bpm` / `beatsPerFragment` | 控制演奏的拍点间隔 |
| `puzzle.openingPhraseAudioKey` | 首次输入后播放的清晰开场 |
| `puzzle.memoryPhraseAudioKey` | 点击右上提示时播放的模糊版本 |
| `puzzle.restoredPhraseAudioKey` | 正确还原后播放的乐句 |
| `fragments[].audioKey` | 对应声音瓶的独立片段音频 |
| `fragments[].interactionRadius` | E 交互距离；移动来源可指定 `anchorImage` 和坐标偏移 |
| `art.layers` / `art.platforms` / `art.ui` | 场景贴图、平台外观和常驻界面的位置；物理碰撞由 `platforms` 单独配置 |
| `images.player.animations` | 角色行走、跳跃、交互帧的图集索引 |

每个音频项包含 `files` 和 `volume`，`files` 是同一声音的不同编码备选。临时音频可通过 `python3 scripts/generate_placeholder_audio.py` 重建；正式四段应和原乐句的节拍、顺序一致。当前开场、模糊和恢复使用不同文件，模糊版与开场内容不同。片段按 Web Audio 时钟安排起音，播放结束后才判定演奏；被中断或未能播放时不消耗演奏次数。

画面逻辑分辨率为 1280×720，Y 轴向下；浏览器中画面铺满窗口，窗口比例不为 16:9 时会按窗口比例拉伸，避免两侧出现纯色边栏。角色、交互和碰撞体位置均与贴图分离。换底图如改变内部格子位置，需调整 `LiveMusicPanel.ts` 的槽位相对坐标。缺图时可使用基本图形；关键旋律和片段需要可播放的音频。
