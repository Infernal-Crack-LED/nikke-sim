/**
 * prika (Prika) — SR / Water / Supporter / Burst II. BLIND per-unit kit-spec test (role s5):
 * written from the kit prose ALONE, with no sight of the driver override, tests, or reasoning.
 *
 * KIT (structural read of the ■ headers / Affects clauses / stat keyword before ▲):
 *  S1 blockA  ■ "when performing a Full Charge attack" / Affects all allies
 *               - Projectile Explosion Damage ▲20%   3 sec -> projectileExplosionPct 20
 *               - Pierce Damage ▲13.09%              3 sec -> pierceDamagePct 13.09 (v1-inert stat, still owed)
 *               - ATK ▲20% "of the skill user ATK"    3 sec -> casterAtkPct 20 (FLAT-resolved at apply time)
 *  S1 blockB  ■ "only while in Performance status" / self: Outgoing healing ▲49.92% (continuous),
 *               Gains Pierce (continuous)
 *  S2 blockA  ■ "when entering Full Burst" / self: Max HP ▲19.98% for 10 sec -> fullBurstEnter + Max-HP
 *               grant (emitted under stat maxHpFlat whichever HP stat key was used)
 *  S2 blockB  ■ Encore — gated on "Sing Along takes effect while ... in Performance status": a CROSS-UNIT
 *               trigger. No Sing Along carrier exists in this fixture, so every Encore effect (incl. the
 *               modelable Attack Damage ▲25.01%) MUST be inert here.
 *  Burst      ■ Performance / all allies: heal 3.04% of caster final Max HP every 1 sec for 25 sec
 *               (25 ticks -> 25 recovery events per ally), Charge Damage ▲25% for 25 sec.
 *
 * FIXTURE: controlComp('prika', true) = liter(B1) / crown(B2) / prika / helm(B3), Fire boss, deterministic.
 *  Prika is Burst II, so this comp holds TWO B2 units; the sanity test below is the explicit non-vacuity gate
 *  that she actually casts Performance (her chargeDamagePct grant is unique in this comp, so the presence of
 *  that buffApply IS the cast evidence — no burstCast identity field needed). helm stays IN: dropping helm
 *  would leave the team with no Burst III and therefore ZERO Full Bursts, which would make the S2
 *  fullBurstEnter line untestable. crown is deliberately kept as the on-recovery consumer for the heal test.
 *
 * TWO DELIBERATE DEFENSES (the packet documents two conflicting shapes; the test must not ride the guess):
 *  - blocksOf() accepts BOTH override slot shapes: slot === Block[] and slot === { blocks: Block[] }.
 *  - runWithEvents() registers one onEvent sink at the top level AND under cfg, then de-dupes by object
 *    identity, so the event log is correct whichever field the harness honours (and is not double-counted).
 *
 * Counterfactual DIFFS (base minus patched) are used instead of raw event counts wherever a teammate could
 * emit the same stat, so liter/crown/helm buffs cannot pollute a count.
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

const SLUG = 'prika';
const ALLIES = ['liter', 'crown', 'prika', 'helm'] as const;
const HP_STATS = new Set([
  'maxHpPct',
  'maxHpFlat',
  'casterMaxHpPct',
  'targetMaxHpPct',
]);

type AnyEv = SimEvent & Record<string, any>;
type Slot = 'skill1' | 'skill2' | 'burst';

/** Register the sink twice (top level + cfg) and de-dupe by identity — see header. */
function runWithEvents(opts: any): { res: any; events: AnyEv[] } {
  const sink: AnyEv[] = [];
  const onEvent = (ev: AnyEv) => {
    sink.push(ev);
  };
  const res = runComp({
    ...opts,
    onEvent,
    cfg: { ...(opts?.cfg ?? {}), onEvent },
  } as any);
  const seen = new Set<AnyEv>();
  const events: AnyEv[] = [];
  for (const ev of sink) {
    if (seen.has(ev)) {
      continue;
    }
    seen.add(ev);
    events.push(ev);
  }
  return { res, events };
}

/** Accepts both documented override slot shapes. */
function blocksOf(ov: any, slot: Slot): any[] {
  const s = ov?.[slot];
  if (Array.isArray(s)) {
    return s;
  }
  if (s && Array.isArray(s.blocks)) {
    return s.blocks;
  }
  throw new Error('prika override: no blocks found for slot ' + slot);
}

function eachEffect(ov: any, slot: Slot, fn: (e: any) => void): void {
  for (const b of blocksOf(ov, slot)) {
    for (const e of b.effects ?? []) {
      fn(e);
    }
  }
}

function dropEffects(ov: any, slot: Slot, pred: (e: any) => boolean): void {
  for (const b of blocksOf(ov, slot)) {
    if (Array.isArray(b.effects)) {
      b.effects = b.effects.filter((e: any) => !pred(e));
    }
  }
}

function withPrika(mutate: (ov: any) => void): any {
  const opts: any = controlComp(SLUG, true);
  return {
    ...opts,
    overrides: {
      ...(opts.overrides ?? {}),
      [SLUG]: withPatchedOverride(SLUG, mutate as any),
    },
  };
}

const applies = (evs: AnyEv[], stat: string, target?: string): AnyEv[] =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      (target === undefined || e.targetSlug === target)
  );
const about = (v: number, want: number, eps = 0.02): boolean =>
  Math.abs(v - want) <= eps;
const dmg = (r: { res: any }, slug: string): number => totals(r.res)[slug];

// ---- hoisted runs (9 × 180 s) ------------------------------------------------------------------
const base = runWithEvents(controlComp(SLUG, true));

const rNoCasterAtk = runWithEvents(
  withPrika((ov) =>
    dropEffects(
      ov,
      'skill1',
      (e) => e.kind === 'buff' && e.stat === 'casterAtkPct'
    )
  )
);
const rAtkPctSwap = runWithEvents(
  withPrika((ov) =>
    eachEffect(ov, 'skill1', (e) => {
      if (e.kind === 'buff' && e.stat === 'casterAtkPct') {
        e.stat = 'atkPct';
      }
    })
  )
);
const rDur1 = runWithEvents(
  withPrika((ov) =>
    eachEffect(ov, 'skill1', (e) => {
      if (e.kind === 'buff' && e.stat === 'casterAtkPct') {
        e.durationSec = 1;
      }
    })
  )
);
const rDur30 = runWithEvents(
  withPrika((ov) =>
    eachEffect(ov, 'skill1', (e) => {
      if (e.kind === 'buff' && e.stat === 'casterAtkPct') {
        e.durationSec = 30;
      }
    })
  )
);
const rNoCharge = runWithEvents(
  withPrika((ov) =>
    dropEffects(
      ov,
      'burst',
      (e) => e.kind === 'buff' && e.stat === 'chargeDamagePct'
    )
  )
);
const rChargeAsAttack = runWithEvents(
  withPrika((ov) =>
    eachEffect(ov, 'burst', (e) => {
      if (e.kind === 'buff' && e.stat === 'chargeDamagePct') {
        e.stat = 'attackDamagePct';
      }
    })
  )
);
const rHealOnce = runWithEvents(
  withPrika((ov) =>
    eachEffect(ov, 'burst', (e) => {
      if (e.kind === 'heal') {
        e.ticks = 1;
        delete e.intervalSec;
      }
    })
  )
);
const rNoMaxHp = runWithEvents(
  withPrika((ov) =>
    dropEffects(ov, 'skill2', (e) => e.kind === 'buff' && HP_STATS.has(e.stat))
  )
);

const fbStarts = base.events.filter((e) => e.kind === 'fullBurstStart').length;

describe('prika — fixture sanity / non-vacuity', () => {
  it('the control comp reaches Full Burst, prika deals damage, and Performance actually casts', () => {
    expect(fbStarts).toBeGreaterThanOrEqual(3);
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    // chargeDamagePct ▲25% is unique to prika burst in this comp -> its presence IS proof she cast.
    // If this fails, the two-Burst-II fixture never let her cast and every burst assertion below is vacuous.
    const perf = applies(base.events, 'chargeDamagePct').filter((e) =>
      about(e.value, 25)
    );
    expect(perf.length).toBeGreaterThanOrEqual(4);
  });
});

describe('prika S1 — full-charge all-ally buff (3 sec)', () => {
  it('ATK ▲ 20% of the CASTER ATK reaches ALL FOUR allies, flat-resolved (not the raw 20)', () => {
    for (const s of ALLIES) {
      const d =
        applies(base.events, 'casterAtkPct', s).length -
        applies(rNoCasterAtk.events, 'casterAtkPct', s).length;
      expect(d).toBeGreaterThan(0); // RED under a self-only / excludeSelf target set
    }
    for (const e of applies(base.events, 'casterAtkPct')) {
      expect(e.value).toBeGreaterThan(1000); // flat ATK at apply time, never the kit percentage
    }
  });

  it('fires per FULL CHARGE — not passively and not on Full Burst entry', () => {
    const d =
      applies(base.events, 'casterAtkPct', 'liter').length -
      applies(rNoCasterAtk.events, 'casterAtkPct', 'liter').length;
    expect(d).toBeGreaterThanOrEqual(50); // ~1 charged SR shot/sec over 180 s; a passive would be 1
    expect(d).toBeGreaterThan(3 * fbStarts); // a fullBurstEnter mis-key would be === fbStarts
  });

  it('lasts 3 SECONDS — a bounded wall-clock window, not rounds and not continuous', () => {
    const pierce = applies(base.events, 'pierceDamagePct');
    expect(pierce.length).toBeGreaterThan(0);
    for (const e of pierce) {
      expect(e.durationShots).toBeUndefined(); // "for 3 sec" is never a round count
      expect(typeof e.expiresFrame).toBe('number'); // a continuous encoding would carry no expiry
      expect(e.expiresFrame).toBeGreaterThan(0);
    }
    // 1 s is shorter than her shot interval -> real uptime gaps -> teammate damage must drop.
    expect(dmg(rDur1, 'liter')).toBeLessThan(dmg(base, 'liter'));
    // 30 s papers over the reload gap (only ~0.35 s per 6-shot cycle), so the margin is small but one-sided.
    expect(dmg(rDur30, 'liter')).toBeGreaterThanOrEqual(dmg(base, 'liter'));
  });

  it('is caster-scaled, so an own-ATK (atkPct) encoding lands a different teammate total', () => {
    expect(dmg(rAtkPctSwap, 'liter')).not.toBe(dmg(base, 'liter'));
  });

  it('carries Projectile Explosion ▲20% and Pierce Damage ▲13.09% at kit magnitude to all allies', () => {
    for (const s of ALLIES) {
      expect(
        applies(base.events, 'projectileExplosionPct', s).some((e) =>
          about(e.value, 20)
        )
      ).toBe(true);
      expect(
        applies(base.events, 'pierceDamagePct', s).some((e) =>
          about(e.value, 13.09)
        )
      ).toBe(true);
    }
  });

  it.skip('S1b Outgoing healing ▲49.92% while in Performance — GAP: heal magnitudes are unmodelled (a heal effect emits a recovery event with no HP amount), so the line has no observable payload', () => {});

  it.skip('S1b Gains Pierce while in Performance — GAP: pierce is damage-inert in v1 (partless boss, pierceDamagePct parsed-but-inert), so gainPierce-gated-on-Performance vs a whole-fight hasPierce flag cannot be discriminated by events or totals; the non-vacuity split (Performance OFF before her first burst, ON for 25 s after) is unobservable for the same reason', () => {});
});

describe('prika S2 — Max HP on Full Burst entry (self, 10 sec)', () => {
  it('applies once per Full Burst ENTRY, to prika only', () => {
    const dSelf =
      applies(base.events, 'maxHpFlat', SLUG).length -
      applies(rNoMaxHp.events, 'maxHpFlat', SLUG).length;
    expect(dSelf).toBe(fbStarts); // a passive would be 1; an interval/shot key would overshoot
    for (const s of ALLIES) {
      if (s === SLUG) {
        continue;
      }
      const d =
        applies(base.events, 'maxHpFlat', s).length -
        applies(rNoMaxHp.events, 'maxHpFlat', s).length;
      expect(d).toBe(0); // "Affects self" — RED under an allies target set
    }
  });

  it('is offensively inert (prika has no HP-scaling ATK line), so removing it moves nobody', () => {
    for (const s of ALLIES) {
      expect(dmg(rNoMaxHp, s)).toBe(dmg(base, s));
    }
  });

  it('Encore does not leak: no Sing Along carrier is in this comp, so Attack Damage ▲25.01% must never apply', () => {
    const leaked = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'attackDamagePct' &&
        about(e.value, 25.01)
    );
    expect(leaked).toHaveLength(0);
  });

  it.skip('Encore Effect 2 Performance duration ▲21 sec — GAP: no primitive extends a named ally status window (fullBurstExtend is Full-Burst-only), and the whole Encore branch hangs off a cross-unit Sing Along trigger the schema cannot express', () => {});

  it.skip('Encore Effect 4 Cooldown of Burst Skill ▲21 sec — GAP: burstCdr models a cooldown REDUCTION; the Encore cooldown INCREASE has no primitive', () => {});

  it.skip('Encore Effect 1 Assigned Part Singing — GAP: no assigned-part model (the scope-lock boss is partless)', () => {});
});

describe('prika burst — Performance (all allies, 25 sec)', () => {
  it('Charge Damage ▲25% reaches all four allies with a bounded window', () => {
    for (const s of ALLIES) {
      const ev = applies(base.events, 'chargeDamagePct', s).filter((e) =>
        about(e.value, 25)
      );
      expect(ev.length).toBeGreaterThan(0);
      expect(ev[0].durationShots).toBeUndefined();
      expect(typeof ev[0].expiresFrame).toBe('number');
    }
  });

  it('is CHARGE-bucket scoped: lifts prika, leaves the SMG ally byte-identical, where a generic Damage Up encoding would move her', () => {
    expect(dmg(base, SLUG)).toBeGreaterThan(dmg(rNoCharge, SLUG));
    expect(dmg(rNoCharge, 'liter')).toBe(dmg(base, 'liter'));
    expect(dmg(rChargeAsAttack, 'liter')).toBeGreaterThan(dmg(base, 'liter'));
  });

  it('heals every 1 sec for 25 sec (25 ticks), keeping on-recovery consumers refreshed', () => {
    const nBuffs = (r: { events: AnyEv[] }) =>
      r.events.filter((e) => e.kind === 'buffApply').length;
    // A single instant heal (ticks omitted) fires crown on-recovery ONCE per burst instead of 25×.
    expect(nBuffs(base)).toBeGreaterThan(nBuffs(rHealOnce));
    expect(nBuffs(base) - nBuffs(rHealOnce)).toBeGreaterThanOrEqual(10);
    expect(dmg(base, 'crown')).toBeGreaterThanOrEqual(dmg(rHealOnce, 'crown'));
  });
});
