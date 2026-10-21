import { describe, expect, it } from 'vitest';
import { CANAL_TREASURES, type TreasureCategory } from './catalogue';
import type { TextFit } from './cardFit';
import * as firstFind from './firstFind';
import {
  FIRST_FIND_KINDS,
  FIRST_FIND_MIN_SHOW_MS,
  FIRST_FIND_OK_LABEL,
  FIRST_FIND_TEXT,
  MAYBE_LATER_LABEL,
  TRY_IT_NOW_LABEL,
  dueFirstFindCards,
  firstFindButtonWidth,
  firstFindButtonsStacked,
  firstFindCardVariants,
  firstFindKindOf,
  fitFirstFindCard,
  isFirstFindKind,
  tryItNowAxolotlId,
  withFirstFindSeen,
  type FirstFindKind,
  type FirstFindVariantSize,
} from './firstFind';
import { axolotlFindId } from './morphs';
import { wideButtonWidth } from './tankUi';

const BANNED = [
  'die',
  'dead',
  'death',
  'killed',
  'game over',
  'fail',
  'wipe',
  'injury',
  'wound',
  'damage',
  'monster',
  'invulnerab',
  'inventory',
  'checkpoint',
  'loot',
  ' base',
  'fish tank',
];

/** Catalogue ids of every treasure in `category`, in catalogue order. */
function idsOf(category: TreasureCategory): string[] {
  return CANAL_TREASURES.filter((treasure) => treasure.category === category).map((treasure) => treasure.id);
}

const DECORATIONS = idsOf('decoration');
const WEARABLES = idsOf('wearable');
const PAINT_SHELLS = idsOf('paintShell');

/** Every string a first-find card shows: exported strings, card wording and every variant. */
function everyCardString(): string[] {
  const exported = Object.values(firstFind as Record<string, unknown>).filter(
    (value): value is string => typeof value === 'string',
  );
  const wording = FIRST_FIND_KINDS.flatMap((kind) => [
    ...Object.values(FIRST_FIND_TEXT[kind]),
    ...firstFindCardVariants(kind).flatMap((variant) => [variant.title, variant.body]),
  ]);
  return [...exported, ...wording];
}

/** A first-find wording size: a head and a body of `lines` 25 px lines. */
function variantSize(headH: number, lines: number): FirstFindVariantSize {
  const body: TextFit = { lines, lineH: 25 };
  return { headH, body };
}

describe('first-find kinds and wording (C15)', () => {
  it('has the three treasure kinds in card order, Paint shell last', () => {
    expect(FIRST_FIND_KINDS).toEqual(['decoration', 'wearable', 'paintShell']);
    expect(Object.isFrozen(FIRST_FIND_KINDS)).toBe(true);
    expect(FIRST_FIND_MIN_SHOW_MS).toBe(800);
  });

  it('tells first-find kinds from everything else', () => {
    for (const kind of FIRST_FIND_KINDS) expect(isFirstFindKind(kind)).toBe(true);
    for (const value of ['Decoration', 'paint-shell', '', null, undefined, 3, {}]) {
      expect(isFirstFindKind(value)).toBe(false);
    }
  });

  it('uses the owner wording and button labels', () => {
    expect(TRY_IT_NOW_LABEL).toBe('Try it now!');
    expect(MAYBE_LATER_LABEL).toBe('Maybe later');
    expect(FIRST_FIND_OK_LABEL).toBe('OK');
    expect(FIRST_FIND_TEXT).toEqual({
      decoration: {
        title: 'You found a Decoration!',
        body: "Things to put in your tank. Open the tank's decorate mode to place them.",
        primary: 'OK',
      },
      wearable: {
        title: 'You found a Wearable!',
        body: 'Clothes for your axolotls. Each one gives a perk on trips. Dress up in Restyle.',
        primary: 'OK',
      },
      paintShell: {
        title: 'You found a Paint shell!',
        body: 'It unlocks a Dream colour: a magic paint for your axolotl. Try it in Restyle.',
        shortTitle: 'New Paint shell!',
        shortBody: 'It unlocks a Dream colour. Try it in Restyle.',
        primary: 'Try it now!',
        secondary: 'Maybe later',
      },
    });
  });

  it('offers wordings richest first', () => {
    expect(firstFindCardVariants('decoration')).toEqual([
      { title: FIRST_FIND_TEXT.decoration.title, body: FIRST_FIND_TEXT.decoration.body },
    ]);
    expect(firstFindCardVariants('wearable')).toEqual([
      { title: FIRST_FIND_TEXT.wearable.title, body: FIRST_FIND_TEXT.wearable.body },
    ]);
    expect(firstFindCardVariants('paintShell')).toEqual([
      { title: FIRST_FIND_TEXT.paintShell.title, body: FIRST_FIND_TEXT.paintShell.body },
      { title: 'You found a Paint shell!', body: 'It unlocks a Dream colour. Try it in Restyle.' },
      { title: 'New Paint shell!', body: 'It unlocks a Dream colour. Try it in Restyle.' },
    ]);
  });

  it('keeps every string and wording free of harsh or gamey words', () => {
    const outputs = everyCardString();
    expect(outputs.length).toBeGreaterThan(0);
    for (const output of outputs) {
      const lower = output.toLowerCase();
      for (const word of BANNED) expect(lower, output).not.toContain(word);
    }
  });

  it('sizes buttons like the other wide card buttons and stacks them when the card is too narrow', () => {
    expect(firstFindButtonWidth(TRY_IT_NOW_LABEL)).toBe(wideButtonWidth(TRY_IT_NOW_LABEL));
    expect(firstFindButtonWidth(MAYBE_LATER_LABEL)).toBe(wideButtonWidth(MAYBE_LATER_LABEL));
    expect(firstFindButtonsStacked(500, 200, 200)).toBe(false);
    expect(firstFindButtonsStacked(492, 200, 200)).toBe(false);
    expect(firstFindButtonsStacked(491, 200, 200)).toBe(true);
    expect(firstFindButtonsStacked(320, 200, 200)).toBe(true);
  });
});

describe('firstFindKindOf', () => {
  it('gives the catalogue category of a treasure', () => {
    expect(firstFindKindOf(DECORATIONS[0])).toBe('decoration');
    expect(firstFindKindOf(WEARABLES[0])).toBe('wearable');
    expect(firstFindKindOf(PAINT_SHELLS[0])).toBe('paintShell');
  });

  it('gives null for unknown and axolotl ids', () => {
    expect(firstFindKindOf('canal/not-a-treasure')).toBeNull();
    expect(firstFindKindOf('')).toBeNull();
    expect(firstFindKindOf(axolotlFindId('wild'))).toBeNull();
  });
});

describe('dueFirstFindCards', () => {
  it('is empty with nothing banked', () => {
    expect(dueFirstFindCards([], [])).toEqual([]);
  });

  it.each([
    { kind: 'decoration' as const, id: DECORATIONS[0] },
    { kind: 'wearable' as const, id: WEARABLES[0] },
    { kind: 'paintShell' as const, id: PAINT_SHELLS[0] },
  ])('is due once for a banked $kind not seen, and never once seen', ({ kind, id }) => {
    expect(dueFirstFindCards([id], [])).toEqual([{ kind, pictureId: id }]);
    expect(dueFirstFindCards([id], [kind])).toEqual([]);
  });

  it('runs Decoration, Wearable, then Paint shell when all are due', () => {
    const banked = [PAINT_SHELLS[0], WEARABLES[0], DECORATIONS[0]];
    expect(dueFirstFindCards(banked, []).map((card) => card.kind)).toEqual(['decoration', 'wearable', 'paintShell']);
  });

  it('skips seen kinds and keeps the rest in order', () => {
    const banked = [PAINT_SHELLS[0], WEARABLES[0], DECORATIONS[0]];
    expect(dueFirstFindCards(banked, ['wearable']).map((card) => card.kind)).toEqual(['decoration', 'paintShell']);
    expect(dueFirstFindCards(banked, [...FIRST_FIND_KINDS])).toEqual([]);
  });

  it('pictures the first banked treasure of each kind', () => {
    const banked = [WEARABLES[2], DECORATIONS[1], WEARABLES[0], PAINT_SHELLS[3], DECORATIONS[0], PAINT_SHELLS[0]];
    expect(dueFirstFindCards(banked, [])).toEqual([
      { kind: 'decoration', pictureId: DECORATIONS[1] },
      { kind: 'wearable', pictureId: WEARABLES[2] },
      { kind: 'paintShell', pictureId: PAINT_SHELLS[3] },
    ]);
  });

  it('ignores unknown ids, axolotl ids and duplicates', () => {
    expect(dueFirstFindCards(['canal/not-a-treasure', axolotlFindId('copper'), ''], [])).toEqual([]);
    const banked = [axolotlFindId('wild'), 'canal/unknown', WEARABLES[1], WEARABLES[1], WEARABLES[0]];
    expect(dueFirstFindCards(banked, [])).toEqual([{ kind: 'wearable', pictureId: WEARABLES[1] }]);
  });
});

describe('withFirstFindSeen', () => {
  it('adds the kind in FIRST_FIND_KINDS order', () => {
    expect(withFirstFindSeen([], 'paintShell')).toEqual(['paintShell']);
    expect(withFirstFindSeen(['paintShell'], 'decoration')).toEqual(['decoration', 'paintShell']);
    expect(withFirstFindSeen(['paintShell', 'decoration'], 'wearable')).toEqual([...FIRST_FIND_KINDS]);
  });

  it('keeps each kind once', () => {
    expect(withFirstFindSeen(['wearable', 'wearable'], 'wearable')).toEqual(['wearable']);
  });

  it('drops anything that is not a kind', () => {
    const seen = ['wearable', 'Decoration', 'axolotl'] as unknown as FirstFindKind[];
    expect(withFirstFindSeen(seen, 'decoration')).toEqual(['decoration', 'wearable']);
  });

  it('leaves its input alone', () => {
    const seen: FirstFindKind[] = ['wearable'];
    withFirstFindSeen(seen, 'decoration');
    expect(seen).toEqual(['wearable']);
  });
});

describe('tryItNowAxolotlId', () => {
  it('picks the explorer when owned', () => {
    expect(tryItNowAxolotlId('b', ['a', 'b', 'c'])).toBe('b');
  });

  it('picks the first owned axolotl when there is no owned explorer', () => {
    expect(tryItNowAxolotlId(null, ['a', 'b'])).toBe('a');
    expect(tryItNowAxolotlId('gone', ['a', 'b'])).toBe('a');
  });

  it('gives null with no axolotls', () => {
    expect(tryItNowAxolotlId(null, [])).toBeNull();
    expect(tryItNowAxolotlId('a', [])).toBeNull();
  });
});

describe('fitFirstFindCard', () => {
  it('picks the first wording that fits', () => {
    const variants = [variantSize(84, 6), variantSize(84, 2), variantSize(42, 2)];
    const roomy = fitFirstFindCard(600, variants, 64);
    expect(roomy.variant).toBe(0);
    expect(roomy.fit.clipped).toBe(false);
    const tight = fitFirstFindCard(84 + 50 + 64 + 4 * 12, variants, 64);
    expect(tight.variant).toBe(1);
    expect(tight.fit.clipped).toBe(false);
    const tighter = fitFirstFindCard(42 + 50 + 64 + 4 * 12, variants, 64);
    expect(tighter.variant).toBe(2);
    expect(tighter.fit.clipped).toBe(false);
  });

  it('lays out head, body, then actions', () => {
    const { fit } = fitFirstFindCard(600, [variantSize(42, 2)], 64);
    expect(fit.slots).toHaveLength(3);
    expect(fit.slots.map((slot) => slot.height)).toEqual([42, 50, 64]);
  });

  it('falls back to the last wording clipped when none fits', () => {
    const variants = [variantSize(84, 6), variantSize(42, 4)];
    const { fit, variant } = fitFirstFindCard(160, variants, 64);
    expect(variant).toBe(1);
    expect(fit.clipped).toBe(true);
    expect(fit.bodyLines).toBeLessThan(4);
    const actions = fit.slots[2];
    expect(actions.top + actions.height).toBeLessThanOrEqual(160);
  });

  it('throws for no wordings', () => {
    expect(() => fitFirstFindCard(600, [], 64)).toThrow(RangeError);
  });
});
