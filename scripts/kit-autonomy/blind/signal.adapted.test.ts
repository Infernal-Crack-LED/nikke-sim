/* eslint-disable @typescript-eslint/no-explicit-any */
// ADAPTED COPY (driver reconciliation, 2026-08-05): pristine blind artifact preserved at
// blind/signal.test.ts. Structural corrections to blind-writer assumptions that were
// unverifiable from the redacted packet — assertion INTENT unchanged:
//   1. harness import path (the blind dir has no ../lib/harness — the shared harness lives
//      at scripts/tests/lib/harness.js; ../../tests/lib/harness.js from here).
//   2. cfg.onEvent placement: run() passed onEvent at the TOP LEVEL of the runComp options;
//      CompOptions threads it under `cfg` (harnessNote: 'cfg.onEvent: (ev) => void'). Moved
//      into cfg so the event log actually populates — no assertion was reworded.
/**
 * signal — kit spec test (BLIND author: kit prose + harness/schema docs only;
 * no access to the driver's override, tests, or reasoning).
 *
 * KIT — Signal (`signal`), SMG / Fire / Attacker / Burst II, 120 ammo, 1 hit per shot.
 *   skill1: trigger 'after landing 60 normal attack(s)', target = the enemy;
 *           DEF -5.94% and ATK -5.94%, 5 sec each.
 *   skill2: self; trigger 'when entering Full Burst'; 44.08% lifesteal over 10 sec.
 *   burst:  enemies in range; 229.22% of final ATK as damage; DEF -12.34% for 10 sec.
 *
 * FIXTURE — controlComp('signal', true). Signal is a Burst II, so the fixed Burst III
 * slot is MANDATORY: without it the burst chain never completes, the fight has zero
 * Full Bursts, and both skill2's fullBurstEnter trigger and the burst window would be
 * vacuous. The fixture's other Burst II unit is also what makes the skill2 trigger
 * identity (fullBurstEnter vs burstCast) discriminable at all.
 *
 * LOAD-BEARING READINGS THIS FILE ENCODES
 *  - skill1 is a ROUND counter, not a magazine event: 60 landed normal attacks on a
 *    120-round SMG magazine is ~2 procs per magazine. Nearest-wrong models are
 *    lastBullet / hitCount:120 (half the procs) and shotFired (one per round).
 *  - skill2 keys on ENTERING Full Burst, i.e. ANY team Full Burst — not 'when using
 *    Burst Skill'. Signal shares Burst II with a fixture ally, so a burstCast key
 *    would systematically UNDER-fire.
 *  - The two DEF-down lines and the ATK-down line are ENEMY debuffs. The effect schema
 *    exposes no enemy-DEF consumer (`defPct` is documented as SELF DEF and inert;
 *    `damageTakenPct` is a different, multiplicative mechanic), so the shred is
 *    expected to be RECORDED on the boss debuff channel but damage-INERT. Re-encoding
 *    DEF-down as damageTakenPct would be a fudge; the inertness assertions catch it.
 *    If those assertions go RED, the driver credited the shred through some damage
 *    channel and that conversion needs measured justification, not a fit.
 *  - Burst-cast damage lands before the Full Burst window opens, so the 229.22% hit
 *    takes no +50% Full Burst major: patching noFb must be a strict no-op.
 *  - The kit never says 'core strike damage', so the burst hit is body-only: patching
 *    core:true must strictly RAISE signal's damage.
 *
 * SHAPE NOTE — the packet documents two shapes for an override slot (a bare Block[]
 * and a CharacterSkills carrying .blocks). blocksOf() normalises both so the
 * counterfactuals mutate the real array either way; withPatchedOverride clones, so the
 * committed JSON is never touched.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

type Slot = 'skill1' | 'skill2' | 'burst';
type AnyRec = Record<string, any>;

const SLUG = 'signal';

function blocksOf(ov: AnyRec, slot: Slot): AnyRec[] {
  const s = ov?.[slot];
  if (Array.isArray(s)) return s as AnyRec[];
  if (s && Array.isArray((s as AnyRec).blocks)) return (s as AnyRec).blocks as AnyRec[];
  return [];
}

function effectsOf(ov: AnyRec, slot: Slot): AnyRec[] {
  return blocksOf(ov, slot).flatMap((b) => (b.effects ?? []) as AnyRec[]);
}

/** Read-only view of the committed override (an unmutated clone). */
const OV: AnyRec = withPatchedOverride(SLUG, () => {}) as unknown as AnyRec;

function comp(ov?: unknown): AnyRec {
  const base = controlComp(SLUG, true) as unknown as AnyRec;
  if (!ov) return base;
  return { ...base, overrides: { ...(base.overrides ?? {}), [SLUG]: ov } };
}

function run(opts: AnyRec) {
  const events: AnyRec[] = [];
  const res = runComp({
    ...opts,
    cfg: {
      ...(opts.cfg ?? {}),
      onEvent: (ev: SimEvent) => events.push(ev as unknown as AnyRec),
    },
  } as Parameters<typeof runComp>[0]);
  return { res, events };
}

const near = (a: number, b: number) => Math.abs(Math.abs(a) - b) < 1e-6;

/** Boss-held debuffs are the only buffApply events with BOTH indices null. */
const bossDebuffs = (events: AnyRec[], value: number) =>
  events.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.casterIdx === null &&
      e.targetIdx === null &&
      near(e.value, value),
  );

/** One proc = one application frame = one distinct expiry frame. */
const procCount = (events: AnyRec[], value: number) =>
  new Set(bossDebuffs(events, value).map((e) => e.expiresFrame)).size;

const appliesWithValue = (events: AnyRec[], value: number) =>
  events.filter((e) => e.kind === 'buffApply' && near(e.value, value));

// ---------------------------------------------------------------- counterfactuals
const P_S1_120 = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of blocksOf(ov, 'skill1')) {
    if (b.trigger?.kind === 'hitCount') b.trigger.count = 120;
  }
});
const P_S1_INERT = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of blocksOf(ov, 'skill1')) b.effects = [];
});
const P_S2_OFF = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of blocksOf(ov, 'skill2')) b.effects = [];
});
const P_BURST_NODMG = withPatchedOverride(SLUG, (ov: any) => {
  for (const e of effectsOf(ov, 'burst')) if (e.kind === 'flatDamage') e.atkPct = 0;
});
const P_BURST_CORE = withPatchedOverride(SLUG, (ov: any) => {
  for (const e of effectsOf(ov, 'burst')) if (e.kind === 'flatDamage') e.core = true;
});
const P_BURST_NOFB = withPatchedOverride(SLUG, (ov: any) => {
  for (const e of effectsOf(ov, 'burst')) if (e.kind === 'flatDamage') e.noFb = true;
});
const P_BURST_NODEBUFF = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of blocksOf(ov, 'burst')) {
    b.effects = ((b.effects ?? []) as AnyRec[]).filter((e) => e.kind !== 'buff');
  }
});

// ------------------------------------------------------------------- hoisted runs
const BASE = run(comp());
const R_S1_120 = run(comp(P_S1_120));
const R_S1_INERT = run(comp(P_S1_INERT));
const R_S2_OFF = run(comp(P_S2_OFF));
const R_B_NODMG = run(comp(P_BURST_NODMG));
const R_B_CORE = run(comp(P_BURST_CORE));
const R_B_NOFB = run(comp(P_BURST_NOFB));
const R_B_NODEBUFF = run(comp(P_BURST_NODEBUFF));

const T_BASE = totals(BASE.res);

describe('signal — fixture sanity', () => {
  it('the control comp actually reaches Full Burst (else every FB-keyed claim is vacuous)', () => {
    const fbs = BASE.events.filter((e) => e.kind === 'fullBurstStart');
    expect(fbs.length).toBeGreaterThan(0);
    expect(T_BASE[SLUG]).toBeGreaterThan(0);
  });
});

describe('signal skill1 — 60-round hit counter, enemy DEF/ATK down 5.94% for 5 sec', () => {
  it('is authored as a hitCount:60 enemy-targeted block carrying the 5.94% / 5 sec debuff(s)', () => {
    const hc = blocksOf(OV, 'skill1').filter((b) => b.trigger?.kind === 'hitCount');
    // TRIGGER IDENTITY: a magazine-keyed (lastBullet) or per-shot (shotFired) author
    // fails here outright.
    expect(hc.length).toBeGreaterThan(0);
    expect(hc.some((b) => b.trigger.count === 60)).toBe(true);
    // TARGET SET: the kit says 'Affects the target(s)' — the enemy, never allies/self.
    for (const b of hc) expect(b.target?.kind).toBe('enemy');

    const at594 = hc
      .flatMap((b) => (b.effects ?? []) as AnyRec[])
      .filter((e) => e.kind === 'buff' && near(e.value, 5.94));
    expect(at594.length).toBeGreaterThan(0);
    // DURATION SEMANTICS: wall-clock seconds, not rounds/stacks.
    for (const e of at594) {
      expect(e.durationSec).toBe(5);
      expect(e.durationShots).toBeUndefined();
    }
    // NO SILENT DROP of the second (ATK down) line: modeled, or recorded as unmodeled.
    const atkDownRecorded =
      at594.length >= 2 ||
      ((OV.unmodeled?.skill1 ?? []) as string[]).some((s) => /ATK/i.test(s));
    expect(atkDownRecorded).toBe(true);
  });

  it('procs many times per fight and every 5.94% application is attributable to signal', () => {
    const procs = procCount(BASE.events, 5.94);
    // A passive / fullBurstEnter mis-key lands in single digits; a shotFired mis-key
    // lands in the thousands. A 120-round SMG at ~16 effective rounds/sec over 180s
    // gives ~40-60 procs at a 60-round threshold.
    expect(procs).toBeGreaterThan(10);
    expect(procs).toBeLessThan(500);
    // ATTRIBUTION: nothing else in the control comp emits a 5.94% boss debuff.
    expect(procCount(R_S1_INERT.events, 5.94)).toBe(0);
  });

  it('the threshold is a ROUND count — doubling it to 120 halves the procs', () => {
    const at60 = procCount(BASE.events, 5.94);
    const at120 = procCount(R_S1_120.events, 5.94);
    expect(at120).toBeGreaterThan(0);
    // Estimate-free discriminator. A magazine-keyed (lastBullet) or time-keyed model
    // is untouched by the count patch and lands at ratio ~1.0.
    const ratio = at60 / at120;
    expect(ratio).toBeGreaterThan(1.6);
    expect(ratio).toBeLessThan(2.6);
  });

  it('the debuff lands on the boss only — never on an ally or on self', () => {
    const all = appliesWithValue(BASE.events, 5.94);
    expect(all.length).toBeGreaterThan(0);
    for (const e of all) {
      expect(e.casterIdx).toBeNull();
      expect(e.targetIdx).toBeNull();
    }
  });

  it('the skill1 shred moves NO damage (no enemy-DEF/ATK consumer exists)', () => {
    // Pins the modeling GAP and, in the same motion, is the fudge detector: if the
    // DEF-down were re-encoded as damageTakenPct (or any damage channel), team totals
    // would move here. A conversion like that needs measured justification.
    expect(totals(R_S1_INERT.res)).toEqual(T_BASE);
  });

  it.skip('GAP — the MAGNITUDE of enemy DEF -5.94% is unobservable: the schema has no enemy-DEF consumer (defPct is self-DEF and inert), so only the trigger/target/duration are testable', () => {
    // Needs an engine primitive for boss-DEF reduction plus a measured boss DEF value.
  });

  it.skip('GAP — enemy ATK -5.94% is structurally unobservable at scope lock: the boss deals no damage in v1, so an enemy ATK debuff has no consumer by construction', () => {
    // Record-only line; nothing to assert beyond its presence (covered structurally).
  });
});

describe('signal skill2 — self lifesteal on entering Full Burst', () => {
  it('keys on fullBurstEnter (any team Full Burst), targets self, and is not a damage buff', () => {
    const s2 = blocksOf(OV, 'skill2');
    const fbe = s2.filter((b) => b.trigger?.kind === 'fullBurstEnter');
    const recorded =
      fbe.length > 0 ||
      ((OV.unmodeled?.skill2 ?? []) as string[]).some((s) => /recover|HP/i.test(s));
    expect(recorded).toBe(true);
    // TRIGGER IDENTITY: 'entering Full Burst' is a team event. Keying it to the
    // owner's own cast under-fires whenever the other Burst II ally takes the stage.
    expect(s2.some((b) => b.trigger?.kind === 'burstCast')).toBe(false);
    for (const b of fbe) expect(b.target?.kind).toBe('self');
    // The classic mis-encode: lifesteal read as a 44.08% damage/ATK buff.
    for (const e of effectsOf(OV, 'skill2')) {
      expect(e.kind).not.toBe('flatDamage');
      expect(e.kind).not.toBe('hitRepeat');
      expect(e.kind).not.toBe('dot');
      if (e.kind === 'buff') expect(near(e.value, 44.08)).toBe(false);
    }
  });

  it('emits no 44.08% buff anywhere in the fight', () => {
    expect(appliesWithValue(BASE.events, 44.08).length).toBe(0);
  });

  it('is damage-inert for the whole team — the recovery is self-scoped', () => {
    // TARGET-SET discriminator: the control comp contains an on-recovery consumer
    // ally, so mis-targeting the heal to allies would move that ally's damage.
    expect(totals(R_S2_OFF.res)).toEqual(T_BASE);
  });

  it.skip('GAP — the 44.08% lifesteal amount is unobservable: v1 models no HP pool and cfg.onEvent has no recovery event kind, so only the trigger/target are testable', () => {
    // Would need an HP pool, or a teammate whose damage keys off receiving a heal.
  });
});

describe('signal burst — 229.22% of final ATK + enemy DEF -12.34% for 10 sec', () => {
  it('is authored as a burstCast enemy block carrying the 229.22% hit and the 12.34% / 10 sec debuff', () => {
    const b = blocksOf(OV, 'burst');
    expect(b.length).toBeGreaterThan(0);
    for (const blk of b) {
      expect(blk.trigger?.kind).toBe('burstCast');
      expect(blk.target?.kind).toBe('enemy');
    }
    const dmg = effectsOf(OV, 'burst').filter((e) => e.kind === 'flatDamage');
    expect(dmg.length).toBe(1);
    expect(dmg[0].atkPct).toBeCloseTo(229.22, 5);
    // Kit says nothing about core strike damage.
    expect(dmg[0].core ?? false).toBe(false);

    const def = effectsOf(OV, 'burst').filter(
      (e) => e.kind === 'buff' && near(e.value, 12.34),
    );
    const defRecorded =
      def.length > 0 ||
      ((OV.unmodeled?.burst ?? []) as string[]).some((s) => /DEF/i.test(s));
    expect(defRecorded).toBe(true);
    for (const e of def) {
      expect(e.durationSec).toBe(10);
      // A DEF cut is subtractive on the enemy's DEF; damageTakenPct is a separate,
      // multiplicative Damage-Taken bucket. Substituting one for the other is a fudge.
      expect(e.stat).not.toBe('damageTakenPct');
    }
  });

  it('the 229.22% hit is live and non-vacuous — zeroing it strictly lowers signal damage', () => {
    expect(totals(R_B_NODMG.res)[SLUG]).toBeLessThan(T_BASE[SLUG]);
  });

  it('the burst hit takes NO Full Burst major — forcing noFb is a strict no-op', () => {
    // Burst-cast damage resolves before the Full Burst window opens. A model that let
    // the nuke ride the +50% major would drop when noFb is forced on.
    expect(totals(R_B_NOFB.res)).toEqual(T_BASE);
  });

  it('the burst hit is body-only — forcing core:true strictly raises signal damage', () => {
    // Proves the shipped model does not already core (which the kit text never grants)
    // and that the core path is reachable, so the previous assertion is not vacuous.
    expect(totals(R_B_CORE.res)[SLUG]).toBeGreaterThan(T_BASE[SLUG]);
  });

  it('the 12.34% debuff fires once per signal burst, on the boss, and moves no damage', () => {
    const procs = procCount(BASE.events, 12.34);
    expect(procs).toBeGreaterThan(1);
    expect(procs).toBeLessThan(25);
    for (const e of bossDebuffs(BASE.events, 12.34)) {
      expect(e.casterIdx).toBeNull();
      expect(e.targetIdx).toBeNull();
    }
    // ATTRIBUTION: removing signal's burst buff removes every 12.34% application.
    expect(procCount(R_B_NODEBUFF.events, 12.34)).toBe(0);
    // Same GAP + fudge detector as skill1.
    expect(totals(R_B_NODEBUFF.res)).toEqual(T_BASE);
  });

  it.skip('GAP — the MAGNITUDE of enemy DEF -12.34% is unobservable for the same reason as skill1: no enemy-DEF consumer, and boss DEF at scope lock is itself unmeasured', () => {
    // This is signal's whole team value; it is currently recorded but damage-inert.
  });

  it.skip('GAP — the +30% range bonus exclusion on the burst rider is engine-forced and not readable without pinning the damage-event field names, which a blind author must not guess', () => {
    // Testable sighted via the damage event's rangeApplied flag.
  });
});
