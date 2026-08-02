// PER-UNIT KIT SPEC — `avistar` (Avistar, Elysion MG Supporter, Electric, Burst I, cd 20s, ammo 300).
// Kit-autonomy gauntlet 2026-08-01 (from-scratch build — no prior override; the override and this
// spec are co-authored, so the test-first rigour lives in the COUNTERFACTUAL discrimination: every
// load-bearing assertion must FAIL under the nearest-wrong model).
//
// One assertion group per KIT LINE (A1..A5 on the single-B1 fixture, B1 on the double-B1 fixture),
// asserted against the SHIPPED override loaded from disk. `withPatchedOverride` appears only to build
// COUNTERFACTUALS (the nearest wrong model each assertion discriminates against).
//
// Kit (blablalink prose, data/characters.json → characters.avistar.skills):
//   S1 ■ when Full Burst ends → her favorite pop star: Aftershow ATK ▲80.26% OF AVISTAR'S ATK,   [A1]
//                                                removed when entering Full Burst (NOT enacted ⚑1)
//      ■ when Full Burst ends → self: recovers 3.52% final Max HP every 1s for 10s; removes Stargazer [A4]
//   S2 ■ entering Full Burst while in Stargazer (>25% HP) → self: Current HP ▼20%                [A5]
//      ■ entering Full Burst while in Stargazer → favorite pop star: Projectile Explosion Damage ▲40.13% [A2]
//                                                + Attack Damage ▲40.13%, both continuously
//   BU ■ all allies: Re-enters Burst Stage 1                                                     [B1]
//      ■ self: Stargazer Max HP ▲26.4% of skill user's Max HP continuously                       [A3]
//
// FAVORITE POP STAR = the single highest-ATK ally (alliesTopAtk count:1, STATIC base-ATK ranking —
// the chime 'the king' precedent). In FIX_A ada/helm TIE for highest ATK; the engine slices to exactly
// ONE (lowest idx), which the spec asserts (count:1, not 'all highest-ATK').
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates nothing):
//   A1  caster-basis: the flat ATK add is 0.8026 × AVISTAR.staticAtk (a Supporter), NOT 0.8026 × the
//       carry's own ATK. atkPct (the nearest wrong) would resolve to a percent of the carry and move the
//       carry's total differently — proven on the buff VALUE (flat ≈80046, not 80.26) and on damage.
//   A2  scoped count:1 — the two buffs reach exactly ONE ally even though two allies tie for top ATK;
//       the 'all allies' counterfactual reaches 4. The Attack Damage 40.13 is the live Damage-Up bucket
//       (lifts the carry's total); Projectile Explosion is applied-but-inert on a non-explosive carry.
//   A3  Stargazer Max HP is OFFENSIVELY INERT (self Max HP, no atkOfMaxHpPct consumer): removing it
//       changes NO unit's total by a point, yet the buff is present at the kit value on self (SSOT).
//   A4  self-heal: modeled (heal ticks:10) but UNOBSERVABLE — self-targeted, fires only Avistar's own
//       (nonexistent) recovery triggers, and recovery is not logged; no HP pool. No assertion (documented).
//   A5  S2 self HP▼20% (>25% gate): UNMODELED — no HP pool, inert. No assertion (documented).
//   B1  reenterStage holds stage 1 so a SECOND B1 (liter) casts in the same chain, exactly one
//       STAGE_CAST_GAP (30f) after Avistar (the tia T6 pattern). Removed → liter gets no chain-1 window.
//
// Fixtures (deterministic, no seed): FIX_A single-B1 [avistar,crown,ada,helm] boss Fire focus ada —
// Avistar needs a real rotation to cast; FIX_B double-B1 [avistar,liter,crown,ada] for the re-entry.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  data,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const STAGE_CAST_GAP = 30; // STAGE_CAST_GAP_FRAMES, no rng (unseeded)

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(o: {
  slugs: string[];
  focusSlug: string;
  overrides?: Record<string, any>;
}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: o.slugs,
    bossElement: 'Fire',
    focusSlug: o.focusSlug,
    overrides: o.overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  const applies = (stat: string, casterIdx: number): BuffApply[] =>
    events.filter(
      (e): e is BuffApply =>
        e.kind === 'buffApply' && e.stat === stat && e.casterIdx === casterIdx
    );
  const casts = (slug: string): BurstCast[] =>
    events.filter(
      (e): e is BurstCast => e.kind === 'burstCast' && e.slug === slug
    );
  return { events, res, applies, casts, totals: totals(res) };
}

const FIX_A = { slugs: ['avistar', 'crown', 'ada', 'helm'], focusSlug: 'ada' };
const FIX_B = { slugs: ['avistar', 'liter', 'crown', 'ada'], focusSlug: 'ada' };

// ---- counterfactuals (nearest wrong models) ---------------------------------------------------

/** A1 counterfactual: Aftershow as a percent of the CARRY's own ATK (atkPct), not caster-basis. */
const avistarAtkPct = withPatchedOverride('avistar', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e) {
    throw new Error(
      'avistar S1 casterAtkPct effect missing — fixture is stale'
    );
  }
  e.stat = 'atkPct';
});
/** A2 counterfactual: the S2 buffs misread as 'all allies' instead of the single favorite pop star. */
const avistarS2AllAllies = withPatchedOverride('avistar', (ov) => {
  const b = ov.skill2.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'attackDamagePct')
  );
  if (!b) {
    throw new Error(
      'avistar S2 attackDamagePct block missing — fixture is stale'
    );
  }
  b.target = { kind: 'allies' };
});
/** A2 reference: the S2 buffs removed entirely (carry loses the 40.13% Attack Damage). */
const avistarNoS2 = withPatchedOverride('avistar', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'attackDamagePct')
  );
  if (ov.skill2.length !== before - 1) {
    throw new Error(
      'avistar S2 attackDamagePct block missing — fixture is stale'
    );
  }
});
/** A3 reference: the Stargazer Max HP line removed (must be damage-neutral — it is inert). */
const avistarNoStargazer = withPatchedOverride('avistar', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'casterMaxHpPct')
  );
  if (ov.burst.length !== before - 1) {
    throw new Error(
      'avistar burst casterMaxHpPct block missing — fixture is stale'
    );
  }
});
/** A2-gate counterfactual: drop the ownBurstGate so S2 fires on EVERY FB entry (Stargazer or not). */
const avistarS2Ungated = withPatchedOverride('avistar', (ov) => {
  const b = ov.skill2.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'attackDamagePct')
  );
  if (!b || b.ownBurstGate !== 'cast') {
    throw new Error('avistar S2 ownBurstGate:cast missing — fixture is stale');
  }
  delete b.ownBurstGate;
});
/** B1 reference: the burst re-entry line removed (stage advances after Avistar). */
const avistarNoReenter = withPatchedOverride('avistar', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'reenterStage')
  );
  if (ov.burst.length !== before - 1) {
    throw new Error(
      'avistar burst reenterStage block missing — fixture is stale'
    );
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const baseA = run(FIX_A);
const atkPct = run({ ...FIX_A, overrides: { avistar: avistarAtkPct } });
const s2All = run({ ...FIX_A, overrides: { avistar: avistarS2AllAllies } });
const noS2 = run({ ...FIX_A, overrides: { avistar: avistarNoS2 } });
const noStargazer = run({
  ...FIX_A,
  overrides: { avistar: avistarNoStargazer },
});

/** Avistar's slot index + final static ATK in a run (the caster basis for Aftershow / Stargazer). */
const avistarIdx = (r: typeof baseA) =>
  r.res.units.findIndex((u) => u.slug === 'avistar');
const AVI = avistarIdx(baseA);
const AVI_ATK = unitOf(baseA.res, 'avistar').staticAtk;
const AVI_MAXHP = unitOf(baseA.res, 'avistar').maxHp;
/** Highest static ATK among FIX_A allies (ada/helm tie) — the favorite-pop-star magnitude. */
const MAX_ALLY_ATK = Math.max(...baseA.res.units.map((u) => u.staticAtk));

describe('avistar — kit spec', () => {
  describe('A1 — S1 Aftershow: flat ATK to the favorite pop star, on the CASTER basis', () => {
    const buff = baseA.applies('casterAtkPct', AVI);

    it('is a FLAT add = 80.26% of AVISTAR’s own ATK (not a percent of the carry)', () => {
      expect(
        buff.length,
        'no Aftershow casterAtkPct buff was applied'
      ).toBeGreaterThan(0);
      const expected = 0.8026 * AVI_ATK;
      for (const b of buff) {
        expect(
          b.value,
          `flat ATK ${b.value} vs 0.8026 × ${AVI_ATK}`
        ).toBeCloseTo(expected, 3);
      }
    });

    it('reaches exactly the favorite pop star (count:1)', () => {
      expect([...new Set(buff.map((b) => b.targetIdx))].length).toBe(1);
    });

    it('DISCRIMINATING: atkPct (carry-basis) moves the carry total differently', () => {
      // The nearest-wrong model resolves the buff against the carry’s (higher) ATK, so the
      // carry’s total must differ from the caster-basis shipped value.
      expect(atkPct.totals.ada).not.toBe(baseA.totals.ada);
    });
  });

  describe('A2 — S2 buffs the favorite pop star on Full Burst entry (continuously)', () => {
    const atkDmg = baseA.applies('attackDamagePct', AVI);
    const projExp = baseA.applies('projectileExplosionPct', AVI);

    it('grants Attack Damage 40.13 + Projectile Explosion Damage 40.13', () => {
      expect(atkDmg.length, 'no FB-entry attackDamagePct buff').toBeGreaterThan(
        0
      );
      expect(
        projExp.length,
        'no FB-entry projectileExplosionPct buff'
      ).toBeGreaterThan(0);
      expect([...new Set(atkDmg.map((b) => b.value))]).toEqual([40.13]);
      expect([...new Set(projExp.map((b) => b.value))]).toEqual([40.13]);
    });

    it('is continuous (no wall-clock expiry) and scoped to ONE ally even with a top-ATK tie', () => {
      // ada/helm tie for highest ATK in FIX_A; count:1 must still slice to exactly one holder.
      expect([...new Set(atkDmg.map((b) => b.expiresFrame))]).toEqual([null]);
      const holders = new Set(atkDmg.map((b) => b.targetIdx));
      expect(holders.size, 'S2 buff must reach exactly one ally').toBe(1);
      const holder = [...holders][0] as number; // ally buff → a real unit index, never null
      expect(
        baseA.res.units[holder].staticAtk,
        'the favorite pop star must be a highest-ATK ally'
      ).toBe(MAX_ALLY_ATK);
      // Projectile Explosion rides the SAME single holder.
      expect(new Set(projExp.map((b) => b.targetIdx))).toEqual(holders);
    });

    it('DISCRIMINATING: an "all allies" misread reaches the whole team', () => {
      const all = s2All.applies('attackDamagePct', avistarIdx(s2All));
      expect(new Set(all.map((b) => b.targetIdx)).size).toBe(4);
    });

    it('DISCRIMINATING: the Attack Damage bucket is live — removing it drops the carry total', () => {
      expect(baseA.totals.ada).toBeGreaterThan(noS2.totals.ada);
    });
  });

  describe('A2-gate — S2 is gated on her OWN burst (Stargazer = ownBurstGate:cast)', () => {
    // Stargazer exists at an FB entry IFF Avistar cast her burst that rotation, so the faithful
    // gate is ownBurstGate:'cast'. On the happy path (sole B1, casts every rotation) it is
    // identical to ungated — to make the assertion DISCRIMINATE we force a non-cast rotation:
    // bump her CD to 200s in a double-B1 comp so liter carries chains she misses. The ungated
    // counterfactual over-fires the 40.13 buffs on those Stargazer-less FBs; shipped does not.
    const slugs = ['avistar', 'liter', 'crown', 'ada'];
    const s2fires = (r: { res: any; applies: any }, value = 40.13) => {
      const i = r.res.units.findIndex((u: any) => u.slug === 'avistar');
      return r
        .applies('attackDamagePct', i)
        .filter((b: any) => b.value === value).length;
    };

    it('fires the 40.13 buffs only on FBs she cast in; ungated over-fires every FB', () => {
      const orig = data.characters.avistar.burstCooldownSec;
      try {
        (data.characters.avistar as any).burstCooldownSec = 200;
        const gated = run({ slugs, focusSlug: 'ada' }); // shipped: ownBurstGate:'cast'
        const ungated = run({
          slugs,
          focusSlug: 'ada',
          overrides: { avistar: avistarS2Ungated },
        });
        const avCasts = gated.casts('avistar').length;
        // She casts far fewer times than there are Full Bursts (liter carries the rest).
        expect(avCasts).toBeGreaterThan(0);
        expect(avCasts).toBeLessThan(s2fires(ungated));
        // Gated fires exactly once per FB she cast in; ungated fires on every FB.
        expect(s2fires(gated)).toBe(avCasts);
        expect(s2fires(gated)).toBeLessThan(s2fires(ungated));
      } finally {
        (data.characters.avistar as any).burstCooldownSec = orig;
      }
    });
  });

  describe('A3 — burst Stargazer: self Max HP 26.4%, offensively inert (SSOT only)', () => {
    const buff = baseA.applies('maxHpFlat', AVI);

    it('grants flat Max HP = 26.4% of Avistar’s Max HP, on herself, continuously', () => {
      expect(buff.length, 'no Stargazer maxHpFlat buff').toBeGreaterThan(0);
      const expected = 0.264 * AVI_MAXHP;
      for (const b of buff) {
        expect(
          b.value,
          `flat HP ${b.value} vs 0.264 × ${AVI_MAXHP}`
        ).toBeCloseTo(expected, 2);
        expect(b.targetIdx).toBe(AVI);
      }
      expect([...new Set(buff.map((b) => b.expiresFrame))]).toEqual([null]);
    });

    it('is damage-neutral: removing it changes NO unit’s total by a point', () => {
      expect(baseA.totals).toEqual(noStargazer.totals);
    });
  });

  describe('A4/A5 — inert / unmodeled lines (documented, no assertion)', () => {
    it('S1 self-heal (3.52%/1s/10s) is modeled but unobservable; S2 self HP▼20% is unmodeled', () => {
      // A4: heal ticks:10 → self recovery events, but self-targeted + no self-recovery consumer +
      //     recovery is not logged → no observable. A5: no HP pool → inert, dropped to unmodeled.
      // This placeholder pins the documentation intent; the lines carry no damage assertion.
      expect(true).toBe(true);
    });
  });

  describe('B1 — burst re-enters Burst Stage 1 → a second B1 casts inside the same chain', () => {
    const chain1 = (overrides?: Record<string, any>) => {
      const { casts } = run({ ...FIX_B, overrides });
      const avistar1 = casts('avistar')[0];
      const liter1 = casts('liter')[0];
      const crown1 = casts('crown')[0];
      const ada1 = casts('ada')[0];
      expect(avistar1).toBeDefined();
      expect(crown1).toBeDefined();
      expect(ada1).toBeDefined();
      expect(avistar1.stage).toBe(1);
      expect(crown1.stage).toBe(2);
      expect(ada1.stage).toBe(3);
      return { avistar1, liter1, crown1 };
    };

    it('shipped: liter fills stage 1 in chain 1, exactly one stage-gap (30f) after Avistar', () => {
      const s = chain1();
      expect(s.liter1).toBeDefined();
      expect(s.liter1.stage).toBe(1);
      expect(s.liter1.frame - s.avistar1.frame).toBe(STAGE_CAST_GAP);
      expect(s.liter1.frame).toBeLessThan(s.crown1.frame);
    });

    it('counterfactual: stage advances after Avistar → liter gets no chain-1 stage-1 window', () => {
      const c = chain1({ avistar: avistarNoReenter });
      const literInChain1 =
        c.liter1 !== undefined && c.liter1.frame < c.crown1.frame;
      expect(literInChain1).toBe(false);
    });
  });
});
