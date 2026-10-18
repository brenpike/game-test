import * as Phaser from 'phaser';
import { LEG_ICON_SIZE } from '../art/drawLegIcons';
import { BUTTON_SQUARE, STICK_BASE_R, STICK_KNOB_R, buttonRadius } from '../art/drawUi';
import { DEPTH } from '../art/layers';
import { INK, UI_PANEL, UI_PANEL_PINK, WHITE } from '../art/palette';
import { iconKey, type TexInfo } from '../art/textures';
import {
  GAME_EVENTS,
  REGISTRY_KEYS,
  type CollectedPayload,
  type DashStatePayload,
  type ReducedMotionPayload,
  type SteerPayload,
} from '../logic/gameEvents';
import type { LegStatus } from '../logic/legs';
import { motionProfile, type MotionProfile } from '../logic/motion';
import { stickLayout, stickSteer, type StickLayout } from '../logic/stick';
import { idleTripSnapshot } from '../logic/trip';
import {
  TRIP_EVENTS,
  TRIP_REGISTRY_KEYS,
  type LegSlotSnapshot,
  type TripSnapshot,
} from '../logic/tripEvents';
import { LEGS_LABEL, SWIM_AGAIN_LABEL, TRIP_END_BODY, TRIP_END_TITLE } from '../logic/tripText';
import { LEGS } from '../logic/tuning';
import { add, clampLen } from '../logic/vec';
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
const STICK_IDLE_ALPHA = 0.8;
const STICK_ACTIVE_ALPHA = 1;
const STICK_RECENTER_MS = 90;
const STEER_EPSILON = 0.01;
const LEGS_ICON_PX = 32;
const LEGS_ICON_GAP = 4;
const LEGS_TEXT_PX = 22;
const LEG_DISPLAY_RANK: Readonly<Record<LegStatus, number>> = { present: 0, regrowing: 1, lost: 2 };
const TRIP_END_BODY_PX = 20;
const TRIP_END_TEXT_MAX_W = 420;
const TRIP_END_FADE_MS = 300;
const TRIP_END_MIN_MS = 800;
// INVARIANT: the capture zone sits below every HUD button in depth so Pause, Dash and the pause overlay win the press.
const STICK_ZONE_DEPTH = DEPTH.ui - 1;

/** One legs-display icon: dashed outline, present fill (cropped bottom-up while regrowing) and the regrow sparkle. */
interface LegIconView {
  outline: Phaser.GameObjects.Image;
  fill: Phaser.GameObjects.Image;
  mark: Phaser.GameObjects.Image;
}

/** Trip display state for a swimming, whole axolotl, used until the swim scene publishes one. */
function createSwimmingTrip(): TripSnapshot {
  return idleTripSnapshot();
}

/**
 * Screen-space UI over the swim scene: snack counter, legs display, Pause, Dash, swim pad,
 * pause overlay, the all-snacks banner and the carried-home trip-end card.
 */
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
  private counterPanelH = 0;
  private stickBase!: Phaser.GameObjects.Image;
  private stickKnob!: Phaser.GameObjects.Image;
  private stickZone!: Phaser.GameObjects.Zone;
  private stick!: StickLayout;
  private stickPointer: Phaser.Input.Pointer | null = null;
  private stickDownTime = 0;
  private lastSteer: SteerPayload = { x: 0, y: 0 };
  private trip: TripSnapshot = createSwimmingTrip();
  private legsPanel!: Phaser.GameObjects.Graphics;
  private legsLabel!: Phaser.GameObjects.Text;
  private legIcons: LegIconView[] = [];
  private legsPanelBottom = 0;
  private tripCard!: Phaser.GameObjects.Container;
  private tripCardPanel!: Phaser.GameObjects.Graphics;
  private tripCardTitle!: Phaser.GameObjects.Text;
  private tripCardBody!: Phaser.GameObjects.Text;
  private swimAgainButton!: UiButton;
  private tripEndShownAt = 0;
  private newTripRequested = false;

  constructor() {
    super(SCENE_KEYS.hud);
  }

  init(data: GameAssets): void {
    this.assets = data;
    this.paused = false;
    this.bannerTimer = null;
    this.dashState = { phase: 'ready', charge: 1 };
    this.stickPointer = null;
    this.lastSteer = { x: 0, y: 0 };
    this.trip = createSwimmingTrip();
    this.tripEndShownAt = 0;
    this.newTripRequested = false;
  }

  create(): void {
    this.view = readSceneView(this.scale);
    this.motion = motionProfile(this.registry.get(REGISTRY_KEYS.reducedMotion) === true);
    this.collected = Number(this.registry.get(REGISTRY_KEYS.collected) ?? 0);
    this.total = Number(this.registry.get(REGISTRY_KEYS.total) ?? 0);
    this.trip = (this.registry.get(TRIP_REGISTRY_KEYS.state) as TripSnapshot | undefined) ?? createSwimmingTrip();
    useCssCamera(this.cameras.main, this.view.fit.dpr);

    this.buildCounter();
    this.buildLegs();
    this.buildButtons();
    this.buildStick();
    this.buildOverlay();
    this.buildBanner();
    this.buildTripCard();
    this.bindKeys();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.on(GAME_EVENTS.COLLECTED, this.handleCollected, this);
    this.game.events.on(GAME_EVENTS.ALL_COLLECTED, this.handleAllCollected, this);
    this.game.events.on(GAME_EVENTS.DASH_STATE, this.handleDashState, this);
    this.game.events.on(GAME_EVENTS.REQUEST_PAUSE, this.pauseSwim, this);
    this.game.events.on(GAME_EVENTS.REDUCED_MOTION, this.handleReducedMotion, this);
    this.game.events.on(TRIP_EVENTS.STATE, this.handleTripState, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    this.layout();
    this.drawLegs();
    if (this.trip.phase === 'ended') this.showTripCard();
  }

  update(): void {
    this.updateStick();
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

  /** Legs panel: label plus one outline, fill and sparkle image per leg slot, laid out by layoutLegs(). */
  private buildLegs(): void {
    const { legIcons, regrowMark } = this.assets.predator;
    this.legsPanel = this.add.graphics().setDepth(DEPTH.ui);
    this.legsLabel = this.add.text(0, 0, LEGS_LABEL, uiTextStyle(LEGS_TEXT_PX, this.view.fit.dpr)).setDepth(DEPTH.ui);
    this.legIcons = [];
    for (let i = 0; i < LEGS.count; i++) {
      this.legIcons.push({
        outline: this.addLegImage(legIcons.outline),
        fill: this.addLegImage(legIcons.present),
        mark: this.addLegImage(regrowMark),
      });
    }
  }

  /** Adds a top-left anchored legs-display image at the LEGS_ICON_PX scale. */
  private addLegImage(info: TexInfo): Phaser.GameObjects.Image {
    return this.add
      .image(0, 0, info.key)
      .setOrigin(info.originNormX, info.originNormY)
      .setScale(LEGS_ICON_PX / LEG_ICON_SIZE / info.scale)
      .setDepth(DEPTH.ui);
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

  /** Swim pad: fixed base, moving knob and an invisible capture zone laid out by layoutStick(). */
  private buildStick(): void {
    const { base, knob } = this.assets.baked.stick;
    this.stickBase = this.add
      .image(0, 0, base.key)
      .setOrigin(base.originNormX, base.originNormY)
      .setAlpha(STICK_IDLE_ALPHA)
      .setDepth(DEPTH.ui);
    this.stickKnob = this.add
      .image(0, 0, knob.key)
      .setOrigin(knob.originNormX, knob.originNormY)
      .setAlpha(STICK_IDLE_ALPHA)
      .setDepth(DEPTH.ui);
    this.stickZone = this.add.zone(0, 0, 1, 1).setOrigin(0, 0).setDepth(STICK_ZONE_DEPTH).setInteractive();
    this.stickZone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, this.captureStick, this);
  }

  /** Full-screen ink dim that swallows presses so nothing under a modal card reacts. */
  private addScreenDim(): Phaser.GameObjects.Rectangle {
    const ink = cssColor(INK);
    return this.add
      .rectangle(-OVERLAY_COVER / 2, -OVERLAY_COVER / 2, OVERLAY_COVER, OVERLAY_COVER, ink.color, OVERLAY_ALPHA)
      .setOrigin(0, 0)
      .setInteractive();
  }

  private buildOverlay(): void {
    const dpr = this.view.fit.dpr;
    const dim = this.addScreenDim();
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

  /** Carried-home card: dim, panel, title, body and the focused Swim again button. Drawn above the banner. */
  private buildTripCard(): void {
    const dpr = this.view.fit.dpr;
    const dim = this.addScreenDim();
    this.tripCardPanel = this.add.graphics();
    this.tripCardTitle = this.add.text(0, 0, TRIP_END_TITLE, {
      ...uiTextStyle(OVERLAY_TITLE_PX, dpr),
      align: 'center',
    });
    this.tripCardBody = this.add.text(0, 0, TRIP_END_BODY, {
      ...uiTextStyle(TRIP_END_BODY_PX, dpr, false),
      align: 'center',
    });
    this.swimAgainButton = createButton(this, this.assets.baked, {
      fill: 'primary',
      shape: 'wide',
      size: RESUME_BUTTON_SIZE,
      label: SWIM_AGAIN_LABEL,
      icon: 'play',
      dpr,
      pressOnDown: false,
      onPress: () => this.requestNewTrip(),
    });
    this.swimAgainButton.setFocused(true);
    this.tripCard = this.add
      .container(0, 0, [dim, this.tripCardPanel, this.tripCardTitle, this.tripCardBody, this.swimAgainButton.container])
      .setDepth(DEPTH.ui + 10)
      .setVisible(false);
  }

  private bindKeys(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    keyboard.on('keydown-P', this.togglePause, this);
    keyboard.on('keydown-ESC', this.togglePause, this);
    keyboard.on('keydown-ENTER', this.handleConfirmKey, this);
    keyboard.on('keydown-SPACE', this.handleConfirmKey, this);
  }

  // ---- layout --------------------------------------------------------------

  private layout(): void {
    this.layoutCounter();
    this.layoutLegs();
    this.layoutButtons();
    this.layoutStick();
    this.layoutOverlay();
    this.layoutBanner();
    this.layoutTripCard();
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
    this.counterPanelH = panelH;
    drawPanel(this.counterPanel, MARGIN, MARGIN, panelW, panelH, UI_PANEL);
    this.counterIcon.setPosition(MARGIN + PANEL_PAD, MARGIN + PANEL_PAD + (contentH - COUNTER_ICON_PX) / 2);
    this.counterText.setPosition(
      MARGIN + PANEL_PAD + COUNTER_ICON_PX + GAP / 2,
      MARGIN + PANEL_PAD + (contentH - this.counterText.height) / 2,
    );
  }

  /** Places the legs panel under the snack counter: label, then the icons in display order. */
  private layoutLegs(): void {
    const top = MARGIN + this.counterPanelH + GAP;
    const label = this.legsLabel;
    const contentH = Math.max(LEGS_ICON_PX, label.height);
    const iconsW = LEGS.count * LEGS_ICON_PX + (LEGS.count - 1) * LEGS_ICON_GAP;
    const panelW = PANEL_PAD + label.width + GAP / 2 + iconsW + PANEL_PAD;
    const panelH = contentH + 2 * PANEL_PAD;
    this.legsPanelBottom = top + panelH;
    drawPanel(this.legsPanel, MARGIN, top, panelW, panelH, UI_PANEL);
    label.setPosition(MARGIN + PANEL_PAD, top + PANEL_PAD + (contentH - label.height) / 2);
    const iconsX = MARGIN + PANEL_PAD + label.width + GAP / 2;
    const iconY = top + PANEL_PAD + (contentH - LEGS_ICON_PX) / 2;
    this.legIcons.forEach((icon, index) => {
      const iconX = iconsX + index * (LEGS_ICON_PX + LEGS_ICON_GAP);
      icon.outline.setPosition(iconX, iconY);
      icon.fill.setPosition(iconX, iconY);
      icon.mark.setPosition(iconX + LEGS_ICON_PX - icon.mark.displayWidth, iconY);
    });
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

  /** Places the swim pad bottom-left, clear of the counter and legs panels and the Dash ring. Keeps any capture. */
  private layoutStick(): void {
    const { cssW, cssH } = this.view;
    const reserveTop = this.legsPanelBottom;
    const reserveRight = MARGIN + 2 * (this.ringRadius() + RING_TRACK_PX / 2);
    this.stick = stickLayout({ cssW, cssH }, { top: reserveTop, right: reserveRight });
    const { centre, baseR, knobR, zone } = this.stick;
    const { base, knob } = this.assets.baked.stick;
    this.stickBase.setPosition(centre.x, centre.y).setScale(baseR / STICK_BASE_R / base.scale);
    this.stickKnob.setScale(knobR / STICK_KNOB_R / knob.scale);
    this.tweens.killTweensOf(this.stickKnob);
    this.stickKnob.setPosition(centre.x, centre.y);
    this.stickZone.setPosition(zone.x, zone.y).setSize(zone.w, zone.h);
    if (this.stickPointer) this.updateStick();
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
    const top = Math.max(MARGIN + this.pauseButton.height + GAP + 8, this.legsPanelBottom + GAP);
    drawPanel(this.bannerPanel, (cssW - panelW) / 2, top, panelW, panelH, UI_PANEL_PINK);
    this.bannerText.setPosition((cssW - this.bannerText.width) / 2, top + PANEL_PAD);
  }

  /** Centres the trip-end card; tightens its padding when a short screen cannot fit the full padding. */
  private layoutTripCard(): void {
    const { cssW, cssH } = this.view;
    const title = this.tripCardTitle;
    const body = this.tripCardBody;
    const button = this.swimAgainButton;
    const textW = Math.max(120, Math.min(TRIP_END_TEXT_MAX_W, cssW - 2 * (MARGIN + OVERLAY_PAD)));
    title.setWordWrapWidth(textW, true);
    body.setWordWrapWidth(textW, true);
    const contentH = title.height + body.height + button.height;
    const pad = contentH + 4 * OVERLAY_PAD <= cssH - 2 * MARGIN ? OVERLAY_PAD : GAP;
    const panelW = Math.min(cssW - 2 * MARGIN, Math.max(button.width, title.width, body.width) + 2 * OVERLAY_PAD);
    const panelH = contentH + 4 * pad;
    const panelX = (cssW - panelW) / 2;
    const panelY = Math.max(MARGIN, (cssH - panelH) / 2);
    drawPanel(this.tripCardPanel, panelX, panelY, panelW, panelH, UI_PANEL);
    title.setPosition((cssW - title.width) / 2, panelY + pad);
    body.setPosition((cssW - body.width) / 2, panelY + 2 * pad + title.height);
    button.container.setPosition((cssW - button.width) / 2, panelY + 3 * pad + title.height + body.height);
  }

  /** Shows each leg icon for the current snapshot, sorted present, regrowing, lost. */
  private drawLegs(): void {
    const slots = [...this.trip.legs.slots].sort((a, b) => LEG_DISPLAY_RANK[a.status] - LEG_DISPLAY_RANK[b.status]);
    this.legIcons.forEach((icon, index) => this.drawLegIcon(icon, slots[index]));
  }

  /**
   * Present: solid fill. Lost: dashed outline. Regrowing: outline, fill cropped to the bottom
   * `progress` fraction, and the sparkle (composition per src/art/drawLegIcons.ts).
   */
  private drawLegIcon(icon: LegIconView, slot: LegSlotSnapshot | undefined): void {
    const status = slot?.status;
    const regrowing = status === 'regrowing';
    icon.outline.setVisible(status === 'lost' || regrowing);
    icon.mark.setVisible(regrowing);
    icon.fill.setVisible(status === 'present' || regrowing);
    if (!regrowing) {
      icon.fill.setCrop();
      return;
    }
    const progress = Phaser.Math.Clamp(slot?.progress ?? 0, 0, 1);
    const frameW = icon.fill.frame.width;
    const frameH = icon.fill.frame.height;
    const cropTop = frameH * (1 - progress);
    icon.fill.setCrop(0, cropTop, frameW, frameH - cropTop);
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
    if (this.paused || this.trip.phase !== 'swimming') return;
    this.game.events.emit(GAME_EVENTS.REQUEST_DASH);
  }

  private togglePause(): void {
    if (this.paused) {
      this.resumeSwim();
      return;
    }
    this.pauseSwim();
  }

  private captureStick(pointer: Phaser.Input.Pointer): void {
    if (this.paused || this.trip.phase !== 'swimming' || this.stickPointer) return;
    this.stickPointer = pointer;
    this.stickDownTime = pointer.downTime;
    this.tweens.killTweensOf(this.stickKnob);
    this.stickBase.setAlpha(STICK_ACTIVE_ALPHA);
    this.stickKnob.setAlpha(STICK_ACTIVE_ALPHA);
    this.updateStick();
  }

  /** Moves the knob toward the captured pointer and emits the steer it implies; releases once the press ends. */
  private updateStick(): void {
    const pointer = this.stickPointer;
    if (!pointer) return;
    if (!pointer.isDown || pointer.downTime !== this.stickDownTime) {
      this.releaseStick();
      return;
    }
    const { centre, travel } = this.stick;
    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const offset = { x: point.x - centre.x, y: point.y - centre.y };
    const knobAt = add(centre, clampLen(offset, travel));
    this.stickKnob.setPosition(knobAt.x, knobAt.y);
    this.emitSteer(stickSteer(offset, travel));
  }

  /** Drops any capture, sends a zero steer and recentres the knob, eased only when `animate` is set. */
  private releaseStick(animate: boolean = this.motion.ambient): void {
    this.stickPointer = null;
    this.emitSteer({ x: 0, y: 0 });
    this.stickBase.setAlpha(STICK_IDLE_ALPHA);
    this.stickKnob.setAlpha(STICK_IDLE_ALPHA);
    this.tweens.killTweensOf(this.stickKnob);
    const { centre } = this.stick;
    if (!animate) {
      this.stickKnob.setPosition(centre.x, centre.y);
      return;
    }
    this.tweens.add({
      targets: this.stickKnob,
      x: centre.x,
      y: centre.y,
      duration: STICK_RECENTER_MS,
      ease: 'Sine.easeOut',
    });
  }

  /** Emits GAME_EVENTS.STEER only when the steer differs from the last one sent. */
  private emitSteer(steer: SteerPayload): void {
    const last = this.lastSteer;
    if (Math.abs(steer.x - last.x) < STEER_EPSILON && Math.abs(steer.y - last.y) < STEER_EPSILON) {
      const settledToZero = steer.x === 0 && steer.y === 0 && (last.x !== 0 || last.y !== 0);
      if (!settledToZero) return;
    }
    this.lastSteer = { x: steer.x, y: steer.y };
    this.game.events.emit(GAME_EVENTS.STEER, this.lastSteer);
  }

  private pauseSwim(): void {
    if (this.paused || this.trip.phase === 'ended') return;
    this.paused = true;
    this.releaseStick(false);
    this.setHudClockPaused(true);
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
    this.setHudClockPaused(false);
    this.scene.resume(SCENE_KEYS.swim);
    this.game.events.emit(GAME_EVENTS.RESUMED);
  }

  /**
   * Hands back a pause this HUD made when the HUD goes away, so a new HUD never shows live
   * controls over a frozen swim scene. Resumes now (not queued) and only a swim scene that is
   * still paused, so a swim scene that has stopped is never woken.
   */
  private releaseSwimPause(): void {
    if (!this.paused) return;
    this.paused = false;
    const scenes = this.game.scene;
    if (!scenes.isPaused(SCENE_KEYS.swim)) return;
    scenes.resume(SCENE_KEYS.swim);
    this.game.events.emit(GAME_EVENTS.RESUMED);
  }

  /**
   * Freezes or thaws every HUD timer and tween (banner, trip card, swim pad and any added later),
   * so pause stops HUD motion as well as the swim scene. The pause overlay and its buttons use neither.
   */
  private setHudClockPaused(paused: boolean): void {
    this.time.paused = paused;
    if (paused) {
      this.tweens.pauseAll();
    } else {
      this.tweens.resumeAll();
    }
  }

  /** Enter or Space: starts a new trip while the trip-end card shows (ignoring key repeat), else resumes. */
  private handleConfirmKey(event: KeyboardEvent): void {
    if (this.trip.phase === 'ended') {
      if (!event.repeat) this.requestNewTrip();
      return;
    }
    this.resumeSwim();
  }

  /** Asks the swim scene for a new trip once, after the card has shown for TRIP_END_MIN_MS. */
  private requestNewTrip(): void {
    if (this.trip.phase !== 'ended' || this.newTripRequested) return;
    if (this.time.now - this.tripEndShownAt < TRIP_END_MIN_MS) return;
    this.newTripRequested = true;
    this.game.events.emit(TRIP_EVENTS.REQUEST_NEW_TRIP);
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

  /**
   * Redraws the legs from the snapshot and follows its phase: into 'carrying' drops the swim pad,
   * into 'ended' shows the trip-end card, out of 'ended' hides it.
   */
  private handleTripState(snapshot: TripSnapshot): void {
    const previousPhase = this.trip.phase;
    this.trip = snapshot;
    this.drawLegs();
    if (snapshot.phase === previousPhase) return;
    if (previousPhase === 'ended') this.hideTripCard();
    if (snapshot.phase === 'carrying') this.releaseStick();
    if (snapshot.phase === 'ended') this.showTripCard();
  }

  /** Shows the trip-end card, faded in unless reduced motion is on, and hides Pause while it shows. */
  private showTripCard(): void {
    this.newTripRequested = false;
    this.tripEndShownAt = this.time.now;
    this.releaseStick();
    this.pauseButton.container.setVisible(false);
    this.tweens.killTweensOf(this.tripCard);
    this.tripCard.setVisible(true).setAlpha(this.motion.ambient ? 0 : 1);
    if (this.motion.ambient) {
      this.tweens.add({ targets: this.tripCard, alpha: 1, duration: TRIP_END_FADE_MS });
    }
  }

  private hideTripCard(): void {
    this.newTripRequested = false;
    this.tweens.killTweensOf(this.tripCard);
    this.tripCard.setVisible(false).setAlpha(1);
    this.pauseButton.container.setVisible(!this.paused);
  }

  private handleReducedMotion(payload: ReducedMotionPayload): void {
    this.motion = motionProfile(payload.reduced);
  }

  private handleResize(): void {
    this.view = readSceneView(this.scale);
    const dpr = this.view.fit.dpr;
    useCssCamera(this.cameras.main, dpr);
    const texts = [
      this.counterText,
      this.legsLabel,
      this.overlayTitle,
      this.bannerText,
      this.tripCardTitle,
      this.tripCardBody,
    ];
    for (const text of texts) {
      text.setResolution(dpr);
    }
    for (const button of [this.pauseButton, this.dashButton, this.resumeButton, this.swimAgainButton]) {
      button.setResolution(dpr);
    }
    this.layout();
  }

  private handleShutdown(): void {
    this.releaseStick(false);
    // The scene clock keeps `paused` across a restart, so thaw it here.
    this.setHudClockPaused(false);
    this.releaseSwimPause();
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.off(GAME_EVENTS.COLLECTED, this.handleCollected, this);
    this.game.events.off(GAME_EVENTS.ALL_COLLECTED, this.handleAllCollected, this);
    this.game.events.off(GAME_EVENTS.DASH_STATE, this.handleDashState, this);
    this.game.events.off(GAME_EVENTS.REQUEST_PAUSE, this.pauseSwim, this);
    this.game.events.off(GAME_EVENTS.REDUCED_MOTION, this.handleReducedMotion, this);
    this.game.events.off(TRIP_EVENTS.STATE, this.handleTripState, this);
  }
}
