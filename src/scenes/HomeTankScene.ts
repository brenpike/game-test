import * as Phaser from 'phaser';
import { AXO_SCENE_SCALE, type AxolotlPose } from '../art/drawAxolotl';
import { DEPTH } from '../art/layers';
import { HOME_TANK_WALL, SURFACE_LINE, SURFACE_LINE_WIDTH, T_STATIC, UI_PANEL } from '../art/palette';
import { createAxolotlTexture, type AxolotlTexture, type TexInfo } from '../art/textures';
import { GAME_EVENTS, REGISTRY_KEYS, type ReducedMotionPayload } from '../logic/gameEvents';
import type { Size } from '../logic/hudLayout';
import { motionProfile, type MotionProfile } from '../logic/motion';
import type { Session } from '../logic/session';
import { TANK, tankFrame, tankToCss, type TankFrame } from '../logic/tank';
import { tankSwimPose } from '../logic/tankSwim';
import { DECORATE_LABEL, GO_EXPLORING_LABEL, HOME_TANK_NAME, TREASURE_CHEST_LABEL } from '../logic/tankText';
import { UI, hubLayout, nextFocusIndex, tankKeyFor, type TankKey } from '../logic/tankUi';
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
import { settleMotionTweens } from './motionTweens';
import { goExploring, readSession, type HomeTankStart } from './sceneFlow';
import { TankArrivalCard } from './TankArrivalCard';

const TAU = Math.PI * 2;
const TITLE_PX = 34;
const SURFACE_STEP = 8;
const SECONDARY_SIZE = 0.8;
const GO_EXPLORING_INDEX = 0;
const CAPTURED_KEYS: readonly number[] = [
  Phaser.Input.Keyboard.KeyCodes.TAB,
  Phaser.Input.Keyboard.KeyCodes.LEFT,
  Phaser.Input.Keyboard.KeyCodes.RIGHT,
  Phaser.Input.Keyboard.KeyCodes.UP,
  Phaser.Input.Keyboard.KeyCodes.DOWN,
  Phaser.Input.Keyboard.KeyCodes.SPACE,
];

/**
 * Home Tank draw order (art guide 7f): back layer, Decorations, glass shine, axolotls, surface
 * line, tank outline and lid front, hub UI, then the tank arrival card on top.
 */
const TANK_DEPTH = Object.freeze({
  back: DEPTH.bg,
  decorations: DEPTH.reeds,
  glass: DEPTH.haze,
  axolotls: DEPTH.axolotl,
  surface: DEPTH.surface,
  front: DEPTH.fx,
  hub: DEPTH.ui,
  arrival: DEPTH.ui + 9,
});

/** What the Home Tank is showing and where keys go: the tank arrival card, or the hub. */
type TankMode = 'arrival' | 'hub';

/** A hub action id, matching the ids hubLayout() is tested with. */
type HubActionId = 'goExploring' | 'treasureChest' | 'decorate';

/** One hub action button. */
interface HubButton {
  id: HubActionId;
  button: UiButton;
}

/** One owned axolotl swimming in the tank, with its own texture and pose cache. */
interface TankSwimmer {
  id: string;
  texture: AxolotlTexture;
  image: Phaser.GameObjects.Image;
  lastPose: AxolotlPose | null;
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
 * (still poses under reduced motion), the animated surface line, and the hub actions Go exploring,
 * Treasure Chest and Decorate, by touch and by keyboard. After a trip the tank arrival card shows
 * first and takes every key and press until it closes.
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

  private titlePanel!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private hubButtons: HubButton[] = [];
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
  }

  create(): void {
    this.view = readSceneView(this.scale);
    this.motion = motionProfile(this.registry.get(REGISTRY_KEYS.reducedMotion) === true);
    this.session = readSession(this.registry);
    this.frame = tankFrame(this.view.cssW, this.view.cssH);
    useCssCamera(this.cameras.main, this.view.fit.dpr);
    this.cameras.main.setBackgroundColor(HOME_TANK_WALL);

    this.buildTank();
    this.buildSwimmers();
    this.buildHub();
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

  /** One swimmer per owned axolotl, each with its own texture so their poses never share a frame. */
  private buildSwimmers(): void {
    const bakeScale = this.assets.axolotl.scale;
    this.swimmers = this.session.hub.axolotls.map((axolotl): TankSwimmer => {
      const texture = createAxolotlTexture(this, `tank-axolotl-${axolotl.id}`, bakeScale);
      const image = this.add
        .image(0, 0, texture.key)
        .setOrigin(texture.info.originNormX, texture.info.originNormY)
        .setDepth(TANK_DEPTH.axolotls);
      return { id: axolotl.id, texture, image, lastPose: null };
    });
  }

  /** The hub actions in focus order (Go exploring first) and the Home Tank name panel. */
  private buildHub(): void {
    const dpr = this.view.fit.dpr;
    this.titlePanel = this.add.graphics().setDepth(TANK_DEPTH.hub);
    this.titleText = this.add.text(0, 0, HOME_TANK_NAME, uiTextStyle(TITLE_PX, dpr)).setDepth(TANK_DEPTH.hub);
    this.hubButtons = [
      this.addHubButton('goExploring', 'primary', 1, GO_EXPLORING_LABEL, 'play'),
      this.addHubButton('treasureChest', 'secondary', SECONDARY_SIZE, TREASURE_CHEST_LABEL, 'chest'),
      this.addHubButton('decorate', 'secondary', SECONDARY_SIZE, DECORATE_LABEL, 'decorate'),
    ];
  }

  private addHubButton(
    id: HubActionId,
    fill: 'primary' | 'secondary',
    size: number,
    label: string,
    icon: 'play' | 'chest' | 'decorate',
  ): HubButton {
    const button = createButton(this, this.assets.baked, {
      fill,
      shape: 'wide',
      size,
      label,
      icon,
      dpr: this.view.fit.dpr,
      pressOnDown: false,
      onPress: () => this.runHubAction(id),
    });
    button.container.setDepth(TANK_DEPTH.hub);
    return { id, button };
  }

  /** One keydown handler for every Home Tank key; Tab, the arrows and Space are captured while the scene runs. */
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
    this.mode = 'hub';
    this.focusIndex = GO_EXPLORING_INDEX;
    this.refreshHubFocus();
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
    }
  }

  /** Go exploring, once: starts the trip through the scene flow. */
  private startExploring(): void {
    if (this.exploring) return;
    this.exploring = true;
    goExploring(this, this.assets);
  }

  /** Opens the Treasure Chest. Wired in STEP-007. */
  private openChest(): void {}

  /** Starts decorating the Home Tank. Wired in STEP-007. */
  private startDecorating(): void {}

  // ---- input ---------------------------------------------------------------

  /** Routes a key to the arrival card while it shows, else to the hub. Unmapped keys are ignored. */
  private handleKeyDown(event: KeyboardEvent): void {
    const action = tankKeyFor(event.key, event.shiftKey);
    if (action === null) return;
    if (this.mode === 'arrival') {
      this.handleArrivalKey(action, event);
      return;
    }
    this.handleHubKey(action, event);
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

  /** Switches the motion profile. Running motion tweens end at once and still poses show now (C8). */
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
    this.arrivalCard.setResolution(dpr);
    this.layout();
    this.animate(0);
  }

  private handleShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.off(GAME_EVENTS.REDUCED_MOTION, this.handleReducedMotion, this);
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    keyboard.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.handleKeyDown, this);
    keyboard.removeCapture([...CAPTURED_KEYS]);
  }

  // ---- layout --------------------------------------------------------------

  /** Fits the tank to the canvas, then places the hub and the arrival card. */
  private layout(): void {
    this.frame = tankFrame(this.view.cssW, this.view.cssH);
    const tank = this.assets.tank;
    placeTankLayer(this.back, tank.back, this.frame);
    placeTankLayer(this.glass, tank.glass, this.frame);
    placeTankLayer(this.front, tank.front, this.frame);
    this.layoutHub();
    this.arrivalCard.layout(this.view);
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
    this.titlePanel.setVisible(title !== null);
    this.titleText.setVisible(title !== null);
    if (title === null) return;
    drawPanel(this.titlePanel, title.x, title.y, title.w, title.h, UI_PANEL);
    this.titleText.setPosition(title.x + UI.pad, title.y + UI.pad);
  }

  // ---- rendering -----------------------------------------------------------

  /** Advances the clock and draws the swimmers and the surface line. */
  private animate(dt: number): void {
    this.clock += dt;
    const t = this.motion.ambient ? this.clock : T_STATIC;
    this.swimmers.forEach((swimmer, index) => this.renderSwimmer(swimmer, index, t));
    this.renderSurface(t);
  }

  /** Places one axolotl from its tank pose (still under reduced motion) and repaints it when its pose changes. */
  private renderSwimmer(swimmer: TankSwimmer, index: number, t: number): void {
    const pose: AxolotlPose = {
      swimPhase: (TAU * t) / 1.2,
      gillPhase: this.motion.gillFlutter ? (TAU * t) / 0.8 : (TAU * T_STATIC) / 0.8,
      blink: this.motion.ambient ? blinkAt(t) : 1,
      tailAmp: 1,
      sparkle: 0,
    };
    if (swimmer.lastPose === null || !samePose(pose, swimmer.lastPose)) {
      swimmer.texture.redraw(pose);
      swimmer.lastPose = pose;
    }
    const swim = tankSwimPose(swimmer.id, index, this.clock, !this.motion.ambient);
    const at = tankToCss(this.frame, { x: swim.x, y: swim.y });
    swimmer.image
      .setPosition(at.x, at.y)
      .setFlipX(swim.facing < 0)
      .setScale((AXO_SCENE_SCALE * this.frame.scale) / swimmer.texture.scale)
      .setRotation(swim.tilt);
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
