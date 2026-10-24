import { describe, expect, it } from 'vitest';
import './ghostNets';
import { PUNTING_POLE_FACT } from './factCards';
import { PUNTING_POLE } from './movingHazards';

describe('module load order', () => {
  it('gives the punting pole its fact card when ghost nets load first', () => {
    expect(PUNTING_POLE_FACT).toBeDefined();
    expect(PUNTING_POLE.fact).toBeDefined();
    expect(PUNTING_POLE.fact).toBe(PUNTING_POLE_FACT);
  });
});
