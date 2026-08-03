// PER-UNIT KIT SPEC — `n102` (N102, RL/Supporter/Water, Burst I, cd 20s, ammo 6, chargeFrames 90).
// Kit-autonomy gauntlet 2026-08-02 — test-first re-derivation.
//
// N102 is a PURE single-target buffer: she has NO personal-damage lines (no riders / DoTs / nukes).
// Her entire kit is three grants, so the whole assertable surface is the buffApply events she emits —
// their STAT, VALUE, DURATION, TARGET SET, and CADENCE. One assertion group per kit line (N1..N5).
// `withPatchedOverride` builds COUNTERFACTUALS only (the nearest wrong model each PIN must
// discriminate against) — never the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.n102.skills):
//   S1 ■ on Full Charge attack → 1 highest-final-ATK ally: Max Ammunition Capacity ▲3 / 10s   [N1,N2,N3]
//                                       Critical Damage ▲10.34% / 10s
//   S2 ■ (15s CD) → 1 highest-final-ATK ally: Charge Damage ▲25.84% / 5s                      [N4]
//   BU ■ (burstCast) → all allies: ATK ▲25.86% / 10s                                          [N5]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   N1  S1 fires on EVERY full charge (shotFired — RL fires only full-charge shots), so the
//       application count equals her shot count. A burst-only or interval encoding would land near
//       the burst count (9) or a 15s cadence (11), not the 79-shot cadence.
//   N2  the S1 grants are SCOPED to the single highest-final-ATK ally. Proven two ways: shipped
//       reaches EXACTLY ONE target (helm, the 600-ATK carry) and the unscoped counterfactual
//       (target:allies) reaches all three — i.e. the shipped assertion is one the generic model
//       provably fails.
//   N3  'Max Ammunition Capacity ▲ 3' is a FLAT round count (maxAmmoFlat 3), not a percent
//       (maxAmmoPct). The stat identity + integer value are pinned; a percent encoding would be a
//       different stat entirely.
//   N4  S2 is a 15s-CD skill (interval 15s, first fire t=15): applications land on a 900-frame
//       grid, NOT at burst frames and NOT once-at-t=0 (passive). Scoped to one ally like S1.
//   N5  the burst ATK grant reaches ALL allies (including self). A scoped/self counterfactual
//       reaches one — the shipped per-cast application count is bursts × team-size.
//
// Fixture: [n102 (B1) / crown (B2) / helm (B3)] — a complete burst chain with N102 the SOLE B1, so
// she casts every Full Burst (9 casts / 180s); helm (base ATK 600 > n102 450 > crown 400) is the
// unambiguous highest-final-ATK target for the scoped grants. boss Fire (helm Water → advantaged),
// focus helm (charge weapon → ×2.5 gauge). Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** comp slot order: n102 0 / crown 1 / helm 2. */
const N102 = 0;
const HELM = 2;
const TEAM = 3;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({
    slugs: ['n102', 'crown', 'helm'],
    bossElement: 'Fire',
    focusSlug: 'helm',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events;
}

// ---- counterfactuals (nearest wrong model each PIN discriminates against) ---------------------
/** N2 counterfactual: S1 grants as GENERIC all-allies buffs (drop the highest-ATK scope). */
const n102S1Unscoped = withPatchedOverride('n102', (ov) => {
  const t = ov.skill1[0]?.target;
  if (t?.kind !== 'alliesTopAtk') {
    throw new Error('n102 S1 alliesTopAtk target missing — fixture is stale');
  }
  ov.skill1[0].target = { kind: 'allies' };
});
/** N4 counterfactual: S2 grant as a generic all-allies buff. */
const n102S2Unscoped = withPatchedOverride('n102', (ov) => {
  const t = ov.skill2[0]?.target;
  if (t?.kind !== 'alliesTopAtk') {
    throw new Error('n102 S2 alliesTopAtk target missing — fixture is stale');
  }
  ov.skill2[0].target = { kind: 'allies' };
});
/** N5 counterfactual: burst ATK grant scoped to one ally instead of all. */
const n102BurstScoped = withPatchedOverride('n102', (ov) => {
  const t = ov.burst[0]?.target;
  if (t?.kind !== 'allies') {
    throw new Error('n102 burst allies target missing — fixture is stale');
  }
  ov.burst[0].target = { kind: 'alliesTopAtk', count: 1, byFinalAtk: true };
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const s1Unscoped = run({ n102: n102S1Unscoped });
const s2Unscoped = run({ n102: n102S2Unscoped });
const burstScoped = run({ n102: n102BurstScoped });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const n102Buffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === N102 && b.stat === stat);
const distinctTargets = (bs: BuffApply[]) =>
  [
    ...new Set(
      bs.map((b) => b.targetIdx).filter((t): t is number => t != null)
    ),
  ].sort((a, b) => a - b);
const distinctFrames = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.frame))].sort((a, b) => a - b);
const n102Shots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'n102');
const n102Bursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'n102');

describe('n102 — kit spec', () => {
  describe('N1 — S1 fires on every Full Charge attack (RL shots are full charges)', () => {
    it('applies the S1 crit-damage grant once per shot, not per burst or per interval', () => {
      const applies = n102Buffs(base, 'critDamagePct').length;
      const shots = n102Shots(base).length;
      const bursts = n102Bursts(base).length;
      expect(shots).toBeGreaterThan(0);
      expect(
        applies,
        `${applies} critDamagePct applies vs ${shots} shots / ${bursts} bursts — a burst/interval ` +
          'trigger would land near the burst or 15s count, not the shot count'
      ).toBe(shots);
    });
  });

  describe('N2 — S1 grants are scoped to the single highest-final-ATK ally', () => {
    const crit = n102Buffs(base, 'critDamagePct');
    const ammo = n102Buffs(base, 'maxAmmoFlat');

    it('reach EXACTLY ONE ally — the highest-final-ATK carry (helm), for 10 sec', () => {
      expect(crit.length).toBeGreaterThan(0);
      expect(distinctTargets(crit)).toEqual([HELM]);
      expect(distinctTargets(ammo)).toEqual([HELM]);
      expect([...new Set(crit.map((b) => b.value))]).toEqual([10.34]);
      for (const b of [...crit, ...ammo]) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING: an unscoped (all-allies) S1 would reach the whole team', () => {
      expect(distinctTargets(n102Buffs(s1Unscoped, 'critDamagePct')).length).toBe(
        TEAM
      );
      expect(distinctTargets(n102Buffs(s1Unscoped, 'maxAmmoFlat')).length).toBe(
        TEAM
      );
    });
  });

  describe('N3 — S1 Max Ammunition Capacity is a FLAT +3 rounds (maxAmmoFlat), not a percent', () => {
    it('is the integer flat-round encoding at the kit magnitude', () => {
      const ammo = n102Buffs(base, 'maxAmmoFlat');
      expect(ammo.length).toBeGreaterThan(0);
      expect([...new Set(ammo.map((b) => b.value))]).toEqual([3]);
    });
  });

  describe('N4 — S2 is a 15s-CD Charge Damage grant, scoped to one ally', () => {
    const cd = n102Buffs(base, 'chargeDamagePct');

    it('is 25.84% for 5 sec on the highest-final-ATK ally', () => {
      expect(cd.length).toBeGreaterThan(0);
      expect([...new Set(cd.map((b) => b.value))]).toEqual([25.84]);
      expect(distinctTargets(cd)).toEqual([HELM]);
      for (const b of cd) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
    });

    it('fires on a 15s grid starting at t=15 (interval CD, not burst-cast, not passive)', () => {
      const frames = distinctFrames(cd);
      expect(frames.length).toBeGreaterThanOrEqual(10);
      expect(frames[0], 'first fire must be at t=15s (the CD), not t=0').toBe(
        15 * FPS
      );
      for (let i = 1; i < frames.length; i++) {
        expect(
          frames[i] - frames[i - 1],
          `gap ${frames[i] - frames[i - 1]}f between fires ${i - 1}/${i} — expected 900f (15s)`
        ).toBe(15 * FPS);
      }
    });

    it('DISCRIMINATING: an unscoped (all-allies) S2 would reach the whole team', () => {
      expect(
        distinctTargets(n102Buffs(s2Unscoped, 'chargeDamagePct')).length
      ).toBe(TEAM);
    });
  });

  describe('N5 — burst ATK grant reaches ALL allies (including self)', () => {
    const atk = n102Buffs(base, 'atkPct');

    it('is 25.86% for 10 sec, applied once per cast to every ally', () => {
      const bursts = n102Bursts(base).length;
      expect(bursts).toBeGreaterThan(0);
      expect([...new Set(atk.map((b) => b.value))]).toEqual([25.86]);
      expect(atk.length).toBe(bursts * TEAM);
      for (const b of atk) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('reaches all three allies on every cast', () => {
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of atk) {
        (
          perFrame.get(b.frame) ??
          perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx);
      }
      for (const [frame, holders] of perFrame) {
        expect(
          holders.size,
          `frame ${frame} reached ${holders.size} allies, expected ${TEAM}`
        ).toBe(TEAM);
        for (const idx of [0, 1, 2]) {
          expect(holders.has(idx), `frame ${frame} missing ally ${idx}`).toBe(
            true
          );
        }
      }
    });

    it('DISCRIMINATING: a scoped/self burst would reach one ally, not the team', () => {
      expect(
        distinctTargets(n102Buffs(burstScoped, 'atkPct')).length
      ).toBe(1);
    });
  });
});
