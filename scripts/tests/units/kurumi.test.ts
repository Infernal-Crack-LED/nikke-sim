// PER-UNIT KIT SPEC — `kurumi` (Kurumi, Supporter/AR/Iron, Burst I, cd 20s, ammo 60, AR 720rpm).
// Kit-autonomy gauntlet 2026-08-02 — FROM-SCRATCH model (no shipped override existed; every line
// below is a MISSING-line assertion, RED against the absent override, GREEN once src/skills/overrides/
// kurumi.json lands). Owner-driven line-by-line spec; cross-family S2b/S5/S6/S7 corroboration pending.
//
// Kit (blablalink prose, data/characters.json → characters.kurumi.skills):
//   S1 "Malicious Code Injection" — TWO triggers, BOTH inflict the same Hacked DoT:
//      ■ after landing 36 normal attack(s) → the target:                                   [K2]
//      ■ when using Burst Skill → all enemies:                                             [K3]
//          Hacked: 52.24% of final ATK as sustained damage every 1 sec for 5 sec           [K4 magnitude/ticks]
//          (each application also opens a 5s 'Hacked' status window on the boss)
//   S2 "Payload Diffusion":
//      ■ during Full Burst, after landing 36 normal attack(s), while target is Hacked →    [K5]
//          the target: 86.17% of final ATK as additional damage
//   BU "Defense Protocol Breakdown":
//      ■ all enemies: Damage Taken ▲18.06% for 10 sec                                      [K1]
//
// Engine primitives used (all pre-existing — NO engine edit): hitCount:36 (counts normal-attack
// shots; AR hitsPerShot=1), `dot` (sustained, 1s interval / 5s = 5 ticks, crit-eligible at caster
// rate per the DOT_CRIT default the kit does not exempt), `targetStatus 'Hacked'` + the
// `requiresTargetStatus` block gate, `fbGate:'inFb'`, and `damageTakenPct` on the enemy (feeds the
// engine's `taken` multiplier → amplifies ALL damage dealt to the boss while active).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   K1  damageTakenPct is a DEBUFF ON THE BOSS, not a self/ally buff: removing it must lower EVERY
//       unit's total (the whole team hits harder while it is up), and the buff event must carry the
//       kit magnitude 18.06 (not the level-1 base 10.67) for exactly 10s (600f), one per burst cast.
//   K2  the 36-normal-attack trigger is the DOMINANT DoT source: removing ONLY that block collapses
//       the skill1 ticks to the burst-only floor (≤ 5 per burst), i.e. base ticks >> burst-only.
//   K3  the burst-cast trigger is independently live: removing ONLY it drops the skill1 ticks by
//       EXACTLY 5 per burst (one 5-tick DoT per cast) — not "roughly", exactly.
//   K4  the DoT is a 5-TICK sustained DoT, not a single instant hit: total ticks ≈ 5 × the number of
//       applications (bursts + ⌊normalHits/36⌋), bounded above by 5× and below by 5× minus end-of-fight
//       truncation. Every tick is exactly 52.24% (a wrong magnitude — 30.87 base, or a 261.2 "total"
//       misread — fails).
//   K5  S2 is triply gated. (a) magnitude 86.17, crit-eligible rider. (b) FB-gated: every proc lands
//       inside FB (fbMajorApplied), and removing fbGate makes procs appear OUTSIDE FB and raises the
//       count to exactly ⌊normalHits/36⌋ (it then fires on EVERY 36-hit multiple — proving the counter
//       is 36 and the FB gate is what restricts it). (c) Hacked-gated: removing the status APPLICATION
//       (not the gate) drops the proc count to ZERO — the Hacked status is load-bearing for S2.
//
// MODELED-BUT-REDUNDANT ⚑: the `requiresTargetStatus 'Hacked'` GATE on S2 is faithfully encoded but
// behaviorally redundant in THIS fixture — the burstCast trigger (K3) keeps Hacked up across almost
// every FB window, so deleting the gate alone changes nothing (verified: 25 procs either way). The
// status mechanic is therefore discriminated via the APPLICATION removal (K5c → 0 procs), not the gate
// removal. S2's exact proc COUNT (25 here) is timing-sensitive (a 36-hit multiple must land inside a
// FB window while Hacked is up) and is NOT footage-pinned; the magnitude + the three gate encodings
// are faithful to prose. The Iron "Code: D.M.T.R." +10%-vs-Electric line is a global element-wheel
// mechanic, not a kit block — inert vs the Fire boss here and not asserted.
//
// Fixture: kurumi (B1) / crown (B2) / ada (B3) / helm (B3), boss Fire, focus ada — kurumi needs a real
// rotation to cast her burst (a lone Burst I unit still chains with the B2/B3 pair). Kurumi cd 20s
// covers B1 alone; crown covers B2; ada+helm (40s pair) cover B3. Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['kurumi', 'crown', 'ada', 'helm'] as const;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** K1 reference: her burst damage-taken debuff removed entirely. */
const kurumiNoDt = withPatchedOverride('kurumi', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'damageTakenPct'));
  if (ov.burst.length === before) {
    throw new Error(
      'kurumi burst damageTakenPct block missing — fixture is stale'
    );
  }
});
/** K2 reference: S1's 36-normal-attack (hitCount) Hacked block removed. */
const kurumiNoS1A = withPatchedOverride('kurumi', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => b.trigger.kind !== 'hitCount');
  if (ov.skill1.length === before) {
    throw new Error('kurumi S1 hitCount block missing — fixture is stale');
  }
});
/** K3 reference: S1's burst-cast Hacked block removed. */
const kurumiNoS1B = withPatchedOverride('kurumi', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => b.trigger.kind !== 'burstCast');
  if (ov.skill1.length === before) {
    throw new Error('kurumi S1 burstCast block missing — fixture is stale');
  }
});
/** K5b counterfactual: S2 with its Full Burst gate deleted (fires on any 36-hit multiple). */
const kurumiNoFbGate = withPatchedOverride('kurumi', (ov) => {
  let touched = false;
  ov.skill2.forEach((b: any) => {
    if (b.fbGate) {
      delete b.fbGate;
      touched = true;
    }
    if (b.trigger?.countScope === 'gated') {
      delete b.trigger.countScope;
      touched = true;
    }
  });
  if (!touched) {
    throw new Error('kurumi S2 fbGate/countScope missing — fixture is stale');
  }
});
/** K5c isolation: S1's Hacked status APPLICATION removed (DoT kept) — the boss never becomes
 *  Hacked, so S2's requiresTargetStatus gate can never open. Proves the status is load-bearing. */
const kurumiNoStatusApply = withPatchedOverride('kurumi', (ov) => {
  let touched = false;
  ov.skill1.forEach((b: any) => {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'targetStatus');
    if (b.effects.length !== before) {
      touched = true;
    }
  });
  if (!touched) {
    throw new Error('kurumi S1 targetStatus effect missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noDt = run({ kurumi: kurumiNoDt });
const noS1A = run({ kurumi: kurumiNoS1A });
const noS1B = run({ kurumi: kurumiNoS1B });
const noFbGate = run({ kurumi: kurumiNoFbGate });
const noStatusApply = run({ kurumi: kurumiNoStatusApply });

// ---- readers ----------------------------------------------------------------------------------
const kurumiDmg = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === 'kurumi' && e.srcSlot === srcSlot
  );
const kurumiNormals = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Damage =>
      e.kind === 'damage' && e.slug === 'kurumi' && e.bucket === 'normal'
  );
const kurumiBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'kurumi'
  );
const dtBuffs = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BuffApply => e.kind === 'buffApply' && e.stat === 'damageTakenPct'
  );
/** ⌊normalHits / 36⌋ — the most often a hitCount:36 block can fire this fight. */
const counterMultiples = (evs: SimEvent[]) =>
  Math.floor(kurumiNormals(evs).length / 36);

describe('kurumi — kit spec', () => {
  describe('K1 — burst inflicts Damage Taken ▲18.06% on all enemies for 10s (a boss debuff)', () => {
    const applied = dtBuffs(base.events);

    it('is the kit magnitude 18.06 for exactly 10s, once per burst cast', () => {
      expect(kurumiBursts(base.events).length).toBeGreaterThan(0);
      expect(applied.length).toBe(kurumiBursts(base.events).length);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([18.06]);
      expect([
        ...new Set(applied.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([10 * FPS]);
    });

    it("is LIVE and team-wide: removing it lowers every unit's total", () => {
      for (const s of SLUGS) {
        expect(
          base.totals[s],
          `${s} total did not drop when the damage-taken debuff was removed`
        ).toBeGreaterThan(noDt.totals[s]);
      }
    });
  });

  describe('K2 — S1 36-normal-attack trigger is the dominant Hacked-DoT source', () => {
    it('every skill1 tick is exactly 52.24% in the skill bucket', () => {
      const ticks = kurumiDmg(base.events, 'skill1');
      expect(ticks.length).toBeGreaterThan(0);
      expect([...new Set(ticks.map((d) => d.atkPct))]).toEqual([52.24]);
      expect([...new Set(ticks.map((d) => d.bucket))]).toEqual(['skill']);
    });

    it('removing ONLY the 36-hit trigger collapses ticks to the burst-only floor', () => {
      const baseTicks = kurumiDmg(base.events, 'skill1').length;
      const bursts = kurumiBursts(base.events).length;
      const s1aOnly = kurumiDmg(noS1A.events, 'skill1').length;
      expect(
        s1aOnly,
        'without the 36-hit trigger, only the burst-cast applications remain (≤ 5 ticks each)'
      ).toBeLessThanOrEqual(bursts * 5);
      expect(baseTicks).toBeGreaterThan(s1aOnly * 3);
    });
  });

  describe('K3 — S1 burst-cast trigger independently applies one 5-tick Hacked DoT per cast', () => {
    it('removing ONLY the burst-cast trigger drops the ticks by exactly 5 per burst', () => {
      const baseTicks = kurumiDmg(base.events, 'skill1').length;
      const bursts = kurumiBursts(base.events).length;
      const s1bOnly = kurumiDmg(noS1B.events, 'skill1').length;
      expect(baseTicks - s1bOnly).toBe(bursts * 5);
    });
  });

  describe('K4 — the Hacked DoT is a 5-tick sustained DoT (every 1s for 5s), not an instant hit', () => {
    it('total ticks ≈ 5 × the number of applications (bursts + ⌊normalHits/36⌋)', () => {
      const ticks = kurumiDmg(base.events, 'skill1').length;
      const bursts = kurumiBursts(base.events).length;
      const applications = bursts + counterMultiples(base.events);
      expect(
        ticks,
        `${ticks} ticks vs ${applications} applications — an instant hit would be ~${applications}`
      ).toBeGreaterThan(applications * 4);
      expect(ticks).toBeLessThanOrEqual(applications * 5);
    });
  });

  describe('K5 — S2 86.17% additional damage, gated by counter + Full Burst + Hacked', () => {
    const riders = kurumiDmg(base.events, 'skill2');

    it('is the kit magnitude 86.17, a crit-eligible skill-bucket rider', () => {
      expect(riders.length).toBeGreaterThan(0);
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([86.17]);
      expect([...new Set(riders.map((d) => d.bucket))]).toEqual(['skill']);
      expect(riders.every((d) => d.critEligible)).toBe(true);
    });

    it('is FB-gated: every proc lands inside Full Burst', () => {
      expect(riders.every((d) => d.fbMajorApplied)).toBe(true);
    });

    it('DISCRIMINATING: removing the FB gate spills procs outside FB and lifts the count to every 36-hit multiple', () => {
      const ungated = kurumiDmg(noFbGate.events, 'skill2');
      expect(
        ungated.filter((d) => !d.fbMajorApplied).length,
        'an ungated S2 must produce out-of-FB procs'
      ).toBeGreaterThan(0);
      expect(ungated.length).toBeGreaterThan(riders.length);
      expect(ungated.length).toBe(counterMultiples(noFbGate.events));
    });

    it('is counter-bounded: it can never fire more often than once per 36 hits', () => {
      expect(riders.length).toBeLessThanOrEqual(counterMultiples(base.events));
    });

    it('is Hacked-gated: removing the status APPLICATION (not the gate) kills every proc', () => {
      expect(kurumiDmg(noStatusApply.events, 'skill2').length).toBe(0);
    });
  });
});
