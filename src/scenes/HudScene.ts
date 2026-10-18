import * as Phaser from 'phaser';
import { BUTTON_SQUARE, buttonRadius } from '../art/drawUi';
import { DEPTH } from '../art/layers';
import { INK, UI_PANEL, UI_PANEL_PINK, WHITE } from '../art/palette';
import { iconKey } from '../art/textures';
import {
  GAME_EVENTS,
  REGISTRY_KEYS,
  type CollectedPayload,
  type DashStatePayload,
  type ReducedMotionPayload,
} from '../logic/gameEvents';
import { motionProfile, type MotionProfile } from '../logic/motion';
import {
  SCENE_KEYS,
  createButton,
  cssColor,
  drawPanel,
  readSceneView,
  uiTextStyle,
  useCssCamera,
  type GameAssets,
  type SceneView,
  type UiButton,
} from './BootScene';

const MARGIN = 16;
const GAP = 12;
const PANEL_PAD = 12;
const COUNTER_ICON_PX = 32;
const COUNTER_TEXT_PX = 22;
const COMPACT_WIDTH = 460;
const PAUSE_BUTTON_SIZE = 0.8;
const DASH_BUTTON_SIZE = 1.25;
const RESUME_BUTTON_SIZE = 1.3;
const RING_GAP = 8;
const RING_TRACK_PX = 9;
const RING_ARC_PX = 6;
const NOT_READY_ALPHA = 0.6;
const OVERLAY_ALPHA = 0.45;
const OVERLAY_COVER = 8192;
const OVERLAY_PAD = 24;
const OVERLAY_TITLE_PX = 34;
const BANNER_TEXT_PX = 24;
const BANNER_MS = 3000;
const BANNER_FADE_MS = 250;
const BANNER_TEXT = 'Yum! You found every snack!';

/** Screen-space UI over the swim scene: snack counter, Pause, Dash, pause overlay and the all-snacks banner. */
export class HudScene extends Phaser.Scene {
  private assets!: GameAssets;
  private view!: SceneView;
  private motion!: MotionProfile;
  private paused = false;
  private collected = 0;
  private total = 0;
  private dashState: DashStatePayload = { phase: 'ready', charge: 1 };

  private counterPanel!: Phaser.GameObjects.Graphics;
  private counterIcon!: Phaser.GameObjects.Image;
  private counterText!: Phaser.GameObjects.Text;
  private pauseButton!: UiButton;
  private dashButton!: UiButton;
  private dashRing!: Phaser.GameObjects.Graphics;
  private overlay!: Phaser.GameObjects.Container;
  private overlayPanel!: Phaser.GameObjects.Graphics;
  private overlayTitle!: Phaser.GameObjects.Text;
  private resumeButton!: UiButton;
  private banner!: Phaser.GameObjects.Container;
  private bannerPanel!: Phaser.GameObjects.Graphics;
  private bannerText!: Phaser.GameObjects.Text;
  private bannerTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super(SCENE_KEYS.hud);
  }

  init(data: GameAssets): void {
    this.assets = data;
    this.paused = false;
    this.bannerTimer = null;
    this.dashState = { phase: 'ready', charge: 1 };
  }

  create(): void {
    this.view = readSceneView(this.scale);
    this.motion = motionProfile(this.registry.get(REGISTRY_KEYS.reducedMotion) === true);
    this.collected = Number(this.registry.get(REGISTRY_KEYS.collected) ?? 0);
    this.total = Number(this.registry.get(REGISTRY_KEYS.total) ?? 0);
    useCssCamera(this.cameras.main, this.view.fit.dpr);

    this.buildCounter();
    this.buildButtons();
    this.buildOverlay();
    this.buildBanner();
    this.bindKeys();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.on(GAME_EVENTS.COLLECTED, this.handleCollected, this);
    this.game.events.on(GAME_EVENTS.ALL_COLLECTED, this.handleAllCollected, this);
    this.game.events.on(GAME_EVENTS.DASH_STATE, this.handleDashState, this);
    this.game.events.on(GAME_EVENTS.REQUEST_PAUSE, this.pauseSwim, this);
    this.game.events.on(GAME_EVENTS.REDUCED_MOTION, this.handleReducedMotion, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    this.layout();
  }

  // ---- build ---------------------------------------------------------------

  private buildCounter(): void {
    const dpr = this.view.fit.dpr;
    const iconInfo = this.assets.baked.icons.snack;
    this.counterPanel = this.add.graphics().setDepth(DEPTH.ui);
    this.counterIcon = this.add
      .image(0, 0, iconKey('snack'))
      .setOrigin(0, 0)
      .setScale(COUNTER_ICON_PX / iconInfo.w / iconInfo.scale)
      .setDepth(DEPTH.ui);
    this.counterText = this.add.text(0, 0, '', uiTextStyle(COUNTER_TEXT_PX, dpr)).setDepth(DEPTH.ui);
  }

  private buildButtons(): void {
    const dpr = this.view.fit.dpr;
    this.pauseButton = createButton(this, this.assets.baked, {
      fill: 'secondary',
      shape: 'wide',
      size: PAUSE_BUTTON_SIZE,
      label: 'Pause',
      icon: 'pause',
      dpr,
      pressOnDown: false,
      onPress: () => this.pauseSwim(),
    });
    this.pauseButton.container.setDepth(DEPTH.ui);

    this.dashRing = this.add.graphics().setDepth(DEPTH.ui);
    this.dashButton = createButton(this, this.assets.baked, {
      fill: 'primary',
      shape: 'square',
      size: DASH_BUTTON_SIZE,
      label: 'Dash',
      icon: 'dash',
      dpr,
      pressOnDown: true,
      onPress: () => this.requestDash(),
    });
    this.dashButton.container.setDepth(DEPTH.ui);
  }

  private buildOverlay(): void {
    const dpr = this.view.fit.dpr;
    const ink = cssColor(INK);
    const dim = this.add
      .rectangle(-OVERLAY_COVER / 2, -OVERLAY_COVER / 2, OVERLAY_COVER, OVERLAY_COVER, ink.color, OVERLAY_ALPHA)
      .setOrigin(0, 0)
      .setInteractive();
    this.overlayPanel = this.add.graphics();
    this.overlayTitle = this.add.text(0, 0, 'Paused', uiTextStyle(OVERLAY_TITLE_PX, dpr));
    this.resumeButton = createButton(this, this.assets.baked, {
      fill: 'primary',
      shape: 'wide',
      size: RESUME_BUTTON_SIZE,
      label: 'Keep swimming',
      icon: 'play',
      dpr,
      pressOnDown: false,
      onPress: () => this.resumeSwim(),
    });
    this.resumeButton.setFocused(true);
    this.overlay = this.add
      .container(0, 0, [dim, this.overlayPanel, this.overlayTitle, this.resumeButton.container])
      .setDepth(DEPTH.ui + 10)
      .setVisible(false);
  }

  private buildBanner(): void {
    this.bannerPanel = this.add.graphics();
    this.bannerText = this.add.text(0, 0, BANNER_TEXT, {
      ...uiTextStyle(BANNER_TEXT_PX, this.view.fit.dpr),
      align: 'center',
    });
    this.banner = this.add
      .container(0, 0, [this.bannerPanel, this.bannerText])
      .setDepth(DEPTH.ui + 5)
      .setVisible(false);
  }

  private bindKeys(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    keyboard.on('keydown-P', this.togglePause, this);
    keyboard.on('keydown-ESC', this.togglePause, this);
    keyboard.on('keydown-ENTER', this.resumeSwim, this);
    keyboard.on('keydown-SPACE', this.resumeSwim, this);
  }

  // ---- layout --------------------------------------------------------------

  private layout(): void {
    this.layoutCounter();
    this.layoutButtons();
    this.layoutOverlay();
    this.layoutBanner();
    this.drawDashRing();
  }

  private counterLabel(): string {
    const count = `${this.collected} / ${this.total}`;
    return this.view.cssW < COMPACT_WIDTH ? count : `Snacks ${count}`;
  }

  private layoutCounter(): void {
    this.counterText.setText(this.counterLabel());
    const contentH = Math.max(COUNTER_ICON_PX, this.counterText.height);
    const panelW = PANEL_PAD + COUNTER_ICON_PX + GAP / 2 + this.counterText.width + PANEL_PAD;
    const panelH = contentH + 2 * PANEL_PAD;
    drawPanel(this.counterPanel, MARGIN, MARGIN, panelW, panelH, UI_PANEL);
    this.counterIcon.setPosition(MARGIN + PANEL_PAD, MARGIN + PANEL_PAD + (contentH - COUNTER_ICON_PX) / 2);
    this.counterText.setPosition(
      MARGIN + PANEL_PAD + COUNTER_ICON_PX + GAP / 2,
      MARGIN + PANEL_PAD + (contentH - this.counterText.height) / 2,
    );
  }

  /** Ring radius clearing the rounded corners of the square Dash button. */
  private ringRadius(): number {
    const half = this.dashButton.width / 2;
    const corner = buttonRadius(BUTTON_SQUARE.h) * DASH_BUTTON_SIZE;
    return (half - corner) * Math.SQRT2 + corner + RING_GAP;
  }

  private layoutButtons(): void {
    const { cssW, cssH } = this.view;
    this.pauseButton.container.setPosition(cssW - MARGIN - this.pauseButton.width, MARGIN);
    const outer = this.ringRadius() + RING_TRACK_PX / 2;
    const centreX = cssW - MARGIN - outer;
    const centreY = cssH - MARGIN - outer;
    this.dashButton.container.setPosition(
      centreX - this.dashButton.width / 2,
      centreY - this.dashButton.height / 2,
    );
  }

  private layoutOverlay(): void {
    const { cssW, cssH } = this.view;
    const button = this.resumeButton;
    const panelW = Math.min(cssW - 2 * MARGIN, Math.max(button.width, this.overlayTitle.width) + 2 * OVERLAY_PAD);
    const panelH = this.overlayTitle.height + button.height + 3 * OVERLAY_PAD;
    const panelX = (cssW - panelW) / 2;
    const panelY = (cssH - panelH) / 2;
    drawPanel(this.overlayPanel, panelX, panelY, panelW, panelH, UI_PANEL);
    this.overlayTitle.setPosition((cssW - this.overlayTitle.width) / 2, panelY + OVERLAY_PAD);
    button.container.setPosition(
      (cssW - button.width) / 2,
      panelY + 2 * OVERLAY_PAD + this.overlayTitle.height,
    );
  }

  private layoutBanner(): void {
    const { cssW } = this.view;
    this.bannerText.setWordWrapWidth(Math.max(120, cssW - 2 * (MARGIN + PANEL_PAD)), true);
    const panelW = this.bannerText.width + 2 * PANEL_PAD;
    const panelH = this.bannerText.height + 2 * PANEL_PAD;
    const top = MARGIN + this.pauseButton.height + GAP + 8;
    drawPanel(this.bannerPanel, (cssW - panelW) / 2, top, panelW, panelH, UI_PANEL_PINK);
    this.bannerText.setPosition((cssW - this.bannerText.width) / 2, top + PANEL_PAD);
  }

  private drawDashRing(): void {
    const ring = this.dashRing;
    const button = this.dashButton;
    const centreX = button.container.x + button.width / 2;
    const centreY = button.container.y + button.height / 2;
    const radius = this.ringRadius();
    const ready = this.dashState.phase === 'ready';
    const start = -Math.PI / 2;
    ring.clear();
    ring.lineStyle(RING_TRACK_PX, cssColor(WHITE).color, 0.85);
    ring.strokeCircle(centreX, centreY, radius);
    ring.lineStyle(RING_ARC_PX, cssColor(INK).color, 1);
    if (ready) {
      ring.strokeCircle(centreX, centreY, radius);
    } else if (this.dashState.charge > 0) {
      ring.beginPath();
      ring.arc(centreX, centreY, radius, start, start + Math.PI * 2 * this.dashState.charge, false);
      ring.strokePath();
    }
    button.container.setAlpha(ready ? 1 : NOT_READY_ALPHA);
  }

  // ---- actions -------------------------------------------------------------

  private requestDash(): void {
    if (this.paused) return;
    this.game.events.emit(GAME_EVENTS.REQUEST_DASH);
  }

  private togglePause(): void {
    if (this.paused) {
      this.resumeSwim();
      return;
    }
    this.pauseSwim();
  }

  private pauseSwim(): void {
    if (this.paused) return;
    this.paused = true;
    this.scene.pause(SCENE_KEYS.swim);
    this.pauseButton.container.setVisible(false);
    this.overlay.setVisible(true);
    this.game.events.emit(GAME_EVENTS.PAUSED);
  }

  private resumeSwim(): void {
    if (!this.paused) return;
    this.paused = false;
    this.overlay.setVisible(false);
    this.pauseButton.container.setVisible(true);
    this.scene.resume(SCENE_KEYS.swim);
    this.game.events.emit(GAME_EVENTS.RESUMED);
  }

  // ---- game events ---------------------------------------------------------

  private handleCollected(payload: CollectedPayload): void {
    this.collected = payload.collected;
    this.total = payload.total;
    this.layoutCounter();
  }

  private handleAllCollected(): void {
    this.bannerTimer?.remove(false);
    this.tweens.killTweensOf(this.banner);
    this.banner.setVisible(true).setAlpha(this.motion.ambient ? 0 : 1);
    if (this.motion.ambient) {
      this.tweens.add({ targets: this.banner, alpha: 1, duration: BANNER_FADE_MS });
    }
    this.bannerTimer = this.time.delayedCall(BANNER_MS, this.hideBanner, [], this);
  }

  private hideBanner(): void {
    this.bannerTimer = null;
    if (!this.motion.ambient) {
      this.banner.setVisible(false);
      return;
    }
    this.tweens.add({
      targets: this.banner,
      alpha: 0,
      duration: BANNER_FADE_MS,
      onComplete: () => this.banner.setVisible(false),
    });
  }

  private handleDashState(payload: DashStatePayload): void {
    this.dashState = payload;
    this.drawDashRing();
  }

  private handleReducedMotion(payload: ReducedMotionPayload): void {
    this.motion = motionProfile(payload.reduced);
  }

  private handleResize(): void {
    this.view = readSceneView(this.scale);
    const dpr = this.view.fit.dpr;
    useCssCamera(this.cameras.main, dpr);
    for (const text of [this.counterText, this.overlayTitle, this.bannerText]) {
      text.setResolution(dpr);
    }
    for (const button of [this.pauseButton, this.dashButton, this.resumeButton]) {
      button.setResolution(dpr);
    }
    this.layout();
  }

  private handleShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.off(GAME_EVENTS.COLLECTED, this.handleCollected, this);
    this.game.events.off(GAME_EVENTS.ALL_COLLECTED, this.handleAllCollected, this);
    this.game.events.off(GAME_EVENTS.DASH_STATE, this.handleDashState, this);
    this.game.events.off(GAME_EVENTS.REQUEST_PAUSE, this.pauseSwim, this);
    this.game.events.off(GAME_EVENTS.REDUCED_MOTION, this.handleReducedMotion, this);
  }
}
