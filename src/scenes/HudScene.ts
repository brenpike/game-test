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
import { BANKING_HINT, GO_HOME_LABEL, LEGS_LABEL, TRIP_BAG_LABEL, tripBagStatus } from '../logic/tripText';
import { LEGS } from '../logic/tuning';
import { add, clampLen } from '../logic/vec';
import { BankingCard } from './BankingCard';
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
import { HomeScreen } from './HomeScreen';

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
const BAG_ICON_PX = 32;
const BAG_TEXT_PX = 22;
const BAG_STATUS_PX = 18;
const BAG_GAP = 6;
const HINT_HOLD_MS = 6000;
const HINT_FADE_MS = 400;
const BANKING_CARD_DEPTH = DEPTH.ui + 8;
const HOME_SCREEN_DEPTH = DEPTH.ui + 9;
const OVERLAY_DEPTH = DEPTH.ui + 10;
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

/** Returns the widest width `text` takes for any of `values`, leaving `text` showing the last one. */
function widestText(text: Phaser.GameObjects.Text, values: readonly string[]): number {
  let widest = 0;
  for (const value of values) {
    widest = Math.max(widest, text.setText(value).width);
  }
  return widest;
}

/**
 * Screen-space UI over the swim scene: snack counter, legs display, Trip Bag display, Pause, Dash,
 * the contextual Go home button, swim pad, pause overlay, the all-snacks and first-trip hint
 * banners, the banking card and the home screen.
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
  private counterPanelW = 0;
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
  private legsPanelW = 0;
  private bagPanel!: Phaser.GameObjects.Graphics;
  private bagIcon!: Phaser.GameObjects.Image;
  private bagLabel!: Phaser.GameObjects.Text;
  private bagCount!: Phaser.GameObjects.Text;
  private bagStatus!: Phaser.GameObjects.Text;
  private bagPanelBottom = 0;
  private bagPanelW = 0;
  private goHomeButton!: UiButton;
  private hint!: Phaser.GameObjects.Container;
  private hintPanel!: Phaser.GameObjects.Graphics;
  private hintText!: Phaser.GameObjects.Text;
  private hintTimer: Phaser.Time.TimerEvent | null = null;
  private bankingCard!: BankingCard;
  private homeScreen!: HomeScreen;

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
    this.hintTimer = null;
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
    this.buildTripBag();
    this.buildButtons();
    this.buildStick();
    this.buildOverlay();
    this.buildBanner();
    this.buildHint();
    this.bankingCard = new BankingCard(this, this.assets, this.view, BANKING_CARD_DEPTH);
    this.homeScreen = new HomeScreen(this, this.assets, this.view, HOME_SCREEN_DEPTH);
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
    this.refreshControls();
    if (this.trip.phase === 'banked') this.showBankingCard();
    if (this.trip.phase === 'ended') this.homeScreen.show(this.trip, this.motion);
    this.showHintOnce();
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

  /** Trip Bag panel: bag icon, label, count and status, laid out by layoutTripBag(). */
  private buildTripBag(): void {
    const dpr = this.view.fit.dpr;
    const iconInfo = this.assets.baked.icons.bag;
    this.bagPanel = this.add.graphics().setDepth(DEPTH.ui);
    this.bagIcon = this.add
      .image(0, 0, iconKey('bag'))
      .setOrigin(0, 0)
      .setScale(BAG_ICON_PX / iconInfo.w / iconInfo.scale)
      .setDepth(DEPTH.ui);
    this.bagLabel = this.add.text(0, 0, TRIP_BAG_LABEL, uiTextStyle(BAG_TEXT_PX, dpr)).setDepth(DEPTH.ui);
    this.bagCount = this.add.text(0, 0, '', uiTextStyle(BAG_TEXT_PX, dpr)).setDepth(DEPTH.ui);
    this.bagStatus = this.add.text(0, 0, '', uiTextStyle(BAG_STATUS_PX, dpr, false)).setDepth(DEPTH.ui);
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

    this.goHomeButton = createButton(this, this.assets.baked, {
      fill: 'secondary',
      shape: 'wide',
      size: 1,
      label: GO_HOME_LABEL,
      icon: 'home',
      dpr,
      pressOnDown: false,
      onPress: () => this.requestGoHome(),
    });
    this.goHomeButton.container.setDepth(DEPTH.ui).setVisible(false);
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
      .setDepth(OVERLAY_DEPTH)
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

  /** First-trip hint banner: pink panel and the banking hint, stacked with the all-snacks banner. */
  private buildHint(): void {
    this.hintPanel = this.add.graphics();
    this.hintText = this.add.text(0, 0, BANKING_HINT, {
      ...uiTextStyle(BANNER_TEXT_PX, this.view.fit.dpr),
      align: 'center',
    });
    this.hint = this.add
      .container(0, 0, [this.hintPanel, this.hintText])
      .setDepth(DEPTH.ui + 5)
      .setVisible(false);
  }

  private bindKeys(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    keyboard.on('keydown-P', this.togglePause, this);
    keyboard.on('keydown-ESC', this.togglePause, this);
    keyboard.on('keydown-ENTER', this.handleConfirmKey, this);
    keyboard.on('keydown-SPACE', this.handleConfirmKey, this);
    keyboard.on('keydown-LEFT', this.handleFocusKey, this);
    keyboard.on('keydown-RIGHT', this.handleFocusKey, this);
    keyboard.on('keydown-TAB', this.handleFocusKey, this);
    keyboard.on('keydown-H', this.handleGoHomeKey, this);
  }

  // ---- layout --------------------------------------------------------------

  private layout(): void {
    this.layoutCounter();
    this.layoutLegs();
    this.layoutTripBag();
    this.layoutButtons();
    this.layoutGoHome();
    this.layoutStick();
    this.layoutOverlay();
    this.layoutBanners();
    this.bankingCard.layout(this.view);
    this.homeScreen.layout(this.view);
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
    this.counterPanelW = panelW;
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
    this.legsPanelW = panelW;
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

  /**
   * Places the Trip Bag panel under the legs panel: icon, label, count, status. The count and status
   * slots are sized for their widest values, so the panel never changes width as the bag fills.
   */
  private layoutTripBag(): void {
    const top = this.legsPanelBottom + GAP;
    const countW = widestText(
      this.bagCount,
      Array.from({ length: this.assets.zone.finds.length + 1 }, (_, count) => String(count)),
    );
    const statusW = widestText(this.bagStatus, [tripBagStatus(0), tripBagStatus(1)]);
    const contentH = Math.max(BAG_ICON_PX, this.bagLabel.height, this.bagCount.height, this.bagStatus.height);
    const labelX = MARGIN + PANEL_PAD + BAG_ICON_PX + BAG_GAP;
    const countX = labelX + this.bagLabel.width + BAG_GAP;
    const statusX = countX + countW + BAG_GAP;
    const panelW = statusX + statusW + PANEL_PAD - MARGIN;
    const panelH = contentH + 2 * PANEL_PAD;
    this.bagPanelBottom = top + panelH;
    this.bagPanelW = panelW;
    drawPanel(this.bagPanel, MARGIN, top, panelW, panelH, UI_PANEL);
    const middleY = top + PANEL_PAD + contentH / 2;
    this.bagIcon.setPosition(MARGIN + PANEL_PAD, middleY - BAG_ICON_PX / 2);
    this.bagLabel.setPosition(labelX, middleY - this.bagLabel.height / 2);
    this.bagCount.setPosition(countX, middleY - this.bagCount.height / 2);
    this.bagStatus.setPosition(statusX, middleY - this.bagStatus.height / 2);
    this.drawTripBag();
  }

  /** Shows the Trip Bag count and status for the current snapshot. */
  private drawTripBag(): void {
    const count = this.trip.bag.length;
    this.bagCount.setText(String(count));
    this.bagStatus.setText(tripBagStatus(count));
  }

  /** Right edge of the widest top-left panel (snack counter, legs, Trip Bag). */
  private leftPanelsRight(): number {
    return MARGIN + Math.max(this.counterPanelW, this.legsPanelW, this.bagPanelW);
  }

  /** Top edge of the Dash ring track. */
  private dashRingTop(): number {
    const centreY = this.dashButton.container.y + this.dashButton.height / 2;
    return centreY - this.ringRadius() - RING_TRACK_PX / 2;
  }

  /**
   * Places Go home under Pause, dropped below the top-left panels when they would meet it. When
   * that would reach the Dash ring (a very short screen), it sits left of Pause on the top row instead.
   * When the top row has no room beside the snack counter either (a screen both narrow and short),
   * it stacks right under Pause, so the whole button always stays on screen.
   */
  private layoutGoHome(): void {
    const { cssW } = this.view;
    const button = this.goHomeButton;
    const x = cssW - MARGIN - button.width;
    const underPause = MARGIN + this.pauseButton.height + GAP;
    const y = x < this.leftPanelsRight() + GAP ? Math.max(underPause, this.bagPanelBottom + GAP) : underPause;
    if (y + button.height + GAP <= this.dashRingTop()) {
      button.container.setPosition(x, y);
      return;
    }
    const topRowX = this.pauseButton.container.x - GAP - button.width;
    if (topRowX >= MARGIN + this.counterPanelW + GAP) {
      button.container.setPosition(topRowX, MARGIN);
      return;
    }
    button.container.setPosition(Math.max(MARGIN, x), underPause);
  }

  private goHomeBottom(): number {
    return this.goHomeButton.container.y + this.goHomeButton.height;
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

  /**
   * Places the swim pad bottom-left, clear of the top-left panels, the Go home button and the Dash
   * ring. Keeps any capture.
   */
  private layoutStick(): void {
    const { cssW, cssH } = this.view;
    const reserveTop = Math.max(this.bagPanelBottom, this.goHomeBottom());
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

  /** Top edge for the banners: clear of Pause, the top-left panels and Go home. */
  private bannerTop(): number {
    return Math.max(
      MARGIN + this.pauseButton.height + GAP + 8,
      this.bagPanelBottom + GAP,
      this.goHomeBottom() + GAP,
    );
  }

  /** Stacks the banners: the hint first while it shows, then the all-snacks banner. */
  private layoutBanners(): void {
    const top = this.bannerTop();
    const hintBottom = this.layoutTopBanner(this.hintPanel, this.hintText, top);
    this.layoutTopBanner(this.bannerPanel, this.bannerText, this.hint.visible ? hintBottom + GAP : top);
  }

  /** Draws one centred pink banner panel at `top` around its text and returns its bottom edge. */
  private layoutTopBanner(panel: Phaser.GameObjects.Graphics, text: Phaser.GameObjects.Text, top: number): number {
    const { cssW } = this.view;
    text.setWordWrapWidth(Math.max(120, cssW - 2 * (MARGIN + PANEL_PAD)), true);
    const panelW = text.width + 2 * PANEL_PAD;
    const panelH = text.height + 2 * PANEL_PAD;
    drawPanel(panel, (cssW - panelW) / 2, top, panelW, panelH, UI_PANEL_PINK);
    text.setPosition((cssW - text.width) / 2, top + PANEL_PAD);
    return top + panelH;
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

  /** Asks the swim scene to end the trip, only while swimming inside the Home Spot ring and not paused. */
  private requestGoHome(): void {
    if (this.paused || this.trip.phase !== 'swimming' || !this.trip.inHomeSpot) return;
    this.game.events.emit(TRIP_EVENTS.REQUEST_GO_HOME);
  }

  /**
   * Shows Pause unless paused or a banking card or home screen is up, and Go home only while
   * swimming inside the Home Spot ring and not paused.
   */
  private refreshControls(): void {
    const phase = this.trip.phase;
    const modal = phase === 'banked' || phase === 'ended';
    this.pauseButton.container.setVisible(!this.paused && !modal);
    this.goHomeButton.container.setVisible(!this.paused && phase === 'swimming' && this.trip.inHomeSpot);
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
    this.refreshControls();
    this.overlay.setVisible(true);
    this.game.events.emit(GAME_EVENTS.PAUSED);
  }

  private resumeSwim(): void {
    if (!this.paused) return;
    this.paused = false;
    this.overlay.setVisible(false);
    this.refreshControls();
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
   * Freezes or thaws every HUD timer and tween (banners, banking card, home screen, swim pad and any added later),
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

  /**
   * Enter or Space: resumes when paused; otherwise presses the focused banking card button or
   * Swim again on the home screen, ignoring key repeat.
   */
  private handleConfirmKey(event: KeyboardEvent): void {
    if (this.paused) {
      this.resumeSwim();
      return;
    }
    if (event.repeat) return;
    if (this.trip.phase === 'banked') this.bankingCard.pressFocused();
    if (this.trip.phase === 'ended') this.homeScreen.press();
  }

  /** Left, Right or Tab: moves the banking card focus to the other button, ignoring key repeat. */
  private handleFocusKey(event: KeyboardEvent): void {
    if (this.paused || event.repeat || this.trip.phase !== 'banked') return;
    this.bankingCard.moveFocus();
  }

  /** H: Go home from the banking card, or from the Home Spot while swimming. Ignores key repeat. */
  private handleGoHomeKey(event: KeyboardEvent): void {
    if (this.paused || event.repeat) return;
    if (this.trip.phase === 'banked') {
      this.bankingCard.pressGoHome();
      return;
    }
    this.requestGoHome();
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
   * Redraws the legs and Trip Bag from the snapshot and follows its phase: leaving 'swimming' drops
   * the swim pad and the hint, into 'banked' shows the banking card, into 'ended' shows the home
   * screen, and leaving either hides it.
   */
  private handleTripState(snapshot: TripSnapshot): void {
    const previousPhase = this.trip.phase;
    this.trip = snapshot;
    this.drawLegs();
    this.drawTripBag();
    this.refreshControls();
    if (snapshot.phase === previousPhase) return;
    if (previousPhase === 'banked') this.hideBankingCard();
    if (previousPhase === 'ended') this.homeScreen.hide();
    if (snapshot.phase !== 'swimming') {
      this.releaseStick();
      this.hideHint();
    }
    if (snapshot.phase === 'banked') this.showBankingCard();
    if (snapshot.phase === 'ended') this.homeScreen.show(snapshot, this.motion);
  }

  /** Shows the banking card and captures Tab so it moves focus between the card buttons. */
  private showBankingCard(): void {
    this.input.keyboard?.addCapture(Phaser.Input.Keyboard.KeyCodes.TAB);
    this.bankingCard.show(this.trip, this.motion);
  }

  private hideBankingCard(): void {
    this.input.keyboard?.removeCapture(Phaser.Input.Keyboard.KeyCodes.TAB);
    this.bankingCard.hide();
  }

  /**
   * Shows the banking hint once per session, at the start of the first trip: fades in, holds for
   * HINT_HOLD_MS on the HUD clock (so pause freezes it), then fades out. Appears and leaves at once
   * under reduced motion.
   */
  private showHintOnce(): void {
    if (this.registry.get(TRIP_REGISTRY_KEYS.bankingHintShown) === true || this.trip.phase !== 'swimming') return;
    this.registry.set(TRIP_REGISTRY_KEYS.bankingHintShown, true);
    this.hint.setVisible(true).setAlpha(this.motion.ambient ? 0 : 1);
    this.layoutBanners();
    if (this.motion.ambient) {
      this.tweens.add({ targets: this.hint, alpha: 1, duration: HINT_FADE_MS });
    }
    this.hintTimer = this.time.delayedCall(HINT_FADE_MS + HINT_HOLD_MS, this.fadeOutHint, [], this);
  }

  private fadeOutHint(): void {
    this.hintTimer = null;
    if (!this.motion.ambient) {
      this.hideHint();
      return;
    }
    this.tweens.add({
      targets: this.hint,
      alpha: 0,
      duration: HINT_FADE_MS,
      onComplete: () => this.hideHint(),
    });
  }

  /** Hides the hint at once and lets the all-snacks banner take the top slot. */
  private hideHint(): void {
    this.hintTimer?.remove(false);
    this.hintTimer = null;
    if (!this.hint.visible) return;
    this.tweens.killTweensOf(this.hint);
    this.hint.setVisible(false).setAlpha(1);
    this.layoutBanners();
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
      this.bagLabel,
      this.bagCount,
      this.bagStatus,
      this.overlayTitle,
      this.bannerText,
      this.hintText,
    ];
    for (const text of texts) {
      text.setResolution(dpr);
    }
    for (const button of [this.pauseButton, this.dashButton, this.goHomeButton, this.resumeButton]) {
      button.setResolution(dpr);
    }
    this.bankingCard.setResolution(dpr);
    this.homeScreen.setResolution(dpr);
    this.layout();
  }

  private handleShutdown(): void {
    this.releaseStick(false);
    this.input.keyboard?.removeCapture(Phaser.Input.Keyboard.KeyCodes.TAB);
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
