import * as Phaser from 'phaser';
import type { IconKind } from '../art/drawUi';
import { INK, UI_PANEL } from '../art/palette';
import { CARD, cardTextWidth } from '../logic/cardFit';
import {
  START_OVER_MIN_SHOW_MS,
  START_OVER_TEXT,
  fitStartOverCard,
  nextStartOverStep,
  startOverBodyVariants,
  startOverButtonWidth,
  startOverButtonsStacked,
  type StartOverAction,
  type StartOverCardStep,
  type StartOverStep,
} from '../logic/startOver';
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

const DIM_ALPHA = 0.45;
const DIM_COVER = 8192;
const KEEP_INDEX = 0;
const GO_INDEX = 1;
const BUTTON_COUNT = 2;
const CARD_STEPS: readonly StartOverCardStep[] = ['ask', 'confirm'];
const KEEP_ICONS: Readonly<Record<StartOverCardStep, IconKind>> = Object.freeze({ ask: 'play', confirm: 'check' });
const GO_ICON: IconKind = 'close';

/** How the Start over flow ended: everything kept, or erase now. */
export type StartOverOutcome = 'keep' | 'erase';

/**
 * Two-step "Start over" card (PRD D7): an ink dim that swallows every press, a white panel with the
 * bold title, the centred body (the grown-ups note on its own line on the first step) and two wide
 * buttons sized to their labels, keep on the left (on top when stacked) and go on the right. The
 * first step asks (Keep playing / Start over), the second confirms (No, keep them / Yes, erase).
 * Steps follow nextStartOverStep(); focus starts on keep at each step. Appears and leaves at once in
 * both motion modes. The go button ignores presses for START_OVER_MIN_SHOW_MS after each step shows,
 * so a double tap cannot erase; keep and Esc work at once. Reaching erase hides the card and calls
 * `onDone('erase')`; closing any other way hides it and calls `onDone('keep')`.
 */
export class StartOverCard {
  private readonly scene: Phaser.Scene;
  private readonly onDone: (outcome: StartOverOutcome) => void;
  private readonly container: Phaser.GameObjects.Container;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly buttons: Readonly<Record<StartOverCardStep, readonly UiButton[]>>;
  private view: SceneView;
  private step: StartOverStep = 'closed';
  private cardStep: StartOverCardStep = 'ask';
  private focusIndex = KEEP_INDEX;
  private shownAt = 0;

  constructor(
    scene: Phaser.Scene,
    assets: GameAssets,
    view: SceneView,
    depth: number,
    onDone: (outcome: StartOverOutcome) => void,
  ) {
    this.scene = scene;
    this.view = view;
    this.onDone = onDone;
    const dpr = view.fit.dpr;
    const ink = cssColor(INK);
    const dim = scene.add
      .rectangle(-DIM_COVER / 2, -DIM_COVER / 2, DIM_COVER, DIM_COVER, ink.color, DIM_ALPHA)
      .setOrigin(0, 0)
      .setInteractive();
    this.panel = scene.add.graphics();
    this.title = scene.add.text(0, 0, START_OVER_TEXT.ask.title, { ...uiTextStyle(CARD.titlePx, dpr), align: 'center' });
    this.body = scene.add.text(0, 0, '', { ...uiTextStyle(CARD.bodyPx, dpr, false), align: 'center' });
    this.buttons = {
      ask: this.createStepButtons(assets, 'ask', dpr),
      confirm: this.createStepButtons(assets, 'confirm', dpr),
    };
    const buttonContainers = CARD_STEPS.flatMap((step) => this.buttons[step].map((button) => button.container));
    this.container = scene.add
      .container(0, 0, [dim, this.panel, this.title, this.body, ...buttonContainers])
      .setDepth(depth)
      .setVisible(false);
  }

  /** Whether the card is on screen. */
  isShowing(): boolean {
    return this.container.visible;
  }

  /** Shows the first step (the ask) at once. Ignored while the card already shows. */
  open(): void {
    this.applyAction('open');
  }

  /**
   * Handles a key while the card shows: next, previous, left and right move the focus between the
   * two buttons, confirm presses the focused button (ignoring key repeat) and cancel keeps
   * everything. Other keys, and every key while hidden, do nothing.
   */
  handleKey(action: TankKey, repeat: boolean): void {
    if (!this.isShowing()) return;
    if (action === 'next' || action === 'right') this.setFocus(nextFocusIndex(this.focusIndex, BUTTON_COUNT, 1));
    else if (action === 'previous' || action === 'left') this.setFocus(nextFocusIndex(this.focusIndex, BUTTON_COUNT, -1));
    else if (action === 'confirm' && !repeat) this.pressButton(this.focusIndex);
    else if (action === 'cancel') this.applyAction('escape');
  }

  setResolution(dpr: number): void {
    this.title.setResolution(dpr);
    this.body.setResolution(dpr);
    for (const step of CARD_STEPS) {
      for (const button of this.buttons[step]) {
        button.setResolution(dpr);
      }
    }
  }

  /**
   * Centres the current step's card on a canvas that has room for it. fitStartOverCard() sizes it
   * from the title, the body wording (full or short, each with the grown-ups note when the step has
   * one, clipped to whole lines only when nothing fits) and the buttons: it tightens the padding on a
   * short screen, hides the title when nothing fits with it and keeps the buttons inside the canvas.
   * Stacks the buttons (keep on top) when they do not fit side by side. Safe to call before open()
   * and after the card hides.
   */
  layout(view: SceneView): void {
    this.view = view;
    const { cssW, cssH } = view;
    const step = this.cardStep;
    const [keep, go] = this.buttons[step];
    const stacked = startOverButtonsStacked(cssW, keep.width, go.width);
    const textW = cardTextWidth(cssW);
    this.title.setWordWrapWidth(textW, true);
    this.body.setWordWrapWidth(textW, true);
    this.body.setMaxLines(0);
    const lineH = this.body.getTextMetrics().fontSize;
    const bodyOptions = startOverBodyVariants(step);
    const bodyVariants = bodyOptions.map((option) => ({ lines: this.body.getWrappedText(option).length, lineH }));
    const buttonsW = stacked ? Math.max(keep.width, go.width) : keep.width + CARD.buttonGap + go.width;
    const buttonsH = stacked ? keep.height + CARD.buttonGap + go.height : Math.max(keep.height, go.height);
    const availH = cssH - 2 * CARD.margin;
    const { fit, showsTitle } = fitStartOverCard(availH, {
      titleH: this.title.height,
      bodyVariants,
      actionsH: buttonsH,
    });
    const [titleSlot, bodySlot, actionsSlot] = fit.slots;
    this.title.setVisible(showsTitle);
    this.body.setText(bodyOptions[fit.bodyVariant]);
    this.body.setVisible(fit.bodyLines > 0);
    this.body.setMaxLines(fit.clipped ? fit.bodyLines : 0);
    const titleW = showsTitle ? this.title.width : 0;
    const bodyW = fit.bodyLines > 0 ? this.body.width : 0;
    const panelW = Math.min(cssW - 2 * CARD.margin, Math.max(titleW, bodyW, buttonsW) + 2 * CARD.pad);
    const panelY = CARD.margin + Math.max(0, (availH - fit.panelH) / 2);
    drawPanel(this.panel, (cssW - panelW) / 2, panelY, panelW, fit.panelH, UI_PANEL);
    this.title.setPosition((cssW - this.title.width) / 2, panelY + titleSlot.top);
    this.body.setPosition((cssW - this.body.width) / 2, panelY + bodySlot.top);
    const buttonsY = panelY + actionsSlot.top;
    if (stacked) {
      keep.container.setPosition((cssW - keep.width) / 2, buttonsY);
      go.container.setPosition((cssW - go.width) / 2, buttonsY + keep.height + CARD.buttonGap);
      return;
    }
    const left = (cssW - buttonsW) / 2;
    keep.container.setPosition(left, buttonsY);
    go.container.setPosition(left + keep.width + CARD.buttonGap, buttonsY);
  }

  /** Builds the keep and go buttons of `step`, sized to their labels; each presses only while `step` shows. */
  private createStepButtons(assets: GameAssets, step: StartOverCardStep, dpr: number): UiButton[] {
    const text = START_OVER_TEXT[step];
    const keep = createButton(this.scene, assets.baked, {
      fill: 'primary',
      shape: 'wide',
      size: 1,
      width: startOverButtonWidth(text.keep),
      label: text.keep,
      icon: KEEP_ICONS[step],
      dpr,
      pressOnDown: false,
      onPress: () => this.pressStepButton(step, KEEP_INDEX),
    });
    const go = createButton(this.scene, assets.baked, {
      fill: 'secondary',
      shape: 'wide',
      size: 1,
      width: startOverButtonWidth(text.go),
      label: text.go,
      icon: GO_ICON,
      dpr,
      pressOnDown: false,
      onPress: () => this.pressStepButton(step, GO_INDEX),
    });
    return [keep, go];
  }

  /** Presses a pointer-tapped button, only when its step is the one showing. */
  private pressStepButton(step: StartOverCardStep, index: number): void {
    if (this.step !== step) return;
    this.pressButton(index);
  }

  /** Keep closes at once; go moves on once the step has shown for START_OVER_MIN_SHOW_MS. Ignored while hidden. */
  private pressButton(index: number): void {
    if (!this.isShowing()) return;
    if (index === KEEP_INDEX) {
      this.applyAction('keep');
      return;
    }
    if (this.scene.time.now - this.shownAt < START_OVER_MIN_SHOW_MS) return;
    this.applyAction('go');
  }

  /** Moves to the step after `action`: shows a card step, or hides the card and reports the outcome. */
  private applyAction(action: StartOverAction): void {
    const next = nextStartOverStep(this.step, action);
    if (next === this.step) return;
    if (next === 'ask' || next === 'confirm') {
      this.showStep(next);
      return;
    }
    this.step = 'closed';
    this.container.setVisible(false);
    this.onDone(next === 'erase' ? 'erase' : 'keep');
  }

  /** Shows `step` at once with its own buttons, focus on keep, and restarts the go button's wait. */
  private showStep(step: StartOverCardStep): void {
    this.step = step;
    this.cardStep = step;
    this.shownAt = this.scene.time.now;
    this.title.setText(START_OVER_TEXT[step].title);
    for (const cardStep of CARD_STEPS) {
      for (const button of this.buttons[cardStep]) {
        button.container.setVisible(cardStep === step);
      }
    }
    this.setFocus(KEEP_INDEX);
    this.layout(this.view);
    this.container.setVisible(true);
  }

  private setFocus(index: number): void {
    this.focusIndex = index;
    for (const step of CARD_STEPS) {
      this.buttons[step].forEach((button, buttonIndex) => button.setFocused(buttonIndex === index));
    }
  }
}
