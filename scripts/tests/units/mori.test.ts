// PER-UNIT KIT SPEC — `mori` (Mori, Supporter/AR/Wind, Burst II, cd 20s, ammo 60, hitsPerShot 1).
// Kit-autonomy gauntlet 2026-08-04 (test-first re-derivation). NOTE: this is a FROM-SCRATCH unit —
// there was no shipped override before this gauntlet (simSupported was false), so the harness
// cannot even load her until src/skills/overrides/mori.json exists. The override was authored
// first (the faithful encoding under test); every assertion below PINS a kit line GREEN vs that
// override and RED vs the nearest-wrong counterfactual (withPatchedOverride), so the file still
// discriminates exactly as a verification gauntlet would.
//
// Kit (blablalink prose, data/characters.json → characters.mori.skills), max level:
//   S1 ■ battle start → self: Struggle = Shield of 40.12% of final Max HP, continuously.      [M5]
//      ■ using Burst Skill while NOT in Struggle → re-create the Struggle shield.  [UNMODELED — unreachable]
//      ■ when Struggle ENDS → Max HP ▲ 5.06%, stacks up to 5 times.                [UNMODELED — no trigger]
//   S2 ■ 60 normal attacks while in Struggle → taunt the target 4 sec.              [UNMODELED — no primitive]
//      ■ ally/self destroys an enemy part → all allies Sustained damage ▲ 2.03%,
//        stacks up to 5 times, lasts 15 sec.                                       [UNMODELED — out of domain]
//      ■ ally/self destroys an enemy part → highest-ATK enemy: 23.23% of final ATK
//        as sustained damage every 1 sec for 15 sec.                               [UNMODELED — out of domain]
//   BU ■ while in Struggle → self: recover Shield HP = 15.04% of final Max HP.                [M5]
//      ■ while NOT in Struggle → self: Max HP ▲ 10.09% for 10 sec.                [UNMODELED — unreachable]
//      ■ all allies: Sustained damage ▲ 10.16% for 10 sec.                                     [M1/M2]
//
// Modeling posture (full story in the override note + caveats):
//   * Struggle IS the kit's state machine and the engine models it as a shield effect: a
//     battle-start passive shield (label precedent: durationSec-less = permanent at scope —
//     nothing in v1 removes shields, exactly as the boss deals no damage) which opens mori's own
//     requiresShielded gate. Her burst's "in Struggle" shield-recovery line carries that gate;
//     the "not in Struggle" branches (S1 re-shield, burst Max HP▲) are UNREACHABLE in v1 — the
//     engine has no negated-shield gate and no shield-break model — so they are documented
//     UNMODELED, not encoded (an unconditional encoding would over-credit both branches at once).
//   * The shield lines are damage- and event-INERT in v1 (no HP pool is modeled): M4 proves
//     byte-identical totals with the whole shield chain removed; M5 pins the encoding
//     structurally (the only honest pin for an event-inert line — helm H3 precedent for
//     non-event carriers).
//   * The burst's all-ally Sustained damage ▲ 10.16%/10s is her ONE load-bearing damage line in
//     v1: an additive Damage-Up bucket that feeds ONLY sustained-flavor hits. M2 proves it live
//     (moves jill's sustained DoT total) and bucket-faithful (her normal hits stay byte-identical
//     — the generic attackDamagePct counterfactual provably fails that property).
//   * The part-destruction lines (S2 stack buff + enemy DoT), the Struggle-end Max HP stacks and
//     the taunt have NO engine trigger/primitive and cannot fire on the partless scope-lock boss:
//     UNMODELED out-of-domain, pinned verbatim as the audit record in M5.
//   * Gauge generation is carried by data/gauge-per-shot.json (datamined 2000/4000 energy →
//     base 20 / target 40), NOT an override block (helm H3 precedent) — pinned in M6.
//
// Fixture: a custom B1/B2/B3 chain — liter(B1) / mori(B2) / jill(B3), boss forced-neutral (null),
// focus mori. The standard controlComp CANNOT be used: crown is also Burst II and would take the
// stage-II slot, leaving mori ZERO casts (vacuous assertions). Here mori is the SOLE B2, so she
// casts on EVERY chain (~20s cadence) even when jill's 40s CD leaves alternate chains without a
// stage-3 completion. jill is the sustained-flavor carrier: her passive whole-fight Acid Ammo DoT
// (skill2, 192%/1s, sustained) makes mori's team buff observably live. Deterministic (no seed);
// event-log over totals.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SLUGS = ['liter', 'mori', 'jill'] as const;
/** slot order: liter 0 / mori 1 / jill 2. */
const MORI = 1;
const JILL = 2;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type FullBurstStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...SLUGS],
    bossElement: null,
    focusSlug: 'mori',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const moriCasts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'mori');
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FullBurstStart => e.kind === 'fullBurstStart');

/** jill's Acid Ammo DoT ticks — her passive whole-fight SUSTAINED damage source. */
const jillDot = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'jill' && d.srcSlot === 'skill2');
const jillNormals = (evs: SimEvent[]) =>
  dmg(evs).filter((d) => d.slug === 'jill' && d.bucket === 'normal');
const sum = (ds: Damage[]) => ds.reduce((a, d) => a + d.amount, 0);

/** mori's burst team buff applications (the burst-L3 observable). */
const teamBuff = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === MORI && b.stat === 'sustainedDamagePct'
  );
/** Grouped by frame: one cast = one frame = one buff per ally. */
const teamBuffFrames = (evs: SimEvent[]): Map<number, Set<number | null>> => {
  const perFrame = new Map<number, Set<number | null>>();
  for (const b of teamBuff(evs)) {
    (
      perFrame.get(b.frame) ??
      perFrame.set(b.frame, new Set()).get(b.frame)!
    ).add(b.targetIdx);
  }
  return perFrame;
};
/** The M3 probe's buff applications (a synthetic requiresShielded observer — see M3). */
const probeBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === MORI && b.stat === 'atkPct' && b.value === 1
  );

// ---- counterfactual / isolation patches -------------------------------------------------------
const buffBlock = (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'sustainedDamagePct')
  );
  if (!b) {
    throw new Error(
      'mori burst sustainedDamagePct block missing — fixture is stale'
    );
  }
  return b;
};
/** M2 reference: the burst team buff removed entirely. */
const moriNoBuff = withPatchedOverride('mori', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (x: any) => !x.effects.some((e: any) => e.stat === 'sustainedDamagePct')
  );
  if (ov.burst.length === before) {
    throw new Error(
      'mori burst sustainedDamagePct block missing — fixture is stale'
    );
  }
});
/** M2 counterfactual: the same line as a GENERIC (unflavored) Damage-Up buff — the nearest wrong
 *  bucket, which would feed every hit flavor, not just sustained. */
const moriGenericBuff = withPatchedOverride('mori', (ov) => {
  buffBlock(ov).effects
    .filter((e: any) => e.stat === 'sustainedDamagePct')
    .forEach((e: any) => (e.stat = 'attackDamagePct'));
});
/** M1 counterfactual: the team buff keyed to fullBurstEnter (fires once per completed chain)
 *  instead of mori's own burstCast (fires on EVERY chain she casts, including the ones jill's
 *  40s CD leaves stage-2-only). */
const moriBuffOnFbEnter = withPatchedOverride('mori', (ov) => {
  const b = buffBlock(ov);
  if (b.trigger.kind !== 'burstCast') {
    throw new Error('mori burst buff trigger changed — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
/** M4 isolation: the whole shield chain removed (battle-start Struggle + the gated burst
 *  recovery). Shield lines are damage-inert in v1 — this must move NO unit's total. */
const moriNoShieldChain = withPatchedOverride('mori', (ov) => {
  const s1Before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'shield')
  );
  if (ov.skill1.length === s1Before) {
    throw new Error('mori S1 shield block missing — fixture is stale');
  }
  const buBefore = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'shield')
  );
  if (ov.burst.length === buBefore) {
    throw new Error('mori burst shield block missing — fixture is stale');
  }
});
/** M3 observer: a synthetic requiresShielded probe block appended to mori's burst slot. It has
 *  ONE job — make the shield STATE readable in the event log: it fires a 1%/1s atkPct buff on
 *  each burstCast iff mori is shielded at cast time. It is a measurement instrument, never the
 *  encoding under test. */
const PROBE = {
  slot: 'burst',
  trigger: { kind: 'burstCast' },
  target: { kind: 'self' },
  requiresShielded: true,
  effects: [{ kind: 'buff', stat: 'atkPct', value: 1, durationSec: 1 }],
};
const moriProbe = withPatchedOverride('mori', (ov) => {
  ov.burst.push(JSON.parse(JSON.stringify(PROBE)));
});
/** M3 RED leg: the same probe with the battle-start Struggle shield removed. */
const moriProbeNoStruggle = withPatchedOverride('mori', (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'shield')
  );
  if (ov.skill1.length === before) {
    throw new Error('mori S1 shield block missing — fixture is stale');
  }
  ov.burst.push(JSON.parse(JSON.stringify(PROBE)));
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noBuff = run({ mori: moriNoBuff });
const genericBuff = run({ mori: moriGenericBuff });
const buffOnFbEnter = run({ mori: moriBuffOnFbEnter });
const noShieldChain = run({ mori: moriNoShieldChain });
const probe = run({ mori: moriProbe });
const probeNoStruggle = run({ mori: moriProbeNoStruggle });

describe('mori — kit spec', () => {
  it('fixture sanity: sole B2 — mori casts every chain and is never starved by a second B2', () => {
    const casts = moriCasts(base.events);
    expect(casts.length).toBeGreaterThanOrEqual(4);
    expect([...new Set(casts.map((c) => c.stage))]).toEqual([2]);
    // her 20s CD vs jill's 40s: she casts STRICTLY more often than the chain completes
    expect(casts.length).toBeGreaterThan(fbStarts(base.events).length);
    expect(fbStarts(base.events).length).toBeGreaterThanOrEqual(3);
  });

  describe('M1 — burst: all allies gain Sustained damage ▲10.16% for 10s on EVERY mori cast', () => {
    const applied = teamBuff(base.events);
    const perFrame = teamBuffFrames(base.events);
    const castFrames = new Set(moriCasts(base.events).map((c) => c.frame));

    it('lands one buff group per mori burstCast, on her cast frames', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect(perFrame.size).toBe(moriCasts(base.events).length);
      for (const frame of perFrame.keys()) {
        expect(castFrames.has(frame), `buff group at frame ${frame}`).toBe(
          true
        );
      }
    });

    it('reaches all three allies including herself, at the kit magnitude, for exactly 10s', () => {
      expect([...new Set(applied.map((b) => b.value))]).toEqual([10.16]);
      for (const holders of perFrame.values()) {
        expect(holders.size).toBe(3);
        expect(holders.has(MORI)).toBe(true);
        expect(holders.has(JILL)).toBe(true);
      }
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('DISCRIMINATING: a fullBurstEnter-keyed buff fires only on completed chains (fewer groups)', () => {
      const moved = teamBuffFrames(buffOnFbEnter.events);
      expect(moved.size).toBeGreaterThan(0);
      expect(moved.size).toBeLessThan(perFrame.size);
      expect(moved.size).toBe(fbStarts(buffOnFbEnter.events).length);
    });
  });

  describe('M2 — bucket fidelity: sustainedDamagePct feeds ONLY sustained-flavor hits', () => {
    it('is LIVE: jill sustained DoT total rises while mori windows cover the fight', () => {
      expect(sum(jillDot(base.events))).toBeGreaterThan(
        sum(jillDot(noBuff.events))
      );
    });

    it('is bucket-faithful: jill NORMAL hits are byte-identical with and without the buff', () => {
      expect(jillNormals(base.events).length).toBeGreaterThan(0);
      expect(sum(jillNormals(base.events))).toBe(
        sum(jillNormals(noBuff.events))
      );
    });

    it('DISCRIMINATING: a generic attackDamagePct leaks into the normal bucket', () => {
      expect(sum(jillNormals(genericBuff.events))).not.toBe(
        sum(jillNormals(noBuff.events))
      );
    });
  });

  describe('M3 — Struggle: mori is shielded from battle start (the requiresShielded state)', () => {
    it('a requiresShielded probe fires on EVERY mori cast (shield state live from t=0)', () => {
      const casts = moriCasts(probe.events);
      expect(casts.length).toBeGreaterThan(0);
      expect(probeBuffs(probe.events).length).toBe(casts.length);
    });

    it('DISCRIMINATING: without the battle-start Struggle shield the probe never fires', () => {
      expect(moriCasts(probeNoStruggle.events).length).toBeGreaterThan(0);
      expect(probeBuffs(probeNoStruggle.events).length).toBe(0);
    });
  });

  describe('M4 — the shield chain is exactly inert in v1 (no HP pool, no shield event)', () => {
    it("removing the whole chain changes NO unit's total by a single point", () => {
      expect(base.totals).toEqual(noShieldChain.totals);
    });
  });

  describe('M5 — structural pins: event-inert shield lines + the UNMODELED audit record', () => {
    const ov = JSON.parse(
      readFileSync(
        new URL('../../../src/skills/overrides/mori.json', import.meta.url),
        'utf8'
      )
    );

    it('S1: battle-start passive self-shield, 40.12% of final Max HP, continuously (no duration)', () => {
      const b = ov.skill1.find((x: any) => x.trigger?.kind === 'passive');
      expect(b).toBeDefined();
      expect(b.target).toEqual({ kind: 'self' });
      expect(b.effects).toEqual([{ kind: 'shield', maxHpPct: 40.12 }]);
    });

    it('burst L1: shield recovery 15.04% gated on requiresShielded (in Struggle), self-targeted', () => {
      const b = ov.burst.find((x: any) =>
        x.effects.some((e: any) => e.kind === 'shield')
      );
      expect(b).toBeDefined();
      expect(b.trigger).toEqual({ kind: 'burstCast' });
      expect(b.requiresShielded).toBe(true);
      expect(b.target).toEqual({ kind: 'self' });
      expect(b.effects).toEqual([{ kind: 'shield', maxHpPct: 15.04 }]);
    });

    it('the unmodeled record is exhaustive and verbatim (no silent drops)', () => {
      expect(Object.keys(ov.unmodeled).sort()).toEqual([
        'burst',
        'skill1',
        'skill2',
      ]);
      expect(ov.unmodeled.skill1).toEqual([
        '■ Activates when using Burst Skill. Affects self if not in Struggle status.\nStruggle: Creates a Shield equal to 40.12% of the final Max HP continuously.',
        '■ Activates when Struggle status ends. Affects self.\nMax HP ▲ 5.06% continuously, stacks up to 5 time(s).',
      ]);
      expect(ov.unmodeled.skill2).toEqual([
        '■ Activates after landing 60 normal attack(s) when self is in Struggle status. Affects the target.\nTaunts for 4 sec.',
        '■ Activates when an ally or self destroys an enemy\'s part. Affects all allies.\nSustained damage ▲ 2.03%, stacks up to 5 time(s) and lasts for 15 sec.',
        '■ Activates when an ally or self destroys an enemy\'s part. Affects 1 enemy unit(s) with the highest ATK.\nDeals 23.23% of final ATK as sustained damage every 1 sec for 15 sec.',
      ]);
      expect(ov.unmodeled.burst).toEqual([
        '■ Activates when self is not in Struggle status. Affects self.\nMax HP ▲ 10.09% for 10 sec.',
      ]);
    });
  });

  describe('M6 — gauge generation is carried by data/gauge-per-shot.json (datamined)', () => {
    it('is the datamined 2000/4000 energy row, not an override block', () => {
      const gauge = JSON.parse(
        readFileSync(
          new URL('../../../data/gauge-per-shot.json', import.meta.url),
          'utf8'
        )
      );
      expect(gauge.mori.basePerTrigger, 'energy 2000 / 100').toBe(20);
      expect(gauge.mori.targetPerTrigger, 'energy 4000 / 100').toBe(40);
      expect(gauge.mori.source).toBe('datamined');
    });
  });
});
