/**
 * viper (Viper) — SG / Water / Attacker / Burst II — BLIND per-unit kit spec test.
 * Written from the kit prose ALONE (S5 cross-family post-op role); the driver's test, override and
 * reasoning were not consulted.
 *
 * KIT, READ LITERALLY
 * -------------------
 * skill1 B1  'Activates when the stage target appears. Affects all allies.'
 *              ATK 25.98% for 10 sec / Hit Rate 11.13% for 10 sec.
 *            => a ONE-SHOT team window at battle start. Not permanent, not self-only.
 * skill1 B2  'Only activates when attacking in Vamp status. Affects self.'
 *              Sustained Damage 4.4% and Hit Rate 1.84%, each 'Stacks up to 10 times and lasts for
 *              10 sec' => per-attack SELF stacks, hard cap 10, GATED on holding Vamp.
 * skill2 B1  'Affects self. Hit Rate 21.96% continuously.' => permanent self buff, no expiry.
 * skill2 B2  'Activates when entering Full Burst. Affects self.' Vamp (untargetable, removed upon a
 *              direct hit) + Invulnerable 1 sec. Both are defensive => GAP in v1 (the boss deals no
 *              damage). The DAMAGE-RELEVANT consequence is the gate above: Vamp is acquired at the
 *              FIRST Full Burst entry and, since nothing can land a direct hit, is then held for the
 *              rest of the fight — so skill1 B2 is DEAD before the first Full Burst and LIVE after
 *              it, INCLUDING outside Full Burst. No self-status primitive is needed to express that:
 *              a resource pool (initial 0, +1 on fullBurstEnter, shot-trigger resourceGate min 1)
 *              encodes exactly this shape.
 * skill2 B3  'Activates when using Burst Skill. Affects all allies. Re-enters Burst Stage 2.'
 *            => own burstCast trigger + reenterStage 2 (a second Burst II ally may also cast).
 *              Trigger identity matters: keying this to fullBurstEnter would fire it on ANY team
 *              Full Burst, including rotations viper never bursts in.
 * burst  B1  1029.6% of final ATK to 1 designated enemy — instant, resolves AT CAST, i.e. before the
 *              Full Burst window opens => it never takes the +50% Full-Burst major.
 * burst  B2  DEF 19.83% down for 10 sec on the stage target => a BOSS-held debuff: it lifts the
 *              WHOLE team's damage, not viper's alone.
 * burst  B3  105.3% of final ATK as SUSTAINED damage every 1 sec for 10 sec => the consumer of the
 *              Sustained Damage stacks; one DoT instance per cast, duration exactly the stated 10 s.
 *
 * FIXTURE — controlComp('viper', true): liter (B1) + crown (B2) + viper + helm (B3). viper is
 * Burst II, so the fixed B3 slot is REQUIRED: without it the chain never reaches stage 3, no Full
 * Burst ever starts, and the entire Vamp-gated half of her kit would be untestable (vacuous). The
 * second Burst II in the fixture (crown) is also what makes 'Re-enters Burst Stage 2' observable.
 *
 * METHOD — every magnitude claim is a COUNTERFACTUAL DELTA against the same fixture
 * (withPatchedOverride), so teammate auras cannot confound it, and every counterfactual asserts its
 * mutation actually hit an effect (a no-op patch would silently test nothing). Counterfactual
 * predicates match on VALUE, not on stat name, so the deltas survive a different-but-still-faithful
 * stat encoding; the event assertions are what police the encoding itself.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

const SLUG = 'viper';
const S1_ATK = 25.98;
const S1_HR = 11.13;
const VAMP_SUS = 4.4;
const VAMP_HR = 1.84;
const VAMP_STACKS = 10;
const S2_HR = 21.96;
const NUKE = 1029.6;
const DEF_DOWN = 19.83;
const DOT = 105.3;
const FPS = 60;

type Eff = {
  kind: string;
  stat?: string;
  value?: number;
  atkPct?: number;
  durationSec?: number;
  intervalSec?: number;
  maxStacks?: number;
  flavor?: string;
  noFb?: boolean;
  stage?: number;
};
type Blk = {
  trigger?: { kind?: string };
  target?: { kind?: string };
  effects?: Eff[];
};
type Ov = Record<string, unknown>;
type Comp = ReturnType<typeof controlComp>;
type BuffEv = {
  kind: string;
  stat?: string;
  value?: number;
  stacks?: number;
  maxStacks?: number;
  casterIdx?: number | null;
  targetIdx?: number | null;
  targetSlug?: string | null;
  expiresFrame?: number | null;
};

const SLOTS = ['skill1', 'skill2', 'burst'] as const;
const near = (a: number | undefined | null, b: number) =>
  a !== undefined && a !== null && Math.abs(a - b) < 1e-6;

/** The override FILE is slot-keyed; tolerate both `slot: Block[]` and `slot: { blocks: Block[] }`. */
function blocksOf(ov: Ov, slot: string): Blk[] {
  const raw = ov[slot];
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw as Blk[];
  }
  const nested = (raw as { blocks?: Blk[] }).blocks;
  return Array.isArray(nested) ? nested : [];
}
const allBlocks = (ov: Ov): Blk[] => SLOTS.flatMap((s) => blocksOf(ov, s));
const findEffects = (ov: Ov, pred: (e: Eff) => boolean): Eff[] =>
  allBlocks(ov).flatMap((b) => (b.effects ?? []).filter(pred));
const blocksWith = (ov: Ov, pred: (e: Eff) => boolean): Blk[] =>
  allBlocks(ov).filter((b) => (b.effects ?? []).some(pred));
function dropEffects(ov: Ov, pred: (e: Eff) => boolean): number {
  let n = 0;
  for (const b of allBlocks(ov)) {
    const before = (b.effects ?? []).length;
    b.effects = (b.effects ?? []).filter((e) => !pred(e));
    n += before - b.effects.length;
  }
  return n;
}
function editEffects(
  ov: Ov,
  pred: (e: Eff) => boolean,
  fn: (e: Eff) => void
): number {
  let n = 0;
  for (const b of allBlocks(ov)) {
    for (const e of b.effects ?? []) {
      if (pred(e)) {
        fn(e);
        n += 1;
      }
    }
  }
  return n;
}
function clearSlot(ov: Ov, slot: string): void {
  const raw = ov[slot];
  if (
    raw &&
    !Array.isArray(raw) &&
    Array.isArray((raw as { blocks?: Blk[] }).blocks)
  ) {
    (raw as { blocks: Blk[] }).blocks = [];
  } else {
    ov[slot] = [];
  }
}
const buffOfValue = (v: number) => (e: Eff) =>
  e.kind === 'buff' && near(e.value, v);

/** Unmutated clone of the shipped override — for structural (encoding) assertions. */
const SHIPPED = withPatchedOverride(SLUG, () => {}) as unknown as Ov;

const hits: Record<string, number> = {};
function patched(name: string, mutate: (ov: Ov) => number) {
  return withPatchedOverride(SLUG, (ov) => {
    hits[name] = mutate(ov as unknown as Ov);
  });
}
function comp(patch?: unknown): Comp {
  const base = controlComp(SLUG, true) as Comp & {
    overrides?: Record<string, unknown>;
  };
  if (patch === undefined) {
    return base as Comp;
  }
  return {
    ...base,
    overrides: { ...(base.overrides ?? {}), [SLUG]: patch },
  } as Comp;
}
function run(opts: Comp) {
  const events: SimEvent[] = [];
  const o = opts as Comp & { cfg?: Record<string, unknown> };
  const res = runComp({
    ...o,
    cfg: { ...(o.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev) },
  } as Comp);
  return { res, events, tot: totals(res) };
}

const evKind = (e: SimEvent) => (e as unknown as BuffEv).kind;
const buffEvents = (evs: SimEvent[]): BuffEv[] =>
  evs.filter((e) => evKind(e) === 'buffApply') as unknown as BuffEv[];
const byValue = (evs: SimEvent[], v: number): BuffEv[] =>
  buffEvents(evs).filter((b) => near(b.value, v));
const kindIdx = (evs: SimEvent[], kind: string) =>
  evs.findIndex((e) => evKind(e) === kind);
const idxsOf = (evs: SimEvent[], kind: string) =>
  evs.map((e, i) => (evKind(e) === kind ? i : -1)).filter((i) => i >= 0);
const isVampSusApply = (e: SimEvent) => {
  const b = e as unknown as BuffEv;
  return b.kind === 'buffApply' && near(b.value, VAMP_SUS);
};
const relDiff = (a: number, b: number) =>
  Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1);
const others = (t: Record<string, number>) =>
  Object.keys(t).filter((s) => s !== SLUG);
const sumAll = (t: Record<string, number>) =>
  Object.values(t).reduce((a, b) => a + b, 0);

// ---- hoisted runs (each is a full 180 s sim) --------------------------------------------------
const BASE = run(comp());
const NO_TEAM_WINDOW = run(
  comp(
    patched('teamWindow', (ov) =>
      dropEffects(ov, (e) => buffOfValue(S1_ATK)(e) || buffOfValue(S1_HR)(e))
    )
  )
);
const TEAM_WINDOW_PERMANENT = run(
  comp(
    patched('teamPermanent', (ov) =>
      editEffects(
        ov,
        (e) => buffOfValue(S1_ATK)(e) || buffOfValue(S1_HR)(e),
        (e) => {
          e.durationSec = 9999;
        }
      )
    )
  )
);
const NO_VAMP_STACKS = run(
  comp(
    patched('vampOff', (ov) =>
      dropEffects(
        ov,
        (e) => buffOfValue(VAMP_SUS)(e) || buffOfValue(VAMP_HR)(e)
      )
    )
  )
);
const VAMP_UNCAPPED = run(
  comp(
    patched('vampUncapped', (ov) =>
      editEffects(
        ov,
        (e) => buffOfValue(VAMP_SUS)(e) || buffOfValue(VAMP_HR)(e),
        (e) => {
          e.maxStacks = 100;
        }
      )
    )
  )
);
const NO_S2_HR = run(
  comp(patched('s2HrOff', (ov) => dropEffects(ov, buffOfValue(S2_HR))))
);
const NO_REENTER = run(
  comp(
    patched('reenterOff', (ov) =>
      dropEffects(ov, (e) => e.kind === 'reenterStage')
    )
  )
);
const NO_BURST = run(
  comp(
    patched('burstEmpty', (ov) => {
      clearSlot(ov, 'burst');
      return 1;
    })
  )
);
const NO_NUKE = run(
  comp(
    patched('nukeOff', (ov) => dropEffects(ov, (e) => e.kind === 'flatDamage'))
  )
);
const NUKE_NOFB = run(
  comp(
    patched('nukeNoFb', (ov) =>
      editEffects(
        ov,
        (e) => e.kind === 'flatDamage',
        (e) => {
          e.noFb = true;
        }
      )
    )
  )
);
const NO_DOT = run(
  comp(patched('dotOff', (ov) => dropEffects(ov, (e) => e.kind === 'dot')))
);
const DOT_LONG = run(
  comp(
    patched('dotLong', (ov) =>
      editEffects(
        ov,
        (e) => e.kind === 'dot',
        (e) => {
          e.durationSec = 30;
        }
      )
    )
  )
);
const SUS_X10 = run(
  comp(
    patched('susX10', (ov) =>
      editEffects(ov, buffOfValue(VAMP_SUS), (e) => {
        e.value = VAMP_SUS * 10;
      })
    )
  )
);
const NO_DOT_SUS_X10 = run(
  comp(
    patched(
      'dotOffSusX10',
      (ov) =>
        dropEffects(ov, (e) => e.kind === 'dot') +
        editEffects(ov, buffOfValue(VAMP_SUS), (e) => {
          e.value = VAMP_SUS * 10;
        })
    )
  )
);

describe('viper skill1 B1 — stage-target team window (all allies, 10 sec)', () => {
  it('ATK 25.98% reaches EVERY ally exactly once (target set: all allies, incl. self)', () => {
    // Nearest-wrong: self-only (1 event) or enemy-scoped (targetSlug null).
    const evs = byValue(BASE.events, S1_ATK);
    const unitCount = Object.keys(BASE.tot).length;
    expect(unitCount).toBeGreaterThan(1);
    expect(evs.length).toBe(unitCount);
    expect(new Set(evs.map((e) => e.targetSlug)).size).toBe(unitCount);
    expect(evs.map((e) => e.targetSlug)).toContain(SLUG);
    for (const e of evs) {
      expect(e.stat).toBe('atkPct');
      expect(e.targetSlug).toBeTruthy();
    }
  });

  it('Hit Rate 11.13% reaches every ally the same way', () => {
    const evs = byValue(BASE.events, S1_HR);
    expect(evs.length).toBe(Object.keys(BASE.tot).length);
    for (const e of evs) {
      expect(e.stat).toBe('hitRatePct');
      expect(e.targetSlug).toBeTruthy();
    }
  });

  it('the window really is 10 sec, not a permanent aura (duration semantics)', () => {
    // Every application expires inside the opening ~11 s; a permanent encoding would have no/huge
    // expiry. The counterfactual makes it permanent and the whole team gains damage => the 10 s
    // bound is load-bearing, not decorative.
    for (const e of [
      ...byValue(BASE.events, S1_ATK),
      ...byValue(BASE.events, S1_HR),
    ]) {
      const exp = e.expiresFrame ?? Number.POSITIVE_INFINITY;
      expect(exp).toBeGreaterThan(0);
      expect(exp).toBeLessThanOrEqual(11 * FPS);
    }
    expect(hits.teamPermanent).toBeGreaterThanOrEqual(2);
    expect(sumAll(TEAM_WINDOW_PERMANENT.tot)).toBeGreaterThan(
      sumAll(BASE.tot) * 1.001
    );
  });

  it('the window lifts the WHOLE team, not just viper', () => {
    expect(hits.teamWindow).toBeGreaterThanOrEqual(2);
    expect(BASE.tot[SLUG]).toBeGreaterThan(NO_TEAM_WINDOW.tot[SLUG]);
    for (const s of others(BASE.tot)) {
      expect(BASE.tot[s]).toBeGreaterThan(NO_TEAM_WINDOW.tot[s]);
    }
  });
});

describe('viper skill1 B2 — Vamp-gated self stacks (10 stacks, 10 sec)', () => {
  it('Sustained Damage 4.4% is a SELF stack capped at 10 and it reaches the cap', () => {
    const evs = byValue(BASE.events, VAMP_SUS);
    expect(evs.length).toBeGreaterThan(0);
    for (const e of evs) {
      expect(e.stat).toBe('sustainedDamagePct');
      expect(e.targetSlug).toBe(SLUG); // self only — nearest-wrong: allies
      expect(e.maxStacks).toBe(VAMP_STACKS);
    }
    expect(Math.max(...evs.map((e) => e.stacks ?? 0))).toBe(VAMP_STACKS);
  });

  it('Hit Rate 1.84% is the same self stack (10 max)', () => {
    const evs = byValue(BASE.events, VAMP_HR);
    expect(evs.length).toBeGreaterThan(0);
    for (const e of evs) {
      expect(e.stat).toBe('hitRatePct');
      expect(e.targetSlug).toBe(SLUG);
      expect(e.maxStacks).toBe(VAMP_STACKS);
    }
  });

  it('the stacks are GATED on Vamp: none exist before the first Full Burst entry', () => {
    // Vamp is granted on entering Full Burst (skill2). Nearest-wrong: an ungated per-shot stack,
    // which would apply from t=0. Non-vacuity: shots DO occur before the first Full Burst, so the
    // wrong model would visibly stack there.
    const fbIdx = kindIdx(BASE.events, 'fullBurstStart');
    expect(fbIdx).toBeGreaterThan(-1);
    const shotIdx = kindIdx(BASE.events, 'shot');
    expect(shotIdx).toBeGreaterThanOrEqual(0);
    expect(shotIdx).toBeLessThan(fbIdx);
    const firstStack = BASE.events.findIndex(isVampSusApply);
    expect(firstStack).toBeGreaterThan(fbIdx);
  });

  it('Vamp persists AFTER the Full Burst window closes (not an in-Full-Burst-only gate)', () => {
    // Vamp is 'continuously' held and is only removed by a direct hit, which cannot happen in v1.
    // Nearest-wrong: fbGate 'inFb', which would produce zero stack applies between windows.
    const fbEnds = idxsOf(BASE.events, 'fullBurstEnd');
    const fbStarts = idxsOf(BASE.events, 'fullBurstStart');
    expect(fbEnds.length).toBeGreaterThan(0);
    const gapEnd = fbStarts.find((i) => i > fbEnds[0]) ?? BASE.events.length;
    const gap = BASE.events.slice(fbEnds[0] + 1, gapEnd);
    expect(gap.some((e) => evKind(e) === 'shot')).toBe(true); // non-vacuity: she attacks in the gap
    expect(gap.some(isVampSusApply)).toBe(true);
  });

  it('the 10-stack cap binds (an uncapped model over-credits)', () => {
    expect(hits.vampUncapped).toBeGreaterThanOrEqual(2);
    expect(VAMP_UNCAPPED.tot[SLUG]).toBeGreaterThan(BASE.tot[SLUG]);
  });

  it('the stacks are self-scoped: removing them costs viper damage and moves NO teammate', () => {
    expect(hits.vampOff).toBeGreaterThanOrEqual(2);
    expect(BASE.tot[SLUG]).toBeGreaterThan(NO_VAMP_STACKS.tot[SLUG]);
    for (const s of others(BASE.tot)) {
      expect(relDiff(BASE.tot[s], NO_VAMP_STACKS.tot[s])).toBeLessThan(1e-9);
    }
  });

  it('Sustained Damage is SCOPED to sustained damage, not a generic Damage Up', () => {
    // x10 the buff: with the DoT present viper gains; with the DoT removed the same x10 must be
    // perfectly inert. Nearest-wrong: encoded as attackDamagePct/trueDamagePct, which would still
    // move her normal-attack damage in the DoT-less run.
    expect(SUS_X10.tot[SLUG]).toBeGreaterThan(BASE.tot[SLUG]);
    expect(hits.dotOffSusX10).toBeGreaterThanOrEqual(2);
    expect(relDiff(NO_DOT_SUS_X10.tot[SLUG], NO_DOT.tot[SLUG])).toBeLessThan(
      1e-9
    );
  });
});

describe('viper skill2 B1 — continuous self Hit Rate 21.96%', () => {
  it('is a permanent SELF buff with no 10-sec-style expiry', () => {
    const evs = byValue(BASE.events, S2_HR);
    expect(evs.length).toBeGreaterThanOrEqual(1);
    for (const e of evs) {
      expect(e.stat).toBe('hitRatePct');
      expect(e.targetSlug).toBe(SLUG);
      const exp = e.expiresFrame;
      expect(exp === undefined || exp === null || exp > 180 * FPS).toBe(true);
    }
  });

  it('is live: removing it costs viper damage (hit rate feeds the core lift) and moves no ally', () => {
    expect(hits.s2HrOff).toBeGreaterThanOrEqual(1);
    expect(BASE.tot[SLUG]).toBeGreaterThan(NO_S2_HR.tot[SLUG]);
    for (const s of others(BASE.tot)) {
      expect(relDiff(BASE.tot[s], NO_S2_HR.tot[s])).toBeLessThan(1e-9);
    }
  });
});

describe('viper skill2 B3 — Re-enters Burst Stage 2', () => {
  it('is encoded as reenterStage 2 on an OWN burst-cast trigger', () => {
    // Trigger identity: 'when using Burst Skill' = burstCast. Nearest-wrong: fullBurstEnter (fires
    // on any team Full Burst) or burstEligibility (a different primitive entirely).
    const eff = findEffects(SHIPPED, (e) => e.kind === 'reenterStage');
    expect(eff.length).toBe(1);
    expect(eff[0].stage).toBe(2);
    const blk = blocksWith(SHIPPED, (e) => e.kind === 'reenterStage')[0];
    expect(blk).toBeTruthy();
    expect(blk.trigger?.kind).toBe('burstCast');
  });

  it('is NOT inert: it adds burst casts in a two-Burst-II fixture', () => {
    expect(hits.reenterOff).toBe(1);
    const casts = (evs: SimEvent[]) =>
      evs.filter((e) => evKind(e) === 'burstCast').length;
    expect(casts(BASE.events)).toBeGreaterThanOrEqual(2);
    expect(casts(BASE.events)).toBeGreaterThan(casts(NO_REENTER.events));
  });
});

describe('viper burst', () => {
  it('viper actually casts her burst in this fixture (non-vacuity for every burst claim below)', () => {
    expect(BASE.tot[SLUG]).toBeGreaterThan(NO_BURST.tot[SLUG]);
  });

  it('1029.6% single-target hit is instant and Full-Burst-EXEMPT (it resolves at cast)', () => {
    const nuke = findEffects(
      SHIPPED,
      (e) => e.kind === 'flatDamage' && near(e.atkPct, NUKE)
    );
    expect(nuke.length).toBe(1);
    expect(hits.nukeOff).toBeGreaterThanOrEqual(1);
    expect(BASE.tot[SLUG]).toBeGreaterThan(NO_NUKE.tot[SLUG]);
    // Forcing noFb changes nothing => the cast never received the +50% Full-Burst major.
    // Nearest-wrong: the hit modelled at Full-Burst entry, where noFb would visibly cut it.
    expect(hits.nukeNoFb).toBeGreaterThanOrEqual(1);
    expect(relDiff(NUKE_NOFB.tot[SLUG], BASE.tot[SLUG])).toBeLessThan(1e-9);
  });

  it('105.3% sustained DoT every 1 sec for 10 sec — one instance per cast, duration read literally', () => {
    const dots = findEffects(SHIPPED, (e) => e.kind === 'dot');
    expect(dots.length).toBe(1); // one instance; a repeating trigger would multiply it
    expect(dots[0].atkPct).toBeCloseTo(DOT, 6);
    expect(dots[0].durationSec).toBe(10);
    expect(dots[0].intervalSec ?? 1).toBe(1);
    expect(dots[0].flavor).toBe('sustained');
    expect(hits.dotOff).toBeGreaterThanOrEqual(1);
    expect(BASE.tot[SLUG]).toBeGreaterThan(NO_DOT.tot[SLUG]);
    // 10 s is not a free parameter: stretching it to 30 s adds ticks and damage.
    expect(DOT_LONG.tot[SLUG]).toBeGreaterThan(BASE.tot[SLUG]);
  });

  it('DEF 19.83% down is a BOSS-held debuff, never an ally buff', () => {
    const d = byValue(BASE.events, DEF_DOWN);
    expect(d.length).toBeGreaterThanOrEqual(1);
    for (const e of d) {
      expect(e.casterIdx == null).toBe(true);
      expect(e.targetIdx == null).toBe(true);
      expect(e.stat).toBe('defPct');
    }
    expect(
      buffEvents(BASE.events).filter(
        (b) => near(b.value, DEF_DOWN) && b.targetSlug
      ).length
    ).toBe(0);
  });

  it('the DEF debuff lifts the WHOLE team, not just viper', () => {
    // NO_BURST strips the nuke + DoT (viper-only) AND the DEF debuff (team-wide); burst casting
    // itself is unaffected by emptying the slot, so any TEAMMATE delta is the debuff.
    // Nearest-wrong: a self-scoped or inert DEF encoding => teammates byte-identical.
    for (const s of others(BASE.tot)) {
      expect(BASE.tot[s]).toBeGreaterThan(NO_BURST.tot[s]);
    }
  });
});

describe('viper — GAP lines (no primitive / unobservable in v1)', () => {
  it.skip('skill2 Vamp: prevents being targeted by single-target attacks — GAP: the v1 boss deals no damage and there is no targeting model', () => {});
  it.skip('skill2 Vamp: removed upon taking a direct hit — GAP: no incoming-damage model, so Vamp is held for the rest of the fight once acquired', () => {});
  it.skip('skill2 Invulnerable for 1 sec — GAP: defensive, no HP pool', () => {});
  it.skip("burst 'Affects 1 designated enemy unit(s)' — GAP: v1 has exactly one enemy, so single-target scoping is unobservable", () => {});
  it.skip("burst 'if the enemy is the stage target' — GAP: the scope-lock boss IS the stage target, so the condition can never be falsified here", () => {});
});
