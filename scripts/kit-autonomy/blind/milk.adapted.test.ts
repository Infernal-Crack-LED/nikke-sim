// ADAPTED COPY (driver reconciliation, 2026-08-03): pristine blind artifact preserved at
// blind/milk.test.ts. THREE structural corrections to blind-writer assumptions that were
// unverifiable from the redacted packet — assertion INTENT unchanged:
//   1. FIXTURE: controlComp(milk) seats a Burst-I unit behind liter (B1, slot 0, same 20s
//      cadence) — liter wins the stage-1 tie-break whenever both are ready, so milk's
//      burst-gated lines are under-exercised (the fixture trap the S2b reviewer warned about).
//      Adapted to a comp where milk is the SOLE B1 (milk/crown/ada/helm, boss Fire, focus
//      ada — the driver fixture), so her casts are observable.
//   2. burstHits READER: SimResult unit rows expose NO per-unit `.events` array (the event
//      stream is global via cfg.onEvent) — the blind reader returned [] for ANY override.
//      Adapted to filter the global stream by slug (same events, same intent).
//   3. NO_S1_CDR COUNTERFACTUAL: the blind patch drops a hypothesized burstCdr block from
//      skill1; the driver encodes the permanent self-CD as charFixes.burstCooldownSec (the
//      engine's ONLY permanent-CD channel — a burstCdr block fires once per block activation
//      and cannot express "continuously"). Adapted patch deletes charFixes.burstCooldownSec
//      when present (falls back to the blind's block-drop otherwise). Same intent: the
//      no-CDR world must yield fewer/slower casts.
/**
 * milk — Milk (Treasure) — SR / Water / Attacker / Burst I (cd 40s, ammo 6, charge 60f).
 * BLIND kit-spec test: written from the kit prose alone, with no sight of the shipped
 * override, the driver tests, or any driver reasoning. One assertion group per kit line.
 *
 * KIT STRUCTURE (what each assertion is pinned to):
 *   skill1 a) Activates every 20 sec / affects 3 ally unit(s) with the highest final ATK
 *             -> ATK 31.83% for 10 sec.
 *   skill1 b) Activates at the start of battle / affects self
 *             -> Cooldown of Burst Skill down 20 sec continuously (base cd 40s -> 20s).
 *   skill2 a) Activates when above 80% HP / affects all allies
 *             -> Critical Damage 11.13% continuously.
 *   skill2 b) Activates when attacking with Full Charge for 10 time(s) / affects all allies
 *             -> Cooldown of Burst Skill down 2.83 sec.
 *   burst  a) Affects 1 enemy unit(s) with the highest final DEF
 *             -> 367.34% of final ATK as Burst Skill damage.
 *   burst  b) Affects all allies
 *             -> Recovers 16.16% of attack damage as HP over 10 sec;
 *                Incoming healing 75.5% for 10 sec.
 *
 * FIXTURE: controlComp('milk', true) — liter (B1) / crown (B2) / milk (carry) / helm (B3).
 *   milk is a Burst I unit, so the fixture MUST supply a B2 and a B3 for any burst to chain;
 *   the helm B3 slot is kept ON for exactly that reason. Consequence: liter is a SECOND B1,
 *   so milk own cast count is a rotation outcome — every burst-line group below is therefore
 *   preceded by an index-free non-vacuity proof that she casts at all.
 *   crown (B2) carries an on-recovery consumer, which is what makes burst line (b) observable
 *   at all: the engine emits no heal/recovery event kind, so the heal can only be read through
 *   a teammate whose trigger it fires.
 *
 * DISCRIMINATION: every counterfactual is built with withPatchedOverride (committed JSON is
 * never touched) and removes exactly ONE kit line, so a green base plus a red counterfactual
 * pins that line rather than the unit aggregate damage.
 *
 * SHAPE DEFENCE: the packet documents two shapes for an override slot value (a bare Block[]
 * and a CharacterSkills carrying its own blocks[]). blocksOf() reads through both and returns
 * the LIVE array, so the patches work either way.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUG = 'milk';
const S1_ATK_PCT = 31.83;
const S1_ATK_TARGETS = 3;
const S2_CRIT_DMG_PCT = 11.13;
const FIGHT_FRAMES = 180 * 60;
const WINDOW_MAX = FIGHT_FRAMES + 10 * 60 + 2;

type AnyEv = SimEvent & Record<string, any>;
type Slot = 'skill1' | 'skill2' | 'burst';

function blocksOf(ov: any, slot: Slot): any[] {
  const s = ov?.[slot];
  if (Array.isArray(s)) {
    return s;
  }
  if (s && Array.isArray(s.blocks)) {
    return s.blocks;
  }
  return [];
}

function dropEffects(ov: any, slot: Slot, pred: (e: any) => boolean): number {
  const arr = blocksOf(ov, slot);
  let removed = 0;
  for (let i = arr.length - 1; i >= 0; i--) {
    const b = arr[i];
    const before = (b.effects ?? []).length;
    b.effects = (b.effects ?? []).filter((e: any) => !pred(e));
    removed += before - b.effects.length;
    if (b.effects.length === 0) {
      arr.splice(i, 1);
    }
  }
  return removed;
}

function scaleBurstDamage(ov: any, factor: number): number {
  let touched = 0;
  for (const b of blocksOf(ov, 'burst')) {
    for (const e of b.effects ?? []) {
      if (e.kind === 'flatDamage') {
        e.atkPct = (e.atkPct ?? 0) * factor;
        touched++;
      }
    }
  }
  return touched;
}

function run(patched?: any) {
  const evs: AnyEv[] = [];
  // ADAPTED fixture #1: milk is the SOLE B1 (see header) — controlComp seats liter (B1, 20s)
  // at slot 0, who wins every stage-1 tie-break and starves milk's burst-gated lines.
  const opts: any = {
    slugs: ['milk', 'crown', 'ada', 'helm'],
    bossElement: 'Fire',
    focusSlug: 'ada',
  };
  opts.cfg = { ...(opts.cfg ?? {}), onEvent: (ev: AnyEv) => evs.push(ev) };
  if (patched) {
    opts.overrides = { ...(opts.overrides ?? {}), [SLUG]: patched };
  }
  const res = runComp(opts);
  const per = totals(res);
  const row: any = unitOf(res, SLUG);
  const ownEvents: AnyEv[] = Array.isArray(row.events) ? row.events : [];
  return {
    evs,
    per,
    ownEvents,
    milk: per[SLUG],
    team: Object.values(per).reduce((a, b) => a + b, 0),
  };
}

type Run = ReturnType<typeof run>;

const applies = (evs: AnyEv[], stat: string, value: number) =>
  evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.stat === stat &&
      Math.abs(Number(e.value) - value) < 1e-6
  );

const buffApplyCount = (r: Run) =>
  r.evs.filter((e) => e.kind === 'buffApply').length;

const fullBursts = (r: Run) =>
  r.evs.filter((e) => e.kind === 'fullBurstStart').length;

function groupByExpiry(evs: AnyEv[]): AnyEv[][] {
  const m = new Map<any, AnyEv[]>();
  for (const e of evs) {
    const k = e.expiresFrame ?? 'none';
    if (!m.has(k)) {
      m.set(k, []);
    }
    m.get(k)!.push(e);
  }
  return [...m.values()];
}

// milk own burst casts: prefer her per-unit event row, fall back to a defensive
// scan of the global stream if the row exposes no events.
function milkBursts(r: Run): number {
  const own = r.ownEvents.filter((e) => e.kind === 'burstCast').length;
  if (own > 0) {
    return own;
  }
  return r.evs.filter(
    (e) =>
      e.kind === 'burstCast' &&
      [e.slug, e.targetSlug, e.unit, e.unitSlug].includes(SLUG)
  ).length;
}

// ADAPTED reader #2: SimResult unit rows carry NO per-unit `.events` array — the event stream
// is global (cfg.onEvent). Read the same damage events off the global stream, filtered by slug.
const burstHits = (r: Run) =>
  r.evs.filter(
    (e) =>
      e.kind === 'damage' &&
      e.slug === SLUG &&
      String(e.bucket ?? '')
        .toLowerCase()
        .includes('burst')
  );

// ---- hoisted runs: 8 full 180s sims ----
const BASE = run();
const NO_S1_ATK = run(
  withPatchedOverride(SLUG, (ov: any) =>
    dropEffects(ov, 'skill1', (e) => e.kind === 'buff' && e.stat === 'atkPct')
  )
);
// ADAPTED counterfactual #3: the driver encodes the permanent self-CD as
// charFixes.burstCooldownSec (the engine's only permanent-CD channel — a burstCdr block
// fires once per activation and cannot express "continuously"). Delete it when present;
// fall back to the blind's hypothesized skill1 burstCdr block-drop otherwise. Same intent:
// the no-CDR world must yield fewer/slower casts.
const NO_S1_CDR = run(
  withPatchedOverride(SLUG, (ov: any) => {
    if (ov.charFixes?.burstCooldownSec !== undefined) {
      delete ov.charFixes.burstCooldownSec;
    } else {
      dropEffects(ov, 'skill1', (e) => e.kind === 'burstCdr');
    }
  })
);
const NO_S2_CRITDMG = run(
  withPatchedOverride(SLUG, (ov: any) =>
    dropEffects(
      ov,
      'skill2',
      (e) => e.kind === 'buff' && e.stat === 'critDamagePct'
    )
  )
);
const NO_S2_CDR = run(
  withPatchedOverride(SLUG, (ov: any) =>
    dropEffects(ov, 'skill2', (e) => e.kind === 'burstCdr')
  )
);
const NO_BURST_DMG = run(
  withPatchedOverride(SLUG, (ov: any) => scaleBurstDamage(ov, 0))
);
const DOUBLE_BURST_DMG = run(
  withPatchedOverride(SLUG, (ov: any) => scaleBurstDamage(ov, 2))
);
const NO_BURST_HEAL = run(
  withPatchedOverride(SLUG, (ov: any) =>
    dropEffects(ov, 'burst', (e) => e.kind === 'heal')
  )
);

describe('milk — fixture sanity and non-vacuity', () => {
  it('milk is in the comp and deals damage', () => {
    expect(BASE.per[SLUG]).toBeGreaterThan(0);
  });

  it('milk actually casts her Burst I here, so the burst groups are not vacuous', () => {
    // index-free proof: zeroing her burst payload moves HER total.
    expect(BASE.milk).toBeGreaterThan(NO_BURST_DMG.milk);
    expect(milkBursts(BASE)).toBeGreaterThan(0);
  });
});

describe('skill1 a — every 20 sec, 3 highest-final-ATK allies, ATK 31.83% for 10 sec', () => {
  const ev = applies(BASE.evs, 'atkPct', S1_ATK_PCT);

  it('is a plain percentage ATK buff, not a caster-scaled flat ATK grant', () => {
    expect(ev.length).toBeGreaterThan(0);
    // casterAtkPct / highestAllyAtkPct re-emit FLAT-resolved ATK numbers, so a raw
    // 31.83 under stat atkPct is produced only by the faithful plain-percentage model.
    expect(applies(BASE.evs, 'casterAtkPct', S1_ATK_PCT)).toHaveLength(0);
    expect(applies(BASE.evs, 'highestAllyAtkPct', S1_ATK_PCT)).toHaveLength(0);
  });

  it('reaches exactly 3 distinct allies per activation — nearest-wrong all-allies gives 4', () => {
    const groups = groupByExpiry(ev);
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) {
      expect(new Set(g.map((e) => e.targetSlug)).size).toBe(S1_ATK_TARGETS);
    }
  });

  it('fires on a 20 sec cadence across the 180 sec fight', () => {
    // t=20,40,...,180 gives 9 activations; the first-fire phase (t=0 vs t=sec) is a
    // convention, so 8-10 groups all read as a faithful 20 sec interval, while a
    // wrong-cadence model (10 sec -> ~18 groups, 40 sec -> ~4) falls outside the band.
    const groups = groupByExpiry(ev);
    expect(groups.length).toBeGreaterThanOrEqual(8);
    expect(groups.length).toBeLessThanOrEqual(10);
  });

  it('carries a bounded 10 sec window, not a continuous grant', () => {
    for (const e of ev) {
      const exp = Number(e.expiresFrame);
      expect(Number.isFinite(exp)).toBe(true);
      expect(exp).toBeGreaterThan(0);
      expect(exp).toBeLessThanOrEqual(WINDOW_MAX);
    }
  });

  it('is load-bearing: dropping it lowers team damage', () => {
    expect(BASE.team).toBeGreaterThan(NO_S1_ATK.team);
  });
});

describe('skill1 b — start of battle, self, Burst Skill cooldown down 20 sec continuously', () => {
  it('is a SELF cooldown cut that buys milk more casts — base cd 40s becomes 20s', () => {
    expect(milkBursts(BASE)).toBeGreaterThan(milkBursts(NO_S1_CDR));
  });

  it('those extra casts show up in milk own damage', () => {
    expect(BASE.milk).toBeGreaterThan(NO_S1_CDR.milk);
  });
});

describe('skill2 a — above 80% HP, all allies, Critical Damage 11.13% continuously', () => {
  const ev = applies(BASE.evs, 'critDamagePct', S2_CRIT_DMG_PCT);
  const teamSize = Object.keys(BASE.per).length;

  it('grants Critical DAMAGE, not Critical Rate — scope trap 1 in the taxonomy', () => {
    expect(ev.length).toBeGreaterThan(0);
    expect(applies(BASE.evs, 'critRatePct', S2_CRIT_DMG_PCT)).toHaveLength(0);
    expect(
      applies(BASE.evs, 'critRateNormalPct', S2_CRIT_DMG_PCT)
    ).toHaveLength(0);
  });

  it('reaches every ally including milk herself — nearest-wrong self-only or excludeSelf', () => {
    const hit = new Set(ev.map((e) => e.targetSlug));
    expect(hit.size).toBe(teamSize);
    expect(hit.has(SLUG)).toBe(true);
  });

  it('is continuous, not a timed window', () => {
    for (const e of ev) {
      const exp = e.expiresFrame;
      const continuous =
        exp === undefined ||
        exp === null ||
        !Number.isFinite(Number(exp)) ||
        Number(exp) >= FIGHT_FRAMES;
      expect(continuous).toBe(true);
    }
  });

  it('is load-bearing: dropping it lowers team damage', () => {
    expect(BASE.team).toBeGreaterThan(NO_S2_CRITDMG.team);
  });
});

describe('skill2 b — every 10 Full Charge attacks, all allies, Burst cooldown down 2.83 sec', () => {
  // milk is a 60-frame-charge SR with a 6-round magazine, so 10 full charges land
  // roughly every 15-18 sec: about 10 procs across the fight, ~28 sec of team-wide
  // cooldown relief. A RED here means the line is inert at scope lock, which is a
  // real finding about the model, not a fixture artefact.
  it('is not inert: removing the charge-driven cooldown relief changes the outcome', () => {
    expect(BASE.team).not.toBe(NO_S2_CDR.team);
  });

  it('never reduces the number of full bursts — cooldown relief is monotone', () => {
    expect(fullBursts(BASE)).toBeGreaterThanOrEqual(fullBursts(NO_S2_CDR));
  });
});

describe('burst a — 367.34% of final ATK as Burst Skill damage, highest-final-DEF enemy', () => {
  it('lands exactly one burst-bucket hit per milk cast', () => {
    const hits = burstHits(BASE);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.length).toBe(milkBursts(BASE));
  });

  it('scales linearly with the kit percentage, so 367.34% is the live magnitude', () => {
    const lost = BASE.milk - NO_BURST_DMG.milk;
    const gained = DOUBLE_BURST_DMG.milk - BASE.milk;
    expect(lost).toBeGreaterThan(0);
    expect(Math.abs(gained - lost) / lost).toBeLessThan(0.02);
  });

  it('is Full-Burst exempt — a burst cast resolves before the FB window opens', () => {
    for (const e of burstHits(BASE)) {
      expect(e.fbMajorApplied === true).toBe(false);
    }
  });

  it('takes no core bonus — the kit never calls it a core strike', () => {
    for (const e of burstHits(BASE)) {
      const core = e.core ?? e.coreRate ?? 0;
      expect(Number(core) > 0).toBe(false);
    }
  });

  it('moves nobody else: pure damage, no rotation or buff side effect', () => {
    for (const slug of Object.keys(BASE.per)) {
      if (slug === SLUG) {
        continue;
      }
      expect(NO_BURST_DMG.per[slug]).toBe(BASE.per[slug]);
    }
  });
});

describe('burst b — all allies, recovers 16.16% of attack damage as HP over 10 sec', () => {
  // The engine has no heal/recovery event kind, so the ONLY blind observable is the
  // tandem: crown carries an on-recovery consumer whose buffApply count tracks how
  // many recovery events milk emits. Skipping this line as isolation-inert is the
  // taxonomy-4 trap this group exists to catch.
  it('is not isolation-inert: the on-recovery consumer fires more with the heal present', () => {
    expect(buffApplyCount(BASE)).toBeGreaterThan(buffApplyCount(NO_BURST_HEAL));
  });

  it('is a heal-over-time, not a single instant tick', () => {
    // over 10 sec means ~10 recovery emissions per cast; a ticks:1 model yields ~1.
    const delta = buffApplyCount(BASE) - buffApplyCount(NO_BURST_HEAL);
    const casts = Math.max(1, milkBursts(BASE));
    expect(delta / casts).toBeGreaterThan(3);
  });

  it('its tandem contribution is non-negative for the team', () => {
    expect(BASE.team).toBeGreaterThanOrEqual(NO_BURST_HEAL.team);
  });
});

describe('milk — gaps not assertable at scope lock', () => {
  it.skip('burst b — Incoming healing 75.5% for 10 sec: no StatKey for incoming healing and no HP pool in v1', () => {});

  it.skip('skill2 a — the above-80%-HP gate is unfalsifiable: the v1 boss deals no damage so the condition is permanently true', () => {});

  it.skip('skill1 a — highest FINAL ATK vs static ATK ranking is indistinguishable unless the live ranking flips mid-fight', () => {});

  it.skip('burst a — highest final DEF target selection is unobservable: a single partless boss is the only enemy entity', () => {});
});
