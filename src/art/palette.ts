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
 * layer order never change. LEUCISTIC, WILD, GOLDEN_ALBINO, WHITE_ALBINO,
 * COPPER, PIEBALD, AXANTHIC and MELANOID are implemented; GFP is not in the MVP.
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
  /** Non-hue cues and tweaks (guide 3b, 6h). Undefined draws exactly the Leucistic look. */
  readonly extras?: MorphExtras;
}

/**
 * One small mark (speckle, fleck or glint) in the axolotl's local units.
 * Body marks use local x, y. Tail marks are tail-space: `t` runs 0 at the tail
 * root to 1 at the tail tip, and `offset` is a fraction of the local core
 * half-height (negative is toward the top edge, 0 the centre line, so the mark
 * follows the tail wave). Provisional.
 */
export type MorphMark =
  | { readonly space: 'body'; readonly x: number; readonly y: number; readonly r: number }
  | { readonly space: 'tail'; readonly t: number; readonly offset: number; readonly r: number };

/** A colour plus the marks painted in it. */
export interface MorphMarkSet {
  readonly colour: string;
  readonly marks: readonly MorphMark[];
}

/** Rim light along the upper silhouette (guide 3b). `width` is the visible inner width, logical px. */
export interface MorphRim {
  readonly colour: string;
  readonly width: number;
  /** True: the rim runs on to the tail tip, top fin edge included. False: it stops where the fin band starts. */
  readonly fin: boolean;
}

/** Ring just inside the edge of each eye bead. `width` in logical px. */
export interface MorphEyeRing {
  readonly colour: string;
  readonly width: number;
}

/**
 * Morph extras (guide 3b non-hue cues, 6h). Every field is optional; omitted
 * fields keep the Leucistic prototype look. Every value is derived (provisional).
 */
export interface MorphExtras {
  /** Spot colour for the layer 8 freckles (guide 3b spot table). `null` draws no spots. */
  readonly spot?: string | null;
  /** Body and head shine alpha. Default is BODY_SHINE (0.75). 0 draws no shine. */
  readonly shineAlpha?: number;
  readonly rim?: MorphRim;
  readonly eyeRing?: MorphEyeRing;
  /** Dark pattern dots, clipped to the silhouette, under the shines. */
  readonly speckles?: MorphMarkSet;
  /** Small bright dots, clipped to the silhouette, over the shines. */
  readonly flecks?: MorphMarkSet;
  /** Four-point glints with no outline, clipped to the silhouette, over the shines. */
  readonly shimmer?: MorphMarkSet;
  /** Default true. */
  readonly blush?: boolean;
  /** Fin ray and core-edge colour. Default FIN_RAY. `null` draws no fin rays. */
  readonly finRays?: string | null;
}

const bodyMark = (x: number, y: number, r: number): MorphMark => ({ space: 'body', x, y, r });
const tailMark = (t: number, offset: number, r: number): MorphMark => ({ space: 'tail', t, offset, r });

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

/**
 * Wild colourway (guide 3b), derived (provisional). Non-hue cue: dark speckles
 * plus a few gold flecks. All extras below are derived (provisional).
 */
export const WILD: MorphPalette = {
  body: '#b0b86e',
  farSide: '#939c55',
  fin: '#cdd398',
  belly: '#e2e4b8',
  gillNearStem: '#8a5f8f',
  gillNearFilament: '#a77aa9',
  gillFarStem: '#714a77',
  gillFarFilament: '#8c6490',
  eye: EYE,
  mouth: '#c85a74',
  extras: {
    // Far gill stem #714a77 at 0.55.
    spot: 'rgba(113,74,119,0.55)',
    // Corrective contrast cue (guide 12 "Wild rim"): a 2 px rim in the Wild
    // belly colour just inside the ink from snout to tail point 3, not on the
    // fin. Ink vs rim is 10.98:1 (worst case 3.31:1). It keeps the body, so Wild
    // luminance stays 0.446, and it differs from Melanoid's fin-inclusive #cec9f0 rim.
    rim: { colour: '#e2e4b8', width: 2, fin: false },
    // 8 dots (guide asks 6 to 9). Positions are derived (provisional).
    speckles: {
      colour: '#5f6b33',
      marks: [
        bodyMark(-12, -10, 1.6),
        bodyMark(-24, -6, 1.5),
        bodyMark(-18, 2, 1.4),
        bodyMark(-34, 0, 1.3),
        tailMark(0.15, -0.45, 1.5),
        tailMark(0.35, 0.4, 1.4),
        tailMark(0.55, -0.35, 1.2),
        tailMark(0.75, 0.2, 1.0),
      ],
    },
    flecks: {
      colour: '#ffe14a',
      marks: [bodyMark(-8, -6, 1.0), bodyMark(-27, 3, 1.0), tailMark(0.45, -0.1, 0.9)],
    },
  },
};

/**
 * Golden albino colourway (guide 3b), derived (provisional). Non-hue cue: light
 * eye with an ink ring, plus shimmer glints with no outline.
 */
export const GOLDEN_ALBINO: MorphPalette = {
  body: '#ffd36b',
  farSide: '#f2b445',
  fin: '#ffe7a8',
  belly: '#fff1c9',
  gillNearStem: '#ff8a65',
  gillNearFilament: '#ffa585',
  gillFarStem: '#ef7350',
  gillFarFilament: '#f78f6c',
  eye: '#d6336c',
  mouth: '#e86a5a',
  extras: {
    // #ef7350 at 0.55.
    spot: 'rgba(239,115,80,0.55)',
    eyeRing: { colour: INK, width: 1.5 },
    // Three white four-point glints, R 2, no outline. Positions are derived (provisional).
    shimmer: {
      colour: 'rgba(255,255,255,0.8)',
      marks: [bodyMark(-18, -8, 2), bodyMark(-30, 2, 2), tailMark(0.4, -0.2, 2)],
    },
  },
};

/**
 * White albino colourway (guide 3b), derived (provisional). Lightest value.
 * Non-hue cue: light pink eye with an ink ring, as Golden albino, on a
 * near-white body. Ink vs body 13.38:1, so it passes alone.
 */
export const WHITE_ALBINO: MorphPalette = {
  body: '#fff4f6',
  farSide: '#f5dce3',
  fin: '#ffe6ec',
  belly: '#fffafb',
  gillNearStem: '#ff7f9e',
  gillNearFilament: '#ff9fb6',
  gillFarStem: '#ec6a8b',
  gillFarFilament: '#f786a3',
  eye: '#e2557a',
  mouth: '#e86a80',
  extras: {
    spot: FRECKLE,
    eyeRing: { colour: INK, width: 1.5 },
  },
};

/**
 * Copper colourway (guide 3b), derived (provisional). Non-hue cue: fine copper
 * speckles plus white shimmer glints with no outline. Ink vs body 9.24:1, so it
 * passes alone.
 */
export const COPPER: MorphPalette = {
  body: '#fac595',
  farSide: '#eba878',
  fin: '#fdd8b6',
  belly: '#fee6cf',
  gillNearStem: '#f0785f',
  gillNearFilament: '#f7967f',
  gillFarStem: '#d9634b',
  gillFarFilament: '#e88068',
  eye: EYE,
  mouth: '#d9675a',
  extras: {
    // Speckle colour #a8613a at 0.55.
    spot: 'rgba(168,97,58,0.55)',
    // Nine fine dots. Positions are derived (provisional).
    speckles: {
      colour: '#a8613a',
      marks: [
        bodyMark(-6, -2, 1.2),
        bodyMark(-20, -2, 1.1),
        bodyMark(-32, 3, 1.0),
        bodyMark(-12, 6, 1.0),
        bodyMark(-26, 7, 1.0),
        tailMark(0.2, -0.35, 1.1),
        tailMark(0.4, 0.3, 1.0),
        tailMark(0.6, -0.2, 0.9),
        tailMark(0.8, 0.1, 0.8),
      ],
    },
    // Three white four-point glints, no outline. Positions are derived (provisional).
    shimmer: {
      colour: 'rgba(255,255,255,0.8)',
      marks: [bodyMark(-28, -4, 1.8), bodyMark(2, -9, 1.8), tailMark(0.5, 0.15, 1.6)],
    },
  },
};

/**
 * Piebald colourway (guide 3b), derived (provisional). Non-hue cue: a few large
 * dark patches on a near-white body. Ink vs body 12.75:1, so it passes alone and
 * the patches stay inset from the edge.
 */
export const PIEBALD: MorphPalette = {
  body: '#f8eff1',
  farSide: '#e8d8dd',
  fin: '#fbe6eb',
  belly: '#fffafb',
  gillNearStem: '#ee4f6e',
  gillNearFilament: '#f7728c',
  gillFarStem: '#d6435f',
  gillFarFilament: '#e5627b',
  eye: EYE,
  mouth: '#e8567e',
  extras: {
    spot: FRECKLE,
    // Five patches. Positions are derived (provisional).
    speckles: {
      colour: '#4a4459',
      marks: [
        bodyMark(8, -8, 3.4),
        bodyMark(-6, -3, 4.2),
        bodyMark(-24, 1, 3.6),
        tailMark(0.35, -0.3, 2.8),
        tailMark(0.55, 0.2, 2.2),
      ],
    },
  },
};

/**
 * Axanthic colourway (guide 3b), derived (provisional). Cool grey, second
 * darkest value, with normal shine and no eye ring (EYE vs body is 3.85:1).
 */
export const AXANTHIC: MorphPalette = {
  body: '#74767f',
  farSide: '#5e606a',
  fin: '#cfd1d8',
  belly: '#8a8c96',
  gillNearStem: '#8c879f',
  gillNearFilament: '#a6a2b8',
  gillFarStem: '#6f6b84',
  gillFarFilament: '#88849c',
  eye: EYE,
  mouth: '#e8567e',
  extras: {
    // Rim colour at 0.4, so spots show on the grey body.
    spot: 'rgba(228,230,235,0.4)',
    // The Axanthic rim is required: ink vs body is only 3.18:1, ink vs rim
    // 11.53:1. The fin #cfd1d8 is 9.43:1 with ink and passes alone, so the rim
    // stops at tail point 3. It differs from Melanoid's fin-inclusive #cec9f0 rim.
    rim: { colour: '#e4e6eb', width: 2, fin: false },
    finRays: 'rgba(94,96,106,0.65)',
  },
};

/**
 * Melanoid colourway (guide 3b), derived (provisional). Darkest value, matte,
 * with a required rim light: ink vs body is only 1.74:1, ink vs rim 9.07:1.
 * The mouth slot keeps the Leucistic value.
 */
export const MELANOID: MorphPalette = {
  body: '#4f4a6e',
  farSide: '#3e3a5a',
  fin: '#6a6590',
  belly: '#5f5a82',
  gillNearStem: '#6b4f8f',
  gillNearFilament: '#8467a8',
  gillFarStem: '#563f75',
  gillFarFilament: '#6e558f',
  eye: EYE,
  mouth: '#e8567e',
  extras: {
    // Rim colour, so spots show on the dark body.
    spot: 'rgba(206,201,240,0.35)',
    // Matte: body shine 0.45 instead of 0.75.
    shineAlpha: 0.45,
    // Top fin edge included. Width 2 px.
    rim: { colour: '#cec9f0', width: 2, fin: true },
    // Width to confirm in a prototype (guide 12); 1.5 px matches golden.
    eyeRing: { colour: '#cec9f0', width: 1.5 },
  },
};

/**
 * Friendly silhouette base for unfound morphs: one flat pebble A tone in every
 * slot, ink outline and a dark eye bead. No blush, shine, spots or fin rays.
 * Derived (provisional).
 */
export const SILHOUETTE: MorphPalette = {
  body: PEBBLE_A,
  farSide: PEBBLE_A,
  fin: PEBBLE_A,
  belly: PEBBLE_A,
  gillNearStem: PEBBLE_A,
  gillNearFilament: PEBBLE_A,
  gillFarStem: PEBBLE_A,
  gillFarFilament: PEBBLE_A,
  eye: EYE,
  mouth: PEBBLE_A,
  extras: { spot: null, shineAlpha: 0, blush: false, finRays: null },
};

/** Look ids of the real morphs. Must match the logic layer's RealMorphId. */
export type MorphLookId =
  | 'leucistic'
  | 'wild'
  | 'golden-albino'
  | 'white-albino'
  | 'copper'
  | 'piebald'
  | 'axanthic'
  | 'melanoid';

export const MORPH_PALETTES: Record<MorphLookId, MorphPalette> = {
  leucistic: LEUCISTIC,
  wild: WILD,
  'golden-albino': GOLDEN_ALBINO,
  'white-albino': WHITE_ALBINO,
  copper: COPPER,
  piebald: PIEBALD,
  axanthic: AXANTHIC,
  melanoid: MELANOID,
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
/**
 * Home Tank wall (3g). Home Tank scene backdrop and the Treasure Chest backdrop
 * (it was the interim home screen backdrop before the Home Tank). 12.89:1 with ink.
 */
export const HOME_TANK_WALL = '#fff1d6';

// ---- Home Tank kit (guide 3g and 7f, provisional) --------------------------
// Every value in this section is derived (provisional).
/** Home Tank stand band, the willow trunk brown (#a56a3b), as the Home Spot post. */
export const HOME_TANK_STAND = WILLOW_TRUNK;
/** Home Tank lid, pebble A (#d4cfe6). 9.5:1 with ink. */
export const HOME_TANK_LID = PEBBLE_A;
/** Home Tank air gap under the lid, the sky horizon tone (#c4f1ff). 11.91:1 with ink. */
export const HOME_TANK_AIR_GAP = SKY_HORIZON;
/** Home Tank glass shine stripes. Inside the glass, so alpha is allowed. */
export const HOME_TANK_GLASS_SHINE = 'rgba(255,255,255,0.25)';

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
