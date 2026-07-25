// PER-UNIT KIT SPEC — `delta-ninja-thief` (Delta: Ninja Thief — Defender/MG/Water, Burst II, cd 40s,
// ammo 300, reloadFrames 171). The VARIANT; its base counterpart is `delta` (SR/Wind) — never conflate.
// Kit-autonomy gauntlet 2026-07-25 (test-first re-derivation; validates the prior PARSER-BASELINE
// hypothesis that shipped as src/skills/overrides/delta-ninja-thief.json).
//
// One assertion group per DAMAGE-RELEVANT kit line (H1..H5), asserted against the SHIPPED override
// loaded from disk. `withPatchedOverride` appears ONLY to build COUNTERFACTUALS (the nearest wrong
// model each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['delta-ninja-thief'].skills):
//   S1 ■ entering Full Burst → all enemies: Damage Taken ▲12% for 15 sec        [H1] (fullBurstEnter)
//      ■ using Burst Skill → self: ATK ▲15.04% for 10 sec                        [H2] (burstCast)
//      ■ using Burst Skill → nearest-crosshair enemy: Damage Taken ▲8% for 10 sec [H3] (burstCast)
//   S2 formation-branched Defender kit — see INERT note below (no damage assertion)
//   BU ■ all allies: Distributed Damage ▲20% / ATK ▲15% of caster ATK, 10 sec    [H4] (burstCast)
//      ■ all enemies: 170% of final ATK as DISTRIBUTED damage                    [H5] (burstCast)
//      ■ self riders (Next shield HP ▲20.13% / Max IFAK accumulation ▲20.13%) — INERT, unmodeled
//
// WHY EACH ASSERTION DISCRIMINATES (a test that cannot fail under the nearest wrong model gates nothing):
//   H1  the 12% debuff is a fullBurstEnter line: it lands on the FB-START frame (344…), NOT on her
//       cast frame (292…). The nearest wrong model is burstCast (conflating it with H3) — proven by
//       re-triggering it on burstCast and watching the debuff jump onto the cast frames. Load-bearing
//       for the WHOLE team: removing it drops every ally's total (boss takes 12% less during FB).
//   H2  a self-scoped atkPct: removing it moves ONLY her total, liter/helm byte-identical. Value 15.04
//       (the kit number), 10s, once per cast.
//   H3  the 8% debuff is a burstCast line: it lands on her CAST frame, distinct from H1's FB-start
//       frame. Nearest wrong = removing it → the burst nuke's `taken` multiplier collapses 1.08→1.0
//       (the cast lands before FB opens, so the nuke sees the 8% but NOT the 12%).
//   H4  +20% distributed damage + a FLAT caster-ATK add (casterAtkPct, not a % atkPct) to all 3 allies,
//       10s. The +20% is live: her own distributed nuke picks it up SAME CAST (mult.distributed 1.2);
//       removing the buff collapses it to 1.0.
//   H5  170% distributed nuke, burst bucket, once per cast, FB-EXEMPT (cast precedes the FB window, so
//       fbMajorApplied is never true). Distributed flavor proven by collapsing mult.distributed 1.2→1.0
//       when the flavor is stripped.
//
// INERT — skill2 (no assertion, by design): the Defender-count formation branch is entirely
// DEFENSIVE / event-only. SOLO-defender branch: battle-start + every-200-hits self SHIELDS (12.25% Max
// HP) + Attract/Taunt. WITH-DEFENDER branch: Ninjutsu Camouflage (single-target immunity) + Injection
// lifesteal + the Ninjutsu-IFAK all-ally heal. The engine has NO shield/heal HP pool and emits NO
// shielded/recovery SimEvent, so none of skill2 is observable from the log or moves a single damage
// point — and the partless scope-lock boss is unaffected by taunt/camouflage. The shield-size and
// IFAK-accumulation ▲20.13% burst riders scale those unmodeled magnitudes, so they are inert too.
// All of these are carried VERBATIM in the override's `unmodeled` (skill2: Attract/Camouflage/IFAK
// 4s duration/IFAK 165.28%-ATK cap; burst: the two ▲20.13% riders). MODE NOTE: the override's default
// mode is the solo-defender branch (no other Defender in this fixture); skill2 contributes nothing
// here regardless of branch.
//
// ⚑ NEEDS-MEASUREMENT (carried in the override note, not assertable from the log):
//   (1) CADENCE TUPLE [mandatory] — MG rate-of-fire wind-up ladder + reloadFrames 171 + rolling-reload;
//       estimate = datamine as-is; recipe = rounds/min + reload gap from a focused dnt video.
//   (2) IFAK heal cadence — the hitCount-200 proxy for "every 4 sec" (with-defender mode only); matters
//       solely as a teammate recovery-consumer trigger; recipe = time the IFAK ticks in a 2-Defender clip.
//   (3) formation-mode default — solo-defender assumed for the control team; a second Defender flips the
//       branch (shields/taunt OFF, Injection+IFAK ON); recipe = select the mode per actual comp.
//
// Fixture: liter (B1) / delta-ninja-thief (B2) / helm (B3), boss Fire (dnt is Water → clean ×1.10
// advantage), focus helm. dnt is the SOLE Burst II unit, so she casts in EVERY Full Burst cycle — the
// minimal clean chain that exercises her burst-gated lines deterministically (no seed). 5 casts / 5 FB
// windows over 180s.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['liter', 'delta-ninja-thief', 'helm'];
/** slot order above: liter 0 / delta-ninja-thief 1 / helm 2. */
const DNT = 1;
const ALLIES = new Set([0, 1, 2]);

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: SLUGS,
    bossElement: 'Fire',
    focusSlug: 'helm',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches (nearest wrong model each group must discriminate) -----------------
const hasStat = (b: any, stat: string) => b.effects.some((e: any) => e.stat === stat);
const hasKind = (b: any, kind: string) => b.effects.some((e: any) => e.kind === kind);

/** H1 reference: the 12% FB-entry Acid Bomb removed entirely. */
const dntNoAcidFB = withPatchedOverride('delta-ninja-thief', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !(b.trigger.kind === 'fullBurstEnter' && hasStat(b, 'damageTakenPct')),
  );
  if (ov.skill1.length === before) throw new Error('dnt S1 fullBurstEnter damageTakenPct missing — fixture is stale');
});
/** H1 counterfactual: the same 12% line re-triggered on burstCast (the nearest wrong trigger). */
const dntAcidFBAsBurstCast = withPatchedOverride('delta-ninja-thief', (ov) => {
  const b = ov.skill1.find((b: any) => b.trigger.kind === 'fullBurstEnter' && hasStat(b, 'damageTakenPct'));
  if (!b) throw new Error('dnt S1 fullBurstEnter damageTakenPct missing — fixture is stale');
  b.trigger.kind = 'burstCast';
});
/** H2 reference: her self ATK buff removed. */
const dntNoSelfAtk = withPatchedOverride('delta-ninja-thief', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !(b.target.kind === 'self' && hasStat(b, 'atkPct')));
  if (ov.skill1.length === before) throw new Error('dnt S1 self atkPct missing — fixture is stale');
});
/** H3 reference: the 8% burst-cast Acid Bomb removed. */
const dntNoAcidCast = withPatchedOverride('delta-ninja-thief', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !(b.trigger.kind === 'burstCast' && b.target.kind === 'enemy' && hasStat(b, 'damageTakenPct')),
  );
  if (ov.skill1.length === before) throw new Error('dnt S1 burstCast damageTakenPct missing — fixture is stale');
});
/** H4 reference: the +20% distributed-damage team buff removed. */
const dntNoDistBuff = withPatchedOverride('delta-ninja-thief', (ov) => {
  const b = ov.burst.find((b: any) => hasStat(b, 'distributedDamagePct'));
  if (!b) throw new Error('dnt burst distributedDamagePct missing — fixture is stale');
  b.effects = b.effects.filter((e: any) => e.stat !== 'distributedDamagePct');
});
/** H5 counterfactual: the nuke's distributed flavor stripped (nearest wrong flavor). */
const dntNukeNotDist = withPatchedOverride('delta-ninja-thief', (ov) => {
  const b = ov.burst.find((b: any) => hasKind(b, 'flatDamage'));
  if (!b) throw new Error('dnt burst flatDamage missing — fixture is stale');
  const e = b.effects.find((e: any) => e.kind === 'flatDamage');
  delete e.flavor;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noAcidFB = run({ 'delta-ninja-thief': dntNoAcidFB });
const acidFBAsBurstCast = run({ 'delta-ninja-thief': dntAcidFBAsBurstCast });
const noSelfAtk = run({ 'delta-ninja-thief': dntNoSelfAtk });
const noAcidCast = run({ 'delta-ninja-thief': dntNoAcidCast });
const noDistBuff = run({ 'delta-ninja-thief': dntNoDistBuff });
const nukeNotDist = run({ 'delta-ninja-thief': dntNukeNotDist });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) => evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const dmg = (evs: SimEvent[]) => evs.filter((e): e is Damage => e.kind === 'damage');
const dntBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'delta-ninja-thief');
const fbStartFrames = (evs: SimEvent[]) =>
  new Set(evs.filter((e) => e.kind === 'fullBurstStart').map((e) => e.frame));
const castFrames = (evs: SimEvent[]) => new Set(dntBursts(evs).map((c) => c.frame));
/** Boss debuffs (targetIdx null = the boss) of a given damageTakenPct value. */
const bossTaken = (evs: SimEvent[], value: number) =>
  buffs(evs).filter((b) => b.stat === 'damageTakenPct' && b.targetIdx === null && b.value === value);
const dntNuke = (evs: SimEvent[]) => dmg(evs).filter((d) => d.slug === 'delta-ninja-thief' && d.srcSlot === 'burst');

describe('delta-ninja-thief (Delta: Ninja Thief) — kit spec', () => {
  describe('H1 — S1 Ninjutsu Acid Bomb: boss Damage Taken ▲12% for 15s on FULL BURST ENTRY', () => {
    const taken12 = bossTaken(base.events, 12);

    it('applies a 12% damage-taken debuff to the boss for exactly 15s, once per FB', () => {
      expect(taken12.length).toBe(fbStartFrames(base.events).size);
      expect(taken12.length).toBeGreaterThan(0);
      for (const b of taken12) expect(b.expiresFrame! - b.frame).toBe(15 * FPS);
    });

    it('fires on Full Burst ENTRY (its frame is a fullBurstStart frame, not her cast frame)', () => {
      const fb = fbStartFrames(base.events);
      const casts = castFrames(base.events);
      for (const b of taken12) {
        expect(fb.has(b.frame), `12% debuff at frame ${b.frame} is not a FB-start frame`).toBe(true);
        expect(casts.has(b.frame), `12% debuff at frame ${b.frame} sits on her cast — that is burstCast, not fullBurstEnter`).toBe(false);
      }
    });

    it('DISCRIMINATING: a burstCast trigger would land the 12% on her cast frames instead', () => {
      const casts = castFrames(acidFBAsBurstCast.events);
      const moved = bossTaken(acidFBAsBurstCast.events, 12);
      expect(moved.length).toBeGreaterThan(0);
      for (const b of moved) {
        expect(casts.has(b.frame), `counterfactual 12% debuff at ${b.frame} should sit on a cast frame`).toBe(true);
        expect(fbStartFrames(acidFBAsBurstCast.events).has(b.frame)).toBe(false);
      }
    });

    it('is load-bearing for the WHOLE team (boss takes 12% more during every FB window)', () => {
      for (const s of SLUGS) {
        expect(base.totals[s], `${s} total must drop without the 12% FB debuff`).toBeGreaterThan(noAcidFB.totals[s]);
      }
    });
  });

  describe('H2 — S1 self ATK ▲15.04% for 10s on BURST CAST (self-scoped)', () => {
    const selfAtk = buffs(base.events).filter(
      (b) => b.stat === 'atkPct' && b.casterIdx === DNT && b.targetIdx === DNT,
    );

    it('is 15.04% to herself for 10s, once per burst cast', () => {
      expect(selfAtk.length).toBe(dntBursts(base.events).length);
      expect(selfAtk.length).toBeGreaterThan(0);
      expect([...new Set(selfAtk.map((b) => b.value))]).toEqual([15.04]);
      for (const b of selfAtk) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('DISCRIMINATING: removing it lowers ONLY her own total (liter/helm byte-identical)', () => {
      expect(base.totals['delta-ninja-thief']).toBeGreaterThan(noSelfAtk.totals['delta-ninja-thief']);
      expect(base.totals.liter).toBe(noSelfAtk.totals.liter);
      expect(base.totals.helm).toBe(noSelfAtk.totals.helm);
    });
  });

  describe('H3 — S1 Ninjutsu Hyper Acid Bomb: boss Damage Taken ▲8% for 10s on BURST CAST', () => {
    const taken8 = bossTaken(base.events, 8);

    it('applies an 8% damage-taken debuff to the boss for exactly 10s', () => {
      expect(taken8.length).toBe(dntBursts(base.events).length);
      expect(taken8.length).toBeGreaterThan(0);
      for (const b of taken8) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('fires on her BURST CAST (its frame is a cast frame), distinct from the 12% FB-entry debuff', () => {
      const casts = castFrames(base.events);
      for (const b of taken8) expect(casts.has(b.frame), `8% debuff at ${b.frame} is not a cast frame`).toBe(true);
    });

    it('DISCRIMINATING: removing it collapses the burst nuke\'s taken multiplier 1.08 → 1.0', () => {
      expect([...new Set(dntNuke(base.events).map((d) => d.mult.taken.toFixed(4)))]).toEqual(['1.0800']);
      expect([...new Set(dntNuke(noAcidCast.events).map((d) => d.mult.taken.toFixed(4)))]).toEqual(['1.0000']);
    });
  });

  describe('H4 — Burst: all allies Distributed Damage ▲20% + ATK ▲15% of caster ATK for 10s', () => {
    const dist = buffs(base.events).filter((b) => b.stat === 'distributedDamagePct' && b.casterIdx === DNT);
    const casterAtk = buffs(base.events).filter((b) => b.stat === 'casterAtkPct' && b.casterIdx === DNT);
    const perCast = dntBursts(base.events).length * SLUGS.length;

    it('grants +20% distributed damage to ALL allies for 10s, once per cast', () => {
      expect(dist.length).toBe(perCast);
      expect([...new Set(dist.map((b) => b.value))]).toEqual([20]);
      expect(new Set(dist.map((b) => b.targetIdx))).toEqual(ALLIES);
      for (const b of dist) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('grants a FLAT caster-ATK add (casterAtkPct, not a % atkPct) to all allies for 10s', () => {
      expect(casterAtk.length).toBe(perCast);
      expect(new Set(casterAtk.map((b) => b.targetIdx))).toEqual(ALLIES);
      const vals = [...new Set(casterAtk.map((b) => b.value))];
      expect(vals.length, 'every ally receives the same flat caster-ATK amount').toBe(1);
      expect(vals[0], 'a flat ATK magnitude (15% of her ATK), not the 15 percentage').toBeGreaterThan(1000);
      for (const b of casterAtk) expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    });

    it('DISCRIMINATING: the +20% is live — her distributed nuke picks it up same cast (1.2 → 1.0 without)', () => {
      expect([...new Set(dntNuke(base.events).map((d) => d.mult.distributed.toFixed(4)))]).toEqual(['1.2000']);
      expect([...new Set(dntNuke(noDistBuff.events).map((d) => d.mult.distributed.toFixed(4)))]).toEqual(['1.0000']);
    });
  });

  describe('H5 — Burst: 170% of final ATK as DISTRIBUTED damage to the boss', () => {
    const nukes = dntNuke(base.events);

    it('fires once per cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(dntBursts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([170]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('is FB-exempt (the cast lands before the Full Burst window opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied).map((d) => d.sec)).toEqual([]);
    });

    it('is DISTRIBUTED-flavored (picks up her own +20% distributed buff on the same cast)', () => {
      expect([...new Set(nukes.map((d) => d.mult.distributed.toFixed(4)))]).toEqual(['1.2000']);
    });

    it('DISCRIMINATING: stripping the distributed flavor collapses the multiplier to 1.0', () => {
      expect([...new Set(dntNuke(nukeNotDist.events).map((d) => d.mult.distributed.toFixed(4)))]).toEqual(['1.0000']);
    });
  });
});
