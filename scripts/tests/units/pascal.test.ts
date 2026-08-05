// PER-UNIT KIT SPEC — `pascal` (Pascal — RL / Supporter / Iron / Burst I, Abnormal, cd 40s,
// ammo 6, hitsPerShot 1, reloadFrames 171, rate_of_fire 90, burstGaugePerShot 1.15,
// original_rare SR, released 2023-09-01). Kit-autonomy gauntlet 2026-08-05.
// BASE unit, no variant (slug-disambiguation lint passes clean).
//
// NOTE: this is a FROM-SCRATCH unit — there was no shipped override before this gauntlet
// (simSupported was false, no kit-status row), so the harness cannot even load her until
// src/skills/overrides/pascal.json exists (the RED state of this suite: every assertion
// fails at load). Every assertion below PINS a kit line GREEN vs that override and RED vs
// the nearest-wrong counterfactual (withPatchedOverride), so the file discriminates exactly
// as a verification gauntlet would (ether/novel/sora precedent).
//
// Kit (blablalink prose, data/characters.json → characters.pascal.skills, lvl 10):
//   S1 "Watch Out!"
//      ■ after firing 10 time(s) → 1 ally with the highest final DEF:
//        Recovers 6.28% of the skill user's final Max HP as HP                [UNMODELED — P3]
//   S2 "I'll Do My Best"
//      ■ entering Burst Stage 1 → 3 allies with the lowest remaining HP:
//        Incoming healing ▲ 38.4% for 10 sec                                  [UNMODELED — P3]
//   BU "Stay Safe, Everyone!" (B1, cd 40s)
//      ■ 3 allies with the lowest remaining HP:
//        Recovers 55.29% of the skill user's final Max HP as HP               [FAITHFUL — P1]
//
// PASCAL IS A PURE HEALER. Her kit has exactly ONE line with any expression in a
// damage-dealt sim — the burst's team heal — and only as a RECOVERY EVENT: the engine
// models no HP amounts (sim.ts `case 'heal'` emits valueless recovery events), so the
// 55.29%-of-final-Max-HP magnitude is unrecordable; the heal's observable is the
// on-recovery consumers it feeds (asuka's S1 in the fixture).
//
// WHY EACH UNMODELED LINE IS UNMODELED (each has a nearest-wrong encoding the assertions
// must discriminate against):
//   S1  TWO independent blockers. (a) The heal AMOUNT (6.28% of pascal's final Max HP) is
//       unrecordable like every heal (no HP pool). (b) The TARGETING — "the 1 ally with
//       the HIGHEST FINAL DEF" — has NO engine primitive: TargetDef carries ATK-ranking
//       (alliesTopAtk/byFinalAtk) and the lowest-remaining-HP stand-in (alliesLowestHp),
//       but no DEF-ranking selector (grep-verified: resolveTargets in sim.ts has no DEF
//       path). The recovery-EVENT cadence (every 10th shot) IS expressible on hitCount:10,
//       but emitting it against ANY available stand-in (self / all allies / leftmost-1)
//       would FABRICATE a recovery attribution the kit never makes — on-recovery consumers
//       fire off the recipient, so a wrong-target heal feeds consumers the real kit does
//       not (or starves one it does). A bounded, priced absence (flora/grave precedent:
//       genuine missing primitive → ⚑ estimate+recipe+tier, DOCUMENTED_GAP, not
//       NO-GO(engine-core) — the line is bounded by comp: it moves damage only in teams
//       fielding an on-recovery consumer, and only via that consumer's window). Nearest
//       wrong: hitCount:10 → allies/self/alliesLowestHp:1 → heal — pinned RED below (it
//       floods the recovery channel at shot cadence, ≫ cast cadence).
//   S2  "Incoming healing ▲ 38.4%" — there is no incomingHealingPct StatKey and heal
//       effects carry no HP amount, so the amplifier multiplies nothing: damage-neutral by
//       construction. sakura-suzuhara's S2 is the IDENTICAL kit line and the binding
//       precedent (verbatim unmodeled, never proxied). Nearest wrong: encoding the line as
//       a HEAL on stageEnter:1 (it is a stat buff on the recipients, not a heal — the
//       proxy would spuriously emit recovery events at every chain start and feed
//       on-recovery consumers) — pinned RED below.
//
// WHY THE P1 ASSERTIONS DISCRIMINATE (the line is offensively inert on pascal herself, so
// TOTALS alone cannot discriminate — the evidence is the EVENT LOG read through a consumer):
//   P1a the burst heal fires a recovery landing on asuka's S1 consumer ("when recovery
//       takes effect" → self atkPct 96.98/25s) at EVERY pascal burst cast, on the CAST
//       frame — an instant (ticks-1) heal. A heal-removed counterfactual zeros the
//       consumer (the block is live, not vacuous); a SELF-only target counterfactual also
//       zeros it (the kit says 3 allies, not self); a fullBurstEnter counterfactual moves
//       every landing from the cast frame to the FB-start frame (the cast precedes the
//       window — helm H7 fact).
//   P1b SCOPE pin — the kit says "3 ally unit(s) with the lowest remaining HP": v1 has no
//       HP pool, so alliesLowestHp resolves to the documented LEFTMOST-3 stand-in
//       (types.ts TargetDef comment; sakura-suzuhara/ether precedent). The 4-unit fixture
//       puts a recovery PROBE at slot 3 (outside the leftmost 3): zero probe fires at
//       baseline, one per cast under an all-allies counterfactual. count:3 is kit-literal;
//       the leftmost-vs-real-lowest choice is inherently untestable in v1 (⚑ documented).
//   P1c self-damage-neutrality: pascal's own total is byte-identical with her kit zeroed
//       (bare weapon) — a healer's kit contributes nothing to her OWN damage (sora /
//       snow-crane M1 shape). And the heal is live: it MOVES the consumer's total
//       (asuka's recovery self-buff lifts her own damage) — the inertness is hers alone.
//   P1d absence pin (anti-fabrication for S1/S2): pascal originates ZERO buffApply events
//       and the recovery channel runs at CAST cadence only; the materialized-S1 /
//       materialized-S2 counterfactuals flood it (shot cadence / double cast cadence) —
//       the shipped restraint is a real, falsifiable claim.
//   P1e structure + documentation: skill1/skill2 are EMPTY by construction (not by
//       omission); the burst is exactly one burstCast/alliesLowestHp:3/heal block; every
//       unmodeled entry is VERBATIM prose from characters.json (checked dynamically —
//       never an `ignored` drop).
//
// FIXTURE. pascal (B1, the SOLE Burst I) / folkwang (B2, forced BARE — her shipped
// override carries shields/heals that would contaminate the recovery channel) / asuka
// (B3, burst lifesteal patched OUT so pascal is the SOLE recovery source) / delta (slot 3,
// patched BARE + a synthetic recovery-PROBE block: {recovery trigger → self atkPct 1.23/1s}
// — she sits OUTSIDE the leftmost-3 scope and reads whether the heal reaches slot 3).
// Boss Electric (Iron/Electric ×1.10 clean edge for pascal), focus pascal. Deterministic
// (no seed); event-log over totals. asuka's S1 is a SELF-targeted consumer — exactly one
// buffApply per recovery landing on her. Slot order: pascal 0 / folkwang 1 / asuka 2 /
// delta 3.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  bareWeaponOverride,
  data,
  runComp,
  totals,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUGS = ['pascal', 'folkwang', 'asuka', 'delta'];
/** Slot order: pascal 0 / folkwang 1 / asuka 2 / delta 3. */
const PASCAL = 0;
const ASUKA = 2;
const PROBE = 3;
/** The synthetic probe's buff signature (a value no real kit uses). */
const PROBE_VALUE = 1.23;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;

/** delta at slot 3: bare weapon + a recovery-triggered probe block. She is OUTSIDE the
 *  leftmost-3 burst-heal scope — her probe reads whether the heal reaches slot 3. */
const deltaProbe = withPatchedOverride('delta', (ov) => {
  ov.skill1 = [
    {
      slot: 'skill1',
      trigger: { kind: 'recovery' },
      target: { kind: 'self' },
      effects: [
        { kind: 'buff', stat: 'atkPct', value: PROBE_VALUE, durationSec: 1 },
      ],
    },
  ];
  ov.skill2 = [];
  ov.burst = [];
});

/** asuka's burst lifesteal removed → pascal is the only recovery source in the fight. */
const asukaSoleConsumer = withPatchedOverride('asuka', (ov) => {
  for (const b of ov.burst ?? []) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
    if (b.effects.length === before) {
      throw new Error('asuka burst heal missing — fixture is stale');
    }
  }
});

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: SLUGS,
    bossElement: 'Electric',
    focusSlug: 'pascal',
    overrides: {
      folkwang: bareWeaponOverride('folkwang'), // bare basis cell — no shields/heals
      asuka: asukaSoleConsumer,
      delta: deltaProbe,
      ...overrides,
    },
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { res, events, totals: totals(res) };
}

// ---- counterfactuals (nearest-wrong encodings) ------------------------------------------------
/** P1a counterfactual: the heal removed entirely (a vacuous burst). Guard throws only once
 *  burst blocks exist (post-S3) but none carries the heal — during the RED phase pascal has
 *  no override on disk, so withPatchedOverride throws first (the suite's RED state). */
const pascalNoHeal = withPatchedOverride('pascal', (ov) => {
  const before = (ov.burst ?? []).flatMap((b: any) => b.effects).length;
  ov.burst = (ov.burst ?? []).map((b: any) => ({
    ...b,
    effects: b.effects.filter((e: any) => e.kind !== 'heal'),
  }));
  const after = (ov.burst ?? []).flatMap((b: any) => b.effects).length;
  if (before > 0 && after !== before - 1) {
    throw new Error('pascal burst heal missing — fixture is stale');
  }
});
/** P1a counterfactual: the heal keyed to Full Burst entry instead of her own burst cast. */
const pascalHealOnFbe = withPatchedOverride('pascal', (ov) => {
  for (const b of ov.burst ?? []) {
    if (b.trigger?.kind === 'burstCast') {
      b.trigger = { kind: 'fullBurstEnter' };
    }
  }
});
/** P1a counterfactual: the heal scoped to SELF instead of 3 allies. */
const pascalHealSelfOnly = withPatchedOverride('pascal', (ov) => {
  for (const b of ov.burst ?? []) {
    if (b.effects.some((e: any) => e.kind === 'heal')) {
      b.target = { kind: 'self' };
    }
  }
});
/** P1b counterfactual: the heal to ALL allies instead of the kit's 3-lowest-HP. */
const pascalHealAllAllies = withPatchedOverride('pascal', (ov) => {
  for (const b of ov.burst ?? []) {
    if (b.effects.some((e: any) => e.kind === 'heal')) {
      b.target = { kind: 'allies' };
    }
  }
});
/** P1d counterfactual: S1 MATERIALIZED on a stand-in target (hitCount:10 → all allies →
 *  heal) — the fabricated-recovery misread the unmodeled record rejects. */
const pascalMaterializedS1 = withPatchedOverride('pascal', (ov) => {
  if (ov.skill1?.length) {
    throw new Error('pascal skill1 must be empty — fixture is stale');
  }
  ov.skill1 = [
    {
      slot: 'skill1',
      trigger: { kind: 'hitCount', count: 10 },
      target: { kind: 'allies' },
      effects: [{ kind: 'heal' }],
    },
  ];
});
/** P1d counterfactual: S2 MATERIALIZED as a HEAL on stage-1 entry (the line is an incoming-
 *  healing STAT buff on the recipients, not a heal — the proxy emits spurious recovery
 *  events at every chain start). */
const pascalMaterializedS2 = withPatchedOverride('pascal', (ov) => {
  if (ov.skill2?.length) {
    throw new Error('pascal skill2 must be empty — fixture is stale');
  }
  ov.skill2 = [
    {
      slot: 'skill2',
      trigger: { kind: 'stageEnter', stage: 1 },
      target: { kind: 'alliesLowestHp', count: 3 },
      effects: [{ kind: 'heal' }],
    },
  ];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const bare = run({ pascal: bareWeaponOverride('pascal') });
const noHeal = run({ pascal: pascalNoHeal });
const fbeHeal = run({ pascal: pascalHealOnFbe });
const selfHeal = run({ pascal: pascalHealSelfOnly });
const allAllies = run({ pascal: pascalHealAllAllies });
const materializedS1 = run({ pascal: pascalMaterializedS1 });
const materializedS2 = run({ pascal: pascalMaterializedS2 });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const pascalCasts = (evs: SimEvent[]) =>
  evs
    .filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === 'pascal')
    .map((c) => c.frame)
    .sort((a, b) => a - b);
const fbStarts = (evs: SimEvent[]) =>
  evs
    .filter((e) => e.kind === 'fullBurstStart')
    .map((e) => e.frame)
    .sort((a, b) => a - b);
/** asuka's S1 consumer landings — exactly one buffApply per recovery landing on her. */
const recoveryLandings = (evs: SimEvent[]) =>
  buffs(evs)
    .filter(
      (b) => b.casterIdx === ASUKA && b.stat === 'atkPct' && b.value === 96.98
    )
    .map((b) => b.frame)
    .sort((a, b) => a - b);
/** delta's slot-3 probe fires — recovery events reaching OUTSIDE the leftmost-3. */
const probeFires = (evs: SimEvent[]) =>
  buffs(evs)
    .filter(
      (b) =>
        b.casterIdx === PROBE &&
        b.stat === 'atkPct' &&
        b.value === PROBE_VALUE
    )
    .map((b) => b.frame)
    .sort((a, b) => a - b);
const pascalOriginatedBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === PASCAL);

describe('pascal — kit spec', () => {
  describe('P1 — the burst heals the 3 lowest-HP allies (recovery-event cadence)', () => {
    it('fixture sanity: pascal casts her Burst I ≥3 times and every chain completes', () => {
      const casts = pascalCasts(base.events);
      expect(casts.length).toBeGreaterThanOrEqual(3);
      expect(fbStarts(base.events).length).toBe(casts.length);
    });

    it('fires exactly one recovery landing on asuka per pascal cast, on the CAST frame', () => {
      const casts = pascalCasts(base.events);
      const landings = recoveryLandings(base.events);
      expect(landings.length).toBe(casts.length);
      expect(landings).toEqual(casts);
    });

    it('is live, not vacuous: removing the heal zeros the consumer', () => {
      expect(recoveryLandings(base.events).length).toBeGreaterThan(0);
      expect(recoveryLandings(noHeal.events)).toEqual([]);
    });

    it('targets 3 allies: a self-only heal never reaches asuka', () => {
      expect(recoveryLandings(selfHeal.events)).toEqual([]);
    });

    it('is keyed to burstCast, not fullBurstEnter (the cast precedes the FB window)', () => {
      const casts = pascalCasts(base.events);
      const fbeLandings = recoveryLandings(fbeHeal.events);
      expect(fbeLandings.length).toBe(casts.length);
      expect(fbeLandings).not.toEqual(casts);
      expect(fbeLandings).toEqual(fbStarts(fbeHeal.events));
    });

    it('scope count:3 — the slot-3 probe is OUTSIDE the leftmost-3 at baseline', () => {
      expect(probeFires(base.events)).toEqual([]);
    });

    it('scope count:3 — an all-allies encoding reaches the slot-3 probe once per cast', () => {
      const casts = pascalCasts(allAllies.events);
      const fires = probeFires(allAllies.events);
      expect(fires.length).toBe(casts.length);
      expect(fires).toEqual(casts);
    });
  });

  describe('P1c — the kit is self-damage-neutral AND live on the consumer', () => {
    it("pascal's own total is byte-identical with her kit zeroed (bare weapon)", () => {
      expect(base.totals.pascal).toEqual(bare.totals.pascal);
    });

    it("the heal MOVES the consumer's total (asuka's recovery self-buff)", () => {
      expect(base.totals.asuka).toBeGreaterThan(noHeal.totals.asuka);
    });
  });

  describe('P1d — absence pin: S1/S2 are unmodeled for cause, and the pin falsifies', () => {
    it('pascal originates ZERO buffApply events in the base fight', () => {
      expect(pascalOriginatedBuffs(base.events)).toEqual([]);
    });

    it('DISCRIMINATING: materializing S1 (hitCount:10 heal) floods the recovery channel', () => {
      // shot cadence ≫ cast cadence: the fabricated S1 heals land far more often than casts
      expect(recoveryLandings(materializedS1.events).length).toBeGreaterThan(
        recoveryLandings(base.events).length
      );
    });

    it('DISCRIMINATING: materializing S2 (stage-1 heal proxy) doubles the landings', () => {
      // the kit's line is an incoming-healing STAT buff, not a heal — the proxy adds one
      // spurious recovery landing per chain start on top of the burst's own
      const casts = pascalCasts(materializedS2.events);
      expect(recoveryLandings(materializedS2.events).length).toBeGreaterThan(
        recoveryLandings(base.events).length
      );
      expect(recoveryLandings(materializedS2.events).length).toBeGreaterThanOrEqual(
        casts.length
      );
    });
  });

  describe('P1e — structure + verbatim documentation', () => {
    const ov = loadOverride('pascal')!;
    const prose = data.characters.pascal.skills;

    it('skill1/skill2 are empty by construction; burst is one heal block', () => {
      expect(ov.skill1).toEqual([]);
      expect(ov.skill2).toEqual([]);
      expect(ov.burst).toHaveLength(1);
      const b: any = (ov.burst ?? [])[0];
      expect(b.trigger).toEqual({ kind: 'burstCast' });
      expect(b.target).toEqual({ kind: 'alliesLowestHp', count: 3 });
      expect(b.effects).toEqual([{ kind: 'heal' }]);
    });

    it('every unmodeled entry is VERBATIM prose of its own slot', () => {
      const un = (ov as any).unmodeled as Record<string, string[]>;
      expect(un.skill1.length).toBeGreaterThanOrEqual(1);
      expect(un.skill2.length).toBeGreaterThanOrEqual(1);
      for (const line of un.skill1) {
        expect(prose.skill1).toContain(line);
      }
      for (const line of un.skill2) {
        expect(prose.skill2).toContain(line);
      }
    });

    it('no `ignored` block anywhere; no heal magnitude fabricated in the ENCODING', () => {
      expect(JSON.stringify(ov)).not.toContain('"ignored"');
      // the 6.28 / 38.4 / 55.29 magnitudes are unrecordable (heal = event-only; no
      // incoming-healing stat) — they must not appear as encoded values on any block
      // (the note/caveats may CITE them as documentation).
      const blocks = JSON.stringify([ov.skill1, ov.skill2, ov.burst]);
      expect(blocks).not.toContain('6.28');
      expect(blocks).not.toContain('38.4');
      expect(blocks).not.toContain('55.29');
      expect(blocks).not.toContain('"value"');
    });
  });
});
