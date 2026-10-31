import { test } from "node:test";
import assert from "node:assert/strict";
import { JumpState, predictLanding } from "../src/core/JumpState";
test("跳跃依次显示起跳、上升、顶点、下降及落地 0.3 秒", () => {
  const s = new JumpState(); s.start();
  assert.equal(s.update(true, -1000, 1800, 16, null), 2);
  assert.equal(s.update(false, -800, 1800, 16, null), 3);
  assert.equal(s.update(false, 0, 1800, 16, null), 4);
  assert.equal(s.update(false, 300, 1800, 16, null), 5);
  assert.equal(s.update(true, 0, 1800, 16, null), 6);
  assert.equal(s.update(true, 0, 1800, 299, null), 6);
  assert.equal(s.update(true, 0, 1800, 1, null), 7);
});
test("预测最早有效落点，离开拱门范围后改为地面", () => {
  const motion = { x: 900, feetY: 200, velocityX: 0, velocityY: 100, gravity: 1800, bodyWidth: 30, worldWidth: 1280 };
  const surfaces = [{ left: 800, right: 1190, topY: 294 }, { left: 0, right: 1280, topY: 541 }];
  assert.equal(predictLanding(motion, surfaces)?.y, 294);
  assert.equal(predictLanding({ ...motion, x: 500 }, surfaces)?.y, 541);
});
