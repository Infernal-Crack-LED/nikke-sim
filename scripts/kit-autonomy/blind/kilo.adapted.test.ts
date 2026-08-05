import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

/* eslint-disable @typescript-eslint/no-explicit-any -- blind spec: the override file and the event
   objects are inspected STRUCTURALLY (slot arrays / event field bags), so `any` is the honest type. */

/**
 * kilo — MG / Fire / Defender / Burst III (cd 40 s, ammo 300, hitsPerShot 1,
 * normalAttackMultiplier 5.57, coreAttackMultiplier 200).
 *
 * BLIND kit-spec tests: written from the kit prose ALONE — the shipped override, the driver's
 * tests and any truth file were not read.
 *
 * KIT STRUCTURE (payloads paraphrased, magnitudes verbatim):
 *   S1-a  "at the start of battle" / self   → Nano Coating shield = 21.12% of own final Max HP, continuously.
 *   S1-b  "when using Burst Skill" / self   → the SAME shield, only "if not in Nano Coating status".
 *   S2-a  "after 200 normal attacks WHILE in Nano Coating" / self → restores shield HP = 2.85% of own final Max HP.
 *   S2-b  "when using Burst Skill while NOT in Nano Coating" / self → escalating
 *          Once/Twice/Three times: Next Shield's HP ▲ 17.75 / 26.66 / 35.53%, continuously.
 *   B-a   "when in Nano Coating status" / all enemies → damage = 1150.84% of an ATK that is
 *          itself computed from 5% of final Max HP.
 *   B-b   "when NOT in Nano Coating status" / self → Max HP ▲ 48% for 20 sec.
 *
 * LOAD-BEARING READING — the entire kit branches on ONE status, Nano Coating:
 *   S1-a raises the shield at frame 0 and the kit says "continuously"; the v1 boss deals no damage,
 *   so nothing can ever break it. kilo is therefore in Nano Coating for the whole 180 s at scope
 *   lock, which means the IN-status branches (S2-a's gate, B-a) are the only ones that ever fire and
 *   every NOT-in-status branch (S1-b, S2-b, B-b) is PERMANENTLY INERT. The engine has
 *   `requiresShielded` (active only WHILE shielded) but no negative counterpart, so a faithful model
 *   omits the three negative branches rather than gating them. The nearest-wrong model — reading
 *   "Activates when using Burst Skill" literally and shipping B-b live — is caught by
 *   `burst B-b: the Max HP ▲48% branch never fires` (behavioural) and by the burst-slot Max-HP stat
 *   sweep (structural).
 *
 * FIXTURE: controlComp('kilo', false) — liter (B1) + crown (B2) + kilo (B3). The fixed second B3
 *   slot is dropped on purpose:
 *     • kilo becomes the SOLE Burst III, so she casts on every rotation (maximal sample) and a lone
 *       B3 making ZERO full bursts is impossible (B1 + B2 are present to chain);
 *     • every fullBurstStart then corresponds 1:1 to a kilo burst cast, which is what lets the burst
 *       assertions count casts without a per-event unit id;
 *     • liter's and crown's bursts are pure buffs, so kilo is the ONLY source of burst-BUCKET damage
 *       in this comp — `bucket === 'burst'` IS kilo attribution here;
 *     • it also removes the fixed B3's own buffs as a confound on the damage reads.
 *   4 full 180 s runs total (base + 3 counterfactuals).
 */

type Ev = SimEvent & Record<string, any>;
type Opts = ReturnType<typeof controlComp>;

const SLUG = 'kilo';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;
type Slot = (typeof SLOTS)[number];

// The override FILE is slot-keyed; a slot is either a Block[] or a CharacterSkills carrying .blocks.
// Read/write through these two helpers so the spec is agnostic to which of the two shapes ships.
function slotBlocks(ov: any, slot: Slot): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return Array.isArray(s.blocks) ? s.blocks : [];
}
function setSlotBlocks(ov: any, slot: Slot, blocks: any[]): void {
  const next = [...blocks];
  const s = ov?.[slot];
  if (Array.isArray(s)) {
    s.length = 0;
    s.push(...next);
    return;
  }
  if (s && Array.isArray(s.blocks)) {
    s.blocks.length = 0;
    s.blocks.push(...next);
    return;
  }
  ov[slot] = next;
}
function allEffects(ov: any): { slot: Slot; block: any; eff: any }[] {
  return SLOTS.flatMap((slot) =>
    slotBlocks(ov, slot).flatMap((block: any) =>
      ((block?.effects ?? []) as any[]).map((eff) => ({ slot, block, eff })),
    ),
  );
}

function run(opts: Opts): { res: ReturnType<typeof runComp>; evs: Ev[] } {
  const evs: Ev[] = [];
  const o: any = { ...(opts as any) };
  o.cfg = {
    ...(o.cfg ?? {}),
    onEvent: (ev: SimEvent) => {
      evs.push(ev as Ev);
    },
  };
  return { res: runComp(o as Opts), evs };
}
type Run = ReturnType<typeof run>;

function withKilo(mutate: (ov: any) => void): Opts {
  const patched = withPatchedOverride(SLUG, mutate);
  const opts: any = { ...(controlComp(SLUG, false) as any) };
  opts.overrides = { ...(opts.overrides ?? {}), [SLUG]: patched };
  return opts as Opts;
}

// ---- runs (hoisted: each is a full 180 s sim) ------------------------------------------------

/** The committed override, deep-cloned and unmutated — read for the structural assertions. */
const OV: any = withPatchedOverride(SLUG, () => {});

const BASE = run(controlComp(SLUG, false));

/** S1 + S2 emptied. `requiresShielded` is also stripped off the burst so that a burst legitimately
 *  gated on Nano Coating does not vanish with the shield that satisfies it — this counterfactual
 *  must isolate "do the two shield skills contribute damage of their own?", nothing else. */
const NO_SKILLS = run(
  withKilo((ov) => {
    setSlotBlocks(ov, 'skill1', []);
    setSlotBlocks(ov, 'skill2', []);
    for (const b of slotBlocks(ov, 'burst')) delete b.requiresShielded;
  }),
);

/** Burst slot emptied — proves the B-a damage line is real and material to kilo's total. */
const NO_BURST = run(withKilo((ov) => setSlotBlocks(ov, 'burst', [])));

/** B-b injected LIVE (the nearest-wrong reading of "Activates when using Burst Skill"). Its
 *  maxHpFlat magnitude (0.48 × kilo's Max HP) must be a magnitude the faithful run never emits. */
const HP48 = run(
  withKilo((ov) => {
    setSlotBlocks(ov, 'burst', [
      ...slotBlocks(ov, 'burst'),
      {
        slot: 'burst',
        trigger: { kind: 'burstCast' },
        target: { kind: 'self' },
        effects: [
          { kind: 'buff', stat: 'targetMaxHpPct', value: 48, durationSec: 20 },
        ],
      },
    ]);
  }),
);

// ---- selectors ---------------------------------------------------------------------------------

const dmgEvents = (r: Run): Ev[] => r.evs.filter((e) => e.kind === 'damage');
const burstBucket = (r: Run): Ev[] =>
  dmgEvents(r).filter((e) => e.bucket === 'burst' || e.srcSlot === 'burst');
const fbStarts = (r: Run): number =>
  r.evs.filter((e) => e.kind === 'fullBurstStart').length;
const kiloHpGrants = (r: Run): number[] =>
  r.evs
    .filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'maxHpFlat' &&
        e.targetSlug === SLUG,
    )
    .map((e) => e.value as number);
const kiloTotal = (r: Run): number => totals(r.res)[SLUG];

// Every stat kilo's kit does NOT contain. Her whole kit carries exactly one stat line (Max HP ▲48%,
// on the inert branch) and no offensive buff of any kind — so any of these appearing is invention.
const OFFENSIVE_STATS = [
  'atkPct',
  'casterAtkPct',
  'highestAllyAtkPct',
  'atkOfMaxHpPct',
  'atkOfCasterMaxHpPct',
  'critRatePct',
  'critRateNormalPct',
  'critDamagePct',
  'coreDamagePct',
  'elementDamagePct',
  'chargeDamagePct',
  'chargeDamageMultPct',
  'chargeSpeedPct',
  'attackDamagePct',
  'sustainedDamagePct',
  'sequentialDamagePct',
  'sequentialMultPct',
  'damageTakenPct',
  'maxAmmoPct',
  'maxAmmoFlat',
  'reloadSpeedPct',
  'attackSpeedPct',
  'fireRatePct',
  'extraHitDamagePct',
  'trueDamagePct',
  'projectileExplosionPct',
  'elemAdvantageDamagePct',
  'distributedDamagePct',
  'projectileAttachmentPct',
  'normalAttackPct',
  'pelletCountFlat',
  'burstGenPct',
  'hitRatePct',
];

// ---- tests -------------------------------------------------------------------------------------

describe('kilo — blind kit-faithfulness spec', () => {
  it('fixture is non-vacuous: kilo is the sole B3, bursts chain, and she deals damage', () => {
    // A lone Burst III makes ZERO full bursts; liter (B1) + crown (B2) are in the comp precisely so
    // the chain completes. If this ever goes red every downstream assertion is meaningless.
    expect(fbStarts(BASE)).toBeGreaterThanOrEqual(2);
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
  });

  describe('burst B-a — "when in Nano Coating status": 1150.84% damage to all enemies', () => {
    it('fires exactly once per kilo burst cast, into the burst bucket', () => {
      const d = burstBucket(BASE);
      const fb = fbStarts(BASE);
      expect(d.length).toBeGreaterThanOrEqual(2); // non-vacuity
      // kilo is the sole B3, so #casts === #full bursts (a cast at the very end of the fight can
      // land its damage without its FB window ever opening — hence the +1 tolerance).
      expect(d.length).toBeGreaterThanOrEqual(fb);
      expect(d.length).toBeLessThanOrEqual(fb + 1);
      // Nearest-wrong: keyed to `passive`/`interval`/`shotFired` (count would run far past the FB
      // count), or the line dropped entirely (count 0).
    });

    it('is material to kilo\u2019s total damage', () => {
      // Nearest-wrong: the line recorded only in `unmodeled` / encoded as an inert stat buff.
      expect(kiloTotal(BASE)).toBeGreaterThan(kiloTotal(NO_BURST));
    });

    it('lands BEFORE Full Burst opens — no +50% major, no FB auras', () => {
      const d = burstBucket(BASE);
      expect(d.length).toBeGreaterThan(0);
      for (const ev of d) {
        expect(ev.inFullBurst).toBe(false);
        expect(ev.fbMajorApplied).toBe(false);
      }
      // Nearest-wrong: re-keyed to `fullBurstEnter` to "catch the buffs" — both flags would flip true.
    });

    it('takes no +30% range bonus (function-damage rider convention)', () => {
      const d = burstBucket(BASE);
      expect(d.length).toBeGreaterThan(0);
      for (const ev of d) expect(ev.rangeApplied).toBe(false);
    });

    it('is NOT a core strike — the kit text says nothing about core strike damage', () => {
      // Structural, because the event-level core rate can be 0 for band reasons and would pass
      // vacuously: the flag itself must be absent/false on every burst damage effect.
      const flats = allEffects(OV).filter(
        (x) => x.slot === 'burst' && x.eff?.kind === 'flatDamage',
      );
      expect(flats.length).toBeGreaterThan(0); // the 1150.84% line is a flatDamage rider
      for (const x of flats) expect(Boolean(x.eff.core)).toBe(false);
      for (const ev of burstBucket(BASE)) {
        expect(ev.coreRate ?? ev.core ?? 0).toBe(0);
      }
      // Nearest-wrong: core:true, which on a Defender with coreAttackMultiplier 200 would inflate
      // every burst by the core bucket.
    });
  });

  describe('burst B-b — "when NOT in Nano Coating status": Max HP \u25b2 48% for 20 sec', () => {
    it('never fires: kilo is in Nano Coating for the whole fight at scope lock', () => {
      // Self-calibrating: HP48 injects the branch, so the magnitude it emits (0.48 \u00d7 kilo\u2019s Max HP,
      // flat-resolved on buffApply as maxHpFlat) is BY CONSTRUCTION the magnitude a live B-b would
      // emit. Grants kilo receives from teammates appear in BOTH runs and cancel out, so this is
      // robust to whatever the B1/B2 slots hand her.
      const baseVals = kiloHpGrants(BASE);
      const cfVals = kiloHpGrants(HP48);
      expect(cfVals.length).toBeGreaterThan(baseVals.length); // non-vacuity: the CF really injects it
      const injected = cfVals.filter((v) => !baseVals.includes(v));
      expect(injected.length).toBeGreaterThan(0);
      // RED iff the shipped override already applies that same magnitude — i.e. B-b modelled live.
    });

    it('carries no Max-HP stat buff anywhere in the burst slot (structural)', () => {
      const hpStats = ['targetMaxHpPct', 'casterMaxHpPct', 'maxHpPct', 'highestAllyMaxHpPct'];
      const offenders = allEffects(OV).filter(
        (x) =>
          x.slot === 'burst' &&
          x.eff?.kind === 'buff' &&
          hpStats.includes(x.eff.stat),
      );
      expect(offenders).toEqual([]);
      // There is no negative-shield gate in the schema, so a live B-b cannot be gated off — the only
      // faithful encoding is omission (recorded in `unmodeled`).
    });
  });

  describe('skill1 / skill2 — the two shield lines', () => {
    it('S1-a: Nano Coating is a passive self shield of 21.12% of final Max HP', () => {
      const hit = slotBlocks(OV, 'skill1').filter(
        (b: any) =>
          b?.trigger?.kind === 'passive' &&
          b?.target?.kind === 'self' &&
          ((b.effects ?? []) as any[]).some(
            (e) => e?.kind === 'shield' && Math.abs((e.maxHpPct ?? 0) - 21.12) < 0.01,
          ),
      );
      expect(hit.length).toBeGreaterThan(0);
      // "Activates at the start of battle" + "continuously" = a passive with no durationSec.
      // Nearest-wrong: `interval`/`burstCast` keying, or a durationSec that lets the status lapse —
      // which would in turn switch the whole kit onto its NOT-in-Nano-Coating branches.
      for (const b of hit) {
        for (const e of b.effects as any[]) {
          if (e.kind === 'shield') expect(e.durationSec ?? undefined).toBeUndefined();
        }
      }
    });

    it('S2-a: the shield restore is keyed to 200 normal attacks (a ROUND count, not seconds)', () => {
      const hit = slotBlocks(OV, 'skill2').filter(
        (b: any) =>
          b?.trigger?.kind === 'hitCount' &&
          b?.trigger?.count === 200 &&
          b?.target?.kind === 'self' &&
          ((b.effects ?? []) as any[]).some(
            (e) => e?.kind === 'shield' && Math.abs((e.maxHpPct ?? 0) - 2.85) < 0.01,
          ),
      );
      expect(hit.length).toBeGreaterThan(0);
      // hitsPerShot is 1, so 200 rounds == 200 trigger pulls for kilo. Nearest-wrong: an
      // `interval` trigger with an invented cadence, or `shotFired` + everyN with a wrong phase.
    });

    it('neither skill slot produces damage or a stat buff — they are shield-only', () => {
      const nonShield = allEffects(OV).filter(
        (x) => x.slot !== 'burst' && x.eff?.kind !== 'shield',
      );
      expect(nonShield.map((x) => `${x.slot}:${x.eff?.kind}`)).toEqual([]);
      // Nearest-wrong: "Restores Shield HP" encoded as a `heal` (which would fire recovery triggers)
      // or fudged into a damage/ATK line because the shield payload is unmodellable.
    });

    it('clearing both shield skills is byte-identical for the whole team', () => {
      // Behavioural half of the line above: whatever the shields are encoded as, they must move no
      // damage — kilo\u2019s own or anyone else\u2019s. Burst `requiresShielded` is stripped in the CF so a
      // legitimately Nano-Coating-gated burst is not collateral.
      expect(totals(NO_SKILLS.res)).toEqual(totals(BASE.res));
    });
  });

  describe('no invented mechanics', () => {
    it('every block targets self or the enemy — kilo grants nothing to allies', () => {
      const targets = SLOTS.flatMap((s) =>
        slotBlocks(OV, s).map((b: any) => b?.target?.kind),
      );
      expect(targets.length).toBeGreaterThan(0);
      for (const t of targets) expect(['self', 'enemy']).toContain(t);
      // Every kit clause reads "Affects self" except the burst damage ("Affects all enemies").
    });

    it('effect kinds are limited to shield / flatDamage / buff', () => {
      const kinds = [...new Set(allEffects(OV).map((x) => x.eff?.kind))];
      expect(kinds.length).toBeGreaterThan(0);
      for (const k of kinds) expect(['shield', 'flatDamage', 'buff']).toContain(k);
      // Nearest-wrong: `heal` for the shield restore, `escalating` for the inert S2-b tier ladder,
      // `dot`/`hitRepeat`/`storedHit`/`weaponSwap`/`fillGauge` — none of which the kit text contains.
    });

    it('carries no offensive stat buff and no weapon-state modifier', () => {
      const bad = allEffects(OV)
        .filter((x) => x.eff?.kind === 'buff' && OFFENSIVE_STATS.includes(x.eff.stat))
        .map((x) => `${x.slot}:${x.eff.stat}`);
      expect(bad).toEqual([]);
      // kilo\u2019s kit has exactly one stat line in it (Max HP \u25b2 48%, on the inert branch) and zero
      // ATK/crit/ammo/reload/fire-rate lines.
    });

    it('declares no Pierce, no true normals, no modes and no resource pools', () => {
      expect(Boolean(OV.hasPierce)).toBe(false);
      expect(Boolean(OV.hasTrueNormals)).toBe(false);
      expect(OV.modes ?? undefined).toBeUndefined();
      expect(OV.resources ?? undefined).toBeUndefined();
      expect(OV.consolidation ?? undefined).toBeUndefined();
    });
  });

  describe('GAPS — kit lines this engine cannot express or observe', () => {
    it.skip('B-a magnitude: ATK "calculated from 5% of final Max HP" has no primitive', () => {
      // flatDamage.atkPct scales off the caster\u2019s FINAL ATK; there is no Max-HP-basis damage effect
      // (stackedNuke.hpPct is a different trigger mechanic). Any shipped atkPct is therefore a \u26d1
      // derived constant \u2248 1150.84 \u00d7 0.05 \u00d7 (maxHp / staticAtk), frozen at base stats and blind to live
      // Max-HP buffs. RECIPE: a maxHpFlat self-grant should raise this hit and an atkPct grant should
      // NOT \u2014 exactly inverted from what the current primitive does, so the magnitude is unassertable
      // until an atkOfMaxHpPct-style basis exists on flatDamage.
    });

    it.skip('S1-b: burst re-shield "if not in Nano Coating" \u2014 no negative-status gate, and inert', () => {
      // `requiresShielded` gates on HAVING a shield; there is no not-shielded counterpart. Moot at
      // scope lock (the v1 boss deals no damage, so S1-a\u2019s continuous shield never breaks), and
      // shield applications are not surfaced on cfg.onEvent \u2014 unobservable either way.
    });

    it.skip('S2-b: escalating "Next Shield\u2019s HP \u25b2 17.75/26.66/35.53%" \u2014 no shield-magnitude stat', () => {
      // StatKey has no shield-HP entry and no shield HP pool is modelled, so the tier ladder has no
      // representation. Doubly moot: the branch is gated on NOT being in Nano Coating.
    });

    it.skip('S2-a payload: the 2.85% shield restore amount is unobservable', () => {
      // No HP pool (immortal boss, nobody takes damage) and `shield` is not among the cfg.onEvent
      // kinds, so only the trigger keying (tested above) and damage-inertness are assertable.
    });
  });
});
