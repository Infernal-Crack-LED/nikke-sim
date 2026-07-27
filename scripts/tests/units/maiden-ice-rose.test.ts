// PER-UNIT KIT SPEC — `maiden-ice-rose` (Maiden: Ice Rose, Defender/RL/Electric, Burst III,
// cd 40s, ammo 6, chargeFrames 60 — the RL Electric variant of base `maiden`, NOT that unit).
// Kit-autonomy gauntlet 2026-07-26; the override is mature (MEASURED: solo neutral video,
// 547.62% rider popups exact; graded 3 teams). Every FAITHFUL line below is PINNED green vs
// the SHIPPED override and red vs the nearest-wrong counterfactual; `withPatchedOverride`
// builds COUNTERFACTUALS only, never the encoding under test.
//
// Kit (data/characters.json → characters['maiden-ice-rose'].skills):
//   S1 ■ entering Burst Stage 1, self when MP is 0: MP +1 (cap 12; all consumed on burst)   [M0a]
//      ■ entering Full Burst, self when MP above 1: MP +1 (cap 12; all consumed on burst)   [M0b]
//      ■ every 6 full charges → self: Max HP ▲6.34% (no HP restore) 15s, stacks ×10         [M1]
//   S2 ■ when MP is replenished → all Electric allies EXCEPT self:
//         Elemental Advantage Attack Damage ▲40.9% 10s; ATK ▲20.9% of caster ATK 10s        [M2]
//      ■ when MP is used (= her burst cast) → self:
//         Elemental Advantage Attack Damage ▲31.68% 10s; ATK ▲3.2% of caster FINAL Max HP 10s[M3]
//      ■ every 1 full charge → nearest enemy: 547.62% of final ATK as damage               [M4]
//   BU ■ nearest enemy: 1372.8% of (10% of final Max HP + ATK), attacks repeatedly
//         based on current MP (cap 12)                                                     [M5]
//
// Dispositions (driver S0; cross-family-corroborated by the S2b review — all 7 kit lines
// FAITHFUL + load-bearing there, matching M0a/M0b + M1..M5 below):
//   M0a/M0b UNMODELED (documented, ⚑ below). The two MP-bookkeeping lines carry no stat or
//     damage of their own; the owner-specified MP mechanic ("+1 MP per full burst she does
//     NOT burst in, cap 12, all consumed on her burst") is enacted by the engine primitive:
//     stackedNuke reads `fbMissedSinceBurst` (full bursts sat out since her last cast).
//     No assertion — the primitive's behaviour is anchored indirectly by M5 (one nuke per
//     cast with stacks ≥ 1, never more).
//   M1..M5 FAITHFUL — pinned below.
//
// ⚑ RESIDUAL CLUSTER (engine-core; estimate + recipe + tier):
//   (r1) MP initialization: S1-blk1's "+1 when MP is 0" means her FIRST burst (and every
//        burst-every-rotation pattern) carries 1 MP in game; `fbMissedSinceBurst` starts at 0,
//        so the model's first burst is always 0 stacks. Estimate: one lost repeat
//        = 1372.8%×(ATK + 10% Max HP) once per fight ≈ <1% of her total on the tuned comps
//        (the kit-status F2 "undercounts a stack when she bursts every rotation" finding;
//        cold — her graded comps have her bursting every OTHER FB). Recipe: a `stackOffset`
//        param on stackedNuke (stacks = min(fbMissed + offset, maxStacks)) or literal MP via
//        the resources pool. Tier: engine-core (src/engine/sim.ts).
//   (r2) "final Max HP" in the burst: stackedNuke's hpPct→ATK conversion uses BASE owner.maxHp
//        (sim.ts ~2089), not liveMaxHp, so her own S1 Max-HP stacks do not feed the HP portion
//        (they DO feed her M3 atkOfMaxHpPct consumer, which reads liveMaxHp — the e3 rule).
//        Estimate: S1 holds ~1-2 stacks steady-state (+6-13% Max HP) × the 10% HP share of the
//        nuke ≈ ≤1% of burst damage. Recipe: liveMaxHp in the hpEquivPct term. Tier: engine-core.
//   (r3) stackedNuke forces crit:false/core:false (sim.ts ~2092) — an expected-value primitive
//        choice the kit text neither states nor excludes; direction is conservative (the nuke
//        is a documented lower bound). Estimate: allowing crit at her 15% rate ≈ +7.5% on the
//        nuke only. Recipe: crit-eligible stackedNuke at caster rate. Tier: engine-core.
//   (r4) S2-blk1 trigger fold: "when MP is replenished" fires once per FB cycle (S1 blk2), so
//        fullBurstEnter matches its cadence; the literal MP gate (only when MP actually ticks)
//        is the same resources recipe as r1. Estimate: inert on graded comps (she is the only
//        MP source, so every FB cycle replenishes). Tier: engine-core.
//   (r5) Cast-frame ordering: her "MP used" self-buffs (31.68 / 3.2%-of-Max-HP) apply BEFORE
//        the same cast's stackedNuke (skill2 blocks resolve ahead of the burst slot), so they
//        snapshot into their own cast's nuke ATK term. The kit states no ordering; this is the
//        engine's in-frame convention. Estimate: +3.2%-of-final-Max-HP flat ATK on one nuke per
//        cast (small — the HP term itself is ATK-invariant after the hpEquiv conversion).
//        Recipe: N/A unless in-game footage shows the buff missing its own cast. Tier: engine-core.
//   (r6) S1-blk2 threshold: "MP above 1" — strict >1 vs the KR-localization ≥1 reading diverge
//        (≈1 vs ≈2 hits/burst in an alternating-B3 comp; S2b reviewer). Subsumed by the
//        owner-specified MP fold (the note's "+1 per FB sat out" ruling IS the encoded reading);
//        recipe = count burst repeat-hits per cast in footage. Tier: engine-core (same primitive).
//   All are primitive-level; none is fixable inside the override (S4: no engine edits in
//   the gauntlet). The override's note + data/kit-status.json residual carry the provenance.
//
// M6 (added at S2b cross-family review): both elemAdvantageDamagePct lines must sit in the
// advantage-gated ELEMENT bucket — exactly inert on a forced-neutral boss, live on Water.
//
// Fixture: liter(B1,20s) / crown(B2,20s) / maiden-ice-rose(B3,40s) / helm(B3,40s) / zwei(B1,20s,
// ELECTRIC), boss WATER (Electric is advantaged → the elemAdvantageDamagePct lines are live),
// focus maiden-ice-rose. She needs a real rotation to cast at all (a lone B3 makes zero Full
// Bursts). zwei is the second Electric so M2's ally grant has exactly one observable holder —
// the target SET is the discriminator. helm is the second B3 so FBs land every ~20s while she
// casts every ~40s → fbMissedSinceBurst = 1 at each cast after the first (M5 stacks ≥ 1).
// Deterministic (no seed → expected-value pass; totals are byte-stable).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUG = 'maiden-ice-rose';
/** Slot order of the fixture below. */
const MIR = 2;
const ZWEI = 4;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(
  overrides: Record<string, any> = {},
  bossElement: 'Water' | null = 'Water'
) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['liter', 'crown', SLUG, 'helm', 'zwei'],
    bossElement,
    focusSlug: SLUG,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / reference patches -------------------------------------------------------

/** M1 reference: her S1 Max-HP stack line removed entirely. */
const mirNoS1Hp = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'targetMaxHpPct')
  );
  if (ov.skill1.length === before)
    {throw new Error('MIR S1 targetMaxHpPct block missing — fixture is stale');}
});

/** M2 counterfactual: the PRE-2026-07-17 bug — her FB-entry grant reaches herself too. */
const mirSelfishBuff = withPatchedOverride(SLUG, (ov) => {
  const b = ov.skill2.find((x: any) => x.trigger.kind === 'fullBurstEnter');
  if (!b || b.target.excludeSelf !== true)
    {throw new Error(
      'MIR S2 fullBurstEnter/excludeSelf block missing — fixture is stale'
    );}
  b.target.excludeSelf = false;
});

/** M3 reference: both burst-cast SELF buff blocks removed (the rider + ally grant stay). */
const mirNoSelfBuff = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) => !(b.trigger.kind === 'burstCast' && b.target.kind === 'self')
  );
  if (ov.skill2.length !== before - 2)
    {throw new Error('MIR S2 burstCast-self blocks missing — fixture is stale');}
});

/** M4 counterfactual: the rider at skill LEVEL 1 (323.58%) instead of level 10 (547.62%). */
const mirRiderL1 = withPatchedOverride(SLUG, (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage' && x.atkPct === 547.62);
  if (!e) {throw new Error('MIR S2 547.62 rider missing — fixture is stale');}
  e.atkPct = 323.58;
});

/** M5 counterfactual: the OLD model — burst nuke with the Max-HP portion dropped (ATK-only). */
const mirAtkOnlyBurst = withPatchedOverride(SLUG, (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'stackedNuke');
  if (!e || e.hpPct !== 137.28)
    {throw new Error('MIR burst stackedNuke/hpPct missing — fixture is stale');}
  delete e.hpPct;
});

/** M6 reference: BOTH elemAdvantageDamagePct lines stripped (S2 blk1's 40.9 + blk2's 31.68). */
const mirNoElemAdv = withPatchedOverride(SLUG, (ov) => {
  let removed = 0;
  ov.skill2 = ov.skill2
    .map((b: any) => {
      const effects = b.effects.filter((e: any) => {
        if (e.stat === 'elemAdvantageDamagePct') {
          removed++;
          return false;
        }
        return true;
      });
      return { ...b, effects };
    })
    .filter((b: any) => b.effects.length > 0);
  if (removed !== 2)
    {throw new Error(
      'MIR S2 elemAdvantageDamagePct effects missing — fixture is stale'
    );}
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noS1Hp = run({ [SLUG]: mirNoS1Hp });
const selfish = run({ [SLUG]: mirSelfishBuff });
const noSelfBuff = run({ [SLUG]: mirNoSelfBuff });
const riderL1 = run({ [SLUG]: mirRiderL1 });
const atkOnly = run({ [SLUG]: mirAtkOnlyBurst });
// Forced-NEUTRAL boss pair (S2b reviewer hunt): no element is advantaged, so both
// elemAdvantageDamagePct lines must be exactly inert there — see M6.
const neutralBase = run({}, null);
const neutralNoElem = run({ [SLUG]: mirNoElemAdv }, null);

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const mirDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === SLUG && d.srcSlot === srcSlot);
const mirShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
const mirBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const fbCount = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').length;

describe('maiden-ice-rose — kit spec', () => {
  describe('M1 — S1 every 6 full charges: self Max HP ▲6.34%, 15s, stacks ×10', () => {
    // The engine stores targetMaxHpPct as a flat maxHp grant (sim.ts: "% of the TARGET's own
    // Max HP" → maxHpFlat), self-cast so the e3 rule lets it feed her own M3 atkOfMaxHpPct.
    const grants = buffs(base.events).filter(
      (b) =>
        b.casterIdx === MIR && b.targetIdx === MIR && b.stat === 'maxHpFlat'
    );

    it('grants once per 6 shots, ×10 stacks, 15 sec, self only', () => {
      const shots = mirShots(base.events).length;
      expect(grants.length, `${grants.length} grants vs ${shots} shots`).toBe(
        Math.floor(shots / 6)
      );
      expect(grants.length).toBeGreaterThan(0);
      expect([...new Set(grants.map((b) => b.maxStacks))]).toEqual([10]);
      for (const b of grants) {expect(b.expiresFrame! - b.frame).toBe(15 * FPS);}
      // a constant flat value = 6.34% of her (constant) base Max HP
      expect(new Set(grants.map((b) => b.value)).size).toBe(1);
      expect(grants[0].value).toBeGreaterThan(0);
      // stacks actually accrue (she holds >1 inside the 15s window at her ~1.4s/pull cadence)
      expect(Math.max(...grants.map((b) => b.stacks))).toBeGreaterThanOrEqual(
        2
      );
    });

    it('DISCRIMINATING: removing it drops her total (it feeds her own 3.2%-of-Max-HP ATK)', () => {
      const hpEvents = buffs(noS1Hp.events).filter(
        (b) => b.casterIdx === MIR && b.stat === 'maxHpFlat'
      );
      expect(hpEvents).toEqual([]);
      expect(base.totals[SLUG]).toBeGreaterThan(noS1Hp.totals[SLUG]);
    });
  });

  describe('M2 — S2 on MP replenished (≈ per FB): Electric allies EXCEPT self get Elem-Adv +40.9% / ATK +20.9% of her ATK, 10s', () => {
    const elem = buffs(base.events).filter(
      (b) =>
        b.casterIdx === MIR &&
        b.stat === 'elemAdvantageDamagePct' &&
        b.value === 40.9
    );
    const atk = buffs(base.events).filter(
      (b) => b.casterIdx === MIR && b.stat === 'casterAtkPct'
    );

    it('fires once per Full Burst, for 10 sec, at the level-10 value', () => {
      expect(elem.length).toBeGreaterThan(0);
      expect(elem.length).toBe(fbCount(base.events));
      expect(atk.length).toBe(elem.length);
      for (const b of [...elem, ...atk])
        {expect(b.expiresFrame! - b.frame).toBe(10 * FPS);}
    });

    it('reaches the Electric ally (zwei) and NEVER herself — excludeSelf is live', () => {
      expect([...new Set(elem.map((b) => b.targetIdx))]).toEqual([ZWEI]);
      expect([...new Set(atk.map((b) => b.targetIdx))]).toEqual([ZWEI]);
    });

    it('DISCRIMINATING: the pre-2026-07-17 model (excludeSelf ignored) buffs MIR herself', () => {
      const selfishElem = buffs(selfish.events).filter(
        (b) =>
          b.casterIdx === MIR &&
          b.stat === 'elemAdvantageDamagePct' &&
          b.value === 40.9
      );
      expect([...new Set(selfishElem.map((b) => b.targetIdx))].sort()).toEqual(
        [MIR, ZWEI].sort()
      );
    });
  });

  describe('M3 — S2 on MP used (= burst cast): self Elem-Adv +31.68% / ATK +3.2% of FINAL Max HP, 10s', () => {
    const elem = buffs(base.events).filter(
      (b) =>
        b.casterIdx === MIR &&
        b.targetIdx === MIR &&
        b.stat === 'elemAdvantageDamagePct'
    );
    const hpAtk = buffs(base.events).filter(
      (b) =>
        b.casterIdx === MIR && b.targetIdx === MIR && b.stat === 'atkOfMaxHpPct'
    );
    const casts = mirBursts(base.events).length;

    it('both buffs fire once per burst cast, self-only, 10 sec, kit values', () => {
      expect(casts).toBeGreaterThan(0);
      expect(elem.length).toBe(casts);
      expect(hpAtk.length).toBe(casts);
      expect([...new Set(elem.map((b) => b.value))]).toEqual([31.68]);
      expect([...new Set(hpAtk.map((b) => b.value))]).toEqual([3.2]);
      for (const b of [...elem, ...hpAtk]) {
        expect(b.targetIdx).toBe(MIR);
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING: removing both drops her total (Elem-Adv is live vs the Water boss)', () => {
      expect(
        buffs(noSelfBuff.events).filter(
          (b) =>
            b.casterIdx === MIR &&
            b.targetIdx === MIR &&
            (b.stat === 'atkOfMaxHpPct' || b.stat === 'elemAdvantageDamagePct')
        )
      ).toEqual([]);
      expect(base.totals[SLUG]).toBeGreaterThan(noSelfBuff.totals[SLUG]);
    });
  });

  describe('M4 — S2 every full charge: nearest enemy takes 547.62% of final ATK (video-confirmed)', () => {
    const riders = mirDamage(base.events, 'skill2');

    it('lands exactly once per pull at the kit magnitude (NOT level 1, NOT per-MP-cycle)', () => {
      expect(riders.length).toBe(mirShots(base.events).length);
      expect([...new Set(riders.map((d) => d.atkPct))]).toEqual([547.62]);
      expect([...new Set(riders.map((d) => d.bucket))]).toEqual(['skill']);
    });

    it('is crit-eligible, never range-scaled, and takes the FB major BY TIMING only', () => {
      expect(riders.every((d) => d.critEligible)).toBe(true);
      expect(riders.every((d) => !d.rangeApplied)).toBe(true);
      // she fires both inside and outside FB windows across 180s → both populations present
      expect(riders.some((d) => d.fbMajorApplied)).toBe(true);
      expect(riders.some((d) => !d.fbMajorApplied)).toBe(true);
    });

    it('DISCRIMINATING: the level-1 value (323.58%) is a different magnitude', () => {
      expect([
        ...new Set(mirDamage(riderL1.events, 'skill2').map((d) => d.atkPct)),
      ]).toEqual([323.58]);
    });
  });

  describe('M5 — burst: 1372.8% of (10% final Max HP + ATK) per MP stack (stackedNuke, cap 12)', () => {
    const nukes = mirDamage(base.events, 'burst');
    const casts = mirBursts(base.events).length;

    it('fires at most once per cast, only on casts with ≥1 stack (first cast may be 0 — see r1)', () => {
      expect(casts).toBeGreaterThan(1);
      expect(nukes.length).toBeGreaterThan(0);
      expect(nukes.length).toBeGreaterThanOrEqual(casts - 1);
      expect(nukes.length).toBeLessThanOrEqual(casts);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
      // burst-cast damage lands BEFORE the FB window opens → never takes the +50% major
      expect(nukes.every((d) => !d.fbMajorApplied)).toBe(true);
    });

    // Her HP/ATK ratio is large (Defender), so the hpPct 137.28 term is a BIG additive per
    // stack (≈ +380% ATK-equiv at scope lock) — atkPct/1372.8 is nowhere near an integer on
    // the shipped side. Read the stack count off the ATK-only TWIN (exact multiple there),
    // event-paired by frame: same deterministic fight, same casts, only hpEquiv differs.
    const atkOnlyNukes = mirDamage(atkOnly.events, 'burst');

    it('the Max-HP portion IS modeled: every nuke exceeds its ATK-only twin at equal stacks', () => {
      expect(atkOnlyNukes.length).toBe(nukes.length);
      nukes.forEach((d, i) => {
        const twin = atkOnlyNukes[i];
        expect(d.frame).toBe(twin.frame);
        const stacks = Math.round(twin.atkPct / 1372.8);
        expect(stacks).toBeGreaterThanOrEqual(1);
        expect(stacks).toBeLessThanOrEqual(12);
        expect(twin.atkPct).toBeCloseTo(stacks * 1372.8, 6); // twin sits on an exact ATK-only multiple
        expect(d.atkPct).toBeGreaterThan(twin.atkPct); // shipped adds 137.28% Max HP per stack
      });
    });

    it('DISCRIMINATING: the old ATK-only model deals strictly less burst damage', () => {
      const sum = (ds: Damage[]) => ds.reduce((s, d) => s + d.amount, 0);
      expect(sum(nukes)).toBeGreaterThan(sum(atkOnlyNukes));
    });
  });

  describe('M6 — both Elem-Adv lines sit in the advantage-gated ELEMENT bucket (S2b reviewer hunt)', () => {
    // A generic damage stat would move her neutral-boss total; the real bucket applies ONLY
    // when Electric is advantaged, so on a forced-neutral boss stripping both lines must be
    // byte-identical for every unit — not "small", identical.
    it('stripping both elemAdvantageDamagePct lines changes NOTHING on a neutral boss', () => {
      expect(neutralBase.totals).toEqual(neutralNoElem.totals);
    });

    it('and both lines ARE live on the advantaged (Water) boss', () => {
      const noElem = run({ [SLUG]: mirNoElemAdv });
      // blk2's 31.68 is MIR's own → her total drops; blk1's 40.9 reaches zwei → zwei's drops
      expect(base.totals[SLUG]).toBeGreaterThan(noElem.totals[SLUG]);
      expect(base.totals.zwei).toBeGreaterThan(noElem.totals.zwei);
    });
  });
});
