// Kit spec — `emilia` (Emilia). RL / Attacker / Water / Burst III, cd 40s, ammo 6,
// chargeFrames 60, chargeMultiplier 250%, normalAttackMultiplier 61.3, coreAttackMultiplier 200,
// reloadFrames 141, Abnormal (Re:Zero collab). Slug is unique; approved nickname "emi".
//
// Every magnitude below was re-derived from data/characters.json (`characters.emilia`) — the
// blablalink-synced prose SSOT plus the datamined `role.skillDetails.*.description_value_list`
// level arrays, read at index 9 (skill level 10, the scope-lock basis).
//
// KIT, LINE BY LINE, AND WHAT EACH ASSERTION DISCRIMINATES
//
// S1 "Lesser Spirit's Blessing" — ■ Activates when attacking with Full Charge. Affects self.
//   S1a "Charge Speed ▲ 13.01% for 1 round(s)."
//       -> shotFired -> self -> chargeSpeedPct 13.01, durationShots 1.
//       An RL trigger pull IS one full charge in this engine (firePull always dispatches
//       charged=true for a charge weapon), so shotFired is the full-charge trigger — the same
//       encoding maiden-ice-rose's "when attacking with Full Charge" rider uses.
//       DISCRIMINATES: rounds vs seconds (expiresFrame null + durationShots 1 — a durationSec
//       model sets an expiry), self vs allies, and one application per pull.
//   S1b "Charge Damage ▲2.01% for every unit in the final Max Ammunition Capacity, lasts for
//       1 round(s)."
//       -> shotFired -> self -> chargeDamagePct 12.06 (= 2.01 x her base Max Ammo 6),
//       durationShots 1. ⚑ STATIC ENCODING: the kit scales by LIVE final Max Ammunition
//       Capacity, which rises to 9 while S2b's +3 is up, so the true value is 18.09 inside that
//       window. No primitive scales a buff by the computed maxAmmo() (perResource reads named
//       resource pools). The arithmetic is pinned against characters.json below so the
//       approximation cannot silently drift if her base ammo ever changes.
//       DISCRIMINATES: the charge BUCKET moves (2.5 -> 2.6206) while nothing else does.
//
// S2 "Great Spirit's Mace"
//   S2a ■ Activates when hitting a target with Full Charge. Affects target(s).
//       "Deals Fixed Damage to the main body equal to 58.99% of the damage dealt by self."
//       -> shotFired -> enemy -> hitRepeat pct 58.99.
//       A "%-of-hit repeat" (docs/data/nikke-damage-formula.md §3): it inherits the parent
//       hit's crit expectation / core / element / Damage-Up / Full-Burst state IMPLICITLY, by
//       being a fraction of the already-computed number, and applies no multiplier of its own.
//       DISCRIMINATES — and this is the load-bearing assertion of the file: the rider's ratio to
//       its parent is CONSTANT at 58.99% across an ordinary shot AND the burst nuke, whose
//       charge bucket is ~6x larger. The nearest-wrong encoding (folding it into
//       `chargeDamagePct` as an additive term) cannot do that: the repeat is MULTIPLICATIVE on
//       the whole parent, the charge bucket is ADDITIVE, so any constant tuned to be right
//       outside the burst is badly wrong on the nuke. See the explicit counterfactual below.
//   S2b ■ Activates when entering Full Burst. Affects self.
//       "Max Ammunition Capacity ▲ 3 round(s) for 10 sec."
//       -> fullBurstEnter -> self -> maxAmmoFlat 3, durationSec 10.
//       DISCRIMINATES: a magazine of 6 can never leave a shot with >5 rounds remaining, so a
//       single `ammoAfter >= 6` proves the capacity really rose (and that the reload refilled
//       to the raised cap). Seconds, not rounds, here — expiresFrame set, durationShots null.
//
// Burst "Freezing Witch" — ■ Affects self.
//   B1 "Explosion Range ▲ 101.24% for 10 sec." UNMODELED (splash RADIUS; no primitive, and inert
//      against the single partless scope-lock boss). Pinned verbatim in `unmodeled` below.
//   B2 "Charge Speed ▼ 300%" for 1 shot — a real DOWNSIDE on the nuke.
//      -> burstCast -> self -> chargeSpeedPct -300, durationShots 1, in the SAME block as B3
//      (the kit pairs them as one Function). Charge Speed is subtractive on charge TIME, so this
//      is 60 x (1 - (-300)/100) = 240 frames of charge instead of 60.
//      DISCRIMINATES: the long-charge shots and the big-charge-bucket shots are the SAME shots —
//      the cost rides the payoff, not some neighbouring pull.
//   B3 "Charge Damage ▲ 1300.53%" for 1 shot.
//      -> burstCast -> self -> chargeDamagePct 1300.53, durationShots 1.
//      An ordinary additive charge-bucket buff, NOT a collection-item `chargeDamageMultPct`.
//      DISCRIMINATES: EXACTLY ONE of her shots per burst cast carries the big charge bucket
//      (round-count semantics); a durationSec stand-in would buff several.
//
// ⚑ ENGINE GAP THIS SPEC UNCOVERED — "buff my NEXT round" is inexpressible (theme 21 in
// docs/engine-modeling-gaps.md). firePull dispatches a pull's `shotFired` blocks and THEN, later in
// the same pull, decrements every round-scoped buff the unit holds — including the one that pull
// just applied. So a `shotFired` + `durationShots: 1` buff is consumed by its own triggering shot
// and never reaches a single round. Both S1 lines are exactly that shape, so both are authored
// faithfully and are currently INERT. Proven by counterfactual, not inferred: bumping only
// `durationShots` 1 -> 2 makes the charge bucket show 2.6206 (it never does otherwise) and lifts her
// shot count 116 -> 128. `durationShots: 2` is the DIAGNOSTIC, not the fix — it would mean "the next
// TWO rounds" and over-credit by one. Encoding here follows the roster's prior art (`zwei`,
// `phantom`, `vesti-tactical-upgrade` all pair `shotFired` with the literal kit round count and are
// silently short by the same one round), so the fix belongs in the engine, batched across those
// four carriers — not in this override. The two blocked assertions are `it.skip`ped below with
// their counterfactual numbers; nothing here is weakened to go green.
//
// FIXTURE: the control comp — `liter` (B1) / `crown` (B2) / `emilia` (B3 carry, camera focus) /
// `helm` (Helm, SR/Water — NOT `helm-aquamarine`) — on the default Fire boss, against which
// emilia (Water) is elementally advantaged. Verified as non-confounding for this spec: none of
// the three control units grants an ALLY any chargeDamagePct / chargeDamageMultPct /
// chargeSpeedPct / maxAmmo — helm's Charge Damage Multiplier ▲158.4% is self-only — so emilia's
// charge bucket and cadence are hers alone and the exact-value assertions below are legal.
// A lone Burst III makes ZERO Full Bursts, so the B1/B2 core is mandatory for S2b and the burst.
//
// Deterministic (no seed) => expected-value pass => byte-stable totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  data,
  runComp,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'emilia';
const CHAR = data.characters[SLUG];

// Kit magnitudes, restated from characters.json so a resync that moves one fails HERE.
const CS_PER_CHARGE = 13.01; // S1a
const CD_PER_AMMO = 2.01; // S1b, per unit of final Max Ammunition Capacity
const REPEAT_PCT = 58.99; // S2a
const AMMO_GRANT = 3; // S2b
const NUKE_CD = 1300.53; // B3
const BURST_CS_DOWN = 300; // B2, a ▼ DOWNSIDE — authored as chargeSpeedPct -300

const BASE_CHARGE = CHAR.chargeMultiplier / 100; // 2.5
// 12.06 — the ⚑ static encoding of S1b. Rounded to 2dp because 2.01 * 6 is 12.059999999999999 in
// binary floating point, and the authored JSON carries the decimal literal.
const CD_STATIC = Number((CD_PER_AMMO * CHAR.ammo).toFixed(2));

type DamageEvent = Extract<SimEvent, { kind: 'damage' }>;
type BuffEvent = Extract<SimEvent, { kind: 'buffApply' }>;
type ShotEvent = Extract<SimEvent, { kind: 'shot' }>;

function run(override?: unknown) {
  const ev: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SLUG),
    ...(override === undefined
      ? {}
      : { overrides: { [SLUG]: override as never } }),
    cfg: { onEvent: (e) => ev.push(e) },
  });
  const mine = ev.filter((e) => 'slug' in e && e.slug === SLUG);
  const dmg = mine.filter((e): e is DamageEvent => e.kind === 'damage');
  return {
    res,
    ev,
    unit: unitOf(res, SLUG),
    shots: mine.filter((e): e is ShotEvent => e.kind === 'shot'),
    /** Her weapon-fire instances — the parents the S2a rider rides. */
    parents: dmg.filter((e) => e.bucket === 'normal'),
    /** S2a rider instances: the only shape whose whole multiplier decomposition is 1s. */
    riders: dmg.filter(
      (e) =>
        e.srcSlot === 'skill2' &&
        e.mult.major === 1 &&
        e.mult.elem === 1 &&
        e.mult.charge === 1 &&
        e.mult.dmgUp === 1
    ),
    buffs: ev.filter((e): e is BuffEvent => e.kind === 'buffApply'),
    /** Buffs emilia CAST (on anyone). */
    cast: ev.filter(
      (e): e is BuffEvent =>
        e.kind === 'buffApply' &&
        e.casterIdx === res.units.findIndex((u) => u.slug === SLUG)
    ),
  };
}

const shipped = run();

describe('emilia — kit spec', () => {
  it('scope: the fixture actually exercises her burst-gated lines', () => {
    expect(shipped.res.fullBursts).toBeGreaterThan(0);
    expect(shipped.unit.burstCasts).toBeGreaterThan(0);
    expect(shipped.unit.pulls).toBeGreaterThan(0);
  });

  // ---- S1a: full charge -> self Charge Speed ▲13.01%, 1 round -------------------------------
  describe('S1a — Charge Speed ▲13.01% for 1 round, on every full charge', () => {
    // Scoped to THIS line's value: her burst grants a SECOND chargeSpeedPct (the ▼300% downside),
    // so an unscoped filter would collect both sources and count her burst casts as full charges.
    const cs = shipped.cast.filter(
      (b) => b.stat === 'chargeSpeedPct' && b.value === CS_PER_CHARGE
    );

    it('applies once per full-charge pull, at the kit value', () => {
      expect(cs.length).toBe(shipped.unit.pulls);
      expect(new Set(cs.map((b) => b.value))).toEqual(new Set([CS_PER_CHARGE]));
    });

    it('is a ROUND count, not a wall-clock window', () => {
      // "for 1 round(s)" — durationShots 1 with NO time expiry. A durationSec stand-in (the
      // classic mis-encoding) would set expiresFrame and leave durationShots null.
      expect(
        cs.every((b) => b.durationShots === 1 && b.expiresFrame === null)
      ).toBe(true);
    });

    it('is SELF-scoped — no teammate ever receives it', () => {
      expect(new Set(cs.map((b) => b.targetSlug))).toEqual(new Set([SLUG]));
    });

    it.skip('GAP (theme 21): the charge-speed buff never reaches a round — see the header', () => {
      // Blocked by the "buff my NEXT round" engine gap: firePull decrements the round budget of a
      // buff the SAME pull applied, so durationShots 1 on a shotFired trigger is dead on arrival.
      // Counterfactual measured on this fixture: durationShots 1 -> 116 pulls (identical to having
      // no charge-speed effect at all); durationShots 2 -> 128 pulls. Un-skip when the decrement
      // stops consuming buffs applied by the pull it is decrementing for.
      const without = run(
        withPatchedOverride(SLUG, (ov: any) => {
          ov.skill1[0].effects = ov.skill1[0].effects.filter(
            (e: any) => e.stat !== 'chargeSpeedPct'
          );
        })
      );
      expect(shipped.unit.pulls).toBeGreaterThan(without.unit.pulls);
    });
  });

  // ---- S1b: full charge -> self Charge Damage ▲2.01%/ammo, 1 round --------------------------
  describe('S1b — Charge Damage ▲2.01% per unit of Max Ammo, for 1 round', () => {
    const cd = shipped.cast.filter(
      (b) => b.stat === 'chargeDamagePct' && b.value === CD_STATIC
    );

    it('encodes 2.01 x her base Max Ammunition Capacity, per full charge, for 1 round', () => {
      // The ⚑ static approximation, pinned to characters.json so it cannot drift silently.
      expect(CD_STATIC).toBeCloseTo(12.06, 10);
      expect(cd.length).toBe(shipped.unit.pulls);
      expect(
        cd.every((b) => b.durationShots === 1 && b.expiresFrame === null)
      ).toBe(true);
      expect(new Set(cd.map((b) => b.targetSlug))).toEqual(new Set([SLUG]));
    });

    it.skip('GAP (theme 21): it should move the CHARGE bucket to 2.6206 — see the header', () => {
      // Blocked by the same "buff my NEXT round" gap. Counterfactual on this fixture: with
      // durationShots 1 her charge bucket only ever reads {2.5, 15.5053} — the 12.06 never lands;
      // with durationShots 2 it reads {2.5, 2.6206, 15.6259}, i.e. exactly the values asserted here.
      // A generic Attack-Damage mis-scoping would move dmgUp instead, which is what this
      // discriminates once the gap is closed.
      const buffed = shipped.parents.filter((p) => p.mult.charge < 10); // exclude the nuke shots
      expect(
        buffed.some(
          (p) =>
            Math.abs(p.mult.charge - (BASE_CHARGE + CD_STATIC / 100)) < 1e-9
        )
      ).toBe(true);
      // ...and her very first shot of the fight predates the buff, so the UNBUFFED base is
      // observed too — proof the value above is this line's doing and not a constant.
      expect(
        Math.abs(shipped.parents[0].mult.charge - BASE_CHARGE)
      ).toBeLessThan(1e-9);
    });

    it('the buff IS applied on every pull — the gap is the round budget, not the trigger', () => {
      // What remains TRUE and worth pinning today: the block fires, targets self, carries the kit
      // value and a 1-round budget. Only the budget's consumption is wrong, and that is the engine's.
      expect(
        shipped.cast.filter(
          (b) => b.stat === 'chargeDamagePct' && b.value === CD_STATIC
        ).length
      ).toBe(shipped.unit.pulls);
    });
  });

  // ---- S2a: the %-of-hit repeat -------------------------------------------------------------
  describe('S2a — Fixed Damage = 58.99% of the damage dealt, on every full-charge hit', () => {
    it('fires once per full-charge hit', () => {
      expect(shipped.riders.length).toBe(shipped.unit.pulls);
    });

    it('DISCRIMINATING: every instance is exactly 58.99% of THAT hit’s final damage', () => {
      const byFrame = new Map(shipped.parents.map((p) => [p.frame, p]));
      const bad = shipped.riders
        .filter((r) => {
          const want = (REPEAT_PCT / 100) * byFrame.get(r.frame)!.amount;
          return Math.abs(r.amount - want) > 1e-9 * want;
        })
        .map((r) => `t=${r.sec.toFixed(2)}`);
      expect(bad.slice(0, 5)).toEqual([]);
    });

    it('DISCRIMINATING: the ratio holds on the BURST NUKE too, whose parent is ~6x bigger', () => {
      // This is what forbids the additive `chargeDamagePct` fold. The repeat is MULTIPLICATIVE
      // on the whole parent hit; the charge bucket is ADDITIVE. Any constant folded into the
      // charge bucket that is right outside the burst is badly wrong on the nuke, and vice
      // versa — so a constant 58.99% ratio across both is only reachable with a real rider.
      const byFrame = new Map(shipped.parents.map((p) => [p.frame, p]));
      const nukes = shipped.riders.filter(
        (r) => byFrame.get(r.frame)!.mult.charge > 10
      );
      const plain = shipped.riders.filter(
        (r) => byFrame.get(r.frame)!.mult.charge < 10
      );
      expect(nukes.length).toBeGreaterThan(0);
      expect(plain.length).toBeGreaterThan(0);
      const ratio = (r: DamageEvent) => r.amount / byFrame.get(r.frame)!.amount;
      for (const r of [...nukes, ...plain]) {
        expect(ratio(r)).toBeCloseTo(REPEAT_PCT / 100, 12);
      }
      // ...and the two parent populations really are far apart, so the constancy is non-trivial.
      const nukeParent = byFrame.get(nukes[0].frame)!;
      const plainParent = byFrame.get(plain[0].frame)!;
      expect(nukeParent.mult.charge / plainParent.mult.charge).toBeGreaterThan(
        5
      );
    });

    it('takes NO multiplier of its own — never a second core, never a second charge bucket', () => {
      // scope lock runs coreHitRate 1, so the PARENT genuinely carries core; the rider must
      // inherit it only through the parent's number, never apply it again.
      expect(
        shipped.parents.every((p) => p.coreEligible && p.coreRate > 0)
      ).toBe(true);
      expect(
        shipped.riders.every((r) => !r.coreEligible && r.coreRate === 0)
      ).toBe(true);
      expect(
        shipped.riders.every((r) => !r.critEligible && !r.fbMajorApplied)
      ).toBe(true);
      expect(shipped.riders.every((r) => r.mult.charge === 1)).toBe(true);
      // (The "never takes the +30% range bonus" half of §3's rule is structurally vacuous for
      // emilia — she is an RL, and RLs never receive the range bonus at all, so her PARENT does
      // not take it either. It is exercised on a range-eligible carrier in
      // scripts/tests/engine/hit-repeat.test.ts instead of being asserted vacuously here.)
      expect(shipped.parents.every((p) => !p.rangeApplied)).toBe(true);
    });

    it('lands in the SKILL bucket, attributed to skill2', () => {
      expect(
        shipped.riders.every(
          (r) => r.bucket === 'skill' && r.srcSlot === 'skill2'
        )
      ).toBe(true);
      expect(shipped.unit.breakdown.skill).toBeGreaterThan(0);
    });

    it('COUNTERFACTUAL: dropping it is a large, load-bearing loss', () => {
      const without = run(
        withPatchedOverride(SLUG, (ov: any) => {
          ov.skill2 = ov.skill2.filter(
            (b: any) => !b.effects.some((e: any) => e.kind === 'hitRepeat')
          );
        })
      );
      expect(without.riders).toEqual([]);
      // ~59% on top of every charged hit — far outside any ±3% board band.
      expect(
        shipped.unit.totalDamage / without.unit.totalDamage
      ).toBeGreaterThan(1.3);
    });
  });

  // ---- S2b: Full Burst entry -> self Max Ammo ▲3, 10s ---------------------------------------
  describe('S2b — Max Ammunition Capacity ▲3 for 10 sec, on entering Full Burst', () => {
    const ammo = shipped.cast.filter((b) => b.stat === 'maxAmmoFlat');

    it('applies once per Full Burst, at the kit value, for 10 SECONDS', () => {
      expect(ammo.length).toBe(shipped.res.fullBursts);
      expect(new Set(ammo.map((b) => b.value))).toEqual(new Set([AMMO_GRANT]));
      // "for 10 sec" is a wall-clock window: expiry set, no round budget.
      expect(
        ammo.every(
          (b) =>
            b.durationShots === null && b.expiresFrame === b.frame + 10 * 60
        )
      ).toBe(true);
      expect(new Set(ammo.map((b) => b.targetSlug))).toEqual(new Set([SLUG]));
    });

    it('DISCRIMINATING: her magazine cap rises by exactly +3 rounds inside the window', () => {
      // Asserted as a DELTA against the same fixture with only this effect stripped, NOT as an
      // absolute: `liter`'s S2 escalating team buff grants maxAmmoPct 45.17, so emilia's baseline
      // cap in the control comp is round(6 x 1.4517) = 9, not her datamined 6. A delta is immune to
      // that (and to any future teammate ammo buff) while still proving the flat grant landed AND
      // that the reload refilled to the raised cap.
      const without = run(
        withPatchedOverride(SLUG, (ov: any) => {
          ov.skill2 = ov.skill2.filter(
            (b: any) => !b.effects.some((e: any) => e.stat === 'maxAmmoFlat')
          );
        })
      );
      const cap = (r: typeof shipped) =>
        Math.max(...r.shots.map((s) => s.ammoAfter)) + 1;
      expect(cap(shipped) - cap(without)).toBe(AMMO_GRANT);
      // ...and it really is FLAT rounds, not a percentage of her 6-round magazine.
      expect(cap(shipped)).toBeGreaterThan(CHAR.ammo);
    });
  });

  // ---- Burst: Charge Damage ▲1300.53% for 1 shot --------------------------------------------
  describe('Burst B3 — Charge Damage ▲1300.53% for 1 shot', () => {
    const nuke = shipped.cast.filter(
      (b) => b.stat === 'chargeDamagePct' && b.value === NUKE_CD
    );

    it('is granted once per burst cast, self, for ONE round', () => {
      expect(nuke.length).toBe(shipped.unit.burstCasts);
      expect(
        nuke.every((b) => b.durationShots === 1 && b.expiresFrame === null)
      ).toBe(true);
      expect(new Set(nuke.map((b) => b.targetSlug))).toEqual(new Set([SLUG]));
    });

    it('DISCRIMINATING: EXACTLY ONE shot per cast carries it — the round count, not seconds', () => {
      const boosted = shipped.parents.filter((p) => p.mult.charge > 10);
      expect(boosted.length).toBe(shipped.unit.burstCasts);
      // ...and the boost is ADDITIVE at exactly +1300.53 percentage points (chargeDamagePct), NOT
      // a base-scaling chargeDamageMultPct, which would multiply the 2.5 base and add 32.5.
      // Asserted as this line's OWN contribution — the un-boosted charge of the same fixture plus
      // NUKE_CD/100 — rather than as an absolute sum, so it isolates the burst line instead of
      // silently also pinning whatever S1b contributes (today: nothing, per the theme-21 gap).
      const unboosted = Math.max(
        ...shipped.parents
          .filter((p) => p.mult.charge < 10)
          .map((p) => p.mult.charge)
      );
      for (const p of boosted) {
        expect(p.mult.charge).toBeCloseTo(unboosted + NUKE_CD / 100, 9);
      }
      // the explicit anti-`chargeDamageMultPct` check: that stat would scale the 2.5 BASE,
      // adding 2.5 x 13.0053 = 32.51 points instead of 13.0053.
      expect(boosted[0].mult.charge).toBeLessThan(
        unboosted + BASE_CHARGE * (NUKE_CD / 100)
      );
    });
  });

  // ---- structural pins -----------------------------------------------------------------------
  describe('encoding hygiene', () => {
    const ov: any = withPatchedOverride(SLUG, () => {});

    it('the burst Explosion Range line is recorded VERBATIM as unmodeled, not silently dropped', () => {
      expect(ov.unmodeled.burst).toContain(
        'Explosion Range ▲ 101.24% for 10 sec.'
      );
      const stats = ['skill1', 'skill2', 'burst'].flatMap((s) =>
        (ov[s] ?? []).flatMap((b: any) =>
          b.effects.map((e: any) => e.stat ?? e.kind)
        )
      );
      expect(stats).not.toContain('partsDamagePct');
    });

    it('the modeled inventory is exactly the kit lines this spec asserts', () => {
      const inventory = ['skill1', 'skill2', 'burst'].flatMap((s) =>
        (ov[s] ?? []).flatMap((b: any) =>
          b.effects.map(
            (e: any) =>
              `${s}:${b.trigger.kind}:${b.target.kind}:${e.stat ?? e.kind}`
          )
        )
      );
      expect(inventory.sort()).toEqual(
        [
          'skill1:shotFired:self:chargeSpeedPct',
          'skill1:shotFired:self:chargeDamagePct',
          'skill2:shotFired:enemy:hitRepeat',
          'skill2:fullBurstEnter:self:maxAmmoFlat',
          'burst:burstCast:self:chargeSpeedPct',
          'burst:burstCast:self:chargeDamagePct',
        ].sort()
      );
    });

    it('she buffs nobody but herself', () => {
      expect(new Set(shipped.cast.map((b) => b.targetSlug))).toEqual(
        new Set([SLUG])
      );
    });
  });

  // ---- Burst: Charge Speed ▼300% for 1 shot — the nuke's DOWNSIDE ----------------------------
  describe('Burst B2 — Charge Speed ▼300% for 1 shot', () => {
    it('is granted once per burst cast, self, for ONE round', () => {
      const cs = shipped.cast.filter(
        (b) => b.stat === 'chargeSpeedPct' && b.value === -BURST_CS_DOWN
      );
      expect(cs.length).toBe(shipped.unit.burstCasts);
      expect(
        cs.every((b) => b.durationShots === 1 && b.expiresFrame === null)
      ).toBe(true);
      expect(new Set(cs.map((b) => b.targetSlug))).toEqual(new Set([SLUG]));
    });

    it('DISCRIMINATING: the nuke shot really is the slowest charge in the fight', () => {
      // Charge Speed is SUBTRACTIVE on charge TIME, so ▼300% means 60 x 4 = 240 frames of charge
      // instead of 60 — the nuke is bought with a genuinely long one. Asserted as a CLEAN
      // SEPARATION between the two populations of inter-shot gaps: every boosted shot is preceded
      // by a longer gap than EVERY unboosted shot, with no overlap. That is strictly sharper than
      // a fixed threshold (which cannot be tuned to sit between them without knowing the answer)
      // and it is what proves the cost rides the SAME pull as the payoff rather than a neighbour.
      // Measured on this fixture: nuke gaps {262, 322}, ordinary gaps {82, 142, 172} — the 142/172
      // are reload-inflated cycles, which is exactly what a naive "gap > 2x chargeFrames" test
      // would have mistaken for slow charges.
      const gapBefore = new Map<number, number>();
      for (let i = 1; i < shipped.shots.length; i++) {
        gapBefore.set(
          shipped.shots[i].frame,
          shipped.shots[i].frame - shipped.shots[i - 1].frame
        );
      }
      const nukeFrames = new Set(
        shipped.parents.filter((p) => p.mult.charge > 10).map((p) => p.frame)
      );
      const nukeGaps: number[] = [];
      const otherGaps: number[] = [];
      for (const [f, g] of gapBefore) {
        (nukeFrames.has(f) ? nukeGaps : otherGaps).push(g);
      }
      expect(nukeGaps.length).toBe(nukeFrames.size);
      expect(
        Math.min(...nukeGaps),
        `nuke gaps ${nukeGaps.join(',')} vs ordinary ${[...new Set(otherGaps)].sort((a, b) => a - b).join(',')}`
      ).toBeGreaterThan(Math.max(...otherGaps));
      // ...and the slow charge is the RIGHT length: 60 x 4 = 240 frames, plus the 22-frame release
      // latency she pays after the previous shot. (A nuke that follows a reload waits longer.)
      expect(Math.min(...nukeGaps)).toBe(CHAR.chargeFrames * 4 + 22);
    });

    it('COUNTERFACTUAL: omitting the downside would OVER-credit her', () => {
      const without = run(
        withPatchedOverride(SLUG, (ov: any) => {
          ov.burst[0].effects = ov.burst[0].effects.filter(
            (e: any) => e.stat !== 'chargeSpeedPct'
          );
        })
      );
      expect(without.unit.pulls).toBeGreaterThan(shipped.unit.pulls);
      expect(without.unit.totalDamage).toBeGreaterThan(
        shipped.unit.totalDamage
      );
    });
  });
});
