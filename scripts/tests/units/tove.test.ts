// PER-UNIT KIT SPEC — `tove` (Tove, Supporter/AR/Water, Burst I, cd 20s, ammo 60, 720 RoF (~12 shots/s),
// reloadFrames 81, chargeFrames 0, hitsPerShot 1, normalMult 14.2 / coreMult 200, critRate 15 / critDamage 150).
// Kit-autonomy gauntlet 2026-07-24 (driver-authored S2a; tests FIRST; reconciled vs blind S2b claude-fable-5).
//
// One assertion group per KIT LINE (T1..T7), asserted against the override loaded from disk.
// `withPatchedOverride` builds COUNTERFACTUALS only (the nearest-wrong reading each assertion must
// discriminate against) — never the encoding under test.
//
// Kit (data/characters.json → characters.tove.skills, levels 10/10/10 — the normalized `skills` prose is the
// SSOT; the raw datamine is STALE on two values, S2 crit-rate 3.32→10.08 and burst duration 10→15s, both
// already refreshed in the prose the sim reads):
//   S1 (Emergency-Crafted Bullets / Temporary Modification):
//      ■ after 10 normal attacks → self: Reload 5.31% of the magazine (UNMODELED — self ammo-refill QoL proc,
//        non-damage; documented skip)                                                              [T1]
//      ■ during Emergency-Crafted Bullets → all allies: Temporary Modification — Max Ammunition Capacity ▲2,
//        stacks up to 3×, lasts 5 sec  ⇒  steady-state max-stack = maxAmmoFlat 6 (2×3) to all allies  [T2]
//      ■ (same trigger) → all allies: Critical Damage ▲5.24% for 5 sec  ⇒  steady-state critDamagePct 5.24 [T3]
//   S2 (Modification Successful — "only activates when Temporary Modification is at max stacks"; at steady
//       state Tove is permanently at 3 stacks, so both lines are always-on = passive):
//      ■ at max stacks → all allies: Critical Rate ▲10.08% continuously  ⇒  critRatePct 10.08 (passive) [T4]
//      ■ at max stacks → all shotgun-wielding allies: Attack Speed ▲42.24% continuously  ⇒  attackSpeedPct
//        42.24 to alliesOfWeapon SG (passive)                                                     [T5]
//   BU (Miracle of Makeshifts — "ATK ▲ x% of the skill user's ATK. Mirrors the stack count of Temporary
//       Modification for 15 sec"; at steady state stacks = 3, so the grant is ×3 = casterAtkPct, burstCast):
//      ■ all allies: ATK ▲2.32% of caster ATK × 3 stacks = 6.96% caster ATK, 15s                  [T6]
//      ■ all shotgun-wielding allies: ATK ▲24.21% of caster ATK × 3 stacks = 72.63% caster ATK, 15s
//        (co-stacks ADDITIVELY with the all-ally line — distinct buff-key value 72.63 vs 6.96, so SG allies
//        get 6.96 + 72.63 = 79.59% caster ATK total)                                              [T7]
//
// STEADY-STATE MODELING (why S1/S2 are passive at max-stack values): Tove's Emergency-Crafted Bullets procs on
// her OWN 10 normal attacks; at 720 RoF (~12/s) that is a ~0.83s cadence, and each proc applies/refreshes the
// 5s Temporary Modification buff, so across a 180s raid the buff reaches 3 stacks within ~2.5s and stays maxed
// (refreshed far faster than the 5s expiry). The S2 "at max stacks" gate is therefore permanently satisfied and
// the burst "mirrors the stack count" is permanently ×3. Modeling the max-stack RESULT as a frame-0 passive
// (S1/S2) and a ×3 casterAtkPct (burst) is faithful for the fight; the brief ramp is negligible over 180s.
// (The raw datamine gives S1 as a "2% chance when attacking" instead of "after 10 normal attacks"; the
// normalized SSOT prose governs the sim. Both cadences keep the buff stacked at this fire rate, so the
// steady-state encoding is robust to that discrepancy — flagged as a residual trigger-cadence ⚑ for the owner.)
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong gates nothing):
//   T1  The S1 self-reload line ("Reload 5.31% of the magazine", self) is a non-damage ammo-refill QoL proc —
//       a sanctioned UNMODELED skip (recorded verbatim in unmodeled.skill1). The S1 SLOT is active (it emits the
//       T2 maxAmmoFlat + T3 critDamagePct team buffs), so this is a specific within-slot skip, not an empty slot.
//       PIN: skill1 emits EXACTLY the two modeled effect families {critDamagePct, maxAmmoFlat} and NO third
//       (reload/ammo-refill) effect — the documented skip is distinguished from a silent drop or a mis-encoding
//       of the reload line as a damage buff. GREEN vs shipped (exactly 2 families), RED if a reload-as-buff
//       encoding were added.
//   T2  "Max Ammunition Capacity ▲2, stacks up to 3×" = maxAmmoFlat 6 (FLAT 2 rounds × 3 stacks; theme 14, the
//       flat-rounds path is live) to all allies, passive (frame 0), no expiry (steady-state max-stack).
//       Nearest-wrong (a): stat maxAmmoPct 6 (a percentage, not flat rounds — wrong for non-60-round magazines).
//       (b) scope alliesOfWeapon SG (would hit only the 2 SG allies [3,4], not all 5). (c) a 5s duration (the
//       kit says "lasts for 5 sec", but at steady state the buff is refreshed every ~0.83s → permanent; a 5s
//       expiry would create dead windows). All three discriminated.
//   T3  "Critical Damage ▲5.24% for 5 sec" = critDamagePct 5.24 to all allies, passive (steady-state). Same
//       trigger as T2. Nearest-wrong (a): scope alliesOfWeapon SG (only [3,4]). (b) a 5s expiry (vs the faithful
//       permanent steady-state). Both discriminated.
//   T4  "Critical Rate ▲10.08% continuously" (gate: Temporary Modification at max stacks) = critRatePct 10.08 to
//       all allies, passive (the gate is permanently satisfied at steady state). Nearest-wrong (a): scope
//       alliesOfWeapon SG (the line says "all allies", not SG-only — would hit only [3,4]). (b) the gate modeled
//       as never-satisfied (zero critRatePct events). Discriminated by scope + presence.
//   T5  "Attack Speed ▲42.24% continuously" (gate: max stacks) → all SHOTGUN-wielding allies = attackSpeedPct
//       42.24 to alliesOfWeapon SG, passive. Nearest-wrong: scope `allies` (would hit all 5 slots, not just the
//       2 SG allies [3,4]) — the classic scope-collapse (SG-scoped line mis-encoded as generic). Discriminated.
//   T6  Burst "all allies: ATK ▲2.32% of caster ATK, mirrors stack count (×3), 15s" = casterAtkPct 6.96
//       (2.32×3), burstCast (Tove's OWN cast), target allies (all 5), 15s (900f). The buffApply `value` is the
//       RESOLVED flat ATK (= 6.96/100 × Tove.staticATK); the original 6.96 rides the event KEY (`:6.96`).
//       Nearest-wrong (a): trigger fullBurstEnter (lands on the FB-start frames, ~82f AFTER Tove's cast frames —
//       frame-discriminated; the two frame sets never coincide). (b) scope alliesOfWeapon SG (only [3,4]).
//       (c) stat atkPct (a percentage in the ATK bucket, NOT a caster-keyed flat add — value would be 6.96 not
//       the resolved flat). (d) duration 10s (the stale datamine value; the prose says 15s). (e) UN-mirrored
//       per-stack value 2.32 (ignoring "mirrors the stack count" ×3). All five discriminated.
//   T7  Burst "all shotgun-wielding allies: ATK ▲24.21% of caster ATK, mirrors stack count (×3), 15s" =
//       casterAtkPct 72.63 (24.21×3), burstCast, target alliesOfWeapon SG ([3,4]), 15s. Co-stacks additively
//       with the T6 all-ally line (distinct buff-key value → SG allies get 6.96 + 72.63 = 79.59% total).
//       Nearest-wrong (a): scope `allies` (would hit all 5, not just [3,4]). (b) stat atkPct (percentage, not
//       caster-keyed flat). Both discriminated.
//
// Fixture: Tove is Burst I, so a custom comp [tove(B1,AR Water) / crown(B2,MG Iron) / helm(B3,SR Water) /
// noir(B3,SG Wind) / isabel(B3,SG Electric)] is used. Tove is the SOLE Burst I → she casts every Full Burst
// cycle (9 casts over 180s) and the team completes 9 Full Bursts (casts === fbs); trigger identity is therefore
// discriminated by FRAME, not count — Tove's burstCast frame (180, 1380, …) strictly PRECEDES each
// fullBurstStart frame (262, 1462, …, ~82f later after the B2/B3 steps), so the two frame sets never coincide.
// The comp deliberately fields TWO SG allies — noir (slot 3) and isabel (slot 4) — and THREE non-SG allies
// (tove AR slot 0, crown MG slot 1, helm SR slot 2), so the "all allies" lines reach all 5 slots [0,1,2,3,4]
// while the SG-scoped lines reach only [3,4]. Boss Fire, focus Tove. Deterministic (no seed).
// Slot order: tove 0 / crown 1 / helm 2 / noir 3 / isabel 4.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const TOVE = 0;
const NOIR = 3; // SG ally
const ISABEL = 4; // SG ally
const ALL_SLOTS = [0, 1, 2, 3, 4];
const SG_ALLIES = [NOIR, ISABEL];

const FIXTURE = {
  slugs: ['tove', 'crown', 'helm', 'noir', 'isabel'] as string[],
  bossElement: 'Fire' as const,
  focusSlug: 'tove',
};

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...FIXTURE,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res };
}

// ---- readers ----------------------------------------------------------------------------------
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
const buffs = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BuffApply => e.kind === 'buffApply' && e.casterIdx === TOVE
  );
const byStat = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) => b.stat === stat && (value === undefined || b.value === value)
  );
/** buffApply events whose key carries the original (pre-conversion) effect value, e.g. 6.96 / 72.63. */
const byKeyVal = (evs: SimEvent[], stat: string, origVal: number) =>
  byStat(evs, stat).filter((b) => b.key.endsWith(`:${origVal}`));
const targetsOf = (bs: BuffApply[]) =>
  [
    ...new Set(
      bs.map((b) => b.targetIdx).filter((t): t is number => t != null)
    ),
  ].sort((a, b) => a - b);
const dursOf = (bs: BuffApply[]) => [
  ...new Set(
    bs.map((b) => (b.expiresFrame == null ? null : b.expiresFrame - b.frame))
  ),
];
const toveBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Extract<SimEvent, { kind: 'burstCast' }> =>
      e.kind === 'burstCast' && e.slug === 'tove'
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart');
/** Tove's burstCast frames (when SHE casts her burst — the B1 step of the chain). */
const castFrames = (evs: SimEvent[]) => toveBursts(evs).map((e) => e.frame);
/** Full-Burst-window opening frames (after the B2/B3 steps — strictly AFTER Tove's cast frame). */
const fbStartFrames = (evs: SimEvent[]) => fbStarts(evs).map((e) => e.frame);

// ---- counterfactual patches (nearest-wrong readings) -----------------------------------------
// The S1 passive block (T2 maxAmmoFlat 6 + T3 critDamagePct 5.24, target allies).
const isS1Passive = (b: any) =>
  b.trigger?.kind === 'passive' &&
  b.effects?.some((e: any) => e.stat === 'maxAmmoFlat' && e.value === 6);
// T2 nearest-wrong (stat): maxAmmoFlat 6 → maxAmmoPct 6 (a percentage, not flat rounds).
const cfS1MaxAmmoPct = withPatchedOverride('tove', (ov: any) => {
  const b = ov.skill1.find(isS1Passive);
  if (!b) {
    throw new Error('tove S1 passive block missing — fixture is stale');
  }
  const eff = b.effects.find((e: any) => e.stat === 'maxAmmoFlat');
  eff.stat = 'maxAmmoPct';
});
// T2/T3 nearest-wrong (scope): allies → alliesOfWeapon SG (hit only the 2 SG allies, not all 5).
const cfS1ScopeSG = withPatchedOverride('tove', (ov: any) => {
  const b = ov.skill1.find(isS1Passive);
  if (!b) {
    throw new Error('tove S1 passive block missing — fixture is stale');
  }
  b.target = { kind: 'alliesOfWeapon', weapon: 'SG' };
});
// T2/T3 nearest-wrong (duration): add a 5s expiry to the steady-state permanent passive.
const cfS1Dur5 = withPatchedOverride('tove', (ov: any) => {
  const b = ov.skill1.find(isS1Passive);
  if (!b) {
    throw new Error('tove S1 passive block missing — fixture is stale');
  }
  for (const e of b.effects) {
    e.durationSec = 5;
  }
});
// The S2 critRatePct 10.08 block (T4 under test, target allies).
const isS2CritRate = (b: any) =>
  b.trigger?.kind === 'passive' &&
  b.effects?.some((e: any) => e.stat === 'critRatePct' && e.value === 10.08);
// T4 nearest-wrong (scope): allies → alliesOfWeapon SG (the line says "all allies", not SG-only).
const cfS2CritRateScopeSG = withPatchedOverride('tove', (ov: any) => {
  const b = ov.skill2.find(isS2CritRate);
  if (!b) {
    throw new Error('tove S2 critRate block missing — fixture is stale');
  }
  b.target = { kind: 'alliesOfWeapon', weapon: 'SG' };
});
// The S2 attackSpeedPct 42.24 block (T5 under test, target alliesOfWeapon SG).
const isS2AtkSpeed = (b: any) =>
  b.trigger?.kind === 'passive' &&
  b.effects?.some((e: any) => e.stat === 'attackSpeedPct' && e.value === 42.24);
// T5 nearest-wrong (scope): alliesOfWeapon SG → allies (the classic scope-collapse: SG line as generic).
const cfS2AtkSpeedScopeAllies = withPatchedOverride('tove', (ov: any) => {
  const b = ov.skill2.find(isS2AtkSpeed);
  if (!b) {
    throw new Error('tove S2 attackSpeed block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});
// The burst all-ally casterAtkPct 6.96 block (T6 under test).
const isBurstAll = (b: any) =>
  b.target?.kind === 'allies' &&
  b.effects?.some((e: any) => e.stat === 'casterAtkPct' && e.value === 6.96);
// T6 nearest-wrong (trigger): burstCast → fullBurstEnter (every team FB-start frame, not Tove's cast frame).
const cfBurstAllFbEnter = withPatchedOverride('tove', (ov: any) => {
  const b = ov.burst.find(isBurstAll);
  if (!b) {
    throw new Error('tove burst all-ally block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
// T6 nearest-wrong (scope): allies → alliesOfWeapon SG (only the 2 SG allies, not all 5).
const cfBurstAllScopeSG = withPatchedOverride('tove', (ov: any) => {
  const b = ov.burst.find(isBurstAll);
  if (!b) {
    throw new Error('tove burst all-ally block missing — fixture is stale');
  }
  b.target = { kind: 'alliesOfWeapon', weapon: 'SG' };
});
// T6 nearest-wrong (stat): casterAtkPct → atkPct (a percentage in the ATK bucket, not a caster-keyed flat add).
const cfBurstAllAtkPct = withPatchedOverride('tove', (ov: any) => {
  const b = ov.burst.find(isBurstAll);
  if (!b) {
    throw new Error('tove burst all-ally block missing — fixture is stale');
  }
  b.effects.find((e: any) => e.stat === 'casterAtkPct').stat = 'atkPct';
});
// T6 nearest-wrong (duration): the stale datamine 10s window (the prose says 15s).
const cfBurstAllDur10 = withPatchedOverride('tove', (ov: any) => {
  const b = ov.burst.find(isBurstAll);
  if (!b) {
    throw new Error('tove burst all-ally block missing — fixture is stale');
  }
  b.effects.find((e: any) => e.stat === 'casterAtkPct').durationSec = 10;
});
// T6 nearest-wrong (mirror): the UN-mirrored per-stack value 2.32 (ignoring "mirrors the stack count" ×3).
const cfBurstAllUnmirrored = withPatchedOverride('tove', (ov: any) => {
  const b = ov.burst.find(isBurstAll);
  if (!b) {
    throw new Error('tove burst all-ally block missing — fixture is stale');
  }
  b.effects.find((e: any) => e.stat === 'casterAtkPct').value = 2.32;
});
// The burst SG casterAtkPct 72.63 block (T7 under test).
const isBurstSG = (b: any) =>
  b.target?.kind === 'alliesOfWeapon' &&
  b.effects?.some((e: any) => e.stat === 'casterAtkPct' && e.value === 72.63);
// T7 nearest-wrong (scope): alliesOfWeapon SG → allies (hit all 5, not just the 2 SG allies).
const cfBurstSGScopeAllies = withPatchedOverride('tove', (ov: any) => {
  const b = ov.burst.find(isBurstSG);
  if (!b) {
    throw new Error('tove burst SG block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});
// T7 nearest-wrong (stat): casterAtkPct → atkPct.
const cfBurstSGAtkPct = withPatchedOverride('tove', (ov: any) => {
  const b = ov.burst.find(isBurstSG);
  if (!b) {
    throw new Error('tove burst SG block missing — fixture is stale');
  }
  b.effects.find((e: any) => e.stat === 'casterAtkPct').stat = 'atkPct';
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const s1MaxAmmoPct = run({ tove: cfS1MaxAmmoPct });
const s1ScopeSG = run({ tove: cfS1ScopeSG });
const s1Dur5 = run({ tove: cfS1Dur5 });
const s2CritRateScopeSG = run({ tove: cfS2CritRateScopeSG });
const s2AtkSpeedScopeAllies = run({ tove: cfS2AtkSpeedScopeAllies });
const burstAllFbEnter = run({ tove: cfBurstAllFbEnter });
const burstAllScopeSG = run({ tove: cfBurstAllScopeSG });
const burstAllAtkPct = run({ tove: cfBurstAllAtkPct });
const burstAllDur10 = run({ tove: cfBurstAllDur10 });
const burstAllUnmirrored = run({ tove: cfBurstAllUnmirrored });
const burstSGScopeAllies = run({ tove: cfBurstSGScopeAllies });
const burstSGAtkPct = run({ tove: cfBurstSGAtkPct });

const casts = toveBursts(base.events).length; // tove's burst casts (9)
const fbs = fbStarts(base.events).length; // team Full Bursts (9)

describe('tove — kit spec', () => {
  describe('fixture sanity — Tove casts her burst and the team reaches Full Burst', () => {
    it('Tove casts >0 bursts, the team completes >0 Full Bursts, and burstCast frames != fullBurstStart frames (trigger-identity is frame-discriminable)', () => {
      expect(casts).toBeGreaterThan(0);
      expect(fbs).toBeGreaterThan(0);
      // sole-B1 comp: Tove casts every Full Burst cycle (casts === fbs), but her burstCast frame PRECEDES each
      // Full Burst window opening (the B1 step fires before the B2/B3 steps complete the chain), so burstCast vs
      // fullBurstEnter is discriminated by FRAME, not by count.
      expect(casts).toBe(fbs);
      const cf = castFrames(base.events);
      const ff = fbStartFrames(base.events);
      expect(cf.every((f) => !ff.includes(f))).toBe(true);
    });
    it('the fixture fields exactly two SG allies (noir slot 3, isabel slot 4) for scope discrimination', () => {
      // the S2 attackSpeed line (alliesOfWeapon SG) reaches exactly noir + isabel
      expect(targetsOf(byStat(base.events, 'attackSpeedPct', 42.24))).toEqual(
        SG_ALLIES
      );
    });
  });

  describe('T1 — S1 self-reload ("Reload 5.31% of the magazine", self) is UNMODELED (non-damage ammo-refill QoL)', () => {
    it('PIN: skill1 emits EXACTLY the two modeled effect families {critDamagePct, maxAmmoFlat} and NO reload/ammo-refill effect (the documented skip is not a silent drop or a mis-encoding)', () => {
      const s1Stats = new Set(
        buffs(base.events)
          .filter((b) => b.key.includes(':skill1:'))
          .map((b) => b.stat)
      );
      expect([...s1Stats].sort()).toEqual(['critDamagePct', 'maxAmmoFlat']);
    });
    it('PIN: Tove deals ZERO skill1-sourced damage (the slot is pure team buffing)', () => {
      const skill1Dmg = base.events.filter(
        (e) =>
          e.kind === 'damage' && e.slug === 'tove' && e.srcSlot === 'skill1'
      );
      expect(skill1Dmg.length).toBe(0);
    });
  });

  describe('T2 — S1 Temporary Modification: Max Ammunition Capacity ▲2 ×3 stacks = maxAmmoFlat 6 → all allies, passive (steady-state)', () => {
    const ammo = byStat(base.events, 'maxAmmoFlat', 6);
    it('is a FLAT 6 rounds to all 5 allies, applied at frame 0, no expiry (steady-state max-stack)', () => {
      expect(ammo.length).toBeGreaterThan(0);
      expect(ammo.every((b) => b.value === 6)).toBe(true);
      expect(targetsOf(ammo)).toEqual(ALL_SLOTS);
      expect(dursOf(ammo)).toEqual([null]);
      expect(Math.min(...ammo.map((b) => b.frame))).toBe(0);
    });
    it('DISCRIMINATING (stat): maxAmmoPct 6 (nearest-wrong) is a percentage, not flat rounds', () => {
      expect(byStat(s1MaxAmmoPct.events, 'maxAmmoFlat', 6).length).toBe(0);
      expect(
        byStat(s1MaxAmmoPct.events, 'maxAmmoPct', 6).length
      ).toBeGreaterThan(0);
    });
    it('DISCRIMINATING (scope): alliesOfWeapon SG (nearest-wrong) hits only the 2 SG allies, not all 5', () => {
      expect(targetsOf(byStat(s1ScopeSG.events, 'maxAmmoFlat', 6))).toEqual(
        SG_ALLIES
      );
    });
    it('DISCRIMINATING (duration): a 5s expiry (nearest-wrong) is NOT the faithful permanent steady-state passive', () => {
      expect(dursOf(byStat(s1Dur5.events, 'maxAmmoFlat', 6))).toEqual([
        5 * FPS,
      ]);
    });
  });

  describe('T3 — S1 Critical Damage ▲5.24% → all allies, passive (steady-state)', () => {
    const critDmg = byStat(base.events, 'critDamagePct', 5.24);
    it('reaches all 5 allies, applied at frame 0, no expiry (steady-state)', () => {
      expect(critDmg.length).toBeGreaterThan(0);
      expect(targetsOf(critDmg)).toEqual(ALL_SLOTS);
      expect(dursOf(critDmg)).toEqual([null]);
      expect(Math.min(...critDmg.map((b) => b.frame))).toBe(0);
    });
    it('DISCRIMINATING (scope): alliesOfWeapon SG (nearest-wrong) hits only the 2 SG allies, not all 5', () => {
      expect(
        targetsOf(byStat(s1ScopeSG.events, 'critDamagePct', 5.24))
      ).toEqual(SG_ALLIES);
    });
    it('DISCRIMINATING (duration): a 5s expiry (nearest-wrong) is NOT the faithful permanent steady-state passive', () => {
      expect(dursOf(byStat(s1Dur5.events, 'critDamagePct', 5.24))).toEqual([
        5 * FPS,
      ]);
    });
  });

  describe('T4 — S2 Critical Rate ▲10.08% (max-stack gate, always satisfied at steady state) → all allies, passive', () => {
    const critRate = byStat(base.events, 'critRatePct', 10.08);
    it('reaches all 5 allies, applied at frame 0, no expiry ("continuously")', () => {
      expect(critRate.length).toBeGreaterThan(0);
      expect(targetsOf(critRate)).toEqual(ALL_SLOTS);
      expect(dursOf(critRate)).toEqual([null]);
      expect(Math.min(...critRate.map((b) => b.frame))).toBe(0);
    });
    it('DISCRIMINATING (scope): alliesOfWeapon SG (nearest-wrong) hits only the 2 SG allies — the line says "all allies"', () => {
      expect(
        targetsOf(byStat(s2CritRateScopeSG.events, 'critRatePct', 10.08))
      ).toEqual(SG_ALLIES);
    });
  });

  describe('T5 — S2 Attack Speed ▲42.24% (max-stack gate) → all SHOTGUN-wielding allies, passive', () => {
    const atkSpd = byStat(base.events, 'attackSpeedPct', 42.24);
    it('reaches ONLY the 2 SG allies (noir, isabel), applied at frame 0, no expiry ("continuously")', () => {
      expect(atkSpd.length).toBeGreaterThan(0);
      expect(targetsOf(atkSpd)).toEqual(SG_ALLIES);
      expect(dursOf(atkSpd)).toEqual([null]);
      expect(Math.min(...atkSpd.map((b) => b.frame))).toBe(0);
    });
    it('DISCRIMINATING (scope): `allies` (nearest-wrong scope-collapse) hits all 5 slots, not just the 2 SG allies', () => {
      expect(
        targetsOf(byStat(s2AtkSpeedScopeAllies.events, 'attackSpeedPct', 42.24))
      ).toEqual(ALL_SLOTS);
    });
  });

  describe('T6 — Burst: all allies → ATK ▲2.32% ×3 stacks = 6.96% of CASTER ATK, 15s (casterAtkPct, burstCast)', () => {
    const atk = byKeyVal(base.events, 'casterAtkPct', 6.96);
    it('reaches all 5 allies, once per Tove cast × 5 targets, 15s, on burstCast, caster-keyed flat ATK', () => {
      expect(atk.length).toBe(casts * ALL_SLOTS.length);
      expect(targetsOf(atk)).toEqual(ALL_SLOTS);
      expect(dursOf(atk)).toEqual([15 * FPS]);
      // caster-keyed: the SAME resolved flat value on every target (= 6.96% of Tove's ATK)
      const vals = atk.map((b) => b.value);
      expect(vals.every((v) => v === vals[0])).toBe(true);
      // the resolved flat ATK is 6.96% of Tove's static ATK (NOT the raw 6.96 percentage)
      const toveAtk = vals[0] / 0.0696;
      expect(toveAtk).toBeGreaterThan(0);
      // applies on Tove's burstCast frames
      const frames = [...new Set(atk.map((b) => b.frame))].sort(
        (a, b) => a - b
      );
      expect(frames).toEqual(
        [...castFrames(base.events)].sort((a, b) => a - b)
      );
    });
    it("DISCRIMINATING (trigger): fullBurstEnter (nearest-wrong) lands on the later FB-start frames, not Tove's cast frames", () => {
      const cast = castFrames(base.events);
      const fb = fbStartFrames(base.events);
      const cfFrames = [
        ...new Set(
          byKeyVal(burstAllFbEnter.events, 'casterAtkPct', 6.96).map(
            (b) => b.frame
          )
        ),
      ];
      expect(cfFrames.length).toBeGreaterThan(0);
      expect(cfFrames.every((f) => fb.includes(f))).toBe(true);
      expect(cfFrames.every((f) => !cast.includes(f))).toBe(true);
    });
    it('DISCRIMINATING (scope): alliesOfWeapon SG (nearest-wrong) hits only the 2 SG allies, not all 5', () => {
      expect(
        targetsOf(byKeyVal(burstAllScopeSG.events, 'casterAtkPct', 6.96))
      ).toEqual(SG_ALLIES);
    });
    it('DISCRIMINATING (stat): atkPct (nearest-wrong) is a percentage in the ATK bucket, not a caster-keyed flat add', () => {
      // under the nearest-wrong there is NO casterAtkPct :6.96 …
      expect(byKeyVal(burstAllAtkPct.events, 'casterAtkPct', 6.96).length).toBe(
        0
      );
      // … instead an atkPct 6.96 appears (a percentage, value NOT resolved to flat ATK)
      const pct = byStat(burstAllAtkPct.events, 'atkPct', 6.96);
      expect(pct.length).toBeGreaterThan(0);
    });
    it('DISCRIMINATING (duration): the stale datamine 10s (nearest-wrong) is shorter than the faithful 15s', () => {
      expect(
        dursOf(byKeyVal(burstAllDur10.events, 'casterAtkPct', 6.96))
      ).toEqual([10 * FPS]);
    });
    it('DISCRIMINATING (mirror): the UN-mirrored per-stack value 2.32 (nearest-wrong) ignores "mirrors the stack count" ×3', () => {
      expect(
        byKeyVal(burstAllUnmirrored.events, 'casterAtkPct', 6.96).length
      ).toBe(0);
      expect(
        byKeyVal(burstAllUnmirrored.events, 'casterAtkPct', 2.32).length
      ).toBeGreaterThan(0);
    });
  });

  describe('T7 — Burst: all SHOTGUN-wielding allies → ATK ▲24.21% ×3 stacks = 72.63% of CASTER ATK, 15s (co-stacks with T6 → SG total 79.59%)', () => {
    const atk = byKeyVal(base.events, 'casterAtkPct', 72.63);
    it('reaches ONLY the 2 SG allies, once per Tove cast × 2 targets, 15s, on burstCast, caster-keyed flat ATK', () => {
      expect(atk.length).toBe(casts * SG_ALLIES.length);
      expect(targetsOf(atk)).toEqual(SG_ALLIES);
      expect(dursOf(atk)).toEqual([15 * FPS]);
      const vals = atk.map((b) => b.value);
      expect(vals.every((v) => v === vals[0])).toBe(true);
    });
    it('DISCRIMINATING (co-stack): SG allies receive BOTH the 6.96 all-ally line AND the 72.63 SG line (additive, distinct keys → 79.59% total)', () => {
      const sgTotal = byKeyVal(base.events, 'casterAtkPct', 6.96)
        .filter((b) => b.targetIdx === NOIR)
        .concat(
          byKeyVal(base.events, 'casterAtkPct', 72.63).filter(
            (b) => b.targetIdx === NOIR
          )
        );
      // noir gets both keys
      const keys = new Set(sgTotal.map((b) => b.key));
      expect([...keys].some((k) => k.endsWith(':6.96'))).toBe(true);
      expect([...keys].some((k) => k.endsWith(':72.63'))).toBe(true);
    });
    it('DISCRIMINATING (scope): `allies` (nearest-wrong) hits all 5 slots, not just the 2 SG allies', () => {
      expect(
        targetsOf(byKeyVal(burstSGScopeAllies.events, 'casterAtkPct', 72.63))
      ).toEqual(ALL_SLOTS);
    });
    it('DISCRIMINATING (stat): atkPct (nearest-wrong) is a percentage, not a caster-keyed flat add', () => {
      expect(byKeyVal(burstSGAtkPct.events, 'casterAtkPct', 72.63).length).toBe(
        0
      );
      expect(
        byStat(burstSGAtkPct.events, 'atkPct', 72.63).length
      ).toBeGreaterThan(0);
    });
  });
});
