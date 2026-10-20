import * as Phaser from 'phaser';
import { AXO_PREVIEW_CROPS, AXO_SCENE_SCALE, AXO_TEX, type AxolotlPose } from '../art/drawAxolotl';
import { AXO_SIZE_SCALE } from '../art/drawAxolotlParts';
import { dreamSheenAt } from '../art/drawDreamOverlay';
import { dreamSwatchTextureSize, paintDreamSwatch } from '../art/drawTreasures';
import { BUTTON_PRESS_OFFSET, ICON_SIZE, NAME_FIELD, type IconKind } from '../art/drawUi';
import type { MorphTextures } from '../art/morphTextures';
import { HOME_TANK_WALL, INK, LW, T_STATIC, UI_PANEL, WHITE, axolotlPalette } from '../art/palette';
import {
  bake,
  bakeAxolotlStill,
  bakeSizedButton,
  buttonKey,
  createAxolotlTexture,
  iconKey,
  type AxolotlTexture,
  type BakedTextures,
  type ButtonFill,
  type ButtonShape,
  type ButtonVisual,
  type TexInfo,
} from '../art/textures';
import type { AxolotlLook, AxolotlSex, LookField } from '../logic/axolotlLook';
import { NAME_FIELD_RAW_MAX, fitNameEdit, suggestedNamesFor } from '../logic/axolotlNames';
import type { DreamColourId } from '../logic/catalogue';
import { MAX_DREAM_OPTIONS, REAL_COLOUR_OPTION_ID } from '../logic/dreamPaint';
import type { Rect, Size } from '../logic/hudLayout';
import { morphById, type RealMorphId } from '../logic/morphs';
import type { MotionProfile } from '../logic/motion';
import {
  chosenIndex,
  reduceStyler,
  restyleStart,
  setName,
  stepIndex,
  stepOptions,
  withDreamsPerPage,
  withNamesPerPage,
  type StylerAction,
  type StylerAxolotl,
  type StylerEffect,
  type StylerMode,
  type StylerOption,
  type StylerState,
} from '../logic/styler';
import { MAX_STEP_OPTIONS, RESTYLE_STEPS, STYLER_STEPS, stepLookField, type StylerStep } from '../logic/stylerSteps';
import {
  BACK_LABEL,
  CANCEL_LABEL,
  DONE_LABEL,
  MORE_COLOURS_LABEL,
  MORE_NAMES_LABEL,
  NAME_FIELD_LABEL,
  NAME_PLACEHOLDER,
  NEXT_LABEL,
  SURPRISE_ME_LABEL,
  stepHeading,
  stepHelper,
  stepTabLabel,
  stepTitle,
} from '../logic/stylerText';
import {
  BACK_BUTTON,
  CANCEL_BUTTON,
  CAPTION_TEXT_PX,
  DONE_BUTTON,
  HEADING_TEXT_PX,
  HELPER_TEXT_PX,
  NAME_CURSOR,
  NAME_PENCIL_PX,
  NAME_TEXT_PX,
  NEXT_BUTTON,
  OPTION_LABEL_TEXT_PX,
  PAGE_BUTTON_PX,
  SURPRISE_BUTTON,
  TAB_TEXT_PX,
  nameBoxParts,
  nameCursorShown,
  stylerLayout,
  type StylerLayout,
  type StylerMeasure,
  type StylerNav,
  type StylerPreview,
  type StylerScreen,
} from '../logic/stylerUi';
import { tankKeyFor } from '../logic/tankUi';
import { openTextEntry, type TextEntry, type TextEntryRect } from '../platform/textEntry';
import {
  blinkAt,
  createButton,
  cssColor,
  drawPanel,
  samePose,
  uiTextStyle,
  type GameAssets,
  type SceneView,
  type UiButton,
} from './BootScene';

const TAU = Math.PI * 2;
const BACKDROP_COVER = 8192;
const MAX_STEP_S = 0.05;
/** Repaint budget (art guide 9): while the frame rate is under LOW_FPS, the preview repaints at most 30 a second. */
const LOW_FPS = 45;
const LOW_FPS_REDRAW_S = 1 / 30;
const SWIM_PERIOD_S = 1.2;
const GILL_PERIOD_S = 0.8;
const BOX_RADIUS = 18;
/** The largest size scale (art guide 6o): the preview always has room for it. */
const PREVIEW_LARGEST_SIZE = Math.max(...Object.values(AXO_SIZE_SCALE));
/** Double focus ring just outside the 3.5 px outline, as on the baked buttons (art guide 8). */
const RING_LINE = 3;
const RING_INNER = LW / 2 + 1.5;
const RING_OUTER = LW / 2 + 4.5;
/** Chosen option: a thick ink ring just inside the outline, plus the tick badge (shape, not colour). */
const CHOSEN_RING_W = 5;
/** Tick badge on the chosen option: a white disc with an ink outline and the tick icon. */
const TICK_BADGE = Object.freeze({ r: 10, iconPx: 16, outline: 2.6, inset: 3, overhang: 2 });
/** Room between a picture button's edge and its picture, clear of the outline. */
const PICTURE_INSET = LW + 1;
/** The Colour step's morph badge: 24 px, inside the picture button's lower-left corner. */
const MORPH_BADGE_PX = 24;
const MORPH_BADGE_INSET = 4;
/** The Boy or girl step's symbol, in the morph badge's spot: a white disc with an ink ring and the boy or girl icon. */
const SEX_SYMBOL = Object.freeze({ r: 12, outline: 2.6, iconPx: 18 });
/** Progress dots (creator): done is a filled dot, current a bigger ring with a filled centre, to-come a hollow ring. */
const DOT = Object.freeze({ doneR: 4.5, comeR: 4, comeLine: 2, currentR: 5.75, currentLine: 2.5, centreR: 2.5 });
/** The current restyle tab's thick ink bar, inside the tab's bottom edge. */
const TAB_BAR = Object.freeze({ h: 5, inset: 8, bottom: 4 });
/** Still pose (art guide 9): tail and gills at t = T_STATIC, eyes open. */
const STILL_POSE: AxolotlPose = Object.freeze({
  swimPhase: (TAU * T_STATIC) / SWIM_PERIOD_S,
  gillPhase: (TAU * T_STATIC) / GILL_PERIOD_S,
  blink: 1,
  tailAmp: 1,
  sparkle: 0,
});

let stylerCount = 0;

/** How the styler is used, and who hears when it finishes. */
export interface AxolotlStylerOptions {
  /** The step-by-step character creator, or restyling an owned axolotl (adds tabs, Cancel and Escape). */
  mode: StylerMode;
  /** The current motion profile, read every frame, so turning reduced motion on stills the preview at once. */
  motion: () => MotionProfile;
  /**
   * Where the styler starts. Restyle: the owned axolotl's name, look and morph (it starts with
   * restyleStart()). The creator: a creatorStart() state; a restyle may pass a restyleStart() state too.
   */
  initial: StylerAxolotl | StylerState;
  /** Done: the finished name, look and morph (the initial morph in restyle). Called at most once. */
  onDone: (axolotl: StylerAxolotl) => void;
  /** Cancel or Escape in restyle: leave without keeping changes. Required in restyle. Called at most once. */
  onCancel?: () => void;
}

/** The parts of a keydown the styler reads. */
export type StylerKeyEvent = Pick<KeyboardEvent, 'key' | 'shiftKey' | 'repeat'>;

/** A step button and how it is drawn. */
type NavControl = keyof StylerNav;

interface NavSpec {
  fill: ButtonFill;
  shape: ButtonShape;
  size: Size;
  label: string;
  icon: IconKind;
}

const NAV_SPECS: Readonly<Record<NavControl, NavSpec>> = Object.freeze({
  back: { fill: 'secondary', shape: 'square', size: BACK_BUTTON, label: BACK_LABEL, icon: 'left' },
  next: { fill: 'primary', shape: 'wide', size: NEXT_BUTTON, label: NEXT_LABEL, icon: 'right' },
  done: { fill: 'primary', shape: 'wide', size: DONE_BUTTON, label: DONE_LABEL, icon: 'check' },
  surprise: { fill: 'secondary', shape: 'square', size: SURPRISE_BUTTON, label: SURPRISE_ME_LABEL, icon: 'surprise' },
  cancel: { fill: 'secondary', shape: 'square', size: CANCEL_BUTTON, label: CANCEL_LABEL, icon: 'close' },
});

const NAV_CONTROLS: Readonly<Record<StylerMode, readonly NavControl[]>> = Object.freeze({
  creator: ['back', 'surprise', 'next', 'done'],
  restyle: ['surprise', 'cancel', 'done'],
});

/** A 48 px chevron page button: a secondary body with a left or right chevron, no label. */
interface Chevron {
  container: Phaser.GameObjects.Container;
  /** Shows the chevron and takes presses, or hides it and ignores them. */
  setEnabled(enabled: boolean): void;
}

/** One option button's objects: its tap area, picture, label, name text, tick, morph badge and sex symbol. */
interface OptionSlot {
  zone: Phaser.GameObjects.Zone;
  picture: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  nameText: Phaser.GameObjects.Text;
  tick: Phaser.GameObjects.Image;
  badge: Phaser.GameObjects.Image;
  symbol: Phaser.GameObjects.Image;
}

/** Sets `text` to wrap at `wrapW` and returns its size. */
function wrappedSize(text: Phaser.GameObjects.Text, wrapW: number): Size {
  text.setWordWrapWidth(Math.max(1, wrapW), true);
  return { w: text.width, h: text.height };
}

/** The largest size of each of `strings` set on `text` and wrapped at `wrapW`; zero when there are none. */
function largestWrapped(text: Phaser.GameObjects.Text, strings: readonly string[], wrapW: number): Size {
  let largest: Size = { w: 0, h: 0 };
  for (const value of strings) {
    text.setText(value);
    const size = wrappedSize(text, wrapW);
    largest = { w: Math.max(largest.w, size.w), h: Math.max(largest.h, size.h) };
  }
  return largest;
}

/** The width of the longest word of `strings` set unwrapped on `text`. */
function longestWordWidth(text: Phaser.GameObjects.Text, strings: readonly string[]): number {
  text.setWordWrapWidth(null);
  let widest = 0;
  for (const word of strings.flatMap((value) => value.split(/\s+/))) {
    widest = Math.max(widest, text.setText(word).width);
  }
  return widest;
}

/** Wraps `text` to the measured `rect` (with 1 px slack, so it breaks as measured) and centres it there. */
function placeTextIn(text: Phaser.GameObjects.Text, rect: Rect): void {
  text.setWordWrapWidth(rect.w + 1, true);
  text.setPosition(rect.x + (rect.w - text.width) / 2, rect.y + (rect.h - text.height) / 2).setVisible(true);
}

/** Wraps `text` to `rect` (with 1 px slack) and places it at the left edge of `rect`, centred down it. */
function placeTextLeftIn(text: Phaser.GameObjects.Text, rect: Rect): void {
  text.setWordWrapWidth(rect.w + 1, true);
  text.setPosition(rect.x, rect.y + (rect.h - text.height) / 2).setVisible(true);
}

/** Strokes the double focus ring (inner white, outer ink) around a rounded box of `radius`. */
function strokeFocusRing(graphics: Phaser.GameObjects.Graphics, rect: Rect, radius: number): void {
  graphics.lineStyle(RING_LINE, cssColor(WHITE).color, 1);
  graphics.strokeRoundedRect(
    rect.x - RING_INNER,
    rect.y - RING_INNER,
    rect.w + 2 * RING_INNER,
    rect.h + 2 * RING_INNER,
    radius + RING_INNER,
  );
  graphics.lineStyle(RING_LINE, cssColor(INK).color, 1);
  graphics.strokeRoundedRect(
    rect.x - RING_OUTER,
    rect.y - RING_OUTER,
    rect.w + 2 * RING_OUTER,
    rect.h + 2 * RING_OUTER,
    radius + RING_OUTER,
  );
}

function boxRadius(rect: Rect): number {
  return Math.min(rect.h / 2, BOX_RADIUS);
}

/** Draws one box in panel style (white, ink outline), with the focus ring when `focused`. */
function drawBox(graphics: Phaser.GameObjects.Graphics, rect: Rect, focused: boolean): void {
  const radius = boxRadius(rect);
  if (focused) strokeFocusRing(graphics, rect, radius);
  graphics.fillStyle(cssColor(UI_PANEL).color, 1);
  graphics.fillRoundedRect(rect.x, rect.y, rect.w, rect.h, radius);
  graphics.lineStyle(LW, cssColor(INK).color, 1);
  graphics.strokeRoundedRect(rect.x, rect.y, rect.w, rect.h, radius);
}

/**
 * Draws the name box (NAME_FIELD): the fill, the inset band along the top and left inside the outline,
 * then the ink outline, with the focus ring when `focused`.
 */
function drawNameBox(graphics: Phaser.GameObjects.Graphics, rect: Rect, focused: boolean): void {
  const { radius, insetW, outlineW } = NAME_FIELD;
  if (focused) strokeFocusRing(graphics, rect, radius);
  const edge = outlineW / 2;
  const innerR = Math.max(0, radius - edge);
  const inner: Rect = { x: rect.x + edge, y: rect.y + edge, w: rect.w - 2 * edge, h: rect.h - 2 * edge };
  graphics.fillStyle(cssColor(NAME_FIELD.inset).color, 1);
  graphics.fillRoundedRect(inner.x, inner.y, inner.w, inner.h, innerR);
  graphics.fillStyle(cssColor(NAME_FIELD.fill).color, 1);
  graphics.fillRoundedRect(inner.x + insetW, inner.y + insetW, inner.w - insetW, inner.h - insetW, innerR);
  graphics.lineStyle(outlineW, cssColor(NAME_FIELD.outline).color, 1);
  graphics.strokeRoundedRect(rect.x, rect.y, rect.w, rect.h, radius);
}

/** The Colour step's morph badge spot (and the Boy or girl step's symbol): inside a picture button's lower-left corner. */
function cornerBadgeRect(rect: Rect): Rect {
  return {
    x: rect.x + MORPH_BADGE_INSET,
    y: rect.y + rect.h - MORPH_BADGE_INSET - MORPH_BADGE_PX,
    w: MORPH_BADGE_PX,
    h: MORPH_BADGE_PX,
  };
}

/** Strokes the chosen mark's thick ink ring just inside a box's outline. */
function strokeChosenRing(graphics: Phaser.GameObjects.Graphics, rect: Rect): void {
  const inset = LW / 2 + CHOSEN_RING_W / 2;
  graphics.lineStyle(CHOSEN_RING_W, cssColor(INK).color, 1);
  graphics.strokeRoundedRect(
    rect.x + inset,
    rect.y + inset,
    rect.w - 2 * inset,
    rect.h - 2 * inset,
    Math.max(0, boxRadius(rect) - inset),
  );
}

/**
 * The tick badge centre: inside the top-right corner of a picture button, or over the top-right
 * corner of a name button, where it stays clear of the name.
 */
function tickCentre(rect: Rect, inside: boolean): { x: number; y: number } {
  if (!inside) return { x: rect.x + rect.w - TICK_BADGE.overhang, y: rect.y + TICK_BADGE.overhang };
  const offset = TICK_BADGE.inset + TICK_BADGE.r;
  return { x: rect.x + rect.w - offset, y: rect.y + offset };
}

/**
 * The picture crop for a step (art guide 6l, 6m): the face for Eyes and Mouth, the gills for Gills, the
 * spotted flank for Spots, else the whole axolotl.
 */
function pictureCropOf(step: StylerStep): keyof typeof AXO_PREVIEW_CROPS {
  if (step === 'eyes' || step === 'mouth') return 'face';
  if (step === 'spots') return 'spots';
  return step === 'gills' ? 'gills' : 'whole';
}

/** `look` with `field` set to the option `id` (an id of LOOK_FIELD_OPTIONS[field]). */
function lookWithOption(look: AxolotlLook, field: LookField, id: string): AxolotlLook {
  return { ...look, [field]: id } as AxolotlLook;
}

/** True when the styler was handed a whole state (creatorStart or restyleStart), not only an axolotl. */
function isStylerState(initial: StylerAxolotl | StylerState): initial is StylerState {
  return 'step' in initial;
}

/** The starting state for `options`: the state handed in, or a restyle of the axolotl handed in. */
function startStateOf(options: AxolotlStylerOptions): StylerState {
  const { initial, mode } = options;
  if (isStylerState(initial)) {
    if (initial.mode !== mode) throw new Error(`AxolotlStyler: a ${initial.mode} state in ${mode} mode`);
    return initial;
  }
  if (mode === 'restyle') return restyleStart(initial);
  throw new Error('AxolotlStyler: the creator starts from a creatorStart() state');
}

function screenKeyOf(screen: StylerScreen): string {
  return `${screen.mode}|${screen.step}|${screen.optionCount}|${screen.tabPage}`;
}

/** A press and release on the zone calls `onTap`, inside the pointer handler (so a text field can open). */
function createTapZone(scene: Phaser.Scene, onTap: () => void): Phaser.GameObjects.Zone {
  const zone = scene.add.zone(0, 0, 1, 1).setOrigin(0, 0).setInteractive({ useHandCursor: true });
  let pressed = false;
  zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
    pressed = true;
  });
  zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
    pressed = false;
  });
  zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
    const wasPressed = pressed;
    pressed = false;
    if (wasPressed) onTap();
  });
  return zone;
}

/** Moves a tap zone over `rect` and shows it, or hides it (no presses) when `rect` is null. */
function placeZone(zone: Phaser.GameObjects.Zone, rect: Rect | null): void {
  if (rect === null) {
    zone.setVisible(false);
    return;
  }
  zone.setPosition(rect.x, rect.y).setSize(rect.w, rect.h).setVisible(true);
}

/**
 * Builds a PAGE_BUTTON_PX square chevron button at (0, 0): the secondary body baked at that size (with
 * its pressed visual) and the 32 px chevron icon centred on it. Presses on release, as createButton does.
 */
function createChevron(scene: Phaser.Scene, baked: BakedTextures, icon: 'left' | 'right', onPress: () => void): Chevron {
  const bakeScale = baked.info[buttonKey('secondary', 'square', 'normal')].scale;
  const bodies = bakeSizedButton(scene, 'secondary', PAGE_BUTTON_PX, PAGE_BUTTON_PX, bakeScale);
  const body = scene.add
    .image(0, 0, bodies.normal.key)
    .setOrigin(bodies.normal.originNormX, bodies.normal.originNormY)
    .setScale(1 / bodies.normal.scale);
  const iconImage = scene.add
    .image(0, 0, iconKey(icon))
    .setOrigin(0, 0)
    .setScale(1 / baked.icons[icon].scale);
  const container = scene.add.container(0, 0, [body, iconImage]);
  const inset = (PAGE_BUTTON_PX - ICON_SIZE) / 2;
  let pressed = false;

  const refresh = (): void => {
    const visual: ButtonVisual = pressed ? 'pressed' : 'normal';
    body.setTexture(bodies[visual].key);
    iconImage.setPosition(inset, inset + (pressed ? BUTTON_PRESS_OFFSET : 0));
  };
  const release = (): void => {
    pressed = false;
    refresh();
  };
  const handleDown = (): void => {
    pressed = true;
    refresh();
  };
  const handleUp = (): void => {
    const wasPressed = pressed;
    release();
    if (wasPressed) onPress();
  };

  body.setInteractive({ useHandCursor: true });
  body.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, handleDown);
  body.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, handleUp);
  body.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, release);
  refresh();

  return {
    container,
    setEnabled(enabled: boolean): void {
      if (enabled === container.visible) return;
      container.setVisible(enabled);
      if (!enabled) release();
    },
  };
}

/** Shows `badge`, or hides it when `info` or `rect` is null, centred in `rect` at its logical size. */
function placeBadge(badge: Phaser.GameObjects.Image, info: TexInfo | null, rect: Rect | null): void {
  if (info === null || rect === null) {
    badge.setVisible(false);
    return;
  }
  badge
    .setTexture(info.key)
    .setOrigin(info.originNormX, info.originNormY)
    .setScale(1 / info.scale)
    .setPosition(rect.x + rect.w / 2, rect.y + rect.h / 2)
    .setVisible(true);
}

/**
 * The axolotl styler, shared by the step-by-step character creator (PRD F1 to F3, F17) and the
 * restyle screen (PRD F6): an opaque #fff1d6 backdrop that takes every press and a white panel laid
 * out by stylerLayout(). Each step screen has its heading, the progress dots (creator) or the tab row
 * (restyle), the helper line, the live preview and the step's picture buttons (or, on Name, the name
 * box, the suggested names and More names), then Back, Next or Done, Surprise me, and Cancel in
 * restyle. Every press and key goes through reduceStyler(); changes show at once, with no tweens.
 * Each picture button is a still bake of the look so far with its option applied, repainted only
 * when the look or morph changes. Each step keeps its pictures until the styler is destroyed, so
 * going back to a step re-bakes only the pictures that changed. The chosen option has a thick ink ring and a tick; the focused
 * control the double focus ring (PRD F16). The preview idles, and is a still pose under reduced
 * motion. After Done or Cancel the styler ignores further input; the owner destroys it.
 */
export class AxolotlStyler {
  private readonly scene: Phaser.Scene;
  private readonly baked: BakedTextures;
  private readonly baseBakeScale: number;
  private readonly motion: () => MotionProfile;
  private readonly onDone: (axolotl: StylerAxolotl) => void;
  private readonly onCancel: (() => void) | undefined;
  private readonly previewKey: string;
  /** The start of every picture texture key: one texture per picture step and option index. */
  private readonly pictureKeyStart: string;
  /** What each baked picture texture shows, by key. Each key is baked again in place, never added twice. */
  private readonly pictureSigs = new Map<string, string>();
  /** The Dream colour step's 24 px swatch tiles, by key: one per Dream colour, baked again when the resolution changes. */
  private readonly swatches = new Map<string, TexInfo>();
  private readonly container: Phaser.GameObjects.Container;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly boxes: Phaser.GameObjects.Graphics;
  private readonly marks: Phaser.GameObjects.Graphics;
  private readonly previewImage: Phaser.GameObjects.Image;
  private readonly heading: Phaser.GameObjects.Text;
  private readonly helper: Phaser.GameObjects.Text;
  private readonly caption: Phaser.GameObjects.Text;
  private readonly labelProbe: Phaser.GameObjects.Text;
  private readonly morphBadges: MorphTextures['badges'][typeof MORPH_BADGE_PX];
  private readonly slots: OptionSlot[];
  private readonly tabTexts: Phaser.GameObjects.Text[];
  private readonly tabZones: Phaser.GameObjects.Zone[];
  private readonly prevPage: Chevron;
  private readonly nextPage: Chevron;
  private readonly nameBoxText: Phaser.GameObjects.Text;
  private readonly nameBoxPencil: Phaser.GameObjects.Image;
  private readonly nameCursor: Phaser.GameObjects.Rectangle;
  private readonly nameBoxZone: Phaser.GameObjects.Zone;
  private readonly moreNamesText: Phaser.GameObjects.Text;
  private readonly moreNamesZone: Phaser.GameObjects.Zone;
  private readonly moreColoursText: Phaser.GameObjects.Text;
  private readonly moreColoursZone: Phaser.GameObjects.Zone;
  private readonly buttons: Partial<Record<NavControl, UiButton>>;
  private readonly texts: Phaser.GameObjects.Text[];
  private preview: AxolotlTexture;
  private shownLook: AxolotlLook;
  private lastPose: AxolotlPose | null = null;
  /** The morph and Dream colour the preview was last painted in, or null before the first paint. */
  private paintedPalette: string | null = null;
  private redrawAcc = 0;
  private state: StylerState;
  private view: SceneView;
  private dpr: number;
  private placed: StylerLayout | null = null;
  private screenKey = '';
  private tabPage: number | null = null;
  private clock = 0;
  /** Real elapsed seconds (no MAX_STEP_S cap), so the name box cursor blinks on time at a low frame rate. */
  private cursorClock = 0;
  private entry: TextEntry | null = null;
  /** Whether the open name field's caret was last styled blinking (ambient motion) or steady. */
  private entryCaretBlinks = false;
  private nameBeforeTyping = '';
  private captureWasOn = false;
  private finished = false;

  constructor(scene: Phaser.Scene, assets: GameAssets, view: SceneView, depth: number, options: AxolotlStylerOptions) {
    if (options.mode === 'restyle' && options.onCancel === undefined) {
      throw new Error('AxolotlStyler: restyle needs onCancel');
    }
    this.scene = scene;
    this.baked = assets.baked;
    this.view = view;
    this.dpr = view.fit.dpr;
    this.motion = options.motion;
    this.onDone = options.onDone;
    this.onCancel = options.onCancel;
    this.state = startStateOf(options);
    this.baseBakeScale = assets.axolotl.bakeScale;
    const id = stylerCount++;
    this.previewKey = `styler-preview-${id}`;
    this.pictureKeyStart = `styler-picture-${id}`;
    this.shownLook = this.state.look;
    this.preview = createAxolotlTexture(scene, this.previewKey, this.baseBakeScale, this.shownLook);
    this.morphBadges = assets.morph.badges[MORPH_BADGE_PX];

    const backdrop = scene.add
      .rectangle(-BACKDROP_COVER / 2, -BACKDROP_COVER / 2, BACKDROP_COVER, BACKDROP_COVER, cssColor(HOME_TANK_WALL).color, 1)
      .setOrigin(0, 0)
      .setInteractive();
    this.panel = scene.add.graphics();
    this.boxes = scene.add.graphics();
    this.marks = scene.add.graphics();
    this.previewImage = scene.add.image(0, 0, this.previewKey);
    this.heading = this.addText(HEADING_TEXT_PX, true);
    this.helper = this.addText(HELPER_TEXT_PX, false);
    this.caption = this.addText(CAPTION_TEXT_PX, true);
    this.labelProbe = this.addText(OPTION_LABEL_TEXT_PX, true).setVisible(false);
    this.slots = Array.from({ length: MAX_STEP_OPTIONS }, (_unused, index) => this.createSlot(index));
    this.tabTexts = RESTYLE_STEPS.map((step) => this.addText(TAB_TEXT_PX, true).setText(stepTabLabel(step)));
    this.tabZones = RESTYLE_STEPS.map((step) => createTapZone(scene, () => this.dispatch({ type: 'tab', step })));
    this.prevPage = createChevron(scene, this.baked, 'left', () => this.turnTabPage(-1));
    this.nextPage = createChevron(scene, this.baked, 'right', () => this.turnTabPage(1));
    this.nameBoxText = this.addText(NAME_TEXT_PX, true).setAlign('left');
    const pencilInfo = this.baked.icons.pencil;
    this.nameBoxPencil = scene.add
      .image(0, 0, pencilInfo.key)
      .setOrigin(0, 0)
      .setScale(NAME_PENCIL_PX / ICON_SIZE / pencilInfo.scale)
      .setVisible(false);
    this.nameCursor = scene.add
      .rectangle(0, 0, NAME_FIELD.cursorW, NAME_FIELD.cursorH, cssColor(NAME_FIELD.cursor).color, 1)
      .setOrigin(0, 0)
      .setVisible(false);
    this.nameBoxZone = createTapZone(scene, () => this.dispatch({ type: 'nameTap' }));
    this.moreNamesText = this.addText(NAME_TEXT_PX, true).setText(MORE_NAMES_LABEL);
    this.moreNamesZone = createTapZone(scene, () => this.pressMoreNames());
    this.moreColoursText = this.addText(NAME_TEXT_PX, true).setText(MORE_COLOURS_LABEL);
    this.moreColoursZone = createTapZone(scene, () => this.pressMoreColours());
    this.buttons = {};
    for (const control of NAV_CONTROLS[options.mode]) {
      this.buttons[control] = this.createNavButton(control);
    }
    this.texts = [
      this.heading,
      this.helper,
      this.caption,
      this.labelProbe,
      ...this.slots.flatMap((slot) => [slot.label, slot.nameText]),
      ...this.tabTexts,
      this.nameBoxText,
      this.moreNamesText,
      this.moreColoursText,
    ];

    this.container = scene.add
      .container(0, 0, [
        backdrop,
        this.panel,
        this.boxes,
        this.previewImage,
        ...this.slots.map((slot) => slot.picture),
        this.marks,
        ...this.slots.flatMap((slot) => [slot.tick, slot.badge, slot.symbol]),
        ...this.texts,
        this.nameBoxPencil,
        this.nameCursor,
        ...this.slots.map((slot) => slot.zone),
        ...this.tabZones,
        this.nameBoxZone,
        this.moreNamesZone,
        this.moreColoursZone,
        this.prevPage.container,
        this.nextPage.container,
        ...Object.values(this.buttons).map((button) => button.container),
      ])
      .setDepth(depth);
    this.layout(view);
  }

  /** Whether the name text field is open. Keys go to the field, not the styler, while it is. */
  isTyping(): boolean {
    return this.entry !== null;
  }

  /**
   * Handles a keydown through the styler reducer: Tab and Shift+Tab move the focus; arrows move in the
   * picture buttons (by the layout's columns) or through the restyle tabs; Enter and Space press,
   * ignoring key repeat; Escape cancels in restyle. Ignored while typing and after Done or Cancel.
   */
  handleKey(event: StylerKeyEvent): void {
    if (this.finished || this.entry !== null) return;
    if (event.repeat && tankKeyFor(event.key, event.shiftKey) === 'confirm') return;
    this.dispatch({ type: 'key', key: event.key, shiftKey: event.shiftKey, columns: this.gridColumns() });
  }

  /** Advances the preview idle by `deltaMs`; under reduced motion it holds the still pose. Call every frame. */
  update(_time: number, deltaMs: number): void {
    const realDt = Math.max(deltaMs / 1000, 0);
    const dt = Math.min(realDt, MAX_STEP_S);
    this.clock += dt;
    this.cursorClock += realDt;
    if (this.placed?.preview) this.renderPreview(dt);
    this.restyleEntryCaret();
    this.blinkNameCursor();
  }

  /**
   * Lays the current step screen out for `view` with stylerLayout() and redraws it. Re-bakes the
   * picture buttons and the preview when their size or the resolution changed (never upscaled), and
   * moves an open name field to the name box.
   */
  layout(view: SceneView): void {
    this.view = view;
    this.relayout();
  }

  /**
   * Sets the text and button resolution to `dpr`. Call layout() straight after, as a resize does: it
   * re-bakes the preview and the picture buttons for `dpr` once, for the new layout, so nothing is
   * baked for the old layout first.
   */
  setResolution(dpr: number): void {
    this.dpr = dpr;
    for (const text of this.texts) {
      text.setResolution(dpr);
    }
    for (const button of Object.values(this.buttons)) {
      button.setResolution(dpr);
    }
  }

  /**
   * Closes the name field without callbacks, then removes every object, the preview, the picture
   * textures and the Dream swatch tiles.
   */
  destroy(): void {
    this.finished = true;
    this.closeEntry();
    this.container.destroy();
    if (this.scene.textures.exists(this.previewKey)) this.scene.textures.remove(this.previewKey);
    for (const key of [...this.pictureSigs.keys(), ...this.swatches.keys()]) {
      if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    }
    this.pictureSigs.clear();
    this.swatches.clear();
  }

  private addText(sizePx: number, bold: boolean): Phaser.GameObjects.Text {
    return this.scene.add.text(0, 0, '', { ...uiTextStyle(sizePx, this.dpr, bold), align: 'center' });
  }

  private createSlot(index: number): OptionSlot {
    const checkInfo = this.baked.icons.check;
    return {
      zone: createTapZone(this.scene, () => this.dispatch({ type: 'pick', index })),
      picture: this.scene.add.image(0, 0, '__DEFAULT').setVisible(false),
      label: this.addText(OPTION_LABEL_TEXT_PX, true),
      nameText: this.addText(NAME_TEXT_PX, true),
      tick: this.scene.add
        .image(0, 0, checkInfo.key)
        .setOrigin(0, 0)
        .setScale(TICK_BADGE.iconPx / ICON_SIZE / checkInfo.scale)
        .setVisible(false),
      badge: this.scene.add.image(0, 0, this.morphBadges.triangle.key).setVisible(false),
      symbol: this.scene.add.image(0, 0, this.baked.icons.boy.key).setOrigin(0, 0).setVisible(false),
    };
  }

  private createNavButton(control: NavControl): UiButton {
    const spec = NAV_SPECS[control];
    return createButton(this.scene, this.baked, {
      fill: spec.fill,
      shape: spec.shape,
      size: 1,
      width: spec.size.w,
      label: spec.label,
      icon: spec.icon,
      dpr: this.dpr,
      pressOnDown: false,
      onPress: () => this.dispatch({ type: control }),
    });
  }

  /**
   * The step screen stylerLayout() lays out: on Name, the option count is every suggested name that
   * fits; on Dream colour, the real colour and every owned Dream colour, over all pages.
   */
  private screenOf(): StylerScreen {
    const { mode, step } = this.state;
    return { mode, step, optionCount: this.optionCountOf(step), tabPage: this.tabPage };
  }

  private optionCountOf(step: StylerStep): number {
    if (step === 'name') return suggestedNamesFor(this.state.look.sex).length;
    if (step === 'dream') return 1 + this.state.ownedDreams.length;
    return stepOptions(this.state).length;
  }

  /**
   * The option labels to measure: none on Name, every page's labels on Dream colour (so each page
   * lays out alike), else the step's.
   */
  private measuredLabels(): string[] {
    const { step } = this.state;
    if (step === 'name') return [];
    const onOnePage = step === 'dream' ? { ...this.state, dreamPage: 0, dreamsPerPage: MAX_DREAM_OPTIONS } : this.state;
    return stepOptions(onOnePage).map((option) => option.label);
  }

  private helperText(): string {
    return stepHelper(this.state.mode, this.state.step, this.state.ownedDreams.length);
  }

  /** The heading text: "Step N of 11: ..." when `full` in the creator, else the step title. */
  private headingText(full: boolean): string {
    const { mode, step } = this.state;
    if (mode === 'creator' && full) return stepHeading(stepIndex(this.state), STYLER_STEPS.length, step);
    return stepTitle(step);
  }

  private measureFor(): StylerMeasure {
    const labels = this.measuredLabels();
    return {
      headingAt: (wrapW, full) => wrappedSize(this.heading.setText(this.headingText(full)), wrapW),
      helperAt: (wrapW) => wrappedSize(this.helper.setText(this.helperText()), wrapW),
      captionAt: (wrapW) => largestWrapped(this.caption, labels, wrapW),
      optionLabelAt: (wrapW) => largestWrapped(this.labelProbe, labels, wrapW),
      optionLabelMinW: longestWordWidth(this.labelProbe, labels),
      previewFrame: AXO_TEX,
      previewLargestSize: PREVIEW_LARGEST_SIZE,
    };
  }

  /**
   * Lays out the current step screen, fits the names per page to it on Name and the options per page
   * on Dream colour, places the panel, the heading, the helper and the step buttons, then redraws
   * everything else.
   */
  private relayout(): void {
    const screen = this.screenOf();
    const placed = stylerLayout(this.view, screen, this.measureFor());
    this.placed = placed;
    this.screenKey = screenKeyOf(screen);
    if (placed.name !== null) this.state = withNamesPerPage(this.state, placed.name.namesPerPage);
    if (placed.dream !== null) this.state = withDreamsPerPage(this.state, placed.dream.perPage);
    const { panel } = placed;
    drawPanel(this.panel, panel.x, panel.y, panel.w, panel.h, UI_PANEL);
    this.placeHeading(placed);
    this.helper.setText(this.helperText());
    if (placed.helper === null) this.helper.setVisible(false);
    else placeTextIn(this.helper, placed.helper);
    for (const control of Object.keys(this.buttons) as NavControl[]) {
      this.placeNavButton(control, placed.nav[control]);
    }
    this.ensurePreviewBake(placed.preview);
    this.refresh();
    this.placeEntry();
  }

  /** The heading, as the layout shows it; none when the layout hides it (restyle fit step 6). */
  private placeHeading(placed: StylerLayout): void {
    this.heading.setText(this.headingText(placed.headingFull));
    if (placed.heading === null) {
      this.heading.setVisible(false);
      return;
    }
    placeTextIn(this.heading, placed.heading);
  }

  private placeNavButton(control: NavControl, rect: Rect | null): void {
    const button = this.buttons[control];
    if (button === undefined) return;
    button.container.setVisible(rect !== null);
    if (rect !== null) button.container.setPosition(rect.x, rect.y);
  }

  /** Columns of the option grid for up and down: the picture columns, or the name buttons in the first row. */
  private gridColumns(): number {
    const placed = this.placed;
    if (placed === null) return 1;
    if (placed.columns > 0) return placed.columns;
    const tiles = placed.name?.tiles ?? [];
    return Math.max(1, tiles.filter((tile) => tile.y === tiles[0].y).length);
  }

  /**
   * Runs one action through the reducer, redraws, and acts on its effect. A press while typing
   * keeps the typed name first. The tab row goes back to the page holding the current step.
   */
  private dispatch(action: StylerAction): void {
    if (this.finished) return;
    this.closeEntry();
    const result = reduceStyler(this.state, action, Math.random);
    this.state = result.state;
    this.tabPage = null;
    this.refresh();
    this.applyEffect(result.effect);
  }

  private pressMoreNames(): void {
    this.dispatch({ type: 'moreNames', perPage: this.placed?.name?.namesPerPage ?? this.state.namesPerPage });
  }

  private pressMoreColours(): void {
    this.dispatch({ type: 'moreColours', perPage: this.placed?.dream?.perPage ?? this.state.dreamsPerPage });
  }

  /** A page button: shows the next or previous page of restyle tabs, wrapping. Focus stays. */
  private turnTabPage(offset: number): void {
    const tabs = this.placed?.tabs;
    if (this.finished || !tabs) return;
    this.closeEntry();
    this.tabPage = tabs.page + offset;
    this.relayout();
  }

  private applyEffect(effect: StylerEffect | undefined): void {
    if (effect === undefined) return;
    if (effect.type === 'startTyping') {
      this.startTyping();
      return;
    }
    this.finished = true;
    this.blinkNameCursor();
    if (effect.type === 'done') {
      this.onDone({ name: effect.name, look: effect.look, morph: effect.morph, dreamColour: effect.dreamColour });
      return;
    }
    if (this.onCancel === undefined) throw new Error('AxolotlStyler: cancel without onCancel');
    this.onCancel();
  }

  /**
   * Opens the name field over the name box, synchronously, so a pointer or key gesture can raise
   * the on-screen keyboard. Phaser's global key capture pauses so Space and Backspace type.
   */
  private startTyping(): void {
    const keyboard = this.scene.input.keyboard;
    this.captureWasOn = keyboard?.manager.preventDefault === true;
    keyboard?.disableGlobalCapture();
    this.nameBeforeTyping = this.state.name;
    this.entryCaretBlinks = this.motion().ambient;
    this.entry = openTextEntry({
      value: this.state.name,
      maxRawLength: NAME_FIELD_RAW_MAX,
      fitEdit: fitNameEdit,
      ariaLabel: NAME_FIELD_LABEL,
      placeholder: NAME_PLACEHOLDER,
      caretBlinkMs: this.caretBlinkMs(this.entryCaretBlinks),
      onInput: (raw) => this.showTypedName(raw),
      onCommit: (raw) => this.commitTypedName(raw),
      onCancel: () => this.cancelTyping(),
    });
    this.placeEntry();
    this.blinkNameCursor();
  }

  /** The name field caret blink: the cursor's on time in ms when `blinking`, else null for a steady caret. */
  private caretBlinkMs(blinking: boolean): number | null {
    return blinking ? NAME_CURSOR.onS * 1000 : null;
  }

  /** Restyles an open name field's caret when reduced motion was turned on or off while it is open. */
  private restyleEntryCaret(): void {
    const blinking = this.motion().ambient;
    if (this.entry === null || blinking === this.entryCaretBlinks) return;
    this.entryCaretBlinks = blinking;
    this.entry.setCaretBlink(this.caretBlinkMs(blinking));
  }

  /** The styler with `raw` cleaned as its name, or the name from before typing when it cleans to nothing. */
  private withTypedName(raw: string): StylerState {
    return setName({ ...this.state, name: this.nameBeforeTyping }, raw);
  }

  private showTypedName(raw: string): void {
    this.state = this.withTypedName(raw);
    this.refresh();
  }

  private commitTypedName(raw: string): void {
    this.state = this.withTypedName(raw);
    this.closeEntry();
    this.refresh();
  }

  /** Escape in the field: the name goes back to what it was before typing. */
  private cancelTyping(): void {
    this.state = { ...this.state, name: this.nameBeforeTyping };
    this.closeEntry();
    this.refresh();
  }

  /** Closes the name field (no callbacks) and restores Phaser's key capture as it was. Safe when closed. */
  private closeEntry(): void {
    if (this.entry === null) return;
    this.entry.close();
    this.entry = null;
    if (this.captureWasOn) this.scene.input.keyboard?.enableGlobalCapture();
  }

  /** Moves an open name field over the name box, mapped from canvas CSS px to client px. */
  private placeEntry(): void {
    const box = this.placed?.name?.box;
    if (this.entry === null || box === undefined) return;
    this.entry.place(this.clientRectOf(box));
  }

  private clientRectOf(rect: Rect): TextEntryRect {
    const bounds = this.scene.game.canvas.getBoundingClientRect();
    const scaleX = this.view.cssW > 0 ? bounds.width / this.view.cssW : 1;
    const scaleY = this.view.cssH > 0 ? bounds.height / this.view.cssH : 1;
    return {
      left: bounds.left + rect.x * scaleX,
      top: bounds.top + rect.y * scaleY,
      width: rect.w * scaleX,
      height: rect.h * scaleY,
    };
  }

  /**
   * Redraws the state, laying the screen out again first when the step, its option count or the tab
   * page changed: dots or tabs, option buttons with their pictures, labels or caption, the Name
   * controls, the step buttons' focus, and the preview look and morph.
   */
  private refresh(): void {
    const placed = this.placed;
    if (placed === null) return;
    if (screenKeyOf(this.screenOf()) !== this.screenKey) {
      this.relayout();
      return;
    }
    this.boxes.clear();
    this.marks.clear();
    this.drawDots(placed.dots);
    this.drawTabs(placed);
    this.drawOptions(placed);
    this.drawNameControls(placed);
    this.drawMoreColours(placed);
    for (const [control, button] of Object.entries(this.buttons)) {
      button.setFocused(this.state.focus.kind === control);
    }
    this.refreshPreview(placed.preview);
  }

  /** Progress dots (creator): done a filled dot, current a bigger ring with a filled centre, to come a hollow ring. */
  private drawDots(dots: Rect[] | null): void {
    if (dots === null) return;
    const current = stepIndex(this.state);
    const ink = cssColor(INK).color;
    dots.forEach((dot, index) => {
      const x = dot.x + dot.w / 2;
      const y = dot.y + dot.h / 2;
      if (index < current) {
        this.boxes.fillStyle(ink, 1).fillCircle(x, y, DOT.doneR);
      } else if (index === current) {
        this.boxes.lineStyle(DOT.currentLine, ink, 1).strokeCircle(x, y, DOT.currentR);
        this.boxes.fillStyle(ink, 1).fillCircle(x, y, DOT.centreR);
      } else {
        this.boxes.lineStyle(DOT.comeLine, ink, 1).strokeCircle(x, y, DOT.comeR);
      }
    });
  }

  /**
   * The restyle tab row: each tab on the shown page as a box with its label; the current tab's label
   * is bold over a thick ink bar. Page buttons show only when the tabs page.
   */
  private drawTabs(placed: StylerLayout): void {
    const strip = placed.tabs;
    this.tabTexts.forEach((text) => text.setVisible(false));
    this.tabZones.forEach((zone) => placeZone(zone, null));
    this.placePageButton(this.prevPage, strip?.prevPage ?? null);
    this.placePageButton(this.nextPage, strip?.nextPage ?? null);
    if (!strip) return;
    const focus = this.state.focus;
    for (const tab of strip.tabs) {
      const index = RESTYLE_STEPS.indexOf(tab.step);
      const current = tab.step === this.state.step;
      drawBox(this.boxes, tab.rect, focus.kind === 'tab' && focus.step === tab.step);
      const text = this.tabTexts[index].setFontStyle(current ? 'bold' : 'normal');
      placeTextIn(text, tab.rect);
      placeZone(this.tabZones[index], tab.rect);
      if (current) this.drawTabBar(tab.rect);
    }
  }

  private drawTabBar(rect: Rect): void {
    this.marks.fillStyle(cssColor(INK).color, 1);
    this.marks.fillRect(
      rect.x + TAB_BAR.inset,
      rect.y + rect.h - TAB_BAR.bottom - TAB_BAR.h,
      rect.w - 2 * TAB_BAR.inset,
      TAB_BAR.h,
    );
  }

  private placePageButton(chevron: Chevron, rect: Rect | null): void {
    chevron.setEnabled(rect !== null);
    if (rect !== null) chevron.container.setPosition(rect.x, rect.y);
  }

  /**
   * The option buttons: picture buttons (with labels under them, else the caption) or, on Name, the
   * suggested-name buttons. Each is a panel-style box with the focus ring when focused, and the
   * chosen one has the thick ring and the tick badge.
   */
  private drawOptions(placed: StylerLayout): void {
    const isName = this.state.step === 'name';
    const options = stepOptions(this.state);
    const rects = isName ? (placed.name?.tiles ?? []) : placed.options;
    const chosen = chosenIndex(this.state);
    const focus = this.state.focus;
    this.slots.forEach((slot, index) => {
      const option = options[index];
      const rect = rects[index];
      if (option === undefined || rect === undefined) {
        this.hideSlot(slot);
        return;
      }
      drawBox(this.boxes, rect, focus.kind === 'option' && focus.index === index);
      placeZone(slot.zone, rect);
      this.placeTick(slot, rect, index === chosen, !isName);
      if (isName) this.showNameOption(slot, option, rect);
      else this.showPictureOption(slot, option, index, placed);
    });
    this.drawCaption(placed, options, chosen);
  }

  private hideSlot(slot: OptionSlot): void {
    placeZone(slot.zone, null);
    slot.picture.setVisible(false);
    slot.label.setVisible(false);
    slot.nameText.setVisible(false);
    slot.tick.setVisible(false);
    slot.badge.setVisible(false);
    slot.symbol.setVisible(false);
  }

  /** The chosen mark (thick ring and tick badge) on `rect`, or none. */
  private placeTick(slot: OptionSlot, rect: Rect, chosen: boolean, inside: boolean): void {
    slot.tick.setVisible(chosen);
    if (!chosen) return;
    strokeChosenRing(this.marks, rect);
    const centre = tickCentre(rect, inside);
    this.marks.fillStyle(cssColor(WHITE).color, 1).fillCircle(centre.x, centre.y, TICK_BADGE.r);
    this.marks.lineStyle(TICK_BADGE.outline, cssColor(INK).color, 1).strokeCircle(centre.x, centre.y, TICK_BADGE.r);
    slot.tick.setPosition(centre.x - TICK_BADGE.iconPx / 2, centre.y - TICK_BADGE.iconPx / 2);
  }

  private showNameOption(slot: OptionSlot, option: StylerOption, rect: Rect): void {
    slot.picture.setVisible(false);
    slot.label.setVisible(false);
    slot.badge.setVisible(false);
    slot.symbol.setVisible(false);
    placeTextIn(slot.nameText.setText(option.label), rect);
  }

  /**
   * A picture button: its still picture (re-baked when it shows something new), its label, the Colour
   * step's morph badge, the Dream colour step's badge and the Boy or girl step's symbol.
   */
  private showPictureOption(slot: OptionSlot, option: StylerOption, index: number, placed: StylerLayout): void {
    const rect = placed.options[index];
    slot.nameText.setVisible(false);
    const key = this.bakePicture(option, index, rect);
    const centre = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
    slot.picture.setTexture(key).setOrigin(0.5, 0.5).setPosition(centre.x, centre.y);
    slot.picture.setScale(1 / this.dpr).setVisible(true);
    const labelRect = placed.labelsShown ? placed.optionLabels[index] : undefined;
    if (labelRect === undefined) slot.label.setVisible(false);
    else placeTextIn(slot.label.setText(option.label), labelRect);
    const badgeRect = cornerBadgeRect(rect);
    placeBadge(slot.badge, this.cornerBadgeOf(option), badgeRect);
    this.placeSexSymbol(slot, option, badgeRect);
  }

  /**
   * The badge in a picture button's lower-left corner: on Colour, the option's morph badge; on Dream
   * colour, the real morph's badge for the real colour, else the Dream colour's swatch tile; else none.
   */
  private cornerBadgeOf(option: StylerOption): TexInfo | null {
    const { step, morph } = this.state;
    if (step === 'colour') return this.morphBadges[morphById(option.id as RealMorphId).badge];
    if (step !== 'dream') return null;
    if (option.id === REAL_COLOUR_OPTION_ID) return this.morphBadges[morphById(morph).badge];
    return this.dreamSwatch(option.id as DreamColourId);
  }

  /** The MORPH_BADGE_PX swatch tile of the Dream colour `id`, baked once for it at the device pixel ratio. */
  private dreamSwatch(id: DreamColourId): TexInfo {
    const key = `${this.pictureKeyStart}-swatch-${id}`;
    const baked = this.swatches.get(key);
    if (baked !== undefined && baked.scale === this.dpr) return baked;
    const frame = dreamSwatchTextureSize(MORPH_BADGE_PX);
    const info = bake(this.scene, key, frame, this.dpr, (ctx) => paintDreamSwatch(ctx, id, MORPH_BADGE_PX));
    this.swatches.set(key, info);
    return info;
  }

  /** On the Boy or girl step, the white disc with an ink ring and the boy or girl icon centred in `rect`; else hidden. */
  private placeSexSymbol(slot: OptionSlot, option: StylerOption, rect: Rect): void {
    if (this.state.step !== 'sex') {
      slot.symbol.setVisible(false);
      return;
    }
    const centre = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
    this.marks.fillStyle(cssColor(WHITE).color, 1).fillCircle(centre.x, centre.y, SEX_SYMBOL.r);
    this.marks.lineStyle(SEX_SYMBOL.outline, cssColor(INK).color, 1).strokeCircle(centre.x, centre.y, SEX_SYMBOL.r);
    const info = this.baked.icons[option.id as AxolotlSex];
    slot.symbol
      .setTexture(info.key)
      .setScale(SEX_SYMBOL.iconPx / ICON_SIZE / info.scale)
      .setPosition(centre.x - SEX_SYMBOL.iconPx / 2, centre.y - SEX_SYMBOL.iconPx / 2)
      .setVisible(true);
  }

  /** The caption names the focused option, else the chosen one, once the labels hide. */
  private drawCaption(placed: StylerLayout, options: readonly StylerOption[], chosen: number): void {
    const rect = placed.caption;
    if (rect === null || placed.labelsShown) {
      this.caption.setVisible(false);
      return;
    }
    const focus = this.state.focus;
    const index = focus.kind === 'option' ? focus.index : chosen;
    this.caption.setText(options[index]?.label ?? '');
    placeTextIn(this.caption, rect);
  }

  /**
   * The Name step's name box (the name, or the placeholder when empty, the pencil and the text cursor)
   * and More names, or neither on other steps.
   */
  private drawNameControls(placed: StylerLayout): void {
    const name = placed.name;
    const focus = this.state.focus.kind;
    placeZone(this.nameBoxZone, name?.box ?? null);
    placeZone(this.moreNamesZone, name?.moreNames ?? null);
    if (name === null) {
      this.nameBoxText.setVisible(false);
      this.nameBoxPencil.setVisible(false);
      this.nameCursor.setVisible(false);
      this.moreNamesText.setVisible(false);
      return;
    }
    drawNameBox(this.boxes, name.box, focus === 'nameBox');
    this.placeNameBoxParts(name.box);
    if (name.moreNames === null) {
      this.moreNamesText.setVisible(false);
      return;
    }
    drawBox(this.boxes, name.moreNames, focus === 'moreNames');
    placeTextIn(this.moreNamesText, name.moreNames);
  }

  /** More colours under the Dream colour options, or none when every option fits on one page or on other steps. */
  private drawMoreColours(placed: StylerLayout): void {
    const rect = placed.dream?.moreColours ?? null;
    placeZone(this.moreColoursZone, rect);
    if (rect === null) {
      this.moreColoursText.setVisible(false);
      return;
    }
    drawBox(this.boxes, rect, this.state.focus.kind === 'moreColours');
    placeTextIn(this.moreColoursText, rect);
  }

  /**
   * The name box's parts: the name left-aligned in the text room and centred down it (else the
   * placeholder, normal weight, in the placeholder colour), the pencil icon, and the text cursor at the
   * end of the name (the start of the text room when empty).
   */
  private placeNameBoxParts(box: Rect): void {
    const parts = nameBoxParts(box);
    const empty = this.state.name === '';
    this.nameBoxText
      .setText(empty ? NAME_PLACEHOLDER : this.state.name)
      .setColor(empty ? NAME_FIELD.placeholder : INK)
      .setFontStyle(empty ? 'normal' : 'bold');
    placeTextLeftIn(this.nameBoxText, parts.text);
    this.nameBoxPencil.setPosition(parts.pencil.x, parts.pencil.y).setVisible(true);
    const textEnd = empty ? parts.text.x : this.nameBoxText.x + this.nameBoxText.width;
    const cursorX = Math.min(textEnd, parts.text.x + parts.text.w);
    this.nameCursor.setPosition(cursorX, box.y + (box.h - NAME_FIELD.cursorH) / 2);
    this.blinkNameCursor();
  }

  /**
   * Shows the name box text cursor while the name box has the focus on the Name step, the name field
   * is closed and the styler is not finished: blinking with ambient motion, steady under reduced motion.
   */
  private blinkNameCursor(): void {
    const onNameStep = this.placed !== null && this.placed.name !== null;
    const active = onNameStep && !this.finished && this.entry === null && this.state.focus.kind === 'nameBox';
    this.nameCursor.setVisible(active && nameCursorShown(this.cursorClock, this.motion().ambient));
  }

  /**
   * The texture key of the picture of `option`, at `index` on the current step, baked first when it
   * would show something new: the look so far with the option applied, in the applied Dream colour
   * (on Colour, in that morph's palette; on Dream colour, in that option's colour over the real morph),
   * at the still pose, cropped for the step and sized to fill the button inside its outline at the
   * device pixel ratio. Whole-axolotl pictures are drawn at their size factor, so Size options look
   * different. Each step and index has its own key, kept until destroy(), so going back to a step
   * bakes nothing that did not change; there are at most MAX_STEP_OPTIONS keys per step.
   */
  private bakePicture(option: StylerOption, index: number, rect: Rect): string {
    const { step, look, morph } = this.state;
    const key = `${this.pictureKeyStart}-${step}-${index}`;
    const field = stepLookField(step);
    const pictureLook = field === null ? look : lookWithOption(look, field, option.id);
    const pictureMorph = step === 'colour' ? (option.id as RealMorphId) : morph;
    const pictureDream = this.pictureDreamOf(option);
    const cropName = pictureCropOf(step);
    const crop = AXO_PREVIEW_CROPS[cropName];
    const inner = Math.max(1, rect.w - 2 * PICTURE_INSET);
    const unit = inner / Math.max(crop.maxX - crop.minX, crop.maxY - crop.minY);
    const scale = unit * this.dpr;
    const sizeFactor = cropName === 'whole' ? AXO_SIZE_SCALE[pictureLook.size] : 1;
    const sig = JSON.stringify([pictureLook, pictureMorph, pictureDream, cropName, scale]);
    if (this.pictureSigs.get(key) === sig) return key;
    bakeAxolotlStill(this.scene, key, {
      look: pictureLook,
      palette: axolotlPalette(pictureMorph, pictureDream),
      pose: STILL_POSE,
      crop,
      scale,
      sizeFactor,
    });
    this.pictureSigs.set(key, sig);
    return key;
  }

  /** The Dream colour a picture shows: on Dream colour the option's (none for the real colour), else the applied one. */
  private pictureDreamOf(option: StylerOption): DreamColourId | null {
    if (this.state.step !== 'dream') return this.state.dreamColour;
    return option.id === REAL_COLOUR_OPTION_ID ? null : (option.id as DreamColourId);
  }

  /**
   * Re-creates the preview texture at the preview scale x DPR texture px per local unit when that is
   * above the boot bake scale and differs from the current bake, so the preview is never upscaled.
   */
  private ensurePreviewBake(preview: StylerPreview | null): void {
    if (preview === null) return;
    const wanted = Math.max(this.baseBakeScale, preview.scale * this.dpr);
    if (Math.abs(wanted - this.preview.bakeScale) < 1e-6) return;
    this.preview = createAxolotlTexture(this.scene, this.previewKey, wanted, this.shownLook);
    this.lastPose = null;
  }

  /** Shows the look on the preview and places it, or hides it when the layout has no preview. */
  private refreshPreview(preview: StylerPreview | null): void {
    if (this.state.look !== this.shownLook) {
      this.shownLook = this.state.look;
      this.preview.setLook(this.shownLook);
    }
    this.previewImage.setVisible(preview !== null);
    if (preview === null) return;
    this.placePreview(preview);
    this.renderPreview();
  }

  /**
   * Shows the preview texture with local (0,0) at the anchor, at the preview scale CSS px per local
   * unit times the size scale (displayScale works in AXO_SCENE_SCALE units). A size change re-bakes
   * the texture, so the texture, origin and scale are applied every time.
   */
  private placePreview(preview: StylerPreview): void {
    const { info } = this.preview;
    this.previewImage
      .setTexture(this.preview.key)
      .setOrigin(info.originNormX, info.originNormY)
      .setPosition(preview.anchor.x, preview.anchor.y)
      .setScale(this.preview.displayScale(preview.scale / AXO_SCENE_SCALE));
  }

  /**
   * Paints the preview in the chosen morph and Dream colour's palette when the pose, the morph or the
   * Dream colour changed: the idle (with the Iridescent sheen gliding), or under reduced motion the
   * still frame (t = 1.0 s, eyes open, no sheen). Per-frame idle repaints (`dt` given) keep the
   * repaint budget, at most 30 a second while the frame rate is under 45; a first paint, a new morph
   * or Dream colour, the still pose and any call without `dt` paint at once.
   */
  private renderPreview(dt?: number): void {
    const motion = this.motion();
    const t = motion.ambient ? this.clock : T_STATIC;
    const pose: AxolotlPose = {
      swimPhase: (TAU * t) / SWIM_PERIOD_S,
      gillPhase: (TAU * (motion.gillFlutter ? t : T_STATIC)) / GILL_PERIOD_S,
      blink: motion.ambient ? blinkAt(t) : 1,
      tailAmp: 1,
      sparkle: 0,
      sheen: motion.ambient ? dreamSheenAt(this.clock) : undefined,
    };
    const { morph, dreamColour } = this.state;
    const paletteKey = `${morph}|${dreamColour ?? ''}`;
    if (this.lastPose !== null && this.paintedPalette === paletteKey) {
      if (samePose(pose, this.lastPose) && pose.sheen === this.lastPose.sheen) return;
      if (dt !== undefined && motion.ambient) {
        this.redrawAcc += dt;
        if (this.scene.game.loop.actualFps < LOW_FPS && this.redrawAcc < LOW_FPS_REDRAW_S) return;
      }
    }
    this.redrawAcc = 0;
    this.preview.redraw(pose, axolotlPalette(morph, dreamColour));
    this.lastPose = pose;
    this.paintedPalette = paletteKey;
  }
}
