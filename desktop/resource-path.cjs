const path = require("node:path");

/** 将游戏协议 URL 安全地映射到打包后的 dist，拒绝其他主机和越界路径。 */
function resolveGameResource(root, url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "melody:" || parsed.hostname !== "game") return null;
    const pathname = decodeURIComponent(parsed.pathname);
    if (pathname.includes("\0") || pathname.includes("\\")) return null;
    const filePath = path.resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
    const relative = path.relative(root, filePath);
    return relative && !relative.startsWith("..") && !path.isAbsolute(relative) ? filePath : null;
  } catch {
    return null;
  }
}

module.exports = { resolveGameResource };
