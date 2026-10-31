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
  for (const name of ["moveSpeed", "jumpSpeed", "elevatedJumpSpeed", "gravity", "bodyWidth", "bodyHeight"]) {
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
        assert(["idle", "run", "jump", "interact"].includes(state) && Array.isArray(frames) && frames.length > 0 && frames.every(frame => Number.isInteger(frame) && frame >= 0), `图片 ${name} 的动画 ${state} 无效。`);
      }
    }
  }
  for (const [name, audio] of Object.entries(assetsValue.audio)) {
    assert(record(audio) && Array.isArray(audio.files) && audio.files.every(file => typeof file === "string"), `音频 ${name} 的 files 无效。`);
    assert(finite(audio.volume) && audio.volume >= 0 && audio.volume <= 1, `音频 ${name} 的 volume 应在 0 到 1 之间。`);
  }
  if (level.art !== undefined) {
    assert(record(level.art) && Array.isArray(level.art.layers) && record(level.art.platforms), "美术图层或平台外观配置无效。");
    for (const layer of level.art.layers) {
      assert(record(layer) && typeof layer.image === "string" && layer.image in assetsValue.images, "美术图层引用了不存在的图片。");
      assert(Number.isInteger(layer.layer) && Number(layer.layer) >= 1 && Number(layer.layer) <= 6, "美术图层编号必须为 1 到 6，小编号在前。");
      assert(finite(layer.x) && finite(layer.y) && positive(layer.width) && positive(layer.height), "美术图层位置或尺寸无效。");
      if (layer.phase !== undefined) assert(["frozen", "transition", "restored"].includes(String(layer.phase)), "美术图层季节状态无效。");
      if (layer.fit !== undefined) assert(["cover", "contain", "stretch"].includes(String(layer.fit)), "美术图层缩放模式无效。");
      for (const origin of [layer.originX, layer.originY]) if (origin !== undefined) assert(finite(origin) && origin >= 0 && origin <= 1, "美术图层锚点必须位于 0 到 1 之间。");
      if (layer.motion !== undefined) assert(record(layer.motion) && finite(layer.motion.distance) && positive(layer.motion.durationMs), "图层运动配置无效。");
      if (layer.repeatX !== undefined) assert(typeof layer.repeatX === "boolean", "地面平铺开关无效。");
    }
    assert(record(level.art.ui), "缺少常驻界面位置配置。");
    for (const name of ["reference", "inventory", "sequence", "play", "reset"]) {
      const box = level.art.ui[name];
      assert(record(box) && finite(box.x) && finite(box.y) && positive(box.width) && positive(box.height), `界面 ${name} 的位置或尺寸无效。`);
    }
    for (const [id, art] of Object.entries(level.art.platforms)) {
      assert(platformIds.has(id) && record(art), "平台外观引用了不存在的平台。");
      assert(typeof art.image === "string" && art.image in assetsValue.images && positive(art.width) && positive(art.height), "平台外观图片或尺寸无效。");
      if (art.offsetY !== undefined) assert(finite(art.offsetY), "平台外观高度偏移无效。");
    }
  }
  const fragmentIds = new Set<string>();
  for (const fragment of level.fragments) {
    assert(record(fragment) && typeof fragment.id === "string" && !fragmentIds.has(fragment.id), "片段 ID 缺失或重复。");
    assert(typeof fragment.label === "string" && typeof fragment.color === "string" && /^#[0-9a-f]{6}$/i.test(fragment.color), "片段标签或颜色无效。");
    assert(finite(fragment.x) && finite(fragment.y) && typeof fragment.audioKey === "string", "片段坐标或音频引用无效。");
    assert(fragment.audioKey in assetsValue.audio, `片段 ${fragment.id} 引用了不存在的音频。`);
    assert(["wind", "rain", "sprout", "bird"].includes(String(fragment.sourceType)) && positive(fragment.interactionRadius), "自然声音类型或互动范围无效。");
    if (fragment.anchorImage !== undefined) {
      assert(typeof fragment.anchorImage === "string" && fragment.anchorImage in assetsValue.images, "声音来源的锚点图片无效。");
      for (const offset of [fragment.anchorOffsetX, fragment.anchorOffsetY]) if (offset !== undefined) assert(finite(offset), "声音锚点偏移无效。");
    }
    if (fragment.jarImages !== undefined) {
      assert(record(fragment.jarImages), "瓶子图片映射无效。");
      for (const [state, key] of Object.entries(fragment.jarImages)) {
        assert(["low", "half", "full"].includes(state) && typeof key === "string" && key in assetsValue.images, "瓶子状态引用了不存在的图片。");
      }
    }
    fragmentIds.add(fragment.id);
  }
  assert(record(level.puzzle) && Array.isArray(level.puzzle.correctOrder), "缺少排序答案。");
  const order = level.puzzle.correctOrder;
  assert(order.length === fragmentIds.size && new Set(order).size === order.length && order.every(id => typeof id === "string" && fragmentIds.has(id)), "答案必须恰好包含所有片段一次。");
  assert(typeof level.puzzle.allowReferencePlayback === "boolean", "完整乐句试听开关无效。");
  assert(typeof level.puzzle.fullPhraseAudioKey === "string" && level.puzzle.fullPhraseAudioKey in assetsValue.audio, "完整乐句音频不存在。");
  for (const field of ["openingPhraseAudioKey", "memoryPhraseAudioKey", "restoredPhraseAudioKey"]) {
    assert(typeof level.puzzle[field] === "string" && String(level.puzzle[field]) in assetsValue.audio, `${field} 音频接口缺失。`);
  }
  assert(Number.isInteger(level.puzzle.maxAttempts) && Number(level.puzzle.maxAttempts) > 0, "尝试次数必须为正整数。");
  assert(level.puzzle.maxAttempts === 3 && level.puzzle.maxReferences === 3, "当前瓶子与提示美术固定支持三次演奏和三次提示。");
  assert(typeof level.puzzle.allowUnlimitedAttemptsAfterExhaustion === "boolean", "机会耗尽后的规则无效。");
  assert(positive(level.puzzle.bpm) && positive(level.puzzle.beatsPerFragment), "BPM 和片段拍数必须大于零。");
  assert(record(level.story), "叙事文本不完整。");
  const story = level.story;
  assert(["awakening", "objective", "restored"].every(name => typeof story[name] === "string"), "叙事文本不完整。");
  assert(record(level.season) && ["spring", "summer", "autumn", "winter"].includes(String(level.season.id)), "季节标识无效。");
  assert(positive(level.season.exitX) && level.season.exitX < level.world.width && typeof level.season.nextSeasonLabel === "string", "季节出口配置无效。");
  for (const field of ["disorderTint", "restoredTint"]) assert(typeof level.season[field] === "string" && /^#[0-9a-f]{6}$/i.test(String(level.season[field])), "季节颜色无效。");
  assert(level.nextLevelId === null || typeof level.nextLevelId === "string", "nextLevelId 应为关卡 ID 或 null。");
}

export function asAssetManifest(value: unknown): AssetManifest { return value as AssetManifest; }
