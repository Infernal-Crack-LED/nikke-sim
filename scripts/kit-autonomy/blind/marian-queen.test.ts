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
 * marian-queen — BLIND per-unit kit-spec test (role s5).
 *
 * Written from the kit prose ALONE. No driver test / override / reasoning / truth file was read.
 * Because this file was authored WITHOUT running the sim, every assertion is either
 * (a) kit-arithmetic derivable, (b) a LOOSE bound, or (c) a RELATIVE counterfactual (faithful vs
 * nearest-wrong, built with withPatchedOverride). No exact damage or proc magnitudes are pinned —
 * blind, an exact number would be a guess, not a spec.
 *
 * KIT (paraphrased; quotes kept short):
 *  S1-a  battleStart, self, 'Recurring interval: 4 sec' — 7 sequential Dark Matter spears at
 *        125.51% final ATK each, at random enemies (one boss => all 7 land on the boss).
 *        Each landing spear applies Open Wounds = Damage Taken +5.05%, continuous, unremovable
 *        => a BOSS DEBUFF the whole team eats, NOT a self buff (taxonomy #4).
 *  S1-b  'when using Burst Skill', all enemies — the same Open Wounds debuff (burst-CAST identity).
 *  S2-a  'when using Burst Skill', self, 10 sec window (Penetrant Wish):
 *          e1 every 2 normal attacks -> 14.06% final ATK as CORE STRIKE damage to all enemies
 *             in the Open Wounds state;
 *          e2 self — S1 recurring interval -2 sec (4s -> 2s) for the window
 *             (skillCooldownReductionSec: the schema says it shortens interval-trigger timers).
 *  S2-b  'entering Full Burst while NOT in Penetrant Wish' -> Sequential Atk Dmg +85.17% / 10s.
 *  S2-c  'entering Full Burst while IN Penetrant Wish'     -> Core Damage +24.64% / 10s.
 *  BURST self: reload 100% ammo; MG Ramp-Up Speed +100% / 10s; ATK +78.4% / 10s;
 *        Attack Damage +78.14% / 10s.   BURST enemies: 1346.4% final ATK as burst damage.
 *
 * FIXTURES (2 base + 8 patched = 10 runs; each is a full 180s sim):
 *  base = controlComp('marian-queen', true)  — liter/crown/carry/helm: TWO Burst-III units, so a
 *         Full Burst can be completed by helm on a rotation she did NOT burst, which is the only
 *         way S2-b's branch can ever be reached.
 *  solo = controlComp('marian-queen', false) — liter/crown/carry: she is the ONLY B3, so she casts
 *         on EVERY rotation and is therefore ALWAYS in Penetrant Wish at FB entry. That makes the
 *         S2-b/S2-c pair deterministic (core branch = every FB, sequential branch = never), which
 *         is why nearly every counterfactual below runs on `solo`.
 *
 * WHY THE S2-b/S2-c PAIR IS THE CENTREPIECE: the schema has `requiresSelfStatus` but NO negated
 * self-status gate, so 'while NOT in <own state>' has to be expressed another way. Her own burst
 * cast is what opens the state and always precedes FB entry, so the faithful pair is
 * ownBurstGate 'notCast' (sequential) / 'cast' (core). ANY faithful encoding fires EXACTLY ONE of
 * the two per Full Burst => (#sequential + #core) === #fullBurstStart. The nearest-wrong (no gate)
 * fires BOTH every FB and doubles that sum; re-keying both to burstCast drops it below the FB count.
 *
 * EVENT-FIELD DISCIPLINE: only documented fields are used — buffApply {stat,value,casterIdx,
 * targetIdx,targetSlug}, damage {srcSlot,fbMajorApplied}, kinds shot/damage/buffApply/reload/
 * burstCast/fullBurstStart. Self-granted buffs are isolated as casterIdx===targetIdx &&
 * targetSlug===SLUG (level-PROOF: no magnitude filter needed, so a non-max skill level cannot
 * false-RED these); boss-held debuffs as casterIdx===null && targetIdx===null per the harness note.
 * One assertion that WOULD need a frame field is expressed order-based instead (countBeforeFirstFb).
 */

type Ev = SimEvent & Record<string, any>;

const SLUG = 'marian-queen';
const SLOTS = ['skill1', 'skill2', 'burst'] as const;

// ---------- event helpers (documented fields only) ----------
const OWNER_KEYS = ['slug', 'unitSlug', 'srcSlug', 'ownerSlug', 'owner'];
function ownerOf(e: Ev): string | undefined {
  for (const k of OWNER_KEYS) if (typeof (e as any)[k] === 'string') return (e as any)[k] as string;
  return undefined;
}
// damage/shot events: keep hers. If the log carries no owner key at all we keep everything —
// every count assertion below is either a loose bound or a faithful-vs-patched comparison, where
// a constant teammate term cancels.
const mine = (e: Ev) => {
  const o = ownerOf(e);
  return o === undefined || o === SLUG;
};

const selfApplies = (evs: Ev[], stat: string) =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      e.targetSlug === SLUG &&
      e.casterIdx != null &&
      e.casterIdx === e.targetIdx,
  );
const bossDebuffs = (evs: Ev[], stat: string) =>
  evs.filter(
    (e) => e.kind === 'buffApply' && e.stat === stat && e.casterIdx == null && e.targetIdx == null,
  );
const slotDamage = (evs: Ev[], slot: string) =>
  evs.filter((e) => e.kind === 'damage' && e.srcSlot === slot && mine(e));
const shots = (evs: Ev[]) => evs.filter((e) => e.kind === 'shot' && mine(e)).length;
const fbStarts = (evs: Ev[]) => evs.filter((e) => e.kind === 'fullBurstStart').length;
// order-based, so no `frame` field is required
function countBeforeFirstFb(evs: Ev[], pred: (e: Ev) => boolean): number {
  const i = evs.findIndex((e) => e.kind === 'fullBurstStart');
  return (i < 0 ? evs : evs.slice(0, i)).filter(pred).length;
}
const teammates = (t: Record<string, number>) =>
  Object.fromEntries(Object.entries(t).filter(([s]) => s !== SLUG));
const teamSum = (t: Record<string, number>) =>
  Object.entries(t).reduce((a, [s, v]) => (s === SLUG ? a : a + v), 0);

// ---------- run / patch helpers ----------
function run(opts: any) {
  const events: Ev[] = [];
  const res = runComp({ ...opts, onEvent: (ev: SimEvent) => events.push(ev as Ev) });
  return { res, events, own: totals(res)[SLUG] ?? 0, all: totals(res) };
}
function withOv(cfg: any, ov: any) {
  return { ...cfg, overrides: { ...(cfg.overrides ?? {}), [SLUG]: ov } };
}
function blocksOf(ov: any): any[] {
  return SLOTS.flatMap((s) => (Array.isArray(ov[s]) ? (ov[s] as any[]) : []));
}
const effectsOf = (b: any): any[] => (Array.isArray(b.effects) ? b.effects : []);
// Patches are written SHAPE-FIRST (find by trigger.kind / effect.kind / effect.stat), never by
// index, because blind I do not know the driver's block order. `touched` is asserted > 0 in every
// test so no counterfactual can silently become a no-op (a vacuous GREEN).
function patch(mutate: (ov: any) => number) {
  let touched = 0;
  const ov = withPatchedOverride(SLUG, (o: any) => {
    touched = mutate(o);
  });
  return { ov, touched };
}
function dropEffects(ov: any, pred: (e: any) => boolean): number {
  let n = 0;
  for (const b of blocksOf(ov)) {
    b.effects = effectsOf(b).filter((e) => {
      const hit = pred(e);
      if (hit) n += 1;
      return !hit;
    });
  }
  return n;
}
const GATES = [
  'requiresSelfStatus',
  'requiresTargetStatus',
  'ownBurstGate',
  'fbGate',
  'everyN',
  'everyNOffset',
  'resourceGate',
  'swapGate',
  'requiresShielded',
  'mode',
  'teamHas',
  'formation',
  'delaySec',
];
function openGates(b: any): number {
  let n = 0;
  for (const g of GATES)
    if (b[g] !== undefined) {
      delete b[g];
      n += 1;
    }
  if (b.trigger && b.trigger.countScope === 'gated') {
    b.trigger.countScope = 'always';
    n += 1;
  }
  return n;
}

// ---------- hoisted runs ----------
const base = run(controlComp(SLUG, true));
const solo = run(controlComp(SLUG, false));

// P1 — delete the 'recurring interval -2 sec' buff
const pNoCdr = patch((ov) =>
  dropEffects(ov, (e) => e?.kind === 'buff' && e.stat === 'skillCooldownReductionSec'),
);
const rNoCdr = run(withOv(controlComp(SLUG, false), pNoCdr.ov));

// P2 — open every gate on the skill2 core-strike rider (10s window -> whole fight)
const pRiderOpen = patch((ov) => {
  let n = 0;
  for (const b of Array.isArray(ov.skill2) ? ov.skill2 : []) {
    if (effectsOf(b).some((e: any) => e?.kind === 'flatDamage')) n += openGates(b);
  }
  return n;
});
const rRiderOpen = run(withOv(controlComp(SLUG, false), pRiderOpen.ov));

// P3 — delete EVERY Open Wounds application (both sources)
const pNoOw = patch((ov) =>
  dropEffects(ov, (e) => e?.kind === 'buff' && e.stat === 'damageTakenPct'),
);
const rNoOw = run(withOv(controlComp(SLUG, false), pNoOw.ov));

// P4 — re-key the burst-CAST Open Wounds block to fullBurstEnter (the nearest-wrong trigger)
const pOwFb = patch((ov) => {
  let n = 0;
  for (const b of blocksOf(ov)) {
    if (
      b.trigger?.kind === 'burstCast' &&
      effectsOf(b).some((e: any) => e?.kind === 'buff' && e.stat === 'damageTakenPct')
    ) {
      b.trigger = { kind: 'fullBurstEnter' };
      n += 1;
    }
  }
  return n;
});
const rOwFb = run(withOv(controlComp(SLUG, false), pOwFb.ov));

// P5 — open the gates on the Sequential-Attack-Damage block so it fires on EVERY FB
const pSeqOpen = patch((ov) => {
  let n = 0;
  for (const b of blocksOf(ov))
    if (effectsOf(b).some((e: any) => e?.kind === 'buff' && e.stat === 'sequentialDamagePct'))
      n += openGates(b);
  return n;
});
const rSeqOpen = run(withOv(controlComp(SLUG, false), pSeqOpen.ov));

// P6 — delete the Core Damage buff
const pNoCoreBuff = patch((ov) =>
  dropEffects(ov, (e) => e?.kind === 'buff' && e.stat === 'coreDamagePct'),
);
const rNoCoreBuff = run(withOv(controlComp(SLUG, false), pNoCoreBuff.ov));

// P7 — delete the burst's 100%-ammo reload
const pNoReload = patch((ov) => dropEffects(ov, (e) => e?.kind === 'instantReload'));
const rNoReload = run(withOv(controlComp(SLUG, false), pNoReload.ov));

// P8 — strip core:true from the skill2 rider (nearest-wrong: a plain body-damage rider)
const pRiderBody = patch((ov) => {
  let n = 0;
  for (const b of blocksOf(ov))
    for (const e of effectsOf(b)) {
      if (e?.kind === 'flatDamage' && e.core === true) {
        e.core = false;
        n += 1;
      }
    }
  return n;
});
const rRiderBody = run(withOv(controlComp(SLUG, false), pRiderBody.ov));

describe('marian-queen S1 — Dark Matter spears + Open Wounds', () => {
  it('spear volleys land as skill1 function damage and recur all fight', () => {
    expect(unitOf(solo.res, SLUG).totalDamage).toBeGreaterThan(0);
    const volleys = slotDamage(solo.events, 'skill1');
    // 180s on a 4s interval (2s inside her burst windows) => dozens of fires. BOUNDS only: the
    // fold (one 878.57% instance vs seven 125.51% instances) is a blind flag, and it scales this
    // count by 7, so an exact pin here would be a guess.
    expect(volleys.length).toBeGreaterThanOrEqual(40);
    expect(volleys.length).toBeLessThanOrEqual(500);
  });

  it('Open Wounds is a BOSS debuff — deleting it costs the TEAM damage, not just hers', () => {
    expect(pNoOw.touched).toBeGreaterThanOrEqual(1);
    expect(bossDebuffs(solo.events, 'damageTakenPct').length).toBeGreaterThan(0);
    // inertness / nearest-wrong: it must NOT be a self buff on her
    expect(selfApplies(solo.events, 'damageTakenPct')).toHaveLength(0);
    expect(rNoOw.own).toBeLessThan(solo.own);
    // the discriminator against a self-scoped mis-encoding: teammates MUST lose damage too
    expect(teamSum(rNoOw.all)).toBeLessThan(teamSum(solo.all));
  });

  it('the second Open Wounds source is BURST CAST, not Full Burst entry', () => {
    // RED here means the block was already keyed to FB entry — the divergence this test exists for
    expect(pOwFb.touched).toBeGreaterThanOrEqual(1);
    const isOw = (e: Ev) =>
      e.kind === 'buffApply' &&
      e.stat === 'damageTakenPct' &&
      e.casterIdx == null &&
      e.targetIdx == null;
    // her cast completes the chain, so a burst-CAST application is logged BEFORE the first
    // fullBurstStart; the fullBurstEnter nearest-wrong moves it after (and over-fires on helm's
    // Full Bursts in any 2×B3 comp). Order-based, so no frame field is needed.
    expect(countBeforeFirstFb(solo.events, isOw)).toBeGreaterThan(
      countBeforeFirstFb(rOwFb.events, isOw),
    );
  });

  it.skip('FLAG: volley fold (1×878.57 vs 7×125.51), Open-Wounds stacks-per-volley and its stack CEILING, plus the interval phase (first fire t=4s vs t=0) are all unobservable blind. The kit states no cap, and the fold decides how many times the per-hit rider can fire (1 vs 7) — uncapped 5.05% × 7 × ~55 volleys is +1900% Damage Taken, which cannot be right. Recipe: popup-read a focus recording for the per-volley stack gain and watch the debuff icon for a cap.', () => {});
});

describe('marian-queen S2 — the Penetrant Wish window', () => {
  it('core rider recurs every 2 normal attacks and is confined to the 10s window', () => {
    expect(pRiderOpen.touched).toBeGreaterThanOrEqual(1); // RED = the window was never gated
    const procs = slotDamage(solo.events, 'skill2').length;
    expect(procs).toBeGreaterThanOrEqual(20); // recurring, not once-per-window
    expect(procs).toBeLessThanOrEqual(shots(solo.events) / 2 + 12); // at most 1 per 2 rounds
    // non-vacuity of the gate (both cases exercised): ungated it fires across all 180s instead of
    // the <=~50s her windows cover
    expect(slotDamage(rRiderOpen.events, 'skill2').length).toBeGreaterThan(procs * 1.8);
  });

  it('the rider is CORE STRIKE damage', () => {
    expect(pRiderBody.touched).toBeGreaterThanOrEqual(1); // RED = core:true never authored
    expect(rRiderBody.own).toBeLessThan(solo.own);
    expect(teammates(rRiderBody.all)).toEqual(teammates(solo.all)); // her own hit only
  });

  it('the interval -2 sec line genuinely accelerates S1', () => {
    expect(pNoCdr.touched).toBeGreaterThanOrEqual(1);
    const withCdr = slotDamage(solo.events, 'skill1').length;
    const without = slotDamage(rNoCdr.events, 'skill1').length;
    // 4s -> 2s over a 10s window is +2.5 fires per burst, and 180s guarantees 3+ bursts
    expect(withCdr).toBeGreaterThanOrEqual(without + 3);
    expect(solo.own).toBeGreaterThan(rNoCdr.own);
  });

  it.skip("FLAG: 'all enemies in the Open Wounds state' is scope-trivial in every fixture — the boss carries Open Wounds from the first volley (t~4s) and again from her own burst cast, so a requiresTargetStatus gate on the rider is unobservable. Authoring it is harmless and more faithful; its absence is not detectable here.", () => {});
});

describe('marian-queen S2 — the two FB-entry branches', () => {
  it('exactly ONE branch fires per Full Burst', () => {
    const seq = selfApplies(base.events, 'sequentialDamagePct').length;
    const core = selfApplies(base.events, 'coreDamagePct').length;
    const fbs = fbStarts(base.events);
    expect(fbs).toBeGreaterThanOrEqual(3);
    // nearest-wrong (no own-burst gate) fires both every FB => 2×fbs; keying both to burstCast
    // instead => fewer than fbs
    expect(seq + core).toBe(fbs);
  });

  it('solo (she is the only B3): core branch every FB, sequential branch never', () => {
    expect(selfApplies(solo.events, 'coreDamagePct').length).toBe(fbStarts(solo.events));
    expect(selfApplies(solo.events, 'sequentialDamagePct')).toHaveLength(0);
  });

  it('the Sequential buff is wired to real sequential-flavored damage', () => {
    expect(pSeqOpen.touched).toBeGreaterThanOrEqual(1); // RED = the block carries no gate at all
    // Ungated it fires at every FB. Her ONLY sequential-flavored damage is the 7-spear volley
    // ('Attacks sequentially 7 times'), so damage MUST rise. No rise => either the spears were not
    // flavored 'sequential' or the stat is mis-chosen, and the 85.17% buff is 100% inert — the
    // whole-picture cross-check between S1's volley and S2's buff.
    expect(rSeqOpen.own).toBeGreaterThan(solo.own);
    expect(teammates(rSeqOpen.all)).toEqual(teammates(solo.all)); // self-scoped: teammates frozen
  });

  it('the Core Damage buff moves damage and is self-scoped', () => {
    expect(pNoCoreBuff.touched).toBeGreaterThanOrEqual(1);
    expect(rNoCoreBuff.own).toBeLessThan(solo.own);
    expect(teammates(rNoCoreBuff.all)).toEqual(teammates(solo.all));
  });
});

describe('marian-queen burst', () => {
  it('self ATK / Attack Damage: raw percentages, once per own burst', () => {
    const atk = selfApplies(solo.events, 'atkPct');
    const adm = selfApplies(solo.events, 'attackDamagePct');
    const fbs = fbStarts(solo.events);
    expect(atk.length).toBeGreaterThanOrEqual(3);
    // sole B3: one cast per rotation, so one application per Full Burst (+1 if a late cast's FB
    // is clipped by the 180s horizon)
    expect(atk.length).toBeGreaterThanOrEqual(fbs);
    expect(atk.length).toBeLessThanOrEqual(fbs + 1);
    expect(adm.length).toBe(atk.length); // same block, same cast
    // atkPct keeps its RAW percentage; a casterAtkPct mis-encoding would emit FLAT ATK (1e3-1e5)
    for (const e of atk) expect(Number(e.value)).toBeLessThan(1000);
  });

  it('burst nuke: burst-slot instances, Full-Burst-major exempt', () => {
    const nukes = slotDamage(solo.events, 'burst');
    const casts = selfApplies(solo.events, 'atkPct').length;
    expect(nukes.length).toBeGreaterThanOrEqual(3);
    expect(nukes.length).toBeLessThanOrEqual(casts); // one 1346.4% instance per cast, at most
    // a burst cast lands before the FB window opens, so burst damage is always FB-exempt
    for (const e of nukes) expect(e.fbMajorApplied).toBeFalsy();
  });

  it('the 100%-ammo reload is modeled — removing it costs rounds fired', () => {
    expect(pNoReload.touched).toBeGreaterThanOrEqual(1);
    // 300-round belt / 171-frame reload: a free refill mid-belt removes reload downtime, so she
    // fires strictly more rounds. CADENCE-SENSITIVE: if every burst happened to land on a full
    // belt this would tie — the one assertion here most likely to be a soft RED.
    expect(shots(solo.events)).toBeGreaterThan(shots(rNoReload.events));
  });

  it('MG Ramp-Up Speed is not fudged as a 1:1 +100 fire-rate / attack-speed buff', () => {
    const fudge = solo.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        (e.stat === 'fireRatePct' || e.stat === 'attackSpeedPct') &&
        e.targetSlug === SLUG &&
        Math.abs(Number(e.value) - 100) < 0.01,
    );
    // Transcribing 'Ramp-Up Speed +100%' as fire rate +100% doubles her cadence for 10s — a
    // different mechanic (spin-up time, not the rate cap) and a large invented gain. A MEASURED
    // haircut proxy passes this; only the literal 1:1 fudge fails.
    expect(fudge).toHaveLength(0);
  });

  it.skip("FLAG: 'Machine Gun Ramp-Up Speed +100%' has NO schema primitive — there is no MG spin-up stat, and fireRatePct / attackSpeedPct are a different mechanic. Belongs in unmodeled with a recipe: MG focus recording, time-to-max-RPM with and without her burst window, then model as the spin-up curve (or a measured fireRatePct equivalent over the ramp only).", () => {});

  it.skip("FLAG: burstDesc:'allEnemies' on the 1346.4% nuke (its clause is 'Affects all enemies') is unobservable without a burstSkillAoeDamagePct carrier (jackal / trina) in the fixture; authorable and recommended, but untestable in controlComp.", () => {});
});
