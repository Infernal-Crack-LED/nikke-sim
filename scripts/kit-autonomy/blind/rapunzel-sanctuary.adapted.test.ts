/**
 * rapunzel-sanctuary — RL/Fire/Supporter/Burst II (cd 40 s, ammo 6, charge 60 f, reload 141 f,
 * normalMult 61.3, coreMult 200). BLIND per-unit kit spec: written from the kit prose alone, with
 * no sight of the driver's override, tests or reasoning.
 *
 * WHAT THE KIT SAYS (structural read: ■ header + "Affects …" clause + the stat before ▲/▼)
 *   S1-a  on a Full Charge attack / all allies ...... restores HP "3.9% of the skill user's" max HP
 *   S1-b  on entering Full Burst / self + allies in the "Into the Fray" state ... Attack Damage ▲27.45%, 10 s
 *   S1-c  on using Nanoparticle Injection / self ... Burst-Skill cooldown ▲40 s (unremovable) +
 *                                                   Nanoparticle Consumption: DEF ▲10% (continuous)
 *   S1-d  only when AT Full Charge during a Full Charge attack / self ... immunity to charge-speed
 *                                                   INCREASE and DECREASE effects, continuous
 *   S2-a  Full Charge held ≥1 s while NOT in Goddess Blessing / self ... shared shield 7.39% of max HP,
 *                                                   removed when charging ends
 *   S2-b  same trigger / all allies ................ Goddess Blessing: DEF ▲42.24% OF THE CASTER'S DEF, 10 s
 *   S2-c  on entering Full Burst / self + "Into the Fray" allies ... ATK ▲29.17% OF THE CASTER'S ATK, 10 s
 *   S2-d  on a Full Charge attack / enemy nearest the crosshair ... 220.7% of final ATK as additional damage
 *   B-a   not in Nanoparticle Consumption, ≥3 allies incapacitated ... revive 96% + ATK ▲101.37% +
 *                                                   DEF ▲221.76%, once per battle
 *   B-b   not in Nanoparticle Consumption, ≤2 incapacitated / all allies ... ATK ▲34.84% of caster ATK, 10 s
 *   B-c   in Nanoparticle Consumption / all allies ... ATK ▲34.84% of caster ATK, 10 s (same payload as B-b)
 *
 * FIXTURE — controlComp(SLUG, true) = liter (B1) / crown (B2) / rapunzel-sanctuary / helm (B3).
 *   • She is a BURST II unit occupying the carry slot BEHIND crown, who is also Burst II, so stage 2
 *     is expected to go to crown by slot order and her OWN burst may never cast in this comp. Every
 *     burst-slot claim is therefore proven by a TRIGGER COUNTERFACTUAL (re-key B-b's burstCast to
 *     fullBurstEnter) — and the control-vs-counterfactual INEQUALITY is exactly what separates
 *     own-burst-cast keying from FB-enter keying (an FB-enter encoding would already fire on every
 *     team Full Burst, making the two runs equal → RED).
 *   • No teammate here carries an "Into the Fray" state, so S1-b and S2-c must land on HER ONLY.
 *     That is the discriminator against the nearest-wrong target {kind:'allies'}.
 *   • crown is the on-recovery consumer: the engine emits no heal/shield event, so S1-a is observed
 *     by PLANTING a synthetic {kind:'recovery'} probe block on crown and watching it fire.
 *   • Only she wields an RL here (liter SMG, crown AR, helm SR), so an injected
 *     alliesOfWeapon:'RL' chargeSpeedPct buff reaches her and nobody else — a clean probe for the
 *     S1-d receiving-side immunity.
 *
 * ⚑ FLAGS (outside the input domain — estimated, not invented values)
 *   • Her pull cadence (ammo 6 / charge 60 f / reload 141 f ⇒ ~8.4 s per magazine ⇒ ~125 pulls in
 *     180 s) comes from datamine-unreliable fields, so every count assertion below is written as a
 *     RATIO or a wide band, never as a pinned shot count.
 *   • "Full Charge maintained for 1 or more seconds" has no primitive (the sim releases at full
 *     charge); fullCharge is the only available proxy, so the 1-second hold is UNMODELED and the
 *     duty cycle is carried by the 10 s Goddess Blessing window instead.
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

const SLUG = 'rapunzel-sanctuary';
const CROWN = 'crown';
const LITER = 'liter';

const AD_PCT = 27.45; // S1-b — a plain percentage stat: raw value in the event
const DEF_PCT = 42.24; // S2-b — no caster-DEF StatKey exists, so defPct carries the raw number
const S2_ATK_PCT = 29.17; // S2-c — caster-scaled: FLAT-resolved in the event
const B_ATK_PCT = 34.84; // B-b / B-c — caster-scaled: FLAT-resolved in the event
const RIDER_PCT = 220.7; // S2-d
const PROBE_ATK = 50; // synthetic on-recovery consumer planted on crown

type AnyEv = SimEvent & Record<string, any>;
interface Run {
  res: any;
  events: AnyEv[];
}

function near(a: number, b: number, tol = 1e-3): boolean {
  return Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
}

function go(mutate?: (opts: any) => void): Run {
  const opts: any = controlComp(SLUG, true);
  mutate?.(opts);
  const events: AnyEv[] = [];
  // ADAPTED (driver, mechanical harness fix only): onEvent lives on opts.cfg, not opts
  opts.cfg = { ...(opts.cfg ?? {}) };
  const chained = opts.cfg.onEvent;
  opts.cfg.onEvent = (ev: AnyEv) => {
    chained?.(ev);
    events.push(ev);
  };
  return { res: runComp(opts), events };
}

function applies(r: Run, stat: string): AnyEv[] {
  return r.events.filter((e) => e.kind === 'buffApply' && e.stat === stat);
}
function fbStarts(r: Run): number {
  return r.events.filter((e) => e.kind === 'fullBurstStart').length;
}
function dmgOf(r: Run): number {
  return unitOf(r.res, SLUG).totalDamage as number;
}
function withOv(o: any, map: Record<string, unknown>): void {
  o.overrides = { ...(o.overrides ?? {}), ...map };
}
function eachBlock(ov: any, fn: (b: any, slot: string) => void): void {
  for (const slot of ['skill1', 'skill2', 'burst']) {
    for (const b of ov[slot] ?? []) fn(b, slot);
  }
}
function countBy(evs: AnyEv[], key: (e: AnyEv) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of evs) out[key(e)] = (out[key(e)] ?? 0) + 1;
  return out;
}

/* ------------------------------------------------------------------ *
 * Hoisted runs — each one is a full 180 s sim. 14 runs total.
 * ------------------------------------------------------------------ */

const CONTROL = go();

// S1-a — the heal emits no event, so plant a consumer that does.
function crownProbe(o: any): void {
  withOv(o, {
    [CROWN]: withPatchedOverride(CROWN, (ov: any) => {
      ov.skill1 = [
        ...(ov.skill1 ?? []),
        {
          slot: 'skill1',
          trigger: { kind: 'recovery' },
          target: { kind: 'self' },
          effects: [{ kind: 'buff', stat: 'atkPct', value: PROBE_ATK, durationSec: 2 }],
        },
      ];
    }),
  });
}
let healStripHits = 0;
function stripHeal(o: any): void {
  withOv(o, {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      eachBlock(ov, (b) => {
        const n = (b.effects ?? []).length;
        b.effects = (b.effects ?? []).filter((e: any) => e.kind !== 'heal');
        healStripHits += n - b.effects.length;
      });
    }),
  });
}
const PROBE = go((o) => crownProbe(o));
const PROBE_NO_HEAL = go((o) => {
  crownProbe(o);
  stripHeal(o);
});

// S2-a — shield inertness.
let shieldStripHits = 0;
const NO_SHIELD = go((o) => {
  withOv(o, {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      eachBlock(ov, (b) => {
        const n = (b.effects ?? []).length;
        b.effects = (b.effects ?? []).filter((e: any) => e.kind !== 'shield');
        shieldStripHits += n - b.effects.length;
      });
    }),
  });
});

// S1-b nearest-wrong — the FB-enter Attack Damage buff scoped to ALL allies.
let adTargetHits = 0;
const S1_ALL = go((o) => {
  withOv(o, {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      for (const b of ov.skill1 ?? []) {
        if ((b.effects ?? []).some((e: any) => e.kind === 'buff' && e.stat === 'attackDamagePct')) {
          b.target = { kind: 'allies' };
          adTargetHits += 1;
        }
      }
    }),
  });
});

// B-b nearest-wrong — her own-cast ATK grant re-keyed to team Full-Burst entry.
let burstRekeyHits = 0;
const FB_BURST = go((o) => {
  withOv(o, {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      for (const b of ov.burst ?? []) {
        if (b.trigger?.kind === 'burstCast') {
          b.trigger = { kind: 'fullBurstEnter' };
          burstRekeyHits += 1;
        }
      }
    }),
  });
});

// S2-b nearest-wrong — Goddess Blessing free to re-arm on every full charge
// (i.e. the "while not in Goddess Blessing" duty cycle dropped).
let gbFlagHits = 0;
const GB_RETRIGGER = go((o) => {
  withOv(o, {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      eachBlock(ov, (b) => {
        for (const e of b.effects ?? []) {
          if (e.kind === 'buff' && e.noRetriggerWhileActive) {
            delete e.noRetriggerWhileActive;
            gbFlagHits += 1;
          }
        }
      });
    }),
  });
});

// S2-d — the 220.7% rider: strip it, then bend it one axis at a time.
let riderStripHits = 0;
const NO_RIDER = go((o) => {
  withOv(o, {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      eachBlock(ov, (b) => {
        const n = (b.effects ?? []).length;
        b.effects = (b.effects ?? []).filter(
          (e: any) => !(e.kind === 'flatDamage' && near(e.atkPct, RIDER_PCT)),
        );
        riderStripHits += n - b.effects.length;
      });
    }),
  });
});
function riderPatch(mut: (e: any) => void): { file: unknown; hits: number } {
  let hits = 0;
  const file = withPatchedOverride(SLUG, (ov: any) => {
    eachBlock(ov, (b) => {
      for (const e of b.effects ?? []) {
        if (e.kind === 'flatDamage' && near(e.atkPct, RIDER_PCT)) {
          mut(e);
          hits += 1;
        }
      }
    });
  });
  return { file, hits };
}
const riderCore = riderPatch((e) => {
  e.core = true;
});
const RIDER_CORE = go((o) => withOv(o, { [SLUG]: riderCore.file }));
const riderNoCrit = riderPatch((e) => {
  e.crit = false;
});
const RIDER_NOCRIT = go((o) => withOv(o, { [SLUG]: riderNoCrit.file }));
const riderNoFb = riderPatch((e) => {
  e.noFb = true;
});
const RIDER_NOFB = go((o) => withOv(o, { [SLUG]: riderNoFb.file }));

let riderEvery2Hits = 0;
const RIDER_EVERY2 = go((o) => {
  withOv(o, {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      eachBlock(ov, (b) => {
        if ((b.effects ?? []).some((e: any) => e.kind === 'flatDamage' && near(e.atkPct, RIDER_PCT))) {
          b.trigger = { kind: 'hitCount', count: 2 };
          riderEvery2Hits += 1;
        }
      });
    }),
  });
});

// S1-d — inject a charge-speed buff that can only reach HER, then re-run with the immunity removed.
function injectChargeSpeed(o: any): void {
  withOv(o, {
    [LITER]: withPatchedOverride(LITER, (ov: any) => {
      ov.skill1 = [
        ...(ov.skill1 ?? []),
        {
          slot: 'skill1',
          trigger: { kind: 'passive' },
          target: { kind: 'alliesOfWeapon', weapon: 'RL' },
          effects: [{ kind: 'buff', stat: 'chargeSpeedPct', value: 60 }],
        },
      ];
    }),
  });
}
const CS_IMMUNE = go((o) => injectChargeSpeed(o));
let immunityHits = 0;
const CS_OPEN = go((o) => {
  injectChargeSpeed(o);
  withOv(o, {
    [SLUG]: withPatchedOverride(SLUG, (ov: any) => {
      const imm: string[] = ov.charFixes?.statImmunities ?? [];
      immunityHits = imm.filter((s) => s === 'chargeSpeedPct').length;
      if (ov.charFixes) delete ov.charFixes.statImmunities;
    }),
  });
});

/* ------------------------------------------------------------------ *
 * Derived fixture facts
 * ------------------------------------------------------------------ */

const TEAM = Object.keys(totals(CONTROL.res)).length;
const FB = fbStarts(CONTROL);
// Her caster index is identified by a magnitude only SHE can emit (27.45 Attack Damage).
const SELF_EV = applies(CONTROL, 'attackDamagePct').find((e) => near(e.value, AD_PCT));
const SELF_IDX = SELF_EV?.casterIdx;
const MY_CASTER_ATK = applies(CONTROL, 'casterAtkPct').filter((e) => e.casterIdx === SELF_IDX);
// Flat-resolved caster-ATK basis, recovered from the SMALLER of her two caster-scaled magnitudes
// (S2-c 29.17% < B-b 34.84%), so no knowledge of her stat sheet is needed.
const ATK_BASIS = MY_CASTER_ATK.length
  ? Math.min(...MY_CASTER_ATK.map((e) => e.value)) / (S2_ATK_PCT / 100)
  : 0;
const S2_FLAT = (ATK_BASIS * S2_ATK_PCT) / 100;
const B_FLAT = (ATK_BASIS * B_ATK_PCT) / 100;

describe('rapunzel-sanctuary — fixture sanity', () => {
  it('the comp actually full-bursts and she is identifiable as a caster', () => {
    expect(TEAM, 'controlComp must seat 4 units').toBe(4);
    expect(FB, 'a lone B3 makes zero Full Bursts — the fixture must produce some').toBeGreaterThan(0);
    expect(SELF_EV, 'S1-b Attack Damage ▲27.45% must be emitted by her').toBeTruthy();
    expect(ATK_BASIS, 'S2-c must emit a caster-scaled (flat) ATK value').toBeGreaterThan(0);
  });
});

describe('rapunzel-sanctuary — skill1', () => {
  it('S1-a: the Full-Charge heal reaches ALL allies, once per pull (tandem channel)', () => {
    expect(healStripHits, 'a heal effect must exist to strip').toBeGreaterThan(0);
    const probed = applies(PROBE, 'atkPct').filter(
      (e) => near(e.value, PROBE_ATK) && e.targetSlug === CROWN,
    );
    const stripped = applies(PROBE_NO_HEAL, 'atkPct').filter(
      (e) => near(e.value, PROBE_ATK) && e.targetSlug === CROWN,
    );
    // Non-vacuity: the planted on-recovery consumer fires at all.
    expect(probed.length, 'planted recovery consumer must fire').toBeGreaterThan(0);
    // Discriminating: her heal is a large share of those recoveries (≈1 per pull, ~125 pulls),
    // so removing it must collapse the count. RED under "heal skipped as defensive/inert".
    expect(stripped.length).toBeLessThan(probed.length);
    expect(probed.length - stripped.length, 'heal must fire per full charge, not once').toBeGreaterThan(20);
  });

  it('S1-b: Attack Damage ▲27.45% fires on FB ENTRY and lands on HER ONLY (no Into-the-Fray ally here)', () => {
    const mine = applies(CONTROL, 'attackDamagePct').filter((e) => e.casterIdx === SELF_IDX);
    expect(mine.length, 'one application per Full Burst entry').toBe(FB);
    expect(mine.every((e) => near(e.value, AD_PCT)), 'plain pct stat keeps its raw value').toBe(true);
    expect(new Set(mine.map((e) => e.targetSlug))).toEqual(new Set([SLUG]));
    // Duration semantics: "for 10 sec" is wall-clock, never a round budget.
    expect(mine.every((e) => e.durationShots == null)).toBe(true);
    // Inertness: no teammate may carry this buff.
    expect(
      applies(CONTROL, 'attackDamagePct').filter((e) => near(e.value, AD_PCT) && e.targetSlug !== SLUG),
    ).toHaveLength(0);
    // Nearest-wrong (target {kind:'allies'}) → TEAM× the applications.
    expect(adTargetHits, 'the patch must have found the block').toBeGreaterThan(0);
    const all = applies(S1_ALL, 'attackDamagePct').filter((e) => near(e.value, AD_PCT));
    expect(all.length).toBe(fbStarts(S1_ALL) * TEAM);
  });

  it.skip('S1-c: Nanoparticle Injection (burst CD ▲40 s + Nanoparticle Consumption DEF ▲10%) — GAP', () => {
    // GAP: the trigger is her own revive, and v1 models no HP pool / no incapacitation, so
    // Nanoparticle Injection can never occur. The cooldown INCREASE (a negative burstCdr) and the
    // continuous DEF ▲10% (defPct, inert in v1) are therefore unobservable in any fixture.
  });

  it('S1-d: she is immune to charge-speed buffs in BOTH directions', () => {
    // An injected alliesOfWeapon:'RL' chargeSpeedPct ▲60 can reach only her in this comp.
    expect(totals(CS_IMMUNE.res), 'the immunity must make the injected buff a complete no-op').toEqual(
      totals(CONTROL.res),
    );
    // Non-vacuity + nearest-wrong: with the immunity removed the same injection MUST speed her up.
    expect(immunityHits, "statImmunities must list 'chargeSpeedPct'").toBeGreaterThan(0);
    expect(dmgOf(CS_OPEN)).toBeGreaterThan(dmgOf(CONTROL));
  });
});

describe('rapunzel-sanctuary — skill2', () => {
  it('S2-a: the shared shield is damage-inert here (no shield consumer in the comp)', () => {
    expect(shieldStripHits, 'a shield effect must exist to strip').toBeGreaterThan(0);
    expect(totals(NO_SHIELD.res)).toEqual(totals(CONTROL.res));
  });

  it('S2-b: Goddess Blessing DEF reaches all allies on a ~10 s duty cycle, not every full charge', () => {
    const def = applies(CONTROL, 'defPct').filter((e) => e.casterIdx === SELF_IDX);
    expect(def.length, 'the Goddess Blessing DEF grant must be emitted').toBeGreaterThan(0);
    expect(def.every((e) => near(e.value, DEF_PCT)), 'caster-scaled DEF has no StatKey → defPct 42.24').toBe(true);
    expect(new Set(def.map((e) => e.targetSlug)).size, 'Affects ALL allies').toBe(TEAM);
    const per = countBy(def, (e) => String(e.targetSlug));
    // 180 s / a 10 s window ⇒ ~18 per ally. ⚑ band, not a pin.
    for (const [slug, n] of Object.entries(per)) {
      expect(n, `${slug}: one grant per ~10 s window`).toBeGreaterThanOrEqual(6);
      expect(n, `${slug}: must NOT re-arm on every pull`).toBeLessThanOrEqual(24);
    }
    // Nearest-wrong: drop the "while not in Goddess Blessing" self-gate and it re-applies per pull.
    expect(gbFlagHits, 'the duty cycle must be encoded (noRetriggerWhileActive)').toBeGreaterThan(0);
    const loose = applies(GB_RETRIGGER, 'defPct').filter((e) => near(e.value, DEF_PCT));
    expect(loose.length).toBeGreaterThan(def.length * 2);
  });

  it('S2-c: ATK ▲29.17% of caster ATK is FLAT-resolved, FB-enter keyed, and self-only here', () => {
    const s2 = MY_CASTER_ATK.filter((e) => near(e.value, S2_FLAT));
    expect(s2.length, 'one application per Full Burst entry').toBe(FB);
    expect(new Set(s2.map((e) => e.targetSlug))).toEqual(new Set([SLUG]));
    // Flat resolution, not the raw kit percentage (the classic blind-read error).
    expect(s2[0].value).toBeGreaterThan(S2_ATK_PCT * 5);
    expect(s2.every((e) => e.durationShots == null)).toBe(true);
    // Inertness: no teammate is in an Into-the-Fray state, so none may receive it.
    expect(
      applies(CONTROL, 'casterAtkPct').filter(
        (e) => e.casterIdx === SELF_IDX && near(e.value, S2_FLAT) && e.targetSlug !== SLUG,
      ),
    ).toHaveLength(0);
  });

  it('S2-d: the 220.7% rider fires once per full charge, crits, takes Full Burst, and does NOT core', () => {
    expect(riderStripHits, 'the 220.7% flatDamage rider must exist').toBeGreaterThan(0);
    const base = dmgOf(CONTROL);
    const share = base - dmgOf(NO_RIDER);
    expect(share, 'the rider must contribute damage').toBeGreaterThan(0);
    expect(share / base, '220.7% per pull vs a 61.3% normal — a large share').toBeGreaterThan(0.15);
    // core: the kit never says "core strike", so the faithful rider takes NO core bucket.
    expect(riderCore.hits).toBeGreaterThan(0);
    expect(dmgOf(RIDER_CORE), 'nearest-wrong core:true must ADD damage').toBeGreaterThan(base);
    // crit: riders crit at the caster's sheet rate.
    expect(riderNoCrit.hits).toBeGreaterThan(0);
    expect(dmgOf(RIDER_NOCRIT), 'nearest-wrong crit:false must LOSE damage').toBeLessThan(base);
    // Full Burst by TIMING (default ON for a function-damage rider).
    expect(riderNoFb.hits).toBeGreaterThan(0);
    expect(dmgOf(RIDER_NOFB), 'nearest-wrong noFb:true must LOSE damage').toBeLessThan(base);
    // Cadence: one per PULL. Nearest-wrong "every 2nd hit" must halve the rider's contribution —
    // asserted as a ratio so no datamine-derived shot count is pinned.
    expect(riderEvery2Hits).toBeGreaterThan(0);
    const lost = base - dmgOf(RIDER_EVERY2);
    expect(lost).toBeGreaterThan(share * 0.3);
    expect(lost).toBeLessThan(share * 0.7);
  });
});

describe('rapunzel-sanctuary — burst', () => {
  it('B-b/B-c: ATK ▲34.84% of caster ATK is keyed to HER OWN cast, not to team Full Burst, and hits all allies', () => {
    expect(burstRekeyHits, 'the burst payload must be burstCast-keyed').toBeGreaterThan(0);
    const ctl = MY_CASTER_ATK.filter((e) => near(e.value, B_FLAT));
    const rekeyed = applies(FB_BURST, 'casterAtkPct').filter((e) => near(e.value, B_FLAT));
    // Under the nearest-wrong FB-enter keying the grant lands on every ally on every Full Burst.
    expect(rekeyed.length).toBe(fbStarts(FB_BURST) * TEAM);
    expect(new Set(rekeyed.map((e) => e.targetSlug)).size, 'Affects all allies').toBe(TEAM);
    // Trigger identity: she is the 2nd Burst-II unit in this comp (crown precedes her), so her own
    // casts are strictly fewer than the team's Full Bursts. An FB-enter encoding makes these equal.
    expect(ctl.length).toBeLessThan(rekeyed.length);
    // Whatever casts do happen must land as COMPLETE all-ally sets.
    expect(ctl.length % TEAM).toBe(0);
    // The ≤2-incapacitated branch and the Nanoparticle-Consumption branch carry the SAME payload,
    // so exactly one magnitude may appear — never both stacked.
    const distinct = new Set(ctl.map((e) => Math.round(e.value)));
    expect(distinct.size).toBeLessThanOrEqual(1);
  });

  it('burst: only ONE branch applies — no revive-branch ATK/DEF magnitudes may ever appear', () => {
    // 101.37% / 221.76% belong to the ≥3-incapacitated branch, which cannot trigger in v1.
    const revATK = (ATK_BASIS * 101.37) / 100;
    expect(applies(CONTROL, 'casterAtkPct').filter((e) => near(e.value, revATK))).toHaveLength(0);
    expect(applies(CONTROL, 'defPct').filter((e) => near(e.value, 221.76))).toHaveLength(0);
    expect(applies(CONTROL, 'defPct').filter((e) => near(e.value, 10))).toHaveLength(0);
  });

  it.skip('B-a: Nanoparticle Injection revive (96% HP, once per battle) — GAP', () => {
    // GAP: no HP pool and no incapacitation in v1, so "3 or more allies are incapacitated" is never
    // satisfied and the revive + its once-per-battle ATK/DEF riders are unreachable.
  });

  it.skip('S2-a/S2-b trigger fidelity: "Full Charge maintained for 1+ sec" — GAP', () => {
    // GAP: no primitive for HOLDING at full charge (the sim releases on reaching it). fullCharge is
    // the only proxy; the 1-second hold requirement is unmodeled, and the "while not in Goddess
    // Blessing" gate has no inverse-of-requiresSelfStatus primitive — it is approximated by the
    // buff's own noRetriggerWhileActive duty cycle, which the shield cannot share.
  });
});
