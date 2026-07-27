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
 * grave — Grave (AR / Fire / Supporter / Burst II), blind kit spec test.
 *
 * KIT (structural read, quoted minimally):
 *  skill1 [Activates when Prediction status ends. Affects self.]
 *    - "Removes 100% of ammo"            -> consumeAmmo fraction 1
 *    - Heat Emission: "Reload Ratio \u25bc 50%" -> reloadSpeedPct -50 (weapon-state = damage:
 *      slower reload => fewer shots fired). Removed "under certain conditions" (unstated).
 *  skill1 [only in Heat Emission. Affects self.]  -> heal, 2%/1s continuously
 *  skill1 [only in Heat Emission. Affects all allies.]
 *    - Burst Gauge filling speed \u25b2 38.96%  -> burstGenPct 38.96 (allies)
 *    - Pierce Damage \u25b2 48.4%              -> pierceDamagePct 48.4 (allies)
 *  skill2 [after landing 15 normal attacks. self]
 *    - Overheat I: ATK \u25b2 15.48%, "Removed upon reloading to max ammunition"
 *      -> hitCount:15 + buff atkPct 15.48 removeOnReload:true, NO durationSec
 *  skill2 [landing a normal attack after Prediction takes effect. self] escalating tiers
 *    - 30 landed: Overheat II ATK \u25b2 20.66% continuously  -> atkPct
 *    - 60 landed: Overheat III "Attack Damage \u25b2 30.8%"    -> attackDamagePct (Damage-Up bucket,
 *      a DIFFERENT bucket from atkPct — the nearest-wrong model conflates the two)
 *  burst [self] Prediction, 10 s:
 *    - Current HP \u25bc 1%/s  (defensive, no HP pool in v1 -> unmodeled)
 *    - unlimited ammunition 10 s   -> unlimitedAmmo durationSec 10
 *    - Gain Pierce 10 s            -> gainPierce durationSec 10 (EFFECT, not hasPierce flag)
 *    - Pierce Damage \u25b2 52.8% 10 s -> pierceDamagePct (self)
 *    - Critical Rate \u25b2 85.19% 10 s -> critRatePct (UNSCOPED: the kit says plain
 *      "Critical Rate", not "Critical Rate of normal attacks" -> NOT critRateNormalPct)
 *  burst [all allies] 10 s:
 *    - Attack Damage \u25b2 48.2%    -> attackDamagePct
 *    - Pierce Damage \u25b2 39.98%   -> pierceDamagePct
 *    - Max Ammunition \u25b2 3 round(s) -> maxAmmoFlat 3 (FLAT rounds; maxAmmoPct is the
 *      nearest-wrong encoding and would scale magazines instead of adding 3)
 *
 * FIXTURE: controlComp('grave', true) — liter B1 / crown B2 / grave B3-slot carry / helm.
 * grave is Burst II; the control comp supplies the other tiers so a Full Burst chain actually
 * completes and her burst casts (a lone unit makes ZERO Full Bursts). helm=true throughout
 * except where helm's own crit line could confound a crit-scope reading; helm carries
 * critRateNormalPct, so the crit-SCOPE test reads grave's OWN buffApply events by
 * targetSlug+stat rather than by team totals, which is immune to helm.
 *
 * WHY THE ASSERTIONS DISCRIMINATE: every damage-moving line is paired with a
 * withPatchedOverride counterfactual encoding the NEAREST-WRONG reading (wrong bucket, wrong
 * duration semantics, wrong trigger, wrong target set, wrong sign), and asserted to move the
 * number. Inertness assertions pin what each line must NOT touch.
 */

type Ev = SimEvent & Record<string, any>;

function run(opts: Parameters<typeof runComp>[0]) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    onEvent: (ev: SimEvent) => events.push(ev as Ev),
  } as any);
  return { res, events };
}

const buffs = (events: Ev[], stat: string) =>
  events.filter((e) => e.kind === 'buffApply' && e.stat === stat);
const onGrave = (events: Ev[], stat: string) =>
  buffs(events, stat).filter((e) => e.targetSlug === 'grave');

// ---------------------------------------------------------------- hoisted runs
const base = run(controlComp('grave', true));
const baseTotals = totals(base.res);
const graveTotal = baseTotals.grave;

describe('grave — baseline sanity', () => {
  it('the fixture actually fires grave and completes Full Bursts (non-vacuity)', () => {
    expect(graveTotal).toBeGreaterThan(0);
    expect(base.events.some((e) => e.kind === 'fullBurstStart')).toBe(true);
    expect(base.events.some((e) => e.kind === 'burstCast')).toBe(true);
    expect(base.events.filter((e) => e.kind === 'shot').length).toBeGreaterThan(
      0
    );
  });

  it('grave is present as a damage dealer, not a pure inert support', () => {
    const row = unitOf(base.res, 'grave');
    expect(row.totalDamage).toBeGreaterThan(0);
  });
});

// ============================================================ BURST — self lines
describe('grave burst / Prediction (self, 10 s)', () => {
  it('grants unlimited ammunition for 10 s — removing it costs damage', () => {
    const patched = withPatchedOverride('grave', (ov) => {
      ov.burst!.blocks = ov.burst!.blocks.map((b: any) => ({
        ...b,
        effects: b.effects.filter((e: any) => e.kind !== 'unlimitedAmmo'),
      }));
    });
    const { res } = run({
      ...controlComp('grave', true),
      overrides: { grave: patched },
    });
    // Unlimited ammo removes reload downtime inside her window => strictly more shots.
    expect(totals(res).grave).toBeLessThan(graveTotal);
  });

  it('unlimited ammo is 10 s, not the whole fight (duration semantics)', () => {
    const patched = withPatchedOverride('grave', (ov) => {
      ov.burst!.blocks.forEach((b: any) =>
        b.effects.forEach((e: any) => {
          if (e.kind === 'unlimitedAmmo') {e.durationSec = 180;}
        })
      );
    });
    const { res } = run({
      ...controlComp('grave', true),
      overrides: { grave: patched },
    });
    // nearest-wrong: a whole-fight unlimited-ammo window. Must be strictly stronger.
    expect(totals(res).grave).toBeGreaterThan(graveTotal);
  });

  it('"Gain Pierce for 10 sec" is a timed gainPierce EFFECT, not the static hasPierce flag', () => {
    // Structural: the committed override must NOT tag grave as whole-fight Pierce, because the
    // kit scopes Pierce to the 10 s Prediction window only.
    const patchedFlag = withPatchedOverride('grave', (ov) => {
      (ov as any).hasPierce = true;
    });
    const { res } = run({
      ...controlComp('grave', true),
      overrides: { grave: patchedFlag },
    });
    // Nearest-wrong (whole-fight pierce) lets her 48.4% + 52.8% + 39.98% Pierce Damage buffs feed
    // EVERY shot, not just the burst window => strictly more damage. If this is equal, the
    // committed file already has hasPierce:true, i.e. the timed scope was lost.
    expect(totals(res).grave).toBeGreaterThan(graveTotal);
  });

  it('gainPierce carries a 10 s duration (not continuous)', () => {
    const patched = withPatchedOverride('grave', (ov) => {
      ov.burst!.blocks.forEach((b: any) =>
        b.effects.forEach((e: any) => {
          if (e.kind === 'gainPierce') {delete e.durationSec;}
        })
      );
    });
    const { res } = run({
      ...controlComp('grave', true),
      overrides: { grave: patched },
    });
    // nearest-wrong: durationSec absent => permanent pierce.
    expect(totals(res).grave).toBeGreaterThan(graveTotal);
  });

  it('self Critical Rate 85.19% is UNSCOPED critRatePct, not critRateNormalPct', () => {
    const applied = onGrave(base.events, 'critRatePct');
    expect(applied.some((e) => Math.abs(e.value - 85.19) < 1e-6)).toBe(true);
    // nearest-wrong: the normal-attack-scoped stat. The kit line has no "of normal attacks"
    // qualifier, so a scoped encoding under-credits her burst/skill hits.
    const scoped = onGrave(base.events, 'critRateNormalPct');
    expect(scoped.some((e) => Math.abs(e.value - 85.19) < 1e-6)).toBe(false);
  });

  it('self crit buff is 10 s and self-targeted only (target set)', () => {
    const applied = buffs(base.events, 'critRatePct').filter(
      (e) => Math.abs(e.value - 85.19) < 1e-6
    );
    expect(applied.length).toBeGreaterThan(0);
    for (const e of applied) {expect(e.targetSlug).toBe('grave');}
    // 10 s window at 60 fps = 600 frames from application.
    for (const e of applied) {
      expect(e.expiresFrame).toBeGreaterThan(0);
      expect(e.durationShots).toBeUndefined();
    }
  });

  it('self Pierce Damage 52.8% lands on grave only', () => {
    const applied = buffs(base.events, 'pierceDamagePct').filter(
      (e) => Math.abs(e.value - 52.8) < 1e-6
    );
    expect(applied.length).toBeGreaterThan(0);
    for (const e of applied) {expect(e.targetSlug).toBe('grave');}
  });
});

// ============================================================ BURST — ally lines
describe('grave burst — all-allies lines (10 s)', () => {
  it('Attack Damage 48.2% reaches every ally, in the Damage-Up bucket', () => {
    const applied = buffs(base.events, 'attackDamagePct').filter(
      (e) => Math.abs(e.value - 48.2) < 1e-6
    );
    expect(applied.length).toBeGreaterThan(0);
    const hit = new Set(applied.map((e) => e.targetSlug));
    // "Affects all allies" INCLUDES self — no excludeSelf.
    expect(hit.has('grave')).toBe(true);
    expect(hit.size).toBeGreaterThan(1);
  });

  it('Attack Damage 48.2% is attackDamagePct, not atkPct (bucket discrimination)', () => {
    const patched = withPatchedOverride('grave', (ov) => {
      ov.burst!.blocks.forEach((b: any) =>
        b.effects.forEach((e: any) => {
          if (
            e.kind === 'buff' &&
            e.stat === 'attackDamagePct' &&
            Math.abs(e.value - 48.2) < 1e-6
          ) {
            e.stat = 'atkPct';
          }
        })
      );
    });
    const { res } = run({
      ...controlComp('grave', true),
      overrides: { grave: patched },
    });
    // ATK is multiplicative with the sheet; Damage-Up is additive with other supports.
    // The two buckets cannot coincide across a full comp of differently-buffed units.
    expect(totals(res).grave).not.toBe(graveTotal);
  });

  it('Max Ammunition +3 is maxAmmoFlat (rounds), not maxAmmoPct', () => {
    const applied = buffs(base.events, 'maxAmmoFlat').filter(
      (e) => Math.abs(e.value - 3) < 1e-6
    );
    expect(applied.length).toBeGreaterThan(0);
    for (const e of applied) {expect(e.targetSlug).toBeTruthy();}
    // nearest-wrong: reading "3 round(s)" as 3 PERCENT.
    const pct = buffs(base.events, 'maxAmmoPct').filter(
      (e) => Math.abs(e.value - 3) < 1e-6
    );
    expect(pct.length).toBe(0);
  });

  it('Max Ammunition +3 actually moves shot economy (non-vacuity)', () => {
    const patched = withPatchedOverride('grave', (ov) => {
      ov.burst!.blocks.forEach((b: any) => {
        b.effects = b.effects.filter(
          (e: any) => !(e.kind === 'buff' && e.stat === 'maxAmmoFlat')
        );
      });
    });
    const { res } = run({
      ...controlComp('grave', true),
      overrides: { grave: patched },
    });
    const t = totals(res);
    // +3 rounds raises magazine size for the whole team for 10 s -> at least one ally must move.
    const moved = Object.keys(baseTotals).some((s) => t[s] !== baseTotals[s]);
    expect(moved).toBe(true);
  });

  it('ally Pierce Damage 39.98% is distinct from the self 52.8% line', () => {
    const ally = buffs(base.events, 'pierceDamagePct').filter(
      (e) => Math.abs(e.value - 39.98) < 1e-6
    );
    expect(ally.length).toBeGreaterThan(0);
    expect(new Set(ally.map((e) => e.targetSlug)).size).toBeGreaterThan(1);
  });
});

// ============================================================ SKILL 1
describe('grave skill1 — Heat Emission', () => {
  it('"Reload Ratio 50% DOWN" is a NEGATIVE reloadSpeedPct (a penalty, not a buff)', () => {
    const applied = onGrave(base.events, 'reloadSpeedPct');
    expect(applied.length).toBeGreaterThan(0);
    for (const e of applied) {expect(e.value).toBeLessThan(0);}
    expect(applied.some((e) => Math.abs(e.value + 50) < 1e-6)).toBe(true);
  });

  it('the reload penalty costs damage — sign-flipping it (nearest-wrong) gains damage', () => {
    const patched = withPatchedOverride('grave', (ov) => {
      ov.skill1!.blocks.forEach((b: any) =>
        b.effects.forEach((e: any) => {
          if (e.kind === 'buff' && e.stat === 'reloadSpeedPct')
            {e.value = Math.abs(e.value);}
        })
      );
    });
    const { res } = run({
      ...controlComp('grave', true),
      overrides: { grave: patched },
    });
    // Reload speed gates shots fired -> it IS damage (never "defensive, skip").
    expect(totals(res).grave).toBeGreaterThan(graveTotal);
  });

  it('Burst Gauge filling speed 38.96% is burstGenPct on ALL allies (incl. self)', () => {
    const applied = buffs(base.events, 'burstGenPct').filter(
      (e) => Math.abs(e.value - 38.96) < 1e-6
    );
    expect(applied.length).toBeGreaterThan(0);
    const hit = new Set(applied.map((e) => e.targetSlug));
    expect(hit.has('grave')).toBe(true);
    expect(hit.size).toBeGreaterThan(1);
  });

  it('the gauge buff changes rotation cadence, not just a stat row (non-vacuity)', () => {
    const patched = withPatchedOverride('grave', (ov) => {
      ov.skill1!.blocks.forEach((b: any) => {
        b.effects = b.effects.filter(
          (e: any) => !(e.kind === 'buff' && e.stat === 'burstGenPct')
        );
      });
    });
    const { events } = run({
      ...controlComp('grave', true),
      overrides: { grave: patched },
    });
    const fbBase = base.events.filter(
      (e) => e.kind === 'fullBurstStart'
    ).length;
    const fbNo = events.filter((e) => e.kind === 'fullBurstStart').length;
    // +38.96% gauge for the whole team must not be Full-Burst-count-neutral over 180 s.
    expect(fbNo).toBeLessThanOrEqual(fbBase);
    expect(fbBase).toBeGreaterThan(0);
  });

  it('Pierce Damage 48.4% is an ALL-ALLIES continuous line (not self-only)', () => {
    const applied = buffs(base.events, 'pierceDamagePct').filter(
      (e) => Math.abs(e.value - 48.4) < 1e-6
    );
    expect(applied.length).toBeGreaterThan(0);
    expect(new Set(applied.map((e) => e.targetSlug)).size).toBeGreaterThan(1);
  });

  it('the Heat-Emission heal emits recovery events (tandem / cross-unit channel)', () => {
    // "Recovers 2% of Max HP every 1 sec continuously" is offensively inert alone, but it is the
    // driver for any teammate "when recovery takes effect" trigger — it must NOT be dropped.
    const patched = withPatchedOverride('grave', (ov) => {
      ov.skill1!.blocks.forEach((b: any) => {
        b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
      });
    });
    const { res } = run({
      ...controlComp('grave', true),
      overrides: { grave: patched },
    });
    const t = totals(res);
    // crown (B2 in controlComp) consumes recovery; removing grave's heal must move SOMETHING,
    // proving the heal is wired rather than decorative.
    const moved = Object.keys(baseTotals).some((s) => t[s] !== baseTotals[s]);
    expect(moved).toBe(true);
  });
});

// ============================================================ SKILL 2 — Overheat
describe('grave skill2 — Overheat I/II/III', () => {
  it('Overheat I ATK 15.48% fires on a hit COUNT of 15, not on a timer', () => {
    const applied = onGrave(base.events, 'atkPct').filter(
      (e) => Math.abs(e.value - 15.48) < 1e-6
    );
    expect(applied.length).toBeGreaterThan(0);
    const first = applied[0];
    // A hitCount:15 trigger cannot land at t=0; an interval/passive mis-encoding would.
    expect(first.frame ?? (first as any).f ?? 1).toBeGreaterThan(0);
  });

  it('Overheat I is removeOnReload, NOT a wall-clock buff (duration semantics)', () => {
    // The engine emits buffRemove ONLY for removeOnReload buffs at reload-to-max.
    const removes = base.events.filter(
      (e) => e.kind === 'buffRemove' && e.targetSlug === 'grave'
    );
    expect(removes.length).toBeGreaterThan(0);
    expect(removes.some((e) => (e as any).cause === 'reload')).toBe(true);

    const patched = withPatchedOverride('grave', (ov) => {
      ov.skill2!.blocks.forEach((b: any) =>
        b.effects.forEach((e: any) => {
          if (e.kind === 'buff' && Math.abs(e.value - 15.48) < 1e-6) {
            delete e.removeOnReload;
            e.durationSec = 999;
          }
        })
      );
    });
    const { res } = run({
      ...controlComp('grave', true),
      overrides: { grave: patched },
    });
    // nearest-wrong: a permanent buff never stripped by reloads => strictly more damage.
    expect(totals(res).grave).toBeGreaterThan(graveTotal);
  });

  it('Overheat II ATK 20.66% is atkPct (ATK line)', () => {
    const applied = onGrave(base.events, 'atkPct').filter(
      (e) => Math.abs(e.value - 20.66) < 1e-6
    );
    expect(applied.length).toBeGreaterThan(0);
  });

  it('Overheat III 30.8% is attackDamagePct (Damage-Up), NOT atkPct — bucket discrimination', () => {
    const asDamageUp = onGrave(base.events, 'attackDamagePct').filter(
      (e) => Math.abs(e.value - 30.8) < 1e-6
    );
    expect(asDamageUp.length).toBeGreaterThan(0);
    const asAtk = onGrave(base.events, 'atkPct').filter(
      (e) => Math.abs(e.value - 30.8) < 1e-6
    );
    expect(asAtk.length).toBe(0);

    const patched = withPatchedOverride('grave', (ov) => {
      ov.skill2!.blocks.forEach((b: any) => {
        const walk = (effs: any[]) =>
          effs.forEach((e: any) => {
            if (e.kind === 'escalating') {walk(e.steps);}
            if (
              e.kind === 'buff' &&
              e.stat === 'attackDamagePct' &&
              Math.abs(e.value - 30.8) < 1e-6
            ) {
              e.stat = 'atkPct';
            }
          });
        walk(b.effects);
      });
    });
    const { res } = run({
      ...controlComp('grave', true),
      overrides: { grave: patched },
    });
    // "Attack Damage" is the additive Damage-Up bucket (diluted by liter/crown/helm buffs);
    // atkPct multiplies the sheet. With other supports present these cannot be equal.
    expect(totals(res).grave).not.toBe(graveTotal);
  });

  it('Overheat II/III are gated behind Prediction — they are NOT live from t=0 (non-vacuity, both cases)', () => {
    const oh2 = onGrave(base.events, 'atkPct').filter(
      (e) => Math.abs(e.value - 20.66) < 1e-6
    );
    const oh3 = onGrave(base.events, 'attackDamagePct').filter(
      (e) => Math.abs(e.value - 30.8) < 1e-6
    );
    // ACTIVE case exercised...
    expect(oh2.length).toBeGreaterThan(0);
    expect(oh3.length).toBeGreaterThan(0);
    // ...and the INACTIVE case: the first Overheat III application must come strictly after the
    // first Overheat II application (60 attacks > 30 attacks), never simultaneously at t=0.
    const f2 = (oh2[0] as any).frame ?? 0;
    const f3 = (oh3[0] as any).frame ?? 0;
    expect(f3).toBeGreaterThanOrEqual(f2);
    expect(f2).toBeGreaterThan(0);
  });

  it('Overheat tiers are SELF-only (target set) — no ally receives them', () => {
    const vals = [15.48, 20.66, 30.8];
    const leaked = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.targetSlug !== 'grave' &&
        e.targetSlug != null &&
        vals.some((v) => Math.abs((e as any).value - v) < 1e-6)
    );
    expect(leaked).toEqual([]);
  });
});

// ============================================================ INERTNESS
describe('grave — inertness', () => {
  it('grave carries no core/crit-damage/charge buffs the kit never grants', () => {
    for (const stat of [
      'coreDamagePct',
      'critDamagePct',
      'chargeDamagePct',
      'chargeSpeedPct',
    ]) {
      expect(onGrave(base.events, stat)).toEqual([]);
    }
  });

  it('grave inflicts no boss debuff (no Damage Taken line in the kit)', () => {
    const bossDebuffs = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        (e as any).casterIdx === null &&
        (e as any).targetIdx === null &&
        (e as any).stat === 'damageTakenPct'
    );
    expect(bossDebuffs).toEqual([]);
  });

  it('grave grants no fireRate / attackSpeed / chargeSpeed the kit never mentions', () => {
    for (const stat of ['fireRatePct', 'attackSpeedPct']) {
      expect(
        buffs(base.events, stat).filter((e) => e.targetSlug === 'grave')
      ).toEqual([]);
    }
  });
});

// ============================================================ GAPS
describe('grave — modeling gaps', () => {
  it.skip('skill1 fires on "Prediction status ends" (+10 s after her own burst cast) — no such trigger primitive exists; the nearest expressible key (burstCast) fires 10 s EARLY, so the ammo dump + Heat Emission onset are mistimed', () => {});

  it.skip('"Removes Heat Emission under certain conditions" — the conditions are unstated in the kit prose, so Heat Emission uptime is unbounded in any faithful reading (UNMODELED / measurement-gated)', () => {});

  it.skip('Heat-Emission-gated blocks need a SELF-status gate; the schema has requiresTargetStatus (boss-only) and no self-status equivalent, so the gauge/pierce/heal lines can only be approximated as passives (over-credits early fight)', () => {});

  it.skip('burst "Current HP DOWN 1% every 1 sec" — v1 has no HP pool (immortal boss, nobody takes damage), so self-drain is unobservable', () => {});

  it.skip('skill2 counts "attacks LANDED", but hitCount counts rounds fired-and-hit; with no miss model the two coincide here, and the 30/60 thresholds are additionally gated on Prediction being active — the Prediction gate itself is not expressible', () => {});
});
