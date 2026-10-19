import { describe, expect, it } from 'vitest';
import {
  FACT_CARD_OK_LABEL,
  FACT_CARD_UNFOUND_HINT,
  TILAPIA_FACT,
  TILAPIA_MEET_RANGE,
  meetsTilapia,
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
