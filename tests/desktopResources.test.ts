import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";

const { resolveGameResource } = createRequire(import.meta.url)("../desktop/resource-path.cjs") as {
  resolveGameResource(root: string, url: string): string | null;
};
const root = path.resolve("/tmp/melody-bundle/dist");

test("桌面协议可解析主页、资源和带中文的素材路径", () => {
  assert.equal(resolveGameResource(root, "melody://game/"), path.join(root, "index.html"));
  assert.equal(resolveGameResource(root, "melody://game/content/level-01/level.json"), path.join(root, "content/level-01/level.json"));
  assert.equal(resolveGameResource(root, "melody://game/content/%E6%98%A5.wav"), path.join(root, "content/春.wav"));
});

test("桌面协议拒绝无关主机、非法编码和跨目录路径", () => {
  assert.equal(resolveGameResource(root, "https://game/index.html"), null);
  assert.equal(resolveGameResource(root, "melody://other/index.html"), null);
  assert.equal(resolveGameResource(root, "melody://game/%2e%2e%2fsecret"), null);
  assert.equal(resolveGameResource(root, "melody://game/a%5c..%5csecret"), null);
  assert.equal(resolveGameResource(root, "melody://game/%zz"), null);
});
