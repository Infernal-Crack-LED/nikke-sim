# Plan — Mint/Prika duo profiles on the buffer rank

> Owner request 2026-07-26: add a "w/ Prika" profile for Mint and a "w/ Mint"
> profile for Prika on the buffer rank, modeling the rotation where Prika takes the
> first B2 and Mint takes every B2 after that. The pair already has faithful duet
> modes in their overrides; what is missing is the rank-board infrastructure to
> evaluate a buffer while its partner is present in the team.

## Current state

- **Mint override** (`src/skills/overrides/mint.json`): two modes, `solo` and
  `duet (w/ Prika)`. In duet mode her Singing-gated S1/S2 lines use full values
  (45.02 % casterAtk, 19.94 % crit, 50 % projectile explosion, 32.72 % pierce).
- **Prika override** (`src/skills/overrides/prika.json`): two modes, `solo` and
  `duet (w/ Mint)`. In duet mode her Encore / Performance lines become permanent
  and she gets `burstFirst` + self `burstCdr -9999` on cast, which implements the
  "Prika first, then only Mint" rotation.
- **Sustain rank** already ships pair profiles (Prika `with-mint`, Anchor
  `with-mast-rm`), so the JSON shape and frontend badge pattern are proven.
- **Buffer rank** (`src/ranks/buffer.ts`) only supports single-buffer comps and
  `with-healer` / `with-shielder` comp profiles that inject synthetic skills into
  no-op fillers. No mechanism exists to add a real partner unit to the team.

## Goal

Emit two extra profile rows on `bufferchart.json`:

- `mint` with profile `w/ Prika`
- `prika` with profile `w/ Mint`

Each row reports the **tested buffer's marginal added carry DPS** when the pair is
played together in the duet rotation, versus a baseline where the tested slot is a
no-op B2 but the partner is still present in solo mode.

## Proposed implementation

1. **Add a partner-profile registry in `src/ranks/buffer.ts`**
   ```ts
   export const DUO_BUFFER_PROFILES: Record<string, { partner: string; id: string; note: string }> = {
     mint: { partner: 'prika', id: 'w/ Prika', note: 'paired with Prika — Prika takes the first B2, Mint every B2 after' },
     prika: { partner: 'mint', id: 'w/ Mint', note: 'paired with Mint — Prika takes the first B2, Mint every B2 after' },
   };
   ```

2. **Extend `assemble` to accept an optional partner slug**
   - For a B2 buffer, the plain team is `[NOOP_B1, tested, c1, c2]`.
   - With a partner it becomes `[NOOP_B1, tested, partner, c1, c2]`.
   - The partner sits between the tested B2 and the carries so the two B2s share
     the same stage-2 slot ordering the engine already uses for the duet.

3. **Build two teams per duo-profile run**
   - **Tested team**: tested buffer + partner, both forced to their duet mode via
     `UnitOptions.mode`.
   - **Baseline team**: no-op B2 in the tested slot + partner, partner forced to
     solo mode. The partner still contributes solo buffs and normal weapon gauge,
     so the difference is the tested buffer's marginal value in the duo.

4. **Pass per-unit `UnitOptions` through `carryDpsSum`**
   - Currently `carryDpsSum` builds uniform `{ ol: 'base5', stars: 3, core: 7 }` for
     every non-no-op unit. It needs to accept a map of slug → `UnitOptions` so the
     tested unit and partner can receive the correct `mode` (and the no-op fillers
     keep their empty opts).

5. **Update the baseline memo key**
   - Include the partner slug and the partner mode, so the Mint-with-Prika and
     Prika-with-Mint baselines do not collide with each other or with plain runs.

6. **Update `rankBuffers`**
   - For every slug, still emit the plain row.
   - If `DUO_BUFFER_PROFILES[slug]` exists, also emit the profiled row with the
     partner team.

7. **Update `scripts/build-bufferchart.ts`**
   - Merge the `DUO_BUFFER_PROFILES` notes into the artifact's `profiles` map so
     the frontend can render the badges without hard-coding them.

8. **Update `docs/data/rank-boards.md`**
   - Document the new buffer-rank profiles under the Buffer Value section, with the
     same caveat style used for Sustain pair profiles.

9. **Tests**
   - Add a `src/ranks/buffer.ts` focused test (or extend `scripts/tests/ranks/buffer.test.ts`)
     asserting that a Mint `w/ Prika` row has the expected team slugs, both modes
     are set, and the baseline memo is unique per profile.
   - Run `npm run ranks:all` and `node scripts/web-smoke-ranks.mjs`.

## Open questions / risks

- **Value interpretation**: the number is the marginal DPS of adding the tested
  B2 to a team that already has the partner B2. It is *not* the combined value of
  the duo; the two profile rows are not additive. The methodology note must say
  this explicitly.
- **Baseline asymmetry**: Prika solo keeps bursting every rotation; Mint solo
  alternates Singing/Dancing. This is the correct comparison for "what does the
  tested unit add on top of the partner alone", but it is not a comparison against
  a generic no-op B2.
- **Engine primitive**: the rotation is implemented by Prika's override (`burstFirst`
  + `burstCdr -9999`). If/when a proper per-unit burst-selection primitive lands
  (see QUEUE.md engine-work plan), this profile should migrate to it without
  changing the emitted value.

## Files to touch

- `src/ranks/buffer.ts`
- `src/ranks/types.ts` (no change needed — profile is already a string)
- `scripts/build-bufferchart.ts`
- `docs/data/rank-boards.md`
- `scripts/tests/ranks/buffer.test.ts` (or new)
