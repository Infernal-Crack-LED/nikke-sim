// PER-UNIT KIT SPEC — slug `d` (display name "D" — the SMG/Wind BASE unit, Elysion
// Attacker, Burst III, cd 40s; NOT "D: Killer Wife" / slug d-killer-wife, the SR/Fire
// unit — the lint-slug-disambiguation base "D" is inherently ambiguous, this file keys
// the exact slug `d` throughout). Kit-autonomy gauntlet 2026-08-03, test-first.
//
// Kit (blablalink prose, data/characters.json → characters.d.skills):
//   S1 ■ entering Full Burst → self: Elemental Advantage Attack Damage ▲46.93% for 15 sec [D1]
//      ■ entering Full Burst → self: recovers 3.52% of attack damage as HP, 15 sec        [D2]
//      ■ first activation: additionally recovers 16.5% of ATK damage as HP, 15 sec        [D2]
//   S2 ■ stage target appears → all allies: Fills Burst Gauge by 98.56%, 1×/battle        [D3]
//      ■ stage target appears → all allies: immunity to Stun for 36.95 sec                [D4]
//      ■ stage target appears → self: Elemental Advantage Attack Damage ▲91.09% for 15 s  [D5]
//   BU ■ all enemies: 426.24% of final ATK as Burst Skill damage                          [D6]
//      ■ all Attacker allies: Damage to Parts ▲42.38% for 15 sec                          [D7]
//      ■ all allies IF the skill user has immunity to Stun: Full Burst Duration ▲5.04 s   [D8]
//
// Model + dispositions (line inventory — all 9 lines accounted; cross-family S2b
// claude-fable-5 review converged on every disposition):
//   D1  fullBurstEnter → self → elemAdvantageDamagePct 46.93 /15s. Damage-Up ELEMENT bucket,
//       live ONLY under real Wind advantage (BEATS[Wind]=Iron) — byte-identical vs a Fire boss.
//   D2  UNMODELED (both lifesteal lines, verbatim in override.unmodeled.skill1). The recovery
//       is SELF-targeted; the engine's `recovery` trigger fires only when the OWNER of the
//       trigger RECEIVES a heal, and v1 models no HP amounts — a self-heal is unobservable and
//       feeds no consumer in any comp, so encoding a `heal` effect would assert nothing. The
//       no-silent-drop record IS the assertion here (structural pin on the shipped unmodeled text).
//   D3  passive (frame 0, fires exactly once = the kit's "1 time per battle") → all allies →
//       fillGauge 98.56. Observable = the first Full Burst lands near-instantly.
//   D4  DEFENSIVE line, inert at scope (v1 boss never stuns) — but it is the load-bearing GATE
//       FEED for D8: encoded as the `stunImmune` resource seeded to 1 at battle start on the
//       owner and decremented at t=36.95s (interval), reproducing the immunity WINDOW. No direct
//       assertion on the immunity itself; D8's seed-removed counterfactual is its behavioural proof.
//   D5  passive → self → elemAdvantageDamagePct 91.09 /15s (fused frame-0 timed passive, e-h
//       precedent). One application, expires at 15s — NOT permanent, never re-applied.
//   D6  burstCast → enemy → flatDamage 426.24 (burst bucket, cast lands pre-FB → never takes the
//       +50% FB major; noRange rider universal).
//   D7  burstCast → alliesOfClass Attacker → partsDamagePct 42.38 /15s. INERT in v1 (partless
//       boss) — kept as a real stat buff for kit fidelity (anis-sparkling-summer/helm precedent);
//       removing it must change NO unit's total by a single point.
//   D8  burstCast → all allies → fullBurstExtend 5.04, resourceGate stunImmune≥1. THE STATUS-GATE
//       LINE (Tier-2 crux): the gate reads the timed immunity window [0, 36.95s]; her burst CD
//       (40s) exceeds the window, so at most ONE cast can ever land inside it — in the fixture her
//       first cast leads FB#1 (in the opening seconds, gate open) and every later cast lands after
//       36.95s (gate closed). Residual ⚑ (documented in the override note): a cast INSIDE the
//       window is extended regardless of whether it is her first (the window, not the cast count,
//       is the modeled condition) — indistinguishable from first-cast-only at scope.
//
// Fixture: controlComp('d') = liter B1 / crown B2 / d B3 / helm B3, boss Fire, focus d —
// both B3s are 40s CD so they alternate casts and d's burst lines get ≥2 firings; helm taking
// alternate FBs is what makes burstCast-vs-fullBurstEnter keyings genuinely diverge. The elem-
// advantage lines (D1/D5) are INERT vs the Fire control boss, so their LIVENESS is proven on a
// second comp with an Iron boss (BEATS[Wind]=Iron) and their advantage-GATING is proven by
// byte-identical totals when removed on Fire. Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
/** controlComp slot order: liter 0 / crown 1 / d 2 / helm 3. */
const D = 2;
const FB_BASE_FRAMES = 10 * FPS;
const FB_EXTEND_FRAMES = Math.round(5.04 * FPS); // 302

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

const IRON_COMP = {
  slugs: ['liter', 'crown', 'd', 'helm'],
  bossElement: 'Iron' as const,
  focusSlug: 'd',
};

function run(
  opts: ReturnType<typeof controlComp>,
  overrides: Record<string, any> = {}
) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...opts,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / isolation patches -------------------------------------------------------
const without = (
  ov: any,
  slot: string,
  pred: (b: any) => boolean,
  label: string
) => {
  const before = ov[slot].length;
  ov[slot] = ov[slot].filter((b: any) => !pred(b));
  if (ov[slot].length === before) {
    throw new Error(`d ${slot} ${label} block missing — fixture is stale`);
  }
};
const hasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => e.stat === stat);
const hasKind = (b: any, kind: string) =>
  b.effects.some((e: any) => e.kind === kind);

/** D1 reference: S1 elem-advantage line removed. */
const dNoS1Elem = withPatchedOverride('d', (ov) =>
  without(
    ov,
    'skill1',
    (b) => hasStat(b, 'elemAdvantageDamagePct'),
    'S1 elemAdvantage'
  )
);
/** D1 counterfactual: the same line as an UNGATED Damage-Up stat (live without advantage). */
const dS1Generic = withPatchedOverride('d', (ov) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'elemAdvantageDamagePct');
  if (!e) {
    throw new Error('d S1 elemAdvantage effect missing — fixture is stale');
  }
  e.stat = 'attackDamagePct';
});
/** D1 counterfactual: the same line targeting ALL ALLIES instead of self. */
const dS1Allies = withPatchedOverride('d', (ov) => {
  const b = ov.skill1.find((x: any) => hasStat(x, 'elemAdvantageDamagePct'));
  if (!b) {
    throw new Error('d S1 elemAdvantage block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});
/** D3 reference: the opener gauge fill removed. */
const dNoFill = withPatchedOverride('d', (ov) =>
  without(ov, 'skill2', (b) => hasKind(b, 'fillGauge'), 'S2 fillGauge')
);
/** D4/D8 reference: the battle-start stun-immunity seed removed (the gate never opens). */
const dNoSeed = withPatchedOverride('d', (ov) =>
  without(
    ov,
    'skill2',
    (b) => b.effects.some((e: any) => e.kind === 'resource' && e.delta > 0),
    'S2 stunImmune seed'
  )
);
/** D5 reference: S2 opener elem-advantage line removed. */
const dNoS2Elem = withPatchedOverride('d', (ov) =>
  without(
    ov,
    'skill2',
    (b) => hasStat(b, 'elemAdvantageDamagePct'),
    'S2 elemAdvantage'
  )
);
/** D5 counterfactual: the same line with NO duration (permanent instead of 15s). */
const dS2ElemPermanent = withPatchedOverride('d', (ov) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'elemAdvantageDamagePct');
  if (!e) {
    throw new Error('d S2 elemAdvantage effect missing — fixture is stale');
  }
  delete e.durationSec;
});
/** D6 reference: the burst nuke removed. */
const dNoNuke = withPatchedOverride('d', (ov) =>
  without(ov, 'burst', (b) => hasKind(b, 'flatDamage'), 'burst nuke')
);
/** D7 reference: the parts-damage line removed. */
const dNoParts = withPatchedOverride('d', (ov) =>
  without(ov, 'burst', (b) => hasStat(b, 'partsDamagePct'), 'burst partsDamage')
);
/** D8 counterfactual: the extension UNGATED (fires on EVERY d cast, window never read). */
const dUngatedExtend = withPatchedOverride('d', (ov) => {
  const b = ov.burst.find((x: any) => hasKind(x, 'fullBurstExtend'));
  if (!b) {
    throw new Error('d burst fullBurstExtend block missing — fixture is stale');
  }
  delete b.resourceGate;
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run(controlComp('d'));
const noS1ElemFire = run(controlComp('d'), { d: dNoS1Elem });
const s1GenericFire = run(controlComp('d'), { d: dS1Generic });
const s1AlliesFire = run(controlComp('d'), { d: dS1Allies });
const noFill = run(controlComp('d'), { d: dNoFill });
const noSeed = run(controlComp('d'), { d: dNoSeed });
const noNuke = run(controlComp('d'), { d: dNoNuke });
const noParts = run(controlComp('d'), { d: dNoParts });
const ungated = run(controlComp('d'), { d: dUngatedExtend });
const ironBase = run(IRON_COMP);
const ironNoS1Elem = run(IRON_COMP, { d: dNoS1Elem });
const ironNoS2Elem = run(IRON_COMP, { d: dNoS2Elem });
const ironS2Permanent = run(IRON_COMP, { d: dS2ElemPermanent });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const dCasts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'd');
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');
/** The Full Burst a cast LEADS: the first FB start at/after the cast frame (chain casts precede
 *  their FB window opening). */
const ledFb = (evs: SimEvent[], castFrame: number): FbStart | undefined =>
  fbStarts(evs).find((f) => f.frame >= castFrame);

const fbWindow = (f: FbStart) => f.endFrame - f.frame;
const extendedFbs = (evs: SimEvent[]) =>
  fbStarts(evs).filter((f) => fbWindow(f) > FB_BASE_FRAMES);

describe('d (SMG Attacker Wind BIII) — kit spec', () => {
  describe('D1 — S1 elemental-advantage attack damage 46.93% is self-only, per FB entry, advantage-gated', () => {
    const applied = buffs(base.events).filter(
      (b) =>
        b.casterIdx === D &&
        b.stat === 'elemAdvantageDamagePct' &&
        b.value === 46.93
    );

    it('applies once per Full Burst entry, to herself only, for 15 sec', () => {
      expect(applied.length).toBeGreaterThan(0);
      expect(applied.length).toBe(fbStarts(base.events).length);
      expect([...new Set(applied.map((b) => b.targetIdx))]).toEqual([D]);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(15 * FPS);
      }
    });

    it('is INERT without elemental advantage (Fire boss): removing it changes no total', () => {
      expect(base.totals).toEqual(noS1ElemFire.totals);
    });

    it('is LIVE under Wind advantage (Iron boss): removing it lowers her total', () => {
      expect(ironBase.totals.d).toBeGreaterThan(ironNoS1Elem.totals.d);
    });

    it('DISCRIMINATING: an ungated Damage-Up stat would move her damage on the Fire boss', () => {
      expect(s1GenericFire.totals.d).not.toBe(base.totals.d);
    });

    it('DISCRIMINATING: all-ally targeting would apply the buff to 4 holders per FB entry', () => {
      // Value-filtered: her S2 opener carries the SAME stat (91.09, self-only at frame 0).
      const perFrameAlly = new Map<number, Set<number | null>>();
      for (const b of buffs(s1AlliesFire.events).filter(
        (x) =>
          x.casterIdx === D &&
          x.stat === 'elemAdvantageDamagePct' &&
          x.value === 46.93
      )) {
        (
          perFrameAlly.get(b.frame) ??
          perFrameAlly.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx);
      }
      expect(perFrameAlly.size).toBeGreaterThan(0);
      for (const holders of perFrameAlly.values()) {
        expect(holders.size).toBe(4);
      }
      const perFrameShipped = new Map<number, Set<number | null>>();
      for (const b of applied) {
        (
          perFrameShipped.get(b.frame) ??
          perFrameShipped.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetIdx);
      }
      for (const holders of perFrameShipped.values()) {
        expect(holders.size).toBe(1);
      }
    });
  });

  describe('D2 — S1 self-lifesteal lines are honestly UNMODELED (no silent drop)', () => {
    // Self-targeted HP recovery: v1 models no HP amounts, and a `recovery` trigger fires only
    // when the OWNER of that trigger RECEIVES a heal — a self-heal is unobservable in any comp
    // and feeds no consumer (cross-family S2b claude-fable-5 converged on UNMODELED; a `heal`
    // effect here would assert nothing, so the auditable record IS the encoding).
    it('both lifesteal lines sit verbatim in unmodeled.skill1 of the shipped override', () => {
      const ov = loadOverride('d')!;
      const unmodeled = (ov as any).unmodeled?.skill1 ?? [];
      expect(unmodeled).toContain(
        'Recovers 3.52% of attack damage as HP, lasts for 15 sec.'
      );
      expect(unmodeled).toContain(
        'Additionally recovers 16.5% of ATK damage as HP, lasts for 15 sec.'
      );
    });

    it('no heal effect is encoded on her (nothing to assert, nothing to mis-scope onto crown)', () => {
      const ov = loadOverride('d')! as any;
      const allEffects = [...ov.skill1, ...ov.skill2, ...ov.burst].flatMap(
        (b: any) => b.effects
      );
      expect(allEffects.some((e: any) => e.kind === 'heal')).toBe(false);
    });
  });

  describe('D3 — S2 opener fills the Burst Gauge by 98.56% once per battle', () => {
    it('makes the first Full Burst land near-instantly (gauge prefilled)', () => {
      const first = fbStarts(base.events)[0];
      expect(first).toBeDefined();
      // Measured on the deterministic fixture: the prefilled first FB opens at frame 132 (~2.2s —
      // only the residual 1.44% + the B1→B2→B3 chain staging); the NATURAL gauge fill alone opens
      // it at frame 344 (~5.7s).
      expect(
        first.frame,
        'with a 98.56% opener fill the first FB must open near battle start'
      ).toBeLessThan(3 * FPS);
    });

    it('DISCRIMINATING: without the fill the first Full Burst opens materially later', () => {
      const firstBase = fbStarts(base.events)[0].frame;
      const firstNoFill = fbStarts(noFill.events)[0]?.frame ?? Infinity;
      // The natural-fill first FB costs the team the whole 100% gauge accrual (~3.5s later on this
      // fixture); a burstGenPct-style rate buff or a re-firing fill would not produce this shape.
      expect(firstNoFill - firstBase).toBeGreaterThan(2 * FPS);
    });
  });

  describe('D4 — S2 stun immunity: defensive line, inert in v1, present as the timed D8 gate feed', () => {
    it('the seed is the gate input — removing it closes D8 entirely (no FB ever extended)', () => {
      // The immunity line has no OTHER engine-visible consequence (no CC model, partless/
      // stunless boss): its whole observable footprint is D8's gate opening.
      expect(extendedFbs(noSeed.events).length).toBe(0);
    });
  });

  describe('D5 — S2 opener elemental-advantage attack damage 91.09% is a one-shot 15s frame-0 window', () => {
    const applied = buffs(base.events).filter(
      (b) =>
        b.casterIdx === D &&
        b.stat === 'elemAdvantageDamagePct' &&
        b.value === 91.09
    );

    it('applies exactly once, at frame 0, to herself, expiring at 15 sec', () => {
      expect(applied.length).toBe(1);
      expect(applied[0].frame).toBe(0);
      expect(applied[0].targetIdx).toBe(D);
      expect(applied[0].expiresFrame).toBe(15 * FPS);
    });

    it('is INERT without elemental advantage (Fire boss): removing it changes no total', () => {
      expect(base.totals).toEqual(noS2ElemFireTotals());
    });

    it('is LIVE under Wind advantage (Iron boss): removing it lowers her total', () => {
      expect(ironBase.totals.d).toBeGreaterThan(ironNoS2Elem.totals.d);
    });

    it('DISCRIMINATING: a permanent (undurationed) window would out-damage the shipped 15s one', () => {
      expect(ironS2Permanent.totals.d).toBeGreaterThan(ironBase.totals.d);
    });
  });

  describe('D6 — burst nuke: 426.24% of final ATK, once per own cast, pre-FB', () => {
    const nukes = dmg(base.events).filter(
      (d) => d.slug === 'd' && d.srcSlot === 'burst'
    );

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      const casts = dCasts(base.events).length;
      expect(casts).toBeGreaterThanOrEqual(2);
      expect(nukes.length).toBe(casts);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([426.24]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      expect(nukes.filter((d) => d.fbMajorApplied).length).toBe(0);
    });

    it('DISCRIMINATING: removing the nuke zeroes her burst-bucket damage', () => {
      expect(
        dmg(noNuke.events).filter((d) => d.slug === 'd' && d.bucket === 'burst')
          .length
      ).toBe(0);
    });
  });

  describe('D7 — burst Damage-to-Parts 42.38% is Attacker-scoped and exactly inert vs the partless boss', () => {
    it("removing it changes NO unit's total by a single point", () => {
      expect(base.totals).toEqual(noParts.totals);
    });

    it('applies to exactly the Attacker-class allies (d + helm; not liter/crown) for 15 sec', () => {
      const applied = buffs(base.events).filter(
        (b) => b.casterIdx === D && b.stat === 'partsDamagePct'
      );
      expect(applied.length).toBeGreaterThan(0);
      expect([...new Set(applied.map((b) => b.value))]).toEqual([42.38]);
      const perFrame = new Map<number, Set<string | null>>();
      for (const b of applied) {
        (
          perFrame.get(b.frame) ??
          perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(b.targetSlug);
      }
      for (const holders of perFrame.values()) {
        expect([...holders].sort()).toEqual(['d', 'helm']);
      }
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(15 * FPS);
      }
    });

    it('DISCRIMINATING: all-ally targeting would also reach liter and crown', () => {
      const allAlly = withPatchedOverride('d', (ov) => {
        const b = ov.burst.find((x: any) => hasStat(x, 'partsDamagePct'));
        if (!b) {
          throw new Error(
            'd burst partsDamagePct block missing — fixture is stale'
          );
        }
        b.target = { kind: 'allies' };
      });
      const res = run(controlComp('d'), { d: allAlly });
      const applied = buffs(res.events).filter(
        (b) => b.casterIdx === D && b.stat === 'partsDamagePct'
      );
      const holders = new Set(applied.map((b) => b.targetSlug));
      expect([...holders].sort()).toEqual(['crown', 'd', 'helm', 'liter']);
    });
  });

  describe('D8 — stun-immunity-gated Full Burst Duration ▲5.04s: the timed window [0, 36.95s]', () => {
    it('extends exactly one FB window, to base+5.04s; every other window is the 10s base', () => {
      const ext = extendedFbs(base.events);
      expect(ext.length).toBe(1);
      expect(fbWindow(ext[0])).toBe(FB_BASE_FRAMES + FB_EXTEND_FRAMES);
      for (const f of fbStarts(base.events)) {
        expect([FB_BASE_FRAMES, FB_BASE_FRAMES + FB_EXTEND_FRAMES]).toContain(
          fbWindow(f)
        );
      }
    });

    it('the extended window is the one her FIRST burst cast leads (inside the immunity window)', () => {
      const firstCast = dCasts(base.events)[0];
      expect(firstCast).toBeDefined();
      expect(
        firstCast.frame,
        'her first cast must land inside the 36.95s immunity window'
      ).toBeLessThan(Math.round(36.95 * FPS));
      const led = ledFb(base.events, firstCast.frame);
      expect(led).toBeDefined();
      expect(fbWindow(led!)).toBe(FB_BASE_FRAMES + FB_EXTEND_FRAMES);
    });

    it('her LATER casts lead unextended windows (they land after the 36.95s window lapses)', () => {
      const later = dCasts(base.events).slice(1);
      expect(later.length).toBeGreaterThanOrEqual(1);
      for (const c of later) {
        expect(
          c.frame,
          'a later cast should be past the immunity window at this CD'
        ).toBeGreaterThan(Math.round(36.95 * FPS));
        const led = ledFb(base.events, c.frame);
        expect(led).toBeDefined();
        expect(
          fbWindow(led!),
          `cast at ${(c.frame / FPS).toFixed(2)}s led an extended FB`
        ).toBe(FB_BASE_FRAMES);
      }
    });

    it('DISCRIMINATING: an ungated extension would extend EVERY d-led FB window', () => {
      const ext = extendedFbs(ungated.events);
      expect(ext.length).toBe(dCasts(ungated.events).length);
      expect(ext.length).toBeGreaterThanOrEqual(2);
    });

    it('DISCRIMINATING: without the immunity seed NO window is extended', () => {
      expect(extendedFbs(noSeed.events).length).toBe(0);
    });
  });
});

/** D5 Fire-boss inertness reference (kept out of the hoisted set — the only single-use run). */
function noS2ElemFireTotals() {
  return run(controlComp('d'), { d: dNoS2Elem }).totals;
}
