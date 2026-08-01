// PER-UNIT KIT SPEC — `julia` (Julia (Treasure), Attacker/AR/Iron, Burst III, cd 40s, ammo 60,
// 720 RPM, treasure variant of base Julia). Kit-autonomy gauntlet 2026-07-31, test-first (S2a).
//
// One assertion group per KIT LINE (J1..J5 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters.julia.skills):
//   S1 ■ self: Critical Rate ▲26.04% for 10 sec                                              [J1a]
//      ■ self: ATK ▲20% for 10 sec                                                           [J1b]
//      ■ self: Critical Rate OF NORMAL ATTACKS ▲36.16% for 10 sec                            [J1c]
//      (S1 has a 40s cooldown AND is force-cast at battle start — see S2's last line)
//   S2 ■ after landing 6 NA crits → self: Crescendo: Critical Damage ▲24.79%, max 5, 15 sec  [J2]
//      ■ after landing 8 NA crits → the target: Marcato: 88% of final ATK additional damage [J3]
//      ■ if Marcato lands as a crit → same target: 100% of final ATK additional damage       [J3b EV]
//      ■ at battle start → self: Forcefully uses Skill 1                                     [J1 timing]
//   BU ■ random enemies: 544.5% of final ATK, attacks sequentially 5 times                   [J4a]
//      ■ when Crescendo is at max stacks → same target: 544.5% of final ATK additional       [J4b]
//
// Encodings under test (see src/skills/overrides/julia.json for the full note):
//   - S1 = a fused-passive block (on at frame 0, expires after 10s — the battle-start force-cast,
//     chisato precedent; sim.ts alwaysOn rule keeps a durationSec-less passive permanent, but a
//     passive WITH durationSec decays from t=0) PLUS an interval:40 block (t=40/80/120/160).
//   - "landing N crits" has no engine trigger (hitCount counts ALL hits; sim.ts:1606 notes on-crit
//     trigger coupling is future work). Following eve's validated precedent, the crit thresholds
//     are converted to hit thresholds at her fight-averaged NA crit rate: S1 uptime 5×10s/180s
//     = 27.8% at 77.2% (15 base + 26.04 + 36.16) and 72.2% at 15% → 32.3% average → 6 crits =
//     ceil(6/0.323) = 19 hits, 8 crits = ceil(8/0.323) = 25 hits. Static proxy ⚑ (cannot track
//     the S1 window phase or external team crit buffs — eve's documented residual class).
//   - Crescendo stacks are a maxStacks-5 / 15s buff; a shadow `crescendo` resource (max 5, no
//     decay) feeds the burst bonus's resourceGate min:5 (soda-twinkling-bunny precedent). The
//     resource's no-decay diverges from the buff's 15s expiry ONLY if she stops landing NA crits
//     for 15s+ — impossible in continuous sim fire.
//   - Burst = one consolidated 2722.5% (5×544.5) burstCast instance (single immortal boss = all 5
//     sequential hits land; the expected-value crit pass makes 5 rolls ≡ 1 — eve/2b precedent),
//     plus the 544.5% max-stacks bonus gated on the crescendo resource.
//
// The Marcato-crit rider ("if Marcato lands as a crit → 100% of final ATK additional damage") is
// a hit conditional on ANOTHER hit's crit result — the engine has no on-crit trigger (sim.ts:1606
// marks that coupling future work). Following the takina uptime-average precedent (an unexpressible
// conditional encoded as its CALIBRATED expectation, ⚑ not fudge), it rides as a companion
// flatDamage of 100% × P(Marcato crits) on the SAME hitCount-25 trigger, crit:false (an EV rider
// must not roll crit again). P is julia's GENERIC crit rate — base 15% + 26.04% inside her S1
// windows, the NA-scoped 36.16% EXCLUDED (Marcato is skill damage) — weighted by her 180s S1
// uptime (5×10s): 50/180 × 41.04% + 130/180 × 15% = 22.23% → atkPct 22.23. [J3b]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   J1  the battle-start cast is a distinct fused-passive block: remove it and the frame-0 apply
//       vanishes (first cast slips to t=40). The 36.16 line is NA-SCOPED (critRateNormalPct):
//       julia's skill/burst buckets must NEVER see it (they resolve at base+unscoped only), and
//       the generic-critRatePct counterfactual provably DOES lift them — i.e. the shipped scope
//       assertion is one the generic model fails (helm H1 pattern).
//   J2  Crescendo is a STACKING 24.79×5 buff on a hitCount-19 cadence: fires === floor(shots/19)
//       exactly (the counter is per-shot), stacks reach 5, and a maxStacks-1 counterfactual loses
//       the 4 upper stacks' crit damage (strictly less total).
//   J3  Marcato is an 88% skill-bucket rider on hitCount-25: count === floor(shots/25), and its
//       crit rate is base+unscoped ONLY (≤0.4104) — it never picks up the 36.16 NA-scoped line.
//   J3b the EV companion rider is 22.23% (100% × 22.23% generic-crit probability), fires on the
//       same cadence, and is crit-INELIGIBLE (an EV rider that rolled crit would double-count).
//       The unconditional-100% counterfactual over-credits by ~1/P ≈ 4.5×; removing it under-credits.
//   J4  the burst is 2722.5 (not one 544.5 hit) cast BEFORE the FB window (never takes the +50%
//       major), and the 544.5 bonus is GATED: with Crescendo removed the shipped gate holds the
//       bonus at zero while an ungated counterfactual fires it every cast — the three-state proof
//       that the resourceGate is the discriminator.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / julia B3 / helm B3, boss Fire —
// neutral for Iron, focus julia). julia needs a real rotation to cast her burst at all (a lone B3
// makes zero Full Bursts); helm is the second ≤40s B3 that makes the stage sustainable. helm's own
// kit is deterministic here and touches julia only through NA-scoped crit (S1) and Damage-Up/ATK
// buffs — none of which contaminate the unscoped-crit assertions below. Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / julia 2 / helm 3. */
const JULIA = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('julia'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res), res };
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const juliaDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === 'julia' && d.srcSlot === srcSlot);
const juliaBucket = (evs: SimEvent[], bucket: Damage['bucket']) =>
  dmg(evs).filter((d) => d.slug === 'julia' && d.bucket === bucket);
const juliaShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'julia');
const juliaBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'julia'
  );
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** julia's own self-buff applies for one stat (caster AND holder = julia). */
const juliaSelfBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter(
    (b) => b.casterIdx === JULIA && b.targetIdx === JULIA && b.stat === stat
  );
const critRateSet = (hits: Damage[]) =>
  [...new Set(hits.map((d) => d.critRate.toFixed(4)))].sort();

// ---- counterfactual patches (nearest wrong models) --------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** J1: the battle-start force-cast block removed (S1 first fires at t=40, not t=0). */
const juliaNoBattleStart = withPatchedOverride('julia', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !(b.trigger.kind === 'passive'));
  if (ov.skill1.length === before) {
    throw new Error('julia S1 fused-passive block missing — fixture is stale');
  }
});
/** J1c: the NA-scoped crit line as a GENERIC (unscoped) crit-rate buff — would lift Marcato/burst. */
const juliaGenericCrit = withPatchedOverride('julia', (ov) => {
  let n = 0;
  for (const b of ov.skill1) {
    for (const e of b.effects) {
      if (e.stat === 'critRateNormalPct') {
        e.stat = 'critRatePct';
        n++;
      }
    }
  }
  if (n === 0) {
    throw new Error(
      'julia S1 critRateNormalPct effect missing — fixture is stale'
    );
  }
});
/** J2: Crescendo as a non-stacking buff (one stack forever — loses the 4 upper stacks). */
const juliaMaxStacks1 = withPatchedOverride('julia', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'buff' && x.stat === 'critDamagePct');
  if (!e) {
    throw new Error('julia Crescendo buff missing — fixture is stale');
  }
  e.maxStacks = 1;
});
/** J2/J4b: Crescendo removed entirely — the shadow resource stays at 0, so the max-stacks gate
 *  can never open (the burst's 2722.5 main hit is untouched). */
const juliaNoCrescendo = withPatchedOverride('julia', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'critDamagePct'));
  if (ov.skill2.length === before) {
    throw new Error('julia Crescendo block missing — fixture is stale');
  }
});
/** J3: Marcato removed. */
const juliaNoMarcato = withPatchedOverride('julia', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) =>
      !b.effects.some((e: any) => e.kind === 'flatDamage' && e.atkPct === 88)
  );
  if (ov.skill2.length === before) {
    throw new Error('julia Marcato block missing — fixture is stale');
  }
});
/** J3b: the EV Marcato-crit rider removed (under-credit counterfactual). */
const juliaNoRiderEV = withPatchedOverride('julia', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) =>
      !b.effects.some((e: any) => e.kind === 'flatDamage' && e.atkPct === 22.23)
  );
  if (ov.skill2.length === before) {
    throw new Error('julia EV rider block missing — fixture is stale');
  }
});
/** J3b: the rider as an UNCONDITIONAL full 100% on every Marcato (over-credit counterfactual —
 *  the nearest wrong model; ignores that it fires only when Marcato crits). */
const juliaUnconditionalRider = withPatchedOverride('julia', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage' && x.atkPct === 22.23);
  if (!e) {
    throw new Error('julia EV rider block missing — fixture is stale');
  }
  e.atkPct = 100;
});
/** J4a: only ONE of the five sequential burst hits (nearest wrong magnitude: 544.5, not 2722.5). */
const juliaSingleHitBurst = withPatchedOverride('julia', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage' && x.atkPct === 2722.5);
  if (!e) {
    throw new Error('julia burst 2722.5 hit missing — fixture is stale');
  }
  e.atkPct = 544.5;
});
/** J5: the whole kit removed (weapon only). */
const juliaEmpty = withPatchedOverride('julia', (ov) => {
  ov.skill1 = [];
  ov.skill2 = [];
  ov.burst = [];
  ov.resources = [];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noBattleStart = run({ julia: juliaNoBattleStart });
const genericCrit = run({ julia: juliaGenericCrit });
const maxStacks1 = run({ julia: juliaMaxStacks1 });
const noCrescendo = run({ julia: juliaNoCrescendo });
const noMarcato = run({ julia: juliaNoMarcato });
const noRiderEV = run({ julia: juliaNoRiderEV });
const unconditionalRider = run({ julia: juliaUnconditionalRider });
const ungatedNoCrescendo = run({
  julia: (() => {
    // noCrescendo AND ungated in one override
    const ov = JSON.parse(JSON.stringify(juliaNoCrescendo));
    for (const b of ov.burst) {
      if (b.resourceGate?.name === 'crescendo') {
        delete b.resourceGate;
      }
    }
    return ov;
  })(),
});
const singleHit = run({ julia: juliaSingleHitBurst });
const empty = run({ julia: juliaEmpty });

const shots = juliaShots(base.events).length;
const casts = juliaBursts(base.events);

describe('julia (Treasure) — kit spec', () => {
  it('fixture sanity: julia fires, bursts, and the kit does damage', () => {
    expect(shots).toBeGreaterThan(1000);
    expect(casts.length).toBeGreaterThanOrEqual(3);
    expect(base.totals.julia).toBeGreaterThan(empty.totals.julia);
  });

  describe('J1 — S1 self-buff trio: battle-start force-cast + every 40s, 10s windows', () => {
    const STATS = [
      ['critRatePct', 26.04],
      ['atkPct', 20],
      ['critRateNormalPct', 36.16],
    ] as const;

    it.each(STATS)(
      'applies %s %d at t=0 (battle start) and t=40/80/120/160, each for 10s, self-only',
      (stat, value) => {
        const applied = juliaSelfBuffs(base.events, stat);
        expect(
          applied.map((b) => b.frame),
          'battle-start cast (frame 0) + interval:40 — a pure interval would start at 2400'
        ).toEqual([0, 2400, 4800, 7200, 9600]);
        expect([...new Set(applied.map((b) => b.value))]).toEqual([value]);
        for (const b of applied) {
          expect(b.expiresFrame! - b.frame, '10s window').toBe(10 * FPS);
        }
      }
    );

    it('DISCRIMINATING: without the fused-passive block there is NO frame-0 cast', () => {
      expect(
        juliaSelfBuffs(noBattleStart.events, 'critRatePct').map((b) => b.frame)
      ).toEqual([2400, 4800, 7200, 9600]);
    });

    it('the 36.16 line is NA-SCOPED: skill and burst buckets resolve at base+unscoped only', () => {
      // julia's skill bucket = Marcato + its EV companion; burst bucket = her two burst hits.
      // None is a normal attack, so none may see the 36.16 (or helm's 14.64) NA-scoped crit —
      // only 0.15 bare, 0.4104 inside her own S1 window (15 + 26.04 unscoped), and 0.0000 for the
      // crit-INELIGIBLE EV rider. The window rate 0.7720 must NEVER appear off the normal bucket.
      expect(critRateSet(juliaBucket(base.events, 'skill'))).toEqual([
        '0.0000',
        '0.1500',
        '0.4104',
      ]);
      expect(critRateSet(juliaBucket(base.events, 'burst'))).toEqual([
        '0.1500',
        '0.4104',
      ]);
      // her normal attacks DO carry the scoped line (0.772+ inside the S1 window; helm's own
      // NA-scoped buff can push the max higher — the floor is the discrimination).
      const normals = juliaBucket(base.events, 'normal');
      expect(Math.min(...normals.map((d) => d.critRate))).toBeCloseTo(0.15, 4);
      expect(
        Math.max(...normals.map((d) => d.critRate))
      ).toBeGreaterThanOrEqual(0.772 - 1e-9);
    });

    it('DISCRIMINATING: a generic critRatePct WOULD lift the skill/burst buckets', () => {
      expect(critRateSet(juliaBucket(genericCrit.events, 'skill'))).not.toEqual(
        critRateSet(juliaBucket(base.events, 'skill'))
      );
      expect(critRateSet(juliaBucket(genericCrit.events, 'burst'))).not.toEqual(
        critRateSet(juliaBucket(base.events, 'burst'))
      );
    });
  });

  describe('J2 — Crescendo: Critical Damage ▲24.79% per stack, max 5, 15s, every ~6 NA crits', () => {
    const applied = juliaSelfBuffs(base.events, 'critDamagePct');

    it('is 24.79 per stack, caps at 5 stacks, 15s per refresh', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([24.79]);
      expect([...new Set(applied.map((b) => b.maxStacks))]).toEqual([5]);
      expect(
        Math.max(...applied.map((b) => b.stacks)),
        'stacks must reach 5'
      ).toBe(5);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame, '15s duration').toBe(15 * FPS);
      }
    });

    it('fires on the hitCount-19 crit proxy (6 crits at the 32.3% fight-averaged NA crit rate)', () => {
      // the hitCount counter advances once per shot (AR hitsPerShot 1) → exact.
      expect(applied.length).toBe(Math.floor(shots / 19));
    });

    it('DISCRIMINATING: a maxStacks-1 Crescendo loses the upper stacks and her total drops', () => {
      expect(
        Math.max(
          ...juliaSelfBuffs(maxStacks1.events, 'critDamagePct').map(
            (b) => b.stacks
          )
        )
      ).toBe(1);
      expect(unitOf(base.res, 'julia').totalDamage).toBeGreaterThan(
        unitOf(maxStacks1.res, 'julia').totalDamage
      );
    });
  });

  describe('J3 — Marcato: 88% of final ATK additional damage every ~8 NA crits', () => {
    const skill2Hits = juliaDamage(base.events, 'skill2');
    const marcato = skill2Hits.filter((d) => d.atkPct === 88);

    it('lands at the kit magnitude, crit-eligible, in the skill bucket', () => {
      expect(marcato.length).toBeGreaterThan(0);
      expect([...new Set(marcato.map((d) => d.bucket))]).toEqual(['skill']);
      expect(marcato.every((d) => d.critEligible)).toBe(true);
    });

    it('fires on the hitCount-25 crit proxy (8 crits at the 32.3% averaged rate)', () => {
      expect(marcato.length).toBe(Math.floor(shots / 25));
    });

    it('never picks up the NA-scoped crit line (proc, not a normal attack)', () => {
      expect(critRateSet(marcato)).toEqual(['0.1500', '0.4104']);
    });

    it('DISCRIMINATING: removing Marcato leaves zero 88% instances and less total', () => {
      expect(
        juliaDamage(noMarcato.events, 'skill2').filter((d) => d.atkPct === 88)
          .length
      ).toBe(0);
      expect(unitOf(base.res, 'julia').totalDamage).toBeGreaterThan(
        unitOf(noMarcato.res, 'julia').totalDamage
      );
    });
  });

  describe('J3b — Marcato-crit rider: EV companion of 100% × P(Marcato crits) = 22.23%', () => {
    const rider = juliaDamage(base.events, 'skill2').filter(
      (d) => d.atkPct === 22.23
    );

    it('rides at the calibrated expectation, on Marcato\u2019s cadence, crit-INELIGIBLE', () => {
      const marcatoCount = juliaDamage(base.events, 'skill2').filter(
        (d) => d.atkPct === 88
      ).length;
      expect(rider.length).toBeGreaterThan(0);
      expect(rider.length, 'one EV companion per Marcato proc').toBe(
        marcatoCount
      );
      // an EV rider that rolled crit again would double-count the expectation
      expect(rider.every((d) => !d.critEligible)).toBe(true);
      expect([...new Set(rider.map((d) => d.critRate))]).toEqual([0]);
    });

    it('DISCRIMINATING: removing it under-credits; the unconditional full 100% over-credits', () => {
      expect(
        juliaDamage(noRiderEV.events, 'skill2').filter(
          (d) => d.atkPct === 22.23
        ).length
      ).toBe(0);
      expect(unitOf(base.res, 'julia').totalDamage).toBeGreaterThan(
        unitOf(noRiderEV.res, 'julia').totalDamage
      );
      expect(
        unitOf(unconditionalRider.res, 'julia').totalDamage
      ).toBeGreaterThan(unitOf(base.res, 'julia').totalDamage);
    });
  });

  describe('J4 — burst: 5×544.5% sequential (consolidated) + 544.5% at max Crescendo stacks', () => {
    const burstHits = juliaBucket(base.events, 'burst');
    const main = burstHits.filter((d) => d.atkPct === 2722.5);
    const bonus = burstHits.filter((d) => d.atkPct === 544.5);

    it('deals 2722.5% (5 sequential hits) once per cast, before the FB window, crit-eligible', () => {
      expect(casts.length).toBeGreaterThanOrEqual(3);
      expect(main.length).toBe(casts.length);
      expect(
        main.every((d) => d.fbMajorApplied),
        'burstCast lands pre-FB'
      ).toBe(false);
      expect(main.every((d) => d.critEligible)).toBe(true);
    });

    it('gates the bonus on max stacks: the ~5s opening cast (pre-stacks) gets NONE, every later cast gets it', () => {
      const firstMaxed = juliaSelfBuffs(base.events, 'critDamagePct').find(
        (b) => b.stacks === 5
      );
      expect(firstMaxed, 'Crescendo never reached 5 stacks').toBeDefined();
      // the opening cast lands before 5 stacks (5×6 NA crits) are reachable — the gate must hold it
      expect(casts[0].frame).toBeLessThan(firstMaxed!.frame);
      expect(bonus.length).toBe(casts.length - 1);
      // every cast from stacks-maxed onward carries exactly one bonus, resolving right after the
      // cast (cast event → damage resolution is a few frames; casts are ~30s apart, so index
      // pairing is unambiguous)
      const gatedFrames = casts
        .filter((c) => c.frame >= firstMaxed!.frame)
        .map((c) => c.frame);
      expect(gatedFrames.length).toBe(bonus.length);
      const bonusFrames = bonus.map((b) => b.frame).sort((a, b) => a - b);
      gatedFrames.forEach((cf, i) => {
        const delta = bonusFrames[i] - cf;
        expect(
          delta,
          `bonus ${i} resolved ${delta}f after its gated cast — not a per-cast rider`
        ).toBeGreaterThanOrEqual(0);
        expect(delta).toBeLessThanOrEqual(10);
      });
    });

    it('DISCRIMINATING: with Crescendo removed the gate holds the bonus at zero (main hit intact)', () => {
      const nCast = juliaBursts(noCrescendo.events).length;
      expect(
        juliaBucket(noCrescendo.events, 'burst').filter(
          (d) => d.atkPct === 544.5
        ).length
      ).toBe(0);
      expect(
        juliaBucket(noCrescendo.events, 'burst').filter(
          (d) => d.atkPct === 2722.5
        ).length
      ).toBe(nCast);
    });

    it('DISCRIMINATING: ungated, the bonus fires every cast EVEN with Crescendo removed', () => {
      const nCast = juliaBursts(ungatedNoCrescendo.events).length;
      expect(
        juliaBucket(ungatedNoCrescendo.events, 'burst').filter(
          (d) => d.atkPct === 544.5
        ).length
      ).toBe(nCast);
    });

    it('DISCRIMINATING: a single-hit burst (544.5) is strictly less damage than the 5-hit 2722.5', () => {
      expect(
        juliaBucket(singleHit.events, 'burst').filter(
          (d) => d.atkPct === 2722.5
        ).length
      ).toBe(0);
      expect(unitOf(base.res, 'julia').totalDamage).toBeGreaterThan(
        unitOf(singleHit.res, 'julia').totalDamage
      );
    });
  });

  describe('J5 — whole-kit sanity', () => {
    it('her kit is a strict damage gain over the bare weapon', () => {
      expect(unitOf(base.res, 'julia').totalDamage).toBeGreaterThan(
        unitOf(empty.res, 'julia').totalDamage
      );
    });
  });
});
