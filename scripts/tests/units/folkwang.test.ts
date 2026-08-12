// PER-UNIT KIT SPEC — `folkwang` (Folkwang, AR/Water/Defender/Burst II, cd 40s, ammo 60,
// reloadFrames 99, chargeFrames 0, hitsPerShot 1). Kit-autonomy gauntlet 2026-08-03.
// folkwang is one of the six CLEAN-WEAPON BASIS units (scripts/tests/lib/harness.ts
// CLEAN_WEAPON_TEAMS.a) — the owner-confirmed "only AR with zero damage-touching lines
// including her burst" (clean-weapons.test.ts P1 note, owner ruling 2026-07-23). Once she
// carries a committed override, clean-weapons.test.ts CW1 additionally pins it
// byte-identical to the bare (empty) kit. This file pins the ENCODING of her kit lines;
// CW1 pins their inertness at the basis level.
//
// Folkwang is a PURE TANK/SUSTAIN kit: two timer passives (no activation clause — they
// fire on their internal cooldowns) and a burst, all shields / Max HP / taunt / recovery.
// The sim models no HP pool, no incoming-healing multiplier and no enemy targeting, so her
// load-bearing in-domain surface is FOUR lines:
//   (a) S1 Starting Whistle — every 30s of battle, a SHIELD EVENT on the 2 highest-final-ATK
//       allies for 10s: fires the recipients' 'shielded' triggers and opens their
//       requiresShielded windows. The kit text literally says Shield.
//   (b) S2 Harder, Better, Faster — every 20s of battle, SELF Max HP ▲ 44.96% for 10s: the
//       schema's "Max HP ▲ X%" stat (targetMaxHpPct), self-targeted so the e3 rule lets it
//       feed her OWN atkOfMaxHpPct — she carries none, so it is offensively inert, modeled
//       for kit completeness (marciana's inert-defPct convention).
//   (c) Burst Sprint — on her OWN burst cast, a SHIELD EVENT on the 2 highest-final-ATK
//       allies for 10s (32.9% of HER final Max HP recorded on the effect).
//   (d) Burst rider — on her OWN burst cast, a RECOVERY STREAM on the same 2 allies:
//       "Recovers 65.81% of attack damage as HP over 10 sec" → heal HoT ticks:10/intervalSec:1
//       per the marciana convention for the identical "Recovers X% of attack damage as HP
//       over N sec" construction (her owner-landed override models "over 3 sec" as ticks:3).
//       Event-only tandem value — fires the recipients' 'recovery' triggers; the 65.81%
//       magnitude is unmodeled (no HP pool) and the tick count is the ⚑ estimate (in game
//       the recovery is damage-linked and continuous, not clock-ticked).
// Her personal damage is weapon-only; her board value is tandem (shield consumers such as
// Naga, recovery consumers such as Asuka). The S1 incoming-healing lift and the S2 taunt are
// deliberately UNMODELED (verbatim below) — no healing multiplier / aggro model in v1.
//
// Kit (data/characters.json → characters.folkwang.skills, SL10):
//   S1 ■ 2 allies highest final ATK (passive, 30s CD):
//        Shield = 13.71% of the skill user's final Max HP for 10 sec                     [C2]
//        Incoming healing ▲ 45.7% for 10 sec                                             [U1 gap]
//   S2 ■ enemy highest final ATK (passive, 20s CD):
//        Taunt for 5 sec                                                                 [U2 gap]
//      ■ self:
//        Max HP ▲ 44.96% for 10 sec                                                      [C3]
//   BU ■ 2 allies highest final ATK:
//        Shield = 32.9% of the skill user's final Max HP for 10 sec                      [C4]
//        Recovers 65.81% of attack damage as HP over 10 sec                              [C5]
//
// One assertion group per kit line, asserted against the SHIPPED override loaded from disk.
// `withPatchedOverride` appears only to build COUNTERFACTUALS (the nearest-wrong model each
// assertion must discriminate against) — never to supply the encoding under test.
//
// WHY THESE ASSERTIONS DISCRIMINATE (every one of folkwang's lines is offensively inert on
// HER OWN damage, so TOTALS alone cannot discriminate; the load-bearing evidence is the
// EVENT LOG, read through naga's shielded-trigger S1 and her own maxHpFlat buff channel):
//   C1  clean-weapon: her own total is byte-identical with her kit zeroed (in the SAME comp
//       AND solo on the bare-weapon basis), while the TEAM totals move (her shields drive
//       naga's shielded-trigger coreDamagePct 85.17 channel) — so the inertness is live,
//       not a vacuous "nothing happens".
//   C2  the S1 shield fires naga's shielded-trigger S1 on every interval firing AND every
//       folkwang burst cast (naga is always one of the 2 highest final ATK here): firings
//       == 5 interval + folkwangBursts. Nearest-wrong: shield-as-heal (silences the shield
//       channel, over-fires the recovery channel), interval 20 (S2's CD misread: 8 firings),
//       and stripping S1 (firings collapse to the burst shields alone).
//   C3  the S2 line is a SELF Max HP grant: exactly 8 maxHpFlat buffApply events on her
//       (180s / 20s interval, first at t=20), self-cast. Nearest-wrong: the raw `maxHpPct`
//       stat (cube-path-only — an override buff with it is never converted, silently inert)
//       and cadence 30 (S1's CD misread: 5 firings).
//   C4  the burst shield adds one naga landing per folkwang OWN cast — and the DIV falls out
//       of the fixture: two CD-40 Burst III units (asuka/2b) alternate the B3 slot so EVERY
//       chain completes (fullBursts 7 > folkwangBursts 4), while naga (the competing B2)
//       casts the 3 chains folkwang does NOT. A fullBurstEnter encoding shields every Full
//       Burst and over-fires the channel by exactly those 3 chains.
//   C5  the burst rider is a REAL recovery stream: asuka's recovery consumer (her own burst
//       lifesteal left live as the calibrated control) fires exactly asukaBursts + 10×
//       folkwangBursts times — one self landing per own cast plus ten HoT landings per
//       folkwang cast (asuka is always one of the 2 targets). Nearest-wrong A: ticks:1 (one
//       instant recovery per cast — a consumer's short buff would see 1 refresh instead of
//       10). Nearest-wrong B: the line dropped as "no HP pool" (firings collapse to
//       asukaBursts). The 65.81 magnitude itself never surfaces as a buff.
//   U1-U2 the incoming-healing lift and the taunt live VERBATIM in `unmodeled` — v1 models
//       neither; nothing fabricated in their place (no boss status, no enemy debuff, no
//       incoming-healing stat).
//
// FIXTURE. Slot order: tia 0 / folkwang 1 / naga 2 / asuka 3 / 2b 4. Boss Fire. 180s,
// deterministic (no seed). tia (B1, 40s CD, self-burstCdr 13s → ~27s effective, opens every
// chain) / folkwang (B2, 40s) / naga (B2, 20s — the COMPETING B2 AND the shield CONSUMER:
// S1 fires on receiving a shield; isolated claire-style — S2 heal stripped, originated buffs
// re-targeted to SELF so her all-ally coreDamagePct 85.17 cannot feed folkwang's own damage
// and break the C1 inertness claim) / asuka (B3, 40s — recovery control: her burst lifesteal
// left live, so her self-atkPct-96.98 consumer counts her own heal landings PLUS folkwang's
// HoT landings — she is always one of the 2 highest final ATK, so every rider tick reaches
// her) / 2b
// (B3, 40s — the second B3 so the same-CD B3 pair alternates and every chain completes;
// DE-INFLATED — her escalating S1 + passive atkOfMaxHpPct self-buffs are stripped, see
// TOP-2 below). tia's two burst shields are patched OUT (she casts every chain — unpatched
// she would be a second shielder and flood naga's consumer); her reenterStage +
// attackDamagePct stay live (the latter feeds folkwang equally in the base and bare runs,
// so C1 still isolates). TOP-2 TARGETING: byFinalAtk ranks by LIVE effectiveAtk. Scope-lock
// static ATK is class-based (Attacker 119,667 > Supporter 99,734 > Defender 79,801), but 2b's
// own-kit atkOfMaxHpPct self-buffs would lift her Defender ATK (~+6.16% of a Defender-class
// Max HP) PAST naga — so her two self-inflation blocks are patched out, leaving the ranking
// asuka (#1, lifted further by her self atkPct 96.98) > naga (#2 at 99,734 + her own
// cast-time flat grants) > the three 79,801 Defenders — folkwang's "2 highest final ATK"
// resolves to {asuka, naga} for the whole fight, and every shield lands on naga.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { loadOverride } from '../../../src/skills/overrides-node.js';
import {
  bareWeaponComp,
  bareWeaponOverride,
  runComp,
  totals,
  unitOf,
  withPatchedOverride,
} from '../lib/harness.js';

const SLUGS = ['tia', 'folkwang', 'naga', 'asuka', '2b'];
/** Slot order: tia 0 / folkwang 1 / naga 2 / asuka 3 / 2b 4. */
const FOLKWANG = 1;
const NAGA = 2;
const ASUKA = 3;

type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;

/** naga ISOLATED (claire-style): her S2 hitCount heal is stripped (folkwang originates no
 *  recovery events; the fixture must not leak any in) and every buff she originates is
 *  re-targeted to SELF — she still CONSUMES folkwang's shield channel (her shielded-trigger
 *  S1 fires on her and is countable), but her all-ally coreDamagePct 85.17 / casterAtkPct
 *  grants radiate nothing back onto folkwang (the clean-weapon inertness claim). */
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

/** 2b DE-INFLATED: her two self-inflation blocks (escalating S1 + passive atkOfMaxHpPct)
 *  are stripped so her live effectiveAtk stays at the Defender static 79,801 — below naga.
 *  Unpatched, her HP-scaling ATK lifts her into the top-2 ahead of naga and the shield
 *  consumer never receives a landing (byFinalAtk ranks LIVE effectiveAtk). Her boss-directed
 *  flatDamage lines stay live (her own damage — constant across all runs). */
const twobNoInflate = withPatchedOverride('2b', (ov) => {
  const s1Before = ov.skill1?.length ?? 0;
  ov.skill1 = (ov.skill1 ?? []).filter(
    (x: any) => !x.effects.some((e: any) => e.kind === 'escalating')
  );
  if (ov.skill1.length !== s1Before - 1) {
    throw new Error('2b skill1 escalating block missing — fixture is stale');
  }
  const s2Before = ov.skill2?.length ?? 0;
  ov.skill2 = (ov.skill2 ?? []).filter(
    (x: any) => !x.effects.some((e: any) => e.stat === 'atkOfMaxHpPct')
  );
  if (ov.skill2.length !== s2Before - 1) {
    throw new Error('2b skill2 atkOfMaxHpPct block missing — fixture is stale');
  }
});

/** tia DE-SHIELDED: both of her burst shield effects are stripped so folkwang is the SOLE
 *  shielder in the fixture (tia casts every chain — unpatched she would flood naga's
 *  shielded consumer). reenterStage + the team attackDamagePct + self burstCdr stay live. */
const tiaNoShield = withPatchedOverride('tia', (ov) => {
  let stripped = 0;
  for (const b of ov.burst ?? []) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'shield');
    stripped += before - b.effects.length;
  }
  if (stripped !== 2) {
    throw new Error('tia burst shield effects missing — fixture is stale');
  }
});

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    slugs: SLUGS,
    bossElement: 'Fire',
    focusSlug: 'folkwang',
    overrides: {
      naga: nagaIsolated,
      tia: tiaNoShield,
      '2b': twobNoInflate,
      ...overrides,
    },
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { res, events };
}

// ---- counterfactual / isolation patches (nearest-wrong models) -------------------------------
/** C2 isolation: S1 stripped entirely — shield firings must collapse to the burst shields. */
const fwNoS1 = withPatchedOverride('folkwang', (ov) => {
  if (!ov.skill1?.length) {
    throw new Error('folkwang skill1 missing — fixture is stale');
  }
  ov.skill1 = [];
});
/** C2 counterfactual: the S1 shield re-encoded as a heal (the marciana-reverse trap — the
 *  kit text literally says Shield). Must silence the shield channel's S1 contribution and
 *  over-fire the recovery channel by one landing per interval firing (asuka is one of the
 *  2 shield/heal targets). */
const fwS1ShieldAsHeal = withPatchedOverride('folkwang', (ov) => {
  const e = ov.skill1
    ?.flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'shield');
  if (!e) {
    throw new Error('folkwang skill1 shield effect missing — fixture is stale');
  }
  e.kind = 'heal';
  delete e.maxHpPct;
  delete e.durationSec;
});
/** C2 counterfactual: S1's 30s internal cooldown misread as S2's 20s CD — 8 interval
 *  firings instead of 5. */
const fwS1Interval20 = withPatchedOverride('folkwang', (ov) => {
  const b = (ov.skill1 ?? []).find((x: any) => x.trigger?.kind === 'interval');
  if (!b) {
    throw new Error(
      'folkwang skill1 interval block missing — fixture is stale'
    );
  }
  b.trigger.sec = 20;
});
/** C3 isolation: S2 stripped entirely — her maxHpFlat channel must go silent. */
const fwNoS2 = withPatchedOverride('folkwang', (ov) => {
  if (!ov.skill2?.length) {
    throw new Error('folkwang skill2 missing — fixture is stale');
  }
  ov.skill2 = [];
});
/** C3 counterfactual: the raw `maxHpPct` stat — only the CUBE path converts it; an override
 *  buff carrying it is never read (sim.ts applies it as a plain stat nobody consumes), so
 *  the line silently does nothing. The buffApply events still emit, but under the wrong
 *  stat, with the kit value unconverted. */
const fwS2RawMaxHpPct = withPatchedOverride('folkwang', (ov) => {
  const e = ov.skill2
    ?.flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'buff');
  if (!e) {
    throw new Error('folkwang skill2 buff effect missing — fixture is stale');
  }
  e.stat = 'maxHpPct';
});
/** C4 isolation: burst stripped — firings must collapse to the 5 interval shields. */
const fwNoBurst = withPatchedOverride('folkwang', (ov) => {
  if (!ov.burst?.length) {
    throw new Error('folkwang burst missing — fixture is stale');
  }
  ov.burst = [];
});
/** C4/DIV counterfactual: the burst shield keyed to fullBurstEnter (the trap-3 misread —
 *  shields every Full Burst regardless of who cast B2). The 3 naga-opened chains must
 *  over-fire the shield channel. */
const fwBurstFbEnter = withPatchedOverride('folkwang', (ov) => {
  const b = (ov.burst ?? []).find((x: any) =>
    x.effects.some((e: any) => e.kind === 'shield')
  );
  if (!b) {
    throw new Error('folkwang burst shield block missing — fixture is stale');
  }
  b.trigger = { kind: 'fullBurstEnter' };
});
/** C5 counterfactual: the rider's HoT collapsed to a single instant recovery (ticks:1) —
 *  one landing per cast instead of ten; a short-buff on-recovery consumer would see 1
 *  refresh instead of 10 across the window. */
const fwRiderTicks1 = withPatchedOverride('folkwang', (ov) => {
  const e = ov.burst
    ?.flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'heal');
  if (!e) {
    throw new Error('folkwang burst heal effect missing — fixture is stale');
  }
  e.ticks = 1;
  delete e.intervalSec;
});
/** C5 counterfactual: the rider dropped as "no HP pool modeled, inert" — the recovery
 *  channel must collapse to asuka's own lifesteal alone. */
const fwRiderDropped = withPatchedOverride('folkwang', (ov) => {
  for (const b of ov.burst ?? []) {
    const before = b.effects.length;
    b.effects = b.effects.filter((e: any) => e.kind !== 'heal');
    if (b.effects.length !== before - 1) {
      throw new Error('folkwang burst heal effect missing — fixture is stale');
    }
  }
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const noS1 = run({ folkwang: fwNoS1 });
const s1Heal = run({ folkwang: fwS1ShieldAsHeal });
const s1Int20 = run({ folkwang: fwS1Interval20 });
const noS2 = run({ folkwang: fwNoS2 });
const s2Raw = run({ folkwang: fwS2RawMaxHpPct });
const noBurst = run({ folkwang: fwNoBurst });
const burstFbEnter = run({ folkwang: fwBurstFbEnter });
const riderTicks1 = run({ folkwang: fwRiderTicks1 });
const riderDropped = run({ folkwang: fwRiderDropped });
const bareInTeam = run({ folkwang: bareWeaponOverride('folkwang') });

// The committed override, for the static (structural / unmodeled) pins.
const shipped = loadOverride('folkwang') as any;
if (!shipped) {
  throw new Error('folkwang has no override on disk — fixture is stale');
}
const allBlocks = [
  ...(shipped.skill1 ?? []),
  ...(shipped.skill2 ?? []),
  ...(shipped.burst ?? []),
];

// ---- readers ----------------------------------------------------------------------------------
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** naga's shielded-trigger S1: coreDamagePct 85.17 — self-targeted in this fixture, so
 *  exactly one buffApply per shield landing on her. folkwang is the ONLY shielder here. */
const nagaShieldedFirings = (evs: SimEvent[]) =>
  buffs(evs)
    .filter((b) => b.casterIdx === NAGA)
    .filter((b) => b.stat === 'coreDamagePct' && b.value === 85.17).length;
/** folkwang's S2 self Max HP grant surfaces as maxHpFlat (targetMaxHpPct is converted at
 *  apply time), self-cast, self-held. */
const fwMaxHpGrants = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) =>
      b.stat === 'maxHpFlat' &&
      b.casterIdx === FOLKWANG &&
      b.targetIdx === FOLKWANG
  );
/** asuka's recovery consumer = her self atkPct-96.98 buff (one per recovery landing on
 *  her). Her OWN burst lifesteal is left live: it is the calibrated control — every firing
 *  beyond her own casts is a recovery event folkwang fabricated. */
const recoveryFirings = (evs: SimEvent[]) =>
  buffs(evs).filter(
    (b) => b.casterIdx === ASUKA && b.stat === 'atkPct' && b.value === 96.98
  ).length;
const fwBuffs = (evs: SimEvent[]) =>
  buffs(evs).filter((b) => b.casterIdx === FOLKWANG);
const folkwangBursts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'burstCast' && e.slug === 'folkwang').length;
const nagaBursts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'burstCast' && e.slug === 'naga').length;
const asukaBursts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'burstCast' && e.slug === 'asuka').length;
const fullBursts = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').length;

/** S1 interval firings in a 180s fight: first at t=30s (the engine's interval phase
 *  convention), then every 30s → 30/60/90/120/150 = 5 (t=180 is the excluded loop bound). */
const S1_INTERVAL_FIRES = 5;
/** S2 interval firings: 20/40/…/160 = 8. */
const S2_INTERVAL_FIRES = 8;

describe('folkwang — fixture sanity (non-vacuity)', () => {
  it('the comp actually bursts: both B2s cast, and every chain completes', () => {
    // Non-vacuity gate for every channel below. The dual same-CD B3 pair (asuka/2b)
    // alternates the stage-3 slot, so fullBursts tracks the chain count, and the B2
    // competition (naga CD 20 vs folkwang CD 40) splits the chains between them.
    expect(folkwangBursts(base.events)).toBeGreaterThan(0);
    expect(nagaBursts(base.events)).toBeGreaterThan(0);
    expect(fullBursts(base.events)).toBeGreaterThan(0);
    expect(fullBursts(base.events)).toBe(
      folkwangBursts(base.events) + nagaBursts(base.events)
    );
  });

  it('DIV non-vacuity: at least one Full Burst opens on a chain folkwang did NOT cast', () => {
    // The burstCast-vs-fullBurstEnter discrimination below needs fullBursts to strictly
    // exceed folkwang's own casts — naga's chains must complete.
    expect(fullBursts(base.events)).toBeGreaterThan(
      folkwangBursts(base.events)
    );
  });

  it('folkwang fires her AR and deals weapon damage', () => {
    // Her own total > 0 guards the inertness assertions (else "unchanged" would be
    // trivially true on a zero).
    expect(unitOf(base.res, 'folkwang').totalDamage).toBeGreaterThan(0);
  });
});

describe('C1 — clean-weapon: her kit contributes nothing to her own damage', () => {
  it('own total is byte-identical with her kit zeroed, in the same comp', () => {
    // An AR clean-weapon basis cell: with folkwang's kit swapped for the empty kit, her own
    // total must not move a point (the in-team bare run keeps tia/naga/asuka/2b identical,
    // so this isolates folkwang's own contribution). Zero damage lines and zero weapon-state
    // modifiers in the whole kit.
    expect(unitOf(base.res, 'folkwang').totalDamage).toBe(
      unitOf(bareInTeam.res, 'folkwang').totalDamage
    );
  });

  it('own total is byte-identical on the BARE-WEAPON BASIS too (CW1 mirror)', () => {
    // The machine-checkable core of P1 (clean-weapons.test.ts CW1): the committed override
    // sims byte-identical to the empty kit on the neutral-Iron solo basis. folkwang is one
    // of the six, so this is her per-unit copy of that pin.
    const bare = unitOf(
      runComp(bareWeaponComp(['folkwang'])),
      'folkwang'
    ).totalDamage;
    const withKit = unitOf(
      runComp(
        bareWeaponComp(['folkwang'], {
          overrides: { folkwang: shipped },
        })
      ),
      'folkwang'
    ).totalDamage;
    expect(withKit).toBe(bare);
  });

  it('DISCRIMINATING: her kit MOVES the team — the inertness is tandem, not vacuous', () => {
    // Her shields drive naga's shielded-trigger coreDamagePct 85.17 channel, so zeroing her
    // kit MUST move naga's total even though her own never moves. Proves "her damage is
    // unchanged" is a live fact about a kit that does something, not a vacuous
    // nothing-happens.
    expect(totals(bareInTeam.res)).not.toEqual(totals(base.res));
    expect(totals(bareInTeam.res).folkwang).toBe(totals(base.res).folkwang);
  });
});

describe('C2 — S1 Starting Whistle: a REAL SHIELD every 30s on the 2 highest-final-ATK allies', () => {
  it('fires naga\u2019s shielded-trigger S1 on every interval firing and every own burst cast', () => {
    // naga is always one of the 2 highest final ATK (scope-lock ATK is class-based:
    // Attacker/Supporter > Defender), so every folkwang shield lands on her: 5 interval
    // firings (t=30/60/90/120/150) + one burst shield per folkwang cast. folkwang is the
    // ONLY shielder in this fixture (tia's burst shields patched out).
    expect(nagaShieldedFirings(base.events)).toBe(
      S1_INTERVAL_FIRES + folkwangBursts(base.events)
    );
  });

  it('DISCRIMINATING: stripping S1 collapses the firings to the burst shields alone', () => {
    expect(nagaShieldedFirings(noS1.events)).toBe(folkwangBursts(noS1.events));
  });

  it('DISCRIMINATING: shield-as-heal silences the S1 shield contribution', () => {
    // The marciana-reverse trap: encoding the line as a heal (the wrong event kind) means
    // naga never receives a shield from S1 — only the (still-shield) burst landings remain.
    expect(nagaShieldedFirings(s1Heal.events)).toBe(
      folkwangBursts(s1Heal.events)
    );
  });

  it('DISCRIMINATING: shield-as-heal OVER-FIRES the recovery channel by one landing per interval firing', () => {
    // The converted heal lands on the 2 highest final ATK (asuka + naga) at every interval
    // firing, so asuka's consumer gains exactly the 5 S1 landings on top of her own
    // burst-lifesteal control count.
    expect(recoveryFirings(s1Heal.events)).toBe(
      recoveryFirings(base.events) + S1_INTERVAL_FIRES
    );
  });

  it('DISCRIMINATING: a 20s interval (S2\u2019s CD misread) fires 8 shields instead of 5', () => {
    expect(nagaShieldedFirings(s1Int20.events)).toBe(
      S2_INTERVAL_FIRES + folkwangBursts(s1Int20.events)
    );
    expect(nagaShieldedFirings(s1Int20.events)).toBeGreaterThan(
      nagaShieldedFirings(base.events)
    );
  });

  it('targets by FINAL ATK, top 2 (structural)', () => {
    // "Affects 2 allies with the highest FINAL ATK" — byFinalAtk is the schema's literal
    // encoding of that wording (A3 ruling); a plain highest-ATK (static) ranking or an
    // all-allies widening would be different, less-literal models.
    const shieldBlock = (shipped.skill1 ?? []).find((b: any) =>
      b.effects.some((e: any) => e.kind === 'shield')
    );
    expect(shieldBlock?.target).toEqual({
      kind: 'alliesTopAtk',
      count: 2,
      byFinalAtk: true,
    });
  });

  it('is time-bounded at 10 sec with the kit magnitude recorded (structural)', () => {
    const shield = (shipped.skill1 ?? [])
      .flatMap((b: any) => b.effects)
      .find((e: any) => e.kind === 'shield');
    expect(shield.durationSec).toBe(10);
    expect(shield.maxHpPct).toBe(13.71);
  });
});

describe('C3 — S2 Harder, Better, Faster: SELF Max HP ▲ 44.96% every 20s (offensively inert)', () => {
  it('grants exactly 8 self maxHpFlat buffs over the fight (one per interval firing)', () => {
    // interval 20 → t=20/40/…/160 = 8 firings; the 10s duration lapses before each refresh,
    // so every application is a fresh apply on herself.
    expect(fwMaxHpGrants(base.events).length).toBe(S2_INTERVAL_FIRES);
    for (const b of fwMaxHpGrants(base.events)) {
      expect(b.targetSlug).toBe('folkwang');
      expect(b.value).toBeGreaterThan(0); // the converted flat Max HP
    }
  });

  it('DISCRIMINATING: stripping S2 silences the channel', () => {
    expect(fwMaxHpGrants(noS2.events).length).toBe(0);
  });

  it('DISCRIMINATING: the raw maxHpPct stat never converts — no maxHpFlat events at all', () => {
    // The nearest-wrong encoding: only the cube path converts maxHpPct→maxHpFlat; an
    // override buff with the raw stat is applied as a stat nothing reads. The line would
    // LOOK present in the JSON and silently do nothing — this assertion pins the conversion.
    expect(fwMaxHpGrants(s2Raw.events).length).toBe(0);
  });

  it('leaves folkwang\u2019s OWN total unchanged (the grant is offensively inert)', () => {
    // Max HP feeds only atkOfMaxHpPct conversions (the e3 rule: own-kit grants only), and
    // folkwang carries no such line — so removing the whole S2 block cannot move her damage.
    expect(totals(noS2.res).folkwang).toBe(totals(base.res).folkwang);
  });

  it('is a self-targeted targetMaxHpPct buff, kit magnitude + 10s window (structural)', () => {
    const block = (shipped.skill2 ?? []).find((b: any) =>
      b.effects.some((e: any) => e.kind === 'buff')
    );
    expect(block?.trigger).toEqual({ kind: 'interval', sec: 20 });
    expect(block?.target).toEqual({ kind: 'self' });
    const eff = block?.effects?.[0];
    expect(eff?.stat).toBe('targetMaxHpPct');
    expect(eff?.value).toBe(44.96);
    expect(eff?.durationSec).toBe(10);
  });
});

describe('C4 — Burst Sprint: a shield on the 2 highest-final-ATK allies per OWN cast (burstCast, not fullBurstEnter)', () => {
  it('stripping the burst collapses the shield channel to the 5 interval firings', () => {
    expect(nagaShieldedFirings(noBurst.events)).toBe(S1_INTERVAL_FIRES);
  });

  it('the burst shield is keyed to her OWN burst cast (structural)', () => {
    const block = (shipped.burst ?? []).find((b: any) =>
      b.effects.some((e: any) => e.kind === 'shield')
    );
    expect(block?.trigger).toEqual({ kind: 'burstCast' });
    expect(block?.target).toEqual({
      kind: 'alliesTopAtk',
      count: 2,
      byFinalAtk: true,
    });
    const shield = block?.effects?.find((e: any) => e.kind === 'shield');
    expect(shield?.maxHpPct).toBe(32.9);
    expect(shield?.durationSec).toBe(10);
  });
});

describe('C4/DIV — burstCast vs fullBurstEnter, separated by the competing B2 (naga)', () => {
  it('the shield channel fires on folkwang\u2019s OWN casts only', () => {
    // Re-assert the full identity here as the DIV baseline: 5 interval + one per own cast,
    // and the 3 naga-opened Full Bursts contribute NOTHING.
    expect(nagaShieldedFirings(base.events)).toBe(
      S1_INTERVAL_FIRES + folkwangBursts(base.events)
    );
    expect(nagaBursts(base.events)).toBeGreaterThan(0);
  });

  it('DISCRIMINATING: a fullBurstEnter encoding over-fires on naga-opened chains', () => {
    // The trap-3 misread shields every Full Burst regardless of who cast B2: its firings
    // track the FB count, which strictly exceeds the own-cast count because naga opens
    // chains folkwang does not cast. This is the assertion a sole-B2 fixture structurally
    // CANNOT make.
    const over = nagaShieldedFirings(burstFbEnter.events);
    expect(over).toBe(S1_INTERVAL_FIRES + fullBursts(burstFbEnter.events));
    expect(over).toBeGreaterThan(nagaShieldedFirings(base.events));
  });
});

describe('C5 — burst rider: a REAL recovery stream (heal HoT ticks:10) on the same top-2 target', () => {
  it('asuka\u2019s recovery consumer fires asukaBursts + ten HoT landings per folkwang cast', () => {
    // asuka's own burst lifesteal is the calibrated control left LIVE (one self landing per
    // own cast). The rider adds ten recovery landings on each of its 2 targets per folkwang
    // cast — asuka is always one of the 2 highest final ATK. All four HoT windows fit the
    // 180s fight (last cast ~168s + 10s window < 180s), so no truncation.
    expect(recoveryFirings(base.events)).toBe(
      asukaBursts(base.events) + 10 * folkwangBursts(base.events)
    );
    expect(folkwangBursts(base.events)).toBeGreaterThan(0);
  });

  it('DISCRIMINATING: ticks:1 collapses the stream to one landing per cast', () => {
    // The nearest-wrong HoT encoding: a single instant recovery per cast — an on-recovery
    // consumer's short buff would see 1 refresh instead of 10 across the window.
    expect(recoveryFirings(riderTicks1.events)).toBe(
      asukaBursts(riderTicks1.events) + folkwangBursts(riderTicks1.events)
    );
    expect(recoveryFirings(riderTicks1.events)).toBeLessThan(
      recoveryFirings(base.events)
    );
  });

  it('DISCRIMINATING: dropping the rider collapses the channel to asuka\u2019s own lifesteal', () => {
    // The "no HP pool modeled, inert" misread — the recovery channel must go silent on
    // folkwang's side entirely.
    expect(recoveryFirings(riderDropped.events)).toBe(
      asukaBursts(riderDropped.events)
    );
    expect(recoveryFirings(noBurst.events)).toBe(asukaBursts(noBurst.events));
  });

  it('the rider is keyed to her OWN burst cast and shares the shield\u2019s top-2 target (structural)', () => {
    const block = (shipped.burst ?? []).find((b: any) =>
      b.effects.some((e: any) => e.kind === 'heal')
    );
    expect(block?.trigger).toEqual({ kind: 'burstCast' });
    expect(block?.target).toEqual({
      kind: 'alliesTopAtk',
      count: 2,
      byFinalAtk: true,
    });
    const heal = block?.effects?.find((e: any) => e.kind === 'heal');
    expect(heal?.ticks).toBe(10);
    expect(heal?.intervalSec).toBe(1);
  });

  it('the 65.81 / 45.7 magnitudes never surface as buffs (event-only / unmodeled lines)', () => {
    expect(buffs(base.events).some((b) => b.value === 65.81)).toBe(false);
    expect(buffs(base.events).some((b) => b.value === 45.7)).toBe(false);
  });
});

describe('U1-U2 — unmodeled lines are documented, not dropped or fabricated', () => {
  it('the two gaps live VERBATIM in `unmodeled` (never an `ignored` drop)', () => {
    expect(shipped.unmodeled?.skill1?.join(' ')).toContain(
      'Incoming healing ▲ 45.7% for 10 sec'
    );
    expect(shipped.unmodeled?.skill2?.join(' ')).toContain('Taunt for 5 sec');
    // Her burst lifesteal's recovery EVENT is modelled (ticks:10 — the thing consumers read);
    // its 65.81% MAGNITUDE is filed here by the 2026-08-11 owner ruling (DECISIONS — unmodeled
    // behaviour is recorded, not left to prose), because the amount has no engine consumer.
    expect(shipped.unmodeled?.burst?.join(' ')).toContain(
      'Recovers 65.81% of attack damage as HP'
    );
    expect(shipped.unmodeled?.burst?.length).toBe(1);
    expect(shipped.ignored).toBeUndefined();
  });

  it('the taunt never surfaces as a fabricated boss status or enemy debuff', () => {
    // v1 models no aggro; the nearest fabrication would be a targetStatus or a boss-targeted
    // buffApply from folkwang. She originates exactly one buff family: her own maxHpFlat.
    for (const b of fwBuffs(base.events)) {
      expect(b.stat).toBe('maxHpFlat');
      expect(b.targetIdx).toBe(FOLKWANG);
    }
  });
});

describe('structural pins (kit-shape invariants)', () => {
  it('exactly three blocks — one per slot; one effect each except the burst (shield + rider)', () => {
    expect(allBlocks.length).toBe(3);
    expect(new Set(allBlocks.map((b: any) => b.slot))).toEqual(
      new Set(['skill1', 'skill2', 'burst'])
    );
    for (const b of allBlocks) {
      expect(b.effects.length).toBe(b.slot === 'burst' ? 2 : 1);
    }
  });

  it('the two passives are interval-keyed at their datamined cooldowns (30s / 20s)', () => {
    // Neither S1 nor S2 carries an activation clause — they fire on their internal
    // cooldowns, so `interval` at the skill's own CD is the faithful trigger.
    const s1 = (shipped.skill1 ?? [])[0];
    const s2 = (shipped.skill2 ?? [])[0];
    expect(s1?.trigger).toEqual({ kind: 'interval', sec: 30 });
    expect(s2?.trigger).toEqual({ kind: 'interval', sec: 20 });
  });

  it('both shields are real `shield` effects (never heal-encoded)', () => {
    const shields = allBlocks.filter((b: any) =>
      b.effects.some((e: any) => e.kind === 'shield')
    );
    expect(shields.length).toBe(2);
    expect(new Set(shields.map((s: any) => s.slot))).toEqual(
      new Set(['skill1', 'burst'])
    );
  });

  it('the ONLY heal is the burst rider (S1 is never heal-encoded; no heal on the passives)', () => {
    const heals = allBlocks.filter((b: any) =>
      b.effects.some((e: any) => e.kind === 'heal')
    );
    expect(heals.length).toBe(1);
    expect(heals[0].slot).toBe('burst');
  });

  it('no damage effect of any kind exists in the override (the P1 prose pin, machine side)', () => {
    for (const b of allBlocks) {
      for (const e of b.effects) {
        expect(['shield', 'buff', 'heal']).toContain(e.kind);
      }
    }
  });
});
