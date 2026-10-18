import * as Phaser from 'phaser';
import { HOME_TANK_WALL, UI_PANEL } from '../art/palette';
import { iconKey } from '../art/textures';
import type { TreasureTextures } from '../art/treasureTextures';
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
import { addTreasureIcon, iconRowsSize, placeIconRows } from './FindPopup';

const MARGIN = 16;
const PAD = 24;
const TIGHT_PAD = 12;
const TITLE_PX = 34;
const BODY_PX = 20;
const ICON_PX = 32;
const ICON_GAP = 12;
const TREASURE_ICON_PX = 32;
const TEXT_MIN_W = 120;
const TEXT_MAX_W = 420;
const BACKDROP_COVER = 8192;
const FADE_MS = 400;
const MIN_SHOW_MS = 800;

/** The treasure ids the home screen body names: banked this trip when going home, returned when carried home. */
function namedTreasureIds(ending: TripEnding): readonly string[] {
  return ending.reason === 'wentHome' ? ending.bankedThisTrip : ending.returned;
}

/**
 * Interim end-of-trip home screen: an opaque Home Tank wall backdrop that swallows presses, a white
 * panel with the house icon, title, body, banked line, a wrapping icon row of the treasures the body
 * names, and the Swim again button. Built only from the trip snapshot's ending and banked count
 * through homeScreenText(). This is a thin seam: the Home Tank (#12) replaces this view behind the
 * same show, hide, layout, press and setResolution calls.
 */
export class HomeScreen {
  private readonly scene: Phaser.Scene;
  private readonly treasure: TreasureTextures;
  private readonly container: Phaser.GameObjects.Container;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly icon: Phaser.GameObjects.Image;
  private readonly title: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly bankedLine: Phaser.GameObjects.Text;
  private readonly button: UiButton;
  private view: SceneView;
  private treasureIcons: Phaser.GameObjects.Image[] = [];
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
      .setScale(ICON_PX / iconInfo.w / iconInfo.scale);
    this.title = scene.add.text(0, 0, '', uiTextStyle(TITLE_PX, dpr));
    this.body = scene.add.text(0, 0, '', { ...uiTextStyle(BODY_PX, dpr, false), align: 'center' });
    this.bankedLine = scene.add.text(0, 0, '', { ...uiTextStyle(BODY_PX, dpr, false), align: 'center' });
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
      .container(0, 0, [backdrop, this.panel, this.icon, this.title, this.body, this.bankedLine, this.button.container])
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
    this.body.setText(text.body);
    this.bankedLine.setText(text.bankedLine);
    this.buildTreasureRow(foundInfos(namedTreasureIds(ending)).map((info) => info.id));
    this.requested = false;
    this.shownAt = this.scene.time.now;
    this.layout(this.view);
    this.scene.tweens.killTweensOf(this.container);
    this.container.setVisible(true).setAlpha(motion.ambient ? 0 : 1);
    if (motion.ambient) {
      this.scene.tweens.add({ targets: this.container, alpha: 1, duration: FADE_MS });
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
    for (const text of [this.title, this.body, this.bankedLine]) {
      text.setResolution(dpr);
    }
    this.button.setResolution(dpr);
  }

  /**
   * Centres the panel; tightens its padding when a short screen cannot fit the full padding. The
   * treasure icon row wraps to the text width and takes no room (nor padding) when empty.
   */
  layout(view: SceneView): void {
    this.view = view;
    const { cssW, cssH } = view;
    const textW = Math.max(TEXT_MIN_W, Math.min(TEXT_MAX_W, cssW - 2 * (MARGIN + PAD)));
    this.title.setWordWrapWidth(Math.max(TEXT_MIN_W / 2, textW - ICON_PX - ICON_GAP), true);
    this.body.setWordWrapWidth(textW, true);
    this.bankedLine.setWordWrapWidth(textW, true);
    const headW = ICON_PX + ICON_GAP + this.title.width;
    const headH = Math.max(ICON_PX, this.title.height);
    const { width: rowW, height: rowH } = iconRowsSize(this.treasureIcons.length, textW);
    const sections = [headH, this.body.height, this.bankedLine.height, rowH, this.button.height].filter(
      (height) => height > 0,
    );
    const contentH = sections.reduce((sum, height) => sum + height, 0);
    const gaps = sections.length + 1;
    const pad = contentH + gaps * PAD <= cssH - 2 * MARGIN ? PAD : TIGHT_PAD;
    const panelW = Math.min(
      cssW - 2 * MARGIN,
      Math.max(headW, this.body.width, this.bankedLine.width, rowW, this.button.width) + 2 * PAD,
    );
    const panelH = contentH + gaps * pad;
    const panelY = Math.max(MARGIN, (cssH - panelH) / 2);
    drawPanel(this.panel, (cssW - panelW) / 2, panelY, panelW, panelH, UI_PANEL);
    let y = panelY + pad;
    const headX = (cssW - headW) / 2;
    this.icon.setPosition(headX, y + (headH - ICON_PX) / 2);
    this.title.setPosition(headX + ICON_PX + ICON_GAP, y + (headH - this.title.height) / 2);
    y += headH + pad;
    this.body.setPosition((cssW - this.body.width) / 2, y);
    y += this.body.height + pad;
    this.bankedLine.setPosition((cssW - this.bankedLine.width) / 2, y);
    y += this.bankedLine.height + pad;
    if (rowH > 0) {
      placeIconRows(this.treasureIcons, cssW / 2, y, textW);
      y += rowH + pad;
    }
    this.button.container.setPosition((cssW - this.button.width) / 2, y);
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
