# ADR 0011: Axolotl names are typed and kept on the device only

- Status: Accepted
- Date: 2026-10-19

## Context

The character creator and renaming let the player name each axolotl ([PRD](../prds/axolotl-mvp.md) F1, F2, F6). Players are 8 to 12, and a child may type their own name or a friend's.
PRD F17 says names stay on this device, are never sent anywhere, cannot be shared, and that a player never has to type a name.

A canvas cannot take text well. On-screen keyboards, IME composition, paste, and screen readers all need a real text field.
But a browser text field can leak what is typed: cloud spellcheck services can be sent the text, and autofill and form history can keep it.

[ADR 0007](0007-kid-safety-and-privacy.md) bans data collection and network requests. This ADR records how the name field keeps to it.

## Decision

- A name is typed only into one temporary text field over the game canvas (`src/platform/textEntry.ts`). It exists only while the player types, and it is removed on Enter, Escape, or when it loses focus.
- Spellcheck, autocomplete and autocorrect are off on the field, so no cloud spellcheck or suggestion service sees the text and the browser keeps no autofill entry.
- The field is in no form and has no `name` attribute, so nothing can be submitted and the browser keeps no form history.
- A name is never sent anywhere. The field and the game make no network request for it.
- A name is not stored on the device in this build: it lives only in the session, in memory. Saving (issue #15) will keep it on the device only, as ADR 0007 requires for all saved progress.
- Suggested names make typing optional. The arrows step through 16 suggested names, and the creator starts with a random one, so Done works at once (PRD F17).
- A name character is a letter with its accents (combining marks, at most 4; any more are dropped), a digit, a space, a hyphen or an apostrophe. A typed name is cleaned to 1 to 12 name characters. Anything else is dropped.
- The text field counts with the same rule as the cleaning (`fitNameEdit` in `src/logic/axolotlNames.ts`), not with the browser `maxlength`. Typing past 12 does nothing. A longer paste keeps the start that fits. Dropped characters count for nothing. While an IME is composing, the limit applies when the composition ends.
- There is no word filter, because names are never shown to anyone else or shared.

## Alternatives considered

| Option | Why not |
|---|---|
| A keyboard drawn on the canvas | No IME, paste, or screen reader support, and hard to do well for every script. |
| Suggested names only, no typing | PRD F2 asks for free text. Suggested names still make typing optional. |
| A word filter or blocklist | Names are never shared, so a filter protects no one. Any list would also block real names in some languages and need upkeep. |
| A form field with the browser's defaults | Spellcheck could send the text to a cloud service, and autofill and form history could keep it. |
| The browser `maxlength` | It counts UTF-16 units before cleaning. Letters outside the BMP count twice, dropped characters use up the limit, and IME text can be cut mid-composition. |
| Counting code points | An accent can be cut from its letter, and scripts with many marks get fewer letters. |
| Counting graphemes with `Intl.Segmenter` | Not in every browser the build targets (for example Firefox before 125). A fallback would count differently. |

## Consequences

- Text entry is browser glue in `src/platform/`. Name rules (cleaning, length, suggested names) stay pure in `src/logic/`.
- Any field that takes typed text must keep these settings: no form, no `name` attribute, and spellcheck, autocomplete and autocorrect off.
- The field is never rewritten with the cleaned name, so a trailing space survives while typing. It is rewritten only when an edit goes past 12, and the caret is kept.
- On keyboards that compose whole words, a word can run past 12 until it is finished. Then it is cut.
- Saving (issue #15) must keep names on the device, with the rest of the save.
- Any future feature that shows names to other people, or sends them anywhere (for example cloud saves), needs a new ADR first, and must revisit the word filter decision.
