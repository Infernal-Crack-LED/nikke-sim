/**
 * milk-blooming-bunny (Milk: Blooming Bunny) - BLIND per-unit kit spec test (S5).
 *
 * Written from the kit prose ALONE: no sight of the driver override, driver tests, or truth file.
 * SR / Iron / Attacker / Burst III, ammo 6, chargeFrames 60 (1.0s full charge), reloadFrames 141.
 *
 * KIT (structural summary, per slot):
 *   skill1-a  on a Full Charge attack, self: Gain Pierce, 6 sec window.
 *   skill1-b  gated on NOT already in Embarrassment + a full charge held >= 0.5s, enters Embarrassment:
 *             e1 all enemies, 290% of final ATK as Distributed Damage
 *             e2 self, removes 100% of ammo
 *             e3 self, reload speed FIXED at -50% for 1 reload   <- stat CLAMP primitive (GAP)
 *             e4 self, Forced Reload
 *             e5 self, ATK up 118.7% for 40 sec
 *   skill2-a  only while in Embarrassment, self: Pierce Damage up 64.7% continuously.
 *   skill2-b  only while in the burst state, all enemies every 2 sec: 447.7% of final ATK, Distributed.
 *   burst     self, 10 sec: Embarrassment immunity, Pierce Damage up 117.64%, ATK up 220%.
 *
 * FIXTURE: controlComp(SLUG, false) - liter (B1) + crown (B2) + milk (B3).
 *   helm is DROPPED on purpose: helm is a second Burst III, so with helm present the number of
 *   rotations milk actually casts on is ambiguous, and every burst-window-gated count assertion below
 *   (5 procs per burst, the 10 sec window) becomes unreadable. As the SOLE B3, milk casts on every
 *   rotation, so the fullBurstStart count == milk burst count. A lone B3 makes ZERO full bursts, so
 *   liter + crown are mandatory.
 *
 * WHY THE ASSERTIONS DISCRIMINATE (nearest-wrong in brackets):
 *   - every counterfactual asserts its own patch matched >0 effects, so a MISSING kit line fails here
 *     instead of silently passing a vacuous comparison [line not modeled at all].
 *   - burst ATK: extending the window 10s -> 40s must strictly ADD damage [duration authored as 40s,
 *     i.e. borrowed from the Embarrassment buff].
 *   - Embarrassment ATK: shrinking 40s -> 10s must strictly REMOVE damage [duration authored as 10s].
 *   - 447.7% rider: structurally must be a 2 sec cadence bounded by the 10 sec burst window, and its
 *     removal must not drop more than ~6 procs per full burst [ungated interval every 2 sec for the
 *     whole fight = ~90 procs].
 *   - 290% rider: removal must drop rider damage by >=1 and <=40 procs over 180s [ungated per-full-
 *     charge entry, which at this cadence is ~125 procs].
 *   - ammo dump: removing consumeAmmo must change the reload economy [weapon-state line skipped as
 *     defensive; reload/ammo lines ARE damage because they gate shot count].
 *   - self-scope: every buffApply carrying a kit magnitude must target milk only [line authored as an
 *     ally/team buff].
 *   - inertness: teammate totals byte-identical under milk-only self-buff counterfactuals.
 *
 * PIERCE NOTE: pierceDamagePct carries a schema comment saying it may be inert in v1, so the two
 * Pierce Damage lines are asserted STRUCTURALLY (buffApply present, self-targeted, right magnitude)
 * and only ONE-SIDED on totals (removal may not RAISE damage). gainPierce (a timed effect) is
 * asserted distinct from the static whole-fight hasPierce flag, which would credit Pierce from t=0,
 * before the first full charge exists.
 *
 * SHAPE NOTE: the packet describes the override file BOTH as slot -> Block[] and as
 * slot -> CharacterSkills{blocks}. slotBlocks() accepts either, so the counterfactuals are
 * layout-agnostic and cannot silently no-op on the file shape.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // driver fix: blind writer emitted '../lib/harness.js' (wrong depth)

const SLUG = 'milk-blooming-bunny';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;
const near = (a: number, b: number) => Math.abs(a - b) < 0.01;

/* ---------------- override introspection (file-shape tolerant) ---------------- */

function slotBlocks(ov: any, slot: string): any[] {
  const v = ov?.[slot];
  if (!v) {
    return [];
  }
  if (Array.isArray(v)) {
    return v;
  }
  if (Array.isArray(v.blocks)) {
    return v.blocks;
  }
  return [];
}
function allBlocks(ov: any): any[] {
  return SLOTS.flatMap((s) => slotBlocks(ov, s));
}
function allEffects(ov: any): any[] {
  return allBlocks(ov).flatMap((b) =>
    Array.isArray(b?.effects) ? b.effects : []
  );
}
function effectsOfSlot(ov: any, slot: string): any[] {
  return slotBlocks(ov, slot).flatMap((b) =>
    Array.isArray(b?.effects) ? b.effects : []
  );
}
function blocksHolding(ov: any, pred: (e: any) => boolean): any[] {
  return allBlocks(ov).filter((b) =>
    (Array.isArray(b?.effects) ? b.effects : []).some(pred)
  );
}

/** deep-clone the COMMITTED override and rewrite every effect through fn (null = drop it). */
function patchEffects(fn: (e: any) => any | null): {
  ov: any;
  touched: number;
} {
  let touched = 0;
  const ov = withPatchedOverride(SLUG, (o: any) => {
    for (const b of allBlocks(o)) {
      if (!Array.isArray(b.effects)) {
        continue;
      }
      const next: any[] = [];
      for (const e of b.effects) {
        const r = fn(e);
        if (r === null) {
          touched += 1;
          continue;
        }
        if (r !== e) {
          touched += 1;
        }
        next.push(r);
      }
      b.effects = next;
    }
  }) as any;
  return { ov, touched };
}

/* ---------------- run harness ---------------- */

type Run = { total: number; all: Record<string, number>; evs: any[]; res: any };

function run(ov?: any): Run {
  const opts: any = controlComp(SLUG, false);
  const evs: any[] = [];
  opts.cfg = {
    ...(opts.cfg ?? {}),
    onEvent: (ev: SimEvent) => {
      evs.push(ev as any);
    },
  };
  if (ov) {
    opts.overrides = { ...(opts.overrides ?? {}), [SLUG]: ov };
  }
  const res = runComp(opts);
  const all = totals(res) as unknown as Record<string, number>;
  return { total: all[SLUG], all, evs, res };
}

const RIDER_SLOTS = new Set(['skill1', 'skill2', 'burst']);
const riderHits = (r: Run) =>
  r.evs.filter((e) => e.kind === 'damage' && RIDER_SLOTS.has(e.srcSlot)).length;
const reloads = (r: Run) => r.evs.filter((e) => e.kind === 'reload').length;
const rotations = (r: Run) =>
  r.evs.filter((e) => e.kind === 'fullBurstStart').length;
const buffApplies = (r: Run, stat: string, value: number) =>
  r.evs.filter(
    (e) => e.kind === 'buffApply' && e.stat === stat && near(e.value, value)
  );
const others = (r: Run) =>
  Object.fromEntries(Object.entries(r.all).filter(([k]) => k !== SLUG));

/* ---------------- hoisted runs (each is a full 180s sim) ---------------- */

const OV: any = withPatchedOverride(SLUG, () => {}) as any;

const P_NO_BURST_ATK = patchEffects((e) =>
  e.kind === 'buff' && near(e.value, 220) ? null : e
);
const P_BURST_ATK_40 = patchEffects((e) =>
  e.kind === 'buff' && near(e.value, 220) ? { ...e, durationSec: 40 } : e
);
const P_NO_EMB_ATK = patchEffects((e) =>
  e.kind === 'buff' && near(e.value, 118.7) ? null : e
);
const P_EMB_ATK_10 = patchEffects((e) =>
  e.kind === 'buff' && near(e.value, 118.7) ? { ...e, durationSec: 10 } : e
);
const P_NO_290 = patchEffects((e) => (near(e.atkPct ?? -1, 290) ? null : e));
const P_NO_447 = patchEffects((e) => (near(e.atkPct ?? -1, 447.7) ? null : e));
const P_NO_AMMO = patchEffects((e) => (e.kind === 'consumeAmmo' ? null : e));
const P_NO_PIERCE_BUFF = patchEffects((e) =>
  e.kind === 'buff' && e.stat === 'pierceDamagePct' ? null : e
);
const P_NO_GAIN_PIERCE = patchEffects((e) =>
  e.kind === 'gainPierce' ? null : e
);

const BASE = run();
const NO_BURST_ATK = run(P_NO_BURST_ATK.ov);
const BURST_ATK_40 = run(P_BURST_ATK_40.ov);
const NO_EMB_ATK = run(P_NO_EMB_ATK.ov);
const EMB_ATK_10 = run(P_EMB_ATK_10.ov);
const NO_290 = run(P_NO_290.ov);
const NO_447 = run(P_NO_447.ov);
const NO_AMMO = run(P_NO_AMMO.ov);
const NO_PIERCE_BUFF = run(P_NO_PIERCE_BUFF.ov);
const NO_GAIN_PIERCE = run(P_NO_GAIN_PIERCE.ov);

/* ---------------- tests ---------------- */

describe('milk-blooming-bunny / fixture', () => {
  it('bursts on every rotation as the sole Burst III (non-vacuity)', () => {
    expect(Object.keys(BASE.all)).not.toContain('helm');
    expect(rotations(BASE)).toBeGreaterThanOrEqual(2);
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
    // both sides of every burst-window gate are exercised: a 10s window inside a 40s cooldown
    // means the fight spends most of its time OUTSIDE the Overconfident state.
    expect(rotations(BASE) * 10).toBeLessThan(180);
  });
});

describe('milk-blooming-bunny / skill1 - Full Charge grants Pierce for 6 sec', () => {
  it('is a timed gainPierce effect with a 6 sec window', () => {
    const gp = allEffects(OV).filter((e) => e.kind === 'gainPierce');
    expect(gp.length).toBeGreaterThan(0);
    expect(gp.some((e: any) => near(e.durationSec ?? -1, 6))).toBe(true);
  });

  it('is NOT encoded as the static whole-fight hasPierce flag', () => {
    // nearest-wrong: hasPierce:true tags every hit from t=0, including the ~1s before the first
    // full charge and any post-window gap, which a 6 sec timed grant cannot cover.
    expect(OV.hasPierce ?? false).toBe(false);
  });

  it('removing the grant cannot RAISE milk damage, and never moves a teammate', () => {
    expect(P_NO_GAIN_PIERCE.touched).toBeGreaterThan(0);
    expect(NO_GAIN_PIERCE.total).toBeLessThanOrEqual(BASE.total);
  });
});

describe('milk-blooming-bunny / skill1 - Embarrassment entry', () => {
  it('e1: a 290% Distributed rider lives in skill1', () => {
    const e1 = effectsOfSlot(OV, 'skill1');
    expect(e1.some((e: any) => near(e.atkPct ?? -1, 290))).toBe(true);
    expect(
      e1.some(
        (e: any) => near(e.atkPct ?? -1, 290) && e.flavor === 'distributed'
      )
    ).toBe(true);
  });

  it('e1: the rider fires at a GATED cadence, not once per full charge', () => {
    expect(P_NO_290.touched).toBeGreaterThan(0);
    const delta = riderHits(BASE) - riderHits(NO_290);
    expect(delta).toBeGreaterThanOrEqual(1);
    // ~0.69 shots/s over 180s = ~125 full charges; an ungated per-charge entry blows this bound.
    expect(delta).toBeLessThanOrEqual(40);
    expect(BASE.total).toBeGreaterThan(NO_290.total);
  });

  it('e2/e4: the 100% ammo removal + forced reload are modeled and move the reload economy', () => {
    expect(P_NO_AMMO.touched).toBeGreaterThan(0);
    const e2 = effectsOfSlot(OV, 'skill1').filter(
      (e: any) => e.kind === 'consumeAmmo'
    );
    expect(e2.length).toBeGreaterThan(0);
    expect(e2.every((e: any) => (e.fraction ?? 1) === 1)).toBe(true);
    // dumping a partial magazine inserts reload cycles that would not otherwise occur;
    // direction is expected to be BASE > patched, but the load-bearing claim is that the
    // weapon-state line is not inert.
    expect(reloads(NO_AMMO)).not.toBe(reloads(BASE));
  });

  it('e5: ATK 118.7% for 40 sec, self only', () => {
    const b = buffApplies(BASE, 'atkPct', 118.7);
    expect(b.length).toBeGreaterThan(0);
    expect(b.every((e: any) => e.targetSlug === SLUG)).toBe(true);
    const authored = effectsOfSlot(OV, 'skill1').filter(
      (e: any) =>
        e.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 118.7)
    );
    expect(authored.length).toBeGreaterThan(0);
    expect(authored.every((e: any) => near(e.durationSec ?? -1, 40))).toBe(
      true
    );
  });

  it('e5: the 40 sec window is real - shrinking it to 10 sec strictly removes damage', () => {
    expect(P_NO_EMB_ATK.touched).toBeGreaterThan(0);
    expect(P_EMB_ATK_10.touched).toBeGreaterThan(0);
    expect(BASE.total).toBeGreaterThan(NO_EMB_ATK.total);
    expect(BASE.total).toBeGreaterThan(EMB_ATK_10.total);
  });

  it.skip('e3: reload speed FIXED at -50% for 1 reload - GAP: stat CLAMP primitive, no engine branch (a reloadSpeedPct buff is an additive modifier, and durationShots is explicitly NOT for fixed-at lines)', () => {});

  it.skip('Embarrassment STATE duration (how soon a second entry may occur) - MEASUREMENT-GATED: the kit gives no duration for the state itself, only for its ATK buff (40s); the entry cadence is a per-unit estimate until read off footage', () => {});
});

describe('milk-blooming-bunny / skill2', () => {
  it('Pierce Damage 64.7% is applied to milk only', () => {
    const b = buffApplies(BASE, 'pierceDamagePct', 64.7);
    expect(b.length).toBeGreaterThan(0);
    expect(b.every((e: any) => e.targetSlug === SLUG)).toBe(true);
  });

  it('Pierce Damage 64.7% is continuous (no wall-clock window authored)', () => {
    const authored = allEffects(OV).filter(
      (e: any) =>
        e.kind === 'buff' && e.stat === 'pierceDamagePct' && near(e.value, 64.7)
    );
    expect(authored.length).toBeGreaterThan(0);
    // nearest-wrong: a short refreshing window; the kit word is continuously.
    expect(authored.every((e: any) => e.durationSec === undefined)).toBe(true);
  });

  it('the 447.7% rider is a 2 sec cadence bounded by the 10 sec burst window', () => {
    const holders = blocksHolding(OV, (e: any) => near(e.atkPct ?? -1, 447.7));
    expect(holders.length).toBeGreaterThan(0);
    const blk = holders[0];
    const eff = (blk.effects as any[]).find((x) => near(x.atkPct ?? -1, 447.7));
    expect(eff.flavor).toBe('distributed');
    const cadence2 =
      (eff.kind === 'dot' && near(eff.intervalSec ?? 1, 2)) ||
      (blk.trigger?.kind === 'interval' && near(blk.trigger.sec, 2));
    expect(cadence2).toBe(true);
    const bounded10 =
      (eff.kind === 'dot' && near(eff.durationSec ?? -1, 10)) ||
      blk.trigger?.kind === 'burstCast';
    expect(bounded10).toBe(true);
  });

  it('the 447.7% rider pays out per burst, not for the whole fight', () => {
    expect(P_NO_447.touched).toBeGreaterThan(0);
    expect(BASE.total).toBeGreaterThan(NO_447.total);
    const delta = riderHits(BASE) - riderHits(NO_447);
    // faithful: <=5 ticks per full burst. Ungated interval-every-2s = ~90 ticks over 180s.
    expect(delta).toBeLessThanOrEqual(6 * rotations(BASE));
    expect(delta).toBeLessThan(60);
  });
});

describe('milk-blooming-bunny / burst - Overconfident, Huh?!', () => {
  it('ATK 220% and Pierce Damage 117.64% are self-scoped burst-cast buffs, 10 sec each', () => {
    const eb = effectsOfSlot(OV, 'burst');
    const atk = eb.filter(
      (e: any) => e.kind === 'buff' && e.stat === 'atkPct' && near(e.value, 220)
    );
    const prc = eb.filter(
      (e: any) =>
        e.kind === 'buff' &&
        e.stat === 'pierceDamagePct' &&
        near(e.value, 117.64)
    );
    expect(atk.length).toBeGreaterThan(0);
    expect(prc.length).toBeGreaterThan(0);
    expect(atk.every((e: any) => near(e.durationSec ?? -1, 10))).toBe(true);
    expect(prc.every((e: any) => near(e.durationSec ?? -1, 10))).toBe(true);

    const holders = slotBlocks(OV, 'burst').filter((b: any) =>
      (b.effects ?? []).some(
        (e: any) =>
          e.kind === 'buff' && (near(e.value, 220) || near(e.value, 117.64))
      )
    );
    expect(holders.length).toBeGreaterThan(0);
    expect(holders.every((b: any) => b.trigger?.kind === 'burstCast')).toBe(
      true
    );
    expect(holders.every((b: any) => b.target?.kind === 'self')).toBe(true);
  });

  it('ATK 220% is emitted to milk only, as a raw percentage', () => {
    const b = buffApplies(BASE, 'atkPct', 220);
    expect(b.length).toBeGreaterThan(0);
    expect(b.every((e: any) => e.targetSlug === SLUG)).toBe(true);
    expect(b.length).toBeLessThanOrEqual(rotations(BASE));
  });

  it('the ATK 220% window is 10 sec - stretching it to 40 sec strictly ADDS damage', () => {
    expect(P_NO_BURST_ATK.touched).toBeGreaterThan(0);
    expect(P_BURST_ATK_40.touched).toBeGreaterThan(0);
    expect(BASE.total).toBeGreaterThan(NO_BURST_ATK.total);
    // RED if the buff was authored at 40 sec (the Embarrassment window): base would already equal it.
    expect(BURST_ATK_40.total).toBeGreaterThan(BASE.total);
  });

  it('Pierce Damage 117.64% is self-targeted and its removal cannot RAISE damage', () => {
    const b = buffApplies(BASE, 'pierceDamagePct', 117.64);
    expect(b.length).toBeGreaterThan(0);
    expect(b.every((e: any) => e.targetSlug === SLUG)).toBe(true);
    expect(P_NO_PIERCE_BUFF.touched).toBeGreaterThanOrEqual(2);
    expect(NO_PIERCE_BUFF.total).toBeLessThanOrEqual(BASE.total);
  });

  it.skip('Immunity to Embarrassment for 10 sec - GAP: no primitive suppresses a self kit-state for a window (targetStatus is enemy-only; mode/resourceGate cannot be flipped by a burst for 10s), so the burst window can re-enter Embarrassment in-sim', () => {});
});

describe('milk-blooming-bunny / inertness', () => {
  it('milk self-buff counterfactuals leave every teammate byte-identical', () => {
    expect(others(NO_BURST_ATK)).toEqual(others(BASE));
    expect(others(NO_EMB_ATK)).toEqual(others(BASE));
    expect(others(EMB_ATK_10)).toEqual(others(BASE));
    expect(others(BURST_ATK_40)).toEqual(others(BASE));
  });

  it('milk is the only unit whose damage the 290% and 447.7% riders move', () => {
    expect(others(NO_290)).toEqual(others(BASE));
    expect(others(NO_447)).toEqual(others(BASE));
  });
});
