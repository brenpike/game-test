import { describe, expect, it } from 'vitest';
import { DEV_FLAGS_MARK, NO_DEV_FLAGS, parseDevFlags } from './devFlags';

describe('NO_DEV_FLAGS', () => {
  it('has every flag off, the renderer on auto, and no area', () => {
    expect(NO_DEV_FLAGS).toEqual({ perf: false, compare: false, renderer: 'auto', area: null });
  });

  it('is frozen', () => {
    expect(Object.isFrozen(NO_DEV_FLAGS)).toBe(true);
  });

  it('has a stable mark', () => {
    expect(DEV_FLAGS_MARK).toBe('glam-gills-dev-flags');
  });
});

describe('parseDevFlags in a dev build', () => {
  it('is all off for an empty query, with or without "?"', () => {
    expect(parseDevFlags('', true)).toEqual(NO_DEV_FLAGS);
    expect(parseDevFlags('?', true)).toEqual(NO_DEV_FLAGS);
  });

  it('reads the query with or without the leading "?"', () => {
    expect(parseDevFlags('?perf', true)).toEqual({ perf: true, compare: false, renderer: 'auto', area: null });
    expect(parseDevFlags('perf', true)).toEqual({ perf: true, compare: false, renderer: 'auto', area: null });
  });

  it.each([
    ['perf', true],
    ['perf=', true],
    ['perf=1', true],
    ['perf=true', true],
    ['perf=yes', true],
    ['perf=0', false],
    ['perf=false', false],
    ['perf=FALSE', false],
    ['other=1', false],
  ])('perf for "%s" is %s', (query, expected) => {
    expect(parseDevFlags(query, true).perf).toBe(expected);
  });

  it.each([
    ['compare', true],
    ['compare=1', true],
    ['compare=0', false],
    ['compare=false', false],
    ['perf=1', false],
  ])('compare for "%s" is %s', (query, expected) => {
    expect(parseDevFlags(query, true).compare).toBe(expected);
  });

  it.each([
    ['renderer=canvas', 'canvas'],
    ['renderer=Canvas', 'canvas'],
    ['renderer=CANVAS', 'canvas'],
    ['renderer=webgl', 'auto'],
    ['renderer=', 'auto'],
    ['renderer', 'auto'],
    ['renderer=canvas2', 'auto'],
    ['', 'auto'],
  ])('renderer for "%s" is %s', (query, expected) => {
    expect(parseDevFlags(query, true).renderer).toBe(expected);
  });

  it('reads all flags together', () => {
    expect(parseDevFlags('?perf&compare=1&renderer=canvas', true)).toEqual({
      perf: true,
      compare: true,
      renderer: 'canvas',
      area: null,
    });
  });

  it('uses the first value of a repeated flag', () => {
    expect(parseDevFlags('?perf=0&perf=1', true).perf).toBe(false);
  });

  it.each([
    ['area=x', 'x'],
    ['?area=dev-test-area', 'dev-test-area'],
    ['area=%20%20x%20', 'x'],
    ['area=+x+', 'x'],
    ['area=a&area=b', 'a'],
    ['perf&area=x&compare', 'x'],
    ['area=', null],
    ['area', null],
    ['area=%20%20', null],
    ['area=&area=x', null],
    ['other=x', null],
    ['', null],
  ])('area for "%s" is %s', (query, expected) => {
    expect(parseDevFlags(query, true).area).toBe(expected);
  });

  it('reads area together with the other flags', () => {
    expect(parseDevFlags('?perf&area=dev-test-area', true)).toEqual({
      perf: true,
      compare: false,
      renderer: 'auto',
      area: 'dev-test-area',
    });
  });
});

describe('parseDevFlags outside a dev build', () => {
  it.each(['', '?perf', '?compare=1', '?renderer=canvas', '?perf&compare&renderer=canvas', '?area=x', '?area=dev-test-area&perf'])(
    'is always NO_DEV_FLAGS for "%s"',
    (query) => {
      expect(parseDevFlags(query, false)).toBe(NO_DEV_FLAGS);
    },
  );
});
