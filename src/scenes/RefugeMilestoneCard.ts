import * as Phaser from 'phaser';
import { isHabitatLookId } from '../art/habitatLook';
import { INK, UI_PANEL } from '../art/palette';
import type { RefugeTextures } from '../art/refugeTextures';
import type { TexInfo } from '../art/textures';
import type { Habitat } from '../logic/areas';
import { CARD, cardTightTextWidth, factCardBodyWrapWidths } from '../logic/cardFit';
import { KEEP_EXPLORING_LABEL, REFUGE_MILESTONE_TITLE, milestoneBody } from '../logic/refuge';
import { REFUGE_PICTURE, fitMilestoneCard } from '../logic/refugeUi';
import type { TankKey } from '../logic/tankUi';
import {
  createButton,
  cssColor,
  drawPanel,
  uiTextStyle,
  type GameAssets,
  type SceneView,
  type UiButton,
} from './BootScene';

const DIM_ALPHA = 0.45;
const DIM_COVER = 8192;
const MIN_SHOW_MS = 800;

/**
 * The clean section picture of the look of `habitat` in `art`. Throws a RangeError for an unknown
 * look; it never falls back to the canal picture.
 */
function cleanPictureFor(art: RefugeTextures, habitat: Readonly<Habitat>): TexInfo {
  if (!isHabitatLookId(habitat.look)) {
    throw new RangeError(`RefugeMilestoneCard: no picture look ${habitat.look} for habitat ${habitat.id}`);
  }
  return art.sections[habitat.look].clean;
}

/**
 * A habitat milestone card over the refuge (PRD N2): an ink dim that swallows every press, a white
 * panel with the bold "All clean!" title (hidden when nothing fits with it, fitMilestoneCard), the
 * habitat's clean section picture at REFUGE_PICTURE size, the centred body (milestoneBody) and one
 * wide primary "Keep exploring" button that always shows the focus ring. Appears at once from
 * construction, with no motion, in both motion modes. Keep exploring, Enter, Space and Escape hide
 * the card and call `onClose`; each ignores presses for the first MIN_SHOW_MS the card shows. The
 * owner destroys it once closed. Throws a RangeError when the habitat's look is unknown.
 */
export class RefugeMilestoneCard {
  private readonly scene: Phaser.Scene;
  private readonly onClose: () => void;
  private readonly container: Phaser.GameObjects.Container;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly picture: Phaser.GameObjects.Image;
  private readonly body: Phaser.GameObjects.Text;
  private readonly button: UiButton;
  private view: SceneView;
  private readonly shownAt: number;

  constructor(
    scene: Phaser.Scene,
    assets: GameAssets,
    view: SceneView,
    depth: number,
    habitat: Readonly<Habitat>,
    explorerName: string,
    onClose: () => void,
  ) {
    this.scene = scene;
    this.view = view;
    this.onClose = onClose;
    const pictureInfo = cleanPictureFor(assets.refuge, habitat);
    const dpr = view.fit.dpr;
    const ink = cssColor(INK);
    const dim = scene.add
      .rectangle(-DIM_COVER / 2, -DIM_COVER / 2, DIM_COVER, DIM_COVER, ink.color, DIM_ALPHA)
      .setOrigin(0, 0)
      .setInteractive();
    this.panel = scene.add.graphics();
    this.title = scene.add.text(0, 0, REFUGE_MILESTONE_TITLE, { ...uiTextStyle(CARD.titlePx, dpr), align: 'center' });
    this.picture = scene.add
      .image(0, 0, pictureInfo.key)
      .setOrigin(pictureInfo.originNormX, pictureInfo.originNormY)
      .setScale(1 / pictureInfo.scale);
    this.body = scene.add.text(0, 0, milestoneBody(explorerName, habitat.name), {
      ...uiTextStyle(CARD.bodyPx, dpr, false),
      align: 'center',
    });
    this.button = createButton(scene, assets.baked, {
      fill: 'primary',
      shape: 'wide',
      size: 1,
      label: KEEP_EXPLORING_LABEL,
      icon: 'play',
      dpr,
      pressOnDown: false,
      onPress: () => this.press(),
    });
    this.button.setFocused(true);
    this.container = scene.add
      .container(0, 0, [dim, this.panel, this.title, this.picture, this.body, this.button.container])
      .setDepth(depth);
    this.shownAt = scene.time.now;
    this.layout(view);
  }

  /** Whether the card is on screen. */
  isShowing(): boolean {
    return this.container.visible;
  }

  /**
   * Handles a key while the card shows: confirm presses Keep exploring (ignoring key repeat) and
   * cancel closes the card the same way. Other keys, and every key while hidden, do nothing.
   */
  handleKey(key: TankKey, repeat: boolean): void {
    if ((key === 'confirm' && !repeat) || key === 'cancel') this.press();
  }

  /** Keep exploring: once the card has shown for MIN_SHOW_MS, hides it and calls `onClose`. Ignored while hidden. */
  press(): void {
    if (!this.container.visible) return;
    if (this.scene.time.now - this.shownAt < MIN_SHOW_MS) return;
    this.container.setVisible(false);
    this.onClose();
  }

  setResolution(dpr: number): void {
    for (const text of [this.title, this.body]) {
      text.setResolution(dpr);
    }
    this.button.setResolution(dpr);
  }

  /**
   * Centres the panel on a canvas that has room for it. fitMilestoneCard() sizes it from the title,
   * the REFUGE_PICTURE, the body (clipped to whole lines only when nothing fits) and the button: it
   * tightens the padding on a short screen, hides the title when nothing fits with it and keeps the
   * button inside the canvas. The title wraps at cardTightTextWidth(); the body wraps at the first of
   * factCardBodyWrapWidths() that fits, as on the fact card. Safe to call after the card hides.
   */
  layout(view: SceneView): void {
    this.view = view;
    const { cssW, cssH } = this.view;
    this.title.setWordWrapWidth(cardTightTextWidth(cssW), true);
    this.body.setMaxLines(0);
    const lineH = this.body.getTextMetrics().fontSize;
    const wrapWidths = factCardBodyWrapWidths(cssW);
    const bodyVariants = wrapWidths.map((wrapW) => ({ lines: this.bodyLinesAt(wrapW), lineH }));
    const availH = cssH - 2 * CARD.margin;
    const { fit, showsTitle } = fitMilestoneCard(availH, {
      titleH: this.title.height,
      bodyVariants,
      actionsH: this.button.height,
    });
    const [titleSlot, pictureSlot, bodySlot, actionsSlot] = fit.slots;
    this.title.setVisible(showsTitle);
    this.body.setWordWrapWidth(wrapWidths[fit.bodyVariant], true);
    this.body.setVisible(fit.bodyLines > 0);
    this.body.setMaxLines(fit.clipped ? fit.bodyLines : 0);
    const titleW = showsTitle ? this.title.width : 0;
    const bodyW = fit.bodyLines > 0 ? this.body.width : 0;
    const panelW = Math.min(
      cssW - 2 * CARD.margin,
      Math.max(titleW, REFUGE_PICTURE.w, bodyW, this.button.width) + 2 * CARD.pad,
    );
    const panelY = CARD.margin + Math.max(0, (availH - fit.panelH) / 2);
    drawPanel(this.panel, (cssW - panelW) / 2, panelY, panelW, fit.panelH, UI_PANEL);
    this.title.setPosition((cssW - this.title.width) / 2, panelY + titleSlot.top);
    this.picture.setPosition((cssW - REFUGE_PICTURE.w) / 2, panelY + pictureSlot.top);
    this.body.setPosition((cssW - this.body.width) / 2, panelY + bodySlot.top);
    this.button.container.setPosition((cssW - this.button.width) / 2, panelY + actionsSlot.top);
  }

  destroy(): void {
    this.container.destroy();
  }

  /** Lines the current body wraps to at `wrapW`; leaves the body wrapping at `wrapW`. */
  private bodyLinesAt(wrapW: number): number {
    this.body.setWordWrapWidth(wrapW, true);
    return this.body.getWrappedText(this.body.text).length;
  }
}
