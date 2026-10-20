import * as Phaser from 'phaser';
import type { AxolotlPose } from '../art/drawAxolotl';
import { dreamSheenAt } from '../art/drawDreamOverlay';
import { artOutfit, outfitKey, type ArtOutfit } from '../art/drawWearables';
import { DEPTH } from '../art/layers';
import {
  axolotlPalette,
  HOME_TANK_WALL,
  INK,
  LW,
  SURFACE_LINE,
  SURFACE_LINE_WIDTH,
  T_STATIC,
  UI_PANEL,
  WHITE,
  type MorphPalette,
} from '../art/palette';
import type { IconKind } from '../art/drawUi';
import { createAxolotlTexture, type AxolotlTexture, type TexInfo } from '../art/textures';
import { areaLabel } from '../logic/areaText';
import { areaById, type AreaData } from '../logic/areas';
import { ownedDreamColours } from '../logic/catalogue';
import { GAME_EVENTS, REGISTRY_KEYS, type ReducedMotionPayload } from '../logic/gameEvents';
import type { Rect, Size } from '../logic/hudLayout';
import { motionProfile, type MotionProfile } from '../logic/motion';
import { wornIds } from '../logic/outfit';
import { outfitPerks } from '../logic/perks';
import { NO_REPAINT, pickSecondaryRepaint } from '../logic/repaintBudget';
import { spriteFrameBounds } from '../logic/spriteAnchor';
import {
  bestStars,
  canRescueMore,
  chooseExplorer,
  restyleAxolotl,
  setDreamColour,
  setOutfit,
  setTankLayout,
  type OwnedAxolotl,
  type Session,
} from '../logic/session';
import { hubStarsBadgeRect } from '../logic/starsUi';
import { restyleStart, type RestyleOptions, type StylerWearer } from '../logic/styler';
import { TANK, tankFrame, tankToCss, type TankFrame, type TankLayout } from '../logic/tank';
import {
  axolotlFocusIndex,
  nameTagRect,
  stepTankFocus,
  tankFocusTarget,
  touchHitRect,
  type TankFocusTarget,
} from '../logic/tankPick';
import { tankSwimPose } from '../logic/tankSwim';
import { HOME_TANK_NAME } from '../logic/tankText';
import {
  HUB_BUTTONS,
  UI,
  hubButtonLook,
  hubLayout,
  tankKeyFor,
  type HubActionId,
  type HubButtonSpec,
  type TankKey,
} from '../logic/tankUi';
import type { TripEnding } from '../logic/tripEvents';
import { SURF, waveY } from '../logic/zone';
import { AxolotlStyler, type StyledAxolotl } from './AxolotlStyler';
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
import { AreaStarsBadge } from './AreaStarsBadge';
import { CollectionBookView } from './CollectionBookView';
import { ExplorerCard, type ExplorerCardAxolotl } from './ExplorerCard';
import { settleMotionTweens } from './motionTweens';
import { goExploring, readSession, writeSession, type HomeTankStart } from './sceneFlow';
import { faceSprite } from './spriteFacing';
import { TankArrivalCard, type ArrivalAreaStars } from './TankArrivalCard';
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
const NAME_TAG_PX = 18;
/** Double focus ring round a focused axolotl, as on the decorate footprints (art guide 7f, 8). */
const RING_RADIUS_PX = 18;
const RING_LINE_PX = 3;
const RING_INNER_PX = LW / 2 + 1.5;
const RING_OUTER_PX = LW / 2 + 4.5;

/** The icon on each hub action button. */
const HUB_ICONS: Readonly<Record<HubActionId, IconKind>> = Object.freeze({
  goExploring: 'play',
  decorate: 'decorate',
  treasureChest: 'chest',
  collectionBook: 'book',
});

/**
 * Home Tank draw order (art guide 7f): back layer (wall to gravel), placed Decorations, glass shine,
 * axolotls, surface line, tank outline and lid front, hub UI (with a focused axolotl's ring and name
 * tag) and the decorate toolbar, the Treasure Chest, the Collection Book, the explorer card or the
 * restyle screen (never open together), then the tank arrival card on top.
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
  restyle: DEPTH.ui + 8,
  explorer: DEPTH.ui + 8,
});

/**
 * What the Home Tank is showing and where keys go, in priority order: the tank arrival card, the
 * Treasure Chest, the Collection Book, decorate mode, restyling an axolotl (PRD F6), the explorer
 * card (PRD F7), or the hub.
 */
type TankMode = 'arrival' | 'chest' | 'book' | 'decorate' | 'restyle' | 'explorer' | 'hub';

/** Where a restyle was opened from, and so where Done or Cancel goes back to: the hub, or the explorer card's Change outfit. */
type RestyleFrom = 'hub' | 'explorer';

/** One hub action button. */
interface HubButton {
  id: HubActionId;
  button: UiButton;
}

/** One owned axolotl swimming in the tank, with its own texture, morph colours, pose cache and tap area. */
interface TankSwimmer {
  id: string;
  texture: AxolotlTexture;
  /** Its morph's colours, or its Dream colour's over its morph (axolotlPalette). */
  palette: MorphPalette;
  /** What it wears (artOutfit of its outfit) and that outfit's outfitKey. */
  outfit: ArtOutfit;
  outfitKey: string;
  /** The outfitKey last painted, or null before the first paint; a change repaints it. */
  paintedOutfitKey: string | null;
  image: Phaser.GameObjects.Image;
  lastPose: AxolotlPose | null;
  /** This frame's pose for an axolotl after the first, painted when the shared repaint budget picks it. */
  wanted?: AxolotlPose;
  /** Seconds since the last repaint, for the low frame rate repaint cap. */
  redrawAcc: number;
  /** Tap area in texture px, kept at least the touch target size (touchHitRect). */
  hitArea: Phaser.Geom.Rectangle;
  /** Whether a press began on this axolotl, so only a press and release on it picks it. */
  pressed: boolean;
}

/** The double focus ring (art guide 8) round `rect`: inner white, outer ink, both opaque. */
function strokeAxolotlRing(graphics: Phaser.GameObjects.Graphics, rect: Rect): void {
  for (const [outset, colour] of [
    [RING_INNER_PX, WHITE],
    [RING_OUTER_PX, INK],
  ] as const) {
    graphics.lineStyle(RING_LINE_PX, cssColor(colour).color, 1);
    graphics.strokeRoundedRect(
      rect.x - outset,
      rect.y - outset,
      rect.w + 2 * outset,
      rect.h + 2 * outset,
      RING_RADIUS_PX + outset,
    );
  }
}

/** Focus step for a hub key: next, right and down step forward; previous, left and up step back; else 0. */
function hubFocusStep(action: TankKey): number {
  if (action === 'next' || action === 'right' || action === 'down') return 1;
  if (action === 'previous' || action === 'left' || action === 'up') return -1;
  return 0;
}

/** The area of the zone with id `areaId`. Throws when there is no such area. */
function zoneArea(areaId: string): Readonly<AreaData> {
  const area = areaById(areaId);
  if (area === undefined) throw new Error(`HomeTankScene: no area ${areaId}`);
  return area;
}

/** The explorer card entry of an owned axolotl: its id, name, worn perks (outfitPerks) and what its picture shows. */
function explorerCardAxolotl(axolotl: OwnedAxolotl): ExplorerCardAxolotl {
  const { id, name, morph, look, dreamColour, outfit } = axolotl;
  return { id, name, worn: outfitPerks(outfit), morph, look, dreamColour, outfit };
}

/** Who wears each Wearable among the owned axolotls other than `axolotlId`, by Wearable id, for the restyle Outfit tab. */
function wearersBesides(axolotls: readonly OwnedAxolotl[], axolotlId: string): Map<string, StylerWearer> {
  const wearers = new Map<string, StylerWearer>();
  for (const other of axolotls) {
    if (other.id === axolotlId) continue;
    for (const wearableId of wornIds(other.outfit)) wearers.set(wearableId, { axolotlId: other.id, name: other.name });
  }
  return wearers;
}

/** Whether `swimmer` already shows `pose` in its current outfit, so it need not repaint. */
function swimmerPainted(swimmer: TankSwimmer, pose: AxolotlPose): boolean {
  return (
    swimmer.lastPose !== null && samePose(pose, swimmer.lastPose) && swimmer.paintedOutfitKey === swimmer.outfitKey
  );
}

/** Repaints `swimmer` in `pose`, its colours and its outfit, and records what it painted. */
function paintSwimmer(swimmer: TankSwimmer, pose: AxolotlPose): void {
  swimmer.redrawAcc = 0;
  swimmer.texture.redraw(pose, swimmer.palette, swimmer.outfit);
  swimmer.lastPose = pose;
  swimmer.paintedOutfitKey = swimmer.outfitKey;
}

/** Places a full-frame tank layer (480 x 360, origin top-left) on the tank frame. */
function placeTankLayer(image: Phaser.GameObjects.Image, info: TexInfo, frame: TankFrame): void {
  image.setPosition(frame.x, frame.y).setScale(frame.scale / info.scale);
}

/**
 * The Home Tank hub (PRD C7, C8): the tank on the wall, every owned axolotl swimming on its own
 * in its morph's colours and its own look (still poses under reduced motion), the animated surface
 * line, the hub actions Go exploring, Decorate, Treasure Chest and Collection Book, by touch and by
 * keyboard, and the best-stars badge of the area (H7). Every axolotl wears its outfit (PRD C10, F8).
 * Go exploring opens the explorer card (PRD F7), even with one axolotl, and Go! there starts the
 * trip; its Change outfit opens the restyle Outfit tab and comes back to the card. After a trip
 * the tank arrival card shows first and takes every key and press until it closes; after beating
 * the area it is the "Area beaten" card, and closing it leaves the player in the hub. The hub focus
 * runs over the hub buttons and then the axolotls, and a tap on an axolotl, or Enter on a focused
 * one, opens the restyle screen for it (PRD F6).
 */
export class HomeTankScene extends Phaser.Scene {
  private assets!: GameAssets;
  private arrival: TripEnding | null = null;
  private session!: Session;
  private area!: Readonly<AreaData>;
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
  private starsBadge!: AreaStarsBadge;
  private decorator!: TankDecorator;
  private chest!: TreasureChestView;
  private book!: CollectionBookView;
  private arrivalCard!: TankArrivalCard;
  private pickRing!: Phaser.GameObjects.Graphics;
  private nameTagPanel!: Phaser.GameObjects.Graphics;
  private nameTagText!: Phaser.GameObjects.Text;
  private restyler: AxolotlStyler | null = null;
  private explorerCard: ExplorerCard | null = null;

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
    this.restyler = null;
    this.explorerCard = null;
  }

  create(): void {
    this.view = readSceneView(this.scale);
    this.motion = motionProfile(this.registry.get(REGISTRY_KEYS.reducedMotion) === true);
    this.session = readSession(this.registry);
    this.area = zoneArea(this.assets.zone.areaId);
    this.frame = tankFrame(this.view.cssW, this.view.cssH);
    useCssCamera(this.cameras.main, this.view.fit.dpr);
    this.cameras.main.setBackgroundColor(HOME_TANK_WALL);

    this.buildTank();
    this.buildDecorator();
    this.buildSwimmers();
    this.buildHub();
    this.buildStarsBadge();
    this.buildPickFocus();
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

  /**
   * Animates the tank, or only the styler while the restyle screen's opaque backdrop covers the tank,
   * so hidden axolotls do not repaint (art guide 9, repaint budget). The tank picks up where it left off.
   * An open explorer card counts its Go! wait while the tank animates behind its dim.
   */
  update(time: number, deltaMs: number): void {
    if (this.restyler !== null) {
      this.restyler.update(time, deltaMs);
      return;
    }
    this.explorerCard?.update(time, deltaMs);
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
   * One swimmer per owned axolotl in its morph's colours (or its Dream colour), its own look and its
   * outfit, each with its own texture so their poses never share a frame. Baked at the boot bake
   * scale; the look's size factor is applied by the texture.
   */
  private buildSwimmers(): void {
    const bakeScale = this.assets.axolotl.bakeScale;
    this.swimmers = this.session.hub.axolotls.map((axolotl, index): TankSwimmer => {
      const texture = createAxolotlTexture(this, `tank-axolotl-${axolotl.id}`, bakeScale, axolotl.look);
      const image = this.add
        .image(0, 0, texture.key)
        .setOrigin(texture.info.originNormX, texture.info.originNormY)
        .setDepth(TANK_DEPTH.axolotls);
      const hitArea = new Phaser.Geom.Rectangle(0, 0, texture.info.pxW, texture.info.pxH);
      const outfit = artOutfit(axolotl.outfit);
      const swimmer: TankSwimmer = {
        id: axolotl.id,
        texture,
        palette: axolotlPalette(axolotl.morph, axolotl.dreamColour),
        outfit,
        outfitKey: outfitKey(outfit),
        paintedOutfitKey: null,
        image,
        lastPose: null,
        redrawAcc: 0,
        hitArea,
        pressed: false,
      };
      this.bindSwimmerTap(swimmer, index);
      return swimmer;
    });
  }

  /** A press and release on an axolotl, in the hub, picks it; leaving it first cancels the press. */
  private bindSwimmerTap(swimmer: TankSwimmer, index: number): void {
    const { image } = swimmer;
    image.setInteractive({
      hitArea: swimmer.hitArea,
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    image.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      swimmer.pressed = this.mode === 'hub';
    });
    image.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
      swimmer.pressed = false;
    });
    image.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.releaseSwimmer(swimmer, index));
  }

  /** The focused axolotl's double focus ring and its name tag (a white panel with the name in bold ink 18 px). */
  private buildPickFocus(): void {
    this.pickRing = this.add.graphics().setDepth(TANK_DEPTH.hub);
    this.nameTagPanel = this.add.graphics().setDepth(TANK_DEPTH.hub);
    this.nameTagText = this.add.text(0, 0, '', uiTextStyle(NAME_TAG_PX, this.view.fit.dpr)).setDepth(TANK_DEPTH.hub);
  }

  /** The hub actions in focus order (Go exploring first) and the Home Tank name panel. */
  private buildHub(): void {
    const dpr = this.view.fit.dpr;
    this.titlePanel = this.add.graphics().setDepth(TANK_DEPTH.hub);
    this.titleText = this.add.text(0, 0, HOME_TANK_NAME, uiTextStyle(TITLE_PX, dpr)).setDepth(TANK_DEPTH.hub);
    this.hubButtons = HUB_BUTTONS.map((spec) => this.addHubButton(spec));
  }

  /** The best-stars badge of the area, under the hub, showing the best stars this session (H7). */
  private buildStarsBadge(): void {
    this.starsBadge = new AreaStarsBadge(
      this,
      this.assets.area.stars,
      areaLabel(this.area.number),
      TANK_DEPTH.hub,
      this.view.fit.dpr,
    );
    this.refreshStarsBadge();
  }

  /** Shows the area's best stars from the session on the badge. */
  private refreshStarsBadge(): void {
    this.starsBadge.setStars(bestStars(this.session, this.area.id));
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

  /** Shows the arrival card for the trip that ended; after beating the area, with its best stars. */
  private showArrival(ending: TripEnding): void {
    this.mode = 'arrival';
    this.refreshStarsBadge();
    const areaStars: ArrivalAreaStars | undefined =
      ending.reason === 'areaBeaten'
        ? { area: this.area, best: bestStars(this.session, this.area.id), rescueOpen: canRescueMore(this.session) }
        : undefined;
    this.arrivalCard.show(ending, this.session.hub.banked.length, areaStars, this.session.canal.waitingStranded);
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

  /**
   * Leaves the hub for the Treasure Chest, the Collection Book, decorate mode, restyle or the explorer
   * card: its buttons and name panel hide.
   */
  private leaveHub(mode: 'chest' | 'book' | 'decorate' | 'restyle' | 'explorer'): void {
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
        this.openExplorerCard('go', this.session.hub.explorerId);
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

  /**
   * Opens the explorer card (PRD F7) over the hub with every owned axolotl, its worn perks and its
   * outfit, `explorerId` chosen (the first axolotl when null or not owned) and `focus` focused. Every
   * key goes to the card until Go!, Change outfit or Back.
   */
  private openExplorerCard(focus: 'go' | 'changeOutfit', explorerId: string | null): void {
    this.leaveHub('explorer');
    this.explorerCard = new ExplorerCard(this, this.assets, this.view, TANK_DEPTH.explorer, {
      axolotls: this.session.hub.axolotls.map(explorerCardAxolotl),
      explorerId,
      focus,
      onChoose: (id) => this.saveExplorer(id),
      onGo: (id) => this.startExploring(id),
      onChangeOutfit: (id) => this.changeOutfit(id),
      onBack: () => this.closeExplorerCard(),
    });
  }

  /** Removes the explorer card, if open. */
  private destroyExplorerCard(): void {
    this.explorerCard?.destroy();
    this.explorerCard = null;
  }

  /** A new axolotl chosen on the explorer card: remembers it as the explorer and saves it (PRD F7, D1). */
  private saveExplorer(id: string): void {
    this.session = chooseExplorer(readSession(this.registry), id);
    writeSession(this.registry, this.session);
  }

  /** Go! on the explorer card, once: removes the card and starts the trip with `id` through the scene flow. */
  private startExploring(id: string): void {
    if (this.exploring) return;
    this.exploring = true;
    this.destroyExplorerCard();
    goExploring(this, this.assets, id);
  }

  /** Change outfit on the explorer card: removes the card and opens the restyle Outfit tab for `id`. */
  private changeOutfit(id: string): void {
    this.destroyExplorerCard();
    const index = this.swimmers.findIndex((swimmer) => swimmer.id === id);
    if (index === -1) throw new Error(`HomeTankScene: no swimmer for axolotl ${id}`);
    this.openRestyle(index, 'explorer');
  }

  /** Back or Escape on the explorer card: removes it and goes back to the hub with Go exploring focused. */
  private closeExplorerCard(): void {
    this.destroyExplorerCard();
    this.showHub(GO_EXPLORING_INDEX);
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

  /** Picks the axolotl when the press began on it and the hub still has the input. */
  private releaseSwimmer(swimmer: TankSwimmer, index: number): void {
    const wasPressed = swimmer.pressed;
    swimmer.pressed = false;
    if (wasPressed && this.mode === 'hub') this.openRestyle(index);
  }

  /** The owned axolotl the swimmer at `index` shows. Throws when the session does not own it. */
  private swimmerAxolotl(index: number): OwnedAxolotl {
    const id = this.swimmers[index]?.id;
    const axolotl = this.session.hub.axolotls.find((owned) => owned.id === id);
    if (axolotl === undefined) throw new Error(`HomeTankScene: no owned axolotl for swimmer ${index}`);
    return axolotl;
  }

  /**
   * Opens the restyle screen (PRD F6) for the axolotl at `index`, starting from its name, look,
   * morph (shown read-only), Dream colour and outfit, offering the Dream colours the hub owns and,
   * on the Outfit tab, the banked Wearables with who else wears each (PRD C10). From the explorer
   * card it opens on the Outfit tab. The hub hides and every key goes to the styler until Done or Cancel.
   */
  private openRestyle(index: number, from: RestyleFrom = 'hub'): void {
    const axolotl = this.swimmerAxolotl(index);
    const banked = this.session.hub.banked;
    const options: RestyleOptions = {
      banked,
      wearers: wearersBesides(this.session.hub.axolotls, axolotl.id),
      ...(from === 'explorer' ? { startStep: 'outfit' as const } : {}),
    };
    this.leaveHub('restyle');
    this.restyler = new AxolotlStyler(this, this.assets, this.view, TANK_DEPTH.restyle, {
      mode: 'restyle',
      motion: () => this.motion,
      initial: restyleStart(
        {
          name: axolotl.name,
          look: axolotl.look,
          morph: axolotl.morph,
          dreamColour: axolotl.dreamColour,
          outfit: axolotl.outfit,
        },
        ownedDreamColours(banked),
        options,
      ),
      onDone: (styled) => this.finishRestyle(index, styled, from),
      onCancel: () => this.closeRestyle(index, from),
    });
  }

  /**
   * Done in restyle: stores the new name, look, Dream colour and outfit (the morph and every other
   * field stay; a Wearable put on comes off any other axolotl), saving once (D1). Repaints that
   * axolotl's swimmer in them from a first paint, and any other swimmer whose outfit changed, then
   * goes back to where the restyle was opened from.
   */
  private finishRestyle(index: number, styled: StyledAxolotl, from: RestyleFrom): void {
    const { id } = this.swimmerAxolotl(index);
    let next = restyleAxolotl(readSession(this.registry), id, { name: styled.name, look: styled.look });
    next = setDreamColour(next, id, styled.dreamColour);
    next = setOutfit(next, id, styled.outfit);
    this.session = next;
    writeSession(this.registry, this.session);
    const axolotl = this.swimmerAxolotl(index);
    const swimmer = this.swimmers[index];
    swimmer.texture.setLook(axolotl.look);
    swimmer.palette = axolotlPalette(axolotl.morph, axolotl.dreamColour);
    swimmer.lastPose = null;
    this.applySwimmerTexture(swimmer);
    this.refreshSwimmerOutfits();
    this.closeRestyle(index, from);
  }

  /**
   * Done or Cancel in restyle: removes the styler, then goes back to the hub with the axolotl at
   * `index` focused, or from Change outfit to a new explorer card with that axolotl chosen and
   * Change outfit focused.
   */
  private closeRestyle(index: number, from: RestyleFrom): void {
    this.restyler?.destroy();
    this.restyler = null;
    if (from === 'explorer') {
      this.openExplorerCard('changeOutfit', this.swimmerAxolotl(index).id);
      return;
    }
    this.showHub(axolotlFocusIndex(index, this.hubButtons.length));
  }

  /**
   * Gives every swimmer the outfit its owned axolotl wears now. A swimmer whose outfitKey changed
   * repaints on its next frame, an axolotl after the first within the shared repaint budget.
   */
  private refreshSwimmerOutfits(): void {
    for (const [index, swimmer] of this.swimmers.entries()) {
      const outfit = artOutfit(this.swimmerAxolotl(index).outfit);
      const key = outfitKey(outfit);
      if (key === swimmer.outfitKey) continue;
      swimmer.outfit = outfit;
      swimmer.outfitKey = key;
    }
  }

  /**
   * Shows a swimmer's texture after its look changed. A size change re-bakes the texture, so the
   * texture, origin, tap area and scale are applied again.
   */
  private applySwimmerTexture(swimmer: TankSwimmer): void {
    const { texture } = swimmer;
    swimmer.image
      .setTexture(texture.key)
      .setOrigin(texture.info.originNormX, texture.info.originNormY)
      .setScale(texture.displayScale(this.frame.scale));
    this.fitSwimmerHitArea(swimmer);
  }

  /** Sizes a swimmer's tap area to its texture, at least the touch target size at the current tank scale. */
  private fitSwimmerHitArea(swimmer: TankSwimmer): void {
    const { info } = swimmer.texture;
    const area = touchHitRect({ w: info.pxW, h: info.pxH }, swimmer.texture.displayScale(this.frame.scale));
    swimmer.hitArea.setTo(area.x, area.y, area.w, area.h);
  }

  // ---- input ---------------------------------------------------------------

  /**
   * Routes a key to what has the input: the restyle screen (every key, as is), the explorer card
   * (every key; it reads its own), the arrival card, the Treasure Chest, the Collection Book,
   * decorate mode, or the hub. Unmapped keys are ignored, and so is a held confirm outside the hub.
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (this.mode === 'restyle') {
      this.restyler?.handleKey(event);
      return;
    }
    if (this.mode === 'explorer') {
      this.explorerCard?.handleKey(event);
      return;
    }
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

  /**
   * Confirm presses the focused hub button or opens restyle for the focused axolotl, ignoring key
   * repeat; the arrows and Tab move the focus over the hub buttons, then the axolotls.
   */
  private handleHubKey(action: TankKey, event: KeyboardEvent): void {
    if (action === 'confirm') {
      if (!event.repeat) this.pressFocused();
      return;
    }
    const step = hubFocusStep(action);
    if (step === 0) return;
    this.focusIndex = stepTankFocus(this.focusIndex, this.hubButtons.length, this.swimmers.length, step);
    this.refreshHubFocus();
  }

  /** What the hub focus is on: a hub button or an axolotl, or null when nothing is focused. */
  private focusTarget(): TankFocusTarget | null {
    return tankFocusTarget(this.focusIndex, this.hubButtons.length, this.swimmers.length);
  }

  /** Presses the focused hub button, or opens restyle for the focused axolotl. */
  private pressFocused(): void {
    const target = this.focusTarget();
    if (target === null) return;
    if (target.kind === 'hub') {
      this.runHubAction(this.hubButtons[target.i].id);
      return;
    }
    this.openRestyle(target.i);
  }

  /**
   * Shows the focus ring on the focused hub button, only while the hub has the input, and lets the
   * axolotls take taps only then.
   */
  private refreshHubFocus(): void {
    this.hubButtons.forEach((hubButton, index) =>
      hubButton.button.setFocused(this.mode === 'hub' && index === this.focusIndex),
    );
    this.applySwimmerInput();
    this.renderPickFocus();
  }

  /**
   * Axolotls take taps only in the hub, so they never block a Decoration press in decorate mode;
   * a press in progress is dropped when the hub loses the input.
   */
  private applySwimmerInput(): void {
    const enabled = this.mode === 'hub';
    for (const swimmer of this.swimmers) {
      if (enabled) {
        swimmer.image.setInteractive();
      } else {
        swimmer.image.disableInteractive();
        swimmer.pressed = false;
      }
    }
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
    this.starsBadge.setResolution(dpr);
    for (const hubButton of this.hubButtons) {
      hubButton.button.setResolution(dpr);
    }
    this.decorator.setResolution(dpr);
    this.chest.setResolution(dpr);
    this.book.setResolution(dpr);
    this.arrivalCard.setResolution(dpr);
    this.nameTagText.setResolution(dpr);
    this.restyler?.setResolution(dpr);
    this.explorerCard?.setResolution(dpr);
    this.layout();
    this.animate(0);
  }

  private handleShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.off(GAME_EVENTS.REDUCED_MOTION, this.handleReducedMotion, this);
    this.decorator.destroy();
    this.chest.destroy();
    this.book.destroy();
    this.restyler?.destroy();
    this.restyler = null;
    this.destroyExplorerCard();
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
   * Fits the tank to the canvas, sizes the axolotl tap areas, then places the Decorations, the hub,
   * the Treasure Chest, the Collection Book, the arrival card, an open restyle screen and an open
   * explorer card.
   */
  private layout(): void {
    this.frame = tankFrame(this.view.cssW, this.view.cssH);
    const tank = this.assets.tank;
    placeTankLayer(this.back, tank.back, this.frame);
    placeTankLayer(this.glass, tank.glass, this.frame);
    placeTankLayer(this.front, tank.front, this.frame);
    for (const swimmer of this.swimmers) {
      this.fitSwimmerHitArea(swimmer);
    }
    this.decorator.layout(this.view, this.frame);
    this.layoutHub();
    this.chest.layout(this.view);
    this.book.layout(this.view);
    this.arrivalCard.layout(this.view);
    this.restyler?.layout(this.view);
    this.explorerCard?.layout(this.view);
  }

  /**
   * Shows the hub buttons and the best-stars badge unless the Treasure Chest, the Collection Book,
   * decorate mode, restyle or the explorer card is up, and the name panel only when it fits.
   */
  private applyHubVisibility(): void {
    const shown = this.mode === 'hub' || this.mode === 'arrival';
    for (const hubButton of this.hubButtons) {
      hubButton.button.container.setVisible(shown);
    }
    this.starsBadge.setVisible(shown);
    this.titlePanel.setVisible(shown && this.titleFits);
    this.titleText.setVisible(shown && this.titleFits);
  }

  /**
   * Places the hub buttons through hubLayout(), the best-stars badge under them (or in the corner)
   * through hubStarsBadgeRect(), and the name panel only when it fits.
   */
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
    this.starsBadge.layout(hubStarsBadgeRect(this.view, this.frame, hub, this.starsBadge.measure()));
    const title = hub.title;
    this.titleFits = title !== null;
    this.applyHubVisibility();
    if (title === null) return;
    drawPanel(this.titlePanel, title.x, title.y, title.w, title.h, UI_PANEL);
    this.titleText.setPosition(title.x + UI.pad, title.y + UI.pad);
  }

  // ---- rendering -----------------------------------------------------------

  /** Advances the clock and draws the swimmers, the focused axolotl's ring and tag, the surface and plant sway. */
  private animate(dt: number): void {
    this.clock += dt;
    const t = this.motion.ambient ? this.clock : T_STATIC;
    this.swimmers.forEach((swimmer, index) => this.renderSwimmer(swimmer, index, t, dt));
    this.renderPickFocus();
    this.renderSurface(t);
    this.decorator.update(this.clock, this.motion);
    this.repaintRescuedSwimmers();
  }

  /**
   * Draws the double focus ring round the focused axolotl's sprite bounds and its name tag, kept on
   * the canvas by nameTagRect(), so both follow it every frame. Both hide unless the hub has the
   * input and the focus is on an axolotl.
   */
  private renderPickFocus(): void {
    const target = this.mode === 'hub' ? this.focusTarget() : null;
    const swimmer = target?.kind === 'axolotl' ? this.swimmers[target.i] : undefined;
    this.pickRing.clear();
    this.nameTagPanel.setVisible(swimmer !== undefined);
    this.nameTagText.setVisible(swimmer !== undefined);
    if (target === null || swimmer === undefined) return;
    const rect: Rect = spriteFrameBounds(swimmer.image);
    strokeAxolotlRing(this.pickRing, rect);
    this.nameTagText.setText(this.swimmerAxolotl(target.i).name);
    const tagSize: Size = { w: this.nameTagText.width + 2 * UI.pad, h: this.nameTagText.height + 2 * UI.pad };
    const tag = nameTagRect(rect, tagSize, this.view);
    drawPanel(this.nameTagPanel, tag.x, tag.y, tag.w, tag.h, UI_PANEL);
    this.nameTagText.setPosition(tag.x + UI.pad, tag.y + UI.pad);
  }

  /** Places one axolotl from its tank pose (still under reduced motion) and repaints it when its pose changes. */
  private renderSwimmer(swimmer: TankSwimmer, index: number, t: number, dt: number): void {
    const pose: AxolotlPose = {
      swimPhase: (TAU * t) / 1.2,
      gillPhase: this.motion.gillFlutter ? (TAU * t) / 0.8 : (TAU * T_STATIC) / 0.8,
      blink: this.motion.ambient ? blinkAt(t) : 1,
      tailAmp: 1,
      sparkle: 0,
      sheen: this.motion.ambient ? dreamSheenAt(t) : undefined,
    };
    if (index === 0) this.redrawSwimmer(swimmer, pose, dt);
    else this.askRescuedRepaint(swimmer, index - 1, pose, dt);
    const swim = tankSwimPose(swimmer.id, index, this.clock, !this.motion.ambient);
    const at = tankToCss(this.frame, { x: swim.x, y: swim.y });
    faceSprite(
      swimmer.image.setPosition(at.x, at.y).setRotation(swim.tilt),
      swim.facing,
      swimmer.texture.displayScale(this.frame.scale),
    );
  }

  /**
   * Repaints one axolotl's texture in its morph's colours and its outfit when its pose or outfit
   * changes. While the frame rate is low, repaints are capped at 30 a second, as in the swim, so each
   * owned axolotl costs less per frame.
   */
  private redrawSwimmer(swimmer: TankSwimmer, pose: AxolotlPose, dt: number): void {
    if (swimmerPainted(swimmer, pose)) return;
    swimmer.redrawAcc += dt;
    if (swimmer.lastPose !== null && this.game.loop.actualFps < LOW_FPS && swimmer.redrawAcc < LOW_FPS_REDRAW_S) {
      return;
    }
    paintSwimmer(swimmer, pose);
  }

  /**
   * Records this frame's pose for an axolotl after the first and its repaint budget wait in `slot`.
   * An outfit change waits for the budget like a pose change. A first paint, or any change under
   * reduced motion, paints at once so the morph colours and still pose show now (PRD C8).
   */
  private askRescuedRepaint(swimmer: TankSwimmer, slot: number, pose: AxolotlPose, dt: number): void {
    swimmer.wanted = pose;
    this.rescuedWaits[slot] = NO_REPAINT;
    if (swimmerPainted(swimmer, pose)) return;
    swimmer.redrawAcc += dt;
    if (swimmer.lastPose === null || !this.motion.ambient) {
      paintSwimmer(swimmer, pose);
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
    if (swimmer.wanted) paintSwimmer(swimmer, swimmer.wanted);
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
