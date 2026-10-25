/** 引擎与设备无关的单帧输入；手柄、触屏以后实现同一个接口即可。 */
export interface PlayerInput { moveAxis: number; jumpPressed: boolean }
export interface InputSource {
  sample(): PlayerInput;
  reset(): void;
  destroy(): void;
}
