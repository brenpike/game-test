import { describe, expect, it } from 'vitest';
import { axolotlPronouns } from './pronouns';

describe('axolotlPronouns', () => {
  it('gives he, him, his and He for a boy', () => {
    expect(axolotlPronouns('boy')).toEqual({ subject: 'he', object: 'him', possessive: 'his', Subject: 'He' });
  });

  it('gives she, her, her and She for a girl', () => {
    expect(axolotlPronouns('girl')).toEqual({ subject: 'she', object: 'her', possessive: 'her', Subject: 'She' });
  });

  it('capitalises only the first letter of the subject', () => {
    for (const sex of ['boy', 'girl'] as const) {
      const pronouns = axolotlPronouns(sex);
      expect(pronouns.Subject).toBe(pronouns.subject.charAt(0).toUpperCase() + pronouns.subject.slice(1));
    }
  });

  it('returns frozen pronouns so callers cannot change them', () => {
    expect(Object.isFrozen(axolotlPronouns('boy'))).toBe(true);
    expect(Object.isFrozen(axolotlPronouns('girl'))).toBe(true);
  });
});
