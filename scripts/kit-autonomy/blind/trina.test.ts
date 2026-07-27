/**
 * trina.test.ts — BLIND kit spec test (S5, cross-family). Author: post-op blind writer.
 *
 * Unit: trina — RL / Electric / Supporter / Burst II. She is an ELECTRIC-AR TEAM support: almost
 * all of her offensive payload is scoped to "Electric Code allies with assault rifles", plus ONE
 * all-ally Attack-Damage buff on her own burst (the only fixture-independent discriminator).
 *
 * KIT (structural read of the `■` headers + `Affects…` clauses + stat-keyword▲):
 *  skill1:
 *   - [FB-end]  all allies:            HoT 4.06%/s ×5s        -> heal ticks; no HP pool -> inert. GAP.
 *   - [Full Charge, 2 lowest-HP <30%]: recover 2.03%        -> HP-gated heal, never fires (immortal boss). GAP.
 *   - [Full Charge, 2 lowest-HP <50%]: recover 1.57%        -> same. GAP.
 *  skill2:
 *   - [start] Electric+AR allies:      Max HP ▲44.98% of CASTER HP  -> ally Max-HP grant, offensively INERT (e3 feed rule). UNMODELED-inert.
 *   - [start] 1 leftmost Electric+AR:  Invulnerable 2s             -> defensive, no HP model. GAP.
 *   - [BURST-CAST] 1 leftmost Electric+AR: Atk Dmg ▲94.15% + Reload ▲50.82% 10s -> REAL, but target = empty set in control comp.
 *  burst:
 *   - all allies: Max HP ▲20.14% of CASTER HP (inert) + ATTACK DAMAGE ▲20.9% 10s  <-- MAIN runnable discriminator.
 *   - [enemies==1] Spread Roots: burst-skill dmg of "Affects all enemies" ▲435.6% 5s -> niche AoE scaler, no engine bucket. GAP.
 *   - [enemies>2]  Wilted Roots ▲64.46% 5s                                          -> multi-enemy gate off in single-boss + same GAP.
 *   - Electric+AR allies: Hit Rate ▲45.3% + Max Ammo ▲20 rounds 10s              -> REAL, target = empty set in control comp.
 *
 * FIXTURE: controlComp('trina', true) = liter(B1)/crown(B2)/trina/helm(B3). NONE of liter/crown/helm
 * is an Electric-Code AR unit, and trina herself is RL (not AR), so every "Electric Code allies with
 * assault rifles" line targets the EMPTY set here. => those lines are assertable only for INERTNESS
 * (they must not touch the non-qualifying allies); their positive magnitudes need a custom comp with an
 * Electric AR ally (it.skip'd). The ALL-ALLIES burst Attack-Damage ▲20.9% is fixture-independent and
 * carries the main discriminating test.
 *
 * TRIGGER NOTE: skill2 line 3 "when using Burst Skill" == trina's OWN burst cast (burstCast), NOT team
 * fullBurstEnter. In a multi-burster comp fullBurstEnter would over-credit on rotations trina did not
 * burst. The control comp has no second qualifying burster to exercise that divergence, so it is
 * documented + it.skip'd rather than faked.
 *
 * HARNESS-CONTRACT ASSUMPTIONS (blind): withPatchedOverride(slug, mutate) clones the COMMITTED override
 * fresh each call (patches do NOT stack) and installs it in memory; committed JSON untouched. Baseline is
 * therefore hoisted FIRST, before any patch, so it reads committed behaviour regardless of install scope.
 */
import { describe, it, expect } from 'vitest';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness';

type Ev = any;
const near = (a: number, b: number, eps = 0.2) => Math.abs((a ?? 0) - b) < eps;
const num = (t: any): number =>
  typeof t === 'number' ? t : (t?.total ?? t?.totalDamage ?? 0);

function go(): { events: Ev[]; tot: number } {
  const events: Ev[] = [];
  const opts: any = controlComp('trina', true);
  opts.cfg = { ...(opts.cfg || {}), onEvent: (e: Ev) => events.push(e) };
  const res = runComp(opts);
  return { events, tot: num(totals(res)) };
}
function goPatched(mutate: (o: any) => void): { events: Ev[]; tot: number } {
  withPatchedOverride('trina', mutate);
  return go();
}

// Locate trina's all-ally burst Attack-Damage effect by VALUE (index-agnostic; blind to authoring).
function findBurstAtk(o: any): { block: any; eff: any } | null {
  for (const b of o.blocks ?? []) {
    if (b.slot !== 'burst') {
      continue;
    }
    for (const e of b.effects ?? []) {
      if (
        e.kind === 'buff' &&
        e.stat === 'attackDamagePct' &&
        near(e.value, 20.9)
      ) {
        return { block: b, eff: e };
      }
    }
  }
  return null;
}

// ---- hoisted runs (each runComp is a full 180s sim; keep the count small) --------------------
const base = go(); // committed behaviour, FIRST
const zeroed = goPatched((o) => {
  const f = findBurstAtk(o);
  if (f) {
    f.eff.value = 0;
  }
}); // value-off counterfactual
const scoped = goPatched((o) => {
  const f = findBurstAtk(o);
  if (f) {
    f.block.target = {
      kind: 'alliesOfElementWeapon',
      element: 'Electric',
      weapon: 'AR',
    };
  }
}); // wrong-scope counterfactual

const atkHits = (evs: Ev[], v: number) =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === 'attackDamagePct' &&
      near(e.value, v) &&
      e.targetIdx != null
  );

describe('trina — burst: all-ally Attack Damage ▲20.9% for 10s (MAIN discriminator)', () => {
  it('applies attackDamagePct≈20.9 to ALL allies (=> trina actually bursts)', () => {
    const hits = atkHits(base.events, 20.9);
    expect(hits.length).toBeGreaterThan(0); // non-vacuity: trina bursts & the buff fires
    const targets = new Set(hits.map((h) => h.targetIdx));
    expect(targets.size).toBe(4); // "Affects all allies" — all 4 team slots incl. self
  });

  it('moves damage: zeroing the buff value drops team total (RED if the buff is inert/mis-bucketed)', () => {
    expect(base.tot).toBeGreaterThan(zeroed.tot);
  });

  it('scope is ALL allies, NOT Electric-AR-only: re-scoping to Electric+AR drops total (RED under the nearest-wrong scope)', () => {
    // No Electric-AR ally exists in the control comp, so under the wrong scope the buff reaches nobody.
    expect(base.tot).toBeGreaterThan(scoped.tot);
    expect(atkHits(scoped.events, 20.9).length).toBe(0);
  });
});

describe('trina — Electric-AR-scoped lines are INERT on non-qualifying allies (inertness)', () => {
  it('skill2 burst-cast Atk Dmg ▲94.15% never lands on liter/crown/helm (they are not Electric+AR)', () => {
    const leak = base.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'attackDamagePct' &&
        near(e.value, 94.15)
    );
    expect(leak.length).toBe(0); // RED if the driver widened target to all-allies / all-AR
  });
  it('burst Hit Rate ▲45.3% + Max Ammo ▲20 rounds never land on the non-Electric-AR allies', () => {
    const hr = base.events.filter(
      (e) =>
        e.kind === 'buffApply' && e.stat === 'hitRatePct' && near(e.value, 45.3)
    );
    const ammo = base.events.filter(
      (e) =>
        e.kind === 'buffApply' && e.stat === 'maxAmmoFlat' && near(e.value, 20)
    );
    expect(hr.length).toBe(0);
    expect(ammo.length).toBe(0);
  });
});

// ---- GAP / fixture-blocked lines: documented, not faked ------------------------------------
describe('trina — measurement/fixture-gated lines', () => {
  it.skip('skill2 burst-cast: Atk Dmg ▲94.15% + Reload ▲50.82% to 1 leftmost Electric+AR ally', () => {
    // Needs a custom comp containing an Electric-Code AR unit (control comp has none). Also the correct
    // trigger is burstCast (trina's OWN burst), and separating it from the nearest-wrong fullBurstEnter
    // needs a SECOND burster so trina can be present on a FB she did not cast. Not expressible in controlComp.
  });
  it.skip('burst: Hit Rate ▲45.3% (core-hit lift, ⛑ derived) + Max Ammo ▲20 rounds to Electric+AR allies', () => {
    // Same fixture gap (no Electric-AR ally). hitRatePct magnitude is measurement-gated regardless.
  });
  it.skip('skill1: FB-end HoT 4.06%/s×5s + HP-gated <30%/<50% heals', () => {
    // No HP pool in v1 (immortal boss); heals emit recovery events with no amount and drive nothing here.
  });
  it.skip('skill2: Invulnerable 2s to 1 leftmost Electric+AR ally', () => {
    // Defensive; no damage-taken / HP model on allies.
  });
  it.skip('burst: Spread Roots ▲435.6% (enemies==1) / Wilted Roots ▲64.46% (enemies>2)', () => {
    // "Burst Skill damage of skills with Affects-all-enemies" is an AoE-burst-skill scaler with no engine
    // bucket; the >2-enemy branch is also gated off in the single-boss sim. Belongs in `unmodeled`.
  });
  it.skip('skill2 Max HP ▲44.98% + burst Max HP ▲20.14% (of CASTER Max HP, to allies)', () => {
    // Ally-granted Max HP is offensively INERT (does not feed a teammate's atkOfMaxHpPct — e3 feed rule),
    // so it can produce no discriminating damage delta. Modeled for kit completeness only. Also note a
    // stat-key gap: "% of the SKILL USER's Max HP" has no clean caster-scaled Max-HP key in the redacted
    // StatKey list (targetMaxHpPct = % of TARGET's own HP; maxHpPct = self) — ⛑ encoding choice.
  });
});
