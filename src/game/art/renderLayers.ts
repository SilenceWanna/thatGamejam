/** 与美术交付编号相同；UI 继续使用 20 以上深度，不被 01 前景覆盖。 */
export const WORLD_DEPTH = { background: 0, midground: 1, interactive: 2, ground: 3, actor: 4, foreground: 5 } as const;
export function artLayerDepth(artLayer: number): number { return 6 - artLayer; }
