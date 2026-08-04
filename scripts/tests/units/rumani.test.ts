// PER-UNIT KIT SPEC — `rumani` (Rumani — RL / Defender / Fire / Burst I, cd 20s, ammo 6,
// chargeFrames 60, reloadFrames 129, hitsPerShot 1). Kit-autonomy gauntlet 2026-08-04.
// Baseline-authoring run: no override existed before this gauntlet (simSupported false→true).
//
// One assertion group per FAITHFUL kit line (R1..R6 below), asserted against the SHIPPED
// override loaded from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the
// nearest wrong model each assertion must discriminate against) — never to supply the encoding
// under test.
//
// Kit (blablalink prose, data/characters.json → characters['rumani'].skills, lvl 10/10/10):
//   S1 "Muscle Up" — ■ performing a Full Charge attack; affects SELF:
//        ■ Max HP ▲ 3.04%, stacks up to 5 times, lasts 2 sec                              [R1 INERT]
//      ■ landing a Full Charge attack during Full Burst; affects the target:
//        ■ Taunts for 5 sec                                                               [R2 UNMODELED]
//   S2 "Muscle Time" — ■ hitting a target's Parts for 5 time(s); affects ALL allies:
//        ■ Damage to Parts ▲ 10.05% for 5 sec                                             [R3 INERT]
//   BU "Almighty Muscle" — ■ affects SELF:
//        ■ Max HP ▲ 15.13% for 10 sec                                                     [R4 INERT]
//      ■ affects ALL allies:
//        ■ Normal Attack Damage Multiplier ▲ 10.05% for 10 sec                            [R5 LOAD-BEARING]
//      ■ Muscle Up at max stacks; affects SELF:
//        ■ Damage Taken ▼ 20.06% for 10 sec                                               [R6 INERT]
//
// R2 (taunt) is UNMODELED on purpose: the sim has no targeting/aggro model and v1 models no
// damage taken by allies, so a taunt moves nothing observable. The line lives VERBATIM in the
// override's `unmodeled.skill1`. Nearest-wrong encoding considered and rejected: a
// `targetStatus` effect is the enemy-status channel (d-killer-wife's Wipe Out) — a taunt is a
// SELF aggro effect, not a boss status; forcing it through that channel would be a fake model.
//
// Encoding notes:
//   * Every rumani pull IS a full charge (RL charge 60f, no dump mode), so her shot cadence is
//     the full-charge cadence; R1 uses chargeCounter count:1 exactly like power's S1 per-charge
//     stack buff (same weapon, same precedent).
//   * R6's "Muscle Up at max stacks" condition is a STACK GATE the engine has no buff-stack gate
//     primitive for; the override mirrors the stack count into a `muscleUp` resource pool
//     (0→5, +1 per full charge, clamped — two single-effect chargeCounter blocks, because a
//     multi-effect chargeCounter CYCLES its effects one-per-charge) and reads it via
//     resourceGate {min:5} on the burstCast block (power precedent, 2026-08-03). ⚑ The pool
//     does NOT expire; the real stacks lapse 2 sec after the last full charge. Unlike power
//     (whose 3s expiry beat her 2.87s reload gap by 8 frames), rumani's 2s expiry is SHORTER
//     than her reload gap (~2.15s + charge), so the pool can overstate stacks just after a
//     reload boundary — flagged in the override caveats with estimate/recipe/tier. It is inert
//     either way: v1 consumes no self damageTakenPct.
//   * R1/R4 (Max HP grants) are targetMaxHpPct → maxHpFlat conversions; rumani has no
//     atkOfMaxHpPct consumer and v1 models no damage-taken, so they are DAMAGE-INERT but
//     OBSERVABLE — pinned by trigger/cadence/value/duration, plus a cross-line magnitude ratio
//     (both scale off her own static Max HP, so L4/L1 flat values = 15.13/3.04 exactly).
//   * R3 (parts damage) is partsDamagePct, inert vs the partless scope-lock boss (helm H4
//     precedent); the "Parts for 5 time(s)" counter is hitCount 5 — the sim has no parts axis,
//     so every hit counts as a parts hit (⚑, inert either way).
//   * R5 is the only LOAD-BEARING line: normalAttackPct scales the normal-attack multiplier
//     (sim.ts normalScale) of every ally's normal-category hits. Nearest wrongs pinned: the
//     Damage-Up-bucket misread (attackDamagePct would also lift skill/burst buckets), the
//     self-only scope misread, and the fullBurstEnter trigger misread (B1-contention arm).
//
// Fixture: rumani is the SOLE B1 — [rumani, crown(B2), emilia(B3), helm(B3)], boss Fire, focus
// emilia; she casts on every 20s CD (9 casts / 180s). The contention arm adds liter as a second
// B1 ([liter, rumani, crown, emilia, helm], focus helm): liter wins most rotations (rumani casts
// 2 of 12 Full Bursts), so Full Bursts happen that rumani did NOT cast into — the burstCast-vs-
// fullBurstEnter discriminator. Deterministic (no seed). Measured constants: 110 shots, 9 casts
// at frames 262/1462/2662/3862/5062/6262/7462/8700/9900, 5th full charge at frame 395 (so cast
// 1 at 262 is genuinely GATE-CLOSED for R6: 8 gated applies, not 9).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** Fixture slot order: rumani 0 / crown 1 / emilia 2 / helm 3. */
const RUMANI = 0;
const SLUGS = ['rumani', 'crown', 'emilia', 'helm'];

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: SLUGS,
    bossElement: 'Fire',
    focusSlug: 'emilia',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}
const sum = (t: Record<string, number>) =>
  Object.values(t).reduce((a, b) => a + b, 0);

// ---- counterfactual / isolation patches -------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.kind === 'buff' && e.stat === stat);

/** R1 counterfactual: the Muscle Up stack line misread as a passive always-on single grant
 *  (no per-charge ramp, no 2s expiry, no stack cap). The pool block is untouched. */
const r1PassiveFlat = withPatchedOverride('rumani', (ov) => {
  const b = ov.skill1.find((x: any) => hasStat(x, 'targetMaxHpPct'));
  if (!b) {
    throw new Error('rumani S1 Muscle Up block missing — fixture is stale');
  }
  b.trigger = { kind: 'passive' };
  const buff = b.effects.find((e: any) => e.stat === 'targetMaxHpPct');
  buff.maxStacks = 1;
  delete buff.durationSec;
});
/** R1 isolation: strip ONLY the Muscle Up buff block (the muscleUp pool block stays, so the
 *  R6 gate is unaffected by this arm). */
const r1NoBuff = withPatchedOverride('rumani', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'targetMaxHpPct'));
  if (ov.skill1.length === before) {
    throw new Error('rumani S1 Muscle Up block missing — fixture is stale');
  }
});
/** R3 reference: her entire S2 removed. */
const r3NoS2 = withPatchedOverride('rumani', (ov) => {
  if (!ov.skill2.length) {
    throw new Error('rumani S2 block missing — fixture is stale');
  }
  ov.skill2 = [];
});
/** R3 counterfactual: the parts buff as an always-on passive (the helm-S2 shape), not a
 *  5-hit counter. Misfires from frame 0 and never lapses. */
const r3Passive = withPatchedOverride('rumani', (ov) => {
  const b = ov.skill2[0];
  if (!hasStat(b, 'partsDamagePct')) {
    throw new Error('rumani S2 partsDamagePct block missing — fixture is stale');
  }
  b.trigger = { kind: 'passive' };
  delete b.effects[0].durationSec;
});
/** R4 reference: strip ONLY the burst Max-HP effect (L5/L6 stay). */
const r4NoL4 = withPatchedOverride('rumani', (ov) => {
  let removed = 0;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.stat !== 'targetMaxHpPct');
    removed += before - b.effects.length;
  }
  if (removed !== 1) {
    throw new Error('rumani burst targetMaxHpPct block missing — fixture is stale');
  }
});
/** R5 reference: strip ONLY the normalAttackPct effect from the burst (L4/L6 stay). */
const r5NoL5 = withPatchedOverride('rumani', (ov) => {
  let removed = 0;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.stat !== 'normalAttackPct');
    removed += before - b.effects.length;
  }
  if (removed !== 1) {
    throw new Error('rumani burst normalAttackPct block missing — fixture is stale');
  }
});
/** R5 counterfactual (bucket misread): the same line as a generic Damage-Up-bucket buff. That
 *  would lift skill/burst damage too — the shipped normal-attack multiplier must NOT. */
const r5AsAtkDmg = withPatchedOverride('rumani', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'normalAttackPct');
  if (!e) {
    throw new Error('rumani burst normalAttackPct effect missing — fixture is stale');
  }
  e.stat = 'attackDamagePct';
});
/** R5 counterfactual (scope misread): the buff scoped to SELF only, not all allies. */
const r5SelfOnly = withPatchedOverride('rumani', (ov) => {
  const b = ov.burst.find((x: any) => hasStat(x, 'normalAttackPct'));
  if (!b) {
    throw new Error('rumani burst normalAttackPct block missing — fixture is stale');
  }
  b.target = { kind: 'self' };
});
/** R6 reference: strip ONLY the gated Damage-Taken block. */
const r6NoGate = withPatchedOverride('rumani', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !b.resourceGate);
  if (ov.burst.length === before) {
    throw new Error('rumani burst gated damageTaken block missing — fixture is stale');
  }
});
/** R6 counterfactual: the gate removed (unconditional damage-taken grant on every cast). */
const r6Unconditional = withPatchedOverride('rumani', (ov) => {
  const b = ov.burst.find((x: any) => x.resourceGate);
  if (!b) {
    throw new Error('rumani burst resourceGate block missing — fixture is stale');
  }
  delete b.resourceGate;
});
/** R6 counterfactual: the muscleUp pool never fills (S1 resource block removed) — the buff
 *  block stays, so this isolates the GATE from the damage-taken line. */
const r6NoPool = withPatchedOverride('rumani', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'resource')
  );
  if (ov.skill1.length === before) {
    throw new Error('rumani S1 resource block missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const rPassiveFlat = run({ rumani: r1PassiveFlat });
const rNoL1Buff = run({ rumani: r1NoBuff });
const rNoS2 = run({ rumani: r3NoS2 });
const rS2Passive = run({ rumani: r3Passive });
const rNoL4 = run({ rumani: r4NoL4 });
const rNoL5 = run({ rumani: r5NoL5 });
const rAsAtkDmg = run({ rumani: r5AsAtkDmg });
const rSelfOnly = run({ rumani: r5SelfOnly });
const rNoL6 = run({ rumani: r6NoGate });
const rUncond = run({ rumani: r6Unconditional });
const rNoPool = run({ rumani: r6NoPool });

// ---- B1-contention arm (discriminates burstCast vs fullBurstEnter) ---------------------------
// The primary fixture makes rumani the SOLE B1, so every Full Burst is one she cast into and the
// trigger identity is NOT discriminated there. This comp fields liter as a competing Burst I:
// liter wins most rotations (rumani casts 2 of 12 Full Bursts), so Full Bursts happen that
// rumani did NOT cast into — a fullBurstEnter-keyed encoding would misfire its normal-attack
// buff on every one of them while the shipped burstCast fires only on her own 2 casts.
const CONTEND_SLUGS = ['liter', 'rumani', 'crown', 'emilia', 'helm'];
const CONTEND_R = CONTEND_SLUGS.indexOf('rumani');
function runContend(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({
    slugs: CONTEND_SLUGS,
    bossElement: 'Fire',
    focusSlug: 'helm',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events;
}
/** Nearest-wrong trigger: key the burst buffs to fullBurstEnter instead of rumani's OWN cast. */
const burstFullBurstEnter = withPatchedOverride('rumani', (ov) => {
  for (const b of ov.burst) {
    b.trigger = { kind: 'fullBurstEnter' };
  }
});
const contendBase = runContend();
const contendFBE = runContend({ rumani: burstFullBurstEnter });
const contendBuffs = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BuffApply =>
      e.kind === 'buffApply' &&
      e.casterIdx === CONTEND_R &&
      e.stat === 'normalAttackPct' &&
      e.value === 10.05
  );

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const rumaniShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'rumani');
const rumaniCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'rumani'
  );
/** Buffs rumani applied, optionally by stat (+ source slot via the apply key). */
const rumaniBuffs = (evs: SimEvent[], stat: string, slot?: string) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === RUMANI &&
      b.stat === stat &&
      (slot === undefined || b.key.includes(slot))
  );
/** Sum of one unit's damage over the given buckets — the R5 bucket discriminator. */
const bucketSum = (evs: SimEvent[], buckets: Damage['bucket'][]) =>
  dmg(evs)
    .filter((d) => buckets.includes(d.bucket))
    .reduce((a, d) => a + d.amount, 0);

const l1Applies = rumaniBuffs(base.events, 'maxHpFlat', 'skill1').filter(
  (b) => b.targetIdx === RUMANI
);
const l4Applies = rumaniBuffs(base.events, 'maxHpFlat', 'burst').filter(
  (b) => b.targetIdx === RUMANI
);
const l5Applies = rumaniBuffs(base.events, 'normalAttackPct', 'burst');
const l6Applies = rumaniBuffs(base.events, 'damageTakenPct', 'burst');
const l3Applies = rumaniBuffs(base.events, 'partsDamagePct', 'skill2');
const shots = rumaniShots(base.events);
const casts = rumaniCasts(base.events);

describe('rumani — kit spec', () => {
  describe('R1 — S1 Muscle Up: Max HP ▲ 3.04% per full charge, stacks to 5, 2 sec (INERT)', () => {
    it('fires once per full charge (= once per RL pull) and ramps 1..5 stacks', () => {
      expect(shots.length, 'fixture fired no shots').toBeGreaterThan(0);
      expect(l1Applies.length, 'one apply per full charge').toBe(shots.length);
      const stacks = [...new Set(l1Applies.map((b) => b.stacks))].sort();
      expect(stacks).toEqual([1, 2, 3, 4, 5]);
      for (const b of l1Applies) {
        expect(b.maxStacks).toBe(5);
        expect(b.targetIdx).toBe(RUMANI);
        expect(b.expiresFrame! - b.frame, '2 sec window').toBe(2 * FPS);
      }
    });

    it('is the kit magnitude (a constant flat grant off her own static Max HP)', () => {
      expect([...new Set(l1Applies.map((b) => b.value))].length).toBe(1);
      expect(l1Applies[0].value, '3.04% of her Max HP, not zero').toBeGreaterThan(0);
    });

    it('RED vs counterfactual: a passive always-on single grant has the wrong shape', () => {
      const cf = rumaniBuffs(rPassiveFlat.events, 'maxHpFlat', 'skill1').filter(
        (b) => b.targetIdx === RUMANI
      );
      // Passive fires once at frame 0 with no expiry — the shipped model fires per charge with
      // a 2s window, so the two shapes are mutually exclusive.
      expect(cf.length).toBeLessThan(l1Applies.length);
      expect(cf.every((b) => b.frame === 0 && b.expiresFrame === null)).toBe(true);
    });

    it('SAWTOOTH: the 2s expiry is SHORTER than her reload gap, so stacks reset to 1 after every reload', () => {
      // Measured: 129f (2.15s) reload > 120f (2s) expiry — a permanent/until-reload stack model
      // (the nearest wrong read) would keep stacks pinned at 5; the kit's "lasts 2 sec" does not.
      const reloads = base.events.filter(
        (e) => e.kind === 'reload' && (e as any).slug === 'rumani'
      );
      expect(reloads.length, 'fixture precondition: natural reloads happen').toBeGreaterThan(3);
      for (const r of reloads) {
        const next = l1Applies.find((b) => b.frame > r.frame);
        expect(next, 'a full charge must follow every reload').toBeDefined();
        expect(next!.stacks, 'stacks lapse over the reload gap').toBe(1);
      }
    });

    it('is damage-INERT — removing the Muscle Up buff moves no damage', () => {
      expect(Math.abs(sum(base.totals) - sum(rNoL1Buff.totals))).toBeLessThan(1);
    });
  });

  describe('R3 — S2 Muscle Time: Damage to Parts ▲ 10.05% for 5 sec, all allies, every 5 hits (INERT vs partless boss)', () => {
    const firings = [...new Set(l3Applies.map((b) => b.frame))].sort((a, b) => a - b);

    it('fires on the 5-hit counter: frame of every 5th shot, never before', () => {
      expect(firings.length, 'counter never fired').toBeGreaterThan(3);
      expect(firings.length).toBe(Math.floor(shots.length / 5));
      for (let k = 0; k < firings.length; k++) {
        expect(firings[k], `firing ${k + 1} lands on shot ${5 * (k + 1)}`).toBe(
          shots[5 * (k + 1) - 1].frame
        );
      }
      expect(firings[0], 'cannot fire before 5 hits accrue').toBeGreaterThan(0);
    });

    it('reaches all four allies at kit magnitude for a 5 sec window', () => {
      expect([...new Set(l3Applies.map((b) => b.targetIdx))].sort()).toEqual([0, 1, 2, 3]);
      expect([...new Set(l3Applies.map((b) => b.value))]).toEqual([10.05]);
      for (const b of l3Applies) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
      expect(l3Applies.length).toBe(firings.length * 4);
    });

    it('RED vs counterfactual: an always-on passive parts buff misfires from frame 0', () => {
      const cf = rumaniBuffs(rS2Passive.events, 'partsDamagePct', 'skill2');
      expect(cf.some((b) => b.frame === 0 && b.expiresFrame === null)).toBe(true);
      // The shipped counter's first firing is strictly after frame 0.
      expect(firings[0]).toBeGreaterThan(0);
    });

    it('is damage-INERT vs the partless scope-lock boss (helm-H4 precedent)', () => {
      expect(base.totals).toEqual(rNoS2.totals);
    });

    it('TRAP: the parts buff is NEVER a generic Damage-Up grant (no attackDamagePct from S2)', () => {
      // The single biggest over-credit misread of this line: "Damage to Parts ▲ 10.05%" as a
      // permanent team-wide attackDamagePct. Assert the stat simply never appears from rumani.
      expect(rumaniBuffs(base.events, 'attackDamagePct')).toHaveLength(0);
    });
  });

  describe('R4 — burst Max HP ▲ 15.13% for 10 sec, self (INERT)', () => {
    it('lands once per burst cast on rumani alone, 10 sec window', () => {
      expect(l4Applies.length).toBe(casts.length);
      expect(casts.length, 'fixture precondition: rumani casts').toBeGreaterThan(0);
      for (const b of l4Applies) {
        expect(b.targetIdx).toBe(RUMANI);
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('is the kit magnitude — pinned by the exact ratio to the R1 grant (same Max HP basis)', () => {
      expect(l4Applies[0].value / l1Applies[0].value).toBeCloseTo(15.13 / 3.04, 9);
    });

    it('RED vs counterfactual: the line is ABSENT when stripped', () => {
      expect(rumaniBuffs(rNoL4.events, 'maxHpFlat', 'burst')).toHaveLength(0);
    });
  });

  describe('R5 — burst Normal Attack Damage Multiplier ▲ 10.05% for 10 sec, ALL allies (LOAD-BEARING)', () => {
    it('is the kit magnitude, one application per ally per cast, 10 sec window', () => {
      expect(l5Applies.length, 'no normalAttackPct@10.05 applications').toBeGreaterThan(0);
      expect(l5Applies.length).toBe(casts.length * 4);
      expect([...new Set(l5Applies.map((b) => b.value))]).toEqual([10.05]);
      const frames = new Set(l5Applies.map((b) => b.frame));
      expect(frames).toEqual(new Set(casts.map((c) => c.frame)));
      for (const b of l5Applies) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
      expect([...new Set(l5Applies.map((b) => b.targetIdx))].sort()).toEqual([0, 1, 2, 3]);
    });

    it('is LIVE — removing the line drops the team total', () => {
      expect(sum(base.totals)).toBeGreaterThan(sum(rNoL5.totals));
    });

    it('DISCRIMINATING bucket: it scales ONLY the normal multiplier, never the Damage-Up bucket', () => {
      // Shipped vs line-removed: helm's flatDamage rider + burst nuke (skill/burst instances
      // with NO parent inheritance) must not move …
      const helmBuckets = (evs: SimEvent[]) =>
        dmg(evs)
          .filter((d) => d.slug === 'helm' && (d.bucket === 'skill' || d.bucket === 'burst'))
          .reduce((a, d) => a + d.amount, 0);
      expect(helmBuckets(base.events)).toBe(helmBuckets(rNoL5.events));
      // … while the Damage-Up-bucket misread would lift them too.
      expect(helmBuckets(rAsAtkDmg.events)).toBeGreaterThan(helmBuckets(base.events));
      // And the shipped line still moves normal-bucket damage.
      expect(bucketSum(base.events, ['normal'])).toBeGreaterThan(
        bucketSum(rNoL5.events, ['normal'])
      );
    });

    it('the ONLY skill-bucket movement is emilia’s %-of-hit repeat inheriting the parent lift (SSOT §3)', () => {
      // emilia's skill2 is a "% of the damage dealt by self" repeat — it inherits everything
      // from the parent hit, including the normal multiplier. That inheritance moves it in
      // lockstep with her normals (same factor), which is faithful — not a bucket leak.
      const emiliaNormal = (evs: SimEvent[]) =>
        dmg(evs).filter((d) => d.slug === 'emilia' && d.bucket === 'normal');
      const emiliaSkill = (evs: SimEvent[]) =>
        dmg(evs).filter((d) => d.slug === 'emilia' && d.bucket === 'skill');
      const sumOf = (ds: Damage[]) => ds.reduce((a, d) => a + d.amount, 0);
      const normalLift =
        sumOf(emiliaNormal(base.events)) / sumOf(emiliaNormal(rNoL5.events));
      const skillLift =
        sumOf(emiliaSkill(base.events)) / sumOf(emiliaSkill(rNoL5.events));
      expect(skillLift).toBeCloseTo(normalLift, 6);
    });

    it('DISCRIMINATING scope: the all-allies buff beats the self-only misread', () => {
      expect(sum(base.totals)).toBeGreaterThan(sum(rSelfOnly.totals));
      const selfOnlyTargets = [
        ...new Set(
          rumaniBuffs(rSelfOnly.events, 'normalAttackPct', 'burst').map(
            (b) => b.targetIdx
          )
        ),
      ];
      expect(selfOnlyTargets).toEqual([RUMANI]);
    });

    it('RED vs counterfactual: the line is ABSENT when stripped', () => {
      expect(rumaniBuffs(rNoL5.events, 'normalAttackPct', 'burst')).toHaveLength(0);
    });
  });

  describe('R6 — burst Damage Taken ▼ 20.06% for 10 sec, self, GATED on Muscle Up max stacks (INERT)', () => {
    it('cast 1 is genuinely gate-CLOSED (it precedes the 5th full charge), later casts open', () => {
      const fifthCharge = shots[4].frame;
      expect(casts[0].frame, 'measured fixture: first cast precedes 5th charge').toBeLessThan(
        fifthCharge
      );
      expect(l6Applies.length, 'every cast except the gate-closed first').toBe(
        casts.length - 1
      );
      expect(l6Applies.map((b) => b.frame)).toEqual(
        casts.slice(1).map((c) => c.frame)
      );
      for (const b of l6Applies) {
        expect(b.targetIdx).toBe(RUMANI);
        expect(b.value).toBe(-20.06);
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING gate: the pool drives the gate (no pool → no gated applies)', () => {
      expect(rumaniBuffs(rNoPool.events, 'damageTakenPct', 'burst')).toHaveLength(0);
      // … while the Muscle Up buff itself is still stacking in that arm (pool stripped only).
      expect(
        rumaniBuffs(rNoPool.events, 'maxHpFlat', 'skill1').length
      ).toBeGreaterThan(0);
    });

    it('DISCRIMINATING gate: an unconditional encoding over-fires on the gate-closed first cast', () => {
      expect(rumaniBuffs(rUncond.events, 'damageTakenPct', 'burst').length).toBe(
        casts.length
      );
    });

    it('is damage-INERT — v1 consumes no self damage-taken reduction', () => {
      expect(Math.abs(sum(base.totals) - sum(rNoL6.totals))).toBeLessThan(1);
    });

    it('TRAP: the mitigation is SELF-held, never flipped into the boss damageTakenPct debuff channel', () => {
      // The catastrophic misread: "Damage Taken ▼" as a boss-held debuff (positive = boss takes
      // more) would hand the whole team a spurious ~20% damage window on every gated cast.
      // Boss-held debuffs emit targetIdx null — assert none exist and every grant is self-held.
      const allDt = buffs(base.events).filter((b) => b.stat === 'damageTakenPct');
      expect(allDt.every((b) => b.targetIdx === RUMANI)).toBe(true);
      expect(allDt.filter((b) => b.targetIdx === null)).toHaveLength(0);
    });
  });

  describe('burst trigger identity — burstCast (own B1 cast), NOT fullBurstEnter [B1-contention arm]', () => {
    const fbStarts = contendBase.filter((e) => e.kind === 'fullBurstStart');
    const rCasts = contendBase.filter(
      (e) => e.kind === 'burstCast' && e.slug === 'rumani'
    );

    it('precondition: liter wins most rotations — Full Bursts rumani did NOT cast into exist', () => {
      expect(fbStarts.length, 'no Full Bursts in the contention comp').toBeGreaterThan(2);
      expect(rCasts.length, 'rumani should still cast SOME rotations').toBeGreaterThan(0);
      expect(
        rCasts.length,
        'rumani must sit out at least one Full Burst for this arm to discriminate'
      ).toBeLessThan(fbStarts.length);
    });

    it('GREEN: the shipped burstCast applies the buff exactly on her own cast frames', () => {
      const applied = contendBuffs(contendBase);
      const applyFrames = [...new Set(applied.map((b) => b.frame))].sort((a, b) => a - b);
      expect(applyFrames).toEqual(
        [...new Set(rCasts.map((c) => c.frame))].sort((a, b) => a - b)
      );
    });

    it('RED: a fullBurstEnter encoding misfires on Full Bursts rumani did not cast into', () => {
      const misfires = contendBuffs(contendFBE);
      const frames = [...new Set(misfires.map((b) => b.frame))];
      expect(frames.length).toBe(fbStarts.length);
      expect(frames.length).toBeGreaterThan(
        [...new Set(contendBuffs(contendBase).map((b) => b.frame))].length
      );
    });
  });
});
