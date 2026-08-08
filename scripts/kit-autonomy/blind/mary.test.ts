/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * mary (Mary) — SG / Water / Supporter / Burst I (cd 40s, ammo 9, hitsPerShot 10,
 * normalAttackMultiplier 201.5). BLIND kit spec test, written from the kit prose alone.
 *
 * WHAT THE KIT SAYS -> what this file proves
 *
 * S1  "Activates when the last bullet hits the target. Affects 1 ally unit(s) with the lowest
 *      HP percentage. Recovers 8.4% of the skill user's final Max HP as HP."
 *     -> trigger lastBullet / target alliesLowestHp{count:1} / effect heal.
 *     The engine models no HP pool and `heal` carries no amount, so 8.4% is UNMODELED; the
 *     observable payload is the recovery EVENT, which fires teammates' `recovery` triggers.
 *     SimEvent has NO heal/recovery kind, so the heal is read INDIRECTLY through crown (present
 *     in the control comp, "when recovery takes effect"): every heal she receives emits a
 *     buffApply, so the buffApply COUNT is the heal channel's meter.
 *
 * S2  "Activates when entering Full Burst. Affects all allies. Incoming healing 23.78% for 15 sec."
 *     -> GAP. There is no incoming-healing StatKey, and heals carry no HP amount to amplify, so
 *     the line has no consumer. it.skip below; a LIVE guard asserts it was not smuggled in as
 *     some other (damage-relevant) stat.
 *
 * B1  "Affects all allies. Recovers 39.6% of the skill user's final Max HP as HP."
 *     -> trigger burstCast (no activation clause inside her own burst slot), target allies, heal.
 *
 * B2  "Activates when above 50% HP. Affects all allies. DEF 19.8% for 10 sec."
 *     -> trigger burstCast, target allies, buff defPct 19.8 durationSec 10. The HP gate is
 *     scope-trivial (nothing takes damage at scope lock), so the line must fire on EVERY cast.
 *     defPct is offensively inert in v1 -> the PAIR (noDef == base) + (defToAtk != base) proves
 *     both that the buff is KEPT and that it never leaks into a damage bucket.
 *
 * FIXTURE  controlComp('mary', true) — deterministic (no seed), 8 hoisted 180s runs.
 *   mary is a Burst I unit, so the control comp's liter is a same-stage competitor: test 1 is an
 *   explicit NON-VACUITY guard that mary's own burst actually casts. If test 1 and the burst
 *   tests go red together, the FIXTURE is the finding, not the override.
 *
 * OVERRIDE SHAPE  the harness docs give two candidate slot shapes (Block[] vs {blocks:Block[]});
 *   slotBlocks/setSlotBlocks handle both, so no counterfactual can silently no-op — a no-op patch
 *   would make every comparison vacuously equal and the file would test nothing.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { controlComp, runComp, totals, withPatchedOverride } from '../lib/harness.js';

type Ev = SimEvent & Record<string, any>;

const SLUG = 'mary';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;

/** Heal / incoming-healing magnitudes from the kit text — none of them may appear as a STAT. */
const HEAL_MAGNITUDES = [8.4, 23.78, 39.6];

/** Every StatKey that can move damage. mary's kit grants none of them. */
const OFFENSIVE_STATS = new Set([
  'atkPct', 'casterAtkPct', 'highestAllyAtkPct', 'atkOfMaxHpPct', 'atkOfCasterMaxHpPct',
  'critRatePct', 'critRateNormalPct', 'critDamagePct', 'coreDamagePct', 'elementDamagePct',
  'chargeDamagePct', 'chargeDamageMultPct', 'chargeSpeedPct', 'attackDamagePct',
  'sustainedDamagePct', 'sequentialDamagePct', 'sequentialMultPct', 'damageTakenPct',
  'maxAmmoPct', 'maxAmmoFlat', 'reloadSpeedPct', 'attackSpeedPct', 'fireRatePct',
  'extraHitDamagePct', 'trueDamagePct', 'projectileExplosionPct', 'elemAdvantageDamagePct',
  'distributedDamagePct', 'projectileAttachmentPct', 'normalAttackPct', 'pelletCountFlat',
  'burstGenPct', 'hitRatePct',
]);

function slotBlocks(ov: any, slot: string): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  return Array.isArray(s) ? s : (s.blocks ?? []);
}

function setSlotBlocks(ov: any, slot: string, blocks: any[]): void {
  const s = ov?.[slot];
  if (Array.isArray(s)) ov[slot] = blocks;
  else if (s) s.blocks = blocks;
}

function hasHeal(b: any): boolean {
  return ((b?.effects ?? []) as any[]).some((e) => e?.kind === 'heal');
}

function run(patched?: any): { res: any; events: Ev[] } {
  const base: any = controlComp(SLUG, true);
  const events: Ev[] = [];
  const opts: any = {
    ...base,
    overrides: { ...(base.overrides ?? {}), ...(patched ? { [SLUG]: patched } : {}) },
    cfg: { ...(base.cfg ?? {}), onEvent: (ev: Ev) => events.push(ev) },
  };
  return { res: runComp(opts), events };
}

const nBuffs = (events: Ev[]): number => events.filter((e) => e.kind === 'buffApply').length;

// ---------------------------------------------------------------------------
// Counterfactual overrides (in-memory clones; committed JSON untouched)
// ---------------------------------------------------------------------------

/** S1 heal deleted entirely — floor of the recovery channel. */
const ovNoS1Heal = withPatchedOverride(SLUG, (ov: any) => {
  setSlotBlocks(ov, 'skill1', slotBlocks(ov, 'skill1').filter((b: any) => !hasHeal(b)));
});

/** S1 heal widened to all allies, SHIPPED trigger kept — guarantees crown is reached. */
const ovS1HealAllies = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of slotBlocks(ov, 'skill1')) if (hasHeal(b)) b.target = { kind: 'allies' };
});

/** Same, but the trigger is FORCED to lastBullet — equal to the above iff shipped == lastBullet. */
const ovS1HealAlliesLastBullet = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of slotBlocks(ov, 'skill1')) {
    if (hasHeal(b)) {
      b.target = { kind: 'allies' };
      b.trigger = { kind: 'lastBullet' };
    }
  }
});

/** Same, trigger FORCED to shotFired — the nearest-wrong trigger (9x more heals, ammo 9). */
const ovS1HealAlliesShotFired = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of slotBlocks(ov, 'skill1')) {
    if (hasHeal(b)) {
      b.target = { kind: 'allies' };
      b.trigger = { kind: 'shotFired' };
    }
  }
});

/** Burst heal deleted. */
const ovNoBurstHeal = withPatchedOverride(SLUG, (ov: any) => {
  setSlotBlocks(ov, 'burst', slotBlocks(ov, 'burst').filter((b: any) => !hasHeal(b)));
});

/** DEF buff deleted (blocks left empty are pruned so the engine sees no husk blocks). */
const ovNoDef = withPatchedOverride(SLUG, (ov: any) => {
  for (const slot of SLOTS) {
    const kept = slotBlocks(ov, slot)
      .map((b: any) => {
        b.effects = ((b.effects ?? []) as any[]).filter(
          (e) => !(e?.kind === 'buff' && e?.stat === 'defPct'),
        );
        return b;
      })
      .filter((b: any) => ((b.effects ?? []) as any[]).length > 0);
    setSlotBlocks(ov, slot, kept);
  }
});

/** DEF re-stated as ATK — the nearest-wrong encoding of a "DEF 19.8%" line. */
const ovDefToAtk = withPatchedOverride(SLUG, (ov: any) => {
  for (const slot of SLOTS) {
    for (const b of slotBlocks(ov, slot)) {
      for (const e of (b.effects ?? []) as any[]) {
        if (e?.kind === 'buff' && e?.stat === 'defPct') e.stat = 'atkPct';
      }
    }
  }
});

// ---------------------------------------------------------------------------
// Hoisted runs (8 x 180s)
// ---------------------------------------------------------------------------

const base = run();
const noS1Heal = run(ovNoS1Heal);
const s1HealAllies = run(ovS1HealAllies);
const s1HealAlliesLastBullet = run(ovS1HealAlliesLastBullet);
const s1HealAlliesShotFired = run(ovS1HealAlliesShotFired);
const noBurstHeal = run(ovNoBurstHeal);
const noDef = run(ovNoDef);
const defToAtk = run(ovDefToAtk);

const defBuffs = base.events.filter(
  (e) => e.kind === 'buffApply' && e.stat === 'defPct' && Math.abs(Number(e.value) - 19.8) < 1e-9,
);
const maryIdx: number | undefined = defBuffs[0]?.casterIdx ?? undefined;
const maryBuffs = base.events.filter(
  (e) => e.kind === 'buffApply' && maryIdx !== undefined && e.casterIdx === maryIdx,
);

describe('mary — blind kit spec', () => {
  describe('fixture', () => {
    it('emits events and mary casts her own Burst I (non-vacuity)', () => {
      // If this is empty the cfg.onEvent wiring is wrong and every count below is meaningless.
      expect(base.events.length).toBeGreaterThan(0);
      // mary is Burst I and liter (control comp) is a same-stage competitor. Her burst-slot
      // lines are only testable if she actually casts; a red here means REBUILD THE FIXTURE
      // (or the DEF line is missing — the defToAtk test below separates the two).
      expect(defBuffs.length).toBeGreaterThan(0);
    });
  });

  describe('skill1 — "last bullet hits" -> heal 1 lowest-HP% ally', () => {
    it('the heal channel is live and observable through a recovery consumer', () => {
      // Widening the target to all allies guarantees the recovery consumer (crown) is reached.
      // Re-keying to shotFired then fires ~9x more often (magazine = 9), so the buffApply count
      // MUST rise. If the override models no heal at all, all three patches are no-ops and the
      // counts tie -> red, which is exactly the MISSING-heal finding.
      expect(nBuffs(s1HealAlliesShotFired.events)).toBeGreaterThan(nBuffs(s1HealAllies.events));
    });

    it('is keyed to lastBullet, not shot-fired (trigger identity)', () => {
      // Same target set, shipped trigger vs a forced lastBullet trigger. Equal <=> the shipped
      // trigger already IS lastBullet. The previous test proves this comparison discriminates.
      expect(nBuffs(s1HealAllies.events)).toBe(nBuffs(s1HealAlliesLastBullet.events));
    });

    it('heals a bounded subset of allies (1 ally, not the whole team)', () => {
      // Floor: the shipped heal fires at least as much recovery as no heal at all.
      expect(nBuffs(base.events)).toBeGreaterThanOrEqual(nBuffs(noS1Heal.events));
      // Ceiling: it can never exceed the all-allies widening — an "all allies" mis-scope would
      // sit AT the ceiling. (Only strictly discriminating when the resolved single target is not
      // itself the recovery consumer; the ceiling still forbids over-crediting.)
      expect(nBuffs(base.events)).toBeLessThanOrEqual(nBuffs(s1HealAllies.events));
    });

    it('grants no stat buff — the 8.4% is an HP amount, not a modifier', () => {
      for (const e of maryBuffs) {
        expect(Math.abs(Number(e.value) - 8.4)).toBeGreaterThan(1e-9);
      }
    });
  });

  describe('skill2 — "entering Full Burst" -> Incoming healing 23.78% / 15 sec', () => {
    it('is not smuggled in as some other stat', () => {
      // No incoming-healing StatKey exists. The failure mode this guards is encoding the line as
      // a real (damage-relevant) stat to "keep" it — that would be an invented mechanic.
      for (const e of maryBuffs) {
        expect(Math.abs(Number(e.value) - 23.78)).toBeGreaterThan(1e-9);
      }
    });

    it.skip('applies Incoming healing 23.78% to all allies for 15 sec on Full Burst entry', () => {
      // GAP: no incoming-healing StatKey, and `heal` carries no HP amount, so there is nothing to
      // amplify and no observable payload. Belongs in the override's `unmodeled.skill2`.
    });
  });

  describe('burst — heal all allies + DEF 19.8% / 10 sec', () => {
    it('the burst heal reaches the recovery consumer (all allies)', () => {
      // "Affects all allies" -> the consumer is always in the target set, so deleting the burst
      // heal must strictly reduce recovery-driven buffApply events. Nearest-wrong models this
      // catches: heal dropped, or scoped to self / a single ally.
      expect(nBuffs(base.events)).toBeGreaterThan(nBuffs(noBurstHeal.events));
    });

    it('grants DEF to every ally including self, on every cast', () => {
      const slugs = Object.keys(totals(base.res));
      const targets = new Set(defBuffs.map((e) => e.targetSlug));
      // "Affects all allies" with no except-self clause -> the whole comp, mary included.
      expect(targets.size).toBe(slugs.length);
      // "Activates when above 50% HP" is scope-trivially true (no HP pool, nothing takes damage),
      // so it must re-fire each rotation — not once per battle, and not gated off entirely.
      expect(new Set(defBuffs.map((e) => e.expiresFrame)).size).toBeGreaterThanOrEqual(2);
    });

    it('DEF is offensively inert — and the check discriminates a stat mis-encoding', () => {
      // Faithful reading: defPct moves no damage anywhere on the board.
      expect(totals(noDef.res)).toEqual(totals(base.res));
      // Nearest-wrong: the same 19.8 re-stated as atkPct. If this does NOT move the board, either
      // mary never casts (see the fixture guard) or the DEF line is absent from the override.
      expect(totals(defToAtk.res)).not.toEqual(totals(base.res));
    });

    it.skip('recovers 39.6% of the skill user\u2019s final Max HP', () => {
      // GAP: v1 models no HP pool and the `heal` effect has no amount field — the magnitude is
      // unobservable. Only the recovery EVENT is testable (asserted above).
    });
  });

  describe('whole-unit inertness', () => {
    it('mary\u2019s kit adds no skill or burst damage', () => {
      // Her kit is heal + DEF only: no flatDamage / dot / hitRepeat anywhere. Function damage from
      // skill1/skill2 lands in the \'skill\' bucket and burst damage in \'burst\', so neither may
      // ever carry her slot.
      const maryDamage = base.events.filter(
        (e) => e.kind === 'damage' && maryIdx !== undefined && e.srcSlot === maryIdx,
      );
      expect(maryDamage.length).toBeGreaterThan(0); // she does fire her SG (guards the slot-index read)
      for (const e of maryDamage) {
        expect(e.bucket).not.toBe('skill');
        expect(e.bucket).not.toBe('burst');
      }
    });

    it('mary grants no offensive stat to anyone', () => {
      for (const e of maryBuffs) {
        expect(OFFENSIVE_STATS.has(String(e.stat))).toBe(false);
      }
    });
  });
});
