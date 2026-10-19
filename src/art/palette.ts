/**
 * Art palette and metrics. Every value comes from docs/art-style-guide.md
 * (section 3a unless noted), which is a port of prototypes/art-styles/cartoon.js.
 * Presentational only: no game state, no Phaser.
 */

// ---- Reference viewport (guide section 1) -------------------------------
export const VIEW_W = 480;
export const VIEW_H = 360;
/** Water line, logical px. */
export const SURF = 80;
/** Time used for the reduced-motion still frame (guide section 9). */
export const T_STATIC = 1.0;

// ---- Ink and fixed colours ----------------------------------------------
/** Single outline colour for every object. Never use pure black. */
export const INK = '#2b2350';
/** Main outline width, logical px. Constant at every object size. */
export const LW = 3.5;
export const EYE = '#1b1535';
export const WHITE = '#ffffff';
/** Page background around the 4:3 canvas ("deep canal teal"). */
export const LETTERBOX = '#0c6a8c';

// ---- Sky, sun, clouds ----------------------------------------------------
export const SKY_TOP = '#4fc3ff';
export const SKY_HORIZON = '#c4f1ff';
export const SUN = '#ffe14a';
export const SUN_RAY = '#ffb52e';
export const CLOUD_SHINE = '#cfeeff';
export const SUN_SHINE = 'rgba(255,255,255,0.9)';

// ---- Willows and chinampa bank ------------------------------------------
export const WILLOW_TRUNK = '#a56a3b';
export const WILLOW_STRAND = '#35b342';
export const WILLOW_FOLIAGE = '#43c74d';
export const WILLOW_SHINE = '#9af27a';
export const BANK_SOIL = '#a2623a';
export const SOIL_DETAIL = '#7f4a2a';
export const GRASS = '#63d94f';
export const GRASS_SHINE = '#a6f58a';

// ---- Water (clean state, guide 3a and 3c) --------------------------------
export const WATER_SHALLOW = '#55e4d8';
export const WATER_MID = '#1cb6cc';
export const WATER_DEEP = '#0a5c98';
/** Gradient stop positions, shared by every water state. */
export const WATER_STOP_MID = 0.45;
/** y where the water gradient ends (deep stop). */
export const WATER_GRADIENT_END_Y = 330;
export const HAZE = 'rgba(40,200,215,0.12)';
export const SURFACE_LINE = 'rgba(236,255,252,0.95)';
export const SURFACE_LINE_WIDTH = 3.4;
/** Light-ray peak alpha at the top of a shaft; fades to 0 at y 300. */
export const RAY_ALPHA = 0.12;
export const RAY_ALPHA_SWING = 0.05;
export const RAY_END_Y = 300;

// ---- Canal bed and pebbles ----------------------------------------------
export const BED_TOP = '#b78552';
export const BED_BOTTOM = '#8c5e3a';
export const BED_LIP = '#e0b07a';
export const MUD = 'rgba(110,70,40,0.55)';
export const PEBBLE_A = '#d4cfe6';
export const PEBBLE_B = '#a9bfd6';
export const PEBBLE_C = '#efdcba';
export const PEBBLE_D = '#97a6c4';
export const PEBBLE_E = '#e0b095';
export const PEBBLE_COLOURS: readonly string[] = [PEBBLE_A, PEBBLE_B, PEBBLE_C, PEBBLE_D, PEBBLE_E];
export const PEBBLE_SHINE = 'rgba(255,255,255,0.8)';

// ---- Reeds, lily pads, flower -------------------------------------------
export const REED_LIGHT = '#63d247';
export const REED_DARK = '#45b83e';
export const REED_LEAF = '#86e660';
export const CATTAIL = '#9a5426';
export const LILY_PAD = '#47ce5a';
export const LILY_PAD_SHINE = '#a2f58c';
export const FLOWER_PETAL = '#ff82bf';
export const FLOWER_FRONT_PETAL = '#ffb4dc';
export const PETAL_SHINE = 'rgba(255,255,255,0.9)';
/** Flower centre uses the sun colour. */
export const FLOWER_CENTRE = SUN;

// ---- Axolotl detail colours that are not morph slots --------------------
export const FIN_RAY = 'rgba(236,120,160,0.65)';
export const BODY_SHINE = 'rgba(255,255,255,0.75)';
export const FRECKLE = 'rgba(236,120,160,0.55)';
export const BLUSH = 'rgba(255,100,148,0.5)';

// ---- Bubbles -------------------------------------------------------------
export const BUBBLE_FILL = 'rgba(255,255,255,0.38)';
export const BUBBLE_STROKE = 'rgba(43,35,80,0.85)';
export const BUBBLE_STROKE_WIDTH = 2;

// ---- Morph role slots (guide 3b) ----------------------------------------
/**
 * A morph swaps colours through these named slots. Shapes, line weights and
 * layer order never change. Only LEUCISTIC is implemented.
 */
export interface MorphPalette {
  readonly body: string;
  readonly farSide: string;
  readonly fin: string;
  readonly belly: string;
  readonly gillNearStem: string;
  readonly gillNearFilament: string;
  readonly gillFarStem: string;
  readonly gillFarFilament: string;
  readonly eye: string;
  readonly mouth: string;
}

/** Leucistic colourway: the approved prototype hero. */
export const LEUCISTIC: MorphPalette = {
  body: '#ffb7cf',
  farSide: '#f58fb0',
  fin: '#ffd9e6',
  belly: '#ffe3ed',
  gillNearStem: '#ff5f8d',
  gillNearFilament: '#ff7fa6',
  gillFarStem: '#e8507f',
  gillFarFilament: '#f26b92',
  eye: EYE,
  mouth: '#e8567e',
};

// ---- UI roles (guide 3d and section 8) -----------------------------------
export const UI_TEXT = INK;
export const UI_PRIMARY = '#ffe14a';
export const UI_SECONDARY = '#55e4d8';
export const UI_ACCENT = '#ff82bf';
export const UI_SUCCESS = '#86e660';
export const UI_PANEL = '#ffffff';
export const UI_PANEL_PINK = '#ffd9e6';
/** White text on the letterbox colour is 6.08:1. */
export const UI_ON_LETTERBOX = '#ffffff';

/**
 * Rounded system sans-serif stack. No webfont is fetched; the final typeface
 * is deferred (guide section 8).
 */
export const UI_FONT =
  'ui-rounded, "SF Pro Rounded", "Nunito", "Varela Round", "Quicksand", "Segoe UI", system-ui, sans-serif';

// ---- Predator (provisional) ----------------------------------------------
// Every value in this section is derived (provisional): not in the approved
// prototype, so confirm in a prototype before final art. The tilapia is cooler
// and less saturated than the hero so the axolotl stays the warmest, brightest
// thing on screen (guide section 2).
/**
 * Tilapia body, provisional. Contrast: body vs water deep #0a5c98 3.81:1
 * (body carries); ink vs shallow 9.24:1 and vs mid 5.90:1 (outline carries).
 */
export const TILAPIA_BODY = '#b4bfdc';
/** Tilapia fins, provisional. Darker cool tone so fins read as the far/back parts. */
export const TILAPIA_FIN = '#8f9cc4';
/** Tilapia belly band, provisional. */
export const TILAPIA_BELLY = '#dfe5f2';
/**
 * Soft tinted marks inside the tilapia (body bars, fin rays, gill line),
 * provisional. Never ink. They also tell the tilapia from the axolotl without hue.
 */
export const TILAPIA_MARK = 'rgba(110,124,172,0.55)';
/** Inside of the tilapia's open mouth, provisional. Cool, never red. */
export const TILAPIA_MOUTH = '#7d89b3';
/** Alert sign bubble fill, provisional. Reuses the sun yellow; ink "!" on it is 11.05:1. */
export const ALERT_FILL = SUN;
/** Telegraph glint fill, provisional. */
export const GLINT_FILL = WHITE;
/** Poof puff fill, provisional. White cloud puffs, never red. */
export const POOF_PUFF = WHITE;
/** Poof puff shine, provisional. Reuses the cloud shine. */
export const POOF_SHINE = CLOUD_SHINE;
/** Poof sparkle fill, provisional. Reuses the sun yellow. */
export const POOF_SPARKLE = SUN;
/** Protected halo: soft ring band behind the dots, provisional. */
export const HALO_BAND = 'rgba(255,255,255,0.22)';
/** Protected halo: dot fill, provisional. Ink-stroked dots carry against shallow water. */
export const HALO_DOT = 'rgba(255,255,255,0.95)';
/** Carry bubble inner rim, provisional. White vs water deep is 6.6:1. */
export const CARRY_RIM = 'rgba(255,255,255,0.9)';

// ---- Home Spot (guide 3g and 7d, provisional) ----------------------------
// Every value in this section is derived (provisional).
/** Burrow arch stones, in turn A, C, A, C, A, C, A. 9.50 and 10.70:1 with ink. */
export const HOME_STONE_A = PEBBLE_A;
export const HOME_STONE_C = PEBBLE_C;
export const HOME_STONES: readonly string[] = [HOME_STONE_A, HOME_STONE_C];
/** Burrow opening, the eye colour. 3.13:1 or better against every bed colour. */
export const HOME_OPENING = EYE;
/** Soft glow at the bottom of the opening. Inside the silhouette, so alpha is allowed. */
export const HOME_GLOW = 'rgba(255,225,74,0.25)';
/** Marker post tube, the willow trunk brown. */
export const HOME_POST = WILLOW_TRUNK;
/** Marker flag, sun yellow. Ink house icon on it is 11.05:1. */
export const HOME_FLAG = SUN;
/** Safe-ring dot fill. Opaque, with an opaque ink 2.0 stroke: 14.39:1. */
export const HOME_RING_DOT = WHITE;
/** Home Tank wall (3g), also the interim home screen backdrop. 12.89:1 with ink. */
export const HOME_TANK_WALL = '#fff1d6';

// ---- Hidden treasures and hiding places (guide 3g, 7e, provisional) -------
// Every value in this section is derived (provisional). Cue objects (Dash pot,
// dash-needed bubble, hint star) keep opaque ink and opaque partner fills.
/** Dash pot body, provisional. 9.07:1 with ink, so ink or fill is 3.01:1 or better on any background. */
export const DASH_POT = '#efc5aa';
/** Dash pot rim, provisional. 11.45:1 with ink. */
export const DASH_POT_RIM = '#f9e1d0';
/** Dash pot cracks, provisional. Internal detail lines, never ink. */
export const DASH_POT_CRACK = SOIL_DETAIL;
/** Dash pot shine, provisional. */
export const DASH_POT_SHINE = 'rgba(255,255,255,0.75)';
/** Hint star fill, provisional. White with ink: 14.39:1, 3.79:1 or better on any background. */
export const HINT_STAR_FILL = WHITE;
/** Dash-needed bubble fill, provisional. White with ink: 14.39:1. Never red. */
export const DASH_BUBBLE_FILL = WHITE;
/** Small cave rocks, provisional. Scenery: ink on them is 5.87:1 and 7.62:1. Cool and bigger than the burrow stones. */
export const CAVE_ROCK_A = PEBBLE_D;
export const CAVE_ROCK_B = PEBBLE_B;
/**
 * Small cave interior, provisional. A deep water tone darker than water deep
 * #0a5c98: 5.29:1 against bed top, 3.08:1 against bed bottom, 2.44:1 against
 * water deep. Cooler and bluer than the burrow opening, which is the eye colour.
 */
export const CAVE_INTERIOR = '#031d33';
/** Past-the-current marker stone, provisional. 10.70:1 with ink. */
export const MARKER_STONE = PEBBLE_C;
/** Past-the-current marker carving, provisional. Internal detail line, never ink. */
export const MARKER_CARVE = PEBBLE_E;
