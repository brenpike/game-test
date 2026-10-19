import * as Phaser from 'phaser';
import { AXO_MAX_TAIL_AMP, AXO_SCENE_SCALE, type AxolotlPose } from '../art/drawAxolotl';
import { DEPTH } from '../art/layers';
import {
  HAZE,
  MORPH_PALETTES,
  SURFACE_LINE,
  SURFACE_LINE_WIDTH,
  T_STATIC,
  WATER_SHALLOW,
  type MorphPalette,
} from '../art/palette';
import { BUBBLE_RADII, type TexInfo } from '../art/textures';
import { BUBBLE_MAX_ALIVE, bubblePos, createBubbles, updateBubbles, type BubbleSystem } from '../logic/bubbles';
import {
  DEFAULT_COLLECT_RADIUS,
  allCollected,
  collectNear,
  countCollected,
  type Collectible,
} from '../logic/collectibles';
import { createEncounterContext } from '../logic/encounter';
import { currentAt, reedDragAt, reedsNear } from '../logic/environment';
import { TILAPIA_FACT } from '../logic/factCards';
import {
  GAME_EVENTS,
  REGISTRY_KEYS,
  type AllCollectedPayload,
  type CollectedPayload,
  type DashStatePayload,
  type ReducedMotionPayload,
  type SteerPayload,
} from '../logic/gameEvents';
import { legSwimTuning, legWobble } from '../logic/legs';
import { motionProfile, type MotionProfile } from '../logic/motion';
import { mulberry32 } from '../logic/rng';
import { pickStranding } from '../logic/rescue';
import { explorerMorph, restoreSnacks, tripStart } from '../logic/session';
import { steerFromKeys, type KeyState } from '../logic/steering';
import { startDashVelocity, stepSwim, swimIntensity, type SwimBounds, type SwimState } from '../logic/swimPhysics';
import { createDash, dashCharge, tryStartDash, updateDash, type DashState } from '../logic/tailDash';
import {
  createTrip,
  createTripContext,
  goHome,
  keepExploring,
  markTilapiaCardSeen,
  sameTripSnapshot,
  stepTrip,
  tripAxolotlPos,
  tripSnapshot,
  type TripContext,
  type TripEvent,
  type TripInput,
  type TripState,
} from '../logic/trip';
import { TRIP_EVENTS, TRIP_REGISTRY_KEYS, type TripSnapshot } from '../logic/tripEvents';
import { LEGS, SWIM } from '../logic/tuning';
import { len, type Vec2 } from '../logic/vec';
import { SURF, WORLD_H, ZONE_W, swimBounds, waveY, type CurrentZone } from '../logic/zone';
import {
  SCENE_KEYS,
  blinkAt,
  cssColor,
  fitWorldCamera,
  readSceneView,
  samePose,
  type GameAssets,
  type SceneView,
} from './BootScene';
import { HomeSpotView } from './HomeSpotView';
import { HUD_EVENTS, type FactCardSeenPayload } from './HudScene';
import { addMotionTween, settleMotionTweens } from './motionTweens';
import { PredatorView } from './PredatorView';
import { readSession, returnToHomeTank } from './sceneFlow';
import { StrandedView } from './StrandedView';
import { TreasureView } from './TreasureView';

const TAU = Math.PI * 2;
const SIM_SEED = 0xb0bb1e;
const IDLE_PADDLE = 0.3;
const DASH_PADDLE = 2;
const SWIM_TAIL_BOOST = 0.2;
const MAX_TILT = 0.35;
const IDLE_TILT = 0.12;
const BOB_SHARE = 0.3;
const TURN_SQUASH = 0.6;
const TURN_MS = 140;
const SPARKLE_FADE_S = 0.4;
const SPARKLE_SPAWN_S = 0.05;
const SPARKLE_LIFE_S = 0.4;
const SPARKLE_POOL = 10;
const SPARKLE_TAIL_X = 44;
const MOUTH_X = 49;
const MOUTH_Y = 4;
const REED_PERIOD = 4;
const REED_TOUCH_RADIUS = 26;
const REED_NUDGE_PX = 7;
const REED_NUDGE_RATE = 6;
const SNACK_BOB_PX = 2.5;
const SNACK_BOB_PERIOD = 2.4;
const SNACK_POP_MS = 200;
const STREAKS_PER_CURRENT = 6;
const STREAK_EDGE_FADE = 40;
const SURFACE_STEP = 8;
const SURFACE_BAND_BOTTOM = SURF + 3;
const LOW_FPS = 45;
const LOW_FPS_REDRAW_S = 1 / 30;

interface SteerKeys {
  left: Phaser.Input.Keyboard.Key[];
  right: Phaser.Input.Keyboard.Key[];
  up: Phaser.Input.Keyboard.Key[];
  down: Phaser.Input.Keyboard.Key[];
}

interface Streak {
  image: Phaser.GameObjects.Image;
  zone: CurrentZone;
  x: number;
  y: number;
}

interface Sparkle {
  image: Phaser.GameObjects.Image;
  age: number;
}

function anyKeyDown(keys: readonly Phaser.Input.Keyboard.Key[]): boolean {
  return keys.some((key) => key.isDown);
}

function wrapInto(value: number, min: number, max: number): number {
  const span = max - min;
  if (span <= 0) return min;
  return min + ((((value - min) % span) + span) % span);
}

function placeBaked(image: Phaser.GameObjects.Image, info: TexInfo): Phaser.GameObjects.Image {
  return image.setOrigin(info.originNormX, info.originNormY).setScale(1 / info.scale);
}

/**
 * The canal zone: swimming, snacks, currents, reeds, bubbles, Tail Dash, the tilapia, the Home
 * Spot, the hidden treasures (hint stars, Dash pots, the cave and the past-the-current marker) and
 * the stranded axolotl.
 * One scene start is one trip: it starts from the session and, once the trip ends, hands the trip
 * back to the session and opens the Home Tank.
 */
export class SwimScene extends Phaser.Scene {
  private assets!: GameAssets;
  private motion!: MotionProfile;
  private view!: SceneView;
  private bounds!: SwimBounds;
  private rand: () => number = Math.random;
  private clock = 0;

  private swim!: SwimState;
  private dash!: DashState;
  private items: Collectible[] = [];
  private bubbles!: BubbleSystem;
  private allDone = false;
  private trip!: TripState;
  private tripCtx!: TripContext;
  private snapshot!: TripSnapshot;
  /** Whether the ended trip has been handed back and the Home Tank asked for; once per trip. */
  private leaving = false;

  private padSteer: Vec2 = { x: 0, y: 0 };
  private lastSteer: Vec2 = { x: 0, y: 0 };
  private keys: SteerKeys = { left: [], right: [], up: [], down: [] };
  private dashKeys: Phaser.Input.Keyboard.Key[] = [];
  private dashKeyLatched = false;
  private dashingThisFrame = false;

  private followPoint = new Phaser.Math.Vector2();
  private axolotl!: Phaser.GameObjects.Image;
  private predatorView!: PredatorView;
  private homeSpotView!: HomeSpotView;
  private treasureView!: TreasureView;
  private strandedView!: StrandedView;
  /** The explorer's morph colours, fixed for the trip. */
  private explorerPalette!: MorphPalette;
  private reeds: Phaser.GameObjects.Image[] = [];
  private reedNudge: number[] = [];
  private pads: Phaser.GameObjects.Image[] = [];
  private snacks = new Map<string, Phaser.GameObjects.Image>();
  private streaks: Streak[] = [];
  private bubbleImages: Phaser.GameObjects.Image[] = [];
  private sparkles: Sparkle[] = [];
  private sparkleCursor = 0;
  private sparkleAcc = 0;
  private surface!: Phaser.GameObjects.Graphics;
  private surfaceFill = { color: 0, alpha: 1 };
  private surfaceLine = { color: 0, alpha: 1 };

  private swimPhase = 0;
  private gillPhase = 0;
  private sparkleLevel = 0;
  private turn = { squash: 1 };
  private lastFacing: 1 | -1 = 1;
  private lastPose: AxolotlPose | null = null;
  private redrawAcc = 0;

  constructor() {
    super(SCENE_KEYS.swim);
  }

  init(data: GameAssets): void {
    this.assets = data;
    this.clock = 0;
    this.allDone = false;
    this.leaving = false;
    this.dashKeyLatched = false;
    this.dashingThisFrame = false;
    this.padSteer = { x: 0, y: 0 };
    this.lastSteer = { x: 0, y: 0 };
    this.keys = { left: [], right: [], up: [], down: [] };
    this.dashKeys = [];
    this.snacks = new Map();
    this.sparkleCursor = 0;
    this.sparkleAcc = 0;
    this.sparkleLevel = 0;
    this.redrawAcc = 0;
    this.lastPose = null;
    this.turn = { squash: 1 };
    this.swimPhase = (TAU * T_STATIC) / 1.2;
    this.gillPhase = (TAU * T_STATIC) / 0.8;
  }

  create(): void {
    const zone = this.assets.zone;
    this.view = readSceneView(this.scale);
    this.motion = motionProfile(this.registry.get(REGISTRY_KEYS.reducedMotion) === true);
    this.bounds = swimBounds();
    this.rand = mulberry32(SIM_SEED);
    this.swim = { x: zone.start.x, y: zone.start.y, vx: 0, vy: 0, facing: 1 };
    this.lastFacing = this.swim.facing;
    this.dash = createDash();
    this.bubbles = createBubbles();
    // INVARIANT: trip seeds are never saved. The first trip of the session is random; later
    // trips use nextTripSeed of the last trip's seed (tripStart).
    const session = readSession(this.registry);
    const start = tripStart(session, Math.floor(Math.random() * 0x100000000) >>> 0);
    this.explorerPalette = MORPH_PALETTES[explorerMorph(session)];
    this.items = restoreSnacks(zone.collectibles, start.eatenSnacks);
    this.allDone = allCollected(this.items);
    const stranding = pickStranding(start.ownedMorphs, start.waitingStranded, zone.strandingPlaces, start.tripSeed);
    this.trip = createTrip(zone, LEGS, start.banked, start.tripSeed, {
      stranding,
      tilapiaCardSeen: start.tilapiaCardSeen,
    });
    this.dashKeyLatched = true;
    this.tripCtx = createTripContext({ encounter: createEncounterContext({ bounds: this.bounds }) });
    this.registry.set(REGISTRY_KEYS.total, this.items.length);
    this.registry.set(REGISTRY_KEYS.collected, countCollected(this.items));

    this.buildWorld();
    this.setupCamera();
    this.setupInput();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.on(GAME_EVENTS.REQUEST_DASH, this.handleRequestDash, this);
    this.game.events.on(GAME_EVENTS.STEER, this.handleSteer, this);
    this.game.events.on(GAME_EVENTS.REDUCED_MOTION, this.handleReducedMotion, this);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.handleHidden, this);
    this.game.events.on(TRIP_EVENTS.REQUEST_KEEP_EXPLORING, this.handleRequestKeepExploring, this);
    this.game.events.on(TRIP_EVENTS.REQUEST_GO_HOME, this.handleRequestGoHome, this);
    this.game.events.on(HUD_EVENTS.FACT_CARD_SEEN, this.handleFactCardSeen, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.handleResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);

    this.publishSnapshot(tripSnapshot(this.trip));
    this.renderFrame(0);
    this.scene.launch(SCENE_KEYS.hud, this.assets);
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(Math.max(deltaMs / 1000, 0), SWIM.dtMax);
    this.clock += dt;
    this.releaseDashLatch();
    if (this.trip.phase === 'swimming') {
      this.stepPlay(dt);
    }
    this.advanceTrip(dt);
    this.followPoint.set(this.swim.x, this.swim.y);
    this.renderFrame(dt);
  }

  private stepPlay(dt: number): void {
    const steer = this.computeSteer();
    this.lastSteer = steer;

    const zone = this.assets.zone;
    const pos = { x: this.swim.x, y: this.swim.y };
    this.dashingThisFrame = this.dash.phase === 'dashing';
    this.swim = stepSwim(
      this.swim,
      steer,
      {
        current: currentAt(pos, zone.currents),
        dragMul: reedDragAt(pos, zone.reedPatches),
        bounds: this.bounds,
        dashing: this.dashingThisFrame,
      },
      dt,
      legSwimTuning(this.snapshot.legs.present),
    );
    const previousPhase = this.dash.phase;
    this.dash = updateDash(this.dash, dt);
    if (this.dash.phase !== previousPhase || this.dash.phase === 'cooldown') {
      this.emitDashState();
    }
    this.collectSnacks();
  }

  // ---- setup ---------------------------------------------------------------

  private buildWorld(): void {
    const { zone, baked } = this.assets;
    baked.bg.forEach((info, i) => {
      this.add.image(i * info.w, 0, info.key).setOrigin(0, 0).setScale(1 / info.scale).setDepth(DEPTH.bg);
    });
    this.reeds = zone.reeds.map((reed, i) =>
      placeBaked(this.add.image(reed.bx, reed.by, baked.reeds[i].key), baked.reeds[i]).setDepth(DEPTH.reeds),
    );
    this.reedNudge = zone.reeds.map(() => 0);

    const haze = cssColor(HAZE);
    this.add
      .rectangle(0, SURF, ZONE_W, WORLD_H - SURF, haze.color, haze.alpha)
      .setOrigin(0, 0)
      .setDepth(DEPTH.haze);
    this.streaks = zone.currents.flatMap((current) => this.buildStreaks(current));

    this.homeSpotView = new HomeSpotView(this, this.assets, this.trip.homeSpot);
    this.treasureView = new TreasureView(this, this.assets, zone, this.trip.placed);

    this.snacks.clear();
    for (const item of this.items) {
      if (item.collected) continue;
      const info = item.kind === 'worm' ? baked.worm : baked.bug;
      this.snacks.set(
        item.id,
        placeBaked(this.add.image(item.x, item.y, info.key), info).setDepth(DEPTH.collectibles),
      );
    }

    const axoInfo = this.assets.axolotl.info;
    this.axolotl = this.add
      .image(this.swim.x, this.swim.y, this.assets.axolotl.key)
      .setOrigin(axoInfo.originNormX, axoInfo.originNormY)
      .setDepth(DEPTH.axolotl);
    this.strandedView = new StrandedView(this, this.assets);
    this.predatorView = new PredatorView(this, this.assets, this.trip.encounter.tilapias.length);

    this.bubbleImages = Array.from({ length: BUBBLE_MAX_ALIVE }, () =>
      this.add.image(0, 0, baked.bubbles[0].key).setVisible(false).setDepth(DEPTH.bubbles),
    );
    this.surface = this.add.graphics().setDepth(DEPTH.surface);
    this.surfaceFill = cssColor(WATER_SHALLOW);
    this.surfaceLine = cssColor(SURFACE_LINE);
    this.pads = zone.pads.map((pad, i) =>
      placeBaked(this.add.image(pad.x, SURF, baked.pads[i].key), baked.pads[i]).setDepth(DEPTH.pads),
    );
    this.sparkles = Array.from({ length: SPARKLE_POOL }, () => ({
      image: placeBaked(this.add.image(0, 0, baked.sparkle.key), baked.sparkle)
        .setVisible(false)
        .setDepth(DEPTH.fx),
      age: SPARKLE_LIFE_S,
    }));
  }

  private buildStreaks(current: CurrentZone): Streak[] {
    const info = this.assets.baked.streak;
    const angle = Math.atan2(current.force.y, current.force.x);
    return Array.from({ length: STREAKS_PER_CURRENT }, (): Streak => {
      const x = current.x0 + this.rand() * (current.x1 - current.x0);
      const y = current.y0 + this.rand() * (current.y1 - current.y0);
      const image = placeBaked(this.add.image(x, y, info.key), info).setRotation(angle).setDepth(DEPTH.haze);
      return { image, zone: current, x, y };
    });
  }

  private setupCamera(): void {
    const camera = this.cameras.main;
    fitWorldCamera(camera, this.view.fit, ZONE_W, WORLD_H);
    this.followPoint.set(this.swim.x, this.swim.y);
    camera.startFollow(this.followPoint, false, this.motion.cameraLerp, this.motion.cameraLerp);
    camera.centerOn(this.swim.x, this.swim.y);
  }

  private setupInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    const codes = Phaser.Input.Keyboard.KeyCodes;
    const keysFor = (...keyCodes: number[]): Phaser.Input.Keyboard.Key[] =>
      keyCodes.map((code) => keyboard.addKey(code));
    this.keys = {
      left: keysFor(codes.LEFT, codes.A),
      right: keysFor(codes.RIGHT, codes.D),
      up: keysFor(codes.UP, codes.W),
      down: keysFor(codes.DOWN, codes.S),
    };
    this.dashKeys = [keyboard.addKey(codes.SPACE, false), keyboard.addKey(codes.SHIFT, false)];
    keyboard.on('keydown-SPACE', this.handleDashKey, this);
    keyboard.on('keydown-SHIFT', this.handleDashKey, this);
  }

  // ---- input ---------------------------------------------------------------

  private readKeys(): KeyState {
    return {
      left: anyKeyDown(this.keys.left),
      right: anyKeyDown(this.keys.right),
      up: anyKeyDown(this.keys.up),
      down: anyKeyDown(this.keys.down),
    };
  }

  private computeSteer(): Vec2 {
    const keySteer = steerFromKeys(this.readKeys());
    return len(keySteer) > 0 ? keySteer : this.padSteer;
  }

  private handleSteer(payload: SteerPayload): void {
    this.padSteer = { x: payload.x, y: payload.y };
  }

  private handleDashKey(event: KeyboardEvent): void {
    if (event.repeat || this.dashKeyLatched) return;
    this.requestDash();
  }

  /** A dash key held from the Home Tank or from confirming a HUD card must be released before it dashes. */
  private releaseDashLatch(): void {
    if (this.dashKeyLatched && !anyKeyDown(this.dashKeys)) {
      this.dashKeyLatched = false;
    }
  }

  private handleRequestDash(): void {
    if (!this.sys.isActive()) return;
    this.requestDash();
  }

  private requestDash(): void {
    if (this.trip.phase !== 'swimming') return;
    const attempt = tryStartDash(this.dash);
    if (!attempt.started) return;
    this.dash = attempt.state;
    const velocity = { x: this.swim.vx, y: this.swim.vy };
    const direction = len(this.lastSteer) > 0 ? this.lastSteer : velocity;
    this.swim = startDashVelocity(this.swim, direction);
    this.emitDashState();
  }

  private emitDashState(): void {
    const payload: DashStatePayload = { phase: this.dash.phase, charge: dashCharge(this.dash) };
    this.game.events.emit(GAME_EVENTS.DASH_STATE, payload);
  }

  // ---- game events ---------------------------------------------------------

  private collectSnacks(): void {
    const before = countCollected(this.items);
    const result = collectNear(this.items, { x: this.swim.x, y: this.swim.y }, DEFAULT_COLLECT_RADIUS);
    if (result.items === this.items) return;
    this.items = result.items;
    const total = this.items.length;
    this.registry.set(REGISTRY_KEYS.collected, countCollected(this.items));
    result.newly.forEach((item, i) => {
      this.popSnack(item.id);
      const payload: CollectedPayload = { id: item.id, collected: before + i + 1, total };
      this.game.events.emit(GAME_EVENTS.COLLECTED, payload);
    });
    if (!this.allDone && allCollected(this.items)) {
      this.allDone = true;
      const payload: AllCollectedPayload = { total };
      this.game.events.emit(GAME_EVENTS.ALL_COLLECTED, payload);
    }
  }

  private popSnack(id: string): void {
    const sprite = this.snacks.get(id);
    if (!sprite) {
      throw new Error(`SwimScene: no sprite for collectible "${id}"`);
    }
    this.snacks.delete(id);
    if (!this.motion.ambient) {
      sprite.destroy();
      return;
    }
    addMotionTween(this, {
      targets: sprite,
      props: { scaleX: sprite.scaleX * 1.4, scaleY: sprite.scaleY * 1.4, alpha: 0 },
      duration: SNACK_POP_MS,
      ease: 'Sine.easeOut',
      onComplete: () => sprite.destroy(),
    });
  }

  /**
   * Steps the trip. Swimming: a bump sets the swim velocity, and a Tail Dash active this step can
   * break Dash pots. Banked, carrying or ended: the trip places the axolotl, still. The carry
   * advances only with this frame `dt`, so pause freezes it.
   */
  private advanceTrip(dt: number): void {
    const input: TripInput = {
      axolotlPos: { x: this.swim.x, y: this.swim.y },
      reduced: !this.motion.ambient,
      dashing: this.trip.phase === 'swimming' && this.dashingThisFrame,
    };
    const result = stepTrip(this.trip, input, dt, this.tripCtx);
    this.trip = result.state;
    if (this.trip.phase === 'swimming') {
      if (result.impulse) {
        this.swim = { ...this.swim, vx: result.impulse.x, vy: result.impulse.y };
      }
    } else {
      this.placeCarried();
    }
    this.dispatchTripEvents(result.events);
    this.syncSnapshot();
  }

  private dispatchTripEvents(events: readonly TripEvent[]): void {
    this.handleTripEvents(events);
    this.predatorView.handleEvents(events);
    this.homeSpotView.handleEvents(events);
    this.treasureView.handleEvents(events);
  }

  /** Puts the axolotl where the trip holds it while banked, carried or ended, with no velocity. */
  private placeCarried(): void {
    const pos = tripAxolotlPos(this.trip);
    if (!pos) {
      throw new Error(`SwimScene: no axolotl position for trip phase "${this.trip.phase}"`);
    }
    this.swim = { ...this.swim, x: pos.x, y: pos.y, vx: 0, vy: 0 };
  }

  /** Clears pad steering when the carry starts; a still (reduced-motion) arrival snaps the camera home. */
  private handleTripEvents(events: readonly TripEvent[]): void {
    for (const event of events) {
      if (event.type === 'carryStart') {
        this.padSteer = { x: 0, y: 0 };
      }
      if (event.type === 'arrivedHome' && event.still) {
        this.followPoint.set(this.trip.home.x, this.trip.home.y);
        this.cameras.main.centerOn(this.trip.home.x, this.trip.home.y);
      }
    }
  }

  private syncSnapshot(): void {
    const snapshot = tripSnapshot(this.trip);
    if (sameTripSnapshot(snapshot, this.snapshot)) return;
    this.publishSnapshot(snapshot);
  }

  /** Publishes the trip snapshot to the HUD; an ended trip (Go home or the end of the carry) leaves for the Home Tank. */
  private publishSnapshot(snapshot: TripSnapshot): void {
    this.snapshot = snapshot;
    this.registry.set(TRIP_REGISTRY_KEYS.state, snapshot);
    this.game.events.emit(TRIP_EVENTS.STATE, snapshot);
    if (snapshot.phase === 'ended') this.leaveForHomeTank();
  }

  /** Hands the ended trip and its snacks back to the session and opens the Home Tank, once per trip. */
  private leaveForHomeTank(): void {
    if (this.leaving) return;
    this.leaving = true;
    returnToHomeTank(this, this.assets, this.trip, this.items);
  }

  /**
   * Leaves the banked card and swims on from where the axolotl was held. A dash key held from
   * confirming the card must be released before it dashes. Ignored in any other phase.
   */
  private handleRequestKeepExploring(): void {
    const next = keepExploring(this.trip);
    if (next === this.trip) return;
    this.trip = next;
    this.dashKeyLatched = true;
    this.padSteer = { x: 0, y: 0 };
    this.publishSnapshot(tripSnapshot(this.trip));
  }

  /** Ends the trip by choice (from the banked card, or swimming inside the ring). Ignored when not allowed. */
  private handleRequestGoHome(): void {
    const result = goHome(this.trip);
    if (result.state === this.trip) return;
    this.trip = result.state;
    this.padSteer = { x: 0, y: 0 };
    this.placeCarried();
    this.dispatchTripEvents(result.events);
    this.publishSnapshot(tripSnapshot(this.trip));
  }

  /** The player closed the tilapia fact card: it is no longer due this trip. */
  private handleFactCardSeen(payload: FactCardSeenPayload): void {
    if (payload.id !== TILAPIA_FACT.id) return;
    this.trip = markTilapiaCardSeen(this.trip);
  }

  private handleHidden(): void {
    if (this.trip.phase === 'ended') return;
    this.game.events.emit(GAME_EVENTS.REQUEST_PAUSE);
  }

  private handleResume(): void {
    this.padSteer = { x: 0, y: 0 };
  }

  private handleReducedMotion(payload: ReducedMotionPayload): void {
    this.motion = motionProfile(payload.reduced);
    this.cameras.main.setLerp(this.motion.cameraLerp, this.motion.cameraLerp);
    if (!this.motion.turnTween) {
      this.tweens.killTweensOf(this.turn);
      this.turn.squash = 1;
    }
    if (!this.motion.ambient) {
      this.streaks.forEach((streak) => streak.image.setAlpha(1));
      settleMotionTweens(this);
    }
  }

  private handleResize(): void {
    this.view = readSceneView(this.scale);
    const camera = this.cameras.main;
    camera.setSize(this.scale.width, this.scale.height);
    fitWorldCamera(camera, this.view.fit, ZONE_W, WORLD_H);
  }

  private handleShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.off(GAME_EVENTS.REQUEST_DASH, this.handleRequestDash, this);
    this.game.events.off(GAME_EVENTS.STEER, this.handleSteer, this);
    this.game.events.off(GAME_EVENTS.REDUCED_MOTION, this.handleReducedMotion, this);
    this.game.events.off(Phaser.Core.Events.HIDDEN, this.handleHidden, this);
    this.game.events.off(TRIP_EVENTS.REQUEST_KEEP_EXPLORING, this.handleRequestKeepExploring, this);
    this.game.events.off(TRIP_EVENTS.REQUEST_GO_HOME, this.handleRequestGoHome, this);
    this.game.events.off(HUD_EVENTS.FACT_CARD_SEEN, this.handleFactCardSeen, this);
    this.events.off(Phaser.Scenes.Events.RESUME, this.handleResume, this);
    this.strandedView.destroy();
  }

  // ---- rendering -----------------------------------------------------------

  private renderFrame(dt: number): void {
    const t = this.motion.ambient ? this.clock : T_STATIC;
    this.renderAxolotl(dt);
    this.strandedView.render({ trip: this.trip, motion: this.motion, dt, time: this.clock });
    this.homeSpotView.render({ motion: this.motion, dt, time: this.clock });
    this.treasureView.render({
      placed: this.trip.placed,
      holdings: this.trip.holdings,
      axolotl: { x: this.swim.x, y: this.swim.y },
      motion: this.motion,
      dt,
      time: this.clock,
    });
    this.predatorView.render({
      encounter: this.trip.encounter,
      axolotl: this.axolotl,
      motion: this.motion,
      dt,
      phase: this.trip.phase,
    });
    this.renderReeds(dt, t);
    this.renderSnacks(t);
    this.renderStreaks(dt);
    this.renderBubbles(dt);
    this.renderSparkles(dt);
    this.renderSurface(t);
    this.renderPads(t);
  }

  private renderAxolotl(dt: number): void {
    const intensity = swimIntensity(this.swim);
    const dashing = this.isDashing();
    const facing = this.swim.facing;
    const t = this.motion.ambient ? this.clock : T_STATIC;

    if (this.motion.ambient) {
      const paddle = (IDLE_PADDLE + (1 - IDLE_PADDLE) * intensity) * (dashing ? DASH_PADDLE : 1);
      this.swimPhase = (this.swimPhase + dt * (TAU / 1.2) * paddle) % TAU;
    }
    if (this.motion.gillFlutter) {
      this.gillPhase = (this.gillPhase + dt * (TAU / 0.8)) % TAU;
    }
    this.sparkleLevel =
      dashing && this.motion.dashTrail ? 1 : Math.max(0, this.sparkleLevel - dt / SPARKLE_FADE_S);

    if (facing !== this.lastFacing) {
      this.lastFacing = facing;
      this.startTurnSquash();
    }

    const pose: AxolotlPose = {
      swimPhase: this.swimPhase,
      gillPhase: this.gillPhase,
      blink: this.motion.ambient ? blinkAt(this.clock) : 1,
      tailAmp: dashing ? AXO_MAX_TAIL_AMP : 1 + (this.motion.ambient ? SWIM_TAIL_BOOST * intensity : 0),
      sparkle: this.sparkleLevel,
      legs: this.snapshot.legs.slots,
    };
    this.redrawAxolotl(pose, dt);

    const baseScale = AXO_SCENE_SCALE / this.assets.axolotl.scale;
    const bob = this.motion.bob * BOB_SHARE * (1 - intensity) * Math.sin((TAU * t) / 3);
    const swimTilt = Phaser.Math.Clamp(this.swim.vy / SWIM.maxSpeed, -1, 1) * MAX_TILT;
    const idleTilt = this.motion.ambient ? IDLE_TILT * (1 - intensity) * Math.cos((TAU * t) / 3) : 0;
    const wobble =
      this.trip.phase === 'swimming' ? legWobble(this.snapshot.legs.present, this.clock, !this.motion.ambient) : 0;
    this.axolotl
      .setPosition(this.swim.x, this.swim.y + bob)
      .setFlipX(facing < 0)
      .setScale(baseScale * this.turn.squash, baseScale)
      .setRotation(facing * (swimTilt + idleTilt) + wobble);
  }

  /** Dashing look and trail, only while swimming: a frozen dash shows nothing once the carry starts. */
  private isDashing(): boolean {
    return this.trip.phase === 'swimming' && this.dash.phase === 'dashing';
  }

  private startTurnSquash(): void {
    if (!this.motion.turnTween) return;
    this.tweens.killTweensOf(this.turn);
    this.turn.squash = TURN_SQUASH;
    addMotionTween(this, { targets: this.turn, props: { squash: 1 }, duration: TURN_MS, ease: 'Sine.easeOut' });
  }

  private redrawAxolotl(pose: AxolotlPose, dt: number): void {
    if (this.lastPose !== null && samePose(pose, this.lastPose)) return;
    this.redrawAcc += dt;
    if (this.lastPose !== null && this.game.loop.actualFps < LOW_FPS && this.redrawAcc < LOW_FPS_REDRAW_S) {
      return;
    }
    this.redrawAcc = 0;
    this.assets.axolotl.redraw(pose, this.explorerPalette);
    this.lastPose = pose;
  }

  private renderReeds(dt: number, t: number): void {
    const zone = this.assets.zone;
    const sway = this.motion.reedSway;
    const near = sway ? new Set(reedsNear(this.swim, zone.reeds, REED_TOUCH_RADIUS)) : null;
    zone.reeds.forEach((reed, i) => {
      const push = near?.has(reed.id) ? Math.sign(reed.bx - this.swim.x) || 1 : 0;
      this.reedNudge[i] += (push - this.reedNudge[i]) * Math.min(1, dt * REED_NUDGE_RATE);
      const swayPx = sway ? reed.amp * Math.sin((TAU * t) / REED_PERIOD + reed.phase) : 0;
      const nudgePx = sway ? this.reedNudge[i] * REED_NUDGE_PX : 0;
      this.reeds[i].setRotation((swayPx + nudgePx) / (reed.by - reed.tipY));
    });
  }

  private renderSnacks(t: number): void {
    this.items.forEach((item, i) => {
      const sprite = this.snacks.get(item.id);
      if (!sprite) return;
      const bob = this.motion.collectBob ? SNACK_BOB_PX * Math.sin((TAU * t) / SNACK_BOB_PERIOD + i) : 0;
      sprite.y = item.y + bob;
    });
  }

  private renderStreaks(dt: number): void {
    for (const streak of this.streaks) {
      const { zone } = streak;
      if (this.motion.ambient) {
        streak.x = wrapInto(streak.x + zone.force.x * dt, zone.x0, zone.x1);
        streak.y = wrapInto(streak.y + zone.force.y * dt, zone.y0, zone.y1);
        const edge = Math.min(streak.x - zone.x0, zone.x1 - streak.x);
        streak.image.setAlpha(Phaser.Math.Clamp(edge / STREAK_EDGE_FADE, 0, 1));
      }
      streak.image.setPosition(streak.x, streak.y);
    }
  }

  private renderBubbles(dt: number): void {
    const emitter = this.motion.bubbles
      ? { x: this.axolotl.x + this.swim.facing * MOUTH_X, y: this.axolotl.y + MOUTH_Y }
      : null;
    this.bubbles = updateBubbles(this.bubbles, dt, emitter, this.rand);
    const baked = this.assets.baked.bubbles;
    this.bubbleImages.forEach((image, i) => {
      const bubble = this.bubbles.list[i];
      if (!bubble) {
        image.setVisible(false);
        return;
      }
      const view = bubblePos(bubble);
      const index = BUBBLE_RADII.findIndex((radius) => radius >= view.r);
      const textureIndex = index === -1 ? BUBBLE_RADII.length - 1 : index;
      const info = baked[textureIndex];
      placeBaked(image.setTexture(info.key), info)
        .setScale(view.r / BUBBLE_RADII[textureIndex] / info.scale)
        .setPosition(view.x, view.y)
        .setVisible(true);
    });
  }

  private renderSparkles(dt: number): void {
    const trailing = this.motion.dashTrail && this.isDashing();
    if (trailing) {
      this.sparkleAcc += dt;
      while (this.sparkleAcc >= SPARKLE_SPAWN_S) {
        this.sparkleAcc -= SPARKLE_SPAWN_S;
        this.spawnSparkle();
      }
    } else {
      this.sparkleAcc = 0;
    }
    const info = this.assets.baked.sparkle;
    for (const sparkle of this.sparkles) {
      sparkle.age += dt;
      const life = sparkle.age / SPARKLE_LIFE_S;
      if (life >= 1 || !this.motion.dashTrail) {
        sparkle.image.setVisible(false);
        continue;
      }
      sparkle.image.setAlpha(1 - life).setScale((0.9 - 0.5 * life) / info.scale);
    }
  }

  private spawnSparkle(): void {
    const sparkle = this.sparkles[this.sparkleCursor];
    this.sparkleCursor = (this.sparkleCursor + 1) % this.sparkles.length;
    sparkle.age = 0;
    sparkle.image
      .setPosition(
        this.axolotl.x - this.swim.facing * SPARKLE_TAIL_X + (this.rand() - 0.5) * 10,
        this.axolotl.y + (this.rand() - 0.5) * 14,
      )
      .setVisible(true);
  }

  private renderSurface(t: number): void {
    const view = this.cameras.main.worldView;
    const x0 = Math.max(0, Math.floor(view.x / SURFACE_STEP - 1) * SURFACE_STEP);
    const x1 = Math.min(ZONE_W, view.right + SURFACE_STEP);
    const steps = Math.max(1, Math.ceil((x1 - x0) / SURFACE_STEP));
    const xs = Array.from({ length: steps + 1 }, (_, k) => Math.min(x0 + k * SURFACE_STEP, x1));

    const fill = this.surfaceFill;
    const line = this.surfaceLine;
    const graphics = this.surface;
    graphics.clear();
    graphics.fillStyle(fill.color, fill.alpha);
    graphics.beginPath();
    graphics.moveTo(x0, SURFACE_BAND_BOTTOM);
    for (const x of xs) graphics.lineTo(x, waveY(x, t));
    graphics.lineTo(x1, SURFACE_BAND_BOTTOM);
    graphics.closePath();
    graphics.fillPath();

    graphics.lineStyle(SURFACE_LINE_WIDTH, line.color, line.alpha);
    graphics.beginPath();
    graphics.moveTo(xs[0], waveY(xs[0], t));
    for (const x of xs) graphics.lineTo(x, waveY(x, t));
    graphics.strokePath();
  }

  private renderPads(t: number): void {
    this.assets.zone.pads.forEach((pad, i) => {
      const slope = (waveY(pad.x + 3, t) - waveY(pad.x - 3, t)) / 6;
      this.pads[i].setPosition(pad.x, waveY(pad.x, t) - 1).setRotation(Math.atan(slope));
    });
  }
}
