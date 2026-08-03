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
 * cocoa (SR/Fire/Supporter/Burst I) — kit spec test, written BLIND from kit prose.
 *
 * KIT (structural read; short quotes only):
 *   skill1 ■ "Affects all allies."          → "Restores 17.76% of Cover HP."
 *   skill1 ■ 2 random allies "with debuffs" → "Removes 1 debuff(s)."
 *   skill2 ■ "when attacking with Full Charge", self
 *                                           → "Damage Taken ▼ 4.37%", 15 stacks, 5 sec
 *   burst  ■ "Affects all allies."          → "Removes 1 debuff(s)."
 *   burst  ■ gated "at max stacks", all enemies → "ATK ▼ 13.59% for 10 sec"
 *
 * WHOLE-KIT VERDICT: every line is DEFENSIVE and damage-inert at scope lock.
 *  - Cover HP is the COVER pool, not the unit's HP, and no effect kind models it.
 *  - Debuff cleanse (×2) has no primitive at all.
 *  - "Damage Taken ▼" on SELF is mitigation. The schema's `damageTakenPct` is the
 *    BOSS-side debuff where positive = boss takes MORE — opposite sign AND opposite
 *    target. Encoding this self line there is the single largest over-credit
 *    available in this kit (4.37 × 15 stacks = 65.55 team-wide damage-up).
 *  - Enemy "ATK ▼" reduces BOSS offense; the v1 boss deals no damage, so inert.
 *
 * The faithful model therefore contributes ZERO damage. This file's job is to pin
 * that inertness AND to demonstrate the fixture can SEE the two nearest-wrong
 * models (non-vacuity — an inertness assertion against a blind fixture proves
 * nothing unless the fixture is shown to be sensitive).
 *
 * FIXTURE: controlComp('cocoa', true) → liter B1 / crown B2 / cocoa / helm B3.
 *  - helm MUST stay: cocoa is Burst I, and a team with no Burst III makes ZERO
 *    Full Bursts, which would make every burst-slot assertion vacuous.
 *  - crown's on-recovery consumer is precisely what makes the mis-encoded-heal
 *    counterfactual bite; without it that test would be blind to the error.
 *
 * ⚑ FLAG (not asserted): stack reachability. chargeFrames 60 (1.0s) + 22f release
 *   latency ⇒ ~1 full charge per ~1.4s; ammo 6 then reloadFrames 141 (2.35s). In
 *   any 5s Tomato Sauce window that accrues ~3–4 stacks against a cap of 15, so
 *   the burst's "at max stacks" gate looks structurally UNREACHABLE at scope lock.
 *   Not asserted here because the `shot` event's frame field is not specified in
 *   the harness contract I was given — flagging rather than guessing. Inert either
 *   way, so nothing damage-relevant rides on it.
 */

type AnyOv = Record<string, any>;

/**
 * The packet describes the OverrideFile two ways — slot arrays (`skill1: Block[]`)
 * and slot objects carrying their own `blocks` (`ov.skill1!.blocks`). These helpers
 * handle both so a shape mismatch cannot silently no-op a counterfactual (a no-op
 * patch would make the nearest-wrong runs falsely "pass" as identical).
 */
function getSlotBlocks(ov: AnyOv, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  const s = ov[slot];
  if (!s) {
    return [];
  }
  return Array.isArray(s) ? s : (s.blocks ?? []);
}

function setSlotBlocks(
  ov: AnyOv,
  slot: 'skill1' | 'skill2' | 'burst',
  blocks: any[]
): void {
  const s = ov[slot];
  if (!s || Array.isArray(s)) {
    ov[slot] = blocks;
    return;
  }
  s.blocks = blocks;
}

function run(opts: any) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...(opts.cfg ?? {}), onEvent: (ev: SimEvent) => events.push(ev) },
  });
  return { res, events };
}

const sum = (t: Record<string, number>) =>
  Object.values(t).reduce((a, b) => a + b, 0);

const evs = (events: SimEvent[], kind: string) =>
  events.filter((e) => (e as any).kind === kind);

/** Stats that would represent an OFFENSIVE contribution from cocoa. */
const OFFENSIVE_STATS = new Set([
  'atkPct',
  'casterAtkPct',
  'highestAllyAtkPct',
  'atkOfMaxHpPct',
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
]);

const buffKey = (e: any) => `${e.stat}:${e.value}`;

/** Multiset difference: keys present in `a` more often than in `b`. */
function extraKeys(a: SimEvent[], b: SimEvent[]): string[] {
  const count = (list: SimEvent[]) => {
    const m = new Map<string, number>();
    for (const e of evs(list, 'buffApply')) {
      m.set(buffKey(e), (m.get(buffKey(e)) ?? 0) + 1);
    }
    return m;
  };
  const ca = count(a);
  const cb = count(b);
  const out: string[] = [];
  for (const [k, n] of ca) {
    if (n > (cb.get(k) ?? 0)) {
      out.push(k);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Hoisted runs (4 full 180s sims)
// ---------------------------------------------------------------------------

const BASE_OPTS = controlComp('cocoa', true);
const base = run(BASE_OPTS);

/** Cocoa with all three slots emptied — the "no kit at all" control. */
const strippedOv = withPatchedOverride('cocoa', (ov: AnyOv) => {
  setSlotBlocks(ov, 'skill1', []);
  setSlotBlocks(ov, 'skill2', []);
  setSlotBlocks(ov, 'burst', []);
});
const stripped = run({
  ...BASE_OPTS,
  overrides: { ...(BASE_OPTS as any).overrides, cocoa: strippedOv },
});

/** NEAREST-WRONG A: cover-HP restore mis-encoded as a real `heal` to all allies. */
const healWrongOv = withPatchedOverride('cocoa', (ov: AnyOv) => {
  setSlotBlocks(ov, 'skill1', [
    ...getSlotBlocks(ov, 'skill1'),
    {
      slot: 'skill1',
      trigger: { kind: 'interval', sec: 20 },
      target: { kind: 'allies' },
      effects: [{ kind: 'heal', ticks: 1 }],
    },
  ]);
});
const healWrong = run({
  ...BASE_OPTS,
  overrides: { ...(BASE_OPTS as any).overrides, cocoa: healWrongOv },
});

/** NEAREST-WRONG B: self "Damage Taken ▼" mis-encoded as the boss-side debuff. */
const bossDebuffWrongOv = withPatchedOverride('cocoa', (ov: AnyOv) => {
  setSlotBlocks(ov, 'skill2', [
    ...getSlotBlocks(ov, 'skill2'),
    {
      slot: 'skill2',
      trigger: { kind: 'passive' },
      target: { kind: 'enemy' },
      effects: [{ kind: 'buff', stat: 'damageTakenPct', value: 4.37 * 15 }],
    },
  ]);
});
const bossDebuffWrong = run({
  ...BASE_OPTS,
  overrides: { ...(BASE_OPTS as any).overrides, cocoa: bossDebuffWrongOv },
});

// ---------------------------------------------------------------------------

describe('cocoa — fixture non-vacuity', () => {
  it('cocoa is in the comp and actually fires', () => {
    const cocoa = unitOf(base.res, 'cocoa');
    expect(cocoa.totalDamage).toBeGreaterThan(0);
    expect(evs(base.events, 'shot').length).toBeGreaterThan(0);
  });

  it('the team reaches Full Burst (burst-slot lines get a chance to fire)', () => {
    // cocoa is Burst I; helm supplies the B3 that completes the chain. If this
    // were 0, every burst-slot assertion below would be silently vacuous.
    expect(evs(base.events, 'fullBurstStart').length).toBeGreaterThan(0);
  });

  it('the fixture is sensitive to an offensive contribution from cocoa', () => {
    // Proves the inertness assertions below are not passing by blindness: an
    // injected boss debuff on cocoa's slot DOES move the board in this fixture.
    expect(sum(totals(bossDebuffWrong.res))).toBeGreaterThan(
      sum(totals(base.res))
    );
  });
});

describe('cocoa — whole-kit damage inertness', () => {
  it("emptying all three slots changes NO unit's damage", () => {
    // Every kit line is defensive, so the faithful override must be damage-inert.
    // RED if any slot carries an offensive effect (the over-credit failure mode).
    expect(totals(stripped.res)).toEqual(totals(base.res));
  });

  it('cocoa emits no offensive buff that the stripped control lacks', () => {
    // Stronger than totals equality: catches an offensive buff that happens to be
    // numerically inert today (e.g. a stat with no live consumer) but would start
    // moving damage the moment a consumer lands.
    const introduced = extraKeys(base.events, stripped.events);
    const offensive = introduced.filter((k) =>
      OFFENSIVE_STATS.has(k.split(':')[0])
    );
    expect(offensive).toEqual([]);
  });
});

describe('cocoa skill1 — "Restores 17.76% of Cover HP" (all allies)', () => {
  it('is NOT modeled as a `heal` (cover pool ≠ unit heal)', () => {
    // Cover HP is the cover object's pool. A `heal` effect emits recovery events
    // that fire teammates' `recovery` triggers (crown sits in this fixture), so
    // the mis-encoding pays out real damage the kit line never grants.
    // GREEN under the faithful reading (cover restore unmodeled);
    // RED under the nearest-wrong (`heal` to all allies).
    expect(sum(totals(healWrong.res))).not.toEqual(sum(totals(base.res)));
    expect(totals(base.res)).toEqual(totals(stripped.res));
  });

  it('emits no recovery-bearing effect from cocoa', () => {
    // Direct structural check: the faithful skill1 produces no heal path at all.
    const introduced = extraKeys(base.events, stripped.events);
    expect(introduced).toEqual(expect.not.arrayContaining(['heal:1']));
  });
});

describe('cocoa skill2 — "Damage Taken ▼ 4.37%" (self, full-charge, 15 stacks/5s)', () => {
  it('is NOT encoded as the boss-side damageTakenPct debuff', () => {
    // Sign AND target both invert: the schema's damageTakenPct is a BOSS debuff
    // where positive = boss takes MORE damage. The kit line is self-mitigation.
    // The mis-encoding would hand the whole team up to +65.55 damage-up.
    // GREEN faithful; RED under the boss-debuff misreading.
    const bossDebuffs = evs(base.events, 'buffApply').filter(
      (e: any) =>
        e.stat === 'damageTakenPct' &&
        e.casterIdx === null &&
        e.targetIdx === null
    );
    // No boss-held damage-taken debuff may originate from cocoa's kit: the
    // baseline must carry none that the stripped control does not.
    const strippedBossDebuffs = evs(stripped.events, 'buffApply').filter(
      (e: any) =>
        e.stat === 'damageTakenPct' &&
        e.casterIdx === null &&
        e.targetIdx === null
    );
    expect(bossDebuffs.length).toEqual(strippedBossDebuffs.length);
    expect(sum(totals(base.res))).toBeLessThan(
      sum(totals(bossDebuffWrong.res))
    );
  });

  it('grants no offensive stat on full charge', () => {
    // The trigger identity (full-charge, self) is read correctly only if it
    // carries a DEFENSIVE payload. Any atk/crit/damage stat here is invented.
    const introduced = extraKeys(base.events, stripped.events);
    expect(
      introduced.filter((k) => OFFENSIVE_STATS.has(k.split(':')[0]))
    ).toEqual([]);
  });
});

describe('cocoa burst — "Removes 1 debuff(s)" + gated enemy "ATK ▼ 13.59%"', () => {
  it('the burst slot moves no damage', () => {
    const burstOnlyStripped = withPatchedOverride('cocoa', (ov: AnyOv) => {
      setSlotBlocks(ov, 'burst', []);
    });
    const r = run({
      ...BASE_OPTS,
      overrides: { ...(BASE_OPTS as any).overrides, cocoa: burstOnlyStripped },
    });
    // Enemy ATK ▼ reduces BOSS offense; the v1 boss deals no damage, and debuff
    // cleanse has no primitive. Both lines must be damage-inert.
    expect(totals(r.res)).toEqual(totals(base.res));
  });

  it.skip('enemy ATK ▼ 13.59% for 10s — GAP: no boss-offense model', () => {
    // The v1 boss deals no damage to allies, so an enemy ATK debuff has no
    // observable payload. Nothing to assert beyond the inertness above.
  });

  it.skip('"Removes 1 debuff(s)" (burst + skill1) — GAP: no debuff-cleanse primitive', () => {
    // No effect kind models ally debuff removal, and nothing in the scope-lock
    // fight applies an ally debuff for it to remove. Unobservable by construction.
  });

  it.skip('"at max stacks" gate reachability — ⚑ measurement/arithmetic gated', () => {
    // chargeFrames 60 + 22f release latency ⇒ ~1 charge / ~1.4s; 15 stacks inside
    // a rolling 5s window is not reachable (~3–4 accrue). Would assert the max
    // concurrent stack count stays < 15, but the `shot` event's frame field name
    // is not in the harness contract given to this role — flagged, not guessed.
    // Inert either way (the gated payload is an enemy ATK debuff).
  });
});
