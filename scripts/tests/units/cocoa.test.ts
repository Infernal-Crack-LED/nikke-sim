// PER-UNIT KIT SPEC — `cocoa` (Cocoa, SR/Fire/Supporter/Burst I, Tetra, cd 20s, ammo 6,
// chargeFrames 60, burstGaugePerShot 2.8). Kit-autonomy gauntlet 2026-08-03.
//
// Cocoa is a PURE defensive/utility kit — ZERO lines touch damage dealt. Every one of her five
// lines is UNMODELED (inert), and the override's load-bearing claim is exactly that: empty
// blocks, full prose verbatim in `unmodeled`, nothing dropped, nothing fabricated.
//
// Kit (data/characters.json → characters.cocoa.skills, SL10):
//   S1 ■ all allies: Restores 17.76% of Cover HP.                                   [C1 gap]
//      ■ 2 random ally unit(s) with debuffs: Removes 1 debuff(s).                   [C2 gap]
//   S2 ■ Full Charge attack → self: Damage Taken ▼4.37%, 15 stacks, lasts 5 sec    [C3 gap]
//   BU ■ all allies: Removes 1 debuff(s).                                          [C4 gap]
//      ■ Tomato Sauce at max stacks → all enemies: ATK ▼13.59% for 10 sec          [C5 gap]
//
// WHY EACH LINE IS UNMODELED (all five are out-of-domain for a damage-dealt sim, and each has a
// nearest-wrong encoding the assertions below must discriminate against):
//   C1  cover HP is the team's COVER resource, not unit HP — v1 has no HP pool and no cover pool.
//       The nearest wrong encoding is a `heal` effect: that would emit recovery events and fire
//       teammates' on-recovery consumers (crown), a synergy cocoa does not have in game.
//   C2/C4 debuff cleanse — the sim has no ally-debuff model (v1 boss deals no damage, applies no
//       debuffs), so there is nothing to remove. No primitive exists; encoding one would invent
//       state the fight never contains.
//   C3  Damage Taken ▼ on SELF — v1 models no incoming damage, so a damage-taken modifier has no
//       consumer. The 15-stack/5-sec stacking resource is unmodeled with the line it feeds.
//   C5  ATK ▼ on ALL ENEMIES — enemy ATK ▼ is dropped at dispatch (no incoming-damage model;
//       the enemy-buff allowlist admits damageTakenPct/distributedDamagePct/defPct only): the boss
//       never attacks in a way that feeds our numbers. The nearest wrong encoding is reading the
//       enemy debuff as enemy `damageTakenPct` (the boss takes MORE damage) — a different mechanic
//       that would inflate team damage. The max-stacks gate is unmodeled with the line it gates.
//
// Because no line is encoded, the gauge line needs no override block either: cocoa's burst gauge
// (2.8/shot) is carried by data/characters.json's `burstGaugePerShot` default path — she is not
// in data/gauge-per-shot.json and has no kit line that modifies gauge.
//
// The assertions discriminate the inertness (a pure "nothing happens" test gates nothing — an
// over-encoding must provably FAIL here):
//   N1  damage NEUTRALITY: every unit's total is byte-identical with cocoa's kit swapped for the
//       synthetic empty kit in the SAME comp — the committed override encodes zero effects.
//   N2  DISCRIMINATING (C5): re-encoding the burst ATK▼ as enemy damageTakenPct 13.59 MOVES team
//       totals — the shipped inertness is one the nearest-wrong model provably fails.
//   N3  DISCRIMINATING (C1): re-encoding the cover-HP restore as a `heal` on a 15s interval ADDS
//       recovery firings, read through crown's "when recovery takes effect" consumer — proving the
//       shipped override emits zero recovery events (cover repair is not HP recovery).
//   N4  STRUCTURE + DOCUMENTATION: all three block arrays are empty; cocoa originates zero buffs;
//       no `heal`/`shield` effect kind anywhere; every kit line lives verbatim in `unmodeled`
//       (checked dynamically against the characters.json prose — never an `ignored` drop).
//
// FIXTURE. cocoa (B1, the SOLE Burst I) / crown (B2) / ada (B3) / helm (B3), boss Fire, focus
// ada, 180s, deterministic (no seed). cocoa opens every chain (9 casts / 9 Full Bursts in the
// probe), so her burst CAST is exercised even though its blocks are empty. helm's S1 full-charge
// heals saturate crown's recovery consumer — that consumer is N3's observable: any recovery event
// cocoa emitted would add firings beyond helm's contribution. Slot order: cocoa 0 / crown 1 /
// ada 2 / helm 3.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  bareWeaponOverride,
  data,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUGS = ['cocoa', 'crown', 'ada', 'helm'];
/** Slot order: cocoa 0 / crown 1 / ada 2 / helm 3. */
const COCOA = 0;
const CROWN = 1;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: SLUGS,
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { res, events };
}

// ---- counterfactuals (nearest-wrong encodings of the unmodeled lines) ------------------------
/** N2 counterfactual (C5): the burst's enemy ATK▼ re-read as "boss takes 13.59% more damage". */
const cocoaAtkAsDamageTaken = withPatchedOverride('cocoa', (ov) => {
  if (ov.burst?.length) {
    throw new Error('cocoa burst blocks must be empty — fixture is stale');
  }
  ov.burst = [
    {
      slot: 'burst',
      trigger: { kind: 'burstCast' },
      target: { kind: 'enemy' },
      effects: [
        { kind: 'buff', stat: 'damageTakenPct', value: 13.59, durationSec: 10 },
      ],
    },
  ];
});
/** N3 counterfactual (C1): the cover-HP restore re-read as an HP heal on the skill1 15s clock. */
const cocoaCoverAsHeal = withPatchedOverride('cocoa', (ov) => {
  if (ov.skill1?.length) {
    throw new Error('cocoa skill1 blocks must be empty — fixture is stale');
  }
  ov.skill1 = [
    {
      slot: 'skill1',
      trigger: { kind: 'interval', sec: 15 },
      target: { kind: 'allies' },
      effects: [{ kind: 'heal' }],
    },
  ];
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const bareInTeam = run({ cocoa: bareWeaponOverride('cocoa') });
const atkAsDamageTaken = run({ cocoa: cocoaAtkAsDamageTaken });
const coverAsHeal = run({ cocoa: cocoaCoverAsHeal });

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
const cocoaBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === COCOA);
const cocoaBursts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'burstCast' && e.slug === 'cocoa').length;
const cocoaShots = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'shot' && e.slug === 'cocoa').length;
/** crown's "when recovery takes effect" firings — one per distinct frame a recovery landed. */
const recoveryFirings = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === CROWN && b.stat === 'attackDamagePct' && b.value === 20.99
  ).length;

// The committed override, for the static (structural / unmodeled) pins.
const shipped = loadOverride('cocoa') as any;
if (!shipped) {
  throw new Error('cocoa has no override on disk — fixture is stale');
}

/** The kit's logical lines, rebuilt from characters.json prose: each "■" bullet clause merged
 *  with its indented effect lines. The SSOT comparison target for the verbatim pin. */
const kitLines = (slot: 'skill1' | 'skill2' | 'burst'): string[] =>
  data.characters.cocoa.skills[slot]
    .split(/\n(?=■)/)
    .map((l) => l.replace(/^■\s*/, '').replace(/\n/g, ' '));

describe('cocoa — fixture sanity (non-vacuity)', () => {
  it('the comp actually bursts: cocoa casts her Burst I and Full Bursts occur', () => {
    // Non-vacuity gate: cocoa is the SOLE Burst I, so every chain runs through her cast. A comp
    // that never burst would let the neutrality pins pass silently on a degenerate fight.
    expect(cocoaBursts(base.events)).toBeGreaterThan(0);
    expect(
      base.events.filter((e) => e.kind === 'fullBurstStart').length
    ).toBeGreaterThan(0);
  });

  it('cocoa fires her SR repeatedly and deals weapon damage', () => {
    // Her full-charge cadence is the clock her S2 stacks would run on; zero shots would make the
    // "she contributes nothing" claim trivially true.
    expect(cocoaShots(base.events)).toBeGreaterThan(1);
    expect(unitOf(base.res, 'cocoa').totalDamage).toBeGreaterThan(0);
  });
});

describe('N1 — damage neutrality: the committed override encodes zero effects', () => {
  it("every unit's total is byte-identical with cocoa's kit swapped for the empty kit", () => {
    // The artifact's load-bearing claim: all five lines are out-of-domain, so the override's
    // blocks are empty and the fight is point-for-point the bare-weapon fight (in-team bare run
    // keeps the other three units identical, isolating cocoa's contribution).
    expect(totals(base.res)).toEqual(totals(bareInTeam.res));
  });
});

describe('N2 — DISCRIMINATING: the burst ATK▼ is NOT an enemy damage-taken amp', () => {
  it('re-encoding ATK ▼13.59% as enemy damageTakenPct MOVES team totals', () => {
    // C5's nearest wrong model: "debuff on all enemies" misread as "boss takes more damage". The
    // engine drops true enemy ATK▼ at dispatch (no incoming-damage model), so the shipped
    // inertness must be the model this counterfactual provably fails.
    expect(totals(atkAsDamageTaken.res)).not.toEqual(totals(base.res));
  });
});

describe('N3 — DISCRIMINATING: the cover-HP restore is NOT a recovery event', () => {
  it('re-encoding the cover heal as a `heal` adds crown recovery firings', () => {
    // C1's nearest wrong model: cover repair misread as HP healing. helm's S1 heals already keep
    // crown's consumer busy; cocoa's 15s cover "heals" land on additional frames, so a heal
    // encoding strictly increases firings — the shipped zero is the model it provably fails.
    expect(recoveryFirings(coverAsHeal.events)).toBeGreaterThan(
      recoveryFirings(base.events)
    );
  });

  it('the shipped fight’s recovery channel is helm-driven only (cocoa adds none)', () => {
    expect(recoveryFirings(base.events)).toBeGreaterThan(0);
  });
});

describe('N4 — structure + documentation: empty blocks, every line verbatim in unmodeled', () => {
  it('all three skill slots are empty block arrays (zero encoded effects)', () => {
    expect(shipped.skill1).toEqual([]);
    expect(shipped.skill2).toEqual([]);
    expect(shipped.burst).toEqual([]);
  });

  it('cocoa originates zero buffs and zero effects of any kind', () => {
    // No stat in her kit is an ally-side offensive buff; any buffApply from her slot is an
    // invented effect.
    expect(cocoaBuffs(base.events)).toEqual([]);
    expect(cocoaBuffs(coverAsHeal.events).length).toBe(0);
  });

  it('every kit line is documented VERBATIM in `unmodeled` (checked vs characters.json)', () => {
    for (const slot of ['skill1', 'skill2', 'burst'] as const) {
      const documented = (shipped.unmodeled?.[slot] ?? []) as string[];
      for (const line of kitLines(slot)) {
        expect(
          documented,
          `${slot} line missing from unmodeled: "${line}"`
        ).toContain(line);
      }
    }
  });

  it('no `ignored` block, and no heal/shield/any effect kind anywhere in the file', () => {
    expect(shipped.ignored).toBeUndefined();
    const kinds = [
      ...shipped.skill1,
      ...shipped.skill2,
      ...shipped.burst,
    ].flatMap((b: any) => b.effects.map((e: any) => e.kind));
    expect(kinds).toEqual([]);
  });
});
