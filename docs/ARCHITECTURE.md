# 架构与迁移边界

入口 `main.ts` 读取关卡 JSON，`BootScene` 加载素材，`LevelScene` 组装世界和常驻界面。玩法功能的文件索引见 [GAMEPLAY_CODE_MAP.md](GAMEPLAY_CODE_MAP.md)。

`src/core` 不依赖 Phaser：`LevelProgress` 保存显现、收集、独立的提示/演奏次数及成功失败状态；`PhraseArrangement` 管理顺序与交换；`JumpState` 根据物理运动选择帧并预测落点。JSON、ID、规则和测试案例可以迁移到 Unity，TypeScript 逻辑需要改写为 C#，坐标和物理手感也需重新校准。

`SpringWorld` 负责角色、单向拱门、移动来源与收集范围，`SceneArtwork` 根据图层编号绘制并切换季节。`LiveMusicPanel` 持有排列，`PhraseDragController` 处理拖放，`JarView` 复用四档瓶子。`InputSource` 将物理控制与键盘隔离，未来可以加入手柄、触屏适配器。

`AudioService` 统一处理三个独立乐句接口、背景和音效；片段按 Web Audio 时钟固定 BPM 排程。自然结束才计入演奏；失焦、取消、素材不可用或音频时钟停止导致的中断不消耗演奏次数。浏览器音频由原生输入解锁，重开时解绑旧输入、拖放与音频监听。

当前仅第一关；`seasons.json` 和 `nextLevelId` 是后续关卡的数据预留，不代表第二关已实现。双击启动脚本和游戏逻辑分离，详见 [LAUNCHER.md](LAUNCHER.md)。
