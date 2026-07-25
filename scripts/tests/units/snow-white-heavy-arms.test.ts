// PER-UNIT KIT SPEC — `snow-white-heavy-arms` (Snow White: Heavy Arms, Attacker/SR/Water, Burst III, cd 40s,
// ammo 6, reloadFrames 141, chargeFrames 72, hitsPerShot 1, normalMult 69.04 / coreMult 200, chargeMult 250,
// critRate 15 / critDamage 150). Kit-autonomy gauntlet 2026-07-24 (driver-authored S2a; tests FIRST; reconciled
// vs blind S2b claude-fable-5 / S5-S7 claude-opus-4-8).
//
// P0 DISAMBIGUATION: this is `snow-white-heavy-arms` (SR/Water/Attacker/Burst III) — a COMPLETELY DIFFERENT unit
// from base `snow-white` (AR/Iron). No base-snow-white data, recordings, or encoding are cited or reused here;
// every magnitude below is read off characters['snow-white-heavy-arms'] only. Approved nickname: `swha`.
//
// One assertion group per KIT LINE (W1..W20 below), asserted against the SHIPPED override loaded from disk.
// `withPatchedOverride` builds COUNTERFACTUALS only (the nearest-wrong reading each assertion must discriminate
// against) — never the encoding under test.
//
// Kit (data/characters.json → characters['snow-white-heavy-arms'].skills, levels 10/10/10 — the normalized
// `skills` prose is the SSOT):
//   S1 ■ every 0.2s while charging, nearest non-Lock-On enemy: Lock-On (max 5; off on normal/cover)  (UNMODELED)  [W1]
//      ■ every 0.2s while charging, self: Auto Fire Ready — loads ammo (max 5) + DEF ▲42.24% continuous (UNMODELED) [W2/W3]
//      ■ every 0.2s while charging, all Lock-On enemies: Damage Taken ▲4.2% for 4 sec                              [W4]
//      ■ on Full Charge (Auto Fire): Effect 1 — 41.9% of final ATK to ALL enemies                                  [W5]
//                                     Effect 2 — 105.59% × 5 loaded ammo = 527.95% of final ATK, sequential, Lock-On [W6]
//      ■ on Full Charge while Fully Active: the EXTRA (15−5)=10 ammo × 105.59 = 1055.9% sequential, swapGate swapped [W7]
//      ■ on Full Charge while Fully Active: uses ▼1  (UNMODELED bookkeeping)                                       [W8]
//      ■ on normal attack while not in Full Burst: removes Fully Active  (UNMODELED bookkeeping)                   [W9]
//   S2 ■ at battle start: fixes charge time at 1.2s continuous  (UNMODELED — sim uses fixed cadence)               [W10]
//      ■ during Full Charge: Pierce 5s (UNMODELED, inert) + ATK ▲46.84% 5s + Parts Damage ▲62.64% 5s              [W11/W12/W13]
//      ■ entering Burst Stage 3: ATK ▲73.92% 10s                                                                  [W14]
//      ■ at Full Charge while Fully Active: Charge Damage ▲528% 1 round + Sequential attack damage ▲158.4% 1 round [W15/W16]
//   BU ■ self: Attack Damage ▲84.48% 10s                                                                          [W17]
//      ■ self: Seven Dwarves Fully Active — weaponSwap (charge 3.2s, 2 uses; max Lock-On/ammo ▲10 UNMODELED)      [W18/W19]
//      ■ all destructible projectiles: 41.9% of final ATK  (UNMODELED — none vs single boss)                      [W20]
//
// STEADY-STATE / ROUND-COUNT MODELING (the load-bearing judgment calls):
//   W4  "Damage Taken ▲4.2% for 4 sec" re-fires every 0.2s WHILE CHARGING. She charges continuously under
//       scope-lock auto-play, so the debuff is refreshed ~20×/4s ≡ permanent uptime on the boss. Faithful
//       steady-state = passive damageTakenPct 4.2 on the boss (a passive trigger ignores durationSec — sim.ts
//       alwaysOn — so encoding 4.2/4s as passive+duration would be identical; the passive permanent IS the
//       100%-uptime reading).
//   W6  Auto Fire Effect 2 loads 5 ammo out of Fully Active → 105.59 × 5 = 527.95% sequential volley per full
//       charge. Encoded as one shotFired flatDamage 527.95 flavor sequential (the per-shot baseline auto-fire).
//   W7  THE FIX LINE (2026-07-13 volley-placement). In Fully Active the ammo cap rises 5→15, so a swap shot's
//       volley is 105.59 × 15 = 1583.85%; the EXTRA over the W6 baseline is 1583.85 − 527.95 = 1055.9%. Encoded
//       as a shotFired flatDamage 1055.9 flavor sequential gated swapGate:'swapped' — it rides ONLY her two
//       swapped full-charge shots inside the FB window, NOT a burstCast lump at cast-instant (the old model
//       lumped 2111.8% at cast, which missed the seq/own-burst/FB-era ATK dilution and stranded her 0.78-0.83
//       after the measured cast-boundary revert; community twice-confirmed: gamewith JP holds the Fully Active
//       buffs per fully-charged shot, prydwen the 7→15-hit structure). The fixture makes this discriminable:
//       she fires 84 full charges over 180s but only 10 swap shots (2 per burst × 5 bursts), so the 1055.9 must
//       fire exactly 10× and every instance must land inside a [burstCast, +10s] swap window.
//   W15/W16  "Charge Damage ▲528%" + "Sequential attack damage ▲158.4%" each read "for 1 round(s)", but Fully
//       Active has 2 uses (two swapped full charges), so both are encoded as burstCast self buffs with
//       whileSwapped:true and durationSec 10 — the outer bound covering both swap rounds, while whileSwapped
//       confines their ACTIVITY to the swap window itself (sim.ts:1228 drops a whileSwapped buff the instant the
//       unit's swap ends).
//
// EVENT-LOG CONVENTIONS (measured for this fixture): the W4 boss debuff emits buffApply with casterIdx===null
// AND targetIdx===null, but the buff KEY carries the caster SLOT (`2:skill1:damageTakenPct:4.2`, swha = slot 2)
// — read by stat+value+targetIdxnull, never by casterIdx. Self buffs (W12/W14/W15/W16/W17) carry
// casterIdx===2 / targetIdx===2 normally. The W18 weaponSwap emits NO buffApply (it is a state change); its only
// observables are the swap-weapon normal shots (normal-bucket 69.04 with charge mult 7.78 = 2.5 + 5.28 additive
// charge points from W15) and the W7 1055.9 riders (which the swapGate confines to those swap shots).
//
// ENGINE-FIDELITY RESIDUAL (⚑, flagged for owner spot-check — NOT an override-encoding gotcha): the W16
// sequentialDamagePct 158.4 buffApply FIRES faithfully (stat/value/target/trigger all asserted below), but the
// engine's flatDamage rider path does NOT route flavor:'sequential' into the seqMult bucket — measured seqMult=1
// on BOTH the 527.95 baseline and the 1055.9 lump regardless of whether whileSwapped is present or the flavor tag
// is stripped (probe-verified). So the 158.4 is encoded-but-inert on the riders in this fixture. The note's
// "applies ONLY to sequential-flavored hits" describes the INTENT; the engine does not consume it there. This is
// an engine-core question (flatDamage→seqMult plumbing), which the gauntlet must NOT edit (src/engine/**). The
// override encodes the prose faithfully; the model is graded/validated in this state (the 158.4 is a small,
// support-diluted contribution). W15 chargeDamagePct 528, by contrast, IS consumed — it lifts the swap-weapon
// normal shots' charge mult to 7.78 (asserted below). The asymmetry is purely the engine's two different stat
// consumption paths (charge bucket vs seqMult bucket), not an override inconsistency.
//
// Why each assertion discriminates (a test that cannot fail under the nearest-wrong gates nothing):
//   W4  boss debuff (targetIdx null, permanent, value 4.2). Nearest-wrong (target): retarget `self` → the debuff
//       lands on swha (targetIdx 2), the boss debuff disappears.
//   W5  41.9% AoE auto-fire, one per full charge (84), srcSlot skill1. Nearest-wrong (presence): removed → 0.
//   W6  527.95% sequential baseline volley, one per full charge (84), srcSlot skill1. Nearest-wrong (magnitude):
//       105.59 (a single ammo, ignoring the ×5 loaded) → 0 of 527.95, 84 of 105.59.
//   W7  1055.9% sequential EXTRA, swapGate:'swapped', exactly 2 per burst (10), all inside swap windows.
//       Nearest-wrong (a, the FIX): remove the weaponSwap → no swap exists → swapGate never satisfied → 0 of
//       1055.9. (b, UNGATED): strip swapGate → fires on EVERY full charge (84), most outside any swap window.
//   W12 shotFired self ATK ▲46.84% 5s. Nearest-wrong (target): `allies` → hits all 3 slots, not swha alone.
//   W13 Parts Damage ▲62.64% is INERT vs the partless scope-lock boss — byte-identical totals when removed (the
//       helm-H4 pattern), AND the encoding still fires (self, 5s).
//   W14 stageEnter(B3) self ATK ▲73.92% 10s — fires precisely on her burstCast frames (entering stage 3 = casting
//       her B3 burst). Nearest-wrong (duration): 5s, not the prose 10s.
//   W15 burstCast self Charge Damage ▲528% whileSwapped — encoding fires on cast frames; APPLIED: swap-weapon
//       normals carry charge mult 7.78 (= 2.5 + 5.28), base normals 2.5. Nearest-wrong: removed → no 7.78 normals.
//   W16 burstCast self Sequential Damage ▲158.4% whileSwapped — encoding fires on cast frames (the inert-on-riders
//       residual is documented above, NOT asserted as scaling). Nearest-wrong (presence): removed → no buffApply.
//   W17 burstCast self Attack Damage ▲84.48% 10s. Nearest-wrong (trigger): fullBurstEnter → fires on FB-START
//       frames (380,…), strictly AFTER her burstCast frames (358,…). (target): `allies` → all 3 slots.
//   W18 weaponSwap (charge 3.2s, 2 uses) — observable ONLY via its swap shots (the W7 1055.9 riders + the W15
//       charge-7.78 normals). Removing it removes BOTH. No fabricated burst-bucket damage (W20 skip ⇒ swha deals
//       ZERO burst-bucket damage; the swap shots are normal-bucket weapon fire).
//   W2/W3/W11/W20 documented-skip PINs: skill1-keyed buffs emit EXACTLY {damageTakenPct} (no DEF/ammo stat);
//       skill2-keyed buffs emit EXACTLY {atkPct, partsDamagePct, chargeDamagePct, sequentialDamagePct} (no Pierce);
//       burst-keyed buffs emit EXACTLY {attackDamagePct} (no fabricated projectile/nuke); swha burst-bucket damage
//       is EMPTY (the 41.9% anti-projectile line is skipped, not mis-encoded as a boss nuke).
//
// Fixture: swha is Burst III, so a custom sole-B3 comp [liter(B1) / crown(B2) / snow-white-heavy-arms(B3,SR Water)]
// is used (NOT controlComp, which fields a second B3). swha is the SOLE Burst III and is camera-focused (×2.5 burst
// gauge on her charge SR) → she casts her burst ~5× over 180s, each cast opening a Full Burst chain (her burstCast
// frame 358/2618/… strictly precedes each fullBurstStart 380/2640/…). Boss Fire (Water swha is favorable vs Fire;
// the element major is a uniform scalar that does not touch any structural assertion here). Deterministic (no seed).
// Slot order: liter 0 / crown 1 / swha 2.
import { describe, expect, it } from 'vitest';
import type { SimEvent } from '../../../src/types.js';
import { runComp, totals, withPatchedOverride } from '../lib/harness.js';

const FPS = 60;
const SWHA = 'snow-white-heavy-arms';
const S = 2; // slot index in the fixture
const ALL_SLOTS = [0, 1, 2];

type Damage = Extract<SimEvent, { kind: 'damage' }>;
type BuffApply = Extract<SimEvent, { kind: 'buffApply' }>;
type BurstCast = Extract<SimEvent, { kind: 'burstCast' }>;
type Shot = Extract<SimEvent, { kind: 'shot' }>;

const FIXTURE = {
  slugs: ['liter', 'crown', SWHA] as string[],
  bossElement: 'Fire' as const,
  focusSlug: SWHA,
};

function run(overrides: Record<string, any> = {}) {
  const events: SimEvent[] = [];
  const res = runComp({
    ...FIXTURE,
    overrides,
    cfg: { onEvent: (e) => events.push(e) },
  });
  return { events, totals: totals(res) };
}

// ---- readers ----------------------------------------------------------------------------------
const dmg = (evs: SimEvent[]) =>
  evs.filter((e): e is Damage => e.kind === 'damage');
const swhaDamage = (evs: SimEvent[]) => dmg(evs).filter((d) => d.slug === SWHA);
/** swha skill1 damage at a given atkPct magnitude. */
const s1At = (evs: SimEvent[], atkPct: number) =>
  swhaDamage(evs).filter((d) => d.srcSlot === 'skill1' && d.atkPct === atkPct);
const buffs = (evs: SimEvent[]) =>
  evs.filter((e): e is BuffApply => e.kind === 'buffApply');
/** swha-caster self/ally buffApply (casterIdx === S). */
const swhaBuff = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.casterIdx === S &&
      b.stat === stat &&
      (value === undefined || b.value === value),
  );
/** Boss-held debuffs: casterIdx null AND targetIdx null; read by stat+value (key carries caster slot). */
const bossDebuff = (evs: SimEvent[], stat: string, value?: number) =>
  buffs(evs).filter(
    (b) =>
      b.targetIdx === null &&
      b.stat === stat &&
      (value === undefined || b.value === value),
  );
const targetsOf = (bs: BuffApply[]) =>
  [...new Set(bs.map((b) => b.targetIdx))].sort(
    (a, b) => (a ?? -1) - (b ?? -1),
  );
const dursOf = (bs: BuffApply[]) => [
  ...new Set(
    bs.map((b) => (b.expiresFrame == null ? null : b.expiresFrame - b.frame)),
  ),
];
const swhaShots = (evs: SimEvent[]) =>
  evs.filter((e): e is Shot => e.kind === 'shot' && e.slug === SWHA);
const swhaBursts = (evs: SimEvent[]) =>
  evs.filter((e): e is BurstCast => e.kind === 'burstCast' && e.slug === SWHA);
const castFrames = (evs: SimEvent[]) => swhaBursts(evs).map((e) => e.frame);
const fbStartFrames = (evs: SimEvent[]) =>
  evs.filter((e) => e.kind === 'fullBurstStart').map((e) => e.frame);
/** [burstCast, +10s] swap windows — the window the swapGate('swapped') gate reads (swap durationSec 10). */
const castWindows = (evs: SimEvent[]): [number, number][] =>
  swhaBursts(evs).map((c) => [c.frame, c.frame + 10 * FPS]);
const inWindow = (frame: number, wins: [number, number][]) =>
  wins.some(([s, e]) => frame >= s && frame <= e);
/** swha normal-bucket (swap-weapon + base) shots at a given charge multiplier. */
const normalsWithCharge = (evs: SimEvent[], charge: number) =>
  swhaDamage(evs).filter(
    (d) => d.srcSlot === 'normal' && Math.abs(d.mult.charge - charge) < 1e-6,
  );
/** swha's skill-slot-keyed buffApply stats (key prefix `<S>:<slot>:`). */
const slotKeyedStats = (evs: SimEvent[], slot: 'skill1' | 'skill2' | 'burst') =>
  [
    ...new Set(
      buffs(evs)
        .filter((b) => b.key.startsWith(`${S}:${slot}:`))
        .map((b) => b.stat),
    ),
  ].sort();

// ---- counterfactual patches (nearest-wrong readings) -----------------------------------------
const eff = (b: any, stat: string) =>
  b.effects.find((e: any) => e.stat === stat);

// W4 nearest-wrong (target): the boss debuff retargeted to `self` (debuffs swha, not the boss).
const cfTakenSelf = withPatchedOverride(SWHA, (ov: any) => {
  const b = ov.skill1.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'damageTakenPct'),
  );
  if (!b)
    throw new Error('swha S1 damageTakenPct block missing — fixture is stale');
  b.target = { kind: 'self' };
});
// W5 nearest-wrong (presence): the 41.9% AoE auto-fire effect removed.
const cfNo41 = withPatchedOverride(SWHA, (ov: any) => {
  const b = ov.skill1.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'flatDamage' && e.atkPct === 41.9),
  );
  if (!b) throw new Error('swha S1 41.9 block missing — fixture is stale');
  b.effects = b.effects.filter(
    (e: any) => !(e.kind === 'flatDamage' && e.atkPct === 41.9),
  );
});
// W6 nearest-wrong (magnitude): the baseline volley at a single ammo (105.59) instead of ×5 (527.95).
const cfVolley105 = withPatchedOverride(SWHA, (ov: any) => {
  const e = ov.skill1
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.kind === 'flatDamage' && x.atkPct === 527.95);
  if (!e) throw new Error('swha S1 527.95 effect missing — fixture is stale');
  e.atkPct = 105.59;
});
// W7 nearest-wrong (a, the FIX): remove the weaponSwap → no swap exists → swapGate never satisfied.
const cfNoSwap = withPatchedOverride(SWHA, (ov: any) => {
  const before = ov.burst.length;
  ov.burst = ov.burst.filter(
    (b: any) => !b.effects.some((e: any) => e.kind === 'weaponSwap'),
  );
  if (ov.burst.length === before)
    throw new Error('swha burst weaponSwap block missing — fixture is stale');
});
// W7 nearest-wrong (b, UNGATED): strip swapGate → the 1055.9 fires on EVERY full charge.
const cfUngated = withPatchedOverride(SWHA, (ov: any) => {
  const b = ov.skill1.find((x: any) =>
    x.effects.some((e: any) => e.kind === 'flatDamage' && e.atkPct === 1055.9),
  );
  if (!b) throw new Error('swha S1 1055.9 block missing — fixture is stale');
  delete b.swapGate;
});
// W12 nearest-wrong (target): the shotFired ATK buff retargeted to `allies`.
const cfAtk46Allies = withPatchedOverride(SWHA, (ov: any) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'atkPct' && e.value === 46.84),
  );
  if (!b)
    throw new Error('swha S2 atkPct 46.84 block missing — fixture is stale');
  b.target = { kind: 'allies' };
});
// W13 reference: her parts-damage EFFECT removed (the inert-discrimination). The partsDamagePct effect SHARES its
// shotFired block with the W12 atkPct 46.84 buff, so this strips ONLY the partsDamagePct effect and leaves atkPct
// intact — removing the whole block would drop the +46.84% ATK and masquerade as a parts effect (probe-verified).
const cfNoParts = withPatchedOverride(SWHA, (ov: any) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'partsDamagePct'),
  );
  if (!b)
    throw new Error('swha S2 partsDamagePct block missing — fixture is stale');
  const before = b.effects.length;
  b.effects = b.effects.filter((e: any) => e.stat !== 'partsDamagePct');
  if (b.effects.length === before)
    throw new Error('swha S2 partsDamagePct effect missing — fixture is stale');
});
// W14 nearest-wrong (duration): the stageEnter ATK buff at 5s instead of the prose 10s.
const cfAtk73Dur5 = withPatchedOverride(SWHA, (ov: any) => {
  const e = ov.skill2
    .flatMap((b: any) => b.effects)
    .find((x: any) => x.stat === 'atkPct' && x.value === 73.92);
  if (!e)
    throw new Error('swha S2 atkPct 73.92 effect missing — fixture is stale');
  e.durationSec = 5;
});
// W15 nearest-wrong (presence): the Charge Damage 528 buff removed → swap shots lose the 7.78 charge mult.
const cfNoChargeDmg = withPatchedOverride(SWHA, (ov: any) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'chargeDamagePct'),
  );
  if (!b)
    throw new Error('swha S2 chargeDamagePct block missing — fixture is stale');
  b.effects = b.effects.filter((e: any) => e.stat !== 'chargeDamagePct');
});
// W16 nearest-wrong (presence): the Sequential Damage 158.4 buff removed → no buffApply.
const cfNoSeqDmg = withPatchedOverride(SWHA, (ov: any) => {
  const b = ov.skill2.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'sequentialDamagePct'),
  );
  if (!b)
    throw new Error(
      'swha S2 sequentialDamagePct block missing — fixture is stale',
    );
  b.effects = b.effects.filter((e: any) => e.stat !== 'sequentialDamagePct');
});
// W17 nearest-wrong (trigger): the burst Attack Damage keyed to fullBurstEnter (FB-START frames) instead of burstCast.
const cfAtkDmgFbEnter = withPatchedOverride(SWHA, (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'attackDamagePct'),
  );
  if (!b)
    throw new Error(
      'swha burst attackDamagePct block missing — fixture is stale',
    );
  b.trigger = { kind: 'fullBurstEnter' };
});
// W17 nearest-wrong (target): the burst Attack Damage retargeted to `allies`.
const cfAtkDmgAllies = withPatchedOverride(SWHA, (ov: any) => {
  const b = ov.burst.find((x: any) =>
    x.effects.some((e: any) => e.stat === 'attackDamagePct'),
  );
  if (!b)
    throw new Error(
      'swha burst attackDamagePct block missing — fixture is stale',
    );
  b.target = { kind: 'allies' };
});

// ---- runs (hoisted: each is a full 180s sim) --------------------------------------------------
const base = run();
const takenSelf = run({ [SWHA]: cfTakenSelf });
const no41 = run({ [SWHA]: cfNo41 });
const volley105 = run({ [SWHA]: cfVolley105 });
const noSwap = run({ [SWHA]: cfNoSwap });
const ungated = run({ [SWHA]: cfUngated });
const atk46Allies = run({ [SWHA]: cfAtk46Allies });
const noParts = run({ [SWHA]: cfNoParts });
const atk73Dur5 = run({ [SWHA]: cfAtk73Dur5 });
const noChargeDmg = run({ [SWHA]: cfNoChargeDmg });
const noSeqDmg = run({ [SWHA]: cfNoSeqDmg });
const atkDmgFbEnter = run({ [SWHA]: cfAtkDmgFbEnter });
const atkDmgAllies = run({ [SWHA]: cfAtkDmgAllies });

const shots = swhaShots(base.events).length;
const casts = swhaBursts(base.events).length;
const fbs = fbStartFrames(base.events).length;
const wins = castWindows(base.events);

describe('snow-white-heavy-arms — kit spec', () => {
  describe('fixture sanity — swha casts her burst and opens Full Burst chains', () => {
    it('swha casts >0 bursts, the team completes >0 Full Bursts, burstCast strictly precedes fullBurstStart', () => {
      expect(casts).toBeGreaterThan(0);
      expect(fbs).toBeGreaterThan(0);
      expect(shots).toBeGreaterThan(0);
      const cf = castFrames(base.events);
      const fs = fbStartFrames(base.events);
      expect(cf.every((f) => !fs.includes(f))).toBe(true);
      expect(Math.min(...cf)).toBeLessThan(Math.min(...fs));
    });
  });

  describe('W4 — S1 Damage Taken ▲4.2% on all Lock-On enemies (steady-state passive boss debuff)', () => {
    const taken = bossDebuff(base.events, 'damageTakenPct', 4.2);
    it('is a permanent frame-0 debuff on the BOSS (targetIdx null), value 4.2, keyed to her skill1 slot', () => {
      expect(taken.length).toBeGreaterThan(0);
      expect(taken.every((b) => b.targetIdx === null && b.value === 4.2)).toBe(
        true,
      );
      expect(dursOf(taken)).toEqual([null]);
      expect(Math.min(...taken.map((b) => b.frame))).toBe(0);
      expect([...new Set(taken.map((b) => b.key))]).toEqual([
        `${S}:skill1:damageTakenPct:4.2`,
      ]);
    });
    it('DISCRIMINATING (target): self (nearest-wrong) debuffs swha, removing the boss debuff', () => {
      expect(bossDebuff(takenSelf.events, 'damageTakenPct', 4.2).length).toBe(
        0,
      );
      expect(
        targetsOf(swhaBuff(takenSelf.events, 'damageTakenPct', 4.2)),
      ).toEqual([S]);
    });
  });

  describe('W5 — S1 Auto Fire Effect 1: 41.9% of final ATK to ALL enemies, once per full charge', () => {
    it('fires once per full charge at the kit magnitude, srcSlot skill1', () => {
      const hits = s1At(base.events, 41.9);
      expect(hits.length).toBe(shots);
      expect([...new Set(hits.map((d) => d.srcSlot))]).toEqual(['skill1']);
    });
    it('DISCRIMINATING (presence): removed (nearest-wrong) → no 41.9 hits', () => {
      expect(s1At(no41.events, 41.9).length).toBe(0);
    });
  });

  describe('W6 — S1 Auto Fire Effect 2: 105.59% × 5 ammo = 527.95% sequential baseline volley, once per full charge', () => {
    it('fires once per full charge at the ×5 magnitude, srcSlot skill1', () => {
      const hits = s1At(base.events, 527.95);
      expect(hits.length).toBe(shots);
      expect([...new Set(hits.map((d) => d.srcSlot))]).toEqual(['skill1']);
    });
    it('DISCRIMINATING (magnitude): a single ammo 105.59 (nearest-wrong, ignoring ×5 loaded) is NOT the faithful encoding', () => {
      expect(s1At(volley105.events, 527.95).length).toBe(0);
      expect(s1At(volley105.events, 105.59).length).toBe(shots);
    });
  });

  describe("W7 — S1 Fully Active EXTRA volley: 1055.9% sequential, swapGate:'swapped' (THE FIX — 2 swap shots/burst, in-window)", () => {
    const hits = s1At(base.events, 1055.9);
    it('fires exactly twice per burst (the 2 swapped full charges), srcSlot skill1', () => {
      expect(hits.length).toBe(2 * casts);
      expect(hits.length).toBeGreaterThan(0);
      expect([...new Set(hits.map((d) => d.srcSlot))]).toEqual(['skill1']);
    });
    it('every instance lands inside a [burstCast, +10s] swap window (NOT a cast-instant lump)', () => {
      expect(hits.every((d) => inWindow(d.frame, wins))).toBe(true);
      // and they are NOT all on the cast frame itself (the old lump model): they ride the LATER swap shots
      expect(hits.every((d) => castFrames(base.events).includes(d.frame))).toBe(
        false,
      );
    });
    it('DISCRIMINATING (the FIX): remove the weaponSwap → no swap exists → 0 of 1055.9', () => {
      expect(s1At(noSwap.events, 1055.9).length).toBe(0);
    });
    it('DISCRIMINATING (UNGATED): strip swapGate → fires on (essentially) EVERY full charge, many outside any swap window', () => {
      const ug = s1At(ungated.events, 1055.9);
      // ungated fires on ~every full charge (83 of 84 — one engine-boundary shot at the fight edge drops) vs 10 gated
      expect(ug.length).toBeGreaterThanOrEqual(shots - 1);
      expect(ug.length).toBeGreaterThan(2 * casts);
      expect(
        ug.some((d) => !inWindow(d.frame, castWindows(ungated.events))),
      ).toBe(true);
    });
  });

  describe('W12 — S2 during Full Charge: ATK ▲46.84% for 5 sec, self-scoped (shotFired)', () => {
    const atk = swhaBuff(base.events, 'atkPct', 46.84);
    it('is 46.84% for 5s on swha alone, fired by her shots', () => {
      expect(atk.length).toBeGreaterThan(0);
      expect(targetsOf(atk)).toEqual([S]);
      expect(dursOf(atk)).toEqual([5 * FPS]);
    });
    it('DISCRIMINATING (target): allies (nearest-wrong) hits all 3 slots, not swha alone', () => {
      expect(targetsOf(swhaBuff(atk46Allies.events, 'atkPct', 46.84))).toEqual(
        ALL_SLOTS,
      );
    });
  });

  describe('W13 — S2 during Full Charge: Parts Damage ▲62.64% is INERT vs the partless boss (encoding still fires)', () => {
    it("removing it changes NO unit's total by a single point", () => {
      expect(base.totals).toEqual(noParts.totals);
    });
    it('the encoding fires faithfully (self, 5s) even though the boss has no parts', () => {
      const parts = swhaBuff(base.events, 'partsDamagePct', 62.64);
      expect(parts.length).toBeGreaterThan(0);
      expect(targetsOf(parts)).toEqual([S]);
      expect(dursOf(parts)).toEqual([5 * FPS]);
    });
  });

  describe('W14 — S2 entering Burst Stage 3: ATK ▲73.92% for 10 sec, self-scoped (stageEnter)', () => {
    const atk = swhaBuff(base.events, 'atkPct', 73.92);
    it('is 73.92% for 10s on swha alone, firing precisely on her burstCast frames (entering stage 3)', () => {
      expect(atk.length).toBe(casts);
      expect(targetsOf(atk)).toEqual([S]);
      expect(dursOf(atk)).toEqual([10 * FPS]);
      const cf = castFrames(base.events);
      expect(atk.map((b) => b.frame).sort((a, b) => a - b)).toEqual(
        [...cf].sort((a, b) => a - b),
      );
    });
    it('DISCRIMINATING (duration): 5s (nearest-wrong) is not the prose 10s', () => {
      expect(dursOf(swhaBuff(atk73Dur5.events, 'atkPct', 73.92))).toEqual([
        5 * FPS,
      ]);
    });
  });

  describe('W15 — S2 at Full Charge while Fully Active: Charge Damage ▲528% (whileSwapped) — APPLIED to swap shots', () => {
    const cd = swhaBuff(base.events, 'chargeDamagePct', 528);
    it('encoding: 528% fires on her burstCast frames, self-scoped', () => {
      expect(cd.length).toBe(casts);
      expect(targetsOf(cd)).toEqual([S]);
      const cf = castFrames(base.events);
      expect(cd.map((b) => b.frame).sort((a, b) => a - b)).toEqual(
        [...cf].sort((a, b) => a - b),
      );
    });
    it('APPLIED: swap-weapon normals carry charge mult 7.78 (= 2.5 base + 5.28 additive), one per swap shot', () => {
      const swapNormals = normalsWithCharge(base.events, 7.78);
      // one charge-7.78 normal per swap shot, and the swap shots are exactly the W7 1055.9 riders
      expect(swapNormals.length).toBe(s1At(base.events, 1055.9).length);
      expect(swapNormals.length).toBeGreaterThan(0);
      // base (non-swap) normals stay at the 2.5 charge multiplier
      expect(normalsWithCharge(base.events, 2.5).length).toBeGreaterThan(0);
    });
    it('DISCRIMINATING (presence): removed (nearest-wrong) → no charge-7.78 swap normals', () => {
      expect(normalsWithCharge(noChargeDmg.events, 7.78).length).toBe(0);
    });
  });

  describe('W16 — S2 at Full Charge while Fully Active: Sequential Damage ▲158.4% (whileSwapped) — encoding pin', () => {
    // ENGINE-FIDELITY RESIDUAL (⚑, see header): the buffApply FIRES faithfully, but the engine's flatDamage path
    // does not route flavor:'sequential' into seqMult, so this buff is inert on the 527.95/1055.9 riders in-fixture
    // (measured seqMult=1 with/without whileSwapped, with/without the flavor tag). Asserted here as an ENCODING pin
    // only — NOT as damage scaling. Engine-core plumbing question flagged for owner spot-check; model graded in this state.
    const sq = swhaBuff(base.events, 'sequentialDamagePct', 158.4);
    it('encoding: 158.4% fires on her burstCast frames, self-scoped', () => {
      expect(sq.length).toBe(casts);
      expect(targetsOf(sq)).toEqual([S]);
      const cf = castFrames(base.events);
      expect(sq.map((b) => b.frame).sort((a, b) => a - b)).toEqual(
        [...cf].sort((a, b) => a - b),
      );
    });
    it('DISCRIMINATING (presence): removed (nearest-wrong) → no sequentialDamagePct buffApply', () => {
      expect(
        swhaBuff(noSeqDmg.events, 'sequentialDamagePct', 158.4).length,
      ).toBe(0);
    });
  });

  describe('W17 — Burst: Attack Damage ▲84.48% for 10 sec, self-scoped (burstCast)', () => {
    const ad = swhaBuff(base.events, 'attackDamagePct', 84.48);
    it('is 84.48% for 10s on swha alone, firing on her burstCast frames', () => {
      expect(ad.length).toBe(casts);
      expect(targetsOf(ad)).toEqual([S]);
      expect(dursOf(ad)).toEqual([10 * FPS]);
      const cf = castFrames(base.events);
      expect(ad.map((b) => b.frame).sort((a, b) => a - b)).toEqual(
        [...cf].sort((a, b) => a - b),
      );
    });
    it('DISCRIMINATING (trigger): fullBurstEnter (nearest-wrong) fires on FB-START frames, strictly after the cast frames', () => {
      const cf = swhaBuff(atkDmgFbEnter.events, 'attackDamagePct', 84.48);
      const fs = fbStartFrames(atkDmgFbEnter.events);
      const cast = castFrames(atkDmgFbEnter.events);
      expect(cf.length).toBeGreaterThan(0);
      expect(cf.every((b) => fs.includes(b.frame))).toBe(true);
      expect(cf.every((b) => !cast.includes(b.frame))).toBe(true);
    });
    it('DISCRIMINATING (target): allies (nearest-wrong) hits all 3 slots, not swha alone', () => {
      expect(
        targetsOf(swhaBuff(atkDmgAllies.events, 'attackDamagePct', 84.48)),
      ).toEqual(ALL_SLOTS);
    });
  });

  describe('W18 — Burst: Seven Dwarves Fully Active weaponSwap (charge 3.2s, 2 uses) — observable via its swap shots', () => {
    it('removing the swap removes BOTH swap observables: the W7 1055.9 riders AND the W15 charge-7.78 normals', () => {
      expect(s1At(noSwap.events, 1055.9).length).toBe(0);
      expect(normalsWithCharge(noSwap.events, 7.78).length).toBe(0);
    });
    it('swha deals ZERO burst-bucket damage (the swap shots are normal-bucket weapon fire; W20 projectile line skipped)', () => {
      expect(
        swhaDamage(base.events).filter((d) => d.bucket === 'burst').length,
      ).toBe(0);
    });
  });

  describe('documented-skip PINs — UNMODELED lines emit no fabricated effects', () => {
    it('W2/W3: skill1-keyed buffs emit EXACTLY {damageTakenPct} — no DEF▲42.24 / ammo-loading stat', () => {
      expect(slotKeyedStats(base.events, 'skill1')).toEqual(['damageTakenPct']);
    });
    it('W11: skill2-keyed buffs emit EXACTLY the four modeled families — no Pierce effect', () => {
      expect(slotKeyedStats(base.events, 'skill2')).toEqual([
        'atkPct',
        'chargeDamagePct',
        'partsDamagePct',
        'sequentialDamagePct',
      ]);
    });
    it('W20: burst-keyed buffs emit EXACTLY {attackDamagePct} — no fabricated projectile/nuke (weaponSwap emits no buffApply)', () => {
      expect(slotKeyedStats(base.events, 'burst')).toEqual(['attackDamagePct']);
    });
  });
});
