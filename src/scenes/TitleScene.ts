import * as Phaser from 'phaser';
import { AXO_SCENE_SCALE, type AxolotlPose } from '../art/drawAxolotl';
import { DEPTH } from '../art/layers';
import { T_STATIC, UI_PANEL } from '../art/palette';
import { motionProfile, type MotionProfile } from '../logic/motion';
import { GAME_EVENTS, REGISTRY_KEYS, type ReducedMotionPayload } from '../logic/gameEvents';
import { WORLD_H } from '../logic/zone';
import {
  SCENE_KEYS,
  blinkAt,
  createButton,
  drawPanel,
  readSceneView,
  samePose,
  uiTextStyle,
  useCssCamera,
  type GameAssets,
  type SceneView,
  type UiButton,
} from './BootScene';

const TAU = Math.PI * 2;
const MARGIN = 16;
const PANEL_PAD = 16;
const PANEL_MAX_W = 560;
const TITLE_PX = 34;
const BODY_PX = 18;
const AXO_WORLD_Y = 210;
const TITLE_TEXT = 'Axolotl Swim Test';
const CONTROLS_TEXT =
  'Hold or drag to swim. Double-tap or press Dash to zoom.\n' +
  'Keys: arrows or WASD to swim, Space to dash, P to pause.\n' +
  'Find all the snacks!';

/** Title card: canal background, idle axolotl, game name, controls and a Start button. */
export class TitleScene extends Phaser.Scene {
  private assets!: GameAssets;
  private motion!: MotionProfile;
  private view!: SceneView;
  private clock = 0;
  private axoBaseY = 0;
  private starting = false;
  private lastPose: AxolotlPose | null = null;
  private backgrounds: Phaser.GameObjects.Image[] = [];
  private axolotl!: Phaser.GameObjects.Image;
  private panel!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.Text;
  private controls!: Phaser.GameObjects.Text;
  private startButton!: UiButton;

  constructor() {
    super(SCENE_KEYS.title);
  }

  init(data: GameAssets): void {
    this.assets = data;
    this.clock = 0;
    this.starting = false;
    this.lastPose = null;
  }

  create(): void {
    this.view = readSceneView(this.scale);
    this.motion = motionProfile(this.registry.get(REGISTRY_KEYS.reducedMotion) === true);
    useCssCamera(this.cameras.main, this.view.fit.dpr);

    this.backgrounds = this.assets.baked.bg.map((info) =>
      this.add.image(0, 0, info.key).setOrigin(0, 0).setDepth(DEPTH.bg),
    );
    const axoInfo = this.assets.axolotl.info;
    this.axolotl = this.add
      .image(0, 0, this.assets.axolotl.key)
      .setOrigin(axoInfo.originNormX, axoInfo.originNormY)
      .setDepth(DEPTH.axolotl);
    this.panel = this.add.graphics().setDepth(DEPTH.ui);
    this.title = this.add.text(0, 0, TITLE_TEXT, uiTextStyle(TITLE_PX, this.view.fit.dpr)).setDepth(DEPTH.ui);
    this.controls = this.add
      .text(0, 0, CONTROLS_TEXT, { ...uiTextStyle(BODY_PX, this.view.fit.dpr, false), align: 'center' })
      .setDepth(DEPTH.ui);
    this.startButton = createButton(this, this.assets.baked, {
      fill: 'primary',
      shape: 'wide',
      size: 1,
      label: 'Start',
      icon: 'play',
      dpr: this.view.fit.dpr,
      pressOnDown: false,
      onPress: () => this.startSwim(),
    });
    this.startButton.container.setDepth(DEPTH.ui);
    this.startButton.setFocused(true);

    this.input.keyboard?.on('keydown-ENTER', this.startSwim, this);
    this.input.keyboard?.on('keydown-SPACE', this.startSwim, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.on(GAME_EVENTS.REDUCED_MOTION, this.handleReducedMotion, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    this.layout();
    this.animateAxolotl(0);
  }

  update(_time: number, deltaMs: number): void {
    this.animateAxolotl(Math.min(deltaMs / 1000, 0.05));
  }

  private startSwim(): void {
    if (this.starting) return;
    this.starting = true;
    this.scene.start(SCENE_KEYS.swim, this.assets);
  }

  private handleResize(): void {
    this.view = readSceneView(this.scale);
    useCssCamera(this.cameras.main, this.view.fit.dpr);
    this.title.setResolution(this.view.fit.dpr);
    this.controls.setResolution(this.view.fit.dpr);
    this.startButton.setResolution(this.view.fit.dpr);
    this.layout();
  }

  private handleReducedMotion(payload: ReducedMotionPayload): void {
    this.motion = motionProfile(payload.reduced);
  }

  private handleShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.off(GAME_EVENTS.REDUCED_MOTION, this.handleReducedMotion, this);
  }

  /** World units to CSS px for the background and axolotl. */
  private worldScale(): number {
    return this.view.fit.fitZoom;
  }

  private worldTop(): number {
    return (this.view.cssH - WORLD_H * this.worldScale()) / 2;
  }

  private layout(): void {
    const { cssW, cssH } = this.view;
    const zoom = this.worldScale();
    const top = this.worldTop();
    this.backgrounds.forEach((image, i) => {
      const info = this.assets.baked.bg[i];
      image.setPosition(i * info.w * zoom, top).setScale(zoom / info.scale);
    });

    const textW = Math.min(cssW - 2 * (MARGIN + PANEL_PAD), PANEL_MAX_W);
    this.controls.setWordWrapWidth(textW, true);
    const panelW = Math.max(this.title.width, this.controls.width) + 2 * PANEL_PAD;
    const panelH = this.title.height + this.controls.height + 3 * PANEL_PAD;
    const panelX = (cssW - panelW) / 2;
    drawPanel(this.panel, panelX, MARGIN, panelW, panelH, UI_PANEL);
    this.title.setPosition((cssW - this.title.width) / 2, MARGIN + PANEL_PAD);
    this.controls.setPosition((cssW - this.controls.width) / 2, MARGIN + 2 * PANEL_PAD + this.title.height);

    const button = this.startButton;
    button.container.setPosition((cssW - button.width) / 2, cssH - MARGIN - button.height - 8);

    const axoY = Math.min(top + AXO_WORLD_Y * zoom, button.container.y - 60 * zoom);
    this.axoBaseY = Math.max(MARGIN + panelH + 50 * zoom, axoY);
    this.axolotl.setPosition(cssW / 2, this.axoBaseY);
    this.axolotl.setScale((AXO_SCENE_SCALE * zoom) / this.assets.axolotl.scale);
  }

  private animateAxolotl(dt: number): void {
    this.clock += dt;
    const t = this.motion.ambient ? this.clock : T_STATIC;
    const pose: AxolotlPose = {
      swimPhase: (TAU * t) / 1.2,
      gillPhase: this.motion.gillFlutter ? (TAU * t) / 0.8 : (TAU * T_STATIC) / 0.8,
      blink: this.motion.ambient ? blinkAt(t) : 1,
      tailAmp: 1,
      sparkle: 0,
    };
    if (this.lastPose === null || !samePose(pose, this.lastPose)) {
      this.assets.axolotl.redraw(pose);
      this.lastPose = pose;
    }
    const zoom = this.worldScale();
    this.axolotl.y = this.axoBaseY + this.motion.bob * Math.sin((TAU * t) / 3) * zoom;
    this.axolotl.rotation = this.motion.ambient ? 0.12 * Math.cos((TAU * t) / 3) : 0;
  }
}
