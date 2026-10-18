import * as Phaser from 'phaser';
import { INK, UI_PANEL } from '../art/palette';
import type { TexInfo } from '../art/textures';
import type { TreasureTextures } from '../art/treasureTextures';
import type { MotionProfile } from '../logic/motion';
import { foundInfos } from '../logic/trip';
import { TRIP_EVENTS, type TripSnapshot } from '../logic/tripEvents';
import { BANKED_TITLE, GO_HOME_LABEL, KEEP_EXPLORING_LABEL, bankedBody } from '../logic/tripText';
import {
  createButton,
  cssColor,
  drawPanel,
  uiTextStyle,
  type GameAssets,
  type SceneView,
  type UiButton,
} from './BootScene';
import { addTreasureIcon, iconRowsSize, placeIconRows } from './FindPopup';

const MARGIN = 16;
const PAD = 24;
const TIGHT_PAD = 12;
const TITLE_PX = 34;
const BODY_PX = 20;
const TEXT_MIN_W = 120;
const TEXT_MAX_W = 420;
const ICON_PX = 32;
const BUTTON_GAP = 12;
const STACK_BELOW_W = 460;
const DIM_ALPHA = 0.45;
const DIM_COVER = 8192;
const FADE_MS = 400;
const START_SCALE = 0.92;
const TWINKLE_MIN = 3;
const TWINKLE_MAX = 5;
const TWINKLE_PX = 14;
const TWINKLE_BURST_PX = 6;
const TWINKLE_SIDE_PX = 12;
const TWINKLE_ABOVE_PX = 6;
const TWINKLE_MS = 600;
const MIN_SHOW_MS = 600;
const KEEP_EXPLORING_INDEX = 0;
const GO_HOME_INDEX = 1;
const BUTTON_REQUESTS = [TRIP_EVENTS.REQUEST_KEEP_EXPLORING, TRIP_EVENTS.REQUEST_GO_HOME] as const;

/** One card twinkle and the outward direction it bursts along. */
interface CardTwinkle {
  image: Phaser.GameObjects.Image;
  angle: number;
}

/**
 * Banking celebration card over the swim scene: dim, white panel, title, the icons of the treasures
 * just banked in wrapping rows, the banked text naming them and the Keep exploring / Go home
 * buttons. Laid out around the screen centre so the fade-in scale grows from the middle. Each
 * button emits its trip request once.
 */
export class BankingCard {
  private readonly scene: Phaser.Scene;
  private readonly treasure: TreasureTextures;
  private readonly sparkle: TexInfo;
  private readonly container: Phaser.GameObjects.Container;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly title: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly buttons: readonly UiButton[];
  private view: SceneView;
  private icons: Phaser.GameObjects.Image[] = [];
  private twinkles: CardTwinkle[] = [];
  private focusIndex = KEEP_EXPLORING_INDEX;
  private shownAt = 0;
  private requested = false;

  constructor(scene: Phaser.Scene, assets: GameAssets, view: SceneView, depth: number) {
    this.scene = scene;
    this.view = view;
    this.treasure = assets.treasure;
    this.sparkle = assets.baked.sparkle;
    const dpr = view.fit.dpr;
    const ink = cssColor(INK);
    const dim = scene.add
      .rectangle(-DIM_COVER / 2, -DIM_COVER / 2, DIM_COVER, DIM_COVER, ink.color, DIM_ALPHA)
      .setOrigin(0, 0)
      .setInteractive();
    this.panel = scene.add.graphics();
    this.title = scene.add.text(0, 0, BANKED_TITLE, { ...uiTextStyle(TITLE_PX, dpr), align: 'center' });
    this.body = scene.add.text(0, 0, '', { ...uiTextStyle(BODY_PX, dpr, false), align: 'center' });
    const keepExploring = createButton(scene, assets.baked, {
      fill: 'primary',
      shape: 'wide',
      size: 1,
      label: KEEP_EXPLORING_LABEL,
      icon: 'play',
      dpr,
      pressOnDown: false,
      onPress: () => this.pressButton(KEEP_EXPLORING_INDEX),
    });
    const goHome = createButton(scene, assets.baked, {
      fill: 'secondary',
      shape: 'wide',
      size: 1,
      label: GO_HOME_LABEL,
      icon: 'home',
      dpr,
      pressOnDown: false,
      onPress: () => this.pressButton(GO_HOME_INDEX),
    });
    this.buttons = [keepExploring, goHome];
    this.container = scene.add
      .container(0, 0, [dim, this.panel, this.title, this.body, keepExploring.container, goHome.container])
      .setDepth(depth)
      .setVisible(false);
    this.setFocus(KEEP_EXPLORING_INDEX);
  }

  /** Whether the card is on screen. */
  isShowing(): boolean {
    return this.container.visible;
  }

  /** Shows the card for the snapshot's latest banking, faded and twinkling unless motion is reduced. */
  show(snapshot: TripSnapshot, motion: MotionProfile): void {
    this.requested = false;
    this.shownAt = this.scene.time.now;
    this.setFocus(KEEP_EXPLORING_INDEX);
    const infos = foundInfos(snapshot.justBanked);
    this.body.setText(bankedBody(infos.map((info) => info.name), snapshot.banked));
    this.buildRow(infos.map((info) => info.id));
    this.layout(this.view);
    this.scene.tweens.killTweensOf(this.container);
    this.container.setVisible(true);
    if (!motion.ambient) {
      this.container.setAlpha(1).setScale(1);
      return;
    }
    this.container.setAlpha(0).setScale(START_SCALE);
    this.scene.tweens.add({ targets: this.container, alpha: 1, scale: 1, duration: FADE_MS, ease: 'Sine.easeOut' });
    this.twinkles.forEach((twinkle) => this.burstTwinkle(twinkle));
  }

  hide(): void {
    this.requested = false;
    this.scene.tweens.killTweensOf(this.container);
    this.container.setVisible(false).setAlpha(1).setScale(1);
    this.clearRow();
  }

  /** Moves the focus ring to the other button. */
  moveFocus(): void {
    this.setFocus(this.focusIndex === KEEP_EXPLORING_INDEX ? GO_HOME_INDEX : KEEP_EXPLORING_INDEX);
  }

  pressFocused(): void {
    this.pressButton(this.focusIndex);
  }

  pressGoHome(): void {
    this.pressButton(GO_HOME_INDEX);
  }

  setResolution(dpr: number): void {
    this.title.setResolution(dpr);
    this.body.setResolution(dpr);
    for (const button of this.buttons) {
      button.setResolution(dpr);
    }
  }

  /**
   * Centres the card; tightens its padding when a short screen cannot fit the full padding and
   * stacks the buttons (Keep exploring on top) on a narrow one. Twinkles land at their end points.
   */
  layout(view: SceneView): void {
    this.view = view;
    const { cssW, cssH } = view;
    this.container.setPosition(cssW / 2, cssH / 2);
    const [keepExploring, goHome] = this.buttons;
    const stacked = cssW < STACK_BELOW_W;
    const textW = Math.max(TEXT_MIN_W, Math.min(TEXT_MAX_W, cssW - 2 * (MARGIN + PAD)));
    this.title.setWordWrapWidth(textW, true);
    this.body.setWordWrapWidth(textW, true);
    const { width: rowW, height: rowH } = iconRowsSize(this.icons.length, textW);
    const buttonsW = stacked ? keepExploring.width : keepExploring.width + BUTTON_GAP + goHome.width;
    const buttonsH = stacked ? keepExploring.height + BUTTON_GAP + goHome.height : keepExploring.height;
    const sections = [this.title.height, rowH, this.body.height, buttonsH].filter((height) => height > 0);
    const contentH = sections.reduce((sum, height) => sum + height, 0);
    const gaps = sections.length + 1;
    const pad = contentH + gaps * PAD <= cssH - 2 * MARGIN ? PAD : TIGHT_PAD;
    const panelW = Math.min(
      cssW - 2 * MARGIN,
      Math.max(buttonsW, rowW, this.title.width, this.body.width) + 2 * PAD,
    );
    const panelH = contentH + gaps * pad;
    const top = Math.max(MARGIN, (cssH - panelH) / 2) - cssH / 2;
    drawPanel(this.panel, -panelW / 2, top, panelW, panelH, UI_PANEL);
    let y = top + pad;
    this.title.setPosition(-this.title.width / 2, y);
    y += this.title.height + pad;
    if (rowH > 0) {
      this.layoutRow(y, textW, rowW, rowH);
      y += rowH + pad;
    }
    this.body.setPosition(-this.body.width / 2, y);
    y += this.body.height + pad;
    if (stacked) {
      keepExploring.container.setPosition(-keepExploring.width / 2, y);
      goHome.container.setPosition(-goHome.width / 2, y + keepExploring.height + BUTTON_GAP);
      return;
    }
    keepExploring.container.setPosition(-buttonsW / 2, y);
    goHome.container.setPosition(-buttonsW / 2 + keepExploring.width + BUTTON_GAP, y);
  }

  private setFocus(index: number): void {
    this.focusIndex = index;
    this.buttons.forEach((button, buttonIndex) => button.setFocused(buttonIndex === index));
  }

  /** Emits the button's trip request once per showing, after the card has shown for MIN_SHOW_MS. */
  private pressButton(index: number): void {
    if (!this.container.visible || this.requested) return;
    if (this.scene.time.now - this.shownAt < MIN_SHOW_MS) return;
    this.requested = true;
    this.setFocus(index);
    this.scene.game.events.emit(BUTTON_REQUESTS[index]);
  }

  /** Replaces the treasure icons (one 32 px icon per id) and the 3 to 5 twinkles around them. */
  private buildRow(ids: readonly string[]): void {
    this.clearRow();
    for (const id of ids) {
      this.icons.push(addTreasureIcon(this.scene, this.treasure, ICON_PX, id));
    }
    if (ids.length === 0) return;
    const count = Phaser.Math.Clamp(ids.length + 2, TWINKLE_MIN, TWINKLE_MAX);
    for (let i = 0; i < count; i++) {
      const image = this.scene.add
        .image(0, 0, this.sparkle.key)
        .setOrigin(this.sparkle.originNormX, this.sparkle.originNormY)
        .setScale(TWINKLE_PX / this.sparkle.w / this.sparkle.scale);
      this.twinkles.push({ image, angle: Math.PI + (i * Math.PI) / (count - 1) });
    }
    this.container.add([...this.icons, ...this.twinkles.map((twinkle) => twinkle.image)]);
  }

  private clearRow(): void {
    for (const twinkle of this.twinkles) {
      this.scene.tweens.killTweensOf(twinkle.image);
      twinkle.image.destroy();
    }
    for (const icon of this.icons) {
      icon.destroy();
    }
    this.icons = [];
    this.twinkles = [];
  }

  /**
   * Wraps the icons into centred rows no wider than `maxW` from `top` down, and puts each twinkle at
   * its end point around the whole `rowW` by `rowH` block, from the left side over the top to the right.
   */
  private layoutRow(top: number, maxW: number, rowW: number, rowH: number): void {
    placeIconRows(this.icons, 0, top, maxW);
    const centreY = top + rowH / 2;
    const radiusX = rowW / 2 + TWINKLE_SIDE_PX;
    const radiusY = rowH / 2 + TWINKLE_ABOVE_PX;
    for (const twinkle of this.twinkles) {
      this.scene.tweens.killTweensOf(twinkle.image);
      twinkle.image.setPosition(Math.cos(twinkle.angle) * radiusX, centreY + Math.sin(twinkle.angle) * radiusY);
    }
  }

  /** Moves a twinkle in from TWINKLE_BURST_PX short of its end point, once. */
  private burstTwinkle(twinkle: CardTwinkle): void {
    const { image, angle } = twinkle;
    const endX = image.x;
    const endY = image.y;
    image.setPosition(endX - Math.cos(angle) * TWINKLE_BURST_PX, endY - Math.sin(angle) * TWINKLE_BURST_PX);
    this.scene.tweens.add({ targets: image, x: endX, y: endY, duration: TWINKLE_MS, ease: 'Sine.easeOut' });
  }
}
