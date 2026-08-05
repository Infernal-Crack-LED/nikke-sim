// PER-UNIT KIT SPEC — `nero` (Nero, Tetra SMG Defender, Fire, Burst II, cd 20s, ammo 120,
// reloadFrames 99, normalMult 8.39 / coreMult 200, critRate 15 / critDamage 150).
// Kit-autonomy gauntlet 2026-08-04; test-first line-by-line spec. Tier 1 encoding.
//
// GREENFIELD NOTE: nero shipped with NO override (simSupported:false) — before this gauntlet the
// unit could not sim at all (resolveSkills throws for prose-without-override). The usual
// "RED vs shipped override" half is degenerate: the pre-override state is "does not run". The
// substance of the gate lives in the COUNTERFACTUAL half — every PIN below is GREEN vs the
// faithful encoding AND the nearest-wrong model (patched via withPatchedOverride) provably fails
// it, so each assertion discriminates rather than rubber-stamps.
//
// Kit (blablalink prose, data/characters.json → characters.nero.skills, lvl-10 values):
//   S1 "Cat's Repayment"
//      ■ when recovery takes effect → the HEALER: Damage Taken ▼14.14% / 5s              [N1 UNMODELED]
//      ■ when recovery takes effect → self: Cat's Repayment stack, Damage Taken ▼8.43%,
//        stacks to 5, each stack lasts 5s                                                 [N2 UNMODELED]
//   S2 "Lil' Paw"
//      ■ 30% chance when attacked → the attacker: Damage Taken ▲8.26% / 5s               [N3 UNMODELED]
//      ■ 30% chance when attacked in Grumpy Cat status → the attacker:
//        158.05% of final ATK as damage                                                   [N4 UNMODELED]
//      ■ at the start of battle → self: Max HP ▲60.28% continuously                       [N5]
//   BU "Grumpy Cat"
//      ■ the highest-remaining-HP enemy: 1104.91% of final ATK as Burst Skill damage      [N6]
//      ■ self: Attract — taunts all enemies for 15 sec                                    [N7 UNMODELED]
//      ■ when Cat's Repayment is at max stacks → self: Grumpy Cat,
//        Incoming healing ▲60.08% for 15 sec                                              [N8 UNMODELED]
//
// UNMODELED lines (carried VERBATIM in the override's `unmodeled`; no assertion here):
//   N1/N2 — ally/self Damage-Taken-▼ are defensive; the v1 boss deals NO damage (no HP pool), so
//           damage taken is unobservable. N1 additionally targets "the target who cast the skill
//           with recovery effect" — no TargetDef resolves the HEALER of the recovery event that
//           fired the trigger. N2's stack count has no stack-count primitive; its only consumer
//           is the burst's status condition (N8), whose chain is damage-dead anyway.
//   N3/N4 — require an INCOMING-ATTACK event; the v1 boss deals no damage and the schema has
//           neither an 'attacked' trigger nor a chance primitive. (N3's boss-facing stat —
//           damageTakenPct — DOES exist in the schema; its trigger is unreachable, so nothing is
//           fabricated in its place.)
//   N7    — taunt/attract vs a partless boss that never attacks and has no ally-targeting AI:
//           zero in-domain surface (delta-ninja-thief Attract precedent).
//   N8    — its condition is N2 at 5 stacks (unmodeled) and its effect (incoming-healing ▲) moves
//           no damage (no HP pool; no heal-scaling stat anywhere in her kit); its only downstream
//           consumer is N4 (unreachable). The whole heal→stacks→Grumpy-Cat→counter chain is dead
//           for v1 damage.
//   FIXTURE NOTE: the comp deliberately includes helm (Treasure), whose full-charge pulls heal the
//   team — so nero's `recovery` trigger CONDITION genuinely occurs in-fight; N1/N2 stay silent
//   because no block ships for them, not because the trigger never fires.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   N6  nearest-wrong = the level-1 magnitude 975.31 (vs shipped 1104.91). The removed-block
//       reference proves the nuke is LIVE (team totals move). The nuke fires on her OWN cast
//       (burstCast — "Affects the 1 enemy unit(s)..." is her Burst Skill's impact, helm H7
//       precedent), and a burst CAST lands BEFORE the Full Burst window opens, so it must never
//       take the +50% FB major.
//   N5  nearest-wrong = the level-1 value 38.68 (vs shipped 60.28). The engine converts the own-%
//       grant into a maxHpFlat SELF-grant (targetMaxHpPct → maxHpFlat; e3 rule feeds
//       atkOfMaxHpPct only when caster === target — nero has NO HP→ATK conversion, so the line is
//       offensively INERT). Pinned four ways: the exact flat value vs the STATIC Max HP read
//       from the block-removed run (independent basis), battle-start frame + no expiry
//       ("continuously"), SELF-scoping on the log (UnitResult.maxHp carries the static base, so
//       the live delta is not exposed on the result row), and byte-equal team totals under
//       removal (inertness canary — fails if the engine ever feeds her Max HP into her damage,
//       at which point the line must be re-judged).
//
// Fixture (deterministic — no seed; event-log over totals): ['liter','nero','helm'] — liter
// (B1, 20s) opens the chain, nero is the SOLE B2 (casts every Full Burst), helm (B3, 40s) closes
// it and doubles as the recovery source (FIXTURE NOTE). Boss Wind (nero's ×1.1 Fire major),
// focus nero.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, unitOf, withPatchedOverride } from '../lib/harness.js';

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

// ---- fixture ----------------------------------------------------------------------------------
const COMP = ['liter', 'nero', 'helm'];
const NERO = 1; // nero's slot in COMP

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: COMP,
    bossElement: 'Wind',
    focusSlug: 'nero',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res, totals: totals(res) };
}

// ---- counterfactual patches (nearest-wrong models each PIN must discriminate against) ---------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** N6 reference: her burst nuke removed entirely (proves the line is live). */
const neroNoNuke = withPatchedOverride('nero', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (ov.burst.length === before) {
    throw new Error('nero burst flatDamage block missing — fixture is stale');
  }
});

/** N6 nearest-wrong: the level-1 magnitude 975.31 instead of 1104.91. */
const neroWrongNuke = withPatchedOverride('nero', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e) {
    throw new Error('nero burst flatDamage effect missing — fixture is stale');
  }
  e.atkPct = 975.31;
});

/** N5 reference: her Max HP line removed entirely (independent STATIC-Max-HP basis + inertness). */
const neroNoMaxHp = withPatchedOverride('nero', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'targetMaxHpPct'));
  if (ov.skill2.length === before) {
    throw new Error(
      'nero S2 targetMaxHpPct block missing — fixture is stale'
    );
  }
});

/** N5 nearest-wrong: the level-1 value 38.68 instead of 60.28. */
const neroWrongMaxHp = withPatchedOverride('nero', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'targetMaxHpPct');
  if (!e) {
    throw new Error(
      'nero S2 targetMaxHpPct effect missing — fixture is stale'
    );
  }
  e.value = 38.68;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noNuke = run({ nero: neroNoNuke });
const wrongNuke = run({ nero: neroWrongNuke });
const noMaxHp = run({ nero: neroNoMaxHp });
const wrongMaxHp = run({ nero: neroWrongMaxHp });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const neroBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'nero');

/** STATIC Max HP — the block-removed run carries no maxHpFlat buff, so its (live == static)
 *  Max HP is an independent basis for the flat-grant arithmetic below. */
const STATIC_HP = unitOf(noMaxHp.res, 'nero').maxHp;

describe('nero — kit spec', () => {
  describe('N6 — burst deals 1104.91% of final ATK to the enemy, once per own cast', () => {
    const nukes = dmg(base.events).filter(
      (d) => d.slug === 'nero' && d.srcSlot === 'burst'
    );

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      const casts = neroBursts(base.events).length;
      expect(
        casts,
        'sole B2 on a ~20s chain — nero should cast every Full Burst'
      ).toBeGreaterThanOrEqual(5);
      expect(nukes.length).toBe(casts);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([1104.91]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied)).toEqual([]);
    });

    it('DISCRIMINATING: the level-1 magnitude 975.31 is NOT what ships, and the nuke is live', () => {
      expect(base.totals).not.toEqual(wrongNuke.totals);
      expect(base.totals).not.toEqual(noNuke.totals);
    });
  });

  describe('N5 — battle-start self Max HP ▲60.28% continuously (offensively inert)', () => {
    // Engine convention: targetMaxHpPct → maxHpFlat, value = (60.28/100) × the TARGET's own
    // static Max HP (sim.ts applyBuff path — mirrored exactly below).
    const applied = buffs(base.events).filter(
      (b) => b.stat === 'maxHpFlat' && b.casterIdx === NERO && b.targetIdx === NERO
    );

    it('applies at battle start as a permanent SELF grant of 0.6028 × static Max HP', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([
        (60.28 / 100) * STATIC_HP,
      ]);
      expect(applied[0].frame).toBe(0);
      expect(
        [...new Set(applied.map((b) => b.expiresFrame))],
        '"continuously" — a passive Max HP grant carries no timed expiry'
      ).toEqual([null]);
    });

    it('is SELF-scoped: no maxHpFlat grant touches any other unit', () => {
      // UnitResult.maxHp carries the STATIC base (sim.ts builds units off u.maxHp), so the
      // live-Max-HP delta is not exposed on the result row — pin the scope on the log instead:
      // every maxHpFlat application in the fight is nero's own, on nero alone.
      const all = buffs(base.events).filter((b) => b.stat === 'maxHpFlat');
      expect(all.length).toBeGreaterThan(0);
      expect(
        all.every((b) => b.casterIdx === NERO && b.targetIdx === NERO)
      ).toBe(true);
    });

    it('is offensively inert (no HP→ATK conversion in her kit): byte-equal team totals', () => {
      expect(base.totals).toEqual(noMaxHp.totals);
    });

    it('DISCRIMINATING: level-1 value 38.68 grants strictly less Max HP', () => {
      const wrong = buffs(wrongMaxHp.events).filter(
        (b) =>
          b.stat === 'maxHpFlat' && b.casterIdx === NERO && b.targetIdx === NERO
      );
      expect(wrong.length).toBeGreaterThan(0);
      expect([...new Set(wrong.map((b) => b.value))]).toEqual([
        (38.68 / 100) * STATIC_HP,
      ]);
    });
  });
});
