import Phaser from "phaser";
import { UiButton } from "../ui/components";

/** 临时调试入口；正式版将此开关设为 false 即不创建调试按钮。 */
export const DEBUG_CONTROLS_ENABLED = true;

/** 独立装配左上角调试复位；重开动作由场景注入，不接触玩法状态。 */
export function installDebugControls(scene: Phaser.Scene, restartLevel: () => void): void {
  if (!DEBUG_CONTROLS_ENABLED) return;
  const reset = new UiButton(scene, 68, 30, 78, 36, "复位", restartLevel);
  reset.root.setDepth(30);
}
