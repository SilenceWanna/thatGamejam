import Phaser from "phaser";
import type { LevelContent, PlayerAnimationName } from "../../content/types";
import type { PlayerInput } from "../../input/InputSource";
import { assetKey } from "../../content/loadLevelContent";

export class PlayerActor {
  readonly collision: Phaser.GameObjects.Rectangle;
  readonly body: Phaser.Physics.Arcade.Body;
  private readonly visual: Phaser.GameObjects.Container;
  private readonly sprite?: Phaser.GameObjects.Sprite;
  private coyoteRemaining = 0;
  private bufferRemaining = 0;
  private jumpConsumed = false;
  private facing = 1;
  private animationTime = 0;

  constructor(scene: Phaser.Scene, private readonly content: LevelContent, private readonly onJump: () => void) {
    const { player, spawn } = content.level;
    this.collision = scene.add.rectangle(spawn.x, spawn.feetY - player.bodyHeight / 2, player.bodyWidth, player.bodyHeight, 0, 0);
    scene.physics.add.existing(this.collision);
    this.body = this.collision.body as Phaser.Physics.Arcade.Body;
    this.body.setGravityY(player.gravity).setCollideWorldBounds(true).setMaxVelocity(player.moveSpeed, 1000);
    this.visual = scene.add.container(spawn.x, spawn.feetY).setDepth(4);
    const asset = content.assets.images.player;
    const key = assetKey(content.level.id, "player");
    if (asset?.file && scene.textures.exists(key)) {
      this.sprite = scene.add.sprite(0, 0, key).setOrigin(0.5, 1).setDisplaySize(asset.displayWidth ?? 48, asset.displayHeight ?? 64);
      this.visual.add(this.sprite);
      for (const [name, frames] of Object.entries(asset.animations ?? {})) {
        const animationKey = `${key}:${name}`;
        if (frames && !scene.anims.exists(animationKey)) scene.anims.create({ key: animationKey, frames: frames.map(frame => ({ key, frame })), frameRate: asset.frameRate ?? 10, repeat: name === "jump" ? 0 : -1 });
      }
    } else {
      const art = scene.add.graphics();
      // 基本图形角色：披风、脸、头巾与靴子。朝向由整个表现容器翻转。
      art.fillStyle(0x354d42).fillRoundedRect(-12, -11, 10, 11, 3).fillRoundedRect(5, -11, 10, 11, 3);
      art.fillStyle(0x64816b).fillTriangle(-19, -11, 19, -11, 0, -50);
      art.fillStyle(0x7f9b78).fillRoundedRect(-14, -38, 28, 29, 8);
      art.fillStyle(0xe9cea1).fillCircle(0, -47, 15);
      art.fillStyle(0x355247).fillRoundedRect(-16, -63, 33, 12, 5);
      art.fillStyle(0xc5a45e).fillTriangle(9, -59, 23, -57, 12, -49);
      art.fillStyle(0x30483d).fillCircle(6, -47, 1.7);
      art.fillStyle(0xe6d39d).fillRoundedRect(-16, -34, 31, 6, 2);
      art.fillStyle(0xd3b46c).fillRoundedRect(8, -31, 7, 20, 2);
      this.visual.add(art);
    }
  }

  get x(): number { return this.body.center.x; }
  get feetY(): number { return this.body.bottom; }
  get grounded(): boolean { return this.body.blocked.down || this.body.touching.down; }

  update(input: PlayerInput, deltaMs: number): void {
    const delta = Math.min(deltaMs, 50);
    const settings = this.content.level.player;
    if (this.grounded && this.body.velocity.y >= 0) {
      this.coyoteRemaining = settings.coyoteTimeMs;
      this.jumpConsumed = false;
    } else this.coyoteRemaining = Math.max(0, this.coyoteRemaining - delta);
    this.bufferRemaining = input.jumpPressed ? settings.jumpBufferMs : Math.max(0, this.bufferRemaining - delta);
    this.body.setVelocityX(input.moveAxis * settings.moveSpeed);
    if (input.moveAxis) this.facing = Math.sign(input.moveAxis);
    const canJump = (this.grounded && this.body.velocity.y >= 0) || this.coyoteRemaining > 0;
    if ((input.jumpPressed || this.bufferRemaining > 0) && canJump && !this.jumpConsumed) {
      this.body.setVelocityY(-settings.jumpSpeed);
      this.jumpConsumed = true;
      this.bufferRemaining = 0;
      this.coyoteRemaining = 0;
      this.onJump();
    }
    this.animationTime += delta;
    const moving = input.moveAxis !== 0 && this.grounded;
    this.visual.setPosition(this.x, this.feetY - (moving ? Math.sin(this.animationTime * 0.022) * 1.5 : 0)).setScale(this.facing, 1);
    const state: PlayerAnimationName = !this.grounded ? "jump" : moving ? "run" : "idle";
    const key = `${assetKey(this.content.level.id, "player")}:${state}`;
    if (this.sprite && this.sprite.scene.anims.exists(key)) this.sprite.play(key, true);
  }

  stop(): void { this.body.setVelocity(0); this.bufferRemaining = 0; this.coyoteRemaining = 0; }
  resetToSpawn(): void {
    const { spawn, player } = this.content.level;
    this.body.reset(spawn.x, spawn.feetY - player.bodyHeight / 2);
    this.stop();
  }
}
