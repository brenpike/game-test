import * as Phaser from 'phaser';
import { AXO_SCENE_SCALE, AXO_TEX, type AxolotlPose } from '../art/drawAxolotl';
import { AXO_SIZE_SCALE } from '../art/drawAxolotlParts';
import { BUTTON_PRESS_OFFSET, ICON_SIZE } from '../art/drawUi';
import type { MorphTextures } from '../art/morphTextures';
import { HOME_TANK_WALL, INK, LW, MORPH_PALETTES, T_STATIC, UI_PANEL, WHITE } from '../art/palette';
import {
  bakeSizedButton,
  buttonKey,
  createAxolotlTexture,
  iconKey,
  type AxolotlTexture,
  type BakedTextures,
  type ButtonVisual,
  type TexInfo,
} from '../art/textures';
import type { AxolotlLook } from '../logic/axolotlLook';
import { NAME_FIELD_RAW_MAX, fitNameEdit } from '../logic/axolotlNames';
import type { Rect, Size } from '../logic/hudLayout';
import type { RealMorphId } from '../logic/morphs';
import type { MotionProfile } from '../logic/motion';
import {
  STYLER_PART_LABELS,
  createStylerState,
  reduceStyler,
  setName,
  stylerChoiceBadge,
  stylerChoiceLabel,
  stylerChoiceSteps,
  type StylerAction,
  type StylerAxolotl,
  type StylerEffect,
  type StylerState,
} from '../logic/styler';
import {
  CANCEL_LABEL,
  CREATOR_TITLE,
  DONE_LABEL,
  NAME_FIELD_LABEL,
  RESTYLE_TITLE,
  SURPRISE_ME_LABEL,
} from '../logic/stylerText';
import {
  CANCEL_BUTTON,
  CHOICE_BADGE_PX,
  DONE_BUTTON,
  STEPPER_PX,
  SURPRISE_BUTTON,
  VALUE_TEXT_PX,
  choiceValueContent,
  stylerLayout,
  type StepperRow,
  type StylerLayout,
  type StylerMeasure,
  type StylerMode,
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
const TITLE_PX = 28;
const BACKDROP_COVER = 8192;
const MAX_STEP_S = 0.05;
const SWIM_PERIOD_S = 1.2;
const GILL_PERIOD_S = 0.8;
const VALUE_BOX_RADIUS = 18;
/** The largest size scale (art guide 6o): the preview always has room for it. */
const PREVIEW_LARGEST_SIZE = Math.max(...Object.values(AXO_SIZE_SCALE));
/** Double focus ring just outside the 3.5 px outline, as on the baked buttons (art guide 8). */
const RING_LINE = 3;
const RING_INNER = LW / 2 + 1.5;
const RING_OUTER = LW / 2 + 4.5;

let previewCount = 0;

/** How the styler is used, and who hears when it finishes. */
export interface AxolotlStylerOptions {
  /** The first-launch creator, or restyling an owned axolotl (adds Cancel and Escape). */
  mode: StylerMode;
  /** The current motion profile, read every frame, so turning reduced motion on stills the preview at once. */
  motion: () => MotionProfile;
  /** The name, look and morph the styler starts from. Restyle shows the morph read-only. */
  initial: StylerAxolotl;
  /** Done: the finished name, look and morph (the initial morph in restyle). Called at most once. */
  onDone: (axolotl: StylerAxolotl) => void;
  /** Cancel or Escape in restyle: leave without keeping changes. Required in restyle. Called at most once. */
  onCancel?: () => void;
}

/** The parts of a keydown the styler reads. */
export type StylerKeyEvent = Pick<KeyboardEvent, 'key' | 'shiftKey' | 'repeat'>;

/** A 48 px chevron stepper button: a secondary body with a left or right chevron, no label. */
interface Chevron {
  container: Phaser.GameObjects.Container;
  setFocused(focused: boolean): void;
  /** Shows the chevron and takes presses, or hides it and ignores them. */
  setEnabled(enabled: boolean): void;
}

/** Sets `text` to wrap at `wrapW` and returns its size. */
function wrappedSize(text: Phaser.GameObjects.Text, wrapW: number): Size {
  text.setWordWrapWidth(Math.max(1, wrapW), true);
  return { w: text.width, h: text.height };
}

/** Centres `text` in `rect`. */
function centreText(text: Phaser.GameObjects.Text, rect: Rect): void {
  text.setPosition(rect.x + (rect.w - text.width) / 2, rect.y + (rect.h - text.height) / 2);
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

/** Draws one value box in panel style (white, ink outline), with the focus ring when `focused`. */
function drawValueBox(graphics: Phaser.GameObjects.Graphics, rect: Rect, focused: boolean): void {
  const radius = Math.min(rect.h / 2, VALUE_BOX_RADIUS);
  if (focused) strokeFocusRing(graphics, rect, radius);
  graphics.fillStyle(cssColor(UI_PANEL).color, 1);
  graphics.fillRoundedRect(rect.x, rect.y, rect.w, rect.h, radius);
  graphics.lineStyle(LW, cssColor(INK).color, 1);
  graphics.strokeRoundedRect(rect.x, rect.y, rect.w, rect.h, radius);
}

/**
 * Builds a STEPPER_PX square chevron button at (0, 0): the secondary body baked at that size (with
 * its pressed and focused visuals) and the 32 px chevron icon centred on it. Presses on release, as
 * createButton does.
 */
function createChevron(
  scene: Phaser.Scene,
  baked: BakedTextures,
  icon: 'left' | 'right',
  onPress: () => void,
): Chevron {
  const bakeScale = baked.info[buttonKey('secondary', 'square', 'normal')].scale;
  const bodies = bakeSizedButton(scene, 'secondary', STEPPER_PX, STEPPER_PX, bakeScale);
  const body = scene.add
    .image(0, 0, bodies.normal.key)
    .setOrigin(bodies.normal.originNormX, bodies.normal.originNormY)
    .setScale(1 / bodies.normal.scale);
  const iconImage = scene.add
    .image(0, 0, iconKey(icon))
    .setOrigin(0, 0)
    .setScale(1 / baked.icons[icon].scale);
  const container = scene.add.container(0, 0, [body, iconImage]);
  const inset = (STEPPER_PX - ICON_SIZE) / 2;
  let focused = false;
  let pressed = false;

  const refresh = (): void => {
    const visual: ButtonVisual = pressed ? 'pressed' : focused ? 'focused' : 'normal';
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
    setFocused(next: boolean): void {
      focused = next;
      refresh();
    },
    setEnabled(enabled: boolean): void {
      if (enabled === container.visible) return;
      container.setVisible(enabled);
      if (enabled) {
        body.setInteractive({ useHandCursor: true });
        return;
      }
      body.disableInteractive(true);
      release();
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

/** Places a stepper row's chevrons. */
function placeChevrons(row: StepperRow, back: Chevron, next: Chevron): void {
  back.container.setPosition(row.back.x, row.back.y);
  next.container.setPosition(row.next.x, row.next.y);
}

/**
 * The axolotl styler, shared by the character creator (PRD F1 to F3) and the restyle screen (PRD
 * F6): an opaque #fff1d6 backdrop that takes every press, a white panel with the title, the live
 * preview, the part stepper (which part) and the choice stepper (that part's choice, or the name),
 * Surprise me, Done, and Cancel in restyle only, placed by stylerLayout(). Every option shows as text
 * (PRD F16); the Colour choice also shows its morph badge, so it never relies on colour alone. In
 * restyle the Colour choice is read-only: its chevrons are hidden. Every press and key goes through
 * reduceStyler(); option changes show at once, with no tweens. The preview paints in the chosen
 * morph's palette, idles (tail, gills, blink, no bob) and is a still pose under reduced motion.
 * Pressing the name value, or Enter on it, opens the name text field over the choice value box.
 * After Done or Cancel the styler ignores further input; the owner destroys it.
 */
export class AxolotlStyler {
  private readonly scene: Phaser.Scene;
  private readonly baseBakeScale: number;
  private readonly motion: () => MotionProfile;
  private readonly onDone: (axolotl: StylerAxolotl) => void;
  private readonly onCancel: (() => void) | undefined;
  private readonly previewKey: string;
  private readonly container: Phaser.GameObjects.Container;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly valueBoxes: Phaser.GameObjects.Graphics;
  private readonly previewImage: Phaser.GameObjects.Image;
  private readonly title: Phaser.GameObjects.Text;
  private readonly partText: Phaser.GameObjects.Text;
  private readonly choiceText: Phaser.GameObjects.Text;
  private readonly choiceBadge: Phaser.GameObjects.Image;
  private readonly morphBadges: MorphTextures['badges'][typeof CHOICE_BADGE_PX];
  private readonly choiceHit: Phaser.GameObjects.Zone;
  private readonly partBack: Chevron;
  private readonly partNext: Chevron;
  private readonly choiceBack: Chevron;
  private readonly choiceNext: Chevron;
  private readonly surpriseButton: UiButton;
  private readonly doneButton: UiButton;
  private readonly cancelButton: UiButton | null;
  private preview: AxolotlTexture;
  private shownLook: AxolotlLook;
  private lastPose: AxolotlPose | null = null;
  private paintedMorph: RealMorphId | null = null;
  private state: StylerState;
  private view: SceneView;
  private dpr: number;
  private placed: StylerLayout | null = null;
  private clock = 0;
  private choicePressed = false;
  private entry: TextEntry | null = null;
  private nameBeforeTyping = '';
  private captureWasOn = false;
  private finished = false;

  constructor(scene: Phaser.Scene, assets: GameAssets, view: SceneView, depth: number, options: AxolotlStylerOptions) {
    if (options.mode === 'restyle' && options.onCancel === undefined) {
      throw new Error('AxolotlStyler: restyle needs onCancel');
    }
    this.scene = scene;
    this.view = view;
    this.dpr = view.fit.dpr;
    this.motion = options.motion;
    this.onDone = options.onDone;
    this.onCancel = options.onCancel;
    this.state = createStylerState(options.mode, options.initial);
    this.baseBakeScale = assets.axolotl.bakeScale;
    this.previewKey = `styler-preview-${previewCount++}`;
    this.shownLook = this.state.look;
    this.preview = createAxolotlTexture(scene, this.previewKey, this.baseBakeScale, this.shownLook);

    const backdrop = scene.add
      .rectangle(-BACKDROP_COVER / 2, -BACKDROP_COVER / 2, BACKDROP_COVER, BACKDROP_COVER, cssColor(HOME_TANK_WALL).color, 1)
      .setOrigin(0, 0)
      .setInteractive();
    this.panel = scene.add.graphics();
    this.valueBoxes = scene.add.graphics();
    this.previewImage = scene.add.image(0, 0, this.previewKey);
    const titleText = options.mode === 'restyle' ? RESTYLE_TITLE : CREATOR_TITLE;
    this.title = scene.add.text(0, 0, titleText, { ...uiTextStyle(TITLE_PX, this.dpr), align: 'center' });
    this.partText = scene.add.text(0, 0, '', uiTextStyle(VALUE_TEXT_PX, this.dpr));
    this.choiceText = scene.add.text(0, 0, '', uiTextStyle(VALUE_TEXT_PX, this.dpr));
    this.morphBadges = assets.morph.badges[CHOICE_BADGE_PX];
    this.choiceBadge = scene.add.image(0, 0, this.morphBadges.triangle.key).setVisible(false);
    this.choiceHit = scene.add.zone(0, 0, 1, 1).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    this.bindChoiceHit();
    const { baked } = assets;
    this.partBack = createChevron(scene, baked, 'left', () => this.dispatch({ type: 'partBack' }));
    this.partNext = createChevron(scene, baked, 'right', () => this.dispatch({ type: 'partNext' }));
    this.choiceBack = createChevron(scene, baked, 'left', () => this.dispatch({ type: 'choiceBack' }));
    this.choiceNext = createChevron(scene, baked, 'right', () => this.dispatch({ type: 'choiceNext' }));
    this.surpriseButton = this.createStylerButton(baked, 'surprise');
    this.doneButton = this.createStylerButton(baked, 'done');
    this.cancelButton = options.mode === 'restyle' ? this.createStylerButton(baked, 'cancel') : null;

    const buttons = [this.surpriseButton, this.doneButton, this.cancelButton].filter(
      (button): button is UiButton => button !== null,
    );
    this.container = scene.add
      .container(0, 0, [
        backdrop,
        this.panel,
        this.valueBoxes,
        this.previewImage,
        this.title,
        this.partText,
        this.choiceText,
        this.choiceBadge,
        this.choiceHit,
        ...[this.partBack, this.partNext, this.choiceBack, this.choiceNext].map((chevron) => chevron.container),
        ...buttons.map((button) => button.container),
      ])
      .setDepth(depth);
    this.layout(view);
  }

  /** Whether the name text field is open. Keys go to the field, not the styler, while it is. */
  isTyping(): boolean {
    return this.entry !== null;
  }

  /**
   * Handles a keydown through the styler reducer: Tab, Shift+Tab, up and down move focus; left and
   * right step the focused row; Enter and Space press, ignoring key repeat; Escape cancels in
   * restyle. Ignored while typing and after Done or Cancel.
   */
  handleKey(event: StylerKeyEvent): void {
    if (this.finished || this.entry !== null) return;
    if (event.repeat && tankKeyFor(event.key, event.shiftKey) === 'confirm') return;
    this.dispatch({ type: 'key', key: event.key, shiftKey: event.shiftKey });
  }

  /** Advances the preview idle by `deltaMs`; under reduced motion it holds the still pose. Call every frame. */
  update(_time: number, deltaMs: number): void {
    this.clock += Math.min(Math.max(deltaMs / 1000, 0), MAX_STEP_S);
    this.renderPreview();
  }

  /**
   * Lays the styler out for `view` with stylerLayout(): panel, title (hidden when it does not fit),
   * preview, steppers and buttons. Re-bakes the preview when it would otherwise be upscaled, and
   * moves an open name field to the new choice value box.
   */
  layout(view: SceneView): void {
    this.view = view;
    const measure: StylerMeasure = {
      titleAt: (wrapW) => wrappedSize(this.title, wrapW),
      previewFrame: AXO_TEX,
      previewLargestSize: PREVIEW_LARGEST_SIZE,
    };
    const placed = stylerLayout(view, measure, this.state.mode);
    this.placed = placed;
    const { panel } = placed;
    drawPanel(this.panel, panel.x, panel.y, panel.w, panel.h, UI_PANEL);
    this.title.setVisible(placed.title !== null);
    if (placed.title !== null) this.title.setPosition(placed.title.x, placed.title.y);
    placeChevrons(placed.part, this.partBack, this.partNext);
    placeChevrons(placed.choice, this.choiceBack, this.choiceNext);
    const value = placed.choice.value;
    this.choiceHit.setPosition(value.x, value.y).setSize(value.w, value.h);
    this.surpriseButton.container.setPosition(placed.surprise.x, placed.surprise.y);
    this.doneButton.container.setPosition(placed.done.x, placed.done.y);
    if (this.cancelButton !== null && placed.cancel !== null) {
      this.cancelButton.container.setPosition(placed.cancel.x, placed.cancel.y);
    }
    this.ensurePreviewBake();
    this.refresh();
    this.renderPreview();
    this.placeEntry();
  }

  /** Sets the text and button resolution to `dpr`, and re-bakes the preview for it. */
  setResolution(dpr: number): void {
    this.dpr = dpr;
    for (const text of [this.title, this.partText, this.choiceText]) {
      text.setResolution(dpr);
    }
    for (const button of [this.surpriseButton, this.doneButton, this.cancelButton]) {
      button?.setResolution(dpr);
    }
    if (this.placed === null) return;
    this.ensurePreviewBake();
    this.placePreview(this.placed);
    this.renderPreview();
  }

  /** Closes the name field without callbacks, then removes every object and the preview texture. */
  destroy(): void {
    this.finished = true;
    this.closeEntry();
    this.container.destroy();
    if (this.scene.textures.exists(this.previewKey)) this.scene.textures.remove(this.previewKey);
  }

  private createStylerButton(baked: BakedTextures, control: 'surprise' | 'done' | 'cancel'): UiButton {
    const done = control === 'done';
    const tile = control === 'surprise' ? SURPRISE_BUTTON : CANCEL_BUTTON;
    return createButton(this.scene, baked, {
      fill: done ? 'primary' : 'secondary',
      shape: done ? 'wide' : 'square',
      size: 1,
      width: done ? DONE_BUTTON.w : tile.w,
      label: control === 'surprise' ? SURPRISE_ME_LABEL : done ? DONE_LABEL : CANCEL_LABEL,
      icon: control === 'surprise' ? 'surprise' : done ? 'check' : 'close',
      dpr: this.dpr,
      pressOnDown: false,
      onPress: () => this.dispatch({ type: control }),
    });
  }

  /** A press and release on the choice value is a name tap (it opens the name field on the Name part). */
  private bindChoiceHit(): void {
    this.choiceHit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.choicePressed = true;
    });
    this.choiceHit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
      this.choicePressed = false;
    });
    this.choiceHit.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.releaseChoice());
  }

  /** Taps the name value when the press began on it. Runs inside the pointer handler, so the field can open. */
  private releaseChoice(): void {
    const wasPressed = this.choicePressed;
    this.choicePressed = false;
    if (wasPressed) this.dispatch({ type: 'nameTap' });
  }

  /**
   * Runs one action through the reducer, redraws, and acts on its effect. A press while typing
   * keeps the typed name first.
   */
  private dispatch(action: StylerAction): void {
    if (this.finished) return;
    this.closeEntry();
    const result = reduceStyler(this.state, action, Math.random);
    this.state = result.state;
    this.refresh();
    this.applyEffect(result.effect);
  }

  private applyEffect(effect: StylerEffect | undefined): void {
    if (effect === undefined) return;
    if (effect.type === 'startTyping') {
      this.startTyping();
      return;
    }
    this.finished = true;
    if (effect.type === 'done') {
      this.onDone({ name: effect.name, look: effect.look, morph: effect.morph });
      return;
    }
    if (this.onCancel === undefined) throw new Error('AxolotlStyler: cancel without onCancel');
    this.onCancel();
  }

  /**
   * Opens the name field over the choice value box, synchronously, so a pointer or key gesture can
   * raise the on-screen keyboard. Phaser's global key capture pauses so Space and Backspace type.
   */
  private startTyping(): void {
    const keyboard = this.scene.input.keyboard;
    this.captureWasOn = keyboard?.manager.preventDefault === true;
    keyboard?.disableGlobalCapture();
    this.nameBeforeTyping = this.state.name;
    this.entry = openTextEntry({
      value: this.state.name,
      maxRawLength: NAME_FIELD_RAW_MAX,
      fitEdit: fitNameEdit,
      ariaLabel: NAME_FIELD_LABEL,
      onInput: (raw) => this.showTypedName(raw),
      onCommit: (raw) => this.commitTypedName(raw),
      onCancel: () => this.cancelTyping(),
    });
    this.placeEntry();
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

  /** Moves an open name field over the choice value box, mapped from canvas CSS px to client px. */
  private placeEntry(): void {
    if (this.entry === null || this.placed === null) return;
    this.entry.place(this.clientRectOf(this.placed.choice.value));
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
   * Redraws the state: part and choice text, the Colour badge, value boxes with the focus ring, the
   * choice chevrons (hidden while the choice does not step), button focus, and the preview look and morph.
   */
  private refresh(): void {
    const placed = this.placed;
    if (placed === null) return;
    const focus = this.state.focus;
    const steps = stylerChoiceSteps(this.state);
    this.partText.setText(STYLER_PART_LABELS[this.state.part]);
    this.choiceText.setText(stylerChoiceLabel(this.state));
    centreText(this.partText, placed.part.value);
    this.placeChoiceContent(placed);
    this.valueBoxes.clear();
    drawValueBox(this.valueBoxes, placed.part.value, focus === 'part');
    drawValueBox(this.valueBoxes, placed.choice.value, focus === 'choice');
    this.partBack.setFocused(focus === 'part');
    this.partNext.setFocused(focus === 'part');
    this.choiceBack.setEnabled(steps);
    this.choiceNext.setEnabled(steps);
    this.choiceBack.setFocused(steps && focus === 'choice');
    this.choiceNext.setFocused(steps && focus === 'choice');
    this.surpriseButton.setFocused(focus === 'surprise');
    this.doneButton.setFocused(focus === 'done');
    this.cancelButton?.setFocused(focus === 'cancel');
    if (this.state.look !== this.shownLook) {
      this.shownLook = this.state.look;
      this.preview.setLook(this.shownLook);
    }
    this.placePreview(placed);
    this.renderPreview();
  }

  /** Places the choice text and, on the Colour part, its CHOICE_BADGE_PX morph badge, by choiceValueContent(). */
  private placeChoiceContent(placed: StylerLayout): void {
    const shape = stylerChoiceBadge(this.state);
    const textSize: Size = { w: this.choiceText.width, h: this.choiceText.height };
    const content = choiceValueContent(placed.choice.value, textSize, shape !== null);
    this.choiceText.setPosition(content.text.x, content.text.y);
    placeBadge(this.choiceBadge, shape === null ? null : this.morphBadges[shape], content.badge);
  }

  /**
   * Re-creates the preview texture at previewScale x DPR texture px per local unit when that is
   * above the boot bake scale and differs from the current bake, so the preview is never upscaled.
   */
  private ensurePreviewBake(): void {
    if (this.placed === null) return;
    const wanted = Math.max(this.baseBakeScale, this.placed.previewScale * this.dpr);
    if (Math.abs(wanted - this.preview.bakeScale) < 1e-6) return;
    this.preview = createAxolotlTexture(this.scene, this.previewKey, wanted, this.shownLook);
    this.lastPose = null;
  }

  /**
   * Shows the preview texture with local (0,0) at previewAnchor, at previewScale CSS px per local
   * unit times the size scale (displayScale works in AXO_SCENE_SCALE units). A size change re-bakes
   * the texture, so the texture, origin and scale are applied every time.
   */
  private placePreview(placed: StylerLayout): void {
    const { info } = this.preview;
    this.previewImage
      .setTexture(this.preview.key)
      .setOrigin(info.originNormX, info.originNormY)
      .setPosition(placed.previewAnchor.x, placed.previewAnchor.y)
      .setScale(this.preview.displayScale(placed.previewScale / AXO_SCENE_SCALE));
  }

  /**
   * Paints the preview in the chosen morph's palette when the pose or the morph changed: the idle, or
   * under reduced motion the still frame (t = 1.0 s, eyes open).
   */
  private renderPreview(): void {
    const motion = this.motion();
    const t = motion.ambient ? this.clock : T_STATIC;
    const pose: AxolotlPose = {
      swimPhase: (TAU * t) / SWIM_PERIOD_S,
      gillPhase: (TAU * (motion.gillFlutter ? t : T_STATIC)) / GILL_PERIOD_S,
      blink: motion.ambient ? blinkAt(t) : 1,
      tailAmp: 1,
      sparkle: 0,
    };
    const morph = this.state.morph;
    if (this.lastPose !== null && this.paintedMorph === morph && samePose(pose, this.lastPose)) return;
    this.preview.redraw(pose, MORPH_PALETTES[morph]);
    this.lastPose = pose;
    this.paintedMorph = morph;
  }
}
