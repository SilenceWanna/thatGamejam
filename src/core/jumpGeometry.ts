/** 理想抛物线，仅用于设计与配置检查；实际可达性还需考虑碰撞体和横向距离。 */
export function maximumJumpHeight(jumpSpeed: number, gravity: number): number {
  return jumpSpeed * jumpSpeed / (2 * gravity);
}

export function descendingTravelTime(jumpSpeed: number, gravity: number, rise: number): number | null {
  const discriminant = jumpSpeed * jumpSpeed - 2 * gravity * rise;
  return discriminant < 0 ? null : (jumpSpeed + Math.sqrt(discriminant)) / gravity;
}
