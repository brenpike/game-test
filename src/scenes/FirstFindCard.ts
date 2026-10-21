import * as Phaser from 'phaser';
import { INK, UI_PANEL } from '../art/palette';
import type { TreasureTextures } from '../art/treasureTextures';
import { CARD, cardTextWidth, homeTitleWrapWidth } from '../logic/cardFit';
import {
  FIRST_FIND_MIN_SHOW_MS,
  FIRST_FIND_OK_LABEL,
  MAYBE_LATER_LABEL,
  TRY_IT_NOW_LABEL,
  firstFindButtonWidth,
  firstFindButtonsStacked,
  firstFindCardVariants,
  fitFirstFindCard,
  type DueFirstFind,
  type FirstFindKind,
  type FirstFindVariantSize,
  type FirstFindWording,
} from '../logic/firstFind';
import { nextFocusIndex, type TankKey } from '../logic/tankUi';
import {
  createButton,
  cssColor,
  drawPanel,
  uiTextStyle,
  type GameAssets,
  type SceneView,
  type UiButton,
} from './BootScene';
import { addGlowingTreasureIcon } from './FindPopup';

const PICTURE_ICON_PX = 32;
const DIM_ALPHA = 0.45;
const DIM_COVER = 8192;
const PRIMARY_INDEX = 0;
const SECONDARY_INDEX = 1;

/** How a first-find card closed: "Try it now!" on the Paint shell card, or any other close. */
export type FirstFindOutcome = 'tryItNow' | 'close';

/** A card button and the outcome it closes the card with. */
interface FirstFindButton {
  readonly button: UiButton;
  readonly outcome: FirstFindOutcome;
}

/**
 * First-find card over the Home Tank (PRD C15): an ink dim that swallows every press, a white panel
 * with a head row (the 32 px glowing picture of the treasure found, then the bold title), the
 * centred body and the buttons. The Paint shell card has "Try it now!" (primary, focused first) and
 * "Maybe later", stacked primary on top when they do not fit side by side; the other cards have one
 * wide primary OK that always shows the focus ring. Appears and leaves at once in both motion modes.
 * Every button, and Escape, ignores presses for FIRST_FIND_MIN_SHOW_MS after the card shows; a press
 * hides the card and calls `onClose` with its kind and outcome.
 */
export class FirstFindCard {
  private readonly scene: Phaser.Scene;
  private readonly treasure: TreasureTextures;
  private readonly onClose: (kind: FirstFindKind, outcome: FirstFindOutcome) => void;
  private readonly container: Phaser.GameObjects.Container;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly okButtons: readonly FirstFindButton[];
  private readonly paintShellButtons: readonly FirstFindButton[];
  private view: SceneView;
  private kind: FirstFindKind = 'decoration';
  private picture: Phaser.GameObjects.Container | null = null;
  private focusIndex = PRIMARY_INDEX;
  private shownAt = 0;

  constructor(
    scene: Phaser.Scene,
    assets: GameAssets,
    view: SceneView,
    depth: number,
    onClose: (kind: FirstFindKind, outcome: FirstFindOutcome) => void,
  ) {
    this.scene = scene;
    this.view = view;
    this.treasure = assets.treasure;
    this.onClose = onClose;
    const dpr = view.fit.dpr;
    const ink = cssColor(INK);
    const dim = scene.add
      .rectangle(-DIM_COVER / 2, -DIM_COVER / 2, DIM_COVER, DIM_COVER, ink.color, DIM_ALPHA)
      .setOrigin(0, 0)
      .setInteractive();
    this.panel = scene.add.graphics();
    this.title = scene.add.text(0, 0, '', uiTextStyle(CARD.titlePx, dpr));
    this.body = scene.add.text(0, 0, '', { ...uiTextStyle(CARD.bodyPx, dpr, false), align: 'center' });
    const ok = createButton(scene, assets.baked, {
      fill: 'primary',
      shape: 'wide',
      size: 1,
      label: FIRST_FIND_OK_LABEL,
      icon: 'check',
      dpr,
      pressOnDown: false,
      onPress: () => this.pressTapped(false, PRIMARY_INDEX),
    });
    const tryItNow = createButton(scene, assets.baked, {
      fill: 'primary',
      shape: 'wide',
      size: 1,
      width: firstFindButtonWidth(TRY_IT_NOW_LABEL),
      label: TRY_IT_NOW_LABEL,
      icon: 'play',
      dpr,
      pressOnDown: false,
      onPress: () => this.pressTapped(true, PRIMARY_INDEX),
    });
    const maybeLater = createButton(scene, assets.baked, {
      fill: 'secondary',
      shape: 'wide',
      size: 1,
      width: firstFindButtonWidth(MAYBE_LATER_LABEL),
      label: MAYBE_LATER_LABEL,
      icon: 'close',
      dpr,
      pressOnDown: false,
      onPress: () => this.pressTapped(true, SECONDARY_INDEX),
    });
    this.okButtons = [{ button: ok, outcome: 'close' }];
    this.paintShellButtons = [
      { button: tryItNow, outcome: 'tryItNow' },
      { button: maybeLater, outcome: 'close' },
    ];
    this.container = scene.add
      .container(0, 0, [dim, this.panel, this.title, this.body, ok.container, tryItNow.container, maybeLater.container])
      .setDepth(depth)
      .setVisible(false);
  }

  /** Whether the card is on screen. */
  isShowing(): boolean {
    return this.container.visible;
  }

  /** Shows the card for `card` at once, with its own buttons and the focus on the primary one. */
  show(card: DueFirstFind): void {
    this.kind = card.kind;
    this.picture?.destroy();
    this.picture = addGlowingTreasureIcon(this.scene, this.treasure, PICTURE_ICON_PX, card.pictureId);
    this.container.add(this.picture);
    const paintShell = card.kind === 'paintShell';
    for (const { button } of this.okButtons) button.container.setVisible(!paintShell);
    for (const { button } of this.paintShellButtons) button.container.setVisible(paintShell);
    this.setFocus(PRIMARY_INDEX);
    this.shownAt = this.scene.time.now;
    this.layout(this.view);
    this.container.setVisible(true);
  }

  hide(): void {
    this.container.setVisible(false);
  }

  /**
   * Handles a key while the card shows: next, previous, left and right move the focus between the
   * buttons, confirm presses the focused button (ignoring key repeat) and cancel acts like the
   * closing button (Maybe later on the Paint shell card, OK otherwise). Other keys, and every key
   * while hidden, do nothing.
   */
  handleKey(key: TankKey, repeat: boolean): void {
    if (!this.isShowing()) return;
    const count = this.currentButtons().length;
    if (key === 'next' || key === 'right') this.setFocus(nextFocusIndex(this.focusIndex, count, 1));
    else if (key === 'previous' || key === 'left') this.setFocus(nextFocusIndex(this.focusIndex, count, -1));
    else if (key === 'confirm' && !repeat) this.closeWith(this.currentButtons()[this.focusIndex].outcome);
    else if (key === 'cancel') this.closeWith('close');
  }

  setResolution(dpr: number): void {
    this.title.setResolution(dpr);
    this.body.setResolution(dpr);
    for (const { button } of [...this.okButtons, ...this.paintShellButtons]) {
      button.setResolution(dpr);
    }
  }

  /**
   * Centres the panel on a canvas that has room for it. fitFirstFindCard() picks the richest wording
   * that fits from the head (the picture beside the title), the body (clipped to whole lines only
   * when nothing fits) and the buttons: it tightens the padding on a short screen and keeps the
   * buttons inside the canvas. Stacks the Paint shell card's buttons (primary on top) when they do
   * not fit side by side. Safe to call before show() and after hide().
   */
  layout(view: SceneView): void {
    this.view = view;
    const { cssW, cssH } = view;
    const buttons = this.currentButtons().map((each) => each.button);
    const stacked = buttons.length > 1 && firstFindButtonsStacked(cssW, buttons[0].width, buttons[1].width);
    const textW = cardTextWidth(cssW);
    this.title.setWordWrapWidth(homeTitleWrapWidth(textW), true);
    this.body.setWordWrapWidth(textW, true);
    this.body.setMaxLines(0);
    const wordings = firstFindCardVariants(this.kind);
    const sizes = wordings.map((wording) => this.measureWording(wording));
    const buttonsW = stacked
      ? Math.max(...buttons.map((button) => button.width))
      : buttons.reduce((sum, button) => sum + button.width, 0) + (buttons.length - 1) * CARD.buttonGap;
    const buttonsH = stacked
      ? buttons.reduce((sum, button) => sum + button.height, 0) + (buttons.length - 1) * CARD.buttonGap
      : Math.max(...buttons.map((button) => button.height));
    const availH = cssH - 2 * CARD.margin;
    const { fit, variant } = fitFirstFindCard(availH, sizes, buttonsH);
    const [headSlot, bodySlot, actionsSlot] = fit.slots;
    const { headH } = sizes[variant];
    this.title.setText(wordings[variant].title);
    this.body.setText(wordings[variant].body);
    this.body.setVisible(fit.bodyLines > 0);
    this.body.setMaxLines(fit.clipped ? fit.bodyLines : 0);
    const headW = PICTURE_ICON_PX + CARD.headIconGap + this.title.width;
    const bodyW = fit.bodyLines > 0 ? this.body.width : 0;
    const panelW = Math.min(cssW - 2 * CARD.margin, Math.max(headW, bodyW, buttonsW) + 2 * CARD.pad);
    const panelY = CARD.margin + Math.max(0, (availH - fit.panelH) / 2);
    drawPanel(this.panel, (cssW - panelW) / 2, panelY, panelW, fit.panelH, UI_PANEL);
    const headX = (cssW - headW) / 2;
    const headY = panelY + headSlot.top;
    this.picture?.setPosition(headX + PICTURE_ICON_PX / 2, headY + headH / 2);
    this.title.setPosition(headX + PICTURE_ICON_PX + CARD.headIconGap, headY + (headH - this.title.height) / 2);
    this.body.setPosition((cssW - this.body.width) / 2, panelY + bodySlot.top);
    this.placeButtons(buttons, stacked, cssW, buttonsW, panelY + actionsSlot.top);
  }

  /** The head height (picture or title, whichever is taller) and wrapped body of one wording. */
  private measureWording(wording: FirstFindWording): FirstFindVariantSize {
    this.title.setText(wording.title);
    const lineH = this.body.getTextMetrics().fontSize;
    return {
      headH: Math.max(PICTURE_ICON_PX, this.title.height),
      body: { lines: this.body.getWrappedText(wording.body).length, lineH },
    };
  }

  /** Places the buttons from `top`: stacked and centred, or side by side as one centred row. */
  private placeButtons(buttons: readonly UiButton[], stacked: boolean, cssW: number, rowW: number, top: number): void {
    let x = (cssW - rowW) / 2;
    let y = top;
    for (const button of buttons) {
      if (stacked) {
        button.container.setPosition((cssW - button.width) / 2, y);
        y += button.height + CARD.buttonGap;
      } else {
        button.container.setPosition(x, y);
        x += button.width + CARD.buttonGap;
      }
    }
  }

  /** The buttons of the card showing: Try it now! and Maybe later on the Paint shell card, else OK. */
  private currentButtons(): readonly FirstFindButton[] {
    return this.kind === 'paintShell' ? this.paintShellButtons : this.okButtons;
  }

  /** Presses the pointer-tapped button at `index`, only when the card showing has its buttons. */
  private pressTapped(paintShell: boolean, index: number): void {
    if ((this.kind === 'paintShell') !== paintShell) return;
    this.closeWith(this.currentButtons()[index].outcome);
  }

  /** Once the card has shown for FIRST_FIND_MIN_SHOW_MS, hides it and calls `onClose`. Ignored while hidden. */
  private closeWith(outcome: FirstFindOutcome): void {
    if (!this.isShowing()) return;
    if (this.scene.time.now - this.shownAt < FIRST_FIND_MIN_SHOW_MS) return;
    this.hide();
    this.onClose(this.kind, outcome);
  }

  private setFocus(index: number): void {
    this.focusIndex = index;
    this.currentButtons().forEach(({ button }, buttonIndex) => button.setFocused(buttonIndex === index));
  }
}
