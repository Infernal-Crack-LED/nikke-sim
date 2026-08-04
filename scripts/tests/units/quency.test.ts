// PER-UNIT KIT SPEC — `quency` (Quency — SMG / Supporter / Electric / Burst II, cd 20s, ammo 120,
// hitsPerShot 2, rate_of_fire 1440rpm). Kit-autonomy gauntlet 2026-08-03. NOT the variant
// `quency-escape-queen` (SMG/Water/Burst III, "qeq") — a different unit; this spec reasons from the
// slug quency throughout (lint-slug-disambiguation advisory on the shared base-name resolved here).
//
// One assertion group per FAITHFUL kit line, asserted against the SHIPPED override loaded from disk.
// `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model each assertion
// must discriminate against) — never to supply the encoding under test.
//
// Kit (data/characters.json → characters['quency'].skills, lvl 10/10/10):
//   S1 "New Route" — after 60 normal attacks; affects SELF:
//        ■ Duplicates 12.42% of the Max HP of the Nikke with the highest Max HP, 10 sec  [L1 INERT]
//   S2 "Hidden Accomplice" — affects 2 ally unit(s) with the highest FINAL ATK (cd 8s):
//        ■ ATK ▲ 16.11% for 5 sec                                                       [L2 FAITHFUL]
//   BU "The Great Escape" — affects 2 ally unit(s) with the highest FINAL ATK:
//        ■ Max HP ▲ 43.87% for 5 sec                                                    [L3a INERT]
//        ■ Critical Damage ▲ 29.9% for 10 sec                                           [L3b FAITHFUL]
//
// L1 (S1 self HP-buffer grant) is modeled as hitCount-60 self casterMaxHpPct 12.42 dur 10 — a
//      temporary SELF HP-buffer. CROSS-FAMILY CONVERGED: both blind opus passes (S5 test + S6 override)
//      independently re-derived S1 as a self Max-HP buff; a shield reading was set aside (the sim can
//      consume neither a shield pool nor an ally-scaled HP source, so the convergent self-HP-grant is
//      faithful to every observable the engine models). It is DAMAGE-INERT (quency has no atkOfMaxHpPct
//      consumer, v1 models no damage-taken) but OBSERVABLE (it emits a self maxHpFlat), so it IS pinned:
//      trigger/cadence/self-target/10s duration + inertness. ⚑ BASIS: the kit's source is the
//      HIGHEST-Max-HP ally but no StatKey expresses an ally-scaled HP source, so casterMaxHpPct resolves
//      to % of quency's OWN Max HP (exact only when she holds the team's highest Max HP; inert either
//      way — completeness gap, not accuracy). ⚑ '60 normal attacks' hits-vs-pulls: engine hitCount counts
//      HITS (adds hitsPerShot per pull, sim.ts:3782), so count 60 = 60 hits = 30 pulls; if it means 60
//      SHOTS the threshold is 120 — inert either way.
//   L3a (burst Max HP ▲ 43.87%) is modeled (targetMaxHpPct dur 5) but DAMAGE-INERT: it converts to an
//      ally-granted maxHpFlat, and the engine excludes ally-granted maxHpFlat from live Max HP and
//      feeds atkOfMaxHpPct only when caster===target (self). It is pinned INDIRECTLY by the L3a/L3b
//      inertness discriminator below (removing the whole burst drops damage by EXACTLY the amount the
//      crit-damage line alone does — the Max-HP line contributes zero).
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   L2  atkPct 16.11 is scoped to the two highest-FINAL-ATK allies (byFinalAtk). Proven two ways:
//       (a) removing S2 drops the team total ~5.7% (the buff is live on the carries); (b) the NEAREST
//       WRONG model — the same buff scoped to SELF only — leaves the carries unbuffed, so the shipped
//       model provably beats it (base > self-only). The target set is pinned structurally: exactly two
//       distinct non-self allies, refreshed on the 8s internal cooldown for a 5s window each.
//   L3b critDamagePct 29.9 lifts the two buffed carries' crit multiplier. Removing it drops the team
//       total ~2.0%. It lands once per burst cast on two targets for 10s. The nearest wrong model —
//       crediting the whole burst's damage to something other than the crit-damage line — is refuted by
//       the L3a/L3b inertness discriminator: stripping the ENTIRE burst equals stripping ONLY the
//       crit-damage effect, so no other burst line carries damage.
//
// Fixture: a Burst-II fixture — quency is the SOLE B2, so she casts every Full Burst cycle. Control
// core liter (B1) opens the chain; emilia (B3) + helm (B3) are the two carries who rank highest final
// ATK and receive quency's buffs. Boss Fire (emilia/helm are Water → advantaged). Focus emilia.
// Deterministic (no seed). 180s.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** Fixture slot order: liter 0 / quency 1 / emilia 2 / helm 3. */
const QUENCY = 1;
const SLUGS = ['liter', 'quency', 'emilia', 'helm'];

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: SLUGS,
    bossElement: 'Fire',
    focusSlug: 'emilia',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}
const sum = (t: Record<string, number>) =>
  Object.values(t).reduce((a, b) => a + b, 0);

// ---- counterfactual / isolation patches -------------------------------------------------------
/** L2 reference: her entire S2 block removed. */
const noS2 = withPatchedOverride('quency', (ov) => {
  if (!ov.skill2.length) {
    throw new Error('quency S2 block missing — fixture is stale');
  }
  ov.skill2 = [];
});
/** L2 counterfactual (nearest wrong scope): the same ATK buff scoped to SELF only, not the two
 *  highest-final-ATK allies. The carries stay unbuffed, so it must under-perform the shipped model. */
const s2SelfOnly = withPatchedOverride('quency', (ov) => {
  for (const b of ov.skill2) {
    b.target = { kind: 'self' };
  }
});
/** L3b reference: strip ONLY the crit-damage effect from the burst (the Max-HP effect stays). */
const noCritDmg = withPatchedOverride('quency', (ov) => {
  let removed = 0;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.stat !== 'critDamagePct');
    removed += before - b.effects.length;
  }
  if (removed !== 1) {
    throw new Error('quency burst critDamagePct effect missing — fixture is stale');
  }
});
/** L3a/L3b inertness discriminator: remove the ENTIRE burst (both effects). If the Max-HP line is
 *  truly inert, this must equal noCritDmg exactly. */
const noBurstAll = withPatchedOverride('quency', (ov) => {
  if (!ov.burst.length) {
    throw new Error('quency burst block missing — fixture is stale');
  }
  ov.burst = [];
});
/** L1 reference: her entire S1 block removed (the self HP-buffer grant is inert). */
const noS1 = withPatchedOverride('quency', (ov) => {
  if (!ov.skill1.length) {
    throw new Error('quency S1 block missing — fixture is stale');
  }
  ov.skill1 = [];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const rNoS1 = run({ quency: noS1 });
const rNoS2 = run({ quency: noS2 });
const rS2Self = run({ quency: s2SelfOnly });
const rNoCrit = run({ quency: noCritDmg });
const rNoBurst = run({ quency: noBurstAll });

// ---- B2-contention arm (discriminates burstCast vs fullBurstEnter) --------------------------
// The primary fixture makes quency the SOLE B2, so burstCast and fullBurstEnter coincide there and
// the trigger identity is NOT discriminated. This second comp fields crown as a competing Burst II:
// crown wins the slot by priority, quency casts ZERO times, yet Full Bursts still happen — so a
// fullBurstEnter-keyed encoding would misfire its crit buff on every one of them while the shipped
// burstCast fires nothing (fable S2b flag, reconciled 2026-08-03).
const CONTEND_SLUGS = ['liter', 'crown', 'quency', 'helm'];
const CONTEND_Q = CONTEND_SLUGS.indexOf('quency');
function runContend(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({
    slugs: CONTEND_SLUGS,
    bossElement: 'Fire',
    focusSlug: 'helm',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events;
}
/** Nearest-wrong trigger: key the burst buffs to fullBurstEnter instead of quency's OWN cast. */
const burstFullBurstEnter = withPatchedOverride('quency', (ov) => {
  for (const b of ov.burst) {
    b.trigger = { kind: 'fullBurstEnter' };
  }
});
const contendBase = runContend();
const contendFBE = runContend({ quency: burstFullBurstEnter });
const contendQuencyCrit = (evs: SimEvent[]) =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.casterIdx === CONTEND_Q &&
      e.stat === 'critDamagePct' &&
      e.value === 29.9
  );

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** Buffs quency applied, optionally by stat + value. */
const quencyBuffs = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === QUENCY &&
      b.stat === stat &&
      (value === undefined || b.value === value)
  );
const quencyBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'quency'
  );
const distinctTargets = (bs: BuffApply[]) => [...new Set(bs.map((b) => b.targetIdx))];

describe('quency — kit spec', () => {
  describe('L1 — S1 self HP-buffer grant (after 60 normal attacks; casterMaxHpPct 12.42%, 10s; INERT)', () => {
    // casterMaxHpPct on self re-emits as a self maxHpFlat; S1 is the ONLY self-targeted one.
    const selfHp = quencyBuffs(base.events, 'maxHpFlat').filter(
      (b) => b.targetIdx === QUENCY
    );

    it('is a self grant on a hit counter that re-fires over the fight', () => {
      expect(selfHp.length, 'no S1 self maxHpFlat grant was applied').toBeGreaterThan(0);
      expect(selfHp.length, 'S1 must re-fire on the hit counter, not apply once').toBeGreaterThanOrEqual(3);
      for (const b of selfHp) {
        expect(b.targetIdx).toBe(QUENCY);
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('RED vs counterfactual: the line is ABSENT when S1 is removed', () => {
      expect(
        quencyBuffs(rNoS1.events, 'maxHpFlat').filter((b) => b.targetIdx === QUENCY)
      ).toHaveLength(0);
    });

    it('is damage-INERT — removing S1 moves no damage (quency has no HP→ATK consumer)', () => {
      expect(Math.abs(sum(base.totals) - sum(rNoS1.totals))).toBeLessThan(1);
    });
  });

  describe('L2 — S2 ATK ▲ 16.11% for 5 sec, to the 2 highest-final-ATK allies (interval 8s)', () => {
    const applied = quencyBuffs(base.events, 'atkPct', 16.11);
    const targets = distinctTargets(applied);

    it('is the kit magnitude, 5s window, single stack, applied by quency to allies', () => {
      expect(applied.length, 'no atkPct@16.11 buff was applied').toBeGreaterThan(0);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
        expect(b.maxStacks).toBe(1);
      }
    });

    it('is scoped to exactly TWO non-self allies (highest final ATK)', () => {
      expect(targets, 'expected exactly two distinct targets').toHaveLength(2);
      expect(targets).not.toContain(QUENCY);
      for (const t of targets) {
        expect(t).not.toBeNull();
      }
    });

    it('refreshes on the 8s internal cooldown (consecutive applications are 8s apart)', () => {
      const frames = [...new Set(applied.map((b) => b.frame))].sort((a, b) => a - b);
      expect(frames.length, 'S2 must fire repeatedly over the fight').toBeGreaterThanOrEqual(3);
      for (let i = 1; i < frames.length; i++) {
        expect(frames[i] - frames[i - 1]).toBe(8 * FPS);
      }
    });

    it('is LIVE — removing S2 drops the team total', () => {
      expect(sum(base.totals)).toBeGreaterThan(sum(rNoS2.totals));
    });

    it('DISCRIMINATING scope: the ally-targeted buff beats the nearest wrong model (self-only)', () => {
      // Shipped (ally-scoped) strictly out-performs self-only …
      expect(sum(base.totals)).toBeGreaterThan(sum(rS2Self.totals));
      // … and self-only still beats removing the line (quency's own ATK lift is not nothing),
      // bracketing the scope effect between the two wrong models.
      expect(sum(rS2Self.totals)).toBeGreaterThan(sum(rNoS2.totals));
    });

    it('DISCRIMINATING: the buffed carries each do more damage with S2 than without', () => {
      for (const t of targets) {
        const slug = SLUGS[t as number];
        expect(base.totals[slug], `${slug} should be lifted by S2`).toBeGreaterThan(
          rNoS2.totals[slug]
        );
      }
    });

    it('RED vs counterfactual: the line is ABSENT when S2 is removed', () => {
      expect(quencyBuffs(rNoS2.events, 'atkPct', 16.11)).toHaveLength(0);
    });

    it('RED vs counterfactual: under the self-only scope model the buff collapses to quency alone', () => {
      const selfApplied = quencyBuffs(rS2Self.events, 'atkPct', 16.11);
      expect(selfApplied.length).toBeGreaterThan(0);
      expect(distinctTargets(selfApplied)).toEqual([QUENCY]);
    });
  });

  describe('L3b — burst Critical Damage ▲ 29.9% for 10 sec, to the 2 highest-final-ATK allies', () => {
    const applied = quencyBuffs(base.events, 'critDamagePct', 29.9);
    const casts = quencyBursts(base.events);
    const targets = distinctTargets(applied);

    it('quency casts her burst (fixture precondition)', () => {
      expect(casts.length, 'quency never casts her burst').toBeGreaterThan(0);
    });

    it('is the kit magnitude, 10s window, scoped to two non-self allies', () => {
      expect(applied.length, 'no critDamagePct@29.9 buff was applied').toBeGreaterThan(0);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
      expect(targets).toHaveLength(2);
      expect(targets).not.toContain(QUENCY);
    });

    it('lands once per burst cast on each of the two targets', () => {
      // One application per target per cast.
      expect(applied.length).toBe(casts.length * 2);
      // Distinct application frames == distinct cast frames (fires with the cast, not on a timer).
      const applyFrames = new Set(applied.map((b) => b.frame));
      const castFrames = new Set(casts.map((c) => c.frame));
      expect(applyFrames.size).toBe(castFrames.size);
    });

    it('is LIVE — removing the crit-damage line drops the team total', () => {
      expect(sum(base.totals)).toBeGreaterThan(sum(rNoCrit.totals));
    });

    it('RED vs counterfactual: the line is ABSENT when the crit-damage effect is stripped', () => {
      expect(quencyBuffs(rNoCrit.events, 'critDamagePct', 29.9)).toHaveLength(0);
    });
  });

  describe('L3a — burst Max HP ▲ 43.87% is modeled but damage-INERT (targetMaxHpPct → ally-granted maxHpFlat, no feed)', () => {
    it('DISCRIMINATING inertness: stripping the ENTIRE burst equals stripping ONLY the crit-damage line', () => {
      // If the Max-HP line carried any damage, removing the whole burst would drop MORE than removing
      // only the crit-damage effect. They are equal (to floating-point) → the Max-HP line is inert.
      expect(Math.abs(sum(rNoBurst.totals) - sum(rNoCrit.totals))).toBeLessThan(1);
    });

    it('the burst Max-HP effect is still PRESENT in the shipped override (modeled, not dropped)', () => {
      // Structural: the base run carries an ALLY-granted maxHpFlat from quency (targetIdx != quency;
      // her S1 self maxHpFlat grant is filtered out), even though the burst line is inert.
      const maxHpGrants = quencyBuffs(base.events, 'maxHpFlat').filter(
        (b) => b.targetIdx !== QUENCY
      );
      expect(maxHpGrants.length, 'burst Max-HP grant should be applied').toBeGreaterThan(0);
      for (const b of maxHpGrants) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
        expect(b.targetIdx).not.toBeNull(); // an ally, not the boss
      }
    });
  });

  describe('burst trigger identity — burstCast (own B2 cast), NOT fullBurstEnter [crown-contention arm]', () => {
    const fbStarts = contendBase.filter((e) => e.kind === 'fullBurstStart');
    const qCasts = contendBase.filter(
      (e) => e.kind === 'burstCast' && e.slug === 'quency'
    );

    it('precondition: Full Bursts happen while crown wins the B2 slot (quency casts zero)', () => {
      expect(fbStarts.length, 'no Full Bursts in the contention comp').toBeGreaterThan(0);
      expect(qCasts.length, 'crown should out-prioritize quency for the B2 cast').toBe(0);
    });

    it('GREEN: the shipped burstCast fires NO crit buff on Full Bursts quency did not cast into', () => {
      expect(contendQuencyCrit(contendBase)).toHaveLength(0);
    });

    it('RED: a fullBurstEnter encoding would misfire its crit buff on those same Full Bursts', () => {
      expect(contendQuencyCrit(contendFBE).length).toBeGreaterThan(0);
    });
  });
});
