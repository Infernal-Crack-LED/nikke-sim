// PER-UNIT KIT SPEC — `helm-aquamarine` (Helm: Aquamarine, Attacker/AR/Iron, Burst II, cd 20s,
// ammo 60, reloadFrames 81, hitsPerShot 1, normalMult 13.65 / coreMult 200, no charge, critRate 15 /
// critDamage 150). Kit-autonomy gauntlet 2026-07-25 (driver-authored S2a; tests FIRST).
//
// P0 DISAMBIGUATION: this is `helm-aquamarine` (AR/Iron/Attacker/Burst II, aka "shelm"/"ha") — a
// COMPLETELY DIFFERENT unit from base `helm` (SR/Water/Attacker/Burst III, aka "thelm"). No base-helm
// data, recordings, or encoding are cited or reused here; every magnitude below is read off
// characters['helm-aquamarine'] only. (Base `helm` appears in the fixture ONLY as a Burst III rotation
// partner so this Burst II unit can complete a chain — its kit is irrelevant; every assertion filters
// on slug === 'helm-aquamarine'.) The slug-disambiguation lint flags the bare slug "helm-aquamarine"
// (its "helm-" prefix matches the ambiguous base) — a known false positive; the full name and approved
// nicknames pass clean and there is no conflation.
//
// One assertion group per KIT LINE (HA1..HA6 below), asserted against the SHIPPED override loaded from
// disk. `withPatchedOverride` builds COUNTERFACTUALS only (the nearest-wrong reading each assertion must
// discriminate against) — never the encoding under test.
//
// Kit (data/characters.json → characters['helm-aquamarine'].skills, levels 10/10/10 — the normalized
// `skills` prose is the SSOT):
//   S1 ■ after landing 30 normal attacks → target: 131.34% of final ATK additional damage (recurring)   [HA1]
//      ■ entering Full Burst → all allies: Cooldown of Burst Skill ▼ 1.82 / 2.2 / 2.6 sec               [HA2]
//        (escalating — "Each subsequent effect triggers all effects before it")
//   S2 ■ Affects 1 enemy randomly: 105.58% of final ATK damage (NO kit-stated trigger → datamined 4s CD) [HA3]
//      ■ when attacking an Electric Code target → target: Damage Taken ▲5.64% ×5 stacks / 5s (= 28.2)    [HA4]
//   BU ■ all enemies: 164.83% of final ATK Burst Skill damage                                            [HA5]
//      ■ when attacking an Electric Code target → target: 164.83% of final ATK additional damage         [HA6]
//
// SCOPE-LOCK CONTEXT: the validation boss is NOT Electric, so the two "Electric Code target" lines
// (HA4 damageTaken, HA6 extra burst hit) are faithfully INERT there (Iron is element-advantaged vs
// Electric — this is an anti-Electric kit; the engine's ×1.10 element major + both gates all wake vs an
// Electric boss). The test pins BOTH states: Iron (gates inert — the scope-lock basis) and Electric
// (gates live — the discrimination that proves they are real, not dropped).
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong gates nothing):
//   HA1 recurring hitCount-30 rider. PIN: skill-bucket damage at srcSlot skill1, atkPct 131.34, once per
//       30 normal shots (measured cadence shots/proc ≈ 30.27). Nearest-wrong (a) rider removed → zero
//       skill1 hits. (b) magnitude 121.05 (the level-9 value) instead of 131.34. Both discriminated.
//   HA2 "Cooldown of Burst Skill ▼" is a `burstCdr` effect (sim.ts:2047) — it directly refunds ally burst
//       cooldown frames and emits NO buffApply event, so it is observable only through its EFFECT on the
//       rotation. fullBurstEnter trigger (fires on each TEAM FB entry = 5×) vs nearest-wrong burstCast
//       (fires on this unit's OWN 10 casts). Discriminations: (a) STRUCTURAL pin — the shipped block is
//       fullBurstEnter → allies → escalating[burstCdr 1.82, 2.2, 2.6] (the datamined ladder + the engine's
//       escalating slice(0,activations) "triggers all before it" semantics, sim.ts:2056). (b) TRIGGER
//       IDENTITY — re-keying to burstCast over-applies the refund (10 activations vs 5) and over-accelerates
//       the rotation (this unit casts 12× vs 10×): the cadence under fullBurstEnter is provably distinct from
//       burstCast. (c) ESCALATING vs FLAT — a non-escalating "always 2.6" encoding refunds less total cooldown
//       than the ramping ladder (which reaches 1.82+2.2+2.6 from the 3rd FB), so it yields a strictly lower
//       180s total. NOTE: removing the block does NOT change this Burst II unit's own cast COUNT (her cadence
//       is chain-gated by the Burst I/III partners), so the fire-rate signal used for a Burst I carrier
//       (volume) is unavailable here — the trigger-identity + escalating-vs-total discriminations carry it.
//   HA3 the 105.58% random-enemy hit has NO "Activates when…" clause in the official prose → pure internal
//       timer = the datamined skill CD (skillCooldownsSec.skill2 = 4s) → interval:4 (first fire t=4, ~44×/180s).
//       PIN: skill-bucket damage at srcSlot skill2, atkPct 105.58, ≈44 procs. Nearest-wrong (a) removed → zero
//       skill2 hits. (b) the PRE-2026-07-20 invented proxy hitCount:30 (borrowed from HA1's genuine 30-normal
//       trigger) — it ties proc count to shot count and OVER-fires (≈55 vs the true ≈44): the interval cadence
//       is provably distinct from the hitCount proxy. This pins the 2026-07-20 resolution.
//   HA4 the Damage Taken debuff is GATED on an Electric boss (shotFired trigger composed with the
//       bossElementGate 'Electric' block gate). "Activates when attacking" = shotFired (per pull); each apply
//       is one 5.64% stack, maxStacks 5 / 5s — the kit's literal "▲5.64%, stacks up to 5 times, lasts 5 sec"
//       (the engine supports maxStacks, types.ts:195; leona precedent for a stacking 5-stack/5s buff). AR
//       continuous fire rebuilds 5 stacks in ~1s and refreshes inside the 5s window → steady-state mult.taken
//       1.282 (= 5.64×5 = 28.2 effective). Vs Electric the boss carries the stacking damageTakenPct 5.64 debuff
//       and this unit's mult.taken reaches 1.282; vs an Iron boss BOTH vanish (gate inert) and mult.taken is
//       1.0. Nearest-wrong: stripping the gate fires the stacking debuff vs EVERY boss — asserted present vs
//       Iron under the counterfactual (mult.taken reaches 1.282), absent under shipped. (REVISED 2026-07-25 from
//       a bossElement-trigger permanent-28.2 collapse, on cross-family evidence: both blind reviewers + the opus
//       S6 blind override independently derived this granular stacking encoding line-for-line.)
//   HA5 the burst nuke is 164.83% in the burst bucket, one hit per cast, cast BEFORE the FB window (no +50%
//       major — burst-skill damage is FB-exempt). Nearest-wrong: magnitude 157.33 (level-9 value).
//   HA6 the EXTRA 164.83% vs Electric Code targets is a SECOND burst hit composed of burstCast + the
//       bossElementGate 'Electric' block gate (sim.ts:1706). Vs Electric there are 2 burst hits per cast
//       (HA5 + HA6); vs Iron the gate blocks HA6 → 1 hit per cast. Nearest-wrong (a) the HA6 block removed →
//       only 1 hit/cast vs Electric. (b) the gate dropped (ungated) → 2 hits/cast vs EVERY boss (fudge) —
//       asserted vs Iron, where shipped keeps it at 1.
//
// Fixture: helm-aquamarine is Burst II, so a custom sole-B2 comp [liter(B1) / helm-aquamarine(B2) / helm(B3)]
// is used (NOT controlComp, which adds crown as a second B2). liter is the sole Burst I and helm the sole
// Burst III (cd 40s), so the team completes 5 Full Bursts over 180s while this unit casts her burst 10× —
// burstCast (10) ≠ fullBurstEnter (5), which is what lets HA2's trigger-identity assertion discriminate by
// count. Two boss elements: Iron (neutral for Iron — element major 1.0, both Electric gates inert; the
// scope-lock basis) and Electric (her intended target — ×1.10 major, both gates live). Focus helm-aquamarine
// (harmless for an AR — focus only matters on charge weapons). Deterministic (no seed). Slot order:
// liter 0 / helm-aquamarine 1 / helm 2.
import { describe, expect, it } from 'vitest';
import type { Element, SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  runComp,
  totals,
  withPatchedOverride,
  type CompOptions,
} from '../lib/harness.js';

const HA = 1; // slot order: liter 0 / helm-aquamarine 1 / helm 2

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

const haComp = (bossElement: Element | null): CompOptions => ({
  slugs: ['liter', 'helm-aquamarine', 'helm'],
  bossElement,
  focusSlug: 'helm-aquamarine',
});

function run(
  overrides: Record<string, any> = {},
  bossElement: Element | null = 'Iron',
) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...haComp(bossElement),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- readers ---------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const haDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === 'helm-aquamarine' && d.srcSlot === srcSlot);
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const haBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast =>
      e.kind === 'burstCast' && e.slug === 'helm-aquamarine',
  );
const haShots = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Shot => e.kind === 'shot' && e.slug === 'helm-aquamarine',
  );

/** Dedup precision-sensitive floats (kit magnitudes / mult decomposition). */
const distinctNum = (xs: number[], dp = 6) =>
  [...new Set(xs.map((x) => Number(x.toFixed(dp))))].sort((a, b) => a - b);
/** Dedup exact values (strings / ints) — no rounding. */
const distinct = <T>(xs: T[]): T[] => [...new Set(xs)];

// ---- counterfactual patches (nearest-wrong readings) ----------------------------------------
/** HA1 nearest-wrong (presence): the 30-normal-attack rider removed entirely. */
const cfS1aRemoved = withPatchedOverride('helm-aquamarine', (ov: any) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => b.trigger?.kind !== 'hitCount');
  if (ov.skill1.length === before)
    throw new Error(
      'helm-aquamarine S1 hitCount rider missing — fixture is stale',
    );
});
/** HA1 nearest-wrong (magnitude): the rider at the level-9 value 121.05 instead of 131.34. */
const cfS1aMag = withPatchedOverride('helm-aquamarine', (ov: any) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage');
  if (!e || e.atkPct !== 131.34)
    throw new Error(
      'helm-aquamarine S1 131.34% flatDamage missing — fixture is stale',
    );
  e.atkPct = 121.05;
});
const isCdrBlock = (b: any) =>
  b.trigger?.kind === 'fullBurstEnter' &&
  b.effects?.some(
    (e: any) =>
      e.kind === 'escalating' &&
      e.steps?.some((s: any) => s.kind === 'burstCdr'),
  );
/** HA2 nearest-wrong (trigger): the CDR ladder re-keyed fullBurstEnter → burstCast (over-applies). */
const cfS1bBurstCast = withPatchedOverride('helm-aquamarine', (ov: any) => {
  let hit = 0;
  for (const b of ov.skill1)
    if (isCdrBlock(b)) ((b.trigger = { kind: 'burstCast' }), hit++);
  if (!hit)
    throw new Error(
      'helm-aquamarine S1 burstCdr block missing — fixture is stale',
    );
});
/** HA2 nearest-wrong (escalating): the ladder collapsed to a flat "always 2.6" burstCdr. */
const cfS1bFlat = withPatchedOverride('helm-aquamarine', (ov: any) => {
  const b = ov.skill1.find((x: any) => isCdrBlock(x));
  if (!b)
    throw new Error(
      'helm-aquamarine S1 burstCdr block missing — fixture is stale',
    );
  b.effects = [{ kind: 'burstCdr', seconds: 2.6 }];
});
/** HA3 nearest-wrong (presence): the random-enemy hit removed entirely. */
const cfS2aRemoved = withPatchedOverride('helm-aquamarine', (ov: any) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => b.trigger?.kind !== 'interval');
  if (ov.skill2.length === before)
    throw new Error(
      'helm-aquamarine S2 interval hit missing — fixture is stale',
    );
});
/** HA3 nearest-wrong (cadence): the pre-2026-07-20 invented hitCount:30 proxy (ties to shot count). */
const cfS2aHitCount = withPatchedOverride('helm-aquamarine', (ov: any) => {
  let hit = 0;
  for (const b of ov.skill2)
    if (b.trigger?.kind === 'interval')
      ((b.trigger = { kind: 'hitCount', count: 30 }), hit++);
  if (!hit)
    throw new Error(
      'helm-aquamarine S2 interval hit missing — fixture is stale',
    );
});
/** HA4 nearest-wrong (gate): the Electric gate stripped → the stacking debuff fires vs every boss (fudge). */
const cfS2bUngated = withPatchedOverride('helm-aquamarine', (ov: any) => {
  let hit = 0;
  for (const b of ov.skill2)
    if (
      b.bossElementGate &&
      b.effects?.some((e: any) => e.stat === 'damageTakenPct')
    )
      (delete b.bossElementGate, hit++);
  if (!hit)
    throw new Error(
      'helm-aquamarine S2 Electric-gated debuff missing — fixture is stale',
    );
});
/** HA5 nearest-wrong (magnitude): the burst nuke at the level-9 value 157.33 instead of 164.83. */
const cfBaMag = withPatchedOverride('helm-aquamarine', (ov: any) => {
  const b = ov.burst.find(
    (x: any) => x.trigger?.kind === 'burstCast' && !x.bossElementGate,
  );
  if (!b || b.effects[0]?.atkPct !== 164.83)
    throw new Error(
      'helm-aquamarine burst 164.83% nuke missing — fixture is stale',
    );
  b.effects[0].atkPct = 157.33;
});
/** HA6 nearest-wrong (presence): the Electric extra-hit block removed. */
const cfBbRemoved = withPatchedOverride('helm-aquamarine', (ov: any) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !b.bossElementGate);
  if (ov.burst.length === before)
    throw new Error(
      'helm-aquamarine burst bossElementGate block missing — fixture is stale',
    );
});
/** HA6 nearest-wrong (gate): the bossElementGate dropped → the extra hit fires vs every boss (fudge). */
const cfBbUngated = withPatchedOverride('helm-aquamarine', (ov: any) => {
  let hit = 0;
  for (const b of ov.burst)
    if (b.bossElementGate) (delete b.bossElementGate, hit++);
  if (!hit)
    throw new Error(
      'helm-aquamarine burst bossElementGate block missing — fixture is stale',
    );
});

// ---- runs (hoisted: each is a full 180s sim) -------------------------------------------------
const base = run(); // Iron, shipped (Electric gates inert)
const elec = run({}, 'Electric'); // Electric, shipped (Electric gates live)
const s1aRemoved = run({ 'helm-aquamarine': cfS1aRemoved });
const s1aMag = run({ 'helm-aquamarine': cfS1aMag });
const s1bBurstCast = run({ 'helm-aquamarine': cfS1bBurstCast });
const s1bFlat = run({ 'helm-aquamarine': cfS1bFlat });
const s2aRemoved = run({ 'helm-aquamarine': cfS2aRemoved });
const s2aHitCount = run({ 'helm-aquamarine': cfS2aHitCount });
const s2bUngated = run({ 'helm-aquamarine': cfS2bUngated }); // Iron
const baMag = run({ 'helm-aquamarine': cfBaMag });
const bbRemoved = run({ 'helm-aquamarine': cfBbRemoved }, 'Electric');
const bbUngated = run({ 'helm-aquamarine': cfBbUngated }); // Iron

const casts = haBursts(base.events).length; // this unit's burst casts (10)

describe('helm-aquamarine — kit spec', () => {
  describe('fixture sanity — she casts her burst and the team reaches Full Burst', () => {
    it('casts >0 bursts and the team completes >0 Full Bursts (burst-gated lines are not vacuous)', () => {
      expect(casts).toBeGreaterThan(0);
      const fbs = base.events.filter((e) => e.kind === 'fullBurstStart').length;
      expect(fbs).toBeGreaterThan(0);
    });
  });

  describe('HA1 — S1 131.34% additional damage every 30 normal attacks (recurring hitCount rider)', () => {
    it('procs at the kit magnitude 131.34 in the skill bucket, srcSlot skill1', () => {
      const procs = haDamage(base.events, 'skill1');
      expect(procs.length).toBeGreaterThan(0);
      expect(
        distinctNum(
          procs.map((d) => d.atkPct),
          4,
        ),
      ).toEqual([131.34]);
      expect(distinct(procs.map((d) => d.bucket))).toEqual(['skill']);
    });
    it('fires once per 30 normal shots (the hitCount-30 cadence, not a proxy)', () => {
      const shots = haShots(base.events).length;
      const procs = haDamage(base.events, 'skill1').length;
      const ratio = shots / procs;
      expect(
        ratio,
        `${shots} shots / ${procs} procs = ${ratio.toFixed(2)} shots/proc — expected ≈30`,
      ).toBeGreaterThanOrEqual(29);
      expect(ratio).toBeLessThanOrEqual(31);
    });
    it('DISCRIMINATING (presence): removing the rider yields zero skill1 hits', () => {
      expect(haDamage(s1aRemoved.events, 'skill1').length).toBe(0);
    });
    it('DISCRIMINATING (magnitude): the level-9 reading lands at 121.05, not 131.34', () => {
      expect(
        distinctNum(
          haDamage(s1aMag.events, 'skill1').map((d) => d.atkPct),
          4,
        ),
      ).toEqual([121.05]);
    });
  });

  describe('HA2 — S1 FB-enter Cooldown of Burst Skill ▼ 1.82/2.2/2.6 sec (escalating burstCdr), all allies', () => {
    it('STRUCTURAL: shipped is fullBurstEnter → allies → escalating[burstCdr 1.82, 2.2, 2.6]', () => {
      const shipped: any = loadOverride('helm-aquamarine');
      const block = shipped.skill1.find((b: any) => isCdrBlock(b));
      expect(
        block,
        'no fullBurstEnter escalating-burstCdr block on skill1',
      ).toBeDefined();
      expect(block.trigger).toEqual({ kind: 'fullBurstEnter' });
      expect(block.target.kind).toBe('allies');
      const esc = block.effects.find((e: any) => e.kind === 'escalating');
      expect(esc.steps.map((s: any) => s.kind)).toEqual([
        'burstCdr',
        'burstCdr',
        'burstCdr',
      ]);
      // "Each subsequent effect triggers all effects before it" = the escalating ladder, datamined.
      expect(esc.steps.map((s: any) => s.seconds)).toEqual([1.82, 2.2, 2.6]);
    });
    it('DISCRIMINATING (trigger): fullBurstEnter (5 activations) ≠ burstCast (10) — burstCast over-accelerates', () => {
      // re-keying the refund to burstCast applies it twice as often → strictly more of this unit's casts
      // (deterministic: 10 under the faithful fullBurstEnter keying vs 12 under burstCast).
      expect(haBursts(s1bBurstCast.events).length).toBeGreaterThan(casts);
    });
    it('DISCRIMINATING (escalating): a flat always-2.6 encoding refunds less total CDR → strictly lower 180s total', () => {
      // the ramping ladder reaches 1.82+2.2+2.6 = 6.62s/FB from the 3rd entry, far more total refund than
      // a flat 2.6s/FB → the faithful escalating model rotates faster and out-damages the flat counterfactual.
      expect(base.totals['helm-aquamarine']).toBeGreaterThan(
        s1bFlat.totals['helm-aquamarine'],
      );
    });
  });

  describe('HA3 — S2 105.58% random-enemy hit on the datamined 4s internal timer (interval, NOT hitCount)', () => {
    it('procs at the kit magnitude 105.58 in the skill bucket, srcSlot skill2', () => {
      const procs = haDamage(base.events, 'skill2');
      expect(procs.length).toBeGreaterThan(0);
      expect(
        distinctNum(
          procs.map((d) => d.atkPct),
          4,
        ),
      ).toEqual([105.58]);
      expect(distinct(procs.map((d) => d.bucket))).toEqual(['skill']);
    });
    it('fires on the 4s interval cadence (≈44×/180s), independent of shot count', () => {
      const procs = haDamage(base.events, 'skill2').length;
      expect(procs).toBeGreaterThanOrEqual(43);
      expect(procs).toBeLessThanOrEqual(45);
    });
    it('DISCRIMINATING (presence): removing the hit yields zero skill2 hits', () => {
      expect(haDamage(s2aRemoved.events, 'skill2').length).toBe(0);
    });
    it('DISCRIMINATING (cadence): the invented hitCount:30 proxy over-fires vs the true 4s interval', () => {
      // the pre-2026-07-20 proxy ties proc count to shot count (~55) and over-fires the true ~44 interval;
      // the two cadences are provably distinct, pinning the interval:4 resolution.
      expect(haDamage(s2aHitCount.events, 'skill2').length).toBeGreaterThan(
        haDamage(base.events, 'skill2').length,
      );
    });
  });

  describe('HA4 — S2 Damage Taken ▲5.64%×5 stacks/5s (28.2 effective) is gated on an Electric boss', () => {
    it('vs Electric: the boss carries a stacking damageTakenPct 5.64 debuff (maxStacks 5, targetIdx null)', () => {
      const debuff = buffs(elec.events).filter(
        (b) => b.stat === 'damageTakenPct' && b.targetIdx === null,
      );
      expect(
        debuff.length,
        'no boss damageTakenPct debuff vs Electric',
      ).toBeGreaterThan(0);
      // granular stacking encoding (shotFired + bossElementGate): each apply is one 5.64% stack,
      // capped at 5 stacks (= 28.2 effective) — matches the kit's "▲5.64%, stacks up to 5 times".
      expect(distinctNum(debuff.map((b) => b.value))).toEqual([5.64]);
      expect(distinct(debuff.map((b) => (b as any).maxStacks))).toEqual([5]);
    });
    it('vs Electric: her damage actually takes the +28.2% (mult.taken reaches 1.282)', () => {
      const taken = distinctNum(
        dmg(elec.events)
          .filter((d) => d.slug === 'helm-aquamarine' && d.bucket === 'normal')
          .map((d) => d.mult.taken),
        4,
      );
      expect(
        taken.some((t) => Math.abs(t - 1.282) < 1e-3),
        `mult.taken values ${taken} never reach 1.282`,
      ).toBe(true);
    });
    it('DISCRIMINATING gate: vs an Iron boss the debuff is absent and mult.taken stays 1.0', () => {
      const debuff = buffs(base.events).filter(
        (b) => b.stat === 'damageTakenPct' && b.targetIdx === null,
      );
      expect(debuff).toEqual([]);
      expect(
        distinctNum(
          dmg(base.events)
            .filter(
              (d) => d.slug === 'helm-aquamarine' && d.bucket === 'normal',
            )
            .map((d) => d.mult.taken),
          4,
        ),
      ).toEqual([1]);
    });
    it('DISCRIMINATING (gate vs fudge): stripping the Electric gate fires the stacking debuff vs the Iron boss', () => {
      const debuff = buffs(s2bUngated.events).filter(
        (b) => b.stat === 'damageTakenPct' && b.targetIdx === null,
      );
      expect(
        debuff.length,
        'ungating the debuff did not apply it vs Iron — gate is inert anyway',
      ).toBeGreaterThan(0);
      expect(distinctNum(debuff.map((b) => b.value))).toEqual([5.64]);
      // …and her Iron-boss damage actually takes the stacked +28.2% (mult.taken reaches 1.282),
      // proving the gate is the ONLY thing holding the debuff off the non-Electric boss.
      const taken = distinctNum(
        dmg(s2bUngated.events)
          .filter((d) => d.slug === 'helm-aquamarine' && d.bucket === 'normal')
          .map((d) => d.mult.taken),
        4,
      );
      expect(
        taken.some((t) => Math.abs(t - 1.282) < 1e-3),
        `ungated mult.taken values ${taken} never reach 1.282`,
      ).toBe(true);
    });
    it('Iron is element-neutral for her (Iron major 1.0; Electric is the ×1.10 advantage)', () => {
      expect(
        distinctNum(
          dmg(base.events)
            .filter(
              (d) => d.slug === 'helm-aquamarine' && d.bucket === 'normal',
            )
            .map((d) => d.mult.elem),
          4,
        ),
      ).toEqual([1]);
      expect(
        distinctNum(
          dmg(elec.events)
            .filter(
              (d) => d.slug === 'helm-aquamarine' && d.bucket === 'normal',
            )
            .map((d) => d.mult.elem),
          4,
        ),
      ).toEqual([1.1]);
    });
  });

  describe('HA5 — burst 164.83% Burst Skill damage to all enemies (one hit/cast, FB-exempt)', () => {
    const nukes = (evs: SimEvent[]) => haDamage(evs, 'burst');
    it('fires once per cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes(base.events).length).toBe(casts);
      expect(nukes(base.events).length).toBeGreaterThan(0);
      expect(
        distinctNum(
          nukes(base.events).map((d) => d.atkPct),
          4,
        ),
      ).toEqual([164.83]);
      expect(distinct(nukes(base.events).map((d) => d.bucket))).toEqual([
        'burst',
      ]);
    });
    it('never takes the +50% Full Burst major (burst-skill damage is cast before FB opens)', () => {
      expect(
        nukes(base.events)
          .filter((d) => d.fbMajorApplied)
          .map((d) => d.sec),
      ).toEqual([]);
    });
    it('DISCRIMINATING (magnitude): the level-9 reading lands at 157.33, not 164.83', () => {
      expect(
        distinctNum(
          nukes(baMag.events).map((d) => d.atkPct),
          4,
        ),
      ).toEqual([157.33]);
    });
  });

  describe('HA6 — burst extra 164.83% vs Electric Code targets (burstCast + bossElementGate, inert off-Electric)', () => {
    const nukes = (evs: SimEvent[]) => haDamage(evs, 'burst');
    it('vs Iron (scope-lock): exactly one burst hit per cast — the Electric rider is inert', () => {
      expect(nukes(base.events).length).toBe(casts);
    });
    it('vs Electric: a SECOND 164.83 burst hit per cast awakens (HA5 + HA6)', () => {
      expect(nukes(elec.events).length).toBe(casts * 2);
      expect(
        distinctNum(
          nukes(elec.events).map((d) => d.atkPct),
          4,
        ),
      ).toEqual([164.83]);
    });
    it('DISCRIMINATING (presence): removing the HA6 block leaves only 1 hit/cast vs Electric', () => {
      expect(nukes(bbRemoved.events).length).toBe(casts);
    });
    it('DISCRIMINATING (gate vs fudge): dropping the gate fires the extra hit vs the Iron boss (2/cast)', () => {
      expect(nukes(bbUngated.events).length).toBe(casts * 2);
    });
  });
});
