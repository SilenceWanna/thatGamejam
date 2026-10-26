/** 节拍仅以秒和 BPM 表达，不依赖 Phaser，迁移引擎时可沿用相同规则。 */
export interface MelodyTiming { bpm: number; beatsPerFragment: number }

/** 按关卡 BPM 和每段拍数算出相邻片段的起音间隔，单位为秒。 */
export function fragmentInterval(timing: MelodyTiming): number {
  if (!Number.isFinite(timing.bpm) || timing.bpm <= 0 || !Number.isFinite(timing.beatsPerFragment) || timing.beatsPerFragment <= 0) {
    throw new Error("BPM 与每片段拍数必须大于零。");
  }
  return 60 / timing.bpm * timing.beatsPerFragment;
}

/** 生成从第一拍开始的固定起音时刻；素材较长时允许尾音重叠，不推迟下一拍。 */
export function sequenceOffsets(count: number, timing: MelodyTiming): number[] {
  return Array.from({ length: count }, (_, index) => index * fragmentInterval(timing));
}
