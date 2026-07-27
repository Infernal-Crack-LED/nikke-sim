/**
 * dorothy-serendipity — BLIND per-unit kit spec test (S5 post-op; written from kit prose alone).
 *
 * KIT (SG / Water / Attacker / Burst III, cd 40s, ammo 9, hitsPerShot 10, reload 111f):
 *   S1a  activates on hitting with 80 pellets  -> self: gain Pierce (3 rounds),
 *        Hit Rate +98.18% (3 rounds), Attack damage +72% (3 rounds),
 *        pellet count FIXED at 1 (3 rounds)
 *   S1b  activates on hitting with 160 pellets -> self: Pierce range +200% (3 rounds)
 *   S2a  start of battle                       -> self: Pierce damage +55.08% continuously
 *   S2b  only during Full Burst                -> self: ATK +75.24%, Hit Rate +40.68%
 *   B    self                                  -> Attack speed +65%, ATK +88.12%,
 *                                                 pellets +5, each for 15 sec
 *
 * FIXTURE: controlComp('dorothy-serendipity', true) = liter(B1) / crown(B2) / dorothy(B3) / helm(B3).
 *   A lone Burst III unit casts ZERO bursts, so B1+B2 are mandatory for the burst lines to fire at
 *   all. The second B3 (helm) is kept deliberately: it makes the burst-CAST vs full-burst-ENTER
 *   distinction non-vacuous, because she does not necessarily burst on every team Full Burst.
 *   Deterministic (no seed). 8 hoisted runs.
 *
 * DISCRIMINATION METHOD: every counterfactual is built with withPatchedOverride (committed JSON is
 *   untouched) and every patch helper RETURNS the number of effects it touched; each test asserts
 *   that count >= 1, so a patch that matched nothing fails LOUDLY instead of quietly testing nothing.
 *   That same assertion is what pins the magnitude/stat-key the kit line demands.
 *
 * SHAPE NOTE: the harness packet documents two conflicting OverrideFile shapes for a slot
 *   (slot -> Block[] vs slot -> { blocks: Block[] }). blocksOf() accepts BOTH, so the
 *   counterfactuals cannot silently degrade into no-ops on either shape.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'dorothy-serendipity';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;

type Ev = SimEvent & Record<string, any>;

const near = (a: unknown, b: number) =>
  typeof a === 'number' && Math.abs(a - b) < 1e-6;

function blocksOf(ov: any, slot: (typeof SLOTS)[number]): any[] {
  const s = ov?.[slot];
  if (!s) {return [];}
  if (Array.isArray(s)) {return s;}
  return Array.isArray(s.blocks) ? s.blocks : [];
}

function allBlocks(ov: any): any[] {
  return SLOTS.flatMap((s) => blocksOf(ov, s));
}

function allEffects(ov: any): any[] {
  const out: any[] = [];
  const walk = (es: any[]) => {
    for (const e of es ?? []) {
      out.push(e);
      if (Array.isArray(e?.steps)) {walk(e.steps);}
    }
  };
  for (const b of allBlocks(ov)) {walk(b?.effects);}
  return out;
}

/** zero (or re-value) every buff effect carrying `stat` at magnitude `from`; returns how many matched. */
function setBuff(ov: any, stat: string, from: number, to: number): number {
  let n = 0;
  for (const e of allEffects(ov)) {
    if (e?.kind === 'buff' && e.stat === stat && near(e.value, from)) {
      e.value = to;
      n += 1;
    }
  }
  return n;
}

/** the nearest-wrong duration model: re-read 'for N round(s)' as N wall-clock seconds. */
function roundsToSeconds(ov: any, rounds: number): number {
  let n = 0;
  for (const e of allEffects(ov)) {
    if (e?.kind === 'buff' && e.durationShots === rounds) {
      delete e.durationShots;
      e.durationSec = rounds;
      n += 1;
    }
  }
  return n;
}

/** the nearest-wrong trigger model: read '80 pellets' as 80/hitsPerShot = 8 ROUNDS. */
function retargetHitCount(ov: any, from: number, to: number): number {
  let n = 0;
  for (const b of allBlocks(ov)) {
    if (b?.trigger?.kind === 'hitCount' && b.trigger.count === from) {
      b.trigger.count = to;
      n += 1;
    }
  }
  return n;
}

function run(baseOpts: any, overrides?: Record<string, any>) {
  const evs: Ev[] = [];
  const opts: any = { ...baseOpts };
  if (overrides)
    {opts.overrides = { ...(baseOpts.overrides ?? {}), ...overrides };}
  opts.cfg = {
    ...(opts.cfg ?? {}),
    onEvent: (e: Ev) => {
      evs.push(e);
    },
  };
  const res = runComp(opts);
  return { res, evs, total: totals(res)[SLUG] };
}

/** indices of self-targeted buffApply events for (stat, value) — index order == sim order. */
const idxs = (evs: Ev[], stat: string, value: number): number[] =>
  evs
    .map((e, i) => ({ e, i }))
    .filter(
      ({ e }) =>
        e.kind === 'buffApply' &&
        e.stat === stat &&
        near(e.value, value) &&
        (e.targetSlug === undefined || e.targetSlug === SLUG)
    )
    .map(({ i }) => i);

const applies = (evs: Ev[], stat: string, value: number): Ev[] =>
  idxs(evs, stat, value).map((i) => evs[i]);

const lastIdxBefore = (evs: Ev[], idx: number, kind: string): number => {
  for (let i = idx - 1; i >= 0; i -= 1) {if (evs[i].kind === kind) {return i;}}
  return -1;
};

const others = (t: Record<string, number>) =>
  Object.fromEntries(Object.entries(t).filter(([k]) => k !== SLUG));

function shotCount(r: any, evs: Ev[]): number {
  const row: any = unitOf(r, SLUG);
  if (typeof row?.shots === 'number') {return row.shots;}
  return evs.filter(
    (e) => e.kind === 'shot' && (e.slug ?? e.unitSlug ?? e.targetSlug) === SLUG
  ).length;
}

/* ------------------------------------------------------------------ hoisted runs (8 x 180s) */

const BASE = controlComp(SLUG, true);

// structural snapshot of the committed override (deep clone; disk untouched)
let committed: any = null;
withPatchedOverride(SLUG, (ov: any) => {
  committed = ov;
});

const base = run(BASE);

let nAtkDmg = 0;
const ovNoAtkDmg = withPatchedOverride(SLUG, (ov: any) => {
  nAtkDmg = setBuff(ov, 'attackDamagePct', 72, 0);
});
const noAtkDmg = run(BASE, { [SLUG]: ovNoAtkDmg });

let nRounds = 0;
const ovSeconds = withPatchedOverride(SLUG, (ov: any) => {
  nRounds = roundsToSeconds(ov, 3);
});
const asSeconds = run(BASE, { [SLUG]: ovSeconds });

let nTrigger = 0;
const ovRoundsTrigger = withPatchedOverride(SLUG, (ov: any) => {
  nTrigger = retargetHitCount(ov, 80, 8);
});
const roundsTrigger = run(BASE, { [SLUG]: ovRoundsTrigger });

let nPellets = 0;
const ovNoPellets = withPatchedOverride(SLUG, (ov: any) => {
  nPellets = setBuff(ov, 'pelletCountFlat', 5, 0);
});
const noPellets = run(BASE, { [SLUG]: ovNoPellets });

let nSpeed = 0;
const ovNoSpeed = withPatchedOverride(SLUG, (ov: any) => {
  nSpeed = setBuff(ov, 'attackSpeedPct', 65, 0);
});
const noSpeed = run(BASE, { [SLUG]: ovNoSpeed });

let nPierceDmg = 0;
const ovNoPierceDmg = withPatchedOverride(SLUG, (ov: any) => {
  nPierceDmg = setBuff(ov, 'pierceDamagePct', 55.08, 0);
});
const noPierceDmg = run(BASE, { [SLUG]: ovNoPierceDmg });

let nHitRate = 0;
const ovNoHitRate = withPatchedOverride(SLUG, (ov: any) => {
  nHitRate = setBuff(ov, 'hitRatePct', 98.18, 0);
});
const noHitRate = run(BASE, { [SLUG]: ovNoHitRate });

const fbStartIdxs = base.evs
  .map((e, i) => ({ e, i }))
  .filter(({ e }) => e.kind === 'fullBurstStart')
  .map(({ i }) => i);

/* ------------------------------------------------------------------------------- assertions */

describe('dorothy-serendipity — fixture', () => {
  it('the carry fires and the comp actually chains Full Bursts (a lone B3 would make ZERO)', () => {
    expect(base.total).toBeGreaterThan(0);
    expect(fbStartIdxs.length).toBeGreaterThanOrEqual(2);
    expect(base.evs.some((e) => e.kind === 'burstCast')).toBe(true);
  });
});

describe('S1a — activates on hitting with 80 pellets (self)', () => {
  it('grants Attack Damage +72% repeatedly, as a self buff', () => {
    // RED if the line is missing, mis-magnitude, or mis-keyed to a generic ATK stat.
    const a = applies(base.evs, 'attackDamagePct', 72);
    expect(a.length).toBeGreaterThanOrEqual(2);
    for (const e of a) {expect(e.targetSlug ?? SLUG).toBe(SLUG);}
  });

  it('the window is 3 ROUNDS, not 3 seconds', () => {
    // durationShots is the round-count primitive; a durationSec:3 model is the nearest wrong one.
    // Her magazine is 9 with a 111f reload, so a 3-round window and a 3-second window cannot
    // coincide — the counterfactual must MOVE total damage.
    for (const e of applies(base.evs, 'attackDamagePct', 72))
      {expect(e.durationShots).toBe(3);}
    expect(nRounds).toBeGreaterThanOrEqual(1);
    expect(asSeconds.total).not.toBe(base.total);
  });

  it('the trigger counts landed PELLETS (80), not rounds (8)', () => {
    // hitsPerShot is 10, so a rounds-reading of the same line would be count:8 and would fire far
    // more often. GREEN only if the committed model is the coarser, pellet-counting one.
    expect(nTrigger).toBeGreaterThanOrEqual(1);
    const baseFires = applies(base.evs, 'attackDamagePct', 72).length;
    const roundsFires = applies(
      roundsTrigger.evs,
      'attackDamagePct',
      72
    ).length;
    expect(roundsFires).toBeGreaterThan(baseFires);
  });

  it('Hit Rate +98.18% rides the same 3-round window and lifts her own damage', () => {
    const a = applies(base.evs, 'hitRatePct', 98.18);
    expect(a.length).toBeGreaterThanOrEqual(1);
    for (const e of a) {expect(e.durationShots).toBe(3);}
    expect(nHitRate).toBeGreaterThanOrEqual(1);
    // hitRatePct is the core-hit lift (live by default); zeroing it must cost her damage.
    expect(noHitRate.total).toBeLessThan(base.total);
  });

  it('is self-scoped: zeroing the +72% costs HER damage and moves no teammate at all', () => {
    // Inertness. attackDamagePct is a pure damage multiplier — it cannot touch shot count or
    // burst-gauge generation, so every other unit must come back byte-identical.
    expect(nAtkDmg).toBeGreaterThanOrEqual(1);
    expect(noAtkDmg.total).toBeLessThan(base.total);
    expect(others(totals(noAtkDmg.res))).toEqual(others(totals(base.res)));
  });

  it('Pierce is granted BY the 80-pellet trigger, not tagged for the whole fight', () => {
    // The kit grants Pierce only after 80 pellets land, for 3 rounds. A static hasPierce:true
    // would make S2a Pierce Damage +55.08% live from t=0 for the entire 180s — a large
    // over-credit that a boolean cannot step-gate (that is exactly what gainPierce exists for).
    expect(committed?.hasPierce === true).toBe(false);
    const pierceBlocks = allBlocks(committed).filter((b: any) =>
      (b?.effects ?? []).some((e: any) => e?.kind === 'gainPierce')
    );
    expect(pierceBlocks.length).toBeGreaterThanOrEqual(1);
    for (const b of pierceBlocks) {expect(b.trigger?.kind).toBe('hitCount');}
  });

  it.skip('pellet count is FIXED at 1 for 3 rounds — no clamp primitive, and the damage payload is kit-silent', () => {
    // GAP (two-fold):
    //  (1) the schema has pelletCountFlat, a flat ADD; there is no stat-CLAMP primitive, so
    //      'fixed at 1' can only be approximated as -9 from hitsPerShot 10 — and it then composes
    //      wrongly with the burst's +5 (10-9+5 = 6 pellets, not 1).
    //  (2) MEASUREMENT-GATED: pelletCountFlat is documented as 'each pellet = 1/base of the shot',
    //      so 1 pellet would deal ~1/10 of a shot. Whether the consolidated single pellet instead
    //      carries the FULL shot payload (with Hit Rate +98.18% and Attack Damage +72% on top) is
    //      not stated anywhere in the kit text. Flag with a recipe: read the popup value of the
    //      3 post-threshold shots against a pre-threshold shot on footage. Do NOT guess a number.
  });

  it.skip('gain Pierce for 3 ROUND(s) — gainPierce has no durationShots', () => {
    // GAP: gainPierce takes only durationSec (absent = continuous). A round-count window is
    // inexpressible, so any committed durationSec is a per-unit estimate (flag). Recipe: measure
    // her pulls/sec, then window = 3 pulls (+ one reload, ~1.85s, if the 3 rounds span one).
  });
});

describe('S1b — activates on hitting with 160 pellets (self)', () => {
  it.skip('expands Pierce range by 200% for 3 rounds — no primitive', () => {
    // GAP: pierce DEPTH/range (how many targets or how far a pierce shot carries) has no schema
    // representation, and the v1 boss is a single target anyway. Unobservable payload here.
  });

  it('the unmodelable S1 lines are recorded in `unmodeled`, not silently dropped', () => {
    const text = SLOTS.flatMap(
      (s) => (committed?.unmodeled?.[s] ?? []) as string[]
    ).join(' | ');
    expect(text.length).toBeGreaterThan(0);
    expect(/range/i.test(text)).toBe(true);
  });
});

describe('S2a — start of battle: Pierce damage +55.08% continuously (self)', () => {
  it('applies from battle start, before any Full Burst', () => {
    const i = idxs(base.evs, 'pierceDamagePct', 55.08);
    expect(i.length).toBeGreaterThanOrEqual(1);
    expect(i[0]).toBeLessThan(fbStartIdxs[0]);
  });

  it('zeroing it never RAISES her damage', () => {
    // Monotonic, deliberately one-sided: pierceDamagePct only feeds the Damage-Up bucket while her
    // attacks are Pierce-tagged (the 3-round S1a window), and the schema notes it may still be
    // inert in v1. Equality here is legitimate; an increase would mean the sign is inverted.
    expect(nPierceDmg).toBeGreaterThanOrEqual(1);
    expect(noPierceDmg.total).toBeLessThanOrEqual(base.total);
  });
});

describe('S2b — only during Full Burst (self)', () => {
  it('ATK +75.24% applies once per team Full Burst, and never before the first one', () => {
    // Trigger identity: `during Full Burst` = full-burst-ENTER (any team FB), not burst-cast and
    // not a passive. A passive model would emit once at frame 0 -> both assertions RED.
    const i = idxs(base.evs, 'atkPct', 75.24);
    expect(i.length).toBe(fbStartIdxs.length);
    expect(i[0]).toBeGreaterThan(fbStartIdxs[0]);
  });

  it('Hit Rate +40.68% shares that same Full-Burst trigger', () => {
    const i = idxs(base.evs, 'hitRatePct', 40.68);
    expect(i.length).toBe(fbStartIdxs.length);
    expect(i[0]).toBeGreaterThan(fbStartIdxs[0]);
  });

  it('neither buff outlives the 10s Full Burst window', () => {
    // `continuously` here is scoped to the FB window by the activation clause; a 15s duration
    // (copied from the burst lines) would leak the buff past Full Burst.
    const fb = allEffects(committed).filter(
      (e: any) =>
        e?.kind === 'buff' &&
        ((e.stat === 'atkPct' && near(e.value, 75.24)) ||
          (e.stat === 'hitRatePct' && near(e.value, 40.68)))
    );
    expect(fb.length).toBe(2);
    for (const e of fb) {
      expect(typeof e.durationSec).toBe('number');
      expect(e.durationSec).toBeLessThanOrEqual(10);
    }
  });
});

describe('burst — self, 15 sec', () => {
  it('all three lines key to HER burst CAST, not to team Full-Burst entry', () => {
    // Discriminator without needing frames: at each application, the most recent burst-ish event
    // before it must be a burstCast, not a fullBurstStart. A fullBurstEnter mis-key inverts that
    // ordering (and over-credits on rotations where the OTHER B3 completes the chain).
    const groups = [
      idxs(base.evs, 'atkPct', 88.12),
      idxs(base.evs, 'pelletCountFlat', 5),
      idxs(base.evs, 'attackSpeedPct', 65),
    ];
    for (const g of groups) {
      expect(g.length).toBeGreaterThanOrEqual(1);
      for (const i of g) {
        expect(lastIdxBefore(base.evs, i, 'burstCast')).toBeGreaterThan(
          lastIdxBefore(base.evs, i, 'fullBurstStart')
        );
      }
    }
    expect(groups[1].length).toBe(groups[0].length);
    expect(groups[2].length).toBe(groups[0].length);
  });

  it('each of the three buffs lasts 15 sec (not clamped to the 10s FB window)', () => {
    const want: Array<[string, number]> = [
      ['atkPct', 88.12],
      ['pelletCountFlat', 5],
      ['attackSpeedPct', 65],
    ];
    for (const [stat, value] of want) {
      const hits = allEffects(committed).filter(
        (e: any) =>
          e?.kind === 'buff' && e.stat === stat && near(e.value, value)
      );
      expect(hits.length).toBeGreaterThanOrEqual(1);
      for (const e of hits) {expect(e.durationSec).toBe(15);}
    }
  });

  it('+5 pellets adds HER damage without pumping the team burst gauge', () => {
    // pelletCountFlat is SG-only and documented as gauge-neutral (energy is per-trigger), so
    // teammates must be byte-identical; a normalAttackPct proxy would be a different mechanic.
    expect(nPellets).toBeGreaterThanOrEqual(1);
    expect(noPellets.total).toBeLessThan(base.total);
    expect(others(totals(noPellets.res))).toEqual(others(totals(base.res)));
  });

  it('+65% attack speed is DAMAGE: it adds shots fired', () => {
    // A weapon-state modifier gates shot count; dropping it as `defensive` is the classic miss.
    // No teammate-inertness assertion here on purpose: more shots = more gauge = shifted rotation.
    expect(nSpeed).toBeGreaterThanOrEqual(1);
    const withSpeed = shotCount(base.res, base.evs);
    const without = shotCount(noSpeed.res, noSpeed.evs);
    expect(withSpeed).toBeGreaterThan(0);
    expect(withSpeed).toBeGreaterThan(without);
  });
});
