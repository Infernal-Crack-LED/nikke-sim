// PER-UNIT KIT SPEC — `rem` (Rem, Supporter/MG/Water, Burst II, cd 20s, ammo 300, reloadFrames 171,
// hitsPerShot 1, normalMult 5.57 / coreMult 200, critRate 15 / critDamage 150). Kit-autonomy gauntlet
// 2026-08-01 (driver-authored S2a; tests FIRST; reconciled vs blind S2b claude-fable-5).
//
// One assertion group per KIT LINE (R1..R6), asserted against the override loaded from disk.
// `withPatchedOverride` builds COUNTERFACTUALS only (the nearest-wrong reading each assertion must
// discriminate against) — never the encoding under test.
//
// Kit (data/characters.json → characters.rem.skills, level 10/10/10 — the normalized `skills` prose):
//   S1 ■ after landing 15 normal attacks IN DEMON'S BREATH STATUS → self: ATK ▲4.22%, stacks ×30, 10s [R2]
//      ■ when using Burst Skill → all allies: Equally shares HP recovery for 10 sec                  [R5] (UNMODELED heal-share)
//   S2 ■ start of battle → self: Recovers 42.24% of attack damage as HP continuously (lifesteal)     [R6] (UNMODELED)
//      ■ start of battle → self + 2 highest-final-ATK RL allies: Equally shares HP recovery (share)  [R6] (UNMODELED)
//   BU ■ self: Demon's Breath — Critical Rate ▲37.8% for 10 sec                                      [R1]
//      ■ all RL allies: ATK ▲50.78% of the skill user's ATK for 10 sec                               [R3]
//      ■ all RL allies: Max Ammunition Capacity ▲5 round(s) for 10 sec                               [R4]
//
// SELF-STATUS GATE (the crux of this kit): "Demon's Breath" is a SELF status Rem applies with her own
// burst (the R1 crit buff). The R2 ATK stack accrues ONLY "in Demon's Breath status" — i.e. inside the
// 10s window after each of her burst casts. The engine has NO self-status / requiresOwnBuff gate, so the
// override proxies the personal window as a name-keyed boss targetStatus 'Demon's Breath' (10s, applied by
// the burst) and gates R2 on requiresTargetStatus — the gauntlet-validated asuka-wille/marciana/privaty
// pattern. The proxy is asserted BEHAVIOURALLY here: every R2 stack must land inside [castFrame, castFrame
// +600f] for some Rem burst cast (the ungated counterfactual accrues stacks across the whole fight and so
// leaks stacks into the gaps BETWEEN windows — the discrimination that proves the gate is live).
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong gates nothing):
//   R1  self crit 37.8 for 10s on burstCast. Nearest-wrong (a) scope `allies` (a GENERIC crit buff would
//       lift the whole team's crit — the line says "Affects self"). (b) buff REMOVED (rem's normal crit
//       never lifts off the 0.15 base). Proven live: rem's normal-attack critRate is 0.528 (=0.15+0.378)
//       in-window vs 0.15 with the buff removed.
//   R2  self ATK stack 4.22 ×30, 10s, hitCount 15, GATED to the Demon's Breath window. Nearest-wrong
//       (a) the gate DROPPED (ungated hitCount accrues stacks the whole fight → stacks in the inter-window
//       gaps; the shipped model confines every stack to a window). (b) scope `allies` (would buff the team's
//       ATK — the line says "Affects self"). PIN: maxStacks 30, value 4.22, self-only, and EVERY stack frame
//       in-window.
//   R3  RL allies ATK ▲50.78% of CASTER ATK (flat add), 10s, burstCast. Nearest-wrong (a) scope `allies`
//       (the classic scope-collapse: an RL-scoped line mis-encoded as generic would hit liter+rem too).
//       (b) stat atkPct (a percentage in the ATK bucket, NOT a caster-keyed flat add — the value would be the
//       raw 50.78, not 50.78% of Rem's static ATK). Rem is MG, so she does NOT receive her own RL grant.
//   R4  RL allies Max Ammo ▲5 rounds (FLAT), 10s, burstCast. Nearest-wrong (a) scope `allies`. (b) stat
//       maxAmmoPct (a percentage, not flat rounds).
//   R5  S1 burst-cast HP-recovery SHARE (all allies, 10s) is UNMODELED — healing/HP-redistribution is
//       damage-inert in v1 (no HP pool; Rem has no recovery-triggered block) and "Equally shares HP recovery"
//       is a redistribution mechanic, not a plain heal. PIN: skill1 emits EXACTLY the one modeled buff family
//       {atkPct} and NO heal/recovery effect.
//   R6  S2 (BOTH lines) UNMODELED healing — lifesteal + HP-recovery share. PIN: skill2 emits ZERO buffs and
//       ZERO skill2-sourced damage (the slot is empty), and Rem's full buff-stat set is EXACTLY the four
//       modeled families {atkPct, critRatePct, casterAtkPct, maxAmmoFlat} — no healing line leaked as a buff.
//
// Fixture: Rem is Burst II, so a custom comp [liter(B1,SMG) / rem(B2,MG) / ada(B3,RL Electric)] is used.
// Rem is the SOLE Burst II → she casts every chain opportunity (9 casts over 180s); ada (RL, cd 40) limits
// full chain completion to 5 Full Bursts but Rem's OWN burstCast (and so Demon's Breath + her RL grants)
// fires all 9 times. ada is the single RL ally → Rem's R3/R4 RL grants reach ONLY ada (slot 2), while liter
// (SMG slot 0) and rem herself (MG slot 1) are non-RL and must NOT receive them — the scope discrimination.
// Boss Fire (Rem's advantaged element), focus ada (RL charge weapon → burst gauge). Deterministic (no seed).
// Slot order: liter 0 / rem 1 / ada 2.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const WINDOW = 10 * FPS; // Demon's Breath = 10s
const LITER = 0; // SMG — non-RL
const REM = 1; // MG — non-RL (the unit under test)
const ADA = 2; // RL — the single RL ally
const ALL_SLOTS = [LITER, REM, ADA];
const RL_ALLIES = [ADA];

const FIXTURE = {
  slugs: ['liter', 'rem', 'ada'] as string[],
  bossElement: 'Fire' as const,
  focusSlug: 'ada',
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
type Damage = Extract<SimEvent, { kind: 'damage' }>;
/** buffApply events CASTER-keyed to Rem (her own kit grants). */
const buffs = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BuffApply => e.kind === 'buffApply' && e.casterIdx === REM
  );
const byStat = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) => b.stat === stat && (value === undefined || b.value === value)
  );
/** buffApply whose KEY carries the original (pre-conversion) effect value, e.g. :50.78 / :4.22. */
const byKeyVal = (evs: SimEvent[], stat: string, origVal: number) =>
  byStat(evs, stat).filter((b) => b.key.endsWith(`:${origVal}`));
const targetsOf = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.targetIdx))]
    .filter((t): t is number => t != null)
    .sort((a, b) => a - b);
const dursOf = (bs: BuffApply[]) => [
  ...new Set(
    bs.map((b) => (b.expiresFrame == null ? null : b.expiresFrame - b.frame))
  ),
];
const remBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Extract<SimEvent, { kind: 'burstCast' }> =>
      e.kind === 'burstCast' && e.slug === 'rem'
  );
const castFrames = (evs: SimEvent[]) => remBursts(evs).map((e) => e.frame);
/** true iff `frame` falls inside [castFrame, castFrame+WINDOW] for some Rem burst cast. */
const inWindow = (evs: SimEvent[], frame: number) =>
  castFrames(evs).some((c) => frame >= c && frame <= c + WINDOW);
const remDamage = (evs: SimEvent[], bucket?: Damage['bucket']) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' &&
      e.slug === 'rem' &&
      (bucket === undefined || e.bucket === bucket)
  );

// ---- counterfactual patches (nearest-wrong readings) -----------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects?.some((e: any) => e.stat === stat);
// R1 — the burst self critRatePct 37.8 block.
const isCrit = (b: any) => hasStat(b, 'critRatePct');
const cfCritRemoved = withPatchedOverride('rem', (ov: any) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !isCrit(b));
  if (ov.burst.length === before) {
    throw new Error('rem burst critRatePct block missing — fixture is stale');
  }
});
const cfCritScopeAllies = withPatchedOverride('rem', (ov: any) => {
  const b = ov.burst.find(isCrit);
  if (!b) {
    throw new Error('rem burst critRatePct block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});
// R2 — the skill1 self ATK stack block (atkPct 4.22, gated on Demon's Breath).
const isAtkStack = (b: any) => hasStat(b, 'atkPct');
const cfAtkStackUngated = withPatchedOverride('rem', (ov: any) => {
  const b = ov.skill1.find(isAtkStack);
  if (!b) {
    throw new Error('rem S1 atkPct block missing — fixture is stale');
  }
  delete b.requiresTargetStatus; // drop the Demon's Breath gate → accrues the whole fight
});
const cfAtkStackScopeAllies = withPatchedOverride('rem', (ov: any) => {
  const b = ov.skill1.find(isAtkStack);
  if (!b) {
    throw new Error('rem S1 atkPct block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});
// R3 — the burst RL casterAtkPct 50.78 block.
const isRlAtk = (b: any) => hasStat(b, 'casterAtkPct');
const cfRlAtkScopeAllies = withPatchedOverride('rem', (ov: any) => {
  const b = ov.burst.find(isRlAtk);
  if (!b) {
    throw new Error('rem burst casterAtkPct block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});
const cfRlAtkStatAtkPct = withPatchedOverride('rem', (ov: any) => {
  const b = ov.burst.find(isRlAtk);
  if (!b) {
    throw new Error('rem burst casterAtkPct block missing — fixture is stale');
  }
  b.effects.find((e: any) => e.stat === 'casterAtkPct').stat = 'atkPct';
});
// R4 — the burst RL maxAmmoFlat 5 block (same block as R3's casterAtkPct).
const cfRlAmmoScopeAllies = withPatchedOverride('rem', (ov: any) => {
  const b = ov.burst.find(isRlAtk);
  if (!b) {
    throw new Error('rem burst RL block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});
const cfRlAmmoStatPct = withPatchedOverride('rem', (ov: any) => {
  const b = ov.burst.find(isRlAtk);
  if (!b) {
    throw new Error('rem burst RL block missing — fixture is stale');
  }
  b.effects.find((e: any) => e.stat === 'maxAmmoFlat').stat = 'maxAmmoPct';
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const critRemoved = run({ rem: cfCritRemoved });
const critScopeAllies = run({ rem: cfCritScopeAllies });
const atkStackUngated = run({ rem: cfAtkStackUngated });
const atkStackScopeAllies = run({ rem: cfAtkStackScopeAllies });
const rlAtkScopeAllies = run({ rem: cfRlAtkScopeAllies });
const rlAtkStatAtkPct = run({ rem: cfRlAtkStatAtkPct });
const rlAmmoScopeAllies = run({ rem: cfRlAmmoScopeAllies });
const rlAmmoStatPct = run({ rem: cfRlAmmoStatPct });

const casts = remBursts(base.events).length;

describe('rem — kit spec', () => {
  describe('fixture sanity — Rem casts her burst and the RL scope is discriminated', () => {
    it('Rem casts >0 bursts (sole B2 → every chain opportunity)', () => {
      expect(casts).toBeGreaterThan(0);
    });
    it('fields exactly one RL ally (ada, slot 2); liter (SMG) and rem (MG) are non-RL', () => {
      expect(targetsOf(byStat(base.events, 'maxAmmoFlat', 5))).toEqual(
        RL_ALLIES
      );
    });
  });

  describe("R1 — burst self Critical Rate ▲37.8% for 10s (Demon's Breath)", () => {
    const crit = byStat(base.events, 'critRatePct', 37.8);
    it('is self-scoped, 10s, once per Rem cast, on her burstCast frames', () => {
      expect(crit.length).toBe(casts);
      expect(targetsOf(crit)).toEqual([REM]);
      expect(dursOf(crit)).toEqual([WINDOW]);
      expect(
        [...new Set(crit.map((b) => b.frame))].sort((a, b) => a - b)
      ).toEqual([...castFrames(base.events)].sort((a, b) => a - b));
    });
    it("is LIVE: lifts Rem's normal-attack crit rate to 0.528 (=0.15 base + 0.378) in-window", () => {
      const rates = [
        ...new Set(
          remDamage(base.events, 'normal').map((d) => d.critRate.toFixed(4))
        ),
      ];
      expect(rates).toContain((0.15 + 0.378).toFixed(4));
    });
    it("DISCRIMINATING (presence): with the buff REMOVED, Rem's normal crit never leaves the 0.15 base", () => {
      const rates = [
        ...new Set(
          remDamage(critRemoved.events, 'normal').map((d) =>
            d.critRate.toFixed(4)
          )
        ),
      ];
      expect(rates).toEqual([(0.15).toFixed(4)]);
    });
    it('DISCRIMINATING (scope): a GENERIC `allies` crit buff (nearest-wrong) lifts the whole team, not self only', () => {
      expect(
        targetsOf(byStat(critScopeAllies.events, 'critRatePct', 37.8))
      ).toEqual(ALL_SLOTS);
    });
  });

  describe("R2 — S1 self ATK ▲4.22% ×30 stacks, 10s, every 15 normals IN DEMON'S BREATH (gated)", () => {
    const stacks = byStat(base.events, 'atkPct', 4.22);
    it('is self-scoped, value 4.22, capped at 30 stacks, 10s per refresh', () => {
      expect(stacks.length).toBeGreaterThan(1);
      expect(targetsOf(stacks)).toEqual([REM]);
      expect(dursOf(stacks)).toEqual([WINDOW]);
      expect([...new Set(stacks.map((b) => b.maxStacks))]).toEqual([30]);
      expect(Math.max(...stacks.map((b) => b.stacks))).toBeLessThanOrEqual(30);
      expect(Math.max(...stacks.map((b) => b.stacks))).toBeGreaterThan(1);
    });
    it("GATE: every stack lands inside a Demon's Breath window ([cast, cast+10s]) — none in the inter-window gaps", () => {
      const outOfWindow = stacks.filter((b) => !inWindow(base.events, b.frame));
      expect(
        outOfWindow.map((b) => b.frame),
        "ATK stacks accrued OUTSIDE the Demon's Breath window — the gate is not live"
      ).toEqual([]);
    });
    it('DISCRIMINATING (gate): with requiresTargetStatus DROPPED, stacks leak into the inter-window gaps', () => {
      const ungated = byStat(atkStackUngated.events, 'atkPct', 4.22);
      const outOfWindow = ungated.filter(
        (b) => !inWindow(atkStackUngated.events, b.frame)
      );
      expect(
        outOfWindow.length,
        'ungated hitCount should accrue stacks across the whole fight (some outside every window)'
      ).toBeGreaterThan(0);
    });
    it("DISCRIMINATING (scope): `allies` (nearest-wrong) buffs the whole team's ATK, not self only", () => {
      expect(
        targetsOf(byStat(atkStackScopeAllies.events, 'atkPct', 4.22))
      ).toEqual(ALL_SLOTS);
    });
  });

  describe('R3 — burst: all RL allies ATK ▲50.78% of CASTER ATK (flat add), 10s', () => {
    const atk = byKeyVal(base.events, 'casterAtkPct', 50.78);
    it('reaches ONLY the RL ally (ada), once per cast, 10s, caster-keyed flat ATK', () => {
      expect(atk.length).toBe(casts * RL_ALLIES.length);
      expect(targetsOf(atk)).toEqual(RL_ALLIES);
      expect(dursOf(atk)).toEqual([WINDOW]);
      // caster-keyed: the SAME resolved flat value on every apply (= 50.78% of Rem's static ATK)
      const vals = atk.map((b) => b.value);
      expect(vals.every((v) => v === vals[0])).toBe(true);
      expect(vals[0]).toBeGreaterThan(0);
      // the resolved flat ATK is 50.78% of Rem's static ATK (NOT the raw 50.78 percentage)
      expect(vals[0] / 0.5078).toBeGreaterThan(1000);
    });
    it('DISCRIMINATING (scope): `allies` (nearest-wrong scope-collapse) hits liter+rem too, not just the RL ally', () => {
      expect(
        targetsOf(byKeyVal(rlAtkScopeAllies.events, 'casterAtkPct', 50.78))
      ).toEqual(ALL_SLOTS);
    });
    it('DISCRIMINATING (stat): atkPct (nearest-wrong) is a percentage, not a caster-keyed flat add', () => {
      expect(
        byKeyVal(rlAtkStatAtkPct.events, 'casterAtkPct', 50.78).length
      ).toBe(0);
      expect(
        byStat(rlAtkStatAtkPct.events, 'atkPct', 50.78).length
      ).toBeGreaterThan(0);
    });
  });

  describe('R4 — burst: all RL allies Max Ammunition Capacity ▲5 rounds (FLAT), 10s', () => {
    const ammo = byStat(base.events, 'maxAmmoFlat', 5);
    it('reaches ONLY the RL ally (ada), once per cast, 10s, flat 5 rounds', () => {
      expect(ammo.length).toBe(casts * RL_ALLIES.length);
      expect(targetsOf(ammo)).toEqual(RL_ALLIES);
      expect(dursOf(ammo)).toEqual([WINDOW]);
      expect(ammo.every((b) => b.value === 5)).toBe(true);
    });
    it('DISCRIMINATING (scope): `allies` (nearest-wrong) hits all 3 slots, not just the RL ally', () => {
      expect(
        targetsOf(byStat(rlAmmoScopeAllies.events, 'maxAmmoFlat', 5))
      ).toEqual(ALL_SLOTS);
    });
    it('DISCRIMINATING (stat): maxAmmoPct (nearest-wrong) is a percentage, not flat rounds', () => {
      expect(byStat(rlAmmoStatPct.events, 'maxAmmoFlat', 5).length).toBe(0);
      expect(
        byStat(rlAmmoStatPct.events, 'maxAmmoPct', 5).length
      ).toBeGreaterThan(0);
    });
  });

  describe('R5 — S1 burst-cast HP-recovery SHARE (all allies) is UNMODELED (damage-inert heal-share)', () => {
    it('PIN: skill1 emits EXACTLY the one modeled buff family {atkPct} and NO heal/recovery effect', () => {
      const s1Stats = new Set(
        buffs(base.events)
          .filter((b) => b.key.includes(':skill1:'))
          .map((b) => b.stat)
      );
      expect([...s1Stats].sort()).toEqual(['atkPct']);
    });
  });

  describe("R6 — S2 (both lines) UNMODELED healing; Rem's buff-stat set is exactly the four modeled families", () => {
    it('PIN: skill2 emits ZERO buffs (the slot is empty)', () => {
      const s2 = buffs(base.events).filter((b) => b.key.includes(':skill2:'));
      expect(s2.length).toBe(0);
    });
    it('PIN: Rem deals ZERO skill2-sourced damage', () => {
      const s2Dmg = base.events.filter(
        (e) => e.kind === 'damage' && e.slug === 'rem' && e.srcSlot === 'skill2'
      );
      expect(s2Dmg.length).toBe(0);
    });
    it("PIN: Rem's full buff-stat set is EXACTLY {atkPct, critRatePct, casterAtkPct, maxAmmoFlat} — no healing line leaked as a buff", () => {
      const stats = new Set(buffs(base.events).map((b) => b.stat));
      expect([...stats].sort()).toEqual(
        ['atkPct', 'casterAtkPct', 'critRatePct', 'maxAmmoFlat'].sort()
      );
    });
  });
});
