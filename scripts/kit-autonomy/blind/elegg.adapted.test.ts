/**
 * elegg (Elegg) - blind kit-spec test, written from the kit prose ALONE.
 * S5 cross-family post-op writer: no sight of the driver test / override / reasoning.
 *
 * KIT (MG/Electric/Supporter/Burst II, ammo 300, hitsPerShot 1, cd 20s):
 *  S1a start of battle, all allies: damage dealt to enemy PROJECTILES +59.66% continuously.
 *      -> GAP: v1 models no enemy-projectile entity at all. it.skip.
 *  S1b after landing 100 normal attacks: 158.65% of final ATK as Distributed Damage.
 *      READ: the BOOM-Install clause qualifies the SPLASH target set (the target AND 2
 *      surrounding enemy units), not the hit itself. Against a single partless boss the
 *      splash is inert, so the faithful model fires the hit on EVERY 100th round, UNGATED.
 *      Nearest-wrong = hanging requiresTargetStatus BOOM Install on the whole block, which
 *      would delete every proc outside her 10s burst windows.
 *  S2a after landing 60 normal attacks on a target in BOOM Install, all allies:
 *      ATK +13.09% of the skill users ATK for 5 sec -> casterAtkPct (flat-resolved at
 *      apply time), requiresTargetStatus BOOM Install, hitCount 60, allies incl. self.
 *      Nearest-wrongs: plain atkPct (scales each targets own ATK), no status gate
 *      (over-credits every rotation), or a permanent window instead of 5s.
 *  S2b when the stage target appears, all allies: fills Burst Gauge 100%, once per battle
 *      -> a battle-start fillGauge. It moves the ROTATION, not damage directly; dropping it
 *      delays the first Full Burst. Nearest-wrong = omitted entirely (MISSING).
 *  Ba  all allies: Distributed Damage dealt +39.74% for 10 sec -> distributedDamagePct.
 *      Nearest-wrong = generic attackDamagePct (would also lift her normal-attack bucket).
 *  Bb  enemy nearest the crosshair: 316.66% of final ATK as burst-skill damage. A burst
 *      cast resolves BEFORE the Full Burst window opens, so this hit must never carry the
 *      +50% FB major (verified fact, CLAUDE.md).
 *  Bc  BOOM Install: DEF -35.64% for 10 sec. The STATUS WINDOW is modelable (it is the gate
 *      S2a reads) and is asserted here; the enemy DEF reduction itself is a GAP - the schema
 *      has no enemy-DEF-reduction StatKey (defPct is self-scoped and inert in v1, and
 *      damageTakenPct is a different, multiplicative mechanic). it.skip.
 *
 * FIXTURE: controlComp(elegg, true) - liter B1 / crown B2 / elegg / helm B3 - so bursts
 * actually chain. Deterministic (no seed). Every counterfactual patches ONLY elegg's
 * in-memory override clone; the committed JSON is untouched.
 *
 * ATTRIBUTION: casterAtkPct buffApply values are emitted FLAT (kit% x caster staticAtk) and
 * another support in the fixture may emit the same stat, so elegg's caster index is
 * discovered EMPIRICALLY: a sentinel run raises her casterAtkPct to 99.99 and the value that
 * appears only in that run identifies her events (and her casterIdx). Every later count
 * filters on that index, so a same-stat teammate can never contaminate a reading.
 *
 * SHAPE TOLERANCE: the override file is documented two ways (slot arrays vs slot.blocks), so
 * blocksOf/setBlocks accept both instead of guessing one and failing for the wrong reason.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
// ADAPTATION: `controlComp` dropped from the import — the fixture swap below replaces it
// with a sole-B2 comp (controlComp fields crown, a 2nd Burst II, so elegg never cast).
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'elegg';
const BOOM = 'BOOM Install';
const SENTINEL_ATK_PCT = 99.99;

type AnyEffect = {
  kind?: string;
  stat?: string;
  value?: number;
  atkPct?: number;
  durationSec?: number;
  noFb?: boolean;
};
type AnyBlock = {
  trigger?: { kind?: string; count?: number };
  effects?: AnyEffect[];
  requiresTargetStatus?: string;
};
type AnyOverride = Record<string, unknown>;
type Slot = 'skill1' | 'skill2' | 'burst';
const SLOTS: Slot[] = ['skill1', 'skill2', 'burst'];

function blocksOf(ov: AnyOverride, slot: Slot): AnyBlock[] {
  const s = ov[slot] as AnyBlock[] | { blocks?: AnyBlock[] } | undefined;
  if (!s) return [];
  return Array.isArray(s) ? s : ((s.blocks ?? []) as AnyBlock[]);
}
function setBlocks(ov: AnyOverride, slot: Slot, next: AnyBlock[]): void {
  const s = ov[slot] as AnyBlock[] | { blocks?: AnyBlock[] } | undefined;
  if (!s || Array.isArray(s)) ov[slot] = next;
  else s.blocks = next;
}
function allBlocks(ov: AnyOverride): AnyBlock[] {
  return SLOTS.flatMap((s) => blocksOf(ov, s));
}
const effectsOf = (b: AnyBlock): AnyEffect[] => b.effects ?? [];
const hasKind = (b: AnyBlock, kind: string) =>
  effectsOf(b).some((e) => e.kind === kind);
const hasStat = (b: AnyBlock, stat: string) =>
  effectsOf(b).some((e) => e.stat === stat);

type RunOut = {
  res: ReturnType<typeof runComp>;
  events: SimEvent[];
  tot: Record<string, number>;
};

function run(patched?: unknown): RunOut {
  const events: SimEvent[] = [];
  // ADAPTATION (fixture only — assertions unchanged): the blind writer used controlComp,
  // which fields crown (also Burst II). Alongside crown, elegg never wins the B2 slot and
  // NEVER CASTS her burst — so BOOM Install never opens and every burst/S2a counterfactual
  // is a vacuous no-op (this is the sole-B2 hazard the S2b reviewer + driver independently
  // flagged). Swap to a sole-B2 comp so elegg actually bursts; the blind writer's
  // discriminating assertions below are preserved verbatim.
  const base = {
    slugs: ['liter', SLUG, 'helm'],
    bossElement: 'Fire',
    focusSlug: SLUG,
  } as unknown as Record<string, unknown>;
  const cfg = {
    ...((base.cfg as Record<string, unknown>) ?? {}),
    onEvent: (ev: SimEvent) => {
      events.push(ev);
    },
  };
  const opts = { ...base, cfg } as Record<string, unknown>;
  if (patched !== undefined) {
    opts.overrides = {
      ...((base.overrides as Record<string, unknown>) ?? {}),
      [SLUG]: patched,
    };
  }
  const res = runComp(opts as unknown as Parameters<typeof runComp>[0]);
  return { res, events, tot: totals(res) };
}

function patch(mutate: (ov: AnyOverride) => void) {
  return withPatchedOverride(SLUG, (ov) => {
    mutate(ov as unknown as AnyOverride);
  });
}

type BuffApplyEv = {
  kind: 'buffApply';
  stat: string;
  value: number;
  targetSlug: string;
  casterIdx: number | null;
};
const buffApplies = (r: RunOut) =>
  r.events.filter((e) => e.kind === 'buffApply') as unknown as BuffApplyEv[];
const casterAtk = (r: RunOut) =>
  buffApplies(r).filter((e) => e.stat === 'casterAtkPct');
const dmgEvents = (r: RunOut) => r.events.filter((e) => e.kind === 'damage').length;
const fbCount = (r: RunOut) =>
  r.events.filter((e) => e.kind === 'fullBurstStart').length;
const burstCasts = (r: RunOut) =>
  r.events.filter((e) => e.kind === 'burstCast').length;
const dmg = (r: RunOut, slug: string) => r.tot[slug];
const teamTotal = (r: RunOut) =>
  Object.values(r.tot).reduce((a, b) => a + b, 0);

// ---------------------------------------------------------------------------
// Runs (hoisted - each is a full 180s sim; 14 total)
// ---------------------------------------------------------------------------
const BASE = run();

// S1b: strip the 100-hit distributed rider entirely.
const NO_S1_RIDER = run(
  patch((ov) => {
    setBlocks(
      ov,
      'skill1',
      blocksOf(ov, 'skill1').filter((b) => !hasKind(b, 'flatDamage')),
    );
  }),
);

// S1b trigger identity: halve / double the hit threshold.
const S1_EVERY_50 = run(
  patch((ov) => {
    for (const b of blocksOf(ov, 'skill1')) {
      if (hasKind(b, 'flatDamage') && b.trigger?.kind === 'hitCount') {
        b.trigger.count = 50;
      }
    }
  }),
);
const S1_EVERY_200 = run(
  patch((ov) => {
    for (const b of blocksOf(ov, 'skill1')) {
      if (hasKind(b, 'flatDamage') && b.trigger?.kind === 'hitCount') {
        b.trigger.count = 200;
      }
    }
  }),
);

// S1b nearest-wrong: gate the whole rider on BOOM Install.
const S1_STATUS_GATED = run(
  patch((ov) => {
    for (const b of blocksOf(ov, 'skill1')) {
      if (hasKind(b, 'flatDamage')) b.requiresTargetStatus = BOOM;
    }
  }),
);

// S2a nearest-wrong: drop the BOOM-Install gate.
const S2_UNGATED = run(
  patch((ov) => {
    for (const b of allBlocks(ov)) {
      if (hasStat(b, 'casterAtkPct')) delete b.requiresTargetStatus;
    }
  }),
);

// S2a trigger identity: halve the 60-hit threshold.
const S2_EVERY_30 = run(
  patch((ov) => {
    for (const b of allBlocks(ov)) {
      if (hasStat(b, 'casterAtkPct') && b.trigger?.kind === 'hitCount') {
        b.trigger.count = 30;
      }
    }
  }),
);

// S2a duration semantics: stretch the 5s window to 30s.
const S2_LONG = run(
  patch((ov) => {
    for (const b of allBlocks(ov)) {
      for (const e of effectsOf(b)) {
        if (e.stat === 'casterAtkPct') e.durationSec = 30;
      }
    }
  }),
);

// Attribution probe: make elegg's ATK grant self-identifying.
const S2_SENTINEL = run(
  patch((ov) => {
    for (const b of allBlocks(ov)) {
      for (const e of effectsOf(b)) {
        if (e.stat === 'casterAtkPct') e.value = SENTINEL_ATK_PCT;
      }
    }
  }),
);

// S2b: remove the battle-start 100% gauge fill.
const NO_FILL = run(
  patch((ov) => {
    for (const slot of SLOTS) {
      setBlocks(
        ov,
        slot,
        blocksOf(ov, slot).filter((b) => !hasKind(b, 'fillGauge')),
      );
    }
  }),
);

// Ba: zero the Distributed Damage buff.
const BURST_DIST_ZERO = run(
  patch((ov) => {
    for (const b of allBlocks(ov)) {
      for (const e of effectsOf(b)) {
        if (e.stat === 'distributedDamagePct') e.value = 0;
      }
    }
  }),
);

// Bb: remove the 316.66% burst hit.
const NO_BURST_HIT = run(
  patch((ov) => {
    setBlocks(
      ov,
      'burst',
      blocksOf(ov, 'burst').filter((b) => !hasKind(b, 'flatDamage')),
    );
  }),
);

// Bb FB-exemption probe: force noFb on the burst hit.
const BURST_NOFB = run(
  patch((ov) => {
    for (const b of blocksOf(ov, 'burst')) {
      for (const e of effectsOf(b)) {
        if (e.kind === 'flatDamage') e.noFb = true;
      }
    }
  }),
);

// Bc: remove the BOOM Install status window (keep every other burst effect).
const NO_BOOM = run(
  patch((ov) => {
    for (const b of allBlocks(ov)) {
      b.effects = effectsOf(b).filter((e) => e.kind !== 'targetStatus');
    }
  }),
);

// ---------------------------------------------------------------------------
// Empirical attribution of elegg's caster-scaled ATK grant
// ---------------------------------------------------------------------------
const BASE_ATK_VALUES = new Set(casterAtk(BASE).map((e) => e.value));
const SENTINEL_APPLIES = casterAtk(S2_SENTINEL).filter(
  (e) => !BASE_ATK_VALUES.has(e.value),
);
const ELEGG_IDX =
  SENTINEL_APPLIES.length > 0 ? SENTINEL_APPLIES[0].casterIdx : -999;
const eleggAtk = (r: RunOut) =>
  casterAtk(r).filter((e) => e.casterIdx === ELEGG_IDX);
const OTHERS = Object.keys(BASE.tot).filter((s) => s !== SLUG);

describe('elegg - fixture is non-vacuous', () => {
  it('elegg is in the comp and deals damage', () => {
    const row = unitOf(BASE.res, SLUG) as unknown as { totalDamage: number };
    expect(row.totalDamage).toBe(dmg(BASE, SLUG));
    expect(dmg(BASE, SLUG)).toBeGreaterThan(0);
  });

  it('bursts chain and Full Bursts happen (else every burst assertion is vacuous)', () => {
    expect(burstCasts(BASE)).toBeGreaterThan(0);
    expect(fbCount(BASE)).toBeGreaterThan(0);
  });

  it('elegg casts her own burst - proved by BOOM Install opening at least once', () => {
    // Her burst is the ONLY source of the status, and the status is the only thing that
    // lets S2a fire; a non-zero count here means the fixture really exercises her burst.
    expect(eleggAtk(BASE).length).toBeGreaterThan(0);
  });
});

describe('elegg skill1 - projectile buff / 100-hit distributed rider', () => {
  it.skip('S1a: damage to enemy projectiles +59.66% - GAP, no enemy-projectile entity in v1', () => {
    // The sim has no enemy projectiles to attack, so the line has no observable payload.
    // It belongs in the override unmodeled record, not in a block.
  });

  it('S1b: the 158.65% distributed rider is live and is elegg-sourced only', () => {
    // GREEN under the faithful reading; RED if the rider is MISSING (removal would be a
    // no-op) or if it were authored on a teammate-visible channel.
    expect(dmg(BASE, SLUG)).toBeGreaterThan(dmg(NO_S1_RIDER, SLUG));
    // Inertness: an enemy-facing hit must not move any ally.
    for (const s of OTHERS) {
      expect(dmg(NO_S1_RIDER, s)).toBe(dmg(BASE, s));
    }
  });

  it('S1b: the trigger is a cumulative 100-normal-attack counter', () => {
    // Halving the threshold must roughly double the procs; doubling it must halve them.
    // RED if the block is keyed to interval / burstCast / fullBurstEnter (count is then a
    // no-op field and all three runs come out identical).
    expect(dmg(S1_EVERY_50, SLUG)).toBeGreaterThan(dmg(BASE, SLUG));
    expect(dmg(S1_EVERY_200, SLUG)).toBeLessThan(dmg(BASE, SLUG));
    const rider = dmg(BASE, SLUG) - dmg(NO_S1_RIDER, SLUG);
    const delta50 = dmg(S1_EVERY_50, SLUG) - dmg(BASE, SLUG);
    expect(delta50).toBeGreaterThan(rider * 0.4);
    expect(delta50).toBeLessThan(rider * 3);
  });

  it('S1b: the rider is NOT gated on BOOM Install (the status only widens the AoE)', () => {
    // The kit conditions the SPLASH (target + 2 surrounding enemies) on BOOM Install, and
    // splash is inert against a single partless boss. So the faithful model fires on every
    // 100th round regardless of status. Adding the gate MUST cost damage; if it does not,
    // the model under test is already status-gated - the divergence this probe exists for.
    expect(dmg(S1_STATUS_GATED, SLUG)).toBeLessThan(dmg(BASE, SLUG));
    expect(dmg(S1_STATUS_GATED, SLUG)).toBeGreaterThanOrEqual(
      dmg(NO_S1_RIDER, SLUG),
    );
  });
});

describe('elegg skill2 - BOOM-gated ally ATK buff + battle-start gauge fill', () => {
  it('S2a: ATK +13.09% OF THE SKILL USERS ATK is caster-scaled, flat, and hits all allies', () => {
    // casterAtkPct re-emits FLAT (kit% x caster staticAtk), so one identical number must
    // land on every ally including elegg herself. RED if the line was encoded as plain
    // atkPct (target-scaled: no casterAtkPct event appears at all, sentinel finds nothing),
    // or if the target set is self-only / a ranked subset.
    expect(SENTINEL_APPLIES.length).toBeGreaterThan(0);
    const values = new Set(SENTINEL_APPLIES.map((e) => e.value));
    expect(values.size).toBe(1);
    const targets = new Set(SENTINEL_APPLIES.map((e) => e.targetSlug));
    for (const s of Object.keys(BASE.tot)) {
      expect(targets.has(s)).toBe(true);
    }
  });

  it('S2a: the buff is gated on the target being in BOOM Install', () => {
    // Non-vacuity in BOTH directions: the gated fixture fires it sometimes (active case)
    // and strictly less often than the ungated counterfactual (inactive case exists).
    // RED if the block carries no status gate - the patch is then a no-op and the counts tie.
    expect(eleggAtk(BASE).length).toBeGreaterThan(0);
    expect(eleggAtk(S2_UNGATED).length).toBeGreaterThan(eleggAtk(BASE).length);
  });

  it('S2a: the trigger is a 60-normal-attack counter, not a burst/interval event', () => {
    expect(eleggAtk(S2_EVERY_30).length).toBeGreaterThan(eleggAtk(BASE).length);
  });

  it('S2a: the window is a short 5 sec, not permanent', () => {
    // Stretching 5s -> 30s must raise team damage. RED if the buff was authored with no
    // durationSec (permanent): adding one can only lower or tie, never raise.
    expect(teamTotal(S2_LONG)).toBeGreaterThan(teamTotal(BASE));
  });

  it('S2b: the once-per-battle 100% gauge fill is present and fires exactly once', () => {
    // A t=0 full gauge pulls the whole rotation forward; removing it must cost the team
    // damage. RED if the line is MISSING (removal is a no-op). The <=2 bound discriminates
    // a once-per-battle fill from a repeating one, which would add many extra Full Bursts.
    expect(teamTotal(BASE)).toBeGreaterThan(teamTotal(NO_FILL));
    expect(fbCount(BASE)).toBeGreaterThanOrEqual(fbCount(NO_FILL));
    expect(fbCount(BASE) - fbCount(NO_FILL)).toBeLessThanOrEqual(2);
  });
});

describe('elegg burst - distributed buff, 316.66% hit, BOOM Install', () => {
  it('Ba: the buff is scoped to Distributed Damage, not generic damage', () => {
    // Zeroing distributedDamagePct must cost elegg damage (her own 158.65% rider is
    // distributed-flavored and lands inside the 10s window). RED if the line was encoded as
    // attackDamagePct / trueDamagePct - the filter then matches nothing and totals tie.
    expect(dmg(BURST_DIST_ZERO, SLUG)).toBeLessThan(dmg(BASE, SLUG));
    // Inertness: allies with no distributed-flavored hits must not move.
    for (const s of OTHERS) {
      expect(dmg(BURST_DIST_ZERO, s)).toBe(dmg(BASE, s));
    }
  });

  it('Bb: the burst deals a 316.66% instant hit', () => {
    expect(dmg(BASE, SLUG)).toBeGreaterThan(dmg(NO_BURST_HIT, SLUG));
    expect(dmgEvents(BASE)).toBeGreaterThan(dmgEvents(NO_BURST_HIT));
  });

  it('Bb: the burst hit is Full-Burst exempt (it resolves before the FB window opens)', () => {
    // Forcing noFb must be a NO-OP if the hit already never receives the +50% FB major.
    // RED if the model lands the burst hit inside Full Burst with the major applied.
    expect(dmg(BURST_NOFB, SLUG)).toBe(dmg(BASE, SLUG));
  });

  it('Bc: the burst opens the BOOM Install window that skill2 reads', () => {
    // Cross-slot coupling: kill the status source and the 60-hit ATK buff can never fire.
    // RED if the status name the burst writes differs from the one skill2 gates on, or if
    // skill2 is not gated at all.
    expect(eleggAtk(NO_BOOM).length).toBe(0);
    expect(eleggAtk(NO_BOOM).length).toBeLessThan(eleggAtk(BASE).length);
  });

  it.skip('Bc: DEF -35.64% for 10 sec - GAP, no enemy-DEF-reduction primitive in the schema', () => {
    // StatKey has no enemy DEF debuff: defPct is self-scoped and inert in v1, and
    // damageTakenPct is a different mechanic (multiplicative Damage Up, not the subtractive
    // boss-DEF term). Modeling it as damageTakenPct 35.64 would be a mechanic substitution
    // in the wrong bucket. Belongs in unmodeled until the primitive exists.
  });
});
