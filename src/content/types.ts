/** 内容数据不引用 Phaser 类型，方便在其他引擎中读取相同 JSON。坐标单位为逻辑像素，Y 向下。 */
export interface PlatformDefinition {
  id: string;
  x: number;
  topY: number;
  width: number;
  height: number;
}

export interface FragmentDefinition {
  id: string;
  label: string;
  color: string;
  x: number;
  y: number;
  audioKey: string;
}

export interface PlayerSettings {
  moveSpeed: number;
  jumpSpeed: number;
  gravity: number;
  bodyWidth: number;
  bodyHeight: number;
  coyoteTimeMs: number;
  jumpBufferMs: number;
}

export interface LevelDefinition {
  id: string;
  title: string;
  subtitle: string;
  world: { width: number; height: number; groundY: number };
  spawn: { x: number; feetY: number; activationRadius: number };
  player: PlayerSettings;
  platforms: PlatformDefinition[];
  fragments: FragmentDefinition[];
  puzzle: { correctOrder: string[]; allowReferencePlayback: boolean; fullPhraseAudioKey: string };
  nextLevelId: string | null;
}

export type PlayerAnimationName = "idle" | "run" | "jump";

export interface ImageAssetDefinition {
  file: string | null;
  displayWidth?: number;
  displayHeight?: number;
  frameWidth?: number;
  frameHeight?: number;
  frameRate?: number;
  animations?: Partial<Record<PlayerAnimationName, number[]>>;
}

export interface AudioAssetDefinition { files: string[]; volume: number }

export interface AssetManifest {
  images: Record<string, ImageAssetDefinition>;
  audio: Record<string, AudioAssetDefinition>;
}

export interface LevelContent { level: LevelDefinition; assets: AssetManifest; baseUrl: string }
