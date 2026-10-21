/**
 * Dev-only rig fidelity check (`?compare`, issue #46). Left: drawAxolotl painted live into its own
 * canvas texture every frame (the reference). Right: an axolotl rig view in the same pose and
 * appearance. The overlay toggle draws the rig over the reference at 50% alpha instead. Keys cycle
 * every look option, morph, Dream colour, the full outfit, leg states and the pose; Shift steps
 * back. main.ts loads this module only in dev builds and runs it as the only scene.
 */
import * as Phaser from 'phaser';
import {
  createAxolotlRigBake,
  createAxolotlRigView,
  rigRendererOf,
  type AxolotlRigBake,
  type AxolotlRigView,
} from '../art/axolotlRig';
import { RIG_STILL_POSE } from '../art/axolotlRigParts';
import { TAU, beginDraw, clearAll } from '../art/canvasKit';
import { AXO_MAX_TAIL_AMP, AXO_SCENE_SCALE, AXO_TEX, drawAxolotl, type AxolotlPose, type LegLook } from '../art/drawAxolotl';
import { dreamSheenAt } from '../art/drawDreamOverlay';
import { NO_OUTFIT, artOutfit, type ArtOutfit } from '../art/drawWearables';
import { UI_ON_LETTERBOX, axolotlPalette, type MorphPalette } from '../art/palette';
import { makeInfo, type TexInfo } from '../art/textures';
import {
  DEFAULT_LOOK,
  LOOK_FIELD_OPTIONS,
  stepOption,
  type AxolotlLook,
  type LookField,
  type LookOption,
} from '../logic/axolotlLook';
import { CANAL_TREASURES, DREAM_COLOURS, type DreamColour, type Wearable } from '../logic/catalogue';
import { REAL_MORPHS } from '../logic/morphs';
import { VIEW } from '../logic/tuning';
import { blinkAt, readSceneView, uiTextStyle, useCssCamera, type SceneView } from './BootScene';
import { faceSprite } from './spriteFacing';

/** Scene key of the compare scene. Also marks dev-only code in a build. */
export const COMPARE_SCENE_KEY = 'glam-gills-dev-compare';

const RIG_KEY = `${COMPARE_SCENE_KEY}:rig`;
const REFERENCE_KEY = `${COMPARE_SCENE_KEY}:reference`;
const MAX_DT_S = 0.05;
const STEP_S = 0.05;
const LEGEND_PX = 16;
const CAPTION_PX = 18;
const MARGIN = 12;
const FILL = 0.9;
const OVERLAY_ALPHA = 0.5;
const REGROW_PROGRESS = 0.5;
const CHANGED_LEG = 2;

/** The look fields the keys cycle, with their key and legend name. */
const LOOK_KEYS: readonly { readonly key: string; readonly field: LookField; readonly name: string }[] = [
  { key: 'x', field: 'sex', name: 'Boy or girl' },
  { key: 't', field: 'tail', name: 'Tail' },
  { key: 'b', field: 'body', name: 'Body' },
  { key: 'a', field: 'age', name: 'Age' },
  { key: 'z', field: 'size', name: 'Size' },
  { key: 'g', field: 'gills', name: 'Gills' },
  { key: 'e', field: 'eyes', name: 'Eyes' },
  { key: 'u', field: 'mouth', name: 'Mouth' },
  { key: 's', field: 'spots', name: 'Spots' },
];

/** Leg states the L key cycles: all present, then the near-front leg lost, then regrowing. */
const LEG_STATES: readonly { readonly name: string; readonly legs: readonly LegLook[] }[] = [
  { name: 'all present', legs: legsWith({ status: 'present', progress: 0 }) },
  { name: 'one lost', legs: legsWith({ status: 'lost', progress: 0 }) },
  { name: 'one regrowing', legs: legsWith({ status: 'regrowing', progress: REGROW_PROGRESS }) },
];

/** Dream colour choices: none (the real colour), then every Dream colour in catalogue order. */
const DREAM_CHOICES: readonly (DreamColour | null)[] = [null, ...DREAM_COLOURS];

/** Every Wearable in the catalogue, one per slot. */
const ALL_WEARABLES: readonly Wearable[] = CANAL_TREASURES.filter(
  (treasure): treasure is Wearable => treasure.category === 'wearable',
);

const FULL_OUTFIT: ArtOutfit = artOutfit(
  Object.fromEntries(ALL_WEARABLES.map((wearable) => [wearable.slot, wearable.id])),
);

/** Four present legs with `changed` as the near-front leg. */
function legsWith(changed: LegLook): LegLook[] {
  const present: LegLook = { status: 'present', progress: 0 };
  return [0, 1, 2, 3].map((index) => (index === CHANGED_LEG ? changed : present));
}

/** Index `step` places from `index` in a list of `length`, wrapping past either end. */
function wrapIndex(index: number, step: number, length: number): number {
  return (((index + step) % length) + length) % length;
}

/** `look` with `field` moved `step` options along its option list. */
function stepLook<Field extends LookField>(look: AxolotlLook, field: Field, step: number): AxolotlLook {
  const options = LOOK_FIELD_OPTIONS[field] as readonly LookOption<AxolotlLook[Field]>[];
  return { ...look, [field]: stepOption(options, look[field], step) };
}

/** The player-facing label of `look`'s value for `field`. */
function lookLabel(look: AxolotlLook, field: LookField): string {
  const options = LOOK_FIELD_OPTIONS[field] as readonly LookOption<string>[];
  const option = options.find((candidate) => candidate.id === look[field]);
  if (!option) throw new Error(`RigCompareScene: no ${field} option "${look[field]}"`);
  return option.label;
}

function onOff(value: boolean): string {
  return value ? 'on' : 'off';
}

export class RigCompareScene extends Phaser.Scene {
  private view!: SceneView;
  private bake!: AxolotlRigBake;
  private rig!: AxolotlRigView;
  private referenceInfo!: TexInfo;
  private referenceTexture!: Phaser.Textures.CanvasTexture;
  private reference!: Phaser.GameObjects.Image;
  private legend!: Phaser.GameObjects.Text;
  private leftCaption!: Phaser.GameObjects.Text;
  private rightCaption!: Phaser.GameObjects.Text;
  private look: AxolotlLook = DEFAULT_LOOK;
  private morphIndex = 0;
  private dreamIndex = 0;
  private outfitOn = false;
  private legIndex = 0;
  private dashing = false;
  private paused = false;
  private still = false;
  private overlay = false;
  private clock = 0;

  constructor() {
    super({ key: COMPARE_SCENE_KEY });
  }

  create(): void {
    this.view = readSceneView(this.scale);
    const { fit } = this.view;
    const bakeScale = Math.min(VIEW.bakeScaleMax, Math.max(fit.bakeScale, fit.dpr));
    this.bake = createAxolotlRigBake(this, RIG_KEY, bakeScale, this.appearance());
    this.rig = createAxolotlRigView(this, this.bake);
    this.createReferenceTexture();
    this.reference = this.add.image(0, 0, REFERENCE_KEY);
    this.rig.root.setDepth(1);
    const legendStyle = { ...uiTextStyle(LEGEND_PX, fit.dpr, false), color: UI_ON_LETTERBOX };
    const captionStyle = { ...uiTextStyle(CAPTION_PX, fit.dpr), color: UI_ON_LETTERBOX };
    this.legend = this.add.text(MARGIN, MARGIN, '', legendStyle);
    this.leftCaption = this.add.text(0, 0, '', captionStyle);
    this.rightCaption = this.add.text(0, 0, '', captionStyle);

    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('RigCompareScene: keyboard input is not available');
    keyboard.on(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.handleKey, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.showLegend();
    this.layout();
    this.showPose();
  }

  update(_time: number, deltaMs: number): void {
    if (!this.paused) this.clock += Math.min(deltaMs / 1000, MAX_DT_S);
    this.showPose();
  }

  private appearance(): { look: AxolotlLook; palette: MorphPalette; outfit: ArtOutfit } {
    const dream = DREAM_CHOICES[this.dreamIndex];
    return {
      look: this.look,
      palette: axolotlPalette(REAL_MORPHS[this.morphIndex].id, dream ? dream.id : null),
      outfit: this.outfitOn ? FULL_OUTFIT : NO_OUTFIT,
    };
  }

  private pose(): AxolotlPose {
    const legs = LEG_STATES[this.legIndex].legs;
    if (this.still) return { ...RIG_STILL_POSE, legs };
    const t = this.clock;
    return {
      swimPhase: (TAU * t) / 1.2,
      gillPhase: (TAU * t) / 0.8,
      blink: blinkAt(t),
      tailAmp: this.dashing ? AXO_MAX_TAIL_AMP : 1,
      sparkle: 0,
      legs,
      sheen: dreamSheenAt(t),
    };
  }

  /** (Re)creates the reference canvas texture at the bake's current scale (it follows Size). */
  private createReferenceTexture(): void {
    this.referenceInfo = makeInfo(REFERENCE_KEY, this.bake.scale, AXO_TEX);
    if (this.textures.exists(REFERENCE_KEY)) this.textures.remove(REFERENCE_KEY);
    const texture = this.textures.createCanvas(REFERENCE_KEY, this.referenceInfo.pxW, this.referenceInfo.pxH);
    if (!texture) throw new Error(`RigCompareScene: could not create canvas texture "${REFERENCE_KEY}"`);
    this.referenceTexture = texture;
  }

  /** Paints the reference with drawAxolotl and poses the rig, both in the current pose. */
  private showPose(): void {
    const pose = this.pose();
    const { look, palette, outfit } = this.appearance();
    const ctx = this.referenceTexture.context;
    clearAll(ctx);
    beginDraw(ctx, this.referenceInfo.scale, AXO_TEX.originX, AXO_TEX.originY);
    drawAxolotl(ctx, pose, palette, look, outfit);
    this.referenceTexture.refresh();
    this.rig.setPose(pose);
  }

  /** Re-bakes the rig for the current appearance; a new scale re-creates the reference texture too. */
  private applyAppearance(): void {
    this.bake.setAppearance(this.appearance());
    if (this.bake.scale !== this.referenceInfo.scale) {
      this.createReferenceTexture();
      this.reference.setTexture(REFERENCE_KEY);
    }
    this.layout();
    this.showPose();
  }

  private handleKey(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    const step = event.shiftKey ? -1 : 1;
    const lookKey = LOOK_KEYS.find((entry) => entry.key === key);
    if (lookKey) {
      this.look = stepLook(this.look, lookKey.field, step);
      this.applyAppearance();
    } else if (key === 'm') {
      this.morphIndex = wrapIndex(this.morphIndex, step, REAL_MORPHS.length);
      this.applyAppearance();
    } else if (key === 'd') {
      this.dreamIndex = wrapIndex(this.dreamIndex, step, DREAM_CHOICES.length);
      this.applyAppearance();
    } else if (key === 'o') {
      this.outfitOn = !this.outfitOn;
      this.applyAppearance();
    } else if (!this.handlePoseKey(key, step)) {
      return;
    }
    this.showLegend();
  }

  /** Pose and view keys. Returns false for a key that does nothing. */
  private handlePoseKey(key: string, step: number): boolean {
    switch (key) {
      case 'l':
        this.legIndex = wrapIndex(this.legIndex, step, LEG_STATES.length);
        break;
      case 'h':
        this.dashing = !this.dashing;
        break;
      case 'p':
        this.paused = !this.paused;
        break;
      case 'n':
        this.paused = true;
        this.clock = Math.max(0, this.clock + step * STEP_S);
        break;
      case 'r':
        this.still = !this.still;
        break;
      case 'v':
        this.overlay = !this.overlay;
        break;
      default:
        return false;
    }
    this.layout();
    this.showPose();
    return true;
  }

  private showLegend(): void {
    const dream = DREAM_CHOICES[this.dreamIndex];
    const lookLines = LOOK_KEYS.map(({ key, field, name }) => `${name}: ${lookLabel(this.look, field)} [${key}]`);
    this.legend.setText([
      lookLines.slice(0, 5).join('   '),
      lookLines.slice(5).join('   '),
      [
        `Morph: ${REAL_MORPHS[this.morphIndex].name} [m]`,
        `Dream colour: ${dream ? dream.name : 'None'} [d]`,
        `Full outfit: ${onOff(this.outfitOn)} [o]`,
      ].join('   '),
      [
        `Legs: ${LEG_STATES[this.legIndex].name} [l]`,
        `Dash: ${onOff(this.dashing)} [h]`,
        `Paused: ${onOff(this.paused)} [p], step [n]`,
        `Still pose: ${onOff(this.still)} [r]`,
        `Overlay: ${onOff(this.overlay)} [v]`,
      ].join('   '),
      `Renderer: ${rigRendererOf(this)}   Shift steps back`,
    ]);
  }

  /**
   * Places the reference on the left and the rig on the right (or over the reference). A Large
   * axolotl fills its half, never past one texture pixel per device pixel; smaller sizes show smaller.
   */
  private layout(): void {
    this.view = readSceneView(this.scale);
    const { cssW, cssH, fit } = this.view;
    useCssCamera(this.cameras.main, fit.dpr);
    const top = this.legend.y + this.legend.height + MARGIN;
    const captionH = this.leftCaption.height + MARGIN;
    const areaH = Math.max(1, cssH - top - captionH - MARGIN);
    const halfW = cssW / 2;
    const fitScale = Math.min((FILL * halfW) / AXO_TEX.w, (FILL * areaH) / AXO_TEX.h) / AXO_SCENE_SCALE;
    const viewScale = Math.min(fitScale, this.bake.bakeScale / (AXO_SCENE_SCALE * fit.dpr));
    const displayScale = this.bake.displayScale(viewScale);
    const localPx = displayScale * this.bake.scale;
    const anchorY = top + captionH + areaH / 2 - (AXO_TEX.h / 2 - AXO_TEX.originY) * localPx;
    const anchorX = (centre: number): number => centre - (AXO_TEX.w / 2 - AXO_TEX.originX) * localPx;

    const leftX = anchorX(halfW / 2);
    faceSprite(this.reference.setPosition(leftX, anchorY), 1, displayScale);
    this.reference.setOrigin(this.referenceInfo.originNormX, this.referenceInfo.originNormY);
    const rigX = this.overlay ? leftX : anchorX(halfW + halfW / 2);
    faceSprite(this.rig.root.setPosition(rigX, anchorY), 1, displayScale);
    this.rig.root.setAlpha(this.overlay ? OVERLAY_ALPHA : 1);

    this.leftCaption.setText(this.overlay ? 'Rig over reference (50%)' : 'Reference: drawAxolotl');
    this.rightCaption.setText('Rig').setVisible(!this.overlay);
    this.leftCaption.setPosition(halfW / 2 - this.leftCaption.width / 2, top);
    this.rightCaption.setPosition(halfW + halfW / 2 - this.rightCaption.width / 2, top);
  }

  private handleShutdown(): void {
    this.input.keyboard?.off(Phaser.Input.Keyboard.Events.ANY_KEY_DOWN, this.handleKey, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.rig.destroy();
    this.bake.destroy();
    if (this.textures.exists(REFERENCE_KEY)) this.textures.remove(REFERENCE_KEY);
  }
}
