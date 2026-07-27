import { describe, it, expect } from 'vitest';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness';

// ============================================================================
// tove — BLIND S5 kit spec test (written from kit prose alone)
// ----------------------------------------------------------------------------
// KIT (ground truth, paraphrased):
//  Base: AR / Water / Supporter / BURST I, ammo 60.
//  skill1:
//   [A] "Activates after 10 normal attacks. Affects self."  -> Emergency-Crafted
//       Bullets: reload 5.31% of the magazine.  (hitCount:10, self, instantReload ~0.0531)
//   [B] "Activates during Emergency-Crafted Bullets. Affects ALL ALLIES."  (same
//       every-10-attacks trigger). Temporary Modification: Max Ammunition +2, stacks
//       up to 3, lasts 5s;  Critical Damage +5.24% for 5s.
//         -> buff maxAmmoFlat 2 (maxStacks 3, dur 5s) + buff critDamagePct 5.24 (dur 5s),
//            BOTH targeting all allies (one block).
//  skill2 (both gated: only while Temporary Modification is at MAX stacks):
//   [A] Affects ALL ALLIES: Critical Rate +10.08% CONTINUOUSLY  -> generic critRatePct
//       (UNSCOPED -- nearest-wrong is critRateNormalPct; taxonomy trap #1).
//   [B] Affects ALL SHOTGUN-WIELDING ALLIES: Attack Speed +42.24% continuously
//       -> attackSpeedPct, target alliesOfWeapon:'SG'  (weapon-typed, class-blind).
//  burst (BURST I) -- Miracle of Makeshifts, ATK % of the SKILL USER's ATK,
//       "mirrors the stack count of Temporary Modification" (x1..x3) for 15s:
//   [A] ALL ALLIES: casterAtkPct 2.32 x stacks.
//   [B] SHOTGUN ALLIES: casterAtkPct 24.21 x stacks.
//
// FIXTURE: controlComp('tove', true) => [liter B1, crown B2, tove (carry slot), helm B3].
//   helm=true kept: tove's tests are DELTAS (base vs patched), so helm's own buffs
//   cancel and never confound the isolation.
//   Two hard fixture limits, both surfaced below as it.skip with reasons:
//    (1) tove is BURST I -- controlComp forces liter as the B1 caster, so tove almost
//        certainly does NOT cast her own burst here => both burst blocks are untestable
//        in this fixture (need a comp where tove is the SOLE Burst-I unit).
//    (2) NO shotgun ally in controlComp => the SG-scoped magnitudes (attack speed,
//        burst-B) are inert; only the SG *scoping* (no leak to non-SG allies) is testable.
//
// API ASSUMPTIONS (documented; blind to the real harness internals):
//   - runComp(opts) accepts opts.cfg.onEvent and opts.overrides = { slug: overrideClone }.
//   - withPatchedOverride(slug, mutate) mutates a CLONE of the committed override and
//     returns it (committed JSON untouched); we feed that clone via opts.overrides.
//   - unitOf(res, slug) exposes a numeric .total (falls back to .damage) for that unit.
//   Convergence with the driver is the signal; a small API-shape drift is a known risk
//   of a blind pass, not a modeling claim.
// ============================================================================

const BASE = controlComp('tove', true);
const OTHERS = ['liter', 'crown', 'helm']; // teammates (excludes tove) -> isolates "all allies"

type Ev = any;

function runCollect(override?: any) {
  const evs: Ev[] = [];
  const opts: any = {
    ...BASE,
    cfg: { ...(BASE as any).cfg, onEvent: (e: Ev) => evs.push(e) },
  };
  if (override) {opts.overrides = { tove: override };}
  const res = runComp(opts);
  return { res, evs };
}

const nUnit = (res: any, slug: string): number => {
  const u = unitOf(res, slug) as any;
  return (u?.total ?? u?.damage ?? 0) as number;
};
const othersDamage = (res: any): number =>
  OTHERS.reduce((a, s) => a + nUnit(res, s), 0);
const count = (evs: Ev[], kind: string): number =>
  evs.filter((e) => e && e.kind === kind).length;

// ---- override patch helpers (operate on the withPatchedOverride clone) -------
const zeroStat = (stat: string) => (o: any) => {
  for (const b of o.blocks || [])
    {for (const e of b.effects || [])
      {if (e.kind === 'buff' && e.stat === stat) {e.value = 0;}}}
};
const retargetStat = (stat: string, target: any) => (o: any) => {
  for (const b of o.blocks || [])
    {if (
      (b.effects || []).some((e: any) => e.kind === 'buff' && e.stat === stat)
    )
      {b.target = target;}}
};
const renameStat = (from: string, to: string) => (o: any) => {
  for (const b of o.blocks || [])
    {for (const e of b.effects || [])
      {if (e.kind === 'buff' && e.stat === from) {e.stat = to;}}}
};

// ---- hoisted runs (each runComp is a full 180s sim) --------------------------
const base = runCollect();
const critDmgOff = runCollect(
  withPatchedOverride('tove', zeroStat('critDamagePct'))
); // skill1-B crit dmg
const critRateOff = runCollect(
  withPatchedOverride('tove', zeroStat('critRatePct'))
); // skill2-A crit rate
const atkSpdAllAllies = runCollect(
  withPatchedOverride(
    'tove',
    retargetStat('attackSpeedPct', { kind: 'allies' })
  )
); // skill2-B scope
const maxAmmoOff = runCollect(
  withPatchedOverride('tove', zeroStat('maxAmmoFlat'))
); // skill1-B max ammo

describe('tove — kit spec (blind S5)', () => {
  // -- non-vacuity: the fixture actually exercises the sim -----------------
  it('fixture is non-vacuous (teammates fire, deal damage, and reload)', () => {
    expect(othersDamage(base.res)).toBeGreaterThan(0);
    expect(count(base.evs, 'shot')).toBeGreaterThan(0);
    expect(count(base.evs, 'reload')).toBeGreaterThan(0);
  });

  // -- skill1-B: Critical Damage +5.24% to ALL ALLIES ---------------------
  // Zeroing tove's critDamagePct lowers TEAMMATE damage => the buff both exists and
  // reaches allies. Nearest-wrong (self-only): zeroing it would NOT move othersDamage,
  // so base==critDmgOff and this RED-flags the mis-scope.
  it('skill1 Critical Damage buff raises teammate damage (present + all allies)', () => {
    expect(othersDamage(base.res)).toBeGreaterThan(
      othersDamage(critDmgOff.res)
    );
  });

  // -- skill2-A: Critical Rate +10.08% to ALL ALLIES (generic, continuous) --
  // Zeroing tove's critRatePct lowers TEAMMATE damage. Also catches the taxonomy-#1
  // trap: if the driver used the SCOPED stat (critRateNormalPct) the generic key is
  // absent, the zero-patch is a no-op, base==critRateOff => RED.
  it('skill2 Critical Rate buff raises teammate damage (present + all allies, generic key)', () => {
    expect(othersDamage(base.res)).toBeGreaterThan(
      othersDamage(critRateOff.res)
    );
  });

  // -- skill2-B: Attack Speed is SHOTGUN-scoped (no leak to non-SG allies) --
  // controlComp has no SG ally, so faithful attack-speed is inert here. Broadening the
  // target to ALL allies must ADD teammate shots (they fire faster) => the SG scoping is
  // load-bearing. Nearest-wrong (already all-allies): the patch is a no-op, equal shots => RED.
  it('skill2 Attack Speed is scoped to shotgun allies (broadening to all allies adds shots)', () => {
    expect(count(atkSpdAllAllies.evs, 'shot')).toBeGreaterThan(
      count(base.evs, 'shot')
    );
  });

  // -- skill1-B: Max Ammunition +2 (x3) to allies => fewer reloads --------
  // Weapon-state modifier (taxonomy #6): a bigger magazine fires more shots per belt =>
  // fewer reloads over a fixed 180s. Removing it must INCREASE team reload count.
  // (Lower-confidence: relies on the ~+6 ammo shifting an integer reload count; flagged.)
  it('skill1 Max Ammunition buff reduces team reload count (weapon-state, live)', () => {
    expect(count(maxAmmoOff.evs, 'reload')).toBeGreaterThan(
      count(base.evs, 'reload')
    );
  });

  // -- inertness: tove carries no enemy debuff / boss-status --------------
  it('tove applies no boss debuff (no damageTaken / targetStatus channel in kit)', () => {
    const bossDebuffs = base.evs.filter(
      (e) =>
        e &&
        (e.kind === 'targetStatus' ||
          (e.kind === 'buffApply' && e.stat === 'damageTakenPct'))
    );
    expect(bossDebuffs.length).toBe(0);
  });

  // ---- GAP / fixture-gated lines (documented skips) --------------------

  // skill2-A scope discrimination (generic critRatePct vs scoped critRateNormalPct):
  // needs a teammate that deals crit-eligible NON-normal (skill/burst) damage so the two
  // encodings diverge behaviourally. controlComp supporters may deal only normals here.
  it.skip('skill2 Critical Rate is GENERIC not normal-scoped (needs teammate skill/burst damage)', () => {
    // would assert othersDamage(base) > othersDamage(critRate-as-normalScoped)
    void renameStat('critRatePct', 'critRateNormalPct');
  });

  // skill2-B magnitude (+42.24% attack speed ON a shotgun ally): controlComp has no SG
  // ally, so the on-target speed-up is unobservable. Needs a comp with an SG teammate.
  it.skip('skill2 Attack Speed +42.24% actually speeds up a shotgun ally (needs SG ally in comp)', () => {});

  // burst-A: all allies ATK 2.32% of caster ATK, mirrors Temporary Modification stacks (x1..3),
  // 15s. FIXTURE-GATED: tove is BURST I and controlComp forces liter as the B1 caster, so
  // tove does not cast her own burst here. Needs a comp where tove is the sole Burst-I unit.
  it.skip('burst all-allies ATK grant (2.32% x stacks) — fixture: tove is B1, does not burst in controlComp', () => {});

  // burst-B: shotgun allies ATK 24.21% of caster ATK x stacks, 15s. Doubly gated: needs
  // (a) tove-as-sole-B1 comp AND (b) an SG ally. Highest-value untested line.
  it.skip('burst shotgun-ally ATK grant (24.21% x stacks) — needs tove-as-B1 comp + SG ally', () => {});

  // skill1-A: Emergency-Crafted Bullets partial reload (5.31% of magazine) every 10 normals.
  // Self-only, ~3 rounds; a partial instant-reload is hard to isolate from magazine reloads
  // and moves negligible damage (tove is a supporter). Modeled but not separately asserted.
  it.skip('skill1 partial reload 5.31%/10-attacks (self) — low observability / negligible damage', () => {});

  // Temporary Modification MAX-STACKS gate (skill2) + burst STACK-MIRROR (x1..3): in steady
  // state the buff refreshes every ~10 normals (5s window) so stacks sit at max; the
  // "at max stacks" gate resolves to ~always-on after a short opening ramp and the mirror
  // resolves to x3. Discriminating the gate needs a stack-STARVED scenario the fixture
  // cannot construct deterministically in one run.
  it.skip('skill2 max-stacks gate / burst stack-mirror — steady-state pins to max; gate needs stack-starved run', () => {});
});
