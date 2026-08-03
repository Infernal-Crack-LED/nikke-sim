/**
 * bay — BLIND kit spec test (cross-family S5). Written from the kit prose ALONE; the driver's
 * override, tests and reasoning were not consulted.
 *
 * KIT (RL/Fire/Defender/Burst II, ammo 6, chargeFrames 60 → every trigger pull is a full charge):
 *   skill1 a) on own Burst Skill cast, all allies: share damage taken (defensive, unmodelable)
 *             + DEF ▲10.13% of the caster's DEF, "continuously" (no duration)
 *   skill1 b) on Full Charge attacks, all allies EXCEPT self: recover 4% of caster's Max HP
 *   skill2 a) on own Burst Skill cast, own COVER: share damage taken (defensive)
 *   skill2 b) on Full Burst END, self: COVER HoT 2.88%/sec for 5 sec
 *   skill2 c) on Burst Stage 1 enter AND own cover destroyed, self: recover 20%
 *   burst  a) if own cover destroyed: rebuild cover 20% HP, once per battle
 *   burst  b) self: Max HP of COVER ▲18% of caster's Max HP for 20 sec
 *   burst  c) all allies: Damage Taken ▼8.87% for 10 sec
 *
 * Bay's kit carries NO offensive line at all. The faithfulness question is therefore exactly two
 * things:
 *   (1) The ONE cross-unit channel — the per-full-charge ally heal — must exist, fire PER SHOT
 *       (not per burst, not per magazine) and reach the team's on-recovery consumer (crown).
 *       Rule 4 (tandem): a heal that looks inert in isolation drives a teammate's on-recovery kit.
 *   (2) Every defensive line must stay damage-INERT. The dangerous one is "Damage Taken ▼ 8.87%
 *       — Affects all allies": that is ALLY survivability, NOT the engine's `damageTakenPct`
 *       (which is a BOSS debuff, positive = boss takes more). Mis-keying it there hands the whole
 *       team ~9% extra damage — the largest available over-credit on this unit. Same trap on the
 *       COVER lines: "Max HP of Cover" and "Cover's HP" are a different pool from the nikke's own
 *       Max HP / own healing, so they must not become ally heals or ally Max-HP grants.
 *
 * FIXTURES
 *   FX_CTL  = controlComp('bay') → liter(B1)/crown(B2)/bay(B2)/helm(B3), boss Fire, focus bay.
 *             crown is the on-recovery consumer, so the COUNT of crown-cast buffApply events is
 *             the observable for bay's heal cadence. A count (not an uptime) is used deliberately:
 *             helm also heals crown, so a duty-cycle read could saturate and go blind, while every
 *             additional recovery still re-emits a buffApply.
 *   FX_SOLE = liter(B1)/bay(B2)/helm(B3) → bay is the ONLY Burst II, so her own burst is guaranteed
 *             to cast; in FX_CTL crown's 20s cooldown can monopolise stage 2 and bay might never
 *             burst, which would make every burst-slot assertion silently vacuous. All burst-slot
 *             and burstCast-triggered assertions run here, and a marker probe PROVES she casts.
 *
 * Runs are hoisted (11 × 180s sims). Deterministic: no seed anywhere.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
  type CompOptions,
} from '../lib/harness.js';

// ---- local structural views over the override file (slot-keyed, no top-level `blocks`) ------
type Eff = {
  kind: string;
  stat?: string;
  value?: number;
  durationSec?: number;
  ticks?: number;
};
type Blk = {
  slot?: string;
  trigger: { kind: string; [k: string]: unknown };
  target: { kind: string; excludeSelf?: boolean; [k: string]: unknown };
  effects: Eff[];
  [k: string]: unknown;
};
type Ov = {
  skill1: Blk[];
  skill2: Blk[];
  burst: Blk[];
  unmodeled?: Record<string, string[]>;
};
type BuffEv = {
  kind: 'buffApply';
  stat: string;
  value: number;
  casterIdx: number | null;
  targetIdx: number | null;
  targetSlug: string;
  durationShots?: number;
};

const SLOTS = ['skill1', 'skill2', 'burst'] as const;

// The committed override, read through the clone helper (disk untouched).
const OV = withPatchedOverride('bay', () => {}) as unknown as Ov;

const blocksOf = (ov: Ov) =>
  SLOTS.flatMap((s) => (ov[s] ?? []).map((b) => ({ slot: s, b })));
const effectsOf = (ov: Ov) =>
  blocksOf(ov).flatMap(({ slot, b }) =>
    (b.effects ?? []).map((e) => ({ slot, b, e }))
  );
const isHeal = (b: Blk) => (b.effects ?? []).some((e) => e.kind === 'heal');

const buffs = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'buffApply') as unknown as BuffEv[];
const teamTotal = (t: Record<string, number>) =>
  Object.values(t).reduce((a, b) => a + b, 0);

// ---- fixtures --------------------------------------------------------------------------------
const FX_CTL = controlComp('bay');
const FX_SOLE: CompOptions = {
  slugs: ['liter', 'bay', 'helm'],
  bossElement: 'Fire',
  focusSlug: 'bay',
};
const IDX_CROWN = FX_CTL.slugs.indexOf('crown');

const run = (opts: CompOptions) => {
  const events: SimEvent[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...opts.cfg, onEvent: (e: SimEvent) => events.push(e) },
  });
  return { events, t: totals(res) };
};
const withBay = (opts: CompOptions, ov: ReturnType<typeof withPatchedOverride>): CompOptions => ({
  ...opts,
  overrides: { ...opts.overrides, bay: ov },
});

// ---- counterfactual overrides ----------------------------------------------------------------
/** skill1b deleted entirely — the heal channel goes dark. */
const OV_NO_HEAL = withPatchedOverride('bay', (ov) => {
  ov.skill1 = (ov.skill1 as Blk[]).filter((b) => !isHeal(b));
});
/** NEAREST-WRONG trigger identity: "full charge attack" mis-read as the burst cast. */
const OV_HEAL_BURSTCAST = withPatchedOverride('bay', (ov) => {
  for (const b of ov.skill1 as Blk[]) {
    if (isHeal(b)) {
      b.trigger = { kind: 'burstCast' };
    }
  }
});
/** NEAREST-WRONG trigger identity: per-magazine instead of per-shot (ammo 6). */
const OV_HEAL_LASTBULLET = withPatchedOverride('bay', (ov) => {
  for (const b of ov.skill1 as Blk[]) {
    if (isHeal(b)) {
      b.trigger = { kind: 'lastBullet' };
    }
  }
});
/** NEAREST-WRONG target set: "(except self)" dropped. */
const OV_HEAL_INCL_SELF = withPatchedOverride('bay', (ov) => {
  for (const b of ov.skill1 as Blk[]) {
    if (isHeal(b)) {
      b.target = { kind: 'allies' };
    }
  }
});
/** NEAREST-WRONG for skill2b: the COVER HoT mis-modelled as an ALLY heal at Full Burst end. */
const OV_COVER_HOT_TO_ALLIES = withPatchedOverride('bay', (ov) => {
  (ov.skill2 as Blk[]).push({
    slot: 'skill2',
    trigger: { kind: 'fullBurstEnd' },
    target: { kind: 'allies' },
    effects: [{ kind: 'heal', ticks: 5, intervalSec: 1 } as Eff],
  });
});
/** Castability marker — an unmistakable self ATK buff on bay's own burst cast. */
const OV_BURST_MARKER = withPatchedOverride('bay', (ov) => {
  (ov.burst as Blk[]).push({
    slot: 'burst',
    trigger: { kind: 'burstCast' },
    target: { kind: 'self' },
    effects: [{ kind: 'buff', stat: 'atkPct', value: 200, durationSec: 10 }],
  });
});
/** NEAREST-WRONG for burst c): ally "Damage Taken ▼" keyed to the boss damageTaken debuff. */
const OV_DAMAGE_TAKEN = withPatchedOverride('bay', (ov) => {
  (ov.burst as Blk[]).push({
    slot: 'burst',
    trigger: { kind: 'burstCast' },
    target: { kind: 'enemy' },
    effects: [
      { kind: 'buff', stat: 'damageTakenPct', value: 8.87, durationSec: 10 },
    ],
  });
});
/** skill1a's DEF grant stripped — isolates its damage footprint. */
const OV_NO_DEF = withPatchedOverride('bay', (ov) => {
  ov.skill1 = (ov.skill1 as Blk[]).map((b) => ({
    ...b,
    effects: (b.effects ?? []).filter(
      (e) => !(e.kind === 'buff' && e.stat === 'defPct')
    ),
  }));
});
/** burst b) mis-modelled as a real self Max-HP grant instead of a COVER Max-HP grant. */
const OV_COVER_MAXHP_AS_SELF = withPatchedOverride('bay', (ov) => {
  (ov.burst as Blk[]).push({
    slot: 'burst',
    trigger: { kind: 'burstCast' },
    target: { kind: 'self' },
    effects: [
      { kind: 'buff', stat: 'targetMaxHpPct', value: 18, durationSec: 20 },
    ],
  });
});

// ---- hoisted runs (11) ------------------------------------------------------------------------
const R_CTL_BASE = run(FX_CTL);
const R_CTL_NO_HEAL = run(withBay(FX_CTL, OV_NO_HEAL));
const R_CTL_HEAL_BURSTCAST = run(withBay(FX_CTL, OV_HEAL_BURSTCAST));
const R_CTL_HEAL_LASTBULLET = run(withBay(FX_CTL, OV_HEAL_LASTBULLET));
const R_CTL_HEAL_INCL_SELF = run(withBay(FX_CTL, OV_HEAL_INCL_SELF));
const R_CTL_COVER_HOT_ALLIES = run(withBay(FX_CTL, OV_COVER_HOT_TO_ALLIES));

const R_SOLE_BASE = run(FX_SOLE);
const R_SOLE_MARKER = run(withBay(FX_SOLE, OV_BURST_MARKER));
const R_SOLE_DAMAGE_TAKEN = run(withBay(FX_SOLE, OV_DAMAGE_TAKEN));
const R_SOLE_NO_DEF = run(withBay(FX_SOLE, OV_NO_DEF));
const R_SOLE_COVER_MAXHP = run(withBay(FX_SOLE, OV_COVER_MAXHP_AS_SELF));

const crownApplies = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === IDX_CROWN).length;

// ================================================================================================
describe('bay — fixture non-vacuity', () => {
  it('FX_CTL reaches Full Burst and bay actually fires', () => {
    expect(
      R_CTL_BASE.events.filter((e) => e.kind === 'fullBurstStart').length
    ).toBeGreaterThan(0);
    expect(
      R_CTL_BASE.events.filter((e) => e.kind === 'fullBurstEnd').length
    ).toBeGreaterThan(0);
    expect(
      R_CTL_BASE.events.filter((e) => e.kind === 'shot').length
    ).toBeGreaterThan(0);
    expect(R_CTL_BASE.t['crown']).toBeGreaterThan(0);
  });

  it('FX_SOLE actually casts bay\'s burst (marker probe)', () => {
    // Without this, every burst-slot assertion below would be vacuously green.
    expect(R_SOLE_MARKER.t['bay']).toBeGreaterThan(R_SOLE_BASE.t['bay']);
    expect(
      R_SOLE_BASE.events.filter((e) => e.kind === 'fullBurstStart').length
    ).toBeGreaterThan(0);
  });
});

describe('bay skill1 b) — full-charge ally heal (the only cross-unit channel)', () => {
  it('is encoded as a per-shot heal to allies EXCEPT self', () => {
    const heals = effectsOf(OV).filter((x) => x.e.kind === 'heal');
    const s1 = heals.filter((x) => x.slot === 'skill1');
    // MISSING here is the single most damaging omission on this unit (rule 4, tandem).
    expect(s1.length).toBeGreaterThan(0);
    const blk = s1[0].b;
    // bay is an RL with chargeFrames 60 — every trigger pull IS a Full Charge attack, so the
    // faithful key is per-shot. burstCast / lastBullet / fullBurstEnter all under-fire it.
    expect(blk.trigger.kind).toBe('shotFired');
    expect(blk.target.kind).toBe('allies');
    expect(blk.target.excludeSelf).toBe(true);
  });

  it('reaches the on-recovery consumer (crown) — removing it drops crown\'s buff applications', () => {
    // Discriminates against: heal absent, heal scoped to self, or heal emitting no recovery event.
    expect(crownApplies(R_CTL_BASE.events)).toBeGreaterThan(
      crownApplies(R_CTL_NO_HEAL.events)
    );
  });

  it('fires per full charge, not per burst cast', () => {
    // Re-keying to burstCast collapses ~1 heal/shot to ~1 heal/rotation.
    expect(crownApplies(R_CTL_BASE.events)).toBeGreaterThan(
      crownApplies(R_CTL_HEAL_BURSTCAST.events)
    );
  });

  it('fires per full charge, not once per magazine', () => {
    // ammo 6 → lastBullet is ~1/6 the cadence. Discriminates the per-magazine mis-read.
    expect(crownApplies(R_CTL_BASE.events)).toBeGreaterThan(
      crownApplies(R_CTL_HEAL_LASTBULLET.events)
    );
  });

  it('the "(except self)" clause is damage-inert in this fixture (documented, not proven)', () => {
    // bay has no on-recovery consumer of her own, so including her changes nothing observable.
    // Asserted as INERTNESS so the structural assertion above is the only thing carrying the claim.
    expect(crownApplies(R_CTL_HEAL_INCL_SELF.events)).toBe(
      crownApplies(R_CTL_BASE.events)
    );
    expect(R_CTL_HEAL_INCL_SELF.t).toStrictEqual(R_CTL_BASE.t);
  });
});

describe('bay skill1 a) — DEF ▲10.13% of caster DEF, on own burst cast, all allies', () => {
  it('is encoded burst-cast-keyed, all-allies, continuous (no duration)', () => {
    const def = effectsOf(OV).filter(
      (x) => x.e.kind === 'buff' && x.e.stat === 'defPct'
    );
    expect(def.length).toBe(1);
    expect(def[0].slot).toBe('skill1');
    expect(def[0].e.value).toBeCloseTo(10.13, 2);
    // "Activates when using Burst Skill" = the OWNER's cast, not full-burst entry (rule 3).
    expect(def[0].b.trigger.kind).toBe('burstCast');
    expect(def[0].b.target.kind).toBe('allies');
    expect(def[0].b.target.excludeSelf).toBeFalsy();
    // "continuously" — no wall-clock window.
    expect(def[0].e.durationSec).toBeUndefined();
  });

  it('applies to every ally when bay bursts, and is damage-inert', () => {
    const defEvs = buffs(R_SOLE_BASE.events).filter((b) => b.stat === 'defPct');
    expect(defEvs.length).toBeGreaterThan(0);
    expect(new Set(defEvs.map((b) => b.targetSlug))).toEqual(
      new Set(['liter', 'bay', 'helm'])
    );
    // INERTNESS: self DEF does not feed any damage path — nothing may be calibrated onto it.
    expect(R_SOLE_NO_DEF.t).toStrictEqual(R_SOLE_BASE.t);
  });
});

describe('bay skill2 b) — Full-Burst-end COVER heal is NOT an ally heal', () => {
  it('does not feed crown at Full Burst end', () => {
    // "Recovers Cover's HP … Affects self" — a different pool AND a self target. Encoding it as
    // an ally heal would silently drive crown's on-recovery kit once per Full Burst.
    expect(crownApplies(R_CTL_BASE.events)).toBeLessThan(
      crownApplies(R_CTL_COVER_HOT_ALLIES.events)
    );
  });

  it('no heal in bay\'s kit targets allies at Full Burst end', () => {
    const fbEndAllyHeals = effectsOf(OV).filter(
      (x) =>
        x.e.kind === 'heal' &&
        x.b.trigger.kind === 'fullBurstEnd' &&
        x.b.target.kind === 'allies'
    );
    expect(fbEndAllyHeals).toHaveLength(0);
  });
});

describe('bay burst c) — "Damage Taken ▼ 8.87%, all allies" is ALLY MITIGATION, not a boss debuff', () => {
  it('bay carries no damageTakenPct effect anywhere', () => {
    // damageTakenPct is the BOSS debuff (positive = boss takes more). The kit line is a ▼ on
    // ALLIES — pure survivability, zero damage. This is the largest over-credit available here.
    const dt = effectsOf(OV).filter(
      (x) => x.e.kind === 'buff' && x.e.stat === 'damageTakenPct'
    );
    expect(dt).toHaveLength(0);
    expect(
      buffs(R_CTL_BASE.events).filter((b) => b.stat === 'damageTakenPct')
    ).toHaveLength(0);
    expect(
      buffs(R_SOLE_BASE.events).filter((b) => b.stat === 'damageTakenPct')
    ).toHaveLength(0);
  });

  it('NON-VACUITY: the mis-encoding would be visible — it moves team damage', () => {
    expect(
      buffs(R_SOLE_DAMAGE_TAKEN.events).filter(
        (b) => b.stat === 'damageTakenPct'
      ).length
    ).toBeGreaterThan(0);
    expect(teamTotal(R_SOLE_DAMAGE_TAKEN.t)).not.toBe(
      teamTotal(R_SOLE_BASE.t)
    );
  });
});

describe('bay burst b) — "Max HP of COVER ▲18%" is not a nikke Max-HP grant', () => {
  it('grants no Max HP to any ally', () => {
    const hp = effectsOf(OV).filter(
      (x) =>
        x.e.kind === 'buff' &&
        ['maxHpPct', 'casterMaxHpPct', 'targetMaxHpPct'].includes(
          x.e.stat ?? ''
        ) &&
        x.b.target.kind !== 'self'
    );
    expect(hp).toHaveLength(0);
    expect(
      buffs(R_SOLE_BASE.events).filter(
        (b) => b.stat === 'maxHpFlat' && b.targetSlug !== 'bay'
      )
    ).toHaveLength(0);
  });

  it('INERTNESS: even a self Max-HP reading cannot move bay\'s damage', () => {
    // bay has no atkOfMaxHpPct conversion, so the cover-HP line is damage-inert either way —
    // recorded so no future calibration is hung on it.
    expect(R_SOLE_COVER_MAXHP.t['bay']).toBe(R_SOLE_BASE.t['bay']);
  });
});

describe('bay — whole-kit invariants', () => {
  it('carries NO offensive effect of any kind', () => {
    const ALLOWED_KINDS = ['buff', 'heal', 'shield'];
    const ALLOWED_STATS = [
      'defPct',
      'maxHpPct',
      'casterMaxHpPct',
      'targetMaxHpPct',
    ];
    const offenders = effectsOf(OV).filter(
      (x) =>
        !ALLOWED_KINDS.includes(x.e.kind) ||
        (x.e.kind === 'buff' && !ALLOWED_STATS.includes(x.e.stat ?? ''))
    );
    expect(
      offenders.map((x) => `${x.slot}:${x.e.kind}:${x.e.stat ?? ''}`)
    ).toEqual([]);
  });

  it('all three slots are present and record their unmodelled defensive text', () => {
    for (const s of SLOTS) {
      expect(Array.isArray(OV[s])).toBe(true);
    }
    // Every slot carries at least one unmodelable line (damage-sharing / cover pool), so a silent
    // drop is detectable: an empty unmodeled list means the text vanished without an audit record.
    expect(OV.unmodeled).toBeDefined();
    for (const s of SLOTS) {
      expect((OV.unmodeled?.[s] ?? []).length).toBeGreaterThan(0);
    }
  });

  it('bay never gates a block on cover state (no such primitive exists)', () => {
    // If a driver invented a gate for "cover has been destroyed", it would be unreachable at scope
    // lock (the boss deals no damage) — assert nothing silently depends on it.
    const gated = blocksOf(OV).filter(
      ({ b }) =>
        'requiresShielded' in b ||
        'requiresTargetStatus' in b ||
        'resourceGate' in b
    );
    expect(gated.map(({ slot }) => slot)).toEqual([]);
  });
});

describe('bay — GAPS (no engine primitive)', () => {
  it.skip('skill1 a) / skill2 a) "Proportionally shares damage taken" — the boss deals no damage at scope lock; no damage-to-allies model exists', () => {});
  it.skip('skill1 b) heal MAGNITUDE (4% of caster final Max HP) — the `heal` effect carries no amount; only the recovery EVENT is modelled', () => {});
  it.skip('skill2 b) COVER HoT 2.88%/sec ×5 — cover has no HP pool in the sim; the amount is unobservable', () => {});
  it.skip('skill2 c) Burst-Stage-1 20% heal gated on cover destroyed — cover destruction is unreachable (boss deals no damage)', () => {});
  it.skip('burst a) rebuild cover 20%, once per battle — same unreachable gate, plus no cover entity', () => {});
});
