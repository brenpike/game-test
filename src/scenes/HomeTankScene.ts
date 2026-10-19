import * as Phaser from 'phaser';
import { AXO_SCENE_SCALE, type AxolotlPose } from '../art/drawAxolotl';
import { DEPTH } from '../art/layers';
import {
  HOME_TANK_WALL,
  MORPH_PALETTES,
  SURFACE_LINE,
  SURFACE_LINE_WIDTH,
  T_STATIC,
  UI_PANEL,
  type MorphPalette,
} from '../art/palette';
import type { IconKind } from '../art/drawUi';
import { createAxolotlTexture, type AxolotlTexture, type TexInfo } from '../art/textures';
import { GAME_EVENTS, REGISTRY_KEYS, type ReducedMotionPayload } from '../logic/gameEvents';
import type { Size } from '../logic/hudLayout';
import { motionProfile, type MotionProfile } from '../logic/motion';
import { NO_REPAINT, pickSecondaryRepaint } from '../logic/repaintBudget';
import { setTankLayout, type Session } from '../logic/session';
import { TANK, tankFrame, tankToCss, type TankFrame, type TankLayout } from '../logic/tank';
import { tankSwimPose } from '../logic/tankSwim';
import { HOME_TANK_NAME } from '../logic/tankText';
import {
  HUB_BUTTONS,
  UI,
  hubButtonLook,
  hubLayout,
  nextFocusIndex,
  tankKeyFor,
  type HubActionId,
  type HubButtonSpec,
  type TankKey,
} from '../logic/tankUi';
import type { TripEnding } from '../logic/tripEvents';
import { SURF, waveY } from '../logic/zone';
import {
  SCENE_KEYS,
  blinkAt,
  createButton,
  cssColor,
  drawPanel,
  readSceneView,
  samePose,
  uiTextStyle,
  useCssCamera,
  type GameAssets,
  type SceneView,
  type UiButton,
} from './BootScene';
import { CollectionBookView } from './CollectionBookView';
import { settleMotionTweens } from './motionTweens';
import { goExploring, readSession, writeSession, type HomeTankStart } from './sceneFlow';
import { TankArrivalCard } from './TankArrivalCard';
import { TankDecorator } from './TankDecorator';
import { TreasureChestView } from './TreasureChestView';

const TAU = Math.PI * 2;
const TITLE_PX = 34;
const SURFACE_STEP = 8;
const GO_EXPLORING_INDEX = 0;
const LOW_FPS = 45;
const LOW_FPS_REDRAW_S = 1 / 30;
const CAPTURED_KEYS: readonly number[] = [
  Phaser.Input.Keyboard.KeyCodes.TAB,
  Phaser.Input.Keyboard.KeyCodes.LEFT,
  Phaser.Input.Keyboard.KeyCodes.RIGHT,
  Phaser.Input.Keyboard.KeyCodes.UP,
  Phaser.Input.Keyboard.KeyCodes.DOWN,
  Phaser.Input.Keyboard.KeyCodes.SPACE,
  Phaser.Input.Keyboard.KeyCodes.BACKSPACE,
];

/** The icon on each hub action button. */
const HUB_ICONS: Readonly<Record<HubActionId, IconKind>> = Object.freeze({
  goExploring: 'play',
  decorate: 'decorate',
  treasureChest: 'chest',
  collectionBook: 'book',
});

/**
 * Home Tank draw order (art guide 7f): back layer (wall to gravel), placed Decorations, glass shine,
 * axolotls, surface line, tank outline and lid front, hub UI and the decorate toolbar, the Treasure
 * Chest and the Collection Book (never open together), then the tank arrival card on top.
 */
const TANK_DEPTH = Object.freeze({
  back: DEPTH.bg,
  decorations: DEPTH.reeds,
  glass: DEPTH.haze,
  axolotls: DEPTH.axolotl,
  surface: DEPTH.surface,
  front: DEPTH.fx,
  hub: DEPTH.ui,
  chest: DEPTH.ui + 8,
  book: DEPTH.ui + 8,
  arrival: DEPTH.ui + 9,
});

/**
 * What the Home Tank is showing and where keys go, in priority order: the tank arrival card, the
 * Treasure Chest, the Collection Book, decorate mode, or the hub.
 */
type TankMode = 'arrival' | 'chest' | 'book' | 'decorate' | 'hub';

/** One hub action button. */
interface HubButton {
  id: HubActionId;
  button: UiButton;
}

/** One owned axolotl swimming in the tank, with its own texture, morph colours and pose cache. */
interface TankSwimmer {
  id: string;
  texture: AxolotlTexture;
  palette: MorphPalette;
  image: Phaser.GameObjects.Image;
  lastPose: AxolotlPose | null;
  /** This frame's pose for an axolotl after the first, painted when the shared repaint budget picks it. */
  wanted?: AxolotlPose;
  /** Seconds since the last repaint, for the low frame rate repaint cap. */
  redrawAcc: number;
}

/** Focus step for a hub key: next, right and down step forward; previous, left and up step back; else 0. */
function hubFocusStep(action: TankKey): number {
  if (action === 'next' || action === 'right' || action === 'down') return 1;
  if (action === 'previous' || action === 'left' || action === 'up') return -1;
  return 0;
}

/** Places a full-frame tank layer (480 x 360, origin top-left) on the tank frame. */
function placeTankLayer(image: Phaser.GameObjects.Image, info: TexInfo, frame: TankFrame): void {
  image.setPosition(frame.x, frame.y).setScale(frame.scale / info.scale);
}

/**
 * The Home Tank hub (PRD C7, C8): the tank on the wall, every owned axolotl swimming on its own
 * in its morph's colours (still poses under reduced motion), the animated surface line, and the hub
 * actions Go exploring, Decorate, Treasure Chest and Collection Book, by touch and by keyboard.
 * After a trip the tank arrival card shows first and takes every key and press until it closes.
 */
export class HomeTankScene extends Phaser.Scene {
  private assets!: GameAssets;
  private arrival: TripEnding | null = null;
  private session!: Session;
  private motion!: MotionProfile;
  private view!: SceneView;
  private frame!: TankFrame;
  private clock = 0;
  private mode: TankMode = 'hub';
  private exploring = false;
  private focusIndex = GO_EXPLORING_INDEX;

  private back!: Phaser.GameObjects.Image;
  private glass!: Phaser.GameObjects.Image;
  private front!: Phaser.GameObjects.Image;
  private surface!: Phaser.GameObjects.Graphics;
  private surfaceLine = { color: 0, alpha: 1 };
  private swimmers: TankSwimmer[] = [];
  /** Repaint budget waits for the axolotls after the first, one per axolotl; reused every frame. */
  private readonly rescuedWaits: number[] = [];

  private titlePanel!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private hubButtons: HubButton[] = [];
  private titleFits = false;
  private decorator!: TankDecorator;
  private chest!: TreasureChestView;
  private book!: CollectionBookView;
  private arrivalCard!: TankArrivalCard;

  constructor() {
    super(SCENE_KEYS.homeTank);
  }

  init(data: HomeTankStart): void {
    this.assets = data.assets;
    this.arrival = data.arrival;
    this.clock = 0;
    this.mode = 'hub';
    this.exploring = false;
    this.focusIndex = GO_EXPLORING_INDEX;
    this.swimmers = [];
    this.hubButtons = [];
    this.titleFits = false;
  }

  create(): void {
    this.view = readSceneView(this.scale);
    this.motion = motionProfile(this.registry.get(REGISTRY_KEYS.reducedMotion) === true);
    this.session = readSession(this.registry);
    this.frame = tankFrame(this.view.cssW, this.view.cssH);
    useCssCamera(this.cameras.main, this.view.fit.dpr);
    this.cameras.main.setBackgroundColor(HOME_TANK_WALL);

    this.buildTank();
    this.buildDecorator();
    this.buildSwimmers();
    this.buildHub();
    this.chest = new TreasureChestView(
      this,
      { baked: this.assets.baked, treasure: this.assets.treasure },
      this.view,
      TANK_DEPTH.chest,
      () => this.closeChest(),
    );
    this.book = new CollectionBookView(
      this,
      { baked: this.assets.baked, morph: this.assets.morph, treasure: this.assets.treasure },
      this.view,
      TANK_DEPTH.book,
      () => this.closeBook(),
    );
    this.arrivalCard = new TankArrivalCard(
      this,
      this.assets,
      this.view,
      TANK_DEPTH.arrival,
      () => this.motion,
      () => this.closeArrival(),
    );
    this.bindInput();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.on(GAME_EVENTS.REDUCED_MOTION, this.handleReducedMotion, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    this.layout();
    this.animate(0);
    if (this.arrival !== null) this.showArrival(this.arrival);
    this.refreshHubFocus();
  }

  update(_time: number, deltaMs: number): void {
    this.animate(Math.min(Math.max(deltaMs / 1000, 0), 0.05));
  }

  // ---- build ---------------------------------------------------------------

  private buildTank(): void {
    const tank = this.assets.tank;
    this.back = this.add.image(0, 0, tank.back.key).setOrigin(0, 0).setDepth(TANK_DEPTH.back);
    this.glass = this.add.image(0, 0, tank.glass.key).setOrigin(0, 0).setDepth(TANK_DEPTH.glass);
    this.surface = this.add.graphics().setDepth(TANK_DEPTH.surface);
    this.surfaceLine = cssColor(SURFACE_LINE);
    this.front = this.add.image(0, 0, tank.front.key).setOrigin(0, 0).setDepth(TANK_DEPTH.front);
  }

  /** The placed Decorations, always drawn, and decorate mode, entered from the hub. */
  private buildDecorator(): void {
    const { baked, treasure, tank } = this.assets;
    this.decorator = new TankDecorator(
      {
        scene: this,
        textures: { baked, treasure, tank },
        depths: { decorations: TANK_DEPTH.decorations, ui: TANK_DEPTH.hub },
        dpr: this.view.fit.dpr,
        onLayoutChange: (layout) => this.saveTankLayout(layout),
        onDone: () => this.stopDecorating(),
      },
      this.session.hub.tank,
      this.session.hub.banked,
    );
  }

  /**
   * One swimmer per owned axolotl in its morph's colours, each with its own texture so their poses
   * never share a frame.
   */
  private buildSwimmers(): void {
    const bakeScale = this.assets.axolotl.scale;
    this.swimmers = this.session.hub.axolotls.map((axolotl): TankSwimmer => {
      const texture = createAxolotlTexture(this, `tank-axolotl-${axolotl.id}`, bakeScale);
      const image = this.add
        .image(0, 0, texture.key)
        .setOrigin(texture.info.originNormX, texture.info.originNormY)
        .setDepth(TANK_DEPTH.axolotls);
      return { id: axolotl.id, texture, palette: MORPH_PALETTES[axolotl.morph], image, lastPose: null, redrawAcc: 0 };
    });
  }

  /** The hub actions in focus order (Go exploring first) and the Home Tank name panel. */
  private buildHub(): void {
    const dpr = this.view.fit.dpr;
    this.titlePanel = this.add.graphics().setDepth(TANK_DEPTH.hub);
    this.titleText = this.add.text(0, 0, HOME_TANK_NAME, uiTextStyle(TITLE_PX, dpr)).setDepth(TANK_DEPTH.hub);
    this.hubButtons = HUB_BUTTONS.map((spec) => this.addHubButton(spec));
  }

  /** A hub button in the shape and size-1 body width hubButtonLook() gives, to hold its icon and label. */
  private addHubButton(spec: HubButtonSpec): HubButton {
    const { id, label, primary } = spec;
    const look = hubButtonLook(spec);
    const button = createButton(this, this.assets.baked, {
      fill: primary ? 'primary' : 'secondary',
      shape: look.shape,
      size: 1,
      width: look.w,
      label,
      icon: HUB_ICONS[id],
      dpr: this.view.fit.dpr,
      pressOnDown: false,
      onPress: () => this.runHubAction(id),
    });
    button.container.setDepth(TANK_DEPTH.hub);
    return { id, button };
  }

  /** One keydown handler for every Home Tank key; Tab, arrows, Space and Backspace are captured while it runs. */
  private bindInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    keyboard.addCapture([...CAPTURED_KEYS]);
    keyboard.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.handleKeyDown, this);
  }

  // ---- modes ---------------------------------------------------------------

  private showArrival(ending: TripEnding): void {
    this.mode = 'arrival';
    this.arrivalCard.show(ending, this.session.hub.banked.length);
    this.refreshHubFocus();
  }

  /** The arrival card closed: back to the hub with Go exploring focused. */
  private closeArrival(): void {
    this.showHub(GO_EXPLORING_INDEX);
  }

  /** Gives the hub the input again, showing its buttons with the focus on `focusIndex`. */
  private showHub(focusIndex: number): void {
    this.mode = 'hub';
    this.focusIndex = focusIndex;
    this.applyHubVisibility();
    this.refreshHubFocus();
  }

  /** Leaves the hub for the Treasure Chest, the Collection Book or decorate mode: its buttons and name panel hide. */
  private leaveHub(mode: 'chest' | 'book' | 'decorate'): void {
    this.mode = mode;
    this.applyHubVisibility();
    this.refreshHubFocus();
  }

  /** Index of the hub button `id`. Throws when the hub has no such button. */
  private hubIndexOf(id: HubActionId): number {
    const index = this.hubButtons.findIndex((hubButton) => hubButton.id === id);
    if (index === -1) throw new Error(`HomeTankScene: no hub button ${id}`);
    return index;
  }

  /** Runs a hub action, only while the hub has the input. */
  private runHubAction(id: HubActionId): void {
    if (this.mode !== 'hub') return;
    switch (id) {
      case 'goExploring':
        this.startExploring();
        return;
      case 'treasureChest':
        this.openChest();
        return;
      case 'decorate':
        this.startDecorating();
        return;
      case 'collectionBook':
        this.openBook();
        return;
    }
  }

  /** Go exploring, once: starts the trip through the scene flow. */
  private startExploring(): void {
    if (this.exploring) return;
    this.exploring = true;
    goExploring(this, this.assets);
  }

  /** Opens the Treasure Chest over the hub (PRD C11) with the treasures banked so far. */
  private openChest(): void {
    this.leaveHub('chest');
    this.chest.open(this.session.hub.banked);
  }

  /** The Treasure Chest closed: back to the hub with Treasure Chest focused. */
  private closeChest(): void {
    this.showHub(this.hubIndexOf('treasureChest'));
  }

  /** Opens the Collection Book over the hub (PRD C12, C14) with the found morphs and the tilapia card. */
  private openBook(): void {
    this.leaveHub('book');
    this.book.open(this.session.hub.book.foundMorphs, this.session.hub.book.tilapiaCard);
  }

  /** The Collection Book closed: back to the hub with Collection Book focused. */
  private closeBook(): void {
    this.showHub(this.hubIndexOf('collectionBook'));
  }

  /** Starts decorate mode (PRD C9); the hub hides while the decorate toolbar shows. */
  private startDecorating(): void {
    this.leaveHub('decorate');
    this.decorator.enter();
  }

  /** Done or cancel in decorate mode: ends it and goes back to the hub with Decorate focused. */
  private stopDecorating(): void {
    this.decorator.exit();
    this.showHub(this.hubIndexOf('decorate'));
  }

  /** Stores a placement, move or put away in the session, so the Home Tank keeps it between trips. */
  private saveTankLayout(layout: TankLayout): void {
    this.session = setTankLayout(readSession(this.registry), layout);
    writeSession(this.registry, this.session);
  }

  // ---- input ---------------------------------------------------------------

  /**
   * Routes a key to what has the input: the arrival card, the Treasure Chest, the Collection Book,
   * decorate mode, or the hub. Unmapped keys are ignored, and so is a held confirm outside the hub.
   */
  private handleKeyDown(event: KeyboardEvent): void {
    const action = tankKeyFor(event.key, event.shiftKey);
    if (action === null) return;
    switch (this.mode) {
      case 'arrival':
        this.handleArrivalKey(action, event);
        return;
      case 'chest':
        if (action !== 'confirm' || !event.repeat) this.chest.handleKey(action);
        return;
      case 'book':
        if (action !== 'confirm' || !event.repeat) this.book.handleKey(action);
        return;
      case 'decorate':
        if (action !== 'confirm' || !event.repeat) this.decorator.handleKey(action);
        return;
      case 'hub':
        this.handleHubKey(action, event);
        return;
    }
  }

  /** Confirm presses OK on the arrival card, ignoring key repeat. */
  private handleArrivalKey(action: TankKey, event: KeyboardEvent): void {
    if (action === 'confirm' && !event.repeat) this.arrivalCard.press();
  }

  /** Confirm presses the focused hub button, ignoring key repeat; the arrows and Tab move the focus. */
  private handleHubKey(action: TankKey, event: KeyboardEvent): void {
    if (action === 'confirm') {
      if (!event.repeat) this.runHubAction(this.hubButtons[this.focusIndex].id);
      return;
    }
    const step = hubFocusStep(action);
    if (step === 0) return;
    this.focusIndex = nextFocusIndex(this.focusIndex, this.hubButtons.length, step);
    this.refreshHubFocus();
  }

  /** Shows the focus ring on the focused hub button, only while the hub has the input. */
  private refreshHubFocus(): void {
    this.hubButtons.forEach((hubButton, index) =>
      hubButton.button.setFocused(this.mode === 'hub' && index === this.focusIndex),
    );
  }

  // ---- events --------------------------------------------------------------

  /** Switches the motion profile. Running motion tweens end at once; still poses and upright plants show now (C8). */
  private handleReducedMotion(payload: ReducedMotionPayload): void {
    this.motion = motionProfile(payload.reduced);
    if (!this.motion.ambient) settleMotionTweens(this);
    this.animate(0);
  }

  private handleResize(): void {
    this.view = readSceneView(this.scale);
    const dpr = this.view.fit.dpr;
    useCssCamera(this.cameras.main, dpr);
    this.titleText.setResolution(dpr);
    for (const hubButton of this.hubButtons) {
      hubButton.button.setResolution(dpr);
    }
    this.decorator.setResolution(dpr);
    this.chest.setResolution(dpr);
    this.book.setResolution(dpr);
    this.arrivalCard.setResolution(dpr);
    this.layout();
    this.animate(0);
  }

  private handleShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.off(GAME_EVENTS.REDUCED_MOTION, this.handleReducedMotion, this);
    this.decorator.destroy();
    this.chest.destroy();
    this.book.destroy();
    this.releaseSwimmers();
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    keyboard.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.handleKeyDown, this);
    keyboard.removeCapture([...CAPTURED_KEYS]);
  }

  /**
   * Removes each axolotl's sprite and its own texture, which the texture manager would otherwise keep
   * for the whole canal trip, then forgets the axolotls (scene shutdown).
   */
  private releaseSwimmers(): void {
    for (const swimmer of this.swimmers) {
      swimmer.image.destroy();
      this.textures.remove(swimmer.texture.key);
    }
    this.swimmers = [];
    this.rescuedWaits.length = 0;
  }

  // ---- layout --------------------------------------------------------------

  /**
   * Fits the tank to the canvas, then places the Decorations, the hub, the Treasure Chest, the
   * Collection Book and the arrival card.
   */
  private layout(): void {
    this.frame = tankFrame(this.view.cssW, this.view.cssH);
    const tank = this.assets.tank;
    placeTankLayer(this.back, tank.back, this.frame);
    placeTankLayer(this.glass, tank.glass, this.frame);
    placeTankLayer(this.front, tank.front, this.frame);
    this.decorator.layout(this.view, this.frame);
    this.layoutHub();
    this.chest.layout(this.view);
    this.book.layout(this.view);
    this.arrivalCard.layout(this.view);
  }

  /**
   * Shows the hub buttons unless the Treasure Chest, the Collection Book or decorate mode is up, and
   * the name panel only when it fits.
   */
  private applyHubVisibility(): void {
    const shown = this.mode === 'hub' || this.mode === 'arrival';
    for (const hubButton of this.hubButtons) {
      hubButton.button.container.setVisible(shown);
    }
    this.titlePanel.setVisible(shown && this.titleFits);
    this.titleText.setVisible(shown && this.titleFits);
  }

  /** Places the hub buttons through hubLayout(), and the name panel only when it fits. */
  private layoutHub(): void {
    const actions = this.hubButtons.map((hubButton) => ({
      id: hubButton.id,
      w: hubButton.button.width,
      h: hubButton.button.height,
    }));
    const titleSize: Size = { w: this.titleText.width + 2 * UI.pad, h: this.titleText.height + 2 * UI.pad };
    const hub = hubLayout(this.view, this.frame, actions, titleSize);
    hub.actions.forEach((placement, index) => {
      this.hubButtons[index].button.container.setPosition(placement.rect.x, placement.rect.y);
    });
    const title = hub.title;
    this.titleFits = title !== null;
    this.applyHubVisibility();
    if (title === null) return;
    drawPanel(this.titlePanel, title.x, title.y, title.w, title.h, UI_PANEL);
    this.titleText.setPosition(title.x + UI.pad, title.y + UI.pad);
  }

  // ---- rendering -----------------------------------------------------------

  /** Advances the clock and draws the swimmers, the surface line and the plant sway. */
  private animate(dt: number): void {
    this.clock += dt;
    const t = this.motion.ambient ? this.clock : T_STATIC;
    this.swimmers.forEach((swimmer, index) => this.renderSwimmer(swimmer, index, t, dt));
    this.renderSurface(t);
    this.decorator.update(this.clock, this.motion);
    this.repaintRescuedSwimmers();
  }

  /** Places one axolotl from its tank pose (still under reduced motion) and repaints it when its pose changes. */
  private renderSwimmer(swimmer: TankSwimmer, index: number, t: number, dt: number): void {
    const pose: AxolotlPose = {
      swimPhase: (TAU * t) / 1.2,
      gillPhase: this.motion.gillFlutter ? (TAU * t) / 0.8 : (TAU * T_STATIC) / 0.8,
      blink: this.motion.ambient ? blinkAt(t) : 1,
      tailAmp: 1,
      sparkle: 0,
    };
    if (index === 0) this.redrawSwimmer(swimmer, pose, dt);
    else this.askRescuedRepaint(swimmer, index - 1, pose, dt);
    const swim = tankSwimPose(swimmer.id, index, this.clock, !this.motion.ambient);
    const at = tankToCss(this.frame, { x: swim.x, y: swim.y });
    swimmer.image
      .setPosition(at.x, at.y)
      .setFlipX(swim.facing < 0)
      .setScale((AXO_SCENE_SCALE * this.frame.scale) / swimmer.texture.scale)
      .setRotation(swim.tilt);
  }

  /**
   * Repaints one axolotl's texture in its morph's colours when its pose changes. While the frame
   * rate is low, repaints are capped at 30 a second, as in the swim, so each owned axolotl costs
   * less per frame.
   */
  private redrawSwimmer(swimmer: TankSwimmer, pose: AxolotlPose, dt: number): void {
    if (swimmer.lastPose !== null && samePose(pose, swimmer.lastPose)) return;
    swimmer.redrawAcc += dt;
    if (swimmer.lastPose !== null && this.game.loop.actualFps < LOW_FPS && swimmer.redrawAcc < LOW_FPS_REDRAW_S) {
      return;
    }
    swimmer.redrawAcc = 0;
    swimmer.texture.redraw(pose, swimmer.palette);
    swimmer.lastPose = pose;
  }

  /**
   * Records this frame's pose for an axolotl after the first and its repaint budget wait in `slot`.
   * A first paint, or any pose change under reduced motion, paints at once so the morph colours and
   * still pose show now (PRD C8).
   */
  private askRescuedRepaint(swimmer: TankSwimmer, slot: number, pose: AxolotlPose, dt: number): void {
    swimmer.wanted = pose;
    this.rescuedWaits[slot] = NO_REPAINT;
    if (swimmer.lastPose !== null && samePose(pose, swimmer.lastPose)) return;
    swimmer.redrawAcc += dt;
    if (swimmer.lastPose === null || !this.motion.ambient) {
      this.paintRescued(swimmer, pose);
      return;
    }
    this.rescuedWaits[slot] = swimmer.redrawAcc;
  }

  /** Repaints at most one axolotl after the first this frame, the one the shared repaint budget picks. */
  private repaintRescuedSwimmers(): void {
    this.rescuedWaits.length = Math.max(0, this.swimmers.length - 1);
    const slot = pickSecondaryRepaint(this.rescuedWaits);
    if (slot < 0) return;
    const swimmer = this.swimmers[slot + 1];
    if (swimmer.wanted) this.paintRescued(swimmer, swimmer.wanted);
  }

  /** Paints an axolotl after the first in its morph's colours, as redrawSwimmer does. */
  private paintRescued(swimmer: TankSwimmer, pose: AxolotlPose): void {
    swimmer.redrawAcc = 0;
    swimmer.texture.redraw(pose, swimmer.palette);
    swimmer.lastPose = pose;
  }

  /** The surface line across the glass at the tank water top, with the canal wave (still under reduced motion). */
  private renderSurface(t: number): void {
    const { x0, x1 } = TANK.glass;
    const steps = Math.max(1, Math.ceil((x1 - x0) / SURFACE_STEP));
    const graphics = this.surface;
    graphics.clear();
    graphics.lineStyle(SURFACE_LINE_WIDTH * this.frame.scale, this.surfaceLine.color, this.surfaceLine.alpha);
    graphics.beginPath();
    for (let step = 0; step <= steps; step++) {
      const x = Math.min(x0 + step * SURFACE_STEP, x1);
      const at = tankToCss(this.frame, { x, y: TANK.waterTop + waveY(x, t) - SURF });
      if (step === 0) {
        graphics.moveTo(at.x, at.y);
      } else {
        graphics.lineTo(at.x, at.y);
      }
    }
    graphics.strokePath();
  }
}
