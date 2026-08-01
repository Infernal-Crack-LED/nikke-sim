// PER-UNIT KIT SPEC — `chime` (Chime, Supporter/SMG/Iron, Burst II, cd 20s). Kit-autonomy
// gauntlet 2026-07-31; test-first line-by-line spec.
//
// GREENFIELD NOTE: Chime shipped with NO override (simSupported:false) — before this gauntlet
// the unit could not sim at all (resolveSkills throws for prose-without-override). So the usual
// "RED vs shipped override" half is degenerate: the pre-override state is "does not run". The
// substance of the gate lives in the COUNTERFACTUAL half — every PIN below is GREEN vs the
// faithful encoding AND the nearest-wrong model (patched via withPatchedOverride) provably fails
// it, so each assertion discriminates rather than rubber-stamps.
//
// Kit (data/characters.json → characters.chime.skills, lvl-10 values):
//   S1 ■ start of battle → the king: Wish: ATK ▲46.46% OF THE SKILL USER'S ATK continuously   [C1]
//   S2 ■ entering Full Burst → the king: Daily Report: Normal Attack Damage Multiplier ▲46.22% / 10s [C2]
//   BU ■ all allies: Re-enters Burst Stage 2                                                    [C3a]
//      ■ all allies: Max Ammunition Capacity ▲20% for 10 sec                                    [C3b]
//      ■ the king: Loyalty: Attack Damage ▲92.44% for 10 sec                                    [C4]
//
// "THE KING" = the single ally with the highest ATK (word_group=10091). Modeled as
// alliesTopAtk count:1 with STATIC base-ATK ranking (no byFinalAtk — the kit says plain
// "the king"/highest ATK, not "final ATK"; the engine evaluates the ranking once at apply, so the
// designation is fixed at battle start). Chime is a low-ATK Supporter, never herself the king.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   C1  caster-basis, not target-basis: "46.46% of the SKILL USER'S ATK" is a FLAT add sized off
//       CHIME's ATK (casterAtkPct → engine resolves (46.46/100)×chime.staticAtk). The nearest-wrong
//       atkPct would size it off the KING's own ATK — ada's ATK dwarfs Chime's, so atkPct would
//       over-buff ada by ~8×. Proven two ways: the shipped stat IS casterAtkPct (not atkPct) and the
//       flat value tracks Chime's staticAtk; and the atkPct counterfactual moves ada's total. SCOPING:
//       exactly ONE target (the king), so the allies counterfactual (4 targets) must differ.
//   C2  normalAttackPct (scales the normal-attack multiplier), king-scoped, 46.22/10s, and fired on
//       FULL-BURST ENTRY — its apply frames coincide with fullBurstStart, not with Chime's (earlier,
//       mid-chain) stage-2 burstCast. The allies counterfactual over-buffs the whole team's normals.
//   C3a reenterStage stage:2 — the rotation HOLDS at stage 2 so a second eligible B2 also casts.
//       Behaviorally live only when Chime is picked first at stage 2 AND a 2nd B2 is present (comp C:
//       Chime slotted ahead of crown). With re-entry, crown casts at stage 2; remove it and Chime takes
//       stage 2 alone, the stage advances to 3, and crown NEVER casts — a binary, unmissable delta.
//   C3b maxAmmoPct 20/10s reaches ALL allies (a weapon-state modifier — more shots before reload).
//   C4  attackDamagePct 92.44/10s (Damage Up bucket), king-scoped; the allies counterfactual would
//       hand the whole team +92.44% Attack Damage.
//
// Fixtures (deterministic — no seed; event-log over totals where a line is scoping/timing-sensitive):
//   comp A ['liter','chime','ada','helm']  — Chime is the SOLE B2 → casts every rotation; king = ada
//          (highest staticAtk). Used for C1/C2/C3b/C4.
//   comp C ['liter','chime','crown','ada','helm'] — Chime slotted AHEAD of crown (the 2nd B2) so she
//          is picked first at stage 2 and the re-entry lets crown cast too. Used for C3a.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { runComp, unitOf, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

// ---- fixtures ---------------------------------------------------------------------------------
const COMP_A = ['liter', 'chime', 'ada', 'helm'];
const COMP_C = ['liter', 'chime', 'crown', 'ada', 'helm'];
const CHIME = 1; // chime's slot in BOTH comps

function run(slugs: string[], overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs,
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res };
}

// ---- counterfactual patches (nearest-wrong models each PIN must discriminate against) ---------

/** C1 nearest-wrong: S1 as a target-basis atkPct (% of the KING's own ATK) instead of
 *  caster-basis casterAtkPct (% of CHIME's ATK). */
const chimeS1AtkPct = withPatchedOverride('chime', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e) {
    throw new Error('chime S1 casterAtkPct missing — fixture is stale');
  }
  e.stat = 'atkPct';
});

/** C1/C2/C4 scoping nearest-wrong: every "the king" (alliesTopAtk) line widened to ALL allies. */
const chimeKingToAllies = withPatchedOverride('chime', (ov) => {
  let n = 0;
  for (const slot of ['skill1', 'skill2', 'burst']) {
    for (const b of ov[slot]) {
      if (b.target?.kind === 'alliesTopAtk') {
        b.target = { kind: 'allies' };
        n++;
      }
    }
  }
  if (n !== 3) {
    throw new Error(
      `expected 3 alliesTopAtk king lines, found ${n} — fixture is stale`
    );
  }
});

/** C3a nearest-wrong: the burst's "Re-enters Burst Stage 2" removed (it shares its block
 *  with maxAmmoPct, so strip the effect in place and confirm one was actually removed). */
const chimeNoReenter = withPatchedOverride('chime', (ov) => {
  let removed = 0;
  for (const b of ov.burst) {
    const n = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'reenterStage');
    removed += n - b.effects.length;
  }
  if (removed === 0) {
    throw new Error(
      'chime burst reenterStage effect missing — fixture is stale'
    );
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const baseA = run(COMP_A);
const s1AtkPctA = run(COMP_A, { chime: chimeS1AtkPct });
const kingAlliesA = run(COMP_A, { chime: chimeKingToAllies });
const baseC = run(COMP_C);
const noReenterC = run(COMP_C, { chime: chimeNoReenter });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const chimeBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === CHIME && b.stat === stat);
const casts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast');
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');
const distinctTargets = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.targetSlug))].sort();

/** The king, derived INDEPENDENTLY as the highest-staticAtk ally in the comp (the rule the
 *  alliesTopAtk encoding must follow) — not a hardcoded slug. */
function kingOf(slugs: string[], res: typeof baseA.res): string {
  let best = '';
  let bestAtk = -1;
  for (const s of slugs) {
    const atk = unitOf(res, s).staticAtk;
    if (atk > bestAtk) {
      bestAtk = atk;
      best = s;
    }
  }
  return best;
}
const KING_A = kingOf(COMP_A, baseA.res);

describe('chime — kit spec', () => {
  describe('fixture sanity', () => {
    it('the king is the highest-staticAtk ally (ada), and is not chime', () => {
      expect(KING_A).toBe('ada');
      expect(KING_A).not.toBe('chime');
    });
    it('chime casts her burst every rotation as the sole B2 (comp A)', () => {
      const n = casts(baseA.events).filter((c) => c.slug === 'chime').length;
      expect(n).toBeGreaterThan(5);
      expect(
        [
          ...new Set(
            casts(baseA.events)
              .filter((c) => c.slug === 'chime')
              .map((c) => c.stage)
          ),
        ],
        'chime is Burst II'
      ).toEqual([2]);
    });
  });

  describe('C1 — S1 Wish: the king gets ATK ▲46.46% of CHIME\u2019s ATK, continuously', () => {
    const applied = chimeBuffs(baseA.events, 'casterAtkPct');

    it('is a caster-basis flat add (casterAtkPct), sized off Chime\u2019s static ATK', () => {
      expect(applied.length, 'no S1 casterAtkPct buff applied').toBeGreaterThan(
        0
      );
      const chimeAtk = unitOf(baseA.res, 'chime').staticAtk;
      for (const b of applied) {
        expect(
          Math.abs(b.value - (chimeAtk * 46.46) / 100),
          `flat ATK ${b.value} should be 46.46% of chime staticAtk ${chimeAtk}`
        ).toBeLessThan(1);
      }
    });

    it('is continuous (no wall-clock expiry) and applied once (passive, start of battle)', () => {
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
      expect(applied.length).toBe(1);
    });

    it('reaches exactly ONE ally — the king (highest staticAtk)', () => {
      expect(distinctTargets(applied)).toEqual([KING_A]);
    });

    it('DISCRIMINATING: a target-basis atkPct sizes the buff off the king\u2019s own (far larger) ATK', () => {
      // atkPct value is the percentage itself (46.46), NOT the flat caster-sized number — and it
      // moves ada's total because ada's ATK dwarfs Chime's.
      const wrong = chimeBuffs(s1AtkPctA.events, 'atkPct');
      expect([...new Set(wrong.map((b) => b.value))]).toEqual([46.46]);
      const adaFaithful = unitOf(baseA.res, 'ada').totalDamage;
      const adaWrong = unitOf(s1AtkPctA.res, 'ada').totalDamage;
      expect(
        adaWrong,
        'atkPct (% of ada ATK) must over-buff ada vs casterAtkPct (% of chime ATK)'
      ).not.toBeCloseTo(adaFaithful, 0);
      expect(adaWrong).toBeGreaterThan(adaFaithful);
    });

    it('DISCRIMINATING: widening the king line to all allies changes the target set', () => {
      const widened = chimeBuffs(kingAlliesA.events, 'casterAtkPct');
      expect(distinctTargets(widened).length).toBe(COMP_A.length);
    });
  });

  describe('C2 — S2 Daily Report: the king gets Normal Attack Damage Multiplier ▲46.22% / 10s on FB entry', () => {
    const applied = chimeBuffs(baseA.events, 'normalAttackPct');

    it('is normalAttackPct 46.22 for exactly 10 sec', () => {
      expect(
        applied.length,
        'no S2 normalAttackPct buff applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([46.22]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('fires on FULL-BURST ENTRY — apply frames coincide with fullBurstStart, once per FB', () => {
      const fbFrames = fbStarts(baseA.events).map((f) => f.frame);
      expect(applied.length).toBe(fbFrames.length);
      const applyFrames = [...new Set(applied.map((b) => b.frame))].sort(
        (a, b) => a - b
      );
      for (const f of applyFrames) {
        expect(
          fbFrames.some((fb) => Math.abs(fb - f) <= 2),
          `S2 apply frame ${f} has no nearby fullBurstStart (${fbFrames.slice(0, 3)}...)`
        ).toBe(true);
      }
    });

    it('reaches exactly ONE ally — the king', () => {
      expect(distinctTargets(applied)).toEqual([KING_A]);
    });

    it('DISCRIMINATING: widening to all allies over-buffs the whole team\u2019s normals', () => {
      const widened = chimeBuffs(kingAlliesA.events, 'normalAttackPct');
      expect(distinctTargets(widened).length).toBe(COMP_A.length);
    });
  });

  describe('C3a — Burst: Re-enters Burst Stage 2 (a second B2 also casts)', () => {
    it('the shipped encoding carries a burstCast reenterStage stage:2 block', () => {
      const ov = loadOverride('chime')!;
      const has = (ov.burst ?? []).some(
        (b: any) =>
          b.trigger?.kind === 'burstCast' &&
          b.effects.some((e: any) => e.kind === 'reenterStage' && e.stage === 2)
      );
      expect(
        has,
        'no burstCast reenterStage:2 block in the shipped override'
      ).toBe(true);
    });

    it('BEHAVIORAL (comp C): with re-entry, crown also casts at stage 2', () => {
      const crownCasts = casts(baseC.events).filter(
        (c) => c.slug === 'crown' && c.stage === 2
      );
      expect(
        crownCasts.length,
        're-entry should let crown cast at stage 2 alongside chime'
      ).toBeGreaterThan(0);
    });

    it('DISCRIMINATING: without reenterStage, chime takes stage 2 alone and crown NEVER casts', () => {
      const crownCasts = casts(noReenterC.events).filter(
        (c) => c.slug === 'crown'
      );
      expect(
        crownCasts.length,
        'removing re-entry bumps crown to stage 3 — it should never cast'
      ).toBe(0);
      // and chime still casts (she is the stage-2 pick), so the delta is purely the re-entry
      expect(
        casts(noReenterC.events).filter((c) => c.slug === 'chime').length
      ).toBeGreaterThan(0);
    });
  });

  describe('C3b — Burst: all allies Max Ammunition Capacity ▲20% for 10 sec', () => {
    const applied = chimeBuffs(baseA.events, 'maxAmmoPct');

    it('is maxAmmoPct 20 for 10 sec, reaching ALL allies, once per burst cast', () => {
      expect(
        applied.length,
        'no burst maxAmmoPct buff applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([20]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
      expect(distinctTargets(applied)).toEqual([...COMP_A].sort());
      // one application per ally per chime burst cast
      const chimeCasts = casts(baseA.events).filter(
        (c) => c.slug === 'chime'
      ).length;
      expect(applied.length).toBe(chimeCasts * COMP_A.length);
    });
  });

  describe('C4 — Burst Loyalty: the king gets Attack Damage ▲92.44% for 10 sec', () => {
    const applied = chimeBuffs(baseA.events, 'attackDamagePct');

    it('is attackDamagePct 92.44 for 10 sec, once per burst cast', () => {
      expect(
        applied.length,
        'no burst attackDamagePct buff applied'
      ).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([92.44]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
      const chimeCasts = casts(baseA.events).filter(
        (c) => c.slug === 'chime'
      ).length;
      expect(applied.length).toBe(chimeCasts);
    });

    it('reaches exactly ONE ally — the king', () => {
      expect(distinctTargets(applied)).toEqual([KING_A]);
    });

    it('DISCRIMINATING: widening Loyalty to all allies would hand the whole team +92.44% AD', () => {
      const widened = chimeBuffs(kingAlliesA.events, 'attackDamagePct');
      expect(distinctTargets(widened).length).toBe(COMP_A.length);
    });
  });
});
