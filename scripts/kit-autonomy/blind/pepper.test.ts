/**
 * pepper (SG / Wind / Supporter / Burst I) — BLIND kit spec test.
 * Written from kit prose alone: no sight of the shipped override, the driver's tests, or history.
 *
 * KIT AS READ
 *   s1-a  "Activates when the last bullet hits the target" -> 1 ally with the lowest HP%,
 *         restores 4.45% of the SKILL USER's final Max HP. So: trigger lastBullet / target
 *         alliesLowestHp(1) / effect heal. The HP magnitude is unmodelable (v1 has no HP pool);
 *         what IS testable is the trigger, the target set, and that the heal is not silently dropped.
 *   s1-b  same trigger, ALL allies: "Refresh Heart" incoming healing up 6.53%, max 5 stacks, 15 sec.
 *         No StatKey exists for incoming healing, so the STAT is a GAP; the 5-stack COUNT is
 *         load-bearing (the burst's third block gates on it) and must be tracked somehow.
 *   s2    NO activation clause -> interval trigger (the PERIOD is not in the kit text: ALWAYS-flag).
 *         1 highest-final-ATK enemy: 160% of final ATK, plus ATK down 3.55% for 5 sec ON THE ENEMY.
 *   b-a   1 highest-final-ATK enemy: 1237.5% of final ATK as Burst Skill damage (burst-cast damage
 *         lands before the Full Burst window opens, so it must NOT take the +50% FB major).
 *   b-b   all allies: "Increases stack count of stackable buffs by 1" -> no schema primitive: GAP.
 *   b-c   gated on Refresh Heart AT MAX STACKS, all allies: heal 27.22% of the user's Max HP.
 *
 * FIXTURE  controlComp('pepper', true) = liter(B1) / crown(B2) / pepper / helm(B3). The fixed B3 is
 * kept: without a stage-3 caster the chain never reaches Full Burst, and both the rotation and the
 * FB-exemption assertion need real Full Bursts. RISK THIS FILE DELIBERATELY SURFACES: pepper is
 * herself a Burst I and therefore contends with liter for the B1 slot every rotation, so "pepper
 * casts her own burst" is asserted explicitly (its own test) instead of assumed.
 *
 * FIELD-NAME DEFENSIVENESS: written without sight of the event/override literals, this file resolves
 * the unit index, the time unit, the damage-bucket keys and the slot-array-vs-CharacterSkills
 * override shape AT RUNTIME. Every resolution is itself asserted, so a wrong guess fails loudly as a
 * fixture error rather than silently passing a vacuous test.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // path fixed by driver: blind/ sits under kit-autonomy/, not tests/units/

const SLUG = 'pepper';

type Loose = Record<string, unknown>;
const loose = (o: unknown): Loose => o as Loose;

const kindOf = (ev: SimEvent): string => String(loose(ev).kind ?? '');

// ---- runtime resolution of things a blind author cannot know -------------------------------

function rawTime(ev: SimEvent): number {
  const e = loose(ev);
  for (const k of ['frame', 'atFrame', 'tick', 't', 'time', 'sec', 'atSec']) {
    const v = e[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return Number.NaN;
}

// 180 s fight = 10800 frames; anything above ~400 is therefore a frame count, below it is seconds.
function secOf(ev: SimEvent, maxRaw: number): number {
  const raw = rawTime(ev);
  return maxRaw > 400 ? raw / 60 : raw;
}

const SLUG_KEYS = ['slug', 'unit', 'unitSlug', 'srcSlug', 'caster', 'casterSlug', 'source'];
const IDX_KEYS = ['unitIdx', 'srcIdx', 'casterIdx', 'idx', 'slotIdx', 'src', 'srcSlot', 'slot'];

function isFrom(ev: SimEvent, slug: string, idx: number | null): boolean {
  const e = loose(ev);
  if (SLUG_KEYS.some((k) => e[k] === slug)) return true;
  return idx !== null && IDX_KEYS.some((k) => e[k] === idx);
}

// buffApply carries BOTH targetIdx and targetSlug, so it is the one event that lets us learn the
// index<->slug mapping the damage/reload/burstCast events may be keyed by.
function slugIndex(events: SimEvent[], slug: string): number | null {
  for (const ev of events) {
    const e = loose(ev);
    if (e.targetSlug === slug && typeof e.targetIdx === 'number') return e.targetIdx;
  }
  return null;
}

function bucketCounts(evs: SimEvent[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const ev of evs) {
    const b = String(loose(ev).bucket ?? '?');
    m.set(b, (m.get(b) ?? 0) + 1);
  }
  return m;
}

function coreRateOf(ev: SimEvent): number {
  const e = loose(ev);
  for (const k of ['coreRate', 'core', 'coreChance', 'coreP']) {
    const v = e[k];
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
  }
  return 0;
}

// The override FILE is slot-keyed; the packet describes the slot value BOTH as a bare Block[] and as
// a CharacterSkills carrying blocks[]. Handle either without guessing.
function blocksOf(ov: unknown, slot: string): Loose[] {
  const s = loose(ov)[slot];
  if (Array.isArray(s)) return s as Loose[];
  const b = s && typeof s === 'object' ? loose(s).blocks : undefined;
  return Array.isArray(b) ? (b as Loose[]) : [];
}

function clearSlot(slot: 'skill1' | 'skill2' | 'burst') {
  return withPatchedOverride(SLUG, (ov) => {
    const s = loose(ov)[slot];
    if (Array.isArray(s)) {
      s.length = 0;
      return;
    }
    if (s && typeof s === 'object') {
      const b = loose(s).blocks;
      if (Array.isArray(b)) b.length = 0;
    }
  });
}

interface Run {
  res: ReturnType<typeof runComp>;
  events: SimEvent[];
}

function run(overrides?: Record<string, unknown>): Run {
  const events: SimEvent[] = [];
  const onEvent = (ev: SimEvent): void => {
    events.push(ev);
  };
  const opts = controlComp(SLUG, true);
  const l = loose(opts);
  l.onEvent = onEvent;
  l.cfg = { ...((l.cfg as Loose | undefined) ?? {}), onEvent };
  if (overrides) l.overrides = { ...((l.overrides as Loose | undefined) ?? {}), ...overrides };
  return { res: runComp(opts), events };
}

// ---- hoisted runs (3 full 180 s sims) ------------------------------------------------------

const OV = withPatchedOverride(SLUG, () => {
  // read-only clone of the committed override, for the structural assertions
});

const STOCK = run();
const NO_S2 = run({ [SLUG]: clearSlot('skill2') });
const NO_BURST = run({ [SLUG]: clearSlot('burst') });

const PEPPER_IDX = slugIndex(STOCK.events, SLUG);

let MAX_RAW = 0;
for (const ev of STOCK.events) {
  const r = rawTime(ev);
  if (Number.isFinite(r) && r > MAX_RAW) MAX_RAW = r;
}

const pepperDamage = (r: Run): SimEvent[] =>
  r.events.filter((e) => kindOf(e) === 'damage' && isFrom(e, SLUG, PEPPER_IDX));

const STOCK_DMG = pepperDamage(STOCK);
const NO_S2_DMG = pepperDamage(NO_S2);
const NO_BURST_DMG = pepperDamage(NO_BURST);

const STOCK_B = bucketCounts(STOCK_DMG);
const NO_S2_B = bucketCounts(NO_S2_DMG);
const NO_BURST_B = bucketCounts(NO_BURST_DMG);

// pepper's skill1 carries NO damage, so her skill bucket holds skill2's 160% rider and nothing
// else: clearing skill2 must take that bucket to exactly zero. Same logic for the burst bucket.
const SKILL_BUCKETS = [...STOCK_B.keys()].filter(
  (k) => (STOCK_B.get(k) ?? 0) > 0 && (NO_S2_B.get(k) ?? 0) === 0,
);
const BURST_BUCKETS = [...STOCK_B.keys()].filter(
  (k) => (STOCK_B.get(k) ?? 0) > 0 && (NO_BURST_B.get(k) ?? 0) === 0,
);

const inBuckets = (evs: SimEvent[], keys: string[]): SimEvent[] =>
  evs.filter((e) => keys.includes(String(loose(e).bucket ?? '?')));

const RELOAD_TIMES = STOCK.events
  .filter((e) => kindOf(e) === 'reload' && isFrom(e, SLUG, PEPPER_IDX))
  .map((e) => secOf(e, MAX_RAW))
  .filter((t) => Number.isFinite(t))
  .sort((a, b) => a - b);

const PEPPER_BURST_CASTS = STOCK.events.filter(
  (e) => kindOf(e) === 'burstCast' && isFrom(e, SLUG, PEPPER_IDX),
);

describe('pepper — fixture validity (asserted, never assumed)', () => {
  it('the comp runs, emits events, and contains pepper', () => {
    expect(STOCK.events.length).toBeGreaterThan(0);
    expect(() => unitOf(STOCK.res, SLUG)).not.toThrow();
    expect(totals(STOCK.res)[SLUG]).toBeGreaterThan(0);
  });

  it('resolves pepper\u2019s unit index and a usable timeline, and reaches Full Burst', () => {
    expect(PEPPER_IDX).not.toBeNull();
    expect(MAX_RAW).toBeGreaterThan(0);
    expect(STOCK.events.filter((e) => kindOf(e) === 'fullBurstStart').length).toBeGreaterThan(0);
    // non-vacuity for every event-keyed assertion below
    expect(STOCK_DMG.length).toBeGreaterThan(0);
  });

  it('pepper (Burst I) actually casts her OWN burst alongside liter (Burst I)', () => {
    // Deliberate hard assertion, not an assumption: controlComp seats liter in the B1 slot, so a
    // Burst I carry contends for it. Every burst-slot assertion in this file is vacuous if she
    // never casts, so a RED here means the burst lines need a different fixture, not that the
    // burst model is wrong.
    expect(PEPPER_BURST_CASTS.length).toBeGreaterThan(0);
  });
});

describe('pepper skill2 — "Deals 160% of final ATK as damage" (no activation clause -> interval)', () => {
  it('is a REAL damage line, not a defensive/inert skip', () => {
    // Nearest-wrong: skill2 modeled as the ATK-down debuff only (the debuff is inert at scope, so a
    // debuff-only model would leave pepper\u2019s total untouched).
    expect(totals(NO_S2.res)[SLUG]).toBeLessThan(totals(STOCK.res)[SLUG]);
    expect(NO_S2_DMG.length).toBeLessThan(STOCK_DMG.length);
  });

  it('lands in its own (skill) bucket — not folded into the normal-attack bucket', () => {
    // Nearest-wrong: the 160% expressed as a normalAttackPct / extraHitDamagePct rider, which would
    // ride pellet landing, coring and the +30% range bonus instead of being function damage.
    expect(SKILL_BUCKETS.length).toBeGreaterThanOrEqual(1);
    const s2Events = inBuckets(STOCK_DMG, SKILL_BUCKETS);
    expect(s2Events.length).toBeGreaterThanOrEqual(3);
    // the bucket it lives in is NOT the bucket carrying the bulk of her shots
    const biggest = [...NO_S2_B.entries()].sort((a, b) => b[1] - a[1])[0];
    expect(SKILL_BUCKETS).not.toContain(biggest ? biggest[0] : '?');
  });

  it('the rider takes NO +30% range bonus and NEVER cores', () => {
    // Function-damage riders are force-set no-range, and core only when the kit says "core strike".
    // The prose says plainly "Deals 160% of final ATK as damage" -> body damage.
    const s2Events = inBuckets(STOCK_DMG, SKILL_BUCKETS);
    expect(s2Events.length).toBeGreaterThan(0);
    for (const ev of s2Events) {
      expect(Boolean(loose(ev).rangeApplied)).toBe(false);
      expect(coreRateOf(ev)).toBe(0);
    }
  });

  it('fires on an INTERVAL, not on the magazine (last-bullet) cadence', () => {
    // The kit text gives skill2 no activation clause at all, so the faithful trigger is `interval`
    // (its PERIOD is an ALWAYS-flag value, absent from the prose — this test pins the SHAPE, never
    // the number). Nearest-wrong: re-using skill1\u2019s lastBullet trigger, which would frame-lock
    // every skill hit to a reload.
    const times = inBuckets(STOCK_DMG, SKILL_BUCKETS)
      .map((e) => secOf(e, MAX_RAW))
      .filter((t) => Number.isFinite(t))
      .sort((a, b) => a - b);
    expect(times.length).toBeGreaterThanOrEqual(3);
    expect(RELOAD_TIMES.length).toBeGreaterThanOrEqual(3);

    const gaps: number[] = [];
    for (let i = 1; i < times.length; i += 1) gaps.push(times[i] - times[i - 1]);
    const spread = Math.max(...gaps) - Math.min(...gaps);
    expect(spread).toBeLessThan(0.5); // steady cadence

    // and at least one proc is nowhere near a reload boundary
    const distances = times.map((t) =>
      Math.min(...RELOAD_TIMES.map((r) => Math.abs(r - t))),
    );
    expect(Math.max(...distances)).toBeGreaterThan(0.5);
  });

  it('"ATK down 3.55% for 5 sec" is an ENEMY debuff — never applied to an ally', () => {
    // Nearest-wrong: mis-scoping the enemy ATK-down onto the caster/allies (or, worse, inverting it
    // into an ally buff). Boss-held debuffs carry casterIdx === null AND targetIdx === null.
    const allySlugs = new Set(Object.keys(totals(STOCK.res)));
    const negativeOnAllies = STOCK.events.filter((e) => {
      if (kindOf(e) !== 'buffApply') return false;
      const v = loose(e).value;
      return typeof v === 'number' && v < 0 && allySlugs.has(String(loose(e).targetSlug));
    });
    expect(negativeOnAllies).toEqual([]);
  });
});

describe('pepper skill1 — the last-bullet heal', () => {
  it('is encoded as lastBullet -> 1 lowest-HP ally -> heal (no silent drop, no re-scope)', () => {
    // v1 has no HP pool, so 4.45% of the user\u2019s Max HP cannot be asserted behaviourally; the
    // three things the prose DOES fix are the trigger, the target set and the effect kind.
    // Nearest-wrong: target self / all allies, or trigger shotFired / interval.
    const s1 = blocksOf(OV, 'skill1');
    expect(s1.length).toBeGreaterThan(0);
    const healBlocks = s1.filter((b) =>
      ((b.effects as Loose[]) ?? []).some((e) => e.kind === 'heal'),
    );
    expect(healBlocks.length).toBeGreaterThanOrEqual(1);
    const hb = healBlocks[0];
    expect(String(loose(hb.trigger).kind)).toBe('lastBullet');
    expect(String(loose(hb.target).kind)).toBe('alliesLowestHp');
    expect(loose(hb.target).count).toBe(1);
  });

  it.skip('TANDEM GAP: heal -> a teammate\u2019s `recovery` trigger is untestable in this fixture', () => {
    // The heal\u2019s only board-visible channel is a teammate whose kit keys on `recovery`. With no HP
    // pool the sim resolves "lowest remaining HP" deterministically to the LEFTMOST ally, which in
    // controlComp is not the recovery consumer, so the coupling cannot be exercised here. Needs a
    // purpose-built comp that seats a recovery-keyed unit leftmost.
  });
});

describe('pepper skill1 — Refresh Heart (incoming healing, 5 stacks, 15 sec)', () => {
  it('tracks a 5-cap stack pool (the burst\u2019s max-stack branch reads it)', () => {
    // "Incoming healing" has no StatKey and is offensively inert, but the STACK COUNT is
    // load-bearing. Whether it is carried as a buff maxStacks or a named resource, the cap 5 must
    // exist somewhere in the override. Nearest-wrong: modeled as a single non-stacking buff, which
    // makes the burst\u2019s "at max stacks" branch unreachable or always-on.
    const json = JSON.stringify(OV);
    expect(json.includes('"maxStacks":5') || json.includes('"max":5')).toBe(true);
  });

  it('max stacks is REACHABLE and never lapses: >= 5 magazines, every gap under 15 sec', () => {
    // Non-vacuity for the burst gate: pepper must fire at least 5 magazines (5 lastBullet
    // activations) inside the 180 s fight for Refresh Heart to reach 5, and consecutive magazines
    // must be closer together than the 15 sec duration or the stacks decay between refreshes.
    expect(RELOAD_TIMES.length).toBeGreaterThanOrEqual(5);
    for (let i = 1; i < RELOAD_TIMES.length; i += 1) {
      expect(RELOAD_TIMES[i] - RELOAD_TIMES[i - 1]).toBeLessThan(15);
    }
  });
});

describe('pepper burst — 1237.5% of final ATK as Burst Skill damage', () => {
  it('the nuke is real: clearing the burst slot strictly reduces pepper\u2019s total', () => {
    expect(PEPPER_BURST_CASTS.length).toBeGreaterThan(0);
    expect(totals(NO_BURST.res)[SLUG]).toBeLessThan(totals(STOCK.res)[SLUG]);
    expect(BURST_BUCKETS.length).toBeGreaterThanOrEqual(1);
  });

  it('burst-cast damage is FULL-BURST EXEMPT (it lands before the window opens)', () => {
    // Nearest-wrong: keying the nuke to fullBurstEnter, which would collect the +50% FB major and
    // the entry auras. A burst cast resolves before Full Burst begins.
    const burstHits = inBuckets(STOCK_DMG, BURST_BUCKETS);
    expect(burstHits.length).toBeGreaterThan(0);
    for (const ev of burstHits) {
      expect(Boolean(loose(ev).fbMajorApplied)).toBe(false);
      expect(Boolean(loose(ev).rangeApplied)).toBe(false);
      expect(coreRateOf(ev)).toBe(0);
    }
  });

  it.skip('GAP: "Increases stack count of stackable buffs by 1" has no schema primitive', () => {
    // There is no effect kind that increments an arbitrary ally buff\u2019s stack counter, and no event
    // exposes a stack bump independent of a fresh buffApply. This is pepper\u2019s signature team
    // mechanic and is currently unmodelable — it belongs in the override\u2019s `unmodeled.burst`.
  });

  it.skip('GAP: the max-stack 27.22% Max-HP team heal is unobservable at scope', () => {
    // No HP pool, and the harness exposes no heal/recovery event kind, so neither the gate
    // ("Refresh Heart at max stacks") nor the heal itself has a readable channel. Testing it needs
    // either a recovery-keyed consumer seated as the target or a heal event added to the tap.
  });
});
