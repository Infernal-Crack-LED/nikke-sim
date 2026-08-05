/**
 * eunhwa — BLIND kit spec (cross-family S5 post-op; written from the kit prose alone,
 * with no sight of the driver's override, tests, or reasoning).
 *
 * KIT (SR / Fire / Attacker / Burst II, cd 20s, ammo 6, chargeFrames 60, hitsPerShot 1,
 *      normalAttackMultiplier 71.07, coreAttackMultiplier 200):
 *
 *   skill1  "Affects self. Activates after firing the last round."
 *             Charge Damage ▲ 37.28% for 2 shots
 *             Charge Speed  ▲ 15.53% for 2 rounds
 *   skill2  "Activates after firing the last bullet. Affects the target."
 *             DEF ▼ 29% for 5 sec
 *   burst   "Affects 10 enemy unit(s) with the highest final ATK."
 *             Deals 85.62% of final ATK as damage
 *             DEF ▼ 2.43% for 15 sec
 *           "Affects all allies."
 *             Critical Rate ▲ 4.65% for 15 sec
 *
 * READING (the four questions):
 *   scope     — nothing is scoped to normal attacks. "Critical Rate ▲" is generic critRatePct,
 *               NOT critRateNormalPct; "Charge Damage ▲" is additive chargeDamagePct, NOT the
 *               chargeDamageMultPct primitive (that one is worded "Charge Damage Multiplier").
 *   duration  — S1 is ROUND-COUNTED ("for 2 shots" / "for 2 rounds") => durationShots: 2 on both,
 *               so the window spans the reload that immediately follows the last bullet and covers
 *               the first two rounds of the next magazine. S2 (5 sec) and both burst lines (15 sec)
 *               are wall-clock => durationSec, with durationShots undefined.
 *   trigger   — S1 and S2 share ONE activation clause ("after firing the last round/bullet")
 *               => lastBullet on both: once per magazine, never once per trigger pull.
 *   target    — S1 self; S2 the enemy (boss-held debuff, targetIdx === null); burst line 1 the
 *               enemy; burst line 2 "all allies" with NO except-self clause => eunhwa included.
 *
 * SHAPE DEFENSIVENESS: the packet describes the override file two ways (slot -> Block[] and
 * slot -> { blocks: Block[] }), so blocksOf() accepts both. A wrong guess would silently turn every
 * counterfactual into a no-op — green-on-nothing, the worst failure available to a blind test.
 *
 * SIGN CONVENTION: value filters match on |value|, because the kit text fixes the MAGNITUDE and
 * DIRECTION of a ▼ debuff but not its encoding sign. Direction is asserted where it is unambiguous
 * (▲ buffs must be positive) and left to the counterfactuals otherwise.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * DRIVER ADAPTATIONS (2026-08-05 — fixture plumbing + observability ONLY; every asserted INTENT
 * of the blind spec is preserved; raw file kept verbatim at blind/eunhwa.test.ts):
 *
 *  (A1) FIXTURE — the raw spec's controlComp('eunhwa', true) seats crown (Burst II, cd 20, LEFT
 *       of eunhwa): the engine's first-ready pick breaks equal-CD ties leftmost and the ~20s chain
 *       interval leaves crown always-ready, so crown monopolizes stage 2 and eunhwa NEVER casts
 *       (probe: liter 9 / crown 9 / ada 5 / eunhwa 0 casts over 180s) — the burst group would fail
 *       as a FIXTURE gap, not as a spec violation. Adapted to the B2-free comp the blind gap note
 *       itself prescribes: liter (B1) / eunhwa (B2) / ada (B3), forced-neutral boss, focus eunhwa
 *       (SR charge weapon ⇒ ×2.5 gauge ⇒ she casts every chain). eunhwa is SSR rarity (SR is her
 *       weapon CLASS), so the plain scope-lock ceiling applies — no unitLimits.
 *  (A2) IMPORT PATH — '../lib/harness.js' does not exist from scripts/kit-autonomy/blind/;
 *       the harness lives at scripts/tests/lib/harness.js. Plumbing only.
 *  (A3) S2 + BURST DEF▼ GROUPS — the raw spec asserts boss-held `defPct` buffApply events for the
 *       two DEF▼ lines. ENGINE FACT (verified in sim.ts, not assumed): the enemy-buff dispatch
 *       admits ONLY damageTakenPct/distributedDamagePct into enemyBuffs; every other enemy debuff
 *       (ATK▼, DEF▼) hits `break` with NO applyBuff and NO buffApply event (sim.ts "other enemy
 *       debuffs (ATK▼, DEF▼) don't affect our damage with DEF=0"), and the boss's DEF contribution
 *       is the flat constant cfg.bossDef=140 that no debuff scales. So an enemy-targeted defPct
 *       block is unenactable AND unobservable — no honest encoding can emit the events the raw
 *       assertions demand. The S2b reviewer (claude-fable-5) anticipated exactly this: "if it does
 *       not consume them, both DEF lines are honestly GAP (engine limitation), not silently-dropped,
 *       and belong in unmodeled/note". The driver override (exia precedent) records both lines
 *       VERBATIM in `unmodeled`. The adapted assertions pin THAT honest treatment instead: zero
 *       boss-held buffApply events anywhere in the fight (nothing laundered into damageTakenPct)
 *       and the verbatim unmodeled record — with the same discrimination the raw spec intended:
 *       a damageTakenPct laundering (the nearest wrong model) emits boss debuffs and goes RED here.
 *       The cadence/expiry assertions of the raw S2 group (last-bullet cadence, 5s-not-rounds,
 *       shared 15s cast window) had NO observable referent under any honest encoding and are
 *       absorbed into the unmodeled-record pin; their intent (these lines are skipped deliberately
 *       with full provenance, not silently dropped) is asserted directly.
 *  (A4) shotCount() scoped to eunhwa's own shots (the raw helper counted every unit's shots; the
 *       assertion's intent — her charge speed buys HER shots — is preserved and made stricter).
 *  (A5) EVENT SHAPE — the buffApply event types durationShots as `number | null` (src/types.ts);
 *       the raw spec's `toBeUndefined()` on wall-clock buffs is `toBeNull()` here. Same meaning.
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 */

import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

const SLUG = 'eunhwa';

type Slot = 'skill1' | 'skill2' | 'burst';
type Opts = ReturnType<typeof controlComp>;

interface BuffApplyEv {
  kind: 'buffApply';
  stat: string;
  value: number;
  casterIdx: number | null;
  targetIdx: number | null;
  targetSlug?: string;
  expiresFrame?: number;
  durationShots?: number;
}

interface LooseEffect {
  kind: string;
  stat?: string;
  atkPct?: number;
}

interface LooseBlock {
  trigger: { kind: string };
  target: { kind: string };
  effects: LooseEffect[];
}

/** Accepts BOTH documented override shapes: slot -> Block[] and slot -> { blocks: Block[] }. */
function blocksOf(ov: unknown, slot: Slot): LooseBlock[] {
  const raw = (ov as Record<string, unknown>)[slot];
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as LooseBlock[];
  const nested = (raw as { blocks?: unknown }).blocks;
  return Array.isArray(nested) ? (nested as LooseBlock[]) : [];
}

// DRIVER ADAPTATION (A1): the B2-free comp — liter (B1) / eunhwa (B2) / ada (B3), boss forced
// neutral, camera focus eunhwa so her SR fills gauge and she casts every chain.
function adaptedComp(): Opts {
  return {
    slugs: ['liter', SLUG, 'ada'],
    bossElement: null,
    focusSlug: SLUG,
  } as unknown as Opts;
}

function run(opts: Opts): { res: ReturnType<typeof runComp>; events: SimEvent[] } {
  const events: SimEvent[] = [];
  const o = opts as Opts & { cfg?: Record<string, unknown> };
  const res = runComp({
    ...o,
    cfg: { ...(o.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev) },
  } as Opts);
  return { res, events };
}

function compWith(patched: unknown): Opts {
  const c = adaptedComp() as Opts & {
    overrides?: Record<string, unknown>;
  };
  return { ...c, overrides: { ...(c.overrides ?? {}), [SLUG]: patched } } as Opts;
}

function dropEffects(slot: Slot, pred: (e: LooseEffect) => boolean): unknown {
  return withPatchedOverride(SLUG, (ov) => {
    for (const b of blocksOf(ov, slot)) b.effects = b.effects.filter((e) => !pred(e));
  });
}

function scaleBurstHit(factor: number): unknown {
  return withPatchedOverride(SLUG, (ov) => {
    for (const b of blocksOf(ov, 'burst'))
      for (const e of b.effects)
        if (e.kind === 'flatDamage' && typeof e.atkPct === 'number') e.atkPct *= factor;
  });
}

const buffApplies = (events: SimEvent[]): BuffApplyEv[] =>
  events.filter((e) => e.kind === 'buffApply') as unknown as BuffApplyEv[];

const byStat = (events: SimEvent[], stat: string, absValue?: number): BuffApplyEv[] =>
  buffApplies(events).filter(
    (e) =>
      e.stat === stat &&
      (absValue === undefined || Math.abs(Math.abs(e.value) - absValue) < 1e-6),
  );

// DRIVER ADAPTATION (A4): scoped to eunhwa's own shots.
const shotCount = (events: SimEvent[]): number =>
  events.filter(
    (e) => e.kind === 'shot' && (e as { slug?: string }).slug === SLUG,
  ).length;

const uniq = (xs: number[]): number[] => [...new Set(xs)].sort((a, b) => a - b);
const frames = (evs: BuffApplyEv[]): number[] => uniq(evs.map((e) => e.expiresFrame ?? -1));
const dmg = (m: Record<string, number>, slug: string): number => m[slug] ?? 0;

// ---- hoisted runs (each is a full 180s sim) --------------------------------
const base = run(adaptedComp());
const baseTotals = totals(base.res);
const comp = Object.keys(baseTotals);
const allies = comp.filter((s) => s !== SLUG);
const allySum = (m: Record<string, number>): number =>
  allies.reduce((a, s) => a + dmg(m, s), 0);

const noChargeDmg = run(
  compWith(dropEffects('skill1', (e) => e.stat === 'chargeDamagePct')),
);
const noChargeSpeed = run(
  compWith(dropEffects('skill1', (e) => e.stat === 'chargeSpeedPct')),
);
// nearest-wrong trigger identity: per trigger pull instead of per magazine.
const perShotS1 = run(
  compWith(
    withPatchedOverride(SLUG, (ov) => {
      for (const b of blocksOf(ov, 'skill1')) b.trigger = { kind: 'shotFired' };
    }),
  ),
);
// half / double keep the burst hit's IMPACT COUNT identical, so burst-gauge and therefore the
// whole rotation are byte-identical across all three runs — the deltas isolate magnitude alone.
const halfBurstHit = run(compWith(scaleBurstHit(0.5)));
const dblBurstHit = run(compWith(scaleBurstHit(2)));
const noBurstCrit = run(compWith(dropEffects('burst', (e) => e.stat === 'critRatePct')));
// DRIVER ADAPTATION (A3): the laundering counterfactual for the two DEF▼ lines — the nearest
// wrong model is re-encoding them as boss damageTakenPct (a different mechanic the kit never
// grants). The shipped override must emit ZERO boss debuffs; this run proves the pin has teeth.
const s2Laundered = run(
  compWith(
    withPatchedOverride(SLUG, (ov) => {
      ov.skill2 = [
        {
          slot: 'skill2',
          trigger: { kind: 'lastBullet' },
          target: { kind: 'enemy' },
          effects: [
            { kind: 'buff', stat: 'damageTakenPct', value: 29, durationSec: 5 },
          ],
        },
      ];
    }),
  ),
);

const s1ChargeDmg = byStat(base.events, 'chargeDamagePct', 37.28);
const s1ChargeSpd = byStat(base.events, 'chargeSpeedPct', 15.53);
const bCrit = byStat(base.events, 'critRatePct', 4.65);

describe('eunhwa S1 — last-bullet self charge buffs', () => {
  it('grants Charge Damage 37.28% to SELF for 2 ROUNDS, once per magazine', () => {
    // Non-vacuity: 6 ammo over a 180s fight empties the magazine many times.
    expect(s1ChargeDmg.length).toBeGreaterThanOrEqual(6);
    for (const e of s1ChargeDmg) {
      expect(e.value).toBeGreaterThan(0); // an upward buff, never encoded negative
      expect(e.targetSlug).toBe(SLUG); // "Affects self"
      expect(e.targetIdx).not.toBeNull(); // an ally-held buff, not a boss-held one
      // RED under the nearest-wrong duration model (durationSec: 2 instead of 2 rounds),
      // which leaves durationShots undefined and expires the buff mid-reload.
      expect(e.durationShots).toBe(2);
    }
  });

  it('grants Charge Speed 15.53% to SELF for 2 ROUNDS', () => {
    expect(s1ChargeSpd.length).toBeGreaterThanOrEqual(6);
    for (const e of s1ChargeSpd) {
      expect(e.value).toBeGreaterThan(0);
      expect(e.targetSlug).toBe(SLUG);
      expect(e.durationShots).toBe(2);
    }
  });

  it('fires on the LAST BULLET, not on every trigger pull', () => {
    // With 6 rounds per magazine a shotFired trigger fires ~6x as often; >3x is the safe margin.
    const perShot = byStat(perShotS1.events, 'chargeDamagePct', 37.28).length;
    expect(perShot).toBeGreaterThan(s1ChargeDmg.length * 3);
  });

  it('both S1 lines ride the SAME activation (one trigger, two effects)', () => {
    expect(s1ChargeSpd.length).toBe(s1ChargeDmg.length);
  });

  it('Charge Damage is a live damage lever and is inert for teammates', () => {
    const t = totals(noChargeDmg.res);
    expect(dmg(baseTotals, SLUG)).toBeGreaterThan(dmg(t, SLUG));
    // Burst gauge is per-shot, not per-damage, so removing a damage buff cannot move the
    // rotation: every teammate must be byte-identical.
    for (const s of allies) expect(dmg(t, s)).toBe(dmg(baseTotals, s));
  });

  it('Charge Speed buys shots (a weapon-state modifier IS damage)', () => {
    // Shot count is monotone in charge speed with no full-burst-window confound.
    expect(shotCount(base.events)).toBeGreaterThan(shotCount(noChargeSpeed.events));
    expect(dmg(baseTotals, SLUG)).toBeGreaterThanOrEqual(
      dmg(totals(noChargeSpeed.res), SLUG),
    );
  });
});

describe('eunhwa S2 — last-bullet DEF ▼29% line (ADAPTED A3: engine has no enemy-DEF channel)', () => {
  it('is UNMODELED — recorded VERBATIM, not silently dropped', () => {
    const ov = loadOverride(SLUG) as {
      unmodeled?: { skill2?: string[] };
    };
    expect(
      (ov.unmodeled?.skill2 ?? []).join('\n'),
      'the skipped line must be recorded verbatim in unmodeled.skill2'
    ).toContain('DEF ▼ 29% for 5 sec.');
  });

  it('enacts NOTHING on the boss — and a damageTakenPct laundering would (discrimination)', () => {
    // sim.ts drops enemy ATK▼/DEF▼ at dispatch (only damageTakenPct/distributedDamagePct reach
    // enemyBuffs), and cfg.bossDef is a flat constant no debuff scales — so the honest encoding
    // emits ZERO boss-held buffApply events. A laundering into damageTakenPct would emit them:
    // that is the nearest wrong model, and this pair of assertions is RED under it.
    expect(
      buffApplies(base.events).filter((e) => e.targetIdx === null),
      'no boss-held buff may exist in the shipped run'
    ).toEqual([]);
    expect(
      buffApplies(s2Laundered.events).filter(
        (e) => e.targetIdx === null && e.stat === 'damageTakenPct',
      ).length,
      'the laundered counterfactual DOES emit boss debuffs — the pin has teeth'
    ).toBeGreaterThan(0);
  });

  it('no ally ever receives a DEF buff or debuff from this kit', () => {
    for (const e of byStat(base.events, 'defPct')) expect(e.targetIdx).toBeNull();
  });

  it.skip('GAP — DEF down has no observable damage payload (both the S2 29%/5s and the burst 2.43%/15s lines): types.ts documents defPct as inert in v1, and sim.ts drops enemy DEF▼ at dispatch, so neither the encoding events nor any damage effect are observable at scope lock', () => {});
});

describe('eunhwa burst — 85.62% hit, boss DEF 2.43%/15s (ADAPTED A3), ally Crit Rate 4.65%/15s', () => {
  it('NON-VACUITY: eunhwa actually casts her Burst II in the adapted comp', () => {
    // In the B2-free adapted comp she is the only stage-2 unit, so every chain is hers; if this
    // fails the whole burst group is untested rather than passing, which is the point of leading
    // with it.
    expect(bCrit.length).toBeGreaterThan(0);
    expect(frames(bCrit).length).toBeGreaterThanOrEqual(2);
  });

  it('Critical Rate 4.65% goes to ALL allies INCLUDING herself, for a timed window', () => {
    const targets = new Set(bCrit.map((e) => e.targetSlug));
    // RED under the nearest-wrong target model (allies excludeSelf, or self-only).
    expect(targets.has(SLUG)).toBe(true);
    for (const s of comp) expect(targets.has(s)).toBe(true);
    expect(bCrit.length).toBe(targets.size * frames(bCrit).length);
    for (const e of bCrit) {
      expect(e.value).toBeGreaterThan(0);
      expect(e.durationShots).toBeNull(); // ADAPTED (A5): 15 sec is wall-clock, not rounds
    }
  });

  it('the burst DEF ▼2.43% line is UNMODELED — recorded VERBATIM, not laundered', () => {
    // ADAPTED (A3): the raw spec's "both 15-sec burst lines share one cast window" and
    // "boss-held once per cast" assertions demanded defPct events the engine cannot emit
    // (enemy DEF▼ is dropped at dispatch — sim.ts). The honest treatment is the verbatim
    // unmodeled record + zero boss events (already pinned in the S2 group for BOTH DEF lines:
    // any boss-held buffApply anywhere in the fight would fail that pin).
    const ov = loadOverride(SLUG) as {
      unmodeled?: { burst?: string[] };
    };
    expect(
      (ov.unmodeled?.burst ?? []).join('\n'),
      'the skipped line must be recorded verbatim in unmodeled.burst'
    ).toContain('DEF ▼ 2.43% for 15 sec.');
  });

  it('the ally crit buff lifts the WHOLE team, not just eunhwa', () => {
    const t = totals(noBurstCrit.res);
    expect(dmg(baseTotals, SLUG)).toBeGreaterThan(dmg(t, SLUG)); // self is in the target set
    expect(allySum(baseTotals)).toBeGreaterThan(allySum(t)); // and so is everyone else
  });

  it('the 85.62%-of-final-ATK hit is live and scales LINEARLY with its atkPct', () => {
    const half = dmg(totals(halfBurstHit.res), SLUG);
    const on = dmg(baseTotals, SLUG);
    const dbl = dmg(totals(dblBurstHit.res), SLUG);
    const dHalf = on - half; // = 0.5 x (one fight of burst-hit damage)
    const dDbl = dbl - on; // = 1.0 x the same
    expect(dHalf).toBeGreaterThan(0); // RED if no flatDamage effect exists at all
    expect(dDbl / dHalf).toBeGreaterThan(1.9);
    expect(dDbl / dHalf).toBeLessThan(2.1);
  });

  it('burst hit magnitude never leaks into ally totals', () => {
    const t = totals(dblBurstHit.res);
    for (const s of allies) expect(dmg(t, s)).toBe(dmg(baseTotals, s));
  });

  it.skip('GAP — "Affects 10 enemy unit(s) with the highest final ATK": the scope-lock fight has a single partless boss, so target multiplicity is unobservable and a 1-target vs 10-target encoding cannot be discriminated from totals', () => {});
});
