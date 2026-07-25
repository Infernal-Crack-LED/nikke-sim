// PER-UNIT KIT SPEC — `volume` (Volume, Attacker/SMG/Wind, Burst I, cd 20s, ammo 120, hitsPerShot 1).
// Kit-autonomy gauntlet 2026-07-24 (driver-authored S2a; tests FIRST; reconciled vs blind S2b fable).
//
// One assertion group per KIT LINE (V1..V4), asserted against the override loaded from disk.
// `withPatchedOverride` builds COUNTERFACTUALS only (the nearest-wrong reading each assertion must
// discriminate against) — never the encoding under test.
//
// Kit (data/characters.json → characters.volume.skills):
//   S1 ■ Affects self when killing an enemy: ATK ▲12.6% for 5 sec                  (UNMODELED)  [V1]
//   S2 ■ entering Full Burst → all allies: Cooldown of Burst Skill ▼ 2.34 / 2.7 / 3.17 sec      [V2]
//         (escalating — "Each subsequent effect triggers all effects before it")
//      ■ using Burst Skill → all allies: Critical Damage ▲ 10.77 / 12.46 / 14.42% for 5 sec     [V3]
//         (escalating — same "triggers all before it" ladder)
//   BU ■ Affects all allies: Critical Rate ▲31.9% for 5 sec                                      [V4]
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong gates nothing):
//   V1  "when killing an enemy" is KILL-GATED — the scope-lock partless raid boss NEVER dies mid-fight,
//       so the trigger can never fire and the line is a sanctioned UNMODELED skip (not a passive ATK the
//       kit never grants). PIN the absence: ZERO atkPct buffApply from Volume in the base run. Nearest-wrong:
//       the pre-gauntlet materialized misread — a PASSIVE permanent self atkPct 12.6 (a +12.6% ATK the kit
//       does not give vs an immortal boss). GREEN vs shipped (skill1 empty → 0 buffs), RED vs the passive
//       counterfactual (1 permanent self buff) — so the absence is a real, non-vacuous claim.
//   V2  "Cooldown of Burst Skill ▼" is a `burstCdr` effect (sim.ts:2047) — it directly refunds ally burst
//       cooldown frames and emits NO buffApply event, so it is observable only through its EFFECT: the team
//       (Volume is an ally target of her own CDR) bursts SOONER. fullBurstEnter trigger (fires on every TEAM
//       FB entry = 5×) vs nearest-wrong burstCast (fires on Volume's OWN 10 casts). Two discriminations:
//       (a) FIRE-RATE / modeled≠working — removing the block drops Volume's own cast count (10 → 9): the block
//           is present AND working, not an inert encoding. (b) TRIGGER IDENTITY — re-keying it to burstCast
//           over-applies the refund (10 activations vs 5) and over-accelerates her cadence (10 → 13 casts):
//           the cadence under fullBurstEnter is provably distinct from burstCast. The escalating ladder
//           (2.34 → +2.7 → +3.17, "triggers all before it") is the engine's `escalating` case (sim.ts:2056,
//           steps.slice(0, activations)); the per-tier refund magnitude is a CDR value taken from the prose's
//           own numbers (DATAMINED) — the fire-rate check proves the block activates and targets allies.
//   V3  burstCast → allies → ESCALATING critDamagePct [10.77, 12.46, 14.42], 5s. The escalating semantics are
//       exact and observable: step i applies from the (i+1)th activation, so per target the counts are
//       casts / casts-1 / casts-2 (10 / 9 / 8 here) — "each subsequent effect triggers all before it", each
//       step a DISTINCT buff key (sim.ts:2056 `${key}:sN`) so from the 3rd cast all three coexist and SUM
//       (+37.65% team crit damage), no overwrite. Nearest-wrong (a): a NON-escalating "always max" encoding
//       (single 14.42 buff) — then 10.77/12.46 never appear and 14.42 fires every cast. Nearest-wrong (b):
//       fullBurstEnter trigger (5×/target) instead of burstCast (10×/target). Both discriminated.
//   V4  burstCast → allies → generic critRatePct 31.9, 5s. Plain "Critical Rate ▲" = generic critRatePct
//       (lifts crit on EVERY bucket), NOT the scoped critRateNormalPct. Nearest-wrong (a): fullBurstEnter
//       trigger (5×/target) instead of burstCast (10×/target). Nearest-wrong (b): scoped critRateNormalPct —
//       leaves the team's skill/burst bucket crit rates UNCHANGED while the generic model lifts them. Both
//       discriminated; the buff also never lands on the boss (ally buff, targetIdx != null).
//
// Fixture: Volume is Burst I, so a custom sole-B1 comp [volume(B1) / crown(B2) / helm(B3)] is used (NOT
// controlComp, which would add liter as a second B1). Volume is the sole Burst I → she casts every Full Burst
// cycle (10 casts over 180s) while the team completes 5 Full Bursts — so burstCast (10) ≠ fullBurstEnter (5),
// which is what lets the trigger-identity assertions discriminate by count. Boss Iron (Volume is Wind → clean
// ×1.10 advantaged; crown/helm neutral — irrelevant, every assertion filters on casterIdx === VOLUME). Focus
// Volume. Deterministic (no seed). Slot order: volume 0 / crown 1 / helm 2.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const VOL = 0;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

const FIXTURE = {
  slugs: ['volume', 'crown', 'helm'] as string[],
  bossElement: 'Iron' as const,
  focusSlug: 'volume',
};

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({ ...FIXTURE, overrides, cfg: { onEvent: (e) => events.push(e) } });
  return { events };
}

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) => evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const volBuffs = (evs: SimEvent[], stat: string, value: number) =>
  buffs(evs).filter((b) => b.casterIdx === VOL && b.stat === stat && b.value === value);
const perTarget = (bs: BuffApply[], tgt: number) => bs.filter((b) => b.targetIdx === tgt);
const volBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'volume');
const fbStarts = (evs: SimEvent[]) => evs.filter((e) => e.kind === 'fullBurstStart');

/** Distinct crit rates seen per unit on the given buckets — the V4 scope discriminator. */
function critRatesByUnit(
  evs: SimEvent[],
  buckets: Damage['bucket'][],
): Record<string, string> {
  const out: Record<string, Set<string>> = {};
  for (const d of evs.filter((e): e is Damage => e.kind === 'damage')) {
    if (!buckets.includes(d.bucket)) continue;
    (out[d.slug] ??= new Set()).add(d.critRate.toFixed(9));
  }
  return Object.fromEntries(
    Object.entries(out).map(([k, v]) => [k, [...v].sort().join(',')]),
  );
}

// ---- counterfactual patches (nearest-wrong readings) -----------------------------------------
/** V1 nearest-wrong: the kill-gated ATK as a PASSIVE permanent self atkPct 12.6 (the pre-gauntlet misread). */
const cfS1Passive = withPatchedOverride('volume', (ov: any) => {
  ov.skill1 = [
    {
      slot: 'skill1',
      trigger: { kind: 'passive' },
      target: { kind: 'self' },
      effects: [{ kind: 'buff', stat: 'atkPct', value: 12.6 }],
    },
  ];
});
/** The skill2 fullBurstEnter escalating-burstCdr block (V2 under test). */
const isCdrBlock = (b: any) =>
  b.trigger?.kind === 'fullBurstEnter' &&
  b.effects?.some(
    (e: any) => e.kind === 'escalating' && e.steps?.some((s: any) => s.kind === 'burstCdr'),
  );
/** V2 nearest-wrong (fire-rate): the burstCdr block removed entirely (an inert/absent encoding). */
const cfNoCdr = withPatchedOverride('volume', (ov: any) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !isCdrBlock(b));
  if (ov.skill2.length === before)
    throw new Error('volume S2 burstCdr block missing — fixture is stale');
});
/** V2 nearest-wrong (trigger): the burstCdr block re-keyed fullBurstEnter → burstCast (over-applies the refund). */
const cfCdrBurstCast = withPatchedOverride('volume', (ov: any) => {
  let hit = 0;
  for (const b of ov.skill2) if (isCdrBlock(b)) (b.trigger = { kind: 'burstCast' }), hit++;
  if (!hit) throw new Error('volume S2 burstCdr block missing — fixture is stale');
});
/** The skill2 burstCast escalating-critDamage block (V3 under test). */
const isCdBlock = (b: any) =>
  b.trigger?.kind === 'burstCast' &&
  b.effects?.some(
    (e: any) => e.kind === 'escalating' && e.steps?.some((s: any) => s.stat === 'critDamagePct'),
  );
/** V3 nearest-wrong (trigger): the critDamage ladder re-keyed burstCast → fullBurstEnter (5×/target not 10×). */
const cfCdFbEnter = withPatchedOverride('volume', (ov: any) => {
  let hit = 0;
  for (const b of ov.skill2) if (isCdBlock(b)) (b.trigger = { kind: 'fullBurstEnter' }), hit++;
  if (!hit) throw new Error('volume S2 critDamage block missing — fixture is stale');
});
/** V3 nearest-wrong (escalating): the ladder collapsed to a single "always max" 14.42% buff. */
const cfCdNoEscalate = withPatchedOverride('volume', (ov: any) => {
  const b = ov.skill2.find((x: any) => isCdBlock(x));
  if (!b) throw new Error('volume S2 critDamage block missing — fixture is stale');
  b.effects = [{ kind: 'buff', stat: 'critDamagePct', value: 14.42, durationSec: 5 }];
});
/** V4 nearest-wrong (trigger): the burst critRate re-keyed burstCast → fullBurstEnter (5×/target not 10×). */
const cfCrFbEnter = withPatchedOverride('volume', (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects?.some((e: any) => e.stat === 'critRatePct' && e.value === 31.9),
  );
  if (!b) throw new Error('volume burst critRate block missing — fixture is stale');
  b.trigger = { kind: 'fullBurstEnter' };
});
/** V4 nearest-wrong (scope): the 31.9% crit as scoped critRateNormalPct (normal attacks only). */
const cfCrScoped = withPatchedOverride('volume', (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects?.some((e: any) => e.stat === 'critRatePct' && e.value === 31.9),
  );
  if (!b) throw new Error('volume burst critRate block missing — fixture is stale');
  b.effects.find((e: any) => e.stat === 'critRatePct' && e.value === 31.9).stat =
    'critRateNormalPct';
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const s1Passive = run({ volume: cfS1Passive });
const noCdr = run({ volume: cfNoCdr });
const cdrBurstCast = run({ volume: cfCdrBurstCast });
const cdFbEnter = run({ volume: cfCdFbEnter });
const cdNoEscalate = run({ volume: cfCdNoEscalate });
const crFbEnter = run({ volume: cfCrFbEnter });
const crScoped = run({ volume: cfCrScoped });

const casts = volBursts(base.events).length; // Volume's burst casts (10)
const fbs = fbStarts(base.events).length; // team Full Bursts (5)

describe('volume — kit spec', () => {
  describe('fixture sanity — Volume casts her burst and the team reaches Full Burst', () => {
    it('Volume casts >0 bursts and the team completes >0 Full Bursts (burst-gated lines are not vacuous)', () => {
      expect(casts).toBeGreaterThan(0);
      expect(fbs).toBeGreaterThan(0);
      // sole-B1 comp: Volume casts every cycle, so she casts at least as often as the team FBs
      expect(casts).toBeGreaterThanOrEqual(fbs);
    });
  });

  describe('V1 — S1 kill-gated ATK ▲12.6% is UNMODELED (the boss never dies; no self ATK buff ever fires)', () => {
    it('PIN: Volume applies ZERO atkPct buffs (the kill-gated line can never fire vs the partless boss)', () => {
      expect(volBuffs(base.events, 'atkPct', 12.6).length).toBe(0);
      // no atkPct buff of ANY value from Volume — her kit grants no ATK against an immortal boss
      expect(buffs(base.events).filter((b) => b.casterIdx === VOL && b.stat === 'atkPct').length).toBe(0);
    });
    it('DISCRIMINATING: a passive permanent self ATK 12.6 (nearest-wrong) WOULD apply a buff', () => {
      const cf = volBuffs(s1Passive.events, 'atkPct', 12.6);
      expect(cf.length).toBeGreaterThan(0);
      // the misread is a PERMANENT self buff (no expiry) on Volume herself (targetIdx 0)
      expect([...new Set(cf.map((b) => b.expiresFrame))]).toEqual([null]);
      expect([...new Set(cf.map((b) => b.targetIdx))]).toEqual([VOL]);
    });
  });

  describe('V2 — S2 FB-enter Cooldown of Burst Skill ▼ 2.34/2.7/3.17 sec (escalating burstCdr), all allies', () => {
    it('FIRE-RATE: the burstCdr block is present AND working — removing it slows Volume\'s own burst cadence', () => {
      // burstCdr emits no event; observe its effect: Volume is an ally target of her own CDR, so with the
      // block she casts more often over 180s than without it (deterministic: 10 vs 9).
      expect(volBursts(base.events).length).toBeGreaterThan(volBursts(noCdr.events).length);
    });
    it('DISCRIMINATING (trigger): fullBurstEnter (5 activations) ≠ burstCast (10) — burstCast over-accelerates', () => {
      // re-keying the refund to burstCast applies it twice as often → strictly more Volume casts than the
      // faithful fullBurstEnter keying, so the two triggers are provably distinct.
      expect(volBursts(cdrBurstCast.events).length).toBeGreaterThan(volBursts(base.events).length);
      expect(volBursts(cdrBurstCast.events).length).not.toBe(volBursts(base.events).length);
    });
  });

  describe('V3 — S2 burst-cast Critical Damage ▲ 10.77/12.46/14.42% for 5 sec (escalating), all allies', () => {
    const c10 = volBuffs(base.events, 'critDamagePct', 10.77);
    const c12 = volBuffs(base.events, 'critDamagePct', 12.46);
    const c14 = volBuffs(base.events, 'critDamagePct', 14.42);
    it('escalating ladder: step i applies from the (i+1)th cast → per-target counts casts / casts-1 / casts-2', () => {
      // "Each subsequent effect triggers all effects before it": 10.77 fires every cast, 12.46 from the 2nd,
      // 14.42 from the 3rd. Exact, derived from the escalating semantics (sim.ts:2056), not hard-coded.
      expect(perTarget(c10, VOL).length).toBe(casts);
      expect(perTarget(c12, VOL).length).toBe(casts - 1);
      expect(perTarget(c14, VOL).length).toBe(casts - 2);
    });
    it('each step is a distinct 5-second buff reaching all three allies (they coexist + sum, no overwrite)', () => {
      for (const c of [c10, c12, c14]) {
        expect(c.length).toBeGreaterThan(0);
        expect([...new Set(c.map((b) => b.expiresFrame! - b.frame))]).toEqual([5 * FPS]);
        for (const tgt of [0, 1, 2]) expect(perTarget(c, tgt).length).toBeGreaterThan(0);
      }
      // distinct buff keys → the three steps stack rather than overwrite one another
      expect(new Set([...c10, ...c12, ...c14].map((b) => b.key)).size).toBe(3);
    });
    it('DISCRIMINATING (escalating): a non-escalating "always max 14.42" encoding drops the 10.77/12.46 steps', () => {
      expect(volBuffs(cdNoEscalate.events, 'critDamagePct', 10.77).length).toBe(0);
      expect(volBuffs(cdNoEscalate.events, 'critDamagePct', 12.46).length).toBe(0);
      // …and fires 14.42 on EVERY cast (no ramp), unlike the faithful 8×/target
      expect(perTarget(volBuffs(cdNoEscalate.events, 'critDamagePct', 14.42), VOL).length).toBe(casts);
    });
    it('DISCRIMINATING (trigger): keyed to burstCast (casts/target), NOT fullBurstEnter (fbs/target)', () => {
      expect(perTarget(volBuffs(cdFbEnter.events, 'critDamagePct', 10.77), VOL).length).toBe(fbs);
      expect(perTarget(volBuffs(cdFbEnter.events, 'critDamagePct', 10.77), VOL).length).not.toBe(casts);
    });
  });

  describe('V4 — burst Critical Rate ▲31.9% for 5 sec is GENERIC (unscoped), all allies, on BURST CAST', () => {
    const applied = volBuffs(base.events, 'critRatePct', 31.9);
    it('is the generic critRatePct stat, 5s, once per Volume burst cast, reaching all three allies (never the boss)', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.stat))]).toEqual(['critRatePct']);
      expect([...new Set(applied.map((b) => b.expiresFrame! - b.frame))]).toEqual([5 * FPS]);
      expect(perTarget(applied, VOL).length).toBe(casts);
      for (const tgt of [0, 1, 2]) expect(perTarget(applied, tgt).length).toBe(casts);
      // ally buff, never a boss debuff
      expect(applied.every((b) => b.targetIdx != null)).toBe(true);
    });
    it('DISCRIMINATING (trigger): keyed to burstCast (casts/target), NOT fullBurstEnter (fbs/target)', () => {
      expect(perTarget(volBuffs(crFbEnter.events, 'critRatePct', 31.9), VOL).length).toBe(fbs);
      expect(perTarget(volBuffs(crFbEnter.events, 'critRatePct', 31.9), VOL).length).not.toBe(casts);
    });
    it('DISCRIMINATING (scope): a scoped critRateNormalPct would leave skill/burst bucket crit UNCHANGED', () => {
      expect(critRatesByUnit(base.events, ['skill', 'burst'])).not.toEqual(
        critRatesByUnit(crScoped.events, ['skill', 'burst']),
      );
      expect(volBuffs(crScoped.events, 'critRatePct', 31.9).length).toBe(0);
    });
  });
});
