import * as Phaser from 'phaser';
import { AXO_LEG_ROOTS, type AxolotlPose, type LegLook } from '../art/drawAxolotl';
import type { ReedLook } from '../art/drawScenery';
import { INK, LW, UI_FONT } from '../art/palette';
import { bakePredatorTextures, type PredatorTextures } from '../art/predatorTextures';
import { bakeTankTextures, type TankTextures } from '../art/tankTextures';
import { bakeTreasureTextures, type TreasureTextures } from '../art/treasureTextures';
import {
  TEX,
  bakeTextures,
  buttonKey,
  createAxolotlTexture,
  iconKey,
  type AxolotlTexture,
  type BakedTextures,
  type ButtonFill,
  type ButtonShape,
  type ButtonVisual,
} from '../art/textures';
import { BUTTON_PRESS_OFFSET, BUTTON_SQUARE, BUTTON_WIDE, type IconKind } from '../art/drawUi';
import { mulberry32 } from '../logic/rng';
import { TANK } from '../logic/tank';
import { VIEW } from '../logic/tuning';
import { fitView, type ViewFit } from '../logic/viewport';
import { DEFAULT_ZONE_SEED, WORLD_H, buildCanalZone, type ReedSpec, type ZoneLayout } from '../logic/zone';

/** Scene keys, in render order (later scenes draw on top). */
export const SCENE_KEYS = Object.freeze({
  boot: 'Boot',
  title: 'Title',
  homeTank: 'HomeTank',
  swim: 'Swim',
  hud: 'Hud',
} as const);

/** Everything the boot scene prepares, handed from scene to scene as start data. */
export interface GameAssets {
  zone: ZoneLayout;
  baked: BakedTextures;
  axolotl: AxolotlTexture;
  predator: PredatorTextures;
  treasure: TreasureTextures;
  tank: TankTextures;
}

/** CSS viewport size plus the fitted view derived from the Scale Manager. */
export interface SceneView {
  cssW: number;
  cssH: number;
  fit: ViewFit;
}

const ART_SEED = DEFAULT_ZONE_SEED ^ 0x5eed;
const TANK_ART_SEED = ART_SEED ^ 0x7a4c;
const BLINK_PERIOD = 4.6;
const BLINK_LENGTH = 0.14;
const BLINK_CLOSED = 0.12;
const BUTTON_LABEL_PX = 24;
const SQUARE_LABEL_PX = 22;
const BUTTON_ICON_GAP = 8;

/**
 * Reads the CSS viewport from the Scale Manager. main.ts sizes the canvas to
 * CSS size x DPR and sets the Scale Manager zoom to 1 / DPR.
 */
export function readSceneView(scale: Phaser.Scale.ScaleManager): SceneView {
  const zoom = scale.zoom > 0 ? scale.zoom : 1;
  const cssW = scale.width * zoom;
  const cssH = scale.height * zoom;
  return { cssW, cssH, fit: fitView(cssW, cssH, 1 / zoom, { worldH: WORLD_H, ...VIEW }) };
}

/** Points a camera at CSS-pixel space: (0, 0) is the top-left of the canvas, 1 unit = 1 CSS px. */
export function useCssCamera(camera: Phaser.Cameras.Scene2D.Camera, dpr: number): void {
  camera.setOrigin(0, 0);
  camera.setZoom(dpr);
  camera.setScroll(0, 0);
}

/**
 * Zooms a camera to the fitted world view and sets bounds so the world is
 * centred on any axis where the view is larger than the world.
 */
export function fitWorldCamera(
  camera: Phaser.Cameras.Scene2D.Camera,
  fit: ViewFit,
  worldW: number,
  worldH: number,
): void {
  camera.setZoom(fit.zoom);
  const viewW = camera.width / fit.zoom;
  const viewH = camera.height / fit.zoom;
  camera.setBounds(
    Math.min(0, (worldW - viewW) / 2),
    Math.min(0, (worldH - viewH) / 2),
    Math.max(worldW, viewW),
    Math.max(worldH, viewH),
  );
}

/** Converts a CSS colour string (hex or rgb/rgba) to a Phaser colour int and 0..1 alpha. */
export function cssColor(value: string): { color: number; alpha: number } {
  const parsed = Phaser.Display.Color.ValueToColor(value);
  return { color: parsed.color, alpha: parsed.alphaGL };
}

/** Eye height factor for the blink cycle (guide section 9). */
export function blinkAt(seconds: number): number {
  return seconds % BLINK_PERIOD < BLINK_LENGTH ? BLINK_CLOSED : 1;
}

/** Whether two leg looks would paint the same leg. A missing look paints as present. */
function sameLegLook(a: LegLook | undefined, b: LegLook | undefined): boolean {
  const statusA = a?.status ?? 'present';
  const statusB = b?.status ?? 'present';
  if (statusA !== statusB) return false;
  return statusA !== 'regrowing' || a?.progress === b?.progress;
}

/** Whether two leg lists would paint the same legs. The painter reads one look per AXO_LEG_ROOTS entry. */
function sameLegs(a: readonly LegLook[] | undefined, b: readonly LegLook[] | undefined): boolean {
  for (let i = 0; i < AXO_LEG_ROOTS.length; i++) {
    if (!sameLegLook(a?.[i], b?.[i])) return false;
  }
  return true;
}

/** Whether two poses would paint the same frame. */
export function samePose(a: AxolotlPose, b: AxolotlPose): boolean {
  return (
    a.swimPhase === b.swimPhase &&
    a.gillPhase === b.gillPhase &&
    a.blink === b.blink &&
    a.tailAmp === b.tailAmp &&
    a.sparkle === b.sparkle &&
    sameLegs(a.legs, b.legs)
  );
}

/** UI text style: ink, rounded system font, crisp at the device pixel ratio. */
export function uiTextStyle(sizePx: number, dpr: number, bold = true): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: UI_FONT,
    fontSize: `${sizePx}px`,
    fontStyle: bold ? 'bold' : 'normal',
    color: INK,
    resolution: dpr,
  };
}

/** Draws a rounded light panel with the ink outline into a Graphics object. */
export function drawPanel(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
): void {
  const radius = Math.min(h / 2, 18);
  graphics.clear();
  graphics.fillStyle(cssColor(fill).color, 1);
  graphics.fillRoundedRect(x, y, w, h, radius);
  graphics.lineStyle(LW, cssColor(INK).color, 1);
  graphics.strokeRoundedRect(x, y, w, h, radius);
}

export interface ButtonOptions {
  fill: ButtonFill;
  shape: ButtonShape;
  /** Uniform size multiplier on the 1x button (wide 200 x 64, square 64 x 64 CSS px). */
  size: number;
  label: string;
  icon: IconKind;
  dpr: number;
  /** Fire on pointer down (for held, multi-touch actions) instead of pointer up. */
  pressOnDown: boolean;
  onPress: () => void;
}

/** A baked button with an icon and a text label, laid out in CSS px. */
export interface UiButton {
  container: Phaser.GameObjects.Container;
  /** Button body size in CSS px; the container origin is the body's top-left corner. */
  width: number;
  height: number;
  setFocused(focused: boolean): void;
  setResolution(dpr: number): void;
}

function placeButtonContent(
  icon: Phaser.GameObjects.Image,
  label: Phaser.GameObjects.Text,
  shape: ButtonShape,
  width: number,
  height: number,
  offsetY: number,
): void {
  if (shape === 'wide') {
    const rowW = icon.displayWidth + BUTTON_ICON_GAP + label.width;
    const left = (width - rowW) / 2;
    icon.setPosition(left, height / 2 - icon.displayHeight / 2 + offsetY);
    label.setPosition(left + icon.displayWidth + BUTTON_ICON_GAP, height / 2 - label.height / 2 + offsetY);
    return;
  }
  const stackH = icon.displayHeight + label.height;
  const top = (height - stackH) / 2;
  icon.setPosition(width / 2 - icon.displayWidth / 2, top + offsetY);
  label.setPosition(width / 2 - label.width / 2, top + icon.displayHeight + offsetY);
}

/** Builds a baked button (body texture + icon + label) inside a container at (0, 0). */
export function createButton(scene: Phaser.Scene, baked: BakedTextures, opts: ButtonOptions): UiButton {
  const dims = opts.shape === 'wide' ? BUTTON_WIDE : BUTTON_SQUARE;
  const width = dims.w * opts.size;
  const height = dims.h * opts.size;
  let focused = false;
  let pressed = false;

  const bodyInfo = baked.info[buttonKey(opts.fill, opts.shape, 'normal')];
  const body = scene.add
    .image(0, 0, bodyInfo.key)
    .setOrigin(bodyInfo.originNormX, bodyInfo.originNormY)
    .setScale(opts.size / bodyInfo.scale);
  const iconInfo = baked.icons[opts.icon];
  const iconScale = opts.shape === 'wide' ? opts.size : opts.size * 0.85;
  const icon = scene.add
    .image(0, 0, iconKey(opts.icon))
    .setOrigin(0, 0)
    .setScale(iconScale / iconInfo.scale);
  const labelPx = opts.shape === 'wide' ? Math.round(BUTTON_LABEL_PX * Math.min(1, opts.size)) : SQUARE_LABEL_PX;
  const label = scene.add.text(0, 0, opts.label, uiTextStyle(Math.max(SQUARE_LABEL_PX, labelPx), opts.dpr));
  const container = scene.add.container(0, 0, [body, icon, label]);

  const refresh = (): void => {
    const visual: ButtonVisual = pressed ? 'pressed' : focused ? 'focused' : 'normal';
    body.setTexture(buttonKey(opts.fill, opts.shape, visual));
    placeButtonContent(icon, label, opts.shape, width, height, pressed ? BUTTON_PRESS_OFFSET * opts.size : 0);
  };
  const release = (): void => {
    pressed = false;
    refresh();
  };
  const handleDown = (): void => {
    pressed = true;
    refresh();
    if (opts.pressOnDown) opts.onPress();
  };
  const handleUp = (): void => {
    const wasPressed = pressed;
    release();
    if (wasPressed && !opts.pressOnDown) opts.onPress();
  };

  body.setInteractive({ useHandCursor: true });
  body.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, handleDown);
  body.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, handleUp);
  body.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, release);
  refresh();

  return {
    container,
    width,
    height,
    setFocused(next: boolean): void {
      focused = next;
      refresh();
    },
    setResolution(dpr: number): void {
      label.setResolution(dpr);
      refresh();
    },
  };
}

function toReedLook(reed: ReedSpec): ReedLook {
  return {
    height: reed.by - reed.tipY,
    lean: reed.lean,
    bend: reed.bend,
    cat: reed.cat,
    leafU: reed.leafU,
    leafDir: reed.leafDir,
    light: reed.light,
  };
}

/** Builds the canal zone, bakes every texture at the fitted scale, then starts the title. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  create(): void {
    const { fit } = readSceneView(this.scale);
    const bakeScale = Math.min(VIEW.bakeScaleMax, Math.max(fit.bakeScale, fit.dpr));
    const zone = buildCanalZone();
    const baked = bakeTextures(this, {
      bakeScale,
      bgScale: Math.min(bakeScale, 2),
      chunks: zone.chunks,
      bankChunks: zone.bankChunks,
      sunChunk: zone.sunChunk,
      rand: mulberry32(ART_SEED),
      reeds: zone.reeds.map(toReedLook),
      pads: zone.pads,
    });
    const axolotl = createAxolotlTexture(this, TEX.axolotl, bakeScale);
    const predator = bakePredatorTextures(this, bakeScale);
    const treasure = bakeTreasureTextures(this, bakeScale);
    const tank = bakeTankTextures(this, bakeScale, {
      decorationPx: TANK.decorationPx,
      rand: mulberry32(TANK_ART_SEED),
    });
    const assets: GameAssets = { zone, baked, axolotl, predator, treasure, tank };
    this.scene.start(SCENE_KEYS.title, assets);
  }
}
