// PER-UNIT KIT SPEC — `scarlet-black-shadow` (Scarlet: Black Shadow, "sbs"; Attacker/RL/Wind,
// Burst III, cd 40s, ammo 9, chargeFrames 18, chargeMultiplier 150). Kit-autonomy gauntlet
// 2026-07-25. This is the RL/Wind OVERSPEC variant — an entirely different unit from the
// AR/Electric base (slug `scarlet`); never conflate them (P0).
//
// One assertion group per KIT LINE (B1..B10 below), asserted against the SHIPPED override loaded
// from disk. `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest wrong model
// each assertion must discriminate against) — never to supply the encoding under test.
//
// Kit (blablalink prose, data/characters.json → characters['scarlet-black-shadow'].skills):
//   S1 ■ on Full Charge; effect varies by attack count, "only one effect triggered at a time":
//        3x → 1 lowest-final-DEF enemy: 283.03% final ATK as damage              [B1,B2,B3,B4]
//        6x → enemies within range:      565%    final ATK as Distributed Damage  [B2,B3,B4]
//        9x → all enemies:               848.03% final ATK as Distributed Damage  [B2,B3,B4]
//   S2 ■ on entering Full Burst → self: Max Ammo ▲60% for 10 sec                  [B5,B6]
//                                      Reload 100% of the magazine(s)             [B7]
//   BU ■ on cast → self: changes Full-Charge count required for S1 to 1/2/3 for 10 sec  [B10]
//                      ATK ▲115.12% for 10 sec                                    [B8]
//                      Charge Damage ▲169.63% for 10 sec                          [B9]
//
// LOAD-BEARING MECHANIC (engine sim.ts:2912 `chargeCounter`): S1 is a single block with a CYCLING
// per-full-charge phase counter. Only full charges advance it; each threshold accrual fires ONE
// effect (`effects[phase]`, in order) then advances `phase = (phase+1) % 3` — so the global proc
// value sequence is a clean 283.03 → 565 → 848.03 → 283.03 … loop, one proc per firing frame.
// Threshold = `count` (3) charges/phase outside Full Burst, `countInFb` (1) inside; the lowered
// in-burst threshold is gated on HER OWN `lastBurstCastFrame` (sim.ts:2921), NOT the team FB window.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   B1  procs coincide with charged-shot frames — a CONSISTENCY pin, not a discriminator: sbs is an
//       RL with hitsPerShot 1 and auto-play ALWAYS full-charges (mechanics §4/§7), so she has NO
//       non-charged pulls and an every-shot/hitCount mis-trigger is extensionally IDENTICAL here
//       (unobservable in v1; S2b flagged the same blind spot). The chargeCounter encoding is still
//       the correct one; this assertion just confirms procs land on the kit's unit of account.
//   B2  the value sequence is the exact 3-phase cycle with NO two procs on one frame — pins "only
//       one effect triggered at a time". A "phases stack" mis-model would emit a single summed
//       1696.06% instance (or 3 same-frame instances); a wrong-order model breaks the cycle.
//   B3  the values are the POST-PATCH 283.03/565/848.03, not the pre-patch 250.47/500/750.47 the
//       note records (the nearest-wrong counterfactual).
//   B4  565 & 848.03 carry `flavor:"distributed"`, 283.03 is plain — pinned structurally on the
//       encoding AND shown inert in the partless-boss scope (no distributedDamagePct source, no
//       dmgTaken on a partless boss → the flavor moves nothing here; helm-H4-style totals equality).
//   B5  S2 fires on EVERY team Full Burst (fullBurstEnter), not on her own burstCast: the maxAmmo
//       buff is applied once per fullBurstStart (12× over the fight) which is strictly MORE than her
//       own 6 casts — helm opens the other 6 FBs. A burstCast trigger would apply it only 6×.
//   B6  the TREASURE-less value 60, for exactly 10s (600f), self-scoped.
//   B7  Reload 100% (instantReload fraction 1), ordered AFTER the +60% cap so the refill fills the
//       BOOSTED magazine. The engine snaps ammo silently (sim.ts:2105 emits NO reload event), so the
//       refill is pinned structurally (fraction 1) AND behaviourally: her realized peak magazine and
//       her FB-window shot count both exceed the no-ammo-effects baseline (OL base5 gives a flat +3,
//       so 12 unboosted → round(9×1.6)+3 = 17 boosted). A reload resolved BEFORE the cap, or omitted,
//       leaves the magazine at baseline.
//   B8/B9 the burst buffs apply once per OWN burstCast (6×), NOT per FB (12×) — the burstCast-vs-
//       fullBurstEnter mirror of B5. Value/duration/self pinned.
//   B10 the count-requirement line: procs cluster into HER OWN burst window (dense) and stay at the
//       sparse baseline in FB windows she did NOT cast (helm-opened) — pins "gated on her OWN burst
//       cast". A team-FB-window gate would spike the helm-opened windows too.
//
// ⚑ MEASUREMENT-GATED — the "proc-count knot" (override note + kit-status F3). The EXACT per-phase
//   threshold VALUES are a documented approximation, NOT pinned to a number here:
//     • in-burst: shipped scalar `countInFb:1` (a proc EVERY charge, cycling) vs the kit-literal
//       per-phase 1/2/3 ("Changes Full Charge attack count required for S1 to 1 time/2 times/3
//       times"). The per-phase [1,2,3]/[3,6,9] reading was tested and overshoots cold (~0.78 vs the
//       ~1.13/1.18 baseline); own-probe evidence is split (sbs-control: procs ~every charge in
//       burst; N3 re-read: the 848% phase ABSENT from one confirmed window).
//     • out-of-burst: shipped scalar `count:3` = the CUMULATIVE 3rd/6th/9th reading; the kit only
//       states the in-burst override, so the out-of-burst default is itself under-determined.
//   ESTIMATE: true in-burst cadence is between scalar-1 (~15 procs/window) and per-phase 1/2/3
//   (~7-8/window); shipped scalar-1 grades ~1.18 on N3 (OVER), so the truth is likely a little
//   sparser than scalar-1. TIER 2 (scoped self-buff + burstCast gate + meta-defining wind carry).
//   RECIPE: record an ISOLATED single-burst SBS clip (camera-focused, no entangling team damage),
//   count her S1 proc popups — especially the distinct ~3.2M 848% phase — in ONE clean burst window
//   at real ATK scale, and compare to the sim's every-charge rate; resolve the ATK/rotation confound
//   (sim charge-normal 1.64M vs real 1.03M) before re-tuning. Do NOT re-fudge the cadence.
//   This file pins the FAITHFUL structure (cycling values, full-charge gating, own-cast clustering)
//   that holds under BOTH readings, and leaves the exact count to that recording.
//
// Fixture: the 720-kit-audit control comp (liter B1 / crown B2 / sbs B3 carry / helm B3, boss Fire,
// focus sbs) — sbs needs a real rotation to cast at all, and helm (a SECOND B3) opens half the Full
// Bursts, which is what makes the fullBurstEnter-vs-burstCast discriminations (B5/B8/B9/B10) live.
// Deterministic (no seed). Slot order: liter 0 / crown 1 / sbs 2 / helm 3.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUG = 'scarlet-black-shadow';
/** controlComp slot order: liter 0 / crown 1 / sbs 2 / helm 3. */
const SBS = 2;
const FIGHT_FRAMES = 180 * FPS;
const WINDOW = 10 * FPS;

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;
type FbStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...controlComp(SLUG),
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual patches -------------------------------------------------------------------
/** B3 reference: the PRE-PATCH S1 magnitudes (override note: 250.47/500/750.47 → 283.03/565/848.03). */
const sbsPrePatch = withPatchedOverride(SLUG, (ov) => {
  const fx = ov.skill1[0]?.effects;
  if (!fx || fx.length !== 3)
    throw new Error('sbs S1 phase effects missing — fixture is stale');
  fx[0].atkPct = 250.47;
  fx[1].atkPct = 500;
  fx[2].atkPct = 750.47;
});
/** B4 reference: strip the distributed flavor from the 6x/9x phases (all three plain). */
const sbsAllPlain = withPatchedOverride(SLUG, (ov) => {
  const fx = ov.skill1[0]?.effects;
  if (!fx || fx[1]?.flavor !== 'distributed' || fx[2]?.flavor !== 'distributed')
    throw new Error('sbs S1 distributed phases missing — fixture is stale');
  delete fx[1].flavor;
  delete fx[2].flavor;
});
/** B5 counterfactual: S2 keyed off her OWN burstCast instead of Full Burst entry. */
const sbsS2OnCast = withPatchedOverride(SLUG, (ov) => {
  const b = ov.skill2.find((x: any) => x.trigger?.kind === 'fullBurstEnter');
  if (!b)
    throw new Error('sbs S2 fullBurstEnter block missing — fixture is stale');
  b.trigger.kind = 'burstCast';
});
/** B10 counterfactual: remove the in-burst threshold lowering (countInFb = count = 3, no cluster). */
const sbsNoLowering = withPatchedOverride(SLUG, (ov) => {
  const t = ov.skill1[0]?.trigger;
  if (!t || t.kind !== 'chargeCounter')
    throw new Error('sbs S1 chargeCounter missing — fixture is stale');
  t.countInFb = t.count; // 3 in-burst too → no lowering → procs never cluster into the burst window
});
/** B7 counterfactual: strip BOTH S2 ammo effects (the +60% cap AND the 100% reload). */
const sbsNoAmmoFx = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.flatMap((b: any) => b.effects).length;
  for (const b of ov.skill2)
    b.effects = b.effects.filter(
      (e: any) => e.stat !== 'maxAmmoPct' && e.kind !== 'instantReload',
    );
  if (ov.skill2.flatMap((b: any) => b.effects).length !== before - 2)
    throw new Error(
      'sbs S2 maxAmmoPct/instantReload effects missing — fixture is stale',
    );
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const prePatch = run({ [SLUG]: sbsPrePatch });
const allPlain = run({ [SLUG]: sbsAllPlain });
const s2OnCast = run({ [SLUG]: sbsS2OnCast });
const noLowering = run({ [SLUG]: sbsNoLowering });
const noAmmoFx = run({ [SLUG]: sbsNoAmmoFx });

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const shots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
const chargedFrames = (evs: SimEvent[]) =>
  new Set(
    shots(evs)
      .filter((s) => s.charged)
      .map((s) => s.frame),
  );
/** sbs S1 phase procs, in frame order. */
const s1Procs = (evs: SimEvent[]) =>
  dmg(evs)
    .filter((d) => d.slug === SLUG && d.srcSlot === 'skill1')
    .sort((a, b) => a.frame - b.frame);
const sbsCasts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SLUG);
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FbStart => e.kind === 'fullBurstStart');
/** sbs-cast frames that are NOT near a fullBurstStart she did not own = FB windows helm opened. */
const helmOpenedFb = (evs: SimEvent[]) => {
  const own = new Set(sbsCasts(evs).map((c) => c.frame));
  return fbStarts(evs).filter(
    (fb) => ![...own].some((f) => Math.abs(f - fb.frame) < 30),
  );
};
/** sbs buffs on a given stat. */
const sbsBuff = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === SBS && b.stat === stat);

describe('scarlet-black-shadow (sbs) — kit spec', () => {
  describe('B1 — S1 procs coincide with full-charge pulls (consistency pin)', () => {
    it("every S1 proc lands on a charged-shot frame (the kit's unit of account)", () => {
      // CONSISTENCY, not discrimination: sbs always full-charges (RL, hitsPerShot 1, auto-play), so
      // an every-shot/hitCount mis-trigger is extensionally identical and unobservable in v1 (S2b
      // flagged the same blind spot). This confirms procs fire on full-charge pulls; chargeCounter
      // is the correct encoding.
      const procs = s1Procs(base.events);
      const cf = chargedFrames(base.events);
      expect(procs.length, 'no S1 procs fired at all').toBeGreaterThan(0);
      expect(procs.filter((p) => !cf.has(p.frame)).map((p) => p.frame)).toEqual(
        [],
      );
    });
  });

  describe('B2 — S1 fires ONE effect at a time, cycling 283.03 → 565 → 848.03', () => {
    const procs = s1Procs(base.events);
    it('no two procs share a frame ("only one effect is triggered at a time")', () => {
      const frames = procs.map((p) => p.frame);
      expect(frames.filter((f, i) => frames.indexOf(f) !== i)).toEqual([]);
    });
    it('the value sequence is the exact 3-phase cycle, in order, for the whole fight', () => {
      const cycle = [283.03, 565, 848.03];
      expect(procs.length).toBeGreaterThanOrEqual(3);
      procs.forEach((p, i) =>
        expect(p.atkPct, `proc ${i} @${p.frame}`).toBe(cycle[i % 3]),
      );
    });
  });

  describe('B3 — S1 magnitudes are the POST-PATCH 283.03 / 565 / 848.03', () => {
    it('the distinct proc magnitudes are exactly the post-patch set', () => {
      expect(
        [...new Set(s1Procs(base.events).map((p) => p.atkPct))].sort(
          (a, b) => a - b,
        ),
      ).toEqual([283.03, 565, 848.03]);
    });
    it('DISCRIMINATING: the pre-patch 250.47/500/750.47 model produces a different sequence', () => {
      expect([
        ...new Set(s1Procs(prePatch.events).map((p) => p.atkPct)),
      ]).not.toEqual([283.03, 565, 848.03]);
    });
  });

  describe('B4 — 6x/9x phases are Distributed Damage; the 3x phase is plain', () => {
    it('encodes distributed on the 565 & 848.03 effects and plain on 283.03', () => {
      // a no-op patch returns a clean clone of the SHIPPED disk override (the encoding under test)
      const shipped: any[] = (withPatchedOverride(SLUG, () => {}) as any)
        .skill1[0].effects;
      expect(shipped[0].flavor ?? 'plain').toBe('plain');
      expect(shipped[1].flavor).toBe('distributed');
      expect(shipped[2].flavor).toBe('distributed');
    });
    it('is inert in the partless-boss scope (removing the flavor changes no total by a point)', () => {
      // No distributedDamagePct source and no dmgTaken on a partless boss → distributed is a no-op
      // here. helm-H4-style: the flavor is faithfully encoded yet moves nothing in THIS basis.
      expect(base.totals).toEqual(allPlain.totals);
    });
  });

  describe('B5 — S2 triggers on FULL BURST ENTRY (every team FB), not on her own burstCast', () => {
    const maxAmmo = sbsBuff(base.events, 'maxAmmoPct');
    it('applies the maxAmmo buff once per Full Burst (== fullBurstStart count, > her own casts)', () => {
      const fbs = fbStarts(base.events).length;
      const own = sbsCasts(base.events).length;
      expect(
        fbs,
        'fixture must produce FBs helm opens (need fbs > own casts)',
      ).toBeGreaterThan(own);
      expect(maxAmmo.length).toBe(fbs);
      expect(maxAmmo.length).toBeGreaterThan(own);
    });
    it('the buff frames coincide exactly with the Full Burst openings', () => {
      expect(maxAmmo.map((b) => b.frame)).toEqual(
        fbStarts(base.events).map((f) => f.frame),
      );
    });
    it('DISCRIMINATING: a burstCast trigger would apply it only on her own casts', () => {
      expect(sbsBuff(s2OnCast.events, 'maxAmmoPct').length).toBe(
        sbsCasts(s2OnCast.events).length,
      );
      expect(sbsBuff(s2OnCast.events, 'maxAmmoPct').length).toBeLessThan(
        fbStarts(s2OnCast.events).length,
      );
    });
  });

  describe('B6 — S2 grants Max Ammo ▲60% for 10 sec, self-scoped', () => {
    const maxAmmo = sbsBuff(base.events, 'maxAmmoPct');
    it('is 60% for exactly 10s on herself', () => {
      expect(maxAmmo.length).toBeGreaterThan(0);
      expect([...new Set(maxAmmo.map((b) => b.value))]).toEqual([60]);
      expect([
        ...new Set(maxAmmo.map((b) => b.expiresFrame! - b.frame)),
      ]).toEqual([WINDOW]);
      expect([...new Set(maxAmmo.map((b) => b.targetIdx))]).toEqual([SBS]);
    });
  });

  describe('B7 — S2 reloads 100% of the magazine into the BOOSTED cap (instantReload)', () => {
    it('encodes an instantReload of fraction 1 alongside the maxAmmo buff', () => {
      // The engine snaps ammo silently (sim.ts:2105 emits NO reload event), so the refill itself has
      // no log event; pinned structurally on the encoding, and behaviourally below via the realized
      // magazine. The reload is ordered AFTER the +60% cap, so it fills the BOOSTED magazine.
      const s2: any[] = (withPatchedOverride(SLUG, () => {}) as any).skill2;
      const reload = s2
        .flatMap((b: any) => b.effects)
        .find((e: any) => e.kind === 'instantReload');
      expect(reload, 'no instantReload effect on S2').toBeDefined();
      expect(reload.fraction ?? 1).toBe(1);
    });
    it('realizes a larger magazine than the no-effects baseline (cap + reload are live)', () => {
      // Scope-lock OL base5 grants a flat +3 magazine, so her unboosted magazine is 12 and the +60%
      // cap (which scales the base 9 only) raises it to round(9×1.6)+3 = 17. The exact peak is a
      // fixture detail; the RELATIONSHIP (effects raise the realized magazine) is the faithful pin.
      const peak = (evs: SimEvent[]) =>
        Math.max(...shots(evs).map((s) => s.ammoAfter));
      expect(peak(base.events)).toBeGreaterThan(peak(noAmmoFx.events));
    });
    it('buys more shots inside the Full Burst windows than the no-effects baseline', () => {
      const fbWindowShots = (evs: SimEvent[]) => {
        const sh = shots(evs);
        return fbStarts(evs).reduce(
          (n, fb) =>
            n +
            sh.filter((s) => s.frame >= fb.frame && s.frame < fb.frame + WINDOW)
              .length,
          0,
        );
      };
      expect(fbWindowShots(base.events)).toBeGreaterThan(
        fbWindowShots(noAmmoFx.events),
      );
    });
  });

  describe('B8 — burst grants ATK ▲115.12% for 10 sec on her OWN cast', () => {
    const atk = sbsBuff(base.events, 'atkPct');
    it('applies once per own burstCast (not per FB), 115.12% / 10s / self', () => {
      const own = sbsCasts(base.events).length;
      expect(atk.length).toBe(own);
      expect(atk.length).toBeLessThan(fbStarts(base.events).length);
      expect([...new Set(atk.map((b) => b.value))]).toEqual([115.12]);
      expect([...new Set(atk.map((b) => b.expiresFrame! - b.frame))]).toEqual([
        WINDOW,
      ]);
      expect([...new Set(atk.map((b) => b.targetIdx))]).toEqual([SBS]);
    });
    it('the buff frames coincide with her own burst casts', () => {
      expect(atk.map((b) => b.frame)).toEqual(
        sbsCasts(base.events).map((c) => c.frame),
      );
    });
  });

  describe('B9 — burst grants Charge Damage ▲169.63% for 10 sec on her OWN cast', () => {
    const cd = sbsBuff(base.events, 'chargeDamagePct');
    it('applies once per own burstCast, 169.63% / 10s / self', () => {
      expect(cd.length).toBe(sbsCasts(base.events).length);
      expect([...new Set(cd.map((b) => b.value))]).toEqual([169.63]);
      expect([...new Set(cd.map((b) => b.expiresFrame! - b.frame))]).toEqual([
        WINDOW,
      ]);
      expect([...new Set(cd.map((b) => b.targetIdx))]).toEqual([SBS]);
    });
  });

  describe('B10 — burst lowers the S1 charge-count threshold for 10s, gated on HER OWN cast', () => {
    it('the lowering produces more procs overall (procs cluster into burst windows)', () => {
      // Shipped (countInFb 1) fires far more S1 procs than the no-lowering model (countInFb 3).
      expect(s1Procs(base.events).length).toBeGreaterThan(
        s1Procs(noLowering.events).length,
      );
    });
    it('her OWN burst windows are dense; FB windows she did NOT cast stay at baseline', () => {
      const procs = s1Procs(base.events);
      const inWin = (from: number) =>
        procs.filter((p) => p.frame >= from && p.frame < from + WINDOW).length;
      // only windows fully inside the fight are measurable
      const ownWins = sbsCasts(base.events)
        .filter((c) => c.frame + WINDOW <= FIGHT_FRAMES)
        .map((c) => inWin(c.frame));
      const helmWins = helmOpenedFb(base.events)
        .filter((f) => f.frame + WINDOW <= FIGHT_FRAMES)
        .map((f) => inWin(f.frame));
      expect(
        ownWins.length,
        'no own burst has a full 10s window',
      ).toBeGreaterThan(0);
      expect(
        helmWins.length,
        'no helm-opened FB has a full 10s window',
      ).toBeGreaterThan(0);
      // The discrimination: every own-cast window out-procs every helm-opened window. A team-FB-window
      // gate would spike the helm-opened windows into the same band as her own.
      expect(
        Math.min(...ownWins),
        `own-cast windows ${ownWins} vs helm-opened ${helmWins}`,
      ).toBeGreaterThan(Math.max(...helmWins));
    });
  });
});
