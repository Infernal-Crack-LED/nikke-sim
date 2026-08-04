import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js';

/**
 * poli — BLIND kit spec test (written from kit prose alone, no sight of the driver's
 * override/tests/reasoning).
 *
 * KIT (SG/Water/Defender/Burst II, ammo 9, hitsPerShot 10):
 *   skill1 a) "Activates after 5 normal attack(s). Affects all allies." ATK ▲5.46% / 10 sec
 *   skill1 b) "Activates at the start of battle. Affects self." Police Badge shield = 100% of
 *             the user's final Max HP, 10 sec.
 *   skill2 a) "Affects self and 2 other ally unit(s) with the lowest HP every 20 sec."
 *             DEF ▲23.51% / 10 sec  +  "Equally shares damage taken" / 10 sec
 *   skill2 b) "Activates when Police Badge ends. Affects self." recovers 5% final Max HP
 *             every 1 sec for 5 sec.
 *   burst  a) "Activates when in Police Badge status. Affects self." Indomitability 5 sec,
 *             removes Police Badge.
 *   burst  b) "Affects self." shared shield = 40% final Max HP protecting all allies, 10 sec.
 *   burst  c) "Affects all allies." ATK ▲44.55% / 10 sec.
 *
 * FIXTURE: controlComp('poli', true) — liter (B1) / crown (B2) / poli / helm (B3). poli is a
 * Burst II unit, so the B1+B3 slots are REQUIRED for any burst to cast at all; helm is kept so a
 * Full Burst actually opens (a comp with no B3 makes ZERO full bursts, which would make every
 * burst assertion vacuous). Deterministic (no seed).
 *
 * OBSERVABILITY NOTE (why some assertions are structural rather than event-based): the engine's
 * event stream has no `shield` or `heal` kind — a shield/heal is observable only through a
 * `shielded`/`recovery` TRIGGER consumer or a `requiresShielded` gate, and no such consumer for
 * poli's SELF-scoped badge exists in the control comp. Those lines are therefore asserted on the
 * override structure (read through withPatchedOverride's clone, committed JSON untouched), which
 * still discriminates encoding errors (wrong %, wrong duration, wrong target, silent drop).
 * Everything the engine CAN emit (atkPct / defPct buff applies, their target sets, their trigger
 * identity by event ordering, damage totals) is asserted behaviourally with a nearest-wrong
 * counterfactual.
 */

// ---- loose local views (never assume more shape than the harness contract guarantees) ----
interface Eff {
  kind: string;
  stat?: string;
  value?: number;
  durationSec?: number;
  maxHpPct?: number;
  ticks?: number;
  intervalSec?: number;
}
interface Blk {
  trigger?: { kind?: string; count?: number; sec?: number };
  target?: { kind?: string; count?: number; excludeSelf?: boolean };
  effects?: Eff[];
  requiresShielded?: boolean;
}
interface OvView {
  skill1?: unknown;
  skill2?: unknown;
  burst?: unknown;
  unmodeled?: Record<string, string[]>;
}
interface Ev {
  kind: string;
  stat?: string;
  value?: number;
  targetSlug?: string;
  expiresFrame?: number;
}

// The override FILE is slot-keyed; tolerate both `slot: Block[]` and `slot: { blocks: Block[] }`.
function blocksOf(slot: unknown): Blk[] {
  if (Array.isArray(slot)) {
    return slot as Blk[];
  }
  const b = (slot as { blocks?: Blk[] } | undefined)?.blocks;
  return Array.isArray(b) ? b : [];
}
function allBlocks(ov: OvView): Blk[] {
  return [
    ...blocksOf(ov.skill1),
    ...blocksOf(ov.skill2),
    ...blocksOf(ov.burst),
  ];
}
function effectsOf(blocks: Blk[]): Eff[] {
  return blocks.flatMap((b) => b.effects ?? []);
}

type Patch = Record<string, unknown>;

function run(patch?: Patch) {
  const events: Ev[] = [];
  const base = controlComp('poli', true) as unknown as Record<string, unknown>;
  const opts = {
    ...base,
    overrides: { ...((base.overrides as Patch) ?? {}), ...(patch ?? {}) },
    cfg: {
      ...((base.cfg as Patch) ?? {}),
      onEvent: (ev: SimEvent) => events.push(ev as unknown as Ev),
    },
  };
  const res = runComp(opts as Parameters<typeof runComp>[0]);
  return { res, events };
}

const applies = (evs: Ev[], stat: string, value: number) =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      Math.abs((e.value ?? 0) - value) < 1e-6
  );
const sumAll = (t: Record<string, number>) =>
  Object.values(t).reduce((a, b) => a + b, 0);

// ---- the committed override, read (not mutated) through the clone helper ----
const OV = withPatchedOverride('poli', () => {}) as unknown as OvView;

// ---- hoisted runs (6 × 180s sims) ----
const BASE = run();

// nearest-wrong #1: skill1 ATK scoped to self instead of "all allies"
const SELF_ONLY = run({
  poli: withPatchedOverride('poli', (ov) => {
    for (const b of blocksOf((ov as unknown as OvView).skill1)) {
      if ((b.effects ?? []).some((e) => e.stat === 'atkPct')) {
        b.target = { kind: 'self' };
      }
    }
  }),
});

// nearest-wrong #2: skill1 ATK window collapsed to 1s (proves the 10s window is load-bearing —
// poli's SG magazine is 9 with a ~1.85s reload, so a 1s window cannot bridge a reload)
const SHORT_WINDOW = run({
  poli: withPatchedOverride('poli', (ov) => {
    for (const b of blocksOf((ov as unknown as OvView).skill1)) {
      for (const e of b.effects ?? []) {
        if (e.stat === 'atkPct') {
          e.durationSec = 1;
        }
      }
    }
  }),
});

// nearest-wrong #3: the every-5-normal-attacks threshold dropped to 1 (a no-op unless the
// trigger really is a count-based one — discriminates hitCount from interval/passive/burstCast)
const FAST_TRIGGER = run({
  poli: withPatchedOverride('poli', (ov) => {
    for (const b of blocksOf((ov as unknown as OvView).skill1)) {
      if (b.trigger && typeof b.trigger.count === 'number') {
        b.trigger.count = 1;
      }
    }
  }),
});

// nearest-wrong #4: burst ATK re-keyed to fullBurstEnter (the classic over-credit — it would
// fire on ANY team Full Burst, and would land AFTER the FB opens instead of before poli's cast)
const FB_ENTER = run({
  poli: withPatchedOverride('poli', (ov) => {
    for (const b of blocksOf((ov as unknown as OvView).burst)) {
      if ((b.effects ?? []).some((e) => e.stat === 'atkPct')) {
        b.trigger = { kind: 'fullBurstEnter' };
      }
    }
  }),
});

// inertness probe: strip the DEF buff entirely
const NO_DEF = run({
  poli: withPatchedOverride('poli', (ov) => {
    for (const b of blocksOf((ov as unknown as OvView).skill2)) {
      b.effects = (b.effects ?? []).filter((e) => e.stat !== 'defPct');
    }
  }),
});

describe('poli — fixture non-vacuity', () => {
  it('poli is in the comp, fires her weapon, and the comp reaches Full Burst', () => {
    // If any of these fail, every downstream assertion is untrustworthy rather than wrong.
    expect(unitOf(BASE.res, 'poli').totalDamage).toBeGreaterThan(0);
    expect(Object.keys(totals(BASE.res)).length).toBe(5);
    expect(
      BASE.events.filter((e) => e.kind === 'fullBurstStart').length
    ).toBeGreaterThan(0);
  });
});

describe('poli skill1a — "Activates after 5 normal attack(s)", ATK ▲5.46% / 10s, all allies', () => {
  const s1 = applies(BASE.events, 'atkPct', 5.46);

  it('emits a 5.46 RAW-percentage atkPct buff (not a caster-scaled flat ATK grant)', () => {
    // "ATK ▲ 5.46%" is a plain percentage stat -> the buffApply value stays 5.46.
    // Nearest-wrong: casterAtkPct/highestAllyAtkPct, which flat-resolve at apply time and would
    // emit a large flat ATK number under a different stat key, so this filter would be empty.
    expect(s1.length).toBeGreaterThan(0);
  });

  it('reaches ALL FIVE allies (target set = allies, self included)', () => {
    // "Affects all allies" -> 5 distinct targetSlugs. Nearest-wrong (self-only) collapses to 1.
    expect(new Set(s1.map((e) => e.targetSlug)).size).toBe(5);
    const cf = applies(SELF_ONLY.events, 'atkPct', 5.46);
    expect(new Set(cf.map((e) => e.targetSlug)).size).toBe(1);
    // and the mis-scope is damage-visible: the team loses the buff it should be getting
    expect(sumAll(totals(SELF_ONLY.res))).toBeLessThan(
      sumAll(totals(BASE.res))
    );
  });

  it('is a COUNT-triggered line, not an interval/passive one', () => {
    // Dropping the threshold to 1 must multiply the number of applications. If the driver keyed
    // this to interval/passive/burstCast the patch is a no-op and the counts stay equal (RED).
    const fast = applies(FAST_TRIGGER.events, 'atkPct', 5.46);
    expect(fast.length).toBeGreaterThan(s1.length * 2);
  });

  it("counts ROUNDS (trigger pulls), not the SG's 10 pellets per shot", () => {
    // A pellet-counting mis-read would fire ~10x more often than a round-counting one. poli has
    // 9 ammo and a ~1.85s reload; over 180s a round-counting every-5 line fires on the order of
    // tens of times per ally, a pellet-counting one hundreds.
    const perAlly = s1.length / 5;
    expect(perAlly).toBeGreaterThan(3);
    expect(perAlly).toBeLessThan(80);
  });

  it('the 10-second window is load-bearing (1s window loses uptime across reloads)', () => {
    expect(sumAll(totals(SHORT_WINDOW.res))).toBeLessThan(
      sumAll(totals(BASE.res))
    );
  });
});

describe('poli skill1b — Police Badge: self shield = 100% final Max HP, 10s, at battle start', () => {
  it('is encoded as a self-targeted 100%-maxHp shield for 10s from battle start', () => {
    // Structural: the engine emits no shield event and the control comp holds no shield consumer,
    // so the only discriminating check is the encoding. Nearest-wrong readings this catches:
    // 40% (the BURST shield's magnitude) instead of 100%, an allies target instead of self, a
    // missing/!=10s duration, or a silent drop.
    const s1 = blocksOf(OV.skill1);
    const badge = s1.find((b) =>
      (b.effects ?? []).some((e) => e.kind === 'shield' && e.maxHpPct === 100)
    );
    expect(
      badge,
      'skill1 must carry a 100%-maxHp shield (Police Badge)'
    ).toBeTruthy();
    const eff = (badge?.effects ?? []).find((e) => e.kind === 'shield');
    expect(eff?.durationSec).toBe(10);
    expect(badge?.target?.kind).toBe('self');
    expect(badge?.trigger?.kind).toBe('passive'); // "at the start of battle"
  });
});

describe('poli skill2a — DEF ▲23.51% / 10s to self + 2 lowest-HP allies, every 20s', () => {
  const def = applies(BASE.events, 'defPct', 23.51);

  it('emits defPct 23.51 to exactly THREE allies (self + 2)', () => {
    // Nearest-wrong: "all allies" (5 targets) or self-only (1).
    expect(def.length).toBeGreaterThan(0);
    expect(new Set(def.map((e) => e.targetSlug)).size).toBe(3);
  });

  it('fires on a 20-second interval, not 10s and not per-burst', () => {
    // 180s / 20s = 9 activations (8 if the engine drops a boundary fire); a 10s interval would
    // give ~18, a burst-keyed reading far fewer and irregular.
    const groups = def.length / 3;
    expect(groups).toBeGreaterThanOrEqual(8);
    expect(groups).toBeLessThanOrEqual(10);
  });

  it('is offensively INERT (DEF moves no damage in v1) — kept for kit completeness', () => {
    // Inertness assertion: stripping it must leave every unit byte-identical. If this FAILS the
    // driver wired DEF into a damage path, which the kit text does not license.
    expect(totals(NO_DEF.res)).toEqual(totals(BASE.res));
  });

  it('targets the lowest-HP ally set, not a positional/top-ATK stand-in', () => {
    const blk = blocksOf(OV.skill2).find((b) =>
      (b.effects ?? []).some((e) => e.stat === 'defPct')
    );
    expect(blk?.target?.kind).toBe('alliesLowestHp');
    expect(blk?.target?.count).toBe(3); // self + 2 others
    expect(blk?.trigger?.kind).toBe('interval');
    expect(blk?.trigger?.sec).toBe(20);
    const eff = (blk?.effects ?? []).find((e) => e.stat === 'defPct');
    expect(eff?.durationSec).toBe(10);
  });

  it.skip('"Equally shares damage taken for 10 sec" — GAP: no HP pool / no incoming-damage model at scope lock', () => {
    // Must appear in unmodeled.skill2 rather than be silently dropped (asserted below).
  });
});

describe('poli skill2b — 5% final Max HP per second for 5s when Police Badge ends', () => {
  it('is encoded as a 5-tick, 1-second-interval heal (the recovery channel teammates consume)', () => {
    // Heals are NEVER skipped on isolation: a heal emits `recovery` events that drive a
    // teammate's on-recovery kit (crown sits in this fixture). Nearest-wrong this catches:
    // a single instant heal (ticks 1) instead of 5 separate recovery emissions, which would
    // under-refresh any on-recovery consumer.
    const heal = effectsOf(blocksOf(OV.skill2)).find((e) => e.kind === 'heal');
    expect(heal, 'skill2 must carry the badge-end heal-over-time').toBeTruthy();
    expect(heal?.ticks).toBe(5);
    expect(heal?.intervalSec ?? 1).toBe(1);
  });

  it.skip('trigger identity "when Police Badge ends" — GAP: no shield-expiry trigger primitive', () => {
    // The badge ends at t=10s OR early when the burst removes it, whichever comes first. The
    // schema has no shield-expiry / status-end trigger, so whatever the driver chose (interval,
    // burstCast, passive) is an ⚑ approximation, not a faithful encoding. Flagged, not asserted.
  });
});

describe('poli burst — ATK ▲44.55% / 10s to all allies (the only damage-relevant burst line)', () => {
  const b3 = applies(BASE.events, 'atkPct', 44.55);

  it('emits the 44.55 raw-percentage ATK buff to ALL FIVE allies', () => {
    expect(b3.length).toBeGreaterThan(0);
    expect(new Set(b3.map((e) => e.targetSlug)).size).toBe(5);
  });

  it('is BURST-CAST keyed — it lands BEFORE the Full Burst window opens, not at FB entry', () => {
    // Trigger identity, the highest-value discriminator here. A self/allies buff living in the
    // unit's OWN burst block is burst-cast: it fires only on rotations poli actually bursts, and
    // the cast resolves before Full Burst begins (verified project fact). Ordering in the event
    // stream therefore separates the two readings without depending on how often poli — a Burst
    // II unit sharing the tier with crown in this fixture — happens to cast.
    const firstBuff = BASE.events.findIndex(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'atkPct' &&
        Math.abs((e.value ?? 0) - 44.55) < 1e-6
    );
    const firstFb = BASE.events.findIndex((e) => e.kind === 'fullBurstStart');
    expect(firstBuff).toBeGreaterThanOrEqual(0);
    expect(firstFb).toBeGreaterThanOrEqual(0);
    expect(firstBuff).toBeLessThan(firstFb);

    // Under the nearest-wrong (fullBurstEnter) the same buff lands AT/AFTER the FB opens.
    const cfBuff = FB_ENTER.events.findIndex(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'atkPct' &&
        Math.abs((e.value ?? 0) - 44.55) < 1e-6
    );
    const cfFb = FB_ENTER.events.findIndex((e) => e.kind === 'fullBurstStart');
    expect(cfBuff).toBeGreaterThan(cfFb);
  });

  it('never fires more often than the team reaches Full Burst', () => {
    // Whole-picture guard: a burst-cast line on a Burst II unit can fire at most once per
    // rotation, so per-ally applications can never exceed the Full Burst count.
    const fbs = BASE.events.filter((e) => e.kind === 'fullBurstStart').length;
    expect(b3.length / 5).toBeLessThanOrEqual(fbs);
  });

  it('the shared 40%-maxHp / 10s ally shield is encoded (distinct from the 100% self badge)', () => {
    const shield = effectsOf(blocksOf(OV.burst)).find(
      (e) => e.kind === 'shield' && e.maxHpPct === 40
    );
    expect(shield, 'burst must carry the 40%-maxHp shared shield').toBeTruthy();
    expect(shield?.durationSec).toBe(10);
  });

  it.skip('"Gains Indomitability for 5 sec. Removes Police Badge." — GAP: defensive + no shield-removal primitive', () => {
    // The gate ("when in Police Badge status") maps to requiresShielded, but the payload is
    // purely defensive and the badge REMOVAL has no primitive at all. No-silent-drop is
    // asserted below instead.
  });
});

describe('poli — no silent drops, no invented damage', () => {
  it('records the unmodellable lines in `unmodeled` rather than dropping them', () => {
    const um = OV.unmodeled ?? {};
    expect(
      (um.skill2 ?? []).length,
      'damage-sharing line must be recorded'
    ).toBeGreaterThan(0);
    const burstGated = blocksOf(OV.burst).some(
      (b) => b.requiresShielded === true
    );
    const burstRecorded = (um.burst ?? []).length > 0;
    expect(
      burstGated || burstRecorded,
      'Indomitability / badge-removal must be gated or recorded as unmodeled'
    ).toBe(true);
  });

  it("invents no damage: poli's kit carries no flat hits, DoTs, stored hits or weapon swaps", () => {
    // The whole kit is support/tank. Any damage effect here would be a fudge, not a kit line.
    const kinds = new Set(effectsOf(allBlocks(OV)).map((e) => e.kind));
    for (const forbidden of [
      'flatDamage',
      'dot',
      'storedHit',
      'stackedNuke',
      'weaponSwap',
    ]) {
      expect(kinds.has(forbidden), `unexpected ${forbidden} effect`).toBe(
        false
      );
    }
  });
});
