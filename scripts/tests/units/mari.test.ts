// PER-UNIT KIT SPEC — `mari` (Mari, Supporter/SR/Electric, Burst II, cd 20s, ammo 6, chargeFrames
// 60). Kit-autonomy gauntlet 2026-07-26; test-first independent re-derivation from the blablalink
// prose in data/characters.json → characters.mari.skills.
//
// One assertion group per KIT LINE (MR1..MR7 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, max-level values):
//   S1 ■ landing a Full Charge attack → all allies: Damage dealt to Shield ▲100.09% for 3 sec   [MR2 UNMODELED]
//      ■ landing an attack on a target's core → all allies: Pierce Damage ▲40.99% for 10 sec     [MR1]
//   S2 ■ self: Gain Pierce for 5 sec                                                             [MR5]
//      ■ self: ATK ▲30.78% for 5 sec                                                             [MR3]
//      ■ all allies: ATK ▲30.78% of the skill user's ATK for 5 sec                               [MR4]
//   BU ■ all enemies: 639.36% of final ATK as Burst Skill damage                                 [MR6]
//      ■ all allies: Attack damage ▲40.99% for 10 sec                                            [MR7]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   MR1  pierceDamagePct is a Damage-Up bucket that goes live ONLY for Pierce-tagged attacks
//        (src/engine/sim.ts:1402). Mari tags HERSELF Pierce via MR5's hasPierce, so her own S1
//        pierce buff (which targets all allies, herself included) feeds her OWN Damage Up — removing
//        the block drops her total. The block is requiresCore-gated: at scope-lock coreHitRate 1 it
//        fires on every shot (≈ her shot count × 4 allies); forcing coreHitRate 0 must collapse the
//        apply count to ZERO (the requiresCore early-return, sim.ts:1676). A non-core-gated encoding
//        would keep firing at coreHitRate 0 — the discrimination.
//   MR2  "Damage dealt to Shield ▲100.09%" is an OFFENSIVE buff vs an ENEMY shield. The v1 raid boss
//        is partless and never shields, and no shield-damage StatKey exists — genuinely out of domain.
//        Inert; NO behavioural assertion. Pinned only as the two VERBATIM lines in unmodeled.skill1.
//   MR3  self atkPct 30.78 / 5s: applied to mari ALONE (targetIdx == MARI), one per shot, load-bearing
//        (removing it drops her total). A wrong value (lvl-9 17.98) or an all-allies target fails it.
//   MR4  the ally ATK buff is "% of the SKILL USER'S ATK" → casterAtkPct: a FLAT add of
//        (30.78/100)×mari.staticAtk, IDENTICAL for every ally regardless of their own ATK. The nearest
//        wrong model is atkPct 30.78 (a percentage of each TARGET's own ATK). Proven two ways: the
//        shipped stat key is 'casterAtkPct' (not 'atkPct'), and the applied value is the flat constant
//        ≈0.3078×mari.staticAtk (~30.7k), NOT 30.78 — and it is the SAME number on all four allies.
//   MR5  "Gain Pierce for 5 sec" is a TIMED gainPierce window (durationSec 5) on the S2 trigger — the
//        literal encoding now that the gainPierce primitive exists (src/skills/types.ts:274), converged
//        with the cross-family S2b reviewer (claude-fable-5); it replaces an older static hasPierce:true
//        flag whose "no timed-pierce primitive exists" justification went stale. gainPierce emits NO
//        event (it sets pierceUntilFrame directly, sim.ts:2074), so it is pinned by INSPECTION (a skill2
//        gainPierce block, self-targeted, durationSec 5; unmodeled.skill2 now EMPTY) AND behaviourally:
//        removing the block un-tags mari's attacks, her MR1 pierceDamagePct buff goes inert (sim.ts:1402),
//        and her total drops — the pierce grant is load-bearing through MR1. (Under the ⚑ shotFired
//        trigger the 5s window refreshes every ~1.4s pull → ≈100% uptime while she fires; unlike a static
//        flag it also degrades correctly in downtime, so it stays faithful if the ⚑ trigger resolves to a
//        longer interval.)
//   MR6  burst-cast nuke: 639.36% final ATK, burst bucket / srcSlot 'burst', once per cast, and — the
//        cast lands BEFORE the Full Burst window opens — it must NEVER take the +50% FB major (verified
//        fact, 2026-07-13). A lvl-9 magnitude (363.63) counterfactual fails the magnitude pin.
//   MR7  the burst's ally Attack-damage buff is granted in Mari's OWN burst block → burstCast, NOT
//        fullBurstEnter (hard-rule-6: a second B2 in the team must not proc it). Mari is the sole B2 in
//        this fixture, so cast COUNT == Full Burst COUNT; the discrimination is therefore the FRAME SET:
//        shipped applies on her CAST frames (which precede the FB window), a fullBurstEnter counter-
//        factual applies on the FB-START frames — a disjoint set.
//
// TRIGGER ⚑ (documented, NOT pinned as measured): S2's prose carries durations but NO activation
// clause — the trigger is KIT-SILENT. The shipped encoding is shotFired (refresh on every pull →
// near-permanent self atkPct + ally casterAtkPct + Pierce uptime while she fires). The MAGNITUDE /
// STAT / DURATION / TARGET of each S2 line ARE faithful (from the kit text) and pinned below; the
// shotFired TRIGGER is the estimate (a burst-gated reading would cut uptime to ~5s/rotation). MR3/MR4
// pin the shipped shotFired cadence (one apply per mari shot) as the encoding under test.
//
// Fixture: liter (B1) / mari (B2, focused — SR charge weapon ×2.5 gauge so she bursts reliably) /
// ada (B3) / helm (B3) — a legal B1/B2/B3/B3 rotation; boss Fire; the two B3s sustain the chain so
// mari casts ~12×/180s. Deterministic (no seed); event-log assertions over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** slugs: liter 0 / mari 1 / ada 2 / helm 3. */
const MARI = 1;
const N_ALLIES = 4;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(
  overrides: Record<string, any> = {},
  cfgExtra: Record<string, any> = {},
) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['liter', 'mari', 'ada', 'helm'],
    bossElement: 'Fire',
    focusSlug: 'mari',
    overrides,
    cfg: { onEvent: (e) => events.push(e), ...cfgExtra },
  });
  return { events, totals: totals(res), res };
}

// ---- helpers ----------------------------------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);
const buffDurSec = (b: BuffApply) =>
  b.expiresFrame == null ? null : (b.expiresFrame - b.frame) / FPS;

const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const mariShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'mari');
const mariCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'mari',
  );
const mariCastFrames = (evs: SimEvent[]) =>
  mariCasts(evs)
    .map((c) => c.frame)
    .sort((a, b) => a - b);
const fbStartFrames = (evs: SimEvent[]) =>
  evs
    .filter((e) => e.kind === 'fullBurstStart')
    .map((e) => e.frame)
    .sort((a, b) => a - b);
/** Mari's burst-bucket damage is ONLY the cast nuke (her other burst line is a buff). */
const mariNuke = (evs: SimEvent[]) =>
  dmg(evs).filter(
    (d) => d.slug === 'mari' && d.bucket === 'burst' && d.srcSlot === 'burst',
  );
/** Buffs mari applied with the given stat key. */
const mariBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === MARI && b.stat === stat);

// ---- counterfactual patches -------------------------------------------------------------------
/** MR1 reference: S1 Pierce Damage block removed entirely. */
const mariNoPierceBuff = withPatchedOverride('mari', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'pierceDamagePct'));
  if (ov.skill1.length === before)
    throw new Error('mari S1 pierceDamagePct block missing — fixture is stale');
});
/** MR1 counterfactual: the same line at the lvl-9 magnitude (keeps cadence, moves the value). */
const mariPierceLvl9 = withPatchedOverride('mari', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'pierceDamagePct');
  if (!e)
    throw new Error(
      'mari S1 pierceDamagePct effect missing — fixture is stale',
    );
  e.value = 24.25;
});
/** MR3 reference: S2 self ATK block removed. */
const mariNoSelfAtk = withPatchedOverride('mari', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !(b.target?.kind === 'self' && hasStat(b, 'atkPct')),
  );
  if (ov.skill2.length === before)
    throw new Error('mari S2 self atkPct block missing — fixture is stale');
});
/** MR4 counterfactual: the ally ATK buff re-keyed to atkPct (a % of each TARGET's own ATK). */
const mariAllyAtkWrong = withPatchedOverride('mari', (ov) => {
  const e = ov.skill2
    .filter((b: any) => b.target?.kind === 'allies')
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e)
    throw new Error(
      'mari S2 ally casterAtkPct effect missing — fixture is stale',
    );
  e.stat = 'atkPct';
});
/** MR5 counterfactual: the timed Pierce grant removed — un-tags mari's attacks. Tolerant of the
 *  block being absent (the pre-S3 shipped state): then noGainPierce === base and the load-bearing
 *  assertion below fails RED on its own (X > X is false), which IS the "block missing" signal. */
const mariNoGainPierce = withPatchedOverride('mari', (ov) => {
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'gainPierce'),
  );
});
/** MR6 counterfactual: burst nuke at the lvl-9 magnitude. */
const mariBurstLvl9 = withPatchedOverride('mari', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e)
    throw new Error('mari burst flatDamage effect missing — fixture is stale');
  e.atkPct = 363.63;
});
/** MR7 counterfactual: the burst AD buff re-keyed to fullBurstEnter (procs on FB-start frames). */
const mariBurstAdFbEnter = withPatchedOverride('mari', (ov) => {
  const blk = ov.burst.find((b: any) => hasStat(b, 'attackDamagePct'));
  if (!blk)
    throw new Error(
      'mari burst attackDamagePct block missing — fixture is stale',
    );
  blk.trigger = { kind: 'fullBurstEnter' };
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noPierceBuff = run({ mari: mariNoPierceBuff });
const pierceLvl9 = run({ mari: mariPierceLvl9 });
const noSelfAtk = run({ mari: mariNoSelfAtk });
const allyAtkWrong = run({ mari: mariAllyAtkWrong });
const noGainPierce = run({ mari: mariNoGainPierce });
const burstLvl9 = run({ mari: mariBurstLvl9 });
const burstAdFbEnter = run({ mari: mariBurstAdFbEnter });
/** requiresCore probe: identical fight but boss core 0% exposed. */
const core0 = run({}, { coreHitRate: 0 });

/** mari.staticAtk from the base run — the caster the ally ATK buff scales off. */
const MARI_STATIC_ATK = unitOf(base.res, 'mari').staticAtk;

describe('mari — kit spec', () => {
  describe('MR1 — S1 core-hit: Pierce Damage ▲40.99% / 10s to ALL allies (requiresCore)', () => {
    const applied = mariBuffs(base.events, 'pierceDamagePct');

    it('is 40.99% for 10 sec, reaching all four allies (herself included)', () => {
      expect(
        applied.length,
        'no pierceDamagePct buff was applied',
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([40.99]);
      expect([...new Set(applied.map((b) => buffDurSec(b)))]).toEqual([10]);
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual([
        0, 1, 2, 3,
      ]);
    });

    it('fires at her shot cadence (shotFired trigger, core exposed)', () => {
      const shots = mariShots(base.events).length;
      expect(
        applied.length,
        `${applied.length} applies vs ${shots} shots × ${N_ALLIES} allies`,
      ).toBe(shots * N_ALLIES);
    });

    it('DISCRIMINATING (requiresCore): at coreHitRate 0 the block never fires', () => {
      expect(mariBuffs(core0.events, 'pierceDamagePct')).toEqual([]);
      // sanity: she still shoots in the zero-core fight — only the core-gated block is silenced
      expect(mariShots(core0.events).length).toBeGreaterThan(0);
    });

    it('is load-bearing for mari herself (she is Pierce-tagged via MR5, so her own buff feeds her)', () => {
      expect(base.totals.mari).toBeGreaterThan(noPierceBuff.totals.mari);
    });

    it('DISCRIMINATING: a lvl-9 magnitude moves the value to 24.25', () => {
      expect([
        ...new Set(
          mariBuffs(pierceLvl9.events, 'pierceDamagePct').map((b) => b.value),
        ),
      ]).toEqual([24.25]);
    });
  });

  describe('MR2 — S1 full-charge Shield-damage ▲100.09% / 3s is UNMODELED (out of domain)', () => {
    it('is carried VERBATIM in unmodeled.skill1 (the boss never shields; no shield-damage StatKey)', () => {
      const ov = withPatchedOverride('mari', () => {});
      expect((ov as any).unmodeled.skill1).toEqual([
        'Activates when landing a Full Charge attack. Affects all allies.',
        'Damage dealt to Shield ▲ 100.09% for 3 sec.',
      ]);
    });
  });

  describe('MR3 — S2 self: ATK ▲30.78% / 5s (shotFired trigger ⚑)', () => {
    const applied = mariBuffs(base.events, 'atkPct').filter(
      (b) => b.targetIdx === MARI,
    );

    it('is 30.78% for 5 sec, scoped to mari alone', () => {
      expect(applied.length, 'no self atkPct buff was applied').toBeGreaterThan(
        0,
      );
      expect([...new Set(applied.map((b) => b.value))]).toEqual([30.78]);
      expect([...new Set(applied.map((b) => buffDurSec(b)))]).toEqual([5]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([MARI]);
    });

    it('fires once per mari shot (the shipped shotFired cadence)', () => {
      expect(applied.length).toBe(mariShots(base.events).length);
    });

    it('is load-bearing: removing it drops her total', () => {
      expect(base.totals.mari).toBeGreaterThan(noSelfAtk.totals.mari);
    });
  });

  describe("MR4 — S2 allies: ATK ▲30.78% of the SKILL USER'S ATK / 5s (casterAtkPct flat add)", () => {
    const applied = mariBuffs(base.events, 'casterAtkPct');
    const expectedFlat = (30.78 / 100) * MARI_STATIC_ATK;

    it('reaches all four allies for 5 sec, under the casterAtkPct stat key (not atkPct)', () => {
      expect(
        applied.length,
        'no casterAtkPct buff was applied',
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => buffDurSec(b)))]).toEqual([5]);
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual([
        0, 1, 2, 3,
      ]);
      // the same line as atkPct would be a per-target percentage — the encoding under test must NOT be that
      expect(
        mariBuffs(base.events, 'atkPct').filter((b) => b.targetIdx !== MARI),
        'the ally ATK buff must be casterAtkPct, never an all-allies atkPct',
      ).toEqual([]);
    });

    it("is a FLAT add off mari's ATK — the SAME number on every ally, ≈0.3078×staticAtk (not 30.78)", () => {
      const values = [...new Set(applied.map((b) => b.value))];
      expect(
        values.length,
        'casterAtkPct must grant one constant flat value to all allies',
      ).toBe(1);
      expect(values[0]).toBeGreaterThan(1000); // a flat ATK amount, not a percentage
      expect(Math.abs(values[0] - expectedFlat)).toBeLessThan(0.01);
    });

    it('DISCRIMINATING: re-keyed to atkPct it would record 30.78 (a percentage), not the flat constant', () => {
      const wrong = mariBuffs(allyAtkWrong.events, 'atkPct').filter(
        (b) => b.targetIdx !== MARI,
      );
      expect(
        wrong.length,
        'the atkPct counterfactual should apply to the allies',
      ).toBeGreaterThan(0);
      expect([...new Set(wrong.map((b) => b.value))]).toEqual([30.78]);
      expect(mariBuffs(allyAtkWrong.events, 'casterAtkPct')).toEqual([]);
    });
  });

  describe('MR5 — S2 self: "Gain Pierce for 5 sec" → timed gainPierce window (load-bearing via MR1)', () => {
    it('is a self-targeted gainPierce block with a 5 sec window; unmodeled.skill2 is now empty', () => {
      const ov = withPatchedOverride('mari', () => {}) as any;
      const blk = ov.skill2.find((b: any) =>
        b.effects.some((e: any) => e.kind === 'gainPierce'),
      );
      expect(
        blk,
        'no gainPierce block in skill2 — still the stale static hasPierce flag?',
      ).toBeDefined();
      expect(blk.target.kind).toBe('self');
      const eff = blk.effects.find((e: any) => e.kind === 'gainPierce');
      expect(
        eff.durationSec,
        'the kit says "for 5 sec" — the window must be timed, not permanent',
      ).toBe(5);
      // the line is now MODELED, so it must no longer sit in unmodeled
      expect(ov.unmodeled.skill2).toEqual([]);
      // …and the whole-fight boolean flag must be gone (it would over-credit pierce uptime to 100%)
      expect(ov.hasPierce ?? false).toBe(false);
    });

    it("is load-bearing: removing it un-tags mari's attacks and her pierceDamagePct buff goes inert", () => {
      // gainPierce is exactly what makes mari Pierce-tagged (sim.ts:1402/2074); without it the MR1
      // buff she grants herself contributes nothing → her total drops by the pierce Damage-Up bucket.
      expect(base.totals.mari).toBeGreaterThan(noGainPierce.totals.mari);
    });
  });

  describe('MR6 — burst nuke: 639.36% of final ATK to all enemies, cast BEFORE the FB window', () => {
    const nukes = mariNuke(base.events);

    it('fires once per cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(mariCasts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([639.36]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      const took = nukes.filter((d) => d.fbMajorApplied);
      expect(
        took.map((d) => d.sec),
        'burst-cast damage must precede the FB window',
      ).toEqual([]);
    });

    it('DISCRIMINATING: a lvl-9 magnitude moves atkPct to 363.63', () => {
      expect([
        ...new Set(mariNuke(burstLvl9.events).map((d) => d.atkPct)),
      ]).toEqual([363.63]);
    });
  });

  describe('MR7 — burst ally Attack damage ▲40.99% / 10s keys to burstCast, NOT fullBurstEnter', () => {
    const applied = mariBuffs(base.events, 'attackDamagePct');
    const applyFrames = [...new Set(applied.map((b) => b.frame))].sort(
      (a, b) => a - b,
    );

    it('is 40.99% for 10 sec, reaching all four allies', () => {
      expect(
        applied.length,
        'no burst attackDamagePct buff was applied',
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([40.99]);
      expect([...new Set(applied.map((b) => buffDurSec(b)))]).toEqual([10]);
      expect([...new Set(applied.map((b) => b.targetIdx))].sort()).toEqual([
        0, 1, 2, 3,
      ]);
    });

    it('applies on her CAST frames (burstCast), which precede — and are distinct from — the FB-start frames', () => {
      const casts = mariCastFrames(base.events);
      expect(applyFrames).toEqual(casts);
      expect(applyFrames).not.toEqual(fbStartFrames(base.events));
    });

    it('DISCRIMINATING: fullBurstEnter would apply on the FB-START frames, a disjoint set', () => {
      const cfFrames = [
        ...new Set(
          mariBuffs(burstAdFbEnter.events, 'attackDamagePct').map(
            (b) => b.frame,
          ),
        ),
      ].sort((a, b) => a - b);
      expect(cfFrames).toEqual(fbStartFrames(burstAdFbEnter.events));
      expect(cfFrames).not.toEqual(mariCastFrames(burstAdFbEnter.events));
    });
  });
});
