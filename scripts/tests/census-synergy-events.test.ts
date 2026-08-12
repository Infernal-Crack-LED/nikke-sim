// Self-validating fixture for the `--pairing` cross-check of scripts/census-synergy-events.ts —
// axis 6 of the phase-4 TAIL (docs/handoffs/2026-08-11-faithfulness-tail-plan.md §4b6).
//
// The cross-check answers audit F9: does each unit emit exactly the recovery events its kit
// grants? Its whole value is the FALSE-EMIT direction — a heal effect with no kit line behind it
// feeds every on-recovery consumer in every comp, which is the `liter` cover-HP trap (owner ruling
// 2026-07-21). So the classification rules that decide what counts as a restore, and who it
// reaches, are pinned here: each one was wrong on first run and each hid or invented a finding.
import { describe, expect, it } from 'vitest';
import { healScope, pairing, restoresLife } from '../census-synergy-events.js';

describe('restoresLife — a restore verb is not enough, it must restore LIFE', () => {
  it('accepts the ordinary HP restore phrasings the roster prints', () => {
    for (const line of [
      "Recovers 10.77% of the skill user's final Max HP as HP.",
      'Continuously recover HP by 8.12% of attack damage.',
      'Recovers 23.04% of attack damage as HP over 10 sec.',
    ]) {
      expect(restoresLife(line)).toBe(true);
    }
  });

  it('rejects a SHIELD restore — that is a shield effect, not a recovery event', () => {
    // `kilo` skill2 and `mori` burst. Both landed in the worklist on the first run.
    expect(
      restoresLife(
        "Restores Shield HP equal to 2.85% the skill user's final Max HP."
      )
    ).toBe(false);
  });

  it('rejects a COVER restore — the liter ruling says it emits nothing', () => {
    expect(restoresLife('Restores 7.52% of Cover HP.')).toBe(false);
  });

  it('rejects a RESOURCE restore that merely uses the verb', () => {
    // `maiden-ice-rose` skill1: "MP recovers by 1" is not a heal.
    expect(
      restoresLife('MP recovers by 1. MP can be accumulated up to 12.')
    ).toBe(false);
  });
});

describe('healScope — the target lives on the ■ header, not on the restore line', () => {
  it('reads an ally-scoped restore from its block header', () => {
    const kit =
      '■ Activates after firing 10 time(s). Affects 1 ally unit(s) with the highest final DEF.\nRecovers 6.28% of the skill user’s final Max HP as HP.';
    expect(
      healScope(kit, 'Recovers 6.28% of the skill user’s final Max HP as HP.')
    ).toBe('ally');
  });

  it('reads a self-scoped restore from its block header', () => {
    const kit =
      '■ Activates when firing the last bullet. Affects self.\nRecovers 12.96% of the skill user’s final Max HP as HP.';
    expect(
      healScope(kit, 'Recovers 12.96% of the skill user’s final Max HP as HP.')
    ).toBe('self');
  });

  it('does not let a NEIGHBOURING block’s target leak in', () => {
    // Two blocks, only the second of which heals. Scoping by "does the slot mention allies"
    // instead of "does this line's own block" would call this ally-scoped and invent a finding.
    const kit =
      '■ Affects all allies.\nATK ▲ 12.5% for 10 sec.\n■ Affects self.\nRecovers 20% of the skill user’s final Max HP.';
    expect(
      healScope(kit, 'Recovers 20% of the skill user’s final Max HP.')
    ).toBe('self');
  });
});

describe('roster pairing — the F9 answer, held to its dispositioned set', () => {
  const { falseEmit, slotAttribution, noEmit } = pairing();

  it('has NO false emit anywhere on the roster', () => {
    // The board-relevant direction and the whole point of the axis: no unit emits a recovery
    // event its kit does not grant. A new entry here is a `liter`-class regression.
    expect(falseEmit).toEqual([]);
  });

  it('holds slot attribution to `sin`, whose skill2 fires on burst cast', () => {
    // Her skill2 is "Activates when using Burst Skill. … Once: Recover 15.3% of attack damage as
    // HP", so the override files that block under `burst`. The event IS kit-granted; only the
    // organizational slot differs, which matters solely for same-caster-slot buff overwrite.
    expect(slotAttribution.map((r) => r.slug)).toEqual(['sin']);
  });

  it('holds the ALLY-scoped non-emitters to their three dispositioned units', () => {
    // The only non-emitters that could reach a consumer the carrier does not own. All three are
    // recorded under `unmodeled`, and they are NOT the same case:
    //   `biscuit` — trigger needs a Defender ally below 50% HP: indeterminate on the immortal boss
    //   `emma` (MG/Fire, not `emma-tactical-upgrade`) — "5% chance when attacked": the v1 boss
    //             never attacks
    //   `pascal`  — "after firing 10 time(s)" is a LIVE trigger; blocked only on the DEF-ranked
    //               ally selector, a held primitive (audit F11). If that primitive is ever built,
    //               this heal starts feeding `crown` — the synergy consequence of holding it.
    expect(
      [
        ...new Set(noEmit.filter((r) => r.scope === 'ally').map((r) => r.slug)),
      ].sort()
    ).toEqual(['biscuit', 'emma', 'pascal']);
  });

  it('keeps every self-scoped non-emitter inert by MECHANISM, not by measurement', () => {
    // fireRecovery fires only the RECEIVER's own blocks, and the roster's sole recovery consumers
    // are `asuka` (AR/Fire, not `asuka-wille`) and `crown`. So a self-scoped non-emitted heal can
    // only matter if its own carrier owns a recovery block — none of these does.
    const consumers = new Set(['asuka', 'crown']);
    for (const r of noEmit.filter((x) => x.scope === 'self')) {
      expect(consumers.has(r.slug)).toBe(false);
    }
  });
});
