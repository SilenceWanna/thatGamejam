/** 节拍仅以秒和 BPM 表达，不依赖 Phaser，迁移引擎时可沿用相同规则。 */
export interface MelodyTiming { bpm: number; beatsPerFragment: number }

export function fragmentInterval(timing: MelodyTiming): number {
  if (!Number.isFinite(timing.bpm) || timing.bpm <= 0 || !Number.isFinite(timing.beatsPerFragment) || timing.beatsPerFragment <= 0) {
    throw new Error("BPM 与每片段拍数必须大于零。");
  }
  return 60 / timing.bpm * timing.beatsPerFragment;
}

export function sequenceOffsets(count: number, timing: MelodyTiming): number[] {
  return Array.from({ length: count }, (_, index) => index * fragmentInterval(timing));
}
