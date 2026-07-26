/**
 * EVE (`eve`) — AR / Iron / Attacker / Burst III; ammo 60, reload 81f, normal mult 13.65, core mult 200.
 * BLIND kit-spec test: written from the kit prose ALONE (no sight of any override, driver test, or truth file).
 *
 * KIT LINES (structural read of the prose; per-line disposition lives in the spec JSON):
 *   S1-a passive / self      : Impact-Type Exospine — Critical Rate ▲60% continuously. UNSCOPED — the text does
 *                              NOT say of normal attacks ⇒ critRatePct, never the normals-scoped variant.
 *   S1-b after 44 CRITICAL normal hits / random enemy : Unstable Energy — 240% of final ATK, 3 sequential hits.
 *                              The counter is CRIT-gated, so a faithful hitCount threshold must be ~44/critRate,
 *                              i.e. STRICTLY MORE than 44 raw normal hits per proc.
 *   S1-c when Unstable Energy hits an ELECTRIC target : Damage Taken ▲10% for 10 sec — a BOSS debuff (team-wide),
 *                              element-gated, therefore INERT on the non-Electric scope-lock boss.
 *   S2-a passive / self      : Eagle Eye-Type Exospine — ATK ▲50% OF THE SKILL USER ATK (caster-scaled ⇒ emitted
 *                              flat-resolved, not as the raw 50) + Max Ammunition Capacity ▲25% continuously.
 *   S2-b every 10 normal hits on an ELECTRIC target / self : reloads 3 rounds — element-gated ⇒ inert here.
 *   B-a  burst / random enemy : 457.14% of final ATK, 6 sequential hits (burst-cast ⇒ lands pre-Full-Burst).
 *   B-b  burst / self, 10 sec : Exospine Mk2 — Unstable Energy sequential multiplier scaled by 100% (×2).
 *                              The second Mk2 clause scales the damage multiplier of Eagle Eye-Type Exospine,
 *                              but the modeled Eagle Eye lines carry NO damage multiplier at all ⇒ GAP (it.skip).
 *
 * FIXTURE: controlComp('eve', true) — liter B1 / crown B2 / eve B3 / helm B3, Fire boss, 180 s, deterministic.
 *   eve is a Burst III carry: without the B1+B2 the team makes ZERO Full Bursts and B-a / B-b would be vacuous.
 *   helm stays in (second B3) so the burst-cast vs full-burst-enter distinction is actually exercised: eve does
 *   not necessarily cast on every rotation, so B-b is measured per-CAST window, not per Full Burst.
 *   The scope-lock boss is NOT Electric ⇒ S1-c and S2-b are inert BY KIT GATE here; they are proved
 *   modeled-but-gated with gate-stripping counterfactuals, never by a bare absence (absence == dropped line).
 *
 * COUNTERFACTUALS (all via withPatchedOverride — in-memory clone, committed JSON untouched; no writes to the tree):
 *   critZero   crit 60 → 0                       : a dropped or inert crit line cannot move damage.
 *   critScoped critRatePct → critRateNormalPct    : the nearest-wrong SCOPE. Only moves her NON-normal damage if
 *                                                   the faithful unscoped reading is what is in the model.
 *   atkZero    casterAtkPct → 0                   : proves the ATK line is live AND self-only (allies unmoved).
 *   ammoZero   maxAmmoPct → 0                     : a weapon-state line IS damage — fewer rounds ⇒ MORE reloads.
 *   s1GateOff  drop bossElementGate on skill1     : the Damage Taken debuff must APPEAR and lift TEAM damage.
 *   s2GateOff  drop bossElementGate on skill2     : the 3-round reload rider must APPEAR and lift eve damage.
 *   mk2Off     strip the burst SELF block effects : isolates Exospine Mk2 from the Full-Burst / ally-buff confound
 *                                                   by comparing the in-window vs out-window Unstable Energy
 *                                                   damage RATIO in base against the same ratio with Mk2 gone —
 *                                                   both runs share the FB uplift, so only Mk2 can move the ratio.
 *
 * Event field NAMES beyond the documented set are read permissively (num()/rate()/amount()) so a shape guess
 * never silently turns an assertion vacuous; the sanity block asserts the readers actually resolved.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
  // Driver path-fix (2026-07-25): the blind author assumed a scripts/tests/units/ home; this
  // artifact lives in scripts/kit-autonomy/blind/, so the harness is two levels up under tests/.
  // Mechanical import correction ONLY — no assertion or fixture logic was touched.
} from '../../tests/lib/harness.js';

const SLUG = 'eve';

/** Blind-shape safety: not every event field name is documented, so read them permissively. */
type Ev = SimEvent & Record<string, any>;

// ------------------------------------------------------------------ override walkers

const SLOTS = ['skill1', 'skill2', 'burst'] as const;

/** The override file is slot-keyed; a slot is either a Block[] or a CharacterSkills carrying blocks[]. */
function blocksOf(ov: any, slot: string): any[] {
  const s = ov?.[slot];
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return Array.isArray(s.blocks) ? s.blocks : [];
}
function eachEffect(
  ov: any,
  fn: (eff: any, block: any, slot: string) => void,
): void {
  for (const slot of SLOTS) {
    for (const b of blocksOf(ov, slot)) {
      for (const eff of b.effects ?? []) fn(eff, b, slot);
    }
  }
}
function setStat(ov: any, stat: string, value: number): void {
  eachEffect(ov, (eff) => {
    if (eff.kind === 'buff' && eff.stat === stat) eff.value = value;
  });
}
function renameStat(ov: any, from: string, to: string): void {
  eachEffect(ov, (eff) => {
    if (eff.kind === 'buff' && eff.stat === from) eff.stat = to;
  });
}

// ------------------------------------------------------------------ run harness

type Run = { res: any; evs: Ev[]; tot: Record<string, number> };

function runWith(patch?: (ov: any) => void): Run {
  const opts: any = controlComp(SLUG, true);
  if (patch) {
    opts.overrides = {
      ...(opts.overrides ?? {}),
      [SLUG]: withPatchedOverride(SLUG, patch as any),
    };
  }
  const evs: Ev[] = [];
  opts.cfg = {
    ...(opts.cfg ?? {}),
    onEvent: (ev: SimEvent) => {
      evs.push(ev as Ev);
    },
  };
  const res = runComp(opts);
  return { res, evs, tot: totals(res) as Record<string, number> };
}

// ------------------------------------------------------------------ permissive event readers

function num(e: Ev, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = (e as any)[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return undefined;
}
const CRIT_KEYS = ['critRate', 'critChance', 'critPct', 'crit'];
const CORE_KEYS = ['coreRate', 'coreChance', 'corePct', 'core'];
const AMOUNT_KEYS = ['amount', 'damage', 'dmg', 'dealt', 'value', 'total'];
const TIME_KEYS = ['t', 'time', 'sec', 'seconds'];
const FRAME_KEYS = ['frame', 'tick', 'f'];

/** rates may be emitted as 0..1 or as percentage points; normalise to 0..1. */
function rate(e: Ev, keys: string[]): number {
  const v = num(e, keys);
  if (v === undefined) return 0;
  return v > 1 ? v / 100 : v;
}
function amount(e: Ev): number | undefined {
  return num(e, AMOUNT_KEYS);
}
function timeSec(e: Ev): number | undefined {
  const t = num(e, TIME_KEYS);
  if (t !== undefined) return t;
  const f = num(e, FRAME_KEYS);
  return f === undefined ? undefined : f / 60;
}
function srcSlot(e: Ev): string {
  return String(e.srcSlot ?? e.slot ?? 'normal');
}
function isNormalHit(e: Ev): boolean {
  return srcSlot(e) === 'normal' || String(e.bucket ?? '') === 'normal';
}

/** eve unit index, taken from a self buffApply (targetSlug is documented on buffApply). */
function eveIdx(evs: Ev[]): number | null {
  for (const e of evs) {
    if (
      e.kind === 'buffApply' &&
      e.targetSlug === SLUG &&
      typeof e.targetIdx === 'number'
    )
      return e.targetIdx;
  }
  return null;
}
function isOwn(e: Ev, idx: number | null): boolean {
  const owner = e.slug ?? e.unit ?? e.casterSlug ?? e.sourceSlug ?? e.srcSlug;
  if (owner === SLUG) return true;
  const i = e.srcIdx ?? e.casterIdx ?? e.unitIdx ?? e.idx;
  return idx !== null && typeof i === 'number' && i === idx;
}
/** eve-attributed damage events: prefer the per-unit result row, else attribute from the global log. */
function eveDamage(r: Run): Ev[] {
  const row: any = unitOf(r.res, SLUG);
  if (Array.isArray(row?.events)) {
    const own = (row.events as Ev[]).filter((e) => e.kind === 'damage');
    if (own.length) return own;
  }
  const idx = eveIdx(r.evs);
  return r.evs.filter((e) => e.kind === 'damage' && isOwn(e, idx));
}
function eveEvents(r: Run, kind: string): Ev[] {
  const idx = eveIdx(r.evs);
  return r.evs.filter((e) => e.kind === kind && isOwn(e, idx));
}
function selfBuffs(r: Run): Ev[] {
  return r.evs.filter(
    (e) =>
      e.kind === 'buffApply' &&
      e.targetSlug === SLUG &&
      e.casterIdx != null &&
      e.targetIdx != null &&
      e.casterIdx === e.targetIdx,
  );
}
function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
}
function teamTotal(t: Record<string, number>): number {
  return Object.values(t).reduce((a, b) => a + b, 0);
}

/** Unstable Energy damage split by the 10 s window that follows each of eve OWN burst casts. */
function ueWindows(r: Run): { inW: number[]; outW: number[]; casts: number } {
  const castTimes = eveEvents(r, 'burstCast')
    .map((e) => timeSec(e))
    .filter((t): t is number => t !== undefined);
  const inW: number[] = [];
  const outW: number[] = [];
  for (const e of eveDamage(r).filter((d) => srcSlot(d) === 'skill1')) {
    const t = timeSec(e);
    const a = amount(e);
    if (t === undefined || a === undefined) continue;
    (castTimes.some((c) => t >= c && t <= c + 10) ? inW : outW).push(a);
  }
  return { inW, outW, casts: castTimes.length };
}

// ------------------------------------------------------------------ hoisted runs (8 sims)

const base = runWith();
const critZero = runWith((ov) => setStat(ov, 'critRatePct', 0));
const critScoped = runWith((ov) =>
  renameStat(ov, 'critRatePct', 'critRateNormalPct'),
);
const atkZero = runWith((ov) => setStat(ov, 'casterAtkPct', 0));
const ammoZero = runWith((ov) => setStat(ov, 'maxAmmoPct', 0));
const s1GateOff = runWith((ov) => {
  for (const b of blocksOf(ov, 'skill1')) delete b.bossElementGate;
});
const s2GateOff = runWith((ov) => {
  for (const b of blocksOf(ov, 'skill2')) delete b.bossElementGate;
});
const mk2Off = runWith((ov) => {
  for (const b of blocksOf(ov, 'burst'))
    if (b.target?.kind === 'self') b.effects = [];
});

const ALLIES = Object.keys(base.tot).filter((s) => s !== SLUG);
const baseDmg = eveDamage(base);
const baseNormals = baseDmg.filter(isNormalHit);
const baseUE = baseDmg.filter((e) => srcSlot(e) === 'skill1');
const baseBurstHits = baseDmg.filter((e) => srcSlot(e) === 'burst');

// ------------------------------------------------------------------ tests

describe('eve — fixture sanity (non-vacuity floor for everything below)', () => {
  it('eve fires, procs Unstable Energy, and the team reaches Full Burst', () => {
    expect(base.tot[SLUG]).toBeGreaterThan(0);
    expect(baseNormals.length).toBeGreaterThan(0);
    expect(baseUE.length).toBeGreaterThan(0);
    expect(base.evs.some((e) => e.kind === 'fullBurstStart')).toBe(true);
    expect(ALLIES.length).toBe(3);
  });

  it('the permissive event readers actually resolved (else assertions would be vacuous)', () => {
    expect(baseNormals.some((e) => amount(e) !== undefined)).toBe(true);
    expect(
      baseNormals.reduce((s, e) => s + rate(e, CRIT_KEYS), 0),
    ).toBeGreaterThan(0);
    expect(
      Math.max(...baseNormals.map((e) => rate(e, CORE_KEYS))),
    ).toBeGreaterThan(0);
  });
});

describe('eve S1-a — Impact-Type Exospine: Critical Rate ▲60%, self, continuous, UNSCOPED', () => {
  it('applies an unscoped critRatePct 60 self-buff, not the normal-attack-scoped stat', () => {
    const stats = new Set(
      selfBuffs(base)
        .filter((e) => e.value === 60)
        .map((e) => String(e.stat)),
    );
    expect(stats.has('critRatePct')).toBe(true);
    expect(stats.has('critRateNormalPct')).toBe(false);
  });

  it('is load-bearing: zeroing it strictly lowers eve damage', () => {
    expect(critZero.tot[SLUG]).toBeLessThan(base.tot[SLUG]);
  });

  it('UNSCOPED is discriminating: re-scoping to normals-only strictly lowers her NON-normal damage', () => {
    // nearest-wrong = critRateNormalPct. Under the faithful reading her skill/burst riders are crit-eligible
    // at the 60% sheet lift; under the scoped model they are not, so the non-normal damage must fall.
    const nonNormal = (r: Run) =>
      eveDamage(r)
        .filter((e) => !isNormalHit(e))
        .reduce((s, e) => s + (amount(e) ?? 0), 0);
    expect(nonNormal(base)).toBeGreaterThan(0);
    expect(nonNormal(critScoped)).toBeLessThan(nonNormal(base));
  });

  it('is self-scoped: allies are byte-identical when eve crit is zeroed', () => {
    for (const a of ALLIES) expect(critZero.tot[a]).toBe(base.tot[a]);
  });
});

describe('eve S1-b — Unstable Energy: 240% x3 sequential, after 44 CRITICAL normal hits', () => {
  it('procs in groups of exactly 3 sequential hits', () => {
    expect(baseUE.length).toBeGreaterThanOrEqual(3);
    expect(baseUE.length % 3).toBe(0);
  });

  it('the counter is CRIT-gated: proc count tracks 44 CRITICAL hits, not 44 raw normal hits', () => {
    // Crit hits landed = the crit-rate-weighted sum over her normal hits (the engine resolves crit as a rate),
    // read live off the log so no cadence or sheet-crit assumption is baked in.
    const critHits = baseNormals.reduce((s, e) => s + rate(e, CRIT_KEYS), 0);
    const activations = baseUE.length / 3;
    const expected = critHits / 44;
    const naive = baseNormals.length / 44; // the nearest-wrong: hitCount 44 on RAW hits
    expect(critHits).toBeGreaterThan(0);
    expect(activations).toBeGreaterThan(0);
    expect(Math.abs(activations - expected)).toBeLessThanOrEqual(
      Math.max(2, 0.25 * expected),
    );
    // non-vacuity: only assert the separation when the two models genuinely differ (crit rate well under 100%)
    if (naive > expected * 1.15) expect(activations).toBeLessThan(naive * 0.95);
  });

  it('Unstable Energy hits take NO core bonus and NO range bonus (rider convention)', () => {
    // the kit says nothing about core strikes, and function-damage riders are force-set no-range.
    expect(baseUE.every((e) => rate(e, CORE_KEYS) === 0)).toBe(true);
    expect(baseUE.every((e) => e.rangeApplied !== true)).toBe(true);
  });
});

describe('eve S1-c — Damage Taken ▲10% / 10 s, gated on an ELECTRIC target', () => {
  it('is INERT against the non-Electric scope-lock boss', () => {
    const dt = base.evs.filter(
      (e) =>
        e.kind === 'buffApply' && e.stat === 'damageTakenPct' && e.value === 10,
    );
    expect(dt.length).toBe(0);
  });

  it('non-vacuity: with the element gate removed it fires as a boss-held debuff and lifts TEAM damage', () => {
    const dt = s1GateOff.evs.filter(
      (e) =>
        e.kind === 'buffApply' && e.stat === 'damageTakenPct' && e.value === 10,
    );
    expect(dt.length).toBeGreaterThan(0); // RED if the line was dropped instead of gated
    expect(dt.every((e) => e.casterIdx === null && e.targetIdx === null)).toBe(
      true,
    ); // boss-held, not a self buff
    expect(teamTotal(s1GateOff.tot)).toBeGreaterThan(teamTotal(base.tot));
    for (const a of ALLIES)
      expect(s1GateOff.tot[a]).toBeGreaterThan(base.tot[a]); // team-wide, not eve-only
  });

  it('the window is a bounded 10 s, not permanent', () => {
    const dt = s1GateOff.evs.filter(
      (e) =>
        e.kind === 'buffApply' && e.stat === 'damageTakenPct' && e.value === 10,
    );
    expect(dt.every((e) => Number.isFinite(e.expiresFrame))).toBe(true);
    const first = dt.find(
      (e) => typeof e.expiresFrame === 'number' && timeSec(e) !== undefined,
    );
    if (first) {
      const held =
        (first.expiresFrame as number) / 60 - (timeSec(first) as number);
      expect(Math.abs(held - 10)).toBeLessThan(0.6);
    }
  });
});

describe('eve S2-a — Eagle Eye-Type Exospine: ATK ▲50% of the skill user ATK, Max Ammo ▲25%', () => {
  it('the ATK line is CASTER-scaled (flat-resolved), not a self-scaling atkPct 50', () => {
    const sb = selfBuffs(base);
    const caster = sb.filter((e) => e.stat === 'casterAtkPct');
    expect(caster.length).toBeGreaterThan(0);
    expect(caster[0].value).toBeGreaterThan(100); // flat ATK at apply time, never the raw kit 50
    expect(sb.some((e) => e.stat === 'atkPct' && e.value === 50)).toBe(false); // the nearest-wrong encoding
  });

  it('the ATK line is live and SELF-only: zeroing it drops eve, allies byte-identical', () => {
    expect(atkZero.tot[SLUG]).toBeLessThan(base.tot[SLUG]);
    for (const a of ALLIES) expect(atkZero.tot[a]).toBe(base.tot[a]);
  });

  it('Max Ammunition Capacity ▲25% is applied to eve', () => {
    expect(
      selfBuffs(base).some((e) => e.stat === 'maxAmmoPct' && e.value === 25),
    ).toBe(true);
  });

  it('the ammo line IS damage: removing it forces more reloads and less damage', () => {
    const reloads = (r: Run) => eveEvents(r, 'reload').length;
    expect(reloads(base)).toBeGreaterThan(0);
    expect(reloads(ammoZero)).toBeGreaterThan(reloads(base));
    expect(ammoZero.tot[SLUG]).toBeLessThan(base.tot[SLUG]);
  });
});

describe('eve S2-b — every 10 normal hits on an ELECTRIC target: reloads 3 rounds', () => {
  it('is INERT here by kit gate, but modeled: stripping the element gate raises eve damage', () => {
    // RED if the rider was silently dropped (a weapon-state line that gates shots fired is damage).
    expect(s2GateOff.tot[SLUG]).toBeGreaterThan(base.tot[SLUG]);
  });

  it('gating it off does not disturb the allies through anything but eve own economy', () => {
    // eve reloads less ⇒ she fires more; her allies must not receive any buff from this line.
    const s2Buffs = s2GateOff.evs.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.targetSlug !== SLUG &&
        e.casterIdx === eveIdx(s2GateOff.evs),
    );
    const baseBuffs = base.evs.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.targetSlug !== SLUG &&
        e.casterIdx === eveIdx(base.evs),
    );
    expect(s2Buffs.length).toBe(baseBuffs.length);
  });
});

describe('eve burst A — 457.14% of final ATK, 6 sequential hits, random enemy', () => {
  it('emits hits in multiples of 6, one group per eve burst cast', () => {
    expect(baseBurstHits.length).toBeGreaterThanOrEqual(6);
    expect(baseBurstHits.length % 6).toBe(0);
    const casts = eveEvents(base, 'burstCast').length;
    if (casts > 0) expect(baseBurstHits.length).toBe(6 * casts);
  });

  it('burst-cast damage is Full-Burst exempt (it resolves before the window opens)', () => {
    expect(baseBurstHits.every((e) => e.inFullBurst !== true)).toBe(true);
    expect(baseBurstHits.every((e) => e.fbMajorApplied !== true)).toBe(true);
  });

  it('burst hits take no range bonus and no core bonus', () => {
    expect(baseBurstHits.every((e) => e.rangeApplied !== true)).toBe(true);
    expect(baseBurstHits.every((e) => rate(e, CORE_KEYS) === 0)).toBe(true);
  });
});

describe('eve burst B — Exospine Mk2: Unstable Energy multiplier scaled by 100% for 10 s', () => {
  it('is modeled: stripping the burst SELF block strictly lowers eve damage', () => {
    expect(mk2Off.tot[SLUG]).toBeLessThan(base.tot[SLUG]);
  });

  it('scales UNSTABLE ENERGY specifically — the in-window / out-window UE ratio collapses without it', () => {
    // The 10 s post-cast window IS the Full Burst window, so in-window UE hits are inflated by the FB major and
    // the ally buffs REGARDLESS of Mk2. Comparing the RATIO across base and mk2Off cancels that confound: both
    // runs share the same FB uplift, so only the Mk2 multiplier can separate them.
    const b = ueWindows(base);
    const o = ueWindows(mk2Off);
    expect(b.casts).toBeGreaterThan(0);
    expect(b.inW.length).toBeGreaterThan(0);
    expect(b.outW.length).toBeGreaterThan(0);
    expect(o.inW.length).toBeGreaterThan(0);
    expect(o.outW.length).toBeGreaterThan(0);
    const ratioBase = mean(b.inW) / mean(b.outW);
    const ratioOff = mean(o.inW) / mean(o.outW);
    expect(ratioBase).toBeGreaterThan(ratioOff * 1.05);
  });

  it('the enhancement is a bounded 10 s self window, not a permanent upgrade', () => {
    const idx = eveIdx(base.evs);
    const mk2 = base.evs.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.targetSlug === SLUG &&
        e.casterIdx === idx &&
        e.casterIdx === e.targetIdx,
    );
    const timed = mk2.filter((e) => Number.isFinite(e.expiresFrame));
    expect(timed.length).toBeGreaterThan(0); // the continuous S1/S2 passives are unbounded; Mk2 must not be
    const ten = timed.filter((e) => {
      const t = timeSec(e);
      return (
        t !== undefined &&
        Math.abs((e.expiresFrame as number) / 60 - t - 10) < 0.6
      );
    });
    expect(ten.length).toBeGreaterThan(0);
  });

  // GAP: the second Mk2 clause scales the damage multiplier of Eagle Eye-Type Exospine, but the Eagle Eye lines in
  // this kit prose are ATK ▲ and Max Ammo ▲ — there is no damage multiplier on them to scale. Either the clause has
  // an unstated damage payload (outside the input domain) or it is a no-op; a blind test cannot decide. ⚑
  it.skip('burst Mk2 clause 2 — Eagle Eye damage multiplier scaled by 100% (GAP: no multiplier referent in the prose)', () => {});

  // GAP: S2 line Previous effects trigger repeatedly has no referent the engine can resolve — it may mean the S1
  // Unstable Energy proc re-arms, or it may be display flavour for the continuous passives. No primitive for either
  // reading without a measurement of the proc cadence. ⚑
  it.skip('S2 — Previous effects trigger repeatedly (GAP: unresolvable referent / no primitive)', () => {});
});
