// PER-UNIT KIT SPEC — `sakura` (Sakura, Supporter/SR/Fire, Burst I, cd 40s, ammo 6, chargeFrames
// 60). Kit-autonomy gauntlet 2026-08-01 (Qwen driver). Slug `sakura` is the original SR/Fire unit,
// DISTINCT from `sakura-bloom-in-summer` (AR/Wind) — confirmed via lint-slug-disambiguation.
//
// One assertion group per KIT LINE (K1..K6 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest-wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.sakura.skills, level 10):
//   S1 ■ after 3 normal attacks → all allies: Cherry Blossom Tea 8.15% of DEF, x10 stacks, 15s   [K1]
//   S2 ■ all allies: attacking an enemy projectile → damage to that projectile ▲7.74% (cont.)    [K2]
//      ■ entering Full Burst → all allies: Cooldown of Burst Skill ▼4.84 sec                     [K3]
//   BU ■ all allies: damage dealt by Wind Code enemies ▼90.72% for 30s, 1/battle                [K4]
//      ■ all allies: ATK ▲23.76% of the skill user's ATK for 10 sec                              [K5]
//      ■ when Cherry Blossom Tea at max stacks → all allies: dmg to Interruption Parts ▲23.54%/30s [K6]
//
// Dispositions (S0, reconciled with the cross-family S2b review — claude-fable-5):
//   K3 FAITHFUL load-bearing — burstCdr 4.84 on fullBurstEnter → allies, NOT once-per-battle
//      (volume V2 precedent). The kit attaches no 1/battle clause here; that clause belongs to K4.
//   K5 FAITHFUL load-bearing — casterAtkPct 23.76 on burstCast → allies, 10s, EVERY cast (flora/
//      brid precedent). The buffApply event carries the FLAT-RESOLVED grant (0.2376 × sakura
//      staticAtk ≈ 23,372 at scope lock), NOT the kit percentage (exia X5 precedent).
//   K1 INERT-BUT-MODELED — "8.15% of DEF" with a defup icon and NO "ATK ▲" prefix is a DEF buff
//      (contrast K5's explicit "ATK ▲ … of the skill user's ATK") = defPct 8.15 on hitCount:3 → all
//      allies, maxStacks 10, 15s. DEF does not feed damage dealt (defPct inert in v1) and the boss
//      deals no damage, so it is provably damage-neutral (whole-board totals byte-identical with the
//      block removed — pinned below). It is modeled (not left unmodeled) on the cross-family
//      convergence: BOTH blind models (S2b claude-fable-5, S5 claude-opus-5) independently encoded an
//      inert defPct stack buff, and it is a real always-firing in-domain buff whose values are fully
//      datamined. The only kit-silent detail (refresh-vs-expiry stack semantics) is unobservable
//      because the stat is inert — so encoding it introduces NO damage fudge. Its stack count feeds
//      only K6, which is unmodelable (no buff-stack-count gate primitive) and inert anyway.
//      Nearest-wrong: an ATK-from-DEF misread (atkPct 8.15) — there is no atkOfDefPct StatKey, so any
//      offensive encoding is a misread; and a shotFired trigger (every shot) instead of hitCount:3.
//   K2 UNMODELED, out-of-domain — projectile-intercept damage applies only to Anomaly projectile
//      destruction; the sim has no projectile channel. ⚑ no sim primitive.
//   K4 UNMODELED, out-of-domain — damage-taken reduction vs Wind enemies is defensive; the immortal
//      boss deals no damage. The "1 time per battle" clause attaches to THIS sentence (S2b note 1),
//      NOT to K5 — K5 fires on every cast. ⚑ no sim primitive.
//   K6 UNMODELED, out-of-domain — partsDamagePct is inert vs the partless scope-lock boss (helm H4
//      precedent) AND is gated on max Cherry Blossom Tea stacks (K1), which the sim does not model
//      (see K1). Damage-inert end to end → unmodeled verbatim, not an inert block.
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong model gates
// nothing):
//   K1  PIN the inert defPct stack buff: value 8.15, all three allies, maxStacks 10, 15s, firing every
//       3rd sakura hit (hitCount:3) — and PROVABLY damage-neutral (totals byte-identical with the block
//       removed). Two counterfactuals: (stat) the DEF→ATK misread atkPct 8.15 would log an OFFENSIVE
//       atkPct buff (and no defPct) — there is no atkOfDefPct StatKey, so any offensive stat is a
//       misread; (trigger) a shotFired keying fires every shot (~3× as many applications as hitCount:3).
//   K3  burstCdr emits NO event (sim.ts refunds burstCdFrames directly); observable only through its
//       EFFECT on FB TIMING. The 4.84s refund does NOT cross an FB-count boundary inside 180s (the 6th
//       FB lands at ~181.6s with CDR, just past the window — count ties at 5), so the observable is the
//       steady-state CYCLE LENGTH: ~35.2s (2110f) with the block vs the natural 40s (2400f) without it
//       (PRESENCE). NEAREST-WRONG = oncePerBattle: the kit's real risk is the K4 "1/battle" clause
//       bleeding forward onto K3; a once-per-battle CDR accelerates only the 2nd FB, then its later
//       cycles revert to the natural 2400f cadence (== the no-CDR baseline), while the faithful every-FB
//       keying keeps the last gap shortened. (The S2b review notes burstCast vs fullBurstEnter nearly
//       coincide for a sole-B1 unit, so the honest discriminator is repetition/oncePerBattle, not a
//       burstCast re-key — hence this fixture keeps her the sole B1 and tests the cycle-length cadence.)
//   K5  the buffApply event carries the FLAT-RESOLVED grant (0.2376 × sakura staticAtk), NOT the kit
//       percentage — casterAtkPct resolves against the caster's static ATK at apply time (exia X5).
//       Counterfactual nearest-wrong: atkPct 23.76 (scaling each TARGET's own ATK) would log the raw
//       23.76 and over-credit the Attacker-class carries — the flat value proves the caster-scaled
//       encoding. Asserted at the kit magnitude, reaching all three allies, for 10s, once per cast.
//   K6  PIN zero partsDamagePct buffs from sakura; counterfactual ADDING partsDamagePct 23.54 is
//       byte-identical on every unit's total vs the partless boss — proves leaving it unmodeled is
//       faithful (helm H4: inert, not dropped).
//
// Fixture: sakura (B1, sole) / crown (B2) / helm (B3), boss Iron (neutral), focus sakura. She is the
// SOLE Burst I so her burstCast lines fire every rotation and the CDR is not confounded by a competing
// B1 (S2b note 3). Deterministic (no seed → expected-value pass; totals byte-stable).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** Slot order: sakura 0 / crown 1 / helm 2. */
const SAKURA = 0;
const ALL_ALLIES = [0, 1, 2];

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

const FIXTURE = {
  slugs: ['sakura', 'crown', 'helm'] as string[],
  bossElement: 'Iron' as const,
  focusSlug: 'sakura',
};

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...FIXTURE,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const sakuraBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === SAKURA && b.stat === stat);
const sakuraBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'sakura'
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart');
/** Sorted Full-Burst start frames; burstCdr emits no event, so its footprint is the FB TIMING. */
const fbFrames = (evs: SimEvent[]) => fbStarts(evs).map((e) => e.frame);
/** Consecutive inter-FB gaps (cycle lengths) from a sorted frame list. */
const gaps = (frames: number[]) => frames.slice(1).map((f, i) => f - frames[i]);
/** The steady-state (last) cycle length — where a per-FB CDR shows up vs a one-shot refund. */
const lastGap = (evs: SimEvent[]) => {
  const g = gaps(fbFrames(evs));
  return g[g.length - 1];
};

// ---- counterfactual patches (nearest-wrong readings) -----------------------------------------
/** K1 reference: her S1 defPct block removed entirely — the damage-neutrality baseline. */
const isTeaBlock = (b: any) => b.effects.some((e: any) => e.stat === 'defPct');
const cfNoS1 = withPatchedOverride('sakura', (ov: any) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !isTeaBlock(b));
  if (ov.skill1.length === before) {
    throw new Error('sakura S1 defPct block missing — fixture is stale');
  }
});
/** K1 nearest-wrong (stat): the DEF buff misread as an offensive atkPct 8.15 (the DEF→ATK error;
 *  there is no atkOfDefPct StatKey, so any offensive stat is a misread). */
const cfS1Atk = withPatchedOverride('sakura', (ov: any) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'defPct');
  if (!e) {
    throw new Error('sakura S1 defPct effect missing — fixture is stale');
  }
  e.stat = 'atkPct';
});
/** K1 nearest-wrong (trigger): re-key hitCount:3 → shotFired (fires every shot, ~3× as often). */
const cfS1Shot = withPatchedOverride('sakura', (ov: any) => {
  const b = ov.skill1.find((x: any) => isTeaBlock(x));
  if (!b) {
    throw new Error('sakura S1 defPct block missing — fixture is stale');
  }
  b.trigger = { kind: 'shotFired' };
});
/** K3 reference: her S2 burstCdr block removed entirely (an inert/absent encoding). */
const isCdrBlock = (b: any) =>
  b.trigger?.kind === 'fullBurstEnter' &&
  b.effects.some((e: any) => e.kind === 'burstCdr');
const cfNoCdr = withPatchedOverride('sakura', (ov: any) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !isCdrBlock(b));
  if (ov.skill2.length === before) {
    throw new Error('sakura S2 burstCdr block missing — fixture is stale');
  }
});
/** K3 nearest-wrong: the burstCdr marked oncePerBattle (the K4 "1/battle" clause bled forward).
 *  Refunds only the first FB → later cycles run at natural cadence → fewer FBs than faithful. */
const cfCdrOncePerBattle = withPatchedOverride('sakura', (ov: any) => {
  const b = ov.skill2.find((x: any) => isCdrBlock(x));
  if (!b) {
    throw new Error('sakura S2 burstCdr block missing — fixture is stale');
  }
  const e = b.effects.find((x: any) => x.kind === 'burstCdr');
  e.oncePerBattle = true;
});
/** K5 nearest-wrong: the burst ATK buff as atkPct 23.76 (scaling each TARGET's own ATK) instead of
 *  casterAtkPct (caster-scaled flat). Logs the raw 23.76 and over-credits Attacker carries. */
const cfK5AtkPct = withPatchedOverride('sakura', (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'casterAtkPct')
  );
  if (!b) {
    throw new Error(
      'sakura burst casterAtkPct block missing — fixture is stale'
    );
  }
  b.effects.find((e: any) => e.stat === 'casterAtkPct').stat = 'atkPct';
});
/** K6 nearest-wrong: ADD the interruption-parts line as partsDamagePct 23.54 — must be inert vs the
 *  partless boss (totals byte-identical), proving "unmodeled" is faithful, not a drop. */
const cfParts = withPatchedOverride('sakura', (ov: any) => {
  ov.burst = [
    ...ov.burst,
    {
      slot: 'burst',
      trigger: { kind: 'burstCast' },
      target: { kind: 'allies' },
      effects: [
        { kind: 'buff', stat: 'partsDamagePct', value: 23.54, durationSec: 30 },
      ],
    },
  ];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noS1 = run({ sakura: cfNoS1 });
const s1Atk = run({ sakura: cfS1Atk });
const s1Shot = run({ sakura: cfS1Shot });
const noCdr = run({ sakura: cfNoCdr });
const cdrOnce = run({ sakura: cfCdrOncePerBattle });
const k5AtkPct = run({ sakura: cfK5AtkPct });
const parts = run({ sakura: cfParts });

/** sakura's static ATK on the scope-lock basis — casterAtkPct flat-resolves against it at apply
 *  time (sim.ts `(e.value/100)×owner.staticAtk`), so the emitted buffApply value is 0.2376×staticAtk,
 *  NOT the kit percentage. Same float expression ⇒ bit-identical. */
const SAKURA_STATIC_ATK = (() => {
  const u = base.res.units.find((x) => x.slug === 'sakura');
  if (!u) {
    throw new Error('sakura missing from her own fixture');
  }
  return u.staticAtk;
})();
const ATK_GRANT_FLAT = (23.76 / 100) * SAKURA_STATIC_ATK;

const casts = sakuraBursts(base.events).length; // sakura's own burst casts
const fbs = fbStarts(base.events).length; // team Full Bursts

describe('sakura — kit spec', () => {
  describe('fixture sanity — sakura bursts and the team reaches Full Burst repeatedly', () => {
    it('sakura casts >0 bursts and the team completes >0 Full Bursts (burst-gated lines not vacuous)', () => {
      expect(casts).toBeGreaterThan(0);
      expect(fbs).toBeGreaterThan(0);
    });
    it('sole-B1 comp: sakura casts every rotation (her burstCast lines are not starved)', () => {
      expect(casts).toBeGreaterThanOrEqual(fbs);
    });
  });

  describe('K1 — S1 Cherry Blossom Tea "8.15% of DEF" is an INERT defPct stack buff (defensive, damage-neutral)', () => {
    const tea = sakuraBuffs(base.events, 'defPct');

    it('is a defPct 8.15 buff reaching all three allies, maxStacks 10, for 15 sec', () => {
      expect(tea.length).toBeGreaterThan(0);
      expect([...new Set(tea.map((b) => b.value))]).toEqual([8.15]);
      expect([...new Set(tea.map((b) => b.maxStacks))]).toEqual([10]);
      expect([...new Set(tea.map((b) => b.targetIdx))].sort()).toEqual(
        ALL_ALLIES
      );
      for (const b of tea) {
        expect(b.expiresFrame! - b.frame).toBe(15 * FPS);
      }
    });

    it('fires every 3rd sakura hit (hitCount:3), not on every shot', () => {
      const shots = base.events.filter(
        (e) => e.kind === 'shot' && (e as any).slug === 'sakura'
      ).length;
      // one activation per 3 hits, each fanned out to all 3 allies
      const activations = tea.length / ALL_ALLIES.length;
      expect(activations).toBe(Math.floor(shots / 3));
    });

    it("is PROVABLY damage-neutral: removing it leaves every unit's total byte-identical", () => {
      expect(noS1.totals).toEqual(base.totals);
    });

    it('DISCRIMINATING (stat): the DEF→ATK misread logs an OFFENSIVE atkPct buff and no defPct', () => {
      const cf = sakuraBuffs(s1Atk.events, 'atkPct');
      expect(cf.length).toBeGreaterThan(0);
      expect([...new Set(cf.map((b) => b.value))]).toEqual([8.15]);
      expect(sakuraBuffs(s1Atk.events, 'defPct').length).toBe(0);
    });

    it('DISCRIMINATING (trigger): a shotFired keying fires strictly more often than hitCount:3', () => {
      expect(sakuraBuffs(s1Shot.events, 'defPct').length).toBeGreaterThan(
        tea.length
      );
    });
  });

  describe('K3 — S2 FB-enter Cooldown of Burst Skill ▼4.84 sec (burstCdr), all allies, every FB', () => {
    // burstCdr emits NO event (sim.ts refunds burstCdFrames directly); its footprint is the FB
    // TIMING. The 4.84s refund does not cross an FB-COUNT boundary inside 180s here (the 6th FB lands
    // at ~181.6s with CDR, just past the window — count ties at 5), so the observable is the cycle
    // LENGTH: with the block the team settles into ~35.2s cycles (2110f) vs the natural 40s (2400f).
    it('fixture has ≥3 Full Bursts so later cycles exist to measure', () => {
      expect(fbFrames(base.events).length).toBeGreaterThanOrEqual(3);
    });
    it('PRESENCE: the CDR shrinks the steady-state FB cycle (last inter-FB gap < no-CDR baseline)', () => {
      expect(lastGap(base.events)).toBeLessThan(lastGap(noCdr.events));
      // and the rotation as a whole runs ahead: the last FB lands strictly earlier with the block.
      expect(fbFrames(base.events).at(-1)).toBeLessThan(
        fbFrames(noCdr.events).at(-1)!
      );
    });
    it('DISCRIMINATING (oncePerBattle): a 1/battle CDR accelerates only the 2nd FB, then reverts to baseline', () => {
      // the kit's real nearest-wrong is the K4 "1/battle" clause bleeding forward. A once-per-battle
      // refund pulls the 2nd FB early but leaves every LATER cycle at the natural cadence — so its last
      // gap equals the no-CDR baseline, while the faithful every-FB keying keeps the last gap shortened.
      expect(lastGap(base.events)).toBeLessThan(lastGap(cdrOnce.events));
      expect(lastGap(cdrOnce.events)).toBe(lastGap(noCdr.events));
    });
  });

  describe("K5 — burst ATK ▲23.76% of the skill user's ATK for 10 sec (casterAtkPct), all allies", () => {
    const applied = sakuraBuffs(base.events, 'casterAtkPct');

    it('is the flat-resolved kit magnitude (0.2376 × sakura staticAtk), not the raw percentage', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([
        ATK_GRANT_FLAT,
      ]);
    });

    it('reaches all three allies (incl. herself) for 10 sec, once per cast', () => {
      const perFrame = new Map<number, Set<number | null>>();
      for (const b of applied) {
        (
          perFrame.get(b.frame) ??
          perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx);
      }
      // one application-frame per sakura cast
      expect(perFrame.size).toBe(casts);
      for (const [frame, holders] of perFrame) {
        expect(
          [...holders].sort(),
          `frame ${frame} reached ${holders.size} allies, expected all 3`
        ).toEqual(ALL_ALLIES);
      }
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING (caster-scaled): an atkPct 23.76 mis-encoding logs the raw 23.76, not the flat grant', () => {
      const wrong = sakuraBuffs(k5AtkPct.events, 'atkPct');
      expect(wrong.length).toBeGreaterThan(0);
      expect([...new Set(wrong.map((b) => b.value))]).toEqual([23.76]);
      // and the faithful casterAtkPct channel is absent under the mis-encoding
      expect(sakuraBuffs(k5AtkPct.events, 'casterAtkPct').length).toBe(0);
    });
  });

  describe('K6 — burst interruption-parts line is UNMODELED and inert vs the partless boss', () => {
    it('PIN: sakura grants NO partsDamagePct buff', () => {
      expect(sakuraBuffs(base.events, 'partsDamagePct').length).toBe(0);
    });
    it("DISCRIMINATING: ADDING partsDamagePct 23.54 changes NO unit's total by a single point", () => {
      expect(parts.totals).toEqual(base.totals);
    });
  });
});
