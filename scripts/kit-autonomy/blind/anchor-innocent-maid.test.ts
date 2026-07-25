/**
 * anchor-innocent-maid — BLIND per-unit kit spec test.
 * Written from the kit prose ALONE (no sight of the driver's override, tests, or reasoning).
 *
 * WHAT THE KIT SAYS (structural reading; see blablalink prose for full text)
 *   skill1 ■ "Activates when entering Full Burst. Affects all allies." + escalating 1/2/3:
 *        (1) "Potency of HP ▲" 30.96% / 5s      → healing-potency stat; NO StatKey exists → GAP
 *        (2) Distributed Damage ▲ 30.4% / 10s    → distributedDamagePct (scoped: boosts the HOLDER's
 *                                                  distributed-flavor hits — NOT generic Damage Up)
 *        (3) "Stack count of debuffs ▼ 1"        → cleanse; no primitive → GAP
 *   skill1 ■ second header: same FB-enter trigger, GATED on "an ally from the same squad" being present.
 *        heal 3.04% of caster Max HP every 1 sec for 8 sec → heal{ ticks: 8, intervalSec: 1 }, allies.
 *        Tandem channel: no HP pool is modeled, but heal emits `recovery` events that drive crown's
 *        "when recovery takes effect" block — so this line is NOT inert and must not be skipped.
 *   skill2 ■ "Activates when Full Burst ENDS. Affects all allies." + escalating 1/2/3:
 *        (1) Hit Rate ▲ 10.13% / 10s             → hitRatePct
 *        (2) ATK ▲ 35.02% OF THE SKILL USER'S ATK / 10s → casterAtkPct (flat add), NOT atkPct
 *        (3) Reload Speed ▲ 40.04% / 15s         → reloadSpeedPct — weapon-state = shot economy = DAMAGE
 *   burst  ■ "Affects all allies", no activation clause in a burst block → burstCast (stage 2, her own):
 *        Storage (banks excess healing, 60.19% Max HP, 25s) → no HP pool → GAP
 *        Recovers 40.18% of caster Max HP        → heal{ ticks: 1 }, allies (recovery channel again)
 *        ATK ▲ 30.09% of the skill user's ATK / 10s → casterAtkPct
 *
 * FIXTURE — controlComp(SLUG, true) = liter(B1) / crown(B2) / anchor-innocent-maid(B2, focus) / helm(B3).
 *   • helm MUST stay: anchor-innocent-maid is Burst II, so with helm=false the team has NO Burst III,
 *     the chain never completes and the sim makes ZERO Full Bursts — every skill1/skill2 assertion
 *     would be silently vacuous.
 *   • crown is the recovery CONSUMER: heals are unobservable directly (there is no 'heal' event kind),
 *     but each recovery re-application emits a crown-cast buffApply, which is countable and does not
 *     saturate the way a totals-delta does.
 *   • Two Burst-II units means anchor-innocent-maid's own burst-cast count is strictly less than the
 *     team's Full Burst count — that is exactly the split that discriminates burstCast from
 *     fullBurstEnter for the burst block. If she never wins the B2 slot the burst group fails loudly
 *     (see the non-vacuity assertion) — that is a real fixture finding, not a test bug.
 *
 * WHY EACH ASSERTION DISCRIMINATES: every FAITHFUL/FIX line is checked against its NEAREST-WRONG model
 * built with withPatchedOverride — escalating→flattened (all tiers fire on activation #1),
 * casterAtkPct→atkPct (target-scaled instead of caster-scaled), distributedDamagePct→attackDamagePct
 * (scope widened to generic Damage Up), reloadSpeedPct→0 (the "reload is defensive" skip), and
 * gate/heal removal for the two tandem lines.
 */
import { describe, expect, it } from 'vitest';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

const SLUG = 'anchor-innocent-maid';
const CROWN = 'crown';

type Ev = any;

/* ------------------------------------------------------------------ *
 * harness adapters — deliberately shape-tolerant (no unit knowledge)  *
 * ------------------------------------------------------------------ */

function overrideClone(slug: string, mutate: (o: any) => void): any {
  const cloned: any = withPatchedOverride(slug, mutate);
  return cloned && Array.isArray(cloned.blocks)
    ? cloned
    : (cloned?.[slug] ?? cloned);
}

function totalDamage(res: any): number {
  const t: any = totals(res);
  return typeof t === 'number' ? t : (t.total ?? t.damage ?? t.sum ?? 0);
}

function slotOf(res: any, slug: string): number {
  const u: any = unitOf(res, slug);
  const i = u?.slot ?? u?.slotIdx ?? u?.index;
  if (typeof i === 'number') return i;
  const arr: any[] = res.units ?? res.perUnit ?? [];
  return arr.findIndex((x: any) => x?.slug === slug);
}

function teamSize(res: any): number {
  return (res.units ?? res.perUnit ?? []).length;
}

/** One full 180s sim, optionally against a patched clone of `slug`'s override. */
function runWith(mutate?: (o: any) => void, slug: string = SLUG) {
  const base: any = controlComp(SLUG, true);
  const events: Ev[] = [];
  const opts: any = {
    ...base,
    cfg: { ...(base.cfg ?? {}), onEvent: (ev: Ev) => events.push(ev) },
  };
  if (mutate) {
    opts.overrides = {
      ...(base.overrides ?? {}),
      [slug]: overrideClone(slug, mutate),
    };
  }
  const res: any = runComp(opts);
  return { res, events, total: totalDamage(res) };
}

/* ---------------------------- override walkers --------------------------- */

function walkEffects(o: any, fn: (e: any, b: any) => void) {
  for (const b of o.blocks ?? []) {
    for (const e of b.effects ?? []) {
      fn(e, b);
      if (e.kind === 'escalating') for (const s of e.steps ?? []) fn(s, b);
    }
  }
}

/** Nearest-wrong for an "Once:/Twice:/Three times:" line — every tier fires on activation #1. */
function flattenEscalating(o: any, slot: string) {
  for (const b of o.blocks ?? []) {
    if (b.slot !== slot) continue;
    b.effects = (b.effects ?? []).flatMap((e: any) =>
      e.kind === 'escalating' ? (e.steps ?? []) : [e],
    );
  }
}

function stepWithStat(o: any, slot: string, stat: string): any {
  let found: any = null;
  walkEffects(o, (e, b) => {
    if (!found && b.slot === slot && e.kind === 'buff' && e.stat === stat)
      found = e;
  });
  return found;
}

const hasHeal = (b: any) =>
  (b.effects ?? []).some((e: any) => e.kind === 'heal');

/* ------------------------------- event helpers --------------------------- */

const countKind = (evs: Ev[], kind: string) =>
  evs.filter((e) => e.kind === kind).length;

/** buffApply of `stat` cast by `caster`. Boss-held debuffs (casterIdx===null) are excluded by design. */
const appliesBy = (evs: Ev[], stat: string, caster: number) =>
  evs.filter(
    (e) => e.kind === 'buffApply' && e.stat === stat && e.casterIdx === caster,
  );

/** One apply per target per activation → count the self-targeted copies to get ACTIVATIONS. */
const activations = (evs: Ev[], stat: string, caster: number) =>
  appliesBy(evs, stat, caster).filter((e) => e.targetIdx === caster).length;

/** How many `kind` events precede `ev` in the (chronological) log. */
function precedingCount(evs: Ev[], ev: Ev, kind: string): number {
  const i = evs.indexOf(ev);
  return i < 0 ? -1 : evs.slice(0, i).filter((e) => e.kind === kind).length;
}

const crownApplies = (evs: Ev[], crown: number) =>
  evs.filter((e) => e.kind === 'buffApply' && e.casterIdx === crown).length;

const near = (a: number, b: number) => Math.abs(a - b) < 0.05;

/* ------------------------------- hoisted runs ---------------------------- */
/* 8 sims total (each ~180s) + one no-op clone for structural reads.        */

const OV: any = overrideClone(SLUG, () => {});

const BASE = runWith();
const FLAT_S1 = runWith((o) => flattenEscalating(o, 'skill1'));
const FLAT_S2 = runWith((o) => flattenEscalating(o, 'skill2'));
const ATK_SELF = runWith((o) =>
  walkEffects(o, (e) => {
    if (e.kind === 'buff' && e.stat === 'casterAtkPct') e.stat = 'atkPct';
  }),
);
const RELOAD_0 = runWith((o) =>
  walkEffects(o, (e) => {
    if (e.kind === 'buff' && e.stat === 'reloadSpeedPct') e.value = 0;
  }),
);
const DIST_GENERIC = runWith((o) =>
  walkEffects(o, (e) => {
    if (e.kind === 'buff' && e.stat === 'distributedDamagePct')
      e.stat = 'attackDamagePct';
  }),
);
const NO_SQUAD_GATE = runWith((o) => {
  for (const b of o.blocks ?? []) {
    if (b.slot === 'skill1' && hasHeal(b)) {
      delete b.teamHas;
      delete b.formation;
    }
  }
});
const NO_BURST_HEAL = runWith((o) => {
  for (const b of o.blocks ?? []) {
    if (b.slot === 'burst')
      b.effects = (b.effects ?? []).filter((e: any) => e.kind !== 'heal');
  }
});

const ANCHOR = slotOf(BASE.res, SLUG);
const CROWN_SLOT = slotOf(BASE.res, CROWN);
const FB_STARTS = countKind(BASE.events, 'fullBurstStart');
const FB_ENDS = countKind(BASE.events, 'fullBurstEnd');

/* ================================ FIXTURE =============================== */

describe('anchor-innocent-maid — fixture non-vacuity', () => {
  it('the comp is wired: anchor + crown present, and ≥3 Full Bursts occur', () => {
    expect(ANCHOR).toBeGreaterThanOrEqual(0);
    expect(CROWN_SLOT).toBeGreaterThanOrEqual(0);
    // Burst-II carry: without helm (the only B3) the chain never closes and FB_STARTS would be 0.
    // ≥3 is required so escalating tiers 1, 2 AND 3 are all reachable — and so tier-3 has an
    // INACTIVE case (activations 1 and 2) to contrast against.
    expect(FB_STARTS).toBeGreaterThanOrEqual(3);
    expect(FB_ENDS).toBeGreaterThanOrEqual(3);
  });

  it('anchor-innocent-maid casts no boss debuff (nothing in her kit inflicts one)', () => {
    const debuffs = BASE.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.casterIdx === ANCHOR &&
        e.stat === 'damageTakenPct',
    );
    expect(debuffs.length).toBe(0);
  });
});

/* ========================= skill1 — Full Burst ENTER ===================== */

describe('anchor-innocent-maid — skill1 (entering Full Burst, all allies, escalating)', () => {
  it.skip('tier 1 "Potency of HP ▲ 30.96% / 5s" — GAP: no healing-potency StatKey (and no HP pool)', () => {
    // Unobservable payload: healing effectiveness has no primitive and no consumer in v1.
    // Belongs in the override `unmodeled` record (audited in the no-silent-drops test below).
  });

  it('tier 2: Distributed Damage ▲30.4%/10s hits ALL allies and only from the 2nd Full Burst', () => {
    const ap = appliesBy(BASE.events, 'distributedDamagePct', ANCHOR);
    expect(ap.length).toBeGreaterThan(0);
    expect(near(ap[0].value, 30.4)).toBe(true);

    // "Affects all allies" — every slot, self included (discriminates excludeSelf / topAtk targeting).
    const targets = new Set(ap.map((e) => e.targetIdx));
    expect(targets.size).toBe(teamSize(BASE.res));
    expect(targets.has(ANCHOR)).toBe(true);

    // ESCALATING: tier 2 must be absent on Full Burst #1 (the inactive case) and present after.
    expect(
      precedingCount(BASE.events, ap[0], 'fullBurstStart'),
    ).toBeGreaterThanOrEqual(2);
    expect(activations(BASE.events, 'distributedDamagePct', ANCHOR)).toBe(
      FB_STARTS - 1,
    );

    // NEAREST-WRONG (all tiers applied at once): fires on FB #1 and once per FB.
    const flat = appliesBy(FLAT_S1.events, 'distributedDamagePct', ANCHOR);
    expect(precedingCount(FLAT_S1.events, flat[0], 'fullBurstStart')).toBe(1);
    expect(
      activations(FLAT_S1.events, 'distributedDamagePct', ANCHOR),
    ).toBeGreaterThan(activations(BASE.events, 'distributedDamagePct', ANCHOR));
  });

  it('tier 2 is SCOPED to distributed damage — encoding it as generic Damage Up over-credits', () => {
    // Inertness: no unit in this comp deals distributed-flavor damage, so the faithful buff moves
    // no numbers; the nearest-wrong generic stat demonstrably does. RED under scope-widening.
    expect(DIST_GENERIC.total).toBeGreaterThan(BASE.total);
  });

  it('tier 2 duration is 10s and it expires (applies pair with removes)', () => {
    const step = stepWithStat(OV, 'skill1', 'distributedDamagePct');
    expect(step).toBeTruthy();
    expect(step.durationSec).toBe(10);
    const removes = BASE.events.filter(
      (e) =>
        e.kind === 'buffRemove' &&
        e.stat === 'distributedDamagePct' &&
        e.casterIdx === ANCHOR,
    );
    const applies = appliesBy(BASE.events, 'distributedDamagePct', ANCHOR);
    expect(removes.length).toBeGreaterThanOrEqual(
      applies.length - teamSize(BASE.res),
    );
  });

  it.skip('tier 3 "Stack count of debuffs ▼ 1" — GAP: no debuff-stack / cleanse primitive', () => {
    // Nothing in the sim stacks enemy-applied debuffs on allies, so there is nothing to decrement.
  });

  it('squad-gated heal: INERT here (no squad-mate), and it drives the recovery channel when un-gated', () => {
    // The second skill1 header only fires "while an ally from the same squad is on the battlefield".
    // controlComp holds no squad-mate → the block must be inert. Removing the gate must produce MORE
    // crown-cast buffApply events (crown consumes `recovery`; 8 ticks × every Full Burst).
    // RED if the driver dropped the gate (baseline would already carry the heals → counts equal),
    // and RED if the driver dropped the heal entirely (patched === baseline).
    const baseCrown = crownApplies(BASE.events, CROWN_SLOT);
    const openCrown = crownApplies(NO_SQUAD_GATE.events, CROWN_SLOT);
    expect(openCrown).toBeGreaterThan(baseCrown);
  });

  it('squad heal is a HEAL-OVER-TIME: 8 ticks at 1s, targeted at allies', () => {
    const block = (OV.blocks ?? []).find(
      (b: any) => b.slot === 'skill1' && hasHeal(b),
    );
    expect(block).toBeTruthy();
    const heal = (block.effects ?? []).find((e: any) => e.kind === 'heal');
    expect(heal.ticks).toBe(8); // "every 1 sec for 8 sec" — a single instant heal loses 7 recovery events
    expect(heal.intervalSec ?? 1).toBe(1);
    expect(block.target?.kind).toBe('allies');
    expect(block.trigger?.kind).toBe('fullBurstEnter');
  });
});

/* ========================== skill2 — Full Burst END ====================== */

describe('anchor-innocent-maid — skill2 (Full Burst ENDS, all allies, escalating)', () => {
  it('trigger identity is fullBurstEnd, not fullBurstEnter', () => {
    const blocks = (OV.blocks ?? []).filter((b: any) => b.slot === 'skill2');
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) expect(b.trigger?.kind).toBe('fullBurstEnd');
    const hr = appliesBy(BASE.events, 'hitRatePct', ANCHOR);
    expect(hr.length).toBeGreaterThan(0);
    // Every apply must sit AFTER at least one fullBurstEnd (an FB-enter model would apply before any).
    expect(
      precedingCount(BASE.events, hr[0], 'fullBurstEnd'),
    ).toBeGreaterThanOrEqual(1);
  });

  it('tier 1: Hit Rate ▲10.13%/10s fires on the FIRST Full Burst end, on all allies', () => {
    const ap = appliesBy(BASE.events, 'hitRatePct', ANCHOR);
    expect(near(ap[0].value, 10.13)).toBe(true);
    expect(precedingCount(BASE.events, ap[0], 'fullBurstEnd')).toBe(1);
    expect(activations(BASE.events, 'hitRatePct', ANCHOR)).toBe(FB_ENDS);
    expect(new Set(ap.map((e) => e.targetIdx)).size).toBe(teamSize(BASE.res));
    expect(stepWithStat(OV, 'skill2', 'hitRatePct').durationSec).toBe(10);
  });

  it('tier 2: ATK ▲35.02% is CASTER-scaled and withheld until the 2nd Full Burst end', () => {
    const ap = appliesBy(BASE.events, 'casterAtkPct', ANCHOR);
    const s2 = ap.filter((e) => near(e.value, 35.02));
    expect(s2.length).toBeGreaterThan(0);

    // ESCALATING — inactive on end #1 (this is the both-cases check), active from #2.
    expect(
      precedingCount(BASE.events, s2[0], 'fullBurstEnd'),
    ).toBeGreaterThanOrEqual(2);
    const acts = s2.filter((e) => e.targetIdx === ANCHOR).length;
    expect(acts).toBe(FB_ENDS - 1);

    // NEAREST-WRONG #1 — flattened escalation: fires on end #1 and once per end.
    const flat = appliesBy(FLAT_S2.events, 'casterAtkPct', ANCHOR).filter((e) =>
      near(e.value, 35.02),
    );
    expect(precedingCount(FLAT_S2.events, flat[0], 'fullBurstEnd')).toBe(1);
    expect(flat.filter((e) => e.targetIdx === ANCHOR).length).toBeGreaterThan(
      acts,
    );

    expect(stepWithStat(OV, 'skill2', 'casterAtkPct').durationSec).toBe(10);
  });

  it('tier 2 ATK is "% OF THE SKILL USER\'S ATK" — atkPct is the nearest-wrong and moves damage', () => {
    // casterAtkPct = flat add derived from anchor-innocent-maid's own ATK (a Supporter sheet);
    // atkPct would scale each ally by their OWN ATK. Different math → different totals.
    expect(ATK_SELF.total).not.toBe(BASE.total);
  });

  it('tier 3: Reload Speed ▲40.04%/15s waits for the 3rd Full Burst end — and IS damage', () => {
    const ap = appliesBy(BASE.events, 'reloadSpeedPct', ANCHOR);
    expect(ap.length).toBeGreaterThan(0);
    expect(near(ap[0].value, 40.04)).toBe(true);
    expect(
      precedingCount(BASE.events, ap[0], 'fullBurstEnd'),
    ).toBeGreaterThanOrEqual(3);
    expect(activations(BASE.events, 'reloadSpeedPct', ANCHOR)).toBe(
      FB_ENDS - 2,
    );
    // 15s, NOT the 10s of the two tiers above — a transcription slip a totals check cannot see.
    expect(stepWithStat(OV, 'skill2', 'reloadSpeedPct').durationSec).toBe(15);

    // Weapon-state = shot economy: zeroing it must LOSE damage. RED under the "reload is defensive,
    // skip it" model (which would leave totals byte-identical).
    expect(RELOAD_0.total).toBeLessThan(BASE.total);

    // Non-vacuity for the reload channel: allies actually reload in this fight.
    expect(countKind(BASE.events, 'reload')).toBeGreaterThan(0);
  });
});

/* ================================= burst ================================ */

describe('anchor-innocent-maid — burst (own cast, all allies)', () => {
  const anchorBursts = BASE.events.filter(
    (e) =>
      e.kind === 'burstCast' && (e.srcSlot ?? e.slot ?? e.casterIdx) === ANCHOR,
  ).length;

  it('fixture actually lets her cast — and she casts on FEWER rotations than the team Full Bursts', () => {
    // Two Burst-II units (crown + anchor-innocent-maid) share the stage-2 slot. If this is 0 the burst
    // group below is untestable in controlComp and needs a comp where she is the sole B2 — report it.
    expect(anchorBursts).toBeGreaterThan(0);
    // The split that makes the next assertion meaningful: burstCast ≠ fullBurstEnter here.
    expect(anchorBursts).toBeLessThan(FB_STARTS);
  });

  it("ATK ▲30.09% of the skill user's ATK / 10s fires on HER cast, not on every Full Burst", () => {
    const ap = appliesBy(BASE.events, 'casterAtkPct', ANCHOR).filter((e) =>
      near(e.value, 30.09),
    );
    expect(ap.length).toBeGreaterThan(0);
    // Trigger identity: activation count tracks HER burst casts. Keying it to fullBurstEnter would
    // over-credit on every rotation crown takes the stage-2 slot.
    expect(ap.filter((e) => e.targetIdx === ANCHOR).length).toBe(anchorBursts);
    expect(new Set(ap.map((e) => e.targetIdx)).size).toBe(teamSize(BASE.res));
    const step = stepWithStat(OV, 'burst', 'casterAtkPct');
    expect(step.durationSec).toBe(10);
    const block = (OV.blocks ?? []).find(
      (b: any) =>
        b.slot === 'burst' &&
        (b.effects ?? []).some((e: any) => e.stat === 'casterAtkPct'),
    );
    expect(block.trigger?.kind).toBe('burstCast');
    expect(block.target?.kind).toBe('allies');
  });

  it('the 40.18% Max-HP recovery is wired to allies and feeds the recovery channel', () => {
    const block = (OV.blocks ?? []).find(
      (b: any) => b.slot === 'burst' && hasHeal(b),
    );
    expect(block).toBeTruthy();
    expect(block.target?.kind).toBe('allies');
    const heal = (block.effects ?? []).find((e: any) => e.kind === 'heal');
    expect(heal.ticks ?? 1).toBe(1); // instant one-shot recovery, not a HoT
    // TANDEM: stripping the heal must cost crown recovery re-applications. RED if the heal was
    // skipped as "defensive, no damage".
    expect(crownApplies(BASE.events, CROWN_SLOT)).toBeGreaterThan(
      crownApplies(NO_BURST_HEAL.events, CROWN_SLOT),
    );
  });

  it.skip('"Storage" (banks excess healing up to 60.19% Max HP, 25s) — GAP: no HP pool in v1', () => {
    // Excess healing cannot exist without an HP pool and an incoming-damage model; the bank has no
    // consumer. Recorded in `unmodeled` (audited below) rather than approximated.
  });
});

/* ============================ no silent drops =========================== */

describe('anchor-innocent-maid — audit', () => {
  it('every unmodelable kit line is recorded in `unmodeled` (no silent drops)', () => {
    const text = JSON.stringify(OV.unmodeled ?? {});
    expect(text).toMatch(/Potency/i);
    expect(text).toMatch(/Stack count/i);
    expect(text).toMatch(/Storage/i);
  });

  it('no `ignored`-kind effects (validator-rejected) anywhere in the override', () => {
    let bad = 0;
    walkEffects(OV, (e) => {
      if (e.kind === 'ignored' || e.kind === 'unsupported') bad++;
    });
    expect(bad).toBe(0);
  });
});
