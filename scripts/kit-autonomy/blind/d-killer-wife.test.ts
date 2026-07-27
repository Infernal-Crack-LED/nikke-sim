// DRIVER NOTE (gauntlet S5): import path retargeted from '../lib/harness.js' (the blind
// writer's assumed scripts/tests/units/ location) to the real '../../tests/lib/harness.js'
// for this file's home in scripts/kit-autonomy/blind/. No other change to the blind test.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

/**
 * d-killer-wife (D: Killer Wife) — SR / Fire / Supporter / Burst I, cd 20s, ammo 6,
 * chargeFrames 60. BLIND spec test: written from the kit prose alone.
 *
 * KIT (structural read):
 *   S1a  "Full Charge for 3 time(s)" / self          -> gainPierce ("for 1 shot")
 *   S1b  "entering Full Burst" / allies with SR      -> pierceDamagePct 13.55, 10s
 *   S2a  "Full Charge for 8 time(s)" / all allies    -> burstCdr 7s (repeating)
 *   S2b  "Full Charge for 5 time(s)" / all allies    -> attackDamagePct 5.06, 10s
 *   B-a  nearest enemy                               -> flatDamage 269.28% + targetStatus "Wipe Out" 10s
 *   B-b  ally normal-attack area hit vs Wipe Out     -> parts: coreDamagePct 16.26, 10s
 *                                                       body:  casterAtkPct 12.19, 10s
 *
 * FIXTURE: controlComp('d-killer-wife', true) — liter (B1) / crown (B2) / d-killer-wife
 * (carry) / helm (B3). She is a Burst I, so the chain needs the B2+B3 to reach Full Burst at
 * all; helm is kept IN because she is the only OTHER Sniper Rifle in the comp and S1b's
 * weapon-scoped target set is only discriminable against a non-SR teammate (liter/crown).
 *
 * ASSERTION STYLE: every claim is proved by an event/total DELTA against a counterfactual
 * built with withPatchedOverride (nearest-wrong model), never by a hardcoded damage number.
 * Event filters deliberately avoid damage-event ownership fields (not part of the documented
 * event shape) — ownership is established by "which applies vanish under the counterfactual".
 */

const SLUG = 'd-killer-wife';
const MATES = ['liter', 'crown', 'helm'] as const;

type Ev = SimEvent & Record<string, any>;

function run(opts: any) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...(opts.cfg ?? {}), onEvent: (ev: Ev) => events.push(ev) },
  });
  return { res, events, t: totals(res) };
}

const comp = (patched?: any) => {
  const o: any = controlComp(SLUG, true);
  if (patched) {
    o.overrides = { ...(o.overrides ?? {}), [SLUG]: patched };
  }
  return o;
};

/**
 * Slot accessor tolerant of both documented shapes (slot -> Block[] on disk, slot ->
 * CharacterSkills{blocks} in memory). Returns the LIVE array so in-place mutation sticks.
 * NOTE: there is no top-level `blocks` on an OverrideFile — patching `ov.blocks` is a no-op.
 */
const slotBlocks = (ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] =>
  Array.isArray(ov?.[slot]) ? ov[slot] : (ov?.[slot]?.blocks ?? []);

const allBlocks = (ov: any): any[] => [
  ...slotBlocks(ov, 'skill1'),
  ...slotBlocks(ov, 'skill2'),
  ...slotBlocks(ov, 'burst'),
];
const effectsOf = (blocks: any[]) =>
  blocks.flatMap((b: any) => b.effects ?? []);
const hasEffect = (b: any, pred: (e: any) => boolean) =>
  (b.effects ?? []).some(pred);

const applies = (evs: Ev[], stat: string, value?: number) =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      (value === undefined || Math.abs((e.value ?? NaN) - value) < 1e-6)
  );
const targetsOf = (evs: Ev[]) => new Set(evs.map((e) => e.targetSlug));
const fbCount = (evs: Ev[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').length;

// ---------------------------------------------------------------------------
// committed override, read-only clone (for structural/spec assertions)
// ---------------------------------------------------------------------------
const OV: any = withPatchedOverride(SLUG, () => {});

// ---------------------------------------------------------------------------
// counterfactuals (nearest-wrong models)
// ---------------------------------------------------------------------------
const pRmGainPierce = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov)) {
    b.effects = (b.effects ?? []).filter((e: any) => e.kind !== 'gainPierce');
  }
});

const pRmPierceDmg = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov)) {
    b.effects = (b.effects ?? []).filter(
      (e: any) => e.stat !== 'pierceDamagePct'
    );
  }
});

// nearest-wrong trigger identity: "entering Full Burst" mis-read as "when she casts her burst"
const pPierceDmgOnBurstCast = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov)) {
    if (hasEffect(b, (e: any) => e.stat === 'pierceDamagePct')) {
      b.trigger = { kind: 'burstCast' };
    }
  }
});

const pRmCdr = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov)) {
    b.effects = (b.effects ?? []).filter((e: any) => e.kind !== 'burstCdr');
  }
});

// nearest-wrong threshold: the CDR line keyed to the 5-charge counter instead of 8
const pCdrAt5 = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov)) {
    if (
      hasEffect(b, (e: any) => e.kind === 'burstCdr') &&
      b.trigger &&
      'count' in b.trigger
    ) {
      b.trigger.count = 5;
    }
  }
});

// nearest-wrong target set: "Affects all allies" mis-scoped to self
const pAtkDmgSelfOnly = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov)) {
    if (
      hasEffect(
        b,
        (e: any) =>
          e.stat === 'attackDamagePct' && Math.abs(e.value - 5.06) < 1e-6
      )
    ) {
      b.target = { kind: 'self' };
    }
  }
});

const pBurstNukeZero = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of slotBlocks(ov, 'burst')) {
    for (const e of b.effects ?? []) {
      if (e.kind === 'flatDamage') {
        e.atkPct = 0;
      }
    }
  }
});

// nearest-wrong: the riders left UNGATED (Wipe Out never inflicted)
const pRmStatus = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov)) {
    b.effects = (b.effects ?? []).filter((e: any) => e.kind !== 'targetStatus');
  }
});

// ---------------------------------------------------------------------------
// hoisted runs (each is a full 180s sim) — 9 total
// ---------------------------------------------------------------------------
const base = run(comp());
const rmGainPierce = run(comp(pRmGainPierce));
const rmPierceDmg = run(comp(pRmPierceDmg));
const pierceDmgBurstCast = run(comp(pPierceDmgOnBurstCast));
const rmCdr = run(comp(pRmCdr));
const cdrAt5 = run(comp(pCdrAt5));
const atkDmgSelfOnly = run(comp(pAtkDmgSelfOnly));
const burstNukeZero = run(comp(pBurstNukeZero));
const rmStatus = run(comp(pRmStatus));

describe('d-killer-wife — fixture non-vacuity', () => {
  it('the comp actually reaches Full Burst and she actually deals damage', () => {
    // A lone Burst I would make ZERO full bursts; every FB-keyed assertion below would be vacuous.
    expect(fbCount(base.events)).toBeGreaterThan(0);
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    for (const m of MATES) {
      expect(base.t[m]).toBeGreaterThan(0);
    }
  });

  it('her burst really casts (its status-gated riders fire at least once)', () => {
    // Proves the burst slot is exercised without relying on burstCast event ownership fields.
    expect(applies(base.events, 'coreDamagePct', 16.26).length).toBeGreaterThan(
      0
    );
  });
});

describe('d-killer-wife S1a — "Full Charge for 3 time(s)" / self -> Gain Pierce', () => {
  it('is a gainPierce EFFECT on a 3-count full-charge counter targeting self', () => {
    // Discriminates against (a) the static hasPierce boolean flag — which cannot step-gate
    // pierce that only turns on after 3 full charges — and (b) a 5- or 8-count mis-keying.
    const b = allBlocks(OV).find((x: any) =>
      hasEffect(x, (e: any) => e.kind === 'gainPierce')
    );
    expect(
      b,
      'no gainPierce effect found — a whole-fight hasPierce flag is the wrong primitive'
    ).toBeTruthy();
    expect(b.slot).toBe('skill1');
    expect(b.target.kind).toBe('self');
    expect(b.trigger.kind).toBe('chargeCounter');
    const count = Array.isArray(b.trigger.count)
      ? b.trigger.count[0]
      : b.trigger.count;
    expect(count).toBe(3);
  });

  it('does not smuggle a whole-fight Pierce tag in via hasPierce', () => {
    // "Gain Pierce for 1 shot" every 3rd full charge is NOT continuous pierce.
    expect(OV.hasPierce ?? false).toBe(false);
  });

  it('is damage-INERT in v1 (pierceDamagePct is documented inert) — teammates byte-identical', () => {
    // Inertness assertion: removing the pierce tag must not move any teammate. If this ever
    // goes red, a Pierce consumer went live and the S1a/S1b pair needs a magnitude test.
    for (const m of MATES) {
      expect(rmGainPierce.t[m]).toBe(base.t[m]);
    }
  });

  it.skip('GAP: "for 1 shot" round-scoped expiry — gainPierce carries only durationSec, no durationShots', () => {
    // No shot-count primitive exists on the gainPierce effect, so the 1-shot window can only be
    // approximated by a durationSec estimate (⚑) — unobservable while pierceDamagePct is inert.
  });
});

describe('d-killer-wife S1b — FB-enter, SR allies, Pierce Damage 13.55% / 10s', () => {
  const evs = () => applies(base.events, 'pierceDamagePct', 13.55);

  it('applies at 13.55 with a finite 10s window (not a permanent buff)', () => {
    expect(evs().length).toBeGreaterThan(0);
    for (const e of evs()) {
      expect(Number.isFinite(e.expiresFrame)).toBe(true);
    }
  });

  it('is WEAPON-scoped to Sniper Rifles — reaches herself + helm, never liter/crown', () => {
    // Discriminating: the nearest-wrong {kind:'allies'} would put liter and crown in the set.
    const tgts = targetsOf(evs());
    expect(tgts.has(SLUG)).toBe(true);
    expect(tgts.has('helm')).toBe(true); // helm is the comp's other SR
    expect(tgts.has('liter')).toBe(false);
    expect(tgts.has('crown')).toBe(false);
  });

  it('is keyed to FULL-BURST ENTRY, not to her own burst cast', () => {
    // "Activates when entering Full Burst" fires on ANY team Full Burst. With a second Burst I
    // (liter) in the comp she does not burst on every rotation, so burstCast under-fires.
    const perTarget = evs().filter((e) => e.targetSlug === SLUG).length;
    expect(perTarget).toBe(fbCount(base.events));

    const wrong = applies(
      pierceDmgBurstCast.events,
      'pierceDamagePct',
      13.55
    ).filter((e) => e.targetSlug === SLUG).length;
    expect(wrong).toBeLessThanOrEqual(perTarget);
  });

  it('is currently damage-inert (pierceDamagePct parsed-but-inert in v1) — nothing moves', () => {
    expect(rmPierceDmg.t[SLUG]).toBe(base.t[SLUG]);
    for (const m of MATES) {
      expect(rmPierceDmg.t[m]).toBe(base.t[m]);
    }
  });
});

describe('d-killer-wife S2a — "Full Charge for 8 time(s)" / all allies -> Burst CD -7s', () => {
  it('is a repeating burstCdr of 7s on all allies (not once-per-battle, not self-only)', () => {
    const b = allBlocks(OV).find((x: any) =>
      hasEffect(x, (e: any) => e.kind === 'burstCdr')
    );
    expect(
      b,
      'no burstCdr block — the CDR line is a rotation accelerant, not a skip'
    ).toBeTruthy();
    expect(b.slot).toBe('skill2');
    expect(b.target.kind).toBe('allies');
    expect(b.trigger.kind).toBe('chargeCounter');
    const count = Array.isArray(b.trigger.count)
      ? b.trigger.count[0]
      : b.trigger.count;
    expect(count).toBe(8);
    const eff = (b.effects ?? []).find((e: any) => e.kind === 'burstCdr');
    expect(eff.seconds).toBe(7);
    expect(eff.oncePerBattle ?? false).toBe(false); // kit states no once-per-battle limit
  });

  it('actually accelerates the rotation (removing it never yields MORE full bursts)', () => {
    expect(fbCount(base.events)).toBeGreaterThanOrEqual(fbCount(rmCdr.events));
    // Non-vacuity: the CDR must move the fight at all — an inert CDR means the block is dead code.
    expect(base.t[SLUG]).not.toBe(rmCdr.t[SLUG]);
  });

  it('the 8-charge threshold is load-bearing (firing it at 5 changes the fight)', () => {
    // Discriminates the S2a/S2b threshold swap — the single most likely blind mis-read.
    expect(fbCount(cdrAt5.events)).toBeGreaterThanOrEqual(fbCount(base.events));
    expect(cdrAt5.t[SLUG]).not.toBe(base.t[SLUG]);
  });
});

describe('d-killer-wife S2b — "Full Charge for 5 time(s)" / all allies -> Attack damage 5.06% / 10s', () => {
  const evs = () => applies(base.events, 'attackDamagePct', 5.06);

  it('lands in the Damage-Up bucket as attackDamagePct, never as atkPct', () => {
    // "Attack damage ▲" is the Damage Up bucket; encoding it as atkPct would scale the ATK
    // stat instead and interact differently with every other support buff in the comp.
    expect(evs().length).toBeGreaterThan(0);
    expect(applies(base.events, 'atkPct', 5.06).length).toBe(0);
    for (const e of evs()) {
      expect(Number.isFinite(e.expiresFrame)).toBe(true);
    } // 10s, not permanent
  });

  it('reaches ALL FOUR allies including herself', () => {
    const tgts = targetsOf(evs());
    expect(tgts.has(SLUG)).toBe(true);
    for (const m of MATES) {
      expect(tgts.has(m)).toBe(true);
    }
  });

  it('is keyed to a 5-count full-charge counter, distinct from the 8-count CDR block', () => {
    const b = allBlocks(OV).find((x: any) =>
      hasEffect(
        x,
        (e: any) =>
          e.stat === 'attackDamagePct' && Math.abs(e.value - 5.06) < 1e-6
      )
    );
    expect(b).toBeTruthy();
    expect(b.slot).toBe('skill2');
    expect(b.trigger.kind).toBe('chargeCounter');
    const count = Array.isArray(b.trigger.count)
      ? b.trigger.count[0]
      : b.trigger.count;
    expect(count).toBe(5);
    // three SEPARATE counters exist (3 / 5 / 8) — none collapsed into another
    const counts = allBlocks(OV)
      .filter((x: any) => x.trigger?.kind === 'chargeCounter')
      .map((x: any) =>
        Array.isArray(x.trigger.count) ? x.trigger.count[0] : x.trigger.count
      );
    expect(new Set(counts)).toEqual(new Set([3, 5, 8]));
  });

  it('re-scoping it to self measurably robs the teammates (proves the ally target set)', () => {
    // Discriminating: under a self-only mis-scope the three mates must lose damage.
    for (const m of MATES) {
      expect(atkDmgSelfOnly.t[m]).not.toBe(base.t[m]);
    }
  });
});

describe('d-killer-wife burst A — 269.28% additional damage + Wipe Out (10s) on the enemy', () => {
  it('carries a flatDamage rider of 269.28% of final ATK', () => {
    const e = effectsOf(slotBlocks(OV, 'burst')).find(
      (x: any) => x.kind === 'flatDamage'
    );
    expect(e, 'burst nuke missing').toBeTruthy();
    expect(e.atkPct).toBeCloseTo(269.28, 2);
    // Burst-cast instant damage lands before the FB window opens -> FB-exempt by timing;
    // an explicit noFb here would double-count the exemption, so it must not be force-set true
    // unless measured (⚑ per-kit noFb is measured-only).
    expect(e.core ?? false).toBe(false); // no "core strike" wording in the kit line
  });

  it('is real damage for HER and inert for everyone else', () => {
    expect(base.t[SLUG]).toBeGreaterThan(burstNukeZero.t[SLUG]);
    for (const m of MATES) {
      expect(burstNukeZero.t[m]).toBe(base.t[m]);
    }
  });

  it('inflicts a named 10s targetStatus authored on an `enemy`-targeted block', () => {
    const b = slotBlocks(OV, 'burst').find((x: any) =>
      hasEffect(x, (e: any) => e.kind === 'targetStatus')
    );
    expect(
      b,
      'no targetStatus effect — Wipe Out is the gate the whole burst B rider hangs on'
    ).toBeTruthy();
    expect(b.target.kind).toBe('enemy'); // validator requires enemy scoping on this channel
    const eff = (b.effects ?? []).find((e: any) => e.kind === 'targetStatus');
    expect(eff.durationSec).toBe(10);
    expect(eff.name).toMatch(/wipe\s*out/i);
  });
});

describe('d-killer-wife burst B — area-dependent riders gated on Wipe Out', () => {
  const statusName = () =>
    (
      effectsOf(slotBlocks(OV, 'burst')).find(
        (e: any) => e.kind === 'targetStatus'
      ) ?? {}
    ).name;

  it('every rider block is name-keyed to the SAME status this burst inflicts', () => {
    // Name-keying is what stops an unrelated kit\'s status from opening this gate.
    const gated = allBlocks(OV).filter((b: any) => b.requiresTargetStatus);
    expect(gated.length).toBeGreaterThan(0);
    for (const b of gated) {
      expect(b.requiresTargetStatus).toBe(statusName());
    }
  });

  it('parts branch: Damage dealt when attacking core 16.26% for 10s, to allies', () => {
    const evs = applies(base.events, 'coreDamagePct', 16.26);
    expect(evs.length).toBeGreaterThan(0);
    for (const e of evs) {
      expect(Number.isFinite(e.expiresFrame)).toBe(true);
    } // 10s window
    // "Affects allies" — a self-only mis-scope would give a single target.
    expect(targetsOf(evs).size).toBeGreaterThanOrEqual(2);
  });

  it("body branch: ATK 12.19% OF THE SKILL USER'S ATK — caster-scaled, flat-resolved", () => {
    // casterAtkPct re-emits as a FLAT ATK number at apply time, so a buffApply value of 12.19
    // would mean the % was mis-encoded as a plain atkPct-style percentage.
    const mine = applies(base.events, 'casterAtkPct').filter(
      (e) => e.value > 12.19 * 10
    );
    const gone = applies(rmStatus.events, 'casterAtkPct').filter(
      (e) => e.value > 12.19 * 10
    );
    const attributable = mine.length - gone.length; // hers = the ones the status gate kills
    const unmodeled = JSON.stringify(OV.unmodeled ?? {});
    // No silent drops: model it, or record the line verbatim in `unmodeled`.
    expect(attributable > 0 || /12\.19/.test(unmodeled)).toBe(true);
    if (attributable > 0) {
      const vals = new Set(mine.map((e) => Math.round(e.value)));
      expect(vals.size).toBe(1); // caster staticAtk is constant -> one flat value
    }
  });

  it('the Wipe Out gate is LIVE both ways (non-vacuity)', () => {
    // Active case asserted above; inactive case here: with no status inflicted the riders must
    // never apply, and the team must measurably lose the buffs.
    expect(applies(rmStatus.events, 'coreDamagePct', 16.26).length).toBe(0);
    for (const m of MATES) {
      expect(rmStatus.t[m]).not.toBe(base.t[m]);
    }
  });

  it.skip('GAP: parts-hit vs body-hit branch selection — the v1 boss is partless', () => {
    // The scope-lock boss exposes core vs non-core only; there is no destructible-part channel
    // and no `requiresNonCore` gate, so the two branches cannot be separated observably. The
    // parts branch is a documented core-proxy; the body branch has no faithful complement gate.
  });

  it.skip('GAP: trigger identity "when ALLIES\' normal attack hits" — triggers are owner-scoped', () => {
    // hitCount/shotFired count the OWNER\'s rounds; there is no cross-unit "any ally hit"
    // trigger, so any encoding under-counts (her shots only) or over-counts (ungated cadence).
  });
});
