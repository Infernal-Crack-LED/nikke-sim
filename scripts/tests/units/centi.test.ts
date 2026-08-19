// PER-UNIT KIT SPEC — `centi` (Centi (Treasure), Defender/RL/Iron, Burst II, cd 20s, ammo 6,
// chargeFrames 60, reloadFrames 111). Kit-autonomy gauntlet 2026-08-18.
//
// Kit (data/characters.json → characters.centi.skills, max-level prose):
//   S1 ■ Activates at the start of battle. Forcefully uses Skill 2.                    [C-UNMODELED]
//      ■ Activates when landing a Full Charge attack. Affects self.
//        Cooldown of Skill 2 ▼ 9.16%.                                                  [C-UNMODELED]
//      ■ Activates when the shield created by Centi is destroyed. Affects all allies.
//        Recovers 9.7% of the skill user's final Max HP as HP.                         [C-UNMODELED]
//   S2 ■ Affects all allies.
//      Creates a Shield equal to 7% of the skill user's final Max HP for 5 sec.        [C-UNMODELED]
//   BU ■ Affects 5 enemy unit(s) with the lowest remaining HP.
//        Deals 145.46% of final ATK as damage.                                         [C1]
//        DEF ▼ 14.54% for 10 sec.                                                      [C2]
//      ■ Affects self.
//        Max HP ▲ 5% for 10 sec.                                                       [C-UNMODELED]
//
// Why each assertion discriminates:
//   C1  the burst nuke is burstCast-keyed — it lands BEFORE the Full Burst window opens,
//       so it must never take the +50% FB major (helm H7 / mica precedent). The nearest-wrong
//       is fullBurstEnter keying which would apply the major. Also pinned at exactly 145.46%
//       ATK, burst bucket, one instance per cast (5-target selection collapses to the lone boss).
//   C2  the DEF debuff is on the enemy DEF channel (defPct -14.54, mica precedent), NOT
//       damageTakenPct (a different mechanic). Removing it changes team totals (the debuff
//       lowers boss DEF → more damage from all allies). The counterfactual (damageTakenPct
//       laundering) is discriminated.
//
// UNMODELED lines (all offensively inert at scope lock):
//   - S1 battle-start force S2: shield creation, no DPS impact
//   - S1 Full Charge → S2 CD reduction: CD reduction of an offensively inert skill
//   - S1 shield-destroyed heal: no shield-break model in v1
//   - S2 shield creation: shields don't affect damage dealt
//   - Burst self Max HP ▲5%: no HP→ATK conversion for centi
//
// Fixture: ['liter', 'centi', 'helm'] boss Electric (Iron ×1.1 advantage), focus centi.
// centi is the sole B2 (liter B1 20s, helm B3 40s). Deterministic (no seed).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const CENTI = 1; // slot index in the comp

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: ['liter', 'centi', 'helm'],
    bossElement: 'Electric',
    focusSlug: 'centi',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- counterfactual / isolation patches -----------------------------------------------
/** C2 reference: DEF debuff line removed entirely. */
const centiNoDefDebuff = withPatchedOverride('centi', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.stat === 'defPct' && e.value < 0)
  );
  if (ov.burst.length === before) {
    throw new Error('centi burst defPct block missing — fixture is stale');
  }
});

/** C2 counterfactual: defPct laundered to damageTakenPct (mica precedent trap). */
const centiDamageTaken = withPatchedOverride('centi', (ov) => {
  for (const b of ov.burst) {
    for (const e of b.effects) {
      if (e.stat === 'defPct' && e.value < 0) {
        e.stat = 'damageTakenPct';
        e.value = Math.abs(e.value); // damageTaken is positive (more damage taken)
      }
    }
  }
});

// ---- runs (hoisted: each is a full 180s sim) ------------------------------------------
const base = run();
const noDebuff = run({ centi: centiNoDefDebuff });
const laundered = run({ centi: centiDamageTaken });

// ---- readers --------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const centiDamage = (evs: SimEvent[], srcSlot: Damage['srcSlot']) =>
  dmg(evs).filter((d) => d.slug === 'centi' && d.srcSlot === srcSlot);
const centiBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'centi'
  );
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');

describe('centi (Treasure) — kit spec', () => {
  describe('C1 — burst nuke: 145.46% of final ATK, cast BEFORE the Full Burst window', () => {
    const nukes = centiDamage(base.events, 'burst');

    it('fires once per burst cast at the kit magnitude, in the burst bucket', () => {
      expect(nukes.length).toBe(centiBursts(base.events).length);
      expect(nukes.length).toBeGreaterThan(0);
      expect([...new Set(nukes.map((d) => d.atkPct))]).toEqual([145.46]);
      expect([...new Set(nukes.map((d) => d.bucket))]).toEqual(['burst']);
    });

    it('never takes the +50% Full Burst major (the cast lands before FB opens)', () => {
      const took = nukes.filter((d) => d.fbMajorApplied);
      expect(
        took.map((d) => d.sec),
        'burst-cast damage must precede the FB window'
      ).toEqual([]);
    });

    it('is UNTAGGED — no burstDesc (5-target selection is not an amp literal)', () => {
      // burstDesc is on the override effect, not the damage event; check the override directly.
      const ov = JSON.parse(
        readFileSync(
          new URL('../../../src/skills/overrides/centi.json', import.meta.url),
          'utf8'
        )
      );
      const flatDmg = ov.burst
        .flatMap((b: any) => b.effects)
        .filter((e: any) => e.kind === 'flatDamage');
      expect(flatDmg.every((e: any) => !e.burstDesc)).toBe(true);
    });
  });

  describe('C2 — DEF ▼ 14.54% for 10 sec on enemy (burstCast keyed)', () => {
    // Enemy-targeted buffs carry casterIdx as null in the event; identify by the key
    // which includes the owner slot: "1:burst:defPct:-14.54"
    const applied = buffs(base.events).filter(
      (b) =>
        b.stat === 'defPct' &&
        b.value === -14.54 &&
        b.key.startsWith(`${CENTI}:burst:`)
    );

    it('applies on every burst cast with the correct magnitude and duration', () => {
      expect(applied.length).toBe(centiBursts(base.events).length);
      expect(applied.length).toBeGreaterThan(0);
      for (const b of applied) {
        expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
      }
    });

    it('removing the debuff changes team totals (it is live, not inert)', () => {
      expect(base.totals).not.toEqual(noDebuff.totals);
    });

    it('DISCRIMINATING: damageTakenPct laundering produces different totals', () => {
      // The defPct channel (boss DEF reduction) and damageTakenPct channel (boss takes more
      // damage) are mechanically distinct. The nearest-wrong encoding must MOVE totals
      // differently than the shipped encoding.
      const shippedLiter = base.totals.liter;
      const noDebuffLiter = noDebuff.totals.liter;
      const launderedLiter = laundered.totals.liter;
      const shippedDelta = shippedLiter - noDebuffLiter;
      const launderedDelta = launderedLiter - noDebuffLiter;
      expect(
        shippedDelta,
        'shipped debuff must lift liter damage vs the no-debuff baseline'
      ).not.toBe(0);
      expect(
        Math.abs(shippedDelta - launderedDelta) > 0,
        'defPct and damageTakenPct are mechanically distinct channels'
      ).toBe(true);
    });
  });

  describe('C-UNMODELED — skill1/skill2 produce no damage or buff events', () => {
    it('no skill1 or skill2 damage events from centi', () => {
      const skillDmg = dmg(base.events).filter(
        (d) =>
          d.slug === 'centi' &&
          (d.srcSlot === 'skill1' || d.srcSlot === 'skill2')
      );
      expect(skillDmg).toEqual([]);
    });
  });
});
