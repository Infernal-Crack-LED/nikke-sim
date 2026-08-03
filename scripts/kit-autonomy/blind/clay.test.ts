/**
 * clay (Clay) — SMG / Electric / Supporter / Burst II — BLIND kit spec test.
 *
 * Written from the kit prose alone: no sight of the shipped override, the driver tests, or any
 * truth file. Every counterfactual below is STRUCTURE-AGNOSTIC (it locates effects by stat /
 * trigger kind / flag name, never by a hard-coded block index), so it discriminates the kit
 * reading rather than one particular authoring layout.
 *
 * WHAT THE KIT SAYS (structural read of the prose):
 *   skill1 ■ trigger: 60 normal attacks during Full Burst — affects all allies
 *          - Victorious Battle Cry: True Damage ▲ 6.45%, up to 3 stacks, 6 sec
 *          - an enemy-PROJECTILE damage rider (45.05%, 6 sec)
 *   skill2 ■ when entering Burst Stage 1 — all allies: debuff immunity, 10 sec (defensive)
 *          ■ only while in Victorious Battle Cry — all allies:
 *            ATK ▲ 20.07% of the skill user ATK, continuously
 *   burst  ■ all allies: True Damage ▲ 12.56% for 10 sec
 *          ■ self: normal attacks deal true damage for 10 sec
 *
 * FIXTURE: controlComp('clay', true) — clay is Burst II, so the fixed B3 slot is REQUIRED for the
 * chain to complete; with no B3 the team makes ZERO Full Bursts and every skill-1 assertion here
 * (all Full-Burst gated) would be vacuous. Deterministic, no seed. 6 hoisted 180s runs.
 *
 * NEAREST-WRONG MODELS THIS FILE MUST GO RED UNDER:
 *   W1 skill1 keyed to fullBurstEnter instead of hitCount-60 + fbGate inFb — it would then apply
 *      exactly once per Full Burst, at FB entry, before any damage lands in that window.
 *   W2 skill1 not Full-Burst gated at all — Victorious Battle Cry live for the whole fight.
 *   W3 the 20.07% ATK line as an unconditional passive rather than tied to the VBC window.
 *   W4 the ATK line stacking 3x alongside VBC stacks — the prose gates it on BEING in the status,
 *      not on the stack count, so it is a single presence-gated grant.
 *   W5 the ATK line encoded as atkPct (scales each ally own ATK) instead of casterAtkPct
 *      (of the skill user ATK — a flat add resolved off CLAY ATK at apply time).
 *   W6 the burst self line dropped, so clay normals never become true-flavored and the whole
 *      true-damage stack she grants has no carrier on her own damage.
 *   W7 either true-damage line scoped to self instead of all allies.
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

const SLUG = 'clay';

/** Kit-literal magnitudes (authored values, as they appear in the prose). */
const VBC_TRUE = 6.45;
const BURST_TRUE = 12.56;
const VBC_ATK = 20.07;

type CompOpts = Parameters<typeof runComp>[0];

/** Documented buffApply payload (harness API block) — narrowed locally so the test does not
 *  depend on the exact SimEvent union member name. */
interface BuffApplyEv {
  stat: string;
  key: string;
  value: number;
  stacks?: number;
  maxStacks?: number;
  casterIdx: number | null;
  targetIdx: number | null;
  targetSlug: string;
  refresh?: boolean;
  expiresFrame?: number;
  durationShots?: number;
}

interface Tagged {
  kind: string;
  /** Full-Burst state at emission time, derived from event ORDER (no frame field is documented). */
  inFb: boolean;
  /** 0-based index of the Full Burst window this event was emitted in (-1 before the first). */
  fbWindow: number;
  ord: number;
  ev: SimEvent;
}

const near = (a: number, b: number) => Math.abs(a - b) < 0.005;
const buffOf = (t: Tagged) => t.ev as unknown as BuffApplyEv;

function runTagged(opts: CompOpts) {
  const log: Tagged[] = [];
  let inFb = false;
  let fbWindow = -1;
  const res = runComp({
    ...opts,
    onEvent: (ev: SimEvent) => {
      const kind = (ev as unknown as { kind: string }).kind;
      if (kind === 'fullBurstStart') {
        inFb = true;
        fbWindow += 1;
      }
      log.push({ kind, inFb, fbWindow, ord: log.length, ev });
      if (kind === 'fullBurstEnd') {
        inFb = false;
      }
    },
  } as CompOpts);
  return { res, log };
}

/* ------------------------------------------------------------------ *
 * Structure-agnostic override walkers (used only to build counterfactuals).
 * The override FILE is slot-keyed; a slot is either a Block[] or an object carrying blocks[].
 * Both shapes are handled so the counterfactual cannot silently no-op on a layout difference.
 * ------------------------------------------------------------------ */
interface EffectLike {
  kind?: string;
  stat?: string;
  value?: number;
  durationSec?: number;
  maxStacks?: number;
  trueNormals?: boolean;
  [k: string]: unknown;
}
interface BlockLike {
  trigger?: { kind?: string; [k: string]: unknown };
  effects?: EffectLike[];
  fbGate?: string;
  [k: string]: unknown;
}

function slotBlocks(ov: unknown, slot: string): BlockLike[] {
  const raw = (ov as Record<string, unknown>)[slot];
  if (Array.isArray(raw)) {
    return raw as BlockLike[];
  }
  const nested = (raw as { blocks?: unknown } | null | undefined)?.blocks;
  return Array.isArray(nested) ? (nested as BlockLike[]) : [];
}
function allBlocks(ov: unknown): BlockLike[] {
  return ['skill1', 'skill2', 'burst'].flatMap((s) => slotBlocks(ov, s));
}
function deepVisit(
  node: unknown,
  visit: (o: Record<string, unknown>) => void
): void {
  if (Array.isArray(node)) {
    for (const n of node) {
      deepVisit(n, visit);
    }
    return;
  }
  if (node !== null && typeof node === 'object') {
    const o = node as Record<string, unknown>;
    visit(o);
    for (const v of Object.values(o)) {
      deepVisit(v, visit);
    }
  }
}
const isVbcAtkEffect = (e: EffectLike) =>
  e.kind === 'buff' &&
  (e.stat === 'casterAtkPct' || e.stat === 'atkPct') &&
  typeof e.value === 'number' &&
  near(e.value, VBC_ATK);

/* ------------------------------------------------------------------ *
 * Hoisted runs (6 x 180s sims).
 * ------------------------------------------------------------------ */
const baseRun = runTagged(controlComp(SLUG, true));
const baseTotals = totals(baseRun.res);
const COMP = Object.keys(baseTotals);
const TEAM = COMP.filter((s) => s !== SLUG);

let nTrueZeroed = 0;
const ovNoTrue = withPatchedOverride(SLUG, (ov) => {
  for (const b of allBlocks(ov)) {
    for (const e of b.effects ?? []) {
      if (e.kind === 'buff' && e.stat === 'trueDamagePct') {
        e.value = 0;
        nTrueZeroed += 1;
      }
    }
  }
});
const runNoTrue = runTagged({
  ...controlComp(SLUG, true),
  overrides: { [SLUG]: ovNoTrue },
});

let nAtkZeroed = 0;
const ovNoAtk = withPatchedOverride(SLUG, (ov) => {
  for (const b of allBlocks(ov)) {
    for (const e of b.effects ?? []) {
      if (isVbcAtkEffect(e)) {
        e.value = 0;
        nAtkZeroed += 1;
      }
    }
  }
});
const runNoAtk = runTagged({
  ...controlComp(SLUG, true),
  overrides: { [SLUG]: ovNoAtk },
});

let nAtkPassive = 0;
const ovAtkPassive = withPatchedOverride(SLUG, (ov) => {
  for (const b of allBlocks(ov)) {
    if (!(b.effects ?? []).some(isVbcAtkEffect)) {
      continue;
    }
    b.trigger = { kind: 'passive' };
    delete b.fbGate;
    for (const e of b.effects ?? []) {
      if (isVbcAtkEffect(e)) {
        delete e.durationSec;
        nAtkPassive += 1;
      }
    }
  }
});
const runAtkPassive = runTagged({
  ...controlComp(SLUG, true),
  overrides: { [SLUG]: ovAtkPassive },
});

let nGateRemoved = 0;
const ovNoFbGate = withPatchedOverride(SLUG, (ov) => {
  for (const b of allBlocks(ov)) {
    if (b.trigger?.kind === 'hitCount' && b.fbGate !== undefined) {
      delete b.fbGate;
      nGateRemoved += 1;
    }
  }
});
const runNoFbGate = runTagged({
  ...controlComp(SLUG, true),
  overrides: { [SLUG]: ovNoFbGate },
});

let nTrueNormals = 0;
const ovNoTrueNormals = withPatchedOverride(SLUG, (ov) => {
  deepVisit(ov, (o) => {
    if (o.trueNormals === true) {
      o.trueNormals = false;
      nTrueNormals += 1;
    }
  });
});
const runNoTrueNormals = runTagged({
  ...controlComp(SLUG, true),
  overrides: { [SLUG]: ovNoTrueNormals },
});

/* ------------------------------------------------------------------ *
 * Event selectors.
 * ------------------------------------------------------------------ */
function buffApplies(log: Tagged[], pred: (b: BuffApplyEv) => boolean) {
  return log.filter((t) => t.kind === 'buffApply' && pred(buffOf(t)));
}
const vbcAll = (log: Tagged[]) =>
  buffApplies(
    log,
    (b) => b.stat === 'trueDamagePct' && near(b.value, VBC_TRUE)
  );
const vbcSelf = (log: Tagged[]) =>
  vbcAll(log).filter((t) => buffOf(t).targetSlug === SLUG);

function clayIdx(log: Tagged[]): number {
  const first = vbcSelf(log)[0];
  if (!first) {
    throw new Error(
      'no Victorious Battle Cry true-damage buffApply from clay — skill1 line is unmodeled or never triggers'
    );
  }
  const idx = buffOf(first).casterIdx;
  if (idx === null || idx === undefined) {
    throw new Error('Victorious Battle Cry buffApply carries no casterIdx');
  }
  return idx;
}

/** Damage events emitted between the start of a Full Burst window and a given event. */
function damageEventsSinceFbStart(log: Tagged[], t: Tagged): number {
  let n = 0;
  for (let i = t.ord - 1; i >= 0; i -= 1) {
    const p = log[i];
    if (p.kind === 'fullBurstStart' && p.fbWindow === t.fbWindow) {
      break;
    }
    if (p.kind === 'damage') {
      n += 1;
    }
  }
  return n;
}

const clayTotal = (res: ReturnType<typeof runComp>) =>
  unitOf(res, SLUG).totalDamage;

/* ------------------------------------------------------------------ *
 * skill1 — Victorious Battle Cry
 * ------------------------------------------------------------------ */
describe('clay skill1 — Victorious Battle Cry (60 normals during Full Burst, all allies)', () => {
  it('fires in the control comp and every activation lands inside a Full Burst window', () => {
    const self = vbcSelf(baseRun.log);
    // Non-vacuity: the fixture must actually reach the trigger, else nothing below tests anything.
    expect(self.length).toBeGreaterThan(0);
    // The kit gates the trigger on Full Burst. Any activation tagged outside a FB window means the
    // block is ungated (W2) or keyed to a non-FB trigger.
    expect(self.every((t) => t.inFb)).toBe(true);
    expect(self.every((t) => t.fbWindow >= 0)).toBe(true);
  });

  it('is hit-count driven, not Full-Burst-entry driven', () => {
    const self = vbcSelf(baseRun.log);
    // (a) Under W1 (fullBurstEnter) the buff applies at FB entry, i.e. with ~no damage yet landed in
    //     that window. Under the faithful hitCount-60 reading at least one activation must follow a
    //     long stretch of landed hits (clay fires an SMG: ~60 rounds is seconds of fire).
    const deepest = Math.max(
      ...self.map((t) => damageEventsSinceFbStart(baseRun.log, t))
    );
    expect(deepest).toBeGreaterThanOrEqual(30);
    // (b) Under W1 there is EXACTLY one activation per Full Burst window. A 10s window holds well
    //     over 120 SMG rounds, so a 60-hit trigger must fire at least twice in some window.
    const perWindow = new Map<number, number>();
    for (const t of self) {
      perWindow.set(t.fbWindow, (perWindow.get(t.fbWindow) ?? 0) + 1);
    }
    expect(Math.max(...perWindow.values())).toBeGreaterThanOrEqual(2);
  });

  it('grants True Damage at the kit magnitude and caps at 3 stacks', () => {
    const idx = clayIdx(baseRun.log);
    const self = vbcSelf(baseRun.log).filter(
      (t) => buffOf(t).casterIdx === idx
    );
    expect(self.length).toBeGreaterThan(0);
    for (const t of self) {
      const b = buffOf(t);
      expect(b.value).toBeCloseTo(VBC_TRUE, 3);
      // Stacks up to 3 — a missing or wrong cap is the nearest-wrong here (1 under-credits, an
      // uncapped/None over-credits without bound).
      expect(b.maxStacks).toBe(3);
      expect(b.stacks ?? 1).toBeLessThanOrEqual(3);
    }
    // The stack cap must actually be exercised, else the cap assertion is untested.
    expect(Math.max(...self.map((t) => buffOf(t).stacks ?? 1))).toBeGreaterThan(
      1
    );
  });

  it('reaches every ally, not just clay (W7)', () => {
    const idx = clayIdx(baseRun.log);
    const all = vbcAll(baseRun.log).filter((t) => buffOf(t).casterIdx === idx);
    const firstSweep = all
      .slice(0, COMP.length)
      .map((t) => buffOf(t).targetSlug);
    expect(new Set(firstSweep).size).toBe(COMP.length);
    expect(new Set(all.map((t) => buffOf(t).targetSlug))).toEqual(
      new Set(COMP)
    );
  });

  it('is load-bearing on clay damage — zeroing True Damage moves her total', () => {
    // Proves the true-damage stack has a real carrier (clay burst-window true normals). If clay had
    // no true-flavored damage at all, this delta would be zero and the whole VBC/burst true-damage
    // family would be inert on this comp.
    expect(nTrueZeroed).toBeGreaterThan(0);
    expect(clayTotal(runNoTrue.res)).toBeLessThan(clayTotal(baseRun.res));
  });

  it('the Full-Burst gate is load-bearing (W2 over-credits)', () => {
    // If this is 0 the trigger is not a hitCount block at all — a trigger-identity divergence, which
    // is exactly what this test is here to surface.
    expect(nGateRemoved).toBeGreaterThan(0);
    expect(clayTotal(runNoFbGate.res)).toBeGreaterThan(clayTotal(baseRun.res));
    const ungated = vbcSelf(runNoFbGate.log);
    expect(ungated.length).toBeGreaterThan(vbcSelf(baseRun.log).length);
    expect(ungated.some((t) => !t.inFb)).toBe(true);
  });

  it.skip('enemy-projectile damage rider (45.05%, 6 sec) — GAP: the scope-lock boss fires no modeled projectile entity, so the sim has no target for the rider and no primitive to express damage TO a projectile', () => {
    // Intentionally unmodelable in v1; recorded here so the line is not a silent drop.
  });
});

/* ------------------------------------------------------------------ *
 * skill2
 * ------------------------------------------------------------------ */
describe('clay skill2 — Burst Stage 1 immunity + the Victorious-Battle-Cry ATK grant', () => {
  it.skip('debuff immunity to 1 debuff for 10 sec on entering Burst Stage 1 — GAP: no debuff/immunity primitive exists in the effect schema and the scope-lock boss applies no debuffs, so the line has no observable payload', () => {
    // Trigger identity is still readable (stageEnter stage 1, all allies) but the effect is not.
  });

  it('ATK grant is caster-scaled and flat-resolved, not each ally own ATK (W5)', () => {
    const idx = clayIdx(baseRun.log);
    const casterScaled = buffApplies(
      baseRun.log,
      (b) => b.stat === 'casterAtkPct' && b.casterIdx === idx
    );
    expect(casterScaled.length).toBeGreaterThan(0);
    // casterAtkPct re-emits FLAT (kit% x caster staticAtk). clay is a Supporter, so the flat value is
    // in the tens of thousands — it can never be the raw 20.07 that an atkPct encoding would emit.
    for (const t of casterScaled) {
      expect(buffOf(t).value).toBeGreaterThan(1000);
      expect(near(buffOf(t).value, VBC_ATK)).toBe(false);
    }
    // And the wrong encoding must be absent entirely.
    const selfScaled = buffApplies(
      baseRun.log,
      (b) =>
        b.stat === 'atkPct' && b.casterIdx === idx && near(b.value, VBC_ATK)
    );
    expect(selfScaled.length).toBe(0);
  });

  it('rides the Victorious Battle Cry window exactly — not a permanent passive (W3)', () => {
    const idx = clayIdx(baseRun.log);
    const atkSelf = buffApplies(
      baseRun.log,
      (b) =>
        b.stat === 'casterAtkPct' &&
        b.casterIdx === idx &&
        b.targetSlug === SLUG
    );
    const vbc = vbcSelf(baseRun.log).filter((t) => buffOf(t).casterIdx === idx);
    expect(atkSelf.length).toBeGreaterThan(0);
    // The prose gates the ATK grant on BEING in Victorious Battle Cry, so its live window must be the
    // VBC window: same activations, same expiry frames. A passive grant produces one apply at t=0
    // with an unrelated (or absent) expiry; a mis-durationed grant produces a different expiry set.
    const expiry = (ts: Tagged[]) =>
      ts.map((t) => buffOf(t).expiresFrame).sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(atkSelf.length).toBe(vbc.length);
    expect(expiry(atkSelf)).toEqual(expiry(vbc));
    // Every activation is inside a Full Burst window, inherited from the gating trigger.
    expect(atkSelf.every((t) => t.inFb)).toBe(true);
    // Counterfactual: as an unconditional passive it is live for the whole fight instead of only the
    // 6s windows, so the whole team over-credits.
    expect(nAtkPassive).toBeGreaterThan(0);
    expect(clayTotal(runAtkPassive.res)).toBeGreaterThan(
      clayTotal(baseRun.res)
    );
    const passiveTotals = totals(runAtkPassive.res);
    expect(TEAM.some((s) => passiveTotals[s] > baseTotals[s])).toBe(true);
  });

  it('is presence-gated, not stacked with the 3 Victorious Battle Cry stacks (W4)', () => {
    const idx = clayIdx(baseRun.log);
    const atk = buffApplies(
      baseRun.log,
      (b) => b.stat === 'casterAtkPct' && b.casterIdx === idx
    );
    expect(atk.length).toBeGreaterThan(0);
    for (const t of atk) {
      const b = buffOf(t);
      expect(b.maxStacks ?? 1).toBe(1);
      expect(b.stacks ?? 1).toBe(1);
    }
  });

  it('reaches every ally — zeroing it moves teammates, not just clay (W7)', () => {
    expect(nAtkZeroed).toBeGreaterThan(0);
    const t2 = totals(runNoAtk.res);
    expect(clayTotal(runNoAtk.res)).toBeLessThan(clayTotal(baseRun.res));
    // An ally-scoped ATK grant must be load-bearing on at least one teammate; a self-scoped model
    // would leave every teammate byte-identical.
    expect(TEAM.some((s) => t2[s] < baseTotals[s])).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * burst
 * ------------------------------------------------------------------ */
describe('clay burst — team True Damage + self true normals', () => {
  it('grants True Damage 12.56% to all allies on cast, distinct from the skill1 buff', () => {
    const idx = clayIdx(baseRun.log);
    const burstBuffs = buffApplies(
      baseRun.log,
      (b) =>
        b.stat === 'trueDamagePct' &&
        near(b.value, BURST_TRUE) &&
        b.casterIdx === idx
    );
    // Non-vacuity: clay is Burst II sharing the stage with the control comp B2, so this ALSO asserts
    // the fixture actually lets her cast. If this goes RED at 0 the fixture must be re-cut (a comp
    // where clay wins the stage-2 slot), not the assertion relaxed.
    expect(burstBuffs.length).toBeGreaterThanOrEqual(COMP.length);
    expect(new Set(burstBuffs.map((t) => buffOf(t).targetSlug))).toEqual(
      new Set(COMP)
    );
    // Same stat from the same caster but a different SLOT: the buff engine overwrites per
    // caster+slot, so the burst grant must carry its own key and coexist with Victorious Battle Cry
    // rather than replacing it.
    const burstKeys = new Set(burstBuffs.map((t) => buffOf(t).key));
    const vbcKeys = new Set(
      vbcAll(baseRun.log)
        .filter((t) => buffOf(t).casterIdx === idx)
        .map((t) => buffOf(t).key)
    );
    expect(vbcKeys.size).toBeGreaterThan(0);
    for (const k of burstKeys) {
      expect(vbcKeys.has(k)).toBe(false);
    }
  });

  it('self line: normal attacks deal true damage, and it is self-scoped (W6/W7)', () => {
    // The only primitive for true-flavored normals is a weaponSwap carrying trueNormals; if nothing
    // in the override sets it, the burst self line is unmodeled — a real faithfulness finding.
    expect(nTrueNormals).toBeGreaterThan(0);
    // Load-bearing: without it clay normals are not true-flavored, so her own damage drops.
    expect(clayTotal(runNoTrueNormals.res)).toBeLessThan(
      clayTotal(baseRun.res)
    );
    // Affects self: the line must move nobody else. Deterministic sim, so exact equality.
    const t2 = totals(runNoTrueNormals.res);
    for (const s of TEAM) {
      expect(t2[s]).toBe(baseTotals[s]);
    }
  });

  it.skip('absolute 6 sec / 10 sec window lengths in frames — GAP: the documented event payloads expose expiresFrame but no apply frame, so a window LENGTH cannot be computed from the event log alone; the windows are pinned here relatively (skill2 ATK expiry set == Victorious Battle Cry expiry set) instead', () => {
    // Re-enable if the harness starts tagging events with an emission frame.
  });
});
