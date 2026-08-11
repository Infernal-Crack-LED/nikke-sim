// PER-UNIT KIT SPEC — `belorta` (Belorta, Attacker/SR/Electric, Burst II, cd 20s, RL,
// ammo 6, chargeFrames 90, chargeMultiplier 350). Kit-autonomy gauntlet 2026-08-05.
//
// One assertion group per KIT LINE (S1, S2, B1..B3 below), asserted against the SHIPPED
// override loaded from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS
// (the nearest wrong model each assertion must discriminate against) — never to supply the
// encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.belorta.skills):
//   S1 ■ performing a Full Charge attack → self: Explosion Radius ▲9.55% for 5 sec      [S1]
//   S2 ■ an attack hits more than 4 enemy units → the target(s):
//        DEF ▼3.52% for 5 sec + 14.96% of final ATK as additional damage                [S2]
//   BU ■ enemies within attack range: 192% of final ATK as damage                       [B1]
//      ■ all allies: Charge Speed ▲2.82% for 10 sec                                     [B2]
//
// Dispositions:
//   S1  UNMODELED (inert, documented here, NO assertion): the engine has no spatial AoE —
//       explosion RADIUS only changes how many enemies one rocket splashes, and the
//       scope-lock fight is a single partless boss. Nearest wrong model — encoding it as
//       a damage stat (projectileExplosionPct is the Explosion DAMAGE bucket, a different
//       mechanic) — would fabricate damage the kit does not grant.
//   S2  UNMODELED (out of domain, pinned by ABSENCE below): the activation gate is "an
//       attack hits more than 4 enemy units" — a multi-enemy condition the single-boss sim
//       can NEVER satisfy, so the DEF-down and the 14.96% rider never fire in domain. The
//       nearest wrong model is the gate-less per-hit rider (a parser that drops the
//       condition); the S-pin proves the shipped override is not that model.
//   B1  FAITHFUL — 192% nuke on burstCast (the burst skill's own damage clause; the cast
//       lands BEFORE the Full Burst window, so it must never take the +50% FB major — the
//       engine auto-exempts burstCast burst damage). Function "additional damage" CRITS at
//       the caster's rate and NEVER cores or gets range (U1, datamined FunctionTable +
//       Prydwen + JP verified) — the shipped block carries no `crit` flag because the
//       rider path defaults crit ON; B1 pins critEligible true.
//   B2  FAITHFUL — chargeSpeedPct 2.82 for 10s, target ALL ALLIES, applied on HER burst
//       CAST (the kit grants it as part of the burst skill, not on Full Burst entry — a
//       Tier-2 burstCast-vs-fullBurstEnter discrimination) — engine consumption is live:
//       sim.ts shortens the charge cycle by (1 - cs/100) per frame (chargeFrames 90).
//
// Fixture: liter (B1) / belorta (B2) / ada (B3), forced-neutral boss (null), camera focus
// on belorta (RL is a charge weapon → ×2.5 burst gauge, so she casts on every chain).
// She is the ONLY Burst II in the comp, so every chain's B2 cast is hers. Belorta is SR:
// rarity ceiling 3★ / core 0 — core enhancement is SSR-only, and the plain scope-lock
// copies:10 basis (3★ + core 7) would credit her stats she can never have in game.
// Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { runComp, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** Slot order below: liter 0 / belorta 1 / ada 2. */
const BELORTA = 1;
const TEAM_SIZE = 3;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['liter', 'belorta', 'ada'],
    bossElement: null,
    focusSlug: 'belorta',
    unitLimits: { belorta: { stars: 3, core: 0 } },
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: res.units.map((u) => u.totalDamage) };
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const belortaBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'belorta'
  );
const belortaNukes = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'belorta' && d.srcSlot === 'burst');
const csBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === BELORTA && b.stat === 'chargeSpeedPct'
  );

// ---- counterfactual patches -------------------------------------------------------------------
/** B1 counterfactual: the nuke at the LEVEL-1 magnitude (68.57) instead of the maxed 192. */
const belortaLv1Nuke = withPatchedOverride('belorta', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e || e.atkPct !== 192) {
    throw new Error('belorta burst 192% flatDamage missing — fixture is stale');
  }
  e.atkPct = 68.57;
});
/** B1 counterfactual: the nuke flagged verified-NON-critting — against the datamined
 *  FunctionTable rule (U1) that function "additional damage" crits at the caster's rate. */
const belortaNoCritNuke = withPatchedOverride('belorta', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e || e.atkPct !== 192) {
    throw new Error('belorta burst 192% flatDamage missing — fixture is stale');
  }
  e.crit = false;
});
/** B2 counterfactual: the charge-speed buff SELF-scoped instead of all allies. */
const belortaBuffSelf = withPatchedOverride('belorta', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'chargeSpeedPct')
  );
  if (!b) {
    throw new Error(
      'belorta burst chargeSpeedPct block missing — fixture is stale'
    );
  }
  b.target = { kind: 'self' };
});
/** B2 counterfactual: the buff keyed to FULL BURST ENTRY instead of her burst cast. */
const belortaBuffOnFB = withPatchedOverride('belorta', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'chargeSpeedPct')
  );
  if (!b) {
    throw new Error(
      'belorta burst chargeSpeedPct block missing — fixture is stale'
    );
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
/** S2 counterfactual: the nearest wrong model — the 14.96% rider with its >4-enemies gate
 *  dropped, firing on every shot. */
const belortaGatelessS2 = withPatchedOverride('belorta', (ov) => {
  ov.skill2 = [
    ...(ov.skill2 ?? []),
    {
      slot: 'skill2',
      trigger: { kind: 'shotFired' },
      target: { kind: 'enemy' },
      effects: [{ kind: 'flatDamage', atkPct: 14.96, crit: true }],
    },
  ];
});

// ---- runs (hoisted: each is a full 180s sim) ---------------------------------------------------
const base = run();
const lv1Nuke = run({ belorta: belortaLv1Nuke });
const noCritNuke = run({ belorta: belortaNoCritNuke });
const buffSelf = run({ belorta: belortaBuffSelf });
const buffOnFB = run({ belorta: belortaBuffOnFB });
const gatelessS2 = run({ belorta: belortaGatelessS2 });

describe('belorta — kit spec', () => {
  it('fixture sanity: she casts her burst at least once', () => {
    expect(belortaBursts(base.events).length).toBeGreaterThan(0);
  });

  describe('B1 — burst nuke: 192% of final ATK, on every cast, before the FB window', () => {
    it('fires once per burst cast at the maxed kit magnitude, in the burst bucket', () => {
      const nukes = belortaNukes(base.events);
      expect(nukes.length).toBe(belortaBursts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([192]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      const took = belortaNukes(base.events).filter((d) => d.fbMajorApplied);
      expect(took, 'burst-cast damage must precede the FB window').toEqual([]);
    });

    it('is crit-eligible at the caster rate (FunctionTable U1 rule; never cores, no range)', () => {
      const nukes = belortaNukes(base.events);
      expect(nukes.length).toBeGreaterThan(0);
      expect(nukes.every((d) => d.critEligible)).toBe(true);
    });

    it('DISCRIMINATING: a crit:false nuke suppresses the caster-rate crit roll', () => {
      expect(
        belortaNukes(noCritNuke.events).every((d) => !d.critEligible)
      ).toBe(true);
    });

    it('carries NO scope tag — "within attack range" is not the literal string the amp names', () => {
      // Owner ruling 2026-08-10 (amp scope is LITERAL-ONLY): trina's Spread Roots amplifies
      // 'skills with "Affects all enemies"', and her clause is "Affects enemies within attack
      // range" — a paraphrase that means the same thing in English and is NOT that string, so
      // the amp does not reach this nuke. The earlier same-day scope-string ruling
      // ("these all count as targeting the boss") answered a TARGETING question and does not
      // carry over to amp eligibility. Asserted as ABSENT deliberately, not left untested:
      // this tag was landed on the cardinality reading and removed again, so a future reviewer
      // must not re-add it without a new ruling. Decided by
      // `npx tsx scripts/census-burst-amp-scope.ts`.
      const ov = loadOverride('belorta') as any;
      const nuke = ov.burst
        .flatMap((b: any) => b.effects)
        .find((e: any) => e.kind === 'flatDamage');
      expect(nuke.burstDesc).toBeUndefined();
    });

    it('DISCRIMINATING: the level-1 magnitude (68.57) is not what ships', () => {
      expect([
        ...new Set(belortaNukes(lv1Nuke.events).map((d) => d.atkPct)),
      ]).toEqual([68.57]);
      expect([
        ...new Set(belortaNukes(lv1Nuke.events).map((d) => d.atkPct)),
      ]).not.toEqual([
        ...new Set(belortaNukes(base.events).map((d) => d.atkPct)),
      ]);
    });
  });

  describe('B2 — burst grants Charge Speed ▲2.82% to ALL allies for 10 sec, on HER cast', () => {
    it('applies the kit magnitude with a 10-second expiry, once per cast per ally', () => {
      const applied = csBuffs(base.events);
      const bursts = belortaBursts(base.events).length;
      expect(applied.length).toBe(bursts * TEAM_SIZE);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([2.82]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('reaches all three allies, including herself', () => {
      const applied = csBuffs(base.events);
      expect(applied.length).toBeGreaterThan(0);
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of applied) {
        (
          perFrame.get(b.frame) ??
          perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx);
      }
      for (const [frame, holders] of perFrame) {
        expect(
          holders.size,
          `frame ${frame} reached ${holders.size} allies, expected ${TEAM_SIZE}`
        ).toBe(TEAM_SIZE);
      }
    });

    it('lands ON her burst-cast frame (burstCast, not fullBurstEnter)', () => {
      const castFrames = belortaBursts(base.events)
        .map((c) => c.frame)
        .sort((a, b) => a - b);
      const buffFrames = [
        ...new Set(csBuffs(base.events).map((b) => b.frame)),
      ].sort((a, b) => a - b);
      expect(buffFrames).toEqual(castFrames);
    });

    it('DISCRIMINATING: a self-scoped encoding reaches exactly one holder per cast', () => {
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of csBuffs(buffSelf.events)) {
        (
          perFrame.get(b.frame) ??
          perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx);
      }
      expect([...perFrame.values()].map((s) => s.size)).not.toEqual(
        [...new Set(csBuffs(base.events).map((b) => b.frame))].map(
          () => TEAM_SIZE
        )
      );
      for (const holders of perFrame.values()) {
        expect(holders.size).toBe(1);
      }
    });

    it('DISCRIMINATING: a fullBurstEnter encoding lands LATER than the cast frame', () => {
      const castFrames = belortaBursts(buffOnFB.events).map((c) => c.frame);
      const fbFrames = [
        ...new Set(csBuffs(buffOnFB.events).map((b) => b.frame)),
      ];
      expect(fbFrames.length).toBeGreaterThan(0);
      for (const f of fbFrames) {
        expect(castFrames).not.toContain(f);
      }
    });
  });

  describe('S1/S2 — the unmodeled lines contribute NOTHING (and the gate-less S2 would)', () => {
    it('no skill1/skill2 damage from belorta in the shipped model', () => {
      const fabricated = dmg(base.events).filter(
        (d) =>
          d.slug === 'belorta' &&
          (d.srcSlot === 'skill1' || d.srcSlot === 'skill2')
      );
      expect(fabricated).toEqual([]);
    });

    it('the S2 gate holds: totals are identical without any skill2 encoding', () => {
      // The shipped override has NO skill2 blocks; the >4-enemies gate can never open in a
      // single-boss fight, so the line is exactly inert — not merely small.
      const gateless = dmg(gatelessS2.events).filter(
        (d) => d.slug === 'belorta' && d.srcSlot === 'skill2'
      );
      expect(
        gateless.length,
        'the gate-less rider fires on every shot'
      ).toBeGreaterThan(0);
      expect(base.totals).not.toEqual(gatelessS2.totals);
    });
  });
});
