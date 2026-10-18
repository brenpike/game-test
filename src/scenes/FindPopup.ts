import * as Phaser from 'phaser';
import { UI_PANEL } from '../art/palette';
import type { TexInfo } from '../art/textures';
import type { TreasureIconSize, TreasureTextures } from '../art/treasureTextures';
import { categoryName, treasureSlug } from '../logic/catalogue';
import { badgeShape, rarityName } from '../logic/hints';
import type { MotionProfile } from '../logic/motion';
import type { FoundInfo } from '../logic/tripEvents';
import { drawPanel, uiTextStyle, type GameAssets, type SceneView } from './BootScene';

const SIDE_MARGIN = 16;
const PAD = 12;
const ICON_PX = 48;
const COLUMN_GAP = 12;
const NAME_PX = 22;
const DETAIL_PX = 18;
const BADGE_PX = 32;
const BADGE_GAP = 6;
const NAME_WRAP_W = 260;
const NAME_MIN_W = 120;
const FADE_MS = 400;
const HOLD_MS = 2000;
const ROW_ICON_PX = 32;
const ROW_ICON_GAP = 8;

/** Width and height of a block of wrapped icon rows. */
export interface IconRowsSize {
  width: number;
  height: number;
}

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

/** How many 32 px icon boxes (gap 8) fit in a row `maxW` wide, at least one. */
function iconsPerRow(maxW: number): number {
  return Math.max(1, Math.floor((maxW + ROW_ICON_GAP) / (ROW_ICON_PX + ROW_ICON_GAP)));
}

/** Size of `count` 32 px icon boxes with gap 8, wrapped into rows no wider than `maxW`. Zero when `count` is 0. */
export function iconRowsSize(count: number, maxW: number): IconRowsSize {
  if (count === 0) return { width: 0, height: 0 };
  const perRow = iconsPerRow(maxW);
  const columns = Math.min(count, perRow);
  const rows = Math.ceil(count / perRow);
  return {
    width: columns * ROW_ICON_PX + (columns - 1) * ROW_ICON_GAP,
    height: rows * ROW_ICON_PX + (rows - 1) * ROW_ICON_GAP,
  };
}

/**
 * Places centre-anchored icons in 32 px boxes with gap 8, in rows no wider than `maxW` from `top`
 * down, each row centred on `centreX` (iconRowsSize() gives the block size).
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
    const rowW = inRow * ROW_ICON_PX + (inRow - 1) * ROW_ICON_GAP;
    icon.setPosition(
      centreX - rowW / 2 + column * (ROW_ICON_PX + ROW_ICON_GAP) + ROW_ICON_PX / 2,
      top + row * (ROW_ICON_PX + ROW_ICON_GAP) + ROW_ICON_PX / 2,
    );
  });
}

/**
 * Find pop-up, top-centre under the banners: a white panel with the treasure icon, then its name,
 * category and rarity badge with the rarity name. Never interactive and has no dim, so presses pass
 * through to the controls. Shows one find at a time from a queue: fades in, holds, fades out on the
 * HUD clock (so pause freezes it); appears and leaves at once under reduced motion.
 */
export class FindPopup {
  private readonly scene: Phaser.Scene;
  private readonly treasure: TreasureTextures;
  private readonly container: Phaser.GameObjects.Container;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly name: Phaser.GameObjects.Text;
  private readonly category: Phaser.GameObjects.Text;
  private readonly rarity: Phaser.GameObjects.Text;
  private view: SceneView;
  private top = 0;
  private motion: MotionProfile | null = null;
  private icon: Phaser.GameObjects.Image | null = null;
  private badge: Phaser.GameObjects.Image | null = null;
  private queue: FoundInfo[] = [];
  private timer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, assets: GameAssets, view: SceneView, depth: number) {
    this.scene = scene;
    this.treasure = assets.treasure;
    this.view = view;
    const dpr = view.fit.dpr;
    this.panel = scene.add.graphics();
    this.name = scene.add.text(0, 0, '', uiTextStyle(NAME_PX, dpr));
    this.category = scene.add.text(0, 0, '', uiTextStyle(DETAIL_PX, dpr, false));
    this.rarity = scene.add.text(0, 0, '', uiTextStyle(DETAIL_PX, dpr));
    this.container = scene.add
      .container(0, 0, [this.panel, this.name, this.category, this.rarity])
      .setDepth(depth)
      .setVisible(false);
  }

  /** Whether a find is on screen, fading included. */
  isShowing(): boolean {
    return this.container.visible;
  }

  /** Queues the finds in order and starts the next one when none is showing. */
  enqueue(found: readonly FoundInfo[], motion: MotionProfile): void {
    this.motion = motion;
    this.queue.push(...found);
    if (!this.isShowing()) this.showNext();
  }

  /** Hides the pop-up now and empties the queue. */
  clear(): void {
    this.queue = [];
    this.timer?.remove(false);
    this.timer = null;
    this.scene.tweens.killTweensOf(this.container);
    this.container.setVisible(false).setAlpha(1);
  }

  setResolution(dpr: number): void {
    for (const text of [this.name, this.category, this.rarity]) {
      text.setResolution(dpr);
    }
  }

  /** Centres the pop-up horizontally with its top edge at `top`. */
  layout(view: SceneView, top: number): void {
    this.view = view;
    this.top = top;
    this.container.setPosition(view.cssW / 2, top);
    this.layoutContent();
  }

  private ambient(): boolean {
    return this.motion?.ambient ?? false;
  }

  /** Shows the next queued find, fading in unless motion is reduced, and schedules its leaving. */
  private showNext(): void {
    const next = this.queue.shift();
    if (next === undefined) return;
    this.fill(next);
    this.layout(this.view, this.top);
    const ambient = this.ambient();
    this.scene.tweens.killTweensOf(this.container);
    this.container.setVisible(true).setAlpha(ambient ? 0 : 1);
    if (ambient) {
      this.scene.tweens.add({ targets: this.container, alpha: 1, duration: FADE_MS });
    }
    this.timer = this.scene.time.delayedCall((ambient ? FADE_MS : 0) + HOLD_MS, this.leave, [], this);
  }

  /** Fades the find out (or hides it at once under reduced motion), then shows the next one. */
  private leave(): void {
    this.timer = null;
    if (!this.ambient()) {
      this.finish();
      return;
    }
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: FADE_MS,
      onComplete: () => this.finish(),
    });
  }

  private finish(): void {
    this.container.setVisible(false).setAlpha(1);
    this.showNext();
  }

  /** Replaces the icon, badge and texts with the find's. */
  private fill(found: FoundInfo): void {
    this.icon?.destroy();
    this.badge?.destroy();
    this.icon = addTreasureIcon(this.scene, this.treasure, ICON_PX, found.id);
    this.badge = addCentredImage(this.scene, this.treasure.badges[BADGE_PX][badgeShape(found.rarity)]);
    this.container.add([this.icon, this.badge]);
    this.name.setText(found.name);
    this.category.setText(categoryName(found.category));
    this.rarity.setText(rarityName(found.rarity));
  }

  /**
   * Icon on the left, then a column of name (wrapped at NAME_WRAP_W), category and the badge row,
   * both centred on the content height. The panel is at most cssW - 2 * SIDE_MARGIN wide.
   */
  private layoutContent(): void {
    const maxPanelW = Math.max(0, this.view.cssW - 2 * SIDE_MARGIN);
    const columnMaxW = maxPanelW - 2 * PAD - ICON_PX - COLUMN_GAP;
    this.name.setWordWrapWidth(Math.max(NAME_MIN_W, Math.min(NAME_WRAP_W, columnMaxW)), true);
    const rarityRowW = BADGE_PX + BADGE_GAP + this.rarity.width;
    const rarityRowH = Math.max(BADGE_PX, this.rarity.height);
    const columnW = Math.max(this.name.width, this.category.width, rarityRowW);
    const columnH = this.name.height + this.category.height + rarityRowH;
    const contentH = Math.max(ICON_PX, columnH);
    const panelW = Math.min(maxPanelW, 2 * PAD + ICON_PX + COLUMN_GAP + columnW);
    const left = -panelW / 2;
    drawPanel(this.panel, left, 0, panelW, contentH + 2 * PAD, UI_PANEL);
    this.icon?.setPosition(left + PAD + ICON_PX / 2, PAD + contentH / 2);
    const columnX = left + PAD + ICON_PX + COLUMN_GAP;
    let y = PAD + (contentH - columnH) / 2;
    this.name.setPosition(columnX, y);
    y += this.name.height;
    this.category.setPosition(columnX, y);
    y += this.category.height;
    this.badge?.setPosition(columnX + BADGE_PX / 2, y + rarityRowH / 2);
    this.rarity.setPosition(columnX + BADGE_PX + BADGE_GAP, y + (rarityRowH - this.rarity.height) / 2);
  }
}
