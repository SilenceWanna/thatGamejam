import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { validateContent } from "../src/content/validateContent";
import type { AssetManifest, LevelDefinition } from "../src/content/types";
import { descendingTravelTime, maximumJumpHeight } from "../src/core/jumpGeometry";

const directory = fileURLToPath(new URL("../public/content/level-01/", import.meta.url));
const level = JSON.parse(readFileSync(resolve(directory, "level.json"), "utf8")) as LevelDefinition;
const assets = JSON.parse(readFileSync(resolve(directory, "assets.json"), "utf8")) as AssetManifest;

test("第一关内容通过校验，所有配置文件均存在", () => {
  assert.doesNotThrow(() => validateContent(level, assets));
  assert.equal(level.platforms.length, 3);
  assert.equal(level.fragments.length, 4);
  for (const audio of Object.values(assets.audio)) {
    for (const file of audio.files) assert.ok(existsSync(resolve(directory, file)), `缺少音频 ${file}`);
  }
});

test("高度为中高低，地面可达左右平台；中央仅能从左侧跳上，右侧不可达", () => {
  const [left, center, right] = level.platforms;
  const { player, world } = level;
  assert.ok(center.topY < left.topY && left.topY < right.topY);
  const height = maximumJumpHeight(player.jumpSpeed, player.gravity);
  assert.ok(world.groundY - center.topY > height);
  for (const side of [left, right]) {
    assert.ok(world.groundY - side.topY < height);
  }
  // 当前路线有意不对称：左侧高差 140 可跳上中央，右侧高差 160 超过最大跳高。
  const timeFromLeft = descendingTravelTime(player.jumpSpeed, player.gravity, left.topY - center.topY);
  assert.ok(timeFromLeft !== null, "左侧平台能够跳到中央平台的高度");
  const requiredHorizontalTravel = Math.abs(left.x - center.x) - center.width / 2 + player.bodyWidth / 2;
  assert.ok(requiredHorizontalTravel < player.moveSpeed * timeFromLeft, "从左平台中心出发，有足够时间落到中央平台内侧");
  assert.equal(descendingTravelTime(player.jumpSpeed, player.gravity, right.topY - center.topY), null,
    "右侧到中央按设计不可达，不应通过调参意外开放这条路线");
  const centerFragment = level.fragments.find(fragment => fragment.x === center.x)!;
  const groundJumpHeadY = world.groundY - height - player.bodyHeight;
  assert.ok(groundJumpHeadY > centerFragment.y + 22, "不能从地面跳起提前触碰最高处收集物");
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
