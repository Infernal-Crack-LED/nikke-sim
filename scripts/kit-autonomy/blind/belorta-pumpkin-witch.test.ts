/**
 * belorta-pumpkin-witch - RL/Water/Supporter/Burst II (cd 40s, ammo 6, chargeFrames 60).
 * A PURE buffer: every kit line is a buff / enemy debuff / self state. No damage effect anywhere,
 * so almost every claim here is STRUCTURAL and is read off the event log, not off totals.
 *
 * WHAT THE KIT SAYS (short quotes only)
 *   skill1 [header] on entering Full Burst, affects self:
 *      - Ghost Costume: untargetable 10 sec, plus 'removed upon taking a direct hit'
 *      - Prank Preparation: 'Max HP 15.84% for 10 sec'
 *   skill1 [header] on entering Full Burst, affects the ally to the RIGHT:
 *      - 'ATK 44.88% of the skill user ATK' for 10 sec
 *   skill2 [header] on a Full Charge attack WHILE in the Ghost Costume state, affects the target:
 *      - Ghostly Prank: 'Damage Taken 10.56% for 10 sec'
 *   skill2 [header] on a Full Charge attack, affects the ally to the RIGHT:
 *      - 'Sustained Damage 19.97% for 5 sec'
 *   burst [header] affects the ally to the RIGHT:
 *      - 'ATK 47.52% of the skill user ATK' for 10 sec
 *      - 'Sustained Damage 27.23% for 10 sec'
 *
 * FIXTURE - controlComp(SLUG, true): liter(0) / crown(1) / owner(2) / helm(3), boss Fire.
 *   The fixed B3 slot is REQUIRED here for two independent reasons:
 *     (a) a burst chain needs B1+B2+B3 for any Full Burst to happen at all, and
 *     (b) at slot 2 the owner HAS a right-hand neighbour (the fixed B3). With that slot empty she
 *         is the rightmost unit, every adjacentAlly{side:'right'} block targets NOBODY, and five
 *         of the six kit lines become vacuously inert - the fixture would test nothing.
 *   FLAG - FIXTURE RISK, tested rather than assumed: the owner is Burst II and so is the fixed B2,
 *   so Burst Stage 2 is CONTESTED. If the engine awards stage 2 to the other B2 by slot order, the
 *   owner never casts and her burst slot is unobservable in this comp. The non-vacuity test in the
 *   burst group asserts that explicitly: a RED there is a FIXTURE finding (re-fixture with an
 *   uncontested stage 2), NOT an override defect, and the burstFirst probe test localizes it.
 *
 * WHY EACH ASSERTION DISCRIMINATES (nearest-wrong model built with withPatchedOverride)
 *   trigger identity - skill1 keys on 'entering Full Burst' = fullBurstEnter (ANY team Full Burst),
 *                      not burstCast: base apply-count === fullBurstStart count. Re-keyed to
 *                      burstCast the grant either disappears (she loses the contested stage) or
 *                      lands STRICTLY EARLIER, because a cast precedes the window it opens.
 *   target set       - adjacentAlly right, not allies/self: the target-slug SET is exactly one slug,
 *                      is not the owner and not either left-hand ally. Patched to allies the set
 *                      blows up and includes the owner.
 *   duration         - same-frame buff pairs must share expiresFrame (10s == 10s, frame-rate free).
 *                      The lone 5s line is read against an INERT 10s buff co-applied on the SAME
 *                      full-charge frame, so only the 300-frame DIFFERENCE is ever asserted.
 *   the Ghost state  - Ghostly Prank is gated on being in the Ghost Costume state, so it must fire
 *                      on only SOME full-charge pulls (both the active and the inactive case are
 *                      therefore exercised: strictly fewer debuff applies than ally-sustained
 *                      applies). Deleting the selfStatus effect must silence it ENTIRELY; deleting
 *                      the gates must make it fire on EVERY pull. An fbGate proxy, or an ungated
 *                      block, fails exactly one of those two.
 *   enemy vs self    - Damage Taken is a BOSS debuff that lifts the WHOLE team (taxonomy #4):
 *                      removing it must drop teammates' totals, not just the owner's.
 *   inertness        - the self Max HP grant has no consumer in this kit (she carries no
 *                      atkOfMaxHpPct), so removing it must leave ALL totals byte-identical;
 *                      removing an ally-right grant must move ONLY that one ally.
 *
 * CASTER-SCALED MAGNITUDES: casterAtkPct re-emits FLAT ((kit%/100) x caster.staticAtk), so the two
 * ATK lines are pinned by their RATIO 47.52/44.88 - exact, and independent of her ATK sheet.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'belorta-pumpkin-witch';
// control fixture slot order: liter(0) / crown(1) / carry(2) / helm(3)
const RIGHT = 'helm';
const LEFTS = ['liter', 'crown'];
// Engine frame rate. Used ONLY on a difference between two buffs applied on the same frame, so an
// absolute-timing mistake cannot smear into any assertion below.
const FPS = 60;

type Ev = any;
type Run = { res: ReturnType<typeof runComp>; evs: SimEvent[] };

const near = (a: number, b: number, tol = 0.01) => Math.abs(a - b) < tol;
const sum = (t: Record<string, number>) =>
  Object.values(t).reduce((acc, v) => acc + v, 0);

function runWith(patched?: unknown): Run {
  const opts = controlComp(SLUG, true) as any;
  if (patched) opts.overrides = { ...(opts.overrides ?? {}), [SLUG]: patched };
  const evs: SimEvent[] = [];
  opts.onEvent = (ev: SimEvent) => {
    evs.push(ev);
  };
  return { res: runComp(opts), evs };
}

function of(r: Run, kind: string): Ev[] {
  return (r.evs as Ev[]).filter((e) => e.kind === kind);
}

/**
 * A slot of the committed override is a Block[]; a { blocks: Block[] } wrapper is accepted too.
 * Anything else THROWS - a shape drift must be a loud failure, never a patch that silently mutates
 * nothing (which would make every counterfactual below green by accident).
 */
function blocksOf(ov: any, slot: 'skill1' | 'skill2' | 'burst'): Ev[] {
  const s = ov?.[slot];
  if (Array.isArray(s)) return s;
  if (s && Array.isArray(s.blocks)) return s.blocks;
  throw new Error(`[${SLUG}] override slot ${slot} is neither Block[] nor { blocks: Block[] }`);
}

function carries(b: Ev, stat: string): boolean {
  return (b.effects ?? []).some((e: Ev) => e.kind === 'buff' && e.stat === stat);
}

function dropEffects(
  ov: any,
  slot: 'skill1' | 'skill2' | 'burst',
  pred: (e: Ev) => boolean,
): number {
  let n = 0;
  for (const b of blocksOf(ov, slot)) {
    const before = (b.effects ?? []).length;
    b.effects = (b.effects ?? []).filter((e: Ev) => !pred(e));
    n += before - b.effects.length;
  }
  return n;
}

// ---------------------------------------------------------------------------
// counterfactual overrides (in-memory clones; committed JSON untouched). Each patch records how
// many edits it actually made, and every test asserts that count > 0 first - a no-op patch would
// otherwise prove nothing.
// ---------------------------------------------------------------------------
let nS1Atk = 0;
const pNoS1Atk = withPatchedOverride(SLUG, (ov: any) => {
  nS1Atk = dropEffects(ov, 'skill1', (e) => e.kind === 'buff' && e.stat === 'casterAtkPct');
});

let nSelfHp = 0;
const pNoSelfHp = withPatchedOverride(SLUG, (ov: any) => {
  nSelfHp = dropEffects(
    ov,
    'skill1',
    (e) => e.kind === 'buff' && /maxhp/i.test(String(e.stat)),
  );
});

let nReKey = 0;
const pS1OnBurstCast = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of blocksOf(ov, 'skill1')) {
    if (b.trigger?.kind === 'fullBurstEnter') {
      b.trigger = { kind: 'burstCast' };
      nReKey++;
    }
  }
});

let nWiden = 0;
const pS1AtkToAllies = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of blocksOf(ov, 'skill1')) {
    if (carries(b, 'casterAtkPct')) {
      b.target = { kind: 'allies' };
      nWiden++;
    }
  }
});

let nGates = 0;
const pNoGhostGate = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of blocksOf(ov, 'skill2')) {
    if (!carries(b, 'damageTakenPct')) continue;
    for (const g of ['requiresSelfStatus', 'requiresTargetStatus', 'fbGate', 'requiresCore']) {
      if (b[g] !== undefined) {
        delete b[g];
        nGates++;
      }
    }
  }
});

let nStatus = 0;
const pNoGhostStatus = withPatchedOverride(SLUG, (ov: any) => {
  nStatus = dropEffects(ov, 'skill1', (e) => e.kind === 'selfStatus');
});

let nDT = 0;
const pNoDamageTaken = withPatchedOverride(SLUG, (ov: any) => {
  nDT = dropEffects(ov, 'skill2', (e) => e.kind === 'buff' && e.stat === 'damageTakenPct');
});

let nSustReKey = 0;
const pSustOnFbEnter = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of blocksOf(ov, 'skill2')) {
    if (carries(b, 'sustainedDamagePct')) {
      b.trigger = { kind: 'fullBurstEnter' };
      nSustReKey++;
    }
  }
});

// A 10s buff on a stat that is parsed-but-inert at scope (no parts on the boss), co-applied by the
// SAME block as the 5s sustained line, so the two share an apply frame and their expiresFrame
// difference IS the 5s window - with no need for an absolute apply frame.
let nCoapply = 0;
const pCoapply10s = withPatchedOverride(SLUG, (ov: any) => {
  for (const b of blocksOf(ov, 'skill2')) {
    if (!carries(b, 'sustainedDamagePct')) continue;
    b.effects.push({ kind: 'buff', stat: 'partsDamagePct', value: 1, durationSec: 10 });
    nCoapply++;
  }
});

let nBurstBlocks = 0;
const pNoBurst = withPatchedOverride(SLUG, (ov: any) => {
  const arr = blocksOf(ov, 'burst');
  nBurstBlocks = arr.length;
  arr.splice(0, arr.length);
});

// Fixture probe only: lets the owner take the first eligible burst of her stage regardless of slot
// order, so her burst slot is observable even if the other Burst II unit otherwise wins stage 2.
const pBurstFirst = withPatchedOverride(SLUG, (ov: any) => {
  blocksOf(ov, 'skill1').push({
    slot: 'skill1',
    trigger: { kind: 'battleStart' },
    target: { kind: 'self' },
    effects: [{ kind: 'burstFirst' }],
  });
});

// --------------------------- hoisted runs (12 x 180s) ----------------------
const base = runWith();
const rNoS1Atk = runWith(pNoS1Atk);
const rNoSelfHp = runWith(pNoSelfHp);
const rS1OnBurstCast = runWith(pS1OnBurstCast);
const rS1AtkToAllies = runWith(pS1AtkToAllies);
const rNoGhostGate = runWith(pNoGhostGate);
const rNoGhostStatus = runWith(pNoGhostStatus);
const rNoDamageTaken = runWith(pNoDamageTaken);
const rSustOnFbEnter = runWith(pSustOnFbEnter);
const rCoapply10s = runWith(pCoapply10s);
const rNoBurst = runWith(pNoBurst);
const rBurstFirst = runWith(pBurstFirst);

const fbStarts = of(base, 'fullBurstStart').length;

// The owner index is DERIVED, not hardcoded: her own Max HP line is a self-grant, the only buff in
// this comp with casterIdx === targetIdx on her slug. -1 if absent, reported by the sanity test
// rather than thrown at module scope (a throw there would fail every test and localize nothing).
const OWNER_IDX: number = (() => {
  const self = of(base, 'buffApply').filter(
    (b) =>
      b.targetSlug === SLUG &&
      b.casterIdx !== null &&
      b.casterIdx === b.targetIdx &&
      /maxhp/i.test(String(b.stat)),
  );
  return self.length ? (self[0].casterIdx as number) : -1;
})();

function ownerBuffs(r: Run, stat: string): Ev[] {
  return of(r, 'buffApply').filter((b) => b.casterIdx === OWNER_IDX && b.stat === stat);
}

function selfHp(r: Run): Ev[] {
  return of(r, 'buffApply').filter(
    (b) =>
      b.targetSlug === SLUG && b.casterIdx === OWNER_IDX && /maxhp/i.test(String(b.stat)),
  );
}

// A boss-held debuff emits casterIdx === null AND targetIdx === null, so it is filtered by stat and
// then its VALUE is asserted (a value-filter would hide a magnitude error instead of failing on it).
function bossDT(r: Run): Ev[] {
  return of(r, 'buffApply').filter(
    (b) => b.stat === 'damageTakenPct' && b.casterIdx === null && b.targetIdx === null,
  );
}

// Her two caster-scaled ATK lines resolve to two distinct FLAT magnitudes; split them by value.
const atkAll = ownerBuffs(base, 'casterAtkPct');
const atkVals = [...new Set(atkAll.map((b) => b.value as number))].sort((a, b) => a - b);
const S1_ATK_V = atkVals[0];
const BURST_ATK_V = atkVals[atkVals.length - 1];
const s1Atk = atkAll.filter((b) => near(b.value, S1_ATK_V));
const burstAtk = atkVals.length > 1 ? atkAll.filter((b) => near(b.value, BURST_ATK_V)) : [];

// Sustained Damage is a plain percentage stat, so the raw kit magnitudes survive to the event.
const sustAll = ownerBuffs(base, 'sustainedDamagePct');
const sust5 = sustAll.filter((b) => near(b.value, 19.97));
const sust10 = sustAll.filter((b) => near(b.value, 27.23));

describe('belorta-pumpkin-witch - fixture sanity', () => {
  it('resolves the owner index, a right-hand neighbour that deals damage, and real Full Bursts', () => {
    expect(OWNER_IDX).toBeGreaterThanOrEqual(0);
    expect(fbStarts).toBeGreaterThan(0);
    // both are preconditions for the totals-level inertness tests below to mean anything
    expect(unitOf(base.res, SLUG).totalDamage).toBeGreaterThan(0);
    expect(unitOf(base.res, RIGHT).totalDamage).toBeGreaterThan(0);
  });
});

describe('belorta-pumpkin-witch - skill1 (Full Burst entry: self state + self Max HP + ally ATK)', () => {
  it('Prank Preparation: one flat-resolved self Max HP grant per Full Burst entry, 10 sec', () => {
    expect(nSelfHp).toBeGreaterThan(0);
    const hp = selfHp(base);
    expect(hp.length).toBe(fbStarts);
    for (const b of hp) {
      // caster/targetMaxHpPct re-emit as FLAT HP; asserting the raw 15.84 here would be the
      // classic percentage-vs-flat blind error
      expect(b.stat).toBe('maxHpFlat');
      expect(b.value).toBeGreaterThan(100);
      expect(b.targetSlug).toBe(SLUG);
    }
    // 10s == 10s, frame-rate free: the self grant and the ally ATK grant ride the SAME
    // fullBurstEnter frame, so equal durations imply identical expiresFrame. RED if either line
    // were authored at 5s/15s, or if one were keyed to a different trigger.
    expect(s1Atk.length).toBe(hp.length);
    for (let i = 0; i < hp.length; i++) {
      expect(hp[i].expiresFrame).toBe(s1Atk[i].expiresFrame);
    }
  });

  it('the self Max HP grant moves no damage at scope - it is kept for a future HP scaler', () => {
    expect(nSelfHp).toBeGreaterThan(0);
    // she carries no atkOfMaxHpPct and ally-granted Max HP feeds nobody, so this must be a strict
    // no-op on every unit. RED would mean the grant leaked into an ATK path it should not feed.
    expect(totals(rNoSelfHp.res)).toEqual(totals(base.res));
  });

  it('skill1 ATK 44.88% of caster ATK lands on exactly ONE ally - the right-hand neighbour', () => {
    expect(s1Atk.length).toBeGreaterThan(0);
    const set = new Set(s1Atk.map((b) => b.targetSlug));
    expect(set.size).toBe(1);
    expect(set.has(SLUG)).toBe(false);
    for (const l of LEFTS) expect(set.has(l)).toBe(false);
    expect([...set][0]).toBe(RIGHT);
    for (const b of s1Atk) {
      expect(b.value).toBeGreaterThan(100);
      expect(near(b.value, 44.88)).toBe(false);
    }
    // nearest-wrong target set: allies. Under it the set is wider AND includes the owner.
    expect(nWiden).toBeGreaterThan(0);
    const wide = ownerBuffs(rS1AtkToAllies, 'casterAtkPct').filter((b) => near(b.value, S1_ATK_V));
    const wideSet = new Set(wide.map((b) => b.targetSlug));
    expect(wideSet.size).toBeGreaterThan(1);
    expect(wideSet.has(SLUG)).toBe(true);
  });

  it('skill1 fires on ANY team Full Burst entry, not on a burst cast by the owner', () => {
    expect(s1Atk.length).toBe(fbStarts);
    expect(nReKey).toBeGreaterThan(0);
    const re = ownerBuffs(rS1OnBurstCast, 'casterAtkPct').filter((b) => near(b.value, S1_ATK_V));
    // burst-cast keying can only ever fire on rotations this unit casts, and it fires BEFORE the
    // window it opens - so either the count drops or the first grant lands strictly earlier.
    expect(re.length).toBeLessThanOrEqual(s1Atk.length);
    if (re.length > 0) {
      expect(re[0].expiresFrame).toBeLessThan(s1Atk[0].expiresFrame);
    }
  });

  it('skill1 ally ATK moves ONLY the right-hand ally (teammates byte-identical)', () => {
    expect(nS1Atk).toBeGreaterThan(0);
    const b = totals(base.res);
    const p = totals(rNoS1Atk.res);
    expect(p[RIGHT]).toBeLessThan(b[RIGHT]);
    expect(p[SLUG]).toBe(b[SLUG]);
    for (const l of LEFTS) expect(p[l]).toBe(b[l]);
  });
});

describe('belorta-pumpkin-witch - skill2 (full charge: Ghost-gated boss debuff + ally sustained)', () => {
  it('Ghostly Prank Damage Taken is GATED on the Ghost Costume state', () => {
    const dt = bossDT(base);
    expect(dt.length).toBeGreaterThan(0); // the ACTIVE case is exercised
    for (const b of dt) expect(b.value).toBeCloseTo(10.56, 2);
    // ...and so is the INACTIVE case: the ungated ally-sustained line rides the same full-charge
    // trigger, so strictly more applies there means some pulls happened outside the Ghost window.
    expect(sust5.length).toBeGreaterThan(0);
    expect(dt.length).toBeLessThan(sust5.length);
    // the STATE is load-bearing: delete the selfStatus and the debuff must vanish entirely.
    // An fbGate/requiresTargetStatus proxy, or no gate at all, fails this.
    expect(nStatus).toBeGreaterThan(0);
    expect(bossDT(rNoGhostStatus).length).toBe(0);
    // and with every gate stripped it must fire on EVERY full charge - i.e. exactly as often as
    // the ungated sustained line WITHIN THAT SAME RUN (same trigger, same refresh semantics, so
    // the comparison is immune to how the engine emits refreshes)
    expect(nGates).toBeGreaterThan(0);
    const ungated = bossDT(rNoGhostGate).length;
    const ungatedSust = ownerBuffs(rNoGhostGate, 'sustainedDamagePct').filter((b) =>
      near(b.value, 19.97),
    ).length;
    expect(ungated).toBe(ungatedSust);
    expect(ungated).toBeGreaterThan(dt.length);
  });

  it('Damage Taken is an ENEMY debuff - removing it drops the WHOLE team, not just the owner', () => {
    expect(nDT).toBeGreaterThan(0);
    const b = totals(base.res);
    const p = totals(rNoDamageTaken.res);
    expect(sum(p)).toBeLessThan(sum(b));
    expect(p[RIGHT]).toBeLessThan(b[RIGHT]);
    expect(p[SLUG]).toBeLessThan(b[SLUG]);
    // nearest-wrong: modeled as a self buff (or on an ally target), which would leave every
    // teammate untouched
    for (const l of LEFTS) if (b[l] > 0) expect(p[l]).toBeLessThan(b[l]);
  });

  it('skill2 Sustained 19.97% - right ally, every full charge, NOT Ghost-gated', () => {
    // a clean partition proves neither magnitude drifted into the other
    expect(sust5.length + sust10.length).toBe(sustAll.length);
    expect(new Set(sust5.map((b) => b.targetSlug))).toEqual(new Set([RIGHT]));
    // per-pull cadence, not per-Full-Burst: far more applies than there are Full Bursts
    expect(sust5.length).toBeGreaterThan(fbStarts * 2);
    // it fires on pulls the Ghost-gated debuff does NOT - the gate did not leak onto this line
    expect(sust5.length).toBeGreaterThan(bossDT(base).length);
    // nearest-wrong trigger: fullBurstEnter collapses the count to one per Full Burst
    expect(nSustReKey).toBeGreaterThan(0);
    const fb = ownerBuffs(rSustOnFbEnter, 'sustainedDamagePct').filter((b) => near(b.value, 19.97));
    expect(fb.length).toBe(fbStarts);
    expect(sust5.length).toBeGreaterThan(fb.length);
  });

  it('skill2 Sustained window is 5 sec - half of every 10 sec line in the kit', () => {
    // exactly one skill2 block carries the line (RED here would mean it was split across blocks)
    expect(nCoapply).toBe(1);
    const five = ownerBuffs(rCoapply10s, 'sustainedDamagePct').filter((b) => near(b.value, 19.97));
    const ten = ownerBuffs(rCoapply10s, 'partsDamagePct');
    expect(five.length).toBeGreaterThan(0);
    expect(ten.length).toBe(five.length);
    for (let i = 0; i < five.length; i++) {
      // same block, same apply frame: only the DIFFERENCE is asserted, so no absolute apply frame
      // and no absolute-timing assumption is needed. 10s - 5s = 300 frames.
      expect(ten[i].expiresFrame - five[i].expiresFrame).toBeCloseTo(5 * FPS, 0);
    }
    // and the probe buff is itself damage-inert, so the duration reading perturbs nothing
    expect(totals(rCoapply10s.res)).toEqual(totals(base.res));
  });
});

describe('belorta-pumpkin-witch - burst (ally to the right: ATK + Sustained, both 10 sec)', () => {
  it('NON-VACUITY: the owner actually wins Burst Stage 2 in the control fixture', () => {
    // RED HERE IS A FIXTURE FINDING, NOT AN OVERRIDE DEFECT: she is Burst II and so is the fixed
    // B2 in controlComp, so stage 2 is contested. If she never casts, her burst slot is simply
    // unobservable in this comp and the orchestrator must re-fixture with an uncontested stage 2;
    // the burstFirst probe below says whether the burst BLOCKS themselves are correct.
    expect(atkVals.length).toBe(2); // the 44.88% and 47.52% flat magnitudes both present
    expect(burstAtk.length).toBeGreaterThan(0);
    expect(sust10.length).toBeGreaterThan(0);
  });

  it('burst grants ATK 47.52% of caster ATK and Sustained 27.23% to the right ally for 10 sec', () => {
    expect(new Set(burstAtk.map((b) => b.targetSlug))).toEqual(new Set([RIGHT]));
    expect(new Set(sust10.map((b) => b.targetSlug))).toEqual(new Set([RIGHT]));
    expect(sust10.length).toBe(burstAtk.length);
    for (const b of sust10) expect(b.value).toBeCloseTo(27.23, 2);
    // magnitude pin for the caster-scaled pair with no knowledge of her ATK sheet: casterAtkPct
    // resolves against STATIC ATK, so the ratio of the two flat values is exactly 47.52/44.88.
    // RED if either line were authored at the other line magnitude, or as a plain atkPct.
    expect(BURST_ATK_V / S1_ATK_V).toBeCloseTo(47.52 / 44.88, 4);
    // both lines are 10 sec and ride the SAME cast frame -> identical expiresFrame (frame-rate free)
    for (let i = 0; i < burstAtk.length; i++) {
      expect(sust10[i].expiresFrame).toBe(burstAtk[i].expiresFrame);
    }
  });

  it('burst grants move ONLY the right-hand ally (teammates byte-identical)', () => {
    expect(nBurstBlocks).toBeGreaterThan(0);
    const b = totals(base.res);
    const p = totals(rNoBurst.res);
    expect(p[RIGHT]).toBeLessThan(b[RIGHT]);
    expect(p[SLUG]).toBe(b[SLUG]);
    for (const l of LEFTS) expect(p[l]).toBe(b[l]);
    expect(
      ownerBuffs(rNoBurst, 'casterAtkPct').filter((x) => !near(x.value, S1_ATK_V)).length,
    ).toBe(0);
  });

  it('FIXTURE PROBE: forcing the owner to take stage 2 first leaves the grant SHAPE unchanged', () => {
    const atk = ownerBuffs(rBurstFirst, 'casterAtkPct').filter((b) => !near(b.value, S1_ATK_V));
    const sus = ownerBuffs(rBurstFirst, 'sustainedDamagePct').filter((b) => near(b.value, 27.23));
    expect(atk.length).toBeGreaterThanOrEqual(burstAtk.length);
    expect(sus.length).toBe(atk.length);
    if (atk.length > 0) {
      expect(new Set(atk.map((b) => b.targetSlug))).toEqual(new Set([RIGHT]));
    }
  });
});

describe('belorta-pumpkin-witch - GAPS (unobservable at this scope)', () => {
  it.skip('GAP: Ghost Costume untargetable payload - the v1 boss deals no damage, so single-target immunity has no observable consequence. Only the STATE is modeled, because skill2 gates on it.', () => {});

  it.skip('GAP: removed upon taking a direct hit - nothing damages the team at scope, so the 10 sec Ghost window NEVER breaks early. Ghostly Prank uptime is therefore an UPPER BOUND (flag for the driver).', () => {});

  it.skip('GAP: targetMaxHpPct vs casterMaxHpPct is unobservable for a self-only Max HP line (caster === target, both re-emit the same maxHpFlat). The Max HP 15.84% wording matches the target-own-Max-HP family.', () => {});

  it.skip('GAP: LANDING a Full Charge attack vs PERFORMING one - the engine fires fullCharge at RELEASE, so the RL projectile flight time before the Ghost-gated debuff applies is unmodeled (a few frames early, and a missed shot would still proc).', () => {});
});
