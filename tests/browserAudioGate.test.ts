import { test } from "node:test";
import assert from "node:assert/strict";
import { BrowserAudioGate } from "../src/audio/BrowserAudioGate";

test("原生输入事件内立即请求解锁，而不是等到下一游戏帧", async () => {
  const target = new EventTarget();
  let resumed = 0;
  const context = { state: "suspended" as AudioContextState, resume: async () => { resumed++; context.state = "running"; } };
  const gate = new BrowserAudioGate(context, target);
  target.dispatchEvent(new Event("pointerdown"));
  assert.equal(resumed, 1);
  assert.equal(await gate.ensureReady(), true);
  gate.destroy();
});

test("恢复尚未完成时不能报告可以播放", async () => {
  let finish!: () => void;
  const context = { state: "suspended" as AudioContextState, resume: () => new Promise<void>(resolve => { finish = resolve; }) };
  const gate = new BrowserAudioGate(context, new EventTarget());
  let completed = false;
  const ready = gate.ensureReady().then(value => { completed = true; return value; });
  await Promise.resolve();
  assert.equal(completed, false);
  context.state = "running"; finish();
  assert.equal(await ready, true);
  gate.destroy();
});

test("浏览器拒绝解锁后可在下一次真实交互重试", async () => {
  let denied = true;
  const context = { state: "suspended" as AudioContextState, resume: async () => {
    if (denied) throw new Error("NotAllowedError");
    context.state = "running";
  } };
  const gate = new BrowserAudioGate(context, new EventTarget());
  assert.equal(await gate.ensureReady(), false);
  denied = false;
  assert.equal(await gate.ensureReady(), true);
  gate.destroy();
});

test("Safari 恢复请求一直不返回时超时失败，允许按钮重试", async () => {
  const context = { state: "suspended" as AudioContextState, resume: () => new Promise<void>(() => {}) };
  const gate = new BrowserAudioGate(context, new EventTarget(), 10);
  assert.equal(await gate.ensureReady(), false);
  gate.destroy();
});

test("resume Promise 成功但上下文仍暂停时，不能算作已经启用声音", async () => {
  const gate = new BrowserAudioGate({ state: "suspended", resume: async () => {} }, new EventTarget());
  assert.equal(await gate.ensureReady(), false);
  gate.destroy();
});

test("关卡销毁会取消旧异步恢复并移除输入监听", async () => {
  let finish!: () => void;
  let calls = 0;
  const context = { state: "suspended" as AudioContextState, resume: () => {
    calls++;
    return new Promise<void>(resolve => { finish = resolve; });
  } };
  const target = new EventTarget();
  const gate = new BrowserAudioGate(context, target);
  const ready = gate.ensureReady();
  gate.destroy(); context.state = "running"; finish();
  assert.equal(await ready, false);
  context.state = "suspended";
  target.dispatchEvent(new Event("keydown"));
  assert.equal(calls, 1);
});

test("关闭的音频上下文不能播放，HTML Audio 回退不需要 Web Audio 解锁", async () => {
  const closed = new BrowserAudioGate({ state: "closed", resume: async () => { throw new Error("不应调用"); } }, new EventTarget());
  const fallback = new BrowserAudioGate(null, new EventTarget());
  assert.equal(await closed.ensureReady(), false);
  assert.equal(await fallback.ensureReady(), true);
  closed.destroy(); fallback.destroy();
});
