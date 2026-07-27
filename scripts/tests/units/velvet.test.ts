// PER-UNIT KIT SPEC — `velvet` (Velvet, Supporter/SR/Wind, Burst II, cd 20s, ammo 6, chargeFrames 60,
// chargeMultiplier 250, hitsPerShot 1, normalMult 69.04 / coreMult 200).
// Kit-autonomy gauntlet 2026-07-24 (driver-authored S2a; tests FIRST; reconciled vs blind S2b claude-fable-5).
//
// One assertion group per KIT LINE (V1..V5), asserted against the override loaded from disk.
// `withPatchedOverride` builds COUNTERFACTUALS only (the nearest-wrong reading each assertion must
// discriminate against) — never the encoding under test.
//
// Kit (data/characters.json → characters.velvet.skills):
//   S1 ■ start of battle / entering Burst Stage 2 — Bullet Snatch: removes 5% ammo from all enemies;
//        fills own ammo pouch to 6000 (continuous, unremovable)                              (UNMODELED) [V1]
//      ■ Full Charge while NOT in Full Burst → self: ATK ▲30.5% / Attack Damage ▲30.5% for 3 sec        [V2]
//   S2 ■ Full Charge DURING Full Burst → all allies: ATK ▲25.2% of caster's ATK / Charge Damage ▲100.8%
//        for 3 sec continuously                                                                          [V3]
//      ■ after landing 50 normal attacks during Full Burst → self Attack Damage ▲15.03% / 5 sec +
//        target 400.92% of final ATK additional damage                                                   [V4]
//   BU ■ self: Changes the weapon in use (Damage 7% of final ATK, 10 sec) + Attack Damage ▲34.52% / 10s [V5]
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong gates nothing):
//   V1  Bullet Snatch is RESOURCE/DEFENSIVE bookkeeping. The ammo pouch is derivably NEVER-BINDING: max
//       drain per 20s rotation ≈ 7 outFb charges×100 + 7 inFb charges×300 + ≤1 proc×300 ≈ 3.1k « 6000 cap,
//       refilled to cap at every Burst-Stage-2 entry — so every ammo-gated effect fires at full uptime and
//       the pouch + the enemy bullet-steal are a sanctioned UNMODELED skip (recorded verbatim), NOT a
//       dynamic resource gate. PIN the absence: velvet emits ZERO maxAmmo buffs and forces ZERO ally reloads.
//       Nearest-wrong (fable S2b): a sign-flipped consumeAmmo on ALLIES (the "removes 5% ammo" mis-targeted)
//       — would force ally reloads and cut team damage. GREEN vs shipped (no such block → 0 ally reloads),
//       RED vs the consumeAmmo-on-allies counterfactual (ally reload events appear).
//   V2  "Full Charge while NOT in Full Burst" = shotFired + fbGate:'outFb' (the schema's canonical outFb
//       example is Velvet). For an SR in auto-play every trigger pull IS a full charge, so shotFired is the
//       faithful proxy for "Full Charge attack"; the outFb gate is the load-bearing clause. Two effects —
//       atkPct 30.5 (ATK bucket) AND attackDamagePct 30.5 (Damage-Up bucket) — NOT a collapsed atkPct 61.
//       Nearest-wrong (a): dropping the outFb gate (buff also refreshes on in-FB charges). Nearest-wrong (b):
//       collapsing both 30.5s into one doubled atkPct. Both discriminated (gate: 0 in-FB applies; collapse:
//       both distinct stats present at 30.5).
//   V3  "Full Charge DURING Full Burst" = shotFired + fbGate:'inFb' → all allies. "ATK ▲25.2% of the skill
//       user's ATK" = casterAtkPct — a FLAT add of 25.2% of VELVET's ATK (resolves to ~25133 at apply), NOT
//       atkPct (a 25.2% scaler on each ally's own ATK). "Charge Damage ▲100.8%" = chargeDamagePct (additive
//       points in the charge bucket), NOT chargeDamageMultPct (a base-charge multiplier). Nearest-wrong (a):
//       dropping the inFb gate (team buff up outside FB). (b) stat=atkPct (scales the carry's larger ATK →
//       big over-credit). (c) chargeDamageMultPct. All three discriminated. "All allies" INCLUDES velvet
//       herself (no "except self" clause) — reaches slots 0,1,2. NOTE (documented caveat, not asserted): the
//       team buff is kept alive by SWAPPED shots during velvet's own 10s burst weapon-swap — shotFired fires
//       on swap shots; whether the swap weapon "full-charges" is measurement-gated (override caveats).
//   V4  "after landing 50 normal attacks during Full Burst" = hitCount:50 + fbGate:'inFb' → self
//       attackDamagePct 15.03/5s + target flatDamage 400.92. An SR lands ~10 hits per FB window, so 50 in-FB
//       hits is unreachable in a 180s fight: the faithful encoding fires ZERO procs here (a non-vacuous
//       ABSENCE — the counterfactuals below fire). Nearest-wrong (a): dropping the fbGate — the cumulative
//       50-hit threshold then crosses OUT of FB and procs (2 out-of-FB procs vs 0). Nearest-wrong (b): the
//       draft's hitCount:100 fudge / a low threshold — lowering to 5 makes the proc fire 10× IN FB, each a
//       400.92% flatDamage (bucket skill) + a self 15.03% Attack Damage buff, proving the encoding WORKS when
//       the threshold is reachable. ⚑ cumulative-vs-in-FB-only counting + FB-reset convention is a documented
//       fidelity hypothesis (override note/caveats); both readings converge on 0 procs in this fixture.
//   V5  Burst = burstCast → self weaponSwap (damagePct 7, 10s) + attackDamagePct 34.52 (10s). The swap
//       REPLACES her SR: during each 10s burst window velvet fires low-mult swap shots at atkPct=7 (vs her
//       69.04 SR normal). "Additional Effect: Attack Damage ▲34.52% for 10 sec" = a self attackDamagePct buff
//       on BURST CAST (pre-FB), 600f. Nearest-wrong (a): fullBurstEnter keying — fires on EVERY team FB (5×)
//       including rotations a different B2 casts, not just velvet's own 10 casts. (b) duration ≠ 10s.
//       (c) weaponSwap damagePct ≠ 7 (swap shots at the wrong multiplier). All discriminated. ⚑ the swap
//       cadence/ammo/weapon-class are kit-silent (ALWAYS-⚑ #3) — a documented parser estimate (override
//       caveats), not a fabricated precision.
//
// Fixture: Velvet is Burst II, so a custom sole-B2 comp [liter(B1) / velvet(B2) / helm(B3)] is used (NOT
// controlComp, which would add crown as a second B2 and steal half her casts). Velvet is the sole Burst II →
// she casts every Full Burst cycle (10 casts over 180s) while the team completes 5 Full Bursts — so burstCast
// (10) ≠ fullBurstEnter (5), which is what lets the V5 trigger-identity assertion discriminate by count. Boss
// Iron (Velvet is Wind → clean ×1.10 advantaged; liter/helm neutral — irrelevant, every assertion filters on
// casterIdx === VELVET). Focus Velvet. Deterministic (no seed). Slot order: liter 0 / velvet 1 / helm 2.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const VEL = 1;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

const FIXTURE = {
  slugs: ['liter', 'velvet', 'helm'] as string[],
  bossElement: 'Iron' as const,
  focusSlug: 'velvet',
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
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const velBuffs = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === VEL &&
      b.stat === stat &&
      (value === undefined || b.value === value)
  );
const perTarget = (bs: BuffApply[], tgt: number) =>
  bs.filter((b) => b.targetIdx === tgt);
const velBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Extract<SimEvent, { kind: 'burstCast' }> =>
      e.kind === 'burstCast' && e.slug === 'velvet'
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart');
const velDamage = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage' && e.slug === 'velvet');

/** Full-burst windows [startFrame, endFrame] from the event stream. */
function fbWindows(evs: SimEvent[]): [number, number][] {
  const wins: [number, number][] = [];
  let start: number | null = null;
  for (const e of evs) {
    if (e.kind === 'fullBurstStart') {
      start = e.frame;
    }
    if (e.kind === 'fullBurstEnd' && start != null) {
      wins.push([start, e.frame]);
      start = null;
    }
  }
  return wins;
}
const countInFb = (bs: BuffApply[], wins: [number, number][]) =>
  bs.filter((b) => wins.some(([a, z]) => b.frame >= a && b.frame <= z)).length;

/** The 400.92% additional-damage rider (V4 proc). */
const procHits = (evs: SimEvent[]) =>
  velDamage(evs).filter((d) => d.srcSlot === 'skill2' && d.atkPct > 100);

// ---- counterfactual patches (nearest-wrong readings) -----------------------------------------
/** V1 inertness: strip Velvet's entire skill1 slot (the pouch + bullet-steal + self buff are all gone). */
const cfNoSkill1 = withPatchedOverride('velvet', (ov: any) => {
  ov.skill1 = [];
});
/** V1 nearest-wrong: the "removes 5% ammo" sign-flipped onto ALLIES (consumeAmmo on the team). */
const cfConsumeAllies = withPatchedOverride('velvet', (ov: any) => {
  ov.skill1 = [
    ...ov.skill1,
    {
      slot: 'skill1',
      trigger: { kind: 'shotFired' },
      target: { kind: 'allies' },
      effects: [{ kind: 'consumeAmmo', fraction: 0.05 }],
    },
  ];
});
/** The skill1 outFb self-buff block (V2 under test). */
const isS1SelfBuff = (b: any) =>
  b.trigger?.kind === 'shotFired' &&
  b.fbGate === 'outFb' &&
  b.effects?.some((e: any) => e.stat === 'atkPct' && e.value === 30.5);
/** V2 nearest-wrong (gate): drop the outFb gate (buff also refreshes on in-FB charges). */
const cfS1NoGate = withPatchedOverride('velvet', (ov: any) => {
  let hit = 0;
  for (const b of ov.skill1) {
    if (isS1SelfBuff(b)) {
      delete b.fbGate;
      hit++;
    }
  }
  if (!hit) {
    throw new Error(
      'velvet S1 outFb self-buff block missing — fixture is stale'
    );
  }
});
/** The skill2 inFb team-buff block (V3 under test). */
const isS2TeamBuff = (b: any) =>
  b.trigger?.kind === 'shotFired' &&
  b.fbGate === 'inFb' &&
  b.effects?.some((e: any) => e.stat === 'casterAtkPct');
/** V3 nearest-wrong (gate): drop the inFb gate (team buff up outside FB). */
const cfS2NoGate = withPatchedOverride('velvet', (ov: any) => {
  let hit = 0;
  for (const b of ov.skill2) {
    if (isS2TeamBuff(b)) {
      delete b.fbGate;
      hit++;
    }
  }
  if (!hit) {
    throw new Error(
      'velvet S2 inFb team-buff block missing — fixture is stale'
    );
  }
});
/** V3 nearest-wrong (stat): casterAtkPct → atkPct (a 25.2% scaler on each ally's OWN ATK). */
const cfS2AtkPct = withPatchedOverride('velvet', (ov: any) => {
  const b = ov.skill2.find((x: any) => isS2TeamBuff(x));
  if (!b) {
    throw new Error(
      'velvet S2 inFb team-buff block missing — fixture is stale'
    );
  }
  b.effects.find((e: any) => e.stat === 'casterAtkPct').stat = 'atkPct';
});
/** V3 nearest-wrong (stat): chargeDamagePct → chargeDamageMultPct (a base-charge multiplier). */
const cfS2ChargeMult = withPatchedOverride('velvet', (ov: any) => {
  const b = ov.skill2.find((x: any) => isS2TeamBuff(x));
  if (!b) {
    throw new Error(
      'velvet S2 inFb team-buff block missing — fixture is stale'
    );
  }
  b.effects.find((e: any) => e.stat === 'chargeDamagePct').stat =
    'chargeDamageMultPct';
});
/** The skill2 hitCount proc blocks (V4 under test — the rider + the self buff share the trigger). */
const isS2Proc = (b: any) => b.trigger?.kind === 'hitCount';
/** V4 nearest-wrong (gate): drop the inFb gate — the 50-hit threshold crosses OUT of FB and procs. */
const cfProcNoGate = withPatchedOverride('velvet', (ov: any) => {
  let hit = 0;
  for (const b of ov.skill2) {
    if (isS2Proc(b)) {
      delete b.fbGate;
      hit++;
    }
  }
  if (!hit) {
    throw new Error('velvet S2 hitCount proc block missing — fixture is stale');
  }
});
/** V4 nearest-wrong (threshold/effect): lower hitCount 50 → 5 so the proc fires in-FB (proves the encoding). */
const cfProcCount5 = withPatchedOverride('velvet', (ov: any) => {
  let hit = 0;
  for (const b of ov.skill2) {
    if (isS2Proc(b)) {
      b.trigger.count = 5;
      hit++;
    }
  }
  if (!hit) {
    throw new Error('velvet S2 hitCount proc block missing — fixture is stale');
  }
});
/** V5 nearest-wrong (trigger): burst attackDamage re-keyed burstCast → fullBurstEnter (5× not 10×). */
const cfBurstFbEnter = withPatchedOverride('velvet', (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects?.some(
      (e: any) => e.stat === 'attackDamagePct' && e.value === 34.52
    )
  );
  if (!b) {
    throw new Error(
      'velvet burst attackDamage block missing — fixture is stale'
    );
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
/** V5 nearest-wrong (duration): the 34.52% Attack Damage window shortened 10s → 3s. */
const cfBurstDur3 = withPatchedOverride('velvet', (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects?.some(
      (e: any) => e.stat === 'attackDamagePct' && e.value === 34.52
    )
  );
  if (!b) {
    throw new Error(
      'velvet burst attackDamage block missing — fixture is stale'
    );
  }
  b.effects.find(
    (e: any) => e.stat === 'attackDamagePct' && e.value === 34.52
  ).durationSec = 3;
});
/** V5 nearest-wrong (swap mult): weaponSwap damagePct 7 → 70 (swap shots at the wrong multiplier). */
const cfSwap70 = withPatchedOverride('velvet', (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects?.some((e: any) => e.kind === 'weaponSwap')
  );
  if (!b) {
    throw new Error('velvet burst weaponSwap block missing — fixture is stale');
  }
  b.effects.find((e: any) => e.kind === 'weaponSwap').damagePct = 70;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noSkill1 = run({ velvet: cfNoSkill1 });
const consumeAllies = run({ velvet: cfConsumeAllies });
const s1NoGate = run({ velvet: cfS1NoGate });
const s2NoGate = run({ velvet: cfS2NoGate });
const s2AtkPct = run({ velvet: cfS2AtkPct });
const s2ChargeMult = run({ velvet: cfS2ChargeMult });
const procNoGate = run({ velvet: cfProcNoGate });
const procCount5 = run({ velvet: cfProcCount5 });
const burstFbEnter = run({ velvet: cfBurstFbEnter });
const burstDur3 = run({ velvet: cfBurstDur3 });
const swap70 = run({ velvet: cfSwap70 });

const casts = velBursts(base.events).length; // Velvet's burst casts (10)
const fbs = fbStarts(base.events).length; // team Full Bursts (5)
const wins = fbWindows(base.events);

describe('velvet — kit spec', () => {
  describe('fixture sanity — Velvet casts her burst and the team reaches Full Burst', () => {
    it('Velvet casts >0 bursts and the team completes >0 Full Bursts (burst/FB-gated lines are not vacuous)', () => {
      expect(casts).toBeGreaterThan(0);
      expect(fbs).toBeGreaterThan(0);
      // sole-B2 comp: Velvet casts every cycle, so she casts at least as often as the team FBs
      expect(casts).toBeGreaterThanOrEqual(fbs);
    });
  });

  describe('V1 — S1 Bullet Snatch (pouch fill + enemy ammo removal) is UNMODELED and inert', () => {
    it('PIN: Velvet emits ZERO maxAmmo buffs (the pouch is never modeled as a binding resource)', () => {
      expect(
        buffs(base.events).filter(
          (b) =>
            b.casterIdx === VEL &&
            (b.stat === 'maxAmmoFlat' || b.stat === 'maxAmmoPct')
        ).length
      ).toBe(0);
    });
    it("PIN (inertness): stripping Velvet's whole skill1 leaves ALLY totals byte-identical (pouch never binds; bullet-steal moves nothing on the team)", () => {
      const b = totals(base.res);
      const n = totals(noSkill1.res);
      expect(n.liter).toBe(b.liter);
      expect(n.helm).toBe(b.helm);
    });
    it('DISCRIMINATING: a sign-flipped consumeAmmo on ALLIES (nearest-wrong) WOULD force extra ally reloads', () => {
      const baseReloads = base.events.filter(
        (e) => e.kind === 'reload' && e.slug !== 'velvet'
      ).length;
      const cfReloads = consumeAllies.events.filter(
        (e) => e.kind === 'reload' && e.slug !== 'velvet'
      ).length;
      expect(cfReloads).toBeGreaterThan(baseReloads);
    });
  });

  describe('V2 — S1 Full-Charge-outFb self ATK ▲30.5% + Attack Damage ▲30.5% for 3 sec (two distinct stats)', () => {
    const atk = velBuffs(base.events, 'atkPct', 30.5);
    const atkDmg = velBuffs(base.events, 'attackDamagePct', 30.5);
    it('fires per out-of-FB charge shot on Velvet only, 3s refresh, and NEVER inside Full Burst (outFb gate)', () => {
      expect(atk.length).toBeGreaterThan(0);
      expect(atkDmg.length).toBeGreaterThan(0);
      // self-only
      expect([...new Set(atk.map((b) => b.targetIdx))]).toEqual([VEL]);
      expect([...new Set(atkDmg.map((b) => b.targetIdx))]).toEqual([VEL]);
      // 3-second wall-clock window, refreshed per shot
      expect([...new Set(atk.map((b) => b.expiresFrame! - b.frame))]).toEqual([
        3 * FPS,
      ]);
      // outFb gate: ZERO applications land inside any Full Burst window
      expect(countInFb(atk, wins)).toBe(0);
      expect(countInFb(atkDmg, wins)).toBe(0);
    });
    it('DISCRIMINATING (gate): dropping outFb lets the buff refresh on in-FB charges (applications appear inside FB)', () => {
      expect(
        countInFb(
          velBuffs(s1NoGate.events, 'atkPct', 30.5),
          fbWindows(s1NoGate.events)
        )
      ).toBeGreaterThan(0);
    });
    it('DISCRIMINATING (collapse): the two 30.5s are DISTINCT stats (atkPct + attackDamagePct), not a single atkPct 61', () => {
      expect(velBuffs(base.events, 'atkPct', 61).length).toBe(0);
      expect(atk.length).toBeGreaterThan(0);
      expect(atkDmg.length).toBeGreaterThan(0);
    });
  });

  describe('V3 — S2 Full-Charge-inFb team buff: casterAtkPct 25.2 (flat) + chargeDamagePct 100.8, all allies, 3s', () => {
    const casterAtk = velBuffs(base.events, 'casterAtkPct');
    const chargeDmg = velBuffs(base.events, 'chargeDamagePct', 100.8);
    it("casterAtkPct is a FLAT add of Velvet's ATK (value >> a percentage), in FB only, reaching all three allies", () => {
      expect(casterAtk.length).toBeGreaterThan(0);
      // flat ATK add (≈25.2% of Velvet's ATK ≈ 25133), NOT a 25.2 percentage scaler
      expect(casterAtk.every((b) => b.value > 1000)).toBe(true);
      // inFb gate: every application lands inside a Full Burst window, none outside
      expect(countInFb(casterAtk, wins)).toBe(casterAtk.length);
      // all allies including self (slots 0,1,2)
      for (const tgt of [0, 1, 2]) {
        expect(perTarget(casterAtk, tgt).length).toBeGreaterThan(0);
      }
    });
    it('chargeDamagePct 100.8 is the additive charge bucket, in FB only, reaching all three allies, 3s', () => {
      expect(chargeDmg.length).toBeGreaterThan(0);
      expect(countInFb(chargeDmg, wins)).toBe(chargeDmg.length);
      expect([
        ...new Set(chargeDmg.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([3 * FPS]);
      for (const tgt of [0, 1, 2]) {
        expect(perTarget(chargeDmg, tgt).length).toBeGreaterThan(0);
      }
    });
    it('DISCRIMINATING (gate): dropping inFb lets the team buff apply OUTSIDE Full Burst', () => {
      const cf = velBuffs(s2NoGate.events, 'casterAtkPct');
      const cfWins = fbWindows(s2NoGate.events);
      expect(cf.length - countInFb(cf, cfWins)).toBeGreaterThan(0);
    });
    it('DISCRIMINATING (stat): atkPct (nearest-wrong) reports a 25.2 percentage, not a flat ATK add', () => {
      const cf = velBuffs(s2AtkPct.events, 'atkPct', 25.2);
      expect(cf.length).toBeGreaterThan(0);
      expect(cf.every((b) => b.value === 25.2)).toBe(true); // a scaler, value < 100
      expect(velBuffs(s2AtkPct.events, 'casterAtkPct').length).toBe(0);
    });
    it('DISCRIMINATING (stat): chargeDamageMultPct (nearest-wrong) is a different stat than the additive chargeDamagePct', () => {
      expect(
        velBuffs(s2ChargeMult.events, 'chargeDamagePct', 100.8).length
      ).toBe(0);
      expect(
        velBuffs(s2ChargeMult.events, 'chargeDamageMultPct', 100.8).length
      ).toBeGreaterThan(0);
    });
  });

  describe('V4 — S2 "50 normal attacks during FB" proc: self Attack Damage ▲15.03%/5s + target 400.92% flatDamage', () => {
    it('PIN (absence): the faithful hitCount:50+inFb proc fires ZERO times in 180s (an SR cannot land 50 in-FB hits)', () => {
      expect(procHits(base.events).length).toBe(0);
      expect(velBuffs(base.events, 'attackDamagePct', 15.03).length).toBe(0);
    });
    it('DISCRIMINATING (gate): dropping inFb lets the cumulative 50-hit threshold proc OUT of FB', () => {
      const hits = procHits(procNoGate.events);
      expect(hits.length).toBeGreaterThan(0);
      // those procs land OUTSIDE Full Burst (the gate is what suppresses them in the faithful encoding)
      const ngWins = fbWindows(procNoGate.events);
      expect(
        hits.filter((d) =>
          ngWins.some(([a, z]) => d.frame >= a && d.frame <= z)
        ).length
      ).toBe(0);
    });
    it('DISCRIMINATING (threshold+effect): lowering the count to 5 makes the proc fire IN FB — 400.92 flatDamage + self 15.03 buff', () => {
      const hits = procHits(procCount5.events);
      expect(hits.length).toBeGreaterThan(0);
      // each proc is 400.92% of final ATK (bucket skill), landing inside Full Burst
      expect(hits.every((d) => d.atkPct === 400.92)).toBe(true);
      const c5Wins = fbWindows(procCount5.events);
      expect(
        hits.filter((d) =>
          c5Wins.some(([a, z]) => d.frame >= a && d.frame <= z)
        ).length
      ).toBe(hits.length);
      // the companion self Attack Damage ▲15.03% / 5s buff fires with each proc
      const selfBuffs = velBuffs(procCount5.events, 'attackDamagePct', 15.03);
      expect(selfBuffs.length).toBeGreaterThan(0);
      expect([
        ...new Set(selfBuffs.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([5 * FPS]);
    });
  });

  describe('V5 — Burst: self weaponSwap (7% / 10s) + Attack Damage ▲34.52% for 10s, on BURST CAST', () => {
    const applied = velBuffs(base.events, 'attackDamagePct', 34.52);
    it('Attack Damage 34.52 is a self buff, once per Velvet cast, 10s (600f), on burstCast (not fullBurstEnter)', () => {
      expect(applied.length).toBe(casts);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([VEL]);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([10 * FPS]);
    });
    it('the weaponSwap REPLACES the SR: swap shots inside the burst window fire at atkPct=7 (vs 69.04 normals)', () => {
      const burstFrames = velBursts(base.events).map((e) => e.frame);
      const inSwap = (f: number) =>
        burstFrames.some((bf) => f >= bf && f <= bf + 10 * FPS);
      const normals = velDamage(base.events).filter(
        (d) => d.srcSlot === 'normal'
      );
      const swapShots = normals.filter(
        (d) => inSwap(d.frame) && d.atkPct === 7
      );
      const baseShots = normals.filter((d) => !inSwap(d.frame));
      expect(swapShots.length).toBeGreaterThan(0); // the swap weapon fires
      expect(baseShots.every((d) => d.atkPct === 69.04)).toBe(true); // her SR normal mult outside the swap
    });
    it('DISCRIMINATING (trigger): fullBurstEnter (nearest-wrong) fires on every team FB (fbs), not every Velvet cast (casts)', () => {
      expect(
        velBuffs(burstFbEnter.events, 'attackDamagePct', 34.52).length
      ).toBe(fbs);
      expect(
        velBuffs(burstFbEnter.events, 'attackDamagePct', 34.52).length
      ).not.toBe(casts);
    });
    it('DISCRIMINATING (duration): a 3s window (nearest-wrong) is shorter than the faithful 10s', () => {
      expect([
        ...new Set(
          velBuffs(burstDur3.events, 'attackDamagePct', 34.52).map(
            (b) => b.expiresFrame! - b.frame
          )
        ),
      ]).toEqual([3 * FPS]);
    });
    it('DISCRIMINATING (swap mult): damagePct 70 (nearest-wrong) puts swap shots at atkPct=70, not 7', () => {
      const burstFrames = velBursts(swap70.events).map((e) => e.frame);
      const inSwap = (f: number) =>
        burstFrames.some((bf) => f >= bf && f <= bf + 10 * FPS);
      const swap70Shots = velDamage(swap70.events).filter(
        (d) => d.srcSlot === 'normal' && inSwap(d.frame) && d.atkPct === 70
      );
      expect(swap70Shots.length).toBeGreaterThan(0);
      expect(
        velDamage(swap70.events).filter(
          (d) => d.srcSlot === 'normal' && inSwap(d.frame) && d.atkPct === 7
        ).length
      ).toBe(0);
    });
  });
});
