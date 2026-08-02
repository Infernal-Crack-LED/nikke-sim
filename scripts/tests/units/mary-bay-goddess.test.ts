// PER-UNIT KIT SPEC — `mary-bay-goddess` (Mary: Bay Goddess, Supporter/SR/Water, Burst I, cd 20s,
// ammo 6, chargeFrames 60). Kit-autonomy gauntlet 2026-08-02 — FROM-SCRATCH model (no shipped
// override existed; every line below is a MISSING-line assertion, RED against the absent override,
// GREEN once src/skills/overrides/mary-bay-goddess.json lands). This is the SR/Water Bay Goddess
// VARIANT of Mary — NOT the base `mary` (SG/Water); the two are never conflated (the slug lint's
// bare-"Mary" advisory is a false positive on the variant's own disambiguated name).
//
// Kit (blablalink prose, data/characters.json → characters['mary-bay-goddess'].skills):
//   S1 "Seaside Sunshine" — Activates when ENTERING FULL BURST. Affects all allies. Effects vary
//      with the number of times entered; each subsequent effect triggers all before it:
//        Once:        Recovers 1.05% of the skill user's final Max HP every 1 sec for 5 sec   [M1]
//        Twice:       Recovers 3.69% of the skill user's final Max HP every 1 sec for 5 sec   [M1]
//        Three times: Recovers 6.86% of the skill user's final Max HP every 1 sec for 5 sec   [M1]
//   S2 "Waves Kiss The Feet" — Activates when USING BURST SKILL. Affects all Water Code allies.
//      Effects vary with the number of times used; each subsequent effect triggers all before it:
//        Once:        Elemental Advantage Attack Damage ▲ 20.85% for 3 sec                    [M4]
//        Twice:       Elemental Advantage Attack Damage ▲ 13.88% for 5 sec                    [M5]
//        Three times: Elemental Advantage Attack Damage ▲  8.36% for 10 sec                   [M6]
//   BU "Tranquil Waters":
//        ■ all Water Code allies: ATK ▲ 23.23% for 3 sec                                      [M7]
//        ■ all allies: Max HP ▲ 27.87% of the skill user's final Max HP for 10 sec            [M8]
//
// Engine primitives used (all pre-existing — NO engine edit): `escalating` (Liter-style "Once:/
// Twice:/Three times:": Nth activation applies steps 1..N, cumulative, never resets), `heal`
// (ticks:5 / intervalSec:1 — a per-second HoT emits its first recovery event immediately and
// schedules the remaining 4, so an on-recovery consumer stays refreshed across the 5s window),
// `elemAdvantageDamagePct` (Damage-Up bucket gated to advantaged() — Water beats Fire, live vs a
// Fire boss, inert vs a neutral one), `atkPct` (plain percent-of-recipient ATK; the kit says plain
// "ATK ▲", NOT "of the skill user's ATK"), `casterMaxHpPct` ("X% of the skill user's Max HP" — the
// engine converts it to a flat `maxHpFlat` grant = 27.87% of MARY's Max HP, one identical flat
// number for every recipient), `alliesOfElement` (Water-Code scope), `fullBurstEnter` (S1) vs
// `burstCast` (S2 + burst) — the two fire at DIFFERENT frames (the cast lands before the FB window)
// and drive TWO DISTINCT escalating counters (S1 counts team FB ENTRIES, S2 counts Mary's burst USES).
//
// Encoding notes (faithful > fit; measured > fudge):
//   M1 heal MAGNITUDE is event-only (no HP pool is modeled), so the 1.05/3.69/6.86% ramp has NO
//   damage observable. S1 is nonetheless encoded as escalating[3 × heal ticks:5/1s] — faithful to
//   "each subsequent effect triggers all before it" — because the RECOVERY-EVENT COUNT IS observable
//   and ramps 5 → 10 → 15 per target across the 1st/2nd/3rd FB entry (verified empirically), which is
//   what keeps an on-recovery consumer (crown) refreshed. Collapsing to a single heal block would
//   under-count from the 3rd entry (flat 5) and is discriminated below.
//   M8 casterMaxHpPct is faithfully encoded but damage-INERT in this fixture: the flat maxHpFlat it
//   produces feeds atkOfMaxHpPct only when caster === target (the e3 self-feed rule), and no unit in
//   the comp has an atkOfMaxHpPct consumer. It is pinned by its buffApply event (stat / one shared
//   caster-scaled value / duration / all-ally target set), not by a damage delta.
//
// Why each assertion discriminates (a test that cannot fail under the nearest wrong model gates
// nothing):
//   M1  with the other recovery sources patched out (crown's + helm's heals, ALL slots), crown's
//       "when recovery takes effect → team ATK ▲20.99" fires 5 / 10 / 15× per FB window on the
//       1st / 2nd / 3rd+ entry — the escalating ramp. A NON-escalating single 5-tick heal stays flat
//       at 5 (max never reaches 10); an instant heal (ticks:1) stays at 1 (first window < 5); removing
//       S1 silences it (0). The 5 ticks also span ~4s (1s cadence), not the entry frame.
//   M4-M6 the escalating ramp produces ALL THREE tier magnitudes with their exact durations: the
//       distinct elemAdvantageDamagePct values are {20.85, 13.88, 8.36} at {3s, 5s, 10s}. A
//       single-tier counterfactual yields only {20.85}. The buff is WATER-SCOPED: it reaches exactly
//       the Water allies (mary slot 0, helm slot 3), never crown (1) / ada (2) — an unscoped
//       counterfactual reaches all 4. It is damage-LIVE vs a Fire boss (mary+helm total drops when S2
//       is removed) and damage-INERT vs a neutral Iron boss (removing S2 changes no total there).
//   M7  the burst ATK buff is 23.23% for exactly 3s (180f), Water-scoped (mary+helm only), damage-live
//       (mary+helm total drops when removed). An all-allies counterfactual reaches 4.
//   M8  the Max HP grant is caster-scaled: every recipient carries the SAME flat maxHpFlat value
//       (27.87% of MARY's Max HP). A recipient-scaled targetMaxHpPct model produces per-target values
//       (each ally's own Max HP differs) — >1 distinct value. It reaches all 4 allies for 10s (600f).
//
// Fixture: mary-bay-goddess (sole B1, cd 20s) / crown (B2, 20s) / ada (B3, 40s) / helm (B3, 40s),
// boss Fire (Water allies mary+helm are advantaged → S2 live), focus mary-bay-goddess (×2.5 burst
// gauge on her SR charge weapon). Slot order: mary 0 / crown 1 / ada 2 / helm 3. The two B3s sustain
// a Full Burst every ~20s (9 FBs over 180s), so the escalating counters reach tier 3 (entries 3+) and
// stay. Iron run = the neutral-boss inert reference. Deterministic (no seed).
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
/** runComp slot order: mary-bay-goddess 0 / crown 1 / ada 2 / helm 3. */
const MARY = 0;
const CROWN = 1;
const HELM = 3;
const WATER_ALLIES = [MARY, HELM];
const ALL_ALLIES = [MARY, CROWN, 2, HELM];

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type FBStart = Extract<SimEvent, { kind: 'fullBurstStart' }>;

const SLUGS = ['mary-bay-goddess', 'crown', 'ada', 'helm'];

function run(
  overrides: Record<string, any> = {},
  bossElement: 'Fire' | 'Iron' = 'Fire'
) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: SLUGS,
    bossElement,
    focusSlug: 'mary-bay-goddess',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- escalating-aware patch helpers (stats/heals may sit inside escalating.steps) -------------
const effectHasStat = (e: any, stat: string) =>
  e.stat === stat ||
  (e.kind === 'escalating' && e.steps?.some((s: any) => s.stat === stat));
const blockHasStat = (b: any, stat: string) =>
  b.effects.some((e: any) => effectHasStat(e, stat));
const blockHasHeal = (b: any) =>
  b.effects.some(
    (e: any) =>
      e.kind === 'heal' ||
      (e.kind === 'escalating' && e.steps?.some((s: any) => s.kind === 'heal'))
  );
const removeHeals = (ov: any) => {
  let removed = 0;
  for (const s of ['skill1', 'skill2', 'burst']) {
    const before = ov[s].length;
    ov[s] = ov[s].filter((b: any) => !blockHasHeal(b));
    removed += before - ov[s].length;
  }
  return removed;
};

/** M4-M6 reference: her S2 elemAdvantage ramp removed entirely. */
const mbgNoS2 = withPatchedOverride('mary-bay-goddess', (ov) => {
  const before = ov.skill2.length;
  ov.skill2 = ov.skill2.filter((b: any) => !blockHasStat(b, 'elemAdvantageDamagePct'));
  if (ov.skill2.length === before) {
    throw new Error('mbg S2 elemAdvantageDamagePct block missing — fixture is stale');
  }
});
/** M4-M6 counterfactual: the ramp collapsed to a SINGLE tier (20.85%/3s only, every cast). */
const mbgSingleTierS2 = withPatchedOverride('mary-bay-goddess', (ov) => {
  const blk = ov.skill2.find((b: any) => blockHasStat(b, 'elemAdvantageDamagePct'));
  if (!blk) throw new Error('mbg S2 elemAdvantageDamagePct block missing — fixture is stale');
  blk.effects = [{ kind: 'buff', stat: 'elemAdvantageDamagePct', value: 20.85, durationSec: 3 }];
});
/** M4-M6 counterfactual: the same ramp, but UNscoped (all allies instead of Water Code only). */
const mbgUnscopedS2 = withPatchedOverride('mary-bay-goddess', (ov) => {
  const blk = ov.skill2.find((b: any) => blockHasStat(b, 'elemAdvantageDamagePct'));
  if (!blk) throw new Error('mbg S2 elemAdvantageDamagePct block missing — fixture is stale');
  blk.target = { kind: 'allies' };
});
/** M7 reference: her burst ATK line removed (Max HP line kept). */
const mbgNoBurstAtk = withPatchedOverride('mary-bay-goddess', (ov) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter((b: any) => !blockHasStat(b, 'atkPct'));
  if (ov.burst.length === before) {
    throw new Error('mbg burst atkPct block missing — fixture is stale');
  }
});
/** M7 counterfactual: burst ATK UNscoped (all allies instead of Water Code only). */
const mbgUnscopedBurstAtk = withPatchedOverride('mary-bay-goddess', (ov) => {
  const blk = ov.burst.find((b: any) => blockHasStat(b, 'atkPct'));
  if (!blk) throw new Error('mbg burst atkPct block missing — fixture is stale');
  blk.target = { kind: 'allies' };
});
/** M8 counterfactual: Max HP grant as targetMaxHpPct (recipient-scaled) instead of casterMaxHpPct. */
const mbgTargetMaxHp = withPatchedOverride('mary-bay-goddess', (ov) => {
  const e = ov.burst
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'casterMaxHpPct');
  if (!e) throw new Error('mbg burst casterMaxHpPct effect missing — fixture is stale');
  e.stat = 'targetMaxHpPct';
});
/** M1 reference: her S1 HoT removed entirely. */
const mbgNoS1 = withPatchedOverride('mary-bay-goddess', (ov) => {
  if (removeHeals(ov) === 0) {
    throw new Error('mbg S1 heal block missing — fixture is stale');
  }
});
/** M1 cadence counterfactual: the HoT collapsed to a single INSTANT heal (ticks:1, no escalation). */
const mbgInstantHeal = withPatchedOverride('mary-bay-goddess', (ov) => {
  const blk = ov.skill1.find((b: any) => blockHasHeal(b));
  if (!blk) throw new Error('mbg S1 heal block missing — fixture is stale');
  blk.effects = [{ kind: 'heal' }]; // ticks defaults to 1 → one recovery event, no scheduling
});
/** M1 escalation counterfactual: a single NON-escalating 5-tick heal (cadence yes, ramp no). */
const mbgSingleHeal = withPatchedOverride('mary-bay-goddess', (ov) => {
  const blk = ov.skill1.find((b: any) => blockHasHeal(b));
  if (!blk) throw new Error('mbg S1 heal block missing — fixture is stale');
  blk.effects = [{ kind: 'heal', ticks: 5, intervalSec: 1 }];
});
/** M1 isolation: remove the OTHER recovery sources (crown's + helm's heals, every slot) so mary's
 *  S1 HoT is the only recovery emitter in the fight — every crown recovery firing is attributable
 *  to mary's S1. (helm's BURST heal fires on its odd-FB casts and must go too, not just its S1.) */
const crownNoHeal = withPatchedOverride('crown', (ov) => {
  if (removeHeals(ov) === 0) throw new Error('crown heal block missing — fixture is stale');
});
const helmNoHeal = withPatchedOverride('helm', (ov) => {
  if (removeHeals(ov) === 0) throw new Error('helm heal block missing — fixture is stale');
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const iron = run({}, 'Iron');
const ironNoS2 = run({ 'mary-bay-goddess': mbgNoS2 }, 'Iron');
const noS2 = run({ 'mary-bay-goddess': mbgNoS2 });
const singleTierS2 = run({ 'mary-bay-goddess': mbgSingleTierS2 });
const unscopedS2 = run({ 'mary-bay-goddess': mbgUnscopedS2 });
const noBurstAtk = run({ 'mary-bay-goddess': mbgNoBurstAtk });
const unscopedBurstAtk = run({ 'mary-bay-goddess': mbgUnscopedBurstAtk });
const targetMaxHp = run({ 'mary-bay-goddess': mbgTargetMaxHp });
const isolatedS1 = run({ crown: crownNoHeal, helm: helmNoHeal });
const instantHeal = run({
  'mary-bay-goddess': mbgInstantHeal,
  crown: crownNoHeal,
  helm: helmNoHeal,
});
const singleHealS1 = run({
  'mary-bay-goddess': mbgSingleHeal,
  crown: crownNoHeal,
  helm: helmNoHeal,
});
const noS1 = run({
  'mary-bay-goddess': mbgNoS1,
  crown: crownNoHeal,
  helm: helmNoHeal,
});

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const maryBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'mary-bay-goddess');
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e): e is FBStart => e.kind === 'fullBurstStart');

/** mary-cast buffs of a given stat. */
const mbgBuffs = (evs: SimEvent[], stat: string) =>
  buffs(evs).filter((b) => b.casterIdx === MARY && b.stat === stat);

const distinct = (xs: number[]) => [...new Set(xs)].sort((a, b) => a - b);
const durations = (bs: BuffApply[]) =>
  distinct(bs.map((b) => (b.expiresFrame == null ? -1 : b.expiresFrame - b.frame)));

/** RAW count of crown recovery firings in a frame window — one buffApply per firing (filtered to a
 *  single recipient so coincident ticks from concurrent HoTs are NOT collapsed). */
const crownRecoveryIn = (evs: SimEvent[], lo: number, hi: number): number =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === CROWN &&
      b.stat === 'attackDamagePct' &&
      b.value === 20.99 &&
      b.targetIdx === MARY &&
      b.frame >= lo &&
      b.frame <= hi
  ).length;

/** Distinct frames crown's recovery fired in a window (for the cadence/span check). */
const crownRecoveryFramesIn = (evs: SimEvent[], lo: number, hi: number): number[] =>
  [
    ...new Set(
      buffs(evs)
        .filter(
          (b) =>
            b.casterIdx === CROWN &&
            b.stat === 'attackDamagePct' &&
            b.value === 20.99 &&
            b.frame >= lo &&
            b.frame <= hi
        )
        .map((b) => b.frame)
    ),
  ].sort((a, b) => a - b);

const sumDamage = (evs: SimEvent[], slugs: string[]) =>
  dmg(evs)
    .filter((d) => slugs.includes(d.slug))
    .reduce((s, d) => s + d.amount, 0);

/** Per-FB-entry raw recovery counts in the 5s window after each fullBurstStart. */
const perFbRecovery = (evs: SimEvent[]): number[] =>
  fbStarts(evs).map((fb) => crownRecoveryIn(evs, fb.frame, fb.frame + 5 * FPS));

describe('mary-bay-goddess — kit spec', () => {
  it('fixture sanity: she casts her burst and the chain reaches Full Burst repeatedly', () => {
    expect(maryBursts(base.events).length).toBeGreaterThan(2);
    expect(fbStarts(base.events).length).toBeGreaterThan(2);
  });

  describe('M1 — S1 entering-Full-Burst HoT: 5-tick/5s window that ESCALATES 5→10→15, all allies', () => {
    const counts = perFbRecovery(isolatedS1.events);

    it('first FB entry fires the base 5-tick HoT, spread across ~4-5s (1s cadence)', () => {
      expect(counts.length).toBeGreaterThan(2);
      expect(counts[0], 'tier-1 entry must fire the 5-tick HoT').toBeGreaterThanOrEqual(5);
      const fb0 = fbStarts(isolatedS1.events)[0];
      const frames = crownRecoveryFramesIn(isolatedS1.events, fb0.frame, fb0.frame + 5 * FPS);
      const spanSec = (frames[frames.length - 1] - fb0.frame) / FPS;
      expect(spanSec, 'the 5 ticks must span ~4s, not collapse to the entry frame').toBeGreaterThanOrEqual(4);
    });

    it('ESCALATES: a 3rd+ FB entry fires three concurrent HoTs (≥10 recovery events)', () => {
      const max = Math.max(...counts);
      expect(
        max,
        `per-FB recovery counts ${counts} — the ramp must reach ≥10 (concurrent HoTs), a single heal stays at 5`
      ).toBeGreaterThanOrEqual(10);
      expect(max, 'the ramp must grow past the tier-1 entry').toBeGreaterThan(counts[0]);
    });

    it('DISCRIMINATING: a non-escalating single 5-tick heal stays flat at 5 (never reaches 10)', () => {
      const single = perFbRecovery(singleHealS1.events);
      expect(Math.max(...single), `single-heal counts ${single}`).toBeLessThan(10);
    });

    it('DISCRIMINATING: an instant heal (ticks:1) fires ≤1/entry', () => {
      const inst = perFbRecovery(instantHeal.events);
      expect(Math.max(...inst), `instant-heal counts ${inst}`).toBeLessThanOrEqual(1);
    });

    it('DISCRIMINATING: removing S1 (other recovery sources patched out) silences the consumer', () => {
      expect(perFbRecovery(noS1.events).reduce((a, b) => a + b, 0)).toBe(0);
    });
  });

  describe('M4-M6 — S2 using-Burst-Skill Elemental Advantage ramp, Water Code allies', () => {
    const applied = mbgBuffs(base.events, 'elemAdvantageDamagePct');

    it('produces all three escalating tier magnitudes with their exact durations', () => {
      expect(applied.length, 'no S2 elemAdvantage buff was applied').toBeGreaterThan(0);
      expect(distinct(applied.map((b) => b.value))).toEqual([8.36, 13.88, 20.85]);
      expect(durations(applied)).toEqual([3 * FPS, 5 * FPS, 10 * FPS]);
    });

    it('is scoped to the Water Code allies only (mary + helm), never crown/ada', () => {
      expect(distinct(applied.map((b) => b.targetIdx as number))).toEqual(WATER_ALLIES);
    });

    it('DISCRIMINATING: a single-tier model yields only the 20.85%/3s buff', () => {
      const single = mbgBuffs(singleTierS2.events, 'elemAdvantageDamagePct');
      expect(distinct(single.map((b) => b.value))).toEqual([20.85]);
    });

    it('DISCRIMINATING: an unscoped model reaches all four allies', () => {
      const unscoped = mbgBuffs(unscopedS2.events, 'elemAdvantageDamagePct');
      expect(distinct(unscoped.map((b) => b.targetIdx as number))).toEqual(ALL_ALLIES);
    });

    it('is damage-LIVE vs a Fire boss (mary+helm total drops when S2 is removed)', () => {
      expect(sumDamage(base.events, ['mary-bay-goddess', 'helm'])).toBeGreaterThan(
        sumDamage(noS2.events, ['mary-bay-goddess', 'helm'])
      );
    });

    it('is damage-INERT vs a neutral Iron boss (removing S2 changes no total)', () => {
      expect(iron.totals).toEqual(ironNoS2.totals);
    });
  });

  describe('M7 — burst ATK ▲23.23% for 3s to Water Code allies', () => {
    const applied = mbgBuffs(base.events, 'atkPct');

    it('is 23.23% for exactly 3s, scoped to mary + helm', () => {
      expect(applied.length, 'no burst atkPct buff was applied').toBeGreaterThan(0);
      expect(distinct(applied.map((b) => b.value))).toEqual([23.23]);
      expect(durations(applied)).toEqual([3 * FPS]);
      expect(distinct(applied.map((b) => b.targetIdx as number))).toEqual(WATER_ALLIES);
    });

    it('DISCRIMINATING: an unscoped model reaches all four allies', () => {
      const unscoped = mbgBuffs(unscopedBurstAtk.events, 'atkPct');
      expect(distinct(unscoped.map((b) => b.targetIdx as number))).toEqual(ALL_ALLIES);
    });

    it('is damage-live (mary+helm total drops when the burst ATK line is removed)', () => {
      expect(sumDamage(base.events, ['mary-bay-goddess', 'helm'])).toBeGreaterThan(
        sumDamage(noBurstAtk.events, ['mary-bay-goddess', 'helm'])
      );
    });
  });

  describe('M8 — burst Max HP ▲27.87% of the skill user\'s final Max HP for 10s, all allies', () => {
    const applied = mbgBuffs(base.events, 'maxHpFlat');

    it('arrives as a caster-scaled flat maxHpFlat: one shared value, all four allies, 10s', () => {
      expect(applied.length, 'no burst maxHpFlat buff was applied').toBeGreaterThan(0);
      const vals = distinct(applied.map((b) => b.value));
      expect(vals.length, `caster-scaled grant must be ONE flat value for every recipient, got ${vals}`).toBe(1);
      expect(vals[0]).toBeGreaterThan(0);
      expect(durations(applied)).toEqual([10 * FPS]);
      expect(distinct(applied.map((b) => b.targetIdx as number))).toEqual(ALL_ALLIES);
    });

    it('DISCRIMINATING: a recipient-scaled targetMaxHpPct model yields per-target values (>1 distinct)', () => {
      const cf = mbgBuffs(targetMaxHp.events, 'maxHpFlat');
      expect(cf.length).toBeGreaterThan(0);
      expect(
        distinct(cf.map((b) => b.value)).length,
        'target-scaled grant varies per recipient (each ally\'s own Max HP differs)'
      ).toBeGreaterThan(1);
    });
  });
});
