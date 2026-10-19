import * as Phaser from 'phaser';
import { INK, LW, UI_PANEL, WHITE } from '../art/palette';
import { TANK_DECORATION_SLUGS, type TankDecorationSlug, type TankTextures } from '../art/tankTextures';
import type { BakedTextures, TexInfo } from '../art/textures';
import type { TreasureTextures } from '../art/treasureTextures';
import { treasureById, treasureSlug } from '../logic/catalogue';
import type { Rect } from '../logic/hudLayout';
import type { MotionProfile } from '../logic/motion';
import {
  TANK_SWAYING_DECORATIONS,
  cssToTank,
  decorationFootprint,
  drawOrder,
  isValidPlacement,
  moveDecoration,
  nudge,
  ownedDecorations,
  placeDecoration,
  placementOf,
  putAway,
  suggestSpot,
  tankToCss,
  type TankChange,
  type TankDirection,
  type TankFrame,
  type TankLayout,
  type TankResult,
} from '../logic/tank';
import {
  ALL_DECORATIONS_PLACED,
  DECORATE_HINT,
  DONE_LABEL,
  NO_DECORATIONS_TO_PLACE,
  PUT_AWAY_LABEL,
} from '../logic/tankText';
import { TRAY_PX, UI, decorateLayout, nextFocusIndex, type DecorateLayout, type TankKey } from '../logic/tankUi';
import type { Point } from '../logic/zone';
import { createButton, cssColor, drawPanel, uiTextStyle, type SceneView, type UiButton } from './BootScene';
import { addTreasureIcon } from './FindPopup';

const CAPTION_PX = 18;
const TRAY_ICON_PX = 48;
const PUT_AWAY_SIZE = 0.8;
const DRAG_THRESHOLD_PX = 8;
const GHOST_ALPHA = 0.5;
const INVALID_GHOST_MS = 700;
const SWAY_RAD = 0.05;
const SWAY_PERIOD_S = 4;
const DEPTH_STEP = 0.01;
const RING_RADIUS_PX = 18;
const RING_LINE_PX = 3;
const RING_INNER_PX = LW / 2 + 1.5;
const RING_OUTER_PX = LW / 2 + 4.5;
const DASH_PX = 8;
const DASH_GAP_PX = 6;

/** Textures the decorator draws with. */
export interface TankDecoratorTextures {
  baked: BakedTextures;
  treasure: TreasureTextures;
  tank: TankTextures;
}

/** Display depths: placed Decorations stack up from `decorations`; the toolbar, rings and ghost sit at `ui`. */
export interface TankDecoratorDepths {
  decorations: number;
  ui: number;
}

/** What the decorator needs from its scene. */
export interface TankDecoratorOptions {
  scene: Phaser.Scene;
  textures: TankDecoratorTextures;
  depths: TankDecoratorDepths;
  dpr: number;
  /** Called after every placement, move and put away with the new layout. */
  onLayoutChange: (layout: TankLayout) => void;
  /** Called when the player presses Done or cancels. */
  onDone: () => void;
}

/** A keyboard focus target in decorate mode. */
type FocusTarget = { kind: 'tray' | 'placed'; id: string } | { kind: 'putAway' | 'done' };

/** One placed Decoration image and the texture it shows. */
interface DecorationSprite {
  image: Phaser.GameObjects.Image;
  info: TexInfo;
  sways: boolean;
}

/** One tray square: a white panel with the 48 px treasure icon and a hit zone. */
interface TrayButton {
  id: string;
  container: Phaser.GameObjects.Container;
}

/** A touch drag of a placed Decoration by its first pointer. */
interface DragState {
  id: string;
  pointerId: number;
  start: Point;
  grab: Point;
  moving: boolean;
  target: Point;
}

/** Stable string for a focus target, so targets compare by value. */
function focusKey(target: FocusTarget): string {
  return 'id' in target ? `${target.kind}:${target.id}` : target.kind;
}

/** Whether `slug` names a baked Home Tank Decoration. */
function isTankDecorationSlug(slug: string): slug is TankDecorationSlug {
  return (TANK_DECORATION_SLUGS as readonly string[]).includes(slug);
}

/** The Home Tank texture for the Decoration `id`. Throws when none is baked for its slug. */
function decorationTexture(tank: TankTextures, id: string): TexInfo {
  const slug = treasureSlug(id);
  if (!isTankDecorationSlug(slug)) throw new Error(`TankDecorator: no tank texture for Decoration ${id}`);
  return tank.decorations[slug];
}

/** Display name of the treasure `id`. Throws for an unknown id. */
function treasureName(id: string): string {
  const treasure = treasureById(id);
  if (treasure === undefined) throw new Error(`TankDecorator: unknown treasure ${id}`);
  return treasure.name;
}

/** Strokes a rounded rect `outset` px outside `rect` with the current line style. */
function strokeOutset(graphics: Phaser.GameObjects.Graphics, rect: Rect, outset: number): void {
  graphics.strokeRoundedRect(
    rect.x - outset,
    rect.y - outset,
    rect.w + 2 * outset,
    rect.h + 2 * outset,
    RING_RADIUS_PX + outset,
  );
}

/** The double focus ring (art guide 8) round `rect`: inner white, outer ink, both opaque. */
function strokeDoubleRing(graphics: Phaser.GameObjects.Graphics, rect: Rect): void {
  graphics.lineStyle(RING_LINE_PX, cssColor(WHITE).color, 1);
  strokeOutset(graphics, rect, RING_INNER_PX);
  graphics.lineStyle(RING_LINE_PX, cssColor(INK).color, 1);
  strokeOutset(graphics, rect, RING_OUTER_PX);
}

/** Strokes a dashed line from `from` to `to` with the current line style. */
function strokeDashedLine(graphics: Phaser.GameObjects.Graphics, from: Point, to: Point): void {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (!(length > 0)) return;
  const unitX = (to.x - from.x) / length;
  const unitY = (to.y - from.y) / length;
  for (let along = 0; along < length; along += DASH_PX + DASH_GAP_PX) {
    const end = Math.min(length, along + DASH_PX);
    graphics.lineBetween(from.x + unitX * along, from.y + unitY * along, from.x + unitX * end, from.y + unitY * end);
  }
}

/** A dashed ink outline along the edges of `rect` (art guide 7f, invalid move). */
function strokeDashedRect(graphics: Phaser.GameObjects.Graphics, rect: Rect): void {
  const topLeft = { x: rect.x, y: rect.y };
  const topRight = { x: rect.x + rect.w, y: rect.y };
  const bottomRight = { x: rect.x + rect.w, y: rect.y + rect.h };
  const bottomLeft = { x: rect.x, y: rect.y + rect.h };
  graphics.lineStyle(LW, cssColor(INK).color, 1);
  strokeDashedLine(graphics, topLeft, topRight);
  strokeDashedLine(graphics, topRight, bottomRight);
  strokeDashedLine(graphics, bottomRight, bottomLeft);
  strokeDashedLine(graphics, bottomLeft, topLeft);
}

/**
 * Draws the placed Decorations in the Home Tank and runs decorate mode (PRD C9, X5): a toolbar of
 * tray squares for owned Decorations not yet placed, Put away and Done, and a caption. Placing,
 * moving and putting away go through src/logic/tank, so a Decoration is placed at most once and
 * never outside the tank. Works by touch (tap, drag with a ghost) and by keyboard (focus cycling,
 * arrow nudges, confirm, cancel, put away). The scene owns layout persistence via onLayoutChange.
 */
export class TankDecorator {
  private readonly scene: Phaser.Scene;
  private readonly options: TankDecoratorOptions;
  private readonly banked: readonly string[];
  private readonly owned: readonly string[];
  private readonly sprites = new Map<string, DecorationSprite>();
  private readonly toolbar: Phaser.GameObjects.Container;
  private readonly caption: Phaser.GameObjects.Text;
  private readonly putAwayButton: UiButton;
  private readonly doneButton: UiButton;
  private readonly rings: Phaser.GameObjects.Graphics;
  private readonly ghostImage: Phaser.GameObjects.Image;
  private readonly ghostMarks: Phaser.GameObjects.Graphics;
  private readonly noIcon: Phaser.GameObjects.Image;
  private tankLayout: TankLayout;
  private trayButtons: TrayButton[] = [];
  private view: SceneView | null = null;
  private frame: TankFrame | null = null;
  private decorate: DecorateLayout | null = null;
  private active = false;
  private focus: FocusTarget | null = null;
  private selection: string | null = null;
  private drag: DragState | null = null;
  private trayPressId: string | null = null;
  private invalidTimer: Phaser.Time.TimerEvent | null = null;

  constructor(options: TankDecoratorOptions, layout: TankLayout, banked: readonly string[]) {
    this.scene = options.scene;
    this.options = options;
    this.tankLayout = layout;
    this.banked = [...banked];
    this.owned = ownedDecorations(banked);
    const { scene, textures, depths, dpr } = options;
    this.caption = scene.add.text(0, 0, '', { ...uiTextStyle(CAPTION_PX, dpr, false), align: 'center' });
    this.putAwayButton = createButton(scene, textures.baked, {
      fill: 'secondary',
      shape: 'wide',
      size: PUT_AWAY_SIZE,
      label: PUT_AWAY_LABEL,
      icon: 'putAway',
      dpr,
      pressOnDown: false,
      onPress: () => this.putAwaySelected(),
    });
    this.doneButton = createButton(scene, textures.baked, {
      fill: 'primary',
      shape: 'wide',
      size: 1,
      label: DONE_LABEL,
      icon: 'check',
      dpr,
      pressOnDown: false,
      onPress: () => this.pressDone(),
    });
    this.toolbar = scene.add
      .container(0, 0, [this.caption, this.putAwayButton.container, this.doneButton.container])
      .setDepth(depths.ui)
      .setVisible(false);
    this.rings = scene.add.graphics().setDepth(depths.ui + DEPTH_STEP);
    const noIconInfo = textures.tank.noIcon;
    this.ghostImage = scene.add.image(0, 0, noIconInfo.key).setAlpha(GHOST_ALPHA).setDepth(depths.ui + 2 * DEPTH_STEP);
    this.ghostMarks = scene.add.graphics().setDepth(depths.ui + 3 * DEPTH_STEP);
    this.noIcon = scene.add
      .image(0, 0, noIconInfo.key)
      .setOrigin(noIconInfo.originNormX, noIconInfo.originNormY)
      .setScale(1 / noIconInfo.scale)
      .setDepth(depths.ui + 4 * DEPTH_STEP);
    this.hideGhost();
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handlePointerUp, this);
    this.syncDecorations();
  }

  /** Places the Decorations and the toolbar for a new canvas size. Cancels any drag or ghost. */
  layout(view: SceneView, frame: TankFrame): void {
    this.view = view;
    this.frame = frame;
    this.cancelDrag();
    this.refresh();
  }

  setResolution(dpr: number): void {
    this.caption.setResolution(dpr);
    this.putAwayButton.setResolution(dpr);
    this.doneButton.setResolution(dpr);
    this.relayoutToolbar();
  }

  /** Sways the plant Decorations about their base at full motion; holds them upright under reduced motion. */
  update(timeS: number, motion: MotionProfile): void {
    const angle = motion.reedSway ? SWAY_RAD * Math.sin((2 * Math.PI * timeS) / SWAY_PERIOD_S) : 0;
    for (const sprite of this.sprites.values()) {
      if (sprite.sways) sprite.image.setRotation(angle);
    }
  }

  /** Starts decorate mode: shows the toolbar and makes the placed Decorations pressable, with no focus yet. */
  enter(): void {
    this.active = true;
    this.selection = null;
    this.focus = null;
    this.toolbar.setVisible(true);
    for (const sprite of this.sprites.values()) sprite.image.setInteractive({ useHandCursor: true });
    this.refresh();
  }

  /** Ends decorate mode: cancels any drag or ghost, clears focus and selection, hides the toolbar. */
  exit(): void {
    this.cancelDrag();
    this.active = false;
    this.selection = null;
    this.focus = null;
    this.trayPressId = null;
    this.toolbar.setVisible(false);
    for (const sprite of this.sprites.values()) sprite.image.disableInteractive();
    this.applyFocusVisuals();
  }

  isActive(): boolean {
    return this.active;
  }

  /** Runs a Home Tank key in decorate mode; ignored when not active. */
  handleKey(key: TankKey): void {
    if (!this.active) return;
    switch (key) {
      case 'next':
        return this.stepFocus(1);
      case 'previous':
        return this.stepFocus(-1);
      case 'confirm':
        return this.confirmFocus();
      case 'cancel':
        return this.pressDone();
      case 'putAway':
        return this.putAwaySelected();
      default:
        return this.handleArrow(key);
    }
  }

  destroy(): void {
    this.cancelDrag();
    const input = this.scene.input;
    input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
    input.off(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
    input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handlePointerUp, this);
    for (const sprite of this.sprites.values()) sprite.image.destroy();
    this.sprites.clear();
    this.trayButtons = [];
    this.toolbar.destroy();
    this.rings.destroy();
    this.ghostImage.destroy();
    this.ghostMarks.destroy();
    this.noIcon.destroy();
  }

  /** Brings images, tray, toolbar and rings in line with the layout, selection and focus. */
  private refresh(): void {
    this.syncDecorations();
    this.syncTray();
    if (this.selection !== null && placementOf(this.tankLayout, this.selection) === undefined) this.selection = null;
    const focus = this.focus;
    if (focus !== null && !this.focusTargets().some((target) => focusKey(target) === focusKey(focus))) {
      this.focus = null;
    }
    this.applyFocusVisuals();
  }

  /** One image per placement, stacked by drawOrder within the decorations depth. */
  private syncDecorations(): void {
    for (const [id, sprite] of this.sprites) {
      if (placementOf(this.tankLayout, id) !== undefined) continue;
      sprite.image.destroy();
      this.sprites.delete(id);
    }
    drawOrder(this.tankLayout).forEach((placement, index) => {
      const sprite = this.sprites.get(placement.id) ?? this.addDecorationSprite(placement.id);
      sprite.image.setDepth(this.options.depths.decorations + index * DEPTH_STEP);
      this.positionImage(sprite, sprite.image, placement);
    });
  }

  private addDecorationSprite(id: string): DecorationSprite {
    const info = decorationTexture(this.options.textures.tank, id);
    const image = this.scene.add.image(0, 0, info.key).setOrigin(info.originNormX, info.originNormY);
    image.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (pointer: Phaser.Input.Pointer) =>
      this.handleDecorationDown(id, pointer),
    );
    if (this.active) image.setInteractive({ useHandCursor: true });
    const sprite: DecorationSprite = { image, info, sways: TANK_SWAYING_DECORATIONS.includes(id) };
    this.sprites.set(id, sprite);
    return sprite;
  }

  /** Puts a base-anchored image at the tank point `pos`, scaled to the tank frame. */
  private positionImage(sprite: DecorationSprite, image: Phaser.GameObjects.Image, pos: Point): void {
    const frame = this.frame;
    if (frame === null) return;
    const css = tankToCss(frame, pos);
    image.setPosition(css.x, css.y).setScale(frame.scale / sprite.info.scale);
  }

  /** Owned Decorations not in the tank, in catalogue order. */
  private trayIds(): string[] {
    return this.owned.filter((id) => placementOf(this.tankLayout, id) === undefined);
  }

  /** Rebuilds the tray squares when the set of unplaced Decorations changes. */
  private syncTray(): void {
    const ids = this.trayIds();
    if (ids.join('\n') === this.trayButtons.map((button) => button.id).join('\n')) return;
    for (const button of this.trayButtons) button.container.destroy();
    this.trayPressId = null;
    this.trayButtons = ids.map((id) => this.addTrayButton(id));
  }

  private addTrayButton(id: string): TrayButton {
    const scene = this.scene;
    const panel = scene.add.graphics();
    drawPanel(panel, 0, 0, TRAY_PX, TRAY_PX, UI_PANEL);
    const icon = addTreasureIcon(scene, this.options.textures.treasure, TRAY_ICON_PX, id).setPosition(
      TRAY_PX / 2,
      TRAY_PX / 2,
    );
    const zone = scene.add.zone(0, 0, TRAY_PX, TRAY_PX).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => this.handleTrayDown(id));
    zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.handleTrayUp(id));
    zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => this.handleTrayOut(id));
    const container = scene.add.container(0, 0, [panel, icon, zone]);
    this.toolbar.add(container);
    return { id, container };
  }

  /** The caption: the focused item's name, else the hint or the empty-tray message. */
  private captionText(): string {
    const focus = this.focus;
    if (focus !== null && 'id' in focus) return treasureName(focus.id);
    if (this.owned.length === 0) return NO_DECORATIONS_TO_PLACE;
    if (this.trayIds().length === 0) return ALL_DECORATIONS_PLACED;
    return DECORATE_HINT;
  }

  /** Lays the tray, Put away, Done and the caption out with decorateLayout. */
  private relayoutToolbar(): void {
    const view = this.view;
    const frame = this.frame;
    if (view === null || frame === null) return;
    this.caption.setWordWrapWidth(Math.max(1, view.cssW - 2 * UI.margin), true);
    this.caption.setText(this.captionText());
    const putAwaySize = { w: this.putAwayButton.width, h: this.putAwayButton.height };
    const doneSize = { w: this.doneButton.width, h: this.doneButton.height };
    const captionSize = { w: this.caption.width, h: this.caption.height };
    const decorate = decorateLayout(view, frame, this.trayButtons.length, {
      putAway: putAwaySize,
      done: doneSize,
      caption: captionSize,
    });
    this.decorate = decorate;
    this.trayButtons.forEach((button, index) => {
      const rect = decorate.tray[index];
      button.container.setPosition(rect.x, rect.y);
    });
    this.putAwayButton.container.setPosition(decorate.putAway.x, decorate.putAway.y);
    this.putAwayButton.container.setVisible(this.selection !== null);
    this.doneButton.container.setPosition(decorate.done.x, decorate.done.y);
    this.caption.setVisible(decorate.caption !== null);
    if (decorate.caption !== null) this.caption.setPosition(decorate.caption.x, decorate.caption.y);
  }

  /** Button focus states, the toolbar layout (the caption follows focus) and the rings. */
  private applyFocusVisuals(): void {
    const kind = this.focus?.kind;
    this.putAwayButton.setFocused(kind === 'putAway');
    this.doneButton.setFocused(kind === 'done');
    this.relayoutToolbar();
    this.drawRings();
  }

  /** Double rings round the focused tray square, the focused placed Decoration and the selection. */
  private drawRings(): void {
    this.rings.clear();
    const decorate = this.decorate;
    if (!this.active || decorate === null) return;
    const focus = this.focus;
    if (focus?.kind === 'tray') {
      const index = this.trayButtons.findIndex((button) => button.id === focus.id);
      if (index !== -1) strokeDoubleRing(this.rings, decorate.tray[index]);
    }
    const ringed = new Set<string>();
    if (focus?.kind === 'placed') ringed.add(focus.id);
    if (this.selection !== null) ringed.add(this.selection);
    for (const id of ringed) {
      const placement = placementOf(this.tankLayout, id);
      if (placement !== undefined) strokeDoubleRing(this.rings, this.footprintCss(placement));
    }
  }

  /** The Decoration footprint at base point `pos`, in CSS px. */
  private footprintCss(pos: Point): Rect {
    const frame = this.frame;
    const footprint = decorationFootprint(pos);
    if (frame === null) return footprint;
    const topLeft = tankToCss(frame, footprint);
    return { x: topLeft.x, y: topLeft.y, w: footprint.w * frame.scale, h: footprint.h * frame.scale };
  }

  /** Focus order: tray items, placed Decorations back to front, Put away when shown, Done. */
  private focusTargets(): FocusTarget[] {
    const tray = this.trayIds().map((id): FocusTarget => ({ kind: 'tray', id }));
    const placed = drawOrder(this.tankLayout).map((placement): FocusTarget => ({ kind: 'placed', id: placement.id }));
    const putAwayTarget: FocusTarget[] = this.selection !== null ? [{ kind: 'putAway' }] : [];
    return [...tray, ...placed, ...putAwayTarget, { kind: 'done' }];
  }

  private setFocus(target: FocusTarget | null): void {
    this.focus = target;
    this.applyFocusVisuals();
  }

  private stepFocus(step: number): void {
    const targets = this.focusTargets();
    const focus = this.focus;
    const current = focus === null ? -1 : targets.findIndex((target) => focusKey(target) === focusKey(focus));
    const next = nextFocusIndex(current, targets.length, step);
    this.setFocus(next === -1 ? null : targets[next]);
  }

  private confirmFocus(): void {
    const focus = this.focus;
    if (focus === null) return;
    switch (focus.kind) {
      case 'tray':
        return this.placeFromTray(focus.id);
      case 'placed':
        return this.selectPlaced(focus.id);
      case 'putAway':
        return this.putAwaySelected();
      case 'done':
        return this.pressDone();
    }
  }

  /** Arrows nudge a focused placed Decoration; otherwise left and right step the focus. */
  private handleArrow(direction: TankDirection): void {
    const focus = this.focus;
    if (focus?.kind === 'placed') return this.nudgePlaced(focus.id, direction);
    if (direction === 'left') return this.stepFocus(-1);
    if (direction === 'right') return this.stepFocus(1);
  }

  /** Stores a successful change's layout; false (and nothing changes) for any other result. */
  private applyChange(change: TankChange, expected: TankResult): boolean {
    if (change.result !== expected) return false;
    this.tankLayout = change.layout;
    return true;
  }

  /** Redraws after a stored change and reports the new layout. */
  private finishChange(): void {
    this.refresh();
    this.options.onLayoutChange(this.tankLayout);
  }

  /** Places a tray Decoration at the suggested spot, then selects and focuses it. */
  private placeFromTray(id: string): void {
    if (!this.active) return;
    const change = placeDecoration(this.tankLayout, this.banked, id, suggestSpot(this.tankLayout));
    if (!this.applyChange(change, 'placed')) return;
    this.selection = id;
    this.focus = { kind: 'placed', id };
    this.finishChange();
  }

  private selectPlaced(id: string): void {
    if (placementOf(this.tankLayout, id) === undefined) return;
    this.selection = id;
    this.setFocus({ kind: 'placed', id });
  }

  /** Puts the selection away; focus moves to its tray square. */
  private putAwaySelected(): void {
    const id = this.selection;
    if (!this.active || id === null) return;
    if (!this.applyChange(putAway(this.tankLayout, id), 'putAway')) return;
    this.cancelDrag();
    this.selection = null;
    this.focus = { kind: 'tray', id };
    this.finishChange();
  }

  private pressDone(): void {
    if (!this.active) return;
    this.options.onDone();
  }

  /** One keyboard step: moves when the new base point is valid, else shows the invalid ghost briefly. */
  private nudgePlaced(id: string, direction: TankDirection): void {
    const placement = placementOf(this.tankLayout, id);
    if (placement === undefined) return;
    const candidate = nudge(placement, direction);
    if (!isValidPlacement(candidate)) {
      this.showGhost(id, candidate);
      this.invalidTimer = this.scene.time.delayedCall(INVALID_GHOST_MS, this.hideGhost, [], this);
      return;
    }
    if (!this.applyChange(moveDecoration(this.tankLayout, id, candidate), 'moved')) return;
    this.hideGhost();
    this.selection = id;
    this.finishChange();
  }

  private handleTrayDown(id: string): void {
    if (this.active) this.trayPressId = id;
  }

  private handleTrayUp(id: string): void {
    const pressed = this.trayPressId === id;
    this.trayPressId = null;
    if (pressed) this.placeFromTray(id);
  }

  private handleTrayOut(id: string): void {
    if (this.trayPressId === id) this.trayPressId = null;
  }

  /** CSS point under `pointer`. */
  private pointerCss(pointer: Phaser.Input.Pointer): Point {
    const point = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    return { x: point.x, y: point.y };
  }

  /** Selects a pressed placed Decoration and readies a drag, for the first pointer only. */
  private handleDecorationDown(id: string, pointer: Phaser.Input.Pointer): void {
    const frame = this.frame;
    const placement = placementOf(this.tankLayout, id);
    if (!this.active || this.drag !== null || frame === null || placement === undefined) return;
    this.selectPlaced(id);
    const start = this.pointerCss(pointer);
    const base = tankToCss(frame, placement);
    this.drag = {
      id,
      pointerId: pointer.id,
      start,
      grab: { x: start.x - base.x, y: start.y - base.y },
      moving: false,
      target: { x: placement.x, y: placement.y },
    };
  }

  /** Moves the ghost with the drag pointer once it passes the drag threshold. */
  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    const drag = this.drag;
    const frame = this.frame;
    if (drag === null || frame === null || pointer.id !== drag.pointerId) return;
    const point = this.pointerCss(pointer);
    if (!drag.moving && Math.hypot(point.x - drag.start.x, point.y - drag.start.y) < DRAG_THRESHOLD_PX) return;
    drag.moving = true;
    drag.target = cssToTank(frame, { x: point.x - drag.grab.x, y: point.y - drag.grab.y });
    this.showGhost(drag.id, drag.target);
  }

  /** Ends the drag: moves the Decoration only when the ghost is at a valid base point. */
  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    const drag = this.drag;
    if (drag === null || pointer.id !== drag.pointerId) return;
    this.cancelDrag();
    if (!drag.moving || !isValidPlacement(drag.target)) return;
    if (!this.applyChange(moveDecoration(this.tankLayout, drag.id, drag.target), 'moved')) return;
    this.finishChange();
  }

  private cancelDrag(): void {
    this.drag = null;
    this.hideGhost();
  }

  /**
   * The ghost at base point `pos` (art guide 7f): the image at half alpha inside the double focus
   * ring; at an invalid point also a dashed ink outline round the footprint and the "no" icon.
   */
  private showGhost(id: string, pos: Point): void {
    const sprite = this.sprites.get(id);
    if (sprite === undefined || this.frame === null) return;
    this.hideGhost();
    const { info } = sprite;
    this.ghostImage.setTexture(info.key).setOrigin(info.originNormX, info.originNormY).setVisible(true);
    this.positionImage(sprite, this.ghostImage, pos);
    const footprint = this.footprintCss(pos);
    const valid = isValidPlacement(pos);
    if (!valid) strokeDashedRect(this.ghostMarks, footprint);
    strokeDoubleRing(this.ghostMarks, footprint);
    this.noIcon.setPosition(footprint.x + footprint.w, footprint.y).setVisible(!valid);
  }

  private hideGhost(): void {
    this.invalidTimer?.remove(false);
    this.invalidTimer = null;
    this.ghostImage.setVisible(false);
    this.ghostMarks.clear();
    this.noIcon.setVisible(false);
  }
}
