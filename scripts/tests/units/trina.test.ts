// PER-UNIT KIT SPEC — `trina` (Trina, Supporter/RL/Electric, Burst II, cd 20s, ammo 6, chargeFrames 60,
// chargeMultiplier 250, hitsPerShot 1, normalMult 68.59 / coreMult 200).
// Kit-autonomy gauntlet 2026-07-24 (driver-authored S2a; tests FIRST; reconciled vs blind S2b claude-fable-5).
//
// One assertion group per KIT LINE (T1..T8), asserted against the override loaded from disk.
// `withPatchedOverride` builds COUNTERFACTUALS only (the nearest-wrong reading each assertion must
// discriminate against) — never the encoding under test.
//
// Kit (data/characters.json → characters.trina.skills, levels 10/10/10):
//   S1 (Nature's Grace — all HEALS, no HP pool in v1):
//      ■ after Full Burst ends → all allies: recover 4.06% of caster final Max HP / 1s for 5s        [T1 —
//        recovery CADENCE modeled (heal ticks:5 intervalSec:1); HP MAGNITUDE stays unmodeled, landed
//        2026-08-03 once the recovery-emitter primitive existed (prika's P7 precedent)]
//      ■ Full Charge, if 2 lowest-HP% allies < 30% → target(s): recover 2.03% caster final Max HP     [T1 —
//        UNMODELED, gate unevaluable (no HP pool)]
//      ■ Full Charge, if 2 lowest-HP% allies < 50% → target(s): recover 1.57% caster final Max HP     [T1 —
//        UNMODELED, gate unevaluable (no HP pool)]
//   S2 (Peaceful Tree):
//      ■ start of battle, only if self alive → all Electric AR allies: Max HP ▲44.98% of caster Max HP
//        without restoring HP, constantly (passive/constant)                                          [T2]
//      ■ start of battle → 1 leftmost Electric AR ally: Invulnerable for 2s (UNMODELED — no invuln
//        primitive; defensive, no HP pool → inert)                                                    [T3]
//      ■ when using Burst Skill → 1 leftmost Electric AR ally: Attack Damage ▲94.15% / Reload Speed
//        ▲50.82% for 10s                                                                              [T4]
//   BU (Mother Forest, burstCast):
//      ■ all allies: Max HP ▲20.14% of caster Max HP without restoring HP / Attack Damage ▲20.9%, 10s [T5]
//      ■ enemy count (excl. Nikkes) == 1 → all allies: Spread Roots — Burst Skill damage of "Affects
//        all enemies" skills ▲435.6% for 5s (GAP — engine has no burst-skill-dmg-amp primitive;
//        teammate-COLD lever for all-enemies B3 nukes, feature request)                               [T6]
//      ■ enemy count (excl. Nikkes) > 2 → all allies: Wilted Roots — same amp ▲64.46% for 5s (GAP,
//        same missing primitive; never fires in solo raid anyway: enemy count == 1)                   [T6]
//      ■ all Electric AR allies: Hit Rate ▲45.3% for 10s = hitRatePct 45.3 (enacted 2026-08-09)       [T7]
//      ■ all Electric AR allies: Max Ammunition Capacity ▲20 round(s) for 10s                         [T8]
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong gates nothing):
//   T1  skill1 is THREE heal lines. v1 has NO HP pool (immortal boss, nobody takes damage), so heal
//       MAGNITUDE is unmodelable — but the fullBurstEnd HoT's recovery CADENCE (every 1s for 5s = 5
//       ticks, printed verbatim in kit prose, nothing about it measurable) IS modeled as
//       heal{ticks:5,intervalSec:1}, precedent-matched to prika's P7 (landed 2026-07-25, same shape).
//       A `heal` effect emits no buffApply of its own (no HP amount to log) — its only observable
//       trace is a downstream on-recovery consumer, so the cadence is pinned on a SEPARATE fixture
//       (liter/trina/crown/ada, trina LEFT of crown) via crown's "when recovery takes effect → team
//       Attack Damage ▲20.99%" block. Nearest-wrong: ticks:1 (a single instant tick, starving the
//       consumer after the first firing) and the heal removed entirely (crown falls back to her own
//       self-heal-cadence baseline). The two Full-Charge threshold heals stay wholly UNMODELED (the
//       ally-HP%<30/<50 gate is unevaluable — every ally is pinned at 100% HP in v1); PIN the absence:
//       trina emits ZERO skill1-keyed TRINA buffApply events (a heal carries no buff of its own) and
//       ZERO skill1-sourced damage. Nearest-wrong: a driver that FABRICATES a heal-as-buff encoding
//       (e.g. a fake passive skill1 buff) — the counterfactual adds one and proves the harness CAN
//       emit skill1-keyed buffApply events, so the zero is a deliberate (partial) skip, not a harness
//       blind spot. GREEN vs shipped (0 skill1 buffApply events), RED vs the fabricated-skill1 cf.
//   T2  "Max HP ▲44.98% of the skill USER'S Max HP … constantly" = casterMaxHpPct 44.98 (a flat add of
//       44.98% of TRINA's Max HP, resolved to maxHpFlat ≈1.35M at apply), passive trigger (frame 0),
//       NO duration (always-on "constantly"), targeting all Electric AR allies (count 99). The engine
//       re-keys casterMaxHpPct → stat `maxHpFlat` with value = (44.98/100)×caster.maxHp. Nearest-wrong
//       (a): scope `allies` (would hit all 5 slots, not just the 2 Electric AR allies moran+scarlet).
//       (b) stat `targetMaxHpPct` ("% of the TARGET'S own Max HP") — value would differ per target
//       (moran's vs scarlet's own Max HP), NOT a constant caster-sourced value. (c) a 10s duration
//       (the line says "constantly" = no expiry). All three discriminated. The "only if self alive"
//       gate is scope-trivial (nothing dies at scope lock) → passive is exact.
//   T3  "Invulnerable for 2 sec" is DEFENSIVE bookkeeping; v1 has no HP pool / no damage-to-allies model,
//       so invulnerability is inert and there is no invuln primitive. PIN the absence: S2 emits exactly
//       its two modeled effects (the T2 passive + the T4 burstCast buff) and NO invulnerability effect.
//       Documented UNMODELED.
//   T4  "when using Burst Skill … 1 leftmost Electric AR ally: Attack Damage ▲94.15% + Reload Speed
//       ▲50.82% for 10s" = burstCast trigger, alliesOfElementWeapon(Electric, AR, count 1) → the LEFTMOST
//       Electric AR ally (slot order; moran slot 0), attackDamagePct 94.15 + reloadSpeedPct 50.82, 10s
//       (600f), once per trina cast. Nearest-wrong (a): count 99 (would buff BOTH Electric AR allies
//       [0,3], not just the leftmost [0]). (b) trigger fullBurstEnter — trina is sole B2 so she casts
//       every Full Burst cycle (casts >= fbs; one trailing cast may outrun the buzzer), so trigger
//       identity is discriminated by FRAME, not count:
//       burstCast lands on trina's cast frame (the B2 step), fullBurstEnter lands on the later FB-start
//       frame (after the B3 step); the two frame sets never coincide. (c) duration ≠ 10s. All discriminated.
//   T5  Burst "all allies: Max HP ▲20.14% of caster Max HP / Attack Damage ▲20.9% for 10s" = burstCast,
//       target `allies` (all 5 slots), attackDamagePct 20.9 + casterMaxHpPct 20.14 (→ maxHpFlat ≈604k),
//       10s, once per trina cast × 5 targets. Nearest-wrong (a): trigger fullBurstEnter (lands on the
//       FB-start frames, not trina's earlier cast frames — frame-discriminated as in T4). (b) scope
//       alliesOfElementWeapon (would hit only [0,3], not all 5). Both discriminated.
//   T6  Spread Roots (435.6%) / Wilted Roots (64.46%) amp "Burst Skill damage of 'Affects all enemies'
//       skills" — the engine has NO burst-skill-damage-amp primitive (GAP). It is a TEAMMATE-COLD lever
//       (trina has no all-enemies burst skill of her own; it amps teammates' all-enemies B3 nukes cast
//       within 5s of her burst), so it is inert on trina's own damage and UNMODELED. PIN the absence:
//       trina emits NO burst-skill-damage-amp buff (her only burst stats are attackDamagePct / maxHpFlat /
//       maxAmmoFlat). Documented GAP (feature request — candidate for docs/engine-modeling-gaps.md theme
//       catalog; recorded in scripts/kit-autonomy/manual-review/trina.md + the override caveats + kit-status).
//   T7  "Hit Rate ▲45.3% for 10s" → all Electric AR allies = hitRatePct 45.3, durationSec 10, on the
//       burstCast Electric-AR block (kit-text-literal; enacted 2026-08-09 under the owner faithfulness
//       ruling — hitRatePct is the default-live HR→core channel).
//   T8  "Max Ammunition Capacity ▲20 round(s) for 10s" → all Electric AR allies = maxAmmoFlat 20 (FLAT
//       20 rounds, kit-literal; the engine's maxAmmo() adds flat on top of any percent scaling — theme 14,
//       the flat-rounds path is live, cf. tove/grave/noir). FIX: the shipped override encoded this as
//       maxAmmoPct 33.3 ("+33.3% on a 60-round AR magazine"), an approximation that is only exact for a
//       60-round magazine — for a 20-round Electric AR ally (e.g. scarlet) it grants only +6.66 rounds vs
//       the kit-literal +20. maxAmmoFlat 20 is exact for every Electric AR ally regardless of magazine
//       size. Nearest-wrong (the shipped encoding): maxAmmoPct 33.3 — a percentage, not flat rounds.
//       Discriminated by stat (maxAmmoFlat vs maxAmmoPct) + value (20 flat vs 33.3 percent) + scope
//       (Electric AR [0,3] vs all 5). NOTE: this fix is REGRESSION-NEUTRAL on trina's two snapshot comps
//       — "elec battery" (moran is 60-round: round(60×1.333)=80 == 60+20=80) and "N3" (no Electric AR ally
//       → the buff lands on nobody) — so the protected regression snapshot is undisturbed.
//
// Fixture: Trina is Burst II, so a custom comp [moran(B1,Elec AR) / liter(B1) / trina(B2,Elec RL) /
// scarlet(B3,Elec AR) / helm(B3)] is used (NOT controlComp — crown would be a second B2 and steal half her
// casts). Trina is the SOLE Burst II → she casts every Full Burst cycle; under the refill rotation
// default (2026-08-04) that reads 13 casts vs 12 completed Full Bursts — the final chain opens at
// ~178.9s and its Full Burst would start past the 180s buzzer (casts === fbs + 1). Trigger identity
// is therefore discriminated by FRAME, not count —
// trina's burstCast frame (the B2 chain step) strictly PRECEDES each Full-Burst-start frame (after the B3
// step), so the two frame sets never coincide (a fullBurstEnter encoding lands ~52f later every cycle). The
// comp deliberately fields TWO Electric AR allies — moran (slot 0,
// the leftmost) and scarlet (slot 3) — so the count:1 ("1 leftmost") lines land on [0] only while the
// count:99 ("all") lines land on [0,3]; liter (slot 1) and helm (slot 4) are NOT Electric AR, so the
// "all allies" burst line reaches all 5 slots [0,1,2,3,4] but the Electric-AR-scoped lines reach only [0,3].
// Boss Fire, focus Trina. Deterministic (no seed). Slot order: moran 0 / liter 1 / trina 2 / scarlet 3 / helm 4.
//
// HEAL fixture (T1's recovery-cadence sub-group only): liter (B1) / trina (B2) / crown (B2) / ada (B3),
// boss Fire, focus ada — trina is slot 1, LEFT of crown (slot 2), so leftmost burst-priority lets trina
// win the B2 cast every rotation (mirrors prika's P7 fixture) and crown stays in as the on-recovery
// consumer. Trina's own MAIN fixture has no recovery consumer, so this cadence can only be observed here.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, unitOf, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const TRINA = 2;
const MORAN = 0; // leftmost Electric AR ally
const SCARLET = 3; // second Electric AR ally
const ALL_SLOTS = [0, 1, 2, 3, 4];
const ELEC_AR = [MORAN, SCARLET];

const FIXTURE = {
  slugs: ['moran', 'liter', 'trina', 'scarlet', 'helm'] as string[],
  bossElement: 'Fire' as const,
  focusSlug: 'trina',
};

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...FIXTURE,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res };
}

// ---- readers ----------------------------------------------------------------------------------
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
const buffs = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is BuffApply => e.kind === 'buffApply' && e.casterIdx === TRINA
  );
const byStat = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) => b.stat === stat && (value === undefined || b.value === value)
  );
/** buffApply events whose key carries the original (pre-conversion) effect value, e.g. 44.98 / 20.14. */
const byKeyVal = (evs: SimEvent[], stat: string, origVal: number) =>
  byStat(evs, stat).filter((b) => b.key.endsWith(`:${origVal}`));
const targetsOf = (bs: BuffApply[]) =>
  [
    ...new Set(
      bs.map((b) => b.targetIdx).filter((t): t is number => t != null)
    ),
  ].sort((a, b) => a - b);
const dursOf = (bs: BuffApply[]) => [
  ...new Set(
    bs.map((b) => (b.expiresFrame == null ? null : b.expiresFrame - b.frame))
  ),
];
const trinaBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Extract<SimEvent, { kind: 'burstCast' }> =>
      e.kind === 'burstCast' && e.slug === 'trina'
  );
const fbStarts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart');
/** Trina's burstCast frames (when SHE casts her burst — the B2 step of the chain). */
const castFrames = (evs: SimEvent[]) => trinaBursts(evs).map((e) => e.frame);
/** Full-Burst-window opening frames (after the B3 step — strictly AFTER Trina's cast frame). */
const fbStartFrames = (evs: SimEvent[]) => fbStarts(evs).map((e) => e.frame);

// ---- T1 HEAL fixture (liter/trina/crown/ada — trina LEFT of crown so she wins the B2 cast) ---
const HEAL_COMP = ['liter', 'trina', 'crown', 'ada'];
const CROWN = 2;
function runHeal(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: HEAL_COMP,
    bossElement: 'Fire',
    focusSlug: 'ada',
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, res };
}
const healTrinaBursts = (evs: SimEvent[]) =>
  evs.filter(
    (e): e is Extract<SimEvent, { kind: 'burstCast' }> =>
      e.kind === 'burstCast' && e.slug === 'trina'
  );

// ---- counterfactual patches (nearest-wrong readings) -----------------------------------------
// T1 nearest-wrong: FABRICATE a skill1 heal-as-buff encoding (proves the empty slot is a deliberate
// skip — the harness CAN emit skill1 events).
const cfFabricateSkill1 = withPatchedOverride('trina', (ov: any) => {
  ov.skill1 = [
    {
      slot: 'skill1',
      trigger: { kind: 'passive' },
      target: { kind: 'allies' },
      effects: [{ kind: 'buff', stat: 'attackDamagePct', value: 1 }],
    },
  ];
});
// The S2 passive casterMaxHpPct 44.98 block (T2 under test).
const isS2Passive = (b: any) =>
  b.trigger?.kind === 'passive' &&
  b.effects?.some((e: any) => e.stat === 'casterMaxHpPct' && e.value === 44.98);
// T2 nearest-wrong (scope): alliesOfElementWeapon → allies (hit all 5 slots, not just Electric AR).
const cfS2ScopeAllies = withPatchedOverride('trina', (ov: any) => {
  const b = ov.skill2.find(isS2Passive);
  if (!b) {
    throw new Error('trina S2 passive block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});
// T2 nearest-wrong (stat): casterMaxHpPct → targetMaxHpPct (per-target value, not caster-sourced constant).
const cfS2TargetMaxHp = withPatchedOverride('trina', (ov: any) => {
  const b = ov.skill2.find(isS2Passive);
  if (!b) {
    throw new Error('trina S2 passive block missing — fixture is stale');
  }
  b.effects.find((e: any) => e.stat === 'casterMaxHpPct').stat =
    'targetMaxHpPct';
});
// T2 nearest-wrong (duration): add a 10s expiry to the "constantly" passive.
const cfS2PassiveDur = withPatchedOverride('trina', (ov: any) => {
  const b = ov.skill2.find(isS2Passive);
  if (!b) {
    throw new Error('trina S2 passive block missing — fixture is stale');
  }
  b.effects.find((e: any) => e.stat === 'casterMaxHpPct').durationSec = 10;
});
// The S2 burstCast 94.15/50.82 block (T4 under test).
const isS2BurstBuff = (b: any) =>
  b.trigger?.kind === 'burstCast' &&
  b.effects?.some(
    (e: any) => e.stat === 'attackDamagePct' && e.value === 94.15
  );
// T4 nearest-wrong (count): count 1 → 99 (buff BOTH Electric AR allies, not just the leftmost).
const cfS2Count99 = withPatchedOverride('trina', (ov: any) => {
  const b = ov.skill2.find(isS2BurstBuff);
  if (!b) {
    throw new Error('trina S2 burstCast block missing — fixture is stale');
  }
  b.target.count = 99;
});
// T4 nearest-wrong (trigger): burstCast → fullBurstEnter (every team FB, not every trina cast).
const cfS2FbEnter = withPatchedOverride('trina', (ov: any) => {
  const b = ov.skill2.find(isS2BurstBuff);
  if (!b) {
    throw new Error('trina S2 burstCast block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
// T4 nearest-wrong (duration): the 10s window shortened to 3s.
const cfS2Dur3 = withPatchedOverride('trina', (ov: any) => {
  const b = ov.skill2.find(isS2BurstBuff);
  if (!b) {
    throw new Error('trina S2 burstCast block missing — fixture is stale');
  }
  for (const e of b.effects) {
    e.durationSec = 3;
  }
});
// The burst all-allies 20.9/20.14 block (T5 under test).
const isBurstAllAllies = (b: any) =>
  b.target?.kind === 'allies' &&
  b.effects?.some((e: any) => e.stat === 'attackDamagePct' && e.value === 20.9);
// T5 nearest-wrong (trigger): burstCast → fullBurstEnter.
const cfBurstFbEnter = withPatchedOverride('trina', (ov: any) => {
  const b = ov.burst.find(isBurstAllAllies);
  if (!b) {
    throw new Error('trina burst all-allies block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
// T5 nearest-wrong (scope): allies → alliesOfElementWeapon (Electric AR only, not all 5).
const cfBurstScopeElecAR = withPatchedOverride('trina', (ov: any) => {
  const b = ov.burst.find(isBurstAllAllies);
  if (!b) {
    throw new Error('trina burst all-allies block missing — fixture is stale');
  }
  b.target = {
    kind: 'alliesOfElementWeapon',
    element: 'Electric',
    weapon: 'AR',
    count: 99,
  };
});
// The burst Max Ammo block (T8 under test — faithful encoding is maxAmmoFlat 20).
const isBurstMaxAmmo = (b: any) =>
  b.effects?.some(
    (e: any) => e.stat === 'maxAmmoFlat' || e.stat === 'maxAmmoPct'
  );
// T8 nearest-wrong (the shipped encoding): flat 20 rounds → maxAmmoPct 33.3 (a percentage approximation).
const cfMaxAmmoPct = withPatchedOverride('trina', (ov: any) => {
  const b = ov.burst.find(isBurstMaxAmmo);
  if (!b) {
    throw new Error('trina burst maxAmmo block missing — fixture is stale');
  }
  const eff = b.effects.find(
    (e: any) => e.stat === 'maxAmmoFlat' || e.stat === 'maxAmmoPct'
  );
  eff.stat = 'maxAmmoPct';
  eff.value = 33.3;
});
// T8 nearest-wrong (scope): Electric AR → allies (hit all 5 slots).
const cfMaxAmmoScopeAllies = withPatchedOverride('trina', (ov: any) => {
  const b = ov.burst.find(isBurstMaxAmmo);
  if (!b) {
    throw new Error('trina burst maxAmmo block missing — fixture is stale');
  }
  b.target = { kind: 'allies' };
});
// T1 nearest-wrong: the heal stream collapsed to a single instant tick (ticks:1) — fires one
// recovery event per Full-Burst-end instead of 5, so an on-recovery consumer lapses after the first.
const healOnce = withPatchedOverride('trina', (ov: any) => {
  let hit = 0;
  for (const b of ov.skill1) {
    for (const e of b.effects) {
      if (e.kind === 'heal') {
        e.ticks = 1;
        hit++;
      }
    }
  }
  if (!hit) {
    throw new Error('trina skill1 heal block missing — fixture is stale');
  }
});
/** Reference: the heal removed entirely (no recovery events from Trina). */
const healRemoved = withPatchedOverride('trina', (ov: any) => {
  let hit = 0;
  for (const b of ov.skill1) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
    if (b.effects.length !== before) {
      hit++;
    }
  }
  if (!hit) {
    throw new Error('trina skill1 heal block missing — fixture is stale');
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const fabricateSkill1 = run({ trina: cfFabricateSkill1 });
const s2ScopeAllies = run({ trina: cfS2ScopeAllies });
const s2TargetMaxHp = run({ trina: cfS2TargetMaxHp });
const s2PassiveDur = run({ trina: cfS2PassiveDur });
const s2Count99 = run({ trina: cfS2Count99 });
const s2FbEnter = run({ trina: cfS2FbEnter });
const s2Dur3 = run({ trina: cfS2Dur3 });
const burstFbEnter = run({ trina: cfBurstFbEnter });
const burstScopeElecAR = run({ trina: cfBurstScopeElecAR });
const maxAmmoPct = run({ trina: cfMaxAmmoPct });
const maxAmmoScopeAllies = run({ trina: cfMaxAmmoScopeAllies });
const healBase = runHeal();
const healOnceRun = runHeal({ trina: healOnce });
const healNoneRun = runHeal({ trina: healRemoved });

const casts = trinaBursts(base.events).length; // trina's burst casts (13 — incl. the buzzer-trailing chain)
const fbs = fbStarts(base.events).length; // team Full Bursts (12)
const trinaMaxHp = unitOf(base.res, 'trina').maxHp; // caster Max HP basis for the maxHpFlat conversions

describe('trina — kit spec', () => {
  describe('fixture sanity — Trina casts her burst and the team reaches Full Burst', () => {
    it('Trina casts >0 bursts, the team completes >0 Full Bursts, and burstCast frames != fullBurstStart frames (trigger-identity is frame-discriminable)', () => {
      expect(casts).toBeGreaterThan(0);
      expect(fbs).toBeGreaterThan(0);
      // sole-B2 comp: Trina casts every Full Burst cycle, so casts >= fbs. Under the refill
      // rotation default (2026-08-04: no post-FB chain-open block) the FINAL chain opens late
      // enough that its B2 cast lands before the 180s buzzer while its Full Burst would start
      // after it — one trailing cast with no completed FB (casts === fbs + 1 here). A collapsed
      // chain would add more; >1 over fbs is a rotation regression to investigate, not re-pin.
      // Her burstCast frame PRECEDES each Full Burst window opening (the B2 step fires before
      // the B3 step completes the chain), so burstCast vs fullBurstEnter is discriminated by
      // FRAME, not by count.
      expect(casts - fbs).toBeGreaterThanOrEqual(0);
      expect(casts - fbs).toBeLessThanOrEqual(1);
      const cf = castFrames(base.events);
      const ff = fbStartFrames(base.events);
      expect(cf.every((f) => !ff.includes(f))).toBe(true);
    });
    it('the fixture fields exactly two Electric AR allies (moran slot 0, scarlet slot 3) for scope discrimination', () => {
      // the S2 passive (count 99, all Electric AR) reaches exactly moran + scarlet
      expect(targetsOf(byKeyVal(base.events, 'maxHpFlat', 44.98))).toEqual(
        ELEC_AR
      );
    });
  });

  describe("T1 — S1 Nature's Grace (three heal lines) is UNMODELED and inert (no HP pool in v1)", () => {
    it('PIN: Trina emits ZERO skill1-keyed buff events (skill1 is an empty, documented skip)', () => {
      expect(
        buffs(base.events).filter((b) => b.key.includes(':skill1:')).length
      ).toBe(0);
    });
    it('PIN: Trina deals ZERO skill1-sourced damage', () => {
      const skill1Dmg = base.events.filter(
        (e) =>
          e.kind === 'damage' && e.slug === 'trina' && e.srcSlot === 'skill1'
      );
      expect(skill1Dmg.length).toBe(0);
    });
    it('DISCRIMINATING: a FABRICATED skill1 buff (nearest-wrong) WOULD emit skill1-keyed events — the empty slot is a deliberate skip, not a harness blind spot', () => {
      expect(
        buffs(fabricateSkill1.events).filter((b) => b.key.includes(':skill1:'))
          .length
      ).toBeGreaterThan(0);
    });
  });

  describe('T1b — S1 fullBurstEnd HoT is a 5-tick recovery STREAM (heal ticks:5 / 1s), driving on-recovery consumers', () => {
    // Crown's "when recovery takes effect → team Attack Damage ▲20.99%" is the observable: one firing
    // per recovery event that reaches her. Distinct frames per Trina FB-end window = recovery cadence.
    const crownRecoveryFrames = (evs: SimEvent[]): number[] =>
      [
        ...new Set(
          evs
            .filter(
              (e): e is BuffApply =>
                e.kind === 'buffApply' &&
                e.casterIdx === CROWN &&
                e.stat === 'attackDamagePct' &&
                Math.abs(e.value - 20.99) < 0.01
            )
            .map((b) => b.frame)
        ),
      ].sort((a, b) => a - b);
    const fbEndFrames = (evs: SimEvent[]): number[] =>
      evs.filter((e) => e.kind === 'fullBurstEnd').map((e) => e.frame);

    /** Distinct crown-recovery frames falling in the 5s window after each team Full-Burst end. */
    const perWindowFrames = (evs: SimEvent[]): number[] => {
      const frames = crownRecoveryFrames(evs);
      const ends = fbEndFrames(evs);
      const out: number[] = [];
      for (const end of ends) {
        out.push(frames.filter((f) => f >= end && f <= end + 5 * FPS).length);
      }
      return out;
    };

    it("non-vacuity: trina wins the B2 cast (left of crown), the team reaches Full Burst, and Nature's Grace actually fires", () => {
      expect(
        healTrinaBursts(healBase.events).length,
        'trina (slot 1, left of crown) must win the B2 cast'
      ).toBeGreaterThan(0);
      expect(fbEndFrames(healBase.events).length).toBeGreaterThan(0);
    });

    it("keeps crown's recovery consumer firing across the whole 5s after each Full Burst end (~5 ticks)", () => {
      const windows = perWindowFrames(healBase.events);
      expect(windows.length).toBeGreaterThan(0);
      for (const n of windows) {
        expect(
          n,
          `${n} recovery frames in a 5s window — a 5-tick stream lands ~5, a single instant lands 1`
        ).toBeGreaterThanOrEqual(4);
      }
    });

    it('DISCRIMINATING: collapsing to ticks:1 starves the consumer (one firing per window, then lapse)', () => {
      const shipped = perWindowFrames(healBase.events);
      const once = perWindowFrames(healOnceRun.events);
      const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);
      expect(
        sum(once),
        'ticks:1 must produce far fewer recovery firings than the 5-tick stream'
      ).toBeLessThan(sum(shipped) / 2);
    });

    it('is live: removing the heal drops crown to its self-proc baseline (strictly fewer firings)', () => {
      expect(crownRecoveryFrames(healNoneRun.events).length).toBeLessThan(
        crownRecoveryFrames(healBase.events).length
      );
    });
  });

  describe('T2 — S2 passive: Max HP ▲44.98% of CASTER Max HP → all Electric AR allies, constant (casterMaxHpPct)', () => {
    const passive = byKeyVal(base.events, 'maxHpFlat', 44.98);
    it("is a flat add of 44.98% of Trina's Max HP, constant across both Electric AR targets, applied at battle start, no expiry", () => {
      expect(passive.length).toBeGreaterThan(0);
      // caster-sourced: the SAME flat value on every target (= 44.98% of Trina's Max HP)
      const vals = passive.map((b) => b.value);
      expect(vals.every((v) => v === vals[0])).toBe(true);
      expect((vals[0] / trinaMaxHp) * 100).toBeCloseTo(44.98, 2);
      // reaches both Electric AR allies (count 99), no one else
      expect(targetsOf(passive)).toEqual(ELEC_AR);
      // "constantly" = no expiry (always-on passive)
      expect(dursOf(passive)).toEqual([null]);
      // "at the start of battle" = applied from frame 0
      expect(Math.min(...passive.map((b) => b.frame))).toBe(0);
    });
    it('DISCRIMINATING (scope): `allies` (nearest-wrong) hits all 5 slots, not just the 2 Electric AR allies', () => {
      expect(
        targetsOf(byKeyVal(s2ScopeAllies.events, 'maxHpFlat', 44.98))
      ).toEqual(ALL_SLOTS);
    });
    it('DISCRIMINATING (stat): targetMaxHpPct (nearest-wrong) yields a PER-TARGET value, not a caster-sourced constant', () => {
      const cf = byKeyVal(s2TargetMaxHp.events, 'maxHpFlat', 44.98);
      const byTarget = new Map(cf.map((b) => [b.targetIdx, b.value]));
      // moran's own Max HP != scarlet's own Max HP → the two values differ
      expect(byTarget.get(MORAN)).not.toBe(byTarget.get(SCARLET));
    });
    it('DISCRIMINATING (duration): a 10s expiry (nearest-wrong) is NOT the faithful constant (no-expiry) passive', () => {
      expect(dursOf(byKeyVal(s2PassiveDur.events, 'maxHpFlat', 44.98))).toEqual(
        [10 * FPS]
      );
    });
  });

  describe('T3 — S2 "Invulnerable for 2 sec" (1 leftmost Electric AR ally) is UNMODELED and inert (no invuln primitive / no HP pool)', () => {
    it('PIN: S2 emits exactly its two modeled effect families (the T2 passive maxHpFlat + the T4 burstCast attackDamage/reload) and NO invulnerability effect', () => {
      const s2Stats = new Set(
        buffs(base.events)
          .filter((b) => b.key.includes(':skill2:'))
          .map((b) => b.stat)
      );
      expect([...s2Stats].sort()).toEqual([
        'attackDamagePct',
        'maxHpFlat',
        'reloadSpeedPct',
      ]);
    });
  });

  describe('T4 — S2 burstCast: 1 leftmost Electric AR ally → Attack Damage ▲94.15% + Reload Speed ▲50.82% for 10s', () => {
    const atkDmg = byStat(base.events, 'attackDamagePct', 94.15);
    const reload = byStat(base.events, 'reloadSpeedPct', 50.82);
    it('lands on the LEFTMOST Electric AR ally only (moran slot 0), once per Trina cast, 10s, on burstCast', () => {
      expect(atkDmg.length).toBe(casts);
      expect(reload.length).toBe(casts);
      // count 1 → the single leftmost Electric AR ally (moran), NOT both
      expect(targetsOf(atkDmg)).toEqual([MORAN]);
      expect(targetsOf(reload)).toEqual([MORAN]);
      // 10-second window
      expect(dursOf(atkDmg)).toEqual([10 * FPS]);
      expect(dursOf(reload)).toEqual([10 * FPS]);
    });
    it('DISCRIMINATING (count): count 99 (nearest-wrong) buffs BOTH Electric AR allies, not just the leftmost', () => {
      expect(
        targetsOf(byStat(s2Count99.events, 'attackDamagePct', 94.15))
      ).toEqual(ELEC_AR);
    });
    it("DISCRIMINATING (trigger): the faithful burstCast lands on Trina's cast frames; fullBurstEnter (nearest-wrong) lands on the later Full-Burst-start frames", () => {
      const cast = castFrames(base.events);
      const fb = fbStartFrames(base.events);
      // faithful burstCast: the 94.15 buff applies exactly on Trina's burstCast frames
      const baseFrames = [
        ...new Set(
          byStat(base.events, 'attackDamagePct', 94.15).map((b) => b.frame)
        ),
      ].sort((a, b) => a - b);
      expect(baseFrames).toEqual([...cast].sort((a, b) => a - b));
      // nearest-wrong fullBurstEnter: applies on the FB-start frames, which never coincide with cast frames
      const cfFrames = [
        ...new Set(
          byStat(s2FbEnter.events, 'attackDamagePct', 94.15).map((b) => b.frame)
        ),
      ];
      expect(cfFrames.length).toBeGreaterThan(0);
      expect(cfFrames.every((f) => fb.includes(f))).toBe(true);
      expect(cfFrames.every((f) => !cast.includes(f))).toBe(true);
    });
    it('DISCRIMINATING (duration): a 3s window (nearest-wrong) is shorter than the faithful 10s', () => {
      expect(dursOf(byStat(s2Dur3.events, 'attackDamagePct', 94.15))).toEqual([
        3 * FPS,
      ]);
    });
  });

  describe('T5 — Burst: all allies → Max HP ▲20.14% of caster Max HP + Attack Damage ▲20.9% for 10s (burstCast)', () => {
    const atkDmg = byStat(base.events, 'attackDamagePct', 20.9);
    const maxHp = byKeyVal(base.events, 'maxHpFlat', 20.14);
    it('reaches ALL five allies, once per Trina cast × 5 targets, 10s, on burstCast', () => {
      expect(atkDmg.length).toBe(casts * ALL_SLOTS.length);
      expect(maxHp.length).toBe(casts * ALL_SLOTS.length);
      expect(targetsOf(atkDmg)).toEqual(ALL_SLOTS);
      expect(targetsOf(maxHp)).toEqual(ALL_SLOTS);
      expect(dursOf(atkDmg)).toEqual([10 * FPS]);
      // casterMaxHpPct 20.14 → flat ≈ 20.14% of Trina's Max HP, constant across targets
      const vals = maxHp.map((b) => b.value);
      expect(vals.every((v) => v === vals[0])).toBe(true);
      expect((vals[0] / trinaMaxHp) * 100).toBeCloseTo(20.14, 2);
    });
    it("DISCRIMINATING (trigger): the faithful burstCast lands on Trina's cast frames; fullBurstEnter (nearest-wrong) lands on the later Full-Burst-start frames", () => {
      const cast = castFrames(base.events);
      const fb = fbStartFrames(base.events);
      const baseFrames = [
        ...new Set(
          byStat(base.events, 'attackDamagePct', 20.9).map((b) => b.frame)
        ),
      ].sort((a, b) => a - b);
      expect(baseFrames).toEqual([...cast].sort((a, b) => a - b));
      const cfFrames = [
        ...new Set(
          byStat(burstFbEnter.events, 'attackDamagePct', 20.9).map(
            (b) => b.frame
          )
        ),
      ];
      expect(cfFrames.length).toBeGreaterThan(0);
      expect(cfFrames.every((f) => fb.includes(f))).toBe(true);
      expect(cfFrames.every((f) => !cast.includes(f))).toBe(true);
    });
    it('DISCRIMINATING (scope): alliesOfElementWeapon (nearest-wrong) hits only the 2 Electric AR allies, not all 5', () => {
      expect(
        targetsOf(byStat(burstScopeElecAR.events, 'attackDamagePct', 20.9))
      ).toEqual(ELEC_AR);
    });
  });

  describe('T6 — Burst Spread Roots (435.6%) amp is MODELED as burstSkillAoeDamagePct (2026-08-10); Wilted Roots stays a documented gap', () => {
    it('Trina emits the scoped amp plus the four other modeled families and nothing else', () => {
      const burstStats = new Set(
        buffs(base.events)
          .filter((b) => b.key.includes(':burst:'))
          .map((b) => b.stat)
      );
      const modeled = new Set([
        'attackDamagePct',
        'maxHpFlat',
        'maxAmmoFlat',
        'maxAmmoPct',
        'hitRatePct',
        'burstSkillAoeDamagePct',
      ]);
      for (const s of burstStats) {
        expect(modeled.has(s)).toBe(true);
      }
      expect(burstStats.has('burstSkillAoeDamagePct')).toBe(true);
      expect(burstStats.size).toBe(5);
    });

    it('Spread Roots is 435.6 for 5s to all allies on her burstCast — the kit gates it on enemy count == 1, which is ALWAYS true at solo-raid scope, so no gate is encoded', () => {
      const amp = byStat(base.events, 'burstSkillAoeDamagePct', 435.6);
      expect(amp.length).toBeGreaterThan(0);
      expect(dursOf(amp)).toEqual([5 * FPS]);
    });

    it('DISCRIMINATING (branch): the Wilted Roots magnitude (64.46) is ABSENT — its enemy-count ≥2 gate is unreachable vs the single boss, so encoding it would be the nearest-wrong', () => {
      expect(byStat(base.events, 'burstSkillAoeDamagePct', 64.46)).toEqual([]);
    });
  });

  describe('T7 — Burst "Hit Rate ▲45.3% for 10s" → all Electric AR allies = hitRatePct 45.3 (enacted 2026-08-09, owner faithfulness ruling)', () => {
    it('is hitRatePct 45.3 to the Electric AR allies, once per Trina cast × 2 targets, 10s, on burstCast', () => {
      const hr = byStat(base.events, 'hitRatePct', 45.3);
      expect(hr.length).toBe(casts * ELEC_AR.length);
      expect(targetsOf(hr)).toEqual(ELEC_AR);
      expect(dursOf(hr)).toEqual([10 * FPS]);
    });
  });

  describe('T8 — Burst "Max Ammunition Capacity ▲20 round(s)" → all Electric AR allies, 10s = maxAmmoFlat 20 (FIX)', () => {
    const flat = byStat(base.events, 'maxAmmoFlat', 20);
    it('is a FLAT 20 rounds (kit-literal) to the Electric AR allies, once per Trina cast × 2 targets, 10s, on burstCast', () => {
      expect(flat.length).toBe(casts * ELEC_AR.length);
      expect(targetsOf(flat)).toEqual(ELEC_AR);
      expect(dursOf(flat)).toEqual([10 * FPS]);
      // flat rounds, NOT a percentage
      expect(flat.every((b) => b.value === 20)).toBe(true);
    });
    it('DISCRIMINATING (stat/value): the shipped maxAmmoPct 33.3 (nearest-wrong) is a percentage, not flat rounds', () => {
      // under the nearest-wrong encoding there is NO maxAmmoFlat 20 …
      expect(byStat(maxAmmoPct.events, 'maxAmmoFlat', 20).length).toBe(0);
      // … instead a maxAmmoPct 33.3 appears (a percentage approximation, exact only for a 60-round mag)
      expect(
        byStat(maxAmmoPct.events, 'maxAmmoPct', 33.3).length
      ).toBeGreaterThan(0);
    });
    it('DISCRIMINATING (scope): `allies` (nearest-wrong) hits all 5 slots, not just the 2 Electric AR allies', () => {
      expect(
        targetsOf(
          buffs(maxAmmoScopeAllies.events).filter(
            (b) => b.stat === 'maxAmmoFlat' || b.stat === 'maxAmmoPct'
          )
        )
      ).toEqual(ALL_SLOTS);
    });
  });
});
