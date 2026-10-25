import type { AssetManifest, LevelDefinition } from "./types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`内容配置错误：${message}`);
}
function positive(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value) && value > 0; }
function finite(value: unknown): value is number { return typeof value === "number" && Number.isFinite(value); }
function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }

/** 在构建世界前报出有意义的错误，防止素材漏填变成黑屏。 */
export function validateContent(levelValue: unknown, assetsValue: unknown): asserts levelValue is LevelDefinition {
  assert(record(levelValue) && record(assetsValue), "level.json 与 assets.json 必须是对象。");
  const level = levelValue;
  assert(typeof level.id === "string" && typeof level.title === "string" && typeof level.subtitle === "string", "缺少关卡标题或 ID。");
  assert(record(level.world) && positive(level.world.width) && positive(level.world.height) && positive(level.world.groundY), "世界尺寸无效。");
  assert(level.world.groundY < level.world.height, "地面必须位于画面内。");
  assert(record(level.spawn) && finite(level.spawn.x) && finite(level.spawn.feetY) && positive(level.spawn.activationRadius), "出生点无效。");
  assert(record(level.player), "缺少角色参数。");
  for (const name of ["moveSpeed", "jumpSpeed", "gravity", "bodyWidth", "bodyHeight"]) {
    assert(positive(level.player[name]), `player.${name} 必须大于零。`);
  }
  for (const name of ["coyoteTimeMs", "jumpBufferMs"]) assert(finite(level.player[name]) && Number(level.player[name]) >= 0, `player.${name} 无效。`);
  assert(Array.isArray(level.platforms) && Array.isArray(level.fragments) && level.fragments.length > 0, "平台和片段列表无效。");
  const platformIds = new Set<string>();
  for (const platform of level.platforms) {
    assert(record(platform) && typeof platform.id === "string" && !platformIds.has(platform.id), "平台 ID 缺失或重复。");
    assert(finite(platform.x) && finite(platform.topY) && positive(platform.width) && positive(platform.height), "平台位置或尺寸无效。");
    platformIds.add(platform.id);
  }
  assert(record(assetsValue.images) && record(assetsValue.audio), "缺少 images 或 audio 清单。");
  for (const [name, image] of Object.entries(assetsValue.images)) {
    assert(record(image) && (image.file === null || (typeof image.file === "string" && image.file.trim().length > 0)), `图片 ${name} 的 file 无效。`);
    for (const field of ["displayWidth", "displayHeight", "frameRate"]) {
      if (image[field] !== undefined) assert(positive(image[field]), `图片 ${name} 的 ${field} 必须大于零。`);
    }
    if (image.frameWidth !== undefined || image.frameHeight !== undefined) {
      assert(positive(image.frameWidth) && positive(image.frameHeight), `图片 ${name} 的帧尺寸须成对填写。`);
    }
    if (image.animations !== undefined) {
      assert(record(image.animations), `图片 ${name} 的 animations 应为对象。`);
      for (const [state, frames] of Object.entries(image.animations)) {
        assert(["idle", "run", "jump"].includes(state) && Array.isArray(frames) && frames.length > 0 && frames.every(frame => Number.isInteger(frame) && frame >= 0), `图片 ${name} 的动画 ${state} 无效。`);
      }
    }
  }
  for (const [name, audio] of Object.entries(assetsValue.audio)) {
    assert(record(audio) && Array.isArray(audio.files) && audio.files.every(file => typeof file === "string"), `音频 ${name} 的 files 无效。`);
    assert(finite(audio.volume) && audio.volume >= 0 && audio.volume <= 1, `音频 ${name} 的 volume 应在 0 到 1 之间。`);
  }
  const fragmentIds = new Set<string>();
  for (const fragment of level.fragments) {
    assert(record(fragment) && typeof fragment.id === "string" && !fragmentIds.has(fragment.id), "片段 ID 缺失或重复。");
    assert(typeof fragment.label === "string" && typeof fragment.color === "string" && /^#[0-9a-f]{6}$/i.test(fragment.color), "片段标签或颜色无效。");
    assert(finite(fragment.x) && finite(fragment.y) && typeof fragment.audioKey === "string", "片段坐标或音频引用无效。");
    assert(fragment.audioKey in assetsValue.audio, `片段 ${fragment.id} 引用了不存在的音频。`);
    fragmentIds.add(fragment.id);
  }
  assert(record(level.puzzle) && Array.isArray(level.puzzle.correctOrder), "缺少排序答案。");
  const order = level.puzzle.correctOrder;
  assert(order.length === fragmentIds.size && new Set(order).size === order.length && order.every(id => typeof id === "string" && fragmentIds.has(id)), "答案必须恰好包含所有片段一次。");
  assert(typeof level.puzzle.allowReferencePlayback === "boolean", "完整乐句试听开关无效。");
  assert(typeof level.puzzle.fullPhraseAudioKey === "string" && level.puzzle.fullPhraseAudioKey in assetsValue.audio, "完整乐句音频不存在。");
  assert(level.nextLevelId === null || typeof level.nextLevelId === "string", "nextLevelId 应为关卡 ID 或 null。");
}

export function asAssetManifest(value: unknown): AssetManifest { return value as AssetManifest; }
