import Phaser from "phaser";
import type { LevelContent } from "../../content/types";
import type { PlayerInput } from "../../input/InputSource";
import { createForestBackdrop } from "../art/ForestBackdrop";
import { createTerrain } from "./createTerrain";
import { PhraseCollectible } from "./PhraseCollectible";
import { PlayerActor } from "../player/PlayerActor";
import { SeasonEnvironment } from "./SeasonEnvironment";

/** 组装世界、单向拱门碰撞与四处可收集的声音。 */
export class SpringWorld {
  readonly player: PlayerActor;
  readonly environment: SeasonEnvironment;
  private readonly collectibles = new Map<string, PhraseCollectible>();
  constructor(scene: Phaser.Scene, private readonly content: LevelContent, private readonly pickup: (id: string) => void, onJump: () => void) {
    createForestBackdrop(scene, content);
    this.environment = new SeasonEnvironment(scene, content);
    const terrain = createTerrain(scene, content);
    this.player = new PlayerActor(scene, content, onJump);
    scene.physics.add.collider(this.player.collision, terrain.ground);
    scene.physics.add.collider(this.player.collision, terrain.platforms, undefined, (_actor, surface) => {
      const platform = (surface as Phaser.GameObjects.Rectangle).body as Phaser.Physics.Arcade.StaticBody;
      return this.player.body.velocity.y >= 0 && this.player.body.prev.y + this.player.body.height <= platform.top + 4;
    });
    for (const definition of content.level.fragments) this.collectibles.set(definition.id, new PhraseCollectible(scene, content, definition));
  }
  /** 更新角色、移动来源与附近唯一的 E 键提示。 */
  update(input: PlayerInput, delta: number): void {
    this.player.update(input, delta);
    if (this.player.feetY > this.content.level.world.height + 100) this.player.resetToSpawn();
    for (const item of this.collectibles.values()) {
      const def = item.definition;
      const anchor = def.anchorImage && this.environment.artwork?.getPosition(def.anchorImage);
      if (anchor) item.setAnchor(anchor.x + (def.anchorOffsetX ?? 0), anchor.y + (def.anchorOffsetY ?? 0));
    }
    const nearest = this.findNearbyCollectible();
    for (const item of this.collectibles.values()) item.setPromptVisible(item === nearest);
  }
  /** 按 F 显现未收集的声音瓶并播放光波。 */
  revealAll(): void { for (const item of this.collectibles.values()) item.reveal(); this.environment.revealPulse(this.player.x, this.player.feetY); }
  /** 收集后播放瓶子消失效果。 */
  collect(id: string): void { this.collectibles.get(id)?.collect(); }
  /** E 只收集交互范围内最近、已显现的瓶子。 */
  interactNearby(): void { const item = this.findNearbyCollectible(); if (item) this.pickup(item.definition.id); }
  private findNearbyCollectible(): PhraseCollectible | undefined {
    const centerY = this.player.feetY - this.content.level.player.bodyHeight / 2;
    const distance = (item: PhraseCollectible): number => item.distanceTo(this.player.x, centerY);
    return [...this.collectibles.values()].filter(item => item.canCollect && distance(item) <= item.definition.interactionRadius).sort((a, b) => distance(a) - distance(b))[0];
  }
}
