// PER-UNIT KIT SPEC — `mica-snow-buddy` (Mica: Snow Buddy, aka msb — Tetra Iron SMG Supporter,
// Burst I, cd 20s, 120-ammo SMG @1440rpm, reloadFrames 141; a VARIANT of the RL/Wind base Mica).
// Kit-autonomy gauntlet 2026-07-31; test-first line-by-line spec.
//
// GREENFIELD NOTE: msb shipped with NO override (simSupported:false) — before this gauntlet the unit
// could not sim at all (resolveSkills throws for prose-without-override). So the usual "RED vs shipped
// override" half is degenerate: the pre-override state is "does not run". The substance of the gate
// lives in the COUNTERFACTUAL half — every PIN below is GREEN vs the faithful encoding AND the
// nearest-wrong model (patched via withPatchedOverride) provably fails it, so each assertion
// discriminates rather than rubber-stamps.
//
// msb is a TEAM ATK BUFFER + burst-gauge enabler + (gated) ammo-economy buffer. Three DPS channels are
// modeled; the rest of the kit is defensive / meta / out-of-domain:
//   M1 BURST team ATK buff (▲39.93% of HER OWN ATK to all allies, 5s) — dominant contribution;
//   M2 S2 self Burst Gauge filling speed ▲300% (continuous) — advances her burst cadence;
//   M4 S1 Max Ammunition Capacity ▲40% to all allies — GATED behind her Tidying-Up stack clock;
//   M3 the Tidying-Up STACK CLOCK (resource pool) that gates M4 — its 2% damage-taken VALUE is inert;
//   M5 the SELF portion of 'Stack count of buffs ▲1' — folded as a +1 to the stack clock (accelerates M4).
//
// Kit (data/characters.json → characters['mica-snow-buddy'].skills, lvl-10 values):
//   S1 ■ landing 120 normals → all allies: Tidying Up Damage Taken ▼2%, stack 10x, 15s        [M3 stack-clock FAITHFUL / 2% value UNMODELED defensive]
//      ■ Tidying Up at max stacks → all allies: Max Ammunition Capacity ▲40% continuously      [M4 FAITHFUL, gated]
//   S2 ■ landing 150 normals → all allies: Stack count of buffs ▲1                            [M5 self-portion FAITHFUL fold / cross-ally UNMODELED meta]
//      ■ start of battle → self: Burst Gauge filling speed ▲300% continuously                  [M2 FAITHFUL]
//   BU ■ all allies: Removes 1 debuff(s)                                                      [M6 UNMODELED defensive/utility]
//      ■ all allies: ATK ▲39.93% of the skill user's ATK for 5 sec                            [M1 FAITHFUL — dominant]
//
// THE KEY MODELING JUDGMENTS (the substance of the cross-family reconciliation):
//   STACK-CLOCK + GATE (M3/M4/M5): the max-ammo line is the unit's main team-damage contribution after
//       the burst ATK buff, and it IS modelable: a `tidyingUp` resource pool (0..10) increments on
//       hitCount:120 (Block A) and on hitCount:150 (Block C — the self-portion of 'Stack count of buffs
//       ▲1', which adds a stack to her OWN stackable Tidying-Up buff), and the max-ammo buff fires only
//       once the pool reaches 10 (resourceGate). The activation TIME is NOT hardcoded — it EMERGES from
//       the engine's hitCount cadence: in this fixture, frame 2797 (~46.6s), which matches the
//       cross-family reviewer's INDEPENDENT prose+cadence derivation (~45-50s, H/120 + H/150 ≥ 10 →
//       H≈667 landed rounds). Removing the Block-C fold delays activation to frame 4717 (~78.6s).
//   STACK-SEMANTICS (⚑ M4): the pool is monotonic (no decay) = 'permanent once 10 accrue', committing to
//       the REFRESH-ON-REAPPLY reading of 'Stacks up to 10 times and lasts for 15 sec' (the standard
//       NIKKE convention). The rejected per-stack-independent-decay reading would cap concurrent stacks
//       at ~2 and the gate would never open (0% uptime). Documented, not silently chosen.
//   DAMAGE-TAKEN CHANNEL (M3): 'Damage Taken ▼2%' is a reduction on ALLIES (defensive), NOT the schema's
//       boss-debuff `damageTakenPct` (boss takes MORE). The 2% value is inert (no incoming damage); only
//       the stack CLOCK is modeled. Encoding it on the boss would wrongly add up to +20% team damage —
//       the no-boss-held-damageTakenPct assertion below is the mandatory guard against that inversion.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates nothing):
//   M1  casterAtkPct (FLAT add off msb's static ATK), allies INCLUDESELF, on HER burstCast, 5s.
//       (a) BASIS — an atkPct counterfactual sizes off each ally's own ATK and records the PERCENTAGE
//       39.93, not the flat caster-sized number; (b) SCOPING — excludeSelf drops msb as a 4th target;
//       (c) TIMING — apply frames coincide with msb's stage-1 burstCast, preceding Full Burst entry;
//       (d) LIVENESS — removing it lowers every ally's total.
//   M2  burstGenPct 300, SELF, passive/permanent. (a) LIVENESS — removing shifts team totals (advances
//       her first burst); (b) ENCODING GATE — removed leaves no burstGenPct buff; (c) SCOPING — self only.
//   M4  maxAmmoPct 40 to all allies, GATED. (a) GATE — NO apply in the opening window (a t=0 passive
//       counterfactual applies at frame 0 — the nearest wrong model); (b) SCOPING — all four allies;
//       (c) VALUE/PERMANENCE — 40, no expiry ('continuously'); (d) LIVENESS — removing lowers totals.
//   M5  the Block-C fold ACCELERATES the gate: removing it pushes the first max-ammo apply strictly
//       later (~78.6s vs ~46.6s) — proves the 'Stack count of buffs' self-portion is live, not dropped.
//   M3  the stack clock is behavioral (no resource event): the gate OPENS (an apply exists) only because
//       the pool reaches 10; and msb applies NO boss-held damageTakenPct (the inversion guard).
//   M6  structural pin — the override carries the debuff-cleanse line verbatim in `unmodeled.burst`.
//
// Fixture (deterministic — no seed; event-log over totals where a line is scoping/timing-sensitive):
//   ['mica-snow-buddy','crown','ada','helm'] — msb is the SOLE Burst I (20s cd) → casts every rotation;
//   crown (B2, 20s) covers stage II; ada/helm (B3) cover stage III. Boss Fire, focus ada (the carry).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUG = 'mica-snow-buddy';

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

// ---- fixture ----------------------------------------------------------------------------------
const COMP = ['mica-snow-buddy', 'crown', 'ada', 'helm'];
const MSB = 0; // msb's slot in COMP
/** The gated max-ammo activation lands at frame 2797 (~46.6s) in this fixture; anything in the
 *  opening 40s is proof of an ungated (t=0 passive) encoding. */
const OPENING_WINDOW = 40 * FPS;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: COMP,
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res, totals: totals(res) };
}

// ---- counterfactual patches (nearest-wrong models each PIN must discriminate against) ---------
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);

/** M1 reference: the burst team ATK line removed (proves the buff is live). */
const msbNoAtk = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !hasStat(b, 'casterAtkPct'));
  if (ov.burst.length !== before - 1) {
    throw new Error('msb burst casterAtkPct block missing — fixture is stale');
  }
});

/** M1 basis nearest-wrong: target-basis atkPct (% of EACH ally's own ATK) instead of caster-basis. */
const msbAllyAsAtkPct = withPatchedOverride(SLUG, (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterAtkPct');
  if (!e) {
    throw new Error('msb burst casterAtkPct effect missing — fixture is stale');
  }
  e.stat = 'atkPct';
});

/** M1 scoping nearest-wrong: excludeSelf (kit says 'Affects all allies', no except-self). */
const msbAllyExcludeSelf = withPatchedOverride(SLUG, (ov) => {
  const b = ov.burst.find((x: any) => hasStat(x, 'casterAtkPct'));
  if (!b || b.target?.kind !== 'allies') {
    throw new Error(
      'msb burst casterAtkPct (allies) block missing — fixture is stale'
    );
  }
  b.target = { kind: 'allies', excludeSelf: true };
});

/** M2 reference: the S2 self burst-gauge line removed. */
const msbNoBurstGen = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasStat(b, 'burstGenPct'));
  if (ov.skill2.length !== before - 1) {
    throw new Error('msb S2 burstGenPct block missing — fixture is stale');
  }
});

/** M4 reference: the gated max-ammo block removed (proves it is live). */
const msbNoAmmo = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasStat(b, 'maxAmmoPct'));
  if (ov.skill1.length !== before - 1) {
    throw new Error('msb S1 maxAmmoPct block missing — fixture is stale');
  }
});

/** M4 nearest-wrong: the max-ammo buff as a t=0 PASSIVE (ungated) — over-credits the opening ~46s of
 *  magazine economy. The faithful model gates it behind the stack clock. */
const msbAmmoAlwaysOn = withPatchedOverride(SLUG, (ov) => {
  const b = ov.skill1.find((x: any) => hasStat(x, 'maxAmmoPct'));
  if (!b) {
    throw new Error('msb S1 maxAmmoPct block missing — fixture is stale');
  }
  b.trigger = { kind: 'passive' };
  delete b.resourceGate;
});

/** M5 reference: remove the Block-C fold (the hitCount:150 → tidyingUp +1 self-portion of 'Stack
 *  count of buffs ▲1'). The gate must then open strictly LATER (no stack acceleration). */
const msbNoStackFold = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter(
    (b: any) =>
      !(
        b.trigger?.kind === 'hitCount' &&
        b.effects.some((e: any) => e.kind === 'resource')
      )
  );
  if (ov.skill2.length !== before - 1) {
    throw new Error(
      'msb S2 stack-fold (hitCount resource) block missing — fixture is stale'
    );
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noAtk = run({ [SLUG]: msbNoAtk });
const allyAsAtkPct = run({ [SLUG]: msbAllyAsAtkPct });
const allyExcludeSelf = run({ [SLUG]: msbAllyExcludeSelf });
const noBurstGen = run({ [SLUG]: msbNoBurstGen });
const noAmmo = run({ [SLUG]: msbNoAmmo });
const ammoAlwaysOn = run({ [SLUG]: msbAmmoAlwaysOn });
const noStackFold = run({ [SLUG]: msbNoStackFold });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const msbCasterBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === MSB && b.stat === stat);
const selfBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter(
    (b) => b.casterIdx === MSB && b.targetSlug === SLUG && b.stat === stat
  );
const casts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast');
const msbCasts = (evs: SimEvent[]) => casts(evs).filter((c) => c.slug === SLUG);
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');
const distinctTargets = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.targetSlug))].sort();
const ammoApps = (evs: SimEvent[]) => msbCasterBuffs(evs, 'maxAmmoPct');
const firstAmmoFrame = (evs: SimEvent[]): number | null => {
  const a = ammoApps(evs);
  return a.length ? Math.min(...a.map((b) => b.frame)) : null;
};

describe('mica-snow-buddy — kit spec', () => {
  describe('fixture sanity', () => {
    it('msb is the sole Burst I and casts her burst every rotation', () => {
      const n = msbCasts(base.events).length;
      expect(n).toBeGreaterThan(5);
      expect(
        [...new Set(msbCasts(base.events).map((c) => c.stage))],
        'msb is Burst I'
      ).toEqual([1]);
    });
  });

  describe('M1 — Burst ATK ▲39.93% of msb\u2019s ATK to all allies for 5s (casterAtkPct, burstCast, includeSelf)', () => {
    const applied = msbCasterBuffs(base.events, 'casterAtkPct');
    const msbAtk = unitOf(base.res, SLUG).staticAtk;
    const expectedFlat = (msbAtk * 39.93) / 100;

    it('is a caster-basis FLAT add sized off msb\u2019s static ATK (not the percentage)', () => {
      expect(
        applied.length,
        'no burst casterAtkPct buff applied'
      ).toBeGreaterThan(0);
      for (const b of applied) {
        expect(
          Math.abs(b.value - expectedFlat),
          `flat ATK ${b.value} should be 39.93% of msb staticAtk ${msbAtk} (= ${expectedFlat})`
        ).toBeLessThan(1);
      }
    });

    it('reaches all four allies INCLUDING msb herself, for exactly 5 sec, once per cast per ally', () => {
      expect(distinctTargets(applied)).toEqual([...COMP].sort());
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(5 * FPS);
      }
      expect(applied.length).toBe(msbCasts(base.events).length * COMP.length);
    });

    it('fires on msb\u2019s burstCast (stage 1), which precedes Full Burst entry', () => {
      const castFrames = msbCasts(base.events).map((c) => c.frame);
      const applyFrames = [...new Set(applied.map((b) => b.frame))].sort(
        (a, b) => a - b
      );
      expect(applyFrames.length).toBe(castFrames.length);
      for (const f of applyFrames) {
        expect(
          castFrames.some((cf) => Math.abs(cf - f) <= 2),
          `ally-buff apply frame ${f} has no nearby msb burstCast`
        ).toBe(true);
      }
      const fbFrames = fbStarts(base.events).map((f) => f.frame);
      const onFb = applyFrames.filter((f) =>
        fbFrames.some((fb) => Math.abs(fb - f) <= 2)
      );
      expect(
        onFb.length,
        'stage-1 burstCast frames should not coincide with Full Burst entry'
      ).toBeLessThan(applyFrames.length);
    });

    it('is LIVE: removing it lowers every ally\u2019s total (it is the team ATK feed)', () => {
      for (const s of COMP) {
        expect(
          noAtk.totals[s],
          `removing the team ATK buff must lower ${s}\u2019s total`
        ).toBeLessThan(base.totals[s]);
      }
    });

    it('DISCRIMINATING (basis): a target-basis atkPct records the PERCENTAGE 39.93, not the flat number', () => {
      const wrong = msbCasterBuffs(allyAsAtkPct.events, 'atkPct');
      expect(
        wrong.length,
        'atkPct counterfactual produced no buff'
      ).toBeGreaterThan(0);
      expect([...new Set(wrong.map((b) => b.value))]).toEqual([39.93]);
      expect(unitOf(allyAsAtkPct.res, 'ada').totalDamage).not.toBeCloseTo(
        unitOf(base.res, 'ada').totalDamage,
        0
      );
    });

    it('DISCRIMINATING (scoping): excludeSelf drops msb as a 4th target', () => {
      const narrowed = msbCasterBuffs(allyExcludeSelf.events, 'casterAtkPct');
      expect(distinctTargets(narrowed)).toEqual(
        [...COMP].filter((s) => s !== SLUG).sort()
      );
    });
  });

  describe('M2 — S2 self Burst Gauge filling speed ▲300% (burstGenPct, passive, permanent)', () => {
    const applied = selfBuffs(base.events, 'burstGenPct');

    it('is burstGenPct 300, self-scoped, applied once at setup, permanent', () => {
      expect(applied.length, 'no S2 burstGenPct buff applied').toBe(1);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([300]);
      expect([...new Set(applied.map((b) => b.targetSlug))]).toEqual([SLUG]);
      expect(applied[0].frame, 'a passive applies at setup').toBe(0);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
      expect([...new Set(applied.map((b) => b.durationShots))]).toEqual([null]);
    });

    it('is LIVE: removing it shifts team totals (it advances her burst cadence)', () => {
      expect(noBurstGen.totals).not.toEqual(base.totals);
    });

    it('DISCRIMINATING: removing the line leaves no burstGenPct buff (encoding gate)', () => {
      expect(selfBuffs(noBurstGen.events, 'burstGenPct').length).toBe(0);
    });
  });

  describe('M4 — S1 Max Ammunition Capacity ▲40% to all allies, GATED behind the Tidying-Up stack clock', () => {
    const applied = ammoApps(base.events);

    it('is GATED: NO apply in the opening 40s (the stack clock must reach 10 first)', () => {
      const first = firstAmmoFrame(base.events);
      expect(
        first,
        'no maxAmmoPct apply at all — the gate never opened'
      ).not.toBeNull();
      expect(
        first!,
        `first max-ammo apply at frame ${first} is inside the opening window — an ungated t=0 encoding`
      ).toBeGreaterThan(OPENING_WINDOW);
    });

    it('DISCRIMINATING (gate): a t=0 passive encoding applies at frame 0 (the nearest wrong model)', () => {
      expect(firstAmmoFrame(ammoAlwaysOn.events)).toBe(0);
      // and the faithful gated model provably differs: its first apply is well past frame 0
      expect(firstAmmoFrame(base.events)!).toBeGreaterThan(OPENING_WINDOW);
    });

    it('reaches all four allies, value 40, permanent once active (\u201ccontinuously\u201d)', () => {
      expect(distinctTargets(applied)).toEqual([...COMP].sort());
      expect([...new Set(applied.map((b) => b.value))]).toEqual([40]);
      expect([...new Set(applied.map((b) => b.expiresFrame))]).toEqual([null]);
    });

    it('is LIVE: removing it lowers the team\u2019s totals (ammo economy → more shots fired)', () => {
      for (const s of COMP) {
        expect(
          noAmmo.totals[s],
          `removing the gated max-ammo buff must lower ${s}\u2019s total`
        ).toBeLessThan(base.totals[s]);
      }
    });
  });

  describe('M5 — \u201cStack count of buffs ▲1\u201d self-portion is folded into the stack clock (accelerates the M4 gate)', () => {
    it('removing the hitCount:150 fold pushes the first max-ammo apply strictly later', () => {
      const withFold = firstAmmoFrame(base.events)!;
      const withoutFold = firstAmmoFrame(noStackFold.events)!;
      expect(
        withoutFold,
        'the no-fold run still opens the gate (Block A alone reaches 10 stacks)'
      ).not.toBeNull();
      expect(
        withoutFold,
        `no-fold activation ${withoutFold} must be strictly later than with-fold ${withFold} — ` +
          'the +1/150-hits fold accelerates the ramp'
      ).toBeGreaterThan(withFold);
      // and the acceleration is material (the fold shaves ~32s / ~1900 frames off the activation)
      expect(withoutFold - withFold).toBeGreaterThan(30 * FPS);
    });
  });

  describe('M3 — Tidying-Up stack clock is modeled; the 2% damage-taken VALUE is inert and NOT a boss debuff', () => {
    it('the stack clock drives the gate: a max-ammo apply EXISTS (the pool reached 10)', () => {
      expect(ammoApps(base.events).length).toBeGreaterThan(0);
    });

    it('GUARD: msb applies NO boss-held damageTakenPct (the defensive ▼2% must not be inverted into a boss debuff)', () => {
      // The schema's only damage-taken stat (damageTakenPct) is a boss debuff = boss takes MORE damage.
      // 'Damage Taken ▼2%' on allies is the INVERSE channel; encoding it as damageTakenPct would wrongly
      // add team damage. No msb-cast damageTakenPct buff may exist anywhere in the run.
      const inverted = buffs(base.events).filter(
        (b) => b.casterIdx === MSB && b.stat === 'damageTakenPct'
      );
      expect(
        inverted.map((b) => b.frame),
        'the Tidying-Up damage-taken line was mis-encoded as a boss debuff'
      ).toEqual([]);
    });
  });

  describe('M6 — burst debuff cleanse is a documented gap (no silent drop)', () => {
    it('the override carries the cleanse line verbatim in unmodeled.burst', () => {
      const ov = loadOverride(SLUG)!;
      expect((ov as any).unmodeled.burst).toContain(
        'Affects all allies. Removes 1 debuff(s).'
      );
    });
  });
});
