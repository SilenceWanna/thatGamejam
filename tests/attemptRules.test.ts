import { test } from "node:test";
import assert from "node:assert/strict";
import { LevelProgress } from "../src/core/LevelProgress";
import { fragmentInterval, sequenceOffsets } from "../src/core/melodyTiming";
const ids = ["wind", "rain", "sprout", "bird"];
function collectAll(progress: LevelProgress): void { progress.revealFragments(); ids.forEach(id => assert.equal(progress.collect(id), true)); }
test("F 显现前无法收集；重复和未知声音不增加进度", () => {
  const p = new LevelProgress(ids); assert.equal(p.collect("wind"), false); assert.equal(p.revealFragments(), true);
  assert.equal(p.collect("wind"), true); assert.equal(p.collect("wind"), false); assert.equal(p.collect("unknown"), false);
  assert.equal(p.revealFragments(), false); assert.equal(p.count, 1);
});
test("提示可连续使用三次且与演奏次数独立", () => {
  const p = new LevelProgress(ids); assert.equal(p.useReference(), true); assert.equal(p.useReference(), true);
  assert.equal(p.referencesRemaining, 1); assert.equal(p.attemptsRemaining, 3);
  collectAll(p); p.perform(false); assert.equal(p.referencesRemaining, 1); assert.equal(p.useReference(), true); assert.equal(p.useReference(), false);
});
test("错误演奏保留收集，三次失败耗空瓶子；新局重置", () => {
  const p = new LevelProgress(ids); assert.equal(p.perform(false), false); collectAll(p);
  for (const remaining of [2, 1, 0]) { assert.equal(p.perform(false), true); assert.equal(p.attemptsRemaining, remaining); assert.equal(p.count, 4); assert.equal(p.fragmentsRevealed, true); }
  assert.equal(p.phase, "failed"); assert.equal(p.perform(true), false); assert.equal(p.referencesRemaining, 3);
  const restarted = new LevelProgress(ids); assert.equal(restarted.attemptsRemaining, 3); assert.equal(restarted.count, 0);
});
test("第三次正确时即使瓶子耗空仍然成功", () => {
  const p = new LevelProgress(ids); collectAll(p); p.perform(false); p.perform(false); p.perform(true);
  assert.equal(p.phase, "completed"); assert.equal(p.attemptsRemaining, 0); assert.equal(p.perform(false), false);
});
test("固定 BPM 起音时刻与音频素材长度无关", () => {
  assert.equal(fragmentInterval({ bpm: 120, beatsPerFragment: 1 }), 0.5);
  assert.deepEqual(sequenceOffsets(4, { bpm: 120, beatsPerFragment: 1 }), [0, 0.5, 1, 1.5]);
  assert.throws(() => fragmentInterval({ bpm: 0, beatsPerFragment: 1 }));
});
