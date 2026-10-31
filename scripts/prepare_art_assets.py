#!/usr/bin/env python3
"""把美术源 PNG 导出为 Web 素材：只缩放/裁去透明边、压缩、拼图集，不重画原图。"""
import argparse
import json
from pathlib import Path

from PIL import Image

PROJECT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = PROJECT / "art/thatgamejam_瓶中小调_贴图素材_v1.0"
OUTPUT = PROJECT / "public/content/level-01/images"
LANCZOS = Image.Resampling.LANCZOS

# 资源键集中管理；游戏只引用这些英文键，中文源文件名称可以在此统一调整。
EXPORTS = {
    "background": ("06-第六层（背景大底图）/背景图-暂行-冰冻.png", 1920, False),
    "backgroundTransition": ("06-第六层（背景大底图）/背景图-暂行-过渡.png", 1920, False),
    "backgroundRestored": ("06-第六层（背景大底图）/背景图-暂行.png", 1920, False),
    "midgroundTrees": ("05-第五层（树木中景）/树木中景.png", 1920, False),
    "ground": ("03-第三层（小溪、地面）/小溪&地面.png", 1600, False),
    "bushLeft": ("01-第一层（灌木丛）/灌木-左.png", 500, False),
    "bushRight": ("01-第一层（灌木丛）/灌木-右.png", 500, False),
    "treeLeft": ("01-第一层（灌木丛）/边框树-左.png", 700, False),
    "treeRight": ("01-第一层（灌木丛）/边框树-右.png", 700, False),
    "cloud": ("04-第四层（交互）/云朵.png", 700, True),
    "arch": ("04-第四层（交互）/拱门（二层平台）.png", 900, True),
    "flowersFrozen": ("04-第四层（交互）/花丛-冻结.png", 700, True),
    "flowersRestored": ("04-第四层（交互）/花丛-未冻结.png", 700, True),
    "snow": ("04-第四层（交互）/雪地.png", 700, True),
    "birdNest": ("04-第四层（交互）/鸟巢.png", 300, True),
    "jarEmpty": ("UI/瓶-未收集.png", 192, True),
    "inventoryFrame": ("UI/瓶子存放.png", 900, True),
    "sequenceBoard": ("UI/旋律放置底图.png", 1280, True),
    "playButton": ("UI/播放.png", 256, True),
    "playIcon": ("UI/播放cion.png", 128, True),
    "playGlow": ("UI/播放键可动部分.png", 256, True),
    "resetButton": ("UI/重置.png", 256, True),
}
for remaining in range(4):
    EXPORTS[f"hint{remaining}"] = (f"UI/旋律提示-剩余{remaining}次机会.png", 800, True)
for sound, color in [("Wind", "金"), ("Rain", "蓝"), ("Sprout", "绿"), ("Bird", "青")]:
    for state, label in [("Low", "一点点"), ("Half", "半满"), ("Full", "满")]:
        EXPORTS[f"jar{sound}{state}"] = (f"UI/瓶-{color}-{label}.png", 192, True)


def export_image(source: Path, width: int, trim: bool, destination: Path) -> dict:
    image = Image.open(source).convert("RGBA")
    if trim:
        image = image.crop(image.getbbox())
    image.thumbnail((width, 4096), LANCZOS)
    image.save(destination, "WEBP", quality=90, method=6)
    return {"source": str(source.relative_to(PROJECT) if source.is_relative_to(PROJECT) else source), "width": image.width, "height": image.height}


def export_character(source: Path, destination: Path) -> dict:
    """将不同尺寸的逐帧原画统一脚底和动作比例，保留跳跃蹲身及拿瓶抬手的姿态变化。"""
    groups = [("行走", 6), ("跳", 7), ("拿瓶", 5)]
    atlas = Image.new("RGBA", (256 * 6, 320 * 3))
    index = 0
    animations = {}
    for action, count in groups:
        frames = [Image.open(source / f"人物-{action}-{i}.png").convert("RGBA") for i in range(1, count + 1)]
        first_bounds = frames[0].getbbox()
        scale = 280 / (first_bounds[3] - first_bounds[1])
        indices = []
        for frame in frames:
            frame = frame.crop(frame.getbbox())
            frame = frame.resize((round(frame.width * scale), round(frame.height * scale)), LANCZOS)
            x = (index % 6) * 256 + (256 - frame.width) // 2
            y = (index // 6) * 320 + 320 - frame.height
            atlas.alpha_composite(frame, (x, y))
            indices.append(index)
            index += 1
        animations[{"行走": "run", "跳": "jump", "拿瓶": "interact"}[action]] = indices
    animations["idle"] = [0]  # 本批素材未提供独立待机，沿用行走第一帧。
    atlas.save(destination, optimize=True)
    return {"file": "images/player.png", "displayWidth": 76.8, "displayHeight": 96,
            "frameWidth": 256, "frameHeight": 320, "frameRate": 10, "animations": animations}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    source = parser.parse_args().source.resolve()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest_path = OUTPUT.parent / "assets.json"
    manifest = json.loads(manifest_path.read_text())
    report = {}
    for key, (relative, width, trim) in EXPORTS.items():
        destination = OUTPUT / f"{key}.webp"
        report[key] = export_image(source / relative, width, trim, destination)
        manifest["images"][key] = {"file": f"images/{key}.webp"}
    manifest["images"]["player"] = export_character(source / "02-第二层（人物、互动层）", OUTPUT / "player.png")
    # 沿用通用键，旧场景的替换接口仍可读取本次正式图片。
    for alias, key in {"jar": "jarWindFull", "fragment": "jarWindLow", "exitClosed": "flowersFrozen", "exitOpen": "flowersRestored"}.items():
        manifest["images"][alias] = dict(manifest["images"][key])
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    (OUTPUT / "source-map.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(f"已导出 {len(EXPORTS)} 张 Web 贴图和 18 帧角色图集到 {OUTPUT}")


if __name__ == "__main__":
    main()
