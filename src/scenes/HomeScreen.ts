import * as Phaser from 'phaser';
import { HOME_TANK_WALL, UI_PANEL } from '../art/palette';
import { iconKey } from '../art/textures';
import type { TreasureTextures } from '../art/treasureTextures';
import { CARD, cardTextWidth, fitCard, homeTitleWrapWidth, iconRowsSize } from '../logic/cardFit';
import type { MotionProfile } from '../logic/motion';
import { foundInfos } from '../logic/trip';
import { TRIP_EVENTS, type TripEnding, type TripSnapshot } from '../logic/tripEvents';
import { SWIM_AGAIN_LABEL, homeScreenText } from '../logic/tripText';
import {
  createButton,
  cssColor,
  drawPanel,
  uiTextStyle,
  type GameAssets,
  type SceneView,
  type UiButton,
} from './BootScene';
import { addTreasureIcon, placeIconRows } from './FindPopup';
import { addMotionTween } from './motionTweens';

const TREASURE_ICON_PX = 32;
const BACKDROP_COVER = 8192;
const FADE_MS = 400;
const MIN_SHOW_MS = 800;

/** The treasure ids the home screen body names: banked this trip when going home, returned when carried home. */
function namedTreasureIds(ending: TripEnding): readonly string[] {
  return ending.reason === 'wentHome' ? ending.bankedThisTrip : ending.returned;
}

/** Number of wrapped lines `text` would draw for `content` at its current wrap width; 0 for no text. */
function wrappedLineCount(text: Phaser.GameObjects.Text, content: string): number {
  return content === '' ? 0 : text.getWrappedText(content).length;
}

/**
 * Interim end-of-trip home screen: an opaque Home Tank wall backdrop that swallows presses, a white
 * panel with the house icon, title, body (with the banked line as its last line), a wrapping icon row
 * of the treasures the body names, and the Swim again button. Built only from the trip snapshot's
 * ending and banked count through homeScreenText(). The body has a full and a short wording; layout()
 * lets fitCard() pick whichever fits the canvas, drop icon rows, or clip the body. This is a thin
 * seam: the Home Tank (#12) replaces this view behind the same show, hide, layout, press and
 * setResolution calls.
 */
export class HomeScreen {
  private readonly scene: Phaser.Scene;
  private readonly treasure: TreasureTextures;
  private readonly container: Phaser.GameObjects.Container;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly title: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly button: UiButton;
  private view: SceneView;
  private treasureIcons: Phaser.GameObjects.Image[] = [];
  private bodyOptions: readonly string[] = [''];
  private shownAt = 0;
  private requested = false;

  constructor(scene: Phaser.Scene, assets: GameAssets, view: SceneView, depth: number) {
    this.scene = scene;
    this.view = view;
    this.treasure = assets.treasure;
    const dpr = view.fit.dpr;
    const backdrop = scene.add
      .rectangle(
        -BACKDROP_COVER / 2,
        -BACKDROP_COVER / 2,
        BACKDROP_COVER,
        BACKDROP_COVER,
        cssColor(HOME_TANK_WALL).color,
        1,
      )
      .setOrigin(0, 0)
      .setInteractive();
    this.panel = scene.add.graphics();
    const iconInfo = assets.baked.icons.home;
    this.icon = scene.add
      .image(0, 0, iconKey('home'))
      .setOrigin(0, 0)
      .setScale(CARD.headIconPx / iconInfo.w / iconInfo.scale);
    this.title = scene.add.text(0, 0, '', uiTextStyle(CARD.titlePx, dpr));
    this.body = scene.add.text(0, 0, '', { ...uiTextStyle(CARD.bodyPx, dpr, false), align: 'center' });
    this.button = createButton(scene, assets.baked, {
      fill: 'primary',
      shape: 'wide',
      size: 1,
      label: SWIM_AGAIN_LABEL,
      icon: 'play',
      dpr,
      pressOnDown: false,
      onPress: () => this.press(),
    });
    this.button.setFocused(true);
    this.container = scene.add
      .container(0, 0, [backdrop, this.panel, this.icon, this.title, this.body, this.button.container])
      .setDepth(depth)
      .setVisible(false);
  }

  /** Whether the home screen is on screen. */
  isShowing(): boolean {
    return this.container.visible;
  }

  /** Shows the home screen for an ended trip, faded in unless motion is reduced. Throws if the trip has no ending. */
  show(snapshot: TripSnapshot, motion: MotionProfile): void {
    const ending = snapshot.ending;
    if (!ending) throw new Error(`HomeScreen: trip phase "${snapshot.phase}" has no ending`);
    const text = homeScreenText({
      reason: ending.reason,
      returnedNames: foundInfos(ending.returned).map((info) => info.name),
      bankedThisTripNames: foundInfos(ending.bankedThisTrip).map((info) => info.name),
      bankedTotal: snapshot.banked,
    });
    this.title.setText(text.title);
    this.bodyOptions = [`${text.body}\n${text.bankedLine}`, `${text.shortBody}\n${text.bankedLine}`];
    this.buildTreasureRow(foundInfos(namedTreasureIds(ending)).map((info) => info.id));
    this.requested = false;
    this.shownAt = this.scene.time.now;
    this.layout(this.view);
    this.scene.tweens.killTweensOf(this.container);
    this.container.setVisible(true).setAlpha(motion.ambient ? 0 : 1);
    if (motion.ambient) {
      addMotionTween(this.scene, { targets: this.container, props: { alpha: 1 }, duration: FADE_MS });
    }
  }

  hide(): void {
    this.requested = false;
    this.scene.tweens.killTweensOf(this.container);
    this.container.setVisible(false).setAlpha(1);
  }

  /** Asks for a new trip once per showing, after the screen has shown for MIN_SHOW_MS. */
  press(): void {
    if (!this.container.visible || this.requested) return;
    if (this.scene.time.now - this.shownAt < MIN_SHOW_MS) return;
    this.requested = true;
    this.scene.game.events.emit(TRIP_EVENTS.REQUEST_NEW_TRIP);
  }

  setResolution(dpr: number): void {
    for (const text of [this.title, this.body]) {
      text.setResolution(dpr);
    }
    this.button.setResolution(dpr);
  }

  /**
   * Centres the panel on a canvas that has room for it. fitCard() sizes it from the head, the body
   * (full or short wording, clipped only when nothing fits), the treasure icon row and the button:
   * it tightens the padding on a short screen, shows only the icon rows that fit (hiding the other
   * icons) and keeps the button inside the canvas. The icon row wraps to the text width and takes no
   * room (nor padding) when empty or hidden. Safe to call before show() and after hide().
   */
  layout(view: SceneView): void {
    this.view = view;
    const { cssW, cssH } = view;
    const textW = cardTextWidth(cssW);
    this.title.setWordWrapWidth(homeTitleWrapWidth(textW), true);
    this.body.setWordWrapWidth(textW, true);
    const lineH = this.body.getTextMetrics().fontSize;
    const variants = this.bodyOptions.map((option) => ({ lines: wrappedLineCount(this.body, option), lineH }));
    const headH = Math.max(CARD.headIconPx, this.title.height);
    const availH = cssH - 2 * CARD.margin;
    const fit = fitCard(availH, [
      { kind: 'fixed', height: headH },
      { kind: 'body', variants },
      { kind: 'icons', count: this.treasureIcons.length, maxW: textW },
      { kind: 'actions', height: this.button.height },
    ]);
    const [headSlot, bodySlot, iconsSlot, actionsSlot] = fit.slots;
    this.body.setText(this.bodyOptions[fit.bodyVariant]);
    this.body.setVisible(fit.bodyLines > 0);
    this.body.setMaxLines(fit.clipped ? fit.bodyLines : 0);
    this.treasureIcons.forEach((icon, index) => icon.setVisible(index < fit.iconCount));
    const { width: rowW } = iconRowsSize(fit.iconCount, textW);
    const headW = CARD.headIconPx + CARD.headIconGap + this.title.width;
    const bodyW = fit.bodyLines > 0 ? this.body.width : 0;
    const panelW = Math.min(
      cssW - 2 * CARD.margin,
      Math.max(headW, bodyW, rowW, this.button.width) + 2 * CARD.pad,
    );
    const panelY = CARD.margin + Math.max(0, (availH - fit.panelH) / 2);
    drawPanel(this.panel, (cssW - panelW) / 2, panelY, panelW, fit.panelH, UI_PANEL);
    const headX = (cssW - headW) / 2;
    const headY = panelY + headSlot.top;
    this.icon.setPosition(headX, headY + (headH - CARD.headIconPx) / 2);
    this.title.setPosition(headX + CARD.headIconPx + CARD.headIconGap, headY + (headH - this.title.height) / 2);
    this.body.setPosition((cssW - this.body.width) / 2, panelY + bodySlot.top);
    if (fit.iconCount > 0) {
      placeIconRows(this.treasureIcons.slice(0, fit.iconCount), cssW / 2, panelY + iconsSlot.top, textW);
    }
    this.button.container.setPosition((cssW - this.button.width) / 2, panelY + actionsSlot.top);
  }

  /** Replaces the treasure icon row with one 32 px icon per id. */
  private buildTreasureRow(ids: readonly string[]): void {
    for (const icon of this.treasureIcons) {
      icon.destroy();
    }
    this.treasureIcons = ids.map((id) => addTreasureIcon(this.scene, this.treasure, TREASURE_ICON_PX, id));
    this.container.add(this.treasureIcons);
  }
}
