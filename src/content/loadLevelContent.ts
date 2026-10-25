import type { LevelContent } from "./types";
import { asAssetManifest, validateContent } from "./validateContent";

/** baseUrl 同时支持网站根目录和 Vite 的子路径部署。所有关卡内文件均相对该地址。 */
export async function loadLevelContent(levelId: string): Promise<LevelContent> {
  const baseUrl = `${import.meta.env.BASE_URL}content/${levelId}/`;
  const [level, assets]: unknown[] = await Promise.all(["level.json", "assets.json"].map(async file => {
    const response = await fetch(baseUrl + file);
    if (!response.ok) throw new Error(`读取 ${file} 失败（${response.status}）。`);
    return response.json();
  }));
  validateContent(level, assets);
  return { level, assets: asAssetManifest(assets), baseUrl };
}

export function assetKey(levelId: string, name: string): string { return `${levelId}:${name}`; }
