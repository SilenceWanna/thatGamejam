# 架构与迁移边界

按玩法定位文件与函数见 [游戏功能与代码索引](GAMEPLAY_CODE_MAP.md)。玩法入口、状态判定和关键配置类型使用中文 JSDoc；通用绘图/格式化工具不添加重复解释实现的注释。

## 数据与装配

`main` 读取并校验关卡 JSON，`BootScene` 从清单加载图片与声音。`LevelScene` 组织流程，`SpringWorld` 装配角色、地形、四个自然互动点、回忆点与天气/出口；UI、音频和输入各自封装。

文件职责保持明确，场景与排序面板均约 200 行，避免将所有机制堆到同一个场景中。

## 玩法状态与机会

`LevelProgress` 无引擎依赖，维护显现开关、已收集 ID、探索/返回/排序/完成/失败阶段、失败次数与本轮是否听过回忆。未显现不能拾取，集齐才能在出生点进入排序。失败清空本轮收集并隐藏音符，三次失败进入失败状态。

剩余实心点 = maxAttempts - failedAttempts - Number(heardThisAttempt)。因此听后答错不会重复扣点，没听就答错也无法把本轮机会攒到下一次。退出面板或暂停只改变界面状态，不创建新轮次。`PhraseArrangement` 维护槽位和答案，放入、移除、交换、判定与正确位置提示不依赖 Phaser。

## 界面与世界状态

`LevelScene` 的界面状态包含 intro、playing、puzzle、paused、restoring、restored、completed、failed。它们和玩法状态分开：完成排列时玩法规则已经成功，界面仍需播放恢复演出，恢复自由移动，走过右侧出口后才显示最终完成界面。

`PhraseCollectible` 绘制声音罐和“按 E 收集”提示，不注册点击或碰撞拾取。`SpringWorld` 根据玩家中心、`interactionRadius` 与罐子的显现/收集状态选取最近目标，提示和交互动作共用这套选择逻辑。离开范围、暂停、收集或复位后隐藏提示；只有输入层产生 interactPressed 才能发起收集。失败只复位已有对象，不重新构造整张场景；收集动画也不销毁对象，因此能可靠开始下一轮。`SeasonEnvironment` 管理冰层、停滞雨滴、花草与出口，恢复后同时切换表现并禁用实际碰撞阻挡。

`PhraseDragController` 只移动拖拽影像，原卡片/槽位保持稳定。点击与拖拽最终调用同一个 place 操作；刷新时不销毁正在参与拖拽的交互对象。`AttemptIndicator` 在 HUD 与音序器共享同一计数规则。

## 输入与角色

`InputSource.sample()` 返回 moveAxis、jumpPressed、revealPressed、interactPressed。键盘适配器把 A/D、方向键、空格、F、E 映射为动作，失焦清空按键。手柄/触屏可实现相同接口，在装配处组合或替换，角色控制器无需知道具体按键。

Arcade Physics 固定 60 Hz。当前移动立即响应，没有二段跳；离台宽限 100 ms、跳跃缓冲 120 ms 都可配置为 0。地面实心，平台仅承接从上方下落的角色。图片、碰撞体和显示容器独立，图片尺寸不决定跳跃几何。角色提供 idle/run/jump/interact 四种正式动画接口。

## 音频

`AudioService` 是声音唯一入口，管理环境循环、音效、互斥乐句试听、静音和压低背景音量。开场、模糊回忆、恢复主题为三个独立资源入口。旧的通用乐句资源接口保留，但不会绕过回忆次数规则。

`BrowserAudioGate` 在原生 pointer/keydown 事件内立即请求 resume，并在播放前等待 AudioContext 真正进入 running。开场开始按钮为覆盖在原画布位置的 HTML 按钮，直接执行这条解锁路径，避免 Phaser 把点击留到后续游戏帧才处理。拒绝或超时会保留开场、允许重试；答题回忆同样等待播放成功才扣机会。停止、暂停与销毁通过播放代次使旧异步请求失效。完整乐句也接入 Phaser 主输出节点，统一接受主静音与音量控制。

片段试听使用解码缓冲；音序器使用 `melodyTiming` 计算固定 BPM 的偏移，在 AudioContext.currentTime 上安排起音。声音长度不会决定下一拍开始时间，尾音可重叠。静音缓冲作为结束时钟，等待所有尾音播放完再清理；UI 高亮读取同一音频时钟。兼容回退走 Phaser 的普通声音播放。

关闭排序、失败、暂停和重开都会停止旧试听。停止音频不退还回忆额度。窗口失焦/页面隐藏暂停正在探索、解谜或恢复后行走的游戏；恢复演出本身约 1.5 秒。

## 生命周期与迁移

两个平台的双击入口调用 `scripts/launcher/`：平台脚本负责定位或下载并校验 Node，`prepare-dependencies.mjs` 按锁文件准备依赖，`launch-game.mjs` 共用构建、启动服务与打开浏览器流程。下载内容、依赖指纹和启动器构建位于忽略提交的 `.launcher/`；游戏代码不依赖启动器，正常 Vite 开发、静态部署和后续 Unity 迁移仍独立进行。参见 [启动器说明](LAUNCHER.md)。

场景关闭时解绑 window/document 输入监听、拖拽事件和音频；Phaser 清理计时器、显示对象与世界。资源缓存键包含关卡 ID，不同季节同名资源不会混用。

项目迁移时移动了 Git 历史、源代码、依赖与资源到 `/Users/wanna/game/gamejam261024`；旧路径为符号链接。脚本与资源定位依赖项目目录或 BASE_URL，未将旧位置写死在游戏中。

迁移 Unity 时可保留素材、JSON、片段 ID、关卡布局、剧情、答案、参数和规则测试案例。TypeScript 仍需改写 C#；纯规则层无需映射 Phaser 对象。Unity 导入层可转换像素单位和 Y 轴方向；物理手感需要重新校准。场景、渲染、输入、UI、动画和音频适配层需分别替换。

`public/content/seasons.json` 记录四季生产规划，当前只实现春季完整切片。正式夏季准备好后创建相同内容结构并设置 nextLevelId；连续四季地图与结尾回望属于后续阶段。
