// PER-UNIT KIT SPEC — `pepper` (Pepper, SG/Supporter/Wind, Burst I, cd 20s, ammo 9,
// hitsPerShot 10, reloadFrames 142, skill2 CD 10s). Kit-autonomy gauntlet 2026-08-03.
//
// One assertion group per KIT LINE (P1..P7 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) and to ISOLATE a line whose effect is otherwise masked
// by a teammate's kit (crown's own Relax self-heal drives the same recovery consumer the heal
// lines are read through).
//
// Kit (blablalink prose, data/characters.json → characters.pepper.skills):
//   S1 "Refresh Heart" (StateEffect, no CD):
//      ■ last bullet hits → 1 ally with the lowest HP%: restores HP = 4.45% of caster final
//        Max HP                                                            [P1]
//      ■ last bullet hits → all allies: Refresh Heart incoming healing ▲6.53%, stacks up to
//        5, lasts 15 sec                                                   [P2]
//   S2 "Vitamin Power" (CD 10s — trigger KIT-SILENT, pure internal timer):
//      ■ 1 enemy with the highest final ATK: 160% of final ATK as damage   [P3]
//      ■ that enemy: ATK ▼3.55% for 5 sec                                  [P4]
//   BU "Pepper Therapy" (Burst I, cd 20s):
//      ■ 1 enemy with the highest final ATK: 1237.5% of final ATK as Burst Skill damage [P5]
//      ■ all allies: increases stack count of stackable buffs by 1         [P6]
//      ■ Refresh Heart at max stacks → all allies: restores HP = 27.22% of caster final
//        Max HP                                                            [P7]
//
// Dispositions + why each assertion discriminates:
//   P1 FAITHFUL — lastBullet → alliesLowestHp(1) → heal. No HP pool in v1, so the heal primitive
//      emits the RECOVERY EVENT channel only (HP amount unmodeled — engine convention, same as
//      helm H2/H8), and the lowest-HP target resolves to the LEFTMOST ally (documented stand-in,
//      types.ts alliesLowestHp). Both properties make the line observable ONLY through crown's
//      "when recovery takes effect" consumer: the fixture slots crown LEFTMOST and patches her own
//      Relax self-heal out (isolation) so every recovery firing is attributable to pepper. Asserted
//      at HER CADENCE — once per mag dump (~8.4s SG clip), which a burst-cadence heal cannot
//      produce.
//   P2 FAITHFUL (stack machinery) — the Refresh Heart STACK COUNT is load-bearing: P7's gate reads
//      it. Modeled as the `refreshHeart` resource pool (max 5), +1 per lastBullet. Stack cadence
//      (~8.4s mag dumps) beats the 15s window, so under the engine's refresh-on-reapply stack
//      semantics the pool ramps to 5 by the 5th magazine and never lapses while pepper keeps
//      firing — the pool's no-decay approximation is behavior-identical in scope (diverges only if
//      pepper stops firing >15s, out of scope). The 6.53% incoming-healing MAGNITUDE has no StatKey
//      and no HP pool to act on — unmodeled payload, verbatim in override.unmodeled. The pool is
//      observable ONLY through P7's gate, so the pins live there (gate-timing probes); here it is
//      pinned by ABSENCE of any buff encoding — pepper emits ZERO buffApply events, so a sloppy
//      maxStacks-buff model of the stacks would fail loudly.
//   P3 FAITHFUL — interval:10 on the datamined skillCooldownsSec.skill2 (kit-silent trigger →
//      internal timer; helm-aquamarine S2a precedent), first fire t=10 ⇒ 17 hits in 180s (the
//      t=180.000 firing is the excluded final frame). Single boss = trivially the highest-final-ATK
//      enemy. ⚑ first-fire phase (t=10 vs t=0) is the documented convention, unpinned by footage.
//      Nearest-wrong: inheriting S1's lastBullet trigger (~2× over-fire) — the cadence-count
//      assertion is the mandatory discriminator.
//   P4 UNMODELED — no enemy-ATK debuff primitive exists (damageTakenPct is a DIFFERENT mechanic:
//      boss-takes-more, not boss-ATK-down) and the boss's ATK feeds nothing in v1 (the boss deals
//      no damage). Verbatim in unmodeled. Pinned by ABSENCE (no boss debuff from pepper) plus a
//      sensitivity counterfactual proving the pin catches the damageTakenPct reflex mis-encoding,
//      which would silently buff all five units' damage.
//   P5 FAITHFUL — burstCast flatDamage 1237.5. A burst CAST lands BEFORE the Full Burst window
//      opens, so it must never take the +50% major (verified fact, 2026-07-13); crit-eligible by
//      the flatDamage default. Keyed burstCast, NOT fullBurstEnter — divergence matters in any comp
//      with a second Burst-I unit. Single boss = the highest-final-ATK enemy.
//   P6 FAITHFUL (self-slice) — the generic cross-unit "+1 stack to every stackable buff" has no
//      engine primitive; the HONEST model is the narrow self-interaction: Refresh Heart IS a
//      stackable buff and pepper's own burst gate reads it, so the burst grants +1 to the
//      `refreshHeart` pool (clamped at 5) BEFORE the gate evaluates — the kit's ■ bullets resolve
//      in listed order and blocks dispatch sequentially per frame, so a cast at 4 stacks completes
//      5 and heals on THAT cast. The generic clause is verbatim in unmodeled. Discriminator: a
//      4-magazines-dump cast heals shipped, and waits one reload longer with the increment removed.
//   P7 FAITHFUL — burstCast + resourceGate{refreshHeart ≥ 5} → all-ally heal (recovery channel;
//      the 27.22% amount unmodeled like all heal amounts). Ungated it would over-fire every
//      on-recovery consumer early in the fight; the gate-timing pins (silent before the pool caps,
//      firing after) catch both the dropped-gate and the fullBurstEnter-keyed counterfactuals.
//
// Inert UNMODELED magnitudes with no assertions: the 4.45% / 27.22% heal AMOUNTS and the 6.53%
// incoming-healing value (no HP pool in v1 — the recovery-event channel is the only modeled
// observable; amounts are recorded in the override note only).
//
// Fixture: custom sole-B1 comp crown(B2) / pepper(B1) / ada(B3), boss Iron (pepper's Wind
// advantage live), focus ada — pepper OWNS the B1 slot (controlComp seats liter at B1, where
// pepper would cast ZERO bursts and every burst assertion would pass vacuously), and the rotation
// has B2+B3 so the chain completes. Crown sits LEFTMOST so the lowest-HP stand-in heal reaches her
// recovery consumer (P1's only observable). Deterministic (no seed); assertions read the event
// log, not totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** Fixture slot order: crown 0 / pepper 1 / ada 2. */
const CROWN = 0;
const PEPPER = 1;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['crown', 'pepper', 'ada'],
    bossElement: 'Iron',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const hasHeal = (b: any) => b.effects.some((e: any) => e.kind === 'heal');
const hasFlat = (b: any) => b.effects.some((e: any) => e.kind === 'flatDamage');
const hasResource = (b: any) => b.effects.some((e: any) => e.kind === 'resource');

/** Isolation: crown's own Relax self-heal (hitCount 860) fires her recovery consumer ~once per
 *  26s, masking pepper's contribution. Removing it leaves pepper's heals as the ONLY recovery
 *  source in the comp, so every recovery firing is attributable to them. */
const crownNoHeal = withPatchedOverride('crown', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasHeal(b));
  if (ov.skill2.length === before) {
    throw new Error('crown S2 heal block missing — fixture is stale');
  }
});

/** P1 reference: her S1 heal line removed entirely. */
const pepperNoS1Heal = withPatchedOverride('pepper', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasHeal(b));
  if (ov.skill1.length === before) {
    throw new Error('pepper S1 heal block missing — fixture is stale');
  }
});

/** P3 reference: her S2 damage line removed entirely. */
const pepperNoS2Dmg = withPatchedOverride('pepper', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasFlat(b));
  if (ov.skill2.length === before) {
    throw new Error('pepper S2 flatDamage block missing — fixture is stale');
  }
});

/** P3 counterfactual: the same line on the WRONG cadence — skill2's ■ header carries no
 *  activation clause, so the nearest contamination is inheriting S1's trigger shape; a 20s
 *  interval stands in for any wrong period (8 fires instead of 17). */
const pepperSlowS2 = withPatchedOverride('pepper', (ov) => {
  const b = ov.skill2.find((x: any) => x.trigger.kind === 'interval');
  if (!b) {
    throw new Error('pepper S2 interval block missing — fixture is stale');
  }
  b.trigger.sec = 20;
});

/** P4 sensitivity counterfactual: the nearest wrong encoding of "ATK ▼3.55%" — a boss
 *  damageTakenPct debuff (a DIFFERENT mechanic). Proves the absence pin is not vacuous. */
const pepperAtkDownProxy = withPatchedOverride('pepper', (ov) => {
  ov.skill2.push({
    slot: 'skill2',
    trigger: { kind: 'interval', sec: 10 },
    target: { kind: 'enemy' },
    effects: [
      { kind: 'buff', stat: 'damageTakenPct', value: 3.55, durationSec: 5 },
    ],
  });
});

/** P5 counterfactual: the lv1 magnitude 731.25 instead of the lv10 kit value 1237.5 (the
 *  stale-low-level parse regression). */
const pepperNukeLv1 = withPatchedOverride('pepper', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e) {
    throw new Error('pepper burst flatDamage missing — fixture is stale');
  }
  e.atkPct = 731.25;
});

/** P6 reference: the burst's Refresh Heart +1 increment removed (the generic clause stays
 *  unmodeled either way — this isolates the self-slice). */
const pepperNoBurstIncrement = withPatchedOverride('pepper', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasResource(b));
  if (ov.burst.length === before) {
    throw new Error('pepper burst resource block missing — fixture is stale');
  }
});

/** P7 counterfactual: the nearest wrong model of the max-stacks heal — the SAME block with its
 *  resourceGate dropped, healing on EVERY cast from t≈0. */
const pepperUngatedBurstHeal = withPatchedOverride('pepper', (ov) => {
  const b = ov.burst.find((x: any) => hasHeal(x));
  if (!b || !b.resourceGate) {
    throw new Error('pepper gated burst heal missing — fixture is stale');
  }
  delete b.resourceGate;
});

/** P7 reference: the gated burst heal removed entirely. */
const pepperNoBurstHeal = withPatchedOverride('pepper', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasHeal(b));
  if (ov.burst.length === before) {
    throw new Error('pepper burst heal block missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const isolated = run({ crown: crownNoHeal });
const noS1Heal = run({ crown: crownNoHeal, pepper: pepperNoS1Heal });
const noS2 = run({ pepper: pepperNoS2Dmg });
const slowS2 = run({ pepper: pepperSlowS2 });
const atkProxy = run({ pepper: pepperAtkDownProxy });
const nukeLv1 = run({ pepper: pepperNukeLv1 });
const noIncr = run({ crown: crownNoHeal, pepper: pepperNoBurstIncrement });
const ungated = run({ crown: crownNoHeal, pepper: pepperUngatedBurstHeal });
const noBurstHeal = run({ crown: crownNoHeal, pepper: pepperNoBurstHeal });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const pepperDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === 'pepper' && d.srcSlot === srcSlot);
const pepperShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'pepper');
/** Mag-dump count = lastBullet trigger count (lastBullet fires exactly when ammo hits 0). */
const pepperLastBullets = (evs: SimEvent[]) =>
  pepperShots(evs).filter((s) => s.ammoAfter === 0).length;
const pepperBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'pepper');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');

/** Frames at which crown's recovery-triggered team buff fired (one firing = one frame, even
 *  though the block targets all allies and so emits one buffApply per holder). */
const recoveryFrames = (evs: SimEvent[]): number[] =>
  [
    ...new Set(
      buffs(evs)
        .filter(
          (b) =>
            b.casterIdx === CROWN &&
            b.stat === 'attackDamagePct' &&
            b.value === 20.99
        )
        .map((b) => b.frame)
    ),
  ].sort((a, b) => a - b);

/** Magazine dumps completed STRICTLY BEFORE each pepper burst-cast frame = the Refresh Heart
 *  pool the cast sees pre-increment (S1 grants +1 per dump; the pool starts at 0). */
function magsAtCast(evs: SimEvent[]): { castFrame: number; mags: number }[] {
  const dumpFrames = pepperShots(evs)
    .filter((s) => s.ammoAfter === 0)
    .map((s) => s.frame)
    .sort((a, b) => a - b);
  return pepperBursts(evs).map((c) => ({
    castFrame: c.frame,
    mags: dumpFrames.filter((f) => f < c.frame).length,
  }));
}

describe('pepper — kit spec', () => {
  describe('P1 — S1 heal: a recovery event on every last bullet, through the lowest-HP ally', () => {
    it("drives crown's recovery consumer at HER mag-dump cadence, not once per burst", () => {
      const dumps = pepperLastBullets(isolated.events);
      const bursts = pepperBursts(isolated.events).length;
      expect(dumps, 'fixture sanity: pepper dumps mags in 180s').toBeGreaterThan(5);
      expect(
        bursts,
        'fixture sanity: pepper casts bursts in 180s'
      ).toBeGreaterThan(0);
      // Burst-cadence firings from the P7 gated heal also appear in this run — they are pinned
      // in P7. Off-cast-frame, the ONLY recovery source is the S1 heal, once per mag dump.
      const castFrames = new Set(
        pepperBursts(isolated.events).map((c) => c.frame)
      );
      const nonCastFirings = recoveryFrames(isolated.events).filter(
        (f) => !castFrames.has(f)
      );
      expect(
        nonCastFirings.length,
        `${nonCastFirings.length} off-cast firings vs ${dumps} mag dumps / ${bursts} bursts — ` +
          'a burst-cadence heal would land near the burst count'
      ).toBe(dumps);
    });

    it('the isolated run has recovery firings ONLY from pepper (fixture hygiene)', () => {
      // Crown's own Relax heal is patched out and ada has none; removing pepper's S1 heal must
      // drop the mag-dump-cadence firings entirely (the RED side of the pin). Burst-cadence
      // firings from the P7 gated heal may remain — they are pinned separately in P7.
      const dumps = pepperLastBullets(noS1Heal.events);
      const castFrames = new Set(
        pepperBursts(noS1Heal.events).map((c) => c.frame)
      );
      const nonCastFirings = recoveryFrames(noS1Heal.events).filter(
        (f) => !castFrames.has(f)
      );
      expect(dumps).toBeGreaterThan(5);
      expect(
        nonCastFirings,
        'with S1 removed, no recovery may fire off the mag-dump cadence'
      ).toEqual([]);
    });
  });

  describe('P2 — Refresh Heart stacks are a resource pool, not a buff (gate currency for P7)', () => {
    it('pepper emits ZERO buffApply events — no sloppy stack/buff encoding is live', () => {
      const fromPepper = buffs(base.events).filter(
        (b) => b.casterIdx === PEPPER
      );
      expect(
        fromPepper.map((b) => `${b.stat}:${b.value}`),
        'a maxStacks-buff model of Refresh Heart (or any stack-increment encoding) would ' +
          'have to surface as a buff'
      ).toEqual([]);
    });
  });

  describe('P3 — S2 Vitamin Power: 160% of final ATK on the datamined 10s internal timer', () => {
    const riders = pepperDamage(base.events, 'skill2');

    it('fires exactly 17× in 180s (first fire t=10, t=180 excluded)', () => {
      expect(riders.length).toBe(17);
    });

    it('is the lv10 kit magnitude, in the skill bucket, crit-eligible', () => {
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([160]);
      expect([...new Set(riders.map((d) => d.bucket))]).toEqual(['skill']);
      expect(riders.every((d) => d.critEligible)).toBe(true);
    });

    it('DISCRIMINATING: removal zeroes the line; a 20s cadence fires 8×, not 17×', () => {
      expect(pepperDamage(noS2.events, 'skill2')).toEqual([]);
      expect(pepperDamage(slowS2.events, 'skill2').length).toBe(8);
    });
  });

  describe('P4 — S2 ATK ▼3.55% is unmodeled (no enemy-ATK debuff primitive; boss ATK is inert)', () => {
    // Boss debuffs log with casterIdx AND targetIdx both null (boss-held), so the pin reads the
    // stat+value directly; neither crown nor ada carries a damageTakenPct line, so any such
    // application in these runs is pepper's.
    it('NO damageTakenPct debuff exists — it would be a different mechanic', () => {
      const bossDebuffs = buffs(base.events).filter(
        (b) => b.stat === 'damageTakenPct' && b.value === 3.55
      );
      expect(bossDebuffs.map((b) => `${b.stat}:${b.value}`)).toEqual([]);
    });

    it('DISCRIMINATING: the nearest-wrong encoding (damageTakenPct) IS caught by the pin', () => {
      const proxyDebuffs = buffs(atkProxy.events).filter(
        (b) => b.stat === 'damageTakenPct' && b.value === 3.55
      );
      expect(proxyDebuffs.length).toBeGreaterThan(0);
    });
  });

  describe('P5 — burst nuke: 1237.5% of final ATK, cast BEFORE the Full Burst window', () => {
    const nukes = pepperDamage(base.events, 'burst');

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(pepperBursts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([1237.5]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
      expect(nukes.every((d) => d.critEligible)).toBe(true);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      const took = nukes.filter((d) => d.fbMajorApplied);
      expect(
        took.map((d) => d.sec),
        'burst-cast damage must precede the FB window'
      ).toEqual([]);
    });

    it('DISCRIMINATING: the lv1 magnitude 731.25 is not the shipped value', () => {
      expect(
        [...new Set(pepperDamage(nukeLv1.events, 'burst').map((d) => d.atkPct))]
      ).toEqual([731.25]);
    });
  });

  describe('P7 — burst heal is GATED on Refresh Heart at max stacks (pool 5, incl. the cast increment)', () => {
    const shipped = magsAtCast(isolated.events);
    const castFrameSet = new Set(shipped.map((c) => c.castFrame));
    const healsOn = (evs: SimEvent[]) =>
      new Set(
        recoveryFrames(evs).filter((f) => castFrameSet.has(f))
      );

    it('fixture sanity: the fight spans the gate transition (silent casts AND capped casts)', () => {
      expect(
        shipped.some((c) => c.mags < 4),
        'need an early cast before the pool can cap'
      ).toBe(true);
      expect(
        shipped.some((c) => c.mags >= 5),
        'need a late cast with the pool long-capped'
      ).toBe(true);
    });

    it('heals exactly when mags-dumped + the cast increment reach 5', () => {
      const on = healsOn(isolated.events);
      for (const { castFrame, mags } of shipped) {
        const fired = on.has(castFrame);
        expect(
          fired,
          `cast at ${mags} mags dumped ${fired ? 'healed' : 'did not heal'} — the gate ` +
            'opens at mags+1 >= 5 (the cast increment completes the pool)'
        ).toBe(mags + 1 >= 5);
      }
    });

    it('DISCRIMINATING: gate REMOVED heals every cast; heal REMOVED heals none', () => {
      const ungatedOn = healsOn(ungated.events);
      expect(ungatedOn.size, 'ungated heal must fire on EVERY cast').toBe(
        pepperBursts(ungated.events).length
      );
      expect(healsOn(noBurstHeal.events).size).toBe(0);
    });
  });

  describe('P6 — burst grants +1 Refresh Heart BEFORE the gate reads it (self-slice, kit ■ order)', () => {
    it('fixture sanity: a cast exists at exactly 4 mags dumped — the discriminating state', () => {
      expect(
        magsAtCast(isolated.events).some((c) => c.mags === 4),
        'no 4-mag cast in this fixture — the +1 slice is not observable'
      ).toBe(true);
    });

    it('a 4-mag cast HEALS shipped (the +1 completes 5)…', () => {
      const four = magsAtCast(isolated.events).filter((c) => c.mags === 4);
      const on = new Set(
        recoveryFrames(isolated.events).filter((f) =>
          four.some((c) => c.castFrame === f)
        )
      );
      expect(on.size, 'every 4-mag cast must heal with the increment live').toBe(
        four.length
      );
    });

    it('…and WAITS with the increment removed (gate opens one reload later)', () => {
      const four = magsAtCast(noIncr.events).filter((c) => c.mags === 4);
      const on = new Set(
        recoveryFrames(noIncr.events).filter((f) =>
          four.some((c) => c.castFrame === f)
        )
      );
      expect(
        on.size,
        'without the +1, a 4-mag cast sees pool 4 and must NOT heal'
      ).toBe(0);
      // Sanity: the increment-removed run still heals on fully-capped casts (pool reaches 5
      // via mags alone), so the counterfactual is the increment, not the whole gate.
      const capped = magsAtCast(noIncr.events).filter((c) => c.mags >= 5);
      const onCapped = new Set(
        recoveryFrames(noIncr.events).filter((f) =>
          capped.some((c) => c.castFrame === f)
        )
      );
      expect(capped.length).toBeGreaterThan(0);
      expect(onCapped.size).toBe(capped.length);
    });
  });
});
