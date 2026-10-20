import * as Phaser from 'phaser';
import { UI_PANEL } from '../art/palette';
import type { MorphTextures } from '../art/morphTextures';
import type { TexInfo } from '../art/textures';
import type { TreasureIconSize, TreasureTextures } from '../art/treasureTextures';
import { ICON_ROW_BOX_PX, ICON_ROW_GAP_PX, iconsPerRow } from '../logic/cardFit';
import { categoryName, treasureSlug } from '../logic/catalogue';
import {
  createFindToastState,
  describeFindToastFrame,
  stepFindToast,
  type FindToastEvent,
  type FindToastState,
  type ToastItem,
} from '../logic/findToast';
import { badgeShape, rarityName } from '../logic/hints';
import { FIND_TOAST, findToastBox, type FindToastBox, type OverlayEdge, type Rect, type Size } from '../logic/hudLayout';
import { RESCUE_POPUP_DETAIL, morphById, type RealMorphId } from '../logic/morphs';
import type { MotionProfile } from '../logic/motion';
import type { FoundInfo } from '../logic/tripEvents';
import { drawPanel, uiTextStyle, type GameAssets, type SceneView } from './BootScene';

/** Adds a centre-anchored image showing `info` at its logical size. */
function addCentredImage(scene: Phaser.Scene, info: TexInfo): Phaser.GameObjects.Image {
  return scene.add
    .image(0, 0, info.key)
    .setOrigin(info.originNormX, info.originNormY)
    .setScale(1 / info.scale);
}

/** Adds the `size` px icon of the treasure `id`, centre-anchored. Throws when no icon has the id's slug. */
export function addTreasureIcon(
  scene: Phaser.Scene,
  treasure: TreasureTextures,
  size: TreasureIconSize,
  id: string,
): Phaser.GameObjects.Image {
  const bySlug: Readonly<Record<string, TexInfo | undefined>> = treasure.icons[size];
  const info = bySlug[treasureSlug(id)];
  if (info === undefined) throw new Error(`addTreasureIcon: no ${size} px icon for treasure ${id}`);
  return addCentredImage(scene, info);
}

/**
 * Places centre-anchored icons in 32 px boxes with gap 8, in rows no wider than `maxW` from `top`
 * down, each row centred on `centreX` (iconRowsSize() in logic/cardFit gives the block size).
 */
export function placeIconRows(
  icons: readonly Phaser.GameObjects.Image[],
  centreX: number,
  top: number,
  maxW: number,
): void {
  const perRow = iconsPerRow(maxW);
  icons.forEach((icon, index) => {
    const row = Math.floor(index / perRow);
    const column = index % perRow;
    const inRow = Math.min(perRow, icons.length - row * perRow);
    const rowW = inRow * ICON_ROW_BOX_PX + (inRow - 1) * ICON_ROW_GAP_PX;
    icon.setPosition(
      centreX - rowW / 2 + column * (ICON_ROW_BOX_PX + ICON_ROW_GAP_PX) + ICON_ROW_BOX_PX / 2,
      top + row * (ICON_ROW_BOX_PX + ICON_ROW_GAP_PX) + ICON_ROW_BOX_PX / 2,
    );
  });
}

/** The icon and badge of one toast item. */
interface ToastImages {
  icon: Phaser.GameObjects.Image;
  badge: Phaser.GameObjects.Image;
}

/** Returns the current CSS size of `text`. */
function textSize(text: Phaser.GameObjects.Text): Size {
  return { w: text.width, h: text.height };
}

/**
 * Find toast: a compact white panel with the treasure icon, then its name over its rarity badge and
 * "<Rarity> <Category>"; for a rescued axolotl, its portrait, then its name over its morph badge
 * and the rescue detail. The HUD places it through placeHudOverlays() at a screen edge or over the
 * status panels; with no room it waits, hidden, until the HUD places it again. Never interactive
 * and has no dim, so presses pass through to the controls. The lifecycle (enter, hold, leave,
 * replace, pause, waiting and reduced motion) is stepFindToast() in logic/findToast; this view
 * feeds it events, advances it each HUD frame through update() and draws describeFindToastFrame().
 */
export class FindPopup {
  private readonly scene: Phaser.Scene;
  private readonly treasure: TreasureTextures;
  private readonly morph: MorphTextures;
  /** Placed at the toast rect by place(). */
  private readonly container: Phaser.GameObjects.Container;
  /** The panel and content; only its offset and alpha move, so re-layout never fights the slide. */
  private readonly content: Phaser.GameObjects.Container;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly name: Phaser.GameObjects.Text;
  private readonly detail: Phaser.GameObjects.Text;
  private readonly motion: () => MotionProfile;
  private readonly requestPlacement: () => void;
  private icon: Phaser.GameObjects.Image | null = null;
  private badge: Phaser.GameObjects.Image | null = null;
  private toast: FindToastState = createFindToastState();
  /** Boxes box() measured since the last place(). */
  private measured: FindToastBox[] = [];

  /**
   * `requestPlacement` asks the HUD to place the toast again (through box() and place()); it runs
   * when a new item is filled, before it shows, and when the toast leaves or is cleared.
   */
  constructor(
    scene: Phaser.Scene,
    assets: GameAssets,
    view: SceneView,
    depth: number,
    motion: () => MotionProfile,
    requestPlacement: () => void,
  ) {
    this.scene = scene;
    this.motion = motion;
    this.requestPlacement = requestPlacement;
    this.treasure = assets.treasure;
    this.morph = assets.morph;
    const dpr = view.fit.dpr;
    this.panel = scene.add.graphics();
    this.name = scene.add.text(0, 0, '', uiTextStyle(FIND_TOAST.nameTextPx, dpr));
    this.detail = scene.add.text(0, 0, '', uiTextStyle(FIND_TOAST.detailTextPx, dpr));
    this.content = scene.add.container(0, 0, [this.panel, this.name, this.detail]);
    this.container = scene.add.container(0, 0, [this.content]).setDepth(depth).setVisible(false);
  }

  /** Whether a find is current: on screen, fading or waiting for room. */
  hasFind(): boolean {
    return this.toast.item !== null;
  }

  /** Fills and shows `item`, replacing any current toast at once (see stepFindToast()). */
  show(item: ToastItem): void {
    this.fill(item);
    this.dispatch({ kind: 'show', item, ambient: this.motion().ambient });
  }

  /** Hides the toast now, then asks the HUD to place again when a find was current. */
  clear(): void {
    this.dispatch({ kind: 'clear' });
  }

  /** Advances the toast by `deltaMs` of HUD frame time (none passes while paused or waiting) and redraws it. */
  update(deltaMs: number): void {
    this.dispatch({ kind: 'tick', dtMs: deltaMs, ambient: this.motion().ambient });
  }

  /** Freezes or thaws the toast's time with the HUD clock. */
  setPaused(paused: boolean): void {
    this.dispatch({ kind: paused ? 'pause' : 'resume' });
  }

  setResolution(dpr: number): void {
    for (const text of [this.name, this.detail]) {
      text.setResolution(dpr);
    }
  }

  /**
   * Returns the panel size of the current find for a panel meant to be at most `maxW` wide (see
   * findToastBox(); it is wider than `maxW` when the content cannot fit).
   */
  box(maxW: number): Size {
    const measure = {
      nameAt: (wrapW: number): Size => this.wrapText(this.name, wrapW),
      detailAt: (wrapW: number): Size => this.wrapText(this.detail, wrapW),
    };
    const measured = findToastBox(maxW, measure);
    this.measured.push(measured);
    return { w: measured.w, h: measured.h };
  }

  /**
   * Draws the toast at `rect`, a size box() returned, on `edge`; a null rect makes it wait: hidden,
   * with its time frozen, until a later place() gives it a rect.
   */
  place(rect: Rect | null, edge: OverlayEdge | null): void {
    const measured = this.measured;
    this.measured = [];
    if (rect === null) {
      this.dispatch({ kind: 'noRoom' });
      return;
    }
    const match = measured.find((entry) => entry.w === rect.w && entry.h === rect.h);
    if (match === undefined) throw new Error('FindPopup.place: rect is not a size box() measured');
    this.wrapText(this.name, match.nameWrapW);
    this.wrapText(this.detail, match.detailWrapW);
    this.container.setPosition(rect.x, rect.y);
    this.layoutContent(rect);
    this.dispatch({ kind: 'placed', edge });
  }

  /** Sets `text` to wrap at `wrapW` and returns its size. */
  private wrapText(text: Phaser.GameObjects.Text, wrapW: number): Size {
    text.setWordWrapWidth(wrapW, true);
    return textSize(text);
  }

  /** Applies `event` to the toast state, draws the result, then asks the HUD to place again when the step says so. */
  private dispatch(event: FindToastEvent): void {
    const step = stepFindToast(this.toast, event);
    this.toast = step.state;
    this.drawFrame();
    if (step.placementRequested) this.requestPlacement();
  }

  /** Draws the toast state: visibility, content opacity and slide offset. */
  private drawFrame(): void {
    const frame = describeFindToastFrame(this.toast);
    this.container.setVisible(frame.visible);
    this.content.setPosition(0, frame.offsetY).setAlpha(frame.alpha);
  }

  /** Replaces the icon, badge and texts with the item's. */
  private fill(item: ToastItem): void {
    this.measured = [];
    this.icon?.destroy();
    this.badge?.destroy();
    const images = item.kind === 'treasure' ? this.fillTreasure(item.found) : this.fillAxolotl(item.morph);
    this.icon = images.icon;
    this.badge = images.badge;
    this.content.add([images.icon, images.badge]);
  }

  /** Sets the treasure's name and "<Rarity> <Category>"; returns its icon and rarity badge. */
  private fillTreasure(found: FoundInfo): ToastImages {
    this.name.setText(found.name);
    this.detail.setText(`${rarityName(found.rarity)} ${categoryName(found.category)}`);
    return {
      icon: addTreasureIcon(this.scene, this.treasure, FIND_TOAST.iconPx, found.id),
      badge: addCentredImage(this.scene, this.treasure.badges[FIND_TOAST.badgePx][badgeShape(found.rarity)]),
    };
  }

  /** Sets the axolotl's display name and the rescue detail; returns its portrait and morph badge. */
  private fillAxolotl(morphId: RealMorphId): ToastImages {
    const morph = morphById(morphId);
    this.name.setText(morph.displayName);
    this.detail.setText(RESCUE_POPUP_DETAIL);
    return {
      icon: addCentredImage(this.scene, this.morph.portraits[morphId][FIND_TOAST.iconPx]),
      badge: addCentredImage(this.scene, this.morph.badges[FIND_TOAST.badgePx][morph.badge]),
    };
  }

  /**
   * Draws the panel to `rect` (content-local, top-left at 0, 0): icon on the left, then a column of
   * the name over the badge and detail line, both centred on the content height.
   */
  private layoutContent(rect: Rect): void {
    const { padX, padY, iconPx, columnGap, badgePx, badgeGap } = FIND_TOAST;
    const detailRowH = Math.max(badgePx, this.detail.height);
    const columnH = this.name.height + detailRowH;
    const contentH = rect.h - 2 * padY;
    drawPanel(this.panel, 0, 0, rect.w, rect.h, UI_PANEL);
    this.icon?.setPosition(padX + iconPx / 2, padY + contentH / 2);
    const columnX = padX + iconPx + columnGap;
    let y = padY + (contentH - columnH) / 2;
    this.name.setPosition(columnX, y);
    y += this.name.height;
    this.badge?.setPosition(columnX + badgePx / 2, y + detailRowH / 2);
    this.detail.setPosition(columnX + badgePx + badgeGap, y + (detailRowH - this.detail.height) / 2);
  }
}
