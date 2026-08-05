/**
 * rupee-winter-shopper (AR / Electric / Defender / Burst I) — blind kit spec test.
 *
 * Written from the kit prose ALONE (S5 blind post-op): no sight of the shipped override,
 * the driver's tests, or any truth file.
 *
 * KIT (paraphrased; short quotes only)
 *   S1  "when the last bullet hits" -> all allies: DEF up 19.02% for 5 sec.
 *   S2a "when an ally uses a Burst Skill" -> all allies: Shopping DEF up 1.33%,
 *       stacks up to 4, lasts 20 sec. ANY ally's burst cast — not own-burst, not FB entry.
 *   S2b "if Shopping is at max stacks when Full Burst ends" -> all allies:
 *       Burst Gauge filling speed up 7.9% for 5 sec.
 *   B   self: Attract taunt 5 sec; recovers 50.47% of attack damage as HP over 10 sec.
 *       all allies: Reload Speed up 63.17% for 10 sec. Re-enters Burst Stage 1.
 *
 * FIXTURE
 *   controlComp('rupee-winter-shopper', true) — fixed B1 (liter) / B2 (crown) / carry slot /
 *   fixed B3 (helm). Rupee is Burst I, so the fixed B1 wins the stage-1 slot on slot order and
 *   her OWN burst may never cast in the control comp. Every BURST-slot assertion therefore runs
 *   on a `burstFirst`-patched fixture — a fixture control, not the thing under test — so her
 *   burst provably casts; non-vacuity is asserted via the presence of her Reload Speed
 *   application. Skill-slot assertions use the unpatched control comp.
 *
 * WHY EACH ASSERTION DISCRIMINATES
 *   S1 target set — all-allies vs self-only (distinct targetSlug count == comp size).
 *   S1 cadence    — last-bullet is per MAGAZINE (~10-40 waves over 180 s); a shot-fired
 *                   keying would produce ~10^3 waves.
 *   S1 inertness  — defPct is inert in v1; deleting it must be byte-identical on damage,
 *                   and the deletion itself must be non-empty (catches a MISSING line).
 *   S2a keying    — at least 3 Shopping waves land BEFORE the first fullBurstStart (the
 *                   B1->B2->B3 casts all precede FB entry). A fullBurstEnter-keyed model
 *                   yields 0 there; an own-burstCast-keyed model yields 0 in this comp.
 *   S2a cap       — stacks/maxStacks pinned at 4 and the per-application value at 1.33,
 *                   catching a collapsed 4x1.33 single-shot model.
 *   S2b gate      — the 7.9% gauge buff cannot appear before the SECOND full burst:
 *                   rotation 1 supplies only 3 burst casts = 3 stacks < max. An ungated
 *                   fullBurstEnd model fires at FB #1 -> RED. The counterfactual strips the
 *                   block gates and must then produce strictly MORE applications.
 *   B reload      — reload speed gates shots fired; removing it must lower team and own damage.
 *   B re-enter    — without reenterStage the other Burst I ally never casts at all in the
 *                   burstFirst fixture, so the team loses that buffer -> strictly lower damage.
 *
 * RUN BUDGET: 6 full 180 s sims, all hoisted to module scope.
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

const SLUG = 'rupee-winter-shopper';

const S1_DEF = 19.02;
const SHOPPING_DEF = 1.33;
const SHOPPING_MAX = 4;
const GAUGE_PCT = 7.9;
const RELOAD_PCT = 63.17;

/** Loose view of the event payloads the harness documents on cfg.onEvent. */
interface Ev {
  kind: string;
  stat?: string;
  key?: string;
  value?: number;
  stacks?: number;
  maxStacks?: number;
  targetSlug?: string;
  targetIdx?: number | null;
  casterIdx?: number | null;
}

type Comp = ReturnType<typeof controlComp>;
type Res = ReturnType<typeof runComp>;

function run(opts: Comp): { res: Res; evs: Ev[] } {
  const raw: SimEvent[] = [];
  const cfg = (opts as unknown as { cfg?: Record<string, unknown> }).cfg;
  const tapped = {
    ...(opts as unknown as Record<string, unknown>),
    cfg: { ...cfg, onEvent: (ev: SimEvent) => raw.push(ev) },
  } as unknown as Comp;
  return { res: runComp(tapped), evs: raw as unknown as Ev[] };
}

const near = (a: number | undefined, b: number): boolean =>
  Math.abs((a ?? 0) - b) < 1e-6;

const applies = (evs: Ev[], stat: string, value: number): Ev[] =>
  evs.filter(
    (e) => e.kind === 'buffApply' && e.stat === stat && near(e.value, value),
  );

const targetsOf = (list: Ev[]): Set<string> =>
  new Set(list.map((e) => e.targetSlug ?? `idx:${String(e.targetIdx)}`));

/** Applications / distinct targets — one "wave" == one activation of the line. */
const waves = (list: Ev[]): number =>
  list.length === 0 ? 0 : list.length / Math.max(1, targetsOf(list).size);

const teamTotal = (res: Res): number =>
  Object.values(totals(res)).reduce((a, b) => a + b, 0);

const countBefore = (evs: Ev[], kind: string, idx: number): number =>
  idx < 0 ? 0 : evs.slice(0, idx).filter((e) => e.kind === kind).length;

// ---------------------------------------------------------------------------
// Structure-agnostic override patching.
// The override FILE is slot-keyed; a slot is either a Block[] or a
// CharacterSkills carrying blocks[]. Both shapes are handled, and every patch
// mutates the BLOCK objects in place so the container shape never matters.
// ---------------------------------------------------------------------------
interface Blocky {
  trigger?: { kind?: string };
  effects?: { kind?: string; stat?: string; value?: number }[];
  [k: string]: unknown;
}

function slotBlocks(slot: unknown): Blocky[] {
  if (!slot) return [];
  if (Array.isArray(slot)) return slot as Blocky[];
  const inner = (slot as { blocks?: unknown }).blocks;
  return Array.isArray(inner) ? (inner as Blocky[]) : [];
}

function blocksOf(
  ov: unknown,
  ...slots: ('skill1' | 'skill2' | 'burst')[]
): Blocky[] {
  const o = ov as Record<string, unknown>;
  return slots.flatMap((s) => slotBlocks(o[s]));
}

const allBlocks = (ov: unknown): Blocky[] =>
  blocksOf(ov, 'skill1', 'skill2', 'burst');

function dropBuff(blocks: Blocky[], stat: string, value: number): number {
  let removed = 0;
  for (const b of blocks) {
    const before = b.effects?.length ?? 0;
    b.effects = (b.effects ?? []).filter(
      (e) => !(e.kind === 'buff' && e.stat === stat && near(e.value, value)),
    );
    removed += before - b.effects.length;
  }
  return removed;
}

function dropEffectKind(blocks: Blocky[], kind: string): number {
  let removed = 0;
  for (const b of blocks) {
    const before = b.effects?.length ?? 0;
    b.effects = (b.effects ?? []).filter((e) => e.kind !== kind);
    removed += before - b.effects.length;
  }
  return removed;
}

const GATE_FIELDS = [
  'resourceGate',
  'everyN',
  'everyNOffset',
  'ownBurstGate',
  'fbGate',
  'swapGate',
  'requiresCore',
  'requiresTargetStatus',
  'requiresShielded',
  'teamHas',
  'mode',
];

/** Strip every block-level gate from the blocks carrying a buff of `stat`. */
function ungateCarriersOf(blocks: Blocky[], stat: string): number {
  let n = 0;
  for (const b of blocks) {
    if (!(b.effects ?? []).some((e) => e.stat === stat)) continue;
    for (const f of GATE_FIELDS) {
      if (b[f] !== undefined) {
        delete b[f];
        n++;
      }
    }
  }
  return n;
}

/** Fixture control: force her to take the stage-1 burst ahead of the fixed B1. */
function addBurstFirst(ov: unknown): number {
  const burst = blocksOf(ov, 'burst');
  const host = burst.find((b) => b.trigger?.kind === 'burstCast') ?? burst[0];
  if (!host) return 0;
  host.effects = [...(host.effects ?? []), { kind: 'burstFirst' }];
  return 1;
}

function compWith(patched: unknown): Comp {
  const c = controlComp(SLUG, true) as unknown as Record<string, unknown>;
  return {
    ...c,
    overrides: {
      ...((c.overrides as Record<string, unknown> | undefined) ?? {}),
      [SLUG]: patched,
    },
  } as unknown as Comp;
}

// --------------------------- hoisted runs (6) ------------------------------
const base = run(controlComp(SLUG, true));
const compSize = Object.keys(totals(base.res)).length;

let s1Removed = 0;
const ovNoS1 = withPatchedOverride(SLUG, (ov) => {
  s1Removed = dropBuff(allBlocks(ov), 'defPct', S1_DEF);
});
const noS1 = run(compWith(ovNoS1));

let gaugeGatesStripped = 0;
const ovUngated = withPatchedOverride(SLUG, (ov) => {
  gaugeGatesStripped = ungateCarriersOf(allBlocks(ov), 'burstGenPct');
});
const ungated = run(compWith(ovUngated));

let burstFirstAdded = 0;
const ovBurstFirst = withPatchedOverride(SLUG, (ov) => {
  burstFirstAdded = addBurstFirst(ov);
});
const burstFx = run(compWith(ovBurstFirst));

let reloadRemoved = 0;
const ovNoReload = withPatchedOverride(SLUG, (ov) => {
  addBurstFirst(ov);
  reloadRemoved = dropBuff(allBlocks(ov), 'reloadSpeedPct', RELOAD_PCT);
});
const noReload = run(compWith(ovNoReload));

let reenterRemoved = 0;
const ovNoReenter = withPatchedOverride(SLUG, (ov) => {
  addBurstFirst(ov);
  reenterRemoved = dropEffectKind(allBlocks(ov), 'reenterStage');
});
const noReenter = run(compWith(ovNoReenter));

// ---------------------------------------------------------------------------
describe('rupee-winter-shopper S1 — last-bullet DEF to all allies', () => {
  const s1 = applies(base.evs, 'defPct', S1_DEF);

  it('applies DEF 19.02% to every ally (not self-only)', () => {
    expect(s1.length).toBeGreaterThan(0);
    expect(targetsOf(s1).size).toBe(compSize);
  });

  it('fires per magazine (last-bullet), not per trigger pull', () => {
    const w = waves(s1);
    expect(w).toBeGreaterThanOrEqual(4);
    expect(w).toBeLessThanOrEqual(80);
  });

  it('is offensively inert — defPct feeds no damage bucket in v1', () => {
    expect(s1Removed).toBeGreaterThan(0);
    expect(totals(noS1.res)).toEqual(totals(base.res));
  });
});

describe('rupee-winter-shopper S2a — Shopping stacks on ANY ally burst cast', () => {
  const shop = applies(base.evs, 'defPct', SHOPPING_DEF);
  const firstFbStart = base.evs.findIndex((e) => e.kind === 'fullBurstStart');

  it('accrues before the first Full Burst — any-ally burst-cast keying', () => {
    expect(firstFbStart).toBeGreaterThan(-1);
    const before = shop.filter((e) => base.evs.indexOf(e) < firstFbStart);
    // B1 -> B2 -> B3 all cast before FB entry: >= 3 activations already banked.
    // fullBurstEnter keying would give 0 here; own-burstCast keying gives 0 too
    // (the fixed B1 takes stage 1 on slot order in the control comp).
    expect(waves(before)).toBeGreaterThanOrEqual(3);
  });

  it('reaches every ally and stays at the stated 1.33% per stack', () => {
    expect(shop.length).toBeGreaterThan(0);
    expect(targetsOf(shop).size).toBe(compSize);
    for (const e of shop) expect(near(e.value, SHOPPING_DEF)).toBe(true);
  });

  it('caps at 4 stacks', () => {
    const stacked = shop.filter((e) => typeof e.stacks === 'number');
    expect(stacked.length).toBeGreaterThan(0);
    const seen = stacked.map((e) => e.stacks as number);
    expect(Math.max(...seen)).toBe(SHOPPING_MAX);
    for (const e of stacked) {
      expect(e.stacks as number).toBeLessThanOrEqual(SHOPPING_MAX);
      if (typeof e.maxStacks === 'number') expect(e.maxStacks).toBe(SHOPPING_MAX);
    }
  });
});

describe('rupee-winter-shopper S2b — gauge buff gated on max Shopping stacks', () => {
  const gauge = applies(base.evs, 'burstGenPct', GAUGE_PCT);
  const firstGaugeIdx = base.evs.findIndex(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === 'burstGenPct' &&
      near(e.value, GAUGE_PCT),
  );

  it('grants Burst Gauge filling speed 7.9% to all allies', () => {
    expect(gauge.length).toBeGreaterThan(0);
    expect(targetsOf(gauge).size).toBe(compSize);
  });

  it('cannot fire at the first Full Burst end — only 3 stacks exist by then', () => {
    // Rotation 1 supplies exactly three burst casts (B1/B2/B3) = 3 stacks < max,
    // so the earliest legal application is the SECOND full burst's end. Counting
    // fullBurstStart (not fullBurstEnd) keeps this free of same-frame event-order
    // assumptions: >= 2 starts must precede it. An ungated fullBurstEnd model
    // fires after start #1 -> 1 -> RED.
    expect(firstGaugeIdx).toBeGreaterThan(-1);
    expect(countBefore(base.evs, 'fullBurstStart', firstGaugeIdx)).toBeGreaterThanOrEqual(2);
  });

  it('the gate is load-bearing — stripping it produces more applications', () => {
    expect(gaugeGatesStripped).toBeGreaterThan(0);
    const ungatedGauge = applies(ungated.evs, 'burstGenPct', GAUGE_PCT);
    expect(ungatedGauge.length).toBeGreaterThan(gauge.length);
  });
});

describe('rupee-winter-shopper burst — reload speed + Burst Stage 1 re-entry', () => {
  const reload = applies(burstFx.evs, 'reloadSpeedPct', RELOAD_PCT);

  it('fixture is non-vacuous — her burst actually casts here', () => {
    expect(burstFirstAdded).toBe(1);
    expect(reload.length).toBeGreaterThan(0);
  });

  it('grants Reload Speed 63.17% to every ally, not just herself', () => {
    expect(targetsOf(reload).size).toBe(compSize);
  });

  it('reload speed is damage-positive — removing it costs shots', () => {
    expect(reloadRemoved).toBeGreaterThan(0);
    expect(teamTotal(burstFx.res)).toBeGreaterThan(teamTotal(noReload.res));
    expect(unitOf(burstFx.res, SLUG).totalDamage).toBeGreaterThan(
      unitOf(noReload.res, SLUG).totalDamage,
    );
  });

  it('re-enters Burst Stage 1 so the other Burst I ally still casts', () => {
    // She takes stage 1 in this fixture; without the re-entry the fixed B1 buffer
    // never casts at all and the whole team loses its buffs.
    expect(reenterRemoved).toBeGreaterThan(0);
    expect(teamTotal(burstFx.res)).toBeGreaterThan(teamTotal(noReenter.res));
  });

  it.skip('Attract — taunts all enemies for 5 sec (no aggro/threat primitive; the v1 boss deals no damage, so nothing can consume it)', () => {
    // GAP: unmodellable and unobservable at scope lock.
  });

  it.skip('recovers 50.47% of attack damage as HP over 10 sec (heal emits no event kind on cfg.onEvent, and the line is self-targeted with no on-recovery consumer on this unit)', () => {
    // GAP: the heal primitive models no HP pool and the tap exposes no recovery
    // event, so a self-targeted heal has no observable payload in this fixture.
    // It is still kit-required (a future teammate with a `recovery` trigger would
    // consume it) — assert it by inspection of the override, not by simulation.
  });
});
