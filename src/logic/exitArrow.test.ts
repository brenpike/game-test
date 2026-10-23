import { describe, expect, it } from 'vitest';
import { CANAL_AREA, CHINAMPA_AREA, POND_2_AREA, POND_AREA } from './areas';
import { exitArrowSide } from './exitArrow';
import { areaSize } from './zone';

describe('exitArrowSide', () => {
  it('points right for each of Areas 1 to 4', () => {
    for (const area of [CANAL_AREA, POND_AREA, POND_2_AREA, CHINAMPA_AREA]) {
      const { width } = areaSize(area.layout.screensWide, area.layout.screensTall);
      expect(exitArrowSide(area.exit, width), area.id).toBe('right');
    }
  });

  it('points left for an exit in the left half', () => {
    expect(exitArrowSide({ x: 120 }, 2880)).toBe('left');
    expect(exitArrowSide({ x: 1439.999 }, 2880)).toBe('left');
  });

  it('points right from the middle on', () => {
    expect(exitArrowSide({ x: 1440 }, 2880)).toBe('right');
  });
});
