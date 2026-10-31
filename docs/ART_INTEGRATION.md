# 美术 v1.0 接入说明

原图保留在 `art/thatgamejam_瓶中小调_贴图素材_v1.0/`，Web 导出位于 `public/content/level-01/images/`，`source-map.json` 记录原图与资源键。场景和 UI 位置根据 `art/thatgamejam_瓶中小调_贴图定位指引_v1.0.pdf` 配置。

| 编号 | 画面内容 |
| --- | --- |
| 01 | 左右边框树、左右角灌木，位于场景和角色之上，固定在画面边缘以避免露出边缝 |
| 02 | 角色及显现后的声音瓶 |
| 03 | 地面、小溪 |
| 04 | 移动的云、鸟巢、冻花、积雪与拱门 |
| 05 | 中景树林 |
| 06 | 冻结、过渡、恢复三张背景 |

`level.json → art.layers` 配置贴图、深度、坐标、大小和季节；`motion` 配置云朵移动；`fragments[].anchorImage` 和 `anchorOffsetX/Y` 让声音随指定图层移动。`art.platforms` 配置拱门外观，`platforms` 单独配置它的单向碰撞面。`art.ui` 配置常驻界面的五个区域；音序器格子按底图相对比例定位。

角色图集每格 256×320，`assets.json → images.player.animations` 配置动作帧。行走 0–5 循环；跳跃对应 6–12：起跳即显示第二帧，随后按上升、顶点、下降、落地和落地 0.3 秒后的状态选帧，不按固定帧率播放；交互为 13–17。角色脚底对齐碰撞体。

各声音的 `jarImages` 映射 `low/half/full`，灰瓶为 `jarEmpty`。已收集瓶子随完整演奏次数从满变半满、少量、空；槽位和拖拽影像一致。拖拽时只有透明底的瓶子，不加卡片或文字。

更新原图后可重新导出（需要 Python 3 和 Pillow，日常运行不需要）：

```bash
python3 scripts/prepare_art_assets.py
python3 scripts/prepare_art_assets.py --source /你的新版素材目录
```

导出后检查 `assets.json`、运行 `pnpm test` 和 `pnpm build`，并在浏览器确认贴图透明边、UI 命中位置和碰撞面。原始 ZIP 因单文件大小限制未纳入 Git。
