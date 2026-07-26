/**
 * helm-aquamarine (AR / Iron / Attacker / Burst II, cd 20s, ammo 60, hitsPerShot 1) — BLIND kit-spec test.
 *
 * Written from the kit prose ALONE. The driver's override, the driver's tests and any truth file
 * were NOT consulted. Every assertion below is derived from the prose + the effect schema.
 *
 * WHAT THE KIT SAYS (structural read, quotes kept short):
 *   S1a  header: activates after landing 30 normal attacks / affects the target
 *        payload: 131.34% of final ATK as additional damage
 *        => hitCount{count:30} -> flatDamage 131.34 on the enemy. Rider: crits at the caster rate,
 *           no core (text does not say core strike), FB by timing. noFb/noRange are engine defaults.
 *   S1b  header: activates when entering Full Burst / affects all allies
 *        payload: escalating Burst-Skill cooldown reduction, Once 1.82s / Twice 2.2s / Three 2.6s,
 *                 and each subsequent tier triggers all tiers before it (cumulative: 1.82, 4.02, 6.62).
 *        => fullBurstEnter -> allies -> escalating[burstCdr 1.82, 2.2, 2.6]. NOT oncePerBattle.
 *   S2a  header: affects 1 enemy randomly (NO activation clause)
 *        payload: 105.58% of final ATK as damage
 *        => a damage line the prose gives NO trigger for. Per the ALWAYS-flag rules this is an
 *           invented trigger + invented cadence: interval, period unknowable from prose. FLAGGED.
 *   S2b  header: activates when attacking an Electric Code target / affects the target
 *        payload: Damage Taken +5.64%, 5 stacks, 5 sec
 *        => bossElementGate 'Electric' + buff damageTakenPct 5.64 / maxStacks 5 / durationSec 5.
 *           This is a BOSS DEBUFF: it lifts the WHOLE team, not just the caster.
 *   Ba   header: affects all enemies
 *        payload: 164.83% of final ATK as Burst Skill damage  => burstCast -> flatDamage 164.83.
 *   Bb   header: activates when attacking an Electric Code target / affects the target
 *        payload: 164.83% of final ATK as additional damage
 *        => the SAME magnitude again, but on a bossElementGate 'Electric' block. Two distinct hits.
 *
 * FIXTURE: controlComp('helm-aquamarine', true) — liter (B1) / crown (B2) / carry / helm (B3).
 * The fixed B3 is REQUIRED: helm-aquamarine is Burst II, so without a B3 the chain never completes
 * and ZERO Full Bursts happen, which would make every FB-keyed assertion vacuous.
 * The control boss is FIRE, so BOTH Electric-gated lines are INERT here by construction. Their
 * active case is reached by a counterfactual that strips only the bossElementGate — that proves the
 * block exists, is wired, and that the GATE is what suppresses it, without needing an Electric boss.
 *
 * WHY THE COUNTERFACTUALS DISCRIMINATE: damage `SimEvent`s carry no documented per-unit slug field,
 * so every damage-line claim is proven through totals(res)[slug] against a patched override (which
 * IS per-slug attributable) rather than through event attribution guessing. Buff/rotation claims use
 * the event log, where the field names ARE documented (buffApply stat/value/maxStacks/casterIdx/
 * targetIdx; fullBurstStart needs no slug at all).
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
  // Mechanical import correction ONLY — no assertion or fixture logic was touched.
} from '../../tests/lib/harness.js';

const SLUG = 'helm-aquamarine';

/* ------------------------------------------------------------------ helpers */

// The packet documents the slot value two ways (a bare Block[] on the JSON file vs a CharacterSkills
// carrying its own blocks[] after load). Accept both so a shape guess cannot silently zero a patch.
function slotBlocks(ov: any, slot: 'skill1' | 'skill2' | 'burst'): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  return Array.isArray(s) ? s : (s.blocks ?? []);
}

function allBlocks(ov: any): any[] {
  return [
    ...slotBlocks(ov, 'skill1'),
    ...slotBlocks(ov, 'skill2'),
    ...slotBlocks(ov, 'burst'),
  ];
}

// Flatten a block's effects, descending into escalating.steps so nested burstCdr is reachable.
function effectsOf(b: any): any[] {
  const out: any[] = [];
  const walk = (es: any[]) => {
    for (const e of es ?? []) {
      out.push(e);
      if (Array.isArray(e?.steps)) walk(e.steps);
    }
  };
  walk(b?.effects ?? []);
  return out;
}

const near = (a: number, b: number) =>
  typeof a === 'number' && Math.abs(a - b) < 1e-6;
const hasFlat = (b: any, pct: number) =>
  effectsOf(b).some((e) => e.kind === 'flatDamage' && near(e.atkPct, pct));

function comp(patch?: any): any {
  const c: any = controlComp(SLUG, true);
  if (patch) c.overrides = { ...(c.overrides ?? {}), [SLUG]: patch };
  return c;
}

function run(opts: any) {
  const events: SimEvent[] = [];
  opts.cfg = {
    ...(opts.cfg ?? {}),
    onEvent: (ev: SimEvent) => events.push(ev),
  };
  const res = runComp(opts);
  return { res, events, t: totals(res) as Record<string, number> };
}

const fbCount = (events: SimEvent[]) =>
  (events as any[]).filter((e) => e.kind === 'fullBurstStart').length;
const buffApplies = (events: SimEvent[], stat: string) =>
  (events as any[]).filter((e) => e.kind === 'buffApply' && e.stat === stat);
const others = (t: Record<string, number>) =>
  Object.keys(t).filter((s) => s !== SLUG);

/* ------------------------------------------------- override + counterfactuals */

// Unmodified clone of the committed override — used for the structural (kit-literal) assertions.
const OV: any = withPatchedOverride(SLUG, () => {});

// S1a: kill the 131.34% rider entirely.
const NO_S1A = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov)) {
    for (const e of effectsOf(b))
      if (e.kind === 'flatDamage' && near(e.atkPct, 131.34)) e.atkPct = 0;
  }
});
// S1a nearest-wrong A: once per magazine instead of every 30 landed hits (ammo 60 => 2 procs/mag).
const S1A_LASTBULLET = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov))
    if (hasFlat(b, 131.34)) b.trigger = { kind: 'lastBullet' };
});
// S1a nearest-wrong B: every trigger pull (60 procs/mag).
const S1A_SHOTFIRED = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov))
    if (hasFlat(b, 131.34)) b.trigger = { kind: 'shotFired' };
});

// S1b: no cooldown reduction at all.
const NO_CDR = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov))
    for (const e of effectsOf(b)) if (e.kind === 'burstCdr') e.seconds = 0;
});
// S1b nearest-wrong A: flat 1.82s every Full Burst (the 'Once' tier only, no escalation).
const FLAT_CDR = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of slotBlocks(ov, 'skill1')) {
    if (effectsOf(b).some((e) => e.kind === 'burstCdr'))
      b.effects = [{ kind: 'burstCdr', seconds: 1.82 }];
  }
});
// S1b nearest-wrong B: self-only instead of all allies.
const SELF_CDR = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of slotBlocks(ov, 'skill1')) {
    if (effectsOf(b).some((e) => e.kind === 'burstCdr'))
      b.target = { kind: 'self' };
  }
});

// S2a: kill the 105.58% hit.
const NO_S2A = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of allBlocks(ov)) {
    for (const e of effectsOf(b))
      if (e.kind === 'flatDamage' && near(e.atkPct, 105.58)) e.atkPct = 0;
  }
});

// S2b: strip ONLY the Electric gate on the Damage-Taken block -> its active case on the Fire boss.
const S2B_UNGATED = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of slotBlocks(ov, 'skill2')) {
    if (
      effectsOf(b).some((e) => e.kind === 'buff' && e.stat === 'damageTakenPct')
    )
      delete b.bossElementGate;
  }
});

// Burst: strip ONLY the Electric gate on the burst rider.
const BURST_UNGATED = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of slotBlocks(ov, 'burst'))
    if (b.bossElementGate) delete b.bossElementGate;
});
// Burst: kill both 164.83% hits (on a Fire boss only the ungated one is live anyway).
const NO_BURST_HIT = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of slotBlocks(ov, 'burst')) {
    for (const e of effectsOf(b))
      if (e.kind === 'flatDamage' && near(e.atkPct, 164.83)) e.atkPct = 0;
  }
});

/* ------------------------------------------------------------ hoisted runs (11) */

const BASE = run(comp());
const R_NO_S1A = run(comp(NO_S1A));
const R_S1A_LB = run(comp(S1A_LASTBULLET));
const R_S1A_SF = run(comp(S1A_SHOTFIRED));
const R_NO_CDR = run(comp(NO_CDR));
const R_FLAT_CDR = run(comp(FLAT_CDR));
const R_SELF_CDR = run(comp(SELF_CDR));
const R_NO_S2A = run(comp(NO_S2A));
const R_S2B_UNGATED = run(comp(S2B_UNGATED));
const R_BURST_UNGATED = run(comp(BURST_UNGATED));
const R_NO_BURST = run(comp(NO_BURST_HIT));

/* -------------------------------------------------------------------- fixture */

describe('helm-aquamarine — fixture non-vacuity', () => {
  it('the unit is in the comp and deals damage', () => {
    expect(unitOf(BASE.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect((BASE.events as any[]).some((e) => e.kind === 'damage')).toBe(true);
  });

  it('the comp actually reaches Full Burst repeatedly (S1b tiers need >= 3 entries)', () => {
    // A lone Burst II carry would make ZERO Full Bursts; the escalating tiers Once/Twice/Three
    // are only all exercised from the 3rd entry on.
    expect(fbCount(BASE.events)).toBeGreaterThanOrEqual(3);
  });
});

/* ------------------------------------------------------- S1a: 30 hits -> 131.34% */

describe('helm-aquamarine — S1a: after 30 landed normal attacks, 131.34% of final ATK', () => {
  it('the rider fires and contributes damage', () => {
    // RED if the line is MISSING or authored with a trigger that never fires.
    expect(BASE.t[SLUG]).toBeGreaterThan(R_NO_S1A.t[SLUG]);
  });

  it('its cadence is hit-count 30, bracketed between per-magazine and per-shot', () => {
    // ammo 60, hitsPerShot 1 => a faithful hitCount:30 procs ~2x per magazine.
    // lastBullet (1x/mag) must be strictly WORSE, shotFired (60x/mag) strictly BETTER.
    // Both bounds RED any model that mis-reads the activation as per-magazine or per-shot.
    expect(BASE.t[SLUG]).toBeGreaterThan(R_S1A_LB.t[SLUG]);
    expect(BASE.t[SLUG]).toBeLessThan(R_S1A_SF.t[SLUG]);
  });

  it('is enemy-facing only: it moves no teammate', () => {
    for (const s of others(BASE.t)) expect(R_NO_S1A.t[s]).toBe(BASE.t[s]);
  });

  it.skip('per-kit noFb on this rider is MEASURED-ONLY (default OFF) — not derivable from prose', () => {});
});

/* ------------------------------------ S1b: FB-enter escalating burst-CDR to allies */

describe('helm-aquamarine — S1b: entering Full Burst, escalating Burst CD reduction to all allies', () => {
  it('accelerates the team rotation (more Full Bursts than with the CDR removed)', () => {
    // RED if the CDR is MISSING, keyed to a trigger that never fires, or oncePerBattle.
    expect(fbCount(BASE.events)).toBeGreaterThan(fbCount(R_NO_CDR.events));
  });

  it('escalates cumulatively rather than granting a flat 1.82s every entry', () => {
    // Faithful: 1.82 / 4.02 / 6.62 per entry. Nearest-wrong: only the Once tier, forever.
    expect(fbCount(BASE.events)).toBeGreaterThan(fbCount(R_FLAT_CDR.events));
  });

  it('targets ALL ALLIES, not just the caster', () => {
    // Nearest-wrong: target self. The rotation is gated by the teammates' cooldowns too, so a
    // self-only CDR cannot reproduce the ally-wide Full Burst cadence.
    expect(fbCount(BASE.events)).toBeGreaterThan(fbCount(R_SELF_CDR.events));
  });

  it('lifts teammate damage (it is a team effect, not a self effect)', () => {
    for (const s of others(BASE.t))
      expect(BASE.t[s]).toBeGreaterThan(R_NO_CDR.t[s]);
  });
});

/* ------------------------------------------- S2a: 105.58% to 1 random enemy (FLAG) */

describe('helm-aquamarine — S2a: 105.58% of final ATK, 1 enemy, NO activation clause', () => {
  it('the hit exists and contributes damage', () => {
    expect(BASE.t[SLUG]).toBeGreaterThan(R_NO_S2A.t[SLUG]);
  });

  it('is enemy-facing only: it moves no teammate', () => {
    for (const s of others(BASE.t)) expect(R_NO_S2A.t[s]).toBe(BASE.t[s]);
  });

  it.skip('FLAG: the prose gives this line no trigger, so its cadence (interval period) is outside the input domain — measurement-gated, pin from popup spacing in footage', () => {});
});

/* ------------------------- S2b: Electric-gated Damage Taken +5.64%, 5 stacks, 5 sec */

describe('helm-aquamarine — S2b: attacking an Electric Code target, Damage Taken +5.64%', () => {
  it('is INERT against the non-Electric control boss', () => {
    const dt = buffApplies(BASE.events, 'damageTakenPct').filter((e) =>
      near(e.value, 5.64),
    );
    expect(dt.length).toBe(0);
  });

  it('goes live as a boss-held debuff once only the Electric gate is stripped', () => {
    const dt = buffApplies(R_S2B_UNGATED.events, 'damageTakenPct').filter((e) =>
      near(e.value, 5.64),
    );
    expect(dt.length).toBeGreaterThan(30); // per-attack cadence, not once per Full Burst (~8 in 180s)
    expect(dt[0].maxStacks).toBe(5);
    // Boss-held debuffs carry casterIdx === null AND targetIdx === null. Nearest-wrong: authored as
    // an ally/self buff, which would attach to a real unit index.
    expect(dt.every((e: any) => e.targetIdx === null)).toBe(true);
  });

  it('lifts the WHOLE team when live (Damage Taken is a debuff, not a self buff)', () => {
    for (const s of others(BASE.t))
      expect(R_S2B_UNGATED.t[s]).toBeGreaterThan(BASE.t[s]);
    expect(R_S2B_UNGATED.t[SLUG]).toBeGreaterThan(BASE.t[SLUG]);
  });
});

/* ---------------------------------------------------- Burst: 164.83% + 164.83% rider */

describe('helm-aquamarine — Burst: 164.83% to all enemies, +164.83% vs Electric Code', () => {
  it('the unconditional burst hit actually lands in this fixture', () => {
    // Doubles as the burst non-vacuity gate: helm-aquamarine is Burst II and the control comp also
    // holds a Burst II ally, so if she never gets the cast this goes RED and that IS the finding.
    expect(BASE.t[SLUG]).toBeGreaterThan(R_NO_BURST.t[SLUG]);
    expect((BASE.events as any[]).some((e) => e.kind === 'burstCast')).toBe(
      true,
    );
  });

  it('the Electric rider is present but gated off against the Fire control boss', () => {
    // Stripping ONLY the gate must ADD damage: proves the second 164.83% hit exists and that the
    // bossElementGate (not a missing block) is what silences it. Nearest-wrong: an ungated rider,
    // which would already be firing in BASE and leave this delta at zero.
    expect(R_BURST_UNGATED.t[SLUG]).toBeGreaterThan(BASE.t[SLUG]);
  });

  it('neither burst hit touches a teammate', () => {
    for (const s of others(BASE.t)) {
      expect(R_NO_BURST.t[s]).toBe(BASE.t[s]);
      expect(R_BURST_UNGATED.t[s]).toBe(BASE.t[s]);
    }
  });
});

/* ------------------------------------------------- structural (kit-literal) shape */

describe('helm-aquamarine — override structure matches the kit text literally', () => {
  it('S1a: 131.34% flatDamage on a hitCount(30) enemy-facing block', () => {
    const b = allBlocks(OV).find((x) => hasFlat(x, 131.34));
    expect(b).toBeTruthy();
    expect(b.slot).toBe('skill1');
    expect(b.trigger.kind).toBe('hitCount');
    expect(b.trigger.count).toBe(30);
    expect(b.target.kind).toBe('enemy');
  });

  it('S1b: fullBurstEnter -> allies, escalating burstCdr 1.82 / 2.2 / 2.6, not oncePerBattle', () => {
    const b = slotBlocks(OV, 'skill1').find((x) =>
      effectsOf(x).some((e) => e.kind === 'burstCdr'),
    );
    expect(b).toBeTruthy();
    expect(b.trigger.kind).toBe('fullBurstEnter');
    expect(b.target.kind).toBe('allies');
    expect(b.target.excludeSelf).toBeFalsy(); // the header says ALL allies
    expect((b.effects ?? []).some((e: any) => e.kind === 'escalating')).toBe(
      true,
    );
    const secs = effectsOf(b)
      .filter((e) => e.kind === 'burstCdr')
      .map((e) => e.seconds)
      .sort((x: number, y: number) => x - y);
    expect(secs).toEqual([1.82, 2.2, 2.6]);
    expect(
      effectsOf(b).some((e) => e.kind === 'burstCdr' && e.oncePerBattle),
    ).toBe(false);
  });

  it('S2a: 105.58% flatDamage lives on skill2 and faces the enemy', () => {
    const b = allBlocks(OV).find((x) => hasFlat(x, 105.58));
    expect(b).toBeTruthy();
    expect(b.slot).toBe('skill2');
    expect(b.target.kind).toBe('enemy');
    // trigger intentionally NOT asserted: the prose supplies none (flagged above).
  });

  it('S2b: damageTakenPct 5.64 / 5 stacks / 5 sec behind bossElementGate Electric', () => {
    const b = allBlocks(OV).find((x) =>
      effectsOf(x).some(
        (e) => e.kind === 'buff' && e.stat === 'damageTakenPct',
      ),
    );
    expect(b).toBeTruthy();
    expect(b.slot).toBe('skill2');
    expect(b.bossElementGate).toBe('Electric');
    expect(b.target.kind).toBe('enemy');
    const e = effectsOf(b).find(
      (x) => x.kind === 'buff' && x.stat === 'damageTakenPct',
    );
    expect(e.value).toBeCloseTo(5.64, 6);
    expect(e.maxStacks).toBe(5);
    expect(e.durationSec).toBe(5);
  });

  it('Burst: exactly two 164.83% hits, exactly one of them Electric-gated, both burstCast', () => {
    const hits = slotBlocks(OV, 'burst').flatMap((b) =>
      effectsOf(b)
        .filter((e) => e.kind === 'flatDamage' && near(e.atkPct, 164.83))
        .map((e) => ({ b, e })),
    );
    expect(hits.length).toBe(2);
    expect(hits.filter((h) => h.b.bossElementGate === 'Electric').length).toBe(
      1,
    );
    expect(hits.filter((h) => !h.b.bossElementGate).length).toBe(1);
    for (const h of hits) {
      expect(h.b.trigger.kind).toBe('burstCast');
      expect(h.b.target.kind).toBe('enemy');
    }
  });
});
