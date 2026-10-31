/** 可站立表面在逻辑坐标中的范围，Y 向下；地面也用同一结构表示。 */
export interface LandingSurface { left: number; right: number; topY: number }
export interface JumpMotion { x: number; feetY: number; velocityX: number; velocityY: number; gravity: number; bodyWidth: number; worldWidth: number }
export interface LandingPrediction { x: number; y: number; time: number }
export type JumpFrame = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** 以当前水平速度与重力估算所有向下穿过的站立面，选择最早的有效落点。 */
export function predictLanding(motion: JumpMotion, surfaces: readonly LandingSurface[]): LandingPrediction | null {
  if (!(motion.gravity > 0)) return null;
  let best: LandingPrediction | null = null;
  for (const surface of surfaces) {
    const discriminant = motion.velocityY ** 2 + 2 * motion.gravity * (surface.topY - motion.feetY);
    if (discriminant < 0) continue;
    const time = (-motion.velocityY + Math.sqrt(discriminant)) / motion.gravity;
    if (time < 0) continue;
    const x = Math.max(motion.bodyWidth / 2, Math.min(motion.worldWidth - motion.bodyWidth / 2, motion.x + motion.velocityX * time));
    if (x + motion.bodyWidth / 2 < surface.left || x - motion.bodyWidth / 2 > surface.right) continue;
    if (!best || time < best.time) best = { x, y: surface.topY, time };
  }
  return best;
}

/** 依据运动阶段选原画 1–7；落地第 6 帧保持 0.3 秒后切换至第 7 帧。 */
export class JumpState {
  private frame: JumpFrame = 1;
  private airborne = false;
  private landingMs = 0;
  private launchFrame = false;
  private leftGround = false;
  predictedLanding: LandingPrediction | null = null;

  /** 收到实际起跳事件时，当前渲染帧立即显示第 2 帧。 */
  start(): void { this.frame = 2; this.airborne = true; this.landingMs = 0; this.launchFrame = true; this.leftGround = false; }

  /** 更新阶段；预测落点随玩家水平输入变化，实际落地仍以物理碰撞为准。 */
  update(grounded: boolean, velocityY: number, gravity: number, deltaMs: number, landing: LandingPrediction | null): JumpFrame {
    this.predictedLanding = landing;
    if (!grounded) this.leftGround = true;
    if (this.launchFrame) { this.launchFrame = false; return this.frame; }
    if (this.airborne && this.leftGround && grounded && velocityY >= 0) {
      this.airborne = false; this.landingMs = 300; this.frame = 6;
      return this.frame;
    }
    if (this.airborne) {
      const apexTolerance = Math.max(35, gravity * 0.04);
      if (velocityY < -apexTolerance) this.frame = 3;
      else if (velocityY <= apexTolerance) this.frame = 4;
      else this.frame = 5;
      return this.frame;
    }
    if (this.landingMs > 0) {
      this.landingMs = Math.max(0, this.landingMs - deltaMs);
      if (this.landingMs === 0) this.frame = 7;
    }
    return this.frame;
  }

  /** 站定后维持第 7 帧；开始行走时回到行走动画。 */
  get active(): boolean { return this.frame !== 1; }
  get landed(): boolean { return this.frame === 7; }
  reset(): void { this.frame = 1; this.airborne = false; this.landingMs = 0; this.launchFrame = false; this.leftGround = false; this.predictedLanding = null; }
}
