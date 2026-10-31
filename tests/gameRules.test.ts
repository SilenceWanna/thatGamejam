import { test } from "node:test";
import assert from "node:assert/strict";
import { LevelProgress } from "../src/core/LevelProgress";
import { PhraseArrangement } from "../src/core/PhraseArrangement";

const ids = ["mist", "bloom", "amber", "fern"];

test("槽位不完整时不算正确，所有错误排列都不能通关", () => {
  const arrangement = new PhraseArrangement(ids);
  assert.equal(arrangement.isFilled, false);
  assert.equal(arrangement.isCorrect, false);
  function permutations(remaining: string[]): string[][] {
    return remaining.length === 0 ? [[]] : remaining.flatMap((id, index) =>
      permutations(remaining.filter((_, candidate) => candidate !== index)).map(tail => [id, ...tail]));
  }
  for (const order of permutations(ids)) {
    arrangement.clear();
    order.forEach((id, index) => arrangement.place(id, index));
    assert.equal(arrangement.isFilled, true);
    assert.equal(arrangement.isCorrect, order.every((id, index) => id === ids[index]));
  }
});

test("已放入的片段交换位置，不会丢失或重复", () => {
  const arrangement = new PhraseArrangement(ids);
  ids.forEach((id, index) => arrangement.place(id, index));
  arrangement.place("mist", 2);
  assert.deepEqual(arrangement.values, ["amber", "bloom", "mist", "fern"]);
  arrangement.place("mist", 2);
  assert.deepEqual(arrangement.values, ["amber", "bloom", "mist", "fern"]);
  arrangement.remove(0);
  arrangement.place("mist", 0);
  assert.deepEqual(arrangement.values, ["mist", "bloom", null, "fern"]);
  arrangement.place("amber", 2);
  assert.equal(arrangement.isCorrect, true);
  const exposed = arrangement.values as (string | null)[];
  exposed[0] = "unknown";
  assert.equal(arrangement.isCorrect, true, "外部读取不能修改内部槽位");
  arrangement.clear();
  assert.deepEqual(arrangement.values, [null, null, null, null]);
});

test("非法片段、重复答案和越界槽位得到明确错误", () => {
  assert.throws(() => new LevelProgress([]));
  assert.throws(() => new LevelProgress(["a", "a"]));
  assert.throws(() => new PhraseArrangement(["a", "a"]));
  const arrangement = new PhraseArrangement(ids);
  assert.throws(() => arrangement.place("unknown", 0));
  assert.throws(() => arrangement.place("mist", -1));
  assert.throws(() => arrangement.place("mist", 4));
  assert.throws(() => arrangement.remove(0.5));
});
