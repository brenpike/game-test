import { describe, expect, it } from 'vitest';
import {
  BOY_OR_GIRL_FACT,
  FACT_CARD_OK_LABEL,
  FACT_CARD_UNFOUND_HINT,
  TILAPIA_FACT,
  TILAPIA_MEET_RANGE,
  meetsTilapia,
  metThreatIds,
  type ThreatSighting,
} from './factCards';
import { TILAPIA } from './tuning';
import type { SafeArea } from './zone';

const BANNED = [
  'die',
  'dead',
  'death',
  'killed',
  'game over',
  'level',
  'fish tank',
  'fail',
  'injury',
  'wound',
  'damage',
  'monster',
  'loot',
  'inventory',
];

const SAFE_AREA: SafeArea = { x0: 0, x1: 100, y0: 0, y1: 100 };

function findBannedWords(text: string): string[] {
  return BANNED.filter((word) => new RegExp(`\\b${word}\\b`, 'i').test(text));
}

describe('tilapia fact card copy', () => {
  it('has the tilapia id, name and title', () => {
    expect(TILAPIA_FACT.id).toBe('tilapia');
    expect(TILAPIA_FACT.name).toBe('Tilapia');
    expect(TILAPIA_FACT.title).toBe('Meet the tilapia');
  });

  it('keeps the body non-empty and at most 120 characters', () => {
    expect(TILAPIA_FACT.body.length).toBeGreaterThan(0);
    expect(TILAPIA_FACT.body.length).toBeLessThanOrEqual(120);
  });

  it.each([
    TILAPIA_FACT.name,
    TILAPIA_FACT.title,
    TILAPIA_FACT.body,
    FACT_CARD_OK_LABEL,
    FACT_CARD_UNFOUND_HINT,
  ])('"%s" avoids banned words', (text) => {
    expect(findBannedWords(text)).toEqual([]);
  });
});

describe('boy or girl fact card copy', () => {
  it('has the boyOrGirl id, name, title and body', () => {
    expect(BOY_OR_GIRL_FACT.id).toBe('boyOrGirl');
    expect(BOY_OR_GIRL_FACT.name).toBe('Boy or girl?');
    expect(BOY_OR_GIRL_FACT.title).toBe('Boy or girl?');
    expect(BOY_OR_GIRL_FACT.body).toBe(
      'Grown-up boy axolotls are longer and slimmer, with a bigger bump by the back legs. Girls are rounder and plumper.',
    );
  });

  it('keeps the body non-empty and at most 120 characters', () => {
    expect(BOY_OR_GIRL_FACT.body.length).toBeGreaterThan(0);
    expect(BOY_OR_GIRL_FACT.body.length).toBeLessThanOrEqual(120);
  });

  it('has an id apart from the tilapia card', () => {
    expect(BOY_OR_GIRL_FACT.id).not.toBe(TILAPIA_FACT.id);
  });

  it.each([BOY_OR_GIRL_FACT.name, BOY_OR_GIRL_FACT.title, BOY_OR_GIRL_FACT.body])('"%s" avoids banned words', (text) => {
    expect(findBannedWords(text)).toEqual([]);
  });
});

describe('meetsTilapia', () => {
  it('uses a meet range larger than the lunge range', () => {
    expect(TILAPIA_MEET_RANGE).toBeGreaterThan(TILAPIA.lungeRange);
  });

  it('is true when a tilapia is at exactly the meet range', () => {
    const pos = { x: 200, y: 50 };
    const tilapias = [{ pos: { x: 200 + TILAPIA_MEET_RANGE, y: 50 } }];
    expect(meetsTilapia(pos, tilapias, SAFE_AREA)).toBe(true);
  });

  it('is false when the nearest tilapia is just past the meet range', () => {
    const pos = { x: 200, y: 50 };
    const tilapias = [{ pos: { x: 200 + TILAPIA_MEET_RANGE + 0.001, y: 50 } }];
    expect(meetsTilapia(pos, tilapias, SAFE_AREA)).toBe(false);
  });

  it('is false inside the safe area, edges included, even with a tilapia in range', () => {
    for (const pos of [
      { x: 50, y: 50 },
      { x: 100, y: 50 },
    ]) {
      const tilapias = [{ pos: { x: pos.x + 10, y: pos.y } }];
      expect(meetsTilapia(pos, tilapias, SAFE_AREA)).toBe(false);
    }
  });

  it('is true when any one of several tilapias is in range', () => {
    const pos = { x: 400, y: 50 };
    const tilapias = [{ pos: { x: 2000, y: 50 } }, { pos: { x: 400, y: 50 + TILAPIA_MEET_RANGE / 2 } }];
    expect(meetsTilapia(pos, tilapias, SAFE_AREA)).toBe(true);
  });

  it('is false with no tilapias', () => {
    expect(meetsTilapia({ x: 400, y: 50 }, [], SAFE_AREA)).toBe(false);
  });

  it('honours a custom range', () => {
    const pos = { x: 200, y: 50 };
    const tilapias = [{ pos: { x: 250, y: 50 } }];
    expect(meetsTilapia(pos, tilapias, SAFE_AREA, 50)).toBe(true);
    expect(meetsTilapia(pos, tilapias, SAFE_AREA, 49)).toBe(false);
  });
});

describe('metThreatIds', () => {
  const pos = { x: 200, y: 50 };

  it('gives the ids of the sightings within their meet range (inclusive), in sighting order', () => {
    const sightings: ThreatSighting[] = [
      { id: 'test-mud', distance: 60, meetRange: 60 },
      { id: 'test-far', distance: 60.001, meetRange: 60 },
      { id: 'tilapia', distance: 10, meetRange: TILAPIA_MEET_RANGE },
    ];
    expect(metThreatIds(pos, SAFE_AREA, sightings)).toEqual(['test-mud', 'tilapia']);
  });

  it('gives each id once', () => {
    const sightings: ThreatSighting[] = [
      { id: 'tilapia', distance: 10, meetRange: TILAPIA_MEET_RANGE },
      { id: 'test-mud', distance: 0, meetRange: 60 },
      { id: 'tilapia', distance: 20, meetRange: TILAPIA_MEET_RANGE },
    ];
    expect(metThreatIds(pos, SAFE_AREA, sightings)).toEqual(['tilapia', 'test-mud']);
  });

  it('meets nothing inside the safe area, edges included', () => {
    const sightings: ThreatSighting[] = [{ id: 'tilapia', distance: 0, meetRange: TILAPIA_MEET_RANGE }];
    expect(metThreatIds({ x: 50, y: 50 }, SAFE_AREA, sightings)).toEqual([]);
    expect(metThreatIds({ x: 100, y: 50 }, SAFE_AREA, sightings)).toEqual([]);
  });

  it('meets nothing with no sightings', () => {
    expect(metThreatIds(pos, SAFE_AREA, [])).toEqual([]);
  });
});
