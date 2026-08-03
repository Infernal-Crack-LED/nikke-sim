// PER-UNIT KIT SPEC — `poli` (Poli (Treasure), Defender/SG/Water, Burst II, cd 40s, ammo 9,
// hitsPerShot 10 pellets). Kit-autonomy gauntlet 2026-08-03 (test-first re-derivation). NOTE:
// this is a FROM-SCRATCH unit — there was no shipped override before this gauntlet (simSupported
// was false), so the harness cannot even load her until src/skills/overrides/poli.json exists.
// The override was authored first (the faithful encoding under test); every assertion below PINS
// a kit line GREEN vs that override and RED vs the nearest-wrong counterfactual
// (withPatchedOverride), so the file still discriminates exactly as a verification gauntlet
// would (novel precedent, 2026-08-03).
//
// Kit (blablalink prose, data/characters.json → characters.poli.skills), max level:
//   S1 ■ after 5 normal attacks → all allies: ATK ▲ 5.46% for 10 sec                        [P1]
//      ■ at battle start → self: Police Badge — Shield = 100% final Max HP for 10 sec       [P2]
//   S2 ■ every 20 sec → self + 2 lowest-HP allies: DEF ▲ 23.51% for 10 sec                  [P3]
//      ■ Equally shares damage taken for 10 sec                                             [UNMODELED — no primitive, defensive]
//      ■ when Police Badge ends → self: recovers 5% final Max HP every 1 sec for 5 sec      [UNMODELED — ⚑1]
//   BU ■ when in Police Badge status → self: Indomitability 5 sec, removes Police Badge     [UNMODELED — blanc precedent]
//      ■ self: shared Shield = 40% final Max HP protecting ALL allies for 10 sec            [P7]
//      ■ all allies: ATK ▲ 44.55% for 10 sec                                                [P8]
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   P1  "5 normal attacks" on an SG could mean 5 PELLET-hits (the engine's counter advances by
//       hitsPerShot per trigger pull — 10/shot) or 5 trigger pulls. The shipped model follows the
//       repo SG convention (guilty's "every 6 normal attacks" = hitCount:60): 5 attacks = 5
//       trigger pulls = hitCount:50, so the kth proc rides the 5k-th SHOT. The pellet-count
//       counterfactual (hitCount:5) fires TWICE per shot; the first-proc frame + proc-count arms
//       discriminate both directions. The live-total arm proves the buff is not inert.
//   P2  the badge is an EVENT, not a number (no HP pool at scope): a 'shielded'-triggered probe
//       attached to poli makes it visible as a 0.73 atkPct buffApply at frame 0 (tia shield-probe
//       precedent). Badge removed → no frame-0 probe; badge absent also changes no unit's total
//       (a mis-encoding as a damage buff WOULD move totals — the neutrality arm discriminates the
//       KIND). The burst shared shield also targets poli, so her probe fires per cast too — the
//       frame-0 arm isolates the badge.
//   P3  defPct is damage-inert in v1: removing BOTH S2 blocks must move no unit's total by a
//       single point (proves inertness, not assumes it — novel N2 pattern). Cadence (first at
//       t=20, 20s spacing), magnitude, 10s window, and the self+2 target set are pinned on the
//       buffApply log; the all-allies counterfactual discriminates the targeting stand-in.
//   P7  same probe device on a TEAMMATE (modernia): one firing per poli burst cast, frame-exact.
//       Shield removed → teammate probe silent; excludeSelf counterfactual (nearest wrong read of
//       "all allies") → poli's OWN per-cast probe silent while the teammate still fires.
//   P8  burstCast, not fullBurstEnter: the aura lands frame-exact on HER stage-2 cast (before the
//       FB window opens), the crust/novel burst-aura convention; the fullBurstEnter counterfactual
//       moves every application off her cast frames. The live-total arm proves the aura is live.
//
// UNMODELED (inert at the damage-sim scope; documented, no assertions):
//   - S2 "Equally shares damage taken for 10 sec": no damage-redistribution primitive; defensive
//     (the v1 boss deals no damage).
//   - S2 badge-end recovery (5% final Max HP/s for 5s): the engine has no own-shield-EXPIRY
//     trigger. The heal amount is inert (no HP pool) but the recovery EVENTS could drive an
//     on-recovery consumer (Crown-type) in a poli+crown double-B2 comp — ⚑1 in the override note.
//   - Burst "when in Police Badge status → Indomitability 5s, removes Police Badge": no
//     Indomitability primitive (blanc precedent) and no self-status gate; defensive anyway, and
//     the badge expires at t=10s while her first burst cannot cast before her 40s CD completes —
//     the gate is structurally unsatisfiable at scope lock.
//
// Fixture: a custom B1/B2/B3 chain — liter(B1) / poli(B2) / modernia(B3) / helm(B3), boss Fire,
// focus poli (novel precedent: the standard controlComp cannot be used — crown is also Burst II
// and would take the stage-II slot, leaving poli ZERO casts). poli is the SOLE Burst II, so she
// casts every Full Burst (~4 casts / 180s at her 40s CD). Deterministic (no seed); event-log
// over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['liter', 'poli', 'modernia', 'helm'] as const;
/** slot order: liter 0 / poli 1 / modernia 2 / helm 3. */
const POLI = 1;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: 'Fire',
    focusSlug: 'poli',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const poliShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === 'poli');
const poliCasts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'poli'
  );
const stage3Casts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.stage === 3);

/** poli's S1 team ATK buff applications. */
const s1Atk = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === POLI && b.stat === 'atkPct' && b.value === 5.46
  );
/** poli's burst team ATK buff applications. */
const burstAtk = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === POLI && b.stat === 'atkPct' && b.value === 44.55
  );
/** poli's S2 DEF buff applications. */
const s2Def = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === POLI && b.stat === 'defPct' && b.value === 23.51
  );

// ---- shield probes (tia precedent — observation devices; shield blocks under test untouched) ---
// A 'shielded'-triggered 0.73 atkPct / 2s self-buff: fires once per shield application the unit
// RECEIVES. Value 0.73 appears nowhere else in this fixture, so every probe firing is cleanly
// attributable. The shield itself has no HP pool at scope — these events are its only observable.
// Probes are composed onto each counterfactual so every probed run still OBSERVES the shields.
const PROBE_VAL = 0.73;
const PROBE_BLOCK = {
  slot: 'skill1',
  trigger: { kind: 'shielded' },
  target: { kind: 'self' },
  effects: [{ kind: 'buff', stat: 'atkPct', value: PROBE_VAL, durationSec: 2 }],
};
const withProbe = (ov: any) => {
  ov.skill1 = [...ov.skill1, PROBE_BLOCK];
  return ov;
};
const poliProbed = withProbe(
  withPatchedOverride('poli', () => {
    /* clone only */
  })
);
const moderniaProbed = withProbe(
  withPatchedOverride('modernia', () => {
    /* clone only */
  })
);
const probeRuns = (poliOv: any, moderniaOv: any = moderniaProbed) =>
  run({ poli: poliOv, modernia: moderniaOv });

const probesOf = (evs: SimEvent[], slug: string) =>
  buffs(evs).filter((b) => b.value === PROBE_VAL && b.targetSlug === slug);

// ---- counterfactual / reference patches (probes composed where the run observes shields) ------
/** P1 counterfactual: pellet-count reading of "5 normal attacks" (fires 2x per SG shot). */
const poliPelletCountS1 = withPatchedOverride('poli', (ov) => {
  const b = ov.skill1.find((x: any) => x.trigger?.kind === 'hitCount');
  if (!b || b.trigger.count !== 50) {
    throw new Error('poli S1 hitCount:50 block missing — fixture is stale');
  }
  b.trigger.count = 5;
});
/** P1/S1 reference: the S1 ATK line removed entirely. */
const poliNoS1 = withPatchedOverride('poli', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => b.trigger?.kind !== 'hitCount');
  if (ov.skill1.length !== before - 1) {
    throw new Error('poli S1 hitCount block missing — fixture is stale');
  }
});
/** P2 reference: the Police Badge shield removed (probed clone). */
const poliNoBadge = withProbe(
  withPatchedOverride('poli', (ov) => {
    const before = ov.skill1.length;
    ov.skill1 = ov.skill1.filter(
      (b: any) => !b.effects.some((e: any) => e.kind === 'shield')
    );
    if (ov.skill1.length !== before - 1) {
      throw new Error('poli Police Badge block missing — fixture is stale');
    }
  })
);
/** P3 reference: BOTH S2 blocks removed — defPct is inert, so totals must not move a point. */
const poliNoS2 = withPatchedOverride('poli', (ov) => {
  if (ov.skill2.length !== 2) {
    throw new Error('poli S2 blocks missing — fixture is stale');
  }
  ov.skill2 = [];
});
/** P3 counterfactual: the DEF grant mis-targeted to ALL allies (4 holders per firing). */
const poliS2AllAllies = withPatchedOverride('poli', (ov) => {
  const b = ov.skill2.find((x: any) => x.target?.kind === 'alliesLowestHp');
  if (!b) {
    throw new Error('poli S2 alliesLowestHp block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});
/** P7 reference: the burst shared shield removed (probed clone). */
const poliNoSharedShield = withProbe(
  withPatchedOverride('poli', (ov) => {
    const before = ov.burst.length;
    ov.burst = ov.burst.filter(
      (b: any) => !b.effects.some((e: any) => e.kind === 'shield')
    );
    if (ov.burst.length !== before - 1) {
      throw new Error(
        'poli burst shared-shield block missing — fixture is stale'
      );
    }
  })
);
/** P7 counterfactual: the shared shield mis-read as "other allies" (excludeSelf). */
const poliSharedShieldExcludeSelf = withProbe(
  withPatchedOverride('poli', (ov) => {
    const b = ov.burst.find((x: any) =>
      x.effects.some((e: any) => e.kind === 'shield')
    );
    if (!b || b.target?.kind !== 'allies') {
      throw new Error(
        'poli burst shared-shield block missing — fixture is stale'
      );
    }
    b.target = { kind: 'allies', excludeSelf: true };
  })
);
/** P8 reference: the burst ATK aura removed entirely. */
const poliNoBurstAtk = withPatchedOverride('poli', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'atkPct')
  );
  if (ov.burst.length !== before - 1) {
    throw new Error('poli burst atkPct block missing — fixture is stale');
  }
});
/** P8 counterfactual: the aura keyed to fullBurstEnter instead of her own burstCast. */
const poliBurstAtkOnFbEnter = withPatchedOverride('poli', (ov) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'atkPct')
  );
  if (!b || b.trigger.kind !== 'burstCast') {
    throw new Error('poli burst atkPct block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noS1 = run({ poli: poliNoS1 });
const pelletCountS1 = run({ poli: poliPelletCountS1 });
const noS2 = run({ poli: poliNoS2 });
const s2AllAllies = run({ poli: poliS2AllAllies });
const noBurstAtk = run({ poli: poliNoBurstAtk });
const burstAtkFbEnter = run({ poli: poliBurstAtkOnFbEnter });
// probed runs (shield observability)
const probedBase = probeRuns(poliProbed);
const probedNoBadge = probeRuns(poliNoBadge);
const probedNoSharedShield = probeRuns(poliNoSharedShield);
const probedExcludeSelf = probeRuns(poliSharedShieldExcludeSelf);

describe('poli (Treasure) — kit spec', () => {
  it('fixture sanity: poli is the sole Burst II and casts every Full Burst', () => {
    expect(poliCasts(base.events).length).toBeGreaterThanOrEqual(3);
    expect(poliCasts(base.events).length).toBeLessThanOrEqual(5);
    // every poli cast completes a chain (she is the only B2 — no FB without her)
    expect(stage3Casts(base.events).length).toBe(poliCasts(base.events).length);
  });

  describe('P1 — S1: ATK ▲5.46% to ALL allies, every 5 normal attacks (= 5 SG trigger pulls)', () => {
    const applies = s1Atk(base.events);
    const shots = poliShots(base.events);

    it('the kth application rides the 5k-th shot (trigger-pull counting, not pellet counting)', () => {
      expect(applies.length).toBeGreaterThanOrEqual(10);
      const groups = new Map<number, BuffApply[]>();
      for (const b of applies) {
        (groups.get(b.frame) ?? groups.set(b.frame, []).get(b.frame)!).push(b);
      }
      const procFrames = [...groups.keys()].sort((a, b) => a - b);
      for (let k = 1; k <= procFrames.length; k++) {
        const firedByFrame = shots.filter(
          (s) => s.frame <= procFrames[k - 1]
        ).length;
        expect(
          firedByFrame,
          `proc ${k} at frame ${procFrames[k - 1]} with ${firedByFrame} shots fired`
        ).toBe(5 * k);
      }
    });

    it('reaches all four allies (self included), each a 10s window', () => {
      const groups = new Map<number, Set<string>>();
      for (const b of applies) {
        (
          groups.get(b.frame) ?? groups.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetSlug!);
      }
      for (const [frame, holders] of groups) {
        expect(
          holders,
          `frame ${frame} reached ${holders.size} allies, expected 4`
        ).toEqual(new Set(['liter', 'poli', 'modernia', 'helm']));
      }
      for (const b of applies) {
        expect(b.expiresFrame! - b.frame, '10s duration').toBe(10 * FPS);
      }
    });

    it('is LIVE: removing it strictly lowers every unit total', () => {
      for (const slug of SLUGS) {
        expect(
          noS1.totals[slug],
          `${slug} total without the S1 ATK buff`
        ).toBeLessThan(base.totals[slug]);
      }
    });

    it('DISCRIMINATING: a pellet-count trigger (hitCount:5) fires twice per shot', () => {
      const wrong = s1Atk(pelletCountS1.events);
      const wrongFrames = new Set(wrong.map((b) => b.frame));
      const pelletShots = poliShots(pelletCountS1.events);
      expect(wrongFrames.size, '2 procs per shot collapse per-frame').toBe(
        pelletShots.length
      );
      // and the FIRST proc rides shot 1, not shot 5
      const first = [...wrongFrames].sort((a, b) => a - b)[0];
      expect(
        pelletShots.filter((s) => s.frame <= first).length,
        'pellet-count model procs on the very first shot'
      ).toBe(1);
    });
  });

  describe('P2 — Police Badge: battle-start SELF shield (event-only; probe-observed)', () => {
    it('shields poli exactly once, at frame 0 (battle start)', () => {
      const probes = probesOf(probedBase.events, 'poli');
      const atZero = probes.filter((b) => b.frame === 0);
      expect(
        atZero.length,
        'badge fires the shielded trigger at battle start'
      ).toBe(1);
    });

    it('is the ONLY frame-0 shield: badge removed silences the frame-0 probe', () => {
      const probes = probesOf(probedNoBadge.events, 'poli');
      expect(probes.filter((b) => b.frame === 0)).toEqual([]);
      // her per-cast shared-shield procs remain (the badge is not their source)
      expect(
        probes.filter((b) => b.frame > 0).length,
        'burst shared shield still reaches her'
      ).toBe(poliCasts(probedNoBadge.events).length);
    });

    it('is damage-NEUTRAL (a shield, not a damage buff): removing it moves no total', () => {
      const noBadge = run({
        poli: withPatchedOverride('poli', (ov) => {
          ov.skill1 = ov.skill1.filter(
            (b: any) => !b.effects.some((e: any) => e.kind === 'shield')
          );
        }),
      });
      expect(noBadge.totals).toEqual(base.totals);
    });
  });

  describe('P3 — S2: DEF ▲23.51% to self + 2 lowest-HP allies every 20s (inert in v1)', () => {
    const applies = s2Def(base.events);

    it('fires first at t=20 on a strict 20s cadence, at the kit magnitude', () => {
      expect(applies.length).toBeGreaterThanOrEqual(8 * 3);
      const frames = [...new Set(applies.map((b) => b.frame))].sort(
        (a, b) => a - b
      );
      expect(frames[0]).toBe(20 * FPS);
      for (let i = 1; i < frames.length; i++) {
        expect(frames[i] - frames[i - 1], '20s cadence').toBe(20 * FPS);
      }
      expect([
        ...new Set(applies.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([10 * FPS]);
    });

    it('targets poli + the deterministic 2-lowest-HP stand-in (leftmost non-self), 3 holders per firing', () => {
      const groups = new Map<number, Set<string>>();
      for (const b of applies) {
        (
          groups.get(b.frame) ?? groups.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetSlug!);
      }
      expect(groups.size).toBeGreaterThanOrEqual(8);
      for (const [frame, holders] of groups) {
        expect(holders, `frame ${frame}: self + 2 allies, never all 4`).toEqual(
          new Set(['poli', 'liter', 'modernia'])
        );
      }
    });

    it('DISCRIMINATING: an all-allies mis-targeting reaches 4 holders per firing', () => {
      const wrong = s2Def(s2AllAllies.events);
      const groups = new Map<number, Set<string>>();
      for (const b of wrong) {
        (
          groups.get(b.frame) ?? groups.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetSlug!);
      }
      for (const holders of groups.values()) {
        expect(holders.size).toBe(4);
      }
    });

    it('is damage-INERT in v1: removing BOTH S2 blocks moves no total by a point', () => {
      expect(base.totals).toEqual(noS2.totals);
    });
  });

  describe('P7 — burst shared shield: all allies, per cast (event-only; probe-observed)', () => {
    it('reaches a TEAMMATE once per poli cast, frame-exact with her burstCast', () => {
      const casts = poliCasts(probedBase.events);
      const probes = probesOf(probedBase.events, 'modernia');
      expect(probes.length).toBe(casts.length);
      const castFrames = new Set(casts.map((c) => c.frame));
      for (const p of probes) {
        expect(castFrames.has(p.frame), `probe at frame ${p.frame}`).toBe(true);
      }
    });

    it('reaches poli HERSELF per cast ("all allies" includes the skill user)', () => {
      const probes = probesOf(probedBase.events, 'poli');
      const casts = poliCasts(probedBase.events);
      // one per cast + the frame-0 badge proc
      expect(probes.filter((b) => b.frame > 0).length).toBe(casts.length);
    });

    it('shield removed: the teammate probe goes silent', () => {
      expect(probesOf(probedNoSharedShield.events, 'modernia')).toEqual([]);
      // poli keeps ONLY her frame-0 badge proc
      const selfProbes = probesOf(probedNoSharedShield.events, 'poli');
      expect(selfProbes.length).toBe(1);
      expect(selfProbes[0].frame).toBe(0);
    });

    it('DISCRIMINATING: excludeSelf drops poli from the shield (her per-cast probe silences)', () => {
      const selfProbes = probesOf(probedExcludeSelf.events, 'poli');
      expect(
        selfProbes.filter((b) => b.frame > 0),
        'poli no longer receives her own shared shield'
      ).toEqual([]);
      expect(
        probesOf(probedExcludeSelf.events, 'modernia').length,
        'teammates still shielded'
      ).toBe(poliCasts(probedExcludeSelf.events).length);
    });
  });

  describe('P8 — burst: ATK ▲44.55% to ALL allies for 10s on HER cast', () => {
    const applies = burstAtk(base.events);
    const casts = poliCasts(base.events);

    it('fires once per cast to all four allies, at the kit magnitude, 10s windows', () => {
      expect(applies.length).toBe(casts.length * 4);
      expect([...new Set(applies.map((b) => b.value))]).toEqual([44.55]);
      for (const b of applies) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
      const perFrame = new Map<number, Set<string>>();
      for (const b of applies) {
        (
          perFrame.get(b.frame) ??
          perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetSlug!);
      }
      for (const holders of perFrame.values()) {
        expect(holders.size).toBe(4);
      }
    });

    it('lands frame-exact on her stage-2 burstCast frames (before the FB window opens)', () => {
      const castFrames = new Set(casts.map((c) => c.frame));
      const s3Frames = new Set(stage3Casts(base.events).map((c) => c.frame));
      for (const b of applies) {
        expect(castFrames.has(b.frame), 'aura rides her own cast').toBe(true);
        expect(s3Frames.has(b.frame), 'not the stage-3 completion frame').toBe(
          false
        );
      }
    });

    it('is LIVE: removing it strictly lowers every unit total', () => {
      for (const slug of SLUGS) {
        expect(noBurstAtk.totals[slug]).toBeLessThan(base.totals[slug]);
      }
    });

    it('DISCRIMINATING: a fullBurstEnter-keyed aura lands off her cast frames', () => {
      const moved = burstAtk(burstAtkFbEnter.events);
      expect(moved.length).toBeGreaterThan(0);
      const castFrames = new Set(casts.map((c) => c.frame));
      expect(moved.some((b) => castFrames.has(b.frame))).toBe(false);
    });
  });
});
