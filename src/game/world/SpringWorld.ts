import Phaser from "phaser";
import type { LevelContent } from "../../content/types";
import type { PlayerInput } from "../../input/InputSource";
import { createForestBackdrop } from "../art/ForestBackdrop";
import { createTerrain } from "./createTerrain";
import { PhraseCollectible } from "./PhraseCollectible";
import { SpawnPointView } from "./SpawnPointView";
import { PlayerActor } from "../player/PlayerActor";
import { SeasonEnvironment } from "./SeasonEnvironment";

/** 装配可交互世界；场景不再直接维护每个碰撞体、收集物和天气对象。 */
export class SpringWorld {
  readonly player: PlayerActor;
  readonly spawn: SpawnPointView;
  readonly environment: SeasonEnvironment;
  private readonly collectibles = new Map<string, PhraseCollectible>();

  /** 按关卡设定装配背景、天气、地形、角色、起点和瓶子；平台仅承接从上方下落的角色。 */
  constructor(scene: Phaser.Scene, private readonly content: LevelContent, private readonly pickup: (id: string) => void,
    private readonly feedback: (message: string) => void, onJump: () => void) {
    createForestBackdrop(scene, content);
    this.environment = new SeasonEnvironment(scene, content);
    const terrain = createTerrain(scene, content);
    this.spawn = new SpawnPointView(scene, content);
    this.player = new PlayerActor(scene, content, onJump);
    scene.physics.add.collider(this.player.collision, [terrain.ground, this.environment.barrier]);
    scene.physics.add.collider(this.player.collision, terrain.platforms, undefined, (_actor, surface) => {
      const platform = (surface as Phaser.GameObjects.Rectangle).body as Phaser.Physics.Arcade.StaticBody;
      return this.player.body.velocity.y >= 0 && this.player.body.prev.y + this.player.body.height <= platform.top + 4;
    });
    for (const definition of content.level.fragments) {
      this.collectibles.set(definition.id, new PhraseCollectible(scene, content, definition));
    }
  }

  /** 更新角色并检查掉落复位，只为互动范围内最近的可收集瓶子显示 E 键提示。 */
  update(input: PlayerInput, delta: number): void {
    this.player.update(input, delta);
    if (this.player.feetY > this.content.level.world.height + 100) this.player.resetToSpawn();
    const nearest = this.findNearbyCollectible();
    for (const item of this.collectibles.values()) item.setPromptVisible(item === nearest);
  }
  /** F 显现的场景表现：显示本轮所有未收集瓶子，并从角色位置扩散显现光圈。 */
  revealAll(): void {
    for (const collectible of this.collectibles.values()) collectible.reveal();
    this.environment.revealPulse(this.player.x, this.player.feetY);
  }
  /** 答错后隐藏并复位全部瓶子，同时关闭回忆点就绪提示。 */
  resetAll(): void {
    for (const collectible of this.collectibles.values()) collectible.reset();
    this.spawn.setReady(false);
  }
  /** 播放指定瓶子的收集消失动画；次数和是否允许收集由 LevelProgress 判定。 */
  collect(id: string): void { this.collectibles.get(id)?.collect(); }
  /** 仅收到 E 交互动作时请求收集最近目标；范围外或未显现时给出操作提示。 */
  interactNearby(): void {
    const nearest = this.findNearbyCollectible();
    if (nearest) this.pickup(nearest.definition.id);
    else this.feedback("先按 F 显现声音，再靠近玻璃瓶，看到提示后按 E 收集。");
  }
  /** 暂停、开场、排序等不可探索阶段隐藏所有瓶旁提示。 */
  hideCollectionPrompt(): void {
    for (const item of this.collectibles.values()) item.setPromptVisible(false);
  }
  /** 提示和按键共用目标选择，避免提示一个罐子却收集另一个。隐藏罐子不参与。 */
  private findNearbyCollectible(): PhraseCollectible | undefined {
    const centerY = this.player.feetY - this.content.level.player.bodyHeight / 2;
    const distance = (item: PhraseCollectible): number => item.distanceTo(this.player.x, centerY);
    return [...this.collectibles.values()]
      .filter(item => item.canCollect && distance(item) <= item.definition.interactionRadius)
      .sort((a, b) => distance(a) - distance(b))[0];
  }
  /** 角色必须落地且脚底对齐、X 位于出生点半径内，才算回到回忆点。 */
  get inSpawn(): boolean {
    const spawn = this.content.level.spawn;
    return Math.abs(this.player.x - spawn.x) < spawn.activationRadius && Math.abs(this.player.feetY - spawn.feetY) < 10 && this.player.grounded;
  }
  /** 春季恢复后角色落地走过 exitX 时，场景才能结束本关。 */
  get atExit(): boolean { return this.player.x >= this.content.level.season.exitX && this.player.grounded; }
}
