import * as Phaser from 'phaser';
import { AXO_SCENE_SCALE, type AxolotlPose } from '../art/drawAxolotl';
import { DEPTH } from '../art/layers';
import { T_STATIC, UI_PANEL } from '../art/palette';
import { motionProfile, type MotionProfile } from '../logic/motion';
import { GAME_EVENTS, REGISTRY_KEYS, type ReducedMotionPayload } from '../logic/gameEvents';
import type { BuildManifest } from '../logic/updateCheck';
import { WORLD_H } from '../logic/zone';
import { applyUpdate, versionLabel, watchForUpdates } from '../platform/updates';
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
import { openHomeTank } from './sceneFlow';

const TAU = Math.PI * 2;
const MARGIN = 16;
const PANEL_PAD = 16;
const PANEL_MAX_W = 560;
const TITLE_PX = 34;
const SUBTITLE_PX = 22;
const SUBTITLE_GAP = 4;
const BODY_PX = 18;
const VERSION_PX = 14;
const VERSION_GAP = 4;
const BUTTON_GAP = 12;
const LOW_FPS = 45;
const LOW_FPS_REDRAW_S = 1 / 30;
const AXO_WORLD_Y = 210;
const TITLE_TEXT = 'Glam Gills';
const SUBTITLE_TEXT = 'Find Your Flair';
const CONTROLS_TEXT =
  'Use the swim pad in the corner to swim. Press Dash to zoom.\n' +
  'Keys: arrows or WASD to swim, Space to dash, P to pause.\n' +
  'Find all the snacks!';
const UPDATE_PROMPT_TEXT = 'A new version is ready!';

/** The update prompt: a text panel and an Update button, shown once a newer build is published. */
interface UpdatePrompt {
  panel: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  button: UiButton;
}

/** Title card: canal background, idle axolotl, game name and subtitle, controls, version label, a Start button and the update prompt. */
export class TitleScene extends Phaser.Scene {
  private assets!: GameAssets;
  private motion!: MotionProfile;
  private view!: SceneView;
  private clock = 0;
  private axoBaseY = 0;
  private starting = false;
  private lastPose: AxolotlPose | null = null;
  private redrawAcc = 0;
  private backgrounds: Phaser.GameObjects.Image[] = [];
  private axolotl!: Phaser.GameObjects.Image;
  private panel!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.Text;
  private subtitle!: Phaser.GameObjects.Text;
  private controls!: Phaser.GameObjects.Text;
  private versionText!: Phaser.GameObjects.Text;
  private startButton!: UiButton;
  private updating = false;
  private updateManifest: BuildManifest | null = null;
  private updatePrompt: UpdatePrompt | null = null;
  private stopUpdates: () => void = () => undefined;

  constructor() {
    super(SCENE_KEYS.title);
  }

  init(data: GameAssets): void {
    this.assets = data;
    this.clock = 0;
    this.starting = false;
    this.lastPose = null;
    this.redrawAcc = 0;
    this.updating = false;
    this.updateManifest = null;
    this.updatePrompt = null;
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
    this.subtitle = this.add
      .text(0, 0, SUBTITLE_TEXT, uiTextStyle(SUBTITLE_PX, this.view.fit.dpr))
      .setDepth(DEPTH.ui);
    this.controls = this.add
      .text(0, 0, CONTROLS_TEXT, { ...uiTextStyle(BODY_PX, this.view.fit.dpr, false), align: 'center' })
      .setDepth(DEPTH.ui);
    this.versionText = this.add
      .text(0, 0, versionLabel(), uiTextStyle(VERSION_PX, this.view.fit.dpr, false))
      .setDepth(DEPTH.ui);
    this.startButton = createButton(this, this.assets.baked, {
      fill: 'primary',
      shape: 'wide',
      size: 1,
      label: 'Start',
      icon: 'play',
      dpr: this.view.fit.dpr,
      pressOnDown: false,
      onPress: () => this.openTank(),
    });
    this.startButton.container.setDepth(DEPTH.ui);
    this.startButton.setFocused(true);

    this.input.keyboard?.on('keydown-ENTER', this.openTank, this);
    this.input.keyboard?.on('keydown-SPACE', this.openTank, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.on(GAME_EVENTS.REDUCED_MOTION, this.handleReducedMotion, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.stopUpdates = watchForUpdates((manifest) => this.showUpdatePrompt(manifest));

    this.layout();
    this.animateAxolotl(0);
  }

  update(_time: number, deltaMs: number): void {
    this.animateAxolotl(Math.min(deltaMs / 1000, 0.05));
  }

  /** Start: opens the Home Tank hub (PRD C7). */
  private openTank(): void {
    if (this.starting) return;
    this.starting = true;
    openHomeTank(this, this.assets);
  }

  /** Shows the update prompt once; later builds only replace the target manifest. */
  private showUpdatePrompt(manifest: BuildManifest): void {
    if (this.starting || this.updating) return;
    this.updateManifest = manifest;
    if (this.updatePrompt !== null) return;
    const dpr = this.view.fit.dpr;
    const panel = this.add.graphics().setDepth(DEPTH.ui);
    const text = this.add
      .text(0, 0, UPDATE_PROMPT_TEXT, { ...uiTextStyle(BODY_PX, dpr), align: 'center' })
      .setDepth(DEPTH.ui);
    const button = createButton(this, this.assets.baked, {
      fill: 'secondary',
      shape: 'wide',
      size: 1,
      label: 'Update',
      icon: 'dash',
      dpr,
      pressOnDown: false,
      onPress: () => this.updateNow(),
    });
    button.container.setDepth(DEPTH.ui);
    this.updatePrompt = { panel, text, button };
    this.input.keyboard?.on('keydown-U', this.updateNow, this);
    this.layout();
  }

  /** Reloads into the new build. Saved progress is untouched (ADR 0009). */
  private updateNow(): void {
    if (this.updating || this.starting || this.updateManifest === null) return;
    this.updating = true;
    applyUpdate(this.updateManifest);
  }

  private handleResize(): void {
    this.view = readSceneView(this.scale);
    useCssCamera(this.cameras.main, this.view.fit.dpr);
    this.title.setResolution(this.view.fit.dpr);
    this.subtitle.setResolution(this.view.fit.dpr);
    this.controls.setResolution(this.view.fit.dpr);
    this.versionText.setResolution(this.view.fit.dpr);
    this.startButton.setResolution(this.view.fit.dpr);
    this.updatePrompt?.text.setResolution(this.view.fit.dpr);
    this.updatePrompt?.button.setResolution(this.view.fit.dpr);
    this.layout();
  }

  private handleReducedMotion(payload: ReducedMotionPayload): void {
    this.motion = motionProfile(payload.reduced);
  }

  private handleShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.off(GAME_EVENTS.REDUCED_MOTION, this.handleReducedMotion, this);
    this.stopUpdates();
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

    const buttonsTop = this.layoutButtons(cssW, cssH);
    const lowerTop = this.layoutPrompt(cssW, buttonsTop);
    const panelBottom = this.layoutTitlePanel(cssW, lowerTop);

    const axoY = Math.min(top + AXO_WORLD_Y * zoom, lowerTop - 60 * zoom);
    this.axoBaseY = Math.max(panelBottom + 50 * zoom, axoY);
    this.axolotl.setPosition(cssW / 2, this.axoBaseY);
    this.axolotl.setScale((AXO_SCENE_SCALE * zoom) / this.assets.axolotl.scale);
  }

  /** Places Start, plus Update beside it or above it; returns the top of the topmost button. */
  private layoutButtons(cssW: number, cssH: number): number {
    const start = this.startButton;
    const startY = cssH - MARGIN - start.height - 8;
    const update = this.updatePrompt?.button;
    if (update === undefined) {
      start.container.setPosition((cssW - start.width) / 2, startY);
      return startY;
    }
    if (cssW >= update.width + BUTTON_GAP + start.width + 2 * MARGIN) {
      const left = (cssW - update.width - BUTTON_GAP - start.width) / 2;
      update.container.setPosition(left, startY);
      start.container.setPosition(left + update.width + BUTTON_GAP, startY);
      return startY;
    }
    const updateY = startY - BUTTON_GAP - update.height;
    start.container.setPosition((cssW - start.width) / 2, startY);
    update.container.setPosition((cssW - update.width) / 2, updateY);
    return updateY;
  }

  /** Places the prompt text panel just above the buttons; returns its top, or `buttonsTop` with no prompt. */
  private layoutPrompt(cssW: number, buttonsTop: number): number {
    const prompt = this.updatePrompt;
    if (prompt === null) return buttonsTop;
    prompt.text.setWordWrapWidth(this.textWidth(cssW), true);
    const panelW = prompt.text.width + 2 * PANEL_PAD;
    const panelH = prompt.text.height + 2 * PANEL_PAD;
    const panelY = buttonsTop - BUTTON_GAP - panelH;
    drawPanel(prompt.panel, (cssW - panelW) / 2, panelY, panelW, panelH, UI_PANEL);
    prompt.text.setPosition((cssW - prompt.text.width) / 2, panelY + PANEL_PAD);
    return panelY;
  }

  /**
   * Draws the title panel (title, subtitle, controls, version label) and returns its bottom.
   * On a short screen the controls text hides whenever the full panel would not fit above the lower UI,
   * so the panels never overlap. The name, subtitle and version label always show.
   */
  private layoutTitlePanel(cssW: number, lowerTop: number): number {
    this.controls.setWordWrapWidth(this.textWidth(cssW), true);
    const showControls = MARGIN + this.titlePanelHeight(true) + BUTTON_GAP <= lowerTop;
    this.controls.setVisible(showControls);
    const panelH = this.titlePanelHeight(showControls);
    const contentW = Math.max(
      this.title.width,
      this.subtitle.width,
      showControls ? this.controls.width : 0,
      this.versionText.width,
    );
    const panelW = contentW + 2 * PANEL_PAD;
    drawPanel(this.panel, (cssW - panelW) / 2, MARGIN, panelW, panelH, UI_PANEL);
    this.title.setPosition((cssW - this.title.width) / 2, MARGIN + PANEL_PAD);
    const subtitleY = MARGIN + PANEL_PAD + this.title.height + SUBTITLE_GAP;
    this.subtitle.setPosition((cssW - this.subtitle.width) / 2, subtitleY);
    this.controls.setPosition((cssW - this.controls.width) / 2, subtitleY + this.subtitle.height + PANEL_PAD);
    const versionY = MARGIN + panelH - PANEL_PAD - this.versionText.height;
    this.versionText.setPosition((cssW - this.versionText.width) / 2, versionY);
    return MARGIN + panelH;
  }

  private titlePanelHeight(showControls: boolean): number {
    const controlsH = showControls ? this.controls.height + PANEL_PAD : 0;
    const headH = this.title.height + SUBTITLE_GAP + this.subtitle.height;
    return headH + controlsH + VERSION_GAP + this.versionText.height + 2 * PANEL_PAD;
  }

  private textWidth(cssW: number): number {
    return Math.min(cssW - 2 * (MARGIN + PANEL_PAD), PANEL_MAX_W);
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
    this.redrawAxolotl(pose, dt);
    const zoom = this.worldScale();
    this.axolotl.y = this.axoBaseY + this.motion.bob * Math.sin((TAU * t) / 3) * zoom;
    this.axolotl.rotation = this.motion.ambient ? 0.12 * Math.cos((TAU * t) / 3) : 0;
  }

  /** Repaints the axolotl when its pose changes; while the frame rate is low, at most 30 times a second, as in the swim. */
  private redrawAxolotl(pose: AxolotlPose, dt: number): void {
    if (this.lastPose !== null && samePose(pose, this.lastPose)) return;
    this.redrawAcc += dt;
    if (this.lastPose !== null && this.game.loop.actualFps < LOW_FPS && this.redrawAcc < LOW_FPS_REDRAW_S) {
      return;
    }
    this.redrawAcc = 0;
    this.assets.axolotl.redraw(pose);
    this.lastPose = pose;
  }
}
