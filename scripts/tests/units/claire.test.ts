// PER-UNIT KIT SPEC — `claire` (Claire, RL/Electric/Supporter/Burst I, Abnormal, ammo 6,
// chargeFrames 60, reloadFrames 141, burst CD 40s). Kit-autonomy gauntlet 2026-08-03.
// claire is one of the six CLEAN-WEAPON BASIS units (scripts/tests/lib/harness.ts
// CLEAN_WEAPON_TEAMS.b) — her kit contributes NOTHING to damage, so once she carries a
// committed override, clean-weapons.test.ts CW1 additionally pins it byte-identical to the
// bare (empty) kit. This file pins the ENCODING of her kit lines; CW1 pins their inertness
// at the basis level.
//
// Claire is a PURE SUSTAIN unit: her entire kit is one heal channel, one shield grant, one
// burst heal, and one debuff cleanse. The sim models no HP pool and no debuff list, so her
// load-bearing in-domain surface is THREE lines:
//   (a) S1 Green Herb — every 3rd full charge, a RECOVERY EVENT on the 2 highest-final-ATK
//       allies (the engine models a heal as an event that fires teammates' on-recovery
//       consumers, NOT a number). Every RL shot IS a full charge (sim.ts: all dumped rockets
//       dispatch charged=true), so "landing 3 Full Charge attacks" == every 3rd RL shot.
//   (b) S2 Blue Herb — on her OWN burst cast, a SHIELD EVENT on all allies for 10s: it fires
//       teammates' 'shielded' triggers and opens their requiresShielded windows. Her kit text
//       literally says Shield — the marciana-reverse: where marciana's Storage was NOT encoded
//       as a shield, claire's Blue Herb MUST be.
//   (c) Burst R+G+B — a RECOVERY EVENT on all allies at her own cast.
// Her personal damage is weapon-only; her board value is tandem (recovery consumers such as
// Asuka/Crown, shield consumers such as Naga).
//
// Kit (data/characters.json → characters.claire.skills, SL10):
//   S1 ■ landing 3 Full Charge attacks → 2 allies highest final ATK:
//        Green Herb: Recovers 2.86% of the skill user's final Max HP as HP                  [C2]
//   S2 ■ using Burst Skill → all allies:
//        Blue Herb: Shield = 10.13% of the skill user's final Max HP for 10 sec             [C3]
//   BU ■ all allies: Restores 34.35% of the skill user's final Max HP as HP                 [C4]
//      ■ all allies: Removes 1 debuff(s).                                                   [U1 gap]
//
// One assertion group per kit line, asserted against the SHIPPED override loaded from disk.
// `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest-wrong model each
// assertion must discriminate against) — never to supply the encoding under test.
//
// WHY THESE ASSERTIONS DISCRIMINATE (every one of claire's lines is offensively inert on HER
// OWN damage, so TOTALS alone cannot discriminate; the load-bearing evidence is the EVENT LOG,
// read through a recovery CONSUMER and a shielded CONSUMER):
//   C1  clean-weapon: her own total is byte-identical with her kit zeroed (in the SAME comp),
//       while the TEAM totals move (her shield drives naga's shield-gated coreDamagePct 85.17
//       and her recovery feeds asuka's atkPct 96.98) — so the inertness is live, not a vacuous
//       "nothing happens".
//   C2  the S1 heal fires ONE recovery landing on asuka per 3rd full charge (== per 3rd RL
//       shot): firings == floor(claireShots/3) + claireBursts (the burst heal adds one landing
//       per cast). The two nearest-wrong triggers are chargeCounter count:1 ("landing Full
//       Charge attacks" with the 3 dropped — collapses to per-shot) and stripping the line
//       (firings collapse to the burst heal alone).
//   C3  the S2 line is a REAL SHIELD keyed to her OWN burst cast: naga's shielded-trigger S1
//       (coreDamagePct 85.17 to all allies) fires exactly once per claire cast × 3 allies, and
//       naga's requiresShielded burst line (casterAtkPct 31.02) rides every naga cast. The
//       nearest-wrong model is shield-as-HEAL (marciana-reverse trap): it silences both
//       shield-gated channels and over-fires the recovery channel by one landing per cast.
//   C4  the burst heal lands one recovery event on all allies per claire cast: stripping S1
//       leaves firings == claireBursts exactly. The 34.35 magnitude is event-only (no HP pool).
//   U1  "Removes 1 debuff(s)." lives VERBATIM in `unmodeled.burst` — v1 models no debuff list,
//       so no cleanse can be enacted; nothing fabricated in its place (claire originates ZERO
//       buffs of any kind).
//
// FIXTURE. claire (B1, 40s CD, FOCUSED — charge weapon ×2.5 gauge so she casts often) / naga
// (B2, 20s CD — the shielded CONSUMER: S1 fires on receiving a shield; burst carries a
// requiresShielded gate) / asuka (B3 — the recovery CONSUMER: S1 "when recovery takes effect"
// → self atkPct 96.98). Boss Fire (neutral for all three). Three isolation patches: asuka's
// own burst lifesteal patched OUT and naga's S2 hitCount heal patched OUT (claire is the SOLE
// recovery source), and naga's originated buffs re-targeted to SELF — she still CONSUMES
// claire's shield channel (both shield-gated lines fire on her), but radiates nothing back,
// cutting the feedback loop that would otherwise feed claire's tandem value into claire's OWN
// damage (the clean-weapon inertness claim). So every landing of claire's heal on asuka fires
// asuka's S1: counting asuka's self atkPct-96.98 buffApply events counts claire's recovery
// landings on her. naga's S2 coreDamagePct 40.07 top-2 feed stays live and constant across
// all runs. Deterministic (no seed). Slot order: claire 0 / naga 1 / asuka 2.
//
// SECOND FIXTURE (DIV — S2b-pre-registered trap, adopted at S2c): claire is Burst I, so in
// the main fixture she is the SOLE B1 and burstCast/fullBurstEnter are count-equivalent for
// her — an existence check alone cannot separate them. DIV fields a COMPETING B1 (liter, 20s
// CD): chains exist whose B1 cast is liter's, not claire's, so a fullBurstEnter encoding of
// S2 over-fires the shield channel on exactly those chains. Slot order: liter 0 / claire 1 /
// naga 2 / asuka 3.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  bareWeaponOverride,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUGS = ['claire', 'naga', 'asuka'];
/** Slot order: claire 0 / naga 1 / asuka 2. */
const CLAIRE = 0;
const NAGA = 1;
const ASUKA = 2;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

/** asuka's burst lifesteal removed → claire is the only recovery source in the fight. */
const asukaSoleConsumer = withPatchedOverride('asuka', (ov) => {
  for (const b of ov.burst ?? []) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
    if (b.effects.length === before) {
      throw new Error('asuka burst heal missing — fixture is stale');
    }
  }
});

/** naga ISOLATED: (a) her S2 hitCount heal is stripped → claire is the only recovery source,
 *  and (b) every buff she originates is re-targeted to SELF → she CONSUMES claire's shield
 *  channel (her shielded-trigger S1 + her requiresShielded burst line still fire and are
 *  countable on her) but RADIATES NOTHING to claire/asuka. Without (b) her all-ally
 *  coreDamagePct 85.17 / casterAtkPct 31.02 grants would feed claire's OWN damage through
 *  claire's own shield — a feedback loop that would make the clean-weapon inertness claim
 *  unassertable in-fixture. Her S2 coreDamagePct 40.07 top-2 feed stays live and constant
 *  (static-ATK targeting, cadence independent of claire's kit). */
const nagaIsolated = withPatchedOverride('naga', (ov) => {
  const before = ov.skill2?.length ?? 0;
  ov.skill2 = (ov.skill2 ?? []).filter(
    (x: any) => !x.effects.some((e: any) => e.kind === 'heal')
  );
  if (ov.skill2.length !== before - 1) {
    throw new Error('naga skill2 heal block missing — fixture is stale');
  }
  for (const b of ov.skill1 ?? []) {
    b.target = { kind: 'self' };
  }
  for (const b of ov.burst ?? []) {
    if (b.target?.kind === 'allies') {
      b.target = { kind: 'self' };
    }
  }
});

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: SLUGS,
    bossElement: 'Fire',
    focusSlug: 'claire',
    overrides: { asuka: asukaSoleConsumer, naga: nagaIsolated, ...overrides },
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { res, events };
}

// ---- counterfactual / isolation patches (nearest-wrong models) -------------------------------
/** C2 counterfactual: the 3-charge counter collapsed to count:1 ("landing Full Charge
 *  attacks" with the 3 dropped) — fires every shot instead of every 3rd (both thresholds:
 *  the counterfactual must not leave the pinned in-window value behind). */
const claireCount1 = withPatchedOverride('claire', (ov) => {
  const b = (ov.skill1 ?? []).find(
    (x: any) => x.trigger?.kind === 'chargeCounter'
  );
  if (!b) {
    throw new Error(
      'claire skill1 chargeCounter block missing — fixture is stale'
    );
  }
  b.trigger.count = 1;
  b.trigger.countInFb = 1;
});
/** C2 isolation: S1 stripped entirely — recovery firings must collapse to the burst heal. */
const claireNoS1 = withPatchedOverride('claire', (ov) => {
  if (!ov.skill1?.length) {
    throw new Error('claire skill1 missing — fixture is stale');
  }
  ov.skill1 = [];
});
/** C3 counterfactual: the shield re-encoded as a heal (the marciana-reverse trap — the kit
 *  text literally says Shield). Must silence both shield-gated naga channels and over-fire
 *  the recovery channel by one landing per claire cast. */
const claireShieldAsHeal = withPatchedOverride('claire', (ov) => {
  const e = ov.skill2
    ?.flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'shield');
  if (!e) {
    throw new Error('claire skill2 shield effect missing — fixture is stale');
  }
  e.kind = 'heal';
  delete e.maxHpPct;
  delete e.durationSec;
});
/** C3 isolation: S2 stripped entirely (shield-channel silence baseline). */
const claireNoS2 = withPatchedOverride('claire', (ov) => {
  if (!ov.skill2?.length) {
    throw new Error('claire skill2 missing — fixture is stale');
  }
  ov.skill2 = [];
});
/** C3/DIV counterfactual: S2 keyed to fullBurstEnter (the trap-3 misread — shields every
 *  Full Burst regardless of who cast B1). In the DIV comp, chains opened by liter must
 *  over-fire the shield channel. */
const claireS2FbEnter = withPatchedOverride('claire', (ov) => {
  const b = (ov.skill2 ?? []).find((x: any) =>
    x.effects.some((e: any) => e.kind === 'shield')
  );
  if (!b) {
    throw new Error('claire skill2 shield block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const count1 = run({ claire: claireCount1 });
const noS1 = run({ claire: claireNoS1 });
const shieldAsHeal = run({ claire: claireShieldAsHeal });
const noS2 = run({ claire: claireNoS2 });
const bareInTeam = run({ claire: bareWeaponOverride('claire') });

// ---- DIV fixture: competing B1 (liter) separates burstCast from fullBurstEnter ---------------
const DIV_SLUGS = ['liter', 'claire', 'naga', 'asuka'];
const DIV_NAGA = 2;

function runDiv(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: DIV_SLUGS,
    bossElement: 'Fire',
    focusSlug: 'claire',
    overrides: { asuka: asukaSoleConsumer, naga: nagaIsolated, ...overrides },
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { res, events };
}

const divBase = runDiv();
const divFbEnter = runDiv({ claire: claireS2FbEnter });

const divNagaShieldedFirings = (evs: SimEvent[]) =>
  evs
    .filter((e): e is BuffApply => e.kind === 'buffApply')
    .filter(
      (b) =>
        b.casterIdx === DIV_NAGA &&
        b.stat === 'coreDamagePct' &&
        b.value === 85.17
    ).length;

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** asuka's recovery consumer firings = her self atkPct-96.98 buff (one per recovery landing). */
const recoveryFirings = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === ASUKA && b.stat === 'atkPct' && b.value === 96.98
  ).length;
const claireBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === CLAIRE);
const nagaBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === NAGA);
// naga's casterAtkPct buffs apply as RESOLVED FLAT ATK (value/100 × caster staticAtk), not as
// the kit percentage — so her gated 31.02 line is read as the flat ≈31.02% band, cleanly
// separated from her ungated 16.18 line by the 25% mark.
const NAGA_ATK = unitOf(base.res, 'naga').staticAtk;
/** naga's shielded-trigger S1: coreDamagePct 85.17 — self-targeted in this fixture, so exactly
 *  one buffApply per shield landing on her. */
const nagaShieldedFirings = (evs: SimEvent[]) =>
  nagaBuffs(evs).filter((b) => b.stat === 'coreDamagePct' && b.value === 85.17)
    .length;
/** naga's requiresShielded burst line: flat casterAtkPct ≈31.02% of her ATK (only while a
 *  shield window covers her cast). */
const nagaGatedBurstBuffs = (evs: SimEvent[]) =>
  nagaBuffs(evs).filter(
    (b) => b.stat === 'casterAtkPct' && b.value > NAGA_ATK * 0.25
  ).length;
/** Every RL shot is a full charge (sim.ts: all dumped rockets dispatch charged=true). */
const claireShots = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'shot' && e.slug === 'claire').length;
const claireBursts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'burstCast' && e.slug === 'claire').length;
const nagaBursts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'burstCast' && e.slug === 'naga').length;
const fullBursts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').length;

// The committed override, for the static (structural / unmodeled) pins.
const shipped = loadOverride('claire') as any;
if (!shipped) {
  throw new Error('claire has no override on disk — fixture is stale');
}
const allBlocks = [
  ...(shipped.skill1 ?? []),
  ...(shipped.skill2 ?? []),
  ...(shipped.burst ?? []),
];

describe('claire — fixture sanity (non-vacuity)', () => {
  it('the comp actually bursts: claire opens the chain as B1 and Full Bursts occur', () => {
    // Non-vacuity gate for every burst-keyed assertion below: a comp that never completes a chain
    // would let the S2 / burst groups pass silently on empty sets.
    expect(claireBursts(base.events)).toBeGreaterThan(0);
    expect(nagaBursts(base.events)).toBeGreaterThan(0);
    expect(fullBursts(base.events)).toBeGreaterThan(0);
  });

  it('claire fires many full-charge RL shots and deals weapon damage', () => {
    // RL 6-round magazine over 180s ⇒ many shots; the C2 cadence discrimination needs shot
    // count >> burst count. Her own total > 0 guards the inertness assertions (else
    // "unchanged" would be trivially true on a zero).
    expect(claireShots(base.events)).toBeGreaterThan(30);
    expect(claireShots(base.events)).toBeGreaterThan(
      3 * claireBursts(base.events)
    );
    expect(unitOf(base.res, 'claire').totalDamage).toBeGreaterThan(0);
  });
});

describe('C1 — clean-weapon: her kit contributes nothing to her own damage', () => {
  it('own total is byte-identical with her kit zeroed, in the same comp', () => {
    // An RL clean-weapon basis cell: with claire's kit swapped for the empty kit, her own total
    // must not move a point (the in-team bare run keeps naga/asuka identical, so this isolates
    // claire's own contribution rather than comparing solo vs team). Zero damage lines and zero
    // weapon-state modifiers in the whole kit.
    expect(unitOf(base.res, 'claire').totalDamage).toBe(
      unitOf(bareInTeam.res, 'claire').totalDamage
    );
  });

  it('DISCRIMINATING: her kit MOVES the team — the inertness is tandem, not vacuous', () => {
    // Her shield drives naga's shield-gated coreDamagePct 85.17 + casterAtkPct 31.02 channels
    // and her recovery feeds asuka's atkPct 96.98 uptime — so zeroing her kit MUST move the
    // other two units' totals even though her own never moves. Proves "her damage is unchanged"
    // is a live fact about a kit that does something, not a vacuous nothing-happens.
    expect(totals(bareInTeam.res)).not.toEqual(totals(base.res));
    expect(totals(bareInTeam.res).claire).toBe(totals(base.res).claire);
  });
});

describe('C2 — S1 Green Herb: one recovery landing per 3rd full charge, 2 highest-final-ATK allies', () => {
  it('drives the recovery consumer once per 3rd claire shot, plus one landing per burst heal', () => {
    // "Activates when landing 3 Full Charge attack(s)" — every RL shot is a full charge, so the
    // heal procs every 3rd shot; asuka (always in the 2-highest-final-ATK pool: an Attacker
    // with a self atkPct 96.98 buff, ranked by live effectiveAtk per byFinalAtk) receives every
    // proc landing, plus one landing per claire burst heal (C4). claire is the SOLE recovery
    // source in this fixture (asuka lifesteal + naga S2 heal patched out).
    expect(recoveryFirings(base.events)).toBe(
      Math.floor(claireShots(base.events) / 3) + claireBursts(base.events)
    );
  });

  it('DISCRIMINATING: a count:1 counterfactual collapses the cadence to per-shot', () => {
    // The nearest wrong reading drops the 3 ("landing Full Charge attacks"): one recovery
    // landing per shot. It must produce strictly MORE firings — exactly one per shot plus the
    // burst-heal landings — proving the shipped 3-charge counter is the one that fits the prose.
    const collapsed = recoveryFirings(count1.events);
    expect(collapsed).toBeGreaterThan(recoveryFirings(base.events));
    expect(collapsed).toBe(
      claireShots(count1.events) + claireBursts(count1.events)
    );
  });

  it('DISCRIMINATING: stripping S1 collapses the firings to the burst heal alone', () => {
    // With S1 gone the only recovery source is the burst heal — one landing per claire cast.
    expect(recoveryFirings(noS1.events)).toBe(claireBursts(noS1.events));
  });

  it('stripping S1 leaves claire\u2019s OWN total unchanged (tandem-only channel)', () => {
    // The heal has no HP amount in v1 and no self-buff; it can only matter via a teammate's
    // on-recovery consumer. Removing it cannot move her own weapon output.
    expect(totals(noS1.res).claire).toBe(totals(base.res).claire);
  });

  it('targets by FINAL ATK: the shipped block ranks by live effectiveAtk (structural)', () => {
    // "the 2 ally unit(s) with the highest FINAL ATK" — byFinalAtk is the schema's literal
    // encoding of that wording (A3 ruling); a plain highest-ATK (static) ranking would be a
    // different, less-literal model.
    const healBlock = (shipped.skill1 ?? []).find((b: any) =>
      b.effects.some((e: any) => e.kind === 'heal')
    );
    expect(healBlock?.target).toEqual({
      kind: 'alliesTopAtk',
      count: 2,
      byFinalAtk: true,
    });
  });
});

describe('C3 — S2 Blue Herb: a REAL SHIELD on her own burst cast, all allies, 10 sec', () => {
  it('fires naga\u2019s shielded-trigger S1 exactly once per claire cast', () => {
    // naga's S1 ({kind:'shielded'}) fires when a shield effect targets her; claire's S2 targets
    // all allies, so naga receives exactly one shield per claire burst cast and answers with
    // coreDamagePct 85.17 (self-targeted in this fixture — one buffApply per firing). claire is
    // the ONLY shielder here.
    expect(nagaShieldedFirings(base.events)).toBe(claireBursts(base.events));
  });

  it('opens naga\u2019s requiresShielded burst gate every rotation (31.02 rides each naga cast)', () => {
    // claire (B1) shields on her cast frame; naga (B2) casts inside the same chain — well within
    // the 10s shield window — so her shield-gated flat-ATK 31.02% line lands on every one of her
    // casts (once per cast, self-targeted).
    expect(nagaGatedBurstBuffs(base.events)).toBe(nagaBursts(base.events));
    expect(nagaBursts(base.events)).toBeGreaterThan(0);
  });

  it('is time-bounded at 10 sec (600 frames), feeding a real requiresShielded window', () => {
    // The shield effect's durationSec opens each target's shieldedUntilFrame window — the same
    // window naga's burst gate reads. Pinned structurally on the shipped effect.
    const shield = shipped.skill2?.[0]?.effects?.find(
      (e: any) => e.kind === 'shield'
    );
    expect(shield).toBeDefined();
    expect(shield.durationSec).toBe(10);
    expect(shield.maxHpPct).toBe(10.13);
  });

  it('DISCRIMINATING: shield-as-heal silences BOTH shield-gated naga channels', () => {
    // The marciana-reverse trap: encoding Blue Herb as a heal (the wrong event kind) makes naga
    // never receive a shield — her shielded-trigger S1 and her requiresShielded burst line both
    // go silent, proving the shipped `shield` kind is load-bearing, not cosmetic.
    expect(nagaShieldedFirings(shieldAsHeal.events)).toBe(0);
    expect(nagaGatedBurstBuffs(shieldAsHeal.events)).toBe(0);
  });

  it('DISCRIMINATING: shield-as-heal OVER-FIRES the recovery channel by one landing per cast', () => {
    // The converted heal lands on all allies at every claire cast on top of the burst heal, so
    // asuka's consumer gains exactly one extra firing per claire burst — the two event kinds are
    // observably distinct in BOTH channels.
    expect(recoveryFirings(shieldAsHeal.events)).toBe(
      Math.floor(claireShots(shieldAsHeal.events) / 3) +
        2 * claireBursts(shieldAsHeal.events)
    );
  });

  it('DISCRIMINATING: stripping S2 silences the shield channel without touching recovery', () => {
    expect(nagaShieldedFirings(noS2.events)).toBe(0);
    expect(nagaGatedBurstBuffs(noS2.events)).toBe(0);
    expect(recoveryFirings(noS2.events)).toBe(recoveryFirings(base.events));
  });

  it('leaves claire\u2019s OWN total unchanged (the shield is tandem value only)', () => {
    // A shield event grants no damage of its own in v1 (no HP pool, boss deals no damage); it
    // only matters through teammates' shield-gated lines.
    expect(totals(noS2.res).claire).toBe(totals(base.res).claire);
  });
});

describe('C3/DIV — burstCast vs fullBurstEnter, separated by a COMPETING B1 (liter)', () => {
  it('non-vacuity: claire still casts, and liter takes at least one chain claire does not', () => {
    // The DIV comp fields two Burst I units (liter 20s, claire 40s). The discrimination below
    // needs at least one Full Burst whose B1 cast was NOT claire's — otherwise the two trigger
    // kinds are count-equivalent here too and the group would gate nothing.
    expect(claireBursts(divBase.events)).toBeGreaterThan(0);
    expect(fullBursts(divBase.events)).toBeGreaterThan(
      claireBursts(divBase.events)
    );
  });

  it('the shield channel fires on claire\u2019s OWN casts only', () => {
    // naga receives exactly one shield per claire burst cast (one self-targeted buffApply per
    // firing). Chains opened by liter give naga no shield and fire nothing.
    expect(divNagaShieldedFirings(divBase.events)).toBe(
      claireBursts(divBase.events)
    );
  });

  it('DISCRIMINATING: a fullBurstEnter encoding over-fires on liter-opened chains', () => {
    // The trap-3 misread shields every Full Burst regardless of who cast B1: its firings track
    // the FB count, which strictly exceeds the own-cast count because liter opens some chains.
    // This is the assertion the sole-B1 main fixture structurally CANNOT make.
    const over = divNagaShieldedFirings(divFbEnter.events);
    expect(over).toBe(fullBursts(divFbEnter.events));
    expect(over).toBeGreaterThan(divNagaShieldedFirings(divBase.events));
  });
});

describe('C4 — burst R+G+B heal: one recovery landing on all allies per own cast', () => {
  it('the burstCast-keyed heal is the residue when S1 is stripped (firings == claireBursts)', () => {
    // Already the noS1 isolation reading, asserted here as the C4 identity: with S1 gone, every
    // recovery firing is one burst-heal landing on asuka, exactly one per claire cast.
    expect(recoveryFirings(noS1.events)).toBe(claireBursts(noS1.events));
    expect(claireBursts(noS1.events)).toBeGreaterThan(0);
  });

  it('the 34.35 magnitude never surfaces as a buff (heal is event-only, no HP pool)', () => {
    expect(buffs(base.events).some((b) => b.value === 34.35)).toBe(false);
    expect(buffs(base.events).some((b) => b.value === 2.86)).toBe(false);
  });
});

describe('U1 — "Removes 1 debuff(s)." is documented, not dropped or fabricated', () => {
  it('the line lives verbatim in `unmodeled.burst` (never an `ignored` drop)', () => {
    expect(shipped.unmodeled?.burst?.length).toBe(1);
    expect(shipped.unmodeled.burst.join(' ')).toContain('Removes 1 debuff(s).');
    expect(shipped.unmodeled?.skill1 ?? []).toEqual([]);
    expect(shipped.unmodeled?.skill2 ?? []).toEqual([]);
    expect(shipped.ignored).toBeUndefined();
  });

  it('claire originates ZERO buffs — no cleanse substitute or offensive buff is invented', () => {
    // Her kit text has no ▲ stat at all: the only modeled outputs are recovery/shield EVENTS.
    // Any buffApply attributed to her would be a fabrication (a fake cleanse, a fake buff).
    expect(claireBuffs(base.events)).toEqual([]);
  });

  it('no debuff-family stat appears anywhere in the event log', () => {
    // The nearest fabrication would be a damageTakenPct or defPct "debuff" on the boss or a
    // self-cleanse buff — none may exist from claire.
    expect(
      claireBuffs(base.events).some((b) =>
        ['damageTakenPct', 'defPct'].includes(b.stat)
      )
    ).toBe(false);
  });
});

describe('structural pins (S2b-pre-registered traps, adopted at S2c)', () => {
  it('every skill2 and burst block is keyed to burstCast, never fullBurstEnter', () => {
    // "Activates when using Burst Skill" is own-cast keyed. claire is the SOLE B1 in the fixture
    // so the two triggers are count-equivalent HERE — the pin is structural so the encoding stays
    // faithful in any comp (fullBurstEnter would over-fire on FB windows she did not open).
    for (const b of [...(shipped.skill2 ?? []), ...(shipped.burst ?? [])]) {
      expect(b.trigger?.kind).toBe('burstCast');
    }
  });

  it('the S1 heal is keyed to a 3-charge counter (not shotFired, not hitCount), threshold pinned in-window', () => {
    // chargeCounter advances ONLY on full charges — the literal reading of "landing 3 Full
    // Charge attack(s)". shotFired/hitCount would over-fire on any hypothetical partial-charge
    // release; the scalar 3 is the same threshold every phase (one effect → the phase wraps).
    // countInFb:3 is load-bearing: the engine defaults the 10s-post-own-cast threshold to
    // countInFb ?? 1 (scarlet-black-shadow's lowered-thresholds mechanic) — omitting it would
    // silently accelerate the channel to per-shot after every one of claire's own casts.
    const healBlock = (shipped.skill1 ?? []).find((b: any) =>
      b.effects.some((e: any) => e.kind === 'heal')
    );
    expect(healBlock?.trigger).toEqual({
      kind: 'chargeCounter',
      count: 3,
      countInFb: 3,
    });
  });

  it('Blue Herb is encoded as a `shield` effect — the marciana-reverse is honored', () => {
    // marciana's Storage was NOT a shield and was kept out of the effects; claire's Blue Herb
    // literally IS one and must emit the shield event (naga's channels depend on it). Exactly
    // one shield effect in the whole kit, in skill2.
    const shields = allBlocks.filter((b: any) =>
      b.effects.some((e: any) => e.kind === 'shield')
    );
    expect(shields.length).toBe(1);
    expect(shields[0].slot).toBe('skill2');
  });

  it('exactly two heal blocks — S1 Green Herb (skill1) and the burst heal (burst)', () => {
    const heals = allBlocks.filter((b: any) =>
      b.effects.some((e: any) => e.kind === 'heal')
    );
    expect(heals.length).toBe(2);
    expect(new Set(heals.map((h: any) => h.slot))).toEqual(
      new Set(['skill1', 'burst'])
    );
  });

  it('every heal is instant (ticks default 1) — no HoT clause in either heal line', () => {
    // Neither "Recovers 2.86%" nor "Restores 34.35%" carries an "over N sec" clause — a
    // multi-tick encoding would over-fire on-recovery consumers across a window the prose never
    // grants.
    for (const b of allBlocks) {
      for (const e of b.effects) {
        if (e.kind === 'heal') {
          expect(e.ticks ?? 1).toBe(1);
        }
      }
    }
  });

  it('target-set asymmetry is exact: S1 top-2 slice, S2/burst all allies (S2b note, adopted)', () => {
    // Conflating the two target sets is fable's named misread in the other direction: burst
    // heal narrowed to top-2 (under-credits all-allies recovery) or S1 widened to all allies
    // (over-credits it). The kit text distinguishes them explicitly.
    const burstHeal = (shipped.burst ?? []).find((b: any) =>
      b.effects.some((e: any) => e.kind === 'heal')
    );
    expect(burstHeal?.target).toEqual({ kind: 'allies' });
    const shieldBlock = (shipped.skill2 ?? []).find((b: any) =>
      b.effects.some((e: any) => e.kind === 'shield')
    );
    expect(shieldBlock?.target).toEqual({ kind: 'allies' });
  });
});
