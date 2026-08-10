// PER-UNIT KIT SPEC — `eunhwa` (Eunhwa, Attacker/SR/Fire, Burst II, cd 20s, ammo 6,
// chargeFrames 60, reloadFrames 161, chargeMultiplier 250). Kit-autonomy gauntlet 2026-08-05.
// BASE UNIT — never the variant eunhwa-tactical-upgrade (aka eunwhatu); P0 disambiguation.
// SSR rarity despite the SR weapon class → the plain scope-lock ceiling (copies 10 ⇒ 3★ +
// core 7) is reachable in game; no unitLimits needed (unlike SR-rarity units, belorta).
//
// One assertion group per KIT LINE (S1a, S1b, S2, B1, B2, B3 below), asserted against the
// SHIPPED override loaded from disk. `withPatchedOverride` appears only to build
// COUNTERFACTUALS (the nearest wrong model each assertion must discriminate against) —
// never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.eunhwa.skills):
//   S1 ■ self, after firing the last round:
//        Charge Damage ▲37.28% for 2 shots                                             [S1a]
//        Charge Speed ▲15.53% for 2 rounds                                             [S1b]
//   S2 ■ the target, after firing the last bullet: DEF ▼29% for 5 sec                  [S2]
//   BU ■ the 10 enemy unit(s) with the highest final ATK:
//        85.62% of final ATK as damage                                                 [B1]
//        DEF ▼2.43% for 15 sec                                                         [B2]
//      ■ all allies: Critical Rate ▲4.65% for 15 sec                                   [B3]
//
// Dispositions:
//   S1a/S1b FAITHFUL — lastBullet trigger ("after firing the last round" = the reload-start
//       convention, engine fires lastBullet on the frame the mag runs dry), self buff,
//       ROUND-COUNT windows: "for 2 shots" / "for 2 rounds" are durationShots 2 with NO
//       wall-clock expiry, so the window survives the 161f reload and expires right after
//       her 2nd shot of the next magazine (Tier-2 round-count discrimination).
//   S2  FAITHFUL (encoded 2026-08-10 on the enemy defPct channel): DEF ▼29% for 5 sec on the
//       kit's own lastBullet trigger. The graded basis is bossDef = 140, so the shave is worth
//       ~0.02% there and is live at the web app's raid DEF defaults. Nearest wrong model:
//       laundering the DEF▼ into damageTakenPct (a different mechanic — the boss taking more
//       damage) would fabricate a ~29% team lift the kit never grants; that trap stays pinned.
//   B1  FAITHFUL — burstCast flatDamage 85.62 ("the 10 enemy unit(s) with the highest final
//       ATK" collapses to the single immortal boss — multi-target selection is inert in the
//       single-target sim, exia precedent). The cast lands BEFORE the Full Burst window, so it
//       must never take the +50% FB major (engine auto-exempts burstCast damage); it crits at
//       the caster rate (U1 rider convention).
//   B2  FAITHFUL (encoded 2026-08-10): DEF ▼2.43% for 15 sec, riding the nuke block AFTER the
//       flatDamage (kit-order effects). Same channel and same basis note as S2.
//   B3  FAITHFUL — burstCast-keyed critRatePct 4.65 to ALL allies (self included — the kit
//       says "all allies", never "other allies"), 15s wall-clock window. Tier-2
//       burstCast-vs-fullBurstEnter discrimination: the buff is granted by HER burst skill, so
//       it must apply on HER casts only — not on every Full Burst the team opens (fixture A
//       runs a second Burst II who leads the FB cycles, so the two keyings produce different
//       frames and different cast/FB counts).
//
// Fixtures (both deterministic — no seed; event-log over totals):
//   A (rotation): liter (B1) / delta (B2, 40s) / eunhwa (B2, 20s) / ada (B3, 40s), forced-
//       neutral boss (null), camera focus eunhwa (SR charge weapon ⇒ ×2.5 burst gauge). Delta
//       sits LEFT of eunhwa, so delta wins every B2 tie and leads the FB cycles on her 40s CD
//       (ada's 40s CD gates FBs to the same cycles); eunhwa casts on the ALTERNATE chains.
//       Her cast frames are therefore always distinct from every Full Burst start frame — the
//       burstCast-vs-fullBurstEnter discriminator. Delta's kit is self-only (no ally buffs, no
//       boss debuffs), so nothing else touches the crit/charge observations.
//   B (solo window): liter / eunhwa / ada, same basis — she is the ONLY Burst II, so she casts
//       every chain and her 15s buff windows have clean 5s gaps for functional observation
//       (per-shot crit-rate delta, charge duty cycle, charge-cycle shortening).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import { runComp, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** Fixture A slot order: liter 0 / delta 1 / eunhwa 2 / ada 3. */
const EUNHWA_A = 2;
const TEAM_SIZE_A = 4;
/** Fixture B slot order: liter 0 / eunhwa 1 / ada 2. */
const EUNHWA_B = 1;
const EUNHWA = 'eunhwa';

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function runA(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({
    slugs: ['liter', 'delta', EUNHWA, 'ada'],
    bossElement: null,
    focusSlug: EUNHWA,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events;
}
function runB(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  runComp({
    slugs: ['liter', EUNHWA, 'ada'],
    bossElement: null,
    focusSlug: EUNHWA,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return events;
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const shots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === EUNHWA);
/** The last bullet of each magazine (ammoAfter 0) — the S1/S2 activation moment. */
const lastBullets = (evs: SimEvent[]) =>
  shots(evs).filter((s) => s.ammoAfter === 0);
const casts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === EUNHWA
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart');
/** Her S1 self-buff applications for one stat. */
const s1Buffs = (evs: SimEvent[], stat: string, slot: number) =>
  buffs(evs).filter(
    (b) => b.casterIdx === slot && b.targetIdx === slot && b.stat === stat
  );
/** Her burst-skill crit buff applications. */
const critBuffs = (evs: SimEvent[], slot: number) =>
  buffs(evs).filter((b) => b.casterIdx === slot && b.stat === 'critRatePct');

// ---- counterfactual patches -------------------------------------------------------------------
/** S1 counterfactual: the nearest wrong model — both S1 lines as ONE permanent passive buff
 *  (no lastBullet keying, no round-count expiry). Over-credits every shot of the fight. */
const eunhwaS1Passive = withPatchedOverride(EUNHWA, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.map((b: any) => ({
    ...b,
    trigger: { kind: 'passive' },
    effects: b.effects.map((e: any) => {
      const { durationShots: _durationShots, ...rest } = e;
      return rest;
    }),
  }));
  if (ov.skill1.length !== before || before === 0) {
    throw new Error('eunhwa skill1 blocks missing — fixture is stale');
  }
});
/** B1 counterfactual: the burst nuke REMOVED entirely (a bare-baseline burst). */
const eunhwaNoNuke = withPatchedOverride(EUNHWA, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (ov.burst.length === before) {
    throw new Error('eunhwa burst flatDamage block missing — fixture is stale');
  }
});
/** B3 counterfactual: the crit buff keyed to fullBurstEnter instead of burstCast — applies on
 *  EVERY Full Burst the team opens, not on her casts. */
const eunhwaCritOnFbEnter = withPatchedOverride(EUNHWA, (ov) => {
  const block = ov.burst.find((b: any) =>
    b.effects.some((e: any) => e.stat === 'critRatePct')
  );
  if (!block) {
    throw new Error(
      'eunhwa burst critRatePct block missing — fixture is stale'
    );
  }
  block.trigger = { kind: 'fullBurstEnter' };
});
/** S2 counterfactual: the nearest wrong encoding — laundering the DEF▼ into a boss
 *  damageTakenPct debuff (a different mechanic the kit never grants). */
const eunhwaS2Laundered = withPatchedOverride(EUNHWA, (ov) => {
  ov.skill2 = [
    {
      slot: 'skill2',
      trigger: { kind: 'lastBullet' },
      target: { kind: 'enemy' },
      effects: [
        { kind: 'buff', stat: 'damageTakenPct', value: 29, durationSec: 5 },
      ],
    },
  ];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const baseA = runA();
const baseB = runB();
const noCritB = runB({
  [EUNHWA]: withPatchedOverride(EUNHWA, (ov) => {
    const before = ov.burst.length;
    ov.burst = ov.burst.filter(
      (b: any) => !b.effects.some((e: any) => e.stat === 'critRatePct')
    );
    if (ov.burst.length === before) {
      throw new Error(
        'eunhwa burst critRatePct block missing — fixture is stale'
      );
    }
  }),
});
const s1PassiveB = runB({ [EUNHWA]: eunhwaS1Passive });
const launderedB = runB({ [EUNHWA]: eunhwaS2Laundered });
const fbEnterA = runA({ [EUNHWA]: eunhwaCritOnFbEnter });
const noNukeA = runA({ [EUNHWA]: eunhwaNoNuke });

// ---- derived observations ---------------------------------------------------------------------
/** Group her shots by magazine ordinal. */
function byMag(evs: SimEvent[]): Map<number, Shot[]> {
  const m = new Map<number, Shot[]>();
  for (const s of shots(evs)) {
    (m.get(s.magIndex) ?? m.set(s.magIndex, []).get(s.magIndex)!).push(s);
  }
  return m;
}
const chargeOf = (s: Shot, evs: SimEvent[]): number => {
  const d = dmg(evs).find(
    (x) => x.slug === EUNHWA && x.srcSlot === 'normal' && x.frame === s.frame
  );
  if (!d) {
    throw new Error(`no normal damage event for shot at frame ${s.frame}`);
  }
  return d.mult.charge;
};
const normalCritRates = (evs: SimEvent[], slug: string): string[] =>
  [
    ...new Set(
      dmg(evs)
        .filter((d) => d.slug === slug && d.bucket === 'normal')
        .map((d) => d.critRate.toFixed(9))
    ),
  ].sort();

describe('eunhwa — kit spec', () => {
  describe('S1a/S1b — last-round self buffs: Charge Damage ▲37.28% + Charge Speed ▲15.53%, 2 rounds', () => {
    const cdApplies = s1Buffs(baseB, 'chargeDamagePct', EUNHWA_B);
    const csApplies = s1Buffs(baseB, 'chargeSpeedPct', EUNHWA_B);
    const dryFires = lastBullets(baseB);

    it('fire once per magazine dry-fire (lastBullet), not per shot and not once at t=0', () => {
      expect(dryFires.length).toBeGreaterThan(3);
      expect(cdApplies.length).toBe(dryFires.length);
      expect(csApplies.length).toBe(dryFires.length);
    });

    it('apply on the exact frame the magazine runs dry', () => {
      const dryFrames = new Set(dryFires.map((s) => s.frame));
      for (const b of [...cdApplies, ...csApplies]) {
        expect(
          dryFrames.has(b.frame),
          `buffApply at frame ${b.frame} has no matching last-bullet shot`
        ).toBe(true);
      }
    });

    it('are ROUND-COUNT windows (2 shots) with no wall-clock expiry', () => {
      expect([...new Set(cdApplies.map((b) => b.value))]).toEqual([37.28]);
      expect([...new Set(csApplies.map((b) => b.value))]).toEqual([15.53]);
      expect([...new Set(cdApplies.map((b) => b.durationShots))]).toEqual([2]);
      expect([...new Set(csApplies.map((b) => b.durationShots))]).toEqual([2]);
      expect(
        [...new Set([...cdApplies, ...csApplies].map((b) => b.expiresFrame))],
        'a round-count buff must not also carry a timed expiry'
      ).toEqual([null]);
    });

    it('boost ONLY the first 2 shots of the next magazine (duty cycle, not always-on)', () => {
      const mags = byMag(baseB);
      let checkedMags = 0;
      for (const [mag, magShots] of mags) {
        if (mag === 0 || magShots.length < 3) {
          continue; // first mag predates any dry-fire; short last mag has no full pattern
        }
        const charges = magShots.map((s) => chargeOf(s, baseB));
        const base = charges[2]; // 3rd shot is always outside the 2-shot window
        const boosted = charges.filter((c) => c > base);
        expect(
          boosted.length,
          `mag ${mag}: ${boosted.length} boosted shots, expected exactly 2`
        ).toBe(2);
        expect(
          charges.slice(0, 2).every((c) => c > base),
          `mag ${mag}: the boosted shots must be the FIRST two of the magazine`
        ).toBe(true);
        // chargeDamagePct is additive percentage points INSIDE the charge bucket:
        // (250 + 37.28) / 250 — the kit magnitude, not a fitted number.
        expect(boosted[0] / base).toBeCloseTo(287.28 / 250, 9);
        checkedMags++;
      }
      expect(checkedMags).toBeGreaterThan(3);
    });

    it('SHORTEN the charge cycle by exactly round(60 × 15.53/100) = 9 frames for 2 rounds', () => {
      const mags = byMag(baseB);
      let checkedMags = 0;
      for (const [mag, magShots] of mags) {
        if (mag === 0 || magShots.length < 3) {
          continue;
        }
        const buffedGap = magShots[1].frame - magShots[0].frame; // both shots in-window
        const plainGap = magShots[2].frame - magShots[1].frame; // out of window
        expect(
          plainGap - buffedGap,
          `mag ${mag}: charge speed must shorten the in-window cycle by 9f (51f vs 60f)`
        ).toBe(9);
        checkedMags++;
      }
      expect(checkedMags).toBeGreaterThan(3);
    });

    it('DISCRIMINATING: a permanent passive would boost EVERY shot (incl. magazine 0)', () => {
      // Passive counterfactual: one t=0 application per stat (not one per dry-fire)...
      expect(s1PassiveB.length).toBeGreaterThan(0);
      const passiveCd = s1Buffs(s1PassiveB, 'chargeDamagePct', EUNHWA_B);
      expect(passiveCd.length, 'passive fires once, not per magazine').toBe(1);
      // ...and EVERY shot boosted, starting with magazine 0 (the shipped model never does).
      const mags = byMag(s1PassiveB);
      const mag0 = mags.get(0)!;
      const charges0 = mag0.map((s) => chargeOf(s, s1PassiveB));
      expect(
        new Set(charges0).size,
        'passive model boosts magazine 0 uniformly — shipped leaves it unboosted'
      ).toBe(1);
      const m1 = mags.get(1)!;
      const charges1 = m1.map((s) => chargeOf(s, s1PassiveB));
      expect(
        charges1.every((c) => c === charges1[0]),
        'passive model has no 2-shot duty cycle'
      ).toBe(true);
      // Magazine-0 charge cycle is NOT shortened under the shipped round-count model
      // (no dry-fire has happened yet, so no window was ever granted)...
      const magsBase = byMag(baseB);
      const b0 = magsBase.get(0)!;
      expect(b0[1].frame - b0[0].frame).toBe(b0[2].frame - b0[1].frame);
      // ...but IS shortened under the passive counterfactual — uniformly, from the very
      // first charge (the discrimination: a passive buff is live before any reload).
      const p0 = mags.get(0)!;
      expect(
        p0[1].frame - p0[0].frame,
        'passive model: magazine 0 is uniformly buffed'
      ).toBe(p0[2].frame - p0[1].frame);
      expect(p0[1].frame - p0[0].frame).toBeLessThan(b0[1].frame - b0[0].frame);
    });
  });

  describe('S2 — DEF ▼29%/5s per magazine-end on the enemy defPct channel (encoded 2026-08-10)', () => {
    it('the line is no longer in the unmodeled block (encoded); skill2 still produces no damage', () => {
      const ov = loadOverride(EUNHWA) as any;
      expect(ov.unmodeled.skill2).toEqual([]);
      expect(
        dmg(baseA).filter((d) => d.slug === EUNHWA && d.srcSlot === 'skill2'),
        'skill2 must produce no damage instances'
      ).toEqual([]);
    });

    it('every boss-held buff in her fixtures is one of her two defPct shaves (-29 or -2.43) — nothing else', () => {
      // Boss debuffs emit with targetIdx null (no caster attribution). No fixture mate
      // applies one (liter/delta have no enemy-targeted blocks; ada's are DoTs, not buffs).
      // Channel damage math owned by enemy-def-debuff.test.ts (reuse-before-derive).
      for (const evs of [baseA, baseB]) {
        const other = buffs(evs).filter(
          (b) =>
            b.targetIdx === null &&
            !(b.stat === 'defPct' && (b.value === -29 || b.value === -2.43))
        );
        expect(
          other.map((b) => `${b.stat}:${b.value}`),
          'only her two defPct shaves may be boss-held'
        ).toEqual([]);
      }
    });

    it('the -29 shave fires once per magazine dry-fire, 5s window, from the skill2 slot (fixture B)', () => {
      const shaves = buffs(baseB).filter(
        (b) => b.targetIdx === null && b.stat === 'defPct' && b.value === -29
      );
      const dryFrames = lastBullets(baseB).map((e) => e.frame);
      expect(shaves.length).toBe(dryFrames.length);
      expect(shaves.length).toBeGreaterThan(5);
      expect(shaves.map((b) => b.frame)).toEqual(dryFrames);
      for (const b of shaves) {
        expect(b.key.startsWith(`${EUNHWA_B}:skill2:`)).toBe(true);
        expect(b.expiresFrame! - b.frame).toBe(5 * 60);
      }
    });

    it('DISCRIMINATING: a damageTakenPct laundering would emit boss debuffs', () => {
      const laundered = buffs(launderedB).filter(
        (b) => b.targetIdx === null && b.stat === 'damageTakenPct'
      );
      expect(
        laundered.length,
        'the laundered model emits boss debuffs — the shipped model must not'
      ).toBeGreaterThan(0);
      expect([...new Set(laundered.map((b) => b.value))]).toEqual([29]);
    });
  });

  describe('B1 — burst nuke: 85.62% of final ATK, once per cast, before the FB window', () => {
    const nukes = dmg(baseA).filter(
      (d) => d.slug === EUNHWA && d.srcSlot === 'burst'
    );
    const herCasts = casts(baseA);

    it('casts her burst at all in the rotation fixture', () => {
      expect(herCasts.length).toBeGreaterThan(2);
    });

    it('fires one burst-bucket hit per cast at the kit magnitude', () => {
      expect(nukes.length).toBe(herCasts.length);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([85.62]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
      expect(nukes.every((d) => d.critEligible)).toBe(true);
    });

    it('lands on the cast frame and never takes the +50% FB major', () => {
      const castFrames = herCasts.map((c) => c.frame).sort((a, b) => a - b);
      expect(nukes.map((d) => d.frame).sort((a, b) => a - b)).toEqual(
        castFrames
      );
      expect(
        nukes.filter((d) => d.fbMajorApplied),
        'burst-cast damage must precede the FB window'
      ).toEqual([]);
    });

    it('DISCRIMINATING: removing the nuke leaves zero burst damage from her', () => {
      expect(
        dmg(noNukeA).filter((d) => d.slug === EUNHWA && d.srcSlot === 'burst')
          .length
      ).toBe(0);
    });
  });

  describe('B2 — burst DEF ▼2.43%/15s rides the nuke block on the enemy defPct channel (encoded 2026-08-10)', () => {
    it('one -2.43 boss debuff per burst cast, same frames as the nuke, 15s window', () => {
      // Rides the flatDamage block AFTER the nuke (kit-order effects); the S2 group's
      // known-forms guard covers the laundering trap for BOTH DEF▼ lines.
      const shaves = buffs(baseA).filter(
        (b) => b.targetIdx === null && b.stat === 'defPct' && b.value === -2.43
      );
      const nukeFrames = dmg(baseA)
        .filter((d) => d.slug === EUNHWA && d.srcSlot === 'burst')
        .map((d) => d.frame);
      expect(shaves.length).toBe(nukeFrames.length);
      expect(shaves.length).toBeGreaterThan(0);
      expect(shaves.map((b) => b.frame)).toEqual(nukeFrames);
      for (const b of shaves) {
        expect(b.key.startsWith(`${EUNHWA_A}:burst:`)).toBe(true);
        expect(b.expiresFrame! - b.frame).toBe(15 * 60);
      }
    });

    it('the nuke carries the allEnemies scope tag (owner scope-string ruling 2026-08-10)', () => {
      const ov = loadOverride(EUNHWA) as any;
      const nuke = ov.burst
        .flatMap((b: any) => b.effects)
        .find((e: any) => e.kind === 'flatDamage');
      expect(nuke.burstDesc).toBe('allEnemies');
    });
  });

  describe('B3 — burst grants ALL allies Critical Rate ▲4.65% for 15 sec, on HER cast', () => {
    const applied = critBuffs(baseA, EUNHWA_A);
    const herCasts = casts(baseA);
    const fbFrames = new Set(fbStarts(baseA).map((e) => e.frame));

    it('applies once per HER cast — not once per Full Burst the team opens', () => {
      expect(applied.length).toBe(TEAM_SIZE_A * herCasts.length);
      // Her casts land on the alternate (non-FB) chains in this fixture — so a
      // fullBurstEnter-keyed model would apply on entirely different frames.
      for (const b of applied) {
        expect(
          herCasts.some((c) => c.frame === b.frame),
          `crit buff at frame ${b.frame} is not on one of her cast frames`
        ).toBe(true);
        expect(
          fbFrames.has(b.frame),
          `crit buff at frame ${b.frame} must not sit on a Full Burst start frame`
        ).toBe(false);
      }
    });

    it('reaches all four allies, including herself, for exactly 15 sec', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([4.65]);
      const perCast = new Map<number, Set<number>>();
      for (const b of applied) {
        (
          perCast.get(b.frame) ?? perCast.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx!);
      }
      expect(perCast.size).toBe(herCasts.length);
      for (const [frame, holders] of perCast) {
        expect(
          holders,
          `frame ${frame} reached ${holders.size} allies, expected all ${TEAM_SIZE_A}`
        ).toEqual(new Set([0, 1, 2, 3]));
      }
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(15 * FPS);
      }
    });

    it('DISCRIMINATING: a fullBurstEnter keying lands on FB frames, not her cast frames', () => {
      const onFb = critBuffs(fbEnterA, EUNHWA_A);
      expect(onFb.length).toBeGreaterThan(0);
      const herCastFrames = new Set(casts(fbEnterA).map((c) => c.frame));
      expect(
        onFb.filter((b) => herCastFrames.has(b.frame)).length,
        'fullBurstEnter applications miss her cast frames entirely in this fixture'
      ).toBe(0);
    });

    it('FUNCTIONAL: the buff is live — her crit rate moves by exactly 4.65 ppt in-window', () => {
      const rates = normalCritRates(baseB, EUNHWA).map(Number);
      expect(
        rates.length,
        'she must have both in-window and out-of-window normal shots'
      ).toBe(2);
      expect(rates[1] - rates[0]).toBeCloseTo(0.0465, 9);
    });

    it('FUNCTIONAL: every ally takes the crit lift, in every bucket (unscoped critRatePct)', () => {
      for (const slug of ['liter', EUNHWA, 'ada']) {
        expect(
          normalCritRates(baseB, slug),
          `${slug} normal-bucket crit must move when her buff is removed`
        ).not.toEqual(normalCritRates(noCritB, slug));
      }
    });
  });
});
