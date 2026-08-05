// PER-UNIT KIT SPEC — `rapunzel-pure-grace` (Rapunzel: Pure Grace, the SR/Defender/Iron/Burst-I
// OVERSPEC variant of the BASE Rapunzel — cd 20s, ammo 6, chargeFrames 60; NOT rapunzel/rapu).
// Kit-autonomy gauntlet 2026-08-03.
//
// Pure Grace is a SHIELD-ARCHETYPE tank/buffer: her whole kit hangs off a self-supplied shared
// shield. Damage-relevant footprint = exactly TWO Attack Damage lines (S1-c 10.41% permanent
// shield-gated team buff, burst 15.24% 10s team buff); everything else (shields, self-heal,
// self Max HP) is defensive/event-only in a DPS sim. The faithfulness core is therefore:
//   (a) the shield LINES are real events, not silently dropped — proven through a naga-type
//       'shielded' consumer (shield events fire her S1 coreDamagePct block), and
//   (b) the shield GATE on S1-c is real — the 10.41 buff must vanish when the shield blocks are
//       stripped (requiresShielded), i.e. the gate is self-supplied by her own kit, not cosmetic.
//
// Kit (blablalink prose, data/characters.json → characters['rapunzel-pure-grace'].skills):
//   S1 ■ start of battle → shared Shield = 20.59% of caster final Max HP, protects all allies, continuous [L1]
//      ■ on Burst Skill use → the same shared Shield (20.59%, continuous)                                   [L2]
//      ■ Full Charge maintained >1s while a Shield is set in front of her → all allies:                     [L3]
//        Attack Damage ▲10.41% continuously
//   S2 ■ attacking with Full Charge → self: recover 2% of caster final Max HP                              [L4]
//      ■ Full Charge maintained >1s while Shield set → self: Current HP ▼2%/s + restore Shield HP          [L5]
//        3.16% of caster final Max HP every 1s                     (UNMODELED — no HP pool / shield-HP pool)
//   BU ■ self: Max HP ▲10.13% for 10s                                                                      [L6]
//      ■ all allies: Attack Damage ▲15.24% for 10s                                                          [L7]
//
// Encoding (driver override src/skills/overrides/rapunzel-pure-grace.json):
//   L1  skill1 passive → allies → shield maxHpPct:20.59 (no durationSec = permanent; label precedent)
//   L2  burstCast → allies → shield maxHpPct:20.59
//   L3  skill1 passive + requiresShielded → allies → attackDamagePct 10.41 (no durationSec = permanent).
//       ⚑ CALIBRATED (S2b reconcile): the 'Full Charge maintained >1s' half has NO engine primitive —
//       her SR reaches full charge at chargeFrames 60 = exactly 1s and the sim fires at full charge,
//       so a literal read gives ~0% in-engine uptime while real play (hold-to-aim between shots,
//       shield self-supplied) is ~100%. Encoded always-on behind the shield gate = the UPTIME UPPER
//       BOUND, matching play. Estimate: ~100% real uptime (upper-bound encoding). Recipe: a
//       rapunzel-pure-grace focus recording, buff-icon uptime of the 10.41% Attack Damage vs the
//       shield icon. Tier: Tier-2 state gate. Shield half gated (requiresShielded, self-supplied);
//       label 'Delusion is permanent in the no-incoming-damage sim' precedent for the always-on half.
//   L4  shotFired → self → heal (event-only; SR = one full charge per pull, helm/liberalio precedent).
//       Self-targeted recovery events have NO consumer on her and no HP amount is modeled: damage-inert
//       — modeled for kit-completeness; pinned by the neutrality groups (no damage movement) and by the
//       crown-consumer target-scope pin (the heal reaches NO ally — an ally-widened mis-encoding would
//       fire crown's 'when recovery takes effect' block and move her 20.99 consumer frames).
//   L5  UNMODELED verbatim (no HP pool to drain, no shield-HP pool to restore; defensive, damage-inert).
//   L6  burstCast → self → targetMaxHpPct 10.13 durationSec:10 (label precedent) — inert: she has no
//       atkOfMaxHpPct conversion and v1 has no HP pool.
//   L7  burstCast → allies → attackDamagePct 15.24 durationSec:10.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates nothing):
//   SH  the two shield lines are EVENTS: naga's S1 'shielded'-triggered coreDamagePct 85.17 block fires
//       once at frame 0 (L1 battle-start shield) and then exactly on rapunzel-pure-grace's OWN burstCast
//       frames (L2 re-shield). A dropped shield line fires nothing; a fullBurstEnter-keyed L2 would also
//       re-fire on liter's B1 casts (the fixture carries TWO Burst I units), breaking the frame-set match.
//   G   the gate is real: stripping ONLY the shield blocks kills the 10.41 buff entirely (requiresShielded
//       fails at frame 0 with no shield window) while an ungated passive encoding would keep it. Her own
//       shield supplies her own gate — the test proves self-supply, not just presence.
//   B   burst lines are keyed to HER burstCast (two-B1 discrimination vs fullBurstEnter, liter is the
//       decoy), reach exactly 5 holders, last exactly 600 frames; L7 moves the carry's damage, L6 is inert.
//   N   everything outside L3/L7 is byte-identical to the bare weapon (solo burst-on; bare team burst-off)
//       — a shield/heal/maxHp mis-encoding that secretly touched damage would move a total there. Solo
//       full-kit damage > bare proves L3 is live on HERSELF too ('all allies' includes the caster).
//
// Fixture: rapunzel-pure-grace 0 / liter 1 (B1 decoy) / crown 2 (B2) / naga 3 (B2 shield CONSUMER) /
// ada 4 (B3 carry, focused), boss Fire — a real rotation so she casts bursts. Crown's OWN burst shield
// (fused into her 36.24 attackDamagePct block) is stripped effect-only (crownNoShield) so
// rapunzel-pure-grace is the SOLE shield source and every naga 'shielded' firing is attributable to her.
// Deterministic (no seed); event-log over totals.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  bareWeaponOverride,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const FPS = 60;
const SLUG = 'rapunzel-pure-grace';
/** Fixture slot order. */
const RPG = 0;
const CROWN = 2;
const NAGA = 3;
const ADA = 'ada';
const TEAM = [SLUG, 'liter', 'crown', 'naga', ADA] as const;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

const realOverride = loadOverride(SLUG);
if (!realOverride) {
  throw new Error(`${SLUG}: no override on disk — fixture is stale`);
}

// ---- fixture isolation ---------------------------------------------------------------------
/** Strip crown's burst SHIELD EFFECT only (it is fused into her 36.24 attackDamagePct block — keep
 *  the buff, drop the emission) so rapunzel-pure-grace is the sole shield source in the fixture. */
const crownNoShield = withPatchedOverride('crown', (ov) => {
  let stripped = 0;
  for (const b of ov.burst) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'shield');
    stripped += before - b.effects.length;
  }
  if (stripped === 0) {
    throw new Error('crown burst shield effect missing — fixture is stale');
  }
});

// ---- counterfactual / isolation patches on the unit under test ------------------------------
const hasShield = (b: any) => b.effects.some((e: any) => e.kind === 'shield');
const hasEffectKind = (b: any, kind: string) =>
  b.effects.some((e: any) => e.kind === kind);
const hasStatValue = (b: any, stat: string, value: number) =>
  b.effects.some((e: any) => e.stat === stat && e.value === value);

/** G/SH counterfactual: BOTH shield lines removed (L1 battle-start passive + L2 on-burstCast;
 *  both live in the skill1 slot — the kit lines are skill1 prose). */
const rpgNoShields = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter((b: any) => !hasShield(b));
  if (before - ov.skill1.length !== 2) {
    throw new Error(
      `${SLUG}: expected 2 shield blocks (battle-start + on-burst), found ${before - ov.skill1.length} — fixture is stale`
    );
  }
});
/** G isolation: only the 10.41 gated team buff removed (shields remain). */
const rpgNoL3 = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !hasStatValue(b, 'attackDamagePct', 10.41)
  );
  if (ov.skill1.length === before) {
    throw new Error(`${SLUG} S1 10.41 attackDamagePct block missing — stale`);
  }
});
/** L4 isolation: the per-full-charge self-heal removed (proves its TARGET SCOPE through crown's
 *  natural recovery consumer — see L4 group). */
const rpgNoL4 = withPatchedOverride(SLUG, (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !hasEffectKind(b, 'heal'));
  if (ov.skill2.length === before) {
    throw new Error(`${SLUG} S2 self-heal block missing — fixture is stale`);
  }
});
/** B isolation: burst Max HP line removed. */
const rpgNoL6 = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !hasStatValue(b, 'targetMaxHpPct', 10.13)
  );
  if (ov.burst.length === before) {
    throw new Error(`${SLUG} burst targetMaxHpPct block missing — stale`);
  }
});
/** B isolation: burst team Attack Damage line removed. */
const rpgNoL7 = withPatchedOverride(SLUG, (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !hasStatValue(b, 'attackDamagePct', 15.24)
  );
  if (ov.burst.length === before) {
    throw new Error(`${SLUG} burst 15.24 attackDamagePct block missing — stale`);
  }
});
/** N reference: BOTH damage lines (L3 + L7) removed — the defensive residue must be neutral. */
const rpgNoDamageBuffs = withPatchedOverride(SLUG, (ov) => {
  const s1 = ov.skill1.length;
  ov.skill1 = ov.skill1.filter(
    (b: any) => !hasStatValue(b, 'attackDamagePct', 10.41)
  );
  const bu = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !hasStatValue(b, 'attackDamagePct', 15.24)
  );
  if (ov.skill1.length === s1 || ov.burst.length === bu) {
    throw new Error(`${SLUG} damage-buff blocks missing — fixture is stale`);
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
function fixtureRun(rpgOverride: any) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: [...TEAM],
    bossElement: 'Fire',
    focusSlug: ADA,
    overrides: { crown: crownNoShield, [SLUG]: rpgOverride },
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res, totals: totals(res) };
}

const base = fixtureRun(realOverride);
const noShields = fixtureRun(rpgNoShields);
const noL3 = fixtureRun(rpgNoL3);
const noL4 = fixtureRun(rpgNoL4);
const noL6 = fixtureRun(rpgNoL6);
const noL7 = fixtureRun(rpgNoL7);

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const rpgShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === SLUG);
const castsOf = (evs: SimEvent[], slug: string) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === slug);

/** Distinct frames crown's recovery consumer fired (attackDamagePct 20.99, casterIdx = crown). */
const crownRecoveryFrames = (evs: SimEvent[]): number[] =>
  [
    ...new Set(
      buffs(evs)
        .filter(
          (b) =>
            b.casterIdx === CROWN &&
            b.stat === 'attackDamagePct' &&
            b.value === 20.99
        )
        .map((b) => b.frame)
    ),
  ].sort((a, b) => a - b);

/** Distinct frames naga's 'shielded' consumer fired (S1 coreDamagePct 85.17, casterIdx = naga). */
const nagaShieldFirings = (evs: SimEvent[]): number[] =>
  [
    ...new Set(
      buffs(evs)
        .filter(
          (b) =>
            b.casterIdx === NAGA &&
            b.stat === 'coreDamagePct' &&
            b.value === 85.17
        )
        .map((b) => b.frame)
    ),
  ].sort((a, b) => a - b);

const rpgBuffApplies = (evs: SimEvent[], stat: string, value: number) =>
  buffs(evs).filter(
    (b) => b.casterIdx === RPG && b.stat === stat && b.value === value
  );

// ===============================================================================================
// Fixture sanity
// ===============================================================================================
describe('fixture sanity', () => {
  it('rapunzel-pure-grace full-charges every pull and casts bursts', () => {
    const shots = rpgShots(base.events);
    const casts = castsOf(base.events, SLUG);
    expect(shots.length).toBeGreaterThan(50);
    expect(casts.length).toBeGreaterThanOrEqual(1);
    // SR = one full charge per trigger pull (helm/liberalio precedent): pin it so the
    // shotFired≈fullCharge read behind L4 is honest.
    expect(
      shots.filter((s) => s.charged).length,
      'an SR pull that is NOT a full charge would break the full-charge read'
    ).toBe(shots.length);
  });

  it('naga casts bursts too (second B2, keeps the rotation honest)', () => {
    expect(castsOf(base.events, 'naga').length).toBeGreaterThanOrEqual(1);
  });

  it('liter (the DECOY B1) casts at least once — the burstCast-vs-fullBurstEnter discriminations are live', () => {
    expect(
      castsOf(base.events, 'liter').length,
      'if liter never casts, the two-B1 keying tests below are vacuous'
    ).toBeGreaterThanOrEqual(1);
  });
});

// ===============================================================================================
// SH — the shield lines are real EVENTS (read through naga's 'shielded' consumer)
// ===============================================================================================
describe('SH — shared shields emit shield events (L1 battle-start, L2 on her burst)', () => {
  it('SH1 — L1: naga is shielded at battle start (frame 0 firing)', () => {
    const firings = nagaShieldFirings(base.events);
    expect(firings.length).toBeGreaterThan(0);
    expect(firings[0], 'the battle-start shared shield must land at frame 0').toBe(0);
  });

  it('SH2 — L2: every later firing sits exactly on one of HER burstCast frames', () => {
    const firings = nagaShieldFirings(base.events);
    const castFrames = new Set(castsOf(base.events, SLUG).map((c) => c.frame));
    const later = firings.filter((f) => f > 0);
    expect(later.length).toBeGreaterThan(0);
    for (const f of later) {
      expect(
        castFrames.has(f),
        `shield re-fire at frame ${f} has no ${SLUG} burstCast — a fullBurstEnter ` +
          'keying would leak liter\'s B1 casts, a dropped L2 would leave no re-fires'
      ).toBe(true);
    }
    // One re-shield per cast of HERS, no extras: the firing set is exactly {0} ∪ her cast frames.
    expect(new Set(firings)).toEqual(new Set([0, ...castFrames]));
  });

  it('SH3 — stripping both shield lines collapses the consumer to zero (sole source)', () => {
    expect(nagaShieldFirings(noShields.events).length).toBe(0);
  });

  it('SH4 — her permanent shield window keeps naga\'s requiresShielded burst branch live', () => {
    // Naga's burst carries TWO casterAtkPct branches: 16.18 unconditional + 31.02 requiresShielded
    // (both resolve to flat-ATK values at apply time, so read BRANCH COUNT, not the % literal).
    // With rapunzel-pure-grace's durationless (permanent) shield covering naga from frame 0, BOTH
    // branches must land on every naga cast — and stripping the shields must collapse to one.
    const nagaCasts = castsOf(base.events, 'naga');
    const branchValues = (evs: SimEvent[]) => {
      const perFrame = new Map<number, Set<number>>();
      for (const b of buffs(evs)) {
        if (b.casterIdx !== NAGA || b.stat !== 'casterAtkPct') {
          continue;
        }
        (
          perFrame.get(b.frame) ?? perFrame.set(b.frame, new Set()).get(b.frame)!
        ).add(Math.round(b.value));
      }
      return perFrame;
    };
    const withShields = branchValues(base.events);
    expect(withShields.size).toBe(nagaCasts.length);
    for (const c of nagaCasts) {
      expect(
        withShields.get(c.frame)?.size,
        `naga cast at ${c.frame} must land BOTH burst branches while the shield window holds`
      ).toBe(2);
    }
    const stripped = branchValues(noShields.events);
    for (const c of castsOf(noShields.events, 'naga')) {
      expect(
        stripped.get(c.frame)?.size,
        'no shield window → the requiresShielded 31.02 branch must vanish'
      ).toBe(1);
    }
  });
});

// ===============================================================================================
// G — the 10.41 team buff is real AND genuinely shield-gated (L3)
// ===============================================================================================
describe('G — S1-c Attack Damage ▲10.41% is permanent, team-wide and shield-gated', () => {
  it('G1 — applies at frame 0 to ALL allies, with no expiry', () => {
    const applies = rpgBuffApplies(base.events, 'attackDamagePct', 10.41);
    expect(applies.length).toBe(TEAM.length);
    for (const b of applies) {
      expect(b.frame).toBe(0);
      expect(b.expiresFrame, 'a "continuous" line must carry no wall-clock expiry').toBeNull();
    }
    expect(new Set(applies.map((b) => b.targetIdx)).size).toBe(TEAM.length);
  });

  it('G2 — removing ONLY the shield blocks kills the buff (the gate is real, self-supplied)', () => {
    expect(rpgBuffApplies(noShields.events, 'attackDamagePct', 10.41).length).toBe(0);
  });

  it('G3 — it moves damage: carry and self both lose damage without it', () => {
    expect(noL3.totals[ADA]).toBeLessThan(base.totals[ADA]);
    expect(noL3.totals[SLUG]).toBeLessThan(base.totals[SLUG]);
  });
});

// ===============================================================================================
// L4 — the per-full-charge self-heal: event-only, and SELF-targeted (crown-consumer pin)
// ===============================================================================================
describe('L4 — S2 self-heal is real, per-shot, and reaches NO ally', () => {
  it('crown\'s recovery consumer fires identically with and without L4 (the heal never reaches an ally)', () => {
    // Crown is the fixture's natural recovery consumer ("when recovery takes effect" → 20.99 team
    // Attack Damage). L4 targets SELF only, so it can never feed crown: an ally-widened mis-encoding
    // would add recovery firings to crown and move these frames. Her own kit carries no 'recovery'
    // trigger, so the self-recovery events are a downstream no-op — the neutrality groups (N) pin
    // that they move no damage.
    expect(crownRecoveryFrames(base.events)).toEqual(
      crownRecoveryFrames(noL4.events)
    );
    expect(crownRecoveryFrames(base.events).length).toBeGreaterThan(0);
  });
});

// ===============================================================================================
// B — burst lines: self Max HP ▲10.13% (L6, inert) + team Attack Damage ▲15.24% (L7, load-bearing)
// ===============================================================================================
describe('B — burst: L6 self Max HP (inert) and L7 team Attack Damage (load-bearing)', () => {
  const casts = castsOf(base.events, SLUG);

  it('B1 — L6: one maxHpFlat self-grant per cast, (10.13/100)×her maxHp, exactly 10s', () => {
    const l6 = buffs(base.events).filter(
      (b) => b.casterIdx === RPG && b.stat === 'maxHpFlat'
    );
    expect(l6.length).toBe(casts.length);
    const rpgMaxHp = base.res.units[RPG].maxHp;
    for (const b of l6) {
      expect(b.targetIdx, 'L6 affects self only').toBe(RPG);
      expect(b.value).toBeCloseTo((10.13 / 100) * rpgMaxHp, 6);
      expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    }
    const castFrames = new Set(casts.map((c) => c.frame));
    for (const b of l6) {
      expect(
        castFrames.has(b.frame),
        'a fullBurstEnter keying would fire on liter\'s casts too'
      ).toBe(true);
    }
  });

  it('B2 — L7: every cast applies 15.24 to exactly 5 holders for exactly 10s', () => {
    const l7 = rpgBuffApplies(base.events, 'attackDamagePct', 15.24);
    expect(l7.length).toBeGreaterThan(0);
    const perFrame = new Map<number, number>();
    for (const b of l7) {
      perFrame.set(b.frame, (perFrame.get(b.frame) ?? 0) + 1);
      expect(b.expiresFrame! - b.frame).toBe(10 * FPS);
    }
    for (const [frame, count] of perFrame) {
      expect(count, `frame ${frame} reached ${count} holders`).toBe(TEAM.length);
    }
    const castFrames = new Set(casts.map((c) => c.frame));
    expect(
      [...perFrame.keys()].every((f) => castFrames.has(f)),
      'L7 must be keyed to HER burstCast, not fullBurstEnter (liter is the decoy B1)'
    ).toBe(true);
    expect(perFrame.size, 'one application per cast of hers').toBe(casts.length);
  });

  it('B3 — L7 moves the carry\'s damage', () => {
    expect(noL7.totals[ADA]).toBeLessThan(base.totals[ADA]);
  });

  it('B4 — L6 is inert: removing it changes NO unit\'s damage', () => {
    expect(noL6.totals).toEqual(base.totals);
  });
});

// ===============================================================================================
// N — everything outside L3/L7 is damage-neutral (bare-weapon identity)
// ===============================================================================================
describe('N — defensive residue (shields/heal/Max HP) is byte-neutral', () => {
  // NOTE: a SOLO Burst-I unit DOES cast her burst (only a lone B3 can never complete a chain),
  // so the solo full kit carries L3 (permanent) PLUS L7's ~50% uptime (20s cd / 10s window) —
  // both are Damage-Up-bucket lifts on herself. N1a bounds the combined lift mechanically;
  // N1a-2 isolates L3 exactly by dividing it out against the noL3 solo run.
  const soloTotal = (ov: any) =>
    unitOf(
      runComp({
        slugs: [SLUG],
        bossElement: 'Iron',
        overrides: { [SLUG]: ov },
      }),
      SLUG
    ).totalDamage;

  it('N1a — solo full kit lifts her OWN damage (all allies includes the caster)', () => {
    const withKit = soloTotal(realOverride);
    const bare = soloTotal(bareWeaponOverride(SLUG));
    // L3 alone is ×1.1041; L7 uptime adds up to ~8% more — mechanical band, not a fit.
    expect(withKit / bare).toBeGreaterThan(1.1);
    expect(withKit / bare).toBeLessThan(1.25);
  });

  it('N1a-2 — solo: the L3 lift alone is exactly the Damage-Up bucket share', () => {
    // Per hit: with/without L3 the ratio is (1+d+0.1041)/(1+d), d = 0.1524 while L7 is up, 0
    // otherwise — always in [1.0907, 1.1041]. The aggregate must stay inside that band.
    const withKit = soloTotal(realOverride);
    const noL3Solo = soloTotal(rpgNoL3);
    expect(withKit / noL3Solo).toBeGreaterThan(1.09);
    expect(withKit / noL3Solo).toBeLessThan(1.105);
  });

  it('N1b — solo, bursts ON: the L3/L7-stripped kit is byte-identical to the bare weapon', () => {
    const withResidue = unitOf(
      runComp({
        slugs: [SLUG],
        bossElement: 'Iron',
        overrides: { [SLUG]: rpgNoDamageBuffs },
      }),
      SLUG
    ).totalDamage;
    const bare = unitOf(
      runComp({
        slugs: [SLUG],
        bossElement: 'Iron',
        overrides: { [SLUG]: bareWeaponOverride(SLUG) },
      }),
      SLUG
    ).totalDamage;
    expect(withResidue).toBe(bare);
    expect(withResidue).toBeGreaterThan(0);
  });

  it('N2 — bare team, bursts OFF: the residue moves NO ally damage', () => {
    const team = (rpg: any) =>
      totals(
        runComp({
          slugs: [SLUG, 'folkwang', 'claire'],
          bossElement: 'Iron',
          overrides: {
            [SLUG]: rpg,
            folkwang: bareWeaponOverride('folkwang'),
            claire: bareWeaponOverride('claire'),
          },
          cfg: { disableBursts: true },
        })
      );
    expect(team(rpgNoDamageBuffs)).toEqual(team(bareWeaponOverride(SLUG)));
  });
});
