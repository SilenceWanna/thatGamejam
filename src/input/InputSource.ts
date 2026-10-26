/** 引擎与设备无关的单帧输入；手柄、触屏以后实现同一个接口即可。 */
export interface PlayerInput {
  /** -1 向左、0 停止、1 向右；键盘、手柄和触屏都转换成这个方向值。 */
  moveAxis: number;
  /** 本帧首次按下跳跃；长按不会反复起跳。 */
  jumpPressed: boolean;
  /** 本帧触发全图显现，对应键盘 F。 */
  revealPressed: boolean;
  /** 本帧触发附近瓶子收集，对应键盘 E；接触瓶子本身不会生成这个动作。 */
  interactPressed: boolean;
}
export interface InputSource {
  /** 读取并消费这一帧的一次性动作，持续移动方向继续保留。 */
  sample(): PlayerInput;
  /** 暂停或转场时清空未执行动作与持续输入。 */
  reset(): void;
  /** 离开关卡时解除设备事件监听。 */
  destroy(): void;
}
