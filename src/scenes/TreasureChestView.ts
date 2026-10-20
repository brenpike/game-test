import * as Phaser from 'phaser';
import { HOME_TANK_WALL, UI_PANEL } from '../art/palette';
import type { BakedTextures, TexInfo } from '../art/textures';
import type { TreasureTextures } from '../art/treasureTextures';
import type { Size } from '../logic/hudLayout';
import { CLOSE_LABEL, NEXT_PAGE_LABEL, PREVIOUS_PAGE_LABEL, TREASURE_CHEST_LABEL } from '../logic/tankText';
import {
  chestListing,
  chestPages,
  pageText,
  perkText,
  type ChestCategory,
  type ChestEntry,
  type ChestPage,
  type ChestSection,
} from '../logic/treasureChest';
import { CHEST_BUTTON, UI, chestLayout, nextFocusIndex, rowsPerPage, type ChestLayout, type TankKey } from '../logic/tankUi';
import { createButton, cssColor, drawPanel, uiTextStyle, type SceneView, type UiButton } from './BootScene';
import { addTreasureIcon } from './FindPopup';

const TITLE_PX = 28;
const HEADING_PX = 18;
const PAGE_TEXT_PX = 18;
const EMPTY_TEXT_PX = 18;
const NAME_PX = 20;
const RARITY_PX = 18;
const DETAIL_PX = 18;
const LEAD_PX = 32;
const LEAD_GAP = 8;
const BADGE_PX = 24;
const SLOT_PX = 18;
const PERK_PX = 18;
/** Perk icon box, the gap after it (guide 8, Wearable display: 24 px icon, 6 px, then the text). */
const PERK_ICON_PX = 24;
const PERK_ICON_GAP = 6;
/** Gap between the slot name and the perk icon when they share a line. */
const SLOT_GAP = 6;
/** Follows the slot name when the perk shares its line, e.g. 'Head ·'. */
const SLOT_SEPARATOR = ' ·';
const BADGE_GAP = 6;
const NAME_GAP = 8;
const BACKDROP_COVER = 8192;
const BACK_INDEX = 0;
const CLOSE_INDEX = 1;
const NEXT_INDEX = 2;

/** Textures the Treasure Chest draws with. */
export interface TreasureChestTextures {
  baked: BakedTextures;
  treasure: TreasureTextures;
}

/**
 * The texts of one entry row, and its images (null in the measuring probe). A Wearable's slot and
 * perk are `slot`, `perkIcon` and `perk`; a Dream colour's label is `detail`. The unused ones stay empty.
 */
interface RowParts {
  lead: Phaser.GameObjects.Image | null;
  badge: Phaser.GameObjects.Image | null;
  perkIcon: Phaser.GameObjects.Image | null;
  /** The slot name without the separator, e.g. 'Head'; empty for an entry that is not a Wearable. */
  slotName: string;
  name: Phaser.GameObjects.Text;
  rarity: Phaser.GameObjects.Text;
  detail: Phaser.GameObjects.Text;
  slot: Phaser.GameObjects.Text;
  perk: Phaser.GameObjects.Text;
}

/** One entry row on screen: its container and parts. */
interface ChestRow {
  container: Phaser.GameObjects.Container;
  parts: RowParts;
}

/** Adds a centre-anchored image showing `info` at its logical size. */
function addCentredImage(scene: Phaser.Scene, info: TexInfo): Phaser.GameObjects.Image {
  return scene.add
    .image(0, 0, info.key)
    .setOrigin(info.originNormX, info.originNormY)
    .setScale(1 / info.scale);
}

/** Heading text of a section, e.g. 'Dream colours: 2 of 12 found'. */
function headingText(section: ChestSection): string {
  return `${section.heading}: ${section.countText}`;
}

/** Detail line of an entry: the Dream colour label, or none (a Wearable has the slot and perk line instead). */
function detailText(entry: ChestEntry): string {
  return 'label' in entry ? entry.label : '';
}

/** Returns the current CSS size of `text`. */
function textSize(text: Phaser.GameObjects.Text): Size {
  return { w: text.width, h: text.height };
}

/** Sets `text` to wrap at `wrapW` and returns its size. */
function wrappedSize(text: Phaser.GameObjects.Text, wrapW: number): Size {
  text.setWordWrapWidth(Math.max(1, wrapW), true);
  return textSize(text);
}

/** Fills the row texts with the entry's name, rarity name, detail line, and a Wearable's slot and perk. */
function fillRowTexts(parts: RowParts, entry: ChestEntry): void {
  parts.name.setText(entry.name);
  parts.rarity.setText(entry.rarityName);
  parts.detail.setText(detailText(entry));
  parts.slotName = 'slotName' in entry ? entry.slotName : '';
  parts.slot.setText(parts.slotName);
  parts.perk.setText('perk' in entry ? perkText(entry.perk) : '');
}

/**
 * Lays a Wearable's slot and perk line in `availW` from `top` at `x`, and returns its height; 0 when
 * the entry is not a Wearable. The slot name comes first, then the 24 px perk icon, 6 px, then the
 * perk name and value. When that does not fit one line, the slot name takes its own line and the
 * perk icon and text go under it, the text wrapping beside the icon. Nothing shrinks or hides.
 */
function placePerkLine(parts: RowParts, x: number, top: number, availW: number): number {
  if (parts.slotName === '') return 0;
  const textOffset = PERK_ICON_PX + PERK_ICON_GAP;
  parts.slot.setText(`${parts.slotName}${SLOT_SEPARATOR}`);
  parts.slot.setWordWrapWidth(null);
  parts.perk.setWordWrapWidth(null);
  const sameLine = parts.slot.width + SLOT_GAP + textOffset + parts.perk.width <= availW;
  if (sameLine) {
    const lineH = Math.max(PERK_ICON_PX, parts.slot.height, parts.perk.height);
    const iconX = x + parts.slot.width + SLOT_GAP;
    parts.slot.setPosition(x, top + (lineH - parts.slot.height) / 2);
    parts.perkIcon?.setPosition(iconX + PERK_ICON_PX / 2, top + lineH / 2);
    parts.perk.setPosition(iconX + textOffset, top + (lineH - parts.perk.height) / 2);
    return lineH;
  }
  parts.slot.setText(parts.slotName);
  const slot = wrappedSize(parts.slot, availW);
  const perk = wrappedSize(parts.perk, availW - textOffset);
  const perkH = Math.max(PERK_ICON_PX, perk.h);
  parts.slot.setPosition(x, top);
  parts.perkIcon?.setPosition(x + PERK_ICON_PX / 2, top + slot.h + perkH / 2);
  parts.perk.setPosition(x + textOffset, top + slot.h + (perkH - perk.h) / 2);
  return slot.h + perkH;
}

/** Height `placePerkLine` would use in `availW` (it also places the parts; the caller places them again). */
function perkLineHeight(parts: RowParts, availW: number): number {
  return placePerkLine(parts, 0, 0, availW);
}

/**
 * Places the detail block at `top` and returns its bottom: beside the 32 px lead image (left edge
 * `textX`) or, when that ends higher, under it across the whole row. The block is the Dream colour
 * label or a Wearable's slot and perk line; an entry with neither adds nothing.
 */
function placeDetail(parts: RowParts, top: number, textX: number, rowW: number): number {
  const { detail } = parts;
  if (detail.text === '' && parts.slotName === '') return top;
  const underTop = Math.max(top, LEAD_PX);
  const blockH = (availW: number): number =>
    detail.text === '' ? perkLineHeight(parts, availW) : wrappedSize(detail, availW).h;
  const underBottom = underTop + blockH(rowW);
  const besideBottom = top + blockH(rowW - textX);
  const useBeside = besideBottom <= underBottom;
  const x = useBeside ? textX : 0;
  const y = useBeside ? top : underTop;
  const availW = useBeside ? rowW - textX : rowW;
  if (detail.text === '') placePerkLine(parts, x, y, availW);
  else {
    wrappedSize(detail, availW);
    detail.setPosition(x, y);
  }
  return useBeside ? besideBottom : underBottom;
}

/**
 * Lays out one entry row `rowW` wide from its top-left and returns its height. The 32 px icon or
 * swatch sits at the left with the name beside it; the 24 px badge and rarity name follow the name
 * on its line when they fit, else go under it; the detail line goes below.
 */
function arrangeRow(parts: RowParts, rowW: number): number {
  const textX = LEAD_PX + LEAD_GAP;
  const textW = rowW - textX;
  const name = wrappedSize(parts.name, textW);
  const groupW = BADGE_PX + BADGE_GAP + parts.rarity.width;
  const groupH = Math.max(BADGE_PX, parts.rarity.height);
  const sameLine = name.w + NAME_GAP + groupW <= textW;
  const lineH = sameLine ? Math.max(name.h, groupH) : name.h;
  const groupX = sameLine ? textX + name.w + NAME_GAP : textX;
  const groupY = sameLine ? (lineH - groupH) / 2 : name.h;
  parts.name.setPosition(textX, (lineH - name.h) / 2);
  parts.badge?.setPosition(groupX + BADGE_PX / 2, groupY + groupH / 2);
  parts.rarity.setPosition(groupX + BADGE_PX + BADGE_GAP, groupY + (groupH - parts.rarity.height) / 2);
  parts.lead?.setPosition(LEAD_PX / 2, LEAD_PX / 2);
  const headBottom = sameLine ? lineH : name.h + groupH;
  return Math.max(LEAD_PX, placeDetail(parts, headBottom, textX, rowW));
}

/**
 * Treasure Chest over the Home Tank: an opaque Home Tank wall backdrop that takes every press, a
 * white panel with the title, the section heading with its found count, one page of entry rows (or
 * the section's empty text), the page text, and the Close, Back and Next buttons. Pages come from
 * chestPages() at as many rows as fit the list; paging wraps. Appears and leaves at once.
 * Keys: left and right page, next and previous move focus over Back, Close and Next, confirm
 * presses the focused button, cancel closes. Closing by button or key calls `onClose`.
 */
export class TreasureChestView {
  private readonly scene: Phaser.Scene;
  private readonly treasure: TreasureTextures;
  private readonly onClose: () => void;
  private readonly container: Phaser.GameObjects.Container;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly heading: Phaser.GameObjects.Text;
  private readonly pageLabel: Phaser.GameObjects.Text;
  private readonly emptyText: Phaser.GameObjects.Text;
  private readonly probe: RowParts;
  private readonly buttons: readonly UiButton[];
  private view: SceneView;
  private dpr: number;
  private sections: readonly ChestSection[] = [];
  private pages: ChestPage[] = [];
  private pageIndex = 0;
  private perPage = 1;
  private rowH = LEAD_PX;
  private chest: ChestLayout | null = null;
  private rows: ChestRow[] = [];
  private focusIndex = NEXT_INDEX;

  constructor(
    scene: Phaser.Scene,
    textures: TreasureChestTextures,
    view: SceneView,
    depth: number,
    onClose: () => void,
  ) {
    this.scene = scene;
    this.treasure = textures.treasure;
    this.onClose = onClose;
    this.view = view;
    this.dpr = view.fit.dpr;
    const backdrop = scene.add
      .rectangle(-BACKDROP_COVER / 2, -BACKDROP_COVER / 2, BACKDROP_COVER, BACKDROP_COVER, cssColor(HOME_TANK_WALL).color, 1)
      .setOrigin(0, 0)
      .setInteractive();
    this.panel = scene.add.graphics();
    this.title = scene.add.text(0, 0, TREASURE_CHEST_LABEL, uiTextStyle(TITLE_PX, this.dpr));
    this.heading = scene.add.text(0, 0, '', uiTextStyle(HEADING_PX, this.dpr));
    this.pageLabel = scene.add.text(0, 0, '', uiTextStyle(PAGE_TEXT_PX, this.dpr, false));
    this.emptyText = scene.add.text(0, 0, '', uiTextStyle(EMPTY_TEXT_PX, this.dpr, false));
    this.probe = this.createRowParts(null, null, null);
    for (const text of this.probeTexts()) {
      text.setVisible(false);
    }
    this.buttons = [
      this.createChestButton(textures.baked, PREVIOUS_PAGE_LABEL, 'left', BACK_INDEX),
      this.createChestButton(textures.baked, CLOSE_LABEL, 'close', CLOSE_INDEX),
      this.createChestButton(textures.baked, NEXT_PAGE_LABEL, 'right', NEXT_INDEX),
    ];
    this.container = scene.add
      .container(0, 0, [
        backdrop,
        this.panel,
        this.title,
        this.heading,
        this.pageLabel,
        this.emptyText,
        ...this.buttons.map((button) => button.container),
      ])
      .setDepth(depth)
      .setVisible(false);
    this.setFocus(NEXT_INDEX);
  }

  /** Whether the chest is on screen. */
  isOpen(): boolean {
    return this.container.visible;
  }

  /** Shows the chest at once for these banked treasure ids, on the first Decorations page with Next focused. */
  open(banked: readonly string[]): void {
    this.sections = chestListing(banked);
    this.pages = [];
    this.pageIndex = 0;
    this.setFocus(NEXT_INDEX);
    this.container.setVisible(true);
    this.layout(this.view);
  }

  /** Hides the chest at once. Does not call `onClose`; the Close button and the cancel key do. */
  close(): void {
    this.container.setVisible(false);
    this.clearRows();
  }

  /**
   * Lays the chest out for `view` with chestLayout(), measures the tallest entry row at the list
   * width, and pages the listing at as many rows as fit, staying in the current section. Safe to call
   * while closed; the next open() uses `view`.
   */
  layout(view: SceneView): void {
    this.view = view;
    if (!this.isOpen()) return;
    const category = this.currentCategory();
    const firstEntry = this.firstEntryIndex();
    this.pageLabel.setText(pageText(this.pageIndex + 1, Math.max(1, this.pages.length)));
    const [back, close, next] = this.buttons.map((button): Size => ({ w: button.width, h: button.height }));
    const chest = chestLayout(view, {
      titleAt: (wrapW) => wrappedSize(this.title, wrapW),
      headingAt: (wrapW) => this.measureHeadings(wrapW),
      pageText: textSize(this.pageLabel),
      close,
      back,
      next,
    });
    this.chest = chest;
    this.rowH = this.measureRowHeight(chest.list.w);
    this.perPage = rowsPerPage(chest.list.h, this.rowH, UI.gap);
    this.pages = chestPages(this.sections, this.perPage);
    this.pageIndex = this.pageIndexFor(category, firstEntry);
    drawPanel(this.panel, chest.panel.x, chest.panel.y, chest.panel.w, chest.panel.h, UI_PANEL);
    this.title.setPosition(chest.title.x, chest.title.y);
    this.heading.setPosition(chest.heading.x, chest.heading.y);
    this.buttons[BACK_INDEX].container.setPosition(chest.back.x, chest.back.y);
    this.buttons[CLOSE_INDEX].container.setPosition(chest.close.x, chest.close.y);
    this.buttons[NEXT_INDEX].container.setPosition(chest.next.x, chest.next.y);
    this.showPage();
  }

  setResolution(dpr: number): void {
    this.dpr = dpr;
    const rowTexts = this.rows.flatMap((row) => [
      row.parts.name,
      row.parts.rarity,
      row.parts.detail,
      row.parts.slot,
      row.parts.perk,
    ]);
    for (const text of [this.title, this.heading, this.pageLabel, this.emptyText, ...this.probeTexts(), ...rowTexts]) {
      text.setResolution(dpr);
    }
    for (const button of this.buttons) {
      button.setResolution(dpr);
    }
  }

  /**
   * Handles a Home Tank key while open: left and right page, next and previous move focus, confirm
   * presses the focused button, cancel closes. Other keys, and every key while closed, do nothing.
   */
  handleKey(key: TankKey): void {
    if (!this.isOpen()) return;
    if (key === 'left') this.turnPage(-1);
    else if (key === 'right') this.turnPage(1);
    else if (key === 'next') this.setFocus(nextFocusIndex(this.focusIndex, this.buttons.length, 1));
    else if (key === 'previous') this.setFocus(nextFocusIndex(this.focusIndex, this.buttons.length, -1));
    else if (key === 'confirm') this.pressButton(this.focusIndex);
    else if (key === 'cancel') this.requestClose();
  }

  destroy(): void {
    this.clearRows();
    for (const text of this.probeTexts()) {
      text.destroy();
    }
    this.container.destroy();
  }

  private probeTexts(): Phaser.GameObjects.Text[] {
    return [this.probe.name, this.probe.rarity, this.probe.detail, this.probe.slot, this.probe.perk];
  }

  private createChestButton(
    baked: BakedTextures,
    label: string,
    icon: 'close' | 'left' | 'right',
    index: number,
  ): UiButton {
    return createButton(this.scene, baked, {
      fill: 'secondary',
      shape: 'square',
      size: 1,
      width: CHEST_BUTTON.w,
      label,
      icon,
      dpr: this.dpr,
      pressOnDown: false,
      onPress: () => this.pressButton(index),
    });
  }

  private createRowParts(
    lead: Phaser.GameObjects.Image | null,
    badge: Phaser.GameObjects.Image | null,
    perkIcon: Phaser.GameObjects.Image | null,
  ): RowParts {
    return {
      lead,
      badge,
      perkIcon,
      slotName: '',
      name: this.scene.add.text(0, 0, '', uiTextStyle(NAME_PX, this.dpr)),
      rarity: this.scene.add.text(0, 0, '', uiTextStyle(RARITY_PX, this.dpr)),
      detail: this.scene.add.text(0, 0, '', uiTextStyle(DETAIL_PX, this.dpr, false)),
      slot: this.scene.add.text(0, 0, '', uiTextStyle(SLOT_PX, this.dpr)),
      perk: this.scene.add.text(0, 0, '', uiTextStyle(PERK_PX, this.dpr, false)),
    };
  }

  /** Widest and tallest of every section heading wrapped at `wrapW`, so the list keeps one size on every page. */
  private measureHeadings(wrapW: number): Size {
    let size: Size = { w: 0, h: 0 };
    for (const section of this.sections) {
      this.heading.setText(headingText(section));
      const measured = wrappedSize(this.heading, wrapW);
      size = { w: Math.max(size.w, measured.w), h: Math.max(size.h, measured.h) };
    }
    return size;
  }

  /** Height of the tallest entry row of every section at `rowW`; the lead image height when there are none. */
  private measureRowHeight(rowW: number): number {
    let height = LEAD_PX;
    for (const section of this.sections) {
      for (const entry of section.entries) {
        fillRowTexts(this.probe, entry);
        height = Math.max(height, arrangeRow(this.probe, rowW));
      }
    }
    return height;
  }

  /** Section of the current page; Decorations before the first paging. */
  private currentCategory(): ChestCategory {
    return this.pages[this.pageIndex]?.section.category ?? 'decoration';
  }

  /** Index, within its section, of the first entry on the current page. */
  private firstEntryIndex(): number {
    const category = this.currentCategory();
    const earlierPages = this.pages
      .slice(0, this.pageIndex)
      .filter((page) => page.section.category === category).length;
    return earlierPages * this.perPage;
  }

  /** Page of `category` that holds its entry `entryIndex`, or its last page when it has fewer entries. */
  private pageIndexFor(category: ChestCategory, entryIndex: number): number {
    const first = this.pages.findIndex((page) => page.section.category === category);
    if (first < 0) throw new Error(`TreasureChestView: no page for section ${category}`);
    const count = this.pages.filter((page) => page.section.category === category).length;
    return first + Math.min(count - 1, Math.floor(entryIndex / this.perPage));
  }

  /** Draws the current page: heading, page text, and its entry rows or the section's empty text. */
  private showPage(): void {
    const chest = this.chest;
    const page = this.pages[this.pageIndex];
    if (chest === null || page === undefined) throw new Error('TreasureChestView.showPage: not laid out');
    this.heading.setText(headingText(page.section));
    this.pageLabel.setText(pageText(this.pageIndex + 1, this.pages.length));
    this.pageLabel.setPosition(chest.pageText.x + (chest.pageText.w - this.pageLabel.width) / 2, chest.pageText.y);
    this.clearRows();
    const empty = page.entries.length === 0;
    this.emptyText.setVisible(empty);
    if (empty) {
      this.emptyText.setText(page.section.emptyText);
      wrappedSize(this.emptyText, chest.list.w);
      this.emptyText.setPosition(chest.list.x, chest.list.y);
    }
    page.entries.forEach((entry, index) => {
      this.rows.push(this.buildRow(entry, chest.list.x, chest.list.y + index * (this.rowH + UI.gap), chest.list.w));
    });
  }

  /**
   * Adds one entry row at (`x`, `y`), `rowW` wide: its icon or swatch, name, badge, rarity name and
   * detail; a Wearable's slot name, perk icon and perk text.
   */
  private buildRow(entry: ChestEntry, x: number, y: number, rowW: number): ChestRow {
    const lead =
      'label' in entry
        ? addCentredImage(this.scene, this.treasure.swatches[entry.id])
        : addTreasureIcon(this.scene, this.treasure, LEAD_PX, entry.id);
    const badge = addCentredImage(this.scene, this.treasure.badges[BADGE_PX][entry.badge]);
    const perkIcon = 'perk' in entry ? addCentredImage(this.scene, this.treasure.perks[PERK_ICON_PX][entry.perk.type]) : null;
    const parts = this.createRowParts(lead, badge, perkIcon);
    fillRowTexts(parts, entry);
    arrangeRow(parts, rowW);
    const container = this.scene.add.container(x, y, [
      lead,
      badge,
      ...(perkIcon ? [perkIcon] : []),
      parts.name,
      parts.rarity,
      parts.detail,
      parts.slot,
      parts.perk,
    ]);
    this.container.add(container);
    return { container, parts };
  }

  private clearRows(): void {
    for (const row of this.rows) {
      row.container.destroy();
    }
    this.rows = [];
  }

  /** Shows the page `step` away, wrapping past either end. */
  private turnPage(step: number): void {
    this.pageIndex = nextFocusIndex(this.pageIndex, this.pages.length, step);
    this.showPage();
  }

  private setFocus(index: number): void {
    this.focusIndex = index;
    this.buttons.forEach((button, buttonIndex) => button.setFocused(buttonIndex === index));
  }

  /** Focuses the button and does its action: Back and Next turn the page, Close closes. Ignored while closed. */
  private pressButton(index: number): void {
    if (!this.isOpen()) return;
    this.setFocus(index);
    if (index === BACK_INDEX) this.turnPage(-1);
    else if (index === NEXT_INDEX) this.turnPage(1);
    else this.requestClose();
  }

  /** Closes the chest, then tells the owner through `onClose`. */
  private requestClose(): void {
    this.close();
    this.onClose();
  }
}
