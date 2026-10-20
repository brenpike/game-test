import type { AxolotlSex } from './axolotlLook';

/** The words that stand for one axolotl in kid text, such as "he", "him", "his" and "He". */
export interface AxolotlPronouns {
  readonly subject: string;
  readonly object: string;
  readonly possessive: string;
  /** `subject` with a capital first letter, to start a sentence. */
  readonly Subject: string;
}

const BOY_PRONOUNS: AxolotlPronouns = Object.freeze({
  subject: 'he',
  object: 'him',
  possessive: 'his',
  Subject: 'He',
});

const GIRL_PRONOUNS: AxolotlPronouns = Object.freeze({
  subject: 'she',
  object: 'her',
  possessive: 'her',
  Subject: 'She',
});

/** The pronouns for one axolotl: he, him, his for a boy and she, her, her for a girl. */
export function axolotlPronouns(sex: AxolotlSex): AxolotlPronouns {
  return sex === 'boy' ? BOY_PRONOUNS : GIRL_PRONOUNS;
}
