// PER-UNIT KIT SPEC — `harran` (Harran, SR/Electric/Attacker/Burst III, Pilgrim, cd 40s,
// ammo 6, chargeFrames 60, reloadFrames 159). Kit-autonomy gauntlet 2026-08-05. BASE unit
// (the original pilgrim SR), NOT a variant.
//
// Kit (blablalink prose, data/characters.json → characters.harran.skills, SL10):
//   S1 ■ 25% chance of activating when attacking → the target:                          [R1]
//        Virus Transfer: 17.28% of final ATK as damage every 1 sec for 5 sec
//      ■ when an enemy afflicted with Virus Transfer is neutralized → 2 nearest enemies: [R2 gap]
//        Virus Transfer: (the same DoT, spread)
//   S2 ■ attacking with Full Charge → self: Gain Pierce for 1 round(s)                   [R5]
//      ■ attacking with Full Charge → self: Critical Rate ▲2.95% for 1 round(s)          [R3]
//      ■ killing an enemy → self: ATK ▲3.02%, stacks up to 15 times, lasts 10 sec        [R2 gap]
//   BU ■ all enemies: 999% of final ATK as Burst Skill damage                            [R4]
//
// One assertion group per kit line (R1..R5), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong
// model each assertion must discriminate against) — never to supply the encoding under test.
//
// WHY THESE ASSERTIONS DISCRIMINATE (a test that cannot fail under the nearest wrong model
// gates nothing):
//   R1  the 25% chance is encoded as the expectation-exact PERIODIC proxy (every 4th shot
//       = one virus application; at the simulated SR cadence the expected proc rate is
//       0.25/shot exactly; the S2b reviewer independently derived the same everyN:4
//       thinning). Two nearest-wrong models are excluded in both directions: (a) an UNGATED
//       every-shot application (chance ignored) produces ≈4× the tick clusters — the
//       counterfactual below; (b) dropping the line entirely zeroes the skill1 bucket and
//       lowers her total. The 5-tick / 1-sec-interval cluster shape pins "every 1 sec for
//       5 sec" against both a single-instant hit and a wrong-duration DoT. Convention
//       pinned: applications are independent instances (the engine appends a DoT per fire
//       and never dedups); at the every-4th-shot cadence windows never overlap, so the
//       in-game refresh-vs-stack question is moot inside the encoding.
//   R2  the two out-of-domain lines (kill-spread, kill ATK stacks) have NO engine
//       primitive (no kill/death/add model; the v1 boss is immortal and alone). They must
//       be documented VERBATIM in `unmodeled` — and the shipped blocks must contain NO
//       atkPct buff, so a fabricated kill/stack encoding cannot sneak in behind the
//       documented gap.
//   R3  "Critical Rate ▲2.95% for 1 round(s)" re-triggers on EVERY full-charge attack —
//       and every SR shot IS a full charge — so the in-game steady state is PERMANENT
//       uptime from the second shot on (each shot's grant covers the next shot, which
//       re-grants; the S2b reviewer derived the same steady state). The shipped encoding
//       is the steady-state passive proxy with a short first-trigger ramp, because the
//       LITERAL encoding — a shotFired durationShots:1 self-buff — is net-INERT in this
//       engine: the same firePull that dispatches the grant decrements it (probed
//       2026-08-05: zero crit lift surfaces on any shot). The counterfactual below pins
//       exactly that; it is the rounds-vs-seconds trap's hidden third variant — neither a
//       lapsing durationSec:1 window nor a live round count, but a self-consuming grant.
//   R4  the burst nuke lands on her OWN burstCast (6 casts in the fixture), NOT on
//       fullBurstEnter — the fixture fields helm as a second 40s Burst III, so there are
//       ~12 Full Burst windows but only 6 of them are hers; a fullBurstEnter encoding
//       fires the nuke on helm's windows too. A burst CAST also lands BEFORE the Full
//       Burst window opens, so it must never take the +50% major (verified 2026-07-13).
//   R5  "Gain Pierce for 1 round(s)" has no round-counted primitive (gainPierce carries
//       only durationSec). The encoding is the per-shot RE-ARM: a duration-less gainPierce
//       on her own shotFired, re-granted by every full-charge shot, so her shots are
//       Pierce-tagged continuously while she fires — behaviorally exact at SR cadence.
//       A durationSec:1 wall-clock window is the nearest wrong model (the SR fire cycle
//       exceeds 1s, so pierce would lapse between shots). At scope lock the line is
//       damage-inert (partless boss, no Pierce Damage ▲ carrier in the fixture): removing
//       it must leave every unit's total byte-identical.
//
// FIXTURE: the 720-kit-audit control comp (liter B1 / crown B2 / harran B3 / helm B3,
// boss Fire, focus harran) — two 40s B3s alternating keep the chain alive, so harran
// actually CASTS (a lone B3 makes zero Full Bursts). Electric vs Fire is neutral (no
// element major either way). Deterministic (no seed). Slot order: liter 0 / crown 1 /
// harran 2 / helm 3.
//
// UNMODELED (no assertion, documented in the override + R2 static pins): the kill-spread
// line and the kill ATK stacks. The DoT gauge per tick (wiki3: 290/tick) is carried by the
// engine's skillGauge on dot ticks, not the override.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp('harran'),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches -------------------------------------------------------------------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.kind === 'buff' && e.stat === stat);
const hasDot = (b: any) => b.effects.some((e: any) => e.kind === 'dot');
const hasGainPierce = (b: any) =>
  b.effects.some((e: any) => e.kind === 'gainPierce');

/** R1 reference: her S1 Virus Transfer block removed entirely. */
const harranNoDot = withPatchedOverride('harran', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasDot(b));
  if (ov.skill1.length === before) {
    throw new Error('harran S1 dot block missing — fixture is stale');
  }
});
/** R1 counterfactual: the same DoT UNGATED — applied on EVERY shot (the 25% chance
 *  ignored). Expectation says exactly 1-in-4 shots procs, so this ≈4× over-fires. */
const harranUngatedDot = withPatchedOverride('harran', (ov) => {
  const b = ov.skill1.find((x: any) => hasDot(x));
  if (!b || b.everyN !== 4) {
    throw new Error(
      'harran S1 dot block with everyN:4 missing — fixture is stale'
    );
  }
  delete b.everyN;
});
/** R3 reference: her S2 crit-rate line removed entirely. */
const harranNoCrit = withPatchedOverride('harran', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'critRatePct'));
  if (ov.skill2.length === before) {
    throw new Error('harran S2 critRatePct block missing — fixture is stale');
  }
});
/** R3 counterfactual: the LITERAL encoding — shotFired-triggered, durationShots:1.
 *  The engine decrements it on the same firePull that dispatches it (probed 2026-08-05),
 *  so it must be net-inert (zero crit lift). This is the encoding the shipped proxy
 *  replaces. */
const harranLiteralCrit = withPatchedOverride('harran', (ov) => {
  const b = ov.skill2.find((x: any) => hasStat(x, 'critRatePct'));
  if (!b) {
    throw new Error('harran S2 critRatePct block missing — fixture is stale');
  }
  b.trigger = { kind: 'shotFired' };
  const e = b.effects.find((x: any) => x.stat === 'critRatePct');
  delete e.rampSec;
  e.durationShots = 1;
});
/** R4 counterfactual: the nuke keyed to fullBurstEnter — fires on helm's windows too. */
const harranFbEnterNuke = withPatchedOverride('harran', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'flatDamage')
  );
  if (!b) {
    throw new Error('harran burst flatDamage block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
/** R5 reference: her pierce re-arm block removed (scope-lock inertness check). */
const harranNoPierce = withPatchedOverride('harran', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasGainPierce(b));
  if (ov.skill2.length === before) {
    throw new Error('harran S2 gainPierce block missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noDot = run({ harran: harranNoDot });
const ungatedDot = run({ harran: harranUngatedDot });
const noCrit = run({ harran: harranNoCrit });
const literalCrit = run({ harran: harranLiteralCrit });
const fbEnterNuke = run({ harran: harranFbEnterNuke });
const noPierce = run({ harran: harranNoPierce });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const harranDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === 'harran' && d.srcSlot === srcSlot);
const harranShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'harran');
const harranBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'harran'
  );

// Merge-immune application counting: windows from consecutive applications INTERLEAVE at
// the edge (at the every-4th-shot cadence the gap between one window's last tick and the
// next window's first tick is ~28-88 frames — INSIDE a naive gap-cluster threshold), so
// applications are counted by their FIRST TICK (a tick with no same-slot tick 60 frames
// earlier) and shaped by their TERMINATING TICK (a tick with no same-slot tick 60 frames
// later — exactly one per window).
const tickFrames = (ticks: Damage[]): Set<number> =>
  new Set(ticks.map((t) => t.frame));
const applications = (ticks: Damage[]): number[] => {
  const frames = tickFrames(ticks);
  return ticks
    .filter((t) => !frames.has(t.frame - FPS))
    .map((t) => t.frame - FPS); // the application frame = first tick - 1s
};
const terminating = (ticks: Damage[]): number => {
  const frames = tickFrames(ticks);
  return ticks.filter((t) => !frames.has(t.frame + FPS)).length;
};

const dotTicks = harranDamage(base.events, 'skill1');
const baseApps = applications(dotTicks);

describe('harran — kit spec', () => {
  describe('R1 — S1 Virus Transfer: 25%-on-attack DoT as the expectation-exact periodic proxy', () => {
    it('ticks in the skill bucket at exactly the kit magnitude (17.28% of final ATK)', () => {
      expect(dotTicks.length).toBeGreaterThan(0);
      expect([...new Set(dotTicks.map((d) => d.atkPct))]).toEqual([17.28]);
      expect([...new Set(dotTicks.map((d) => d.bucket))]).toEqual(['skill']);
    });

    it('every window is a full 1-sec-spaced run: exactly one terminating tick per application', () => {
      // each application's window ticks once per second and ENDS exactly once — a short
      // window (single hit, wrong interval) changes the terminating-tick count or the
      // tick total per application
      expect(baseApps.length).toBeGreaterThan(0);
      expect(terminating(dotTicks)).toBe(baseApps.length);
    });

    it('each application ticks 5× (only the final window may be cut by the fight end)', () => {
      expect(dotTicks.length).toBeGreaterThanOrEqual(5 * baseApps.length - 4);
      expect(dotTicks.length).toBeLessThanOrEqual(5 * baseApps.length);
    });

    it('applies on 1-in-4 shots (the 25% expectation), not on every shot', () => {
      const shots = harranShots(base.events).length;
      const expected = Math.floor(shots / 4);
      // the final application can land too late to emit a tick inside the fight
      expect(baseApps.length).toBeGreaterThanOrEqual(expected - 1);
      expect(baseApps.length).toBeLessThanOrEqual(expected);
    });

    it('DISCRIMINATING: an ungated every-shot application ≈4× over-fires', () => {
      const ungatedTicks = harranDamage(ungatedDot.events, 'skill1');
      expect(ungatedTicks.length).toBeGreaterThan(2.5 * dotTicks.length);
    });

    it('is live, not inert: removing it empties the skill bucket and lowers her total', () => {
      expect(harranDamage(noDot.events, 'skill1').length).toBe(0);
      expect(base.totals.harran).toBeGreaterThan(noDot.totals.harran);
    });
  });

  describe('R2 — the two out-of-domain kill lines are documented VERBATIM, never encoded', () => {
    const ov = JSON.parse(
      readFileSync(
        new URL('../../../src/skills/overrides/harran.json', import.meta.url),
        'utf8'
      )
    );
    const blocks = [
      ...(ov.skill1 ?? []),
      ...(ov.skill2 ?? []),
      ...(ov.burst ?? []),
    ];

    it('kill-spread line (S1): verbatim in unmodeled.skill1', () => {
      expect(
        (ov.unmodeled?.skill1 ?? []).some((s: string) =>
          s.includes(
            'Activates when an enemy afflicted with Virus Transfer is neutralized'
          )
        ),
        'the neutralize/spread line must be documented, not silently dropped'
      ).toBe(true);
    });

    it('kill ATK stacks (S2): verbatim in unmodeled.skill2', () => {
      expect(
        (ov.unmodeled?.skill2 ?? []).some(
          (s: string) => s.includes('ATK ▲ 3.02%') && s.includes('15 time(s)')
        ),
        'the kill-triggered ATK stack line must be documented, not silently dropped'
      ).toBe(true);
    });

    it('no fabricated kill-stack encoding: no atkPct buff anywhere in her blocks', () => {
      for (const b of blocks) {
        for (const e of b.effects) {
          if (e.kind === 'buff') {
            expect(e.stat).not.toBe('atkPct');
          }
        }
      }
    });
  });

  describe('R3 — S2 full-charge crit: steady-state 2.95% lift on her normal attacks', () => {
    const normals = (evs: SimEvent[]) =>
      dmg(evs).filter((d) => d.slug === 'harran' && d.bucket === 'normal');
    const deltaByFrame = new Map<number, number>();
    const shippedByFrame = new Map(
      normals(base.events).map((d) => [d.frame, d.critRate])
    );
    for (const d of normals(noCrit.events)) {
      const s = shippedByFrame.get(d.frame);
      if (s !== undefined) {
        deltaByFrame.set(d.frame, s - d.critRate);
      }
    }
    const deltas = [...deltaByFrame.entries()].sort((a, b) => a[0] - b[0]);

    it('the lift reaches exactly 2.95% once past the first-trigger ramp', () => {
      const steady = deltas.filter(([f]) => f >= 300);
      expect(steady.length).toBeGreaterThan(50);
      for (const [, delta] of steady) {
        expect(delta).toBeCloseTo(0.0295, 9);
      }
    });

    it('is permanent (re-triggered by every full charge): no steady-state lapse', () => {
      const steady = deltas.filter(([f]) => f >= 300);
      expect(steady.every(([, delta]) => delta > 0.029)).toBe(true);
    });

    it('ramps in from the first full charge (not full-value at t=0)', () => {
      const early = deltas.filter(([f]) => f < 300);
      expect(early.length).toBeGreaterThan(0);
      expect(early.some(([, delta]) => delta > 0 && delta < 0.0295)).toBe(true);
    });

    it('DISCRIMINATING: the literal shotFired/durationShots:1 encoding is net-inert', () => {
      // The engine decrements a shotFired-granted durationShots buff on the same firePull
      // that dispatches it (probed 2026-08-05) — the literal reading produces NO crit lift.
      const literalByFrame = new Map(
        normals(literalCrit.events).map((d) => [d.frame, d.critRate])
      );
      for (const d of normals(noCrit.events)) {
        const l = literalByFrame.get(d.frame);
        if (l !== undefined) {
          expect(l).toBeCloseTo(d.critRate, 9);
        }
      }
      // while the shipped proxy DOES lift (sanity that the discrimination is live)
      expect(
        deltas.filter(([, delta]) => delta > 0.029).length
      ).toBeGreaterThan(0);
    });
  });

  describe('R4 — burst nuke: 999% of final ATK to all enemies, on her OWN cast', () => {
    const nukes = harranDamage(base.events, 'burst');

    it('fires once per harran burst cast, at the kit magnitude, in the burst bucket', () => {
      const casts = harranBursts(base.events);
      expect(casts.length).toBeGreaterThanOrEqual(5);
      expect(nukes.length).toBe(casts.length);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([999]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      const took = nukes.filter((d) => d.fbMajorApplied);
      expect(
        took.map((d) => d.sec),
        'burst-cast damage must precede the FB window'
      ).toEqual([]);
    });

    it('DISCRIMINATING: fullBurstEnter keying over-fires on helm’s windows', () => {
      const overFired = harranDamage(fbEnterNuke.events, 'burst');
      expect(overFired.length).toBeGreaterThan(nukes.length);
    });
  });

  describe('R5 — S2 full-charge Pierce: per-shot re-arm, inert at scope lock', () => {
    const ov = JSON.parse(
      readFileSync(
        new URL('../../../src/skills/overrides/harran.json', import.meta.url),
        'utf8'
      )
    );

    it('is a duration-less gainPierce on her own shotFired (a re-arm, not a 1s timer)', () => {
      const b = (ov.skill2 ?? []).find((x: any) => hasGainPierce(x));
      expect(b, 'the pierce re-arm block must exist').toBeTruthy();
      expect(b.trigger).toEqual({ kind: 'shotFired' });
      expect(b.target).toEqual({ kind: 'self' });
      const e = b.effects.find((x: any) => x.kind === 'gainPierce');
      expect(
        e.durationSec,
        'a durationSec:1 window lapses between SR shots — the re-arm must be duration-less'
      ).toBeUndefined();
    });

    it('is damage-inert at scope lock: removing it changes NO unit’s total', () => {
      // partless boss + no Pierce Damage ▲ carrier in the fixture: the pierce tag
      // adds no targets and feeds no Damage-Up bucket.
      expect(base.totals).toEqual(noPierce.totals);
    });
  });
});
