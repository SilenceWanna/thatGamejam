/** 理想抛物线，仅用于设计与配置检查；实际可达性还需考虑碰撞体和横向距离。 */
export function maximumJumpHeight(jumpSpeed: number, gravity: number): number {
  return jumpSpeed * jumpSpeed / (2 * gravity);
}

/** 计算跳跃后下落到指定高度的时间；目标高于跳跃极限时返回 null，用于检查平台可达性。 */
export function descendingTravelTime(jumpSpeed: number, gravity: number, rise: number): number | null {
  const discriminant = jumpSpeed * jumpSpeed - 2 * gravity * rise;
  return discriminant < 0 ? null : (jumpSpeed + Math.sqrt(discriminant)) / gravity;
}
