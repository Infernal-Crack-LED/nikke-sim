// Engine-primitive backfill: `hitsPerShot` — 34 carriers (primitive census in
// docs/engine-modeling-gaps.md). Unlike the other census rows this one is CHARACTER DATA, not an
// override field, so every multi-round weapon in the roster is a carrier and there is no per-unit
// note anywhere recording what the number means. It means three different things in three places,
// and the engine deliberately does NOT treat them alike:
//
//   1. DAMAGE      — a pull is ONE damage instance that covers all hitsPerShot rounds (an MG belt
//                    burst, an SG spray), never hitsPerShot separate instances.
//   2. AMMO        — only an MG spends hitsPerShot rounds per pull. An SG pull spends ONE round
//                    while landing 10 pellets; an SMG with hitsPerShot 2 also spends one.
//   3. ROUND-COUNT — "for N round(s)" buffs (durationShots) spend rounds on the SAME rule as ammo:
//      DURATION      hitsPerShot per MG pull, 1 per pull otherwise.
//
// Rules 2 and 3 are what a "hitsPerShot is just the hit multiplier" reading gets wrong, so the
// discriminating fixture is `modernia` (MG, hitsPerShot 2) against `quency-escape-queen` (SMG,
// hitsPerShot 2): IDENTICAL hitsPerShot, opposite weapon branch. Anything keyed on the number
// alone gives them the same answer.
//
// Deterministic EV runs (no seed) on the control comp.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, data, runComp, withPatchedOverride } from '../lib/harness.js';

type DamageEvent = Extract<SimEvent, { kind: 'damage' }>;
type ShotEvent = Extract<SimEvent, { kind: 'shot' }>;

const MG_CARRY = 'modernia';            // MG, hitsPerShot 2
const SMG_CARRY = 'quency-escape-queen'; // SMG, hitsPerShot 2 — same number, other branch
const SG_CARRY = 'soda-twinkling-bunny'; // SG, hitsPerShot 10

const charOf = (slug: string) => data.characters[slug];

function capture(carry: string, patch?: (ov: any) => void) {
  const events: SimEvent[] = [];
  const overrides = patch ? { [carry]: withPatchedOverride(carry, patch) } : undefined;
  runComp({ ...controlComp(carry), overrides, cfg: { onEvent: (e) => events.push(e) } });
  return {
    events,
    shots: events.filter((e): e is ShotEvent => e.kind === 'shot' && e.slug === carry),
    normals: events.filter(
      (e): e is DamageEvent => e.kind === 'damage' && e.slug === carry && e.srcSlot === 'normal',
    ),
  };
}

describe('hitsPerShot (multi-round weapons)', () => {
  it('fixture check — the two 2-round carriers differ only in weapon class', () => {
    expect(charOf(MG_CARRY).weapon).toBe('MG');
    expect(charOf(SMG_CARRY).weapon).toBe('SMG');
    expect(charOf(MG_CARRY).hitsPerShot, 'the MG/SMG pair must share hitsPerShot for the ' +
      'weapon-branch assertions below to isolate the WEAPON rather than the number').toBe(
      charOf(SMG_CARRY).hitsPerShot,
    );
    expect(charOf(SG_CARRY).hitsPerShot).toBeGreaterThan(1);
  });

  it('a pull is ONE damage instance covering all its rounds, on every weapon', () => {
    // The event-log contract (src/types.ts SimEvent) says a `damage` event is one damage INSTANCE
    // and explicitly not one game-side hit. If the engine instead emitted per-round instances, the
    // per-shot damage magnitude would be right only if it also divided by hitsPerShot — a change
    // that is invisible in totals and would silently break every per-instance assertion in this
    // suite. Pinned on both multi-round shapes: the MG belt burst and the SG spray.
    for (const carry of [MG_CARRY, SG_CARRY]) {
      const { shots, normals } = capture(carry);
      expect(shots.length, `${carry} never fired`).toBeGreaterThan(0);
      expect(normals.length, `${carry}: ${normals.length} normal instances for ${shots.length} pulls`).toBe(
        shots.length,
      );
      expect(normals.map((n) => n.frame)).toEqual(shots.map((s) => s.frame));
    }
  });

  it('DISCRIMINATING: only an MG pull spends hitsPerShot AMMO — SG/SMG pulls spend one', () => {
    // MEASURED 2026-07-17 (owner): quency-escape-queen visibly spends her 120-round magazine as
    // 120 pulls, not 60, even though each trigger pull puts out two bullets. Same for an SG spray:
    // 10 pellets, 1 round. Only the MG belt actually burns its rounds.
    for (const [carry, want] of [
      [MG_CARRY, charOf(MG_CARRY).hitsPerShot],
      [SMG_CARRY, 1],
      [SG_CARRY, 1],
    ] as const) {
      const { shots } = capture(carry);
      // consecutive pulls inside ONE magazine, skipping unlimited-ammo shots (which spend nothing)
      const spends = shots
        .map((s, i) => ({ s, prev: shots[i - 1] }))
        .filter(
          ({ s, prev }) =>
            prev && !s.unlimitedAmmo && !prev.unlimitedAmmo && s.magIndex === prev.magIndex,
        )
        .map(({ s, prev }) => prev!.ammoAfter - s.ammoAfter)
        // a reload-to-max inside the same magIndex (skill refill / swap) reads as a negative or
        // outsized jump; those are not pull spends and are excluded rather than asserted on
        .filter((d) => d >= 0 && d <= 20);
      expect(spends.length, `${carry}: no ammo-spending pull pairs to measure`).toBeGreaterThan(20);
      expect(
        [...new Set(spends)],
        `${carry} (${charOf(carry).weapon}, hitsPerShot ${charOf(carry).hitsPerShot}) should spend ${want} round(s) per pull`,
      ).toEqual([want]);
    }
  });

  it('DISCRIMINATING: a "for N round(s)" buff spends rounds on the AMMO rule, not the hit rule', () => {
    // durationShots decrements by hitsPerShot for an MG and by 1 otherwise (sim.ts, alongside the
    // weaponSwap uses-based termination). So the SAME 10-round window covers 5 MG pulls and 10 SMG
    // pulls on two units with the SAME hitsPerShot. A decrement keyed to hitsPerShot alone gives
    // both 5; one keyed to pulls gives both 10. Only the weapon-branched rule splits them.
    const ROUNDS = 10;
    const buffed = (carry: string) => {
      const { events, normals } = capture(carry, (ov) => {
        ov.burst = [
          {
            trigger: { kind: 'burstCast' },
            target: { kind: 'self' },
            // absurd magnitude so a buffed pull is unmistakable in the multiplier decomposition —
            // no teammate buff can push dmgUp anywhere near this
            effects: [{ kind: 'buff', stat: 'attackDamagePct', value: 100_000, durationShots: ROUNDS }],
          },
        ];
      });
      const casts = events.filter((e) => e.kind === 'burstCast' && e.slug === carry).length;
      expect(casts, `${carry} never cast her burst — the window never opened`).toBeGreaterThan(0);
      return { casts, pulls: normals.filter((n) => n.mult.dmgUp > 100).length };
    };
    const mg = buffed(MG_CARRY);
    const smg = buffed(SMG_CARRY);
    expect(
      mg.pulls / mg.casts,
      `${MG_CARRY} (MG, hitsPerShot ${charOf(MG_CARRY).hitsPerShot}): a ${ROUNDS}-round window should cover ${ROUNDS / charOf(MG_CARRY).hitsPerShot} pulls`,
    ).toBe(ROUNDS / charOf(MG_CARRY).hitsPerShot);
    expect(
      smg.pulls / smg.casts,
      `${SMG_CARRY} (SMG, same hitsPerShot): a ${ROUNDS}-round window should cover ${ROUNDS} pulls`,
    ).toBe(ROUNDS);
  });
});
