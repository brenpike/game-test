# ADR 0010: Being carried home is a full trip reset

- Status: Accepted
- Date: 2026-10-18
- Amends: [ADR 0008](0008-gentle-fail-state.md) (replaces only its "Losing the fourth leg" rule; every other ADR 0008 rule stays in force)

## Context

ADR 0008 said that when the fourth leg is lost, the axolotl is carried home, only unbanked trip finds are lost, and they return to their hiding spots to be found again.

Two product owner decisions changed what happens on that trip home:

- Hiding spots shuffle each trip (issue #11; [PRD](../prds/axolotl-mvp.md) B4). Lost treasures cannot return to "their" spot, because no treasure has a fixed spot.
- Snacks now matter: they speed up leg regrowth, and every snack must be eaten to open the exit (issue #30; PRD A19 and H2). The product owner decided that being carried home also starts the snacks over (issue #31; PRD A12).

This is a change to a safety rule for players aged 8 to 12, so it gets its own record.

## Decision

- Losing the fourth leg: the axolotl is carried home to the Home Tank in a gentle transition and arrives with four legs.
- Being carried home is a full reset of the trip. All unbanked trip finds (treasures and any rescue made this trip) leave the Trip Bag and go back into the canal. They reappear on the next trip, each in a freshly picked valid hiding spot (PRD A12, B4).
- Every snack eaten comes back, so the snacks start over on the next trip (PRD A12, A19).
- Snacks are not trip finds and not banked progress. Banked items and stars are untouched.
- Every other ADR 0008 rule stays in force, including: banked progress is never lost to gameplay, there is no game over, and missing an optional challenge never costs progress.

## Alternatives considered

| Option | Why not |
|---|---|
| Keep eaten snacks eaten after being carried home | The exit needs every snack, so the next trip could start with the exit already half open. A full reset keeps each trip a fresh, fair attempt. |
| A softer, partial reset | Kept as the fallback if play-tests show the full reset is too harsh (PRD open question 15). |
| Edit ADR 0008 in place | ADR 0008 is accepted. A changed safety rule gets the next numbered ADR, like ADR 0008 did for ADR 0007. |

## Consequences

- Game rules must reset snacks, as well as unbanked trip finds, when the axolotl is carried home.
- Banked progress is still never lost to gameplay, so ADR 0008's core guarantee holds.
- Play-tests must check whether the full reset feels too harsh (PRD open question 15).
- [ADR 0008](0008-gentle-fail-state.md) status points here for the amended rule.
