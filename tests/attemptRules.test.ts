import { test } from "node:test";
import assert from "node:assert/strict";
import { LevelProgress } from "../src/core/LevelProgress";
import { fragmentInterval, sequenceOffsets } from "../src/core/melodyTiming";

const ids = ["wind", "rain", "sprout", "bird"];
function enterPuzzle(progress: LevelProgress): void {
  assert.equal(progress.revealFragments(), true);
  ids.forEach(id => assert.equal(progress.collect(id), true));
  assert.equal(progress.enterSpawnPoint(), true);
}

test("F 之前不能拾取；F 显现一轮所有音符，重复按键不重置收集", () => {
  const progress = new LevelProgress(ids);
  assert.equal(progress.fragmentsRevealed, false);
  ids.forEach(id => assert.equal(progress.collect(id), false));
  assert.equal(progress.revealFragments(), true);
  assert.equal(progress.collect("wind"), true);
  assert.equal(progress.revealFragments(), false);
  assert.equal(progress.count, 1);
});

test("每轮只能听一次模糊回忆，退出重进和清空排列不增加额度", () => {
  const progress = new LevelProgress(ids);
  assert.equal(progress.useReference(), false);
  enterPuzzle(progress);
  assert.equal(progress.referencesRemaining, 3);
  assert.equal(progress.useReference(), true);
  assert.equal(progress.referencesRemaining, 2);
  assert.equal(progress.attemptsRemaining, 3);
  assert.equal(progress.useReference(), false);
  progress.leaveArrangement();
  progress.enterSpawnPoint();
  assert.equal(progress.useReference(), false);
  assert.equal(progress.referencesRemaining, 2);
});

test("听过再答错只扣本轮一次，片段全部复位隐藏且必须重新按 F", () => {
  const progress = new LevelProgress(ids);
  enterPuzzle(progress);
  progress.useReference();
  assert.equal(progress.failArrangement(), true);
  assert.equal(progress.attemptsRemaining, 2);
  assert.equal(progress.referencesRemaining, 2);
  assert.equal(progress.count, 0);
  assert.equal(progress.fragmentsRevealed, false);
  assert.equal(progress.phase, "exploring");
  assert.equal(progress.collect("wind"), false);
  assert.equal(progress.enterSpawnPoint(), false);
  enterPuzzle(progress);
  assert.equal(progress.useReference(), true);
  assert.equal(progress.referencesRemaining, 1);
});

test("未听就答错也空一颗点，未使用的本轮回忆不能累计到下一轮", () => {
  const progress = new LevelProgress(ids);
  enterPuzzle(progress);
  progress.failArrangement();
  assert.equal(progress.referencesRemaining, 2);
  assert.equal(progress.attemptsRemaining, 2);
  enterPuzzle(progress);
  assert.equal(progress.useReference(), true);
  assert.equal(progress.useReference(), false);
  progress.failArrangement();
  assert.equal(progress.referencesRemaining, 1);
});

test("三轮均失败进入失败状态，新关卡实例重置三次机会", () => {
  const progress = new LevelProgress(ids);
  for (let round = 0; round < 3; round++) {
    enterPuzzle(progress);
    if (round !== 1) progress.useReference();
    progress.failArrangement();
  }
  assert.equal(progress.phase, "failed");
  assert.equal(progress.referencesRemaining, 0);
  assert.equal(progress.attemptsRemaining, 0);
  assert.equal(progress.failArrangement(), false);
  assert.equal(progress.revealFragments(), false);
  assert.equal(progress.useReference(), false);
  const restarted = new LevelProgress(ids);
  assert.equal(restarted.referencesRemaining, 3);
  assert.equal(restarted.count, 0);
  assert.equal(restarted.fragmentsRevealed, false);
});

test("正确答案不会消耗额外尝试或复位片段，完成后不能再次扣机会", () => {
  const progress = new LevelProgress(ids);
  enterPuzzle(progress);
  progress.useReference();
  assert.equal(progress.complete(true), true);
  assert.equal(progress.attemptsRemaining, 3);
  assert.equal(progress.referencesRemaining, 2);
  assert.equal(progress.count, 4);
  assert.equal(progress.failArrangement(), false);
});

test("固定 BPM 的起音时刻与音频素材长短无关", () => {
  assert.equal(fragmentInterval({ bpm: 120, beatsPerFragment: 1 }), 0.5);
  assert.deepEqual(sequenceOffsets(4, { bpm: 120, beatsPerFragment: 1 }), [0, 0.5, 1, 1.5]);
  assert.deepEqual(sequenceOffsets(4, { bpm: 60, beatsPerFragment: 2 }), [0, 2, 4, 6]);
  assert.throws(() => fragmentInterval({ bpm: 0, beatsPerFragment: 1 }));
  assert.throws(() => fragmentInterval({ bpm: 100, beatsPerFragment: -1 }));
});
