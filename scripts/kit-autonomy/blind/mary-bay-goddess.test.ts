/**
 * mary-bay-goddess — Mary: Bay Goddess (SR / Water / Supporter / Burst I)
 *
 * BLIND kit spec, written from the kit prose alone (cross-family post-op S5).
 *
 * WHAT THE KIT SAYS
 *   S1  "Activates when entering Full Burst. Affects all allies." Escalating + CUMULATIVE
 *       ("each subsequent effect triggers all effects before it"): the Nth Full-Burst entry
 *       adds one more "Recovers X% of the SKILL USER'S final Max HP every 1 sec for 5 sec"
 *       heal-over-time (1.05% / 3.69% / 6.86%).
 *   S2  "Activates when USING Burst Skill. Affects all Water Code allies." Escalating +
 *       cumulative: Elemental Advantage Attack Damage ▲20.85%/3s, ▲13.88%/5s, ▲8.36%/10s.
 *   BURST  block A, all Water Code allies: ATK ▲23.23% for 3 sec.
 *          block B, all allies: Max HP ▲27.87% OF THE SKILL USER'S final Max HP for 10 sec.
 *
 * FIXTURE — controlComp('mary-bay-goddess', true)
 *   liter(B1) / crown(B2) / mary(carry slot) / helm(B3), Fire boss. The Fire boss matters:
 *   Water allies HAVE elemental advantage here, so S2's elemAdvantageDamagePct is LIVE rather
 *   than inert — a fixture that lacked advantage would make every S2 assertion vacuous.
 *
 *   Mary is Burst I and liter (slot 0) is ALSO Burst I, so liter wins every B1 window and mary
 *   NEVER CASTS in the shipped fixture (run A). That is not a defect — it is the discriminator
 *   for failure-mode #3 (trigger identity): S2 and the burst are "when USING Burst Skill", so
 *   they must emit NOTHING in run A even though 3+ Full Bursts occur. A model that keys them to
 *   fullBurstEnter fires in A → RED.
 *
 *   Run B adds a fixture-only { kind: 'burstFirst' } block to mary's burst slot so she takes the
 *   B1 window instead of liter; every burst-cast claim is read off B. That patch touches burst
 *   SELECTION only — never a magnitude, duration, target or trigger — so it cannot manufacture a
 *   green on any assertion below.
 *
 * WHY EACH GROUP DISCRIMINATES — the nearest-wrong model it goes RED under is named inline.
 * 5 sims total (each runComp is a full 180 s fight), all hoisted to module scope.
 */
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import {
  controlComp,
  runComp,
  totals,
  withPatchedOverride,
} from '../../tests/lib/harness.js'; // path fixed: blind/ sits under kit-autonomy/, not tests/units/

const SLUG = 'mary-bay-goddess';
const FPS = 60;
const ELEM = 'elemAdvantageDamagePct';
const BURST_ATK = 23.23;
const TIERS = [
  { value: 20.85, sec: 3 },
  { value: 13.88, sec: 5 },
  { value: 8.36, sec: 10 },
] as const;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

// ---------------------------------------------------------------------------
// Loose views over the override file (encoding-agnostic: the slot may be a
// Block[] or a CharacterSkills carrying its own blocks[]).
// ---------------------------------------------------------------------------
type LooseEffect = {
  kind?: string;
  stat?: string;
  value?: number;
  durationSec?: number;
  ticks?: number;
  intervalSec?: number;
  steps?: LooseEffect[];
};
type LooseBlock = {
  slot?: string;
  trigger?: { kind?: string };
  target?: { kind?: string; element?: string; excludeSelf?: boolean };
  effects?: LooseEffect[];
};
type LooseOverride = Record<string, unknown>;

const SLOTS = ['skill1', 'skill2', 'burst'] as const;
type Slot = (typeof SLOTS)[number];

function blocksOf(ov: LooseOverride, slot: Slot): LooseBlock[] {
  const s = ov[slot] as LooseBlock[] | { blocks?: LooseBlock[] } | undefined;
  if (!s) return [];
  return Array.isArray(s) ? s : (s.blocks ?? []);
}

function walk(
  effects: LooseEffect[] | undefined,
  fn: (e: LooseEffect) => void,
): void {
  for (const e of effects ?? []) {
    fn(e);
    if (e.steps) walk(e.steps, fn);
  }
}

function eachEffect(
  ov: LooseOverride,
  slot: Slot,
  fn: (e: LooseEffect) => void,
): void {
  for (const b of blocksOf(ov, slot)) walk(b.effects, fn);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
function maryOverride(extra?: (ov: LooseOverride) => void) {
  return withPatchedOverride(SLUG, (raw) => {
    const ov = raw as unknown as LooseOverride;
    if (!ov.burst) ov.burst = [] as LooseBlock[];
    // fixture-only: let mary win the Burst-I window over liter so "when using
    // Burst Skill" lines actually fire. Selection only — no magnitude touched.
    blocksOf(ov, 'burst').push({
      slot: 'burst',
      trigger: { kind: 'passive' },
      target: { kind: 'self' },
      effects: [{ kind: 'burstFirst' }],
    });
    extra?.(ov);
  });
}

const zeroStat =
  (stats: string[], slots: readonly Slot[] = SLOTS) =>
  (ov: LooseOverride) => {
    for (const s of slots)
      eachEffect(ov, s, (e) => {
        if (e.stat && stats.includes(e.stat)) e.value = 0;
      });
  };

function comp(patched?: ReturnType<typeof withPatchedOverride>) {
  const base = controlComp(SLUG, true);
  if (!patched) return base;
  return { ...base, overrides: { ...base.overrides, [SLUG]: patched } };
}

function tap(opts: ReturnType<typeof controlComp>) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...opts,
    cfg: { ...opts.cfg, onEvent: (ev: SimEvent) => events.push(ev) },
  });
  const buffs = events.filter((e): e is BuffApply => e.kind === 'buffApply');
  return { res, events, buffs, dmg: totals(res) };
}

// A = shipped fixture, mary never casts (liter takes B1).
const A = tap(comp());
// B = mary casts every rotation.
const B = tap(comp(maryOverride()));
// Counterfactual arms (all built on B so the only delta is the zeroed line).
const B_noElem = tap(comp(maryOverride(zeroStat([ELEM]))));
const B_noAtk = tap(comp(maryOverride(zeroStat(['atkPct'], ['burst']))));
const B_noHp = tap(
  comp(
    maryOverride(
      zeroStat(
        ['casterMaxHpPct', 'targetMaxHpPct', 'maxHpFlat', 'maxHpPct'],
        ['burst'],
      ),
    ),
  ),
);

const exp = (b: BuffApply) => b.expiresFrame ?? -1;
const elemB = B.buffs.filter((b) => b.stat === ELEM);
const maryIdx = elemB.length ? elemB[0].casterIdx : undefined;

// Group the S2 applies into per-cast waves. Every buff of one cast lands on the
// same frame, so applyFrame = expiresFrame - tierDuration recovers the cast.
const waves: BuffApply[][] = (() => {
  const m = new Map<number, BuffApply[]>();
  for (const b of elemB) {
    const t = TIERS.find((x) => Math.abs(x.value - (b.value ?? -1)) < 1e-6);
    const f = exp(b) - (t ? t.sec * FPS : 0);
    const arr = m.get(f) ?? [];
    arr.push(b);
    m.set(f, arr);
  }
  return [...m.entries()].sort((x, y) => x[0] - y[0]).map(([, v]) => v);
})();

const valueSet = (w: BuffApply[]) =>
  [...new Set(w.map((b) => b.value))].sort((a, b) => a - b);
const hpApplies = B.buffs.filter(
  (b) => b.casterIdx === maryIdx && b.stat === 'maxHpFlat',
);
const atkApplies = B.buffs.filter(
  (b) => b.casterIdx === maryIdx && Math.abs((b.value ?? -1) - BURST_ATK) < 1e-6,
);
const waterTargets = new Set(elemB.map((b) => b.targetSlug));
const allyTargets = new Set(hpApplies.map((b) => b.targetSlug));

describe('mary-bay-goddess — kit spec', () => {
  it('S2 + burst fire on mary\'s OWN burst cast, never on team Full-Burst entry', () => {
    // Non-vacuity: Full Bursts DO happen in run A, so a fullBurstEnter-keyed
    // model (the nearest-wrong for "Activates when using Burst Skill") would
    // have emitted here. Mary casts nothing in A → the correct model is silent.
    const fbs = A.events.filter((e) => e.kind === 'fullBurstStart').length;
    expect(fbs).toBeGreaterThanOrEqual(3);
    expect(A.buffs.filter((b) => b.stat === ELEM)).toHaveLength(0);
    expect(
      A.buffs.filter((b) => Math.abs((b.value ?? -1) - BURST_ATK) < 1e-6),
    ).toHaveLength(0);
    // …and run B genuinely exercises all three escalation tiers.
    expect(waves.length).toBeGreaterThanOrEqual(3);
  });

  it('S1 (Full-Burst entry) grants NO stat buff — it is a heal only', () => {
    // RED if the "Recovers X% of Max HP" line were mis-encoded as a Max-HP /
    // ATK stat grant, or if any burst-cast line were re-keyed to FB entry:
    // either way mary would emit a buffApply in A, where she never bursts.
    expect(typeof maryIdx).toBe('number');
    expect(A.buffs.filter((b) => b.casterIdx === maryIdx)).toHaveLength(0);
  });

  it('S1 structure: fullBurstEnter → ALL allies → escalating 3× five-tick HoT', () => {
    // The heal PAYLOAD is unobservable (no HP pool in v1), so the structural
    // claims are asserted directly on the override. RED under: a Water-scoped
    // target (S2's scope leaking into S1), a burst-cast trigger, a
    // non-escalating single heal, or a 1-tick instant heal instead of 5×1 s.
    const ov = withPatchedOverride(SLUG, () => {}) as unknown as LooseOverride;
    const s1 = blocksOf(ov, 'skill1');
    const fb = s1.filter((b) => b.trigger?.kind === 'fullBurstEnter');
    expect(fb.length).toBeGreaterThanOrEqual(1);
    expect(s1.some((b) => b.trigger?.kind === 'burstCast')).toBe(false);
    for (const b of fb) {
      expect(b.target?.kind).toBe('allies');
      expect(b.target?.excludeSelf ?? false).toBe(false);
    }
    const heals: LooseEffect[] = [];
    let escalating = 0;
    let statBuffs = 0;
    for (const b of s1)
      walk(b.effects, (e) => {
        if (e.kind === 'heal') heals.push(e);
        if (e.kind === 'escalating') escalating++;
        if (e.kind === 'buff') statBuffs++;
      });
    expect(escalating).toBe(1);
    expect(heals).toHaveLength(3);
    for (const h of heals) {
      expect(h.ticks).toBe(5);
      expect(h.intervalSec ?? 1).toBe(1);
    }
    expect(statBuffs).toBe(0);
  });

  it('S2 escalates CUMULATIVELY: cast N applies tiers 1..N, capped at 3', () => {
    // RED under both nearest-wrongs: (a) all three tiers on every cast — wave 1
    // would carry 3 values; (b) replacement rather than cumulative — wave 2
    // would carry only 13.88.
    expect(valueSet(waves[0])).toEqual([20.85]);
    expect(valueSet(waves[1])).toEqual([13.88, 20.85]);
    expect(valueSet(waves[2])).toEqual([8.36, 13.88, 20.85]);
    for (const w of waves.slice(2))
      expect(valueSet(w)).toEqual([8.36, 13.88, 20.85]);
    // every tier reaches the same target set — one apply per Water ally per tier
    const counts = new Map<number, number>();
    for (const b of waves[2])
      counts.set(b.value, (counts.get(b.value) ?? 0) + 1);
    expect([...counts.values()].every((n) => n === counts.get(20.85))).toBe(
      true,
    );
  });

  it('S2 tier durations are 3 s / 5 s / 10 s', () => {
    // All three tiers of one cast land on the same frame, so the expiry OFFSETS
    // pin the durations without needing the apply frame. RED if any tier were
    // given a shared/rounded duration (e.g. all 10 s, the over-crediting model).
    const w = waves[2];
    const e = (v: number) =>
      Math.max(...w.filter((b) => Math.abs(b.value - v) < 1e-6).map(exp));
    expect(e(13.88) - e(20.85)).toBe(2 * FPS);
    expect(e(8.36) - e(13.88)).toBe(5 * FPS);
  });

  it('S2 + burst ATK are Water-scoped; burst Max HP hits ALL allies', () => {
    // RED if either Water-scoped line were given target `allies` (over-credit),
    // or if the Max HP line were narrowed to Water (under-credit).
    const atkTargets = new Set(atkApplies.map((b) => b.targetSlug));
    expect(waterTargets.size).toBeGreaterThanOrEqual(1);
    expect([...atkTargets].sort()).toEqual([...waterTargets].sort());
    expect(waterTargets.has(SLUG)).toBe(true); // no excludeSelf — mary is Water
    expect(allyTargets.has(SLUG)).toBe(true);
    for (const s of waterTargets) expect(allyTargets.has(s)).toBe(true);
    // fixture non-vacuity: the comp really does contain a non-Water ally, so
    // "Water Code allies" vs "all allies" is a distinguishable claim here.
    expect(allyTargets.size).toBeGreaterThan(waterTargets.size);
  });

  it('burst Max HP is CASTER-scaled (same flat HP to every ally) for 10 s', () => {
    // "27.87% of the SKILL USER'S final Max HP" ⇒ casterMaxHpPct, flat-resolved
    // identically for all targets. RED under targetMaxHpPct (each ally scales
    // off its OWN Max HP → Supporter/Defender/Attacker would differ).
    expect(hpApplies.length).toBeGreaterThanOrEqual(3);
    const first = Math.min(...hpApplies.map(exp));
    const wave = hpApplies.filter((b) => exp(b) === first);
    expect(new Set(wave.map((b) => b.value)).size).toBe(1);
    expect(wave[0].value).toBeGreaterThan(0);
    // same cast frame as the 3 s ATK buff ⇒ 7 s more life on the 10 s grant
    const atkFirst = Math.min(...atkApplies.map(exp));
    expect(first - atkFirst).toBe(7 * FPS);
  });

  it('S2 elemental-advantage buff is LIVE in the damage path and Water-scoped', () => {
    // Boss is Fire, mary/helm are Water ⇒ advantage is satisfied, so the buff
    // must move damage. RED if it were dropped as "defensive/inert", or filed
    // under a bucket the Water carriers do not read.
    expect(B.dmg[SLUG]).toBeGreaterThan(B_noElem.dmg[SLUG]);
    const nonWater = [...allyTargets].filter((s) => !waterTargets.has(s));
    expect(nonWater.length).toBeGreaterThanOrEqual(1);
    // inertness: non-Water allies must be byte-identical
    for (const s of nonWater) expect(B_noElem.dmg[s]).toBe(B.dmg[s]);
  });

  it('burst ATK ▲23.23% moves Water allies and only Water allies', () => {
    // RED if the line were encoded as casterAtkPct (a flat add off mary\'s ATK)
    // instead of atkPct — the zeroing patch would then be a no-op.
    expect(B.dmg[SLUG]).toBeGreaterThan(B_noAtk.dmg[SLUG]);
    const nonWater = [...allyTargets].filter((s) => !waterTargets.has(s));
    for (const s of nonWater) expect(B_noAtk.dmg[s]).toBe(B.dmg[s]);
  });

  it('burst Max HP grant is offensively inert (ally-granted Max HP feeds no ATK)', () => {
    // The grant is kept for kit completeness; nobody in this comp converts Max
    // HP to ATK, and an ally grant never feeds a teammate\'s conversion. RED if
    // it were mis-encoded as an offensive stat (atkOfMaxHpPct / atkPct).
    expect(B_noHp.dmg).toEqual(B.dmg);
  });

  it.skip('S1 heal magnitudes (1.05% / 3.69% / 6.86% of caster Max HP) — GAP: v1 models no HP pool, so the healed AMOUNT is unobservable; only the tick count and target set are testable', () => {});

  it.skip('S1 heal → teammate on-recovery consumer (tandem channel) — GAP: heal emits no event kind of its own, so it is observable only through an ally whose kit carries a `recovery` trigger; assert once a fixture with a confirmed recovery consumer is pinned', () => {});
});
