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
      const collectible = new PhraseCollectible(scene, content, definition, () => {
        if (collectible.distanceTo(this.player.x, this.player.feetY) <= definition.interactionRadius) this.pickup(definition.id);
        else this.feedback("先靠近显现后的声音罐，再按 E 或点击收集。");
      });
      this.collectibles.set(definition.id, collectible);
      scene.physics.add.overlap(this.player.collision, collectible.trigger, () => this.pickup(definition.id));
    }
  }

  update(input: PlayerInput, delta: number): void {
    this.player.update(input, delta);
    if (this.player.feetY > this.content.level.world.height + 100) this.player.resetToSpawn();
  }
  revealAll(): void {
    for (const collectible of this.collectibles.values()) collectible.reveal();
    this.environment.revealPulse(this.player.x, this.player.feetY);
  }
  resetAll(): void {
    for (const collectible of this.collectibles.values()) collectible.reset();
    this.spawn.setReady(false);
  }
  collect(id: string): void { this.collectibles.get(id)?.collect(); }
  interactNearby(): void {
    const nearest = [...this.collectibles.values()].filter(item => !item.isCollected)
      .sort((a, b) => a.distanceTo(this.player.x, this.player.feetY) - b.distanceTo(this.player.x, this.player.feetY))[0];
    if (nearest && nearest.distanceTo(this.player.x, this.player.feetY) <= nearest.definition.interactionRadius) this.pickup(nearest.definition.id);
    else this.feedback("靠近显现后的声音罐，再按 E 或点击收集。");
  }
  get inSpawn(): boolean {
    const spawn = this.content.level.spawn;
    return Math.abs(this.player.x - spawn.x) < spawn.activationRadius && Math.abs(this.player.feetY - spawn.feetY) < 10 && this.player.grounded;
  }
  get atExit(): boolean { return this.player.x >= this.content.level.season.exitX && this.player.grounded; }
}
