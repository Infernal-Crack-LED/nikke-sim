/**
 * maiden — blind per-unit kit spec test (S5 cross-family post-op).
 * Written from the kit prose ALONE; no sight of the driver's override/tests/reasoning.
 *
 * KIT (verbatim structure, quoted short):
 *   skill1  ■ "Activates when attacked 20 time(s)." / self / "Revenge: ATK ▲ 26.66% for 20 sec."
 *   skill2  ■ all enemies / "Taunt for 10 sec."
 *           ■ self       / "Critical Damage ▲ 152.84% for 10 sec."
 *   burst   ■ all enemies / "Deals 457.87% of final ATK as Burst Skill damage."
 *           ■ "…same target(s) when in Revenge status." / "457.87% … as additional damage."
 *   Base: SG/Electric/Attacker/Burst III, cd 40s, ammo 9, hitsPerShot 10.
 *
 * DISPOSITIONS
 *  - skill1 Revenge: GAP. "when attacked N times" is an INCOMING-damage counter; TriggerDef has no
 *    such kind, and at scope lock the boss deals no damage, so the status can never open. The
 *    faithful model therefore emits NO atkPct 26.66 buff at all — asserted positively below.
 *  - skill2 Taunt: UNMODELED (aggro/defensive; no primitive, and nothing takes damage). it.skip.
 *  - skill2 Critical Damage: FAITHFUL. Self-scoped, TIME-bounded 10s. Its trigger cadence is NOT in
 *    the kit text (no activation clause) — an ALWAYS-⛑ field — so this file asserts nothing about
 *    the period, only scope / stat identity / magnitude / time-boundedness / damage relevance.
 *  - burst line 1: FAITHFUL, burst-cast instant damage → FB-exempt (a cast lands before the FB
 *    window opens), so fbMajorApplied must be false.
 *  - burst line 2 (Revenge rider): GAP-by-cascade. Gated on an unreachable status → must be SILENT.
 *
 * FIXTURE: controlComp('maiden', false) — liter B1 + crown B2 + maiden B3. The fixed extra B3 slot
 * is dropped because it contributes its OWN burst-slot damage events and a crit-rate buff, both of
 * which confound the burst-line readings below. B1+B2 are still present, so the chain completes and
 * maiden actually casts (a lone B3 makes ZERO full bursts). Deterministic, no seed.
 *
 * ATTRIBUTION NOTE: `damage` events are counted only via BASE-vs-COUNTERFACTUAL deltas on
 * totals(res)['maiden'], which is unambiguously maiden's, so no event-level slug attribution is
 * needed for the magnitude claims. buffApply carries targetSlug, so buff claims attribute directly.
 *
 * SHAPE NOTE: the packet describes the OverrideFile slot value two ways (a bare Block[] vs a
 * CharacterSkills carrying .blocks). slotBlocks() resolves either, and every counterfactual mutates
 * the block/effect objects IN PLACE, so it is correct under both shapes.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

const SLUG = 'maiden';
const CRIT_DMG = 152.84;
const REVENGE_ATK = 26.66;

type AnyEv = SimEvent & Record<string, any>;

/** Resolve a slot to its Block[] under either documented OverrideFile shape. */
function slotBlocks(ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  const s = ov?.[slot];
  if (!s) {
    return [];
  }
  if (Array.isArray(s)) {
    return s;
  }
  return Array.isArray(s.blocks) ? s.blocks : [];
}

function slotEffects(ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  return slotBlocks(ov, slot).flatMap((b: any) =>
    Array.isArray(b?.effects) ? b.effects : []
  );
}

function run(overrides?: Record<string, unknown>) {
  const events: AnyEv[] = [];
  const push = (ev: AnyEv) => events.push(ev);
  const opts: any = controlComp(SLUG, false);
  // DRIVER ADAPTATION (materialization only — no semantic change): controlComp returns a
  // CompOptions with NO cfg, so the blind `if (opts.cfg)` guard never wired onEvent and every
  // event-based assertion ran on an empty log. Wire the capture through cfg unconditionally
  // (the harness threads o.cfg into scopeLockCfg).
  opts.cfg = { ...(opts.cfg ?? {}), onEvent: push };
  if (overrides) {
    opts.overrides = { ...(opts.overrides ?? {}), ...overrides };
  }
  const res = runComp(opts);
  const t = totals(res);
  const teammates: Record<string, number> = {};
  for (const k of Object.keys(t)) {
    if (k !== SLUG) {
      teammates[k] = t[k];
    }
  }
  return { res, events, total: t[SLUG], teammates };
}

// ---- counterfactual overrides (built once, mutate an in-memory clone) --------------------------

/** Nearest-wrong A: the 10s Critical Damage window modeled as permanent (no durationSec). */
const CRIT_PERMANENT = withPatchedOverride(SLUG, (ov: any) => {
  for (const e of slotEffects(ov, 'skill2')) {
    if (e?.kind === 'buff' && e.stat === 'critDamagePct') {
      delete e.durationSec;
    }
  }
});

/** Nearest-wrong B: the Critical Damage line absent entirely (non-vacuity probe). */
const CRIT_ZERO = withPatchedOverride(SLUG, (ov: any) => {
  for (const e of slotEffects(ov, 'skill2')) {
    if (e?.kind === 'buff' && e.stat === 'critDamagePct') {
      e.value = 0;
    }
  }
});

/** Probe D: every burst-slot flatDamage zeroed — isolates the burst lines' total contribution. */
const BURST_ZERO = withPatchedOverride(SLUG, (ov: any) => {
  for (const e of slotEffects(ov, 'burst')) {
    if (e?.kind === 'flatDamage') {
      e.atkPct = 0;
    }
  }
});

/**
 * Nearest-wrong C / probe: add ONE extra copy of the FIRST burst flatDamage — i.e. exactly what the
 * Revenge rider would look like if it fired unconditionally. Adds one hit per cast.
 */
const BURST_DUP = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of slotBlocks(ov, 'burst')) {
    const i = (b.effects ?? []).findIndex((e: any) => e?.kind === 'flatDamage');
    if (i >= 0) {
      b.effects.push(JSON.parse(JSON.stringify(b.effects[i])));
      return;
    }
  }
});

// ---- hoisted runs (5 full 180s sims) -----------------------------------------------------------

const base = run();
const critPerm = run({ [SLUG]: CRIT_PERMANENT });
const critZero = run({ [SLUG]: CRIT_ZERO });
const burstZero = run({ [SLUG]: BURST_ZERO });
const burstDup = run({ [SLUG]: BURST_DUP });

const buffApplies = base.events.filter((e) => e.kind === 'buffApply');
const critDmgApplies = buffApplies.filter(
  (e) => e.stat === 'critDamagePct' && Math.abs(e.value - CRIT_DMG) < 1e-6
);

describe('maiden — fixture sanity (non-vacuity)', () => {
  it('maiden is in the comp and deals damage', () => {
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(base.total).toBeGreaterThan(0);
  });

  it('the chain actually completes: maiden bursts and full bursts occur', () => {
    expect(base.events.some((e) => e.kind === 'burstCast')).toBe(true);
    expect(base.events.some((e) => e.kind === 'fullBurstStart')).toBe(true);
  });
});

describe('maiden burst — "Deals 457.87% of final ATK as Burst Skill damage."', () => {
  it('the burst damage line contributes real damage', () => {
    // Zeroing every burst-slot flatDamage must strictly lower maiden's total.
    expect(base.total).toBeGreaterThan(burstZero.total);
  });

  it('is FB-exempt: a burst cast lands before the Full Burst window opens', () => {
    // Nearest-wrong: keying the nuke to fullBurstEnter, which would stamp the +50% FB major.
    const burstHits = base.events.filter(
      (e) => e.kind === 'damage' && e.srcSlot === 'burst'
    );
    expect(burstHits.length).toBeGreaterThan(0);
    for (const h of burstHits) {
      expect(h.fbMajorApplied).toBe(false);
      expect(h.inFullBurst).toBe(false);
    }
  });

  it('does not perturb teammates (it is enemy-facing damage, not an ally buff)', () => {
    expect(burstZero.teammates).toEqual(base.teammates);
  });
});

describe('maiden burst rider — "…when in Revenge status" must be SILENT', () => {
  /**
   * THE LOAD-BEARING ASSERTION. Attribution-free algebraic identity:
   *   let K = maiden burst casts, V = damage of ONE 457.87% hit.
   *   BURST_ZERO kills every burst flatDamage      -> base - burstZero = (hits/cast) * K * V
   *   BURST_DUP adds exactly ONE more hit per cast -> burstDup - base  = 1 * K * V
   * Faithful (rider gated shut, 1 hit/cast): both deltas equal K*V  -> identity HOLDS.
   * Nearest-wrong (rider fires unconditionally, 2 hits/cast): 2*K*V vs 1*K*V -> identity FAILS.
   * Revenge cannot open at scope lock: its trigger is an incoming-damage counter and the boss
   * deals no damage, so any second hit is an over-credit.
   */
  it('the burst fires its damage line exactly ONCE per cast, not twice', () => {
    const contributed = base.total - burstZero.total;
    const oneExtraPerCast = burstDup.total - base.total;
    expect(contributed).toBeGreaterThan(0);
    expect(oneExtraPerCast).toBeGreaterThan(0);
    expect(contributed).toBeCloseTo(oneExtraPerCast, 4);
  });

  it('emits no Revenge ATK buff — "when attacked 20 time(s)" can never fire here', () => {
    // Nearest-wrong: proxying "attacked N times" with hitCount/shotFired/interval, which WOULD fire.
    const revenge = buffApplies.filter(
      (e) => e.stat === 'atkPct' && Math.abs(e.value - REVENGE_ATK) < 1e-6
    );
    expect(revenge).toHaveLength(0);
  });

  it.skip('ACTIVE branch of the Revenge gate is unreachable — GAP, no primitive', () => {
    // TriggerDef has no incoming-attack/damage-taken kind, and the scope-lock boss deals no damage,
    // so neither the skill1 ATK buff nor the burst rider can be exercised in the ACTIVE case.
    // Modeling it needs a new trigger primitive plus a boss-damage model; both are out of scope.
  });
});

describe('maiden skill2 — "Critical Damage ▲ 152.84% for 10 sec." (self)', () => {
  it('applies critDamagePct at the kit magnitude', () => {
    // Nearest-wrong: encoding it as critRatePct (a different stat) or as a scoped/normal-only stat.
    expect(critDmgApplies.length).toBeGreaterThan(0);
    const asCritRate = buffApplies.filter(
      (e) => e.stat === 'critRatePct' && Math.abs(e.value - CRIT_DMG) < 1e-6
    );
    expect(asCritRate).toHaveLength(0);
  });

  it('is SELF-scoped — never lands on an ally', () => {
    // Nearest-wrong: target 'allies', which would hand 152.84% crit damage to the whole team.
    for (const e of critDmgApplies) {
      expect(e.targetSlug).toBe(SLUG);
    }
    expect(critZero.teammates).toEqual(base.teammates);
    expect(critPerm.teammates).toEqual(base.teammates);
  });

  it('is TIME-BOUNDED, not permanent', () => {
    // Structural: every application carries a finite expiry (no buffRemove fires on natural lapse,
    // so expiresFrame is the readable signal).
    for (const e of critDmgApplies) {
      expect(Number.isFinite(e.expiresFrame)).toBe(true);
    }
    // Behavioural: stripping durationSec must strictly RAISE maiden's damage. If base already
    // equals the permanent model, the 10s window is not binding -> the line is over-credited.
    expect(critPerm.total).toBeGreaterThan(base.total);
  });

  it('actually moves damage (non-vacuity: the fixture crits)', () => {
    expect(base.total).toBeGreaterThan(critZero.total);
  });
});

describe('maiden — inertness / no invented mechanics', () => {
  it('invents no SG weapon-state modifiers (the kit has no such line)', () => {
    // maiden is SG/hitsPerShot 10 with a 9-round magazine; nothing in her kit touches pellets, the
    // normal-attack multiplier, or ammo capacity. A buff here would be fit, not faithfulness.
    // DRIVER ADAPTATION (materialization only — no semantic change): the blind probe read ANY
    // holder-maiden buff in these stats, which caught liter's legitimate kit line
    // (maxAmmoPct 45.17, casterIdx 0). The assertion's intent is that MAIDEN invents no
    // weapon-state modifier from her own kit, so restrict it to maiden-cast buffs
    // (slot 2 in liter/crown/maiden).
    const invented = buffApplies.filter(
      (e) =>
        e.targetSlug === SLUG &&
        e.casterIdx === 2 &&
        [
          'pelletCountFlat',
          'normalAttackPct',
          'maxAmmoFlat',
          'maxAmmoPct',
        ].includes(e.stat)
    );
    expect(invented).toHaveLength(0);
  });

  it.skip('skill2 Taunt (10s, all enemies) — UNMODELED, no primitive', () => {
    // Aggro redirection. No effect kind expresses it, and with an immortal boss that deals no
    // damage it has no damage-side payload at scope lock. Belongs in the override `unmodeled` field.
  });
});
