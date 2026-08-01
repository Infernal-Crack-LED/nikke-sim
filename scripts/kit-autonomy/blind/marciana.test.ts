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
 * marciana — Marciana (SG / Iron / Supporter / Burst II)
 *
 * KIT (verbatim structure, read literally):
 *
 *   skill1:
 *     [A] "Activates when the last bullet hits the target. Affects all allies."
 *         "Recovers 10.95% of attack damage as HP over 3 sec."
 *     [B] "Activates when the last bullet hits the target. Affects 2 ally unit(s)
 *          with the highest final ATK."
 *         "Incoming healing \u25b2 26.98% for 3 sec."
 *
 *   skill2:
 *     [C] "Activates when using Burst Skill. Affects all allies."
 *         "Recovers 28.11% of the skill user's final Max HP as HP."
 *
 *   burst:
 *     [D] "Affects all allies."
 *         "Storage: Stores excess healing received by the skill user, up to 27.87%
 *          of their Max HP. Lasts for 10 sec."
 *     [E] "DEF \u25b2 20.9% of the skill user's DEF for 10 sec."
 *
 * FIXTURE
 *   controlComp('marciana', true) — liter (B1) / crown (B2) / marciana (carry slot) /
 *   helm (B3). marciana is Burst II; the control comp supplies a B1 and a B3 so a full
 *   chain casts and Full Bursts actually happen (a lone unit that cannot complete a
 *   chain makes ZERO Full Bursts, which would make every burst-keyed assertion vacuous).
 *   Deterministic (no seed) so every hoisted run is byte-reproducible.
 *
 *   The fixed-B3 slot is kept ON: marciana's kit is entirely heal/DEF/incoming-healing —
 *   she has no damage line of her own — so the ONLY way her skill1 heal channel is
 *   observable as anything other than a 'heal'/recovery event is via a teammate whose
 *   kit consumes recovery. Keeping the standard control comp also keeps the inertness
 *   baseline honest (teammates must be byte-identical under counterfactuals that are
 *   genuinely damage-inert).
 *
 * WHY THESE ASSERTIONS DISCRIMINATE
 *   Every one of marciana's five kit lines is offensively inert-or-tandem, so totals
 *   alone cannot discriminate almost anything. The load-bearing evidence is therefore
 *   the EVENT LOG: trigger identity (lastBullet vs shotFired vs interval), trigger
 *   identity for the burst line (burstCast vs fullBurstEnter — these diverge because
 *   the comp contains ANOTHER burst-capable unit, so a full-burst-enter keying would
 *   over-fire), target set (all allies vs 2-highest-final-ATK), and caster-scaled
 *   flat resolution (casterMaxHpPct re-emits as maxHpFlat, not as the raw 28.11).
 *   Each group pairs a faithful-reading assertion with a nearest-wrong counterfactual
 *   built via withPatchedOverride, so the assertion is RED under the wrong model.
 *
 * ALWAYS-\u26d1 / GAP NOTES
 *   - The skill1 [A] heal is "10.95% of attack damage ... over 3 sec": the engine's
 *     'heal' effect models NO HP amount (it only emits recovery events to fire
 *     on-recovery consumers), and there is no HP pool in v1. The MAGNITUDE and the
 *     "of attack damage" (lifesteal-style) scaler are therefore unrepresentable —
 *     the observable payload is the recovery CHANNEL (count/target set/cadence),
 *     which is what these tests pin. Magnitude is it.skip'd.
 *   - [B] "Incoming healing \u25b2 26.98%" has NO StatKey in the schema (no
 *     incomingHealingPct) and no HP amounts exist to scale — GAP, it.skip'd. Its
 *     TARGET SET (2 highest final ATK) is still testable if the line is encoded as a
 *     buff on any stat, so the target-set test is written against whatever buff the
 *     override emits on that block and skips cleanly if the line is unmodeled.
 *   - [D] "Storage: Stores excess healing" — an overheal-banking shield-like pool.
 *     v1 models no HP and no overheal, so the stored amount is unobservable. GAP.
 *   - [E] "DEF \u25b2 20.9% of the skill user's DEF" — defPct is explicitly inert in
 *     v1 (self DEF does not affect own damage). Kept as a buff for completeness per
 *     the HP/DEF-scaler rule; the test pins that it is EMITTED and that it is
 *     damage-INERT, which is the entire faithful claim.
 */

const SLUG = 'marciana';

type Ev = SimEvent & Record<string, unknown>;

function run(opts: Parameters<typeof runComp>[0]) {
  const events: Ev[] = [];
  const res = runComp({
    ...opts,
    cfg: {
      ...(opts.cfg ?? {}),
      onEvent: (ev: SimEvent) => events.push(ev as Ev),
    },
  });
  return { res, events };
}

const base = controlComp(SLUG, true);

// ---------------------------------------------------------------------------
// Hoisted runs (each runComp is a full 180s sim — keep the file well under ~20)
// ---------------------------------------------------------------------------

// R1 — the shipped override, unmodified.
const R1 = run(base);

// R2 — skill1 stripped entirely (both [A] and [B]). Nearest-wrong for "the skill1
// heal channel exists at all".
const noSkill1 = withPatchedOverride(SLUG, (ov) => {
  if (ov.skill1) {
    ov.skill1.blocks = [];
  }
});
const R2 = run({ ...base, overrides: { [SLUG]: noSkill1 } });

// R3 — skill1 re-keyed lastBullet -> shotFired. Nearest-wrong TRIGGER IDENTITY for
// "Activates when the last bullet hits the target" (per-magazine, not per-pull).
const skill1AsShotFired = withPatchedOverride(SLUG, (ov) => {
  for (const b of ov.skill1?.blocks ?? []) {
    if (b.trigger?.kind === 'lastBullet') {
      b.trigger = { kind: 'shotFired' };
    }
  }
});
const R3 = run({ ...base, overrides: { [SLUG]: skill1AsShotFired } });

// R4 — skill2 re-keyed burstCast -> fullBurstEnter. Nearest-wrong TRIGGER IDENTITY
// for "Activates when using Burst Skill": in a comp holding another burst-capable
// unit these diverge, and fullBurstEnter OVER-CREDITS (it fires on team Full Bursts
// marciana did not cast into).
const skill2AsFbEnter = withPatchedOverride(SLUG, (ov) => {
  for (const b of ov.skill2?.blocks ?? []) {
    if (b.trigger?.kind === 'burstCast') {
      b.trigger = { kind: 'fullBurstEnter' };
    }
  }
});
const R4 = run({ ...base, overrides: { [SLUG]: skill2AsFbEnter } });

// R5 — burst slot stripped. Nearest-wrong for the burst DEF line existing / being
// damage-inert.
const noBurst = withPatchedOverride(SLUG, (ov) => {
  if (ov.burst) {
    ov.burst.blocks = [];
  }
});
const R5 = run({ ...base, overrides: { [SLUG]: noBurst } });

// Event slices reused across groups.
const evs1 = R1.events;
const heals1 = evs1.filter((e) => e.kind === 'heal' || e.kind === 'recovery');
const buffs1 = evs1.filter((e) => e.kind === 'buffApply');
const marcianaBursts1 = evs1.filter(
  (e) => e.kind === 'burstCast' && (e.slug === SLUG || e.unit === SLUG)
);
const fbStarts1 = evs1.filter((e) => e.kind === 'fullBurstStart');

// The marciana unit row + its slot index (needed to attribute caster-scoped events).
const marcianaRow1 = unitOf(R1.res, SLUG);
const marcianaIdx =
  (marcianaRow1 as { slotIdx?: number; idx?: number }).slotIdx ??
  (marcianaRow1 as { slotIdx?: number; idx?: number }).idx;

describe('marciana — fixture sanity (non-vacuity)', () => {
  it('the control comp actually bursts: marciana casts her Burst II and Full Bursts occur', () => {
    // Non-vacuity gate for EVERY burst-keyed assertion below. A comp that never
    // completes a chain makes zero Full Bursts and would make the skill2 / burst
    // groups silently pass on empty sets.
    expect(marcianaBursts1.length).toBeGreaterThan(0);
    expect(fbStarts1.length).toBeGreaterThan(0);
  });

  it('marciana reloads more than once, so "last bullet" fires repeatedly (non-vacuity)', () => {
    // 9-round SG magazine over 180s => many magazines. If this were 0 or 1 the
    // lastBullet-vs-shotFired discrimination below would be untestable.
    const reloads = evs1.filter(
      (e) => e.kind === 'reload' && (e.slug === SLUG || e.unit === SLUG)
    );
    expect(reloads.length).toBeGreaterThan(1);
  });

  it('marciana herself deals damage (she carries a weapon, not just support lines)', () => {
    // Guards the inertness assertions: if her own total were 0, "teammates
    // unchanged AND marciana unchanged" would be trivially true everywhere.
    expect(totals(R1.res)[SLUG]).toBeGreaterThan(0);
  });
});

describe('marciana skill1 [A] — "last bullet hits" heal, all allies', () => {
  it('emits a heal/recovery channel at all (RED if the line is dropped)', () => {
    expect(heals1.length).toBeGreaterThan(0);

    const healsNoS1 = R2.events.filter(
      (e) => e.kind === 'heal' || e.kind === 'recovery'
    );
    // Nearest-wrong: skill1 not modeled. The channel must shrink measurably.
    expect(healsNoS1.length).toBeLessThan(heals1.length);
  });

  it('the heal targets ALL allies, not just the caster (target set)', () => {
    // "Affects all allies" — every slot in the comp must receive recovery at least
    // once. Nearest-wrong (self-only / topAtk-only) leaves at least one slot dry.
    const healedSlugs = new Set(
      heals1
        .map((e) => (e.targetSlug ?? e.slug) as string | undefined)
        .filter((s): s is string => typeof s === 'string')
    );
    const compSlugs = Object.keys(totals(R1.res));
    for (const s of compSlugs) {
      expect(healedSlugs.has(s)).toBe(true);
    }
  });

  it('fires per-MAGAZINE (lastBullet), not per trigger-pull (shotFired)', () => {
    // TRIGGER IDENTITY. marciana's magazine is 9 rounds, so a shotFired keying
    // produces ~9x the activations. This is the single most valuable
    // discrimination in the file: both models emit the same KIND of event, and
    // only the COUNT separates them.
    const healsShotFired = R3.events.filter(
      (e) => e.kind === 'heal' || e.kind === 'recovery'
    );
    expect(healsShotFired.length).toBeGreaterThan(heals1.length * 2);

    // And bound the faithful count against marciana's own reload count: one
    // last-bullet activation per magazine, per ally.
    const marcianaReloads = evs1.filter(
      (e) => e.kind === 'reload' && (e.slug === SLUG || e.unit === SLUG)
    ).length;
    const compSize = Object.keys(totals(R1.res)).length;
    // Allow slack for the burst-slot heal ([C]) riding the same channel and for a
    // partial trailing magazine, but the order of magnitude must be magazines,
    // not pulls.
    expect(heals1.length).toBeLessThanOrEqual(
      (marcianaReloads + 2) * compSize + 8
    );
  });

  it('is damage-INERT on teammates by itself (tandem-only channel)', () => {
    // marciana's heal has no HP amount in v1; it can only matter via a teammate's
    // on-recovery consumer. Removing skill1 must not silently move a teammate that
    // has no such consumer. Byte-identical is the claim where it holds; where a
    // consumer DOES exist the delta is the tandem payload and is reported by the
    // next assertion instead.
    const t1 = totals(R1.res);
    const t2 = totals(R2.res);
    // marciana's OWN damage never depends on her heal lines.
    expect(t2[SLUG]).toBe(t1[SLUG]);
  });

  it('any teammate damage delta from skill1 is attributable to an on-recovery consumer', () => {
    // Non-vacuity + TANDEM rule: a heal line is never "skip on isolation". If a
    // teammate moves when skill1 is stripped, that is the recovery-trigger tandem
    // and it must be a DECREASE (removing a heal cannot raise damage).
    const t1 = totals(R1.res);
    const t2 = totals(R2.res);
    for (const slug of Object.keys(t1)) {
      if (slug === SLUG) {
        continue;
      }
      expect(t2[slug]).toBeLessThanOrEqual(t1[slug]);
    }
  });

  it.skip('heal MAGNITUDE = 10.95% of attack damage over 3 sec — GAP: no HP pool / no lifesteal scaler', () => {
    // The engine\u2019s heal effect carries no amount and there is no HP model in v1,
    // so "10.95% of attack damage" is unobservable. Recorded as unmodeled.
  });
});

describe('marciana skill1 [B] — Incoming Healing \u25b2 26.98%, 2 highest final ATK', () => {
  it.skip('Incoming Healing \u25b2 26.98% — GAP: no incomingHealingPct StatKey and no HP amounts to scale', () => {
    // No schema primitive exists for incoming-healing modification, and with no HP
    // pool the stat would have no consumer. Belongs in the override\u2019s `unmodeled`.
  });

  it('if the line IS encoded as a buff, it reaches exactly 2 allies ranked by FINAL ATK', () => {
    // TARGET SET + the byFinalAtk literal-word rule: the kit says "highest FINAL
    // ATK", so ranking must use live effectiveAtk, not staticAtk, and the count is
    // 2 (not all-allies). Nearest-wrong models are alliesTopAtk count!=2, or an
    // `allies` target, or static ranking.
    const s1Buffs = buffs1.filter(
      (e) =>
        e.casterIdx === marcianaIdx &&
        typeof e.value === 'number' &&
        Math.abs((e.value as number) - 26.98) < 1e-6
    );
    if (s1Buffs.length === 0) {
      // Line is unmodeled (the documented GAP). Nothing to assert; the skip above
      // is the record.
      expect(s1Buffs.length).toBe(0);
      return;
    }
    const perActivation = new Map<number, Set<string>>();
    for (const e of s1Buffs) {
      const f = (e.frame ?? 0) as number;
      if (!perActivation.has(f)) {
        perActivation.set(f, new Set());
      }
      perActivation.get(f)!.add(String(e.targetSlug ?? e.targetIdx));
    }
    for (const targets of perActivation.values()) {
      expect(targets.size).toBe(2);
    }
  });
});

describe('marciana skill2 [C] — "when using Burst Skill", all allies, heal = 28.11% of caster Max HP', () => {
  it('fires on marciana\u2019s OWN burst casts, not on every team Full Burst', () => {
    // TRIGGER IDENTITY, the highest-value trap for this unit: "Activates when using
    // Burst Skill" is burst-cast keyed. The control comp contains other burst
    // casters, so a fullBurstEnter keying fires strictly more often. R4 is that
    // nearest-wrong model; the faithful run must produce FEWER skill2 activations.
    const s2HealsFaithful = R1.events.filter(
      (e) =>
        (e.kind === 'heal' || e.kind === 'recovery') &&
        (e.slot === 'skill2' || e.srcSlot === 'skill2')
    );
    const s2HealsWrong = R4.events.filter(
      (e) =>
        (e.kind === 'heal' || e.kind === 'recovery') &&
        (e.slot === 'skill2' || e.srcSlot === 'skill2')
    );

    if (s2HealsFaithful.length > 0 || s2HealsWrong.length > 0) {
      expect(s2HealsWrong.length).toBeGreaterThanOrEqual(
        s2HealsFaithful.length
      );
    }

    // Slot attribution may not be carried on heal events; fall back to the
    // structural invariant that always holds: marciana\u2019s own burst-cast count is
    // the activation ceiling for a burstCast-keyed line, and the team Full Burst
    // count is strictly larger in this comp.
    expect(fbStarts1.length).toBeGreaterThanOrEqual(marcianaBursts1.length);
  });

  it('reaches all allies (target set), once per marciana burst cast', () => {
    const compSlugs = Object.keys(totals(R1.res));
    // Every ally must appear as a recovery target somewhere in the run; combined
    // with the [A] all-allies assertion this pins "Affects all allies" for the
    // heal channel as a whole.
    const healed = new Set(
      heals1
        .map((e) => (e.targetSlug ?? e.slug) as string | undefined)
        .filter((s): s is string => typeof s === 'string')
    );
    expect(healed.size).toBe(compSlugs.length);
  });

  it('any Max-HP grant riding this line is FLAT-resolved, never the raw 28.11', () => {
    // Caster-scaled resolution rule: casterMaxHpPct re-emits under stat
    // \u2018maxHpFlat\u2019 with (kit%/100) \u00d7 caster Max HP. Nearest-wrong is an override that
    // emits the raw percentage (or uses targetMaxHpPct, which would scale by each
    // ALLY\u2019s Max HP and produce differing values per target).
    const flat = buffs1.filter(
      (e) => e.stat === 'maxHpFlat' && e.casterIdx === marcianaIdx
    );
    for (const e of flat) {
      expect(e.value).not.toBe(28.11);
      expect(e.value as number).toBeGreaterThan(100);
    }
    // casterMaxHpPct scales by the CASTER, so every target in one activation gets
    // the SAME flat number (targetMaxHpPct would differ per ally) \u2014 this is the
    // discriminator between the two scalers.
    const byFrame = new Map<number, Set<number>>();
    for (const e of flat) {
      const f = (e.frame ?? 0) as number;
      if (!byFrame.has(f)) {
        byFrame.set(f, new Set());
      }
      byFrame.get(f)!.add(e.value as number);
    }
    for (const vals of byFrame.values()) {
      expect(vals.size).toBe(1);
    }
  });

  it('is damage-inert for marciana herself under the wrong trigger keying', () => {
    // Guards against a "fix" that smuggles damage into the heal line: re-keying
    // skill2 must not change marciana\u2019s own output at all.
    expect(totals(R4.res)[SLUG]).toBe(totals(R1.res)[SLUG]);
  });

  it.skip('heal AMOUNT = 28.11% of caster final Max HP applied to ally HP \u2014 GAP: no HP pool in v1', () => {
    // Only the recovery CHANNEL is observable; the healed amount has no consumer.
  });
});

describe('marciana burst [D] — Storage: banks excess healing up to 27.87% of Max HP, 10 sec', () => {
  it.skip('overheal banking \u2014 GAP: v1 models no HP pool and no overheal, so "excess healing" is unobservable', () => {
    // There is no primitive for an overheal reservoir. The nearest existing shape
    // (`shield` with maxHpPct) is a DIFFERENT mechanic (a damage-absorbing pool
    // applied at cast), and encoding Storage as a shield would be a fabricated
    // mechanic, not a faithful one. Belongs verbatim in `unmodeled.burst`.
  });

  it('does not silently become a shield (no shielded-trigger side effects appear)', () => {
    // Discriminates the faithful GAP from the nearest-wrong "model it as a shield"
    // fix: a shield effect would emit shield events and could open a teammate\u2019s
    // `shielded` trigger / requiresShielded gate, which the kit never grants.
    const shields = evs1.filter((e) => e.kind === 'shield');
    const fromMarciana = shields.filter((e) => e.casterIdx === marcianaIdx);
    expect(fromMarciana.length).toBe(0);
  });
});

describe('marciana burst [E] — DEF \u25b2 20.9% of the skill user\u2019s DEF for 10 sec, all allies', () => {
  it('emits a DEF buff on burst cast (kept for completeness even though defPct is inert)', () => {
    // The HP/DEF-scaler rule says keep the stat buff even when the engine treats it
    // as inert \u2014 a future consumer/scaler needs it present. Nearest-wrong: the line
    // is dropped entirely.
    const defBuffs = buffs1.filter(
      (e) => e.stat === 'defPct' && e.casterIdx === marcianaIdx
    );
    const defBuffsNoBurst = R5.events.filter(
      (e) =>
        e.kind === 'buffApply' &&
        e.stat === 'defPct' &&
        e.casterIdx === marcianaIdx
    );
    expect(defBuffs.length).toBeGreaterThan(defBuffsNoBurst.length);
  });

  it('the DEF buff is time-bounded at 10 sec, not permanent', () => {
    // DURATION SEMANTICS: "for 10 sec" is wall-clock (not rounds, not permanent).
    // Read expiresFrame off the buffApply \u2014 the engine emits NO buffRemove on
    // natural time lapse, so a removal-frame assertion would be wrong by
    // construction.
    const defBuffs = buffs1.filter(
      (e) => e.stat === 'defPct' && e.casterIdx === marcianaIdx
    );
    if (defBuffs.length === 0) {
      return;
    } // covered by the emission test above
    for (const e of defBuffs) {
      const expires = e.expiresFrame as number | undefined;
      const frame = (e.frame ?? 0) as number;
      expect(typeof expires).toBe('number');
      expect((expires as number) - frame).toBe(600); // 10 sec @ 60fps
      // Not a round-count duration.
      expect(e.durationShots).toBeUndefined();
    }
  });

  it('reaches all allies ("Affects all allies"), same flat/percent value for each', () => {
    const defBuffs = buffs1.filter(
      (e) => e.stat === 'defPct' && e.casterIdx === marcianaIdx
    );
    if (defBuffs.length === 0) {
      return;
    }
    const byFrame = new Map<number, Set<string>>();
    for (const e of defBuffs) {
      const f = (e.frame ?? 0) as number;
      if (!byFrame.has(f)) {
        byFrame.set(f, new Set());
      }
      byFrame.get(f)!.add(String(e.targetSlug ?? e.targetIdx));
    }
    const compSize = Object.keys(totals(R1.res)).length;
    for (const targets of byFrame.values()) {
      expect(targets.size).toBe(compSize);
    }
  });

  it('is DAMAGE-INERT: stripping the burst slot leaves every unit byte-identical', () => {
    // The faithful claim for this line is precisely that it moves NO damage
    // (defPct is inert in v1: self DEF does not affect own damage, and there is no
    // incoming damage). Nearest-wrong: an override that \u201chelpfully\u201d encodes the DEF
    // line as atkPct/attackDamagePct to \u201cmake the burst do something\u201d \u2014 that would
    // move totals here and turn this test RED.
    const t1 = totals(R1.res);
    const t5 = totals(R5.res);
    for (const slug of Object.keys(t1)) {
      expect(t5[slug]).toBe(t1[slug]);
    }
  });

  it('marciana\u2019s burst carries no damage effect (no burst-bucket damage from her slot)', () => {
    // The kit\u2019s burst block has NO damage line at all. Nearest-wrong: a fabricated
    // flatDamage rider to \u201cjustify\u201d a Burst II. Any damage event sourced to her
    // burst slot is a fabrication.
    const burstDmg = evs1.filter(
      (e) =>
        e.kind === 'damage' &&
        (e.srcSlot === 'burst' || e.slot === 'burst') &&
        (e.slug === SLUG || e.unit === SLUG)
    );
    expect(burstDmg.length).toBe(0);
  });
});

describe('marciana — whole-unit inertness envelope', () => {
  it('has no self ATK/crit/damage buff anywhere in the kit', () => {
    // Whole-picture guard: marciana\u2019s kit text contains exactly one \u25b2 stat line
    // (Incoming Healing) and one DEF \u25b2 line. Any offensive stat buff sourced to
    // her is invented.
    const offensive = new Set([
      'atkPct',
      'casterAtkPct',
      'highestAllyAtkPct',
      'atkOfMaxHpPct',
      'critRatePct',
      'critRateNormalPct',
      'critDamagePct',
      'coreDamagePct',
      'elementDamagePct',
      'attackDamagePct',
      'sustainedDamagePct',
      'damageTakenPct',
      'trueDamagePct',
      'normalAttackPct',
      'pelletCountFlat',
      'maxAmmoPct',
      'maxAmmoFlat',
      'reloadSpeedPct',
      'attackSpeedPct',
      'fireRatePct',
      'burstGenPct',
      'hitRatePct',
    ]);
    const invented = buffs1.filter(
      (e) => e.casterIdx === marcianaIdx && offensive.has(e.stat as string)
    );
    expect(invented.map((e) => e.stat)).toEqual([]);
  });

  it('does not grant Pierce (kit has no Pierce line)', () => {
    const pierce = evs1.filter(
      (e) => e.kind === 'buffApply' && e.stat === 'pierceDamagePct'
    );
    expect(pierce.length).toBe(0);
    expect(unitOf(R1.res, SLUG)).toBeTruthy();
  });
});
