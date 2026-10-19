import * as Phaser from 'phaser';
import { UI_PANEL } from '../art/palette';
import type { TexInfo } from '../art/textures';
import type { TreasureIconSize, TreasureTextures } from '../art/treasureTextures';
import { ICON_ROW_BOX_PX, ICON_ROW_GAP_PX, iconsPerRow } from '../logic/cardFit';
import { categoryName, treasureSlug } from '../logic/catalogue';
import { badgeShape, rarityName } from '../logic/hints';
import { FIND_POPUP, findPopupBox, type Rect, type Size } from '../logic/hudLayout';
import type { MotionProfile } from '../logic/motion';
import type { FoundInfo } from '../logic/tripEvents';
import { drawPanel, uiTextStyle, type GameAssets, type SceneView } from './BootScene';
import { addMotionTween } from './motionTweens';

const FADE_MS = 400;
const HOLD_MS = 2000;

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


/** A measured pop-up panel size and the name wrap width that produced it. */
interface MeasuredBox {
  size: Size;
  wrapW: number;
}

/** Returns the current CSS size of `text`. */
function textSize(text: Phaser.GameObjects.Text): Size {
  return { w: text.width, h: text.height };
}

/**
 * Find pop-up: a white panel with the treasure icon, then its name, category and rarity badge with
 * the rarity name. The HUD places it through placeHudOverlays(): top-centre under the banners when
 * that clears the controls, otherwise in the free room nearest there. With no room it is held:
 * hidden, with its hold timer paused, until the HUD places it again. Never interactive and has no
 * dim, so presses pass through to the controls. Shows one find at a time from a queue: fades in,
 * holds, fades out on the HUD clock (so pause freezes it); appears and leaves at once under reduced
 * motion, including when reduced motion turns on mid-fade or with finds still queued.
 */
export class FindPopup {
  private readonly scene: Phaser.Scene;
  private readonly treasure: TreasureTextures;
  private readonly container: Phaser.GameObjects.Container;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly name: Phaser.GameObjects.Text;
  private readonly category: Phaser.GameObjects.Text;
  private readonly rarity: Phaser.GameObjects.Text;
  private readonly motion: () => MotionProfile;
  private readonly requestPlacement: () => void;
  private icon: Phaser.GameObjects.Image | null = null;
  private badge: Phaser.GameObjects.Image | null = null;
  private queue: FoundInfo[] = [];
  private current: FoundInfo | null = null;
  private timer: Phaser.Time.TimerEvent | null = null;
  /** Whether placement found no room, so the pop-up is hidden and its timer paused. */
  private held = false;
  /** Sizes box() measured since the last place(), each with the name wrap width that gave it. */
  private measured: MeasuredBox[] = [];

  /**
   * `requestPlacement` asks the HUD to place the pop-up again (through box() and place()); it runs
   * when a new find is filled, before it shows, and when the last find leaves.
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
    const dpr = view.fit.dpr;
    this.panel = scene.add.graphics();
    this.name = scene.add.text(0, 0, '', uiTextStyle(FIND_POPUP.nameTextPx, dpr));
    this.category = scene.add.text(0, 0, '', uiTextStyle(FIND_POPUP.detailTextPx, dpr, false));
    this.rarity = scene.add.text(0, 0, '', uiTextStyle(FIND_POPUP.detailTextPx, dpr));
    this.container = scene.add
      .container(0, 0, [this.panel, this.name, this.category, this.rarity])
      .setDepth(depth)
      .setVisible(false);
  }

  /** Whether a find is current: on screen, fading or held. */
  hasFind(): boolean {
    return this.current !== null;
  }

  /** Queues the finds in order and starts the next one when no find is current. */
  enqueue(found: readonly FoundInfo[]): void {
    this.queue.push(...found);
    if (!this.hasFind()) this.showNext();
  }

  /** Hides the pop-up now and empties the queue, then asks the HUD to place again when a find was current. */
  clear(): void {
    const hadFind = this.hasFind();
    this.queue = [];
    this.current = null;
    if (this.timer) this.scene.time.removeEvent(this.timer);
    this.timer = null;
    this.held = false;
    this.scene.tweens.killTweensOf(this.container);
    this.container.setVisible(false).setAlpha(1);
    if (hadFind) this.requestPlacement();
  }

  setResolution(dpr: number): void {
    for (const text of [this.name, this.category, this.rarity]) {
      text.setResolution(dpr);
    }
  }

  /**
   * Returns the panel size of the current find for a panel meant to be at most `maxW` wide (see
   * findPopupBox(); it is wider than `maxW` when the content cannot fit).
   */
  box(maxW: number): Size {
    let wrapW: number = FIND_POPUP.nameMinW;
    const nameAt = (atW: number): Size => {
      wrapW = atW;
      return this.measureName(atW);
    };
    const size = findPopupBox(maxW, { nameAt, category: textSize(this.category), rarity: textSize(this.rarity) });
    this.measured.push({ size, wrapW });
    return size;
  }

  /**
   * Draws the pop-up at `rect`, a size box() returned; null holds it: hidden, with its hold timer
   * paused, until a later place() gives it a rect.
   */
  place(rect: Rect | null): void {
    const measured = this.measured;
    this.measured = [];
    this.held = rect === null;
    if (rect !== null) {
      const match = measured.find((entry) => entry.size.w === rect.w && entry.size.h === rect.h);
      if (match === undefined) throw new Error('FindPopup.place: rect is not a size box() measured');
      this.measureName(match.wrapW);
      this.container.setPosition(rect.x, rect.y);
      this.layoutContent(rect);
    }
    this.applyHold();
  }

  private ambient(): boolean {
    return this.motion().ambient;
  }

  /** Sets the name to wrap at `wrapW` and returns its size. */
  private measureName(wrapW: number): Size {
    this.name.setWordWrapWidth(wrapW, true);
    return textSize(this.name);
  }

  /** Shows the pop-up only while a find is current and placed, and pauses its timer while held. */
  private applyHold(): void {
    this.container.setVisible(this.current !== null && !this.held);
    if (this.timer) this.timer.paused = this.held;
  }

  /**
   * Shows the next queued find: fills it, has the HUD place it, then fades in unless motion is
   * reduced and schedules its leaving.
   */
  private showNext(): void {
    const next = this.queue.shift();
    if (next === undefined) return;
    const ambient = this.ambient();
    this.current = next;
    this.fill(next);
    this.scene.tweens.killTweensOf(this.container);
    this.container.setAlpha(ambient ? 0 : 1);
    this.requestPlacement();
    if (ambient) {
      addMotionTween(this.scene, { targets: this.container, props: { alpha: 1 }, duration: FADE_MS });
    }
    this.timer = this.scene.time.delayedCall((ambient ? FADE_MS : 0) + HOLD_MS, this.leave, [], this);
    this.applyHold();
  }

  /** Fades the find out (or hides it at once under reduced motion), then shows the next one. */
  private leave(): void {
    this.timer = null;
    if (!this.ambient()) {
      this.finish();
      return;
    }
    addMotionTween(this.scene, {
      targets: this.container,
      props: { alpha: 0 },
      duration: FADE_MS,
      onComplete: () => this.finish(),
    });
  }

  /** Hides the find, then shows the next one, or asks the HUD to place again when the queue is empty. */
  private finish(): void {
    this.current = null;
    this.held = false;
    this.container.setVisible(false).setAlpha(1);
    if (this.queue.length === 0) {
      this.requestPlacement();
      return;
    }
    this.showNext();
  }

  /** Replaces the icon, badge and texts with the find's. */
  private fill(found: FoundInfo): void {
    this.measured = [];
    this.icon?.destroy();
    this.badge?.destroy();
    this.icon = addTreasureIcon(this.scene, this.treasure, FIND_POPUP.iconPx, found.id);
    this.badge = addCentredImage(this.scene, this.treasure.badges[FIND_POPUP.badgePx][badgeShape(found.rarity)]);
    this.container.add([this.icon, this.badge]);
    this.name.setText(found.name);
    this.category.setText(categoryName(found.category));
    this.rarity.setText(rarityName(found.rarity));
  }

  /**
   * Draws the panel to `rect` (container-local, top-left at 0, 0): icon on the left, then a column of
   * name, category and the badge row, both centred on the content height.
   */
  private layoutContent(rect: Rect): void {
    const { pad, iconPx, columnGap, badgePx, badgeGap } = FIND_POPUP;
    const rarityRowH = Math.max(badgePx, this.rarity.height);
    const columnH = this.name.height + this.category.height + rarityRowH;
    const contentH = rect.h - 2 * pad;
    drawPanel(this.panel, 0, 0, rect.w, rect.h, UI_PANEL);
    this.icon?.setPosition(pad + iconPx / 2, pad + contentH / 2);
    const columnX = pad + iconPx + columnGap;
    let y = pad + (contentH - columnH) / 2;
    this.name.setPosition(columnX, y);
    y += this.name.height;
    this.category.setPosition(columnX, y);
    y += this.category.height;
    this.badge?.setPosition(columnX + badgePx / 2, y + rarityRowH / 2);
    this.rarity.setPosition(columnX + badgePx + badgeGap, y + (rarityRowH - this.rarity.height) / 2);
  }
}
