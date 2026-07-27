import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

/**
 * helm — SR / Water / Attacker / Burst III (cd 40s, ammo 6, 141f reload, 60f charge,
 * normal mult 69.04, core 200). BLIND per-unit spec test: written from the kit prose alone.
 *
 * FIXTURE: controlComp('helm', false) → liter (B1) / crown (B2) / helm (B3), boss Fire.
 *   The fixed-B3 flag is OFF *because the harness's fixed B3 slot is helm herself* — with the
 *   carry also helm the comp would carry a duplicate slug and the per-slug totals map would
 *   collapse. liter + crown still complete the I→II→III chain, so bursts really cast
 *   (a lone Burst III unit makes ZERO Full Bursts).
 *   Premise used by the damage-event filters below: in this comp only helm carries damage
 *   blocks in the skill2 / burst slots (liter and crown are pure support kits), so
 *   srcSlot-filtered damage events are helm's.
 *
 * KIT LINES (structural digest, each ≤ ~40 chars of quoted text):
 *   s1a  last bullet hits → "Critical Rate of normal attacks ▲" 14.64% / 5s / all allies
 *   s1b  full charge     → recovers 0.59% of caster final Max HP; "Fills Burst Gauge by 14.31%"
 *   s2a  passive         → "Damage to Interruption Parts ▲" 3.08% continuously / all allies
 *   s2b  entering FB     → "Attack Damage ▲" 27.87% for 10 sec / all allies
 *   s2c  full-charge hit → 178.98% of final ATK as additional damage, on the target
 *   b1   burst           → 8236.8% of final ATK as Burst Skill damage, on the enemy
 *   b2   burst           → recovers 54.45% of attack damage as HP for 10s  (GAP — see below)
 *   b3   burst, self     → "Charge Damage Multiplier ▲" 158.4% for 10 ROUND(S)
 *
 * WHY EACH GROUP DISCRIMINATES — every counterfactual is an in-memory withPatchedOverride
 * clone (committed JSON untouched), run against the SAME deterministic fixture:
 *   s1a scope     critRateNormalPct vs unscoped critRatePct — under the wrong model NO
 *                 critRateNormalPct buffApply exists at all (event-visible, not just structural)
 *   s1a targets   allies vs self — liter/crown normal-attack damage must move
 *   s1a duration  5s vs 60s — a 5s window must leave real downtime across a 180s fight
 *   s1a trigger   lastBullet (1 per 6-round magazine) vs shotFired (1 per round) — apply count
 *   s1b gauge     14.31% per full charge is load-bearing for the Full Burst count
 *   s2a inert     parts damage must move NOTHING on the partless scope-lock boss
 *   s2b trigger   fullBurstEnter vs burstCast — helm is the sole B3 so both fire on the same
 *                 rotations; they separate by ORDER in the event stream (a burstCast-keyed apply
 *                 necessarily precedes the fullBurstStart event)
 *   s2b bucket    attackDamagePct (Damage Up) vs atkPct (ATK bucket)
 *   s2c gate      ungated per-full-charge vs fbGate 'inFb'; rider takes no +30% range bonus
 *   b1  FB exempt burst-cast damage never takes the +50% Full-Burst major
 *   b3  duration  durationShots 10 (ROUNDS — spans reloads, ≈17s here) vs durationSec 10
 *   b3  bucket    chargeDamageMultPct vs attackDamagePct; self-scoped (teammates byte-identical)
 */

const CRIT_PCT = 14.64;
const CRIT_SEC = 5;
const GAUGE_PCT = 14.31;
const PARTS_PCT = 3.08;
const ATKDMG_PCT = 27.87;
const ATKDMG_SEC = 10;
const RIDER_PCT = 178.98;
const NUKE_PCT = 8236.8;
const CHARGE_PCT = 158.4;
const CHARGE_ROUNDS = 10;

type Ev = SimEvent & Record<string, any>;
interface Run {
  res: any;
  events: Ev[];
}

function baseOpts(): any {
  return controlComp('helm', false) as any;
}

function exec(opts: any): Run {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: {
      ...(opts.cfg ?? {}),
      onEvent: (ev: SimEvent) => events.push(ev as Ev),
    },
  } as any);
  return { res, events };
}

function patched(mutate: (ov: any) => void): Run {
  const ov = withPatchedOverride('helm', mutate as any);
  const base = baseOpts();
  return exec({ ...base, overrides: { ...(base.overrides ?? {}), helm: ov } });
}

// Lazily memoised counterfactual runs: each is one full 180s sim, executed at most once, and a
// mis-encoded block makes only its OWN test red instead of collapsing the file at import time.
const memo = new Map<string, Run>();
function once(key: string, f: () => Run): Run {
  const hit = memo.get(key);
  if (hit) {
    return hit;
  }
  const r = f();
  memo.set(key, r);
  return r;
}

const BASE = exec(baseOpts());
const OV: any = withPatchedOverride('helm', () => {});
// Gauge fill is carried by the gauge DATA pipeline, not an override block (see s1b adaptation note).
const gauge: any = JSON.parse(
  readFileSync(
    new URL('../../../data/gauge-per-shot.json', import.meta.url),
    'utf8'
  )
);

const dmgOf = (slug: string, r: Run): number => totals(r.res)[slug] ?? 0;
const fbCount = (r: Run): number =>
  r.events.filter((e) => e.kind === 'fullBurstStart').length;
const applies = (r: Run, stat: string, value?: number): Ev[] =>
  r.events.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      (value === undefined || Math.abs(Number(e.value) - value) < 1e-6)
  );
const dmgEvents = (r: Run, slot: string): Ev[] =>
  r.events.filter((e) => e.kind === 'damage' && e.srcSlot === slot);

const slotBlocks = (ov: any, slot: string): any[] => (ov[slot] ?? []) as any[];
function findBlock(ov: any, slot: string, pred: (b: any) => boolean): any {
  const hit = slotBlocks(ov, slot).find(pred);
  if (!hit) {
    throw new Error(`helm ${slot}: no block matching the kit line under test`);
  }
  return hit;
}
const hasBuff =
  (stat: string, value?: number) =>
  (b: any): boolean =>
    (b.effects ?? []).some(
      (e: any) =>
        e.kind === 'buff' &&
        e.stat === stat &&
        (value === undefined || Math.abs(Number(e.value) - value) < 1e-6)
    );
const hasFlat =
  (atkPct: number) =>
  (b: any): boolean =>
    (b.effects ?? []).some(
      (e: any) =>
        e.kind === 'flatDamage' && Math.abs(Number(e.atkPct) - atkPct) < 1e-6
    );
const buffEff = (b: any, stat: string): any =>
  (b.effects as any[]).find((e) => e.kind === 'buff' && e.stat === stat);
const flatEff = (b: any, atkPct: number): any =>
  (b.effects as any[]).find(
    (e) => e.kind === 'flatDamage' && Math.abs(Number(e.atkPct) - atkPct) < 1e-6
  );
// "Activates when attacking with Full Charge" on a charge weapon: every trigger pull IS a full
// charge, so shotFired is the faithful encoding; a chargeCounter with threshold 1 is equivalent.
const fullChargeTrigger = (t: any): boolean =>
  t?.kind === 'shotFired' ||
  (t?.kind === 'chargeCounter' &&
    (t.count === 1 ||
      (Array.isArray(t.count) && t.count.every((c: number) => c === 1))));

describe('helm — fixture sanity', () => {
  it('bursts, and all three units deal damage (no vacuous inertness checks)', () => {
    expect(fbCount(BASE)).toBeGreaterThan(0);
    expect(unitOf(BASE.res, 'helm').totalDamage).toBeGreaterThan(0);
    expect(unitOf(BASE.res, 'helm').totalDamage).toBeCloseTo(
      dmgOf('helm', BASE),
      3
    );
    expect(dmgOf('liter', BASE)).toBeGreaterThan(0);
    expect(dmgOf('crown', BASE)).toBeGreaterThan(0);
  });
});

describe('helm — override hygiene', () => {
  it('is slot-keyed, all three slots populated, no ignored/unsupported effects', () => {
    for (const slot of ['skill1', 'skill2', 'burst'] as const) {
      expect(Array.isArray(OV[slot])).toBe(true);
      expect((OV[slot] as any[]).length).toBeGreaterThan(0);
      for (const b of OV[slot] as any[]) {
        expect(b.slot).toBe(slot);
        for (const e of (b.effects ?? []) as any[]) {
          expect(['ignored', 'unsupported']).not.toContain(e.kind);
        }
      }
    }
    expect(OV.blocks).toBeUndefined();
  });
});

describe('helm — s1a: last-bullet normal-attack crit 14.64% / 5s / all allies', () => {
  it('is encoded as lastBullet → allies → critRateNormalPct, 5s, time-bounded', () => {
    const b = findBlock(OV, 'skill1', hasBuff('critRateNormalPct', CRIT_PCT));
    expect(b.trigger.kind).toBe('lastBullet');
    expect(b.target.kind).toBe('allies');
    expect(b.target.excludeSelf ?? false).toBe(false);
    const e = buffEff(b, 'critRateNormalPct');
    expect(e.durationSec).toBe(CRIT_SEC);
    expect(e.durationShots).toBeUndefined();
  });

  it('emits a NORMAL-SCOPED crit buff to all three allies, with real downtime', () => {
    // Discriminator: under the nearest-wrong unscoped model (critRatePct) this filter is EMPTY.
    const evs = applies(BASE, 'critRateNormalPct', CRIT_PCT);
    expect(evs.length).toBeGreaterThan(0);
    const perAlly = new Map<string, number>();
    for (const e of evs) {
      const k = String(e.targetSlug);
      perAlly.set(k, (perAlly.get(k) ?? 0) + 1);
    }
    expect([...perAlly.keys()].sort()).toEqual(['crown', 'helm', 'liter']);
    // Non-vacuity of the 5s window: the applies cannot tile the 180s fight.
    expect((perAlly.get('helm') ?? 0) * CRIT_SEC).toBeLessThan(180);
  });

  it('an unscoped crit model cannot LOSE damage (directional corroboration of scope)', () => {
    const wrong = once('critUnscoped', () =>
      patched((ov) => {
        buffEff(
          findBlock(ov, 'skill1', hasBuff('critRateNormalPct', CRIT_PCT)),
          'critRateNormalPct'
        ).stat = 'critRatePct';
      })
    );
    // Unscoped crit also feeds any crit-eligible skill/burst hit; it is never smaller.
    // (The hard discrimination lives in the event-stream test above.)
    expect(dmgOf('helm', wrong)).toBeGreaterThanOrEqual(
      dmgOf('helm', BASE) - 1e-6
    );
  });

  it('is ally-wide, not self-only', () => {
    const wrong = once('critSelf', () =>
      patched((ov) => {
        findBlock(ov, 'skill1', hasBuff('critRateNormalPct', CRIT_PCT)).target =
          { kind: 'self' };
      })
    );
    expect(dmgOf('liter', wrong)).toBeLessThan(dmgOf('liter', BASE));
    expect(dmgOf('crown', wrong)).toBeLessThan(dmgOf('crown', BASE));
  });

  it('the 5s duration binds (a 60s window strictly out-damages it)', () => {
    const wrong = once('critLong', () =>
      patched((ov) => {
        buffEff(
          findBlock(ov, 'skill1', hasBuff('critRateNormalPct', CRIT_PCT)),
          'critRateNormalPct'
        ).durationSec = 60;
      })
    );
    expect(dmgOf('liter', wrong)).toBeGreaterThan(dmgOf('liter', BASE));
  });

  it('fires once per 6-round magazine (lastBullet), not once per round (shotFired)', () => {
    const wrong = once('critShotFired', () =>
      patched((ov) => {
        findBlock(
          ov,
          'skill1',
          hasBuff('critRateNormalPct', CRIT_PCT)
        ).trigger = {
          kind: 'shotFired',
        };
      })
    );
    const b = applies(BASE, 'critRateNormalPct', CRIT_PCT).length;
    const w = applies(wrong, 'critRateNormalPct', CRIT_PCT).length;
    expect(w).toBeGreaterThan(b * 2); // a 6-round magazine ⇒ ≈6× more applications
  });
});

describe('helm — s1b: full-charge team heal + 14.31% burst-gauge fill', () => {
  // ADAPTATION (RECON_ERROR — encoding LOCATION, not kit line): the blind writer encoded the
  // 14.31%-per-full-charge fill as an override `fillGauge` block in skill1. The driver carries it in
  // the gauge DATA pipeline (data/gauge-per-shot.json → helm.flatPerTrigger 1431; datamined 2-way:
  // synergy fixed_add 14.31 AND rl3 59.73 = 8.4 + 3×14.31), added per trigger pull, unscaled by
  // camera focus, suppressed during FB/chain. The kit line itself (14.31% per full charge,
  // load-bearing for rotation) is unchanged — only WHERE it lives differs. Repointed at the gauge
  // data; it is not override-patchable, so the rotation-cadence proof lives in the gauge pipeline.
  it('fills the gauge 14.31% per full charge (datamined per-trigger flat fill)', () => {
    expect(gauge.helm.flatPerTrigger, 'kit 14.31% → flatPerTrigger 1431').toBe(
      Math.round(GAUGE_PCT * 100)
    );
  });

  it('the gauge fill is load-bearing for rotation cadence (non-zero datamined fill)', () => {
    // A non-zero per-trigger fill accelerates every Full Burst timestamp; zeroing it would reduce
    // the FB count (gauge-pipeline behaviour, not override-patchable). Assert the live magnitude.
    expect(gauge.helm.flatPerTrigger).toBeGreaterThan(0);
    expect(gauge.helm.flatPerTrigger).toBe(Math.round(GAUGE_PCT * 100));
  });

  it('does not silently drop the 0.59%-of-caster-Max-HP recovery', () => {
    // Tandem risk (why this matters even with no HP pool): a heal feeds an ally's `recovery`
    // trigger — crown is in this very fixture.
    const encoded = slotBlocks(OV, 'skill1').some((b) =>
      ((b.effects ?? []) as any[]).some((e) =>
        /heal|recover/i.test(String(e.kind))
      )
    );
    const documented = ((OV.unmodeled?.skill1 ?? []) as string[]).some((t) =>
      /0\.59/.test(t)
    );
    expect(encoded || documented).toBe(true);
  });
});

describe('helm — s2a: 3.08% interruption-parts damage (continuous, all allies)', () => {
  it('is a passive ally-wide partsDamagePct buff with no duration', () => {
    const b = findBlock(OV, 'skill2', hasBuff('partsDamagePct', PARTS_PCT));
    expect(b.trigger.kind).toBe('passive');
    expect(b.target.kind).toBe('allies');
    expect(buffEff(b, 'partsDamagePct').durationSec).toBeUndefined();
  });

  it('is damage-inert on the partless scope-lock boss', () => {
    const zeroed = once('partsZero', () =>
      patched((ov) => {
        buffEff(
          findBlock(ov, 'skill2', hasBuff('partsDamagePct', PARTS_PCT)),
          'partsDamagePct'
        ).value = 0;
      })
    );
    for (const u of ['helm', 'liter', 'crown']) {
      expect(dmgOf(u, zeroed)).toBeCloseTo(dmgOf(u, BASE), 3);
    }
  });
});

describe('helm — s2b: Full-Burst-enter Attack Damage ▲27.87% for 10s (all allies)', () => {
  it('is fullBurstEnter → allies → attackDamagePct 27.87 / 10s, ungated', () => {
    const b = findBlock(OV, 'skill2', hasBuff('attackDamagePct', ATKDMG_PCT));
    expect(b.trigger.kind).toBe('fullBurstEnter');
    expect(b.target.kind).toBe('allies');
    expect(b.ownBurstGate).toBeUndefined();
    expect(buffEff(b, 'attackDamagePct').durationSec).toBe(ATKDMG_SEC);
  });

  it('applies once per Full Burst to every ally, AFTER the FB opens (not at burst cast)', () => {
    const evs = applies(BASE, 'attackDamagePct', ATKDMG_PCT);
    expect(evs.length).toBe(fbCount(BASE) * 3);
    const firstFb = BASE.events.findIndex((e) => e.kind === 'fullBurstStart');
    const firstApply = BASE.events.findIndex(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'attackDamagePct' &&
        Math.abs(Number(e.value) - ATKDMG_PCT) < 1e-6
    );
    expect(firstFb).toBeGreaterThanOrEqual(0);
    // A burstCast-keyed apply would necessarily land BEFORE the FB window opened.
    expect(firstApply).toBeGreaterThan(firstFb);
  });

  it('lands in the Damage-Up bucket, not the ATK bucket', () => {
    const wrong = once('atkBucket', () =>
      patched((ov) => {
        buffEff(
          findBlock(ov, 'skill2', hasBuff('attackDamagePct', ATKDMG_PCT)),
          'attackDamagePct'
        ).stat = 'atkPct';
      })
    );
    expect(dmgOf('helm', wrong)).not.toBeCloseTo(dmgOf('helm', BASE), 1);
  });

  it('the 10s window binds (a 40s window strictly out-damages it)', () => {
    const wrong = once('atkDmgLong', () =>
      patched((ov) => {
        buffEff(
          findBlock(ov, 'skill2', hasBuff('attackDamagePct', ATKDMG_PCT)),
          'attackDamagePct'
        ).durationSec = 40;
      })
    );
    expect(dmgOf('helm', wrong)).toBeGreaterThan(dmgOf('helm', BASE));
  });
});

describe('helm — s2c: 178.98%-of-final-ATK full-charge rider (on the target)', () => {
  it('is a per-full-charge flatDamage on the enemy, no core gate, FB-eligible by timing', () => {
    const b = findBlock(OV, 'skill2', hasFlat(RIDER_PCT));
    expect(fullChargeTrigger(b.trigger)).toBe(true);
    expect(b.target.kind).toBe('enemy');
    expect(b.fbGate).toBeUndefined();
    expect(b.requiresCore ?? false).toBe(false);
    const e = flatEff(b, RIDER_PCT);
    expect(e.core ?? false).toBe(false); // the text does not say "core strike"
    expect(e.noFb ?? false).toBe(false); // riders take Full Burst by timing (default ON)
  });

  it('fires outside Full Burst as well as inside, and never takes the +30% range bonus', () => {
    const riders = dmgEvents(BASE, 'skill2'); // only helm carries a skill2 damage block here
    expect(riders.length).toBeGreaterThan(fbCount(BASE));
    expect(riders.every((e) => e.rangeApplied === false)).toBe(true);
    // Non-vacuity: the fixture genuinely exercises BOTH FB states for this rider.
    expect(riders.some((e) => e.inFullBurst === false)).toBe(true);
    expect(riders.some((e) => e.inFullBurst === true)).toBe(true);
  });

  it('is load-bearing and helm-local', () => {
    const zeroed = once('riderZero', () =>
      patched((ov) => {
        flatEff(findBlock(ov, 'skill2', hasFlat(RIDER_PCT)), RIDER_PCT).atkPct =
          0;
      })
    );
    expect(dmgOf('helm', zeroed)).toBeLessThan(dmgOf('helm', BASE));
    expect(dmgOf('liter', zeroed)).toBeCloseTo(dmgOf('liter', BASE), 3);
    expect(dmgOf('crown', zeroed)).toBeCloseTo(dmgOf('crown', BASE), 3);
  });

  it('is NOT Full-Burst-gated', () => {
    const wrong = once('riderFbGate', () =>
      patched((ov) => {
        findBlock(ov, 'skill2', hasFlat(RIDER_PCT)).fbGate = 'inFb';
      })
    );
    expect(dmgOf('helm', wrong)).toBeLessThan(dmgOf('helm', BASE));
  });
});

describe('helm — burst: 8236.8%-of-final-ATK Burst Skill damage', () => {
  it('is a burstCast flatDamage on the enemy', () => {
    const b = findBlock(OV, 'burst', hasFlat(NUKE_PCT));
    expect(b.trigger.kind).toBe('burstCast');
    expect(b.target.kind).toBe('enemy');
  });

  it('lands once per rotation and never takes the +50% Full-Burst major', () => {
    const hits = dmgEvents(BASE, 'burst'); // helm is the only burst-damage carrier in this comp
    expect(hits.length).toBe(fbCount(BASE));
    expect(hits.every((e) => e.fbMajorApplied === false)).toBe(true);
  });

  it('is load-bearing and helm-local', () => {
    const zeroed = once('nukeZero', () =>
      patched((ov) => {
        flatEff(findBlock(ov, 'burst', hasFlat(NUKE_PCT)), NUKE_PCT).atkPct = 0;
      })
    );
    expect(dmgOf('helm', zeroed)).toBeLessThan(dmgOf('helm', BASE));
    expect(dmgOf('liter', zeroed)).toBeCloseTo(dmgOf('liter', BASE), 3);
    expect(dmgOf('crown', zeroed)).toBeCloseTo(dmgOf('crown', BASE), 3);
  });
});

describe('helm — burst: Charge Damage Multiplier ▲158.4% for 10 ROUND(S) (self)', () => {
  it('is a self chargeDamageMultPct buff with a ROUND-count duration, not seconds', () => {
    const b = findBlock(
      OV,
      'burst',
      hasBuff('chargeDamageMultPct', CHARGE_PCT)
    );
    expect(b.trigger.kind).toBe('burstCast');
    expect(b.target.kind).toBe('self');
    const e = buffEff(b, 'chargeDamageMultPct');
    expect(e.durationShots).toBe(CHARGE_ROUNDS);
    expect(e.durationSec).toBeUndefined();
  });

  it('emits on helm only, once per burst, carrying durationShots 10', () => {
    const evs = applies(BASE, 'chargeDamageMultPct', CHARGE_PCT);
    expect(evs.length).toBe(fbCount(BASE));
    expect(evs.every((e) => e.targetSlug === 'helm')).toBe(true);
    expect(evs.every((e) => e.durationShots === CHARGE_ROUNDS)).toBe(true);
  });

  it('rounds ≠ seconds: a durationSec-10 model moves helm damage, and it is self-scoped', () => {
    // 10 rounds on a 6-round magazine spans a full reload (≈17s of firing) — a 10s wall-clock
    // window is a strictly different exposure.
    const wrong = once('chargeSeconds', () =>
      patched((ov) => {
        const e = buffEff(
          findBlock(ov, 'burst', hasBuff('chargeDamageMultPct', CHARGE_PCT)),
          'chargeDamageMultPct'
        );
        delete e.durationShots;
        e.durationSec = 10;
      })
    );
    expect(dmgOf('helm', wrong)).not.toBeCloseTo(dmgOf('helm', BASE), 1);
    expect(dmgOf('liter', wrong)).toBeCloseTo(dmgOf('liter', BASE), 3);
    expect(dmgOf('crown', wrong)).toBeCloseTo(dmgOf('crown', BASE), 3);
  });

  it('sits in the charge bucket, not the generic Damage-Up bucket', () => {
    const wrong = once('chargeBucket', () =>
      patched((ov) => {
        buffEff(
          findBlock(ov, 'burst', hasBuff('chargeDamageMultPct', CHARGE_PCT)),
          'chargeDamageMultPct'
        ).stat = 'attackDamagePct';
      })
    );
    expect(dmgOf('helm', wrong)).not.toBeCloseTo(dmgOf('helm', BASE), 1);
  });
});

describe('helm — burst: 54.45%-of-attack-damage recovery for 10s', () => {
  it('records the un-modelable lifesteal line rather than silently dropping it', () => {
    const documented = ((OV.unmodeled?.burst ?? []) as string[]).some((t) =>
      /54\.45/.test(t)
    );
    const encoded = slotBlocks(OV, 'burst').some((b) =>
      ((b.effects ?? []) as any[]).some((e) =>
        /heal|lifesteal|recover/i.test(String(e.kind))
      )
    );
    expect(documented || encoded).toBe(true);
  });

  it.skip('GAP: damage-proportional lifesteal has no primitive (no HP pool in v1, and no lifesteal EffectDef kind); consequence to flag — an ally with a `recovery` trigger (crown, in this very fixture) is under-fed by helm in-sim', () => {
    /* unobservable payload: no heal magnitude is emitted on the event stream */
  });
});
