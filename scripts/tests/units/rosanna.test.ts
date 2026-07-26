// PER-UNIT KIT SPEC — `rosanna` (Rosanna, BASE unit — MG / Attacker / Electric / Burst I, cd 40s,
// ammo 300, hitsPerShot 1). NOT `rosanna-chic-ocean` (the AR/Wind Supporter variant) — do not
// conflate. Kit-autonomy gauntlet 2026-07-26; test written FIRST from the blablalink prose
// (data/characters.json → characters.rosanna.skills), then pinned GREEN vs the shipped override.
//
// Rosanna is a concealment-and-Frenzy burst DPS whose kit is HEAVILY PVE-survival/utility oriented.
// On the immortal-boss / no-targeting DPS basis, MOST of her lines are genuinely out-of-domain and
// are documented verbatim in the override's `unmodeled` (Concealment targeting-prevention ×3, enemy
// buff-removal, two ally-death triggers). This spec pins the FIVE DPS-load-bearing lines that ARE
// modeled, each GREEN vs shipped and RED vs its nearest-wrong counterfactual, plus two gap-honesty
// assertions proving the two most fudge-prone out-of-domain lines are NOT silently proxied.
//
// Kit (blablalink prose) and disposition:
//   S1 ■ after 120 normal attacks → self: Concealment 10s (removed on direct hit)      [UNMODELED — targeting, out-of-domain]
//                                  Critical Rate ▲19.34% for 3 sec                      [R2 — FAITHFUL: hitCount:120 → critRatePct]
//      ■ after 10 normal attacks → 2 highest-final-ATK enemies: Removes 5 buffs, once   [UNMODELED — buff-strip, out-of-domain]
//      ■ when the stage target appears → self: Elemental Advantage Attack Damage ▲20%   [R1 — FAITHFUL: passive → elemAdvantageDamagePct]
//   S2 ■ start of battle → self: Concealment 5s                                        [UNMODELED — targeting, out-of-domain]
//      ■ when a Nikke is incapacitated → self: Frenzy ATK ▲22.61% ×10/30s + gauge 36.54% [UNMODELED — ally-death trigger never fires]
//      ■ when a Nikke is incapacitated → 1 enemy (prio Attacker): 400% final ATK         [UNMODELED/R7 — ally-death trigger never fires]
//      ■ after 500 normal attacks → self: Frenzy ATK ▲22.61% ×10/30s                    [R3 — FAITHFUL: hitCount:500 → atkPct]
//   BU ■ prio Attacker, 2 enemies: Assalto 1310.4% of final ATK                         [R4 — FAITHFUL: burstCast → flatDamage]
//      ■ when user is in Concealment → Assalto targets: 561.6% additional damage         [UNMODELED/R6 — gated on Concealment self-state, ⚑1]
//      ■ if Assalto target is a Water Code stage target → Damage Taken ▲29% for 30s      [R5 — FAITHFUL: burstCast + bossElementGate Water]
//
// Discrimination notes (a test that cannot fail under the nearest-wrong model gates nothing):
//   R1  elemAdvantageDamagePct lives in the ELEMENT bucket and the engine applies it ONLY while
//       advantaged() (Electric beats Water). Proven two-sided: live vs Water (normal mult.elem 1.3
//       → 1.1 on removal) AND inert vs Iron (mult.elem 1.0, removal changes nothing). The nearest
//       wrong model — a plain attackDamagePct (Damage Up, always on) — is NOT inert vs Iron, so the
//       inert-vs-Iron assertion is one the always-on model provably fails.
//   R2  the kit says plain "Critical Rate ▲" (UNSCOPED), so the stat is critRatePct, not the
//       normal-only critRateNormalPct. Pinned by the buffApply stat field + cadence (floor(shots/120))
//       + liveness; the scoped counterfactual flips the stat field and fails.
//   R3  Frenzy is a hitCount:500 PULSE (floor(shots/500) applies, none at frame 0), not an always-on
//       passive (one apply at frame 0). Cadence + frame-spread discriminate.
//   R4  the TREASURE/max-level magnitude 1310.4, in the burst bucket, one per cast, FB-exempt (the
//       cast lands before the Full Burst window opens). The lvl-9 1244.88 counterfactual moves it.
//   R5  a boss-held (casterIdx AND targetIdx null) team-wide TAKEN debuff, gated to Water Code bosses
//       (bossElementGate). Proven two-sided: live vs Water (mult.taken 1.29, whole team drops on
//       removal) AND inert vs Iron (0 applies, removal changes nothing). Ungating it makes it fire vs
//       Iron, so the inert-vs-Iron assertion is one the ungated model provably fails.
//   R6  the concealment-gated 561.6% additional burst damage is honestly NOT modeled (no concealment
//       primitive; gating state is out-of-domain + measurement-gated, ⚑1). Asserted ABSENT so a future
//       "always-on" fudge cannot sneak it in silently.
//   R7  the ally-incapacitation 400% hit never fires (immortal boss → no ally is ever incapacitated).
//
// Fixture: rosanna (B1, sole Burst-I caster) / crown (B2) / helm (B3), focus rosanna, on a WATER boss
// (so Electric is advantaged and the Water-Code gate opens) with an IRON run as the inert reference.
// Deterministic (no seed). 5 full bursts / ~5991 normals over 180s.
import { describe, expect, it } from 'vitest';
import type { Element, SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** slugs order: rosanna 0 / crown 1 / helm 2. */
const ROSANNA = 0;
const CROWN = 1;
const HELM = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(bossElement: Element, rosOverride?: any) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['rosanna', 'crown', 'helm'],
    bossElement,
    focusSlug: 'rosanna',
    overrides: rosOverride ? { rosanna: rosOverride } : {},
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / reference patches (nearest-wrong models) -------------------------------
const hasStat = (b: any, stat: string) => b.effects.some((e: any) => e.stat === stat);

/** R1 reference: the elemental-advantage line removed. */
const noElem = withPatchedOverride('rosanna', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'elemAdvantageDamagePct'));
  if (ov.skill1.length === before) throw new Error('rosanna S1 elemAdvantageDamagePct block missing — fixture stale');
});
/** R1 counterfactual: the same magnitude as a plain always-on Damage-Up buff (NOT advantage-gated). */
const genericElem = withPatchedOverride('rosanna', (ov) => {
  const e = ov.skill1.flatMap((b: any) => b.effects).find((x: any) => x.stat === 'elemAdvantageDamagePct');
  if (!e) throw new Error('rosanna S1 elemAdvantageDamagePct effect missing — fixture stale');
  e.stat = 'attackDamagePct';
});
/** R2 reference: the crit-rate line removed. */
const noCrit = withPatchedOverride('rosanna', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'critRatePct'));
  if (ov.skill1.length === before) throw new Error('rosanna S1 critRatePct block missing — fixture stale');
});
/** R2 counterfactual: the crit rate scoped to normal attacks only (the kit says UNSCOPED). */
const scopedCrit = withPatchedOverride('rosanna', (ov) => {
  const e = ov.skill1.flatMap((b: any) => b.effects).find((x: any) => x.stat === 'critRatePct');
  if (!e) throw new Error('rosanna S1 critRatePct effect missing — fixture stale');
  e.stat = 'critRateNormalPct';
});
/** R3 reference: the 500-normal Frenzy line removed. */
const noFrenzy = withPatchedOverride('rosanna', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'atkPct'));
  if (ov.skill2.length === before) throw new Error('rosanna S2 atkPct block missing — fixture stale');
});
/** R3 counterfactual: Frenzy as an always-on passive (one apply at frame 0, 100% uptime). */
const passiveFrenzy = withPatchedOverride('rosanna', (ov) => {
  const b = ov.skill2.find((x: any) => hasStat(x, 'atkPct'));
  if (!b) throw new Error('rosanna S2 atkPct block missing — fixture stale');
  b.trigger = { kind: 'passive' };
});
/** R4 counterfactual: the burst nuke at the lvl-9 magnitude instead of the max 1310.4. */
const lowBurst = withPatchedOverride('rosanna', (ov) => {
  const e = ov.burst.flatMap((b: any) => b.effects).find((x: any) => x.kind === 'flatDamage' && x.atkPct === 1310.4);
  if (!e) throw new Error('rosanna burst Assalto flatDamage missing — fixture stale');
  e.atkPct = 1244.88;
});
/** R5 reference: the Water-Code taken debuff removed. */
const noTaken = withPatchedOverride('rosanna', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'damageTakenPct'));
  if (ov.burst.length === before) throw new Error('rosanna burst damageTakenPct block missing — fixture stale');
});
/** R5 counterfactual: the taken debuff UNGATED (no bossElementGate) — fires vs every boss. */
const ungatedTaken = withPatchedOverride('rosanna', (ov) => {
  const b = ov.burst.find((x: any) => hasStat(x, 'damageTakenPct'));
  if (!b) throw new Error('rosanna burst damageTakenPct block missing — fixture stale');
  delete b.bossElementGate;
});

// ---- runs (hoisted: each is a full 180s sim) -------------------------------------------------
const W = run('Water');
const W_noElem = run('Water', noElem);
const W_genericElem = run('Water', genericElem);
const W_noCrit = run('Water', noCrit);
const W_scopedCrit = run('Water', scopedCrit);
const W_noFrenzy = run('Water', noFrenzy);
const W_passiveFrenzy = run('Water', passiveFrenzy);
const W_noTaken = run('Water', noTaken);
const W_lowBurst = run('Water', lowBurst);
const I = run('Iron');
const I_noElem = run('Iron', noElem);
const I_noTaken = run('Iron', noTaken);
const I_ungatedTaken = run('Iron', ungatedTaken);

// ---- readers ---------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) => evs.filter((e): e is Damage => e.kind === 'damage');
const rosDmg = (evs: SimEvent[], bucket?: Damage['bucket']) =>
  dmg(evs).filter((d) => d.slug === 'rosanna' && (bucket == null || d.bucket === bucket));
const rosShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'rosanna');
const rosBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'rosanna');
const buffs = (evs: SimEvent[]) => evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const rosBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === ROSANNA && b.stat === stat);
/** Distinct mult.<field> values seen on rosanna's hits in a bucket. */
const multSet = (evs: SimEvent[], bucket: Damage['bucket'], field: keyof Damage['mult']) =>
  [...new Set(rosDmg(evs, bucket).map((d) => d.mult[field].toFixed(4)))].sort();
/** Distinct critRate values seen on rosanna's hits in a bucket. */
const critSet = (evs: SimEvent[], bucket: Damage['bucket']) =>
  [...new Set(rosDmg(evs, bucket).map((d) => d.critRate.toFixed(6)))].sort();

const SHOTS = rosShots(W.events).length;
const BURSTS = rosBursts(W.events).length;

describe('rosanna (base, MG/Electric/Burst I) — kit spec', () => {
  it('fixture sanity: she rotates and casts on the Water boss', () => {
    expect(BURSTS).toBeGreaterThan(0);
    expect(SHOTS).toBeGreaterThan(1000);
  });

  describe('R1 — S1 Elemental Advantage Attack Damage ▲20% (passive self elemAdvantageDamagePct, advantage-gated)', () => {
    const applied = rosBuffs(W.events, 'elemAdvantageDamagePct');

    it('is a continuous passive self-buff at the kit magnitude', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([20]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([ROSANNA]);
      expect([...new Set(applied.map((b) => b.expiresFrame))], 'continuous → no timed expiry').toEqual([null]);
    });

    it('is LIVE vs Water: lifts the normal-hit element bucket 1.1 → 1.3', () => {
      expect(multSet(W.events, 'normal', 'elem')).toEqual(['1.3000']);
      expect(multSet(W_noElem.events, 'normal', 'elem')).toEqual(['1.1000']);
    });

    it('is INERT vs a non-advantaged (Iron) boss: removal changes nothing', () => {
      expect(multSet(I.events, 'normal', 'elem')).toEqual(['1.0000']);
      expect(multSet(I_noElem.events, 'normal', 'elem')).toEqual(['1.0000']);
      expect(I_noElem.totals.rosanna).toBe(I.totals.rosanna);
    });

    it('DISCRIMINATING: an always-on attackDamagePct would NOT be inert vs Iron', () => {
      // The faithful advantage-gating is one the generic always-on model provably fails.
      const genericIron = run('Iron', genericElem);
      expect(genericIron.totals.rosanna).not.toBe(I.totals.rosanna);
      // and on Water it moves the Damage-Up bucket, not the element bucket
      expect(multSet(W_genericElem.events, 'normal', 'elem')).toEqual(['1.1000']);
    });
  });

  describe('R2 — S1 Critical Rate ▲19.34% for 3s every 120 normals (UNSCOPED critRatePct)', () => {
    const applied = rosBuffs(W.events, 'critRatePct');

    it('is critRatePct (unscoped), 19.34%, 3 sec, self-held', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.stat))]).toEqual(['critRatePct']);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([19.34]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([ROSANNA]);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(3 * FPS);
    });

    it('fires every 120 normal attacks (floor(shots/120) applies)', () => {
      expect(applied.length).toBe(Math.floor(SHOTS / 120));
    });

    it('is LIVE: removing it changes the normal-attack crit rates', () => {
      expect(critSet(W.events, 'normal')).not.toEqual(critSet(W_noCrit.events, 'normal'));
    });

    it('DISCRIMINATING: the scoped critRateNormalPct counterfactual flips the stat field', () => {
      const scoped = rosBuffs(W_scopedCrit.events, 'critRateNormalPct');
      expect(scoped.length).toBeGreaterThan(0);
      // shipped asserts the UNSCOPED stat; the scoped model has no critRatePct buff at all
      expect(rosBuffs(W_scopedCrit.events, 'critRatePct').length).toBe(0);
    });
  });

  describe('R3 — S2 Frenzy ATK ▲22.61% ×10/30s every 500 normals (hitCount:500 atkPct)', () => {
    const applied = rosBuffs(W.events, 'atkPct');

    it('is 22.61% self ATK, maxStacks 10, 30 sec', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([22.61]);
      expect([...new Set(applied.map((b) => b.maxStacks))]).toEqual([10]);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([ROSANNA]);
      for (const b of applied) expect(b.expiresFrame! - b.frame).toBe(30 * FPS);
    });

    it('is a hitCount:500 PULSE: floor(shots/500) applies, none at frame 0', () => {
      expect(applied.length).toBe(Math.floor(SHOTS / 500));
      expect(applied.every((b) => b.frame > 0), 'a pulse never applies at frame 0').toBe(true);
    });

    it('is LIVE: removing it lowers her total', () => {
      expect(W_noFrenzy.totals.rosanna).toBeLessThan(W.totals.rosanna);
    });

    it('DISCRIMINATING: an always-on passive applies once at frame 0, not floor(shots/500)×', () => {
      const passive = rosBuffs(W_passiveFrenzy.events, 'atkPct');
      expect(passive.length).toBe(1);
      expect(passive[0].frame).toBe(0);
    });
  });

  describe('R4 — Burst Assalto 1310.4% of final ATK (burstCast flatDamage, burst bucket)', () => {
    const nukes = rosDmg(W.events, 'burst').filter((d) => d.srcSlot === 'burst');

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      expect(BURSTS).toBeGreaterThan(0);
      expect(nukes.length).toBe(BURSTS);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([1310.4]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied).map((d) => d.atkPct)).toEqual([]);
    });

    it('DISCRIMINATING: the lvl-9 1244.88 magnitude is a different number', () => {
      const low = rosDmg(W_lowBurst.events, 'burst').filter((d) => d.srcSlot === 'burst');
      expect([...new Set(low.map((d) => d.atkPct))]).toEqual([1244.88]);
      expect([...new Set(nukes.map((d) => d.atkPct))]).not.toEqual([...new Set(low.map((d) => d.atkPct))]);
    });
  });

  describe('R5 — Burst Damage Taken ▲29% for 30s vs Water Code target (boss-held team-wide, bossElementGate Water)', () => {
    const taken = buffs(W.events).filter((b) => b.stat === 'damageTakenPct');

    it('is boss-held (casterIdx AND targetIdx null), 29%, 30 sec, once per burst', () => {
      expect(taken.length).toBe(BURSTS);
      expect([...new Set(taken.map((b) => b.value))]).toEqual([29]);
      expect([...new Set(taken.map((b) => b.casterIdx))]).toEqual([null]);
      expect([...new Set(taken.map((b) => b.targetIdx))]).toEqual([null]);
      for (const b of taken) expect(b.expiresFrame! - b.frame).toBe(30 * FPS);
    });

    it('is LIVE on her normals in-window (mult.taken reaches 1.29)', () => {
      expect(multSet(W.events, 'normal', 'taken')).toContain('1.2900');
      expect(multSet(W_noTaken.events, 'normal', 'taken')).toEqual(['1.0000']);
    });

    it('is TEAM-WIDE: removing it drops crown and helm too, not just rosanna', () => {
      expect(W_noTaken.totals.rosanna).toBeLessThan(W.totals.rosanna);
      expect(W_noTaken.totals.crown).toBeLessThan(W.totals.crown);
      expect(W_noTaken.totals.helm).toBeLessThan(W.totals.helm);
    });

    it('is INERT vs a non-Water (Iron) boss: 0 applies, removal changes nothing', () => {
      expect(buffs(I.events).filter((b) => b.stat === 'damageTakenPct').length).toBe(0);
      expect(I_noTaken.totals).toEqual(I.totals);
    });

    it('DISCRIMINATING: ungating it makes it fire vs Iron (the gate is load-bearing)', () => {
      expect(buffs(I_ungatedTaken.events).filter((b) => b.stat === 'damageTakenPct').length).toBeGreaterThan(0);
    });
  });

  describe('R6 — burst concealment-gated 561.6% additional damage is honestly NOT modeled (⚑1)', () => {
    it('no rosanna hit at 561.6% exists in any bucket (not silently proxied/always-on)', () => {
      const proxied = dmg(W.events).filter((d) => d.slug === 'rosanna' && d.atkPct === 561.6);
      expect(proxied.map((d) => d.atkPct)).toEqual([]);
    });
  });

  describe('R7 — ally-incapacitation 400% hit never fires (out-of-domain: immortal boss)', () => {
    it('no rosanna hit at 400% exists (no ally is ever incapacitated on this basis)', () => {
      const fired = dmg(W.events).filter((d) => d.slug === 'rosanna' && d.atkPct === 400);
      expect(fired.map((d) => d.atkPct)).toEqual([]);
    });
  });
});
