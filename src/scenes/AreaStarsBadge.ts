import * as Phaser from 'phaser';
import { UI_PANEL } from '../art/palette';
import { AREA_STAR_SIZES, type AreaStarSize, type AreaTextures } from '../art/areaTextures';
import type { Rect, Size } from '../logic/hudLayout';
import { NO_STARS, type AreaStars } from '../logic/stars';
import { HUB_STARS_BADGE, type HubBadgeShape } from '../logic/starsUi';
import { drawPanel, uiTextStyle } from './BootScene';

/** The Area star textures: earned and missing, by box size. */
export type AreaStarTextures = AreaTextures['stars'];

/** An area's 3 stars in star order: reach the exit, own the special treasure, rescue or keep every leg. */
export function starFlags(stars: AreaStars): readonly boolean[] {
  return [stars.exit, stars.special, stars.legsOrRescue];
}

/** The baked Area star size for a `px` box. Throws when no Area star is baked at that size. */
function areaStarSize(px: number): AreaStarSize {
  const size = AREA_STAR_SIZES.find((baked) => baked === px);
  if (size === undefined) throw new Error(`areaStarSize: no Area star baked at ${px} px`);
  return size;
}

/**
 * Shows the earned or missing Area star in a `px` box on `image`, centre-anchored at its logical
 * size. Earned and missing differ by shape (dashed outline when missing), so greyscale still reads.
 * Throws when no Area star is baked at `px`.
 */
export function showAreaStar(
  image: Phaser.GameObjects.Image,
  textures: AreaStarTextures,
  earned: boolean,
  px: number,
): void {
  const size = areaStarSize(px);
  const info = earned ? textures.earned[size] : textures.missing[size];
  image.setTexture(info.key).setOrigin(info.originNormX, info.originNormY).setScale(1 / info.scale);
}

/** Adds a centre-anchored image showing the missing Area star in a `px` box. Throws when none is baked at `px`. */
export function addAreaStar(scene: Phaser.Scene, textures: AreaStarTextures, px: number): Phaser.GameObjects.Image {
  const image = scene.add.image(0, 0, textures.missing[areaStarSize(px)].key);
  showAreaStar(image, textures, false, px);
  return image;
}

/**
 * The Home Tank best-stars badge (PRD H7): a white panel holding the area label (such as "Area 1")
 * in bold ink 18 px with its three 24 px stars, each earned or missing. Not interactive. Its shape
 * (setShape) puts the stars beside the label (the default) or stacks the label centred above the
 * centred star row; the text and star sizes are the same in both. measure() gives its size in the
 * current shape; layout() draws that shape in a rect of that size.
 */
export class AreaStarsBadge {
  private readonly textures: AreaStarTextures;
  private readonly container: Phaser.GameObjects.Container;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly stars: Phaser.GameObjects.Image[];
  private shape: HubBadgeShape = 'beside';

  constructor(scene: Phaser.Scene, textures: AreaStarTextures, label: string, depth: number, dpr: number) {
    this.textures = textures;
    this.panel = scene.add.graphics();
    this.label = scene.add.text(0, 0, label, uiTextStyle(HUB_STARS_BADGE.labelPx, dpr));
    this.stars = starFlags(NO_STARS).map(() => addAreaStar(scene, textures, HUB_STARS_BADGE.starPx));
    this.container = scene.add.container(0, 0, [this.panel, this.label, ...this.stars]).setDepth(depth);
  }

  /** Shows each of the 3 stars as earned or missing. */
  setStars(stars: AreaStars): void {
    starFlags(stars).forEach((earned, index) =>
      showAreaStar(this.stars[index], this.textures, earned, HUB_STARS_BADGE.starPx),
    );
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  setResolution(dpr: number): void {
    this.label.setResolution(dpr);
  }

  /** Sets the shape measure() and layout() use: the stars beside the label, or stacked under it. */
  setShape(shape: HubBadgeShape): void {
    this.shape = shape;
  }

  /**
   * Badge size in the current shape: the padding around the content, and beside, the label, the
   * label-to-stars gap and the star row across; stacked, the wider of the label and the star row
   * across and the label, the gap and the star row down.
   */
  measure(): Size {
    const { pad, gap, starPx } = HUB_STARS_BADGE;
    if (this.shape === 'stacked') {
      return {
        w: 2 * pad + Math.max(this.label.width, this.starsWidth()),
        h: 2 * pad + this.label.height + gap + starPx,
      };
    }
    return {
      w: 2 * pad + this.label.width + gap + this.starsWidth(),
      h: 2 * pad + Math.max(this.label.height, starPx),
    };
  }

  /**
   * Draws the panel in `rect` (a measure() size) in the current shape: beside, the label at the left
   * and the stars beside it, centred down; stacked, the label centred across at the top inside the
   * padding and the star row centred across a gap under it.
   */
  layout(rect: Rect): void {
    drawPanel(this.panel, rect.x, rect.y, rect.w, rect.h, UI_PANEL);
    if (this.shape === 'stacked') {
      this.layoutStacked(rect);
      return;
    }
    const { pad, gap } = HUB_STARS_BADGE;
    const centreY = rect.y + rect.h / 2;
    this.label.setPosition(rect.x + pad, centreY - this.label.height / 2);
    this.placeStars(rect.x + pad + this.label.width + gap, centreY);
  }

  /** Places the label centred across at the top of `rect` inside the padding, the star row centred a gap under it. */
  private layoutStacked(rect: Rect): void {
    const { pad, gap, starPx } = HUB_STARS_BADGE;
    const labelY = rect.y + pad;
    this.label.setPosition(rect.x + (rect.w - this.label.width) / 2, labelY);
    this.placeStars(rect.x + (rect.w - this.starsWidth()) / 2, labelY + this.label.height + gap + starPx / 2);
  }

  /** Places the star row with its left edge at `left` and its stars centred down on `centreY`. */
  private placeStars(left: number, centreY: number): void {
    const { starPx, starGap } = HUB_STARS_BADGE;
    this.stars.forEach((star, index) => star.setPosition(left + index * (starPx + starGap) + starPx / 2, centreY));
  }

  /** Width of the 3 stars and the gaps between them. */
  private starsWidth(): number {
    const { starPx, starGap } = HUB_STARS_BADGE;
    return this.stars.length * starPx + (this.stars.length - 1) * starGap;
  }
}
