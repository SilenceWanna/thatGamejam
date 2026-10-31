import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { validateContent } from "../src/content/validateContent";
import type { AssetManifest, LevelDefinition } from "../src/content/types";
import { maximumJumpHeight } from "../src/core/jumpGeometry";

const directory = fileURLToPath(new URL("../public/content/level-01/", import.meta.url));
const level = JSON.parse(readFileSync(resolve(directory, "level.json"), "utf8")) as LevelDefinition;
const assets = JSON.parse(readFileSync(resolve(directory, "assets.json"), "utf8")) as AssetManifest;

test("第一关内容通过校验，所有配置文件均存在", () => {
  assert.doesNotThrow(() => validateContent(level, assets));
  assert.equal(level.platforms.length, 1);
  assert.equal(level.fragments.length, 4);
  for (const audio of Object.values(assets.audio)) {
    for (const file of audio.files) assert.ok(existsSync(resolve(directory, file)), `缺少音频 ${file}`);
  }
  for (const [key, image] of Object.entries(assets.images)) {
    if (image.file) assert.ok(existsSync(resolve(directory, image.file)), `缺少图片 ${key}: ${image.file}`);
  }
});

test("拱门可由地面跳上，四处声音的定位与配置一致", () => {
  const [arch] = level.platforms;
  assert.ok(level.world.groundY - arch.topY < maximumJumpHeight(level.player.jumpSpeed, level.player.gravity));
  assert.equal(arch.id, "arch-platform");
  const elevatedRise = maximumJumpHeight(level.player.elevatedJumpSpeed, level.player.gravity);
  assert.ok(arch.topY - elevatedRise >= (assets.images.player.displayHeight ?? 0), "在拱门跳跃时角色应位于画面内");
  assert.ok(arch.topY - elevatedRise - level.player.bodyHeight / 2 <= level.fragments.find(f => f.id === "bird")!.y + level.fragments.find(f => f.id === "bird")!.interactionRadius, "鸟巢仍可到达");
  assert.equal(level.fragments.find(fragment => fragment.id === "rain")?.anchorImage, "cloud");
  assert.deepEqual(level.fragments.map(fragment => fragment.id), ["bird", "rain", "sprout", "wind"]);
});

test("缺失答案、重复 ID 和失效音频引用在构建世界前被拦截", () => {
  const wrongAnswer = structuredClone(level);
  wrongAnswer.puzzle.correctOrder[0] = "unknown";
  assert.throws(() => validateContent(wrongAnswer, assets), /答案/);
  const duplicate = structuredClone(level);
  duplicate.fragments[1].id = duplicate.fragments[0].id;
  assert.throws(() => validateContent(duplicate, assets), /重复/);
  const missingAudio = structuredClone(level);
  missingAudio.fragments[0].audioKey = "missing";
  assert.throws(() => validateContent(missingAudio, assets), /音频/);
  assert.throws(() => validateContent(null, assets), /必须是对象/);
  const invalidSize = structuredClone(assets);
  invalidSize.images.player.displayWidth = -1;
  assert.throws(() => validateContent(level, invalidSize), /displayWidth/);
  const invalidAnimation = structuredClone(assets);
  invalidAnimation.images.player.animations = { run: [-1] };
  assert.throws(() => validateContent(level, invalidAnimation), /动画/);
  const invalidArt = structuredClone(level);
  invalidArt.art!.layers[0].image = "missing-image";
  assert.throws(() => validateContent(invalidArt, assets), /图层引用/);
  const invalidLayer = structuredClone(level);
  invalidLayer.art!.layers[0].layer = 0;
  assert.throws(() => validateContent(invalidLayer, assets), /图层编号/);
});

/** 解析 WAV 的数据块，验证四段临时音频与整句确实来自相同样本。 */
function wavData(file: string): Buffer {
  const buffer = readFileSync(resolve(directory, file));
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
  assert.equal(buffer.toString("ascii", 8, 12), "WAVE");
  for (let offset = 12; offset + 8 <= buffer.length;) {
    const size = buffer.readUInt32LE(offset + 4);
    if (buffer.toString("ascii", offset, offset + 4) === "data") return buffer.subarray(offset + 8, offset + 8 + size);
    offset += 8 + size + size % 2;
  }
  throw new Error(`WAV 缺少 data 区块：${file}`);
}

test("四段临时音频按正确顺序拼接后与完整乐句逐样本相同", () => {
  const segments = level.puzzle.correctOrder.map(id => {
    const fragment = level.fragments.find(fragment => fragment.id === id)!;
    return wavData(assets.audio[fragment.audioKey].files[0]);
  });
  const full = wavData(assets.audio[level.puzzle.fullPhraseAudioKey].files[0]);
  assert.deepEqual(Buffer.concat(segments), full);
  assert.ok(full.some(value => value !== 0), "临时音频包含实际声音");
});

test("开场、模糊回忆、恢复有独立音频接口，模糊素材确实不同于开场", () => {
  const keys = [level.puzzle.openingPhraseAudioKey, level.puzzle.memoryPhraseAudioKey, level.puzzle.restoredPhraseAudioKey];
  assert.equal(new Set(keys).size, 3);
  const buffers = keys.map(key => wavData(assets.audio[key].files[0]));
  assert.notDeepEqual(buffers[0], buffers[1]);
  assert.equal(buffers[0].length, buffers[1].length);
  const missing = structuredClone(level);
  missing.puzzle.memoryPhraseAudioKey = "missing-memory";
  assert.throws(() => validateContent(missing, assets), /memoryPhraseAudioKey/);
});
