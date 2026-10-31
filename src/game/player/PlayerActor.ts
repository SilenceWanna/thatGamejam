import Phaser from "phaser";
import type { LevelContent, PlayerAnimationName } from "../../content/types";
import type { PlayerInput } from "../../input/InputSource";
import { assetKey } from "../../content/loadLevelContent";
import { JumpState, predictLanding } from "../../core/JumpState";
import { createAssetImage, drawJar } from "../art/assetImages";

export class PlayerActor {
  readonly collision: Phaser.GameObjects.Rectangle;
  readonly body: Phaser.Physics.Arcade.Body;
  private readonly visual: Phaser.GameObjects.Container;
  private readonly sprite?: Phaser.GameObjects.Sprite;
  private coyoteRemaining = 0;
  private groundedJumpSpeed = 0;
  private bufferRemaining = 0;
  private jumpConsumed = false;
  private facing = 1;
  private interactionTime = 0;
  private animationState?: PlayerAnimationName;
  private readonly jump = new JumpState();
  private lastJumpFrame = 0;
  private landedFrameShown = false;
  private readonly interactionJar: Phaser.GameObjects.Container;

  /** 读取移动/跳跃参数，创建独立碰撞体，并接入角色 idle/run/jump/interact 动画或占位人形。 */
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
        if (frames && !scene.anims.exists(animationKey)) scene.anims.create({ key: animationKey, frames: frames.map(frame => ({ key, frame })), frameRate: asset.frameRate ?? 10, repeat: name === "idle" || name === "run" ? -1 : 0 });
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
    this.interactionJar = scene.add.container(21, -36).setVisible(false);
    const jar = createAssetImage(scene, content, "jar", 0, 0, 18, 23);
    if (jar) this.interactionJar.add(jar);
    else { const art = scene.add.graphics(); drawJar(art, 0xd5bc79, 0, 0, 0.5); this.interactionJar.add(art); }
    this.visual.add(this.interactionJar);
  }

  /** 角色碰撞体中心 X，用于互动范围、起点和出口判定。 */
  get x(): number { return this.body.center.x; }
  /** 角色脚底高度，用于与平台顶面、出生点及互动中心对齐。 */
  get feetY(): number { return this.body.bottom; }
  /** 角色脚底是否接触地面或平台；决定是否补充跳跃和播放地面动画。 */
  get grounded(): boolean { return this.body.blocked.down || this.body.touching.down; }

  /** 每帧应用左右移动、跳跃缓冲和离台宽限，并按移动/腾空/互动状态切换动画。 */
  update(input: PlayerInput, deltaMs: number): void {
    const delta = Math.min(deltaMs, 50);
    const settings = this.content.level.player;
    if (this.grounded && this.body.velocity.y >= 0) {
      this.coyoteRemaining = settings.coyoteTimeMs;
      // 离开地面前记录所站表面，离台宽限时间内仍保持同一种跳跃高度。
      this.groundedJumpSpeed = this.feetY < this.content.level.world.groundY - 4 ? settings.elevatedJumpSpeed : settings.jumpSpeed;
      this.jumpConsumed = false;
    } else this.coyoteRemaining = Math.max(0, this.coyoteRemaining - delta);
    this.bufferRemaining = input.jumpPressed ? settings.jumpBufferMs : Math.max(0, this.bufferRemaining - delta);
    this.body.setVelocityX(input.moveAxis * settings.moveSpeed);
    if (input.moveAxis) this.facing = Math.sign(input.moveAxis);
    const canJump = (this.grounded && this.body.velocity.y >= 0) || this.coyoteRemaining > 0;
    if ((input.jumpPressed || this.bufferRemaining > 0) && canJump && !this.jumpConsumed) {
      this.body.setVelocityY(-(this.groundedJumpSpeed || settings.jumpSpeed));
      this.jumpConsumed = true;
      this.bufferRemaining = 0;
      this.coyoteRemaining = 0;
      this.jump.start(); this.landedFrameShown = false;
      this.onJump();
    }
    this.interactionTime = Math.max(0, this.interactionTime - delta);
    const interactionAnimation = `${assetKey(this.content.level.id, "player")}:interact`;
    this.interactionJar.setVisible(this.interactionTime > 0 && !(this.sprite && this.sprite.scene.anims.exists(interactionAnimation)));
    const moving = input.moveAxis !== 0 && this.grounded;
    // 图片脚底与物理脚底保持对齐；行走动作本身已包含起伏。
    this.visual.setPosition(this.x, this.feetY).setScale(this.facing, 1);
    const surfaces = [
      ...this.content.level.platforms.map(p => ({ left: p.x - p.width / 2, right: p.x + p.width / 2, topY: p.topY })),
      { left: 0, right: this.content.level.world.width, topY: this.content.level.world.groundY },
    ];
    const landing = predictLanding({ x: this.x, feetY: this.feetY, velocityX: this.body.velocity.x, velocityY: this.body.velocity.y,
      gravity: settings.gravity, bodyWidth: settings.bodyWidth, worldWidth: this.content.level.world.width }, surfaces);
    const jumpFrame = this.jump.update(this.grounded, this.body.velocity.y, settings.gravity, delta, landing);
    if (this.jump.landed && moving && this.landedFrameShown) this.jump.reset();
    else if (this.jump.landed) this.landedFrameShown = true;
    if (this.sprite && this.jump.active) {
      const frame = this.content.assets.images.player?.animations?.jump?.[jumpFrame - 1];
      if (frame !== undefined && (this.animationState !== "jump" || this.lastJumpFrame !== jumpFrame)) {
        this.sprite.anims.stop(); this.sprite.setFrame(frame); this.animationState = "jump"; this.lastJumpFrame = jumpFrame;
      }
    } else {
      const state: PlayerAnimationName = this.interactionTime > 0 && this.grounded ? "interact" : moving ? "run" : "idle";
      const key = `${assetKey(this.content.level.id, "player")}:${state}`;
      if (this.sprite && state !== this.animationState && this.sprite.scene.anims.exists(key)) {
        this.sprite.play(key); this.animationState = state;
      }
    }
  }

  /** F 或 E 成功时播放完整拿瓶动作；没有序列时沿用 380 毫秒占位表现。 */
  playInteraction(): void {
    const asset = this.content.assets.images.player;
    this.interactionTime = Math.max(380, (asset?.animations?.interact?.length ?? 0) / (asset?.frameRate ?? 10) * 1000);
    if (this.animationState === "interact") this.animationState = undefined;
  }

  /** 暂停或打开音序器时清空速度和待触发跳跃，避免恢复后意外跳起。 */
  stop(): void { this.body.setVelocity(0); this.bufferRemaining = 0; this.coyoteRemaining = 0; }
  /** 掉出关卡时将角色放回配置的出生点，并清空运动状态。 */
  resetToSpawn(): void {
    const { spawn, player } = this.content.level;
    this.body.reset(spawn.x, spawn.feetY - player.bodyHeight / 2);
    this.stop(); this.jump.reset();
  }
}
