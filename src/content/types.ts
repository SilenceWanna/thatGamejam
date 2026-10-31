/** 内容数据不引用 Phaser 类型，方便在其他引擎中读取相同 JSON。坐标单位为逻辑像素，Y 向下。 */
export interface PlatformDefinition {
  id: string;
  x: number;
  /** 平台可站立顶面的 Y；可达性由它与角色跳跃参数共同决定。 */
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
  sourceType: "wind" | "rain" | "sprout" | "bird";
  /** 角色中心到声音当前位置的距离阈值，同时控制 E 提示和收集。 */
  interactionRadius: number;
  /** 同一声音的少量/半满/满罐贴图，仅影响表现，不引入额外收集次数。 */
  anchorImage?: string;
  anchorOffsetX?: number;
  anchorOffsetY?: number;
  jarImages?: Partial<Record<"low" | "half" | "full", string>>;
}

export interface SceneArtLayer {
  image: string;
  /** 美术编号越小越靠前：01 前景、02 人物、03 地面、04 交互、05 中景、06 背景。 */
  layer: number;
  x: number;
  y: number;
  width: number;
  height: number;
  originX?: number;
  originY?: number;
  fit?: "cover" | "contain" | "stretch";
  phase?: "frozen" | "transition" | "restored";
  repeatX?: boolean;
  motion?: { distance: number; durationMs: number };
}

export interface PlatformArtwork {
  image: string;
  width: number;
  height: number;
  offsetY?: number;
}

export interface UiArtBox { x: number; y: number; width: number; height: number }

export interface PlayerSettings {
  /** 水平移动速度，逻辑像素/秒。 */
  moveSpeed: number;
  /** 起跳向上速度的绝对值；物理系统中实际设置为负 Y 速度。 */
  jumpSpeed: number;
  /** 从离地平台起跳的速度，避免高处跳跃超出画面。 */
  elevatedJumpSpeed: number;
  /** 角色向下重力，逻辑像素/秒²。 */
  gravity: number;
  bodyWidth: number;
  bodyHeight: number;
  /** 离开平台后仍允许跳跃的毫秒数，0 表示关闭。 */
  coyoteTimeMs: number;
  /** 落地前预按跳跃可保留的毫秒数，0 表示关闭。 */
  jumpBufferMs: number;
}

export interface LevelDefinition {
  id: string;
  title: string;
  subtitle: string;
  world: { width: number; height: number; groundY: number };
  /** 出生点：feetY 为脚底高度；activationRadius 为历史兼容配置。 */
  spawn: { x: number; feetY: number; activationRadius: number };
  player: PlayerSettings;
  platforms: PlatformDefinition[];
  fragments: FragmentDefinition[];
  /** 关卡美术排布集中在 JSON；平台外观和真实碰撞尺寸相互独立。 */
  art?: { layers: SceneArtLayer[]; platforms: Record<string, PlatformArtwork>; ui: Record<"reference" | "inventory" | "sequence" | "play" | "reset", UiArtBox> };
  puzzle: {
    /** 唯一正确答案，保存片段 ID；与声音库和 HUD 的显示顺序无关。 */
    correctOrder: string[];
    /** 是否提供答题时的模糊回忆按钮；不影响开场主题。 */
    allowReferencePlayback: boolean;
    /** 旧素材兼容键；实际三种乐句使用下方各自独立接口。 */
    fullPhraseAudioKey: string;
    /** 首次输入后播放的清晰主题，不扣模糊提示次数。 */
    openingPhraseAudioKey: string;
    /** 常驻界面使用的模糊主题。 */
    memoryPhraseAudioKey: string;
    /** 正确还原后的演出主题。 */
    restoredPhraseAudioKey: string;
    /** 最大完整演奏次数，与提示次数独立。 */
    maxAttempts: number;
    /** 模糊旋律提示总次数，与演奏次数独立。 */
    maxReferences: number;
    /** 历史兼容字段；当前三次演奏失败后必须重开。 */
    allowUnlimitedAttemptsAfterExhaustion: boolean;
    /** 音序器每分钟拍数；片段起音不随素材实际长度改变。 */
    bpm: number;
    /** 每个声音罐占几拍，当前为一罐一拍。 */
    beatsPerFragment: number;
  };
  story: { awakening: string; objective: string; restored: string };
  season: {
    id: "spring" | "summer" | "autumn" | "winter";
    /** 后续季节出口的预留坐标；当前关卡不绘制出口或障碍。 */
    exitX: number;
    nextSeasonLabel: string;
    disorderTint: string;
    restoredTint: string;
  };
  /** 下一关内容目录 ID；null 表示本阶段 Demo 到此结束。 */
  nextLevelId: string | null;
}

export type PlayerAnimationName = "idle" | "run" | "jump" | "interact";

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
