const { app, BrowserWindow, net, protocol } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { resolveGameResource } = require("./resource-path.cjs");

// 使用标准安全协议读取程序内的资源，使 fetch、图片和 Web Audio 可离线工作。
protocol.registerSchemesAsPrivileged([
  { scheme: "melody", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

/** 创建独立游戏窗口；画面保持现有键盘、鼠标输入和音频解锁流程。 */
function createGameWindow() {
  const window = new BrowserWindow({
    title: "瓶中小调 · 春季 Demo",
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    useContentSize: true,
    autoHideMenuBar: true,
    backgroundColor: "#1e2d27",
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  window.setMenuBarVisibility(false);
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("melody://game/")) event.preventDefault();
  });
  void window.loadURL("melody://game/index.html");
}

app.whenReady().then(() => {
  const gameRoot = path.join(app.getAppPath(), "dist");
  protocol.handle("melody", request => {
    if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
    const filePath = resolveGameResource(gameRoot, request.url);
    if (!filePath) return new Response("Not found", { status: 404 });
    return net.fetch(pathToFileURL(filePath).href, { method: request.method });
  });
  createGameWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createGameWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
